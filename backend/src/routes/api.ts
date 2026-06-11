import type { IncomingMessage, ServerResponse } from "node:http";
import { getPathId, readBody, sendJson } from "../http";
import type { NewFoodPayload, NewRecipePayload } from "../types";
import { isNodeError } from "../utils/errors";

type ApiServices = {
  supabaseConfigured: boolean;
  foods: {
    getFoods: () => Promise<unknown>;
    createFood: (payload: NewFoodPayload) => Promise<unknown>;
    updateFood: (id: string, payload: NewFoodPayload) => Promise<unknown>;
    deleteFood: (id: string) => Promise<unknown>;
  };
  recipes: {
    getRecipes: () => Promise<unknown>;
    createRecipe: (payload: NewRecipePayload) => Promise<unknown>;
    updateRecipe: (id: string, payload: NewRecipePayload) => Promise<unknown>;
    deleteRecipe: (id: string) => Promise<unknown>;
  };
};

export function createApiHandler(services: ApiServices) {
  return async function handleApi(request: IncomingMessage, response: ServerResponse, url: URL) {
    try {
      if (request.method === "GET" && url.pathname === "/api/health") {
        return sendJson(response, 200, {
          ok: true,
          supabaseConfigured: services.supabaseConfigured
        });
      }

      if (request.method === "GET" && url.pathname === "/api/foods") {
        return sendJson(response, 200, await services.foods.getFoods());
      }

      if (request.method === "POST" && url.pathname === "/api/foods") {
        return sendJson(response, 201, await services.foods.createFood(await readBody<NewFoodPayload>(request)));
      }

      const foodId = getPathId(url.pathname, "/api/foods/");
      if (foodId && request.method === "PUT") {
        return sendJson(response, 200, await services.foods.updateFood(foodId, await readBody<NewFoodPayload>(request)));
      }

      if (foodId && request.method === "DELETE") {
        return sendJson(response, 200, await services.foods.deleteFood(foodId));
      }

      if (request.method === "GET" && url.pathname === "/api/recipes") {
        return sendJson(response, 200, await services.recipes.getRecipes());
      }

      if (request.method === "POST" && url.pathname === "/api/recipes") {
        return sendJson(response, 201, await services.recipes.createRecipe(await readBody<NewRecipePayload>(request)));
      }

      const recipeId = getPathId(url.pathname, "/api/recipes/");
      if (recipeId && request.method === "PUT") {
        return sendJson(
          response,
          200,
          await services.recipes.updateRecipe(recipeId, await readBody<NewRecipePayload>(request))
        );
      }

      if (recipeId && request.method === "DELETE") {
        return sendJson(response, 200, await services.recipes.deleteRecipe(recipeId));
      }

      return sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      const status =
        isNodeError(error) && error.code === "BAD_REQUEST" ? 400 : isNodeError(error) && error.code === "NOT_FOUND" ? 404 : 500;
      const message = error instanceof Error ? error.message : "Unexpected server error";
      return sendJson(response, status, { error: message });
    }
  };
}
