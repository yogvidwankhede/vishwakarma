# Rendering Pipeline: Post, Assets, Resolution, and Profiling

This part covers everything downstream of shading the scene: the post-processing chain, geometry and LOD, texture memory and streaming, resolution scaling and temporal upscaling, and the profiling workflow and platform budget tables that hold all of it together. Frame budgets and cost model are in rendering-frame-budget-and-cost-model.md; materials and lighting are in rendering-materials-lighting-and-shadows.md.

## 1. Post-processing, per effect

The post chain is a sequence of full-screen passes, each reading and writing at least one full-resolution buffer, so its cost is dominated by bandwidth and scales linearly with pixel count. Costs below are at 1080p on a current-generation console GPU; multiply by roughly 3.5x for native 4K.

| Effect | Cost (ms) | Mechanism | Notes |
|---|---|---|---|
| TAA | 0.3–0.6 | Reproject last frame, blend with neighbourhood clamping | Requires motion vectors for everything, including vertex-animated geometry |
| TSR / DLSS / FSR2 / XeSS (quality) | 0.8–2.5 | Temporal accumulation with upscaling | Replaces TAA; do not run both |
| SSAO / GTAO | 0.5–1.2 | Depth-buffer horizon sampling | Half resolution plus a bilateral upsample halves cost |
| SSR | 0.8–2.5 | March the depth buffer along the reflection vector | Fails at screen edges and on off-screen contributors; fall back to reflection probes |
| Bloom | 0.3–0.6 | Downsample chain, blur, upsample and add | Cost is fixed; quality comes from mip count, not from radius |
| Depth of field (gather bokeh) | 0.8–2.0 | Scatter-as-gather at half resolution with a near/far split | The most expensive commonly shipped effect after upscaling |
| Motion blur | 0.4–0.9 | Velocity-buffer tile max, then directional gather | Requires the same motion vectors as TAA |
| Volumetric fog / light shafts | 0.6–2.0 | Froxel grid ray march, typically 160x90x64 | Cost is grid resolution, not scene complexity |
| Tonemapping and colour grading | 0.1–0.3 | Per-pixel curve plus a 32^3 LUT fetch | Combine with other passes; never a standalone pass |
| Chromatic aberration, vignette, grain, sharpen | under 0.1 combined | Cheap per-pixel maths | Merge into the tonemap pass |
| **Typical shipped chain** | **2.4–4.0** | | |

Two rules. Merge passes: each separate full-screen pass costs a full read and write of the frame buffer regardless of how trivial its maths, so five cheap effects as five passes cost far more than five cheap effects in one shader. And order matters for correctness, not just cost — SSAO and SSR read the depth and GBuffer so they run before lighting resolves or immediately after; motion blur and DOF run before upscaling only if the upscaler expects them to (most temporal upscalers want to run on the un-blurred image and have DOF applied after); UI composites after everything, at output resolution, or it becomes blurry and shimmers.

## 2. Geometry: level of detail, vertex cost, and virtualised meshes

Vertex cost is the budget line teams forget because it is invisible in a screenshot. A vertex is transformed once per pass it appears in: depth prepass, each shadow cascade it casts into, and the base pass. A character in four cascades is transformed six times per frame. This is why triangle budgets are stated as *visible* triangles and why a scene that renders 8 M visible triangles is actually transforming 30–40 M vertices.

Traditional discrete LOD chains remain the correct default outside Unreal's Nanite. The rule of thumb that holds: each LOD level should halve the triangle count and switch at a screen-size threshold where the reduction is not visible, which in practice means roughly 50%, 25%, 12% and 5% screen size for LOD 0 through 4. Screen-size-based switching is correct and distance-based switching is not, because distance ignores field of view and object size — a distance-based LOD pops on a scoped rifle and never switches on a large building.

| LOD | Screen size | Triangle share | Material |
|---|---|---|---|
| 0 | > 50% | 100% | Full, all maps |
| 1 | 25–50% | 50% | Full |
| 2 | 12–25% | 25% | Reduced: drop detail normal, drop parallax |
| 3 | 5–12% | 10% | Simplified shader |
| 4 / imposter | < 5% | 1–3% or a billboard | Unlit or vertex-lit |

