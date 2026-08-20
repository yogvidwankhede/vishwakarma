# Architecture: Choosing Between ECS and OOP

ECS is a memory-layout decision that pays off at entity counts, not a moral position. The entire argument for it reduces to one hardware fact — a main-memory access costs 200–350 cycles while an arithmetic operation costs one — and therefore to the question of whether your per-entity work is large enough to hide that latency or small enough to be dominated by it. Below a few thousand entities doing non-trivial work each, the cache behaviour that ECS buys is worth less than the complexity it costs, and the correct answer is plain objects. Above tens of thousands of entities doing simple homogeneous work, the difference is one to two orders of magnitude and no amount of clever OOP recovers it. Decide with the entity count and the per-entity instruction count in hand, and record both.

## 1. The mechanism: cache lines, AoS, and SoA

A CPU does not read memory; it reads cache lines. On x86-64 and ARM64 a line is 64 bytes (128 bytes on Apple silicon), and every access pulls in the whole line whether you use it or not. The cost hierarchy on a current desktop core, in cycles and in nanoseconds at 3.5 GHz:

| Level | Latency (cycles) | Latency (ns) | Typical capacity |
|---|---|---|---|
| L1 data | 4–5 | ~1.3 | 32–48 KiB per core |
| L2 | 12–20 | ~4 | 512 KiB – 2 MiB per core |
| L3 (shared) | 40–60 | ~15 | 8–96 MiB |
| DRAM | 200–350 | 60–100 | GiB |

The consequence: a single L1 hit costs about as much as one multiply, and a single DRAM miss costs as much as roughly 250 multiplies. A loop that misses cache on every iteration is not slightly slower than a cache-friendly one, it is spending 99% of its time waiting.

Two layouts for the same data. Array of structures (AoS) stores each entity's fields adjacently:

```cpp
struct Entity { float3 pos; float3 vel; Quat rot; float health; /* 60 more bytes */ };
std::vector<Entity> entities;      // one entity per ~128 bytes
```

Structure of arrays (SoA) stores each field contiguously across entities:

```cpp
struct World {
    std::vector<float3> pos;       // 12 bytes each, 5.33 per 64-byte line
    std::vector<float3> vel;
    std::vector<float>  health;
};
```

A system that integrates position from velocity touches 24 bytes per entity. Under AoS with a 128-byte entity, every entity costs two cache lines of which 24 bytes are used — 81% of the bandwidth is wasted, and the working set for 100,000 entities is 12.8 MB, which exceeds most L3 caches, so the loop streams from DRAM. Under SoA the same system touches two contiguous arrays totalling 2.4 MB, uses every byte of every line, and the hardware prefetcher recognises the linear stride and issues loads ahead of demand, hiding most of the remaining latency.

The measured shape of that difference on 100,000 entities integrating position from velocity, single-threaded, mid-range desktop core:

| Layout | Per-entity cost | Total | Why |
|---|---|---|---|
| Pointer-chased objects (`vector<Entity*>`, heap-allocated, virtual `Update()`) | 80–150 ns | 8–15 ms | One DRAM miss per entity for the object, another for the vtable target, plus an unpredicted indirect branch |
| Contiguous AoS, non-virtual | 8–15 ns | 0.8–1.5 ms | Prefetcher works, but 80% of each line is unused payload |
| SoA, scalar | 1.5–3 ns | 0.15–0.3 ms | Full line utilisation, prefetch-friendly |
| SoA, auto-vectorised (SSE/AVX/NEON) | 0.3–0.8 ns | 0.03–0.08 ms | 4–8 entities per instruction |

That is the whole case, and it is roughly two orders of magnitude between the first row and the last. Note where the cost actually lives: the dominant term in row one is not the virtual call. A correctly predicted indirect branch costs 2–3 cycles; a mispredicted one costs 15–25. Both are noise beside a 250-cycle miss. The reason 100,000 virtual calls is slow is that the objects behind those calls are scattered across a fragmented heap, so each call is preceded by a miss to fetch the object, a second to fetch its vtable pointer's target, and a third to fetch whatever data the method reads. Removing `virtual` from scattered objects buys almost nothing; making them contiguous buys nearly everything.

