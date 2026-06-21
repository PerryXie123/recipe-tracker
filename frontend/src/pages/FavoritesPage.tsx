import { useEffect, useMemo, useState } from "react";
import { MealCard } from "../components/MealCard";
import { MealGridSkeleton } from "../components/Skeletons";
import { Pagination } from "../components/Pagination";
import { Panel, SelectInput, TextInput } from "../components/ui";
import { paginate } from "../lib/pagination";
import { librarySortOptions, sortLibraryItems, type LibrarySort } from "../lib/sorting";
import type { Recipe } from "../types";

const FAVOURITES_PER_PAGE = 12;

type FavoritesPageProps = {
  recipes: Recipe[];
  favoriteRecipeIds: string[];
  portionWeights: Record<string, number>;
  onPortionWeightsChange: (weights: Record<string, number>) => void;
  getPortionTotals: (recipe: Recipe) => { weight: number; calories: number; kj: number; protein: number };
  onEdit: (recipe: Recipe) => void;
  onFavoriteToggle: (recipeId: string) => void;
  isLoading?: boolean;
};

export function FavoritesPage({
  recipes,
  favoriteRecipeIds,
  portionWeights,
  onPortionWeightsChange,
  getPortionTotals,
  onEdit,
  onFavoriteToggle,
  isLoading = false
}: FavoritesPageProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<LibrarySort>("name-asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, sort, favoriteRecipeIds.length]);

  const favoriteRecipes = useMemo(
    () => recipes.filter((recipe) => favoriteRecipeIds.includes(recipe.id)),
    [favoriteRecipeIds, recipes]
  );

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query ? favoriteRecipes.filter((recipe) => {
      const ingredientMatch = recipe.ingredients.some((ingredient) =>
        ingredient.food_name.toLowerCase().includes(query)
      );
      return recipe.name.toLowerCase().includes(query) || (recipe.category || "").toLowerCase().includes(query) || ingredientMatch;
    }) : favoriteRecipes;

    return sortLibraryItems(filtered, sort, {
      name: (recipe) => recipe.name,
      createdAt: (recipe) => recipe.created_at,
      protein: (recipe) => recipe.protein,
      calories: (recipe) => recipe.calories
    });
  }, [favoriteRecipes, search, sort]);

  const visibleRecipes = paginate(filteredRecipes, page, FAVOURITES_PER_PAGE);

  return (
    <section className="page-stack">
      <Panel className="favorites-panel">
        <div className="toolbar">
          <TextInput
            className="search-field"
            label="Search favourites"
            value={search}
            onChange={setSearch}
            placeholder="Search name, category, or ingredient"
          />
          <SelectInput
            className="sort-field"
            label="Sort by"
            value={sort}
            options={librarySortOptions}
            onChange={(value) => setSort((value || "name-asc") as LibrarySort)}
          />
        </div>

        {isLoading ? <MealGridSkeleton /> : filteredRecipes.length === 0 ? (
          <div className="empty-state">
            <strong>No favourite meals yet</strong>
            <p className="muted small">Use the star on a meal card to add it here.</p>
          </div>
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
      </Panel>
    </section>
  );
}
