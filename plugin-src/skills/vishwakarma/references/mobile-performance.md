# Mobile Performance

Performance on a phone is a budget problem with a hard deadline and a hostile measurement
environment: the deadline is the display's refresh interval, and the environment is a thermally
throttled mid-range device on a congested network, not the workstation you built on. Every number
below is a budget, and every budget is enforced at a percentile of real sessions rather than at
the median of a lab run. The single discipline that makes the rest work is refusing to change
architecture without a trace that names the cost.

---

## 1. The evidence rule

**No architectural change without a trace.** A rewrite justified by "this felt slow" cannot be
falsified, cannot be measured after the fact, and cannot be defended when it makes something else
worse. Before touching structure you need a capture that names the slice, its duration, and the
thread it ran on.

Logcat and console timings are not proof. `System.currentTimeMillis()` around a block measures
wall time on a debuggable build, where R8 is disabled, ART runs interpreted or JIT-compiled code
with no profile-guided AOT, and the debugger's instrumentation hooks are live — commonly **two to
five times** slower than a release build and slower in a distribution that does not match release
at all. A conclusion drawn from a debug measurement can be exactly backwards.

The tools that produce admissible evidence on Android:

| Tool | Answers |
| --- | --- |
| Macrobenchmark with `StartupTimingMetric()` | Cold, warm, hot startup on a real device, release build, repeated |
| Macrobenchmark with `FrameTimingMetric()` | Frame duration distribution for a scripted scroll or interaction |
| Baseline Profiles | Which classes and methods to AOT-compile at install time |
| Perfetto / `systrace` | Every thread's slices, binder calls, lock contention, CPU frequency |
| Android Studio Profiler | Allocation sites, heap dumps, method traces during an interactive session |

Macrobenchmark drives a **release-like build in a separate process**, which is why its numbers
transfer to production. Run it with `CompilationMode.None()` and `CompilationMode.Partial()` to
see what a Baseline Profile actually buys, and with `iterations` high enough that the variance
band is narrower than the effect you claim.

Perfetto is the instrument that ends arguments, because it is queryable. A trace opened in the
Perfetto UI supports SQL over its slice table:

```sql
SELECT name, dur / 1e6 AS ms FROM slice WHERE dur > 16e6 ORDER BY dur DESC LIMIT 40;
```

That is every slice longer than one 60Hz frame, ranked. If your suspected culprit is not in the
result, it is not the problem, whatever the profiler's flame graph shape suggested.

On Apple platforms the equivalents are **Instruments**: the Time Profiler for CPU attribution by
stack, **Animation Hitches** for the hitch-time ratio (milliseconds of hitch per second of
scrolling), and the Core Animation and Allocations instruments for compositing and memory. On the
web it is the Chrome DevTools performance panel plus field data from the Chrome UX Report — the
same split between a lab trace that explains and field data that decides.

Custom instrumentation belongs in the trace, not in a log. `androidx.tracing.trace("loadFeed") { }`
puts your own slice on the same timeline as the platform's, so your work is visible next to the
binder call it was actually waiting on.

## 2. Startup budgets

Startup has three shapes and three budgets. **Cold** start creates the process, the Application
object, and the first Activity: target **under 1 second**, and treat anything over **2 seconds**
as a defect to investigate. **Warm** start reuses a live process but recreates the Activity:
target **under 500ms**, investigate over **1 second**. **Hot** start brings an existing Activity
back to the foreground: target **under 100ms**, investigate over **500ms**.

Two different moments get called "startup". **TTID** (time to initial display) is when the first
frame is drawn — reported by the platform as `Displayed` in logcat and by Macrobenchmark as
`timeToInitialDisplayMs`. **TTFD** (time to full display) is when the screen shows real content,
signalled by calling `Activity.reportFullyDrawn()` (or `ReportDrawn` in Compose).

