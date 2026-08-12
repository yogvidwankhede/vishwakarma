// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * An accessibility finding is worth exactly what its evidence is worth.
 *
 * The characteristic defect of an automated accessibility review is not that it misses things —
 * it is that it prints a fact observed in the accessibility tree and a guess inferred from a
 * screenshot in the same typeface, at the same confidence, under the same heading. That does not
 * raise the value of the guess. It destroys the value of the fact, because a reader who finds one
 * inflated claim has no way to tell which of the remaining claims to trust and correctly discounts
 * all of them.
 *
 * Two mechanisms generate nearly every rule here. The first is that **how you know** and **how
 * much it hurts** are independent quantities, so a single "priority" number is lossy in the one
 * direction that matters: the reader can no longer distinguish a small problem, which is deferred,
 * from an uncertain one, which is investigated. The second is that **silence reads as a pass**. A
 * criterion that was never exercised, printed in a report with no violation beside it, is read by
 * every stakeholder as conforming — which is how a run that never pressed Tab ends up claiming
 * keyboard accessibility on a page whose slider is mouse-only.
 *
 * The consequences follow mechanically. Grades are fill-based (●, ◐, ○) rather than colour-coded,
 * because a red/amber/green ledger fails SC 1.4.1 — the criterion it is auditing. Conformance has
 * three states rather than two, because Undetermined is where most criteria honestly land. When
 * torn between two grades you take the lower one, because credibility is the scarce resource and
 * an under-graded finding costs one round of triage while an over-graded one costs the report. And
 * evidence is budgeted against the grade a finding can reach, since no quantity of screenshots
 * upgrades a judgement a human has to make.
 *
 * The rule catalogue — what a dialog owes, how a combobox is wired — lives in
 * `accessible-components`. This skill governs how claims are made, graded, fixed, and reported.
 */
