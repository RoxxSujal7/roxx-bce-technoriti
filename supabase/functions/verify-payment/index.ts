import { createSupabaseAuthLookup } from "../_shared/auth.ts";
import { sendTransactionalEmail } from "../_shared/email.ts";
import { createDbRateLimiter } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabaseAdmin.ts";
import { makeVerifyPaymentHandler } from "./handler.ts";

Deno.serve((req) => {
  const admin = createServiceClient();
  const handler = makeVerifyPaymentHandler({
    authLookup: createSupabaseAuthLookup(admin),
    rateLimiter: createDbRateLimiter(admin),
    verifyPaymentRpc: async (params) => {
      const { data, error } = await admin.rpc("verify_payment_tx", params);
      return { data, error };
    },
    async fetchPaymentOwnerContext(registrationId: string) {
      const { data } = await admin
        .from("registrations")
        .select("pass_code, full_name, profile:profiles(email)")
        .eq("id", registrationId)
        .maybeSingle();
      if (!data) return null;
      // deno-lint-ignore no-explicit-any
      const profile = (data as any).profile;
      return {
        pass_code: String(data.pass_code),
        full_name: String(data.full_name),
        email: String(profile?.email ?? ""),
      };
    },
    sendEmail: (opts) => sendTransactionalEmail(admin, opts),
  });
  return handler(req);
});
