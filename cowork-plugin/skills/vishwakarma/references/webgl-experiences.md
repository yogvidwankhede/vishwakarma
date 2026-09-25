# WebGL Experiences

A 3D web page is not a scene with a page around it. It is a page with a scene in one slot, and the
page's obligations — first paint, layout stability, a keyboard path, a readable equivalent, a
device that stays cool — outrank the scene's. `@vishwakarma/three` encodes that ordering. Use it.

## 1. The package exists; route through it

The failure this removes is a hand-rolled `<Canvas>` with no tier, no fallback, no budget.
Outermost first:

```tsx
const poster = <SceneFallback poster="/chair.avif" aspectRatio="4 / 3"
  alt="Office chair, front three-quarter view" background="#141416" />

<LazyScene eager aspectRatio="4 / 3" fallback={poster}>
  <PerformanceGuard quality={useRecommendedQuality()}>
    <AccessibleScene label="Office chair, front three-quarter view" interactive onOrbit={orbit}
      description={<p>Mesh back, five-star base, 12 cm seat travel.</p>}>
      <AdaptiveCanvas fallback={poster}>{/* meshes */}</AdaptiveCanvas>
    </AccessibleScene>
  </PerformanceGuard>
</LazyScene>
```

- **LazyScene** — two gates, both must open: near the viewport (`rootMargin: '150% 0px'`) and a
  device that passed the probe. `eager` skips the first for above-the-fold content.
- **PerformanceGuard** — steps the tier *down* when the median of 60 document frames exceeds
  25 ms twice running. Never steps back up.
- **AdaptiveCanvas** — `frameloop="demand"`, pixel-ratio *range* from the tier's budget,
  canvas behind a lazy import inside `SceneBoundary` and `Suspense` sharing one fallback node,
  and at tier `none` the fallback with no WebGL context allocated at all.
