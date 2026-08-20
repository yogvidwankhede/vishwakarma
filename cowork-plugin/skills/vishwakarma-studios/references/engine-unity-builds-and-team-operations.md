# Unity: Builds, Profiling, and Team Operations

What a Unity project has to get right outside the game code itself: the scripting backend and stripping decisions that shape build times, the profiling instruments that answer each performance question, the editor/runtime divergences that hide bugs until submission, and the version, team-scale and engine-selection choices that govern the project as a whole. Runtime architecture is covered in `engine-unity-runtime-architecture.md`; content and rendering in `engine-unity-content-and-presentation.md`.

## 1. Scripting backend, stripping, and builds

| | Mono | IL2CPP |
|---|---|---|
| Execution | JIT | IL transpiled to C++, compiled AOT |
| Runtime performance | Baseline | Typically 1.2–2x faster on managed-heavy code |
| Build time | Baseline | 3–10x slower; a 15-minute Mono build becomes 60–120 minutes |
| Platforms | Editor, desktop, Android | Required for iOS, WebGL, consoles, UWP; optional elsewhere |
| Reverse engineering | Trivial (IL is readable) | Substantially harder |

IL2CPP's AOT restrictions follow from the absence of a JIT: `System.Reflection.Emit` is unavailable, `dynamic` is unavailable, and generic virtual methods instantiated only via reflection over value types can throw at runtime because the concrete instantiation was never generated. The standard mitigation is to reference the instantiation somewhere the compiler can see it, or supply `[Preserve]` and explicit dummy usage. Serialisation libraries that generate code at runtime (older Newtonsoft.Json configurations, some DI containers) are the usual casualties; verify them on device early, not at submission time.

Managed code stripping (`Managed Stripping Level`: Disabled/Low/Medium/High) runs the IL Linker, which computes reachability from your entry points and deletes unreachable types and methods. Anything reached only by reflection is invisible to that analysis and gets deleted, producing a `TypeLoadException` or a silently-null deserialised field in the player build and nowhere else. The remedy is `link.xml` in any folder (or per-assembly), preserving explicitly:

```xml
<linker>
  <assembly fullname="MyGame.Data" preserve="all"/>
  <assembly fullname="Newtonsoft.Json"/>
  <assembly fullname="MyGame.Core">
    <type fullname="MyGame.Core.SaveModel" preserve="all"/>
  </assembly>
</linker>
```

IL2CPP build time is the dominant iteration cost on console and iOS, because a full build regenerates and recompiles the entire transpiled C++ tree. Mitigations that actually move the number: enable incremental IL2CPP builds so unchanged assemblies skip C++ regeneration (assembly definitions directly determine how much can be skipped, which is another reason to partition), keep the `Library` folder and the platform build cache warm on build agents rather than building from a clean clone, and reserve full clean builds for release candidates. A large project without these measures spends 60–120 minutes per console build; with them, incremental builds land in 5–15 minutes.

Stripping is worth 5–20 MB on a mobile build, which matters against the iOS cellular download limit and Google Play's delivery caps. Studio: run High stripping from the first milestone with an explicit `link.xml`, so stripping failures surface continuously rather than in a submission crunch.

## 2. Profiling

Use the right instrument for each question; using the wrong one produces confident wrong conclusions.

- **Unity Profiler, attached to a development player on the target device.** Editor profiling includes editor overhead and editor-only allocations, and the ratios are wrong, not merely the absolutes. Development builds themselves add roughly 5–15% overhead; account for it rather than optimising against editor numbers.
- **Deep Profile** instruments every managed method call. It inflates managed time by 2–10x and shifts the apparent bottleneck toward call-heavy code. It answers "which of my methods is called" and not "what is slow". For targeted measurement use `ProfilerMarker` (Burst-compatible) or `Profiler.BeginSample`/`EndSample` and keep the profile shallow.
- **Frame Debugger** steps through the draw call list and reports, per draw, the shader, the pass, the batch type, and the specific reason the previous batch was broken. This is the only reliable tool for rendering-side batching questions.
- **Memory Profiler package** captures snapshots and diffs them, attributing native and managed allocations to objects and showing what roots a leak. Use the diff between "before scene load" and "after scene unload" to find assets that never released.
- **Rendering statistics and the render thread.** The Game view Stats overlay reports batches, SetPass calls, triangles and vertices, but it reports editor numbers. The reliable read is the Profiler's Render Thread track against the Main Thread track: when render thread time exceeds main thread time, you are draw-call or state-change bound, and the correct next tool is the Frame Debugger, not the CPU timeline.
- **Profile Analyzer package** aggregates hundreds of frames into medians and percentiles and compares two capture sets. Single-frame comparison is noise; a 300-frame median comparison is evidence. This is the tool for verifying an optimisation actually landed and for CI performance regression gates.

