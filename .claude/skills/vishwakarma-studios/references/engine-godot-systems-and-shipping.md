# Godot: Physics, Data, Version Control, and Shipping

This part covers the runtime systems and production pipeline of a Godot project: the fixed-timestep physics contract, resource and inspector-driven data, scene instancing and the text-merge story, exporting to platforms including the console wall, profiling, and the tooling areas that are visibly thinner than Unity or Unreal. It assumes the node model, language, and renderer decisions covered in `engine-godot-foundations.md`. Version claims are pinned to the Godot 4.4/4.5 line unless stated otherwise.

## 1. Physics and the fixed-timestep contract

Godot runs physics on a fixed timestep, default 60 ticks per second (`physics/common/physics_ticks_per_second`), decoupled from render frames. `_physics_process(delta)` is called once per tick with a constant `delta`. `_process(delta)` is called once per rendered frame with a variable `delta`.

The contract is simple and violating it produces the most common class of Godot bugs: behaviour that changes with frame rate. Anything that reads or writes physics state — body positions, velocities, `move_and_slide`, raycasts, shape queries — belongs in `_physics_process`. Anything presentation-only — camera smoothing, UI updates, cosmetic tweening, non-physical input response — belongs in `_process`.

Applying a force in `_process` scales that force by frame rate, producing a game that is measurably easier at 144 Hz than at 60 Hz. Querying a raycast in `_process` samples physics state at an arbitrary point in the step and produces intermittent misses that reproduce on nobody else's machine.

When render rate exceeds physics rate, bodies visually step at 60 Hz unless interpolated. Godot has built-in physics interpolation (3D from the 4.3 line, 2D from 4.4), enabled via `physics/common/physics_interpolation`. When it is on, do not write body transforms directly outside `_physics_process`, because you will fight the interpolator and produce jitter that looks identical to the problem interpolation was meant to solve.

Diagnose "stuttering movement" in this order: interpolation setting, movement code in the wrong callback, camera following a physics body from `_process` without interpolation, and only then anything else. The first three account for the overwhelming majority of cases.

Two 3D physics backends exist. The built-in Godot Physics is adequate for simple scenes and has historically been unreliable for stacking, high-speed collisions, and complex character controllers. Jolt is materially better: faster broadphase, more stable solver, better continuous collision detection. From Godot 4.4 it is a built-in option selected via `physics/3d/physics_engine`, superseding the earlier `godot-jolt` GDExtension.

`Studio:` Select Jolt at project start. Switching later changes collision behaviour subtly enough to invalidate tuning on every character, vehicle, and destructible in the game, and the retuning pass is not schedulable in the back half of production.

2D has no Jolt equivalent; Godot Physics 2D is what you get. It is sufficient for the vast majority of 2D games. If you need many thousands of interacting bodies, expect to write a broadphase over `PhysicsServer2D` or move the simulation out of the physics engine entirely into your own fixed-step solver.

Determinism is not guaranteed by either backend. If the design needs deterministic replays or lockstep multiplayer, do not build on the physics engine; build the simulation on fixed-point or carefully constrained integer arithmetic in your own code, and use the physics engine only for presentation.

## 2. Resources, `@export`, and the inspector-driven workflow

A `Resource` is a reference-counted, serialisable data object with an optional file path. Textures, meshes, materials, animations, and scripts are all resources, and you define your own with `class_name` plus `extends Resource`. Saved as `.tres` (text) or `.res` (binary), they are the engine's data currency.

A custom `WeaponStats` resource holding damage, fire rate, and a `PackedScene` reference to the projectile gives designers one file per weapon: editable in the inspector, diffable in git, loadable at runtime with `load()` or `preload()`. This should be the default answer to "where does the balance data live".

It beats JSON because the inspector provides typed fields, constrained enums, and drag-and-drop references to other assets, and because `preload()` resolves at parse time and fails loudly when a path is wrong. It beats hard-coded constants because designers change values without touching code, and it beats a spreadsheet importer because there is no import step to be stale.

`@export` exposes a script variable to the inspector. Use the annotated forms — `@export_range(0, 100, 1)`, `@export_enum`, `@export_file("*.tscn")`, `@export_group`, `@export_flags` — because they constrain designer input at the source rather than validating it at runtime and reporting the problem three systems later. `@export var spawn: PackedScene` plus `spawn.instantiate()` is the idiomatic dependency injection for a scene, and it removes hard-coded path strings.

