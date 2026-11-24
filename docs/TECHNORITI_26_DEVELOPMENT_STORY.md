# Building ROXX TECHNORITI '26: The Engineering Behind a College Technical Festival Website

**Author & Project Owner:** Sujal Kumar
**Sole Contributor:** Sujal Kumar
**Institution:** Bihar College of Engineering, Bhagalpur (BCE Bhagalpur)
**Festival Identity:** TECHNORITI '26
**Project:** ROXX TECHNORITI

---

## 1. Introduction & The Challenge

Every year, engineering institutions face the challenge of digital representation for their flagship technical symposiums. Too often, college festival websites fall into familiar traps: flash-in-the-pan designs with fragile dependencies, bloated JavaScript bundles, broken responsive layouts on mobile devices, static mockups masquerading as interactive portals, and fragmented data architectures that lose crucial event information.

When taking complete ownership of **ROXX TECHNORITI** — the official digital platform representing **TECHNORITI '26** at **Bihar College of Engineering, Bhagalpur (BCE Bhagalpur)** — my objective was clear: engineer a resilient, production-grade, aesthetically commanding web application as the sole developer.

This article details the architectural evolution, data engineering, physics-driven animations, forensic debugging, and disciplined standards that shaped ROXX TECHNORITI into a high-performance web experience.

---

## 2. Legacy Foundation & Architectural Debt

Taking over an existing repository foundation presented an immediate challenge. The codebase carried significant technical debt:

1. **Frozen Animation Systems:** The homepage three-row topic slider was completely stationary. Earlier refactors had stripped out original animation intervals, leaving empty containers and non-functional CSS ticker tracks.
2. **Corrupted Vector Assets:** Essential vector branding assets (such as `src/assets/synergy-nav.svg`) had been overwritten with transpiled Webpack ReactComponent JavaScript code during past sourcemap extractions, causing build errors and visual degradation.
3. **Fragile Path Aliases:** Experimental components imported utilities and UI elements using CRA-unsupported `@/` alias paths, resulting in runtime compilation failures.
4. **Fragmented Event Data:** Competition rules, prize pools, fees, and coordinator numbers were scattered across multiple disjointed JSON/JS files, risking event desynchronization during live registration.
5. **Memory Leaks in Component Mounts:** Global window event listeners (such as scroll indicators in navigation) were being bound directly in component render bodies without lifecycle cleanup, accumulating listener memory leaks on route transitions.

To address these issues without introducing chaotic rewrites, I adopted a strict engineering discipline: **Ponytail's 7-Rung Ladder** (YAGNI $\to$ Codebase reuse $\to$ Stdlib/DOM capabilities $\to$ Installed packages $\to$ Shortest working diff). Fixes had to address root causes, not symptoms.

---

## 3. Technology Stack & Architectural Modernization

The foundation of ROXX TECHNORITI balances legacy stability with modern React capabilities:

- **React 18 & Create React App (`react-scripts` 5.0.1):** Leverages modern React Concurrent Features and DOM root mounting (`ReactDOM.createRoot`), preserving stable build tooling without brittle bundler migrations.
- **Gradual TypeScript Integration:** Configured `tsconfig.json` with strict type checking (`npx tsc --noEmit`) running alongside React JSX components, ensuring type safety for new UI primitives while preserving established views.
- **Hybrid CSS Architecture:**
  - **Tailwind CSS:** Powers utility-first layouts, responsive grid mechanics, and component primitive spacing.
  - **Sass (SCSS):** Retained for deep hierarchical component styling, custom animations, and complex pseudo-elements.
  - **Bootstrap 5:** Integrated for robust grid containers and established navigation utilities.
- **Client-Side Routing via `HashRouter`:** Using `HashRouter` from `react-router-dom` v6 ensures that delegates accessing `#/events`, `#/accommodation`, or `#/register` can refresh or directly share links on static file hosts without requiring server-side fallback rewrites.

---

## 4. The 29-Competition Data Architecture

