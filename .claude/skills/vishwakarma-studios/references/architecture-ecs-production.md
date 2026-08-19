# Architecture: ECS in Production — Frameworks, Persistence, and Tooling

This part covers what an ECS costs once it is in a real project rather than on a whiteboard: the symptoms of a cargo-cult adoption, framework and engine choices, save games, networking, build times, the incremental adoption path, and debugging tooling. It assumes the decision and the data-modelling mechanics from `architecture-ecs-decision.md` and `architecture-ecs-data-and-systems.md`.

## 1. Cargo-cult symptoms

Each of these has been shipped, and each is diagnosable in under ten minutes of reading a codebase.

**ECS for a 200-entity puzzle game.** The framework costs more in build times, tooling gaps and onboarding than the entire simulation costs in CPU. Diagnostic: profile the systems; if their total is under 0.5 ms, the architecture was chosen for reasons unrelated to performance.

**"Components" that are classes with methods.** A `HealthComponent` with `TakeDamage()`, a base-class hierarchy of components, a component holding a reference to its owning entity so it can call back. This is objects with different file names. Diagnostic: search components for method definitions and for pointers or references to other entities.

**Systems that mutate global state.** A system writing to a singleton, a static, or an event bus that another system reads within the same frame. This destroys the declared read/write set that ordering and parallelism depend on, so the scheduler's conflict analysis is now wrong and the races are back. Diagnostic: any static mutable field reachable from system code.

**One system per entity type.** `GoblinSystem`, `OrcSystem`, `DragonSystem`. Systems should be per-behaviour and per-component-set, not per-noun. This is inheritance re-expressed with more ceremony.

**Queries constructed inside the loop.** Building or resolving a query per entity rather than once per system invocation converts a linear iteration into a repeated search. Diagnostic: query construction inside a `foreach`.

**Every field is its own component.** Twelve components on every entity, hundreds of archetypes, chunks holding single-digit entity counts. The component-granularity failure described in `architecture-ecs-data-and-systems.md`, and it produces measurably worse cache behaviour than the AoS it replaced.

**Entity references stored as raw indices.** No generation counter, so a recycled index silently aliases a destroyed entity and the resulting bug is a wrong-target attack that occurs once an hour. Diagnostic: entity handles that are a bare `int`.

**ECS adopted after profiling showed a GPU bottleneck.** The most expensive version of this mistake, because it consumes a quarter of a schedule and returns nothing measurable.

**A system per entity with a `Singleton` component to hold its state.** Frequently a manager class wearing a component costume: it has one instance, it holds mutable state, it is read and written by half the codebase. Singletons are legitimate for genuinely global simulation parameters (gravity, time scale, match rules) and illegitimate as a place to park state that has an owner.

**Components holding managed references or `std::shared_ptr`.** This breaks relocatability, breaks trivial copyability, breaks snapshotting for rollback, and in C# prevents the component from living in a `NativeArray` at all. Store a handle or an index into a side table instead. Diagnostic: any component field that is not a value type or a plain index.

## 2. Engine and framework expressions

