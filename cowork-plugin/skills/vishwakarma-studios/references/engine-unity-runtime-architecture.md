# Unity: Runtime Architecture and Performance

Unity is the fastest engine in the industry for getting a playable build onto an unusual device. Its C# iteration loop, its editor extensibility, and its platform matrix — mobile, Switch, WebGL, XR headsets, set-top boxes — are unmatched, and a competent team can go from empty project to store submission without writing a line of native code. The cost is that Unity gives you very little architecture: the default component model scales badly past a few thousand active objects, memory behaviour is governed by a non-generational garbage collector you must design around, and every subsystem worth using at scale (DOTS, Addressables, SRP, Input System, Netcode) is an opt-in package with its own maturity curve and its own migration tax. Unity rewards teams that impose discipline on it early and punishes teams that discover the need for discipline in month eighteen.

Version pinning throughout: Unity 6 (`6000.0` LTS) is the baseline for new production, `2022.3` LTS for projects already shipping on it. Package versions cited are the ones that ship with those streams.

## 1. The component model and what it actually costs

A `GameObject` is a native C++ object holding a `Transform` plus a list of native `Component` pointers. A `MonoBehaviour` is a managed C# object with a native peer; the two are joined by a handle, and every access from C# to engine data crosses that boundary. This is why `transform.position` is a property call into native code and not a field read, why caching `transform` in `Awake` measurably beats repeated `this.transform` on older versions, and why `GetComponent<T>()` in a hot path is a native type-lookup rather than a dictionary hit you can reason about.

The consequential number is the per-object cost of engine-invoked messages. `Update`, `LateUpdate`, `FixedUpdate`, `OnTriggerEnter` and friends are not virtual calls. Unity maintains native lists of registered receivers and invokes each one across the managed/native boundary individually. An empty `Update()` costs roughly 0.1–0.4 µs per object per frame depending on platform and scripting backend, dominated by the transition and the marshalling, not by your code. At 10,000 objects that is 1–4 ms of a 16.67 ms frame budget spent executing nothing. On a 33.3 ms mobile budget it is survivable; on a 11.1 ms XR budget it has already eaten a third of the frame.

The fix is an update manager. Register objects with a single dispatcher and iterate them yourself:

```csharp
public interface ITickable { void Tick(float dt); }

public sealed class TickDriver : MonoBehaviour {
    static readonly List<ITickable> s_Tickables = new List<ITickable>(4096);
    public static void Register(ITickable t) => s_Tickables.Add(t);
    void Update() {
        float dt = Time.deltaTime;
        for (int i = 0, n = s_Tickables.Count; i < n; i++) s_Tickables[i].Tick(dt);
    }
}
```

One boundary crossing per frame instead of N. An interface call through a `List<T>` indexer is single-digit nanoseconds. The same measurement done on 10,000 objects drops from ~2 ms to ~0.05 ms. Solo: adopt this the moment you exceed roughly 500 ticking objects. Studio: make it the only sanctioned way to tick, enforced by a Roslyn analyser or an assembly-scanning editor test that fails CI when a `MonoBehaviour` outside an allowlist declares `Update`.

Order of magnitude for budgeting, measured with an empty method body on mid-range hardware:

| Construct | Cost per object per frame | 10,000 objects |
|---|---|---|
| Empty `MonoBehaviour.Update` | 0.1–0.4 µs | 1–4 ms |
| Empty `MonoBehaviour.FixedUpdate` at 50 Hz | same per step, ~0.83 steps/frame at 60 fps | 0.8–3.3 ms |
| Interface call from a central `List<T>` loop | 2–5 ns | 0.02–0.05 ms |
| Burst job over a `NativeArray` | 0.1–1 ns amortised | 0.001–0.01 ms |

The ordering of `Update` calls between objects is undefined unless you set Script Execution Order, which is a project-wide list keyed by script type and therefore does not scale as a coordination mechanism past a dozen entries. A central dispatcher gives you explicit phase ordering (input, simulation, animation, presentation) as data rather than as a settings screen, which is the second reason to adopt it after the performance one.

Secondary component-model costs worth internalising. `SetActive` on a deep hierarchy walks and dirties every child transform and fires `OnEnable`/`OnDisable` on every behaviour, so deactivate at the root of a pooled object rather than toggling leaves. `Instantiate` of a prefab deserialises the prefab's object graph and allocates managed peers for every `MonoBehaviour` on it, which is why a 40-component prefab costs 20–60x what a 2-component prefab costs to spawn. `Camera.main` is a `FindGameObjectWithTag` in versions before 2020.2 and cached after; cache it regardless because the behaviour differs by version.

## 2. DOTS, Burst, and the Job System: when the rewrite pays

