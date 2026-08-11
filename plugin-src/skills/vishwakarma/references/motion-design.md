# Motion Design

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
decelerate** — `cubic-bezier(0.16, 1, 0.3, 1)`: the element arrives carrying momentum and
settles where the user must read it. **Exits accelerate** — `cubic-bezier(0.4, 0, 1, 1)`:
it is departing, so there is nothing to read. **On-screen transforms use both**,
`cubic-bezier(0.4, 0, 0.2, 1)`. **Never `linear`** outside loops and gesture-tracked
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
total, not the step** — `delay = min(50ms, 300ms / count)` — and past eight items, stagger
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
integrator retaining `(position, velocity)`.

## 7. Gesture motion tracks input 1:1

While the pointer is down the element follows it exactly — no easing, no smoothing, because
the hand is the timing function and interpolation reads as the surface detaching from the
touch. Easing applies **only on release**, with exit velocity as the settling animation's
initial velocity. Decide the outcome by projecting where that velocity would carry the
element rather than by displacement: a flick covering 15% of the distance was a completed
gesture. Boundary resistance must be progressive, not a clamp.

## 8. Animate only what the compositor can animate

Rendering runs style → layout → paint → composite. `transform`, `opacity`, `filter`,
`backdrop-filter` and the individual `translate`/`rotate`/`scale` properties are handled
on the compositor thread, so they survive a busy main thread.

**Layout-triggering — never animate:** `width`, `height`, `top`, `right`, `bottom`,
`left`, `margin`, `padding`, `border-width`, `font-size`, `line-height`, `gap`,
`flex-basis`, `grid-template-*`. Each forces layout every frame, for the element and
everything positioned relative to it. `box-shadow` and `border-radius` only repaint, but
over a large area that is costly too.

Substitute. Height-to-auto: animate `grid-template-rows: 0fr → 1fr` on a grid wrapper with
`min-height: 0` and `overflow: hidden` on the child (`interpolate-size: allow-keywords`
with `calc-size()` is native but not yet Baseline). Width: `scaleX()` with an inverse
`scaleX()` on children, or `clip-path: inset()`. Position: `translate`. Shadow:
cross-fade a pseudo-element.

**FLIP** animates a layout change without animating layout. Record
`getBoundingClientRect()`, apply the change, measure again, apply a transform mapping the
new rect onto the old so the element appears not to have moved, then animate it to identity.
Layout runs once; every frame after is a compositor transform. Use `transform-origin: 0 0`
and counter-scale text children.

## 9. Reduced motion: remove spatial, keep signal

`prefers-reduced-motion: reduce` reports a medical condition: large-field motion produces
genuine nausea and dizziness in people with vestibular disorders. **Remove** translation over
distance, parallax, scale and zoom, rotation, and autoplaying or looping motion; **keep**
opacity cross-fades, colour transitions, and local movement under 20px.

Zeroing every duration is the wrong reduction and makes the interface *harder* to follow:
these users still need a change-of-state cue, and without the fade elements teleport with no
sign anything happened. Substitute a 100-150ms opacity change.

## 10. `will-change` discipline

`will-change` promotes an element to its own compositor layer at roughly width × height × 4
bytes of GPU memory, held for as long as the declaration applies, so declaring it broadly
exhausts that memory and degrades compositing everywhere. Add it just before an animation and
remove it after; since browsers already promote running compositor animations, the correct
amount is usually none.

## Rules

### MUST NOT — Do not animate width, height, top, right, bottom, left, margin, padding, border-width, font-size, line-height, gap, or flex-basis.

*Why:* These properties are inputs to layout, so changing them invalidates layout for the element and everything whose position depends on it, on every single frame. That work runs on the main thread, so the animation stutters exactly when the main thread is busy — which is when animations most often run.

Incorrect:

```css
.panel { transition: height 250ms ease; }
```

Correct:

```css
.panel-wrapper { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 250ms cubic-bezier(0.4, 0, 0.2, 1); }
.panel-wrapper[data-open] { grid-template-rows: 1fr; }
.panel { min-height: 0; overflow: hidden; }
```

### MUST NOT — Do not run an indefinitely looping animation unless it represents an operation that is genuinely still in progress.

