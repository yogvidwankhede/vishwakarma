// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Layout is where generated interfaces are least wrong and most boring.
 *
 * The output is rarely broken. It is a centred column of equal-width sections, each holding
 * a heading and three equal cards, built with flexbox because flexbox was the first tool
 * that came to mind, and held together by negative margins and fixed heights that fall apart
 * the moment real content arrives.
 *
 * This skill is about the machinery underneath composition: which formatting context
 * actually models the problem, how grid expresses structure that flex can only approximate,
 * why the automatic minimum size of a flex item causes most overflow bugs on the web, and
 * how spatial decisions — span, bleed, alignment, stacking — carry information rather than
 * decoration.
 */
export const layoutComposition: SkillManifest = {
  vsm: '1.0',
  id: 'layout-composition',
  name: 'Layout & Composition',
  description:
    'Use when structuring a page or component, choosing between flow, flex and grid, or fixing overflow, stacking, alignment, or layout shift.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'layout',
  tags: ['grid', 'flexbox', 'container-queries', 'composition', 'overflow', 'z-index', 'bento'],

  activation: {
    intents: [
      'structuring a page, dashboard, app shell, or landing page',
      'building a card grid, bento layout, sidebar, or split view',
      'deciding between flexbox and CSS grid for a piece of layout',
      'the user reports a horizontal scrollbar, content overflowing, or a layout that jumps',
      'an element will not shrink, will not stick, or sits above or below the wrong thing',
      'making a full-bleed section inside a constrained content column',
      'aligning content across cards, rows, or columns that contain different amounts of text',
    ],
    globs: [
      '**/*.css',
      '**/*.scss',
      '**/layout.{tsx,jsx,vue,svelte}',
      '**/*layout*.{tsx,jsx,vue,svelte}',
      '**/*grid*.{ts,tsx,css,scss}',
      '**/app/**/page.{tsx,jsx}',
    ],
    keywords: [
      'layout',
      'grid',
      'flexbox',
      'flex',
      'column',
      'sidebar',
      'bento',
      'overflow',
      'z-index',
      'sticky',
      'responsive',
      'container query',
    ],
  },

  content: {
    summary:
      'Choose the formatting context that models the problem, express structure with grid rather than approximating it with flex, size components against their container, and eliminate the automatic-minimum-size bug that causes most overflow.',

    body: `# Layout & Composition

Layout is the assignment of space, and space is the strongest signal an interface has: a
wider tile claims importance, a larger gap claims separation. When those claims are made by
accident — a flex container distributing free space evenly, every section inheriting one
max-width — the layout says nothing, and the page reads as filled in rather than composed.

---

## 1. Flow, flex, grid

**Normal flow** stacks blocks and lets content size itself; it remains correct for prose and
any vertical sequence. Since 2024 \`align-content\` works in block layout in every engine
(Chrome 123, Safari 17.4, Firefox 125), so vertical centring is no longer a reason to reach
for flex.

**Flex** distributes free space along one axis among items whose number and size you do not
control: toolbars, button rows, breadcrumbs. **Grid** places items into a structure the
author defines, in two dimensions, before the items exist: page shells, dashboards, card sets
that must align across rows.

The discriminator: *do the items decide the structure, or does the structure decide the
items?* The common error is reaching for flex where grid expresses the intent. A card set
written as \`display: flex; flex-wrap: wrap\` with \`flex: 1 1 18rem\` leaves a last row whose
two survivors stretch to half the page each, then needs \`:nth-last-child\` hacks to correct
it. \`repeat(auto-fill, minmax(18rem, 1fr))\` is right at once, because it is literally the
sentence "as many equal columns of at least 18rem as fit". Flex also cannot align across
rows: if an item in row two must line up with one in row one, flex has no mechanism and grid
has three.

---

## 2. Grid, concretely

**Named areas** make a shell legible and re-arrangeable: switching \`grid-template-areas\`
inside a query moves a region without altering DOM order, so focus order survives.

**\`auto-fit\` vs \`auto-fill\`** differ only when there are fewer items than tracks.
\`auto-fill\` creates every track that fits and leaves empty ones at their minimum;
\`auto-fit\` collapses empty tracks to zero so existing items absorb the space. In a 1000px
container with \`minmax(240px, 1fr)\` and a 16px gap, four tracks fit; with two items,
\`auto-fill\` strands two 240px cards at the left while \`auto-fit\` stretches them to roughly
492px each. Use \`auto-fill\` for stable card width, \`auto-fit\` to fill the row.

**Intrinsic sizing** replaces most magic numbers. \`max-content\` is the width with no
wrapping, \`min-content\` the widest unbreakable piece, \`fit-content(24rem)\` means "shrink
to content, cap at 24rem". \`grid-template-columns: max-content 1fr\` gives a label column
that fits the longest label in any language, which no hard-coded \`180px\` ever will.

**Subgrid** (Baseline widely available since March 2026; Firefox 71, Safari 16, Chrome 117)
solves cross-card alignment: cards whose titles wrap to different line counts have misaligned
bodies and footers unless the card interior inherits the parent's rows.

---

## 3. Every layout is a container query problem

A component sized against the viewport asserts where it will be placed: at a 1200px viewport
the same card is styled identically in a full-width region and in a 320px sidebar, and in the
sidebar it breaks. Container queries (widely available since August 2025) remove the
assertion: \`container-type: inline-size\` on the wrapper, \`@container (min-width: 30rem)\` in
the child, \`cqi\` units for anything that should track the container rather than the window.
Query the wrapper and style the child — an element cannot query itself, and
\`container-type: inline-size\` applies inline-axis containment, so it stops sizing from its
own content in that axis. Media queries are for genuine viewport questions: the page shell,
print, and \`prefers-*\`.

---

## 4. Bento: span is rank, not decoration

A bento grid works when tile size encodes importance: a 2×2 tile says "this is the number
that matters", a 1×1 says "supporting detail". Spans chosen to make the mosaic look
interesting make the layout lie about hierarchy, and users believe the layout.

The ragged bottom is the recurring defect: mixed spans plus auto-placement leave holes in the
last row. Make the span total a multiple of the column count at each breakpoint — arithmetic,
not hope — or let one tile in the final row take \`grid-column: 1 / -1\`. Use
\`grid-auto-flow: dense\` only for order-independent tiles: it moves visual position away from
DOM order, and therefore away from focus order.

---

## 5. Full-bleed inside a constrained column

Define the bleed in the grid, not around it. Give the page a track list of
\`[full-start] minmax(1rem, 1fr) [content-start] min(72ch, 100% - 2rem) [content-end]
minmax(1rem, 1fr) [full-end]\`, put every child on \`grid-column: content\`, and bleeding
children on \`grid-column: full\`.

The negative-margin alternative — \`width: 100vw; margin-inline: calc(50% - 50vw)\` — is
broken by construction: \`100vw\` includes the classic scrollbar gutter while the containing
block does not, so it overflows by the scrollbar width on every desktop page that scrolls,
and that is the commonest cause of an unexplained scrollbar. Grid tracks resolve against the
content box, which already excludes it.

---

## 6. \`min-width: 0\` — the most common flex and grid bug

Flex and grid items get an **automatic minimum size**: \`min-width\` computes to \`auto\`,
which resolves to the item's min-content size. A child holding a long URL, a \`<pre>\`, a
table, or one unbroken token cannot shrink below that and pushes its parent past the
viewport. Nothing in the CSS you wrote mentions a width, which is why it is hard to find.

The corrections: \`min-width: 0\` on the child, \`minmax(0, 1fr)\` instead of \`1fr\` for
tracks, \`min-height: 0\` on a flex column child that should scroll — the last is the answer
to "why does my scroll container not scroll". \`overflow: hidden\` also resets the automatic
minimum, which is why adding it sometimes fixes overflow by accident.

---

## 7. Reserve space, and stack deliberately

Anything whose size arrives after first paint must reserve its box: \`width\` and \`height\`
on every \`<img>\` so the browser derives an aspect ratio, \`aspect-ratio\` on media wrappers,
\`min-height\` on asynchronous regions. Cumulative Layout Shift is good at 0.1 or below, and
one unreserved hero image exceeds that alone.

\`z-index\` needs a documented scale — base 0, raised 10, sticky 100, header 200, dropdown
300, overlay 400, modal 500, toast 600, tooltip 700 — because arbitrary values compound into
\`9999\`. More importantly, \`z-index\` orders siblings only within a stacking context, and
\`transform\`, \`filter\`, \`opacity\` below 1, \`will-change\`, \`backdrop-filter\`, and
\`contain: paint\` create one silently — which is why a modal at 500 can render beneath a card
carrying a hover transform. The fix is the top layer (\`<dialog>\`, \`popover\`), not a larger
number. Sticky is the mirror trap: any ancestor with \`overflow\` set to \`hidden\`, \`auto\`,
or \`scroll\` disables it, and a sticky header needs \`scroll-padding-top\` equal to its height
or anchor links land behind it.

---

## 8. Optical alignment

Mathematical and visual centring differ whenever a shape's mass is unevenly distributed. A
triangular play glyph centred by its bounding box looks pushed right; nudge it left by 5–8%
of its width. A circle inscribed in a square covers about 78% of the area and reads smaller,
so a circular avatar beside a square thumbnail needs to be 3–5% larger. Cap height is shorter
than the em box, so text in a tight control sits low under equal padding.

---

## 9. The recurring failures

Three equal cards forever. Everything centred. Prose at full viewport width. Uniform section
widths. Negative margins standing in for a grid. Fixed heights forcing the alignment subgrid
should provide. \`100vh\` on mobile, where the retracting toolbar makes it wrong — use
\`100dvh\`, or \`100svh\` where the region must not resize mid-scroll.`,

    references: [
      {
        id: 'composition-patterns',
        title: 'Catalogue of composition patterns',
        answers:
          'Which layout pattern fits the structure I am building, how is it implemented, and when is it the wrong choice?',
        content: `# Catalogue of composition patterns

Each entry gives the intent, the mechanism, when it is correct, and the failure mode that
appears when it is used outside its range. Patterns compose: a shell contains rails,
a rail contains stacks, a stack contains clusters.

## Stack

**Intent:** a vertical sequence with one consistent gap.
**Mechanism:** \`display: grid; gap: var(--space-4)\` on the parent, or normal flow with
\`> * + * { margin-block-start: … }\`.
**Use when:** anything vertical — form fields, article bodies, card interiors.
**Not when:** children need different gaps by role. Then split into nested stacks, each with
one gap, rather than overriding margins on individual children.
**Failure mode:** per-child margin overrides accumulate until no one can predict the spacing
of a new child.

## Cluster

**Intent:** a group of items on a line that wraps gracefully — tags, filter chips, a button
row, breadcrumb segments.
**Mechanism:** \`display: flex; flex-wrap: wrap; gap: …; align-items: center\`.
**Use when:** the item count is unknown and the widths are content-driven.
**Not when:** the items must align with anything in another row. Flex cannot do that.
**Failure mode:** a single long tag forcing overflow, because the flex item's automatic
minimum size is its min-content width. Add \`min-width: 0\` plus truncation, or allow
\`overflow-wrap: anywhere\`.

## Sidebar

**Intent:** a fixed-ish column beside a fluid one, collapsing to a single column when narrow.
**Mechanism:** \`grid-template-columns: minmax(0, 16rem) minmax(0, 1fr)\`, with a container
query switching to \`grid-template-columns: 1fr\` below the threshold.
**Use when:** navigation, filters, a table of contents, an inspector panel.
**Not when:** the sidebar content is genuinely intrinsic — then use
\`fit-content(20rem) minmax(0, 1fr)\` so it shrinks to its content but is capped.
**Failure mode:** \`16rem 1fr\` without \`minmax(0, …)\` on the fluid track, which lets wide
main content (a table, a code block) blow the layout out horizontally.

## Switcher

**Intent:** a row that becomes a column at a threshold determined by available width rather
than viewport width.
**Mechanism:** container query on the wrapper flipping \`grid-auto-flow\` between \`column\`
and \`row\`; or the classic no-query version,
\`flex-wrap: wrap\` with \`flex-basis: calc((40rem - 100%) * 999)\` on each child, which
forces wrapping once the parent drops below 40rem.
**Use when:** a two-up or three-up section that must work in unknown contexts.
**Not when:** the children have genuinely different priority — a switcher makes them equal.

## Card set

**Intent:** a repeating collection where every card is peer-ranked.
**Mechanism:** \`grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr))\`.
Use \`auto-fit\` only if a partially-filled row should stretch.
**Use when:** the collection is homogeneous and order is not meaningful beyond sorting.
**Not when:** one item is genuinely more important. Give it a span and stop pretending.
**Failure mode:** internal misalignment — titles of different line counts pushing bodies out
of line. Fix with subgrid on the card, not with fixed heights.

## Bento

**Intent:** a mosaic where tile size expresses information rank.
**Mechanism:** an explicit grid — often 4 or 6 columns with
\`grid-auto-rows: minmax(10rem, auto)\` — and per-tile \`grid-column: span n\` /
\`grid-row: span n\`. Assign spans from a written ranking of the content.
**Use when:** a marketing feature section, a dashboard where metrics differ in importance.
**Not when:** the items are peers. A bento of equals is just a broken card set.
**Failure mode:** the ragged bottom row. Make the span total a multiple of the column count
per breakpoint, or terminate with a \`1 / -1\` tile.

## Masonry

**Intent:** a column layout where items of unequal height rise to fill the gap above them.
**Mechanism:** native masonry is arriving as \`display: grid-lanes\` in CSS Grid Level 3, but
it is experimental and not Baseline, and unsupported browsers fall back to ordinary
auto-placement. Until it lands, a column-count layout or a measured JavaScript implementation
are the only cross-browser options.
**Use when:** the collection is genuinely heterogeneous in height — user-generated images,
notes, pinned cards — and reading order across columns does not matter.
**Not when:** order matters. Masonry places item two below item one *in the same column*, so
the visual reading order is column-major while the DOM is row-major.

## Cover

**Intent:** a region that fills a given height with one element centred and optional header
and footer pinned.
**Mechanism:** \`min-block-size: 100svh; display: grid;\` with
\`grid-template-rows: auto 1fr auto\` and \`place-items: center\` on the middle child.
**Use when:** hero sections, sign-in screens, empty states.
**Not when:** the content might exceed the height — use \`min-block-size\`, never
\`block-size\`, or the content is clipped on short viewports and in landscape.

## Constrained column with full-bleed children

**Intent:** readable prose width with occasional edge-to-edge media.
**Mechanism:** the named-line gutter grid — \`[full-start] minmax(1rem, 1fr)
[content-start] min(72ch, 100% - 2rem) [content-end] minmax(1rem, 1fr) [full-end]\`.
**Use when:** articles, documentation, long-form marketing.
**Not when:** never; this replaces every negative-margin bleed technique.

## Rail, canvas, inspector

**Intent:** the three-pane application shell.
**Mechanism:** \`grid-template-areas\` naming rail, canvas, inspector, with the canvas track
as \`minmax(0, 1fr)\` and each pane its own scroll container
(\`min-block-size: 0; overflow-y: auto\`).
**Use when:** editors, mail clients, admin tools.
**Failure mode:** panes that scroll the document instead of themselves. Every pane needs
\`min-height: 0\` in its flex or grid context before \`overflow-y: auto\` does anything.

## Sticky rail beside scrolling content

**Intent:** a summary, table of contents, or purchase panel that stays visible.
**Mechanism:** grid parent, and \`position: sticky; top: var(--header-h)\` on the rail's
inner element with \`align-self: start\` so the grid item does not stretch to full row height.
**Failure mode:** forgetting \`align-self: start\` — a stretched item has nowhere to stick.
Or an ancestor with \`overflow: hidden\`, which disables sticky entirely.

## Split hero

**Intent:** asymmetric two-part composition, text against media.
**Mechanism:** \`grid-template-columns: 5fr 7fr\` or similar unequal ratio, not \`1fr 1fr\`.
**Use when:** you want the composition to read as designed. Unequal ratios carry intent;
equal ratios read as a default.

## Definition grid

**Intent:** label and value pairs that align regardless of label length or language.
**Mechanism:** \`grid-template-columns: max-content 1fr\` on the \`<dl>\`, with
\`grid-column\` assignments on \`<dt>\` and \`<dd>\`.
**Use when:** metadata blocks, spec tables, key-value summaries.
**Not when:** labels can be very long — cap with \`fit-content(20ch)\`.

## Overlay layer

**Intent:** dialogs, popovers, tooltips that must escape ancestor clipping.
**Mechanism:** the top layer — the \`popover\` attribute or \`<dialog>.showModal()\` — rather
than a portal plus a large \`z-index\`. Top-layer elements are painted above the entire
document regardless of stacking contexts, which is the only technique immune to an ancestor
\`transform\`.
**Failure mode:** a portal-free absolutely positioned overlay inside a transformed ancestor,
which clips or mis-stacks no matter what \`z-index\` it carries.`,
      },
      {
        id: 'overflow-debugging',
        title: 'Debugging layout overflow',
        answers:
          'There is a horizontal scrollbar, or something is wider than its container, or an element will not shrink or scroll. How do I find the cause?',
        content: `# Debugging layout overflow

Overflow is nearly always caused by an element that *cannot* be narrower rather than one
that has been *made* wider, which is why searching the stylesheet for large widths usually
finds nothing. Work from the symptom to the offending box, then to the reason it has a floor.

## Step 1 — Confirm what is overflowing

Run this in the console. It reports every element whose right edge exceeds the document's
client width, which is the definition of horizontal overflow.

    const limit = document.documentElement.clientWidth;
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > limit + 1 || r.left < -1) {
        console.log(Math.round(r.left), Math.round(r.right), el);
      }
    }

Read the results innermost-first: the deepest element in the list is usually the cause, and
its ancestors are merely reporting it. Then confirm with
\`document.scrollingElement.scrollWidth\` compared with \`clientWidth\`.

If the culprit is inside a subtree, bisect by setting \`overflow: hidden\` temporarily on
candidate ancestors; the one that stops the page scrollbar contains the offender.

## Step 2 — Identify which floor is holding it open

**Automatic minimum size (the usual answer).** Flex and grid items compute \`min-width: auto\`,
which resolves to their min-content size. Anything with a wide indivisible child — a long
URL, a \`<pre>\`, a \`<table>\`, an SVG with an intrinsic width, an unbreakable token — cannot
go below it.
*Fix:* \`min-width: 0\` on the item, or \`minmax(0, 1fr)\` on the grid track. Add
\`overflow-wrap: anywhere\` or \`text-overflow: ellipsis\` for the visible text.

**\`100vw\`.** Viewport units include the classic scrollbar gutter; the containing block does
not. Any \`width: 100vw\` on a page with a vertical scrollbar overflows by the scrollbar
width on desktop.
*Fix:* use the gutter-grid full-bleed technique, or \`width: 100%\`. \`scrollbar-gutter:
stable\` and \`100dvw\` mitigate but do not eliminate the mismatch.

**Fixed widths.** Any \`width\` in \`px\` on a child that must fit a narrow parent.
*Fix:* \`max-width: 100%\`, or \`min(320px, 100%)\`.

**Images and media.** An \`<img>\` without \`max-width: 100%\` renders at intrinsic width.
*Fix:* a global \`img, svg, video, canvas { max-width: 100%; height: auto; }\`.

**Negative margins.** A negative inline margin pulls a box outside its parent's content box,
and nothing clips it by default.

**Transforms.** \`rotate\`, \`scale\`, and \`translate\` change painted geometry but not
layout. A rotated card still occupies its untransformed box, so it visually overflows without
appearing to. The document scroll area *does* include transformed paint area.
*Fix:* \`overflow: clip\` on the wrapper — \`clip\` rather than \`hidden\`, because \`hidden\`
creates a scroll container and disables ancestor \`position: sticky\`.

**Absolutely positioned decoration.** Blobs, glows, and offset shapes positioned beyond the
edge. Same fix: \`overflow: clip\` on a wrapper that is \`position: relative\`.

**Grid tracks that cannot shrink.** \`grid-template-columns: 300px 1fr\` on a 320px viewport
overflows by construction.
*Fix:* \`minmax(0, 300px)\`, or switch tracks inside a container query.

**Tables.** A \`<table>\` sizes to content and ignores its parent's width.
*Fix:* wrap it in \`overflow-x: auto\` with \`tabindex="0"\` so keyboard users can scroll it,
or use \`table-layout: fixed\` with explicit column widths.

## Step 3 — The related non-overflow bugs with the same cause

**"My panel does not scroll."** A flex column child with \`overflow-y: auto\` needs
\`min-height: 0\`; otherwise its automatic minimum size equals its content height, so there
is nothing to overflow. In grid, the equivalent is a row track of \`minmax(0, 1fr)\`.

**"Sticky does nothing."** Any ancestor with \`overflow\` set to \`hidden\`, \`auto\`, or
\`scroll\` becomes the sticky element's scroll container, and if that container does not
scroll, the element never sticks. A sticky element also needs an inset — \`top\`, \`bottom\`,
or the logical equivalent — and must not be stretched by \`align-self: stretch\`.

**"My modal is behind a card."** \`z-index\` only orders siblings inside a stacking context.
An ancestor with \`transform\`, \`filter\`, \`opacity\` below 1, \`will-change\`,
\`backdrop-filter\`, or \`contain: paint\` traps the whole subtree.
*Fix:* render into the top layer via \`<dialog>\` or the \`popover\` attribute, which ignores
stacking contexts entirely.

## Step 4 — Verify at the boundaries

Overflow that only appears at extremes is still overflow.

- 320px width, which is the narrowest viewport in common use.
- 200% browser zoom at 1280px, which WCAG 1.4.10 (Reflow) requires to behave like a 640px
  viewport with no two-dimensional scrolling.
- The longest realistic string in every field, plus one 60-character unbroken token.
- A right-to-left locale, which surfaces every physical property that should have been
  logical (\`margin-inline-start\` rather than \`margin-left\`).
- With and without a visible scrollbar; macOS overlay scrollbars hide an entire class of bug
  that Windows users see immediately.

## Prevention

Prefer \`minmax(0, 1fr)\` over \`1fr\` by default. Set \`min-width: 0\` on flex children that
hold text. Use logical properties. Clip decoration at a wrapper with \`overflow: clip\`.
Never write \`100vw\` for a width. These five habits remove the majority of overflow defects
before they exist.`,
      },
    ],
  },

  rules: [
    {
      id: 'layout-composition/min-width-zero',
      strength: 'must',
      statement:
        'Set `min-width: 0` on flex or grid children that contain text or media, and use `minmax(0, 1fr)` rather than `1fr` for fluid grid tracks.',
      evidence: {
        rationale:
          'Flex and grid items have an automatic minimum size: their `min-width` computes to `auto`, which resolves to the min-content size. A child holding a long URL, a code block, or a table therefore cannot shrink below that content and forces its ancestors wider than the viewport.',
        source: 'CSS Box Sizing Level 3, automatic minimum size of grid and flex items',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.row { display: flex; }\n.row > .title { text-overflow: ellipsis; overflow: hidden; }',
        good: '.row { display: flex; }\n.row > .title { min-width: 0; text-overflow: ellipsis; overflow: hidden; }',
      },
      verifiedBy: 'overflow-audit',
    },
    {
      id: 'layout-composition/no-viewport-width-bleed',
      strength: 'must-not',
      statement:
        'Do not create full-bleed sections with `width: 100vw` plus a negative inline margin.',
      evidence: {
        rationale:
          'Viewport width units include the classic scrollbar gutter while the containing block excludes it, so on any desktop page with a vertical scrollbar the element is wider than its parent by the scrollbar width and produces permanent horizontal overflow.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.bleed { width: 100vw; margin-inline: calc(50% - 50vw); }',
        good: '.page {\n  display: grid;\n  grid-template-columns:\n    [full-start] minmax(1rem, 1fr)\n    [content-start] min(72ch, 100% - 2rem)\n    [content-end] minmax(1rem, 1fr)\n    [full-end];\n}\n.page > * { grid-column: content; }\n.page > .bleed { grid-column: full; }',
      },
      verifiedBy: 'overflow-audit',
    },
    {
      id: 'layout-composition/grid-for-structure',
      strength: 'should',
      statement:
        'Use grid when the author defines the structure or items must align across rows, and flex when items distribute available space along a single line.',
      evidence: {
        rationale:
          'Flex resolves sizes from content along one axis and has no mechanism for relating an item in one row to an item in another. Expressing a two-dimensional intention in flex therefore requires compensating hacks — percentage bases, nth-child overrides, fixed heights — each of which is a workaround for the missing second axis.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '.cards { display: flex; flex-wrap: wrap; gap: 1rem; }\n.cards > * { flex: 1 1 18rem; }',
        good: '.cards {\n  display: grid;\n  gap: 1rem;\n  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));\n}',
      },
    },
    {
      id: 'layout-composition/container-not-viewport',
      strength: 'should',
      statement:
        'Make reusable components respond to their container with `container-type: inline-size` and `@container`, reserving media queries for page-level structure and user preferences.',
      evidence: {
        rationale:
          'A viewport query encodes an assumption about where the component will be placed. The same component in a full-width region and in a 320px sidebar receives identical styles at the same viewport width, so one of the two placements is always wrong.',
        source:
          'CSS Containment Module Level 3; container queries widely available since August 2025',
        confidence: 'strong',
      },
      exceptions: [
        'Page shell decisions that genuinely depend on the viewport, such as switching from an off-canvas drawer to a persistent rail.',
      ],
      verifiedBy: 'container-independence',
    },
    {
      id: 'layout-composition/reserve-space',
      strength: 'must',
      statement:
        'Give every image, embed, and asynchronously populated region an explicit intrinsic size, `aspect-ratio`, or reserved minimum height before it loads.',
      evidence: {
        rationale:
          'An element without a known size occupies zero height until its content arrives, then displaces everything below it. Cumulative Layout Shift is scored good at 0.1 or below, and a single unreserved above-the-fold image typically exceeds that alone.',
        source: 'Core Web Vitals, Cumulative Layout Shift threshold',
        url: 'https://web.dev/articles/cls',
        confidence: 'established',
      },
      verifiedBy: 'layout-shift',
    },
    {
      id: 'layout-composition/z-index-scale',
      strength: 'must',
      statement:
        'Take every `z-index` value from a documented scale of named layers rather than writing arbitrary numbers.',
      evidence: {
        rationale:
          'Ad-hoc values have no shared meaning, so each new conflict is resolved by exceeding the previous maximum, which converges on four-digit numbers that still collide. A named scale makes the intended order explicit and reviewable.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '.toast { z-index: 9999; }',
        good: ':root { --z-toast: 600; }\n.toast { z-index: var(--z-toast); }',
      },
      verifiedBy: 'stacking-audit',
    },
    {
      id: 'layout-composition/stacking-context-awareness',
      strength: 'must',
      statement:
        'Render dialogs, popovers, and tooltips into the top layer via `<dialog>` or the `popover` attribute rather than relying on a high `z-index`.',
      evidence: {
        rationale:
          '`z-index` orders siblings only within a stacking context, and `transform`, `filter`, `opacity` below 1, `will-change`, `backdrop-filter`, and `contain: paint` all create one implicitly. An overlay inside such an ancestor cannot escape it at any `z-index`, whereas top-layer elements paint above the entire document.',
        confidence: 'established',
      },
    },
    {
      id: 'layout-composition/span-encodes-rank',
      strength: 'should',
      statement:
        'In a bento or mosaic layout, derive each tile’s span from a written ranking of the content rather than from how the arrangement looks.',
      evidence: {
        rationale:
          'Area is read as importance whether or not it was intended that way. Spans assigned for visual interest therefore assert a hierarchy that contradicts the content, and users resolve the contradiction in favour of the visual signal.',
        confidence: 'opinion',
      },
      verifiedBy: 'structure-review',
    },
    {
      id: 'layout-composition/no-ragged-bottom',
      strength: 'should',
      statement:
        'Ensure the tile spans in a mixed-span grid sum to a multiple of the column count at each breakpoint, or terminate the final row with a `grid-column: 1 / -1` tile.',
      evidence: {
        rationale:
          'Auto-placement fills tracks in order and leaves the remainder of the last row empty. The resulting notch reads as an unfinished layout rather than as intentional negative space, because it appears only at the end.',
        confidence: 'opinion',
      },
      verifiedBy: 'structure-review',
    },
    {
      id: 'layout-composition/dense-breaks-order',
      strength: 'must-not',
      statement:
        'Do not use `grid-auto-flow: dense` when the order of items carries meaning or when items are interactive.',
      evidence: {
        rationale:
          'Dense packing changes visual position without changing DOM order, so reading order and keyboard focus order diverge from what is displayed. A keyboard user tabbing through the grid jumps around the screen unpredictably.',
        source: 'WCAG 2.2 Success Criterion 2.4.3 (Focus Order) and 1.3.2 (Meaningful Sequence)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html',
        confidence: 'established',
      },
      exceptions: [
        'Purely decorative or order-independent collections such as an image wall with no per-item controls.',
      ],
    },
    {
      id: 'layout-composition/scroll-padding-for-sticky',
      strength: 'must',
      statement:
        'Set `scroll-padding-top` on the scroll container to at least the height of any sticky or fixed header.',
      evidence: {
        rationale:
          'Anchor navigation and `scrollIntoView` align the target with the top of the scrollport, which a sticky header covers. Without scroll padding the user is scrolled to a heading they cannot see, and focus lands on invisible content.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: 'html { scroll-behavior: smooth; }\n.header { position: sticky; top: 0; block-size: 4rem; }',
        good: 'html { scroll-behavior: smooth; scroll-padding-block-start: calc(4rem + 1rem); }\n.header { position: sticky; top: 0; block-size: 4rem; }',
      },
    },
    {
      id: 'layout-composition/subgrid-over-fixed-heights',
      strength: 'should-not',
      statement:
        'Do not use fixed heights or JavaScript measurement to align content across sibling cards; use subgrid or grid alignment instead.',
      evidence: {
        rationale:
          'A fixed height is a claim about content length that variable content will eventually violate, producing clipping or overflow. Subgrid lets the card interior participate in the parent’s row tracks, so alignment holds at any content length, and it has been Baseline widely available since March 2026.',
        confidence: 'strong',
      },
    },
    {
      id: 'layout-composition/auto-fit-vs-auto-fill',
      strength: 'should',
      statement:
        'Choose between `auto-fit` and `auto-fill` deliberately: `auto-fit` collapses empty tracks so remaining items stretch, `auto-fill` keeps them so item width stays stable.',
      evidence: {
        rationale:
          'The two behave identically when items fill every track and differ only in the partially-filled case, which is why the difference is usually discovered in production. `auto-fit` with two items in a wide container produces two enormous cards; `auto-fill` leaves them at their minimum, stranded at one edge.',
        confidence: 'established',
      },
    },
    {
      id: 'layout-composition/named-areas-for-shells',
      strength: 'should',
      statement:
        'Define page and application shells with `grid-template-areas`, and re-arrange them by redefining the areas rather than by reordering the DOM.',
      evidence: {
        rationale:
          'Named areas make the structure readable in the stylesheet and let a breakpoint move a region without touching markup, which keeps source order — and therefore reading and focus order — stable across layouts.',
        confidence: 'strong',
      },
    },
    {
      id: 'layout-composition/dynamic-viewport-units',
      strength: 'should',
      statement:
        'Use `100dvh` or `100svh` rather than `100vh` for full-height regions, and prefer `min-block-size` over a fixed block size.',
      evidence: {
        rationale:
          'On mobile browsers `vh` resolves against the largest viewport, so a `100vh` region extends beneath the retracting toolbar and its lower content is unreachable. A fixed height additionally clips content on short or landscape viewports.',
        confidence: 'established',
      },
      exceptions: [
        'Regions that must not resize while the toolbar animates, where `svh` is the stable choice.',
      ],
    },
    {
      id: 'layout-composition/logical-properties',
      strength: 'should',
      statement:
        'Express layout offsets, margins, padding, and sizes with logical properties (`inline`/`block`) rather than physical ones (`left`/`right`/`width`).',
      evidence: {
        rationale:
          'Logical properties resolve against the element’s writing mode and direction, so a layout written with them mirrors correctly in right-to-left locales and in vertical writing modes without a parallel stylesheet.',
        confidence: 'established',
      },
      exceptions: [
        'Properties that are genuinely physical, such as a box-shadow offset following a fixed light source.',
      ],
    },
    {
      id: 'layout-composition/vary-container-widths',
      strength: 'should',
      statement:
        'Vary section widths across a page rather than applying a single max-width to every section.',
      evidence: {
        rationale:
          'Uniform width removes the only cue that distinguishes a change of subject from a continuation, so the page reads as one undifferentiated scroll. Alternating contained, wide, and full-bleed regions creates rhythm at no structural cost.',
        confidence: 'opinion',
      },
    },
    {
      id: 'layout-composition/optical-alignment',
      strength: 'should',
      statement:
        'Correct icons, circular shapes, and tight control padding optically rather than trusting bounding-box centring.',
      evidence: {
        rationale:
          'Perceived position follows visual mass, not the bounding box. A triangular glyph centred geometrically reads as offset right by roughly 5–8% of its width, and a circle inscribed in a square reads smaller because it covers about 78% of the area.',
        confidence: 'established',
      },
      exceptions: [
        'Icon sets already optically corrected within their own viewBox, where a further nudge doubles the error.',
      ],
    },
    {
      id: 'layout-composition/no-horizontal-overflow',
      strength: 'must',
      statement:
        'Produce no horizontal scrolling at 320px viewport width or at 200% zoom on a 1280px viewport.',
      evidence: {
        rationale:
          'Content that requires scrolling in two directions cannot be read in a single sweep, which is why the reflow criterion sets a 320 CSS pixel equivalent as the threshold. Low-vision users at high zoom hit this before anyone else does.',
        source: 'WCAG 2.2 Success Criterion 1.4.10 (Reflow)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/reflow.html',
        confidence: 'established',
      },
      verifiedBy: 'overflow-audit',
    },
  ],

  verification: [
    {
      id: 'structure-review',
      kind: 'self-review',
      description: 'Confirm the formatting context and the spans match the intent.',
      blocking: true,
      questions: [
        'For each container: does the structure decide the items, or do the items decide the structure? Does the chosen display value match that answer?',
        'Is any flex container being used to align items across more than one row? If so, it should be a grid.',
        'If tiles have varied spans, write the content ranking they encode. Does it match the actual ranking?',
        'At each breakpoint, do the tile spans sum to a multiple of the column count, or is the last row terminated deliberately?',
      ],
    },
    {
      id: 'overflow-audit',
      kind: 'self-review',
      description: 'Confirm nothing overflows at the boundary viewports.',
      blocking: true,
      questions: [
        'At 320px wide and at 200% zoom on 1280px, is there any horizontal scrolling?',
        'Does every flex or grid child that holds text, code, tables, or media have `min-width: 0` or a `minmax(0, …)` track?',
        'Does any rule set a width in `vw` units? If so, what happens when a classic scrollbar is present?',
        'Does every scrollable panel inside a flex column also have `min-height: 0`?',
      ],
    },
    {
      id: 'layout-shift',
      kind: 'self-review',
      description: 'Confirm nothing moves after first paint.',
      blocking: true,
      questions: [
        'Does every `<img>` carry width and height attributes, or an explicit `aspect-ratio`?',
        'Does every asynchronously populated region reserve space matching the loaded content?',
        'Do skeleton or placeholder states occupy the same box as the content they replace?',
      ],
    },
    {
      id: 'container-independence',
      kind: 'self-review',
      description: 'Confirm components survive being placed somewhere unexpected.',
      questions: [
        'Drop each reusable component into a 320px column at a 1440px viewport. Does it still work?',
        'Which breakpoints in this component are genuinely viewport questions rather than container questions?',
      ],
    },
    {
      id: 'stacking-audit',
      kind: 'self-review',
      description: 'Confirm layering is intentional and escapable.',
      questions: [
        'Does every `z-index` value come from the documented scale?',
        'Does any ancestor of an overlay set `transform`, `filter`, `opacity` below 1, `will-change`, or `backdrop-filter`, and therefore trap it in a stacking context?',
        'Does any ancestor of a sticky element set `overflow` to `hidden`, `auto`, or `scroll`?',
      ],
    },
    {
      id: 'layout-smells',
      kind: 'command',
      description:
        'Flag the layout constructs that most often cause overflow and stacking defects: viewport-width sizing, four-digit z-index values, and fixed `vh` heights.',
      command:
        "! grep -rEn 'width:[[:space:]]*100vw|z-index:[[:space:]]*[0-9]{4,}|(min-)?height:[[:space:]]*100vh' --include='*.css' --include='*.scss' --include='*.tsx' --include='*.jsx' .",
    },
    {
      id: 'contract-audit',
      kind: 'contract',
      description: 'Evaluate the layout against the project Design Contract.',
      contractSection: 'layout',
    },
  ],

  relatedSkills: [
    'design-judgment',
    'responsive-architecture',
    'typographic-systems',
    'accessible-components',
  ],
}