**TTFD is the honest number.** TTID can be driven arbitrarily low by drawing a skeleton
immediately, which improves the metric and changes nothing for the user, who is still looking at
grey rectangles. A team that optimises TTID alone eventually ships a launch that reaches first
frame in 380ms and usable content in 3.4 seconds, and reports success. Track both; gate on TTFD.

The classic cold-start tax is **library auto-initialisation through `ContentProvider`**. A
`ContentProvider` declared in a merged manifest is created by the system before
`Application.onCreate()` returns, synchronously, on the main thread, in manifest order. Each one
costs process-level class loading and whatever the library does in `onCreate` — a handful of
analytics, crash-reporting, and image libraries routinely add 200–400ms before your code runs at
all, and none of it is visible in your source. Remove them from the manifest with a `tools:node="remove"`
merge rule and initialise through **`androidx.startup`** (a single provider with a declared
dependency graph) or, better, lazily at the first point of use.

The rest of the cold-start checklist follows the same mechanism — work on the main thread before
the first frame:

- Ship a **Baseline Profile**. Without one, ART interprets and JIT-compiles your startup path on
  every one of the first runs; with one, the listed methods are AOT-compiled at install time.
  Typical gains are **15–30%** on startup and a visible reduction in first-scroll jank.
- Do no disk or network I/O in `Application.onCreate()`. A `SharedPreferences` read is a
  synchronous file parse; a first-time Room database open runs schema validation.
- Do not inflate a view hierarchy or compose a tree you are about to replace. A splash Activity
  costs a full extra Activity launch — use the `SplashScreen` API.
- Defer dependency-injection graph construction for feature-scoped components until the feature
  is entered.

## 3. Frame budgets

The frame budget is the refresh interval: **16.7ms at 60Hz**, **11.1ms at 90Hz**, **8.3ms at
120Hz**. The mechanism people miss is that this is the budget for the *whole frame*, not for your
draw call. Within that window the system must deliver input, run your composition or layout and
draw, hand buffers to SurfaceFlinger, and let the compositor assemble and queue the frame before
the display's next scanout. Realistically your application thread owns somewhere around **half**
of it. Measuring your own render at 9ms on a 120Hz panel and declaring the frame safe is how a
"fast" screen still drops every third frame.

A missed deadline is not a slightly late frame — the previous frame is re-scanned and the content
is stationary for two intervals. That doubling is why jank is perceptible at frame-drop rates far
below what a throughput average suggests.

**Jank is a percentile, never a mean.** Report P50, P90 and P99 frame duration, and the
percentage of frames over budget. A mean is structurally blind to the thing users complain about:
a scroll where 970 frames take 6ms and 30 take 90ms averages 8.5ms — comfortably "within budget" —
while the user has watched three visible stutters. The distribution's tail *is* the experience.
Macrobenchmark's `FrameTimingMetric()` reports `frameDurationCpuMs` at P50/P90/P95/P99 for exactly
this reason.

Two further thresholds matter because the platform and the store use them: a **frozen frame** is
one taking over **700ms**, long enough that the app appears hung, and an **ANR** is fired when the
main thread fails to service input for **5 seconds** (or a broadcast for 10, or a foreground
service start for 20).

Common causes ranked by how often they turn out to be the real answer: main-thread I/O inside a
scroll (reading a preference or a file per item), image decode on the main thread, synchronous
`measure`/`layout` triggered by a subcomposition inside a list, allocation churn provoking
garbage collection mid-scroll, and lock contention against a background writer visible in
Perfetto as a blocked slice.

## 4. Field gates

Google Play publishes **bad-behaviour thresholds** on the Android vitals dashboard: a
**user-perceived crash rate above ~1.09%** or a **user-perceived ANR rate above ~0.47%**, measured
per device model over 28 days, marks the app as exceeding the bad-behaviour threshold. Apps that
exceed it can have their store visibility reduced, and Play may show a warning on the store
listing.

