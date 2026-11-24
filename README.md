# ROXX TECHNORITI

> **Official web application for TECHNORITI '26 — the annual technical festival of Bihar College of Engineering, Bhagalpur (BCE Bhagalpur).**
> **Project Owner & Sole Contributor:** Sujal Kumar

---

## 1. Project Overview

**ROXX TECHNORITI** is the digital platform powering **TECHNORITI '26**, the flagship technical festival of Bihar College of Engineering, Bhagalpur (BCE Bhagalpur). The platform delivers a high-performance web experience for delegates, participants, faculty patrons, and guests.

Engineered from the ground up to replace legacy event websites, ROXX TECHNORITI combines modern React 18 architecture, TypeScript safety, Tailwind CSS utility design, Sass styling, and motion mathematics to deliver a seamless event experience across all form factors.

---

## 2. Key Features

- **Interactive 3D Halo Reel:** An elliptical 3D rotation carousel on the homepage displaying featured arenas with mouse-drag, touch-drag, and wheel physics. Synchronized with an active arena title readout.
- **Continuous 3-Row Topic Slider:** A frame-rate-independent ticker powered by `requestAnimationFrame`, featuring seamless wrap-around loop mathematics, multi-directional flow, pause-on-hover ergonomics, and `prefers-reduced-motion` compliance.
- **29 Competition Arenas Dataset:** Comprehensive single-source-of-truth dataset covering 29 official competitions across 6 engineering and technology domains with complete rules, eligibility, fee structures, prize pools, venues, and student coordinator contact information.
- **Cinematic Event Explorer:** Real-time text search and category-filtered interface for browsing competitions, accompanied by modal detail sheets and registration links.
- **Accommodation & Mess Tariff System:** Integrated 21st.dev `pricing-02` component featuring verified tariffs (₹50 Lodging, ₹125 Mess, ₹175 Complete Stay), animated conic-gradient rotating borders, a Lucide Flame `RECOMMENDED` badge, institutional guidelines, and direct booking CTAs.
- **Full-Screen Interactive Halftone Wordmark:** High-performance HTML5 Canvas footer rendering mathematical dot matrices that react dynamically to cursor proximity with repulsive physics.
- **Dual Authentication Portal:** An interactive auth portal (`auth-fuse.tsx`) with state-driven visual background switching between Sign In and Sign Up modes.
- **Standardized Cinematic FAQ System:** Unified FAQ and participant policy accordions deployed across both the homepage and dedicated FAQ page.
- **Zero-Overflow Responsive Layout:** Verified cross-device responsiveness across 375px mobile, 768px tablet, 1280px laptop, 1440px desktop, and 1920px ultrawide displays with 0px horizontal overflow.

---

## 3. Technology Stack

Verified against `package.json`:

| Category | Technologies |
| :--- | :--- |
| **Core Framework** | React `18.2.0`, React DOM `18.2.0`, Create React App (`react-scripts` `5.0.1`) |
| **Language & Typings** | TypeScript (`tsconfig.json`), JavaScript ES2022 |
| **Styling & Design System** | Tailwind CSS, Sass (`sass` `1.54.9`), Bootstrap `5.2.1`, `react-bootstrap` `2.5.0` |
| **Component Primitives** | Radix UI (`@radix-ui/react-label`, `@radix-ui/react-separator`, `@radix-ui/react-slot`), `class-variance-authority`, `clsx`, `tailwind-merge` |
| **Animation & Motion** | Framer Motion (`11.0.0`), Motion (`14.14.0`), CSS Keyframes, Canvas 2D API |
| **Iconography** | Lucide React (`1.78.0`), React Icons (`4.4.0`) |
| **Routing & Client State** | React Router DOM (`6.4.0`) with `HashRouter` |
| **Device & Viewport** | `react-device-detect` (`2.2.2`), CSS Clamping & Viewport Units |
| **Testing & Quality** | `@testing-library/react` (`13.4.0`), `@testing-library/jest-dom` (`5.16.5`), `@testing-library/user-event` (`13.5.0`) |

---

## 4. Application Routes

ROXX TECHNORITI uses `HashRouter` from `react-router-dom` to support static hosting without server-side route rewrite dependencies:

| Route Path | View / Screen | Purpose & Content |
| :--- | :--- | :--- |
| `#/` | `App.jsx` | Homepage: Title Jumbotron, 3-Row Topic Slider, 3D Halo Reel, About Us, FAQ, Halftone Wordmark Footer |
| `#/events` | `Events.jsx` | All 29 Competition Arenas, real-time search, category pill filter, Cinematic List |
| `#/accommodation` | `Accommodation.jsx` | 3-Card Tariff Section (₹50, ₹125, ₹175), campus stay guidelines, helplines, FAQ |
| `#/about` | `About.jsx` | BCE Bhagalpur institutional legacy, festival vision, objectives, campus location |
| `#/team` | `Team.jsx` | Patron faculty, organizing committee, student convenors, developer attribution |
| `#/sponsors` | `Sponsors.jsx` | Corporate partners, past sponsors, partnership tier details |
| `#/faq` | `FaqPage.jsx` | Full institutional FAQ accordion with 12 structured delegate questions |
| `#/contact` | `Contact.jsx` | Campus desk coordinates, email addresses, emergency helplines, campus map |
| `#/register` | `Register.jsx` | Registration workflow, event selection, team member details, fee calculator |
| `#/signin` | `Auth.jsx` | Sign In authentication portal with interactive `auth-fuse` background |
| `#/signup` | `Auth.jsx` | Sign Up authentication portal with registration flow |

---

## 5. Project Directory Structure

