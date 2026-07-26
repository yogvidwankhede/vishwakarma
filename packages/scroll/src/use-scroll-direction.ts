'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react'
import type { Axis } from './geometry.js'
import { subscribeToScroll } from './ticker.js'

/**
 * Which way the user is scrolling, with enough hysteresis to be usable.
 *
 * The naive version compares this frame's offset with the last frame's and reports the sign.
 * It is unusable for its most common purpose — hiding a sticky header on the way down and
 * bringing it back on the way up — because real scrolling is not monotonic. A trackpad
 * flick, the rubber-band at the end of a momentum scroll on macOS and iOS, and the tiny
 * reverse jitter at the end of a swipe all produce single frames of opposite sign, and a
 * header driven by that flaps in and out several times per gesture.
 *
 * So the direction only changes when the user has moved a real distance against it. The
 * furthest point reached in the current direction is remembered, and reversal requires
 * `threshold` pixels back from that point rather than from the previous frame. Continuing in
 * the same direction merely advances the extreme, so a long scroll never accumulates a debt
 * that would delay the eventual reversal.
 */

/** Direction of travel. `none` until the user has moved past the threshold at least once. */
export type ScrollDirection = 'up' | 'down' | 'none'

export interface ScrollDirectionOptions {
  /**
   * Distance in pixels that must be travelled against the current direction before it flips.
   *
   * Defaults to 8, which clears momentum jitter without feeling unresponsive. Raise it for
   * something expensive to toggle, such as a header that changes the page's layout height.
   */
  threshold?: number
  /** Axis to watch. Defaults to `y`. */
  axis?: Axis
  /** Stop watching. The last reported direction is retained. */
  disabled?: boolean
}

/**
 * Track scroll direction.
 *
 * ```tsx
 * const direction = useScrollDirection({ threshold: 12 })
 * <header data-hidden={direction === 'down' || undefined}>…</header>
 * ```
 *
 * If you use this to hide something, hide it with `transform` rather than by removing it
 * from the flow: a header that unmounts takes the focused element with it, and a header that
 * changes the document height while the user is scrolling causes the content beneath it to
 * shift under their eyes.
 */
export function useScrollDirection(options: ScrollDirectionOptions = {}): ScrollDirection {
  const { threshold = 8, axis = 'y', disabled = false } = options

  const [direction, setDirection] = useState<ScrollDirection>('none')

  useEffect(() => {
    if (disabled) return

    let current: ScrollDirection = 'none'
    let extreme: number | null = null
    let next: ScrollDirection = 'none'

    const unsubscribe = subscribeToScroll({
      measure(frame) {
        const position = axis === 'y' ? frame.y : frame.x

        if (extreme === null) {
          extreme = position
          return
        }

        if (current === 'down') {
          if (position > extreme) extreme = position
          else if (extreme - position > threshold) {
            current = 'up'
            extreme = position
          }
        } else if (current === 'up') {
          if (position < extreme) extreme = position
          else if (position - extreme > threshold) {
            current = 'down'
            extreme = position
          }
        } else {
          const delta = position - extreme
          if (Math.abs(delta) > threshold) {
            current = delta > 0 ? 'down' : 'up'
            extreme = position
          }
        }

        next = current
      },
      commit() {
        setDirection((previous) => (previous === next ? previous : next))
      },
    })

    return unsubscribe
  }, [threshold, axis, disabled])

  return direction
}
