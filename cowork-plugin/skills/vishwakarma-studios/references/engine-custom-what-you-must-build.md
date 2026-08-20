# Building custom: what you have to write yourself

This file covers the systems a commercial engine hands you for free and a custom stack does not: the asset pipeline, the editor, the renderer, memory strategy, scripting and iteration, platform ports, determinism, observability, and the team structure that keeps all of it alive. It assumes the build-versus-buy decision has already been made in favour of building — that argument is in `engine-custom-build-or-buy-decision.md`.

## 1. The asset pipeline is the part that kills you

The renderer gets attention because it is visible. The asset pipeline determines whether the project ships, and it is the component most consistently underestimated on custom-engine projects.

A working pipeline needs: an importer per source format that runs offline rather than at load time; a stable identifier for each asset that survives file moves and renames; a dependency graph so that changing a texture rebuilds the material and not the whole project; incremental builds so a one-asset change does not cost a full cook; a cache shared across the team so nobody rebuilds what CI already built; and a validation pass that rejects bad assets with an artist-readable message rather than crashing at runtime.

Load-time conversion is the trap. Reading a PNG and uploading it at runtime works fine with fifty assets and becomes a two-minute load screen at five thousand. Convert offline into a format the GPU consumes directly, and make the runtime loader a memory-map plus an upload. This decision is cheap at the start and expensive to retrofit, because every system that touches assets assumes the format.

Hot reload is not a luxury. On a custom engine, the iteration loop is whatever you build, and the difference between "change a value, see it in two seconds" and "change a value, rebuild, relaunch, navigate to the test area" is measured in weeks of designer time over a project. Implement asset hot reload with a file watcher in the first month, before the systems that would make it hard are written.

Artist-facing failure messages matter more than they sound. A pipeline that fails with a stack trace trains artists to send every problem to an engineer. A pipeline that says which file, which requirement, and what to change keeps them unblocked. This is a small amount of code with a large effect on throughput.

## 2. Building an editor: what it costs

Every custom-engine project either builds an editor or discovers why it needed one. The decision to defer is usually framed as "designers can edit the data files for now", which holds until the data has spatial meaning, at which point editing a level in a text file is a productivity disaster nobody will admit to for six months.

Scope it honestly. A minimum useful editor is a viewport rendering the game world, selection with a transform gizmo, a property inspector generated from the same reflection data the serialiser uses, a hierarchy or entity list, undo and redo, and save and load of the level format. That is roughly three to six engineer-months for a competent first pass, and it is never finished, because every new gameplay system needs an authoring surface.

Two structural decisions make it cheaper. First, drive the inspector from reflection or from your serialisation schema rather than hand-writing a panel per type, so a new component gets an editing UI for free. Second, run the editor in the same process as the game with a mode switch, so play-in-editor is free and the editor exercises the runtime rather than a parallel implementation that drifts.

Dear ImGui is the pragmatic answer for the editor's UI layer. It is immediate-mode, so panels are functions rather than retained widget trees, and the distance from "we need a tool" to a working tool is an afternoon. It is not a good choice for player-facing UI, and conflating the two is a mistake teams make once.

`Solo:` Hot-reloaded data files plus in-game debug tooling can substitute for an editor when you are the only user. Be explicit that this substitution ends the moment a second person authors content.

## 3. Rendering: what you actually have to write

A renderer is not a draw call. The parts that separate a demo from a shippable renderer are, in the order they usually become urgent: batching and instancing so draw-call count scales with material variety rather than object count; frustum and occlusion culling so off-screen cost approaches zero; sorting, opaque front-to-back for depth rejection and transparent back-to-front for correctness; a material system that maps authored parameters to shader inputs without a bespoke code path per material; and a shader compilation and caching pipeline.

Shader permutations are the cost nobody forecasts. Every feature toggle multiplies the variant count, and compiling variants at runtime causes the frame hitches players describe as stutter. You need offline compilation, a cache keyed on the shader and its defines, and a warming pass at load. This is a system, not a function.

