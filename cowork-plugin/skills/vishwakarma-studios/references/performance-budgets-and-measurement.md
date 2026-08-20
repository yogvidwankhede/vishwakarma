# Performance budgets and measurement

You may not claim a bottleneck you have not measured. Every performance conversation that begins "I think the problem is the shadows" and ends with a shadow change is a coin flip dressed as engineering, and the industry's collective experience is that intuition about where frame time goes is wrong more often than it is right — the profiler regularly points at asset loading, garbage collection or a single unbatched UI element while the team is optimising lighting. The second half of the discipline is that the number you are measuring against is not universal: the platform decides the budget, so the first sentence of any performance discussion names the platform, the frame rate target and the resolution, and any claim stated without those three is not a claim about performance at all.

Everything below is stated in milliseconds against a named target. Frames per second is a reporting unit for players and a bad unit for engineers, because it is non-linear: the difference between 60 and 50 fps is 3.3 ms and the difference between 30 and 27 fps is also 3.3 ms, so the same optimisation appears large or small depending on where you started. Budget, measure and argue in milliseconds; convert to fps only at the end.

## 1. Name the platform: frame budgets and the CPU/GPU split

The frame budget is the reciprocal of the refresh target, minus a safety margin for variance. Budget to roughly 90% of the theoretical frame time on a fixed-rate platform, because a frame that lands at 16.6 ms on average will miss regularly, and a missed vsync on a 60 Hz display costs a full 16.67 ms rather than the microsecond you overran by.

| Target | Refresh | Frame budget | Safe budget | CPU game thread | CPU render thread | GPU | Typical internal resolution |
|---|---|---|---|---|---|---|---|
| PC, 60 fps | 60 Hz | 16.67 ms | 15.0 ms | 8–10 ms | 8–12 ms | 14–15 ms | Native or DLSS Quality |
| PC, 120 fps | 120 Hz | 8.33 ms | 7.5 ms | 4–5 ms | 4–6 ms | 7.0 ms | 1080–1440p |
| PC, 144 fps | 144 Hz | 6.94 ms | 6.2 ms | 3.0–3.5 ms | 3.5–4.5 ms | 5.8 ms | 1080p, upscaled |
| PS5, quality mode | 30 Hz | 33.3 ms | 30.0 ms | 18–22 ms | 18–24 ms | 30.0 ms | 1440–1800p dynamic |
| PS5, performance mode | 60 Hz | 16.67 ms | 15.0 ms | 9–11 ms | 9–12 ms | 15.0 ms | 1080–1440p dynamic |
| Xbox Series X | 60 Hz | 16.67 ms | 15.0 ms | 9–11 ms | 9–12 ms | 15.0 ms | 1080–1440p dynamic |
| Xbox Series S | 60 Hz | 16.67 ms | 15.0 ms | 9–11 ms | 9–12 ms | 15.0 ms | 720–1080p dynamic |
| Switch, docked | 30 Hz | 33.3 ms | 30.0 ms | 16–20 ms | 14–18 ms | 30.0 ms | 720–900p |
| Switch, handheld | 30 Hz | 33.3 ms | 30.0 ms | 16–20 ms | 14–18 ms | 30.0 ms | 540–720p |
| Switch 2, handheld | 60 Hz | 16.67 ms | 15.0 ms | 8–10 ms | 8–11 ms | 15.0 ms | 720–1080p, upscaled |
| iOS, recent iPhone | 60 Hz | 16.67 ms | 13.0 ms sustained | 6–8 ms | 5–7 ms | 12–13 ms | Native or 0.8x |
| iOS, ProMotion | 120 Hz | 8.33 ms | 7.0 ms | 3–4 ms | 3–4 ms | 6.5 ms | 0.6–0.8x |
| Android, mid-tier | 30 Hz | 33.3 ms | 27.0 ms sustained | 12–16 ms | 10–14 ms | 25.0 ms | 720–900p |
| VR, 90 Hz per eye | 90 Hz | 11.1 ms | 9.5 ms | 4–5 ms | 4–5 ms | 8.0–9.0 ms | Per-eye, foveated |
| VR, 120 Hz per eye | 120 Hz | 8.33 ms | 7.0 ms | 3–4 ms | 3–4 ms | 6.0–6.5 ms | Per-eye, foveated |

