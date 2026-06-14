import { Badge, Button, Card, Group, Paper, SimpleGrid, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { CalorieTargetCard } from "../components/CalorieTargetCard";
import { formatNumber } from "../lib/format";
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
  const todayCalories = mealSlots.reduce((sum, slot) => {
    const recipeIds = todayPlan[slot.id] || [];
    return sum + recipeIds.reduce((slotSum, recipeId) => slotSum + (recipes.find((recipe) => recipe.id === recipeId)?.calories || 0), 0);
  }, 0);
  const greeting = getGreeting();
  const firstName = getFirstName(userName);
  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(new Date());

  return (
    <section className="page-stack">
      <Paper className="dashboard-welcome" withBorder>
        <div className="dashboard-welcome-copy">
          <Text className="eyebrow">Dashboard</Text>
          <Title order={1} className="dashboard-title">
            {greeting}
            {firstName ? (
              <>
                , <span>{firstName}</span>
              </>
            ) : null}
          </Title>
          <Text className="dashboard-subtitle">Your meals, ingredients, and daily target in one place.</Text>
        </div>

        <div className="dashboard-today-card">
          <Group justify="space-between" align="start" gap="md">
            <div>
              <Text className="eyebrow">Today</Text>
              <Title order={3}>{todayLabel}</Title>
            </div>
            <div className="dashboard-calorie-chip">
              <strong>{formatNumber(todayCalories)}</strong>
              <span>cal planned</span>
            </div>
          </Group>
          <Text c="dimmed" size="sm" mt={10}>
            {currentTdeeTarget ? `${formatNumber(currentTdeeTarget)} calorie daily target` : "Set a TDEE target to compare your day."}
          </Text>
          <Group gap="sm" mt="md">
            <Button type="button" onClick={() => onNavigate("calendar")}>
              Open calendar
            </Button>
            <Button variant="default" type="button" onClick={() => onNavigate("meals")}>
              Add meal
            </Button>
          </Group>
        </div>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <Card className="stat-card mint" withBorder>
          <Text c="dimmed" size="sm" fw={700}>Ingredients</Text>
          <Title order={2}>{foods.length}</Title>
        </Card>
        <Card className="stat-card blue" withBorder>
          <Text c="dimmed" size="sm" fw={700}>Meals</Text>
          <Title order={2}>{recipes.length}</Title>
        </Card>
        <Card className="stat-card lavender" withBorder>
          <Text c="dimmed" size="sm" fw={700}>Saved calories</Text>
          <Title order={2}>{formatNumber(totals.calories)}</Title>
        </Card>
        <Card className="stat-card rose" withBorder>
          <Text c="dimmed" size="sm" fw={700}>Saved protein</Text>
          <Title order={2}>{formatNumber(totals.protein)}g</Title>
        </Card>
      </SimpleGrid>

      <section className="dashboard-grid">
        <CalorieTargetCard
          calories={todayCalories}
          target={currentTdeeTarget}
          title="Today"
          subtitle="Planned calories from your calendar."
        />

        <Paper className="panel" withBorder>
          <div className="section-header">
            <div>
              <Text className="eyebrow">Ingredients</Text>
              <Title order={2}>Recent</Title>
            </div>
            <Button variant="subtle" size="xs" type="button" onClick={() => onNavigate("ingredients")}>
              View all
            </Button>
          </div>
          <Stack gap={8}>
            {foods.length === 0 ? (
              <Paper className="empty-state compact" withBorder>
                <Text fw={700}>No ingredients yet</Text>
                <Text c="dimmed" size="sm">Add your first ingredient to start building meals.</Text>
              </Paper>
            ) : foods.slice(0, 5).map((food) => (
              <UnstyledButton className="mini-row" type="button" onClick={() => onEditFood(food)} key={food.id}>
                <span>{food.name}</span>
                <Badge variant="light">{formatNumber(food.calories_per_unit)} cal</Badge>
              </UnstyledButton>
            ))}
          </Stack>
        </Paper>
      </section>

      <section className="home-grid">
        <Paper className="panel" withBorder>
          <div className="section-header">
            <div>
              <Text className="eyebrow">Meals</Text>
              <Title order={2}>Recent</Title>
            </div>
            <Button variant="subtle" size="xs" type="button" onClick={() => onNavigate("meals")}>
              View all
            </Button>
          </div>
          <Stack gap={8}>
            {recipes.length === 0 ? (
              <Paper className="empty-state compact" withBorder>
                <Text fw={700}>No meals yet</Text>
                <Text c="dimmed" size="sm">Create a meal from your saved ingredients.</Text>
              </Paper>
            ) : recipes.slice(0, 5).map((recipe) => (
              <UnstyledButton className="mini-row" type="button" onClick={() => onEditRecipe(recipe)} key={recipe.id}>
                <span>{recipe.name}</span>
                <Badge variant="light">{formatNumber(recipe.total_weight_g || 0)}g</Badge>
              </UnstyledButton>
            ))}
          </Stack>
        </Paper>
      </section>
    </section>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

function getFirstName(name: string | null) {
  if (!name) {
    return "";
  }
  return name.trim().split(/\s+/)[0] || "";
}
