# Game loop and time: the fixed timestep core

A game is a simulation with a deadline. Each frame you sample input, advance the world, and present an image before the display asks for one, and the whole discipline of game timing follows from the fact that those three activities want to run at different rates and on different clocks. Almost every timing bug in a shipped game traces to one root cause: the simulation rate was coupled to the render rate, so the world's behaviour became a function of the hardware it ran on. The structural fix costs an afternoon on day one and costs a rewrite in month eighteen, because by then gameplay code has absorbed the assumption that `dt` is whatever the last frame happened to take.

## 1. The three clocks and why they must be separate

There are three independent time sources in any real-time game and confusing them is the origin of most of what follows.

| Clock | Rate | Governs | Consequence of coupling it to the others |
|---|---|---|---|
| Simulation clock | Fixed, chosen by you (30/50/60/120 Hz) | Physics, gameplay rules, netcode ticks, AI decisions | Behaviour becomes hardware-dependent; replays and netcode desync |
| Render clock | Variable, driven by the display and GPU | Camera, animation sampling, VFX, interpolated presentation | Simulation stutters or runs at wrong speed on unusual refresh rates |
| Wall clock | Real time, monotonic | Frame pacing, telemetry, timeouts, session length | Simulation becomes non-reproducible; save-scumming and speed hacks become trivial |

The simulation clock is a counter of steps, not a measurement of seconds. Step 1,800 is 30 seconds into a 60 Hz simulation by definition, regardless of how long the machine took to compute it. The render clock is a measurement, not a counter. The wall clock is an input to pacing decisions and never an input to simulation state. Once you internalise that the simulation advances in discrete integer steps and rendering samples that discrete sequence at arbitrary real times, the accumulator, the interpolation alpha, and the determinism rules all fall out as consequences rather than as separate techniques.

Use a monotonic clock for all of this. `std::chrono::steady_clock`, `QueryPerformanceCounter`, `mach_absolute_time`, `clock_gettime(CLOCK_MONOTONIC)`. A wall-clock source such as `time()` or `DateTime.Now` can move backwards on NTP correction or a user changing the system clock, which produces a negative frame delta, which produces a negative `dt`, which produces objects moving backwards through walls. This is a real shipped bug in more than one title.

## 2. Frame budget arithmetic

Every decision below is made against a budget, so fix the numbers before the architecture. The budget is the presentation interval minus what the platform takes from you, and it is spent by the main thread, the render thread and the GPU concurrently — each of which must independently fit.

| Target | Interval | Realistic main-thread budget | Typical platform |
|---|---|---|---|
| 30 fps | 33.3 ms | 26–29 ms | Low-end mobile, current-gen console quality mode |
| 60 fps | 16.67 ms | 13–15 ms | Console performance mode, mid-range PC, desktop default |
| 90 fps | 11.1 ms | 8–9 ms | Quest-class standalone XR |
| 120 fps | 8.33 ms | 6–7 ms | Competitive PC, 120 Hz console mode |
| 144+ fps | ≤6.94 ms | 5 ms | Enthusiast PC; assume no headroom for anything unoptimised |

The gap between the interval and the budget is the operating system, the compositor, the driver's present call, and the safety margin you need so that the 99th percentile frame still fits. Budgeting to the full interval guarantees dropped frames, because frame cost is a distribution and you are targeting its mean.

Allocate the budget explicitly as a written split — a workable default for a 60 fps action game is 3 ms simulation and physics, 2 ms animation, 2 ms gameplay scripts, 4 ms render submission and culling, 2 ms audio, streaming and miscellaneous, and 2 ms reserve. Each number becomes a profiler assertion. Without the split, every system takes as much as it wants and the overrun is discovered at the end of production when there is no time to fix it.

Two arithmetic facts worth carrying. A cost of 1 µs per object per frame is 1 ms at 1,000 objects and 10 ms at 10,000, so the per-object constant determines your entity ceiling more than the algorithm does. And a system that runs at 60 Hz costs sixty times per second what it costs per invocation, so a 0.2 ms system is 12 ms of every second — meaningful on a thermal budget even when it is invisible in a frame graph.

Studio: publish the split, instrument each bucket with a named profiler marker, and fail CI when a bucket exceeds its allocation on the reference device. Solo: pick a target rate, measure total frame time on the weakest device you intend to support, and check it monthly rather than at the end.

## 3. The fixed-timestep accumulator

This is the load-bearing structure. Written out with nothing elided:

```cpp
const double FIXED_DT      = 1.0 / 60.0;   // simulation step, seconds
const double MAX_FRAME_TIME = 0.25;        // clamp; see section 5

double accumulator = 0.0;
double previousTime = now();               // monotonic seconds
State previous = current;                  // for interpolation

while (running) {
    double currentTime = now();
    double frameTime   = currentTime - previousTime;
    previousTime       = currentTime;

    if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME;
    accumulator += frameTime;

    pollInputEvents();                     // drain OS queue every frame

    while (accumulator >= FIXED_DT) {
        previous = current;                // keep last two states
        latchInputForTick();               // freeze input for this tick
        integrate(current, FIXED_DT);      // the only place the world changes
        accumulator -= FIXED_DT;
        ++tickIndex;
    }

    const double alpha = accumulator / FIXED_DT;   // in [0, 1)
    renderInterpolated(previous, current, alpha);
}
```

