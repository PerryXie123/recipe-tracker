import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { formatUnitBasis } from "../lib/format";
import type { NewFood } from "../types";
import { Button, NumericInput, Panel, SegmentedControl, TextInput } from "./ui";

type FoodFormProps = {
  food: NewFood;
  isEditing: boolean;
  isSaving: boolean;
  message: string;
  onChange: (food: NewFood) => void;
  onCaloriesChange: (calories: number) => void;
  onKjChange: (kj: number) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export function FoodForm({
  food,
  isEditing,
  isSaving,
  message,
  onChange,
  onCaloriesChange,
  onKjChange,
  onSubmit,
  onCancel,
  onDelete
}: FoodFormProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const isPerUnit = food.unit_label !== "100g";

  useEffect(() => {
    setIsConfirmingDelete(false);
  }, [isEditing, food.name]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function handleConfirmDelete() {
    setIsConfirmingDelete(false);
    onDelete?.();
  }

  function setUnitMode(mode: string) {
    onChange({
      ...food,
      unit_label: mode === "unit" ? "serving" : "100g",
      unit_weight_g: mode === "unit" ? food.unit_weight_g || 0 : 100
    });
  }

  return (
    <Panel as="form" className="form-panel" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Ingredient</p>
        <h2>{isEditing ? "Edit ingredient" : "Add ingredient"}</h2>
      </div>

      <TextInput
        label="Name"
        value={food.name}
        onChange={(name) => onChange({ ...food, name })}
        placeholder="Cottage cheese"
        required
      />

      <div className="form-grid">
        <NumericInput
          label="Calories"
          value={food.calories_per_unit}
          onChange={onCaloriesChange}
          min={0}
          step={0.1}
          required
        />

        <NumericInput
          label="kJ"
          value={food.kj_per_unit}
          onChange={onKjChange}
          min={0}
          step={0.1}
          required
        />
      </div>

      <NumericInput
        label="Protein"
        value={food.protein_per_unit}
        onChange={(protein_per_unit) => onChange({ ...food, protein_per_unit })}
        min={0}
        step={0.1}
        required
      />

      <div className="unit-section">
        <span className="muted small strong">Nutrition basis</span>
        <SegmentedControl
          value={isPerUnit ? "unit" : "100g"}
          options={[
            { value: "100g", label: "Per 100g" },
            { value: "unit", label: "Per unit" }
          ]}
          onChange={setUnitMode}
        />
      </div>

      {isPerUnit ? (
        <div className="form-grid">
          <TextInput
            label="Unit type"
            value={food.unit_label}
            onChange={(unit_label) => onChange({ ...food, unit_label })}
            placeholder="cup, bar, slice"
            required
          />
          <NumericInput
            label="Unit weight (g)"
            value={food.unit_weight_g}
            onChange={(unit_weight_g) => onChange({ ...food, unit_weight_g })}
            min={0}
            step={0.1}
          />
        </div>
      ) : null}

      <div className="button-stack">
        <Button type="submit" loading={isSaving}>
          {isEditing ? "Save ingredient" : "Add ingredient"}
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
              Delete ingredient
            </Button>
          )
        ) : null}
      </div>
      <p className="form-message" role="status">
        {message || `Values are ${formatUnitBasis(food.unit_label, food.unit_weight_g)}.`}
      </p>
    </Panel>
  );
}
