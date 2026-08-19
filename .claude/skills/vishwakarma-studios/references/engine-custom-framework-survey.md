# Framework survey: Bevy, love2d, raylib, MonoGame

This file surveys the frameworks you would build on if you owned the stack without writing every layer of it — Bevy, love2d, raylib, and MonoGame — what each imposes, what each omits, and what each costs. The decision of whether to go custom at all is in `engine-custom-build-or-buy-decision.md`; the work you take on once you do is in `engine-custom-what-you-must-build.md`. Version claims are pinned where they matter; anything in a 0.x line should be re-verified before use.

## 1. Bevy: the ECS and the scheduler

Bevy is a Rust game engine built around an archetypal ECS, and its ECS design is the best argument for looking at it even if you ship elsewhere. Data lives in components stored in tables grouped by archetype, so iterating all entities with a given component set is a linear walk over contiguous memory — the cache behaviour that makes ECS fast is a property of the storage layout, not of the API style. Components that are added and removed frequently can opt into sparse-set storage instead, trading iteration speed for cheap insertion.

Systems are ordinary Rust functions whose parameters declare what they access: `Query<(&Transform, &mut Velocity)>`, `Res<Time>`, `Commands`. That declaration is the scheduling input. The scheduler inspects the access sets, proves which systems cannot alias, and runs them in parallel across threads automatically. You get data parallelism without writing threading code, and the compiler plus the scheduler prevent the data races that make hand-rolled job systems expensive to debug.

Ordering is explicit where it matters. `.before()`, `.after()`, and `.chain()` constrain pairs; system sets group systems under shared ordering and run conditions; run conditions (`.run_if()`) gate execution on state without branching inside the system. The schedule graph is a directed acyclic graph the engine resolves at startup, so an ordering cycle is a startup panic rather than a heisenbug.

Ambiguity is the sharp edge. Two systems that write the same component with no ordering constraint between them will run in a nondeterministic order, and Bevy will happily do that unless you constrain them. Enable the ambiguity detection tooling and treat reported ambiguities as defects; otherwise you ship a game whose behaviour depends on thread scheduling.

`Commands` defers structural change. Spawning, despawning, and adding or removing components cannot happen while systems are iterating archetypes, so those operations queue and apply at a synchronisation point. The consequence to internalise: an entity spawned via `Commands` does not exist for other systems until that point, which is the source of most "why is my entity not there yet" confusion.

Change detection is tick-based and nearly free. Every component write bumps a change tick, and `Changed<T>` or `Added<T>` query filters compare ticks to skip unchanged entities. This turns "recompute everything every frame" into "recompute what moved", which is the single highest-leverage optimisation in a data-oriented design and is worth reimplementing in any custom ECS.

Plugins are the composition unit: a `Plugin` registers systems, resources, and schedules against the `App`. The engine itself is plugins, so `DefaultPlugins` can be replaced piecemeal — swap the renderer, drop windowing for a headless server build, run `bevy_ecs` entirely on its own as a library in a project that is otherwise not Bevy. That last option is worth knowing: `bevy_ecs` is a usable standalone ECS crate, and using it inside a custom engine is a common and sensible move.

## 2. Bevy: what it costs

Version churn is the headline cost. Bevy is pre-1.0 and ships breaking releases roughly every three to four months. Each one carries a migration guide measured in hundreds of lines, and structural changes have repeatedly reshaped core APIs — the move from bundles to required components in the 0.15 era being a representative example. A team on Bevy either budgets several engineer-days per upgrade or pins a version and forfeits ecosystem compatibility, since third-party crates track upstream unevenly.

`Studio:` Pin the Bevy version at the start of production and plan exactly one deliberate upgrade window, or none. Tracking `main` during content production means gameplay engineers periodically lose a day to an API change they did not ask for, and the cost lands on the least predictable schedule.

There is no official editor. Scene authoring, entity inspection, and asset arrangement are done in code or through community crates such as the egui-based inspectors. Work on a first-party scene format and editor has been ongoing for years and should be treated as unavailable until it ships. For a programmer-only team this is survivable. For a team with designers and level artists, it means you are building an editor, which returns you to section 1 of `engine-custom-build-or-buy-decision.md`.

Console support does not exist and is not a small gap. Rendering goes through wgpu, whose backends are Vulkan, Metal, DX12, GL, and WebGPU — none of which are the graphics APIs current consoles expose. A console port would require a private wgpu backend written against an NDA SDK, and no public path exists. If console is a launch platform, Bevy is disqualified regardless of its other merits.

Compile times are a real iteration tax. A cold build of a Bevy project runs into minutes. The mitigations are well documented and work: enable dynamic linking during development, use a fast linker such as `lld` or `mold`, and consider the Cranelift backend for debug builds. Configured well, incremental rebuilds land in the low single-digit seconds; configured badly, you lose a coffee break per iteration and the team stops iterating.

