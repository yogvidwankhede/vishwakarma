# Motion Physics

Every convincing interface animation is a claim about a physical object: it has mass, it carries momentum, it resists being stopped, and it cannot occupy two positions at once. The values below are not taste. They are the parameters at which a simulated object stops reading as an animation and starts reading as a thing — and, just as importantly, the thresholds past which motion stops reading as a response and starts reading as a delay.

This file is the platform-neutral layer. The spring API you reach for on iOS, the interpolator on Android, and the spring in a web motion library are three encodings of the same second-order system, and the same damping ratio produces the same perceived overshoot in all three. **Tune in physics, translate to API** — the reverse produces three interfaces that disagree with each other.

The single most useful thing in this document is not a number. It is the **frequency gate** in section 12, which decides whether any of the other numbers apply at all.

## 1. Springs are damping ratio and response

A spring is a second-order system with two perceptually meaningful parameters.

**Damping ratio** governs overshoot. At **1.0** the system is critically damped: it reaches the target in minimum time without crossing it. Below 1.0 it is underdamped and overshoots, with the overshoot growing as the ratio falls — 0.8 gives a small, single, barely-conscious overshoot; 0.5 gives a visible bounce; 0.3 gives several oscillations. Above 1.0 it is overdamped and approaches sluggishly, which almost never earns its cost.

**Response** is roughly the time to reach the target — the period of the underlying oscillator. Lower response means a stiffer, faster spring.

The shipped configurations:

| Motion | Damping | Response | Rationale |
|---|---|---|---|
| Reposition / move | 1.0 | 0.4s | An element changing position carries no user-supplied energy; overshoot would be unmotivated |
| Rotation | 0.8 | 0.4s | Rotating objects have angular momentum, so a small overshoot is physically consistent |
| Drawer / sheet | 0.8 | 0.3s | Gesture-driven, so momentum is present; faster because the user is waiting on the surface |

Web mapping: Motion's `bounce` and `duration` correspond directly, with `bounce = 1 − dampingRatio` and `duration` playing the role of response.

```js
// damping 1.0, response 0.4s
animate(el, { x: 240 }, { type: "spring", bounce: 0, duration: 0.4 })

// damping 0.8, response 0.3s — drawer
animate(el, { y: 0 },   { type: "spring", bounce: 0.2, duration: 0.3 })
```

**`bounce: 0` is the default.** Reach for `bounce: 0.2` only when momentum justifies it, per the next section. If you find yourself with `bounce: 0.4` on a fade-in, you have not chosen a spring — you have chosen a mannerism.

## 2. Bounce requires momentum

Overshoot is the visible consequence of kinetic energy the object could not shed instantly. It is legible only when the interaction actually supplied that energy: a flick, a throw, a drag-and-release, a rotation the user spun.

A bounce on a tap-triggered entrance reads as a bug, because a tap is an impulse of essentially zero duration at a point that has nothing to do with the element's destination. The user supplied no momentum, so the element overshooting its target has no cause the eye can attribute, and the brain files it under "glitch" rather than "physics". If a modal appears when you press a button and springs 4% past its final size before settling, the honest description of what you built is a modal that is briefly the wrong size.

The test is one question: **did the user's hand move in the direction the element is now moving?** If yes, bounce is available. If no, damping 1.0.

## 3. Velocity handoff

When a gesture ends and a spring takes over, the spring's initial velocity must equal the gesture's release velocity. Otherwise the object decelerates to zero at the instant of release and then accelerates again from rest, and the eye reads a stop-and-restart in the middle of one continuous motion — the most common and most damaging gesture bug there is, because it destroys the illusion that the user was ever touching the object.

Measure release velocity over the last **50–100ms** of pointer samples, not from the final two events. The last two events are separated by one frame and are dominated by sensor noise, so a finger that was moving steadily at 800px/s can report 40px/s or 3000px/s depending on which pair you catch.

Some APIs want **relative velocity** — velocity normalised by the remaining distance, in units of "fractions of the journey per second":

```
relativeVelocity = gestureVelocity / (target - current)
```

Worked example: the object sits at `y = 50`, the target is `y = 150`, and the finger is moving at `50 px/s`. The remaining distance is 100px, so the relative velocity is `50 / 100 = 0.5` — the object is covering half the remaining journey per second at the moment of handoff.

Guard the divisor. When `target − current` approaches zero the relative velocity diverges, so clamp the denominator or skip the spring entirely — an object already at its target does not need to be animated there.