| Framework | Storage | Language | Maturity and fit |
|---|---|---|---|
| Unity DOTS / Entities | Archetype, 16 KiB chunks | C# with Burst | Entities 1.x is production-viable; requires URP or HDRP for Entities Graphics, no `Animator`, no UGUI, separate physics (Unity Physics or Havok). Adopt Burst and the Job System independently first — they carry most of the win at a fraction of the risk. |
| Unreal Mass Entity | Archetype, chunked | C++ | Designed for crowds, traffic and large agent populations, not as a replacement for the actor model. The intended architecture is actors for gameplay, Mass for populations, with `MassRepresentation` handling the LOD transition between an ISM instance and a spawned actor. |
| Bevy | Tables (archetype-like) with per-component sparse-set option | Rust | Scheduler derives conflicts from system signatures and enforces them at startup; borrow checking removes a class of aliasing bug outright. Ecosystem is younger than the engines, and API churn across versions is real. |
| EnTT | Sparse set | C++ header-only | The default choice for a custom C++ engine. Cheap structural changes, excellent single-component iteration, no scheduler — you write the frame loop. Used in shipped commercial titles including Minecraft's Bedrock renderer work. |
| flecs | Archetype, with per-component storage choice | C, with C++ and other bindings | Entity relationships (parent-of, likes, owns) as a first-class query concept, which archetype ECS frameworks generally lack and which matters for hierarchies, inventories and faction graphs. Built-in explorer for runtime inspection. |
| Godot | No first-party ECS | GDScript/C# | The node/scene model is deliberately object-oriented. Third-party ECS bindings exist; using one means giving up the scene tree for those entities, which is most of what Godot provides. |

Framework maturity is a schedule input rather than a preference. Unity's Entities package has had breaking API changes across major versions with migration costs measured in weeks; Unreal's Mass Entity is documented sparsely relative to the actor system and its intended scope is narrower than teams assume; Bevy's API changes meaningfully between minor versions. EnTT and flecs are the most stable of the set because they are libraries with a narrow surface rather than engine subsystems with a rendering and tooling story attached. Check the framework's release history and breaking-change record before committing content to it, because content authored against an ECS is harder to migrate than code.

The general rule for engine-embedded ECS: you are adopting a second, parallel world model alongside the engine's own, and everything the engine does for objects — serialisation, inspection, hot reload, animation, UI binding, physics, networking — either does not apply to entities or applies through a bridge somebody has to build and maintain.

## 3. Serialisation and save games under ECS

This is the part that gets skipped in evaluations and then dominates the second half of the project.

The problem is that an entity id is a runtime index. Writing it into a save file and reading it back on a different run yields a handle to a different entity or to nothing. Every cross-entity reference — target, owner, parent, inventory holder, quest giver — has to be remapped on load. The standard solution is a stable identifier: assign each persistent entity a GUID or a content-authored id at creation, serialise references as stable ids, and rebuild the id-to-entity map during load in two passes — create all entities first, then patch all references.

Schema versioning is harder than in an object model because there is no natural place to put migration code. A component is plain data with no methods, so adding a field means every save written by the previous build deserialises into a struct of the wrong size. Version each component type explicitly, keep a registry mapping (component type, version) to a migration function, and run migrations at load. Studio: gate merges on a test that loads a corpus of saves from every shipped build; the corpus is the only thing that catches a migration someone forgot.

Deciding what to persist is also harder, because in an object model the object boundary is a natural serialisation unit and in ECS it is not. An entity's persistent state is a subset of its components — you save `Health` and `Position` and `InventoryContents`, and you do not save `PathfindingScratch`, `RenderMesh` or `CollisionContacts`. Mark persistence explicitly per component type rather than by exclusion, because a new component added by a gameplay engineer defaults to not-saved, which is a recoverable bug, whereas defaulting to saved silently doubles save size and serialises pointers.

Blob and handle components need custom serialisation: a component holding an asset handle, a native array, or an index into an external buffer cannot be memcpy'd to disk. Enumerate these at design time; they are the ones that produce a save file that loads on the developer's machine and crashes on a fresh install.

## 4. Networking under ECS

ECS and networking fit together well in one respect and badly in another, and both are worth knowing before committing.

The good fit: components are plain data, so state replication is a matter of serialising component values, and delta compression is a matter of comparing two arrays of the same struct — which is fast, vectorisable, and simple. Contiguity means a snapshot of 5,000 entities' positions is a single memcpy-adjacent pass rather than 5,000 pointer chases. Determinism is easier to achieve because systems are pure functions over declared data, which makes rollback and prediction (see the game loop reference, section 12) tractable. Unity's Netcode for Entities and Bevy's replication crates both exploit exactly this.

