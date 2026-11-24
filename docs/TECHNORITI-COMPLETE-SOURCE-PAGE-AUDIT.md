# TECHNORITI '26 — Comprehensive Source Website Inventory & Content Audit

**Source Website:** https://technoriti-nine.vercel.app/
**Local Project:** `c:\Users\sujal\syn` (`http://localhost:3000`)
**Audit Date:** November 24, 2026
**Auditor:** Antigravity AI Engineering Assistant
**Methodology:** Automated DOM extraction via Playwright, raw HTML/JS bundle inspection (`script.js`, `supabase-client.js`, `env-config.js`), network request tracing, and full interaction flow mapping.

---

## 1. Executive Overview

An exhaustive forensic analysis of the authoritative source website at `https://technoriti-nine.vercel.app/` was performed. The source application is built as a single-page immersive web experience with slide-over modals/panels, integrated with Supabase client-side scripts, dynamic UPI checkout generation, and separate login/dashboard entry points.

This document inventories every section, interaction, data field, and workflow discovered on the source website, comparing them directly against the local React 18 repository.

---

## 2. Source Section-by-Section Inventory

### Section 1: Hero & Entrance Portal
- **Source Navigation Label:** `Home` / `Enter TECHNORITI '26`
- **DOM Identifiers:** `#loader`, `#canvas-wrapper`, `#animation-canvas`, `#hero-main-title`, `#hero-stats-container`, `#hero-cta-group`
- **Available Content:**
  - Eyebrow: `EAST INDIA'S PREMIER TECHNICAL FESTIVAL`
  - Institution: `BHAGALPUR COLLEGE OF ENGINEERING` (Estd. 1960)
  - Title: `TECHNORITI '26`
  - Tagline: `An Aetherial Confluence of Technology, Robotics & Pure Innovation` / `BUILD BEYOND BOUNDARIES.`
  - Official Dates: `6–7 January 2027`
  - Stat Badges: `2026 EDITION DATES` / `29+ TECH COMPETITIONS` / `₹1,00,000+ PRIZE POOL`
  - CTAs: `EXPLORE COMPETITIONS` (opens competitions view) and `HOSTEL & STAY` (opens accommodation view)
- **Visual Assets:** Canvas sequence player, glowing cursor trails, background gradient meshes.
- **Local Implementation Status:** Implemented in `src/App.jsx` with `Title_Jumbotron`, `Slider_section`, and `HaloReel`.

---

### Section 2: About Technoriti & Institutional Heritage
- **Source Navigation Label:** `ABOUT`
- **DOM Identifiers:** `#about-panel`, `#about-patron-quote`, `#about-convenor-quote`, `#about-institution-desc`
- **Available Content:**
  - Government Endorsement: `Govt. of Bihar • Dept. of Science, Technology & Technical Education • Official Notice No. 2363`
  - Festival Description: Bringing together over 1,500 innovators across robotics, coding, cyber forensics, aerospace design, and core engineering branches.
  - Institution Heritage: Bhagalpur College of Engineering established in 1960, one of Bihar's premier technical institutions, producing top engineering minds.
  - Leadership Profiles:
    - **Dr. Bimlesh Kumar:** Principal, BCE Bhagalpur (Patron). *"Education prepares a person to meet new challenges, scale fresh heights and lead a successful life..."*
    - **Dr. Abhinav Kumar:** Fest Convenor, Dept. of Electronics and Communication Engineering.
    - **Prof. Shashank Shekhar:** HoD, Applied Sciences & Humanities (Co-Patron).
    - **Dr. Pushpalata:** HoD, Electronics & Communication Engineering (Co-Patron).
- **Visual Assets:** Official portraits for Patrons and Convenor (`dr_bimlesh_kumar.jpg`, `dr_abhinav_kumar.jpg`, `prof_shashank_shekhar.png`, `dr_pushpalata.png`).
- **Local Implementation Status:** Leadership cards implemented on `/team`; dedicated `/about` editorial section and page required.

---

### Section 3: Competitions (29 Arenas)
- **Source Navigation Label:** `COMPETITIONS`
- **DOM Identifiers:** `#competitions-panel`, `#event-filters`, `#competitions-grid`
- **Available Content:** Exactly 29 technical competitions categorized across 7 disciplines:
  1. **Robotics (4):** RoboWar, RoboSoccer, Dhanush (LFR), Matsya (AquaBot).
  2. **Coding & Cyber (4):** 36-Hour Hackathon, Forensic Hackathon (CFET/HHFC), Competitive Programming, Blind Coding.
  3. **Gaming & Logic (3):** Bug Hunting, Free-Fire (Clash Squad & Battle Royale), E-Chess Tournament.
  4. **Civil & Structures (5):** Bridge Making, Survey King, AutoCAD Design, SolidWorks Challenge, Boat Making.
  5. **Electronics & IoT (3):** ElectroTechnovation, Arduino Effect, Zero Carbon Debate.
  6. **Design & Hardware (2):** MeMe Circuit, MATLAB Simulation.
  7. **Media & Creative (6):** Cinematography, Photography Contest, ElectroMania Quiz, Nukkad Street Play, General Quiz, Electronics Project Exhibition.
