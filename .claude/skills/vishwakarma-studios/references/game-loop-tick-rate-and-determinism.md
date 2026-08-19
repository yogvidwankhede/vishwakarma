# Tick rate, scheduling, and determinism

Fixing the simulation on a constant step (covered in `game-loop-fixed-timestep-core.md`) leaves four decisions that the rest of the game is built on: what rate that step runs at, which systems are allowed to stay off it, how gameplay durations are represented, and whether the resulting sequence of states is reproducible. This part covers those, plus the time scale layer that pause, slow motion and hitstop are all expressions of.

## 1. Choosing a tick rate

The choice is driven by four constraints in this order: physics stability, netcode tick, determinism budget, and CPU cost. Name the binding constraint before picking a number.

| Rate | Step | Where it belongs | Binding constraint |
|---|---|---|---|
| 20–30 Hz | 50–33.3 ms | Turn-based, grand strategy, server-authoritative MMO ticks, mobile with heavy simulation | CPU and bandwidth; MMO server tick at 20–30 Hz keeps per-player cost payable across thousands of entities |
| 50 Hz | 20 ms | Unity default; general 3D action games | Historical PAL alignment; adequate for human-scale motion, poor for fast projectiles |
| 60 Hz | 16.67 ms | Most action games, platformers, third-person shooters; the default choice for new projects | Aligns with the common display rate, so alpha is usually near 0 or 1 and interpolation artefacts are minimal |
| 120–128 Hz | 8.33–7.8 ms | Fighting games, competitive shooters, vehicle physics, ragdolls with stiff constraints | Solver stability and input latency; *Rocket League* runs 120 Hz physics, *Valorant* 128 Hz server tick |
| 240 Hz+ | 4.17 ms | Specialist: soft body, cloth, high-stiffness joints | Constraint stiffness demands it; almost always cheaper to substep only the offending system |

Physics cost is linear in tick rate. Moving from 50 Hz to 100 Hz doubles the CPU spent in the solver and roughly doubles contact-generation cost. A common and correct compromise is a 60 Hz gameplay tick with the physics engine internally substepping only the bodies that need it — Unreal's substepping (`bSubstepping`, `MaxSubstepDeltaTime`, `MaxSubsteps`) does exactly this, and it is the right lever when one vehicle needs 240 Hz and 400 crates do not.

Netcode fixes the rate outright when the simulation is authoritative: the server tick and the client prediction tick must be the same number or prediction cannot be verified against authority. Choose the netcode rate first and let the local simulation adopt it, not the other way round. Rollback netcode in fighting games couples the rate to the input delay budget: at 60 Hz, one frame is 16.7 ms, so a 3-frame rollback window is 50 ms of tolerable network latency, and raising the tick rate to 120 Hz halves the wall-clock coverage of the same rollback depth.

Solo: 60 Hz fixed, universally, unless you have a measured reason otherwise. Studio: set the rate from the netcode and physics requirements at pre-production, record it in the technical design document with the constraint that justified it, and treat changing it after vertical slice as a re-tuning pass across every movement, animation-event and gameplay-timer value in the game — because it is.

## 2. Systems that legitimately run per frame

Not everything belongs on the fixed clock. A system belongs on the variable render clock when it has no authority over simulation state and its output is discarded and recomputed each frame.

**Camera.** The camera reads interpolated transforms and produces a view matrix that is consumed only by rendering. Running it at fixed rate makes camera motion stutter at high refresh rates, which is more visible than object stutter because it moves the entire image. Run camera smoothing, boom collision and look-at on the render clock, after simulation, using the interpolated poses. Frame-rate-independent smoothing needs the exponential form: `pos = target + (pos - target) * exp(-rate * dt)`, not `pos = lerp(pos, target, 0.1)`, because the latter converges at a rate proportional to frame rate.

**Input sampling.** Drain the OS event queue every frame at the highest available rate. High-polling-rate mice report at 1,000 Hz; a 60 Hz sample discards 94% of those reports and quantises aim. Accumulate raw mouse deltas per frame, sum them into the tick's snapshot, and keep button edges in a queue so no press is lost between ticks. Sample early in the frame — the interval between sampling and presenting the resulting image is the latency the player feels.

