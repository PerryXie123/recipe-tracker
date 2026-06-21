export type Food = {
  id: string;
  name: string;
  created_at?: string | null;
  calories_per_unit: number;
  kj_per_unit: number;
  protein_per_unit: number;
  unit_label: string;
  unit_weight_g: number;
  notes?: string | null;
};

export type Ingredient = {
  food_id: string;
  food_name: string;
  weight_g: number;
  calories: number;
  kj: number;
  protein: number;
};

export type Recipe = {
  id: string;
  kitchen_id?: string | null;
  name: string;
  category?: string | null;
  target_plan?: string | null;
  total_weight_g?: number | string | null;
  created_at?: string | null;
  ingredients: Ingredient[];
};

export type RecipeWithTotals = Recipe & {
  calories: number;
  kj: number;
  protein: number;
};

export type NewFoodPayload = {
  name?: string;
  calories_per_unit?: number | string;
  kj_per_unit?: number | string;
  protein_per_unit?: number | string;
  unit_label?: string;
  unit_weight_g?: number | string;
  notes?: string | null;
};

export type NewRecipePayload = {
  name?: string;
  category?: string | null;
  target_plan?: string | null;
  total_weight_g?: number | string | null;
  ingredients?: Array<{
    food_id?: string;
    weight_g?: number | string;
  }>;
};

export type SupabaseRecipe = {
  id: string;
  kitchen_id?: string | null;
  name: string;
  category?: string | null;
  target_plan?: string | null;
  total_weight_g?: number | string | null;
  created_at?: string | null;
};

export type SupabaseIngredient = {
  id: string;
  recipe_id: string;
  quantity: number | string;
  foods: Food;
};

export type PlannedMealPayload = {
  recipeId: string;
  portion_g: number;
};

export type MealPlanPayload = Record<string, Record<string, Array<string | PlannedMealPayload> | undefined> | undefined>;

export type UserStatePayload = {
  tdeeTarget: number | null;
  proteinTarget: number | null;
  mealPlan: MealPlanPayload;
};

export type SupabaseUserSettings = {
  user_id: string;
  tdee_target: number | string | null;
  protein_target: number | string | null;
};

export type SupabasePlannedMeal = {
  id?: string;
  user_id: string;
  plan_date: string;
  meal_slot: string;
  recipe_id: string;
  portion_g: number | string;
  sort_order: number;
};
