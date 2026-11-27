# ROXX BCE TECHNORITI — Secure Admin Authentication & Final MFA Hardening Report

**Repository:** `C:\Users\sujal\syn` (`https://github.com/RoxxSujal7/roxx-bce-technoriti`)  
**Application:** TECHNORITI '26 — BCE Bhagalpur  
**Final Status:** **`SECURE — READY FOR OWNER CONFIGURATION`**

*(Note: Production cutover cannot be claimed until the project owner applies Migrations `001`–`006` in live Supabase, sets Edge Function secrets, configures Google OAuth / TOTP / Email settings in Supabase Dashboard, enrolls owner TOTP MFA, and runs `supabase/scripts/enable_strict_mfa.sql`.)*

---

## Executive Overview

This final security hardening pass closes every remaining admin authentication, PostgREST RLS/MFA synchronization, direct GoTrue factor-removal fallback, deactivated-session revocation, React auth initialization race, and Mercury NEURAL ACCESS UI accessibility/focus-ring issue while preserving Supabase Auth, PostgreSQL RLS, Edge Functions, Light/Dark Admin themes, and the 29 public competitions intact.

---

## 1. Previous Security Weaknesses & Audit Findings (Before Remediation)

Classified accurately by actual impact and severity across code, SQL, Edge Functions, and UI:

