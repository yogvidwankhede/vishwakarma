'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  type CapabilityOptions,
  type DeviceCapability,
  type QualityTier,
  UNPROBED_CAPABILITY,
  assessDeviceCapability,
} from './capability.js'

/**
 * Ask the device what it can handle.
 *
 * The probe runs in an effect rather than during render, and that ordering is the whole
 * design. Creating a WebGL context is not free — it initialises a driver connection, and on
 * some Android devices that alone costs tens of milliseconds on the main thread. Doing it
 * during render puts that cost between the user and their first paint, in service of a
 * decision about content that is, by definition, not the most important thing on the page.
 * So the first render always reports `probed: false` and a `none` recommendation, and the
 * real answer arrives one frame later.
 *
 * The consequence for callers is that a scene never appears synchronously on mount, and
 * that is correct. It also means the server and the first client render agree exactly,
 * which is the difference between a working component and a hydration mismatch.
 */
export interface UseDeviceCapabilityOptions extends CapabilityOptions {
  /**
   * Skip the probe entirely and keep reporting the unprobed answer.
   *
   * Useful when a scene is behind an interaction the user has not performed yet: there is
   * no point spending a WebGL context on a dialog nobody has opened.
   */
  enabled?: boolean
}

/**
 * Probe the device and return what it can be asked to render.
 *
 * Options are read by value, not by identity, so passing a fresh object literal every
 * render is safe — the common mistake with hooks that take a configuration object is that
 * the object triggers the effect it configures, and re-probing WebGL on every render would
 * exhaust the document's context budget within seconds.
 */
export function useDeviceCapability(options: UseDeviceCapabilityOptions = {}): DeviceCapability {
  const { enabled = true, maxQuality, minQuality, reducedMotionBlocks, saveDataBlocks } = options
  const [capability, setCapability] = useState<DeviceCapability>(UNPROBED_CAPABILITY)

  useEffect(() => {
    if (!enabled) {
      setCapability(UNPROBED_CAPABILITY)
      return
    }

    let cancelled = false
    const assess = (): void => {
      if (cancelled) return
      setCapability(
        assessDeviceCapability({ maxQuality, minQuality, reducedMotionBlocks, saveDataBlocks }),
      )
    }

    // Deferred to idle time where the browser offers it. The answer is not needed this
    // frame — nothing can be rendered from it until the 3D bundle has loaded anyway — and
    // holding the main thread during hydration to ask about a GPU is a poor trade.
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(assess, { timeout: 500 })
      return () => {
        cancelled = true
        cancelIdleCallback(handle)
      }
    }

    const handle = setTimeout(assess, 0)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [enabled, maxQuality, minQuality, reducedMotionBlocks, saveDataBlocks])

  // Re-evaluate when the reduced-motion preference changes mid-session. Rare, but people
  // do toggle it precisely because a page is moving too much, and a scene that ignores the
  // change is the scene they were reacting to.
  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined' || !window.matchMedia) return

    const list = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (): void => {
      setCapability(
        assessDeviceCapability({ maxQuality, minQuality, reducedMotionBlocks, saveDataBlocks }),
      )
    }
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [enabled, maxQuality, minQuality, reducedMotionBlocks, saveDataBlocks])

  return capability
}

/**
 * Just the recommended tier, for callers that do not care why.
 *
 * Kept separate so that a component switching on the tier does not re-render every time an
 * unrelated field of the capability object is refreshed.
 */
export function useRecommendedQuality(options: UseDeviceCapabilityOptions = {}): QualityTier {
  const capability = useDeviceCapability(options)
  return capability.recommended
}

/**
 * Whether it is worth loading a 3D bundle at all.
 *
 * Returns `null` while the answer is still unknown, rather than `false`. The distinction is
 * load-bearing: `false` means "this device should see the fallback", `null` means "do not
 * commit to anything yet", and collapsing the two makes every scene flash its fallback for
 * a frame before deciding it was capable after all.
 */
export function useSceneViability(options: UseDeviceCapabilityOptions = {}): boolean | null {
  const capability = useDeviceCapability(options)
  return useMemo(() => {
    if (!capability.probed) return null
    return capability.recommended !== 'none'
  }, [capability.probed, capability.recommended])
}
