# ROXX TECHNORITI — Security Audit Report

**Project:** ROXX TECHNORITI  
**Festival:** TECHNORITI '26  
**Institution:** Bihar College of Engineering, Bhagalpur (BCE Bhagalpur)  
**Owner & Sole Contributor:** Sujal Sah (`RoxxSujal7`)  
**Audit Date:** 2026-11-25  
**Stack:** React 18 · Create React App 5.0.1 · JavaScript · TypeScript · Sass · Tailwind CSS · Bootstrap 5 · Radix UI · HashRouter

---

## 1. Executive Summary

ROXX TECHNORITI is a **100% client-side static React Single Page Application (SPA)** designed for static hosting (e.g., GitHub Pages). There is **no active backend, no database, no authentication provider, and no server-side payment processing**.

Because there is no backend or database, server-side vulnerabilities such as SQL injection, SSRF, IDOR, and server-side RCE are not applicable. However, the application exposes **frontend UI prototypes for authentication and UPI registration/payment** without server-side enforcement, alongside client-side hardening issues (PII leakage to a third-party QR API, weak UTR validation, auth console logging, production source map exposure, missing HTML security meta tags, and vulnerable npm dependencies).

All safely fixable client-side and dependency vulnerabilities have been remediated and verified with regression tests and a clean production build. Backend-dependent controls are explicitly documented as architectural requirements rather than disguised with fake frontend checks.

---

## 2. Repository and Architecture Scope

- **Repository:** `https://github.com/RoxxSujal7/roxx-bce-technoriti` (local: `C:\Users\sujal\syn`)
- **Architecture:** Static React 18 SPA bundled with `react-scripts` 5.0.1 using `HashRouter`
- **Routes audited (11):** `/`, `/about`, `/events`, `/accommodation`, `/sponsors`, `/team`, `/faq`, `/contact`, `/register`, `/signin`, `/signup`
- **Auth:** `src/screens/Auth.jsx` and `src/components/ui/auth-fuse.tsx` — UI-only prototype (`event.preventDefault()`, no API calls, no tokens/cookies/localStorage)
- **Payment/Registration:** `src/screens/Register.jsx` — client-side fee calculation, UPI deep-link (`upi://pay`), external QR image (`api.qrserver.com`), and UTR entry
- **Database/Backend:** None in `src/`. (`scratch/supabase-client.js` and `scratch/env-config.js` are gitignored local prototypes not imported by the React app.)

---

## 3. Skills Discovered, Read, and Invoked

### Skills Read (`SKILL.md`) and Applied
- `/find-security-vulnerabilities-in-code` (`C:\Users\sujal\.gemini\config\skills\find-security-vulnerabilities-in-code\SKILL.md`)
- `/application-security-testing` (`C:\Users\sujal\.gemini\config\skills\application-security-testing\SKILL.md`)
- `/git-workflow` (`C:\Users\sujal\.gemini\config\skills\git-workflow\SKILL.md`)
- `/agency-git-workflow-master` (`C:\Users\sujal\.gemini\config\skills\agency-git-workflow-master\SKILL.md`)

### Unavailable / Non-Applicable Capabilities
| Skill | Status | Reason |
|---|---|---|
| `/penetration-testing-with-strix`, `/managed-pentesting-with-strix`, `/fix-security-vulnerabilities-with-strix` | Not executed | Require Strix CLI / Docker / LLM key or live staging backend; manual white-box audit + Jest regression tests executed instead |
| `/api-security-testing` | N/A | No REST, GraphQL, or gRPC API exists |
| `/ci-security-scanning-with-strix` | Not configured | No GitHub Actions CI workflow in repository |

### Agents Used
- Primary Antigravity agent (security audit, remediation, Jest regression test creation, TypeScript check, production build, and Git migration/verification)

---

## 4. Security Tools and Testing Methods