That makes these numbers **product constraints, not engineering preferences**. A stability
regression does not merely annoy users; it reduces the distribution of every future release,
including the one that fixes it. "User-perceived" is also narrower than "all": it counts crashes
and ANRs that occurred while the user was actively engaged, so a background crash is not a free
pass — it is simply counted elsewhere.

The corollary for planning is that stability work outranks feature work whenever a model-specific
rate approaches the threshold, because the cost of crossing it is measured in install volume
rather than in review sentiment.

## 5. Image and list performance

**Explicit sizing is mandatory for every async image load.** An image loader given no target
dimensions decodes at the source's intrinsic resolution. A 4000×3000 JPEG decoded to
`ARGB_8888` occupies 4000 × 3000 × 4 bytes = **48MB** of heap, regardless of the fact that it is
being drawn into a 64dp avatar slot. A 50-item list of such images is 2.4GB of requested heap
against a typical per-app limit in the low hundreds of megabytes, so the outcome is an
`OutOfMemoryError`, and the outcome *before* that is seconds of garbage collection pauses on the
main thread while the allocator tries.

```kotlin
AsyncImage(
    model = ImageRequest.Builder(context)
        .data(url)
        .size(64.dp.roundToPx())   // decode target, not display scaling
        .crossfade(true)
        .build(),
    contentDescription = null,
    modifier = Modifier.size(64.dp),
)
```

The equivalents elsewhere: Glide's `override(width, height)`, `BitmapFactory.Options.inSampleSize`
for manual decode, and a server-side resize or CDN transform where you control the endpoint — the
cheapest decode is the one that never transfers the extra pixels. Prefer `RGB_565` only for opaque
images where banding is acceptable; it halves bytes per pixel and is a legitimate tool for
thumbnails.

Lists compound every per-item cost by the number of visible items and again by scroll velocity. The
rules that follow from that:

- Every item needs a **stable key** and a **content type**, so recycling reuses a compatible slot
  rather than rebuilding a subtree.
- **No per-item subcomposition.** `BoxWithConstraints`, `SubcomposeLayout`, and anything built on
  them defer measurement into the layout pass, which defeats the list's ability to pre-measure and
  prefetch upcoming items. The list stops preparing items ahead of the scroll and starts producing
  them during it, which is exactly when there is no budget spare.
- No per-item allocation of formatters, comparators, or lambdas that capture unstable objects.
  A `SimpleDateFormat` constructed per row allocates and parses a pattern 60 times a second.
- No main-thread I/O in an item binder, including preference reads and `Resources` lookups by
  string name.
- Paginate rather than loading unbounded pages. A list holding 5,000 model objects is a memory
  problem even when only 8 are visible.

## 6. Memory

Android does not swap. When the system needs memory it kills processes by `oom_adj` score, so a
memory leak in a mobile app manifests not as slowness but as the app disappearing from the recents
list mid-task — and the user attributes that to your app being broken, correctly.

Measure with a **heap dump** rather than with the memory graph. The graph shows total allocation,
which sawtooths normally; the dump shows the *dominator tree*, which tells you which object is
retaining the 40MB. Take a dump, force garbage collection, take a second, and compare retained
sizes after a navigate-in-and-out cycle: any Activity, Fragment, or ViewModel instance count above
one after returning is a leak. **LeakCanary** automates precisely that watch-and-dump loop in
debug builds and reports the retaining reference chain.

Three leak shapes account for most of what you will find. The **closure capture**: a callback,
listener, or coroutine registered with an object that outlives the screen, capturing `this` and
therefore the whole view tree — a `LocationManager` listener registered in `onCreate` and never
removed retains the Activity for the process lifetime. The **ViewModel holding a View or Context**:
a ViewModel survives configuration change by design, so a reference to the destroyed Activity's
context inside it leaks the entire old hierarchy on every rotation; inject the application context
where a context is genuinely needed. The **unbounded cache**: a `HashMap` used as an image or
model cache never evicts, so it grows for the process lifetime.

