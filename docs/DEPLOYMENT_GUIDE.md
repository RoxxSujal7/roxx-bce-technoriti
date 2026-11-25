# ROXX BCE TECHNORITI — Deployment & Free-Tier Compliance Guide

---

## 1. Free-Tier Plan Suitability & Official Limits Check

### A. Supabase Free Plan (Backend, PostgreSQL, Auth, Edge Functions)
Verified against Supabase official plan documentation:
- **Included Quotas:** `500 MB` PostgreSQL storage, `50,000` Auth MAUs, `500,000` Edge Function invocations/month (`256 MB` memory, `2s` CPU / `150s` wall timeout), `1 GB` file storage, up to `2` active free projects.
- **Operational Risks on Free Tier:**
  1. **Automatic Project Pausing:** Free-tier projects automatically pause after **7 consecutive days of inactivity**. Before/during registration weeks, configure an uptime check or upgrade for 1 festival month.
  2. **No Automated Backups / PITR:** Automated daily backups and Point-in-Time Recovery are **not** included on Free Plan (Pro plan required). Follow [BACKUP_RECOVERY.md](file:///c:/Users/sujal/syn/docs/BACKUP_RECOVERY.md) daily during active registration.

### B. Vercel Hobby vs Compliant Hosting Alternatives
Verified against Vercel Terms of Service:
- **Vercel Hobby Quotas:** `100 GB` Fast Data Transfer, `1M` CDN requests, `100` deployments/day, `200` projects.
- **Commercial-Use Restriction:** Vercel's Terms of Service restrict the free **Hobby plan** strictly to **personal or non-commercial projects**. Although BCE Bhagalpur is a public government engineering college festival without private commercial profit, collecting paid registration/hostel fees may require review under Vercel's non-commercial clause.
- **Compliant Options:**
  - If institutional non-profit college fest status is ineligible for Vercel Hobby, deploy the exact same `build/` output on **Vercel Pro**, **Cloudflare Pages** (Free tier permits organizational/commercial static sites, unlimited bandwidth, custom HTTP security headers via `_headers`), or **BCE Institutional Hosting**. `vercel.json` is provided for Vercel deployments and requires zero code changes if mirrored to Cloudflare Pages `_headers`.

### C. Resend Free Tier (Optional Transactional Emails)
- **Quotas:** `3,000 emails/month`, `100 emails/day`.
- Registration & UTR submission persist reliably even when `RESEND_API_KEY` is unconfigured or daily limits are reached (`email_notifications.status` logs `SKIPPED_UNCONFIGURED` or `FAILED`).

---

## 2. Step-by-Step Supabase Provisioning

1. **Create Supabase Project** in the `ap-south-1` (Mumbai) region via [Supabase Dashboard](https://supabase.com/dashboard). Do **not** upgrade to a paid tier unless approved.
2. **Apply Database Migrations & Seed:**
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```
   *(If Supabase CLI is not installed locally, run `20261125000001_initial_schema.sql`, `20261125000002_rls_and_functions.sql`, `20261125000003_seed_catalog.sql`, and `20261125000004_admin_analytics_rpcs.sql` sequentially in Supabase Dashboard -> SQL Editor. All migration and `supabase/seed.sql` files contain plain PostgreSQL SQL with no `psql` meta-commands.)*
3. **Configure Edge Function Secrets:**
   ```bash
   npx supabase secrets set \
     ALLOWED_ORIGINS="https://your-production-domain,http://localhost:3000" \
     UPI_VPA="YOUR_VERIFIED_INSTITUTIONAL_UPI@bank" \
     UPI_PAYEE_NAME="Technoriti 2026 BCE" \
     RESEND_API_KEY="re_optional_if_configured" \
     EMAIL_FROM="TECHNORITI '26 <noreply@your-verified-domain>"
   ```
   *(Supabase automatically injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into Edge Functions — never expose `SUPABASE_SERVICE_ROLE_KEY` to React.)*
4. **Deploy Edge Functions:**
   ```bash
   npx supabase functions deploy create-registration submit-utr get-my-registrations \
     get-admin-registrations verify-payment manage-admins manage-competitions \
     get-coordinator-registrations --use-api
   ```
5. **Configure Supabase Auth & Google OAuth (PKCE):**
   - Authentication -> URL Configuration -> **Site URL**: `https://your-production-domain`
   - **Redirect URLs**: Add `https://your-production-domain/`, `http://localhost:3000/`
   - Authentication -> Providers -> **Google**: Enable with Google Cloud OAuth Client ID & Client Secret, using callback URL `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
   - Enable email confirmations (`Confirm email` ON) under Authentication -> Providers -> Email.

---

## 3. Bootstrap First Super Admin

1. Open the deployed site `#/signup` (or Google OAuth) and register the **verified owner account**.
2. Confirm email verification.
3. Copy the exact UUID from **Supabase Dashboard -> Authentication -> Users**.
4. Open [bootstrap_super_admin.sql](file:///c:/Users/sujal/syn/supabase/scripts/bootstrap_super_admin.sql), replace `<VERIFIED_AUTH_USER_UUID>`, and execute once in **Supabase SQL Editor**.
5. Sign in again and open `#/admin` to assign additional `admin` and `coordinator` accounts cleanly via UI.

---

## 4. Vercel Frontend Deployment

1. Import `https://github.com/RoxxSujal7/roxx-bce-technoriti` in Vercel.
2. Framework Preset: **Create React App** (`vercel.json` is automatically applied).
3. Add Public Environment Variables (**Settings -> Environment Variables**):
   - `REACT_APP_SUPABASE_URL` = `https://YOUR_PROJECT_REF.supabase.co`
   - `REACT_APP_SUPABASE_ANON_KEY` = `<Supabase anon/publishable key>`
   - `REACT_APP_UPI_VPA` = `<Verified official college UPI VPA>`
   - `REACT_APP_UPI_PAYEE_NAME` = `Technoriti 2026 BCE`
   - Optional: `CI=false` (recommended until existing `Title_Jumbotron` ESLint pascal-case warnings in untouched pages are cleaned up separately).
4. Deploy and update Supabase Auth **Site URL / Redirect URLs** and Edge Function `ALLOWED_ORIGINS` with the exact final production origin.
