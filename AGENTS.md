# TECHNORITI '26 — Repository Agent Guidelines & Engineering Standards

## 1. Core Engineering Discipline: Ponytail

This repository adopts **Ponytail** as its primary engineering discipline for all development, bug fixing, refactoring, and code review.

- **Installation:** Ponytail is installed globally at `C:\Users\sujal\.gemini\config\skills\ponytail\SKILL.md`.
- **Auto-Activation:** Default mode is `/ponytail full`. It is active on every coding task without requiring reinstallation or external downloads.
- **Modes Supported:**
  - `/ponytail lite`: Builds requested feature, states the minimal/stdlib alternative in one line.
  - `/ponytail full` (Default): Enforces the 7-rung ladder, shortest working diffs, and minimal code.
  - `/ponytail ultra`: Aggressive YAGNI; deletion before addition.
  - `/ponytail off` or `"stop ponytail"`: Deactivates lazy mode.
  - `/ponytail-review`: Complexity and over-engineering review.
  - `/ponytail-audit`: Repository-wide audit for bloat and dead abstractions.
  - `/ponytail-debt`: Ledger of tracked `ponytail:` comments.
  - `/ponytail-gain`: Published benchmark impact scoreboard.

### The 7-Rung Ladder
1. **Does this need to exist at all?** (YAGNI)
2. **Already in this codebase?** Reuse existing components, helpers, or types.
3. **Stdlib does it?** Use native JavaScript/TypeScript APIs.
4. **Native platform covers it?** Use CSS/DOM capabilities over external libraries.
5. **Already-installed dependency solves it?** Never add a new dependency when installed packages suffice.
6. **Can it be one line?** Keep it concise and readable.
7. **Minimum code that works.** Shortest working diff wins after complete comprehension.

> **Bug Fix Rule:** Fix at the root cause, not symptom. Grep all callers of a function before modifying it.

---

## 2. Complementary Engineering Skills

| Specialized Area | Skill | Location / Activation | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **Engineering Discipline** | `ponytail` | `~/.gemini/config/skills/ponytail/` | Default workflow, minimal diffs, zero speculative bloat |
| **Design Polish & Motion** | `emil-design-eng` | `~/.gemini/config/skills/emil-design-eng/` | Hover physics, easing curves, button press feel, UI polish |
| **Web Accessibility & Standards** | `web-design-guidelines` | `~/.gemini/config/skills/web-design-guidelines/` | Semantic HTML, contrast ratios, keyboard navigation, touch targets |
| **Visual QA & Smoke Testing** | `browser-qa` | `~/.gemini/config/skills/browser-qa/` | Cross-viewport testing (1440px, 768px, 375px), 0px overflow |
| **End-to-End Verification** | `e2e-testing` | `~/.gemini/config/skills/e2e-testing/` | Playwright journey verification, route switching, form submission |
| **Quality Gate Verification** | `verification-loop` | `~/.gemini/config/skills/verification-loop/` | Build verification, type checks, lint checks, diff review |

---

## 3. Available MCP Integrations

- **`roxx-engineering_playwright`**: Browser automation for live visual verification, console audits, screenshots, and viewport testing on `http://localhost:3000`.
- **`roxx-engineering_context7`**: Documentation lookup for current framework and library APIs.
- **`shadcn` / `react-bits` / `spectrum-ui` / `watermelon`**: UI component registries available for reference.

---

## 4. Protected Implementations (Non-Negotiable)

1. **29 Competition Arenas Dataset:**
   - Single source of truth in `src/content/events.jsx`.
   - Never truncate, replace, or fabricate competition items.
   - Maintain exports: `eventmap` (default), `competitionsList`, `getHaloReelItems`, `getCinematicItems`, `getLensSlides`.
2. **Homepage Showcase:**
   - 3D `HaloReel` elliptical rotation card ring.
   - Responsive scaling and mobile title synchronization.
3. **Accommodation Pricing & Logistics:**
   - Verified 21st.dev `Pricing-02` integration with ₹50 Lodging, ₹125 Mess, ₹175 Complete Stay.
   - Conic-gradient rotating border and Lucide Flame `RECOMMENDED` badge.
   - Direct CTA links to `#/register`.
4. **Footer & Wordmark:**
   - Upper editorial columns with BCE Bhagalpur institutional information.
   - Static TECHNORITI '26 logo wordmark in left branding column.
   - Bottom full-width interactive Halftone Wordmark Canvas (`HalftoneWordmarkFooter`).
5. **Authentication Pages:**
   - Interactive `auth-fuse.tsx` with dual Sign In / Sign Up backgrounds.

---

## 5. Verification Commands

Run PowerShell / Windows commands:
```bash
# Production Build Check
npm.cmd run build

# TypeScript Static Type Check
npx.cmd tsc --noEmit

# Trailing Whitespace & Formatting Check
git diff --check

# Git Status Inspection (Confirm no untracked secrets)
git status --short
```

---

## 6. Git Safety Contract

- **NEVER** run `git reset --hard` or `git clean -fd`.
- **NEVER** commit or push to remote repositories unless explicitly authorized by the user.
- Distinguish between checks passed and checks not run in all reports.