## 4. Momentum projection

To decide where a fling should end up, project the endpoint from the release velocity and the deceleration constant:

```
project(v, d) = (v / 1000) * d / (1 - d)

d = 0.998   // normal deceleration — long coast, content lists
d = 0.99    // fast deceleration — short coast, paging and carousels
```

`v` is in pixels per second; the `/1000` converts to pixels per millisecond, which is the unit the decay factor operates in. With `d = 0.998` the multiplier is 499, so a 1000px/s flick projects roughly 499px. With `d = 0.99` the multiplier is 99, so the same flick projects about 99px — five times shorter, which is why paging feels controlled and lists feel loose.

This is deliberately **not** the textbook `v² / 2a`. That formula assumes constant deceleration, which produces a hard stop with a discontinuity in acceleration at the end of the coast. Real scroll physics use exponential decay — velocity multiplied by `d` each millisecond — which asymptotes smoothly and matches what platform scroll views actually do. Using the kinematic formula gives endpoints that are wrong in a specific, felt way: too short for gentle flicks and too long for hard ones.

**Snap to the point nearest the projected endpoint, not the release point.** This is the whole reason to compute a projection. Snapping to the nearest point from where the finger lifted throws away the energy the user put in, so a hard flick and a gentle nudge from the same position land on the same item — the interface stops responding to force, and users respond by flicking harder and harder at something that cannot hear them.

```js
const projected = current + project(releaseVelocity, 0.99)
const target = snapPoints.reduce((a, b) =>
  Math.abs(b - projected) < Math.abs(a - projected) ? b : a
)
// then spring from `current` to `target` with initial velocity = releaseVelocity
```

## 5. Rubber-banding

When a drag goes past a boundary, the surface should follow with progressively increasing resistance:

```
rubberBand(overshoot, dimension, c = 0.55) =
  (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot))
```

`dimension` is the size of the container along the axis of travel; `c = 0.55` is the standard constant.

The function's important property is that it is asymptotic: as `overshoot → ∞` the result approaches `dimension * c`, so displacement is bounded but never clipped. At small overshoots the response is nearly linear — the surface tracks the finger almost exactly, so the boundary does not announce itself prematurely — and it compresses smoothly as you push further.

The mechanism that matters is that **resistance grows without a hard wall, so the surface always responds to input**. A boundary that simply clamps produces a dead zone in which the finger moves and nothing does, and a moving finger against a frozen surface reads as the application having hung. Rubber-banding communicates "this is the edge" while continuing to prove the interface is alive and listening.

## 6. Decompose 2D motion into independent axes

Run one spring on X and a separate spring on Y. Do not run a single spring on the 2D distance.

The two axes generally have different distances to cover — an element moving 300px right and 40px down, say. A single spring driving the scalar distance imposes one velocity profile on both, so the shared spring effectively averages them and the axes finish at the same instant regardless of how far each had to travel. The result is a straight-line diagonal, and objects in the physical world under independent forces do not travel in straight lines from A to B. Independent springs let the short axis settle first, which curves the path — and that curve is the thing that makes the motion look like an object rather than an interpolation.

The same rule applies to scale and position on a shared element: independent springs, one per property. Compose them at the transform, not at the driver.

## 7. Never animate from the target value

Always read the **live presentation value** — the object's actual current position mid-flight — as the starting point of a new animation, and blend the current velocity into the new spring.

The failure this prevents is the **snap-back**. If a user taps to open a menu and taps again to close it 120ms later, and the close animation starts from the fully-open value, the menu teleports to a position it never reached and then animates back. The visible result is a jump forward followed by a reversal, at the exact moment the user is watching to confirm their input registered. It reads as the interface fighting them.

```js
// wrong: assumes the open animation completed
el.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], …)

// right: retarget from wherever it actually is
const current = getComputedStyle(el).transform   // or the animation's live value
animate(el, { y: "-100%" }, { type: "spring", bounce: 0, duration: 0.3 })
```

Motion libraries that own the value do this by default; hand-rolled keyframes and CSS `@keyframes` do not, which is why interruptible motion should be driven by springs over live state rather than by fixed keyframe sequences. A re-target should also inherit the in-flight velocity, so a reversal that catches the object at speed decelerates through zero rather than snapping direction.

## 8. Gesture mechanics

