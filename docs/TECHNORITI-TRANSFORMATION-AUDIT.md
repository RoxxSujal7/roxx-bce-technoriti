# Forensic Inspection & Transformation Audit
**Project**: Synergy IIITB → Technoriti
**Repository**: `c:\Users\sujal\syn`
**Date**: November 24, 2026
**Baseline Git Branch**: `main` (commit baseline preserved)

---

## 1. Executive Summary

This forensic audit evaluates the codebase of the Synergy IIIT Bangalore website (`https://github.com/synergy-iiitb/synergy-iiitb.github.io`) to establish the architectural, design, structural, and content baseline before transforming it into the **Technoriti** college technical festival website.

Per strict project requirements:
- The website is **not** being recreated from scratch.
- The original visual identity (dark theme, high-contrast typography, magenta accent tokens `#BE00D7`, flowing marquee text, and custom hero styling) is preserved.
- The existing React architecture and component hierarchy are maintained while upgrading the festival identity, content, events, metadata, and routing.

---

## 2. Repository Architecture & Stack

### Core Technologies
- **Framework**: React 18 (`react: ^18.2.0`, `react-dom: ^18.2.0`)
- **Tooling**: Create React App (`react-scripts: 5.0.1`)
- **Routing**: `react-router-dom: ^6.4.0` using `HashRouter`
- **UI Framework**: `react-bootstrap: ^2.5.0` with `bootstrap: ^5.2.1`
- **Icons**: `react-icons: ^4.4.0` (Bootstrap, Feather, FontAwesome, Boxicons)
- **Styling**: Sass (`sass: ^1.54.9`) with SCSS modules per component
- **Device Detection**: `react-device-detect: ^2.2.2`

### Directory Layout
```
c:\Users\sujal\syn\
├── public/                 # HTML shell, favicons, web app manifest, robots.txt, browserconfig
│   ├── index.html          # Shell with Google Fonts (Inter, Poppins, Monoton, Limelight), metadata
│   ├── manifest.json       # PWA manifest
│   └── *.png, *.ico        # Platform icons and event posters
├── src/
│   ├── App.jsx             # Home page assembler
│   ├── App.scss            # Top-level application styling and scrollbar overrides
│   ├── index.js            # React root, HashRouter setup, Bootstrap CSS/JS imports
│   ├── index.scss          # Base background (#0b0b0b) and overflow rules
│   ├── assets/             # Brand logos (synergy-nav.svg, synergy-footer.svg, iiitblogo.png), flowfield graphic
│   ├── components/         # Reusable UI components
│   │   ├── Navbar.jsx / .scss              # Floating responsive header with scroll-reactive background
│   │   ├── Title_Jumbotron.jsx / .scss     # Hero banner with smooth scroll CTA
│   │   ├── slider_section.jsx / .scss      # Continuous three-tier animated ticker
│   │   ├── big_side_heading.jsx / .scss    # Two-column section layout with massive side headings
│   │   ├── Faq.jsx / .scss                 # FAQ container
│   │   ├── One_faq_question_home.jsx       # FAQ accordion item for homepage
│   │   ├── One_faq_question.jsx            # FAQ accordion item for event cards
│   │   ├── event_card.jsx / .scss          # Detailed event showcase card with embedded FAQ and CTA
│   │   ├── Card.jsx / .scss                # Individual team/speaker card
│   │   ├── Speakers.jsx / .scss            # Keynote speaker showcase
│   │   ├── Timeline.jsx / .scss            # Event timeline/schedule
│   │   └── Footer.jsx / .scss              # Two-tier responsive footer with social links
│   ├── content/            # Isolated data files
│   │   ├── about_us.jsx        # About description string
│   │   ├── events.jsx          # Event dictionary and FAQs
│   │   ├── faq.jsx             # Homepage FAQ array
│   │   ├── slider_texts.jsx    # Ticker tags array
│   │   ├── speakers.jsx        # Speaker roster
│   │   ├── subtitle_texts.jsx  # Page subtitles
│   │   ├── teams.jsx           # Organizing committee groups
│   │   └── timeline_data.jsx   # Schedule data class
│   └── screens/            # Route views
│       ├── Events.jsx / .scss      # Events listing route
│       ├── Team.jsx / .scss        # Team listing route
│       ├── Comingsoon.jsx / .scss  # Pre-launch placeholder screen
│       ├── ResponsiveCards.jsx     # Responsive grid for team cards
│       └── sponsor_us.jsx / .scss  # Sponsorship proposal screen
└── docs/                   # Audits, specs, and implementation records
```

---

## 3. Routes & Page Components Mapping

| Route | Component | Current State | Target Technoriti State |
|---|---|---|---|
| `#/` | `src/App.jsx` | Full Home page: `Title_Jumbotron`, `Slider_section`, `Big_side_heading` (About Us), `Faq`, `Footer` | Update with Technoriti Hero, ticker tags, verified About Us, Technoriti FAQs |
| `#/events` | `src/screens/Events.jsx` | Shows `<Comingsoon />` (event cards commented out) | Activate full event showcase using Technoriti competitions and categories |
| `#/team` | `src/screens/Team.jsx` | Shows `<Comingsoon />` (`ResponsiveCards` commented out) | Activate or refine with Technoriti organizing council/team or keep clean |
| `#/sponsorus` | `src/screens/sponsor_us.jsx` | Commented out in `index.js` | Maintain cleanly, ready for enablement if needed |

