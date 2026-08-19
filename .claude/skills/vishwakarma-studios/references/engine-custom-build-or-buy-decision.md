# Custom engines: the build-or-buy decision

This file covers owning the stack: Bevy, love2d, raylib, MonoGame, and fully bespoke engines. What you buy is total control over the runtime — memory layout, update order, determinism, platform behaviour, licence terms — and the absence of a large engine's assumptions fighting your design. What you pay is everything a commercial engine gives you for free: the asset pipeline, the editor, the serialisation layer, the platform ports, the profiler, the crash reporter, and the twenty years of edge cases baked into someone else's code.

The decision is not "can we write an engine" — competent engineers can. The decision is whether the studio can afford two to four years of engineering that produces no gameplay, and whether the resulting engine will be better along an axis that actually decides whether the game succeeds. For most projects the answer is no, and the cost of being wrong is that the game never ships. Version claims are pinned where they matter; anything in a 0.x line should be re-verified before use.

## 1. The governing rule: you own the parts nobody thanks you for

Writing an engine means writing the game. It also means writing an importer for every asset format your artists use, a serialisation format that survives schema change, a build script for every platform, a hot-reload path or the loss of iteration speed, a profiler or the loss of visibility, an editor or the loss of designer throughput, a crash reporter or the loss of post-launch diagnosis, and a localisation pipeline, an input remapper, a save system, an audio mixer, and a settings menu that respects every platform's conventions.

None of this ships in a trailer. All of it is on the critical path. The failure pattern is that the engine work is visible and satisfying — a renderer producing pretty pixels is immediate feedback — while the pipeline work is invisible and tedious, so the pipeline work is deferred, and the project discovers at month eighteen that artists have been hand-exporting meshes the whole time.

The mechanism behind the cost is that engine work has no natural stopping point. Game features are done when the game is fun; engine features are done when they handle the next case, and there is always a next case. Without an external forcing function — a vertical slice date, a content deadline, a "no engine work this sprint" rule — engine work expands to fill all available time, because it is always defensibly justified.

State the rule plainly to any team considering this: the engine is a cost centre. Every hour in it is an hour not spent on the thing players pay for. That does not make it wrong, and it does make it something to minimise rather than to enjoy.

## 2. The honest ratio of engine work to game work

Numbers, because "it depends" is not useful here. On a from-scratch engine with no reusable prior codebase, expect 60–80% of total engineering hours in year one to go to engine, tools, and pipeline rather than to gameplay. That fraction falls over the project's life but rarely below 30–40% during production, because content scale keeps exposing new pipeline requirements.

On a shipped in-house AAA engine with an established team, the steady-state ratio of engine and tools engineers to gameplay engineers typically runs between 1:2 and 1:4. A studio with 30 engineers on an in-house engine has roughly 8–12 people who never touch gameplay. If your headcount plan does not contain those people, you do not have an engine plan; you have a hope.

Calendar time for a from-scratch 3D engine capable of shipping a commercial title, staffed by 3–8 experienced engineers, is realistically 2–4 years before content production can run at full speed. A 2D engine for a focused game is far cheaper — 3–9 months for one or two engineers — which is why bespoke 2D tech is common and bespoke 3D tech is rare outside large studios.

`Solo:` A custom 2D engine or a thin framework is a reasonable choice if the game is mechanically unusual and visually simple. A custom 3D engine, solo, is a hobby project. That is a legitimate thing to want, and it should be named as such rather than planned as a commercial project.

`Studio:` Do the arithmetic in writing before committing. Engine-years multiplied by loaded cost per engineer, against the royalty or licence cost of the commercial alternative over the title's projected revenue, plus a risk premium for schedule variance that historically runs high on engine projects. If the numbers do not clear by a wide margin, the commercial engine wins, because the licence cost is known and the engine cost is not.

## 3. When custom is genuinely correct

Unusual simulation requirements. If the game's core is a simulation the commercial engines' architecture actively fights — voxel worlds with destructible topology, large-scale fluid or soft-body simulation, a hundred thousand agents, orbital mechanics at astronomical scale — then you will be replacing the engine's systems anyway, and building on top of one adds constraint without adding value. The test is whether you are replacing the renderer, the physics, and the scene representation. Two out of three is an argument; three out of three is close to a decision.

Extreme platform constraints. Handheld, embedded, retro, or fixed-hardware targets where a general-purpose engine's memory floor exceeds the entire budget. When the platform has 32 MB of RAM, the question is not which engine but how few bytes.

Deterministic lockstep. Covered in `engine-custom-what-you-must-build.md`: if the design requires bit-identical simulation across machines, you need control over every arithmetic operation in the update path, and a commercial engine's physics and floating-point behaviour is not something you can constrain to that standard.