*Why:* Repeated motion is habituated within seconds, so a perpetual pulse stops attracting attention while continuing to consume it, and any motion lasting more than five seconds must be pausable to satisfy WCAG. A loop is only informative while it maps to something ongoing.

*Source:* [WCAG 2.2 Success Criterion 2.2.2 (Pause, Stop, Hide)](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

*Exceptions:*
- Loading and progress indicators for an outstanding operation.

### MUST NOT — Do not let motion be the only carrier of a message, such as signalling an invalid field by shaking it alone.

*Why:* Motion is transient and is only perceived by someone looking at that region at that moment, it is suppressed entirely under reduced-motion preferences, and it is invisible to assistive technology. Any message conveyed only in motion is therefore lost for a substantial share of users.

### MUST — Every animation must serve one of four jobs — showing origin and destination, expressing causality, preserving continuity, or giving feedback — or be removed.

*Why:* Animation occupies time the user did not ask to spend. If the motion conveys nothing the start and end frames do not already convey, the only thing it adds is latency, and latency is the attribute users notice most reliably.

### MUST — Make exit animations roughly 60-70% of the duration of their matching entrance, and give them an accelerating rather than decelerating curve.

*Why:* An entrance must be readable, because the user is about to parse new content; an exit carries nothing to read, because the user has already decided. A slow, decelerating exit therefore delivers no information while blocking the next interaction, which is the mechanism behind an interface feeling sluggish when nothing is actually slow.

Incorrect:

```css
.dialog { transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1), transform 250ms cubic-bezier(0.16, 1, 0.3, 1); }
```

Correct:

```css
.dialog[data-state="open"] { transition: opacity 250ms cubic-bezier(0.16, 1, 0.3, 1), transform 250ms cubic-bezier(0.16, 1, 0.3, 1); }
.dialog[data-state="closed"] { transition: opacity 160ms cubic-bezier(0.4, 0, 1, 1), transform 160ms cubic-bezier(0.4, 0, 1, 1); }
```

### MUST — Use a decelerating curve for entrances, an accelerating curve for exits, and an ease-in-out curve only for motion that both begins and ends on screen.

*Why:* An easing curve is an acceleration profile, and acceleration implies a cause. An element arriving from off screen already has momentum, so it must decelerate into place; an element leaving is being pushed away, so it must accelerate out. Reversing this describes a physically impossible event and is the most frequent motion error in shipped interfaces.

### MUST — Compute stagger delay as a fixed total budget divided by item count rather than a fixed per-item delay, and cap the total sequence at about 300-500ms.

*Why:* A fixed per-item delay makes total sequence length proportional to list length, so a thirty-item list takes over a second to finish arriving and the last items are still animating when the user has begun interacting with the first. The perceptual value of stagger — reading the group as ordered — is fully delivered by the first few items.

Incorrect:

```ts
const delay = index * 50
```

Correct:

```ts
const delay = index * Math.min(50, 300 / items.length)
```

### MUST — An animation re-triggered while running must continue from the element’s current position and velocity, never restart from its declared initial value.

*Why:* Restarting causes the element to jump discontinuously to a position it never occupied. Discontinuous position change breaks object permanence, so the viewer registers a different object rather than the same object moving — which is precisely the perception users report as an interface being glitchy or broken.

Incorrect:

```ts
el.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }], 240)
```

Correct:

```ts
const from = getComputedStyle(el).transform
for (const a of el.getAnimations()) a.cancel()
el.animate([{ transform: from }, { transform: 'none' }], 240)
```

### MUST — While a pointer or touch is down, move the element in exact 1:1 correspondence with the input, applying easing or smoothing only after release.

*Why:* During direct manipulation the user’s hand is the timing function, and the visual position is compared continuously against the felt position of the finger. Any interpolation introduces a lag between the two that is perceived as the surface being detached from the touch — a far more noticeable defect than frame jitter.

*Exceptions:*
- Progressive resistance past a defined boundary, where the deliberate divergence is itself the signal.

### MUST — Honour prefers-reduced-motion: reduce by removing translation, parallax, rotation, scale, and autoplaying loops from every non-essential animation.

*Why:* Large-field visual motion stimulates the vestibular system, and for users with vestibular disorders it produces genuine nausea, dizziness and migraine. The media query is a direct report of that condition, expressed at the operating-system level, and treating it as a stylistic preference means shipping a product that makes some users physically unwell.

*Source:* [WCAG 2.2 Success Criterion 2.3.3 (Animation from Interactions)](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

### SHOULD NOT — Do not use linear easing for discrete objects entering, leaving, or moving; reserve it for continuous loops and gesture-tracked motion.

*Why:* Linear motion has zero acceleration throughout and then infinite acceleration at both ends, which corresponds to no physical event and reads as mechanical. Continuous rotation is the exception because there are no endpoints, and eased rotation reads as stuttering since the eye tracks angular velocity directly.

### SHOULD NOT — Do not satisfy prefers-reduced-motion by setting all animation and transition durations to zero; replace spatial motion with a 100-150ms opacity change.

*Why:* The problematic stimulus is large-field spatial displacement, not change over time. Removing every transition eliminates the change-of-state cue as well, so elements appear and disappear with no indication that anything happened — which makes the interface harder to follow for exactly the users who asked for less motion.

Incorrect:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

Correct:

```css
@media (prefers-reduced-motion: reduce) {
  .sheet { transition: opacity 120ms ease; transform: none !important; }
  .parallax { transform: none !important; }
}
```

### SHOULD NOT — Do not declare will-change in a static stylesheet on a broadly matching selector; add it immediately before an animation and remove it on completion.

*Why:* will-change promotes the element to its own compositor layer, costing roughly width × height × 4 bytes of GPU memory that is held for as long as the declaration applies. Applied broadly it exhausts that memory and degrades compositing across the whole page, producing the opposite of the intended optimisation.

*Exceptions:*
- A small, fixed number of elements known to animate continuously, such as a persistent drag handle.

### SHOULD — Keep feedback under 100ms, standard enters and transforms between 200ms and 350ms, and nothing the user is waiting on above 400ms.

*Why:* Below roughly 100ms a response is perceived as instantaneous and is causally bound to its trigger. Around 200-300ms the eye can track an object and learn its path. Past roughly 400ms the motion stops functioning as information and is experienced as waiting, which is the threshold at which users begin describing an interface as slow.

*Source:* Nielsen, response time limits; Doherty threshold (400ms)

*Exceptions:*
- Shared-element and hero transitions, where 350-400ms buys a continuity cue that nothing else can provide.

### SHOULD — Scale duration sublinearly with travel distance — roughly with its square root — and clamp the result between about 150ms and 400ms.

*Why:* Perceived speed is judged from angular velocity rather than absolute distance, so mapping distance to duration linearly makes short moves feel sticky and long moves intolerable. A sublinear mapping keeps apparent velocity within a comfortable band across the whole range of distances a viewport contains.

### SHOULD — Parameterise springs by damping ratio and natural frequency (or duration and bounce) rather than by raw stiffness, damping, and mass.

*Why:* Stiffness, damping and mass are coupled: raising stiffness changes both how fast the motion is and how much it overshoots, so tuning one perceptual quality always disturbs the other. Damping ratio and natural frequency are orthogonal — one controls overshoot, the other controls speed — which is what makes the parameters tunable by a human at all.

Incorrect:

```ts
const spring = { stiffness: 320, damping: 24, mass: 1.2 } // adjusting 'stiffness' to slow it down also removes the bounce
```

Correct:

```ts
const spring = fromRatio({ dampingRatio: 0.75, durationMs: 300 }) // speed and bounce adjust independently
```

### SHOULD — Use a damping ratio at or near 1 for any surface carrying text the user is expected to read immediately.

*Why:* A damping ratio below 1 produces overshoot, and overshoot means the content is still in motion after it has nominally arrived. Reading requires the eye to fixate, so an oscillating text surface delays first fixation by the duration of the settle, which is a real cost paid for a decorative effect.

### SHOULD — Decide a gesture’s outcome by projecting release velocity forward, and feed that velocity into the settling animation as its initial velocity.

*Why:* A flick expresses intent through speed rather than displacement, so a threshold on distance alone rejects fast short gestures that the user considered complete. Discarding the velocity at handoff also stops the element dead and re-accelerates it, producing a discontinuity in the first derivative that reads as the system taking over.

### SHOULD — Animate layout-driven position changes with the FLIP technique — measure, apply, invert with a transform, then play to identity.

*Why:* FLIP converts a layout animation into a transform animation by letting layout run exactly once and then compensating for it. The frames in between cost only a compositor transform, so the motion is frame-rate independent of layout complexity.

Correct:

```ts
const first = el.getBoundingClientRect()
applyStateChange()
const last = el.getBoundingClientRect()
el.animate(
  [{ transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)` }, { transform: 'none' }],
  { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
)
```

### SHOULD — Use at most one scroll-triggered reveal per page section, fire it once, and animate groups rather than individual elements.

*Why:* A reveal is informative because it marks a boundary; applying the same reveal to every element makes it wallpaper and delays every piece of content behind a viewport intersection. Re-animating on scroll-back additionally makes already-read content move again, which reads as instability rather than polish.

### SHOULD — Drive scroll-linked effects with a scroll-driven animation timeline rather than updating styles from a scroll event listener.

*Why:* Scrolling is composited off the main thread, so a scroll event handler observes a position the compositor has already moved past and applies its update a frame or more later. The effect therefore visibly trails the content it is attached to, and the lag grows with main-thread load.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm every animation communicates something. (blocking)

- For each animation, which of the four jobs does it do — origin/destination, causality, continuity, or feedback?
- If the answer is "it looks nice", what breaks for the user if it is deleted?
- Does more than one element share the same entrance animation on the same screen, and would animating them as one group lose anything?

### Confirm curves match the direction of travel. (blocking)

- Does every exit use an accelerating curve and a shorter duration than its matching entrance?
- Is any element entering the viewport using ease-in, or leaving it using ease-out?
- Is linear easing used anywhere other than a continuous loop or gesture-tracked motion?

### Confirm durations sit inside the perceptual bands.

- List every duration in the change. Is any input feedback above 100ms, or any blocking transition above 400ms?
- Do animations covering very different distances use noticeably different durations, and is the relationship sublinear?
- Does any stagger produce a total sequence longer than 500ms at the largest realistic item count?

### Confirm only compositor-safe properties animate. (blocking)

- Does any transition or keyframe touch width, height, top, right, bottom, left, margin, padding, border-width, font-size, line-height, gap, flex-basis, or a grid-template property?
- Is box-shadow or border-radius animated over a large surface rather than cross-faded?
- Does will-change appear in a static stylesheet, and if so on how many elements at once?

### Confirm animations survive being interrupted. (blocking)

- Trigger each animation and re-trigger it halfway through. Does the element jump to an endpoint before responding?
- Does the reverse animation start from the element’s actual current position, and does it shorten to match the remaining distance?
- For gesture-driven motion, does releasing mid-drag continue at the velocity the pointer had, or restart from rest?

### Confirm reduced-motion behaviour is designed, not disabled. (blocking)

- Under prefers-reduced-motion: reduce, is all translation, parallax, rotation, scale, and looping motion removed?
- Is a change-of-state cue such as an opacity fade still present, or has every transition been set to zero?
- Does any autoplaying video, carousel, or background loop still run?
- Is any message — an error, a success, a new item — conveyed by motion alone once motion is removed?

### Confirm gesture handling tracks and settles correctly.

- Does the element follow the pointer exactly, with no smoothing, while the pointer is down?
- Is touch-action declared for the axis being handled, and is setPointerCapture called on pointerdown?
- Is release velocity measured over the last 50-100ms rather than from the final two events?
- Does a fast, short flick commit the gesture, or does it snap back?

### Evaluate the motion against the project Design Contract motion section.

Evaluate the output against the project Design Contract (motion section).

Run `vishwakarma audit` if the project has the CLI available.

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/motion-pattern-catalogue.md` — What are the concrete durations, easings, transforms, and origins for the standard interface motion patterns — modals, drawers, menus, toasts, accordions, list changes, page transitions?
- `references/interruption-and-gesture.md` — How do I build animations that can be re-targeted mid-flight without a discontinuity, and how do I implement drag, swipe, and flick gestures that track input and settle correctly on release?
