# Easing curves, the duration ladder, the frequency gate, reduced motion, and compositing

## 1. Easing for non-spring motion

Not everything needs a spring. Discrete, non-interruptible, non-gestural motion is well served
by a curve, and curves are cheaper.

**Entering and exiting → ease-out.** The element decelerates into place, which is what an
object with mass arriving at a stop does. **Moving or morphing on screen → ease-in-out.** The
object is already present, so it must both start and stop, and symmetric acceleration reads as
a considered move. **Hover and colour → ease.** Small, ambient, symmetric. **Constant motion →
linear.** Spinners, marquees, progress. Anything eased will visibly pulse once per cycle.

**`ease-in` on interface motion is a defect.** It begins at zero velocity, so for the first
100ms after the user acts almost nothing happens — precisely the window in which they are
looking for confirmation that their input registered. The interface feels unresponsive even
though the total duration is identical to an ease-out version. Reserve `ease-in` for things
genuinely leaving the stage under acceleration, and even then prefer a faster ease-out.

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

`--ease-drawer` is the exception curve: a very fast start with a long, flat settle, which is
what a large surface pulled by a gesture should do. Its zero final velocity is what lets a
400ms drawer still feel immediate.

## 2. Duration ladder

| Motion | Duration |
|---|---|
| Button press / release | 100–160ms |
| Tooltip, small popover | 125–200ms |
| Dropdown, select menu | 150–250ms |
| Modal, drawer, sheet | 200–500ms |

Duration scales with distance and area, because a large surface moving quickly implies an
implausibly large force and reads as violent, while a small element moving slowly reads as
sticky.

**Hard ceiling: UI feedback stays under 300ms.** Past roughly 300ms the animation stops being
perceived as a consequence of the action and starts being perceived as a wait — the causal link
between input and response weakens, and the user begins to attribute the delay to the system
rather than to the object. Drawers and modals may exceed it only because they are large
surfaces whose travel genuinely takes time, and even then they should feel finished before they
are.

**Stagger between list items: 30–80ms.** The mechanism is that a stagger converts a wall of
simultaneous change into a readable sequence with an implied direction. Below 30ms the items
read as simultaneous and the stagger costs time for nothing; above 80ms the last item in a
ten-item list arrives 800ms after the first, and the user has already started reading. Cap
total stagger at about 300ms regardless of item count — stagger the first several items and
land the rest together.

## 3. Reduced motion

**Gentler and fewer, not zero.** Setting every transition to 0ms removes the state-change
signal along with the motion, and an interface where things appear and disappear instantly is
harder to follow, not easier.

Replace transform-based motion with a **~200ms opacity cross-fade**. Drop parallax, overshoot,
looping motion, and anything that moves independently of the user's scroll. Keep colour
transitions, opacity changes, and progress indicators that carry meaning.

Avoid periodic motion near **0.2Hz — one cycle per five seconds** — and avoid large moving
backgrounds under any setting. That frequency band, combined with large field-of-view coverage,
is the combination most associated with vestibular discomfort, because it mimics the
low-frequency self-motion cues the vestibular system uses and the mismatch with a stationary
body produces nausea. A slowly drifting full-viewport gradient is the canonical offender: it
looks tasteful in a design review and is the reason someone closes the tab.

## 4. The frequency gate

Before selecting any duration, curve, or spring, answer one question: **how often will this
user see this animation?**

| Frequency | Correct amount of motion |
|---|---|
| 100+ times a day — keyboard shortcuts, command palettes, autocomplete | None |
| Tens of times a day — navigation, tab switches, list updates | Near-imperceptible, or none |
| Occasional — modals, drawers, toasts, onboarding steps | The standard values in this file |
| Rare or first-time — first launch, empty states, celebrations | Expressive motion is affordable here |

The mechanism is habituation working against you. A 200ms transition experienced once is a
pleasing detail; experienced 200 times in a working day it is 40 seconds of waiting and a
source of low-grade irritation the user cannot articulate. Charm decays with exposure; cost
does not. A command palette that eases open in 150ms is delightful in a demo and is the reason
a power user switches tools.

**This gate can legitimately return "build nothing", and that is the correct answer more often
than it is given.** The most common motion defect in generated interfaces is not a badly-tuned
animation; it is a well-tuned animation on something that should have been instant.

## 5. Purpose naming

Every animation must name its purpose as exactly one of:

**Feedback** — the input was received. **Spatial consistency** — where this came from and where
it went. **State indication** — something changed, here. **Preventing a jarring change** —
smoothing a transition that would otherwise be a jump cut. **Explanation** — showing a
relationship or a mechanism the static frames cannot. **Delight** — a deliberate spend, subject
to the frequency gate.

