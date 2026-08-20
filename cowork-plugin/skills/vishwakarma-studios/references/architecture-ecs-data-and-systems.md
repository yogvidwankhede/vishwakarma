# Architecture: ECS Components, Storage, Systems, and Memory

This part assumes the decision to build data-oriented has already been made, and covers how the data is shaped and how it is processed: component granularity, storage design, the cost of structural change, system ordering and parallelism, inter-system communication, relationships, and memory behaviour. The decision itself — entity counts, break-even, and when plain objects are correct — is in `architecture-ecs-decision.md`.

## 1. Component granularity

Granularity is the tuning knob with the least intuitive failure modes, because both extremes are defensible in isolation and both are wrong in practice.

**Too fine fragments archetypes.** In an archetype ECS, the set of components an entity has defines its archetype, and each archetype gets its own contiguous storage. Splitting `Transform` into `Position`, `Rotation` and `Scale` triples the number of possible archetypes for entities that vary in which of the three they carry. A project with 30 fine-grained components and free combination can generate hundreds of archetypes, each holding a handful of entities. Contiguity within an archetype is then meaningless — Unity DOTS packs entities into 16 KiB chunks, and an archetype with 12 entities occupies one mostly-empty chunk, so iterating it touches a full chunk of memory to process 12 entities and the cache behaviour is worse than AoS. The rule: components that are almost always present together belong together.

**Too coarse defeats the point.** A single `EnemyData` component with 40 fields is AoS with extra steps. A system that reads only `health` pulls the whole 200-byte struct through cache. The rule: fields accessed by different systems at different frequencies belong apart.

The workable heuristic is to group by access pattern, not by conceptual model. Fields read together every frame by the same system go in one component. Fields read rarely, or by one system only, go in their own. Concretely, for a typical action game: `LocalTransform` (position, rotation, scale — accessed together by movement, rendering and physics), `Velocity` (movement and physics), `Health` plus `Damage` accumulators (combat only), `RenderMesh` handles (rendering only), and cold data such as display names and dialogue references in a separate component or outside the ECS entirely.

Tag components — zero-sized markers such as `Dead`, `PlayerControlled`, `Invulnerable` — are the correct way to express state that partitions entities, because in an archetype ECS a tag costs no per-entity bytes and turns a per-entity branch into a query filter. The cost is that adding or removing a tag is a structural change, which is section 3's problem. Use tags for state that changes on the order of seconds, and a boolean field for state that changes every frame.

Target archetype count as a health metric: under 100 archetypes for a typical game is healthy, 100–500 warrants a review, and over 1,000 with most archetypes holding fewer than 100 entities means granularity has fragmented the storage and the memory-layout benefit has been lost. Studio: report archetype count and mean entities-per-chunk in an automated build health check.

## 2. Archetype versus sparse-set storage

The two dominant storage designs make opposite tradeoffs, and the choice determines which operations are cheap in your codebase.

| | Archetype (chunked) | Sparse set |
|---|---|---|
| Storage | One contiguous block per unique component set | One dense array per component type, plus a sparse index |
| Iteration of a multi-component query | Fastest possible: matching archetypes are fully contiguous, no per-entity checks | Iterate the smallest dense array, then look up each entity in other components' sparse indices |
| Adding or removing a component | Expensive: the entity's data is copied to a different archetype's storage | Cheap: append to one dense array, write one sparse index entry |
| Random access to one entity's component | Indirection through an entity-to-chunk map | Direct: sparse index then dense array |
| Memory overhead | Partially filled chunks | Sparse arrays sized to the entity id space, typically paged |
| Implementations | Unity DOTS, Unreal Mass Entity, flecs, Bevy (table storage) | EnTT (default), Bevy's `SparseSet` storage option, Shipyard |

Choose archetype storage when the workload is iteration-dominated and composition is stable — thousands of entities that keep the same component set for their lifetime and are iterated many times per frame. Choose sparse-set storage when composition changes frequently — gameplay code that adds and removes tags and state components constantly, or an editor-driven workflow where users compose entities interactively. flecs and Bevy expose both and let you specify storage per component type, which is the right answer when a handful of components are hot-added and the rest are stable: mark those specific ones as sparse-set and leave the rest in tables.

