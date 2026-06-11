import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ActionIcon, Button, Group, NumberInput, Paper, Select, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconMinus } from "@tabler/icons-react";
import { formatNumber } from "../lib/format";
import type { Food, NewRecipe } from "../types";

type RecipeFormProps = {
  recipe: NewRecipe;
  foods: Food[];
  ingredientQueries: string[];
  ingredientWeightTotal: number;
  isEditing: boolean;
  isSaving: boolean;
  message: string;
  onChange: (recipe: NewRecipe) => void;
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
  onDelete?: () => void;
};

export function RecipeForm({
  recipe,
  foods,
  ingredientQueries,
  ingredientWeightTotal,
  isEditing,
  isSaving,
  message,
  onChange,
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
  onDelete
}: RecipeFormProps) {
  const [activeIngredientIndex, setActiveIngredientIndex] = useState<number | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!autocompleteRef.current?.contains(event.target as Node)) {
        setActiveIngredientIndex(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    setIsConfirmingDelete(false);
  }, [isEditing, recipe.name]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveIngredientIndex(null);
    onSubmit();
  }

  function handleChooseIngredient(index: number, food: Food) {
    onChooseIngredient(index, food);
    setActiveIngredientIndex(null);
  }

  function handleConfirmDelete() {
    setIsConfirmingDelete(false);
    onDelete?.();
  }

  return (
    <Paper component="form" className="form-panel" onSubmit={handleSubmit} withBorder>
      <div>
        <Text className="eyebrow">Meal</Text>
        <Title order={2}>{isEditing ? "Meal details" : "Add meal"}</Title>
      </div>

      <TextInput
        label="Name"
        value={recipe.name}
        onChange={(event) => onChange({ ...recipe, name: event.target.value })}
        placeholder="Chicken rice bowl"
        required
      />

      <Select
        label="Category"
        value={recipe.category}
        onChange={(value) => onChange({ ...recipe, category: value || "Meal" })}
        data={["Meal", "Breakfast", "Lunch", "Dinner", "Snack"]}
      />

      <div className="form-grid weight-grid">
        <NumberInput
          label="Total weight (g)"
          value={recipe.total_weight_g}
          onChange={(value) => onManualWeightChange(Number(value))}
          min={0}
          step={0.1}
        />

        <Button variant="default" className="inline-button" type="button" onClick={onRegenerateWeight}>
          Regenerate
        </Button>
      </div>
      <Text className="form-message">Ingredient weight total: {formatNumber(ingredientWeightTotal)}g</Text>

      <div className="builder-list" ref={autocompleteRef}>
        {recipe.ingredients.map((ingredient, index) => {
          const query = ingredientQueries[index] || "";
          const selectedFood = foods.find((food) => food.id === ingredient.food_id);
          const matches = getIngredientMatches(query);

          return (
            <div className="builder-row" key={index}>
              <div className="autocomplete-field">
                <TextInput
                  label="Ingredient"
                  value={query}
                  onFocus={() => setActiveIngredientIndex(index)}
                  onChange={(event) => {
                    setActiveIngredientIndex(index);
                    onIngredientQueryChange(index, event.target.value);
                  }}
                  placeholder="Search ingredient"
                  required
                />
                {activeIngredientIndex === index && query ? (
                  <Paper className="autocomplete-menu" withBorder>
                    {matches.map((food) => (
                      <Button
                        justify="space-between"
                        variant="subtle"
                        color="gray"
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleChooseIngredient(index, food)}
                        key={food.id}
                      >
                        <span>{food.name}</span>
                      </Button>
                    ))}
                    {matches.length === 0 ? <Text c="dimmed" size="xs">No matches</Text> : null}
                  </Paper>
                ) : null}
                {selectedFood ? <Text className="selected-note">Selected: {selectedFood.name}</Text> : null}
              </div>

              <NumberInput
                label="Weight (g)"
                value={ingredient.weight_g}
                onChange={(value) => onIngredientWeightChange(index, Number(value))}
                min={0}
                step={0.1}
                required
              />

              <ActionIcon
                className="icon-button"
                variant="default"
                type="button"
                aria-label="Remove ingredient"
                onClick={() => onRemoveIngredient(index)}
              >
                <IconMinus size={16} />
              </ActionIcon>
            </div>
          );
        })}
      </div>

      <Button variant="default" type="button" onClick={onAddIngredient}>
        Add ingredient
      </Button>

      <Stack gap={8}>
        <Button type="submit" loading={isSaving} disabled={foods.length === 0}>
          {isEditing ? "Save meal" : "Add meal"}
        </Button>
        {isEditing ? (
          <Button variant="default" type="button" onClick={onCancel}>
            Cancel edit
          </Button>
        ) : null}
        {isEditing && onDelete ? (
          isConfirmingDelete ? (
            <Group grow gap={8}>
              <Button color="red" type="button" onClick={handleConfirmDelete}>
                Confirm
              </Button>
              <Button variant="default" type="button" onClick={() => setIsConfirmingDelete(false)}>
                Cancel
              </Button>
            </Group>
          ) : (
            <Button color="red" type="button" onClick={() => setIsConfirmingDelete(true)}>
              Delete meal
            </Button>
          )
        ) : null}
      </Stack>
      <Text className="form-message" role="status">
        {foods.length === 0 ? "Add at least one ingredient first." : message}
      </Text>
    </Paper>
  );
}
