# ROXX BCE TECHNORITI — Security Implementation

**Audit & Remediation Scope:** PostgreSQL schema, Row-Level Security, Deno Edge Functions, React Auth/Registration/Admin flows, and Vercel HTTP headers.

---

## 1. Threat Model & Control Matrix

| Threat Vector | Server-Side & Database Enforcement | Source File(s) |
|---|---|---|
| **Client-Side Price Tampering** | `create-registration` rejects payloads containing `totalPayable`, `computed_total_inr`, `amount`, or `status` (`400 FORBIDDEN_FIELDS`); `create_registration_tx` computes all fees from PostgreSQL `competitions` and `accommodation_plans` rows. | `supabase/functions/create-registration/handler.ts`, `supabase/migrations/20261125000002_rls_and_functions.sql` |
| **Fake / Duplicate / Rejected UTR Reuse** | `payments.utr_number` enforces `CHECK (utr_number ~ '^\d{12}$')` and global `UNIQUE(utr_number)`. Previously `REJECTED` UTRs remain permanently locked against reuse. One active pending/verified payment per registration (`uq_payments_active_per_reg`). | `supabase/migrations/20261125000001_initial_schema.sql`, `supabase/functions/submit-utr/handler.ts` |
| **Self-Verification of Payments** | Direct `INSERT`/`UPDATE` on `payments` and `registrations` revoked from `anon`/`authenticated`. Participants can only create `PENDING_PAYMENT` and submit UTR to `PENDING_VERIFICATION`. Only server-verified `admin`/`super_admin` calling `verify-payment` with matching bank amount can transition to `VERIFIED`. | `20261125000002_rls_and_functions.sql`, `supabase/functions/verify-payment/handler.ts` |
| **Privilege Escalation on Signup / Profile Update** | `handle_new_user()` trigger hardcodes `role = 'participant'`. `REVOKE UPDATE ON profiles FROM authenticated` paired with column-level `GRANT UPDATE (full_name, roll_number, phone, college, branch)` + `prevent_privileged_profile_mutation()` trigger blocks non-`service_role` edits to `role`, `is_active`, `email`, or `id`. `profiles` never reads RBAC role from user-editable JWT `user_metadata`. | `20261125000002_rls_and_functions.sql`, `supabase/functions/_shared/auth.ts` |
| **Unauthorized Admin / Super Admin Access** | Every Edge Function calls `adminClient.auth.getUser(token)` + queries `profiles` checking `is_active = true` and `role`. Deactivated staff are rejected (`403`). `manage-admins` requires `super_admin` and blocks self-demotion/self-deactivation. React `Admin.jsx` fails closed while `!configured`, `authLoading`, missing `profile`, inactive `is_active`, or unauthorized `role`. | `supabase/functions/_shared/auth.ts`, `supabase/functions/manage-admins/handler.ts`, `src/screens/Admin.jsx` |
| **Coordinator Scope Leakage / IDOR** | Direct PostgREST `SELECT` on `registrations` excludes coordinators. `get-coordinator-registrations` queries `coordinator_assignments`, returns `403` for unassigned `competition_id` filters, and omits admin payment reconciliation tables & audit logs. | `supabase/functions/get-coordinator-registrations/handler.ts`, `20261125000002_rls_and_functions.sql` |
| **Distributed Rate Limit Bypass** | Sensitive Edge Functions key authenticated limits strictly by verified user ID (ignoring spoofable `X-Forwarded-For`) and call atomic DB RPC `check_and_increment_rate_limit` (`clock_timestamp()`, bounded bucket count, stale cleanup). | `supabase/functions/_shared/rateLimit.ts`, `20261125000002_rls_and_functions.sql` |
| **Type Coercion & Open Redirects** | `parseStrictInt` in Edge Functions and integer checks in `Admin.jsx` reject `""`, `null`, `false`, and partial strings (`100abc`). `sanitizeInternalRedirect` rejects `//`, `\`, off-allowlist paths, and ASCII control chars. | `supabase/functions/_shared/validation.ts`, `src/context/AuthContext.jsx`, `src/screens/Admin.jsx` |
| **CORS / Origin Spoofing** | Browser requests checked against strict `ALLOWED_ORIGINS` allowlist in `_shared/cors.ts` (never wildcard `*` with `Authorization`). | `supabase/functions/_shared/cors.ts`, `supabase/functions/_shared/edge.ts` |
| **Third-Party QR PII Leakage** | Replaced external `api.qrserver.com` requests in `Register.jsx` with 100% local in-browser PNG data-URL QR rendering via `qrcode`. | `src/screens/Register.jsx`, `src/screens/Dashboard.jsx` |
| **CSV Formula Injection** | Admin CSV exports neutralize leading `=`, `+`, `-`, `@`, `\t`, `\r` characters with a leading `'`. | `supabase/functions/_shared/validation.ts`, `supabase/functions/get-admin-registrations/handler.ts` |
| **Audit Log Tampering** | `audit_logs` revokes `UPDATE`/`DELETE`/`TRUNCATE` from `anon`/`authenticated` and enforces an immutable `BEFORE UPDATE OR DELETE` trigger. | `20261125000002_rls_and_functions.sql` |
| **XSS, Clickjacking & Source Exposure** | `.env.production` sets `GENERATE_SOURCEMAP=false` and `INLINE_RUNTIME_CHUNK=false`; `vercel.json` enforces `script-src 'self'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`. | `.env.production`, `vercel.json`, `public/index.html` |

---

## 2. Secret & Credential Hygiene

- `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and bank reconciliation records live **exclusively** in Supabase Edge Function secrets (never in `REACT_APP_*` variables or committed files).
- Super Admin provisioning uses [bootstrap_super_admin.sql](file:///c:/Users/sujal/syn/supabase/scripts/bootstrap_super_admin.sql) against a verified `auth.users.id` UUID after interactive signup — zero hardcoded admin passwords or assumed emails exist in migrations or seed files.
- Structured server logs in `_shared/http.ts` redact `token`, `secret`, `password`, and full `utr` keys (logging only last 4 digits where operational debugging requires it).

---

## 3. Dependency Fix Applied During Implementation

- Discovered and safely unlinked an unsafe Windows NTFS junction (`node_modules\@ -> src\`) that caused `npm install` / `npm audit fix` to delete tracked files under `src/`. Removed via `cmd /c rmdir`; `tsconfig.json` `@/*` path mapping works without filesystem junctions.
