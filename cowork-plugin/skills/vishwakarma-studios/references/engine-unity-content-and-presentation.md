# Unity: Content, Assets, and Presentation

How a Unity project delivers, authors and renders its content: the asset delivery systems, the data and prefab authoring model, the render pipeline and batching choices, and the physics and input subsystems that sit between them. Runtime architecture, allocation discipline and the DOTS decision are covered in `engine-unity-runtime-architecture.md`; builds, profiling and team practice in `engine-unity-builds-and-team-operations.md`.

## 1. Asset delivery: Addressables, Resources, AssetBundles

Pick exactly one primary system. Mixing them causes asset duplication, because each system computes dependencies independently and an asset reachable from two systems is serialised twice into the build.

| | Resources | AssetBundles | Addressables |
|---|---|---|---|
| Included in build | Everything in the folder, referenced or not | Only what you assign | Only what you assign |
| Patchable / downloadable | No | Yes, manually hosted | Yes, with catalogs and content update workflow |
| Ref counting and unload | None; whole-heap `UnloadUnusedAssets` | Manual per bundle | Automatic per handle |
| Dependency resolution | Implicit, at build | You write it | Automatic, with duplicate analysis |
| Startup cost | Index build proportional to entry count | Bundle manifest load | Catalog load, remote-capable |
| Sane ceiling | ~20 assets | Any, with a build engineer | Any |

**Resources is a trap at scale** and the mechanism is specific. Everything under any folder named `Resources` is force-included in the build regardless of whether anything references it, merged into a single serialised archive with a lookup index built at application start. Consequences: build size grows with unused content, the index adds startup time roughly linearly with entry count (hundreds of milliseconds at a few thousand assets, seconds at tens of thousands), the archive cannot be patched or downloaded, and there is no ref-counted unload — `Resources.UnloadUnusedAssets` is a whole-heap sweep costing 50–500 ms. Resources is acceptable for a handful of bootstrap assets under about 20 entries: a loading screen, a default material, a settings asset. Past that it is a shipping-blocker in disguise.

**AssetBundles** are the low-level primitive: you define bundles, you resolve dependencies, you manage load order, ref counting, variants, and CDN layout by hand. Choose this only if you have an existing custom pipeline and a build engineer who owns it.

**Addressables** (1.21.x on 2022.3, 2.x on Unity 6) is AssetBundles plus a catalog, ref counting, async handles, remote hosting, and content update workflows. It is the default answer for anything with DLC, patching, or a memory budget that requires unloading. The two failure modes to design against: (1) duplicated dependencies, where an asset referenced by two groups is packed into both — run the Addressables Analyze rule "Check Duplicate Bundle Dependencies" in CI and route shared assets to an explicit shared group; (2) handle leaks, where `Addressables.LoadAssetAsync` results are never released, so ref counts never reach zero and nothing unloads. Wrap loads in a scope object that releases on dispose, and assert on non-zero outstanding handles at scene teardown.

Group layout is a memory-versus-count trade: one bundle per asset gives perfect granularity and thousands of HTTP requests plus per-bundle overhead of roughly 4–8 KB; one bundle per thousand assets gives one request and forces you to hold the whole bundle resident. Target bundles of 2–20 MB grouped by co-loading lifetime, not by asset type.

## 2. ScriptableObjects as data and as architecture

A `ScriptableObject` is a `UnityEngine.Object` that lives as an asset rather than on a `GameObject`. The runtime property that matters: an SO asset is loaded once and shared by every referencing object. That makes it correct for immutable configuration — weapon stats, enemy definitions, localisation tables, tuning curves — and it removes the duplicated-data cost of putting the same 200 fields on 500 prefab instances.

The serialisation gotchas are sharp and all follow from one mechanism: the editor writes mutations back to the asset on disk, the player does not.