**Animation.** Sample animation clips at render rate and blend them there, because animation is presentation. The exception is animation that drives simulation: root motion, animation-driven hitboxes, and animation events that fire gameplay logic must be evaluated on the fixed clock or they will fire twice on double-step frames and never on zero-step frames. Split the animation system explicitly: pose evaluation on the render clock, event and root-motion extraction on the fixed clock.

**VFX and particles.** Per-frame, with their own clamp. Particle systems integrating with a large `dt` produce visible gaps in trails; Unity's separate `Time.maximumParticleDeltaTime` of 0.03 s exists because clamping particles harder than physics is usually correct.

**Audio.** Runs on its own thread and its own clock, driven by the audio device's sample rate (typically 48 kHz) and buffer size (256–1,024 samples, 5.3–21.3 ms). It does not participate in the game loop at all. Never gate audio on game frames, never scale audio by simulation time scale by default, and expect the audio clock to drift relative to the monotonic clock by tens of parts per million — which matters for rhythm games, where the audio clock is the authoritative timeline and the simulation should read positions from it rather than the reverse.

**UI.** Per-frame, on unscaled time. See section 5.

The test for whether a system belongs on the render clock is one question: if this system did not run for a frame, would the simulation reach a different state? If the answer is no, it is presentation and belongs per-frame. If the answer is yes — root motion moves the character, an animation event applies damage, the camera's position feeds a line-of-sight check — it is simulation and belongs on the fixed clock regardless of which subsystem it nominally lives in. Systems that straddle the line (animation, camera, particles that spawn gameplay hitboxes) are split rather than assigned wholesale, and the split point is where authority over state transfers.

## 3. Timers, cooldowns and scheduling on the fixed clock

Gameplay is largely a scheduling problem — cooldowns, buff durations, spawn intervals, combo windows, animation-triggered damage — and the representation you choose for a timer determines whether the game behaves identically on every machine.

Store durations as tick counts, not as seconds. A 0.75 s cooldown at 60 Hz is 45 ticks, and 45 is exact; 0.75 accumulated by repeated subtraction of 0.016666667 is not, and the residual error means two nominally identical abilities come off cooldown one tick apart after a few minutes of play. Integer tick counters also compare exactly, which removes an entire class of "the window was open but the check said no" bug from frame-perfect combo systems.

```cpp
struct Cooldown { int32_t remainingTicks; };
inline bool ready(const Cooldown& c)  { return c.remainingTicks <= 0; }
inline void tick(Cooldown& c)         { if (c.remainingTicks > 0) --c.remainingTicks; }
inline void trigger(Cooldown& c, int32_t durationTicks) { c.remainingTicks = durationTicks; }
```

Designers author in seconds; convert once at load with `ticks = lround(seconds * TICK_RATE)` and record the rounding in a build report so a 0.7 s value at 60 Hz is visibly 42 ticks rather than silently 41.999. Changing the tick rate after content authoring re-quantises every one of these values, which is the concrete reason section 1 says to fix the rate at pre-production.

Scheduling many timers cheaply: a per-entity countdown decremented every tick costs one integer operation per timer per tick, which at 20,000 timers and 60 Hz is 1.2 M operations per second and entirely acceptable. A timer wheel — an array of buckets indexed by `(currentTick + delay) % wheelSize` — reduces that to touching only the timers that expire, and is worth the complexity above roughly 50,000 concurrent timers or when timers have long delays measured in minutes. Below that threshold the flat array wins on cache behaviour and on debuggability.

Two rules that prevent the common failures. Fire timer expiries in a deterministic order — sort the expiring set by entity id before dispatch, or the order of two abilities coming off cooldown on the same tick varies between runs and breaks replay determinism. And never schedule gameplay work from the render clock: a coroutine or tween that resolves on frame boundaries produces effects whose timing differs between 60 and 144 fps, which is precisely the coupling this document exists to prevent. Unity's `WaitForSeconds` advances on scaled render time and `WaitForFixedUpdate` on the fixed clock; gameplay coroutines use the latter, presentation tweens the former.

