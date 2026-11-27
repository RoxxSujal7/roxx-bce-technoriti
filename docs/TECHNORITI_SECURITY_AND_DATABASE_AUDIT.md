# TECHNORITI '26 — SECURITY & DATABASE ARCHITECTURE AUDIT

**Target Application:** TECHNORITI '26 (Bhagalpur College of Engineering)  
**Database:** PostgreSQL 15 (Supabase Hosted & Local Migration Pipeline)  
**Edge Runtime:** Deno / Supabase Edge Functions  
**Audit Standard:** OWASP Top 10 (2021), CIS PostgreSQL Benchmark, Supabase RLS Hardening  
**Date:** 2026-11-27  

---

## 1. PostgreSQL Schema & Migration Pipeline

The database schema is structured across 7 sequential, idempotent migrations:

1. `20261125000001_initial_schema.sql`: Core tables (`profiles`, `competitions`, `accommodation_plans`, `registrations`, `registration_arenas`, `payments`, `coordinator_assignments`, `audit_logs`). Enforces foreign key constraints, `CHECK` conditions on enum types, and schema isolation (`extensions` schema with `pgcrypto`).
2. `20261125000002_coordinator_rls_and_analytics.sql`: Coordinator isolation policies, registration views, and analytics aggregation functions.
3. `20261125000003_secure_registration_rpc.sql`: Transactional RPCs for atomic registration creation, locking rows and calculating fees on the database server.
4. `20261125000004_payment_verification_hardening.sql`: UTR uniqueness constraints, idempotency keys, and reconciliation audit triggers.
5. `20261125000005_mfa_rls_and_privilege_hardening.sql`: Server-side MFA verification state checking and role elevation barriers.
6. `20261125000006_strict_mfa_policy_and_session_hardening.sql`: `private.security_settings` table, `is_strict_mfa_enforced()` checks, and session revocation logic.
7. `20261125000007_rls_atomicity_and_hygiene_hardening.sql`:
   - `private.is_active_user()` helper function with `SET search_path = public, pg_temp`.
   - `RESTRICTIVE` RLS policies applied to `registrations`, `registration_arenas`, `payments`, and `coordinator_assignments` ensuring deactivated accounts (`is_active = false`) are immediately barred from PostgREST.
   - Elimination of temporary tables in `public.create_registration_tx`, replacing them with pure set-based CTEs.
   - Revocation of `EXECUTE` privileges on trigger functions from `PUBLIC`.
   - Atomic RPC functions: `admin_set_profile_role_tx`, `admin_set_profile_active_tx`, `admin_assign_coordinator_tx`, `admin_remove_coordinator_tx`, `admin_update_competition_tx`, `admin_update_accommodation_tx`.
   - Server-side paginated coordinator registration querying via `get_coordinator_registrations_page`.

---

## 2. Row Level Security (RLS) Policy Matrix

| Database Table | Policy Name | Command | Permitted Roles | Condition / Verification Logic |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | `profiles_read_own_or_staff` | `SELECT` | `authenticated` | `auth.uid() = id OR private.is_active_staff()` |
| `profiles` | `profiles_update_self` | `UPDATE` | `authenticated` | `auth.uid() = id AND role IS NOT CHANGED` |
| `registrations` | `registrations_active_user_gate` | `ALL` (RESTRICTIVE) | `authenticated` | `private.is_active_user(auth.uid())` |
| `registrations` | `registrations_read_own` | `SELECT` | `participant` | `user_id = auth.uid()` |
| `registrations` | `registrations_read_staff` | `SELECT` | `admin`, `super_admin` | `private.is_active_staff()` |
| `registrations` | `registrations_read_coord` | `SELECT` | `coordinator` | `primary_arena_id IN (assigned competitions)` |
| `payments` | `payments_active_user_gate` | `ALL` (RESTRICTIVE) | `authenticated` | `private.is_active_user(auth.uid())` |
| `payments` | `payments_read_own` | `SELECT` | `participant` | `registration_id IN (user registrations)` |
| `payments` | `payments_admin_full` | `ALL` | `admin`, `super_admin` | `private.is_active_staff()` |
| `audit_logs` | `audit_logs_read_admin` | `SELECT` | `admin`, `super_admin` | `private.is_active_staff()` |
| `audit_logs` | `audit_logs_immutable` | `UPDATE`, `DELETE` | `ALL` | **DENIED** (Enforced by Statement Trigger) |

