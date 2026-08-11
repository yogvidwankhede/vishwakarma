# Form validation patterns

Forms are where interaction design is tested hardest, because they combine input, latency,
failure, and the user's own data — which they will lose if you are careless.

## Timing: the three-phase rule

**Phase 1 — while typing (untouched field): say nothing.** A field the user has not
finished has not failed. Validating each keystroke produces "Enter a valid email" at the
second character, which is factually wrong and reads as nagging.

**Phase 2 — on blur: validate once.** The user has declared the field finished. This is the
first honest moment to judge it. `:user-invalid` implements exactly this natively:

```css
input:user-invalid { border-color: var(--danger); }
input:user-invalid + .hint { color: var(--danger); }
```

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

- `aria-invalid="true"` on the field while it is in error.
- `aria-describedby` on the field pointing at the message element's id — this makes the
  message part of the field's accessible description, so it is read when focus arrives.
  Keep hint and error ids both listed when both exist.
- On failed submit, render an **error summary** at the top of the form: a heading, a count,
  and a list of links, each jumping focus to the offending field. Move focus to the summary
  container after render. This is the only reliable way a screen-reader or magnifier user
  discovers that a long form failed, since the individual errors may be far off-screen.
- Announce asynchronous validation results in a polite live region; use `role="alert"`
  only for content that genuinely warrants interrupting.

## Server errors

Server-side validation is authoritative — client-side rules are a convenience layer and can
always be bypassed. Map server field errors back onto the fields that caused them rather
than dumping one banner. Preserve every value the user entered, including on a full page
reload. The single worst form failure is an error that also empties the form.

For failures with no field to attach to (network, 500), show a form-level message that
explains that the submission did not go through and that the data is still there.

## Browser cooperation

Correct `autocomplete` tokens let browsers and password managers fill fields, which reduces
input errors and is required by WCAG 2.2 SC 1.3.5 for fields collecting information about
the user. Use the standard token names: `name`, `given-name`, `family-name`, `email`,
`tel`, `organization`, `street-address`, `address-line1`, `postal-code`,
`country-name`, `cc-number`, `cc-exp`, `username`, `current-password`,
`new-password`, `one-time-code`. `autocomplete="off"` on a password or address field is
almost always a mistake; browsers increasingly ignore it, and it degrades security by
discouraging generated passwords.

Match the keyboard to the data: `type="email"`, `type="tel"`, `type="url"`,
`inputmode="numeric"` for digit strings such as verification codes (`type="number"` is the
wrong tool — it adds spinners, strips leading zeros, and scroll-wheel-changes values), and
`enterkeyhint="next"` or `"send"` so the on-screen return key is labelled usefully.

## Submission

1. Disable the submit control and set `aria-busy` on the form.
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
task requires — every optional field is an opportunity to fail.
