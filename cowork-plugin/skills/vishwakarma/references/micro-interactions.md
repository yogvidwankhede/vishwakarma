# Micro-interactions

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
`pointerdown`: `click` fires on *release*, so a control bound to it is inert for the
whole duration of the press — precisely the window in which the user asks "did that
register?".

**Rules** — what may happen, and above all what happens on interruption. Most
micro-interactions are written for the clean sequence and disintegrate on `pointercancel`,
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

```ts
await ripple.finished   // bug: every save is now 300ms late
await save()

void save()             // correct: commit, then animate the consequence
ripple.play()
```

The rule governs exits equally: a deleted row animates out of a list whose data already
excludes it. And if a user can outrun the animation by pressing twice, the second press must
land on the new state rather than be swallowed by the first one's transition.

---

## 3. Press physics

**Scale to 0.97, not 0.9.** A press reads as the surface yielding, not the object shrinking. On a 44px control `scale(0.97)` moves each edge in by 0.66px — below the
threshold at which you see displacement, above the one at which you feel it. At 0.9 a 320px
button pulls its edges in by 16px: the label resamples and the button appears to retreat
from the page. The cue is edge displacement in pixels, not ratio, so larger surfaces need
*less* — 0.98 above ~200px, 0.96 below ~32px.

**Set `transform-origin` to the anchor.** A menu growing from its trigger uses that
corner; a full-width row scaled about `center` breaks alignment with its neighbours, so
shift its background instead. The default `50% 50%` on an edge-anchored element is the
commonest cause of a press that "looks wrong" for no nameable reason.

**Asymmetric timing.** Attack fast, release slower: 80-100ms in, 150-200ms back, both
`ease-out`. A tap can be shorter than the attack, so release only at
`max(pointerup, attack complete)`.

**Always release on `pointercancel`.** A state cleared only on `pointerup` sticks when
the browser claims the gesture for scrolling or a system alert steals the pointer. Use one
cleanup path for `pointerup`, `pointercancel` and `lostpointercapture`.

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
picks up a row. Scope `touch-action: none` to the handle alone.

**Hover is not universal.** Gate hover affordances behind
`@media (hover: hover) and (pointer: fine)`: touch browsers emulate `:hover` on tap and
leave it applied until the next tap elsewhere, so an ungated hover style becomes a stuck
state indistinguishable from a selection bug.

---

## 5. State-change feedback

Prefer feedback that *draws the transition* over feedback that decorates it. A tick animated
with `stroke-dashoffset` from its path length to 0 over ~150ms shows the mark being made;
a tick that fades in shows nothing. A switch thumb overshoots slightly while the
track colour crossfades over the same window, because the two are one event.

A floating label must animate with `transform: translateY() scale()` and
`transform-origin: left center`, never `font-size` and `top` — those force layout every
frame and jitter the baseline. Focus rings, conversely, should not transition at all: a
fading ring reads as lag to the keyboard user who most depends on it.

Validation must not move the layout: reserve the error slot with `min-height` and animate
only opacity and a 4px rise, or the message pushes the submit button out from under a cursor
already travelling toward it. And confirmations must be announced, not merely drawn: a tick
swapped into a copy button tells a sighted user everything and a screen-reader user nothing.

---

## 6. Quantity, duration, and loading

Rolling numbers need `font-variant-numeric: tabular-nums`, or the container resizes every
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
drag. `navigator.vibrate()` requires sticky user activation, is ignored under silent and
do-not-disturb, and is absent from Safari, so iOS has no supported programmatic path at all.
Haptics enhance; they never carry information alone.

---

## 8. Failure modes

- **Animation blocking input.** An exiting overlay that keeps `pointer-events: auto` eats
  the first click aimed past it, which is perceived as a dropped input.
- **Celebration on routine actions.** Confetti is a depleting asset: reserve it for a
  genuine first, because on a daily task it is an obstacle.
- **Bursts replaying on mount.** Animating from a boolean prop rather than a user event
  fires every like on the page when the user navigates back.
- **Motion as the only signal.** Under `prefers-reduced-motion` the state change stays and
  the travel goes.

## Rules