DOTS is three separable technologies and conflating them is the most common planning error.

| Technology | What it buys | Adoption cost | Adopt independently? |
|---|---|---|---|
| Burst compiler | LLVM compilation of unmanaged C# with auto-vectorisation and no bounds checks in release; 3–15x on math-heavy loops | Code must be `struct`, no managed types, no exceptions beyond limited support | Yes — highest value per unit of risk |
| C# Job System | Multi-core work distribution with a race-condition safety system enforced at runtime in the editor | Data must live in `NativeArray`/`NativeList`; no managed references inside jobs | Yes — pairs naturally with Burst |
| Entities (ECS) | Archetype-chunked memory layout, linear iteration, cache coherence, entity counts in the 10⁵–10⁶ range | Total rewrite of gameplay architecture; separate physics, no `Animator`, no UI, separate rendering path | No — this is the expensive one |

The Burst-plus-Jobs shape, applicable without ECS:

```csharp
[BurstCompile(FloatPrecision.Standard, FloatMode.Fast)]
struct IntegrateJob : IJobParallelFor {
    [ReadOnly] public NativeArray<float3> Velocity;
    public NativeArray<float3> Position;
    public float DeltaTime;
    public void Execute(int i) => Position[i] += Velocity[i] * DeltaTime;
}

// Schedule with a batch size large enough to amortise scheduling (~64–256 typical),
// then Complete() before the results are read, or carry the JobHandle to next frame.
var handle = new IntegrateJob {
    Velocity = m_Velocity, Position = m_Position, DeltaTime = Time.deltaTime
}.Schedule(m_Position.Length, 128);
```

Three mechanisms make this work and each is also a constraint. Burst compiles only unmanaged code, so a captured managed reference is a compile error rather than a slow path. The job safety system tracks read and write dependencies on every `NativeArray` and throws in the editor when two jobs alias the same data without a dependency, which converts a class of nondeterministic race into a deterministic editor exception. `NativeArray` allocators are explicit — `Allocator.Temp` (one frame, stack-like, cheapest), `Allocator.TempJob` (up to four frames, checked), `Allocator.Persistent` (manual dispose) — and a mismatched allocator leaks native memory that the GC cannot reclaim, which shows up as steadily climbing native memory in the Memory Profiler rather than as a managed leak.

Burst and Jobs are worth adopting in almost any project with a measurable CPU simulation cost, and you can apply them to a conventional `GameObject` project by moving the numeric core into `NativeArray`-backed jobs and writing results back once per frame. `Mesh.MeshData`, `Physics.RaycastCommand`, `Physics.SpherecastCommand`, `TransformAccessArray`, and the animation jobs API exist specifically to let a classic project use jobs without ECS.

Full Entities ECS pays for itself when the entity count is genuinely large and homogeneous — 10,000+ agents, particles simulated on CPU, projectiles, grid simulations, RTS units, large-scale traffic or crowd systems — because the win is cache behaviour: entities of the same archetype are packed contiguously in 16 KiB chunks, so iterating a component is a linear stream instead of a pointer chase across a fragmented managed heap. On a workload of 100,000 position-plus-velocity updates the difference between chunk-linear SIMD iteration and 100,000 `MonoBehaviour.Update` calls is roughly two orders of magnitude, and that is a real, reproducible number.

It is cargo cult when the entity count is in the hundreds, when the bottleneck is GPU-bound (fill rate, overdraw, shader cost) or draw-call-bound, or when the game is content-heavy and logic-light — most narrative games, most puzzle games, most mobile F2P. Rewriting a 300-actor game in ECS buys sub-millisecond gains and costs you `Animator`, `Canvas`, the Inspector workflow your designers understand, and every third-party asset you bought.

Hybrid renderer reality: Entities Graphics requires a Scriptable Render Pipeline (URP or HDRP); it does not work with the Built-in pipeline. Baking converts subscenes of `GameObject`s into entity data at build time, and the authoring/runtime split means the thing your designers edit is not the thing that runs, so tooling and debugging both get harder. Skinned mesh support, particle systems, UI, terrain and audio remain `GameObject` systems, so most shipped DOTS titles are hybrids where ECS owns simulation and `GameObject`s own presentation. Budget the seam between them as real engineering work — it is usually the largest single source of DOTS project delay.

Studio: mandate Burst plus Jobs for all simulation code from project start; gate Entities adoption on a written profile showing the specific system that needs it. Solo: use Burst and Jobs; treat Entities as a research project unless the game concept is unambiguously mass-simulation.

## 3. Garbage collection and allocation discipline

