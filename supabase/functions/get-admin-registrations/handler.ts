import { authenticateRequest, requireRole, type AuthLookup } from "../_shared/auth.ts";
import { createEdgeHandler } from "../_shared/edge.ts";
import { errorResponse, jsonResponse } from "../_shared/http.ts";
import { enforceRateLimit, type RateLimiter } from "../_shared/rateLimit.ts";
import { isValidCompetitionId, parsePagination, sanitizeCsvCell } from "../_shared/validation.ts";

export interface AdminRegsQuery {
  page: number;
  limit: number;
  offset: number;
  status: string | null;
  competitionId: string | null;
  search: string | null;
  exportCsv: boolean;
}

export interface GetAdminRegsDeps {
  authLookup: AuthLookup;
  rateLimiter: RateLimiter;
  queryRegistrations(q: AdminRegsQuery): Promise<{
    rows: Record<string, unknown>[];
    total: number;
    summary: Record<string, number>;
    analytics?: Record<string, unknown> | null;
    auditLogs: Record<string, unknown>[];
    error: string | null;
  }>;
}

const VALID_STATUSES = new Set([
  "PENDING_PAYMENT",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "REJECTED",
]);

export function makeGetAdminRegistrationsHandler(deps: GetAdminRegsDeps, allowedOrigins?: string[]) {
  return createEdgeHandler(["GET"], async (req, corsHeaders) => {
    const authResult = await authenticateRequest(req, deps.authLookup, corsHeaders);
    if (!authResult.ok) return authResult.response;
    const actor = authResult.actor;

    const forbidden = requireRole(actor, ["admin", "super_admin"], corsHeaders);
    if (forbidden) return forbidden;

    const rateLimited = await enforceRateLimit(
      deps.rateLimiter,
      `admin_regs:${actor.id}`,
      60,
      60,
      corsHeaders,
    );
    if (rateLimited) return rateLimited;

    const url = new URL(req.url);
    const { page, limit, offset } = parsePagination(url, 20, 50);
    const statusParam = url.searchParams.get("status")?.trim() || null;
    const compParam = url.searchParams.get("competition_id")?.trim() || null;
    const rawSearch = url.searchParams.get("q")?.trim() || null;
    const exportCsv = url.searchParams.get("format") === "csv";

    if (statusParam && !VALID_STATUSES.has(statusParam)) {
      return errorResponse(400, "VALIDATION_ERROR", "Invalid status filter.", corsHeaders);
    }
    if (compParam && !isValidCompetitionId(compParam)) {
      return errorResponse(400, "VALIDATION_ERROR", "Invalid competition_id filter.", corsHeaders);
    }

    const search = rawSearch ? rawSearch.replace(/[,%()]/g, "").slice(0, 80) : null;

    const res = await deps.queryRegistrations({
      page,
      limit: exportCsv ? 500 : limit,
      offset: exportCsv ? 0 : offset,
      status: statusParam,
      competitionId: compParam,
      search,
      exportCsv,
    });

    if (res.error) {
      return errorResponse(500, "QUERY_FAILED", "Failed to load registrations.", corsHeaders);
    }

    if (exportCsv) {
      const headers = [
        "Pass Code",
        "Participant Name",
        "Roll Number",
        "Phone",
        "College",
        "Branch",
        "Primary Arena",
        "Team Size",
        "Accommodation",
        "Payable INR",
        "Status",
        "Latest UTR",
        "Created At",
      ];
      const csvLines = [
        headers.map(sanitizeCsvCell).join(","),
        ...res.rows.map((r) => {
          // deno-lint-ignore no-explicit-any
          const payments = Array.isArray((r as any).payments) ? (r as any).payments : [];
          const latestPay = payments[0] ?? null;
          return [
            r.pass_code,
            r.full_name,
            r.roll_number,
            r.phone,
            r.college,
            r.branch,
            // deno-lint-ignore no-explicit-any
            (r as any).primary_competition?.title ?? r.primary_arena_id,
            r.team_size,
            r.accommodation_id,
            r.computed_total_inr,
            r.status,
            latestPay?.utr_number ?? "",
            r.created_at,
          ]
            .map(sanitizeCsvCell)
            .join(",");
        }),
      ];

      return new Response(csvLines.join("\r\n"), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="technoriti26-registrations.csv"`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store",
        },
      });
    }

    return jsonResponse(
      {
        registrations: res.rows,
        pagination: {
          page,
          limit,
          total: res.total,
          total_pages: Math.max(1, Math.ceil(res.total / limit)),
        },
        summary: res.summary,
        analytics: res.analytics ?? null,
        audit_logs: res.auditLogs,
      },
      200,
      corsHeaders,
    );
  }, allowedOrigins);
}
