// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Performance on a phone is a budget problem with a hard deadline and a hostile measurement
 * environment. The deadline is the display's refresh interval. The environment is a thermally
 * throttled mid-range device on a congested network, which is not the machine the work was
 * done on and not the network it was tested over.
 *
 * The characteristic performance defect is therefore not slow code. It is a confident claim
 * about slow code: a rewrite justified by "this felt slow"; a timing taken with
 * System.currentTimeMillis() on a debuggable build, where R8 is off and ART is interpreting,
 * so the number is two to five times wrong and wrong in the wrong shape; a mean frame time of
 * 8.5ms reported as healthy on a scroll the user watched stutter three times; a launch that
 * reaches first frame in 380ms, shows grey rectangles for another three seconds, and is filed
 * as an improvement.
 *
 * The posture that avoids all of them is one sentence long: measure the thing users experience,
 * on the build and device they have, at the percentile where the complaints live. That
 * decomposes into two rules that carry most of this file. No architectural change without a
 * trace that names the slice, its duration, and the thread it ran on — because a claim that
 * cannot be falsified also cannot be defended when it makes something else worse. And budgets
 * are percentiles from the field, never medians from the lab: a lab trace explains why
 * something is slow and can never tell you whether it is slow for your users.
 *
 * The remaining numbers follow from three hard mechanisms. A missed frame deadline re-scans
 * the previous frame, so content is stationary for two intervals rather than one. Android does
 * not swap, so memory pressure kills the process rather than slowing it. And Play's
 * bad-behaviour thresholds reduce the distribution of every future release, including the one
 * that fixes the regression, which makes stability a product constraint rather than a
 * preference.
 */
