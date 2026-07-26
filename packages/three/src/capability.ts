// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Device capability probing, kept deliberately free of React and of three.
 *
 * Everything here runs before a single byte of the 3D bundle has been fetched. That is the
 * whole point: the decision "should this device get a 3D scene at all" has to be answerable
 * without loading the thing being decided about, otherwise the decision has already cost
 * the user the download it was meant to avoid.
 *
 * Every signal below is a hint, and most of them are absent on some real browser. The
 * classifier is therefore built to degrade towards the middle rather than towards the
 * bottom: an unknown GPU is not a bad GPU, it is usually Safari or Firefox declining to
 * answer for fingerprinting reasons, and treating silence as failure would ship the
 * fallback to a large share of perfectly capable machines.
 */

/** How much scene a device should be asked to render. `none` means: do not load 3D at all. */
export type QualityTier = 'none' | 'low' | 'medium' | 'high'

/** Coarse GPU class inferred from the unmasked renderer string. */
export type GpuTier = 'unknown' | 'software' | 'low' | 'medium' | 'high'

/** Which WebGL version the device actually granted us. */
export type WebglSupport = 'none' | 'webgl1' | 'webgl2'

/** Ordered weakest to strongest, so tiers can be compared numerically. */
const TIER_ORDER: readonly QualityTier[] = ['none', 'low', 'medium', 'high']

/**
 * Compare two quality tiers.
 *
 * Returns a negative number when `a` is weaker than `b`, zero when equal, positive when
 * stronger — the same contract as an `Array#sort` comparator.
 */
export function compareQuality(a: QualityTier, b: QualityTier): number {
  return TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b)
}

/** The weaker of two tiers. Used wherever two independent signals both get a veto. */
export function minQuality(a: QualityTier, b: QualityTier): QualityTier {
  return compareQuality(a, b) <= 0 ? a : b
}

/**
 * Step a tier down by one.
 *
 * `none` is the floor, and stepping down from `low` lands on `none` rather than looping —
 * a guard that keeps dropping quality has to be able to reach "stop rendering entirely",
 * because on a genuinely overwhelmed device the cheapest scene is still too expensive.
 */
export function degradeQuality(tier: QualityTier): QualityTier {
  const index = TIER_ORDER.indexOf(tier)
  return TIER_ORDER[Math.max(0, index - 1)] ?? 'none'
}

/** Everything we managed to learn about the device. */
export interface DeviceCapability {
  /** WebGL version obtained, or `none` if a context could not be created. */
  webgl: WebglSupport
  /** GPU class inferred from the renderer string, or `unknown` when the browser withholds it. */
  gpu: GpuTier
  /** The raw unmasked renderer string, when the browser provides one. Useful for logging. */
  renderer: string | null
  /**
   * `navigator.deviceMemory` in GiB, when exposed.
   *
   * Chromium-only, and deliberately quantised and capped at 8 for privacy, so a value of 8
   * means "8 or more" and must never be read as an exact figure.
   */
  deviceMemory: number | null
  /** `navigator.hardwareConcurrency`, when exposed. A weak proxy, but free. */
  cores: number | null
  /** Whether the user has asked the operating system for reduced motion. */
  prefersReducedMotion: boolean
  /** Whether the user has switched on data saving. An explicit request to stop downloading. */
  saveData: boolean
  /** The Network Information API's effective connection class, when exposed. */
  effectiveConnection: '2g' | '3g' | '4g' | 'slow-2g' | null
  /** Whether the primary pointer is coarse. Correlates with mobile thermal limits. */
  coarsePointer: boolean
  /** Device pixel ratio at the moment of probing. */
  pixelRatio: number
  /** The tier we recommend rendering at. */
  recommended: QualityTier
  /**
   * `false` before the probe has run — during server rendering and on the first client
   * render. Gate the decision to load a 3D bundle on this, never on `typeof window`.
   */
  probed: boolean
}

