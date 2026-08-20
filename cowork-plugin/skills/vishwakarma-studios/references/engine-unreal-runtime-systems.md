# Unreal Engine: Replication, Rendering, and World Runtime

This is the runtime-cost half of the Unreal reference: what replication, Nanite, Lumen, materials, world streaming and Chaos physics actually cost once the game is running, and where each one has to be budgeted rather than merely switched on. It assumes the gameplay framework and C++/Blueprint material covered in `engine-unreal-gameplay-and-code.md`. Version pinning is unchanged: UE 5.4 and 5.5 are the conservative production baselines, 5.6 where a specific feature requires it.

## 1. Replication: the strongest reason to choose Unreal

Unreal's networking is server-authoritative actor replication with client prediction, and it is the most complete implementation available in a commercial engine. If the product is multiplayer, this alone can justify the engine choice, because the alternative is six to eighteen engineer-months rebuilding it.

**Property replication.** Mark a property `Replicated` and declare it in `GetLifetimeReplicatedProps`. The server compares each replicated property against a shadow copy of its last-sent value on each replication tick and sends deltas to relevant clients.

```cpp
UPROPERTY(ReplicatedUsing = OnRep_Health)
float Health = 100.f;

void AMyChar::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& Out) const {
    Super::GetLifetimeReplicatedProps(Out);
    DOREPLIFETIME(AMyChar, Health);
    DOREPLIFETIME_CONDITION(AMyChar, Ammo, COND_OwnerOnly);   // bandwidth and anti-cheat
    DOREPLIFETIME_CONDITION(AMyChar, TeamId, COND_InitialOnly);
}

UFUNCTION() void AMyChar::OnRep_Health() { UpdateHealthUI(); PlayHitReact(); }
```

`RepNotify` (`ReplicatedUsing`) fires on clients when the value arrives changed, which is where cosmetic response belongs. It does not fire on the server unless you call it explicitly — the standard bug is putting shared logic in `OnRep_` and finding the server never runs it, so call the handler manually after server-side writes.

Replication conditions are the first bandwidth lever, and they double as an anti-cheat measure: data sent only to its owner (`COND_OwnerOnly`) cannot be read by a cheating client on another machine. The default of replicating everything to everyone is both a bandwidth problem and an information-leak problem in competitive games.

**The push model** is the second lever and is frequently left off. By default the server polls every replicated property of every relevant actor every replication tick, comparing against the shadow buffer; with hundreds of actors and dozens of properties each that comparison is measurable server CPU. Enabling the push model (`net.IsPushModelEnabled=1`, properties marked with `MARK_PROPERTY_DIRTY_FROM_NAME`) inverts it: nothing is compared, only explicitly dirtied properties are considered. On dedicated servers this is commonly a 20–50% reduction in replication CPU.

**RPCs** come in three forms with distinct routing: `Server` (called on the owning client, executed on the server; requires ownership, and is the only client-to-server path), `Client` (called on the server, executed on the owning client), `NetMulticast` (called on the server, executed on the server and all relevant clients). Reliability is a per-RPC choice with a hard consequence: reliable RPCs are queued and retransmitted until acknowledged, and overflowing that queue disconnects the client. Cosmetic, high-frequency events (hit effects, footsteps) are unreliable; state-changing events are reliable and rate-limited. A reliable multicast called every frame is one of the reliable ways to break a live game.

| RPC specifier | Called on | Executes on | Requires | Typical use |
|---|---|---|---|---|
| `Server, Reliable, WithValidation` | Owning client | Server | Ownership | Player intent that changes state: fire, interact, buy |
| `Server, Unreliable` | Owning client | Server | Ownership | High-frequency intent where loss is tolerable: aim updates |
| `Client, Reliable` | Server | Owning client | Ownership | Targeted confirmations, personal notifications |
| `NetMulticast, Unreliable` | Server | Server plus relevant clients | Actor relevancy | Cosmetic effects: impacts, footsteps, muzzle flashes |
| `NetMulticast, Reliable` | Server | Server plus relevant clients | Actor relevancy | Rare, important events only; a per-frame reliable multicast will overflow queues |

