# Networked physics, determinism, debugging and budgets

Replicating and reproducing a simulation, and the engine-specific, diagnostic and budgetary facts that decide how much physics a frame can hold — including where the right answer is not to use the physics engine at all. The mechanics being replicated and budgeted are covered in the sibling physics files.

## 1. Networked physics

Physics and networking interact badly, and knowing which of the three models applies prevents an architecture that cannot be made to work.

**Server-authoritative with client prediction.** The server simulates, clients predict locally and reconcile on correction. This requires the client's physics to match the server's closely enough that corrections are small and rare, which requires identical fixed timesteps, identical solver settings, and enough determinism that the same inputs give near-identical results. Prediction of the local character is tractable; prediction of a scene full of interacting rigid bodies is not, because a small divergence in one contact propagates through the stack.

**Server-authoritative without prediction.** The server simulates and clients interpolate received transforms with no local physics. Simple, correct, and adds a full round trip of latency to every physics interaction. Correct for objects the player does not directly control — destructible debris, doors, crates — and for that category it is nearly always the right answer.

**Distributed authority.** Each client simulates the objects near it and replicates results to others, with handover when ownership changes. Cheap and scalable, and it accepts that two clients briefly disagree. This is what most physics-heavy multiplayer games actually ship, and the engineering is in the handover: pick an owner deterministically (nearest player, or last toucher), transfer with a state snapshot plus velocity, and freeze or blend during the transfer window to hide the discontinuity.

The general rules regardless of model. Replicate transforms and velocities, not forces — forces applied on a different tick produce a different result. Quantise before sending: position at 1 cm resolution and velocity at 1 cm/s costs a fraction of full floats and is below perceptual threshold. Snap rather than blend when the error exceeds a threshold (0.5–1 m is typical), and blend below it over 100–200 ms, because a slow correction of a large error is more visible than an instant one. And keep the count of physics-replicated objects small and explicit — replicating 500 crates is bandwidth spent on things nobody is looking at.

## 2. Determinism in physics

Physics determinism means the same initial state and the same inputs produce bit-identical results on every run. It is required for lockstep networking, replay, and reproducible bug reports, and it is harder in physics than in gameplay code because the engine's internals are outside your control.

What breaks it, in order of how often it is the cause.

**Variable timestep.** Covered in the game loop reference; it is the first thing to eliminate and it makes determinism impossible on its own.

**Iteration order over contacts and bodies.** Solvers accumulate impulses in the order they iterate constraints, and floating-point addition is not associative, so a different order produces different results. Engines that parallelise the solver introduce order variation across runs unless they explicitly partition deterministically. PhysX is deterministic within the same binary, same platform and same scene construction order — and adding bodies in a different order changes the results.