export const mobilePerformance: SkillManifest = {
  vsm: '1.0',
  id: 'mobile-performance',
  name: 'Mobile Performance',
  description:
    'Use when budgeting or profiling startup, frame time, memory, or app size — or before any change justified by "this feels slow".',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'performance',
  tags: ['performance', 'android', 'startup', 'jank', 'memory'],

  activation: {
    intents: [
      'the app is slow to launch, or a startup time has regressed',
      'a list or a scroll stutters, drops frames, or janks on a mid-range device',
      'deciding whether a performance rewrite is justified, or reviewing one that was',
      'memory growth, out-of-memory crashes, or a suspected leak after navigating away',
      'download or install size has grown and needs a budget attached to it',
      'setting up Macrobenchmark, Perfetto, Baseline Profiles, or Instruments',
      'crash or ANR rates approaching the Play bad-behaviour thresholds',
      'measuring or budgeting Core Web Vitals for the web build of the same product',
      'adding performance gates to CI so a regression fails the build',
    ],
    globs: [
      '**/build.gradle',
      '**/build.gradle.kts',
      '**/AndroidManifest.xml',
      '**/proguard-rules.pro',
      '**/baseline-prof.txt',
      '**/*Benchmark*.kt',
      '**/*Application*.kt',
      '**/*.kt',
      '**/*.swift',
    ],
    keywords: [
      'startup time',
      'cold start',
      'ttid',
      'ttfd',
      'jank',
      'frame budget',
      'macrobenchmark',
      'perfetto',
      'baseline profile',
      'anr',
      'oom',
      'leakcanary',
      'heap dump',
      'r8',
      'mapping.txt',
      'app bundle',
      'lcp',
      'inp',
      'cls',
    ],
  },

  content: {
    summary:
      'Use before optimising or restructuring anything for speed on a phone: the trace and benchmark evidence that admits a change, startup and frame and memory and size budgets, field percentiles rather than lab medians, and the CI gates that hold them.',

    body: `# Mobile Performance

Performance on a phone is a budget problem with a hard deadline and a hostile measurement
environment. The deadline is the display's refresh interval. The environment is a thermally
throttled mid-range device on a congested network, which is neither the machine the work was done
on nor the network it was tested over. Every number below is a budget enforced at a percentile of
real sessions rather than at the median of a lab run.

---

## 1. The evidence rule

**No architectural change without a trace.** A rewrite justified by "this felt slow" cannot be
falsified, cannot be measured after the fact, and cannot be defended when it makes something else
worse. What admits the change is a capture that names the slice, its duration, and the thread it
ran on.

Console output is not proof. A \`System.currentTimeMillis()\` pair around a block measures wall time
on a debuggable build, where R8 is disabled, ART runs interpreted or JIT-compiled code with no
profile-guided AOT, and the debugger's instrumentation hooks are live. That is commonly two to five
times slower than release, and slower in a *distribution* that does not match release, so the
ranking of costs changes rather than merely scaling — which is how a debug timing yields a
conclusion that is exactly backwards. Macrobenchmark's numbers transfer because it drives a
release-like build in a separate process; Perfetto ends arguments because its slice table is
queryable, so "the suspected culprit is not among the slices over one frame" becomes a fact rather
than an impression. Put your own timings on that timeline with \`androidx.tracing.trace("loadFeed")\`
instead of into a log, so your work is visible beside the binder call it was waiting on. Tool
selection, the query, and the Instruments equivalents sit in **budgets-and-evidence**.

## 2. Startup budgets

Startup has three shapes. **Cold** creates the process, the Application object and the first
Activity: target under **1s**, investigate anything over **2s**. **Warm**
reuses a live process but recreates the Activity: target under **500ms**, investigate over **1s**.
**Hot** returns an existing Activity to the foreground: target under **100ms**, investigate over
**500ms**, all measured on the target mid-range device rather than on the fastest handset in the
room.

Two different moments both get called startup. **TTID**, time to initial display, is when the
first frame is drawn, and the platform reports it for free. **TTFD**, time to full display, is
when the screen shows real content, and nothing reports it unless you call \`reportFullyDrawn()\` or
\`ReportDrawn\`. **TTFD is the honest number.** TTID can be driven arbitrarily low by painting a
skeleton immediately, which improves the metric and changes nothing for a user still looking at
grey rectangles; a team that optimises TTID alone eventually ships a launch reaching first frame
in 380ms and usable content in 3.4 seconds, and files it as a win. Track both, gate on TTFD.

Most of the cold-start tax is main-thread work before the first frame, and most of it is invisible
in your source. A library's initialisation \`ContentProvider\`, merged in from a dependency, is
created by the system before \`Application.onCreate()\` returns — synchronously, in manifest order —
so a few analytics and crash-reporting libraries routinely add 200–400ms before your code runs. A Baseline Profile is the other large lever, typically 15–30%, because
without one ART interprets and JIT-compiles the startup path on the first runs.

## 3. Frame budgets

The frame budget is the refresh interval: **16.7ms at 60Hz**, **11.1ms at 90Hz**, **8.3ms at
120Hz**. It is the budget for the whole frame, not for your draw call. Inside that window the
system delivers input, runs your composition or layout and draw, hands buffers to SurfaceFlinger,
and lets the compositor assemble and queue the frame before the next scanout, so your application
thread realistically owns about half of it. Measuring your own render at 9ms on a
120Hz panel and declaring the frame safe is how a fast screen still drops every third frame. A
missed deadline is also not a slightly late frame: the previous frame is re-scanned and content is
stationary for two intervals, which is why jank is perceptible at drop rates a throughput average
calls negligible.

**Jank is a percentile, never a mean.** Report P50, P90 and P99 frame duration together with the
percentage of frames over budget. A scroll in which 970 frames take 6ms and 30 take 90ms averages
8.5ms, comfortably inside a 16.7ms budget, while the user has watched three visible stutters — the
tail of the distribution is the experience. Two further thresholds belong to the platform, not to
you: a **frozen frame** is one over **700ms**, long enough that the app appears hung, and
an **ANR** fires when the main thread fails to service input for **5 seconds**.

## 4. Field gates

Play publishes bad-behaviour thresholds on the Android vitals dashboard: a user-perceived crash
rate above roughly **1.09%**, or a user-perceived ANR rate above roughly **0.47%**, measured per
device model over 28 days. Exceeding either can reduce store visibility and put a warning on the
listing.

That makes both numbers **product constraints rather than engineering preferences**. A stability
regression does not merely annoy users; it reduces the distribution of every future release,
including the one that fixes the regression, so stability work outranks feature work whenever a
model-specific rate approaches the threshold. Set the alert well below the threshold, not at it: by the time the dashboard flags you, the 28-day window already contains the damage.

## 5. Web parity

The web runtime has different mechanics and the same discipline. Core Web Vitals, each assessed at
the **75th percentile** of real users: **LCP ≤ 2.5s**, **INP ≤ 200ms**, **CLS ≤ 0.1**. Read the
correspondences rather than the numbers. LCP is TTFD's sibling — both ask when the user can start,
not when something was painted. INP is the frame budget expressed as input latency: an interaction
misses 200ms for the same reason a frame misses 8.3ms, a main thread occupied by work that should
have been chunked, deferred or moved off it. CLS lacks a direct native analogue only because
native layout is less prone to asynchronously-sized content, and it returns the moment a list item
resizes after its image resolves.

The shared principle is the one worth carrying between platforms: **budgets are percentiles from
the field, never medians from the lab**. A lab trace explains *why* something is slow and can never
tell you *whether* it is slow for your users, because your device and network are not theirs. Lab
traces diagnose; field percentiles decide.

## 6. Where the rest of the budget goes

Heap and bytes take the same treatment; mechanisms are in **resources-and-gating**. Give every
asynchronous image load an explicit decode target size: a loader with no dimensions decodes at the
source's intrinsic resolution, so a 4000×3000 photo costs 48MB of heap whatever slot it lands
in. Bound caches in bytes against \`ActivityManager.getMemoryClass()\` and drop them on
\`onTrimMemory\`: Android does not swap, so unbounded growth ends in the process being killed rather
than slowed. Ship an App Bundle with R8 and resource shrinking, and archive \`mapping.txt\` for
every build that reaches a user. Then gate all of it in CI against a stored baseline, comparing
P90 within a noise band derived from observed variance — a budget no build ever fails on is a
preference, and preferences lose to deadlines.`,

    references: [
      {
        id: 'budgets-and-evidence',
        title: 'The evidence rule, startup budgets, frame budgets, and field gates',
        answers:
          'What counts as admissible evidence that something is slow, which tool answers which question, what are the cold, warm, hot, TTID and TTFD budgets, how much of a frame do I actually own, and which crash and ANR rates put store distribution at risk?',
        content: `# The evidence rule, startup budgets, frame budgets, and field gates

This is the tooling layer under the budgets in the body: which instrument answers which question,
how to capture a number that transfers to production, and where the platform's own thresholds sit.

---

## 1. What counts as admissible evidence

**No architectural change without a trace.** The claim you need before restructuring anything is
not "this is slow" but "this slice took this long on this thread", because only the second form
can be checked again afterwards and can be defended when the change makes something else worse.

Logcat and console timings do not meet that bar. A \`System.currentTimeMillis()\` pair on a
debuggable build runs with R8 disabled, ART interpreting or JIT-compiling with no profile-guided
AOT, and the debugger's instrumentation hooks live. The result is commonly two to five times
slower than release, and the slowdown is not uniform, so the *ranking* of costs changes and the
conclusion can be exactly backwards.

The tools that produce admissible evidence on Android:

| Tool | Answers |
| --- | --- |
| Macrobenchmark with \`StartupTimingMetric()\` | Cold, warm and hot startup on a real device, release build, repeated |
| Macrobenchmark with \`FrameTimingMetric()\` | Frame duration distribution for a scripted scroll or interaction |
| Baseline Profiles | Which classes and methods to AOT-compile at install time |
| Perfetto / \`systrace\` | Every thread's slices, binder calls, lock contention, CPU frequency |
| Android Studio Profiler | Allocation sites, heap dumps, method traces during an interactive session |

Macrobenchmark drives a **release-like build in a separate process**, which is why its numbers
transfer. Run it under both \`CompilationMode.None()\` and \`CompilationMode.Partial()\` to see what a
Baseline Profile actually buys, and with \`iterations\` high enough that the variance band is
narrower than the effect you intend to claim. A regression comparison is only valid against the
same device model, the same compilation mode, and the same iteration count.

Perfetto is the instrument that ends arguments, because a trace opened in the Perfetto UI is
queryable with SQL over its slice table:

\`\`\`sql
SELECT name, dur / 1e6 AS ms FROM slice WHERE dur > 16e6 ORDER BY dur DESC LIMIT 40;
\`\`\`

That is every slice longer than one 60Hz frame, ranked. If your suspected culprit is not in the
result, it is not the problem, whatever shape the flame graph suggested.

Custom instrumentation belongs in the trace rather than in a log:
\`androidx.tracing.trace("loadFeed") { }\` puts your slice on the same timeline as the platform's,
so your work appears next to the binder call or lock wait it was blocked on. A log line cannot do
this, because it has no duration and no thread association.

On Apple platforms the equivalents are **Instruments**: the **Time Profiler** for CPU attribution
by stack, **Animation Hitches** for the hitch-time ratio in milliseconds of hitch per second of
scrolling, and the Core Animation and Allocations instruments for compositing and memory. On the
web it is the Chrome DevTools performance panel plus field data from the Chrome UX Report — the
same split between a lab trace that explains and field data that decides.

## 2. Startup budgets

| Shape | What it does | Target | Investigate above |
| --- | --- | --- | --- |
| Cold | Creates the process, the Application object and the first Activity | under 1s | 2s |
| Warm | Reuses a live process, recreates the Activity | under 500ms | 1s |
| Hot | Returns an existing Activity to the foreground | under 100ms | 500ms |

All three are measured on the target mid-range device. A budget met on the newest flagship tells
you nothing about the device distribution that generates your complaints.

**TTID versus TTFD.** Time to initial display is when the first frame is drawn, reported by the
platform as \`Displayed\` in logcat and by Macrobenchmark as \`timeToInitialDisplayMs\`. Time to full
display is when the screen shows real content, and it exists only if you signal it by calling
\`Activity.reportFullyDrawn()\` or \`ReportDrawn\` in Compose. TTFD is the honest number, because TTID
can be driven arbitrarily low by drawing a skeleton immediately — the metric improves and the user
is still looking at grey rectangles. Track both, gate on TTFD.

**The ContentProvider auto-initialisation tax.** A \`ContentProvider\` declared in a merged manifest
is created by the system before \`Application.onCreate()\` returns: synchronously, on the main
thread, in manifest order. Each costs process-level class loading plus whatever the library does
in its \`onCreate\`, and a handful of analytics, crash-reporting and image libraries routinely add
200–400ms before any of your code runs — none of it visible in your source, which is why it is
usually found late and by accident. Remove them with a \`tools:node="remove"\` merge rule and
initialise through **\`androidx.startup\`**, which gives a single provider with a declared dependency
graph, or better still lazily at the first point of use.

The rest of the cold-start checklist follows the same mechanism, main-thread work before the first
frame:

- Ship a **Baseline Profile**. Without one, ART interprets and JIT-compiles the startup path on
  every one of the first runs; with one, the listed methods are AOT-compiled at install time.
  Typical gains are **15–30%** on startup, plus a visible reduction in first-scroll jank.
- Do no disk or network I/O in \`Application.onCreate()\`. A \`SharedPreferences\` read is a
  synchronous file parse, and a first-time Room open runs schema validation.
- Do not inflate a hierarchy or compose a tree you are about to replace. A splash Activity costs a
  full extra Activity launch; use the \`SplashScreen\` API instead.
- Defer dependency-injection graph construction for feature-scoped components until the feature is
  entered.

## 3. Frame budgets

The budget is the refresh interval — **16.7ms at 60Hz**, **11.1ms at 90Hz**, **8.3ms at 120Hz** —
and it covers the whole frame rather than your draw call. Within the window the system delivers
input, runs your composition or layout and draw, hands buffers to SurfaceFlinger, and lets the
compositor assemble and queue the frame before the display's next scanout, so your application
thread realistically owns around **half**. Measuring your own render at 9ms on a 120Hz panel and
declaring the frame safe is how a fast screen still drops every third frame.

A missed deadline is not a slightly late frame. The previous frame is re-scanned, so content is
stationary for two intervals, and that doubling is why jank is perceptible at drop rates far below
what a throughput average suggests.

**Jank is a percentile, never a mean.** Report P50, P90 and P99 frame duration and the percentage
of frames over budget. A scroll in which 970 frames take 6ms and 30 take 90ms averages 8.5ms,
comfortably "within budget", while the user has watched three visible stutters. The tail of the
distribution *is* the experience, which is why \`FrameTimingMetric()\` reports \`frameDurationCpuMs\`
at P50/P90/P95/P99.

Two thresholds are set by the platform and the store rather than by you. A **frozen frame** takes
over **700ms**, long enough that the app appears hung. An **ANR** fires when the main thread fails
to service input for **5 seconds**, or a broadcast for 10, or a foreground service start for 20.

Common causes, ranked by how often they turn out to be the real answer: main-thread I/O inside a
scroll such as a preference or file read per item; image decode on the main thread; synchronous
\`measure\`/\`layout\` triggered by a subcomposition inside a list; allocation churn provoking garbage
collection mid-scroll; and lock contention against a background writer, visible in Perfetto as a
blocked slice.

## 4. Field gates

Google Play publishes **bad-behaviour thresholds** on the Android vitals dashboard. A
**user-perceived crash rate above roughly 1.09%**, or a **user-perceived ANR rate above roughly
0.47%**, measured per device model over 28 days, marks the app as exceeding the threshold. Apps
that exceed it can have store visibility reduced, and Play may show a warning on the listing.

That makes these **product constraints rather than engineering preferences**. A stability
regression does not merely annoy users; it reduces the distribution of every future release,
including the one that fixes it. "User-perceived" is narrower than "all": it counts crashes and
ANRs that occurred while the user was actively engaged, so a background crash is not a free pass,
it is simply counted elsewhere.

The planning corollary is that stability work outranks feature work whenever a model-specific rate
approaches the threshold, because the cost of crossing it is measured in install volume rather
than in review sentiment. Alert at a warning level well below the threshold rather than at it —
by the time the dashboard flags you, the 28-day window already contains the damage.`,
      },
      {
        id: 'resources-and-gating',
        title: 'Images, lists, memory, download size, web parity, and CI gating',
        answers:
          'How do I size an image decode, what makes a list item expensive, how do I find and bound a memory leak, what removes bytes from the download, how do the Core Web Vitals correspond to the native budgets, and which gates belong in CI?',
        content: `# Images, lists, memory, download size, web parity, and CI gating

Startup and frame time are deadlines. Heap and bytes are budgets of a different kind: exceeded
gradually, invisible in a lab run, and enforced by the operating system killing your process or by
a user abandoning an install. This is where those budgets are set and how the build holds them.

---

## 1. Image decode arithmetic

**Explicit sizing is mandatory on every asynchronous image load.** A loader given no target
dimensions decodes at the source's intrinsic resolution. A 4000×3000 JPEG decoded to \`ARGB_8888\`
occupies 4000 × 3000 × 4 bytes = **48MB** of heap, regardless of the 64dp avatar slot it is being
drawn into. Fifty such rows request 2.4GB against a per-app limit in the low hundreds of
megabytes, so the outcome is an \`OutOfMemoryError\` — and the outcome *before* that is seconds of
garbage-collection pauses on the main thread while the allocator tries.

\`\`\`kotlin
AsyncImage(
    model = ImageRequest.Builder(context)
        .data(url)
        .size(64.dp.roundToPx())   // decode target, not display scaling
        .crossfade(true)
        .build(),
    contentDescription = null,
    modifier = Modifier.size(64.dp),
)
\`\`\`

\`Modifier.size(64.dp)\` alone scales at draw time, after the full-resolution bitmap already exists,
which is why it does not solve this. The equivalents elsewhere are Glide's
\`override(width, height)\`, \`BitmapFactory.Options.inSampleSize\` for a manual decode, and a
server-side resize or CDN transform wherever you control the endpoint — the cheapest decode is the
one whose extra pixels never crossed the network. \`RGB_565\` halves bytes per pixel and is a
legitimate choice for opaque thumbnails where banding is acceptable.

## 2. Lists

A list compounds every per-item cost by the number of visible items and again by scroll velocity,
so a cost that is invisible on a detail screen becomes the whole frame budget in a feed.

- Every item needs a **stable key** and a **content type**, so recycling reuses a compatible slot
  rather than rebuilding a subtree.
- **No per-item subcomposition.** \`BoxWithConstraints\`, \`SubcomposeLayout\`, and anything built on
  them defer measurement into the layout pass, which defeats the list's ability to pre-measure and
  prefetch upcoming items. The list stops preparing items ahead of the scroll and starts producing
  them during it, which is precisely when there is no budget spare.
- No per-item allocation of formatters, comparators, or lambdas capturing unstable objects. A
  \`SimpleDateFormat\` constructed per row allocates and parses a pattern sixty times a second.
- No main-thread I/O in an item binder, including preference reads and \`Resources\` lookups by
  string name.
- Paginate rather than loading unbounded pages. A list holding 5,000 model objects is a memory
  problem even when only eight are visible.

## 3. Memory and leak shapes

Android does not swap. When the system needs memory it kills processes by \`oom_adj\` score, so a
leak manifests not as slowness but as the app disappearing from the recents list mid-task — which
the user attributes to your app being broken, correctly.

Measure with a **heap dump**, not with the memory graph. The graph shows total allocation, which
sawtooths normally; the dump shows the **dominator tree**, which names the object retaining the
40MB. Take a dump, force garbage collection, take a second, and compare retained sizes across a
navigate-in-and-out cycle: any Activity, Fragment, or ViewModel instance count above zero after
returning is a leak. **LeakCanary** automates that watch-and-dump loop in debug builds and reports
the retaining reference chain.

Three shapes account for most of what you will find:

- **Closure capture.** A callback, listener, or coroutine registered with an object that outlives
  the screen captures \`this\` and therefore the whole view tree. A \`LocationManager\` listener
  registered in \`onCreate\` and never removed retains the Activity for the process lifetime.
- **A ViewModel holding a View or Context.** A ViewModel survives configuration change by design,
  so a reference to the destroyed Activity's context leaks the entire old hierarchy on every
  rotation. Inject the application context where a context is genuinely needed.
- **The unbounded cache.** A \`HashMap\` used as an image or model cache never evicts, so it grows
  for the process lifetime.

Bound caches in **bytes, not entries**, because entry size varies by orders of magnitude between a
thumbnail and a full-bleed hero — an entry count bounds nothing. Size an \`LruCache\` as a fraction
of the heap the device grants you; \`ActivityManager.getMemoryClass()\` returns that in megabytes
and one eighth is a common starting allocation. Respond to
\`onTrimMemory(TRIM_MEMORY_UI_HIDDEN)\` and above by dropping caches, since that callback is the
system telling you that you are next in the kill order.

\`\`\`kotlin
val cache = object : LruCache<String, Bitmap>(am.memoryClass * 1024 * 1024 / 8) {
    override fun sizeOf(key: String, value: Bitmap) = value.byteCount
}
\`\`\`

## 4. Download and install size

Size is a conversion metric before it is a performance metric: install completion rate falls
measurably as app size rises, and the effect is largest exactly where the growth hurts most, on
cheaper devices and metered connections.

Ship an **Android App Bundle** rather than a universal APK. Play generates splits per density, per
ABI and per language, so a device downloads one of each instead of all of them; on a multi-ABI,
multi-density, multi-locale app this alone typically removes **35–50%** of the transfer. Reinforce
it in the build with \`resConfigs\` limited to the locales you actually translate, \`abiFilters\`
narrowed to the ABIs you support, and every opaque PNG converted to **WebP** (typically 25–35%
smaller at equivalent quality) or to a vector drawable where the artwork is geometric.

Enable **R8** in release with code and resource shrinking. R8 removes unreachable code and rewrites
what remains, which is also why it obfuscates stack traces — and why **archiving \`mapping.txt\` for
every shipped build is mandatory**. Without the mapping file for that exact build a production
crash arrives as \`a.b.c.d(Unknown Source)\` and is undiagnosable, and the file is build-specific, so
a rebuild from the same commit does not necessarily reproduce it. There is no recovery path once
the artefact is gone, which is why the upload to Play and to your crash reporter belongs in the
release job rather than in a runbook step someone performs by hand.

On Apple platforms the same job is done by **App Thinning**: app slicing per device variant, and
**on-demand resources** for assets fetched after install such as tutorials, level packs and
high-resolution variants. The principle is identical — ship the bytes this device will use, and
defer the rest until the user reaches the feature that needs them.

## 5. Web parity

Core Web Vitals, each assessed at the **75th percentile of real users** segmented by device class:

| Metric | Good | Needs work | Poor |
| --- | --- | --- | --- |
| LCP — largest contentful paint | ≤ 2.5s | 2.5–4.0s | > 4.0s |
| INP — interaction to next paint | ≤ 200ms | 200–500ms | > 500ms |
| CLS — cumulative layout shift | ≤ 0.1 | 0.1–0.25 | > 0.25 |

Read the correspondences rather than the numbers. LCP is TTFD's sibling: both ask when the user
can actually use the screen, not when something was painted. INP is the frame budget expressed as
input latency — an interaction misses 200ms for the same reasons a frame misses 8.3ms, namely a
main thread occupied by work that should have been chunked, deferred, or moved off-thread. CLS has
no direct native analogue only because native layout systems are less prone to asynchronously
sized content, and it reappears the moment a list item resizes after an image resolves.

The shared principle carries between platforms: **budgets are percentiles from the field, not
medians from the lab**. A lab trace explains *why* something is slow and can never tell you
*whether* it is slow for your users, because your device is not their device and your network is
not their network. Lab traces diagnose; field percentiles decide.

## 6. CI gating

A budget that is not enforced by a build failure is a preference, and preferences lose to
deadlines. Gate these automatically.

**Stability and skippability.** Enable the Compose compiler metrics
(\`-P plugin:androidx.compose.compiler.plugins.kotlin:reportsDestination=…\`) and diff the generated
\`*-composables.txt\` reports against the previous build. A composable that changes from skippable to
non-skippable, or a parameter that changes from stable to unstable, is a rendering regression that
costs nothing to detect now and hours to find later inside a jank report.

**Benchmark thresholds.** Run Macrobenchmark startup and scroll benchmarks on a fixed device model
in CI and fail on regression against a stored baseline. Compare **P90**, not the mean, and set the
band from the observed run-to-run variance rather than from a guess: a gate that produces false
failures is disabled within a fortnight, which leaves you worse off than having no gate.

**Size budgets.** Assert on the AAB's estimated download size per configuration and fail above the
budget. This is the only mechanism that catches a dependency whose transitive graph adds 2MB,
because no reviewer reads a lockfile diff closely enough.

**Baseline Profile freshness.** A profile generated against an old startup path silently stops
covering the hot methods after a refactor. Regenerate it in CI on a schedule and fail if the
generated profile diverges from the committed one beyond a threshold.

**Field monitoring as the outer loop.** CI gates the lab; Play Vitals and the Chrome UX Report gate
reality. Alert on the crash and ANR rates at a warning level well below the bad-behaviour
threshold, because by the time the dashboard flags you the 28-day window already contains the
damage.`,
      },
    ],
  },

  rules: [
    {
      id: 'mobile-performance/no-architectural-change-without-a-trace',
      strength: 'must',
      statement:
        'Capture a trace or benchmark on a release build on a physical device before making any architectural change in the name of performance.',
      evidence: {
        rationale:
          'A rewrite justified by "this felt slow" cannot be falsified, cannot be measured after the fact, and cannot be defended when it makes something else worse. What makes the claim checkable in both directions is a capture that names the slice, its duration, and the thread it ran on — which is also the only thing that tells you whether your suspected culprit is even in the top forty slices over one frame.',
        source: 'Perfetto trace processor, slice table',
        url: 'https://perfetto.dev/docs/analysis/trace-processor',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: '// "the feed feels janky" → rewrite the adapter and the repository',
        good: 'androidx.tracing.trace("loadFeed") { repository.load() }\n// SELECT name, dur / 1e6 AS ms FROM slice WHERE dur > 16e6 ORDER BY dur DESC LIMIT 40;',
      },
      verifiedBy: 'evidence-review',
    },
    {
      id: 'mobile-performance/no-debug-build-timings',
      strength: 'must-not',
      statement:
        'Do not draw a performance conclusion from a logcat timing or a System.currentTimeMillis() measurement taken on a debuggable build.',
      evidence: {
        rationale:
          'On a debuggable build R8 is disabled, ART runs interpreted or JIT-compiled code with no profile-guided AOT, and the debugger’s instrumentation hooks are live. That is commonly two to five times slower than release, and slower in a distribution that does not match release at all, so the ranking of costs changes rather than merely scaling. A conclusion drawn from that measurement can be exactly backwards. Macrobenchmark exists because it drives a release-like build in a separate process, which is why its numbers transfer.',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: 'val t = System.currentTimeMillis()\nloadFeed()\nLog.d("perf", "feed ${System.currentTimeMillis() - t}ms")',
        good: '@Test fun scroll() = benchmarkRule.measureRepeated(\n    packageName = PKG,\n    metrics = listOf(FrameTimingMetric()),\n    compilationMode = CompilationMode.Partial(),\n    iterations = 20,\n) { … }',
      },
      verifiedBy: 'evidence-review',
    },
    {
      id: 'mobile-performance/percentiles-not-means',
      strength: 'must',
      statement:
        'Report frame duration and interaction latency as P50, P90, and P99 plus the percentage of frames over budget, never as a mean.',
      evidence: {
        rationale:
          'A mean is structurally blind to the thing users complain about. A scroll where 970 frames take 6ms and 30 take 90ms averages 8.5ms — comfortably inside a 16.7ms budget — while the user has watched three visible stutters, because the distribution’s tail is the experience. This is the same reason Core Web Vitals are assessed at the 75th percentile of real users rather than at a lab median.',
        source: 'Macrobenchmark FrameTimingMetric; web.dev Core Web Vitals',
        url: 'https://web.dev/articles/vitals',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: 'println("avg frame ${durations.average()}ms")',
        good: 'println("P50 ${p(durations, 50)} P90 ${p(durations, 90)} P99 ${p(durations, 99)} over16.7 ${pctOver(durations, 16.7)}%")',
      },
      verifiedBy: 'percentile-and-field-review',
    },
    {
      id: 'mobile-performance/gate-startup-on-ttfd',
      strength: 'must',
      statement:
        'Instrument time to full display through reportFullyDrawn() or ReportDrawn and gate startup on it, tracking TTID alongside rather than instead.',
      evidence: {
        rationale:
          'TTID is the moment the first frame is drawn, and it can be driven arbitrarily low by painting a skeleton immediately — which improves the metric and changes nothing for a user still looking at grey rectangles. A team that optimises TTID alone eventually ships a launch that reaches first frame in 380ms and usable content in 3.4 seconds, and reports it as a win. TTFD is the number that corresponds to the user being able to start.',
        source: 'Android app startup metrics',
        url: 'https://developer.android.com/topic/performance/vitals/launch-time',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: '// logcat "Displayed …: +380ms" recorded as the startup number',
        good: 'LaunchedEffect(feed) { if (feed.isNotEmpty()) ReportDrawn() }',
      },
      verifiedBy: 'startup-and-frame-review',
    },
    {
      id: 'mobile-performance/startup-budgets',
      strength: 'must',
      statement:
        'Hold cold start under 1s, warm under 500ms, and hot under 100ms on the target mid-range device, treating 2s, 1s, and 500ms as defects to investigate.',
      evidence: {
        rationale:
          'The dominant cold-start tax is main-thread work before the first frame, and most of it is not visible in your source: a library’s initialisation ContentProvider declared in a merged manifest is created by the system before Application.onCreate() returns, synchronously, in manifest order, so a handful of analytics and crash-reporting libraries routinely add 200–400ms before your code runs at all. A Baseline Profile is the other lever, typically 15–30% of startup, because without one ART interprets and JIT-compiles the startup path on the first runs.',
        source: 'Android app startup time guidance',
        url: 'https://developer.android.com/topic/performance/vitals/launch-time',
        confidence: 'established',
      },
      examples: {
        language: 'xml',
        bad: '<!-- merged in from a dependency, runs before Application.onCreate() -->\n<provider android:name="com.vendor.SdkInitProvider" />',
        good: '<provider android:name="com.vendor.SdkInitProvider" tools:node="remove" />\n<!-- initialise through androidx.startup, or lazily at first use -->',
      },
      verifiedBy: 'startup-and-frame-review',
    },
    {
      id: 'mobile-performance/whole-frame-budget',
      strength: 'must',
      statement:
        'Budget against the whole frame — 16.7ms at 60Hz, 11.1ms at 90Hz, 8.3ms at 120Hz — and leave roughly half of it for input delivery and compositing.',
      evidence: {
        rationale:
          'Within one refresh interval the system must deliver input, run your composition or layout and draw, hand buffers to SurfaceFlinger, and let the compositor assemble and queue the frame before the display’s next scanout, so your application thread realistically owns about half the window. Measuring your own render at 9ms on a 120Hz panel and declaring the frame safe is how a "fast" screen still drops every third frame. A missed deadline is also not a slightly late frame: the previous frame is re-scanned and content is stationary for two intervals, which is why jank is perceptible at drop rates a throughput average calls negligible.',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: '// render measured at 9.0ms on a 120Hz device → "within the 8.3ms budget after rounding"',
        good: '// 120Hz: 8.3ms total, ~4ms for application work; measure frameDurationCpuMs P90/P99',
      },
      verifiedBy: 'startup-and-frame-review',
    },
    {
      id: 'mobile-performance/explicit-image-decode-size',
      strength: 'must',
      statement:
        'Give every asynchronous image load an explicit decode target size rather than letting the loader decode at the source’s intrinsic resolution.',
      evidence: {
        rationale:
          'An image loader with no target dimensions decodes at full source resolution, so a 4000×3000 JPEG at ARGB_8888 occupies 4000 × 3000 × 4 = 48MB of heap regardless of the 64dp avatar slot it is being drawn into. Fifty such rows request 2.4GB against a per-app limit in the low hundreds of megabytes, so the outcome is an OutOfMemoryError — and the outcome before that is seconds of garbage-collection pauses on the main thread while the allocator tries.',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: 'AsyncImage(model = url, contentDescription = null, modifier = Modifier.size(64.dp))',
        good: 'AsyncImage(\n    model = ImageRequest.Builder(context).data(url).size(64.dp.roundToPx()).build(),\n    contentDescription = null,\n    modifier = Modifier.size(64.dp),\n)',
      },
      verifiedBy: 'resource-and-gating-review',
    },
    {
      id: 'mobile-performance/caches-bounded-in-bytes',
      strength: 'must',
      statement:
        'Bound every in-memory cache in bytes against ActivityManager.getMemoryClass(), and release caches on onTrimMemory(TRIM_MEMORY_UI_HIDDEN) and above.',
      evidence: {
        rationale:
          'Android does not swap: when the system needs memory it kills processes by oom_adj score, so unbounded growth manifests not as slowness but as the app disappearing from the recents list mid-task, which the user correctly attributes to your app being broken. Bounding by entry count bounds nothing, because bitmap sizes vary by orders of magnitude between a thumbnail and a full-bleed hero. The trim callback is the system’s explicit warning that you are next in the kill order.',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: 'val cache = HashMap<String, Bitmap>()',
        good: 'val cache = object : LruCache<String, Bitmap>(am.memoryClass * 1024 * 1024 / 8) {\n    override fun sizeOf(key: String, value: Bitmap) = value.byteCount\n}',
      },
      verifiedBy: 'resource-and-gating-review',
    },
    {
      id: 'mobile-performance/archive-the-mapping-file',
      strength: 'must',
      statement:
        'Ship an App Bundle with R8 and resource shrinking enabled, and archive and upload mapping.txt automatically for every build that reaches a user.',
      evidence: {
        rationale:
          'R8 removes unreachable code and rewrites what remains, so without the mapping file for that exact build a production crash arrives as a.b.c.d(Unknown Source) and is undiagnosable. The file is build-specific — a rebuild from the same commit does not necessarily reproduce it — so there is no recovery path once the artefact is gone, which is why it must be part of the release job rather than a manual step. The bundle itself is the other half: splits per density, ABI, and language typically remove 35–50% of the transfer.',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: 'buildTypes { release { isMinifyEnabled = true } }  // mapping.txt left in build/outputs',
        good: 'buildTypes { release { isMinifyEnabled = true; isShrinkResources = true } }\n// CI: upload build/outputs/mapping/release/mapping.txt to Play and the crash reporter',
      },
      verifiedBy: 'resource-and-gating-review',
    },
    {
      id: 'mobile-performance/gates-fail-the-build',
      strength: 'should',
      statement:
        'Fail the build on startup, frame, and download-size regressions against a stored baseline, comparing P90 within a noise band derived from observed run-to-run variance.',
      evidence: {
        rationale:
          'A budget that is not enforced by a build failure is a preference, and preferences lose to deadlines. Size regressions in particular arrive one dependency at a time and nobody reads a lockfile diff closely enough to notice a transitive 2MB. The noise band is what keeps the gate alive: a gate that produces false failures is disabled within a fortnight, which leaves you worse off than having no gate, so the band must come from the measured variance of the fixed CI device rather than from a guess.',
        confidence: 'strong',
      },
      examples: {
        language: 'yaml',
        bad: '- run: ./gradlew :benchmark:connectedCheck   # results printed, never asserted',
        good: '- run: ./gradlew :benchmark:connectedCheck\n- run: python3 ci/compare.py --metric startupMs --percentile 90 --baseline baseline.json --band 2sd',
      },
      verifiedBy: 'resource-and-gating-review',
    },
  ],

  verification: [
    {
      id: 'evidence-review',
      kind: 'self-review',
      description: 'Confirm every performance claim rests on admissible evidence.',
      blocking: true,
      questions: [
        'For each claimed improvement or regression, which trace or benchmark supports it, and was it captured on a release build on a physical device rather than from logcat on a debuggable one?',
        'Does the repository contain Macrobenchmark tests using StartupTimingMetric() and FrameTimingMetric() that actually run in CI?',
        'Are custom timing regions emitted as trace slices via androidx.tracing.trace, so they sit on the same timeline as the binder calls and lock waits they were blocked on?',
        'For any comparison, are the device model, compilation mode, and iteration count identical to the baseline, and is the variance band narrower than the effect being claimed?',
      ],
    },
    {
      id: 'startup-and-frame-review',
      kind: 'self-review',
      description: 'Confirm the startup and frame budgets are stated, instrumented, and met.',
      blocking: true,
      questions: [
        'Is cold start under 1s, warm under 500ms, and hot under 100ms on the target mid-range device, and is the gate set on TTFD via reportFullyDrawn()/ReportDrawn rather than on TTID alone?',
        'Does the merged manifest still contain any third-party initialisation ContentProvider, and does Application.onCreate() perform any disk read, network call, or database open?',
        'Is a Baseline Profile generated, committed, and regenerated when the startup path changes?',
        'Is the frame budget stated for the target refresh rate, with headroom left for system compositing, and are there any frames over 700ms in the scroll benchmark?',
        'Does any list item binder perform I/O, decode an image, or construct a formatter per bind?',
      ],
    },
    {
      id: 'percentile-and-field-review',
      kind: 'self-review',
      description: 'Confirm the numbers being reported are field percentiles rather than lab means.',
      questions: [
        'Are jank figures reported as P50/P90/P99 and percentage of frames over budget, with no mean presented as a verdict?',
        'Is the user-perceived crash rate below 1.09% and the ANR rate below 0.47% on every significant device model, with alerts set at a warning level below those thresholds rather than at them?',
        'Are LCP, INP, and CLS taken at the 75th percentile of field data, and do they meet 2.5s, 200ms, and 0.1 for the routes under review?',
        'Where a lab trace and field data disagree, which one is being used to decide, and which is only being used to explain?',
      ],
    },
    {
      id: 'resource-and-gating-review',
      kind: 'self-review',
      description: 'Confirm images, lists, memory, size, and the CI gates are all bounded.',
      blocking: true,
      questions: [
        'Does every async image request specify an explicit decode target size, and does any lazy list item contain a SubcomposeLayout or BoxWithConstraints, or lack a stable key and content type?',
        'Is every cache bounded in bytes against ActivityManager.getMemoryClass(), and does onTrimMemory release caches at TRIM_MEMORY_UI_HIDDEN and above?',
        'After navigating into and out of each major screen, is the retained instance count for its Activity, Fragment, and ViewModel exactly zero in a post-GC heap dump, and does any ViewModel or singleton hold a View, Activity, or non-application Context?',
        'Does release output an App Bundle with resConfigs, abiFilters, and WebP or vector assets, with R8 and resource shrinking on and mapping.txt uploaded automatically?',
        'Does a size-budget or benchmark-threshold breach fail the build rather than emit a warning, and is the noise band derived from observed variance rather than guessed?',
      ],
    },
  ],

  relatedSkills: ['rendering-performance', 'platform-android', 'code-quality', 'engineering-discipline'],
}
