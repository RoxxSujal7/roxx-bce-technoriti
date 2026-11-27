# ROXX TECHNORITI

> **Official web application for TECHNORITI '26 — the annual technical festival of Bhagalpur College of Engineering, Bhagalpur (BCE Bhagalpur).**
> **Project Owner & Sole Contributor:** Sujal Kumar

---

## 1. Project Overview

**ROXX TECHNORITI** is the full-stack web platform powering **TECHNORITI '26**, the flagship technical festival of Bhagalpur College of Engineering, Bhagalpur (BCE Bhagalpur). Built with React 18, TypeScript, Tailwind CSS, Sass, Bootstrap 5, and Supabase (PostgreSQL + Edge Functions), it serves delegates, coordinators, faculty patrons, and festival administrators across mobile and desktop viewports.

---

## 2. Key Features

- **4-Step Delegate Registration Wizard (`#/register`):** Animated multistep form (`Delegate Info → Arenas → Stay & Mess → Review & Pay`) powered by Framer Motion and `@shadcn/react/questionnaire`, including a 38-college Bihar Government Engineering Colleges selector (`src/content/colleges.jsx`) with dynamic `"Other"` input, live fee calculation, and UPI payment / UTR verification.
- **Interactive 3D Halo Reel:** Elliptical 3D rotation carousel on the homepage displaying featured arenas with mouse-drag, touch-drag, wheel physics, and synchronized mobile title readout.
- **Continuous 3-Row Topic Slider:** Frame-rate-independent `requestAnimationFrame` ticker with seamless wrap-around loop, pause-on-hover, and `prefers-reduced-motion` support.
- **29 Competition Arenas Dataset:** Single source of truth in `src/content/events.jsx` covering 29 competitions across 5 categories with rules, eligibility, fees, prize pools, venues, and coordinator contacts.
- **Cinematic Event Explorer (`#/events`):** Real-time search, category filtering, expandable detail rows (`CinematicList`), and curved perspective viewer (`CurvedLensCarousel`).
- **Accommodation & Mess Tariff System (`#/accommodation`):** 3-tier tariff cards (`pricing-02.tsx`) for ₹50 Lodging, ₹125 Mess, and ₹175 Complete Stay with direct registration CTAs.
- **Full-Width Interactive Halftone Wordmark (`Footer.jsx`):** HTML5 Canvas footer rendering reactive dot matrices alongside BCE Bhagalpur institutional links.
- **Delegate & Admin Portals (`#/signin`, `#/signup`, `#/dashboard`, `#/admin-login`, `#/admin`):** Supabase-backed authentication (`auth-fuse.tsx` and `neural-access-login.tsx`), delegate registration dashboard, and MFA-hardened RBAC admin dashboard (`super_admin`, `admin`, `coordinator`) with UTR verification and competition management.

---

## 3. Technology Stack

| Category | Technologies |
| :--- | :--- |
| **Core Framework** | React `18.2.0`, React DOM `18.2.0`, Create React App (`react-scripts` `5.0.1`) |
| **Language & Typings** | TypeScript (`4.9.5`), JavaScript ES2022 |
| **Styling & UI Primitives** | Tailwind CSS (`3.1.8`), Sass (`1.54.9`), Bootstrap `5.2.1`, `react-bootstrap` `2.5.0`, `@shadcn/react` `0.3.1`, Radix UI |
| **Animation & Visualization** | Framer Motion (`11.0.0`), Motion (`14.14.0`), Recharts (`2.15.4`), Canvas 2D API |
| **Icons & Utilities** | Lucide React (`1.78.0`), React Icons (`4.4.0`), `clsx`, `tailwind-merge`, `class-variance-authority`, `qrcode` |
| **Routing** | React Router DOM (`6.4.0`) with `HashRouter` and lazy-loaded route chunks |
| **Backend & Security** | Supabase (`@supabase/supabase-js` `2.119.2`), PostgreSQL RLS migrations, Deno Edge Functions |
| **Hosting** | Vercel (`vercel.json` with `create-react-app` preset, CSP & cache headers) |

---

## 4. Application Routes

