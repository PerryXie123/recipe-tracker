import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseAuthConfigured, supabase, supabaseAuthConfigMessage } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseAuthConfigured);

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }
    const authClient = supabase;

    async function initialiseSession() {
      const hashSession = getSessionFromHash();
      if (hashSession) {
        const { data, error } = await authClient.auth.setSession(hashSession);
        if (error) {
          console.error("Could not restore Supabase session from redirect URL", error);
        }
        setSession(data.session);
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setIsAuthLoading(false);
        return;
      }

      const { data } = await authClient.auth.getSession();
      setSession(data.session);
      setIsAuthLoading(false);
    }

    void initialiseSession();

    const { data } = authClient.auth.onAuthStateChange((_event, nextSession) => {
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
        queryParams: {
          prompt: "select_account"
        }
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

function getSessionFromHash() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken
  };
}