**Hysteresis before committing to a direction.** Require about **10px** of travel before locking a drag to an axis or deciding it is a drag at all. The mechanism is that a finger pressing down always produces a few pixels of incidental movement — skin deforms, the hand settles — and a gesture recogniser with zero threshold interprets that as a directional intent, so taps become drags and vertical scrolls get hijacked by horizontal swipe handlers.

**Hit padding.** Add roughly **10px** of invisible margin around interactive targets on top of their visual bounds. Pointer position is reported precisely; the user's *intent* is not, and near-misses at the edge of a control are the single largest source of "I clicked it and nothing happened".

**Highlight on pointer-down, commit on pointer-up.** The down event is when feedback is owed, because that is when the user has committed muscularly. The up event is when the action fires, because that is what makes the gesture cancellable.

**Allow cancel by dragging away, and un-cancel by returning.** A user who presses a button and realises mid-press it was the wrong one must be able to slide off it and release safely — and if they slide back on before releasing, the press should re-arm. Removing the highlight permanently on the first exit teaches users that the escape hatch is one-way when it need not be.

**Detect all plausible gestures in parallel, then cancel the losers.** A view that can be tapped, swiped horizontally and dragged vertically should evaluate all three from the same pointer stream and let the first one to satisfy its threshold win. Sequential detection — waiting for the tap recogniser to fail before starting the pan — inserts a delay before the drag begins, which is the classic 300ms feeling.

**Decide reverse-vs-commit by velocity sign, not position.** A sheet dragged 80% of the way open and then flicked downward should close, because the user's last expressed intent was downward. Deciding on position alone means the sheet snaps open against a finger that was visibly pushing it shut. Position is the tiebreaker when velocity is below the flick threshold, not the primary signal.

**Respect the grab offset.** Record the delta between the pointer and the object's origin at pointer-down and preserve it for the whole drag. Snapping the object's centre to the finger causes a jump at the instant of grab proportional to how far from centre the user grabbed — and users grab edges deliberately, because that is where they can still see what they are moving.

**Ignore secondary touch points once a drag begins.** Track the original pointer ID and drop the rest. Otherwise a second finger landing, or the first finger lifting while a second is down, re-anchors the drag to a new position and the object jumps across the screen. This happens constantly in real one-handed use.

## 9. Easing for non-spring motion

Not everything needs a spring. Discrete, non-interruptible, non-gestural motion is well served by a curve, and curves are cheaper.

**Entering and exiting → ease-out.** The element decelerates into place, which is what an object with mass arriving at a stop does.
**Moving or morphing on screen → ease-in-out.** The object is already present, so it must both start and stop, and symmetric acceleration reads as a considered move.
**Hover and colour → ease.** Small, ambient, symmetric.
**Constant motion → linear.** Spinners, marquees, progress. Anything eased will visibly pulse once per cycle.

**`ease-in` on interface motion is a defect.** It begins at zero velocity, so for the first 100ms after the user acts almost nothing happens — precisely the window in which they are looking for confirmation that their input registered. The interface feels unresponsive even though the total duration is identical to an ease-out version. Reserve `ease-in` for things genuinely leaving the stage under acceleration, and even then prefer a faster ease-out.

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

`--ease-drawer` is the exception curve: a very fast start with a long, flat settle, which is what a large surface pulled by a gesture should do. Its zero final velocity is what lets a 400ms drawer still feel immediate.

## 10. Duration ladder

| Motion | Duration |
|---|---|
| Button press / release | 100–160ms |
| Tooltip, small popover | 125–200ms |
| Dropdown, select menu | 150–250ms |
| Modal, drawer, sheet | 200–500ms |

Duration scales with distance and area, because a large surface moving quickly implies an implausibly large force and reads as violent, while a small element moving slowly reads as sticky.

**Hard ceiling: UI feedback stays under 300ms.** Past roughly 300ms the animation stops being perceived as a consequence of the action and starts being perceived as a wait — the causal link between input and response weakens, and the user begins to attribute the delay to the system rather than to the object. Drawers and modals may exceed it only because they are large surfaces whose travel genuinely takes time, and even then they should feel finished before they are.

**Stagger between list items: 30–80ms.** The mechanism is that a stagger converts a wall of simultaneous change into a readable sequence with an implied direction. Below 30ms the items read as simultaneous and the stagger costs time for nothing; above 80ms the last item in a ten-item list arrives 800ms after the first, and the user has already started reading. Cap total stagger at about 300ms regardless of item count — stagger the first several items and land the rest together.

