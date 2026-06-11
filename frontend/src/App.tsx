import { FormEvent, useEffect, useMemo, useState } from "react";
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
} from "./api";
import type { Food, Health, NewFood, NewRecipe, Recipe } from "./types";

type Tab = "ingredients" | "meals";

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

const KJ_PER_CALORIE = 4.184;

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("ingredients");
  const [health, setHealth] = useState<Health | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [newFood, setNewFood] = useState<NewFood>(initialFood);
  const [newRecipe, setNewRecipe] = useState<NewRecipe>(initialRecipe);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [isTotalWeightManual, setIsTotalWeightManual] = useState(false);
  const [portionWeights, setPortionWeights] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("Loading recipe tracker...");
  const [recipeMessage, setRecipeMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
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
    return round1(newRecipe.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.weight_g || 0), 0));
  }, [newRecipe.ingredients]);

  async function handleFoodSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(editingFoodId ? "Saving ingredient..." : "Adding ingredient...");

    try {
      if (editingFoodId) {
        await updateFood(editingFoodId, newFood);
        setMessage("Ingredient saved.");
      } else {
        await createFood(newFood);
        setMessage("Ingredient added.");
      }
      resetFoodForm();
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save ingredient.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRecipeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingRecipe(true);
    setRecipeMessage(editingRecipeId ? "Saving meal..." : "Adding meal...");

    try {
      if (editingRecipeId) {
        await updateRecipe(editingRecipeId, newRecipe);
        setRecipeMessage("Meal saved.");
      } else {
        await createRecipe(newRecipe);
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

  function editFood(food: Food) {
    setEditingFoodId(food.id);
    setNewFood({
      name: food.name,
      calories_per_unit: Number(food.calories_per_unit),
      kj_per_unit: Number(food.kj_per_unit),
      protein_per_unit: Number(food.protein_per_unit),
      unit_label: "100g"
    });
    setMessage("");
  }

  async function handleFoodDelete(food: Food) {
    if (!window.confirm(`Delete ${food.name}?`)) {
      return;
    }

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

  function resetFoodForm() {
    setEditingFoodId(null);
    setNewFood(initialFood);
  }

  function editRecipe(recipe: Recipe) {
    setEditingRecipeId(recipe.id);
    setNewRecipe({
      name: recipe.name,
      category: recipe.category || "Meal",
      total_weight_g: Number(recipe.total_weight_g || 0),
      ingredients:
        recipe.ingredients.length > 0
          ? recipe.ingredients.map((ingredient) => ({
              food_id: ingredient.food_id,
              weight_g: Number(ingredient.weight_g)
            }))
          : [{ food_id: "", weight_g: 100 }]
    });
    setIsTotalWeightManual(true);
    setRecipeMessage("");
  }

  async function handleRecipeDelete(recipe: Recipe) {
    if (!window.confirm(`Delete ${recipe.name}?`)) {
      return;
    }

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

  function resetRecipeForm() {
    setEditingRecipeId(null);
    setNewRecipe(initialRecipe);
    setIsTotalWeightManual(false);
  }

  function updateRecipeIngredient(index: number, values: Partial<NewRecipe["ingredients"][number]>) {
    const ingredients = newRecipe.ingredients.map((ingredient, ingredientIndex) =>
      ingredientIndex === index ? { ...ingredient, ...values } : ingredient
    );
    const nextWeight = round1(ingredients.reduce((sum, ingredient) => sum + Number(ingredient.weight_g || 0), 0));
    setNewRecipe({
      ...newRecipe,
      ingredients,
      total_weight_g: isTotalWeightManual ? newRecipe.total_weight_g : nextWeight
    });
  }

  function addRecipeIngredient() {
    const ingredients = [...newRecipe.ingredients, { food_id: "", weight_g: 100 }];
    const nextWeight = round1(ingredients.reduce((sum, ingredient) => sum + Number(ingredient.weight_g || 0), 0));
    setNewRecipe({
      ...newRecipe,
      ingredients,
      total_weight_g: isTotalWeightManual ? newRecipe.total_weight_g : nextWeight
    });
  }

  function removeRecipeIngredient(index: number) {
    const ingredients =
      newRecipe.ingredients.length === 1
        ? [{ food_id: "", weight_g: 100 }]
        : newRecipe.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index);
    const nextWeight = round1(ingredients.reduce((sum, ingredient) => sum + Number(ingredient.weight_g || 0), 0));
    setNewRecipe({
      ...newRecipe,
      ingredients,
      total_weight_g: isTotalWeightManual ? newRecipe.total_weight_g : nextWeight
    });
  }

  function regenerateTotalWeight() {
    setNewRecipe({ ...newRecipe, total_weight_g: ingredientWeightTotal });
    setIsTotalWeightManual(false);
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

  return (
    <main className="home">
      <header className="hero">
        <div>
          <p className="eyebrow">Recipe Tracker</p>
          <h1>Build meals from ingredients</h1>
        </div>

        <div className="status-panel">
          <span className={`status-dot ${health ? "ready" : ""}`} />
          <span>
            {health?.supabaseConfigured
              ? "Connected to Supabase"
              : "Demo mode: add backend/.env to connect Supabase"}
          </span>
        </div>
      </header>

      <section className="tabs-shell">
        <div className="tabs" role="tablist" aria-label="Recipe tracker sections">
          <button
            className={activeTab === "ingredients" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={activeTab === "ingredients"}
            onClick={() => setActiveTab("ingredients")}
          >
            Ingredients
          </button>
          <button
            className={activeTab === "meals" ? "active" : ""}
            type="button"
            role="tab"
            aria-selected={activeTab === "meals"}
            onClick={() => setActiveTab("meals")}
          >
            Meals
          </button>
        </div>

        {activeTab === "ingredients" ? (
          <section className="tab-panel ingredients-layout" role="tabpanel">
            <div>
              <div className="section-header">
                <div>
                  <p className="eyebrow">Nutrition database</p>
                  <h2>Ingredients</h2>
                </div>
                <span className="count-pill">{foods.length} saved</span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Calories</th>
                      <th>kJ</th>
                      <th>Protein</th>
                      <th>Basis</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foods.map((food) => (
                      <tr key={food.id}>
                        <td>{food.name}</td>
                        <td>{formatNumber(food.calories_per_unit)}</td>
                        <td>{formatNumber(food.kj_per_unit)}</td>
                        <td>{formatNumber(food.protein_per_unit)}g</td>
                        <td>per 100g</td>
                        <td>
                          <div className="action-row">
                            <button className="text-button" type="button" onClick={() => editFood(food)}>
                              Edit
                            </button>
                            <button className="text-button danger" type="button" onClick={() => handleFoodDelete(food)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <form className="form-panel" onSubmit={handleFoodSubmit}>
              <div>
                <p className="eyebrow">Quick add</p>
                <h2>{editingFoodId ? "Edit ingredient" : "Add ingredient"}</h2>
              </div>

              <label>
                <span>Name</span>
                <input
                  value={newFood.name}
                  onChange={(event) => setNewFood({ ...newFood, name: event.target.value })}
                  placeholder="e.g. Cottage cheese"
                  required
                />
              </label>

              <div className="form-grid">
                <label>
                  <span>Calories</span>
                  <input
                    value={newFood.calories_per_unit}
                    onChange={(event) => {
                      const calories = Number(event.target.value);
                      setNewFood({
                        ...newFood,
                        calories_per_unit: calories,
                        kj_per_unit: round1(calories * KJ_PER_CALORIE)
                      });
                    }}
                    type="number"
                    min="0"
                    step="0.1"
                    required
                  />
                </label>

                <label>
                  <span>kJ</span>
                  <input
                    value={newFood.kj_per_unit}
                    onChange={(event) => {
                      const kj = Number(event.target.value);
                      setNewFood({
                        ...newFood,
                        kj_per_unit: kj,
                        calories_per_unit: round1(kj / KJ_PER_CALORIE)
                      });
                    }}
                    type="number"
                    min="0"
                    step="0.1"
                    required
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  <span>Protein</span>
                  <input
                    value={newFood.protein_per_unit}
                    onChange={(event) =>
                      setNewFood({ ...newFood, protein_per_unit: Number(event.target.value) })
                    }
                    type="number"
                    min="0"
                    step="0.1"
                    required
                  />
                </label>
              </div>

              <div className="fixed-field">
                <span>Unit</span>
                <strong>100g</strong>
              </div>

              <button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingFoodId ? "Save ingredient" : "Add ingredient"}
              </button>
              {editingFoodId ? (
                <button className="secondary-button" type="button" onClick={resetFoodForm}>
                  Cancel edit
                </button>
              ) : null}
              <p className="form-message" role="status">
                {message}
              </p>
            </form>
          </section>
        ) : (
          <section className="tab-panel meals-layout" role="tabpanel">
            <div>
              <div className="section-header">
                <div>
                  <p className="eyebrow">Calculated from ingredients</p>
                  <h2>Meals</h2>
                </div>
                <div className="summary-row">
                  <span>{recipes.length} meals</span>
                  <span>{formatNumber(mealTotals.calories)} cal</span>
                  <span>{formatNumber(mealTotals.kj)} kJ</span>
                  <span>{formatNumber(mealTotals.protein)}g protein</span>
                  <span>{formatNumber(mealTotals.weight)}g total</span>
                </div>
              </div>

              <div className="meal-grid" aria-live="polite">
                {recipes.map((recipe) => {
                  const portionTotals = getPortionTotals(recipe);

                  return (
                    <article className="meal-card" key={recipe.id}>
                      <header>
                        <div>
                          <h3>{recipe.name}</h3>
                          <p>{formatNumber(recipe.total_weight_g || 0)}g total weight</p>
                        </div>
                        <span className="count-pill">{recipe.category || "Meal"}</span>
                      </header>

                      <div className="macro-row">
                        <div>
                          <span>Calories</span>
                          <strong>{formatNumber(recipe.calories)}</strong>
                        </div>
                        <div>
                          <span>kJ</span>
                          <strong>{formatNumber(recipe.kj)}</strong>
                        </div>
                        <div>
                          <span>Protein</span>
                          <strong>{formatNumber(recipe.protein)}g</strong>
                        </div>
                      </div>

                      <div className="portion-panel">
                        <label>
                          <span>Portion (g)</span>
                          <input
                            value={portionTotals.weight}
                            onChange={(event) =>
                              setPortionWeights({
                                ...portionWeights,
                                [recipe.id]: Number(event.target.value)
                              })
                            }
                            type="number"
                            min="0"
                            step="0.1"
                          />
                        </label>

                        <div className="portion-results">
                          <div>
                            <span>Calories</span>
                            <strong>{formatNumber(portionTotals.calories)}</strong>
                          </div>
                          <div>
                            <span>kJ</span>
                            <strong>{formatNumber(portionTotals.kj)}</strong>
                          </div>
                          <div>
                            <span>Protein</span>
                            <strong>{formatNumber(portionTotals.protein)}g</strong>
                          </div>
                        </div>
                      </div>

                      <ul className="ingredient-list">
                        {recipe.ingredients.map((ingredient, index) => (
                          <li key={`${recipe.id}-${ingredient.food_id}-${index}`}>
                            {ingredient.food_name}: {formatNumber(ingredient.weight_g)}g
                          </li>
                        ))}
                      </ul>

                      <div className="card-actions">
                        <button className="text-button" type="button" onClick={() => editRecipe(recipe)}>
                          Edit
                        </button>
                        <button className="text-button danger" type="button" onClick={() => handleRecipeDelete(recipe)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <form className="form-panel" onSubmit={handleRecipeSubmit}>
              <div>
                <p className="eyebrow">Meal builder</p>
                <h2>{editingRecipeId ? "Edit meal" : "Add meal"}</h2>
              </div>

              <label>
                <span>Name</span>
                <input
                  value={newRecipe.name}
                  onChange={(event) => setNewRecipe({ ...newRecipe, name: event.target.value })}
                  placeholder="e.g. Chicken rice bowl"
                  required
                />
              </label>

              <div className="form-grid">
                <label>
                  <span>Category</span>
                  <select
                    value={newRecipe.category}
                    onChange={(event) => setNewRecipe({ ...newRecipe, category: event.target.value })}
                  >
                    <option value="Meal">Meal</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snack">Snack</option>
                  </select>
                </label>

              </div>

              <div className="form-grid weight-grid">
                <label>
                  <span>Total weight (g)</span>
                  <input
                    value={newRecipe.total_weight_g}
                    onChange={(event) => {
                      setIsTotalWeightManual(true);
                      setNewRecipe({ ...newRecipe, total_weight_g: Number(event.target.value) });
                    }}
                    type="number"
                    min="0"
                    step="0.1"
                  />
                </label>

                <button className="secondary-button inline-button" type="button" onClick={regenerateTotalWeight}>
                  Regenerate
                </button>
              </div>
              <p className="form-message">Ingredient weight total: {formatNumber(ingredientWeightTotal)}g</p>

              <div className="builder-list">
                {newRecipe.ingredients.map((ingredient, index) => {
                  return (
                    <div className="builder-row" key={index}>
                      <label>
                        <span>Ingredient</span>
                        <select
                          value={ingredient.food_id}
                          onChange={(event) => updateRecipeIngredient(index, { food_id: event.target.value })}
                          required
                        >
                          <option value="">Choose ingredient</option>
                          {foods.map((food) => (
                            <option value={food.id} key={food.id}>
                              {food.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span>Weight (g)</span>
                        <input
                          value={ingredient.weight_g}
                          onChange={(event) =>
                            updateRecipeIngredient(index, { weight_g: Number(event.target.value) })
                          }
                          type="number"
                          min="0"
                          step="0.1"
                          required
                        />
                      </label>

                      <button
                        className="icon-button"
                        type="button"
                        aria-label="Remove ingredient"
                        onClick={() => removeRecipeIngredient(index)}
                      >
                        -
                      </button>
                    </div>
                  );
                })}
              </div>

              <button className="secondary-button" type="button" onClick={addRecipeIngredient}>
                Add ingredient
              </button>

              <button type="submit" disabled={isSavingRecipe || foods.length === 0}>
                {isSavingRecipe ? "Saving..." : editingRecipeId ? "Save meal" : "Add meal"}
              </button>
              {editingRecipeId ? (
                <button className="secondary-button" type="button" onClick={resetRecipeForm}>
                  Cancel edit
                </button>
              ) : null}
              <p className="form-message" role="status">
                {foods.length === 0 ? "Add at least one ingredient first." : recipeMessage}
              </p>
            </form>
          </section>
        )}
      </section>
    </main>
  );
}
