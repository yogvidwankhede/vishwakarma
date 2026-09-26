# The render harness

Three routes, in order of how much of the real page they exercise.

## Route 1 — the dev server and a headless browser

The most faithful, and the only one that catches integration failures: a component that works
in isolation and breaks inside the page's stacking context, a font that never loads, a layout
that only overflows once the real nav is present.

```ts
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
  await page.screenshot({ path: `shots/${profile.id}.png`, fullPage: true })
  await page.close()
}
await browser.close()
```

Note `document.fonts.ready`. A screenshot taken before webfonts resolve shows fallback
metrics, which changes every line length, every heading width and every vertical rhythm on
the page — so the picture you then reason about is of a layout that no user will see. This is
the single most common way a render loop produces confident nonsense.

The same applies to images. `networkidle` covers most of it; lazy-loaded images below the
fold need an explicit scroll-to-bottom and a settle before a full-page shot.

## Route 2 — the component harness

Faster, and correct when the question is about one component's states rather than a page's
composition. Render into jsdom or happy-dom and use the runtime measurements directly; no
screenshot is involved, so the answers are all measurements and none are observations.

```ts
import { applyViewport, observeElement, viewportProfiles } from '@vishwakarma/testing'
import { checkContract } from '@vishwakarma/core'

for (const [name, profile] of viewportProfiles.cases()) {
  applyViewport(profile)
  render(<Subject />)
  const report = checkContract(contract, observeElement(document.body))
  console.log(name, report.summary)
}
```

`applyViewport` installs a `matchMedia` mock from the profile, so container queries and
media queries resolve as they would at that width. Without it every breakpoint resolves to
whatever the test environment defaults to, which is usually desktop, which is why
mobile-only defects survive component tests.

`viewportProfiles.cases()` yields `[name, profile]` pairs shaped for a parameterised test
block, defaulting to the required six.

## Route 3 — the static build

When there is no dev server but there is a build, serve the output directory and use route 1
against it. This is strictly better than not rendering, and it misses only what the dev
server adds.

## Determinism, or the loop is noise

Borrow the three controls `code-quality` specifies for screenshot tests, for the same reason:

- **Freeze the clock.** Anything showing a relative time, a date, or a countdown differs
  between passes.
- **Fix the data.** A seeded fixture, not a live fetch and not a random generator. A changing
  list length changes the layout, and you will attribute that to your correction.
- **Fake the image loader.** Racing a real network fetch is the most common source of flake,
  and it fails intermittently, which is worse than failing always.

Without all three, two passes are not comparable and the loop cannot tell you anything.

## What to capture per pass

One full-page screenshot per required viewport, plus the contract report, plus the audit
report. Keep them in a directory named for the pass — `pass-1/`, `pass-2/` — because the
comparison between consecutive passes is the actual product of the loop, and overwriting
destroys it.

## Reading your own screenshot

Look at it as a picture before looking at it as a page. The questions worth asking of pixels
are the ones no query can answer: which element wins, whether anything is competing for the
same rank, whether the page has a rhythm or one repeated interval, whether any single moment
looks deliberate. Everything else — every number — comes from the queries.
