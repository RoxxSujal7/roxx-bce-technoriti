# ROXX BCE TECHNORITI — Backup & Disaster Recovery Runbook

**Important Free-Plan Reality:** The Supabase Free Plan **does not include automated daily backups or Point-in-Time Recovery (PITR)**. All database durability on the ₹0 tier depends on running the documented manual export procedure below.

---

## 1. Backup Strategy & Schedule

| Artifact | Storage Location | Schedule | Retention |
|---|---|---|---|
| **Schema & RLS Migrations** | Git (`supabase/migrations/`) | On every change | Permanent (version-controlled) |
| **Database Logical Dump (`pg_dump`)** | Encrypted offline/local directory **outside** git repo (`../backups/` — ignored by `.gitignore`) | Daily during live festival registration; immediately before any schema change | Last 14 days + final post-festival archive |
| **CSV Roster Snapshots** | Accounts Desk / Super Admin offline folder | Twice daily during festival check-in | Festival archive |

**Rules:**
- **NEVER** store `.sql`, `.dump`, or participant CSV exports inside `public/`, `src/`, or commit them to GitHub.
- Store the database connection string (`SUPABASE_DB_URL`) strictly in local shell environment / password manager during export — never inside repository files.

---

## 2. Database Backup Commands

Using PostgreSQL `pg_dump` (with direct database connection string from Supabase Dashboard -> Settings -> Database):

```powershell
# PowerShell — exports schema + data to an external backup folder outside repo
$backupDir = "C:\Users\sujal\syn-db-backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$ts = Get-Date -Format "yyyyMMdd-HHmmss"

# Logical dump of public schema + auth users (custom compressed format)
pg_dump "$env:SUPABASE_DB_URL" `
  --format=custom `
  --schema=public `
  --no-owner --no-acl `
  --file="$backupDir\technoriti-public-$ts.dump"
```

---

## 3. Restoring Into a Fresh Development / Standby Supabase Project

To drill recovery without touching production:

1. Create a blank development/recovery Supabase project (or local Postgres 15+ instance).
2. Apply version-controlled migrations (`20261125000001_initial_schema.sql`, `20261125000002_rls_and_functions.sql`, `20261125000003_seed_catalog.sql`).
3. Restore non-auth data safely (`--data-only` if migrations already applied, or full restore onto clean DB after ensuring matching `auth.users` IDs exist for foreign keys):
   ```powershell
   pg_restore --dbname="$env:DEV_SUPABASE_DB_URL" `
     --data-only --disable-triggers `
     --no-owner --no-acl `
     "C:\Users\sujal\syn-db-backups\technoriti-public-TIMESTAMP.dump"
   ```
   *(Note: If restoring into a fresh project where `auth.users` is empty, restore both `auth.users` and `public` schema dumps or recreate corresponding auth identities prior to restoring `profiles`/`registrations` foreign keys.)*
4. **Verify Restored Integrity:**
   ```sql
   SELECT COUNT(*) AS competitions_count FROM public.competitions;       -- Expect 29
   SELECT COUNT(*) AS accom_plans_count FROM public.accommodation_plans; -- Expect 4
   SELECT status, COUNT(*) FROM public.registrations GROUP BY status;
   SELECT COUNT(*) AS audit_count FROM public.audit_logs;
   ```

---

## 4. Test Restore Verification Status

- Pre-implementation local repository & `.git` backup verified at `C:\Users\sujal\syn-prebackend-backup-20261125-035628`.
- **Cloud PostgreSQL `pg_dump` / `pg_restore` drill:** NOT EXECUTED in this environment because no live Supabase project credentials (`SUPABASE_DB_URL`) or Docker Postgres instance are provisioned yet. Execute Step 2 -> Step 3 using synthetic test records immediately after linking your Supabase project before opening public registrations.