- Mutating an SO at runtime in the editor persists across play sessions, silently corrupting your tuning data. In a player build the same mutation is discarded on quit. This asymmetry produces the classic "it worked in the editor, the save data is wrong in the build" bug. Treat SOs as read-only at runtime, or clone with `Instantiate(asset)` when you need mutable per-session state.
- Unity's serialiser does not support `Dictionary`, does not serialise `null` for plain-class fields (a `null` custom class deserialises as a default-constructed instance), does not serialise properties, and has a default nesting depth limit of 7 levels for non-`UnityEngine.Object` types.
- Polymorphic fields require `[SerializeReference]` (2019.3+), which stores a type name; renaming or moving that type breaks every asset referencing it unless you add `[MovedFrom]`.
- Two SOs referencing each other is fine; an SO referencing a scene `GameObject` is not — scene objects have no persistent asset identity and the reference serialises as null in a build.

The safe pattern is a read-only definition asset plus a mutable runtime instance created from it:

```csharp
[CreateAssetMenu(menuName = "Game/Weapon Definition")]
public sealed class WeaponDefinition : ScriptableObject {
    [SerializeField] float m_BaseDamage = 10f;
    [SerializeField] AnimationCurve m_FalloffByDistance;
    public float BaseDamage => m_BaseDamage;                       // read-only accessor
    public float DamageAt(float d) => m_BaseDamage * m_FalloffByDistance.Evaluate(d);
    public WeaponRuntime CreateRuntime() => new WeaponRuntime(this); // mutable state lives here
}
```

Exposing only getters makes the editor-persistence hazard structurally impossible rather than a matter of team discipline, which is the difference between a convention and a guarantee.

As architecture, the SO event/variable pattern (an SO holding a value plus a change event, injected into prefabs by reference) decouples systems without singletons and lets designers rewire behaviour in the Inspector. Its cost is that dataflow becomes invisible to static analysis: you cannot find call sites by searching code, only by searching asset references. Studio: use SOs for data and for designer-tunable configuration; be sceptical of SO-as-event-bus in a codebase above roughly 200k lines, where the loss of greppability outweighs the decoupling.

## 3. Prefabs, variants, and the merge reality

Nested prefabs and prefab variants (2018.3+) store overrides as a modification list: each override is a tuple of target object file ID, property path string, and value. A variant is a prefab whose base is another prefab plus that modification list. This is powerful — a base enemy with twelve variants shares one hierarchy and one set of components — and it is the primary source of team merge pain, because a structural change in the base (reordering components, renaming a child) invalidates the file IDs that variants' modification lists point at, and the failure is silent: overrides simply stop applying.

Mitigations with mechanisms:

- Set Asset Serialization to Force Text and Version Control to Visible Meta Files. Binary serialisation makes merges impossible; text at least makes them attemptable.
- Install UnityYAMLMerge as the merge driver for `*.prefab`, `*.unity`, `*.asset`. It understands Unity's YAML document-per-object structure and file ID identity, where a line-based merge does not. Configure `mergespecfile.txt` and register it in `.gitconfig` or the Perforce typemap.
- Keep prefab hierarchies shallow. Merge difficulty scales with the number of objects carrying overrides, not with file size.
- Enforce single ownership of base prefabs. Structural edits to a base with many variants are a scheduled, announced operation, not an incidental commit.
- Split scenes. A single large `.unity` file is a serialised list of every object in it, so two people editing opposite ends of a level still collide on the same file and, under exclusive checkout, block each other outright. Additive scene loading with one scene per ownership domain (terrain, lighting, encounters, audio, navigation) converts a checkout bottleneck into parallel work, and it is also the mechanism that makes streaming possible later.
- Prefer composition-by-reference over deep variant chains beyond two levels. A three-deep variant chain multiplies override resolution ambiguity and no one on the team will predict the result correctly.

## 4. Render pipelines and batching

Choose by target platform and shipping constraints, not by marketing screenshots.

