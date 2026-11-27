export const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export function getAllowedOrigins(envVal?: string, supabaseUrlOverride?: string): string[] {
  const raw = envVal ?? Deno.env.get("ALLOWED_ORIGINS") ?? "";
  const configured = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (configured.length > 0) return configured;
  const supaUrl = (supabaseUrlOverride ?? Deno.env.get("SUPABASE_URL") ?? "").trim().toLowerCase();
  const isHostedNonLocal =
    Boolean(supaUrl) &&
    !supaUrl.includes("localhost") &&
    !supaUrl.includes("127.0.0.1");
  return isHostedNonLocal ? [] : DEFAULT_ALLOWED_ORIGINS;
}

export function buildCorsHeaders(
  origin: string | null,
  allowedOrigins: string[],
): { headers: Record<string, string>; originAllowed: boolean } {
  const baseHeaders: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key",
    "Vary": "Origin",
  };

  if (!origin) {
    // Non-browser API clients (curl, server tests) do not send Origin
    return { headers: baseHeaders, originAllowed: true };
  }

  const normalized = origin.replace(/\/+$/, "");
  const matched = allowedOrigins.some((allowed) => allowed.replace(/\/+$/, "") === normalized);
  if (!matched) {
    return { headers: baseHeaders, originAllowed: false };
  }

  return {
    headers: {
      ...baseHeaders,
      "Access-Control-Allow-Origin": normalized,
    },
    originAllowed: true,
  };
}
