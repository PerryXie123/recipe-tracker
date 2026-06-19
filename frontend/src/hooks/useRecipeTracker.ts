import { useEffect, useMemo, useState } from "react";
import {
  createFood,
  createRecipe,
  deleteFood,
  deleteRecipe,
  getFoods,
  getHealth,
  getRecipes,
  setApiAccessToken,
  updateFood,
  updateRecipe
} from "../api";
import { KJ_PER_CALORIE, round1 } from "../lib/format";
import type { Route } from "../lib/routing";
import { supabase } from "../lib/supabase";
import type { Food, Health, NewFood, NewRecipe, Recipe } from "../types";

const initialFood: NewFood = {
  name: "",
  calories_per_unit: 0,
  kj_per_unit: 0,
  protein_per_unit: 0,
  unit_label: "100g",
  unit_weight_g: 100
};

const initialRecipe: NewRecipe = {
  name: "",
  category: "Meal",
  total_weight_g: 100,
  ingredients: [{ food_id: "", weight_g: 100 }]
};

const FAVORITES_STORAGE_KEY = "recipe-tracker-favorite-recipe-ids";

function getInitialFavoriteRecipeIds() {
  try {
    const savedIds = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    return savedIds ? (JSON.parse(savedIds) as string[]) : [];
  } catch {
    return [];
  }
}

