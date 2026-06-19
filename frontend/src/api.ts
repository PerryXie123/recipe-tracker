import type { Food, Health, NewFood, NewRecipe, Recipe } from "./types";
import { getPlannedPortion, getPlannedRecipeId, type MealPlan, type MealSlot } from "./lib/planning";
import { supabase } from "./lib/supabase";

let apiAccessToken: string | undefined;

export function setApiAccessToken(accessToken: string | undefined) {
  apiAccessToken = accessToken;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (apiAccessToken) {
    headers.set("authorization", `Bearer ${apiAccessToken}`);
  }

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
