// Username sign-in. Supabase Auth only signs in by email, so this looks up the email on the
// server, which keeps it from ever reaching the browser. Also answers "is this username free?".
import { createClient } from 'npm:@supabase/supabase-js@2';

const PROJECT_URL = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(PROJECT_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const json = (body: object, status = 200) => Response.json(body, { status, headers: cors });

const WINDOW_MS = 15 * 60_000;
const MAX_PER_LOGIN = 10;
const MAX_PER_IP = 60;

async function isBlocked(key: string, max: number) {
  const { data } = await admin.from('login_attempts').select('*').eq('key', key).maybeSingle();
  if (!data) return false;
  return Date.now() - new Date(data.window_start).getTime() < WINDOW_MS && data.failures >= max;
}

async function recordFailure(key: string) {
  const { data } = await admin.from('login_attempts').select('*').eq('key', key).maybeSingle();
  const fresh = !data || Date.now() - new Date(data.window_start).getTime() >= WINDOW_MS;
  await admin.from('login_attempts').upsert({
    key,
    failures: fresh ? 1 : data.failures + 1,
    window_start: fresh ? new Date().toISOString() : data.window_start
  });
}

async function emailFor(login: string) {
  if (login.includes('@')) return login;
  const { data: profile } = await admin.from('profiles').select('id').eq('username', login).maybeSingle();
  if (!profile) return null;
  const { data } = await admin.auth.admin.getUserById(profile.id);
  return data?.user?.email ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const body = await req.json().catch(() => ({}));

  if (body.action === 'check') {
    const username = String(body.username ?? '').trim().toLowerCase();
    const { data, error } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
    if (error) return json({ error: 'could not check that username' }, 500);
    return json({ available: !data });
  }

  if (body.action !== 'signin') return json({ error: 'unknown action' }, 400);

  const login = String(body.login ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!login || !password) return json({ error: 'wrong username or password' }, 401);

  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const loginKey = `login:${login}`;
  const ipKey = `ip:${ip}`;
  if ((await isBlocked(loginKey, MAX_PER_LOGIN)) || (await isBlocked(ipKey, MAX_PER_IP))) {
    return json({ error: 'too many tries, please wait 15 minutes' }, 429);
  }

  const fail = async () => {
    await Promise.all([recordFailure(loginKey), recordFailure(ipKey)]);
    return json({ error: 'wrong username or password' }, 401);
  };

  const email = await emailFor(login);
  if (!email) return fail();

  // A separate client per request, so one person's session can't leak into another's.
  const client = createClient(PROJECT_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === 'email_not_confirmed') return json({ error: 'please confirm your email first' }, 403);
    if (error.status === 429) return json({ error: 'too many tries, please wait a few minutes' }, 429);
    return fail();
  }

  await admin.from('login_attempts').delete().eq('key', loginKey);
  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});
