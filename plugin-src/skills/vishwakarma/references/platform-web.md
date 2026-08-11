# Platform: Web

The web's defining constraint is that you do not own the runtime. Viewport size, input modality, network
throughput, font availability, colour scheme, motion tolerance and text scale are all negotiated at the
moment your page paints, on a machine you have never seen, by a user who has already made choices you must
honour. A native app ships its assumptions; a web page discovers them. The practical consequence is that
almost every value you would naturally write as a constant has to be expressed as a rule — a range, a clamp,
a query, a fallback — and the design work is choosing the rule's boundaries rather than the number.

---

## 1. Viewport units and the collapsing browser chrome

`100vh` on a mobile browser does not mean "the height of the visible area". It resolves against the **large
viewport** — the layout as it would be with the URL bar and toolbar retracted. At rest, before any scroll,
that chrome is visible, so a `height: 100vh` hero is taller than the space available and its bottom edge,
usually where the primary call to action lives, is pushed below the fold: a button half-eaten by the address
bar. The mechanism is that the URL bar hides and reveals in response to scroll direction and `vh`
deliberately does not track it, because if it did, every scroll would resize every `vh`-sized element and
force a layout pass mid-gesture — jitter worse than the clipping.

The viewport unit family exists precisely to let you pick which behaviour you want:

| Unit | Resolves against | Use when |
|---|---|---|
| `svh` | Small viewport — chrome fully visible | An element must fit entirely on screen before any scroll |
| `lvh` | Large viewport — chrome fully retracted | A background layer must cover the screen in the retracted state without a seam |
| `dvh` | Dynamic — current state, updates live | The element should track the chrome as it moves |
| `vh` | Large viewport (legacy alias of `lvh`) | Effectively never, on layouts that matter on mobile |

Use `100dvh` for a full-height app shell so the layout follows the chrome, `100svh` for anything that must
be reachable at rest, and `100lvh` for decorative full-bleed backdrops where an over-tall element is
harmless but a gap is not. `dvh` re-lays-out on every chrome transition, so avoid it on containers holding
expensive subtrees; `min-height: 100svh` on the content plus `100lvh` on a fixed background layer gets the
same visual result with no reflow. The same reasoning applies horizontally with `dvw`/`svw`/`lvw`.

## 2. Safe areas, and why the fix usually does nothing

Notches, punch-holes, rounded display corners and the home indicator carve inaccessible regions out of a
rectangular viewport. The browser exposes them as four environment variables — `env(safe-area-inset-top)`,
`-right`, `-bottom`, `-left` — usable anywhere a length is valid, with a fallback as the second argument:
`padding-bottom: env(safe-area-inset-bottom, 0px)`.

The pattern that fails is applying those insets and seeing no change at all, because by default the browser
already lays out inside the safe area, so every inset reports `0px`. The variables carry real values only
once you have opted into drawing under the chrome:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

Without `viewport-fit=cover` in the viewport meta tag, `env()` is not broken — it is correctly reporting
that there is nothing to inset around. Treat these two as a single unit: the day you add `viewport-fit=cover`
you accept responsibility for every edge, and a fixed bottom bar with no
`padding-bottom: env(safe-area-inset-bottom)` sits underneath the home indicator. Insets add to your own
spacing rather than replacing it — `padding-bottom: calc(1rem + env(safe-area-inset-bottom))` — because a
bar padded with only the inset touches the screen edge on devices where the inset is `0px`.

## 3. Input modality: hover is a capability, not a default

`:hover` on a touchscreen is emulated. A tap fires the hover state and the browser leaves it applied until
the user taps elsewhere, because there is no pointer to move away. Two failures follow. A control revealed
on hover — a delete button that appears when a card is hovered — appears only after the first tap, so that
tap does nothing except reveal the control the user was trying to press. A control that exists only on
hover is unreachable outright: no touchscreen gesture produces hover without also producing a click.

Gate hover-dependent affordances on capability rather than width. Screen size is a bad proxy — a 1080p
touchscreen kiosk and a 12.9-inch tablet are both wide and touch-first, a small laptop narrow and mouse-driven:

```css
@media (hover: hover) and (pointer: fine) {
  .card__actions { opacity: 0; transition: opacity 120ms ease-out; }
  .card:hover .card__actions, .card:focus-within .card__actions { opacity: 1; }
}
```

Both conditions matter: `hover: hover` alone is true for a stylus with hover detection, `pointer: fine`
alone for a precise pointer that cannot hover. The corollary is that the state outside the query must be
fully usable — actions visible, hit targets at least 44 by 44 CSS pixels, nothing conveyed by hover alone.

