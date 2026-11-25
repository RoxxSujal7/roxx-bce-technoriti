import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import type { AuthenticatedActor, AuthLookup } from "../functions/_shared/auth.ts";
import type { RateLimiter } from "../functions/_shared/rateLimit.ts";
import { makeCreateRegistrationHandler } from "../functions/create-registration/handler.ts";
import { makeSubmitUtrHandler } from "../functions/submit-utr/handler.ts";
import { makeVerifyPaymentHandler } from "../functions/verify-payment/handler.ts";
import { makeGetAdminRegistrationsHandler } from "../functions/get-admin-registrations/handler.ts";
import { makeManageAdminsHandler } from "../functions/manage-admins/handler.ts";
import { makeManageCompetitionsHandler } from "../functions/manage-competitions/handler.ts";
import { makeGetCoordinatorRegistrationsHandler } from "../functions/get-coordinator-registrations/handler.ts";
import { makeGetMyRegistrationsHandler } from "../functions/get-my-registrations/handler.ts";

const ACTORS: Record<string, AuthenticatedActor> = {
  "tok-participant": { id: "11111111-1111-4111-8111-111111111111", email: "p1@example.com", full_name: "Participant One", role: "participant", is_active: true },
  "tok-other": { id: "22222222-2222-4222-8222-222222222222", email: "p2@example.com", full_name: "Participant Two", role: "participant", is_active: true },
  "tok-coord": { id: "33333333-3333-4333-8333-333333333333", email: "coord@example.com", full_name: "Coord", role: "coordinator", is_active: true },
  "tok-admin": { id: "44444444-4444-4444-8444-444444444444", email: "admin@example.com", full_name: "Admin", role: "admin", is_active: true },
  "tok-super": { id: "55555555-5555-4555-8555-555555555555", email: "super@example.com", full_name: "Super", role: "super_admin", is_active: true },
  "tok-disabled": { id: "66666666-6666-4666-8666-666666666666", email: "disabled@example.com", full_name: "Disabled", role: "admin", is_active: false },
};

const authLookup: AuthLookup = {
  async getUserByToken(token: string) {
    const a = ACTORS[token];
    return a ? { id: a.id, email: a.email } : null;
  },
  async getProfileById(id: string) {
    return Object.values(ACTORS).find((a) => a.id === id) ?? null;
  },
};

const allowLimiter: RateLimiter = {
  async check() {
    return { allowed: true, retryAfterSeconds: 60 };
  },
};

function makeJsonReq(url: string, method: string, token?: string, body?: unknown, origin = "http://localhost:3000"): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (origin) headers["Origin"] = origin;
  return new Request(url, {
    method,
    headers,
    body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });
}

Deno.test("CORS rejects untrusted origin and auth rejects missing/invalid/disabled accounts", async () => {
  const handler = makeGetMyRegistrationsHandler(
    {
      authLookup,
      rateLimiter: allowLimiter,
      async fetchUserDashboard() {
        return { profile: {}, registrations: [], coordinatorAssignments: [], error: null };
      },
    },
    ["http://localhost:3000"],
  );

  const evilOriginRes = await handler(makeJsonReq("http://localhost/fn", "GET", "tok-participant", undefined, "https://evil.example"));
  assertEquals(evilOriginRes.status, 403);

  const unauthRes = await handler(makeJsonReq("http://localhost/fn", "GET"));
  assertEquals(unauthRes.status, 401);

  const badTokRes = await handler(makeJsonReq("http://localhost/fn", "GET", "bad-token"));
  assertEquals(badTokRes.status, 401);

  const disabledRes = await handler(makeJsonReq("http://localhost/fn", "GET", "tok-disabled"));
  assertEquals(disabledRes.status, 403);
});

