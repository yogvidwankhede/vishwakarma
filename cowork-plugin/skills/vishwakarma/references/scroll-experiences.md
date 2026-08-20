# Scroll Experiences

Scroll is the only continuous, high-frequency input every user has, which makes it the most
tempting thing to attach effects to and the easiest thing to break. Almost every bad scroll
experience traces to one of three mistakes: picking a mechanism more expensive than the effect
needs, deriving state by accumulation instead of from position, or hiding real content behind
an animation that may never run.

---

## 1. Name the pattern before building it

Seven distinct things get called "scroll animation", and they cost different amounts.
**Reveal on enter** is discrete — a threshold is crossed and an element changes state once.
**Scroll-linked (scrubbed)** is continuous — a progress value in 0..1 drives a transform on
every frame. **Sticky/pinned** is layout, not animation: `position: sticky` holds an element
while its container scrolls past. **Parallax** is scrubbing with different rates per layer.
**Horizontal sections** translate a wide track inside a tall pinned container. **Scroll-snap**
constrains where scrolling comes to rest. **Scrollytelling** composes a pinned graphic with
stepped prose.

The discrete/continuous split decides everything downstream. Discrete effects need a threshold
observer and nothing else. Continuous effects need a timeline, and timelines are where the
performance problems live.

---

## 2. The mechanism ladder

Work down it and stop at the first rung that does the job.

**CSS scroll-driven animations first.** `animation-timeline: view()` binds a keyframe
animation to an element's passage through the scrollport; `scroll()` binds it to a scroller's
own progress. Both are sampled on the compositor from scroll offset, so the effect stays locked
to the pixels even while the main thread is parsing JSON. No JavaScript approach can match
this, because scrolling is compositor-driven and script is not.

Support as of July 2026: Chromium 115+ (July 2023) and Safari 26.0. Firefox implements it
behind `layout.css.scroll-driven-animations.enabled`, on by default only in Nightly, so this
is not Baseline; it is an Interop 2026 focus area. Gate with `@supports`.

```css
@supports (animation-timeline: view()) {
  .reveal {
    animation: rise linear both;
    animation-timeline: view();
    animation-range: entry 20% cover 45%;
  }
}
```

**IntersectionObserver second**, for anything discrete. It reports threshold crossings off the
critical path and hands you geometry the engine has already computed
(`entry.boundingClientRect`, `intersectionRatio`), so you never measure anything yourself.

**A scroll listener last**, only for a value no timeline exposes. Read `scrollY` once,
compute, then write inside `requestAnimationFrame`.

**Never call `getBoundingClientRect()`, `offsetTop`, or `scrollHeight` inside a scroll
handler.**

---

## 3. Why that last rule exists: forced synchronous layout

A geometry read must return a current value, so the engine flushes pending style and layout
before returning it. Interleaving reads and writes across N elements therefore costs N full
layout passes in one frame, each proportional to document size — the classic layout thrash.

The frame budget makes this fatal. A 60Hz frame is 16.7ms and a 120Hz frame is 8.3ms; style,
layout, paint, and compositing consume most of it, leaving roughly 4-6ms for script. One forced
layout over a few thousand nodes is easily several milliseconds, so twenty of them per frame is
not slow, it is a slideshow.

The fix is batching: one read phase, then one write phase.

```js
// Bad: read, write, read, write — one forced layout per element.
for (const el of items) el.style.opacity = el.getBoundingClientRect().top < h ? 1 : 0

// Good: measure everything, then mutate everything.
const tops = items.map((el) => el.getBoundingClientRect().top)
items.forEach((el, i) => { el.style.opacity = tops[i] < h ? 1 : 0 })
```

Better still, delete the read: let IntersectionObserver report the crossing.

---

## 4. Scroll-linked state must be position-derived and idempotent

Compute state as a pure function of the current scroll offset and set it absolutely. Never
accumulate (`offset += event.deltaY`, or "advance one step per scroll event"). Scroll events
coalesce — during a trackpad fling the browser may fire one event covering 800px — so
accumulated state diverges from the real position and never recovers, and a page loaded with a
restored scroll position starts at step zero while showing section four.

