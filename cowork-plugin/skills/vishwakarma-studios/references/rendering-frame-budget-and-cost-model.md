# Rendering Pipeline: Frame Budget and GPU Cost Model

The frame budget is a fixed sum and every rendering decision spends from it. At 60 fps that sum is 16.67 ms; at 30 fps it is 33.3 ms; on a 120 Hz handheld it is 8.3 ms. Nothing about a feature's name tells you what it costs, so the only defensible way to discuss rendering is in milliseconds measured on the target hardware, attributed to a named pass. A team that says "we enabled screen-space reflections" has said nothing; a team that says "screen-space reflections cost 1.8 ms of a 15 ms GPU budget at our internal resolution" has said everything.

Everything below is stated against a 60 fps console target at 1080p internal resolution upscaled to 4K unless another target is named, because that is the most common AAA configuration and the numbers scale predictably from it.

## 1. The frame in order, and where the milliseconds go

A modern frame runs roughly this sequence, with variation by renderer. Culling determines what is submitted. Shadow depth passes render the scene from each shadow-casting light's point of view. A depth prepass renders opaque geometry depth-only so the main pass can reject occluded pixels before shading them. The opaque pass shades or writes a GBuffer. Lighting resolves, and global illumination contributes. Transparency and particles composite over the result. Post-processing runs as a chain of full-screen passes. UI composites last, usually at native rather than internal resolution. Present hands the frame to the display.

A worked GPU allocation for a 60 fps console target, budgeting 15.0 ms of a 16.67 ms frame and leaving 1.67 ms of headroom for variance:

| Pass | Budget (ms) | Share | What moves it |
|---|---|---|---|
| Culling and GPU-driven setup | 0.4 | 2.7% | Object count, instance count, cluster count |
| Shadow depth (3–4 cascades plus local lights) | 2.2 | 14.7% | Cascade resolution, shadow-casting light count, caster count |
| Depth prepass | 0.8 | 5.3% | Vertex count, draw calls, masked material count |
| Opaque base pass / GBuffer | 4.0 | 26.7% | Resolution, shader complexity, overdraw, GBuffer width |
| Deferred lighting and GI | 2.6 | 17.3% | Light count, GI method, resolution |
| Transparency and particles | 1.4 | 9.3% | Overdraw, particle count, sorting |
| Post-processing chain | 2.4 | 16.0% | Effect list, upscaler, resolution |
| UI and HUD | 0.4 | 2.7% | Output resolution, widget count, transparency layers |
| Present, copies, slack | 0.8 | 5.3% | Frame pacing, swapchain behaviour |
| **Total** | **15.0** | **100%** | |

Two structural observations from that table. The base pass plus lighting is 44% of the frame, which is why internal resolution and shader complexity dominate every optimisation conversation. And shadows plus post-processing together are 31%, which is more than most teams expect and is the reason a "cheap" post stack quietly costs a third of the frame.

The CPU budget is separate and runs in parallel. A typical AAA target splits a 16.67 ms frame across a game thread at 8–10 ms and a render thread at 8–12 ms, pipelined so frame N's render thread overlaps frame N+1's game thread. This introduces one to two frames of latency between input and display, which is a design cost paid for throughput. Whichever of game, render, RHI submission and GPU is largest is the bottleneck, and optimising any of the other three changes nothing — measure all four before touching anything.

Frame pacing is separate from frame time and is the difference between a smooth 30 fps and a 30 fps that feels broken. If frames take 28, 38, 30, 36 ms, the average is 33 ms and the experience is judder, because the display presents at fixed intervals and a frame arriving late is shown twice while the next is dropped. Consistency beats average: a locked 33.3 ms is better than an average of 28 ms with 45 ms spikes. Enforce it with a frame rate limiter plus dynamic resolution, and measure the 99th percentile frame time rather than the mean — the mean hides exactly the frames players notice.

Solo: hold one budget line, GPU total, and check it on the weakest machine you intend to support. Studio: budget per pass, per platform, captured automatically on target hardware nightly, with a named owner per pass and a regression threshold that fails the build.

## 2. Culling: the cheapest milliseconds available

Nothing is faster than not drawing. The culling stack, in the order it should be applied and roughly what each removes:

