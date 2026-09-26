// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Every self-review in this catalogue degrades to a guess unless something renders the page.
 *
 * Read the verification blocks and notice what they ask: where does the eye land first, is the
 * section-to-element spacing ratio at least 3:1, does anything overflow at 320px, is the focus
 * indicator visible at every stop. Not one of those can be answered from source. An agent that
 * answers them anyway is reporting a prediction in the grammar of an observation, and the
 * prediction is usually optimistic, because the page it is imagining is the page it intended.
 *
 * The machinery to answer them properly already exists in this repository, and the author of
 * `checkContract` said what it was for: the checker is pure and synchronous "so the same logic
 * can run inside a linter, inside a browser test, inside CI, and inside an agent's own
 * self-review loop". `observeElement` is the DOM adapter that feeds it. `@vishwakarma/audit`
 * states in `STATIC_ANALYSIS_LIMITS` exactly which checks "need a rendered page; they are not
 * checked here". The seam is documented from both sides and no skill told anyone to close it.
 *
 * This skill is the loop. Its real contribution is not the tooling but the bookkeeping: three
 * outcomes per check rather than two, so that "not exercised" can never be read as "passed" —
 * the distinction `observeElement` already encodes by leaving a field absent rather than empty.
 */
export const visualFeedbackLoop: SkillManifest = {
  vsm: '1.0',
  id: 'visual-feedback-loop',
  name: 'Visual Feedback Loop',
  description:
    'Use when finishing an interface — render your own output, measure it, correct one class of finding per pass, and re-check.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'workflow',
  tags: [
    'self-review',
    'iteration',
    'design-contract',
    'measurement',
    'screenshot',
    'viewport-sweep',
    'evidence',
  ],

  activation: {
    intents: [
      'finishing an interface and deciding whether it is actually done',
      'checking your own output rather than describing what you intended to build',
      'the user says the result looks unfinished, or not like the reference',
      'answering a self-review question that needs a rendered page',
      'setting up a render-and-measure harness for design checks',
      'iterating on a design without losing track of which change fixed what',
    ],
    globs: [
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/*.spec.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/playwright.config.*',
    ],
    keywords: [
      'self-review',
      'feedback loop',
      'iterate',
      'screenshot',
      'render and check',
      'design contract',
      'viewport sweep',
      'does it look right',
      'is it done',
      'critique my own output',
    ],
  },

  content: {
    summary:
      'Close the loop on your own output: render it, measure what source cannot show, correct one class of finding per pass so attribution survives, and record three outcomes per check — observed, measured, or not exercised — never collapsing the third into a pass.',

    body: `# Visual Feedback Loop

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

\`@vishwakarma/audit\` already states its own blind spots in \`STATIC_ANALYSIS_LIMITS\`, and one
line of that list is the brief for this skill: contrast, touch-target size and layout overflow
"need a rendered page; they are not checked here". Run the static pass first because it is
cheap and it is a lower bound, then render to cover what it cannot see.

The runtime path is already built, and \`checkContract\` was written for exactly this use:

\`\`\`ts
import { checkContract, type DesignContract } from '@vishwakarma/core'
import { formatContractReport, observeElement } from '@vishwakarma/testing'

const observation = observeElement(document.body)
const report = checkContract(contract, observation)
if (!report.passed) console.log(formatContractReport(report))
\`\`\`

\`observeElement\` encodes the distinction this whole skill turns on: a field it could not
populate is left **absent**, not empty, because \`checkContract\` scores an absent field as
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

\`accessibility-evidence\` owns this discipline for accessibility findings, and its rule
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
a contract score of 92 is not "the hierarchy works". \`extraction-queries.md\` has the runtime
queries; \`render-harness.md\` has how to get the pixels.

---

## 5. The sweep is six viewports, not one

\`REQUIRED_VIEWPORTS\` from \`@vishwakarma/core\` is the release-blocking set: 320×568, 390×844,
768×1024, 1024×768, 1440×900, and 1280×800 at 200% zoom. Each is in the matrix with a stated
rationale — 320 is there because "almost every horizontal-overflow bug that exists is visible
here and nowhere else". Checking one width and reporting the page responsive is a
not-exercised outcome wearing a pass.

---

## 6. When you genuinely cannot render

Say so once, at the top, before any finding. Then review what source proves — literal colour
contrast, tokens versus hard-coded values, semantic markup, focus code inside modals, which
properties are animated, whether empty and error branches exist at all — and mark everything
else *not exercised — requires a running build*. \`design-review\` owns that reduced pass, and
this is the one case where the loop legitimately does not run. It is not the default, and
"there is no dev server" is worth thirty seconds of checking before it is accepted.

---

**Boundaries.** \`design-review\` owns the passes and how a finding is written.
\`design-judgment\` owns what counts as good. \`accessibility-evidence\` owns evidence grading,
and this skill borrows its rule rather than restating it. \`code-quality\` owns screenshot tests
as CI artefacts — this loop is a build-time instrument, not a test suite.
\`methodology-feedback\` owns what to do when the same finding keeps recurring: that is a
guidance gap, not a defect. \`ship-readiness\` owns whether the finished thing is honest.`,

    references: [
      {
        id: 'render-harness',
        title: 'Getting pixels and a live DOM from your own output',
        answers:
          'How do I actually render what I just built, at the right viewports, deterministically enough that two passes are comparable?',
        content: `# The render harness

Three routes, in order of how much of the real page they exercise.

## Route 1 — the dev server and a headless browser

The most faithful, and the only one that catches integration failures: a component that works
in isolation and breaks inside the page's stacking context, a font that never loads, a layout
that only overflows once the real nav is present.

\`\`\`ts
import { chromium } from 'playwright'
import { REQUIRED_VIEWPORTS } from '@vishwakarma/core'

const browser = await chromium.launch()
for (const profile of REQUIRED_VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: profile.zoom,
    hasTouch: profile.pointer === 'coarse',
  })
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: \`shots/\${profile.id}.png\`, fullPage: true })
  await page.close()
}
await browser.close()
\`\`\`

Note \`document.fonts.ready\`. A screenshot taken before webfonts resolve shows fallback
metrics, which changes every line length, every heading width and every vertical rhythm on
the page — so the picture you then reason about is of a layout that no user will see. This is
the single most common way a render loop produces confident nonsense.

The same applies to images. \`networkidle\` covers most of it; lazy-loaded images below the
fold need an explicit scroll-to-bottom and a settle before a full-page shot.

## Route 2 — the component harness

Faster, and correct when the question is about one component's states rather than a page's
composition. Render into jsdom or happy-dom and use the runtime measurements directly; no
screenshot is involved, so the answers are all measurements and none are observations.

\`\`\`ts
import { applyViewport, observeElement, viewportProfiles } from '@vishwakarma/testing'
import { checkContract } from '@vishwakarma/core'

for (const [name, profile] of viewportProfiles.cases()) {
  applyViewport(profile)
  render(<Subject />)
  const report = checkContract(contract, observeElement(document.body))
  console.log(name, report.summary)
}
\`\`\`

\`applyViewport\` installs a \`matchMedia\` mock from the profile, so container queries and
media queries resolve as they would at that width. Without it every breakpoint resolves to
whatever the test environment defaults to, which is usually desktop, which is why
mobile-only defects survive component tests.

\`viewportProfiles.cases()\` yields \`[name, profile]\` pairs shaped for a parameterised test
block, defaulting to the required six.

## Route 3 — the static build

When there is no dev server but there is a build, serve the output directory and use route 1
against it. This is strictly better than not rendering, and it misses only what the dev
server adds.

## Determinism, or the loop is noise

Borrow the three controls \`code-quality\` specifies for screenshot tests, for the same reason:

- **Freeze the clock.** Anything showing a relative time, a date, or a countdown differs
  between passes.
- **Fix the data.** A seeded fixture, not a live fetch and not a random generator. A changing
  list length changes the layout, and you will attribute that to your correction.
- **Fake the image loader.** Racing a real network fetch is the most common source of flake,
  and it fails intermittently, which is worse than failing always.

Without all three, two passes are not comparable and the loop cannot tell you anything.

## What to capture per pass

One full-page screenshot per required viewport, plus the contract report, plus the audit
report. Keep them in a directory named for the pass — \`pass-1/\`, \`pass-2/\` — because the
comparison between consecutive passes is the actual product of the loop, and overwriting
destroys it.

## Reading your own screenshot

Look at it as a picture before looking at it as a page. The questions worth asking of pixels
are the ones no query can answer: which element wins, whether anything is competing for the
same rank, whether the page has a rhythm or one repeated interval, whether any single moment
looks deliberate. Everything else — every number — comes from the queries.`,
      },
      {
        id: 'extraction-queries',
        title: 'Runtime queries that answer the design verifications',
        answers:
          'What do I run against a rendered page to get spacing values, type sizes, contrast pairs, overflow, focus order and animated properties?',
        content: `# Extraction queries

Every query here answers a question some verification block in this catalogue asks, and none
of them requires taste. Most are already implemented in \`@vishwakarma/testing\`; use those
rather than rewriting, because a second implementation of contrast is a second definition of
contrast.

## The whole contract in one call

\`\`\`ts
import { checkContract } from '@vishwakarma/core'
import { formatContractReport, observeElement } from '@vishwakarma/testing'

const report = checkContract(contract, observeElement(document.body, { maxElements: 2000 }))
\`\`\`

\`observeElement\` populates spacing values, font sizes and weights, durations, radii, hues,
contrast pairs, touch targets, animated properties, the reduced-motion guard, heading levels,
interactive elements without an accessible name, and raw colour literals. \`ContractReport\`
comes back with \`passed\`, \`violations\`, a \`score\` and a \`summary\` counting errors, warnings,
suggestions and — importantly — how many checks actually ran.

Two limits are deliberate and worth knowing rather than discovering. The walk is **capped**,
because reading computed styles from every descendant of a page-level render costs seconds,
and assertions that cost seconds get deleted. And it identifies text elements by a selector
rather than by inspecting child nodes, so a \`<div>\` with bare text in it is **skipped** — the
walk under-reports on purpose, since a missed check costs a review and a fabricated one costs
trust in the report.

That under-reporting is why \`score: 100\` is not "no violations". It is "none were found in
what was walked".

## Spacing histogram

The question: *is any pair of gaps almost-but-not-quite equal?* Near-misses are the finding,
not the count.

\`\`\`ts
const gaps = new Map<number, number>()
for (const el of document.querySelectorAll<HTMLElement>('*')) {
  const s = getComputedStyle(el)
  for (const p of ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'rowGap']) {
    const v = Math.round(parseFloat(s[p as never] as string))
    if (v > 0) gaps.set(v, (gaps.get(v) ?? 0) + 1)
  }
}
const sorted = [...gaps.keys()].sort((a, b) => a - b)
const nearMisses = sorted.filter((v, i) => i > 0 && v - (sorted[i - 1] as number) <= 4)
\`\`\`

\`SPACING_PROPERTIES\`, \`RADIUS_PROPERTIES\` and \`DURATION_PROPERTIES\` are exported from
\`@vishwakarma/testing\` so the property list stays one list.

## Section-to-element ratio

The question every spacing verification asks, and the one that decides whether a page reads
as flat: the largest vertical gap between top-level sections, over the median gap between
siblings inside them. Below 3:1, the reader cannot tell where one idea ends.

## Type-size census

Count distinct rendered \`font-size\` values. More than about six on one screen means levels
have collapsed into each other. Two sizes 1.5rem and 1.375rem apart are one level and a
rendering bug, and only the rendered value shows that — the source may name them differently.

## Contrast, touch targets, focus

Do not reimplement these.

\`\`\`ts
import {
  getFocusOrder,
  getVisualOrder,
  compareFocusOrder,
  inspectFocusIndicator,
  measureContrast,
  measureTouchTarget,
} from '@vishwakarma/testing'
\`\`\`

\`measureContrast\` resolves the real backdrop through the ancestor chain rather than assuming
the nearest declared background, which is what makes it correct over gradients, images and
translucent layers — the exact places contrast checks are usually wrong.
\`compareFocusOrder(getFocusOrder(root), getVisualOrder(root))\` catches the defect where tab
order and reading order disagree, which no screenshot shows and no source reliably reveals.
\`inspectFocusIndicator\` must run at every stop and against every background the ring lands
on, not once.

## Overflow at 320px

\`\`\`ts
const overflowing = [...document.querySelectorAll<HTMLElement>('*')].filter(
  (el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1,
)
\`\`\`

One pixel of tolerance, because subpixel layout produces false positives at exact equality.
Run it at 320 first: the matrix says almost every horizontal-overflow bug that exists is
visible there and nowhere else.

## Animated properties

The question: *is anything animating a property that forces layout?* Collect
\`transitionProperty\` and the properties named in active animations, then intersect with the
layout-triggering set — \`width\`, \`height\`, \`top\`, \`left\`, \`margin\`, \`padding\`. This is
measurable and routinely reported from source, where a property named in a class utility is
invisible.

## Reduced motion

\`mockReducedMotion\` flips the preference so the same page can be observed both ways in one
pass. The check is not "does anything animate" — it is whether state changes remain legible
with motion suppressed, which is an observation, not a measurement.

## Token adherence

\`checkTokenScale\` and \`checkTokenScaleDeep\` compare rendered values against the contract's
scales, catching the case where a value came from an arbitrary utility rather than a token.
\`auditProject\` from \`@vishwakarma/audit\` finds the source-level version of the same defect
faster; run both, since each sees what the other cannot.`,
      },
      {
        id: 'iteration-discipline',
        title: 'One class per pass, attribution, and when to stop',
        answers:
          'How many things do I change per iteration, how do I know a correction worked, and what stops the loop?',
        content: `# Iteration discipline

The loop's value is attribution. Everything below protects it.

## One class of finding per pass

A *class* is a kind of defect, not a single instance. "Every near-miss spacing value" is one
class and may be eleven edits; "spacing, plus the type scale, plus the accent colour" is
three classes and must be three passes.

The reason is not tidiness. Fix three classes at once, re-render, and see the page improve
less than expected: you now cannot tell which of the three helped, which did nothing, and
which actively hurt. The information you were running the loop to get is exactly the
information batching destroys.

Order classes by what they affect. Structure before surface: ranking and spacing change what
every later judgement is about, so correcting colour before hierarchy means re-judging the
colour once the hierarchy moves.

## Every pass names its expected delta

Before re-rendering, write down what should change and what must not. "The section gaps go
from 32 to 96; nothing inside a card moves." Then check both halves. A correction that
produces its intended change *and* three unintended ones is a regression wearing a fix, and
without the prediction you will only notice the intended half.

This is also the cheapest possible regression guard: the previous pass's screenshots are
already on disk, named for the pass.

## The three ways the loop goes wrong

**Thrashing.** Two passes that undo each other — tighten the gaps, then loosen them. The
cause is always an unstated target: neither pass said what value it was aiming at, so each
was correcting toward a feeling. Fix by naming the number before editing.

**Cosmetic convergence.** The contract score rises every pass and the page does not get
better. This means the loop is optimising the measurable subset while the actual defect is in
what only pixels show — usually hierarchy. Measurements cannot detect their own
incompleteness, so a rising score with a static screenshot is a signal to stop measuring and
look.

**Fixing the screenshot.** Suppressing a symptom where it was observed rather than where it
is caused: a \`max-width\` on the one paragraph that overflowed at 320px, when the container
has no inline padding. The test is whether the fix generalises to the next instance. If it
does not, it is a patch on the observation, not the cause.

## Budget the loop

Give it a fixed number of passes — three to five is usually right — and treat exhausting the
budget as a result, not a failure. What you report then is: the classes closed, the classes
still open with their measurements, and the reason the remainder was not attempted. That is a
far more useful artefact than a sixth pass that runs out of ideas and declares victory.

An unbounded loop reliably ends the same way: with cosmetic changes to whatever is easiest to
change, because the alternative is admitting the remaining defect is structural.

## Stopping conditions

Stop when **every finding is closed or explicitly deferred with a reason** — the reason being
a real one: needs a decision only the user can make, needs an asset that does not exist, or
is outside the requested scope.

Do not stop because:

- the score reached a number. The score is a trend line, and the summary's \`checked\` count
  is the more honest figure.
- nothing new was found in a pass that ran only the queries. Add a viewport, or look at the
  picture.
- the page looks fine. That is an observation, and it belongs in the report as one, alongside
  the measurements — not in place of them.

## When the same finding keeps coming back

Across builds, not across passes. A defect this loop catches every single time is not a
defect in the output; it is a gap in the guidance that produced the output.
\`methodology-feedback\` owns that: turn it into a rule with a mechanism, or the loop pays for
it forever.`,
      },
      {
        id: 'honest-reporting',
        title: 'Writing the result so an unchecked item cannot read as a pass',
        answers:
          'How do I report what the loop found, and how do I mark what I could not check without it looking like everything passed?',
        content: `# Reporting the loop

The report has one job beyond listing defects: make it impossible to mistake what was not
checked for what was checked and found clean.

## State the method first

Before any finding, one block: how it was rendered, at which viewports, with which
determinism controls, and how many passes ran. \`design-review\` requires this and it matters
more here, because the loop's findings are only as good as the render that produced them.

\`\`\`
Method:   dev server at localhost:5173, Chromium headless, fonts settled
Viewports: 320×568, 390×844, 768×1024, 1024×768, 1440×900, 1280×800 @200%
Controls: clock frozen 2026-01-15T12:00Z, seeded fixture (12 items), images stubbed
Passes:   3 of 4 budgeted
Static:   auditProject — lower bound only, see STATIC_ANALYSIS_LIMITS
\`\`\`

\`LIMITS_SUMMARY\` from \`@vishwakarma/audit\` exists to be quoted here verbatim: *static
analysis only: this is a lower bound on violations, not a complete count.* Every report format
in that package already carries its caveats, and stripping them when you summarise is how a
lower bound becomes a clean bill of health.

## Three outcomes, visibly different

Give each check its outcome in a form that cannot be skimmed as uniform ticks.

\`\`\`
● measured   section:element gap ratio 3.4:1 (threshold 3.0) — 96px / 28px median
● measured   horizontal overflow — none at any required viewport (1px tolerance)
◐ observed   hierarchy: the price wins at every width; the badge competes at 320px
○ not run    reduced-motion legibility — mockReducedMotion not applied this pass
○ not run    screen-reader announcement order — needs a real assistive technology
\`\`\`

Three symbols, three words, and the not-run rows say *what would make them runnable*. A
reader scanning this cannot come away thinking everything passed, which is the entire point.
\`accessibility-evidence\` owns the grading rules behind this shape, including the one that
decides the hard cases: **when torn between two grades, take the lower one.**

## Never upgrade an outcome by rewording it

The failure is subtle and common. "No overflow issues" reads as measured and may mean nobody
looked. "Contrast looks fine" is an observation dressed as a measurement. "Fully accessible"
is a conclusion no loop can reach, because the loop cannot run a screen reader.

The test before every line: *what exactly produced this sentence?* If the answer is "the code
looked right", the outcome is **not run**.

## Report the deltas, not just the end state

The loop produced a history and the history is informative. One line per pass: the class
corrected, the measurement before and after, and whether the expected delta matched.

\`\`\`
pass 1  spacing near-misses (20/24/28 → 24)      ratio 1.1:1 → 1.1:1   as predicted
pass 2  section separation (32 → 96)             ratio 1.1:1 → 3.4:1   as predicted
pass 3  type scale (6 sizes → 4)                 ratio unchanged        card padding moved — reverted
\`\`\`

That third row is the most valuable line in the report, and a report that only shows the
final state throws it away.

## Say what you did not attempt, and why

Separate from not-run checks: classes of finding you saw and chose not to fix. Naming them
with a reason is what makes the report trustworthy — a loop that reports only what it fixed
is indistinguishable from a loop that only looked for what it could fix.

## One sentence on what is actually unfinished

\`ship-readiness\` owns whether the thing is honest enough to ship — real content, legal pages,
a demo that demonstrates. The loop's report should end by naming whatever it could see was
still a placeholder, even where that was not its own remit, because the loop is the last stage
that had the page rendered in front of it.`,
      },
    ],
  },

  rules: [
    {
      id: 'visual-feedback-loop/render-before-claiming',
      strength: 'must',
      statement:
        'Do not answer a verification question that requires a rendered page without rendering the page; mark it not exercised instead.',
      evidence: {
        rationale:
          'Questions about where the eye lands, spacing ratios, overflow and focus visibility cannot be derived from source. Answering them from code produces a prediction stated in the grammar of an observation, and the prediction is biased toward the page the author intended rather than the page that exists.',
        confidence: 'established',
      },
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/three-outcomes',
      strength: 'must',
      statement:
        'Record every check as measured, observed, or not exercised, and never let a not-exercised check appear as a pass.',
      evidence: {
        rationale:
          'A list of uniform ticks terminates the loop while the defects are still present, which is the most expensive outcome available. observeElement already encodes the distinction by leaving an unpopulated field absent rather than empty, because checkContract scores absent as "not observed" and empty as "observed, none found" — two different facts.',
        confidence: 'established',
      },
      examples: {
        bad: '✓ No overflow issues',
        good: '● measured  horizontal overflow — none at any required viewport (1px tolerance)',
      },
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/one-class-per-pass',
      strength: 'must',
      statement:
        'Correct one class of finding per pass, and write down the expected delta before re-rendering.',
      evidence: {
        rationale:
          'Batching corrections destroys attribution: when the page improves less than expected, nothing identifies which change helped, which did nothing and which regressed. The written prediction is also the cheapest regression guard available, since it forces a check on what must not change.',
        confidence: 'strong',
      },
      exceptions: [
        'A mechanical rename or token substitution with no visual consequence, which can be batched because there is nothing to attribute.',
      ],
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/determinism-controls',
      strength: 'must',
      statement:
        'Freeze the clock, fix the data to a seeded fixture, and stub the image loader before the first render of the loop.',
      evidence: {
        rationale:
          'Without all three the page differs between passes, so two passes are not comparable and a difference cannot be attributed to the correction. A racing image fetch fails intermittently rather than consistently, which is worse, because the loop appears to work until it silently misattributes one pass.',
        confidence: 'established',
      },
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/wait-for-fonts',
      strength: 'must',
      statement:
        'Await document.fonts.ready and settle lazy images before capturing any screenshot used for judgement.',
      evidence: {
        rationale:
          'A capture taken before webfonts resolve shows fallback metrics, which changes every line length, heading width and vertical rhythm on the page. Every judgement then made is about a layout no user will see, and the error is invisible because the screenshot looks like a real page.',
        confidence: 'established',
      },
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/sweep-required-viewports',
      strength: 'must',
      statement:
        'Run the loop across all six REQUIRED_VIEWPORTS, not a single representative width.',
      evidence: {
        rationale:
          'The matrix records why each is required: 320 exists because almost every horizontal-overflow bug that exists is visible there and nowhere else, and the 200 per cent zoom profile catches clipping no width alone reveals. Checking one width and reporting the page responsive is a not-exercised outcome presented as a pass.',
        confidence: 'established',
      },
      exceptions: [
        'A component-level loop on a subject that is never laid out responsively, where the relevant profiles are the ones its container queries respond to.',
      ],
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/apply-viewport-in-harness',
      strength: 'must',
      statement:
        'Install the viewport with applyViewport before rendering in a component harness, rather than relying on the environment default.',
      evidence: {
        rationale:
          'applyViewport installs a matchMedia mock derived from the profile, so media and container queries resolve as they would at that width. Without it every breakpoint resolves to the test environment default, which is usually desktop — the reason mobile-only defects survive component test suites.',
        confidence: 'established',
      },
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/reuse-the-measurements',
      strength: 'must-not',
      statement:
        'Do not reimplement contrast, touch-target, focus-order or contract checking; call the @vishwakarma/testing and @vishwakarma/core implementations.',
      evidence: {
        rationale:
          'A second implementation of contrast is a second definition of contrast, and the two will disagree on exactly the cases that matter — translucent layers, gradients and images — because measureContrast resolves the real backdrop through the ancestor chain rather than assuming the nearest declared background.',
        confidence: 'established',
      },
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/no-measurement-from-a-picture',
      strength: 'must-not',
      statement:
        'Do not state a number taken from a screenshot as a measurement, and do not state a contract score as an aesthetic judgement.',
      evidence: {
        rationale:
          'The two instruments answer different questions and neither can answer the other’s. "The gap looks like 24px" is an estimate presented as a fact, and a score of 92 says nothing about whether the hierarchy works — measurements cannot detect their own incompleteness, which is why a rising score beside an unchanged screenshot means the loop is optimising the wrong subset.',
        confidence: 'established',
      },
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/score-is-not-a-pass',
      strength: 'must-not',
      statement:
        'Do not treat a contract score or a clean static audit as evidence of absence; quote the checked count and the stated limits.',
      evidence: {
        rationale:
          'observeElement caps its walk for speed and identifies text elements by selector, so it deliberately under-reports; auditProject reads only literal text and skips calc, var and clamp rather than guessing. Both are lower bounds by construction, and every report format in the audit package carries that caveat precisely so a summary cannot quietly drop it.',
        confidence: 'established',
      },
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/fix-the-cause',
      strength: 'must',
      statement:
        'Apply each correction where the defect is caused rather than where it was observed, and check that it generalises to the next instance.',
      evidence: {
        rationale:
          'A max-width on the one paragraph that overflowed at 320px leaves every sibling to overflow next time, because the cause was missing inline padding on the container. A fix that does not generalise is a patch on the observation, and the loop will rediscover the same class of defect on the following build.',
        confidence: 'strong',
      },
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/budget-the-passes',
      strength: 'should',
      statement:
        'Give the loop a fixed pass budget of roughly three to five, and report an exhausted budget as a result with the open classes named.',
      evidence: {
        rationale:
          'An unbounded loop ends by making cosmetic changes to whatever is cheapest to change, because the alternative is admitting the remaining defect is structural. A report naming the classes closed, the classes still open with their measurements, and why the rest was not attempted is more useful than one more pass that declares victory.',
        confidence: 'strong',
      },
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/state-the-method',
      strength: 'must',
      statement:
        'Open the report with how the page was rendered, at which viewports, under which determinism controls, and how many passes ran.',
      evidence: {
        rationale:
          'Every finding in the report is only as good as the render that produced it, so a reader cannot weight any of them without that block. It also makes an unrendered review impossible to disguise, because the absence of a method line is itself the finding.',
        confidence: 'established',
      },
      verifiedBy: 'loop-closure-review',
    },
    {
      id: 'visual-feedback-loop/recurring-finding-is-a-guidance-gap',
      strength: 'should',
      statement:
        'When the loop catches the same class of finding on every build, route it to methodology-feedback as a rule change rather than fixing it again.',
      evidence: {
        rationale:
          'A defect that recurs across builds is not a property of any one output; it is a gap in the guidance that produced them. Fixing it downstream each time pays the cost forever and leaves the generator unchanged, which is the definition of friction worth turning into a rule.',
        confidence: 'strong',
      },
      verifiedBy: 'loop-closure-review',
    },
  ],

  verification: [
    {
      id: 'loop-closure-review',
      kind: 'self-review',
      description:
        'Confirm the loop actually ran, that its findings came from a rendered page, and that nothing unchecked is presented as checked.',
      blocking: true,
      questions: [
        'Was the page rendered at all this session? If not, does the report say so once at the top, before any finding?',
        'Which of the six REQUIRED_VIEWPORTS were actually rendered, and are the others recorded as not exercised rather than omitted?',
        'Was the clock frozen, the data seeded, and the image loader stubbed before the first capture — and can you name all three settings?',
        'Did every screenshot used for judgement come after document.fonts.ready resolved and after lazy images settled?',
        'For every check in the report, which of the three outcomes does it carry, and can you say exactly what produced each sentence?',
        'Is there any line phrased as a measurement whose real source was looking at a picture, or any aesthetic claim resting on a contract score?',
        'Does the report quote the checked count and the static-analysis limits, rather than presenting a score or a clean audit as absence of defects?',
        'How many classes of finding were corrected per pass, and was an expected delta written down before each re-render?',
        'For each correction, did the predicted change occur, and did anything change that was predicted not to?',
        'Is each fix applied where the defect is caused, and would it hold for the next instance of the same class?',
        'How many passes ran against the budget, and if the budget is exhausted, are the open classes named with their current measurements?',
        'Which classes of finding were seen and deliberately not fixed, and is each recorded with a reason?',
        'Did any finding recur from a previous build, and has it been routed to methodology-feedback rather than fixed again?',
      ],
    },
  ],

  relatedSkills: [
    'design-review',
    'design-judgment',
    'accessibility-evidence',
    'ui-generation-workflow',
    'methodology-feedback',
    'code-quality',
    'ship-readiness',
    'responsive-architecture',
  ],
}