## 4. Determinism

Determinism means the same initial state plus the same input sequence produces the same output state, bit for bit, on every run. You need it for replays, deterministic lockstep netcode, rollback prediction, automated soak testing, and reproducing bugs from a report. Retrofitting it is a multi-month project; designing for it costs discipline in a handful of places.

**Seeded RNG, threaded through explicitly.** A single global RNG is not deterministic in the presence of any consumer that samples conditionally on non-simulation state — a particle system, an audio variation picker, an editor tool. Use separate streams: one for simulation (seeded from the match seed, advanced only inside `integrate`), one for presentation (seeded from anything). Store the simulation stream's state in the save and in the replay header. A counter-based generator such as PCG or a splitmix-seeded xoshiro is preferable to `std::mt19937` because you can derive a per-entity stream from `(matchSeed, entityId, tickIndex)` without carrying mutable state, which makes the RNG immune to entity iteration order.

**No wall clock inside the simulation.** `Time.time`, `DateTime.Now`, `FPlatformTime::Seconds()` and `OS.get_ticks_msec()` are inputs the replay does not record. Simulation code that reads them is non-reproducible by construction. Simulation time is `tickIndex * FIXED_DT`, derived from the counter.

**No iteration over unordered containers.** `HashMap`, `Dictionary`, `unordered_map` and pointer-keyed sets have iteration order that depends on hash seeds, insertion history and allocator addresses. Iterating one and accumulating floats produces a different sum on a different run because floating-point addition is not associative. Sort by a stable key (entity id) before any order-sensitive accumulation.

**Float non-determinism across compilers and architectures.** IEEE 754 guarantees that `+`, `-`, `*`, `/` and `sqrt` are correctly rounded, so those are portable if the compiler does not reorder them. What is not portable: `sin`, `cos`, `exp`, `pow` and friends, which come from the platform libm and differ in the last bits between glibc, MSVC's CRT, Apple's libm and Android's bionic; x87 80-bit intermediate precision on 32-bit x86 builds; fused multiply-add contraction, where `a*b+c` compiles to a single FMA with one rounding instead of two on some targets and not others; and any fast-math flag, which authorises the compiler to reassociate arithmetic. The mitigations: compile with `/fp:strict` (MSVC) or `-ffp-contract=off -fno-fast-math` (Clang/GCC), ship your own transcendental implementations built on the guaranteed operations, target SSE2 rather than x87, and forbid `FloatMode.Fast` in Unity Burst jobs that touch simulation state.

**Fixed point when lockstep is required.** Deterministic lockstep across platforms — an RTS with 8 clients simulating 2,000 units, exchanging only inputs — is the case where float determinism cannot be made reliable enough, because a single last-bit divergence in one unit's steering compounds into a completely different battle within thirty seconds. The answer is integer fixed-point maths for all simulation state: Q16.16 (32-bit, range ±32,768, resolution 1.5×10⁻⁵) suits 2D and small 3D worlds; Q32.32 in a 64-bit integer suits large worlds. Trigonometry becomes table lookup with interpolation, square root becomes an integer Newton iteration, and the whole simulation loses the ability to use engine physics, which is why lockstep RTS titles ship with custom simulation layers. Budget this as a subsystem, not as a coding standard.

**Checksum every tick in development.** Hash the simulation state (positions, velocities, RNG state, entity count) every tick, exchange hashes between clients or compare against a recorded replay, and halt on the first mismatch with the tick index. Detecting divergence at tick 4,102 is a debugging session; detecting it after the match desyncs is a forensic archaeology project. Studio: run this in every internal build and gate merges on a replay-determinism test in CI. Solo: run it in development builds and keep it behind a flag.

## 5. Time scale, pause, slow motion, and hitstop

Time scale is a multiplier applied to the simulation clock's consumption of real time, not to the fixed step itself. The correct implementation scales what enters the accumulator and leaves `FIXED_DT` untouched:

```cpp
accumulator += frameTime * timeScale;      // correct: step size unchanged
// wrong: integrate(current, FIXED_DT * timeScale) — changes numerical behaviour
```

