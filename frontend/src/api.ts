import type { Food, Health, NewFood, NewRecipe, Recipe } from "./types";
import { getPlannedPortion, getPlannedRecipeId, type MealPlan, type MealSlot } from "./lib/planning";
import { supabase } from "./lib/supabase";

let apiAccessToken: string | undefined;
let apiKitchenId: string | undefined;

export function setApiAccessToken(accessToken: string | undefined) {
  apiAccessToken = accessToken;
}

export function setApiKitchenId(kitchenId: string | undefined) {
  apiKitchenId = kitchenId;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (apiAccessToken) {
    headers.set("authorization", `Bearer ${apiAccessToken}`);
  }
  if (apiKitchenId) headers.set("x-kitchen-id", apiKitchenId);

  const response = await fetch(path, { ...options, headers });
  const responseText = await response.text();
  let payload: unknown = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new Error(response.ok ? "Unexpected API response" : responseText);
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error)
        : responseText || `Request failed (${response.status})`;

    throw new Error(message);
  }

  return payload as T;
}

export function getHealth() {
  return request<Health>("/api/health");
}

export function getFoods() {
  return request<Food[]>("/api/foods");
}

export function getRecipes() {
  return request<Recipe[]>("/api/recipes");
}

export function getPlanningRecipes() {
  if (supabase) {
    return getSupabasePlanningRecipes();
  }
  return request<Recipe[]>("/api/planning-recipes");
}

export async function copyKitchenContent(
  sourceKitchenId: string,
  targetKitchenId: string,
  foodIds: string[],
  recipeIds: string[]
) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("copy_kitchen_content", {
    p_source_kitchen_id: sourceKitchenId,
    p_target_kitchen_id: targetKitchenId,
    p_food_ids: foodIds,
    p_recipe_ids: recipeIds
  });
  if (error) throw error;
  return data as { ingredients: number; meals: number };
}

async function getSupabasePlanningRecipes(): Promise<Recipe[]> {
  if (!supabase) return [];
  const [recipesResult, ingredientsResult] = await Promise.all([
    supabase.from("recipes").select("*").order("created_at", { ascending: false }),
    supabase
      .from("recipe_ingredients")
      .select("id,recipe_id,quantity,foods(id,name,calories_per_unit,kj_per_unit,protein_per_unit,unit_label,unit_weight_g)")
  ]);
  if (recipesResult.error) throw recipesResult.error;
  if (ingredientsResult.error) throw ingredientsResult.error;

  type FoodRow = {
    id: string;
    name: string;
    calories_per_unit: number | string;
    kj_per_unit: number | string;
    protein_per_unit: number | string;
    unit_label: string;
    unit_weight_g: number | string | null;
  };
  type IngredientRow = { recipe_id: string; quantity: number | string; foods: FoodRow | FoodRow[] | null };
  const ingredientRows = (ingredientsResult.data || []) as unknown as IngredientRow[];

  return (recipesResult.data || []).map((recipe) => {
    const ingredients = ingredientRows
      .filter((row) => row.recipe_id === recipe.id)
      .flatMap((row) => {
        const food = Array.isArray(row.foods) ? row.foods[0] : row.foods;
        if (!food) return [];
        const quantity = Number(row.quantity);
        const basis = food.unit_label === "100g" ? 100 : Math.max(Number(food.unit_weight_g || 100), 0.01);
        return [{
          food_id: food.id,
          food_name: food.name,
          weight_g: quantity,
          calories: (Number(food.calories_per_unit) * quantity) / basis,
          kj: (Number(food.kj_per_unit) * quantity) / basis,
          protein: (Number(food.protein_per_unit) * quantity) / basis
        }];
      });

    return {
      ...recipe,
      total_weight_g: Number(recipe.total_weight_g || ingredients.reduce((sum, item) => sum + item.weight_g, 0)),
      calories: Math.round(ingredients.reduce((sum, item) => sum + item.calories, 0)),
      kj: Math.round(ingredients.reduce((sum, item) => sum + item.kj, 0) * 10) / 10,
      protein: Math.round(ingredients.reduce((sum, item) => sum + item.protein, 0) * 10) / 10,
      ingredients
    } as Recipe;
  });
}