Popping between levels is solved by dithered transition — cross-fade the two LODs over 0.15–0.3 s using a screen-space dither pattern that TAA resolves — at a cost of rendering both LODs during the transition. Budget for that overlap; a scene where the camera moves fast can have 20% of objects mid-transition.

**Nanite** and equivalent virtualised geometry replace the LOD chain with GPU cluster selection: the mesh is decomposed into clusters of roughly 128 triangles, and the GPU selects the cluster LOD per view per frame and rasterises through a visibility buffer, using a software rasteriser for sub-pixel triangles. The wins are removing LOD authoring entirely and decoupling draw call count from scene complexity. The costs are a fixed 1.5–4 ms per frame regardless of scene complexity — so a simple scene renders slower with it than without — a 1.5–4x disk size increase for the cluster data, no DX11 path, and a fast path that masked and translucent materials fall off. Dense two-sided masked foliage is the specific case where a traditional LOD chain with instancing beats it, because that content is high-overdraw and low-triangle-density per pixel, which is the inverse of what cluster selection optimises.

**Mesh shaders** are the general form of the same idea and are available outside Unreal: the geometry pipeline is replaced by an amplification shader that culls meshlets and a mesh shader that emits them, giving per-meshlet frustum, backface-cone and occlusion culling on the GPU. Availability is DX12 Ultimate, Vulkan with the mesh shader extension, and current consoles — which is also the hardware floor for adopting them.

Tessellation and displacement are worth an explicit warning: adaptive tessellation costs are unpredictable because they depend on the camera's distance to the surface, and a camera moving close to a tessellated ground plane can multiply triangle counts by 50x in one frame. If tessellation is used at all, clamp the tessellation factor by distance and cap it, and profile with the camera in the worst position a player can reach, not the position the artist framed.

## 3. Texture streaming, virtual texturing and memory

Texture memory is usually the largest single consumer of a platform's memory budget and the most common cause of the pop-in players describe as "the textures load in late".

Uncompressed, a 4096x4096 RGBA8 texture is 67 MB. Block compression brings this down decisively:

| Format | Bits per texel | 4K texture size | Use |
|---|---|---|---|
| BC1 / DXT1 | 4 | 11 MB with mips | Opaque colour, low fidelity |
| BC3 / DXT5 | 8 | 22 MB with mips | Colour with alpha |
| BC4 | 4 | 11 MB | Single-channel: roughness, metallic, AO |
| BC5 | 8 | 22 MB | Two-channel normal maps (Z reconstructed) |
| BC6H | 8 | 22 MB | HDR: lightmaps, cubemaps |
| BC7 | 8 | 22 MB | High-quality colour; the modern default |
| ASTC 6x6 | 3.56 | 10 MB | Mobile, variable block size |

Mip chains add 33% and are non-negotiable: sampling a texture without mips at a distance produces both aliasing and a cache-hostile access pattern, so the unmipped texture is slower *and* worse-looking.

**Texture streaming** keeps only the mip levels currently needed resident, sized by the screen-space footprint of the objects using each texture. The streaming pool is a hard budget — 1.5–4 GB on console, 200–600 MB on mobile — and when it is exceeded the streamer drops mips, which is the blurry-texture failure everyone recognises. Diagnose with the engine's streaming statistics (Unreal's `stat streaming` and the texture streaming overview) rather than by eye, because the pool being over budget and the pool thrashing are different problems: over budget shows as persistently low-resolution textures, thrashing shows as textures resolving and then dropping again as the camera moves.

**Virtual texturing** pages fixed-size tiles of a very large texture on demand, decoupling texture size from memory entirely. Runtime virtual texturing additionally caches composited material results — layered terrain blends, decal accumulation — so the expensive blend runs once per tile rather than per pixel per frame. Costs: an indirection fetch per sample, a page table update, and a page-fault latency of one to several frames that appears as a brief low-resolution tile. It is the correct answer for large terrains and for anything with expensive layered materials, and unnecessary for standard object texturing.

Budget shape at AAA console scale, of a roughly 10–13 GB usable pool: textures 3–5 GB, meshes and geometry 1–2 GB, animation 0.3–0.8 GB, audio 0.15–0.4 GB, GBuffer and render targets 0.5–1.5 GB, shadow and GI structures 0.3–1 GB, and the rest gameplay, code and slack. Every one of those is a tracked number with an owner; the render targets line in particular grows silently as effects are added, and a 4K deferred renderer with a full post chain can hold 2 GB of render targets alone.

