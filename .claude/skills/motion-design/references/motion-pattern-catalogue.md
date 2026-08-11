# Motion patterns by intent, with parameters

Every entry states the intent it serves, the parameters, and the failure that occurs when
it is done wrong. Durations assume a desktop viewport; scale the transform distances, not
the times, for small screens.

## Enter / exit pairs

**Modal dialog.** Enter 250ms decelerate: opacity 0→1, `scale(0.96)→scale(1)`,
`translateY(8px)→0`. Exit 160ms accelerate, same properties reversed. The backdrop
fades on the same schedule but with no transform. Scale from 0.96, not 0.8: a large
surface scaling from far below its final size reads as being thrown at the user. Where
the dialog has a clear trigger, scale from the trigger's position instead of the centre —
`transform-origin` set to the trigger's offset — which converts the modal from an
apparition into an expansion.

*Failure:* symmetric 250ms exit. The dismissal feels reluctant.

**Drawer / sheet.** Enter 300ms decelerate: `translateX(-100%)→0` (or Y for a bottom
sheet). Exit 200ms accelerate. Always translate along the axis of the edge it belongs to;
a left drawer that fades in without moving has lost the only thing it was communicating,
which is *where it lives when closed*.

**Dropdown / popover / select menu.** Enter 150ms decelerate: opacity 0→1,
`scale(0.97)→1` with `transform-origin` at the corner nearest the trigger,
`translateY(-4px)→0`. Exit 100ms. These are short because the menu appears adjacent to
the pointer and the user is already looking at it — there is no distance to explain.

**Tooltip.** Enter 120ms after a 400-600ms hover-intent delay; exit 80ms, with a ~100ms
grace period if the pointer is travelling toward the tooltip. Animate opacity plus a 4px
translate away from the anchor.

**Toast / snackbar.** Enter 250ms decelerate, translating in from the edge it is docked
to. Hold for 4-6s, or indefinitely if it carries an action. Exit 150ms accelerate. When
several stack, translate the existing ones with a 200ms transform rather than re-laying
out the container.

## Transform

**Accordion / disclosure.** 250ms `cubic-bezier(0.4, 0, 0.2, 1)` on
`grid-template-rows: 0fr → 1fr`, with the content opacity fading over the last 60% for
open and the first 40% for close. The chevron rotates 180deg on the same curve and
duration — rotating it on a different schedule from the panel breaks the causal link.

**Tab panel.** Cross-fade 150ms with a 10px translate in the direction of travel. Do not
animate the height between panels of different sizes; reserve the taller height or accept
the jump, because a height animation on tab switch delays every switch by its duration.

**List reorder, add, remove.** FLIP, 300ms `cubic-bezier(0.4, 0, 0.2, 1)`. Removals
should exit first (150ms), then the survivors move; running both at once produces items
crossing through each other. New items fade and scale in *after* the reflow completes.

**Shared element / hero transition.** 350-400ms. The element's transform is the primary
motion; everything else cross-fades under it. This is the strongest continuity cue there is
and it is worth the extra 100ms, since the point is that the user tracks one object across
a context change.

## Respond

**Button press.** `scale(0.97)` in 80ms ease-out on pointerdown, returning in 120ms on
pointerup. The return is slower than the press because a press is driven by the user and
the release is driven by the spring.

**Toggle / switch.** 200ms. The thumb translates on `cubic-bezier(0.4, 0, 0.2, 1)`; the
track colour crosses over the first 60% so the colour has already committed by the time
the thumb lands.

**Ripple / hit feedback.** 300-400ms, starting at the exact pointer coordinates, opacity
decaying to 0 as the radius grows past the element bounds. Origin at the pointer is the
entire content of the signal — a centred ripple communicates nothing about where the tap
landed.

## Attract

**Pulse / nudge.** 500ms per cycle, maximum three cycles, then stop permanently. Scale
between 1 and 1.04, never more. Anything that pulses indefinitely becomes invisible
within about fifteen seconds and irritating well before that.

**New-item highlight.** A background tint fading out over 1.5s linear. Slow is correct
here: this is peripheral, and fast motion in the periphery reads as an alert.

## Occupy

**Indeterminate spinner.** Linear rotation, 800-1200ms per revolution. Linear is
mandatory — eased rotation reads as stuttering because the eye tracks angular velocity
directly.

**Skeleton shimmer.** A gradient sweep, 1.2-1.6s, with a 200-400ms pause between passes.
A continuous sweep with no pause reads as faster than the content is actually loading and
raises the sense of latency.

**Determinate progress.** Transition `transform: scaleX()` on each update with a 200ms
linear ease. Never animate `width`, and never animate progress backwards — clamp to
monotonic increase, because a bar that retreats destroys trust in the estimate.

## Affirm / reject

**Success check.** `stroke-dashoffset` drawing over 300ms decelerate, with the
container scaling 0.8→1 with a spring at ζ ≈ 0.6. This is the one place overshoot is
unambiguously correct: the bounce reads as satisfaction.

**Invalid input shake.** `translateX`: 0 → −6 → 6 → −3 → 0 over 350ms. Exactly two
decaying oscillations. More reads as a malfunction rather than a refusal. The shake must
never be the only error signal — pair it with text, since it is invisible to anyone who
was not looking at that field.

## Scroll

At most one scroll-triggered reveal per section, and never the same fade-up on every
element on the page. Reveal *groups*, not items. Trigger at 15-20% visibility, animate
20px of translate and opacity over 400ms, and **fire once** — re-animating on scroll-back
makes the page feel unstable.

Scroll-linked (as opposed to scroll-triggered) effects must be driven by a scroll timeline
rather than by a scroll event handler, because event-driven updates run a frame behind the
compositor and visibly lag the content they are attached to.
