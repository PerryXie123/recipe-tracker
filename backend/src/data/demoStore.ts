import type { Food, Recipe } from "../types.js";

export let demoFoods: Food[] = [
  { id: "demo-egg", name: "Egg", created_at: "2025-01-01T00:00:00.000Z", calories_per_unit: 155, kj_per_unit: 648.5, protein_per_unit: 12.6, unit_label: "100g", unit_weight_g: 100 },
  { id: "demo-oats", name: "Rolled oats", created_at: "2025-01-02T00:00:00.000Z", calories_per_unit: 382.4, kj_per_unit: 1600, protein_per_unit: 13.4, unit_label: "100g", unit_weight_g: 100 },
  { id: "demo-chicken", name: "Chicken breast", created_at: "2025-01-03T00:00:00.000Z", calories_per_unit: 165, kj_per_unit: 690.4, protein_per_unit: 31, unit_label: "100g", unit_weight_g: 100 },
  { id: "demo-rice", name: "Rice", created_at: "2025-01-04T00:00:00.000Z", calories_per_unit: 170, kj_per_unit: 711.3, protein_per_unit: 3.8, unit_label: "100g", unit_weight_g: 100 },
  { id: "demo-yoghurt", name: "Greek yoghurt", created_at: "2025-01-05T00:00:00.000Z", calories_per_unit: 102.8, kj_per_unit: 430.1, protein_per_unit: 4.6, unit_label: "100g", unit_weight_g: 100 }
];

export let demoRecipes: Recipe[] = [
  {
    id: "demo-oats-recipe",
    name: "Overnight oats",
    category: "Breakfast",
    target_plan: "1350 cal / 120 protein",
    total_weight_g: 210,
    created_at: "2025-01-01T00:00:00.000Z",
    ingredients: [
      { food_id: "demo-oats", food_name: "Rolled oats", weight_g: 60, calories: 229.4, kj: 960, protein: 8 },
      { food_id: "demo-yoghurt", food_name: "Greek yoghurt", weight_g: 150, calories: 154.2, kj: 645.2, protein: 6.9 }
    ]
  },
  {
    id: "demo-chicken-bowl",
    name: "Chicken rice bowl",
    category: "Lunch",
    target_plan: "2100 cal / 180 protein",
    total_weight_g: 400,
    created_at: "2025-01-02T00:00:00.000Z",
    ingredients: [
      { food_id: "demo-chicken", food_name: "Chicken breast", weight_g: 200, calories: 330, kj: 1380.7, protein: 62 },
      { food_id: "demo-rice", food_name: "Rice", weight_g: 200, calories: 340, kj: 1422.6, protein: 7.6 }
    ]
  }
];

export function setDemoFoods(nextFoods: Food[]) {
  demoFoods = nextFoods;
}

export function setDemoRecipes(nextRecipes: Recipe[]) {
  demoRecipes = nextRecipes;
}
