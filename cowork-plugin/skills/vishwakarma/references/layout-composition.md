# Layout & Composition

Layout is the assignment of space, and space is the strongest signal an interface has: a
wider tile claims importance, a larger gap claims separation. When those claims are made by
accident — a flex container distributing free space evenly, every section inheriting one
max-width — the layout says nothing, and the page reads as filled in rather than composed.

---

## 1. Flow, flex, grid

**Normal flow** stacks blocks and lets content size itself; it remains correct for prose and
any vertical sequence. Since 2024 `align-content` works in block layout in every engine
(Chrome 123, Safari 17.4, Firefox 125), so vertical centring is no longer a reason to reach
for flex.

**Flex** distributes free space along one axis among items whose number and size you do not
control: toolbars, button rows, breadcrumbs. **Grid** places items into a structure the
author defines, in two dimensions, before the items exist: page shells, dashboards, card sets
that must align across rows.

The discriminator: *do the items decide the structure, or does the structure decide the
items?* The common error is reaching for flex where grid expresses the intent. A card set
written as `display: flex; flex-wrap: wrap` with `flex: 1 1 18rem` leaves a last row whose
two survivors stretch to half the page each, then needs `:nth-last-child` hacks to correct
it. `repeat(auto-fill, minmax(18rem, 1fr))` is right at once, because it is literally the
sentence "as many equal columns of at least 18rem as fit". Flex also cannot align across
rows: if an item in row two must line up with one in row one, flex has no mechanism and grid
has three.

---

## 2. Grid, concretely

**Named areas** make a shell legible and re-arrangeable: switching `grid-template-areas`
inside a query moves a region without altering DOM order, so focus order survives.

**`auto-fit` vs `auto-fill`** differ only when there are fewer items than tracks.
`auto-fill` creates every track that fits and leaves empty ones at their minimum;
`auto-fit` collapses empty tracks to zero so existing items absorb the space. In a 1000px
container with `minmax(240px, 1fr)` and a 16px gap, four tracks fit; with two items,
`auto-fill` strands two 240px cards at the left while `auto-fit` stretches them to roughly
492px each. Use `auto-fill` for stable card width, `auto-fit` to fill the row.

**Intrinsic sizing** replaces most magic numbers. `max-content` is the width with no
wrapping, `min-content` the widest unbreakable piece, `fit-content(24rem)` means "shrink
to content, cap at 24rem". `grid-template-columns: max-content 1fr` gives a label column
that fits the longest label in any language, which no hard-coded `180px` ever will.

**Subgrid** (Baseline widely available since March 2026; Firefox 71, Safari 16, Chrome 117)
solves cross-card alignment: cards whose titles wrap to different line counts have misaligned
bodies and footers unless the card interior inherits the parent's rows.

---

## 3. Every layout is a container query problem

A component sized against the viewport asserts where it will be placed: at a 1200px viewport
the same card is styled identically in a full-width region and in a 320px sidebar, and in the
sidebar it breaks. Container queries (widely available since August 2025) remove the
assertion: `container-type: inline-size` on the wrapper, `@container (min-width: 30rem)` in
the child, `cqi` units for anything that should track the container rather than the window.
Query the wrapper and style the child — an element cannot query itself, and
`container-type: inline-size` applies inline-axis containment, so it stops sizing from its
own content in that axis. Media queries are for genuine viewport questions: the page shell,
print, and `prefers-*`.

---

## 4. Bento: span is rank, not decoration

A bento grid works when tile size encodes importance: a 2×2 tile says "this is the number
that matters", a 1×1 says "supporting detail". Spans chosen to make the mosaic look
interesting make the layout lie about hierarchy, and users believe the layout.

The ragged bottom is the recurring defect: mixed spans plus auto-placement leave holes in the
last row. Make the span total a multiple of the column count at each breakpoint — arithmetic,
not hope — or let one tile in the final row take `grid-column: 1 / -1`. Use
`grid-auto-flow: dense` only for order-independent tiles: it moves visual position away from
DOM order, and therefore away from focus order.

---

## 5. Full-bleed inside a constrained column

Define the bleed in the grid, not around it. Give the page a track list of
`[full-start] minmax(1rem, 1fr) [content-start] min(72ch, 100% - 2rem) [content-end]
minmax(1rem, 1fr) [full-end]`, put every child on `grid-column: content`, and bleeding
children on `grid-column: full`.

