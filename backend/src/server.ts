import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, normalizeSupabaseUrl } from "./config/env";
import { sendJson, sendOptions } from "./http";
import { createSupabaseClient } from "./lib/supabase";
import { createApiHandler } from "./routes/api";
import { createFoodService } from "./services/foods";
import { createRecipeService } from "./services/recipes";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

await loadEnv(join(rootDir, "..", ".env"));

const port = Number(process.env.PORT || 3001);
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

const handleApi = createApiHandler({
  supabaseConfigured: supabase.configured,
  foods: createFoodService({ supabaseConfigured: supabase.configured, supabase: supabase.request }),
  recipes: createRecipeService({ supabaseConfigured: supabase.configured, supabase: supabase.request })
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