Two tests settle it. Refresh mid-page: the effect must render its correct mid-page state
immediately. Then press End: the effect must land in its final state without playing through.
If either fails, state is being accumulated somewhere.

Clamp progress to 0..1. iOS rubber-banding produces negative `scrollY` and values beyond the
maximum, which otherwise push transforms past their intended range.

---

## 5. A reveal must never be the reason content is missing

The most damaging pattern on this page: markup ships with `opacity: 0` and JavaScript adds a
class to reveal it. When the bundle 404s, a CSP blocks it, an earlier error aborts the module,
or the user scrolls before hydration, the product's actual text is permanently invisible — and
it looks like a blank page, not a broken script.

Invert the responsibility. Markup renders visible; a small blocking script in `<head>` arms
the hiding CSS, so the failure mode becomes "no animation" rather than "no content".

```html
<script>document.documentElement.classList.add('js-reveal')</script>
```
```css
.js-reveal .reveal { opacity: 0; translate: 0 1rem; }
```

Use `opacity`, never `visibility: hidden` or `display: none`, for pre-reveal state: hidden
elements are removed from the accessibility tree and from find-in-page, so a screen-reader user
scanning ahead finds nothing there.

---

## 6. Do not take scrolling away

Scroll-jacking — `preventDefault` on `wheel`, remapping delta to a virtual position,
animating `scrollTop` per gesture — breaks find-in-page (Ctrl+F jumps the native scroller and
desynchronises your virtual position), Space, PageDown, Home and End, scrollbar dragging,
trackpad momentum, screen-reader virtual cursors, and scroll restoration on back-navigation.

Scroll-snap is the sanctioned way to control landing positions, because it constrains the
result without intercepting the input. Prefer `scroll-snap-type: y proximity` over
`mandatory`: mandatory traps a user on any section taller than the viewport. Add
`scroll-padding-top` equal to a fixed header's height so snapped and anchored content is not
hidden beneath it.

---

## 7. Budget and mobile viewport

Animate only `transform`, `opacity`, and `filter`. Add `content-visibility: auto` with a
matching `contain-intrinsic-size` to long sections so offscreen subtrees skip layout and
paint; without the size hint the scrollbar jumps as content is realised. Mark touch and wheel
listeners `{ passive: true }` so the browser need not wait to learn whether you will cancel
the scroll. Pass one threshold to IntersectionObserver, not an array of twenty, and
`unobserve` after a one-shot reveal.

On mobile, the collapsing address bar resizes the viewport mid-scroll. Any threshold computed
from `innerHeight`, and any `resize` handler that recomputes positions, will fire on every
address-bar transition and shift triggers under the user's finger. Use `svh`/`lvh`/`dvh`
instead of `vh`, and ignore height-only resizes on touch devices.

Finally, gate parallax and scrubbed motion behind `prefers-reduced-motion: reduce`.
Large-area scroll-coupled movement is a documented vestibular trigger; under reduced motion,
render the end state.

## Rules

### MUST NOT — Do not call getBoundingClientRect, offsetTop, offsetHeight, or scrollHeight inside a scroll or wheel event handler.

*Why:* These reads must return current values, so the engine flushes style and layout synchronously before returning. Called per element in a handler, this produces one full layout pass per element per frame, each proportional to document size, which exhausts the 4-6ms of script budget in a 16.7ms frame.

*Exceptions:*
- A single read of one element, batched into a requestAnimationFrame callback, when no observer exposes the needed value.

### MUST NOT — Do not ship markup whose content is hidden by default and revealed only by JavaScript; invert it so a blocking script arms the hiding CSS.

*Why:* A bundle that 404s, is blocked by CSP, or throws before its reveal code runs leaves real product content permanently invisible with no error surfaced. Inverting the responsibility makes the worst case "the animation did not play" rather than "the page is blank".

Incorrect:

```html
<div class="reveal">Pricing</div>
<style>.reveal { opacity: 0 }</style>
```

Correct:

```html
<script>document.documentElement.classList.add("js-reveal")</script>
<style>.js-reveal .reveal { opacity: 0 }</style>
```