## 4. Resolution scaling and temporal upscaling

Rendering internally below output resolution and upscaling is the single largest lever available, and it is important to be precise about what it does and does not reduce.

| Reduced by lowering internal resolution | Not reduced |
|---|---|
| Pixel shader invocations (quadratic in linear scale) | Vertex and geometry processing |
| GBuffer bandwidth | Shadow map rendering (its own resolution) |
| Lighting and GI cost | CPU time of any kind |
| Screen-space effects (SSAO, SSR) | Draw call count |
| Most of the post chain | Animation, physics, gameplay |

DLSS Quality renders at 67% linear scale, which is 44% of the pixels, so passes that scale with pixel count fall by roughly 55%. Performance mode is 50% linear, 25% of the pixels. The upscaler itself costs 0.8–2.5 ms, so the net saving on a 4.0 ms base pass at Quality mode is roughly 4.0 - 1.8 - 1.2 = 1.0 ms plus the same proportional saving on lighting and screen-space effects — typically 2–4 ms net at 4K output.

| Upscaler | Hardware | Cost at 1080p output | Notes |
|---|---|---|---|
| DLSS | NVIDIA RTX only | 0.8–1.5 ms | Best quality; tensor cores |
| FSR2 / FSR3 | Any | 1.0–2.0 ms | Vendor-neutral; slightly softer, more shimmer |
| XeSS | Any, faster on Intel Arc | 1.2–2.2 ms | Between the two on quality |
| TSR (Unreal) | Any | 1.2–2.5 ms | Engine-integrated; good at low internal resolutions |
| Simple spatial (FSR1, bilinear) | Any | 0.1–0.3 ms | No temporal data; visibly soft |

All temporal upscalers require the same inputs and fail the same ways when they are wrong. They need accurate per-pixel motion vectors, including for vertex-animated and world-position-offset geometry, or those surfaces ghost. They need jittered sample positions with a good sequence (Halton) and matching mip bias, typically log2(scale), or the result is either blurry or aliased. Transparent surfaces without motion vectors smear. Disocclusion — geometry revealed by camera or object motion — has no history and is the source of most visible ghosting artefacts. And UI must be composited after upscaling at output resolution, or text shimmers.

Solo: enable the engine's default temporal upscaler at Quality and leave it; the tuning surface is not worth your time. Studio: expose all upscalers the platform supports, validate motion vectors per material domain, and treat ghosting reports as motion vector bugs until proven otherwise, because they almost always are.

Dynamic resolution scaling adjusts the internal scale per frame against a GPU time target, typically between 50% and 100% linear, changing by no more than a few percent per frame so the change is not visible. It is the correct default for any console title with a fixed frame rate target: it converts frame drops into slightly softer frames, which players do not notice, instead of hitches, which they do.

## 5. Debugging: attributing a spike to a pass

The workflow, in order, because starting with a capture tool is the common mistake and it wastes hours.

First, establish which of the four is the bottleneck: game thread, render thread, RHI/submission, or GPU. Unreal's `stat unit` prints all four; Unity's Profiler separates them; every console platform has a native equivalent. If the GPU is not the largest number, no amount of shader work helps.

Second, get a per-pass GPU breakdown. Unreal's `ProfileGPU` gives a hierarchical single-frame timing tree; Unity's Frame Debugger enumerates draws with state; Godot exposes per-pass timings in the profiler. This partitions a 22 ms frame into "shadows 6 ms" or "translucency 7 ms", which is enough to decide where to look.

Third, capture. RenderDoc is the general tool: full API capture, resource inspection, shader debugging, on PC and Android but not on consoles. PIX is the Windows and Xbox tool and is the one to use for timing captures with hardware counters, because it exposes occupancy, cache hit rates and wave statistics that RenderDoc does not. Nsight Graphics gives NVIDIA-specific warp-level analysis and is how you diagnose register pressure. Radeon GPU Profiler gives AMD's wavefront occupancy timeline, which is the clearest available view of whether a pass is stalling on latency rather than throughput. Console platforms have native profilers that are the only tools certification-level work can be done with.

