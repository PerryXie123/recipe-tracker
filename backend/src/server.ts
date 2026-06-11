import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

await loadEnv(join(rootDir, "..", ".env"));

const port = Number(process.env.PORT || 3001);
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type Food = {
  id: string;
  name: string;
  calories_per_unit: number;
  kj_per_unit: number;
  protein_per_unit: number;
  unit_label: string;
  notes?: string | null;
};

type Ingredient = {
  food_id: string;
  food_name: string;
  quantity: number;
  calories: number;
  kj: number;
  protein: number;
};

type Recipe = {
  id: string;
  name: string;
  category?: string | null;
  target_plan?: string | null;
  ingredients: Ingredient[];
};

type RecipeWithTotals = Recipe & {
  calories: number;
  kj: number;
  protein: number;
};

type NewFoodPayload = {
  name?: string;
  calories_per_unit?: number | string;
  kj_per_unit?: number | string;
  protein_per_unit?: number | string;
  unit_label?: string;
  notes?: string | null;
};

type NewRecipePayload = {
  name?: string;
  category?: string | null;
  target_plan?: string | null;
  ingredients?: Array<{
    food_id?: string;
    quantity?: number | string;
  }>;
};

type SupabaseRecipe = {
  id: string;
  name: string;
  category?: string | null;
  target_plan?: string | null;
};

type SupabaseIngredient = {
  id: string;
  recipe_id: string;
  quantity: number | string;
  foods: Food;
};

let demoFoods: Food[] = [
  { id: "demo-egg", name: "Egg", calories_per_unit: 75, kj_per_unit: 313.8, protein_per_unit: 6, unit_label: "serving" },
  { id: "demo-oats", name: "Rolled oats", calories_per_unit: 382.4, kj_per_unit: 1600, protein_per_unit: 13.4, unit_label: "100g" },
  { id: "demo-chicken", name: "Chicken breast", calories_per_unit: 165, kj_per_unit: 690.4, protein_per_unit: 31, unit_label: "100g" },
  { id: "demo-rice", name: "Rice", calories_per_unit: 170, kj_per_unit: 711.3, protein_per_unit: 3.8, unit_label: "100g" },
  { id: "demo-yoghurt", name: "Greek yoghurt", calories_per_unit: 102.8, kj_per_unit: 430.1, protein_per_unit: 4.6, unit_label: "100g" }
];

let demoRecipes: Recipe[] = [
  {
    id: "demo-oats-recipe",
    name: "Overnight oats",
    category: "Breakfast",
    target_plan: "1350 cal / 120 protein",
    ingredients: [
      { food_id: "demo-oats", food_name: "Rolled oats", quantity: 0.6, calories: 229.4, kj: 960, protein: 8 },
      { food_id: "demo-yoghurt", food_name: "Greek yoghurt", quantity: 1.5, calories: 154.2, kj: 645.2, protein: 6.9 }
    ]
  },
  {
    id: "demo-chicken-bowl",
    name: "Chicken rice bowl",
    category: "Lunch",
    target_plan: "2100 cal / 180 protein",
    ingredients: [
      { food_id: "demo-chicken", food_name: "Chicken breast", quantity: 2, calories: 330, kj: 1380.7, protein: 62 },
      { food_id: "demo-rice", food_name: "Rice", quantity: 2, calories: 340, kj: 1422.6, protein: 7.6 }
    ]
  }
];

async function loadEnv(filePath: string) {
  try {
    const envText = await readFile(filePath, "utf8");
    for (const line of envText.split(/\r?\n/)) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!match || match[1].startsWith("#")) {
        continue;
      }

      const key = match[1];
      const value = (match[2] || "").replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    "access-control-allow-origin": "http://127.0.0.1:5173",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function readBody<T>(request: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error("Request body must be valid JSON"), { code: "BAD_REQUEST" }));
      }
    });
    request.on("error", reject);
  });
}

async function supabase<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!supabaseUrl || !supabaseKey) {
    throw Object.assign(new Error("Supabase is not configured"), { code: "NO_SUPABASE" });
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

async function getFoods() {
  if (!supabaseUrl || !supabaseKey) {
    return demoFoods;
  }

  return supabase<Food[]>("foods?select=*&order=name.asc");
}

async function getRecipes(): Promise<RecipeWithTotals[]> {
  if (!supabaseUrl || !supabaseKey) {
    return demoRecipes.map(getDemoRecipeWithIngredientTotals);
  }

  const recipes = await supabase<SupabaseRecipe[]>("recipes?select=*&order=name.asc");
  const ingredients = await supabase<SupabaseIngredient[]>(
    "recipe_ingredients?select=id,recipe_id,quantity,foods(id,name,calories_per_unit,kj_per_unit,protein_per_unit,unit_label)"
  );

  return recipes.map((recipe) => {
    const rows = ingredients
      .filter((ingredient) => ingredient.recipe_id === recipe.id)
      .map((ingredient) => {
        const food = ingredient.foods;
        return {
          food_id: food.id,
          food_name: food.name,
          quantity: Number(ingredient.quantity),
          calories: Number(food.calories_per_unit) * Number(ingredient.quantity),
          kj: Number(food.kj_per_unit) * Number(ingredient.quantity),
          protein: Number(food.protein_per_unit) * Number(ingredient.quantity)
        };
      });

    return withRecipeTotals({ ...recipe, ingredients: rows });
  });
}

function getDemoRecipeWithIngredientTotals(recipe: Recipe): RecipeWithTotals {
  const ingredients = recipe.ingredients.map((ingredient) => {
    const food = demoFoods.find((item) => item.id === ingredient.food_id);
    if (!food) {
      return ingredient;
    }

    return {
      food_id: food.id,
      food_name: food.name,
      quantity: ingredient.quantity,
      calories: round1(food.calories_per_unit * ingredient.quantity),
      kj: round1(food.kj_per_unit * ingredient.quantity),
      protein: round1(food.protein_per_unit * ingredient.quantity)
    };
  });

  return withRecipeTotals({ ...recipe, ingredients });
}

function withRecipeTotals(recipe: Recipe): RecipeWithTotals {
  const calories = recipe.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.calories || 0), 0);
  const kj = recipe.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.kj || 0), 0);
  const protein = recipe.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.protein || 0), 0);
  return {
    ...recipe,
    calories: Math.round(calories),
    kj: round1(kj),
    protein: Math.round(protein * 10) / 10
  };
}