/**
 * Renderer-string heuristics.
 *
 * These patterns are matched against a lowercased renderer string and are, unavoidably, a
 * moving target: vendors rename parts, browsers reformat the string, and new hardware
 * arrives constantly. The list is therefore ordered so that the confident cases (software
 * rasterisers, integrated Intel parts, known-fast desktop and Apple silicon) match first
 * and everything else falls through to `unknown` — which resolves to the middle tier, not
 * the bottom. Treating an unrecognised GPU as slow would have punished every new device
 * released after this file was last edited.
 */
const GPU_PATTERNS: readonly { pattern: RegExp; tier: GpuTier }[] = [
  // Software rasterisers. A scene will "work" and run at single-digit frames per second,
  // which is the one case where refusing to render is unambiguously the kinder answer.
  { pattern: /swiftshader|llvmpipe|softpipe|software|microsoft basic render/, tier: 'software' },
  // Apple silicon, desktop and recent mobile. The GPU is not the bottleneck on these.
  { pattern: /apple m\d/, tier: 'high' },
  { pattern: /apple a1[5-9]|apple a[2-9]\d/, tier: 'high' },
  { pattern: /apple a1[1-4]/, tier: 'medium' },
  // Discrete desktop parts.
  { pattern: /rtx\s?[2-9]\d{3}|radeon rx [5-9]\d{3}/, tier: 'high' },
  { pattern: /gtx\s?1[0-9]{3}|radeon rx [45]\d{2}/, tier: 'medium' },
  // Intel integrated. Iris Xe and later are genuinely mid-range; older HD/UHD parts are not.
  { pattern: /iris xe|arc a\d/, tier: 'medium' },
  { pattern: /intel.*(uhd|hd graphics|gma)/, tier: 'low' },
  // Mobile. Adreno 6xx and Mali-G7x are the point at which a modest scene holds 60fps.
  { pattern: /adreno.*7\d{2}|adreno.*[89]\d{2}/, tier: 'high' },
  { pattern: /adreno.*6\d{2}|mali-g7[0-9]|mali-g[89]\d/, tier: 'medium' },
  { pattern: /adreno.*[2-5]\d{2}|mali-[tg][0-6]|powervr/, tier: 'low' },
]

/**
 * Classify a GPU from its renderer string.
 *
 * Exported because it is worth testing directly, and because applications occasionally need
 * to apply their own overrides for hardware they have measured themselves. Pass the raw
 * string; casing and surrounding vendor decoration are handled here.
 */
export function classifyGpu(renderer: string | null | undefined): GpuTier {
  if (!renderer) return 'unknown'
  const normalised = renderer.toLowerCase()
  for (const entry of GPU_PATTERNS) {
    if (entry.pattern.test(normalised)) return entry.tier
  }
  return 'unknown'
}

/** Result of the one-off WebGL probe. */
export interface WebglProbe {
  support: WebglSupport
  renderer: string | null
}

let cachedProbe: WebglProbe | null = null

/**
 * Create a throwaway context, ask it what it is, and destroy it immediately.
 *
 * The `loseContext` call at the end is not tidiness. Browsers cap the number of live WebGL
 * contexts per document — the limit is around sixteen in Chromium and lower elsewhere — and
 * they evict the *oldest* context when the cap is hit. A probe that leaks its context on
 * every mount will therefore, eventually, cause the application's real canvas to go blank
 * mid-session with a context-lost event that looks like a driver bug. It is not a driver
 * bug; it is this function, written carelessly.
 *
 * The result is cached for the lifetime of the document because the answer cannot change,
 * and because doing this once is already one context more than we would like.
 */
export function probeWebgl(): WebglProbe {
  if (cachedProbe) return cachedProbe
  if (typeof document === 'undefined') return { support: 'none', renderer: null }

  const result: WebglProbe = { support: 'none', renderer: null }

  try {
    const canvas = document.createElement('canvas')
    // `failIfMajorPerformanceCaveat` is deliberately *not* set. It is the obvious way to
    // detect software rendering, but it also rejects contexts on perfectly usable machines
    // with an unusual driver, and a false negative here costs a user the entire experience.
    // The renderer string catches the software case with fewer casualties.
    const attributes: WebGLContextAttributes = { antialias: false, depth: false, alpha: true }

    const gl2 = canvas.getContext('webgl2', attributes)
    const gl = gl2 ?? canvas.getContext('webgl', attributes)

    if (gl) {
      result.support = gl2 ? 'webgl2' : 'webgl1'

      // WEBGL_debug_renderer_info is unavailable in Firefox by default and returns a
      // generic string in Safari. Absence is expected, not exceptional.
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        const raw: unknown = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        if (typeof raw === 'string' && raw.length > 0) result.renderer = raw
      }
      if (!result.renderer) {
        const raw: unknown = gl.getParameter(gl.RENDERER)
        if (typeof raw === 'string' && raw.length > 0) result.renderer = raw
      }

      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  } catch {
    // A thrown getContext means blocked WebGL — some privacy extensions and locked-down
    // enterprise builds do exactly this. `none` is the correct reading.
  }

  cachedProbe = result
  return result
}