For focus rings, use `:focus-visible` rather than `:focus`. Both match a focused control, but `:focus` also
matches a mouse click, painting a ring around something the user just clicked and can already see — the
reason so many teams removed focus outlines entirely and broke keyboard navigation. `:focus-visible` defers
to the browser's heuristic. Style it explicitly — `outline: 2px solid currentColor; outline-offset: 2px` —
so the ring survives on light and dark surfaces, and pair any `outline: none` with a replacement indicator
in the same rule.

## 4. Container queries: components should respond to their slot

A media query asks how big the window is. A component almost never cares. A product card placed in a
three-column grid, in a narrow sidebar, and in a full-width feature slot needs three different internal
layouts on the same viewport at the same moment — so any breakpoint written against the window is really a
claim about where the component is mounted, and portability ends the instant somebody mounts it elsewhere.
The symptom is a card that looks right on the listing page and broken in the sidebar, patched with a
`.sidebar .card` override, then broken again in the next slot.

Query the container instead: the parent establishes containment on its inline axis, and the child asks
about the space it was actually given.

```css
.card-slot { container-type: inline-size; container-name: card; }
.card { display: grid; gap: 0.75rem; }

@container card (min-width: 28rem) {
  .card { grid-template-columns: 12rem 1fr; align-items: start; }
}
```

`container-type: inline-size` contains size on the inline axis only, so the container's height still follows
its content — this is why it is the right default, and why `container-type: size`, which requires height to
be independent of children, collapses content-sized layouts. A container also cannot query itself: the
query styles descendants, so container and styled element are always different elements.

Container query units (`cqi`, `cqb`, `cqw`, `cqh`, `cqmin`, `cqmax`) resolve against the nearest query
container, making intrinsic proportional sizing possible — `padding: 4cqi` scales a card's padding to the
card's own width. Media queries remain correct for page-level decisions: the global navigation shell, print
styles, and the preference queries in section 10, which describe the user rather than the layout.

## 5. Fluid scales with clamp, and the zoom trap

A fluid type or space scale interpolates between a floor and a ceiling as the viewport changes, replacing a
staircase of breakpoints with a continuous ramp. `clamp(min, preferred, max)` returns the preferred value
constrained to the range, and the design work is entirely in the preferred term — a line through two points,
value `v1` at viewport `w1` and value `v2` at viewport `w2`:

```
slope = (v2 - v1) / (w2 - w1);  intercept = v1 - slope * w1
preferred = calc( <intercept>rem + <slope * 100>vw )
```

For 1rem at 320px growing to 1.5rem at 1280px on a 16px root, the slope is `0.5rem / 960px`, giving
`calc(0.833rem + 0.52vw)` and the token `clamp(1rem, 0.833rem + 0.52vw, 1.5rem)`.

The intercept must be a `rem` component, and this is not stylistic. Page zoom scales the computed value of
`rem` because it scales the root font size, but `vw` is a fraction of the viewport and zoom does not
increase it proportionally. A preferred term of pure `vw` — `clamp(1rem, 2.5vw, 1.5rem)` — therefore
produces text that barely responds to zoom: at 200% the user gets a wider effective layout and the same
visual text size, which is precisely the failure WCAG 1.4.4 exists to prevent. With a `rem` component
present, zoom lifts the intercept and the whole ramp with it. A fluid scale whose preferred term contains
no `rem` or `em` unit is wrong however good the ramp looks at 100%.

Two further constraints. Keep the max-to-min ratio of any single step modest — roughly 1.6 or below —
because a step that grows faster than its neighbours inverts the hierarchy at some viewport width and a
heading ends up smaller than the subheading beneath it. And set the minimum to a value that is comfortable
at 320px rather than the smallest that still renders; body text below `1rem` at the floor is a legibility
decision disguised as a layout decision.

## 6. Font loading, metric matching and layout stability

Layout shift from webfonts is not caused by the swap itself but by the **metric mismatch** between fallback
and webfont: different advance widths reflow the line breaks, and different ascent, descent and line-gap
values change the line box height, so every block below moves. The fix is not to hide the text longer — it
is to make the fallback occupy the same space. `font-display` chooses the failure mode during the block and
swap periods:

