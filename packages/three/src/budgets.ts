// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Performance budgets for 3D on the web.
 *
 * These numbers exist because "it runs fine on my machine" is the single most expensive
 * sentence in real-time web graphics. The machine in question is a development laptop,
 * plugged in, on a fast connection, with the scene already warm in cache. The median device
 * loading a marketing page with a 3D hero is a mid-range Android phone on a shared network,
 * and it is thermally throttled within two minutes.
 *
 * A budget is not a target to hit; it is a line that, once crossed, means the scene needs
 * fewer things in it rather than a faster device. The figures below are conservative on
 * purpose, and they are stated per quality tier so that a scene can be authored once and
 * shed detail rather than being authored twice.
 *
 * All of it is plain data. Nothing here imports three, so a build step, a CI check or an
 * agent reasoning about a scene can consume the same numbers the runtime does.
 */

import type { QualityTier } from './capability.js'

/** A per-tier ceiling on what a scene may contain. */
export interface SceneBudget {
  /**
   * Draw calls per frame.
   *
   * The most reliably misjudged number in the list. Each call carries fixed CPU cost for
   * state validation, and on mobile the driver overhead dominates long before the GPU is
   * troubled — which is why a scene of two hundred trivial cubes stutters while a single
   * hundred-thousand-triangle mesh does not. Merge geometry and instance repeats before
   * reaching for a cheaper shader.
   */
  drawCalls: number
  /**
   * Rendered triangles per frame.
   *
   * Generous relative to the draw-call figure, deliberately: modern GPUs eat triangles.
   * Exceeding this usually indicates an unoptimised export straight from a DCC tool rather
   * than a scene that genuinely needs the density.
   */
  triangles: number
  /**
   * Resident texture memory in mebibytes, decompressed.
   *
   * The figure that actually crashes phones. A 2048x2048 RGBA texture is 16 MiB in VRAM
   * regardless of the fact that its PNG was 400 KiB on the wire, and mipmaps add a third
   * again. Budget against the uploaded size, never the download size — the two differ by
   * more than an order of magnitude and only one of them is what runs out.
   */
  textureMemoryMiB: number
  /** Largest permitted texture dimension. Beyond this, halve it; nobody will notice. */
  maxTextureSize: 512 | 1024 | 2048 | 4096
  /**
   * Total transferred bytes for the 3D payload: renderer, models, textures, environment
   * maps. Measured compressed, over the wire, because that is what the user waits for.
   */
  transferBytes: number
  /** Real-time lights. Each one multiplies shader cost across every lit material. */
  lights: number
  /**
   * Shadow-casting lights. Zero on the low tier is not an oversight.
   *
   * Every shadow-casting light is an extra full render of the scene from that light's point
   * of view, which means the draw-call budget above is being spent twice. Baked shadows in
   * a texture cost nothing per frame and look better than the low-resolution shadow maps a
   * phone can afford.
   */
  shadowCasters: number
  /** Post-processing passes. Each is a full-screen read and write at device resolution. */
  postProcessingPasses: number
  /** The device-pixel-ratio range to hand the renderer, as `[min, max]`. */
  dpr: readonly [number, number]
  /** Target frame budget in milliseconds — the wall clock a single frame may occupy. */
  frameBudgetMs: number
}

/**
 * The budgets themselves.
 *
 * `none` is included rather than omitted so that lookups are total and callers never have
 * to handle a missing tier. All of its values are zero, which reads correctly: the budget
 * for a scene you are not rendering is nothing.
 */
export const SCENE_BUDGETS: Readonly<Record<QualityTier, SceneBudget>> = Object.freeze({
  none: Object.freeze({
    drawCalls: 0,
    triangles: 0,
    textureMemoryMiB: 0,
    maxTextureSize: 512,
    transferBytes: 0,
    lights: 0,
    shadowCasters: 0,
    postProcessingPasses: 0,
    dpr: Object.freeze([1, 1] as const),
    frameBudgetMs: 0,
  }),
  low: Object.freeze({
    drawCalls: 40,
    triangles: 120_000,
    textureMemoryMiB: 32,
    maxTextureSize: 1024,
    // Roughly one and a half megabytes. On a 3G-class connection that is already several
    // seconds of waiting for something the user did not ask for.
    transferBytes: 1_500_000,
    lights: 2,
    shadowCasters: 0,
    postProcessingPasses: 0,
    // Capped below 1 on purpose: rendering at 0.75x and letting the browser upscale is the
    // single most effective lever on a fill-rate-bound phone, and at typical phone pixel
    // densities it is very hard to see.
    dpr: Object.freeze([0.75, 1] as const),
    frameBudgetMs: 16.7,
  }),
  medium: Object.freeze({
    drawCalls: 90,
    triangles: 500_000,
    textureMemoryMiB: 96,
    maxTextureSize: 2048,
    transferBytes: 4_000_000,
    lights: 3,
    shadowCasters: 1,
    postProcessingPasses: 1,
    dpr: Object.freeze([1, 1.5] as const),
    frameBudgetMs: 16.7,
  }),
  high: Object.freeze({
    drawCalls: 150,
    triangles: 1_500_000,
    textureMemoryMiB: 256,
    maxTextureSize: 4096,
    transferBytes: 8_000_000,
    lights: 4,
    shadowCasters: 2,
    postProcessingPasses: 3,
    // Stopping at 2 even on a 3x display is a deliberate ceiling. Beyond 2x the pixel count
    // grows quadratically for a difference almost nobody can resolve, and it is the fastest
    // way to turn a comfortable desktop scene into a fan-spinning one.
    dpr: Object.freeze([1, 2] as const),
    frameBudgetMs: 16.7,
  }),
})

