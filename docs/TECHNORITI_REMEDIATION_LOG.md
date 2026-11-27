# TECHNORITI '26 — MASTER REMEDIATION LOG

**Repository:** `https://github.com/RoxxSujal7/roxx-bce-technoriti`  
**Execution Lead:** Antigravity Engineering System  
**Discipline Applied:** `/ponytail` (Minimal Working Diffs, 7-Rung Ladder)  
**Date:** 2026-11-27  

---

## 1. Summary of Defects Remediated

During the multi-phase engineering and security audit, 24 defects across database atomicity, Edge Function error handling, frontend accessibility, linting rules, and viewport responsiveness were identified and remediated.

---

## 2. Itemized Remediation Ledger

| # | Subsystem / File | Issue Description | Root Cause | Exact Remediation Applied |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `supabase/migrations/20261125000007_rls_atomicity_and_hygiene_hardening.sql` | PostgREST leaked data from deactivated sessions | RLS policies only checked role, not active status | Added `private.is_active_user()` and applied `RESTRICTIVE` policies across registrations and payments |
| **02** | `public.create_registration_tx` | Migration failed under high concurrency | Temp tables created in transaction triggered name collisions | Converted to set-based CTE transaction with zero temp tables |
| **03** | `private.security_settings` | Risk of unauthorized MFA override | `UPDATE` permission granted to `service_role` | Revoked `UPDATE` from `service_role`, requiring direct DB migrations |
| **04** | Pre-005 SQL Functions | Search path hijacking vulnerability | Missing explicit search_path declaration | Added `SET search_path = public, pg_temp` to all security functions |
| **05** | Audit Log Triggers | Row trigger performance overhead | Trigger executed `FOR EACH ROW` | Upgraded immutability trigger to `FOR EACH STATEMENT` |
| **06** | `supabase/functions/_shared/auth.ts` | Edge Functions failed silently when GoTrue restarted | Unhandled network errors in factor lookup | Added `AuthBackendError` catching and upstream 503 response formatting |
| **07** | `supabase/functions/_shared/email.ts` | Potential hanging Edge Function requests | Missing timeout on upstream API calls | Injected `AbortSignal.timeout(8000)` and safe text parsing |
| **08** | `manage-competitions` / `manage-admins` | Duplicate audit entries written on failed transactions | Audit logging called before DB operation verified | Wrapped operations in single atomic DB RPC transactions (`*_tx`) |
| **09** | `src/context/AuthContext.jsx` | Race conditions during fast sign-in/out toggles | Unsynchronized async state resolutions | Added sequence tracking (`authSeqRef`) to cancel stale state resolutions |
| **10** | `src/lib/supabaseClient.js` | Edge functions hung indefinitely on network drop | Fetch calls lacked client-side timeout | Added 20-second `AbortController` timeout and non-null JSON guards |
| **11** | `src/components/ui/auth-fuse.tsx` | Unit tests threw `RouterLink` context error | Used react-router `<Link>` outside Router in tests | Converted navigation links to native `#` hash anchors |
| **12** | `src/components/ui/auth-fuse.tsx` | Duplicate DOM IDs in multi-device TOTP | Hardcoded input IDs | Injected React `useId()` for unique form controls |
| **13** | `src/screens/Register.jsx` | Preselection links from events/stay were lost | Search parameters not parsed on mount | Added URL query parameter parsing for `?arena=` and `?plan=` |
| **14** | `src/screens/Register.jsx` | Stale idempotency key on form edits | Key generated only on mount | Automatically invalidate idempotency key when user edits inputs |
| **15** | `src/screens/Register.jsx` | Redundant error announcements | Multiple elements carried `role="alert"` | Consolidated to a single top-level `role="alert"` banner |
| **16** | `src/screens/Dashboard.jsx` | UPI configuration misreported | Hardcoded fallback assumed active backend | Truthfully reflects `upiConfig.configured` status |
| **17** | `src/components/event_card.jsx` | Used browser `alert()` on card click | Outdated event handler pattern | Replaced with direct navigation to `#/register?arena=${mp.id}` |
| **18** | `src/content/events.jsx` | Broken image keys in event catalog | Inconsistent naming for quiz and presentation | Fixed keys to match bundled image assets |
| **19** | `src/index.scss` | Global `overflow-x: hidden` broke position:sticky | Universal selector reset | Replaced with scoped `html, body { overflow-x: clip; }` |
| **20** | `src/components/Title_Jumbotron.jsx` | Down arrow button inaccessible via keyboard | Implemented as non-semantic `<span>` | Replaced with `<button type="button" aria-label="Scroll down">` |
| **21** | `src/components/Navbar.jsx` | Missing logo image description | Empty alt attribute | Added descriptive `alt="TECHNORITI '26 Logo"` |
| **22** | `src/components/CinematicList.jsx` | Non-semantic `<div role="button">` rows | Incomplete keyboard and ARIA support | Converted to `<button type="button">` with `aria-expanded` and `hidden` |
| **23** | `src/components/HaloReel.jsx` | Background CPU burn when scrolled past | RAF loop ran indefinitely | Added `IntersectionObserver` pause and cancel on unmount |
| **24** | 11 React Screen Files | ESLint `react/jsx-pascal-case` failed in CI | Snake_case imported components (`Title_Jumbotron`) | Renamed imports to PascalCase (`TitleJumbotron`, `SliderSection`) |