Beyond the ECS, subsystem maturity is uneven and worth checking per project rather than assuming. Rendering is capable and moves fast; the asset and scene format has been in flux for years; audio, UI, and animation are thinner than the equivalents in a commercial engine, and the gaps are usually filled by third-party crates whose maintenance tracks a maintainer's spare time. Inventory the specific subsystems your game leans on before committing, because "Bevy has X" and "Bevy's X is production-ready" are different claims.

Rust itself is the other cost and the other benefit. Borrow checking eliminates a class of bugs that consume real time in C++ engines, and the ECS design partly exists because it makes ownership tractable. Against that, the hiring pool for Rust gameplay programmers is small, designers cannot write Rust the way they write GDScript or Blueprint, and scripting for iteration is an unsolved problem that each team resolves differently.

## 3. love2d

LÖVE is a Lua framework for 2D games, currently on the 11.5 line, running LuaJIT on most platforms. It provides a window, a 2D renderer, audio, input, filesystem access, and a fixed-callback main loop (`love.load`, `love.update`, `love.draw`), and nothing else. There is no scene graph, no entity system, no editor, and no asset pipeline; you supply all of it.

Its virtue is iteration speed. A change to a Lua file is live on the next run with no compile step, the whole framework API fits in one person's head, and the distance from idea to running prototype is measured in minutes. For game jams, prototypes, and mechanically driven 2D games it is one of the highest-throughput environments available, and LuaJIT is fast enough that arithmetic-heavy gameplay code is rarely the bottleneck.

It is also proven commercially, which matters when arguing for it: Balatro shipped on LÖVE and sold in the millions. That is an existence proof that the framework is not a toy, and equally an illustration of the shape of game it suits — deep systems, modest visuals, 2D.

Distribution is straightforward but manual. A `.love` file is a zip of the project; a distributable executable is that zip concatenated onto the platform's LÖVE binary, plus the required shared libraries. There is no build wizard, so you write the packaging script yourself for each platform. Web export exists through community Emscripten ports and is workable rather than first-class. Mobile is supported through the Android and iOS projects with more assembly required than a commercial engine.

Lua itself is the other consideration. There is no static typing, no standard library worth the name for game work, and no first-party debugger, so large codebases depend on discipline and on community libraries — collision, class systems, tweening, state management — each of which is a small vendored dependency you now maintain. A LuaJIT project of 30,000 lines is maintainable; the same project would be easier to refactor in a typed language, and that difference grows with team size.

Consoles are not supported. Titles that started on LÖVE and shipped on console did so by porting to another technology, which in practice means rewriting. Treat any console requirement as a rewrite cost and decide up front whether the prototype speed is worth it.

`Solo:` Excellent default for 2D prototypes and for shipping a mechanically focused 2D game on desktop.

`Studio:` Usable for prototyping and internal tools. Not a production target for a team with designers, because everything a designer would touch is a tool you have not written.

## 4. raylib

raylib is a C99 library — currently the 5.5 line — offering windowing, input, a simple immediate-style 2D and 3D renderer, audio, and maths, with zero architecture imposed. No scene graph, no ECS, no asset database, no editor. You call `InitWindow`, write your own loop, and own every structural decision from there.

That is the point. raylib is the right choice when you want to learn how the pieces fit, when you are building a small tool, or when the project's shape is unusual enough that any imposed architecture is friction. It has bindings for dozens of languages, so it is also a reasonable rendering and platform layer under a custom engine written in something other than C.

The internal `rlgl` layer abstracts OpenGL and does basic batching, which is what keeps naive immediate-mode drawing viable at small scales. Do not mistake that for a production renderer: there is no material system worth the name, no culling framework, no shadow pipeline, and no draw-call sorting beyond the batching. A 3D game of any visual ambition means writing the renderer, at which point raylib is providing windowing and input, which SDL3 also provides with a broader platform matrix.

Being C is both the appeal and the constraint. There is no ownership model, no containers, and no error handling beyond return codes, so memory management is entirely yours and the bugs are the classic ones. Against that, the binary is small, startup is instant, the whole library builds in seconds, and binding it into another language or embedding it in a tool is trivial.

Web builds work through Emscripten and require restructuring the main loop for the browser's callback model. Console support does not exist in any official form.

Use raylib for teaching, jams, tools, small 2D games, and as the platform layer beneath your own systems. Do not use it as the foundation of a large 3D project and expect the library to grow into the role; it is explicitly designed not to.

## 5. MonoGame

MonoGame is the open-source continuation of Microsoft XNA: a C# framework, currently on the 3.8 line targeting .NET 8, providing graphics, input, audio, and a content pipeline, with the same structural philosophy as raylib — you write the game loop, you write the architecture. It has the longest commercial track record of anything in this file, with Stardew Valley the most prominent example, and its sibling FNA carries titles including Celeste, Bastion, and TowerFall.

The content pipeline (MGCB, with an editor GUI) is the meaningful differentiator against love2d and raylib. It compiles textures, fonts, audio, and models into an optimised `.xnb` format at build time, which gives you platform-appropriate texture compression, faster load times, and a real build step where asset errors surface before runtime rather than in front of a player. It is a modest pipeline by commercial engine standards and it is a pipeline, which is more than the alternatives here provide.

