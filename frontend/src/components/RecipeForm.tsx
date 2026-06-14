import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { IconMinus } from "@tabler/icons-react";
import { formatNumber } from "../lib/format";
import type { Food, NewRecipe } from "../types";
import { Button, IconButton, NumericInput, Panel, SelectInput, TextInput } from "./ui";

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

const categoryOptions = ["Meal", "Breakfast", "Lunch", "Dinner", "Snack"].map((value) => ({ value, label: value }));

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
    <Panel as="form" className="form-panel" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Meal</p>
        <h2>{isEditing ? "Meal details" : "Add meal"}</h2>
      </div>

      <TextInput
        label="Name"
        value={recipe.name}
        onChange={(name) => onChange({ ...recipe, name })}
        placeholder="Chicken rice bowl"
        required
      />

      <SelectInput
        label="Category"
        value={recipe.category}
        onChange={(category) => onChange({ ...recipe, category: category || "Meal" })}
        options={categoryOptions}
      />

      <div className="form-grid weight-grid">
        <NumericInput
          label="Total weight (g)"
          value={recipe.total_weight_g}
          onChange={onManualWeightChange}
          min={0}
          step={0.1}
        />

        <Button variant="secondary" className="inline-button" type="button" onClick={onRegenerateWeight}>
          Regenerate
        </Button>
      </div>
      <p className="form-message">Ingredient weight total: {formatNumber(ingredientWeightTotal)}g</p>

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
                  onChange={(value) => {
                    setActiveIngredientIndex(index);
                    onIngredientQueryChange(index, value);
                  }}
                  placeholder="Search ingredient"
                  required
                />
                {activeIngredientIndex === index && query ? (
                  <div className="autocomplete-menu">
                    {matches.map((food) => (
                      <Button
                        className="autocomplete-option"
                        variant="subtle"
                        type="button"
                        onClick={() => handleChooseIngredient(index, food)}
                        key={food.id}
                      >
                        <span>{food.name}</span>
                      </Button>
                    ))}
                    {matches.length === 0 ? <span className="muted small">No matches</span> : null}
                  </div>
                ) : null}
                {selectedFood ? <p className="selected-note">Selected: {selectedFood.name}</p> : null}
              </div>

              <NumericInput
                label="Weight (g)"
                value={ingredient.weight_g}
                onChange={(weight) => onIngredientWeightChange(index, weight)}
                min={0}
                step={0.1}
                required
              />

              <IconButton
                className="builder-remove"
                label="Remove ingredient"
                type="button"
                onClick={() => onRemoveIngredient(index)}
              >
                <IconMinus size={16} />
              </IconButton>
            </div>
          );
        })}
      </div>

      <Button variant="secondary" type="button" onClick={onAddIngredient}>
        Add ingredient
      </Button>

      <div className="button-stack">
        <Button type="submit" loading={isSaving} disabled={foods.length === 0}>
          {isEditing ? "Save meal" : "Add meal"}
        </Button>
        {isEditing ? (
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel edit
          </Button>
        ) : null}
        {isEditing && onDelete ? (
          isConfirmingDelete ? (
            <div className="split-actions">
              <Button variant="danger" type="button" onClick={handleConfirmDelete}>
                Confirm
              </Button>
              <Button variant="secondary" type="button" onClick={() => setIsConfirmingDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="danger" type="button" onClick={() => setIsConfirmingDelete(true)}>
              Delete meal
            </Button>
          )
        ) : null}
      </div>
      <p className="form-message" role="status">
        {foods.length === 0 ? "Add at least one ingredient first." : message}
      </p>
    </Panel>
  );
}
