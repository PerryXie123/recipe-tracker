import { Badge, Button, Card, Group, Paper, SimpleGrid, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { formatNumber } from "../lib/format";
import type { Food, Recipe } from "../types";

type HomePageProps = {
  foods: Food[];
  recipes: Recipe[];
  onNavigate: (route: "ingredients" | "meals") => void;
  onEditFood: (food: Food) => void;
  onEditRecipe: (recipe: Recipe) => void;
};

export function HomePage({ foods, recipes, onNavigate, onEditFood, onEditRecipe }: HomePageProps) {
  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <Text className="eyebrow">Overview</Text>
          <Title order={1}>Recipe Tracker</Title>
        </div>
        <Group gap="sm">
          <Button type="button" onClick={() => onNavigate("meals")}>
            Add meal
          </Button>
          <Button variant="default" type="button" onClick={() => onNavigate("ingredients")}>
            Add ingredient
          </Button>
        </Group>
      </header>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card className="stat-card mint" withBorder>
          <Text c="dimmed" size="sm" fw={700}>Ingredients</Text>
          <Title order={2}>{foods.length}</Title>
        </Card>
        <Card className="stat-card blue" withBorder>
          <Text c="dimmed" size="sm" fw={700}>Meals</Text>
          <Title order={2}>{recipes.length}</Title>
        </Card>
      </SimpleGrid>

      <section className="home-grid">
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
            {foods.slice(0, 5).map((food) => (
              <UnstyledButton className="mini-row" type="button" onClick={() => onEditFood(food)} key={food.id}>
                <span>{food.name}</span>
                <Badge variant="light">{formatNumber(food.calories_per_unit)} cal</Badge>
              </UnstyledButton>
            ))}
          </Stack>
        </Paper>

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
            {recipes.slice(0, 5).map((recipe) => (
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