Two accuracy warnings. Per-pass GPU timers on hardware with async compute will sum to more than the frame time, because passes overlap deliberately; treat the numbers as attribution rather than as an additive budget, and read the occupancy timeline to see the real overlap. And GPU timings on PC vary with clock behaviour, so measure with a warm GPU over 100+ frames and compare medians, not single frames.

For spikes specifically: capture the spike frame and a neighbouring good frame, then diff the pass timings. A spike concentrated in one pass is usually a content problem — an object entering view, a particle system spawning, a shadow cascade suddenly containing a large caster. A spike distributed across all passes is a clock, thermal or memory-residency problem. A spike that appears once per new area is pipeline state object compilation, and the fix is a precached PSO cache gathered from automated playthroughs, not a rendering change.

## 6. Budgets by platform

| Target | Frame budget | GPU budget | Internal resolution | Draw calls | Triangles visible | Shadow-casting lights |
|---|---|---|---|---|---|---|
| Current console, 60 fps | 16.67 ms | 15.0 ms | 1080–1440p, dynamic | 3,000–6,000 | 4–10 M | 1 sun + 3–6 local |
| Current console, 30 fps | 33.3 ms | 30.0 ms | 1440–1800p, dynamic | 5,000–10,000 | 8–20 M | 1 sun + 6–12 local |
| PC high | Target dependent | Scaled by settings | Native or DLSS Quality | 6,000–12,000 | 10–30 M | Settings-driven |
| Last-generation console | 33.3 ms | 30.0 ms | 900–1080p | 1,500–3,000 | 2–5 M | 1 sun + 2–4 local |
| High-end mobile, 60 fps | 16.67 ms | 13.0 ms (thermal headroom) | 1080p or below | 300–800 | 0.5–1.5 M | 1 sun, baked local |
| Mid-range mobile, 30 fps | 33.3 ms | 25.0 ms | 720–900p | 100–300 | 0.2–0.6 M | Baked only |
| VR, 90 Hz per eye | 11.1 ms | 9.0 ms | Per-eye, foveated | 1,000–2,500 | 1–3 M | 1 sun + 1–2 local |

Mobile budgets carry a thermal qualifier that consoles do not: a phone will sustain peak performance for 3–8 minutes and then throttle by 30–50%. Budget against the throttled state, measure after 15 minutes of continuous play, and treat the first three minutes of a profiling session as unrepresentative.

The relationship between these rows is worth naming: they are not independent. Doubling shadow-casting light count consumes the headroom that would have paid for a higher internal resolution; adding a post effect takes it from the base pass. Every budget conversation is a reallocation, and the useful form of the question is never "can we afford X" but "what are we removing to pay for X". A team that cannot answer the second form has not actually budgeted.

Solo: hold GPU frame time and draw call count, and check both on the weakest device you will ship on, once per week. Studio: every row in that table is an owned, tracked metric with an automated nightly capture on real hardware, and a per-pass owner who is accountable for their line.

## Pass conditions

Answer yes to every applicable line before the rendering configuration is considered correct.

1. Measurements come from target hardware in a representative scene, over 100+ frames, comparing medians.
2. Internal resolution is decoupled from output resolution, with dynamic resolution scaling driven by a GPU time target on any fixed-frame-rate platform.
3. Every post-processing effect has a measured millisecond cost, cheap effects are merged into a single pass, and the total post chain is inside its budget line.
4. Only one temporal solution runs: either TAA or a temporal upscaler, never both.
5. Motion vectors are correct for vertex-animated, world-position-offset and transparent geometry, verified by inspecting the velocity buffer.
6. UI is composited after upscaling at output resolution.
7. Frame spikes are diagnosed by diffing a captured spike frame against a captured good frame, not by inspection.
8. Mobile budgets are validated after 15 minutes of continuous play in the thermally throttled state.
9. LOD switching is driven by screen size rather than distance, with dithered transitions, and the overlap cost of simultaneous LOD rendering is inside the budget.
10. If virtualised geometry is enabled, its fixed per-frame cost is measured on the minimum-spec target and its disk size increase is inside the package budget; masked foliage is excluded from it.
11. Texture streaming pool size is set per platform, pool overruns and thrashing are distinguished in profiling, and every texture ships block-compressed with a full mip chain.
12. A memory budget table exists per platform with an owner per line, and render target memory is tracked explicitly rather than treated as incidental.
