# Platform: Web

The web's defining constraint is that you do not own the runtime. Viewport size, input modality,
throughput, font availability, colour scheme, motion tolerance and text scale are all negotiated
at the moment your page paints, by a user who has already made choices you must honour. Almost
every value you would write as a constant therefore has to become a rule — a range, a clamp, a
query, a fallback — and the design work is choosing its boundaries rather than the number.

---

## 1. Viewport units and safe areas

`100vh` resolves against the **large viewport**, the layout as it would be with the URL bar
retracted, so at rest a `100vh` hero is taller than the space available and its bottom edge —
usually the primary call to action — sits below the fold. Use `100dvh` for a shell that follows
the chrome, `100svh` for anything reachable before any scroll, and `100lvh` for decorative
backdrops where an over-tall element is harmless but a gap is not.

`env(safe-area-inset-*)` reports `0px` until `viewport-fit=cover` is in the viewport meta
tag, which is why applying the insets often appears to do nothing: the browser already lays out
inside the safe area. Treat the two as one unit — adding `viewport-fit=cover` accepts
responsibility for every edge. Insets add to your own spacing rather than replacing it
(`calc(1rem + env(safe-area-inset-bottom))`), since an inset-only bar is flush against the glass
where the inset is zero.

## 2. Input modality

`:hover` on a touchscreen is emulated: a tap fires it and it stays applied until the user taps
elsewhere, so a hover-revealed control appears only after a first tap that does nothing else, and
a hover-only control is unreachable outright. Gate on capability, not width:
`@media (hover: hover) and (pointer: fine)` — both conditions, since the first alone matches a
hovering stylus and the second a precise pointer that cannot hover. Outside the query everything
must stay usable, with targets at least 44 by 44 CSS pixels. Use `:focus-visible`, not
`:focus`, which also matches a mouse click and rings something the user just clicked — the
reason teams removed outlines and broke keyboard navigation.

## 3. Container queries

A media query asks how big the window is; a component almost never cares. A card in a three-column
grid, a sidebar, and a feature slot needs three internal layouts at one viewport width, so a window
breakpoint is really a claim about where the component is mounted, and portability ends when
someone mounts it elsewhere. Give the slot `container-type: inline-size` and query it — one axis
contained, so height still follows content.

## 4. Fluid scales and the zoom trap

`clamp(min, preferred, max)` replaces a staircase of breakpoints with a ramp, and the design work
is the preferred term — a line through `v1` at `w1` and `v2` at `w2`, expressed as
`calc(<intercept>rem + <slope × 100>vw)`. **The intercept must be a `rem` term.** Zoom scales the root font size and therefore `rem`,
but `vw` is a fraction of the viewport and does not grow proportionally, so a pure `vw`
preferred term barely responds to zoom — at 200% the user gets a wider layout at the same visual
text size, exactly the failure WCAG 1.4.4 exists to prevent. Keep each step's max-to-min ratio at
roughly 1.6 or below, or a heading ends up smaller than its subheading at some width.

## 5. Font loading

Layout shift from webfonts comes from the **metric mismatch** between fallback and webfont, not
from the swap: different advance widths reflow line breaks and different ascent and descent change
the line box height, so every block below moves. Make the fallback occupy the same space, with
`size-adjust`, `ascent-override` and `descent-override` on a fallback `@font-face` over a
local family. Use `font-display: swap` for brand-critical faces and `optional` where absence is
acceptable, since `optional` has no swap window and therefore zero shift. Preload exactly one
face, with `crossorigin` — required even same-origin, since fonts fetch in CORS mode.

## 6. Core Web Vitals

LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, at the **75th percentile of real sessions** over 28 days,
which is why lab numbers mislead: a dev machine sits near the 5th. LCP is almost always a hero image discovered late or a heading blocked on a font —
mark it `fetchpriority="high"`, never `loading="lazy"`, and put it in the initial HTML. INP is
a long main-thread task during interaction; yield at `scheduler.yield()` boundaries so the
browser paints the response first. CLS is unsized media, late-injected content, and font swaps,
excluding shift within 500ms of an interaction.

## 7. Rendering discipline

