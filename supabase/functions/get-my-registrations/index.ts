import { createSupabaseAuthLookup } from "../_shared/auth.ts";
import { createDbRateLimiter } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabaseAdmin.ts";
import { makeGetMyRegistrationsHandler } from "./handler.ts";

Deno.serve((req) => {
  const admin = createServiceClient();
  const handler = makeGetMyRegistrationsHandler({
    authLookup: createSupabaseAuthLookup(admin),
    rateLimiter: createDbRateLimiter(admin),
    async fetchUserDashboard(userId: string) {
      const [profileRes, regRes, coordRes] = await Promise.all([
        admin
          .from("profiles")
          .select("id, email, full_name, roll_number, phone, college, branch, role, is_active, created_at")
          .eq("id", userId)
          .single(),
        admin
          .from("registrations")
          .select(`
            *,
            primary_competition:competitions!registrations_primary_arena_id_fkey(id, title, category, venue, event_date, event_time, fee_type, fee_inr),
            accommodation_plan:accommodation_plans(id, name, price_per_person_inr),
            arenas:registration_arenas(competition_id, is_primary, fee_snapshot_inr, competition:competitions(id, title, fee_type, fee_inr)),
            payments(id, utr_number, amount_inr, status, rejection_reason, submitted_at, verified_at)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("submitted_at", { referencedTable: "payments", ascending: false }),
        admin
          .from("coordinator_assignments")
          .select("id, competition_id, competition:competitions(id, title)")
          .eq("coordinator_id", userId),
      ]);

      if (profileRes.error || regRes.error || coordRes.error) {
        return {
          profile: null,
          registrations: [],
          coordinatorAssignments: [],
          error: profileRes.error?.message ?? regRes.error?.message ?? coordRes.error?.message ?? "Query failed",
        };
      }

      return {
        profile: profileRes.data,
        registrations: regRes.data ?? [],
        coordinatorAssignments: coordRes.data ?? [],
        error: null,
      };
    },
  });
  return handler(req);
});
