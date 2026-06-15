import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseAuthConfigured, supabase, supabaseAuthConfigMessage } from "../lib/supabase";

type AuthState = {
  accessToken?: string;
  email: string | null;
  name: string | null;
};

type StoredAuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
};

const AUTH_FALLBACK_STORAGE_KEY = "recipe-tracker-auth-session";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [authState, setAuthState] = useState<AuthState>({ email: null, name: null });
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseAuthConfigured);

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }
    const authClient = supabase;
    let isMounted = true;

    async function initialiseSession() {
      const hashSession = getSessionFromHash();
      if (hashSession) {
        setAuthState(getAuthStateFromAccessToken(hashSession.access_token));
        saveStoredAuthSession(hashSession);
        const { data, error } = await authClient.auth.setSession(toSupabaseSession(hashSession));
        if (!isMounted) {
          return;
        }
        if (error) {
          console.error("Could not restore Supabase session from redirect URL", error);
        }
        setSession(data.session);
        if (data.session) {
          saveStoredAuthSession(getStoredAuthSessionFromSupabaseSession(data.session));
          setAuthState(getAuthStateFromSession(data.session));
        }
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setIsAuthLoading(false);
        return;
      }

      const { data } = await authClient.auth.getSession();
      if (!isMounted) {
        return;
      }
      if (data.session) {
        saveStoredAuthSession(getStoredAuthSessionFromSupabaseSession(data.session));
        setSession(data.session);
        setAuthState(getAuthStateFromSession(data.session));
        setIsAuthLoading(false);
        return;
      }

      const storedSession = getStoredAuthSession();
      if (storedSession) {
        setAuthState(getAuthStateFromAccessToken(storedSession.access_token));
        const restored = await authClient.auth.setSession(toSupabaseSession(storedSession));
        if (!isMounted) {
          return;
        }

        if (restored.data.session) {
          saveStoredAuthSession(getStoredAuthSessionFromSupabaseSession(restored.data.session));
          setSession(restored.data.session);
          setAuthState(getAuthStateFromSession(restored.data.session));
        } else if (restored.error) {
          console.error("Could not restore stored Supabase session", restored.error);
        }
        setIsAuthLoading(false);
        return;
      }

      setSession(null);
      setAuthState({ email: null, name: null });
      setIsAuthLoading(false);
    }

    void initialiseSession();

    const { data } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }
      setSession(nextSession);
      if (nextSession) {
        saveStoredAuthSession(getStoredAuthSessionFromSupabaseSession(nextSession));
      }
      setAuthState((currentAuthState) =>
        nextSession ? getAuthStateFromSession(nextSession) : currentAuthState.accessToken ? currentAuthState : { email: null, name: null }
      );
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
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
    clearStoredAuthSession();
    await supabase?.auth.signOut();
    setSession(null);
    setAuthState({ email: null, name: null });
  }

  return {
    accessToken: authState.accessToken || session?.access_token,
    authConfigured: isSupabaseAuthConfigured,
    authConfigMessage: supabaseAuthConfigMessage,
    isAuthLoading,
    session,
    userEmail: authState.email,
    userName: authState.name,
    signInWithGoogle,
    signOut
  };
}

function getAuthStateFromSession(session: Session | null): AuthState {
  if (!session) {
    return { email: null, name: null };
  }

  return {
    accessToken: session.access_token,
    email: session.user.email || null,
    name:
      (session.user.user_metadata.full_name as string | undefined) ||
      (session.user.user_metadata.name as string | undefined) ||
      session.user.email?.split("@")[0] ||
      null
  };
}

function getAuthStateFromAccessToken(accessToken: string): AuthState {
  const payload = decodeJwtPayload(accessToken);
  const metadata = payload.user_metadata as Record<string, unknown> | undefined;
  const email = typeof payload.email === "string" ? payload.email : null;
  const fullName = typeof metadata?.full_name === "string" ? metadata.full_name : undefined;
  const name = typeof metadata?.name === "string" ? metadata.name : undefined;

  return {
    accessToken,
    email,
    name: fullName || name || email?.split("@")[0] || null
  };
}

function getStoredAuthSessionFromSupabaseSession(session: Session): StoredAuthSession {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at
  };
}

function toSupabaseSession(session: StoredAuthSession) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token
  };
}

function saveStoredAuthSession(session: StoredAuthSession) {
  try {
    window.localStorage.setItem(AUTH_FALLBACK_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage failures; Supabase's own storage may still work.
  }
}

function getStoredAuthSession() {
  try {
    const stored = window.localStorage.getItem(AUTH_FALLBACK_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const session = JSON.parse(stored) as StoredAuthSession;
    if (!session.access_token || !session.refresh_token) {
      clearStoredAuthSession();
      return null;
    }

    const expiresAt = session.expires_at || getJwtExpiration(session.access_token);
    if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000)) {
      clearStoredAuthSession();
      return null;
    }

    return session;
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

function clearStoredAuthSession() {
  try {
    window.localStorage.removeItem(AUTH_FALLBACK_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function getJwtExpiration(accessToken: string) {
  const payload = decodeJwtPayload(accessToken);
  return typeof payload.exp === "number" ? payload.exp : undefined;
}

function decodeJwtPayload(accessToken: string) {
  try {
    const [, encodedPayload] = accessToken.split(".");
    if (!encodedPayload) {
      return {};
    }

    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getSessionFromHash() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const expiresAt = Number(params.get("expires_at"));

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Number.isFinite(expiresAt) ? expiresAt : getJwtExpiration(accessToken)
  };
}
