# TECHNORITI '26 — OWNER DECISIONS REQUIRED

**Target:** BCE Bhagalpur Organizing Committee & Principal Secretariat  
**Purpose:** Formal record of administrative, financial, legal, and operational parameters requiring institutional sign-off prior to production launch.

---

## 1. Banking & Financial Settlements

1. **Official UPI VPA & Merchant Name:**
   - *Current Configuration:* `bcebhagalpur@upi` / `Technoriti 2026 BCE`
   - *Required Action:* Confirm official SBI / Canara Bank / PNB institutional current account UPI handle dedicated to Technoriti '26 festival receipts.
2. **Fee Waiver Policy:**
   - *Current Configuration:* Standard delegate fees apply across all 29 arenas.
   - *Required Action:* Decide whether BCE Bhagalpur bonafide students receive automated fee exemptions or discounts based on university roll number prefixes (`241...`).
3. **Manual UTR Reconciliation Protocol:**
   - *Required Action:* Establish daily reconciliation cadence between the College Accounts Section bank statement and the Technoriti Admin Verification Queue (`TR26-*`).

---

## 2. Event Calendar & Schedule Finalization

1. **Festival Execution Dates:**
   - *Current Configuration:* `6–7 January 2027` (with historical December 2026 strings in legacy event descriptors).
   - *Required Action:* Formally sign off on final festival dates to synchronize all calendar countdowns and schema structured data markup (`schema.org/Event`).
2. **Arena Venues & Lab Allotments:**
   - *Required Action:* Confirm laboratory reservations:
     - RoboWar: Outdoor Quadrangle / Mechanical Workshop
     - RoboSoccer: Indoor Sports Hall
     - Hackathon: Central Computing Facility (CCF)
     - Tech Quiz: Main Administrative Auditorium

---

## 3. Student Coordinators & Staff Access

1. **Coordinator Contact Numbers:**
   - *Current Status:* Working mobile numbers of student coordinators are rendered on competition detail cards.
   - *Required Action:* Review whether personal mobile numbers should be displayed publicly or replaced with dedicated festival WhatsApp Business helpdesk hotlines.
2. **Super Admin Authorization:**
   - *Required Action:* Appoint the official faculty convener who will hold the root `super_admin` role with authority to manage staff privileges and modify competition tariffs.

---

## 4. Production Cloud Infrastructure Setup

1. **Hosted Supabase Project Credentials:**
   - *Required Action:* Create the production Supabase project in the `ap-south-1` (Mumbai) region.
   - Run migrations 001 through 007 against the live database.
   - Deploy the 7 Deno Edge Functions using Supabase CLI.
   - Supply production environment variables (`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `RESEND_API_KEY`) to the Netlify/Vercel deployment environment.
