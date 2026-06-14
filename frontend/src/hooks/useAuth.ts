import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseAuthConfigured, supabase, supabaseAuthConfigMessage, supabasePublishableKey } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseAuthConfigured);

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAuthLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: supabasePublishableKey ? { apikey: supabasePublishableKey } : undefined
      }
    });
  }

  async function signOut() {
    await supabase?.auth.signOut();
  }

  return {
    accessToken: session?.access_token,
    authConfigured: isSupabaseAuthConfigured,
    authConfigMessage: supabaseAuthConfigMessage,
    isAuthLoading,
    session,
    userEmail: session?.user.email || null,
    userName:
      (session?.user.user_metadata.full_name as string | undefined) ||
      (session?.user.user_metadata.name as string | undefined) ||
      session?.user.email?.split("@")[0] ||
      null,
    signInWithGoogle,
    signOut
  };
}
