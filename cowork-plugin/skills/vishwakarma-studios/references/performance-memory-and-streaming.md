# Memory, allocation and streaming

Frame time is not the only budget a title can fail. This part covers the memory ceiling per platform, the allocation and collection behaviour that turns a healthy median into a periodic stall, and the streaming and IO system that trades memory for latency. Budgets here are stated in bytes and milliseconds against a named platform, in the same way frame budgets are.

## 1. Memory

Memory failures are worse than frame time failures because they end the process. A frame that takes 40 ms ships as a bad review; an out-of-memory crash fails certification.

| Platform | Total | Usable by title | Texture allocation | Streaming pool |
|---|---|---|---|---|
| PS5 | 16 GB GDDR6 | 12.5–13.5 GB | 3–5 GB | 1.5–4 GB |
| Xbox Series X | 16 GB (10 GB at 560 GB/s, 6 GB at 336 GB/s) | 13.5 GB | 3–5 GB | 1.5–4 GB |
| Xbox Series S | 10 GB | ~8 GB | 1.5–2.5 GB | 0.8–1.5 GB |
| Switch | 4 GB | ~3.2 GB | 0.8–1.4 GB | 0.3–0.6 GB |
| Switch 2 | 12 GB | ~9–10 GB | 2.5–4 GB | 1–2 GB |
| PC minimum spec | 8–16 GB system, 4–8 GB VRAM | Varies | 2.5–5 GB VRAM | 1–3 GB |
| iOS | 4–8 GB | 1.4–3 GB before jetsam | 0.5–1.2 GB | 0.2–0.6 GB |
| Android mid-tier | 4–6 GB | 1–2 GB | 0.4–0.9 GB | 0.2–0.5 GB |

Textures dominate, typically 40–60% of the budget, which is why compression format selection is a memory decision rather than a quality decision. Block compression at 4–8 bits per texel against 32 for RGBA8 is an 4–8x reduction, and a full mip chain adds 33% while making sampling both faster and better-looking. A single uncompressed 4096x4096 RGBA8 texture is 67 MB; the same texture as BC7 with mips is 22 MB, and as BC4 for a single-channel mask, 11 MB. Three grayscale masks packed into one RGB texture cost one third of three separate textures and one texture fetch instead of three.

Two distinctions that teams routinely conflate.

**Working set versus allocated.** Allocated memory is what the allocator has taken from the OS; the working set is what is actually touched over a given window. A title allocating 12 GB with a 6 GB working set is fine on a platform with virtual memory and paging and fatal on a console where all allocations are resident. On mobile the operating system kills processes by resident footprint, not by touch frequency, so the number that matters for survival is resident set size, not the allocator's own accounting. Measure both: the allocator's total tells you about leaks, the resident set tells you about the crash.

**Fragmentation versus exhaustion.** A failed 40 MB allocation with 900 MB free is fragmentation, not exhaustion, and the fix is allocation strategy rather than asset cuts. Long-running sessions with variable-size streaming allocations are the classic generator: the level streams in and out for six hours and the free space becomes a fine mesh of unusable holes. The mitigations are size-bucketed pools for streamed data, fixed-size slabs for anything allocated at high frequency, per-subsystem heaps so a churning system cannot fragment a stable one, and a defragmenting allocator with relocatable handles for the largest resources. Certification testing on console frequently includes multi-hour soak runs precisely because this class of bug takes hours to manifest.

The worked case is worth carrying. A title streams texture blocks of 2–40 MB into a 3 GB pool over a six-hour session, with an average allocation lifetime of 90 seconds and no compaction. After four hours the pool holds 2.1 GB live in roughly 400 blocks, with 900 MB free distributed across 300 gaps averaging 3 MB. A 40 MB request then fails despite 900 MB being free, and the title either drops to a lower mip tier permanently or crashes. Bucketing that pool into fixed 4, 16 and 64 MB slots wastes 8–15% to internal fragmentation and eliminates the failure entirely, which is the correct trade on any platform without virtual memory relocation.

