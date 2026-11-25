import { authenticateRequest, type AuthLookup } from "../_shared/auth.ts";
import { createEdgeHandler } from "../_shared/edge.ts";
import { sendTransactionalEmail, escapeHtml, type EmailOutcome } from "../_shared/email.ts";
import { errorResponse, jsonResponse, logSecurityEvent, parseJsonBody } from "../_shared/http.ts";
import { enforceRateLimit, type RateLimiter } from "../_shared/rateLimit.ts";
import { cleanPhone10, cleanText, isValidCompetitionId, parseStrictInt } from "../_shared/validation.ts";

export interface RegistrationDeps {
  authLookup: AuthLookup;
  rateLimiter: RateLimiter;
  createRegistrationRpc(params: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: { code?: string; message: string } | null }>;
  sendEmail(opts: Parameters<typeof sendTransactionalEmail>[1]): Promise<EmailOutcome>;
  upiConfig?: { vpa: string; payeeName: string };
}

const FORBIDDEN_CLIENT_FIELDS = [
  "user_id",
  "userId",
  "role",
  "status",
  "computed_total_inr",
  "total_amount",
  "totalPayable",
  "amount",
  "amount_inr",
  "pass_code",
];

const VALID_ACCOMMODATIONS = new Set(["none", "lodging", "mess", "both"]);

export function makeCreateRegistrationHandler(deps: RegistrationDeps, allowedOrigins?: string[]) {
  return createEdgeHandler(["POST"], async (req, corsHeaders) => {
    const authResult = await authenticateRequest(req, deps.authLookup, corsHeaders);
    if (!authResult.ok) return authResult.response;
    const actor = authResult.actor;

    const rateLimited = await enforceRateLimit(
      deps.rateLimiter,
      `create_reg:${actor.id}`,
      15,
      300,
      corsHeaders,
    );
    if (rateLimited) return rateLimited;

    const parsed = await parseJsonBody<Record<string, unknown>>(req);
    if (!parsed.ok) {
      return errorResponse(parsed.status, "INVALID_JSON", parsed.message, corsHeaders);
    }
    const body = parsed.data;

    // Explicitly reject client price tampering & mass assignment attempts
    for (const forbidden of FORBIDDEN_CLIENT_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, forbidden)) {
        logSecurityEvent("mass_assignment_or_price_tamper_attempt", {
          userId: actor.id,
          field: forbidden,
        });
        return errorResponse(
          400,
          "FORBIDDEN_FIELDS",
          `Client-supplied field '${forbidden}' is not accepted. Totals and status are calculated server-side.`,
          corsHeaders,
        );
      }
    }

    const fullName = cleanText(body.full_name, 2, 120);
    const rollNumber = cleanText(body.roll_number, 2, 40);
    const phone = cleanPhone10(body.phone);
    const college = cleanText(body.college, 2, 160);
    const branch = cleanText(body.branch, 2, 120);
    const primaryArenaId = isValidCompetitionId(body.primary_arena_id) ? body.primary_arena_id.trim() : null;
    const accommodationId = typeof body.accommodation_id === "string" && VALID_ACCOMMODATIONS.has(body.accommodation_id)
      ? body.accommodation_id
      : null;

    const teamSize = parseStrictInt(body.team_size, 1, 20);
    if (!fullName || !rollNumber || !phone || !college || !branch || !primaryArenaId || !accommodationId) {
      return errorResponse(400, "VALIDATION_ERROR", "All delegate, arena, phone (10 digits), and accommodation fields are required.", corsHeaders);
    }

    if (teamSize === null) {
      return errorResponse(400, "VALIDATION_ERROR", "Team size must be a whole number between 1 and 20.", corsHeaders);
    }

    const rawAdditional = body.additional_arena_ids ?? [];
    if (!Array.isArray(rawAdditional) || rawAdditional.length > 10) {
      return errorResponse(400, "VALIDATION_ERROR", "Additional arenas must be an array of at most 10 competition IDs.", corsHeaders);
    }

    const additionalArenaIds: string[] = [];
    for (const item of rawAdditional) {
      if (!isValidCompetitionId(item)) {
        return errorResponse(400, "VALIDATION_ERROR", "Invalid competition ID in additional_arena_ids.", corsHeaders);
      }
      const cleanId = item.trim();
      if (cleanId !== primaryArenaId && !additionalArenaIds.includes(cleanId)) {
        additionalArenaIds.push(cleanId);
      }
    }

    const headerIdemp = req.headers.get("x-idempotency-key");
    const idempotencyKey = cleanText(body.idempotency_key ?? headerIdemp, 8, 100);

    const { data, error } = await deps.createRegistrationRpc({
      p_user_id: actor.id,
      p_full_name: fullName,
      p_roll_number: rollNumber,
      p_phone: phone,
      p_college: college,
      p_branch: branch,
      p_primary_arena_id: primaryArenaId,
      p_team_size: teamSize,
      p_additional_arena_ids: additionalArenaIds,
      p_accommodation_id: accommodationId,
      p_idempotency_key: idempotencyKey,
    });

    if (error || !data) {
      const code = error?.code ?? "";
      if (code === "22023") {
        return errorResponse(400, "VALIDATION_ERROR", error?.message ?? "Invalid competition or team configuration.", corsHeaders);
      }
      if (code === "42501") {
        return errorResponse(403, "FORBIDDEN", "Account not permitted to register.", corsHeaders);
      }
      logSecurityEvent("create_registration_rpc_failed", { userId: actor.id, code });
      return errorResponse(500, "REGISTRATION_FAILED", "Could not create registration.", corsHeaders);
    }

    const upiVpa = deps.upiConfig?.vpa ?? Deno.env.get("UPI_VPA") ?? "";
    const upiPayeeName = deps.upiConfig?.payeeName ?? Deno.env.get("UPI_PAYEE_NAME") ?? "Technoriti 2026 BCE";
    const totalInr = Number(data.computed_total_inr ?? 0);
    const passCode = String(data.pass_code ?? "");

    const emailOutcome = await deps.sendEmail({
      registrationId: String(data.id),
      eventType: "REGISTRATION_CREATED",
      recipientEmail: actor.email,
      subject: `TECHNORITI '26 Registration Created (${passCode})`,
      html: `<p>Hello ${escapeHtml(fullName)},</p><p>Your registration <strong>${escapeHtml(passCode)}</strong> was created with an authoritative payable amount of <strong>Rs. ${totalInr}</strong>.</p><p>Status: <strong>PENDING PAYMENT</strong>. Complete UPI payment and submit your 12-digit UTR in the portal.</p>`,
      idempotencyKey: `reg_created:${String(data.id)}`,
    });

    return jsonResponse(
      {
        registration: data,
        upi_payment: {
          configured: Boolean(upiVpa),
          vpa: upiVpa || null,
          payee_name: upiPayeeName,
          amount_inr: totalInr,
          transaction_note: passCode,
        },
        notification: emailOutcome,
      },
      201,
      corsHeaders,
    );
  }, allowedOrigins);
}