A college festival website is only as reliable as its event data. In past iterations, event listings were truncated or fragmented. For TECHNORITI '26, I engineered `src/content/events.jsx` as the **immutable single source of truth**.

### Polymorphic Data Adapter Pattern
Different UI views require different data shapes. Rather than duplicating records, `src/content/events.jsx` exposes four tailored adapters derived from the canonical `competitionsList`:

```javascript
// Canonical source
export const competitionsList = [ /* 29 complete arena objects */ ];

// 1. 3D Halo Reel Adapter: Formatted for circular elliptical rotation
export const getHaloReelItems = () => competitionsList.map(item => ({
  id: item.id,
  title: item.title,
  subtitle: item.category,
  image: item.imgsrc,
  tag: item.prize_pool,
  cta: `#/events`
}));

// 2. Cinematic Explorer Adapter: Formatted for accordion search & filtering
export const getCinematicItems = () => competitionsList.map(item => ({
  id: item.id,
  title: item.title,
  category: item.category,
  category_id: item.category_id,
  desc: item.desc,
  prize: item.prize_pool,
  team: item.team_size,
  fee: item.fee,
  venue: item.venue,
  coordinators: item.coordinator,
  phone: item.coordinator_phone,
  faq: item.faqques.map((q, i) => ({ q, a: item.faqans[i] }))
}));

// 3. Normalized Hashmap: Instant O(1) lookup by event slug
export default eventmap;
```

### The 29 Competitions Spectrum
The platform manages all 29 arenas across 6 technical divisions:
1. **Robotics & Hardware:** RoboWar, RoboSoccer, Dhanush (LFR), Matsya (AquaBot), ElectroTechnovation, Arduino Effect, Boat Making Challenge, Electronics Project Exhibition.
2. **Coding & Cyber:** 36-Hour Hackathon, Forensic Hackathon, Competitive Programming, Blind Coding, Bug Hunting, MeMe Circuit, MATLAB Simulation Challenge.
3. **Esports & Gaming:** Free-Fire Championship, E-Chess Tournament.
4. **Design & Civil:** Bridge Making Challenge, Survey King, AutoCAD Design Clash, SolidWorks 3D Challenge, Project Presentation.
5. **Quizzes & Literary:** Zero Carbon Debate, Cinematography Contest, Photography Contest, ElectroMania Quiz, Nukkad (Street Play), General Quiz Challenge, SciTech Grand Quiz.

Every competition item includes complete prize breakdowns, team sizing, venue locations, and direct coordinator phone numbers.

---

## 5. Motion Engineering & Interactive Canvas Physics

Visual polish elevates an event portal from a bulletin board to an interactive experience. Three key motion systems were engineered:

### A. Continuous 3-Row Topic Slider
To restore the frozen slider in `src/components/slider_section.jsx`, I mathematically reconstructed the pace and directionality from Git history using frame-rate independent delta timing:

$$\Delta x = \text{speed} \times \left(\frac{\Delta t}{1000}\right)$$

Where speed scales dynamically with viewport width:
- **Desktop (1920px):** $400\text{ px/s}$
- **Laptop (1440px):** $300\text{ px/s}$
- **Tablet (768px):** $160\text{ px/s}$
- **Mobile (375px):** $78\text{ px/s}$

Directionality alternates across rows: Row 1 flows leftward ($+x$), Row 2 flows rightward ($-x$), and Row 3 flows leftward ($+x$). To achieve infinite seamless looping without visual jumps, the track's DOM content was cloned (`{items}{items}`). When `scrollLeft >= halfWidth`, `halfWidth` is subtracted from `scrollLeft` within a single animation frame:

```javascript
const animate = (currentTime) => {
  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  if (!isHovered && el) {
    el.scrollLeft += direction * baseSpeed * delta;
    if (el.scrollLeft >= halfWidth) {
      el.scrollLeft -= halfWidth;
    } else if (el.scrollLeft <= 0) {
      el.scrollLeft += halfWidth;
    }
  }
  animationId = requestAnimationFrame(animate);
};
```
The ticker includes pause-on-hover mechanics, touch swipe gesture support, and immediate respect for the user's `prefers-reduced-motion: reduce` preference.

### B. 3D Elliptical Halo Reel
For the homepage featured arenas section, I implemented `HaloReel.jsx` — an elliptical orbit projecting cards into 3D space:

$$x = \text{centerX} + \text{radiusX} \times \cos(\theta)$$
$$y = \text{centerY} + \text{radiusY} \times \sin(\theta)$$
$$z = \sin(\theta)$$

Cards in the foreground scale up to $1.0\times$ with full opacity, while background cards scale down to $0.44\times$ with progressive atmospheric fading. Dragging or scrolling rotates the ring smoothly, updating the central active arena readout in real time.

### C. Full-Width Interactive Halftone Wordmark Footer
The bottom of the footer houses `HalftoneWordmarkFooter.tsx` — an interactive HTML5 Canvas spanning $100\text{vw}$.
1. **Offscreen Canvas Text Rasterization:** The phrase `Technoriti '26` is rendered into an offscreen canvas.
2. **Particle Grid Generation:** Pixel data is sampled at regular grid intervals ($6\text{px}$–$10\text{px}$). Points with alpha $> 128$ generate particle nodes.
3. **Repulsion Physics:** When the mouse cursor moves across the footer, a proximity vector $\vec{d} = \vec{p} - \vec{cursor}$ is calculated. If $|\vec{d}| < \text{radius}$, the particle is displaced away from the cursor along $\hat{d}$ with an elastic spring-back force returning it to its resting coordinate:

