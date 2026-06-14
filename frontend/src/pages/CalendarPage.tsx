import { useState } from "react";
import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import { CalorieTargetCard } from "../components/CalorieTargetCard";
import { Button, IconButton, Panel, SegmentedControl, SelectInput } from "../components/ui";
import { addDays, getMonday, mealSlots, toDateKey, type MealPlan, type MealSlot } from "../lib/planning";
import type { Recipe } from "../types";

type CalendarPageProps = {
  recipes: Recipe[];
  favoriteRecipeIds: string[];
  mealPlan: MealPlan;
  currentTdeeTarget: number | null;
  onMealPlanChange: (mealPlan: MealPlan) => void;
  onEditRecipe: (recipe: Recipe) => void;
};

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const dateFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

export function CalendarPage({
  recipes,
  favoriteRecipeIds,
  mealPlan,
  currentTdeeTarget,
  onMealPlanChange,
  onEditRecipe
}: CalendarPageProps) {
  const [view, setView] = useState<"today" | "week">("today");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDateKey = toDateKey(selectedDate);
  const selectedDayPlan = mealPlan[selectedDateKey] || {};
  const weekStart = addDays(getMonday(new Date()), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekRange = `${dateFormatter.format(weekDays[0])} - ${dateFormatter.format(weekDays[6])}`;
  const mealOptions = recipes.map((recipe) => ({ value: recipe.id, label: recipe.name }));

  const weekCalories = weekDays.reduce((sum, date) => sum + getDateCalories(mealPlan[toDateKey(date)], recipes), 0);
  const dailyAverage = weekCalories / 7;
  const selectedDayCalories = getDateCalories(selectedDayPlan, recipes);

  function addRecipe(dateKey: string, slot: MealSlot, recipeId: string | null) {
    if (!recipeId) {
      return;
    }

    const dayPlan = mealPlan[dateKey] || {};
    const slotRecipes = dayPlan[slot] || [];
    onMealPlanChange({
      ...mealPlan,
      [dateKey]: {
        ...dayPlan,
        [slot]: [...slotRecipes, recipeId]
      }
    });
  }

  function removeRecipe(dateKey: string, slot: MealSlot, index: number) {
    const dayPlan = mealPlan[dateKey] || {};
    const slotRecipes = (dayPlan[slot] || []).filter((_, recipeIndex) => recipeIndex !== index);
    onMealPlanChange({
      ...mealPlan,
      [dateKey]: {
        ...dayPlan,
        [slot]: slotRecipes
      }
    });
  }

  return (
    <section className="page-stack">
      <section className="calendar-shell">
        <Panel className="calendar-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">{view === "today" ? "Today" : "Week starting Monday"}</p>
              <h2>
                {view === "today" ? `${dayFormatter.format(selectedDate)}, ${dateFormatter.format(selectedDate)}` : weekRange}
              </h2>
            </div>
            <SegmentedControl
              value={view}
              onChange={(value) => setView(value as "today" | "week")}
              options={[
                { value: "today", label: "Today" },
                { value: "week", label: "Week" }
              ]}
            />
          </div>

          {view === "today" ? (
            <div className="today-planner">
              <div className="inline-actions">
                <IconButton label="Previous day" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
                  <IconChevronLeft size={18} />
                </IconButton>
                <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedDate(new Date())}>
                  Today
                </Button>
                <IconButton label="Next day" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                  <IconChevronRight size={18} />
                </IconButton>
              </div>

              <div className="slot-grid">
                {mealSlots.map((slot) => {
                  const recipeIds = selectedDayPlan[slot.id] || [];
                  return (
                    <div className="calendar-slot-group today-slot" key={slot.id}>
                      <span className="muted strong">{slot.label}</span>
                      <div className="list-stack">
                        {recipeIds.map((recipeId, index) => {
                          const recipe = recipes.find((item) => item.id === recipeId);
                          if (!recipe) {
                            return null;
                          }

                          return (
                            <div className="calendar-meal-pill large" key={`${recipeId}-${index}`}>
                              <button type="button" onClick={() => onEditRecipe(recipe)}>
                                <span>{recipe.name}</span>
                                <small>{Math.round(recipe.calories)} cal</small>
                              </button>
                              <IconButton
                                label={`Remove ${recipe.name}`}
                                variant="subtle"
                                onClick={() => removeRecipe(selectedDateKey, slot.id, index)}
                              >
                                <IconX size={14} />
                              </IconButton>
                            </div>
                          );
                        })}
                      </div>
                      <SelectInput
                        className="calendar-add"
                        placeholder="Add meal"
                        options={mealOptions}
                        value={null}
                        onChange={(value) => addRecipe(selectedDateKey, slot.id, value)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="inline-actions mb-16">
                <IconButton label="Previous week" onClick={() => setWeekOffset(weekOffset - 1)}>
                  <IconChevronLeft size={18} />
                </IconButton>
                <Button variant="secondary" size="sm" type="button" onClick={() => setWeekOffset(0)}>
                  This week
                </Button>
                <IconButton label="Next week" onClick={() => setWeekOffset(weekOffset + 1)}>
                  <IconChevronRight size={18} />
                </IconButton>
              </div>

              <div className="week-grid">
                {weekDays.map((date) => {
                  const dateKey = toDateKey(date);
                  const dayPlan = mealPlan[dateKey] || {};
                  const dayCalories = getDateCalories(dayPlan, recipes);

                  return (
                    <div className="calendar-day overview" key={dateKey}>
                      <div className="spread">
                        <div>
                          <strong>{dayFormatter.format(date)}</strong>
                          <p className="muted small">{dateFormatter.format(date)}</p>
                        </div>
                        <span className="small strong">{Math.round(dayCalories)} cal</span>
                      </div>

                      <div className="list-stack mt-16">
                        {mealSlots.map((slot) => {
                          const recipeIds = dayPlan[slot.id] || [];
                          return (
                            <div className="calendar-slot-group overview-slot" key={slot.id}>
                              <span className="muted small strong">{slot.label}</span>
                              {recipeIds.length === 0 ? <span className="muted small">Empty</span> : null}
                              {recipeIds.map((recipeId, index) => {
                                const recipe = recipes.find((item) => item.id === recipeId);
                                return recipe ? (
                                  <button
                                    className="calendar-readonly-meal"
                                    type="button"
                                    onClick={() => onEditRecipe(recipe)}
                                    key={`${recipeId}-${index}`}
                                  >
                                    {recipe.name}
                                  </button>
                                ) : null;
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Panel>

        <div className="right-panel-stack">
          <CalorieTargetCard
            calories={view === "today" ? selectedDayCalories : dailyAverage}
            target={currentTdeeTarget}
            title={view === "today" ? "Selected day" : "Daily average"}
            subtitle={view === "today" ? "Planned calories for this date." : "Average planned calories across this week."}
          />

          <Panel>
            <div className="section-header">
              <div>
                <p className="eyebrow">Planning list</p>
                <h2>Saved meals</h2>
              </div>
            </div>
            <div className="list-stack">
              {recipes
                .filter((recipe) => favoriteRecipeIds.includes(recipe.id))
                .concat(recipes.filter((recipe) => !favoriteRecipeIds.includes(recipe.id)))
                .slice(0, 8)
                .map((recipe) => (
                  <button className="planner-meal" type="button" onClick={() => onEditRecipe(recipe)} key={recipe.id}>
                    <span>{recipe.name}</span>
                    <small>{Math.round(recipe.calories)} cal</small>
                  </button>
                ))}
              {recipes.length === 0 ? (
                <div className="empty-state compact">
                  <strong>No meals to plan yet</strong>
                  <p className="muted small">Create meals first, then use them in your calendar.</p>
                </div>
              ) : null}
            </div>
          </Panel>
        </div>
      </section>
    </section>
  );
}

function getDateCalories(dayPlan: MealPlan[string] | undefined, recipes: Recipe[]) {
  if (!dayPlan) {
    return 0;
  }

  return mealSlots.reduce((sum, slot) => {
    const recipeIds = dayPlan[slot.id] || [];
    return sum + recipeIds.reduce((slotSum, recipeId) => slotSum + (recipes.find((recipe) => recipe.id === recipeId)?.calories || 0), 0);
  }, 0);
}
