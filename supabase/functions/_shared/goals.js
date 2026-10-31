// Goal math shared by the app (via Vite) and the send-reminders edge function (via Deno).
// Plain JS with no imports so both runtimes can load it.

const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };

// MET values from the Compendium of Physical Activities.
const METS = {
  weights: { easy: 3.5, moderate: 5, hard: 6 },
  treadmill: { easy: 3.5, moderate: 7, hard: 9.8 },
  dance: { easy: 4.5, moderate: 5.5, hard: 7.8 }
};

// Extra water for every minute of exercise (~350 ml per 30 min).
const WATER_PER_EXERCISE_MIN = 12;
// Share of exercise calories added back to the day's calorie goal.
const EAT_BACK = 0.5;

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const round = (v, step = 1) => Math.round(v / step) * step;

export function calcGoals(p = {}) {
  const weight = num(p.weight_kg) || 70;
  const height = num(p.height_cm) || 165;
  const age = num(p.age) || 30;
  const goalWeight = num(p.goal_weight_kg);

  // Mifflin-St Jeor; "other" uses the midpoint of the two constants.
  const sexAdj = p.sex === 'male' ? 5 : p.sex === 'female' ? -161 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexAdj;
  const tdee = bmr * (ACTIVITY[p.activity_level] || ACTIVITY.light);

  let direction = 'maintain';
  if (goalWeight && goalWeight < weight - 0.5) direction = 'lose';
  if (goalWeight && goalWeight > weight + 0.5) direction = 'gain';

  const floor = p.sex === 'male' ? 1500 : 1200;
  let calories = tdee + (direction === 'lose' ? -500 : direction === 'gain' ? 300 : 0);
  calories = round(Math.max(floor, calories), 10);

  const protein = round(1.6 * (goalWeight || weight));
  const fat = round((calories * 0.28) / 9);
  const carbs = Math.max(50, round((calories - protein * 4 - fat * 9) / 4));
  const water_ml = round(weight * 35, 50);

  return {
    direction,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: num(p.calorie_goal) || calories,
    protein: num(p.protein_goal) || protein,
    carbs: num(p.carbs_goal) || carbs,
    fat: num(p.fat_goal) || fat,
    water_ml: num(p.water_goal_ml) || water_ml,
    exercise_min: num(p.exercise_goal_min) || 30
  };
}

export function caloriesBurned(kind, intensity, minutes, weightKg) {
  const met = METS[kind]?.[intensity] ?? 5;
  return Math.round((met * (Number(weightKg) || 70) * minutes) / 60);
}

export function sumTotals({ food = [], water = [], exercise = [] }) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0, water_ml: 0, exercise_min: 0, burned: 0 };
  for (const f of food) {
    t.calories += Number(f.calories) || 0;
    t.protein += Number(f.protein) || 0;
    t.carbs += Number(f.carbs) || 0;
    t.fat += Number(f.fat) || 0;
  }
  for (const w of water) t.water_ml += Number(w.amount_ml) || 0;
  for (const e of exercise) {
    t.exercise_min += Number(e.minutes) || 0;
    t.burned += Number(e.calories_burned) || 0;
  }
  return t;
}

// The day's checklist. Calories and macros count as done at 90% of target.
export function buildTasks(goals, totals) {
  const waterTarget = goals.water_ml + totals.exercise_min * WATER_PER_EXERCISE_MIN;
  const calTarget = Math.round(goals.calories + totals.burned * EAT_BACK);
  const items = [
    { key: 'water', label: 'drink water', current: totals.water_ml, target: waterTarget, unit: 'ml', doneAt: 1 },
    { key: 'calories', label: 'eat enough', current: totals.calories, target: calTarget, unit: 'kcal', doneAt: 0.9 },
    { key: 'protein', label: 'protein', current: totals.protein, target: goals.protein, unit: 'g', doneAt: 0.9 },
    { key: 'carbs', label: 'carbs', current: totals.carbs, target: goals.carbs, unit: 'g', doneAt: 0.9 },
    { key: 'fat', label: 'healthy fats', current: totals.fat, target: goals.fat, unit: 'g', doneAt: 0.9 },
    { key: 'move', label: 'move my body', current: totals.exercise_min, target: goals.exercise_min, unit: 'min', doneAt: 1 }
  ];
  return items.map((t) => {
    const frac = t.target > 0 ? Math.min(1, t.current / (t.target * t.doneAt)) : 1;
    return { ...t, frac, done: frac >= 1, over: t.unit === 'kcal' && t.current > t.target * 1.15 };
  });
}

// How far through the waking day we are, 0..1.
export function dayFraction(hour, minute, startHour = 8, endHour = 21) {
  const h = hour + minute / 60;
  return Math.min(1, Math.max(0, (h - startHour) / Math.max(1, endHour - startHour)));
}

// 0 = fully wilted, 1 = thriving. Compares each task to where it "should" be by now.
export function dollHealth(tasks, expected) {
  if (!tasks.length) return 1;
  const scores = tasks.map((t) => (t.done || expected <= 0.05 ? 1 : Math.min(1, t.frac / expected)));
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// The most behind-pace unfinished task, for reminders.
export function mostBehind(tasks, expected) {
  return tasks
    .filter((t) => !t.done)
    .map((t) => ({ ...t, gap: expected - t.frac }))
    .sort((a, b) => b.gap - a.gap)[0];
}

// Local date (YYYY-MM-DD), hour and minute for a given IANA timezone.
export function localParts(date, timeZone) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
  } catch {
    return localParts(date, 'UTC');
  }
  const get = (type) => parts.find((p) => p.type === type).value;
  return { day: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')), minute: Number(get('minute')) };
}