Unity's Mono/IL2CPP runtimes use a Boehm–Demers–Weiser collector: non-generational, non-compacting, conservative. Non-generational means a collection scans the whole heap rather than a cheap nursery, so collection time grows with total live objects. Non-compacting means the heap fragments and, once expanded, it effectively does not shrink back for the process lifetime — a single frame that allocates 200 MB permanently raises your resident memory ceiling, which on iOS is a jetsam kill and on Switch is an out-of-memory crash.

Incremental GC (default since 2019.3, `PlayerSettings.gcIncremental`) splits the mark phase across frames using write barriers, converting a 15 ms hitch into a series of sub-millisecond slices. It does not reduce total GC work; it adds a few percent overhead in exchange for distributing it. The sweep phase is still atomic. Incremental GC makes allocation-heavy code survivable, not correct.

The allocation sources that matter, each with its mechanism:

- **String concatenation.** `"Score: " + score` allocates a new `string` plus a boxed `int` if the overload resolves through `object`. Per frame at 60 fps this is 3–7 KB/s per call site. Use `TMP_Text.SetText("Score: {0}", score)` which formats into a preallocated buffer, or a cached `StringBuilder` with `Clear()`.
- **Boxing in `foreach` over non-generic collections.** `ArrayList`, `Hashtable`, and any `IEnumerable` iterated through the interface allocate an enumerator on the heap and box value types. `foreach` over `List<T>` or an array is allocation-free because the compiler binds directly to the struct enumerator; `foreach` over `IList<T>` typed as the interface is not, because the struct enumerator is boxed to satisfy `IEnumerator<T>`.
- **Closures capturing locals.** Every lambda that captures a local variable allocates a compiler-generated display class per invocation. A callback registered in `Update` allocates 32–48 bytes every frame forever. Capture nothing, or hoist the closure into a field created once.
- **API that returns arrays.** `Physics.RaycastAll`, `Physics.OverlapSphere`, `GetComponents<T>()`, `Mesh.vertices`, `Input.touches`, and `GameObject.tag` all allocate. Their non-allocating counterparts — `Physics.RaycastNonAlloc`, `GetComponents<T>(List<T>)`, `Mesh.GetVertices(List<Vector3>)`, `CompareTag` — exist for exactly this reason.
- **`Debug.Log` in shipped code.** Log calls allocate the message string and a stack trace even when the console is not visible. Strip them with `[Conditional("UNITY_EDITOR")]` wrappers or set stack trace type to `None` per log level in Player Settings.

Coroutines and `async` deserve their own note because both are allocation sources hiding behind convenient syntax. `StartCoroutine` allocates the iterator state machine plus a `Coroutine` handle, and every `yield return new WaitForSeconds(1f)` allocates a fresh instruction object — cache the `WaitForSeconds` in a field, since it is immutable and reusable. `async`/`await` in Unity allocates the async state machine on the heap whenever the method actually suspends, and `Task` continuations resume on Unity's synchronisation context with an additional allocation per hop; if you need heavy async, use UniTask or an equivalent struct-based awaitable, which avoids both allocations by making the state machine a value type.

Rough per-frame allocation budget arithmetic worth carrying in your head: 1 KB per frame at 60 fps is 3.5 MB per minute and 210 MB per hour. Because the heap does not compact and does not return memory to the OS, that hour-long session ends with a heap high-water mark far above live-set size, and on a 3 GB-class mobile device that is the difference between shipping and being killed by the OS memory manager during a long play session.

Object pooling is the structural answer for anything spawned more than a few times per second. `UnityEngine.Pool.ObjectPool<T>` (2021.1+) provides the plumbing; the discipline is that pooled objects must fully reset their state in `OnGet`, because a pooled object retains coroutine handles, timers, physics velocities, particle state and animator parameters from its previous life. The single most common pooling bug is a `Rigidbody` re-enabled with its old `linearVelocity`.

Budget: a shipped frame should allocate 0 bytes in steady state. Verify with the Profiler's GC Alloc column sorted descending, and enforce it with a Profile Analyzer comparison in CI that fails when median per-frame `GC.Alloc` exceeds a threshold.

## Pass conditions

Answer yes to every applicable line before the project is considered correctly set up.

1. No `MonoBehaviour` outside an explicit allowlist declares `Update`, `LateUpdate` or `FixedUpdate`; ticking goes through a central dispatcher.
2. Profiler capture from a development build on the target device shows median per-frame `GC.Alloc` of 0 B in steady-state gameplay.
3. Every pooled prefab type resets rigidbody velocity, animator state, coroutines and timers on acquire, verified by a test.
4. Every `NativeArray` allocated with `Allocator.Persistent` has a matching `Dispose`, verified by the job system's leak detection being enabled in CI runs.