The sharp edge is resource sharing. A resource assigned in the inspector is shared by every instance of that scene by default. Mutating it at runtime mutates it for all instances, and in the editor it can write the change back to disk permanently. Any resource holding per-instance mutable state needs `resource_local_to_scene = true` (the "Local to Scene" toggle) or an explicit `.duplicate()` in `_ready`.

The bug this produces — all enemies sharing one health value, or a designer's tuning silently overwritten by a play session — is subtle, looks intermittent, and is extremely common. Adopt the rule that exported resources are immutable configuration and all runtime state lives in the node, with local-to-scene as the documented exception.

`@tool` scripts run in the editor process, which is how you build custom inspectors, procedural placement tools, and validation passes without a separate plugin API. Guard every branch with `Engine.is_editor_hint()`, because a `@tool` script that spawns objects, starts timers, or touches `get_tree()` incorrectly can hang or corrupt the editor and take unsaved work with it.

`Studio:` Write a `@tool` validation pass early — a script that walks scenes and asserts project invariants (no missing resource references, no nodes outside expected groups, no exported field left null). It costs a day and catches the class of errors that otherwise surface as a crash in a build the week of a milestone.

## 3. Scene instancing, inheritance, and the merge story

Instancing places a saved scene inside another. The child scene remains a single reference in the parent `.tscn`, with only overridden properties stored as deltas. Editable Children exposes the instance's internal nodes for local modification. Inherited scenes create a scene whose root derives from another scene, so base changes propagate to derivatives — the closest equivalent to prefab variants.

The overriding rule is that overrides are stored as deltas keyed by node path. Renaming or reparenting a node in a base scene silently orphans every override referencing it, and the failure is quiet: the property reverts to the base value rather than raising an error.

Before renaming a node in a widely instanced scene, grep the `.tscn` files for the old path. This is a genuine argument for keeping base scenes structurally stable and pushing variation into exported resources rather than into node-tree overrides — data variation is refactor-safe in a way that structural override is not.

The merge-conflict story is a real advantage and worth stating plainly. `.tscn` and `.tres` are line-oriented, human-readable text with a reasonably stable ordering: node declarations carrying a `parent=` attribute, then property assignments. A conflict where two people added different children to the same scene is resolvable by hand in under a minute. A conflict where two people changed different properties on the same node is usually auto-merged by git without intervention.

This is materially better than binary asset formats. Unreal `.uasset` conflicts are resolvable only by taking one side wholesale or by using a specialised diff tool, which in practice means exclusive checkout and a locking workflow. It is also better in practice than Unity's YAML, which is text in principle and machine-generated GUID soup when you actually try to read it.

The transferable lesson, and it applies to any engine or tool you build: serialise scene and asset structure as small, ordered, human-readable text with stable identifiers. You convert a class of merge disasters into ordinary code review. The cost is parse time and file size, and it is almost always worth paying.

Caveats still bite a team. Node reordering rewrites large regions of the file and produces a diff nobody can review, so make reordering a deliberate, announced act. The `.godot/` folder is build cache and belongs in `.gitignore`, while the `*.import` files beside assets do not, because they carry import settings the whole team must share.

UIDs (`uid://...`) introduced in the 4.x line make references robust to file moves but add a second identity to keep consistent; never hand-edit them, and never copy a `.tscn` by duplicating the file contents without regenerating the UID. Godot has no built-in file locking, so genuinely binary assets — PSDs, FBX, audio, video — still need Git LFS plus a social convention about ownership.

## 4. Export templates, platforms, and the console wall

Exporting requires export templates: precompiled engine binaries per target, matching the editor version exactly, distributed as a roughly 1 GB archive. The build machine needs them installed alongside platform SDKs — Android SDK plus a JDK for Android, Xcode for iOS and macOS — and the relevant signing identities.

The export packs assets into a `.pck`, either embedded in the executable or shipped alongside it. A minimal desktop export lands in the 40–80 MB range depending on renderer and whether the .NET runtime is included. Headless export from CI works via `godot --headless --export-release "<preset>" <path>`, which makes automated builds straightforward — genuinely easier to set up than the equivalent in either large commercial engine.

Officially supported targets are Windows, macOS, Linux, Android, iOS, and web. All work. The web export in particular is usable in production, subject to the Compatibility renderer, to C# limitations, and to browser threading and memory constraints.