| Stage | Mechanism | Typical removal | Cost |
|---|---|---|---|
| Distance culling | Per-object max draw distance | 30–60% of a dense open world | Near zero |
| Frustum culling | Bounding volume against the six frustum planes, SIMD across arrays | 50–70% of what remains | 0.05–0.3 ms CPU, or free on GPU |
| Occlusion culling | Hardware queries, or hierarchical Z-buffer tests against last frame's depth | 20–50% in dense interiors, near 0% in open terrain | 0.2–0.8 ms plus one frame of latency |
| Precomputed visibility | Baked cell-to-cell visibility sets | 60–90% in cell-based interiors | Bake time; memory |
| Cluster culling | Per-meshlet bounds and cone-backface tests on GPU | 40–70% of remaining triangles | Included in GPU-driven setup |
| Small-object screen-size culling | Reject anything below a screen-size threshold | Long tail of clutter | Near zero |

Occlusion culling is the one that is most often wrong. Hardware occlusion queries introduce a frame of latency, because the query result is read next frame, which produces popping when the camera moves fast; hierarchical Z approaches test against the previous frame's depth pyramid, which has the same latency but degrades more gracefully. Neither helps in an open landscape where nothing occludes anything, and both cost CPU or GPU time to produce no result. Measure the rejection rate before keeping it: if occlusion culling rejects under 15% of submitted objects, it is costing more than it saves.

The measurement that matters is not "how many objects did we cull" but "what is the ratio of rendered to submitted". A scene submitting 12,000 objects and rendering 9,000 has a culling problem regardless of how good the culler is, because the submission itself is the cost.

## 3. Forward, deferred, and clustered forward

Three architectures, distinguished by where lighting happens and what that implies for memory bandwidth, MSAA and transparency.

**Forward** shades each pixel of each object against every light affecting it, during the object's own draw. Cost scales as objects x pixels x lights, so it degrades badly with light count: naive forward with per-object light lists is fine at 2–4 lights per object and unusable at 20.

**Deferred** writes surface attributes to a GBuffer during the opaque pass, then runs lighting once per pixel per light against that buffer. Cost decouples from object count entirely — 500 lights cost the same regardless of how many objects they touch. The price is memory bandwidth and inflexibility.

**Clustered forward (forward+)** divides the view frustum into a 3D grid of froxels — typically 16x8x24 or 32x16x32 — assigns each light to the froxels it touches, and shades forward against the per-froxel light list. It keeps forward's material flexibility and MSAA compatibility while getting deferred's light scaling.

| | Forward | Deferred | Clustered forward |
|---|---|---|---|
| Practical dynamic light count | 2–6 per object | Hundreds | Hundreds |
| Crossover where deferred wins | — | Above roughly 4–8 lights per pixel | — |
| GBuffer bandwidth per frame at 1080p | None | ~41 MB written, ~41 MB read | None |
| MSAA | Native, cheap | Requires per-sample lighting: 4x lighting cost and 4x GBuffer memory | Native, cheap |
| Transparency | Native | Requires a separate forward path | Native |
| Material/shading model variety | Unlimited | Constrained by GBuffer layout | Unlimited |
| Decals | Awkward | Trivial (write into the GBuffer) | Awkward |
| Overdraw sensitivity | High without a prepass | Low | Moderate |
| VR suitability | Good | Poor (MSAA matters, bandwidth doubles) | Best |

The bandwidth arithmetic deserves the specific number, because it is what makes deferred expensive at high resolution. A typical GBuffer is four render targets plus depth, roughly 20 bytes per pixel. At 1920x1080 that is 2.07 megapixels x 20 bytes = 41 MB written per frame and read back once by the lighting pass, so 83 MB of traffic. At 60 fps that is 5.0 GB/s. At native 4K it is four times that: 20 GB/s of the roughly 450 GB/s a current console offers, spent on nothing but moving the GBuffer, before textures, vertices, shadow maps or post-processing. This is the mechanism behind the industry's move to rendering at 1080–1440p internal and upscaling: bandwidth scales with pixel count, and pixel count is the one lever that reduces every bandwidth consumer simultaneously.

Choose deferred for many dynamic lights, heavy decal use and a constrained shading model — most open-world and shooter content. Choose clustered forward for VR, for mobile, for stylised games with unusual shading models, and for anything where MSAA is required. Unity's URP is forward or forward+ (clustered) and HDRP is deferred with a forward option; Unreal's desktop renderer is deferred with a forward path intended for VR; Godot 4's Forward+ is clustered, with a Mobile forward renderer and a Compatibility path.

