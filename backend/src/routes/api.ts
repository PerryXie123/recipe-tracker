import type { IncomingMessage, ServerResponse } from "node:http";
import { getPathId, readBody, sendJson } from "../http.js";
import { getAuthContext, type AuthContext } from "../lib/supabase.js";
import type { NewFoodPayload, NewRecipePayload, UserStatePayload } from "../types.js";
import { isNodeError } from "../utils/errors.js";

type ApiServices = {
  supabaseConfigured: boolean;
  foods: {
    getFoods: (auth: AuthContext) => Promise<unknown>;
    createFood: (payload: NewFoodPayload, auth: AuthContext) => Promise<unknown>;
    updateFood: (id: string, payload: NewFoodPayload, auth: AuthContext) => Promise<unknown>;
    deleteFood: (id: string, auth: AuthContext, options?: { removeReferences?: boolean }) => Promise<unknown>;
  };
  recipes: {
    getRecipes: (auth: AuthContext) => Promise<unknown>;
    createRecipe: (payload: NewRecipePayload, auth: AuthContext) => Promise<unknown>;
    updateRecipe: (id: string, payload: NewRecipePayload, auth: AuthContext) => Promise<unknown>;
    deleteRecipe: (id: string, auth: AuthContext) => Promise<unknown>;
  };
  userState: {
    getUserState: (auth: AuthContext) => Promise<unknown>;
    saveUserState: (payload: UserStatePayload, auth: AuthContext) => Promise<unknown>;
  };
};

export function createApiHandler(services: ApiServices) {
  return async function handleApi(request: IncomingMessage, response: ServerResponse, url: URL) {
    try {
      const auth = getAuthContext(request.headers.authorization, request.headers["x-kitchen-id"]);

      if (request.method === "GET" && url.pathname === "/api/health") {
        return sendJson(response, 200, {
          ok: true,
          supabaseConfigured: services.supabaseConfigured
        });
      }

      if (request.method === "GET" && url.pathname === "/api/user-state") {
        return sendJson(response, 200, await services.userState.getUserState(auth));
      }

      if (request.method === "PUT" && url.pathname === "/api/user-state") {
        return sendJson(response, 200, await services.userState.saveUserState(await readBody<UserStatePayload>(request), auth));
      }

      if (request.method === "GET" && url.pathname === "/api/foods") {
        return sendJson(response, 200, await services.foods.getFoods(auth));
      }

      if (request.method === "POST" && url.pathname === "/api/foods") {
        return sendJson(response, 201, await services.foods.createFood(await readBody<NewFoodPayload>(request), auth));
      }

      const foodId = getPathId(url.pathname, "/api/foods/");
      if (foodId && request.method === "PUT") {
        return sendJson(response, 200, await services.foods.updateFood(foodId, await readBody<NewFoodPayload>(request), auth));
      }

      if (foodId && request.method === "DELETE") {
        return sendJson(
          response,
          200,
          await services.foods.deleteFood(foodId, auth, {
            removeReferences: url.searchParams.get("removeReferences") === "true"
          })
        );
      }

      if (request.method === "GET" && url.pathname === "/api/recipes") {
        return sendJson(response, 200, await services.recipes.getRecipes(auth));
      }

      if (request.method === "POST" && url.pathname === "/api/recipes") {
        return sendJson(response, 201, await services.recipes.createRecipe(await readBody<NewRecipePayload>(request), auth));
      }

      const recipeId = getPathId(url.pathname, "/api/recipes/");
      if (recipeId && request.method === "PUT") {
        return sendJson(
          response,
          200,
          await services.recipes.updateRecipe(recipeId, await readBody<NewRecipePayload>(request), auth)
        );
      }

      if (recipeId && request.method === "DELETE") {
        return sendJson(response, 200, await services.recipes.deleteRecipe(recipeId, auth));
      }

      return sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      const status =
        isNodeError(error) && error.code === "BAD_REQUEST"
          ? 400
          : isNodeError(error) && error.code === "UNAUTHORIZED"
            ? 401
            : isNodeError(error) && error.code === "NOT_FOUND"
              ? 404
              : 500;
      const message = error instanceof Error ? error.message : "Unexpected server error";
      return sendJson(response, status, { error: message });
    }
  };
}
