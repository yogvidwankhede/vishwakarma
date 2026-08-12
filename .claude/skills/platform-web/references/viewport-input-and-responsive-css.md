# Viewport units, safe areas, input modality, container queries, and fluid scales

## 1. Viewport units and the collapsing browser chrome

`100vh` on a mobile browser does not mean "the height of the visible area". It resolves against
the **large viewport** — the layout as it would be with the URL bar and toolbar retracted. At
rest, before any scroll, that chrome is visible, so a `height: 100vh` hero is taller than the
space available and its bottom edge, usually where the primary call to action lives, is pushed
below the fold: a button half-eaten by the address bar. The mechanism is that the URL bar hides
and reveals in response to scroll direction and `vh` deliberately does not track it, because if
it did, every scroll would resize every `vh`-sized element and force a layout pass mid-gesture —
jitter worse than the clipping.

The viewport unit family exists precisely to let you pick which behaviour you want:

| Unit | Resolves against | Use when |
|---|---|---|
| `svh` | Small viewport — chrome fully visible | An element must fit entirely on screen before any scroll |
| `lvh` | Large viewport — chrome fully retracted | A background layer must cover the screen in the retracted state without a seam |
| `dvh` | Dynamic — current state, updates live | The element should track the chrome as it moves |
| `vh` | Large viewport (legacy alias of `lvh`) | Effectively never, on layouts that matter on mobile |

Use `100dvh` for a full-height app shell so the layout follows the chrome, `100svh` for
anything that must be reachable at rest, and `100lvh` for decorative full-bleed backdrops where
an over-tall element is harmless but a gap is not. `dvh` re-lays-out on every chrome transition,
so avoid it on containers holding expensive subtrees; `min-height: 100svh` on the content plus
`100lvh` on a fixed background layer gets the same visual result with no reflow. The same
reasoning applies horizontally with `dvw`/`svw`/`lvw`.

## 2. Safe areas, and why the fix usually does nothing

Notches, punch-holes, rounded display corners and the home indicator carve inaccessible regions
out of a rectangular viewport. The browser exposes them as four environment variables —
`env(safe-area-inset-top)`, `-right`, `-bottom`, `-left` — usable anywhere a length is
valid, with a fallback as the second argument:
`padding-bottom: env(safe-area-inset-bottom, 0px)`.

The pattern that fails is applying those insets and seeing no change at all, because by default
the browser already lays out inside the safe area, so every inset reports `0px`. The variables
carry real values only once you have opted into drawing under the chrome:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

Without `viewport-fit=cover` in the viewport meta tag, `env()` is not broken — it is correctly
reporting that there is nothing to inset around. Treat these two as a single unit: the day you add
`viewport-fit=cover` you accept responsibility for every edge, and a fixed bottom bar with no
`padding-bottom: env(safe-area-inset-bottom)` sits underneath the home indicator. Insets add to
your own spacing rather than replacing it —
`padding-bottom: calc(1rem + env(safe-area-inset-bottom))` — because a bar padded with only the
inset touches the screen edge on devices where the inset is `0px`.

## 3. Input modality: hover is a capability, not a default

`:hover` on a touchscreen is emulated. A tap fires the hover state and the browser leaves it
applied until the user taps elsewhere, because there is no pointer to move away. Two failures
follow. A control revealed on hover — a delete button that appears when a card is hovered —
appears only after the first tap, so that tap does nothing except reveal the control the user was
trying to press. A control that exists only on hover is unreachable outright: no touchscreen
gesture produces hover without also producing a click.

Gate hover-dependent affordances on capability rather than width. Screen size is a bad proxy — a
1080p touchscreen kiosk and a 12.9-inch tablet are both wide and touch-first, a small laptop
narrow and mouse-driven:

```css
@media (hover: hover) and (pointer: fine) {
  .card__actions { opacity: 0; transition: opacity 120ms ease-out; }
  .card:hover .card__actions, .card:focus-within .card__actions { opacity: 1; }
}
```

Both conditions matter: `hover: hover` alone is true for a stylus with hover detection,
`pointer: fine` alone for a precise pointer that cannot hover. The corollary is that the state
outside the query must be fully usable — actions visible, hit targets at least 44 by 44 CSS
pixels, nothing conveyed by hover alone.

