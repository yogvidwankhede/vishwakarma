# The interactive state matrix

Every interactive element needs a decision — even if the decision is "not applicable" — for
each state below. Write the matrix out before styling; discovering at review time that
selected-and-disabled looks identical to selected is far more expensive.

## The states

### Rest
The default. Everything else is defined as a delta from it, so keep it calm enough that
deltas are visible. A rest state already at maximum contrast leaves nowhere for hover and
active to go.

### Hover
Signals "this responds", nothing more. A subtle surface or border shift — roughly a 4-8%
luminance change — is enough. Transition in 100-150ms; a transition longer than about 200ms
makes a cursor sweep across a list leave a visible trail.

Gate it: `@media (hover: hover) and (pointer: fine)`. Without the gate, a tap on a touch
device leaves the control stuck in hover until something else is tapped.

Hover must never be the only way to reach functionality. Row actions that appear on hover
need a keyboard-focus equivalent and a persistent alternative on touch.

### Focus-visible
The most important state and the most frequently deleted. Requirements:

- Use `:focus-visible`. Plain `:focus` fires on click, which is what drives people to
  remove the ring entirely.
- Never `outline: none` without a replacement in the same rule.
- Minimum 2px thick, with `outline-offset: 2px` so it does not merge with the border.
  `outline` follows `border-radius` in current browsers, so it needs no bespoke work.
- At least 3:1 contrast against *both* the control and the page behind it. A single
  hard-coded ring colour usually fails one of the two on some surface; a two-tone ring
  (light halo plus dark line) survives any background.
- The focused element must not be hidden behind sticky headers or footers. Add
  `scroll-margin-top` equal to the header height.
- Focus order must match visual order, and focus must be restored to the trigger when an
  overlay closes.

### Active (pressed)
Confirms the press landed, and must render within one frame regardless of what the click
starts. Use a small scale (0.97-0.99) or an inset shadow — a movement of 1px, not a
redesign. Because it is momentary, avoid transitioning *into* it; transition out of it.

### Disabled
Reduced opacity alone is a poor signal: it looks like a rendering artefact and often drops
text below 4.5:1. Prefer a distinctly flat surface, muted text, and `cursor: not-allowed`.

Two mechanisms, chosen deliberately:

- `disabled` — removes the element from the tab order and suppresses events. Use only when
  the control is genuinely inapplicable and does not need explaining.
- `aria-disabled="true"` — keeps the element focusable and discoverable while you suppress
  the action in the handler. Use whenever the user is likely to ask why.

Disabled state must always be explainable on demand. Nothing about grey conveys a reason.

### Loading
Applies to the element that triggered the work, not just the page. Requirements: preserve
the element's dimensions so nothing shifts; replace the label rather than adding to it;
block re-entry; set `aria-busy="true"`; announce the result in a live region on
completion, because a purely visual spinner is silent to screen readers.

### Selected / checked / pressed / expanded
Carry the corresponding ARIA state (`aria-selected`, `aria-checked`, `aria-pressed`,
`aria-expanded`) and make the visual difference stronger than hover — otherwise hovering an
unselected item looks identical to a selected one. Include a non-colour cue: a check, a
weight change, a left border.

### Error / invalid
A red border alone fails colour-blind users and says nothing about the cause. Pair the
colour with an icon and a text message, and set `aria-invalid="true"` plus
`aria-describedby` pointing at the message.

### Read-only
Distinct from disabled: the value matters, is selectable and copyable, and is part of the
data — it simply cannot be edited here. Style it as text-like, keep it focusable, keep
contrast full. Rendering read-only fields as greyed disabled inputs makes people think the
data is inactive.

## Composition

States combine, so fix precedence once:

1. disabled beats everything — a disabled control has no hover or active state
2. loading beats selected and error
3. focus-visible composes with all of them and is never suppressed
4. error composes with rest, hover, and focus
5. selected composes with hover and focus, and must remain the dominant signal

Two practical consequences: the focus ring must be legible on top of the error border and
the selected surface, and the selected-plus-hover appearance must still read as selected.

## Timing

Use 100-150ms with an ease-out curve for state transitions. Below ~80ms the change reads as
an instantaneous jump and loses its softening purpose; above ~250ms the interface feels
sluggish under rapid interaction. Transition only `background-color`, `border-color`,
`color`, `opacity`, `box-shadow`, and `transform`, and honour
`prefers-reduced-motion: reduce` by shortening rather than removing — state changes must
stay perceptible.

## Audit

For each interactive element, confirm:

1. Focus ring visible, on every background it can land on, at 3:1 or better
2. Hover gated behind `@media (hover: hover)`
3. Active state renders immediately on pointer-down
4. Disabled state explains itself somewhere
5. Loading state preserves dimensions and blocks re-entry
6. Selected state distinguishable from hover, without colour
7. Error state carries text, not just a border
8. Every visual state has an ARIA counterpart where one exists