Two further mechanisms follow from the same fact. Branch divergence inside a hot loop — `if (entity->type == Flying)` evaluated per entity in random order — costs a mispredict roughly half the time; ECS removes it structurally by putting flying entities in a different archetype, so the loop over flyers has no branch at all. And auto-vectorisation requires contiguity plus the absence of aliasing: a compiler will emit AVX for a loop over two disjoint float arrays and will refuse for a loop over pointers it cannot prove disjoint.

## 2. What ECS actually is, stripped of framework

Three ideas, separable, and worth naming individually because teams adopt one and claim to have adopted all three.

**Entity**: an integer identity, usually a 64-bit pair of index and generation. Generation exists so that a stale handle to a destroyed entity is detectable rather than silently valid after the index is reused — the classic dangling-pointer bug becomes a cheap equality check.

**Component**: plain data, no methods, no inheritance, ideally trivially copyable. The constraint that matters is that it must be relocatable in memory, because the storage will move it.

**System**: a function over a query. It declares the component set it reads and writes, receives contiguous spans, and loops. It holds no per-entity state.

The performance win comes from the storage, not from the vocabulary. A codebase with classes named `PositionComponent` containing an `Update()` method and a pointer to its owner has adopted the vocabulary and none of the mechanism, and will measure exactly the same as the object-oriented code it replaced. This is the single most common failed ECS adoption.

## 3. The break-even

Be concrete. ECS pays when the total per-frame cost of the systems it accelerates is a meaningful fraction of the frame budget. That cost is entity count multiplied by per-entity work, so both numbers matter and neither alone decides.

| Entity count | Per-entity work | Verdict |
|---|---|---|
| < 1,000 | Any | Plain OOP. At 1,000 entities and 150 ns each, the naive version costs 0.15 ms — 1% of a 60 fps budget. ECS returns 0.14 ms and costs you months of tooling. |
| 1,000–10,000 | Trivial (transform, timer, integration) | Data-oriented arrays for those systems specifically; a full ECS is not required. Expect 1–3 ms recovered. |
| 1,000–10,000 | Heavy (path-finding, behaviour trees, animation) | The per-entity work dominates the memory access, so layout buys little. Optimise the work, not the layout. |
| 10,000–100,000 | Trivial to moderate | ECS territory. This is where 10 ms becomes 0.5 ms and the frame budget is actually decided by the choice. |
| > 100,000 | Any | ECS or a hand-rolled SoA simulation. Nothing else fits in a frame. |

