export const KJ_PER_CALORIE = 4.184;

export function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function round1(value: number) {
  return Math.round(value * 10) / 10;
}
