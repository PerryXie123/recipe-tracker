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
  const [unitDraft, setUnitDraft] = useState({ label: "serving", weight: 0 });
  const isPerUnit = food.unit_label !== "100g";
  const visibleUnitLabel = isPerUnit ? food.unit_label : unitDraft.label;
  const visibleUnitWeight = isPerUnit ? food.unit_weight_g : unitDraft.weight;

  useEffect(() => {
    if (isPerUnit) {
      setUnitDraft({
        label: food.unit_label || "serving",
        weight: Number(food.unit_weight_g || 0)
      });
    }
  }, [food.unit_label, food.unit_weight_g, isPerUnit]);

  useEffect(() => {
    if (!isEditing && !food.name && !isPerUnit) {
      setUnitDraft({ label: "serving", weight: 0 });
    }
  }, [food.name, isEditing, isPerUnit]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function setUnitMode(mode: string) {
    onChange({
      ...food,
      unit_label: mode === "unit" ? unitDraft.label || "serving" : "100g",
      unit_weight_g: mode === "unit" ? unitDraft.weight : 100
    });
  }

  function updateUnitLabel(unit_label: string) {
    setUnitDraft({ ...unitDraft, label: unit_label });
    if (isPerUnit) {
      onChange({ ...food, unit_label });
    }
  }

  function updateUnitWeight(unit_weight_g: number) {
    setUnitDraft({ ...unitDraft, weight: unit_weight_g });
    if (isPerUnit) {
      onChange({ ...food, unit_weight_g });
    }
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

      <div className={isPerUnit ? "form-grid unit-fields" : "form-grid unit-fields is-disabled"}>
        <TextInput
          label="Unit type"
          value={visibleUnitLabel}
          onChange={updateUnitLabel}
          placeholder="cup, bar, slice"
          disabled={!isPerUnit}
          required
        />
        <NumericInput
          label="Unit weight (g)"
          value={visibleUnitWeight}
          onChange={updateUnitWeight}
          min={0}
          step={0.1}
          disabled={!isPerUnit}
        />
      </div>

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
          <Button variant="danger" type="button" onClick={onDelete}>
            Delete ingredient
          </Button>
        ) : null}
      </div>
      <p className="form-message" role="status">
        {message || `Values are ${formatUnitBasis(food.unit_label, food.unit_weight_g)}.`}
      </p>
    </Panel>
  );
}
