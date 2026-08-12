# Evidence grades, severity, coverage, scan versus audit, and conformance states

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
- Where a finding spans two criteria at different evidence grades, is it reported at the lower grade with the verified fact attached as evidence?
