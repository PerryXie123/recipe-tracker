import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson, sendOptions } from "../backend/src/http.js";
import { normalizeSupabaseUrl, sanitizeEnvValue } from "../backend/src/config/env.js";
import { createSupabaseClient } from "../backend/src/lib/supabase.js";
import { createApiHandler } from "../backend/src/routes/api.js";
import { createFoodService } from "../backend/src/services/foods.js";
import { createRecipeService } from "../backend/src/services/recipes.js";
import { createUserStateService } from "../backend/src/services/userState.js";

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
  recipes: createRecipeService({ supabaseConfigured: supabase.configured, createSupabase: supabase.request }),
  userState: createUserStateService({ supabaseConfigured: supabase.configured, createSupabase: supabase.request })
});

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const host = request.headers.host || "localhost";
  const url = new URL(request.url || "/", `https://${host}`);

  if (request.method === "OPTIONS") {
    sendOptions(response);
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    await handleApi(request, response, url);
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}
