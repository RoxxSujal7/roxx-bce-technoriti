import { authenticateRequest, requirePrivilegedMfa, requireRole, type AuthLookup } from "../_shared/auth.ts";
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
  auditPage: number;
  auditLimit: number;
  auditOffset: number;
  auditAction: string | null;
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
    auditTotal?: number;
    error: string | null;
  }>;
}

const VALID_STATUSES = new Set([
  "PENDING_PAYMENT",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "REJECTED",
]);

const AUDIT_ACTION_REGEX = /^[A-Z0-9_]{2,40}$/;

const AUDIT_SAFE_DETAIL_KEYS = [
  "pass_code",
  "primary_arena_id",
  "team_size",
  "accommodation_id",
  "computed_total_inr",
  "amount_inr",
  "decision",
  "rejection_reason",
  "utr_last4",
  "previous_role",
  "new_role",
  "is_active",
  "competition_id",
  "fee_inr",
  "fee_type",
  "venue",
  "event_date",
  "event_time",
  "price_per_person_inr",
] as const;

// deno-lint-ignore no-explicit-any
export function sanitizeAuditLogRow(log: any): Record<string, unknown> {
  const rawDetails = log?.details && typeof log.details === "object" ? log.details : {};
  const safeDetails: Record<string, unknown> = {};
  for (const k of AUDIT_SAFE_DETAIL_KEYS) {
    if (rawDetails[k] !== undefined) safeDetails[k] = rawDetails[k];
  }
  const actorName = typeof log?.actor?.full_name === "string" ? log.actor.full_name.trim() : "";
  return {
    id: log.id,
    actor_id: log.actor_id,
    actor_role: log.actor_role,
    actor_name: actorName || null,
    action: log.action,
    target_table: log.target_table,
    target_id: log.target_id,
    details: safeDetails,
    created_at: log.created_at,
  };
}

export function makeGetAdminRegistrationsHandler(deps: GetAdminRegsDeps, allowedOrigins?: string[]) {
  return createEdgeHandler(["GET"], async (req, corsHeaders) => {
    const authResult = await authenticateRequest(req, deps.authLookup, corsHeaders);
    if (!authResult.ok) return authResult.response;
    const actor = authResult.actor;

    const forbidden = requireRole(actor, ["admin", "super_admin"], corsHeaders);
    if (forbidden) return forbidden;
    const mfaDenied = requirePrivilegedMfa(actor, corsHeaders);
    if (mfaDenied) return mfaDenied;

    const rateLimited = await enforceRateLimit(
      deps.rateLimiter,
      `admin_regs:${actor.id}`,
      60,
      60,
      corsHeaders,
    );
    if (rateLimited) return rateLimited;

    const url = new URL(req.url);
    const parsedPagination = parsePagination(url, 20, 50);
    const page = Math.min(parsedPagination.page, 10000);
    const limit = parsedPagination.limit;
    const offset = (page - 1) * limit;
    const statusParam = url.searchParams.get("status")?.trim() || null;
    const compParam = url.searchParams.get("competition_id")?.trim() || null;
    const rawSearch = url.searchParams.get("q")?.trim() || null;
    const exportCsv = url.searchParams.get("format") === "csv";
    const auditAction = url.searchParams.get("audit_action")?.trim().toUpperCase() || null;

    const rawAuditPage = Number(url.searchParams.get("audit_page") ?? "1");
    const rawAuditLimit = Number(url.searchParams.get("audit_limit") ?? "30");
    const auditPage = Number.isInteger(rawAuditPage) && rawAuditPage >= 1 ? Math.min(rawAuditPage, 10000) : 1;
    const auditLimit = Number.isInteger(rawAuditLimit) && rawAuditLimit >= 1 ? Math.min(rawAuditLimit, 50) : 30;
    const auditOffset = (auditPage - 1) * auditLimit;

    if (statusParam && !VALID_STATUSES.has(statusParam)) {
      return errorResponse(400, "VALIDATION_ERROR", "Invalid status filter.", corsHeaders);
    }
    if (compParam && !isValidCompetitionId(compParam)) {
      return errorResponse(400, "VALIDATION_ERROR", "Invalid competition_id filter.", corsHeaders);
    }
    if (auditAction && !AUDIT_ACTION_REGEX.test(auditAction)) {
      return errorResponse(400, "VALIDATION_ERROR", "Invalid audit_action filter.", corsHeaders);
    }

    const search = rawSearch ? rawSearch.replace(/[,%()]/g, "").slice(0, 80) : null;
    const rawExportLimit = Number(url.searchParams.get("limit") ?? "2000");
    const exportLimit = Number.isInteger(rawExportLimit) && rawExportLimit >= 1 ? Math.min(rawExportLimit, 5000) : 2000;
    const exportOffset = (page - 1) * exportLimit;

    const res = await deps.queryRegistrations({
      page,
      limit: exportCsv ? exportLimit : limit,
      offset: exportCsv ? exportOffset : offset,
      status: statusParam,
      competitionId: compParam,
      search,
      exportCsv,
      auditPage,
      auditLimit,
      auditOffset,
      auditAction,
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
          "X-Total-Count": String(res.total),
          "X-Export-Truncated": String(exportOffset + res.rows.length < res.total),
          "Access-Control-Expose-Headers": "X-Total-Count, X-Export-Truncated",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store",
        },
      });
    }

    const auditTotal = typeof res.auditTotal === "number" ? res.auditTotal : res.auditLogs.length;

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
        audit_pagination: {
          page: auditPage,
          limit: auditLimit,
          total: auditTotal,
          total_pages: Math.max(1, Math.ceil(auditTotal / auditLimit)),
        },
      },
      200,
      corsHeaders,
    );
  }, allowedOrigins);
}
