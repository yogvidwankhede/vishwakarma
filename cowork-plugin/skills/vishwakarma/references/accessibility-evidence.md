# Accessibility Evidence

A finding is worth exactly what its evidence is worth. A report that mixes facts observed in the
accessibility tree with guesses inferred from a screenshot, and prints both in the same typeface
at the same confidence, has destroyed the value of the facts rather than raised the value of the
guesses. The discipline is not finding more issues; it is refusing to state anything at a
confidence the evidence does not carry. The rule catalogue — what a dialog owes, how a combobox is
wired — lives in `accessible-components`. This governs how claims are made, graded, and reported.
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
"The button has no accessible name" is not verified. "`button.cart-submit` — queried the
accessibility tree after page load; the node exposes role=button and an empty name, and the element
has no text content, `aria-label`, or `aria-labelledby`" is verified, because a second person can
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
as supporting evidence. Citing the deterministic half does not license upgrading the whole.

## Rules

### MUST NOT — Do not collapse evidence basis and severity into a single priority score; carry the marker (●, ◐, ○) and the severity as two separate fields on every finding.

*Why:* The two axes answer different questions and a single number is lossy in the direction that matters: the reader cannot tell whether a low score means "small problem" or "we are not sure this is a problem". Those demand opposite responses — the first is deferred to a backlog, the second is investigated — so a merged score routinely sends the wrong one.

Incorrect:

```markdown
P3 — status dot may not be accessible
```

Correct:

```markdown
◐ Flagged · Serious · SC 1.4.1 — `span.status-dot[data-item="4821"]`
```

### MUST NOT — Do not report a criterion as passing because no violation was raised for it; a criterion that was not exercised is Undetermined, with the reason stated.

*Why:* Absence of a violation is evidence about the engine, not about the product, and silence in a report is read as a pass by every reader. A ledger listing 38 "passed" criteria because the scanner raised nothing includes 2.1.1, which no scanner can evaluate — it never pressed Tab — so the report claims keyboard accessibility on a page whose custom slider is mouse-only.

Incorrect:

```markdown
Passed: 2.1.1 Keyboard (no violations reported)
```

Correct:

```markdown
Undetermined — not exercised, no keyboard pass performed in this environment: 2.1.1, 2.1.2, 2.4.3
```

### MUST NOT — Do not invent alt text, accessible names, labels, or link text, and do not mark a non-decorative image as decorative; leave a TODO naming the criterion instead.

*Why:* Invented content passes the automated check while still failing the user, and it removes the signal that a problem exists — the linter now reports zero violations for that element and nobody looks again. An image given alt="image", or an empty alt on a meaningful image, is therefore worse than no alt attribute at all: an open problem is smaller than a closed one that was never solved.

Incorrect:

```html
<img src="/chart-q3.png" alt="image">
```

Correct:

```html
<!-- TODO(a11y 1.1.1): image has no alt text; author must supply description or mark decorative -->
<img src="/chart-q3.png">
```

### MUST — When a finding sits plausibly between two grades or two severities, file the lower one, and report a finding spanning two criteria at the lower grade with the verified fact attached as evidence.

*Why:* The cost is asymmetric. An under-graded finding costs one round of triage. An over-graded finding that a human disproves teaches the reader that your grades are inflated, after which they discount every other finding in the report — including the correct Critical ones. Credibility is the scarce resource, not coverage, and citing the deterministic half of a finding does not license upgrading the whole of it.

Incorrect:

```markdown
● Verified · Critical — colour is the sole cue distinguishing open from closed (1.4.1)
```

Correct:

```markdown
◐ Flagged · Serious — 1.4.1: confirm whether a non-colour cue distinguishes open from closed. Verified 1.3.1 evidence attached: the node exposes no role, name, or state.
```

### MUST — Grade evidence with the fill-based markers ●, ◐ and ○, never with colour alone.

*Why:* A report that grades its own findings by red, amber and green fails SC 1.4.1 — the criterion it is auditing — and a reviewer with deuteranopia cannot extract the grades at all. Fill is a shape difference, so filled, half-filled and hollow survive greyscale printing, monochrome terminals, and colour vision deficiency.

*Source:* [WCAG 2.2 SC 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)

Incorrect:

```markdown
<span style="color:red">High</span> · <span style="color:green">Low</span>
```

Correct:

```markdown
● Verified · ◐ Flagged · ○ Human-required
```

### MUST — Cite the selector, the interaction performed, and the observed DOM or accessibility-tree fact on every ● Verified finding.

*Why:* Verified means reproducible, and reproducibility is exactly what those three fields supply — a second person can re-run the interaction against the selector and compare against the recorded observation. "The button has no accessible name" cannot be re-run, so it is an assertion at Verified confidence with nothing behind it, which is the failure this grade exists to prevent.

Incorrect:

```markdown
● Verified — the submit button has no accessible name.
```

Correct:

```markdown
● Verified — `button.cart-submit`; queried the accessibility tree after load; node exposes role=button with an empty name, and no text content, `aria-label`, or `aria-labelledby`.
```

### MUST — Record Pass only where a criterion was exercised and every applicable instance was Verified as conforming, Fail only on a Verified non-conformance, and Undetermined for everything else.

*Why:* Pass and Fail are conformance claims and a claim is bounded by its evidence: Flagged and Human-required findings are by definition unresolved, so binning them into either column states a result the run did not produce. Undetermined is where most criteria honestly land after most runs, and having the third state is what makes the first two mean something.

