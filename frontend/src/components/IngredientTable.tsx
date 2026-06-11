import { Checkbox, Table } from "@mantine/core";
import { formatNumber } from "../lib/format";
import type { Food } from "../types";

type IngredientTableProps = {
  foods: Food[];
  selectedFoodId: string | null;
  checkedFoodIds: string[];
  onSelect: (food: Food) => void;
  onCheckedChange: (foodId: string, checked: boolean) => void;
};

export function IngredientTable({ foods, selectedFoodId, checkedFoodIds, onSelect, onCheckedChange }: IngredientTableProps) {
  return (
    <div className="table-wrap">
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th aria-label="Select ingredients" />
            <Table.Th>Ingredient</Table.Th>
            <Table.Th>Calories</Table.Th>
            <Table.Th>kJ</Table.Th>
            <Table.Th>Protein</Table.Th>
            <Table.Th>Basis</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {foods.map((food) => (
            <Table.Tr
              className={food.id === selectedFoodId ? "ingredient-row selected" : "ingredient-row"}
              onClick={() => onSelect(food)}
              key={food.id}
            >
              <Table.Td>
                <Checkbox
                  checked={checkedFoodIds.includes(food.id)}
                  aria-label={`Select ${food.name}`}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onCheckedChange(food.id, event.currentTarget.checked)}
                />
              </Table.Td>
              <Table.Td>{food.name}</Table.Td>
              <Table.Td>{formatNumber(food.calories_per_unit)}</Table.Td>
              <Table.Td>{formatNumber(food.kj_per_unit)}</Table.Td>
              <Table.Td>{formatNumber(food.protein_per_unit)}g</Table.Td>
              <Table.Td>per 100g</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}
