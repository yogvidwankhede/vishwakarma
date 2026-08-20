# Production Pipeline: Validation, Build Automation and Iteration Speed

Once assets are flowing and the depot is laid out, the pipeline's remaining job is to keep bad content out and to keep everyone's turnaround short. This part covers submit-time validation gates, build and cook automation, automated testing on target hardware, and the iteration loops those things determine. Version control, depot layout and the DCC-to-engine asset flow live in `production-source-control-and-asset-flow.md`.

## 1. Validation gates at submit time

Validation gates are where the pipeline earns its cost. A validator runs at submit time — as a Perforce trigger, a pre-flight CI job, or an editor-side check that blocks the submit dialogue — and rejects assets that violate budgets. Rejecting at submit costs the artist two minutes; discovering the same problem in a cook costs the build engineer an afternoon; discovering it in certification costs a submission slot. The checks worth having from the first month: naming convention conformance, texture dimensions and maximum size per class of asset, texture compression settings matching the channel suffix, triangle count against the asset's budget category, material slot count per mesh, presence of LODs and collision where required, lightmap UV existence and overlap, non-uniform or negative scale on prefabs, missing or duplicate references, and hard-reference footprint against a per-asset memory allowance.

Studio: make the validator a shared library invoked identically by the editor, the pre-flight and the nightly full-content audit, so an artist can run locally exactly what will reject them. Publish the failure with the fix — "T_Crate_01_N is set to sRGB; normal maps must be linear; fix in the texture's compression settings" — because a validator that says only "failed" trains people to route around it. Solo: run the same checks as a scripted pass once per milestone; the discipline matters more than the timing.

Gates work in tiers, and the tier is chosen by how expensive the check is against how early it must fire. A check that runs in the editor as the artist works costs nothing and catches the cheap mistakes; a check that runs at submit costs seconds and is the last point at which the cost is borne by the person who caused it; a check that runs nightly over all content catches drift that per-asset checks cannot see, such as total memory across a category. Every check that is not at submit time is a check whose cost lands on someone else.

| Tier | Latency | Catches | Cost of a failure at this tier |
|---|---|---|---|
| Editor-side, on save or import | Instant | Naming, compression settings, missing suffixes, obvious budget breaches | Seconds, borne by the author |
| Pre-submit trigger or pre-flight | 30 s–10 min | Everything above plus cross-asset references and build breakage | Minutes, borne by the author |
| Nightly full-content audit | Hours | Category totals, orphaned assets, duplicate content, budget drift across the whole game | A day, borne by a lead |
| Milestone deep audit | Days | Streaming behaviour, memory on hardware, load times, reference graph pathologies | A milestone, borne by the project |

Budgets are the numbers the gate compares against, and they must exist as published per-class values rather than as a lead's judgement, because a judgement cannot be automated and does not scale past the leads' attention. Derive them from the platform memory budget downward — total budget, minus engine and OS reserve, split by category, divided by the expected count of resident assets — and record the derivation so the number can be re-derived when the platform target changes rather than argued about.

| Asset class | Typical AAA budget | Enforced by |
|---|---|---|
| Hero character, triangles | 60k–120k plus LOD chain to under 2k | Submit validator against a per-class table |
| Environment prop, triangles | 500–8k plus LODs | Submit validator |
| Texture, largest dimension | 4096 hero, 2048 standard, 512 small prop | Submit validator against the asset's class |
| Material slots per mesh | 1–4 | Submit validator; each slot is a draw call |
| Skeletal mesh bone count | 100–250 depending on platform | Submit validator |
| Audio source file | 48 kHz WAV, mono for positional sources | Submit validator |
| Per-asset hard-reference footprint | Class-dependent, published | Nightly audit with per-asset report |

Provide an override, because a gate without an escape hatch is a gate people disable. The override is a flag on the submit that requires a named approver, records a reason, and appears on a weekly report of every override taken. Studio: review that report at the milestone — a rule overridden twenty times per week is a wrong rule and should be changed rather than routed around, and a rule overridden once is a legitimate exception. Solo: the same mechanism as a comment in the commit, since the point is the record rather than the ceremony.

## 2. Build automation

Game CI differs from web CI in ways that break naive setups. Agents need 200 GB–2 TB of disk per workspace, engine and DCC licences, sometimes a real GPU for rendering tests, and a warm workspace — syncing 500 GB from scratch takes longer than the build. That last point drives the whole design: agents keep persistent workspaces and are therefore stateful, so state must be managed deliberately with periodic clean builds rather than assumed away.

Incremental builds are what the team lives on and clean builds are what catch the lies. An incremental build reuses object files, derived data and cooked content whose inputs have not changed; it is 5–20 minutes and it is what a pre-flight runs. A clean build discards all of that and is 1–4 hours for code plus the cook; it runs nightly because state-dependent breakage — a stale generated header, a cooked asset whose source was deleted, a shader cached from a since-edited material — is invisible to incremental builds and appears in the one build that matters, the release candidate.

