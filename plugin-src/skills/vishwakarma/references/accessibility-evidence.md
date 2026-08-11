# Accessibility Evidence

An accessibility finding is worth exactly what its evidence is worth. A report that mixes
facts observed in the accessibility tree with guesses inferred from a screenshot, and prints
them in the same typeface with the same confidence, has destroyed the value of the facts
rather than raised the value of the guesses. The discipline here is not finding more issues;
it is refusing to state anything at a confidence the evidence does not carry. The rule
catalogue — what a correct dialog owes, how a combobox is wired — lives in
`accessible-components.md`. This file governs how you make, grade, and report claims.

---

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
name" is not verified. "`button.cart-submit` — queried the accessibility tree after page
load; the node exposes `role=button`, `name=""`, and the element has no text content,
`aria-label`, or `aria-labelledby`" is verified. The difference is that a second person can
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
— a table without header cells — and misses others entirely — a `<div>` styled as a heading —
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
`span.status-dot[data-item="4821"]` exposes no role, no accessible name, and no state — it is
presentational content with meaning conveyed only through a CSS `background-color`
declaration. Nothing in the tree distinguishes an open item from a closed one. This is a
Verified failure of **SC 1.3.1 Info and Relationships**: information conveyed through
presentation is not programmatically determinable. Evidence: the selector, the tree node with
its empty name and absent role, and the computed style showing the sole difference between
states is `background-color`. Severity Serious — a screen reader user can read every item but
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

The exception is 4.1.3. That an `aria-live` region is **present**, has a valid politeness
value, and exists in the DOM before content is inserted into it — verifiable. That it
**actually announces**, at a useful moment, without being interrupted or swallowed, and
without flooding the user during rapid updates — human-required. Report the presence as
Verified and the announcement as a handoff. A region marked `aria-live="polite"` that is
created and populated in the same frame typically announces nothing at all in several screen
readers, and only a human listening will catch that.

### Visual adaptation — mixed

**1.4.4** resize text to 200%, **1.4.10** reflow at **320 CSS px** width without
two-dimensional scrolling, **1.4.12** text spacing, **1.4.11** non-text contrast at **3:1**,
**1.4.1** use of colour, **2.3.3** animation from interactions. Reflow and text spacing are
Verified by applying the override and observing clipping, overlap, or a horizontal scrollbar.
Contrast ratios are computed values and Verified when both foreground and background are
resolvable. They become Flagged when the background is a gradient, an image, a
`backdrop-filter`, or a semi-transparent layer over unknown content, because there is no
single background colour to measure — say which pixel region you sampled.

1.4.1 is Flagged by default, for the reason worked through in section 7.

### Forms and errors — mixed

**3.3.1** error identification, **3.3.2** labels or instructions, **3.3.3** error suggestion,
**1.3.5** identify input purpose, **3.3.7** redundant entry, **3.3.8** accessible
authentication (minimum). The **association** is verifiable: does the error message have an
id referenced by `aria-describedby` on the invalid field, is `aria-invalid` set, is the field
labelled. Whether the message actually **supports recovery** — whether "Invalid input" tells
a user what to change — is a human judgement, and it is the part that determines whether the
form is usable.

1.3.5 is verified by checking `autocomplete` tokens against the field's actual purpose. For
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
   `aria-expanded` / `aria-activedescendant` / `aria-selected` state management, and the
   expected key bindings.
3. **Verify what is verifiable** — role names, relationship attributes, focus movement on
   each key press, state attribute values after each interaction. This is often most of the
   contract.
4. **Hand off the rest** as Human-required, with the specific steps. For a combobox: whether
   the filtered option count is announced as the user types, and whether the selected option
   is announced on arrow navigation without the user losing their typed text.

A counter-example: a review reports "the data grid is accessible — it has `role="grid"`,
`aria-rowcount`, and every cell has `role="gridcell"`". All true, all verifiable, and the grid
is unusable: arrow keys scroll the page instead of moving the cell cursor, and no cell is ever
reachable by keyboard. The roles were verified; the contract was not.

---

## 10. Fix discipline

**Apply mechanical fixes directly.** A missing `type="button"`, a `<div onclick>` that should
be a `<button>`, a missing `lang` attribute on `<html>`, a form control whose `<label>` has no
`for`, a heading level skipped from `h2` to `h4` — these have one correct answer that does not
depend on knowing what the interface means.

**Leave a TODO with the criterion number for contextual or visual fixes.** Alt text, link
text, error message wording, colour value changes, and focus order restructuring all require
knowing intent. Format: `TODO(a11y 1.1.1): image has no alt text; author must supply
description or mark decorative`.

**Do not invent alt text, labels, or link text.** Invented content passes the automated check
while still failing the user, and it *removes the signal that a problem exists*. An image
given `alt="image"`, or `alt=""` applied to a non-decorative image, is worse than one with no
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
- Are undetermined criteria grouped by shared reason, one clause per group rather than one line per criterion?
- Do passing criteria occupy no more than one sentence in the whole report?
- Where a finding spans two criteria at different evidence grades, is it reported at the lower grade with the verified fact attached as evidence?
- For each high-risk widget encountered, is the WAI-ARIA Authoring Practices pattern named and its keyboard and ARIA contract stated?
- Were only mechanical fixes applied directly, with contextual and visual ones left as `TODO(a11y <criterion>)`, and no invented alt text, label text, or link text in the diff?
- Was scope confirmed before editing beyond the named target or before more than ten mechanical fixes, and was any failed verification reported rather than silently retried?
