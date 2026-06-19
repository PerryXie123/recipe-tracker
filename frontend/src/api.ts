import type { Food, Health, NewFood, NewRecipe, Recipe } from "./types";
import type { MealPlan } from "./lib/planning";

let apiAccessToken: string | undefined;

export function setApiAccessToken(accessToken: string | undefined) {
  apiAccessToken = accessToken;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (apiAccessToken) {
    headers.set("authorization", `Bearer ${apiAccessToken}`);
  }

  const response = await fetch(path, { ...options, headers });
  const responseText = await response.text();
  let payload: unknown = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new Error(response.ok ? "Unexpected API response" : responseText);
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error)
        : responseText || `Request failed (${response.status})`;

    throw new Error(message);
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

export type UserState = {
  tdeeTarget: number | null;
  proteinTarget: number | null;
  mealPlan: MealPlan;
};

export function getUserState() {
  return request<UserState>("/api/user-state");
}

export function saveUserState(state: UserState) {
  return request<UserState>("/api/user-state", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(state)
  });
}

export function createFood(food: NewFood) {
  return request<Food>("/api/foods", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(food)
  });
}

export function updateFood(id: string, food: NewFood) {
  return request<Food>(`/api/foods/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(food)
  });
}

export function deleteFood(id: string, options?: { removeReferences?: boolean }) {
  const params = options?.removeReferences ? "?removeReferences=true" : "";
  return request<{ ok: boolean }>(`/api/foods/${encodeURIComponent(id)}${params}`, {
    method: "DELETE"
  });
}

export function createRecipe(recipe: NewRecipe) {
  return request<Recipe>("/api/recipes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(recipe)
  });
}

export function updateRecipe(id: string, recipe: NewRecipe) {
  return request<Recipe>(`/api/recipes/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(recipe)
  });
}

export function deleteRecipe(id: string) {
  return request<{ ok: boolean }>(`/api/recipes/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}
