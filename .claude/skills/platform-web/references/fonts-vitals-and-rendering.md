# Font loading, Core Web Vitals, and rendering discipline

## 1. Font loading, metric matching and layout stability

Layout shift from webfonts is not caused by the swap itself but by the **metric mismatch** between
fallback and webfont: different advance widths reflow the line breaks, and different ascent,
descent and line-gap values change the line box height, so every block below moves. The fix is not
to hide the text longer — it is to make the fallback occupy the same space. `font-display`
chooses the failure mode during the block and swap periods:

| Value | Block | Swap | Result |
|---|---|---|---|
| `block` | ~3s | infinite | Invisible text for up to 3s — a blank LCP element |
| `swap` | ~0ms | infinite | Fallback paints immediately, swaps whenever the font arrives |
| `fallback` | ~100ms | ~3s | Brief block, then fallback wins permanently after 3s |
| `optional` | ~100ms | 0ms | Font used only if ready almost immediately; otherwise fallback for the whole load, zero shift |

Use `swap` with metric-matched fallbacks for brand-critical faces, and `optional` for faces
whose absence is acceptable — it guarantees zero shift because there is no swap window at all, at
the cost of some users seeing the fallback for their whole first visit (the font is cached for the
next navigation). Metric matching is done with descriptors on a fallback `@font-face` pointing at
a local system family:

```css
@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}
:root { --font-sans: "Inter", "Inter Fallback", system-ui, sans-serif; }
```

`size-adjust` scales the glyph outlines so average advance width matches, fixing reflow;
`ascent-override` and `descent-override` fix the line box height, fixing vertical displacement.
Derive the percentages from the two faces' `unitsPerEm`, `ascender`, `descender` and average
character width rather than by eye.

Preload the single face that renders the largest above-the-fold text, and only that one:
`<link rel="preload" as="font" type="font/woff2" href="/f/inter-var.woff2" crossorigin>`. The
`crossorigin` attribute is required even for same-origin fonts, because fonts are fetched in CORS
mode — omitting it causes a second, duplicate fetch, so the preload makes the page slower.
Preloading four faces is worse than preloading none: they compete with the LCP image for the same
connection during the critical phase. Subset to the scripts used, ship `woff2` only, and prefer
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
blocking font delayed its paint. Mark the LCP image `fetchpriority="high"`, never
`loading="lazy"`, and put it in the initial HTML rather than inserting it after hydration.
**INP** is a long main-thread task during interaction — hydration, a large re-render, an expensive
input handler — and the fix is to yield: break work at `await scheduler.yield()` or
`setTimeout` boundaries so the browser paints the visual response before the work finishes.
Acknowledge first, compute second. **CLS** is unsized media, content injected above content that
has already painted (cookie banners, promo bars, late ads), and font swaps; give every image and
video an explicit `width` and `height` or `aspect-ratio`, and reserve space with
`min-height` for anything arriving later. Shift within 500ms of a user interaction is excluded,
which is why an accordion pushing content down is fine and a banner doing the same on a timer is
not.

## 3. Rendering discipline

The browser's frame pipeline runs style, layout, paint and composite. Changing a geometric property
— `width`, `top`, `margin` — invalidates layout and forces the full pipeline for the affected
subtree, while changing `transform` or `opacity` on a composited element touches only the last
stage, which is why those two are the only properties safe to animate at 60fps and above.
Animating `left` from `0` to `200px` looks identical to `transform: translateX(200px)` on a
fast machine and drops frames on a slow one, because the first re-runs layout every frame and the
second does not.

CSS animations and transitions, and the Web Animations API, run on the compositor thread when they
affect only composited properties. This matters most when things are going badly: a long
JavaScript task blocks the main thread, so a `requestAnimationFrame` loop freezes while a CSS
transition of the same motion continues smoothly. Prefer declarative animation for anything the
user watches during load or route transitions.

`content-visibility: auto` skips rendering work for elements outside the viewport, removing their
layout and paint cost from the frame and turning an O(n) layout into roughly O(visible) on a long
list. Pair it with `contain-intrinsic-size` carrying the element's estimated dimensions — without
that, skipped elements contribute zero height and the scrollbar jumps as the user scrolls into
them.

`will-change` promotes an element to its own compositor layer ahead of time, at the cost of GPU
memory held for as long as the declaration applies. Applied broadly —
`.card { will-change: transform }` on a grid of 200 cards — it exhausts the budget, and the
browser starts refusing promotions or evicting layers, making the page slower than if you had never
used it. Apply it shortly before the animation starts, remove it on completion, and prefer letting
the browser promote on its own, as it does for running compositor animations.

## Pass conditions

### Fonts, rendering and field performance

- Is exactly one font face preloaded, with `crossorigin` present, and does every `@font-face` declare `font-display: swap` or `optional`?
- Does each webfont family have a metric-matched fallback with `size-adjust` and `ascent-override`?
- Are LCP ≤ 2.5s, INP ≤ 200ms and CLS ≤ 0.1 met at P75 in field data rather than only in a lab run?
- Is the LCP element in the initial HTML, marked `fetchpriority="high"` and not `loading="lazy"`, and do all images and video carry explicit dimensions or `aspect-ratio`?
- Do all animations affect only `transform` and `opacity`, is `will-change` scoped and removed after use, and do long lists pair `content-visibility: auto` with `contain-intrinsic-size`?
