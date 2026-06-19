import type { PointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { IconTrash } from "@tabler/icons-react";
import { MealCard } from "../components/MealCard";
import { Pagination } from "../components/Pagination";
import { RecipeForm } from "../components/RecipeForm";
import { Button, ConfirmModal, MobileEditor, MobileFab, Panel, TextInput } from "../components/ui";
import { paginate } from "../lib/pagination";
import type { Food, NewRecipe, Recipe } from "../types";

const MEALS_PER_PAGE = 12;

type MealsPageProps = {
  recipes: Recipe[];
  foods: Food[];
  recipeForm: NewRecipe;
  ingredientQueries: string[];
  ingredientWeightTotal: number;
  isEditing: boolean;
  editingRecipeId: string | null;
  isSaving: boolean;
  message: string;
  portionWeights: Record<string, number>;
  favoriteRecipeIds: string[];
  onPortionWeightsChange: (weights: Record<string, number>) => void;
  onRecipeChange: (recipe: NewRecipe) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onManualWeightChange: (weight: number) => void;
  onRegenerateWeight: () => void;
  onIngredientQueryChange: (index: number, value: string) => void;
  onChooseIngredient: (index: number, food: Food) => void;
  getIngredientMatches: (query: string) => Food[];
  onIngredientWeightChange: (index: number, weight: number) => void;
  onAddIngredient: () => void;
  onRemoveIngredient: (index: number) => void;
  getPortionTotals: (recipe: Recipe) => { weight: number; calories: number; kj: number; protein: number };
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  onBulkDelete: (recipeIds: string[]) => void;
  onFavoriteToggle: (recipeId: string) => void;
};

export function MealsPage({
  recipes,
  foods,
  recipeForm,
  ingredientQueries,
  ingredientWeightTotal,
  isEditing,
  editingRecipeId,
  isSaving,
  message,
  portionWeights,
  favoriteRecipeIds,
  onPortionWeightsChange,
  onRecipeChange,
  onSubmit,
  onCancel,
  onManualWeightChange,
  onRegenerateWeight,
  onIngredientQueryChange,
  onChooseIngredient,
  getIngredientMatches,
  onIngredientWeightChange,
  onAddIngredient,
  onRemoveIngredient,
  getPortionTotals,
  onEdit,
  onDelete,
  onBulkDelete,
  onFavoriteToggle
}: MealsPageProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [checkedRecipeIds, setCheckedRecipeIds] = useState<string[]>([]);
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<{ type: "single"; recipe: Recipe } | { type: "bulk"; recipeIds: string[] } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setCheckedRecipeIds((currentIds) => currentIds.filter((recipeId) => recipes.some((recipe) => recipe.id === recipeId)));
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return recipes;
    }

    return recipes.filter((recipe) => {
      const ingredientMatch = recipe.ingredients.some((ingredient) =>
        ingredient.food_name.toLowerCase().includes(query)
      );
      return recipe.name.toLowerCase().includes(query) || (recipe.category || "").toLowerCase().includes(query) || ingredientMatch;
    });
  }, [recipes, search]);

  const visibleRecipes = paginate(filteredRecipes, page, MEALS_PER_PAGE);
  const editingRecipe = recipes.find((recipe) => recipe.id === editingRecipeId) || null;

  function setRecipeChecked(recipeId: string, checked: boolean) {
    setCheckedRecipeIds((currentIds) => {
      if (checked) {
        return currentIds.includes(recipeId) ? currentIds : [...currentIds, recipeId];
      }

      return currentIds.filter((currentId) => currentId !== recipeId);
    });
  }

  function handleBulkDelete() {
    setDeleteRequest({ type: "bulk", recipeIds: checkedRecipeIds });
  }

  function openNewMeal() {
    onCancel();
    setIsMobileEditorOpen(true);
  }

  function editMeal(recipe: Recipe) {
    onEdit(recipe);
    setIsMobileEditorOpen(true);
  }

  function closeMobileEditor() {
    onCancel();
    setIsMobileEditorOpen(false);
  }

  function confirmDeleteMeals() {
    if (!deleteRequest) {
      return;
    }

    if (deleteRequest.type === "single") {
      onDelete(deleteRequest.recipe);
    } else {
      onBulkDelete(deleteRequest.recipeIds);
      setCheckedRecipeIds([]);
    }

    setDeleteRequest(null);
  }

  const deleteCount = deleteRequest?.type === "single" ? 1 : deleteRequest?.recipeIds.length || 0;

  function handlePagePointerDown(event: PointerEvent<HTMLElement>) {
    if (!isEditing || !(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest(".meal-card, .form-panel")) {
      return;
    }

    onCancel();
  }

  return (
    <section className="page-stack" onPointerDown={handlePagePointerDown}>
      <section className="content-layout meals-layout">
        <Panel className="meals-panel">
          <div className="toolbar">
            <TextInput
              className="search-field"
              label="Search meals"
              value={search}
              onChange={setSearch}
              placeholder="Search name, category, or ingredient"
            />
            <div className="inline-actions">
              <Button
                className="bulk-delete-action"
                variant="danger"
                type="button"
                disabled={checkedRecipeIds.length === 0}
                onClick={handleBulkDelete}
              >
                <IconTrash aria-hidden="true" size={17} />
                <span>Delete selected</span>
              </Button>
            </div>
          </div>

          <div className="meal-grid" aria-live="polite">
            {visibleRecipes.items.map((recipe) => (
              <MealCard
                recipe={recipe}
                selected={recipe.id === editingRecipeId}
                checked={checkedRecipeIds.includes(recipe.id)}
                isFavorite={favoriteRecipeIds.includes(recipe.id)}
                portionTotals={getPortionTotals(recipe)}
                onSelect={editMeal}
                onCheckedChange={(checked) => setRecipeChecked(recipe.id, checked)}
                onPortionChange={(weight) => onPortionWeightsChange({ ...portionWeights, [recipe.id]: weight })}
                onFavoriteToggle={() => onFavoriteToggle(recipe.id)}
                key={recipe.id}
              />
            ))}
          </div>

          <Pagination
            page={visibleRecipes.page}
            pageCount={visibleRecipes.pageCount}
            onPrevious={() => setPage(visibleRecipes.page - 1)}
            onNext={() => setPage(visibleRecipes.page + 1)}
          />
        </Panel>

        <MobileEditor open={isMobileEditorOpen} label={isEditing ? "Edit meal" : "Add meal"} onClose={closeMobileEditor}>
          <div className="right-panel-stack">
          <RecipeForm
            recipe={recipeForm}
            foods={foods}
            ingredientQueries={ingredientQueries}
            ingredientWeightTotal={ingredientWeightTotal}
            isEditing={isEditing}
            isSaving={isSaving}
            message={message}
            onChange={onRecipeChange}
            onSubmit={onSubmit}
            onCancel={closeMobileEditor}
            onManualWeightChange={onManualWeightChange}
            onRegenerateWeight={onRegenerateWeight}
            onIngredientQueryChange={onIngredientQueryChange}
            onChooseIngredient={onChooseIngredient}
            getIngredientMatches={getIngredientMatches}
            onIngredientWeightChange={onIngredientWeightChange}
            onAddIngredient={onAddIngredient}
            onRemoveIngredient={onRemoveIngredient}
            onDelete={editingRecipe ? () => setDeleteRequest({ type: "single", recipe: editingRecipe }) : undefined}
          />
          </div>
        </MobileEditor>
      </section>
      <MobileFab label="Add meal" onClick={openNewMeal} />
      {deleteRequest ? (
        <ConfirmModal
          title={`Delete ${deleteCount} meal${deleteCount === 1 ? "" : "s"}?`}
          confirmLabel={deleteCount === 1 ? "Delete meal" : "Delete meals"}
          onCancel={() => setDeleteRequest(null)}
          onConfirm={confirmDeleteMeals}
          body={
            <>
              <p>
                This will permanently delete the selected meal{deleteCount === 1 ? "" : "s"} from your meal library.
              </p>
              {deleteRequest.type === "single" ? (
                <div className="confirm-modal-list">
                  <span>{deleteRequest.recipe.name}</span>
                </div>
              ) : null}
            </>
          }
        />
      ) : null}
    </section>
  );
}