Exactly one. An animation claiming three purposes has usually not identified any, and one
claiming none gets deleted. This is the cheapest review in the whole discipline: ask what each
animation is for, and delete the ones with no answer.

## 6. Transform discipline

Animate **`transform` and `opacity` only**. `clip-path` is a sanctioned fourth; `height` is
tolerated for accordions where there is no honest alternative. Everything else — `width`,
`top`, `margin`, `box-shadow`, `filter` on large surfaces — triggers layout or paint on every
frame and will drop frames on the devices your users actually own.

**Never `scale(0)`.** An element scaled to zero has no dimensions, so its interior detail is
meaningless and it reads as a point of light rather than an object, and the perceived
acceleration on the way out is enormous. Enter from **`scale(0.90)` to `scale(0.97)`** with
`opacity: 0` — close enough that the element is recognisably itself from the first frame, far
enough that the growth is legible.

**Press: `scale(0.95)` to `scale(0.98)`.** Small controls take the deeper value because the
absolute displacement must remain perceptible; a full-width button at 0.95 visibly deforms.

**`transform-origin` anchors to the trigger.** A popover opened from a button in the top-right
must scale out of its top-right corner, because the origin *is* the statement that this surface
came from that button. A menu scaling from its own centre is a surface that appeared from
nowhere and happens to be near a button. Modals are exempt — a centred modal is a context
switch, not an expansion of a specific control, and forcing it to grow from a trigger 600px
away produces a long diagonal slide that costs more attention than it buys.

**Blur masks crossfades at about 2px, and stays under 20px.** A small blur during a content
swap hides the moment where both layers are simultaneously at 50% opacity and the composite
reads as a double exposure. Above 20px the blur stops masking and becomes the effect, and on
large surfaces it is expensive enough to cost frames.

## 7. Performance mechanisms

**CSS animations and WAAPI run off the main thread** when they animate only compositor-friendly
properties, so they keep 60fps through main-thread work that would stall a JavaScript-driven
`requestAnimationFrame` loop. This matters most at exactly the wrong moment: a route transition
animates while the incoming route's JavaScript parses and hydrates, which is the busiest the
main thread ever gets. A JS-driven transition there will stutter on every device; a CSS-driven
one will not.

**`element.animate()` gives JS-level control at CSS-level performance.** It returns an
`Animation` object with `playbackRate`, `currentTime`, `cancel()`, `reverse()` and a `finished`
promise, while still handing the work to the compositor. It is the correct default for
programmatic motion that does not need per-frame computation.

**Never drive a child's transform from a CSS custom property set on the parent.** Custom
properties are inherited, so updating one on a parent invalidates style for every descendant
that references it and forces a style recalculation across the entire subtree on each frame. A
list of 200 rows reading `--offset` from a scrolling container will recalculate 200 elements
per frame and drop to single-digit frame rates. Set the property on the animating element
itself, or animate `transform` directly.

**`@starting-style` replaces the mount-flag pattern.** Historically, animating an element on
insertion required rendering it in its initial state, forcing a reflow, then flipping a class
on the next frame — a pattern that is easy to get subtly wrong and that fails when React
batches the two states into one commit. `@starting-style` declares the pre-insertion values
directly, so the browser has both endpoints at insertion time.

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out);
}
@starting-style {
  .toast { opacity: 0; transform: translateY(8px); }
}
```

## Pass conditions

- No `ease-in` appears on any entrance, exit, or state transition.
- All non-spring easing resolves to one of `--ease-out`, `--ease-in-out`, or `--ease-drawer`.
- Every UI feedback animation is under 300ms; only large surfaces exceed it.
- List staggers fall in the 30–80ms range with total stagger capped near 300ms.
- Every animation names exactly one purpose from the six-item list.
- Every animation has passed the frequency gate, and high-frequency interactions have no
  animation.
- Only `transform`, `opacity`, `clip-path`, and (for accordions) `height` are animated.
- No `scale(0)`; entrances begin between `scale(0.90)` and `scale(0.97)`.
- Press states scale between 0.95 and 0.98.
- Non-modal popovers set `transform-origin` to their trigger's position.
- Any crossfade blur stays between 2px and 20px.
- `prefers-reduced-motion: reduce` yields ~200ms cross-fades, not `animation: none`.
- No looping motion sits near 0.2Hz and no full-viewport background animates continuously.
- No CSS custom property that drives a child transform is set on an animating ancestor.
- Mount animations use `@starting-style` rather than a double-rAF class flip.
