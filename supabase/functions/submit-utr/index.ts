import { createSupabaseAuthLookup } from "../_shared/auth.ts";
import { sendTransactionalEmail } from "../_shared/email.ts";
import { createDbRateLimiter } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabaseAdmin.ts";
import { makeSubmitUtrHandler } from "./handler.ts";

Deno.serve((req) => {
  const admin = createServiceClient();
  const handler = makeSubmitUtrHandler({
    authLookup: createSupabaseAuthLookup(admin),
    rateLimiter: createDbRateLimiter(admin),
    submitUtrRpc: async (params) => {
      const { data, error } = await admin.rpc("submit_utr_tx", params);
      return { data, error };
    },
    sendEmail: (opts) => sendTransactionalEmail(admin, opts),
  });
  return handler(req);
});
