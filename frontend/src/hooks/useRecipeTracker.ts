import { useEffect, useMemo, useState } from "react";
import {
  createFood,
  createRecipe,
  deleteFood,
  deleteRecipe,
  getFoods,
  getHealth,
  getRecipes,
  updateFood,
  updateRecipe
} from "../api";
import { KJ_PER_CALORIE, round1 } from "../lib/format";
import type { Route } from "../lib/routing";
import type { Food, Health, NewFood, NewRecipe, Recipe } from "../types";

const initialFood: NewFood = {
  name: "",
  calories_per_unit: 0,
  kj_per_unit: 0,
  protein_per_unit: 0,
  unit_label: "100g"
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

export function useRecipeTracker(onNavigate?: (route: Route) => void) {
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
    async function load() {
      try {
        const nextHealth = await getHealth();
        setHealth(nextHealth);
        await refresh();
        setMessage("");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load app data.");
      }
    }

    void load();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteRecipeIds));
  }, [favoriteRecipeIds]);

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
      unit_label: "100g"
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

    if (!window.confirm(`Delete ${recipeIds.length} selected meal${recipeIds.length === 1 ? "" : "s"}?`)) {
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
    setFavoriteRecipeIds((currentIds) =>
      currentIds.includes(recipeId)
        ? currentIds.filter((currentId) => currentId !== recipeId)
        : [...currentIds, recipeId]
    );
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
