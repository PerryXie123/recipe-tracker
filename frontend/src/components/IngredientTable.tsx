import { formatNumber } from "../lib/format";
import type { Food } from "../types";
import { Checkbox } from "./ui";

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
      <table>
        <thead>
          <tr>
            <th aria-label="Select ingredients" />
            <th>Ingredient</th>
            <th>Calories</th>
            <th>kJ</th>
            <th>Protein</th>
            <th>Basis</th>
          </tr>
        </thead>
        <tbody>
          {foods.map((food) => (
            <tr
              className={food.id === selectedFoodId ? "ingredient-row selected" : "ingredient-row"}
              onClick={() => onSelect(food)}
              key={food.id}
            >
              <td>
                <Checkbox
                  checked={checkedFoodIds.includes(food.id)}
                  label={`Select ${food.name}`}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(checked) => onCheckedChange(food.id, checked)}
                />
              </td>
              <td>{food.name}</td>
              <td>{formatNumber(food.calories_per_unit)}</td>
              <td>{formatNumber(food.kj_per_unit)}</td>
              <td>{formatNumber(food.protein_per_unit)}g</td>
              <td>per 100g</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