A graphics API abstraction is required the moment you target more than one platform, and it must be designed against at least two APIs simultaneously or it will encode the assumptions of the first. The economical alternatives are taking an existing abstraction — wgpu, bgfx, sokol_gfx — or accepting single-API scope. Writing your own across Vulkan, Metal, and D3D12 is a multi-engineer-year project on its own.

Decide the renderer's ambition explicitly and early. A forward renderer with baked lighting and a handful of dynamic lights is achievable by one engineer in months. Clustered or deferred shading with real-time global illumination, volumetrics, and a modern post stack is a specialist team competing against companies whose entire business is that. Pick the tier that matches the art direction rather than the tier that impresses.

## 4. Memory and allocation strategy

Owning the engine means owning memory behaviour, which is one of the strongest reasons to do it. The default C or C++ allocator is general-purpose and therefore mediocre for a workload that allocates in predictable phases with predictable lifetimes; a custom engine can beat it substantially, and the mechanism is lifetime, not cleverness.

Use a frame arena for per-frame temporaries: a linear allocator reset to zero at frame start, so allocation is a pointer bump and deallocation is free. Use pools for fixed-size objects with churn — entities, particles, network packets — so allocation is a free-list pop and fragmentation is structurally impossible. Use a persistent heap for everything long-lived, and tag every allocation with its subsystem so the budget report means something.

Budget per platform in absolute numbers before content production, not after. Console and handheld targets have hard memory ceilings, and a project that discovers at content lock that it is 400 MB over budget resolves it by cutting content. Enforce budgets in CI with a build that fails when a subsystem exceeds its allocation.

Fragmentation is the failure that appears only after hours of play, which means it appears in certification and in player reports rather than in testing. Long-soak tests that load and unload levels repeatedly while sampling high-water marks and largest-free-block are how you catch it before it catches you.

## 5. Scripting and the iteration loop

A compiled engine without a scripting or data layer has an iteration loop measured in compile times, and that loop is the tax every designer and gameplay engineer pays on every change. Solve it deliberately rather than accepting the default.

The options, in ascending order of investment: hot-reloadable data files with a file watcher, which covers tuning and content and is the cheapest large win; an embedded scripting language — Lua or LuaJIT, Wren, AngelScript — for gameplay logic, which costs a binding layer and a debugging story; hot-reloadable native code via DLL reload or a commercial tool such as Live++, which preserves language performance and requires care about state that lives across the reload.

The binding layer is the hidden cost of embedded scripting. Every type the script touches needs a binding, bindings drift from the native API, and a generated binding pipeline is itself a tool you maintain. Budget it, and keep the scripted surface deliberately narrow — scripts drive behaviour and tuning, native code owns systems and data layout.

Whatever the mechanism, measure the loop. Time from saving a change to seeing it in the running game is a number the team should know and should defend, in the same way frame time is. If it exceeds roughly ten seconds for gameplay tuning, the project is losing more time to iteration than any optimisation will recover.

## 6. Platform ports and console reality

Every platform you support is a permanent tax, not a one-off cost. Each has its own graphics API behaviour, its own filesystem and memory constraints, its own certification requirements, its own store SDK, and its own update cadence that periodically breaks your build.

Console is the discontinuity. SDKs are under NDA, obtainable only by registered developers with an approved project, which means you cannot evaluate the work before committing. Certification requirements are exhaustive and cover suspend and resume behaviour, controller disconnection, storage full, user switching, loading time limits, and dozens of other cases most engines handle for you and yours does not until you write them.

`Studio:` If console is a launch platform for a custom engine, staff a platform engineer per family from pre-production and budget certification failure into the schedule — first submissions frequently fail on issues that take days to fix and weeks to resubmit. Alternatively contract a porting house, in which case your engine's portability constraints become their problem and your interface to them becomes a project of its own.

