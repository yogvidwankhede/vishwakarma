# Network time, frame pacing, threading, and diagnosis

Once the simulation runs on a fixed step at a chosen rate, the remaining timing work is everything that surrounds it: reconciling a server's clock with the local one, presenting frames at an even interval, spreading the frame across cores, and mapping all of it onto a specific engine's callbacks. This part covers those, the decision procedure for diagnosing timing bugs, and the cases where a fixed timestep is the wrong tool.

## 1. Network time: server tick, interpolation delay, rollback

Multiplayer adds a fourth clock — the server's — and the entire architecture of a networked game is a policy for reconciling it with the local simulation clock. The fixed timestep is a prerequisite rather than an optimisation here: without it, the client and server advance the world by different amounts and no reconciliation scheme can converge.

**Server tick rate versus send rate.** These are separate numbers and conflating them wastes bandwidth. A server may simulate at 60 Hz while sending snapshots at 20 Hz, because the snapshot is the expensive part: state size times player count times send rate is the bandwidth bill. Counter-Strike 2 simulates on a 64 Hz tick with sub-tick input timestamps; Valorant runs 128 Hz; Overwatch shipped around 63 Hz; large-scale survival and MMO servers commonly simulate at 20–30 Hz because entity counts make anything higher unaffordable. Choose the simulation rate from gameplay precision requirements and the send rate from bandwidth, then interpolate the gap.

**Entity interpolation delay.** Remote entities are rendered in the past by a buffer of one to two snapshot intervals — 100 ms at a 20 Hz send rate — so that there are always two received snapshots to interpolate between even when one packet is late or lost. This is why hit registration needs lag compensation: the server rewinds hitboxes to where the shooter saw them, using the shooter's reported view time, before testing the shot. The delay is a deliberate quality tradeoff, not a bug: reducing it below one snapshot interval converts jitter into visible teleporting.

**Client prediction and reconciliation.** The local player simulates immediately on local input and stores each input with its tick index. When the server's authoritative state for tick N arrives, the client compares it against its own stored state for tick N; on mismatch it snaps to the server state and re-simulates every input from N+1 to the present within a single frame. That replay is only correct if the simulation is deterministic and step-sized identically on both ends, which is the practical reason a networked game cannot use variable `dt`. Budget for the replay cost: a 150 ms round trip at 60 Hz is 9 ticks of re-simulation on any frame where a correction arrives, so a 1 ms simulation step becomes a 9 ms spike.

**Rollback netcode** is the same mechanism applied symmetrically in peer-to-peer fighting games: predict the remote player's input as a repeat of their last input, simulate forward, and roll back and re-simulate when the real input arrives. The cost is bounded by the maximum rollback depth (typically 7–8 frames at 60 Hz, covering 116–133 ms) multiplied by the per-tick simulation cost, and it requires the entire game state to be serialisable and restorable in well under a millisecond — which pushes the simulation toward a compact, POD-only, pointer-free state representation, and is one of the few cases where a data-oriented layout is a hard requirement rather than an optimisation.

**Clock synchronisation.** Clients estimate server time as `localMonotonic + offset`, with the offset derived from round-trip samples filtered by a moving minimum rather than an average, because the minimum RTT is the least contaminated by queueing delay. Clients then run their simulation slightly ahead of the server so their inputs arrive just before the server needs them, and adjust by nudging the local tick rate a fraction of a percent rather than by jumping the tick counter — a jump is a visible discontinuity in every predicted entity.

Studio: pick the tick rate, send rate, interpolation delay and maximum rollback depth in pre-production, write them into a network design document, and instrument all four so a regression is measurable. Solo: use the engine's provided model (Unity Netcode for GameObjects, Unreal replication, Godot's high-level multiplayer) and accept its tick rate rather than building reconciliation yourself.

## 2. Frame pacing versus frame rate

Frame rate is a count; frame pacing is the variance in presentation intervals. Players perceive variance far more strongly than average. A locked 30 fps presenting every 33.3 ms is smooth; a 45 fps average alternating 16.7 ms and 33.3 ms presents motion with a 2:1 stutter pattern that reads as worse than the locked 30, because the eye tracks a moving object and each irregular interval places it in the wrong position on the retina. This is why console titles ship 30 fps modes with hard frame locks rather than uncapped 40-ish, and it is the reason to measure the 99th-percentile frame interval rather than the mean.

