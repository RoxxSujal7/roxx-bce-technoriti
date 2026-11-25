import { authenticateRequest, type AuthLookup } from "../_shared/auth.ts";
import { createEdgeHandler } from "../_shared/edge.ts";
import { sendTransactionalEmail, escapeHtml, type EmailOutcome } from "../_shared/email.ts";
import { errorResponse, jsonResponse, logSecurityEvent, parseJsonBody } from "../_shared/http.ts";
import { enforceRateLimit, type RateLimiter } from "../_shared/rateLimit.ts";
import { cleanUtr12, isValidUuid } from "../_shared/validation.ts";

export interface SubmitUtrDeps {
  authLookup: AuthLookup;
  rateLimiter: RateLimiter;
  submitUtrRpc(params: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: { code?: string; message: string } | null }>;
  sendEmail(opts: Parameters<typeof sendTransactionalEmail>[1]): Promise<EmailOutcome>;
}

const FORBIDDEN_FIELDS = ["status", "amount_inr", "verified_by", "verified_at", "user_id"];

export function makeSubmitUtrHandler(deps: SubmitUtrDeps, allowedOrigins?: string[]) {
  return createEdgeHandler(["POST"], async (req, corsHeaders) => {
    const authResult = await authenticateRequest(req, deps.authLookup, corsHeaders);
    if (!authResult.ok) return authResult.response;
    const actor = authResult.actor;

    const rateLimited = await enforceRateLimit(
      deps.rateLimiter,
      `submit_utr:${actor.id}`,
      10,
      300,
      corsHeaders,
    );
    if (rateLimited) return rateLimited;

    const parsed = await parseJsonBody<Record<string, unknown>>(req);
    if (!parsed.ok) {
      return errorResponse(parsed.status, "INVALID_JSON", parsed.message, corsHeaders);
    }
    const body = parsed.data;

    for (const forbidden of FORBIDDEN_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, forbidden)) {
        return errorResponse(400, "FORBIDDEN_FIELDS", `Field '${forbidden}' cannot be set by client.`, corsHeaders);
      }
    }

    const registrationId = body.registration_id;
    const utrNumber = cleanUtr12(body.utr_number);

    if (!isValidUuid(registrationId)) {
      return errorResponse(400, "VALIDATION_ERROR", "Valid registration_id UUID is required.", corsHeaders);
    }
    if (!utrNumber) {
      return errorResponse(400, "INVALID_UTR", "UTR must be exactly 12 numeric digits with no spaces or letters.", corsHeaders);
    }

    const { data, error } = await deps.submitUtrRpc({
      p_user_id: actor.id,
      p_registration_id: registrationId.trim(),
      p_utr_number: utrNumber,
    });

    if (error || !data) {
      const code = error?.code ?? "";
      if (code === "23505") {
        logSecurityEvent("duplicate_or_reused_utr_blocked", {
          userId: actor.id,
          registrationId,
          utrLast4: utrNumber.slice(-4),
        });
        return errorResponse(
          409,
          "DUPLICATE_UTR",
          "This UTR number has already been submitted or rejected earlier and cannot be reused.",
          corsHeaders,
        );
      }
      if (code === "42501") {
        return errorResponse(403, "FORBIDDEN", "You can only submit UTRs for your own registration.", corsHeaders);
      }
      if (code === "P0002") {
        return errorResponse(404, "NOT_FOUND", "Registration not found.", corsHeaders);
      }
      if (code === "22023") {
        return errorResponse(400, "INVALID_STATE", error?.message ?? "Registration cannot accept UTR in current state.", corsHeaders);
      }
      logSecurityEvent("submit_utr_rpc_failed", { userId: actor.id, code });
      return errorResponse(500, "SUBMISSION_FAILED", "Could not record UTR submission.", corsHeaders);
    }

    const emailOutcome = await deps.sendEmail({
      registrationId: String(data.registration_id),
      paymentId: String(data.id),
      eventType: "UTR_SUBMITTED",
      recipientEmail: actor.email,
      subject: `TECHNORITI '26 UTR Received — Pending Verification`,
      html: `<p>Hello ${escapeHtml(actor.full_name || "Delegate")},</p><p>We received UTR ending in <strong>${escapeHtml(utrNumber.slice(-4))}</strong> for Rs. ${Number(data.amount_inr ?? 0)}.</p><p>Current Status: <strong>PENDING VERIFICATION</strong>. Accounts desk reconciliation will confirm your pass once matched with institutional bank records.</p>`,
      idempotencyKey: `utr_submitted:${String(data.id)}`,
    });

    return jsonResponse({ payment: data, notification: emailOutcome }, 201, corsHeaders);
  }, allowedOrigins);
}
