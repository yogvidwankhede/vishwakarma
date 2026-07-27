# The Design Contract

A design system is normally a collection of components plus a document asking people to use them properly. That works when the people are humans who read documents. It fails badly when the "person" is an AI coding agent, because an agent will cheerfully produce something that imports your `Button` and then sets `padding: 13px` on it.

A Design Contract is the same information expressed as machine-checkable constraints. Instead of "use the spacing scale", it says: every spacing value in the output must be a member of this set, and here is the checker that proves it. That turns design review from a matter of opinion into a test that either passes or fails — the only form of guidance an autonomous agent can reliably act on.

The contract is deliberately about *constraints*, not *content*. It never says what a page should contain. It says what the grammar of the output must be, in the same way a type system says nothing about what your function should compute.

## What a contract covers

A `DesignContract` has six required sections and one optional one.

**Spacing.** A scale (allowed pixel values), a base unit (everything must be a multiple of it), and an exceptions list (hairlines, optical corrections). Anything off the grid is an error; anything on the grid but off the scale is a warning.

**Typography.** Allowed sizes in rem, allowed weights, the maximum number of distinct sizes that may appear in one view, maximum line length in characters, and minimum body size. Six type sizes with visible gaps between them signal hierarchy; eleven near-identical ones signal noise.

**Colour.** Named ramps your system exposes, minimum WCAG contrast ratios for body text (4.5 AA), large text (3), and non-text elements such as button borders (3). A maximum number of distinct hue families per view. Optionally, a rule forbidding raw colour literals in source so that everything passes through tokens.

**Motion.** Allowed durations in milliseconds, a hard ceiling (past 600ms a transition becomes a wait), whether every non-essential animation must be gated behind `prefers-reduced-motion`, whether animating layout-triggering properties is an error, and a cap on simultaneously animating elements.

**Layout.** Named breakpoints, minimum touch target size (44px), maximum content width, allowed border radii, and whether horizontal overflow at the narrowest breakpoint is an error.

**Accessibility.** Target conformance level (A, AA, or AAA), whether focus indicators are required, whether colour can be the sole carrier of meaning, whether every interactive element must have an accessible name, and whether heading levels must descend without skipping.

**Performance** (optional). LCP budget in milliseconds, INP budget, CLS budget, per-route JavaScript budget in KB after compression, and whether explicit dimensions on media elements are required.

## Severity

Every rule has a severity: `error`, `warning`, or `suggestion`.

Splitting these is what keeps the contract usable. If every rule is an error, teams disable the whole thing the first time a legitimate exception appears. If nothing is an error, nothing gets fixed. Accessibility and correctness violations are errors because they harm users; aesthetic violations are warnings because reasonable people differ and context wins.

You can override the severity of any rule, or disable rules entirely with a stated reason so the exception is auditable.

## The default contract

Vishwakarma ships a default contract you can use directly or fork from:

```ts
import { DEFAULT_CONTRACT } from '@vishwakarma/core'
```

The values are opinionated on purpose. A contract full of permissive defaults teaches nothing, because everything passes. Teams should fork this and argue with it — the argument is the point, and a contract that has been argued over is one the team will actually keep.

Key defaults: 4px grid, spacing scale from 0 to 192, rem type scale at twelve steps, 4.5:1 minimum body contrast (WCAG AA), 600ms motion ceiling, 44px touch target minimum, heading-order enforcement.

## Extending a contract

```ts
import { DEFAULT_CONTRACT, extendContract } from '@vishwakarma/core'

const myContract = extendContract(DEFAULT_CONTRACT, {
  colour: {
    minContrastBody: 7, // AAA text contrast
    forbidRawColours: true,
  },
  motion: {
    maxDurationMs: 400, // tighter ceiling for a data-dense app
  },
})
```

Overrides are merged section by section, so you only restate what changes.

## Running the checker

```ts
import { checkContract, DEFAULT_CONTRACT } from '@vishwakarma/core'

const report = checkContract(DEFAULT_CONTRACT, {
  spacingValues: [8, 16, 13, 24],  // 13 will flag
  contrastPairs: [
    { ratio: 3.1, kind: 'body', label: 'muted text on white' },  // error
  ],
})

console.log(report.passed)     // false
console.log(report.violations)
console.log(report.score)      // 0–100; a trend line, not a grade
```

The checker is pure and synchronous — no filesystem, DOM, or network access. The same logic runs inside a linter, a browser test, CI, and an agent's self-review loop without three separate implementations drifting apart.

## Using it in CI

```js
// scripts/design-audit.mjs
import { auditProject, formatReport } from '@vishwakarma/audit'
import { DEFAULT_CONTRACT } from '@vishwakarma/core'

const report = await auditProject(['src/**/*.{tsx,jsx,css}'], DEFAULT_CONTRACT)
console.log(formatReport(report, { format: 'github' }))
if (report.summary.errors > 0) process.exit(1)
```

```yaml
- run: node scripts/design-audit.mjs
```

Violations appear as inline annotations on the pull request. Errors fail the build; warnings do not. The auditor reads source, so it cannot resolve class names computed at runtime — it produces a lower bound on violations and says so.
