# ROXX BCE TECHNORITI — Final CSS Regression & Independent Authentication Security Audit

**Project:** BCE Bhagalpur — TECHNORITI '26  
**Repository:** `https://github.com/RoxxSujal7/roxx-bce-technoriti` (`C:\Users\sujal\syn`)  
**Scope:** Independent final verification of Admin Design System Unification, `HaloReel` CSS scoping isolation, Homepage Carousel preservation, and End-to-End Authentication / MFA / AAL2 / RBAC / PostgreSQL RLS & RPC Security.

---

## Final Verdict

**`READY FOR OWNER CONFIGURATION`**

All safe local code, CSS isolation, light/dark theme parity, authentication hardening, AAL2 MFA enforcement (across both Edge Functions and PostgreSQL RLS via Migration `005`), Jest + Deno regression suites, TypeScript/ESLint checks, secret scans, and 6-viewport Playwright visual checks pass with exit code `0`. Live Supabase Dashboard password policy settings, Google OAuth credentials, PostgreSQL migration execution (`001`–`005`), Edge Function secrets (`ENFORCE_PRIVILEGED_MFA=true`, `ALLOWED_ORIGINS`), and Vercel environment configuration require owner action against the live project and are explicitly distinguished as unverified live dependencies.

---

## 1. Inventory Location and Skills / Agents Actually Used