$$\vec{F}_{\text{repel}} = \left(1 - \frac{|\vec{d}|}{\text{radius}}\right) \times \text{force} \times \hat{d}$$
$$\vec{x}_{t+1} = \vec{x}_t + \vec{v}_t; \quad \vec{v}_{t+1} = (\vec{v}_t + \vec{F}_{\text{spring}}) \times \text{friction}$$

The result is a responsive, high-performance typographic canvas that reacts organically to user interactions.

---

## 6. Accommodation & Campus Stay Architecture

Outstation delegates traveling to BCE Bhagalpur require transparent, accessible accommodation details. The accommodation page (`src/screens/Accommodation.jsx`) was refactored by integrating the 21st.dev `pricing-02.tsx` component into the Technoriti design language:

- **Verified Tariffs:**
  - **Campus Lodging:** ₹50 / day (hostel residence, 24/7 security, high-speed WiFi, hot water).
  - **Mess Dining:** ₹125 / day (hygienic vegetarian meals: breakfast, lunch, high tea, dinner).
  - **Complete Stay (Recommended):** ₹175 / day (full package combining lodging and all daily meals).
- **Visual Design:** The recommended package features an animated rotating conic-gradient border (`border-conic-glow`), Lucide Flame `RECOMMENDED` badge, and direct registration button linking to `#/register`.
- **Logistical Guidelines:** Sits alongside a dedicated FAQ and emergency helpline directory for security, mess supervisors, and hostel wardens.

---

## 7. Dual Authentication Portal

To handle participant credentials, I engineered `auth-fuse.tsx` (`src/components/ui/auth-fuse.tsx`), an authentication gateway that adapts between **Sign In** and **Sign Up** modes:
- Dynamic backdrop swapping between tailored visual themes.
- Client-side input validation, password toggle visibility, and error states.
- Clean separation from public navigation by conditionally unmounting the global navbar and upper footer on `/signin` and `/signup` routes.

---

## 8. Cross-Viewport Responsiveness & Layout Defense

A major flaw in many technical festival sites is horizontal overflow on small screens caused by fixed-width banners or rogue grid containers.

ROXX TECHNORITI was audited across four standard device profiles:
- **Mobile ($375 \times 812$):** Fluid typography using CSS `clamp()`, vertical column stacking, full-width touch cards, and zero horizontal scroll.
- **Tablet ($768 \times 1024$):** Balanced two-column grid layouts for FAQ accordions and tariff cards.
- **Laptop ($1280 \times 800$) & Desktop ($1440 \times 900$):** Multi-column editorial footer, full elliptical HaloReel orbit, and expansive typography.
- **Ultrawide ($1920 \times 1080$):** Fixed layout bounds on text containers with edge-to-edge full-bleed canvases.

