// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * 3D web pages stop half-finished because the scene gets built and the page never does.
 *
 * The asset arrives correct, the geometry looks right in a dev-server tab, and then the work
 * stops — before the poster that holds the space, before the tier that keeps a phone from
 * melting, before the text equivalent of a canvas that assistive technology cannot see at all,
 * before the boundary that catches a lost GPU context. Every one of those is machinery that
 * `@vishwakarma/three` already ships: `AdaptiveCanvas`, `LazyScene`, `PerformanceGuard`,
 * `SceneBoundary`, `SceneFallback`, `AccessibleScene`, `SceneDescription`, `SCENE_BUDGETS`,
 * `useDeviceCapability`, `useOnDemandRender`, `useReducedMotionScene`. An agent that does not
 * know they exist hand-rolls a bare canvas with none of it, and the result is the defect the
 * repository owner sees: not wrong, unfinished.
 *
 * So the first job of this skill is routing — naming the real exports and the real budget
 * numbers so the agent reaches for them instead of reinventing a worse version. The second is
 * the page-level reasoning the package cannot do for you: what the user looks at during a
 * four-megabyte download, where the camera goes at portrait aspect ratios, why a scene that
 * renders sixty identical frames a second is a battery bug, and what "done" means when the
 * measuring device is a mid-tier phone rather than the machine that built it.
 *
 * The boundary matters as much as the content. `3d-game-assets` owns the GLB file and its
 * orientation, `vishwakarma-studios` owns games and simulation loops, `rendering-performance`
 * owns ordinary web render cost, `scroll-experiences` owns scroll mechanics. This skill owns
 * the scene and the page it sits in, and nothing else.
 */