- **Data Fields:** Title, Tagline, Category, Date/Time, Venue, Entry Fee, Team Size, Prize Pool (1st, 2nd, 3rd), Rules list, Event Coordinators & Contacts.
- **Local Implementation Status:** Full 29-event dataset exists in `src/content/events.jsx`; rendered via CinematicList, CurvedLensCarousel, and HaloReel.

---

### Section 4: Accommodation & Hospitality
- **Source Navigation Label:** `ACCOMMODATION`
- **DOM Identifiers:** `#accommodation-panel`, `#room-3d-stage`, `#room-3d-box`, `#room-faq-list`, `#choice-card-lodging`, `#choice-card-fooding`, `#choice-card-both`, `#accom-booking-modal`
- **Available Content:**
  - **Tariffs:**
    - Lodging Fee: **₹50 per person / day** (Inside BCE Bhagalpur campus secure hostels).
    - Food & Dining: **₹125 per person / day** (Breakfast, Lunch & Dinner in campus mess).
    - All-Inclusive Combo: **₹175 per head / day**.
  - **Group Discounts:** Flat ₹150 off for groups > 4; flat ₹250 off for groups of 12+.
  - **Check-in & Verification:** Check-in opens 6 January 2027 at 6:00 AM.
  - **Mandatory Documents:** College ID (original + 2 copies), Govt photo ID, 3 passport photos, College NOC, Payment transaction slip.
  - **Hostel Logistics Contacts:**
    - Boys Hostel: Prof. Kumar Jyotiraditya (📞 7004618331)
    - Girls Hostel: Prof. Sarika Kushwaha (📞 7321018753)
  - **Hospitality FAQs:** 5 verified questions covering registration, arrival, security, meals, and refund policy.
  - **3D Room Experience:** Interactive isometric stage with hostel room view and TV lounge simulation.
- **Local Implementation Status:** Missing standalone page. Must be built as `/accommodation`.

---

### Section 5: Sponsors & Industry Partners
- **Source Navigation Label:** `SPONSORS`
- **DOM Identifiers:** `#sponsors-panel`
- **Available Content:**
  - **Technical & Patron Partners:**
    1. **CFET New Delhi:** Centre for Forensic Excellence & Tech (Forensic Hackathon patron).
    2. **HHFC Patna:** Patronized Cyber Security Organization.
    3. **DST Bihar:** Department of Science & Technology, Govt. of Bihar.
    4. **Debuggerzz Club:** Coding & Cyber Security Community.
    5. **Campus TV & Radio:** Media & Broadcasting Crew.
    6. **ESROS Robotics:** Robotics Arena Engineers.
  - **Partnership Inquiry:** `mailto:principal@bcebhagalpur.ac.in?subject=Technoriti%202026%20Sponsorship%20Inquiry`
- **Local Implementation Status:** Missing dedicated page. Must be built as `/sponsors`.

---

### Section 6: Steering Committee & Coordinators
- **Source Navigation Label:** `Developers` / `Steering Committee`
- **DOM Identifiers:** `#coordinators-grid`, `#dev-card-1`, `#dev-card-2`
- **Available Content:**
  - 10 Student Coordinators:
    1. Shubham Thakur — Lead Coordinator
    2. Vinit Kumar — Event Coordinator
    3. Md. Aman Ansari — Technical Coordinator
    4. Madan Kumar Jha — Logistics Coordinator
    5. Manish Kumar — Hospitality Coordinator
    6. Saurav Singh — Arena Coordinator
    7. Varun Singh — Public Relations
    8. Deepankar Pandey — Operations Coordinator
    9. Himanshu Vishwas — Security & Flow
    10. Dev Raj Dev — Sponsorship Coordinator
  - **Developer Attribution Exception:** Source lists Siddharth Bhushan. User requirement explicitly overrides this: **Sujal Kumar** (ECE, Batch 2024–2028) must remain as *The Person Behind the Digital Vision*.
- **Local Implementation Status:** Sujal Kumar digital vision is already live on `/team`. Student coordinators should be integrated on `/team` under a distinct section.

---