### MUST NOT — Do not make a state change, network request, or navigation wait for an animation to finish.

*Why:* Feedback exists to report that the system received the input. If the feedback also delays the system, it converts a signal of responsiveness into a source of latency, and the delay is paid on every single invocation for the lifetime of the product.

Incorrect:

```ts
await ripple.finished
await save(draft)
```

Correct:

```ts
void save(draft)
ripple.play()
```

### MUST NOT — Do not leave an exiting overlay, toast, or menu hit-testable while it animates out.

*Why:* A fading element still occupies its box and still receives pointer events at full opacity zero, so it swallows the first click aimed at whatever is behind it. The user perceives this as a dropped input rather than as a collision with an invisible object.

Incorrect:

```css
.overlay[data-state="closing"] { opacity: 0; transition: opacity 200ms; }
```

Correct:

```css
.overlay[data-state="closing"] { opacity: 0; pointer-events: none; transition: opacity 200ms; }
```

### MUST — Apply press feedback on pointerdown, not on click, and enforce a minimum visible hold of about 90ms.

*Why:* A click event fires on release, so feedback bound to it is absent for the whole duration of the press — exactly the interval during which the user is uncertain whether the input registered. A minimum hold is needed because a tap can be shorter than one frame budget, leaving the state invisible.

### MUST — Clear press, ripple, and drag states on pointercancel and lostpointercapture as well as pointerup, never on a fixed timer alone.

*Why:* A pointer sequence can end without pointerup: the browser claims the gesture for scrolling, the OS shows an alert, or the element is removed. A handler that only listens for pointerup leaves the control visually stuck in its active state, and a timer-driven exit can outlive the element it belongs to.

### MUST — Gate hover-dependent styling and behaviour behind @media (hover: hover) and (pointer: fine).

*Why:* Touch browsers synthesise a hover state on tap and retain it until the next tap elsewhere, so an ungated hover style persists on the last-tapped element and is indistinguishable from a selected state. Hover-revealed controls are additionally unreachable by touch entirely.

*Source:* [CSS Media Queries Level 4, hover and pointer features](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover)

### MUST — Start a drag only after roughly 6-8px of pointer travel, or after a ~200ms hold on touch, and apply touch-action: none to the handle rather than the container.

*Why:* Pointers move by one or two pixels during an ordinary tap, so a drag that begins on the first pointermove converts every tap into a micro-drag. On touch, a drag armed immediately steals the gesture from the scroller, making a sortable list impossible to scroll.

### MUST — Reserve space for validation messages so revealing or hiding one causes no layout shift.

*Why:* An inserted message displaces everything below it, including the submit button, while the pointer is already travelling toward that button. The user then activates whatever moved into the vacated position, which is a mis-activation caused entirely by the feedback intended to help them.

### MUST — Pair every purely visual confirmation, such as a copy-to-clipboard tick, with a polite live region announcement.

*Why:* An icon swap changes no accessible name, role, or value, so assistive technology emits nothing and the user has no evidence the action succeeded. A polite live region reports the outcome without interrupting whatever is currently being read.

*Source:* [WAI-ARIA aria-live](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live)

### MUST — Trigger celebratory and emphasis animations from the user-driven state transition, never from a component mounting with the state already set.

*Why:* Mount-driven animation cannot distinguish "the user just did this" from "this was already true when the list rendered", so a back-navigation, a re-render, or a restored scroll position replays every animation on screen simultaneously.

### MUST — Never decrease a determinate progress value; if the estimate worsens, hold the value and reduce the rate of advance.

*Why:* A progress bar is read as a claim about work completed. Retreating contradicts that claim, and users interpret it as work having been lost rather than as an estimate being revised, which is far more alarming than a bar that merely slows.

### MUST — Apply font-variant-numeric: tabular-nums to any number that animates, counts, or updates in place.

*Why:* Proportional figures have per-glyph advance widths, so a value passing through different digits changes its rendered width on almost every frame. The text then shifts horizontally throughout the animation and any adjacent content shifts with it.

### MUST — Pause a toast’s auto-dismiss timer on hover and on focus within it, and resume with the remaining time.

