# ROXX BCE TECHNORITI — Admin Design System Unification & Authentication Security Report

**Project:** ROXX BCE TECHNORITI (`TECHNORITI '26` — BCE Bhagalpur)  
**Repository:** `https://github.com/RoxxSujal7/roxx-bce-technoriti` (`C:\Users\sujal\syn`)  
**Scope:** Admin Portal UI/Theme Unification (`#/admin`), Authentication Hardening (`#/signin`, `#/signup`), Supabase TOTP MFA & Server-Side AAL2 Enforcement, Automated Security & Browser QA Verification

---

## Executive Verdict

`READY FOR OWNER CONFIGURATION`

All safe local code, design-system unification, authentication hardening, TOTP MFA enrollment/challenge flows, server-side RBAC/AAL2 enforcement, automated regression suites (Jest + Deno + TypeScript + ESLint), production build hygiene, and 6-viewport Playwright visual QA across both dark and light themes are complete and verified. Live Supabase Dashboard authentication settings, Google OAuth credentials, PostgreSQL migrations (`001`–`004`), Edge Function secrets (`ENFORCE_PRIVILEGED_MFA`), and live end-to-end cloud authentication require owner configuration in the target Supabase/Vercel project and are therefore marked pending rather than claimed complete.

---

## 1. Initial Problems Discovered

| ID | Severity | Finding | Location |
|---|---|---|---|
| **F-01** | **HIGH** | **Half-light / half-dark broken admin UI under Light Mode:** `Admin.jsx` mixed App-1 Tailwind cards/charts (`bg-card`, `text-foreground`) with legacy React-Bootstrap `<Card className="registration-card">`, `<Table variant="dark">`, `<Form.Select className="dark-input">`, `<Form.Control className="dark-input">`, and `<Modal className="technoriti-payment-modal">` while `src/tailwind.css` forced `.admin-theme-light .registration-card { background: #141318; color: #ffffff; }`. | `src/screens/Admin.jsx`, `src/tailwind.css` |
| **F-02** | **HIGH** | **Global `.bg-card` & Bootstrap `!important` utility leakage:** `src/components/HaloReel.scss` declared an unscoped `.bg-card { background: linear-gradient(145deg, #1e1329 0%, #0d0914 100%); }` and `.text-card-foreground { color: #ffffff; }`, causing Tailwind `<Card>` surfaces in Admin Light Mode to stay pitch-dark while text became dark `#121216` (unreadable contrast). Bootstrap 5 `.bg-primary`, `.bg-secondary`, `.bg-destructive`, and `.text-primary` `!important` utilities also overrode TECHNORITI purple tokens (`#BE00D7`) with Bootstrap `#0d6efd` blue / dark grey in admin sections. | `src/components/HaloReel.scss`, `src/tailwind.css` |
| **F-03** | **MEDIUM** | **Portaled Radix overlays missed light theme & theme state did not persist:** `.admin-theme-light` lived only on `SidebarProvider`, so portaled `Sheet` / `Tooltip` nodes on `document.body` always fell back to dark `:root` tokens in Light Mode, and `lightTheme` state reset on reload. | `src/components/ui/app-1.tsx`, `src/components/ui/sheet.tsx` |
| **F-04** | **HIGH** | **Missing privileged MFA (AAL2) enforcement & UX:** `AuthContext`, `AuthUI`, `Admin`, and privileged Edge Functions (`verify-payment`, `manage-admins`, `manage-competitions`, `get-admin-registrations`) lacked Supabase TOTP MFA factor inspection, enrollment UI, login challenge gating, and server-side AAL2 validation for enrolled accounts. | `src/context/AuthContext.jsx`, `src/components/ui/auth-fuse.tsx`, `src/screens/Admin.jsx`, `supabase/functions/_shared/auth.ts` |
| **F-05** | **MEDIUM** | **Weak password UX, missing password confirmation & lingering OAuth URL parameters:** `SignUpForm` and `UpdatePasswordForm` enforced only an 8-character minimum without complexity guidance or a Confirm Password field; `AuthContext` left `?code=` / `?error=` query parameters in `window.location.search` and stored `authError` without displaying it in `SignInForm`. | `src/context/AuthContext.jsx`, `src/components/ui/auth-fuse.tsx`, `src/screens/Auth.jsx` |
| **F-06** | **LOW** | **External third-party CDN asset on login page:** `auth-fuse.tsx` fetched the Google icon SVG from `cdn.21st.dev`, creating an unnecessary third-party dependency during login. | `src/components/ui/auth-fuse.tsx` |
| **F-07** | **INFORMATIONAL** | **Protected & intact foundations confirmed during inspection:** Supabase Auth PKCE (`flowType: 'pkce'`), zero client-side SHA-256/custom password hashing, `handle_new_user()` hardcoding `role = 'participant'`, `prevent_privileged_profile_mutation()` DB trigger, column-level `GRANT UPDATE` restrictions, `sanitizeInternalRedirect` allowlist, and all 29 competition entries + pricing remained intact. | `src/lib/supabaseClient.js`, `supabase/migrations/20261125000002_rls_and_functions.sql` |