| ID | Severity | Component | Weakness Identified |
|---|---|---|---|
| **F-01** | **HIGH** | `Migration 005` (`private.is_admin_or_super`) & `_shared/auth.ts` | Unenrolled-admin AAL1 fallback (`OR NOT EXISTS (... auth.mfa_factors ...)`) remained unconditionally active in PostgreSQL RLS even if `ENFORCE_PRIVILEGED_MFA=true` was set in Edge Functions. Calling GoTrue `DELETE /auth/v1/factors/{id}` directly (bypassing React UI's client guard) deleted the sole factor and **re-granted `aal1` PostgREST `SELECT` access** on `registrations`, `payments`, and `profiles`. |
| **F-02** | **HIGH** | `src/context/AuthContext.jsx` | Initialization race & hook churn: `useEffect` depended on unstable `navigate` (`react-router-dom` v6) and shared `mountedRef` + `profileReqRef` between `onAuthStateChange` and fallback `getSession()`, risking premature `profRes.stale` aborts of `PASSWORD_RECOVERY` / OAuth `SIGNED_IN` redirects and skipping cleanup in React 18 `<StrictMode>`. Missing profile rows (`!error && !data`) left `profileLoadError: false`, stalling on a spinner. |
| **F-03** | **HIGH** | `src/screens/Admin.jsx` (`loadCoordinatorRegs`) | `loadCoordinatorRegs` depended on `assignedCompetitions.length` while calling `setAssignedCompetitions(...)`, causing a double `get-coordinator-registrations` fetch on every coordinator mount. |
| **F-04** | **HIGH** | `src/components/ui/neural-access-login.tsx` / `.scss` | Passing `<button className="mercury-btn-base">` inside SVG `filter: url(#...)` blurred/erased the `:focus-visible` keyboard outline; transparent form container allowed moving `#e0e0e0` blobs (`~#6e6e6e` composited) to drop label/subtitle/footer contrast below WCAG 2.1 AA (`4.5:1`). |
| **F-05** | **MEDIUM** | `supabase/functions/manage-admins/index.ts` | Deactivating/reactivating staff via `admin.auth.admin.updateUserById(..., { ban_duration })` swallowed rejections via `.catch(() => {})` and ignored `{ error }` returned by `@supabase/auth-js`, allowing silent split-brain between `profiles.is_active` and GoTrue ban status. |
| **F-06** | **MEDIUM** | `AuthContext.jsx` (`signOut`, `loadMfaStatus`), `Admin.jsx` (MFA handlers), `neural-access-login.tsx` | Missing `mfaReqRef` sequencing on `refreshMfaStatus()`, missing `mountedRef` guards after `await`, `mfaCode`/`maxLength={6}` truncating pasted spaced codes (`"123 456"`), static `friendlyName` collisions when adding backup TOTP factors, single-factor `[0]` assumption at challenge prompt, and `profileLoadError` not reset cleanly inside `signOut`. |
| **F-07** | **LOW** | `Migration 006` (initial draft) & `_shared/auth.ts` | Mid-session `aal2` JWT replay window after direct factor deletion prior to `jwt_expiry = 3600` (closed inside both DB RLS and Edge strict mode by requiring an active verified factor alongside `aal = 'aal2'`); `private.security_settings` lacked `ENABLE ROW LEVEL SECURITY` and `touch_updated_at()`. |
| **F-08** | **LOW** | `src/screens/Auth.jsx` (`handleBeforeOAuth`) | Initiating participant Google OAuth after an abandoned `/admin-login` OAuth MFA attempt left stale `POST_AUTH_ORIGIN_KEY='/admin-login'` in `sessionStorage`. |

---

## 2. Implemented Changes

### Database & Scripts
- **[supabase/migrations/20261125000006_strict_mfa_policy_and_session_hardening.sql](file:///c:/Users/sujal/syn/supabase/migrations/20261125000006_strict_mfa_policy_and_session_hardening.sql):**
  - Created `private.security_settings` (`id = 1`, `enforce_privileged_mfa BOOLEAN NOT NULL DEFAULT false`), enabled RLS (`ENABLE ROW LEVEL SECURITY` with zero client policies), revoked all privileges from `PUBLIC, anon, authenticated, service_role` before granting `SELECT, UPDATE` strictly to `service_role`, added `ON DELETE SET NULL` on `updated_by`, attached `public.touch_updated_at()`, and blocked `DELETE`/`TRUNCATE` via statement triggers.
  - Updated `private.is_admin_or_super()` to require `(aal = 'aal2' AND EXISTS (... verified interactive factor in auth.mfa_factors ...))` or `(NOT enforce_privileged_mfa AND NOT EXISTS (... verified factor ...))` — **failing closed** (`COALESCE(..., true)`) if row `1` is missing.
  - Added `service_role`-only `public.get_privileged_mfa_policy()` RPC for Edge parity and lockout-safe `private.enable_strict_mfa_policy(p_actor_id UUID)` cutover helper (refuses to activate strict mode unless at least one active `super_admin` has a verified interactive MFA factor enrolled, validates `p_actor_id`, upserts row `1`, and records `STRICT_MFA_POLICY_ENABLED` in `audit_logs`).
- **[supabase/scripts/enable_strict_mfa.sql](file:///c:/Users/sujal/syn/supabase/scripts/enable_strict_mfa.sql):** Safe one-command owner cutover script selecting an MFA-verified active `super_admin` and activating strict MFA across DB RLS and Edge Functions simultaneously.
- **[supabase/config.toml](file:///c:/Users/sujal/syn/supabase/config.toml):** Added explicit `[auth.mfa]` (`max_enrolled_factors = 10`) and `[auth.mfa.totp]` (`enroll_enabled = true`, `verify_enabled = true`).

### Edge Functions
- **[supabase/functions/_shared/auth.ts](file:///c:/Users/sujal/syn/supabase/functions/_shared/auth.ts):**
  - Extended `createSupabaseAuthLookup` to query `public.get_privileged_mfa_policy()` cleanly (tolerating pre-Migration-006 `PGRST202`/`42883`, failing closed on unexpected RPC errors).
  - Hardened `requirePrivilegedMfa()` so strict mode (`ENFORCE_PRIVILEGED_MFA === "true"` or DB `enforce_privileged_mfa === true`) requires **both** `actor.hasVerifiedMfaFactor` AND `actor.aal === "aal2"` across all 5 privileged Edge Functions (`get-admin-registrations`, `get-coordinator-registrations`, `manage-admins`, `manage-competitions`, `verify-payment`).
- **[supabase/functions/manage-admins/index.ts](file:///c:/Users/sujal/syn/supabase/functions/manage-admins/index.ts):** Replaced silent `.catch(() => {})` on `admin.auth.admin.updateUserById(..., { ban_duration })` with explicit `{ error: banErr }` inspection, exception catching, and rollback of `profiles.is_active` if GoTrue ban/unban fails.

### Frontend (`AuthContext`, `Auth`, `Admin`, `NeuralAccessLogin`)
- **[src/context/AuthContext.jsx](file:///c:/Users/sujal/syn/src/context/AuthContext.jsx):**
  - Replaced `navigate` effect dependency with `navigateRef`, captured initial URL callback flags once in `urlCallbackRef` before `sanitizeAuthCallbackUrl()`, isolated effect lifecycles with `active` + `listenerStarted`, added `try/catch/finally` around initialization so `loading` never wedges, added `mfaReqRef` ordering to `refreshMfaStatus`, failed closed (`profileLoadError = true`) on missing profiles or MFA SDK errors (`mfaError`), committed `session` + `profile` + `aal` + `mfaFactors` atomically after `Promise.all`, and cleared `profileLoadError` & `authError` cleanly in `signOut()`.
- **[src/screens/Auth.jsx](file:///c:/Users/sujal/syn/src/screens/Auth.jsx):** Cleared `POST_AUTH_ORIGIN_KEY` inside `handleBeforeOAuth` so `/signin` OAuth stays isolated from any prior abandoned `/admin-login` OAuth attempt.
- **[src/screens/Admin.jsx](file:///c:/Users/sujal/syn/src/screens/Admin.jsx):** Fixed `loadCoordinatorRegs` functional `setAssignedCompetitions` state update (eliminating double fetch), added `mountedRef.current` guards across MFA/admin async handlers, added unique suffix to TOTP `friendlyName` for backup authenticators, normalized TOTP input paste digits, aligned sign-out redirect to `/admin-login`, added `<h2 className="sr-only">` heading hierarchy, and clarified client vs server MFA policy notice wording.
- **[src/components/ui/neural-access-login.tsx](file:///c:/Users/sujal/syn/src/components/ui/neural-access-login.tsx) & [neural-access-login.scss](file:///c:/Users/sujal/syn/src/components/ui/neural-access-login.scss):** Isolated SVG goo filter strictly onto `.mercury-goo-layer` so `:focus-visible` outlines remain crisp; added smoked-glass translucent container scrim & boosted text/border/divider/footer contrast for WCAG 2.1 AA; added dynamic `MediaQueryList` `change` listener for `prefers-reduced-motion`, `mountedRef` guards, `aria-invalid`/`aria-describedby` bindings, backup-factor device selector (`mfaFactors.length > 1`), TOTP paste digit stripping, `>= 32px` footer button targets, and credential state cleanup on sign-out/submit.

---

## 3. Authentication & Authorization Architecture

- **Public Entry (`#/admin-login`):** Uses official Supabase Auth (`supabase.auth.signInWithPassword`, Google PKCE `signInWithOAuth`, `resetPasswordForEmail`, `updateUser`) with zero hardcoded passwords, zero registration links (`NEW ARCHIVE` removed), and fail-closed gating before navigating to `#/admin`.
- **Authoritative RBAC Source:** Server PostgreSQL `public.profiles` (`role`, `is_active`) protected by column-scoped `GRANT UPDATE` (`full_name, roll_number, phone, college, branch` only) and trigger `prevent_privileged_profile_mutation()`. Client `user_metadata` and JWT role strings are ignored.
- **Role Boundaries:**
  - `super_admin` (`is_active = true`, MFA satisfied): Full Admin Dashboard, Registrations, UTR verification, Competition/Tariff management, Staff Role/Active management, Coordinator assignments, Audit Logs (via sanitized `get-admin-registrations` Edge Function only).
  - `admin` (`is_active = true`, MFA satisfied): Operational dashboards, Registrations, UTR reconciliation, competition schedule/active toggles (`manage-admins` and fees/tariffs blocked with `403 FORBIDDEN`).
  - `coordinator` (`is_active = true`, MFA satisfied if enrolled): Assigned arena roster & non-financial KPIs strictly via `get-coordinator-registrations` (`403 FORBIDDEN` on financial/admin endpoints and direct PostgREST cross-user reads).
  - `participant`, deactivated, unauthenticated, or missing-profile accounts: Denied (`#/admin-login` notice / redirect; `401`/`403` across APIs & RLS).

---

## 4. MFA Enforcement Behavior (Staged -> Strict Cutover)

1. **Before `enable_strict_mfa.sql` (`enforce_privileged_mfa = false`):**
   - Any `super_admin`, `admin`, or `coordinator` **with** a verified interactive factor (`totp`, `webauthn`, `phone`) is strictly required to satisfy `aal2` in UI (`needsMfaChallenge`), Edge Functions (`403 MFA_REQUIRED`), and PostgREST RLS (`private.is_admin_or_super()`).
   - Unenrolled `admin`/`super_admin` accounts can reach `#/admin -> Security & MFA` at `aal1` strictly so the initial Super Admin and staff can enroll their TOTP factors without bootstrap lockout.
2. **After `enable_strict_mfa.sql` (`enforce_privileged_mfa = true`, plus `ENFORCE_PRIVILEGED_MFA=true`):**
   - Requires verified `super_admin` TOTP enrollment prior to cutover (`DB-17` prevents owner self-lockout).
   - Both PostgreSQL PostgREST RLS (`private.is_admin_or_super()`) and all privileged Edge Functions unconditionally require **active verified interactive MFA factor + `aal = 'aal2'`** for `admin`/`super_admin` accounts.
   - `coordinator` accounts with verified MFA factors remain strictly enforced at `aal2` via `requirePrivilegedMfa()` in `get-coordinator-registrations`.
   - `PASSWORD_RECOVERY` and PKCE OAuth callbacks check `needsMfaChallenge` **before** password update or protected redirects.

---

## 5. Server-Side vs. Client-Side Protections (Honest Boundary)

| Security Control | Enforcement Layer | What It Prevents | Honest Limitation / Bypass Notes |
|---|---|---|---|
| **Role & Deactivation Checks** | **Server (PostgreSQL RLS + Triggers + Edge Functions)** | Spoofed JWT metadata, participant/coordinator privilege escalation, disabled admin API/DB mutations | GoTrue cannot revoke already-signed JWTs prior to `exp` (`3600s`), though all Edge Functions & DB admin/write policies immediately block deactivated staff (`profiles.is_active = false`), and `manage-admins` applies GoTrue `ban_duration: '876000h'` atomically to halt logins/refreshes. |
| **Privileged API / RPC / Table Access at AAL1** | **Server (Edge Functions `_shared/auth.ts` + PostgreSQL RLS `Migration 006`)** | Direct REST API calls (`get-admin-registrations`, `verify-payment`, `manage-admins`, `manage-competitions`, `get-coordinator-registrations`) and PostgREST `SELECT`s using AAL1 tokens | Requires Migration `006` + `enable_strict_mfa.sql` (and/or `ENFORCE_PRIVILEGED_MFA=true`) applied on live Supabase to remove staged unenrolled AAL1 fallback. |
| **Sole Verified Factor Deletion Guard (`Admin.jsx:630`)** | **Client UI Only (`Admin.jsx`) + GoTrue AAL2 + Server Strict Mode (`Migration 006`)** | Accidental single-click unenrollment of the last TOTP device inside Admin UI | **Native GoTrue API Limitation:** Supabase Cloud `auth.mfa_factors` is owned by `supabase_auth_admin`; project SQL migrations cannot attach triggers blocking `DELETE /auth/v1/factors/{id}`, and GoTrue permits an `aal2` session to unenroll factors directly via API. **Safe Architecture Mitigation:** Once strict mode (`enable_strict_mfa.sql`) is enabled, deleting a factor mid-session immediately revokes both PostgREST (`is_admin_or_super()`) and Edge Function (`requirePrivilegedMfa`) access (`!hasVerifiedMfaFactor` -> denied/`403`) rather than allowing an AAL1 fallback. |
| **Atomic Auth UI Gating (`#/admin-login`, `#/admin`, `#/signin`)** | **Client React (`AuthContext`, `AdminLogin`, `Admin`)** | Unauthenticated dashboard rendering, UI flash during OAuth/recovery/MFA, accidental credential caching in form memory | Visual routing guard only; all authoritative data and mutations remain locked behind server Edge Functions and PostgreSQL RLS. |

---

## 6. Skills, Agents & Test Cases with Actual Results

### Skills & Agents Used
- **Skills Activated:** `/agency-application-security-engineer`, `/agency-software-architect`, `/agency-frontend-developer`, `/agency-test-automation-engineer`, `/agency-evidence-collector`, `/ponytail`, `/ui-styling`, `/web-design-guidelines`, `/browser-qa`, `/vercel-react-best-practices`.
- **Custom Agents Invoked (`invoke_subagent`):**
  - `@database-reviewer` (*Migration 006 & RLS Database Auditor*, ID `37c8699d-5f44-4569-8796-6b69f28cbce4`) — Audited Migration `006` & `enable_strict_mfa.sql`; verified PASS with 4 LOW findings (`LOW-01`–`LOW-04`), all remediated.
  - `@security-reviewer` (*Final Auth & MFA Hardening Auditor*, ID `e347c226-85c7-419d-b80a-8d1406cd62cb`) — Audited Phase 3 auth/MFA/Edge hardening; verified PASS on core invariants with 1 MEDIUM (`banErr` rollback in `manage-admins`) & 5 LOW findings, all remediated.
  - `@react-reviewer` (*React & A11y Final Reviewer*, ID `bba00747-8953-4f3c-a518-9e45c8692b42`) — Audited `AuthContext.jsx`, `AdminLogin.jsx`, `neural-access-login.tsx/.scss`, and `Admin.jsx`; surfaced HIGH `AuthContext` init/navigate races, HIGH Mercury focus-ring/contrast gaps, HIGH `Admin.jsx` coordinator double-fetch, and MEDIUM unmount/A11y items, all remediated and re-verified.

### Post-Final-Edit Verification Results

| Layer | Suite / Command | Scope Covered | Actual Result |
|---|---|---|---|
| **PostgreSQL 19.0 Kernel (`001`–`005`)** | `node scratch/pg-sandbox/validate_migrations.mjs` | `DB-01`–`DB-16`: `anon` blocks, cross-user IDOR, profile role escalation, coordinator isolation, `admin` -> `super_admin`, `audit_logs` + seq + `TRUNCATE`, AAL1 vs AAL2 RLS, GUC spoofing, RPC privilege denial, deactivated admin blocks, `service_role` ops, `29` competitions + `4` accom plans | **PASS** (`16/16` passed, idempotent Migration `005` passed, `0` failed) |
| **PostgreSQL 19.0 Kernel (`001`–`006` + Cutover)** | `node scratch/pg-sandbox/validate_migration_006.mjs` | `DB-17` (lockout refusal before super_admin TOTP), `DB-18` (strict RLS blocks unenrolled AAL1, deleted-factor AAL1, and **stale mid-session deleted-factor AAL2 JWT**, while verified AAL2 passes), `DB-19` (client roles blocked from `private.security_settings` + policy RPCs, `DELETE` protected) | **PASS** (`DB-17`–`DB-19` passed, Migration `006` idempotency preserved `enforce_privileged_mfa = true`) |
| **Deno Check & Security Tests** | `deno check` + `deno test --allow-env supabase\tests\edge_security_test.ts` | All 8 Edge Functions, CORS, rate limiting, price/role tampering, 12-digit UTR & reuse blocks, `verify-payment`, `get-admin-registrations` CSV escaping, `manage-admins`, `manage-competitions`, `get-coordinator-registrations`, `requirePrivilegedMfa` (enrolled AAL1 downgrade, coordinator AAL1 downgrade, DB `get_privileged_mfa_policy` RPC sync, fail-closed RPC error, **mid-session deleted-factor AAL2 JWT rejection**) | **PASS** (`0` type errors; **`9 passed | 0 failed`** in `325ms`) |
| **TypeScript & ESLint** | `tsc --noEmit` + `eslint ... --max-warnings=0` | `AuthContext.jsx`, `Auth.jsx`, `Admin.jsx`, `AdminLogin.jsx`, `neural-access-login.tsx`, `security.test.js` | **PASS** (`0` TS errors, `0` ESLint errors, `0` warnings) |
| **Jest Security Suite** | `$env:CI="true"; npm.cmd test -- --watchAll=false` | All 14 UI, RBAC, MFA gate, recovery, missing-profile fail-closed (`profileLoadError: true`), sole-factor removal UI block, Admin token/theme unification, HaloReel keyboard nav, and Mercury AdminLogin tests *(mocked Supabase Auth/`useAuth`)* | **PASS** (`1` suite, **`14 passed, 0 failed`**, `24.386 s`) |
| **Production Build & Repo Hygiene** | `$env:CI="false"; npm.cmd run build`, `git diff --check`, `git grep` secret scan | Production bundle compilation, trailing whitespace/markers, private keys / live secrets | **PASS** (build exit `0`, `git diff --check` exit `0`, secret scan `0` hits) |
| **Playwright Chromium QA** | `qa_mercury_admin_login.py` against ephemeral `qa-mercury-build` | 6 viewports (`360×800`, `390×844`, `768×1024`, `1024×768`, `1366×768`, `1920×1080`), liquid blobs + SVG goo filter, mouse parallax without transform overwrite, `prefers-reduced-motion` disable, password show/hide, email validation, Encrypted Recovery toggle, Tab navigation, `#/admin` unauth -> `#/admin-login` redirect, `#/signin` `Admin Login` link, `#/` homepage 29 HaloReel slots & zero Mercury CSS leak | **PASS** (`0px` overflow across all 6 viewports, `0` page errors, `0` console errors) |

*(Note: Light/Dark Admin Dashboard `app-1` Playwright checks (`360`–`1920`) were additionally verified in [FINAL_SECURITY_AND_THEME_AUDIT.md](file:///c:/Users/sujal/syn/docs/FINAL_SECURITY_AND_THEME_AUDIT.md) and verified by Jest suite #10 after final edits.)*

---

## 7. Remaining Limitations

1. **Mocked Auth/Edge vs. Live Hosted Environment:** Local tests used PGlite `19.0`, mocked Deno lookups/React Supabase clients, and an ephemeral scratch QA bundle because live Supabase project URL/service-role credentials are not stored in the repository. Live GoTrue HTTP flows (Google OAuth code exchange, recovery email links, real TOTP authenticator QR enrollment & challenge verification) and hosted PostgREST HTTP gateway calls remain unverified until owner deployment.
2. **Pre-Auth Edge IP Rate Limiting (`supabase/config.toml`):** `verify_jwt = false` remains intentional so Edge CORS handlers reply cleanly to browser preflights; authenticated user rate limiting is active, while unauthenticated IP flood protection remains at CDN/future gateway level.
3. **Stateless Deactivated JWT Read Window:** A deactivated admin's already-signed JWT can still read their own historical `registrations`/`payments` (no cross-user or staff access) until `exp` (`3600s`) or refresh rejection via `ban_duration`.

---

## 8. Owner-Only Configuration Steps

1. **Supabase Dashboard -> Authentication -> Providers -> Google:** Enable Google OAuth, enter Google Cloud Client ID & Secret, and configure **URL Configuration -> Site URL & Redirect URLs** (`https://<your-domain>/`, `http://localhost:3000/`).
2. **Supabase Dashboard -> Authentication -> Email / Attack Protection:** Set **Minimum Password Length = `12`**, enforce character complexity, enable **Confirm email**, and enable **Leaked Password Protection** (if available on plan).
3. **Supabase Dashboard -> Authentication -> Multi-Factor:** Enable **TOTP** authenticator app MFA.
4. **Supabase Edge Function Secrets:** Configure `ALLOWED_ORIGINS="https://<your-domain>"`, `UPI_VPA`, `UPI_PAYEE_NAME`, optional `RESEND_API_KEY` / `EMAIL_FROM`, and `ENFORCE_PRIVILEGED_MFA="true"` (after step 4 of deployment sequence below).
5. **Frontend Env Vars (Vercel / `.env.local`):** Set `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_UPI_VPA`, `REACT_APP_UPI_PAYEE_NAME`. Never expose `SUPABASE_SERVICE_ROLE_KEY`.

---

## 9. Exact Deployment Sequence (Zero-Lockout Order)

1. Push/deploy frontend build (containing `#/admin-login` NEURAL ACCESS, atomic `AuthContext`, hardened `Admin`).
2. Apply database migrations **`001` through `006`** sequentially (`npx supabase db push` or Supabase SQL Editor).
3. Deploy all 8 Edge Functions (`npx supabase functions deploy`) with `ALLOWED_ORIGINS` set.
4. Register/sign in as the owner account, run [supabase/scripts/bootstrap_super_admin.sql](file:///c:/Users/sujal/syn/supabase/scripts/bootstrap_super_admin.sql) once with your verified UUID.
5. Sign in via `#/admin-login`, open `#/admin` -> **Security & MFA**, enroll and verify at least one primary TOTP authenticator app (+ optional backup device) for your `super_admin` and active `admin` accounts.
6. Execute **[supabase/scripts/enable_strict_mfa.sql](file:///c:/Users/sujal/syn/supabase/scripts/enable_strict_mfa.sql)** in Supabase SQL Editor and set `ENFORCE_PRIVILEGED_MFA=true` in Edge Function secrets (`npx supabase secrets set ENFORCE_PRIVILEGED_MFA=true`).
7. Perform live staging smoke test: verify participant denial on `#/admin`, verify `admin`/`super_admin` TOTP prompt at AAL1 -> full access at AAL2, verify direct AAL1 `/rest/v1/registrations` returns `[]` and Edge returns `403 MFA_REQUIRED`.

---

**Final Git Status Note:** All changes remain **uncommitted** in `C:\Users\sujal\syn`; no commit, push, or remote deployment was performed.
