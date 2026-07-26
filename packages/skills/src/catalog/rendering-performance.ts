// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Performance advice usually arrives as a list of tricks — lazy-load this, memoise that,
 * debounce the other. Tricks do not compose, and applied without a model of what the
 * browser actually does they routinely make things slower: a lazy-loaded hero image, a
 * `useMemo` around an object literal, a virtualised list of eight rows.
 *
 * This skill teaches the model first. Four pipeline stages, one frame budget, three field
 * metrics, and the question "which stages does this change force, and on whose device?"
 * Everything else follows from that, including knowing when to do nothing.
 */
export const renderingPerformance: SkillManifest = {
  vsm: '1.0',
  id: 'rendering-performance',
  name: 'Rendering Performance',
  description:
    'Use when a page feels slow or janky, when optimising Core Web Vitals, or when writing code that renders, animates, or re-renders frequently.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'performance',
  tags: ['performance', 'core-web-vitals', 'lcp', 'inp', 'cls', 'react', 'rendering', 'jank'],

  activation: {
    intents: [
      'the user reports that a page is slow, janky, stuttering, or unresponsive',
      'optimising Core Web Vitals or a Lighthouse / PageSpeed score',
      'diagnosing why typing, scrolling, or clicking feels laggy',
      'building a long list, a table, a chart, or anything rendering many nodes',
      'reducing bundle size or JavaScript execution cost on a route',
      'investigating layout shift, slow image loading, or a slow first paint',
    ],
    globs: [
      '**/*.tsx',
      '**/*.jsx',
      '**/next.config.*',
      '**/vite.config.*',
      '**/webpack.config.*',
      '**/*.css',
    ],
    keywords: [
      'performance',
      'slow',
      'jank',
      'lighthouse',
      'core web vitals',
      'lcp',
      'inp',
      'cls',
      'bundle size',
      're-render',
      'virtualise',
    ],
  },

  content: {
    summary:
      'Reason about rendering cost through the browser pixel pipeline and the frame budget, then fix LCP, CLS and INP at their real causes rather than guessing — and measure on a throttled device, never a development laptop.',

    body: `# Rendering Performance

Nearly every performance mistake comes from not knowing which of four stages a change
forces the browser to run, and on whose hardware. Learn the pipeline and the rest is
arithmetic.

---

## 1. The pixel pipeline

Every visual update passes through some suffix of: **style** (match selectors, compute
final values) → **layout** (compute geometry) → **paint** (fill pixels into layers) →
**composite** (assemble layers on the GPU). Stages run in order, and running a stage
implies running every stage after it.

Which stage a property enters at is the whole game. \`width\`, \`height\`, \`top\`,
\`margin\`, \`font-size\` enter at layout, so a change costs all four stages and the layout
cost scales with the number of affected descendants. \`background-color\`,
\`box-shadow\`, \`border-radius\`, \`color\` enter at paint — no geometry recomputation, but
still rasterisation. \`transform\`, \`opacity\` and \`filter\` on a composited layer skip
straight to composite and can run on the compositor thread, which is why they survive a
busy main thread and \`left\` does not.

The reflex when animating anything: express it as a transform. Animating \`left\` from
0 to 300px and \`transform: translateX(300px)\` look identical and differ by three pipeline
stages per frame.

---

## 2. The frame budget is not 16.7ms

At 60Hz a frame is 16.7ms, but that is the *total* for your work plus style, layout, paint,
composite, garbage collection and browser bookkeeping. The usable main-thread share is
closer to **8-10ms**. On a 120Hz display the frame is 8.3ms and your share is around 4ms.

A **long task** is any main-thread task over 50ms — long enough that an input arriving at
its start waits at least that long. Long tasks are the unit of unresponsiveness, and one
120ms task is far worse than four 30ms tasks doing the same work, because only the former
can hold an input hostage.

---

## 3. Core Web Vitals now

Three metrics, each assessed at the **75th percentile** of real users, segmented by device:

| Metric | Good | Poor |
| --- | --- | --- |
| LCP (loading) | ≤ 2.5s | > 4.0s |
| INP (responsiveness) | ≤ 200ms | > 500ms |
| CLS (visual stability) | ≤ 0.1 | > 0.25 |

INP became stable in 2024, replacing First Input Delay. FID measured only the delay before
the *first* interaction's handler started, so it ignored handler duration and every later
interaction; almost everything passed it. INP takes roughly the worst interaction of the
visit and measures input delay **plus** processing **plus** the next paint. Sites that
passed FID comfortably routinely fail INP, and that is FID's fault, not a regression.

---

## 4. LCP

LCP is the render time of the largest image or text block in the initial viewport —
usually a hero image, or a heading that cannot paint until a webfont arrives.

Identify the element before optimising; teams routinely optimise the wrong one. Then attack
the dominant phase: time to first byte, resource load delay (late discovery), load time, or
render delay (blocked by CSS, fonts, or hydration).

Discovery is the usual culprit. An \`<img>\` in the initial HTML is found by the preload
scanner immediately; one rendered by client JavaScript, set as a CSS \`background-image\`,
or chosen after a media query is not. Fix with a real \`<img>\` plus
\`fetchpriority="high"\`, or \`<link rel="preload" as="image" fetchpriority="high">\`.

**Never apply \`loading="lazy"\` to the LCP element.** Blanket lazy-loading is the single
commonest self-inflicted LCP regression: the browser defers the one image it should fetch
first. Lazy-load below the fold only.

For text LCP, use \`font-display: swap\` or \`optional\` with a preloaded, subsetted WOFF2,
so the heading paints in the fallback rather than waiting.

---

## 5. CLS

CLS sums layout shift scores over the worst 5-second session window (shifts separated by
more than 1s starting a new window). Every shift traces to content arriving after layout
was already computed for something else.

Reserve space unconditionally. Give every \`<img>\` and \`<video>\` \`width\` and
\`height\` attributes — browsers derive an \`aspect-ratio\` from them and hold the box
before the bytes arrive. For containers with unknown content, set \`min-height\`.

Fonts shift text when the fallback's metrics differ from the webfont's. Correct with
\`size-adjust\`, \`ascent-override\` and \`descent-override\` on an \`@font-face\` fallback
so the two occupy the same space.

Late-injected banners, consent dialogs and ad slots are the remaining cause: render them in
a pre-reserved slot, or fixed, outside flow entirely. Shifts within
500ms of a user interaction are excluded — which is why an accordion opening is fine and a
banner appearing on its own is not.

---

## 6. INP

INP has three parts. **Input delay** is time spent waiting for a busy main thread — caused
by third-party scripts, hydration, and long tasks unrelated to the interaction.
**Processing** is your handlers. **Presentation delay** is the render that follows.

The classic failure is a heavy re-render on every keystroke: an input drives state that
re-renders a large filtered list, so each character costs 150ms and the field visibly lags.
The fix is not debouncing the *field* — that makes the caret feel broken — but separating
the urgent update (the input's own value) from the non-urgent one (the list).

Break up long tasks by yielding. \`await scheduler.yield()\` resumes at the front of the
queue and is the right primitive where available, but it is not yet Baseline, so feature-
detect and fall back to \`await new Promise(r => setTimeout(r, 0))\`. Yield *after* painting
the visible acknowledgement, not before.

---

## 7. React

The React Compiler reached 1.0 in October 2025 and memoises automatically at build time. In
a compiled codebase, hand-written \`useMemo\` and \`useCallback\` are mostly noise, and each
one still costs a dependency-array comparison and retains its captured values. Without the
compiler, memoise only what profiling shows: \`memo\` on a component whose parent re-renders
often with unchanged props, \`useMemo\` for genuinely expensive computation or for an object
identity that a memoised child or an effect depends on. Wrapping a string concatenation in
\`useMemo\` is a net loss.

Context is the common cascade: every consumer re-renders when the provider's value changes,
so a context holding both a rarely-changing theme and a per-keystroke value re-renders the
whole tree on every keystroke. Split providers by change frequency; never pass a fresh
object literal as \`value\`.

\`useTransition\` and \`useDeferredValue\` mark an update as interruptible so React can
paint the urgent one first — the correct tool for the typeahead case above.

Virtualise a list when rendered rows exceed roughly 100, or sooner if rows are heavy.
Below that, virtualisation adds scroll complexity, breaks in-page find, and harms
accessibility for no measurable gain.

---

## 8. Layout thrash, containment, and images

Reading a geometry property (\`offsetHeight\`, \`getBoundingClientRect\`,
\`scrollTop\`, \`getComputedStyle\`) forces a synchronous layout if styles are dirty. In a
loop that alternates read and write, you force one layout per iteration — quadratic-feeling
cost from linear-looking code. **Batch all reads, then all writes.**

\`content-visibility: auto\` skips style, layout and paint for off-screen subtrees; pair it
with \`contain-intrinsic-size\` or the scrollbar will jump. \`contain: layout paint\` scopes
work to a subtree.

Serve AVIF or WebP, size with \`srcset\`/\`sizes\`, and never ship a 2000px image into a
400px slot.

---

## 9. Measure honestly

A development laptop on a fast connection is not a measuring instrument. Lab tools
diagnose; only field data (CrUX, or \`web-vitals\` reported to your own endpoint) tells you
what users experience. **Throttle CPU 4-6x and use a slow network profile** before
believing anything is fast, and check the p75, not the median.`,

    references: [
      {
        id: 'diagnosing-web-vitals',
        title: 'Diagnosing each Core Web Vital',
        answers:
          'A specific Core Web Vital is failing. What is the exact procedure to find the cause rather than guessing at fixes?',
        content: `# Diagnosing each Core Web Vital

Optimising a metric you have not diagnosed is guessing. Each metric has a decomposition
that turns "LCP is 4.1s" into a named subsystem to fix.

## Before anything: get field data

Lab tools simulate one device on one connection at one moment. They cannot tell you that
your p75 is dominated by users on three-year-old Android phones over 4G, which is usually
the truth. Report all three metrics, with their attribution payloads, from the
\`web-vitals\` library to your own endpoint, keyed by route and device class.

Attribution entries are the important part: for LCP they name the element and split the
time into phases; for CLS they identify the largest shifting element; for INP they give the
event type, target selector, and the three timing phases. Without attribution you are
collecting numbers you cannot act on.

## LCP

**Step 1 — identify the element.** In Chrome DevTools' Performance panel, record a load and
find the LCP marker in the Timings track; hovering reveals the node. In the field, use
\`LCPAttribution.element\`. A common surprise is that the LCP element is a large empty
container or a paragraph of body copy rather than the hero image everyone assumed.

**Step 2 — split into four phases** using attribution:

    TTFB                  server + network for the document
    resource load delay   TTFB → the LCP resource starting to download
    resource load time    the download itself
    render delay          resource complete → pixels on screen

Each phase points somewhere specific.

- **TTFB dominant (over ~40% of LCP)**: the problem is server or CDN, not the frontend.
  Look at cache hit rates, origin response time, and redirect chains — a single extra
  redirect on a mobile connection can cost 300ms.
- **Load delay dominant**: a discovery problem. The resource was not in the initial HTML,
  or it queued behind other requests. Check whether the image is rendered by client
  JavaScript, referenced from CSS, or selected after a media query — all three are
  invisible to the preload scanner. Check whether \`fetchpriority="high"\` is set; images
  default to low priority until layout proves they are in the viewport.
- **Load time dominant**: the resource is too big or the format is wrong. Compare
  transferred bytes against rendered display size. A 1.8MB JPEG in a 640px slot is the
  routine case; AVIF at an appropriate width usually cuts it by 80%.
- **Render delay dominant**: something blocked painting. Render-blocking CSS in the head, a
  webfont without \`font-display\`, or — most often in single-page frameworks — the element
  only exists after hydration. If your LCP element renders client-side, no image
  optimisation will help; the fix is to server-render it.

## CLS

**Step 1 — reproduce with the Layout Shift Regions overlay** (DevTools Rendering panel).
Shifted regions flash blue. Throttle the connection so late-arriving resources behave as
they do in the field.

**Step 2 — read the shift entries.** Each \`layout-shift\` entry has \`sources\`, giving the
nodes that moved and their before/after rectangles. The element that *moved* is rarely the
culprit; the culprit is whatever was inserted or resized above it.

**Step 3 — classify the cause.** In practice there are five:

1. **Media without dimensions.** An image or video, iframe, or embed with no reserved box.
   The fix is \`width\` and \`height\` attributes (which produce an implicit
   \`aspect-ratio\`), or an explicit \`aspect-ratio\` in CSS.
2. **Webfont swap.** Text reflows when the fallback and webfont have different metrics.
   Build a matched \`@font-face\` fallback with \`size-adjust\`, \`ascent-override\` and
   \`descent-override\`. Done correctly this reduces the font-related shift to zero.
3. **Late injection.** Consent banners, promotional bars, A/B variants, and ad slots
   inserted after first paint. Reserve the space server-side, or render them fixed.
4. **Data-dependent height.** A container that grows when a fetch resolves. Give the
   skeleton the height of the loaded state — a skeleton of the wrong height is worse than
   none, because it guarantees a shift.
5. **Animating layout properties.** Transitions on \`height\`, \`top\` or \`margin\` count as
   layout shifts. Transform-based animation does not.

Remember the interaction exclusion window: shifts beginning within 500ms of a user input
are not counted. If DevTools shows a shift you believe is user-initiated but it still
scores, the causal input was more than 500ms earlier.

## INP

**Step 1 — find the interaction, not the average.** INP reports roughly the worst
interaction of the visit, so aggregates hide it. Use \`web-vitals\` attribution to collect
the event type and target selector for the worst interaction per session, then group by
selector. One control is usually responsible for most of the tail.

**Step 2 — split into three phases.**

    input delay        input arrives → handler starts
    processing time    handler execution
    presentation delay handler ends → next frame painted

- **Input delay dominant**: the main thread was busy with something else. Look for long
  tasks and, in Chromium, \`PerformanceLongAnimationFrameTiming\` entries, which attribute a
  slow frame to the specific scripts that ran in it — far more actionable than the older
  Long Tasks API, which reported duration but not source. Third-party tags, hydration, and
  analytics init dominate here.
- **Processing dominant**: your handler does too much synchronously. Split it: do the
  minimum needed for visible feedback, yield, then do the rest.
- **Presentation dominant**: rendering the result is expensive. A large re-render, an
  expensive layout, or a very deep DOM. This is where framework-level work — transitions,
  virtualisation, narrower state subscriptions — actually pays.

**Step 3 — reproduce under throttling.** INP problems are frequently invisible on a
development machine and severe at 4x CPU throttling. If you cannot reproduce one, you are
not throttled enough.`,
      },
      {
        id: 'react-render-patterns',
        title: 'React render-performance patterns',
        answers:
          'How do I find and fix expensive re-renders in a React application, and when is memoisation, virtualisation, or a transition actually the right tool?',
        content: `# React render-performance patterns

Most React performance work is misdirected because it starts from a suspicion rather than a
profile. The Profiler in React DevTools records a commit and shows exactly which components
rendered and why. Record first.

## The three costs

A React update costs **render** (running component functions and diffing), **commit**
(applying DOM mutations), and **browser work** (style, layout, paint on the mutated
subtree). These respond to different fixes. A component that renders 400 times cheaply may
be irrelevant; one that renders twice and commits 3,000 nodes is the problem. The Profiler's
flame chart shows render cost; the commit cost shows up in the Performance panel as layout
and paint.

## The React Compiler changes the default advice

React Compiler 1.0 shipped in October 2025. It analyses components and inserts memoisation
automatically, at a granularity finer than hand-written hooks — it can memoise individual
JSX subtrees, not just whole components. In a compiled codebase:

- Hand-written \`useMemo\`/\`useCallback\` are usually redundant. They still cost a
  dependency comparison per render and retain their captured values, so removing them is a
  small win, not a neutral change.
- \`memo()\` on components is largely unnecessary for the same reason.
- The compiler only optimises code that follows the Rules of React. Components that mutate
  props or state in place, or read refs during render, are bailed out silently. Run the
  ESLint plugin and treat bailouts as bugs, because a bailed-out component gets no
  optimisation at all while you believe it is covered.

Without the compiler, the calculus is the classic one: memoisation costs a comparison and
memory on every render and pays only when it prevents work that is more expensive than
that.

## When manual memoisation genuinely pays

1. **Referential identity that something else depends on.** An object or callback passed to
   a memoised child, used in a \`useEffect\` dependency array, or given to a context
   provider. Here \`useMemo\` is not an optimisation but a correctness tool — without it the
   effect re-runs every render.
2. **Genuinely expensive computation.** Sorting or filtering thousands of items, parsing,
   date formatting in a loop. The threshold is real work, not "a function call".
3. **A wide subtree under a frequently-rendering parent.** \`memo\` on a heavy sibling of a
   fast-changing element.

When it does not pay: primitives, small object literals, functions passed to DOM elements,
and components that re-render anyway because their props change every time. A \`memo\`
around a component receiving \`style={{ margin: 8 }}\` never hits, because the object is
new every render — it adds a comparison and prevents nothing.

## Context cascades

Every consumer of a context re-renders when the provider's \`value\` changes by reference.
Two failure modes follow:

**Inline value objects.** \`<Ctx.Provider value={{ user, setUser }}>\` creates a new object
on every parent render, so every consumer re-renders even when \`user\` is unchanged.

**Mixed change frequencies.** A single context holding theme, user, and a live search string
re-renders every theme consumer on every keystroke. Split by frequency: one provider per
independently-changing concern. A state manager with selector-based subscriptions is the
alternative when the shape genuinely cannot be split.

## Transitions and deferred values

\`useTransition\` marks an update as non-urgent. React renders the urgent update first,
paints it, and can interrupt and restart the non-urgent one if another input arrives:

    const [isPending, startTransition] = useTransition()
    function onChange(e) {
      setQuery(e.target.value)                          // urgent: the input's own value
      startTransition(() => setResults(filter(e.target.value)))  // non-urgent
    }

\`useDeferredValue\` is the same idea expressed downstream, useful when you do not own the
setter: \`const deferredQuery = useDeferredValue(query)\`, then derive the expensive view
from \`deferredQuery\`. Both keep the caret responsive while the heavy list lags by a frame
or two, which is what users actually want.

Note what this does *not* do: it does not make the filtering cheaper. If a single filter
pass exceeds the frame budget, the transition cannot interrupt it — interruption happens
between component renders, not inside one long synchronous function.

## Lists

Virtualise when the number of *rendered* rows is large — roughly 100 as a starting point,
lower for rows containing images or charts. Below that, virtualisation costs more than it
saves and brings real defects: browser find-in-page misses off-screen rows, anchor links to
hidden items break, and screen reader users get an inconsistent item count unless you
manage \`aria-setsize\` and \`aria-posinset\` yourself.

Two things matter more than virtualisation for medium lists:

- **Stable keys.** Index keys cause React to reuse the wrong DOM nodes when the list
  reorders, producing both incorrect state and unnecessary mutation. Use a stable id.
- **Memoised rows.** With a stable row component and stable props, a list of 500 items that
  changes one item commits one row rather than 500.

Use \`content-visibility: auto\` with \`contain-intrinsic-size\` on rows as a cheap
alternative to virtualisation: the DOM stays complete, so find-in-page and accessibility
still work, but off-screen rows skip layout and paint entirely.

## Effects that cause a second render

An effect that sets state runs after commit, forcing another render-and-commit cycle before
the browser paints if it is a layout effect, or a visible flash if it is not. State that can
be derived during render should be derived during render, not synchronised in an effect.`,
      },
    ],
  },

  rules: [
    {
      id: 'rendering-performance/animate-compositor-properties',
      strength: 'must',
      statement:
        'Animate only transform, opacity, and filter; never animate width, height, top, left, or margin.',
      evidence: {
        rationale:
          'Geometric properties enter the pixel pipeline at the layout stage, so every frame forces layout, paint and composite for the element and its affected descendants. Transform and opacity are handled at the composite stage on an existing layer, so they can run on the compositor thread and continue at full frame rate while the main thread is busy.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.panel { transition: left 200ms, height 200ms; }',
        good: '.panel { transition: transform 200ms, opacity 200ms; will-change: transform; }',
      },
      verifiedBy: 'pipeline-audit',
    },
    {
      id: 'rendering-performance/no-lazy-lcp',
      strength: 'must-not',
      statement:
        'Do not apply loading="lazy" or client-side lazy rendering to the element that is or may be the LCP element.',
      evidence: {
        rationale:
          'Lazy loading defers the request until layout proves the element is near the viewport, which is precisely the discovery delay LCP measures. Applying it to the hero image removes the one resource that should be fetched first from the preload scanner’s reach, typically adding several hundred milliseconds on a mobile connection.',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<img src="/hero.avif" loading="lazy" width="1200" height="630" alt="">',
        good: '<img src="/hero.avif" fetchpriority="high" width="1200" height="630" alt="">',
      },
      verifiedBy: 'lcp-review',
    },
    {
      id: 'rendering-performance/identify-lcp-element',
      strength: 'must',
      statement:
        'Identify the actual LCP element and the phase that dominates its timing before making any change intended to improve LCP.',
      evidence: {
        rationale:
          'LCP decomposes into time to first byte, resource load delay, resource load time, and render delay, and each phase has a disjoint set of fixes. Optimising image bytes when the dominant phase is render delay caused by client-side rendering produces no measurable change, which is the most common way LCP work is wasted.',
        confidence: 'strong',
      },
      verifiedBy: 'lcp-review',
    },
    {
      id: 'rendering-performance/reserve-media-space',
      strength: 'must',
      statement:
        'Give every image, video, iframe, and embed explicit width and height attributes or an aspect-ratio, and reserve a min-height for any container whose content arrives asynchronously.',
      evidence: {
        rationale:
          'Layout is computed before a resource’s intrinsic dimensions are known, so an unsized element occupies zero height and everything below it moves when the bytes arrive. Dimension attributes let the browser derive an aspect-ratio and hold the correct box from the first layout pass.',
        confidence: 'established',
      },
      verifiedBy: 'cls-review',
    },
    {
      id: 'rendering-performance/font-metric-overrides',
      strength: 'should',
      statement:
        'Declare a fallback @font-face with size-adjust, ascent-override, and descent-override matched to the webfont, rather than relying on font-display alone.',
      evidence: {
        rationale:
          'font-display: swap eliminates invisible text but not the reflow, because the fallback and the webfont occupy different amounts of space. Overriding the fallback’s metrics makes the two typefaces occupy identical boxes, so the swap changes glyph shapes without moving a single line.',
        confidence: 'strong',
      },
      exceptions: [
        'font-display: optional, which never swaps within the same page view and therefore cannot shift.',
      ],
      verifiedBy: 'cls-review',
    },
    {
      id: 'rendering-performance/no-late-injection',
      strength: 'must-not',
      statement:
        'Do not insert banners, consent dialogs, notification bars, or ad slots into the document flow after first paint without pre-reserved space.',
      evidence: {
        rationale:
          'Content inserted above existing content displaces everything below it, and because the insertion is not attributable to a user interaction it falls outside the 500ms exclusion window and counts in full toward CLS. A single top-of-page banner appearing at 1.5s can exceed the entire 0.1 budget on its own.',
        confidence: 'established',
      },
      exceptions: [
        'Overlays positioned fixed or absolute, which are outside normal flow and displace nothing.',
      ],
    },
    {
      id: 'rendering-performance/batch-reads-and-writes',
      strength: 'must',
      statement:
        'Batch all geometry reads before all style writes; never interleave reading offsetHeight or getBoundingClientRect with mutating styles inside a loop.',
      evidence: {
        rationale:
          'Reading a geometry property while style changes are pending forces the browser to run layout synchronously so it can return a correct value. Alternating reads and writes therefore forces one full layout per iteration instead of one for the whole batch, turning linear-looking code into repeated whole-document layout.',
        confidence: 'established',
      },
      examples: {
        language: 'js',
        bad: 'for (const el of items) {\n  el.style.height = el.offsetHeight * 2 + \'px\'\n}',
        good: "const heights = items.map((el) => el.offsetHeight)\nitems.forEach((el, i) => { el.style.height = heights[i] * 2 + 'px' })",
      },
      verifiedBy: 'pipeline-audit',
    },
    {
      id: 'rendering-performance/yield-in-long-tasks',
      strength: 'should',
      statement:
        'Break any main-thread work exceeding roughly 50ms into chunks that yield, using scheduler.yield() where available with a setTimeout fallback.',
      evidence: {
        rationale:
          'The browser cannot interrupt a running task to dispatch an input event, so a task of duration D adds up to D milliseconds of input delay to anything the user does during it. Yielding returns control to the event loop at each boundary, capping the worst-case wait at the chunk size rather than the total.',
        confidence: 'established',
      },
      examples: {
        language: 'js',
        bad: 'for (const row of rows) process(row) // 900ms, uninterruptible',
        good: "for (const [i, row] of rows.entries()) {\n  process(row)\n  if (i % 50 === 49) await (globalThis.scheduler?.yield?.() ?? new Promise((r) => setTimeout(r, 0)))\n}",
      },
      verifiedBy: 'inp-review',
    },
    {
      id: 'rendering-performance/separate-urgent-updates',
      strength: 'should',
      statement:
        'Separate the urgent part of an interaction from the expensive part using useTransition or useDeferredValue rather than debouncing the input itself.',
      evidence: {
        rationale:
          'Debouncing the control delays the feedback the user is directly watching, so the caret or toggle appears to lag even though total work fell. Marking only the derived update as non-urgent lets React paint the control immediately and interrupt the expensive render when the next keystroke arrives.',
        confidence: 'strong',
      },
      exceptions: [
        'Work with an external cost per invocation, such as a network request, which should still be debounced or throttled.',
      ],
      verifiedBy: 'inp-review',
    },
    {
      id: 'rendering-performance/profile-before-memoising',
      strength: 'should-not',
      statement:
        'Do not add memo, useMemo, or useCallback speculatively; add them only where a profile shows the prevented work exceeds the comparison cost.',
      evidence: {
        rationale:
          'Every memoisation hook allocates a dependency array, compares it on each render, and retains its captured values for the component’s lifetime. Around cheap expressions this is a net cost, and around a component whose props change every render it is pure overhead because the comparison never hits.',
        confidence: 'strong',
      },
      exceptions: [
        'Memoising for referential stability that a memoised child, an effect dependency, or a context value depends on, which is a correctness concern rather than an optimisation.',
      ],
    },
    {
      id: 'rendering-performance/compiler-supersedes-manual-memo',
      strength: 'should',
      statement:
        'In a codebase compiled with React Compiler, remove hand-written memoisation rather than adding to it, and treat compiler bailouts as defects to fix.',
      evidence: {
        rationale:
          'React Compiler 1.0 inserts memoisation at build time with finer granularity than hooks allow, so manual hooks are redundant while still costing comparisons. It silently skips components that break the Rules of React, so a bailed-out component receives no optimisation at all while appearing to be covered.',
        source: 'React Compiler v1.0',
        url: 'https://react.dev/blog/2025/10/07/react-compiler-1',
        confidence: 'strong',
      },
    },
    {
      id: 'rendering-performance/split-context-by-frequency',
      strength: 'must',
      statement:
        'Split React context providers by change frequency, and never pass a freshly-created object literal as a provider value.',
      evidence: {
        rationale:
          'Context propagation is triggered by reference inequality of the provider value, and every consumer re-renders regardless of which part of the value it reads. A single provider mixing a stable theme with a per-keystroke value therefore re-renders every themed component on every keystroke, which is the most common cause of a failing INP in React applications.',
        confidence: 'strong',
      },
      examples: {
        language: 'tsx',
        bad: '<AppCtx.Provider value={{ theme, user, query }}>{children}</AppCtx.Provider>',
        good: '<ThemeCtx.Provider value={theme}>\n  <QueryCtx.Provider value={query}>{children}</QueryCtx.Provider>\n</ThemeCtx.Provider>',
      },
    },
    {
      id: 'rendering-performance/virtualise-above-threshold',
      strength: 'should',
      statement:
        'Virtualise a list only once rendered rows exceed roughly 100, or sooner if rows contain images or charts; below that use stable keys and memoised rows instead.',
      evidence: {
        rationale:
          'Virtualisation removes off-screen nodes from the DOM, which also removes them from browser find-in-page, from anchor targets, and from the accessibility tree unless setsize and posinset are managed manually. Under about a hundred rows the layout and paint cost it saves is smaller than the scroll bookkeeping it adds.',
        confidence: 'opinion',
      },
    },
    {
      id: 'rendering-performance/content-visibility-needs-intrinsic-size',
      strength: 'must',
      statement:
        'Always pair content-visibility: auto with contain-intrinsic-size.',
      evidence: {
        rationale:
          'content-visibility: auto skips layout for off-screen subtrees, so without a declared placeholder size those subtrees measure zero height. The scroll container then reports the wrong total height, the scrollbar jumps as content enters and leaves the viewport, and scroll anchoring fights the user.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.row { content-visibility: auto; }',
        good: '.row { content-visibility: auto; contain-intrinsic-size: auto 72px; }',
      },
    },
    {
      id: 'rendering-performance/responsive-images',
      strength: 'must',
      statement:
        'Serve images in AVIF or WebP with srcset and sizes, and never transfer an image whose intrinsic width exceeds twice its largest rendered width.',
      evidence: {
        rationale:
          'Image bytes usually dominate the transferred weight of a page and are on the critical path for LCP. AVIF typically encodes at a third to a half of an equivalent-quality JPEG, and correct srcset selection avoids sending desktop-resolution files to devices that will downscale them, wasting both bandwidth and decode time.',
        confidence: 'established',
      },
    },
    {
      id: 'rendering-performance/throttled-measurement',
      strength: 'must',
      statement:
        'Measure with CPU throttled at least 4x and a constrained network profile, and judge against the 75th percentile rather than the median.',
      evidence: {
        rationale:
          'A development machine executes JavaScript several times faster than the median device in most real audiences, so main-thread problems that dominate field INP are simply invisible locally. Core Web Vitals are assessed at p75, so a median that passes tells you nothing about whether the site passes.',
        confidence: 'established',
      },
      verifiedBy: 'measurement-hygiene',
    },
    {
      id: 'rendering-performance/field-data-decides',
      strength: 'should',
      statement:
        'Use lab tooling to diagnose causes but field data (CrUX or your own web-vitals reporting) to decide whether a change worked.',
      evidence: {
        rationale:
          'Lab runs sample one synthetic device, connection, and cache state, so they cannot represent the distribution that p75 is drawn from. A lab score can improve while the field p75 worsens, most commonly when a change helps warm-cache repeat visits and hurts cold first loads.',
        confidence: 'strong',
      },
      verifiedBy: 'measurement-hygiene',
    },
    {
      id: 'rendering-performance/js-budget-per-route',
      strength: 'should',
      statement:
        'Set and enforce a per-route JavaScript budget in CI, measured as compressed transfer size and main-thread execution time, not as total bundle size.',
      evidence: {
        rationale:
          'Parse, compile and execution cost scales with the JavaScript actually delivered to a route, and on mid-range mobile hardware executing a script costs several times longer than downloading it. A whole-application bundle figure hides per-route regressions, and without a CI gate the size ratchets upward one feature at a time.',
        confidence: 'strong',
      },
    },
  ],

  verification: [
    {
      id: 'pipeline-audit',
      kind: 'self-review',
      description: 'Confirm no change forces avoidable pipeline stages.',
      blocking: true,
      questions: [
        'List every animated or transitioned property. Does any of them enter the pipeline at layout or paint rather than composite?',
        'Does any loop read a geometry property (offsetHeight, getBoundingClientRect, scrollTop, getComputedStyle) after writing a style in the same iteration?',
        'Is will-change applied to a small number of elements that actually animate, rather than left on permanently?',
      ],
    },
    {
      id: 'lcp-review',
      kind: 'self-review',
      description: 'Confirm the LCP element is discoverable and prioritised.',
      blocking: true,
      questions: [
        'Which element is the LCP element, and did you confirm that rather than assume it?',
        'Is that element present in the server-rendered HTML, so the preload scanner can find it?',
        'Does it carry loading="lazy", or is it rendered only after client JavaScript runs?',
        'Which of the four LCP phases dominates, and does the change you made address that phase?',
      ],
    },
    {
      id: 'cls-review',
      kind: 'self-review',
      description: 'Confirm nothing shifts after first paint.',
      blocking: true,
      questions: [
        'Does every image, video, iframe, and embed have explicit dimensions or an aspect-ratio?',
        'Does every loading skeleton occupy exactly the height of the content that replaces it?',
        'Is anything inserted into document flow after first paint — a banner, consent dialog, or ad slot — without reserved space?',
        'Do webfonts have a metric-matched fallback, or will the swap reflow text?',
      ],
    },
    {
      id: 'inp-review',
      kind: 'self-review',
      description: 'Confirm interactions stay responsive under load.',
      blocking: true,
      questions: [
        'For the heaviest interaction on this screen, what work happens synchronously in the handler, and does it exceed 50ms under 4x CPU throttling?',
        'Does any keystroke trigger a re-render of a large list or tree without a transition or deferred value?',
        'Does any context provider mix a per-interaction value with values consumed by a wide subtree?',
        'Is visible feedback painted before the expensive work begins, rather than after it?',
      ],
    },
    {
      id: 'measurement-hygiene',
      kind: 'self-review',
      description: 'Confirm the measurement supports the claim.',
      blocking: true,
      questions: [
        'Was the measurement taken with CPU throttling and a constrained network profile, or on an unthrottled development machine?',
        'Are you reporting a p75 across real sessions, or a single lab run?',
        'Was the same scenario measured before and after the change, with the same cache state?',
        'Did any metric other than the one you targeted get worse?',
      ],
    },
    {
      id: 'budget-check',
      kind: 'self-review',
      description: 'Confirm the route stays within its resource budget.',
      questions: [
        'What is the compressed JavaScript transfer size for this route, and what is its budget?',
        'Does the route ship any dependency it uses only on an interaction that could be dynamically imported?',
        'What is the largest image transferred, and how does its intrinsic width compare with its rendered width?',
      ],
    },
  ],

  relatedSkills: [
    'motion-design',
    'responsive-architecture',
    'layout-composition',
    'scroll-experiences',
    'accessible-components',
  ],
}