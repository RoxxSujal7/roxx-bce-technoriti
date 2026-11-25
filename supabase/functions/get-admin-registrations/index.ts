import { createSupabaseAuthLookup } from "../_shared/auth.ts";
import { createDbRateLimiter } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabaseAdmin.ts";
import { makeGetAdminRegistrationsHandler } from "./handler.ts";

Deno.serve((req) => {
  const admin = createServiceClient();
  const handler = makeGetAdminRegistrationsHandler({
    authLookup: createSupabaseAuthLookup(admin),
    rateLimiter: createDbRateLimiter(admin),
    async queryRegistrations(q) {
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

      query = query.range(q.offset, q.offset + q.limit - 1);

      const [rowsRes, summaryRes, analyticsRes, auditRes] = await Promise.all([
        query,
        q.exportCsv
          ? Promise.resolve({ data: null })
          : admin.rpc("get_registration_summary"),
        q.exportCsv
          ? Promise.resolve({ data: null, error: null })
          : admin.rpc("get_admin_dashboard_analytics"),
        q.exportCsv
          ? Promise.resolve({ data: [] })
          : admin
              .from("audit_logs")
              .select("id, actor_id, actor_role, action, target_table, target_id, details, created_at, actor:profiles!audit_logs_actor_id_fkey(full_name)")
              .order("created_at", { ascending: false })
              .limit(30),
      ]);

      if (rowsRes.error) {
        return { rows: [], total: 0, summary: {}, analytics: null, auditLogs: [], error: rowsRes.error.message };
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

      // Sanitize audit rows so participant PII/secrets are never forwarded in activity logs
      // deno-lint-ignore no-explicit-any
      const sanitizedAuditLogs = (auditRes.data ?? []).map((log: any) => {
        const rawDetails = log?.details && typeof log.details === "object" ? log.details : {};
        const safeDetails: Record<string, unknown> = {};
        for (const k of [
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
          "price_per_person_inr",
        ]) {
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
      });

      return {
        rows: rowsRes.data ?? [],
        total: rowsRes.count ?? 0,
        summary,
        analytics: analyticsRes?.error ? null : (analyticsRes?.data ?? null),
        auditLogs: sanitizedAuditLogs,
        error: null,
      };
    },
  });
  return handler(req);
});