| Value | Block | Swap | Result |
|---|---|---|---|
| `block` | ~3s | infinite | Invisible text for up to 3s — a blank LCP element |
| `swap` | ~0ms | infinite | Fallback paints immediately, swaps whenever the font arrives |
| `fallback` | ~100ms | ~3s | Brief block, then fallback wins permanently after 3s |
| `optional` | ~100ms | 0ms | Font used only if ready almost immediately; otherwise fallback for the whole load, zero shift |

Use `swap` with metric-matched fallbacks for brand-critical faces, and `optional` for faces whose absence is
acceptable — it guarantees zero shift because there is no swap window at all, at the cost of some users
seeing the fallback for their whole first visit (the font is cached for the next navigation). Metric
matching is done with descriptors on a fallback `@font-face` pointing at a local system family:

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

`size-adjust` scales the glyph outlines so average advance width matches, fixing reflow; `ascent-override`
and `descent-override` fix the line box height, fixing vertical displacement. Derive the percentages from
the two faces' `unitsPerEm`, `ascender`, `descender` and average character width rather than by eye.

Preload the single face that renders the largest above-the-fold text, and only that one:
`<link rel="preload" as="font" type="font/woff2" href="/f/inter-var.woff2" crossorigin>`. The `crossorigin`
attribute is required even for same-origin fonts, because fonts are fetched in CORS mode — omitting it causes
a second, duplicate fetch, so the preload makes the page slower. Preloading four faces is worse than
preloading none: they compete with the LCP image for the same connection during the critical phase. Subset to
the scripts used, ship `woff2` only, and prefer one variable face to four static weights.

## 7. Core Web Vitals as design constraints

The three field metrics are thresholds you design toward, not measurements you take afterwards:

| Metric | Good | Meaning |
|---|---|---|
| **LCP** | ≤ 2.5s | Render time of the largest text block or image in the initial viewport |
| **INP** | ≤ 200ms | Worst-case (near-worst) latency from interaction to next paint across the visit |
| **CLS** | ≤ 0.1 | Sum of the largest burst of unexpected layout shift scores |

All three are assessed at the **75th percentile of real user sessions** over a rolling 28-day window. That
percentile is the whole reason lab numbers mislead: a development machine on a fast connection with a warm
cache sits near the 5th percentile, so passing locally says nothing about the quarter of users who determine
the grade. Throttle to a mid-tier device profile and a slow 4G connection for any lab run meant to predict
the field, and treat field data as authoritative when the two disagree.

The causes are stable enough to check by inspection. **LCP** is almost always the hero image or a heading
rendered in a webfont: the image because it was discovered late (lazy-loaded above the fold, injected by
JavaScript, or hidden inside a client-side carousel), the heading because a blocking font delayed its paint.
Mark the LCP image `fetchpriority="high"`, never `loading="lazy"`, and put it in the initial HTML rather than
inserting it after hydration. **INP** is a long main-thread task during interaction — hydration, a large
re-render, an expensive input handler — and the fix is to yield: break work at `await scheduler.yield()` or
`setTimeout` boundaries so the browser paints the visual response before the work finishes. Acknowledge
first, compute second. **CLS** is unsized media, content injected above content that has already painted
(cookie banners, promo bars, late ads), and font swaps; give every image and video an explicit `width` and
`height` or `aspect-ratio`, and reserve space with `min-height` for anything arriving later. Shift within
500ms of a user interaction is excluded, which is why an accordion pushing content down is fine and a banner
doing the same on a timer is not.

## 8. Rendering discipline

The browser's frame pipeline runs style, layout, paint and composite. Changing a geometric property —
`width`, `top`, `margin` — invalidates layout and forces the full pipeline for the affected subtree, while
changing `transform` or `opacity` on a composited element touches only the last stage, which is why those
two are the only properties safe to animate at 60fps and above. Animating `left` from `0` to `200px` looks
identical to `transform: translateX(200px)` on a fast machine and drops frames on a slow one, because the
first re-runs layout every frame and the second does not.

CSS animations and transitions, and the Web Animations API, run on the compositor thread when they affect
only composited properties. This matters most when things are going badly: a long JavaScript task blocks the
main thread, so a `requestAnimationFrame` loop freezes while a CSS transition of the same motion continues
smoothly. Prefer declarative animation for anything the user watches during load or route transitions.

`content-visibility: auto` skips rendering work for elements outside the viewport, removing their layout and
paint cost from the frame and turning an O(n) layout into roughly O(visible) on a long list. Pair it with
`contain-intrinsic-size` carrying the element's estimated dimensions — without that, skipped elements
contribute zero height and the scrollbar jumps as the user scrolls into them.