Four qualifications make that table usable rather than decorative.

**The CPU columns overlap; they do not sum.** Game thread and render thread run pipelined, so frame N's render thread overlaps frame N+1's game thread. The frame time is the *maximum* of game thread, render thread, RHI submission and GPU — not their sum. This is why optimising the second-largest of the four changes nothing measurable and why the first act of any investigation is finding which of the four is largest.

**Series S is not Series X at lower resolution.** It has roughly one third the GPU throughput (about 4 TFLOPs against 12.15), 10 GB of total memory against 16 GB with roughly 8 GB usable by the game, and the same CPU at a slightly lower clock. Content that fits Series X at 1440p does not automatically fit Series S at 1080p, because the memory ceiling — not the shading rate — is usually what breaks first. Certification requires both to ship.

**Switch handheld is a clock change, not a resolution change.** The original hardware runs its GPU at 768 MHz docked and 307.2 MHz handheld, which is 40% of the throughput inside the same 33.3 ms budget. Do not treat handheld as a resolution slider: it needs its own measured budget, its own dynamic resolution range and often its own effect list.

**Mobile budgets carry a thermal qualifier.** A phone sustains peak clocks for 3–8 minutes and then throttles by 30–50%. Budget against the throttled state, measure after 15 minutes of continuous play with the device out of a case, and treat the first three minutes of any mobile profiling session as unrepresentative. A build that hits 60 fps for four minutes and 38 fps thereafter has failed, and the player-facing symptom is that the game "gets worse the longer you play", which is exactly what is happening.

**VR pays a reprojection penalty that is worse than a dropped frame elsewhere.** At 90 Hz you have 11.1 ms, of which the runtime reserves 1–2 ms for composition, distortion correction and timewarp, leaving roughly 9.0 ms of application budget. Miss it and the runtime reprojects the previous frame: on most headsets this halves the effective application rate to 45 Hz, so overrunning by 0.5 ms costs 11.1 ms of latency rather than 0.5. Asynchronous timewarp corrects head rotation only, so translation, animation, particles and any transparent geometry judder visibly, and disoccluded regions smear. The practical consequence is that VR budgets need a wider safety margin than flat targets — 85% of theoretical rather than 90% — and that dynamic resolution and fixed foveated rendering are mandatory rather than optional.

The GPU budget is a single number owned by the rendering team; the CPU budget is not, and a frame budget that stops at "10 ms on the game thread" will be consumed by whichever system asks last. Subdivide it before anyone writes code. A representative 60 fps console allocation of a 9.5 ms game thread:

| System | Budget (ms) | Share | What moves it |
|---|---|---|---|
| Animation evaluation and skinning setup | 2.0 | 21% | Character count, bone count, blend tree depth, IK passes |
| Physics simulation and queries | 1.8 | 19% | Active rigid body count, substeps, raycasts per frame |
| Gameplay and scripting | 1.8 | 19% | Actor tick count, tick frequency, script hot paths |
| AI: perception, decisions, pathfinding | 1.2 | 13% | Agent count, decision rate, path request rate |
| Render submission and culling from the game thread | 1.2 | 13% | Object count, draw call count |
| Audio: voices, mixing, spatialisation | 0.6 | 6% | Voice count, DSP chain, occlusion tracing |
| UI layout and widget updates | 0.5 | 5% | Widget count, layout invalidation rate |
| Networking, replication, serialisation | 0.4 | 4% | Replicated actor count, update rate |
| **Total** | **9.5** | **100%** | |

The value of that table is not its numbers, which will differ per project, but the fact that when a designer asks for 200 agents instead of 80, the answer is arithmetic against a named line rather than an opinion. The useful form of every budget question is never "can we afford this" but "what are we removing to pay for it", and a team that cannot answer the second form has not budgeted.

Solo: pick the single weakest device you intend to support, write its safe budget on a sticky note, and check the build against it weekly. Studio: every row above that the title ships on is an owned budget with a named engineer, sub-budgets per system, an automated nightly capture on real hardware, and a threshold that fails the build.