| Operation | Single workstation | Distributed + shared cache | Notes |
|---|---|---|---|
| Full code build, large C++ project | 40–90 min | 5–15 min | Speedup is sublinear; link is serial |
| Incremental code build | 30 s–5 min | 20 s–2 min | Header changes dominate; IWYU discipline pays |
| Full shader compile, cold | 2–8 h | Minutes with a warm DDC | The largest single first-run cost |
| Full cook, one platform | 1–8 h | 20 min–2 h | Dominated by shaders and texture compression |
| Iterative cook after content change | 5–40 min | 2–10 min | The number designers actually feel |
| Package, compress, sign, patch-generate | 20–90 min | 20–90 min | Poorly parallelisable; runs per platform |
| Nightly across 5 platforms | Not feasible | 4–10 h wall clock | Only if platforms run on separate agents in parallel |

Distributed compilation is the first lever and it is close to mandatory above about fifteen engineers. Incredibuild, FASTBuild and UnrealBuildAccelerator all farm translation units across idle machines or dedicated agents; realistic speedups are 4–10x on a 30–60 core pool, sublinear because header parsing is duplicated and linking is serial. FASTBuild is free and requires you to describe your build; Incredibuild is commercial, integrates with less work, and additionally distributes shader compilation, which is often the larger win.

Shader compilation deserves separate treatment because its cost is not proportional to anything a programmer sees. A project with a dozen master materials, eight static switches each, a dozen vertex factories and four shader platforms generates hundreds of thousands of permutations; each is a compiler invocation of tens to hundreds of milliseconds. That is hours of CPU, and it recurs whenever a master material changes. The mitigations, in order: cap static switches per master material and audit the count per milestone; farm compilation across the same distributed pool as code; and — the decisive one — share the results.

The derived data cache is the single highest-leverage piece of build infrastructure a team can own. It stores everything computed deterministically from source assets: compiled shaders, platform texture formats, built meshes, distance fields, lightmaps, Nanite or virtualised geometry data. Without a shared DDC, every person who syncs a new material recompiles its permutations locally and a fresh workstation costs 2–8 hours before the editor is usable. With one, the first machine through pays and everyone else fetches. Studio: run a shared DDC from day one — a network share below about fifteen people, a cloud DDC service above that — monitor hit rate with a target above 90%, and treat a DDC outage as a build-blocking incident, because a 60% hit rate quietly costs every engineer an hour a day.

Build distribution to non-programmers is the other half. Artists and designers should never compile. A binary distribution tool (Unreal Game Sync, or an equivalent that syncs content plus precompiled editor binaries matched to a changelist) means a designer's morning is a five-minute sync rather than a forty-minute build they do not understand and cannot debug. Studio: this is usually the highest-return single piece of tooling to build or adopt in the first quarter of production.

Two artefacts must be archived per build and are routinely not. First, debug symbols for every shipped and tested configuration, stored against the build ID permanently — without them the crash reports described in `shipping-and-liveops.md` are unreadable addresses, and the symbols cannot be regenerated once the toolchain or source has moved. Second, the exact changelist and toolchain versions, so any build can be reproduced. Studio: make build ID, changelist, symbol location and platform a single record written by CI at package time and queryable by QA, support and engineering; the recurring alternative is a QA report against "yesterday's build" that nobody can identify.

Retention needs a policy because game build artefacts are large: a packaged multi-platform build is 50–200 GB, and nightly builds retained forever consume petabytes. Keep everything for a fortnight, keep milestone and submitted builds forever, keep symbols forever regardless of the build they came from, and delete the rest automatically.

## 3. Automated testing on target hardware

Automated testing in games protects against regression, not against badness. No test tells you whether the game is fun, whether combat feels good or whether the level reads; those are decided by observed play. What tests do is stop a project from silently losing something it already had, which on a two-year schedule with eighty contributors is the more common failure by a wide margin.

The smoke test is the highest-value single test and it is cheap. Boot the packaged build, load every level in sequence, run sixty seconds of scripted or recorded input in each, and quit cleanly, asserting no crash, no assert, no fatal log and no infinite load. That catches most catastrophic breakage — a missing asset reference, a null in startup, a level that no longer loads — and it runs in 10–30 minutes. Run it on every pre-flight for the primary platform and nightly for all platforms.

Above the smoke test, the tests that repay their maintenance cost in a game project are narrow. Deterministic simulation tests for anything with a replay or lockstep requirement, because a determinism break is invisible until it desynchronises a match. Save/load round-trip tests over a matrix of game states, because save corruption is a certification failure and a support catastrophe. Content audit tests that walk the reference graph for missing, duplicated and orphaned assets. Unit tests for pure logic — damage formulas, economy calculations, procedural generation seeds — where the input and output are values rather than a rendered frame. Pixel-comparison rendering tests are attractive and are usually a maintenance sink; restrict them to a small number of deliberately stable reference scenes.