- **Authoritative Inventory Locations Inspected:**
  - Skills directory: `C:\Users\sujal\.gemini\config\skills\` (**470** installed skill directories verified)
  - Custom agents directory: `C:\Users\sujal\.gemini\config\agents\` (**93** agent definitions verified)
  - Global rules & project audit reference: `C:\Users\sujal\.gemini\config\plugins\roxx-engineering\rules\AGENTS.md`, [MCP-AND-SKILLS-AUDIT.md](file:///c:/Users/sujal/syn/docs/MCP-AND-SKILLS-AUDIT.md)
- **Installed Skills Verified & Activated:**
  - `/ponytail` — Enforced minimal, root-cause fixes without speculative abstraction or duplicate auth systems.
  - `/ui-styling` — Audited shadcn/ui + Tailwind token hierarchy (`--background`, `--card`, `--secondary`, `--destructive`, `--status-*`).
  - `/web-design-guidelines` — Checked contrast, focus visibility, ARIA roles, keyboard `Escape` dialog dismissal, and icon button labels.
  - `/vercel-react-best-practices` — Verified render stability (`useMemo`/`useCallback`), cleanup of root DOM classes, and removal of third-party Google icon CDN calls.
  - `/agency-frontend-developer` — Validated React 18 component unification across Admin panels and portal gates.
  - `/agency-application-security-engineer` — Guided JWT/AAL2 verification, password policy audit, MFA downgrade guards, and OAuth/recovery precedence checks.
  - `/agency-software-architect` — Verified authorization boundaries across React routes, Edge Functions, and PostgreSQL RLS/RPCs.
  - `/agency-test-automation-engineer`, `/agency-evidence-collector`, `/browser-qa` — Designed deterministic Playwright 6-viewport + Light/Dark assertions with zero arbitrary sleeps and inspected screenshots directly.
- **Custom Agents Actually Invoked (`invoke_subagent`):**
  - `@security-reviewer` (*Independent Auth & Edge Security Auditor*, ID `4f4db380-2718-48f5-a70e-a4471ff153c4`) — Read-only white-box audit of frontend Auth/MFA, GoTrue behavior, `_shared/auth.ts`, and all 8 Edge Functions.
  - `@database-reviewer` (*Independent PostgreSQL RLS & RPC Auditor*, ID `6b6696e6-a9c3-4807-8999-3a52e9009f5d`) — Read-only SQL audit of Migrations `001`–`004` and `bootstrap_super_admin.sql`.
- **Unavailable Candidates:** None (all candidate skills/agents checked exist in the inventory).

---

## 2. Initial Git Status (Baseline Before Final Audit Fixes)

At the start of this independent audit:
- `17` modified tracked files (`src/components/HaloReel.scss`, `src/tailwind.css`, `src/screens/Admin.jsx`, `src/screens/Auth.jsx`, `src/context/AuthContext.jsx`, `src/components/ui/{app-1.tsx,auth-fuse.tsx,badge.tsx}`, `src/components/ui/app-1-utils/{app-1-data.ts,app-1-sidebar.tsx}`, `src/security.test.js`, `supabase/functions/_shared/auth.ts`, `supabase/functions/{get-admin-registrations,manage-admins,manage-competitions,verify-payment}/handler.ts`, `supabase/tests/edge_security_test.ts`) plus `1` untracked report (`docs/ADMIN_THEME_AND_AUTH_SECURITY_REPORT.md`).
- **Pre-existing baseline untouched:** `src/components/HaloReel.jsx` (`git diff src/components/HaloReel.jsx` empty).

---

## 3. HaloReel Source-Level Findings

- **[HaloReel.jsx](file:///c:/Users/sujal/syn/src/components/HaloReel.jsx):** Unmodified. Renders cards inside `App.jsx:45` (`<div className="halo-stage-wrapper"><HaloReel ... /></div>`).
- **[HaloReel.scss](file:///c:/Users/sujal/syn/src/components/HaloReel.scss):**
  - Lines `2–7` preserve `.halo-reel-wrapper` standalone radial-gradient background (`radial-gradient(circle at center, rgba(30, 16, 42, 0.6) 0%, rgba(0, 0, 0, 0.95) 70%)`) and top/bottom `1px` borders.
  - Lines `9–83` nest all custom carousel utility selectors (`.relative`, `.absolute`, `.shadow-xl`, `.bg-card`, `.text-card-foreground`, `.text-2xl`, `.font-black`, `.leading-none`, `.text-[0.6rem]`, `.uppercase`, `.tracking-[0.2em]`, `.opacity-70`, `.focus-visible:ring-2`) cleanly inside `.halo-stage-wrapper, .halo-reel-wrapper { ... }`.
  - **Result:** Zero global utility selectors remain outside `.halo-stage-wrapper` / `.halo-reel-wrapper`.

---

## 4. Compiled CSS Selector Evidence

Inspected generated production stylesheet `build/static/css/main.03e1aea3.css` (`273,778` bytes):

- **Scoped HaloReel selectors emitted:**
  ```css
  .halo-reel-wrapper{background:radial-gradient(circle at center,#1e102a99 0,#000000f2 70%);...}
  .halo-reel-wrapper .bg-card,.halo-stage-wrapper .bg-card{background:linear-gradient(145deg,#1e1329,#0d0914)}
  .halo-reel-wrapper .text-card-foreground,.halo-stage-wrapper .text-card-foreground{color:#fff}
  .halo-reel-wrapper .shadow-xl,.halo-stage-wrapper .shadow-xl{background-color:#121016;border:1px solid #be00d773;border-radius:18px;box-shadow:0 16px 36px #000c,0 0 20px #be00d759}
  .halo-reel-wrapper .font-black,.halo-stage-wrapper .font-black{font-family:Poppins,sans-serif;font-weight:800}
  .halo-reel-wrapper .opacity-70,.halo-stage-wrapper .opacity-70{opacity:.85}
  ```
- **Pure global Tailwind token rules verified intact (no HaloReel gradient leak):**
  ```css
  .bg-card{background-color:#141414;background-color:hsl(var(--card))}
  .text-card-foreground{color:#fafafa;color:hsl(var(--card-foreground))}
  ```
- **Admin shell Bootstrap `!important` neutralization strictly scoped to Admin & Dialog portals:**
  ```css
  .technoriti-admin-shell .bg-primary,[role=dialog] .bg-primary{background-color:#bd00d6!important;background-color:hsl(var(--primary))!important;color:#fff!important;color:hsl(var(--primary-foreground))!important}
  .technoriti-admin-shell .bg-secondary,[role=dialog] .bg-secondary{background-color:#27272a!important;background-color:hsl(var(--secondary))!important;color:#fafafa!important;color:hsl(var(--secondary-foreground))!important}
  .technoriti-admin-shell .bg-card,[role=dialog] .bg-card{background-color:#141414!important;background-color:hsl(var(--card))!important;color:#fafafa!important;color:hsl(var(--card-foreground))!important}
  ```

---

## 5. Homepage Carousel Regression Results

- Verified against live local build (`http://127.0.0.1:3000/#/`) in headless Chromium:
  - `.halo-stage-wrapper` present (`hasStageWrapper: true`), rendering all `29` competition card slots (`cardCount: 29`, card box `188 × 263` px at `1366×768`).
  - ArrowRight keyboard navigation focused and rotated carousel cleanly without JS/CSS errors.
  - Visual screenshot [qa-homepage-carousel-1366.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-homepage-carousel-1366.png) confirms preserved glowing dark cards, cyan subtitle (`ROBOTICS & HARDWARE`), purple `ROBOWAR` title, navbar, and 0px horizontal overflow.
  - Navigating away from Light Mode `#/admin` to `#/` cleared `.admin-theme-light` (`lightClassLeaked: false`).

---

## 6. Admin Light / Dark Theme Results

- **Unified Token Adoption:** Every operational section (`overview`, `registrations`, `pending-verification`, `competitions`, `staff`, `audit`, `security`), Coordinator roster, portal gates, and `Reconcile Registration` drawer (`Sheet`) use identical Tailwind CSS tokens and shadcn primitives (`Card`, `Button`, `Badge`, `Input`, `Label`, `Skeleton`, `Sheet`). Zero `.registration-card` or `table-dark` classes remain in `Admin.jsx`.
- **Playwright Computed Style Verification (`1366×768` Light Mode):**
  - `document.documentElement.classList.contains('admin-theme-light')` === `true` across all admin views and portaled `[role="dialog"]` sheets, and persists in `localStorage` (`technoriti_admin_theme`).
  - `shellBg` = `rgb(250, 250, 250)`, `cardBg` = `rgb(255, 255, 255)`, `sheetBg` = `rgb(250, 250, 250)`, horizontal overflow = `0` across all sections (`overview`, `registrations`, `pending-verification`, `competitions`, `staff`, `audit`, `security`).
- **Dark Mode Transition Check:** Verified computed sidebar text settles cleanly to `rgb(245, 245, 245)`/`rgb(250, 250, 250)` after Dark Mode toggle ([qa-admin-security-mfa-1366-dark.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-security-mfa-1366-dark.png)).

---

## 7. Authentication Audit

- **Email + Password (`auth-fuse.tsx`):** Uses official Supabase Auth `signInWithPassword`, `signUp`, `resetPasswordForEmail`, and `updateUser`. Non-enumerating error normalization hides email existence on login/signup/recovery.
- **Google OAuth PKCE (`supabaseClient.js`, `AuthContext.jsx`, `Auth.jsx`):** Uses `flowType: 'pkce'`, `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: true`, sanitized internal redirect allowlist (`'/', '/dashboard', '/register', '/admin'`), callback URL parameter scrubbing (`sanitizeAuthCallbackUrl()`), offline inline Google icon SVG (zero third-party CDN request), and **fixed post-OAuth MFA check** so MFA-enrolled accounts completing Google login at AAL1 are routed to `/signin` for TOTP challenge before entering protected routes.
- **Password Recovery Precedence Fix (`auth-fuse.tsx`):** `if (needsMfaChallenge)` now executes **before** `if (isPasswordRecovery)` so MFA-enrolled admins satisfy AAL2 before GoTrue `updateUser({ password })` rather than failing with `insufficient_aal`.
- **Untrusted OAuth Metadata:** `handle_new_user()` trigger hardcodes `role = 'participant'` and `is_active = true`, never reading roles from `raw_user_meta_data`.

---

## 8. Password Security Findings

- **No Custom Password Hashing or Storage:** Zero SHA-256, MD5, or plaintext password storage in `src/` or `supabase/`; credentials go exclusively to Supabase Auth (salted bcrypt server-side). Zero passwords appear in logs (`logSecurityEvent` redacts `password`/`token`/`secret`/`utr`).
- **Client vs. Server Enforcement Finding (`HIGH`):**
  - Client UI (`validateStrongPassword` in `auth-fuse.tsx`) enforces `>= 12` chars, 3/4 character classes, and Confirm Password fields on signup & password reset.
  - **Gap:** `supabase/config.toml` omits hosted password length/complexity parameters (`minimum_password_length` defaults to 6 in GoTrue) and hosted Dashboard **Leaked Password Protection (HIBP)** requires owner configuration in Supabase Auth settings (see Section 17).

---

## 9. MFA and AAL2 Findings

- **Fixed During Audit:**
  1. **[CRITICAL] Direct PostgREST AAL2 Bypass (`HIGH-01` / `F-01`):** Previously, `private.is_admin_or_super()` in `002` had no `auth.jwt() ->> 'aal'` check. Added [Migration 005](file:///c:/Users/sujal/syn/supabase/migrations/20261125000005_mfa_rls_and_privilege_hardening.sql) requiring `aal = 'aal2'` whenever a verified factor exists in `auth.mfa_factors`, while preserving `profiles_select_own` at `aal1` so `AuthContext` can read `profile.role` and render the TOTP prompt.
  2. **[HIGH] Coordinator Endpoint Missing MFA Check (`HIGH-02` / `F-02`):** Added `requirePrivilegedMfa(actor, corsHeaders)` to [get-coordinator-registrations/handler.ts](file:///c:/Users/sujal/syn/supabase/functions/get-coordinator-registrations/handler.ts), closing AAL1 full-roster reads by admins/super_admins.
  3. **[HIGH] Trivial Sole-Factor Unenrollment & Stale Session (`F-03`):** Blocked single-click removal of the sole verified factor for `super_admin` / `admin` in [Admin.jsx](file:///c:/Users/sujal/syn/src/screens/Admin.jsx) (must enroll a backup factor first) and added `await supabase.auth.refreshSession()` on factor removal.
  4. **[MEDIUM] `data.user.factors` Fail-Open Fallback & UTF-8 JWT Decoding (`F-05`):** Updated [supabase/functions/_shared/auth.ts](file:///c:/Users/sujal/syn/supabase/functions/_shared/auth.ts) to use `TextDecoder` on base64url JWT claims and query `adminClient.auth.admin.mfa.listFactors` (failing closed on error) if `data.user.factors` is omitted; updated [AuthContext.jsx](file:///c:/Users/sujal/syn/src/context/AuthContext.jsx) so `needsMfaChallenge` derives from `aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2'`.
- **Confirmed GoTrue Architecture Note (`MEDIUM`):** `decodeValidatedJwtAal()` is non-exported and runs **only after** `adminClient.auth.getUser(token)` verifies the JWT with GoTrue (tampered/unsigned tokens return `401`). However, when a verified MFA factor is unenrolled, GoTrue downgrades the DB session without revoking an already-minted JWT until `exp` (`3600s` in `config.toml:25`).

---

## 10. Full Edge Function Authorization Matrix

| Function | Methods | Auth Check | Role Requirement | MFA AAL2 Guard (`requirePrivilegedMfa`) | Rate Limit & CORS |
|---|---|---|---|---|---|
| `create-registration` | `POST` | `authenticateRequest` (`401`/`403`) | Any active user | N/A (participant flow) | `create_reg:{id}` 15/300s + CORS |
| `submit-utr` | `POST` | `authenticateRequest` (`401`/`403`) | Owner checked in `submit_utr_tx` | N/A (participant flow) | `submit_utr:{id}` 10/300s + CORS |
| `get-my-registrations` | `GET` | `authenticateRequest` (`401`/`403`) | Self (`user_id = actor.id`) | N/A (participant flow) | `my_regs:{id}` 60/60s + CORS |
| `get-coordinator-registrations` | `GET` | `authenticateRequest` (`401`/`403`) | `coordinator`, `admin`, `super_admin` | **YES** (for `admin`/`super_admin`, added in remediation) | `coord_regs:{id}` 60/60s + CORS |
| `get-admin-registrations` | `GET` | `authenticateRequest` (`401`/`403`) | `admin`, `super_admin` | **YES** | `admin_regs:{id}` 60/60s + CORS |
| `verify-payment` | `POST` | `authenticateRequest` (`401`/`403`) | `admin`, `super_admin` | **YES** | `verify_payment:{id}` 60/60s + CORS |
| `manage-admins` | `GET`, `POST` | `authenticateRequest` (`401`/`403`) | `super_admin` only | **YES** | `manage_admins:{id}` 30/60s + CORS |
| `manage-competitions` | `GET`, `PATCH` | `authenticateRequest` (`401`/`403`) | `admin`, `super_admin` (`super_admin` only for fees/accom) | **YES** | `manage_comps:{id}` 40/60s + CORS |

*(Also hardened [cors.ts](file:///c:/Users/sujal/syn/supabase/functions/_shared/cors.ts): hosted `SUPABASE_URL` fails closed `[]` if `ALLOWED_ORIGINS` is unset instead of allowing `localhost:3000`.)*

---

## 11. RLS and RPC Security Findings (Migrations `001`–`005`)

- All 10 tables (`profiles`, `competitions`, `accommodation_plans`, `registrations`, `registration_arenas`, `payments`, `coordinator_assignments`, `audit_logs`, `rate_limits`, `email_notifications`) enable RLS (`002:144-153`).
- All 7 `public` RPCs (`check_and_increment_rate_limit`, `create_registration_tx`, `submit_utr_tx`, `verify_payment_tx`, `get_registration_summary`, `get_admin_dashboard_analytics`, `get_coordinator_dashboard_analytics`) run `REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;`.
- **Added in Migration `005` (`20261125000005_mfa_rls_and_privilege_hardening.sql`):**
  - Enforced AAL2 inside `private.is_admin_or_super()` when verified MFA factors exist (`HIGH-01`).
  - Dropped `audit_logs_select_admin` + `REVOKE ALL` on `audit_logs` from `anon, authenticated` so `audit_logs` are readable only via `get-admin-registrations` (`service_role` sanitized cap/allowlist) (`MED-01`), plus `BEFORE TRUNCATE` guard (`LOW-02`).
  - Replaced `REVOKE INSERT, UPDATE, DELETE` with `REVOKE ALL` + explicit minimal `GRANT SELECT`/`GRANT UPDATE (...)` (`LOW-02`), restricted `private` schema & `private.current_user_role()` (`LOW-03`), included `pg_temp` last in `search_path` (`LOW-04`), and simplified `prevent_privileged_profile_mutation()` to `current_user NOT IN ('postgres', 'supabase_admin', 'service_role')` (`LOW-01`).

---

## 12. Attack Scenarios Tested and Results

| # | Attack Scenario | Outcome | Basis |
|---|---|---|---|
| 1 | Participant reads another participant's registration via PostgREST/API | **BLOCKED** | Static SQL audit (`registrations_select_scoped`: `user_id = auth.uid()`), Deno test `get-my-registrations` |
| 2 | Coordinator reads registrations outside assigned arenas | **BLOCKED** | Static SQL + Deno test (`get-coordinator-registrations`: `403 FORBIDDEN`) |
| 3 | Coordinator views global payment/financial data | **BLOCKED** | Static SQL (`payments_select_scoped` excludes coordinators) + Jest & Deno tests |
| 4 | Regular `admin` grants `super_admin` or alters tariffs/accommodation | **BLOCKED** | Deno tests (`manage-admins`, `manage-competitions`: `403 FORBIDDEN`) |
| 5 | Participant alters `profiles.role` / OAuth `raw_user_meta_data` escalation | **BLOCKED** | Column `GRANT UPDATE` + RLS + `handle_new_user()` + `prevent_privileged_profile_mutation()` (static SQL audit) |
| 6 | Client calls `verify_payment_tx` / `get_admin_dashboard_analytics` directly via `/rest/v1/rpc/...` | **BLOCKED** | `REVOKE ALL ... FROM PUBLIC, anon, authenticated` (`002`, `004`) |
| 7 | Admin/Super Admin bypasses Edge Function via direct PostgREST `audit_logs` / `registrations` at AAL1 | **BLOCKED AFTER REMEDIATION** | Migration `005` (`private.is_admin_or_super()` AAL2 check + `REVOKE ALL` on `audit_logs`) — static SQL review |
| 8 | Enforced MFA admin calls `get-coordinator-registrations` or `get-admin-registrations` with AAL1 token | **BLOCKED** | Deno test `Privileged Edge Functions block enrolled MFA accounts at AAL1...` (`403 MFA_REQUIRED`) |
| 9 | Enforced MFA admin removes sole TOTP factor in UI to downgrade to AAL1 | **BLOCKED IN UI (+ AAL2 server rule)** | Jest test (`Remove` blocked with alert until backup factor enrolled) + GoTrue `UnenrollFactor` requires AAL2 |
| 10 | Open redirect / client-tampered role / tampered registration price | **BLOCKED** | Jest + Deno tests (`sanitizeInternalRedirect`, `FORBIDDEN_CLIENT_FIELDS`) |

*(Note: Direct PostgreSQL/PostgREST SQL execution tests against a live Postgres engine were not run locally; SQL controls in Migrations `001`–`005` were verified via white-box static SQL review.)*

---

## 13. All Files Changed

- Modified (19): `src/components/HaloReel.scss`, `src/tailwind.css`, `src/screens/Admin.jsx`, `src/screens/Auth.jsx`, `src/context/AuthContext.jsx`, `src/components/ui/{app-1.tsx,auth-fuse.tsx,badge.tsx}`, `src/components/ui/app-1-utils/{app-1-data.ts,app-1-sidebar.tsx}`, `src/security.test.js`, `supabase/functions/_shared/{auth.ts,cors.ts}`, `supabase/functions/{get-admin-registrations,get-coordinator-registrations,manage-admins,manage-competitions,verify-payment}/handler.ts`, `supabase/tests/edge_security_test.ts`.
- Added (3): [supabase/migrations/20261125000005_mfa_rls_and_privilege_hardening.sql](file:///c:/Users/sujal/syn/supabase/migrations/20261125000005_mfa_rls_and_privilege_hardening.sql), [docs/ADMIN_THEME_AND_AUTH_SECURITY_REPORT.md](file:///c:/Users/sujal/syn/docs/ADMIN_THEME_AND_AUTH_SECURITY_REPORT.md), and this report (`docs/FINAL_SECURITY_AND_THEME_AUDIT.md`).

---

## 14. Actual Test Counts and Exit Codes

| Check Command | Scope | Pass / Fail Count | Exit Code |
|---|---|---|---|
| `npx.cmd tsc --noEmit` | Full TypeScript codebase | `0` errors | `0` |
| `npx.cmd eslint` (9 changed/tested files) | Admin, Auth, AuthContext, UI primitives, `security.test.js` | `0` errors, `0` warnings | `0` |
| `npm.cmd test -- --watchAll=false` | Jest `src/security.test.js` | `1 passed suite`, `10 passed, 0 failed` | `0` |
| `deno check supabase\functions\*\index.ts supabase\tests\edge_security_test.ts` | All 8 Edge Functions + security test suite | All checked cleanly | `0` |
| `deno test --allow-env supabase\tests\edge_security_test.ts` | Edge security, RBAC, MFA AAL2 & CORS suite | `9 passed, 0 failed` | `0` |
| `$env:CI="false"; npm.cmd run build` | Production CRA build (`build/`) | `495.92 kB` JS, `42.35 kB` CSS gzipped | `0` |
| `git diff --check` | Trailing whitespace / conflict markers | Clean | `0` |
| `rg` secret scan (`src/`, `supabase/`, `docs/`, `.env.*`) | Private keys, live tokens, JWTs | `0` hits | `1` *(no matches)* |
| Playwright Chromium QA (`scratch\qa_verify.py` against `http://127.0.0.1:3000`) | 6 viewports (`360`–`1920`), Light & Dark Admin sections, Sheet, `#/`, `#/signin`, `#/signup` | All assertions passed (`0px` overflow, `0` pageErrors, `0` consoleErrors excluding `<meta frame-ancestors>` notice) | `0` |

---

## 15. Browser Screenshots & Exact Paths

All captured from the compiled bundle in headless Chromium (`C:\Users\sujal\.gemini\antigravity\brain\9fe4ab58-607f-4b96-81ce-c01eef9ad320\`):
- Homepage HaloReel Carousel (`1366×768`): [qa-homepage-carousel-1366.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-homepage-carousel-1366.png)
- Admin Home Dark (`1366×768` & `390×844`): [qa-admin-overview-1366-dark.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-overview-1366-dark.png), [qa-admin-mobile-390-dark.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-mobile-390-dark.png)
- Admin Home Light (`1366×768`): [qa-admin-overview-1366-light.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-overview-1366-light.png)
- Registrations & Reconciliation Drawer Light (`1366×768`): [qa-admin-registrations-1366-light.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-registrations-1366-light.png), [qa-admin-reconcile-sheet-light.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-reconcile-sheet-light.png)
- Competitions & Accommodation Tariffs Light (`1366×768`): [qa-admin-competitions-1366-light.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-competitions-1366-light.png)
- Admins & Coordinators Light (`1366×768`): [qa-admin-staff-1366-light.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-staff-1366-light.png)
- Security & MFA Light & Dark (`1366×768`): [qa-admin-security-mfa-1366-light.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-security-mfa-1366-light.png), [qa-admin-security-mfa-1366-dark.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-security-mfa-1366-dark.png)
- Sign In & Sign Up (`1366×768`): [qa-auth-signin-1366.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-auth-signin-1366.png), [qa-auth-signup-1366.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-auth-signup-1366.png)

---

## 16. Unresolved / Architectural Items Requiring Owner Tradeoff or Future Iteration

1. **Pre-Auth IP Rate Limiting & `verify_jwt` Gateway Mode (`MEDIUM`):** `supabase/config.toml` sets `verify_jwt = false` across functions so custom Edge CORS headers work on preflight; pre-auth IP rate limiting (calling existing `getClientIp()` in `rateLimit.ts`) is left as a future DoS hardening step.
2. **Stale Minted JWT Window After MFA Factor Revocation (`MEDIUM`):** Supabase GoTrue downgrades session rows on factor unenroll without invalidating previously signed JWTs until `exp`; lowering `jwt_expiry` (`3600s` -> `300s`–`900s`) is configurable cleanly in `config.toml` / Supabase Auth Dashboard.
3. **Non-Atomic `audit_logs` Writes in `manage-admins` / `manage-competitions` (`LOW`):** Currently write table updates and `audit_logs` sequentially rather than in a single PostgreSQL RPC.
4. **Deactivated Users Holding Unexpired JWTs (`LOW`):** Can still read own historical `registrations`/`payments` via PostgREST until `exp` (`3600s`), though Edge Functions immediately block with `403` and no mutations are permitted; revoking GoTrue refresh tokens via `admin.updateUserById(..., { ban_duration })` would tighten this further.

---

## 17. Owner-Only Configuration Requirements

1. Apply database migrations `001` through **`005`** (`20261125000005_mfa_rls_and_privilege_hardening.sql`) and run `supabase/scripts/bootstrap_super_admin.sql`.
2. In **Supabase Dashboard -> Authentication -> Providers -> Google**: Enable Google OAuth with Client ID/Secret and set `Site URL` + `Redirect URLs` allowlist (`https://<prod-domain>/`, `http://localhost:3000/`).
3. In **Supabase Dashboard -> Authentication -> Providers -> Email / Security**: Set Minimum Password Length = `12`, enable password complexity requirements, Confirm Email = ON, Leaked Password Protection = ON (if supported on tier).
4. In **Supabase Dashboard -> Authentication -> Multi-Factor**: Enable TOTP MFA.
5. Deploy all 8 Edge Functions (`npx supabase functions deploy`) and set required Edge Function secrets (`ALLOWED_ORIGINS`, and after initial Super Admin / Admin staff enroll TOTP inside `#/admin -> Security & MFA`, set **`ENFORCE_PRIVILEGED_MFA=true`**).
6. Set `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_UPI_VPA`, `REACT_APP_UPI_PAYEE_NAME` in Vercel (never expose `SUPABASE_SERVICE_ROLE_KEY`).

---

## 18. Final Git Status

- All changes remain **uncommitted** on branch `main` in `C:\Users\sujal\syn` (`19` modified tracked files, `3` new untracked files: Migration `005`, `docs/ADMIN_THEME_AND_AUTH_SECURITY_REPORT.md`, `docs/FINAL_SECURITY_AND_THEME_AUDIT.md`). No commit, push, or deployment was performed.
