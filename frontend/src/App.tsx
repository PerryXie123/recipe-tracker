import { FormEvent, useEffect, useMemo, useState } from "react";
import { createFood, getFoods, getHealth, getRecipes } from "./api";
import type { Food, Health, NewFood, Recipe } from "./types";

type Tab = "ingredients" | "meals";

const initialFood: NewFood = {
  name: "",
  calories_per_unit: 0,
  protein_per_unit: 0,
  unit_label: "100g"
};

function formatNumber(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("ingredients");
  const [health, setHealth] = useState<Health | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [newFood, setNewFood] = useState<NewFood>(initialFood);
  const [message, setMessage] = useState("Loading recipe tracker...");
  const [isSaving, setIsSaving] = useState(false);

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
        protein: totals.protein + recipe.protein
      }),
      { calories: 0, protein: 0 }
    );
  }, [recipes]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("Adding ingredient...");

    try {
      await createFood(newFood);
      setNewFood(initialFood);
      await refresh();
      setMessage("Ingredient added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add ingredient.");
    } finally {
      setIsSaving(false);
    }
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
                      <th>Protein</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foods.map((food) => (
                      <tr key={food.id}>
                        <td>{food.name}</td>
                        <td>{formatNumber(food.calories_per_unit)}</td>
                        <td>{formatNumber(food.protein_per_unit)}g</td>
                        <td>{food.unit_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <form className="form-panel" onSubmit={handleSubmit}>
              <div>
                <p className="eyebrow">Quick add</p>
                <h2>Add ingredient</h2>
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
                    onChange={(event) =>
                      setNewFood({ ...newFood, calories_per_unit: Number(event.target.value) })
                    }
                    type="number"
                    min="0"
                    step="0.1"
                    required
                  />
                </label>

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

              <label>
                <span>Unit</span>
                <select
                  value={newFood.unit_label}
                  onChange={(event) => setNewFood({ ...newFood, unit_label: event.target.value })}
                >
                  <option value="100g">100g</option>
                  <option value="serving">serving</option>
                  <option value="item">item</option>
                </select>
              </label>

              <button type="submit" disabled={isSaving}>
                {isSaving ? "Adding..." : "Add ingredient"}
              </button>
              <p className="form-message" role="status">
                {message}
              </p>
            </form>
          </section>
        ) : (
          <section className="tab-panel" role="tabpanel">
            <div className="section-header">
              <div>
                <p className="eyebrow">Calculated from ingredients</p>
                <h2>Meals</h2>
              </div>
              <div className="summary-row">
                <span>{recipes.length} meals</span>
                <span>{formatNumber(mealTotals.calories)} cal</span>
                <span>{formatNumber(mealTotals.protein)}g protein</span>
              </div>
            </div>

            <div className="meal-grid" aria-live="polite">
              {recipes.map((recipe) => (
                <article className="meal-card" key={recipe.id}>
                  <header>
                    <div>
                      <h3>{recipe.name}</h3>
                      <p>{recipe.target_plan || "No target set"}</p>
                    </div>
                    <span className="count-pill">{recipe.category || "Meal"}</span>
                  </header>

                  <div className="macro-row">
                    <div>
                      <span>Calories</span>
                      <strong>{formatNumber(recipe.calories)}</strong>
                    </div>
                    <div>
                      <span>Protein</span>
                      <strong>{formatNumber(recipe.protein)}g</strong>
                    </div>
                  </div>

                  <ul className="ingredient-list">
                    {recipe.ingredients.map((ingredient) => (
                      <li key={`${recipe.id}-${ingredient.food_id}`}>
                        {ingredient.food_name}: {formatNumber(ingredient.quantity)} units
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
