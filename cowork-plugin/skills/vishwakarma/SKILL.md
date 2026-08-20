---
name: vishwakarma
description: >
  Design and engineering intelligence for interfaces on web, Android, and Apple platforms.
  Use when building or reviewing any UI, screen, component, or app; for "make this look
  designed", "does this look good", "review my design", "critique this UI"; for colour,
  OKLCh, palettes, contrast; motion, animation, transitions, springs, gestures, haptics;
  typography, layout, grid, spacing, responsive; accessibility, WCAG, ARIA, TalkBack,
  VoiceOver; design tokens, theming, dark mode; Jetpack Compose, Material 3, SwiftUI,
  iOS HIG, React, CSS; performance, Core Web Vitals, frame budgets, startup time; code
  quality, testing strategy, debugging; and structural analysis of shipped binaries.
  It also governs how the work is approached — resolving ambiguity, measuring baselines,
  making changes checkable, and keeping diffs scoped — so invoke it when implementation
  starts, not only when something needs visual polish.
license: Apache-2.0
metadata:
  version: "1.0.0"
  author: "Yogvid Wankhede and the Vishwakarma project authors"
---

# Vishwakarma

Design intelligence and engineering discipline as one system. The unifying claim is that
**a design decision is only real if it is checkable, and a rule is only useful if it states
its mechanism.** Colour values are computed, not described. Motion timing is derived from
intent, not chosen from a range. Every constraint below names the thing that goes wrong when
it is violated, which is what allows you to correctly override it when that thing does not
apply.

The rules here are stated as constraints so they can be checked. They are not stated as laws.
When a mechanism does not apply to the situation in front of you, override the rule and say
which mechanism you decided was absent.

---

## 1. Working discipline — applies to every invocation

These five govern all work done under this skill, including work that is not visual. They come
first because the characteristic failure of a capable agent is not bad taste, it is **confident
motion in an unverified direction**. Full treatment in `references/engineering-discipline.md`.

**Resolve ambiguity out loud.** When a request admits more than one reasonable reading,
enumerate the readings with an effort estimate and a consequence attached to each, say which
you would pick and why, then wait. The failure is silent selection, not wrong selection. "Make
the search faster" is three different projects — latency, throughput, perceived speed — with
different techniques and different success measures.

**Measure before you change.** State the present number before proposing to improve it:
current contrast ratio, current LCP, current frame time, current bundle size. Without a
baseline "better" is unfalsifiable, so the work has no defined end and a regression is
undetectable.

**Restate the task as a checkable condition.** "Make it accessible" becomes named criteria with
pass thresholds. "Refactor this" becomes "tests pass before and after, public surface
unchanged." If you cannot state what would prove the task complete, you do not yet understand
the task — and that is the finding to report.

**Every changed line traces to the request.** Read your own diff before finishing and remove
anything you cannot justify by pointing at what was asked. Reformatting, added docstrings, and
improved adjacent logic are defects when they ride along with an unrelated change: the reviewer
can no longer separate the risky edit from the cosmetic one.

**Abstraction arrives on the second case.** Extension points, config layers, and optional flags
need a real second caller. An abstraction guessed from one example encodes that example's
accidents as if they were general, and the second real case then does not fit.

Calibrate to the stakes. This discipline biases toward caution and caution has a cost. A typo
fix does not need a costed menu of interpretations.

---

## 2. Platform gate — resolve before choosing any value

Roughly half the constants in this skill are **mutually exclusive between platforms**. A 44pt
touch target is correct on Apple and wrong on Android; a 48dp target is correct on Android and
not the Apple minimum. Rubber-band overscroll is right on iOS and wrong on Android 12+, which
stretches. Answer this question before opening any other reference.

| Target | Load | Governs |
|---|---|---|
| Web / PWA | `references/platform-web.md` | Viewport units, container queries, CWV, `env()` insets, preference queries |
| Android | `references/platform-android.md` | Material 3 tokens, Compose state, insets, 48dp, predictive back |
| iOS / macOS | `references/platform-apple.md` | HIG, Dynamic Type, safe areas, continuous corners, 44pt |
| React Native / Flutter / KMP | Both native files | Where the two disagree, follow the host platform per build |
| Unclear | Ask | Do not average two platforms into a design that is native to neither |

Cross-platform work does not mean picking the midpoint. It means implementing each platform's
convention behind one shared structure. A single 46pt target satisfies neither guideline and
looks imported on both.

---

