import { jsonResponse, logSecurityEvent } from "./http.ts";

export interface RateLimiter {
  check(bucketKey: string, limit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    retryAfterSeconds: number;
  }>;
}

// deno-lint-ignore no-explicit-any
export function createDbRateLimiter(adminClient: any): RateLimiter {
  return {
    async check(bucketKey: string, limit: number, windowSeconds: number) {
      const { data, error } = await adminClient.rpc("check_and_increment_rate_limit", {
        p_bucket_key: bucketKey,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });

      if (error || !Array.isArray(data) || data.length === 0) {
        logSecurityEvent("rate_limit_rpc_error", { bucketKey });
        // Fail closed with brief retry to avoid silent bypass on DB fault
        return { allowed: false, retryAfterSeconds: 10 };
      }

      const row = data[0];
      return {
        allowed: Boolean(row.allowed),
        retryAfterSeconds: Number(row.retry_after_seconds ?? windowSeconds),
      };
    },
  };
}

export function getClientIp(req: Request): string {
  // Prefer gateway-populated single-value headers over client-spoofable X-Forwarded-For
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const realIp = req.headers.get("x-real-ip");
  return realIp ? realIp.trim() : "unknown";
}

export async function enforceRateLimit(
  limiter: RateLimiter,
  bucketKey: string,
  limit: number,
  windowSeconds: number,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const result = await limiter.check(bucketKey, limit, windowSeconds);
  if (!result.allowed) {
    logSecurityEvent("rate_limit_exceeded", { bucketKey, limit, windowSeconds });
    return new Response(
      JSON.stringify({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Please wait before trying again.",
        },
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Retry-After": String(result.retryAfterSeconds),
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
  return null;
}
