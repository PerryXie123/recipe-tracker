import type { PointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { FoodForm } from "../components/FoodForm";
import { IngredientTable } from "../components/IngredientTable";
import { Pagination } from "../components/Pagination";
import { Button, ConfirmModal, Panel, TextInput } from "../components/ui";
import { paginate } from "../lib/pagination";
import type { Food, NewFood, Recipe } from "../types";

const INGREDIENTS_PER_PAGE = 14;

type IngredientsPageProps = {
  foods: Food[];
  recipes: Recipe[];
  foodForm: NewFood;
  isEditing: boolean;
  isSaving: boolean;
  message: string;
  onFoodChange: (food: NewFood) => void;
  onCaloriesChange: (calories: number) => void;
  onKjChange: (kj: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onEdit: (food: Food) => void;
  onDelete: (food: Food) => void;
  onDeleteWithReferences: (food: Food) => void;
  onBulkDelete: (foodIds: string[]) => void;
  editingFoodId: string | null;
};

export function IngredientsPage({
  foods,
  recipes,
  foodForm,
  isEditing,
  isSaving,
  message,
  onFoodChange,
  onCaloriesChange,
  onKjChange,
  onSubmit,
  onCancel,
  onEdit,
  onDelete,
  onDeleteWithReferences,
  onBulkDelete,
  editingFoodId
}: IngredientsPageProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [checkedFoodIds, setCheckedFoodIds] = useState<string[]>([]);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);
  const [foodPendingDelete, setFoodPendingDelete] = useState<Food | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setCheckedFoodIds((currentIds) => currentIds.filter((foodId) => foods.some((food) => food.id === foodId)));
  }, [foods]);

  useEffect(() => {
    if (checkedFoodIds.length === 0) {
      setIsConfirmingBulkDelete(false);
    }
  }, [checkedFoodIds.length]);

  const filteredFoods = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? foods.filter((food) => food.name.toLowerCase().includes(query)) : foods;
  }, [foods, search]);

  const visibleFoods = paginate(filteredFoods, page, INGREDIENTS_PER_PAGE);
  const editingFood = foods.find((food) => food.id === editingFoodId) || null;

  function setFoodChecked(foodId: string, checked: boolean) {
    setCheckedFoodIds((currentIds) => {
      if (checked) {
        return currentIds.includes(foodId) ? currentIds : [...currentIds, foodId];
      }

      return currentIds.filter((currentId) => currentId !== foodId);
    });
  }

  function handleBulkDelete() {
    if (!isConfirmingBulkDelete) {
      setIsConfirmingBulkDelete(true);
      return;
    }

    onBulkDelete(checkedFoodIds);
    setCheckedFoodIds([]);
    setIsConfirmingBulkDelete(false);
  }

  function requestDeleteFood(food: Food) {
    const affectedRecipes = getRecipesUsingFood(food, recipes);
    if (affectedRecipes.length === 0) {
      onDelete(food);
      return;
    }

    setFoodPendingDelete(food);
  }

  function confirmDeleteFoodWithReferences() {
    if (!foodPendingDelete) {
      return;
    }

    onDeleteWithReferences(foodPendingDelete);
    setFoodPendingDelete(null);
  }

  function handlePagePointerDown(event: PointerEvent<HTMLElement>) {
    if (!isEditing || !(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest(".ingredient-row, .form-panel")) {
      return;
    }

    onCancel();
  }

  return (
    <section className="page-stack" onPointerDown={handlePagePointerDown}>
      <section className="content-layout">
        <Panel className="ingredients-panel">
          <div className="toolbar">
            <TextInput
              className="search-field"
              label="Search ingredients"
              value={search}
              onChange={setSearch}
              placeholder="Search by name"
            />
            <div className="inline-actions">
              {isConfirmingBulkDelete ? (
                <>
                  <Button variant="danger" type="button" onClick={handleBulkDelete}>
                    Confirm
                  </Button>
                  <Button variant="secondary" type="button" onClick={() => setIsConfirmingBulkDelete(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="danger"
                  type="button"
                  disabled={checkedFoodIds.length === 0}
                  onClick={handleBulkDelete}
                >
                  Delete selected
                </Button>
              )}
            </div>
          </div>

          <IngredientTable
            foods={visibleFoods.items}
            selectedFoodId={editingFoodId}
            checkedFoodIds={checkedFoodIds}
            onSelect={onEdit}
            onCheckedChange={setFoodChecked}
          />

          <Pagination
            page={visibleFoods.page}
            pageCount={visibleFoods.pageCount}
            onPrevious={() => setPage(visibleFoods.page - 1)}
            onNext={() => setPage(visibleFoods.page + 1)}
          />
        </Panel>

        <FoodForm
          food={foodForm}
          isEditing={isEditing}
          isSaving={isSaving}
          message={message}
          onChange={onFoodChange}
          onCaloriesChange={onCaloriesChange}
          onKjChange={onKjChange}
          onSubmit={onSubmit}
          onCancel={onCancel}
            onDelete={editingFood ? () => requestDeleteFood(editingFood) : undefined}
        />
      </section>
      {foodPendingDelete ? (
        <ConfirmModal
          title={`Delete ${foodPendingDelete.name}?`}
          confirmLabel="Delete ingredient"
          onCancel={() => setFoodPendingDelete(null)}
          onConfirm={confirmDeleteFoodWithReferences}
          body={
            <>
              <p>
                This ingredient is used in these meals. Deleting it will also remove it from those meals and keep the
                rest of each meal unchanged.
              </p>
              <div className="confirm-modal-list">
                {getRecipesUsingFood(foodPendingDelete, recipes).map((recipe) => (
                  <span key={recipe.id}>{recipe.name}</span>
                ))}
              </div>
            </>
          }
        />
      ) : null}
    </section>
  );
}

function getRecipesUsingFood(food: Food, recipes: Recipe[]) {
  return recipes.filter((recipe) => recipe.ingredients.some((ingredient) => ingredient.food_id === food.id));
}