Consoles are the wall, and studios need this stated before they commit. Godot ships no PlayStation, Xbox, or Nintendo Switch export. The reason is structural rather than a missing feature: console SDKs are under NDA and cannot be distributed with an MIT-licensed open-source engine, so console support exists only as closed forks maintained by third-party porting houses such as W4 Games, Pineapple Works, and Lone Wolf Technology.

The consequences are concrete. You cannot test on console hardware during development without a contract in place. The port is an external dependency with its own schedule and cost, typically five figures upward per platform and scaling with project complexity. Engine upgrades mid-project complicate the partner's fork. Any GDExtension you write must be built for the console toolchain by that partner. Any middleware you depend on needs its own console licence.

Signing and store requirements are yours to handle and are not engine-specific, but they surprise teams coming from a platform where a wizard did it. macOS builds need codesigning and notarisation or Gatekeeper refuses to launch them, iOS needs a provisioning profile and an App Store Connect pipeline, and Android needs a keystore whose loss is unrecoverable. Script all three in CI in the first month, because each one fails in a way that costs a day to diagnose and the failures cluster at submission deadlines.

Store SDKs — achievements, cloud saves, rich presence, in-app purchase — arrive as GDExtensions of varying quality. GodotSteam is mature and widely shipped; console and mobile store SDKs are less uniform. Verify the specific SDK for every launch platform during pre-production, because "we will add achievements at the end" assumes an integration that may not exist for your engine version.

`Solo:` If console is a stretch goal, ship PC first and treat the port as a separate later project with a partner. Do not architect around it in advance.

`Studio:` If console is a launch platform, engage a porting house during pre-production, pin the project to their fork version, and put their milestones on the same schedule as content lock. If console is the primary platform and the date is hard, this is the strongest single argument for choosing Unreal or Unity instead — not because Godot cannot get there, but because the critical path runs through a vendor you do not control.

## 5. Profiling and observability

The built-in profiler covers frame time split into process, physics, and audio; per-function GDScript timings; monitors for object and node counts; memory usage; draw calls; and video memory. It attaches over the remote debugger, so it works against an exported build on a remote device, which is more than some engines offer without extra setup.

Know its limits, because misreading it wastes days. The GDScript profiler is instrumentation-based rather than sampling-based: it records entry and exit per call, which inflates the apparent cost of small, frequently called functions and can invert the ranking of your true hot spots. Read it for shape, then confirm with a targeted harness (`Time.get_ticks_usec()` around the suspect block) before optimising anything.

The C# side profiles through .NET tooling instead, so a mixed-language project runs two profilers and neither sees the other's frames correctly. This is the concrete cost of the "everyone picks" language policy.

GPU profiling is the real gap. Godot reports frame time and draw-call counts and nothing resembling Unreal's GPU Visualizer or Unity's Frame Debugger with per-pass timings. For GPU work, capture with RenderDoc against the Vulkan or OpenGL backend, or use vendor tools — Nsight, Radeon GPU Profiler, Xcode's Metal debugger. Budget setup time; this is not a one-command workflow, and on mobile it is worse.

Memory profiling is thinner still. There is no snapshot-diffing leak attribution tool comparable to Unity's Memory Profiler package. The available techniques are the object-count monitors, `Performance.get_monitor()` sampled into a log, and standard native tooling — Valgrind, heaptrack, Tracy in a custom engine build — for GDExtension code.

A monotonically rising `Object` or `Node` count across repeated level load and unload cycles is the canonical leak signal. Reference cycles between `RefCounted` objects are a genuine hazard in GDScript because there is no cycle collector; break them explicitly with `WeakRef` or by nulling references in `_exit_tree`.

`Studio:` Stand up automated performance capture in CI in the first month — a headless run of a fixed scene emitting frame-time percentiles, node counts, and draw calls into a time series. Godot provides the hooks and nobody provides the harness. Without it, regressions land silently and get misattributed to whatever change happened to be in the build when someone finally noticed the stutter.

## 6. Tooling maturity gaps at studio scale

These are the areas visibly thinner than Unity or Unreal, where a studio buys an addon, writes tooling, or loses schedule.

Animation. `AnimationPlayer` and `AnimationTree` with blend spaces and state machines cover standard character work, and the glTF/FBX importer handles skeleton retargeting. There is no equivalent of Unreal's Control Rig, no in-engine procedural rigging layer, no motion matching, and no animation compression comparable to a dedicated ACL integration. Complex locomotion gets built by hand and IK is basic. If character animation fidelity is the differentiator, this gap is load-bearing.