For focus rings, use `:focus-visible` rather than `:focus`. Both match a focused control, but
`:focus` also matches a mouse click, painting a ring around something the user just clicked and
can already see — the reason so many teams removed focus outlines entirely and broke keyboard
navigation. `:focus-visible` defers to the browser's heuristic. Style it explicitly —
`outline: 2px solid currentColor; outline-offset: 2px` — so the ring survives on light and dark
surfaces, and pair any `outline: none` with a replacement indicator in the same rule.

## 4. Container queries: components should respond to their slot

A media query asks how big the window is. A component almost never cares. A product card placed in
a three-column grid, in a narrow sidebar, and in a full-width feature slot needs three different
internal layouts on the same viewport at the same moment — so any breakpoint written against the
window is really a claim about where the component is mounted, and portability ends the instant
somebody mounts it elsewhere. The symptom is a card that looks right on the listing page and broken
in the sidebar, patched with a `.sidebar .card` override, then broken again in the next slot.

Query the container instead: the parent establishes containment on its inline axis, and the child
asks about the space it was actually given.

```css
.card-slot { container-type: inline-size; container-name: card; }
.card { display: grid; gap: 0.75rem; }

@container card (min-width: 28rem) {
  .card { grid-template-columns: 12rem 1fr; align-items: start; }
}
```

`container-type: inline-size` contains size on the inline axis only, so the container's height
still follows its content — this is why it is the right default, and why `container-type: size`,
which requires height to be independent of children, collapses content-sized layouts. A container
also cannot query itself: the query styles descendants, so container and styled element are always
different elements.

Container query units (`cqi`, `cqb`, `cqw`, `cqh`, `cqmin`, `cqmax`) resolve against
the nearest query container, making intrinsic proportional sizing possible — `padding: 4cqi`
scales a card's padding to the card's own width. Media queries remain correct for page-level
decisions: the global navigation shell, print styles, and the preference queries, which describe
the user rather than the layout.

## 5. Fluid scales with clamp, and the zoom trap

A fluid type or space scale interpolates between a floor and a ceiling as the viewport changes,
replacing a staircase of breakpoints with a continuous ramp. `clamp(min, preferred, max)` returns
the preferred value constrained to the range, and the design work is entirely in the preferred
term — a line through two points, value `v1` at viewport `w1` and value `v2` at viewport
`w2`:

```
slope = (v2 - v1) / (w2 - w1);  intercept = v1 - slope * w1
preferred = calc( <intercept>rem + <slope * 100>vw )
```

For 1rem at 320px growing to 1.5rem at 1280px on a 16px root, the slope is `0.5rem / 960px`,
giving `calc(0.833rem + 0.52vw)` and the token `clamp(1rem, 0.833rem + 0.52vw, 1.5rem)`.

The intercept must be a `rem` component, and this is not stylistic. Page zoom scales the computed
value of `rem` because it scales the root font size, but `vw` is a fraction of the viewport and
zoom does not increase it proportionally. A preferred term of pure `vw` —
`clamp(1rem, 2.5vw, 1.5rem)` — therefore produces text that barely responds to zoom: at 200% the
user gets a wider effective layout and the same visual text size, which is precisely the failure
WCAG 1.4.4 exists to prevent. With a `rem` component present, zoom lifts the intercept and the
whole ramp with it. A fluid scale whose preferred term contains no `rem` or `em` unit is wrong
however good the ramp looks at 100%.

Two further constraints. Keep the max-to-min ratio of any single step modest — roughly 1.6 or
below — because a step that grows faster than its neighbours inverts the hierarchy at some viewport
width and a heading ends up smaller than the subheading beneath it. And set the minimum to a value
that is comfortable at 320px rather than the smallest that still renders; body text below `1rem`
at the floor is a legibility decision disguised as a layout decision.

## Pass conditions

### Viewport, input and responsiveness

- Does any full-height element use `100vh` rather than `100dvh` or `100svh`?
- Is `viewport-fit=cover` present wherever `env(safe-area-inset-*)` is used, and does every inset carry a fallback and add to intrinsic padding rather than replacing it?
- Is every hover-revealed or hover-only affordance wrapped in `@media (hover: hover) and (pointer: fine)`, with the state outside that query fully usable and all hit targets at least 44 by 44 CSS pixels?
- Are focus rings styled with `:focus-visible` and a visible `outline-offset`, with no `outline: none` left without a replacement indicator?
- Do component-level layout switches use `@container` with `container-type: inline-size` rather than viewport media queries?
- Does every `clamp()` preferred term include a `rem` or `em` component, and is each step's max-to-min ratio at or below roughly 1.6?
- Does hierarchy hold at both 320px and 1920px, and does the layout remain usable at 200% browser zoom?
