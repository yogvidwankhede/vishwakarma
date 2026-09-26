# Extraction queries

Every query here answers a question some verification block in this catalogue asks, and none
of them requires taste. Most are already implemented in `@vishwakarma/testing`; use those
rather than rewriting, because a second implementation of contrast is a second definition of
contrast.

## The whole contract in one call

```ts
import { checkContract } from '@vishwakarma/core'
import { formatContractReport, observeElement } from '@vishwakarma/testing'

const report = checkContract(contract, observeElement(document.body, { maxElements: 2000 }))
```

`observeElement` populates spacing values, font sizes and weights, durations, radii, hues,
contrast pairs, touch targets, animated properties, the reduced-motion guard, heading levels,
interactive elements without an accessible name, and raw colour literals. `ContractReport`
comes back with `passed`, `violations`, a `score` and a `summary` counting errors, warnings,
suggestions and — importantly — how many checks actually ran.

Two limits are deliberate and worth knowing rather than discovering. The walk is **capped**,
because reading computed styles from every descendant of a page-level render costs seconds,
and assertions that cost seconds get deleted. And it identifies text elements by a selector
rather than by inspecting child nodes, so a `<div>` with bare text in it is **skipped** — the
walk under-reports on purpose, since a missed check costs a review and a fabricated one costs
trust in the report.

That under-reporting is why `score: 100` is not "no violations". It is "none were found in
what was walked".

## Spacing histogram

The question: *is any pair of gaps almost-but-not-quite equal?* Near-misses are the finding,
not the count.

```ts
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
```

`SPACING_PROPERTIES`, `RADIUS_PROPERTIES` and `DURATION_PROPERTIES` are exported from
`@vishwakarma/testing` so the property list stays one list.

## Section-to-element ratio

The question every spacing verification asks, and the one that decides whether a page reads
as flat: the largest vertical gap between top-level sections, over the median gap between
siblings inside them. Below 3:1, the reader cannot tell where one idea ends.

## Type-size census

Count distinct rendered `font-size` values. More than about six on one screen means levels
have collapsed into each other. Two sizes 1.5rem and 1.375rem apart are one level and a
rendering bug, and only the rendered value shows that — the source may name them differently.

## Contrast, touch targets, focus

Do not reimplement these.

```ts
import {
  getFocusOrder,
  getVisualOrder,
  compareFocusOrder,
  inspectFocusIndicator,
  measureContrast,
  measureTouchTarget,
} from '@vishwakarma/testing'
```

`measureContrast` resolves the real backdrop through the ancestor chain rather than assuming
the nearest declared background, which is what makes it correct over gradients, images and
translucent layers — the exact places contrast checks are usually wrong.
`compareFocusOrder(getFocusOrder(root), getVisualOrder(root))` catches the defect where tab
order and reading order disagree, which no screenshot shows and no source reliably reveals.
`inspectFocusIndicator` must run at every stop and against every background the ring lands
on, not once.

## Overflow at 320px

```ts
const overflowing = [...document.querySelectorAll<HTMLElement>('*')].filter(
  (el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1,
)
```

One pixel of tolerance, because subpixel layout produces false positives at exact equality.
Run it at 320 first: the matrix says almost every horizontal-overflow bug that exists is
visible there and nowhere else.

## Animated properties

The question: *is anything animating a property that forces layout?* Collect
`transitionProperty` and the properties named in active animations, then intersect with the
layout-triggering set — `width`, `height`, `top`, `left`, `margin`, `padding`. This is
measurable and routinely reported from source, where a property named in a class utility is
invisible.

## Reduced motion

`mockReducedMotion` flips the preference so the same page can be observed both ways in one
pass. The check is not "does anything animate" — it is whether state changes remain legible
with motion suppressed, which is an observation, not a measurement.

## Token adherence

`checkTokenScale` and `checkTokenScaleDeep` compare rendered values against the contract's
scales, catching the case where a value came from an arbitrary utility rather than a token.
`auditProject` from `@vishwakarma/audit` finds the source-level version of the same defect
faster; run both, since each sees what the other cannot.
