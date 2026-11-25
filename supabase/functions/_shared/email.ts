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
export async function sendTransactionalEmail(adminClient: any, req: EmailRequest): Promise<EmailOutcome> {
  // Check idempotency ledger first so retries never re-send
  const { data: existing } = await adminClient
    .from("email_notifications")
    .select("id, status")
    .eq("idempotency_key", req.idempotencyKey)
    .maybeSingle();

  if (existing && existing.status === "SENT") {
    return { sent: true, status: "DUPLICATE_SKIPPED" };
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromAddress = Deno.env.get("EMAIL_FROM") ?? "TECHNORITI '26 <onboarding@resend.dev>";

  if (!resendKey) {
    await adminClient.from("email_notifications").upsert(
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
      { onConflict: "idempotency_key" },
    );
    logSecurityEvent("email_skipped_unconfigured", { eventType: req.eventType });
    return { sent: false, status: "SKIPPED_UNCONFIGURED" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
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
      await adminClient.from("email_notifications").upsert(
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
        { onConflict: "idempotency_key" },
      );
      logSecurityEvent("email_provider_rejected", { eventType: req.eventType, status: res.status });
      return { sent: false, status: "FAILED" };
    }

    const payload = await res.json();
    await adminClient.from("email_notifications").upsert(
      {
        registration_id: req.registrationId ?? null,
        payment_id: req.paymentId ?? null,
        event_type: req.eventType,
        recipient_email: req.recipientEmail,
        provider: "resend",
        status: "SENT",
        provider_message_id: payload?.id ?? null,
        idempotency_key: req.idempotencyKey,
      },
      { onConflict: "idempotency_key" },
    );
    return { sent: true, status: "SENT" };
  } catch (err) {
    await adminClient.from("email_notifications").upsert(
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
      { onConflict: "idempotency_key" },
    );
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
