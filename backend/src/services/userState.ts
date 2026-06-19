import { filterEq, type AuthContext, type SupabaseClient } from "../lib/supabase.js";
import type { MealPlanPayload, SupabasePlannedMeal, SupabaseUserSettings, UserStatePayload } from "../types.js";
import { unauthorized } from "../utils/errors.js";
import { round1 } from "../utils/numbers.js";

type UserStateServiceOptions = {
  supabaseConfigured: boolean;
  createSupabase: (accessToken?: string) => SupabaseClient;
};

const demoUserState: UserStatePayload = {
  tdeeTarget: null,
  proteinTarget: null,
  mealPlan: {}
};

export function createUserStateService({ supabaseConfigured, createSupabase }: UserStateServiceOptions) {
  async function getUserState(auth: AuthContext): Promise<UserStatePayload> {
    if (!supabaseConfigured) {
      return demoUserState;
    }

    const supabase = getSupabaseForUser(auth);
    const [settings] = await supabase<SupabaseUserSettings[]>(`user_settings?select=*&${filterEq("user_id", auth.userId || "")}`);
    const plannedMeals = await supabase<SupabasePlannedMeal[]>(
      `planned_meals?select=*&${filterEq("user_id", auth.userId || "")}&order=plan_date.asc,meal_slot.asc,sort_order.asc`
    );

    return {
      tdeeTarget: settings?.tdee_target == null ? null : Number(settings.tdee_target),
      proteinTarget: settings?.protein_target == null ? null : Number(settings.protein_target),
      mealPlan: plannedMeals.reduce<MealPlanPayload>((plan, meal) => {
        const dayPlan = plan[meal.plan_date] || {};
        const slotMeals = dayPlan[meal.meal_slot] || [];
        return {
          ...plan,
          [meal.plan_date]: {
            ...dayPlan,
            [meal.meal_slot]: [
              ...slotMeals,
              {
                recipeId: meal.recipe_id,
                portion_g: Number(meal.portion_g)
              }
            ]
          }
        };
      }, {})
    };
  }

  async function saveUserState(payload: UserStatePayload, auth: AuthContext): Promise<UserStatePayload> {
    if (!supabaseConfigured) {
      demoUserState.tdeeTarget = normalizeNullableNumber(payload.tdeeTarget);
      demoUserState.proteinTarget = normalizeNullableNumber(payload.proteinTarget);
      demoUserState.mealPlan = payload.mealPlan || {};
      return demoUserState;
    }

    const supabase = getSupabaseForUser(auth);
    await supabase("user_settings?on_conflict=user_id", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        user_id: auth.userId,
        tdee_target: normalizeNullableNumber(payload.tdeeTarget),
        protein_target: normalizeNullableNumber(payload.proteinTarget)
      })
    });

    await supabase(`planned_meals?${filterEq("user_id", auth.userId || "")}`, {
      method: "DELETE"
    });

    const plannedMeals = serializeMealPlan(payload.mealPlan || {}, auth.userId || "");
    if (plannedMeals.length > 0) {
      await supabase("planned_meals", {
        method: "POST",
        body: JSON.stringify(plannedMeals)
      });
    }

    return getUserState(auth);
  }

  return { getUserState, saveUserState };

  function getSupabaseForUser(auth: AuthContext) {
    if (!auth.accessToken || !auth.userId) {
      throw unauthorized("Sign in to load your saved plan.");
    }

    return createSupabase(auth.accessToken);
  }
}

function normalizeNullableNumber(value: number | null | undefined) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? round1(numberValue) : null;
}

function serializeMealPlan(mealPlan: MealPlanPayload, userId: string): SupabasePlannedMeal[] {
  return Object.entries(mealPlan).flatMap(([planDate, dayPlan]) =>
    Object.entries(dayPlan || {}).flatMap(([mealSlot, meals]) =>
      (meals || []).map((meal, index) => ({
        user_id: userId,
        plan_date: planDate,
        meal_slot: mealSlot,
        recipe_id: typeof meal === "string" ? meal : meal.recipeId,
        portion_g: round1(Number(typeof meal === "string" ? 100 : meal.portion_g || 0)),
        sort_order: index + 1
      }))
    )
  ).filter((meal) => meal.recipe_id && meal.portion_g > 0);
}
