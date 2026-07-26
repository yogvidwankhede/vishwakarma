// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Motion is the part of interface design most often justified by taste and most easily
 * justified by mechanism.
 *
 * Almost every bad animation in a shipped product comes from one of four errors, and all
 * four are structural rather than aesthetic: the animation has no communicative job; its
 * easing tells the wrong physical story; it cannot be interrupted, so it fights the user;
 * or it animates a property that forces layout, so it stutters under load.
 *
 * This skill treats motion as a derivation. State the intent, and the duration, the curve,
 * the property, and the interruption behaviour follow from it. Nothing here requires an
 * opinion about whether an animation "feels nice" — every parameter traces back either to
 * a perceptual threshold, a physical analogy, or a rendering constraint.
 */
export const motionDesign: SkillManifest = {
  vsm: '1.0',
  id: 'motion-design',
  name: 'Motion Design',
  description:
    'Use when adding, tuning, or reviewing any animation, transition, gesture, or scroll effect in an interface.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'motion',
  tags: ['motion', 'animation', 'transition', 'easing', 'spring', 'gesture', 'performance'],

  activation: {
    intents: [
      'adding or tuning an animation, transition, or micro-interaction',
      'choosing a duration, easing curve, or spring configuration',
      'building a modal, drawer, dropdown, accordion, toast, or page transition',
      'implementing drag, swipe, pull-to-refresh, or another gesture-driven interaction',
      'the user reports that motion feels janky, sluggish, twitchy, cheap, or broken',
      'adding scroll-triggered or scroll-linked effects',
      'auditing an interface for reduced-motion support or animation performance',
    ],
    globs: [
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/*.css',
      '**/*.scss',
      '**/*motion*.{ts,js}',
      '**/*anim*.{ts,js}',
      '**/*transition*.{ts,js}',
    ],
    keywords: [
      'animation',
      'animate',
      'transition',
      'easing',
      'spring',
      'motion',
      'gesture',
      'drag',
      'swipe',
      'parallax',
      'scroll effect',
      'reduced motion',
    ],
  },

  content: {
    summary:
      'Derive motion parameters from communicative intent rather than taste: match easing to a physical story, size duration to perceptual thresholds, keep animations interruptible, and animate only compositor-safe properties.',

    body: `# Motion Design

Motion is the only channel that can express *change*: where something came from, what caused
it, whether it is still the same object. Static design says what things are; motion says what
just happened. Anything animated that says nothing is a delay you imposed.

So the question is never "how long" but **"what does this tell the user that the start and
end frames do not?"** Only four answers count: **origin and destination** (a dialog scaling
from its trigger *is* that button expanded; one appearing dead-centre forces a re-parse),
**causality** (motion on the frame the user acts binds effect to cause; past ~100ms the two
read as separate events), **continuity** (moving elements through a reorder preserves object
identity, cutting destroys it), and **feedback** (input received, or refused). Fail all four
and delete it — that test alone removes most motion in generated interfaces.

## 1. Motion Grammar

Eight intents, each with its own parameters.

| Intent | Duration | Curve | Property |
|---|---|---|---|
| **enter** | 200-300ms | decelerate | opacity + translate |
| **exit** | 120-180ms | accelerate | opacity + translate |
| **transform** | 250-350ms | ease-in-out | transform |
| **respond** | 60-120ms | ease-out | scale/opacity |
| **attract** | 500ms, max 3 cycles | ease-in-out | transform |
| **occupy** | looping | linear | transform |
| **affirm** | 300-400ms | overshoot | scale |
| **reject** | 350ms, 2 cycles | decaying | translateX 6px |

**occupy alone may loop forever**, and only while an operation is outstanding.

## 2. Easing is a physical story

A curve is an acceleration profile, and acceleration implies a cause. **Entrances
decelerate** — \`cubic-bezier(0.16, 1, 0.3, 1)\`: the element arrives carrying momentum and
settles where the user must read it. **Exits accelerate** — \`cubic-bezier(0.4, 0, 1, 1)\`:
it is departing, so there is nothing to read. **On-screen transforms use both**,
\`cubic-bezier(0.4, 0, 0.2, 1)\`. **Never \`linear\`** outside loops and gesture-tracked
motion: zero then infinite acceleration matches no physical event.

The commonest motion bug in shipped UI is **an entrance curve on an exit** — a modal easing
gently out as it closes. The user has already decided; making them watch a leisurely
departure is making them wait, and it is why interfaces feel sluggish when nothing is slow.
Run exits at **60-70%** of the matching entrance.

## 3. Duration comes from perception

Below **~100ms** a change reads as instantaneous and binds causally to its trigger: the
budget for press and hover. At **200-300ms** the eye can track an object and learn its path
— enters and transforms. Past **~400ms** motion stops being information and becomes a wait.

**Duration scales sublinearly with distance**, since perceived speed is judged from angular
velocity: use roughly the square root of distance, clamped to 150-400ms.

## 4. Springs: damping ratio, not stiffness

Mass, stiffness and damping are unreasonable to tune directly because they are coupled:
raising stiffness makes motion both faster *and* bouncier, so every fix to speed breaks
feel. Reparameterise. Natural frequency **ω₀ = √(k/m)** sets how long it takes; damping ratio
**ζ = c / (2√(km))** sets how far it overshoots. They are orthogonal, which is the only
reason a human can tune them, and modern spring APIs expose exactly this pair as *duration*
and *bounce* = 1 − ζ.

**ζ = 1** is critically damped: fastest arrival, zero overshoot, correct for anything
carrying text. **ζ ≈ 0.75** gives one small overshoot; **ζ < 0.5** oscillates visibly and
delays legibility. The real advantage is not bounce — a spring carries state, so it
re-targets mid-flight without discontinuity.

## 5. Stagger, with compression

40-60ms of offset reads a group as ordered, but a fixed per-item delay on a variable-length
list is a trap: 30 items at 50ms leaves the last arriving 1.5s after the first. **Fix the
total, not the step** — \`delay = min(50ms, 300ms / count)\` — and past eight items, stagger
the first few and land the rest together.

## 6. Interruptibility is what "broken" means

**A re-triggered animation must continue from the element's current position and velocity,
never restart from its declared start value.** A dropdown 70% open when clicked again closes
from 70%. Restarting jumps the element to a position it never occupied, and discontinuous
position breaks object permanence: the viewer registers a *different object* rather than the
same one moving. That is the perception users call glitchy.

CSS transitions handle position for free — the computed value at interruption becomes the
new start — but keyframes and imperative animations do not. Read the computed transform
before cancelling, scale the remaining duration to the remaining distance, or use a spring
integrator retaining \`(position, velocity)\`.

## 7. Gesture motion tracks input 1:1

While the pointer is down the element follows it exactly — no easing, no smoothing, because
the hand is the timing function and interpolation reads as the surface detaching from the
touch. Easing applies **only on release**, with exit velocity as the settling animation's
initial velocity. Decide the outcome by projecting where that velocity would carry the
element rather than by displacement: a flick covering 15% of the distance was a completed
gesture. Boundary resistance must be progressive, not a clamp.

## 8. Animate only what the compositor can animate

Rendering runs style → layout → paint → composite. \`transform\`, \`opacity\`, \`filter\`,
\`backdrop-filter\` and the individual \`translate\`/\`rotate\`/\`scale\` properties are handled
on the compositor thread, so they survive a busy main thread.

**Layout-triggering — never animate:** \`width\`, \`height\`, \`top\`, \`right\`, \`bottom\`,
\`left\`, \`margin\`, \`padding\`, \`border-width\`, \`font-size\`, \`line-height\`, \`gap\`,
\`flex-basis\`, \`grid-template-*\`. Each forces layout every frame, for the element and
everything positioned relative to it. \`box-shadow\` and \`border-radius\` only repaint, but
over a large area that is costly too.

Substitute. Height-to-auto: animate \`grid-template-rows: 0fr → 1fr\` on a grid wrapper with
\`min-height: 0\` and \`overflow: hidden\` on the child (\`interpolate-size: allow-keywords\`
with \`calc-size()\` is native but not yet Baseline). Width: \`scaleX()\` with an inverse
\`scaleX()\` on children, or \`clip-path: inset()\`. Position: \`translate\`. Shadow:
cross-fade a pseudo-element.

**FLIP** animates a layout change without animating layout. Record
\`getBoundingClientRect()\`, apply the change, measure again, apply a transform mapping the
new rect onto the old so the element appears not to have moved, then animate it to identity.
Layout runs once; every frame after is a compositor transform. Use \`transform-origin: 0 0\`
and counter-scale text children.

## 9. Reduced motion: remove spatial, keep signal

\`prefers-reduced-motion: reduce\` reports a medical condition: large-field motion produces
genuine nausea and dizziness in people with vestibular disorders. **Remove** translation over
distance, parallax, scale and zoom, rotation, and autoplaying or looping motion; **keep**
opacity cross-fades, colour transitions, and local movement under 20px.

Zeroing every duration is the wrong reduction and makes the interface *harder* to follow:
these users still need a change-of-state cue, and without the fade elements teleport with no
sign anything happened. Substitute a 100-150ms opacity change.

## 10. \`will-change\` discipline

\`will-change\` promotes an element to its own compositor layer at roughly width × height × 4
bytes of GPU memory, held for as long as the declaration applies, so declaring it broadly
exhausts that memory and degrades compositing everywhere. Add it just before an animation and
remove it after; since browsers already promote running compositor animations, the correct
amount is usually none.`,

    references: [
      {
        id: 'motion-pattern-catalogue',
        title: 'Motion patterns by intent, with parameters',
        answers:
          'What are the concrete durations, easings, transforms, and origins for the standard interface motion patterns — modals, drawers, menus, toasts, accordions, list changes, page transitions?',
        content: `# Motion patterns by intent, with parameters

Every entry states the intent it serves, the parameters, and the failure that occurs when
it is done wrong. Durations assume a desktop viewport; scale the transform distances, not
the times, for small screens.

## Enter / exit pairs

**Modal dialog.** Enter 250ms decelerate: opacity 0→1, \`scale(0.96)→scale(1)\`,
\`translateY(8px)→0\`. Exit 160ms accelerate, same properties reversed. The backdrop
fades on the same schedule but with no transform. Scale from 0.96, not 0.8: a large
surface scaling from far below its final size reads as being thrown at the user. Where
the dialog has a clear trigger, scale from the trigger's position instead of the centre —
\`transform-origin\` set to the trigger's offset — which converts the modal from an
apparition into an expansion.

*Failure:* symmetric 250ms exit. The dismissal feels reluctant.

**Drawer / sheet.** Enter 300ms decelerate: \`translateX(-100%)→0\` (or Y for a bottom
sheet). Exit 200ms accelerate. Always translate along the axis of the edge it belongs to;
a left drawer that fades in without moving has lost the only thing it was communicating,
which is *where it lives when closed*.

**Dropdown / popover / select menu.** Enter 150ms decelerate: opacity 0→1,
\`scale(0.97)→1\` with \`transform-origin\` at the corner nearest the trigger,
\`translateY(-4px)→0\`. Exit 100ms. These are short because the menu appears adjacent to
the pointer and the user is already looking at it — there is no distance to explain.

**Tooltip.** Enter 120ms after a 400-600ms hover-intent delay; exit 80ms, with a ~100ms
grace period if the pointer is travelling toward the tooltip. Animate opacity plus a 4px
translate away from the anchor.

**Toast / snackbar.** Enter 250ms decelerate, translating in from the edge it is docked
to. Hold for 4-6s, or indefinitely if it carries an action. Exit 150ms accelerate. When
several stack, translate the existing ones with a 200ms transform rather than re-laying
out the container.

## Transform

**Accordion / disclosure.** 250ms \`cubic-bezier(0.4, 0, 0.2, 1)\` on
\`grid-template-rows: 0fr → 1fr\`, with the content opacity fading over the last 60% for
open and the first 40% for close. The chevron rotates 180deg on the same curve and
duration — rotating it on a different schedule from the panel breaks the causal link.

**Tab panel.** Cross-fade 150ms with a 10px translate in the direction of travel. Do not
animate the height between panels of different sizes; reserve the taller height or accept
the jump, because a height animation on tab switch delays every switch by its duration.

**List reorder, add, remove.** FLIP, 300ms \`cubic-bezier(0.4, 0, 0.2, 1)\`. Removals
should exit first (150ms), then the survivors move; running both at once produces items
crossing through each other. New items fade and scale in *after* the reflow completes.

**Shared element / hero transition.** 350-400ms. The element's transform is the primary
motion; everything else cross-fades under it. This is the strongest continuity cue there is
and it is worth the extra 100ms, since the point is that the user tracks one object across
a context change.

## Respond

**Button press.** \`scale(0.97)\` in 80ms ease-out on pointerdown, returning in 120ms on
pointerup. The return is slower than the press because a press is driven by the user and
the release is driven by the spring.

**Toggle / switch.** 200ms. The thumb translates on \`cubic-bezier(0.4, 0, 0.2, 1)\`; the
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

**Determinate progress.** Transition \`transform: scaleX()\` on each update with a 200ms
linear ease. Never animate \`width\`, and never animate progress backwards — clamp to
monotonic increase, because a bar that retreats destroys trust in the estimate.

## Affirm / reject

**Success check.** \`stroke-dashoffset\` drawing over 300ms decelerate, with the
container scaling 0.8→1 with a spring at ζ ≈ 0.6. This is the one place overshoot is
unambiguously correct: the bounce reads as satisfaction.

**Invalid input shake.** \`translateX\`: 0 → −6 → 6 → −3 → 0 over 350ms. Exactly two
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
compositor and visibly lag the content they are attached to.`,
      },
      {
        id: 'interruption-and-gesture',
        title: 'Interruptible and gesture-driven animation',
        answers:
          'How do I build animations that can be re-targeted mid-flight without a discontinuity, and how do I implement drag, swipe, and flick gestures that track input and settle correctly on release?',
        content: `# Interruptible and gesture-driven animation

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

Two details matter. \`getComputedStyle\` must be read *before* cancelling, since cancelling
reverts to the underlying value. And the remaining duration should be scaled by how far
the element still has to travel: replaying a full 250ms for the last 30% of the distance
produces motion that is visibly, uncannily slow.

Keeping the animation running and reversing it via \`animation.playbackRate = -1\` preserves
both, but is only correct where the exit is the reversed entrance — which, per the
faster-exit rule, it usually is not.

## Springs are interruptible by construction

A spring is integrated per frame from state, not sampled from a curve:

    // per frame, dt in seconds
    const F = -stiffness * (position - target) - damping * velocity
    velocity += (F / mass) * dt
    position += velocity * dt

Nothing in this loop refers to a start value or an elapsed time. Changing \`target\`
mid-flight is therefore not an interruption at all — the integrator continues with the
position and velocity it already has, and the motion is C¹-continuous by construction. This
is the strongest argument for springs in interactive UI, and it has nothing to do with
bounce.

Use a fixed timestep (typically 1/120s) with an accumulator rather than raw frame deltas, or
the motion changes character when the frame rate drops. Terminate when
\`|position − target| < 0.01\` **and** \`|velocity| < 0.01\`, not on position alone, or the
spring settles while still moving and visibly clips.

## Gestures: tracking

While the pointer is down, the transform is a pure function of pointer displacement. No
easing, no smoothing, no interpolation toward the target — the finger is the clock, and any
lag reads as the surface being detached from the touch, which is far more noticeable than
jitter.

Mechanics that prevent the common defects:

- Use Pointer Events and call \`setPointerCapture\` on \`pointerdown\`, so the gesture
  survives the pointer leaving the element and \`pointerup\` still arrives.
- Set \`touch-action\` to declare the axis you are handling (\`pan-y\` for a horizontal
  swipe). Without it the browser's own scrolling competes with yours, and because
  scrolling runs on the compositor it wins.
- Use an activation threshold of roughly 8-10px before committing, so a tap with slight
  movement is not swallowed.

## Boundary resistance

Past a limit, apply a diminishing fraction of the overscroll rather than clamping. A
standard formulation:

    offset = (1 - 1 / (overscroll * c / dimension + 1)) * dimension    // c ≈ 0.55

The offset approaches \`dimension\` asymptotically, so the surface never quite stops
responding but clearly resists. A hard clamp is worse: the surface appears frozen, which is
indistinguishable from a bug.

## Release: velocity and projection

On \`pointerup\`, compute velocity from the last 50-100ms of samples, not the final two
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
\`prefers-reduced-motion: reduce\`.`,
      },
    ],
  },

  rules: [
    {
      id: 'motion-design/animation-must-have-a-job',
      strength: 'must',
      statement:
        'Every animation must serve one of four jobs — showing origin and destination, expressing causality, preserving continuity, or giving feedback — or be removed.',
      evidence: {
        rationale:
          'Animation occupies time the user did not ask to spend. If the motion conveys nothing the start and end frames do not already convey, the only thing it adds is latency, and latency is the attribute users notice most reliably.',
        confidence: 'strong',
      },
      verifiedBy: 'motion-purpose-audit',
    },
    {
      id: 'motion-design/exit-faster-than-enter',
      strength: 'must',
      statement:
        'Make exit animations roughly 60-70% of the duration of their matching entrance, and give them an accelerating rather than decelerating curve.',
      evidence: {
        rationale:
          'An entrance must be readable, because the user is about to parse new content; an exit carries nothing to read, because the user has already decided. A slow, decelerating exit therefore delivers no information while blocking the next interaction, which is the mechanism behind an interface feeling sluggish when nothing is actually slow.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '.dialog { transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1), transform 250ms cubic-bezier(0.16, 1, 0.3, 1); }',
        good: '.dialog[data-state="open"] { transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1), transform 250ms cubic-bezier(0.16, 1, 0.3, 1); }\n.dialog[data-state="closed"] { transition: opacity 160ms cubic-bezier(0.4, 0, 1, 1), transform 160ms cubic-bezier(0.4, 0, 1, 1); }',
      },
      verifiedBy: 'easing-direction-check',
    },
    {
      id: 'motion-design/easing-matches-direction',
      strength: 'must',
      statement:
        'Use a decelerating curve for entrances, an accelerating curve for exits, and an ease-in-out curve only for motion that both begins and ends on screen.',
      evidence: {
        rationale:
          'An easing curve is an acceleration profile, and acceleration implies a cause. An element arriving from off screen already has momentum, so it must decelerate into place; an element leaving is being pushed away, so it must accelerate out. Reversing this describes a physically impossible event and is the most frequent motion error in shipped interfaces.',
        confidence: 'strong',
      },
    },
    {
      id: 'motion-design/no-linear-for-discrete-motion',
      strength: 'should-not',
      statement:
        'Do not use linear easing for discrete objects entering, leaving, or moving; reserve it for continuous loops and gesture-tracked motion.',
      evidence: {
        rationale:
          'Linear motion has zero acceleration throughout and then infinite acceleration at both ends, which corresponds to no physical event and reads as mechanical. Continuous rotation is the exception because there are no endpoints, and eased rotation reads as stuttering since the eye tracks angular velocity directly.',
        confidence: 'strong',
      },
    },
    {
      id: 'motion-design/duration-bands',
      strength: 'should',
      statement:
        'Keep feedback under 100ms, standard enters and transforms between 200ms and 350ms, and nothing the user is waiting on above 400ms.',
      evidence: {
        rationale:
          'Below roughly 100ms a response is perceived as instantaneous and is causally bound to its trigger. Around 200-300ms the eye can track an object and learn its path. Past roughly 400ms the motion stops functioning as information and is experienced as waiting, which is the threshold at which users begin describing an interface as slow.',
        source: 'Nielsen, response time limits; Doherty threshold (400ms)',
        confidence: 'established',
      },
      exceptions: [
        'Shared-element and hero transitions, where 350-400ms buys a continuity cue that nothing else can provide.',
      ],
      verifiedBy: 'duration-audit',
    },
    {
      id: 'motion-design/sublinear-distance',
      strength: 'should',
      statement:
        'Scale duration sublinearly with travel distance — roughly with its square root — and clamp the result between about 150ms and 400ms.',
      evidence: {
        rationale:
          'Perceived speed is judged from angular velocity rather than absolute distance, so mapping distance to duration linearly makes short moves feel sticky and long moves intolerable. A sublinear mapping keeps apparent velocity within a comfortable band across the whole range of distances a viewport contains.',
        confidence: 'strong',
      },
    },
    {
      id: 'motion-design/spring-damping-ratio',
      strength: 'should',
      statement:
        'Parameterise springs by damping ratio and natural frequency (or duration and bounce) rather than by raw stiffness, damping, and mass.',
      evidence: {
        rationale:
          'Stiffness, damping and mass are coupled: raising stiffness changes both how fast the motion is and how much it overshoots, so tuning one perceptual quality always disturbs the other. Damping ratio and natural frequency are orthogonal — one controls overshoot, the other controls speed — which is what makes the parameters tunable by a human at all.',
        confidence: 'established',
      },
      examples: {
        language: 'ts',
        bad: "const spring = { stiffness: 320, damping: 24, mass: 1.2 } // adjusting 'stiffness' to slow it down also removes the bounce",
        good: 'const spring = fromRatio({ dampingRatio: 0.75, durationMs: 300 }) // speed and bounce adjust independently',
      },
    },
    {
      id: 'motion-design/critical-damping-for-text',
      strength: 'should',
      statement:
        'Use a damping ratio at or near 1 for any surface carrying text the user is expected to read immediately.',
      evidence: {
        rationale:
          'A damping ratio below 1 produces overshoot, and overshoot means the content is still in motion after it has nominally arrived. Reading requires the eye to fixate, so an oscillating text surface delays first fixation by the duration of the settle, which is a real cost paid for a decorative effect.',
        confidence: 'strong',
      },
    },
    {
      id: 'motion-design/stagger-compression',
      strength: 'must',
      statement:
        'Compute stagger delay as a fixed total budget divided by item count rather than a fixed per-item delay, and cap the total sequence at about 300-500ms.',
      evidence: {
        rationale:
          'A fixed per-item delay makes total sequence length proportional to list length, so a thirty-item list takes over a second to finish arriving and the last items are still animating when the user has begun interacting with the first. The perceptual value of stagger — reading the group as ordered — is fully delivered by the first few items.',
        confidence: 'strong',
      },
      examples: {
        language: 'ts',
        bad: 'const delay = index * 50',
        good: 'const delay = index * Math.min(50, 300 / items.length)',
      },
    },
    {
      id: 'motion-design/interruptible-retarget',
      strength: 'must',
      statement:
        'An animation re-triggered while running must continue from the element’s current position and velocity, never restart from its declared initial value.',
      evidence: {
        rationale:
          'Restarting causes the element to jump discontinuously to a position it never occupied. Discontinuous position change breaks object permanence, so the viewer registers a different object rather than the same object moving — which is precisely the perception users report as an interface being glitchy or broken.',
        confidence: 'strong',
      },
      examples: {
        language: 'ts',
        bad: "el.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], 240)",
        good: "const from = getComputedStyle(el).transform\nfor (const a of el.getAnimations()) a.cancel()\nel.animate([{ transform: from }, { transform: 'none' }], 240)",
      },
      verifiedBy: 'interruption-test',
    },
    {
      id: 'motion-design/gesture-tracks-1to1',
      strength: 'must',
      statement:
        'While a pointer or touch is down, move the element in exact 1:1 correspondence with the input, applying easing or smoothing only after release.',
      evidence: {
        rationale:
          'During direct manipulation the user’s hand is the timing function, and the visual position is compared continuously against the felt position of the finger. Any interpolation introduces a lag between the two that is perceived as the surface being detached from the touch — a far more noticeable defect than frame jitter.',
        confidence: 'established',
      },
      exceptions: [
        'Progressive resistance past a defined boundary, where the deliberate divergence is itself the signal.',
      ],
    },
    {
      id: 'motion-design/release-velocity',
      strength: 'should',
      statement:
        'Decide a gesture’s outcome by projecting release velocity forward, and feed that velocity into the settling animation as its initial velocity.',
      evidence: {
        rationale:
          'A flick expresses intent through speed rather than displacement, so a threshold on distance alone rejects fast short gestures that the user considered complete. Discarding the velocity at handoff also stops the element dead and re-accelerates it, producing a discontinuity in the first derivative that reads as the system taking over.',
        confidence: 'strong',
      },
    },
    {
      id: 'motion-design/composited-properties-only',
      strength: 'must-not',
      statement:
        'Do not animate width, height, top, right, bottom, left, margin, padding, border-width, font-size, line-height, gap, or flex-basis.',
      evidence: {
        rationale:
          'These properties are inputs to layout, so changing them invalidates layout for the element and everything whose position depends on it, on every single frame. That work runs on the main thread, so the animation stutters exactly when the main thread is busy — which is when animations most often run.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.panel { transition: height 250ms ease; }',
        good: '.panel-wrapper { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 250ms cubic-bezier(0.4, 0, 0.2, 1); }\n.panel-wrapper[data-open] { grid-template-rows: 1fr; }\n.panel { min-height: 0; overflow: hidden; }',
      },
      verifiedBy: 'property-audit',
    },
    {
      id: 'motion-design/flip-for-layout-change',
      strength: 'should',
      statement:
        'Animate layout-driven position changes with the FLIP technique — measure, apply, invert with a transform, then play to identity.',
      evidence: {
        rationale:
          'FLIP converts a layout animation into a transform animation by letting layout run exactly once and then compensating for it. The frames in between cost only a compositor transform, so the motion is frame-rate independent of layout complexity.',
        confidence: 'established',
      },
      examples: {
        language: 'ts',
        good: "const first = el.getBoundingClientRect()\napplyStateChange()\nconst last = el.getBoundingClientRect()\nel.animate(\n  [{ transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)` }, { transform: 'none' }],\n  { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }\n)",
      },
    },
    {
      id: 'motion-design/reduced-motion-required',
      strength: 'must',
      statement:
        'Honour prefers-reduced-motion: reduce by removing translation, parallax, rotation, scale, and autoplaying loops from every non-essential animation.',
      evidence: {
        rationale:
          'Large-field visual motion stimulates the vestibular system, and for users with vestibular disorders it produces genuine nausea, dizziness and migraine. The media query is a direct report of that condition, expressed at the operating-system level, and treating it as a stylistic preference means shipping a product that makes some users physically unwell.',
        source: 'WCAG 2.2 Success Criterion 2.3.3 (Animation from Interactions)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html',
        confidence: 'established',
      },
      verifiedBy: 'reduced-motion-review',
    },
    {
      id: 'motion-design/reduced-motion-keeps-opacity',
      strength: 'should-not',
      statement:
        'Do not satisfy prefers-reduced-motion by setting all animation and transition durations to zero; replace spatial motion with a 100-150ms opacity change.',
      evidence: {
        rationale:
          'The problematic stimulus is large-field spatial displacement, not change over time. Removing every transition eliminates the change-of-state cue as well, so elements appear and disappear with no indication that anything happened — which makes the interface harder to follow for exactly the users who asked for less motion.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '@media (prefers-reduced-motion: reduce) {\n  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }\n}',
        good: '@media (prefers-reduced-motion: reduce) {\n  .sheet { transition: opacity 120ms ease; transform: none !important; }\n  .parallax { transform: none !important; }\n}',
      },
    },
    {
      id: 'motion-design/no-perpetual-attention-motion',
      strength: 'must-not',
      statement:
        'Do not run an indefinitely looping animation unless it represents an operation that is genuinely still in progress.',
      evidence: {
        rationale:
          'Repeated motion is habituated within seconds, so a perpetual pulse stops attracting attention while continuing to consume it, and any motion lasting more than five seconds must be pausable to satisfy WCAG. A loop is only informative while it maps to something ongoing.',
        source: 'WCAG 2.2 Success Criterion 2.2.2 (Pause, Stop, Hide)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html',
        confidence: 'established',
      },
      exceptions: ['Loading and progress indicators for an outstanding operation.'],
    },
    {
      id: 'motion-design/will-change-scoped',
      strength: 'should-not',
      statement:
        'Do not declare will-change in a static stylesheet on a broadly matching selector; add it immediately before an animation and remove it on completion.',
      evidence: {
        rationale:
          'will-change promotes the element to its own compositor layer, costing roughly width × height × 4 bytes of GPU memory that is held for as long as the declaration applies. Applied broadly it exhausts that memory and degrades compositing across the whole page, producing the opposite of the intended optimisation.',
        confidence: 'established',
      },
      exceptions: [
        'A small, fixed number of elements known to animate continuously, such as a persistent drag handle.',
      ],
    },
    {
      id: 'motion-design/scroll-effects-restraint',
      strength: 'should',
      statement:
        'Use at most one scroll-triggered reveal per page section, fire it once, and animate groups rather than individual elements.',
      evidence: {
        rationale:
          'A reveal is informative because it marks a boundary; applying the same reveal to every element makes it wallpaper and delays every piece of content behind a viewport intersection. Re-animating on scroll-back additionally makes already-read content move again, which reads as instability rather than polish.',
        confidence: 'opinion',
      },
    },
    {
      id: 'motion-design/scroll-linked-not-event-driven',
      strength: 'should',
      statement:
        'Drive scroll-linked effects with a scroll-driven animation timeline rather than updating styles from a scroll event listener.',
      evidence: {
        rationale:
          'Scrolling is composited off the main thread, so a scroll event handler observes a position the compositor has already moved past and applies its update a frame or more later. The effect therefore visibly trails the content it is attached to, and the lag grows with main-thread load.',
        confidence: 'strong',
      },
    },
    {
      id: 'motion-design/motion-not-sole-signal',
      strength: 'must-not',
      statement:
        'Do not let motion be the only carrier of a message, such as signalling an invalid field by shaking it alone.',
      evidence: {
        rationale:
          'Motion is transient and is only perceived by someone looking at that region at that moment, it is suppressed entirely under reduced-motion preferences, and it is invisible to assistive technology. Any message conveyed only in motion is therefore lost for a substantial share of users.',
        confidence: 'established',
      },
    },
  ],

  verification: [
    {
      id: 'motion-purpose-audit',
      kind: 'self-review',
      description: 'Confirm every animation communicates something.',
      blocking: true,
      questions: [
        'For each animation, which of the four jobs does it do — origin/destination, causality, continuity, or feedback?',
        'If the answer is "it looks nice", what breaks for the user if it is deleted?',
        'Does more than one element share the same entrance animation on the same screen, and would animating them as one group lose anything?',
      ],
    },
    {
      id: 'easing-direction-check',
      kind: 'self-review',
      description: 'Confirm curves match the direction of travel.',
      blocking: true,
      questions: [
        'Does every exit use an accelerating curve and a shorter duration than its matching entrance?',
        'Is any element entering the viewport using ease-in, or leaving it using ease-out?',
        'Is linear easing used anywhere other than a continuous loop or gesture-tracked motion?',
      ],
    },
    {
      id: 'duration-audit',
      kind: 'self-review',
      description: 'Confirm durations sit inside the perceptual bands.',
      questions: [
        'List every duration in the change. Is any input feedback above 100ms, or any blocking transition above 400ms?',
        'Do animations covering very different distances use noticeably different durations, and is the relationship sublinear?',
        'Does any stagger produce a total sequence longer than 500ms at the largest realistic item count?',
      ],
    },
    {
      id: 'property-audit',
      kind: 'self-review',
      description: 'Confirm only compositor-safe properties animate.',
      blocking: true,
      questions: [
        'Does any transition or keyframe touch width, height, top, right, bottom, left, margin, padding, border-width, font-size, line-height, gap, flex-basis, or a grid-template property?',
        'Is box-shadow or border-radius animated over a large surface rather than cross-faded?',
        'Does will-change appear in a static stylesheet, and if so on how many elements at once?',
      ],
    },
    {
      id: 'interruption-test',
      kind: 'self-review',
      description: 'Confirm animations survive being interrupted.',
      blocking: true,
      questions: [
        'Trigger each animation and re-trigger it halfway through. Does the element jump to an endpoint before responding?',
        'Does the reverse animation start from the element’s actual current position, and does it shorten to match the remaining distance?',
        'For gesture-driven motion, does releasing mid-drag continue at the velocity the pointer had, or restart from rest?',
      ],
    },
    {
      id: 'reduced-motion-review',
      kind: 'self-review',
      description: 'Confirm reduced-motion behaviour is designed, not disabled.',
      blocking: true,
      questions: [
        'Under prefers-reduced-motion: reduce, is all translation, parallax, rotation, scale, and looping motion removed?',
        'Is a change-of-state cue such as an opacity fade still present, or has every transition been set to zero?',
        'Does any autoplaying video, carousel, or background loop still run?',
        'Is any message — an error, a success, a new item — conveyed by motion alone once motion is removed?',
      ],
    },
    {
      id: 'gesture-review',
      kind: 'self-review',
      description: 'Confirm gesture handling tracks and settles correctly.',
      questions: [
        'Does the element follow the pointer exactly, with no smoothing, while the pointer is down?',
        'Is touch-action declared for the axis being handled, and is setPointerCapture called on pointerdown?',
        'Is release velocity measured over the last 50-100ms rather than from the final two events?',
        'Does a fast, short flick commit the gesture, or does it snap back?',
      ],
    },
    {
      id: 'contract-audit',
      kind: 'contract',
      description: 'Evaluate the motion against the project Design Contract motion section.',
      contractSection: 'motion',
    },
  ],

  relatedSkills: [
    'design-judgment',
    'interaction-design',
    'accessible-components',
    'surface-and-depth',
  ],
}