**Measured Result:** Across all tested viewports, the horizontal layout overflow was verified at exactly **0px** (`scrollWidth === innerWidth`).

---

## 9. Forensic Debugging & Issue Resolutions

Operating as a sole developer requires meticulous debugging. Key technical incidents resolved during development include:

### Incident 1: The VS Code ETag/mtime Save Conflict
- **Symptom:** Saving `event_card.scss` generated: `Failed to save 'event_card.scss': The content of the file is newer. Please compare your version with the file contents...`
- **Forensic Investigation:** Inspecting editor backup buffers (`Antigravity IDE\Backups\...`) and local history snapshots revealed that external Git operations and whitespace formatting updated the file's disk `mtime`. When the editor auto-saved, its internal ETag was older than disk.
- **Resolution:** Extracted and diffed the active buffer against the on-disk file. Both were 100% byte-for-byte identical (195 lines, 4,157 bytes). Cleared the stale buffer by reloading the file from disk (`File: Revert File`), resolving the conflict with zero lost code.

### Incident 2: Corrupted Vector Markup Recovery
- **Symptom:** Navigation bar logo failed to render, breaking header styling.
- **Root Cause:** An earlier Webpack build artifact extraction had overwritten `src/assets/synergy-nav.svg` with compiled JavaScript.
- **Resolution:** Reconstructed the clean SVG XML vector data from Git history, restoring proper `#BE00D7` branding and exact $38\text{px}$ aspect-ratio containment.

### Incident 3: Fragile CRA Path Aliases
- **Symptom:** Build failures when importing `@/lib/utils` in newly integrated UI primitives.
- **Root Cause:** Create React App v5 does not resolve `@/` root aliases without custom Webpack ejection or Craco overrides.
- **Resolution:** Converted all internal imports in UI components (`pricing-02.tsx`, `auth-fuse.tsx`, `ButtonWithIcon.tsx`) to standard relative paths (`../lib/utils`), maintaining zero-ejection CRA compliance.

---

## 10. Quality Assurance & Verification Matrix

Before declaring the codebase production-ready, it was subjected to strict verification gates:

```bash
# 1. TypeScript Static Typecheck
npx tsc --noEmit
# Result: Clean (Exit code 0, 0 type errors)

# 2. Whitespace & Formatting Gate
git diff --check
# Result: Clean (0 errors, 0 trailing whitespace)

# 3. Production Build Compilation
npm run build
# Result: Compiled successfully!
# Main JS Bundle: 279.2 kB (gzip)
# Main CSS Bundle: 39.92 kB (gzip)
```

---

## 11. Engineering Retrospective & Takeaways

Building and maintaining ROXX TECHNORITI '26 as a sole contributor reinforced core principles of software craftsmanship:

1. **Discipline Over Bloat:** Following the Ponytail 7-rung ladder prevented unnecessary library churn. Using native HTML5 Canvas math for the footer and `requestAnimationFrame` for the slider eliminated megabytes of third-party animation dependencies.
2. **Single Source of Truth:** Centralizing all competition rules into `src/content/events.jsx` with polymorphic data adapters eliminated the risk of inconsistent information across pages.
3. **Zero-Tolerance for Layout Overflow:** Ensuring strict 0px horizontal overflow across all device viewports guaranteed that every attendee enjoys an uncompromised mobile experience.
4. **Meticulous Forensic Verification:** Treating bugs as structural anomalies rather than random glitches enabled clean, permanent resolutions.

ROXX TECHNORITI '26 stands as a high-performance, resilient web application ready to power Bihar College of Engineering, Bhagalpur's flagship technical symposium.

---

*ROXX TECHNORITI '26 — Engineered with precision by Sujal Kumar.*