The negative-margin alternative — `width: 100vw; margin-inline: calc(50% - 50vw)` — is
broken by construction: `100vw` includes the classic scrollbar gutter while the containing
block does not, so it overflows by the scrollbar width on every desktop page that scrolls,
and that is the commonest cause of an unexplained scrollbar. Grid tracks resolve against the
content box, which already excludes it.

---

## 6. `min-width: 0` — the most common flex and grid bug

Flex and grid items get an **automatic minimum size**: `min-width` computes to `auto`,
which resolves to the item's min-content size. A child holding a long URL, a `<pre>`, a
table, or one unbroken token cannot shrink below that and pushes its parent past the
viewport. Nothing in the CSS you wrote mentions a width, which is why it is hard to find.

The corrections: `min-width: 0` on the child, `minmax(0, 1fr)` instead of `1fr` for
tracks, `min-height: 0` on a flex column child that should scroll — the last is the answer
to "why does my scroll container not scroll". `overflow: hidden` also resets the automatic
minimum, which is why adding it sometimes fixes overflow by accident.

---

## 7. Reserve space, and stack deliberately

Anything whose size arrives after first paint must reserve its box: `width` and `height`
on every `<img>` so the browser derives an aspect ratio, `aspect-ratio` on media wrappers,
`min-height` on asynchronous regions. Cumulative Layout Shift is good at 0.1 or below, and
one unreserved hero image exceeds that alone.

`z-index` needs a documented scale — base 0, raised 10, sticky 100, header 200, dropdown
300, overlay 400, modal 500, toast 600, tooltip 700 — because arbitrary values compound into
`9999`. More importantly, `z-index` orders siblings only within a stacking context, and
`transform`, `filter`, `opacity` below 1, `will-change`, `backdrop-filter`, and
`contain: paint` create one silently — which is why a modal at 500 can render beneath a card
carrying a hover transform. The fix is the top layer (`<dialog>`, `popover`), not a larger
number. Sticky is the mirror trap: any ancestor with `overflow` set to `hidden`, `auto`,
or `scroll` disables it, and a sticky header needs `scroll-padding-top` equal to its height
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
should provide. `100vh` on mobile, where the retracting toolbar makes it wrong — use
`100dvh`, or `100svh` where the region must not resize mid-scroll.

## Rules

### MUST NOT — Do not create full-bleed sections with `width: 100vw` plus a negative inline margin.

*Why:* Viewport width units include the classic scrollbar gutter while the containing block excludes it, so on any desktop page with a vertical scrollbar the element is wider than its parent by the scrollbar width and produces permanent horizontal overflow.

Incorrect:

```css
.bleed { width: 100vw; margin-inline: calc(50% - 50vw); }
```

Correct:

```css
.page {
  display: grid;
  grid-template-columns:
    [full-start] minmax(1rem, 1fr)
    [content-start] min(72ch, 100% - 2rem)
    [content-end] minmax(1rem, 1fr)
    [full-end];
}
.page > * { grid-column: content; }
.page > .bleed { grid-column: full; }
```

### MUST NOT — Do not use `grid-auto-flow: dense` when the order of items carries meaning or when items are interactive.

*Why:* Dense packing changes visual position without changing DOM order, so reading order and keyboard focus order diverge from what is displayed. A keyboard user tabbing through the grid jumps around the screen unpredictably.

*Source:* [WCAG 2.2 Success Criterion 2.4.3 (Focus Order) and 1.3.2 (Meaningful Sequence)](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)

*Exceptions:*
- Purely decorative or order-independent collections such as an image wall with no per-item controls.

### MUST — Set `min-width: 0` on flex or grid children that contain text or media, and use `minmax(0, 1fr)` rather than `1fr` for fluid grid tracks.

*Why:* Flex and grid items have an automatic minimum size: their `min-width` computes to `auto`, which resolves to the min-content size. A child holding a long URL, a code block, or a table therefore cannot shrink below that content and forces its ancestors wider than the viewport.

*Source:* CSS Box Sizing Level 3, automatic minimum size of grid and flex items

Incorrect:

```css
.row { display: flex; }
.row > .title { text-overflow: ellipsis; overflow: hidden; }
```

Correct:

```css
.row { display: flex; }
.row > .title { min-width: 0; text-overflow: ellipsis; overflow: hidden; }
```

### MUST — Give every image, embed, and asynchronously populated region an explicit intrinsic size, `aspect-ratio`, or reserved minimum height before it loads.

*Why:* An element without a known size occupies zero height until its content arrives, then displaces everything below it. Cumulative Layout Shift is scored good at 0.1 or below, and a single unreserved above-the-fold image typically exceeds that alone.

