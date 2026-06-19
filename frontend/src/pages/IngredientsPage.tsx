import type { PointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { IconTrash } from "@tabler/icons-react";
import { FoodForm } from "../components/FoodForm";
import { IngredientTable } from "../components/IngredientTable";
import { Pagination } from "../components/Pagination";
import { Button, ConfirmModal, MobileEditor, MobileFab, Panel, SelectInput, TextInput } from "../components/ui";
import { paginate } from "../lib/pagination";
import { librarySortOptions, sortLibraryItems, type LibrarySort } from "../lib/sorting";
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
  const [sort, setSort] = useState<LibrarySort>("name-asc");
  const [page, setPage] = useState(1);
  const [checkedFoodIds, setCheckedFoodIds] = useState<string[]>([]);
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<
    { type: "single"; food: Food } | { type: "bulk"; foodIds: string[] } | null
  >(null);

  useEffect(() => {
    setPage(1);
  }, [search, sort]);

  useEffect(() => {
    setCheckedFoodIds((currentIds) => currentIds.filter((foodId) => foods.some((food) => food.id === foodId)));
  }, [foods]);

  useEffect(() => {
    if (message === "Ingredient added." || message === "Ingredient saved.") {
      setIsMobileEditorOpen(false);
    }
  }, [message]);

  const sortedFoods = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query ? foods.filter((food) => food.name.toLowerCase().includes(query)) : foods;
    return sortLibraryItems(filtered, sort, {
      name: (food) => food.name,
      createdAt: (food) => food.created_at,
      protein: (food) => food.protein_per_unit,
      calories: (food) => food.calories_per_unit
    });
  }, [foods, search, sort]);

  const visibleFoods = paginate(sortedFoods, page, INGREDIENTS_PER_PAGE);
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
    setDeleteRequest({ type: "bulk", foodIds: checkedFoodIds });
  }

  function requestDeleteFood(food: Food) {
    setDeleteRequest({ type: "single", food });
  }

  function openNewIngredient() {
    onCancel();
    setIsMobileEditorOpen(true);
  }

  function editIngredient(food: Food) {
    onEdit(food);
    setIsMobileEditorOpen(true);
  }

  function closeMobileEditor() {
    onCancel();
    setIsMobileEditorOpen(false);
  }

  function confirmDeleteIngredients() {
    if (!deleteRequest) {
      return;
    }

    if (deleteRequest.type === "bulk") {
      onBulkDelete(deleteRequest.foodIds);
      setCheckedFoodIds([]);
    } else if (getRecipesUsingFood(deleteRequest.food, recipes).length > 0) {
      onDeleteWithReferences(deleteRequest.food);
    } else {
      onDelete(deleteRequest.food);
    }

    setDeleteRequest(null);
  }

  const deleteCount = deleteRequest?.type === "bulk" ? deleteRequest.foodIds.length : deleteRequest ? 1 : 0;
  const affectedRecipes = deleteRequest?.type === "single" ? getRecipesUsingFood(deleteRequest.food, recipes) : [];

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
            <SelectInput
              className="sort-field"
              label="Sort by"
              value={sort}
              options={librarySortOptions}
              onChange={(value) => setSort((value || "name-asc") as LibrarySort)}
            />
            <div className="inline-actions">
              <Button
                className="bulk-delete-action"
                variant="danger"
                type="button"
                disabled={checkedFoodIds.length === 0}
                onClick={handleBulkDelete}
              >
                <IconTrash aria-hidden="true" size={17} />
                <span>Delete selected</span>
              </Button>
            </div>
          </div>

          <IngredientTable
            foods={visibleFoods.items}
            selectedFoodId={editingFoodId}
            checkedFoodIds={checkedFoodIds}
            onSelect={editIngredient}
            onCheckedChange={setFoodChecked}
          />

          <Pagination
            page={visibleFoods.page}
            pageCount={visibleFoods.pageCount}
            onPrevious={() => setPage(visibleFoods.page - 1)}
            onNext={() => setPage(visibleFoods.page + 1)}
          />
        </Panel>

        <MobileEditor open={isMobileEditorOpen} label={isEditing ? "Edit ingredient" : "Add ingredient"} onClose={closeMobileEditor}>
          <FoodForm
            food={foodForm}
            foods={foods}
            isEditing={isEditing}
            isSaving={isSaving}
            message={message}
            onChange={onFoodChange}
            onCaloriesChange={onCaloriesChange}
            onKjChange={onKjChange}
            onSubmit={onSubmit}
            onCancel={closeMobileEditor}
            onDelete={editingFood ? () => requestDeleteFood(editingFood) : undefined}
          />
        </MobileEditor>
      </section>
      <MobileFab label="Add ingredient" onClick={openNewIngredient} />
      {deleteRequest ? (
        <ConfirmModal
          title={`Delete ${deleteCount} ingredient${deleteCount === 1 ? "" : "s"}?`}
          confirmLabel={deleteCount === 1 ? "Delete ingredient" : "Delete ingredients"}
          onCancel={() => setDeleteRequest(null)}
          onConfirm={confirmDeleteIngredients}
          body={
            <>
              <p>
                {affectedRecipes.length > 0
                  ? "This ingredient is used in the meals below. Deleting it will also remove it from those meals."
                  : `This will permanently delete the selected ingredient${deleteCount === 1 ? "" : "s"} from your library.`}
              </p>
              {affectedRecipes.length > 0 ? (
                <div className="confirm-modal-list">
                  {affectedRecipes.map((recipe) => (
                    <span key={recipe.id}>{recipe.name}</span>
                  ))}
                </div>
              ) : null}
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