```text
roxx-technoriti/
├── public/
│   ├── favicon.ico
│   ├── index.html
│   ├── manifest.json
│   ├── rect55.png                      # Event arena fallback graphic
│   └── robots.txt
├── src/
│   ├── assets/
│   │   ├── patrons/                    # Faculty patron portraits
│   │   ├── synergy-nav.svg             # Navbar vector mark
│   │   ├── technoriti-logo.svg         # Technoriti vector branding
│   │   └── technoriti-wordmark.png     # Static footer wordmark
│   ├── components/
│   │   ├── ui/
│   │   │   ├── auth-fuse.tsx           # Dual-background authentication portal
│   │   │   ├── badge.tsx               # Status badge component
│   │   │   ├── button.tsx              # Button primitive
│   │   │   ├── ButtonWithIcon.tsx      # Branded CTA button with icon
│   │   │   ├── card.tsx                # Card container primitive
│   │   │   ├── halftone-wordmark-footer.tsx # Interactive 100vw canvas footer
│   │   │   ├── pricing-02.tsx          # 3-tier tariff cards with conic borders
│   │   │   └── separator.tsx           # Structural divider
│   │   ├── Card.jsx                    # Legacy card wrapper
│   │   ├── CinematicList.jsx           # Cinema-grade event list with search
│   │   ├── CurvedLensCarousel.jsx      # Curved perspective lens carousel
│   │   ├── Faq.jsx                     # Homepage FAQ accordion
│   │   ├── Footer.jsx                  # Two-tier footer (editorial + halftone)
│   │   ├── HaloReel.jsx                # 3D elliptical card ring showcase
│   │   ├── Navbar.jsx                  # Navigation header with scroll listener
│   │   ├── One_faq_question.jsx        # FAQ single item primitive
│   │   ├── One_faq_question_home.jsx   # Homepage FAQ single item
│   │   ├── slider_section.jsx          # Continuous 3-row topic ticker
│   │   └── Title_Jumbotron.jsx         # Hero title jumbotron
│   ├── content/
│   │   ├── about_us.jsx                # Institutional editorial copy
│   │   ├── events.jsx                  # Single source of truth for 29 competitions
│   │   ├── faq.jsx                     # FAQ question/answer dataset
│   │   ├── slider_texts.jsx            # 3-row slider text content
│   │   ├── subtitle_texts.jsx          # Subtitle strings
│   │   ├── teams.jsx                   # Organizing committee dataset
│   │   └── timeline_data.jsx           # Festival schedule & timeline data
│   ├── lib/
│   │   ├── utils.js                    # Utility helpers (cn class merger)
│   │   └── utils.ts                    # TypeScript utility exports
│   ├── screens/
│   │   ├── About.jsx                   # About BCE Bhagalpur page
│   │   ├── Accommodation.jsx           # Accommodation & tariff page
│   │   ├── Auth.jsx                    # Sign in & sign up gateway
│   │   ├── Comingsoon.jsx              # Coming soon placeholder
│   │   ├── Contact.jsx                 # Contact & location page
│   │   ├── Events.jsx                  # Events explorer page
│   │   ├── FaqPage.jsx                 # Dedicated FAQ page
│   │   ├── Register.jsx                # Multi-step delegate registration
│   │   ├── Sponsors.jsx                # Sponsors & partner showcase
│   │   └── Team.jsx                    # Organizing team roster
│   ├── App.jsx                         # Main homepage application component
│   ├── App.scss                        # Root application stylesheet
│   ├── index.js                        # React 18 root mounting & HashRouter
│   └── tailwind.css                    # Tailwind utility directives
├── docs/                               # Engineering documentation & audits
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## 6. Competition Data Architecture (All 29 Arenas)

All competition data is centralized in [`src/content/events.jsx`](file:///c:/Users/sujal/syn/src/content/events.jsx). The file provides four polymorphic data exports that serve different UI components:

1. `competitionsList`: The canonical array of all 29 arena objects with full metadata (prizes, rules, FAQs, fees, venues, student coordinators).
2. `getHaloReelItems()`: Formatted for the 3D `HaloReel` elliptical rotation card ring.
3. `getCinematicItems()`: Formatted for the `CinematicList` expandable arena accordion with search.
4. `getLensSlides()`: Formatted for the `CurvedLensCarousel` 3D perspective viewer.
5. `default eventmap`: Normalized dictionary keyed by event slug for instant lookups.

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

- **Node.js:** v16.x or higher (Node 18 LTS recommended)
- **Package Manager:** npm v8.x or higher

### Installation

```bash
# Clone the repository
git clone <configured-git-remote-url>
cd roxx-technoriti

# Install dependencies
npm install
```

### Running Locally

```bash
# Start local development server
npm start
```

The application will launch on `http://localhost:3000/#/`.

---

## 8. Quality Verification & Build

```bash
# Static TypeScript type check (zero emit)
npx tsc --noEmit

# Trailing whitespace and formatting check
git diff --check

# Production build bundle
npm run build

# Run unit and integration tests
npm test -- --watchAll=false
```

---

## 9. Ownership, Identity & Credits

- **Project Name:** ROXX TECHNORITI
- **Festival Represented:** TECHNORITI '26
- **Hosting Institution:** Bihar College of Engineering, Bhagalpur (BCE Bhagalpur)
- **Project Owner & Sole Contributor:** **Sujal Kumar**
- **Architecture & Engineering:** Designed, transformed, refactored, and maintained independently by Sujal Kumar.
- **License:** Proprietary / All rights reserved by Sujal Kumar and BCE Bhagalpur for TECHNORITI '26.