The bad fit: relevancy, prioritisation and interest management are per-observer decisions, and per-observer decisions do not map onto a homogeneous per-archetype loop. Deciding that player A should receive entity X at high frequency and entity Y not at all requires a per-pair evaluation whose cost is players times entities, and structuring that as an ECS query is awkward in every framework. Unreal's actor replication system solves this with per-actor relevancy, dormancy and conditional property replication accumulated over two decades; a new ECS networking layer starts with none of it.

Practical consequences to plan for. Ghost or replicated-entity definitions must be declared explicitly — which components replicate, at what quantisation, with what interpolation, and whether they are predicted or interpolated on the client. Entity ids must be mapped between server and client id spaces, with the same two-pass remapping problem as saves. Structural changes are replication events, so a design that adds and removes tags frequently generates network traffic proportional to that churn, which is an additional reason for the enabled-bit approach described in `architecture-ecs-data-and-systems.md`. And prediction requires the client to snapshot and restore simulation state cheaply, which favours POD components and rules out any component holding a managed reference.

Studio: decide the replication model before the component granularity, because granularity that is right for cache behaviour and wrong for replication forces one of the two to be re-cut. Solo: if the game is networked and you are not already fluent in ECS, use the engine's object-based replication and put the ECS only in the non-replicated simulation.

## 5. Build times, iteration speed, and the compile-time tax

The cost that does not appear in any benchmark and does appear in every retrospective.

Template-heavy C++ ECS libraries instantiate a distinct type for every query and system signature. EnTT and flecs' C++ API are header-only and expression-template-heavy, so a translation unit that includes them and declares a dozen queries can take 3–10 seconds to compile on its own, and a change to a component header recompiles every translation unit that touches it. On a codebase with 400 files that is the difference between a 20-second incremental build and a 6-minute one, which at 30 builds a day is three hours of engineer time. Mitigate with explicit template instantiation in one translation unit, `extern template` declarations, pimpl boundaries around the registry, and unity builds — and measure the incremental build time as a tracked metric, because it degrades gradually and nobody notices the day it crossed a minute.

Unity DOTS pays the same tax through Burst: Burst compiles jobs with LLVM, and a full Burst compilation of a large project's jobs is measured in minutes. Burst's editor mode compiles asynchronously and falls back to managed execution until compilation completes, which means the first run after a change is 10–100x slower and the profile is meaningless — a genuine source of false performance conclusions during development. Source generators used by Entities add their own compilation step to every domain reload.

Rust's Bevy compiles the entire dependency tree from source on a clean build, which is minutes to tens of minutes; incremental builds with `dynamic_linking` and a fast linker (lld or mold) land in single-digit seconds, and configuring those is a day-one task rather than an optimisation.

The general principle: an architecture that lengthens the edit-compile-run cycle taxes every subsequent decision, because engineers make fewer experiments per day and each experiment is worth less. Studio: track incremental build time as a first-class metric with a threshold that fails a build health check, exactly as frame time is tracked. Solo: measure it once a month and treat a doubling as a problem to fix immediately rather than to live with.

## 6. Adopting incrementally

The successful adoptions are incremental and measured; the failed ones are rewrites justified by a benchmark of somebody else's game.

Start by extracting one hot system into flat arrays inside the existing architecture. Keep the object model, add a parallel `std::vector<float3>` or `NativeArray<float3>` for the data that system needs, write results back once per frame. This requires no framework, no build system change and no team retraining, and it recovers most of the available win for that system. Measure before and after on the target device.

If several systems repeat that pattern and the bookkeeping becomes the problem, adopt a lightweight ECS library (EnTT, flecs) for the simulation layer only, keeping the engine's object model for presentation and gameplay scripting. This is the hybrid described in `architecture-ecs-decision.md` and is where most projects should stop.