Deno.test("Rate limiting returns 429 with Retry-After", async () => {
  const blockLimiter: RateLimiter = {
    async check() {
      return { allowed: false, retryAfterSeconds: 42 };
    },
  };
  const handler = makeGetMyRegistrationsHandler(
    {
      authLookup,
      rateLimiter: blockLimiter,
      async fetchUserDashboard() {
        return { profile: {}, registrations: [], coordinatorAssignments: [], error: null };
      },
    },
    ["http://localhost:3000"],
  );
  const res = await handler(makeJsonReq("http://localhost/fn", "GET", "tok-participant"));
  assertEquals(res.status, 429);
  assertEquals(res.headers.get("Retry-After"), "42");
});

Deno.test("create-registration rejects malformed JSON, price tampering, mass assignment, and tolerates email failure", async () => {
  const handler = makeCreateRegistrationHandler(
    {
      authLookup,
      rateLimiter: allowLimiter,
      async createRegistrationRpc(p) {
        if (p.p_primary_arena_id === "nukkad" && Number(p.p_team_size) < 6) {
          return { data: null, error: { code: "22023", message: "Team size 1 outside 6..15" } };
        }
        return {
          data: {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            pass_code: "TR26-A1B2C3D4E5",
            computed_total_inr: 225,
            status: "PENDING_PAYMENT",
          },
          error: null,
        };
      },
      async sendEmail() {
        return { sent: false, status: "FAILED" };
      },
      upiConfig: { vpa: "bcebhagalpur@upi", payeeName: "Technoriti 2026 BCE" },
    },
    ["http://localhost:3000"],
  );

  // Malformed JSON
  const badJson = await handler(makeJsonReq("http://localhost/fn", "POST", "tok-participant", "{broken"));
  assertEquals(badJson.status, 400);

  // Client price tampering
  const tamperRes = await handler(
    makeJsonReq("http://localhost/fn", "POST", "tok-participant", {
      full_name: "Sujal",
      roll_number: "24103",
      phone: "9876543210",
      college: "BCE",
      branch: "CSE",
      primary_arena_id: "robowar",
      team_size: 1,
      accommodation_id: "both",
      totalPayable: 1,
    }),
  );
  assertEquals(tamperRes.status, 400);

  // Mass assignment (role injection)
  const roleRes = await handler(
    makeJsonReq("http://localhost/fn", "POST", "tok-participant", {
      full_name: "Sujal",
      roll_number: "24103",
      phone: "9876543210",
      college: "BCE",
      branch: "CSE",
      primary_arena_id: "robowar",
      team_size: 1,
      accommodation_id: "both",
      role: "super_admin",
    }),
  );
  assertEquals(roleRes.status, 400);

  // Invalid team size rejected by server rule
  const teamErrRes = await handler(
    makeJsonReq("http://localhost/fn", "POST", "tok-participant", {
      full_name: "Sujal",
      roll_number: "24103",
      phone: "9876543210",
      college: "BCE",
      branch: "CSE",
      primary_arena_id: "nukkad",
      team_size: 1,
      accommodation_id: "none",
    }),
  );
  assertEquals(teamErrRes.status, 400);

  // Type coercion attack (empty string / null fee or team_size -> must NOT coerce to 0)
  const coerceTeamRes = await handler(
    makeJsonReq("http://localhost/fn", "POST", "tok-participant", {
      full_name: "Sujal",
      roll_number: "24103",
      phone: "9876543210",
      college: "BCE",
      branch: "CSE",
      primary_arena_id: "robowar",
      team_size: "",
      accommodation_id: "none",
    }),
  );
  assertEquals(coerceTeamRes.status, 400);

  // Valid creation succeeds even if email fails
  const okRes = await handler(
    makeJsonReq("http://localhost/fn", "POST", "tok-participant", {
      full_name: "Sujal",
      roll_number: "24103",
      phone: "9876543210",
      college: "BCE",
      branch: "CSE",
      primary_arena_id: "robowar",
      team_size: 1,
      accommodation_id: "both",
    }),
  );
  assertEquals(okRes.status, 201);
  const body = await okRes.json();
  assertEquals(body.registration.computed_total_inr, 225);
  assertEquals(body.notification.status, "FAILED");
});