`will-change` promotes an element to its own compositor layer ahead of time, at the cost of GPU memory held
for as long as the declaration applies. Applied broadly — `.card { will-change: transform }` on a grid of
200 cards — it exhausts the budget, and the browser starts refusing promotions or evicting layers, making
the page slower than if you had never used it. Apply it shortly before the animation starts, remove it on
completion, and prefer letting the browser promote on its own, as it does for running compositor animations.

## 9. Colour and theming

Define colour in **OKLCh**, a perceptually uniform space where `L` is perceived lightness, `C` is chroma and
`H` is hue angle. Uniformity is the point: in `hsl()`, holding lightness constant and rotating hue produces
wildly different perceived brightness — yellow at `hsl(60 100% 50%)` is far lighter than blue at
`hsl(240 100% 50%)` — so an HSL palette cannot hold contrast constant across hues. In OKLCh, constant `L`
means constant perceived lightness, which is what makes a systematic ramp possible and contrast predictable
before you measure it. OKLCh also reaches colours outside sRGB on wide-gamut displays, so give an sRGB
fallback first and upgrade inside a feature query:

```css
:root { --accent: #3b5bdb; }
@supports (color: oklch(0.5 0.1 250)) {
  :root { --accent: oklch(0.55 0.17 262); }
}
```

Declare `color-scheme: light dark` on `:root` so the browser themes form controls, scrollbars, spell-check
underlines and the default canvas — without it, a dark page keeps light scrollbars and white-backed selects.
Read the preference with `prefers-color-scheme` and hold resolved values in CSS custom properties, so a
theme is a change of variable values on one element rather than a parallel set of component rules.

Theme flash has exactly one cause: the first paint used a theme that was later corrected. Any resolution
that happens in a framework effect, after hydration, or in a deferred script is by definition after first
paint, so the user sees white then dark. The fix is to set the theme class or `data-theme` attribute
**before** the browser paints, with a small synchronous inline script in `<head>`, which runs before body
content is parsed so no incorrect frame is ever composited:

```html
<script>
  try {
    const t = localStorage.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
    document.documentElement.style.colorScheme = t;
  } catch {}
</script>
```

This is the one place where a render-blocking script is correct; keep it under about 1KB, wrap it in
`try/catch` because `localStorage` throws in some privacy modes, and set `color-scheme` in the same script so
native controls match from the first frame too.

## 10. User preference queries

Each of these reports a setting the user has already made at the operating system level, so an unhandled
branch is not a missing feature — it is an ignored instruction.

`prefers-reduced-motion: reduce` is set by people for whom vestibular motion causes nausea or migraine. The
correct response is not to remove all animation, which destroys the continuity cues that make an interface
legible, but to remove **large-area movement, parallax and scaling** while keeping opacity and colour
transitions under about 150ms. Write the reduced branch as an explicit rule rather than a global
`animation: none !important`, which breaks components relying on an `animationend` event to clean up.

`prefers-reduced-transparency: reduce` asks for opaque surfaces; replace `backdrop-filter: blur()` panels with
a solid background, which also removes their real rendering cost. `prefers-contrast: more` asks for stronger
separation: raise text contrast toward 7:1 and make borders explicit rather than implied by a subtle shadow.
`forced-colors: active` means the operating system has substituted its own palette — your colours are
overridden and background images on interactive elements are dropped — so use `forced-color-adjust` sparingly
and express boundaries with real `border` declarations, since a shadow-only separator vanishes entirely.

## 11. Semantic HTML as the accessibility substrate

A native `<button>` arrives with four behaviours implemented: it is in the tab order without `tabindex`, it
activates on both Enter and Space, it exposes the `button` role to assistive technology, and it reports
disabled and pressed state through the accessibility tree. A `<div role="button">` has one of those — the
role — and you must rebuild the other three. In practice teams add `tabindex="0"` and a click handler, ship
it, then discover months later that Space scrolls the page instead of activating the control. Custom elements
are not forbidden; the point is that every native behaviour you discard is a defect you have not found yet.

The same logic covers the rest of the substrate. Landmarks — `<header>`, `<nav>`, `<main>`, `<aside>`,
`<footer>` — give screen reader users a jump menu that no visual layout provides; exactly one `<main>` per
page. Headings must descend without skipping levels, because heading navigation is how non-visual users
scan, and a jump from `<h2>` to `<h4>` reads as a missing section. Every form control needs a programmatic
label — `<label for>` pointing at the control's `id`, or a wrapping `<label>`. Placeholder text is not one:
it vanishes on focus, usually fails contrast, and is not reliably announced.