Changing `width`, `top` or `margin` invalidates layout and re-runs the pipeline for the
subtree, while `transform` and `opacity` on a composited element touch only the last stage,
which is why they are the only two safe to animate at 60fps. `content-visibility: auto` turns O(n) layout into roughly O(visible), but without
`contain-intrinsic-size` skipped elements contribute zero height and the scrollbar jumps, and
`will-change` spread across 200 cards exhausts the GPU budget until the browser refuses
promotions.

## 8. Colour and theming

Author in **OKLCh**, where `L` is perceived lightness: in `hsl()`, holding lightness constant
and rotating hue changes perceived brightness wildly, so an HSL palette cannot hold contrast
constant across hues. Give an sRGB fallback ahead of an `@supports` upgrade, and declare
`color-scheme: light dark` so the browser themes native controls.

Theme flash has one cause: the first paint used a theme later corrected. Any resolution in an
effect, after hydration, or in a deferred script is by definition after first paint. Set the theme
attribute in a synchronous inline `<head>` script, wrapped in `try/catch`, and set
`color-scheme` there too.

## 9. Preference queries

Each reports a setting the user has already made, so an unhandled branch is an ignored
instruction. `prefers-reduced-motion` means removing large-area movement,
parallax and scaling while keeping opacity and colour transitions under about 150ms — written as
an explicit rule, not `animation: none !important`, which breaks components relying on
`animationend`. `prefers-reduced-transparency` replaces `backdrop-filter` panels
with solid backgrounds. `forced-colors: active` drops your palette and background images on interactive elements, so
express boundaries with real `border` declarations — a shadow-only separator vanishes.

## 10. Semantic HTML

A native `<button>` arrives with four behaviours: tab order without `tabindex`, activation on
Enter and Space, the `button` role, and state in the accessibility tree. A `<div role="button">`
has one of them, and every native behaviour you discard is a defect you have not found yet.
Landmarks give a jump menu no visual layout provides, with exactly one `<main>`; headings descend
without skipping levels, because that is how non-visual users scan; every control needs a real
`<label>`, and a placeholder is not one. `<dialog>` with `showModal()` and the Popover API
promote to the **top layer**, escaping the stacking contexts that trap a hand-rolled dropdown.

## 11. Progressive enhancement

`@supports` tests parseability, not correctness, so test the risky declaration itself. The
dividing line is decorative versus structural: a missing view transition costs an animation, a
missing container query costs a layout. Write the base layer complete and usable, then add the
enhancement. Scroll-driven animation needs care because an unhonoured `animation-timeline` does
not do nothing — it falls back to the document timeline and plays at once, so an element meant to
fade in on scroll arrives already faded in.

## Rules

### MUST NOT — Do not size full-height elements with 100vh; use 100dvh for chrome-tracking shells, 100svh for anything that must be reachable at rest, and 100lvh for decorative backdrops.

*Why:* vh resolves against the large viewport — the layout as it would be with the URL bar retracted — so before any scroll a 100vh element is taller than the space available and its bottom edge, usually the primary call to action, sits below the fold. It behaves this way deliberately: tracking the chrome would resize every vh-sized element mid-gesture.