| Pipeline | Target | Hard constraints | Choose when |
|---|---|---|---|
| Built-in | Legacy projects only | No SRP Batcher, limited to legacy shader authoring, effectively frozen | Existing project mid-production with a large custom shader library |
| URP | Mobile, Switch, XR, mid-spec PC/console, WebGL | Forward+ (Unity 6) or Forward/Deferred; per-object light limits; fewer high-end features | Default for new projects unless the target is exclusively high-end |
| HDRP | High-end PC, PS5/Xbox Series | Requires compute shaders and DX11 SM5.0+/Vulkan/Metal; no GLES; no mobile; no WebGL; 30–60 MB additional runtime memory floor | Photoreal high-end-only titles with an artist team that can drive physically based lighting |

Switching pipelines mid-project means reauthoring every shader and every material, which is why this is the least reversible early decision in a Unity project.

Batching mechanisms, in the order you should reason about them:

**SRP Batcher** does not reduce draw call count. It reduces per-draw CPU setup by keeping per-material constant buffers persistently on the GPU and binding them rather than re-uploading, so consecutive draws using different materials of the *same shader variant* share a CPU fast path. Typical CPU rendering cost reduction is 1.2–4x. It requires shader compatibility: all material properties declared inside a `CBUFFER_START(UnityPerMaterial)` block and no per-object material property blocks. The Frame Debugger reports "SRP Batch" and the reason a batch broke — read that field before theorising.

**GPU instancing** genuinely reduces draw calls: identical mesh plus identical material rendered in one call with per-instance data, up to 1023 instances per batch (fewer when per-instance property arrays are large). It requires `#pragma multi_compile_instancing` and does not apply to `SkinnedMeshRenderer`. `Graphics.DrawMeshInstanced` and `Graphics.RenderMeshIndirect` bypass the `GameObject` layer entirely and are the right tool for foliage, debris and projectiles.

**Static batching** merges static meshes into shared vertex buffers at build or scene load. It trades memory for draw calls: the combined buffers duplicate vertex data, and a large static-batched scene can add 100–400 MB. On memory-constrained platforms this is frequently a net loss.

**Dynamic batching** merges small dynamic meshes on the CPU each frame, limited to 300 vertices (900 vertex attributes) and disabled for meshes with normals plus multiple UV sets. The CPU transform cost usually exceeds the draw call saving on modern hardware. Leave it disabled unless a profile shows otherwise on a specific low-end target.

Draw call budgets by target, useful as an early art-direction constraint rather than a late optimisation target: roughly 100–300 draw calls per frame on low-end mobile (GLES 3.0 class), 500–1,500 on high-end mobile and Switch, 2,000–5,000 on current-generation console and desktop with the SRP Batcher active. These are CPU-side render thread limits; exceeding them shows up in the Profiler as render thread time exceeding main thread time, at which point reducing material count and enabling instancing beats any gameplay-side optimisation.

## 5. Physics

Unity uses PhysX 4.1. `FixedUpdate` runs on an accumulator: each frame, the engine steps physics `floor(accumulated / Time.fixedDeltaTime)` times. Default `fixedDeltaTime` is 0.02 s (50 Hz). If a physics step costs more than the wall-clock time it represents, the accumulator grows and the engine steps more times next frame, which costs more — the death spiral. `Time.maximumDeltaTime` (default 0.333 s) caps the number of catch-up steps and is the only thing preventing a total freeze; lower it to 0.1 s on shipping builds so a hitch degrades into slow motion instead of a hang.

Raising the physics rate is expensive linearly: 50 Hz to 100 Hz doubles physics cost. Raise it only for the specific reasons that require it — fast projectiles tunnelling (prefer continuous collision detection or raycast-based projectiles), or a networked simulation needing a tick rate matched to the server.

| Mode | Behaviour | Latency | Use for |
|---|---|---|---|
| `None` | Transform snaps to the last simulated pose | 0 | Everything not closely watched; the default for bulk bodies |
| `Interpolate` | Blends between the previous two simulated poses | One fixed step (20 ms at 50 Hz) | Player character, camera target, anything in close view |
| `Extrapolate` | Predicts forward from current velocity | Negative (leads) | Rare; visible overshoot and snap-back at every collision |

