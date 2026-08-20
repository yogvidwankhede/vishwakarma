# Physics step, broadphase, filtering and queries

A physics engine is an approximation with knobs, not a simulation of reality. It integrates rigid bodies at a discrete timestep, resolves interpenetration with an iterative solver that stops before convergence, and accepts visible error in exchange for fitting inside a frame budget. Almost every physics bug reported as "the solver is wrong" is actually a timestep problem or a scale problem: a body moved further in one step than a collider is thick, or the world was authored at a scale where gravity and mass ratios push the solver outside the range its tolerances were tuned for. Diagnose in that order — timestep, then scale, then layers and filtering, then solver settings — and the solver itself will rarely be the answer.

## 1. What a physics step actually does

The sequence inside one step, because the cost profile and the failure modes are both attached to specific stages.

| Stage | Work | Typical share of step cost |
|---|---|---|
| Integrate velocities | Apply gravity and external forces; `v += a·dt` | < 5% |
| Broadphase | Find candidate overlapping pairs from bounding volumes | 10–25% |
| Narrowphase | Exact intersection tests on candidate pairs; generate contact manifolds | 25–45% |
| Solver | Iteratively resolve contacts and joints into impulses | 30–50% |
| Integrate positions | `p += v·dt`; write transforms back | < 10% |
| Query and callback dispatch | Triggers, raycasts, contact events | Varies; can dominate if misused |

Two consequences follow immediately. Reducing the number of candidate pairs (broadphase filtering, layers, sleeping) attacks the largest controllable cost, because it removes work from three stages at once. And solver iteration count trades directly against stability — every additional iteration is a linear cost increase for a diminishing reduction in constraint error.

