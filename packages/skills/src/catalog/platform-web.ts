// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * On the web you do not own the runtime, and the characteristic failure is writing as though
 * you did.
 *
 * Viewport size, input modality, network throughput, font availability, colour scheme, motion
 * tolerance and text scale are all negotiated at the moment the page paints, on a machine
 * nobody on the team has seen, by a user who has already made choices the page is obliged to
 * honour. A native app ships its assumptions; a web page discovers them.
 *
 * The practical consequence is that almost every value that would naturally be written as a
 * constant has to be expressed as a rule instead — a range, a clamp, a query, a fallback — and
 * the design work is choosing the rule's boundaries rather than choosing the number. `100vh` is
 * a constant pretending to be a measurement and it clips the call to action under the address
 * bar. A hover-revealed control is a capability assumed rather than queried, and on a
 * touchscreen the first tap only reveals it. A `clamp()` whose preferred term is pure `vw` is a
 * ramp that ignores page zoom, which is the exact failure WCAG 1.4.4 exists to prevent.
 *
 * Each of these looks correct on the machine it was written on. That is why they need to be
 * checkable rules with stated mechanisms rather than taste, and why this skill pairs every
 * constraint with the thing that concretely breaks when it is violated.
 */
export const platformWeb: SkillManifest = {
  vsm: '1.0',
  id: 'platform-web',
  name: 'Web Platform',
  description:
    'Use when building or reviewing web UI or a PWA — viewport units, container queries, Core Web Vitals, fonts, theming, and semantics.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'foundation',
  tags: ['web', 'css', 'core-web-vitals', 'responsive', 'html'],

  activation: {
    intents: [
      'building or reviewing a page, layout, or component in HTML and CSS',
      'a full-height section is clipped by mobile browser chrome, or content sits under a notch',
      'a component needs different internal layouts in different slots on the same page',
      'writing a fluid type or spacing scale, or checking a layout at 200% browser zoom',
      'loading webfonts, or chasing layout shift and a slow largest contentful paint',
      'diagnosing LCP, INP, or CLS against field data rather than a lab run',
      'implementing dark mode, theme switching, or a colour system in OKLCh',
      'handling reduced motion, reduced transparency, increased contrast, or forced colours',
      'building dialogs, menus, tooltips, or custom controls that must stay keyboard-accessible',
    ],
    globs: [
      '**/*.css',
      '**/*.scss',
      '**/*.html',
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/*.astro',
    ],
    keywords: [
      'css',
      'dvh',
      'container query',
      'clamp',
      'core web vitals',
      'lcp',
      'inp',
      'cls',
      'font-display',
      'prefers-reduced-motion',
      'oklch',
      'focus-visible',
      'safe-area-inset',
      'dialog',
    ],
  },

  content: {
    summary:
      'Use when writing or auditing web UI: express viewport, input, preference, and performance assumptions as rules the runtime can negotiate — dynamic viewport units, container queries, clamp with a rem term, field-measured vitals, and native semantics.',

    body: `# Platform: Web

The web's defining constraint is that you do not own the runtime. Viewport size, input modality,
throughput, font availability, colour scheme, motion tolerance and text scale are all negotiated
at the moment your page paints, by a user who has already made choices you must honour. Almost
every value you would write as a constant therefore has to become a rule — a range, a clamp, a
query, a fallback — and the design work is choosing its boundaries rather than the number.

---

## 1. Viewport units and safe areas

\`100vh\` resolves against the **large viewport**, the layout as it would be with the URL bar
retracted, so at rest a \`100vh\` hero is taller than the space available and its bottom edge —
usually the primary call to action — sits below the fold. Use \`100dvh\` for a shell that follows
the chrome, \`100svh\` for anything reachable before any scroll, and \`100lvh\` for decorative
backdrops where an over-tall element is harmless but a gap is not.

\`env(safe-area-inset-*)\` reports \`0px\` until \`viewport-fit=cover\` is in the viewport meta
tag, which is why applying the insets often appears to do nothing: the browser already lays out
inside the safe area. Treat the two as one unit — adding \`viewport-fit=cover\` accepts
responsibility for every edge. Insets add to your own spacing rather than replacing it
(\`calc(1rem + env(safe-area-inset-bottom))\`), since an inset-only bar is flush against the glass
where the inset is zero.

## 2. Input modality

\`:hover\` on a touchscreen is emulated: a tap fires it and it stays applied until the user taps
elsewhere, so a hover-revealed control appears only after a first tap that does nothing else, and
a hover-only control is unreachable outright. Gate on capability, not width:
\`@media (hover: hover) and (pointer: fine)\` — both conditions, since the first alone matches a
hovering stylus and the second a precise pointer that cannot hover. Outside the query everything
must stay usable, with targets at least 44 by 44 CSS pixels. Use \`:focus-visible\`, not
\`:focus\`, which also matches a mouse click and rings something the user just clicked — the
reason teams removed outlines and broke keyboard navigation.

## 3. Container queries

A media query asks how big the window is; a component almost never cares. A card in a three-column
grid, a sidebar, and a feature slot needs three internal layouts at one viewport width, so a window
breakpoint is really a claim about where the component is mounted, and portability ends when
someone mounts it elsewhere. Give the slot \`container-type: inline-size\` and query it — one axis
contained, so height still follows content.

## 4. Fluid scales and the zoom trap

\`clamp(min, preferred, max)\` replaces a staircase of breakpoints with a ramp, and the design work
is the preferred term — a line through \`v1\` at \`w1\` and \`v2\` at \`w2\`, expressed as
\`calc(<intercept>rem + <slope × 100>vw)\`. **The intercept must be a \`rem\` term.** Zoom scales the root font size and therefore \`rem\`,
but \`vw\` is a fraction of the viewport and does not grow proportionally, so a pure \`vw\`
preferred term barely responds to zoom — at 200% the user gets a wider layout at the same visual
text size, exactly the failure WCAG 1.4.4 exists to prevent. Keep each step's max-to-min ratio at
roughly 1.6 or below, or a heading ends up smaller than its subheading at some width.

## 5. Font loading

Layout shift from webfonts comes from the **metric mismatch** between fallback and webfont, not
from the swap: different advance widths reflow line breaks and different ascent and descent change
the line box height, so every block below moves. Make the fallback occupy the same space, with
\`size-adjust\`, \`ascent-override\` and \`descent-override\` on a fallback \`@font-face\` over a
local family. Use \`font-display: swap\` for brand-critical faces and \`optional\` where absence is
acceptable, since \`optional\` has no swap window and therefore zero shift. Preload exactly one
face, with \`crossorigin\` — required even same-origin, since fonts fetch in CORS mode.

## 6. Core Web Vitals

LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, at the **75th percentile of real sessions** over 28 days,
which is why lab numbers mislead: a dev machine sits near the 5th. LCP is almost always a hero image discovered late or a heading blocked on a font —
mark it \`fetchpriority="high"\`, never \`loading="lazy"\`, and put it in the initial HTML. INP is
a long main-thread task during interaction; yield at \`scheduler.yield()\` boundaries so the
browser paints the response first. CLS is unsized media, late-injected content, and font swaps,
excluding shift within 500ms of an interaction.

## 7. Rendering discipline

Changing \`width\`, \`top\` or \`margin\` invalidates layout and re-runs the pipeline for the
subtree, while \`transform\` and \`opacity\` on a composited element touch only the last stage,
which is why they are the only two safe to animate at 60fps. \`content-visibility: auto\` turns O(n) layout into roughly O(visible), but without
\`contain-intrinsic-size\` skipped elements contribute zero height and the scrollbar jumps, and
\`will-change\` spread across 200 cards exhausts the GPU budget until the browser refuses
promotions.

## 8. Colour and theming

Author in **OKLCh**, where \`L\` is perceived lightness: in \`hsl()\`, holding lightness constant
and rotating hue changes perceived brightness wildly, so an HSL palette cannot hold contrast
constant across hues. Give an sRGB fallback ahead of an \`@supports\` upgrade, and declare
\`color-scheme: light dark\` so the browser themes native controls.

Theme flash has one cause: the first paint used a theme later corrected. Any resolution in an
effect, after hydration, or in a deferred script is by definition after first paint. Set the theme
attribute in a synchronous inline \`<head>\` script, wrapped in \`try/catch\`, and set
\`color-scheme\` there too.

## 9. Preference queries

Each reports a setting the user has already made, so an unhandled branch is an ignored
instruction. \`prefers-reduced-motion\` means removing large-area movement,
parallax and scaling while keeping opacity and colour transitions under about 150ms — written as
an explicit rule, not \`animation: none !important\`, which breaks components relying on
\`animationend\`. \`prefers-reduced-transparency\` replaces \`backdrop-filter\` panels
with solid backgrounds. \`forced-colors: active\` drops your palette and background images on interactive elements, so
express boundaries with real \`border\` declarations — a shadow-only separator vanishes.

## 10. Semantic HTML

A native \`<button>\` arrives with four behaviours: tab order without \`tabindex\`, activation on
Enter and Space, the \`button\` role, and state in the accessibility tree. A \`<div role="button">\`
has one of them, and every native behaviour you discard is a defect you have not found yet.
Landmarks give a jump menu no visual layout provides, with exactly one \`<main>\`; headings descend
without skipping levels, because that is how non-visual users scan; every control needs a real
\`<label>\`, and a placeholder is not one. \`<dialog>\` with \`showModal()\` and the Popover API
promote to the **top layer**, escaping the stacking contexts that trap a hand-rolled dropdown.

## 11. Progressive enhancement

\`@supports\` tests parseability, not correctness, so test the risky declaration itself. The
dividing line is decorative versus structural: a missing view transition costs an animation, a
missing container query costs a layout. Write the base layer complete and usable, then add the
enhancement. Scroll-driven animation needs care because an unhonoured \`animation-timeline\` does
not do nothing — it falls back to the document timeline and plays at once, so an element meant to
fade in on scroll arrives already faded in.`,

    references: [
      {
        id: 'viewport-input-and-responsive-css',
        title: 'Viewport units, safe areas, input modality, container queries, and fluid scales',
        answers:
          'How do I size full-height elements against collapsing browser chrome, draw safely under a notch, gate hover and focus affordances by capability, make components respond to their slot, and build a fluid scale that still honours page zoom?',
        content: `# Viewport units, safe areas, input modality, container queries, and fluid scales

## 1. Viewport units and the collapsing browser chrome

\`100vh\` on a mobile browser does not mean "the height of the visible area". It resolves against
the **large viewport** — the layout as it would be with the URL bar and toolbar retracted. At
rest, before any scroll, that chrome is visible, so a \`height: 100vh\` hero is taller than the
space available and its bottom edge, usually where the primary call to action lives, is pushed
below the fold: a button half-eaten by the address bar. The mechanism is that the URL bar hides
and reveals in response to scroll direction and \`vh\` deliberately does not track it, because if
it did, every scroll would resize every \`vh\`-sized element and force a layout pass mid-gesture —
jitter worse than the clipping.

The viewport unit family exists precisely to let you pick which behaviour you want:

| Unit | Resolves against | Use when |
|---|---|---|
| \`svh\` | Small viewport — chrome fully visible | An element must fit entirely on screen before any scroll |
| \`lvh\` | Large viewport — chrome fully retracted | A background layer must cover the screen in the retracted state without a seam |
| \`dvh\` | Dynamic — current state, updates live | The element should track the chrome as it moves |
| \`vh\` | Large viewport (legacy alias of \`lvh\`) | Effectively never, on layouts that matter on mobile |

Use \`100dvh\` for a full-height app shell so the layout follows the chrome, \`100svh\` for
anything that must be reachable at rest, and \`100lvh\` for decorative full-bleed backdrops where
an over-tall element is harmless but a gap is not. \`dvh\` re-lays-out on every chrome transition,
so avoid it on containers holding expensive subtrees; \`min-height: 100svh\` on the content plus
\`100lvh\` on a fixed background layer gets the same visual result with no reflow. The same
reasoning applies horizontally with \`dvw\`/\`svw\`/\`lvw\`.

## 2. Safe areas, and why the fix usually does nothing

Notches, punch-holes, rounded display corners and the home indicator carve inaccessible regions
out of a rectangular viewport. The browser exposes them as four environment variables —
\`env(safe-area-inset-top)\`, \`-right\`, \`-bottom\`, \`-left\` — usable anywhere a length is
valid, with a fallback as the second argument:
\`padding-bottom: env(safe-area-inset-bottom, 0px)\`.

The pattern that fails is applying those insets and seeing no change at all, because by default
the browser already lays out inside the safe area, so every inset reports \`0px\`. The variables
carry real values only once you have opted into drawing under the chrome:

\`\`\`html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
\`\`\`

Without \`viewport-fit=cover\` in the viewport meta tag, \`env()\` is not broken — it is correctly
reporting that there is nothing to inset around. Treat these two as a single unit: the day you add
\`viewport-fit=cover\` you accept responsibility for every edge, and a fixed bottom bar with no
\`padding-bottom: env(safe-area-inset-bottom)\` sits underneath the home indicator. Insets add to
your own spacing rather than replacing it —
\`padding-bottom: calc(1rem + env(safe-area-inset-bottom))\` — because a bar padded with only the
inset touches the screen edge on devices where the inset is \`0px\`.

## 3. Input modality: hover is a capability, not a default

\`:hover\` on a touchscreen is emulated. A tap fires the hover state and the browser leaves it
applied until the user taps elsewhere, because there is no pointer to move away. Two failures
follow. A control revealed on hover — a delete button that appears when a card is hovered —
appears only after the first tap, so that tap does nothing except reveal the control the user was
trying to press. A control that exists only on hover is unreachable outright: no touchscreen
gesture produces hover without also producing a click.

Gate hover-dependent affordances on capability rather than width. Screen size is a bad proxy — a
1080p touchscreen kiosk and a 12.9-inch tablet are both wide and touch-first, a small laptop
narrow and mouse-driven:

\`\`\`css
@media (hover: hover) and (pointer: fine) {
  .card__actions { opacity: 0; transition: opacity 120ms ease-out; }
  .card:hover .card__actions, .card:focus-within .card__actions { opacity: 1; }
}
\`\`\`

Both conditions matter: \`hover: hover\` alone is true for a stylus with hover detection,
\`pointer: fine\` alone for a precise pointer that cannot hover. The corollary is that the state
outside the query must be fully usable — actions visible, hit targets at least 44 by 44 CSS
pixels, nothing conveyed by hover alone.

For focus rings, use \`:focus-visible\` rather than \`:focus\`. Both match a focused control, but
\`:focus\` also matches a mouse click, painting a ring around something the user just clicked and
can already see — the reason so many teams removed focus outlines entirely and broke keyboard
navigation. \`:focus-visible\` defers to the browser's heuristic. Style it explicitly —
\`outline: 2px solid currentColor; outline-offset: 2px\` — so the ring survives on light and dark
surfaces, and pair any \`outline: none\` with a replacement indicator in the same rule.

## 4. Container queries: components should respond to their slot

A media query asks how big the window is. A component almost never cares. A product card placed in
a three-column grid, in a narrow sidebar, and in a full-width feature slot needs three different
internal layouts on the same viewport at the same moment — so any breakpoint written against the
window is really a claim about where the component is mounted, and portability ends the instant
somebody mounts it elsewhere. The symptom is a card that looks right on the listing page and broken
in the sidebar, patched with a \`.sidebar .card\` override, then broken again in the next slot.

Query the container instead: the parent establishes containment on its inline axis, and the child
asks about the space it was actually given.

\`\`\`css
.card-slot { container-type: inline-size; container-name: card; }
.card { display: grid; gap: 0.75rem; }

@container card (min-width: 28rem) {
  .card { grid-template-columns: 12rem 1fr; align-items: start; }
}
\`\`\`

\`container-type: inline-size\` contains size on the inline axis only, so the container's height
still follows its content — this is why it is the right default, and why \`container-type: size\`,
which requires height to be independent of children, collapses content-sized layouts. A container
also cannot query itself: the query styles descendants, so container and styled element are always
different elements.

Container query units (\`cqi\`, \`cqb\`, \`cqw\`, \`cqh\`, \`cqmin\`, \`cqmax\`) resolve against
the nearest query container, making intrinsic proportional sizing possible — \`padding: 4cqi\`
scales a card's padding to the card's own width. Media queries remain correct for page-level
decisions: the global navigation shell, print styles, and the preference queries, which describe
the user rather than the layout.

## 5. Fluid scales with clamp, and the zoom trap

A fluid type or space scale interpolates between a floor and a ceiling as the viewport changes,
replacing a staircase of breakpoints with a continuous ramp. \`clamp(min, preferred, max)\` returns
the preferred value constrained to the range, and the design work is entirely in the preferred
term — a line through two points, value \`v1\` at viewport \`w1\` and value \`v2\` at viewport
\`w2\`:

\`\`\`
slope = (v2 - v1) / (w2 - w1);  intercept = v1 - slope * w1
preferred = calc( <intercept>rem + <slope * 100>vw )
\`\`\`

For 1rem at 320px growing to 1.5rem at 1280px on a 16px root, the slope is \`0.5rem / 960px\`,
giving \`calc(0.833rem + 0.52vw)\` and the token \`clamp(1rem, 0.833rem + 0.52vw, 1.5rem)\`.

The intercept must be a \`rem\` component, and this is not stylistic. Page zoom scales the computed
value of \`rem\` because it scales the root font size, but \`vw\` is a fraction of the viewport and
zoom does not increase it proportionally. A preferred term of pure \`vw\` —
\`clamp(1rem, 2.5vw, 1.5rem)\` — therefore produces text that barely responds to zoom: at 200% the
user gets a wider effective layout and the same visual text size, which is precisely the failure
WCAG 1.4.4 exists to prevent. With a \`rem\` component present, zoom lifts the intercept and the
whole ramp with it. A fluid scale whose preferred term contains no \`rem\` or \`em\` unit is wrong
however good the ramp looks at 100%.

Two further constraints. Keep the max-to-min ratio of any single step modest — roughly 1.6 or
below — because a step that grows faster than its neighbours inverts the hierarchy at some viewport
width and a heading ends up smaller than the subheading beneath it. And set the minimum to a value
that is comfortable at 320px rather than the smallest that still renders; body text below \`1rem\`
at the floor is a legibility decision disguised as a layout decision.

## Pass conditions

### Viewport, input and responsiveness

- Does any full-height element use \`100vh\` rather than \`100dvh\` or \`100svh\`?
- Is \`viewport-fit=cover\` present wherever \`env(safe-area-inset-*)\` is used, and does every inset carry a fallback and add to intrinsic padding rather than replacing it?
- Is every hover-revealed or hover-only affordance wrapped in \`@media (hover: hover) and (pointer: fine)\`, with the state outside that query fully usable and all hit targets at least 44 by 44 CSS pixels?
- Are focus rings styled with \`:focus-visible\` and a visible \`outline-offset\`, with no \`outline: none\` left without a replacement indicator?
- Do component-level layout switches use \`@container\` with \`container-type: inline-size\` rather than viewport media queries?
- Does every \`clamp()\` preferred term include a \`rem\` or \`em\` component, and is each step's max-to-min ratio at or below roughly 1.6?
- Does hierarchy hold at both 320px and 1920px, and does the layout remain usable at 200% browser zoom?`,
      },
      {
        id: 'fonts-vitals-and-rendering',
        title: 'Font loading, Core Web Vitals, and rendering discipline',
        answers:
          'How do I load webfonts without layout shift, design toward LCP, INP and CLS thresholds rather than measuring them afterwards, and animate without dropping frames?',
        content: `# Font loading, Core Web Vitals, and rendering discipline

## 1. Font loading, metric matching and layout stability

Layout shift from webfonts is not caused by the swap itself but by the **metric mismatch** between
fallback and webfont: different advance widths reflow the line breaks, and different ascent,
descent and line-gap values change the line box height, so every block below moves. The fix is not
to hide the text longer — it is to make the fallback occupy the same space. \`font-display\`
chooses the failure mode during the block and swap periods:

| Value | Block | Swap | Result |
|---|---|---|---|
| \`block\` | ~3s | infinite | Invisible text for up to 3s — a blank LCP element |
| \`swap\` | ~0ms | infinite | Fallback paints immediately, swaps whenever the font arrives |
| \`fallback\` | ~100ms | ~3s | Brief block, then fallback wins permanently after 3s |
| \`optional\` | ~100ms | 0ms | Font used only if ready almost immediately; otherwise fallback for the whole load, zero shift |

Use \`swap\` with metric-matched fallbacks for brand-critical faces, and \`optional\` for faces
whose absence is acceptable — it guarantees zero shift because there is no swap window at all, at
the cost of some users seeing the fallback for their whole first visit (the font is cached for the
next navigation). Metric matching is done with descriptors on a fallback \`@font-face\` pointing at
a local system family:

\`\`\`css
@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}
:root { --font-sans: "Inter", "Inter Fallback", system-ui, sans-serif; }
\`\`\`

\`size-adjust\` scales the glyph outlines so average advance width matches, fixing reflow;
\`ascent-override\` and \`descent-override\` fix the line box height, fixing vertical displacement.
Derive the percentages from the two faces' \`unitsPerEm\`, \`ascender\`, \`descender\` and average
character width rather than by eye.

Preload the single face that renders the largest above-the-fold text, and only that one:
\`<link rel="preload" as="font" type="font/woff2" href="/f/inter-var.woff2" crossorigin>\`. The
\`crossorigin\` attribute is required even for same-origin fonts, because fonts are fetched in CORS
mode — omitting it causes a second, duplicate fetch, so the preload makes the page slower.
Preloading four faces is worse than preloading none: they compete with the LCP image for the same
connection during the critical phase. Subset to the scripts used, ship \`woff2\` only, and prefer
one variable face to four static weights.

## 2. Core Web Vitals as design constraints

The three field metrics are thresholds you design toward, not measurements you take afterwards:

| Metric | Good | Meaning |
|---|---|---|
| **LCP** | ≤ 2.5s | Render time of the largest text block or image in the initial viewport |
| **INP** | ≤ 200ms | Worst-case (near-worst) latency from interaction to next paint across the visit |
| **CLS** | ≤ 0.1 | Sum of the largest burst of unexpected layout shift scores |

All three are assessed at the **75th percentile of real user sessions** over a rolling 28-day
window. That percentile is the whole reason lab numbers mislead: a development machine on a fast
connection with a warm cache sits near the 5th percentile, so passing locally says nothing about
the quarter of users who determine the grade. Throttle to a mid-tier device profile and a slow 4G
connection for any lab run meant to predict the field, and treat field data as authoritative when
the two disagree.

The causes are stable enough to check by inspection. **LCP** is almost always the hero image or a
heading rendered in a webfont: the image because it was discovered late (lazy-loaded above the
fold, injected by JavaScript, or hidden inside a client-side carousel), the heading because a
blocking font delayed its paint. Mark the LCP image \`fetchpriority="high"\`, never
\`loading="lazy"\`, and put it in the initial HTML rather than inserting it after hydration.
**INP** is a long main-thread task during interaction — hydration, a large re-render, an expensive
input handler — and the fix is to yield: break work at \`await scheduler.yield()\` or
\`setTimeout\` boundaries so the browser paints the visual response before the work finishes.
Acknowledge first, compute second. **CLS** is unsized media, content injected above content that
has already painted (cookie banners, promo bars, late ads), and font swaps; give every image and
video an explicit \`width\` and \`height\` or \`aspect-ratio\`, and reserve space with
\`min-height\` for anything arriving later. Shift within 500ms of a user interaction is excluded,
which is why an accordion pushing content down is fine and a banner doing the same on a timer is
not.

## 3. Rendering discipline

The browser's frame pipeline runs style, layout, paint and composite. Changing a geometric property
— \`width\`, \`top\`, \`margin\` — invalidates layout and forces the full pipeline for the affected
subtree, while changing \`transform\` or \`opacity\` on a composited element touches only the last
stage, which is why those two are the only properties safe to animate at 60fps and above.
Animating \`left\` from \`0\` to \`200px\` looks identical to \`transform: translateX(200px)\` on a
fast machine and drops frames on a slow one, because the first re-runs layout every frame and the
second does not.

CSS animations and transitions, and the Web Animations API, run on the compositor thread when they
affect only composited properties. This matters most when things are going badly: a long
JavaScript task blocks the main thread, so a \`requestAnimationFrame\` loop freezes while a CSS
transition of the same motion continues smoothly. Prefer declarative animation for anything the
user watches during load or route transitions.

\`content-visibility: auto\` skips rendering work for elements outside the viewport, removing their
layout and paint cost from the frame and turning an O(n) layout into roughly O(visible) on a long
list. Pair it with \`contain-intrinsic-size\` carrying the element's estimated dimensions — without
that, skipped elements contribute zero height and the scrollbar jumps as the user scrolls into
them.

\`will-change\` promotes an element to its own compositor layer ahead of time, at the cost of GPU
memory held for as long as the declaration applies. Applied broadly —
\`.card { will-change: transform }\` on a grid of 200 cards — it exhausts the budget, and the
browser starts refusing promotions or evicting layers, making the page slower than if you had never
used it. Apply it shortly before the animation starts, remove it on completion, and prefer letting
the browser promote on its own, as it does for running compositor animations.

## Pass conditions

### Fonts, rendering and field performance

- Is exactly one font face preloaded, with \`crossorigin\` present, and does every \`@font-face\` declare \`font-display: swap\` or \`optional\`?
- Does each webfont family have a metric-matched fallback with \`size-adjust\` and \`ascent-override\`?
- Are LCP ≤ 2.5s, INP ≤ 200ms and CLS ≤ 0.1 met at P75 in field data rather than only in a lab run?
- Is the LCP element in the initial HTML, marked \`fetchpriority="high"\` and not \`loading="lazy"\`, and do all images and video carry explicit dimensions or \`aspect-ratio\`?
- Do all animations affect only \`transform\` and \`opacity\`, is \`will-change\` scoped and removed after use, and do long lists pair \`content-visibility: auto\` with \`contain-intrinsic-size\`?`,
      },
      {
        id: 'colour-preferences-and-semantics',
        title:
          'OKLCh colour and theming, preference queries, semantic HTML, and progressive enhancement',
        answers:
          'How do I define a colour system that holds contrast across hues, switch themes without a flash, honour the operating-system preference settings, and build markup and modern-CSS enhancements that degrade correctly?',
        content: `# OKLCh colour and theming, preference queries, semantic HTML, and progressive enhancement

## 1. Colour and theming

Define colour in **OKLCh**, a perceptually uniform space where \`L\` is perceived lightness, \`C\`
is chroma and \`H\` is hue angle. Uniformity is the point: in \`hsl()\`, holding lightness constant
and rotating hue produces wildly different perceived brightness — yellow at \`hsl(60 100% 50%)\` is
far lighter than blue at \`hsl(240 100% 50%)\` — so an HSL palette cannot hold contrast constant
across hues. In OKLCh, constant \`L\` means constant perceived lightness, which is what makes a
systematic ramp possible and contrast predictable before you measure it. OKLCh also reaches colours
outside sRGB on wide-gamut displays, so give an sRGB fallback first and upgrade inside a feature
query:

\`\`\`css
:root { --accent: #3b5bdb; }
@supports (color: oklch(0.5 0.1 250)) {
  :root { --accent: oklch(0.55 0.17 262); }
}
\`\`\`

Declare \`color-scheme: light dark\` on \`:root\` so the browser themes form controls, scrollbars,
spell-check underlines and the default canvas — without it, a dark page keeps light scrollbars and
white-backed selects. Read the preference with \`prefers-color-scheme\` and hold resolved values in
CSS custom properties, so a theme is a change of variable values on one element rather than a
parallel set of component rules.

Theme flash has exactly one cause: the first paint used a theme that was later corrected. Any
resolution that happens in a framework effect, after hydration, or in a deferred script is by
definition after first paint, so the user sees white then dark. The fix is to set the theme class
or \`data-theme\` attribute **before** the browser paints, with a small synchronous inline script
in \`<head>\`, which runs before body content is parsed so no incorrect frame is ever composited:

\`\`\`html
<script>
  try {
    const t = localStorage.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
    document.documentElement.style.colorScheme = t;
  } catch {}
</script>
\`\`\`

This is the one place where a render-blocking script is correct; keep it under about 1KB, wrap it
in \`try/catch\` because \`localStorage\` throws in some privacy modes, and set \`color-scheme\` in
the same script so native controls match from the first frame too.

## 2. User preference queries

Each of these reports a setting the user has already made at the operating system level, so an
unhandled branch is not a missing feature — it is an ignored instruction.

\`prefers-reduced-motion: reduce\` is set by people for whom vestibular motion causes nausea or
migraine. The correct response is not to remove all animation, which destroys the continuity cues
that make an interface legible, but to remove **large-area movement, parallax and scaling** while
keeping opacity and colour transitions under about 150ms. Write the reduced branch as an explicit
rule rather than a global \`animation: none !important\`, which breaks components relying on an
\`animationend\` event to clean up.

\`prefers-reduced-transparency: reduce\` asks for opaque surfaces; replace
\`backdrop-filter: blur()\` panels with a solid background, which also removes their real rendering
cost. \`prefers-contrast: more\` asks for stronger separation: raise text contrast toward 7:1 and
make borders explicit rather than implied by a subtle shadow. \`forced-colors: active\` means the
operating system has substituted its own palette — your colours are overridden and background
images on interactive elements are dropped — so use \`forced-color-adjust\` sparingly and express
boundaries with real \`border\` declarations, since a shadow-only separator vanishes entirely.

## 3. Semantic HTML as the accessibility substrate

A native \`<button>\` arrives with four behaviours implemented: it is in the tab order without
\`tabindex\`, it activates on both Enter and Space, it exposes the \`button\` role to assistive
technology, and it reports disabled and pressed state through the accessibility tree. A
\`<div role="button">\` has one of those — the role — and you must rebuild the other three. In
practice teams add \`tabindex="0"\` and a click handler, ship it, then discover months later that
Space scrolls the page instead of activating the control. Custom elements are not forbidden; the
point is that every native behaviour you discard is a defect you have not found yet.

The same logic covers the rest of the substrate. Landmarks — \`<header>\`, \`<nav>\`, \`<main>\`,
\`<aside>\`, \`<footer>\` — give screen reader users a jump menu that no visual layout provides;
exactly one \`<main>\` per page. Headings must descend without skipping levels, because heading
navigation is how non-visual users scan, and a jump from \`<h2>\` to \`<h4>\` reads as a missing
section. Every form control needs a programmatic label — \`<label for>\` pointing at the control's
\`id\`, or a wrapping \`<label>\`. Placeholder text is not one: it vanishes on focus, usually fails
contrast, and is not reliably announced.

\`<dialog>\` with \`showModal()\` gives focus trapping, inert background content, Escape-to-close
and the \`::backdrop\` pseudo-element with no JavaScript. The Popover API (\`popover\` plus
\`popovertarget\`) gives light-dismiss, top-layer stacking and focus management for non-modal
surfaces such as menus and tooltips. Both promote the element to the **top layer**, which is why
they escape the \`overflow: hidden\` and \`z-index\` stacking contexts that trap a hand-rolled
dropdown inside a scrolling panel.

## 4. Progressive enhancement of modern CSS

\`@supports\` tests a declaration's parseability, not its correctness, so it is reliable for
property/value support and useless for judging whether a feature is well implemented. Test the
risky declaration itself, never a proxy for it.

| Feature | Fallback needed? | Degradation without it |
|---|---|---|
| \`:has()\` | No | Selector does not match; base styles apply, layout stays valid |
| \`@container\` | Yes, for load-bearing layout | All container rules ignored; component renders at its base layout |
| \`@starting-style\`, View Transitions | No | Element appears or navigation happens without the transition |
| Scroll-driven animations (\`animation-timeline\`) | Yes, if state depends on it | Animation runs on the document timeline and plays once immediately |
| Anchor positioning (\`anchor-name\`, \`position-anchor\`) | Yes | Positioned element falls back to its containing block, often the wrong place |
| \`subgrid\` | Yes, for alignment-critical grids | Nested grid gets its own tracks; columns stop lining up |

The dividing line is decorative versus structural: a missing view transition costs an animation, a
missing container query costs a layout. Write the base layer complete and usable on its own, then
add the enhancement — the reverse order produces a base layer that was never tested and appears
only on the browsers you did not check. Scroll-driven animations deserve particular care because
the failure is not "nothing happens": an unhonoured \`animation-timeline: view()\` falls back to
the document timeline and plays at once on load, so an element meant to fade in on scroll is
already faded in.

## Pass conditions

### Colour, theming and preferences

- Are colours defined in OKLCh with an sRGB fallback ahead of an \`@supports\` upgrade?
- Does the theme resolve in a synchronous inline \`<head>\` script before first paint, wrapped in \`try/catch\`, and does it set \`color-scheme\` alongside the theme attribute?
- Does each of \`prefers-reduced-motion\`, \`prefers-reduced-transparency\`, \`prefers-contrast\`, \`prefers-color-scheme\` and \`forced-colors\` have a handled branch?

### Markup and enhancement

- Are all interactive controls native elements, or do custom controls implement focusability, keyboard activation, role and state?
- Is there exactly one \`<main>\`, a labelled \`<nav>\` per navigation region, a heading order with no skipped levels, and a real \`<label>\` on every form control?
- Are modal and overlay surfaces built on \`<dialog>\` with \`showModal()\` or the Popover API rather than hand-rolled overlays?
- Is every structural modern-CSS feature — container queries, scroll-driven animations, anchor positioning, subgrid — behind \`@supports\` with a usable base layer?`,
      },
    ],
  },

  rules: [
    {
      id: 'platform-web/dynamic-viewport-units',
      strength: 'must-not',
      statement:
        'Do not size full-height elements with 100vh; use 100dvh for chrome-tracking shells, 100svh for anything that must be reachable at rest, and 100lvh for decorative backdrops.',
      evidence: {
        rationale:
          'vh resolves against the large viewport — the layout as it would be with the URL bar retracted — so before any scroll a 100vh element is taller than the space available and its bottom edge, usually the primary call to action, sits below the fold. It behaves this way deliberately: tracking the chrome would resize every vh-sized element mid-gesture.',
        source: 'CSS Values and Units Level 4, viewport-relative lengths',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/length',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.hero { height: 100vh; }',
        good: '.hero { min-height: 100svh; }',
      },
      verifiedBy: 'viewport-and-input-review',
    },
    {
      id: 'platform-web/viewport-fit-with-env',
      strength: 'must',
      statement:
        'Set viewport-fit=cover whenever env(safe-area-inset-*) is used, give each inset a fallback, and add it to intrinsic padding rather than replacing it.',
      evidence: {
        rationale:
          'By default the browser lays out inside the safe area, so every env() inset reports 0px and applying them appears to do nothing — the variables carry real values only once the page opts into drawing under the chrome. The reverse is equally true: once viewport-fit=cover is set, a fixed bottom bar without a bottom inset sits under the home indicator. Adding rather than replacing matters because the inset is 0px on devices without one, so an inset-only bar is flush against the glass there.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.bottom-bar { padding-bottom: env(safe-area-inset-bottom); }',
        good: '.bottom-bar { padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px)); }',
      },
      verifiedBy: 'viewport-and-input-review',
    },
    {
      id: 'platform-web/hover-capability-gate',
      strength: 'must',
      statement:
        'Wrap hover-revealed and hover-only affordances in @media (hover: hover) and (pointer: fine), keeping the state outside that query fully usable.',
      evidence: {
        rationale:
          'Touch browsers synthesise hover on tap and leave it applied until the next tap elsewhere, so a control revealed on hover appears only after a first tap that does nothing else, and a control existing only on hover is unreachable — no touchscreen gesture produces hover without also producing a click. Both conditions are needed because hover: hover alone matches a hovering stylus and pointer: fine alone matches a precise pointer that cannot hover.',
        source: 'CSS Media Queries Level 4, hover and pointer features',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.card__actions { opacity: 0 }\n.card:hover .card__actions { opacity: 1 }',
        good: '@media (hover: hover) and (pointer: fine) {\n  .card__actions { opacity: 0 }\n  .card:hover .card__actions, .card:focus-within .card__actions { opacity: 1 }\n}',
      },
      verifiedBy: 'viewport-and-input-review',
    },
    {
      id: 'platform-web/focus-visible-with-replacement',
      strength: 'must',
      statement:
        'Style focus rings on :focus-visible with an explicit outline and offset, and never leave an outline: none without a replacement indicator in the same rule.',
      evidence: {
        rationale:
          ':focus also matches a mouse click, so it paints a ring around something the user just clicked and can already see — the annoyance that led so many teams to remove outlines entirely and break keyboard navigation. :focus-visible defers to the browser heuristic, which means the ring appears exactly for the users who need it, and an explicit outline-offset is what keeps it legible on both light and dark surfaces.',
        source: 'WCAG 2.2 SC 2.4.7 Focus Visible',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: ':focus { outline: none }',
        good: ':focus-visible { outline: 2px solid currentColor; outline-offset: 2px }',
      },
      verifiedBy: 'viewport-and-input-review',
    },
    {
      id: 'platform-web/container-queries-for-components',
      strength: 'should',
      statement:
        'Switch a component’s internal layout with @container on a container-type: inline-size parent rather than with a viewport media query.',
      evidence: {
        rationale:
          'A breakpoint written against the window is a claim about where the component happens to be mounted, so the same card is correct in a three-column grid and broken in a sidebar at the same viewport width. Inline-size containment is the right default because it constrains only the inline axis, leaving height to follow content; container-type: size requires height to be independent of children and collapses content-sized layouts.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '@media (min-width: 60rem) { .card { grid-template-columns: 12rem 1fr } }',
        good: '.card-slot { container-type: inline-size }\n@container (min-width: 28rem) { .card { grid-template-columns: 12rem 1fr } }',
      },
      verifiedBy: 'viewport-and-input-review',
    },
    {
      id: 'platform-web/clamp-needs-a-rem-term',
      strength: 'must',
      statement:
        'Include a rem or em component in every clamp() preferred term, and keep each step’s max-to-min ratio at roughly 1.6 or below.',
      evidence: {
        rationale:
          'Page zoom scales the root font size and therefore the computed value of rem, but vw is a fraction of the viewport and does not grow proportionally, so a preferred term of pure vw yields text that barely responds to zoom — at 200% the user gets a wider layout at the same visual text size, which is the failure WCAG 1.4.4 exists to prevent. The ratio cap matters because a step growing faster than its neighbours inverts the hierarchy at some width.',
        source: 'WCAG 2.2 SC 1.4.4 Resize Text',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/resize-text',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: 'font-size: clamp(1rem, 2.5vw, 1.5rem);',
        good: 'font-size: clamp(1rem, 0.833rem + 0.52vw, 1.5rem);',
      },
      verifiedBy: 'design-audit',
    },
    {
      id: 'platform-web/metric-matched-font-fallback',
      strength: 'should',
      statement:
        'Give every webfont family a metric-matched fallback using size-adjust and ascent/descent overrides, and preload at most the single face rendering the largest above-the-fold text, with crossorigin.',
      evidence: {
        rationale:
          'Layout shift comes from the metric mismatch, not the swap: different advance widths reflow line breaks and different ascent and descent change the line box height, so every block below moves. crossorigin is required even same-origin because fonts fetch in CORS mode, and omitting it causes a second duplicate fetch that makes the preload a net loss; preloading several faces makes them compete with the LCP image for the same connection during the critical phase.',
        source: 'CSS Fonts Level 5, size-adjust and metric override descriptors',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/size-adjust',
        confidence: 'strong',
      },
      examples: {
        language: 'html',
        bad: '<link rel="preload" as="font" href="/f/inter-400.woff2">\n<link rel="preload" as="font" href="/f/inter-600.woff2">',
        good: '<link rel="preload" as="font" type="font/woff2" href="/f/inter-var.woff2" crossorigin>',
      },
      verifiedBy: 'performance-and-font-review',
    },
    {
      id: 'platform-web/animate-composited-properties-only',
      strength: 'should',
      statement:
        'Animate only transform and opacity, scoping will-change to the moment of the animation and removing it on completion.',
      evidence: {
        rationale:
          'Geometric properties invalidate layout and re-run style, layout, paint and composite for the affected subtree every frame, while transform and opacity on a composited element touch only the last stage. The difference is invisible on a fast machine and drops frames on a slow one, which is where the users are. will-change holds GPU memory for as long as it applies, so a blanket declaration across a large grid exhausts the budget and the browser begins refusing promotions outright.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.panel { transition: left 200ms ease } .panel.open { left: 200px }',
        good: '.panel { transition: transform 200ms ease } .panel.open { transform: translateX(200px) }',
      },
      verifiedBy: 'performance-and-font-review',
    },
    {
      id: 'platform-web/theme-before-first-paint',
      strength: 'must',
      statement:
        'Resolve the theme in a small synchronous inline script in <head>, wrapped in try/catch, setting both the theme attribute and color-scheme.',
      evidence: {
        rationale:
          'Theme flash has exactly one cause: the first painted frame used a theme that was later corrected. Any resolution in a framework effect, after hydration, or in a deferred script is by definition after first paint, so the user sees white then dark. An inline head script runs before body content is parsed, so no incorrect frame is ever composited. The try/catch is needed because localStorage throws in some privacy modes, and color-scheme must be set in the same script or native controls stay light for the first frame.',
        confidence: 'established',
      },
      examples: {
        language: 'ts',
        bad: 'useEffect(() => { document.documentElement.dataset.theme = stored }, [])',
        good: '<script>try{const t=localStorage.theme??(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch{}</script>',
      },
      verifiedBy: 'preferences-and-semantics-review',
    },
    {
      id: 'platform-web/native-interactive-elements',
      strength: 'must',
      statement:
        'Build interactive controls from native elements, and build modal and overlay surfaces on <dialog> with showModal() or the Popover API.',
      evidence: {
        rationale:
          'A native button arrives with tab order, Enter and Space activation, the button role, and disabled and pressed state in the accessibility tree; a div with role="button" supplies one of those and the other three must be rebuilt, which is how a control ships where Space scrolls the page instead of activating it. dialog and popover additionally promote to the top layer, which is what lets them escape the overflow: hidden and z-index stacking contexts that trap a hand-rolled dropdown inside a scrolling panel.',
        source: 'HTML Living Standard, the dialog element',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<div role="button" tabindex="0" onclick="save()">Save</div>',
        good: '<button type="button" onclick="save()">Save</button>',
      },
      verifiedBy: 'preferences-and-semantics-review',
    },
  ],

  verification: [
    {
      id: 'viewport-and-input-review',
      kind: 'self-review',
      description:
        'Confirm the layout negotiates viewport, insets, and input modality rather than assuming them.',
      blocking: true,
      questions: [
        'Does any full-height element use 100vh rather than 100dvh or 100svh, and is viewport-fit=cover present wherever env(safe-area-inset-*) is used?',
        'Is every hover-revealed affordance gated on (hover: hover) and (pointer: fine), and is the state outside that query fully usable with 44 by 44 CSS pixel targets?',
        'Are focus rings on :focus-visible with a visible outline-offset, and does any outline: none lack a replacement in the same rule?',
        'Do component-level layout switches use @container on an inline-size container rather than a viewport media query?',
        'Does hierarchy hold at both 320px and 1920px, and does the layout stay usable at 200% browser zoom?',
      ],
    },
    {
      id: 'performance-and-font-review',
      kind: 'self-review',
      description:
        'Confirm fonts, vitals, and animation work are measured against the field rather than the dev machine.',
      blocking: true,
      questions: [
        'Is exactly one face preloaded with crossorigin, does every @font-face declare swap or optional, and does each family have a metric-matched fallback with size-adjust and ascent-override?',
        'Is the LCP element in the initial HTML with fetchpriority="high" and no loading="lazy", and does every image and video carry explicit dimensions or aspect-ratio?',
        'Are LCP, INP and CLS being judged at P75 of field data, or only from a lab run on a fast machine with a warm cache?',
        'Do all animations affect only transform and opacity, is will-change scoped and removed after use, and does any content-visibility: auto lack contain-intrinsic-size?',
      ],
    },
    {
      id: 'preferences-and-semantics-review',
      kind: 'self-review',
      description:
        'Confirm user preferences are honoured and the markup carries its own accessibility.',
      questions: [
        'Does each of prefers-reduced-motion, prefers-reduced-transparency, prefers-contrast, prefers-color-scheme and forced-colors have a handled branch, and is the reduced-motion branch an explicit rule rather than a global animation: none?',
        'Does the theme resolve in a synchronous head script before first paint, wrapped in try/catch, setting color-scheme alongside the theme attribute?',
        'Are colours authored in OKLCh with an sRGB fallback ahead of the @supports upgrade?',
        'Is every interactive control native, is there exactly one <main> with a heading order that skips no levels, and does every form control have a real <label> rather than a placeholder?',
        'Is every structural modern-CSS feature behind @supports with a usable base layer, and does any scroll-driven animation fall back to the document timeline and play immediately?',
      ],
    },
    {
      id: 'design-audit',
      kind: 'command',
      description: 'Scan for hardcoded values and banned patterns.',
      command: 'bash scripts/audit_design.sh . --platform web',
      blocking: true,
    },
  ],

  relatedSkills: [
    'colour-systems',
    'responsive-architecture',
    'rendering-performance',
    'accessible-components',
  ],
}
