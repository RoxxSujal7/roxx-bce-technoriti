import { logSecurityEvent } from "./http.ts";

export interface EmailRequest {
  registrationId?: string;
  paymentId?: string;
  eventType:
    | "REGISTRATION_CREATED"
    | "UTR_SUBMITTED"
    | "PAYMENT_VERIFIED"
    | "PAYMENT_REJECTED";
  recipientEmail: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}

export interface EmailOutcome {
  sent: boolean;
  status: "SENT" | "SKIPPED_UNCONFIGURED" | "FAILED" | "DUPLICATE_SKIPPED";
}

// deno-lint-ignore no-explicit-any
async function recordEmailLedger(adminClient: any, row: Record<string, unknown>, eventType: string): Promise<void> {
  try {
    const { error } = await adminClient
      .from("email_notifications")
      .upsert(row, { onConflict: "idempotency_key" });
    if (error) {
      logSecurityEvent("email_ledger_write_failed", { eventType, code: String(error.code ?? "DB_ERR") });
    }
  } catch {
    logSecurityEvent("email_ledger_write_failed", { eventType, code: "EXCEPTION" });
  }
}

// deno-lint-ignore no-explicit-any
export async function sendTransactionalEmail(adminClient: any, req: EmailRequest): Promise<EmailOutcome> {
  // Check idempotency ledger first so retries never re-send
  try {
    const { data: existing, error: lookupErr } = await adminClient
      .from("email_notifications")
      .select("id, status")
      .eq("idempotency_key", req.idempotencyKey)
      .maybeSingle();

    if (lookupErr) {
      logSecurityEvent("email_ledger_lookup_failed", { eventType: req.eventType, code: String(lookupErr.code ?? "DB_ERR") });
    } else if (existing && existing.status === "SENT") {
      return { sent: true, status: "DUPLICATE_SKIPPED" };
    }
  } catch {
    logSecurityEvent("email_ledger_lookup_failed", { eventType: req.eventType, code: "EXCEPTION" });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromAddress = Deno.env.get("EMAIL_FROM") ?? "TECHNORITI '26 <onboarding@resend.dev>";

  if (!resendKey) {
    await recordEmailLedger(
      adminClient,
      {
        registration_id: req.registrationId ?? null,
        payment_id: req.paymentId ?? null,
        event_type: req.eventType,
        recipient_email: req.recipientEmail,
        provider: "resend",
        status: "SKIPPED_UNCONFIGURED",
        error_message: "RESEND_API_KEY not configured",
        idempotency_key: req.idempotencyKey,
      },
      req.eventType,
    );
    logSecurityEvent("email_skipped_unconfigured", { eventType: req.eventType });
    return { sent: false, status: "SKIPPED_UNCONFIGURED" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [req.recipientEmail],
        subject: req.subject,
        html: req.html,
      }),
    });

    if (!res.ok) {
      const errText = (await res.text()).slice(0, 240);
      await recordEmailLedger(
        adminClient,
        {
          registration_id: req.registrationId ?? null,
          payment_id: req.paymentId ?? null,
          event_type: req.eventType,
          recipient_email: req.recipientEmail,
          provider: "resend",
          status: "FAILED",
          error_message: `HTTP ${res.status}: ${errText}`,
          idempotency_key: req.idempotencyKey,
        },
        req.eventType,
      );
      logSecurityEvent("email_provider_rejected", { eventType: req.eventType, status: res.status });
      return { sent: false, status: "FAILED" };
    }

    const rawBody = await res.text();
    let payloadId: string | null = null;
    try {
      const parsed = JSON.parse(rawBody) as { id?: unknown };
      if (typeof parsed?.id === "string") payloadId = parsed.id;
    } catch {
      // Provider accepted (2xx) but returned non-JSON body; still treat as SENT
    }

    await recordEmailLedger(
      adminClient,
      {
        registration_id: req.registrationId ?? null,
        payment_id: req.paymentId ?? null,
        event_type: req.eventType,
        recipient_email: req.recipientEmail,
        provider: "resend",
        status: "SENT",
        provider_message_id: payloadId,
        idempotency_key: req.idempotencyKey,
      },
      req.eventType,
    );
    return { sent: true, status: "SENT" };
  } catch (err) {
    await recordEmailLedger(
      adminClient,
      {
        registration_id: req.registrationId ?? null,
        payment_id: req.paymentId ?? null,
        event_type: req.eventType,
        recipient_email: req.recipientEmail,
        provider: "resend",
        status: "FAILED",
        error_message: err instanceof Error ? err.message.slice(0, 240) : "Network error",
        idempotency_key: req.idempotencyKey,
      },
      req.eventType,
    );
    logSecurityEvent("email_transport_failed", { eventType: req.eventType });
    return { sent: false, status: "FAILED" };
  }
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