### Section 7: Event Registration Workflow
- **Source Navigation Label:** `REGISTER` / `EXPLORE COMPETITIONS` -> `Register`
- **DOM Identifiers:** `#register-panel`
- **Form Fields:**
  - Full Name (required)
  - University Roll Number (required)
  - WhatsApp / Phone Number (required, 10 digits)
  - College / University Name (required)
  - Branch / Department (required)
  - Primary Competition / Arena (dropdown of 29 events with pricing rules)
  - Team Size (1 to max members permitted for chosen arena)
  - Additional Competitions (+ Add Another Arena)
  - Campus Accommodation toggle (Lodging ₹50 / Fooding ₹125 / Both ₹175)
- **Local Implementation Status:** Missing dedicated registration form page. Must be built as `/register`.

---

### Section 8: Payment Checkout Workflow
- **Source Navigation Label:** Checkout Modal / `PROCEED TO PAYMENT GATEWAY`
- **DOM Identifiers:** `#payment-gateway-modal`
- **Workflow Steps:**
  1. **Order Summary:** Displays participant name, college roll, phone, team size, selected arenas, accommodation fee, and grand total.
  2. **UPI Gateway Display:**
     - Official Receiver UPI ID: `bcebhagalpur@upi`
     - Payee Name: `Technoriti 2026 BCE`
     - Dynamic UPI Intent URL (`upi://pay?pa=bcebhagalpur@upi&pn=Technoriti%202026%20BCE&am=...&cu=INR&tn=REG-...`)
     - Dynamic QR Code via QR generation API.
  3. **Transaction Verification Input:** 12-digit UPI UTR / Transaction Reference Number.
  4. **Back to Edit Action & Submit:** Review state.
- **Backend Reality:** The source uses client-side Supabase calls (`supabase-client.js`). There is no live verified payment gateway webhook on the client. It must be implemented with transparent simulation feedback.
- **Local Implementation Status:** Must be integrated into `/register`.

---

### Section 9: Participant Login & Dashboard
- **Source Navigation Label:** `LOGIN` (`/login.html`), `Dashboard` (`/dashboard.html`)
- **Workflow:**
  - `/login.html` renders a tabbed card (Sign In, Create Account, Reset Password).
  - `/dashboard.html` redirects back to login if unauthenticated or renders user badges and registered competition passes.
- **Local Implementation Status:** Local repository already features a sophisticated split-screen AuthUI at `/#/signin` and `/#/signup`. We will support `/dashboard` with an informative view reflecting registered state.

---

### Section 10: Footer & Navigation Architecture
- **Source Navigation Label:** Footer elements
- **Requirements:**
  1. Integration of newly supplied **TECHNORITI '26** typographic wordmark (`src/assets/technoriti-wordmark.png`).
  2. Retention of original **Synergy Footer Logo** (`src/assets/synergy-footer.svg`).
  3. Complete quick-navigation grid linking to all 9 primary site destinations.
  4. Verified college contact details and official social handles.
  5. Rendering at the bottom of every page via `src/components/Footer.jsx`.

---

## 3. Implementation Action Plan

| Phase | Target Route / Component | Action |
| :--- | :--- | :--- |
| **Wordmark & Footer** | `src/components/Footer.jsx` & `Footer.scss` | Integrate `technoriti-wordmark.png`, retain `synergy-footer.svg`, build comprehensive 9-destination quick links. |
| **About Page** | `src/screens/About.jsx` (`/#/about`) | Build editorial page featuring Notice 2363, BCE 1960 heritage, Dr. Bimlesh Kumar, Dr. Abhinav Kumar, Prof. Shashank Shekhar, Dr. Pushpalata. |
| **Accommodation Page** | `src/screens/Accommodation.jsx` (`/#/accommodation`) | Build complete page with ₹50/₹125/₹175 tariffs, 3D hostel room viewer, check-in logistics, contacts, and booking modal. |
| **Sponsors Page** | `src/screens/Sponsors.jsx` (`/#/sponsors`) | Build page showcasing CFET New Delhi, HHFC Patna, DST Bihar, Debuggerzz Club, Campus TV & Radio, ESROS Robotics. |
| **Team Page** | `src/screens/Team.jsx` & `src/content/teams.jsx` | Update with 10 student coordinators while preserving Sujal Kumar Digital Vision attribution. |
| **Registration & Checkout** | `src/screens/Register.jsx` (`/#/register`) | Build complete multi-step event registration with team size validation, add-arena, accommodation options, and UPI modal. |
| **FAQ & Contact Pages** | `src/screens/FaqPage.jsx` (`/#/faq`), `src/screens/Contact.jsx` (`/#/contact`) | Dedicated accessible pages for festival FAQs and BCE Bhagalpur communication desk. |
| **Routing** | `src/index.js` & `src/components/Navbar.jsx` | Register all routes in `HashRouter` and update navigation menu. |