The mechanisms that produce bad pacing:

**Missing vsync by a small margin.** With vsync on and double buffering, a frame that takes 17 ms on a 60 Hz display waits for the next scanout and presents at 33.3 ms. The effective rate drops to 30 fps from a 2% overrun. Triple buffering removes the hard drop at the cost of one frame of latency; a flip-model swap chain with `DXGI_SWAP_EFFECT_FLIP_DISCARD` and 2–3 buffers is the modern Windows answer. Variable refresh rate displays (G-Sync, FreeSync, VRR on consoles) solve this properly by making the display wait for the game, within the panel's VRR window, typically 48–120 Hz.

**Presenting as fast as possible.** Uncapped rendering produces tearing without vsync and wastes power and thermal headroom, which on mobile and handhelds converts directly into a thermal throttle 8–15 minutes into a session and a frame rate that then falls below where a cap would have held it. Cap deliberately.

**`Time.deltaTime` spikes from non-render work.** A garbage collection pause, a synchronous asset load, a shader compile, or a texture upload stalls the main thread and shows up as one long frame. A frame-time graph with periodic spikes at a regular interval is nearly always GC or streaming, not rendering. Diagnose by timeline capture, not by staring at an average.

**Frame time measured in the wrong place.** `deltaTime` measured between the starts of two frames includes the vsync wait, so a game that is comfortably inside budget reports frame times equal to the refresh interval. Measure CPU work separately from presentation interval, or you will conclude everything is at exactly 16.67 ms and learn nothing.

Setting the cap, per platform: Unity uses `Application.targetFrameRate` plus `QualitySettings.vSyncCount` (note that `targetFrameRate` is ignored when vsync is non-zero on most platforms, and ignored entirely in the editor); Unreal uses `t.MaxFPS` and the `Frame Pacing`/`FramePacer` mobile path; Godot uses `Engine.max_fps` and the `display/window/vsync/vsync_mode` project setting. On Android, use the Frame Pacing (Swappy) library, which chooses a presentation deadline and holds it rather than allowing the compositor to drop frames arbitrarily — Unity exposes this as Optimized Frame Pacing in Player Settings, and it is worth enabling on any Android title targeting a stable 30 or 60. On iOS, `CADisplayLink.preferredFrameRateRange` is the mechanism, and ProMotion devices require declaring a range rather than a single value.

Studio: define the target as a pair — a frame rate and a maximum 99th-percentile interval — and gate builds on both. "60 fps" with a 99th percentile of 40 ms fails a player's perception test even though it passes an average test. Solo: pick a cap, hold it, and check the frame-time graph rather than the counter.

## 3. Threading the loop

The single-threaded loop in `game-loop-fixed-timestep-core.md` has a serial dependency chain: input, simulation, render submission. Parallelising it is where multi-core throughput comes from, and the constraint that governs every design is the sync point — the moment where parallel work must complete before the next stage can read its results.

Three viable structures, in order of adoption cost.

**Task-parallel systems inside a serial frame.** The frame stays serial, but individual systems fan out across worker threads: 5,000 particle updates split into 64-entity batches, raycast queries batched into a single parallel job, animation pose evaluation across all skeletons. Each fan-out ends in a join before the next system starts. This is Unity's `IJobParallelFor`, Unreal's `ParallelFor`, and any thread pool with a `wait_for_all`. It gives most of the win for a fraction of the complexity, and it is the correct default.

**Pipelined stages.** Simulation of frame N runs concurrently with render submission of frame N−1. Throughput improves toward the slowest stage; latency increases by one frame because the image presented is one simulation step older. This is standard in AAA renderers and is why "render thread" appears as a separate track in profilers. The hazard is that the render thread reads simulation state while simulation is writing it, so the frame boundary requires either double-buffered state or an extracted, immutable render packet. Extract once, at a defined point, into a structure the render thread owns.

**Job graph with explicit dependencies.** Every system declares the data it reads and writes; the scheduler derives the dependency graph and runs anything unordered in parallel. This is where the largest wins live and where the largest complexity lives. Unity's job safety system, which tracks read/write aliasing on every `NativeArray` and throws in the editor when two jobs conflict without a declared dependency, is the pattern to copy: make aliasing checkable at the container level rather than trusting review.