---

## 2. Exact Files Changed

| File | Change Summary |
|---|---|
| `src/tailwind.css` | Removed hardcoded `.admin-theme-light .registration-card` override; added theme-paired semantic status tokens (`--status-success-*`, `--status-warning-*`, `--status-info-*`, `--status-danger-*`), `.admin-select`, and `.technoriti-admin-shell` / `[role="dialog"]` overrides against Bootstrap `!important` utility leakage. |
| `src/components/HaloReel.scss` | Scoped HaloReel utility rules strictly under `.halo-stage-wrapper, .halo-reel-wrapper` so unscoped `.bg-card` / `.text-card-foreground` classes never pollute Admin cards while preserving the homepage 3D carousel. |
| `src/components/ui/badge.tsx` | Added theme-aware `success`, `warning`, `info`, and `danger` variants consuming the CSS variables in `src/tailwind.css`. |
| `src/components/ui/app-1-utils/app-1-data.ts` | Extended `AdminSectionKey` with `"security"` for privileged MFA management. |
| `src/components/ui/app-1-utils/app-1-sidebar.tsx` | Added `Security & MFA` navigation entry restricted strictly to `super_admin` and `admin`. |
| `src/components/ui/app-1.tsx` | Added persistent `technoriti_admin_theme` `localStorage` state, synchronized `document.documentElement.classList` on mount/toggle and cleaned it up on unmount so portaled sheets match Light/Dark mode without leaking to public pages, and improved light-mode icon contrast. |
| `src/screens/Admin.jsx` | Replaced all React-Bootstrap cards, dark tables, dark inputs, badges, `Title_Jumbotron` early gates, and Bootstrap `Modal` with unified App-1 shadcn/ui + Tailwind primitives (`Card`, `Button`, `Badge`, `Input`, `Label`, `Skeleton`, theme-aware `Sheet` reconciliation drawer), added `Security & MFA` section (local QR via `qrcode` + TOTP enroll/unenroll), added inline AAL2 MFA challenge gate when `needsMfaChallenge` is active, and preserved all Super Admin / Admin / Coordinator RBAC rules. |
| `src/context/AuthContext.jsx` | Added `sanitizeAuthCallbackUrl()` to strip `code`/`error`/`error_description`/`type`/`token_hash` via `history.replaceState`; added official Supabase `aal`, `mfaFactors`, `needsMfaChallenge`, and `refreshMfaStatus()` state; normalized OAuth callback errors without leaking internals. |
| `src/screens/Auth.jsx` | Prevented auto-redirect away from `/signin` while `needsMfaChallenge` is active so users complete their TOTP challenge cleanly. |
| `src/components/ui/auth-fuse.tsx` | Upgraded signup and password-recovery flows to 12-character minimum + character-class complexity validation + Confirm Password inputs; surfaced sanitized non-enumerating auth errors (including OAuth callback `authError`); added `MfaChallengeForm`; replaced the external Google icon URL with an inline SVG. |
| `supabase/functions/_shared/auth.ts` | Added `decodeValidatedJwtAal()`, `hasVerifiedMfaFactor` lookup from verified Supabase TOTP factors, and `requirePrivilegedMfa()` (always blocking `aal1` downgrade when an enrolled TOTP factor exists, and blocking all `aal1` admin/super_admin requests when `ENFORCE_PRIVILEGED_MFA=true`). |
| `supabase/functions/verify-payment/handler.ts` | Enforced `requirePrivilegedMfa(actor, corsHeaders)` after role validation. |
| `supabase/functions/manage-admins/handler.ts` | Enforced `requirePrivilegedMfa(actor, corsHeaders)` after `super_admin` role validation. |
| `supabase/functions/manage-competitions/handler.ts` | Enforced `requirePrivilegedMfa(actor, corsHeaders)` after role validation. |
| `supabase/functions/get-admin-registrations/handler.ts` | Enforced `requirePrivilegedMfa(actor, corsHeaders)` after role validation. |
| `src/security.test.js` | Updated and expanded Jest regression tests for 12-char password + confirmation policy, recovery form, MFA challenge gate, unified Admin tokens/theme toggle/cleanup, Reconciliation Sheet opening, and Bootstrap/legacy card absence. |
| `supabase/tests/edge_security_test.ts` | Added Deno test verifying `MFA_REQUIRED` (HTTP `403`) for enrolled TOTP accounts downgraded to `aal1` and under strict `ENFORCE_PRIVILEGED_MFA=true` policy. |

