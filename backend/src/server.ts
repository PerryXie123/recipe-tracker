import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

await loadEnv(join(rootDir, "..", ".env"));

const port = Number(process.env.PORT || 3001);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type Food = {
  id: string;
  name: string;
  calories_per_unit: number;
  protein_per_unit: number;
  unit_label: string;
  notes?: string | null;
};

type Ingredient = {
  food_id: string;
  food_name: string;
  quantity: number;
  calories: number;
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
  protein: number;
};

type NewFoodPayload = {
  name?: string;
  calories_per_unit?: number | string;
  protein_per_unit?: number | string;
  unit_label?: string;
  notes?: string | null;
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

const demoFoods: Food[] = [
  { id: "demo-egg", name: "Egg", calories_per_unit: 75, protein_per_unit: 6, unit_label: "serving" },
  { id: "demo-oats", name: "Rolled oats", calories_per_unit: 382.4, protein_per_unit: 13.4, unit_label: "100g" },
  { id: "demo-chicken", name: "Chicken breast", calories_per_unit: 165, protein_per_unit: 31, unit_label: "100g" },
  { id: "demo-rice", name: "Rice", calories_per_unit: 170, protein_per_unit: 3.8, unit_label: "100g" },
  { id: "demo-yoghurt", name: "Greek yoghurt", calories_per_unit: 102.8, protein_per_unit: 4.6, unit_label: "100g" }
];

const demoRecipes: Recipe[] = [
  {
    id: "demo-oats-recipe",
    name: "Overnight oats",
    category: "Breakfast",
    target_plan: "1350 cal / 120 protein",
    ingredients: [
      { food_id: "demo-oats", food_name: "Rolled oats", quantity: 0.6, calories: 229.4, protein: 8 },
      { food_id: "demo-yoghurt", food_name: "Greek yoghurt", quantity: 1.5, calories: 154.2, protein: 6.9 }
    ]
  },
  {
    id: "demo-chicken-bowl",
    name: "Chicken rice bowl",
    category: "Lunch",
    target_plan: "2100 cal / 180 protein",
    ingredients: [
      { food_id: "demo-chicken", food_name: "Chicken breast", quantity: 2, calories: 330, protein: 62 },
      { food_id: "demo-rice", food_name: "Rice", quantity: 2, calories: 340, protein: 7.6 }
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

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    "access-control-allow-origin": "http://127.0.0.1:5173",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function readBody(request: IncomingMessage): Promise<NewFoodPayload> {
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
    return demoRecipes.map(withRecipeTotals);
  }

  const recipes = await supabase<SupabaseRecipe[]>("recipes?select=*&order=name.asc");
  const ingredients = await supabase<SupabaseIngredient[]>(
    "recipe_ingredients?select=id,recipe_id,quantity,foods(id,name,calories_per_unit,protein_per_unit,unit_label)"
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
          protein: Number(food.protein_per_unit) * Number(ingredient.quantity)
        };
      });

    return withRecipeTotals({ ...recipe, ingredients: rows });
  });
}

function withRecipeTotals(recipe: Recipe): RecipeWithTotals {
  const calories = recipe.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.calories || 0), 0);
  const protein = recipe.ingredients.reduce((sum, ingredient) => sum + Number(ingredient.protein || 0), 0);
  return {
    ...recipe,
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10
  };
}

async function createFood(payload: NewFoodPayload): Promise<Food> {
  const calories = Number(payload.calories_per_unit);
  const protein = Number(payload.protein_per_unit);

  if (!payload.name || !Number.isFinite(calories) || !Number.isFinite(protein)) {
    throw Object.assign(new Error("Name, calories, and protein are required"), { code: "BAD_REQUEST" });
  }

  const food = {
    name: payload.name,
    calories_per_unit: calories,
    protein_per_unit: protein,
    unit_label: payload.unit_label || "100g",
    notes: payload.notes || null
  };

  if (!supabaseUrl || !supabaseKey) {
    return { ...food, id: `demo-${Date.now()}` };
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
      return sendJson(response, 201, await createFood(await readBody(request)));
    }

    if (request.method === "GET" && url.pathname === "/api/recipes") {
      return sendJson(response, 200, await getRecipes());
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
