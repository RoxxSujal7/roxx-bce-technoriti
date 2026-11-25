# ROXX BCE TECHNORITI — Backend Architecture

**Project:** ROXX TECHNORITI (`TECHNORITI '26`)  
**Institution:** Bhagalpur College of Engineering (BCE Bhagalpur)  
**Repository:** `https://github.com/RoxxSujal7/roxx-bce-technoriti`

---

## 1. System Overview

The backend transforms ROXX TECHNORITI from a client-side SPA into a three-tier serverless architecture on **Vercel** (frontend SPA + HTTP security headers) and **Supabase** (PostgreSQL 15+, Supabase Auth, Deno Edge Functions):

```text
React 18 SPA (Vercel)
  ├── Public Reads (Anon Key + RLS): competitions, accommodation_plans
  ├── Authentication (Supabase Auth + PKCE): Email/Password, Recovery, Google OAuth
  └── Protected Mutations & Privileged Reads (JWT -> Edge Functions -> Service Role -> Atomic PG RPC)
        ├── POST /create-registration       (Participant -> server pricing + PENDING_PAYMENT)
        ├── POST /submit-utr                (Owner -> unique 12-digit UTR -> PENDING_VERIFICATION)
        ├── GET  /get-my-registrations      (Authenticated user -> own passes & payments)
        ├── POST /verify-payment            (Admin / Super Admin -> row-locked bank reconciliation)
        ├── GET  /get-admin-registrations   (Admin / Super Admin -> paginated list, summary, CSV, audit logs)
        ├── GET/PATCH /manage-competitions  (Admin / Super Admin -> schedule/active; Super Admin -> fees/tariffs)
        ├── GET/POST /manage-admins         (Super Admin -> staff roles, active flags, coordinator assignment)
        └── GET  /get-coordinator-registrations (Coordinator -> assigned competitions only)
```

---

## 2. Database Tables (`supabase/migrations/20261125000001_initial_schema.sql`)

| Table | Purpose | Key Constraints & Indexes |
|---|---|---|
| `profiles` | User profile & authoritative RBAC role | `role IN ('super_admin','admin','coordinator','participant')`, `is_active`, trigger blocks non-service role/status edits |
| `competitions` | 29 official TECHNORITI '26 arenas | `fee_type IN ('per_member','per_team')`, `fee_inr >= 0`, `max_team_size >= min_team_size` |
| `accommodation_plans` | Stay plans (`none`, `lodging`, `mess`, `both`) | `price_per_person_inr >= 0` |
| `registrations` | Delegate pass header & fee snapshots | `UNIQUE(pass_code)`, `phone ~ '^\d{10}$'`, `UNIQUE(user_id, idempotency_key)` |
| `registration_arenas` | Primary & additional arena breakdown | Composite PK `(registration_id, competition_id)`, indexed `competition_id` |
| `payments` | Manual UPI UTR submission & reconciliation ledger | `utr_number ~ '^\d{12}$'`, global `UNIQUE(utr_number)`, partial unique active payment per registration |
| `coordinator_assignments` | Scopes coordinators to specific competitions | `UNIQUE(coordinator_id, competition_id)` |
| `audit_logs` | Immutable security & admin audit trail | `BEFORE UPDATE OR DELETE` trigger blocks tampering; `UPDATE/DELETE/TRUNCATE` revoked |
| `rate_limits` | Persistent sliding/fixed window counter | Atomic `check_and_increment_rate_limit` RPC |
| `email_notifications` | Transactional notification delivery ledger | `UNIQUE(idempotency_key)` prevents double-sends on retry |

---

## 3. Documented Pricing Discrepancies (Preserved From Original Portal)

During Gate A catalog verification against `src/content/events.jsx`, `src/screens/Register.jsx`, and `src/components/ui/pricing-02.tsx`, two existing frontend inconsistencies were identified and **preserved accurately without inventing charges**:

1. **Accommodation Day-Count & Contingent Discounts (`pricing-02.tsx` vs `Register.jsx`):**
   - `pricing-02.tsx` advertises tariffs per day (`₹50 / person / day`, `₹125`, `₹175`) plus group discount copy (`Flat ₹150 off for collegiate teams of >4 members`, `Flat ₹250 off for contingents of 12+ members`).
   - Live checkout (`Register.jsx:55-60`) multiplies `tariff * teamSize` once for the festival stay without a day selector or automatic discount subtraction.
   - `create_registration_tx` implements the exact checkout calculation (`accom.price_per_person_inr * team_size`) so UI estimates and server charges align 1:1. Super Admins can add/adjust tariff rules in future releases once institutional discount criteria are finalized.
2. **Additional Arenas Pricing Scope (`Register.jsx:50-53` vs `events.jsx`):**
   - `Register.jsx` calculates additional arenas using `getArenaCost(comp, 1)` (i.e., `fee_inr` per selected extra arena), whereas primary arenas multiply `per_member` fees by `teamSize`. `competitions.additional_fee_scope` preserves this rule explicitly.
3. **Team-Size Bounds Fix:**
   - `Register.jsx` previously restricted the team dropdown to `1..4` (or `5`), which prevented valid registration for `nukkad` (`6–15 Members`) and allowed invalid solo entries for `freefire` (`4 Members`) or `forensic` (`2–4 Members`). `Register.jsx` now dynamically populates valid team sizes from each competition's `min_team_size..max_team_size`, matching server-side validation.

---

### Authentication & Session Flow
- `src/context/AuthContext.jsx` is mounted inside `<HashRouter>` so `onAuthStateChange` can route PKCE Google OAuth callbacks (`POST_AUTH_REDIRECT_KEY` validated through `sanitizeInternalRedirect`) and `PASSWORD_RECOVERY` sessions cleanly without open-redirect exposure.
- Profile fetches use monotonic request IDs and unmount guards (`mountedRef`, `profileReqRef`) to prevent stale responses across rapid auth transitions.

## 4. Transactional Integrity & Race Condition Controls

All state-changing flows run inside `SECURITY DEFINER` PostgreSQL RPCs callable only by `service_role` after Edge Function auth/RBAC checks:
- `create_registration_tx`: Pins `SET search_path = public, extensions`, validates catalog active state + team limits with set-based SQL, computes `computed_total_inr` exclusively from DB rows, generates a cryptographic random pass code (`TR26-HEX` via `extensions.gen_random_bytes(5)`), inserts `registrations` + `registration_arenas` + `audit_logs` atomically, and handles concurrent `idempotency_key` retries cleanly (`unique_violation`).
- `submit_utr_tx`: Locks the registration row (`FOR UPDATE`), verifies ownership and status (`PENDING_PAYMENT` or `REJECTED`), enforces unique 12-digit UTR at DB level, and transitions status to `PENDING_VERIFICATION`.
- `verify_payment_tx`: Locks both `payments` and `registrations` (`FOR UPDATE`), verifies active `admin`/`super_admin` actor, enforces matching `confirmed_amount_inr` on verification or mandatory `rejection_reason` on rejection, and prevents double-processing.
- `get_registration_summary()`: Aggregates admin dashboard counts and verified revenue directly in PostgreSQL (`private` RLS helper functions wrapped with `(SELECT ...)` InitPlan optimization).
- `get_admin_dashboard_analytics()` & `get_coordinator_dashboard_analytics(TEXT[])` (`20261125000004_admin_analytics_rpcs.sql`): Compute `Asia/Kolkata` 8-week registration vs payment verification trends, verified participant counts, competition demand breakdown, and non-financial coordinator-scoped KPIs cleanly inside PostgreSQL without PostgREST row-limit issues.
- Coordinators are excluded from direct PostgREST `SELECT` on `registrations` and read only assigned competition rosters via `get-coordinator-registrations`.
- `src/screens/Admin.jsx` integrates the App-1 responsive dashboard workspace (`src/components/ui/app-1.tsx`, `src/components/ui/app-1-utils/`) with real event analytics, Recharts weekly trends, and role-gated operations while preserving manual UTR reconciliation and Super Admin staff management.