Performance regression testing needs real hardware, which means a devkit farm. Four to ten units per platform, wired for automation and remote power cycling, running a fixed set of camera flythroughs and scripted play sessions every night, recording frame time percentiles, GPU and CPU time, memory high-water mark, load times and streaming stalls. The mechanism that makes this worth the capital cost is that performance degrades by 1–2% per week from a hundred small unattributable changes, and the only way to attribute a regression is to have measured the night before. Alert on a 5% regression in any tracked metric and bisect against the changelist range; without nightly data, the same investigation at milestone time is a week of work with a much larger suspect list.

Flakiness must be managed or the whole apparatus becomes decoration. A test that fails intermittently and is ignored trains everyone to ignore all failures, which is worse than not having the test. Quarantine flaky tests to a separate non-blocking suite with a named owner and a deadline, and delete a test that nobody will fix. Studio: publish the pass rate of the blocking suite as a metric; if it is below 98% the suite is not blocking anything, it is annoying everyone.

## 4. Cook and package times gate iteration

Cooking converts editor assets into platform-native form: textures compressed to the platform's block format, shaders compiled for the platform's API, meshes converted, audio encoded, and the whole set packaged into archives. It is the step between "the change exists" and "someone can play it on the target device", and its duration sets the iteration rate for everyone who is not working in the editor.

The arithmetic is unforgiving. If a full cook is six hours, a designer who needs a console build to evaluate a change gets one attempt per day, which means a tuning pass that would take an afternoon on PC takes a fortnight on the platform where it matters. Teams then respond by tuning on PC and discovering at beta that the console feel is different, which is a schedule event.

The levers, in order of typical impact. Iterative cook reuses previously cooked output whose source is unchanged, turning a six-hour cook into a ten-minute one for a small change; it requires the cook to be correctly dependency-tracked, which is worth fixing when it breaks rather than working around. Cook-on-the-fly serves assets to a running device from an editor process, which removes the cook from the loop entirely for content iteration at the cost of representativeness. Per-platform incremental packaging avoids repackaging archives whose contents did not change. And chunking — splitting content into archives along ownership and streaming lines — means a change to one team's content invalidates one chunk rather than the whole package, which matters for cook time now and for patch size later.

Set an explicit target and treat it as a tracked metric: designers and artists should be able to get a playable build on the primary target platform that is no more than two hours behind mainline, and QA should have a fresh full build every morning. Studio: publish cook duration per platform per night on the same dashboard as frame time and memory, because it degrades monotonically as content grows and nobody files a bug about it.

The loop that matters is per role, and each role's loop should be measured rather than assumed:

| Role | Change | Acceptable loop | Mechanism that delivers it |
|---|---|---|---|
| Gameplay engineer | C++ function body | Under 30 s | Live patching or hot reload, editor stays open |
| Gameplay engineer | Header or class layout | Under 5 min | Incremental build, distributed compile |
| Designer | Tuning value | Under 5 s | Data-driven values reloaded at runtime, no cook |
| Designer | Level layout | Under 2 min | Editor play-in-editor, cook only for platform checks |
| Artist | Texture or mesh | Under 2 min | Import plus shared DDC hit, no full cook |
| Technical artist | Master material | Under 15 min | Shader compile farm plus DDC |
| Anyone | Verify on console | Under 2 h | Iterative cook plus deploy, or cook-on-the-fly |

Studio: measure these quarterly by timing a representative change per role, and treat a regression in any row as a build engineering task with the same priority as a frame time regression, because a doubled loop halves the effective size of the discipline it affects.

## Pass conditions

Answer yes to every applicable line before the project is considered correctly set up.

1. A submit-time validator rejects assets that violate texture, triangle, material slot, LOD, collision, lightmap UV and hard-reference budgets, and reports the fix alongside the failure.
2. Every submit-time override is recorded with an approver and a reason and reviewed at the milestone.
3. A shared derived data cache is running, its hit rate is monitored with a target above 90%, and an outage is treated as a build-blocking incident.
4. Distributed compilation is configured for both code and shaders, and full build time is tracked per night.
5. Non-programmers receive precompiled binaries and never invoke a compiler.
6. A clean build runs nightly in addition to incremental pre-flight builds, and its failures are triaged before any incremental failure.
7. Debug symbols and the exact changelist are archived permanently for every packaged build, keyed by a build ID that QA and support can quote.
8. A smoke test boots the packaged build, loads every level, plays scripted input and quits cleanly, on every pre-flight for the primary platform and nightly for all platforms.
9. A devkit farm runs nightly performance capture on real hardware, and a 5% regression in frame time, memory high-water or load time raises an alert with a changelist range.
10. The blocking test suite passes above 98% of runs, and flaky tests are quarantined with a named owner rather than ignored.
11. Designers can obtain a playable build on the primary target platform no more than two hours behind mainline, and this latency is a tracked metric.
12. Cook duration per platform is published on the same dashboard as frame time and memory.