The investigation order that avoids wasted work: capture on device, confirm which thread is the bottleneck (main, render, or GPU) before opening any code, confirm whether the cost is per-frame steady state or a periodic spike, and only then narrow with markers. Optimising a spike that turns out to be a GC sweep by rewriting an unrelated system is the standard failure of profiling out of order.

## 3. Editor/runtime divergence

This is the largest single category of late-discovered bugs in Unity projects, and every instance has the same root cause: the editor is a different execution environment than the player, and code that reads correct in one is wrong in the other.

The specific divergences to design against:

- **Domain reload.** Entering play mode normally reloads the managed domain, resetting static fields. With Enter Play Mode Options set to disable domain reload (a large iteration-time win), statics persist across play sessions and your singletons hold stale references. Code must reset its own statics via `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]` rather than relying on domain reload.
- **Asset mutation.** As covered in `engine-unity-content-and-presentation.md`, runtime writes to `ScriptableObject`s and materials persist in the editor and vanish in the build. `Renderer.material` instantiates a copy in play mode but edits the shared asset in edit mode.
- **Shader variants.** The editor compiles shader variants on demand as they are first used. A build must contain them, determined by build-time variant collection and stripping. A material path never exercised during a build's variant-gathering pass renders pink in the player. Ship a `ShaderVariantCollection` warmed from a playthrough, or implement `IPreprocessShaders` to control stripping deliberately.
- **Case sensitivity and paths.** Editor on Windows/macOS is case-insensitive; Linux build machines and several console filesystems are not. `Resources.Load("Icons/Sword")` resolving in the editor and returning null in a build is nearly always this.
- **Editor-only APIs.** `AssetDatabase`, `EditorUtility`, `UnityEditor.*` compile only under `#if UNITY_EDITOR`. Referencing them from runtime assemblies produces a build error at best and a stripped-away null at worst.
- **Timing and frame rate.** The editor caps and throttles differently, `Application.targetFrameRate` is ignored in the editor, and vsync behaviour differs. Frame-rate-dependent logic that appears correct in the editor breaks on a 120 Hz device.

- **Quality settings and platform overrides.** The editor runs the quality level selected in the editor, which is frequently the highest; the player runs the per-platform default. Texture compression, shadow distance, LOD bias and anisotropic filtering all differ, so an artist signing off on visuals in the editor has signed off on a configuration that does not ship.
- **Frame timing under the Profiler.** Attaching the Profiler changes frame pacing and can hide or create hitches, particularly around vsync. Confirm any pacing conclusion with a capture taken with the Profiler detached and timings written to a log.

Countermeasure: run an automated player build on every merge and execute a smoke test on the target device in CI. Editor-only test coverage does not detect any of the above.

## 4. Versions, LTS, and upgrading

Unity ships a tech stream and an LTS stream. Production projects pin an exact LTS patch version (e.g. `6000.0.32f1`), commit that version in `ProjectSettings/ProjectVersion.txt`, and pin package versions in `Packages/manifest.json` with a committed `packages-lock.json`. Floating package versions produce builds that differ between machines, which is the same class of failure as an unpinned dependency in any other ecosystem.

| Upgrade type | Typical cost, mid-size project | Dominant risk |
|---|---|---|
| Patch within LTS (`6000.0.30f1` → `6000.0.34f1`) | 0.5–2 days | Shader recompilation, isolated regressions |
| Minor LTS stream (`6000.0` → `6000.1`) | 1–3 weeks | Package API breaks, render pipeline asset changes |
| Major version (`2022.3` → `6000.0`) | 4–12 weeks | Render pipeline migration, third-party assets, Addressables/Entities major versions |
| Render pipeline change (Built-in → URP) | 2–6 months | Every shader and material reauthored; no automated path |

