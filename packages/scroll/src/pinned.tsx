'use client'

import type { CSSProperties, ElementType, ReactNode, Ref } from 'react'
import { SCROLL_RANGES, type ScrollRange } from './geometry.js'
import { PROGRESS_PROPERTY } from './styles.js'
import { useComposedRef } from './use-composed-ref.js'
import { useProgressBinding } from './use-progress-binding.js'

/**
 * Hold a section still while the page scrolls past it, using `position: sticky`.
 *
 * The section is not pinned by intercepting the scroll. It is pinned by reserving a taller
 * box and letting the browser's own sticky positioning hold the contents in place, which
 * means the page continues to scroll exactly as the user asked it to. Progress through the
 * pinned span is published as `--vk-scroll-progress`, so the sequence itself is written in
 * CSS against that number.
 *
 * ## Why this does not take over the scroll
 *
 * The usual implementation of a pinned sequence cancels the wheel and touch events, keeps
 * its own scroll position in a variable, and re-implements momentum. That is scroll-jacking,
 * and it breaks four things that are not negotiable.
 *
 * Find-in-page stops working. The browser scrolls the document to a match and the hijacked
 * page immediately scrolls it back, so the match is highlighted somewhere off screen and the
 * reader cannot see what was found. Keyboard scrolling stops working: Page Down, Home, End,
 * space and the arrow keys all move the document, not the wheel, so a handler that only
 * listens for wheel and touch simply ignores them — and a handler that does intercept them
 * has to reimplement caret and focus movement it has no way to get right. Screen readers
 * stop working, because a virtual cursor moving through the content scrolls the document to
 * keep up, and a page fighting that scroll traps the cursor. And the platform's own
 * behaviour goes with it: scroll anchoring, overscroll at the boundaries, the momentum curve
 * the operating system defines, the browser's restoration of scroll position on reload.
 *
 * Sticky positioning gets the same visual result while keeping every one of those. The cost
 * is that the effect must be expressible as a function of scroll position rather than as a
 * timeline the page controls — which, as it turns out, is a better way to author it anyway,
 * because it is the form that can be handed to a CSS scroll timeline and taken off the main
 * thread.
 *
 * ## When it will not stick
 *
 * `position: sticky` is disabled by any ancestor with `overflow` set to anything but
 * `visible`. This is by far the most common reason a pinned section refuses to pin, and it
 * is usually an `overflow: hidden` added several layers up to contain something unrelated.
 * The failure is silent and total: the section simply scrolls away like ordinary content.
 */

export interface PinnedProps {
  children?: ReactNode
  /** Element to render as the reserving box. Defaults to a section. */
  as?: ElementType
  /**
   * How far the page scrolls while the section is held, in multiples of the viewport height.
   *
   * Defaults to 1. This is the scroll distance the reader must cover to get past a section
   * whose content is not changing size, so it is also, directly, how long they are made to
   * wait. Beyond about 3 the section reads as broken rather than as deliberate.
   */
  length?: number
  /**
   * Distance from the top of the viewport at which the content sticks, in pixels.
   *
   * Set this to the height of a fixed header so the pinned content is not hidden behind it.
   * The content's height is reduced by the same amount, which keeps the pinned span exactly
   * `length` viewport heights.
   */
  offset?: number
  /**
   * Viewport unit for the reserved height. Defaults to `svh`.
   *
   * `svh` is the small viewport height — the height with the mobile browser's toolbars
   * showing. It is the only one of the three that does not change as those toolbars collapse
   * and expand during a scroll; `vh` and `dvh` both resize the reserved box mid-gesture,
   * which moves the content underneath it and shifts the pinned span out from under the
   * reader's finger.
   */
  viewportUnit?: 'svh' | 'dvh' | 'vh'
  /** Notified as progress through the pinned span changes. */
  onProgress?: (progress: number) => void
  /** Opt out of CSS scroll-driven animation even where it is supported. */
  native?: boolean
  className?: string
  style?: CSSProperties
  /** Applied to the inner sticky element. */
  contentClassName?: string
  /** Applied to the inner sticky element. */
  contentStyle?: CSSProperties
  /** CSP nonce for the stylesheet injected on the native path. */
  nonce?: string
  ref?: Ref<HTMLElement>
}

/** Pin a section for a measured distance of scrolling. */
export function Pinned({
  children,
  as: Component = 'section',
  length = 1,
  offset = 0,
  viewportUnit = 'svh',
  onProgress,
  native = true,
  className,
  style,
  contentClassName,
  contentStyle,
  nonce,
  ref: externalRef,
}: PinnedProps): ReactNode {
  const [ref, setRef] = useComposedRef<HTMLElement>(externalRef)

  // With no offset the span is exactly the `pin` preset, which CSS can express as a
  // `contain` range and therefore drive natively. A sticky offset shifts only the start of
  // the span — the end is unaffected, since the content unsticks when the box's bottom edge
  // arrives regardless of where it stuck — and that asymmetry has no CSS equivalent, so an
  // offset section falls back to the scripted driver.
  const range: ScrollRange | 'pin' =
    offset === 0
      ? 'pin'
      : { from: { element: 0, viewport: 0, px: offset }, to: SCROLL_RANGES.pin.to }

  const binding = useProgressBinding(ref, { range, native, onProgress, nonce })

  const reserved = `calc(${(1 + Math.max(length, 0)).toFixed(4)} * 100${viewportUnit})`
  const contentHeight =
    offset === 0 ? `100${viewportUnit}` : `calc(100${viewportUnit} - ${offset}px)`

  return (
    <Component
      ref={setRef}
      className={className}
      style={{ ...style, height: reserved, ...binding.style }}
      {...binding.attributes}
    >
      <div
        className={contentClassName}
        style={{
          position: 'sticky',
          top: offset,
          height: contentHeight,
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </Component>
  )
}

/**
 * The property a pinned section publishes its progress on.
 *
 * Re-exported here so a stylesheet authored beside a `Pinned` section has a name to import
 * in documentation without reaching into the styles module.
 */
export const PINNED_PROGRESS_PROPERTY = PROGRESS_PROPERTY