---

## 4. Visual Identity, Design Tokens & Typography

### Color Palette
- **Canvas / Background**: `#000000` (pure black) and `#0b0b0b` (soft charcoal)
- **Surface / Cards / Footer**: `#1d1c1c` (footer background), `#000000` (accordion cards)
- **Primary Text**: `#FFFFFF` (100% white)
- **Muted Text**: `rgba(255, 255, 255, 0.7)` and `#AAAAAA`
- **Signature Accent Dot / Brand Color**: `#BE00D7` (vibrant neon violet / magenta dot used on all section headings: `Technoriti.`, `About Us.`, `Faq.`)
- **Action Buttons**: `.btn-purple` / custom purple CTAs

### Typography
Loaded in `public/index.html`:
1. **Inter** (`wght@100..600`): Navigation, UI elements, clean body copy
2. **Poppins** (`wght@200..900`): Headings, side headers, jumbotron titles, FAQ headers
3. **Limelight**: Specialized display font
4. **Monoton**: Retro-futuristic marquee and accent styling

### Characteristic Motion & Interactions
- **Navbar Scroll Reaction**: Transitions from transparent to solid black when `window.scrollY >= 80` or on mobile devices.
- **Continuous 3-Tier Horizontal Ticker**: Custom automated ticker in `slider_section.jsx` using `useHorizontalScroll` with opposing directions (`rtl` on tier 2) and alternating hollow outline (`-webkit-text-stroke: 2.5px white`) and solid bold typography.
- **Hero Down Arrow CTA**: Smooth window scroll on click to reveal ticker and about sections.
- **Flush Dark Accordions**: Borderless, sleek black accordion toggles for event specifics and festival FAQs.

---

## 5. Assets Inventory

### Image and Vector Assets in `src/assets/`
- `FlowField_dummy.png`: Generative vector particle field used as the dark background of the hero section.
- `synergy-nav.svg`: Top navbar brand logo (vector).
- `synergy-footer.svg`: Footer brand mark (vector).
- `iiitblogo.png` & `iiitb-logo.png`: College emblem in footer.
- `rectangle55.png` & `rect55.png`: Placeholder event cards.
- `leftHorizontallBar.png`, `rightHorizontalBar.png`, `mobileRightHorizontalBar.png`, `verticalBar.png`: Structural accent bars.

### Public Assets in `public/`
- `event1_poster.png`: Sample competition poster.
- `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-96x96.png`: Favicon files.
- `android-icon-*.png`, `apple-icon-*.png`, `ms-icon-*.png`: Platform app icons.
- `manifest.json`: Web application metadata.
- `browserconfig.xml`: Windows tile configuration.

---

## 6. Hardcoded Synergy IIITB References Catalog

The following locations contain explicit references that must be replaced during Phase 4 and Phase 5:

1. **HTML Shell (`public/index.html`)**:
   - `<title>Synergy'23</title>`
   - JSON-LD Structured Data: `"name": "Synergy'23"`, `"alternateName": "Synergy'23- IIIT Bangalore"`, `"url": "https://synergy.iiitb.ac.in/"`
   - Meta tags: `title`, `description`, `keywords`, `author` ("SYNERGY'23 - IIITB")
2. **Custom Domain (`CNAME`)**:
   - `synergy.iiitb.ac.in`
3. **Application Title & Jumbotron (`src/App.jsx`, `src/components/Title_Jumbotron.jsx`)**:
   - `bigHeader={"Synergy is"}` `bigHeaderCaps={"BACK"}`
4. **Navigation (`src/components/Navbar.jsx`)**:
   - `alt="Synergy Logo"`
   - LinkedIn: `https://www.linkedin.com/company/synergy-iiitbangalore/`
   - Instagram: `https://www.instagram.com/synergy_iiitb/`
5. **Footer (`src/components/Footer.jsx`)**:
   - Logos: `synergylogo`, `iiitbLogo`
   - Copyright: `© Synergy 2023, IIIT Bangalore`
   - Social links: Synergy LinkedIn, Synergy Instagram, IIITB Facebook, IIITB Twitter
6. **Content Modules**:
   - `src/content/about_us.jsx`: Synergy tech fest description, IIIT Bangalore references
   - `src/content/subtitle_texts.jsx`: "IIIT Bangalore is back in 2023 with its highly anticipated techfest..."
   - `src/content/faq.jsx`: All 7 FAQ questions and answers explicitly discuss Synergy and IIIT Bangalore
   - `src/content/events.jsx`: Mentions Synergy, Parvaaz, IIITB
   - `src/content/slider_texts.jsx`: Includes "SYNERGY" tag
   - `src/content/timeline_data.jsx`: Director IIIT Bangalore references
7. **Screens (`src/screens/Comingsoon.jsx`)**:
   - "Synergy 2023 is COMING SOON", "2nd iteration of IIITB's Annual TechFest"

---

## 7. Baseline Preservation Strategy

- Git repository baseline has been verified. No modifications to working files have occurred.
- Any new assets or components will complement the existing structure.
- Content will be centralized in `src/content/` to ensure maintainability and strict separation of data from layout components.
- Dev server process (`npm.cmd start`) is kept running continuously throughout development.