*Source:* [Core Web Vitals, Cumulative Layout Shift threshold](https://web.dev/articles/cls)

### MUST — Take every `z-index` value from a documented scale of named layers rather than writing arbitrary numbers.

*Why:* Ad-hoc values have no shared meaning, so each new conflict is resolved by exceeding the previous maximum, which converges on four-digit numbers that still collide. A named scale makes the intended order explicit and reviewable.

Incorrect:

```css
.toast { z-index: 9999; }
```

Correct:

```css
:root { --z-toast: 600; }
.toast { z-index: var(--z-toast); }
```

### MUST — Render dialogs, popovers, and tooltips into the top layer via `<dialog>` or the `popover` attribute rather than relying on a high `z-index`.

*Why:* `z-index` orders siblings only within a stacking context, and `transform`, `filter`, `opacity` below 1, `will-change`, `backdrop-filter`, and `contain: paint` all create one implicitly. An overlay inside such an ancestor cannot escape it at any `z-index`, whereas top-layer elements paint above the entire document.

### MUST — Set `scroll-padding-top` on the scroll container to at least the height of any sticky or fixed header.

*Why:* Anchor navigation and `scrollIntoView` align the target with the top of the scrollport, which a sticky header covers. Without scroll padding the user is scrolled to a heading they cannot see, and focus lands on invisible content.

Incorrect:

```css
html { scroll-behavior: smooth; }
.header { position: sticky; top: 0; block-size: 4rem; }
```

Correct:

```css
html { scroll-behavior: smooth; scroll-padding-block-start: calc(4rem + 1rem); }
.header { position: sticky; top: 0; block-size: 4rem; }
```

### MUST — Produce no horizontal scrolling at 320px viewport width or at 200% zoom on a 1280px viewport.

*Why:* Content that requires scrolling in two directions cannot be read in a single sweep, which is why the reflow criterion sets a 320 CSS pixel equivalent as the threshold. Low-vision users at high zoom hit this before anyone else does.

*Source:* [WCAG 2.2 Success Criterion 1.4.10 (Reflow)](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

### SHOULD NOT — Do not use fixed heights or JavaScript measurement to align content across sibling cards; use subgrid or grid alignment instead.

*Why:* A fixed height is a claim about content length that variable content will eventually violate, producing clipping or overflow. Subgrid lets the card interior participate in the parent’s row tracks, so alignment holds at any content length, and it has been Baseline widely available since March 2026.

### SHOULD — Use grid when the author defines the structure or items must align across rows, and flex when items distribute available space along a single line.

*Why:* Flex resolves sizes from content along one axis and has no mechanism for relating an item in one row to an item in another. Expressing a two-dimensional intention in flex therefore requires compensating hacks — percentage bases, nth-child overrides, fixed heights — each of which is a workaround for the missing second axis.

Incorrect:

```css
.cards { display: flex; flex-wrap: wrap; gap: 1rem; }
.cards > * { flex: 1 1 18rem; }
```

Correct:

```css
.cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
}
```

### SHOULD — Make reusable components respond to their container with `container-type: inline-size` and `@container`, reserving media queries for page-level structure and user preferences.

*Why:* A viewport query encodes an assumption about where the component will be placed. The same component in a full-width region and in a 320px sidebar receives identical styles at the same viewport width, so one of the two placements is always wrong.

*Source:* CSS Containment Module Level 3; container queries widely available since August 2025

*Exceptions:*
- Page shell decisions that genuinely depend on the viewport, such as switching from an off-canvas drawer to a persistent rail.

### SHOULD — In a bento or mosaic layout, derive each tile’s span from a written ranking of the content rather than from how the arrangement looks.

*Why:* Area is read as importance whether or not it was intended that way. Spans assigned for visual interest therefore assert a hierarchy that contradicts the content, and users resolve the contradiction in favour of the visual signal.

### SHOULD — Ensure the tile spans in a mixed-span grid sum to a multiple of the column count at each breakpoint, or terminate the final row with a `grid-column: 1 / -1` tile.

*Why:* Auto-placement fills tracks in order and leaves the remainder of the last row empty. The resulting notch reads as an unfinished layout rather than as intentional negative space, because it appears only at the end.

### SHOULD — Choose between `auto-fit` and `auto-fill` deliberately: `auto-fit` collapses empty tracks so remaining items stretch, `auto-fill` keeps them so item width stays stable.

*Why:* The two behave identically when items fill every track and differ only in the partially-filled case, which is why the difference is usually discovered in production. `auto-fit` with two items in a wide container produces two enormous cards; `auto-fill` leaves them at their minimum, stranded at one edge.

### SHOULD — Define page and application shells with `grid-template-areas`, and re-arrange them by redefining the areas rather than by reordering the DOM.

*Why:* Named areas make the structure readable in the stylesheet and let a breakpoint move a region without touching markup, which keeps source order — and therefore reading and focus order — stable across layouts.

### SHOULD — Use `100dvh` or `100svh` rather than `100vh` for full-height regions, and prefer `min-block-size` over a fixed block size.

*Why:* On mobile browsers `vh` resolves against the largest viewport, so a `100vh` region extends beneath the retracting toolbar and its lower content is unreachable. A fixed height additionally clips content on short or landscape viewports.

*Exceptions:*
- Regions that must not resize while the toolbar animates, where `svh` is the stable choice.

### SHOULD — Express layout offsets, margins, padding, and sizes with logical properties (`inline`/`block`) rather than physical ones (`left`/`right`/`width`).

*Why:* Logical properties resolve against the element’s writing mode and direction, so a layout written with them mirrors correctly in right-to-left locales and in vertical writing modes without a parallel stylesheet.

*Exceptions:*
- Properties that are genuinely physical, such as a box-shadow offset following a fixed light source.

### SHOULD — Vary section widths across a page rather than applying a single max-width to every section.

*Why:* Uniform width removes the only cue that distinguishes a change of subject from a continuation, so the page reads as one undifferentiated scroll. Alternating contained, wide, and full-bleed regions creates rhythm at no structural cost.

### SHOULD — Correct icons, circular shapes, and tight control padding optically rather than trusting bounding-box centring.

*Why:* Perceived position follows visual mass, not the bounding box. A triangular glyph centred geometrically reads as offset right by roughly 5–8% of its width, and a circle inscribed in a square reads smaller because it covers about 78% of the area.

*Exceptions:*
- Icon sets already optically corrected within their own viewBox, where a further nudge doubles the error.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the formatting context and the spans match the intent. (blocking)

- For each container: does the structure decide the items, or do the items decide the structure? Does the chosen display value match that answer?
- Is any flex container being used to align items across more than one row? If so, it should be a grid.
- If tiles have varied spans, write the content ranking they encode. Does it match the actual ranking?
- At each breakpoint, do the tile spans sum to a multiple of the column count, or is the last row terminated deliberately?

### Confirm nothing overflows at the boundary viewports. (blocking)

- At 320px wide and at 200% zoom on 1280px, is there any horizontal scrolling?
- Does every flex or grid child that holds text, code, tables, or media have `min-width: 0` or a `minmax(0, …)` track?
- Does any rule set a width in `vw` units? If so, what happens when a classic scrollbar is present?
- Does every scrollable panel inside a flex column also have `min-height: 0`?

### Confirm nothing moves after first paint. (blocking)

- Does every `<img>` carry width and height attributes, or an explicit `aspect-ratio`?
- Does every asynchronously populated region reserve space matching the loaded content?
- Do skeleton or placeholder states occupy the same box as the content they replace?

### Confirm components survive being placed somewhere unexpected.

- Drop each reusable component into a 320px column at a 1440px viewport. Does it still work?
- Which breakpoints in this component are genuinely viewport questions rather than container questions?

### Confirm layering is intentional and escapable.

- Does every `z-index` value come from the documented scale?
- Does any ancestor of an overlay set `transform`, `filter`, `opacity` below 1, `will-change`, or `backdrop-filter`, and therefore trap it in a stacking context?
- Does any ancestor of a sticky element set `overflow` to `hidden`, `auto`, or `scroll`?

### Flag the layout constructs that most often cause overflow and stacking defects: viewport-width sizing, four-digit z-index values, and fixed `vh` heights.

```bash
! grep -rEn 'width:[[:space:]]*100vw|z-index:[[:space:]]*[0-9]{4,}|(min-)?height:[[:space:]]*100vh' --include='*.css' --include='*.scss' --include='*.tsx' --include='*.jsx' .
```

### Evaluate the layout against the project Design Contract.

Evaluate the output against the project Design Contract (layout section).

Run `vishwakarma audit` if the project has the CLI available.

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/composition-patterns.md` — Which layout pattern fits the structure I am building, how is it implemented, and when is it the wrong choice?
- `references/overflow-debugging.md` — There is a horizontal scrollbar, or something is wider than its container, or an element will not shrink or scroll. How do I find the cause?