What can safely leave the main thread: physics broadphase and narrowphase, particle simulation, animation pose evaluation and blending, navmesh queries and path-finding, audio mixing and decode, asset decompression and GPU upload staging, culling and draw-list construction, AI perception and utility scoring. What generally cannot, in most engines: scene graph structural changes (creating and destroying entities), engine API calls not documented as thread-safe (nearly all of Unity's `UnityEngine.*` API, most of Unreal's `UObject` lifecycle), and anything touching the OS input queue or window.

The sync point problem in its practical form: every join costs the latency of the slowest worker plus scheduling overhead, typically 5–50 µs, and worker threads sit idle before it. A frame with eight joins wastes more time waiting than a frame with two joins that each do four times the work. Batch sizes should be large enough that per-batch overhead is under 5% of batch work — for a job costing 20 ns per element, that means batches of at least 256 elements. Profile the gaps between jobs, not just the jobs.

Determinism under threading requires that results not depend on completion order. Accumulating forces into a shared array from parallel workers with atomics produces a different float sum on every run because the addition order varies. The fixes are per-worker accumulation buffers summed in a fixed order afterwards, or partitioning the data so each element is written by exactly one worker. Choose the partition; it is faster and it is deterministic by construction.

## 4. Engine loop anatomy

Names differ; the structure is the same accumulator underneath.

| Engine | Fixed callback | Variable callback | Fixed step setting | Notes |
|---|---|---|---|---|
| Unity | `FixedUpdate` | `Update`, `LateUpdate` | `Time.fixedDeltaTime`, default 0.02 s | Accumulator capped by `Time.maximumDeltaTime`; `Time.inFixedTimeStep` distinguishes context |
| Unreal | Physics substep callbacks; `Tick` in `TG_PrePhysics`…`TG_PostPhysics` groups | `Tick` | `Substepping`, `Max Substep Delta Time`, `Max Substeps` | Tick groups order work within a frame; `bTickEvenWhenPaused` for pause-immune actors |
| Godot | `_physics_process(delta)` | `_process(delta)` | `physics/common/physics_ticks_per_second`, default 60 | `max_physics_steps_per_frame` is the clamp; `physics_jitter_fix` smooths the accumulator against clock jitter |
| Bevy | `FixedUpdate` schedule | `Update` schedule | `Time<Fixed>::timestep`, default 64 Hz | `Time<Virtual>` carries pause and time scale; `Time<Real>` is the wall clock |

Engine-specific traps worth naming. In Unity, `Time.deltaTime` returns `fixedDeltaTime` when read inside `FixedUpdate`, which is correct but surprises code that assumes it always means frame time; `Time.timeScale = 0` stops `FixedUpdate` entirely, so any coroutine yielding on `WaitForFixedUpdate` hangs until unpause; and `Application.targetFrameRate` is ignored in the editor, so pacing conclusions drawn from play mode are worthless.

In Unreal, actor tick order across tick groups is defined but order within a group is not, so systems with an implicit ordering dependency must use tick prerequisites (`AddTickPrerequisiteActor`) rather than hoping. Substepping applies to physics only — actor `Tick` still runs once per frame with a variable delta, so gameplay logic that must be step-rate-correct belongs in a physics callback or in a self-managed accumulator inside the actor.

In Godot, `_physics_process` receives a constant `delta` equal to `1.0 / physics_ticks_per_second`, and `physics_jitter_fix` deliberately nudges reported physics time toward the render clock to hide small clock mismatches — set it to 0 when determinism matters, because the nudge is exactly the coupling this document exists to remove.

## 5. Diagnosing timing bugs

A short decision procedure that resolves most reports.

The bug changes with frame rate. Cap the game to 30, 60 and 144 and compare. Behaviour that differs means simulation is reading frame time somewhere. Search for `deltaTime` inside fixed-step code paths and for damping expressions of the form `x *= k` without a `dt` exponent.

The bug is intermittent and load-correlated. Suspect tunnelling (section 4 of the physics reference) or the clamp discarding steps. Log the number of simulation steps executed per frame; a frame with more than three steps at 60 Hz is a hitch, and a frame that hit the clamp is a discontinuity in simulation time.

Motion looks jerky at high frame rates while the counter reads high. Interpolation is missing or is being applied to the wrong pair of states. Render raw simulation positions as debug spheres alongside the interpolated mesh; if the spheres are smooth and the mesh is not, the alpha is wrong, and if both are stepped, interpolation is not running.