Deno.test("submit-utr enforces 12-digit numeric UTR, ownership, and blocks duplicate/rejected UTR reuse", async () => {
  const seenUtrs = new Set(["432109876543"]);
  const handler = makeSubmitUtrHandler(
    {
      authLookup,
      rateLimiter: allowLimiter,
      async submitUtrRpc(p) {
        if (p.p_user_id !== ACTORS["tok-participant"].id) {
          return { data: null, error: { code: "42501", message: "Forbidden" } };
        }
        if (seenUtrs.has(String(p.p_utr_number))) {
          return { data: null, error: { code: "23505", message: "duplicate key violates uq_payments_utr_number" } };
        }
        seenUtrs.add(String(p.p_utr_number));
        return {
          data: {
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            registration_id: p.p_registration_id,
            utr_number: p.p_utr_number,
            amount_inr: 225,
            status: "PENDING_VERIFICATION",
          },
          error: null,
        };
      },
      async sendEmail() {
        return { sent: false, status: "SKIPPED_UNCONFIGURED" };
      },
    },
    ["http://localhost:3000"],
  );

  // Fake malformed UTR
  const badUtr = await handler(
    makeJsonReq("http://localhost/fn", "POST", "tok-participant", {
      registration_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      utr_number: "1234ABCD",
    }),
  );
  assertEquals(badUtr.status, 400);

  // Other user's registration (IDOR)
  const idorRes = await handler(
    makeJsonReq("http://localhost/fn", "POST", "tok-other", {
      registration_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      utr_number: "999988887777",
    }),
  );
  assertEquals(idorRes.status, 403);

  // Duplicate / reused UTR
  const dupRes = await handler(
    makeJsonReq("http://localhost/fn", "POST", "tok-participant", {
      registration_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      utr_number: "432109876543",
    }),
  );
  assertEquals(dupRes.status, 409);

  // Fresh unique UTR succeeds with PENDING_VERIFICATION
  const okRes = await handler(
    makeJsonReq("http://localhost/fn", "POST", "tok-participant", {
      registration_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      utr_number: "555566667777",
    }),
  );
  assertEquals(okRes.status, 201);
  const okBody = await okRes.json();
  assertEquals(okBody.payment.status, "PENDING_VERIFICATION");
});

