import type { PointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Group, Paper, Text, TextInput, Title } from "@mantine/core";
import { FoodForm } from "../components/FoodForm";
import { IngredientTable } from "../components/IngredientTable";
import { Pagination } from "../components/Pagination";
import { paginate } from "../lib/pagination";
import type { Food, NewFood } from "../types";

const INGREDIENTS_PER_PAGE = 14;

type IngredientsPageProps = {
  foods: Food[];
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
  onBulkDelete: (foodIds: string[]) => void;
  editingFoodId: string | null;
};

export function IngredientsPage({
  foods,
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
  onBulkDelete,
  editingFoodId
}: IngredientsPageProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [checkedFoodIds, setCheckedFoodIds] = useState<string[]>([]);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);

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
      <header className="page-header">
        <div>
          <Text className="eyebrow">Ingredients</Text>
          <Title order={1}>Ingredients</Title>
        </div>
        <Badge variant="light">{filteredFoods.length} matches</Badge>
      </header>

      <section className="content-layout">
        <Paper className="panel ingredients-panel" withBorder>
          <div className="toolbar">
            <TextInput
              className="search-field"
              label="Search ingredients"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name"
            />
            <Group gap={8}>
              {isConfirmingBulkDelete ? (
                <>
                  <Button color="red" type="button" onClick={handleBulkDelete}>
                    Confirm
                  </Button>
                  <Button variant="default" type="button" onClick={() => setIsConfirmingBulkDelete(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  color="red"
                  variant="subtle"
                  type="button"
                  disabled={checkedFoodIds.length === 0}
                  onClick={handleBulkDelete}
                >
                  Delete selected
                </Button>
              )}
            </Group>
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
        </Paper>

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
          onDelete={editingFood ? () => onDelete(editingFood) : undefined}
        />
      </section>
    </section>
  );
}
