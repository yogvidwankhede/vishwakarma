# The viewport test matrix

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
  or card with `height` rather than `min-height`.
- No text is truncated with an ellipsis where the full string matters.
- Sticky headers do not consume most of the viewport height.
- Text sized in `vw` alone will not respond to a text-only resize; check with the browser's
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

Foldable devices can expose a viewport split by a hinge. The `horizontal-viewport-segments`
and `vertical-viewport-segments` media features, with the `env(viewport-segment-*)`
variables, describe the geometry, but support is still narrow. The pragmatic requirement is
weaker and always applies: do not place a single critical control at the horizontal centre of
a wide viewport, because on a folded device that is exactly where the hinge is.

---

## Automating part of this

A resize sweep is manual, but three checks are worth wiring into CI with a headless browser:
assert `document.documentElement.scrollWidth <= innerWidth` at 320px on every route; assert
no element's bounding box extends past the viewport's right edge; and screenshot each route
at 320, 768, and 1440 to diff against a baseline. Those three catch most regressions that
reach production.