export type UserState = {
  tdeeTarget: number | null;
  proteinTarget: number | null;
  mealPlan: MealPlan;
};

export async function getUserState() {
  if (supabase) {
    const userId = await getSupabaseUserId();
    const [settingsResult, mealsResult] = await Promise.all([
      supabase.from("user_settings").select("tdee_target,protein_target").eq("user_id", userId).maybeSingle(),
      supabase
        .from("planned_meals")
        .select("plan_date,meal_slot,recipe_id,portion_g,sort_order")
        .eq("user_id", userId)
        .order("plan_date")
        .order("meal_slot")
        .order("sort_order")
    ]);

    if (settingsResult.error) {
      throw settingsResult.error;
    }
    if (mealsResult.error) {
      throw mealsResult.error;
    }

    const mealPlan = (mealsResult.data || []).reduce<MealPlan>((plan, meal) => {
      const dateKey = String(meal.plan_date);
      const slot = String(meal.meal_slot) as MealSlot;
      const dayPlan = plan[dateKey] || {};
      const slotMeals = dayPlan[slot] || [];
      plan[dateKey] = {
        ...dayPlan,
        [slot]: [...slotMeals, { recipeId: String(meal.recipe_id), portion_g: Number(meal.portion_g) }]
      };
      return plan;
    }, {});

    return {
      tdeeTarget: settingsResult.data?.tdee_target == null ? null : Number(settingsResult.data.tdee_target),
      proteinTarget: settingsResult.data?.protein_target == null ? null : Number(settingsResult.data.protein_target),
      mealPlan
    };
  }

  return request<UserState>("/api/user-state");
}

export async function saveUserState(state: UserState) {
  if (supabase) {
    const userId = await getSupabaseUserId();
    const settingsResult = await supabase.from("user_settings").upsert({
      user_id: userId,
      tdee_target: state.tdeeTarget,
      protein_target: state.proteinTarget,
      updated_at: new Date().toISOString()
    });

    if (settingsResult.error) {
      throw settingsResult.error;
    }

    const deleteResult = await supabase.from("planned_meals").delete().eq("user_id", userId);
    if (deleteResult.error) {
      throw deleteResult.error;
    }

    const plannedMeals = Object.entries(state.mealPlan).flatMap(([planDate, dayPlan]) =>
      Object.entries(dayPlan || {}).flatMap(([mealSlot, meals]) =>
        (meals || []).map((meal, index) => ({
          user_id: userId,
          plan_date: planDate,
          meal_slot: mealSlot,
          recipe_id: getPlannedRecipeId(meal),
          portion_g: getPlannedPortion(meal, 100),
          sort_order: index + 1
        }))
      )
    );

    if (plannedMeals.length > 0) {
      const insertResult = await supabase.from("planned_meals").insert(plannedMeals);
      if (insertResult.error) {
        throw insertResult.error;
      }
    }

    return getUserState();
  }

  return request<UserState>("/api/user-state", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(state)
  });
}

async function getSupabaseUserId() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  if (!data.session?.user.id) {
    throw new Error("Sign in to sync your meal plan.");
  }

  return data.session.user.id;
}

export function createFood(food: NewFood) {
  return request<Food>("/api/foods", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(food)
  });
}

export function updateFood(id: string, food: NewFood) {
  return request<Food>(`/api/foods/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(food)
  });
}

export function deleteFood(id: string, options?: { removeReferences?: boolean }) {
  const params = options?.removeReferences ? "?removeReferences=true" : "";
  return request<{ ok: boolean }>(`/api/foods/${encodeURIComponent(id)}${params}`, {
    method: "DELETE"
  });
}

export function createRecipe(recipe: NewRecipe) {
  return request<Recipe>("/api/recipes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(recipe)
  });
}

export function updateRecipe(id: string, recipe: NewRecipe) {
  return request<Recipe>(`/api/recipes/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(recipe)
  });
}

export function deleteRecipe(id: string) {
  return request<{ ok: boolean }>(`/api/recipes/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}
