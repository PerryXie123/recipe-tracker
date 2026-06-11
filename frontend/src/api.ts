import type { Food, Health, NewFood, Recipe } from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload as T;
}

export function getHealth() {
  return request<Health>("/api/health");
}

export function getFoods() {
  return request<Food[]>("/api/foods");
}

export function getRecipes() {
  return request<Recipe[]>("/api/recipes");
}

export function createFood(food: NewFood) {
  return request<Food>("/api/foods", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(food)
  });
}
