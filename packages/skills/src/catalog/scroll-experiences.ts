// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Scroll effects are where a site's performance and its accessibility fail together.
 *
 * The reason is that scrolling is the one input the browser handles without asking
 * JavaScript's permission. It runs on the compositor, it continues while the main thread is
 * blocked, and it is wired to find-in-page, the keyboard, screen readers, and browser scroll
 * restoration. Every technique that intercepts it, measures against it synchronously, or
 * accumulates state from it is fighting a system that was designed to work without you.
 *
 * This skill is mostly about choosing the cheapest mechanism that expresses the effect, and
 * about the two failure modes that survive review because they are invisible on a fast laptop
 * with a working bundle: content hidden behind an animation that never ran, and progress
 * accumulated rather than derived.
 */
export const scrollExperiences: SkillManifest = {
  vsm: '1.0',
  id: 'scroll-experiences',
  name: 'Scroll Experiences',
  description:
    'Use when building reveal-on-scroll, parallax, sticky or pinned sections, horizontal scroll, scroll-snap, or scrollytelling.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'motion',
  tags: ['scroll', 'parallax', 'sticky', 'intersection-observer', 'scrollytelling', 'performance'],

  activation: {
    intents: [
      'adding animations that trigger or scrub as the user scrolls',
      'building a pinned, sticky, or horizontally scrolling section',
      'implementing parallax, scroll-snap, or a scrollytelling narrative',
      'the user reports scroll jank, stutter, or a page that feels heavy while scrolling',
      'content is invisible on a page that uses scroll reveals',
      'reviewing a landing page or marketing site for scroll performance',
    ],
    globs: [
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/*.css',
      '**/*scroll*.{ts,js}',
      '**/*parallax*.{ts,js}',
    ],
    keywords: [
      'scroll',
      'parallax',
      'sticky',
      'pinned',
      'reveal',
      'scrollytelling',
      'scroll-snap',
      'intersection observer',
      'animation-timeline',
    ],
  },

  content: {
    summary:
      'Choose the cheapest scroll mechanism — CSS scroll-driven animations, then IntersectionObserver, then a listener — derive state from position rather than accumulation, and never let a reveal be the reason content is missing.',

    body: `# Scroll Experiences

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
every frame. **Sticky/pinned** is layout, not animation: \`position: sticky\` holds an element
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

**CSS scroll-driven animations first.** \`animation-timeline: view()\` binds a keyframe
animation to an element's passage through the scrollport; \`scroll()\` binds it to a scroller's
own progress. Both are sampled on the compositor from scroll offset, so the effect stays locked
to the pixels even while the main thread is parsing JSON. No JavaScript approach can match
this, because scrolling is compositor-driven and script is not.

Support as of July 2026: Chromium 115+ (July 2023) and Safari 26.0. Firefox implements it
behind \`layout.css.scroll-driven-animations.enabled\`, on by default only in Nightly, so this
is not Baseline; it is an Interop 2026 focus area. Gate with \`@supports\`.

\`\`\`css
@supports (animation-timeline: view()) {
  .reveal {
    animation: rise linear both;
    animation-timeline: view();
    animation-range: entry 20% cover 45%;
  }
}
\`\`\`

**IntersectionObserver second**, for anything discrete. It reports threshold crossings off the
critical path and hands you geometry the engine has already computed
(\`entry.boundingClientRect\`, \`intersectionRatio\`), so you never measure anything yourself.

**A scroll listener last**, only for a value no timeline exposes. Read \`scrollY\` once,
compute, then write inside \`requestAnimationFrame\`.

**Never call \`getBoundingClientRect()\`, \`offsetTop\`, or \`scrollHeight\` inside a scroll
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

\`\`\`js
// Bad: read, write, read, write — one forced layout per element.
for (const el of items) el.style.opacity = el.getBoundingClientRect().top < h ? 1 : 0

// Good: measure everything, then mutate everything.
const tops = items.map((el) => el.getBoundingClientRect().top)
items.forEach((el, i) => { el.style.opacity = tops[i] < h ? 1 : 0 })
\`\`\`

Better still, delete the read: let IntersectionObserver report the crossing.

---

## 4. Scroll-linked state must be position-derived and idempotent

Compute state as a pure function of the current scroll offset and set it absolutely. Never
accumulate (\`offset += event.deltaY\`, or "advance one step per scroll event"). Scroll events
coalesce — during a trackpad fling the browser may fire one event covering 800px — so
accumulated state diverges from the real position and never recovers, and a page loaded with a
restored scroll position starts at step zero while showing section four.

Two tests settle it. Refresh mid-page: the effect must render its correct mid-page state
immediately. Then press End: the effect must land in its final state without playing through.
If either fails, state is being accumulated somewhere.

Clamp progress to 0..1. iOS rubber-banding produces negative \`scrollY\` and values beyond the
maximum, which otherwise push transforms past their intended range.

---

## 5. A reveal must never be the reason content is missing

The most damaging pattern on this page: markup ships with \`opacity: 0\` and JavaScript adds a
class to reveal it. When the bundle 404s, a CSP blocks it, an earlier error aborts the module,
or the user scrolls before hydration, the product's actual text is permanently invisible — and
it looks like a blank page, not a broken script.

Invert the responsibility. Markup renders visible; a small blocking script in \`<head>\` arms
the hiding CSS, so the failure mode becomes "no animation" rather than "no content".

\`\`\`html
<script>document.documentElement.classList.add('js-reveal')</script>
\`\`\`
\`\`\`css
.js-reveal .reveal { opacity: 0; translate: 0 1rem; }
\`\`\`

Use \`opacity\`, never \`visibility: hidden\` or \`display: none\`, for pre-reveal state: hidden
elements are removed from the accessibility tree and from find-in-page, so a screen-reader user
scanning ahead finds nothing there.

---

## 6. Do not take scrolling away

Scroll-jacking — \`preventDefault\` on \`wheel\`, remapping delta to a virtual position,
animating \`scrollTop\` per gesture — breaks find-in-page (Ctrl+F jumps the native scroller and
desynchronises your virtual position), Space, PageDown, Home and End, scrollbar dragging,
trackpad momentum, screen-reader virtual cursors, and scroll restoration on back-navigation.

Scroll-snap is the sanctioned way to control landing positions, because it constrains the
result without intercepting the input. Prefer \`scroll-snap-type: y proximity\` over
\`mandatory\`: mandatory traps a user on any section taller than the viewport. Add
\`scroll-padding-top\` equal to a fixed header's height so snapped and anchored content is not
hidden beneath it.

---

## 7. Budget and mobile viewport

Animate only \`transform\`, \`opacity\`, and \`filter\`. Add \`content-visibility: auto\` with a
matching \`contain-intrinsic-size\` to long sections so offscreen subtrees skip layout and
paint; without the size hint the scrollbar jumps as content is realised. Mark touch and wheel
listeners \`{ passive: true }\` so the browser need not wait to learn whether you will cancel
the scroll. Pass one threshold to IntersectionObserver, not an array of twenty, and
\`unobserve\` after a one-shot reveal.

On mobile, the collapsing address bar resizes the viewport mid-scroll. Any threshold computed
from \`innerHeight\`, and any \`resize\` handler that recomputes positions, will fire on every
address-bar transition and shift triggers under the user's finger. Use \`svh\`/\`lvh\`/\`dvh\`
instead of \`vh\`, and ignore height-only resizes on touch devices.

Finally, gate parallax and scrubbed motion behind \`prefers-reduced-motion: reduce\`.
Large-area scroll-coupled movement is a documented vestibular trigger; under reduced motion,
render the end state.`,

    references: [
      {
        id: 'css-scroll-driven',
        title: 'CSS scroll-driven animations, with verified support',
        answers:
          'What is the exact syntax for animation-timeline, scroll(), view(), animation-range, and named timelines, and which browsers support them today?',
        content: `# CSS scroll-driven animations

## Support, verified July 2026

- **Chromium 115+** (July 2023) — \`animation-timeline\`, \`scroll()\`, \`view()\`,
  \`scroll-timeline\`, \`view-timeline\`, \`animation-range\`, \`timeline-scope\`.
- **Safari 26.0** — shipped the same feature set.
- **Firefox** — implemented behind \`layout.css.scroll-driven-animations.enabled\`, enabled by
  default only on Nightly. Not on by default in release channels.

Consequence: the feature is **not Baseline**, and it is a named focus area of Interop 2026.
Treat it as progressive enhancement, never as the only path to legible content.

## Two timeline kinds

An **anonymous scroll progress timeline** maps a scroller's own scroll range to 0-100%:

\`\`\`css
.progress-bar {
  animation: grow linear;
  animation-timeline: scroll(root block);
  transform-origin: left center;
}
@keyframes grow { from { scale: 0 1 } to { scale: 1 1 } }
\`\`\`

\`scroll()\` accepts a scroller (\`nearest\` default, \`root\`, \`self\`) and an axis
(\`block\` default, \`inline\`, \`x\`, \`y\`).

An **anonymous view progress timeline** maps a subject element's passage through the
scrollport:

\`\`\`css
.card { animation: rise linear both; animation-timeline: view(block 10%); }
\`\`\`

The optional inset shrinks the scrollport for the calculation, which is how you make an
element finish its entrance before it reaches the true viewport edge.

## animation-range is where the control lives

For view timelines the named ranges are \`cover\` (subject first touches the scrollport until
it last leaves), \`contain\` (fully inside), \`entry\`, \`exit\`, \`entry-crossing\`, and
\`exit-crossing\`. Each takes a percentage:

\`\`\`css
animation-range: entry 25% cover 50%;
\`\`\`

The commonest mistake is omitting \`animation-range\`: the default \`cover 0% cover 100%\`
means the animation is barely started when the element is centred, so a fade-in appears to run
"too late" and authors compensate by shortening the keyframes instead of moving the range.

## Named timelines when subject and animated element differ

\`\`\`css
.gallery { view-timeline: --gallery block; }
.caption {
  animation: fade linear both;
  animation-timeline: --gallery;
}
\`\`\`

A named timeline is only visible to descendants of the declaring element and its siblings'
subtrees per the lookup rules; when the animated element is outside that scope, hoist it with
\`timeline-scope: --gallery\` on a common ancestor.

## The shorthand trap

\`animation\` is a shorthand that resets \`animation-timeline\` to its initial value
\`auto\`. Declaring the timeline first therefore silently destroys it:

\`\`\`css
/* Broken: the shorthand resets animation-timeline back to auto. */
.a { animation-timeline: view(); animation: rise linear both; }

/* Correct: shorthand first, timeline after. */
.b { animation: rise linear both; animation-timeline: view(); }
\`\`\`

This produces an animation that plays once on load at wall-clock speed, which authors usually
misdiagnose as "scroll timelines not supported here".

Related: \`animation-duration\` is ignored on a scroll or view timeline — progress comes from
the timeline, and the range is set with \`animation-range\`, not with duration and delay.

## The JavaScript equivalent

When the subject or range must be computed at runtime, the same machinery is available as
objects, still compositor-driven:

\`\`\`js
const timeline = new ViewTimeline({ subject: card, axis: 'block' })
card.animate(
  [{ opacity: 0, translate: '0 2rem' }, { opacity: 1, translate: '0 0' }],
  { timeline, rangeStart: 'entry 20%', rangeEnd: 'cover 45%', fill: 'both' },
)
\`\`\`

\`ScrollTimeline\` takes \`{ source, axis }\` instead. Feature-detect with
\`'ViewTimeline' in window\`.

## Required practice

Always declare \`animation-fill-mode: both\` (or the \`both\` keyword in the \`animation\`
shorthand). Without it the element snaps back to its unanimated style outside the range.

Always use \`animation-timing-function: linear\` on the animation itself and put any easing in
the keyframe offsets. A non-linear timing function on a scrubbed animation means the element
moves at a rate unrelated to the user's finger, which reads as lag.

Always gate initial state inside \`@supports (animation-timeline: view())\`. If the hidden
state is declared outside the block, Firefox release users see nothing.

## Scroll-triggered animations (emerging)

Chrome 145 introduces \`timeline-trigger\` and \`animation-trigger\`, which play an ordinary
time-based animation when a range is entered rather than scrubbing it — the CSS-native version
of the IntersectionObserver reveal, including a reverse action on exit. Chromium-only at time
of writing; use it additively.

## Related: scroll-state container queries

Chromium 133+ supports \`container-type: scroll-state\` with \`@container scroll-state(stuck:
top)\`, which styles a sticky element when it becomes stuck without any JavaScript sentinel.
Check current support in other engines before relying on it; the JavaScript fallback is an
IntersectionObserver on a zero-height sentinel placed just above the sticky element.`,
      },
      {
        id: 'pinned-sequence',
        title: 'Building a pinned sequence correctly',
        answers:
          'How do I build a pinned or horizontally scrolling section — the DOM structure, the progress maths, and the failure modes?',
        content: `# Building a pinned sequence correctly

A pinned sequence is a section that appears to hold still while its internal state advances
with scroll: a horizontal card track, a scrollytelling chart, a stepped product demo.

## The structure

Two elements, never one. A tall **track** provides the scroll distance; a **stage** inside it
is \`position: sticky\` and fills the viewport.

\`\`\`html
<section class="track">
  <div class="stage"><div class="rail">...panels...</div></div>
</section>
\`\`\`
\`\`\`css
.track { height: 400vh; }
.stage { position: sticky; top: 0; height: 100dvh; overflow: hidden; }
.rail  { display: flex; height: 100%; will-change: transform; }
\`\`\`

The track's height *is* the interaction duration. Four panels at one viewport of scroll each is
\`400vh\`; derive it (\`calc(var(--panels) * 100vh)\`) rather than hard-coding, or adding a
panel silently compresses every transition.

## Progress, derived not accumulated

\`\`\`js
const r = track.getBoundingClientRect()          // read once, in rAF
const total = r.height - window.innerHeight
const p = Math.min(1, Math.max(0, -r.top / total))
rail.style.transform = \`translate3d(\${-p * (railWidth - stageWidth)}px,0,0)\`
\`\`\`

Every frame recomputes the absolute position from \`p\`. Reloading at any scroll offset, or
pressing End, produces the correct state with no catch-up animation. If the same effect is
expressible in CSS, prefer \`animation-timeline: scroll()\` on the track and delete this code.

## Failure modes

**Sticky silently not sticking.** \`position: sticky\` fails when any ancestor has
\`overflow: hidden\`, \`auto\`, or \`scroll\`, because the element sticks to the nearest
scrolling ancestor, which is then not the viewport. It also requires the stage to have room to
move: a sticky child of a container that is the same height as the child never moves. Both
produce no error and no visual sticking — check ancestors first when a pin "does nothing".

**The stage taller than the viewport.** If the stage exceeds the viewport height, the browser
must scroll to reveal its bottom, so the pin appears to drift. Constrain to \`100dvh\` and let
content inside scale.

**Address-bar resize.** \`100vh\` on mobile is the large viewport, so a pinned stage is taller
than the visible area while the address bar is shown, and the pin jitters as the bar collapses.
Use \`100dvh\` for the stage; use \`svh\` for anything that must never be clipped.

**Nested scroll containers.** A horizontally scrollable rail inside a vertically pinned track
gives touch users two competing gestures. Set \`overscroll-behavior: contain\` on the inner
scroller, or make the rail non-scrollable and drive it purely by transform.

## Stepped scrollytelling, as opposed to scrubbing

A narrative sequence advances in steps rather than continuously, so it wants a trigger line
rather than a progress value. Place that line with \`rootMargin\` instead of measuring:

\`\`\`js
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && setStep(e.target.dataset.step)),
  { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
)
\`\`\`

The negative insets collapse the root to a 10%-tall band across the middle of the viewport, so
a step activates when it crosses the centre. Two details matter. Steps must be at least as tall
as the band or two can be inside it at once; and because scrolling up fires the same callback,
\`setStep\` must set the graphic state absolutely rather than advancing or reversing a counter.

## Accessibility

Pinning changes how long scrolling takes, not what content exists. Every panel must remain in
the DOM, in reading order, and focusable. Verify by tabbing: if focus enters a panel that is
translated offscreen, the browser will try to scroll it into view and fight the pin — the fix
is to advance the sequence in response to \`focusin\` rather than to prevent focus.

Keep panel text out of \`transform\`-heavy parents where possible; a transformed subtree that
is 3000px wide forces a large composited layer, and on low-memory devices the compositor
rasterises it at reduced quality, producing visibly soft text.

Under \`prefers-reduced-motion: reduce\`, replace the pin with ordinary document flow: set the
track to \`height: auto\`, the stage to \`position: static\`, and the rail to a vertical stack.
This is a genuinely better experience for the user, not a degraded one, and it costs about six
lines of CSS.

## Budget check

One pinned sequence per page. Two competing pins mean the user cannot predict what a scroll
gesture will do, and the second one usually starts while the first is still resolving its
exit — which reads as the page being broken rather than as being rich.`,
      },
    ],
  },

  rules: [
    {
      id: 'scroll-experiences/prefer-css-timelines',
      strength: 'should',
      statement:
        'Express scroll-linked animation with CSS scroll-driven animations (animation-timeline: view() or scroll()) before reaching for JavaScript.',
      evidence: {
        rationale:
          'CSS scroll timelines are sampled on the compositor directly from scroll offset, so the effect stays synchronised with the rendered pixels even when the main thread is blocked. A script-driven equivalent is always at least one frame behind and degrades under load.',
        source: 'CSS Scroll-driven Animations Level 1',
        url: 'https://drafts.csswg.org/scroll-animations-1/',
        confidence: 'established',
      },
    },
    {
      id: 'scroll-experiences/gate-timeline-support',
      strength: 'must',
      statement:
        'Wrap scroll-driven animation styles, including any hidden initial state, in @supports (animation-timeline: view()).',
      evidence: {
        rationale:
          'The feature shipped in Chromium 115 and Safari 26.0 but remains behind layout.css.scroll-driven-animations.enabled in Firefox release builds, so it is not Baseline. An initial opacity of 0 declared outside the supports block renders content permanently invisible in those browsers.',
        confidence: 'established',
      },
      verifiedBy: 'no-js-content-check',
    },
    {
      id: 'scroll-experiences/no-rect-in-scroll-handler',
      strength: 'must-not',
      statement:
        'Do not call getBoundingClientRect, offsetTop, offsetHeight, or scrollHeight inside a scroll or wheel event handler.',
      evidence: {
        rationale:
          'These reads must return current values, so the engine flushes style and layout synchronously before returning. Called per element in a handler, this produces one full layout pass per element per frame, each proportional to document size, which exhausts the 4-6ms of script budget in a 16.7ms frame.',
        confidence: 'established',
      },
      exceptions: [
        'A single read of one element, batched into a requestAnimationFrame callback, when no observer exposes the needed value.',
      ],
      verifiedBy: 'mechanism-ladder',
    },
    {
      id: 'scroll-experiences/batch-read-write',
      strength: 'must',
      statement:
        'When measurement is unavoidable, perform all reads first and all style writes afterwards, inside a single requestAnimationFrame callback.',
      evidence: {
        rationale:
          'Layout invalidation is only flushed when a read follows a write. Grouping reads before writes means the frame contains at most one forced layout regardless of element count, converting O(n) layout passes into O(1).',
        confidence: 'established',
      },
      verifiedBy: 'thrash-audit',
    },
    {
      id: 'scroll-experiences/position-derived-state',
      strength: 'must',
      statement:
        'Derive scroll-linked state as a pure function of the current scroll offset; never accumulate it from wheel deltas or per-event increments.',
      evidence: {
        rationale:
          'Scroll events coalesce and can skip hundreds of pixels in one dispatch during a fling, and a page can load at any restored offset. Accumulated state therefore diverges from the true position and has no mechanism to resynchronise, while a derived value is correct on every frame by construction.',
        confidence: 'established',
      },
      verifiedBy: 'idempotence-check',
    },
    {
      id: 'scroll-experiences/clamp-progress',
      strength: 'should',
      statement: 'Clamp computed scroll progress to the range 0 to 1 before applying it to any transform.',
      evidence: {
        rationale:
          'Rubber-band overscroll on iOS and macOS reports negative scroll offsets and offsets beyond the maximum, so an unclamped progress value drives transforms past their intended range and exposes the edges of a pinned stage.',
        confidence: 'strong',
      },
    },
    {
      id: 'scroll-experiences/no-hidden-by-default',
      strength: 'must-not',
      statement:
        'Do not ship markup whose content is hidden by default and revealed only by JavaScript; invert it so a blocking script arms the hiding CSS.',
      evidence: {
        rationale:
          'A bundle that 404s, is blocked by CSP, or throws before its reveal code runs leaves real product content permanently invisible with no error surfaced. Inverting the responsibility makes the worst case "the animation did not play" rather than "the page is blank".',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<div class="reveal">Pricing</div>\n<style>.reveal { opacity: 0 }</style>',
        good: '<script>document.documentElement.classList.add("js-reveal")</script>\n<style>.js-reveal .reveal { opacity: 0 }</style>',
      },
      verifiedBy: 'no-js-content-check',
    },
    {
      id: 'scroll-experiences/opacity-not-visibility',
      strength: 'must-not',
      statement:
        'Do not use display: none or visibility: hidden as the pre-reveal state for scroll-revealed content.',
      evidence: {
        rationale:
          'Both remove the element from the accessibility tree and from find-in-page, so a screen-reader user reading ahead of the visual scroll position, or anyone using Ctrl+F, cannot reach content that visually exists further down the page.',
        confidence: 'established',
      },
      verifiedBy: 'input-integrity',
    },
    {
      id: 'scroll-experiences/no-scroll-jacking',
      strength: 'must-not',
      statement:
        'Do not call preventDefault on wheel or touchmove events to remap scrolling to a custom position model.',
      evidence: {
        rationale:
          'Native scroll position is shared state that find-in-page, anchor navigation, keyboard paging, scrollbar dragging, screen-reader virtual cursors, and back-navigation scroll restoration all read and write. A virtual position desynchronises from it the moment any of those act.',
        confidence: 'established',
      },
      exceptions: [
        'A modal or carousel that is a genuine scroll container of its own, where overscroll-behavior: contain expresses the intent without cancelling the event.',
      ],
      verifiedBy: 'input-integrity',
    },
    {
      id: 'scroll-experiences/snap-proximity',
      strength: 'should',
      statement:
        'Prefer scroll-snap-type: proximity over mandatory, and never apply mandatory snapping to sections that can exceed the viewport height.',
      evidence: {
        rationale:
          'Mandatory snapping forces the scroller to a snap position at every rest, so a section taller than the viewport can never be scrolled to its own bottom — the scroller pulls back to the section start.',
        confidence: 'strong',
      },
    },
    {
      id: 'scroll-experiences/passive-listeners',
      strength: 'should',
      statement:
        'Register wheel, touchstart, and touchmove listeners with { passive: true } unless the handler genuinely cancels the gesture.',
      evidence: {
        rationale:
          'A non-passive listener forces the compositor to wait for the handler to return before it can scroll, because the handler might call preventDefault. That wait is the direct cause of the delayed first movement users perceive as a sticky page.',
        confidence: 'established',
      },
    },
    {
      id: 'scroll-experiences/compositor-properties-only',
      strength: 'must',
      statement:
        'Animate only transform, opacity, and filter in scroll-linked effects; never top, left, width, height, or margin.',
      evidence: {
        rationale:
          'Transform and opacity are handled by the compositor without layout or paint. Geometric properties invalidate layout for the element and its descendants on every frame, which at scroll frequency means recomputing layout sixty or a hundred and twenty times a second.',
        confidence: 'established',
      },
      verifiedBy: 'thrash-audit',
    },
    {
      id: 'scroll-experiences/content-visibility-with-size',
      strength: 'should',
      statement:
        'Pair content-visibility: auto with a contain-intrinsic-size estimate on every long offscreen section.',
      evidence: {
        rationale:
          'Without an intrinsic size the skipped subtree contributes zero height, so the document is short until each section is realised. The scrollbar thumb then resizes and the scroll position shifts as the user scrolls, which reads as the page fighting back.',
        confidence: 'established',
      },
    },
    {
      id: 'scroll-experiences/dynamic-viewport-units',
      strength: 'should',
      statement:
        'Use dvh, svh, or lvh rather than vh for pinned stages and full-height scroll sections, and ignore height-only resize events on touch devices.',
      evidence: {
        rationale:
          'On mobile the collapsing address bar changes the visual viewport height mid-gesture. vh resolves to the large viewport, so a pinned stage is taller than the visible area, and any trigger recomputed on resize moves under the user while they are scrolling.',
        confidence: 'established',
      },
    },
    {
      id: 'scroll-experiences/observer-not-listener',
      strength: 'should',
      statement:
        'Use IntersectionObserver with a single threshold for discrete enter/exit effects, and unobserve the element after a one-shot reveal.',
      evidence: {
        rationale:
          'The observer computes intersection off the critical rendering path and delivers precomputed geometry, so no forced layout occurs. Leaving a completed one-shot element observed keeps computing intersections for a callback that will do nothing.',
        confidence: 'established',
      },
      verifiedBy: 'mechanism-ladder',
    },
    {
      id: 'scroll-experiences/reduced-motion-parallax',
      strength: 'must',
      statement:
        'Disable parallax, scrubbed motion, and pinning under prefers-reduced-motion: reduce, rendering the end state in normal document flow.',
      evidence: {
        rationale:
          'Large-area motion that is coupled to scroll but moves at a different rate from the user input is a recognised vestibular trigger, capable of causing nausea and dizziness rather than mere annoyance.',
        source: 'WCAG 2.2 Success Criterion 2.3.3 (Animation from Interactions)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html',
        confidence: 'established',
      },
      verifiedBy: 'reduced-motion-check',
    },
    {
      id: 'scroll-experiences/one-pin-per-page',
      strength: 'should-not',
      statement: 'Do not place more than one pinned or horizontally scrolling sequence on a single page.',
      evidence: {
        rationale:
          'Pinning changes the relationship between gesture distance and page movement. Two different mappings on one page leave the user unable to predict what a scroll will do, and the second pin typically begins before the first has resolved its exit.',
        confidence: 'opinion',
      },
    },
    {
      id: 'scroll-experiences/keep-panels-in-flow',
      strength: 'must',
      statement:
        'Keep every panel of a pinned or horizontal sequence in the DOM, in reading order, and reachable by keyboard.',
      evidence: {
        rationale:
          'Translating a panel offscreen does not remove it from the tab order, so focus can land on invisible content. Removing panels from the DOM instead breaks find-in-page and screen-reader reading order, which are the only ways some users encounter the content at all.',
        confidence: 'established',
      },
      verifiedBy: 'input-integrity',
    },
  ],

  verification: [
    {
      id: 'no-js-content-check',
      kind: 'self-review',
      description: 'Confirm no content depends on JavaScript or an unsupported CSS feature to be visible.',
      blocking: true,
      questions: [
        'With JavaScript disabled, is every piece of text and every image on this page visible?',
        'Is any element declared with opacity: 0, visibility: hidden, or display: none outside an @supports block or a JS-armed class?',
        'In a browser without animation-timeline support, does the page render its finished state rather than its initial state?',
      ],
    },
    {
      id: 'mechanism-ladder',
      kind: 'self-review',
      description: 'Confirm the cheapest adequate mechanism was chosen.',
      blocking: true,
      questions: [
        'Is this effect discrete or continuous, and does the mechanism match — IntersectionObserver for discrete, a timeline for continuous?',
        'Could this be expressed with animation-timeline instead of the JavaScript that was written?',
        'If a scroll listener exists, what value does it need that neither scroll() nor IntersectionObserver provides?',
      ],
    },
    {
      id: 'idempotence-check',
      kind: 'self-review',
      description: 'Confirm scroll state is derived from position rather than accumulated.',
      blocking: true,
      questions: [
        'Reloading the page halfway through the sequence, does it immediately render the correct mid-sequence state?',
        'Pressing End, does the effect land in its final state without playing through intermediate steps?',
        'Does any variable in the scroll code use += or -= against an event delta?',
        'Is computed progress clamped to 0..1 before use?',
      ],
    },
    {
      id: 'thrash-audit',
      kind: 'self-review',
      description: 'Confirm no frame contains repeated forced layout.',
      questions: [
        'Does any scroll or wheel handler read geometry, and if so is that read batched ahead of all writes?',
        'Do the animated properties consist only of transform, opacity, and filter?',
        'Under CPU throttling with a long section list, does the frame timeline stay clear of repeated purple layout bars?',
      ],
    },
    {
      id: 'input-integrity',
      kind: 'self-review',
      description: 'Confirm native scrolling and content discovery still work.',
      blocking: true,
      questions: [
        'Does Ctrl+F find text in every section, including those not yet revealed and those translated offscreen?',
        'Do Space, PageDown, Home, and End move the page as they would on an ordinary document?',
        'Does tabbing reach every panel, and does focus never land on a visually hidden element?',
        'Is preventDefault called on any wheel or touchmove event?',
      ],
    },
    {
      id: 'reduced-motion-check',
      kind: 'self-review',
      description: 'Confirm the reduced-motion path is a complete experience.',
      blocking: true,
      questions: [
        'With prefers-reduced-motion: reduce, is all parallax and scrubbed movement stopped?',
        'Does the pinned section fall back to normal document flow, with every panel readable?',
        'Is any content only reachable by playing through an animation that reduced motion disables?',
      ],
    },
    {
      id: 'mobile-viewport-check',
      kind: 'self-review',
      description: 'Confirm the effect survives a resizing mobile viewport.',
      questions: [
        'Are full-height sections sized with dvh or svh rather than vh?',
        'Does a resize handler recompute trigger positions, and does it ignore height-only changes on touch devices?',
        'Scrolling up and down on a phone so the address bar collapses and reappears, does anything jump?',
      ],
    },
  ],

  relatedSkills: ['motion-design', 'interaction-design', 'responsive-architecture', 'accessible-components'],
}
