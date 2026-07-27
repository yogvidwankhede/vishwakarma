# CSS scroll-driven animations

## Support, verified July 2026

- **Chromium 115+** (July 2023) — `animation-timeline`, `scroll()`, `view()`,
  `scroll-timeline`, `view-timeline`, `animation-range`, `timeline-scope`.
- **Safari 26.0** — shipped the same feature set.
- **Firefox** — implemented behind `layout.css.scroll-driven-animations.enabled`, enabled by
  default only on Nightly. Not on by default in release channels.

Consequence: the feature is **not Baseline**, and it is a named focus area of Interop 2026.
Treat it as progressive enhancement, never as the only path to legible content.

## Two timeline kinds

An **anonymous scroll progress timeline** maps a scroller's own scroll range to 0-100%:

```css
.progress-bar {
  animation: grow linear;
  animation-timeline: scroll(root block);
  transform-origin: left center;
}
@keyframes grow { from { scale: 0 1 } to { scale: 1 1 } }
```

`scroll()` accepts a scroller (`nearest` default, `root`, `self`) and an axis
(`block` default, `inline`, `x`, `y`).

An **anonymous view progress timeline** maps a subject element's passage through the
scrollport:

```css
.card { animation: rise linear both; animation-timeline: view(block 10%); }
```

The optional inset shrinks the scrollport for the calculation, which is how you make an
element finish its entrance before it reaches the true viewport edge.

## animation-range is where the control lives

For view timelines the named ranges are `cover` (subject first touches the scrollport until
it last leaves), `contain` (fully inside), `entry`, `exit`, `entry-crossing`, and
`exit-crossing`. Each takes a percentage:

```css
animation-range: entry 25% cover 50%;
```

The commonest mistake is omitting `animation-range`: the default `cover 0% cover 100%`
means the animation is barely started when the element is centred, so a fade-in appears to run
"too late" and authors compensate by shortening the keyframes instead of moving the range.

## Named timelines when subject and animated element differ

```css
.gallery { view-timeline: --gallery block; }
.caption {
  animation: fade linear both;
  animation-timeline: --gallery;
}
```

A named timeline is only visible to descendants of the declaring element and its siblings'
subtrees per the lookup rules; when the animated element is outside that scope, hoist it with
`timeline-scope: --gallery` on a common ancestor.

## The shorthand trap

`animation` is a shorthand that resets `animation-timeline` to its initial value
`auto`. Declaring the timeline first therefore silently destroys it:

```css
/* Broken: the shorthand resets animation-timeline back to auto. */
.a { animation-timeline: view(); animation: rise linear both; }

/* Correct: shorthand first, timeline after. */
.b { animation: rise linear both; animation-timeline: view(); }
```

This produces an animation that plays once on load at wall-clock speed, which authors usually
misdiagnose as "scroll timelines not supported here".

Related: `animation-duration` is ignored on a scroll or view timeline — progress comes from
the timeline, and the range is set with `animation-range`, not with duration and delay.

## The JavaScript equivalent

When the subject or range must be computed at runtime, the same machinery is available as
objects, still compositor-driven:

```js
const timeline = new ViewTimeline({ subject: card, axis: 'block' })
card.animate(
  [{ opacity: 0, translate: '0 2rem' }, { opacity: 1, translate: '0 0' }],
  { timeline, rangeStart: 'entry 20%', rangeEnd: 'cover 45%', fill: 'both' },
)
```

`ScrollTimeline` takes `{ source, axis }` instead. Feature-detect with
`'ViewTimeline' in window`.

## Required practice

Always declare `animation-fill-mode: both` (or the `both` keyword in the `animation`
shorthand). Without it the element snaps back to its unanimated style outside the range.

Always use `animation-timing-function: linear` on the animation itself and put any easing in
the keyframe offsets. A non-linear timing function on a scrubbed animation means the element
moves at a rate unrelated to the user's finger, which reads as lag.

Always gate initial state inside `@supports (animation-timeline: view())`. If the hidden
state is declared outside the block, Firefox release users see nothing.

## Scroll-triggered animations (emerging)

Chrome 145 introduces `timeline-trigger` and `animation-trigger`, which play an ordinary
time-based animation when a range is entered rather than scrubbing it — the CSS-native version
of the IntersectionObserver reveal, including a reverse action on exit. Chromium-only at time
of writing; use it additively.

## Related: scroll-state container queries

Chromium 133+ supports `container-type: scroll-state` with `@container scroll-state(stuck:
top)`, which styles a sticky element when it becomes stuck without any JavaScript sentinel.
Check current support in other engines before relying on it; the JavaScript fallback is an
IntersectionObserver on a zero-height sentinel placed just above the sticky element.
