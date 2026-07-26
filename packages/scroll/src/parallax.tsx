'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { useReducedMotion } from '@vishwakarma/motion'
import type { CSSProperties, ElementType, ReactNode, Ref } from 'react'
import type { Axis, ScrollRangeInput } from './geometry.js'
import { PROGRESS_PROPERTY } from './styles.js'
import { useComposedRef } from './use-composed-ref.js'
import { useProgressBinding } from './use-progress-binding.js'

/**
 * Parallax that moves an element and nothing else.
 *
 * The whole effect is one `translate3d` driven by a single number. It touches no property
 * that can trigger layout or paint, so the element is composited and the cost per frame is
 * constant regardless of what is inside it. Implementations that animate `top`, `background-
 * position` or `margin` do the same thing visually and force a layout or a repaint of the
 * whole layer on every frame, which is why parallax has a reputation for jank it does not
 * inherently deserve.
 *
 * Displacement is capped. See {@link MAX_PARALLAX_DISTANCE}.
 *
 * Reduced motion switches the effect off completely rather than shortening it. Parallax is
 * the archetypal vestibular trigger: content moving at a different rate from the scroll is
 * exactly the depth cue that provokes discomfort, and there is no small amount of it that is
 * meaningfully safer. When it is off, no transform is applied at all — not a transform
 * evaluating to zero — so the element occupies precisely its layout box.
 *
 * A note on layout, because it is the part that is usually got wrong: an element displaced
 * by ±d pixels needs 2d pixels of slack, or it will expose a gap at one end of its travel.
 * For a full-bleed image, make the image `calc(100% + 2 * d)` tall, offset it by `-d`, and
 * give the container `overflow: hidden`. This component moves the element; it cannot know
 * how much room you meant to leave for it.
 */

/**
 * The largest displacement this component will apply, in pixels.
 *
 * 120px is not a performance limit — the transform costs the same at any magnitude. It is a
 * legibility one. Past roughly this much travel the element stops reading as a background
 * plane at a different depth and starts reading as an unrelated object sliding across the
 * page; the offset also becomes large enough to overlap neighbouring content at small
 * viewport heights, and large enough that the relative motion is uncomfortable for a
 * noticeable share of readers even when they have expressed no preference. Larger values are
 * clamped rather than rejected, so a design that asks for more degrades instead of breaking.
 */
export const MAX_PARALLAX_DISTANCE = 120

export interface ParallaxProps {
  children?: ReactNode
  /** Element to render. Defaults to a div. */
  as?: ElementType
  /**
   * Peak displacement in pixels, in each direction. Defaults to 40.
   *
   * The element travels from `+distance` to `-distance` across the range, so the total
   * travel is twice this. Clamped to {@link MAX_PARALLAX_DISTANCE}.
   */
  distance?: number
  /**
   * Which way the element drifts relative to the page as it crosses the viewport.
   *
   * `up` (the default) makes it appear to move faster than the scroll, which reads as being
   * nearer the reader. `down` makes it appear slower and therefore further away.
   */
  direction?: 'up' | 'down'
  /** The span over which the travel happens. Defaults to `cover`. */
  range?: ScrollRangeInput
  /** Axis to measure along. Defaults to `y`. */
  axis?: Axis
  /** Turn the effect off explicitly. Reduced motion does this for you. */
  disabled?: boolean
  className?: string
  style?: CSSProperties
  /** CSP nonce for the stylesheet injected on the native path. */
  nonce?: string
  ref?: Ref<HTMLElement>
}

/** Displace an element as it crosses the viewport. */
export function Parallax({
  children,
  as: Component = 'div',
  distance = 40,
  direction = 'up',
  range = 'cover',
  axis = 'y',
  disabled = false,
  className,
  style,
  nonce,
  ref: externalRef,
}: ParallaxProps): ReactNode {
  const prefersReduced = useReducedMotion()
  const off = disabled || prefersReduced

  const [ref, setRef] = useComposedRef<HTMLElement>(externalRef)

  const binding = useProgressBinding(ref, {
    range,
    axis,
    native: true,
    disabled: off,
    nonce,
  })

  const clamped = Math.min(Math.abs(distance), MAX_PARALLAX_DISTANCE)
  const span = (direction === 'up' ? -2 : 2) * clamped

  // Centred on the midpoint of the range so the element sits at its true layout position
  // when it is in the middle of the viewport, which is where the reader is most likely to be
  // looking at it, and so the displacement is symmetric rather than accumulating downwards.
  const shift = `calc((var(${PROGRESS_PROPERTY}) - 0.5) * ${span}px)`
  const translate = axis === 'y' ? `translate3d(0, ${shift}, 0)` : `translate3d(${shift}, 0, 0)`

  const motionStyle: CSSProperties = off
    ? {}
    : {
        transform: translate,
        // The element is already promoted by the 3D transform; declaring it keeps the layer
        // stable across the driver switch. It is a memory cost proportional to the element's
        // painted size, which is why this component is for a handful of large elements and
        // not for every card in a grid.
        willChange: 'transform',
      }

  return (
    <Component
      ref={setRef}
      className={className}
      style={{ ...style, ...motionStyle, ...binding.style }}
      {...binding.attributes}
    >
      {children}
    </Component>
  )
}
