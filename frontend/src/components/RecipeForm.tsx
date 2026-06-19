import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconMinus } from "@tabler/icons-react";
import { formatNumber } from "../lib/format";
import type { Food, NewRecipe, Recipe } from "../types";
import { Button, IconButton, NameMatchResults, NumericInput, Panel, SelectInput, TextInput } from "./ui";

type RecipeFormProps = {
  recipe: NewRecipe;
  recipes: Recipe[];
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
  recipes,
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
  const autocompleteRef = useRef<HTMLDivElement | null>(null);
  const runningTotals = useMemo(() => {
    return recipe.ingredients.reduce(
      (totals, ingredient) => {
        const food = foods.find((item) => item.id === ingredient.food_id);
        if (!food) {
          return totals;
        }

        const unitWeight = Number(food.unit_weight_g || 0);
        const basisWeight = food.unit_label === "100g" ? 100 : unitWeight > 0 ? unitWeight : 100;
        const multiplier = Number(ingredient.weight_g || 0) / basisWeight;
        return {
          calories: totals.calories + Number(food.calories_per_unit || 0) * multiplier,
          protein: totals.protein + Number(food.protein_per_unit || 0) * multiplier
        };
      },
      { calories: 0, protein: 0 }
    );
  }, [foods, recipe.ingredients]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!autocompleteRef.current?.contains(event.target as Node)) {
        setActiveIngredientIndex(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveIngredientIndex(null);
    onSubmit();
  }

  function handleChooseIngredient(index: number, food: Food) {
    onChooseIngredient(index, food);
    setActiveIngredientIndex(null);
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
      {!isEditing ? <NameMatchResults query={recipe.name} names={recipes.map((item) => item.name)} /> : null}

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

      <div className="meal-running-totals" aria-live="polite" aria-label="Running meal nutrition totals">
        <div>
          <span>Calories</span>
          <strong>{formatNumber(runningTotals.calories)} cal</strong>
        </div>
        <div>
          <span>Protein</span>
          <strong>{formatNumber(runningTotals.protein)}g</strong>
        </div>
      </div>

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
          <Button variant="danger" type="button" onClick={onDelete}>
            Delete meal
          </Button>
        ) : null}
      </div>
      <p className="form-message" role="status">
        {foods.length === 0 ? "Add at least one ingredient first." : message}
      </p>
    </Panel>
  );
}
