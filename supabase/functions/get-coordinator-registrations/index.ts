import { createSupabaseAuthLookup } from "../_shared/auth.ts";
import { createDbRateLimiter } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabaseAdmin.ts";
import { makeGetCoordinatorRegistrationsHandler } from "./handler.ts";

Deno.serve((req) => {
  const admin = createServiceClient();
  const handler = makeGetCoordinatorRegistrationsHandler({
    authLookup: createSupabaseAuthLookup(admin),
    rateLimiter: createDbRateLimiter(admin),
    async getAssignedCompetitionIds(coordinatorId) {
      const { data, error } = await admin
        .from("coordinator_assignments")
        .select("competition_id")
        .eq("coordinator_id", coordinatorId);
      if (error) {
        throw new Error(`Assigned competition lookup failed: ${error.message}`);
      }
      return (data ?? []).map((r) => String(r.competition_id));
    },
    async fetchCoordinatorRegistrations({ competitionIds, assignedCompetitionIds, offset, limit }) {
      const analyticsPromise = assignedCompetitionIds.length > 0
        ? admin.rpc("get_coordinator_dashboard_analytics", { p_competition_ids: assignedCompetitionIds })
        : Promise.resolve({ data: null, error: null });

      const pagePromise = admin.rpc("get_coordinator_registrations_page", {
        p_competition_ids: competitionIds.length > 0 ? competitionIds : null,
        p_limit: limit,
        p_offset: offset,
      });

      const [pageRes, analyticsRes] = await Promise.all([pagePromise, analyticsPromise]);
      if (pageRes.error || !pageRes.data) {
        return {
          rows: [],
          total: 0,
          analytics: null,
          error: pageRes.error?.message ?? "Failed to fetch coordinator registrations.",
        };
      }

      if (analyticsRes?.error) {
        console.error(JSON.stringify({ event: "coordinator_analytics_failed", code: analyticsRes.error.code ?? "" }));
      }

      const payload = pageRes.data as { rows?: Record<string, unknown>[]; total?: number };
      return {
        rows: Array.isArray(payload.rows) ? payload.rows : [],
        total: Number(payload.total ?? 0),
        analytics: analyticsRes?.error ? null : (analyticsRes?.data ?? null),
        error: null,
      };
    },
  });
  return handler(req);
});