Budget with an owner per line. A memory budget with a total but no per-system allocation is not a budget, because when it is exceeded there is no mechanism to decide who gives up what. Render target memory is the line that grows silently — a 4K deferred renderer with a full post chain can hold 2 GB of render targets — and it should be tracked explicitly rather than treated as engine overhead.

## 2. Allocation and garbage collection

In a managed runtime — C# in Unity, C# in Godot's Mono builds, anything on the JVM — allocation is cheap and collection is not, and the cost is deferred into a frame you did not choose. The frame-time signature is unmistakable once you know it: a periodic single-frame spike of 3–20x the median, on the main thread only, with GPU time flat through the spike, recurring at an interval inversely proportional to the allocation rate. If the spikes get closer together when the scene gets busier and disappear entirely when you stop allocating, it is the collector.

The arithmetic that predicts it. A non-generational, non-compacting collector — which is what Unity's Boehm-based collector is — must trace the whole live heap. Tracing costs roughly 1 ms per 10–20 MB of live objects on a console-class CPU, so a 200 MB live heap is a 10–20 ms stall, which at 60 fps is one to two entirely lost frames. Collection triggers when allocation since the last collection exceeds a threshold, so allocating 1 MB per frame at 60 fps (60 MB/s) fires collections several times per second. The two levers are therefore the live heap size, which sets the *depth* of each spike, and the allocation rate, which sets the *frequency*.

The allocation sources that dominate in practice, in rough order of how often they turn up in a profile: closures and lambdas capturing local variables inside per-frame code; LINQ, which allocates an enumerator and usually several intermediate collections per call; boxing when a value type is passed as an interface or `object`, including in string formatting and in `Dictionary` with non-generic comparers; string concatenation and interpolation, especially in per-frame UI and debug text; array-returning engine APIs (`GetComponents`, `Physics.RaycastAll`, `Mesh.vertices`) which allocate a fresh array every call and have non-allocating variants that write into a caller-supplied buffer; and `foreach` over interfaces or non-generic collections.

Pooling is the structural answer. Pre-allocate at load time, reuse at runtime, and return to the pool rather than dropping references — this applies to projectiles, particles, UI elements, network packets, audio voices, AI path requests and every collection used per frame. A pooled system's steady-state allocation is zero, which is the only allocation rate that guarantees no collection.

Incremental garbage collection time-slices the tracing across frames, capping the per-frame cost at a configurable 1–3 ms. It converts a 15 ms hitch into a sustained 2 ms tax, which is the correct trade for a 60 fps title, but it does not reduce total collection work — it increases it slightly through write barriers, typically 2–5% of CPU — and it cannot help if the allocation rate is high enough that the incremental collector cannot keep up with the mutator. Enable it, then still fix the allocation rate.

Solo: enable incremental collection, pool the three or four object types you spawn most, and put a per-frame allocation readout on the debug overlay so a regression is visible while you play. Studio: allocation in the update path is a build-failing condition enforced by an automated check, pooling is provided by shared infrastructure rather than reimplemented per feature, and heap growth over a two-hour soak is a tracked metric with an owner.

Native-language projects do not escape this; they trade it for a different failure. `malloc`/`new` in a per-frame path costs 50–500 ns each and, more importantly, fragments and takes locks under contention. The equivalent discipline is a per-frame linear (bump) allocator reset to zero at frame end for transient data, pools for anything with a lifetime, and a rule that no allocation occurs in the update path at all. Instrument it: a counter of allocations per frame with an assert at zero in development builds catches the regression on the day it lands, which is worth more than any profiler session six months later.

## 3. Asset streaming and IO

Streaming trades memory for latency, and the two failure modes it produces are opposite in kind, so the diagnosis must distinguish them.

**Pop-in** is a correctness-of-timing failure: the asset arrives late and the player sees low-resolution textures resolve, geometry appear, or an LOD snap. Frame rate is unaffected. The causes are an undersized streaming pool, a prefetch radius too small for the movement speed, or a priority scheme that ranks the wrong things first.

