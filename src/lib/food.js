// Food search across USDA FoodData Central (whole + branded foods) and Open Food Facts
// (packaged foods worldwide). Every result is normalized to nutrients per 100 g.

const USDA_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY';

// USDA nutrient ids. Energy can come as 1008 (kcal), or Atwater factors 2047/2048 in Foundation foods.
const N = { kcal: [1008, 2047, 2048], protein: [1003], fat: [1004], carbs: [1005] };

function usdaValue(nutrients, ids) {
  for (const id of ids) {
    const n = nutrients.find((x) => x.nutrientId === id);
    if (n) return n.unitName?.toUpperCase() === 'KJ' ? n.value / 4.184 : n.value;
  }
  return 0;
}

const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

async function searchUsda(query, signal) {
  const params = new URLSearchParams({
    api_key: USDA_KEY,
    query,
    pageSize: '15',
    dataType: 'Foundation,SR Legacy,Branded'
  });
  const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`, { signal });
  if (!res.ok) throw new Error(`USDA ${res.status}`);
  const json = await res.json();
  // USDA ranks branded items first; generic whole foods are usually what people want.
  const foods = [...(json.foods ?? [])].sort((a, b) => (a.dataType === 'Branded') - (b.dataType === 'Branded'));
  return foods.map((f) => {
    const n = f.foodNutrients ?? [];
    const servingG =
      f.servingSize && /^(g|grm|ml|mlt)$/i.test(f.servingSizeUnit ?? '') ? Number(f.servingSize) : null;
    return {
      id: `usda-${f.fdcId}`,
      name: f.dataType === 'Branded' ? titleCase(f.description) : f.description,
      brand: f.brandName || f.brandOwner || null,
      source: 'USDA',
      dataType: f.dataType,
      per100: {
        calories: usdaValue(n, N.kcal),
        protein: usdaValue(n, N.protein),
        carbs: usdaValue(n, N.carbs),
        fat: usdaValue(n, N.fat)
      },
      servingG,
      servingLabel: f.householdServingFullText || (servingG ? `${servingG} ${f.servingSizeUnit}` : null)
    };
  });
}

async function searchOpenFoodFacts(query, signal) {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '15',
    fields: 'code,product_name,brands,nutriments,serving_quantity,serving_size'
  });
  const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, { signal });
  if (!res.ok) throw new Error(`Open Food Facts ${res.status}`);
  const json = await res.json();
  return (json.products ?? [])
    .filter((p) => p.product_name && p.nutriments?.['energy-kcal_100g'] != null)
    .map((p) => ({
      id: `off-${p.code}`,
      name: p.product_name,
      brand: p.brands?.split(',')[0] ?? null,
      source: 'Open Food Facts',
      per100: {
        calories: Number(p.nutriments['energy-kcal_100g']) || 0,
        protein: Number(p.nutriments.proteins_100g) || 0,
        carbs: Number(p.nutriments.carbohydrates_100g) || 0,
        fat: Number(p.nutriments.fat_100g) || 0
      },
      servingG: Number(p.serving_quantity) || null,
      servingLabel: p.serving_size || null
    }));
}

export async function searchFoods(query, signal) {
  const settled = await Promise.allSettled([searchUsda(query, signal), searchOpenFoodFacts(query, signal)]);
  const [usda, off] = settled.map((s) => (s.status === 'fulfilled' ? s.value : []));
  if (settled.every((s) => s.status === 'rejected')) throw settled[0].reason;
  // Interleave so both sources show near the top.
  const out = [];
  for (let i = 0; i < Math.max(usda.length, off.length); i++) {
    if (usda[i]) out.push(usda[i]);
    if (off[i]) out.push(off[i]);
  }
  return out;
}

export function scaleNutrients(per100, grams) {
  const f = grams / 100;
  return {
    calories: Math.round(per100.calories * f),
    protein: Math.round(per100.protein * f * 10) / 10,
    carbs: Math.round(per100.carbs * f * 10) / 10,
    fat: Math.round(per100.fat * f * 10) / 10
  };
}

const OZ = 28.3495;

// Real-world measures for a food: cups, pieces, slices, servings, plus oz and grams.
// USDA whole foods have household portions on their detail record; branded and
// Open Food Facts items give a label serving size.
export async function getPortions(food, signal) {
  const out = [];
  const add = (unit, grams) => {
    unit = unit.replace(/\s+/g, ' ').trim();
    if (grams > 0 && !out.some((p) => p.unit.toLowerCase() === unit.toLowerCase())) out.push({ unit, grams });
  };

  if (food.id.startsWith('usda-') && food.dataType !== 'Branded') {
    try {
      const res = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${food.id.slice(5)}?api_key=${USDA_KEY}`, { signal });
      if (res.ok) {
        const json = await res.json();
        for (const p of json.foodPortions ?? []) {
          const amount = Number(p.amount) || 1;
          const measure = p.measureUnit?.name && p.measureUnit.name !== 'undetermined' ? p.measureUnit.name : '';
          let unit = p.portionDescription && p.portionDescription !== 'Quantity not specified'
            ? p.portionDescription.replace(/^[\d./\s]+/, '')
            : [measure, p.modifier].filter(Boolean).join(', ');
          if (/^nlea serving$/i.test(unit)) unit = 'serving';
          if (unit) add(unit, p.gramWeight / amount);
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }
  }
  if (food.servingG) add(food.servingLabel ? `serving (${food.servingLabel})` : 'serving', food.servingG);
  add('oz', OZ);
  add('grams', 1);
  return out;
}