### MUST NOT — Do not use display: none or visibility: hidden as the pre-reveal state for scroll-revealed content.

*Why:* Both remove the element from the accessibility tree and from find-in-page, so a screen-reader user reading ahead of the visual scroll position, or anyone using Ctrl+F, cannot reach content that visually exists further down the page.

### MUST NOT — Do not call preventDefault on wheel or touchmove events to remap scrolling to a custom position model.

*Why:* Native scroll position is shared state that find-in-page, anchor navigation, keyboard paging, scrollbar dragging, screen-reader virtual cursors, and back-navigation scroll restoration all read and write. A virtual position desynchronises from it the moment any of those act.

*Exceptions:*
- A modal or carousel that is a genuine scroll container of its own, where overscroll-behavior: contain expresses the intent without cancelling the event.

### MUST — Wrap scroll-driven animation styles, including any hidden initial state, in @supports (animation-timeline: view()).

*Why:* The feature shipped in Chromium 115 and Safari 26.0 but remains behind layout.css.scroll-driven-animations.enabled in Firefox release builds, so it is not Baseline. An initial opacity of 0 declared outside the supports block renders content permanently invisible in those browsers.

### MUST — When measurement is unavoidable, perform all reads first and all style writes afterwards, inside a single requestAnimationFrame callback.

*Why:* Layout invalidation is only flushed when a read follows a write. Grouping reads before writes means the frame contains at most one forced layout regardless of element count, converting O(n) layout passes into O(1).

### MUST — Derive scroll-linked state as a pure function of the current scroll offset; never accumulate it from wheel deltas or per-event increments.

*Why:* Scroll events coalesce and can skip hundreds of pixels in one dispatch during a fling, and a page can load at any restored offset. Accumulated state therefore diverges from the true position and has no mechanism to resynchronise, while a derived value is correct on every frame by construction.

### MUST — Animate only transform, opacity, and filter in scroll-linked effects; never top, left, width, height, or margin.

*Why:* Transform and opacity are handled by the compositor without layout or paint. Geometric properties invalidate layout for the element and its descendants on every frame, which at scroll frequency means recomputing layout sixty or a hundred and twenty times a second.

### MUST — Disable parallax, scrubbed motion, and pinning under prefers-reduced-motion: reduce, rendering the end state in normal document flow.

*Why:* Large-area motion that is coupled to scroll but moves at a different rate from the user input is a recognised vestibular trigger, capable of causing nausea and dizziness rather than mere annoyance.

