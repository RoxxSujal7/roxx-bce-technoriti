import { buildCorsHeaders, getAllowedOrigins } from "./cors.ts";
import { errorResponse, logSecurityEvent } from "./http.ts";

export type RouteHandler = (
  req: Request,
  corsHeaders: Record<string, string>,
) => Promise<Response>;

export function createEdgeHandler(
  allowedMethods: string[],
  handler: RouteHandler,
  allowedOriginsOverride?: string[],
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const origins = allowedOriginsOverride ?? getAllowedOrigins();
    const { headers: corsHeaders, originAllowed } = buildCorsHeaders(
      req.headers.get("origin"),
      origins,
    );

    if (!originAllowed) {
      logSecurityEvent("cors_origin_rejected", { origin: req.headers.get("origin") });
      return errorResponse(403, "ORIGIN_FORBIDDEN", "Origin is not allowed.", corsHeaders);
    }

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!allowedMethods.includes(req.method)) {
      return errorResponse(405, "METHOD_NOT_ALLOWED", `Method ${req.method} not allowed.`, corsHeaders);
    }

    try {
      return await handler(req, corsHeaders);
    } catch (err) {
      logSecurityEvent("unhandled_edge_error", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
      return errorResponse(500, "INTERNAL_ERROR", "An unexpected server error occurred.", corsHeaders);
    }
  };
}
