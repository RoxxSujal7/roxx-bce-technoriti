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
      const { data } = await admin
        .from("coordinator_assignments")
        .select("competition_id")
        .eq("coordinator_id", coordinatorId);
      return (data ?? []).map((r) => String(r.competition_id));
    },
    async fetchCoordinatorRegistrations({ competitionIds, assignedCompetitionIds, offset, limit }) {
      // Find all registration IDs matching any assigned competition (primary OR additional)
      let arenaQuery = admin.from("registration_arenas").select("registration_id");
      if (competitionIds.length > 0) {
        arenaQuery = arenaQuery.in("competition_id", competitionIds);
      }
      const { data: arenaRows, error: arenaErr } = await arenaQuery;
      if (arenaErr) return { rows: [], total: 0, analytics: null, error: arenaErr.message };

      const regIds = Array.from(new Set((arenaRows ?? []).map((r) => String(r.registration_id))));
      const analyticsPromise = assignedCompetitionIds.length > 0
        ? admin.rpc("get_coordinator_dashboard_analytics", { p_competition_ids: assignedCompetitionIds })
        : Promise.resolve({ data: null, error: null });

      if (competitionIds.length > 0 && regIds.length === 0) {
        const analyticsRes = await analyticsPromise;
        return { rows: [], total: 0, analytics: analyticsRes?.error ? null : (analyticsRes?.data ?? null), error: null };
      }

      // Coordinators see ONLY non-financial participant/competition fields needed for event ops
      let regQuery = admin
        .from("registrations")
        .select(
          `
          id, pass_code, full_name, roll_number, phone, college, branch,
          primary_arena_id, team_size, accommodation_id, status, created_at,
          primary_competition:competitions!registrations_primary_arena_id_fkey(id, title),
          arenas:registration_arenas(competition_id, is_primary, competition:competitions(id, title))
        `,
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (competitionIds.length > 0) {
        regQuery = regQuery.in("id", regIds);
      }

      const [regRes, analyticsRes] = await Promise.all([regQuery, analyticsPromise]);
      if (regRes.error) return { rows: [], total: 0, analytics: null, error: regRes.error.message };
      return {
        rows: regRes.data ?? [],
        total: regRes.count ?? 0,
        analytics: analyticsRes?.error ? null : (analyticsRes?.data ?? null),
        error: null,
      };
    },
  });
  return handler(req);
});