## 3. The design contract — enforced unless overridden with a reason

**Colour.** Author in OKLCh; hex is an output format, not an authoring format, because it
discards the relationships that make a palette a system. Contrast at least 4.5:1 for body text,
3:1 for large text and for UI components and graphical objects. Colour is never the sole carrier
of meaning.

**Motion.** Every animation names its purpose as exactly one of feedback, spatial consistency,
state indication, preventing a jarring change, explanation, or delight. One that cannot name its
purpose gets deleted. Enters decelerate, exits accelerate, exits are shorter than enters. UI
feedback stays under 300ms — beyond that it stops reading as a response and starts reading as a
wait. Every motion path has a reduced-motion branch, and reduced motion means gentler and fewer,
not zero.

**Type.** Body line length 45–75 characters. Two sizes with a real gap beat five sizes with small
gaps. Text sizing must honour the user's scale setting, which means spacing expressed relative to
the type scale rather than in fixed units, or the layout clips at accessibility sizes.

**Hierarchy.** Rank the content before styling it. Space is the strongest tool for expressing
rank and the most underused; colour is the weakest and the most abused. If everything is
emphasised, nothing is — so when adding emphasis, first check what can be de-emphasised instead.

**Targets.** 44×44pt on Apple, 48×48dp on Android with 8dp separation, 24×24 CSS px minimum on
web. Expand the hit rectangle rather than inflating the glyph.

**States.** Every screen ships loading, empty, error, offline, permission-denied, and success.
A screen with only its success state is a demo.

**Spacing.** A consistent base grid, with values as multiples of it. Uniform gaps are the single
clearest tell of generated UI, because uniformity is the safest local choice at every individual
decision and the sum of a thousand safe local choices is a page with no structure.

---

## 4. Domain routing

Load the file for the branch you are on. Do not read the whole tree.

| Need | Reference |
|---|---|
| Aesthetic judgment, "does this look good", avoiding generated-UI tells | `design-judgment.md` |
| Building a page, screen, or component from scratch | `ui-generation-workflow.md` |
| Critiquing or auditing an existing interface | `design-review.md` |
| Palettes, ramps, contrast, dark theme construction | `colour-systems.md` |
| Timing, easing, Motion Grammar, choreography | `motion-design.md` |
| Springs, gestures, momentum, velocity handoff, rubber-banding | `motion-physics.md` |
| Hover, press, drag, and other small interaction detail | `micro-interactions.md` |
| Type scales, font loading, layout shift from fonts | `typographic-systems.md` |
| Grid, composition, whitespace, overflow | `layout-composition.md` |
| Fluid scales, breakpoints, viewport strategy | `responsive-architecture.md` |
| Elevation, shadow, gradient, depth hierarchy | `surface-and-depth.md` |
| Token architecture and the transformation pipeline | `design-tokens.md` |
| Dark mode, theme switching, flash prevention | `theming-systems.md` |
| ARIA, keyboard, focus, screen readers — the rule catalogue | `accessible-components.md` |
| Grading accessibility findings, audit method, evidence tiers | `accessibility-evidence.md` |
| Loading, empty, error, skeleton — the state inventory | `interface-states.md` |
| Form validation, error recovery, interaction state machines | `interaction-design.md` |
| Labels, error messages, accessible naming | `interface-copy.md` |
| Navigation structure, dashboard hierarchy | `information-architecture.md` |
| Component APIs, compound components, typed variants | `component-architecture.md` |
| Web Vitals, render performance, React render behaviour | `rendering-performance.md` |
| Startup budgets, frame budgets, field gates, size | `mobile-performance.md` |
| Scroll-driven animation, parallax, pinned sequences | `scroll-experiences.md` |
| Metadata, structured data, Open Graph | `seo-and-metadata.md` |
| Linting, static analysis, testing strategy, CI gates | `code-quality.md` |
| Ambiguity, baselines, debugging, diff scope | `engineering-discipline.md` |
| Structural analysis of a shipped binary | `reverse-engineering.md` |
| Browser multiplayer games, real-time sync, join flows | `multiplayer-game-publishing.md` |
| GLB generation, Three.js integration, asset orientation | `3d-game-assets.md` |
| Choosing a public API, probing it, generating a typed client | `public-api-integration.md` |

---

**Games.** This skill owns app UI, including a game's launcher, settings screen and store
page. The simulation beneath a game — engines, the fixed timestep, physics, game feel,
netcode, game AI, production and shipping — belongs to the sibling `vishwakarma-studios`
skill in this same plugin. If the question is what the player reads, it is this skill; if
it is what the simulation does, it is that one.