export const accessibilityEvidence: SkillManifest = {
  vsm: '1.0',
  id: 'accessibility-evidence',
  name: 'Accessibility Evidence',
  description:
    'Use when grading or reporting accessibility findings — evidence tiers, severity, scan versus audit, conformance states.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'accessibility',
  tags: ['wcag', 'audit', 'evidence', 'conformance', 'reporting'],

  activation: {
    intents: [
      'auditing a page, flow, or component against WCAG and writing up the result',
      'grading an accessibility finding and deciding how confident the claim may be',
      'deciding whether a run counts as a scan or an audit, and what it can claim',
      'reporting conformance when most criteria were not exercised',
      'triaging an automated scanner result that reports zero violations',
      'reviewing a high-risk widget such as a combobox, data grid, tree, or carousel',
      'applying accessibility fixes and deciding which ones may be applied directly',
      'handing work to a human running a screen reader or other assistive technology',
      'writing the summary ledger of an accessibility report so it can be acted on',
    ],
    globs: [
      '**/a11y/**',
      '**/accessibility/**',
      '**/*a11y*.md',
      '**/*accessibility*.md',
      '**/*audit*.md',
      '**/*.axe.json',
      '**/wcag*.{md,json,csv}',
    ],
    keywords: [
      'wcag',
      'accessibility audit',
      'a11y report',
      'conformance',
      'success criterion',
      'axe',
      'screen reader',
      'nvda',
      'voiceover',
      'talkback',
      'accessibility tree',
      'vpat',
      'undetermined',
      'evidence',
    ],
  },

  content: {
    summary:
      'Use when producing, grading, or reporting an accessibility finding, audit, or fix: keep evidence basis and severity as two separate axes, take the lower grade when torn, and never let an unexercised criterion read as a pass.',

    body: `# Accessibility Evidence

A finding is worth exactly what its evidence is worth. A report that mixes facts observed in the
accessibility tree with guesses inferred from a screenshot, and prints both in the same typeface
at the same confidence, has destroyed the value of the facts rather than raised the value of the
guesses. The discipline is not finding more issues; it is refusing to state anything at a
confidence the evidence does not carry. The rule catalogue — what a dialog owes, how a combobox is
wired — lives in \`accessible-components\`. This governs how claims are made, graded, and reported.
The checkpoint groups criterion by criterion, the high-risk widget patterns, and the fix and report
discipline are in **checkpoints-and-reporting**; a worked grading example is in
**grading-and-conformance**.

---

## 1. Two axes, never one number

Every finding carries two independent grades: **how you know** and **how much it hurts**.
Collapsing them into one priority score is the most common way a report becomes unactionable,
because the reader can no longer tell whether a low score means "small problem" or "we are not sure
this is a problem" — and those two demand opposite responses, deferral and investigation.

Evidence basis uses fill-based markers. **● Verified** is deterministic and reproducible: an
interaction was performed and a DOM or accessibility-tree fact observed, and re-running produces the
same result. **◐ Flagged** means evidence exists and points somewhere, but the conclusion needs a
human judgement no engine can make. **○ Human-required** cannot be settled without assistive
technology, a real screen reader pass, or lived experience of the barrier. The markers are
fill-based rather than colour-based because a red/amber/green ledger fails SC 1.4.1 — the criterion
it is auditing — and a reviewer with deuteranopia cannot extract the grades at all. Filled,
half-filled and hollow survive greyscale, monochrome terminals and colour vision deficiency, because
the distinguishing channel is shape.

A Verified claim cites three things: the selector, the interaction performed, and the observed fact.
"The button has no accessible name" is not verified. "\`button.cart-submit\` — queried the
accessibility tree after page load; the node exposes role=button and an empty name, and the element
has no text content, \`aria-label\`, or \`aria-labelledby\`" is verified, because a second person can
reproduce it.

Severity is **Critical** (blocks a core task outright, no workaround), **Serious** (completable at
significant cost or significant risk of error), **Moderate** (real friction with a defined
workaround), or **Minor** (degrades without blocking). It measures consequence to a user attempting
a task, not how many elements are affected: one unlabelled control on the checkout path outranks two
hundred low-contrast icons in a settings screen. Counting instances is a reporting concern, not a
severity input.

**When torn, take the lower grade.** Between Serious and Critical, file Serious; between Verified
and Flagged, file Flagged. The mechanism is asymmetric cost — an over-graded finding that a human
disproves teaches the reader that your grades are inflated, and they then discount every other
finding in the report including the correct Critical ones, while an under-graded finding costs one
round of triage. Credibility is the scarce resource, not coverage.

## 2. Coverage ceiling, scan versus audit

A fully automated rule engine detects roughly **57%** of real accessibility defects. Semi-automated
tooling that drives a browser — performing interactions, reading the tree after state changes,
exercising keyboard paths — reaches roughly **80%**. The remainder requires a human operating
assistive technology, because the residue is judgement about meaning: whether alt text is accurate,
whether an error message tells the user what to do, whether an announcement arrives at a useful
moment. State the ceiling in every report; a stakeholder reading "0 violations" without it will
reasonably conclude the product is accessible.

Name the denominator in the same sentence. The higher, widely quoted figure counts the share of WCAG
criteria for which automation detects *at least some* failures, which is a different question from
the share of real defects caught, and quoting one as the other inflates a clean automated pass by a
wide margin.

A **scan** is one URL, one pass, no sampling: fast, cheap, useful as a smoke test, and supporting no
conformance claim whatsoever. An **audit** defines scope (routes, states, viewports, locales), names
the conformance target, names the assistive-technology baseline at stated versions, explores routes
and complete flows including error and recovery paths, selects a structured sample (one instance of
each template plus every step of each critical flow) alongside a random sample from the remainder,
evaluates each sampled page against each in-scope criterion, and reports per criterion rather than
per page. **Auditing one URL with no sampling is a scan.** Say which you did in the first paragraph:
"audit" carries an implied conformance claim, and a page can be flawless while the flow it belongs
to contains a keyboard trap two steps later.

## 3. Conformance has three states

Pass and Fail are not exhaustive. **Pass** applies only where a criterion was exercised and every
applicable instance was Verified as conforming. **Fail** applies only where a Verified
non-conformance was observed. Anything Flagged, Human-required, or simply not exercised is
**Undetermined** — including criteria you looked at briefly and felt fine about.

One sampled page failing a criterion fails that criterion for the entire scope. "9 of 10 pages pass
2.4.3" is not a 90% pass; it is a fail with a known distribution. Conformance is a conjunction
across the scope, not a mean, and a percentage invites the reader to treat it as nearly-conforming,
which is precisely the inference the standard does not license.

At the end of a run, every in-scope criterion sits in exactly one bucket: verified, flagged,
engine-owned (evaluated by a rule engine within its known reliability, marked as such), not
applicable (say why — "no video content in scope" for 1.2.2), or not exercised (say whether out of
time, out of tooling reach, or blocked). Absence of a violation is not a pass, and silence in a
report is read as a pass by every reader; the bucket assignment is what converts silence into an
explicit, checkable statement.

## 4. The evidence budget

The grade a finding can reach bounds the evidence worth gathering for it. A **Flagged** finding gets
one selector, one screenshot if the issue is visual, one sentence stating your opinion, and one
sentence naming what a human should confirm — then stop, because what blocks the upgrade to Verified
is that a human judgement is required, and screenshots do not supply human judgement. A **Verified**
finding gets what makes it reproducible and nothing beyond. A **Human-required** finding gets the
handoff, which is the actual deliverable: "with NVDA in browse mode, activate the Next control three
times and report whether slide position is announced and whether focus lands on the newly visible
slide" is a handoff; "check the carousel with a screen reader" is not.

Where one finding spans two criteria at different grades — a Verified 1.3.1 failure and a Flagged
1.4.1 question about the same status dot — report at the lower grade with the verified fact attached
as supporting evidence. Citing the deterministic half does not license upgrading the whole.`,

    references: [
      {
        id: 'grading-and-conformance',
        title: 'Evidence grades, severity, coverage, scan versus audit, conformance states, and a worked grading example',
        answers:
          'How do I grade a finding on evidence and severity separately, what may a scan claim that an audit can, when is a criterion Pass rather than Undetermined, how much evidence is a finding worth, and how do I report one finding that spans two criteria at two grades?',
        content: `# Evidence grades, severity, coverage, scan versus audit, and conformance states

An accessibility finding is worth exactly what its evidence is worth. A report that mixes facts
observed in the accessibility tree with guesses inferred from a screenshot, and prints them in the
same typeface with the same confidence, has destroyed the value of the facts rather than raised the
value of the guesses. The discipline here is not finding more issues; it is refusing to state
anything at a confidence the evidence does not carry.

## 1. Two axes, never one number

Every finding carries two independent grades: **how you know** and **how much it hurts**.
Collapsing them into a single "priority" score is the most common way accessibility reports
become unactionable, because the reader can no longer tell whether a low score means "small
problem" or "we are not sure this is a problem". Those two demand opposite responses: one is
deferred, the other is investigated.

### Evidence basis

| Marker | Basis | What it means |
|---|---|---|
| ● | **Verified** | Deterministic and reproducible. You performed an interaction and observed a DOM or accessibility-tree fact. Re-running produces the same result. |
| ◐ | **Flagged** | Evidence exists and points somewhere, but the conclusion needs a human judgement that no engine can make. |
| ○ | **Human-required** | Cannot be settled without assistive technology, a real screen reader pass, or lived experience of the barrier. |

Markers are **fill-based, not colour-based**. The mechanism is direct: a report that grades
its own findings by colour alone fails SC 1.4.1, the criterion it is auditing. A reviewer
with deuteranopia reading a red/amber/green ledger cannot extract the grades. Filled,
half-filled, and hollow circles survive greyscale printing, monochrome terminals, and colour
vision deficiency, because the distinguishing channel is shape.

A Verified claim must cite three things: the **selector** that identifies the element, the
**interaction** you performed, and the **observed fact**. "The button has no accessible
name" is not verified. "\`button.cart-submit\` — queried the accessibility tree after page
load; the node exposes \`role=button\`, \`name=""\`, and the element has no text content,
\`aria-label\`, or \`aria-labelledby\`" is verified. The difference is that a second person can
reproduce the second statement and cannot reproduce the first.

### Severity

| Level | Definition | Example |
|---|---|---|
| **Critical** | Blocks a core task outright, with no workaround available to the affected user. | A focus trap in the checkout payment step; the sole submit button on a form has no accessible name. |
| **Serious** | Major barrier. The task is completable but at significant cost or with significant risk of error. | Focus order jumps backwards through a multi-step form; body text at 3.1:1 against its background. |
| **Moderate** | Real friction, defined workaround exists. | No skip link on a page with a 40-item navigation; a live region announcing every keystroke. |
| **Minor** | Degrades experience without blocking. | A decorative icon border at 2.4:1 on a control that also carries a visible text label. |

Severity is about **consequence to a user attempting a task**, not about how many elements
are affected. One unlabelled control on the checkout path outranks two hundred low-contrast
icons in a settings screen. Counting instances is a reporting concern, not a severity input.

### When torn, take the lower grade

If a finding sits plausibly between Serious and Critical, file it Serious. If evidence sits
between Verified and Flagged, file it Flagged. The mechanism is asymmetric cost: an
over-graded finding that a human disproves teaches the reader that your grades are inflated,
and they then discount every other finding in the report — including the correct Critical
ones. An under-graded finding costs one round of triage. Credibility is the scarce resource,
not coverage.

---

## 2. The coverage ceiling

A fully automated rule engine detects roughly **57%** of real accessibility defects.
Semi-automated tooling that drives a browser — performing interactions, reading the
accessibility tree after state changes, exercising keyboard paths — reaches roughly **80%**.
The remaining fraction requires a human operating assistive technology, and no amount of
additional automated rules moves that boundary, because the residue consists of judgements
about meaning: whether alt text is accurate, whether an error message tells the user what to
do, whether an announcement arrives at a useful moment.

State this ceiling in every report. A stakeholder reading "0 violations" without it will
reasonably conclude the product is accessible, and the report has then actively misled them.

### The denominator trap

There is a second, widely quoted figure: the share of WCAG success criteria for which
automated testing can detect *at least some* failures. That number is much higher than 57%,
and it answers a different question. **Share of defects caught** and **share of criteria
partially detectable** have different denominators — one counts real failures in a real
product, the other counts criteria in a specification.

Quoting the criteria figure as though it were the defect figure inflates the apparent
strength of a clean automated pass by a wide margin. An engine detects *some* 1.3.1 failures
— a table without header cells — and misses others entirely — a \`<div>\` styled as a heading —
so 1.3.1 counts as "partially detectable" while most of its real-world defects go unfound. If
you cite a coverage number, name its denominator in the same sentence.

---

## 3. Scan versus audit

These are different activities and the words are not interchangeable.

A **scan** is one URL, one pass, no sampling. It is fast, cheap, useful as a smoke test, and
it supports no conformance claim whatsoever.

An **audit** follows a structured method:

1. **Define scope** — which routes, which states, which viewports, which locales.
2. **Define the conformance target** — WCAG 2.2 Level AA, or whichever standard applies, named explicitly.
3. **Define the assistive-technology baseline** — the browser and screen reader pairings you will test against, at stated versions.
4. **Explore** — walk routes, identify distinct templates, identify complete user flows including error and recovery paths.
5. **Select a sample** — a *structured* sample (one instance of each template, plus every step of each critical flow) plus a *random* sample drawn from the remainder, so template-level bias in your own selection cannot hide defects.
6. **Evaluate** each sampled page against each in-scope criterion.
7. **Report per criterion**, not per page.

**Auditing one URL with no sampling is a scan.** Say which you did, in the first paragraph of
the report. The mechanism: the word "audit" carries an implied conformance claim, and a
single-page scan cannot support one — a page can be flawless while the flow it belongs to
contains a keyboard trap two steps later.

---

## 4. Conformance has three states

Pass and Fail are not exhaustive. The third state is **Undetermined**, and it is where most
criteria honestly land after most runs.

**Pass** applies only when a criterion was exercised and every applicable instance was
Verified as conforming. **Fail** applies only when a Verified non-conformance was observed.
Anything Flagged, Human-required, or simply not exercised is **Undetermined** — including
criteria you looked at briefly and felt fine about.

One sampled page failing a criterion **fails that criterion for the entire scope**. There is
no averaging: "9 of 10 pages pass 2.4.3" is not a 90% pass, it is a fail with a known
distribution. Conformance is a conjunction across the scope, not a mean. Reporting it as a
percentage invites the reader to treat it as nearly-conforming, which is precisely the
inference the standard does not license.

A counter-example: a report lists 38 criteria under "Passed" because the engine raised no
violation for them. Among the 38 is 2.1.1, which the engine cannot evaluate at all — it never
pressed Tab, and the pricing page's custom slider is mouse-only. The report claims the
product passes keyboard accessibility. It does not; the report simply never asked.

---

## 5. The evidence budget

The grade a finding can reach bounds the evidence worth gathering for it. This is the rule
that keeps a review from spending its entire budget on one interesting-looking element.

A **Flagged** finding gets: one selector, one screenshot if the issue is visual, one
sentence stating your opinion, and one sentence naming what a human should confirm and how.
Then stop. Additional evidence cannot upgrade a Flagged finding to Verified — the thing
blocking the upgrade is that a human judgement is required, and screenshots do not supply
human judgement. Every further minute is waste that would have found a Verified defect
elsewhere.

A **Verified** finding gets what makes it reproducible — selector, interaction, observed tree
state — and nothing beyond. A third screenshot of one contrast failure adds no information.

A **Human-required** finding gets the *handoff*, which is the actual deliverable: the steps to
run, the assistive technology to run them with, and the question the human is answering.
"Check the carousel with a screen reader" is not a handoff. "With NVDA in browse mode,
activate the Next control three times and report whether slide position is announced and
whether focus lands on the newly visible slide" is one — the human knows when they are done.

---

## 6. Never let an unexercised criterion read as a pass

At the end of a run, every in-scope criterion sits in exactly one bucket:

- **Verified** — exercised, result observed, Pass or Fail recorded.
- **Flagged** — evidence gathered, human decision pending.
- **Engine-owned** — evaluated by a rule engine within its known reliability, marked as such.
- **Not applicable** — no content of the relevant type exists in scope. Say why: "no video content in scope" for 1.2.2.
- **Not exercised** — out of time, out of tooling reach, or blocked. Say which.

Absence of a violation is not a pass, and silence in a report is read as a pass by every
reader. The bucket assignment is what converts silence into an explicit, checkable statement.

---

## 7. Worked grading example

A dashboard renders per-item status indicators: a small filled circle rendered green when an
item is open and grey when it is closed, sitting to the left of the item title.

**The Verified half.** Query the accessibility tree for the indicator node.
\`span.status-dot[data-item="4821"]\` exposes no role, no accessible name, and no state — it is
presentational content with meaning conveyed only through a CSS \`background-color\`
declaration. Nothing in the tree distinguishes an open item from a closed one. This is a
Verified failure of **SC 1.3.1 Info and Relationships**: information conveyed through
presentation is not programmatically determinable. Evidence: the selector, the tree node with
its empty name and absent role, and the computed style showing the sole difference between
states is \`background-color\`. Severity Serious — a screen reader user can read every item but
cannot tell which are open.

**The Flagged half.** Is **colour the sole visual carrier** of open-versus-closed? That is
SC 1.4.1, and it is a genuinely harder question. The indicator might be positioned
differently for closed items. The dot's size or shape might vary. Adjacent text elsewhere in
the row — a date, a badge, a struck-through title — might carry the same information for a
user who cannot distinguish the hues. Determining that requires looking at the rendered
result as a whole and judging what a user would actually perceive. File it **◐ Flagged under
1.4.1**, with the screenshot and the note: "confirm whether any non-colour cue distinguishes
open from closed in the rendered row".

**Report at the lower grade with the verified fact attached.** The finding goes out as
Flagged, and the Verified 1.3.1 observation travels with it as supporting evidence. The
temptation to promote — "we proved the programmatic half, so surely the visual half follows"
— is exactly the error this file exists to prevent. Citing the deterministic half does not
license upgrading the whole. Two criteria, two grades, one finding.

---

## Pass conditions

- Does every finding carry both an evidence marker (●, ◐, ○) and a severity (Critical, Serious, Moderate, Minor), as two separate fields?
- Are evidence markers distinguishable without colour — that is, does the report survive being read in greyscale?
- Does every ● Verified finding cite a selector, the interaction performed, and the observed DOM or accessibility-tree fact?
- Does every ◐ Flagged finding name what a human must confirm, and stop at one selector plus at most one screenshot?
- Does every ○ Human-required finding include runnable steps and the assistive technology to run them with?
- Does the report state, in its opening lines, whether it was a scan or an audit — and if an audit, its scope, conformance target, assistive-technology baseline, and sampling method?
- Is a coverage ceiling stated, with its denominator named in the same sentence?
- Is every in-scope criterion assigned to exactly one of: verified, flagged, engine-owned, not applicable, not exercised?
- Is Undetermined used as a distinct state from Pass and Fail, and is nothing unexercised reported as passing?
- Is any criterion failing on any sampled page reported as failing for the whole scope, with no averaging or percentage framing?
- Where a finding spans two criteria at different evidence grades, is it reported at the lower grade with the verified fact attached as evidence?`,
      },
      {
        id: 'checkpoints-and-reporting',
        title: 'The seven checkpoint groups with criterion numbers, high-risk widget patterns, fix discipline, and report discipline',
        answers:
          'Which success criteria belong to which checkpoint group and what grade does each group default to, how do I review a combobox or data grid without guessing, which fixes may I apply directly, and what shape should the report take?',
        content: `# Checkpoint groups, high-risk patterns, fix discipline, and report discipline

The grading discipline in \`grading-and-conformance\` decides what a claim may say. This half decides
which criteria are worth exercising, in which order, and what happens to the result — the seven
checkpoint groups with their default grades, the widgets that defeat heuristics reliably enough that
guessing about them is a known error, which fixes may be applied directly, and the shape of a report
a reader can act on.

## 8. Checkpoint groups

Each group lists its criteria and the grade the group defaults to before you have specific
evidence.

### Keyboard and focus — default ● Verified

**2.1.1** keyboard operability, **2.1.2** no keyboard trap, **2.4.3** focus order, **2.4.7**
focus visible, **2.4.11** focus not obscured (minimum). These are the highest-value group
because they are almost entirely mechanical: press Tab, record what receives focus, check
whether the ring is visible and unclipped, check whether Escape and Shift+Tab release every
container. A defect here is reproducible on demand and rarely disputed.

2.4.11 has a mechanism worth stating: sticky headers, floating action bars, and cookie
banners overlay a focused element that has scrolled beneath them — the element still has
focus and the ring still renders, under the header, where the user cannot see it. Verify by
scrolling a focused control to the edge of each sticky region.

### Structure and semantics — default ● Verified with ◐ Flagged residue

**1.3.1** info and relationships, **1.3.2** meaningful sequence, **2.4.1** bypass blocks,
**2.4.6** headings and labels. Structural facts are verifiable: heading levels, landmark
presence, table header association, list markup, DOM order versus visual order. Whether a
heading is *descriptive* is a judgement — "Section 2" is a heading, and whether it describes
its section is not a fact you can query. Verify the structure, flag the wording.

### Names, roles, states — default ● Verified, with one exception

**4.1.2** name role value, **2.5.3** label in name, **4.1.3** status messages. Accessible
names, roles, and exposed states are all directly readable from the accessibility tree, and
2.5.3 is a string comparison between the visible label and the accessible name.

The exception is 4.1.3. That an \`aria-live\` region is **present**, has a valid politeness
value, and exists in the DOM before content is inserted into it — verifiable. That it
**actually announces**, at a useful moment, without being interrupted or swallowed, and
without flooding the user during rapid updates — human-required. Report the presence as
Verified and the announcement as a handoff. A region marked \`aria-live="polite"\` that is
created and populated in the same frame typically announces nothing at all in several screen
readers, and only a human listening will catch that.

### Visual adaptation — mixed

**1.4.4** resize text to 200%, **1.4.10** reflow at **320 CSS px** width without
two-dimensional scrolling, **1.4.12** text spacing, **1.4.11** non-text contrast at **3:1**,
**1.4.1** use of colour, **2.3.3** animation from interactions. Reflow and text spacing are
Verified by applying the override and observing clipping, overlap, or a horizontal scrollbar.
Contrast ratios are computed values and Verified when both foreground and background are
resolvable. They become Flagged when the background is a gradient, an image, a
\`backdrop-filter\`, or a semi-transparent layer over unknown content, because there is no
single background colour to measure — say which pixel region you sampled.

1.4.1 is Flagged by default, for the reason worked through in section 7.

### Forms and errors — mixed

**3.3.1** error identification, **3.3.2** labels or instructions, **3.3.3** error suggestion,
**1.3.5** identify input purpose, **3.3.7** redundant entry, **3.3.8** accessible
authentication (minimum). The **association** is verifiable: does the error message have an
id referenced by \`aria-describedby\` on the invalid field, is \`aria-invalid\` set, is the field
labelled. Whether the message actually **supports recovery** — whether "Invalid input" tells
a user what to change — is a human judgement, and it is the part that determines whether the
form is usable.

1.3.5 is verified by checking \`autocomplete\` tokens against the field's actual purpose. For
3.3.8, the presence of a cognitive function test is verifiable; whether an exception applies
is a judgement.

### Pointer and target — default ● Verified

**2.5.7** dragging movements, **2.5.8** target size (minimum) at **24×24 CSS px**, **2.5.1**
pointer gestures. Target size is measured from the bounding box, with the spacing exception
applying when undersized targets are separated by enough clear space that a 24 px circle
centred on each intersects no other target. Measure it; do not eyeball it. 2.5.7 and 2.5.1
require identifying whether a single-pointer or non-path-based alternative exists for each
drag or gesture, which is verifiable by attempting the alternative.

### Media and timing — mixed

**2.2.1** timing adjustable, **2.2.2** pause stop hide. Session timeouts, auto-advancing
carousels, and auto-playing motion longer than 5 seconds all fall here. The presence of a
pause control is verifiable. Whether a timeout warning gives sufficient time and is
announced is human-required.

---

## 9. High-risk patterns

Certain widgets defeat heuristics reliably enough that guessing about them is a known error
rather than a risk. Drag-and-drop interfaces, rich-text editors, tree views, data grids,
custom comboboxes and menus, carousels, and any interface built around toasts or frequent
live-region updates all belong here. What they share is that correctness depends on a
*keyboard interaction contract over time* — which key does what in which state, and what
gets announced when — and none of that is visible in a static snapshot of the DOM.

The procedure for each:

1. **Name the pattern** from the WAI-ARIA Authoring Practices Guide. "This is a combobox with
   a listbox popup" fixes the contract before any judgement is made.
2. **State the contract it owes** — the required roles and relationships, the required
   \`aria-expanded\` / \`aria-activedescendant\` / \`aria-selected\` state management, and the
   expected key bindings.
3. **Verify what is verifiable** — role names, relationship attributes, focus movement on
   each key press, state attribute values after each interaction. This is often most of the
   contract.
4. **Hand off the rest** as Human-required, with the specific steps. For a combobox: whether
   the filtered option count is announced as the user types, and whether the selected option
   is announced on arrow navigation without the user losing their typed text.

A counter-example: a review reports "the data grid is accessible — it has \`role="grid"\`,
\`aria-rowcount\`, and every cell has \`role="gridcell"\`". All true, all verifiable, and the grid
is unusable: arrow keys scroll the page instead of moving the cell cursor, and no cell is ever
reachable by keyboard. The roles were verified; the contract was not.

---

## 10. Fix discipline

**Apply mechanical fixes directly.** A missing \`type="button"\`, a \`<div onclick>\` that should
be a \`<button>\`, a missing \`lang\` attribute on \`<html>\`, a form control whose \`<label>\` has no
\`for\`, a heading level skipped from \`h2\` to \`h4\` — these have one correct answer that does not
depend on knowing what the interface means.

**Leave a TODO with the criterion number for contextual or visual fixes.** Alt text, link
text, error message wording, colour value changes, and focus order restructuring all require
knowing intent. Format: \`TODO(a11y 1.1.1): image has no alt text; author must supply
description or mark decorative\`.

**Do not invent alt text, labels, or link text.** Invented content passes the automated check
while still failing the user, and it *removes the signal that a problem exists*. An image
given \`alt="image"\`, or \`alt=""\` applied to a non-decorative image, is worse than one with no
alt attribute at all, because the linter now reports zero violations and nobody will look
again. An open TODO is a smaller problem than a closed one that was never solved.

**Confirm scope before editing** beyond the obvious target, or before applying more than
about ten mechanical fixes in one pass. A review that quietly rewrites forty files is no
longer a review, and the reader cannot separate your accessibility changes from their own
pending work.

**If verification fails, report it and stop.** When a fix does not produce the expected tree
state, say so and hand it back. Do not iterate silently through variations — an undisclosed
sequence of four attempts leaves the codebase in a state nobody can reason about, and the
reader believes the fix worked.

---

## 11. Report discipline

The ledger is **counts and bare criterion numbers**. Prose in the ledger is the single
largest source of unreadable accessibility reports, because a reader scanning for the
Critical items has to read past four paragraphs of context to find them.

**Group undetermined criteria by shared reason**, one clause per group: "Not exercised — no
screen reader available in this environment: 1.3.2, 2.4.3, 4.1.3." One line per undetermined
criterion produces thirty lines saying the same thing thirty times, and the reader stops
reading at line six.

**Passes get at most one sentence in total**, for the whole report: "17 criteria verified
conforming across the sampled pages." A per-criterion celebration of things that are fine
buries the things that are not. If the reader needs the detail, it belongs in an appendix or
a machine-readable artefact, not in the body.

**The words go to failures, flags, and handoffs** — the entries a reader can act on. Every
failure gets its selector, its interaction, its observed fact, and its severity. Every flag
gets its one-sentence opinion and its one-sentence confirmation request. Every handoff gets
its runnable steps. Everything else is compressed.

State the **method line** first: scan or audit, scope, conformance target, assistive-
technology baseline, coverage ceiling. Four lines that prevent every subsequent misreading.

---

---

## Pass conditions

- For each high-risk widget encountered, is the WAI-ARIA Authoring Practices pattern named and its keyboard and ARIA contract stated?
- Were only mechanical fixes applied directly, with contextual and visual ones left as \`TODO(a11y <criterion>)\`, and no invented alt text, label text, or link text in the diff?
- Was scope confirmed before editing beyond the named target or before more than ten mechanical fixes, and was any failed verification reported rather than silently retried?
- Are undetermined criteria grouped by shared reason, one clause per group rather than one line per criterion?
- Do passing criteria occupy no more than one sentence in the whole report?`,
      },
    ],
  },

  rules: [
    {
      id: 'accessibility-evidence/two-axes-never-one-score',
      strength: 'must-not',
      statement:
        'Do not collapse evidence basis and severity into a single priority score; carry the marker (●, ◐, ○) and the severity as two separate fields on every finding.',
      evidence: {
        rationale:
          'The two axes answer different questions and a single number is lossy in the direction that matters: the reader cannot tell whether a low score means "small problem" or "we are not sure this is a problem". Those demand opposite responses — the first is deferred to a backlog, the second is investigated — so a merged score routinely sends the wrong one.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'P3 — status dot may not be accessible',
        good: '◐ Flagged · Serious · SC 1.4.1 — `span.status-dot[data-item="4821"]`',
      },
      verifiedBy: 'grading-integrity',
    },
    {
      id: 'accessibility-evidence/take-the-lower-grade',
      strength: 'must',
      statement:
        'When a finding sits plausibly between two grades or two severities, file the lower one, and report a finding spanning two criteria at the lower grade with the verified fact attached as evidence.',
      evidence: {
        rationale:
          'The cost is asymmetric. An under-graded finding costs one round of triage. An over-graded finding that a human disproves teaches the reader that your grades are inflated, after which they discount every other finding in the report — including the correct Critical ones. Credibility is the scarce resource, not coverage, and citing the deterministic half of a finding does not license upgrading the whole of it.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: '● Verified · Critical — colour is the sole cue distinguishing open from closed (1.4.1)',
        good: '◐ Flagged · Serious — 1.4.1: confirm whether a non-colour cue distinguishes open from closed. Verified 1.3.1 evidence attached: the node exposes no role, name, or state.',
      },
      verifiedBy: 'grading-integrity',
    },
    {
      id: 'accessibility-evidence/fill-based-markers',
      strength: 'must',
      statement:
        'Grade evidence with the fill-based markers ●, ◐ and ○, never with colour alone.',
      evidence: {
        rationale:
          'A report that grades its own findings by red, amber and green fails SC 1.4.1 — the criterion it is auditing — and a reviewer with deuteranopia cannot extract the grades at all. Fill is a shape difference, so filled, half-filled and hollow survive greyscale printing, monochrome terminals, and colour vision deficiency.',
        source: 'WCAG 2.2 SC 1.4.1 Use of Color',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html',
        confidence: 'established',
      },
      examples: {
        language: 'markdown',
        bad: '<span style="color:red">High</span> · <span style="color:green">Low</span>',
        good: '● Verified · ◐ Flagged · ○ Human-required',
      },
      verifiedBy: 'grading-integrity',
    },
    {
      id: 'accessibility-evidence/verified-claims-cite-three-things',
      strength: 'must',
      statement:
        'Cite the selector, the interaction performed, and the observed DOM or accessibility-tree fact on every ● Verified finding.',
      evidence: {
        rationale:
          'Verified means reproducible, and reproducibility is exactly what those three fields supply — a second person can re-run the interaction against the selector and compare against the recorded observation. "The button has no accessible name" cannot be re-run, so it is an assertion at Verified confidence with nothing behind it, which is the failure this grade exists to prevent.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: '● Verified — the submit button has no accessible name.',
        good: '● Verified — `button.cart-submit`; queried the accessibility tree after load; node exposes role=button with an empty name, and no text content, `aria-label`, or `aria-labelledby`.',
      },
      verifiedBy: 'grading-integrity',
    },
    {
      id: 'accessibility-evidence/unexercised-is-never-a-pass',
      strength: 'must-not',
      statement:
        'Do not report a criterion as passing because no violation was raised for it; a criterion that was not exercised is Undetermined, with the reason stated.',
      evidence: {
        rationale:
          'Absence of a violation is evidence about the engine, not about the product, and silence in a report is read as a pass by every reader. A ledger listing 38 "passed" criteria because the scanner raised nothing includes 2.1.1, which no scanner can evaluate — it never pressed Tab — so the report claims keyboard accessibility on a page whose custom slider is mouse-only.',
        confidence: 'established',
      },
      examples: {
        language: 'markdown',
        bad: 'Passed: 2.1.1 Keyboard (no violations reported)',
        good: 'Undetermined — not exercised, no keyboard pass performed in this environment: 2.1.1, 2.1.2, 2.4.3',
      },
      verifiedBy: 'conformance-bucket-audit',
    },
    {
      id: 'accessibility-evidence/pass-fail-only-when-verified',
      strength: 'must',
      statement:
        'Record Pass only where a criterion was exercised and every applicable instance was Verified as conforming, Fail only on a Verified non-conformance, and Undetermined for everything else.',
      evidence: {
        rationale:
          'Pass and Fail are conformance claims and a claim is bounded by its evidence: Flagged and Human-required findings are by definition unresolved, so binning them into either column states a result the run did not produce. Undetermined is where most criteria honestly land after most runs, and having the third state is what makes the first two mean something.',
        source: 'W3C WCAG-EM, evaluation reporting',
        url: 'https://www.w3.org/TR/WCAG-EM/',
        confidence: 'established',
      },
      examples: {
        language: 'markdown',
        bad: '4.1.3 Status messages — Pass (live region present)',
        good: '4.1.3 — Pass on presence (● region present, polite, in DOM before insertion); Undetermined on announcement (○ handoff)',
      },
      verifiedBy: 'conformance-bucket-audit',
    },
    {
      id: 'accessibility-evidence/no-averaging-across-scope',
      strength: 'must',
      statement:
        'Report a criterion that fails on any sampled page as failing for the entire scope, with no percentage or "mostly passing" framing.',
      evidence: {
        rationale:
          'Conformance is a conjunction across the scope, not a mean over pages, so "9 of 10 pages pass 2.4.3" is a fail with a known distribution rather than a 90% pass. Expressing it as a percentage invites the reader to infer nearly-conforming, which is exactly the inference the standard does not license and which turns a blocking defect into a rounding error.',
        source: 'WCAG 2.2 conformance requirements, full pages and complete processes',
        url: 'https://www.w3.org/TR/WCAG22/#conformance-reqs',
        confidence: 'established',
      },
      examples: {
        language: 'markdown',
        bad: '2.4.3 Focus Order — 90% conforming (9/10 pages)',
        good: '2.4.3 Focus Order — Fail for scope; observed on /checkout/payment, not reproduced on the other 9 sampled pages',
      },
      verifiedBy: 'conformance-bucket-audit',
    },
    {
      id: 'accessibility-evidence/never-invent-accessible-text',
      strength: 'must-not',
      statement:
        'Do not invent alt text, accessible names, labels, or link text, and do not mark a non-decorative image as decorative; leave a TODO naming the criterion instead.',
      evidence: {
        rationale:
          'Invented content passes the automated check while still failing the user, and it removes the signal that a problem exists — the linter now reports zero violations for that element and nobody looks again. An image given alt="image", or an empty alt on a meaningful image, is therefore worse than no alt attribute at all: an open problem is smaller than a closed one that was never solved.',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<img src="/chart-q3.png" alt="image">',
        good: '<!-- TODO(a11y 1.1.1): image has no alt text; author must supply description or mark decorative -->\n<img src="/chart-q3.png">',
      },
      verifiedBy: 'fix-and-scope-review',
    },
    {
      id: 'accessibility-evidence/method-line-and-coverage-ceiling',
      strength: 'must',
      statement:
        'Call a single-URL run with no sampling a scan rather than an audit, and open the report with a method line: scope, conformance target, assistive-technology baseline, and the coverage ceiling with its denominator.',
      evidence: {
        rationale:
          'The word "audit" carries an implied conformance claim that a single page cannot support, since a page can be flawless while the flow it belongs to traps the keyboard two steps later. The ceiling matters for the same reason: automation catches roughly 57% of real defects, and the much higher figure often quoted counts criteria that are partially detectable, a different denominator entirely.',
        source: 'W3C WCAG-EM evaluation procedure; Deque automated coverage analysis',
        url: 'https://www.w3.org/TR/WCAG-EM/',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: '# Accessibility audit — example.com\n0 violations found.',
        good: '# Accessibility scan — https://example.com/ (one URL, one pass, no sampling; supports no conformance claim)\nTarget: WCAG 2.2 AA. Baseline: none exercised. Ceiling: automation detects ~57% of real defects (share of defects, not share of criteria).',
      },
      verifiedBy: 'report-shape-review',
    },
    {
      id: 'accessibility-evidence/stop-on-failed-verification',
      strength: 'must',
      statement:
        'When a fix does not produce the expected accessibility-tree state, report the failure and hand it back rather than iterating silently through variations.',
      evidence: {
        rationale:
          'An undisclosed sequence of attempts leaves the codebase in a state nobody can reason about, and the reader believes the fix worked because the report says a fix was applied. The same mechanism bounds scope: a review that quietly rewrites forty files is no longer a review, since the reader can no longer separate your accessibility changes from their own pending work.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'Fixed the combobox. (four undisclosed attempts; tree still exposes aria-expanded on the wrong node)',
        good: 'Attempted fix on `#city-combobox` did not produce the expected tree state — aria-expanded remains on the wrapper after activation. Reverted; handing back with the observed tree.',
      },
      verifiedBy: 'fix-and-scope-review',
    },
  ],

  verification: [
    {
      id: 'grading-integrity',
      kind: 'self-review',
      description: 'Confirm each finding is graded on two axes, at the grade its evidence supports.',
      blocking: true,
      questions: [
        'Does every finding in the output carry an evidence marker and a severity as two separate fields, with no merged priority score anywhere?',
        'Are the markers fill-based (●, ◐, ○) so the report survives being read in greyscale?',
        'For each ● Verified finding, did you write down a selector, the interaction you performed, and the fact you observed — and could a second person re-run it from that alone?',
        'For any finding you were torn about, did you file the lower grade, and does any finding spanning two criteria go out at the lower of the two with the verified fact attached?',
        'Does any ◐ Flagged finding carry more than one selector and one screenshot, or any ○ Human-required finding lack runnable steps and a named assistive technology?',
      ],
    },
    {
      id: 'conformance-bucket-audit',
      kind: 'self-review',
      description: 'Confirm every in-scope criterion is bucketed and nothing unexercised reads as a pass.',
      questions: [
        'List every in-scope criterion: is each one in exactly one of verified, flagged, engine-owned, not applicable, or not exercised?',
        'Is any criterion sitting in the Pass column purely because a rule engine raised no violation for it?',
        'Does any criterion marked "not applicable" or "not exercised" lack its stated reason?',
        'Does any criterion failing on one sampled page appear as anything other than a fail for the whole scope, or appear as a percentage?',
      ],
    },
    {
      id: 'report-shape-review',
      kind: 'self-review',
      description: 'Confirm the report opens with its method and spends its words where a reader can act.',
      questions: [
        'Does the first paragraph say scan or audit, and for an audit give scope, conformance target, assistive-technology baseline, and sampling method?',
        'Is a coverage ceiling stated with its denominator named in the same sentence rather than a bare percentage?',
        'Are undetermined criteria grouped by shared reason, one clause per group, rather than one line per criterion?',
        'Do passing criteria occupy at most one sentence in the whole report, and is the ledger counts and bare criterion numbers rather than prose?',
      ],
    },
    {
      id: 'fix-and-scope-review',
      kind: 'self-review',
      description: 'Confirm only mechanical fixes were applied and nothing was invented or silently retried.',
      questions: [
        'Read the diff: is every change mechanical with one correct answer, or did a fix requiring knowledge of intent get applied anyway?',
        'Does the diff contain any alt text, accessible name, label, or link text that you supplied rather than found — including an empty alt on a meaningful image?',
        'Does every contextual or visual issue left unfixed carry a TODO naming its criterion number?',
        'Did the edit stay inside the named target, and was scope confirmed before exceeding about ten mechanical fixes?',
        'Did any fix fail verification, and if so is that reported rather than retried silently?',
      ],
    },
  ],

  relatedSkills: ['accessible-components', 'design-review', 'interface-states', 'engineering-discipline'],
}