## 2. The profiling workflow, in order

The order is load-bearing. Steps performed out of sequence produce conclusions that do not survive contact with the shipping build.

**Reproduce on target hardware.** The bug is defined by a platform, a build configuration, a scene, a camera position and a repeatable action. If it cannot be reproduced deterministically, the next step is building a reproduction — a replay, a scripted camera flythrough, a saved game plus a documented input sequence — because every subsequent measurement is a comparison and comparisons need identical conditions.

**Capture with the right granularity.** Start with a whole-frame breakdown (thread times, per-pass GPU times), not with an API capture. A RenderDoc capture is 200 MB and an hour of inspection; `stat unit` is one line and answers whether you are in the right hemisphere.

**Attribute to CPU or GPU.** Section 4 gives the test. Until this is settled, every hypothesis is unfalsifiable.

**Find the dominant cost inside that side.** On the CPU that means a sampled or instrumented profile showing inclusive and exclusive time per function; on the GPU it means per-pass timings. The dominant cost is the one worth attacking: a 40% improvement to something that is 4% of the frame is 1.6% of the frame, and the same effort spent on the 30% item is worth eighteen times as much.

**Change one thing.** One change, isolated, with the reason written down. Two simultaneous changes produce a result you cannot attribute, and the common outcome is that one helped, one hurt, and the team keeps both.

**Re-measure under identical conditions.** Same hardware, same scene, same build configuration, same thermal state, 100+ frames, compare medians and the 99th percentile rather than single frames or means. Then decide: keep, revert, or investigate why the prediction was wrong. A change that helped for a reason you cannot explain is a change that will regress silently later.

Measurement hygiene is what makes the loop repeatable. Fix the machine's power profile and let it reach thermal steady state before capturing; disable background processes, overlays and capture software; disable vsync and any frame limiter so headroom is visible; lock the scene's random seeds and time of day; use a fixed timestep replay rather than live play; and discard the first 100 frames of any capture, which are contaminated by streaming, shader compilation and cache warming. Record the build's changelist and configuration alongside every number, because a measurement you cannot reproduce in six weeks is a measurement you cannot defend.

The single most common failure in this loop is skipping re-measurement because the change was "obviously" an improvement. Removing work does not always reduce frame time — if the pass was overlapping something else via async compute, if it was hiding latency for a later pass, or if the bottleneck was elsewhere, the frame time is unchanged and you have spent a week and made the code worse.

## 3. Why profiling in the editor lies

Editor measurements are systematically wrong in the direction of pessimism on the CPU and optimism on memory and streaming, which is the worst possible combination because it sends teams to optimise things that are not problems while hiding things that are.

| Distortion | Direction | Rough magnitude |
|---|---|---|
| Editor tooling, inspectors, scene view rendering | CPU slower | 10–40% |
| Deep or instrumented profiling mode | CPU slower, distribution distorted | 2–10x on call-heavy code |
| Development/Debug build checks, asserts, logging | CPU slower | 10–30% versus Shipping |
| Mono in-editor versus IL2CPP/AOT in the shipping build | Different by 1.5–3x on hot script code | Direction varies |
| Shaders compiled on demand as objects appear | First-encounter spikes that do not exist in a cooked build | 10–500 ms each |
| Uncooked assets, no bundle packing, loose files | Loading and streaming faster or slower unpredictably | Large |
| No streaming pool limit, everything resident | Memory pressure and pop-in hidden entirely | Total |
| Desktop CPU running the editor versus console CPU | Console CPU is typically slower per core | 1.5–3x |

The rule that follows: performance decisions are made on a cooked, optimised, packaged build running on target hardware. The editor is for finding *which* system is expensive, never for deciding *whether* something fits. Unreal's Development configuration is acceptable for relative comparison and wrong for absolute budgets; Test configuration exists precisely to give Shipping's optimisation level with profiling instrumentation retained, and that is the configuration performance work should be done in. Unity's equivalent is a development build with the profiler attached, built with the same scripting backend, stripping level and IL2CPP settings as the release build.