Terrain. Nothing built in. The de facto answer is the Terrain3D addon, which is good and is also a third-party GDExtension whose upgrade risk you now own. Sculpting, layered material blending, and foliage scattering at scale come from that addon or from tools you write.

Large worlds and streaming. Godot supports double-precision builds via a compile-time flag, so large coordinate spaces do not lose float accuracy, and it has occlusion culling plus mesh LOD. It has no World Partition, no HLOD generation, and no built-in streaming. Open-world streaming means writing a chunk manager over `ResourceLoader.load_threaded_request` with your own per-frame instantiation budget to avoid hitches. Achievable, and a multi-month systems task with an engineer permanently attached.

Lighting and global illumination. SDFGI for dynamic real-time GI, VoxelGI for bounded scenes, LightmapGI for baked. Respectable, and not Lumen. Bake times, light-leak behaviour, and probe workflows are less refined, so lighting artists spend time on workarounds rather than on lighting.

Multiplayer. The high-level API — `MultiplayerAPI`, `@rpc` annotations, `MultiplayerSynchronizer`, `MultiplayerSpawner` — is genuinely quick for small co-op and prototypes. It is not a foundation for competitive netcode: no rollback, no lag compensation, no authoritative-server framework, no dedicated-server tooling comparable to Unreal's replication graph. Serious multiplayer means ENet or raw UDP plus your own replication layer.

Asset pipeline at scale. Import settings live in per-asset `.import` files applied on first import. There is no scripted-importer ecosystem comparable to Unity's and no asset registry with dependency queries and a reference viewer comparable to Unreal's. Bulk retargeting of import settings across thousands of assets is a script you write, and "what breaks if I delete this file" is a grep rather than a query.

Testing. No first-party test framework. GUT and gdUnit are the community options and both work; pick one, wire it into CI with `--headless`, and accept that the surrounding ecosystem — mocking, coverage reporting, flaky-test tracking — is thinner than you are used to.

VFX. `GPUParticles2D`/`GPUParticles3D` with process materials and custom particle shaders cover standard effects, and sub-emitters, trails, and attractors exist. There is no node-graph particle editor comparable to Niagara, so complex effects are written as shaders by someone comfortable writing shaders, rather than authored by a VFX artist in a visual tool. Budget the staffing implication rather than the feature list.

Navigation. `NavigationServer` with baked navigation meshes, agents, obstacles, and avoidance is present and functional, including runtime rebaking. It is weaker than Unreal's navigation on large worlds, dynamic modifiers, and off-mesh links, and multi-layer or multi-agent-size setups need manual management. For crowds beyond a few hundred agents, expect to move avoidance out of the built-in system.

Build and cook times. This is the inverse of the tooling gaps and worth stating: because there is no asset cook, a full export of a mid-sized project takes seconds to a couple of minutes rather than hours. CI capacity that other engines spend on cook you can spend on running the game.

## Pass conditions

Answer yes to every applicable line before the project is considered correctly set up.

1. `.godot/` is in `.gitignore`; `*.import` files are committed.
2. A grep for `move_and_slide`, `apply_impulse`, `apply_force`, `apply_central_impulse`, and `intersect_ray` inside `_process` returns nothing.
3. The 3D physics engine is explicitly selected in project settings, with Jolt chosen for anything beyond trivial 3D, rather than left at the default by omission.
4. `physics/common/physics_interpolation` is explicitly set, and if enabled, no code writes body transforms outside `_physics_process`.
5. Every exported `Resource` holding runtime-mutable state is marked local-to-scene or explicitly duplicated in `_ready`.
6. Every `@tool` script guards editor-only and runtime-only branches with `Engine.is_editor_hint()`.
7. Export templates matching the pinned engine version are installed on the build machine by a script, not by hand.
8. A headless export runs in CI and produces a runnable artefact for every launch platform.
9. If console is a launch platform, a porting partner is contracted, their fork version is recorded, and the project is pinned to it.
10. An automated performance capture runs in CI producing frame-time percentiles, node counts, and draw calls against a fixed scene, with a recorded baseline.
11. Repeated level load and unload cycles return `Object` and `Node` counts to baseline, verified against the monitor output.
12. Git LFS is configured for binary assets and `.gitattributes` is committed.
13. A test framework is wired into CI and at least the simulation-critical systems have tests that run headless.
14. Codesigning, notarisation, and keystore handling are scripted in CI for every applicable platform, and a signed build has been installed on a clean device.
15. Every store or platform SDK required at launch has a verified working integration on the pinned engine version.