C# gives you a garbage collector, and the GC is the thing to design around. Allocation in the update or draw path produces collection pauses that read as frame hitches; the discipline is to pool aggressively, prefer structs for hot data, avoid LINQ and closures in per-frame code, and use `Span<T>` and array pooling where available. This is well-trodden ground with well-known answers, and it is a real constraint rather than a theoretical one.

Shader authoring goes through the content pipeline in HLSL, cross-compiled for the target, with a feature-level ceiling well below what modern hardware exposes. Community layers — Nez and MonoGame.Extended among them — supply the ECS, scene management, and tweening that the framework deliberately omits, and adopting one is usually right, since the alternative is writing the same thing less well.

Console support exists and is gated. Platform-specific implementations live in private repositories available to registered platform developers, so shipping to console requires the platform relationships you would need anyway, plus a working arrangement with the maintainers. This is a materially better console story than Bevy, love2d, or raylib, and a materially worse one than any commercial engine, where the export target is in the box.

`Studio:` MonoGame is the defensible framework choice for a team that wants ownership of architecture, has C# expertise, and needs a plausible console path. Weigh it against the fact that you are still writing the editor, the level format, and the tools.

## 6. Framework comparison

| | Bevy | love2d | raylib | MonoGame |
|---|---|---|---|---|
| Language | Rust | Lua (LuaJIT) | C99 (many bindings) | C# / .NET 8 |
| Version line | 0.x, pre-1.0 | 11.5 | 5.5 | 3.8 |
| Dimension focus | 2D and 3D | 2D only | 2D and light 3D | 2D and light 3D |
| Imposed architecture | ECS, scheduler, plugins | Callback loop only | None | None |
| Editor | None official | None | None | Content pipeline tool only |
| Asset pipeline | Asset server, hot reload | None | None | MGCB, build-time compile |
| Iteration speed | Slow compile, mitigable | Instant | Fast compile | Moderate |
| Console path | None | None | None | Private repos, registered developers |
| API stability | Breaks every few months | Stable for years | Stable | Stable |
| Commercial track record | Thin | Balatro and others | Small titles, tools | Stardew Valley; FNA sibling shipped Celeste |
| Best fit | Systems-heavy games by Rust teams | 2D prototypes, jams, focused 2D titles | Teaching, tools, platform layer | C# teams wanting architectural ownership |

## 7. What this does better than the others

Bevy's ECS ergonomics are the standout, and they are stealable wholesale. Systems as plain functions whose parameter types declare their data access, with a scheduler that derives parallelism from those declarations, is the cleanest solution anyone has shipped to the problem of "make the game multithreaded without making it undebuggable". Any custom engine should copy the model: declare access, derive the schedule, panic on cycles, warn on ambiguities.

Tick-based change detection is the second. Making "what changed since last frame" a nearly free query turns whole categories of per-frame recomputation into incremental work, and it costs a monotonic counter and a comparison. Implement it in any data-oriented design.

Plugin-structured engines, where the engine's own subsystems use the same registration mechanism third-party code does, is the third. It forces the extension surface to be good, because you are its first customer, and it makes headless and stripped-down builds trivially achievable rather than a special case.

love2d's iteration model is worth internalising even in a compiled engine: a change is live on the next run with no build step. That property, not Lua specifically, is what makes prototyping fast, and it is why any serious custom engine needs a scripting or data layer that reloads without a compile.

raylib's restraint is a design lesson in the opposite direction. By refusing to impose architecture, it stays comprehensible in full by one person, which is exactly right for teaching and tools. When building an internal library, ask whether the abstraction you are adding is load-bearing or merely conventional.

MonoGame's build-time content pipeline is the piece the other frameworks lack and the one every custom engine eventually rebuilds. Convert assets offline into a runtime-ready format, fail the build on bad assets, and keep the runtime loader dumb. That single decision improves load times, memory use, and error diagnosis simultaneously.

The deepest advantage of the whole category is control over the update loop. When you own the frame, you can guarantee fixed-timestep determinism, bound memory exactly, eliminate garbage collection pauses, and make cache layout a design parameter rather than an accident. No commercial engine offers that, and for the small set of games where it decides the outcome, nothing else substitutes.

## Pass conditions

Answer yes to every applicable line before proceeding on a custom or framework-based stack.

1. If Bevy is used, the version is pinned, upgrade windows are scheduled, and system ambiguity detection is enabled with reported ambiguities treated as defects.
2. If Bevy, love2d, or raylib is used, console is confirmed not to be a launch platform.
3. If MonoGame is used, per-frame allocation has been measured and the update and draw paths are allocation-free in steady state.
4. Every third-party crate, module, or library the project depends on for a shipping-critical subsystem has been checked for maintenance activity within the last release cycle, with a named fallback if it stalls.
