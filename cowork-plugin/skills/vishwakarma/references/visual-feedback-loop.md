# Visual Feedback Loop

Read any verification block in this catalogue and ask what it actually requires. *Where does
the eye land first? Is the section-to-element spacing ratio at least 3:1? Does anything
overflow at 320px? Is the focus indicator visible at every stop?* None of those can be
answered from source. An agent that answers them anyway is reporting a prediction in the
grammar of an observation — and the prediction is optimistic, because the page it is imagining
is the page it meant to build.

That is the whole mechanism behind "it builds it but never finishes it". The guidance was
fine. The checking was imaginary.

---

## 1. The loop

**Render → Measure → Observe → Correct one class → Re-render.** Stop when every finding is
closed or explicitly deferred with a reason. Not when you run out of ideas.

Each arrow has a failure mode, and they are the reason the loop is written down rather than
left to judgement:

- **Render** without determinism controls and the page differs between passes, so you cannot
  tell whether your correction worked or the page simply changed.
- **Measure** and **observe** are different instruments for different questions, and using
  one to answer the other's question is how fabricated findings enter a report.
- **Correct one class** — fix eight things at once and the page still looks wrong, and you
  have lost attribution for all eight.
- **Re-render** or the loop is not a loop; it is a list of intentions.

---

## 2. Measure what source cannot show

`@vishwakarma/audit` already states its own blind spots in `STATIC_ANALYSIS_LIMITS`, and one
line of that list is the brief for this skill: contrast, touch-target size and layout overflow
"need a rendered page; they are not checked here". Run the static pass first because it is
cheap and it is a lower bound, then render to cover what it cannot see.

The runtime path is already built, and `checkContract` was written for exactly this use:

```ts
import { checkContract, type DesignContract } from '@vishwakarma/core'
import { formatContractReport, observeElement } from '@vishwakarma/testing'

const observation = observeElement(document.body)
const report = checkContract(contract, observation)
if (!report.passed) console.log(formatContractReport(report))
```

`observeElement` encodes the distinction this whole skill turns on: a field it could not
populate is left **absent**, not empty, because `checkContract` scores an absent field as
"not observed" and an empty array as "observed, and there were none". Those are different
facts and a report that conflates them is worse than no report.

---

## 3. Three outcomes, never two

Every check resolves to exactly one of these, and the third is the one that gets lost:

| Outcome | Means | Written as |
|---|---|---|
| **Measured** | A number was extracted from a rendered page and compared | the number, and the threshold |
| **Observed** | A human-or-model judgement made against actual pixels | what was seen, at which viewport |
| **Not exercised** | The check did not run | *why*, and what would make it runnable |

`accessibility-evidence` owns this discipline for accessibility findings, and its rule
generalises without change: **never let an unexercised criterion read as a pass.** A
verification list with thirteen questions and thirteen confident ticks, where four of the
questions needed a rendered page and nothing was rendered, is the most expensive artefact in
this entire workflow, because it terminates the loop while the defects are still there.

---

## 4. Observe and measure are different instruments

A screenshot answers what only pixels can answer: where the eye lands, whether the page reads
as one system, whether a break-out feels deliberate or accidental, whether the composition is
framed. It cannot tell you a ratio.

A DOM measurement answers what the eye is unreliable at: the spacing histogram, the type-size
census, contrast ratios, overflow, focus order against visual order. It cannot tell you
whether the result is any good.

Two rules follow. **Never state a measured fact you took from a picture** — "the gap looks
like 24px" is not a measurement. **Never state an aesthetic judgement as a measurement** —
a contract score of 92 is not "the hierarchy works". `extraction-queries.md` has the runtime
queries; `render-harness.md` has how to get the pixels.

---

## 5. The sweep is six viewports, not one

`REQUIRED_VIEWPORTS` from `@vishwakarma/core` is the release-blocking set: 320×568, 390×844,
768×1024, 1024×768, 1440×900, and 1280×800 at 200% zoom. Each is in the matrix with a stated
rationale — 320 is there because "almost every horizontal-overflow bug that exists is visible
here and nowhere else". Checking one width and reporting the page responsive is a
not-exercised outcome wearing a pass.

