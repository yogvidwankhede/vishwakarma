# Building a pinned sequence correctly

A pinned sequence is a section that appears to hold still while its internal state advances
with scroll: a horizontal card track, a scrollytelling chart, a stepped product demo.

## The structure

Two elements, never one. A tall **track** provides the scroll distance; a **stage** inside it
is `position: sticky` and fills the viewport.

```html
<section class="track">
  <div class="stage"><div class="rail">...panels...</div></div>
</section>
```
```css
.track { height: 400vh; }
.stage { position: sticky; top: 0; height: 100dvh; overflow: hidden; }
.rail  { display: flex; height: 100%; will-change: transform; }
```

The track's height *is* the interaction duration. Four panels at one viewport of scroll each is
`400vh`; derive it (`calc(var(--panels) * 100vh)`) rather than hard-coding, or adding a
panel silently compresses every transition.

## Progress, derived not accumulated

```js
const r = track.getBoundingClientRect()          // read once, in rAF
const total = r.height - window.innerHeight
const p = Math.min(1, Math.max(0, -r.top / total))
rail.style.transform = `translate3d(${-p * (railWidth - stageWidth)}px,0,0)`
```

Every frame recomputes the absolute position from `p`. Reloading at any scroll offset, or
pressing End, produces the correct state with no catch-up animation. If the same effect is
expressible in CSS, prefer `animation-timeline: scroll()` on the track and delete this code.

## Failure modes

**Sticky silently not sticking.** `position: sticky` fails when any ancestor has
`overflow: hidden`, `auto`, or `scroll`, because the element sticks to the nearest
scrolling ancestor, which is then not the viewport. It also requires the stage to have room to
move: a sticky child of a container that is the same height as the child never moves. Both
produce no error and no visual sticking — check ancestors first when a pin "does nothing".

**The stage taller than the viewport.** If the stage exceeds the viewport height, the browser
must scroll to reveal its bottom, so the pin appears to drift. Constrain to `100dvh` and let
content inside scale.

**Address-bar resize.** `100vh` on mobile is the large viewport, so a pinned stage is taller
than the visible area while the address bar is shown, and the pin jitters as the bar collapses.
Use `100dvh` for the stage; use `svh` for anything that must never be clipped.

**Nested scroll containers.** A horizontally scrollable rail inside a vertically pinned track
gives touch users two competing gestures. Set `overscroll-behavior: contain` on the inner
scroller, or make the rail non-scrollable and drive it purely by transform.

## Stepped scrollytelling, as opposed to scrubbing

A narrative sequence advances in steps rather than continuously, so it wants a trigger line
rather than a progress value. Place that line with `rootMargin` instead of measuring:

```js
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && setStep(e.target.dataset.step)),
  { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
)
```

The negative insets collapse the root to a 10%-tall band across the middle of the viewport, so
a step activates when it crosses the centre. Two details matter. Steps must be at least as tall
as the band or two can be inside it at once; and because scrolling up fires the same callback,
`setStep` must set the graphic state absolutely rather than advancing or reversing a counter.

## Accessibility

Pinning changes how long scrolling takes, not what content exists. Every panel must remain in
the DOM, in reading order, and focusable. Verify by tabbing: if focus enters a panel that is
translated offscreen, the browser will try to scroll it into view and fight the pin — the fix
is to advance the sequence in response to `focusin` rather than to prevent focus.

Keep panel text out of `transform`-heavy parents where possible; a transformed subtree that
is 3000px wide forces a large composited layer, and on low-memory devices the compositor
rasterises it at reduced quality, producing visibly soft text.

Under `prefers-reduced-motion: reduce`, replace the pin with ordinary document flow: set the
track to `height: auto`, the stage to `position: static`, and the rail to a vertical stack.
This is a genuinely better experience for the user, not a degraded one, and it costs about six
lines of CSS.

## Budget check

One pinned sequence per page. Two competing pins mean the user cannot predict what a scroll
gesture will do, and the second one usually starts while the first is still resolving its
exit — which reads as the page being broken rather than as being rich.