Interpolation exists because rendering happens at a different rate than simulation. `RigidbodyInterpolation.Interpolate` renders the body one physics step in the past, blending between the last two states — smooth, with one step of latency. `Extrapolate` predicts forward from current velocity — no latency, visible overshoot at collisions. Use `Interpolate` for the player camera target and anything the player watches closely, `None` for everything else, because interpolation costs per-body state storage and a per-frame transform write.

Moving bodies correctly: `Rigidbody.MovePosition`/`MoveRotation` set a target the solver reaches during the next step, which preserves interpolation and generates correct contact resolution against other bodies. Writing `transform.position` on a body with a collider teleports it, invalidates interpolation, and forces a physics-scene transform sync — with `Physics.autoSyncTransforms` false (default since 2018.3) the sync is deferred until the next query, so a raycast immediately after a transform write may hit the stale pose. Call `Physics.SyncTransforms()` explicitly if you must mix the two.

The layer collision matrix is the cheapest large physics optimisation available: it filters pairs during broadphase, so disabling a layer pair removes those pairs before narrowphase entirely. A scene with 2,000 colliders across 8 layers where only 6 of the 36 pairs interact does roughly a sixth of the pair work. Audit the matrix as a shipping checklist item; the default is everything-collides-with-everything.

## 6. Input

The legacy Input Manager polls named axes on the main thread once per frame, has no device hot-plug model, no runtime rebinding, no per-player device assignment, and no support for XR controllers or modern gamepad features. It is fine for a single-player keyboard-and-mouse prototype and inadequate for anything shipping to console.

The Input System package (1.7+) is event-driven: devices report state into a buffer, actions are resolved from bindings, and callbacks fire on state change. This gives you control schemes, runtime rebinding with `PerformInteractiveRebinding`, multi-device local co-op through `PlayerInputManager`, and console gamepad certification requirements (controller disconnect handling, correct button glyph mapping) that platform holders test for. Switching requires setting Active Input Handling in Player Settings and reauthoring every input call site, so decide in week one.

The pattern that avoids both the allocation and the timing hazard is to resolve actions once and poll cached values from your own tick:

```csharp
void Awake() {
    m_Move = m_Actions.FindAction("Gameplay/Move");   // resolve once
    m_Fire = m_Actions.FindAction("Gameplay/Fire");
}
void Tick(float dt) {
    Vector2 move = m_Move.ReadValue<Vector2>();        // no allocation
    if (m_Fire.WasPressedThisFrame()) QueueFire();     // edge state, frame-correct
}
```

Costs to plan for: the callback style (`action.performed += ctx => ...`) allocates via closures if written carelessly; `InputAction.ReadValue<T>()` polled in your own tick is allocation-free and usually the right pattern for continuous input. Update mode matters for physics — set the action asset to process events in fixed update, or read cached values in `FixedUpdate` rather than reading directly, or you will consume the same input twice on frames with two physics steps and zero times on frames with none.

## Pass conditions

Answer yes to every applicable line before the project is considered correctly set up.

1. Exactly one of Addressables, AssetBundles, or Resources is used as the primary content system; if Addressables, the Analyze rule "Check Duplicate Bundle Dependencies" reports zero duplicates in CI.
2. Total content under any `Resources` folder is under 20 assets.
3. Asset Serialization is Force Text, Version Control mode is Visible Meta Files, and UnityYAMLMerge is registered as the merge driver for `.prefab`, `.unity`, `.asset`.
4. Render pipeline choice is recorded with the target platform list that justifies it; HDRP does not appear in any project shipping to mobile, Switch or WebGL.
5. `Time.maximumDeltaTime` is set below 0.2 s in shipping builds.
6. Layer collision matrix has been explicitly audited; the default all-pairs-enabled state is not shipped.
7. Levels are split into additive scenes with a documented ownership domain per scene; no single `.unity` file is edited by more than one discipline.
8. Draw calls on the lowest supported target are inside the documented budget for that target, measured with the Frame Debugger on device rather than from the editor Stats overlay.
9. Input goes through the Input System package with a committed action asset, and rebinding plus controller hot-plug are exercised by a manual test pass before any console submission.