---

## 6. When you genuinely cannot render

Say so once, at the top, before any finding. Then review what source proves — literal colour
contrast, tokens versus hard-coded values, semantic markup, focus code inside modals, which
properties are animated, whether empty and error branches exist at all — and mark everything
else *not exercised — requires a running build*. `design-review` owns that reduced pass, and
this is the one case where the loop legitimately does not run. It is not the default, and
"there is no dev server" is worth thirty seconds of checking before it is accepted.

---

**Boundaries.** `design-review` owns the passes and how a finding is written.
`design-judgment` owns what counts as good. `accessibility-evidence` owns evidence grading,
and this skill borrows its rule rather than restating it. `code-quality` owns screenshot tests
as CI artefacts — this loop is a build-time instrument, not a test suite.
`methodology-feedback` owns what to do when the same finding keeps recurring: that is a
guidance gap, not a defect. `ship-readiness` owns whether the finished thing is honest.

## Rules

### MUST NOT — Do not reimplement contrast, touch-target, focus-order or contract checking; call the @vishwakarma/testing and @vishwakarma/core implementations.

*Why:* A second implementation of contrast is a second definition of contrast, and the two will disagree on exactly the cases that matter — translucent layers, gradients and images — because measureContrast resolves the real backdrop through the ancestor chain rather than assuming the nearest declared background.

### MUST NOT — Do not state a number taken from a screenshot as a measurement, and do not state a contract score as an aesthetic judgement.

*Why:* The two instruments answer different questions and neither can answer the other’s. "The gap looks like 24px" is an estimate presented as a fact, and a score of 92 says nothing about whether the hierarchy works — measurements cannot detect their own incompleteness, which is why a rising score beside an unchanged screenshot means the loop is optimising the wrong subset.

### MUST NOT — Do not treat a contract score or a clean static audit as evidence of absence; quote the checked count and the stated limits.

*Why:* observeElement caps its walk for speed and identifies text elements by selector, so it deliberately under-reports; auditProject reads only literal text and skips calc, var and clamp rather than guessing. Both are lower bounds by construction, and every report format in the audit package carries that caveat precisely so a summary cannot quietly drop it.

### MUST — Do not answer a verification question that requires a rendered page without rendering the page; mark it not exercised instead.

*Why:* Questions about where the eye lands, spacing ratios, overflow and focus visibility cannot be derived from source. Answering them from code produces a prediction stated in the grammar of an observation, and the prediction is biased toward the page the author intended rather than the page that exists.

### MUST — Record every check as measured, observed, or not exercised, and never let a not-exercised check appear as a pass.

*Why:* A list of uniform ticks terminates the loop while the defects are still present, which is the most expensive outcome available. observeElement already encodes the distinction by leaving an unpopulated field absent rather than empty, because checkContract scores absent as "not observed" and empty as "observed, none found" — two different facts.

Incorrect:

```
✓ No overflow issues
```

Correct:

```
● measured  horizontal overflow — none at any required viewport (1px tolerance)
```

### MUST — Correct one class of finding per pass, and write down the expected delta before re-rendering.

*Why:* Batching corrections destroys attribution: when the page improves less than expected, nothing identifies which change helped, which did nothing and which regressed. The written prediction is also the cheapest regression guard available, since it forces a check on what must not change.

*Exceptions:*
- A mechanical rename or token substitution with no visual consequence, which can be batched because there is nothing to attribute.

### MUST — Freeze the clock, fix the data to a seeded fixture, and stub the image loader before the first render of the loop.

*Why:* Without all three the page differs between passes, so two passes are not comparable and a difference cannot be attributed to the correction. A racing image fetch fails intermittently rather than consistently, which is worse, because the loop appears to work until it silently misattributes one pass.

### MUST — Await document.fonts.ready and settle lazy images before capturing any screenshot used for judgement.

*Why:* A capture taken before webfonts resolve shows fallback metrics, which changes every line length, heading width and vertical rhythm on the page. Every judgement then made is about a layout no user will see, and the error is invisible because the screenshot looks like a real page.