export const webglExperiences: SkillManifest = {
  vsm: '1.0',
  id: 'webgl-experiences',
  name: 'WebGL Experiences',
  description:
    'Use when putting a 3D scene on a web page — react-three-fiber canvases, model viewers, 3D heroes, device tiering, posters and fallbacks.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'ui',
  tags: ['webgl', 'three', 'react-three-fiber', 'canvas', '3d', 'performance', 'accessibility'],

  activation: {
    intents: [
      'putting a 3D model or scene on a web page, or building a 3D hero section',
      'my 3D site is janky on mobile but fine on my laptop',
      'the model takes forever to appear and the page is blank until it does',
      'the page looks fine then the phone gets hot and everything slows down',
      'my 3D page scores badly on Lighthouse or has a terrible largest contentful paint',
      'the canvas is empty for some users and I cannot reproduce it',
      'what should show when WebGL is unavailable or the GPU context is lost',
      'making a 3D scene accessible to screen readers and keyboard users',
      'the model spins on its own and a user asked us to stop it moving',
      'the laptop fan spins up on a page where nothing is animating',
      'choosing camera position, field of view, or lighting for a product viewer on the web',
      'hover and click on objects inside a canvas, and making that cheap',
      'a scroll-driven camera move through a 3D scene',
      'reviewing a 3D landing page before launch',
    ],
    globs: [
      '**/*.glb',
      '**/*.gltf',
      '**/*{Canvas,Scene,Viewer,Model,Experience}*.{ts,tsx,js,jsx}',
      '**/scene/**/*.{ts,tsx}',
      '**/three/**/*.{ts,tsx}',
      '**/r3f/**/*.{ts,tsx}',
      '**/*use-*{scene,canvas,three}*.{ts,tsx}',
    ],
    keywords: [
      'webgl',
      'three.js',
      'react-three-fiber',
      'r3f',
      'drei',
      'canvas',
      'dpr',
      'draw calls',
      'frameloop',
      'context lost',
      'gltf',
      'draco',
      'meshopt',
      'ktx2',
      'orbit controls',
      'raycast',
      'poster',
      'device tier',
    ],
  },

  content: {
    summary:
      'Build the page, not just the scene: route through AdaptiveCanvas, LazyScene, PerformanceGuard, SceneBoundary, SceneFallback and AccessibleScene, tier against SCENE_BUDGETS, let a poster own first paint, render on demand, and measure on a real mid-tier phone.',

    body: `# WebGL Experiences

A 3D web page is not a scene with a page around it. It is a page with a scene in one slot, and the
page's obligations — first paint, layout stability, a keyboard path, a readable equivalent, a
device that stays cool — outrank the scene's. \`@vishwakarma/three\` encodes that ordering. Use it.

## 1. The package exists; route through it

The failure this removes is a hand-rolled \`<Canvas>\` with no tier, no fallback, no budget.
Outermost first:

\`\`\`tsx
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
\`\`\`

- **LazyScene** — two gates, both must open: near the viewport (\`rootMargin: '150% 0px'\`) and a
  device that passed the probe. \`eager\` skips the first for above-the-fold content.
- **PerformanceGuard** — steps the tier *down* when the median of 60 document frames exceeds
  25 ms twice running. Never steps back up.
- **AdaptiveCanvas** — \`frameloop="demand"\`, pixel-ratio *range* from the tier's budget,
  canvas behind a lazy import inside \`SceneBoundary\` and \`Suspense\` sharing one fallback node,
  and at tier \`none\` the fallback with no WebGL context allocated at all.
- **SceneBoundary** — lost GPU context, unparseable model, absent peer. One-way; recovery is a
  remount with a new \`key\`. **SceneFallback** is the poster composition,
  **AccessibleScene**/**SceneDescription** the text a canvas cannot carry.

\`three\`, \`@react-three/fiber\` and \`@react-three/drei\` are optional peers reached by dynamic
import, so none of this forces them into a bundle that renders no 3D.

## 2. Tier before you mount

\`useDeviceCapability\` probes once in an effect, never during render — creating a context costs tens
of milliseconds of main thread on Android — and reports \`probed: false\`, tier \`none\`, on the server
and the first client render. Hard vetoes, each sufficient alone: no WebGL, a software rasteriser,
\`Save-Data\`, a 2g/slow-2g connection. Otherwise a score — GPU class ±2, WebGL 1 −1, ≤2 GiB memory
or ≤2 cores −2, coarse pointer −1 (thermal, not GPU power), 3g −1 — where ≥2 is \`high\`, ≤−2 \`low\`.
An unknown GPU scores 0 and lands in \`medium\`: Firefox and Safari withhold the renderer string, and
treating silence as failure ships the fallback to capable machines.

\`SCENE_BUDGETS\` per tier:

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
one 100k-triangle mesh does not. \`checkSceneBudget(stats, tier)\` reports every violation at once.

## 3. First frame is not first paint

Renderer, scene graph, geometry and textures must be fetched, parsed, compiled, uploaded and
drawn before a canvas shows anything, contending for the main thread with hydration and fonts.
So the poster is the real content and owns the largest paint; the scene upgrades over it. Never a
spinner — a progress bar implies the wait is worth it, and many visitors never get the
scene at all. Reserve identical space for poster and canvas with \`aspectRatio\`
on both, or the swap shifts the page under someone reading.

\`transferBytes\` and \`triangles\` are separate budgets because compression changes wire cost and
nothing else: Draco or meshopt on geometry, KTX2/Basis on textures, one \`.glb\`. Texture *memory*
is a third number again — a 2048² RGBA texture is 16 MiB resident whatever its 400 KiB PNG
weighed, 21.3 MiB with mipmaps, which is what \`textureMemoryMiB()\` computes.

## 4. Camera, lighting, interaction

**Framing is a decision.** 35–50° vertical field of view reads as a photograph; 75° is a video game
and distorts a product at close range. Fit the subject's bounding sphere to the vertical extent
rather than hard-coding an eyeballed position, then check portrait: a camera composed at 16:9 loses
the sides at 9:16, so derive distance from aspect ratio.

**Lighting.** A three-point rig looks like a studio product render — right for a product, wrong
for a place. An environment map lights everything from one texture at no per-light shader cost,
and is what makes metal read as metal. Each real-time light multiplies cost across every lit
material; each *shadow-casting* light re-renders the scene from its viewpoint, spending the
draw-call budget twice, which is why tier \`low\` allows zero. Bake instead: free per frame, and
better than a phone's shadow map.

**Interaction.** Raycast against a small explicit list, never the whole scene, at most once per
frame. Use pointer events, not mouse or touch: a coarse pointer has no hover at all, so an
affordance revealed only on hover does not exist on a phone.

## 5. Do not render frames nobody needs

A static scene at 60 fps produces identical images, blocks CPU idle states and flattens a battery.
\`frameloop="demand"\` is the default; the trap is that only changes passing through the React
reconciler request a frame. A decoded texture, a ref mutated in a handler, a store read outside
React all leave the scene correct in memory and stale on screen.
\`useOnDemandRender().requestRender()\` is the deliberate ask; \`renderFor(ms)\` covers a scripted move.
Ask for more than one frame when motion has inertia — one renders the first step of an
ease and stops.

## 6. Accessibility is where 3D fails hardest

A canvas is opaque: one node, no children, no text, no inferable alt. Every piece of information the
scene conveys must also exist as text, via \`AccessibleScene\`'s \`description\` or a standalone
\`SceneDescription\`. The test is to delete the canvas element and ask what was lost. Decorative scenes
take \`decorative\` — not a shortcut for a description that felt like work.

\`AccessibleScene\` with \`interactive\` makes the wrapper one focus stop with a visible ring,
announces \`role="img"\` plus an \`aria-roledescription\`, and reports arrow/page/±/Home input as an
\`OrbitDelta\`. Mirror object-level hover in DOM controls outside the canvas, or it exists for
pointer users only.

\`useReducedMotionScene\` translates \`prefers-reduced-motion\` into scene vocabulary:
\`autoRotate: false\`, \`dampingFactor: 0\`, \`motionScale: 0\`, \`frameloop: 'demand'\`. Reduced motion
means **still, not absent**: a frozen scene the user rotates deliberately honours the preference
completely, while a flat image treats the setting as a punishment. A rotating model filling the
viewport is a stronger vestibular trigger than any fade.

## 7. Done

Done is measured on a real mid-tier Android phone on a throttled connection, not on the machine that
built it: poster visible immediately, no layout shift on swap, budgets met at the lowest tier
shipped, thermals stable after two minutes, the keyboard path working, the page still communicating
with the canvas deleted, WebGL disabled still yielding a complete page.

**Boundaries.** \`3d-game-assets\` owns the GLB itself — orientation, silhouette, palette, mixers.
\`vishwakarma-studios\` owns games and the simulation loop. \`rendering-performance\` owns general web
render cost. \`scroll-experiences\` owns scroll mechanics; scroll-driven cameras are the seam, and its
rules apply there — progress derived from position, clamped, off under reduced motion.`,

    references: [
      {
        id: 'package-and-tiers',
        title: 'The @vishwakarma/three surface and the capability tiers',
        answers:
          'What exactly does @vishwakarma/three export, what are the real SCENE_BUDGETS numbers per tier, and how is a device classified into a tier?',
        content: `# @vishwakarma/three: exports, budgets, tiers

Every name below is exported from the package barrel. Nothing else is.

## Components

| Export | Job |
|---|---|
| \`AdaptiveCanvas\` | Canvas with web defaults: on-demand frame loop, dpr range from the tier budget, lazy peer import, boundary and Suspense wired to one fallback node. |
| \`PerformanceGuard\` | Measures document frame time outside the canvas and steps the tier down. Provides \`SceneQualityContext\`. |
| \`SceneBoundary\` | Error boundary (a class; React has no hook equivalent) that swaps in the fallback. |
| \`SceneFallback\` | The still composition: poster, \`posterSrcSet\`, \`posterSizes\`, \`alt\`, \`aspectRatio\`, \`background\`, \`reason\`, \`description\`. |
| \`AccessibleScene\` | Name, text equivalent, focus stop, keyboard orbit contract. |
| \`SceneDescription\` | Standalone text equivalent, hidden or \`visible\`. |
| \`LazyScene\` | Viewport gate plus capability gate; always renders its own container. |

## Hooks and functions

\`useDeviceCapability\` · \`useRecommendedQuality\` · \`useSceneViability\` ·
\`useOnDemandRender\` · \`useReducedMotionScene\` · \`useSceneQuality\` · \`useRenderHandle\` ·
\`useNearViewport\` · \`assessDeviceCapability\` · \`recommendQuality\` · \`probeWebgl\` ·
\`classifyGpu\` · \`compareQuality\` · \`minQuality\` · \`degradeQuality\` ·
\`resetCapabilityCache\` · \`budgetFor\` · \`checkSceneBudget\` · \`textureMemoryMiB\` ·
\`frameBudgetForRefreshRate\` · \`createRenderHandle\` · \`orbitDeltaForKey\` · \`loadFiber\` ·
\`loadDrei\` · \`loadCanvasComponent\` · \`peerStatus\` · \`resetPeerCache\`.

Constants: \`SCENE_BUDGETS\` · \`UNPROBED_CAPABILITY\` · \`VISUALLY_HIDDEN\` ·
\`SceneQualityContext\` · \`RenderHandleContext\`.

Types: \`QualityTier\` · \`GpuTier\` · \`WebglSupport\` · \`DeviceCapability\` ·
\`CapabilityOptions\` · \`WebglProbe\` · \`SceneBudget\` · \`SceneStats\` · \`BudgetReport\` ·
\`BudgetViolation\` · \`SceneMotionSettings\` · \`OrbitDelta\` · \`SceneFallbackReason\` ·
\`RenderHandle\` · \`SceneQualityValue\` · \`OnDemandRenderControls\` · \`CanvasComponent\` ·
\`CanvasLikeProps\` · \`RootStateLike\` · \`PeerStatus\`, plus the props interfaces.

There is no \`loadThree\`: code that builds geometry imports \`three\` directly rather than
through an untyped record.

## SCENE_BUDGETS, verbatim

\`QualityTier\` is \`'none' | 'low' | 'medium' | 'high'\`. \`none\` exists so lookups are total.

| metric | none | low | medium | high |
|---|---|---|---|---|
| \`drawCalls\` | 0 | 40 | 90 | 150 |
| \`triangles\` | 0 | 120,000 | 500,000 | 1,500,000 |
| \`textureMemoryMiB\` | 0 | 32 | 96 | 256 |
| \`maxTextureSize\` | 512 | 1024 | 2048 | 4096 |
| \`transferBytes\` | 0 | 1,500,000 | 4,000,000 | 8,000,000 |
| \`lights\` | 0 | 2 | 3 | 4 |
| \`shadowCasters\` | 0 | 0 | 1 | 2 |
| \`postProcessingPasses\` | 0 | 0 | 1 | 3 |
| \`dpr\` | [1, 1] | [0.75, 1] | [1, 1.5] | [1, 2] |
| \`frameBudgetMs\` | 0 | 16.7 | 16.7 | 16.7 |

Notes the source states explicitly:

- **\`dpr\` below 1 on low is deliberate.** Rendering at 0.75x and letting the browser upscale
  is the single most effective lever on a fill-rate-bound phone, and at phone pixel densities
  it is very hard to see.
- **\`dpr\` stops at 2 even on a 3x display.** Pixel count grows quadratically for a difference
  almost nobody resolves.
- **\`shadowCasters: 0\` on low is not an oversight.** Each caster is an extra full render of
  the scene from that light, so the draw-call budget is spent twice.
- **\`transferBytes\` is compressed, over the wire.** \`textureMemoryMiB\` is decompressed and
  resident. They differ by more than an order of magnitude and only one of them runs out.
- **\`frameBudgetMs\` is 16.7 as a default, not a truth.** \`frameBudgetForRefreshRate(hz)\`
  returns \`1000 / hz\`; a scene holding 60 fps on a 120 Hz panel drops every other frame and
  reads as judder rather than slowness.

## Checking a scene against a budget

\`\`\`ts
import { checkSceneBudget, textureMemoryMiB } from '@vishwakarma/three'

const report = checkSceneBudget(
  {
    drawCalls: gl.info.render.calls,
    triangles: gl.info.render.triangles,
    textureMemoryMiB: maps.reduce((n, m) => n + textureMemoryMiB(m.width, m.height), 0),
    transferBytes: 3_900_000,
    lights: 3,
    shadowCasters: 1,
    postProcessingPasses: 1,
  },
  'low',
)
// { tier, withinBudget, violations: [{ metric, actual, budget, overBy, message }] }
\`\`\`

\`SceneStats\` field names line up with a WebGL renderer's own \`info\` object, so wiring it up
is copying numbers rather than instrumenting anything. Every field is optional; partial
measurements still check. It returns a report rather than throwing, because the useful callers
are a dev overlay and a CI step and both want every problem at once.

\`textureMemoryMiB(width, height, { bytesPerPixel = 4, mipmaps = true })\` multiplies by 4/3
for a full mip chain. 2048² RGBA = 16 MiB base, 21.33 MiB with mipmaps. Four 4K maps with
mipmaps are ~340 MiB and exceed even the \`high\` budget by a third.

## How a tier is chosen

\`assessDeviceCapability(options)\` reads every signal and returns \`DeviceCapability\`:
\`webgl\` · \`gpu\` · \`renderer\` · \`deviceMemory\` · \`cores\` · \`prefersReducedMotion\` ·
\`saveData\` · \`effectiveConnection\` · \`coarsePointer\` · \`pixelRatio\` · \`recommended\` ·
\`probed\`.

\`recommendQuality\` applies hard vetoes first, each returning \`none\` on its own:

1. \`webgl === 'none'\` — no context, or a privacy extension blocking it.
2. \`gpu === 'software'\` — SwiftShader, llvmpipe, softpipe, Microsoft Basic Render. The scene
   would "work" at single-digit fps.
3. \`saveData\` (when \`saveDataBlocks\`, default \`true\`) — the only signal here that is an
   explicit user instruction rather than an inference.
4. \`prefersReducedMotion\` **only if** \`reducedMotionBlocks\` is passed — default
   \`false\`, and it should usually stay false: the preference is about movement, not rendering.
5. \`effectiveConnection\` of \`2g\` or \`slow-2g\`.

Then a score starting at 0:

| signal | delta |
|---|---|
| \`gpu: 'high'\` / \`'medium'\` / \`'low'\` | +2 / +1 / −2 |
| \`webgl: 'webgl1'\` | −1 |
| \`deviceMemory\` ≤2 / ≤4 / ≥8 GiB | −2 / −1 / +1 |
| \`cores\` ≤2 / ≤4 / ≥8 | −2 / −1 / +1 |
| \`coarsePointer\` | −1 |
| \`effectiveConnection: '3g'\` | −1 |

Score ≥2 → \`high\`; ≤−2 → \`low\`; otherwise \`medium\`. Clamped by \`maxQuality\`
(default \`high\`) and floored by \`minQuality\` (default \`low\`).

\`coarsePointer\` is −1 for thermal reasons, not GPU power: a modern phone renders the high
tier for ninety seconds and then throttles, which the user experiences as the page getting
worse the longer they read.

\`classifyGpu\` matches a lowercased renderer string; unrecognised returns
\`'unknown'\`, which scores 0 and lands in \`medium\`. That direction is deliberate — treating an
unrecognised GPU as slow punishes every device released after the pattern list was edited,
and Firefox and Safari commonly withhold the string entirely.

## The probe costs a context, once

\`probeWebgl()\` creates a throwaway context, reads \`WEBGL_debug_renderer_info\`, then calls
\`loseContext()\` and caches the result for the document's lifetime. That cleanup is not
tidiness: browsers cap live WebGL contexts per document (~16 in Chromium, fewer elsewhere) and
evict the **oldest** when the cap is hit, so a probe that leaks a context per mount eventually
blanks the application's real canvas with what looks like a driver bug.

\`failIfMajorPerformanceCaveat\` is deliberately not set — it rejects contexts on usable
machines with unusual drivers, and a false negative costs a user the whole experience.

\`UNPROBED_CAPABILITY\` is the frozen pre-probe answer shared by the server render and the
first client render: \`probed: false\`, \`recommended: 'none'\`, and
\`prefersReducedMotion: true\`. Gate on \`probed\`, never on \`typeof window\`.
\`useSceneViability\` returns \`null\` while unknown rather than \`false\`, because collapsing
the two makes every scene flash its fallback for a frame.

## The guard, once the scene is live

The probe measures a cool, idle, plugged-in device and is regularly wrong in one direction.
\`PerformanceGuard\` watches with \`requestAnimationFrame\` against the document's own frame
clock — the honest measurement, since it includes everything competing for the main thread.

Defaults: \`slowFrameMs: 25\` (deliberate slack over 16.7, or the guard fires on hardware that
is coping), \`windowSize: 60\`, \`degradeAfter: 2\`, \`floor: 'low'\`. It uses the **median** of
the window, not the mean, so one GC pause or route transition cannot trigger a drop. Deltas
≥300 ms are discarded as a backgrounded tab rather than a slow frame. The first second after
mount, and after any degrade, is ignored: that window measures shader compilation and texture
upload, the most expensive and least representative moment in the scene's life.

**Quality is never raised again.** Restoring detail produces visible oscillation, and the usual
cause of sustained slow frames is thermal throttling, which does not reverse while the page
keeps rendering — so raising quality would throttle again and loop for as long as the user
stays. One-way degradation is the design.

\`useSceneQuality()\` inside the scene reads \`{ quality, budget, setQuality, degrade,
degraded }\` and does not throw outside a provider; it falls back to \`medium\`, because a mesh
that cannot read its detail level has a reasonable thing to do and crashing the tree over a
decorative detail is out of proportion.`,
      },
      {
        id: 'load-and-cost',
        title: 'The load story and the cost of a frame',
        answers:
          'What does the user see while a multi-megabyte scene downloads, how do I compress it, and how do camera, lighting, raycasting and the frame loop spend the frame budget?',
        content: `# Loading a scene, and what a frame costs

## Why a 3D hero must not own the largest contentful paint

The renderer, the scene graph, the models and the textures are megabytes of JavaScript and
binary that must be fetched, parsed, compiled, uploaded to the GPU and drawn before anything
appears — while contending for the same main thread that hydration, fonts and the page's own
text need. The measured result is consistent: seconds added to the largest paint, interaction
delayed, and a layout shift when the canvas finally takes its space.

No amount of visual quality compensates, because the user who left at two seconds never saw the
scene either.

The correct arrangement: **ship the still composition as the real content, let it be the
largest paint, and upgrade to the scene afterwards.** \`LazyScene\` with \`eager\` does exactly
this — it skips the viewport gate for above-the-fold content and keeps everything else,
including the fallback owning the layout until the scene can replace it.

## The progressive sequence

1. **HTML with a poster.** A real image at the canvas's aspect ratio, in the reserved box, with
   \`srcSet\`. Eager, never lazy — a fallback that lazy-loads is a blank box during exactly the
   window it exists to cover, and if it is the hero it is also the largest paint.
2. **Capability probe** in an idle callback (\`requestIdleCallback\` with a 500 ms timeout,
   falling back to \`setTimeout\`), one frame or more after first paint.
3. **Peer chunks** — \`@react-three/fiber\`, then \`three\`, then \`drei\` if used — fetched by
   dynamic import so they are a separate chunk. The specifier is a literal so the bundler can
   see and split it; passing a variable silences the missing-module warning at the cost of the
   code splitting that was the entire point.
4. **Model and textures**, streamed.
5. **First draw**, then cross-fade the canvas over the poster in the same box.

\`SceneFallbackReason\` (\`'loading' | 'unsupported' | 'declined' | 'error' | 'offscreen'\`) is
accepted, recorded and deliberately not rendered. Branch on it for analytics; never put it on
screen. "3D unavailable on your device" tells the user something they cannot act on, in the
place they expected the product.

And no spinner. A progress bar in place of a hero implies the real content is imminent and
worth waiting for, so the user waits — and a substantial fraction will never get the scene.

## Who sees the fallback

Everyone before the bundle arrives; every device that failed the probe; everyone with data
saving on; everyone behind a proxy that mangled the module; everyone whose GPU process
crashed; every crawler; every link preview; every print. On the metrics that measure the first
impression it is **everyone**, because the fallback occupies the space while the scene is still
being decided upon.

## Compression, and why transferBytes is its own budget

\`transferBytes\` and \`triangles\` measure different resources. Compression changes the wire
cost and leaves the GPU cost untouched; decimation changes the GPU cost and barely moves the
wire cost. A scene can be well inside the triangle budget and four times over the transfer
budget, or the reverse.

- **Geometry: Draco or meshopt.** Draco compresses harder; meshopt decodes faster and with a
  much smaller decoder, which matters on the device that needed the compression. Either turns
  a typical 4 MB \`.glb\` into roughly 0.5–1 MB. Both need their decoder available — host it
  yourself rather than trusting a CDN you do not control.
- **Textures: KTX2/Basis (UASTC or ETC1S).** The important property is that they stay
  compressed **in VRAM**, so they reduce \`textureMemoryMiB\` as well as \`transferBytes\`.
  A PNG or JPEG is decompressed on upload and a 400 KiB PNG becomes 16 MiB of VRAM. ETC1S for
  colour maps, UASTC where banding shows (normals).
- **One \`.glb\`, not a \`.gltf\` plus loose files.** Fewer requests, no waterfall.
- **Halve the texture, not the mesh, first.** \`maxTextureSize\` per tier is 1024 / 2048 /
  4096. Halving a dimension quarters the memory; the source doc's note is blunt — "beyond this,
  halve it; nobody will notice."
- **Ship one model, not one per tier**, unless measurement forces otherwise. Tiers shed
  lights, shadows, post-processing and pixel ratio first; those are free to vary and do not
  multiply the build.

On the \`low\` tier the entire 3D payload ceiling is 1.5 MB, which the source describes as
already several seconds of waiting on a 3G-class connection for something the user did not ask
for. That is the number to design the poster path around.

## Camera and framing

Field of view is a compositional choice, not a default. Around 35–50° vertical reads as a
photograph of an object; 75° reads as a video game and visibly distorts anything near the
camera — a product filmed at 75° has a swollen front face. A tight FOV with the camera pulled
back flattens perspective, which is what product photography does on purpose.

Frame by fitting the subject's bounding sphere to the vertical extent at the chosen FOV, then
add margin, rather than hard-coding a position that was eyeballed against one model.

**Portrait is the case that breaks.** With a fixed vertical FOV, narrowing the viewport
narrows the horizontal extent, so a composition tuned at 16:9 loses the sides at 9:16 —
typically the subject's head or the part the copy refers to. Two workable answers: derive the
camera distance from aspect ratio so the subject stays fully framed, or author a separate
portrait composition and let landscape crop outward from it. Choosing neither produces the
commonest mobile 3D defect, a model half out of frame.

Orthographic projection is worth considering for diagrams, isometric scenes and
configurators: no perspective distortion, and size comparisons stay honest.

## Lighting that reads

- **The default three-point rig looks like a product render.** Key, fill and rim on a neutral
  background is exactly a studio photograph — right for a product page, wrong for anything
  meant to feel like a place, where it flattens depth and kills any sense of a light source in
  the world.
- **An environment map is usually the better first move.** One texture lights everything with
  no per-light shader cost, and it is what makes metal and rough surfaces legible at all: a
  metal with nothing to reflect reads as flat grey. Keep it small and pre-filtered; an
  unfiltered 4K HDR is both a transfer cost and a memory cost for a blurry result.
- **Real-time lights multiply.** Each one adds work in every lit material's shader, so the cost
  is lights × lit pixels, not lights alone. The tier ceilings are 2 / 3 / 4.
- **Shadow casters are the expensive ones.** Each re-renders the scene from the light's point
  of view, so a scene at its 90-draw-call medium budget with one caster is issuing ~180.
  Ceilings are 0 / 1 / 2. Bake instead: a baked shadow costs nothing per frame and looks better
  than the low-resolution shadow map a phone can afford. A contact-shadow plane or a blurred
  radial-gradient texture under the subject reads as grounded for approximately zero.
- **Post-processing is full-screen.** Each pass reads and writes every pixel at device
  resolution, so its cost scales with \`dpr\` squared. Budgets are 0 / 1 / 3. Bloom on a
  \`low\`-tier phone is not available, and that is the correct answer.

## Interaction inside an opaque element

**Raycasting.** A ray test walks candidate objects and, without bounds, every triangle.
Bound it: keep an explicit array of interactive objects and raycast against that, not the
scene; give them coarse bounding volumes or invisible proxy meshes; run at most one test per
frame regardless of how many pointer-move events arrived; skip entirely while the camera is
moving or the pointer is outside the canvas. For large static sets, a bounds hierarchy is the
answer, but the list-narrowing above usually removes the need.

**Hover and focus.** A canvas is one element, so there is no per-object \`:hover\` or focus
ring. Hover state lives in the scene and must be mirrored somewhere a keyboard user can
reach — a list of hotspots outside the canvas, each button focusing and selecting the
corresponding object, is the pattern that works for everyone and costs one component.

**Pointer, not mouse or touch.** \`pointerdown\`/\`pointermove\` unify mouse, touch and pen,
and expose \`pointerType\`. A coarse pointer has **no hover at all**, so any affordance
revealed only on hover does not exist on a phone; a tap must do it. Set
\`touch-action: none\` on the canvas only when the scene genuinely consumes the drag, because
it also removes the user's ability to scroll the page from that area — on a full-height canvas
that traps them.

## The frame loop

\`frameloop="demand"\` is \`AdaptiveCanvas\`'s default because most web scenes change nothing
for minutes at a time: a product model sitting still, a logo the user can rotate, a diagram.
Continuous rendering produces identical images, prevents CPU idle states, spins laptop fans and
flattens phone batteries.

Only changes that pass through the React reconciler request a frame automatically. These do
not, and are the silent staleness bugs: a value read from an external store, a ref mutated in
an event handler, a texture that finished decoding, a CSS-driven canvas resize. The scene is
correct in memory and stale on screen — maddening to chase, because everything you inspect
says the right thing.

\`\`\`tsx
const { requestRender, renderFor } = useOnDemandRender({ on: [selectedId], frames: 2 })
// after a non-React change:
requestRender()
// for a scripted camera move or a physics settle:
const stop = renderFor(600)
\`\`\`

Ask for more than one frame whenever motion has inertia: a single invalidation renders the
first step of a damped move and stops, because the thing that would have requested the second
frame was the second frame. \`frames: 2\` or a \`renderFor\` window fixes what looks like a
stuck animation.

Scenes with genuine continuous motion set \`frameloop="always"\` and mean it. The common
accident is switching to \`always\` to debug something and shipping it.

One more trap the source names: passing \`autoRotateSpeed: 0\` instead of
\`autoRotate: false\`. Many control implementations still run their update loop, which under
\`demand\` means the scene requests frames forever for a rotation that is not visibly
happening.`,
      },
      {
        id: 'access-and-fallback',
        title: 'Accessibility, reduced motion, and every failure path',
        answers:
          'How do I make a canvas usable without sight or a mouse, what does prefers-reduced-motion mean for a 3D scene, and what happens on no-WebGL or a lost context?',
        content: `# Accessibility and failure paths

## A canvas conveys nothing

Screen readers see one node with no children, no text and no structure, whatever is painted
inside it. There is no alt text a renderer can infer, no DOM to traverse, and no amount of care
over the geometry changes that.

So the rule is unconditional: **every piece of information the scene conveys must also exist as
text.** If the model is the product, the specification has to be readable. If the visualisation
shows a trend, the trend has to be stated. If the scene is decorative, say so — and then it
needs no description, only \`aria-hidden\`.

**The test:** load the page with the canvas element deleted. Everything a user would have
learned from it should still be obtainable. If it is not, the scene carries content some of
your users cannot reach, and the fix is content, not ARIA.

## AccessibleScene

\`\`\`tsx
<AccessibleScene
  label="Office chair, front three-quarter view"
  description={
    <>
      <p>Mesh back, aluminium five-star base, 12 cm seat-height travel.</p>
      <ul><li>Seat 47 cm wide</li><li>Weight 18 kg</li></ul>
    </>
  }
  interactive
  onOrbit={({ azimuth, polar, zoom }) => controls.apply(azimuth, polar, zoom)}
  keyboardStep={0.15}
>
  <AdaptiveCanvas fallback={poster}>{scene}</AdaptiveCanvas>
</AccessibleScene>
\`\`\`

- \`label\` is the accessible name. Describe what it **is**, not that it is 3D — "office chair,
  front three-quarter view", never "3D model".
- \`description\` goes into the accessibility tree, and onto the screen with
  \`showDescription\`. Worth showing: a caption stating what the viewer shows helps everyone on
  a slow connection watching the fallback, everyone who scrolled past before it loaded, and
  everyone trying to work out what they are meant to be looking at.
- \`decorative\` applies \`aria-hidden\` and removes it from the tree. Honest for a background
  effect; badly wrong for anything a user is expected to look at, and it is the shortcut people
  reach for when writing the description feels like work.
- \`interactive\` makes the wrapper a focus stop (\`tabIndex: 0\`) with a visible ring drawn
  only for \`:focus-visible\`.
- The role is \`img\` with \`aria-roledescription="interactive 3D scene"\`, not
  \`application\` — \`application\` suppresses the screen reader's own navigation keys, trading
  shortcuts the user knows for shortcuts they do not.
- ARIA goes on a **wrapper element**, never on the canvas: attributes set on a canvas a
  renderer owns are liable to be overwritten on resize or recreation, and the failure is
  silent — the scene looks identical and has stopped being announced.

## The keyboard path

A scene the user can rotate with a mouse and not with a keyboard is a control that exists for
some people and not others. \`orbitDeltaForKey(key, step)\` is the binding table, exported so
the same contract can drive on-screen buttons:

| key | \`OrbitDelta\` |
|---|---|
| \`ArrowLeft\` / \`ArrowRight\` | azimuth −step / +step |
| \`ArrowUp\` / \`ArrowDown\` | polar +step / −step |
| \`PageUp\` / \`PageDown\` | zoom +1 / −1 |
| \`+\` \`=\` / \`-\` \`_\` | zoom +1 / −1 |
| \`Home\` | all zeroes — a reset, distinguished by the key, so scenes that do not implement it safely do nothing |
| anything else | \`null\` |

\`preventDefault\` is called only once a key is known to be handled; swallowing arrow keys
unconditionally steals page scrolling from anyone tabbing past the scene.

Add the on-screen buttons too. A keyboard-only contract still excludes anyone using a touch
screen with switch access or voice control, and named views ("front", "side", "reset") are
faster for everyone than arrow-stepping to an angle.

## Reduced motion

\`prefers-reduced-motion\` is normally handled in CSS, and a canvas has no CSS layer. Nothing
inside a WebGL context is affected unless JavaScript reads the preference, so scenes routinely
keep spinning for users who disabled animation everywhere else — and a slowly rotating product
model filling the viewport is a considerably stronger vestibular trigger than the fades and
slides the preference was invented to suppress.

\`useReducedMotionScene\` translates it:

\`\`\`tsx
const motion = useReducedMotionScene({ autoRotateSpeed: 0.5, dampingFactor: 0.05 })
// { prefersReducedMotion, autoRotate, autoRotateSpeed, enableDamping,
//   dampingFactor, animate, motionScale, frameloop }
\`\`\`

Frozen values: \`autoRotate: false\`, \`autoRotateSpeed: 0\`, \`enableDamping: false\`, plus
\`dampingFactor: 0\`, \`animate: false\`, \`motionScale: 0\`, \`frameloop: 'demand'\`. Multiply
any self-computed rate by \`motionScale\` to freeze an existing animation without restructuring
it.

**It does not stop rendering.** Reduced motion means *still*, not *absent*: a frozen scene the
user inspects and rotates deliberately with their own input honours the preference completely,
while replacing it with a flat image treats an accessibility setting as a punishment. This is
also why \`reducedMotionBlocks\` defaults to \`false\` in the capability options — turn it on
only when the scene's content **is** motion (a particle field, a continuous fly-through) and
cannot be made still without becoming pointless.

Damping is switched off under the preference even though it feels like polish: it produces
movement that continues after the user stopped providing input, which is exactly the category
of unrequested motion the preference is about.

The hook uses \`useSyncExternalStore\`, so the first client render is already correct. With
state-plus-effect the scene mounts with autorotation on and switches it off a frame later,
which means a user who disabled animation still sees the model lurch once per page load. The
server snapshot is \`true\` — guessing towards calm costs one missed animation; guessing the
other way hits somebody with a vestibular disorder.

Offer an in-page pause control as well, wired to the \`freeze\` option. The OS preference is
buried in accessibility settings and plenty of people who would use a pause button have never
found it.

**Scroll-driven cameras** are the sharpest case: large-area motion coupled to scroll at a rate
the user did not choose. Under reduced motion, render the end state and let the page scroll
normally. WCAG 2.2 SC 2.3.3 covers this.

## No WebGL, and a context that dies mid-session

Context loss is a **runtime event**, not a hypothetical. The GPU process crashes; a driver
resets; the OS reclaims resources under memory pressure; a laptop switches GPUs; a tab is
backgrounded on Android and its context is discarded; or the document exceeds its live-context
cap (~16 in Chromium) and the browser evicts the oldest — which is usually somebody's leaked
probe context rather than a driver fault.

\`SceneBoundary\` is the answer, and \`AdaptiveCanvas\` already wraps its canvas in one.

\`\`\`tsx
<SceneBoundary fallback={poster} onError={(e, info) => report(e, info)}>
  {scene}
</SceneBoundary>
\`\`\`

It catches what React cannot recover from on its own: a rejected dynamic import when \`three\`
is absent, a renderer throwing when the GPU process dies, a loader throwing on a malformed
model. Without it, a decorative background effect takes the entire route down — a spectacularly
poor trade for ornament.

Two properties to understand:

- **It is one-way.** No automatic retry, because a scene that failed because WebGL is
  unavailable fails again immediately and a retrying boundary turns one error into an infinite
  loop. Recovery is the application's decision, made by remounting with a new \`key\` — a
  "reload the viewer" button, not an automatic loop.
- **\`onError\` must be wired to real error reporting.** A scene that quietly falls back looks
  fine to everyone including the team. "Our 3D hero has been broken in Safari for six weeks" is
  not a discovery to make from a support ticket.

\`peerStatus('fiber' | 'drei')\` reports \`'idle' | 'loading' | 'ready' | 'unavailable'\`
without triggering a load. Failures are cached as well as successes: without that, a page with
four scenes on a machine lacking \`three\` attempts four module loads and fills the console
with identical errors that bury the real problem.

## The fallback is the page for a large share of visitors

\`\`\`tsx
<SceneFallback
  poster="/chair-1600.avif"
  posterSrcSet="/chair-800.avif 800w, /chair-1600.avif 1600w, /chair-2400.avif 2400w"
  posterSizes="(max-width: 48rem) 100vw, 50vw"
  alt="Office chair, front three-quarter view, mesh back and aluminium base"
  aspectRatio="4 / 3"
  background="#141416"
  description={<p>Seat height adjusts over 12 cm; seat 47 cm wide; 18 kg.</p>}
  reason={reason}
/>
\`\`\`

- **A real image, not a grey box or a spinner.** Render the scene once at build time from the
  canonical camera and ship the result. \`children\` replaces the poster when a genuinely
  designed alternative is better — a diagram, or the table of numbers a visualisation was
  showing.
- **\`alt\` is required whenever a poster is given, and required to be useful.** It is
  frequently the only description of the subject any assistive technology will ever encounter,
  since the canvas that replaces it conveys nothing.
- **\`aspectRatio\` must match the canvas.** Approximately is not good enough: the shift is
  measured in fractions of the viewport and a five per cent error is still a shift. Set it on
  \`LazyScene\` too, or the container has no height until the scene mounts and the page reflows
  twice.
- **The poster is eager.** Lazy-loading it leaves a blank box during exactly the window it
  exists to cover.
- **No status copy.** \`reason\` exists for analytics; knowing what share of visitors never see
  the scene is genuinely useful. On screen it is noise at best.

## What to verify on real hardware

Emulated throttling in devtools does not reproduce thermal behaviour, and thermal behaviour is
the defect. On a real mid-tier Android phone, on a throttled connection, cold cache:

1. Poster visible immediately; the canvas is not the largest contentful paint.
2. No layout shift when the canvas replaces the poster.
3. Frame time after **two minutes** of continuous use, not two seconds — that is when the
   device is the one your users have.
4. \`checkSceneBudget\` clean at the lowest tier shipped, with \`textureMemoryMiB\` computed
   from uploaded sizes.
5. Whether \`PerformanceGuard\` ever fired. If it degrades on the target device within the
   first thirty seconds, the initial tier was wrong and the fix is a smaller scene, not a
   higher \`slowFrameMs\`.
6. Battery and heat: an idle scene that still requests frames shows up as measurable drain.

Then, on any machine: WebGL disabled (\`chrome://flags\`, or a blocking extension), the canvas
element deleted from the DOM, keyboard only, a screen reader, \`prefers-reduced-motion:
reduce\`, and Save-Data on — six complete pages, or the scene is not finished.`,
      },
    ],
  },

  rules: [
    {
      id: 'webgl/one-environment-resident',
      strength: 'must',
      statement:
        'Hold one environment in GPU memory at a time, and dispose geometries, materials and their textures explicitly before loading the next.',
      evidence: {
        rationale:
          'The medium tier allows 96 MiB of texture memory, so several environments authored to that quality cannot coexist. Removing an object from the scene graph only drops the JavaScript reference — the GPU allocation survives until each resource is disposed, and a material holds references to its textures that disposing the material does not release. A sequence that loops therefore climbs until the tab is killed, slowly enough that nobody connects the crash to it.',
        confidence: 'established',
      },
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/measure-resource-counts-across-a-cycle',
      strength: 'must',
      statement:
        'Verify a swap by reading renderer.info.memory geometries and textures before and after a full cycle, not by inspecting the code.',
      evidence: {
        rationale:
          'A leaked geometry looks identical to a disposed one in source and in the rendered picture; only the live counts distinguish them. Equal numbers across a cycle prove the swap is clean and a climb is the leak, which makes this one of the few GPU-memory questions with a direct measurement rather than an inference.',
        confidence: 'established',
      },
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/render-through-adaptive-canvas',
      strength: 'must',
      statement:
        'Mount 3D through AdaptiveCanvas from @vishwakarma/three rather than a bare react-three-fiber Canvas.',
      evidence: {
        rationale:
          'AdaptiveCanvas supplies four behaviours a bare canvas lacks: an on-demand frame loop, a pixel-ratio range taken from the active tier budget, the renderer reached by a module-scope lazy import inside a SceneBoundary and a Suspense boundary that share one fallback node, and — at tier none — the fallback returned without allocating a WebGL context at all.',
        confidence: 'established',
      },
      exceptions: [
        'A project that already owns an equivalent wrapper providing all four behaviours; extend that rather than adding a second canvas abstraction.',
      ],
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/tier-before-mount',
      strength: 'must',
      statement:
        'Derive a QualityTier from useDeviceCapability or useRecommendedQuality and pass it to PerformanceGuard before the scene mounts.',
      evidence: {
        rationale:
          'A single quality level means the scene is authored for one device class. The probe runs in an effect and reports probed: false with tier none on the server and the first client render, so a scene that does not wait for it either renders before the decision exists or produces a hydration mismatch.',
        confidence: 'established',
      },
      exceptions: [
        'A scene behind an interaction nobody has performed yet, where useDeviceCapability({ enabled: false }) defers the probe until the dialog opens.',
      ],
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/poster-owns-first-paint',
      strength: 'must-not',
      statement:
        'Do not let the canvas be the largest contentful paint element; ship a poster as the real content and upgrade to the scene after first paint.',
      evidence: {
        rationale:
          'Renderer, scene graph, geometry and textures must be fetched, parsed, compiled, uploaded and drawn before a canvas shows a single pixel, contending for the main thread with hydration and fonts. That adds seconds to the largest paint, and the user who leaves at two seconds never sees the scene either.',
        confidence: 'established',
      },
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/reserve-scene-space',
      strength: 'must',
      statement:
        'Set a matching aspectRatio on both the LazyScene container and the SceneFallback so poster and canvas occupy identical space.',
      evidence: {
        rationale:
          'Without a reserved ratio the container has no height until the scene mounts, so the page reflows when the poster loads and again when the canvas appears. Both count against cumulative layout shift, and a mismatch of even five per cent still moves the page under someone already reading.',
        confidence: 'established',
      },
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/fallback-is-designed',
      strength: 'must-not',
      statement:
        'Do not use a spinner, a grey box, or a status message such as "3D unavailable" as the fallback for a scene.',
      evidence: {
        rationale:
          'The fallback is what every pre-bundle visitor, every declined device, every crawler, every print and every crashed GPU process sees, so it is a substantial share of traffic rather than an edge case. A progress indicator implies the real content is imminent, so users wait for something that for many of them never arrives; a reason string tells them something they cannot act on.',
        confidence: 'established',
      },
      exceptions: [
        'A determinate progress indicator inside an interaction the user explicitly started, such as a configurator the user opened by pressing a button.',
      ],
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/check-against-scene-budgets',
      strength: 'must',
      statement:
        'Run checkSceneBudget against SCENE_BUDGETS for the lowest tier the page ships, and resolve every violation by removing scene content.',
      evidence: {
        rationale:
          'The low tier allows 40 draw calls, 120,000 triangles, 32 MiB of texture memory, 1.5 MB transferred, 2 lights and 0 shadow casters. Draw calls carry fixed CPU cost per call and driver overhead dominates on mobile long before the GPU is troubled, so 200 trivial cubes stutter where one 100,000-triangle mesh does not; each shadow caster re-renders the scene from its own viewpoint and spends the draw-call budget twice.',
        confidence: 'established',
      },
      exceptions: [
        'A scene gated behind an explicit user action on a route that declares a higher minQuality, where the low tier is never served.',
      ],
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/budget-uploaded-texture-memory',
      strength: 'must',
      statement:
        'Budget textures with textureMemoryMiB against the tier ceiling of 32, 96 or 256 MiB, using uploaded dimensions rather than compressed file size.',
      evidence: {
        rationale:
          'A 2048x2048 RGBA texture occupies 16 MiB in VRAM whatever its PNG weighed, and 21.33 MiB with a full mip chain at the 4/3 multiplier. Download size and resident size differ by more than an order of magnitude, and it is resident size that exhausts a phone GPU process and kills the tab.',
        confidence: 'established',
      },
      exceptions: [
        'KTX2/Basis textures, which stay compressed in VRAM; measure their actual GPU footprint rather than the RGBA arithmetic.',
      ],
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/compress-the-payload',
      strength: 'should',
      statement:
        'Compress geometry with Draco or meshopt and textures with KTX2/Basis, and keep the total 3D payload inside the tier transferBytes ceiling of 1.5, 4 or 8 MB.',
      evidence: {
        rationale:
          'transferBytes and triangles are separate budgets because compression reduces wire cost without touching GPU cost, and decimation does the reverse, so a scene can sit inside one and four times over the other. KTX2 is the exception that helps both, because it remains compressed in VRAM rather than being expanded on upload.',
        confidence: 'established',
      },
      exceptions: [
        'Meshes small enough that a Draco or meshopt decoder costs more bytes and main-thread time than it saves.',
      ],
    },
    {
      id: 'webgl/frameloop-on-demand',
      strength: 'must',
      statement:
        'Keep frameloop on demand for any scene without continuous motion, and call useOnDemandRender().requestRender after changes that bypass the React reconciler.',
      evidence: {
        rationale:
          'A static scene at 60 fps produces identical images, prevents the CPU reaching idle states, spins laptop fans and flattens phone batteries. Under demand only reconciler-visible changes invalidate automatically, so a decoded texture, a mutated ref, an external store read or a CSS-driven resize leaves the scene correct in memory and stale on screen.',
        confidence: 'established',
      },
      exceptions: [
        'Scenes with genuine continuous motion — a particle field, a running simulation — which set frameloop="always" deliberately.',
      ],
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/text-equivalent-or-decorative',
      strength: 'must',
      statement:
        'Give every informative scene a text equivalent through AccessibleScene description or SceneDescription, and mark only genuinely contentless scenes decorative.',
      evidence: {
        rationale:
          'A canvas is a single opaque element: assistive technology sees one node with no children, no text and no structure regardless of what is painted inside it, and no alt text can be inferred from geometry. Deleting the canvas element is the test — anything a sighted user would have learned must still be obtainable.',
        confidence: 'established',
      },
      exceptions: [
        'A background effect that conveys nothing, which takes decorative and aria-hidden — not a shortcut for a description that felt like work.',
      ],
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/keyboard-operable-scene',
      strength: 'must',
      statement:
        'Make an interactive scene a single focus stop with AccessibleScene interactive plus onOrbit, and mirror object-level hover state in focusable DOM controls outside the canvas.',
      evidence: {
        rationale:
          'A canvas is one focusable element, so there is no per-object hover or focus ring and no tab order inside it. Without a keyboard contract, camera control exists only for pointer users; without DOM controls, per-object selection is unreachable by keyboard, switch access and voice control, and absent entirely on coarse pointers that have no hover.',
        confidence: 'established',
      },
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/reduced-motion-freezes-not-removes',
      strength: 'must',
      statement:
        'Apply useReducedMotionScene to stop autorotation, damping and ambient animation under prefers-reduced-motion, while continuing to render the scene.',
      evidence: {
        rationale:
          'Nothing inside a WebGL context responds to the media query unless JavaScript reads it, so scenes keep spinning for users who disabled animation everywhere else — and a rotating model filling the viewport is a stronger vestibular trigger than the fades the preference was written for. The preference concerns movement, not rendering, so a still scene the user rotates on their own input satisfies it fully.',
        source: 'WCAG 2.2 Success Criterion 2.3.3 (Animation from Interactions)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html',
        confidence: 'established',
      },
      exceptions: [
        'A scene whose content is inherently motion and becomes pointless when still, which sets reducedMotionBlocks so the fallback composition is served instead.',
      ],
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/boundary-and-report',
      strength: 'must',
      statement:
        'Wrap every scene in a SceneBoundary with an onError handler wired to error reporting, and offer remount-by-key rather than automatic retry.',
      evidence: {
        rationale:
          'A rejected peer import, a GPU process crash, a driver reset, an evicted context past the document cap and a malformed model all throw below the point React can recover, so without a boundary a decorative effect takes the whole route down. Automatic retry turns an unrecoverable cause such as absent WebGL into an infinite error loop, and an unreported silent fallback looks correct to the team for weeks.',
        confidence: 'established',
      },
      verifiedBy: 'webgl-finish-review',
    },
    {
      id: 'webgl/bound-raycast-work',
      strength: 'should',
      statement:
        'Raycast against an explicit list of interactive objects at most once per frame, and skip the test while the camera is moving.',
      evidence: {
        rationale:
          'An unbounded ray test traverses the scene graph and, without bounding volumes, every triangle in it, while pointermove can fire many times per frame. That places an O(triangles) traversal on the main thread repeatedly inside a 16.7 ms budget already spent on rendering.',
        confidence: 'strong',
      },
      exceptions: [
        'Large static sets where a precomputed bounds hierarchy makes full-scene tests cheap enough to run per event.',
      ],
    },
  ],

  verification: [
    {
      id: 'webgl-finish-review',
      kind: 'self-review',
      description:
        'Confirm the 3D page is finished, not just the scene — measured on real mid-tier hardware.',
      blocking: true,
      questions: [
        'On a real mid-tier Android phone on a throttled connection with a cold cache, what is the median frame time after two continuous minutes, and did PerformanceGuard degrade the tier within the first thirty seconds?',
        'Is the largest contentful paint element the poster image rather than the canvas, and does the canvas replace it with zero layout shift?',
        'Does checkSceneBudget report withinBudget for the lowest tier this page ships, with textureMemoryMiB computed from uploaded dimensions rather than file sizes?',
        'With the canvas element deleted from the DOM, does the page still convey everything the scene was showing?',
        'Using only a keyboard, can the camera be moved and every interactive object selected, with a visible focus indicator at each stop?',
        'Under prefers-reduced-motion: reduce, is autorotation, damping and ambient animation stopped while the scene still renders and remains inspectable?',
        'With WebGL disabled in the browser, and separately with Save-Data on, is the result a complete designed page rather than a gap, a spinner or a status message?',
        'Is frameloop on demand, and after every non-React change — a decoded texture, a mutated ref, an external store read, a canvas resize — does the scene visibly update?',
        'Does SceneBoundary have an onError handler reporting to real error tracking, and is recovery a user-triggered remount rather than an automatic retry?',
        'At portrait aspect ratio on a phone, is the subject fully framed, and is the field of view a chosen value rather than a library default?',
      ],
    },
  ],

  relatedSkills: [
    'procedural-surfaces',
    '3d-game-assets',
    'rendering-performance',
    'mobile-performance',
    'scroll-experiences',
    'media-driven-motion',
    'accessible-components',
    'vishwakarma-studios',
  ],
}
