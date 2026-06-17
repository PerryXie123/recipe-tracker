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
import {
  addDays,
  getMonday,
  getPlannedPortion,
  getPlannedRecipeId,
  mealSlots,
  toDateKey,
  type MealPlan
} from "../lib/planning";
import type { Route } from "../lib/routing";
import type { Food, Recipe } from "../types";

type HomePageProps = {
  foods: Food[];
  recipes: Recipe[];
  mealPlan: MealPlan;
  currentTdeeTarget: number | null;
  currentProteinTarget: number | null;
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
  currentProteinTarget,
  userName,
  onNavigate,
  onEditFood,
  onEditRecipe
}: HomePageProps) {
  const todayPlan = mealPlan[toDateKey(new Date())] || {};
  const todayMeals = mealSlots.flatMap((slot) =>
    (todayPlan[slot.id] || []).map((entry) => {
      const recipe = recipes.find((item) => item.id === getPlannedRecipeId(entry)) || null;
      const portion = recipe ? getPlannedPortion(entry, recipe.total_weight_g || 100) : 0;
      return {
        slot,
        recipe,
        calories: recipe ? getRecipePortionValue(recipe.calories, recipe.total_weight_g || 0, portion) : 0,
        protein: recipe ? getRecipePortionValue(recipe.protein, recipe.total_weight_g || 0, portion) : 0
      };
    })
  ).filter((item) => item.recipe);
  const todayCalories = todayMeals.reduce((sum, item) => sum + item.calories, 0);
  const todayProtein = todayMeals.reduce((sum, item) => sum + item.protein, 0);
  const targetProgress = currentTdeeTarget ? Math.min(100, Math.round((todayCalories / currentTdeeTarget) * 100)) : 0;
  const weekStart = getMonday(new Date());
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weeklyTotals = weekDays.map((date) => getDateTotals(mealPlan[toDateKey(date)], recipes));
  const weeklyCalories = weeklyTotals.map((total) => total.calories);
  const weeklyProtein = weeklyTotals.map((total) => total.protein);
  const nextMeal = todayMeals[0]?.recipe;

  return (
    <section className="donezo-dashboard">
      <section className="metric-grid">
        <MetricCard tone="primary" title="Total Ingredients" value={foods.length} note="Saved nutrition bases" onClick={() => onNavigate("ingredients")} />
        <MetricCard title="Saved Meals" value={recipes.length} note="Recipes ready to plan" onClick={() => onNavigate("meals")} />
        <MetricCard title="Planned Calories" value={formatNumber(todayCalories)} note={currentTdeeTarget ? `${formatNumber(currentTdeeTarget)} target` : "Set a nutrition target"} onClick={() => onNavigate("calendar")} />
        <MetricCard title="Planned Protein" value={`${formatNumber(todayProtein)}g`} note={currentProteinTarget ? `${formatNumber(currentProteinTarget)}g target` : "Set a protein target"} onClick={() => onNavigate("tdee")} />
      </section>

      <section className="dashboard-mosaic">
        <WeeklyMetricChart
          className="analytics-calories-widget"
          title="Calories Analytics"
          unit="cal"
          values={weeklyCalories}
          weekDays={weekDays}
          target={currentTdeeTarget}
        />

        <WeeklyMetricChart
          className="analytics-protein-widget"
          title="Protein Analytics"
          unit="g"
          values={weeklyProtein}
          weekDays={weekDays}
          target={currentProteinTarget}
        />

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
              Add
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
            <Button variant="secondary" size="sm" onClick={() => onNavigate("ingredients")}>
              <IconPlus size={14} />
              Add
            </Button>
          </div>
          <div className="collab-list">
            {foods.slice(0, 4).map((food, index) => (
              <button type="button" onClick={() => onEditFood(food)} key={food.id}>
                <span className={`recipe-dot dot-${index % 5}`} />
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
            {mealSlots.map((slot) => {
              const slotRecipes = (todayPlan[slot.id] || [])
                .map((entry) => recipes.find((recipe) => recipe.id === getPlannedRecipeId(entry)))
                .filter(Boolean) as Recipe[];
              return (
                <div className="timeline-item" key={slot.id}>
                  <span className={slotRecipes.length ? "timeline-dot done" : "timeline-dot"} />
                  <div>
                    <small>{slot.label}</small>
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

function WeeklyMetricChart({
  className,
  title,
  unit,
  values,
  weekDays,
  target
}: {
  className: string;
  title: string;
  unit: string;
  values: number[];
  weekDays: Date[];
  target: number | null;
}) {
  const chartMax = Math.max(target || 0, ...values, 1);
  const goalLineOffset = target ? 164 * (Math.max(0, 100 - (target / chartMax) * 100) / 100) : 0;

  return (
    <Panel className={`widget analytics-widget ${className}`}>
      <div className="section-header">
        <h3>{title}</h3>
        <Badge>Weekly</Badge>
      </div>
      <div className="bar-chart" aria-label={`${title} this week`}>
        {target ? (
          <div
            className="goal-line"
            style={{ "--goal-line-offset": `${goalLineOffset}px` } as CSSProperties}
            aria-label={`${formatNumber(target)} ${unit} goal`}
          />
        ) : null}
        {values.map((value, index) => {
          const height = chartMax ? Math.max(value > 0 ? 6 : 0, (value / chartMax) * 100) : 0;
          const isToday = toDateKey(weekDays[index]) === toDateKey(new Date());
          return (
            <div className={isToday ? "bar active" : value > 0 ? "bar mid" : "bar-striped"} key={toDateKey(weekDays[index])}>
              <span style={{ height: `${height}%` }} title={`${formatNumber(value)} ${unit} planned`} />
              <strong>{formatNumber(value)}</strong>
              <small>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</small>
            </div>
          );
        })}
      </div>
    </Panel>
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

function getDateTotals(dayPlan: MealPlan[string] | undefined, recipes: Recipe[]) {
  if (!dayPlan) {
    return { calories: 0, protein: 0 };
  }

  return mealSlots.reduce((sum, slot) => {
    const plannedMeals = dayPlan[slot.id] || [];
    return plannedMeals.reduce((slotSum, entry) => {
      const recipe = recipes.find((item) => item.id === getPlannedRecipeId(entry));
      if (!recipe) {
        return slotSum;
      }

      const portion = getPlannedPortion(entry, recipe.total_weight_g || 100);
      return {
        calories: slotSum.calories + getRecipePortionValue(recipe.calories, recipe.total_weight_g || 0, portion),
        protein: slotSum.protein + getRecipePortionValue(recipe.protein, recipe.total_weight_g || 0, portion)
      };
    }, sum);
  }, { calories: 0, protein: 0 });
}

function getRecipePortionValue(value: number, totalWeight: number, portionWeight: number) {
  if (!totalWeight || totalWeight <= 0) {
    return value;
  }

  return value * (portionWeight / totalWeight);
}
