import { demoFoods, demoRecipes, setDemoFoods } from "../data/demoStore";
import { filterEq, type AuthContext, type SupabaseClient } from "../lib/supabase";
import type { Food, NewFoodPayload } from "../types";
import { badRequest, notFound, unauthorized } from "../utils/errors";
import { round1 } from "../utils/numbers";

type FoodServiceOptions = {
  supabaseConfigured: boolean;
  createSupabase: (accessToken?: string) => SupabaseClient;
};

export function createFoodService({ supabaseConfigured, createSupabase }: FoodServiceOptions) {
  async function getFoods(auth: AuthContext) {
    if (!supabaseConfigured) {
      return demoFoods;
    }

    const supabase = getSupabaseForUser(auth);
    return supabase<Food[]>("foods?select=*&order=name.asc");
  }

  async function createFood(payload: NewFoodPayload, auth: AuthContext): Promise<Food> {
    const food = parseFoodPayload(payload);

    if (!supabaseConfigured) {
      const created = { ...food, id: `demo-food-${Date.now()}` };
      setDemoFoods([...demoFoods, created]);
      return created;
    }

    const supabase = getSupabaseForUser(auth);
    const [created] = await supabase<Food[]>("foods", {
      method: "POST",
      body: JSON.stringify({ ...food, user_id: auth.userId })
    });

    if (!created) {
      throw new Error("Supabase did not return the created food");
    }

    return created;
  }

  async function updateFood(id: string, payload: NewFoodPayload, auth: AuthContext): Promise<Food> {
    const food = parseFoodPayload(payload);

    if (!supabaseConfigured) {
      const existing = demoFoods.find((item) => item.id === id);
      if (!existing) {
        throw notFound("Ingredient not found");
      }

      const updated = { ...existing, ...food };
      setDemoFoods(demoFoods.map((item) => (item.id === id ? updated : item)));
      return updated;
    }

    const supabase = getSupabaseForUser(auth);
    const [updated] = await supabase<Food[]>(`foods?${filterEq("id", id)}`, {
      method: "PATCH",
      body: JSON.stringify(food)
    });

    if (!updated) {
      throw notFound("Ingredient not found");
    }

    return updated;
  }

  async function deleteFood(id: string, auth: AuthContext) {
    if (!supabaseConfigured) {
      const inUse = demoRecipes.some((recipe) => recipe.ingredients.some((ingredient) => ingredient.food_id === id));
      if (inUse) {
        throw badRequest("Ingredient is used by a meal and cannot be deleted yet");
      }

      setDemoFoods(demoFoods.filter((item) => item.id !== id));
      return { ok: true };
    }

    const supabase = getSupabaseForUser(auth);
    await supabase<Food[]>(`foods?${filterEq("id", id)}`, {
      method: "DELETE"
    });

    return { ok: true };
  }

  return { getFoods, createFood, updateFood, deleteFood };

  function getSupabaseForUser(auth: AuthContext) {
    if (!auth.accessToken || !auth.userId) {
      throw unauthorized("Sign in to manage ingredients.");
    }

    return createSupabase(auth.accessToken);
  }
}

function parseFoodPayload(payload: NewFoodPayload) {
  const submittedCalories = Number(payload.calories_per_unit);
  const submittedKj = Number(payload.kj_per_unit);
  const protein = Number(payload.protein_per_unit);
  const hasCalories = Number.isFinite(submittedCalories);
  const hasKj = Number.isFinite(submittedKj);
  const calories = hasCalories ? submittedCalories : submittedKj / 4.184;
  const kj = hasKj ? submittedKj : submittedCalories * 4.184;

  if (!payload.name || (!hasCalories && !hasKj) || !Number.isFinite(protein)) {
    throw badRequest("Name, calories or kJ, and protein are required");
  }

  return {
    name: payload.name,
    calories_per_unit: round1(calories),
    kj_per_unit: round1(kj),
    protein_per_unit: protein,
    unit_label: "100g",
    notes: payload.notes || null
  };
}