---

## 3. Skills and Agents Used from Inventory

The following skills from `C:\Users\sujal\.gemini\config\skills\` were read (`SKILL.md`) and directly applied during inspection, design, security hardening, and verification:

- `/ponytail` — Enforced minimal, root-cause fixes (scoping `HaloReel.scss`, tokenizing status badges in `src/tailwind.css`, reusing `Sheet` and `qrcode`) without duplicating frameworks or auth backends.
- `/ui-styling` — Applied shadcn/ui + Tailwind CSS token hierarchy (`--background`, `--card`, `--foreground`, `--border`, `--primary`, `--secondary`, `--destructive`) consistently across every admin view.
- `/web-design-guidelines` — Verified semantic labels, accessible icon-only button `aria-label`s, keyboard `Escape` sheet dismissal, visible focus rings, tabular figures, and WCAG text contrast in light and dark modes.
- `/vercel-react-best-practices` — Preserved `useMemo`/`useCallback`/mounted-ref request sequencing and eliminated unnecessary third-party CDN asset loading on `#/signin`.
- `/agency-frontend-developer` — Unified mixed Bootstrap + Tailwind admin panels into a responsive, consistent React 18 component architecture with loading skeletons and drawer interactions.
- `/agency-application-security-engineer` — Hardened password policy UX, eliminated URL token/error leakage, added non-enumerating auth errors, enforced Supabase TOTP MFA + server-side `AAL2` Edge Function guards, and blocked privilege escalation boundaries.
- `/agency-evidence-collector` & `/browser-qa` — Executed headless Chromium Playwright checks across 6 viewports and both Light & Dark themes, catching the real `HaloReel.scss` `.bg-card` and Bootstrap `.bg-secondary` contrast defects directly via screenshot inspection rather than relying solely on passing unit tests.

*(Note: Execution and verification were performed directly via the primary workflow + local Jest, Deno, TypeScript, ESLint, and Playwright runners rather than spawning separate background subagents during this final phase.)*

---

## 4. Admin Design-System Changes

