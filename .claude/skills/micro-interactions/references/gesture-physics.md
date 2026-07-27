# Gesture physics: resistance, momentum, and thresholds

A gesture feels correct when the interface behaves like a physical object with mass and
friction, and wrong when it behaves like a value being assigned. Three mechanisms carry
almost all of the difference: resistance past a boundary, momentum after release, and a
commit threshold that considers velocity as well as distance.

## 1. Tracking

While a finger or pointer is down, the tracked element moves 1:1 with it. No easing, no
smoothing, no interpolation. Any lag between finger and object destroys the illusion of
direct manipulation instantly, and the illusion is the entire value of the gesture.

Read positions from `pointermove` and write transforms in a single `requestAnimationFrame`
callback. Never write a transform from inside the event handler on a busy page: coalesced
pointer events can deliver several moves per frame and you will do the same work repeatedly.
Use `getCoalescedEvents()` when you need the true path, such as for drawing.

## 2. Resistance past a boundary (rubber-banding)

When the gesture continues past a limit — a list already at the top, a sheet already fully
open — the correct response is not to stop and not to continue freely, but to continue with
progressively increasing resistance. Stopping dead reads as a bug; free movement reads as an
absent boundary. Resistance communicates "there is an edge here, and you have reached it"
without ever taking control away.

The widely used formulation, matching the feel of native scroll views:

    offset = (1 - 1 / (x * c / d + 1)) * d / c

where `x` is the raw overscroll distance, `d` is the dimension of the scrolling axis, and
`c` is a resistance constant around 0.55. The function is linear near zero, so the first
few pixels track the finger faithfully, and asymptotes toward `d / c`, so the element can
never be dragged arbitrarily far. A simpler approximation that feels acceptable for small
overshoots is a fixed drag coefficient of 0.5 applied to distance beyond the boundary, but
it lacks the asymptote and therefore lets a determined drag travel implausibly far.

On release, return to the boundary with a spring rather than a duration-based ease. A spring
consumes the release velocity, so a fast flick past the edge snaps back fast and a slow drag
returns gently — the same code producing the two behaviours the user expects.

## 3. Momentum after release

Release velocity should be computed from the last 50-100ms of movement, not from the final
two events, which are noisy and frequently near zero because fingers decelerate before
lifting. Keep a short ring buffer of (position, timestamp) samples and take the slope.

Free deceleration follows `v(t) = v0 * pow(f, t)` with a friction factor around 0.95 per
16ms frame; the total distance travelled is `v0 / (1 - f)` per frame-unit, which is the
number you want when deciding in advance where a fling will land. Predicting the resting
position before animating is what makes snap-to-item possible: compute the free landing
point, choose the nearest snap candidate, then animate to *that* with a spring, rather than
animating freely and correcting afterwards. Correction after the fact is visible and reads as
the interface fighting the user.

## 4. Commit thresholds

A commit decision must consider distance **or** velocity, never distance alone. A slow,
deliberate drag past 40% of the element's width is a commit. A fast flick that only travels
15% is also a commit — the user expressed intent through speed, and requiring them to also
travel the distance makes the interface feel heavy and unresponsive.

Workable thresholds for swipe-to-dismiss:

- Commit if displacement exceeds 40% of the element's width along the dismiss axis.
- Or commit if release velocity exceeds ~0.5 px/ms in the dismiss direction, regardless of
  displacement.
- Otherwise spring back to rest, initialising the spring with the measured release velocity
  so the return is continuous with the gesture rather than starting from zero.

Lock the axis early. Compare the first ~10px of travel: if the horizontal component exceeds
the vertical by roughly 2:1, treat the gesture as horizontal for its entire life and ignore
vertical movement thereafter. Re-evaluating the axis continuously produces a gesture that
drifts diagonally and satisfies neither intent.

## 5. Pull to refresh

Only arm the gesture when the scroller is exactly at `scrollTop === 0` at
`pointerdown`; arming mid-scroll causes a refresh whenever a fast upward fling reaches the
top. Apply the rubber-band function to the pull, and place the trigger threshold at
60-80px of *rendered* offset, which corresponds to a considerably longer finger travel once
resistance is applied — that extra travel is what prevents accidental refreshes.

Cross the threshold once and latch it: change the indicator state, fire a single haptic, and
do not re-fire if the user wobbles across the boundary. On release past the threshold, snap
to a hold offset of about 48px, run the refresh, then collapse. Set
`overscroll-behavior-y: contain` on the scroller so the browser's own pull-to-refresh and
scroll chaining do not compete with yours.

## 6. Reduced motion and accessibility

`prefers-reduced-motion` does not mean "no gestures". Direct manipulation is not the
motion that provokes vestibular symptoms — unrequested large-area travel is. Keep 1:1
tracking, keep the commit, and replace the momentum and spring-back animations with short
fades or instant settles.

Every gesture needs a non-gestural equivalent: swipe-to-dismiss needs a close button,
drag-to-reorder needs keyboard move commands, pull-to-refresh needs a refresh control. A
gesture is an accelerator for people who can perform it, never the sole route to a
capability.