## 4. The shader cost model

A GPU shader's cost is one of four things, and optimising the wrong one changes nothing.

**ALU.** Arithmetic throughput. A current console GPU offers roughly 10–12 TFLOPs, so at 1080p and 60 fps there are roughly 80,000 float operations available per pixel per frame in total across all passes — which sounds enormous and is consumed quickly at 3x overdraw across eight passes. ALU is rarely the actual bottleneck in game shaders.

**Texture fetch.** A texture unit fetches at a fixed rate, and a filtered anisotropic fetch costs more than a point fetch — 16x anisotropic can be 4–8x the cost of trilinear. Fetch latency is 200–600 cycles, hidden by having enough waves in flight. This is usually the real bottleneck, and the usual fix is fewer, better-packed textures: three channels of grayscale data in one RGB texture rather than three textures.

**Bandwidth.** Moving bytes between memory and the GPU. The GBuffer arithmetic from section 3 is the canonical case, but shadow maps, particle blending and the post chain all contribute. Bandwidth is the limit that scales with resolution, which is why upscaling helps so much.

**Occupancy.** How many waves are in flight to hide latency. Register pressure determines this: on RDNA hardware a shader using more than 64 vector registers roughly halves occupancy, and below about 8 waves per SIMD there is not enough work to hide texture latency, so the shader stalls even though its ALU and fetch counts look reasonable. A shader that gets 30% slower after a small addition has almost certainly crossed a register threshold. Check the compiled register count, not the instruction count.

The specific costs worth naming:

**Dependent texture reads** — an address computed from the result of a previous fetch — serialise two latencies that could otherwise overlap. Two levels of dependency is common (a normal map feeding a reflection lookup); four levels is a stall.

**Overdraw** multiplies the pixel shader by the number of times each pixel is shaded. A depth prepass costs one cheap geometry pass and eliminates opaque overdraw entirely by letting early-Z reject occluded fragments before shading, which is why it earns its 0.8 ms. Masked (alpha-tested) materials defeat early-Z on some hardware because the depth is not known until the shader runs, so a foliage-heavy scene loses the prepass benefit exactly where it needs it most.

**Branching** on a GPU executes per wave, not per lane. A branch where all 32 or 64 lanes in the wave take the same path costs almost nothing; a divergent branch executes both sides and masks the results, so the cost is the sum. Branch on values that are coherent across screen space (a material ID, a light count from a froxel) and never on values that vary per pixel randomly.

**Permutation explosion.** Every static switch, quality level, vertex factory and shader platform multiplies the shader count. A master material with 8 static switches is 256 permutations per vertex factory per platform; with 12 vertex factories and 4 platforms that is 12,288 shaders from one asset. This costs build time, package size, and — through pipeline state object compilation at runtime — visible hitching. Prefer uniform parameters (zero permutations) over static switches, prefer coherent dynamic branches over static switches on modern hardware, and audit the total shader count per milestone.

## 5. Draw calls, state changes, instancing, indirect

A draw call's cost is mostly CPU: validation, resource binding and command buffer construction. Numbers per draw call, submitted:

| API / platform | Cost per draw call | Practical budget at 60 fps |
|---|---|---|
| DX11 / OpenGL | 5–20 µs | 800–2,000 |
| DX12 / Vulkan / Metal, precompiled PSOs | 1–3 µs | 3,000–6,000 |
| Console native APIs | 0.5–2 µs | 5,000–10,000 |
| Mobile GLES3 | 15–50 µs | 100–300 |
| Mobile Vulkan | 5–15 µs | 300–800 |

State changes cost more than draws. A pipeline state object switch is 10–40 µs on older APIs and is why sorting by material before sorting by mesh is the standard submission order: changing shader is expensive, changing vertex buffer is cheap, changing a constant is nearly free.

**Instancing** draws N copies of one mesh in one call, with per-instance data (transform, colour, LOD index) in a structured buffer. It pays above roughly 10 instances and scales to tens of thousands. The constraint is that all instances share a material and a mesh, which is an art pipeline requirement — a forest of 40 unique tree assets instances 40 times worse than a forest of 6 assets with per-instance colour and scale variation.

**Static batching** merges distinct meshes sharing a material into one buffer at build time, trading memory for draw calls. **Dynamic batching** does the same per frame on the CPU for small meshes and is usually a net loss above a few hundred vertices, because the CPU merge costs more than the draw it saved.

