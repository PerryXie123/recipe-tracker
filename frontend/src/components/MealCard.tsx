import { IconStar } from "@tabler/icons-react";
import { formatNumber } from "../lib/format";
import type { Recipe } from "../types";
import { Badge, Checkbox, IconButton, NumericInput } from "./ui";

type MealCardProps = {
  recipe: Recipe;
  displayName?: string;
  selected: boolean;
  checked: boolean;
  selectable?: boolean;
  isFavorite: boolean;
  portionTotals: {
    weight: number;
    calories: number;
    kj: number;
    protein: number;
  };
  onSelect: (recipe: Recipe) => void;
  onCheckedChange: (checked: boolean) => void;
  onPortionChange: (weight: number) => void;
  onFavoriteToggle: () => void;
};

export function MealCard({
  recipe,
  displayName,
  selected,
  checked,
  selectable = true,
  isFavorite,
  portionTotals,
  onSelect,
  onCheckedChange,
  onPortionChange,
  onFavoriteToggle
}: MealCardProps) {
  const mealName = displayName || recipe.name;
  const totalWeight = Number(recipe.total_weight_g || 0);
  const servings = totalWeight > 0 && portionTotals.weight > 0
    ? Math.round((totalWeight / portionTotals.weight) * 100) / 100
    : 1;

  return (
    <div
      role="button"
      tabIndex={0}
      className={selected ? "panel-surface meal-card selected" : "panel-surface meal-card"}
      onClick={() => onSelect(recipe)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(recipe);
        }
      }}
    >
      <div className="card-header">
        <div>
          <h3>{mealName}</h3>
          <p className="muted small">{formatNumber(recipe.total_weight_g || 0)}g total weight</p>
        </div>
        <div className="inline-actions">
          <span onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
            <IconButton
              label={isFavorite ? `Remove ${mealName} from favourites` : `Add ${mealName} to favourites`}
              pressed={isFavorite}
              variant={isFavorite ? "subtle" : "secondary"}
              onClick={() => onFavoriteToggle()}
            >
              <IconStar size={16} fill={isFavorite ? "currentColor" : "none"} />
            </IconButton>
          </span>
          {selectable ? (
            <Checkbox
              checked={checked}
              label={`Select ${mealName}`}
              onClick={(event) => event.stopPropagation()}
              onChange={onCheckedChange}
            />
          ) : null}
        </div>
      </div>

      <div className="badge-row">
        <Badge>{recipe.category || "Meal"}</Badge>
        <Badge>{formatNumber(recipe.calories)} cal</Badge>
        <Badge>{formatNumber(recipe.protein)}g protein</Badge>
      </div>

      <div
        className="card-portion"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="card-portion-inputs">
          <NumericInput
            label="Portion (g)"
            value={portionTotals.weight}
            onChange={onPortionChange}
            min={0}
            step={0.1}
          />
          <NumericInput
            label="Servings"
            value={servings}
            onChange={(value) => onPortionChange(value > 0 ? totalWeight / value : totalWeight)}
            min={1}
            step={1}
            disabled={totalWeight <= 0}
          />
        </div>
        <div className="portion-results">
          <div className="card-portion-metric">
            <NumericInput
              label="Calories"
              value={portionTotals.calories}
              onChange={(value) => scalePortionFromNutrient(value, recipe.calories)}
              min={0}
              step={1}
              disabled={recipe.calories <= 0 || totalWeight <= 0}
            />
          </div>
          <div className="card-portion-metric">
            <NumericInput
              label="Protein (g)"
              value={portionTotals.protein}
              onChange={(value) => scalePortionFromNutrient(value, recipe.protein)}
              min={0}
              step={0.1}
              disabled={recipe.protein <= 0 || totalWeight <= 0}
            />
          </div>
        </div>
      </div>
    </div>
  );

  function scalePortionFromNutrient(targetValue: number, recipeTotal: number) {
    if (recipeTotal <= 0 || totalWeight <= 0) return;
    onPortionChange((Math.max(0, targetValue) / recipeTotal) * totalWeight);
  }
}
