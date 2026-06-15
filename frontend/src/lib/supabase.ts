import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = normalizeSupabaseUrl(getEnvValue(import.meta.env.VITE_SUPABASE_URL));
export const supabasePublishableKey =
  getEnvValue(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  getEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  getEnvValue(import.meta.env.VITE_SUPABASE_KEY);
const hasBrowserSafeKey = Boolean(
  supabasePublishableKey &&
    !supabasePublishableKey.startsWith("sb_secret") &&
    (supabasePublishableKey.startsWith("sb_publishable") || supabasePublishableKey.startsWith("eyJ"))
);

export const supabaseAuthConfigMessage = !supabaseUrl
  ? "Add VITE_SUPABASE_URL to enable Google sign-in."
  : !supabasePublishableKey
    ? "Add VITE_SUPABASE_PUBLISHABLE_KEY to enable Google sign-in."
    : !hasBrowserSafeKey
      ? "Use the Supabase publishable/anon key, not an sb_secret key, for Google sign-in."
      : null;

export const isSupabaseAuthConfigured = Boolean(supabaseUrl && hasBrowserSafeKey);

export const supabase = isSupabaseAuthConfigured
  ? createClient(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true
      }
    })
  : null;

function getEnvValue(value: string | undefined) {
  const trimmed = value
    ?.trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^Bearer\s+/i, "")
    .replace(/\s+/g, "");
  return trimmed || undefined;
}

function normalizeSupabaseUrl(value: string | undefined) {
  return value?.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}
