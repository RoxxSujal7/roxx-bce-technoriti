export function jsonResponse(
  body: unknown,
  status = 200,
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  corsHeaders: Record<string, string> = {},
): Response {
  return jsonResponse({ error: { code, message } }, status, corsHeaders);
}

export async function parseJsonBody<T = Record<string, unknown>>(
  req: Request,
  maxBytes = 32_768,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  try {
    const text = await req.text();
    if (text.length > maxBytes) {
      return { ok: false, status: 413, message: "Request payload too large." };
    }
    if (!text.trim()) {
      return { ok: false, status: 400, message: "Request body is required." };
    }
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, status: 400, message: "JSON object payload required." };
    }
    return { ok: true, data: parsed as T };
  } catch {
    return { ok: false, status: 400, message: "Malformed JSON request body." };
  }
}

export function logSecurityEvent(
  event: string,
  meta: Record<string, unknown> = {},
): void {
  // Never emit secrets, JWTs, passwords, or full UTRs
  const safeMeta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const lk = k.toLowerCase();
    if (lk.includes("token") || lk.includes("secret") || lk.includes("password") || lk === "utr" || lk === "utr_number") {
      safeMeta[k] = "[REDACTED]";
    } else {
      safeMeta[k] = v;
    }
  }
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...safeMeta }));
}
