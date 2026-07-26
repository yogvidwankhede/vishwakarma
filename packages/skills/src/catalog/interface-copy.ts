// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Microcopy is the highest-leverage, least-owned surface in most products.
 *
 * A button label is read by every single user who reaches that screen, and it is usually
 * written by whoever happened to be in the file. The result is an interface where the
 * visual design was argued over for a week and the words were typed in eleven seconds:
 * "Submit", "Oops! Something went wrong", "No data", "Are you sure?".
 *
 * Each of those is a specific, diagnosable failure with a specific repair, and this skill
 * names them. Copy is where the product stops being a picture and starts being a
 * conversation, and a conversation conducted entirely in "OK" and "Error" is not one the
 * user enjoys having.
 */
export const interfaceCopy: SkillManifest = {
  vsm: '1.0',
  id: 'interface-copy',
  name: 'Interface Copy',
  description:
    'Use when writing or reviewing any user-facing words — button labels, errors, empty states, dialogs, tooltips, form hints, or accessible names.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'content',
  tags: ['microcopy', 'ux-writing', 'content-design', 'errors', 'empty-states', 'i18n', 'a11y'],

  activation: {
    intents: [
      'writing or changing button labels, menu items, or link text',
      'writing an error, warning, validation, or failure message',
      'designing an empty state, zero-state, or first-run screen',
      'writing a confirmation or destructive-action dialog',
      'formatting dates, times, counts, or units for display',
      'the user says the wording feels off, robotic, cutesy, or unclear',
      'adding aria-label, alt text, or any accessible name',
    ],
    globs: [
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/locales/**/*.json',
      '**/i18n/**/*',
      '**/messages/**/*.json',
    ],
    keywords: [
      'copy',
      'microcopy',
      'label',
      'wording',
      'error message',
      'empty state',
      'tooltip',
      'placeholder',
      'aria-label',
    ],
  },

  content: {
    summary:
      'Write interface words as a design surface: labels that name the outcome, errors that name the cause and the next action, empty states that teach, and formatting that survives translation and screen readers.',

    body: `# Interface Copy

Words are the only part of an interface the user reads literally; everything else is
inferred. A wrong word therefore does more damage than a wrong margin, and faster: nobody
has to squint to notice that "Submit" says nothing about what will happen.

Every string answers a question the user is already asking. A button answers "what happens
if I press this?" An error answers "what broke and what do I do now?" An empty state
answers "is this broken, or have I not started?" Copy that does not answer its question is
decoration, and decoration made of text is read before it is found worthless.

---

## 1. Voice is constant, register moves

The product should sound recognisably itself everywhere, but register must change —
expansive on a landing page, terse and factual in a disk-quota warning. Register is set by
how much attention the user has and how much is at stake.

Low stakes — a toast, a menu item — want the fewest possible words. High stakes — deleting a
workspace, entering card details — want precision and a slower rhythm, and this is where
playfulness becomes offensive. Marketing voice in a settings screen is the commonest
register failure: a user three levels deep in billing is working, not browsing, and "Let's
get you set up!" reads as a colleague interrupting.

Default for product UI: second person, present tense, active voice.

---

## 2. Buttons name the outcome

A button label should be the verb phrase the user would use to describe what they just did.
"Submit" describes what the form does to the server; "Create account", "Send invite",
"Delete 4 files" describe what the user gets.

This matters most in dialogs, where the eye reaches the buttons before the prose. Buttons
reading "OK" and "Cancel" force a re-read to work out which one destroys data — and "Cancel"
is catastrophically ambiguous when the action is itself a cancellation ("Cancel
subscription?" / "Cancel"). Label the buttons with outcomes and the prose becomes optional:
"Keep subscription" and "Cancel subscription" need no explanation. Match the heading's verb:
if the dialog asks "Discard changes?", the button says "Discard", not "Yes".

---

## 3. Errors: cause, then next action

A useful error has three parts and most shipped errors have none: what happened, why, and
what to do next. The user needs neither the stack trace nor an apology. "Something went
wrong" fails because it is true of every possible failure; "Invalid input" fails because it
names a verdict rather than a cause.

- Bad: \`Error: Invalid email.\` Good: \`This email address is missing an @ symbol.\`
- Bad: \`Oops! Something went wrong.\` Good: \`We couldn't save your changes — the server didn't respond. Your draft is stored locally, so try again in a moment.\`

Never blame the user: "You entered an invalid date" and "Choose a date on or after today"
say the same thing, and only one is an accusation. Reserve apology for genuine service
failures, so it still means something when used.

---

## 4. Empty states are the first lesson

The empty state is seen by every new user and is usually the least-considered screen in the
product. "No items" wastes the best teaching moment available.

Use three parts in order: **what belongs here**, **why it is useful**, **one action**. "No
saved views yet" plus "Saved views keep a filter and sort order so you can return in one
click" plus a single "Create saved view" button turns a dead end into onboarding. One action
only; four equal options reproduce the paralysis the state exists to resolve.

Distinguish the three empties that look identical: never had data, filtered to nothing, and
failed to load. The second needs "Clear filters", not "Create your first item"; the third
needs "Retry", and rendering it as an empty list tells the user their data is gone.

---

## 5. Confirmations state consequences

"Are you sure?" moves the burden of understanding onto the user at the moment they are least
able to carry it. It tests confidence, not comprehension, and is dismissed reflexively.

State the irreversible part instead: "Delete 12 files permanently? They can't be recovered."
Name the object and the count — "Delete project" is weaker than "Delete Acme Redesign and
its 40 tasks" — and say when something *is* reversible, because most confirmation anxiety is
uncertainty about reversibility. Better still, for reversible actions drop the dialog and
offer undo; a confirmation taxes the common case to guard against the rare one.

---

## 6. Tone failures with names

**Exclamation marks** perform an enthusiasm the reader does not feel, and in a failure
message they are hostile: "Something went wrong!" is cheerful about your data loss.
**"Oops", "Whoops", "Uh-oh"** signal that the system finds its own failure charming.
**Mock-cheerful failure** ("our hamsters need a break") carries no diagnostic content and
cannot be searched for in a support forum. **Jargon leaking upward** — "null reference",
"422", "token expired" — is implementation vocabulary; translate it: "Your session ended.
Sign in to continue."

---

## 7. Mechanics to decide once

**Case.** Sentence case ("Save changes") or title case ("Save Changes") — pick one for every
button, heading, tab, and menu item. Sentence case is safer: title case has no agreed rule
set across English variants, so a codebase using it drifts within weeks.

**Numerals.** Digits, not words: "3 files". A non-breaking space between value and unit
("24 MB") so they never wrap apart. Format with \`Intl.NumberFormat\`.

**Time.** Relative time ("3 minutes ago") is right when recency is the point and precision is
not. Absolute time is right when the moment may be referenced, compared, or reported — audit
logs, receipts, scheduled events — and relative time decays, so "2 years ago" is worse than
the date. Ship relative text inside \`<time datetime="2026-07-25T10:00:00Z">\` with the
absolute value on hover.

**Plurals.** Never "1 items", never "item(s)". English has two plural forms, Arabic six and
Polish four, and the form is chosen by the numeral itself, so appending an \`s\` is a bug, not
a shortcut. Use \`Intl.PluralRules\` or ICU syntax, and write the zero case as its own branch:
"No results" beats "0 results" — zero reports absence, not quantity.

---

## 8. Truncation, placeholders, translation

Truncate where the information stops being useful and keep the full value reachable:
filenames truncate in the middle so the extension survives ("annual-report…-final.pdf"),
sentences truncate at the end, and any value the user must act on needs the whole string
exposed on hover, focus, or in a detail view.

Placeholder text is not a label. It disappears on focus, so the field's name vanishes exactly
while it is being filled, it usually fails contrast, and it is not a reliable accessible
name. Ship a visible \`<label>\`; let the placeholder carry only a format example.

Copy-driven layout needs headroom. German running text averages roughly 30% longer than
English and short labels can more than double, so never size a button to its English string.
Use logical properties (\`padding-inline\`, \`text-align: start\`) so right-to-left locales
mirror correctly, and remember that RTL flips more than text: icon order, progress direction,
back arrows and slider polarity mirror, while clocks and numerals do not.

---

## 9. The accessible name is copy

Screen reader and voice control users hear the accessible name, not the pixels. For a button
it resolves from \`aria-labelledby\`, then \`aria-label\`, then text content — and \`aria-label\`
silently overrides visible text.

That override is where copy breaks accessibility. A button reading "Save" with
\`aria-label="Submit form"\` cannot be operated by a voice user saying "click Save", because
the utterance is matched against the accessible name. WCAG 2.2 SC 2.5.3 (Label in Name)
requires the accessible name to contain the visible label: a name may *extend* the visible
text but must never replace it.

Link text must stand alone, because screen reader users navigate by listing every link with
its context stripped. Eleven "Read more" links produce eleven identical entries. Write the
destination in: "Read the migration guide".

---

## 10. Before shipping

Search for \`lorem\`, \`ipsum\`, \`TODO\`, \`asdf\`, \`Oops\`, and \`!\` in message strings. Placeholder
copy reaching production is not a rare accident — it occupies the right shape, so it survives
visual review and is caught only by a string search.`,

    references: [
      {
        id: 'copy-rewrites',
        title: 'Before and after: rewrites across common UI situations',
        answers:
          'I have a specific bad string — a button, error, empty state, dialog, tooltip, or notification — what does the corrected version look like and why?',
        content: `# Before and after

Each pair changes the copy only. The lesson is in the delta.

## Buttons and actions

| Before | After | Why |
| --- | --- | --- |
| \`Submit\` | \`Create account\` | Names the outcome the user wants, not the transport verb. |
| \`OK\` | \`Delete file\` | "OK" acknowledges the dialog; the label should commit to the act. |
| \`Yes\` / \`No\` | \`Discard\` / \`Keep editing\` | Yes/No requires re-reading the question to decode. |
| \`Cancel\` (on "Cancel subscription?") | \`Keep subscription\` | "Cancel" is ambiguous when cancelling is the action. |
| \`Save\` (on a settings page with no unsaved state) | \`Save changes\` | Distinguishes the act from the state. |
| \`Learn more\` | \`See pricing details\` | Link text must be meaningful out of context. |
| \`Continue\` | \`Continue to payment\` | Says where the step leads, reducing abandonment. |
| \`Upload\` | \`Choose a file\` then \`Upload 3 files\` | Label reflects the actual current operation and its count. |

## Errors

**Bad:** \`Error: Something went wrong. Please try again.\`
**Good:** \`We couldn't load your projects — the request timed out. Refresh to try again.\`
Names the failing operation and the cause, and gives a concrete recovery.

**Bad:** \`Invalid password.\`
**Good:** \`Passwords need at least 12 characters. Yours has 8.\`
States the rule and the gap, rather than a verdict.

**Bad:** \`You entered an invalid date.\`
**Good:** \`Choose a date on or after today.\`
Removes the accusation and states the constraint as a positive instruction.

**Bad:** \`Oops! 500 Internal Server Error\`
**Good:** \`Something failed on our side while saving. Your work is still here — try again, or copy your text somewhere safe if it keeps failing.\`
Removes the mock-cheer and the status code, reassures about data, offers a fallback.

**Bad:** \`Sync conflict: local revision 42 diverges from remote revision 47.\`
**Good:** \`This page changed on another device. Keep your version, or load the newer one?\`
Translates implementation vocabulary into the user's model.

**Bad:** \`Field required\`
**Good:** \`Enter a billing email so we can send receipts.\`
Says which field, and why it is being asked for.

**Bad:** \`Upload failed.\`
**Good:** \`report.pdf is 24 MB. The limit is 10 MB.\`
Names the object, the measured value, and the threshold.

## Empty states

**Bad:** \`No data\`
**Good:**
Heading: \`No saved views yet\`
Body: \`Saved views keep a filter and sort order so you can return to them in one click.\`
Action: \`Create saved view\`

**Bad (after filtering):** \`No results found. Create your first item.\`
**Good:** \`No tasks match "overdue" in this project.\` with \`Clear filters\`.
The filtered empty and the never-had-data empty need different actions.

**Bad (load failure shown as empty):** \`No messages\`
**Good:** \`We couldn't load your messages.\` with \`Retry\`.
Presenting a failure as an empty state teaches users the product loses their data.

## Confirmations

**Bad:** \`Are you sure?\` / \`Yes\` / \`No\`
**Good:** Heading \`Delete Acme Redesign?\` Body \`This removes the project and its 40 tasks for everyone. It can't be undone.\` Buttons \`Delete project\` / \`Keep project\`.

**Bad:** \`Are you sure you want to leave? Changes you made may not be saved.\`
**Good:** \`You have 3 unsaved changes. Save them before leaving?\` with \`Save and leave\` / \`Discard and leave\` / \`Stay\`.

**Reversible action:** remove the dialog entirely. Archive the item and show
\`Archived "Q3 planning". Undo\` for a few seconds. Undo beats confirmation because it costs
nothing in the common case.

## Notifications and status

| Before | After |
| --- | --- |
| \`Success!\` | \`Invite sent to dana@example.com\` |
| \`Saved!\` | \`Saved\` (no exclamation; the toast already signals the event) |
| \`Processing...\` | \`Converting 3 of 12 files\` |
| \`Loading\` | \`Loading your invoices\` |
| \`An update is available!\` | \`Version 4.2 is ready. Restart to install.\` |

## Form hints and labels

**Bad:** placeholder-only \`Email\` in the field, no label.
**Good:** visible label \`Work email\`, placeholder \`name@company.com\`, hint below:
\`We'll only use this for account notices.\`

**Bad:** \`Name*\` with \`* required\` at the bottom.
**Good:** mark the *optional* fields — \`Company (optional)\` — when most are required. The
asterisk convention needs a legend and reads poorly aloud.

## Register mismatches

**Bad, in billing settings:** \`Ready to supercharge your workflow? 🚀\`
**Good:** \`Your plan renews on 12 August 2026.\`

**Bad, in a destructive dialog:** \`Yikes! This is a big one.\`
**Good:** \`This deletes 1,204 records across 3 workspaces.\`

**Bad, in a marketing hero:** \`Data management platform.\`
**Good:** the marketing surface is where enthusiasm belongs — it is the only place register
may expand.

## Numbers, units, and time

| Before | After |
| --- | --- |
| \`three items selected\` | \`3 items selected\` |
| \`1 items\` / \`0 items\` | \`1 item\` / \`No items\` |
| \`item(s)\` | resolve with plural rules at render time |
| \`24MB\` | \`24 MB\` with a non-breaking space |
| \`Last updated 2024-03-04T09:12:33Z\` | \`Updated 3 minutes ago\`, with the full timestamp on hover |
| \`Updated 2 years ago\` (audit log) | \`Updated 4 March 2024\` |
| \`$1234.5\` | \`$1,234.50\` via \`Intl.NumberFormat\` |
`,
      },
      {
        id: 'accessible-naming',
        title: 'Accessible names, alt text, and voice control',
        answers:
          'How do I write aria-label, alt text, and link text so screen reader and voice control users get the same information as sighted users?',
        content: `# Accessible names

## How the name is computed

For most interactive elements the accessible name is resolved in this order, first match
winning:

1. \`aria-labelledby\` (concatenates the referenced elements' text)
2. \`aria-label\`
3. The element's own content — button text, link text, \`alt\` on an image inside it
4. \`title\` (a weak last resort; not announced by every combination)

Two consequences follow. First, \`aria-label\` silently discards visible text, so it is the
easiest way to make the interface say two different things at once. Second, an icon-only
button with no name at all is announced as just "button", which is a dead end.

## The Label in Name rule

WCAG 2.2 SC 2.5.3 requires that where a control has visible label text, the accessible name
contains that text. The mechanism is voice control: a user saying "click Save" has their
utterance matched against the accessible name, not the pixels. If the name is "Submit form"
the command fails silently, and the user has no way to discover why.

\`\`\`html
<!-- Broken: voice command "click Save" does not match -->
<button aria-label="Submit form">Save</button>

<!-- Broken: word order differs; some matchers still fail -->
<button aria-label="Draft save">Save draft</button>

<!-- Correct: the name extends the visible text, in order -->
<button aria-label="Save draft to your workspace">Save draft</button>

<!-- Usually best: no aria-label at all -->
<button>Save draft</button>
\`\`\`

The practical rule: if there is visible text, do not add \`aria-label\`. Reach for it only
when there is no visible text, or when the visible text is genuinely insufficient and the
extended name still begins with it.

## Icon-only controls

\`\`\`html
<!-- Announced as "button" -->
<button><TrashIcon /></button>

<!-- Named, and the icon hidden from the tree so it is not announced twice -->
<button aria-label="Delete invoice">
  <TrashIcon aria-hidden="true" />
</button>
\`\`\`

Name the action, not the icon. "Trash" describes the picture; "Delete invoice" describes
the outcome. Where the object matters and repeats — a delete button per table row — include
it: "Delete invoice INV-1042". Twelve buttons all named "Delete" are indistinguishable in a
screen reader's element list.

## Link text

Screen reader users commonly navigate by listing every link on a page, stripped of
surrounding context. WCAG 2.4.4 (Link Purpose, in Context) is the Level A floor; writing
links that stand alone satisfies the stricter 2.4.9 and is simply better copy.

- Bad: \`To migrate, click here.\`
- Good: \`Read the migration guide.\`
- Bad: five cards each ending \`Read more\`
- Good: \`Read more about pricing\`, or keep the visible "Read more" and extend the name:
  \`<a aria-label="Read more about pricing">Read more</a>\` — the visible text is preserved
  and leads the name, so 2.5.3 still holds.

Never write "link" into link text; the role is already announced.

## Alt text

Alt text is a substitute, not a description. Ask what the image is doing in the page.

- Informative image: state the information. \`Revenue rose from 2.1M in Q1 to 3.4M in Q3.\`
  Not \`Chart\`.
- Functional image (inside a link or button): describe the destination or action, not the
  picture. A logo linking home is \`alt="Acme home"\`, not \`alt="Acme logo"\`.
- Decorative image: \`alt=""\` — empty, present, not omitted. A missing \`alt\` attribute
  makes some screen readers announce the filename.
- Text in an image: reproduce the text exactly.

Do not begin with "Image of" or "Photo of"; the role is announced already. Keep it under
roughly 150 characters and move anything longer into visible body copy or a caption, which
benefits everyone.

## Names for structure

- Multiple \`<nav>\` landmarks need \`aria-label\` to distinguish them ("Primary",
  "Breadcrumb", "Footer"). Do not write "Navigation" — the role adds that word.
- Dialogs need an accessible name, ideally via \`aria-labelledby\` pointing at the visible
  heading, so it can never drift out of sync with what is on screen.
- Tables need a \`<caption>\` or a labelled region when there is more than one.
- Form fields need a \`<label for>\`; \`aria-label\` on an input hides the name from sighted
  users and removes the click-to-focus behaviour a real label provides.

## Announcing changes

Copy that appears without a page change — validation results, toasts, save status — needs a
live region, or it is written for nobody. Use \`aria-live="polite"\` for status and
\`role="alert"\` (implicitly assertive) for errors that block progress, and keep the message
short: assertive regions interrupt whatever is being read.

The region must exist in the DOM before the message is inserted. Mounting a live region and
its content in the same render frequently produces no announcement at all.

## Quick audit

1. Tab through the interface. Does every stop announce a name that is a verb phrase or a
   clear noun?
2. Does any control have an \`aria-label\` that does not begin with its visible text?
3. Are any two controls on the screen announced identically?
4. Does every image have an \`alt\` attribute, including the decorative ones?
5. Would the list of all links on the page make sense read on its own?
`,
      },
    ],
  },

  rules: [
    {
      id: 'interface-copy/button-names-outcome',
      strength: 'must',
      statement:
        'Label every button with the verb phrase describing the outcome, not with a generic acknowledgement such as Submit, OK, Yes, or Continue.',
      evidence: {
        rationale:
          'Users read buttons before body text, so the label is often the only text consulted before committing. A generic label forces a return to the prose to determine consequence, and under time pressure that re-read does not happen.',
        confidence: 'strong',
      },
      exceptions: [
        'Platform-standard dialogs whose button labels are supplied by the operating system.',
      ],
      examples: {
        language: 'tsx',
        bad: '<button type="submit">Submit</button>',
        good: '<button type="submit">Create account</button>',
      },
      verifiedBy: 'copy-audit',
    },
    {
      id: 'interface-copy/confirm-states-consequence',
      strength: 'must',
      statement:
        'A confirmation dialog must state what will happen and whether it is reversible, rather than asking whether the user is sure.',
      evidence: {
        rationale:
          'Asking for certainty tests confidence rather than comprehension and adds no information the user did not already have, so it is dismissed reflexively. Naming the object, the scope, and the reversibility supplies the fact the user is missing.',
        confidence: 'strong',
      },
      exceptions: ['Reversible actions, where an undo affordance should replace the dialog entirely.'],
      examples: {
        language: 'text',
        bad: 'Are you sure? [Yes] [No]',
        good: 'Delete Acme Redesign and its 40 tasks? This cannot be undone. [Delete project] [Keep project]',
      },
    },
    {
      id: 'interface-copy/error-names-cause-and-action',
      strength: 'must',
      statement:
        'Every error message must name the specific cause and the next action the user can take.',
      evidence: {
        rationale:
          'An error is an interruption the user did not choose; its only value is restoring forward motion. A message true of every failure carries no information and converts a recoverable state into a support request.',
        source: 'WCAG 2.2 SC 3.3.1 Error Identification and SC 3.3.3 Error Suggestion',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html',
        confidence: 'established',
      },
      exceptions: [
        'Security-sensitive failures where naming the cause would leak information, such as distinguishing an unknown account from a wrong password.',
      ],
      examples: {
        language: 'text',
        bad: 'Something went wrong. Please try again later.',
        good: "report.pdf is 24 MB and the limit is 10 MB. Compress it or upload a smaller file.",
      },
      verifiedBy: 'error-audit',
    },
    {
      id: 'interface-copy/no-mock-cheer-in-failure',
      strength: 'must-not',
      statement:
        'Do not use exclamation marks, "Oops", "Whoops", or jokes in messages that report a failure.',
      evidence: {
        rationale:
          'Failure copy is read by a user who has just lost time or data. Performed cheerfulness signals that the system does not consider the loss serious, which converts irritation into distrust, and the words displace the diagnostic information the message should have carried.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'Oops! Something went wrong!',
        good: "We couldn't reach the server. Your draft is saved locally.",
      },
    },
    {
      id: 'interface-copy/no-user-blame',
      strength: 'should-not',
      statement:
        'Do not phrase validation messages as accusations directed at the user ("You entered an invalid…"); state the constraint instead.',
      evidence: {
        rationale:
          'Second-person blame adds an emotional cost without adding information, and the constraint phrasing is strictly more useful because it tells the user what a valid value looks like rather than only that theirs was not.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'You entered an invalid date.',
        good: 'Choose a date on or after today.',
      },
    },
    {
      id: 'interface-copy/empty-state-structure',
      strength: 'should',
      statement:
        'Give every empty state three parts: what belongs here, why it is useful, and exactly one action.',
      evidence: {
        rationale:
          'The empty state is seen by every new user before any populated screen, making it the earliest available teaching surface. A bare "No items" cannot be distinguished from a fault, and multiple competing actions reproduce the paralysis the state exists to resolve.',
        confidence: 'strong',
      },
      verifiedBy: 'empty-state-review',
    },
    {
      id: 'interface-copy/distinguish-empty-kinds',
      strength: 'must',
      statement:
        'Distinguish never-had-data, filtered-to-nothing, and failed-to-load states with different copy and different actions.',
      evidence: {
        rationale:
          'The three states share a visual shape but require opposite responses: create something, clear the filter, or retry. Rendering a load failure as an empty list actively misinforms the user that their data no longer exists.',
        confidence: 'established',
      },
    },
    {
      id: 'interface-copy/label-not-placeholder',
      strength: 'must',
      statement:
        'Every form field must have a persistent visible label; placeholder text may only supplement it with a format example.',
      evidence: {
        rationale:
          'Placeholder text vanishes on focus, so the field name disappears at the moment it is needed, which particularly harms users with memory or attention differences. Placeholders also typically fail contrast requirements and are not a reliable accessible name.',
        source: 'WCAG 2.2 SC 3.3.2 Labels or Instructions',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<input type="email" placeholder="Email address" />',
        good: '<label for="email">Work email</label>\n<input id="email" type="email" placeholder="name@company.com" />',
      },
      verifiedBy: 'accessible-name-audit',
    },
    {
      id: 'interface-copy/accessible-name-contains-label',
      strength: 'must',
      statement:
        'When a control has visible text, its accessible name must contain that text, in the same order — never replace it with an unrelated aria-label.',
      evidence: {
        rationale:
          'Speech input matches a spoken command against the accessible name rather than the rendered pixels, so an aria-label that discards the visible word makes the control unreachable by voice and gives the user no feedback about why.',
        source: 'WCAG 2.2 SC 2.5.3 Label in Name',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<button aria-label="Submit form">Save</button>',
        good: '<button aria-label="Save draft to your workspace">Save draft</button>',
      },
      verifiedBy: 'accessible-name-audit',
    },
    {
      id: 'interface-copy/no-generic-link-text',
      strength: 'must-not',
      statement:
        'Do not use "Click here", "Read more", "Learn more", or "This link" as the entire accessible name of a link.',
      evidence: {
        rationale:
          'Screen reader users routinely navigate by generating a list of every link on the page with all surrounding context stripped, so identical generic names produce a list of indistinguishable entries and the page becomes unnavigable by that route.',
        source: 'WCAG 2.2 SC 2.4.4 Link Purpose (In Context)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html',
        confidence: 'established',
      },
      exceptions: [
        'The visible text may remain "Read more" if an aria-label preserves it and extends it, e.g. "Read more about pricing".',
      ],
    },
    {
      id: 'interface-copy/one-case-convention',
      strength: 'should',
      statement:
        'Choose sentence case or title case once and apply it to every button, heading, tab, and menu item in the product.',
      evidence: {
        rationale:
          'Title case has no agreed rule set across English variants for prepositions, conjunctions, and hyphenated words, so a codebase using it drifts into inconsistency that readers perceive as carelessness without being able to name it. Sentence case has one rule and survives contributor turnover.',
        confidence: 'strong',
      },
    },
    {
      id: 'interface-copy/plurals-via-plural-rules',
      strength: 'must',
      statement:
        'Resolve plurals with Intl.PluralRules or ICU message syntax, never by appending an "s" or shipping "item(s)".',
      evidence: {
        rationale:
          'English has two plural categories but the CLDR set spans six, and languages such as Polish, Russian, and Arabic select a form based on the numeral itself. String concatenation therefore produces grammatically wrong output in most target locales, and "(s)" is unreadable aloud.',
        source: 'ECMA-402 Intl.PluralRules; Unicode CLDR plural categories',
        confidence: 'established',
      },
      examples: {
        language: 'ts',
        bad: 'const label = `${count} item${count === 1 ? "" : "s"}`',
        good: 'const label = t("itemCount", { count }) // "{count, plural, =0 {No items} one {# item} other {# items}}"',
      },
    },
    {
      id: 'interface-copy/write-the-zero-case',
      strength: 'should',
      statement:
        'Write the zero case as its own string rather than letting it fall through to the plural form.',
      evidence: {
        rationale:
          'Zero is semantically a different message from a count: it reports absence rather than quantity. "No unread messages" answers the user question, whereas "0 unread messages" makes the reader parse a numeral to reach the same conclusion.',
        confidence: 'opinion',
      },
    },
    {
      id: 'interface-copy/relative-time-scope',
      strength: 'should',
      statement:
        'Use relative time only for recent events where precision does not matter, and always expose the absolute timestamp via a <time datetime> element or tooltip.',
      evidence: {
        rationale:
          'Relative time is easier to read for recency but loses resolution as it ages and cannot be compared, cited, or reconciled with an external record — which is exactly what a user needs from an audit log, receipt, or scheduled event.',
        confidence: 'strong',
      },
      examples: {
        language: 'html',
        bad: '<span>2 years ago</span>',
        good: '<time datetime="2024-03-04T09:12:33Z" title="4 March 2024, 09:12 UTC">4 March 2024</time>',
      },
    },
    {
      id: 'interface-copy/truncation-keeps-full-value',
      strength: 'should',
      statement:
        'When truncating a value the user may need to act on, keep the full value reachable on hover, focus, or in a detail view, and truncate filenames in the middle so the extension survives.',
      evidence: {
        rationale:
          'Truncation discards information the layout could not fit, not information the user did not need. Without a recovery path the user cannot distinguish two similarly-prefixed items, and a trailing ellipsis on a filename removes the extension, which is often the most identifying part.',
        confidence: 'strong',
      },
    },
    {
      id: 'interface-copy/layout-headroom-for-translation',
      strength: 'must',
      statement:
        'Never size a container to fit its English string; allow roughly 30% expansion for running text and more for short labels, and use logical properties for direction.',
      evidence: {
        rationale:
          'German running text averages around 30% longer than English and short UI labels can more than double, so a container fitted to English clips or wraps badly on translation. Physical properties such as padding-left do not mirror in right-to-left locales, where icon order, progress direction, and arrows must all flip.',
        source: 'W3C Internationalisation guidance on text expansion',
        url: 'https://www.w3.org/International/articles/article-text-size',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.button { width: 88px; padding-left: 12px; text-align: left; }',
        good: '.button { min-width: 88px; padding-inline: 12px; text-align: start; }',
      },
      verifiedBy: 'i18n-stress',
    },
    {
      id: 'interface-copy/no-placeholder-copy-shipped',
      strength: 'must-not',
      statement:
        'Do not ship lorem ipsum, "TODO", dummy names, or invented testimonial text in any user-facing string.',
      evidence: {
        rationale:
          'Placeholder prose reads as intentional in review because it occupies the correct shape, so it passes visual inspection and is caught only by a string search. Invented attributed quotes are additionally a misrepresentation, not merely an omission.',
        confidence: 'established',
      },
      verifiedBy: 'placeholder-scan',
    },
    {
      id: 'interface-copy/register-matches-surface',
      strength: 'should-not',
      statement:
        'Do not use marketing or promotional voice in utility surfaces such as settings, billing, errors, or destructive dialogs.',
      evidence: {
        rationale:
          'Register signals what kind of interaction is happening. A user deep in billing is performing a task with consequences, and persuasive enthusiasm there reads as an interruption by something that wants their attention rather than a tool that is helping them finish.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: "Ready to supercharge your workflow? Let's get you set up!",
        good: 'Your plan renews on 12 August 2026.',
      },
    },
    {
      id: 'interface-copy/translate-jargon',
      strength: 'should',
      statement:
        'Replace implementation vocabulary — status codes, exception names, internal entity names — with words from the user’s model of the product.',
      evidence: {
        rationale:
          'Implementation terms are precise only for people who can act on them. For everyone else they add reading cost and imply the failure is theirs to diagnose, which stalls the user at exactly the point the message should be moving them forward.',
        confidence: 'strong',
      },
      exceptions: [
        'Developer-facing tools, and error surfaces where a copyable code genuinely helps support — include it as secondary detail, not as the message.',
      ],
    },
  ],

  verification: [
    {
      id: 'copy-audit',
      kind: 'self-review',
      description: 'Confirm labels and headings answer the user’s question.',
      blocking: true,
      questions: [
        'For every button on screen, does the label name the outcome rather than the mechanism?',
        'If the user read only the buttons and not the body text, could they choose correctly?',
        'Is the case convention (sentence or title) identical across every label, heading, tab, and menu item?',
        'Does any string use marketing register on a utility surface?',
      ],
    },
    {
      id: 'error-audit',
      kind: 'self-review',
      description: 'Confirm every failure message is actionable.',
      blocking: true,
      questions: [
        'List every error string. Does each name a specific cause rather than a generic failure?',
        'Does each state what the user should do next?',
        'Does any error contain an exclamation mark, "Oops", a joke, or an unexplained status code?',
        'Does any message blame the user rather than state the constraint?',
      ],
    },
    {
      id: 'empty-state-review',
      kind: 'self-review',
      description: 'Confirm empty states teach rather than terminate.',
      questions: [
        'Does the empty state say what belongs here and why it is useful?',
        'Does it offer exactly one action?',
        'Are the never-had-data, filtered-to-nothing, and failed-to-load cases distinguished by different copy and different actions?',
      ],
    },
    {
      id: 'accessible-name-audit',
      kind: 'self-review',
      description: 'Confirm spoken names match visible words.',
      blocking: true,
      questions: [
        'Does any aria-label replace rather than extend the visible text of its control?',
        'Does every icon-only control have a name describing the action, not the icon?',
        'Are any two controls on the screen announced with the same name?',
        'Does every form field have a persistent visible label rather than a placeholder acting as one?',
        'Read the list of every link name on the page alone — is each one meaningful?',
      ],
    },
    {
      id: 'i18n-stress',
      kind: 'self-review',
      description: 'Confirm the layout survives translation and direction change.',
      questions: [
        'Does every layout hold with each string 40% longer?',
        'Is any container sized to the exact width of its English label?',
        'Are directional styles written with logical properties (padding-inline, text-align: start) rather than left and right?',
        'Are counts, dates, currencies, and units formatted through Intl rather than concatenated?',
      ],
    },
    {
      id: 'placeholder-scan',
      kind: 'command',
      description: 'Fail if placeholder or draft copy reaches user-facing strings.',
      command:
        'grep -rniE "lorem ipsum|dolor sit amet|asdf|\\\\bTODO\\\\b|FIXME|Oops|Whoops" --include="*.tsx" --include="*.jsx" --include="*.vue" --include="*.svelte" --include="*.json" src && exit 1 || exit 0',
      blocking: true,
    },
  ],

  relatedSkills: ['design-judgment', 'accessible-components', 'form-design', 'internationalisation'],
}
