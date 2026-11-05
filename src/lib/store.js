// Data access for profiles and the day's logs. Uses Supabase when configured,
// otherwise a localStorage-backed demo so the UI can be tried before setup.
import { supabase, isDemo } from './supabase.js';

const TABLES = { food: 'food_logs', water: 'water_logs', exercise: 'exercise_logs', weight: 'weight_logs' };

export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Local storage names the demo uses, so "try me" can start clean and tidy up after itself.
const DEMO_KEYS = ['profile', 'logs', 'feed', 'wins'];

const demo = {
  read(name, fallback) {
    try {
      return JSON.parse(localStorage.getItem(`nj-${name}`)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  write(name, value) {
    try {
      localStorage.setItem(`nj-${name}`, JSON.stringify(value));
    } catch {
      /* storage unavailable; demo data just won't persist */
    }
  }
};

export function seedDemo({ profile, logs, feed }) {
  demo.write('profile', profile);
  demo.write('logs', logs);
  demo.write('feed', feed);
  demo.write('wins', []);
}

export function clearDemo() {
  try {
    DEMO_KEYS.forEach((k) => localStorage.removeItem(`nj-${k}`));
  } catch {
    /* nothing was saved then */
  }
}

export async function loadProfile(userId) {
  if (isDemo) return demo.read('profile', { id: 'demo', display_name: 'you', doll: {} });
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ?? { id: userId, doll: {} };
}

export async function saveProfile(profile) {
  const row = { ...profile, updated_at: new Date().toISOString() };
  if (isDemo) {
    demo.write('profile', row);
    return row;
  }
  const { data, error } = await supabase.from('profiles').upsert(row).select().single();
  if (error) throw error;
  return data;
}

export async function loadDay(day) {
  if (isDemo) {
    const all = demo.read('logs', { food: [], water: [], exercise: [] });
    const pick = (k) => all[k].filter((r) => r.day === day);
    return { food: pick('food'), water: pick('water'), exercise: pick('exercise') };
  }
  const [food, water, exercise] = await Promise.all(
    [TABLES.food, TABLES.water, TABLES.exercise].map((t) =>
      supabase.from(t).select('*').eq('day', day).order('created_at').then(({ data, error }) => {
        if (error) throw error;
        return data;
      })
    )
  );
  return { food, water, exercise };
}

export async function addEntry(kind, row) {
  if (isDemo) {
    const all = demo.read('logs', { food: [], water: [], exercise: [] });
    const saved = { ...row, id: Date.now(), created_at: new Date().toISOString() };
    (all[kind] ??= []).push(saved);
    demo.write('logs', all);
    return saved;
  }
  const { data, error } = await supabase.from(TABLES[kind]).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEntry(kind, id) {
  if (isDemo) {
    const all = demo.read('logs', { food: [], water: [], exercise: [] });
    all[kind] = (all[kind] ?? []).filter((r) => r.id !== id);
    demo.write('logs', all);
    return;
  }
  const { error } = await supabase.from(TABLES[kind]).delete().eq('id', id);
  if (error) throw error;
}

// Every log between two days (inclusive), for the week view.
export async function loadRange(from, to) {
  if (isDemo) {
    const all = demo.read('logs', { food: [], water: [], exercise: [] });
    const pick = (k) => (all[k] ?? []).filter((r) => r.day >= from && r.day <= to);
    return { food: pick('food'), water: pick('water'), exercise: pick('exercise') };
  }
  const [food, water, exercise] = await Promise.all(
    [TABLES.food, TABLES.water, TABLES.exercise].map((t) =>
      supabase.from(t).select('*').gte('day', from).lte('day', to).then(({ data, error }) => {
        if (error) throw error;
        return data;
      })
    )
  );
  return { food, water, exercise };
}

// Friends page: goal keys only, shared solely while the person has opted in.
export async function saveWins(day, done) {
  if (isDemo) {
    demo.write('wins', done);
    return;
  }
  const { error } = await supabase.from('daily_wins').upsert({ day, done, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function clearWins() {
  if (isDemo) {
    demo.write('wins', []);
    return;
  }
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('daily_wins').delete().eq('user_id', user.id);
  if (error) throw error;
}

export async function loadFeed() {
  if (isDemo) {
    const me = demo.read('profile', {});
    const done = demo.read('wins', []);
    const self = { is_me: true, name: (me.display_name || 'you').split(' ')[0], doll: me.doll, day: todayKey(), done };
    return [self, ...demo.read('feed', [])];
  }
  const { data, error } = await supabase.rpc('social_feed');
  if (error) throw error;
  return data;
}

// Full weight history, oldest first.
export async function loadWeights() {
  if (isDemo) {
    const all = demo.read('logs', {});
    return [...(all.weight ?? [])].sort((a, b) => a.day.localeCompare(b.day));
  }
  const { data, error } = await supabase.from(TABLES.weight).select('*').order('day').order('created_at');
  if (error) throw error;
  return data;
}
