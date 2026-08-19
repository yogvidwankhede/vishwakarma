# Spikes, draw calls, CPU cost, culling and LOD

Once the platform budget is named and the bottleneck attributed (see `performance-budgets-and-measurement.md`), the question becomes where the frame time actually goes. This part covers the shapes hitches take, the cost of submitting a scene, the cost model of gameplay code, and the two mechanisms — culling and level of detail — that remove work before it is paid for. Everything below is stated in milliseconds against a named target.

## 1. Spike signatures: attributing a hitch by its shape

Spikes are diagnosed faster by their shape than by inspection, because each cause has a distinct fingerprint across thread times, GPU time, memory and periodicity. Capture the spike frame and a neighbouring good frame, diff them, and match against this table before forming a hypothesis.

| Signature | Likely cause | Confirming test |
|---|---|---|
| Periodic main-thread spike, GPU flat, interval shortens as the scene gets busier | Garbage collection | Allocation counter correlates; spikes vanish when allocation is eliminated |
| 50–500 ms spike on first appearance of a visual element, never repeated | Pipeline state object or shader compilation | Reproduces after clearing the driver shader cache; absent on a second run |
| Spike on crossing a level or region boundary | Synchronous asset load or level streaming completion on the main thread | Correlates with streaming events in the trace; scales with asset size |
| Spike in one GPU pass only, correlated with content entering view | Content problem: a large shadow caster, a spawned particle system, an unculled object | Diff per-pass timings; freeze the camera and spawn the content manually |
| Spike distributed evenly across all GPU passes | Clock or thermal throttling, or memory residency eviction | Check clocks and thermal state; reproduce on a cold device |
| Regular spike every N seconds independent of content | A scheduled system: autosave, telemetry flush, analytics upload, defragmentation | Disable candidates one at a time; check the trace for a background task |
| Main-thread spike with a matching disk read in the trace | Blocking IO on the game thread | Trace file handles; the fix is asynchronous IO, not a faster disk |
| Growing spike frequency over a long session | Leak, fragmentation, or an unbounded container | Soak test with memory sampling; the curve is monotonic |
| Spike on first frame after alt-tab, resize, or resolution change | Swapchain and render target reallocation | Expected once; a defect if repeated |
| Single enormous spike at a fixed point in the level | A one-off blocking operation: navmesh build, physics bake, cinematic load | Trace it; usually movable to load time |

The discipline this table encodes is that hitches are not "performance problems" in the same sense that a 20 ms base pass is. A frame that is consistently too slow is solved by budget work; a frame that is occasionally catastrophic is almost always a threading, allocation or scheduling defect, and optimising shaders will never touch it. Separate the two lists and staff them differently.

## 2. Draw calls and state changes

A draw call costs mostly CPU: parameter validation, resource binding, descriptor or state setup, and command buffer construction. The cost per call varies by roughly 40x across the APIs a multiplatform title ships on, which is why draw call budgets are per-platform numbers and not a universal figure.

| API / platform | Cost per draw call | Practical budget at 60 fps | Practical budget at 30 fps |
|---|---|---|---|
| DX11 / OpenGL | 5–20 µs | 800–2,000 | 1,500–4,000 |
| DX12 / Vulkan / Metal with precompiled PSOs | 1–3 µs | 3,000–6,000 | 6,000–12,000 |
| Console native APIs | 0.5–2 µs | 5,000–10,000 | 10,000–20,000 |
| Mobile Vulkan / Metal | 5–15 µs | 300–800 | 600–1,500 |
| Mobile GLES3 | 15–50 µs | 100–300 | 200–600 |

State changes cost more than the draws between them. A pipeline state object switch is 10–40 µs on the older APIs and remains the most expensive per-draw operation on the newer ones; changing a vertex buffer is cheap and changing a constant is nearly free. This dictates the submission sort order: sort by pipeline state, then material and texture set, then mesh, then instance. A renderer that sorts front-to-back for early-Z but ignores state coherence trades a GPU win for a larger CPU loss on any platform where draws are expensive.

The reduction techniques, in the order they should be applied. **Instancing** draws N copies of one mesh in one call with per-instance data in a buffer; it pays above roughly 10 instances and scales to tens of thousands, and its constraint is an art pipeline constraint — all instances must share mesh and material, so a forest of 6 tree assets with per-instance colour and scale variation instances an order of magnitude better than a forest of 40 unique assets. **Static batching** merges distinct meshes sharing a material at build time, trading memory for calls. **Dynamic batching** merges small meshes per frame on the CPU and is usually a net loss above a few hundred vertices because the merge costs more than the saved call. **Indirect draws** — cull on the GPU, write draw arguments into a buffer, issue one `ExecuteIndirect` or `vkCmdDrawIndexedIndirectCount` covering thousands of draws — make CPU draw cost effectively independent of scene complexity, at the price of moving per-object gameplay logic into GPU-readable data.

