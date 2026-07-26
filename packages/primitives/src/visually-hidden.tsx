'use client'

import { useState } from 'react'
import type { CSSProperties, ElementType, ReactNode } from 'react'

/**
 * Hide content from the screen while leaving it in the accessibility tree.
 *
 * The two obvious approaches both destroy the thing being attempted. `display: none` and
 * `visibility: hidden` remove the element from the accessibility tree entirely, so a screen
 * reader never reads it — which is the opposite of the requirement. `text-indent: -9999px`
 * and `left: -9999px` do keep the element readable, but they leave it on the page at a real
 * position: focusing anything inside scrolls the viewport nine thousand pixels sideways, and
 * in a right-to-left document the element lands off the far edge and produces a horizontal
 * scrollbar on every page that uses it.
 *
 * What works is collapsing the element to a one-pixel box and clipping away its contents.
 * The pieces are load-bearing in ways that are not obvious:
 *
 * - `width`/`height` of `1px`, not `0`. A zero-sized element is treated as not rendered by
 *   several screen reader and browser combinations, and is skipped.
 * - `clip-path: inset(50%)` clips the overflowing text to nothing. `overflow: hidden` alone
 *   is not enough, because the text still paints outside a 1px box in some engines.
 * - `white-space: nowrap`, because a wrapped label inside a 1px box can be reported as
 *   several fragments, and some readers insert pauses between them.
 * - `position: absolute` so the element takes no space in flow; a 1px inline box would
 *   otherwise add a stray pixel to the line height of whatever contains it.
 * - `margin: -1px` cancels the one pixel that remains.
 * - `border: 0` and `padding: 0` because a border on a 1px box is the whole box, and a
 *   focus ring drawn on it is a visible dot in the corner of the layout.
 */
export const visuallyHiddenStyle: Readonly<CSSProperties> = Object.freeze({
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  wordWrap: 'normal',
})

/**
 * The same technique, but the element becomes visible when something inside it takes focus.
 *
 * This is what a skip link needs. A skip link that stays hidden when focused is useless to
 * the sighted keyboard users it primarily serves, who cannot tell they have landed on it.
 * Because a style object cannot express `:focus-within`, this variant is applied by the
 * component below only while it holds focus.
 */
export interface VisuallyHiddenProps {
  children: ReactNode
  /** Element to render. Defaults to a span, which is valid in both inline and block context. */
  as?: ElementType
  /**
   * Reveal the content while it, or anything inside it, has focus.
   *
   * Use for skip links and any other control that is hidden until a keyboard user needs it.
   * Leave off for text that exists purely to be announced, where becoming visible on focus
   * would be a layout surprise.
   */
  revealOnFocus?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Render content for assistive technology only.
 *
 * Reach for it when the visual design carries meaning that the markup does not: an icon-only
 * button needs a name, a table's sort control needs to say what it sorts, a live region
 * needs somewhere to put its text. It is not a way to hide content that is not needed —
 * hidden content is still read, still found by find-in-page in some browsers, and still
 * counts towards the length of the page for someone navigating by swipe.
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
  revealOnFocus = false,
  className,
  style,
}: VisuallyHiddenProps): ReactNode {
  // `:focus-within` cannot be expressed in a style attribute, and injecting a stylesheet is
  // exactly what a headless package must not do. React's synthetic `onFocus` bubbles, unlike
  // the native `focus` event, so tracking it on the wrapper gives focus-within semantics for
  // free — at the cost of one render on an event that happens at most a few times a session.
  const [focused, setFocused] = useState(false)
  const hidden = !(revealOnFocus && focused)

  return (
    <Component
      className={className}
      style={hidden ? { ...visuallyHiddenStyle, ...style } : style}
      data-vk-visually-hidden={hidden ? '' : undefined}
      {...(revealOnFocus
        ? {
            onFocus: () => setFocused(true),
            onBlur: () => setFocused(false),
          }
        : {})}
    >
      {children}
    </Component>
  )
}
