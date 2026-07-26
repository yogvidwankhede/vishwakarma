'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { type CSSProperties, type RefObject, useEffect, useMemo, useRef } from 'react'
import {
  type Axis,
  clamp01,
  nativeRangeFor,
  progressWithin,
  resolveScrollRange,
  type ScrollRangeInput,
  scrollSpanFor,
} from './geometry.js'
import { NATIVE_ATTRIBUTE, PROGRESS_PROPERTY, useScrollStyles } from './styles.js'
import { useScrollTimelineSupport } from './supports.js'
import { subscribeToScroll } from './ticker.js'

/**
 * The shared engine behind every scroll-linked component in this package.
 *
 * It writes one number, as a CSS custom property, on one element. Everything else —
 * parallax, pinning, the progress bar — is CSS reading that number. Keeping the JavaScript
 * surface down to a single property write is what makes the native upgrade possible at all:
 * a binding that computed transforms in JavaScript could never be replaced by a CSS
 * timeline, whereas a binding that only sets a number can be, transparently.
 *
 * It also means progress never passes through React state on the hot path. A `setState` per
 * scroll frame re-renders a subtree sixty times a second to change one number that React
 * does not need to know; writing the property directly leaves React entirely out of the
 * loop, and the component re-renders only when its props change.
 */

/** Which mechanism is currently driving the property. */
export type ProgressDriver =
  /** A CSS scroll-driven animation. Off the main thread, cannot lag behind scroll. */
  | 'native'
  /** A rAF-throttled measurement in JavaScript. */
  | 'script'
  /** Nothing is driving it; the property keeps its initial value of 0. */
  | 'static'

export interface ProgressBindingOptions {
  /**
   * Whether progress tracks this element through the viewport, or the document as a whole.
   * Defaults to `element`.
   */
  source?: 'element' | 'page'
  /** The span over which progress runs 0..1. Defaults to `cover`. */
  range?: ScrollRangeInput
  /** Axis to measure along. Defaults to `y`. */
  axis?: Axis
  /**
   * The custom property to write. Defaults to `--vk-scroll-progress`.
   *
   * Naming a different property forces the scripted path: the native path animates a
   * property that has been registered with a `<number>` syntax, and only the default one is
   * registered by this package.
   */
  property?: string
  /** Opt out of the native path even where it is supported. */
  native?: boolean
  /** Stop driving the property entirely. The property reverts to its initial value. */
  disabled?: boolean
  /**
   * Called on the frames where progress changes.
   *
   * Runs in the commit phase, so it may write to the DOM but must not measure it. Held in a
   * ref, so an inline arrow function does not resubscribe the binding every render.
   */
  onProgress?: (progress: number) => void
  /** CSP nonce for the runtime-injected stylesheet on the native path. */
  nonce?: string
}

/** What the binding needs the component to render. */
export interface ProgressBinding {
  /** Which mechanism ended up driving the property. */
  driver: ProgressDriver
  /** Styles to spread onto the bound element. Empty unless the driver is native. */
  style: CSSProperties
  /** Attributes to spread onto the bound element. Empty unless the driver is native. */
  attributes: Record<string, string>
}

const EMPTY_ATTRIBUTES: Record<string, string> = {}

/**
 * Bind a CSS custom property on `ref` to scroll progress.
 *
 * The element must be the subject of its own range: the native path uses `view()`, which
 * takes the element it is declared on as the subject, and the scripted path measures the
 * same element. Keeping both on one element is what guarantees they agree.
 */
export function useProgressBinding<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: ProgressBindingOptions = {},
): ProgressBinding {
  const {
    source = 'element',
    range = 'cover',
    axis = 'y',
    property = PROGRESS_PROPERTY,
    native = true,
    disabled = false,
    onProgress,
    nonce,
  } = options

  const supported = useScrollTimelineSupport()

  const nativeRange = source === 'page' ? 'page' : nativeRangeFor(range)

  const driver: ProgressDriver = disabled
    ? 'static'
    : supported && native && property === PROGRESS_PROPERTY && nativeRange !== null
      ? 'native'
      : 'script'

  useScrollStyles(driver === 'native', nonce)

  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  // A range given as an object literal is a new identity on every render, so the effect keys
  // off its contents rather than its reference. Without this the binding tears itself down
  // and rebuilds once per render, which is invisible until you profile it.
  const resolved = resolveScrollRange(range)
  const rangeKey = JSON.stringify(resolved)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rangeKey stands in for resolved, deliberately.
  useEffect(() => {
    if (driver !== 'script') return

    const element = ref.current
    if (source === 'element' && !element) return
    // The page-sourced binding still writes to an element; it just does not measure one.
    const target = element
    if (!target) return

    let next = 0
    let written = -1

    const unsubscribe = subscribeToScroll({
      measure(frame) {
        const viewport = axis === 'y' ? frame.viewportHeight : frame.viewportWidth
        const scroll = axis === 'y' ? frame.y : frame.x

        if (source === 'page') {
          const scrollable = (axis === 'y' ? frame.scrollHeight : frame.scrollWidth) - viewport
          next = scrollable > 0 ? clamp01(scroll / scrollable) : 0
          return
        }

        // The one `getBoundingClientRect` in this package, and it is here rather than in a
        // scroll handler on purpose: at the top of a rAF callback the layout tree is clean,
        // so the read is a lookup rather than a forced reflow, and no write has happened yet
        // this frame to dirty it.
        const rect = target.getBoundingClientRect()
        const leading = axis === 'y' ? rect.top : rect.left
        const size = axis === 'y' ? rect.height : rect.width

        next = progressWithin(
          scroll,
          scrollSpanFor({ offset: leading + scroll, size, viewport }, resolved),
        )
      },
      commit() {
        if (next === written) return
        written = next
        target.style.setProperty(property, next.toFixed(5))
        onProgressRef.current?.(next)
      },
    })

    return () => {
      unsubscribe()
      target.style.removeProperty(property)
    }
  }, [driver, source, axis, property, rangeKey, ref])

  const style = useMemo<CSSProperties>(() => {
    if (driver !== 'native') return {}

    const timeline =
      source === 'page'
        ? `scroll(root ${axis === 'y' ? 'block' : 'inline'})`
        : `view(${axis === 'y' ? 'block' : 'inline'})`

    // `animationTimeline` and `animationRange` are recent additions to the CSSOM and are not
    // in every version of the DOM typings this package might be compiled against, so the
    // style object is built untyped and asserted once here rather than being spread with a
    // cast at each call site.
    const declarations: Record<string, string> = { animationTimeline: timeline }
    if (nativeRange !== null && nativeRange !== 'page') declarations.animationRange = nativeRange

    return declarations as CSSProperties
  }, [driver, source, axis, nativeRange])

  return {
    driver,
    style,
    attributes: driver === 'native' ? { [NATIVE_ATTRIBUTE]: '' } : EMPTY_ATTRIBUTES,
  }
}