Two mechanisms deserve naming because they are where the newer APIs actually pay off. **Descriptor and binding model**: on DX11 each texture and buffer is bound individually with driver-side validation, which is the bulk of that 5–20 µs; DX12 and Vulkan bind a descriptor table or set once and index into it, which is why the same scene can cost 5x less CPU on the newer API with no content change. Bindless resource models take this further, replacing binding with an index in a constant, and are what make GPU-driven pipelines practical. **Multithreaded command recording**: DX12, Vulkan and console APIs allow command lists to be recorded on several worker threads and submitted from one, so an 8-core CPU can record 4–6x the draws of a single-threaded submission path. DX11 and GLES cannot do this in any meaningful way — their deferred contexts are emulated and usually slower — which is the real reason a legacy-API port hits a submission ceiling that no batching fixes.

Measure submitted calls, not authored objects. An engine that reports 1,200 batches from 9,000 renderers is doing its job; an engine reporting 9,000 batches from 9,000 renderers has a material or instancing problem that no shader work will fix.

## 3. The CPU cost model: what makes gameplay code slow

CPU time in a game is rarely spent on arithmetic. It is spent waiting for memory, dispatching indirectly, and doing small amounts of work an enormous number of times, and each of those has a different fix.

**Memory access dominates.** An L1 cache hit is roughly 4 cycles; L2 is 12–20; L3 is 40–60; main memory is 200–400 cycles, which on a 3.5 GHz console core is around 60–110 ns. A loop that chases pointers through scattered heap objects spends the overwhelming majority of its time stalled, and its instruction count tells you nothing about its cost. This is the mechanism behind data-oriented design: iterating a contiguous array of 64-byte structures touches one cache line per element and prefetches ahead automatically, while iterating an array of pointers to those same structures scattered across a fragmented heap costs a miss per element and can be 5–20x slower for identical logic. Measure it with cache miss counters (VTune, PIX, Nsight Systems), not by reading the code.

**Indirect dispatch has a real but smaller cost.** A virtual call is roughly 2–5 ns more than a direct call when the branch predictor is warm and the vtable is cached, and considerably worse when it is not, because it defeats inlining and blocks the optimiser from seeing across the call. The cost that matters is not the dispatch itself but the loss of inlining on functions called millions of times per frame. Devirtualise the hot inner loops; leave the rest alone.

**The tick count is usually the real number.** A gameplay tick that costs 0.5 µs is irrelevant until there are 10,000 of them, at which point it is 5 ms — over half a 60 fps game thread budget — spent on objects that in many cases did nothing. The three fixes are ordered by value: stop ticking objects that do not need it (most do not), tick at reduced frequency by distance and relevance, and only then make the tick itself faster. Logic level-of-detail is the direct analogue of geometric LOD and is under-used: full-rate simulation within 20 m, 10 Hz to 60 m, 2 Hz to 150 m, and event-driven beyond that is a typical open-world scheme, and it routinely removes 70–90% of tick cost.

**Parallelism is bounded by the serial fraction.** A job system distributing animation, physics, culling and particle updates across 6 worker cores gives large wins, but Amdahl's law caps the total: if 30% of the frame is serial main-thread work, no core count reduces the frame below 30% of its single-threaded time. Measure the serial fraction before adding threads, and expect real-world job systems to lose 10–25% of theoretical scaling to synchronisation, false sharing and cache line contention between cores writing to adjacent memory.

## 4. Culling

Nothing is faster than not drawing, and culling is the cheapest millisecond on the table — but every culling stage costs something to run, and a stage that rejects little is pure overhead.

| Stage | Mechanism | Typical rejection | Cost | Fails when |
|---|---|---|---|---|
| Distance culling | Per-object maximum draw distance | 30–60% in dense open worlds | Near zero | Objects pop at the boundary without a fade |
| Frustum culling | Bounding volume against six planes, SIMD over packed arrays | 50–70% of what remains | 0.05–0.3 ms CPU, or free on GPU | Bounds are too loose or animated bounds are stale |
| Occlusion culling | Hardware queries, or hierarchical-Z against last frame's depth | 20–50% in dense interiors, near 0% outdoors | 0.2–0.8 ms plus one frame of latency | Nothing occludes anything |
| Portal / cell visibility | Baked cell-to-cell visibility sets | 60–90% in cell-based interiors | Bake time and memory; near-zero runtime | Level geometry changes; open layouts |
| Cluster / meshlet culling | Per-meshlet bounds and backface cones on GPU | 40–70% of remaining triangles | Folded into GPU setup | Needs mesh shader class hardware |
| Screen-size culling | Reject below a pixel-coverage threshold | The long tail of clutter | Near zero | Thresholds tuned at the wrong field of view |