Licence and royalty avoidance at scale. Unreal charges a percentage of gross revenue above a lifetime threshold per product; Unity's terms have changed repeatedly and are currently seat-and-revenue based following the 2024 withdrawal of the runtime fee. Verify current terms rather than trusting any summary, including this one. On a title projecting very high revenue, that percentage can exceed the cost of an engine team — and note that this argument also points at Godot, which is MIT-licensed and free, at a fraction of the cost of building your own.

An existing in-house engine with a trained team. The most common correct answer. If the studio already has the engine, the tools, and the people who know them, switching to a commercial engine means retraining everyone, rebuilding the tool chain, and losing the accumulated fixes. Continuing is usually right even when the engine is objectively behind on features.

A tools and pipeline advantage that is the studio's actual moat. Some studios ship faster because their bespoke tools fit their genre exactly. That is a real and defensible reason, and it is an argument about tools rather than about renderers.

## 4. When custom is a mistake

The named failure mode is that the game never ships because the engine is never done.

The mechanism is a feedback loop. Engine work produces visible, satisfying, unambiguous progress — the renderer got shadows, the loader got faster — while game work produces ambiguous progress, because "is it fun" has no green checkmark. Under uncertainty, teams drift toward the work with clear success criteria. The engine improves, the game does not, and because the engine is genuinely getting better, nobody can point at the moment the project went wrong.

The observable symptoms, in the order they usually appear: the milestone demo is a technology demo rather than a gameplay demo; the engineering backlog is engine tickets with gameplay tickets blocked on them; someone says "we can build that properly once the asset system lands"; the renderer is rewritten a second time; there is no build a designer can open without an engineer present.

Set tripwires and enforce them mechanically. If there is no playable vertical slice by month six on a two-year project, the schedule is already lost and the response is to move to a commercial engine, not to work harder. If more than 50% of engineering hours are still going to engine work after the first year, the ratio is wrong. If a designer cannot make a change and see it in the game without an engineer, the tooling is the top-priority defect regardless of what the roadmap says.

The second failure mode is subtler: the engine ships and is mediocre in every dimension. Not bad enough to abandon, not good enough to be an advantage, and now a permanent maintenance obligation that outlives the people who wrote it. The tell is an engine chosen for reasons of preference rather than requirement — nobody could name the specific capability the commercial alternative lacked.

The third is the bus factor. A custom engine with one person who understands the renderer is a single point of failure that becomes an existential risk on the day that person resigns. Cross-training and documentation are not optional overhead here; they are the difference between a project and a hostage situation.

## 5. When this is the wrong choice

The team has designers and no editor plan. Named failure mode: content throughput collapses. Every level change routes through an engineer, iteration slows to the speed of the engineering queue, and the game's content quality is capped by how many changes designers can afford to ask for.

The schedule is fixed and external. Named failure mode: the engine is never done. Engine work has no natural stopping point, so it absorbs whatever slack exists and then absorbs the content schedule. Publisher-funded projects with milestone payments are the worst case, because the milestone that slips is the one with the money attached.

Console is a launch platform and the technology is Bevy, love2d, or raylib. Named failure mode: no port path exists. This is not a difficulty, it is an absence — no public SDK backend, no porting house with a fork to sell you, and no way to evaluate the work before committing.

The differentiator is visual fidelity. Named failure mode: perpetually chasing the renderer. Matching a modern commercial engine's lighting, materials, and post-processing is a multi-year effort by specialists, and it is a race against teams who do only that. Compete on simulation, systems, or art direction instead.

Nobody on the team has shipped an engine before. Named failure mode: unknown unknowns dominate the estimate. The costly parts are not the renderer and the physics; they are the pipeline, the platform edge cases, and certification, and none of them are visible from the outside. Estimates from a team without that experience are typically wrong by a factor of two to four.

The reason given is preference rather than requirement. Named failure mode: a mediocre engine and a permanent maintenance obligation. If nobody can name the specific capability the commercial alternative lacks, the decision is aesthetic, and the project will pay for it in years.

The plan depends on middleware the licence terms do not permit. Named failure mode: a dependency becomes a port blocker. A copyleft library statically linked into the shipped binary, or middleware without a console licence, surfaces at submission when there is no time to replace it.

The project is a prototype whose value is validating the design. Named failure mode: infrastructure before information. Prototype in the fastest available thing — love2d, an engine you already know — and make the technology decision after you know what the game is.

## 6. The middle path: framework plus libraries

The choice is not binary between a commercial engine and writing everything. Most successful "custom" projects are assemblies: an existing platform layer, an existing renderer or graphics abstraction, an existing physics engine, an existing ECS, and bespoke code only where the game is unusual. This is the option to evaluate before either extreme, because it captures most of the control at a fraction of the cost.