Adopt a full engine-integrated ECS only when the entity count is unambiguously in the 10⁴–10⁶ range, the profile shows those systems dominating the frame, and the team has capacity for the tooling gap. Gate it on a written profile and a prototype that demonstrates the win on real content rather than on a synthetic benchmark, because synthetic benchmarks measure the best case and real content has archetype fragmentation, structural churn and cold data.

Set an exit criterion before starting, and write it down: the specific systems to convert, the measured cost of each today, and the frame time the conversion must achieve on the reference device. Without it, an incremental adoption has no natural stopping point and drifts into the full rewrite it was intended to avoid — the classic path being "we converted movement, so now animation has to know about entities, so now the spawner does too". Each of those steps is locally reasonable and the aggregate is a rewrite nobody approved.

Reverse-migration is expensive in one direction only. Moving a system from objects to arrays is local and reversible; moving a whole project from ECS back to objects is not, because the ECS shape has infected the content pipeline, the tooling and the serialised data. Bias early decisions toward the reversible one.

## 7. Debugging and tooling

The tooling gap is the cost that evaluations systematically underestimate, so enumerate it before committing.

A breakpoint inside a system stops on a batch, not on an entity, so "break when this specific enemy takes damage" requires a conditional breakpoint on an entity id you first have to discover. Provide an entity inspector early — a debug view that takes an entity id and dumps every component on it — because without one, every gameplay bug investigation starts with building the tool.

Names are absent by construction. An entity is an integer, so profiler output, logs and crash dumps identify entities by number. Add a debug-only `Name` or `DebugTag` component, stripped in shipping builds, and include the entity id and that name in every gameplay log line.

Archetype and chunk telemetry are the ECS equivalent of allocation profiling: archetype count, mean entities per chunk, chunk memory utilisation, and structural changes per frame. All four are cheap to instrument and each maps directly onto a failure mode in the component-granularity and storage sections of `architecture-ecs-data-and-systems.md`. flecs ships an explorer that shows this live; Unity provides the Entities Hierarchy and Systems windows; for a custom engine, expect to write it.

Profiler attribution changes shape. In an object model, a profiler sample names a method on a class and you know which subsystem it belongs to. In ECS, samples land in a small number of generic iteration functions, so per-system markers are mandatory rather than optional — instrument every system with a named scope at registration time, automatically, so that no system can be added without one.

Content authoring is the other gap. In Unity and Unreal, designers author entities through the object model and a baking step converts them, which means the thing being edited is not the thing that runs and a bug can live in the conversion. Keep the baking step deterministic and re-runnable, log what each bake produced, and provide a way to inspect a baked entity next to its authoring source, or bake bugs become unfalsifiable arguments between disciplines.

Determinism and replay tooling get easier under ECS, and this is a genuine benefit rather than a consolation. Because systems are functions over declared data, a full state checksum is a pass over component arrays, and a state snapshot is a set of memcpy operations. Building replay and rollback on top of a well-formed ECS is substantially cheaper than building it on an object graph, which is a reason to choose ECS that has nothing to do with cache lines and is frequently the stronger reason.

## Pass conditions

Answer yes to every applicable line before the architecture decision is considered sound.

1. Queries are constructed once per system, not per entity.
2. Persistent cross-entity references serialise as stable ids, and load runs a two-pass create-then-patch remap.
3. Every serialised component type carries a version, with a registered migration function per version transition.
4. Persistence is opt-in per component type; a newly added component is not saved by default.
5. A save corpus containing files from every previously shipped build loads successfully in CI.
6. In a networked build, replicated component sets, quantisation and prediction mode are declared per ghost type rather than inferred.
7. An entity inspector exists that dumps all components for a given entity id, and debug-only names are attached to entities in non-shipping builds.
8. Incremental build time is tracked as a metric with a documented threshold, and the current value is under it.
9. Any Burst- or JIT-compiled system is profiled only after compilation has completed, so no performance conclusion is drawn from a fallback-execution run.