Bitmap caches must be bounded in **bytes**, not entries, because entry size varies by orders of
magnitude. Size an `LruCache` as a fraction of the heap the device grants you —
`ActivityManager.getMemoryClass()` returns that in megabytes, and one eighth is a common starting
allocation. Respond to `onTrimMemory(TRIM_MEMORY_UI_HIDDEN)` and above by dropping caches, since
that callback is the system's warning that you are next in the kill order.

## 7. Download and install size

Size is a conversion metric before it is a performance metric: install completion rate falls
measurably as app size rises, and the effect is largest exactly where growth is — cheaper devices
on metered connections.

Ship an **Android App Bundle**, not a universal APK. Play generates splits per density, per ABI,
and per language, so a device downloads one of each rather than all of them; on a multi-ABI,
multi-density, multi-locale app this alone typically removes **35–50%** of the transfer. Reinforce
it in the build with `resConfigs` limited to the locales you actually translate, `abiFilters`
narrowed to the ABIs you support, and every opaque PNG converted to **WebP** (typically 25–35%
smaller at equivalent quality) or vector drawables where the artwork is geometric.

Enable **R8** in release with shrinking and resource shrinking on. R8 removes unreachable code and
rewrites what remains, which is also why it obfuscates stack traces — and why **archiving the
`mapping.txt` for every shipped build is mandatory**. Without the mapping file for that exact
build, a production crash arrives as `a.b.c.d(Unknown Source)` and is undiagnosable; the file is
build-specific, so a rebuild from the same commit does not necessarily reproduce it. Upload it to
Play and to your crash reporter as part of the release job, not by hand.

On Apple platforms the same job is done by **App Thinning** — app slicing per device variant,
bitcode-era rewrites, and **on-demand resources** for assets fetched after install (tutorials,
level packs, high-resolution variants). The principle is identical: ship the bytes this device
will use, and defer the rest until the user reaches the feature that needs them.

Track size in CI as a number with a budget. Size regressions arrive one dependency at a time, and
nobody notices a 400KB increase until the twelfth one.

## 8. Web parity

The web runtime has different mechanics and the same discipline. Core Web Vitals, each assessed at
the **75th percentile of real users** segmented by device class:

| Metric | Good | Needs work | Poor |
| --- | --- | --- | --- |
| LCP — largest contentful paint | ≤ 2.5s | 2.5–4.0s | > 4.0s |
| INP — interaction to next paint | ≤ 200ms | 200–500ms | > 500ms |
| CLS — cumulative layout shift | ≤ 0.1 | 0.1–0.25 | > 0.25 |

Read the correspondences rather than the numbers. LCP is TTFD's sibling: both ask when the user
can actually use the screen, not when something was painted. INP is the frame budget expressed as
input latency — an interaction misses 200ms for the same reasons a frame misses 8.3ms, namely a
main thread occupied by work that should have been chunked, deferred, or moved off-thread. CLS has
no direct mobile-native analogue only because native layout systems are less prone to
asynchronously-sized content, and it reappears the moment a list item resizes after an image
resolves.

The shared principle is the one worth carrying between platforms: **budgets are percentiles from
the field, not medians from the lab**. A lab trace explains *why* something is slow and can never
tell you *whether* it is slow for your users, because your device is not their device and your
network is not their network. Lab traces diagnose; field percentiles decide.

## 9. CI gating

A budget that is not enforced by a build failure is a preference, and preferences lose to
deadlines. Gate the following automatically.

**Stability and skippability.** Enable the Compose compiler metrics
(`-P plugin:androidx.compose.compiler.plugins.kotlin:reportsDestination=...`) and diff the
generated `*-composables.txt` reports against the previous build. A composable that changes from
skippable to non-skippable, or a parameter that changes from stable to unstable, is a rendering
regression that costs nothing to detect now and hours to find later inside a jank report.

**Benchmark thresholds.** Run Macrobenchmark startup and scroll benchmarks on a fixed device model
in CI and fail on regression against a stored baseline — compare P90, not the mean, and set the
band from the observed run-to-run variance so the gate does not fire on noise. A gate that produces
false failures gets disabled within a fortnight, which is worse than having no gate.

