// Sends "your doll needs you" web pushes to anyone who is behind pace on today's goals.
// Called every 15 minutes by pg_cron (see supabase/migrations/0002_reminders.sql) with the cron secret,
// or by a signed-in user with { "test": true } to send themselves a test push.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import {
  buildTasks, calcGoals, dayFraction, dollHealth, localParts, mostBehind, sumTotals
} from '../_shared/goals.js';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// VAPID keys and the cron secret live in Supabase Vault (see supabase/migrations/0002_reminders.sql).
let secrets: Record<string, string> | null = null;
async function getSecrets() {
  if (secrets) return secrets;
  const { data, error } = await sb.rpc('get_app_secrets');
  if (error) throw error;
  secrets = Object.fromEntries((data ?? []).map((r: { name: string; secret: string }) => [r.name, r.secret]));
  if (!secrets.vapid_public_key || !secrets.vapid_private_key) {
    // First run: make a key pair and keep it in Vault.
    const keys = webpush.generateVAPIDKeys();
    await sb.rpc('set_app_secret', { p_name: 'vapid_public_key', p_secret: keys.publicKey });
    await sb.rpc('set_app_secret', { p_name: 'vapid_private_key', p_secret: keys.privateKey });
    secrets = null;
    return getSecrets();
  }
  webpush.setVapidDetails(
    secrets.vapid_subject ?? Deno.env.get('SUPABASE_URL')!,
    secrets.vapid_public_key,
    secrets.vapid_private_key
  );
  return secrets;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const NUDGES: Record<string, string> = {
  water: 'She is thirsty! Time for a glass of water',
  calories: "Don't forget to eat something nourishing",
  protein: 'A little protein would perk her right up',
  carbs: 'Some carbs for energy?',
  fat: 'A few healthy fats would help',
  move: 'Let\'s move! A quick dance counts'
};

async function pushToUser(userId: string, payload: object) {
  const { data: subs } = await sb.from('push_subscriptions').select('*').eq('user_id', userId);
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      // 404/410 mean the subscription is gone (app removed, permission revoked).
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await sb.from('push_subscriptions').delete().eq('id', s.id);
      } else {
        console.error('push failed', err?.statusCode, err?.body);
      }
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const { cron_secret } = await getSecrets();
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const body = await req.json().catch(() => ({}));

  // Test push from the app, authenticated as the user.
  if (body.test) {
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return new Response('unauthorized', { status: 401, headers: cors });
    const sent = await pushToUser(user.id, {
      title: 'Nutrient Journal',
      body: 'Reminders are working! See you later',
      tag: 'test'
    });
    return Response.json({ sent }, { headers: cors });
  }

  if (!cron_secret || token !== cron_secret) return new Response('unauthorized', { status: 401 });

  const now = new Date();
  const { data: profiles, error } = await sb.from('profiles').select('*').eq('reminders_enabled', true);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const p of profiles ?? []) {
    const { day, hour, minute } = localParts(now, p.timezone);
    if (hour < p.reminder_start_hour || hour >= p.reminder_end_hour) continue;
    if (p.last_reminded_at) {
      const since = now.getTime() - new Date(p.last_reminded_at).getTime();
      // One-minute slack so a 15-minute cron lands on the interval reliably.
      if (since < (p.reminder_every_min - 1) * 60_000) continue;
    }

    const [food, water, exercise] = await Promise.all(
      ['food_logs', 'water_logs', 'exercise_logs'].map((t) =>
        sb.from(t).select('*').eq('user_id', p.id).eq('day', day).then((r) => r.data ?? [])
      )
    );
    const tasks = buildTasks(calcGoals(p), sumTotals({ food, water, exercise }));
    const expected = dayFraction(hour, minute, p.reminder_start_hour, p.reminder_end_hour);
    const health = dollHealth(tasks, expected);
    const behind = mostBehind(tasks, expected);
    if (!behind || health >= 0.85) continue;

    const sent = await pushToUser(p.id, {
      title: health < 0.4 ? 'Your doll is wilting...' : 'A little nudge',
      body: NUDGES[behind.key] ?? 'Check in with your journal',
      tag: 'nudge'
    });
    if (sent) await sb.from('profiles').update({ last_reminded_at: now.toISOString() }).eq('id', p.id);
    results.push({ user: p.id, task: behind.key, sent });
  }
  return Response.json({ checked: profiles?.length ?? 0, results });
});
