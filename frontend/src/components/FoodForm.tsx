import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button, Group, NumberInput, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { formatNumber } from "../lib/format";
import type { NewFood } from "../types";

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

  return (
    <Paper component="form" className="form-panel" onSubmit={handleSubmit} withBorder>
      <div>
        <Text className="eyebrow">Ingredient</Text>
        <Title order={2}>{isEditing ? "Edit ingredient" : "Add ingredient"}</Title>
      </div>

      <TextInput
        label="Name"
        value={food.name}
        onChange={(event) => onChange({ ...food, name: event.target.value })}
        placeholder="Cottage cheese"
        required
      />

      <div className="form-grid">
        <NumberInput
          label="Calories"
          value={food.calories_per_unit}
          onChange={(value) => onCaloriesChange(Number(value))}
          min={0}
          step={0.1}
          required
        />

        <NumberInput
          label="kJ"
          value={food.kj_per_unit}
          onChange={(value) => onKjChange(Number(value))}
          min={0}
          step={0.1}
          required
        />
      </div>

      <NumberInput
        label="Protein"
        value={food.protein_per_unit}
        onChange={(value) => onChange({ ...food, protein_per_unit: Number(value) })}
        min={0}
        step={0.1}
        required
      />

      <Paper className="fixed-field" withBorder>
        <Text c="dimmed" size="sm" fw={700}>Unit</Text>
        <Text fw={700}>100g</Text>
      </Paper>

      <Stack gap={8}>
        <Button type="submit" loading={isSaving}>
          {isEditing ? "Save ingredient" : "Add ingredient"}
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
              Delete ingredient
            </Button>
          )
        ) : null}
      </Stack>
      <Text className="form-message" role="status">
        {message || `Values are per ${formatNumber(100)}g.`}
      </Text>
    </Paper>
  );
}
