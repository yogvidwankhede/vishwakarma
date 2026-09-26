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

## 7. Settled mechanics

Case, numerals, time, plurals, truncation, placeholders and translation headroom are decided
once for a codebase and then applied without further judgment. \`copy-mechanics.md\` has each
with its reasoning: sentence case over title case, \`Intl.PluralRules\` over an appended s,
relative time only while recency is the point, a visible \`<label>\` rather than a placeholder,
and roughly 30 per cent more room than the English string needs.

---

## 8. The accessible name is copy

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

## 9. Before shipping

Search for \`lorem\`, \`ipsum\`, \`TODO\`, \`asdf\`, \`Oops\`, and \`!\` in message strings. Placeholder
copy reaching production is not a rare accident — it occupies the right shape, so it survives
visual review and is caught only by a string search.`,

    references: [
      {
        id: 'copy-mechanics',
        title: 'Settled copy mechanics: case, numerals, time, plurals, truncation, translation',
        answers:
          'Sentence case or title case, relative or absolute time, how to pluralise correctly, where to truncate, and how much room translation needs?',
        content: `# Settled copy mechanics

Each decision below is made once for a codebase and then applied mechanically. They are
gathered out of the body because none of them needs judgment at the point of use — only
consistency, which is exactly what drifts when the reasoning is not written down.

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
back arrows and slider polarity mirror, while clocks and numerals do not.`,
      },
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
      {
        id: 'generated-copy-tells',
        title: 'Generated-copy tells: the sentence shapes that read as machine-written',
        answers:
          'This marketing or landing-page copy reads as AI-generated but I cannot say why — which construction is doing it, what is the mechanism, and what does the rewrite look like?',
        content: `# Generated-copy tells

A catalogue of word-level constructions that make a page read as machine-written, with the
mechanism behind each one, a worked rewrite, and a signal you can count.

None of these constructions is broken in itself. Each is a default that a writer reaches for
when a decision has not been made, so what the reader detects is the missing decision rather
than the punctuation or the layout. Diagnose the mechanism before deleting anything: if the
mechanism does not apply, the construction is fine and the rule should be overridden.

---

## 1. The category inversion

Shapes: \`It's not a note-taking app, it's a second brain.\` / \`It's not just X, it's Y.\` /
\`Project management, reimagined.\` / \`Figma, but for audio.\` / \`Stop managing tasks. Start
shipping work.\` / \`The last invoicing tool you'll ever need.\`

### Mechanism

Three separate failures arrive in one sentence.

1. **It asserts a category change and supplies no evidence.** "Second brain" is a claim about
   what the software is, and the sentence contains nothing a reader could check. The reader is
   asked to accept a reclassification on rhythm.
2. **It spends the most valuable line in the product on a negation.** The first line gets more
   reads than anything else on the page, and half of this one describes a category the product
   is not in. A reader who leaves after one line leaves knowing only what they were not buying.
3. **It is the single most recognisable shape in generated marketing copy.** Frequency alone
   makes it a signature: a reader who has seen it forty times this year reads the forty-first
   as output, whatever it says. The construction now transfers authorship rather than meaning.

The relatives share the mechanism. "X, reimagined" claims a rebuild and names no change.
"X, but for Y" borrows a category instead of stating one, which works only when the reader
already knows X well and the analogy holds on the axis that matters. "Stop doing X. Start
doing Y." adds an instruction to abandon a habit the reader was not asked about.

### Rewrite

| Before | After |
| --- | --- |
| It's not a note-taking app, it's a second brain. | Every note is linked to the meeting, person, and project it came from. |
| Customer support, reimagined. | One inbox for email, chat, and phone, with the full history on every ticket. |
| It's like Figma, but for audio. | Two people can edit the same mix at the same time and hear each other's changes. |
| Stop wrestling with spreadsheets. Start making decisions. | Import a spreadsheet and get a live dashboard in about two minutes. |
| The last project tool you'll ever need. | Replaces a tracker, a wiki, and a time log with one schema. |

Each rewrite drops the category claim and names the capability that would have justified it.
The claim becomes falsifiable, which is what makes it persuasive.

### Signal

Read the first 100 words of the page and count matches for these strings: "it's not", "not
just", ", reimagined", ", but for", "Stop <verb>", "Meet <product>", "the last X you'll ever
need", "X on steroids". One occurrence above the fold is worth rewriting. Then ask the harder
question: delete the sentence and see whether the page lost any information.

### When the mechanism lapses

- The audience has demonstrably misclassified the product and the wrong category is the news:
  \`This is a compiler, not a linter — it rejects programs a linter would only warn about.\`
- X is a named competitor or a previous version and the difference is stated in measurable
  terms rather than implied.

---

## 2. Em dash rate

The em dash is correct punctuation and belongs in good prose. The tell is the rate.

### Mechanism

The em dash accepts any relation between two clauses. Apposition, consequence, contrast,
interruption, afterthought and full sentence break all fit inside it, which is exactly why it
gets reached for: it lets the writer connect two thoughts without deciding how they are
related. A page with a dash in every paragraph is therefore evidence that the decisions were
skipped, and it has a second cost. Punctuation is what varies the rhythm of prose. When one
mark carries every join, every sentence has the same shape, and the flatness reads as
machine-generated even when each individual sentence is fine.

### What each mark actually does

| Mark | Relation it encodes | Example |
| --- | --- | --- |
| Comma | Non-essential addition; the sentence survives its removal. | Deploys run on every push, usually in under a minute. |
| Colon | What follows explains, itemises, or delivers what precedes it. | One requirement: a Dockerfile. |
| Semicolon | Two independent statements the reader should hold together. | The build is deterministic; the cache is not. |
| Full stop | Two separate claims. Usually the right answer. | Setup takes one command. Nothing else is required. |
| Parentheses | An aside the reader may skip entirely. | Deploys run on every push (including forks). |
| Em dash | A genuine break in voice, or an interruption you want the reader to feel. | We shipped it in March — then the API changed. |

Choosing between these is the work the dash was standing in for. Substituting a comma
everywhere is not the fix; the fix is that each join now names its own relation.

### Rewrite

Before, four dashes in three sentences:

\`\`\`text
Deploy in seconds — no config, no YAML — and scale automatically — from one user to a million.
Our platform handles the infrastructure — so you can focus on your product.
\`\`\`

After:

\`\`\`text
Deploy in seconds. No config files, no YAML. Traffic scales from one user to a million
without a change on your side, because we run the infrastructure.
\`\`\`

The second version is shorter, states who does what, and has three distinct sentence shapes.

### Signal

Count em dashes (and their common substitutes, \` - \` and \` -- \`) per unit of text:

- More than one in a short paragraph: re-punctuate.
- More than two or three on a page of marketing copy: re-punctuate all of them, then put
  back the one that carries a real break in voice.
- Two dashes in one sentence that are not a matched pair bracketing a parenthetical: almost
  always one join too many.

### When the mechanism lapses

- Quoted speech, transcripts, interviews and fiction, where the dash reproduces how someone
  talks.
- A matched pair bracketing a true parenthetical, which is one construction rather than two
  connectors.
- Reference prose that is deliberately dense and where the dash is doing a job a comma cannot,
  because commas are already carrying a list inside the clause.

---

## 3. Checkmark feature lists

A green tick before every item on a feature list.

### Mechanism

1. **The tick is a verification glyph.** Everywhere else in an interface it reports that
   something was checked and passed: a test, a step, a payment. On a feature list nothing
   performed a check, so the glyph asserts a confirmation that does not exist. The reader
   registers a claim of proof and finds none behind it.
2. **It flattens the list.** Every item gets the same mark, so SSO, dark mode and unlimited
   seats all arrive at equal weight. The reader came to the list to find out what matters and
   the list refuses to say.
3. **It reads as a comparison table with the competitor column deleted.** The tick column is
   the left half of a feature matrix. A reader who has seen a matrix supplies the missing
   column mentally and then notices that no competitor was named, which reads as an unmade
   comparison rather than a feature list.

### Rewrite

Before:

\`\`\`text
✓ Fast
✓ Secure
✓ Scalable
✓ Easy to use
✓ 24/7 support
\`\`\`

After:

\`\`\`text
Cold starts under 50 ms, measured at the edge in 18 regions.
SOC 2 Type II, with per-tenant encryption keys you can rotate yourself.
Tested to 40,000 requests per second on the default plan.
Support answers in under 4 hours, including weekends.
\`\`\`

The tick is gone, the ordering now carries the ranking, and each line is checkable. Where a
tick genuinely belongs, it reports state: \`✓ Domain verified\`, \`✓ 3 of 4 checks passed\`.

### Signal

- Any tick, check emoji, or check icon in a list that is not a checklist, a progress list, or
  a column in a two-sided comparison table.
- A list where the ticks outnumber the sentences.

### The related tell: bullets of identical length

A list where every item is three words and the same part of speech was cut to fit a template,
not to fit the facts. Length and position are ranking signals the reader uses before reading
any of the words, so a perfectly even list actively states that nothing in it matters more
than anything else. The repair is not to pad the short ones. It is to put the most
consequential item first, let it be as long as it needs to be, and cut items that only exist
to reach a round number.

Parallel construction stays correct for specification lists, parameter tables, and any set
where the reader is comparing values in the same dimension.

---

## 4. Three tiers, and what their names have to do

Three pricing tiers is often the right count. The tells are in the words.

### Mechanism

A tier name is the reader's fastest route to "which one is me", and it is read before any
bullet list. \`Starter / Pro / Enterprise\` names positions on an internal ladder instead of
naming buyers, so it answers that question for nobody and forces all three lists to be read.
Three further symptoms usually travel with it:

- **A "Most popular" badge on the middle tier.** This substitutes a social cue for the fact
  the reader was looking for. It is also the tier the pricing page wanted to sell, which the
  reader can tell, so the badge costs trust and supplies no information.
- **Differences that are unstated or unmeasurable.** "Everything in Starter, plus more",
  "advanced features", "priority support". A boundary the copy cannot state in a number is
  usually a boundary that was never decided.
- **"Contact us" in the price slot.** Legitimate for negotiated contracts. Illegitimate as a
  stand-in for a price nobody set, and either way it is useless without the threshold at
  which a reader should make contact.

The test is self-selection: a reader should be able to pick a tier, and know they picked
right, without talking to anyone.

### Rewrite

Before:

\`\`\`text
Starter — Free — Get started
Pro — $29/mo — MOST POPULAR — Everything in Starter, plus advanced features
Enterprise — Contact us — Custom solutions for your business
\`\`\`

After:

\`\`\`text
Solo. $0. One editor, 3 projects, 7-day history.
Team. $29 per editor per month. Unlimited projects, 1-year history, SSO, audit log.
  For 2 to 50 editors.
Company. From $18,000 per year. Everything in Team, plus SAML, data residency, and a
  99.9% uptime agreement. Contact us above 50 editors or if you need a signed DPA.
\`\`\`

Each name says who it is for, each boundary is a number, and the last tier states the
threshold that makes contact worthwhile instead of hiding a price behind a form.

### Signal

Read each tier name and bullet list in isolation and ask: can a reader say which tier they
are, and what they would have to become to move up? Then check for the four specific strings:
a "Most popular" badge, \`Everything in X, plus\`, \`advanced\`, \`Contact us\` with no stated
threshold.

### When the mechanism lapses

- Enterprise contracts genuinely priced per negotiation. Keep "Contact us" and add the
  trigger condition.
- A product with one usage-based rate, where there are no tiers to select between.
- Names that are already the buyer's own vocabulary, which sometimes really is Free, Team,
  and Enterprise; the test is whether a reader self-selects, not which words were used.

---

## 5. Cadence tells

These are smaller, and they are what remains when the four above are fixed.

### The triad

\`Faster, simpler, smarter.\` \`Build, ship, scale.\` \`Secure, reliable, and effortless.\`

**Mechanism.** Three is the shortest list that sounds complete, so it gets filled to length.
None of the three comparatives names a baseline, which makes all three unfalsifiable, and the
third member is usually chosen for stress rather than for meaning. The rhythm supplies the
sense of a claim having been made.

**Rewrite.** \`Faster, simpler, smarter.\` becomes \`Builds finish in 40 seconds instead of six
minutes.\` One claim, one number, checkable. A triad whose three members are each measured is
not this tell.

**Signal.** Any run of three adjectives or three bare verbs separated by commas, especially
ending in "and". Count them per page; more than one is a cadence habit rather than a coincidence.

### The restating subtitle

\`\`\`text
Heading:  Ship faster with automated deploys
Subtitle: Deploy automatically and ship your product faster
\`\`\`

**Mechanism.** The subtitle slot exists in the layout before anyone has decided what to put
in it, so it gets filled by paraphrase. It is the second most-read line on the page, and a
reader who finds no new information there learns that the page repeats itself and stops
reading closely. Everything after it is now skimmed.

**Rewrite.** Give the subtitle the next fact, not the same fact: \`Push to main. The build
runs, tests pass, and the new version is live in about 90 seconds.\` If no next fact exists,
delete the subtitle and let the heading be one line longer.

**Signal.** Strike every word in the subtitle that also appears in the heading. If what
remains is not a new claim, the subtitle is decoration.

### Fragment emphasis as rhythm

\`Built for teams. No setup. Just results.\`

**Mechanism.** A full stop after a fragment borrows the weight of a sentence for a phrase that
makes no claim. Used once, it lands. Used three times in a row it becomes the page's only
rhythm, and rhythm repeated without variation is the most reliable surface signature of
generated prose.

**Rewrite.** Keep at most one fragment per section and make the rest say who does what:
\`Two people can edit the same file at once. There is no setup step and no config file.\`

**Signal.** Count consecutive sentences without a finite verb. Two in a row is a choice;
three is a tic.

---

## Audit pass

Run in this order, because fixing an earlier item often deletes a later one.

1. Delete every category inversion. Replace each with the capability that would have made the
   claim true.
2. Count em dashes. Above one per paragraph, re-punctuate each according to the relation it
   carries, then restore at most one.
3. Remove ticks from any list that is not a checklist or a two-sided comparison. Reorder the
   list so the first item is the one that matters most.
4. Read each tier name alone and ask whether a reader can self-select. Replace vague
   boundaries with numbers, and either price the top tier or state the contact threshold.
5. Count triads, fragments, and words shared between each heading and its subtitle.
6. Read the page aloud. Uniform sentence length is the tell that survives every fix above,
   and it is audible before it is visible.
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
      exceptions: [
        'Reversible actions, where an undo affordance should replace the dialog entirely.',
      ],
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
        good: 'report.pdf is 24 MB and the limit is 10 MB. Compress it or upload a smaller file.',
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
    {
      id: 'interface-copy/no-category-inversion',
      strength: 'should-not',
      statement:
        'Do not open with a category inversion — "It\'s not X, it\'s Y", "X, reimagined", "X, but for Y", "Stop doing X. Start doing Y." — unless the same block names the specific capability that makes the new category true.',
      evidence: {
        rationale:
          'The construction asserts a reclassification while supplying nothing a reader can check, and it spends the most-read line in the product describing a category the product is not in. Its frequency in generated marketing copy is now high enough that the shape itself is read as authorship rather than as a claim, so it discredits whatever follows it.',
        confidence: 'strong',
      },
      exceptions: [
        'Copy correcting a misclassification the audience has demonstrably already made, where naming the wrong category is the information: "This is a compiler, not a linter — it rejects programs a linter would only warn about."',
        'Comparative copy where X is a named competitor or a prior version and the difference is stated in measurable terms rather than implied by the inversion.',
      ],
      examples: {
        language: 'text',
        bad: "It's not a note-taking app, it's a second brain.",
        good: 'Every note is linked to the meeting, person, and project it came from.',
      },
    },
    {
      id: 'interface-copy/em-dash-rate',
      strength: 'should',
      statement:
        'Keep em dashes to at most one per short paragraph and two or three per page of marketing copy; above that rate, re-punctuate each one as the comma, colon, semicolon, or full stop the relation actually calls for.',
      evidence: {
        rationale:
          'The em dash accepts every relation between two clauses, so it lets a writer join two thoughts without deciding whether the relation is apposition, consequence, contrast, or a sentence break. A high rate is therefore evidence those decisions were skipped, and because punctuation is what varies the rhythm of prose, one mark carrying every join gives every sentence the same shape.',
        confidence: 'opinion',
      },
      exceptions: [
        'Quoted speech, transcripts, interviews, and fiction, where the dash reproduces how someone talks.',
        'A matched pair of dashes bracketing a genuine parenthetical, which is one construction rather than two connectors.',
        'Dense reference prose where commas are already carrying a list inside the clause and a comma would be ambiguous.',
      ],
      examples: {
        language: 'text',
        bad: 'Deploy in seconds — no config, no YAML — and scale automatically — from one user to a million.',
        good: 'Deploy in seconds. No config files, no YAML. Traffic scales from one user to a million without a change on your side.',
      },
    },
    {
      id: 'interface-copy/no-verification-checkmarks',
      strength: 'should-not',
      statement:
        'Do not prefix feature-list items with checkmarks or tick icons; reserve the tick for state the system actually verified, such as a completed step, a passing check, or a column in a two-sided comparison table.',
      evidence: {
        rationale:
          'A tick is a verification glyph everywhere else in an interface, so on an unchecked feature list it asserts a confirmation that nothing performed. It also gives every item identical weight, removing the ranking the reader came to the list for, and it reproduces the left half of a feature matrix, which invites the reader to notice that the competitor column is missing.',
        confidence: 'strong',
      },
      exceptions: [
        'Checklists, onboarding progress, and status lists, where the tick reports a fact the product confirmed.',
        'A real comparison table where the tick contrasts with a cross and both products are named.',
      ],
      examples: {
        language: 'text',
        bad: '✓ Fast  ✓ Secure  ✓ Scalable  ✓ Easy to use',
        good: 'Cold starts under 50 ms in 18 regions. SOC 2 Type II with keys you rotate yourself. Tested to 40,000 requests per second.',
      },
    },
    {
      id: 'interface-copy/bullets-carry-unequal-weight',
      strength: 'should',
      statement:
        'Let bullet length and grammatical shape follow what each item is worth, and put the most consequential item first, rather than trimming every item to the same three-word noun phrase.',
      evidence: {
        rationale:
          'A reader uses relative length and position as a ranking signal before reading any of the words, so a list where every item is the same size states that nothing in it matters more than anything else. Uniformity of that kind comes from filling a template to a round number, and the items added to reach the number are the ones with nothing behind them.',
        confidence: 'opinion',
      },
      exceptions: [
        'Specification, parameter, and option lists, where parallel construction is what lets the reader compare values in the same dimension.',
        'Localised sets where parallel structure is a translation or legal-review requirement.',
      ],
      examples: {
        language: 'text',
        bad: 'Fast builds / Simple setup / Great support / Full control / Team ready',
        good: 'Builds finish in 40 seconds, down from six minutes.\nSetup is one command; there is no config file.\nSupport answers in under 4 hours, including weekends.',
      },
    },
    {
      id: 'interface-copy/tiers-enable-self-selection',
      strength: 'should',
      statement:
        'Name each pricing tier after the buyer or the limit it fits, and state every difference between adjacent tiers as a number, so a reader can self-select without contacting anyone.',
      evidence: {
        rationale:
          'The tier name is the reader’s fastest route to "which one is me" and is read before any bullet list, so a name from an internal ladder such as Starter/Pro/Enterprise answers that question for nobody and forces all three lists to be read. A boundary the copy states as "advanced features" rather than a number is usually a boundary that was never decided, and a "Most popular" badge substitutes a social cue for the fact the reader was looking for.',
        confidence: 'strong',
      },
      exceptions: [
        'Contracts genuinely priced per negotiation, where "Contact us" is accurate; state the threshold at which a reader should make contact, such as above 50 editors or when data residency is required.',
        'A single usage-based rate, where there are no tiers to select between.',
      ],
      examples: {
        language: 'text',
        bad: 'Starter: Free. Pro: $29/mo (Most popular) — everything in Starter, plus advanced features. Enterprise: Contact us.',
        good: 'Solo: $0. One editor, 3 projects, 7-day history.\nTeam: $29 per editor per month. Unlimited projects, SSO, audit log. For 2 to 50 editors.\nCompany: from $18,000 a year. Adds SAML, data residency, 99.9% uptime. Contact us above 50 editors.',
      },
    },
    {
      id: 'interface-copy/subtitle-adds-a-fact',
      strength: 'should',
      statement:
        'A subtitle must add a fact its heading does not already contain; if striking the shared words leaves no new claim, delete the subtitle and let the heading run one line longer.',
      evidence: {
        rationale:
          'The subtitle slot exists in the layout before anyone has decided what belongs in it, so it gets filled by paraphrase. It is the second most-read line on the page, and a reader who finds no new information there learns the page repeats itself, after which everything below is skimmed rather than read.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'Ship faster with automated deploys / Deploy automatically and ship your product faster',
        good: 'Ship faster with automated deploys / Push to main and the new version is live in about 90 seconds.',
      },
    },
    {
      id: 'interface-copy/no-adjective-triads',
      strength: 'should-not',
      statement:
        'Do not use three-comparative cadences such as "faster, simpler, smarter", or more than one standalone sentence fragment per section, in place of a measured claim.',
      evidence: {
        rationale:
          'Three is the shortest list that sounds complete, so the slot gets filled to length and the third member is chosen for stress rather than meaning. None of the comparatives names a baseline, which makes all three unfalsifiable while the rhythm supplies the impression that a claim was made. Fragment emphasis works the same way, lending a phrase the weight of a full stop without a finite verb to carry a claim.',
        confidence: 'strong',
      },
      exceptions: [
        'A triad whose three members are each measured or independently verifiable.',
        'A single fragment answering an immediately preceding question, or a tagline the reader encounters once rather than as a rhythm.',
      ],
      examples: {
        language: 'text',
        bad: 'Faster, simpler, smarter. Built for teams. No setup. Just results.',
        good: 'Builds finish in 40 seconds instead of six minutes, and two people can edit the same file at once.',
      },
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

  relatedSkills: [
    'design-judgment',
    'accessible-components',
    'form-design',
    'internationalisation',
  ],
}
