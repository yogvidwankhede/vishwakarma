# The evidence rule, startup budgets, frame budgets, and field gates

This is the tooling layer under the budgets in the body: which instrument answers which question,
how to capture a number that transfers to production, and where the platform's own thresholds sit.

---

## 1. What counts as admissible evidence

**No architectural change without a trace.** The claim you need before restructuring anything is
not "this is slow" but "this slice took this long on this thread", because only the second form
can be checked again afterwards and can be defended when the change makes something else worse.

Logcat and console timings do not meet that bar. A `System.currentTimeMillis()` pair on a
debuggable build runs with R8 disabled, ART interpreting or JIT-compiling with no profile-guided
AOT, and the debugger's instrumentation hooks live. The result is commonly two to five times
slower than release, and the slowdown is not uniform, so the *ranking* of costs changes and the
conclusion can be exactly backwards.

The tools that produce admissible evidence on Android:

| Tool | Answers |
| --- | --- |
| Macrobenchmark with `StartupTimingMetric()` | Cold, warm and hot startup on a real device, release build, repeated |
| Macrobenchmark with `FrameTimingMetric()` | Frame duration distribution for a scripted scroll or interaction |
| Baseline Profiles | Which classes and methods to AOT-compile at install time |
| Perfetto / `systrace` | Every thread's slices, binder calls, lock contention, CPU frequency |
| Android Studio Profiler | Allocation sites, heap dumps, method traces during an interactive session |

Macrobenchmark drives a **release-like build in a separate process**, which is why its numbers
transfer. Run it under both `CompilationMode.None()` and `CompilationMode.Partial()` to see what a
Baseline Profile actually buys, and with `iterations` high enough that the variance band is
narrower than the effect you intend to claim. A regression comparison is only valid against the
same device model, the same compilation mode, and the same iteration count.

Perfetto is the instrument that ends arguments, because a trace opened in the Perfetto UI is
queryable with SQL over its slice table:

```sql
SELECT name, dur / 1e6 AS ms FROM slice WHERE dur > 16e6 ORDER BY dur DESC LIMIT 40;
```

That is every slice longer than one 60Hz frame, ranked. If your suspected culprit is not in the
result, it is not the problem, whatever shape the flame graph suggested.

Custom instrumentation belongs in the trace rather than in a log:
`androidx.tracing.trace("loadFeed") { }` puts your slice on the same timeline as the platform's,
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
platform as `Displayed` in logcat and by Macrobenchmark as `timeToInitialDisplayMs`. Time to full
display is when the screen shows real content, and it exists only if you signal it by calling
`Activity.reportFullyDrawn()` or `ReportDrawn` in Compose. TTFD is the honest number, because TTID
can be driven arbitrarily low by drawing a skeleton immediately — the metric improves and the user
is still looking at grey rectangles. Track both, gate on TTFD.

**The ContentProvider auto-initialisation tax.** A `ContentProvider` declared in a merged manifest
is created by the system before `Application.onCreate()` returns: synchronously, on the main
thread, in manifest order. Each costs process-level class loading plus whatever the library does
in its `onCreate`, and a handful of analytics, crash-reporting and image libraries routinely add
200–400ms before any of your code runs — none of it visible in your source, which is why it is
usually found late and by accident. Remove them with a `tools:node="remove"` merge rule and
initialise through **`androidx.startup`**, which gives a single provider with a declared dependency
graph, or better still lazily at the first point of use.

The rest of the cold-start checklist follows the same mechanism, main-thread work before the first
frame:

- Ship a **Baseline Profile**. Without one, ART interprets and JIT-compiles the startup path on
  every one of the first runs; with one, the listed methods are AOT-compiled at install time.
  Typical gains are **15–30%** on startup, plus a visible reduction in first-scroll jank.
- Do no disk or network I/O in `Application.onCreate()`. A `SharedPreferences` read is a
  synchronous file parse, and a first-time Room open runs schema validation.
- Do not inflate a hierarchy or compose a tree you are about to replace. A splash Activity costs a
  full extra Activity launch; use the `SplashScreen` API instead.
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
distribution *is* the experience, which is why `FrameTimingMetric()` reports `frameDurationCpuMs`
at P50/P90/P95/P99.

Two thresholds are set by the platform and the store rather than by you. A **frozen frame** takes
over **700ms**, long enough that the app appears hung. An **ANR** fires when the main thread fails
to service input for **5 seconds**, or a broadcast for 10, or a foreground service start for 20.

Common causes, ranked by how often they turn out to be the real answer: main-thread I/O inside a
scroll such as a preference or file read per item; image decode on the main thread; synchronous
`measure`/`layout` triggered by a subcomposition inside a list; allocation churn provoking garbage
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
by the time the dashboard flags you, the 28-day window already contains the damage.