*Source:* [WCAG 2.2 Success Criterion 2.3.3 (Animation from Interactions)](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

### MUST — Keep every panel of a pinned or horizontal sequence in the DOM, in reading order, and reachable by keyboard.

*Why:* Translating a panel offscreen does not remove it from the tab order, so focus can land on invisible content. Removing panels from the DOM instead breaks find-in-page and screen-reader reading order, which are the only ways some users encounter the content at all.

### SHOULD NOT — Do not place more than one pinned or horizontally scrolling sequence on a single page.

*Why:* Pinning changes the relationship between gesture distance and page movement. Two different mappings on one page leave the user unable to predict what a scroll will do, and the second pin typically begins before the first has resolved its exit.

### SHOULD — Express scroll-linked animation with CSS scroll-driven animations (animation-timeline: view() or scroll()) before reaching for JavaScript.

*Why:* CSS scroll timelines are sampled on the compositor directly from scroll offset, so the effect stays synchronised with the rendered pixels even when the main thread is blocked. A script-driven equivalent is always at least one frame behind and degrades under load.

*Source:* [CSS Scroll-driven Animations Level 1](https://drafts.csswg.org/scroll-animations-1/)

### SHOULD — Clamp computed scroll progress to the range 0 to 1 before applying it to any transform.

*Why:* Rubber-band overscroll on iOS and macOS reports negative scroll offsets and offsets beyond the maximum, so an unclamped progress value drives transforms past their intended range and exposes the edges of a pinned stage.

### SHOULD — Prefer scroll-snap-type: proximity over mandatory, and never apply mandatory snapping to sections that can exceed the viewport height.

*Why:* Mandatory snapping forces the scroller to a snap position at every rest, so a section taller than the viewport can never be scrolled to its own bottom — the scroller pulls back to the section start.

### SHOULD — Register wheel, touchstart, and touchmove listeners with { passive: true } unless the handler genuinely cancels the gesture.

*Why:* A non-passive listener forces the compositor to wait for the handler to return before it can scroll, because the handler might call preventDefault. That wait is the direct cause of the delayed first movement users perceive as a sticky page.

### SHOULD — Pair content-visibility: auto with a contain-intrinsic-size estimate on every long offscreen section.

*Why:* Without an intrinsic size the skipped subtree contributes zero height, so the document is short until each section is realised. The scrollbar thumb then resizes and the scroll position shifts as the user scrolls, which reads as the page fighting back.

### SHOULD — Use dvh, svh, or lvh rather than vh for pinned stages and full-height scroll sections, and ignore height-only resize events on touch devices.

*Why:* On mobile the collapsing address bar changes the visual viewport height mid-gesture. vh resolves to the large viewport, so a pinned stage is taller than the visible area, and any trigger recomputed on resize moves under the user while they are scrolling.

### SHOULD — Use IntersectionObserver with a single threshold for discrete enter/exit effects, and unobserve the element after a one-shot reveal.

*Why:* The observer computes intersection off the critical rendering path and delivers precomputed geometry, so no forced layout occurs. Leaving a completed one-shot element observed keeps computing intersections for a callback that will do nothing.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm no content depends on JavaScript or an unsupported CSS feature to be visible. (blocking)

- With JavaScript disabled, is every piece of text and every image on this page visible?
- Is any element declared with opacity: 0, visibility: hidden, or display: none outside an @supports block or a JS-armed class?
- In a browser without animation-timeline support, does the page render its finished state rather than its initial state?

### Confirm the cheapest adequate mechanism was chosen. (blocking)

- Is this effect discrete or continuous, and does the mechanism match — IntersectionObserver for discrete, a timeline for continuous?
- Could this be expressed with animation-timeline instead of the JavaScript that was written?
- If a scroll listener exists, what value does it need that neither scroll() nor IntersectionObserver provides?

### Confirm scroll state is derived from position rather than accumulated. (blocking)

- Reloading the page halfway through the sequence, does it immediately render the correct mid-sequence state?
- Pressing End, does the effect land in its final state without playing through intermediate steps?
- Does any variable in the scroll code use += or -= against an event delta?
- Is computed progress clamped to 0..1 before use?

### Confirm no frame contains repeated forced layout.

- Does any scroll or wheel handler read geometry, and if so is that read batched ahead of all writes?
- Do the animated properties consist only of transform, opacity, and filter?
- Under CPU throttling with a long section list, does the frame timeline stay clear of repeated purple layout bars?

### Confirm native scrolling and content discovery still work. (blocking)

- Does Ctrl+F find text in every section, including those not yet revealed and those translated offscreen?
- Do Space, PageDown, Home, and End move the page as they would on an ordinary document?
- Does tabbing reach every panel, and does focus never land on a visually hidden element?
- Is preventDefault called on any wheel or touchmove event?

### Confirm the reduced-motion path is a complete experience. (blocking)

- With prefers-reduced-motion: reduce, is all parallax and scrubbed movement stopped?
- Does the pinned section fall back to normal document flow, with every panel readable?
- Is any content only reachable by playing through an animation that reduced motion disables?

### Confirm the effect survives a resizing mobile viewport.

- Are full-height sections sized with dvh or svh rather than vh?
- Does a resize handler recompute trigger positions, and does it ignore height-only changes on touch devices?
- Scrolling up and down on a phone so the address bar collapses and reappears, does anything jump?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/css-scroll-driven.md` — What is the exact syntax for animation-timeline, scroll(), view(), animation-range, and named timelines, and which browsers support them today?
- `references/pinned-sequence.md` — How do I build a pinned or horizontally scrolling section — the DOM structure, the progress maths, and the failure modes?