| Method | Tool / Command | Scope |
|---|---|---|
| Dependency vulnerability scan | `npm.cmd audit` / `npm.cmd audit fix` | `package.json` & `package-lock.json` |
| Static pattern / secret scan | `git grep` + PowerShell file scan | `src/`, `public/`, `.gitignore`, `.env*` |
| XSS & DOM sink scan | `git grep` (`dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `eval(`) | `src/` |
| External link & URL scan | `git grep` (`https?://`, `target="_blank"`) | `src/` |
| TypeScript static check | `npx.cmd tsc --noEmit` | All `.ts`/`.tsx` files |
| Regression unit tests | `npm.cmd test -- --watchAll=false` | `src/security.test.js` |
| Production build | `npm.cmd run build` | Full CRA bundle + source map check |

---

## 5. Mandatory 14-Category Vulnerability Table

| # | Security Issue | Vulnerable? | Severity | File and Line | Fix Applied | Verification |
|---|---|---|---|---|---|---|
| 1 | Unprotected admin routes | **NO** | — | `src/index.js` (11 public routes only) | N/A | Inspected `src/index.js` and `git grep` for admin routes; none exist |
| 2 | IDOR / BOLA | **N/A** | — | No backend API or user-scoped resource IDs | N/A | Confirmed zero API endpoints or object-ID fetches in `src/` |
| 3 | Exposed API secrets | **NO** | — | `scratch/supabase-client.js` (gitignored, publishable anon key only) | Verified `.gitignore` excludes `scratch/` | `git ls-files` confirms zero secrets or `.env.local` files tracked |
| 4 | Client-trusted pricing | **YES** (architectural) | Medium | `src/screens/Register.jsx:33-61` | Documented as backend-dependent (§9) | Client-only React calculation; requires server-side authoritative pricing when backend is added |
| 5 | Negative cart quantities | **NO** | — | `src/screens/Register.jsx:241-252` (`<select>` options `1`–`5`) | N/A | Confirmed no free-text quantity input or negative/decimal values |
| 6 | Unverified payments | **YES** (architectural) | High | `src/screens/Register.jsx:106-114` | Tightened UTR to `/^\d{12}$/` + numeric input; server verification documented (§9) | `src/security.test.js` verifies invalid UTRs are rejected; real gateway verification requires backend |
| 7 | Coupon / discount abuse | **N/A** | — | No coupon or discount system exists | N/A | Inspected `Register.jsx` and `Accommodation.jsx`; no promo/coupon fields |
| 8 | Signup privilege escalation | **N/A** | — | `src/components/ui/auth-fuse.tsx:214-238` | N/A | UI-only form with no role field and no backend |
| 9 | Missing auth rate limits | **YES** (architectural) | High | `src/screens/Auth.jsx`, `src/components/ui/auth-fuse.tsx` | Documented as backend-dependent (§9) | React cannot enforce rate limits; requires server/auth-provider enforcement |
| 10 | AI prompt injection | **N/A** | — | No LLM, AI chat, or prompt templates in `src/` | N/A | Confirmed via repository scan |
| 11 | Cross-site scripting (XSS) | **NO** | — | `src/` (`git grep` clean for `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `eval`) | N/A | All rendered content comes from static JSX/JS modules and React-escaped bindings |
| 12 | Unsafe file uploads | **N/A** | — | No file upload inputs or handlers in `src/` | N/A | Confirmed via repository scan |
| 13 | Committed secrets & Git exposure | **NO** | — | `.gitignore`, `.env.production` (`GENERATE_SOURCEMAP=false` only) | Verified clean in fresh commit `c9b2e49` | `git ls-files` and PowerShell sensitive-file scan found zero `.env.local`, keys, or dumps |
| 14 | SQL injection | **N/A** | — | No database backend or SQL queries in `src/` | N/A | Confirmed via `git grep` |

---

## 6. Additional Security Findings & Remediations

| ID | Finding | Severity | File & Line | Remediation | Status |
|---|---|---|---|---|---|
| A-01 | PII (phone number) leaked in external QR generator request | Low | `src/screens/Register.jsx:117-123` | Separated `qrData` (omits `tn=REG-{phone}`) from on-device `upiUrl` (`safePhone` digits-only) | **Fixed & Tested** |
| A-02 | Weak UTR validation (`length < 8` any characters) | Medium | `src/screens/Register.jsx:106-114`, `485-496` | Enforced `/^\d{12}$/` regex, `inputMode="numeric"`, `maxLength={12}`, digit-only `onChange` | **Fixed & Tested** |
| A-03 | Auth handler `console.log` statements | Low | `src/components/ui/auth-fuse.tsx:190-258` | Removed `console.log` calls from `SignInForm`, `SignUpForm`, and Google button handler | **Fixed & Tested** |
| A-04 | Production source maps enabled by default in CRA | Medium | `.env.production` | Added `GENERATE_SOURCEMAP=false` so production `build/` omits `.map` files | **Fixed & Tested** |
| A-05 | Missing HTML security meta headers | Low | `public/index.html:6-10` | Added `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `CSP frame-ancestors 'none'` | **Partially Fixed** (HTTP headers require CDN/server) |
| A-06 | Vulnerable npm packages (82 total, 7 critical) | Critical / High | `package-lock.json` | Ran `npm.cmd audit fix` (53 fixed; 0 critical remain; 29 dev-only `react-scripts` toolchain vulns remain) | **Partially Fixed** |
| A-07 | UI-only auth & payment create client-side trust assumptions | High | `Auth.jsx`, `auth-fuse.tsx`, `Register.jsx` | Documented clearly in code comments and §9; no fake backend checks added | **Documented** |

---

## 7. Regression Tests & Verification Results

- **Security Regression Suite:** `src/security.test.js` (3 tests covering UTR regex/sanitization, QR PII omission, auth `console.log` absence, `public/index.html` meta headers, and `.env.production`).
- **TypeScript Check:** `npx.cmd tsc --noEmit`
- **Production Build:** `npm.cmd run build` (verifying zero `.map` files in `build/static/`).

---

## 8. Remaining Risks & Backend-Dependent Security Requirements

1. **Payment Verification & Authoritative Pricing (Critical):** Before accepting live registrations, add a backend (e.g., Supabase Edge Functions / payment gateway webhooks with signature verification) to compute prices server-side and verify transactions/UTRs against the payment provider.
2. **Authentication & Rate Limiting (High):** Wire `AuthUI` to a real identity provider with server-side rate limiting, account lockout, and password complexity rules.
3. **HTTP Security Headers (Medium):** Deploy behind a host/CDN (Cloudflare, Vercel, Netlify) that serves HTTP `Content-Security-Policy`, `X-Frame-Options: DENY`, and `Strict-Transport-Security` headers (since GitHub Pages ignores custom HTTP headers and `<meta>` `frame-ancestors` is not enforced by all browsers).
4. **Dev-Toolchain Dependencies (Low in prod / High in dev):** 29 vulnerabilities remain in `react-scripts` dev dependencies (`webpack-dev-server` / `ws`); they are not bundled into production output, and resolving them requires migrating off `react-scripts` (`--force` breaking upgrade).

---

*Report generated for ROXX TECHNORITI · 2026-11-25*