Four properties make this correct and each is worth stating as a mechanism rather than a rule.

`integrate` receives a compile-time-constant `dt`. Every velocity, acceleration, damping coefficient, cooldown and animation-event timer in the game is therefore evaluated against the same number on every machine, so the sequence of world states is a pure function of the initial state and the input stream. That is the definition of reproducibility, and it is what makes replays, deterministic netcode, and bug reproduction from a seed possible at all.

The inner `while` can execute zero times on a fast frame and several times on a slow one. Zero executions is correct and normal: at 144 Hz display with a 60 Hz simulation, roughly 58% of frames run zero simulation steps and simply re-render the same pair of states at a new alpha. Code that assumes "one tick per frame" breaks here first, usually as input edges consumed twice or missed entirely.

`accumulator` carries the sub-step remainder forward, so the simulation never drifts relative to real time. Over 10 minutes of a 60 Hz simulation the total step count is 36,000 ± 1, regardless of frame rate variation.

Input is drained from the OS every frame but latched per tick. On a frame with two simulation steps, both steps must see a coherent input snapshot rather than the same "button was pressed this frame" edge twice. Edge-triggered actions (jump, fire, dodge) belong in a per-tick queue that a tick consumes and clears; level-triggered actions (movement axis, aim) are sampled into the tick's snapshot. Consuming a jump edge twice is the single most common bug produced by adopting an accumulator without fixing input.

## 4. Why `dt = lastFrameTime` is wrong

Variable timestep integration — feeding the previous frame's measured duration into the simulation — fails in three separate ways, and each one bites at a different stage of production.

**It is not reproducible.** Frame durations are a function of CPU scheduling, GPU load, thermal state, background processes and driver behaviour. Two runs of the same input sequence on the same machine produce different `dt` sequences and therefore different world states. A bug that requires a specific float value to reproduce becomes unreproducible, and every replay, killcam and deterministic netcode feature becomes impossible. This is the cost that shows up in month twelve when someone asks for replays.

**It tunnels.** Displacement per step is `velocity × dt`. A projectile at 200 m/s with a 0.02 m thick collider passes through it whenever `dt > 0.0001 s`, which is every frame. At a stable 60 fps the same projectile moves 3.33 m per step; on a frame that took 100 ms it moves 20 m in one step, and any collider thinner than 20 m along that path is skipped entirely because discrete collision detection only tests the endpoints. Variable `dt` makes the tunnelling threshold itself variable, so the bug is intermittent and correlates with load, which is the worst possible debugging profile.

**Behaviour changes with hardware.** Numerical integration error is a function of step size. Explicit Euler on a spring with stiffness `k` and step `h` is stable only while `h < 2/sqrt(k/m)`; exceed it and the spring gains energy every step and explodes. With variable `dt` your ragdolls, suspension, cloth and camera springs are stable on the test machine and divergent on a slower one. Damping compounds the same way: `v *= 0.9` per frame is a half-life of 6.6 frames, which is 110 ms at 60 fps and 55 ms at 120 fps — the same code produces twice the friction on a machine that runs twice as fast. Even correctly written damping (`v *= pow(0.9, dt * 60)`) differs numerically between step sizes because `pow` is not exactly composable in floating point.

The historical footprint of this failure is large enough to be a genre of anecdote: physics tied to frame rate in *Quake III* affecting jump heights at specific fps values, *Skyrim* and *Fallout 76* physics destabilising above 60 fps, *Dark Souls II* weapon degradation running at double rate at 60 fps because durability decremented per frame. In every case the fix was the same and the cost was that it came after ship.

The narrow legitimate use of variable `dt` is systems that are purely presentational and have no effect on simulation state — covered in section 6.

## 5. The spiral of death and the max-frame-time clamp

Without the clamp, the accumulator has a positive feedback loop. If one simulation step costs more wall-clock time than the fixed step represents, the accumulator grows faster than the inner loop drains it. Next frame more steps are required, which costs more time, which grows the accumulator further. Within a handful of frames the inner `while` never terminates and the process appears hung with the CPU pegged. This is the spiral of death, and it is not a rare edge case: a level load, a shader compile stall, an alt-tab, a debugger breakpoint, a laptop lid close, or a garbage collection pause all inject a multi-second frame time that starts it.

The clamp is one line and it converts an unbounded hang into bounded slow motion:

```cpp
if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME;
```

Choose `MAX_FRAME_TIME` as the largest catch-up you are willing to pay in one frame. At 60 Hz simulation, 0.25 s permits 15 steps in one frame; if a step costs 1 ms that is 15 ms of catch-up, which fits inside a frame budget. A value of 0.25 s is the common default and the one to start from. Lower it to 0.1 s (6 steps) if simulation steps are expensive — a heavy physics scene at 3–5 ms per step cannot afford 15 catch-up steps and will itself trigger the spiral it is trying to avoid. Raise it above 0.25 s only when the simulation step is provably sub-100 µs and you genuinely want the world to keep real-time alignment across a stall.