async function createFood(payload: NewFoodPayload): Promise<Food> {
  const submittedCalories = Number(payload.calories_per_unit);
  const submittedKj = Number(payload.kj_per_unit);
  const protein = Number(payload.protein_per_unit);
  const hasCalories = Number.isFinite(submittedCalories);
  const hasKj = Number.isFinite(submittedKj);
  const calories = hasCalories ? submittedCalories : submittedKj / 4.184;
  const kj = hasKj ? submittedKj : submittedCalories * 4.184;

  if (!payload.name || (!hasCalories && !hasKj) || !Number.isFinite(protein)) {
    throw Object.assign(new Error("Name, calories or kJ, and protein are required"), { code: "BAD_REQUEST" });
  }

  const food = {
    name: payload.name,
    calories_per_unit: round1(calories),
    kj_per_unit: round1(kj),
    protein_per_unit: protein,
    unit_label: payload.unit_label || "100g",
    notes: payload.notes || null
  };

  if (!supabaseUrl || !supabaseKey) {
    const created = { ...food, id: `demo-food-${Date.now()}` };
    demoFoods = [...demoFoods, created];
    return created;
  }

  const [created] = await supabase<Food[]>("foods", {
    method: "POST",
    body: JSON.stringify(food)
  });

  if (!created) {
    throw new Error("Supabase did not return the created food");
  }

  return created;
}

async function createRecipe(payload: NewRecipePayload): Promise<RecipeWithTotals> {
  const name = payload.name?.trim();
  const ingredients = (payload.ingredients || [])
    .map((ingredient, index) => ({
      food_id: ingredient.food_id,
      quantity: Number(ingredient.quantity),
      sort_order: index + 1
    }))
    .filter((ingredient) => ingredient.food_id && Number.isFinite(ingredient.quantity) && ingredient.quantity > 0);

  if (!name || ingredients.length === 0) {
    throw Object.assign(new Error("Recipe name and at least one ingredient amount are required"), {
      code: "BAD_REQUEST"
    });
  }

  if (!supabaseUrl || !supabaseKey) {
    const recipe: Recipe = {
      id: `demo-recipe-${Date.now()}`,
      name,
      category: payload.category || "Meal",
      target_plan: payload.target_plan || null,
      ingredients: ingredients.map((ingredient) => ({
        food_id: ingredient.food_id as string,
        food_name: "",
        quantity: ingredient.quantity,
        calories: 0,
        kj: 0,
        protein: 0
      }))
    };
    demoRecipes = [...demoRecipes, recipe];
    return getDemoRecipeWithIngredientTotals(recipe);
  }

  const [createdRecipe] = await supabase<SupabaseRecipe[]>("recipes", {
    method: "POST",
    body: JSON.stringify({
      name,
      category: payload.category || null,
      target_plan: payload.target_plan || null
    })
  });

  if (!createdRecipe) {
    throw new Error("Supabase did not return the created recipe");
  }

  await supabase("recipe_ingredients", {
    method: "POST",
    body: JSON.stringify(
      ingredients.map((ingredient) => ({
        recipe_id: createdRecipe.id,
        food_id: ingredient.food_id,
        quantity: ingredient.quantity,
        sort_order: ingredient.sort_order
      }))
    )
  });

  const [recipeWithTotals] = (await getRecipes()).filter((recipe) => recipe.id === createdRecipe.id);
  if (!recipeWithTotals) {
    throw new Error("Created recipe could not be loaded");
  }

  return recipeWithTotals;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

async function handleApi(request: IncomingMessage, response: ServerResponse, url: URL) {
  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      return sendJson(response, 200, {
        ok: true,
        supabaseConfigured: Boolean(supabaseUrl && supabaseKey)
      });
    }

    if (request.method === "GET" && url.pathname === "/api/foods") {
      return sendJson(response, 200, await getFoods());
    }

    if (request.method === "POST" && url.pathname === "/api/foods") {
      return sendJson(response, 201, await createFood(await readBody<NewFoodPayload>(request)));
    }

    if (request.method === "GET" && url.pathname === "/api/recipes") {
      return sendJson(response, 200, await getRecipes());
    }

    if (request.method === "POST" && url.pathname === "/api/recipes") {
      return sendJson(response, 201, await createRecipe(await readBody<NewRecipePayload>(request)));
    }

    return sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    const status = isNodeError(error) && error.code === "BAD_REQUEST" ? 400 : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return sendJson(response, status, { error: message });
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "http://127.0.0.1:5173",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    });
    response.end();
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    await handleApi(request, response, url);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}).listen(port, () => {
  console.log(`Recipe Tracker API running at http://127.0.0.1:${port}`);
});
