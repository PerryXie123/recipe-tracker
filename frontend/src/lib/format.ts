export const KJ_PER_CALORIE = 4.184;

export function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function formatUnitBasis(unitLabel: string, unitWeightG?: number | null) {
  if (unitLabel === "100g") {
    return "per 100g";
  }

  const label = unitLabel.trim() || "unit";
  const weight = Number(unitWeightG || 0);
  return weight > 0 ? `per ${label} (${formatNumber(weight)}g)` : `per ${label}`;
}