### MUST — Run the loop across all six REQUIRED_VIEWPORTS, not a single representative width.

*Why:* The matrix records why each is required: 320 exists because almost every horizontal-overflow bug that exists is visible there and nowhere else, and the 200 per cent zoom profile catches clipping no width alone reveals. Checking one width and reporting the page responsive is a not-exercised outcome presented as a pass.

*Exceptions:*
- A component-level loop on a subject that is never laid out responsively, where the relevant profiles are the ones its container queries respond to.

### MUST — Install the viewport with applyViewport before rendering in a component harness, rather than relying on the environment default.

*Why:* applyViewport installs a matchMedia mock derived from the profile, so media and container queries resolve as they would at that width. Without it every breakpoint resolves to the test environment default, which is usually desktop — the reason mobile-only defects survive component test suites.

### MUST — Apply each correction where the defect is caused rather than where it was observed, and check that it generalises to the next instance.

*Why:* A max-width on the one paragraph that overflowed at 320px leaves every sibling to overflow next time, because the cause was missing inline padding on the container. A fix that does not generalise is a patch on the observation, and the loop will rediscover the same class of defect on the following build.

### MUST — Open the report with how the page was rendered, at which viewports, under which determinism controls, and how many passes ran.

*Why:* Every finding in the report is only as good as the render that produced it, so a reader cannot weight any of them without that block. It also makes an unrendered review impossible to disguise, because the absence of a method line is itself the finding.

### SHOULD — Give the loop a fixed pass budget of roughly three to five, and report an exhausted budget as a result with the open classes named.

*Why:* An unbounded loop ends by making cosmetic changes to whatever is cheapest to change, because the alternative is admitting the remaining defect is structural. A report naming the classes closed, the classes still open with their measurements, and why the rest was not attempted is more useful than one more pass that declares victory.

### SHOULD — When the loop catches the same class of finding on every build, route it to methodology-feedback as a rule change rather than fixing it again.

*Why:* A defect that recurs across builds is not a property of any one output; it is a gap in the guidance that produced them. Fixing it downstream each time pays the cost forever and leaves the generator unchanged, which is the definition of friction worth turning into a rule.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the loop actually ran, that its findings came from a rendered page, and that nothing unchecked is presented as checked. (blocking)

- Was the page rendered at all this session? If not, does the report say so once at the top, before any finding?
- Which of the six REQUIRED_VIEWPORTS were actually rendered, and are the others recorded as not exercised rather than omitted?
- Was the clock frozen, the data seeded, and the image loader stubbed before the first capture — and can you name all three settings?
- Did every screenshot used for judgement come after document.fonts.ready resolved and after lazy images settled?
- For every check in the report, which of the three outcomes does it carry, and can you say exactly what produced each sentence?
- Is there any line phrased as a measurement whose real source was looking at a picture, or any aesthetic claim resting on a contract score?
- Does the report quote the checked count and the static-analysis limits, rather than presenting a score or a clean audit as absence of defects?
- How many classes of finding were corrected per pass, and was an expected delta written down before each re-render?
- For each correction, did the predicted change occur, and did anything change that was predicted not to?
- Is each fix applied where the defect is caused, and would it hold for the next instance of the same class?
- How many passes ran against the budget, and if the budget is exhausted, are the open classes named with their current measurements?
- Which classes of finding were seen and deliberately not fixed, and is each recorded with a reason?
- Did any finding recur from a previous build, and has it been routed to methodology-feedback rather than fixed again?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/render-harness.md` — How do I actually render what I just built, at the right viewports, deterministically enough that two passes are comparable?
- `references/extraction-queries.md` — What do I run against a rendered page to get spacing values, type sizes, contrast pairs, overflow, focus order and animated properties?
- `references/iteration-discipline.md` — How many things do I change per iteration, how do I know a correction worked, and what stops the loop?
- `references/honest-reporting.md` — How do I report what the loop found, and how do I mark what I could not check without it looking like everything passed?