**GPU-driven rendering with indirect draws** is the endpoint: cull on the GPU, write draw arguments into a buffer, and issue one `ExecuteIndirect` covering thousands of draws. CPU draw call count becomes effectively constant and independent of scene complexity. This is what makes Nanite's "draw call count is not a design constraint" claim true, and it is available to hand-written renderers with mesh shaders or compute-based culling. The cost is that per-object CPU logic — per-object material overrides, per-object visibility from gameplay — must move to GPU-readable data.

## 6. Transparency: sorting, overdraw, and why mobile dies

Transparent surfaces cannot write depth, because a surface behind them may still need to be visible. Three consequences follow directly.

**Sorting.** Transparents must be drawn back to front for correct blending, which means sorting per draw by depth every frame — a CPU cost — and it means intersecting transparent surfaces cannot be resolved correctly at all, because their correct order differs per pixel. Order-independent transparency techniques (weighted blended OIT, per-pixel linked lists, depth peeling) exist and cost 1–4 ms; most games instead accept the artefact and author around it.

**No early-Z rejection.** Every transparent layer runs its full pixel shader for every pixel it covers, whether or not something opaque will cover it later. Ten overlapping particle quads covering the screen is ten full-screen pixel shader invocations.

**Fill rate is the limit.** This is the mechanism behind particle-heavy scenes collapsing on mobile. At 1080p, one full-screen layer is 2.07 million pixel shader invocations. A modest particle effect with 8x average overdraw across a third of the screen is roughly 5.5 million invocations per frame; at 30 fps that is 166 million per second. A mid-range mobile GPU shading a non-trivial particle shader manages a small fraction of that, and the frame rate falls off a cliff rather than degrading gracefully, because the cost is proportional to screen coverage and a particle system that grows as it dissipates covers more screen exactly as it becomes least important.

The controls, in order of effect. Cap overdraw by authoring particles with tighter alpha and fewer, larger quads rather than many small ones. Use trimmed particle geometry — a fitted polygon around the texture's opaque region rather than a full quad — which typically removes 30–60% of wasted fill. Render particles at half or quarter resolution and composite with a depth-aware upsample, which cuts fill by 4x or 16x for soft, low-frequency effects. Use soft particles to avoid hard intersections but note they add a depth fetch per pixel. Cap the total on-screen particle count with a budget system that culls by importance rather than by spawn order. And measure with an overdraw visualisation view mode rather than by eye, because overdraw is invisible in the final image by construction.

The related failure at AAA scale is not mobile but volumetrics stacked with particles: volumetric fog, a froxel grid ray march, and a large particle system both sample and write the same low-frequency regions, and their combined cost is superlinear because the particle pass then reads the fog volume per layer. Budget them together rather than separately.

Mobile specifically: tile-based deferred rendering keeps blending in fast on-chip tile memory, so the blend itself is cheap, but the pixel shader invocations are not, and the tile memory budget is what forces small GBuffers on mobile in the first place. Budget under 2x average overdraw for transparents on mid-range mobile, against 4–8x on console.

## Pass conditions

Answer yes to every applicable line before the rendering configuration is considered correct.

1. A millisecond budget exists per pass for each target platform, derived from the frame rate target, and is recorded rather than implied.
2. Game thread, render thread, RHI submission and GPU times are measured separately, and the identified bottleneck is named before any optimisation begins.
3. The renderer choice (forward, deferred, clustered) is justified against the project's light count, MSAA requirement and transparency load, not inherited by default.
4. A depth prepass is enabled where the content is opaque-heavy, and its benefit has been measured rather than assumed.
5. Culling rejection rates are measured per stage, and any stage rejecting under 15% of submissions has been removed.
6. Transparent overdraw is measured with an overdraw view mode against a stated cap, and particles use trimmed geometry and reduced-resolution rendering where the effect is soft.
7. Draw call count is measured against the platform budget, submission is sorted by pipeline state then material then mesh, and instancing or indirect draws cover any repeated geometry above ten instances.
8. Shader permutation count is tracked per milestone, static switches per master material are capped, and a PSO cache gathered from automated playthroughs ships on every platform that compiles pipeline states at runtime.
9. Shader register counts are checked for the most expensive materials, and occupancy is inspected before ALU count is optimised.
10. The 99th percentile frame time is tracked alongside the mean, and frame pacing is enforced by a limiter plus dynamic resolution rather than left to vary.