`<dialog>` with `showModal()` gives focus trapping, inert background content, Escape-to-close and the
`::backdrop` pseudo-element with no JavaScript. The Popover API (`popover` plus `popovertarget`) gives
light-dismiss, top-layer stacking and focus management for non-modal surfaces such as menus and tooltips.
Both promote the element to the **top layer**, which is why they escape the `overflow: hidden` and `z-index`
stacking contexts that trap a hand-rolled dropdown inside a scrolling panel.

## 12. Progressive enhancement of modern CSS

`@supports` tests a declaration's parseability, not its correctness, so it is reliable for property/value
support and useless for judging whether a feature is well implemented. Test the risky declaration itself,
never a proxy for it.

| Feature | Fallback needed? | Degradation without it |
|---|---|---|
| `:has()` | No | Selector does not match; base styles apply, layout stays valid |
| `@container` | Yes, for load-bearing layout | All container rules ignored; component renders at its base layout |
| `@starting-style`, View Transitions | No | Element appears or navigation happens without the transition |
| Scroll-driven animations (`animation-timeline`) | Yes, if state depends on it | Animation runs on the document timeline and plays once immediately |
| Anchor positioning (`anchor-name`, `position-anchor`) | Yes | Positioned element falls back to its containing block, often the wrong place |
| `subgrid` | Yes, for alignment-critical grids | Nested grid gets its own tracks; columns stop lining up |

The dividing line is decorative versus structural: a missing view transition costs an animation, a missing
container query costs a layout. Write the base layer complete and usable on its own, then add the
enhancement — the reverse order produces a base layer that was never tested and appears only on the browsers
you did not check. Scroll-driven animations deserve particular care because the failure is not "nothing
happens": an unhonoured `animation-timeline: view()` falls back to the document timeline and plays at once
on load, so an element meant to fade in on scroll is already faded in.

## Pass conditions

### Viewport, input and responsiveness

- Does any full-height element use `100vh` rather than `100dvh` or `100svh`?
- Is `viewport-fit=cover` present wherever `env(safe-area-inset-*)` is used, and does every inset carry a fallback and add to intrinsic padding rather than replacing it?
- Is every hover-revealed or hover-only affordance wrapped in `@media (hover: hover) and (pointer: fine)`, with the state outside that query fully usable and all hit targets at least 44 by 44 CSS pixels?
- Are focus rings styled with `:focus-visible` and a visible `outline-offset`, with no `outline: none` left without a replacement indicator?
- Do component-level layout switches use `@container` with `container-type: inline-size` rather than viewport media queries?
- Does every `clamp()` preferred term include a `rem` or `em` component, and is each step's max-to-min ratio at or below roughly 1.6?
- Does hierarchy hold at both 320px and 1920px, and does the layout remain usable at 200% browser zoom?

### Fonts, rendering and field performance

- Is exactly one font face preloaded, with `crossorigin` present, and does every `@font-face` declare `font-display: swap` or `optional`?
- Does each webfont family have a metric-matched fallback with `size-adjust` and `ascent-override`?
- Are LCP ≤ 2.5s, INP ≤ 200ms and CLS ≤ 0.1 met at P75 in field data rather than only in a lab run?
- Is the LCP element in the initial HTML, marked `fetchpriority="high"` and not `loading="lazy"`, and do all images and video carry explicit dimensions or `aspect-ratio`?
- Do all animations affect only `transform` and `opacity`, is `will-change` scoped and removed after use, and do long lists pair `content-visibility: auto` with `contain-intrinsic-size`?

### Colour, theming and preferences

- Are colours defined in OKLCh with an sRGB fallback ahead of an `@supports` upgrade?
- Does the theme resolve in a synchronous inline `<head>` script before first paint, wrapped in `try/catch`, and does it set `color-scheme` alongside the theme attribute?
- Does each of `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`, `prefers-color-scheme` and `forced-colors` have a handled branch?

### Markup and enhancement

- Are all interactive controls native elements, or do custom controls implement focusability, keyboard activation, role and state?
- Is there exactly one `<main>`, a labelled `<nav>` per navigation region, a heading order with no skipped levels, and a real `<label>` on every form control?
- Are modal and overlay surfaces built on `<dialog>` with `showModal()` or the Popover API rather than hand-rolled overlays?
- Is every structural modern-CSS feature — container queries, scroll-driven animations, anchor positioning, subgrid — behind `@supports` with a usable base layer?