Concrete assemblies that work. SDL3 for windowing, input, and audio backends, plus a thin renderer over the platform graphics API, plus Jolt and miniaudio, plus Dear ImGui for tools. Or `bevy_ecs` as a standalone crate inside a Rust codebase that uses none of the rest of Bevy. Or MonoGame for platform and content pipeline with your own ECS and gameplay architecture above it. Or raylib as the platform layer under a custom simulation, replaced by a bespoke renderer when the visual bar rises.

The evaluation question for each layer is the same: is this layer differentiating, and would replacing it later be a rewrite or a swap. Layers behind a narrow interface — physics, audio, compression — are swappable and should be taken off the shelf. Layers whose API leaks into everything — the ECS, the scene representation, the asset identity scheme — are near-permanent decisions, so choose them for fit rather than for convenience.

`Studio:` Write the layer diagram before writing code, naming for each layer whether it is bought, borrowed, or built, and who owns it. The diagram is also the portability plan, because the platform-specific layers are exactly the ones a console port touches.

## 7. Buy rather than build, even in a custom engine

Writing an engine does not mean writing everything. The mature libraries below represent thousands of engineering-years, and reimplementing any of them is a decision that needs a specific justification. Verify licence terms and revenue thresholds directly with each vendor before shipping.

| Domain | Take | Notes |
|---|---|---|
| 3D physics | Jolt (MIT), PhysX 5 (BSD-3) | Jolt is the current default for new work: multithreaded, deterministic within a build, shipped in AAA |
| 2D physics | Box2D 3.x (MIT), Chipmunk2D | Box2D's C rewrite improved performance substantially; use it over a hand-rolled solver |
| Audio engine | miniaudio (permissive, single-file) | Correct choice when you need playback and mixing without an authoring tool |
| Audio middleware | FMOD, Wwise | Buy when a sound designer needs an authoring tool; both have free tiers below revenue or budget thresholds |
| Tools UI | Dear ImGui (MIT) | Immediate-mode; the fastest path from "we need a tool" to a working tool |
| Game UI | RmlUi (MIT), Noesis or Coherent (commercial) | Dear ImGui is for tools, not for shipping player-facing UI |
| Platform layer | SDL3 | Windowing, input, gamepads, haptics, audio backends across every desktop and mobile platform |
| Serialisation | FlatBuffers, Cap'n Proto, serde (Rust), cereal (C++) | Zero-copy formats matter for load times; schema evolution matters more |
| Compression | zstd, LZ4 | LZ4 when decompression speed dominates, zstd when size does |
| Mesh processing | meshoptimizer | Vertex cache optimisation, simplification, LOD generation; solved problem |
| Texture compression | Basis Universal, KTX2 | Transcodes to platform-native formats from one source; halves pipeline work |
| Animation compression | ACL | Order-of-magnitude memory savings on large animation sets |
| Navigation | Recast and Detour | Navmesh generation and pathfinding; the industry default for good reason |
| Profiling | Tracy, RenderDoc | Tracy for CPU and frame timing, RenderDoc for GPU capture; instrument early |
| Crash reporting | Sentry, Backtrace | Symbolicated crash aggregation from the field; without it, post-launch is guesswork |
| C++ hot reload | Live++ or equivalent | Buys back the iteration speed a compiled language costs |

Licence shape matters as much as licence cost, and it is a technical constraint rather than a legal footnote. Permissive licences — MIT, BSD, zlib, Apache — impose attribution and nothing else, which is what you want for statically linked engine code. LGPL requires that the user can replace the library, which in practice means dynamic linking; several console platforms restrict or forbid the dynamic loading that would satisfy it, so an LGPL dependency can become a port blocker discovered late. GPL is incompatible with a closed-source game outright. Audit every transitive dependency's licence before content production, not before submission.

The rule underneath the table: build only what is differentiating. Physics is not differentiating unless the game is about physics. Audio mixing is not differentiating. Compression is never differentiating. The renderer might be, the tools probably are, and the simulation is the reason you are here.

## Pass conditions

Answer yes to every applicable line before proceeding on a custom or framework-based stack.

1. The choice is justified in writing against a specific capability a commercial engine lacks, and the justification names that capability.
2. The projected engine and tools headcount is in the staffing plan as a distinct line from gameplay headcount.
3. The build cost of the engine has been compared numerically against the licence or royalty cost of the commercial alternative over projected revenue, with a written risk premium.
4. A date for a playable vertical slice exists, and the plan for missing it names the fallback engine rather than more engine work.
5. Physics, audio mixing, compression, mesh processing, and navigation use established libraries, or each exception has a written justification.
6. Every third-party library's licence and revenue threshold has been verified directly with the vendor and recorded.
7. Engine work as a share of engineering hours is tracked per sprint and reviewed against a declared target.
8. A layer diagram exists naming every subsystem as bought, borrowed, or built, with an owner per layer.
9. Every transitive dependency's licence has been audited for copyleft and linking constraints against every target platform, including console.