## 3. Structural change: the classic performance trap

A structural change is any operation that alters which archetype an entity belongs to — adding a component, removing a component, creating an entity, destroying an entity. In an archetype ECS this means copying every one of that entity's components from the old chunk to the new one, patching the entity-to-chunk map, and possibly leaving a hole that gets backfilled by moving another entity. For an entity with 200 bytes of components that is roughly 200 bytes copied plus two map writes plus cache disruption in two chunks: call it 200–2,000 ns per structural change, against 1–3 ns for a component write.

The trap is that idiomatic gameplay code adds and removes components as a state machine:

```csharp
// Anti-pattern: structural change every frame for every entity in the query
foreach (var (health, entity) in Query<Health>().WithEntityAccess()) {
    if (health.Value <= 0) ecb.AddComponent<Dead>(entity);       // structural
    if (health.Value > 0)  ecb.RemoveComponent<Burning>(entity); // structural
}
```

At 10,000 entities with one structural change each per frame, that is 2–20 ms — worse than the OOP implementation the ECS replaced. The failure is invisible in a microbenchmark of the iteration and appears only under load, which is why it survives to production.

The mitigations, in order of preference. Prefer an enabled/disabled bit over add/remove where the framework supports it — Unity's `IEnableableComponent` and `SetComponentEnabled` change a bitmask rather than moving memory, so the component stays in the chunk and queries skip it, costing single-digit nanoseconds. Prefer a state field inside an existing component over a tag when the state changes every frame. Batch structural changes through a command buffer and play them back at one defined sync point per frame, so the cost is paid once with good locality rather than scattered through the frame. Pre-create entities in pools and recycle them rather than creating and destroying, because entity creation is a structural change plus an allocation. And when a batch is unavoidable, use the bulk APIs (`EntityManager.AddComponent(EntityQuery, ...)`) which move whole chunks rather than individual entities.

Command buffers introduce their own hazard: playback order determines the result, and two systems queueing conflicting changes to the same entity resolve by playback position rather than by intent. Keep one playback point per phase, document the phase order, and treat a system that needs to observe another system's structural change within the same frame as a design error to be fixed by reordering rather than by adding a second playback point.

## 4. Systems: ordering, dependencies, and parallelism

A system's read and write sets are the whole of its interface. Once every system declares them, three things become mechanical rather than judgemental.

