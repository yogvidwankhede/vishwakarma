# Debugging layout overflow

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
`document.scrollingElement.scrollWidth` compared with `clientWidth`.

If the culprit is inside a subtree, bisect by setting `overflow: hidden` temporarily on
candidate ancestors; the one that stops the page scrollbar contains the offender.

## Step 2 — Identify which floor is holding it open

**Automatic minimum size (the usual answer).** Flex and grid items compute `min-width: auto`,
which resolves to their min-content size. Anything with a wide indivisible child — a long
URL, a `<pre>`, a `<table>`, an SVG with an intrinsic width, an unbreakable token — cannot
go below it.
*Fix:* `min-width: 0` on the item, or `minmax(0, 1fr)` on the grid track. Add
`overflow-wrap: anywhere` or `text-overflow: ellipsis` for the visible text.

**`100vw`.** Viewport units include the classic scrollbar gutter; the containing block does
not. Any `width: 100vw` on a page with a vertical scrollbar overflows by the scrollbar
width on desktop.
*Fix:* use the gutter-grid full-bleed technique, or `width: 100%`. `scrollbar-gutter:
stable` and `100dvw` mitigate but do not eliminate the mismatch.

**Fixed widths.** Any `width` in `px` on a child that must fit a narrow parent.
*Fix:* `max-width: 100%`, or `min(320px, 100%)`.

**Images and media.** An `<img>` without `max-width: 100%` renders at intrinsic width.
*Fix:* a global `img, svg, video, canvas { max-width: 100%; height: auto; }`.

**Negative margins.** A negative inline margin pulls a box outside its parent's content box,
and nothing clips it by default.

**Transforms.** `rotate`, `scale`, and `translate` change painted geometry but not
layout. A rotated card still occupies its untransformed box, so it visually overflows without
appearing to. The document scroll area *does* include transformed paint area.
*Fix:* `overflow: clip` on the wrapper — `clip` rather than `hidden`, because `hidden`
creates a scroll container and disables ancestor `position: sticky`.

**Absolutely positioned decoration.** Blobs, glows, and offset shapes positioned beyond the
edge. Same fix: `overflow: clip` on a wrapper that is `position: relative`.

**Grid tracks that cannot shrink.** `grid-template-columns: 300px 1fr` on a 320px viewport
overflows by construction.
*Fix:* `minmax(0, 300px)`, or switch tracks inside a container query.

**Tables.** A `<table>` sizes to content and ignores its parent's width.
*Fix:* wrap it in `overflow-x: auto` with `tabindex="0"` so keyboard users can scroll it,
or use `table-layout: fixed` with explicit column widths.

## Step 3 — The related non-overflow bugs with the same cause

**"My panel does not scroll."** A flex column child with `overflow-y: auto` needs
`min-height: 0`; otherwise its automatic minimum size equals its content height, so there
is nothing to overflow. In grid, the equivalent is a row track of `minmax(0, 1fr)`.

**"Sticky does nothing."** Any ancestor with `overflow` set to `hidden`, `auto`, or
`scroll` becomes the sticky element's scroll container, and if that container does not
scroll, the element never sticks. A sticky element also needs an inset — `top`, `bottom`,
or the logical equivalent — and must not be stretched by `align-self: stretch`.

**"My modal is behind a card."** `z-index` only orders siblings inside a stacking context.
An ancestor with `transform`, `filter`, `opacity` below 1, `will-change`,
`backdrop-filter`, or `contain: paint` traps the whole subtree.
*Fix:* render into the top layer via `<dialog>` or the `popover` attribute, which ignores
stacking contexts entirely.

## Step 4 — Verify at the boundaries

Overflow that only appears at extremes is still overflow.

- 320px width, which is the narrowest viewport in common use.
- 200% browser zoom at 1280px, which WCAG 1.4.10 (Reflow) requires to behave like a 640px
  viewport with no two-dimensional scrolling.
- The longest realistic string in every field, plus one 60-character unbroken token.
- A right-to-left locale, which surfaces every physical property that should have been
  logical (`margin-inline-start` rather than `margin-left`).
- With and without a visible scrollbar; macOS overlay scrollbars hide an entire class of bug
  that Windows users see immediately.

## Prevention

Prefer `minmax(0, 1fr)` over `1fr` by default. Set `min-width: 0` on flex children that
hold text. Use logical properties. Clip decoration at a wrapper with `overflow: clip`.
Never write `100vw` for a width. These five habits remove the majority of overflow defects
before they exist.