Design for portability from the start even if you ship one platform first. Isolate platform code behind an abstraction layer, keep graphics API specifics out of gameplay and tools, avoid endianness and pointer-size assumptions, and build on at least two platforms in CI from week one. Retrofitting portability into a codebase that assumed one platform is a rewrite of everything that touches files, threads, memory, or input.

## 7. Determinism, lockstep, and why it forces custom

Deterministic lockstep — every machine simulating the same steps from the same inputs and arriving at bit-identical state — is the standard architecture for RTS and fighting games, and it is one of the few requirements that genuinely mandates engine-level control.

Floating point is the reason. IEEE 754 basic operations are deterministic given identical inputs, rounding mode, and operation order, but compilers reorder, vectorise, and contract operations differently across optimisation levels and architectures, and transcendental functions such as `sin` and `exp` are library implementations that differ between platforms and versions. A simulation that runs on x86 and ARM cannot assume the same results without controlling all of this.

The options are fixed-point arithmetic throughout the simulation, which is deterministic by construction and costs precision and developer convenience; or tightly constrained floating point with compiler flags, no fast-math, no vectorisation in the simulation path, and your own transcendental implementations. Both require that the simulation is separated from presentation, so that rendering, interpolation, and audio never feed back into simulation state.

No commercial engine's physics is deterministic across platforms in a way you can rely on. If the design needs lockstep, the simulation is yours to write regardless of what renders it — which frequently means a custom simulation core inside an otherwise conventional engine, rather than a fully custom engine. Reach for the smaller version of the decision first.

## 8. Observability you have to build yourself

A commercial engine hands you a profiler, a frame debugger, memory tracking, and a log viewer. A custom engine has none of these until you write them, and the temptation is to defer them because they do not affect the shipped product. This is the most expensive deferral available, because without them every performance question is answered by guesswork.

Instrument from the first week. Integrate Tracy or an equivalent frame profiler before the systems worth profiling exist, so that scope annotations are added as code is written rather than retrofitted during a panic. The marginal cost per system is minutes; the retrofit cost across a mature codebase is weeks.

Build memory tracking into the allocator. Tagged allocations by subsystem, high-water marks, and per-frame allocation counts turn "we are running out of memory on the console build" from an investigation into a report. On fixed-memory platforms this is not optional.

Ship telemetry and crash reporting before launch, not after the first bad review. Symbolicated crash aggregation plus a frame-time histogram from real hardware tells you what to fix; forum reports tell you that something is wrong. Budget the backend work, because collecting the data is only half of it.

Build a debug console and in-game debug views early. Toggling collision visualisation, spawning entities, jumping to a level, and changing a tunable at runtime are each an hour of work that saves that hour every week for the rest of the project.

## 9. Team, hiring, and the bus factor

A custom engine changes what hiring means. Every new engineer arrives without knowledge of your engine, so onboarding is months rather than weeks, and the pool of candidates who have shipped on comparable in-house technology is small. A commercial engine lets you hire people who are productive in week two; a custom engine does not, and the difference compounds across every hire for the life of the studio.

The bus factor is the acute risk. A renderer, a pipeline, or a platform layer with one person who understands it is an existential dependency, and engine subsystems concentrate knowledge more than gameplay code does because they are touched by fewer people. Verify redundancy by having someone other than the author make a real change to each major subsystem, and treat failure to do so as a defect in the system rather than in the person.

Documentation is load-bearing here in a way it is not on a commercial engine, where the vendor documents the engine and the internet documents the rest. Architecture decision records, a written pipeline overview, and comments explaining why rather than what are the difference between an engine that survives its authors and one that quietly ossifies because nobody dares change it.

`Studio:` Rotate ownership deliberately and budget the cost. Pairing an engine engineer with a gameplay engineer for a sprint per subsystem per year is cheap relative to an unplanned departure, and it is the only mechanism that reliably works.

## 10. Minimum viable engine checklist

If you are building custom, this is the smallest set that constitutes an engine rather than a demo. Anything missing here is a gap the team will fill under deadline pressure later, which is the worst time.