*Why:* A toast that expires while being read or while its action is being reached is unusable by anyone reading slowly or navigating by keyboard, and a time limit the user cannot extend fails the timing requirements that apply to content that disappears automatically.

*Source:* [WCAG 2.2 Success Criterion 2.2.1 (Timing Adjustable)](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html)

### SHOULD NOT — Do not transition or delay the appearance of a focus indicator.

*Why:* Keyboard navigation is rapid and the focus ring is the only positional feedback available. Any fade makes the indicator lag the actual focus during fast tabbing, so the user cannot tell which element is focused at the moment they act on it.

### SHOULD NOT — Do not attach celebratory feedback such as confetti or bursts to actions a user performs routinely.

*Why:* Response to a novel stimulus attenuates with repetition, so the celebration stops being rewarding within a few exposures while continuing to cost the same attention and the same delay. What remains is an obstacle between the user and their next action.

*Exceptions:*
- Genuine first-time completions and infrequent milestones.

### SHOULD — Scale pressed controls to between 0.96 and 0.98, using a smaller reduction on larger surfaces, rather than a fixed dramatic value such as 0.9.

*Why:* The perceived cue is edge displacement measured in pixels, not the ratio. A 0.97 scale on a 44px control displaces each edge by 0.66px, which is felt but not seen; the same ratio on a 320px control displaces 4.8px, and 0.9 displaces 16px, at which point the element reads as retreating from the page and its text visibly resamples.

Incorrect:

```css
.btn:active { transform: scale(0.9); transition: transform 300ms ease; }
```

Correct:

```css
.btn:active { transform: scale(0.97); transition: transform 90ms ease-out; }
```

### SHOULD — Set transform-origin to the element’s visual anchor — the trigger corner for a popover, the attached edge for a panel — instead of relying on the 50% 50% default.

*Why:* Scaling implies growth from a point. When that point is not where the element is attached, the element appears to slide as well as scale, which contradicts its spatial relationship to whatever spawned it and reads as an unexplained wobble.

### SHOULD — Delay hover-triggered opening by about 100ms and hover-triggered closing by about 300ms, cancelling the close when the pointer re-enters the trigger or the panel.

*Why:* A pointer travelling to a distant target crosses intermediate elements, so a zero open delay produces panels that flash open in passing. Conversely a pointer moving diagonally toward a panel briefly leaves the trigger, so a short close delay is what allows the panel to be reached at all.

*Exceptions:*
- Sibling triggers while a menu in the same group is already open, where the user has committed to the mode and the open delay should be zero.

### SHOULD — Commit a swipe when displacement passes about 40% of the element or when release velocity exceeds about 0.5 px/ms, and spring back using the measured release velocity otherwise.

*Why:* Users express intent through speed as well as distance. A distance-only threshold rejects fast flicks that clearly meant to dismiss, which makes the control feel heavy; discarding release velocity on the return makes the spring-back start from rest and appear disconnected from the gesture that caused it.

### SHOULD — Apply progressive resistance rather than a hard stop when a drag or scroll continues past its boundary, using an asymptotic function of overscroll distance.

*Why:* A hard stop is indistinguishable from a frozen interface, since input continues while output does not. Resistance keeps the element responsive to every pixel of input while communicating that a limit has been reached, and an asymptotic curve guarantees the element can never be dragged implausibly far.

### SHOULD — Animate floating labels with transform and transform-origin, not with font-size, top, or margin.

*Why:* font-size and box offsets are layout-affecting properties, so each frame forces a reflow of the input and its siblings and the text baseline snaps between integer positions. A scaled transform is handled by the compositor and interpolates smoothly.

Incorrect:

```css
.label--float { top: 4px; font-size: 12px; transition: top 150ms, font-size 150ms; }
```

Correct:

```css
.label--float { transform: translateY(-1.1em) scale(0.82); transform-origin: left center; transition: transform 150ms ease-out; }
```

### SHOULD — Prefer a static skeleton over a shimmering one, show it only after about 200ms of waiting, and match the incoming content’s dimensions exactly.

