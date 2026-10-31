// Data access for profiles and the day's logs. Uses Supabase when configured,
// otherwise a localStorage-backed demo so the UI can be tried before setup.
import { supabase, isDemo } from './supabase.js';

const TABLES = { food: 'food_logs', water: 'water_logs', exercise: 'exercise_logs' };

export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

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
    Object.values(TABLES).map((t) =>
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
    all[kind].push(saved);
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
    all[kind] = all[kind].filter((r) => r.id !== id);
    demo.write('logs', all);
    return;
  }
  const { error } = await supabase.from(TABLES[kind]).delete().eq('id', id);
  if (error) throw error;
}
