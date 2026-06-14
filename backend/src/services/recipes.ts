import { demoFoods, demoRecipes, setDemoRecipes } from "../data/demoStore.js";
import { filterEq, type AuthContext, type SupabaseClient } from "../lib/supabase.js";
import type { NewRecipePayload, Recipe, RecipeWithTotals, SupabaseIngredient, SupabaseRecipe } from "../types.js";
import { badRequest, notFound, unauthorized } from "../utils/errors.js";
import { getRecipeIngredientWeight, round1 } from "../utils/numbers.js";

type RecipeServiceOptions = {
  supabaseConfigured: boolean;
  createSupabase: (accessToken?: string) => SupabaseClient;
};

export function createRecipeService({ supabaseConfigured, createSupabase }: RecipeServiceOptions) {
  async function getRecipes(auth: AuthContext): Promise<RecipeWithTotals[]> {
    if (!supabaseConfigured) {
      return [...demoRecipes]
        .sort((first, second) => Number(new Date(second.created_at || 0)) - Number(new Date(first.created_at || 0)))
        .map(getDemoRecipeWithIngredientTotals);
    }

    const supabase = getSupabaseForUser(auth);
    const recipes = await supabase<SupabaseRecipe[]>("recipes?select=*&order=created_at.desc");
    const ingredients = await supabase<SupabaseIngredient[]>(
      "recipe_ingredients?select=id,recipe_id,quantity,foods(id,name,calories_per_unit,kj_per_unit,protein_per_unit,unit_label)"
    );

    return recipes.map((recipe) => {
      const rows = ingredients
        .filter((ingredient) => ingredient.recipe_id === recipe.id)
        .map((ingredient) => {
          const food = ingredient.foods;
          return {
            food_id: food.id,
            food_name: food.name,
            weight_g: Number(ingredient.quantity),
            calories: (Number(food.calories_per_unit) * Number(ingredient.quantity)) / 100,
            kj: (Number(food.kj_per_unit) * Number(ingredient.quantity)) / 100,
            protein: (Number(food.protein_per_unit) * Number(ingredient.quantity)) / 100
          };
        });

      return withRecipeTotals({ ...recipe, ingredients: rows });
    });
  }

  async function createRecipe(payload: NewRecipePayload, auth: AuthContext): Promise<RecipeWithTotals> {
    return saveRecipe(payload, auth);
  }

  async function updateRecipe(id: string, payload: NewRecipePayload, auth: AuthContext): Promise<RecipeWithTotals> {
    return saveRecipe(payload, auth, id);
  }

  async function deleteRecipe(id: string, auth: AuthContext) {
    if (!supabaseConfigured) {
      setDemoRecipes(demoRecipes.filter((recipe) => recipe.id !== id));
      return { ok: true };
    }

    const supabase = getSupabaseForUser(auth);
    await supabase<SupabaseRecipe[]>(`recipes?${filterEq("id", id)}`, {
      method: "DELETE"
    });

    return { ok: true };
  }

  async function saveRecipe(payload: NewRecipePayload, auth: AuthContext, id?: string): Promise<RecipeWithTotals> {
    const name = payload.name?.trim();
    const ingredients = (payload.ingredients || [])
      .map((ingredient, index) => ({
        food_id: ingredient.food_id,
        weight_g: Number(ingredient.weight_g),
        sort_order: index + 1
      }))
      .filter((ingredient) => ingredient.food_id && Number.isFinite(ingredient.weight_g) && ingredient.weight_g > 0);
    const ingredientWeight = ingredients.reduce((sum, ingredient) => sum + ingredient.weight_g, 0);
    const submittedTotalWeight = Number(payload.total_weight_g);
    const totalWeight =
      Number.isFinite(submittedTotalWeight) && submittedTotalWeight > 0 ? submittedTotalWeight : ingredientWeight;

    if (!name || ingredients.length === 0) {
      throw badRequest("Recipe name and at least one ingredient amount are required");
    }

    if (!supabaseConfigured) {
      const recipe: Recipe = {
        id: id || `demo-recipe-${Date.now()}`,
        name,
        category: payload.category || "Meal",
        target_plan: payload.target_plan || null,
        total_weight_g: round1(totalWeight),
        created_at: id ? demoRecipes.find((recipe) => recipe.id === id)?.created_at : new Date().toISOString(),
        ingredients: ingredients.map((ingredient) => ({
          food_id: ingredient.food_id as string,
          food_name: "",
          weight_g: ingredient.weight_g,
          calories: 0,
          kj: 0,
          protein: 0
        }))
      };
      setDemoRecipes(id ? demoRecipes.map((existing) => (existing.id === id ? recipe : existing)) : [...demoRecipes, recipe]);
      return getDemoRecipeWithIngredientTotals(recipe);
    }

    const recipePayload = {
      name,
      category: payload.category || null,
      target_plan: payload.target_plan || null,
      total_weight_g: round1(totalWeight),
      user_id: auth.userId
    };

    const supabase = getSupabaseForUser(auth);
    const [savedRecipe] = id
      ? await supabase<SupabaseRecipe[]>(`recipes?${filterEq("id", id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: recipePayload.name,
            category: recipePayload.category,
            target_plan: recipePayload.target_plan,
            total_weight_g: recipePayload.total_weight_g
          })
        })
      : await supabase<SupabaseRecipe[]>("recipes", {
          method: "POST",
          body: JSON.stringify(recipePayload)
        });

    if (!savedRecipe) {
      throw id ? notFound("Meal not found") : new Error("Supabase did not return the created recipe");
    }

    if (id) {
      await supabase(`recipe_ingredients?${filterEq("recipe_id", id)}`, {
        method: "DELETE"
      });
    }

    await supabase("recipe_ingredients", {
      method: "POST",
      body: JSON.stringify(
        ingredients.map((ingredient) => ({
          recipe_id: savedRecipe.id,
          food_id: ingredient.food_id,
          quantity: ingredient.weight_g,
          sort_order: ingredient.sort_order
        }))
      )
    });

    const [recipeWithTotals] = (await getRecipes(auth)).filter((recipe) => recipe.id === savedRecipe.id);
    if (!recipeWithTotals) {
      throw new Error("Saved recipe could not be loaded");
    }

    return recipeWithTotals;
  }

  return { getRecipes, createRecipe, updateRecipe, deleteRecipe };

  function getSupabaseForUser(auth: AuthContext) {
    if (!auth.accessToken || !auth.userId) {
      throw unauthorized("Sign in to manage meals.");
    }

    return createSupabase(auth.accessToken);
  }
}

function getDemoRecipeWithIngredientTotals(recipe: Recipe): RecipeWithTotals {
  const ingredients = recipe.ingredients.map((ingredient) => {
    const food = demoFoods.find((item) => item.id === ingredient.food_id);
    if (!food) {
      return ingredient;
    }

    return {
      food_id: food.id,
      food_name: food.name,
      weight_g: ingredient.weight_g,
      calories: round1((food.calories_per_unit * ingredient.weight_g) / 100),
      kj: round1((food.kj_per_unit * ingredient.weight_g) / 100),
      protein: round1((food.protein_per_unit * ingredient.weight_g) / 100)
    };
  });

  return withRecipeTotals({ ...recipe, ingredients });
}

function withRecipeTotals(recipe: Recipe): RecipeWithTotals {
  const calories = recipe.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.calories || 0), 0);
  const kj = recipe.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.kj || 0), 0);
  const protein = recipe.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.protein || 0), 0);
  return {
    ...recipe,
    total_weight_g: round1(Number(recipe.total_weight_g ?? getRecipeIngredientWeight(recipe))),
    calories: Math.round(calories),
    kj: round1(kj),
    protein: Math.round(protein * 10) / 10
  };
}