---

## 3. Server-Enforced MFA & Privilege Separation

Privileged functions and screens strictly enforce multi-factor authentication:
1. **Level Differentiation:**
   - **AAL1:** Password or Google OAuth completed; TOTP challenge not yet answered.
   - **AAL2:** Time-based One-Time Password (TOTP) verified by the Supabase Auth server.
2. **Strict Enforcement Policy:**
   - When an administrator or coordinator has enrolled TOTP factors, access to privileged Edge Functions (`manage-admins`, `manage-competitions`, `verify-payment`, `get-admin-registrations`) is rejected with HTTP 403 (`MFA_CHALLENGE_REQUIRED`) if the session is at AAL1.
   - Setting `ENFORCE_PRIVILEGED_MFA = true` mandates that all staff accounts must enroll and verify TOTP before accessing admin endpoints.
3. **Session Revocation & Factor Deletion:**
   - When an enrolled factor is deleted, if no remaining verified factors exist, the session downgrades to AAL1.
   - Banned or deactivated users (`is_active = false`) are blocked at both PostgREST and Edge Function layers.

---

## 4. Edge Function Security Matrix

All Deno Edge Functions utilize hardened shared utilities in `supabase/functions/_shared/`:

| Edge Function | Auth & Role Requirements | Atomic RPC Utilized | Security Safeguards Enforced |
| :--- | :--- | :--- | :--- |
| `create-registration` | Authenticated Participant | `public.create_registration_tx` | Idempotency key locking, DB-computed fee total, anti-tampering. |
| `submit-utr` | Authenticated Delegate | `public.submit_payment_utr_tx` | Regex validation (`^[A-Za-z0-9]{12}$`), duplicate UTR check. |
| `verify-payment` | `admin`, `super_admin` (AAL2) | `public.reconcile_payment_tx` | Atomic status update, verified pass issuance, audit entry. |
| `get-admin-registrations` | `admin`, `super_admin` (AAL2) | Direct Query + Pagination | CSV formula injection sanitization (`'`, `+`, `-`, `@`, `\t`, `\r`). |
| `get-coordinator-registrations`| `coordinator` (AAL2) | `get_coordinator_registrations_page` | Strict competition assignment filtering, no cross-arena leakage. |
| `manage-admins` | `super_admin` (AAL2) | `admin_set_profile_role_tx` | Self-demotion guard, roll number uniqueness, staff isolation. |
| `manage-competitions` | `super_admin` / `admin` (AAL2) | `admin_update_competition_tx` | Fee modifications restricted exclusively to `super_admin`. |

---

## 5. OWASP Top 10 Evaluation & Verification

- **A01: Broken Access Control:** Addressed via Restrictive RLS policies, role checks inside SECURITY DEFINER RPCs, and AAL2 barriers on privileged operations.
- **A02: Cryptographic Failures:** Zero plaintext secrets in code. Supabase Auth utilizes Bcrypt/Argon2 password hashing. TOTP uses standard RFC 6238 HMAC-SHA1.
- **A03: Injection:**
  - SQL Injection: Neutralized via parameterized queries, PostgreSQL RPCs, and explicit search_path pinning (`SET search_path = public, pg_temp`).
  - CSV Formula Injection: Neutralized by prefixing cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single apostrophe (`'`).
- **A04: Insecure Design:** Registrations and payments use idempotent tokens; financial calculations occur exclusively on the database server.
- **A05: Security Misconfiguration:** Restrictive CORS headers, CSP `frame-ancestors 'none'`, and JWT expiry shortened to 1800 seconds (30 minutes).
- **A06: Vulnerable and Outdated Components:** Zero known high-severity vulnerabilities in dependencies. Deno locks pinned in `deno.lock`.
- **A07: Identification and Authentication Failures:** PKCE flow for OAuth, brute-force throttling on auth endpoints, server-enforced MFA verification.
- **A08: Software and Data Integrity Failures:** Statement-level immutable triggers on audit logs; client input trimming and schema validation.
- **A09: Security Logging and Monitoring Failures:** Structured JSON logs for all authentication, authorization, and administrative events with client IP/UA capture.
- **A10: Server-Side Request Forgery (SSRF):** Zero user-controlled external HTTP fetch operations. Email dispatch uses strictly typed, pre-configured institutional API clients with 8s timeouts.
