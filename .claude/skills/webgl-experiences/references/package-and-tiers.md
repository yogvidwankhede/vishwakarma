# @vishwakarma/three: exports, budgets, tiers

Every name below is exported from the package barrel. Nothing else is.

## Components

| Export | Job |
|---|---|
| `AdaptiveCanvas` | Canvas with web defaults: on-demand frame loop, dpr range from the tier budget, lazy peer import, boundary and Suspense wired to one fallback node. |
| `PerformanceGuard` | Measures document frame time outside the canvas and steps the tier down. Provides `SceneQualityContext`. |
| `SceneBoundary` | Error boundary (a class; React has no hook equivalent) that swaps in the fallback. |
| `SceneFallback` | The still composition: poster, `posterSrcSet`, `posterSizes`, `alt`, `aspectRatio`, `background`, `reason`, `description`. |
| `AccessibleScene` | Name, text equivalent, focus stop, keyboard orbit contract. |
| `SceneDescription` | Standalone text equivalent, hidden or `visible`. |
| `LazyScene` | Viewport gate plus capability gate; always renders its own container. |

## Hooks and functions

`useDeviceCapability` · `useRecommendedQuality` · `useSceneViability` ·
`useOnDemandRender` · `useReducedMotionScene` · `useSceneQuality` · `useRenderHandle` ·
`useNearViewport` · `assessDeviceCapability` · `recommendQuality` · `probeWebgl` ·
`classifyGpu` · `compareQuality` · `minQuality` · `degradeQuality` ·
`resetCapabilityCache` · `budgetFor` · `checkSceneBudget` · `textureMemoryMiB` ·
`frameBudgetForRefreshRate` · `createRenderHandle` · `orbitDeltaForKey` · `loadFiber` ·
`loadDrei` · `loadCanvasComponent` · `peerStatus` · `resetPeerCache`.

Constants: `SCENE_BUDGETS` · `UNPROBED_CAPABILITY` · `VISUALLY_HIDDEN` ·
`SceneQualityContext` · `RenderHandleContext`.

Types: `QualityTier` · `GpuTier` · `WebglSupport` · `DeviceCapability` ·
`CapabilityOptions` · `WebglProbe` · `SceneBudget` · `SceneStats` · `BudgetReport` ·
`BudgetViolation` · `SceneMotionSettings` · `OrbitDelta` · `SceneFallbackReason` ·
`RenderHandle` · `SceneQualityValue` · `OnDemandRenderControls` · `CanvasComponent` ·
`CanvasLikeProps` · `RootStateLike` · `PeerStatus`, plus the props interfaces.

There is no `loadThree`: code that builds geometry imports `three` directly rather than
through an untyped record.

## SCENE_BUDGETS, verbatim

`QualityTier` is `'none' | 'low' | 'medium' | 'high'`. `none` exists so lookups are total.

| metric | none | low | medium | high |
|---|---|---|---|---|
| `drawCalls` | 0 | 40 | 90 | 150 |
| `triangles` | 0 | 120,000 | 500,000 | 1,500,000 |
| `textureMemoryMiB` | 0 | 32 | 96 | 256 |
| `maxTextureSize` | 512 | 1024 | 2048 | 4096 |
| `transferBytes` | 0 | 1,500,000 | 4,000,000 | 8,000,000 |
| `lights` | 0 | 2 | 3 | 4 |
| `shadowCasters` | 0 | 0 | 1 | 2 |
| `postProcessingPasses` | 0 | 0 | 1 | 3 |
| `dpr` | [1, 1] | [0.75, 1] | [1, 1.5] | [1, 2] |
| `frameBudgetMs` | 0 | 16.7 | 16.7 | 16.7 |

Notes the source states explicitly:

- **`dpr` below 1 on low is deliberate.** Rendering at 0.75x and letting the browser upscale
  is the single most effective lever on a fill-rate-bound phone, and at phone pixel densities
  it is very hard to see.
- **`dpr` stops at 2 even on a 3x display.** Pixel count grows quadratically for a difference
  almost nobody resolves.
- **`shadowCasters: 0` on low is not an oversight.** Each caster is an extra full render of
  the scene from that light, so the draw-call budget is spent twice.
- **`transferBytes` is compressed, over the wire.** `textureMemoryMiB` is decompressed and
  resident. They differ by more than an order of magnitude and only one of them runs out.
- **`frameBudgetMs` is 16.7 as a default, not a truth.** `frameBudgetForRefreshRate(hz)`
  returns `1000 / hz`; a scene holding 60 fps on a 120 Hz panel drops every other frame and
  reads as judder rather than slowness.

## Checking a scene against a budget

```ts
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
```

`SceneStats` field names line up with a WebGL renderer's own `info` object, so wiring it up
is copying numbers rather than instrumenting anything. Every field is optional; partial
measurements still check. It returns a report rather than throwing, because the useful callers
are a dev overlay and a CI step and both want every problem at once.

