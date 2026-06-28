type SupabaseRestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  prefer?: string;
};

const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return null;
  }
  return {
    url: url.replace(/\/$/, ""),
    serviceKey,
  };
};

export const isSupabaseConfigured = () => Boolean(getSupabaseConfig());

export async function supabaseRest<T>(
  path: string,
  options: SupabaseRestOptions = {},
): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase server credentials are not configured.");
  }

  const response = await fetch(`${config.url}/rest/v1/${path.replace(/^\//, "")}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: config.serviceKey,
      authorization: `Bearer ${config.serviceKey}`,
      "content-type": "application/json",
      ...(options.prefer ? { prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = typeof data === "object" && data && "message" in data
      ? String((data as { message: unknown }).message)
      : response.statusText;
    throw new Error(`Supabase request failed: ${detail}`);
  }
  return data as T;
}
