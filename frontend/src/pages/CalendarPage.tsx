import { useState } from "react";
import { ActionIcon, Button, Group, Paper, SegmentedControl, Select, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import { CalorieTargetCard } from "../components/CalorieTargetCard";
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
        <Paper className="panel calendar-panel" withBorder>
          <div className="section-header">
            <div>
              <Text className="eyebrow">{view === "today" ? "Today" : "Week starting Monday"}</Text>
              <Title order={2}>
                {view === "today" ? `${dayFormatter.format(selectedDate)}, ${dateFormatter.format(selectedDate)}` : weekRange}
              </Title>
            </div>
            <Group gap={8}>
              <SegmentedControl
                value={view}
                onChange={(value) => setView(value as "today" | "week")}
                data={[
                  { value: "today", label: "Today" },
                  { value: "week", label: "Week" }
                ]}
              />
            </Group>
          </div>

          {view === "today" ? (
            <div className="today-planner">
              <Group gap={8}>
                <ActionIcon
                  variant="default"
                  onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                  aria-label="Previous day"
                >
                  <IconChevronLeft size={18} />
                </ActionIcon>
                <Button variant="default" size="xs" type="button" onClick={() => setSelectedDate(new Date())}>
                  Today
                </Button>
                <ActionIcon
                  variant="default"
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  aria-label="Next day"
                >
                  <IconChevronRight size={18} />
                </ActionIcon>
              </Group>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
                {mealSlots.map((slot) => {
                  const recipeIds = selectedDayPlan[slot.id] || [];
                  return (
                    <div className="calendar-slot-group today-slot" key={slot.id}>
                      <Text c="dimmed" fw={900}>{slot.label}</Text>
                      <Stack gap={8}>
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
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="gray"
                                onClick={() => removeRecipe(selectedDateKey, slot.id, index)}
                                aria-label={`Remove ${recipe.name}`}
                              >
                                <IconX size={14} />
                              </ActionIcon>
                            </div>
                          );
                        })}
                      </Stack>
                      <Select
                        className="calendar-add"
                        placeholder="Add meal"
                        data={mealOptions}
                        searchable
                        value={null}
                        onChange={(value) => addRecipe(selectedDateKey, slot.id, value)}
                      />
                    </div>
                  );
                })}
              </SimpleGrid>
            </div>
          ) : (
            <>
              <Group gap={8} mb="md">
                <ActionIcon variant="default" onClick={() => setWeekOffset(weekOffset - 1)} aria-label="Previous week">
                  <IconChevronLeft size={18} />
                </ActionIcon>
                <Button variant="default" size="xs" type="button" onClick={() => setWeekOffset(0)}>
                  This week
                </Button>
                <ActionIcon variant="default" onClick={() => setWeekOffset(weekOffset + 1)} aria-label="Next week">
                  <IconChevronRight size={18} />
                </ActionIcon>
              </Group>

              <SimpleGrid cols={{ base: 1, xl: 7 }} spacing="sm">
                {weekDays.map((date) => {
                  const dateKey = toDateKey(date);
                  const dayPlan = mealPlan[dateKey] || {};
                  const dayCalories = getDateCalories(dayPlan, recipes);

                  return (
                    <Paper className="calendar-day overview" withBorder key={dateKey}>
                      <Group justify="space-between" align="start" wrap="nowrap">
                        <div>
                          <Text fw={900}>{dayFormatter.format(date)}</Text>
                          <Text c="dimmed" size="sm">{dateFormatter.format(date)}</Text>
                        </div>
                        <Text size="xs" fw={900}>{Math.round(dayCalories)} cal</Text>
                      </Group>

                      <Stack gap={10} mt={14}>
                        {mealSlots.map((slot) => {
                          const recipeIds = dayPlan[slot.id] || [];
                          return (
                            <div className="calendar-slot-group overview-slot" key={slot.id}>
                              <Text size="xs" c="dimmed" fw={900}>{slot.label}</Text>
                              {recipeIds.length === 0 ? <Text c="dimmed" size="xs">Empty</Text> : null}
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
                      </Stack>
                    </Paper>
                  );
                })}
              </SimpleGrid>
            </>
          )}
        </Paper>

        <Stack gap={20}>
          <CalorieTargetCard
            calories={view === "today" ? selectedDayCalories : dailyAverage}
            target={currentTdeeTarget}
            title={view === "today" ? "Selected day" : "Daily average"}
            subtitle={view === "today" ? "Planned calories for this date." : "Average planned calories across this week."}
          />

          <Paper className="panel" withBorder>
            <div className="section-header">
              <div>
                <Text className="eyebrow">Planning list</Text>
                <Title order={2}>Saved meals</Title>
              </div>
            </div>
            <Stack gap={8}>
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
                <Paper className="empty-state compact" withBorder>
                  <Text fw={700}>No meals to plan yet</Text>
                  <Text c="dimmed" size="sm">Create meals first, then use them in your calendar.</Text>
                </Paper>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
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
