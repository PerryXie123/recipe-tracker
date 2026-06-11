export type SupabaseClient = <T>(path: string, options?: RequestInit) => Promise<T>;

export function createSupabaseClient(supabaseUrl: string | undefined, supabaseKey: string | undefined) {
  const configured = Boolean(supabaseUrl && supabaseKey);

  const request: SupabaseClient = async <T>(path: string, options: RequestInit = {}) => {
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
  };

  return { configured, request };
}

export function filterEq(column: string, value: string) {
  return `${column}=eq.${encodeURIComponent(value)}`;
}
