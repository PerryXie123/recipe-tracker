import type { Recipe } from "../types";

export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function getRecipeIngredientWeight(recipe: Recipe) {
  return round1(recipe.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.weight_g || 0), 0));
}