/** Shapes for the browser APIs that TypeScript's DOM library does not yet describe. */
interface NavigatorConnection {
  saveData?: boolean
  effectiveType?: string
}
interface ExtendedNavigator extends Navigator {
  deviceMemory?: number
  connection?: NavigatorConnection
}

function readNavigator(): ExtendedNavigator | null {
  if (typeof navigator === 'undefined') return null
  return navigator as ExtendedNavigator
}

function matches(query: string): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    return window.matchMedia(query).matches
  } catch {
    return false
  }
}

/**
 * The answer before anything has been measured.
 *
 * Shared between the server render and the first client render, and frozen so the two are
 * literally the same object. That identity matters: React hooks below use it as their
 * initial state, and a fresh object per render would make every downstream `useMemo` and
 * `useEffect` fire on every render for a value that has not changed.
 *
 * `prefersReducedMotion` is `true` here for the same reason the motion package assumes it —
 * guessing wrong towards calm costs a user one missed animation, guessing wrong the other
 * way hits somebody with a vestibular disorder with movement they explicitly disabled.
 */
export const UNPROBED_CAPABILITY: DeviceCapability = Object.freeze({
  webgl: 'none',
  gpu: 'unknown',
  renderer: null,
  deviceMemory: null,
  cores: null,
  prefersReducedMotion: true,
  saveData: false,
  effectiveConnection: null,
  coarsePointer: false,
  pixelRatio: 1,
  recommended: 'none',
  probed: false,
})

/**
 * Options for {@link assessDeviceCapability}, all of which exist to let an application
 * overrule the heuristics with something it knows better.
 */
export interface CapabilityOptions {
  /** Never recommend above this tier. Use to cap a scene you know is expensive. */
  maxQuality?: QualityTier
  /** Never recommend below this tier, short of WebGL being genuinely unavailable. */
  minQuality?: QualityTier
  /**
   * Whether a reduced-motion preference should block 3D entirely.
   *
   * Off by default, and it should usually stay off: the preference is about *movement*, not
   * about rendering. A still 3D scene with autorotation frozen honours it completely, and
   * downgrading such a user to a flat image treats an accessibility setting as a punishment.
   * Turn it on only when the scene's content is inherently motion — a particle field, a
   * continuous camera fly-through — and cannot be made still without becoming pointless.
   */
  reducedMotionBlocks?: boolean
  /**
   * Whether data-saver mode should block 3D. On by default.
   *
   * Save-Data is the one signal in this file that is an explicit user instruction rather
   * than an inference, so it gets the strongest treatment.
   */
  saveDataBlocks?: boolean
}

/**
 * Read every available signal and recommend a tier.
 *
 * Safe to call during server rendering: it returns `probed: false` and a `none`
 * recommendation, which is the correct server answer because the server genuinely does not
 * know and shipping a canvas on a guess is how 3D ends up on the critical rendering path.
 */
