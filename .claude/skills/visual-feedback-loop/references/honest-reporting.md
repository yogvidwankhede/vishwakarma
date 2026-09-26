# Reporting the loop

The report has one job beyond listing defects: make it impossible to mistake what was not
checked for what was checked and found clean.

## State the method first

Before any finding, one block: how it was rendered, at which viewports, with which
determinism controls, and how many passes ran. `design-review` requires this and it matters
more here, because the loop's findings are only as good as the render that produced them.

```
Method:   dev server at localhost:5173, Chromium headless, fonts settled
Viewports: 320×568, 390×844, 768×1024, 1024×768, 1440×900, 1280×800 @200%
Controls: clock frozen 2026-01-15T12:00Z, seeded fixture (12 items), images stubbed
Passes:   3 of 4 budgeted
Static:   auditProject — lower bound only, see STATIC_ANALYSIS_LIMITS
```

`LIMITS_SUMMARY` from `@vishwakarma/audit` exists to be quoted here verbatim: *static
analysis only: this is a lower bound on violations, not a complete count.* Every report format
in that package already carries its caveats, and stripping them when you summarise is how a
lower bound becomes a clean bill of health.

## Three outcomes, visibly different

Give each check its outcome in a form that cannot be skimmed as uniform ticks.

```
● measured   section:element gap ratio 3.4:1 (threshold 3.0) — 96px / 28px median
● measured   horizontal overflow — none at any required viewport (1px tolerance)
◐ observed   hierarchy: the price wins at every width; the badge competes at 320px
○ not run    reduced-motion legibility — mockReducedMotion not applied this pass
○ not run    screen-reader announcement order — needs a real assistive technology
```

Three symbols, three words, and the not-run rows say *what would make them runnable*. A
reader scanning this cannot come away thinking everything passed, which is the entire point.
`accessibility-evidence` owns the grading rules behind this shape, including the one that
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

```
pass 1  spacing near-misses (20/24/28 → 24)      ratio 1.1:1 → 1.1:1   as predicted
pass 2  section separation (32 → 96)             ratio 1.1:1 → 3.4:1   as predicted
pass 3  type scale (6 sizes → 4)                 ratio unchanged        card padding moved — reverted
```

That third row is the most valuable line in the report, and a report that only shows the
final state throws it away.

## Say what you did not attempt, and why

Separate from not-run checks: classes of finding you saw and chose not to fix. Naming them
with a reason is what makes the report trustworthy — a loop that reports only what it fixed
is indistinguishable from a loop that only looked for what it could fix.

## One sentence on what is actually unfinished

`ship-readiness` owns whether the thing is honest enough to ship — real content, legal pages,
a demo that demonstrates. The loop's report should end by naming whatever it could see was
still a placeholder, even where that was not its own remit, because the loop is the last stage
that had the page rendered in front of it.