## 11. Reduced motion

**Gentler and fewer, not zero.** Setting every transition to 0ms removes the state-change signal along with the motion, and an interface where things appear and disappear instantly is harder to follow, not easier.

Replace transform-based motion with a **~200ms opacity cross-fade**. Drop parallax, overshoot, looping motion, and anything that moves independently of the user's scroll. Keep colour transitions, opacity changes, and progress indicators that carry meaning.

Avoid periodic motion near **0.2Hz — one cycle per five seconds** — and avoid large moving backgrounds under any setting. That frequency band, combined with large field-of-view coverage, is the combination most associated with vestibular discomfort, because it mimics the low-frequency self-motion cues the vestibular system uses and the mismatch with a stationary body produces nausea. A slowly drifting full-viewport gradient is the canonical offender: it looks tasteful in a design review and is the reason someone closes the tab.

## 12. The frequency gate

Before selecting any duration, curve, or spring, answer one question: **how often will this user see this animation?**

| Frequency | Correct amount of motion |
|---|---|
| 100+ times a day — keyboard shortcuts, command palettes, autocomplete | None |
| Tens of times a day — navigation, tab switches, list updates | Near-imperceptible, or none |
| Occasional — modals, drawers, toasts, onboarding steps | The standard values in this file |
| Rare or first-time — first launch, empty states, celebrations | Expressive motion is affordable here |

The mechanism is habituation working against you. A 200ms transition experienced once is a pleasing detail; experienced 200 times in a working day it is 40 seconds of waiting and a source of low-grade irritation the user cannot articulate. Charm decays with exposure; cost does not. A command palette that eases open in 150ms is delightful in a demo and is the reason a power user switches tools.

**This gate can legitimately return "build nothing", and that is the correct answer more often than it is given.** The most common motion defect in generated interfaces is not a badly-tuned animation; it is a well-tuned animation on something that should have been instant.

## 13. Purpose naming

Every animation must name its purpose as exactly one of:

**Feedback** — the input was received. **Spatial consistency** — where this came from and where it went. **State indication** — something changed, here. **Preventing a jarring change** — smoothing a transition that would otherwise be a jump cut. **Explanation** — showing a relationship or a mechanism the static frames cannot. **Delight** — a deliberate spend, subject to the frequency gate.

Exactly one. An animation claiming three purposes has usually not identified any, and one claiming none gets deleted. This is the cheapest review in the whole discipline: ask what each animation is for, and delete the ones with no answer.

## 14. Transform discipline

Animate **`transform` and `opacity` only**. `clip-path` is a sanctioned fourth; `height` is tolerated for accordions where there is no honest alternative. Everything else — `width`, `top`, `margin`, `box-shadow`, `filter` on large surfaces — triggers layout or paint on every frame and will drop frames on the devices your users actually own.

**Never `scale(0)`.** An element scaled to zero has no dimensions, so its interior detail is meaningless and it reads as a point of light rather than an object, and the perceived acceleration on the way out is enormous. Enter from **`scale(0.90)` to `scale(0.97)`** with `opacity: 0` — close enough that the element is recognisably itself from the first frame, far enough that the growth is legible.

**Press: `scale(0.95)` to `scale(0.98)`.** Small controls take the deeper value because the absolute displacement must remain perceptible; a full-width button at 0.95 visibly deforms.

**`transform-origin` anchors to the trigger.** A popover opened from a button in the top-right must scale out of its top-right corner, because the origin *is* the statement that this surface came from that button. A menu scaling from its own centre is a surface that appeared from nowhere and happens to be near a button. Modals are exempt — a centred modal is a context switch, not an expansion of a specific control, and forcing it to grow from a trigger 600px away produces a long diagonal slide that costs more attention than it buys.

**Blur masks crossfades at about 2px, and stays under 20px.** A small blur during a content swap hides the moment where both layers are simultaneously at 50% opacity and the composite reads as a double exposure. Above 20px the blur stops masking and becomes the effect, and on large surfaces it is expensive enough to cost frames.

## 15. Flick-dismiss threshold

A dismissal gesture commits on velocity above **0.11 px/ms**, computed as `|distance| / elapsedMs` over the recent pointer history:

```js
const velocity = Math.abs(lastY - startY) / (lastTime - startTime)  // px/ms
const dismiss = velocity > 0.11 || Math.abs(lastY - startY) > threshold
```