export function assessDeviceCapability(options: CapabilityOptions = {}): DeviceCapability {
  const {
    maxQuality = 'high',
    minQuality: floor = 'low',
    reducedMotionBlocks = false,
    saveDataBlocks = true,
  } = options

  if (typeof window === 'undefined') return UNPROBED_CAPABILITY

  const probe = probeWebgl()
  const nav = readNavigator()
  const connection = nav?.connection
  const effective = connection?.effectiveType
  const effectiveConnection =
    effective === '2g' || effective === '3g' || effective === '4g' || effective === 'slow-2g'
      ? effective
      : null

  const capability: DeviceCapability = {
    webgl: probe.support,
    gpu: classifyGpu(probe.renderer),
    renderer: probe.renderer,
    deviceMemory: typeof nav?.deviceMemory === 'number' ? nav.deviceMemory : null,
    cores: typeof nav?.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
    prefersReducedMotion: matches('(prefers-reduced-motion: reduce)'),
    saveData: connection?.saveData === true,
    effectiveConnection,
    coarsePointer: matches('(pointer: coarse)'),
    pixelRatio: typeof window.devicePixelRatio === 'number' ? window.devicePixelRatio : 1,
    recommended: 'none',
    probed: true,
  }

  capability.recommended = recommendQuality(capability, {
    maxQuality,
    minQuality: floor,
    reducedMotionBlocks,
    saveDataBlocks,
  })

  return capability
}

/**
 * Turn a set of signals into a tier.
 *
 * Split out from the probing so it can be unit-tested against fabricated devices, which is
 * the only practical way to verify a heuristic like this — you cannot keep a drawer of
 * 2017 Android phones in CI.
 *
 * The structure is: hard vetoes first, then a score, then the clamps. A veto is a signal
 * that means "no 3D" on its own regardless of how strong the rest of the device is; a
 * powerful laptop on a metered tethered connection with Save-Data on is still a device
 * whose owner has asked us not to download six megabytes of geometry.
 */
export function recommendQuality(
  capability: Pick<
    DeviceCapability,
    | 'webgl'
    | 'gpu'
    | 'deviceMemory'
    | 'cores'
    | 'prefersReducedMotion'
    | 'saveData'
    | 'effectiveConnection'
    | 'coarsePointer'
  >,
  options: CapabilityOptions = {},
): QualityTier {
  const {
    maxQuality = 'high',
    minQuality: floor = 'low',
    reducedMotionBlocks = false,
    saveDataBlocks = true,
  } = options

  if (capability.webgl === 'none') return 'none'
  if (capability.gpu === 'software') return 'none'
  if (saveDataBlocks && capability.saveData) return 'none'
  if (reducedMotionBlocks && capability.prefersReducedMotion) return 'none'
  if (capability.effectiveConnection === '2g' || capability.effectiveConnection === 'slow-2g') {
    return 'none'
  }

  // Start from the middle. Every adjustment below is evidence-driven; with no evidence at
  // all — Safari, no device memory, no renderer string — the answer stays in the middle,
  // which is where an unknown device belongs.
  let score = 0

  if (capability.gpu === 'high') score += 2
  else if (capability.gpu === 'medium') score += 1
  else if (capability.gpu === 'low') score -= 2

  // WebGL 1 in 2020s browsers usually means a constrained or emulated stack. It is not
  // disqualifying, but it is not encouraging either.
  if (capability.webgl === 'webgl1') score -= 1

  if (capability.deviceMemory !== null) {
    if (capability.deviceMemory <= 2) score -= 2
    else if (capability.deviceMemory <= 4) score -= 1
    else if (capability.deviceMemory >= 8) score += 1
  }

  if (capability.cores !== null) {
    if (capability.cores <= 2) score -= 2
    else if (capability.cores <= 4) score -= 1
    else if (capability.cores >= 8) score += 1
  }

  // Not a proxy for GPU power — modern phones are fast — but for the thermal and battery
  // envelope. A phone that can render the high tier will do so for ninety seconds and then
  // throttle, and the user experiences that as the page getting worse the longer they read.
  if (capability.coarsePointer) score -= 1

  if (capability.effectiveConnection === '3g') score -= 1

  const scored: QualityTier = score >= 2 ? 'high' : score <= -2 ? 'low' : 'medium'

  const clamped = minQuality(scored, maxQuality)
  return compareQuality(clamped, floor) < 0 ? floor : clamped
}

/**
 * Reset the cached WebGL probe.
 *
 * Only useful in tests, where each case needs a clean document. Calling it in application
 * code will cost another WebGL context, which is the thing {@link probeWebgl} exists to
 * ration.
 */
export function resetCapabilityCache(): void {
  cachedProbe = null
}