**Size budgets.** Assert on the AAB's estimated download size per configuration and fail the build
above the budget. This is the only mechanism that catches a dependency whose transitive graph adds
2MB, because no reviewer reads a lockfile diff closely enough.

**Baseline Profile freshness.** A profile generated against an old startup path silently stops
covering the hot methods after a refactor. Regenerate it in CI on a schedule and fail if the
generated profile diverges from the committed one beyond a threshold.

**Field monitoring as the outer loop.** CI gates the lab; Play Vitals and the Chrome UX Report
gate reality. Alert on the crash and ANR rates from section 4 at a warning level well below the
bad-behaviour threshold, because by the time the dashboard flags you, the 28-day window already
contains the damage.

## Pass conditions

### Evidence

- Is every claimed performance improvement backed by a trace or benchmark captured on a release
  build on a physical device, rather than by a logcat timing or a debug-build measurement?
- Does the repository contain Macrobenchmark tests using `StartupTimingMetric()` and
  `FrameTimingMetric()` that run in CI?
- Are custom timing regions emitted as trace slices (`androidx.tracing.trace`) so they appear on
  the same timeline as platform work?
- For any reported regression, is the comparison against the same device model, same compilation
  mode, and same iteration count as the baseline?

### Startup

- Is cold start under 1s, warm under 500ms, and hot under 100ms on the target mid-range device?
- Is TTFD instrumented through `reportFullyDrawn()`/`ReportDrawn`, and is the gate set on TTFD
  rather than on TTID alone?
- Does the merged manifest contain any third-party initialisation `ContentProvider` that has not
  been removed and replaced with `androidx.startup` or lazy initialisation?
- Does `Application.onCreate()` perform any disk read, network call, or database open?
- Is a Baseline Profile generated, committed, and regenerated when the startup path changes?

### Frames

- Is the frame budget stated for the target refresh rate (16.7 / 11.1 / 8.3ms), and does the
  application's own work leave headroom for system compositing?
- Are jank figures reported as P50/P90/P99 and percentage of frames over budget, rather than as a
  mean?
- Are there any frames over 700ms in the scroll benchmark?
- Does any list item binder perform I/O, decode an image, or construct a formatter per bind?

### Field gates

- Is the user-perceived crash rate below 1.09% and the user-perceived ANR rate below 0.47% on every
  significant device model?
- Is there an alert configured at a warning level below those thresholds rather than at them?

### Images, lists, memory

- Does every async image request specify an explicit decode target size?
- Does any lazy list item contain a `SubcomposeLayout` or `BoxWithConstraints`?
- Do all list items declare a stable key and a content type?
- Is every cache bounded in bytes against `ActivityManager.getMemoryClass()` rather than in entries
  or unbounded?
- Does `onTrimMemory` release caches at `TRIM_MEMORY_UI_HIDDEN` and above?
- After navigating into and out of each major screen, is the retained instance count for its
  Activity, Fragment, and ViewModel exactly zero in a post-GC heap dump?
- Does any ViewModel or singleton hold a reference to an Activity, View, or non-application
  Context?

### Size

- Does release output an AAB with `resConfigs`, `abiFilters`, and WebP or vector assets?
- Is R8 enabled with resource shrinking, and is `mapping.txt` archived and uploaded automatically
  for every shipped build?
- Is download size asserted against a budget in CI?

### Web

- Are LCP, INP, and CLS measured at the 75th percentile of field data rather than from lab runs?
- Is LCP ≤ 2.5s, INP ≤ 200ms, and CLS ≤ 0.1 for the routes under review?

### CI

- Do Compose stability and skippability reports get diffed between builds, with a regression
  failing the build?
- Do benchmark gates compare P90 against a stored baseline with a noise band derived from observed
  variance?
- Does a size budget or a benchmark threshold breach fail the build rather than emit a warning?
