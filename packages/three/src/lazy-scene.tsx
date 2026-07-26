'use client'

import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { DeviceCapability, QualityTier } from './capability.js'
import type { SceneFallbackReason } from './scene-fallback.js'
import { type UseDeviceCapabilityOptions, useDeviceCapability } from './use-device-capability.js'

/**
 * Load a 3D scene only once it is both wanted and affordable.
 *
 * Two gates, and both must open. The scene has to be near the viewport, and the device has
 * to have passed the capability check. Neither alone is sufficient: a capable device still
 * should not download six megabytes for a scene four screens down, and a scene in view on a
 * device that cannot render it is worse than one that never arrives.
 *
 * The gate that gets argued about is the first one, on a hero. The argument runs: the hero
 * is the first thing on the page, so it is by definition in the viewport, so lazy-loading
 * it achieves nothing. The premise is right and the conclusion is wrong, and the reason is
 * the largest contentful paint.
 *
 * A 3D hero is on the critical path in the worst possible way. The renderer, the scene
 * graph, the models and the textures are megabytes of JavaScript and binary that must be
 * fetched, parsed, compiled, uploaded to the GPU and drawn before anything appears — and
 * while that happens the browser is contending for the same main thread that hydration,
 * fonts and the actual text of the page need. The measured result is consistent: seconds
 * added to the largest paint, interaction delayed, and a layout shift when the canvas
 * finally takes its space. No amount of visual quality compensates for a page where the
 * headline arrives four seconds late, because the user who left at two seconds never saw
 * the scene either. A 3D hero that blocks the largest paint is a net loss however good it
 * looks.
 *
 * So the correct arrangement for a hero is: ship the still composition as the real content,
 * let it be the largest paint, and upgrade to the scene afterwards. That is what this
 * component does when `eager` is set — it skips the viewport gate but keeps everything
 * else, including the fallback owning the layout until the moment the scene can replace it.
 */

/** Fallback content, or a function that builds it from the reason it is being shown. */
export type SceneFallbackRenderer = ReactNode | ((reason: SceneFallbackReason) => ReactNode)

export interface LazySceneProps {
  /**
   * The scene. Normally an {@link AdaptiveCanvas}.
   *
   * Pass a function to defer building the element tree as well as mounting it. Worth doing
   * when constructing the children is itself expensive — a large procedural scene graph, or
   * anything that reads from a store during render.
   */
  children: ReactNode | (() => ReactNode)
  /** The static alternative. Occupies the space until the scene is mounted, and after any failure. */
  fallback: SceneFallbackRenderer
  /**
   * Distance from the viewport at which loading begins.
   *
   * Generous by default. The scene needs to be fetched, parsed and compiled before it can
   * paint, so starting at the moment it becomes visible guarantees the user watches the
   * fallback swap out mid-scroll. Starting a viewport-and-a-bit early usually means the
   * transition has already happened by the time they arrive.
   */
  rootMargin?: string
  /** Proportion of the container that must be visible to count. */
  threshold?: number
  /**
   * Skip the viewport gate and load as soon as the capability check passes.
   *
   * For content above the fold. Read the note above first: this still defers the scene past
   * first paint, which is the point.
   */
  eager?: boolean
  /** Options forwarded to the capability probe. */
  capability?: UseDeviceCapabilityOptions
  /**
   * Cap the tier for this scene specifically.
   *
   * Useful when one scene on a page is much heavier than the others and the device-wide
   * assessment is too optimistic for it.
   */
  maxQuality?: QualityTier
  /**
   * Reserved aspect ratio for the container.
   *
   * Set it. Without it the container has no height until the scene mounts, so the page
   * reflows around it twice — once when the fallback loads and once when the canvas
   * appears — and both count against cumulative layout shift.
   */
  aspectRatio?: string
  /** Called once, when both gates have opened and the scene is about to mount. */
  onActivate?: (capability: DeviceCapability) => void
  /** Called when the capability check rejects the device, so the outcome can be recorded. */
  onDecline?: (capability: DeviceCapability) => void
  className?: string
  style?: CSSProperties
}

function resolveFallback(fallback: SceneFallbackRenderer, reason: SceneFallbackReason): ReactNode {
  return typeof fallback === 'function' ? fallback(reason) : fallback
}

/**
 * Whether an element is near enough to the viewport to be worth preparing for.
 *
 * Exported because the same gate is useful for non-3D payloads — a video, a map, a heavy
 * chart — and because the observer bookkeeping is the part that is easy to get wrong.
 * Latches to `true` and disconnects: this answers "has it ever been near", not "is it near
 * now", because unloading a scene the moment it scrolls away would make scrolling back a
 * second full download.
 */
export function useNearViewport(
  ref: RefObject<Element | null>,
  options: { rootMargin?: string; threshold?: number; enabled?: boolean } = {},
): boolean {
  const { rootMargin = '150% 0px', threshold = 0, enabled = true } = options
  const [near, setNear] = useState(false)

  useEffect(() => {
    if (!enabled || near) return
    const element = ref.current
    if (!element) return

    // No observer means no gate. Loading immediately is the right degradation: the browsers
    // without IntersectionObserver are old enough that they were never getting the scene
    // anyway, and the capability check will turn them away a moment later.
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setNear(true)
            observer.disconnect()
            return
          }
        }
      },
      { rootMargin, threshold },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, rootMargin, threshold, enabled, near])

  return near
}

/**
 * Gate a 3D scene on viewport proximity and device capability.
 *
 * Always renders its container, whatever the outcome. The container is what holds the space
 * and what the observer watches, so a version that returned the fallback alone would have
 * nothing to observe and would never open the first gate — which is the bug this shape
 * exists to avoid.
 */
export function LazyScene({
  children,
  fallback,
  rootMargin = '150% 0px',
  threshold = 0,
  eager = false,
  capability: capabilityOptions,
  maxQuality,
  aspectRatio,
  onActivate,
  onDecline,
  className,
  style,
}: LazySceneProps): ReactNode {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const notified = useRef<'none' | 'activated' | 'declined'>('none')

  const near = useNearViewport(containerRef, { rootMargin, threshold, enabled: !eager })
  const capability = useDeviceCapability({
    ...capabilityOptions,
    ...(maxQuality ? { maxQuality } : {}),
  })

  const inRange = eager || near
  const viable = capability.probed && capability.recommended !== 'none'
  const active = inRange && viable

  useEffect(() => {
    if (!capability.probed) return
    if (active && notified.current !== 'activated') {
      notified.current = 'activated'
      onActivate?.(capability)
      return
    }
    // Only report a decline once the probe has run and the device was the reason — being
    // out of range is not a decline, and reporting it as one would make the analytics say
    // that most visitors' devices failed when in fact most visitors never scrolled that far.
    if (!viable && notified.current !== 'declined') {
      notified.current = 'declined'
      onDecline?.(capability)
    }
  }, [active, viable, capability, onActivate, onDecline])

  const reason: SceneFallbackReason = !capability.probed
    ? 'loading'
    : !viable
      ? capability.saveData
        ? 'declined'
        : 'unsupported'
      : 'offscreen'

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        ...(aspectRatio ? { aspectRatio } : {}),
        ...style,
      }}
    >
      {active
        ? typeof children === 'function'
          ? children()
          : children
        : resolveFallback(fallback, reason)}
    </div>
  )
}