**Relevancy** determines which actors a given client is told about at all, and it is what makes large maps affordable. `NetCullDistanceSquared` (default 225,000,000 uu², i.e. 150 m) culls by distance; `bAlwaysRelevant` opts out (use sparingly — the `GameState` and the `PlayerState` array are the legitimate cases); `bOnlyRelevantToOwner` restricts to the owning connection; `IsNetRelevantFor` allows custom logic. `NetUpdateFrequency` and `MinNetUpdateFrequency` set how often an actor is considered, and lowering it for distant or slow actors is the cheapest available bandwidth saving.

**Dormancy** removes an actor from replication consideration entirely rather than merely finding no changes. `SetNetDormancy(DORM_DormantAll)` on an actor whose state has stopped changing — a placed prop, a finished pickup, a static door — removes it from the per-tick iteration; `FlushNetDormancy()` wakes it when state changes. On a map with 5,000 placed actors of which 50 are active, dormancy is the difference between a server that holds 100 players and one that holds 20.

**Beyond the defaults.** The Replication Graph replaces the default relevancy iteration with spatial grids and explicit node classes, and is how battle-royale-scale player counts are reached. Iris (5.4+, still stabilising) is the successor with a rewritten replication core. For character movement specifically, `UCharacterMovementComponent` already implements client-side prediction with server reconciliation and replay, which is a genuinely difficult system you get without writing it; extending it correctly means subclassing `FSavedMove_Character` and `FNetworkPredictionData_Client_Character` rather than bypassing the component.

## 2. Nanite and Lumen: what they cost

Both are excellent and both are frequently enabled without a budget, which is how projects arrive at 22 fps in month ten.

**Nanite** is virtualised micropolygon geometry: meshes are decomposed into hierarchical clusters of roughly 128 triangles, culled and LOD-selected on GPU per cluster, and rasterised through a visibility buffer with a software rasteriser for sub-pixel triangles. The wins are removing LOD authoring, removing draw call count as a design constraint, and rendering film-resolution source geometry directly.

The costs, concretely. There is a fixed per-frame overhead of roughly 1.5–4 ms on mid-range GPUs regardless of scene complexity, so a simple scene renders *slower* with Nanite than without. It requires Shader Model 6 and DX12, Vulkan, or Metal with the appropriate feature level; there is no DX11 path. Nanite mesh data is typically 1.5–4x the source mesh on disk, which is a package size problem on console and a serious one on mobile. Masked and translucent materials fall off the fast path: masked materials require per-pixel material evaluation during rasterisation, which forfeits much of the benefit, and translucency is not Nanite at all. World Position Offset on a Nanite mesh disables some culling optimisations and adds cost proportional to the enabled bounds.

The concrete case where Nanite is wrong is dense foliage using two-sided masked leaf cards. That content is high-overdraw and low-triangle-density per pixel, exactly the inverse of what Nanite optimises, and traditional LOD chains with instanced foliage will beat it. Nanite is right for hard-surface environments, kitbashed architecture, rocks, terrain-adjacent geometry, and scanned assets. Skinned Nanite exists from 5.5 but should be treated as maturing rather than a default for characters.

| Target | Nanite | Lumen | Virtual Shadow Maps | Fallback |
|---|---|---|---|---|
| PS5 / Xbox Series X, 60 fps | Yes, with a measured budget | Software Lumen, tuned quality | Yes | Reduced internal resolution with temporal upsampling |
| High-end PC | Yes | Software or hardware Lumen | Yes | Scalability groups per setting |
| Xbox Series S | Yes, with tighter geometry budgets | Software Lumen at reduced quality, or baked | Yes, at lower page budgets | Baked lighting path |
| Nintendo Switch class | No | No | No | Baked lightmaps, traditional LODs, forward rendering |
| Mobile | No | No, except limited high-end paths | No | Baked lightmaps, mobile renderer |

**Lumen** is dynamic global illumination and reflections. Software Lumen traces against mesh distance fields and a global distance field, with screen traces first; hardware Lumen traces against ray tracing acceleration structures for better quality and higher cost. Budget 2–4 ms at 1080p for software Lumen on a mid-range GPU and materially more at 4K or with hardware ray tracing, before reflections.

