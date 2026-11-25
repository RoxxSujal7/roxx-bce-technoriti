import { authenticateRequest, requireRole, type AuthLookup } from "../_shared/auth.ts";
import { createEdgeHandler } from "../_shared/edge.ts";
import { sendTransactionalEmail, escapeHtml, type EmailOutcome } from "../_shared/email.ts";
import { errorResponse, jsonResponse, logSecurityEvent, parseJsonBody } from "../_shared/http.ts";
import { enforceRateLimit, type RateLimiter } from "../_shared/rateLimit.ts";
import { cleanText, isValidUuid, parseStrictInt } from "../_shared/validation.ts";

export interface VerifyPaymentDeps {
  authLookup: AuthLookup;
  rateLimiter: RateLimiter;
  verifyPaymentRpc(params: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: { code?: string; message: string } | null }>;
  fetchPaymentOwnerContext(registrationId: string): Promise<{ email: string; full_name: string; pass_code: string } | null>;
  sendEmail(opts: Parameters<typeof sendTransactionalEmail>[1]): Promise<EmailOutcome>;
}

export function makeVerifyPaymentHandler(deps: VerifyPaymentDeps, allowedOrigins?: string[]) {
  return createEdgeHandler(["POST"], async (req, corsHeaders) => {
    const authResult = await authenticateRequest(req, deps.authLookup, corsHeaders);
    if (!authResult.ok) return authResult.response;
    const actor = authResult.actor;

    const forbidden = requireRole(actor, ["admin", "super_admin"], corsHeaders);
    if (forbidden) return forbidden;

    const rateLimited = await enforceRateLimit(
      deps.rateLimiter,
      `verify_payment:${actor.id}`,
      60,
      60,
      corsHeaders,
    );
    if (rateLimited) return rateLimited;

    const parsed = await parseJsonBody<Record<string, unknown>>(req);
    if (!parsed.ok) {
      return errorResponse(parsed.status, "INVALID_JSON", parsed.message, corsHeaders);
    }
    const body = parsed.data;

    const paymentId = body.payment_id;
    const decision = body.decision;
    if (!isValidUuid(paymentId)) {
      return errorResponse(400, "VALIDATION_ERROR", "Valid payment_id UUID is required.", corsHeaders);
    }
    if (decision !== "VERIFIED" && decision !== "REJECTED") {
      return errorResponse(400, "VALIDATION_ERROR", "decision must be 'VERIFIED' or 'REJECTED'.", corsHeaders);
    }

    let confirmedAmount: number | null = null;
    let rejectionReason: string | null = null;

    if (decision === "VERIFIED") {
      const amt = parseStrictInt(body.confirmed_amount_inr, 0, 1_000_000);
      if (amt === null) {
        return errorResponse(400, "VALIDATION_ERROR", "confirmed_amount_inr matching bank statement (integer INR) is required to verify payment.", corsHeaders);
      }
      confirmedAmount = amt;
    } else {
      rejectionReason = cleanText(body.rejection_reason, 5, 300);
      if (!rejectionReason) {
        return errorResponse(400, "VALIDATION_ERROR", "A rejection_reason (5-300 characters) is required when rejecting payment.", corsHeaders);
      }
    }

    const { data, error } = await deps.verifyPaymentRpc({
      p_admin_id: actor.id,
      p_payment_id: paymentId.trim(),
      p_decision: decision,
      p_rejection_reason: rejectionReason,
      p_confirmed_amount_inr: confirmedAmount,
    });

    if (error || !data) {
      const code = error?.code ?? "";
      if (code === "42501") {
        return errorResponse(403, "FORBIDDEN", "Admin authorization required.", corsHeaders);
      }
      if (code === "P0002") {
        return errorResponse(404, "NOT_FOUND", "Payment record not found.", corsHeaders);
      }
      if (code === "22023") {
        const msg = error?.message ?? "Invalid payment verification state.";
        const status = msg.includes("already been processed") ? 409 : 400;
        return errorResponse(status, status === 409 ? "ALREADY_PROCESSED" : "VALIDATION_ERROR", msg, corsHeaders);
      }
      logSecurityEvent("verify_payment_rpc_failed", { adminId: actor.id, code });
      return errorResponse(500, "VERIFICATION_FAILED", "Could not verify payment.", corsHeaders);
    }

    let emailOutcome: EmailOutcome = { sent: false, status: "SKIPPED_UNCONFIGURED" };
    const regCtx = await deps.fetchPaymentOwnerContext(String(data.registration_id));
    if (regCtx?.email) {
      if (decision === "VERIFIED") {
        emailOutcome = await deps.sendEmail({
          registrationId: String(data.registration_id),
          paymentId: String(data.id),
          eventType: "PAYMENT_VERIFIED",
          recipientEmail: regCtx.email,
          subject: `TECHNORITI '26 Pass Confirmed (${regCtx.pass_code})`,
          html: `<p>Hello ${escapeHtml(regCtx.full_name)},</p><p>Your payment of <strong>Rs. ${Number(data.amount_inr ?? 0)}</strong> has been verified by the BCE Bhagalpur Accounts Desk.</p><p>Official Pass Code: <strong>${escapeHtml(regCtx.pass_code)}</strong>.</p>`,
          idempotencyKey: `pay_verified:${String(data.id)}`,
        });
      } else {
        emailOutcome = await deps.sendEmail({
          registrationId: String(data.registration_id),
          paymentId: String(data.id),
          eventType: "PAYMENT_REJECTED",
          recipientEmail: regCtx.email,
          subject: `TECHNORITI '26 Payment Action Required (${regCtx.pass_code})`,
          html: `<p>Hello ${escapeHtml(regCtx.full_name)},</p><p>Your submitted UTR could not be verified. Reason: <strong>${escapeHtml(rejectionReason ?? "")}</strong>.</p><p>Please sign in to submit a valid UTR retry from your dashboard.</p>`,
          idempotencyKey: `pay_rejected:${String(data.id)}`,
        });
      }
    }

    return jsonResponse({ payment: data, notification: emailOutcome }, 200, corsHeaders);
  }, allowedOrigins);
}
