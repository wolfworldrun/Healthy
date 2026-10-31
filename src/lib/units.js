export const ML_PER_OZ = 29.5735;
export const KG_PER_LB = 0.453592;
export const CM_PER_IN = 2.54;

export function formatWater(ml, units) {
  return units === 'metric' ? `${(ml / 1000).toFixed(ml >= 1000 ? 1 : 2)} L` : `${Math.round(ml / ML_PER_OZ)} oz`;
}

export function formatAmount(task, units) {
  if (task.unit === 'ml') return `${formatWater(task.current, units)} / ${formatWater(task.target, units)}`;
  return `${Math.round(task.current)} / ${Math.round(task.target)} ${task.unit}`;
}

export const waterChoices = (units) =>
  units === 'metric'
    ? [{ label: '250 ml', ml: 250 }, { label: '500 ml', ml: 500 }, { label: '750 ml', ml: 750 }]
    : [{ label: '8 oz', ml: 8 * ML_PER_OZ }, { label: '16 oz', ml: 16 * ML_PER_OZ }, { label: '24 oz', ml: 24 * ML_PER_OZ }];
