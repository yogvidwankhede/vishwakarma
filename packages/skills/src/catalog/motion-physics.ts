// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Every convincing interface animation is a claim about a physical object: it has mass, it
 * carries momentum, it resists being stopped, and it cannot occupy two positions at once.
 *
 * The characteristic motion defect is therefore not ugliness either. It is a claim the object
 * cannot support: a modal that springs 4% past its final size after a tap that supplied no
 * momentum; a sheet that decelerates to zero at the instant the finger lifts and then starts
 * again from rest; a carousel that snaps to the item nearest the release point, so a hard flick
 * and a gentle nudge land in the same place; a menu that teleports to a position it never
 * reached because the close animation began from the open value.
 *
 * The posture that avoids all of them is one sentence long: tune in physics, translate to API.
 * A damping ratio of 0.8 produces the same perceived overshoot in SwiftUI, in a Compose
 * interpolator, and in a web motion library, because all three are encodings of the same
 * second-order system. Tuning in API parameters instead — mass here, stiffness there, a
 * cubic-bezier somewhere else — produces three interfaces that disagree with each other, and
 * nobody can say which one is right because none of them was ever stated in comparable terms.
 *
 * Two further mechanisms carry most of the remaining rules. Perception has deadlines: past
 * roughly 300ms a response stops being read as a consequence and starts being read as a wait,
 * and a curve that begins at zero velocity spends the confirmation window doing nothing. And
 * charm decays with exposure while cost does not, which is why the first question is never
 * which spring, but whether this thing should move at all.
 */
