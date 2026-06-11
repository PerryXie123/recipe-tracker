import { ActionIcon, Badge, Checkbox, Group, NumberInput, Paper, SimpleGrid, Text, Title, Tooltip } from "@mantine/core";
import { IconStar } from "@tabler/icons-react";
import { formatNumber } from "../lib/format";
import type { Recipe } from "../types";

type MealCardProps = {
  recipe: Recipe;
  selected: boolean;
  checked: boolean;
  selectable?: boolean;
  isFavorite: boolean;
  portionTotals: {
    weight: number;
    calories: number;
    kj: number;
    protein: number;
  };
  onSelect: (recipe: Recipe) => void;
  onCheckedChange: (checked: boolean) => void;
  onPortionChange: (weight: number) => void;
  onFavoriteToggle: () => void;
};

export function MealCard({
  recipe,
  selected,
  checked,
  selectable = true,
  isFavorite,
  portionTotals,
  onSelect,
  onCheckedChange,
  onPortionChange,
  onFavoriteToggle
}: MealCardProps) {
  return (
    <Paper
      component="button"
      type="button"
      className={selected ? "meal-card selected" : "meal-card"}
      withBorder
      onClick={() => onSelect(recipe)}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Title order={3}>{recipe.name}</Title>
          <Text c="dimmed" size="sm">
            {formatNumber(recipe.total_weight_g || 0)}g total weight
          </Text>
        </div>
        <Group gap={6} wrap="nowrap">
          <Tooltip label={isFavorite ? "Remove favorite" : "Favorite meal"}>
            <ActionIcon
              color="yellow"
              variant={isFavorite ? "filled" : "subtle"}
              type="button"
              aria-label={isFavorite ? `Remove ${recipe.name} from favorites` : `Add ${recipe.name} to favorites`}
              aria-pressed={isFavorite}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onFavoriteToggle();
              }}
            >
              <IconStar size={16} fill={isFavorite ? "currentColor" : "none"} />
            </ActionIcon>
          </Tooltip>
          {selectable ? (
            <Checkbox
              checked={checked}
              aria-label={`Select ${recipe.name}`}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onCheckedChange(event.currentTarget.checked)}
            />
          ) : null}
        </Group>
      </Group>

      <Group gap={8}>
        <Badge variant="light">{recipe.category || "Meal"}</Badge>
        <Badge variant="default">{formatNumber(recipe.calories)} cal</Badge>
        <Badge variant="default">{formatNumber(recipe.protein)}g protein</Badge>
      </Group>

      <div
        className="card-portion"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <NumberInput
          label="Portion (g)"
          value={portionTotals.weight}
          onChange={(value) => onPortionChange(Number(value))}
          min={0}
          step={0.1}
          size="xs"
        />
        <SimpleGrid cols={2} spacing={8}>
          <Paper className="card-portion-metric" withBorder>
            <Text c="dimmed" size="xs" fw={700}>Calories</Text>
            <Text fw={800}>{formatNumber(portionTotals.calories)}</Text>
          </Paper>
          <Paper className="card-portion-metric" withBorder>
            <Text c="dimmed" size="xs" fw={700}>Protein</Text>
            <Text fw={800}>{formatNumber(portionTotals.protein)}g</Text>
          </Paper>
        </SimpleGrid>
      </div>
    </Paper>
  );
}