Occlusion culling is the stage most often kept when it should be removed. Hardware occlusion queries read results a frame late, which produces popping under fast camera motion; hierarchical-Z approaches share that latency but degrade more gracefully. Neither helps in an open landscape where nothing occludes anything, and both spend CPU or GPU time to produce nothing. The decision rule is arithmetic: if the stage costs 0.5 ms and rejects objects whose rendering would have cost 0.3 ms, delete it. In practice, a rejection rate under 15% of submitted objects means the stage is not paying for itself — measure the rate per level, not per project, because a title with both interiors and open terrain will legitimately want occlusion culling enabled in one and disabled in the other.

The metric that matters is the ratio of rendered to submitted. A scene submitting 12,000 objects and rendering 9,000 has a submission problem regardless of how good the culler is, because the traversal, the bounds tests and the per-object bookkeeping happened for all 12,000.

## 5. Level of detail

LOD is the trade of memory and authoring time for CPU and GPU time. Each level should roughly halve the triangle count and switch at a screen coverage where the reduction is invisible, which in practice means these thresholds:

| LOD | Screen size | Triangle share | Material treatment |
|---|---|---|---|
| 0 | above 50% | 100% | Full material, all maps |
| 1 | 25–50% | 50% | Full material |
| 2 | 12–25% | 25% | Drop detail normal and parallax |
| 3 | 5–12% | 10% | Simplified shader, fewer texture fetches |
| 4 / imposter | below 5% | 1–3% or a billboard | Unlit or vertex-lit |

Switch on screen size, not distance. Distance ignores field of view and object size, so a distance-driven LOD pops visibly through a sniper scope (where a distant object covers many pixels) and never switches at all on a large building (which stays large on screen well past its distance threshold).

Popping is mitigated by dithered cross-fade: render both levels for 0.15–0.3 s with complementary screen-space dither patterns that the temporal anti-aliasing resolves into a blend. The cost is that both levels are drawn during the transition, so a fast-moving camera can have 15–25% of objects in transition simultaneously — budget that overlap explicitly rather than discovering it in a chase sequence.

The memory-versus-CPU trade is direct: five LOD levels of a mesh cost roughly 1.9x the disk and memory of LOD 0 alone (100 + 50 + 25 + 10 + 3 percent), in exchange for large reductions in vertex processing and, when combined with material simplification, in texture fetch. On a memory-constrained platform the correct answer is often *fewer* LOD levels with more aggressive reduction between them, and on a CPU-constrained one it is more levels plus imposters.

At AAA scale two additional mechanisms matter. **Hierarchical LOD** replaces a cluster of distant objects with a single merged proxy mesh and a baked atlas texture, which collapses hundreds of draw calls into one; the cost is bake time, proxy memory (a proxy is often 20–60 MB per cluster with its atlas) and a visible transition when the cluster swaps, so HLOD boundaries belong behind occluders or beyond a fog distance. **Imposters** — octahedral or hemi-octahedral impostor atlases capturing a mesh from 8x8 to 16x16 view directions — replace distant vegetation and props with a single quad that reconstructs approximate parallax and lighting; an atlas is typically 1–8 MB per asset, and they are the mechanism behind forests with tens of thousands of visible trees. Virtualised geometry (Nanite and equivalents) removes discrete LOD authoring entirely at a fixed 1.5–4 ms per frame and a 1.5–4x disk cost, which is a win at scene complexity above roughly a few million visible triangles and a loss below it.

## Pass conditions

Answer yes to every applicable line before performance work is considered complete.

1. Draw call counts are measured against a per-platform budget, and submission is sorted by pipeline state, then material, then mesh.
2. Any repeated geometry above ten instances uses instancing or indirect draws.
3. Culling rejection rates are measured per stage per level, and any stage rejecting under 15% of submissions is removed on that level.
4. LOD switching is driven by screen size rather than distance, with dithered transitions, and the cost of simultaneous LOD rendering during transitions is inside budget.
5. HLODs or imposters cover distant clusters wherever draw call counts exceed the platform budget in open scenes.
6. Hot gameplay loops iterate contiguous data, tick counts are reduced by relevance and logic level-of-detail before the tick body is optimised, and cache miss rates have been measured rather than assumed.
7. The serial fraction of the frame is known before additional worker threads are added.