**Ordering.** Two systems conflict when one writes what the other reads or writes. Non-conflicting systems have no required order and may run in either sequence or concurrently; conflicting systems have an order that must be explicit. Express it as a declared constraint (`[UpdateBefore]`, `[UpdateAfter]`, Bevy's `.before()`/`.after()` and system sets, flecs pipeline phases) rather than as registration order, because registration order is invisible at the point where the dependency matters and silently changes when someone reorders a file.

**Parallelism.** Systems with disjoint write sets, and systems where one reads what another reads but neither writes, can run on separate threads with no synchronisation. Within a system, iterating an archetype in chunk-sized batches parallelises trivially because each chunk is owned by exactly one worker. The practical wins come from the second form: `IJobChunk` in Unity, `par_iter` in Bevy, worker-partitioned iteration in flecs.

**Conflict detection.** Unity's job safety system tracks read and write access to every `NativeArray` and throws in the editor when two jobs alias without a declared dependency. Bevy's scheduler derives the conflict graph from system parameter types at startup and panics on ambiguous mutable access. This is the property worth insisting on when choosing a framework: races become deterministic startup or editor errors rather than one-in-ten-thousand-frames corruption on a customer machine.

The structural discipline that keeps this honest is a written phase order for the frame, with each system assigned to a phase: input latch, AI decision, movement integration, physics step, collision response, gameplay resolution, animation extraction, presentation extraction. Within a phase, order is unconstrained and parallelism is free; between phases, order is total. A codebase where every system declares pairwise `UpdateAfter` relationships against a dozen others has an implicit phase structure that nobody has written down, and it will become unschedulable.

Parallelism has a floor below which it costs more than it returns. Scheduling a job, waking a worker and joining costs 5–50 µs; a system whose total work is 20 µs runs faster on the calling thread. Set a threshold — parallelise only above roughly 1,000 entities or 200 µs of work — and make it a property of the system rather than a decision each engineer makes independently, or a project accumulates dozens of jobs that each cost more to schedule than to execute.

Sync points are the cost that is easy to miss. Every point where the main thread waits for workers — structural change playback, a system that must run single-threaded, a read of results by non-ECS code — drains the job graph and idles every worker. A frame with fifteen sync points spends more time in ramp-up and drain than in work. Target three to five per frame and measure the gaps between jobs in a timeline capture, not just job durations.

## 5. Events and communication between systems

Systems cannot call each other — a direct call breaks the declared read/write sets that ordering and parallelism depend on, and it reintroduces the dependency graph the architecture exists to make explicit. So every ECS project needs a communication mechanism, and the choice has performance consequences.

**Component as message.** The producer adds a component (`DamageEvent { float amount; Entity source; }`) and the consumer queries for it and removes it after processing. This is idiomatic and it is a structural change per message, at 200–2,000 ns each — acceptable for hundreds of events per frame, ruinous for tens of thousands. Prefer it for infrequent, entity-targeted events such as death, level-up or quest completion.

**Accumulator component.** The target entity carries a permanent `IncomingDamage { float accumulated; }` that producers add to and a consumer reads and zeroes each frame. No structural change, single-digit nanoseconds per message, and it composes correctly with parallel producers if the accumulation is per-worker and reduced in a fixed order. Prefer it for high-frequency events. The cost is that the component exists on every entity that could ever receive one, which is a memory-versus-churn trade to make deliberately.

**Event queue as a resource.** A single append-only buffer per event type, written by producers with a per-worker segment, read by consumers in a later phase, cleared at a phase boundary. Cheapest per message (an append is a few nanoseconds), and it decouples entirely from entity storage. The cost is that ordering relative to entity iteration is no longer implicit, so the consuming phase must be explicit in the frame's phase order. Bevy's `Events<T>` with its double-buffered two-frame retention is this pattern; the two-frame window exists so a consumer running before the producer still sees the previous frame's events rather than dropping them.

The rule that keeps all three honest: an event is consumed in a later phase than it is produced, never in the same phase. Same-phase consumption makes the result depend on system order within a phase, which is exactly the property section 4 defines as unconstrained. If a system genuinely needs to observe another's output immediately, they belong in different phases and the phase order should say so.

Avoid the callback-based event bus imported from the object model. A system that invokes a subscriber's function during iteration executes arbitrary code with unknown read/write sets in the middle of a parallel loop, which defeats conflict analysis, prevents vectorisation, and reintroduces the exact non-determinism that makes replays and rollback impossible.

## 6. Relationships, hierarchies and parenting

The weakest part of the ECS model, and worth knowing before a project discovers it at the point where the inventory system is due.

An ECS stores flat homogeneous arrays. A parent-child hierarchy is a tree, and a tree traversal is a pointer chase — precisely the access pattern the architecture exists to avoid. Transform hierarchies must therefore be handled specially: Unity DOTS stores `Parent`, `Child` and `PreviousParent` components and runs a `LocalToWorld` system that walks the hierarchy in depth order each frame, and changing a parent is a structural change plus a rebuild of the affected subtree. The practical consequence is that deep hierarchies are expensive in ECS in a way they are not in a scene graph, so flatten where possible: a character with 60 attachment points is fine, a level with 12 levels of nested empty transforms is not.

Non-transform relationships — inventory containment, faction membership, targeting, ownership, ability sources — are worse, because most frameworks have no first-class representation and the naive encoding (a component holding an entity id) gives no way to query the inverse direction without a full scan. The options: maintain both directions manually and keep them consistent (error-prone, and the inconsistency bug is silent), maintain a side-table index rebuilt each frame (a hash map, which is fine at thousands of relationships and not at millions), or use a framework with relationships as a query primitive.

flecs is the notable framework with first-class relationships: a relationship is a `(relation, target)` pair stored like a component, queryable in both directions, with built-in transitivity and exclusivity constraints. If the game's data model is relationship-heavy — a colony sim, an RPG with deep inventories, a simulation with faction graphs — this is a stronger reason to prefer flecs than any performance difference between its storage and another's.

The pragmatic answer for most projects: keep hierarchies and relationships in the object layer of the hybrid (described in `architecture-ecs-decision.md`), and keep the ECS for the flat, homogeneous populations it is good at. A crowd of 50,000 agents has no hierarchy; the player's inventory has nothing but hierarchy.

## 7. Memory footprint and allocation behaviour

Layout changes total memory as well as access speed, and the direction is not always the one people expect.

ECS generally uses less memory per entity than an object model, because there is no vtable pointer (8 bytes per polymorphic object), no per-object allocator header (16–32 bytes with a typical malloc), no padding to allocator granularity, and entities that lack a component pay nothing for it. An entity with 40 bytes of components costs about 40 bytes; the equivalent object with three virtual base classes and heap-allocated sub-objects costs 150–250 bytes once headers and alignment are counted.

ECS can also use more, through two specific mechanisms. Partially filled chunks waste the remainder: Unity's 16 KiB chunk holding 12 entities of a fragmented archetype wastes most of 16 KiB, and 300 such archetypes waste around 4.5 MB for nothing. And sparse-set storage allocates index arrays across the entity id space, paged in practice but still proportional to the highest live id rather than to the entity count — an id space that grows monotonically because entities are created and destroyed without recycling produces steadily growing sparse arrays.

Allocation behaviour is the larger practical difference. An object model allocates and frees per entity, which in a C++ codebase fragments the heap and in a C# codebase feeds the garbage collector — and a non-generational, non-compacting collector like Unity's never returns that memory, so the process's resident high-water mark ratchets upward for the session. ECS allocates in chunks, so entity creation and destruction touch a free list inside an existing block and produce no allocator traffic at all. For a game spawning 500 projectiles a second, that difference alone can be the reason the ECS version has no GC hitches.

Budget with concrete numbers rather than impressions: measure bytes per entity (total component storage divided by live entities), chunk utilisation, and allocations per frame, and track all three. Studio: report them in the same build health check as archetype count. Solo: check bytes per entity once when the entity count is representative, because it is the number that determines whether the design fits the platform's memory budget.

## Pass conditions

Answer yes to every applicable line before the architecture decision is considered sound.

1. Archetype count and mean entities-per-chunk are reported by an automated build health check, with thresholds documented.
2. No system performs per-entity structural changes every frame; frequently toggled state uses an enabled bit or a field, not add/remove.
3. Structural changes are batched through command buffers played back at a documented, small number of sync points per frame.
4. Every system declares its read and write sets, and ordering between conflicting systems is expressed as a declared constraint rather than registration order.
5. The frame has a written phase order; systems are assigned to phases, and pairwise ordering constraints within a phase are the exception rather than the norm.
6. No system reads or writes mutable global or static state.
7. Data races are detected by the framework at editor or startup time, not left to code review.
8. Sync points per frame are counted and under the documented target; timeline captures show worker idle gaps within budget.
9. Events are consumed in a later phase than they are produced; no system invokes subscriber callbacks during iteration.
10. High-frequency inter-system messages use accumulator components or per-worker queues, not per-message structural changes.
11. Transform hierarchy depth is bounded and documented; non-transform relationships have a stated representation and a stated cost for inverse queries.
12. Bytes per live entity, chunk utilisation and allocations per frame are measured and inside documented budgets.
13. Steady-state gameplay produces zero allocator traffic from entity creation and destruction, verified by a profiler capture.