ROXX TECHNORITI uses `HashRouter` (`src/index.js`) with lazy-loaded screen chunks:

| Route Path | View / Screen | Purpose & Content |
| :--- | :--- | :--- |
| `#/` | `App.jsx` | Homepage: Title Jumbotron, 3-Row Topic Slider, 3D Halo Reel, About Us, FAQ, Halftone Wordmark Footer |
| `#/events` | `Events.jsx` | All 29 Competition Arenas, real-time search, category filters, `CinematicList` |
| `#/accommodation` | `Accommodation.jsx` | 3-card tariff section (₹50, ₹125, ₹175), campus stay guidelines, helplines, FAQ |
| `#/about` | `About.jsx` | BCE Bhagalpur institutional legacy, festival vision, objectives, campus location |
| `#/team` | `Team.jsx` | Patron faculty, organizing committee, student convenors, developer attribution |
| `#/sponsors` | `Sponsors.jsx` | Corporate partners, past sponsors, partnership tier details |
| `#/faq` | `FaqPage.jsx` | Full institutional FAQ accordion |
| `#/contact` | `Contact.jsx` | Campus desk coordinates, email addresses, emergency helplines, campus map |
| `#/policies` | `Legal.jsx` | Privacy policy, terms, and festival participation guidelines |
| `#/register` | `Register.jsx` | 4-step delegate registration wizard, Bihar college selector, fee summary, UPI/UTR submission |
| `#/signin` | `Auth.jsx` | Delegate sign-in portal with interactive `auth-fuse` background |
| `#/signup` | `Auth.jsx` | Delegate sign-up portal |
| `#/dashboard` | `Dashboard.jsx` | Authenticated delegate dashboard displaying registration & payment status |
| `#/admin-login` | `AdminLogin.jsx` | Staff/admin sign-in portal (`neural-access-login`) with MFA support |
| `#/admin` | `Admin.jsx` | RBAC admin console (`App-1`) for registrations, UTR verification, competitions, and admin roles |

---

## 5. Project Directory Structure

```text
roxx-bce-technoriti/
├── public/
│   ├── favicon.svg
│   ├── index.html                      # Google Fonts (Limelight, Inter, Poppins, Monoton, Space Mono) & SEO meta
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── assets/                         # Logos, wordmarks, patron portraits, arena graphics
│   ├── components/
│   │   ├── ui/
│   │   │   ├── app-1.tsx               # Admin dashboard shell & sidebar
│   │   │   ├── auth-fuse.tsx           # Dual-background authentication portal
│   │   │   ├── badge.tsx / button.tsx / card.tsx / separator.tsx
│   │   │   ├── ButtonWithIcon.tsx      # Branded CTA button with icon
│   │   │   ├── halftone-wordmark-footer.tsx # Interactive 100vw canvas footer
│   │   │   ├── neural-access-login.tsx # Admin login portal UI
│   │   │   ├── pricing-02.tsx          # 3-tier accommodation tariff cards
│   │   │   └── questionnaire.tsx       # @shadcn/react/questionnaire wrapper
│   │   ├── CinematicList.jsx           # Searchable expandable arena accordion
│   │   ├── CurvedLensCarousel.jsx      # Curved perspective lens carousel
│   │   ├── Faq.jsx                     # Homepage FAQ accordion
│   │   ├── Footer.jsx                  # Two-tier footer (editorial + halftone)
│   │   ├── HaloReel.jsx                # 3D elliptical card ring showcase
│   │   ├── Navbar.jsx                  # Navigation header with scroll listener
│   │   ├── slider_section.jsx          # Continuous 3-row topic ticker
│   │   └── Title_Jumbotron.jsx         # Hero title jumbotron
│   ├── content/
│   │   ├── about_us.jsx                # Institutional editorial copy
│   │   ├── colleges.jsx                # 38 Bihar govt engineering colleges + OTHER_COLLEGE
│   │   ├── events.jsx                  # Single source of truth for 29 competitions
│   │   ├── faq.jsx                     # FAQ question/answer dataset
│   │   ├── slider_texts.jsx            # 3-row slider text content
│   │   ├── subtitle_texts.jsx          # Subtitle strings
│   │   ├── teams.jsx                   # Organizing committee dataset
│   │   └── timeline_data.jsx           # Festival schedule & timeline data
│   ├── context/
│   │   └── AuthContext.jsx             # Supabase auth session, profile & redirect handling
│   ├── lib/
│   │   ├── supabaseClient.js           # Supabase client initialization
│   │   ├── utils.js                    # JS utility helpers
│   │   └── utils.ts                    # TypeScript cn() class-merging helper
│   ├── screens/
│   │   ├── About.jsx / Accommodation.jsx / Contact.jsx / Events.jsx / FaqPage.jsx / Legal.jsx / Sponsors.jsx / Team.jsx
│   │   ├── Admin.jsx / AdminLogin.jsx / Auth.jsx / Dashboard.jsx / Register.jsx
│   ├── App.jsx                         # Homepage application component
│   ├── App.scss                        # Root application stylesheet
│   ├── index.js                        # React 18 root mounting, HashRouter & lazy routes
│   ├── index.scss                      # Global base & skip-link styles
│   └── tailwind.css                    # Tailwind directives & theme CSS variables
├── supabase/
│   ├── config.toml
│   ├── functions/                      # Edge Functions (create-registration, verify-payment, admin/coordinator APIs)
│   ├── migrations/                     # PostgreSQL schema, RLS, and MFA hardening migrations
│   ├── scripts/                        # Strict MFA helper SQL
│   └── tests/                          # Deno edge security tests
├── docs/                               # Engineering, UI, and security audit reports
├── .env.example                        # Public frontend & server env var template
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vercel.json                         # Vercel build, installCommand, CSP & cache headers
```