The complexity price, stated so it can be weighed rather than waved at: expect 2–6 weeks of engineer time to reach productivity on an ECS framework the team has not used, a permanent tax on debugging (a breakpoint tells you which system, not which entity, and inspecting one entity's full state requires tooling you write), loss of the engine's inspector and animation and UI systems in the case of Unity DOTS and Unreal Mass, and a hiring and onboarding cost because ECS fluency is less common than OOP fluency. Against that, the return is a number you can measure before committing: profile the systems you intend to convert, and if their combined cost is under 15% of the frame budget, converting them cannot buy more than 15%.

There is a second break-even that has nothing to do with performance and frequently dominates the decision: serialisability. If the game requires deterministic rollback, lockstep networking, or full replay, the simulation state must be snapshotted and restored in well under a millisecond, and that requires POD data in contiguous arrays regardless of entity count. A fighting game with 30 entities has no performance case for ECS whatsoever and may still be correct to build data-oriented, because rolling back an object graph with 30 objects, each holding references, timers and coroutines, is substantially harder than memcpy-ing three arrays. Say which of the two reasons applies before choosing, because they lead to different designs: the performance reason wants maximum entity throughput, the serialisability reason wants minimal, flat, copyable state and does not care about throughput at all.

The honest decision procedure. Profile first and identify the top three CPU costs. If they are draw calls, GPU fill rate, shader cost, asset loading or garbage collection, ECS returns nothing — those are not solved by memory layout. If they are per-entity simulation loops with high entity counts, measure the count and the per-entity nanoseconds and consult the table. Studio: require this profile as a written artefact before an architecture change is approved. Solo: assume the answer is no unless the game concept is explicitly mass-simulation — an RTS, a bullet hell, a colony sim, a large-scale crowd or traffic system, a voxel or particle simulation.

## 4. Data-oriented design without ECS

Most of the win in section 1 is available without any framework, and taking it first is the highest-return, lowest-risk move in this entire document.

**Hot/cold splitting.** Divide each class into the fields touched every frame and the fields touched rarely. Keep the hot fields in a contiguous array indexed by a handle; keep the cold fields in a separate array or an object the hot record points at. A 400-byte enemy class where 24 bytes are read per frame becomes a 24-byte hot record — 2.6 entities per cache line instead of 0.16 — and the per-entity cost drops by the ratio of the sizes without touching a single line of gameplay logic. This is a mechanical refactor, it is reversible, and it typically recovers 3–8x on the affected loop.

**Handles instead of pointers.** Replace `Enemy*` with a 32-bit index plus generation into a dense array. This makes the storage relocatable (so it can be compacted, sorted or reallocated), makes stale references detectable, halves the size of every reference on 64-bit targets, and removes an indirection from every access. It is a prerequisite for everything else and it is worth doing even in a codebase that will remain object-oriented forever.

**Sort for coherence.** If a loop must branch on a type or a state, sort the array by that key once and the branch becomes predictable — a mispredict rate near 50% falls to near zero, worth 10–20 cycles per entity. Sorting draw submissions by material and mesh does the same thing for the render thread, which is why it is the standard structure of every render queue.

**Batch, then call.** Where an engine offers a batched API — `Physics.RaycastCommand` in Unity, `ParallelFor` in Unreal, instanced draw submission anywhere — one call over N items beats N calls by the full per-call overhead, which for a managed-to-native boundary crossing is 0.1–0.4 µs each. At 5,000 raycasts that is the difference between 2 ms and 0.1 ms, and it requires no architectural change at all.

**Structures of arrays for the two or three systems that matter.** Take the profiler's top entries, put their data in parallel arrays, iterate them linearly, and write results back once per frame. This is the first step of the incremental adoption path in `architecture-ecs-production.md` and, for the large majority of games, it is also the last step.

The point of this section is that "data-oriented" and "ECS" are not synonyms. Data-oriented design is a set of layout techniques applicable to any codebase; ECS is one particular packaging of those techniques with a framework attached. Take the techniques first and the framework only when the bookkeeping of doing it by hand exceeds the cost of the framework.

## 5. When plain OOP is correct

Naming these plainly matters more than the ECS case, because the ECS case is the one that gets argued in public and the OOP case is the one that describes most shipped games.

**Low entity counts.** Under a few thousand simulated entities, memory layout is not the bottleneck and no amount of layout work changes the frame time meaningfully. Most narrative games, most puzzle games, most adventure games, most turn-based games, and the overwhelming majority of mobile free-to-play titles live here permanently.

**Deep behavioural polymorphism.** When entities differ mainly in what they do rather than in what data they hold — 60 distinct spell effects, 40 unique boss behaviours, an inventory of items with bespoke rules — virtual dispatch is the correct tool and the cost is irrelevant because there are 60 of them, not 60,000. Encoding "unique behaviour per instance" into an ECS produces either 60 systems each processing one entity, or one system with a 60-way switch, and both are worse than a virtual call in every dimension including performance.

**Small teams.** ECS shifts complexity from the individual object into the framework, the queries and the scheduling. A team of two absorbing that alongside shipping a game will spend the first three months building infrastructure. The engine's built-in object model comes with an inspector, a debugger, a serialiser and a decade of Stack Overflow answers.

**Tooling maturity.** Unity's Inspector, Unreal's Blueprint and details panel, and Godot's scene tree are all built on the object model. Adopting ECS in those engines means losing them for ECS-managed data until you rebuild equivalents, and designers who cannot inspect a value cannot tune it.

**Code that is written once and runs rarely.** Menu logic, save systems, quest state, dialogue, achievement tracking, matchmaking. Runtime cost is zero-adjacent; clarity is the only metric. Write classes.

**Anything a designer edits directly.** The engine's object model is what its editor is built around. An entity that a designer places, tunes and previews benefits more from the inspector, the undo stack and the prefab system than from cache locality, and moving it into ECS means rebuilding all three before the designer can work at the rate they did before.

## 6. The hybrid reality

State this plainly because the discourse obscures it: most shipped games, including most AAA titles, are object-oriented codebases with data-oriented hot paths, not pure ECS. The pattern is that gameplay actors, quests, UI, dialogue and progression are ordinary objects, and the systems that handle large homogeneous populations — particles, projectiles, crowds, foliage, decals, audio voices, navigation agents — are flat arrays processed in tight loops, frequently with SIMD or job parallelism, and frequently not described by anyone as "an ECS".

This is not a compromise position arrived at through weakness; it is the correct allocation of complexity. Each subsystem gets the architecture matched to its entity count. Overwatch's ECS talk is widely cited as an endorsement of full ECS adoption, and the same talk describes a system that exists because that specific game has a specific determinism and networking requirement. Unity's own DOTS-shipped titles are overwhelmingly hybrids in which entities own simulation and `GameObject`s own presentation.

The practical shape of a hybrid, and the seam to budget for: ECS or flat arrays own the simulation state and advance it on the fixed clock; the object layer owns presentation and reads simulation state each frame through a defined extraction step; the extraction step is one-directional, so the object layer never writes back into simulation state. That one-directional rule is what prevents the hybrid from becoming a bidirectional synchronisation problem, which is where hybrid projects actually fail. Budget the seam explicitly — in Unity DOTS projects the entity-to-`GameObject` synchronisation layer is routinely the largest single source of schedule slip.

Two concrete hybrid patterns worth naming. **Representation LOD**: nearby entities are full objects with animation, physics and audio; distant entities are ECS records rendered as instanced meshes, and the transition between the two is a defined promotion and demotion. This is exactly what Unreal's `MassRepresentation` implements, and it is how open-world crowd and traffic systems reach populations of tens of thousands without tens of thousands of actors. **Simulation core with object shell**: the authoritative simulation is a flat data-oriented layer, and each object in the object layer is a view onto one simulation record, holding only its index and its presentation state. Gameplay scripts and designers interact with the shell; the simulation never knows the shell exists.

Solo: build hybrid by default — objects for everything, arrays for the one or two systems that measure hot. Studio: make the hybrid boundary an architectural decision recorded with named owners for each side, because an undefined boundary is where two teams write the same synchronisation code twice with different assumptions.

## 7. Decision summary

| Signal | Architecture |
|---|---|
| Under 1,000 simulated entities | Plain objects; do not evaluate further |
| Bottleneck is GPU, draw calls, loading or GC | Neither; fix the actual bottleneck |
| 1,000–10,000 entities, two or three hot systems | Objects plus SoA arrays for those systems (section 4) |
| Deep per-instance behavioural variety, low counts | Objects with virtual dispatch |
| Relationship-heavy data model (inventories, factions, hierarchies) | Objects, or flecs specifically |
| 10,000+ homogeneous entities, simple per-entity work | ECS for those populations; hybrid overall |
| Determinism, rollback or replay is a hard requirement | ECS or a hand-rolled POD simulation, chosen for serialisability rather than for cache behaviour |
| Custom C++ engine, need composition without a scheduler | EnTT |
| Unity, mass simulation is the game concept | DOTS Entities, after adopting Burst and Jobs alone first |
| Unreal, crowds or traffic alongside a normal actor game | Mass Entity for the populations, actors for everything else |

## Pass conditions

Answer yes to every applicable line before the architecture decision is considered sound.

1. A written profile from the target device names the top three CPU costs, and the architecture decision references it.
2. Entity count and measured per-entity nanoseconds are recorded for each system proposed for conversion, and the projected saving is stated as a fraction of the frame budget.
3. No ECS adoption is justified by a bottleneck that is GPU-bound, draw-call-bound, allocation-bound or load-time-bound.
4. Components contain data only: no methods beyond trivial accessors, no inheritance, no references to owning entities.
5. Entity handles carry a generation counter; a stale handle is detectable rather than silently aliasing a recycled index.
6. The hybrid boundary between ECS-managed simulation state and object-managed presentation is documented, one-directional, and has a named owner on each side.
7. If the project is under 1,000 simulated entities, the architecture is plain objects, and any deviation is recorded with the measurement that justified it.
8. Hot/cold field splitting and handle-based references have been applied to the top profiled systems before any framework adoption was considered.
