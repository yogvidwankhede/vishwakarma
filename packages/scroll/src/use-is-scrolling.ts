'use client'

import { useEffect, useState } from 'react'
import { subscribeToScroll } from './ticker.js'

/**
 * Whether the page is currently being scrolled.
 *
 * Mostly used to suspend work that would compete with the scroll: pausing an expensive
 * canvas, dropping to a cheaper image, deferring a fetch. It is a poor tool for hiding
 * interface chrome, because "not scrolling" arrives on a timer and anything that appears on
 * that timer appears at a moment the user did not ask for.
 *
 * The rising edge comes from an actual change in scroll offset rather than from the arrival
 * of a scroll event. Scroll events also fire when a nested container scrolls to the same
 * position, when the browser adjusts for a resize, and repeatedly at either end of a
 * rubber-band overscroll — all of which would otherwise register as scrolling while the page
 * sits still.
 *
 * The falling edge prefers the `scrollend` event, which the browser fires once momentum has
 * genuinely finished. A timeout is kept as a backstop, because `scrollend` is not universal
 * and because a scroll cancelled by a touch that never becomes a drag does not always
 * produce one. The timeout is deliberately the fallback rather than the primary: it fires
 * during a slow momentum tail, so a timeout-only implementation reports "stopped" while the
 * page is still visibly moving.
 */

export interface IsScrollingOptions {
  /**
   * Milliseconds of stillness before scrolling is considered finished. Defaults to 140.
   *
   * Only used where `scrollend` is unavailable, or as a backstop if it never arrives.
   */
  idleDelay?: number
  /** Stop watching. Reports `false`. */
  disabled?: boolean
}

/** Track whether the page is being scrolled right now. */
export function useIsScrolling(options: IsScrollingOptions = {}): boolean {
  const { idleDelay = 140, disabled = false } = options

  const [scrolling, setScrolling] = useState(false)

  useEffect(() => {
    if (disabled) {
      setScrolling(false)
      return
    }

    let previousY: number | null = null
    let previousX: number | null = null
    let moved = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const stop = (): void => {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      setScrolling(false)
    }

    const unsubscribe = subscribeToScroll({
      measure(frame) {
        moved = frame.y !== previousY || frame.x !== previousX
        // Seed on the first frame rather than reporting movement: subscribing schedules a
        // pass immediately, and comparing against `null` would make every mount look like
        // the start of a scroll.
        if (previousY === null) moved = false
        previousY = frame.y
        previousX = frame.x
      },
      commit() {
        if (!moved) return
        setScrolling(true)
        if (timer !== undefined) clearTimeout(timer)
        timer = setTimeout(stop, idleDelay)
      },
    })

    const supportsScrollEnd = typeof window !== 'undefined' && 'onscrollend' in window
    if (supportsScrollEnd) {
      window.addEventListener('scrollend', stop, { passive: true, capture: true })
    }

    return () => {
      unsubscribe()
      if (supportsScrollEnd) window.removeEventListener('scrollend', stop, { capture: true })
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [idleDelay, disabled])

  return scrolling
}