---

## 6. Competition Data Architecture (All 29 Arenas)

All competition data is centralized in [src/content/events.jsx](src/content/events.jsx), providing five exports:

1. `competitionsList`: Canonical array of all 29 arena objects (prizes, rules, FAQs, fees, venues, coordinators).
2. `getHaloReelItems()`: Formatted for the 3D `HaloReel` elliptical card ring.
3. `getCinematicItems()`: Formatted for the `CinematicList` expandable accordion.
4. `getLensSlides()`: Formatted for the `CurvedLensCarousel` viewer.
5. `default eventmap`: Slug-keyed dictionary for instant lookups.

### Official 29 Competitions Roster

| # | Slug | Competition Title | Category | Team Size | Prize Pool |
| :-: | :--- | :--- | :--- | :-: | :-: |
| 1 | `robowar` | RoboWar | Robotics & Hardware | 1–4 Members | ₹5,000 |
| 2 | `robosoccer` | RoboSoccer | Robotics & Hardware | 1–4 Members | ₹5,000 |
| 3 | `dhanush` | Dhanush – LFR | Robotics & Hardware | 1–4 Members | ₹5,000 |
| 4 | `matsya` | Matsya – AquaBot | Robotics & Hardware | 1–4 Members | ₹5,000 |
| 5 | `electrotechnovation` | ElectroTechnovation | Robotics & Hardware | 1–4 Members | ₹5,000 |
| 6 | `arduino` | Arduino Effect | Robotics & Hardware | 1–4 Members | ₹3,000 |
| 7 | `boatmaking` | Boat Making Challenge | Robotics & Hardware | 1–3 Members | ₹2,500 |
| 8 | `electronicsproject` | Electronics Project Exhibition | Robotics & Hardware | 1–4 Members | ₹5,000 |
| 9 | `hackathon` | 36-Hour Hackathon | Coding & Cyber | 2–4 Members | ₹10,000 |
| 10 | `forensic` | Forensic Hackathon | Coding & Cyber | 1–3 Members | ₹5,000 |
| 11 | `competitive` | Competitive Programming | Coding & Cyber | Individual | ₹3,000 |
| 12 | `blindcoding` | Blind Coding | Coding & Cyber | Individual | ₹2,000 |
| 13 | `bughunting` | Bug Hunting | Coding & Cyber | Individual | ₹2,000 |
| 14 | `memecircuit` | MeMe Circuit | Coding & Cyber | 1–2 Members | ₹2,000 |
| 15 | `matlab` | MATLAB Simulation Challenge | Coding & Cyber | 1–2 Members | ₹3,000 |
| 16 | `freefire` | Free-Fire Championship | Esports & Gaming | 4 Members | ₹5,000 |
| 17 | `echess` | E-Chess Tournament | Esports & Gaming | Individual | ₹2,000 |
| 18 | `bridgemaking` | Bridge Making Challenge | Design & Civil | 2–4 Members | ₹4,000 |
| 19 | `surveyking` | Survey King | Design & Civil | 2–3 Members | ₹3,000 |
| 20 | `autocad` | AutoCAD Design Clash | Design & Civil | Individual | ₹3,000 |
| 21 | `solidworks` | SolidWorks 3D Challenge | Design & Civil | Individual | ₹3,000 |
| 22 | `projectpresentation` | Project Presentation | Design & Civil | 1–3 Members | ₹5,000 |
| 23 | `zerocarbon` | Zero Carbon Debate | Quizzes & Literary | Individual | ₹2,500 |
| 24 | `cinematography` | Cinematography Contest | Quizzes & Literary | 1–3 Members | ₹3,000 |
| 25 | `photography` | Photography Contest | Quizzes & Literary | Individual | ₹2,000 |
| 26 | `electromania` | ElectroMania Quiz | Quizzes & Literary | 1–2 Members | ₹2,000 |
| 27 | `nukkad` | Nukkad (Street Play) | Quizzes & Literary | 6–12 Members | ₹6,000 |
| 28 | `generalquiz` | General Quiz Challenge | Quizzes & Literary | 1–2 Members | ₹2,500 |
| 29 | `scitechquiz` | SciTech Grand Quiz | Quizzes & Literary | 1–2 Members | ₹3,000 |