Licensing cost model, as of the post-Runtime-Fee terms Unity reinstated in September 2024: Personal is free below a revenue and funding threshold with a required splash screen on older streams; Pro is a per-seat annual subscription required above that threshold; Enterprise adds source access and support. The planning consequence is that Unity's cost is proportional to headcount and known in advance, where Unreal's is proportional to revenue and unknown until you ship. For a 60-person team that misses commercially, Unity costs more; for a 6-person team with a hit, Unreal costs more. Model both against your actual revenue distribution rather than assuming either is cheaper.

Upgrade policy: cross major versions only between milestones, on a branch, with a scheduled window. Budget 1–2 days for a patch-version bump, 1–3 weeks for a minor LTS bump on a mid-size project, and 4–12 weeks for a major version transition on a large project — the cost is concentrated in render pipeline changes, package API breaks, third-party assets that have not updated, and shader recompilation. Upgrading during the final 25% of a production schedule buys nothing you can ship and costs schedule you cannot recover; the correct answer at that point is to ship on the version you have and take the fixes as backports where available.

## 5. Team scale

**Assembly definitions.** Without `.asmdef` files, every script lives in `Assembly-CSharp` and editing one script recompiles all of them — 30–120 seconds per keystroke-to-play cycle on a large project, which is the single largest destroyer of engineering throughput in Unity. Split by dependency layer (Core, Data, Gameplay, UI, Editor, Tests), set Auto Referenced to false, and declare references explicitly. A well-partitioned project recompiles only the edited assembly and its dependents, typically 2–8 seconds. Assembly definitions additionally enable per-assembly test targeting, platform-conditional compilation without `#if`, and correct editor/runtime separation.

A workable default partition, with dependencies pointing strictly downward:

```
Game.Core        (no deps)        maths, utilities, service locator
Game.Data        -> Core          ScriptableObject definitions, save schema
Game.Simulation  -> Core, Data    gameplay systems, jobs, no UnityEngine.UI
Game.Presentation-> Core, Data    rendering, VFX, audio, animation glue
Game.UI          -> Core, Data    UI Toolkit / UGUI
Game.App         -> all           composition root, scene bootstrap
Game.*.Editor    -> matching runtime asm, editorOnly platform
Game.*.Tests     -> matching runtime asm, test assemblies
```

The rule that keeps this honest: an edit to a leaf assembly must not recompile `Game.Core`. If it does, the dependency arrows are wrong, and compile times will regress back toward the monolith over the next six months.

**Version control.** Perforce is the studio default because it provides exclusive checkout on binary types (a `.psd`, `.fbx`, `.unity` or `.prefab` cannot be edited by two people simultaneously if the typemap marks it `+l`), partial workspace sync so an artist does not clone 400 GB of history, and proxies for remote offices. Git with LFS works up to roughly 20–50 GB of assets and a team under about 15 people; past that, clone times, LFS bandwidth, and the absence of enforced locking on binary merges become the limiting factor. Solo: Git plus LFS with a strict `.gitattributes` is correct and cheap. Studio: Perforce, plus Unity Accelerator as a shared import cache so each machine does not re-import the same assets (import of a large project from cold is 1–6 hours; from an Accelerator, minutes).

**`.meta` file discipline.** Every asset has a sidecar `.meta` containing its GUID; every reference in Unity is by GUID, not by path. A `.meta` that is not committed means the next person to import that asset generates a new GUID, and every reference to it becomes null — the "all my prefabs lost their scripts" failure. Rules: commit `.meta` files always, move and delete assets from inside the Unity editor or with a tool that moves the `.meta` alongside, and add a CI check that fails when an asset exists without its `.meta` or a `.meta` exists without its asset.

## 6. What this engine does better than the others

Worth stealing conceptually even if you ship on something else.

**The editor as an extensible application.** `EditorWindow`, `CustomEditor`, `PropertyDrawer`, `ScriptableWizard` and UI Toolkit let a gameplay engineer build a bespoke designer tool in an afternoon, in the same language and codebase as the game. Most engines make tool authoring a separate project with a separate build. The lesson: the marginal cost of a custom tool determines how many custom tools exist, and a studio's content velocity is largely a function of tool count.

**C# as the gameplay language.** Compile-to-play in seconds, a real type system, a mature ecosystem, and no header/build-system tax. The productivity delta against C++ for gameplay iteration is large and consistently underestimated by engineers who have not measured it.

