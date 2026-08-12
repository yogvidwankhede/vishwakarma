# Springs, momentum, velocity handoff, boundaries, and gesture mechanics

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

Web mapping: Motion's `bounce` and `duration` correspond directly, with `bounce = 1 −
dampingRatio` and `duration` playing the role of response.

```js
// damping 1.0, response 0.4s
animate(el, { x: 240 }, { type: "spring", bounce: 0, duration: 0.4 })

// damping 0.8, response 0.3s — drawer
animate(el, { y: 0 },   { type: "spring", bounce: 0.2, duration: 0.3 })
```

**`bounce: 0` is the default.** Reach for `bounce: 0.2` only when momentum justifies it, per
the next section. If you find yourself with `bounce: 0.4` on a fade-in, you have not chosen a
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

```
relativeVelocity = gestureVelocity / (target - current)
```

Worked example: the object sits at `y = 50`, the target is `y = 150`, and the finger is moving
at `50 px/s`. The remaining distance is 100px, so the relative velocity is `50 / 100 = 0.5` —
the object is covering half the remaining journey per second at the moment of handoff.

Guard the divisor. When `target − current` approaches zero the relative velocity diverges, so
clamp the denominator or skip the spring entirely — an object already at its target does not
need to be animated there.

## 4. Momentum projection

To decide where a fling should end up, project the endpoint from the release velocity and the
deceleration constant:

```
project(v, d) = (v / 1000) * d / (1 - d)

d = 0.998   // normal deceleration — long coast, content lists
d = 0.99    // fast deceleration — short coast, paging and carousels
```

`v` is in pixels per second; the `/1000` converts to pixels per millisecond, which is the unit
the decay factor operates in. With `d = 0.998` the multiplier is 499, so a 1000px/s flick
projects roughly 499px. With `d = 0.99` the multiplier is 99, so the same flick projects about
99px — five times shorter, which is why paging feels controlled and lists feel loose.

This is deliberately **not** the textbook `v² / 2a`. That formula assumes constant
deceleration, which produces a hard stop with a discontinuity in acceleration at the end of the
coast. Real scroll physics use exponential decay — velocity multiplied by `d` each millisecond
— which asymptotes smoothly and matches what platform scroll views actually do. Using the
kinematic formula gives endpoints that are wrong in a specific, felt way: too short for gentle
flicks and too long for hard ones.

**Snap to the point nearest the projected endpoint, not the release point.** This is the whole
reason to compute a projection. Snapping to the nearest point from where the finger lifted
throws away the energy the user put in, so a hard flick and a gentle nudge from the same
position land on the same item — the interface stops responding to force, and users respond by
flicking harder and harder at something that cannot hear them.

```js
const projected = current + project(releaseVelocity, 0.99)
const target = snapPoints.reduce((a, b) =>
  Math.abs(b - projected) < Math.abs(a - projected) ? b : a
)
// then spring from `current` to `target` with initial velocity = releaseVelocity
```

## 5. Rubber-banding

When a drag goes past a boundary, the surface should follow with progressively increasing
resistance:

```
rubberBand(overshoot, dimension, c = 0.55) =
  (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot))
```

`dimension` is the size of the container along the axis of travel; `c = 0.55` is the standard
constant.

The function's important property is that it is asymptotic: as `overshoot → ∞` the result
approaches `dimension * c`, so displacement is bounded but never clipped. At small overshoots
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

```js
// wrong: assumes the open animation completed
el.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], …)

// right: retarget from wherever it actually is
const current = getComputedStyle(el).transform   // or the animation's live value
animate(el, { y: "-100%" }, { type: "spring", bounce: 0, duration: 0.3 })
```

Motion libraries that own the value do this by default; hand-rolled keyframes and CSS
`@keyframes` do not, which is why interruptible motion should be driven by springs over live
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

A dismissal gesture commits on velocity above **0.11 px/ms**, computed as `|distance| /
elapsedMs` over the recent pointer history:

```js
const velocity = Math.abs(lastY - startY) / (lastTime - startTime)  // px/ms
const dismiss = velocity > 0.11 || Math.abs(lastY - startY) > threshold
```

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
- Relative-velocity computations guard against a near-zero `target − current` denominator.
- Momentum projection uses `(v / 1000) * d / (1 - d)`, not `v² / 2a`.
- Snap targets are chosen by proximity to the projected endpoint, not to the release point.
- Boundary overscroll uses the asymptotic rubber-band formula with `c = 0.55`; no drag axis
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