`textureMemoryMiB(width, height, { bytesPerPixel = 4, mipmaps = true })` multiplies by 4/3
for a full mip chain. 2048² RGBA = 16 MiB base, 21.33 MiB with mipmaps. Four 4K maps with
mipmaps are ~340 MiB and exceed even the `high` budget by a third.

## How a tier is chosen

`assessDeviceCapability(options)` reads every signal and returns `DeviceCapability`:
`webgl` · `gpu` · `renderer` · `deviceMemory` · `cores` · `prefersReducedMotion` ·
`saveData` · `effectiveConnection` · `coarsePointer` · `pixelRatio` · `recommended` ·
`probed`.

`recommendQuality` applies hard vetoes first, each returning `none` on its own:

1. `webgl === 'none'` — no context, or a privacy extension blocking it.
2. `gpu === 'software'` — SwiftShader, llvmpipe, softpipe, Microsoft Basic Render. The scene
   would "work" at single-digit fps.
3. `saveData` (when `saveDataBlocks`, default `true`) — the only signal here that is an
   explicit user instruction rather than an inference.
4. `prefersReducedMotion` **only if** `reducedMotionBlocks` is passed — default
   `false`, and it should usually stay false: the preference is about movement, not rendering.
5. `effectiveConnection` of `2g` or `slow-2g`.

Then a score starting at 0:

| signal | delta |
|---|---|
| `gpu: 'high'` / `'medium'` / `'low'` | +2 / +1 / −2 |
| `webgl: 'webgl1'` | −1 |
| `deviceMemory` ≤2 / ≤4 / ≥8 GiB | −2 / −1 / +1 |
| `cores` ≤2 / ≤4 / ≥8 | −2 / −1 / +1 |
| `coarsePointer` | −1 |
| `effectiveConnection: '3g'` | −1 |

Score ≥2 → `high`; ≤−2 → `low`; otherwise `medium`. Clamped by `maxQuality`
(default `high`) and floored by `minQuality` (default `low`).

`coarsePointer` is −1 for thermal reasons, not GPU power: a modern phone renders the high
tier for ninety seconds and then throttles, which the user experiences as the page getting
worse the longer they read.

`classifyGpu` matches a lowercased renderer string; unrecognised returns
`'unknown'`, which scores 0 and lands in `medium`. That direction is deliberate — treating an
unrecognised GPU as slow punishes every device released after the pattern list was edited,
and Firefox and Safari commonly withhold the string entirely.

## The probe costs a context, once

`probeWebgl()` creates a throwaway context, reads `WEBGL_debug_renderer_info`, then calls
`loseContext()` and caches the result for the document's lifetime. That cleanup is not
tidiness: browsers cap live WebGL contexts per document (~16 in Chromium, fewer elsewhere) and
evict the **oldest** when the cap is hit, so a probe that leaks a context per mount eventually
blanks the application's real canvas with what looks like a driver bug.

`failIfMajorPerformanceCaveat` is deliberately not set — it rejects contexts on usable
machines with unusual drivers, and a false negative costs a user the whole experience.

`UNPROBED_CAPABILITY` is the frozen pre-probe answer shared by the server render and the
first client render: `probed: false`, `recommended: 'none'`, and
`prefersReducedMotion: true`. Gate on `probed`, never on `typeof window`.
`useSceneViability` returns `null` while unknown rather than `false`, because collapsing
the two makes every scene flash its fallback for a frame.

## The guard, once the scene is live

The probe measures a cool, idle, plugged-in device and is regularly wrong in one direction.
`PerformanceGuard` watches with `requestAnimationFrame` against the document's own frame
clock — the honest measurement, since it includes everything competing for the main thread.

Defaults: `slowFrameMs: 25` (deliberate slack over 16.7, or the guard fires on hardware that
is coping), `windowSize: 60`, `degradeAfter: 2`, `floor: 'low'`. It uses the **median** of
the window, not the mean, so one GC pause or route transition cannot trigger a drop. Deltas
≥300 ms are discarded as a backgrounded tab rather than a slow frame. The first second after
mount, and after any degrade, is ignored: that window measures shader compilation and texture
upload, the most expensive and least representative moment in the scene's life.

**Quality is never raised again.** Restoring detail produces visible oscillation, and the usual
cause of sustained slow frames is thermal throttling, which does not reverse while the page
keeps rendering — so raising quality would throttle again and loop for as long as the user
stays. One-way degradation is the design.

`useSceneQuality()` inside the scene reads `{ quality, budget, setQuality, degrade,
degraded }` and does not throw outside a provider; it falls back to `medium`, because a mesh
that cannot read its detail level has a reasonable thing to do and crashing the tree over a
decorative detail is out of proportion.
