import type { SkillManifest } from '../manifest.js'

/**
 * Responsive design is the part of frontend work where the industry's vocabulary actively
 * misleads. "Mobile breakpoint", "tablet breakpoint", "desktop breakpoint" name devices
 * that do not exist as fixed sizes and never did, and thinking in those names produces
 * layouts that are correct at five widths and broken at every width in between.
 *
 * This skill replaces the device vocabulary with a mechanical one: a breakpoint is a
 * measurement of where a specific layout stops working, container queries are the correct
 * scope for component adaptation, fluid values are algebra with an accessibility
 * constraint, and the whole thing is falsifiable against a test matrix that includes two
 * zoom levels most teams never check.
 */
export const responsiveArchitecture: SkillManifest = {
  vsm: '1.0',
  id: 'responsive-architecture',
  name: 'Responsive Architecture',
  description:
    'Use when a layout must adapt across screen sizes — breakpoints, container queries, fluid type, touch targets, zoom, or mobile overflow bugs.',
  version: '1.0.0',
  license: 'MIT',
  category: 'layout',
  tags: ['responsive', 'breakpoints', 'container-queries', 'fluid', 'viewport', 'zoom', 'touch'],

  activation: {
    intents: [
      'making a page or component work on small screens',
      'choosing or changing breakpoints',
      'writing container queries or fluid type and spacing',
      'fixing horizontal scrolling, clipped content, or broken layout on mobile',
      'the user reports something is unusable on a phone, on a tablet, or at high zoom',
      'building a data table, image, or full-height layout that must survive narrow viewports',
    ],
    globs: [
      '**/*.css',
      '**/*.scss',
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/tailwind.config.*',
    ],
    keywords: [
      'responsive',
      'breakpoint',
      'mobile',
      'container query',
      'clamp',
      'viewport',
      'zoom',
      'media query',
      'touch target',
    ],
  },

  content: {
    summary:
      'Choose breakpoints from where the content breaks rather than from device names, make intrinsic layout the default and media queries the exception, scope adaptation to containers, and verify at 320px and at 400% zoom.',

    body: `# Responsive Architecture

A layout is not responsive because it has breakpoints. It is responsive because it stays
usable at every width it is given, including the widths nobody tested — which is most of
them. A breakpoint is a repair, and reaching for one should feel like an admission that the
layout could not solve the problem itself.

---

## 1. Breakpoints come from the content

Naming a breakpoint \`tablet\` encodes a false claim: that there is a device class 768px wide
whose users need a distinct layout. 1024px is simultaneously an iPad in landscape, a small
laptop, and a window someone dragged to half a monitor.

The procedure is empirical. Build at the narrowest supported width, then widen the viewport
slowly and watch. The breakpoint is the width at which something specifically fails: a
headline wraps to four lines, a navigation row runs out of space, a measure passes 75
characters. Put the breakpoint just past that failure and name it for the failure —
\`--bp-nav-collapse\`, \`--bp-sidebar-fits\`. Different components break at different widths,
so a project has more breakpoints than the framework default and each belongs to its own
component. Express them in \`em\`, not \`px\`: an \`em\` query is evaluated against the
browser's default font size, so a user who has raised theirs gets the simpler layout sooner —
correct, because less content now fits.

---

## 2. Intrinsic first, media queries as the exception

Most adaptation needs no query. \`grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))\`
reflows a card grid at every width in one declaration — \`auto-fill\` instead when a lone item
should not stretch. \`width: min(65ch, 100%)\` is a max-width that cannot overflow its parent;
\`fit-content(20rem)\` sizes a sidebar to its content, up to a cap.

A media query changes layout in steps, so between two breakpoints the layout is frozen and
only accidentally correct — which is where untested dead zones live. Reach for one only when
the change is genuinely discontinuous: a nav becoming a drawer, two panes becoming a stack.

---

## 3. Fluid values: the algebra, and the trap

A fluid value interpolates linearly between a minimum at a narrow viewport and a maximum at a
wide one. With \`slope = (maxPx - minPx) / (maxVwPx - minVwPx)\` and
\`intercept = minPx - slope * minVwPx\`, the value is
\`clamp(minRem, interceptRem + (slope * 100)vw, maxRem)\` — for 16px at 320px growing to 20px
at 1280px, \`clamp(1rem, 0.9167rem + 0.4167vw, 1.25rem)\`.

**The \`rem\` term is not optional, and this is an accessibility requirement.** Viewport units
are computed from the viewport alone and ignore the root font size, so
\`clamp(1rem, 2.5vw, 1.25rem)\` locks text to the window across the whole fluid range: a user
who set their browser default to 24px because they need 24px gets 20px anyway. A \`rem\`
component makes the entire interpolation line shift when the root size does. State both
bounds in \`rem\` for the same reason. Keep the min-to-max ratio under roughly 1.6x, and check
that the smallest heading still outranks body text at the narrow anchor.

---

## 4. Container queries: a card does not know the viewport

A component's layout is a function of the space it was given, not of the window. The same card
sits in a 1200px feature slot and a 320px sidebar; a viewport query tells it "wide" in both.

    .card-wrap { container-type: inline-size; container-name: card; }
    @container card (min-width: 24rem) { .card { grid-template-columns: 8rem 1fr; } }

Three pitfalls cause most container-query bugs. **You cannot query the element you are
styling** — the query matches an ancestor, so the component needs a wrapper carrying
\`container-type\`. **\`container-type: size\` collapses height**: it contains both axes, so
the element stops sizing to its content and resolves to zero height unless one is set
explicitly; use \`inline-size\`. **Containment changes positioning** — a container is a
containing block for absolutely and fixed-positioned descendants, so a dropdown that used to
escape to the viewport is now clipped by the card. Use the popover API or a portal.

Size internals with \`cqi\`, not \`vw\`. Style queries — \`@container style(--density: compact)\`
— match custom property values rather than dimensions, and every element is a style container
by default, so they propagate a variant through a subtree without threading class names.

---

## 5. Pointer, hover, and target size

WCAG 2.2 SC 2.5.8 (AA) requires interactive targets of at least 24 by 24 CSS pixels unless
spacing leaves a non-overlapping 24px circle around each; SC 2.5.5 (AAA) sets 44 by 44. Treat
24px as the floor and 44px as the working target for a thumb, expanding the hit area with
padding rather than the control itself.

Detect input capability, never viewport width. \`(hover: hover)\` and \`(pointer: fine)\`
describe the primary pointer, \`(any-pointer: coarse)\` any attached one — a touchscreen
laptop reports a fine hovering primary and is still used with a finger. Gate hover
*enhancements* on \`(hover: hover)\`, size targets for \`(any-pointer: coarse)\`. Gating
matters because touch browsers emulate hover on tap: the state applies and sticks until the
user taps elsewhere. Worse, an affordance revealed only on hover — a row's delete action, a
menu that opens on hover — is absent for touch and keyboard alike.

---

## 6. The viewport is not 100vh

On mobile browsers \`vh\` resolves against the *large* viewport, the height with the URL bar
retracted, so a \`100vh\` element extends below the fold when the bar is visible and its
bottom content — usually the primary action — is unreachable. Use \`svh\` for anything that
must be visible immediately, \`lvh\` for the largest, \`dvh\` for a value that tracks the bar;
\`dvh\` reflows during scroll, so \`min-height: 100svh\` is the safer app-shell default.
\`100vw\` does not subtract a classic scrollbar in every engine, a common source of horizontal
overflow; prefer \`100%\` or \`scrollbar-gutter: stable\`.

For rounded corners and home indicators, add \`viewport-fit=cover\` to the viewport meta tag
and pad with \`max(1rem, env(safe-area-inset-bottom))\`; without that meta value the \`env()\`
insets resolve to zero.

---

## 7. Images and tables

**\`sizes\` is wrong by default.** With a \`w\`-descriptor \`srcset\` the browser assumes
\`sizes="100vw"\` and fetches an image for the whole window even if it renders at 400px,
deciding in the preload scanner before CSS exists to correct it. Declare the rendered
width, or use \`sizes="auto"\`, valid only on \`loading="lazy"\` images. Give every image
\`width\` and \`height\` or an \`aspect-ratio\` so its box is reserved before it loads, put
\`fetchpriority="high"\` on the LCP image and never \`loading="lazy"\`, and use \`<picture>\`
only for art direction — a different crop, not a different resolution.

**Tables are the hardest case**: a table is a two-dimensional relationship and a phone is one
column, so decide what the user is doing. Comparing across rows, the grid *is* the information —
keep the table, wrap it in an \`overflow-x: auto\` container that is focusable and labelled
(\`tabindex="0"\`, \`role="region"\`, an accessible name), and make the identifying column
sticky. Reading one record at a time, render a list of records — but change the markup, not
\`display\`, because \`display: block\` on table elements destroys the row and column
associations screen readers depend on. Hide columns only when they stay reachable in an
expandable row detail.

---

## 8. The failures, named

**Device-name breakpoints**, correct at five widths and arbitrary between them. **Hiding
content on mobile** instead of restructuring it. **Horizontal overflow** — almost always a
fixed \`min-width\`, an unbreakable string (\`overflow-wrap: anywhere\`), a negative margin, or
\`100vw\`. **Hover-only affordances**. **\`100vh\` on mobile**. **Untested zoom**: 200%
(SC 1.4.4) and 400% (SC 1.4.10) are conformance requirements, broken far more often than
320px.`,

    references: [
      {
        id: 'viewport-test-matrix',
        title: 'The viewport test matrix and what to check at each stop',
        answers:
          'Which viewport widths and zoom levels must I test, and what specifically am I looking for at each one?',
        content: `# The viewport test matrix

Nine stops. The five widths cover the layout continuum's inflection points; the two zoom
levels are WCAG conformance requirements; the two orientation cases catch the failures that
only appear when height is scarce. Run the sweep before declaring any responsive work done.

Test by resizing the window, not by choosing a device preset. Device presets check the exact
widths you already thought about. Dragging the window edge slowly from 320px to 1600px finds
the widths you did not, and nearly every layout has at least one dead zone between two
breakpoints where something is briefly ugly or broken.

---

## 320 CSS px — the floor

The smallest width any modern site must support, and the width WCAG's Reflow criterion is
written against. Check:

- No horizontal scrolling of the page. Any overflow here is a defect.
- Every interactive target is still at least 24x24 CSS px, with adequate spacing.
- No text below 14px. Shrinking type to fit is a failure, not a fix.
- Long unbroken strings — URLs, email addresses, tokens, code — wrap rather than push.
- Headings do not wrap to more than about four lines.
- Modals and drawers still leave room for their close control.
- Tables scroll inside their own region, not with the page.

## 360 and 375 CSS px — the real median

Most Android devices report 360, most small iPhones 375. If the layout was designed at 390
or 393 and only checked at 320, this band is where padding runs out and two-column grids
start clipping. Check that primary actions fit on one line without truncation and that any
fixed bottom bar leaves the content above it fully scrollable.

## 768 CSS px — the awkward middle

Tablet portrait, and the width where layouts are most often simply unfinished: too wide for
the stacked mobile layout, too narrow for the desktop one. Check:

- Prose measure has not blown past 75 characters because the mobile stack is still applied
  at full width.
- Card grids do not leave a lone orphan on the second row with a huge gap.
- Navigation has either fully collapsed or fully expanded, not landed halfway.
- Any sidebar is either present and useful, or gone — not present and 120px wide.

## 1024 CSS px — landscape tablet and small laptop

The width where sidebars first fit. Check that the two-pane layout has enough room for both
panes to be usable, and that hover-dependent affordances are gated, because a large share of
traffic here is touch.

## 1440 CSS px and above — the wide case

Check that content is constrained rather than stretched. Full-width prose, images scaled past
their intrinsic resolution, and card grids that grow to six absurdly wide columns are the
failures here. A max-width on the content container and a cap on the number of grid tracks
usually fix all three.

---

## 200% zoom — WCAG 2.2 SC 1.4.4, Resize Text (AA)

Set browser zoom to 200% at a 1280px window. Text must reach twice its size with no loss of
content or functionality. Check:

- Nothing is clipped by a fixed-height container. This is the most common failure: a header
  or card with \`height\` rather than \`min-height\`.
- No text is truncated with an ellipsis where the full string matters.
- Sticky headers do not consume most of the viewport height.
- Text sized in \`vw\` alone will not respond to a text-only resize; check with the browser's
  font-size preference raised as well as with page zoom.

## 400% zoom — WCAG 2.2 SC 1.4.10, Reflow (AA)

At a 1280x1024 window, 400% zoom gives a 320x256 CSS px layout area. Content must reflow
into a single scrolling direction. Check:

- No two-dimensional scrolling. Vertically-scrolling content must not require horizontal
  scrolling, and vice versa. Exceptions are limited to content that genuinely requires 2D
  layout: data tables, maps, diagrams, code blocks.
- The 256px effective height matters as much as the width. Fixed headers, footers, cookie
  banners, and chat launchers can consume all of it between them.
- Multi-column layouts have collapsed to one column.
- Nothing overlaps. Absolutely positioned elements sized for a wide viewport are the usual
  cause.

---

## Landscape phone — roughly 740x360

Short and wide. Full-height modals become unusable, sticky headers plus sticky footers can
leave no content area at all, and vertically centred hero sections push their own call to
action off-screen. Never lock orientation to work around this.

## Foldables and split viewports

Foldable devices can expose a viewport split by a hinge. The \`horizontal-viewport-segments\`
and \`vertical-viewport-segments\` media features, with the \`env(viewport-segment-*)\`
variables, describe the geometry, but support is still narrow. The pragmatic requirement is
weaker and always applies: do not place a single critical control at the horizontal centre of
a wide viewport, because on a folded device that is exactly where the hinge is.

---

## Automating part of this

A resize sweep is manual, but three checks are worth wiring into CI with a headless browser:
assert \`document.documentElement.scrollWidth <= innerWidth\` at 320px on every route; assert
no element's bounding box extends past the viewport's right edge; and screenshot each route
at 320, 768, and 1440 to diff against a baseline. Those three catch most regressions that
reach production.`,
      },
      {
        id: 'fluid-scale-construction',
        title: 'Constructing a fluid type and space scale',
        answers:
          'How do I derive the exact clamp() values for a whole type and spacing scale, and what makes a fluid scale fail?',
        content: `# Constructing a fluid type and space scale

A fluid scale is not a list of \`clamp()\` calls invented one at a time. It is two ratio-based
scales — one anchored at the narrow viewport, one at the wide — with each step linearly
interpolated between its two anchors. Building it in that order is what keeps the
relationships between steps intact at every width in between.

## Step 1: choose the two anchors

Pick the viewport range over which the scale should move. 320px to 1280px is a sound default:
below 320 nothing should still be shrinking, and above 1280 further growth makes measure
worse rather than better. Outside the range the \`clamp()\` bounds hold the value flat, which
is the desired behaviour — a 2560px monitor should not get 40px body text.

## Step 2: choose two ratios

At the narrow anchor, use a compact ratio: 1.2 (minor third) is typical, because on a small
screen a large ratio wastes vertical space and forces headings to wrap.

At the wide anchor, use a more expressive ratio: 1.25 to 1.333. There is room for contrast,
and hierarchy should be more emphatic.

With a 16px base at 320px and an 18px base at 1280px:

| Step | Narrow (320px) | Wide (1280px) |
| --- | --- | --- |
| -1 | 13.33px | 13.5px |
| 0 | 16px | 18px |
| 1 | 19.2px | 22.5px |
| 2 | 23.04px | 28.13px |
| 3 | 27.65px | 35.16px |
| 4 | 33.18px | 43.95px |
| 5 | 39.81px | 54.93px |

Note that the ratios diverge, so the top of the scale grows far more than the bottom. That is
the point: body text barely moves, display text moves a lot.

## Step 3: solve each step

For each step, with sizes in px and viewports in px:

    slope     = (maxSize - minSize) / (maxVw - minVw)
    intercept = minSize - slope * minVw
    preferred = (intercept / 16)rem + (slope * 100)vw
    value     = clamp((minSize/16)rem, preferred, (maxSize/16)rem)

Worked for step 3 (27.65px to 35.16px over 320px to 1280px):

    slope     = 7.51 / 960      = 0.007823
    intercept = 27.65 - 2.503   = 25.147px = 1.5717rem
    result    = clamp(1.7281rem, 1.5717rem + 0.7823vw, 2.1975rem)

Verify by substituting both endpoints. At 320px: 25.147 + 0.007823*320 = 27.65. At 1280px:
25.147 + 10.01 = 35.16. If an endpoint does not reproduce the intended size, the arithmetic
is wrong, and the error will be invisible except at intermediate widths.

## Step 4: the accessibility constraint

The preferred term must retain a \`rem\` component, and both bounds must be expressed in
\`rem\`. Viewport units are computed from the viewport alone and ignore the root font size, so
a preferred term of pure \`vw\` produces text that does not respond to a user's font-size
preference anywhere in the fluid range.

A rule of thumb that keeps this safe: the \`rem\` intercept should contribute at least half
the value at the narrow anchor. If the intercept is small or negative, the line is too steep
— the min and max are too far apart for the viewport range — and the result behaves like pure
\`vw\`. Narrow the size range or widen the viewport range.

Negative intercepts also mean the value would be negative at very small viewports. The
\`clamp()\` minimum masks this, but it is a signal that the scale is badly conditioned.

## Step 5: space

Apply the same construction to spacing, with two differences. Space should scale more
aggressively than type — the ratio between the narrow and wide anchor for a section gap can
reasonably be 2x, where type is rarely more than 1.4x — because whitespace is what makes a
wide layout feel composed rather than stretched.

Second, keep small spacing steps fixed. Gaps below about 12px (icon-to-label, input padding)
should not be fluid at all: they are governed by the size of the things they separate, not by
the window, and fluidising them produces sub-pixel values that round inconsistently.

For internal component spacing, use container query units instead of viewport units:
\`padding: clamp(0.75rem, 0.5rem + 2cqi, 1.5rem)\` scales a card's padding with the card,
which is what the card actually cares about.

## Failure modes

**Convergence.** Because different steps use different slopes, two adjacent steps can meet at
some width and even cross. Always tabulate every step at 320, 768, and 1280 and confirm the
ordering holds throughout.

**Fluid everything.** Borders, radii, icon sizes, and line heights should generally not be
fluid. A fluid border width renders at 1.3px and looks broken.

**Fluid line-height.** Set \`line-height\` as a unitless ratio and let it follow the fluid
font size. A fluid \`line-height\` in \`rem\` decouples leading from size and breaks vertical
rhythm at intermediate widths.

**No flat top.** Omitting the maximum, or setting it far too high, produces 60px body text on
a large monitor. The maximum is the most important of the three arguments.

**Ignoring zoom interaction.** Page zoom shrinks the CSS viewport, so a fluid value moves
*down* the curve as the user zooms in, partially cancelling the zoom. The \`rem\` intercept is
what keeps the net effect positive; verify at 200% zoom that text genuinely got larger.`,
      },
    ],
  },

  rules: [
    {
      id: 'responsive-architecture/content-driven-breakpoints',
      strength: 'should',
      statement:
        'Choose each breakpoint by observing the width at which the layout actually fails, and name it for that failure rather than for a device class.',
      evidence: {
        rationale:
          'Screen widths form a continuum with no clustering around device names, so a breakpoint derived from a device is correct only by coincidence. A breakpoint derived from an observed failure is correct by construction, and its name tells the next reader what it protects.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '@media (min-width: 768px) { .nav { display: flex; } } /* "tablet" */',
        good: '/* nav items stop fitting on one row below 46em */\n@media (min-width: 46em) { .nav { display: flex; } }',
      },
    },
    {
      id: 'responsive-architecture/em-breakpoints',
      strength: 'should',
      statement:
        'Express media query breakpoints in em units rather than px.',
      evidence: {
        rationale:
          'An em breakpoint is evaluated against the browser default font size, so a user who raises theirs receives the simpler layout at a proportionally wider viewport — which is correct, because their larger text fits less content in the same space.',
        confidence: 'strong',
      },
    },
    {
      id: 'responsive-architecture/intrinsic-before-media-queries',
      strength: 'should',
      statement:
        'Solve continuous layout adaptation with intrinsic sizing (auto-fit grids, flex wrapping, min/max/clamp) and reserve media queries for genuinely discontinuous changes.',
      evidence: {
        rationale:
          'A media query changes layout in steps, so between two breakpoints the layout is fixed and only accidentally correct. Intrinsic sizing responds at every width, which removes the untested dead zones where most responsive defects live.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '.grid { grid-template-columns: 1fr; }\n@media (min-width: 40em) { .grid { grid-template-columns: 1fr 1fr; } }\n@media (min-width: 64em) { .grid { grid-template-columns: repeat(3, 1fr); } }',
        good: '.grid { grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); }',
      },
    },
    {
      id: 'responsive-architecture/rem-term-in-fluid-values',
      strength: 'must',
      statement:
        'Every fluid clamp() preferred term must include a rem component, and both bounds must be stated in rem.',
      evidence: {
        rationale:
          'Viewport units are derived from the viewport alone and are entirely independent of the root font size, so a preferred term expressed purely in vw ignores the user font-size preference throughout the fluid range. A rem component makes the whole interpolation line shift when the root size changes.',
        source: 'WCAG 2.2 Success Criterion 1.4.4 (Resize Text)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: 'h1 { font-size: clamp(2rem, 5vw, 3.5rem); }',
        good: 'h1 { font-size: clamp(2rem, 1.5rem + 2.5vw, 3.5rem); }',
      },
      verifiedBy: 'fluid-scale-audit',
    },
    {
      id: 'responsive-architecture/no-viewport-only-text-sizing',
      strength: 'must-not',
      statement:
        'Do not size text using viewport or container units alone, with no rem or px term and no clamp bounds.',
      evidence: {
        rationale:
          'Unbounded viewport-relative text has no floor and no ceiling: it becomes illegible on narrow screens and absurd on wide ones, and it never responds to the user font-size setting because viewport units are not derived from it.',
        confidence: 'established',
      },
    },
    {
      id: 'responsive-architecture/container-queries-for-components',
      strength: 'should',
      statement:
        'Adapt reusable components with container queries against their own container, not with viewport media queries.',
      evidence: {
        rationale:
          'A component receives its width from its parent, not from the window. A viewport query gives the same answer to the same component in a 1200px slot and a 300px sidebar, so any component placed in more than one context is wrong in at least one of them.',
        confidence: 'strong',
      },
      exceptions: [
        'Page-level chrome such as the primary navigation or an app shell, which is genuinely a function of the viewport.',
      ],
      verifiedBy: 'container-scope-audit',
    },
    {
      id: 'responsive-architecture/container-type-inline-size',
      strength: 'should-not',
      statement:
        'Do not use container-type: size unless the element has an explicitly set block size.',
      evidence: {
        rationale:
          'Size containment applies to both axes, which removes the contents from the element’s own size calculation. Without an explicit height the element resolves to zero height and its content overflows or disappears; inline-size contains only the inline axis and leaves height content-driven.',
        confidence: 'established',
      },
    },
    {
      id: 'responsive-architecture/container-positioning-side-effect',
      strength: 'should',
      statement:
        'Move popovers, dropdowns, and tooltips out of query containers, or render them with the popover API or a portal.',
      evidence: {
        rationale:
          'A query container establishes a containing block for absolutely and fixed-positioned descendants, so overlay content that previously escaped to the viewport becomes positioned and clipped relative to the container.',
        confidence: 'established',
      },
    },
    {
      id: 'responsive-architecture/no-horizontal-overflow',
      strength: 'must',
      statement:
        'The page must not scroll horizontally at a 320 CSS px viewport width.',
      evidence: {
        rationale:
          'Reflow requires content to be presentable at 320 CSS px without two-dimensional scrolling, because that is the layout width a 1280px window produces at 400% zoom. Horizontal page scrolling at that width makes reading require a horizontal sweep on every line.',
        source: 'WCAG 2.2 Success Criterion 1.4.10 (Reflow)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/reflow.html',
        confidence: 'established',
      },
      exceptions: [
        'Content that genuinely requires two-dimensional layout — data tables, maps, diagrams, code blocks — which may scroll within its own region.',
      ],
      verifiedBy: 'no-fixed-viewport-height',
    },
    {
      id: 'responsive-architecture/target-size',
      strength: 'must',
      statement:
        'Give every interactive target at least 24 by 24 CSS pixels, and at least 44 by 44 for primary controls on touch input.',
      evidence: {
        rationale:
          'A fingertip contact patch is far larger than a cursor hotspot and the user cannot see what is under it, so acquisition error rises sharply below roughly 44px. 24px is the WCAG 2.2 Level AA floor; 44px matches the enhanced criterion and the major platform guidelines.',
        source: 'WCAG 2.2 Success Criteria 2.5.8 (AA, 24px) and 2.5.5 (AAA, 44px)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
        confidence: 'established',
      },
      exceptions: [
        'Targets inline within a sentence, where the line box governs size.',
        'Targets whose spacing places a non-overlapping 24px circle around each one.',
      ],
      examples: {
        language: 'css',
        bad: '.icon-button { width: 16px; height: 16px; }',
        good: '.icon-button { width: 16px; height: 16px; padding: 14px; box-sizing: content-box; }',
      },
      verifiedBy: 'pointer-and-target-audit',
    },
    {
      id: 'responsive-architecture/gate-hover-styles',
      strength: 'must',
      statement:
        'Gate hover-dependent styling behind @media (hover: hover).',
      evidence: {
        rationale:
          'Touch browsers emulate a hover event on tap, so an ungated :hover rule applies on touch and persists until the user taps elsewhere, leaving controls stuck in a highlighted state that misrepresents the interface.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.card:hover { transform: translateY(-4px); }',
        good: '@media (hover: hover) { .card:hover { transform: translateY(-4px); } }',
      },
    },
    {
      id: 'responsive-architecture/no-hover-only-affordances',
      strength: 'must-not',
      statement:
        'Do not make any action or information available only on hover.',
      evidence: {
        rationale:
          'Touch devices have no hover state and keyboard navigation produces focus rather than hover, so a hover-only affordance is simply absent for both. Revealing row actions or opening menus on hover removes functionality for the majority of traffic.',
        confidence: 'established',
      },
      exceptions: [
        'Purely redundant enhancement, where the same action is also reachable through a persistently visible control.',
      ],
    },
    {
      id: 'responsive-architecture/dynamic-viewport-units',
      strength: 'should-not',
      statement:
        'Do not use vh for full-height layout on mobile; use svh, lvh, or dvh according to which viewport state matters.',
      evidence: {
        rationale:
          'On mobile browsers vh resolves against the large viewport, the height with browser chrome retracted. With the URL bar visible, a 100vh element is taller than the visible area and its bottom content — typically the primary action — sits below the fold.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.hero { height: 100vh; }',
        good: '.hero { min-height: 100svh; }',
      },
      verifiedBy: 'no-fixed-viewport-height',
    },
    {
      id: 'responsive-architecture/safe-area-insets',
      strength: 'must',
      statement:
        'When the viewport meta tag sets viewport-fit=cover, pad fixed edge-anchored UI with env(safe-area-inset-*), combined with a design minimum using max().',
      evidence: {
        rationale:
          'viewport-fit=cover extends the layout viewport under rounded corners, notches, and the home indicator. Without inset padding, edge-anchored controls are physically obscured or overlap the system gesture area; without the meta value the env() variables resolve to zero and the padding has no effect.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.tab-bar { padding-block-end: 1rem; }',
        good: '.tab-bar { padding-block-end: max(1rem, env(safe-area-inset-bottom)); }',
      },
    },
    {
      id: 'responsive-architecture/accurate-sizes-attribute',
      strength: 'must',
      statement:
        'Provide a sizes attribute that matches the rendered width whenever srcset uses w descriptors, or use sizes="auto" on lazy-loaded images.',
      evidence: {
        rationale:
          'The default value of sizes is 100vw, so with no explicit value the browser selects a candidate sized for the whole window. An image rendered at 400px on a 1440px screen therefore downloads roughly three times the pixels it needs, and the selection happens in the preload scanner before CSS is available to correct it.',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<img srcset="a-400.jpg 400w, a-800.jpg 800w, a-1600.jpg 1600w" src="a-800.jpg" alt="">',
        good: '<img srcset="a-400.jpg 400w, a-800.jpg 800w, a-1600.jpg 1600w" sizes="(min-width: 60rem) 20rem, 100vw" src="a-800.jpg" alt="">',
      },
    },
    {
      id: 'responsive-architecture/reserve-media-space',
      strength: 'must',
      statement:
        'Give every image and embedded media element intrinsic width and height attributes or an explicit aspect-ratio.',
      evidence: {
        rationale:
          'Without intrinsic dimensions the element occupies no space until its bytes arrive, so surrounding content is laid out and then displaced. The shift is largest on slow mobile connections, which is exactly where a mis-tap costs the most.',
        confidence: 'established',
      },
    },
    {
      id: 'responsive-architecture/no-hiding-content-on-mobile',
      strength: 'must-not',
      statement:
        'Do not use display: none at narrow widths as the strategy for fitting content on small screens.',
      evidence: {
        rationale:
          'Hiding rather than restructuring makes the small-screen experience a strict subset of the large one, and small screens are the majority of traffic for most products. Content that matters at 1440px still matters at 375px; it needs a different arrangement, not deletion.',
        confidence: 'strong',
      },
      exceptions: [
        'Genuinely decorative elements with no informational or functional content.',
        'Content that remains reachable through an equivalent path, such as a column moved into an expandable row detail.',
      ],
    },
    {
      id: 'responsive-architecture/preserve-table-semantics',
      strength: 'must-not',
      statement:
        'Do not override the display property of table, row, or cell elements to restack a table on small screens.',
      evidence: {
        rationale:
          'Row and column association is carried by the table display types, not by the element names. Setting display: block removes the elements from the table formatting context, and assistive technology loses the header-to-cell relationships that make the data interpretable at all.',
        confidence: 'established',
      },
      exceptions: [
        'The table is given explicit ARIA table roles that restore the structure, which is fragile and should be a last resort.',
      ],
      examples: {
        language: 'css',
        bad: '@media (max-width: 40em) { table, tr, td { display: block; } }',
        good: '.table-scroll { overflow-x: auto; }\n/* <div class="table-scroll" tabindex="0" role="region" aria-label="Invoices"> */',
      },
    },
    {
      id: 'responsive-architecture/scrollable-region-focusable',
      strength: 'must',
      statement:
        'Make any horizontally scrolling region keyboard-focusable with tabindex="0" and give it an accessible name.',
      evidence: {
        rationale:
          'A scroll container that contains no focusable elements cannot be reached or scrolled by keyboard, so its overflowing content is unreachable without a pointer. Making the container focusable gives it arrow-key scrolling, and the name tells a screen reader user what they have landed in.',
        confidence: 'established',
      },
    },
    {
      id: 'responsive-architecture/verify-zoom-levels',
      strength: 'must',
      statement:
        'Verify every layout at 200% and 400% browser zoom before considering responsive work complete.',
      evidence: {
        rationale:
          'Both are Level AA conformance requirements, and neither is exercised by width testing alone: zoom scales text and layout together, which exposes fixed-height containers, ellipsis truncation, and sticky chrome that consumes the whole 256px effective height at 400%.',
        source: 'WCAG 2.2 Success Criteria 1.4.4 (Resize Text) and 1.4.10 (Reflow)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/reflow.html',
        confidence: 'established',
      },
      verifiedBy: 'viewport-sweep',
    },
  ],

  verification: [
    {
      id: 'viewport-sweep',
      kind: 'self-review',
      description: 'Confirm the layout holds across the full viewport and zoom matrix.',
      blocking: true,
      questions: [
        'At 320 CSS px, does the page scroll horizontally anywhere, and does any long unbroken string push the layout wider?',
        'Between 640px and 1024px, is there any width where the layout is visibly unfinished — a lone orphan card, a half-collapsed navigation, a sidebar too narrow to use?',
        'At 200% zoom, is any content clipped by a fixed height or truncated by an ellipsis?',
        'At 400% zoom on a 1280x1024 window, does any content require scrolling in two directions, and do fixed headers and footers leave usable space in the remaining 256px of height?',
        'In landscape on a short viewport, can every modal and every primary action still be reached?',
      ],
    },
    {
      id: 'fluid-scale-audit',
      kind: 'self-review',
      description: 'Confirm fluid values respond to user font-size preference and stay ordered.',
      blocking: true,
      questions: [
        'Does every clamp() preferred term contain a rem component, and are both bounds stated in rem?',
        'Tabulate each type step at 320px, 768px, and 1280px: does the ordering of steps hold at all three, with no pair converging?',
        'With the browser default font size raised to 24px, does body text visibly grow?',
        'Is any border width, radius, or line-height fluid that should not be?',
      ],
    },
    {
      id: 'pointer-and-target-audit',
      kind: 'self-review',
      description: 'Confirm the interface works with a coarse pointer and without hover.',
      blocking: true,
      questions: [
        'List every interactive target smaller than 24x24 CSS px. Is each one inline in a sentence, or spaced so a 24px circle around it overlaps nothing?',
        'Is every :hover rule inside an @media (hover: hover) block?',
        'Is any action, label, or control revealed only on hover? If so, how does a touch or keyboard user reach it?',
        'Are targets sized for @media (any-pointer: coarse) rather than for a narrow viewport width?',
      ],
    },
    {
      id: 'container-scope-audit',
      kind: 'self-review',
      description: 'Confirm component adaptation is scoped to the container, not the window.',
      questions: [
        'Would this component still lay out correctly if placed in a 300px sidebar on a 1440px screen?',
        'Does every query container use container-type: inline-size, or does it set an explicit height to justify size?',
        'Does any container contain an absolutely or fixed-positioned overlay that now resolves against the container instead of the viewport?',
      ],
    },
    {
      id: 'no-fixed-viewport-height',
      kind: 'command',
      description:
        'Fail when a layout dimension is set in vh, which resolves to the large viewport on mobile and hides content below the fold.',
      command:
        "! grep -rInE '(min-|max-)?height[[:space:]]*:[[:space:]]*[0-9.]+vh' --include='*.css' --include='*.scss' --include='*.tsx' --include='*.jsx' --include='*.vue' --include='*.svelte' .",
      blocking: false,
    },
    {
      id: 'responsive-contract',
      kind: 'contract',
      description: 'Evaluate the output against the responsive section of the project Design Contract.',
      contractSection: 'responsive',
      blocking: true,
    },
  ],

  relatedSkills: ['layout-composition', 'typographic-systems', 'design-judgment', 'accessible-components'],
}