export const motionPhysics: SkillManifest = {
  vsm: '1.0',
  id: 'motion-physics',
  name: 'Motion Physics',
  description:
    'Use when tuning springs, gestures, momentum, easing or durations — or deciding whether an interaction should be animated at all.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'motion',
  tags: ['motion', 'spring', 'gesture', 'easing', 'reduced-motion'],

  activation: {
    intents: [
      'tuning a spring, a drawer, a sheet, a pull-to-refresh, or a carousel snap',
      'a drag, swipe, or fling that hands off to an animation when the finger lifts',
      'motion that snaps back, jumps, or stutters when it is interrupted mid-flight',
      'choosing a duration or an easing curve for an entrance, exit, or state change',
      'deciding whether an interaction should be animated at all, and how much',
      'implementing overscroll, rubber-banding, or momentum scrolling by hand',
      'adding a reduced-motion branch, or auditing motion for vestibular safety',
      'an animation that drops frames on the mid-range devices users actually own',
    ],
    globs: [
      '**/*.css',
      '**/*.scss',
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.swift',
      '**/*.kt',
      '**/*motion*',
      '**/*animation*',
      '**/*gesture*',
      '**/*transition*',
    ],
    keywords: [
      'spring',
      'damping',
      'bounce',
      'easing',
      'cubic-bezier',
      'transition',
      'keyframes',
      'gesture',
      'drag',
      'fling',
      'velocity',
      'momentum',
      'rubber-band',
      'overscroll',
      'stagger',
      'prefers-reduced-motion',
      'transform-origin',
    ],
  },

  content: {
    summary:
      'Use when motion is gesture-driven, interruptible, or physical: springs as damping and response, velocity handoff, momentum projection, rubber-banding, easing curves, the duration ladder, and the frequency gate that decides whether to build any animation at all.',

    body: `# Motion Physics

Every convincing interface animation is a claim about a physical object: it has mass, it carries momentum, and it cannot occupy two positions at once. The values here are where a simulated object starts reading as a thing rather than an animation — and where motion starts reading as a delay rather than a response.

The spring on iOS, the interpolator on Android, and the spring in a web motion library are three encodings of one second-order system, and a damping ratio produces the same perceived overshoot in all three. **Tune in physics, translate to API** — the reverse produces three interfaces that disagree.

---

## 1. The frequency gate runs first

Before selecting any duration, curve, or spring: **how often will this user see this animation?**

| Frequency | Motion |
|---|---|
| 100+ a day — shortcuts, command palettes | None |
| Tens a day — navigation, tab switches, lists | Near-imperceptible, or none |
| Occasional — modals, drawers, toasts | The standard values here |
| Rare — first launch, empty states | Expressive motion is affordable |

The mechanism is habituation. A 200ms transition experienced once is a pleasing detail; experienced 200 times in a working day it is 40 seconds of waiting. Charm decays with exposure; cost does not. **This gate can legitimately return "build nothing", and does so more often than it is allowed to** — the commonest motion defect in generated interfaces is a well-tuned animation on something that should have been instant.

Whatever survives names exactly one purpose: feedback, spatial consistency, state indication, preventing a jarring change, explanation, or delight. One claiming three has identified none; one claiming none is deleted.

## 2. Springs are damping ratio and response

**Damping ratio** governs overshoot: 1.0 is critically damped and reaches the target without crossing it, 0.8 gives one barely-conscious overshoot, 0.5 a visible bounce. **Response** is roughly the time to reach the target. Never parameterise as mass, stiffness and damping — the triple is coupled, so raising stiffness to go faster silently lowers the damping ratio and adds overshoot.

| Motion | Damping | Response |
|---|---|---|
| Reposition / move | 1.0 | 0.4s |
| Rotation | 0.8 | 0.4s |
| Drawer / sheet | 0.8 | 0.3s |

On the web \`bounce = 1 − dampingRatio\` and \`duration\` plays the role of response, so a drawer is \`{ type: "spring", bounce: 0.2, duration: 0.3 }\`.

**Bounce requires momentum.** Overshoot is kinetic energy the object could not shed instantly, so it is legible only when the interaction supplied that energy. A tap is an impulse of zero duration at a point unrelated to the destination, so an overshoot afterwards has no attributable cause and reads as a glitch — a modal that springs 4% past its size is briefly the wrong size. The test: did the user's hand move the way the element is now moving? If not, \`bounce: 0\`.

## 3. Handoff, projection, and boundaries

When a gesture ends and a spring takes over, **the spring's initial velocity must equal the release velocity**, or the object decelerates to zero at release and accelerates again from rest — a stop-and-restart inside one continuous motion, destroying the illusion the user was touching the object. Measure over the last **50–100ms** of pointer samples: the final two events are one frame apart and dominated by sensor noise, so a steady 800px/s finger reports 40px/s or 3000px/s depending which pair you catch. Where a fling lands, and how a boundary resists:

\`\`\`
project(v, d) = (v / 1000) * d / (1 - d)     // d = 0.998 lists, 0.99 paging
rubberBand(x, dim, c = 0.55) = (x * dim * c) / (dim + c * Math.abs(x))
\`\`\`

**Snap to the point nearest the projected endpoint, not the release point.** Snapping from where the finger lifted discards the energy the user put in, so a hard flick and a gentle nudge land on the same item and users answer by flicking harder at something that cannot hear them. The decay is exponential, not \`v² / 2a\`, whose constant deceleration nothing implements.

Rubber-banding is asymptotic, so displacement past a boundary is bounded but never clipped and the surface keeps responding. A hard clamp leaves a dead zone where the finger moves and nothing does, which reads as a hang.

## 4. Never animate from the target value

Read the **live presentation value** — the object's position mid-flight — as the start of any new animation, blending the in-flight velocity in. Otherwise you get the snap-back: tap to open a menu, tap again 120ms later, and a close starting from the fully-open value teleports it somewhere it never reached and animates back — a jump then a reversal, at the moment the user is watching for confirmation.

Drive 2D motion with **independent X and Y springs**: one spring on the scalar distance imposes a single velocity profile on both axes, so they finish together however far each travelled and the path is a straight diagonal rather than a curve.

## 5. Gesture mechanics

Require **10px** of travel before locking to an axis: a finger pressing down always produces incidental movement, and a zero threshold turns taps into drags. Add ~**10px** of hit padding. Highlight on pointer-down, commit on pointer-up, cancel by dragging away and re-arm by returning. Detect plausible gestures in parallel and cancel the losers; chaining through failure requirements is the classic 300ms feeling. Decide reverse-versus-commit on **velocity sign**, position only as a tiebreaker. Preserve the grab offset, ignore other pointer IDs, and dismiss above **0.11 px/ms** as well as on distance.

## 6. Easing, durations, and reduced motion

Entering and exiting take **ease-out**; moving or morphing takes **ease-in-out**; hover and colour take **ease**; constant motion takes **linear**. **\`ease-in\` on interface motion is a defect** — it begins at zero velocity, so for the first 100ms after the user acts almost nothing happens, precisely the window in which they want confirmation.

\`\`\`css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
\`\`\`

Button press 100–160ms, tooltip 125–200ms, dropdown 150–250ms, modal or drawer 200–500ms. **UI feedback stays under 300ms**; past that the motion stops reading as a consequence of the action and starts reading as a wait. Staggers run 30–80ms, capped near 300ms.

Reduced motion means **gentler and fewer, not zero**: a ~200ms opacity cross-fade replacing transform motion, parallax and overshoot and looping dropped, colour and progress kept. Setting everything to 0ms removes the state-change signal along with the motion. Avoid periodic motion near **0.2Hz** and large moving backgrounds — that band mimics low-frequency self-motion cues, and the mismatch with a stationary body produces nausea.

## 7. Transform discipline and performance

Animate **\`transform\` and \`opacity\` only**; \`clip-path\` is sanctioned and \`height\` tolerated for accordions. Everything else triggers layout or paint every frame. Never \`scale(0)\` — enter from \`scale(0.90)\`–\`scale(0.97)\` with \`opacity: 0\`, press between 0.95 and 0.98. \`transform-origin\` anchors to the trigger, modals excepted; crossfade blur stays 2–20px.

CSS animations and WAAPI run off the main thread for compositor-friendly properties, so they hold 60fps through main-thread work that would stall a JavaScript \`requestAnimationFrame\` loop — which matters most during a route transition, as the incoming route parses and hydrates. \`element.animate()\` gives that control at compositor performance. Never drive a child's transform from a custom property set on an ancestor: those inherit, so each update invalidates style across the whole subtree. Use \`@starting-style\` for mounts, not a double-rAF flip.`,

    references: [
      {
        id: 'spring-and-gesture-physics',
        title: 'Springs, momentum, velocity handoff, boundaries, and gesture mechanics',
        answers:
          'How do I parameterise a spring, when is overshoot legitimate, how do I hand a gesture off to a spring without a visible stop, where should a fling land, how does rubber-banding work, and what are the thresholds and ownership rules a gesture recogniser needs?',
        content: `# Springs, momentum, velocity handoff, boundaries, and gesture mechanics

## 1. Springs are damping ratio and response

A spring is a second-order system with two perceptually meaningful parameters.

**Damping ratio** governs overshoot. At **1.0** the system is critically damped: it reaches the
target in minimum time without crossing it. Below 1.0 it is underdamped and overshoots, with
the overshoot growing as the ratio falls — 0.8 gives a small, single, barely-conscious
overshoot; 0.5 gives a visible bounce; 0.3 gives several oscillations. Above 1.0 it is
overdamped and approaches sluggishly, which almost never earns its cost.

**Response** is roughly the time to reach the target — the period of the underlying oscillator.
Lower response means a stiffer, faster spring.

The shipped configurations:

| Motion | Damping | Response | Rationale |
|---|---|---|---|
| Reposition / move | 1.0 | 0.4s | An element changing position carries no user-supplied energy; overshoot would be unmotivated |
| Rotation | 0.8 | 0.4s | Rotating objects have angular momentum, so a small overshoot is physically consistent |
| Drawer / sheet | 0.8 | 0.3s | Gesture-driven, so momentum is present; faster because the user is waiting on the surface |

Web mapping: Motion's \`bounce\` and \`duration\` correspond directly, with \`bounce = 1 −
dampingRatio\` and \`duration\` playing the role of response.

\`\`\`js
// damping 1.0, response 0.4s
animate(el, { x: 240 }, { type: "spring", bounce: 0, duration: 0.4 })

// damping 0.8, response 0.3s — drawer
animate(el, { y: 0 },   { type: "spring", bounce: 0.2, duration: 0.3 })
\`\`\`

**\`bounce: 0\` is the default.** Reach for \`bounce: 0.2\` only when momentum justifies it, per
the next section. If you find yourself with \`bounce: 0.4\` on a fade-in, you have not chosen a
spring — you have chosen a mannerism.

## 2. Bounce requires momentum

Overshoot is the visible consequence of kinetic energy the object could not shed instantly. It
is legible only when the interaction actually supplied that energy: a flick, a throw, a
drag-and-release, a rotation the user spun.

A bounce on a tap-triggered entrance reads as a bug, because a tap is an impulse of essentially
zero duration at a point that has nothing to do with the element's destination. The user
supplied no momentum, so the element overshooting its target has no cause the eye can
attribute, and the brain files it under "glitch" rather than "physics". If a modal appears when
you press a button and springs 4% past its final size before settling, the honest description
of what you built is a modal that is briefly the wrong size.

The test is one question: **did the user's hand move in the direction the element is now
moving?** If yes, bounce is available. If no, damping 1.0.

## 3. Velocity handoff

When a gesture ends and a spring takes over, the spring's initial velocity must equal the
gesture's release velocity. Otherwise the object decelerates to zero at the instant of release
and then accelerates again from rest, and the eye reads a stop-and-restart in the middle of one
continuous motion — the most common and most damaging gesture bug there is, because it destroys
the illusion that the user was ever touching the object.

Measure release velocity over the last **50–100ms** of pointer samples, not from the final two
events. The last two events are separated by one frame and are dominated by sensor noise, so a
finger that was moving steadily at 800px/s can report 40px/s or 3000px/s depending on which
pair you catch.

Some APIs want **relative velocity** — velocity normalised by the remaining distance, in units
of "fractions of the journey per second":

\`\`\`
relativeVelocity = gestureVelocity / (target - current)
\`\`\`

Worked example: the object sits at \`y = 50\`, the target is \`y = 150\`, and the finger is moving
at \`50 px/s\`. The remaining distance is 100px, so the relative velocity is \`50 / 100 = 0.5\` —
the object is covering half the remaining journey per second at the moment of handoff.

Guard the divisor. When \`target − current\` approaches zero the relative velocity diverges, so
clamp the denominator or skip the spring entirely — an object already at its target does not
need to be animated there.

## 4. Momentum projection

To decide where a fling should end up, project the endpoint from the release velocity and the
deceleration constant:

\`\`\`
project(v, d) = (v / 1000) * d / (1 - d)

d = 0.998   // normal deceleration — long coast, content lists
d = 0.99    // fast deceleration — short coast, paging and carousels
\`\`\`

\`v\` is in pixels per second; the \`/1000\` converts to pixels per millisecond, which is the unit
the decay factor operates in. With \`d = 0.998\` the multiplier is 499, so a 1000px/s flick
projects roughly 499px. With \`d = 0.99\` the multiplier is 99, so the same flick projects about
99px — five times shorter, which is why paging feels controlled and lists feel loose.

This is deliberately **not** the textbook \`v² / 2a\`. That formula assumes constant
deceleration, which produces a hard stop with a discontinuity in acceleration at the end of the
coast. Real scroll physics use exponential decay — velocity multiplied by \`d\` each millisecond
— which asymptotes smoothly and matches what platform scroll views actually do. Using the
kinematic formula gives endpoints that are wrong in a specific, felt way: too short for gentle
flicks and too long for hard ones.

**Snap to the point nearest the projected endpoint, not the release point.** This is the whole
reason to compute a projection. Snapping to the nearest point from where the finger lifted
throws away the energy the user put in, so a hard flick and a gentle nudge from the same
position land on the same item — the interface stops responding to force, and users respond by
flicking harder and harder at something that cannot hear them.

\`\`\`js
const projected = current + project(releaseVelocity, 0.99)
const target = snapPoints.reduce((a, b) =>
  Math.abs(b - projected) < Math.abs(a - projected) ? b : a
)
// then spring from \`current\` to \`target\` with initial velocity = releaseVelocity
\`\`\`

## 5. Rubber-banding

When a drag goes past a boundary, the surface should follow with progressively increasing
resistance:

\`\`\`
rubberBand(overshoot, dimension, c = 0.55) =
  (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot))
\`\`\`

\`dimension\` is the size of the container along the axis of travel; \`c = 0.55\` is the standard
constant.

The function's important property is that it is asymptotic: as \`overshoot → ∞\` the result
approaches \`dimension * c\`, so displacement is bounded but never clipped. At small overshoots
the response is nearly linear — the surface tracks the finger almost exactly, so the boundary
does not announce itself prematurely — and it compresses smoothly as you push further.

The mechanism that matters is that **resistance grows without a hard wall, so the surface
always responds to input**. A boundary that simply clamps produces a dead zone in which the
finger moves and nothing does, and a moving finger against a frozen surface reads as the
application having hung. Rubber-banding communicates "this is the edge" while continuing to
prove the interface is alive and listening.

## 6. Decompose 2D motion into independent axes

Run one spring on X and a separate spring on Y. Do not run a single spring on the 2D distance.

The two axes generally have different distances to cover — an element moving 300px right and
40px down, say. A single spring driving the scalar distance imposes one velocity profile on
both, so the shared spring effectively averages them and the axes finish at the same instant
regardless of how far each had to travel. The result is a straight-line diagonal, and objects
in the physical world under independent forces do not travel in straight lines from A to B.
Independent springs let the short axis settle first, which curves the path — and that curve is
the thing that makes the motion look like an object rather than an interpolation.

The same rule applies to scale and position on a shared element: independent springs, one per
property. Compose them at the transform, not at the driver.

## 7. Never animate from the target value

Always read the **live presentation value** — the object's actual current position mid-flight —
as the starting point of a new animation, and blend the current velocity into the new spring.

The failure this prevents is the **snap-back**. If a user taps to open a menu and taps again to
close it 120ms later, and the close animation starts from the fully-open value, the menu
teleports to a position it never reached and then animates back. The visible result is a jump
forward followed by a reversal, at the exact moment the user is watching to confirm their input
registered. It reads as the interface fighting them.

\`\`\`js
// wrong: assumes the open animation completed
el.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], …)

// right: retarget from wherever it actually is
const current = getComputedStyle(el).transform   // or the animation's live value
animate(el, { y: "-100%" }, { type: "spring", bounce: 0, duration: 0.3 })
\`\`\`

Motion libraries that own the value do this by default; hand-rolled keyframes and CSS
\`@keyframes\` do not, which is why interruptible motion should be driven by springs over live
state rather than by fixed keyframe sequences. A re-target should also inherit the in-flight
velocity, so a reversal that catches the object at speed decelerates through zero rather than
snapping direction.

## 8. Gesture mechanics

**Hysteresis before committing to a direction.** Require about **10px** of travel before
locking a drag to an axis or deciding it is a drag at all. The mechanism is that a finger
pressing down always produces a few pixels of incidental movement — skin deforms, the hand
settles — and a gesture recogniser with zero threshold interprets that as a directional intent,
so taps become drags and vertical scrolls get hijacked by horizontal swipe handlers.

**Hit padding.** Add roughly **10px** of invisible margin around interactive targets on top of
their visual bounds. Pointer position is reported precisely; the user's *intent* is not, and
near-misses at the edge of a control are the single largest source of "I clicked it and nothing
happened".

**Highlight on pointer-down, commit on pointer-up.** The down event is when feedback is owed,
because that is when the user has committed muscularly. The up event is when the action fires,
because that is what makes the gesture cancellable.

**Allow cancel by dragging away, and un-cancel by returning.** A user who presses a button and
realises mid-press it was the wrong one must be able to slide off it and release safely — and
if they slide back on before releasing, the press should re-arm. Removing the highlight
permanently on the first exit teaches users that the escape hatch is one-way when it need not
be.

**Detect all plausible gestures in parallel, then cancel the losers.** A view that can be
tapped, swiped horizontally and dragged vertically should evaluate all three from the same
pointer stream and let the first one to satisfy its threshold win. Sequential detection —
waiting for the tap recogniser to fail before starting the pan — inserts a delay before the
drag begins, which is the classic 300ms feeling.

**Decide reverse-vs-commit by velocity sign, not position.** A sheet dragged 80% of the way
open and then flicked downward should close, because the user's last expressed intent was
downward. Deciding on position alone means the sheet snaps open against a finger that was
visibly pushing it shut. Position is the tiebreaker when velocity is below the flick threshold,
not the primary signal.

**Respect the grab offset.** Record the delta between the pointer and the object's origin at
pointer-down and preserve it for the whole drag. Snapping the object's centre to the finger
causes a jump at the instant of grab proportional to how far from centre the user grabbed — and
users grab edges deliberately, because that is where they can still see what they are moving.

**Ignore secondary touch points once a drag begins.** Track the original pointer ID and drop
the rest. Otherwise a second finger landing, or the first finger lifting while a second is
down, re-anchors the drag to a new position and the object jumps across the screen. This
happens constantly in real one-handed use.

## 9. Flick-dismiss threshold

A dismissal gesture commits on velocity above **0.11 px/ms**, computed as \`|distance| /
elapsedMs\` over the recent pointer history:

\`\`\`js
const velocity = Math.abs(lastY - startY) / (lastTime - startTime)  // px/ms
const dismiss = velocity > 0.11 || Math.abs(lastY - startY) > threshold
\`\`\`

The velocity path exists so that a short, fast flick dismisses. Distance alone means a user
must drag a sheet halfway down the screen to close it, which is a large motion for a trivial
intent, and the fast flick — the natural gesture for "get rid of this" — springs back instead,
which reads as the interface refusing.

## Pass conditions

- Every spring is specified as damping ratio and response (or bounce and duration), never as
  mass/stiffness/damping.
- Every spring with a damping ratio below 1.0 is attached to a gesture that supplied momentum.
- Reposition springs use damping 1.0 / response 0.4s; rotation uses 0.8 / 0.4s; drawers and
  sheets use 0.8 / 0.3s.
- Every gesture-to-spring handoff passes the measured release velocity as the spring's initial
  velocity.
- Release velocity is measured over a 50–100ms window, not from the final two pointer events.
- Relative-velocity computations guard against a near-zero \`target − current\` denominator.
- Momentum projection uses \`(v / 1000) * d / (1 - d)\`, not \`v² / 2a\`.
- Snap targets are chosen by proximity to the projected endpoint, not to the release point.
- Boundary overscroll uses the asymptotic rubber-band formula with \`c = 0.55\`; no drag axis
  hard-clamps.
- 2D motion is driven by independent X and Y springs.
- No animation starts from a hard-coded target value; all re-targets read the live presentation
  value.
- Directional gestures require ~10px of travel before committing to an axis.
- Interactive targets carry ~10px of hit padding beyond their visual bounds.
- Press feedback appears on pointer-down; the action fires on pointer-up; dragging off cancels
  and dragging back re-arms.
- Competing gestures are evaluated in parallel, not chained through failure requirements.
- Commit-vs-reverse decisions consult velocity sign first and position only as a tiebreaker.
- Drags preserve the pointer-down grab offset and ignore additional pointer IDs.
- Flick dismissal fires above 0.11 px/ms in addition to any distance threshold.
`,
      },
      {
        id: 'timing-easing-and-performance',
        title:
          'Easing curves, the duration ladder, the frequency gate, reduced motion, and compositing',
        answers:
          'Which easing curve does this motion take, how long should it run, how do I decide whether to animate it at all, what does the reduced-motion branch replace it with, and which properties and APIs keep it off the main thread?',
        content: `# Easing curves, the duration ladder, the frequency gate, reduced motion, and compositing

## 1. Easing for non-spring motion

Not everything needs a spring. Discrete, non-interruptible, non-gestural motion is well served
by a curve, and curves are cheaper.

**Entering and exiting → ease-out.** The element decelerates into place, which is what an
object with mass arriving at a stop does. **Moving or morphing on screen → ease-in-out.** The
object is already present, so it must both start and stop, and symmetric acceleration reads as
a considered move. **Hover and colour → ease.** Small, ambient, symmetric. **Constant motion →
linear.** Spinners, marquees, progress. Anything eased will visibly pulse once per cycle.

**\`ease-in\` on interface motion is a defect.** It begins at zero velocity, so for the first
100ms after the user acts almost nothing happens — precisely the window in which they are
looking for confirmation that their input registered. The interface feels unresponsive even
though the total duration is identical to an ease-out version. Reserve \`ease-in\` for things
genuinely leaving the stage under acceleration, and even then prefer a faster ease-out.

\`\`\`css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
\`\`\`

\`--ease-drawer\` is the exception curve: a very fast start with a long, flat settle, which is
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

Animate **\`transform\` and \`opacity\` only**. \`clip-path\` is a sanctioned fourth; \`height\` is
tolerated for accordions where there is no honest alternative. Everything else — \`width\`,
\`top\`, \`margin\`, \`box-shadow\`, \`filter\` on large surfaces — triggers layout or paint on every
frame and will drop frames on the devices your users actually own.

**Never \`scale(0)\`.** An element scaled to zero has no dimensions, so its interior detail is
meaningless and it reads as a point of light rather than an object, and the perceived
acceleration on the way out is enormous. Enter from **\`scale(0.90)\` to \`scale(0.97)\`** with
\`opacity: 0\` — close enough that the element is recognisably itself from the first frame, far
enough that the growth is legible.

**Press: \`scale(0.95)\` to \`scale(0.98)\`.** Small controls take the deeper value because the
absolute displacement must remain perceptible; a full-width button at 0.95 visibly deforms.

**\`transform-origin\` anchors to the trigger.** A popover opened from a button in the top-right
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
\`requestAnimationFrame\` loop. This matters most at exactly the wrong moment: a route transition
animates while the incoming route's JavaScript parses and hydrates, which is the busiest the
main thread ever gets. A JS-driven transition there will stutter on every device; a CSS-driven
one will not.

**\`element.animate()\` gives JS-level control at CSS-level performance.** It returns an
\`Animation\` object with \`playbackRate\`, \`currentTime\`, \`cancel()\`, \`reverse()\` and a \`finished\`
promise, while still handing the work to the compositor. It is the correct default for
programmatic motion that does not need per-frame computation.

**Never drive a child's transform from a CSS custom property set on the parent.** Custom
properties are inherited, so updating one on a parent invalidates style for every descendant
that references it and forces a style recalculation across the entire subtree on each frame. A
list of 200 rows reading \`--offset\` from a scrolling container will recalculate 200 elements
per frame and drop to single-digit frame rates. Set the property on the animating element
itself, or animate \`transform\` directly.

**\`@starting-style\` replaces the mount-flag pattern.** Historically, animating an element on
insertion required rendering it in its initial state, forcing a reflow, then flipping a class
on the next frame — a pattern that is easy to get subtly wrong and that fails when React
batches the two states into one commit. \`@starting-style\` declares the pre-insertion values
directly, so the browser has both endpoints at insertion time.

\`\`\`css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out);
}
@starting-style {
  .toast { opacity: 0; transform: translateY(8px); }
}
\`\`\`

## Pass conditions

- No \`ease-in\` appears on any entrance, exit, or state transition.
- All non-spring easing resolves to one of \`--ease-out\`, \`--ease-in-out\`, or \`--ease-drawer\`.
- Every UI feedback animation is under 300ms; only large surfaces exceed it.
- List staggers fall in the 30–80ms range with total stagger capped near 300ms.
- Every animation names exactly one purpose from the six-item list.
- Every animation has passed the frequency gate, and high-frequency interactions have no
  animation.
- Only \`transform\`, \`opacity\`, \`clip-path\`, and (for accordions) \`height\` are animated.
- No \`scale(0)\`; entrances begin between \`scale(0.90)\` and \`scale(0.97)\`.
- Press states scale between 0.95 and 0.98.
- Non-modal popovers set \`transform-origin\` to their trigger's position.
- Any crossfade blur stays between 2px and 20px.
- \`prefers-reduced-motion: reduce\` yields ~200ms cross-fades, not \`animation: none\`.
- No looping motion sits near 0.2Hz and no full-viewport background animates continuously.
- No CSS custom property that drives a child transform is set on an animating ancestor.
- Mount animations use \`@starting-style\` rather than a double-rAF class flip.

`,
      },
    ],
  },

  rules: [
    {
      id: 'motion-physics/springs-as-damping-and-response',
      strength: 'must',
      statement:
        'Parameterise every spring as damping ratio and response — or the equivalent bounce and duration — never as mass, stiffness, and damping coefficient.',
      evidence: {
        rationale:
          'The physical triple is coupled: raising stiffness to shorten the response also lowers the effective damping ratio, so an edit meant to make the motion faster silently adds overshoot and the two values get chased against each other. Damping ratio and response are independent and each maps to something perceivable — how far it overshoots, and how long it takes. The same damping ratio also produces the same perceived overshoot on iOS, Android and web, so a value tuned in physics translates and one tuned in API parameters does not.',
        source: 'Vishwakarma motion-physics reference, section 1',
        confidence: 'strong',
      },
      examples: {
        language: 'js',
        bad: 'animate(el, { y: 0 }, { type: "spring", mass: 1, stiffness: 320, damping: 22 })',
        good: 'animate(el, { y: 0 }, { type: "spring", bounce: 0.2, duration: 0.3 })  // damping 0.8, response 0.3s',
      },
      verifiedBy: 'spring-and-gesture-review',
    },
    {
      id: 'motion-physics/bounce-requires-momentum',
      strength: 'must-not',
      statement:
        'Do not give a spring a damping ratio below 1.0 unless the gesture that triggered it carried momentum in the direction the element is now moving.',
      evidence: {
        rationale:
          'Overshoot is the visible consequence of kinetic energy the object could not shed instantly, so the eye accepts it only when the interaction actually supplied that energy. A tap is an impulse of essentially zero duration at a point that has nothing to do with the element’s destination, so an overshoot afterwards has no cause the eye can attribute and the brain files it under "glitch" rather than physics. A modal that springs 4% past its final size before settling is honestly described as a modal that is briefly the wrong size.',
        source: 'Vishwakarma motion-physics reference, section 2',
        confidence: 'strong',
      },
      examples: {
        language: 'js',
        bad: '// opened by a tap\nanimate(modal, { scale: 1 }, { type: "spring", bounce: 0.4, duration: 0.3 })',
        good: '// opened by a tap\nanimate(modal, { scale: 1 }, { type: "spring", bounce: 0, duration: 0.3 })',
      },
      exceptions: [
        'Rotation, which carries angular momentum, tolerates a small bounce (damping 0.8) even when the trigger was discrete.',
      ],
      verifiedBy: 'spring-and-gesture-review',
    },
    {
      id: 'motion-physics/velocity-handoff',
      strength: 'must',
      statement:
        'Pass the measured release velocity as the spring’s initial velocity at every gesture-to-spring handoff, measuring it over the last 50–100ms of pointer samples.',
      evidence: {
        rationale:
          'If the spring starts from rest, the object decelerates to zero at the instant of release and then accelerates again from nothing, so the eye reads a stop-and-restart in the middle of one continuous motion and the illusion that the user was ever touching the object collapses. The 50–100ms window matters because the final two pointer events are one frame apart and dominated by sensor noise: a finger moving steadily at 800px/s can report 40px/s or 3000px/s depending on which pair you catch.',
        source: 'Vishwakarma motion-physics reference, section 3',
        confidence: 'strong',
      },
      examples: {
        language: 'js',
        bad: 'onRelease(() => animate(el, { y: target }, { type: "spring", bounce: 0, duration: 0.3 }))',
        good: 'const v = velocityOver(samples, 80)   // px/s across the last ~80ms\nanimate(el, { y: target }, { type: "spring", bounce: 0, duration: 0.3, velocity: v })',
      },
      verifiedBy: 'spring-and-gesture-review',
    },
    {
      id: 'motion-physics/snap-to-projected-endpoint',
      strength: 'must',
      statement:
        'Choose a snap target by proximity to the projected endpoint, computed as (v / 1000) * d / (1 - d), rather than by proximity to the release point.',
      evidence: {
        rationale:
          'Snapping from where the finger lifted throws away the energy the user put in, so a hard flick and a gentle nudge from the same position land on the same item — the interface stops responding to force, and users answer by flicking harder and harder at something that cannot hear them. The exponential form is also load-bearing: platform scroll views multiply velocity by a decay factor each millisecond, so the kinematic v² / 2a assumes a constant deceleration that nothing implements and lands too short for gentle flicks and too long for hard ones.',
        source: 'Vishwakarma motion-physics reference, section 4',
        confidence: 'strong',
      },
      examples: {
        language: 'js',
        bad: 'const target = nearest(snapPoints, current)',
        good: 'const projected = current + (releaseVelocity / 1000) * 0.99 / (1 - 0.99)\nconst target = nearest(snapPoints, projected)',
      },
      verifiedBy: 'spring-and-gesture-review',
    },
    {
      id: 'motion-physics/never-animate-from-the-target-value',
      strength: 'must-not',
      statement:
        'Do not start an animation from a hard-coded target value; read the live presentation value and inherit the in-flight velocity when re-targeting.',
      evidence: {
        rationale:
          'The failure this prevents is the snap-back. If a user taps to open a menu and taps again 120ms later, and the close animation starts from the fully-open value, the menu teleports to a position it never reached and then animates back — a jump forward followed by a reversal, at the exact moment the user is watching to confirm their input registered, which reads as the interface fighting them. Motion libraries that own the value re-target correctly by default; fixed keyframe sequences and CSS @keyframes cannot, which is why interruptible motion must be spring-driven over live state.',
        source: 'Vishwakarma motion-physics reference, section 7',
        confidence: 'strong',
      },
      examples: {
        language: 'js',
        bad: 'el.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], 300)',
        good: 'animate(el, { y: "-100%" }, { type: "spring", bounce: 0, duration: 0.3 })  // re-targets from the live value',
      },
      verifiedBy: 'spring-and-gesture-review',
    },
    {
      id: 'motion-physics/no-ease-in-on-interface-motion',
      strength: 'must-not',
      statement:
        'Do not apply ease-in to an entrance, exit, or state transition; resolve non-spring easing to ease-out, ease-in-out, or the drawer curve.',
      evidence: {
        rationale:
          'ease-in begins at zero velocity, so for the first 100ms after the user acts almost nothing happens — precisely the window in which they are looking for confirmation that their input registered. The total duration is identical to an ease-out version, but the perceptible part of the motion has been deferred to the end, so the interface feels unresponsive for a reason nobody can name from the timing values alone. Entrances and exits are objects with mass arriving at or leaving a stop, and that is deceleration.',
        source: 'Vishwakarma motion-physics reference, section 9',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '.toast { transition: transform 200ms ease-in; }',
        good: '.toast { transition: transform 200ms var(--ease-out); }',
      },
      verifiedBy: 'motion-scan',
    },
    {
      id: 'motion-physics/ui-feedback-under-300ms',
      strength: 'must',
      statement:
        'Keep every UI feedback animation under 300ms; only large surfaces such as drawers, sheets, and modals may exceed it.',
      evidence: {
        rationale:
          'Past roughly 300ms the animation stops being perceived as a consequence of the action and starts being perceived as a wait: the causal link between input and response weakens, and the user begins attributing the delay to the system rather than to the object. Duration otherwise scales with distance and area, because a large surface moving quickly implies an implausibly large force and reads as violent, which is the only reason a drawer earns 400ms — its travel genuinely takes time.',
        source: 'Vishwakarma motion-physics reference, section 10',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '.button:active { transition: transform 450ms var(--ease-out); }',
        good: '.button:active { transition: transform 120ms var(--ease-out); }',
      },
      verifiedBy: 'motion-scan',
    },
    {
      id: 'motion-physics/transform-and-opacity-only',
      strength: 'must',
      statement:
        'Animate only transform and opacity — with clip-path sanctioned and height tolerated for accordions — and never scale to zero.',
      evidence: {
        rationale:
          'width, top, margin, box-shadow, and filter on large surfaces trigger layout or paint on every frame, so they drop frames on the mid-range devices your users actually own rather than on the workstation the motion was tuned on. scale(0) is a separate defect: an element scaled to zero has no dimensions, so its interior detail is meaningless and it reads as a point of light rather than an object, with an enormous perceived acceleration on the way out. Entrances start between scale(0.90) and scale(0.97), close enough to be recognisably themselves from the first frame.',
        source: 'Vishwakarma motion-physics reference, section 14',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '@keyframes in { from { width: 0; height: 0; } to { width: 320px; height: 200px; } }',
        good: '@keyframes in { from { transform: scale(0.95); opacity: 0; } to { transform: none; opacity: 1; } }',
      },
      verifiedBy: 'motion-scan',
    },
    {
      id: 'motion-physics/reduced-motion-branch-on-every-path',
      strength: 'must',
      statement:
        'Give every motion path a prefers-reduced-motion branch that becomes a roughly 200ms cross-fade, rather than removing the transition entirely.',
      evidence: {
        rationale:
          'Setting every transition to 0ms removes the state-change signal along with the motion, and an interface where things appear and disappear instantly is harder to follow, not easier. The branch drops what actually causes harm — parallax, overshoot, looping motion, anything moving independently of the user’s scroll — and keeps opacity, colour, and progress, which carry information. Periodic motion near 0.2Hz over a large field of view is the specific combination associated with vestibular discomfort, because it mimics the low-frequency self-motion cues the vestibular system reads and the mismatch with a stationary body produces nausea.',
        source: 'Vishwakarma motion-physics reference, section 11',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }',
        good: '@media (prefers-reduced-motion: reduce) {\n  .sheet { transition: opacity 200ms var(--ease-out); transform: none; }\n}',
      },
      verifiedBy: 'motion-scan',
    },
    {
      id: 'motion-physics/frequency-gate-before-values',
      strength: 'must',
      statement:
        'Run the frequency gate before choosing any duration, curve, or spring, and accept "build nothing" as its answer for high-frequency interactions.',
      evidence: {
        rationale:
          'Habituation works against the animation. A 200ms transition experienced once is a pleasing detail; experienced 200 times in a working day it is 40 seconds of waiting and a source of low-grade irritation the user cannot articulate, because charm decays with exposure and cost does not. The most common motion defect in generated interfaces is therefore not a badly-tuned animation but a well-tuned animation on something that should have been instant, and a command palette that eases open in 150ms is delightful in a demo and is why a power user switches tools.',
        source: 'Vishwakarma motion-physics reference, section 12',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '.command-palette { transition: opacity 150ms, transform 150ms; }',
        good: '.command-palette { /* opened 100+ times a day: no transition */ }',
      },
      verifiedBy: 'timing-and-purpose-review',
    },
  ],

  verification: [
    {
      id: 'motion-scan',
      kind: 'command',
      description: 'Check durations, easings, and reduced-motion coverage.',
      command: 'python3 scripts/check_motion.py .',
      blocking: true,
    },
    {
      id: 'spring-and-gesture-review',
      kind: 'self-review',
      description:
        'Confirm springs, handoffs, projections, and gesture ownership follow the physics.',
      blocking: true,
      questions: [
        'Is every spring stated as damping ratio and response (or bounce and duration), and does every damping ratio below 1.0 belong to a gesture that supplied momentum in that direction?',
        'Does every gesture-to-spring handoff pass a release velocity measured over 50–100ms of samples, and does any relative-velocity computation guard a near-zero target − current denominator?',
        'Is every snap target chosen by proximity to the projected endpoint from (v / 1000) * d / (1 - d), rather than to the release point?',
        'Does any animation start from a hard-coded target value instead of the live presentation value, and does any re-target discard the in-flight velocity?',
        'Do drags require ~10px before committing to an axis, preserve the pointer-down grab offset, ignore additional pointer IDs, and decide commit-versus-reverse on velocity sign with position only as a tiebreaker?',
      ],
    },
    {
      id: 'timing-and-purpose-review',
      kind: 'self-review',
      description: 'Confirm each animation earned its existence, its purpose, and its duration.',
      blocking: true,
      questions: [
        'For each animation in the diff, how often will a real user see it, and did the frequency gate return "build nothing" for anything at the top of that scale?',
        'Which single purpose does each animation name — feedback, spatial consistency, state indication, preventing a jarring change, explanation, or delight — and is anything claiming two or none?',
        'Is every UI feedback animation under 300ms, with only large surfaces exceeding it, and do list staggers sit in the 30–80ms band with the total capped near 300ms?',
        'Does any easing resolve to ease-in, or to a curve outside ease-out, ease-in-out, and the drawer curve?',
      ],
    },
    {
      id: 'reduced-motion-and-performance-review',
      kind: 'self-review',
      description: 'Confirm the reduced-motion branch and the compositing path are both real.',
      questions: [
        'With prefers-reduced-motion enabled, has every motion path been exercised, and does each become a ~200ms cross-fade rather than nothing at all?',
        'Does any looping motion sit near 0.2Hz, and does any full-viewport background animate continuously under any setting?',
        'Are only transform, opacity, clip-path, and accordion height animated, with no scale(0), entrances between 0.90 and 0.97, presses between 0.95 and 0.98, and crossfade blur between 2px and 20px?',
        'Is any CSS custom property that drives a descendant transform being set on an animating ancestor, and do mount animations use @starting-style rather than a double-rAF class flip?',
      ],
    },
  ],

  relatedSkills: ['motion-design', 'micro-interactions', 'scroll-experiences', 'platform-apple'],
}
