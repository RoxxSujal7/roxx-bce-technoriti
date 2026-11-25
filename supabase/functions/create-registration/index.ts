import { createSupabaseAuthLookup } from "../_shared/auth.ts";
import { sendTransactionalEmail } from "../_shared/email.ts";
import { createDbRateLimiter } from "../_shared/rateLimit.ts";
import { createServiceClient } from "../_shared/supabaseAdmin.ts";
import { makeCreateRegistrationHandler } from "./handler.ts";

Deno.serve((req) => {
  const admin = createServiceClient();
  const handler = makeCreateRegistrationHandler({
    authLookup: createSupabaseAuthLookup(admin),
    rateLimiter: createDbRateLimiter(admin),
    createRegistrationRpc: async (params) => {
      const { data, error } = await admin.rpc("create_registration_tx", params);
      return { data, error };
    },
    sendEmail: (opts) => sendTransactionalEmail(admin, opts),
  });
  return handler(req);
});