Deno.test("verify-payment restricts to admin/super_admin, checks amount & rejection reason, handles concurrent processing", async () => {
  let processed = false;
  const handler = makeVerifyPaymentHandler(
    {
      authLookup,
      rateLimiter: allowLimiter,
      async verifyPaymentRpc(p) {
        if (processed) return { data: null, error: { code: "22023", message: "Payment has already been processed" } };
        if (p.p_decision === "VERIFIED" && p.p_confirmed_amount_inr !== 225) {
          return { data: null, error: { code: "22023", message: "Confirmed bank amount does not match" } };
        }
        processed = true;
        return {
          data: {
            id: p.p_payment_id,
            registration_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            amount_inr: 225,
            status: p.p_decision,
          },
          error: null,
        };
      },
      async fetchPaymentOwnerContext() {
        return { email: "p1@example.com", full_name: "Participant One", pass_code: "TR26-A1B2C3D4E5" };
      },
      async sendEmail() {
        return { sent: true, status: "SENT" };
      },
    },
    ["http://localhost:3000"],
  );

  // Participant & Coordinator forbidden
  assertEquals((await handler(makeJsonReq("http://localhost/fn", "POST", "tok-participant", { payment_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", decision: "VERIFIED", confirmed_amount_inr: 225 }))).status, 403);
  assertEquals((await handler(makeJsonReq("http://localhost/fn", "POST", "tok-coord", { payment_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", decision: "VERIFIED", confirmed_amount_inr: 225 }))).status, 403);

  // Reject without reason blocked
  assertEquals((await handler(makeJsonReq("http://localhost/fn", "POST", "tok-admin", { payment_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", decision: "REJECTED", rejection_reason: "no" }))).status, 400);

  // Wrong confirmed amount blocked
  assertEquals((await handler(makeJsonReq("http://localhost/fn", "POST", "tok-admin", { payment_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", decision: "VERIFIED", confirmed_amount_inr: 1 }))).status, 400);

  // Exact match succeeds
  assertEquals((await handler(makeJsonReq("http://localhost/fn", "POST", "tok-admin", { payment_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", decision: "VERIFIED", confirmed_amount_inr: 225 }))).status, 200);

  // Concurrent / repeated attempt blocked with 409
  assertEquals((await handler(makeJsonReq("http://localhost/fn", "POST", "tok-admin", { payment_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", decision: "VERIFIED", confirmed_amount_inr: 225 }))).status, 409);
});

Deno.test("get-admin-registrations RBAC + CSV formula injection protection", async () => {
  const handler = makeGetAdminRegistrationsHandler(
    {
      authLookup,
      rateLimiter: allowLimiter,
      async queryRegistrations() {
        return {
          rows: [
            {
              pass_code: "TR26-111",
              full_name: "=CMD()|calc",
              roll_number: "24103",
              phone: "9876543210",
              college: "BCE",
              branch: "CSE",
              primary_arena_id: "robowar",
              team_size: 1,
              accommodation_id: "none",
              computed_total_inr: 50,
              status: "VERIFIED",
              payments: [{ utr_number: "123456789012" }],
              created_at: "2026-11-25T00:00:00Z",
            },
          ],
          total: 1,
          summary: { total_registrations: 1 },
          analytics: {
            timezone: "Asia/Kolkata",
            kpis: {
              total_registrations: 1,
              verified_payments_count: 1,
              pending_verifications_count: 0,
              rejected_payments_count: 0,
            },
            trends: [{ week_start: "2026-11-23", week: "23 Nov", registrations: 1, payments_verified: 1 }],
            competitions_overview: [],
          },
          auditLogs: [],
          error: null,
        };
      },
    },
    ["http://localhost:3000"],
  );

  assertEquals((await handler(makeJsonReq("http://localhost/fn", "GET", "tok-participant"))).status, 403);
  assertEquals((await handler(makeJsonReq("http://localhost/fn", "GET", "tok-coord"))).status, 403);

  const csvRes = await handler(makeJsonReq("http://localhost/fn?format=csv", "GET", "tok-admin"));
  assertEquals(csvRes.status, 200);
  const csvText = await csvRes.text();
  assertMatch(csvText, /"'=CMD\(\)\|calc"/);

  const jsonRes = await handler(makeJsonReq("http://localhost/fn", "GET", "tok-admin"));
  assertEquals(jsonRes.status, 200);
  const jsonBody = await jsonRes.json();
  assertEquals(jsonBody.analytics.kpis.verified_payments_count, 1);
  assertEquals(jsonBody.analytics.trends.length, 1);
});

Deno.test("manage-admins requires super_admin and blocks self-modification and manage-competitions restricts fees to super_admin", async () => {
  const adminHandler = makeManageAdminsHandler(
    {
      authLookup,
      rateLimiter: allowLimiter,
      async listStaffAndAssignments() {
        return { staff: [], assignments: [], error: null };
      },
      async findProfileByEmailOrId({ id, email }) {
        const found = Object.values(ACTORS).find((a) => (id && a.id === id) || (email && a.email === email));
        return found ? { id: found.id, email: found.email, role: found.role, is_active: found.is_active } : null;
      },
      async updateProfileRoleStatus() {
        return null;
      },
      async assignCoordinator(coordinatorId, competitionId) {
        return { data: { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", coordinator_id: coordinatorId, competition_id: competitionId }, error: null };
      },
      async removeCoordinatorAssignment() {
        return null;
      },
      async writeAuditLog() {},
    },
    ["http://localhost:3000"],
  );

  // Admin cannot call manage-admins
  assertEquals((await adminHandler(makeJsonReq("http://localhost/fn", "GET", "tok-admin"))).status, 403);

  // Super admin cannot demote self
  assertEquals((await adminHandler(makeJsonReq("http://localhost/fn", "POST", "tok-super", { action: "set_role", target_user_id: ACTORS["tok-super"].id, role: "participant" }))).status, 400);

  // Super admin can promote participant -> admin
  assertEquals((await adminHandler(makeJsonReq("http://localhost/fn", "POST", "tok-super", { action: "set_role", target_email: "p1@example.com", role: "admin" }))).status, 200);

  const compHandler = makeManageCompetitionsHandler(
    {
      authLookup,
      rateLimiter: allowLimiter,
      async listCatalog() {
        return { competitions: [], accommodationPlans: [], error: null };
      },
      async updateCompetition(id, updates) {
        return { data: { id, ...updates }, error: null };
      },
      async updateAccommodationPlan(id, updates) {
        return { data: { id, ...updates }, error: null };
      },
      async writeAuditLog() {},
    },
    ["http://localhost:3000"],
  );

  // Ordinary admin cannot alter fees or accommodation tariffs
  assertEquals((await compHandler(makeJsonReq("http://localhost/fn", "PATCH", "tok-admin", { id: "robowar", fee_inr: 1 }))).status, 403);
  assertEquals((await compHandler(makeJsonReq("http://localhost/fn", "PATCH", "tok-admin", { target: "accommodation", id: "both", price_per_person_inr: 1 }))).status, 403);
  // Strict int rejects empty string coercion to 0
  assertEquals((await compHandler(makeJsonReq("http://localhost/fn", "PATCH", "tok-super", { id: "robowar", fee_inr: "" }))).status, 400);
  // Super admin can update tariff
  assertEquals((await compHandler(makeJsonReq("http://localhost/fn", "PATCH", "tok-super", { target: "accommodation", id: "both", price_per_person_inr: 175 }))).status, 200);
});

Deno.test("get-coordinator-registrations restricts access strictly to assigned competitions", async () => {
  const handler = makeGetCoordinatorRegistrationsHandler(
    {
      authLookup,
      rateLimiter: allowLimiter,
      async getAssignedCompetitionIds() {
        return ["robowar"];
      },
      async fetchCoordinatorRegistrations({ competitionIds }) {
        return {
          rows: [{ pass_code: "TR26-1", competitions: competitionIds }],
          total: 1,
          analytics: {
            timezone: "Asia/Kolkata",
            kpis: { total_registrations: 1, verified_registrations: 1, confirmed_participants: 2, pending_registrations: 0, assigned_competitions_count: 1 },
            trends: [{ week_start: "2026-11-23", week: "23 Nov", registrations: 1, verified_passes: 1 }],
            competitions_overview: [],
          },
          error: null,
        };
      },
    },
    ["http://localhost:3000"],
  );

  assertEquals((await handler(makeJsonReq("http://localhost/fn", "GET", "tok-participant"))).status, 403);
  // Unassigned event denied
  assertEquals((await handler(makeJsonReq("http://localhost/fn?competition_id=hackathon", "GET", "tok-coord"))).status, 403);
  // Assigned event allowed
  const ok = await handler(makeJsonReq("http://localhost/fn?competition_id=robowar", "GET", "tok-coord"));
  assertEquals(ok.status, 200);
  const okBody = await ok.json();
  assertEquals(okBody.analytics.kpis.verified_registrations, 1);
  assertEquals(okBody.analytics.kpis.verified_collections_inr, undefined);
});