The velocity path exists so that a short, fast flick dismisses. Distance alone means a user must drag a sheet halfway down the screen to close it, which is a large motion for a trivial intent, and the fast flick — the natural gesture for "get rid of this" — springs back instead, which reads as the interface refusing.

## 16. Performance mechanisms

**CSS animations and WAAPI run off the main thread** when they animate only compositor-friendly properties, so they keep 60fps through main-thread work that would stall a JavaScript-driven `requestAnimationFrame` loop. This matters most at exactly the wrong moment: a route transition animates while the incoming route's JavaScript parses and hydrates, which is the busiest the main thread ever gets. A JS-driven transition there will stutter on every device; a CSS-driven one will not.

**`element.animate()` gives JS-level control at CSS-level performance.** It returns an `Animation` object with `playbackRate`, `currentTime`, `cancel()`, `reverse()` and a `finished` promise, while still handing the work to the compositor. It is the correct default for programmatic motion that does not need per-frame computation.

**Never drive a child's transform from a CSS custom property set on the parent.** Custom properties are inherited, so updating one on a parent invalidates style for every descendant that references it and forces a style recalculation across the entire subtree on each frame. A list of 200 rows reading `--offset` from a scrolling container will recalculate 200 elements per frame and drop to single-digit frame rates. Set the property on the animating element itself, or animate `transform` directly.

**`@starting-style` replaces the mount-flag pattern.** Historically, animating an element on insertion required rendering it in its initial state, forcing a reflow, then flipping a class on the next frame — a pattern that is easy to get subtly wrong and that fails when React batches the two states into one commit. `@starting-style` declares the pre-insertion values directly, so the browser has both endpoints at insertion time.

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

- Every spring is specified as damping ratio and response (or bounce and duration), never as mass/stiffness/damping.
- Every spring with a damping ratio below 1.0 is attached to a gesture that supplied momentum.
- Reposition springs use damping 1.0 / response 0.4s; rotation uses 0.8 / 0.4s; drawers and sheets use 0.8 / 0.3s.
- Every gesture-to-spring handoff passes the measured release velocity as the spring's initial velocity.
- Release velocity is measured over a 50–100ms window, not from the final two pointer events.
- Relative-velocity computations guard against a near-zero `target − current` denominator.
- Momentum projection uses `(v / 1000) * d / (1 - d)`, not `v² / 2a`.
- Snap targets are chosen by proximity to the projected endpoint, not to the release point.
- Boundary overscroll uses the asymptotic rubber-band formula with `c = 0.55`; no drag axis hard-clamps.
- 2D motion is driven by independent X and Y springs.
- No animation starts from a hard-coded target value; all re-targets read the live presentation value.
- Directional gestures require ~10px of travel before committing to an axis.
- Interactive targets carry ~10px of hit padding beyond their visual bounds.
- Press feedback appears on pointer-down; the action fires on pointer-up; dragging off cancels and dragging back re-arms.
- Competing gestures are evaluated in parallel, not chained through failure requirements.
- Commit-vs-reverse decisions consult velocity sign first and position only as a tiebreaker.
- Drags preserve the pointer-down grab offset and ignore additional pointer IDs.
- No `ease-in` appears on any entrance, exit, or state transition.
- All non-spring easing resolves to one of `--ease-out`, `--ease-in-out`, or `--ease-drawer`.
- Every UI feedback animation is under 300ms; only large surfaces exceed it.
- List staggers fall in the 30–80ms range with total stagger capped near 300ms.
- Every animation names exactly one purpose from the six-item list.
- Every animation has passed the frequency gate, and high-frequency interactions have no animation.
- Only `transform`, `opacity`, `clip-path`, and (for accordions) `height` are animated.
- No `scale(0)`; entrances begin between `scale(0.90)` and `scale(0.97)`.
- Press states scale between 0.95 and 0.98.
- Non-modal popovers set `transform-origin` to their trigger's position.
- Any crossfade blur stays between 2px and 20px.
- Flick dismissal fires above 0.11 px/ms in addition to any distance threshold.
- `prefers-reduced-motion: reduce` yields ~200ms cross-fades, not `animation: none`.
- No looping motion sits near 0.2Hz and no full-viewport background animates continuously.
- No CSS custom property that drives a child transform is set on an animating ancestor.
- Mount animations use `@starting-style` rather than a double-rAF class flip.