**Hitching** is a frame-time failure: the frame stalls while something happens synchronously on the main thread. The causes are decompression, texture upload, shader or PSO creation, asset deserialisation, or object construction on the game thread. Streaming that produces hitches has a threading bug, not a bandwidth problem, and the fix is to move the work off the critical thread and amortise the completion step across frames — a budget of, say, 2 ms per frame for asset finalisation, with the remainder deferred.

Budget IO explicitly. Current-generation consoles provide roughly 2.4 GB/s raw and 8–9 GB/s effective after hardware decompression on Xbox Series consoles, and roughly 5.5 GB/s raw with 8–9 GB/s typical decompressed on PS5. Those figures are what make "no loading screens" designs viable, and they are also what makes those designs non-portable: the same content on a PC with a SATA SSD (roughly 550 MB/s) or, worse, a hard drive (80–160 MB/s with seek latencies of 5–15 ms) will not stream in time. If the title ships on PC, the minimum spec's storage is a design constraint on traversal speed, and the mitigations are larger prefetch radii, lower-detail proxies held permanently resident, and a hard cap on how fast the player can move through unstreamed space.

| Storage | Sequential read | Effective after decompression | Random 4K latency | Design consequence |
|---|---|---|---|---|
| PS5 NVMe | ~5.5 GB/s | 8–9 GB/s | ~0.1 ms | Traversal speed is not IO-limited |
| Xbox Series NVMe | ~2.4 GB/s | 4.8–6 GB/s | ~0.1 ms | As above, with a smaller margin |
| PC NVMe Gen4 | 3–7 GB/s | Varies with CPU decompression | ~0.1 ms | CPU cost of decompression becomes the limit |
| PC SATA SSD | ~550 MB/s | ~1 GB/s | ~0.2 ms | Prefetch horizon must roughly double |
| PC hard disk | 80–160 MB/s | 150–300 MB/s | 5–15 ms seek | Scattered reads collapse; packaging order is critical |
| Switch cartridge / eMMC | 100–300 MB/s | 200–500 MB/s | ~0.5 ms | Budget loading screens; no seamless streaming at speed |
| Mobile UFS 3.x | 1–2 GB/s | 2–3 GB/s | ~0.2 ms | Bound by memory ceiling, not by IO |

Prefetch by prediction rather than by proximity. Streaming what is near the player is reactive and always late by the load duration; streaming what the player will reach in the next N seconds — extrapolating from velocity, facing, the level's connectivity graph, and the mission or quest target — is what removes pop-in. The prediction horizon is load latency times a safety factor: with a 400 ms load time and a player moving at 12 m/s, the horizon is at least 4.8 m of travel, and in a vehicle at 60 m/s it is 24 m, which is why vehicle sections stream differently from foot sections and often need their own lower-detail asset tier.

The console-grade discipline is to package assets in the order they are traversed, so that streaming a region is a sequential read rather than a scattered one. On mechanical media this is the difference between 120 MB/s and 15 MB/s; even on SSDs, sequential reads of large blocks outperform many small scattered reads by 2–4x because of per-request overhead.

## Pass conditions

Answer yes to every applicable line before performance work is considered complete.

1. A memory budget table exists per platform with a named owner per line, including an explicit line for render targets.
2. Resident set size, not just allocator totals, is measured on memory-constrained platforms.
3. A multi-hour soak test runs on target hardware and passes without fragmentation-driven allocation failure.
4. Every texture ships block-compressed with a full mip chain, and single-channel data is packed into shared textures.
5. Steady-state allocation in the update path is zero, verified by an instrumented counter that asserts in development builds.
6. Incremental garbage collection is enabled where the runtime supports it, and the allocation rate has been fixed rather than only time-sliced.
7. Pooling covers projectiles, particles, UI elements, audio voices, network packets and any object created more than once per second.
8. Streaming failures are classified as pop-in or hitching before being addressed, and asset finalisation on the main thread is capped per frame.
9. Prefetch is driven by predicted position over a horizon of at least load latency times a safety factor, not by current proximity.
10. If the title ships on PC, the minimum-spec storage device has been tested at maximum player traversal speed.
