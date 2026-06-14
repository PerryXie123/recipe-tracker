import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, normalizeSupabaseUrl, sanitizeEnvValue } from "./config/env.js";
import { sendJson, sendOptions } from "./http.js";
import { createSupabaseClient } from "./lib/supabase.js";
import { createApiHandler } from "./routes/api.js";
import { createFoodService } from "./services/foods.js";
import { createRecipeService } from "./services/recipes.js";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

await loadEnv(join(rootDir, "..", ".env"));

const port = Number(process.env.PORT || 3001);
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const supabaseKey =
  sanitizeEnvValue(process.env.SUPABASE_ANON_KEY) ||
  sanitizeEnvValue(process.env.SUPABASE_PUBLISHABLE_KEY) ||
  sanitizeEnvValue(process.env.SUPABASE_KEY) ||
  sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

const handleApi = createApiHandler({
  supabaseConfigured: supabase.configured,
  foods: createFoodService({ supabaseConfigured: supabase.configured, createSupabase: supabase.request }),
  recipes: createRecipeService({ supabaseConfigured: supabase.configured, createSupabase: supabase.request })
});

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

  if (request.method === "OPTIONS") {
    sendOptions(response);
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
