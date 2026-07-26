'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { budgetFor } from './budgets.js'
import { degradeQuality, type QualityTier } from './capability.js'
import { SceneQualityContext, type SceneQualityValue } from './scene-runtime.js'

/**
 * Watch how long frames are taking and give up detail when they take too long.
 *
 * The capability check picks a tier before the scene exists, from signals that are proxies
 * at best. It is regularly wrong, and it is wrong in a specific direction: a device is
 * assessed while cool, idle and plugged in, and then renders for two minutes and throttles.
 * A phone that opened the scene at a solid sixty frames a second is a different machine by
 * the time the user has finished reading the paragraph beside it.
 *
 * Two decisions shape the implementation, and both exist to avoid making things worse.
 *
 * The first is the median. A mean over a window of frames is dominated by the outliers —
 * one garbage collection, one route transition, one background tab waking up — and reacting
 * to those means dropping quality because of something that had nothing to do with the
 * scene. The median of a window of frames only moves when frames are *consistently* slow,
 * which is the only condition worth acting on.
 *
 * The second, and the one people argue with: quality is never raised again. It would be
 * easy to restore detail once frames recover, and the result is a scene that visibly
 * oscillates — shadows appearing and disappearing, resolution stepping up and down — which
 * is far more distracting than simply sitting at the lower setting. It is also usually
 * wrong on the merits: the common cause of sustained slow frames is thermal throttling, and
 * that does not reverse while the page is still rendering. Restoring quality would raise the
 * load, trigger throttling again, and the loop would run for as long as the user stayed.
 * One-way degradation is the design, not a missing feature.
 */

/** Ring buffer for frame deltas. Fixed size, no allocation per frame. */
class FrameWindow {
  private readonly samples: number[]
  private index = 0
  private filled = 0

  constructor(size: number) {
    this.samples = new Array<number>(size).fill(0)
  }

  push(delta: number): void {
    this.samples[this.index] = delta
    this.index = (this.index + 1) % this.samples.length
    if (this.filled < this.samples.length) this.filled += 1
  }

  get full(): boolean {
    return this.filled === this.samples.length
  }

  reset(): void {
    this.index = 0
    this.filled = 0
  }

  /** Median of the window, or 0 when it is not yet full. */
  median(): number {
    if (this.filled === 0) return 0
    const sorted = this.samples.slice(0, this.filled).sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    if (sorted.length % 2 === 1) return sorted[middle] ?? 0
    const lower = sorted[middle - 1] ?? 0
    const upper = sorted[middle] ?? 0
    return (lower + upper) / 2
  }
}

export interface PerformanceGuardProps {
  children: ReactNode
  /**
   * The tier to start at, normally the one {@link useDeviceCapability} recommended.
   *
   * Changing it resets the guard, including any degradation it had already applied — which
   * is what you want when the scene itself changes, and is a bug if the value is a fresh
   * object or a recomputed tier on every render.
   */
  quality: QualityTier
  /** Never degrade below this. Defaults to `low`, so the guard will not switch 3D off. */
  floor?: QualityTier
  /**
   * Frame time in milliseconds above which a frame counts as slow.
   *
   * Defaults to 25ms rather than the 16.7ms of a sixty-hertz frame. The gap is deliberate
   * slack: a scene that occasionally touches 20ms is fine, and a guard set exactly at the
   * refresh interval fires constantly on hardware that is coping.
   */
  slowFrameMs?: number
  /** Frames per measurement window. */
  windowSize?: number
  /**
   * Consecutive slow windows before quality drops.
   *
   * Two by default. One window is enough to catch a genuinely overloaded device but also
   * enough to catch the frames right after mount, when shaders are compiling and textures
   * are uploading — the single most expensive moment in the scene's life and the least
   * representative of it.
   */
  degradeAfter?: number
  /** Turn measurement off. The tier is still provided; nothing is watched. */
  enabled?: boolean
  /** Called whenever the tier changes, with the old and new values. */
  onDegrade?: (next: QualityTier, previous: QualityTier) => void
  /** Called once per completed window with its median frame time. Useful for overlays. */
  onSample?: (medianMs: number) => void
}

