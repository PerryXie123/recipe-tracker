import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson, sendOptions } from "../backend/src/http";
import { normalizeSupabaseUrl } from "../backend/src/config/env";
import { createSupabaseClient } from "../backend/src/lib/supabase";
import { createApiHandler } from "../backend/src/routes/api";
import { createFoodService } from "../backend/src/services/foods";
import { createRecipeService } from "../backend/src/services/recipes";

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

const handleApi = createApiHandler({
  supabaseConfigured: supabase.configured,
  foods: createFoodService({ supabaseConfigured: supabase.configured, createSupabase: supabase.request }),
  recipes: createRecipeService({ supabaseConfigured: supabase.configured, createSupabase: supabase.request })
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
