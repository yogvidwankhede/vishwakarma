# Images, lists, memory, download size, web parity, and CI gating

Startup and frame time are deadlines. Heap and bytes are budgets of a different kind: exceeded
gradually, invisible in a lab run, and enforced by the operating system killing your process or by
a user abandoning an install. This is where those budgets are set and how the build holds them.

---

## 1. Image decode arithmetic

**Explicit sizing is mandatory on every asynchronous image load.** A loader given no target
dimensions decodes at the source's intrinsic resolution. A 4000×3000 JPEG decoded to `ARGB_8888`
occupies 4000 × 3000 × 4 bytes = **48MB** of heap, regardless of the 64dp avatar slot it is being
drawn into. Fifty such rows request 2.4GB against a per-app limit in the low hundreds of
megabytes, so the outcome is an `OutOfMemoryError` — and the outcome *before* that is seconds of
garbage-collection pauses on the main thread while the allocator tries.

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

`Modifier.size(64.dp)` alone scales at draw time, after the full-resolution bitmap already exists,
which is why it does not solve this. The equivalents elsewhere are Glide's
`override(width, height)`, `BitmapFactory.Options.inSampleSize` for a manual decode, and a
server-side resize or CDN transform wherever you control the endpoint — the cheapest decode is the
one whose extra pixels never crossed the network. `RGB_565` halves bytes per pixel and is a
legitimate choice for opaque thumbnails where banding is acceptable.

## 2. Lists

A list compounds every per-item cost by the number of visible items and again by scroll velocity,
so a cost that is invisible on a detail screen becomes the whole frame budget in a feed.

- Every item needs a **stable key** and a **content type**, so recycling reuses a compatible slot
  rather than rebuilding a subtree.
- **No per-item subcomposition.** `BoxWithConstraints`, `SubcomposeLayout`, and anything built on
  them defer measurement into the layout pass, which defeats the list's ability to pre-measure and
  prefetch upcoming items. The list stops preparing items ahead of the scroll and starts producing
  them during it, which is precisely when there is no budget spare.
- No per-item allocation of formatters, comparators, or lambdas capturing unstable objects. A
  `SimpleDateFormat` constructed per row allocates and parses a pattern sixty times a second.
- No main-thread I/O in an item binder, including preference reads and `Resources` lookups by
  string name.
- Paginate rather than loading unbounded pages. A list holding 5,000 model objects is a memory
  problem even when only eight are visible.

## 3. Memory and leak shapes

Android does not swap. When the system needs memory it kills processes by `oom_adj` score, so a
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
  the screen captures `this` and therefore the whole view tree. A `LocationManager` listener
  registered in `onCreate` and never removed retains the Activity for the process lifetime.
- **A ViewModel holding a View or Context.** A ViewModel survives configuration change by design,
  so a reference to the destroyed Activity's context leaks the entire old hierarchy on every
  rotation. Inject the application context where a context is genuinely needed.
- **The unbounded cache.** A `HashMap` used as an image or model cache never evicts, so it grows
  for the process lifetime.

Bound caches in **bytes, not entries**, because entry size varies by orders of magnitude between a
thumbnail and a full-bleed hero — an entry count bounds nothing. Size an `LruCache` as a fraction
of the heap the device grants you; `ActivityManager.getMemoryClass()` returns that in megabytes
and one eighth is a common starting allocation. Respond to
`onTrimMemory(TRIM_MEMORY_UI_HIDDEN)` and above by dropping caches, since that callback is the
system telling you that you are next in the kill order.

```kotlin
val cache = object : LruCache<String, Bitmap>(am.memoryClass * 1024 * 1024 / 8) {
    override fun sizeOf(key: String, value: Bitmap) = value.byteCount
}
```

## 4. Download and install size

Size is a conversion metric before it is a performance metric: install completion rate falls
measurably as app size rises, and the effect is largest exactly where the growth hurts most, on
cheaper devices and metered connections.

Ship an **Android App Bundle** rather than a universal APK. Play generates splits per density, per
ABI and per language, so a device downloads one of each instead of all of them; on a multi-ABI,
multi-density, multi-locale app this alone typically removes **35–50%** of the transfer. Reinforce
it in the build with `resConfigs` limited to the locales you actually translate, `abiFilters`
narrowed to the ABIs you support, and every opaque PNG converted to **WebP** (typically 25–35%
smaller at equivalent quality) or to a vector drawable where the artwork is geometric.

Enable **R8** in release with code and resource shrinking. R8 removes unreachable code and rewrites
what remains, which is also why it obfuscates stack traces — and why **archiving `mapping.txt` for
every shipped build is mandatory**. Without the mapping file for that exact build a production
crash arrives as `a.b.c.d(Unknown Source)` and is undiagnosable, and the file is build-specific, so
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
(`-P plugin:androidx.compose.compiler.plugins.kotlin:reportsDestination=…`) and diff the generated
`*-composables.txt` reports against the previous build. A composable that changes from skippable to
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
damage.