*Source:* [CSS Values and Units Level 4, viewport-relative lengths](https://developer.mozilla.org/en-US/docs/Web/CSS/length)

Incorrect:

```css
.hero { height: 100vh; }
```

Correct:

```css
.hero { min-height: 100svh; }
```

### MUST — Set viewport-fit=cover whenever env(safe-area-inset-*) is used, give each inset a fallback, and add it to intrinsic padding rather than replacing it.

*Why:* By default the browser lays out inside the safe area, so every env() inset reports 0px and applying them appears to do nothing — the variables carry real values only once the page opts into drawing under the chrome. The reverse is equally true: once viewport-fit=cover is set, a fixed bottom bar without a bottom inset sits under the home indicator. Adding rather than replacing matters because the inset is 0px on devices without one, so an inset-only bar is flush against the glass there.

Incorrect:

```css
.bottom-bar { padding-bottom: env(safe-area-inset-bottom); }
```

Correct:

```css
.bottom-bar { padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px)); }
```

### MUST — Wrap hover-revealed and hover-only affordances in @media (hover: hover) and (pointer: fine), keeping the state outside that query fully usable.

*Why:* Touch browsers synthesise hover on tap and leave it applied until the next tap elsewhere, so a control revealed on hover appears only after a first tap that does nothing else, and a control existing only on hover is unreachable — no touchscreen gesture produces hover without also producing a click. Both conditions are needed because hover: hover alone matches a hovering stylus and pointer: fine alone matches a precise pointer that cannot hover.

*Source:* [CSS Media Queries Level 4, hover and pointer features](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover)

Incorrect:

```css
.card__actions { opacity: 0 }
.card:hover .card__actions { opacity: 1 }
```

Correct:

```css
@media (hover: hover) and (pointer: fine) {
  .card__actions { opacity: 0 }
  .card:hover .card__actions, .card:focus-within .card__actions { opacity: 1 }
}
```

### MUST — Style focus rings on :focus-visible with an explicit outline and offset, and never leave an outline: none without a replacement indicator in the same rule.

*Why:* :focus also matches a mouse click, so it paints a ring around something the user just clicked and can already see — the annoyance that led so many teams to remove outlines entirely and break keyboard navigation. :focus-visible defers to the browser heuristic, which means the ring appears exactly for the users who need it, and an explicit outline-offset is what keeps it legible on both light and dark surfaces.

*Source:* [WCAG 2.2 SC 2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)

Incorrect:

```css
:focus { outline: none }
```

Correct:

```css
:focus-visible { outline: 2px solid currentColor; outline-offset: 2px }
```

### MUST — Include a rem or em component in every clamp() preferred term, and keep each step’s max-to-min ratio at roughly 1.6 or below.

*Why:* Page zoom scales the root font size and therefore the computed value of rem, but vw is a fraction of the viewport and does not grow proportionally, so a preferred term of pure vw yields text that barely responds to zoom — at 200% the user gets a wider layout at the same visual text size, which is the failure WCAG 1.4.4 exists to prevent. The ratio cap matters because a step growing faster than its neighbours inverts the hierarchy at some width.

*Source:* [WCAG 2.2 SC 1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text)

Incorrect:

```css
font-size: clamp(1rem, 2.5vw, 1.5rem);
```

Correct:

```css
font-size: clamp(1rem, 0.833rem + 0.52vw, 1.5rem);
```

### MUST — Resolve the theme in a small synchronous inline script in <head>, wrapped in try/catch, setting both the theme attribute and color-scheme.

*Why:* Theme flash has exactly one cause: the first painted frame used a theme that was later corrected. Any resolution in a framework effect, after hydration, or in a deferred script is by definition after first paint, so the user sees white then dark. An inline head script runs before body content is parsed, so no incorrect frame is ever composited. The try/catch is needed because localStorage throws in some privacy modes, and color-scheme must be set in the same script or native controls stay light for the first frame.

Incorrect:

```ts
useEffect(() => { document.documentElement.dataset.theme = stored }, [])
```

Correct:

```ts
<script>try{const t=localStorage.theme??(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch{}</script>
```

### MUST — Build interactive controls from native elements, and build modal and overlay surfaces on <dialog> with showModal() or the Popover API.

*Why:* A native button arrives with tab order, Enter and Space activation, the button role, and disabled and pressed state in the accessibility tree; a div with role="button" supplies one of those and the other three must be rebuilt, which is how a control ships where Space scrolls the page instead of activating it. dialog and popover additionally promote to the top layer, which is what lets them escape the overflow: hidden and z-index stacking contexts that trap a hand-rolled dropdown inside a scrolling panel.

*Source:* [HTML Living Standard, the dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)

Incorrect:

```html
<div role="button" tabindex="0" onclick="save()">Save</div>
```

Correct:

```html
<button type="button" onclick="save()">Save</button>
```

### SHOULD — Switch a component’s internal layout with @container on a container-type: inline-size parent rather than with a viewport media query.

*Why:* A breakpoint written against the window is a claim about where the component happens to be mounted, so the same card is correct in a three-column grid and broken in a sidebar at the same viewport width. Inline-size containment is the right default because it constrains only the inline axis, leaving height to follow content; container-type: size requires height to be independent of children and collapses content-sized layouts.

Incorrect:

```css
@media (min-width: 60rem) { .card { grid-template-columns: 12rem 1fr } }
```

Correct:

```css
.card-slot { container-type: inline-size }
@container (min-width: 28rem) { .card { grid-template-columns: 12rem 1fr } }
```

### SHOULD — Give every webfont family a metric-matched fallback using size-adjust and ascent/descent overrides, and preload at most the single face rendering the largest above-the-fold text, with crossorigin.

*Why:* Layout shift comes from the metric mismatch, not the swap: different advance widths reflow line breaks and different ascent and descent change the line box height, so every block below moves. crossorigin is required even same-origin because fonts fetch in CORS mode, and omitting it causes a second duplicate fetch that makes the preload a net loss; preloading several faces makes them compete with the LCP image for the same connection during the critical phase.

*Source:* [CSS Fonts Level 5, size-adjust and metric override descriptors](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/size-adjust)

Incorrect:

```html
<link rel="preload" as="font" href="/f/inter-400.woff2">
<link rel="preload" as="font" href="/f/inter-600.woff2">
```

Correct:

```html
<link rel="preload" as="font" type="font/woff2" href="/f/inter-var.woff2" crossorigin>
```

### SHOULD — Animate only transform and opacity, scoping will-change to the moment of the animation and removing it on completion.

*Why:* Geometric properties invalidate layout and re-run style, layout, paint and composite for the affected subtree every frame, while transform and opacity on a composited element touch only the last stage. The difference is invisible on a fast machine and drops frames on a slow one, which is where the users are. will-change holds GPU memory for as long as it applies, so a blanket declaration across a large grid exhausts the budget and the browser begins refusing promotions outright.

Incorrect:

```css
.panel { transition: left 200ms ease } .panel.open { left: 200px }
```

Correct:

```css
.panel { transition: transform 200ms ease } .panel.open { transform: translateX(200px) }
```

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the layout negotiates viewport, insets, and input modality rather than assuming them. (blocking)

- Does any full-height element use 100vh rather than 100dvh or 100svh, and is viewport-fit=cover present wherever env(safe-area-inset-*) is used?
- Is every hover-revealed affordance gated on (hover: hover) and (pointer: fine), and is the state outside that query fully usable with 44 by 44 CSS pixel targets?
- Are focus rings on :focus-visible with a visible outline-offset, and does any outline: none lack a replacement in the same rule?
- Do component-level layout switches use @container on an inline-size container rather than a viewport media query?
- Does hierarchy hold at both 320px and 1920px, and does the layout stay usable at 200% browser zoom?

### Confirm fonts, vitals, and animation work are measured against the field rather than the dev machine. (blocking)

- Is exactly one face preloaded with crossorigin, does every @font-face declare swap or optional, and does each family have a metric-matched fallback with size-adjust and ascent-override?
- Is the LCP element in the initial HTML with fetchpriority="high" and no loading="lazy", and does every image and video carry explicit dimensions or aspect-ratio?
- Are LCP, INP and CLS being judged at P75 of field data, or only from a lab run on a fast machine with a warm cache?
- Do all animations affect only transform and opacity, is will-change scoped and removed after use, and does any content-visibility: auto lack contain-intrinsic-size?

### Confirm user preferences are honoured and the markup carries its own accessibility.

- Does each of prefers-reduced-motion, prefers-reduced-transparency, prefers-contrast, prefers-color-scheme and forced-colors have a handled branch, and is the reduced-motion branch an explicit rule rather than a global animation: none?
- Does the theme resolve in a synchronous head script before first paint, wrapped in try/catch, setting color-scheme alongside the theme attribute?
- Are colours authored in OKLCh with an sRGB fallback ahead of the @supports upgrade?
- Is every interactive control native, is there exactly one <main> with a heading order that skips no levels, and does every form control have a real <label> rather than a placeholder?
- Is every structural modern-CSS feature behind @supports with a usable base layer, and does any scroll-driven animation fall back to the document timeline and play immediately?

### Scan for hardcoded values and banned patterns. (blocking)

```bash
bash scripts/audit_design.sh . --platform web
```

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/viewport-input-and-responsive-css.md` — How do I size full-height elements against collapsing browser chrome, draw safely under a notch, gate hover and focus affordances by capability, make components respond to their slot, and build a fluid scale that still honours page zoom?
- `references/fonts-vitals-and-rendering.md` — How do I load webfonts without layout shift, design toward LCP, INP and CLS thresholds rather than measuring them afterwards, and animate without dropping frames?
- `references/colour-preferences-and-semantics.md` — How do I define a colour system that holds contrast across hues, switch themes without a flash, honour the operating-system preference settings, and build markup and modern-CSS enhancements that degrade correctly?