export const AMOUNTS = [
  ['¼', 0.25], ['½', 0.5], ['¾', 0.75], ['1', 1], ['1½', 1.5], ['2', 2], ['3', 3]
];

// Go-to ideas per nutrient: [what to show, what to search, why it helps].
export const FOOD_IDEAS = {
  protein: {
    label: 'protein',
    items: [
      ['greek yogurt', 'greek yogurt plain nonfat', '~10 g per ½ cup'],
      ['eggs', 'egg whole hard-boiled', '6 g each'],
      ['chicken breast', 'chicken breast roasted', 'lean and filling'],
      ['tofu', 'tofu firm', 'plant protein'],
      ['lentils', 'lentils boiled', 'protein + fiber'],
      ['cottage cheese', 'cottage cheese lowfat', '~14 g per ½ cup'],
      ['salmon', 'salmon atlantic cooked', 'protein + omega-3'],
      ['edamame', 'edamame frozen prepared', 'snackable'],
      ['tuna', 'tuna canned water', 'quick and lean']
    ]
  },
  fat: {
    label: 'healthy fats',
    items: [
      ['avocado', 'avocados raw', 'monounsaturated fats'],
      ['almonds', 'almonds', 'vitamin E + fiber'],
      ['walnuts', 'walnuts english', 'plant omega-3'],
      ['olive oil', 'olive oil', 'drizzle on anything'],
      ['chia seeds', 'chia seeds dried', 'omega-3 + fiber'],
      ['peanut butter', 'peanut butter smooth', 'easy on toast'],
      ['salmon', 'salmon atlantic cooked', 'omega-3'],
      ['dark chocolate', 'chocolate dark 70-85% cacao', 'a little treat'],
      ['pumpkin seeds', 'pumpkin seeds roasted', 'magnesium']
    ]
  },
  carbs: {
    label: 'carbs',
    items: [
      ['oatmeal', 'oats cooked', 'slow, steady energy'],
      ['banana', 'bananas raw', 'quick energy'],
      ['sweet potato', 'sweet potato baked', 'fiber + vitamin A'],
      ['brown rice', 'rice brown cooked', 'whole grain'],
      ['quinoa', 'quinoa cooked', 'carbs + protein'],
      ['berries', 'blueberries raw', 'antioxidants'],
      ['whole wheat bread', 'bread whole wheat', 'easy base'],
      ['apple', 'apples raw with skin', 'crunchy snack']
    ]
  },
  calories: {
    label: 'more energy',
    items: [
      ['trail mix', 'trail mix', 'dense, easy snack'],
      ['granola', 'granola', 'with yogurt or milk'],
      ['hummus', 'hummus', 'with veggies or pita'],
      ['cheese', 'cheese cheddar', 'protein + fat'],
      ['whole milk', 'milk whole', 'in a smoothie'],
      ['mixed nuts', 'nuts mixed', 'a handful goes far'],
      ['dried fruit', 'raisins', 'sweet energy']
    ]
  }
};
