'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties, ElementType, ReactNode, Ref } from 'react'
import type { Axis, ScrollRangeInput } from './geometry.js'
import { PROGRESS_PROPERTY } from './styles.js'
import { useComposedRef } from './use-composed-ref.js'
import { useProgressBinding } from './use-progress-binding.js'

/**
 * Publish scroll progress as a CSS custom property, and let CSS do the animation.
 *
 * This is the primitive the rest of the package is built from, and the one to reach for
 * before writing anything bespoke. The component does not animate anything itself. It sets
 * `--vk-scroll-progress` to a number between 0 and 1 on its own element, where the property
 * inherits, so any descendant can be styled against it in a plain stylesheet:
 *
 * ```css
 * .caption {
 *   opacity: var(--vk-scroll-progress);
 *   translate: 0 calc((1 - var(--vk-scroll-progress)) * 2rem);
 * }
 * ```
 *
 * Splitting it this way buys three things. The animation lives in CSS, so it can be
 * responsive, themed, and overridden by a cascade layer without the component knowing. The
 * value is a single number, so where the browser supports scroll-driven animations the whole
 * binding is replaced by a `view()` timeline and JavaScript stops being involved at all —
 * the component checks for support and switches, with no change to the CSS. And nothing
 * re-renders: the property is written directly to the node, never through React state.
 *
 * The failure mode is deliberately mild. If JavaScript never runs and the browser has no
 * scroll timelines, the property keeps the initial value of 0 it was registered with, so a
 * declaration reading it stays valid and the element renders in its starting state rather
 * than losing the declaration entirely. Author the starting state as something readable —
 * an element that starts at `opacity: 0` will be invisible in that case, for the same
 * reason and with the same remedy as a scroll reveal.
 */

export interface ScrollLinkedProps {
  children?: ReactNode
  /** Element to render. Defaults to a div. */
  as?: ElementType
  /**
   * Whether progress measures this element's passage through the viewport, or the whole
   * document's scroll. Defaults to `element`.
   */
  source?: 'element' | 'page'
  /** The span over which progress runs 0..1. Defaults to `cover`. */
  range?: ScrollRangeInput
  /** Axis to measure along. Defaults to `y`. */
  axis?: Axis
  /**
   * The custom property to write. Defaults to `--vk-scroll-progress`.
   *
   * Use a different name to run two independent ranges over the same subtree. Doing so opts
   * out of the native path, because only the default property is registered as a number, and
   * an unregistered property cannot be interpolated by a scroll timeline.
   */
  property?: string
  /** Opt out of CSS scroll-driven animation even where it is supported. */
  native?: boolean
  /** Stop driving the property. It reverts to 0. */
  disabled?: boolean
  /** Notified when progress changes. Prefer styling against the property where you can. */
  onProgress?: (progress: number) => void
  className?: string
  style?: CSSProperties
  /** CSP nonce for the stylesheet injected on the native path. */
  nonce?: string
  ref?: Ref<HTMLElement>
}

/** Drive a CSS custom property from scroll position. */
export function ScrollLinked({
  children,
  as: Component = 'div',
  source = 'element',
  range = 'cover',
  axis = 'y',
  property = PROGRESS_PROPERTY,
  native = true,
  disabled = false,
  onProgress,
  className,
  style,
  nonce,
  ref: externalRef,
}: ScrollLinkedProps): ReactNode {
  const [ref, setRef] = useComposedRef<HTMLElement>(externalRef)

  const binding = useProgressBinding(ref, {
    source,
    range,
    axis,
    property,
    native,
    disabled,
    onProgress,
    nonce,
  })

  return (
    <Component
      ref={setRef}
      className={className}
      style={{ ...style, ...binding.style }}
      {...binding.attributes}
    >
      {children}
    </Component>
  )
}