| Component | Minimum acceptable |
|---|---|
| Main loop | Fixed-timestep simulation decoupled from variable-rate rendering, with interpolation for presentation |
| Input | Abstracted actions, not raw key codes; gamepad support including hotplug; remapping from day one |
| Rendering | Batching, culling, and a material abstraction; not a per-object immediate draw call |
| Audio | Streaming and one-shot playback, buses with independent volume, and platform focus and mute handling |
| Asset load | Offline conversion to a runtime format, asynchronous load, stable identifiers, dependency tracking |
| Hot reload | File watcher reloading assets, and script or data reload, without restarting the game |
| Serialisation | Versioned save and level formats with a migration path defined before the first ship |
| Profiling hooks | Scoped CPU timers, GPU timestamps, frame history, and tagged memory tracking |
| Build script | One command producing a shippable artefact per platform, running in CI, from a clean checkout |
| Crash handling | Symbolicated crash capture with a report path from a player's machine to your issue tracker |
| Debug tooling | In-game console, runtime tunables, and visualisation toggles for collision, navigation, and bounds |
| Editor or authoring path | Something a designer can use unaided, even if it is a text format plus hot reload |

The last row is the one teams skip. Whatever it is — a full editor, a spreadsheet importer, a hot-reloading data format — a designer must be able to change the game and see the result without an engineer. Without it, engineering becomes a queue and content throughput collapses.

## Pass conditions

Answer yes to every applicable line before proceeding on a custom or framework-based stack.

1. A designer can change a gameplay value or a level layout and see the result running, without an engineer and without a compile.
2. Assets are converted offline into a runtime-ready format; the runtime performs no source-format decoding at load.
3. Asset hot reload works through a file watcher, verified for at least textures, audio, and gameplay data.
4. Every asset has a stable identifier that survives file rename and move, and a dependency graph drives incremental rebuilds.
5. Pipeline failures produce artist-readable messages naming the file and the requirement, not stack traces.
6. A frame profiler is integrated and scope annotations are added as new systems are written, not retrofitted.
7. The allocator tags allocations by subsystem and reports high-water marks per platform.
8. Symbolicated crash capture is wired from a player's machine to the issue tracker, and has been tested with a deliberate crash.
9. One command produces a shippable artefact per platform from a clean checkout, and it runs in CI.
10. CI builds on at least two platforms from the first month, and platform-specific code is isolated behind an abstraction layer.
11. Simulation runs on a fixed timestep decoupled from rendering, with interpolation for presentation.
12. If determinism is required, the simulation uses fixed-point arithmetic or documented floating-point constraints, and a cross-platform replay test passes bit-identically in CI.
13. Save and level formats carry a version field and a migration path defined before first ship.
14. Input is abstracted into remappable actions with gamepad hotplug support.
15. An in-game debug console with runtime tunables and visualisation toggles exists and is used.
16. Every major subsystem has at least two people who can modify it, verified by someone other than the author making a change.
17. Shaders are compiled offline into a keyed cache and warmed at load; no shader compiles during gameplay.
18. Per-frame temporary allocations go through an arena reset each frame, and churn-heavy objects go through pools rather than the general allocator.
19. Per-platform memory budgets are declared in absolute numbers and enforced by a CI check that fails the build when a subsystem exceeds its allocation.
20. A long-soak test repeatedly loads and unloads content while sampling high-water marks and largest free block, and it passes without fragmentation growth.
21. Time from saving a gameplay tuning change to seeing it in the running game is measured, recorded, and under the team's declared threshold.
22. The property inspector is generated from reflection or the serialisation schema rather than hand-written per type, so a new component is authorable without editor code.
23. The editor runs in the same process as the runtime with a mode switch, rather than as a parallel implementation of game systems.
24. Architecture decision records exist for the ECS, the asset identity scheme, and the graphics abstraction, naming the alternatives rejected and why.
25. Each major subsystem has documented ownership and a written architecture overview that a new engineer can follow without its author.
