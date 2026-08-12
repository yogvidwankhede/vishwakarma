// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Micro-interactions are where perceived quality actually lives.
 *
 * Nobody has ever described an interface as excellent because its button press scaled to
 * 0.97 over 90ms and released over 160ms. They describe it as "solid", "responsive",
 * "expensive" — words that name a sensation rather than a cause. The cause is a few dozen
 * small behaviours, each individually beneath notice, each individually cheap, and each
 * individually easy to get wrong in a way that no code review will catch.
 *
 * The two failure modes are symmetrical. Under-doing it produces an interface that feels
 * dead: presses that do not depress, toggles that teleport, confirmations that never
 * arrive. Over-doing it produces one that feels obstructive: ripples still expanding after
 * the page has changed, confetti on the four-hundredth completed task, a save button that
 * waits for its own animation before saving.
 *
 * The organising principle that resolves both is that feedback reports on an outcome and
 * must never be on the critical path to it.
 */
export const microInteractions: SkillManifest = {
  vsm: '1.0',
  id: 'micro-interactions',
  name: 'Micro-interactions',
  description:
    'Use when building presses, toggles, hovers, drags, swipes, toasts, or loading states — any small feedback behaviour that must feel responsive.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'motion',
  tags: ['micro-interaction', 'feedback', 'gesture', 'haptics', 'press', 'hover', 'toast'],

  activation: {
    intents: [
      'adding press, hover, focus, active, or selected feedback to a control',
      'building a toggle, checkbox, switch, like button, or copy-to-clipboard control',
      'implementing drag handles, sortable lists, swipe-to-dismiss, or pull-to-refresh',
      'designing toast, snackbar, skeleton, progress, or counter behaviour',
      'the user says the interface feels dead, laggy, cheap, unresponsive, or unpolished',
      'reviewing whether an animation is delaying the action it is meant to describe',
    ],
    globs: [
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/*button*.{ts,tsx,css}',
      '**/*toast*.{ts,tsx,css}',
      '**/*toggle*.{ts,tsx,css}',
      '**/*.css',
    ],
    keywords: [
      'micro-interaction',
      'hover',
      'press',
      'ripple',
      'toast',
      'skeleton',
      'swipe',
      'drag',
      'haptic',
      'feedback',
    ],
  },

  content: {
    summary:
      'Give every control proportionate, interruptible feedback with real parameters — press physics, hover intent, gesture thresholds, confirmations — without ever letting an animation delay the outcome it describes.',

    body: `# Micro-interactions

A micro-interaction is the smallest complete unit of interface behaviour: one trigger, one
rule set, one piece of feedback, one loop. Pressing a button. Copying a token. Dragging a
row. Each is individually beneath notice; collectively they are the entire sensation of a
product being well or badly built — what users report as "it feels solid" and cannot
decompose further. Nobody says "the press attack was 90ms". They say the cheap one feels
cheap. This is also the cheapest quality available: a correct press state is four lines, and
getting it wrong costs nothing in review and everything in feel.

---

## 1. Anatomy

Four parts; naming them tells you which is broken.

**Trigger** — what starts it, and on which event. Press feedback belongs on
\`pointerdown\`: \`click\` fires on *release*, so a control bound to it is inert for the
whole duration of the press — precisely the window in which the user asks "did that
register?".

**Rules** — what may happen, and above all what happens on interruption. Most
micro-interactions are written for the clean sequence and disintegrate on \`pointercancel\`,
on a second press mid-flight, or on unmount.

**Feedback** — the visual, textual, or tactile report, proportional to the event: a routine
action earns a routine acknowledgement, never a celebration.

**Loops and modes** — what the hundredth repetition feels like, and what changes when the
control is busy, disabled, or already active. Charming once and grating forty times means
no loop rule.

---

## 2. Restraint: feedback reports an outcome, it never gates one

**Any animation a state change waits on is a bug.** It exists to tell the user the system
heard them; delaying the system inverts that purpose.

\`\`\`ts
await ripple.finished   // bug: every save is now 300ms late
await save()

void save()             // correct: commit, then animate the consequence
ripple.play()
\`\`\`

The rule governs exits equally: a deleted row animates out of a list whose data already
excludes it. And if a user can outrun the animation by pressing twice, the second press must
land on the new state rather than be swallowed by the first one's transition.

---

## 3. Press physics

**Scale to 0.97, not 0.9.** A press reads as the surface yielding, not the object shrinking. On a 44px control \`scale(0.97)\` moves each edge in by 0.66px — below the
threshold at which you see displacement, above the one at which you feel it. At 0.9 a 320px
button pulls its edges in by 16px: the label resamples and the button appears to retreat
from the page. The cue is edge displacement in pixels, not ratio, so larger surfaces need
*less* — 0.98 above ~200px, 0.96 below ~32px.

**Set \`transform-origin\` to the anchor.** A menu growing from its trigger uses that
corner; a full-width row scaled about \`center\` breaks alignment with its neighbours, so
shift its background instead. The default \`50% 50%\` on an edge-anchored element is the
commonest cause of a press that "looks wrong" for no nameable reason.

**Asymmetric timing.** Attack fast, release slower: 80-100ms in, 150-200ms back, both
\`ease-out\`. A tap can be shorter than the attack, so release only at
\`max(pointerup, attack complete)\`.

**Always release on \`pointercancel\`.** A state cleared only on \`pointerup\` sticks when
the browser claims the gesture for scrolling or a system alert steals the pointer. Use one
cleanup path for \`pointerup\`, \`pointercancel\` and \`lostpointercapture\`.

**Ripples travel badly.** Ported out of a platform where every surface has one, a ripple
asserts that *where* you clicked matters when it does not, and its 300-600ms expansion
routinely outlives the press — still growing on a screen that has already navigated. Gate
its exit on release and cancellation, never on a timer.

---

## 4. Intent: distinguishing a movement from a decision

**Hover delays must be asymmetric.** Opening on the first pixel produces menus that flicker
open as the pointer crosses them en route elsewhere; closing on the first pixel of exit
produces menus that vanish while the user is diagonally reaching for them. Open after ~100ms
of sustained hover, close after ~300ms, and cancel the close if the pointer re-enters either.
Once one item in a menu bar is open, drop the open delay to zero for its siblings: the mode
is already committed.

**Drags need an activation threshold.** Start only after ~6-8px of travel, or a ~200ms hold
on touch; without it every tap is a one-pixel drag and any attempt to scroll a sortable list
picks up a row. Scope \`touch-action: none\` to the handle alone.

**Hover is not universal.** Gate hover affordances behind
\`@media (hover: hover) and (pointer: fine)\`: touch browsers emulate \`:hover\` on tap and
leave it applied until the next tap elsewhere, so an ungated hover style becomes a stuck
state indistinguishable from a selection bug.

---

## 5. State-change feedback

Prefer feedback that *draws the transition* over feedback that decorates it. A tick animated
with \`stroke-dashoffset\` from its path length to 0 over ~150ms shows the mark being made;
a tick that fades in shows nothing. A switch thumb overshoots slightly while the
track colour crossfades over the same window, because the two are one event.

A floating label must animate with \`transform: translateY() scale()\` and
\`transform-origin: left center\`, never \`font-size\` and \`top\` — those force layout every
frame and jitter the baseline. Focus rings, conversely, should not transition at all: a
fading ring reads as lag to the keyboard user who most depends on it.

Validation must not move the layout: reserve the error slot with \`min-height\` and animate
only opacity and a 4px rise, or the message pushes the submit button out from under a cursor
already travelling toward it. And confirmations must be announced, not merely drawn: a tick
swapped into a copy button tells a sighted user everything and a screen-reader user nothing.

---

## 6. Quantity, duration, and loading

Rolling numbers need \`font-variant-numeric: tabular-nums\`, or the container resizes every
frame and the digits shear. Roll only changed digits, cap the run at ~600ms, and never
roll a value the user is about to act on. A count badge going 3 to 4 wants a 1.0 → 1.12 → 1.0
pulse over ~200ms: "this changed", without demanding a read.

Progress must be monotonic: a bar that retreats destroys trust more thoroughly than no bar
at all, so when the estimate worsens, hold the value and slow the rate.

**A static skeleton usually beats a shimmering one.** A shimmer is an infinite animation
whose cycle almost never aligns with the load, so data arriving in 200ms produces a flash of
moving light that reads as a defect — and it animates for the whole wait, on the weakest
devices, at the moment the main thread is busiest. A calm skeleton at the exact dimensions of
the incoming content, revealed only after ~200ms, is better on every axis.

---

## 7. Haptics

One haptic per committed state change, latched — never on hover, never on every tick of a
drag. \`navigator.vibrate()\` requires sticky user activation, is ignored under silent and
do-not-disturb, and is absent from Safari, so iOS has no supported programmatic path at all.
Haptics enhance; they never carry information alone.

---

## 8. Failure modes

- **Animation blocking input.** An exiting overlay that keeps \`pointer-events: auto\` eats
  the first click aimed past it, which is perceived as a dropped input.
- **Celebration on routine actions.** Confetti is a depleting asset: reserve it for a
  genuine first, because on a daily task it is an obstacle.
- **Bursts replaying on mount.** Animating from a boolean prop rather than a user event
  fires every like on the page when the user navigates back.
- **Motion as the only signal.** Under \`prefers-reduced-motion\` the state change stays and
  the travel goes.`,

    references: [
      {
        id: 'interaction-catalogue',
        title: 'Micro-interaction catalogue with parameters',
        answers:
          'What are the concrete parameters — durations, easings, thresholds, properties — for each common micro-interaction, and what is the specific failure mode of each?',
        content: `# Micro-interaction catalogue with parameters

Each entry gives the trigger, the feedback, working parameters, and the failure mode that
appears when they are wrong. Values are starting points for a pointer-and-touch web
interface; adjust for brand character, not for novelty.

## Button press

Trigger \`pointerdown\`. Feedback \`transform: scale(0.97)\` plus a small darkening.
Attack 80-100ms \`ease-out\`; release 150-200ms \`ease-out\`; minimum visible hold 90ms.
Release on \`pointerup\`, \`pointercancel\` and \`lostpointercapture\`.
**Fails as:** a stuck pressed state after a scroll begun on the button; a press invisible on
a fast tap; text blurring below scale 0.94.

## Toggle / switch

Trigger \`click\` or \`change\`. The thumb translates the track width minus padding with a
spring near stiffness 400 / damping 30, or 200ms \`cubic-bezier(0.2, 0, 0, 1.2)\`, while
the track colour crossfades. Move it optimistically, then reconcile.
**Fails as:** a thumb waiting on a server round-trip, making a control whose whole purpose
is immediacy feel broken.

## Checkbox tick

Set \`stroke-dasharray\` to the path length and animate \`stroke-dashoffset\` from that
length to 0 over 140-180ms \`ease-out\`, starting ~40ms after the box fill so the two do not
compete. Unchecking should not reverse the draw — fade the tick over 100ms, since un-drawing
reads as undoing the drawing rather than as a change of state.
**Fails as:** a tick that fades in, which conveys arrival but not action.

## Ripple

Trigger \`pointerdown\` at the pointer coordinates. A circle scales from 0 to a radius
covering the furthest corner over 300-500ms while fading to ~0.12 alpha; the fade-out begins
at \`max(pointerup, 220ms)\` and runs 200ms.
**Fails as:** a ripple on a fixed-timer lifetime, still expanding after the element has been
replaced or the route has changed. A uniform state layer ports better.

## Input focus and floating label

Focus ring appears with no transition; border colour transitions over 120ms; the label moves
with \`transform: translateY(-1.1em) scale(0.82)\` and \`transform-origin: left center\`
over 150ms \`ease-out\`.
**Fails as:** animating \`font-size\` and \`top\`, which forces layout each frame and
wobbles the baseline; or transitioning the focus ring, which reads as input lag.

## Validation state

Reserve the message slot with \`min-height\`. On error animate opacity 0→1 and
\`translateY(4px→0)\` over 120ms; on recovery fade out over 80ms. Move focus only on
submit, never on blur.
**Fails as:** an inserted message pushing the submit button down while the pointer travels
toward it, producing a misclick on whatever took its place.

## Copy to clipboard

\`navigator.clipboard.writeText()\`, then crossfade the icon to a tick over 120ms, hold
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

Activate after 6-8px of movement or a 200ms hold. Lift over 150ms: \`scale(1.02)\`,
elevation up one level, opacity ~0.95 on the source slot. The dragged item tracks the pointer
1:1 with no easing — smoothing reads as lag, since the finger is ground truth.
**Fails as:** \`touch-action: none\` on the container rather than the handle, killing
scrolling for the whole list.

## Sortable list reflow

Displaced siblings translate with FLIP: measure, reorder, invert, play. 200-250ms
\`ease-out\`, staggered by at most 15ms. Commit the DOM reorder on drop, not during the
drag.
**Fails as:** animating \`top\` or \`margin\` on every sibling, producing jank
proportional to list length.

## Toast entry and stacking

Enter with \`translateY(8px→0)\` and opacity over 200ms; exit over 150ms. Cap the stack at
three visible and translate existing toasts with a spring as a new one arrives. Pause the
dismissal timer on hover and on focus within, resuming with the remaining time. Minimum
lifetime 5s.
**Fails as:** an unpausable timer, making a message containing a link impossible to use and
failing WCAG 2.2 SC 2.2.1.

## Skeleton

Match the final content's box dimensions exactly. Show only after ~200ms of waiting, and once
shown keep it for at least ~300ms to avoid a flash. Prefer a static tinted block; if a
shimmer is required, translate a pseudo-element rather than animating
\`background-position\`, and stop it under \`prefers-reduced-motion\`.
**Fails as:** a shimmer cut short by fast data, seen as a flicker; or skeleton dimensions
unequal to the content, producing layout shift on arrival.

## Progress

Determinate values are monotonic; interpolate toward each new value over ~300ms rather than
jumping. Move from indeterminate to determinate as soon as a real figure exists, never back.
Cap the visual at 99% until completion is confirmed.
**Fails as:** a bar that retreats when an estimate worsens, read as the system losing work.

## Number roll-up

\`font-variant-numeric: tabular-nums\`. Roll only changed digits, 400-600ms \`ease-out\`,
staggered 20-30ms from the least significant. Skip the roll for changes under 5% and for any
figure the user is about to act on.
**Fails as:** proportional figures, so the layout jitters horizontally for the whole run.

## Count badge

Scale 1.0 → 1.12 → 1.0 over 200ms on increment. Do not attach a live region to a passive
badge, or every background change interrupts the user's reading.
**Fails as:** a spin or bounce pulling the eye off the task for a number nobody needed yet.`,
      },
      {
        id: 'gesture-physics',
        title: 'Gesture physics: resistance, momentum, and thresholds',
        answers:
          'How do I implement rubber-banding, momentum, snap thresholds, pull-to-refresh, and swipe-to-dismiss so they feel physically correct rather than arbitrary?',
        content: `# Gesture physics: resistance, momentum, and thresholds

A gesture feels correct when the interface behaves like a physical object with mass and
friction, and wrong when it behaves like a value being assigned. Three mechanisms carry
almost all of the difference: resistance past a boundary, momentum after release, and a
commit threshold that considers velocity as well as distance.

## 1. Tracking

While a finger or pointer is down, the tracked element moves 1:1 with it. No easing, no
smoothing, no interpolation. Any lag between finger and object destroys the illusion of
direct manipulation instantly, and the illusion is the entire value of the gesture.

Read positions from \`pointermove\` and write transforms in a single \`requestAnimationFrame\`
callback. Never write a transform from inside the event handler on a busy page: coalesced
pointer events can deliver several moves per frame and you will do the same work repeatedly.
Use \`getCoalescedEvents()\` when you need the true path, such as for drawing.

## 2. Resistance past a boundary (rubber-banding)

When the gesture continues past a limit — a list already at the top, a sheet already fully
open — the correct response is not to stop and not to continue freely, but to continue with
progressively increasing resistance. Stopping dead reads as a bug; free movement reads as an
absent boundary. Resistance communicates "there is an edge here, and you have reached it"
without ever taking control away.

The widely used formulation, matching the feel of native scroll views:

    offset = (1 - 1 / (x * c / d + 1)) * d / c

where \`x\` is the raw overscroll distance, \`d\` is the dimension of the scrolling axis, and
\`c\` is a resistance constant around 0.55. The function is linear near zero, so the first
few pixels track the finger faithfully, and asymptotes toward \`d / c\`, so the element can
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

Free deceleration follows \`v(t) = v0 * pow(f, t)\` with a friction factor around 0.95 per
16ms frame; the total distance travelled is \`v0 / (1 - f)\` per frame-unit, which is the
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

Only arm the gesture when the scroller is exactly at \`scrollTop === 0\` at
\`pointerdown\`; arming mid-scroll causes a refresh whenever a fast upward fling reaches the
top. Apply the rubber-band function to the pull, and place the trigger threshold at
60-80px of *rendered* offset, which corresponds to a considerably longer finger travel once
resistance is applied — that extra travel is what prevents accidental refreshes.

Cross the threshold once and latch it: change the indicator state, fire a single haptic, and
do not re-fire if the user wobbles across the boundary. On release past the threshold, snap
to a hold offset of about 48px, run the refresh, then collapse. Set
\`overscroll-behavior-y: contain\` on the scroller so the browser's own pull-to-refresh and
scroll chaining do not compete with yours.

## 6. Reduced motion and accessibility

\`prefers-reduced-motion\` does not mean "no gestures". Direct manipulation is not the
motion that provokes vestibular symptoms — unrequested large-area travel is. Keep 1:1
tracking, keep the commit, and replace the momentum and spring-back animations with short
fades or instant settles.

Every gesture needs a non-gestural equivalent: swipe-to-dismiss needs a close button,
drag-to-reorder needs keyboard move commands, pull-to-refresh needs a refresh control. A
gesture is an accelerator for people who can perform it, never the sole route to a
capability.`,
      },
    ],
  },

  rules: [
    {
      id: 'micro-interactions/never-gate-the-outcome',
      strength: 'must-not',
      statement:
        'Do not make a state change, network request, or navigation wait for an animation to finish.',
      evidence: {
        rationale:
          'Feedback exists to report that the system received the input. If the feedback also delays the system, it converts a signal of responsiveness into a source of latency, and the delay is paid on every single invocation for the lifetime of the product.',
        confidence: 'established',
      },
      examples: {
        language: 'ts',
        bad: 'await ripple.finished\nawait save(draft)',
        good: 'void save(draft)\nripple.play()',
      },
      verifiedBy: 'gating-audit',
    },
    {
      id: 'micro-interactions/press-on-pointerdown',
      strength: 'must',
      statement:
        'Apply press feedback on pointerdown, not on click, and enforce a minimum visible hold of about 90ms.',
      evidence: {
        rationale:
          'A click event fires on release, so feedback bound to it is absent for the whole duration of the press — exactly the interval during which the user is uncertain whether the input registered. A minimum hold is needed because a tap can be shorter than one frame budget, leaving the state invisible.',
        confidence: 'strong',
      },
      verifiedBy: 'press-audit',
    },
    {
      id: 'micro-interactions/press-scale-range',
      strength: 'should',
      statement:
        'Scale pressed controls to between 0.96 and 0.98, using a smaller reduction on larger surfaces, rather than a fixed dramatic value such as 0.9.',
      evidence: {
        rationale:
          'The perceived cue is edge displacement measured in pixels, not the ratio. A 0.97 scale on a 44px control displaces each edge by 0.66px, which is felt but not seen; the same ratio on a 320px control displaces 4.8px, and 0.9 displaces 16px, at which point the element reads as retreating from the page and its text visibly resamples.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '.btn:active { transform: scale(0.9); transition: transform 300ms ease; }',
        good: '.btn:active { transform: scale(0.97); transition: transform 90ms ease-out; }',
      },
    },
    {
      id: 'micro-interactions/transform-origin-at-anchor',
      strength: 'should',
      statement:
        'Set transform-origin to the element’s visual anchor — the trigger corner for a popover, the attached edge for a panel — instead of relying on the 50% 50% default.',
      evidence: {
        rationale:
          'Scaling implies growth from a point. When that point is not where the element is attached, the element appears to slide as well as scale, which contradicts its spatial relationship to whatever spawned it and reads as an unexplained wobble.',
        confidence: 'strong',
      },
    },
    {
      id: 'micro-interactions/release-on-pointercancel',
      strength: 'must',
      statement:
        'Clear press, ripple, and drag states on pointercancel and lostpointercapture as well as pointerup, never on a fixed timer alone.',
      evidence: {
        rationale:
          'A pointer sequence can end without pointerup: the browser claims the gesture for scrolling, the OS shows an alert, or the element is removed. A handler that only listens for pointerup leaves the control visually stuck in its active state, and a timer-driven exit can outlive the element it belongs to.',
        confidence: 'established',
      },
      verifiedBy: 'cancellation-review',
    },
    {
      id: 'micro-interactions/hover-gated-by-media-query',
      strength: 'must',
      statement:
        'Gate hover-dependent styling and behaviour behind @media (hover: hover) and (pointer: fine).',
      evidence: {
        rationale:
          'Touch browsers synthesise a hover state on tap and retain it until the next tap elsewhere, so an ungated hover style persists on the last-tapped element and is indistinguishable from a selected state. Hover-revealed controls are additionally unreachable by touch entirely.',
        source: 'CSS Media Queries Level 4, hover and pointer features',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover',
        confidence: 'established',
      },
      verifiedBy: 'input-parity-review',
    },
    {
      id: 'micro-interactions/asymmetric-hover-intent',
      strength: 'should',
      statement:
        'Delay hover-triggered opening by about 100ms and hover-triggered closing by about 300ms, cancelling the close when the pointer re-enters the trigger or the panel.',
      evidence: {
        rationale:
          'A pointer travelling to a distant target crosses intermediate elements, so a zero open delay produces panels that flash open in passing. Conversely a pointer moving diagonally toward a panel briefly leaves the trigger, so a short close delay is what allows the panel to be reached at all.',
        confidence: 'strong',
      },
      exceptions: [
        'Sibling triggers while a menu in the same group is already open, where the user has committed to the mode and the open delay should be zero.',
      ],
    },
    {
      id: 'micro-interactions/drag-activation-threshold',
      strength: 'must',
      statement:
        'Start a drag only after roughly 6-8px of pointer travel, or after a ~200ms hold on touch, and apply touch-action: none to the handle rather than the container.',
      evidence: {
        rationale:
          'Pointers move by one or two pixels during an ordinary tap, so a drag that begins on the first pointermove converts every tap into a micro-drag. On touch, a drag armed immediately steals the gesture from the scroller, making a sortable list impossible to scroll.',
        confidence: 'established',
      },
      verifiedBy: 'gesture-review',
    },
    {
      id: 'micro-interactions/commit-on-distance-or-velocity',
      strength: 'should',
      statement:
        'Commit a swipe when displacement passes about 40% of the element or when release velocity exceeds about 0.5 px/ms, and spring back using the measured release velocity otherwise.',
      evidence: {
        rationale:
          'Users express intent through speed as well as distance. A distance-only threshold rejects fast flicks that clearly meant to dismiss, which makes the control feel heavy; discarding release velocity on the return makes the spring-back start from rest and appear disconnected from the gesture that caused it.',
        confidence: 'strong',
      },
      verifiedBy: 'gesture-review',
    },
    {
      id: 'micro-interactions/resistance-past-bounds',
      strength: 'should',
      statement:
        'Apply progressive resistance rather than a hard stop when a drag or scroll continues past its boundary, using an asymptotic function of overscroll distance.',
      evidence: {
        rationale:
          'A hard stop is indistinguishable from a frozen interface, since input continues while output does not. Resistance keeps the element responsive to every pixel of input while communicating that a limit has been reached, and an asymptotic curve guarantees the element can never be dragged implausibly far.',
        confidence: 'strong',
      },
    },
    {
      id: 'micro-interactions/label-float-by-transform',
      strength: 'should',
      statement:
        'Animate floating labels with transform and transform-origin, not with font-size, top, or margin.',
      evidence: {
        rationale:
          'font-size and box offsets are layout-affecting properties, so each frame forces a reflow of the input and its siblings and the text baseline snaps between integer positions. A scaled transform is handled by the compositor and interpolates smoothly.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.label--float { top: 4px; font-size: 12px; transition: top 150ms, font-size 150ms; }',
        good: '.label--float { transform: translateY(-1.1em) scale(0.82); transform-origin: left center; transition: transform 150ms ease-out; }',
      },
    },
    {
      id: 'micro-interactions/no-focus-ring-transition',
      strength: 'should-not',
      statement: 'Do not transition or delay the appearance of a focus indicator.',
      evidence: {
        rationale:
          'Keyboard navigation is rapid and the focus ring is the only positional feedback available. Any fade makes the indicator lag the actual focus during fast tabbing, so the user cannot tell which element is focused at the moment they act on it.',
        confidence: 'strong',
      },
    },
    {
      id: 'micro-interactions/reserve-validation-space',
      strength: 'must',
      statement:
        'Reserve space for validation messages so revealing or hiding one causes no layout shift.',
      evidence: {
        rationale:
          'An inserted message displaces everything below it, including the submit button, while the pointer is already travelling toward that button. The user then activates whatever moved into the vacated position, which is a mis-activation caused entirely by the feedback intended to help them.',
        confidence: 'established',
      },
      verifiedBy: 'press-audit',
    },
    {
      id: 'micro-interactions/confirmations-announced',
      strength: 'must',
      statement:
        'Pair every purely visual confirmation, such as a copy-to-clipboard tick, with a polite live region announcement.',
      evidence: {
        rationale:
          'An icon swap changes no accessible name, role, or value, so assistive technology emits nothing and the user has no evidence the action succeeded. A polite live region reports the outcome without interrupting whatever is currently being read.',
        source: 'WAI-ARIA aria-live',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live',
        confidence: 'established',
      },
      verifiedBy: 'announcement-review',
    },
    {
      id: 'micro-interactions/animate-on-transition-not-mount',
      strength: 'must',
      statement:
        'Trigger celebratory and emphasis animations from the user-driven state transition, never from a component mounting with the state already set.',
      evidence: {
        rationale:
          'Mount-driven animation cannot distinguish "the user just did this" from "this was already true when the list rendered", so a back-navigation, a re-render, or a restored scroll position replays every animation on screen simultaneously.',
        confidence: 'established',
      },
      verifiedBy: 'repetition-review',
    },
    {
      id: 'micro-interactions/no-celebration-on-routine',
      strength: 'should-not',
      statement:
        'Do not attach celebratory feedback such as confetti or bursts to actions a user performs routinely.',
      evidence: {
        rationale:
          'Response to a novel stimulus attenuates with repetition, so the celebration stops being rewarding within a few exposures while continuing to cost the same attention and the same delay. What remains is an obstacle between the user and their next action.',
        confidence: 'strong',
      },
      exceptions: ['Genuine first-time completions and infrequent milestones.'],
    },
    {
      id: 'micro-interactions/progress-monotonic',
      strength: 'must',
      statement:
        'Never decrease a determinate progress value; if the estimate worsens, hold the value and reduce the rate of advance.',
      evidence: {
        rationale:
          'A progress bar is read as a claim about work completed. Retreating contradicts that claim, and users interpret it as work having been lost rather than as an estimate being revised, which is far more alarming than a bar that merely slows.',
        confidence: 'strong',
      },
    },
    {
      id: 'micro-interactions/tabular-nums-for-changing-numbers',
      strength: 'must',
      statement:
        'Apply font-variant-numeric: tabular-nums to any number that animates, counts, or updates in place.',
      evidence: {
        rationale:
          'Proportional figures have per-glyph advance widths, so a value passing through different digits changes its rendered width on almost every frame. The text then shifts horizontally throughout the animation and any adjacent content shifts with it.',
        confidence: 'established',
      },
    },
    {
      id: 'micro-interactions/skeleton-static-by-default',
      strength: 'should',
      statement:
        'Prefer a static skeleton over a shimmering one, show it only after about 200ms of waiting, and match the incoming content’s dimensions exactly.',
      evidence: {
        rationale:
          'A shimmer is an unbounded loop whose cycle rarely aligns with the load, so a fast response shows a fragment of moving light that reads as a rendering fault. It also runs continuously on the weakest devices at the moment the main thread is most contended, and mismatched dimensions convert the arrival of content into a layout shift.',
        confidence: 'strong',
      },
      verifiedBy: 'loading-review',
    },
    {
      id: 'micro-interactions/toast-timer-pauses',
      strength: 'must',
      statement:
        'Pause a toast’s auto-dismiss timer on hover and on focus within it, and resume with the remaining time.',
      evidence: {
        rationale:
          'A toast that expires while being read or while its action is being reached is unusable by anyone reading slowly or navigating by keyboard, and a time limit the user cannot extend fails the timing requirements that apply to content that disappears automatically.',
        source: 'WCAG 2.2 Success Criterion 2.2.1 (Timing Adjustable)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html',
        confidence: 'established',
      },
    },
    {
      id: 'micro-interactions/no-input-blocking-during-exit',
      strength: 'must-not',
      statement:
        'Do not leave an exiting overlay, toast, or menu hit-testable while it animates out.',
      evidence: {
        rationale:
          'A fading element still occupies its box and still receives pointer events at full opacity zero, so it swallows the first click aimed at whatever is behind it. The user perceives this as a dropped input rather than as a collision with an invisible object.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.overlay[data-state="closing"] { opacity: 0; transition: opacity 200ms; }',
        good: '.overlay[data-state="closing"] { opacity: 0; pointer-events: none; transition: opacity 200ms; }',
      },
      verifiedBy: 'gating-audit',
    },
    {
      id: 'micro-interactions/haptics-on-commit-only',
      strength: 'should',
      statement:
        'Fire at most one haptic per committed state change, latched so that crossing a threshold repeatedly does not repeat it, and never as the sole carrier of information.',
      evidence: {
        rationale:
          'Vibration requires sticky user activation, is suppressed in silent and do-not-disturb modes, is unsupported in Safari, and is absent on most desktop hardware, so any information carried only by haptics is unavailable to the majority of users. Unlatched haptics on a threshold produce a buzz on every wobble across the boundary.',
        source: 'Vibration API, Navigator.vibrate()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate',
        confidence: 'established',
      },
    },
    {
      id: 'micro-interactions/reduced-motion-keeps-tracking',
      strength: 'should',
      statement:
        'Under prefers-reduced-motion, keep one-to-one gesture tracking and the resulting state change, and replace only the momentum, spring-back, and travel animations.',
      evidence: {
        rationale:
          'Vestibular symptoms are provoked by unrequested large-area movement, not by an object following the finger that is moving it. Disabling direct manipulation removes a capability without removing the trigger, while removing autonomous travel removes the trigger without removing the capability.',
        confidence: 'strong',
      },
      verifiedBy: 'gesture-review',
    },
  ],

  verification: [
    {
      id: 'gating-audit',
      kind: 'self-review',
      description: 'Confirm no animation sits on the critical path of an outcome.',
      blocking: true,
      questions: [
        'Does any handler await an animation, a transition end event, or a timeout before dispatching a state change, request, or navigation?',
        'If the user activates the control twice in 200ms, does the second activation land on the updated state?',
        'While any overlay or toast is animating out, does it still receive pointer events?',
      ],
    },
    {
      id: 'press-audit',
      kind: 'self-review',
      description: 'Confirm press and control feedback parameters are correct.',
      blocking: true,
      questions: [
        'Is press feedback bound to pointerdown, and is it still visible for a tap shorter than 50ms?',
        'What is the pressed scale, and how many pixels does each edge move at the element’s actual rendered size?',
        'Is transform-origin set to the element’s visual anchor, or left at the default centre?',
        'Does revealing a validation message change the position of any other element?',
      ],
    },
    {
      id: 'cancellation-review',
      kind: 'self-review',
      description: 'Confirm every micro-interaction ends cleanly on interruption.',
      blocking: true,
      questions: [
        'Begin a press, then scroll away from the control without lifting. Does the active state clear?',
        'Does every active, ripple, or drag state have a handler for pointercancel and lostpointercapture, not only pointerup?',
        'If the element unmounts mid-animation, is any timer or animation left running against it?',
      ],
    },
    {
      id: 'input-parity-review',
      kind: 'self-review',
      description: 'Confirm the behaviour is correct for touch, mouse, and keyboard.',
      questions: [
        'Is every hover-dependent style or affordance gated behind @media (hover: hover) and (pointer: fine)?',
        'After tapping a control on a touch device, does any hover styling remain applied?',
        'Is anything revealed only on hover also reachable by touch and by keyboard focus?',
      ],
    },
    {
      id: 'gesture-review',
      kind: 'self-review',
      description: 'Confirm gestures have physically coherent thresholds and alternatives.',
      questions: [
        'Does the drag begin only after a movement or hold threshold, and is touch-action scoped to the handle?',
        'Does a fast flick that travels a short distance commit, and does a slow drag past the distance threshold also commit?',
        'Does the element resist rather than stop at its boundary, and does the release spring carry the measured velocity?',
        'Does every gesture have a keyboard or button equivalent?',
        'Under reduced motion, is tracking preserved while momentum and spring-back are replaced?',
      ],
    },
    {
      id: 'announcement-review',
      kind: 'self-review',
      description: 'Confirm outcomes are perceivable without sight.',
      blocking: true,
      questions: [
        'List every confirmation expressed only as an icon change, a colour change, or motion. Is each also announced?',
        'Does any passive indicator, such as a count badge, announce on every background update?',
        'Does a toast pause its dismissal timer on hover and on focus within it?',
      ],
    },
    {
      id: 'loading-review',
      kind: 'self-review',
      description: 'Confirm loading feedback matches the actual wait.',
      questions: [
        'Does the skeleton or spinner appear only after a delay, and once shown does it persist long enough not to flash?',
        'Do the skeleton’s dimensions match the loaded content exactly, producing no shift on arrival?',
        'Can any determinate progress value decrease?',
      ],
    },
    {
      id: 'repetition-review',
      kind: 'self-review',
      description: 'Confirm the interaction survives its hundredth repetition.',
      questions: [
        'Is any celebratory feedback attached to an action the user performs more than a few times a week?',
        'Is the animation triggered by a user-driven transition rather than by mount with the state already set?',
        'After navigating away and back, does any emphasis animation replay?',
      ],
    },
    {
      id: 'contract-audit',
      kind: 'contract',
      description:
        'Evaluate the interaction feedback against the project Design Contract motion section.',
      contractSection: 'motion',
    },
  ],

  relatedSkills: [
    'motion-design',
    'interaction-design',
    'design-judgment',
    'accessible-components',
  ],
}