/**
 * Provide a quality tier to the scene below, and lower it when frames get expensive.
 *
 * Render this *outside* the canvas. Frame timing is measured with `requestAnimationFrame`
 * against the document's own frame clock, which is the honest measurement: it includes
 * everything competing for the main thread, not just the renderer's slice of it. A scene
 * that renders in four milliseconds inside a page whose frames take forty is still a scene
 * the user experiences as broken, and measuring only the renderer would report it as
 * perfectly healthy.
 */
export function PerformanceGuard({
  children,
  quality,
  floor = 'low',
  slowFrameMs = 25,
  windowSize = 60,
  degradeAfter = 2,
  enabled = true,
  onDegrade,
  onSample,
}: PerformanceGuardProps): ReactNode {
  const [tier, setTier] = useState<QualityTier>(quality)
  const [degraded, setDegraded] = useState(false)
  const tierRef = useRef(tier)
  tierRef.current = tier

  // Callbacks live in a ref so the measurement effect does not restart every time a parent
  // re-renders with a fresh inline function. Restarting it would discard the window and the
  // guard would never accumulate enough consecutive evidence to act.
  const callbacks = useRef({ onDegrade, onSample })
  callbacks.current = { onDegrade, onSample }

  // Adopt a new starting tier, and forget any degradation, when the caller changes it.
  useEffect(() => {
    setTier(quality)
    setDegraded(false)
  }, [quality])

  // Written against the ref rather than inside a state updater. An updater must be pure —
  // React is free to call it twice — and notifying `onDegrade` from inside one would fire
  // the application's callback twice for a single drop in StrictMode, which is exactly the
  // kind of bug that only appears in development and gets "fixed" by disabling StrictMode.
  const degrade = useCallback(() => {
    const current = tierRef.current
    const next = degradeQuality(current)
    // `degradeQuality` can reach `none`; the floor is what stops it there. Without this
    // clamp a guard on a struggling device eventually removes the scene entirely, which is
    // a legitimate configuration but a poor default — the user is left looking at a blank
    // space where something was a moment ago.
    const clamped = rankOf(next) < rankOf(floor) ? floor : next
    if (clamped === current) return

    tierRef.current = clamped
    setTier(clamped)
    setDegraded(true)
    callbacks.current.onDegrade?.(clamped, current)
  }, [floor])

  useEffect(() => {
    if (!enabled) return
    if (typeof requestAnimationFrame !== 'function') return

    const frames = new FrameWindow(windowSize)
    let slowWindows = 0
    let previous = performance.now()
    let raf = 0
    // Frames are ignored until this timestamp. Used to skip the mount storm and to let a
    // freshly lowered tier settle before judging it.
    let ignoreUntil = previous + 1000

    const tick = (now: number): void => {
      const delta = now - previous
      previous = now

      // A gap of a third of a second is not a slow frame, it is a backgrounded tab, a
      // blocking dialog, or the machine going to sleep. Counting it would let a laptop lid
      // closing for lunch permanently degrade the scene.
      if (now >= ignoreUntil && delta < 300) {
        frames.push(delta)

        if (frames.full) {
          const median = frames.median()
          callbacks.current.onSample?.(median)
          frames.reset()

          if (median > slowFrameMs) {
            slowWindows += 1
            if (slowWindows >= degradeAfter) {
              slowWindows = 0
              degrade()
              // Give the new tier a second of grace. Judging it immediately would measure
              // the cost of tearing down and rebuilding the render targets rather than the
              // cost of the scene, and would chain straight into another degradation.
              ignoreUntil = now + 1000
            }
          } else {
            // Reset on any healthy window: the count is for *consecutive* trouble.
            slowWindows = 0
          }
        }
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, windowSize, slowFrameMs, degradeAfter, degrade])

  const setQuality = useCallback((next: QualityTier) => {
    setTier(next)
  }, [])

  const value = useMemo<SceneQualityValue>(
    () => ({
      quality: tier,
      budget: budgetFor(tier),
      setQuality,
      degrade,
      degraded,
    }),
    [tier, setQuality, degrade, degraded],
  )

  return <SceneQualityContext.Provider value={value}>{children}</SceneQualityContext.Provider>
}

const RANK: Readonly<Record<QualityTier, number>> = { none: 0, low: 1, medium: 2, high: 3 }

function rankOf(tier: QualityTier): number {
  return RANK[tier]
}
