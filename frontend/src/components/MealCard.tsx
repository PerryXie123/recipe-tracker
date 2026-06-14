import { IconStar } from "@tabler/icons-react";
import { formatNumber } from "../lib/format";
import type { Recipe } from "../types";
import { Badge, Checkbox, IconButton, NumericInput } from "./ui";

type MealCardProps = {
  recipe: Recipe;
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
          <h3>{recipe.name}</h3>
          <p className="muted small">{formatNumber(recipe.total_weight_g || 0)}g total weight</p>
        </div>
        <div className="inline-actions">
          <span onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
            <IconButton
              label={isFavorite ? `Remove ${recipe.name} from favourites` : `Add ${recipe.name} to favourites`}
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
              label={`Select ${recipe.name}`}
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
        <NumericInput
          label="Portion (g)"
          value={portionTotals.weight}
          onChange={onPortionChange}
          min={0}
          step={0.1}
        />
        <div className="portion-results">
          <div className="card-portion-metric">
            <span className="muted small strong">Calories</span>
            <strong>{formatNumber(portionTotals.calories)}</strong>
          </div>
          <div className="card-portion-metric">
            <span className="muted small strong">Protein</span>
            <strong>{formatNumber(portionTotals.protein)}g</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