Lumen is wrong when the lowest supported target cannot pay that budget: last-generation consoles, integrated GPUs, most mobile, and any 120 fps target on mid-range hardware. The trap is that the alternative is not free — it is baked lighting with lightmaps, which means UV authoring, lightmap resolution budgets, bake farm time, and a lighting artist workflow that is entirely separate. Supporting both dynamic and baked lighting across a scalability range doubles the lighting authoring work. Decide the lighting model in preproduction, from the minimum spec, and record the decision; discovering in month twelve that the Switch build needs lightmaps is a schedule event, not a settings change.

Virtual Shadow Maps are effectively coupled to this decision: they are the shadowing method Nanite and Lumen assume, they cost roughly 1–3 ms, and they have their own invalidation cost proportional to how much of the scene moves. A scene with thousands of moving shadow casters invalidates VSM pages continuously and the cost climbs sharply.

## 3. Materials and the shader permutation explosion

The material editor is a node graph compiled to HLSL, and it is genuinely the best artist-facing shader authoring tool in the industry. The compile-time cost model is the part that surprises teams.

A material is compiled once per combination of: shader platform (each console, each of DX11/DX12/Vulkan/Metal, each mobile variant), vertex factory (static mesh, skeletal mesh, instanced, Nanite, landscape, particle sprite, and more — a dozen or more in a typical project), quality level, and every combination of static switches in the graph. Static switches are the multiplier that gets out of hand: `n` static switches produce 2ⁿ permutations, so a "flexible" master material with 10 static switches generates 1,024 permutations *per vertex factory per platform*. Projects routinely reach hundreds of thousands to millions of shaders and cook times measured in hours dominated by shader compilation.

The arithmetic, made explicit, because teams consistently underestimate it:

| Master material | Static switches | Permutations per vertex factory | × 12 vertex factories | × 4 shader platforms |
|---|---|---|---|---|
| Simple, no switches | 0 | 1 | 12 | 48 |
| Moderate | 4 | 16 | 192 | 768 |
| "Flexible master" | 8 | 256 | 3,072 | 12,288 |
| Uncontrolled | 12 | 4,096 | 49,152 | 196,608 |

Multiply that by the number of master materials and the quality levels, and the cook-time shader count follows directly. A single "one material to rule them all" asset can add hours to every full cook, for every person, for the rest of the project.

The controls, in order of impact. Use Material Instances for variation: instance parameters are uniform values and produce zero additional permutations, while static switch parameters produce a new permutation per combination — this distinction is the single most valuable thing to teach an art team. Keep the number of master materials small and audited; a project should have tens, not hundreds. Disable unused material domains and shading models in Project Settings, and disable unused vertex factories where the platform allows, since each disabled axis divides the total. Prefer dynamic branching over static switches where the branch is coherent, which UE 5.x supports well on modern hardware.

Runtime shader cost is separate and equally real: a PSO (pipeline state object) that has not been compiled when it is first needed causes a hitch of 10–500 ms on platforms that compile at runtime, which is the classic traversal stutter. The fix is the PSO precache and bundled PSO cache workflow — record PSO usage from automated playthroughs, ship the cache, and compile at load. On console and Vulkan this is a certification-adjacent requirement, not an optimisation.

## 4. World Partition, streaming, and One File Per Actor

World Partition (5.0+) replaces the older World Composition and the "one enormous persistent level" pattern. The world is divided into a runtime grid; streaming sources (normally the player) determine which cells are loaded; Data Layers allow content to be included or excluded by runtime state (day/night, story phase, difficulty) or by editor context; HLODs are generated per cell so distant content renders as merged proxies rather than as unloaded nothing.

One File Per Actor is the workflow half and matters more than it sounds. Each actor becomes its own `.uasset` under `__ExternalActors__` rather than a record inside the level file. Under exclusive checkout this converts a level from a single file that one person at a time can edit into thousands of files that a whole team can edit simultaneously, with conflicts scoped to individual actors. For a studio on Perforce this is the difference between level editing being a scheduled resource and level editing being parallel work. It requires source control integration to be configured correctly in the editor and it produces very large numbers of small files, which is a Perforce sizing consideration rather than a blocker.

Level Instances and Packed Level Actors give reusable sub-assemblies: a Level Instance is a level embedded as an actor with its own file identity, and a Packed Level Actor merges static content into a single instanced-static-mesh actor for runtime efficiency. Use these for repeated set pieces — buildings, room modules, prop clusters — because the alternative is duplicating hundreds of actors per instance and losing the ability to fix them centrally.