1. **Canonical Visual System:** All operational views (`Dashboard Overview`, `Registrations & UTR Verification`, `Payment Verification`, `Competitions & Tariffs`, `Accommodation Plans`, `Admins & Coordinators`, `Audit History`, `Security & MFA`, `Coordinator Arena Roster`), early portal gates (`Backend Not Configured`, `Verifying Access`, `Restricted Access`, `Two-Factor Verification`), and the `Reconcile Registration` drawer (`Sheet`) now use the same `App1` shadcn/ui + Tailwind primitives (`Card`, `Button`, `Badge`, `Input`, `Label`, `Skeleton`, `Sheet`).
2. **Dark & Light Theme Parity:**
   - Removed the hardcoded dark `.admin-theme-light .registration-card` rule and scoped `HaloReel.scss` so `.bg-card` computes cleanly to `rgb(255, 255, 255)` in Light Mode and `hsl(0 0% 8%)` in Dark Mode across every admin card and table.
   - Added `--status-success-*`, `--status-warning-*`, `--status-info-*`, and `--status-danger-*` CSS variables and `.admin-select` styles for uniform high-contrast status pills and native dropdowns in both themes.
   - Synced `.admin-theme-light` onto `document.documentElement` while `App1` is mounted and persisted preference in `localStorage` (`technoriti_admin_theme`), ensuring portaled dialogs/sheets match the active theme while public routes remove `.admin-theme-light` cleanly on unmount.

---

## 5. Authentication Methods Implemented and Verified

- **Google OAuth (Supabase Auth PKCE):** Uses `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })` with `flowType: 'pkce'`, `detectSessionInUrl: true`, sanitized internal redirect target (`POST_AUTH_REDIRECT_KEY` validated by `sanitizeInternalRedirect`), inline Google SVG branding, callback error surfacing, and URL parameter cleanup. *(Verified locally via build + unit tests + UI rendering; live Google OAuth round-trip requires owner Google Client ID/Secret in Supabase Dashboard.)*
- **Email + Password (Supabase Auth):**
  - `signInWithPassword` with normalized non-enumerating credential errors.
  - `signUp` with 12-character complexity validation + Confirm Password check.
  - `resetPasswordForEmail` with generic non-enumerating status confirmation.
  - `updateUser` recovery flow (`PASSWORD_RECOVERY` event + `?type=recovery` detection) with 12-character complexity + Confirm New Password check.

---

## 6. Password Security Approach

- **No Custom Hashing:** Zero client-side SHA-256, MD5, or custom hashing exists. All credentials go directly over HTTPS to official Supabase Auth APIs, which hash and store passwords using salted bcrypt server-side.
- **Zero Custom Password Storage or Logging:** No passwords or password hashes are written to `public.profiles` or custom tables, and `src/security.test.js` explicitly verifies auth form submission emits zero `console.log` calls.
- **Policy Enforcement:** Client forms enforce 12+ characters with at least 3 of 4 character classes (uppercase, lowercase, digit, symbol) plus matching confirmation fields for registration and password resets.

---

## 7. MFA Implementation Status

- **Implemented Code (Ready for Enrollment & Staged Rollout):**
  - `AuthContext` queries `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` and `supabase.auth.mfa.listFactors()` and exposes `aal`, `mfaFactors`, `needsMfaChallenge`, and `refreshMfaStatus()`.
  - When a user signs in with an enrolled verified TOTP factor (`currentLevel !== 'aal2'`), both `#/signin` (`AuthUI`) and `#/admin` fail closed and require a 6-digit TOTP `challengeAndVerify` step before granting admin access.
  - Added a `Security & MFA` workspace section in `Admin.jsx` supporting official `supabase.auth.mfa.enroll({ factorType: 'totp' })` with offline local QR rendering (`qrcode` library — zero external QR API), `challengeAndVerify`, and `unenroll`.
  - Edge Functions (`verify-payment`, `manage-admins`, `manage-competitions`, `get-admin-registrations`) call `requirePrivilegedMfa()`: **any account with an enrolled verified TOTP factor is strictly blocked on `aal1` tokens**, while existing admins without enrolled MFA are not locked out until owner sets Edge Function secret `ENFORCE_PRIVILEGED_MFA=true` (staged rollout).
