'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { type CSSProperties, type ReactNode, type Ref, useRef } from 'react'
import { PROGRESS_PROPERTY } from './styles.js'
import { useComposedRef } from './use-composed-ref.js'
import { useProgressBinding } from './use-progress-binding.js'
import { usePageScrollProgress } from './use-scroll-progress.js'

/**
 * A bar showing how far through the document the reader is.
 *
 * The visible fill and the announced value are driven by two different mechanisms on
 * purpose. The fill is a `scaleX` reading a custom property, driven by a CSS scroll timeline
 * where one is available, so it is smooth and costs the main thread nothing. The announced
 * value comes from React state sampled at a much coarser interval, because it exists for
 * assistive technology and no one benefits from a value that changes two hundred times on
 * the way down a page.
 *
 * ## The accessibility question this component cannot answer for you
 *
 * A progress bar mirroring the scrollbar is, for most pages, decoration: it repeats
 * information the platform already exposes, and a screen reader user navigating by headings
 * has a far better sense of position than a percentage can give them. Announcing it is then
 * noise, and `decorative` — the default — hides it from the accessibility tree entirely
 * while leaving it visible.
 *
 * It stops being decoration when the page has no visible scrollbar to mirror: a custom
 * scroller, a kiosk, an overlay-scrollbar platform, or a long form where the bar is the only
 * indication of length. Set `decorative={false}` there and it becomes a labelled
 * `progressbar` with a real value. What it must never be is a `progressbar` that also claims
 * to be interactive: this element does not accept input, has no keyboard behaviour, and must
 * not be given a `tabindex`, because a focusable element that does nothing when operated is
 * worse than one that is not focusable at all.
 */

export interface ScrollProgressBarProps {
  /** Thickness of the bar in pixels. Defaults to 3. */
  thickness?: number
  /** Which edge to pin the bar to. Defaults to `top`. */
  position?: 'top' | 'bottom'
  /**
   * Render as a fixed overlay. Defaults to true.
   *
   * Turn it off to place the bar in normal flow — inside a sticky header, for instance,
   * where a second fixed element would sit on top of the first.
   */
  fixed?: boolean
  /** CSS colour for the fill. Defaults to `currentColor`. */
  colour?: string
  /**
   * Hide from the accessibility tree. Defaults to true. See the note above before changing
   * it.
   */
  decorative?: boolean
  /** Accessible name, used only when `decorative` is false. */
  label?: string
  /**
   * Granularity of the announced value, as a fraction. Defaults to 0.05.
   *
   * Coarse on purpose. `aria-valuenow` changing on a bar is not announced continuously by
   * most screen readers, but it is polled by some, and a value that changes on every frame
   * makes the element unusable when it is.
   */
  ariaStep?: number
  /** Opt out of CSS scroll-driven animation even where it is supported. */
  native?: boolean
  className?: string
  style?: CSSProperties
  /** Applied to the filled portion. */
  fillClassName?: string
  /** Applied to the filled portion. */
  fillStyle?: CSSProperties
  /** CSP nonce for the stylesheet injected on the native path. */
  nonce?: string
  ref?: Ref<HTMLDivElement>
}

/** A reading-progress indicator for the whole document. */
export function ScrollProgressBar({
  thickness = 3,
  position = 'top',
  fixed = true,
  colour = 'currentColor',
  decorative = true,
  label = 'Reading progress',
  ariaStep = 0.05,
  native = true,
  className,
  style,
  fillClassName,
  fillStyle,
  nonce,
  ref: externalRef,
}: ScrollProgressBarProps): ReactNode {
  const [, setTrackRef] = useComposedRef<HTMLDivElement>(externalRef)
  const fillRef = useRef<HTMLDivElement | null>(null)

  const binding = useProgressBinding(fillRef, { source: 'page', native, nonce })

  // Sampled only for the announced value; the fill does not read it, so a coarse step here
  // costs nothing visually. When the bar is decorative this subscription is skipped
  // altogether and the component performs no React state updates at all.
  const announced = usePageScrollProgress({ step: ariaStep, disabled: decorative })
  const percent = Math.round(announced * 100)

  const track: CSSProperties = {
    position: fixed ? 'fixed' : 'relative',
    ...(fixed
      ? {
          insetInlineStart: 0,
          insetInlineEnd: 0,
          ...(position === 'top' ? { top: 0 } : { bottom: 0 }),
          zIndex: 1,
        }
      : { width: '100%' }),
    height: thickness,
    // Nothing here should ever eat a click: a fixed strip across the top of the page sits
    // over whatever is beneath it, and at three pixels tall it is exactly the sort of
    // invisible obstacle that makes a link near the top of the page unclickable.
    pointerEvents: 'none',
    overflow: 'hidden',
    ...style,
  }

  const fill: CSSProperties = {
    height: '100%',
    width: '100%',
    backgroundColor: colour,
    transform: `scaleX(var(${PROGRESS_PROPERTY}))`,
    // Physical rather than logical, because `transform-origin` has no logical form. On a
    // right-to-left page pass `fillStyle={{ transformOrigin: 'right center' }}` so the bar
    // grows from the side the reader starts at.
    transformOrigin: 'left center',
    willChange: 'transform',
    ...fillStyle,
    ...binding.style,
  }

  const semantics = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({
        role: 'progressbar',
        'aria-label': label,
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': percent,
        'aria-valuetext': `${percent}% of the page`,
      } as const)

  return (
    <div ref={setTrackRef} className={className} style={track} {...semantics}>
      <div ref={fillRef} className={fillClassName} style={fill} {...binding.attributes} />
    </div>
  )
}
