'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { type RefObject, useEffect, useRef, useState } from 'react'
import {
  type Axis,
  clamp01,
  progressWithin,
  quantise,
  resolveScrollRange,
  type ScrollRangeInput,
  scrollSpanFor,
} from './geometry.js'
import { subscribeToScroll } from './ticker.js'

/**
 * Scroll progress as a number in React state.
 *
 * Use this when the value has to reach JavaScript — a counter, a label, a decision about
 * which slide is showing. When the value only ever reaches CSS, prefer `ScrollLinked` or
 * `useProgressBinding`, which write a custom property and never re-render.
 *
 * The value is derived, every frame, from the current scroll offset and the element's
 * current position. It is never integrated from scroll deltas. The consequences of that
 * choice are spelled out in `geometry.ts`, but the short version is that this hook gives the
 * same answer whether the user scrolled there slowly, flung there, jumped there from a
 * fragment link, or reloaded the page at that offset — and a delta-accumulating
 * implementation is correct in only the first of those four cases.
 */

export interface ScrollProgressOptions {
  /** The span over which progress runs 0..1. Defaults to `cover`. */
  range?: ScrollRangeInput
  /** Axis to measure along. Defaults to `y`. */
  axis?: Axis
  /**
   * Rounding applied before the value is committed to state, as a fraction of the range.
   *
   * Defaults to 0.005, which is 200 distinct values across the span — finer than a reader
   * can perceive in a number, and two hundred renders rather than one per frame. Set it to 0
   * for the raw value if you are feeding something that genuinely needs full precision, and
   * accept the render cost knowingly.
   */
  step?: number
  /** Stop tracking. Progress freezes at its last value. */
  disabled?: boolean
}

/** What {@link useScrollProgress} returns. */
export interface ScrollProgressResult<T extends HTMLElement> {
  /** Attach to the element whose passage through the viewport is being measured. */
  ref: RefObject<T | null>
  /** Current progress, 0..1, quantised by `step`. */
  progress: number
}

/**
 * Track an element's progress through the viewport.
 *
 * ```tsx
 * const { ref, progress } = useScrollProgress<HTMLDivElement>({ range: 'contain' })
 * return <div ref={ref}>{Math.round(progress * 100)}%</div>
 * ```
 */
export function useScrollProgress<T extends HTMLElement = HTMLElement>(
  options: ScrollProgressOptions = {},
): ScrollProgressResult<T> {
  const { range = 'cover', axis = 'y', step = 0.005, disabled = false } = options

  const ref = useRef<T | null>(null)
  const [progress, setProgress] = useState(0)

  const resolved = resolveScrollRange(range)
  const rangeKey = JSON.stringify(resolved)

  // The effect keys off the serialised range rather than the object, so a caller passing an
  // object literal inline does not tear the subscription down on every render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rangeKey stands in for resolved, deliberately.
  useEffect(() => {
    if (disabled) return
    const element = ref.current
    if (!element) return

    let next = 0
    let committed = -1

    const unsubscribe = subscribeToScroll({
      measure(frame) {
        const viewport = axis === 'y' ? frame.viewportHeight : frame.viewportWidth
        const scroll = axis === 'y' ? frame.y : frame.x
        const rect = element.getBoundingClientRect()
        const leading = axis === 'y' ? rect.top : rect.left
        const size = axis === 'y' ? rect.height : rect.width

        const raw = progressWithin(
          scroll,
          scrollSpanFor({ offset: leading + scroll, size, viewport }, resolved),
        )
        next = quantise(raw, step)
      },
      commit() {
        if (next === committed) return
        committed = next
        setProgress(next)
      },
    })

    return unsubscribe
  }, [axis, step, disabled, rangeKey])

  return { ref, progress }
}

export interface PageScrollProgressOptions {
  /** Axis to measure along. Defaults to `y`. */
  axis?: Axis
  /** Rounding applied before committing to state. Defaults to 0.005. */
  step?: number
  /** Stop tracking. */
  disabled?: boolean
}

/**
 * Progress through the whole document, 0 at the top and 1 when the last pixel is on screen.
 *
 * The denominator is the scrollable distance, not the document height — those differ by one
 * viewport, and using the document height is the reason so many progress bars stop at around
 * ninety percent on a short page and never reach the end.
 *
 * A document shorter than the viewport has nothing to scroll and reports 0 rather than
 * dividing by zero. That is the honest answer: there is no progress to make.
 */
export function usePageScrollProgress(options: PageScrollProgressOptions = {}): number {
  const { axis = 'y', step = 0.005, disabled = false } = options

  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (disabled) return

    let next = 0
    let committed = -1

    const unsubscribe = subscribeToScroll({
      measure(frame) {
        const viewport = axis === 'y' ? frame.viewportHeight : frame.viewportWidth
        const scroll = axis === 'y' ? frame.y : frame.x
        const scrollable = (axis === 'y' ? frame.scrollHeight : frame.scrollWidth) - viewport
        next = quantise(scrollable > 0 ? clamp01(scroll / scrollable) : 0, step)
      },
      commit() {
        if (next === committed) return
        committed = next
        setProgress(next)
      },
    })

    return unsubscribe
  }, [axis, step, disabled])

  return progress
}