What the clamp actually does is discard simulation time. The world falls behind wall-clock by the discarded amount and never catches up, which is correct: a game that hitched for 3 seconds should not fast-forward 180 physics steps and teleport every enemy across the room. Slow motion during a hitch is the desired failure mode; a hang is not, and a teleport is not.

Engine expressions of exactly this clamp:

| Engine | Setting | Default | Notes |
|---|---|---|---|
| Unity | `Time.maximumDeltaTime` | 0.333 s | Caps catch-up `FixedUpdate` steps; set to 0.1 s in shipping builds |
| Unity | `Time.maximumParticleDeltaTime` | 0.03 s | Separate clamp for particle simulation |
| Unreal | `t.MaxFixedDeltaTime` / `Max Physics Delta Time` | 0.0333 s | Applies when substepping is enabled |
| Godot | `Physics Jitter Fix`, `max_physics_steps_per_frame` | 0.5, 8 | `max_physics_steps_per_frame` is the direct analogue of the clamp |

Studio: put the clamp value in a config asset, log a warning whenever it triggers, and count clamp events in telemetry. A rising clamp rate on a specific SKU is your earliest signal that a level has exceeded budget on that hardware. Solo: set it once, log it to console, and move on.

## 6. Render interpolation and the alpha blend

With a fixed 60 Hz simulation on a 144 Hz display, rendering the raw simulation state means each simulated pose is shown for one, two or three refreshes in an irregular pattern. Objects moving at constant velocity therefore appear to move in uneven jumps: the position error against a smooth trajectory is up to one full step of motion, which for a character at 6 m/s at 60 Hz is 10 cm — plainly visible, and read by players as "the game stutters" even when the frame rate counter says 144.

The correction is to render between the last two simulation states rather than at the latest one:

```cpp
Transform render;
render.position = lerp(previous.position, current.position, alpha);
render.rotation = slerp(previous.rotation, current.rotation, alpha);
```

`alpha` is `accumulator / FIXED_DT` after the inner loop, in `[0, 1)`. This renders the world up to one simulation step in the past — 16.7 ms at 60 Hz — in exchange for continuous motion at any refresh rate. That latency is real and is the reason competitive shooters sometimes render extrapolated rather than interpolated local player state while interpolating everything else.

Three rules keep interpolation from producing its own artefacts. Interpolate rotation with `slerp` or normalised `lerp`, not component-wise on Euler angles, or a body crossing 359° to 1° spins the long way around at high speed. Skip interpolation on the frame after a teleport, respawn or camera cut by copying `current` into `previous`, or the object visibly streaks across the level. And keep the interpolated transform out of the simulation: write it to the render transform only, never back into the authoritative state, or you have reintroduced frame-rate dependence through the back door.

Extrapolation — projecting forward from current velocity by `alpha × FIXED_DT` — removes the latency and adds overshoot. Every collision produces a visible penetration followed by a snap-back, because the extrapolated position assumed a velocity the collision then cancelled. Use extrapolation for the local player only when input latency is the dominant quality metric (competitive shooters, fighting games), and interpolation for everything else. Unity exposes both as `RigidbodyInterpolation.Interpolate` and `.Extrapolate`; Godot exposes 3D physics interpolation as a project setting from 4.3 and 2D from 4.4; Unreal interpolates through its own substepping and smoothing on `USkeletalMeshComponent` and the character movement component.

Solo: enable engine-provided interpolation on the player, camera target, and anything the camera follows closely. Studio: interpolate everything with a visible transform, and add a debug view that renders raw simulation state in wireframe alongside the interpolated mesh so that mismatches are diagnosable rather than mysterious.

## Pass conditions

Answer yes to every applicable line before the timing layer is considered correct.

1. Simulation state is advanced only inside a fixed-step function that receives a compile-time-constant `dt`; no simulation code reads a measured frame duration.
2. The accumulator loop clamps incoming frame time to a documented maximum (0.1–0.25 s), and the clamp value is in configuration rather than inline.
3. Clamp activations are counted and logged; a build that spirals is detectable from telemetry rather than from a player report.
4. Rendering interpolates between the two most recent simulation states using `alpha = accumulator / FIXED_DT`, with `slerp` or normalised `lerp` for rotation.
5. Teleports, respawns and camera cuts suppress interpolation for one frame by copying current state into previous.
6. Interpolated transforms are written only to render state and never read back into simulation state.
7. Input edges are queued and consumed exactly once per tick; a frame executing two ticks does not consume the same edge twice, verified by a test.
8. Raw input is drained from the OS every frame, not once per simulation tick.
9. All time measurement uses a monotonic clock; no code path derives a frame delta from a wall-clock or calendar API.
10. The per-frame budget is written down as a split across named subsystems, each instrumented with a profiler marker, and measured on the weakest supported device.