**Multithreading without deterministic partitioning.** Work-stealing schedulers vary the order of accumulation between runs on the same machine. Engines offering deterministic modes (Unreal's `Enable Enhanced Determinism`, Jolt's deterministic guarantee within a platform, Rapier's `enhanced-determinism` feature) do so by constraining the parallelism.

**Cross-platform floating point.** Transcendental functions, FMA contraction, x87 versus SSE, and compiler optimisation levels all differ. No mainstream physics engine claims cross-architecture bit-determinism. Rapier's `enhanced-determinism` claims cross-platform determinism only across platforms with IEEE 754-compliant, non-contracted arithmetic, which in practice means matching compiler flags and avoiding libm.

**Scene construction order and object destruction.** Bodies added in a different order occupy different internal indices, which changes solver iteration order. Deterministic replay therefore requires deterministic spawn order, which requires deterministic gameplay above it.

**Sleeping and wake order.** A body that sleeps on one run and stays marginally awake on another diverges immediately, because a sleeping body contributes nothing to the solver's accumulation. Determinism-critical scenes either disable sleeping for the bodies that matter or accept that the sleep threshold is part of the simulation state that must match.

**Time-based rather than step-based logic.** Any physics-adjacent code reading elapsed seconds rather than counting steps reintroduces the wall clock. This includes force ramps, timed impulses and cooldowns implemented in a physics callback.

The workable positions. Same-binary, same-platform determinism is achievable with a fixed timestep, single-threaded or deterministically partitioned solving, and controlled construction order; this is enough for replays and for client-side prediction where the server is authoritative. Cross-platform bit-determinism with a stock engine is not achievable, and lockstep designs that need it use a custom fixed-point simulation instead — see the game loop reference, section 10.

## 3. Engine specifics

| Engine | Physics backend | Notes that change decisions |
|---|---|---|
| Unity | PhysX 4.1 (3D), Box2D (2D); Unity Physics and Havok available for DOTS | `FixedUpdate` at 50 Hz default; `Time.maximumDeltaTime` caps catch-up; `Physics.autoSyncTransforms` is false by default, so a raycast immediately after a `transform` write may hit the stale pose unless `Physics.SyncTransforms()` is called |
| Unreal 5 | Chaos (PhysX removed after UE4) | Substepping via `bSubstepping`, `MaxSubstepDeltaTime`, `MaxSubsteps`; Chaos supports rigid bodies, cloth, destruction and vehicles in one system; `Enable Enhanced Determinism` constrains threading; async physics tick available for decoupling physics from game tick |
| Godot 4.4+ | Jolt (integrated as the default 3D backend, replacing the in-house engine) | `_physics_process` at 60 Hz default; Jolt brings substantially better stacking, ragdoll and vehicle behaviour than the previous default; older projects migrating should re-tune, as contact and friction behaviour differs |
| Box2D (v3) | Standalone 2D | Rewritten for SIMD-friendly SoA layout; speculative contacts by default, which removes most 2D tunnelling without explicit CCD; the reference for 2D and the backend behind many 2D engines |
| Jolt | Standalone C++, used by *Horizon Forbidden West* | Multicore by design with deterministic partitioning; explicit broadphase layers and object layers; strong at large stacks and ragdolls; permissive licence |
| Rapier | Standalone Rust, 2D and 3D | Integrates with Bevy; `enhanced-determinism` feature for cross-platform determinism under matched arithmetic; younger ecosystem |
| PhysX 5 | Standalone, NVIDIA | GPU rigid body and particle simulation; used directly by custom engines; the source of most terminology in this document |

Two migration notes with real cost. Unity projects moving from PhysX to Unity Physics for DOTS get a different solver with different contact behaviour, so every tuned value — friction, restitution, joint drives, character parameters — needs re-tuning; budget it as a re-tuning pass rather than a port. Godot projects moving from the legacy backend to Jolt get better behaviour and different numbers, and any gameplay tuned around the old backend's quirks will need adjustment.

## 4. Debugging

A procedure that resolves most physics reports, in the order the checks are cheapest.

**Visualise colliders first.** More physics bugs are a mismatch between the visual mesh and the collision shape than are anything else, and the mismatch is invisible until drawn. Unity's Physics Debug window and gizmos, Unreal's `show Collision` and `pxvis collision`, Godot's Debug > Visible Collision Shapes. Draw contact points and contact normals as well as shapes — a normal pointing the wrong way explains a great deal.

**Freeze-frame and step.** Pause the simulation and advance one physics step at a time (`Physics.Simulate` with autoSimulation off in Unity, `pause` plus `slomo` or the physics debugger in Unreal, breakpoints in `_physics_process` in Godot). Watching penetration develop over three steps identifies whether the problem is at contact generation, at solving, or at integration. A bug visible only in real time is a bug you are guessing about.

**Log the numbers, not the impressions.** Per-step velocity, position delta, contact count, contact impulse, and whether the body is asleep. "It jitters" becomes "contact count oscillates between 2 and 4 and the impulse changes sign each step", which is a solvable problem.

**"It works at 60 but not at 144."** The classic diagnosis, and it has a small set of causes. Force applied per frame rather than per fixed step, so a higher frame rate applies more force per second. Input read in `Update` and consumed in `FixedUpdate`, so edges are lost or doubled. A per-frame velocity write competing with the solver. Or interpolation disabled, so the visual is sampling the simulation at the wrong rate and the report is about rendering rather than physics. Reproduce with a hard frame cap at 30, 60 and 144, and compare a logged per-step trace across all three — if the traces are identical and only the visuals differ, the bug is in presentation.

**Objects fall through the floor.** Compute `|v| × dt` and compare against the floor's collision thickness before touching anything else. If it exceeds, the answer is the continuous collision detection section of physics-step-broadphase-and-queries.md, not a solver setting.

**Objects jitter at rest.** Check mass ratios against contacting bodies, then sleep thresholds, then whether something writes velocity or position every frame, then solver iterations. In that order — solver iterations are the last resort and the least often correct.

**A character sticks on walls or ledges.** Check the skin width, then the number of slide iterations, then whether depenetration is running and in which direction it pushes. A character that stops dead against a wall while moving diagonally is not projecting residual displacement onto the contact plane.

**A body explodes on spawn or on activation.** Two colliders were created overlapping, and the solver resolved a large penetration in one step. Check the rest pose for overlaps, and check whether the spawn position was set before or after the collider was enabled — setting the transform after enabling gives the physics scene one step at the origin, where everything else spawned that frame also is.

**A trigger fires twice, or never fires.** Check whether the object crossed the trigger in one step (tunnelling applies to triggers exactly as it does to contacts, and a fast object passes through a thin trigger unnoticed), then whether the object was deactivated inside the volume, then whether both objects have the flags the engine requires for trigger events — most engines require at least one of the pair to be a non-kinematic rigid body, and a pair of static colliders generates nothing.

**Physics cost spiked and nothing changed.** Check the awake body count first. A single script writing to a body every frame keeps it awake, and if that body is in a stack it keeps the whole stack awake.

## 5. Budgets

Numbers to design against rather than discover.

| Target | Physics budget per frame | Practical body count (awake, simple shapes) |
|---|---|---|
| Low-end mobile, 30 fps | 2–3 ms | 50–150 |
| High-end mobile and Switch, 30 fps | 3–5 ms | 200–500 |
| Console and desktop, 60 fps | 2–4 ms | 500–2,000 |
| Console and desktop, 30 fps quality mode | 5–8 ms | 1,500–5,000 |
| XR, 90 fps | 1–2 ms | 100–300 |

Shape cost ordering, which is the largest single lever after body count: sphere is cheapest, then capsule, then box, then convex hull (keep under 32–64 vertices; the hull generator's vertex limit is a tuning parameter and the cost is roughly quadratic in vertex count for some tests), then a static triangle mesh, then a non-convex mesh approximated by a convex decomposition. A dynamic body with a mesh collider is either impossible or extremely expensive depending on the engine, and the presence of one in a scene is almost always an authoring mistake — replace it with a compound of primitives, which is both cheaper and more stable.

Two structural levers matter more than any per-body tuning once a scene is large. Merge static geometry into as few collision objects as the level tooling permits — 400 individual static box colliders and one merged static mesh contain the same surfaces, but the merged version occupies one BVH leaf hierarchy built once instead of 400 broadphase proxies. And cull by distance: bodies beyond the gameplay-relevant radius should be disabled or converted to a cheap proxy rather than simulated, because a body 400 m from the player costs the same as one in front of it. Streaming systems get this for free by unloading the geometry; open-world games without streaming need an explicit physics activation radius, typically 60–150 m.

Compound colliders of 3–8 primitives are the standard representation for a complex prop and cost far less than any mesh approximation. Terrain gets a heightfield collider, which is a specialised structure with O(1) lookup by grid cell rather than a general mesh. And keep collision geometry separate from render geometry in the asset pipeline, with a validation step that flags any dynamic body whose collider is a mesh.

## 6. When not to use the physics engine at all

The engine is a general solver, and a general solver is the wrong tool whenever the answer is known analytically or the behaviour is authored rather than emergent.

**Projectiles with known trajectories.** A grenade arc under constant gravity is a closed-form parabola; sampling it and raycasting between samples is exact, cheaper than simulation, and trivially networkable because the whole trajectory is derivable from the launch parameters. Simulate only when bounces off arbitrary geometry are gameplay-relevant.

**Scripted and animated motion.** A platform on a timed loop, a door, an elevator, a moving hazard. These are kinematic bodies driven by a curve. Giving them mass and driving them with forces converts an exactly authored motion into an approximately achieved one, and introduces the possibility of the platform being pushed off its path by the player standing on it.

**Character movement, mostly.** The whole argument of the character controller section of physics-character-controllers-and-scale.md. The physics engine provides sweeps and overlap queries, which is what a controller needs; it should not provide the integration.

**Cosmetic secondary motion.** Hair, cloth accessories, antennae, chains hanging from a belt. A per-bone spring solved in the animation system costs a few microseconds and never explodes; the same motion as jointed rigid bodies costs 10–50x and introduces a body that can be hit, slept, or wedged in geometry. Use the dedicated cloth or bone-dynamics system, or write a simple verlet chain.

**Large-scale destruction.** Simulating 5,000 fragments as rigid bodies does not fit any budget. The shipped approach is a small number of simulated hero pieces plus a much larger number of particle or vertex-animated fragments that are not simulated at all, with the transition hidden by the impact effect.

**Anything the player must be able to rely on precisely.** Puzzle mechanics, competitive movement tech, timing-critical platform sequences. Solver output is approximate and varies with load; a mechanic whose correctness depends on an exact contact response will produce a bug report from someone playing at a different frame rate. Make the critical part analytic and let physics handle the decoration around it.

## Pass conditions

Answer yes to every applicable line before the physics layer is considered correct.

1. Awake body count is visible in a debug overlay and is inside the documented budget during representative gameplay.
2. Physics step time is measured on the lowest supported target device and is inside the documented per-frame budget.
3. No dynamic body uses a non-convex mesh collider; a validation step flags any that appear.
4. Collider visualisation, contact point and normal drawing, and single-step advancement are available in development builds.
5. A physics determinism test — same seed, same inputs, identical resulting state on the same binary and platform — runs in CI if the game requires replay, rollback or lockstep.
6. Any behaviour reported as frame-rate dependent has been reproduced under hard caps at 30, 60 and 144 with a logged per-step trace before a fix is attempted.
7. The networked physics model is one of the three named in section 1, chosen explicitly, with the set of physics-replicated objects enumerated rather than open-ended.
8. Networked physics replicates transforms and velocities rather than forces, quantised, with documented snap and blend thresholds.
9. Secondary cosmetic motion (hair, cloth, chains) uses a dedicated solver or spring chain rather than jointed rigid bodies.
10. Gameplay-critical mechanics do not depend on exact solver output; the precise part is analytic and physics is decorative around it.
11. An open-world or large-level project has an explicit physics activation radius, and bodies outside it are disabled rather than simulated.
