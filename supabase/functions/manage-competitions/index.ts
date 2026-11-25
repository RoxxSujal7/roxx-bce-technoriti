import { createSupabaseAuthLookup } from "../_shared/auth.ts";
import { createDbRateLimiter } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabaseAdmin.ts";
import { makeManageCompetitionsHandler } from "./handler.ts";

Deno.serve((req) => {
  const admin = createServiceClient();
  const handler = makeManageCompetitionsHandler({
    authLookup: createSupabaseAuthLookup(admin),
    rateLimiter: createDbRateLimiter(admin),
    async listCatalog() {
      const [cRes, aRes] = await Promise.all([
        admin.from("competitions").select("*").order("num_id", { ascending: true }),
        admin.from("accommodation_plans").select("*"),
      ]);
      if (cRes.error || aRes.error) {
        return { competitions: [], accommodationPlans: [], error: cRes.error?.message ?? aRes.error?.message ?? "Failed" };
      }
      return { competitions: cRes.data ?? [], accommodationPlans: aRes.data ?? [], error: null };
    },
    async updateCompetition(id, updates) {
      const { data, error } = await admin.from("competitions").update(updates).eq("id", id).select("*").single();
      return error ? { data: null, error: error.message } : { data, error: null };
    },
    async updateAccommodationPlan(id, updates) {
      const { data, error } = await admin.from("accommodation_plans").update(updates).eq("id", id).select("*").single();
      return error ? { data: null, error: error.message } : { data, error: null };
    },
    async writeAuditLog(entry) {
      const { error } = await admin.from("audit_logs").insert(entry);
      if (error) {
        throw new Error(`Audit log append failed: ${error.message}`);
      }
    },
  });
  return handler(req);
});