---

## 5. Workflow

**Frame.** Restate the request as a checkable condition. Name the platform. Name the one thing
on this screen that matters most, and rank everything else against it. If the request is
ambiguous, stop here and present the costed readings.

**Gate.** Before choosing values: which platform's convention governs this element? For any
animation, how often will the user see this? Something seen a hundred times a day should not be
animated at all; something seen once can afford expressive motion. This gate can correctly
return "build nothing", and it does so more often than it is allowed to.

**Build.** Apply the contract in section 3 and the platform file from section 2. Compute colours
rather than describing them. Derive timing from intent rather than picking from a range. Ship the
naive correct version first and generalise on the second real case.

**Verify.** Run section 6. Report what you checked and what you could not check — an unexercised
check must never read as a pass.

---

## 6. Verification

Run these before reporting work complete. A check nobody runs is not a gate.

Scripts live in `scripts/` and are run, not read:

```
python3 scripts/check_contrast.py "#1a1a1a" "#ffffff"     # WCAG ratio + AA/AAA verdict
python3 scripts/check_contrast.py --palette tokens.json    # audit a whole token set
bash    scripts/audit_design.sh <path> --platform android  # hardcoded values, banned patterns
python3 scripts/check_motion.py <path>                     # durations, easings, reduced-motion
```

Each exits non-zero on failure and writes machine-readable results to stdout with human status
on stderr. A clean exit from a script that found nothing to inspect is not a pass — check that
it reported a non-zero count of things examined.

Manual checks that no script replaces:

- Every interactive element reachable and operable by keyboard, in an order that matches the
  visual one, with a visible focus indicator.
- The interface at the smallest supported width and at 200% zoom or the largest accessibility
  text size, without clipping or two-dimensional scrolling.
- Every state rendered, not just success.
- Reduced-motion enabled, with every animation path exercised.
- The real content at real lengths — a card designed around a seven-character title breaks on a
  ninety-character one.

---

## 7. Stop conditions

Report and stop rather than proceeding:

- **Verification fails.** Say so and stop. Do not iterate silently toward a green result.
- **Two stated requirements conflict.** The conflict is the finding. Do not reconcile it silently.
- **Three hypotheses have been disconfirmed.** The model is wrong; a fourth guess from the same
  model is not better than the third. Get a trace, read the source you assumed, or question the
  architecture.
- **The scope is about to widen.** Confirm before editing beyond the obvious target, or before
  more than roughly ten mechanical fixes.
- **Content would have to be invented.** Never fabricate alt text, labels, or link text — an
  invented label passes the automated check while still failing the user, which is worse than an
  open TODO because it removes the signal. Leave the TODO with the criterion.

Hand back rather than perform: store console uploads, release-track promotion, version code
changes, production migrations, force-push to shared branches, and credential rotation. These
are irreversible or externally visible, and the cost of a wrong automated action exceeds the
time saved.

---

## 8. Reference index

Load on the branch you are on; these are not read start to finish.

**Always relevant** — `engineering-discipline.md` governs how any task is approached and is worth
loading whenever the work is non-trivial, regardless of domain.

**Platform layer, load exactly one** — `platform-web.md`, `platform-android.md`,
`platform-apple.md`.

**Design core** — `design-judgment.md`, `colour-systems.md`, `typographic-systems.md`,
`layout-composition.md`, `surface-and-depth.md`, `design-tokens.md`, `theming-systems.md`,
`responsive-architecture.md`, `information-architecture.md`, `component-architecture.md`.

**Motion** — `motion-design.md` for intent and timing, `motion-physics.md` for anything
gesture-driven or spring-based, `micro-interactions.md` for small detail, `scroll-experiences.md`
for scroll-linked work.

**Interaction and content** — `interaction-design.md`, `interface-states.md`, `interface-copy.md`.

**Quality** — `accessible-components.md` for the rule catalogue and `accessibility-evidence.md`
for how to grade and report findings; `rendering-performance.md` and `mobile-performance.md`;
`code-quality.md` for gates and testing shape.

**Workflow** — `ui-generation-workflow.md` when building, `design-review.md` when critiquing.

**Specialist** — `seo-and-metadata.md`, `reverse-engineering.md`,
`multiplayer-game-publishing.md`, `3d-game-assets.md`.
