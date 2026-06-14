import {
  IconArrowUpRight,
  IconCalendarTime,
  IconClock,
  IconPlus,
  IconSoup,
  IconToolsKitchen2
} from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { Badge, Button, Panel } from "../components/ui";
import { formatNumber, formatUnitBasis } from "../lib/format";
import { mealSlots, toDateKey, type MealPlan } from "../lib/planning";
import type { Route } from "../lib/routing";
import type { Food, Recipe } from "../types";

type HomePageProps = {
  foods: Food[];
  recipes: Recipe[];
  mealPlan: MealPlan;
  currentTdeeTarget: number | null;
  userName: string | null;
  onNavigate: (route: Route) => void;
  onEditFood: (food: Food) => void;
  onEditRecipe: (recipe: Recipe) => void;
};

export function HomePage({
  foods,
  recipes,
  mealPlan,
  currentTdeeTarget,
  userName,
  onNavigate,
  onEditFood,
  onEditRecipe
}: HomePageProps) {
  const totals = recipes.reduce(
    (sum, recipe) => ({
      calories: sum.calories + recipe.calories,
      protein: sum.protein + recipe.protein
    }),
    { calories: 0, protein: 0 }
  );
  const todayPlan = mealPlan[toDateKey(new Date())] || {};
  const todayMeals = mealSlots.flatMap((slot) =>
    (todayPlan[slot.id] || []).map((recipeId) => ({
      slot,
      recipe: recipes.find((item) => item.id === recipeId) || null
    }))
  ).filter((item) => item.recipe);
  const todayCalories = todayMeals.reduce((sum, item) => sum + (item.recipe?.calories || 0), 0);
  const targetProgress = currentTdeeTarget ? Math.min(99, Math.round((todayCalories / currentTdeeTarget) * 100)) : 0;
  const weekBars = [46, 66, 78, 92, 58, 72, 86];
  const nextMeal = todayMeals[0]?.recipe;

  return (
    <section className="donezo-dashboard">
      <section className="metric-grid">
        <MetricCard tone="primary" title="Total Ingredients" value={foods.length} note="Saved nutrition bases" onClick={() => onNavigate("ingredients")} />
        <MetricCard title="Saved Meals" value={recipes.length} note="Recipes ready to plan" onClick={() => onNavigate("meals")} />
        <MetricCard title="Planned Calories" value={formatNumber(todayCalories)} note={currentTdeeTarget ? `${formatNumber(currentTdeeTarget)} target` : "Set a nutrition target"} onClick={() => onNavigate("calendar")} />
        <MetricCard title="Saved Protein" value={`${formatNumber(totals.protein)}g`} note="Across all saved meals" onClick={() => onNavigate("favorites")} />
      </section>

      <section className="dashboard-mosaic">
        <Panel className="widget analytics-widget">
          <div className="section-header">
            <h3>Meal Analytics</h3>
            <Badge>Weekly</Badge>
          </div>
          <div className="bar-chart" aria-label="Weekly meal analytics">
            {weekBars.map((height, index) => (
              <div className={index === 1 || index === 3 ? "bar active" : index === 2 ? "bar mid" : "bar-striped"} key={index}>
                <span style={{ height: `${height}%` }} />
                <small>{"SMTWTFS"[index]}</small>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="widget reminder-widget">
          <h3>Next Meal</h3>
          <div className="meeting-card">
            <IconCalendarTime size={18} />
            <div>
              <strong>{nextMeal?.name || "No meals planned today"}</strong>
              <p>{nextMeal ? `${formatNumber(nextMeal.calories)} cal planned today` : "Open your calendar to add meals."}</p>
            </div>
          </div>
          <Button className="full-button" onClick={() => onNavigate("calendar")}>
            <IconSoup size={16} />
            Open Calendar
          </Button>
        </Panel>

        <Panel className="widget recipe-list-widget">
          <div className="section-header">
            <h3>Saved Meals</h3>
            <Button variant="secondary" size="sm" onClick={() => onNavigate("meals")}>
              <IconPlus size={14} />
              New
            </Button>
          </div>
          <div className="recipe-list">
            {recipes.slice(0, 5).map((recipe, index) => (
              <button type="button" onClick={() => onEditRecipe(recipe)} key={recipe.id}>
                <span className={`recipe-dot dot-${index % 5}`} />
                <span>
                  <strong>{recipe.name}</strong>
                  <small>{recipe.category || "Meal"} • {formatNumber(recipe.calories)} cal</small>
                </span>
              </button>
            ))}
            {recipes.length === 0 ? <EmptyMini title="No meals yet" body="Create a meal to populate this panel." /> : null}
          </div>
        </Panel>

        <Panel className="widget collaboration-widget">
          <div className="section-header">
            <h3>Ingredient Library</h3>
            <Button variant="secondary" size="sm" onClick={() => onNavigate("ingredients")}>Add Food</Button>
          </div>
          <div className="collab-list">
            {foods.slice(0, 4).map((food) => (
              <button type="button" onClick={() => onEditFood(food)} key={food.id}>
                <span className="mini-avatar">{food.name.slice(0, 1).toUpperCase()}</span>
                <span>
                  <strong>{food.name}</strong>
                  <small>{formatNumber(food.calories_per_unit)} cal • {formatNumber(food.protein_per_unit)}g protein</small>
                </span>
                <Badge className="status-cool">{formatUnitBasis(food.unit_label, food.unit_weight_g)}</Badge>
              </button>
            ))}
            {foods.length === 0 ? <EmptyMini title="No ingredients yet" body="Add foods to build your meal library." /> : null}
          </div>
        </Panel>

        <Panel className="widget progress-widget">
          <h3>Nutrition Progress</h3>
          <div className="progress-arc" style={{ "--progress": `${targetProgress}%` } as CSSProperties}>
            <strong>{targetProgress}%</strong>
            <span>Target Met</span>
          </div>
          <div className="legend-row">
            <span><i className="legend completed" /> Planned</span>
            <span><i className="legend pending" /> Remaining</span>
          </div>
        </Panel>

        <Panel className="widget schedule-widget">
          <div className="section-header">
            <h3>Today’s Plan</h3>
            <IconClock size={18} />
          </div>
          <div className="timeline-list">
            {mealSlots.map((slot, index) => {
              const slotRecipes = (todayPlan[slot.id] || [])
                .map((recipeId) => recipes.find((recipe) => recipe.id === recipeId))
                .filter(Boolean) as Recipe[];
              return (
                <div className="timeline-item" key={slot.id}>
                  <span className={slotRecipes.length ? "timeline-dot done" : "timeline-dot"} />
                  <div>
                    <small>{index + 8}:00 - {index + 9}:00</small>
                    <strong>{slotRecipes[0]?.name || slot.label}</strong>
                    <p>{slotRecipes.length ? `${slotRecipes.length} planned meal${slotRecipes.length > 1 ? "s" : ""}` : "Open slot"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </section>
    </section>
  );
}

function MetricCard({ title, value, note, tone, onClick }: {
  title: string;
  value: string | number;
  note: string;
  tone?: "primary";
  onClick: () => void;
}) {
  return (
    <button className={tone === "primary" ? "metric-card primary" : "metric-card"} type="button" onClick={onClick}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>
        <IconToolsKitchen2 size={12} />
        {note}
      </small>
      <i>
        <IconArrowUpRight size={18} />
      </i>
    </button>
  );
}

function EmptyMini({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-mini">
      <strong>{title}</strong>
      <small>{body}</small>
    </div>
  );
}
