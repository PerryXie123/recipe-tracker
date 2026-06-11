import { useEffect, useMemo, useState } from "react";
import { Badge, Paper, Text, TextInput, Title } from "@mantine/core";
import { MealCard } from "../components/MealCard";
import { Pagination } from "../components/Pagination";
import { paginate } from "../lib/pagination";
import type { Recipe } from "../types";

const FAVORITES_PER_PAGE = 12;

type FavoritesPageProps = {
  recipes: Recipe[];
  favoriteRecipeIds: string[];
  portionWeights: Record<string, number>;
  onPortionWeightsChange: (weights: Record<string, number>) => void;
  getPortionTotals: (recipe: Recipe) => { weight: number; calories: number; kj: number; protein: number };
  onEdit: (recipe: Recipe) => void;
  onFavoriteToggle: (recipeId: string) => void;
};

export function FavoritesPage({
  recipes,
  favoriteRecipeIds,
  portionWeights,
  onPortionWeightsChange,
  getPortionTotals,
  onEdit,
  onFavoriteToggle
}: FavoritesPageProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, favoriteRecipeIds.length]);

  const favoriteRecipes = useMemo(
    () => recipes.filter((recipe) => favoriteRecipeIds.includes(recipe.id)),
    [favoriteRecipeIds, recipes]
  );

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return favoriteRecipes;
    }

    return favoriteRecipes.filter((recipe) => {
      const ingredientMatch = recipe.ingredients.some((ingredient) =>
        ingredient.food_name.toLowerCase().includes(query)
      );
      return recipe.name.toLowerCase().includes(query) || (recipe.category || "").toLowerCase().includes(query) || ingredientMatch;
    });
  }, [favoriteRecipes, search]);

  const visibleRecipes = paginate(filteredRecipes, page, FAVORITES_PER_PAGE);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <Text className="eyebrow">Favorites</Text>
          <Title order={1}>Favorites</Title>
        </div>
        <Badge variant="light">{filteredRecipes.length} saved</Badge>
      </header>

      <Paper className="panel" withBorder>
        <div className="toolbar">
          <TextInput
            className="search-field"
            label="Search favorites"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, category, or ingredient"
          />
        </div>

        {filteredRecipes.length === 0 ? (
          <Paper className="empty-state" withBorder>
            <Text fw={700}>No favorite meals yet</Text>
            <Text c="dimmed" size="sm">Use the star on a meal card to add it here.</Text>
          </Paper>
        ) : (
          <div className="meal-grid" aria-live="polite">
            {visibleRecipes.items.map((recipe) => (
              <MealCard
                recipe={recipe}
                selected={false}
                checked={false}
                selectable={false}
                isFavorite
                portionTotals={getPortionTotals(recipe)}
                onSelect={onEdit}
                onCheckedChange={() => undefined}
                onPortionChange={(weight) => onPortionWeightsChange({ ...portionWeights, [recipe.id]: weight })}
                onFavoriteToggle={() => onFavoriteToggle(recipe.id)}
                key={recipe.id}
              />
            ))}
          </div>
        )}

        <Pagination
          page={visibleRecipes.page}
          pageCount={visibleRecipes.pageCount}
          onPrevious={() => setPage(visibleRecipes.page - 1)}
          onNext={() => setPage(visibleRecipes.page + 1)}
        />
      </Paper>
    </section>
  );
}