- **Pending Live Verification:** End-to-end live TOTP enrollment/challenge against a deployed Supabase Auth project requires live `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, and Supabase Dashboard TOTP enabled.

---

## 8. Role and RLS Security Findings

- Existing PostgreSQL RBAC (`super_admin`, `admin`, `coordinator`, `participant`), default-deny RLS policies, `handle_new_user()` hardcoded `'participant'` role on signup/OAuth, `prevent_privileged_profile_mutation()` DB trigger, coordinator assignment scoping, and Super-Admin-only staff management remain intact and verified in unit/Deno tests.
- Added server-side AAL2 defense-in-depth inside Edge Functions without downgrading RLS or trusting client-supplied roles or JWT `user_metadata`.

---

## 9. Security Vulnerabilities Discovered and Fixed

1. **[HIGH] Privileged MFA Downgrade / Missing AAL2 Gate (`verify-payment`, `manage-admins`, `manage-competitions`, `get-admin-registrations`):** Added `requirePrivilegedMfa()` server-side check (`403 MFA_REQUIRED`) plus frontend `MfaChallengeForm` / Admin AAL2 gate and enrollment UI.
2. **[MEDIUM] URL OAuth/Recovery Query Parameter Lingering (`AuthContext.jsx`):** Added `sanitizeAuthCallbackUrl()` to scrub `code`, `error`, `error_code`, `error_description`, `type`, and `token_hash` from `window.location.search` immediately after parsing.
3. **[MEDIUM] Weak Signup/Recovery Password Floor (`auth-fuse.tsx`):** Raised client policy from 8 to 12 characters with 3-class complexity validation, added Confirm Password verification, and normalized auth errors to prevent email/account enumeration.
4. **[LOW] External CDN SVG Dependency on Auth Screen (`auth-fuse.tsx`):** Replaced third-party Google icon CDN URL with an inline SVG.

---

## 10. Tests Executed with Actual Pass/Fail Counts

| Check | Scope | Result |
|---|---|---|
| `npx.cmd tsc --noEmit` | Full TypeScript codebase | **PASS** — `0` errors |
| `npx.cmd eslint` (9 modified/tested JS/JSX/TS/TSX files) | Modified Admin, Auth, Context, UI components & Jest suite | **PASS** — `0` errors, `0` warnings |
| `npm.cmd test -- --watchAll=false` (`src/security.test.js`) | React security, AuthUI password/MFA/recovery, Admin RBAC/MFA/theme unification | **PASS** — `1 passed suite`, `10 passed, 0 failed` |
| `deno check supabase\functions\*\index.ts supabase\tests\edge_security_test.ts` | All 8 Edge Functions + security test suite | **PASS** — `0` type errors |
| `deno test --allow-env supabase\tests\edge_security_test.ts` | CORS, rate limiting, price tampering, RBAC, coordinator isolation, MFA AAL2 enforcement | **PASS** — `9 passed, 0 failed` |
| `$env:CI="false"; npm.cmd run build` | Production CRA bundle (`build/`) | **PASS** — compiled cleanly (`495.65 kB` JS, `42.35 kB` CSS gzipped) |
| `git diff --check` | Whitespace and conflict markers across modified files | **PASS** — exited `0` |
| Playwright Chromium Browser QA (`scratch\qa_verify.py` against `http://127.0.0.1:3000`) | 6 viewports (`360x800`, `390x844`, `768x1024`, `1024x768`, `1366x768`, `1920x1080`), Light & Dark themes across all Admin sections, Reconciliation Sheet drawer, Sign Out -> `#/signin` -> `#/signup`, Public `#/` | **PASS** — `0px` horizontal overflow on every viewport/route, `cardBg = rgb(255, 255, 255)` across all light sections, `sheetBg = rgb(250, 250, 250)`, `lightClassLeaked = false` on `#/`, `0` page errors, `0` runtime console errors (filtered known Chromium `<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'">` informational notice) |

---

## 11. Before/After Screenshots (Playwright Captures)

