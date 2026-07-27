# Catalogue of composition patterns

Each entry gives the intent, the mechanism, when it is correct, and the failure mode that
appears when it is used outside its range. Patterns compose: a shell contains rails,
a rail contains stacks, a stack contains clusters.

## Stack

**Intent:** a vertical sequence with one consistent gap.
**Mechanism:** `display: grid; gap: var(--space-4)` on the parent, or normal flow with
`> * + * { margin-block-start: … }`.
**Use when:** anything vertical — form fields, article bodies, card interiors.
**Not when:** children need different gaps by role. Then split into nested stacks, each with
one gap, rather than overriding margins on individual children.
**Failure mode:** per-child margin overrides accumulate until no one can predict the spacing
of a new child.

## Cluster

**Intent:** a group of items on a line that wraps gracefully — tags, filter chips, a button
row, breadcrumb segments.
**Mechanism:** `display: flex; flex-wrap: wrap; gap: …; align-items: center`.
**Use when:** the item count is unknown and the widths are content-driven.
**Not when:** the items must align with anything in another row. Flex cannot do that.
**Failure mode:** a single long tag forcing overflow, because the flex item's automatic
minimum size is its min-content width. Add `min-width: 0` plus truncation, or allow
`overflow-wrap: anywhere`.

## Sidebar

**Intent:** a fixed-ish column beside a fluid one, collapsing to a single column when narrow.
**Mechanism:** `grid-template-columns: minmax(0, 16rem) minmax(0, 1fr)`, with a container
query switching to `grid-template-columns: 1fr` below the threshold.
**Use when:** navigation, filters, a table of contents, an inspector panel.
**Not when:** the sidebar content is genuinely intrinsic — then use
`fit-content(20rem) minmax(0, 1fr)` so it shrinks to its content but is capped.
**Failure mode:** `16rem 1fr` without `minmax(0, …)` on the fluid track, which lets wide
main content (a table, a code block) blow the layout out horizontally.

## Switcher

**Intent:** a row that becomes a column at a threshold determined by available width rather
than viewport width.
**Mechanism:** container query on the wrapper flipping `grid-auto-flow` between `column`
and `row`; or the classic no-query version,
`flex-wrap: wrap` with `flex-basis: calc((40rem - 100%) * 999)` on each child, which
forces wrapping once the parent drops below 40rem.
**Use when:** a two-up or three-up section that must work in unknown contexts.
**Not when:** the children have genuinely different priority — a switcher makes them equal.

## Card set

**Intent:** a repeating collection where every card is peer-ranked.
**Mechanism:** `grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr))`.
Use `auto-fit` only if a partially-filled row should stretch.
**Use when:** the collection is homogeneous and order is not meaningful beyond sorting.
**Not when:** one item is genuinely more important. Give it a span and stop pretending.
**Failure mode:** internal misalignment — titles of different line counts pushing bodies out
of line. Fix with subgrid on the card, not with fixed heights.

## Bento

**Intent:** a mosaic where tile size expresses information rank.
**Mechanism:** an explicit grid — often 4 or 6 columns with
`grid-auto-rows: minmax(10rem, auto)` — and per-tile `grid-column: span n` /
`grid-row: span n`. Assign spans from a written ranking of the content.
**Use when:** a marketing feature section, a dashboard where metrics differ in importance.
**Not when:** the items are peers. A bento of equals is just a broken card set.
**Failure mode:** the ragged bottom row. Make the span total a multiple of the column count
per breakpoint, or terminate with a `1 / -1` tile.

## Masonry

**Intent:** a column layout where items of unequal height rise to fill the gap above them.
**Mechanism:** native masonry is arriving as `display: grid-lanes` in CSS Grid Level 3, but
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
**Mechanism:** `min-block-size: 100svh; display: grid;` with
`grid-template-rows: auto 1fr auto` and `place-items: center` on the middle child.
**Use when:** hero sections, sign-in screens, empty states.
**Not when:** the content might exceed the height — use `min-block-size`, never
`block-size`, or the content is clipped on short viewports and in landscape.

## Constrained column with full-bleed children

**Intent:** readable prose width with occasional edge-to-edge media.
**Mechanism:** the named-line gutter grid — `[full-start] minmax(1rem, 1fr)
[content-start] min(72ch, 100% - 2rem) [content-end] minmax(1rem, 1fr) [full-end]`.
**Use when:** articles, documentation, long-form marketing.
**Not when:** never; this replaces every negative-margin bleed technique.

## Rail, canvas, inspector

**Intent:** the three-pane application shell.
**Mechanism:** `grid-template-areas` naming rail, canvas, inspector, with the canvas track
as `minmax(0, 1fr)` and each pane its own scroll container
(`min-block-size: 0; overflow-y: auto`).
**Use when:** editors, mail clients, admin tools.
**Failure mode:** panes that scroll the document instead of themselves. Every pane needs
`min-height: 0` in its flex or grid context before `overflow-y: auto` does anything.

## Sticky rail beside scrolling content

**Intent:** a summary, table of contents, or purchase panel that stays visible.
**Mechanism:** grid parent, and `position: sticky; top: var(--header-h)` on the rail's
inner element with `align-self: start` so the grid item does not stretch to full row height.
**Failure mode:** forgetting `align-self: start` — a stretched item has nowhere to stick.
Or an ancestor with `overflow: hidden`, which disables sticky entirely.

## Split hero

**Intent:** asymmetric two-part composition, text against media.
**Mechanism:** `grid-template-columns: 5fr 7fr` or similar unequal ratio, not `1fr 1fr`.
**Use when:** you want the composition to read as designed. Unequal ratios carry intent;
equal ratios read as a default.

## Definition grid

**Intent:** label and value pairs that align regardless of label length or language.
**Mechanism:** `grid-template-columns: max-content 1fr` on the `<dl>`, with
`grid-column` assignments on `<dt>` and `<dd>`.
**Use when:** metadata blocks, spec tables, key-value summaries.
**Not when:** labels can be very long — cap with `fit-content(20ch)`.

## Overlay layer

**Intent:** dialogs, popovers, tooltips that must escape ancestor clipping.
**Mechanism:** the top layer — the `popover` attribute or `<dialog>.showModal()` — rather
than a portal plus a large `z-index`. Top-layer elements are painted above the entire
document regardless of stacking contexts, which is the only technique immune to an ancestor
`transform`.
**Failure mode:** a portal-free absolutely positioned overlay inside a transformed ancestor,
which clips or mis-stacks no matter what `z-index` it carries.