Actions fire twice or are dropped. Input edges are being consumed on the wrong clock. Instrument the edge queue: log tick index and frame index for each consumed edge and look for two ticks in one frame consuming the same edge, or a frame with zero ticks discarding one.

A replay diverges from the live run. Enable per-tick state checksums and bisect to the first divergent tick. The usual culprits, in the order they occur in practice: an RNG call from presentation code sharing the simulation stream, a container iterated in hash order, a wall-clock read, and a transcendental function differing between the recording and playback build configuration.

The game hangs on level load or after alt-tab. The clamp is missing or too large. Confirm by logging accumulator size at the top of each frame; a value that grows monotonically is the spiral.

"It works at 60 but not 144." Almost always one of: zero-simulation-step frames breaking a per-frame assumption, a fixed per-frame damping or accumulation constant, or a physics or animation event system running on the render clock.

The game runs at the wrong speed on one machine and correct speed on another, with no stutter. The accumulator is being fed a delta from a clock with the wrong units or the wrong base — a millisecond timer treated as seconds, a performance counter divided by the wrong frequency, or a platform where the timer frequency is queried once and the CPU then changes frequency state. Print `frameTime` and confirm it averages the reciprocal of the observed frame rate.

Everything freezes on pause except one system, or one system freezes when it should not. The scaled/unscaled split is wrong for that system; check which time source it reads, and on Godot check the node's `process_mode` rather than the code.

Before concluding anything from a profiler capture, take the same capture with the profiler detached and timings written to a log. Attaching a profiler changes frame pacing, particularly around vsync, and a pacing conclusion drawn from an attached session is not evidence.

## 6. Where a fixed timestep is genuinely not the answer

The governing claim has exceptions, and naming them prevents the rule being applied as dogma to projects that pay complexity for nothing.

**Turn-based and event-driven games.** Chess, most tactics games, card games, visual novels and point-and-click adventures have no continuous simulation. The world changes only in response to discrete events, and the correct loop is event-driven: block on input, resolve the turn, animate the result on the render clock, repeat. Introducing an accumulator here adds a background tick that does nothing 99.9% of the time. What these games still need from this document is the presentation half — frame pacing, unscaled UI time, and animation on the render clock.

**Pure simulation with no real-time deadline.** Offline solvers, procedural generation, baked lighting, and headless balance simulations run as fast as they can and have no render clock to decouple from. They still need determinism (see `game-loop-tick-rate-and-determinism.md`) for reproducibility, and they should still express duration in steps rather than seconds.

**Tools and editors.** An editor viewport is a renderer with no simulation. Run it per-frame, throttle it to 30 Hz when unfocused to save battery and thermal budget, and keep the game's fixed loop available as a separate play-in-editor mode rather than as the editor's own loop.

**Physics-free games with trivially linear motion.** A menu, a match-3 board, a slot machine, an infinite runner with scripted lanes — motion is authored curves evaluated at a time parameter, and evaluating a curve at `t` is exact at any frame rate because it is a function rather than an integration. Integrate nothing and there is nothing to make frame-rate-dependent. The moment collision response, acceleration or any feedback loop enters, the exception ends and the fixed step returns.

The line separating the exceptions from the rule is stateful integration. Any system where this frame's state is computed from last frame's state plus a rate belongs on the fixed clock. Any system that recomputes its output from scratch each frame as a function of an authoritative time value does not.

## Pass conditions

Answer yes to every applicable line before the timing layer is considered correct.

1. The build has a frame rate cap on every platform, with vsync or VRR configured deliberately rather than left at engine default.
2. Performance gates measure the 99th-percentile frame interval alongside the mean, and both have documented targets.
3. Parallel accumulation into shared buffers is deterministic by partitioning or by fixed-order reduction, not by atomics on floats.
4. A debug overlay reports simulation steps executed this frame, accumulator size, alpha, time scale and clamp events, and is available in shipping-configuration builds behind a flag.
5. In a networked build, tick rate, snapshot send rate, interpolation delay and maximum rollback depth are documented values with instrumentation, not incidental constants.
6. Client-side prediction replay cost is bounded and measured: the worst-case correction re-simulates a known number of ticks, and that spike fits inside the frame budget.