| Cell size | Cells resident at 2-cell range | Load spike per cell | Suits |
|---|---|---|---|
| 64 m | ~25 in a 320 m radius | Small, frequent | Dense urban interiors, high detail density |
| 128 m | ~25 in a 640 m radius | Moderate | General-purpose open world |
| 256 m | ~25 in a 1.28 km radius | Large, infrequent | Sparse landscapes, vehicle or flight traversal speeds |
| 512 m+ | ~25 in a 2.56 km radius | Hitch risk on lower-memory platforms | Very sparse worlds only |

Streaming budgets to hold: cell size is the main tuning knob and trades load spikes against resident memory; a 2 km² open world with 256 m cells and a 2-cell loading range holds roughly 25 cells resident. Measure with `stat streaming`, `stat levels`, and the World Partition editor's runtime grid preview, and set the target from the lowest-memory platform.

## 5. Chaos physics

Chaos replaced PhysX as the physics backend in UE 5.0. The practical differences from PhysX to plan around: performance on large rigid body counts is generally somewhat worse than PhysX 4 at equivalent settings, so a project ported from an earlier engine version should re-measure rather than assume; the solver is configurable through `p.Chaos.*` console variables and the Chaos solver actor; and async physics (fixed-step simulation decoupled from frame rate, configured through Project Settings' substepping and async physics options) is what you want for stable simulation, and it changes when results are readable relative to tick groups.

What Chaos adds that PhysX did not: Geometry Collections and Fracture for destruction driven by field forces, Chaos Cloth with a dedicated editor, Chaos Vehicles, and Chaos Flesh for soft bodies. Destruction in particular is a genuine capability rather than a checkbox, and it is one of the reasons studios choose Unreal for action titles.

Determinism: Chaos is not bit-deterministic across platforms or across differing frame timing, so lockstep networked physics is not available for free. The Network Physics Component and physics prediction work in 5.4+ is real but still moving between releases; treat any design that requires deterministic replicated physics as a research risk with a fallback plan, not as a solved problem.

| Decision | Cheap option | Expensive option | Mechanism |
|---|---|---|---|
| Collision shape | Box, sphere, capsule, convex hull | Complex (per-triangle) | Convex primitives use analytic narrowphase; triangle meshes require mesh queries and cannot be dynamic |
| Simulation stepping | Fixed async substep at 30–60 Hz | Frame-rate-coupled stepping | Decoupled stepping makes behaviour reproducible across frame rates |
| Broadphase filtering | Explicit collision channels and object types | Everything blocks everything | Channels filter pairs before narrowphase, so cost falls with the pair count |
| Sleeping | Aggressive sleep thresholds | Bodies kept awake by small residual motion | Sleeping bodies leave the active solver set entirely |
| Destruction | Pre-fractured Geometry Collections with LOD levels | Runtime fracture at high cluster counts | Fracture generates new bodies and new render state; both scale badly |

Cost control is mostly authoring discipline: use simple primitive collision rather than per-triangle collision on anything dynamic, keep collision complexity separate from render complexity, restrict collision channels so the broadphase filters pairs early, and set physics bodies to sleep aggressively. `stat physics` and the Chaos Visual Debugger are the measurement tools.

## Pass conditions

Answer yes to every applicable line before the project is considered correctly set up.

1. Every replicated property is declared in `GetLifetimeReplicatedProps` with an explicit condition where the data is owner-private; no reliable RPC is called at per-frame frequency.
2. Placed actors that stop changing state are set dormant, and `NetCullDistanceSquared` is tuned per actor class rather than left at the default.
3. An Unreal Insights net trace exists for the target player count, and per-actor replication bandwidth is inside a documented budget.
4. Nanite and Lumen enablement is recorded against the minimum-spec target with a measured millisecond budget; if the minimum spec cannot pay it, a baked lighting path exists and is tested.
5. Master material count is audited and static switch counts per master material are capped; total cooked shader count and cook time are tracked per milestone.
6. A shipped PSO cache is gathered from automated playthroughs and included in packaged builds for every platform that compiles pipeline states at runtime.
7. Levels use World Partition with One File Per Actor, and no level `.uasset` is a team-wide checkout bottleneck.
8. Physics uses async fixed-step simulation, collision channels are explicitly configured, and no dynamic body uses per-triangle collision.
