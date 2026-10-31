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
