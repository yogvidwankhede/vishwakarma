// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Interaction design.
 *
 * Visual design decides whether an interface is looked at. Interaction design decides
 * whether it can be used. The two fail in opposite ways: bad visual design is immediately
 * obvious and rarely fatal, while bad interaction design is invisible in a screenshot and
 * routinely costs the user their work.
 *
 * Generated interfaces are unusually prone to this because a component that renders
 * correctly *looks* finished. The rest state is the only state anyone sees while building,
 * so hover is guessed, focus is deleted, disabled is used as an error message, loading is a
 * spinner over an empty box, and failure says "Something went wrong". Each of those is a
 * specific, nameable defect with a specific, checkable correction, and that is what this
 * skill contains.
 */
export const interactionDesign: SkillManifest = {
  vsm: '1.0',
  id: 'interaction-design',
  name: 'Interaction Design',
  description:
    'Use when building or reviewing interactive elements, forms, async actions, or destructive operations — states, feedback, errors, recovery.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'ux',
  tags: ['interaction', 'states', 'forms', 'validation', 'feedback', 'errors', 'loading'],

  activation: {
    intents: [
      'building a button, input, toggle, menu, or any other interactive control',
      'building or reviewing a form, including validation and submission',
      'wiring up an action that calls a network request and needs a loading or error state',
      'adding a delete, remove, archive, or other destructive action',
      'the user reports that something feels unresponsive, confusing, or unforgiving',
      'reviewing an interface for usability before shipping it',
    ],
    globs: ['**/*.tsx', '**/*.jsx', '**/*.vue', '**/*.svelte', '**/components/**', '**/forms/**'],
    keywords: [
      'button',
      'form',
      'validation',
      'loading',
      'spinner',
      'skeleton',
      'error',
      'disabled',
      'hover',
      'focus',
      'confirm',
      'undo',
      'submit',
    ],
  },

  content: {
    summary:
      'Design the states, feedback timing, and failure paths of interactive elements: the full state matrix, latency thresholds, loading patterns, undo over confirmation, actionable errors, and form validation that does not fight the user.',

    body: `# Interaction Design

Every interaction is the same three beats: the user works out what can be done, does it,
and finds out what happened. Visual failures are embarrassing; interaction failures cost
people their work.

The dominant defect in generated UI is that only the rest state exists. A component looks
finished because it renders, and the states nobody screenshots — focus, loading, error,
disabled — are guessed or omitted.

---

## 1. Every control has a state matrix

Enumerate the states before styling: **rest, hover, focus-visible, active, disabled,
loading, selected, error, read-only**. They combine — a selected row can be hovered and
focused at once — so fix precedence once rather than discovering conflicts later. Details
are in the state-matrix reference. Three are almost always wrong in generated code.

**Focus must use \`:focus-visible\`, not \`:focus\`.** A plain \`:focus\` rule fires on mouse
clicks too, so authors delete the ring to stop buttons "flashing", and keyboard users lose
the only cue telling them where they are. \`:focus-visible\` applies the browser's own
heuristic: keyboard focus gets a ring, pointer focus does not. Never write \`outline: none\`
without a replacement in the same rule.

**Hover does not exist on touch.** Gate it behind \`@media (hover: hover)\` so a tap does
not leave the control stuck in hover, and never put functionality behind it alone.

**Disabled must communicate why.** A greyed control with no explanation is a dead end.

---

## 2. Affordance without colour

A control must read as operable from its shape, not its hue — text that is merely blue in a
paragraph of black is not a link to the one man in twelve with a colour vision deficiency.
Carry affordance in a non-colour channel: an underline on inline links, a filled or
outlined surface on buttons, a border and inset shading on inputs, a caret on menus. Render it
in greyscale and ask what still looks clickable.

The mirror failure is *false affordance* — cards with hover lift that are not clickable. A
user who clicks something inert learns to distrust everything.

---

## 3. Feedback latency has hard thresholds

These come from perception, not fashion.

- **Under ~100ms** the response feels caused by the user's own action. Show nothing; a
  spinner here makes the interaction feel *slower*.
- **Up to ~1s** attention holds. An indeterminate indicator suffices.
- **Beyond ~1s** the train of thought breaks. Show *determinate* progress — "3 of 12
  files" — because a spinner gives no basis for deciding whether to keep waiting.
- **Beyond ~10s** attention is gone. Move the work to the background and notify on
  completion.

Acknowledgement is separate from completion: the press state must render within one frame
of pointer-down no matter how long the request takes.

---

## 4. Loading: nothing, spinner, skeleton, progress

**Nothing** is correct under about 300ms. Add hysteresis — delay the indicator ~300ms, then
hold it ~500ms minimum. Without both, fast responses flash and read as a glitch.

**A spinner** suits short waits of unknown shape and in-place actions, such as a button's
label swapping for a spinner of the same width. Never let a button resize.

**A skeleton** suits a first load whose layout is known. Its whole justification is
reserving space, so **a skeleton whose geometry differs from the real content is worse than
no skeleton** — it guarantees layout shift at the moment the user starts reading. Match
line counts, heights, and column widths.

---

## 5. Optimistic UI, and when it lies

Rendering the result before the server confirms it is right when the operation is very
likely to succeed, cheap to reverse, and locally computable — a like, a rename, a reorder.
It is dishonest when failure is plausible, when the true result differs from the guess
(server-assigned ids, computed totals, moderation), or when the user would act on the false
state. "Payment complete" before the charge settles is not optimism but a lie.

Optimistic UI is incomplete without a rollback path: revert, report the failure, and do not
silently discard what the user typed.

---

## 6. Destructive actions: prefer undo to confirmation

A confirmation dialog taxes every user to catch the rare mistaken one, and because it
appears constantly it is clicked through reflexively. It trains dismissal, then fails at the
moment it was built for.

Undo inverts the cost. The action happens immediately and a transient affordance offers
reversal for 5-10 seconds. The common case costs nothing; the mistake is recoverable.

Confirm only when reversal is genuinely impossible: hard deletion with no soft-delete,
irreversible external side effects, destroying other people's data. Then make it
*effortful* — require typing the resource name — and state the blast radius concretely
("deletes 1,204 records"), never "Are you sure?".

---

## 7. Disabled buttons are an anti-pattern

Disabling a submit button until a form is valid is the most common way to make a form
unusable. The \`disabled\` attribute removes the element from the tab order, so keyboard
users cannot reach it; it gives no reason; and it leaves the user hunting for the offending
field with no feedback loop.

The correct pattern: **keep the button operable, let the click fail, explain the failure.**
On submit, validate, focus the first invalid field, announce a summary. The click is the
user asking "what's wrong?" — answer it.

Legitimate uses of \`disabled\` are narrow: a control inapplicable in the current mode, or
one mid-submission. Where a control is inert but should stay discoverable, prefer
\`aria-disabled="true"\` with an explanation.

---

## 8. Errors that can be recovered from

A usable error contains three things: **what happened**, **why**, and **what to do next**.
"Something went wrong" contains none of them.

Write in the user's terms. Never blame them ("Invalid input"), never surface raw exception
text as the primary message, never lose their data. Put the message next to what failed,
keep a correlation id available for support, and give a real next step. Offer retry only
when retrying might work.

---

## 9. Forms are the hardest surface

**Validation timing.** Validate on blur, then re-validate on change *once a field has
already errored*. Per-keystroke validation tells someone their email is invalid at the
second character, which is both wrong and hostile. CSS \`:user-invalid\` gives this natively
— unlike \`:invalid\` it matches only after interaction. Errors must clear once fixed.

**Announcement.** Bind each message with \`aria-describedby\` and set \`aria-invalid\`. On
failed submit, render a summary listing every error as links to their fields, and move
focus to it — it is the only way a screen-reader user learns a long form failed.

**Let the browser help.** Correct \`autocomplete\` tokens (\`email\`, \`street-address\`,
\`cc-number\`, \`one-time-code\`, \`new-password\`) enable autofill and password managers, and
are a WCAG requirement. Match the keyboard to the data with \`type\` and \`inputmode\` —
\`inputmode="numeric"\` for codes rather than \`type="number"\` — and set \`enterkeyhint\`.

**Double submission.** Disable the button *and* guard the handler with an in-flight flag,
and send an idempotency key so a retried request cannot create two orders.

**Never destroy input.** Preserve values across failed submits, and never clear a password
field on error.

---

## 10. Pointer, touch, and keyboard parity

Hit targets need at least 24x24 CSS pixels, and 44x44 on touch. Expand the *target* without
expanding the *visual*, using padding or a pseudo-element overlay: an icon button should
look small and hit large.

Anything achievable by dragging must also be achievable by single clicks or keyboard —
move-up/move-down controls, a "move to" menu, cut-and-paste semantics. Drag-only reordering
excludes keyboard and screen-reader users and anyone with a motor impairment.`,

    references: [
      {
        id: 'state-matrix',
        title: 'The interactive state matrix',
        answers:
          'What are all the states an interactive element needs, how do they combine, and what should each one actually look like?',
        content: `# The interactive state matrix

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

Gate it: \`@media (hover: hover) and (pointer: fine)\`. Without the gate, a tap on a touch
device leaves the control stuck in hover until something else is tapped.

Hover must never be the only way to reach functionality. Row actions that appear on hover
need a keyboard-focus equivalent and a persistent alternative on touch.

### Focus-visible
The most important state and the most frequently deleted. Requirements:

- Use \`:focus-visible\`. Plain \`:focus\` fires on click, which is what drives people to
  remove the ring entirely.
- Never \`outline: none\` without a replacement in the same rule.
- Minimum 2px thick, with \`outline-offset: 2px\` so it does not merge with the border.
  \`outline\` follows \`border-radius\` in current browsers, so it needs no bespoke work.
- At least 3:1 contrast against *both* the control and the page behind it. A single
  hard-coded ring colour usually fails one of the two on some surface; a two-tone ring
  (light halo plus dark line) survives any background.
- The focused element must not be hidden behind sticky headers or footers. Add
  \`scroll-margin-top\` equal to the header height.
- Focus order must match visual order, and focus must be restored to the trigger when an
  overlay closes.

### Active (pressed)
Confirms the press landed, and must render within one frame regardless of what the click
starts. Use a small scale (0.97-0.99) or an inset shadow — a movement of 1px, not a
redesign. Because it is momentary, avoid transitioning *into* it; transition out of it.

### Disabled
Reduced opacity alone is a poor signal: it looks like a rendering artefact and often drops
text below 4.5:1. Prefer a distinctly flat surface, muted text, and \`cursor: not-allowed\`.

Two mechanisms, chosen deliberately:

- \`disabled\` — removes the element from the tab order and suppresses events. Use only when
  the control is genuinely inapplicable and does not need explaining.
- \`aria-disabled="true"\` — keeps the element focusable and discoverable while you suppress
  the action in the handler. Use whenever the user is likely to ask why.

Disabled state must always be explainable on demand. Nothing about grey conveys a reason.

### Loading
Applies to the element that triggered the work, not just the page. Requirements: preserve
the element's dimensions so nothing shifts; replace the label rather than adding to it;
block re-entry; set \`aria-busy="true"\`; announce the result in a live region on
completion, because a purely visual spinner is silent to screen readers.

### Selected / checked / pressed / expanded
Carry the corresponding ARIA state (\`aria-selected\`, \`aria-checked\`, \`aria-pressed\`,
\`aria-expanded\`) and make the visual difference stronger than hover — otherwise hovering an
unselected item looks identical to a selected one. Include a non-colour cue: a check, a
weight change, a left border.

### Error / invalid
A red border alone fails colour-blind users and says nothing about the cause. Pair the
colour with an icon and a text message, and set \`aria-invalid="true"\` plus
\`aria-describedby\` pointing at the message.

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
sluggish under rapid interaction. Transition only \`background-color\`, \`border-color\`,
\`color\`, \`opacity\`, \`box-shadow\`, and \`transform\`, and honour
\`prefers-reduced-motion: reduce\` by shortening rather than removing — state changes must
stay perceptible.

## Audit

For each interactive element, confirm:

1. Focus ring visible, on every background it can land on, at 3:1 or better
2. Hover gated behind \`@media (hover: hover)\`
3. Active state renders immediately on pointer-down
4. Disabled state explains itself somewhere
5. Loading state preserves dimensions and blocks re-entry
6. Selected state distinguishable from hover, without colour
7. Error state carries text, not just a border
8. Every visual state has an ARIA counterpart where one exists`,
      },
      {
        id: 'form-validation',
        title: 'Form validation patterns',
        answers:
          'When should each field be validated, how should errors be presented and announced, and how do I stop a form losing the user’s work?',
        content: `# Form validation patterns

Forms are where interaction design is tested hardest, because they combine input, latency,
failure, and the user's own data — which they will lose if you are careless.

## Timing: the three-phase rule

**Phase 1 — while typing (untouched field): say nothing.** A field the user has not
finished has not failed. Validating each keystroke produces "Enter a valid email" at the
second character, which is factually wrong and reads as nagging.

**Phase 2 — on blur: validate once.** The user has declared the field finished. This is the
first honest moment to judge it. \`:user-invalid\` implements exactly this natively:

\`\`\`css
input:user-invalid { border-color: var(--danger); }
input:user-invalid + .hint { color: var(--danger); }
\`\`\`

**Phase 3 — after a field has errored: re-validate on change.** Now feedback per keystroke
is helpful, because the user is actively repairing a known problem and wants to see the
error clear the moment it is fixed. Clear the error immediately on becoming valid; leaving
a stale error while the field is correct destroys trust in every other message.

Two exceptions justify live validation from the first keystroke: password-strength meters
(where the whole point is real-time guidance) and availability checks such as usernames
(debounced ~500ms, and always re-checked server-side).

## Presentation

Place the message adjacent to the field — below is conventional and survives zoom better
than beside. Reserve its vertical space in the layout so appearance does not push the rest
of the form down; a shifting form causes mis-clicks.

Message content is the same triad as any error: what is wrong, why, what to do. "Password
must be at least 12 characters" beats "Invalid password" because it is actionable. Where
format is constrained, show the expectation *before* the error — a hint under the field —
rather than punishing a guess.

Never rely on colour alone. Border colour plus icon plus text.

## Announcement

- \`aria-invalid="true"\` on the field while it is in error.
- \`aria-describedby\` on the field pointing at the message element's id — this makes the
  message part of the field's accessible description, so it is read when focus arrives.
  Keep hint and error ids both listed when both exist.
- On failed submit, render an **error summary** at the top of the form: a heading, a count,
  and a list of links, each jumping focus to the offending field. Move focus to the summary
  container after render. This is the only reliable way a screen-reader or magnifier user
  discovers that a long form failed, since the individual errors may be far off-screen.
- Announce asynchronous validation results in a polite live region; use \`role="alert"\`
  only for content that genuinely warrants interrupting.

## Server errors

Server-side validation is authoritative — client-side rules are a convenience layer and can
always be bypassed. Map server field errors back onto the fields that caused them rather
than dumping one banner. Preserve every value the user entered, including on a full page
reload. The single worst form failure is an error that also empties the form.

For failures with no field to attach to (network, 500), show a form-level message that
explains that the submission did not go through and that the data is still there.

## Browser cooperation

Correct \`autocomplete\` tokens let browsers and password managers fill fields, which reduces
input errors and is required by WCAG 2.2 SC 1.3.5 for fields collecting information about
the user. Use the standard token names: \`name\`, \`given-name\`, \`family-name\`, \`email\`,
\`tel\`, \`organization\`, \`street-address\`, \`address-line1\`, \`postal-code\`,
\`country-name\`, \`cc-number\`, \`cc-exp\`, \`username\`, \`current-password\`,
\`new-password\`, \`one-time-code\`. \`autocomplete="off"\` on a password or address field is
almost always a mistake; browsers increasingly ignore it, and it degrades security by
discouraging generated passwords.

Match the keyboard to the data: \`type="email"\`, \`type="tel"\`, \`type="url"\`,
\`inputmode="numeric"\` for digit strings such as verification codes (\`type="number"\` is the
wrong tool — it adds spinners, strips leading zeros, and scroll-wheel-changes values), and
\`enterkeyhint="next"\` or \`"send"\` so the on-screen return key is labelled usefully.

## Submission

1. Disable the submit control and set \`aria-busy\` on the form.
2. Guard the handler with an in-flight flag — the button's disabled state is a UI hint, not
   a lock, and double-submits arrive through Enter key repeats and re-taps.
3. Send an idempotency key with any request that creates or charges, so a retry after a
   timeout cannot produce a second record.
4. On success, either navigate or replace the form with a confirmation. Leaving a filled
   form on screen after success invites resubmission.
5. On failure, restore the button, keep every value, and focus the first problem.

## Structure that prevents errors

The cheapest validation is the input that cannot be wrong. Prefer a date picker with a
typed fallback over a free-text date. Split nothing that the user thinks of as one value
(phone numbers, card numbers) into multiple boxes. Accept spaces, hyphens, and parentheses
and normalise them yourself rather than rejecting them. Ask for the fewest fields that the
task requires — every optional field is an opportunity to fail.`,
      },
    ],
  },

  rules: [
    {
      id: 'interaction-design/focus-visible-required',
      strength: 'must',
      statement:
        'Give every interactive element a visible focus indicator using :focus-visible, and never write outline: none without a replacement indicator in the same rule.',
      evidence: {
        rationale:
          'The focus indicator is the only signal telling a keyboard user which element will receive their next keystroke. :focus-visible exists because :focus also fires on pointer clicks, and that unwanted ring is what motivates authors to remove the indicator entirely.',
        source: 'WCAG 2.2 Success Criterion 2.4.7 (Focus Visible)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.btn:focus { outline: none; }',
        good: '.btn:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }',
      },
      verifiedBy: 'state-matrix-audit',
    },
    {
      id: 'interaction-design/focus-ring-contrast',
      strength: 'must',
      statement:
        'Ensure the focus indicator reaches at least 3:1 contrast against both the control it surrounds and the background behind that control.',
      evidence: {
        rationale:
          'A focus ring is a non-text visual indicator, so it is only perceivable if it contrasts with what it sits against. A single fixed ring colour typically clears one of the two adjacent surfaces and fails the other, which is why two-tone rings are used.',
        source: 'WCAG 2.2 Success Criterion 1.4.11 (Non-text Contrast)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html',
        confidence: 'established',
      },
    },
    {
      id: 'interaction-design/no-hover-only-functionality',
      strength: 'must-not',
      statement:
        'Do not make any action reachable only by hovering; provide a keyboard-focus equivalent and a persistent or tap-revealed alternative for touch.',
      evidence: {
        rationale:
          'Touch devices have no hover state and keyboards cannot produce one, so hover-gated controls are simply absent for those input methods rather than merely harder to find.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.row-actions { opacity: 0 } .row:hover .row-actions { opacity: 1 }',
        good: '.row-actions { opacity: 0 } @media (hover: hover) { .row:hover .row-actions, .row:focus-within .row-actions { opacity: 1 } } @media (hover: none) { .row-actions { opacity: 1 } }',
      },
    },
    {
      id: 'interaction-design/affordance-without-colour',
      strength: 'must',
      statement:
        'Signal that an element is interactive through at least one non-colour channel such as an underline, border, surface, or shape.',
      evidence: {
        rationale:
          'Roughly 8% of men have a colour vision deficiency, so a control distinguished only by hue is indistinguishable from static content for a substantial minority. Shape and enclosure survive greyscale; hue does not.',
        source: 'WCAG 2.2 Success Criterion 1.4.1 (Use of Color)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html',
        confidence: 'established',
      },
    },
    {
      id: 'interaction-design/no-false-affordance',
      strength: 'should-not',
      statement:
        'Do not give non-interactive elements interactive signifiers such as hover elevation, pointer cursors, or link styling.',
      evidence: {
        rationale:
          'Affordance cues are learned as a contract. A click that produces nothing teaches the user that the cue is unreliable, which degrades their willingness to interact with every genuinely interactive element on the page.',
        confidence: 'strong',
      },
    },
    {
      id: 'interaction-design/acknowledge-within-100ms',
      strength: 'must',
      statement:
        'Acknowledge every user action visually within about 100ms, independently of how long the underlying work takes.',
      evidence: {
        rationale:
          'Responses under roughly 100ms are perceived as caused by the user’s own action; beyond that the causal link weakens and the user starts to suspect the input was not registered, which produces repeat clicks.',
        source: 'Miller, "Response time in man-computer conversational transactions", AFIPS 1968',
        confidence: 'established',
      },
      verifiedBy: 'latency-audit',
    },
    {
      id: 'interaction-design/progress-past-one-second',
      strength: 'should',
      statement:
        'Show determinate progress rather than an indeterminate spinner for any operation expected to exceed one second, and move work expected to exceed ten seconds into the background.',
      evidence: {
        rationale:
          'Around one second the user’s train of thought breaks and they begin deciding whether to wait. An indeterminate spinner supplies no information on which to base that decision, whereas a percentage or step count does.',
        confidence: 'strong',
      },
      exceptions: [
        'Operations whose total work is genuinely unknowable, where an elapsed-time or step label is the best available substitute.',
      ],
    },
    {
      id: 'interaction-design/spinner-hysteresis',
      strength: 'should',
      statement:
        'Delay any loading indicator by roughly 300ms and keep it visible for at least roughly 500ms once shown.',
      evidence: {
        rationale:
          'A response that arrives in 150ms renders and unrenders the indicator faster than the eye can resolve it, producing a flash that reads as a rendering fault. Hysteresis converts fast responses into no indicator at all, which is what "instant" should look like.',
        confidence: 'strong',
      },
    },
    {
      id: 'interaction-design/skeleton-matches-layout',
      strength: 'must',
      statement:
        'Ensure a skeleton placeholder matches the dimensions and structure of the content that will replace it.',
      evidence: {
        rationale:
          'The only benefit a skeleton provides over a spinner is reserving the final layout. A mismatched skeleton removes that benefit and adds a layout shift precisely when the user has begun reading, which is the most disruptive possible moment.',
        confidence: 'established',
      },
      verifiedBy: 'latency-audit',
    },
    {
      id: 'interaction-design/optimistic-only-when-reversible',
      strength: 'should-not',
      statement:
        'Do not apply optimistic UI to operations whose failure is plausible, whose true result differs from the predicted one, or which the user would act upon irreversibly.',
      evidence: {
        rationale:
          'Optimistic rendering asserts an outcome the system has not verified. Where the assertion can be wrong and the user acts on it — payments, submissions, confirmations — the interface has published a falsehood that the later correction cannot undo.',
        confidence: 'strong',
      },
      examples: {
        language: 'tsx',
        bad: 'setStatus("Payment complete"); await charge(card)',
        good: 'setStatus("Processing…"); const r = await charge(card); setStatus(r.ok ? "Payment complete" : r.message)',
      },
    },
    {
      id: 'interaction-design/optimistic-needs-rollback',
      strength: 'must',
      statement:
        'Pair every optimistic update with a rollback path that reverts the visual state, reports the failure, and preserves any data the user entered.',
      evidence: {
        rationale:
          'An optimistic update is a prediction. Without an explicit rollback the interface retains a state the server never accepted, so the user believes work is saved that does not exist — a silent data-loss bug rather than a visible error.',
        confidence: 'established',
      },
    },
    {
      id: 'interaction-design/undo-over-confirmation',
      strength: 'should',
      statement:
        'Offer undo for a 5-10 second window instead of a confirmation dialog for any destructive action that can be reversed.',
      evidence: {
        rationale:
          'A confirmation taxes every correct invocation to catch a rare incorrect one, and its frequency trains reflexive dismissal, so it stops being read before it is ever needed. Undo moves the cost onto the rare mistake instead of the common success.',
        confidence: 'strong',
      },
      exceptions: [
        'Actions with irreversible external side effects, such as sending an email that has already left, or permanently destroying data with no soft-delete window.',
      ],
    },
    {
      id: 'interaction-design/confirm-irreversible-with-effort',
      strength: 'must',
      statement:
        'Require an effortful confirmation, such as typing the resource name, for genuinely irreversible actions, and state the concrete consequences rather than asking "Are you sure?".',
      evidence: {
        rationale:
          'A single-click confirmation is defeated by the same reflex that caused the original mis-click, since both are satisfied by clicking in roughly the same place. Typing a name cannot be performed reflexively, so it forces the user to re-read what is being destroyed.',
        confidence: 'strong',
      },
      verifiedBy: 'destructive-action-audit',
    },
    {
      id: 'interaction-design/no-disabled-submit',
      strength: 'should-not',
      statement:
        'Do not disable a form’s primary submit button to indicate that the form is incomplete or invalid; allow the submission, then explain the failure.',
      evidence: {
        rationale:
          'The disabled attribute removes the element from the tab order and suppresses events, so a keyboard user cannot reach it and no user receives any explanation. The click is the user asking why they cannot proceed, and disabling it refuses to answer.',
        confidence: 'strong',
      },
      exceptions: [
        'Suppressing re-submission while a submission is in flight, where the reason is already visible in the button itself.',
      ],
      examples: {
        language: 'tsx',
        bad: '<button type="submit" disabled={!isValid}>Create account</button>',
        good: '<button type="submit" aria-busy={submitting}>Create account</button> // validate on submit, focus first invalid field',
      },
      verifiedBy: 'form-validation-audit',
    },
    {
      id: 'interaction-design/disabled-must-explain',
      strength: 'must',
      statement:
        'Make the reason for any disabled control discoverable, using aria-disabled with an explanation rather than the disabled attribute when the user is likely to ask why.',
      evidence: {
        rationale:
          'Reduced opacity encodes only that the control is inert, not why. Because the native disabled attribute also strips focusability and pointer events, the control cannot even be hovered or tabbed to in order to surface a tooltip.',
        confidence: 'strong',
      },
    },
    {
      id: 'interaction-design/actionable-errors',
      strength: 'must',
      statement:
        'State what failed, why it failed, and what the user should do next in every error message.',
      evidence: {
        rationale:
          'An error message exists to restore the user’s ability to proceed. A message lacking the recovery step ends the interaction at the failure, which converts a recoverable problem into an abandoned task.',
        source: 'WCAG 2.2 Success Criterion 3.3.3 (Error Suggestion)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Something went wrong.',
        good: 'We could not save your changes because the connection dropped. Your edits are still here — press Save to try again.',
      },
      verifiedBy: 'error-quality-audit',
    },
    {
      id: 'interaction-design/no-generic-failure',
      strength: 'must-not',
      statement:
        'Do not ship "Something went wrong" or equivalent as the complete text of a user-facing error.',
      evidence: {
        rationale:
          'Such a message conveys only that the interface is aware of a problem. It distinguishes no cause, suggests no remedy, and cannot be reported usefully to support, so it costs the user attention while giving them nothing to act on.',
        confidence: 'strong',
      },
      exceptions: [
        'Genuinely unclassifiable failures, which still need a correlation id and a stated next step such as retrying or contacting support.',
      ],
    },
    {
      id: 'interaction-design/validate-on-blur',
      strength: 'must',
      statement:
        'Validate a form field on blur rather than on every keystroke, and only then re-validate on change while it remains in error.',
      evidence: {
        rationale:
          'A partially typed value is not an invalid value, so keystroke validation reports failures that are merely incomplete. Once the user is repairing a known error, per-keystroke feedback becomes correct because it confirms the fix the moment it lands.',
        confidence: 'strong',
      },
      exceptions: [
        'Password-strength meters and debounced availability checks, where continuous feedback is the feature.',
      ],
      examples: {
        language: 'css',
        bad: 'input:invalid { border-color: red }',
        good: 'input:user-invalid { border-color: var(--danger) }',
      },
      verifiedBy: 'form-validation-audit',
    },
    {
      id: 'interaction-design/error-summary-and-association',
      strength: 'must',
      statement:
        'Associate each field error with its field via aria-describedby and aria-invalid, and on failed submit render a focusable error summary linking to every invalid field.',
      evidence: {
        rationale:
          'A screen-reader or magnifier user perceives only a small region at a time, so individual inline errors placed further down a long form are never discovered. The summary is the only mechanism that reports the failure at the point of submission.',
        source: 'WCAG 2.2 Success Criterion 3.3.1 (Error Identification)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html',
        confidence: 'established',
      },
    },
    {
      id: 'interaction-design/autocomplete-tokens',
      strength: 'must',
      statement:
        'Set standard autocomplete tokens on every field collecting information about the user, and do not use autocomplete="off" on address, payment, or password fields.',
      evidence: {
        rationale:
          'Autofill removes the largest single source of typing errors and lets password managers generate credentials. The tokens are also the only machine-readable statement of a field’s purpose, which assistive technology uses to relabel fields for users with cognitive disabilities.',
        source: 'WCAG 2.2 Success Criterion 1.3.5 (Identify Input Purpose)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<input name="e" type="text" autocomplete="off">',
        good: '<input name="email" type="email" autocomplete="email" enterkeyhint="next">',
      },
    },
    {
      id: 'interaction-design/input-mode-matches-data',
      strength: 'should',
      statement:
        'Set type and inputmode so the virtual keyboard matches the expected data, and use inputmode="numeric" rather than type="number" for digit strings such as codes and postcodes.',
      evidence: {
        rationale:
          'type="number" applies numeric semantics that are wrong for identifiers: it strips leading zeros, mutates values on scroll wheel, and renders spinner controls. inputmode changes only the keyboard, which is the part that actually needs changing.',
        confidence: 'established',
      },
    },
    {
      id: 'interaction-design/preserve-user-input',
      strength: 'must',
      statement:
        'Preserve every value the user entered across a failed submission, including after a full page reload, and never clear a field because it was invalid.',
      evidence: {
        rationale:
          'Re-entering data is the highest-cost recovery action a form can demand, and it is imposed at the moment the user is already frustrated by the failure. Clearing input converts a correctable error into an abandonment.',
        source: 'WCAG 2.2 Success Criterion 3.3.7 (Redundant Entry)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html',
        confidence: 'established',
      },
    },
    {
      id: 'interaction-design/prevent-double-submit',
      strength: 'must',
      statement:
        'Guard submissions with an in-flight flag in the handler as well as a disabled control, and send an idempotency key on any request that creates or charges.',
      evidence: {
        rationale:
          'A disabled attribute is applied after the handler runs and can be bypassed by Enter key repeat or a re-tap during the network round trip. Only a server-side idempotency key prevents a retried request from producing a duplicate record.',
        confidence: 'established',
      },
      verifiedBy: 'form-validation-audit',
    },
    {
      id: 'interaction-design/hit-target-size',
      strength: 'must',
      statement:
        'Give every interactive target at least 24x24 CSS pixels of hit area, and at least 44x44 on touch, expanding the target with padding or a pseudo-element rather than enlarging the visual.',
      evidence: {
        rationale:
          'A fingertip contact patch is around 8-10mm, so targets below roughly 44px on touch are hit by estimation rather than by aim. Expanding the hit area independently of the visual keeps small icon buttons visually small while making them reliably tappable.',
        source: 'WCAG 2.2 Success Criterion 2.5.8 (Target Size (Minimum))',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
        confidence: 'established',
      },
    },
    {
      id: 'interaction-design/drag-has-alternative',
      strength: 'must',
      statement:
        'Provide a single-pointer and keyboard alternative for every action achievable by dragging, such as move controls, a "move to" menu, or cut-and-paste semantics.',
      evidence: {
        rationale:
          'Dragging requires sustained precise pointer control while a button is held, which is not available to keyboard users, screen-reader users, or people with tremor or limited dexterity. The alternative must exist because the interaction cannot be adapted.',
        source: 'WCAG 2.2 Success Criterion 2.5.7 (Dragging Movements)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html',
        confidence: 'established',
      },
      verifiedBy: 'pointer-parity-audit',
    },
    {
      id: 'interaction-design/announce-async-state',
      strength: 'should',
      statement:
        'Announce asynchronous state changes to assistive technology with aria-busy during the wait and a polite live region on completion.',
      evidence: {
        rationale:
          'A spinner and a rendered result are purely visual events. Without a live region a screen-reader user receives no notification that the operation finished, so they cannot tell a slow response from a completed one.',
        confidence: 'established',
      },
      exceptions: [
        'Changes that move focus to the new content, which are announced by the focus change itself.',
      ],
    },
  ],

  verification: [
    {
      id: 'state-matrix-audit',
      kind: 'self-review',
      description: 'Confirm every interactive element has a complete, composable state matrix.',
      blocking: true,
      questions: [
        'For each interactive element, which of rest, hover, focus-visible, active, disabled, loading, selected, error, and read-only apply, and is each one styled?',
        'Is the focus indicator produced by :focus-visible, at least 2px, offset from the border, and legible against every background it can land on?',
        'Is hover styling gated behind @media (hover: hover), and does every hover-revealed control have a keyboard and touch equivalent?',
        'Does the selected state remain the dominant signal when the element is also hovered, and is it distinguishable without colour?',
      ],
    },
    {
      id: 'latency-audit',
      kind: 'self-review',
      description: 'Confirm feedback timing matches the duration of the work.',
      blocking: true,
      questions: [
        'Does every action render a press or busy state within one frame of the pointer going down, regardless of request duration?',
        'Are loading indicators delayed by roughly 300ms and held for roughly 500ms once shown?',
        'For operations that may exceed one second, is progress determinate rather than an indeterminate spinner?',
        'Does every skeleton match the dimensions and line count of the content that replaces it, and does the swap produce zero layout shift?',
      ],
    },
    {
      id: 'form-validation-audit',
      kind: 'self-review',
      description: 'Confirm form validation, submission, and recovery behave correctly.',
      blocking: true,
      questions: [
        'Does validation fire on blur rather than on every keystroke, and does it re-validate on change only once a field has already errored?',
        'Is the submit button operable at all times except while a submission is in flight?',
        'Does every error carry aria-invalid and aria-describedby, and does a failed submit render a focusable summary linking to each invalid field?',
        'Do all entered values survive a failed submission and a page reload?',
        'Is the submit handler guarded by an in-flight flag, and does any creating request carry an idempotency key?',
        'Does every field have the correct autocomplete token, type, and inputmode?',
      ],
    },
    {
      id: 'destructive-action-audit',
      kind: 'self-review',
      description: 'Confirm destructive actions are recoverable or deliberately effortful.',
      blocking: true,
      questions: [
        'For each destructive action, is it reversible? If so, does it use undo with a 5-10 second window instead of a confirmation dialog?',
        'If it is genuinely irreversible, does the confirmation require an effortful step such as typing the resource name?',
        'Does the confirmation state the concrete consequences, including counts of what will be destroyed, rather than asking "Are you sure?"',
      ],
    },
    {
      id: 'error-quality-audit',
      kind: 'self-review',
      description: 'Confirm error messages restore the user’s ability to proceed.',
      blocking: true,
      questions: [
        'Does every user-facing error state what happened, why, and what to do next?',
        'Is there any message whose complete text is "Something went wrong" or equivalent?',
        'Is any raw exception text, stack trace, or status code shown as the primary message?',
        'For unclassifiable failures, is a correlation id available and a next step stated?',
      ],
    },
    {
      id: 'pointer-parity-audit',
      kind: 'self-review',
      description: 'Confirm every interaction is available to every input method.',
      questions: [
        'Does every drag interaction have a click-only and keyboard-only alternative?',
        'Is every interactive target at least 24x24 CSS pixels, and at least 44x44 at touch widths?',
        'Can the entire flow be completed with the keyboard alone, with focus visible at every stop?',
        'Does any functionality depend on hover, long-press, or a multi-point gesture without an alternative?',
      ],
    },
  ],

  relatedSkills: ['design-judgment', 'accessible-components', 'motion-design', 'forms-and-inputs'],
}