export function useRecipeTracker(onNavigate?: (route: Route) => void, accessToken?: string) {
  const [health, setHealth] = useState<Health | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [foodForm, setFoodForm] = useState<NewFood>(initialFood);
  const [recipeForm, setRecipeForm] = useState<NewRecipe>(initialRecipe);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [isTotalWeightManual, setIsTotalWeightManual] = useState(false);
  const [ingredientQueries, setIngredientQueries] = useState<string[]>([""]);
  const [portionWeights, setPortionWeights] = useState<Record<string, number>>({});
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<string[]>(getInitialFavoriteRecipeIds);
  const [message, setMessage] = useState("Loading recipe tracker...");
  const [recipeMessage, setRecipeMessage] = useState("");
  const [isSavingFood, setIsSavingFood] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  async function refresh() {
    const [nextFoods, nextRecipes] = await Promise.all([getFoods(), getRecipes()]);
    setFoods(nextFoods);
    setRecipes(nextRecipes);
  }

  useEffect(() => {
    setApiAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    async function load() {
      try {
        const nextHealth = await getHealth();
        setHealth(nextHealth);
        if (nextHealth.supabaseConfigured && !accessToken) {
          setFoods([]);
          setRecipes([]);
          setMessage("Sign in to load your ingredients.");
          setRecipeMessage("Sign in to load your meals.");
          return;
        }

        await refresh();
        setMessage("");
        setRecipeMessage("");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load app data.");
      }
    }

    void load();
  }, [accessToken]);

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteRecipeIds));
  }, [favoriteRecipeIds]);

  useEffect(() => {
    if (!supabase || !accessToken) {
      return;
    }

    const supabaseClient = supabase;
    let isMounted = true;
    let channel: ReturnType<typeof supabaseClient.channel> | null = null;

    async function loadFavoriteIds() {
      const { data, error } = await supabaseClient
        .from("favorite_recipes")
        .select("recipe_id")
        .order("created_at");
      if (error) {
        throw error;
      }
      return (data || []).map((favorite) => String(favorite.recipe_id));
    }

    async function initializeFavorites() {
      try {
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        const userId = sessionData.session?.user.id;
        if (!userId || !isMounted) {
          return;
        }

        let remoteIds = await loadFavoriteIds();
        const localIds = getInitialFavoriteRecipeIds();
        if (remoteIds.length === 0 && localIds.length > 0) {
          await Promise.allSettled(
            localIds.map((recipeId) =>
              supabaseClient.from("favorite_recipes").upsert({ user_id: userId, recipe_id: recipeId })
            )
          );
          remoteIds = await loadFavoriteIds();
        }

        if (isMounted) {
          setFavoriteRecipeIds(remoteIds);
        }

        channel = supabaseClient
          .channel(`favorite-recipes-${userId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "favorite_recipes", filter: `user_id=eq.${userId}` },
            () => {
              void loadFavoriteIds()
                .then((ids) => {
                  if (isMounted) {
                    setFavoriteRecipeIds(ids);
                  }
                })
                .catch((error) => console.error("Could not refresh favourites from the database", error));
            }
          )
          .subscribe();
      } catch (error) {
        console.error("Could not load favourites from the database", error);
      }
    }

    void initializeFavorites();

    return () => {
      isMounted = false;
      if (channel) {
        void supabaseClient.removeChannel(channel);
      }
    };
  }, [accessToken]);

  useEffect(() => {
    setFavoriteRecipeIds((currentIds) => currentIds.filter((recipeId) => recipes.some((recipe) => recipe.id === recipeId)));
  }, [recipes]);

  const mealTotals = useMemo(() => {
    return recipes.reduce(
      (totals, recipe) => ({
        calories: totals.calories + recipe.calories,
        kj: totals.kj + recipe.kj,
        protein: totals.protein + recipe.protein,
        weight: totals.weight + Number(recipe.total_weight_g || 0)
      }),
      { calories: 0, kj: 0, protein: 0, weight: 0 }
    );
  }, [recipes]);

  const ingredientWeightTotal = useMemo(() => {
    return round1(recipeForm.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.weight_g || 0), 0));
  }, [recipeForm.ingredients]);

  function updateFoodCalories(calories: number) {
    setFoodForm({ ...foodForm, calories_per_unit: calories, kj_per_unit: round1(calories * KJ_PER_CALORIE) });
  }

  function updateFoodKj(kj: number) {
    setFoodForm({ ...foodForm, kj_per_unit: kj, calories_per_unit: round1(kj / KJ_PER_CALORIE) });
  }

  async function saveFood() {
    setIsSavingFood(true);
    setMessage(editingFoodId ? "Saving ingredient..." : "Adding ingredient...");

    try {
      if (editingFoodId) {
        await updateFood(editingFoodId, foodForm);
        setMessage("Ingredient saved.");
      } else {
        await createFood(foodForm);
        setMessage("Ingredient added.");
      }
      resetFoodForm();
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save ingredient.");
    } finally {
      setIsSavingFood(false);
    }
  }

  function editFood(food: Food) {
    setEditingFoodId(food.id);
    setFoodForm({
      name: food.name,
      calories_per_unit: Number(food.calories_per_unit),
      kj_per_unit: Number(food.kj_per_unit),
      protein_per_unit: Number(food.protein_per_unit),
      unit_label: food.unit_label || "100g",
      unit_weight_g: Number(food.unit_weight_g ?? (food.unit_label === "100g" ? 100 : 0))
    });
    setMessage("");
    onNavigate?.("ingredients");
  }

  async function removeFood(food: Food) {
    setMessage("Deleting ingredient...");
    try {
      await deleteFood(food.id);
      if (editingFoodId === food.id) {
        resetFoodForm();
      }
      await refresh();
      setMessage("Ingredient deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete ingredient.");
    }
  }

  async function removeFoods(foodIds: string[]) {
    if (foodIds.length === 0) {
      return;
    }

    setMessage("Deleting ingredients...");
    try {
      await Promise.all(foodIds.map((foodId) => deleteFood(foodId)));
      if (editingFoodId && foodIds.includes(editingFoodId)) {
        resetFoodForm();
      }
      await refresh();
      setMessage("Ingredients deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete selected ingredients.");
    }
  }

  async function removeFoodAndRecipeReferences(food: Food) {
    setMessage("Deleting ingredient and updating meals...");
    try {
      await deleteFood(food.id, { removeReferences: true });
      if (editingFoodId === food.id) {
        resetFoodForm();
      }
      await refresh();
      setMessage("Ingredient deleted and removed from meals.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete ingredient from meals.");
    }
  }

  function resetFoodForm() {
    setEditingFoodId(null);
    setFoodForm(initialFood);
  }

  async function saveRecipe() {
    setIsSavingRecipe(true);
    setRecipeMessage(editingRecipeId ? "Saving meal..." : "Adding meal...");

    try {
      if (editingRecipeId) {
        await updateRecipe(editingRecipeId, recipeForm);
        setRecipeMessage("Meal saved.");
      } else {
        await createRecipe(recipeForm);
        setRecipeMessage("Meal added.");
      }
      resetRecipeForm();
      await refresh();
    } catch (error) {
      setRecipeMessage(error instanceof Error ? error.message : "Could not save meal.");
    } finally {
      setIsSavingRecipe(false);
    }
  }

  function editRecipe(recipe: Recipe) {
    const ingredients =
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ingredient) => ({ food_id: ingredient.food_id, weight_g: Number(ingredient.weight_g) }))
        : [{ food_id: "", weight_g: 100 }];

    setEditingRecipeId(recipe.id);
    setRecipeForm({
      name: recipe.name,
      category: recipe.category || "Meal",
      total_weight_g: Number(recipe.total_weight_g || 0),
      ingredients
    });
    setIngredientQueries(ingredients.map((ingredient) => foods.find((food) => food.id === ingredient.food_id)?.name || ""));
    setIsTotalWeightManual(true);
    setRecipeMessage("");
    onNavigate?.("meals");
  }

  async function removeRecipe(recipe: Recipe) {
    setRecipeMessage("Deleting meal...");
    try {
      await deleteRecipe(recipe.id);
      if (editingRecipeId === recipe.id) {
        resetRecipeForm();
      }
      await refresh();
      setRecipeMessage("Meal deleted.");
    } catch (error) {
      setRecipeMessage(error instanceof Error ? error.message : "Could not delete meal.");
    }
  }

  async function removeRecipes(recipeIds: string[]) {
    if (recipeIds.length === 0) {
      return;
    }

    setRecipeMessage("Deleting meals...");
    try {
      await Promise.all(recipeIds.map((recipeId) => deleteRecipe(recipeId)));
      if (editingRecipeId && recipeIds.includes(editingRecipeId)) {
        resetRecipeForm();
      }
      await refresh();
      setRecipeMessage("Meals deleted.");
    } catch (error) {
      setRecipeMessage(error instanceof Error ? error.message : "Could not delete selected meals.");
    }
  }

  function resetRecipeForm() {
    setEditingRecipeId(null);
    setRecipeForm(initialRecipe);
    setIngredientQueries([""]);
    setIsTotalWeightManual(false);
  }

  function updateRecipeIngredient(index: number, values: Partial<NewRecipe["ingredients"][number]>) {
    const ingredients = recipeForm.ingredients.map((ingredient, ingredientIndex) =>
      ingredientIndex === index ? { ...ingredient, ...values } : ingredient
    );
    const nextWeight = round1(ingredients.reduce((sum, ingredient) => sum + Number(ingredient.weight_g || 0), 0));
    setRecipeForm({
      ...recipeForm,
      ingredients,
      total_weight_g: isTotalWeightManual ? recipeForm.total_weight_g : nextWeight
    });
  }

  function updateIngredientQuery(index: number, value: string) {
    const queries = ingredientQueries.map((query, queryIndex) => (queryIndex === index ? value : query));
    const matchedFood = foods.find((food) => food.name.toLowerCase() === value.trim().toLowerCase());
    setIngredientQueries(queries);
    updateRecipeIngredient(index, { food_id: matchedFood?.id || "" });
  }

  function chooseIngredient(index: number, food: Food) {
    const queries = ingredientQueries.map((query, queryIndex) => (queryIndex === index ? food.name : query));
    setIngredientQueries(queries);
    updateRecipeIngredient(index, { food_id: food.id });
  }

  function getIngredientMatches(query: string) {
    const lowered = query.trim().toLowerCase();
    return foods.filter((food) => !lowered || food.name.toLowerCase().includes(lowered)).slice(0, 6);
  }

  function addRecipeIngredient() {
    const ingredients = [...recipeForm.ingredients, { food_id: "", weight_g: 100 }];
    const nextWeight = round1(ingredients.reduce((sum, ingredient) => sum + Number(ingredient.weight_g || 0), 0));
    setRecipeForm({
      ...recipeForm,
      ingredients,
      total_weight_g: isTotalWeightManual ? recipeForm.total_weight_g : nextWeight
    });
    setIngredientQueries([...ingredientQueries, ""]);
  }

  function removeRecipeIngredient(index: number) {
    const ingredients =
      recipeForm.ingredients.length === 1
        ? [{ food_id: "", weight_g: 100 }]
        : recipeForm.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index);
    const queries =
      ingredientQueries.length === 1 ? [""] : ingredientQueries.filter((_, queryIndex) => queryIndex !== index);
    const nextWeight = round1(ingredients.reduce((sum, ingredient) => sum + Number(ingredient.weight_g || 0), 0));
    setRecipeForm({
      ...recipeForm,
      ingredients,
      total_weight_g: isTotalWeightManual ? recipeForm.total_weight_g : nextWeight
    });
    setIngredientQueries(queries);
  }

  function regenerateTotalWeight() {
    setRecipeForm({ ...recipeForm, total_weight_g: ingredientWeightTotal });
    setIsTotalWeightManual(false);
  }

  function setManualTotalWeight(value: number) {
    setIsTotalWeightManual(true);
    setRecipeForm({ ...recipeForm, total_weight_g: value });
  }

  function getPortionWeight(recipe: Recipe) {
    const savedWeight = Number(recipe.total_weight_g || 0);
    const portionWeight = portionWeights[recipe.id];
    return Number.isFinite(portionWeight) && portionWeight > 0 ? portionWeight : Math.min(100, savedWeight || 100);
  }

  function getPortionTotals(recipe: Recipe) {
    const totalWeight = Number(recipe.total_weight_g || 0);
    const portionWeight = getPortionWeight(recipe);
    const multiplier = totalWeight > 0 ? portionWeight / totalWeight : 0;

    return {
      weight: portionWeight,
      calories: recipe.calories * multiplier,
      kj: recipe.kj * multiplier,
      protein: recipe.protein * multiplier
    };
  }

  function toggleFavoriteRecipe(recipeId: string) {
    const wasFavorite = favoriteRecipeIds.includes(recipeId);
    setFavoriteRecipeIds(
      wasFavorite
        ? favoriteRecipeIds.filter((currentId) => currentId !== recipeId)
        : [...favoriteRecipeIds, recipeId]
    );

    if (supabase && accessToken) {
      const supabaseClient = supabase;
      void supabaseClient.auth.getSession().then(async ({ data, error: sessionError }) => {
        const userId = data.session?.user.id;
        if (sessionError || !userId) {
          throw sessionError || new Error("Sign in to save favourites.");
        }

        const result = wasFavorite
          ? await supabaseClient.from("favorite_recipes").delete().eq("user_id", userId).eq("recipe_id", recipeId)
          : await supabaseClient.from("favorite_recipes").upsert({ user_id: userId, recipe_id: recipeId });

        if (result.error) {
          throw result.error;
        }
      }).catch((error) => {
        console.error("Could not sync favourite to the database", error);
        setFavoriteRecipeIds((currentIds) =>
          wasFavorite
            ? currentIds.includes(recipeId) ? currentIds : [...currentIds, recipeId]
            : currentIds.filter((currentId) => currentId !== recipeId)
        );
      });
    }
  }

  return {
    health,
    foods,
    recipes,
    favoriteRecipeIds,
    mealTotals,
    foodForm,
    setFoodForm,
    recipeForm,
    setRecipeForm,
    editingFoodId,
    editingRecipeId,
    ingredientQueries,
    ingredientWeightTotal,
    message,
    recipeMessage,
    isSavingFood,
    isSavingRecipe,
    saveFood,
    editFood,
    removeFood,
    removeFoods,
    removeFoodAndRecipeReferences,
    resetFoodForm,
    updateFoodCalories,
    updateFoodKj,
    saveRecipe,
    editRecipe,
    removeRecipe,
    removeRecipes,
    resetRecipeForm,
    updateRecipeIngredient,
    updateIngredientQuery,
    chooseIngredient,
    getIngredientMatches,
    addRecipeIngredient,
    removeRecipeIngredient,
    regenerateTotalWeight,
    setManualTotalWeight,
    portionWeights,
    setPortionWeights,
    getPortionTotals,
    toggleFavoriteRecipe
  };
}