Saved in `C:\Users\sujal\.gemini\antigravity\brain\9fe4ab58-607f-4b96-81ce-c01eef9ad320\`:
- **Admin Home (Dark Desktop 1366x768):** [qa-admin-overview-1366-dark.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-overview-1366-dark.png)
- **Admin Home (Mobile 390x844):** [qa-admin-mobile-390-dark.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-mobile-390-dark.png)
- **Admin Home (Light Desktop 1366x768):** [qa-admin-overview-1366-light.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-overview-1366-light.png)
- **Registrations & UTR Verification (Light Desktop 1366x768):** [qa-admin-registrations-1366-light.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-registrations-1366-light.png)
- **Payment Reconciliation Sheet Drawer (Light Mode):** [qa-admin-reconcile-sheet-light.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-reconcile-sheet-light.png)
- **Competitions & Accommodation Tariffs (Light Desktop 1366x768):** [qa-admin-competitions-1366-light.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-competitions-1366-light.png)
- **Admins & Coordinators Directory (Light Desktop 1366x768):** [qa-admin-staff-1366-light.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-staff-1366-light.png)
- **Security & MFA (Light & Dark Desktop 1366x768):** [qa-admin-security-mfa-1366-light.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-security-mfa-1366-light.png), [qa-admin-security-mfa-1366-dark.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-admin-security-mfa-1366-dark.png)
- **Sign In & Sign Up Auth Views (1366x768):** [qa-auth-signin-1366.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-auth-signin-1366.png), [qa-auth-signup-1366.png](file:///C:/Users/sujal/.gemini/antigravity/brain/9fe4ab58-607f-4b96-81ce-c01eef9ad320/qa-auth-signup-1366.png)

*(Initial broken light-mode card screenshots were superseded during iterative fix & verification passes; initial before-state issues are documented in Section 1 and Section 4.)*

---

## 12. Remaining Owner-Only Configuration

To transition from `READY FOR OWNER CONFIGURATION` to live `PRODUCTION READY`:

1. **Supabase Dashboard -> Authentication -> Providers -> Google:** Enable Google OAuth, configure Google Cloud OAuth Client ID & Secret, and add exact production + preview redirect URLs (`https://<your-domain>/`, `http://localhost:3000/`) in **URL Configuration -> Redirect URLs**.
2. **Supabase Dashboard -> Authentication -> Providers -> Email & Security:** Set minimum password length to `12`, require mixed character complexity, enable **Confirm email**, enable **Leaked Password Protection** (if available on your project tier), and confirm auth rate-limit thresholds.
3. **Supabase Dashboard -> Authentication -> Multi-Factor:** Enable TOTP authenticator app MFA.
4. **Database & Edge Functions Deployment:** Apply migrations `001`–`004`, run `supabase/scripts/bootstrap_super_admin.sql` for `RoxxSujal7` / institutional Super Admin email, and deploy all 8 Edge Functions (`npx supabase functions deploy`).
5. **Staged MFA Cutover (No Lockout):** Sign in as `super_admin` -> open `#/admin` -> navigate to **Security & MFA** -> enroll TOTP for `super_admin` and `admin` staff first -> then set Edge Function secret `ENFORCE_PRIVILEGED_MFA=true` (`supabase secrets set ENFORCE_PRIVILEGED_MFA=true`).
6. **Frontend Environment Variables (Vercel / `.env.local`):** Configure `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_UPI_VPA`, and `REACT_APP_UPI_PAYEE_NAME` (never expose `SUPABASE_SERVICE_ROLE_KEY`).

---

## 13. Known Limitations

- Live Supabase Auth (Google OAuth round-trip, password reset emails, and live TOTP enrollment/challenge against GoTrue `/auth/v1/factors`), PostgreSQL RLS execution against a live database instance, and Vercel production header delivery were **not** executed locally because live cloud credentials are absent by design; Playwright UI/API flows ran against the isolated scratch mock server (`http://127.0.0.1:3000`).
- Jest suites run with `AuthContext` and `callEdgeFunction` mocks; Edge Function security suites run against mock `AuthLookup` and in-memory handlers via Deno.

---

## 14. Git Status and Uncommitted Changes

At report generation time, local changes remain uncommitted in `C:\Users\sujal\syn` (`M` across 17 tracked files + untracked `docs/ADMIN_THEME_AND_AUTH_SECURITY_REPORT.md`); no automated `git commit`, `git push`, or deployment was performed.
