# Interruptible and gesture-driven animation

The difference between UI that feels alive and UI that feels broken is almost entirely
here. A user who interacts with an element mid-animation is a normal case, not an edge
case, and the response to it is the strongest single signal of quality.

## Why restarting is the defect

An animation declares a start value, an end value, and a curve. Re-triggering it re-runs
that declaration from the start value. If the element is currently 70% of the way through
an entrance and you play the exit, the element jumps to 100% and then leaves.

The jump is a teleport. Object permanence is one of the earliest perceptual capabilities
humans develop, and an object that discontinuously changes position registers as *a
different object*. That is why the sensation is not "slightly wrong" but "broken": the
model of a screen containing persistent things has been falsified.

Correct behaviour has two requirements, and most implementations satisfy only the first:

1. **Position continuity.** The new animation starts from where the element actually is.
2. **Velocity continuity.** The new animation starts with the speed the element actually
   had. Without this, an element travelling at 900px/s stops dead and re-accelerates —
   still a discontinuity, just in the first derivative rather than the zeroth.

## Duration-based interruption

CSS transitions handle case 1 automatically: the computed value at interruption becomes the
new start value, which is the main reason to prefer transitions over keyframes for state
changes. They do not handle case 2 — the new transition begins at velocity zero — which is
acceptable below roughly 300ms and visible above it.

Imperative animations need explicit handling. The pattern:

    const current = getComputedStyle(el).transform   // resolved mid-flight value
    for (const a of el.getAnimations()) a.cancel()
    el.animate(
      [{ transform: current }, { transform: 'none' }],
      { duration: 200, easing: 'cubic-bezier(0.4, 0, 1, 1)' }
    )

Two details matter. `getComputedStyle` must be read *before* cancelling, since cancelling
reverts to the underlying value. And the remaining duration should be scaled by how far
the element still has to travel: replaying a full 250ms for the last 30% of the distance
produces motion that is visibly, uncannily slow.

Keeping the animation running and reversing it via `animation.playbackRate = -1` preserves
both, but is only correct where the exit is the reversed entrance — which, per the
faster-exit rule, it usually is not.

## Springs are interruptible by construction

A spring is integrated per frame from state, not sampled from a curve:

    // per frame, dt in seconds
    const F = -stiffness * (position - target) - damping * velocity
    velocity += (F / mass) * dt
    position += velocity * dt

Nothing in this loop refers to a start value or an elapsed time. Changing `target`
mid-flight is therefore not an interruption at all — the integrator continues with the
position and velocity it already has, and the motion is C¹-continuous by construction. This
is the strongest argument for springs in interactive UI, and it has nothing to do with
bounce.

Use a fixed timestep (typically 1/120s) with an accumulator rather than raw frame deltas, or
the motion changes character when the frame rate drops. Terminate when
`|position − target| < 0.01` **and** `|velocity| < 0.01`, not on position alone, or the
spring settles while still moving and visibly clips.

## Gestures: tracking

While the pointer is down, the transform is a pure function of pointer displacement. No
easing, no smoothing, no interpolation toward the target — the finger is the clock, and any
lag reads as the surface being detached from the touch, which is far more noticeable than
jitter.

Mechanics that prevent the common defects:

- Use Pointer Events and call `setPointerCapture` on `pointerdown`, so the gesture
  survives the pointer leaving the element and `pointerup` still arrives.
- Set `touch-action` to declare the axis you are handling (`pan-y` for a horizontal
  swipe). Without it the browser's own scrolling competes with yours, and because
  scrolling runs on the compositor it wins.
- Use an activation threshold of roughly 8-10px before committing, so a tap with slight
  movement is not swallowed.

## Boundary resistance

Past a limit, apply a diminishing fraction of the overscroll rather than clamping. A
standard formulation:

    offset = (1 - 1 / (overscroll * c / dimension + 1)) * dimension    // c ≈ 0.55

The offset approaches `dimension` asymptotically, so the surface never quite stops
responding but clearly resists. A hard clamp is worse: the surface appears frozen, which is
indistinguishable from a bug.

## Release: velocity and projection

On `pointerup`, compute velocity from the last 50-100ms of samples, not the final two
events — the last two are dominated by the deceleration of lifting a finger and routinely
report near-zero for what the user experienced as a fast flick.

Then decide the destination by **projection**, not by position:

    projected = position + velocity * projectionFactor   // ≈ 0.1-0.2s of travel

Commit if the projected endpoint crosses halfway, otherwise return. A quick flick covering
only 15% of the distance should still commit, because the intent was expressed in the
velocity. Deciding on displacement alone is why some swipe-to-dismiss implementations feel
like they need a shove.

Feed the measured velocity into the settling animation as its initial velocity — trivial
with a spring integrator, since it is already a state variable. The element then continues
at the speed the hand gave it, which makes the handover from direct manipulation to
system-driven motion imperceptible.

## Reduced motion still applies

Gesture tracking is direct manipulation and is exempt. The *settling* animation is
system-driven: shorten it, and remove any accompanying parallax or scaling backdrop under
`prefers-reduced-motion: reduce`.