## 4. CPU-bound or GPU-bound: the determination

The concrete test is the resolution test, and it takes ninety seconds.

Halve the internal rendering resolution — 100% to 50% linear scale, which is 25% of the pixels — and re-measure the frame time in the same scene from the same camera position.

If frame time drops substantially, you are GPU-bound and specifically pixel-bound: shading, bandwidth or fill rate dominates. If frame time is unchanged, you are CPU-bound, and no amount of shader optimisation, resolution scaling or post-processing removal will move the frame at all. The mechanism is that internal resolution changes the number of pixel shader invocations and the bytes moved per frame, and touches nothing on the CPU: draw call submission, culling, animation, physics, gameplay and garbage collection are all identical at 540p and 4K.

Two refinements make the test sharper. If halving resolution helps only slightly, you are GPU-bound on something that is not resolution-dependent — shadow map rendering at its own fixed resolution, vertex and geometry processing, or BVH refits — so change the *other* axis: drop LOD levels or hide half the objects and re-measure. And if you suspect submission cost rather than either, render the same scene with all materials replaced by a trivial unlit shader: if the frame time barely moves, the cost is in submission and state changes, not in shading.

Beware the vsync illusion. With vsync or a frame rate limiter enabled, the frame time flattens to the refresh interval and the CPU appears to idle in Present. Any measurement of headroom must be taken with vsync off and the limiter disabled, or you will conclude that a frame with 3 ms of slack and a frame with 0.1 ms of slack are identical. Conversely, time attributed to "Present" or "wait for GPU" is not GPU work — it is the CPU waiting, and it means the GPU is the bottleneck.

## 5. Percentiles, not averages

Average frame rate is the metric that correlates worst with the experience players describe. A build averaging 60 fps with a 200 ms hitch every four seconds is unplayable; a build locked at 45 fps with a 2 ms standard deviation feels smooth. The mean cannot distinguish them, because the hitches are a small fraction of total frames and are averaged into invisibility.

Measure and report these four, always together:

| Metric | Definition | What it catches |
|---|---|---|
| Median frame time | 50th percentile, ms | The typical experience |
| 95th percentile | Slowest 1 frame in 20 | Sustained heavy scenes |
| 99th percentile | Slowest 1 frame in 100 | Recurring spikes: GC, streaming, PSO compiles |
| Max over the session | The worst single frame | Loading hitches, hangs |

A useful supplementary measure is the proportion of frames exceeding the budget — "97.3% of frames under 16.67 ms" is a directly actionable statement, and a target of 99.5% for a fixed-rate console title is achievable. Frame-time variance matters independently of magnitude: the perceptual threshold for noticing a single dropped frame at 60 Hz is around one frame, and a repeated pattern of 16, 16, 33, 16, 16, 33 reads as worse than a consistent 22, even though the latter has the lower frame rate.

Report frame time histograms rather than a single number when comparing builds, because two builds with identical medians and different tails are different products. Percentile targets belong in the same budget document as the millisecond targets.

## Pass conditions

Answer yes to every applicable line before performance work is considered complete.

1. The target platform, frame rate target and resolution are named in every performance claim, and a millisecond budget exists per platform rather than a frame rate aspiration.
2. Budgets are set at roughly 90% of theoretical frame time (85% for VR) with the remainder reserved for variance.
3. Game thread, render thread, submission and GPU times are measured separately, and the bottleneck is named before any optimisation begins.
4. No bottleneck has been claimed without a measurement supporting it.
5. All performance decisions are based on a cooked, optimised build running on target hardware, never on editor measurements.
6. The CPU-bound versus GPU-bound determination has been made with the resolution test, with vsync and any frame limiter disabled.
7. Median, 95th percentile, 99th percentile and worst frame time are all reported; average frame rate alone is not accepted as evidence.
8. The proportion of frames inside budget is tracked against an explicit target.
9. Every change is made one at a time and re-measured under identical conditions over 100+ frames, comparing medians.
10. Mobile budgets are validated after 15 minutes of continuous play in the thermally throttled state.
11. VR builds hold the full application budget with reprojection disabled, and dynamic resolution plus foveated rendering are enabled.
