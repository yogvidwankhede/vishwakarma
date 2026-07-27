# Micro-interaction catalogue with parameters

Each entry gives the trigger, the feedback, working parameters, and the failure mode that
appears when they are wrong. Values are starting points for a pointer-and-touch web
interface; adjust for brand character, not for novelty.

## Button press

Trigger `pointerdown`. Feedback `transform: scale(0.97)` plus a small darkening.
Attack 80-100ms `ease-out`; release 150-200ms `ease-out`; minimum visible hold 90ms.
Release on `pointerup`, `pointercancel` and `lostpointercapture`.
**Fails as:** a stuck pressed state after a scroll begun on the button; a press invisible on
a fast tap; text blurring below scale 0.94.

## Toggle / switch

Trigger `click` or `change`. The thumb translates the track width minus padding with a
spring near stiffness 400 / damping 30, or 200ms `cubic-bezier(0.2, 0, 0, 1.2)`, while
the track colour crossfades. Move it optimistically, then reconcile.
**Fails as:** a thumb waiting on a server round-trip, making a control whose whole purpose
is immediacy feel broken.

## Checkbox tick

Set `stroke-dasharray` to the path length and animate `stroke-dashoffset` from that
length to 0 over 140-180ms `ease-out`, starting ~40ms after the box fill so the two do not
compete. Unchecking should not reverse the draw — fade the tick over 100ms, since un-drawing
reads as undoing the drawing rather than as a change of state.
**Fails as:** a tick that fades in, which conveys arrival but not action.

## Ripple

Trigger `pointerdown` at the pointer coordinates. A circle scales from 0 to a radius
covering the furthest corner over 300-500ms while fading to ~0.12 alpha; the fade-out begins
at `max(pointerup, 220ms)` and runs 200ms.
**Fails as:** a ripple on a fixed-timer lifetime, still expanding after the element has been
replaced or the route has changed. A uniform state layer ports better.

## Input focus and floating label

Focus ring appears with no transition; border colour transitions over 120ms; the label moves
with `transform: translateY(-1.1em) scale(0.82)` and `transform-origin: left center`
over 150ms `ease-out`.
**Fails as:** animating `font-size` and `top`, which forces layout each frame and
wobbles the baseline; or transitioning the focus ring, which reads as input lag.

## Validation state

Reserve the message slot with `min-height`. On error animate opacity 0→1 and
`translateY(4px→0)` over 120ms; on recovery fade out over 80ms. Move focus only on
submit, never on blur.
**Fails as:** an inserted message pushing the submit button down while the pointer travels
toward it, producing a misclick on whatever took its place.

## Copy to clipboard

`navigator.clipboard.writeText()`, then crossfade the icon to a tick over 120ms, hold
1200-2000ms, revert over 120ms. Announce "Copied" through a polite live region, and keep the
button's box size fixed.
**Fails as:** a purely visual confirmation, invisible to assistive technology; or a label
change from "Copy" to "Copied" resizing the button under the cursor.

## Like / favourite

Animate on the user-driven transition only. The icon scales 1 → 1.25 → 1.0 over 320ms with a
spring, plus an optional burst of 6-8 particles travelling 12-20px and fading over 400ms.
Un-liking is a plain 150ms fade with no burst, because the burst celebrates an addition.
**Fails as:** replaying on mount, so a back-navigation sets off every like on screen.

## Drag handle and lift

Activate after 6-8px of movement or a 200ms hold. Lift over 150ms: `scale(1.02)`,
elevation up one level, opacity ~0.95 on the source slot. The dragged item tracks the pointer
1:1 with no easing — smoothing reads as lag, since the finger is ground truth.
**Fails as:** `touch-action: none` on the container rather than the handle, killing
scrolling for the whole list.

## Sortable list reflow

Displaced siblings translate with FLIP: measure, reorder, invert, play. 200-250ms
`ease-out`, staggered by at most 15ms. Commit the DOM reorder on drop, not during the
drag.
**Fails as:** animating `top` or `margin` on every sibling, producing jank
proportional to list length.

## Toast entry and stacking

Enter with `translateY(8px→0)` and opacity over 200ms; exit over 150ms. Cap the stack at
three visible and translate existing toasts with a spring as a new one arrives. Pause the
dismissal timer on hover and on focus within, resuming with the remaining time. Minimum
lifetime 5s.
**Fails as:** an unpausable timer, making a message containing a link impossible to use and
failing WCAG 2.2 SC 2.2.1.

## Skeleton

Match the final content's box dimensions exactly. Show only after ~200ms of waiting, and once
shown keep it for at least ~300ms to avoid a flash. Prefer a static tinted block; if a
shimmer is required, translate a pseudo-element rather than animating
`background-position`, and stop it under `prefers-reduced-motion`.
**Fails as:** a shimmer cut short by fast data, seen as a flicker; or skeleton dimensions
unequal to the content, producing layout shift on arrival.

## Progress

Determinate values are monotonic; interpolate toward each new value over ~300ms rather than
jumping. Move from indeterminate to determinate as soon as a real figure exists, never back.
Cap the visual at 99% until completion is confirmed.
**Fails as:** a bar that retreats when an estimate worsens, read as the system losing work.

## Number roll-up

`font-variant-numeric: tabular-nums`. Roll only changed digits, 400-600ms `ease-out`,
staggered 20-30ms from the least significant. Skip the roll for changes under 5% and for any
figure the user is about to act on.
**Fails as:** proportional figures, so the layout jitters horizontally for the whole run.

## Count badge

Scale 1.0 → 1.12 → 1.0 over 200ms on increment. Do not attach a live region to a passive
badge, or every background change interrupts the user's reading.
**Fails as:** a spin or bounce pulling the eye off the task for a number nobody needed yet.