*Source:* [W3C WCAG-EM, evaluation reporting](https://www.w3.org/TR/WCAG-EM/)

Incorrect:

```markdown
4.1.3 Status messages — Pass (live region present)
```

Correct:

```markdown
4.1.3 — Pass on presence (● region present, polite, in DOM before insertion); Undetermined on announcement (○ handoff)
```

### MUST — Report a criterion that fails on any sampled page as failing for the entire scope, with no percentage or "mostly passing" framing.

*Why:* Conformance is a conjunction across the scope, not a mean over pages, so "9 of 10 pages pass 2.4.3" is a fail with a known distribution rather than a 90% pass. Expressing it as a percentage invites the reader to infer nearly-conforming, which is exactly the inference the standard does not license and which turns a blocking defect into a rounding error.

*Source:* [WCAG 2.2 conformance requirements, full pages and complete processes](https://www.w3.org/TR/WCAG22/#conformance-reqs)

Incorrect:

```markdown
2.4.3 Focus Order — 90% conforming (9/10 pages)
```

Correct:

```markdown
2.4.3 Focus Order — Fail for scope; observed on /checkout/payment, not reproduced on the other 9 sampled pages
```

### MUST — Call a single-URL run with no sampling a scan rather than an audit, and open the report with a method line: scope, conformance target, assistive-technology baseline, and the coverage ceiling with its denominator.

*Why:* The word "audit" carries an implied conformance claim that a single page cannot support, since a page can be flawless while the flow it belongs to traps the keyboard two steps later. The ceiling matters for the same reason: automation catches roughly 57% of real defects, and the much higher figure often quoted counts criteria that are partially detectable, a different denominator entirely.

*Source:* [W3C WCAG-EM evaluation procedure; Deque automated coverage analysis](https://www.w3.org/TR/WCAG-EM/)

Incorrect:

```markdown
# Accessibility audit — example.com
0 violations found.
```

Correct:

```markdown
# Accessibility scan — https://example.com/ (one URL, one pass, no sampling; supports no conformance claim)
Target: WCAG 2.2 AA. Baseline: none exercised. Ceiling: automation detects ~57% of real defects (share of defects, not share of criteria).
```

### MUST — When a fix does not produce the expected accessibility-tree state, report the failure and hand it back rather than iterating silently through variations.

*Why:* An undisclosed sequence of attempts leaves the codebase in a state nobody can reason about, and the reader believes the fix worked because the report says a fix was applied. The same mechanism bounds scope: a review that quietly rewrites forty files is no longer a review, since the reader can no longer separate your accessibility changes from their own pending work.

Incorrect:

```markdown
Fixed the combobox. (four undisclosed attempts; tree still exposes aria-expanded on the wrong node)
```

Correct:

```markdown
Attempted fix on `#city-combobox` did not produce the expected tree state — aria-expanded remains on the wrapper after activation. Reverted; handing back with the observed tree.
```

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm each finding is graded on two axes, at the grade its evidence supports. (blocking)

- Does every finding in the output carry an evidence marker and a severity as two separate fields, with no merged priority score anywhere?
- Are the markers fill-based (●, ◐, ○) so the report survives being read in greyscale?
- For each ● Verified finding, did you write down a selector, the interaction you performed, and the fact you observed — and could a second person re-run it from that alone?
- For any finding you were torn about, did you file the lower grade, and does any finding spanning two criteria go out at the lower of the two with the verified fact attached?
- Does any ◐ Flagged finding carry more than one selector and one screenshot, or any ○ Human-required finding lack runnable steps and a named assistive technology?

### Confirm every in-scope criterion is bucketed and nothing unexercised reads as a pass.

- List every in-scope criterion: is each one in exactly one of verified, flagged, engine-owned, not applicable, or not exercised?
- Is any criterion sitting in the Pass column purely because a rule engine raised no violation for it?
- Does any criterion marked "not applicable" or "not exercised" lack its stated reason?
- Does any criterion failing on one sampled page appear as anything other than a fail for the whole scope, or appear as a percentage?

### Confirm the report opens with its method and spends its words where a reader can act.

- Does the first paragraph say scan or audit, and for an audit give scope, conformance target, assistive-technology baseline, and sampling method?
- Is a coverage ceiling stated with its denominator named in the same sentence rather than a bare percentage?
- Are undetermined criteria grouped by shared reason, one clause per group, rather than one line per criterion?
- Do passing criteria occupy at most one sentence in the whole report, and is the ledger counts and bare criterion numbers rather than prose?

### Confirm only mechanical fixes were applied and nothing was invented or silently retried.

- Read the diff: is every change mechanical with one correct answer, or did a fix requiring knowledge of intent get applied anyway?
- Does the diff contain any alt text, accessible name, label, or link text that you supplied rather than found — including an empty alt on a meaningful image?
- Does every contextual or visual issue left unfixed carry a TODO naming its criterion number?
- Did the edit stay inside the named target, and was scope confirmed before exceeding about ten mechanical fixes?
- Did any fix fail verification, and if so is that reported rather than retried silently?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/grading-and-conformance.md` — How do I grade a finding on evidence and severity separately, what may a scan claim that an audit can, when is a criterion Pass rather than Undetermined, how much evidence is a finding worth, and how do I report one finding that spans two criteria at two grades?
- `references/checkpoints-and-reporting.md` — Which success criteria belong to which checkpoint group and what grade does each group default to, how do I review a combobox or data grid without guessing, which fixes may I apply directly, and what shape should the report take?