---

## 7. Getting Started

### Prerequisites

- **Node.js:** v18 LTS or higher
- **Package Manager:** npm v8+

### Installation

> `@shadcn/react` declares a React `>=19` peer dependency while this project runs React `18.2.0`, so install with `--legacy-peer-deps`.

```bash
git clone https://github.com/RoxxSujal7/roxx-bce-technoriti.git
cd roxx-bce-technoriti
npm install --legacy-peer-deps
```

### Environment Variables

Copy `.env.example` to `.env.local` for local development:

```env
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
REACT_APP_UPI_VPA=bcebhagalpur@upi
REACT_APP_UPI_PAYEE_NAME=Technoriti 2026 BCE
```

Never place `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, or other server secrets in `REACT_APP_*` variables; configure those only via `supabase secrets set`.

### Running Locally

```bash
npm start
```

The application opens at `http://localhost:3000/#/`.

---

## 8. Quality Verification & Build

```bash
# Static TypeScript type check (zero emit)
npx tsc --noEmit

# Trailing whitespace and formatting check
git diff --check

# Production build bundle (CI=true mirrors Vercel)
npm run build

# Run unit and security tests
npm test -- --watchAll=false
```

---

## 9. Deploying to Vercel

This repository includes [vercel.json](vercel.json) preconfigured for Create React App:

- **`installCommand`:** `npm install --legacy-peer-deps`
- **`buildCommand`:** `npm run build`
- **`outputDirectory`:** `build`
- **Security & Cache Headers:** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, `Content-Security-Policy`, immutable `/static/*` caching, and `no-store` on `/index.html`.

Before deploying on Vercel:

1. Import the `RoxxSujal7/roxx-bce-technoriti` repository in Vercel.
2. Add the public `REACT_APP_*` variables from `.env.example` in **Project Settings → Environment Variables**.
3. Add your Vercel deployment URL to `ALLOWED_ORIGINS` in your Supabase Edge Function secrets.

---

## 10. Ownership, Identity & Credits

- **Project Name:** ROXX TECHNORITI
- **Festival Represented:** TECHNORITI '26
- **Hosting Institution:** Bhagalpur College of Engineering, Bhagalpur (BCE Bhagalpur)
- **Project Owner & Sole Contributor:** **Sujal Kumar**
- **License:** Proprietary / All rights reserved by Sujal Kumar and BCE Bhagalpur for TECHNORITI '26.
