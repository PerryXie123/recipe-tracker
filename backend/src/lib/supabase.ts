export type SupabaseClient = <T>(path: string, options?: RequestInit) => Promise<T>;

export function createSupabaseClient(supabaseUrl: string | undefined, supabaseKey: string | undefined) {
  const configured = Boolean(supabaseUrl && supabaseKey);

  const request = (accessToken?: string): SupabaseClient => async <T>(path: string, options: RequestInit = {}) => {
    if (!supabaseUrl || !supabaseKey) {
      throw Object.assign(new Error("Supabase is not configured"), { code: "NO_SUPABASE" });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${accessToken || supabaseKey}`,
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
  };

  return { configured, request };
}

export function filterEq(column: string, value: string) {
  return `${column}=eq.${encodeURIComponent(value)}`;
}

export type AuthContext = {
  accessToken?: string;
  userId?: string;
};

export function getAuthContext(authorizationHeader: string | string[] | undefined): AuthContext {
  const header = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const match = header?.match(/^Bearer\s+(.+)$/i);
  const accessToken = match?.[1];

  if (!accessToken) {
    return {};
  }

  return {
    accessToken,
    userId: getJwtSubject(accessToken)
  };
}

function getJwtSubject(token: string) {
  const [, payload] = token.split(".");
  if (!payload) {
    return undefined;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as { sub?: string };
    return parsed.sub;
  } catch {
    return undefined;
  }
}
