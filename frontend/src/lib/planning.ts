export type MealSlot = "breakfast" | "lunch" | "dinner" | "extra";

export type PlannedMeal = {
  recipeId: string;
  portion_g: number;
};

export type MealPlanEntry = string | PlannedMeal;

export type MealPlan = Record<string, Partial<Record<MealSlot, MealPlanEntry[]>>>;

export const mealSlots: Array<{ id: MealSlot; label: string }> = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "extra", label: "Extra" }
];

export function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function getMonday(date: Date) {
  const nextDate = new Date(date);
  const day = nextDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  nextDate.setDate(nextDate.getDate() + mondayOffset);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function getPlannedRecipeId(entry: MealPlanEntry) {
  return typeof entry === "string" ? entry : entry.recipeId;
}

export function getPlannedPortion(entry: MealPlanEntry, fallbackWeight: number) {
  if (typeof entry === "string") {
    return fallbackWeight;
  }

  return Number.isFinite(entry.portion_g) && entry.portion_g > 0 ? entry.portion_g : fallbackWeight;
}