*Why:* A shimmer is an unbounded loop whose cycle rarely aligns with the load, so a fast response shows a fragment of moving light that reads as a rendering fault. It also runs continuously on the weakest devices at the moment the main thread is most contended, and mismatched dimensions convert the arrival of content into a layout shift.

### SHOULD — Fire at most one haptic per committed state change, latched so that crossing a threshold repeatedly does not repeat it, and never as the sole carrier of information.

*Why:* Vibration requires sticky user activation, is suppressed in silent and do-not-disturb modes, is unsupported in Safari, and is absent on most desktop hardware, so any information carried only by haptics is unavailable to the majority of users. Unlatched haptics on a threshold produce a buzz on every wobble across the boundary.

*Source:* [Vibration API, Navigator.vibrate()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)

### SHOULD — Under prefers-reduced-motion, keep one-to-one gesture tracking and the resulting state change, and replace only the momentum, spring-back, and travel animations.

*Why:* Vestibular symptoms are provoked by unrequested large-area movement, not by an object following the finger that is moving it. Disabling direct manipulation removes a capability without removing the trigger, while removing autonomous travel removes the trigger without removing the capability.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm no animation sits on the critical path of an outcome. (blocking)

- Does any handler await an animation, a transition end event, or a timeout before dispatching a state change, request, or navigation?
- If the user activates the control twice in 200ms, does the second activation land on the updated state?
- While any overlay or toast is animating out, does it still receive pointer events?

### Confirm press and control feedback parameters are correct. (blocking)

- Is press feedback bound to pointerdown, and is it still visible for a tap shorter than 50ms?
- What is the pressed scale, and how many pixels does each edge move at the element’s actual rendered size?
- Is transform-origin set to the element’s visual anchor, or left at the default centre?
- Does revealing a validation message change the position of any other element?

### Confirm every micro-interaction ends cleanly on interruption. (blocking)

- Begin a press, then scroll away from the control without lifting. Does the active state clear?
- Does every active, ripple, or drag state have a handler for pointercancel and lostpointercapture, not only pointerup?
- If the element unmounts mid-animation, is any timer or animation left running against it?

### Confirm the behaviour is correct for touch, mouse, and keyboard.

- Is every hover-dependent style or affordance gated behind @media (hover: hover) and (pointer: fine)?
- After tapping a control on a touch device, does any hover styling remain applied?
- Is anything revealed only on hover also reachable by touch and by keyboard focus?

### Confirm gestures have physically coherent thresholds and alternatives.

- Does the drag begin only after a movement or hold threshold, and is touch-action scoped to the handle?
- Does a fast flick that travels a short distance commit, and does a slow drag past the distance threshold also commit?
- Does the element resist rather than stop at its boundary, and does the release spring carry the measured velocity?
- Does every gesture have a keyboard or button equivalent?
- Under reduced motion, is tracking preserved while momentum and spring-back are replaced?

### Confirm outcomes are perceivable without sight. (blocking)

- List every confirmation expressed only as an icon change, a colour change, or motion. Is each also announced?
- Does any passive indicator, such as a count badge, announce on every background update?
- Does a toast pause its dismissal timer on hover and on focus within it?

### Confirm loading feedback matches the actual wait.

- Does the skeleton or spinner appear only after a delay, and once shown does it persist long enough not to flash?
- Do the skeleton’s dimensions match the loaded content exactly, producing no shift on arrival?
- Can any determinate progress value decrease?

### Confirm the interaction survives its hundredth repetition.

- Is any celebratory feedback attached to an action the user performs more than a few times a week?
- Is the animation triggered by a user-driven transition rather than by mount with the state already set?
- After navigating away and back, does any emphasis animation replay?

### Evaluate the interaction feedback against the project Design Contract motion section.

Evaluate the output against the project Design Contract (motion section).

Run `vishwakarma audit` if the project has the CLI available.

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/interaction-catalogue.md` — What are the concrete parameters — durations, easings, thresholds, properties — for each common micro-interaction, and what is the specific failure mode of each?
- `references/gesture-physics.md` — How do I implement rubber-banding, momentum, snap thresholds, pull-to-refresh, and swipe-to-dismiss so they feel physically correct rather than arbitrary?