/** Look up the budget for a tier. Total by construction; never returns undefined. */
export function budgetFor(tier: QualityTier): SceneBudget {
  return SCENE_BUDGETS[tier]
}

/**
 * What a scene actually contains, as measured at runtime.
 *
 * The field names line up with what a WebGL renderer's own info object reports, so wiring
 * this up is a matter of copying numbers across rather than instrumenting anything. Every
 * field is optional because partial measurements are still worth checking.
 */
export interface SceneStats {
  drawCalls?: number
  triangles?: number
  textureMemoryMiB?: number
  transferBytes?: number
  lights?: number
  shadowCasters?: number
  postProcessingPasses?: number
}

/** One budget line that a scene exceeded. */
export interface BudgetViolation {
  /** Which budget was exceeded. */
  metric: keyof SceneStats
  /** The measured value. */
  actual: number
  /** The ceiling for the tier being checked. */
  budget: number
  /** How far over, as a multiple. 1.5 means fifty per cent over budget. */
  overBy: number
  /** A sentence suitable for a build log or a review comment. */
  message: string
}

/** The outcome of {@link checkSceneBudget}. */
export interface BudgetReport {
  tier: QualityTier
  withinBudget: boolean
  violations: readonly BudgetViolation[]
}

const METRIC_LABELS: Readonly<Record<keyof SceneStats, string>> = {
  drawCalls: 'draw calls',
  triangles: 'triangles',
  textureMemoryMiB: 'MiB of texture memory',
  transferBytes: 'bytes transferred',
  lights: 'real-time lights',
  shadowCasters: 'shadow-casting lights',
  postProcessingPasses: 'post-processing passes',
}

/**
 * Check measured scene statistics against a tier's budget.
 *
 * Returns a report rather than throwing, because the useful place to call this is a
 * development overlay or a CI step, and both want the full list of problems at once. A
 * check that throws on the first violation turns budget work into a game of whack-a-mole.
 */
export function checkSceneBudget(stats: SceneStats, tier: QualityTier): BudgetReport {
  const budget = budgetFor(tier)
  const violations: BudgetViolation[] = []

  const compare = (metric: keyof SceneStats, actual: number | undefined, limit: number): void => {
    if (actual === undefined) return
    if (actual <= limit) return
    // A zero limit cannot produce a meaningful ratio; report it as infinitely over, which
    // is what "you rendered something in a scene budgeted at nothing" means.
    const overBy = limit === 0 ? Number.POSITIVE_INFINITY : actual / limit
    violations.push({
      metric,
      actual,
      budget: limit,
      overBy,
      message: `${METRIC_LABELS[metric]}: ${actual} against a ${tier}-tier budget of ${limit}.`,
    })
  }

  compare('drawCalls', stats.drawCalls, budget.drawCalls)
  compare('triangles', stats.triangles, budget.triangles)
  compare('textureMemoryMiB', stats.textureMemoryMiB, budget.textureMemoryMiB)
  compare('transferBytes', stats.transferBytes, budget.transferBytes)
  compare('lights', stats.lights, budget.lights)
  compare('shadowCasters', stats.shadowCasters, budget.shadowCasters)
  compare('postProcessingPasses', stats.postProcessingPasses, budget.postProcessingPasses)

  return { tier, withinBudget: violations.length === 0, violations }
}

/**
 * Uploaded size of a texture in mebibytes, mipmaps included.
 *
 * Provided because the arithmetic is the part people skip. A designer hands over a set of
 * 4K maps, the compressed download looks harmless, and the page then tries to resident
 * several hundred megabytes on a phone with a fraction of that available to the GPU
 * process. The multiplier for a full mip chain is 4/3.
 */
export function textureMemoryMiB(
  width: number,
  height: number,
  options: { bytesPerPixel?: number; mipmaps?: boolean } = {},
): number {
  const { bytesPerPixel = 4, mipmaps = true } = options
  const base = width * height * bytesPerPixel
  const total = mipmaps ? base * (4 / 3) : base
  return total / (1024 * 1024)
}

/**
 * The largest frame time that still counts as smooth, for a given refresh rate.
 *
 * Worth computing rather than hard-coding 16.7: 120Hz displays are common now, and a scene
 * that comfortably holds 60fps on one of them is dropping every other frame, which reads as
 * judder rather than as slowness and is much harder to diagnose by eye.
 */
export function frameBudgetForRefreshRate(hz: number): number {
  return hz > 0 ? 1000 / hz : 16.7
}