**Platform breadth, genuinely.** WebGL, Switch, iOS, Android, tvOS, Quest, Vision Pro, PS5, Xbox Series, Linux, and a long tail of embedded targets from one project. No competitor covers both the low-end mobile floor and the console ceiling from the same codebase with this little friction.

**Package-level modularity.** The Package Manager and Scoped Registries let a studio version and share internal packages the same way it consumes Unity's own, so a shared UI framework or a shared build pipeline is a real, versioned dependency rather than a copied folder.

**DOTS as an idea.** Even in engines with no ECS, the underlying principle transfers directly: store hot data in contiguous typed arrays keyed by index, iterate linearly, keep the per-frame working set inside cache. This is the largest available CPU win in any engine and it does not require Unity to apply.

**The job safety system.** Unity's job dependency tracker turns data races into deterministic editor-time exceptions by recording which job reads and which job writes each native container. Most engines let you write the race and discover it as a one-in-ten-thousand-frames crash on a customer machine. Any parallel system you build anywhere benefits from the same idea: make aliasing checkable at the container level rather than trusting reviewers to spot it.

**Addressables' ref-counted async content model.** Load by address, get a handle, release the handle, let the system decide residency. A cleaner content abstraction than manual bundle management or hard references, and worth reproducing wherever your engine gives you raw asset loading.

## 7. When Unity is the wrong choice

**Photoreal AAA with a large art team on high-end platforms only.** Unreal's material editor, Nanite, Lumen, Sequencer and animation toolset are ahead of HDRP's equivalents in artist throughput, and the available hiring pool for senior technical artists and rendering engineers skews Unreal in that segment. Failure mode: you spend 18 months building the content pipeline Unreal ships with, and it is still worse.

**Networked multiplayer as the core product.** Unity has no built-in equivalent of Unreal's actor replication with relevancy, dormancy and conditional property replication. Netcode for GameObjects is serviceable for co-op at small player counts; a 64-player shooter or a persistent world means building replication, prediction and reconciliation yourself or licensing middleware. Failure mode: eight engineer-months spent rebuilding a system that is free elsewhere.

**Deterministic lockstep simulation across platforms.** Unity's float behaviour and PhysX are not bit-deterministic across architectures and compilers, so lockstep RTS netcode requires a custom fixed-point deterministic simulation layer. This is achievable and several shipped titles did it; it is not a small project.

**Anything requiring engine source modification on a small budget.** Source access exists but is an enterprise licence with a real price and a heavy integration burden. Failure mode: hitting an engine bug you cannot fix and cannot route around, with your only recourse being a bug report and a wait measured in releases.

**Cinematic-heavy production with a dedicated cinematics team.** Timeline is competent for gameplay sequencing; it is not Sequencer. Studios doing hours of in-engine cinematics with camera departments and virtual production workflows are systematically better served elsewhere. Failure mode: your cinematics team builds their own tooling for eighteen months and still cannot iterate at the rate the schedule assumed.

**Console-first with a tiny team and no platform experience.** Unity's console support is real but the platform SDK integration, certification requirements and platform-specific performance work are less pre-solved than Unreal's. Failure mode: certification failures on requirements the engine could have handled for you.

## Pass conditions

Answer yes to every applicable line before the project is considered correctly set up.

1. Project pins an exact Unity LTS patch version in `ProjectSettings/ProjectVersion.txt`, and `Packages/packages-lock.json` is committed.
2. Every asset in version control has a committed `.meta`, verified by a CI check.
3. Runtime code is partitioned into at least four assembly definitions, and a single-file edit in the gameplay assembly recompiles in under 10 seconds.
4. Managed Stripping Level is Medium or High with an explicit `link.xml`, and a stripped player build passes a scripted smoke test in CI.
5. Shipping builds either warm a `ShaderVariantCollection` or implement `IPreprocessShaders`, and no material renders as the magenta error shader in the player smoke test.
6. A player build runs on the target device in CI on every merge to the main branch.
7. Performance gates use Profile Analyzer median comparison over at least 200 frames, not single-frame measurements.
8. The engine version, render pipeline, scripting backend, content system and VCS choices are recorded in a one-page decision document with the constraint that justified each.