- **SceneBoundary** — lost GPU context, unparseable model, absent peer. One-way; recovery is a
  remount with a new `key`. **SceneFallback** is the poster composition,
  **AccessibleScene**/**SceneDescription** the text a canvas cannot carry.

`three`, `@react-three/fiber` and `@react-three/drei` are optional peers reached by dynamic
import, so none of this forces them into a bundle that renders no 3D.

## 2. Tier before you mount

`useDeviceCapability` probes once in an effect, never during render — creating a context costs tens
of milliseconds of main thread on Android — and reports `probed: false`, tier `none`, on the server
and the first client render. Hard vetoes, each sufficient alone: no WebGL, a software rasteriser,
`Save-Data`, a 2g/slow-2g connection. Otherwise a score — GPU class ±2, WebGL 1 −1, ≤2 GiB memory
or ≤2 cores −2, coarse pointer −1 (thermal, not GPU power), 3g −1 — where ≥2 is `high`, ≤−2 `low`.
An unknown GPU scores 0 and lands in `medium`: Firefox and Safari withhold the renderer string, and
treating silence as failure ships the fallback to capable machines.

`SCENE_BUDGETS` per tier:

| | low | medium | high |
|---|---|---|---|
| draw calls | 40 | 90 | 150 |
| triangles | 120k | 500k | 1.5M |
| texture MiB | 32 | 96 | 256 |
| transfer bytes | 1.5 MB | 4 MB | 8 MB |
| lights / casters | 2 / 0 | 3 / 1 | 4 / 2 |
| post passes | 0 | 1 | 3 |
| dpr | 0.75–1 | 1–1.5 | 1–2 |

Draw calls are the misjudged number: fixed CPU cost per call means 200 trivial cubes stutter where
one 100k-triangle mesh does not. `checkSceneBudget(stats, tier)` reports every violation at once.

## 3. First frame is not first paint

Renderer, scene graph, geometry and textures must be fetched, parsed, compiled, uploaded and
drawn before a canvas shows anything, contending for the main thread with hydration and fonts.
So the poster is the real content and owns the largest paint; the scene upgrades over it. Never a
spinner — a progress bar implies the wait is worth it, and many visitors never get the
scene at all. Reserve identical space for poster and canvas with `aspectRatio`
on both, or the swap shifts the page under someone reading.

`transferBytes` and `triangles` are separate budgets because compression changes wire cost and
nothing else: Draco or meshopt on geometry, KTX2/Basis on textures, one `.glb`. Texture *memory*
is a third number again — a 2048² RGBA texture is 16 MiB resident whatever its 400 KiB PNG
weighed, 21.3 MiB with mipmaps, which is what `textureMemoryMiB()` computes.

## 4. Camera, lighting, interaction

**Framing is a decision.** 35–50° vertical field of view reads as a photograph; 75° is a video game
and distorts a product at close range. Fit the subject's bounding sphere to the vertical extent
rather than hard-coding an eyeballed position, then check portrait: a camera composed at 16:9 loses
the sides at 9:16, so derive distance from aspect ratio.

**Lighting.** A three-point rig looks like a studio product render — right for a product, wrong
for a place. An environment map lights everything from one texture at no per-light shader cost,
and is what makes metal read as metal. Each real-time light multiplies cost across every lit
material; each *shadow-casting* light re-renders the scene from its viewpoint, spending the
draw-call budget twice, which is why tier `low` allows zero. Bake instead: free per frame, and
better than a phone's shadow map.

**Interaction.** Raycast against a small explicit list, never the whole scene, at most once per
frame. Use pointer events, not mouse or touch: a coarse pointer has no hover at all, so an
affordance revealed only on hover does not exist on a phone.

## 5. Do not render frames nobody needs

A static scene at 60 fps produces identical images, blocks CPU idle states and flattens a battery.
`frameloop="demand"` is the default; the trap is that only changes passing through the React
reconciler request a frame. A decoded texture, a ref mutated in a handler, a store read outside
React all leave the scene correct in memory and stale on screen.
`useOnDemandRender().requestRender()` is the deliberate ask; `renderFor(ms)` covers a scripted move.
Ask for more than one frame when motion has inertia — one renders the first step of an
ease and stops.

## 6. Accessibility is where 3D fails hardest

A canvas is opaque: one node, no children, no text, no inferable alt. Every piece of information the
scene conveys must also exist as text, via `AccessibleScene`'s `description` or a standalone
`SceneDescription`. The test is to delete the canvas element and ask what was lost. Decorative scenes
take `decorative` — not a shortcut for a description that felt like work.

`AccessibleScene` with `interactive` makes the wrapper one focus stop with a visible ring,
announces `role="img"` plus an `aria-roledescription`, and reports arrow/page/±/Home input as an
`OrbitDelta`. Mirror object-level hover in DOM controls outside the canvas, or it exists for
pointer users only.

`useReducedMotionScene` translates `prefers-reduced-motion` into scene vocabulary:
`autoRotate: false`, `dampingFactor: 0`, `motionScale: 0`, `frameloop: 'demand'`. Reduced motion
means **still, not absent**: a frozen scene the user rotates deliberately honours the preference
completely, while a flat image treats the setting as a punishment. A rotating model filling the
viewport is a stronger vestibular trigger than any fade.

## 7. Done

Done is measured on a real mid-tier Android phone on a throttled connection, not on the machine that
built it: poster visible immediately, no layout shift on swap, budgets met at the lowest tier
shipped, thermals stable after two minutes, the keyboard path working, the page still communicating
with the canvas deleted, WebGL disabled still yielding a complete page.

**Boundaries.** `3d-game-assets` owns the GLB itself — orientation, silhouette, palette, mixers.
`vishwakarma-studios` owns games and the simulation loop. `rendering-performance` owns general web
render cost. `scroll-experiences` owns scroll mechanics; scroll-driven cameras are the seam, and its
rules apply there — progress derived from position, clamped, off under reduced motion.

## Rules

### MUST NOT — Do not let the canvas be the largest contentful paint element; ship a poster as the real content and upgrade to the scene after first paint.

*Why:* Renderer, scene graph, geometry and textures must be fetched, parsed, compiled, uploaded and drawn before a canvas shows a single pixel, contending for the main thread with hydration and fonts. That adds seconds to the largest paint, and the user who leaves at two seconds never sees the scene either.

### MUST NOT — Do not use a spinner, a grey box, or a status message such as "3D unavailable" as the fallback for a scene.

*Why:* The fallback is what every pre-bundle visitor, every declined device, every crawler, every print and every crashed GPU process sees, so it is a substantial share of traffic rather than an edge case. A progress indicator implies the real content is imminent, so users wait for something that for many of them never arrives; a reason string tells them something they cannot act on.

*Exceptions:*
- A determinate progress indicator inside an interaction the user explicitly started, such as a configurator the user opened by pressing a button.

### MUST — Mount 3D through AdaptiveCanvas from @vishwakarma/three rather than a bare react-three-fiber Canvas.

*Why:* AdaptiveCanvas supplies four behaviours a bare canvas lacks: an on-demand frame loop, a pixel-ratio range taken from the active tier budget, the renderer reached by a module-scope lazy import inside a SceneBoundary and a Suspense boundary that share one fallback node, and — at tier none — the fallback returned without allocating a WebGL context at all.

*Exceptions:*
- A project that already owns an equivalent wrapper providing all four behaviours; extend that rather than adding a second canvas abstraction.

### MUST — Derive a QualityTier from useDeviceCapability or useRecommendedQuality and pass it to PerformanceGuard before the scene mounts.

*Why:* A single quality level means the scene is authored for one device class. The probe runs in an effect and reports probed: false with tier none on the server and the first client render, so a scene that does not wait for it either renders before the decision exists or produces a hydration mismatch.

*Exceptions:*
- A scene behind an interaction nobody has performed yet, where useDeviceCapability({ enabled: false }) defers the probe until the dialog opens.

### MUST — Set a matching aspectRatio on both the LazyScene container and the SceneFallback so poster and canvas occupy identical space.

*Why:* Without a reserved ratio the container has no height until the scene mounts, so the page reflows when the poster loads and again when the canvas appears. Both count against cumulative layout shift, and a mismatch of even five per cent still moves the page under someone already reading.

### MUST — Run checkSceneBudget against SCENE_BUDGETS for the lowest tier the page ships, and resolve every violation by removing scene content.

*Why:* The low tier allows 40 draw calls, 120,000 triangles, 32 MiB of texture memory, 1.5 MB transferred, 2 lights and 0 shadow casters. Draw calls carry fixed CPU cost per call and driver overhead dominates on mobile long before the GPU is troubled, so 200 trivial cubes stutter where one 100,000-triangle mesh does not; each shadow caster re-renders the scene from its own viewpoint and spends the draw-call budget twice.

*Exceptions:*
- A scene gated behind an explicit user action on a route that declares a higher minQuality, where the low tier is never served.

### MUST — Budget textures with textureMemoryMiB against the tier ceiling of 32, 96 or 256 MiB, using uploaded dimensions rather than compressed file size.

*Why:* A 2048x2048 RGBA texture occupies 16 MiB in VRAM whatever its PNG weighed, and 21.33 MiB with a full mip chain at the 4/3 multiplier. Download size and resident size differ by more than an order of magnitude, and it is resident size that exhausts a phone GPU process and kills the tab.

*Exceptions:*
- KTX2/Basis textures, which stay compressed in VRAM; measure their actual GPU footprint rather than the RGBA arithmetic.

### MUST — Keep frameloop on demand for any scene without continuous motion, and call useOnDemandRender().requestRender after changes that bypass the React reconciler.

*Why:* A static scene at 60 fps produces identical images, prevents the CPU reaching idle states, spins laptop fans and flattens phone batteries. Under demand only reconciler-visible changes invalidate automatically, so a decoded texture, a mutated ref, an external store read or a CSS-driven resize leaves the scene correct in memory and stale on screen.

*Exceptions:*
- Scenes with genuine continuous motion — a particle field, a running simulation — which set frameloop="always" deliberately.

### MUST — Give every informative scene a text equivalent through AccessibleScene description or SceneDescription, and mark only genuinely contentless scenes decorative.

*Why:* A canvas is a single opaque element: assistive technology sees one node with no children, no text and no structure regardless of what is painted inside it, and no alt text can be inferred from geometry. Deleting the canvas element is the test — anything a sighted user would have learned must still be obtainable.

*Exceptions:*
- A background effect that conveys nothing, which takes decorative and aria-hidden — not a shortcut for a description that felt like work.

### MUST — Make an interactive scene a single focus stop with AccessibleScene interactive plus onOrbit, and mirror object-level hover state in focusable DOM controls outside the canvas.

*Why:* A canvas is one focusable element, so there is no per-object hover or focus ring and no tab order inside it. Without a keyboard contract, camera control exists only for pointer users; without DOM controls, per-object selection is unreachable by keyboard, switch access and voice control, and absent entirely on coarse pointers that have no hover.

### MUST — Apply useReducedMotionScene to stop autorotation, damping and ambient animation under prefers-reduced-motion, while continuing to render the scene.

*Why:* Nothing inside a WebGL context responds to the media query unless JavaScript reads it, so scenes keep spinning for users who disabled animation everywhere else — and a rotating model filling the viewport is a stronger vestibular trigger than the fades the preference was written for. The preference concerns movement, not rendering, so a still scene the user rotates on their own input satisfies it fully.

*Source:* [WCAG 2.2 Success Criterion 2.3.3 (Animation from Interactions)](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

*Exceptions:*
- A scene whose content is inherently motion and becomes pointless when still, which sets reducedMotionBlocks so the fallback composition is served instead.

### MUST — Wrap every scene in a SceneBoundary with an onError handler wired to error reporting, and offer remount-by-key rather than automatic retry.

*Why:* A rejected peer import, a GPU process crash, a driver reset, an evicted context past the document cap and a malformed model all throw below the point React can recover, so without a boundary a decorative effect takes the whole route down. Automatic retry turns an unrecoverable cause such as absent WebGL into an infinite error loop, and an unreported silent fallback looks correct to the team for weeks.

### SHOULD — Compress geometry with Draco or meshopt and textures with KTX2/Basis, and keep the total 3D payload inside the tier transferBytes ceiling of 1.5, 4 or 8 MB.

*Why:* transferBytes and triangles are separate budgets because compression reduces wire cost without touching GPU cost, and decimation does the reverse, so a scene can sit inside one and four times over the other. KTX2 is the exception that helps both, because it remains compressed in VRAM rather than being expanded on upload.

*Exceptions:*
- Meshes small enough that a Draco or meshopt decoder costs more bytes and main-thread time than it saves.

### SHOULD — Raycast against an explicit list of interactive objects at most once per frame, and skip the test while the camera is moving.

*Why:* An unbounded ray test traverses the scene graph and, without bounding volumes, every triangle in it, while pointermove can fire many times per frame. That places an O(triangles) traversal on the main thread repeatedly inside a 16.7 ms budget already spent on rendering.

*Exceptions:*
- Large static sets where a precomputed bounds hierarchy makes full-scene tests cheap enough to run per event.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the 3D page is finished, not just the scene — measured on real mid-tier hardware. (blocking)

- On a real mid-tier Android phone on a throttled connection with a cold cache, what is the median frame time after two continuous minutes, and did PerformanceGuard degrade the tier within the first thirty seconds?
- Is the largest contentful paint element the poster image rather than the canvas, and does the canvas replace it with zero layout shift?
- Does checkSceneBudget report withinBudget for the lowest tier this page ships, with textureMemoryMiB computed from uploaded dimensions rather than file sizes?
- With the canvas element deleted from the DOM, does the page still convey everything the scene was showing?
- Using only a keyboard, can the camera be moved and every interactive object selected, with a visible focus indicator at each stop?
- Under prefers-reduced-motion: reduce, is autorotation, damping and ambient animation stopped while the scene still renders and remains inspectable?
- With WebGL disabled in the browser, and separately with Save-Data on, is the result a complete designed page rather than a gap, a spinner or a status message?
- Is frameloop on demand, and after every non-React change — a decoded texture, a mutated ref, an external store read, a canvas resize — does the scene visibly update?
- Does SceneBoundary have an onError handler reporting to real error tracking, and is recovery a user-triggered remount rather than an automatic retry?
- At portrait aspect ratio on a phone, is the subject fully framed, and is the field of view a chosen value rather than a library default?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/package-and-tiers.md` — What exactly does @vishwakarma/three export, what are the real SCENE_BUDGETS numbers per tier, and how is a device classified into a tier?
- `references/load-and-cost.md` — What does the user see while a multi-megabyte scene downloads, how do I compress it, and how do camera, lighting, raycasting and the frame loop spend the frame budget?
- `references/access-and-fallback.md` — How do I make a canvas usable without sight or a mouse, what does prefers-reduced-motion mean for a 3D scene, and what happens on no-WebGL or a lost context?
