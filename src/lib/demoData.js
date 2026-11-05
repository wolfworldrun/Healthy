// Sample journal for "try me": a believable week for a made-up person, dated relative to today.
import { todayKey } from './store.js';

const dayKey = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return todayKey(d);
};

const at = (daysAgo, hour, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// [name, portion, kcal, protein, carbs, fat]
const MEALS = {
  oats: ['oatmeal with berries', '1 bowl', 310, 9, 56, 6],
  yogurt: ['greek yogurt', '1 cup', 150, 20, 9, 4],
  egg: ['eggs on toast', '2 eggs, 1 slice', 330, 18, 22, 18],
  salad: ['chicken salad', '1 large bowl', 430, 38, 18, 22],
  wrap: ['turkey wrap', '1 wrap', 390, 26, 38, 14],
  avocado: ['avocado toast', '1 slice', 260, 6, 26, 16],
  salmon: ['salmon and rice', '1 plate', 560, 36, 52, 20],
  pasta: ['pasta with veggies', '1½ cups', 480, 16, 78, 11],
  almonds: ['almonds', '1 handful', 170, 6, 6, 15],
  apple: ['apple', '1 medium', 95, 0, 25, 0]
};

const INKS = ['#d4637f', '#4a7bb7', '#5f9a6a', '#8a6fc0', '#e08a4a'];

// [days ago, meals, water glasses of 12 oz, exercise]
const WEEK = [
  [6, ['oats', 'wrap', 'apple', 'pasta'], 6, ['walk', 30, 'moderate', 120]],
  [5, ['egg', 'salad', 'almonds', 'salmon'], 8, ['dance', 35, 'moderate', 190]],
  [4, ['yogurt', 'wrap', 'pasta'], 4, null],
  [3, ['oats', 'salad', 'almonds', 'salmon', 'apple'], 8, ['weights', 40, 'moderate', 200]],
  [2, ['avocado', 'wrap', 'salmon', 'almonds'], 7, ['yoga', 30, 'moderate', 90]],
  [1, ['egg', 'salad', 'apple', 'pasta', 'almonds'], 8, ['treadmill', 30, 'moderate', 250]],
  // Today: some goals crossed off and some still to do, so every part of the page has something in it.
  [0, ['yogurt', 'salad', 'almonds', 'salmon'], 8, ['walk', 30, 'moderate', 120]]
];

export function sampleData() {
  let id = 1;
  const logs = { food: [], water: [], exercise: [], weight: [] };

  for (const [ago, meals, glasses, move] of WEEK) {
    const day = dayKey(ago);
    meals.forEach((key, i) => {
      const [name, amount_label, calories, protein, carbs, fat] = MEALS[key];
      logs.food.push({
        id: id++, day, name, amount_label, calories, protein, carbs, fat,
        source: 'sample', ink: INKS[i % INKS.length], created_at: at(ago, 8 + i * 4)
      });
    });
    for (let g = 0; g < glasses; g++) {
      logs.water.push({ id: id++, day, amount_ml: 355, ink: INKS[1], created_at: at(ago, 8 + g, 30) });
    }
    if (move) {
      const [kind, minutes, intensity, calories_burned] = move;
      logs.exercise.push({ id: id++, day, kind, minutes, intensity, calories_burned, ink: INKS[2], created_at: at(ago, 17) });
    }
  }

  [[28, 72.8], [21, 72.3], [14, 71.9], [7, 71.5], [0, 71.2]].forEach(([ago, weight_kg]) => {
    logs.weight.push({ id: id++, day: dayKey(ago), weight_kg, created_at: at(ago, 7) });
  });

  const profile = {
    id: 'demo',
    display_name: 'Mia',
    age: 29,
    sex: 'female',
    height_cm: 165,
    weight_kg: 71.2,
    goal_weight_kg: 65,
    activity_level: 'light',
    units: 'imperial',
    exercise_goal_min: 30,
    share_social: true,
    doll: { beanie: 'shiba', outfit: 'overalls', dress: '#7b9cc4', hair: '#5a3a2a', skin: '#f6cdb0', eyes: '#7a5236' }
  };

  const feed = [
    {
      is_me: false, name: 'Priya', day: dayKey(0), done: ['water', 'protein', 'move'],
      doll: { beanie: 'bunny', outfit: 'pinafore', dress: '#c06c84', hair: '#2b2225', skin: '#c98c63', eyes: '#7a5236' }
    },
    {
      is_me: false, name: 'Sam', day: dayKey(0), done: ['move'],
      doll: { beanie: 'tuxedo', outfit: 'tee', dress: '#9cb89a', hair: '#a0673d', skin: '#fde3d3', eyes: '#5f8f6a' }
    },
    {
      is_me: false, name: 'Dee', day: dayKey(1), done: ['water', 'calories', 'protein', 'carbs', 'fat', 'move'],
      doll: { beanie: 'frog', outfit: 'overalls', dress: '#3d4f7a', hair: '#6b4430', skin: '#6b4430', eyes: '#3b3337' }
    }
  ];

  return { profile, logs, feed };
}
