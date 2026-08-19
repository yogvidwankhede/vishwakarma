# Shader compilation, tooling, automation and optimisation order

This part covers the remaining machinery of a performance practice: the pipeline state compilation that produces first-encounter stutter, the tools that produce trustworthy numbers, the automation that defends a budget across a large team, and the order in which optimisations should be attempted once the measurement is done.

## 1. Shader compilation and pipeline state stutter

Shader compilation stutter is the single most common complaint about PC releases, and it has an entirely mechanical cause. Modern explicit APIs (DX12, Vulkan) require a pipeline state object — the compiled combination of shaders, blend state, depth state, rasteriser state and render target formats — before a draw can be issued. If a PSO is not already compiled when the draw is first submitted, the driver compiles it on the spot, which takes 10–500 ms on a single core. The player sees a hitch the first time a new material, effect or weapon appears, and the pattern is diagnostic: hitches on first encounter, never on the second, worst in the first thirty minutes of play, and absent entirely on the developer's machine because their driver shader cache is warm from a hundred previous runs.

The scale of the problem is why it is not solved by accident. A large title has 5,000–30,000 distinct PSOs across its material permutations, vertex factories and render passes; compiling them all serially at 100 ms each would be an hour. The mitigations, in order of effectiveness:

**Ship a gathered PSO cache.** Run automated playthroughs — ideally the full critical path plus a sampling of optional content — with PSO collection enabled, gather the set actually used, and ship it. Unreal's bundled PSO cache and Unity's shader variant collections both do this. The cache lets the engine compile ahead of need rather than on demand.

**Precache at load with parallel compilation.** Compile the gathered set across all available cores during loading screens, level transitions and the main menu. On an 8-core CPU, 6,000 PSOs at 80 ms each is roughly 60 seconds of wall-clock compilation — which is why this happens in the background across the first several minutes rather than blocking the main menu, with the highest-priority sets (player weapons, UI, first-area materials) compiled first.

**Build a warm-up scene.** A hidden or off-screen sequence that draws one instance of every material class against every relevant render state, executed once at first launch. This is crude and it works, and it is a reasonable answer for smaller titles without playthrough automation.

**Reduce the permutation count at the source.** Every static switch, quality level, vertex factory and platform multiplies the shader count: a master material with 8 static switches is 256 permutations per vertex factory per platform, and 12 vertex factories across 4 platforms turns one authored asset into 12,288 shaders. Prefer uniform parameters (zero permutations) over static switches, prefer coherent dynamic branches on modern hardware, and track total permutation count as a tracked metric per milestone.

Solo: build a warm-up scene, run it once on first launch behind the splash, and test with the shader cache cleared before every release. Studio: PSO collection runs as part of nightly automation across the full critical path, the gathered cache is a shipped asset validated per platform per driver generation, permutation counts are capped per master material, and any hitch reported by QA on first encounter with content is triaged as a PSO defect until proven otherwise.

The signature to look for in a profile is a main-thread or render-thread spike of 50–500 ms with no GPU activity and no allocation, occurring on the first appearance of a visual element. Diagnose by playing on a machine with the driver shader cache cleared, which is the state every one of your players is in at launch and none of your developers are.

## 2. Tooling

| Tool | Platform | What it is for | Cost model |
|---|---|---|---|
| Unity Profiler / Profile Analyzer | All Unity targets | Per-frame CPU/GPU/memory timeline; frame comparison across builds | Sampling plus instrumentation; deep mode distorts heavily |
| Unreal Insights | All Unreal targets | Trace-based timeline, task graph, memory, networking, loading | Instrumented trace; low overhead, huge captures |
| Unreal `stat unit` / `ProfileGPU` | All Unreal targets | Thread bottleneck attribution; per-pass GPU tree | Near-zero; the first thing to run |
| RenderDoc | PC, Android, some others | Full API capture, resource inspection, shader debugging | Capture-time cost; not for timing |
| PIX | Windows, Xbox | Timing captures with hardware counters, occupancy, cache statistics | The reference tool for GPU timing on Microsoft platforms |
| Nsight Graphics / Nsight Systems | NVIDIA GPUs | Warp-level analysis, register pressure, system-wide trace | Vendor-specific detail unavailable elsewhere |
| Radeon GPU Profiler | AMD GPUs, RDNA consoles | Wavefront occupancy timeline; stall versus throughput attribution | The clearest view of whether a pass is latency-bound |
| Superluminal | Windows | Sampling CPU profiler with excellent thread and call-tree visualisation | Low overhead; the best general CPU tool on PC |
| Tracy | Cross-platform, C++ and bindings | Frame-level instrumented profiler with microsecond resolution, live | Requires manual instrumentation; near-zero overhead |
| Intel VTune | x86 | Microarchitectural analysis: cache misses, branch prediction, memory bandwidth | Heavyweight; use when you already know the function |
| Xcode Instruments / Metal System Trace | iOS, macOS | GPU counters, thermal state, energy, memory | The only accurate view of iOS thermal behaviour |
| Android GPU Inspector, Perfetto, Snapdragon Profiler, Arm Streamline | Android | Per-vendor GPU counters, system trace, thermal and clock behaviour | Vendor tool needed for real GPU counters |
| Platform vendor profilers (PlayStation, Xbox, Nintendo) | Their console | The authoritative timing and certification tooling | Under NDA; the only acceptable source for console budgets |

The selection rule: use `stat unit` or its equivalent to find the hemisphere, a timeline profiler (Insights, Unity Profiler, Tracy, Superluminal) to find the system, and a capture tool (PIX, RGP, Nsight, RenderDoc) only once you know which pass or function you are inspecting. Reaching for a capture tool first is the most common way to lose a day.

