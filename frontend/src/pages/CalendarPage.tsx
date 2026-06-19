import type { ReactNode, TouchEvent } from "react";
import { useRef, useState } from "react";
import Draggable from "react-draggable";
import { IconCalendarEvent, IconChevronLeft, IconChevronRight, IconGripVertical, IconPlus, IconX } from "@tabler/icons-react";
import { CalorieTargetCard } from "../components/CalorieTargetCard";
import { Button, IconButton, MobileEditor, MobileFab, NumericInput, Panel, SegmentedControl, SelectInput, TextInput } from "../components/ui";
import {
  addDays,
  getMonday,
  getPlannedPortion,
  getPlannedRecipeId,
  mealSlots,
  toDateKey,
  type MealPlan,
  type MealSlot
} from "../lib/planning";
import { formatNumber } from "../lib/format";
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
  mealPlan,
  currentTdeeTarget,
  onMealPlanChange,
  onEditRecipe
}: CalendarPageProps) {
  const [view, setView] = useState<"today" | "week">("today");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isMobileAddOpen, setIsMobileAddOpen] = useState(false);
  const [mobileSlot, setMobileSlot] = useState<MealSlot>("breakfast");
  const selectedDateKey = toDateKey(selectedDate);
  const selectedDayPlan = mealPlan[selectedDateKey] || {};
  const weekStart = addDays(getMonday(new Date()), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekRange = `${dateFormatter.format(weekDays[0])} - ${dateFormatter.format(weekDays[6])}`;

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
        [slot]: [...slotRecipes, { recipeId, portion_g: recipes.find((recipe) => recipe.id === recipeId)?.total_weight_g || 100 }]
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

  function updatePortion(dateKey: string, slot: MealSlot, index: number, portion_g: number) {
    const dayPlan = mealPlan[dateKey] || {};
    const slotRecipes = dayPlan[slot] || [];
    const nextSlotRecipes = slotRecipes.map((entry, recipeIndex) => {
      if (recipeIndex !== index) {
        return entry;
      }

      return {
        recipeId: getPlannedRecipeId(entry),
        portion_g
      };
    });

    onMealPlanChange({
      ...mealPlan,
      [dateKey]: {
        ...dayPlan,
        [slot]: nextSlotRecipes
      }
    });
  }

  function moveRecipe(dateKey: string, fromSlot: MealSlot, index: number, toSlot: MealSlot) {
    if (fromSlot === toSlot) {
      return;
    }

    const dayPlan = mealPlan[dateKey] || {};
    const sourceMeals = [...(dayPlan[fromSlot] || [])];
    const [movedMeal] = sourceMeals.splice(index, 1);
    if (!movedMeal) {
      return;
    }

    onMealPlanChange({
      ...mealPlan,
      [dateKey]: {
        ...dayPlan,
        [fromSlot]: sourceMeals,
        [toSlot]: [...(dayPlan[toSlot] || []), movedMeal]
      }
    });
  }

  function handlePlannerTouchStart(event: TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest("button, input, [role='button'], .calendar-meal-drag-handle")
    ) {
      setTouchStartX(null);
      return;
    }

    setTouchStartX(event.touches[0].clientX);
  }

  function handlePlannerTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStartX === null) {
      return;
    }

    const deltaX = event.changedTouches[0].clientX - touchStartX;
    setTouchStartX(null);

    if (Math.abs(deltaX) < 60) {
      return;
    }

    setSelectedDate(addDays(selectedDate, deltaX > 0 ? -1 : 1));
  }

  function handleDatePick(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) {
      return;
    }

    setSelectedDate(new Date(year, month - 1, day));
    setView("today");
  }

  return (
    <section className="page-stack">
      <section className="calendar-shell">
        <Panel className="calendar-panel">
          <CalorieTargetCard
            calories={view === "today" ? selectedDayCalories : dailyAverage}
            target={currentTdeeTarget}
            title={view === "today" ? "Selected day" : "Daily average"}
            subtitle={view === "today" ? "Planned calories for this date." : "Average planned calories across this week."}
          />
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
            <div
              className="today-planner"
              onTouchStart={handlePlannerTouchStart}
              onTouchEnd={handlePlannerTouchEnd}
            >
              <div className="inline-actions">
                <IconButton label="Previous day" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
                  <IconChevronLeft size={18} />
                </IconButton>
                <Button variant="secondary" size="sm" type="button" onClick={() => setSelectedDate(new Date())}>
                  Today
                </Button>
                <DatePickerButton value={selectedDateKey} onChange={handleDatePick} />
                <IconButton label="Next day" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                  <IconChevronRight size={18} />
                </IconButton>
              </div>

              <div className="slot-grid">
                {mealSlots.map((slot) => {
                  const plannedMeals = selectedDayPlan[slot.id] || [];
                  return (
                    <div className="calendar-slot-group today-slot" data-calendar-slot={slot.id} key={slot.id}>
                      <span className="muted strong">{slot.label}</span>
                      <div className="list-stack">
                        {plannedMeals.map((entry, index) => {
                          const recipeId = getPlannedRecipeId(entry);
                          const recipe = recipes.find((item) => item.id === recipeId);
                          if (!recipe) {
                            return null;
                          }

                          const portion = getPlannedPortion(entry, recipe.total_weight_g || 100);
                          const totalWeight = recipe.total_weight_g || 0;
                          const portionCalories = getRecipePortionValue(recipe.calories, totalWeight, portion);
                          const portionProtein = getRecipePortionValue(recipe.protein, totalWeight, portion);

                          return (
                            <DraggableMeal
                              key={`${recipeId}-${index}`}
                              onDrop={(clientX, clientY) => {
                                const target = Array.from(
                                  document.querySelectorAll<HTMLElement>("[data-calendar-slot]")
                                ).find((element) => {
                                  const bounds = element.getBoundingClientRect();
                                  return clientX >= bounds.left && clientX <= bounds.right && clientY >= bounds.top && clientY <= bounds.bottom;
                                })?.dataset.calendarSlot as MealSlot | undefined;
                                if (target) {
                                  moveRecipe(selectedDateKey, slot.id, index, target);
                                }
                              }}
                            >
                              <div className="calendar-meal-pill large">
                              <span className="calendar-meal-drag-handle" aria-label={`Move ${recipe.name}`} title="Drag to another meal slot">
                                <IconGripVertical aria-hidden="true" size={18} />
                              </span>
                              <button type="button" onClick={() => onEditRecipe(recipe)}>
                                <span>{recipe.name}</span>
                                <small className="calendar-meal-nutrition">
                                  <span>{formatNumber(portionCalories)} cal</span>
                                  <span>{formatNumber(portionProtein)}g protein</span>
                                </small>
                              </button>
                              <NumericInput
                                className="calendar-portion-input"
                                label="Portion (g)"
                                value={portion}
                                min={0}
                                step={0.1}
                                onChange={(value) => updatePortion(selectedDateKey, slot.id, index, value)}
                              />
                              <IconButton
                                label={`Remove ${recipe.name}`}
                                variant="subtle"
                                onClick={() => removeRecipe(selectedDateKey, slot.id, index)}
                              >
                                <IconX size={14} />
                              </IconButton>
                              </div>
                            </DraggableMeal>
                          );
                        })}
                      </div>
                      <CalendarMealSearch
                        recipes={recipes}
                        onAdd={(recipeId) => addRecipe(selectedDateKey, slot.id, recipeId)}
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
                <DatePickerButton value={selectedDateKey} onChange={handleDatePick} />
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
                          const plannedMeals = dayPlan[slot.id] || [];
                          return (
                            <div className="calendar-slot-group overview-slot" key={slot.id}>
                              <span className="muted small strong">{slot.label}</span>
                              {plannedMeals.length === 0 ? <span className="muted small">Empty</span> : null}
                              {plannedMeals.map((entry, index) => {
                                const recipeId = getPlannedRecipeId(entry);
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

      </section>
      <MobileFab label="Add meal to calendar" onClick={() => setIsMobileAddOpen(true)} />
      <MobileEditor
        open={isMobileAddOpen}
        label={`Add to ${dayFormatter.format(selectedDate)}, ${dateFormatter.format(selectedDate)}`}
        mobileOnly
        onClose={() => setIsMobileAddOpen(false)}
      >
        <Panel className="mobile-calendar-add-panel">
          <SelectInput
            label="Meal slot"
            value={mobileSlot}
            options={mealSlots.map((slot) => ({ value: slot.id, label: slot.label }))}
            onChange={(value) => setMobileSlot((value || "breakfast") as MealSlot)}
          />
          <CalendarMealSearch
            recipes={recipes}
            onAdd={(recipeId) => {
              addRecipe(selectedDateKey, mobileSlot, recipeId);
              setIsMobileAddOpen(false);
            }}
          />
        </Panel>
      </MobileEditor>
    </section>
  );
}

function DraggableMeal({ children, onDrop }: { children: ReactNode; onDrop: (clientX: number, clientY: number) => void }) {
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".calendar-meal-drag-handle"
      position={{ x: 0, y: 0 }}
      onStop={(event) => {
        const touchEvent = event as unknown as globalThis.TouchEvent;
        const point = touchEvent.changedTouches?.[0] || (event as MouseEvent);
        onDrop(point.clientX, point.clientY);
      }}
    >
      <div className="draggable-calendar-meal" ref={nodeRef}>{children}</div>
    </Draggable>
  );
}

function DatePickerButton({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="date-picker-button">
      <IconCalendarEvent aria-hidden="true" size={18} />
      <span>Pick date</span>
      <input
        type="date"
        value={value}
        aria-label="Pick a calendar date"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CalendarMealSearch({ recipes, onAdd }: { recipes: Recipe[]; onAdd: (recipeId: string) => void }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const matches = query
    ? recipes.filter((recipe) =>
        recipe.name.toLowerCase().includes(query) ||
        (recipe.category || "").toLowerCase().includes(query) ||
        recipe.ingredients.some((ingredient) => ingredient.food_name.toLowerCase().includes(query))
      )
    : [];
  const visibleMatches = matches.slice(0, 6);

  function handleAdd(recipeId: string) {
    onAdd(recipeId);
    setSearch("");
  }

  return (
    <div className="calendar-add">
      <TextInput
        className="calendar-meal-search"
        label="Search meals"
        value={search}
        onChange={setSearch}
        placeholder="Search name, category, or ingredient"
      />
      {query ? (
        <div className="calendar-add-results">
        {visibleMatches.map((recipe) => (
          <button className="calendar-add-option" type="button" onClick={() => handleAdd(recipe.id)} key={recipe.id}>
            <span>
              <strong>{recipe.name}</strong>
              <small>{formatNumber(recipe.calories)} cal - {formatNumber(recipe.protein)}g protein</small>
            </span>
            <IconPlus size={16} />
          </button>
        ))}
        {recipes.length === 0 ? <span className="muted small">Create meals before planning.</span> : null}
        {recipes.length > 0 && visibleMatches.length === 0 ? <span className="muted small">No meals match that search.</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function getDateCalories(dayPlan: MealPlan[string] | undefined, recipes: Recipe[]) {
  if (!dayPlan) {
    return 0;
  }

  return mealSlots.reduce((sum, slot) => {
    const plannedMeals = dayPlan[slot.id] || [];
    return sum + plannedMeals.reduce((slotSum, entry) => {
      const recipe = recipes.find((item) => item.id === getPlannedRecipeId(entry));
      if (!recipe) {
        return slotSum;
      }

      const portion = getPlannedPortion(entry, recipe.total_weight_g || 100);
      return slotSum + getRecipePortionValue(recipe.calories, recipe.total_weight_g || 0, portion);
    }, 0);
  }, 0);
}

function getRecipePortionValue(value: number, totalWeight: number, portionWeight: number) {
  if (!totalWeight || totalWeight <= 0) {
    return value;
  }

  return value * (portionWeight / totalWeight);
}
