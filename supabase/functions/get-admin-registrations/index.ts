import { createSupabaseAuthLookup } from "../_shared/auth.ts";
import { createDbRateLimiter } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabaseAdmin.ts";
import { makeGetAdminRegistrationsHandler, sanitizeAuditLogRow } from "./handler.ts";

const POSTGREST_BATCH_MAX = 1000;

Deno.serve((req) => {
  const admin = createServiceClient();
  const handler = makeGetAdminRegistrationsHandler({
    authLookup: createSupabaseAuthLookup(admin),
    rateLimiter: createDbRateLimiter(admin),
    async queryRegistrations(q) {
      const buildFilteredQuery = () => {
        let query = admin
          .from("registrations")
          .select(
            `
          *,
          profile:profiles!registrations_user_id_fkey(email),
          primary_competition:competitions!registrations_primary_arena_id_fkey(id, title, category),
          arenas:registration_arenas(competition_id, is_primary, fee_snapshot_inr, competition:competitions(id, title)),
          payments(id, utr_number, amount_inr, status, rejection_reason, submitted_at, verified_at, verified_by)
        `,
            { count: "exact" },
          )
          .order("created_at", { ascending: false })
          .order("submitted_at", { referencedTable: "payments", ascending: false });

        if (q.status) {
          query = query.eq("status", q.status);
        }
        if (q.competitionId) {
          query = query.eq("primary_arena_id", q.competitionId);
        }
        if (q.search) {
          query = query.or(
            `full_name.ilike.%${q.search}%,pass_code.ilike.%${q.search}%,phone.ilike.%${q.search}%,college.ilike.%${q.search}%,roll_number.ilike.%${q.search}%`,
          );
        }
        return query;
      };

      if (q.exportCsv) {
        const collected: Record<string, unknown>[] = [];
        let totalCount = 0;
        let cursor = q.offset;
        while (collected.length < q.limit) {
          const batchSize = Math.min(POSTGREST_BATCH_MAX, q.limit - collected.length);
          const batchRes = await buildFilteredQuery().range(cursor, cursor + batchSize - 1);
          if (batchRes.error) {
            return { rows: [], total: 0, summary: {}, analytics: null, auditLogs: [], auditTotal: 0, error: batchRes.error.message };
          }
          totalCount = batchRes.count ?? totalCount;
          const chunk = batchRes.data ?? [];
          collected.push(...chunk);
          if (chunk.length < batchSize || cursor + chunk.length >= totalCount) {
            break;
          }
          cursor += chunk.length;
        }
        return {
          rows: collected,
          total: totalCount || collected.length,
          summary: {},
          analytics: null,
          auditLogs: [],
          auditTotal: 0,
          error: null,
        };
      }

      const query = buildFilteredQuery().range(q.offset, q.offset + q.limit - 1);

      let auditQuery = admin
        .from("audit_logs")
        .select(
          "id, actor_id, actor_role, action, target_table, target_id, details, created_at, actor:profiles!audit_logs_actor_id_fkey(full_name)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false });

      if (q.auditAction) {
        auditQuery = auditQuery.eq("action", q.auditAction);
      }
      auditQuery = auditQuery.range(q.auditOffset, q.auditOffset + q.auditLimit - 1);

      const [rowsRes, summaryRes, analyticsRes, auditRes] = await Promise.all([
        query,
        admin.rpc("get_registration_summary"),
        admin.rpc("get_admin_dashboard_analytics"),
        auditQuery,
      ]);

      if (rowsRes.error) {
        return { rows: [], total: 0, summary: {}, analytics: null, auditLogs: [], auditTotal: 0, error: rowsRes.error.message };
      }
      if (summaryRes.error) {
        return { rows: [], total: 0, summary: {}, analytics: null, auditLogs: [], auditTotal: 0, error: summaryRes.error.message };
      }
      if (auditRes.error) {
        return { rows: [], total: 0, summary: {}, analytics: null, auditLogs: [], auditTotal: 0, error: auditRes.error.message };
      }

      // deno-lint-ignore no-explicit-any
      const summaryRow = Array.isArray(summaryRes.data) ? summaryRes.data[0] : (summaryRes.data as any);
      const summary = {
        total_registrations: Number(summaryRow?.total_registrations ?? 0),
        pending_payment: Number(summaryRow?.pending_payment ?? 0),
        pending_verification: Number(summaryRow?.pending_verification ?? 0),
        verified: Number(summaryRow?.verified ?? 0),
        rejected: Number(summaryRow?.rejected ?? 0),
        verified_revenue_inr: Number(summaryRow?.verified_revenue_inr ?? 0),
      };

      const sanitizedAuditLogs = (auditRes.data ?? []).map(sanitizeAuditLogRow);

      return {
        rows: rowsRes.data ?? [],
        total: rowsRes.count ?? 0,
        summary,
        analytics: analyticsRes?.error ? null : (analyticsRes?.data ?? null),
        auditLogs: sanitizedAuditLogs,
        auditTotal: auditRes.count ?? sanitizedAuditLogs.length,
        error: null,
      };
    },
  });
  return handler(req);
});