Two accuracy warnings. Per-pass GPU timers on hardware using async compute sum to more than the frame time because passes deliberately overlap; treat them as attribution rather than as an additive budget and read the occupancy timeline for the real picture. And PC GPU and CPU timings vary with clock and thermal behaviour, so warm the machine, run 100+ frames and compare medians.

## 3. Automated performance regression testing

At studio scale, performance is not defended by profiling sessions; it is defended by automation, because a title with 80 engineers accumulates regressions faster than any individual can find them. The structure that works:

**Deterministic test scenes.** A set of scripted camera flythroughs and replayed gameplay sequences covering the worst cases — the densest combat encounter, the largest vista, the heaviest particle sequence, the most crowded hub — each running 30–90 seconds with fixed timestep, fixed random seed and no player input. Determinism is what makes run-to-run comparison meaningful.

**Real target hardware in a rack.** Dev kits for each console, plus a matrix of PC configurations spanning minimum and recommended spec, plus a shelf of phones covering the supported Android tier. Emulated or approximated hardware produces numbers that do not transfer, and the whole point of the system is to catch the regression that only manifests on Series S or on a 4-year-old mid-tier Android device.

**Nightly capture on the main branch**, recording per-scene median, 95th and 99th percentile frame time; CPU thread breakdowns; per-pass GPU times; peak and average memory by category; draw call and triangle counts; and load times. Store every run so the history is queryable.

**Thresholds that fail the build.** A regression of more than 5% on median frame time, or more than 10% on the 99th percentile, or any memory budget exceeded, fails the nightly and raises a ticket automatically. Thresholds must exceed measurement noise, which is why the harness reports its own run-to-run variance and why sub-noise thresholds cause the whole system to be ignored within a month.

The metric set a nightly should record, at minimum:

| Metric | Threshold shape | Why it is in the set |
|---|---|---|
| Median frame time per scene | Regression above 5% fails | The typical experience |
| 99th percentile frame time per scene | Regression above 10% fails | Catches hitches the median hides |
| Frames over budget, as a percentage | Absolute target, e.g. under 0.5% | The player-facing form of the budget |
| Peak memory by category | Absolute per-platform cap | Prevents certification failure |
| Draw calls and visible triangles | Absolute per-platform cap | Catches content regressions early |
| Load and level transition time | Absolute cap, often certification-mandated | A hard requirement on console |
| Shader and PSO count | Absolute cap per milestone | Predicts compilation stutter |
| Package size on disk | Absolute cap | Store and certification limits |

**Automatic bisection.** When a nightly regresses, the system bisects the day's commits against the failing scene and names the change. Without this step the regression report is a mystery for a week and is usually closed unresolved; with it, the report arrives attached to a commit and an author.

**Per-milestone hardware-level review.** Nightly automation catches deltas; it does not catch a project that has been 20% over budget since vertical slice. A scheduled review against absolute budgets, per platform, per system owner, is what catches that.

Solo: this whole section collapses to one habit — a saved test scene, a stopwatch measurement of median and worst frame time on your weakest device, recorded in a spreadsheet once a week. Ten minutes weekly catches the regression while you still remember what you changed.

## 4. Optimising in the right order

When the measurement is done and something must change, the order of attack is determined by cost-to-benefit, and it is remarkably stable across projects:

1. **Do less.** Cut object counts, light counts, particle counts, effect layers, tick rates. The cheapest frame time is work that does not exist, and content decisions are usually reversible in a way that architectural ones are not.
2. **Do it at lower frequency.** Not everything needs to run at 60 Hz. AI decisions at 5–10 Hz, distant animation at 15 Hz, UI layout on change rather than per frame, and level-of-detail applied to logic as well as to meshes.
3. **Do it at lower resolution.** Internal resolution, half-resolution effects, lower shadow cascade resolution, reduced probe density. This is the largest single GPU lever available and it is a settings change rather than a rewrite.
4. **Batch it.** Fewer, larger operations: instancing, indirect draws, merged post-processing passes, packed textures, combined buffer updates.
5. **Move it off the critical path.** Onto a worker thread, onto the GPU, into a load-time bake, into an asynchronous job whose result is consumed a frame later.
6. **Change the algorithm.** A spatial hash instead of an O(n²) loop; a different data layout for cache coherence. Large wins, larger risk.
7. **Micro-optimise the code.** SIMD, intrinsics, hand-tuned inner loops. This is last because it typically yields 10–30% of one function's time and consumes disproportionate engineering effort, and because it is the step most likely to be applied to a function that is 2% of the frame.

Solo: stay in steps 1 to 3 almost permanently; your scarcest resource is your own time, and cutting content is faster than optimising it. Studio: steps 1 to 3 are negotiated with content owners against the budget table, steps 4 to 6 are scheduled engineering work with measured before-and-after numbers attached to the commit, and step 7 requires a named justification showing the function exceeds 5% of the frame.

Steps 1 through 3 are content and configuration and can be executed by the team that owns the content. Steps 4 through 7 are engineering. Most projects that are over budget attempt step 7 first, which is why most projects that are over budget stay that way.

## Pass conditions

Answer yes to every applicable line before performance work is considered complete.

1. A PSO or shader variant cache gathered from automated playthroughs ships on every platform that compiles pipeline states at runtime, and is validated on a machine with the driver shader cache cleared.
2. Shader permutation count is tracked per milestone against a cap.
3. Automated performance capture runs nightly on real target hardware across deterministic scenes, with thresholds above measurement noise that fail the build and bisect to a commit.
4. Optimisation proceeds in the order do-less, lower-frequency, lower-resolution, batch, move-off-critical-path, change-algorithm, micro-optimise — and micro-optimisation has not been attempted on a function that is under 5% of the frame.