Scaling the step size changes integration error, solver stability and every damping coefficient, so slow motion becomes a subtly different physical world with different friction and different joint behaviour. Scaling the accumulator input changes only how often steps occur, so half speed is the identical simulation running at half the rate — which is what the designer asked for.

At `timeScale = 0` the inner loop never runs, the world is frozen, and everything on the fixed clock stops. That is the desired behaviour for pause, and it immediately exposes what must not be scaled.

| System | Scaled by time scale? | Reason |
|---|---|---|
| Physics, gameplay logic, AI, cooldowns | Yes | They are the simulation |
| UI animation, menu transitions, loading spinners | No | A paused menu that does not animate reads as a crash |
| Input sampling | No | Runs on the render clock; latching still happens per tick, so pause naturally stops consumption |
| Audio | No, by default | Pitch-shifting all audio at 0.5× is an effect, not a pause; music and UI sounds continue |
| Camera smoothing | Usually no | Slow-motion camera that also slows its own smoothing feels sluggish rather than dramatic |
| Particle systems tied to gameplay | Yes | Freezing the world but not the explosion looks broken |
| Frame pacing, telemetry, network keepalives | No | They live on the wall clock |

Engines expose the split directly: Unity has `Time.deltaTime` versus `Time.unscaledDeltaTime` (and `Time.fixedUnscaledDeltaTime`), Unreal has `GetWorldDeltaSeconds` versus `App::GetDeltaTime` plus `CustomTimeDilation` per actor, Godot has `Engine.time_scale` with per-node `process_mode` values including `PROCESS_MODE_ALWAYS` for nodes that ignore pause. The failure mode is uniform across all three: a UI or audio system written against scaled time that freezes with the world.

**Hitstop** is a time-domain effect, not an animation. On impact, set `timeScale` to 0 or 0.05 for 3–8 frames of real time (50–130 ms), then restore. The mechanism that makes it read as impact is that the player's input continues to be sampled while the world does not advance, so the pause is legible as force rather than as a stall. Two refinements matter: apply it locally where possible — per-actor time dilation on the attacker and victim only, so the rest of the world keeps moving — and drive the duration from real time, not from simulation ticks, or hitstop at `timeScale = 0` never ends. Fighting games typically use 4–16 frames scaled by hit strength; character action games use 2–6 frames plus a camera shake and a brief zoom.

**Per-entity time scale** (bullet time affecting enemies but not the player, a slow field, a haste buff) requires the simulation to carry a scale per entity and each entity to integrate with `FIXED_DT * entityScale`. This reintroduces variable step per entity and therefore reintroduces the numerical concerns of the accumulator in `game-loop-fixed-timestep-core.md` for those entities specifically. Keep the per-entity scale to a small set of discrete values (0.25, 0.5, 1.0, 2.0) so behaviour is testable, and keep physics bodies out of it — scale their applied forces and animation rates instead, and let the solver run at the global rate.

## Pass conditions

Answer yes to every applicable line before the timing layer is considered correct.

1. The simulation tick rate is recorded with the constraint that determined it (netcode rate, solver stability, or CPU budget), not chosen by default.
2. All simulation randomness comes from a seeded stream whose state is serialised into saves and replay headers; presentation randomness uses a separate stream.
3. No simulation code path reads a wall-clock or frame-count API; simulation time is derived from the tick counter.
4. No order-sensitive float accumulation iterates an unordered container or a pointer-keyed set.
5. Simulation builds compile with strict floating point (`/fp:strict`, or `-ffp-contract=off -fno-fast-math`), and Burst jobs touching simulation state do not use fast float mode.
6. Time scale is applied to accumulator input, not to the fixed step size.
7. UI, menu animation, audio, input sampling and frame pacing run on unscaled time, verified by pausing the game and confirming the menu still animates.
8. Hitstop duration is driven by real time, so it terminates while time scale is zero.
9. A per-tick simulation checksum runs in development builds, and a replay-determinism test runs in CI on every merge.
10. Gameplay durations are stored as integer tick counts, converted from designer-authored seconds once at load, with the rounding recorded in a build report.
11. Timer expiries dispatch in a deterministic order (sorted by a stable key), not in container or completion order.