Sleeping deserves naming here because it is the single largest saving in a scene with many static-ish bodies. A body whose linear and angular velocity stay under a threshold for a period (Unity's defaults are a sleep threshold expressed as kinetic energy per unit mass, PhysX using roughly 0.005 in normalised units, over about 0.5 s) is removed from simulation until touched. A 5,000-crate warehouse costs almost nothing when the crates are asleep and costs 8–15 ms when a design decision — a constant tiny force, a vibrating platform, a script writing velocity each frame — keeps them awake. Check the sleeping count before optimising anything else.

## 2. Broadphase and spatial partitioning

Testing every pair is O(n²): 5,000 colliders is 12.5 million pairs, which no narrowphase can afford. The broadphase reduces that to a candidate set using bounding volumes, and the structure chosen determines the cost profile under different scene shapes.

| Structure | Build cost | Query cost | Update cost on movement | Best for |
|---|---|---|---|---|
| Uniform grid | O(n) | O(1) per cell lookup | O(1) re-bucket | Uniformly sized objects in a bounded world; 2D games, tile worlds |
| Hierarchical grid / spatial hash | O(n) | Near O(1) | O(1) | Mixed sizes, unbounded worlds; avoids the "one huge object in every cell" failure |
| Sweep and prune (SAP) | O(n log n) initial sort | O(1) amortised for incremental updates | Very cheap for small motion | Scenes with high spatial coherence; many bodies moving slowly. Degrades when everything moves far each step |
| BVH (AABB tree) | O(n log n) | O(log n) | Refit is cheap, rebalance is not | Static geometry, level meshes, raycast acceleration; the standard choice for the static world |
| Dual structure (static BVH + dynamic SAP or grid) | — | — | — | What production engines actually ship |

The dual structure is the important row. Static level geometry goes into a BVH built offline or at load, where the O(n log n) build cost is paid once and query cost is logarithmic. Dynamic bodies go into a structure with cheap incremental updates. PhysX uses this shape (`eSAP` and `eMBP` broadphase types, plus a separate static pruner with a rebuild-on-a-budget policy); Jolt uses a quad-tree per body layer with a background rebuild; Box2D v3 uses a dynamic AABB tree with enlarged proxies so small motion does not touch the tree at all.

The enlarged-proxy idea is worth internalising because it appears in every mature engine: store each body's AABB padded by a margin (typically 5–20% or a fixed 0.05–0.2 m), and only update the tree when the body leaves its padded box. A body vibrating within its margin generates zero tree updates. The cost is slightly more candidate pairs, which is cheap, in exchange for far fewer tree modifications, which are not.

Broadphase choice is usually not yours — the engine picks it — but the parameter that is yours is which structure a body lands in. PhysX and Jolt both partition by layer or by a static/dynamic distinction before any tree is consulted, so marking a body static (or, in Unity, giving a collider no rigidbody) puts it in the structure built for never moving. The corresponding mistake is a static collider whose transform is written at runtime: PhysX rebuilds the static pruner when static geometry moves, so moving a static collider each frame invalidates and rebuilds a structure designed to be built once, and the cost appears as an unexplained multi-millisecond spike in the physics step. Anything that moves gets a kinematic rigidbody, without exception.

The practical failure modes: one enormous collider (a terrain mesh as a single dynamic body, a world-sized trigger volume) that appears in every cell or every SAP interval and reduces the broadphase to O(n); thousands of colliders clustered at the world origin because a spawner ran before positions were assigned, producing a single cell holding everything; and a scene authored with all colliders on one layer, so the broadphase produces every pair and the layer matrix filters nothing.

## 3. Continuous collision detection and tunnelling

Discrete collision detection tests the world at the end of each step. If a body's displacement in one step exceeds the thickness of an obstacle along its path, the obstacle is between two sampled positions and is never tested. The condition is exact and worth memorising:

```
tunnels when  |velocity| × dt  >  obstacle_thickness (along the motion axis)
```

Worked example at a 50 Hz step (`dt = 0.02 s`): a bullet at 400 m/s moves 8 m per step, so it passes through anything thinner than 8 m — every wall in the game. A character sprinting at 10 m/s moves 0.2 m, which passes through a 0.1 m thick floor panel. A dropped physics object accelerating under gravity reaches 20 m/s after one second and moves 0.4 m per step, which is why small objects fall through thin floors after a long drop and not immediately.

Four remedies, in cost order.

**Make obstacles thicker than the maximum per-step displacement.** Free at runtime. Floors and walls get 0.2–0.5 m of collision thickness regardless of their visual thickness, which is why level collision meshes in shipped games are boxier and fatter than the art. This solves the majority of cases and should be a documented level-authoring rule rather than a per-bug fix.

**Do not simulate fast projectiles as rigid bodies at all.** A bullet is a raycast from last position to current position performed once per step, with the hit resolved analytically. This is exact at any speed, costs one raycast per projectile per step (roughly 0.5–3 µs), and is what nearly every shipped shooter does. Reserve rigid-body projectiles for grenades and physics toys where the arc and the bounces are the point.

**Enable CCD selectively.** Speculative contacts (the cheaper form, PhysX's `eENABLE_SPECULATIVE_CCD`, Box2D's default behaviour, Jolt's linear cast) enlarge the contact search along the motion path and generate contacts before penetration occurs; cost is roughly 1.2–2x a discrete step for that body. Sweep-based CCD (PhysX's `eENABLE_CCD`, Unity's `Collision Detection: Continuous` and `Continuous Dynamic`) performs conservative advancement, repeatedly sweeping the shape and stepping to the time of impact; cost is 2–10x for that body and can be much worse in a dense contact region because each sub-step re-runs narrowphase.

**Raise the physics rate.** The blunt instrument. Halving `dt` halves per-step displacement and doubles total physics cost across the whole scene, so it pays for every body to fix one. Use it when many bodies are marginal, not when one is.

Enable CCD per body, never globally. Unity's modes in cost order are Discrete, Continuous Speculative, Continuous, and Continuous Dynamic — where Continuous detects against static geometry only and Continuous Dynamic also detects against other continuous bodies, at meaningfully higher cost. Unreal exposes `bUseCCD` per primitive component plus a project-level `Enable Enhanced Determinism`. Godot 4 exposes `continuous_cd` per body. The correct default is discrete for everything, continuous for the player, for vehicles, and for any body whose peak speed times `dt` exceeds the thinnest collider it can encounter — which is a calculation, not a judgement, and should be asserted in a test.

## 4. Collision layers, matrices and query filtering

The cheapest large physics optimisation available, because it removes pairs before broadphase output rather than rejecting them in narrowphase. A scene with 2,000 colliders across 8 layers where only 6 of the 36 layer pairs actually interact does roughly a sixth of the pair work, and the change is a settings screen rather than code.

A workable default layer set for a 3D action game: `Default`, `Player`, `PlayerProjectile`, `Enemy`, `EnemyProjectile`, `StaticWorld`, `DynamicProp`, `Trigger`, `Camera`, `Ragdoll`, `Water`, `Interaction`. Then disable the pairs that never matter: `PlayerProjectile` against `Player`, `Ragdoll` against `Ragdoll` (the most expensive single pair in most games — self-collision within a ragdoll and between ragdolls is where a 3 ms physics step becomes a 25 ms one), `Camera` against everything except `StaticWorld`, `Trigger` against `Trigger`.

Query filtering is the same idea applied to raycasts and overlaps. A raycast that tests every collider in its path and then discards the ones on the wrong layer has done the narrowphase work already; passing a layer mask into the query removes those candidates during traversal. Every engine takes a mask parameter on every query — use it on every call, and treat an unmasked query in review as a defect. The second parameter that matters is trigger handling: Unity's `QueryTriggerInteraction`, Unreal's trace channel response, Godot's `collide_with_areas`. A ground check that hits a trigger volume and reports it as ground is a common and confusing bug.

Studio: audit the layer matrix as a shipping checklist item and put it under version control review, because the default state is everything-collides-with-everything and a new layer added mid-project defaults to colliding with all existing ones. Solo: define the layers before the first prototype, because renaming layers after 200 prefabs reference them by index is tedious in a way that is entirely avoidable.

## 5. Queries: triggers, overlaps, raycasts and shapecasts

Cost ordering, approximate, on a scene with a well-built BVH, measured per call on a mid-range desktop core:

| Query | Typical cost | Notes |
|---|---|---|
| Raycast, single hit, layer-masked, bounded distance | 0.3–1 µs | The cheapest useful query; cost is logarithmic in scene complexity |
| Raycast, all hits | 1–5 µs | Cannot early-out; allocates unless a non-allocating variant is used |
| Spherecast / capsulecast | 2–5x a raycast | Sweeps a volume; narrowphase runs against every candidate |
| Boxcast | 3–8x a raycast | Oriented box tests are more expensive than spheres |
| Overlap sphere | 2–6 µs plus per-result cost | Returns a set; cost scales with result count, not just scene size |
| Convex sweep against a mesh collider | 10–50 µs | The expensive one; avoid in per-frame code |
| Trigger overlap callbacks | Amortised into broadphase | Effectively free per pair, but callback dispatch is not |

The rules that follow. Bound every raycast with a maximum distance; an unbounded ray traverses the entire BVH. Use the single-hit variant unless all hits are genuinely needed, because single-hit queries terminate at the first intersection along the ray. Prefer non-allocating variants (`Physics.RaycastNonAlloc` and its successors, `TArray` reuse in Unreal) in any code that runs per frame, because the allocating variants return a fresh array per call and at 200 calls per frame that is meaningful garbage. Batch where the API allows: Unity's `RaycastCommand` runs N raycasts as a job across worker threads and beats N individual calls by roughly the per-call managed-to-native overhead, which is 0.1–0.4 µs each.

Triggers deserve their own discipline. Trigger callbacks fire during the physics step, so modifying the scene from inside one — destroying an object, changing a collider, adding a body — is either forbidden or deferred by the engine, and the failure is inconsistent between engines. Queue the reaction and process it after the step. Trigger enter and exit events are also not guaranteed to pair up when an object is destroyed or deactivated while inside a trigger, so any counter incremented on enter and decremented on exit will drift; store the set of contained objects instead of a count, and reconcile it against liveness.

Contact event dispatch is a cost that hides from profilers because it is attributed to the callback rather than to physics. Every contact between bodies whose flags request notification produces an enter, stay and exit callback, and in a scene with 500 contacting bodies the stay callbacks alone are 500 managed-to-native transitions per step — 0.5–2 ms in Unity before any of your code runs. Request contact notification per body and per pair rather than globally, prefer `OnCollisionEnter` over `OnCollisionStay`, and where the stay information is genuinely needed, read the contact buffer once per step rather than receiving a callback per pair.

Distance culling before querying is frequently the largest win available. Checking `sqrMagnitude` against a threshold before issuing a spherecast costs 2 ns and can remove 90% of the calls; a per-frame system that spherecasts for 300 agents regardless of distance is spending 1.5 ms to answer a question that matters for 20 of them.

## Pass conditions

Answer yes to every applicable line before the physics layer is considered correct.

1. The physics step runs at a fixed rate, and the rate is recorded with the constraint that determined it.
2. The catch-up clamp (`Time.maximumDeltaTime`, `max_physics_steps_per_frame`, or equivalent) is set below the engine default in shipping builds.
3. For every fast-moving body type, `maxSpeed × dt` is computed and compared against the thinnest collider it can encounter; where it exceeds, CCD is enabled on that body or the projectile is raycast-based.
4. CCD is enabled per body, not globally, and the list of bodies with CCD is short enough to enumerate.
5. Fast projectiles are raycast or swept rather than simulated as rigid bodies, unless the arc and bounces are a gameplay feature.
6. Level collision geometry has a documented minimum thickness, and an automated check flags collision surfaces below it.
7. The layer collision matrix has been explicitly audited; the default all-pairs-enabled state is not shipped, and ragdoll self-collision and ragdoll-to-ragdoll pairs are deliberately configured.
8. Every raycast and overlap query passes a layer mask and a bounded maximum distance.
9. Per-frame query code uses non-allocating variants, and steady-state gameplay shows zero allocation from physics queries in a profiler capture.
10. Trigger callbacks queue their reactions rather than modifying the scene during the physics step.
11. Trigger containment is tracked as a set of objects reconciled against liveness, not as an incremented and decremented count.
12. No collider that moves at runtime is marked static; everything that moves has at least a kinematic rigidbody.
13. Contact event notification is requested per body or per pair rather than globally, and `Stay` callbacks are absent from any pair that does not need them.
