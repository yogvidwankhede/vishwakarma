'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import {
  type Align,
  alignValue,
  type Justify,
  justifyValue,
  type LayoutPrimitiveProps,
} from './primitive.js'
import { resolveSpace, type Space } from './space.js'

export interface ClusterProps extends LayoutPrimitiveProps {
  /** Space between items, applied in both axes because a wrapped row needs both. */
  gap?: Space
  /** Cross-axis alignment within each line. Defaults to `center`. */
  align?: Align
  /** Main-axis distribution. Defaults to `start`. */
  justify?: Justify
}

/**
 * A group of items that flows onto as many lines as it needs.
 *
 * Tags, filter chips, a toolbar, a row of avatars, the buttons at the foot of a dialog:
 * anything where the item count is not known in advance and the container width is not
 * yours to predict. Wrapping is the default rather than an option, because the failure
 * mode of a non-wrapping group is horizontal overflow of the entire page, and the failure
 * mode of a wrapping group is a slightly taller box.
 *
 * `gap` is set once and applies between lines as well as within them. The technique this
 * replaces — negative margin on the container, positive margin on every child — produced
 * exactly the same visual result and three latent problems: the negative margin let the
 * container's own background bleed outside its box, the child margins leaked into any
 * child that was not a direct descendant, and the first line acquired a phantom offset
 * whenever the container also had padding. None of that is recoverable through
 * configuration; it is why `gap` on flex was worth waiting for.
 *
 * Note that `align="baseline"` is usually the right choice when the items contain text at
 * different sizes — a label next to a large number aligns on the letterforms rather than
 * on the boxes, which is what the eye expects.
 */
export function Cluster({
  as: Component = 'div',
  gap = 'snug',
  align = 'center',
  justify = 'start',
  style,
  children,
  ref,
  ...rest
}: ClusterProps): ReactNode {
  return (
    <Component
      ref={ref}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: resolveSpace(gap),
        alignItems: alignValue(align),
        justifyContent: justifyValue(justify),
        // See MIN_INLINE_SIZE_NOTE in primitive.ts.
        minInlineSize: 0,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  )
}

export interface RowProps extends LayoutPrimitiveProps {
  /** Space between items. */
  gap?: Space
  /** Cross-axis alignment. Defaults to `center`. */
  align?: Align
  /** Main-axis distribution. Defaults to `start`. */
  justify?: Justify
  /**
   * Reverse the visual order of the items.
   *
   * Use with care: this changes the painted order without changing the DOM order, so a
   * keyboard user tabs through the row right-to-left while reading it left-to-right. That
   * is a WCAG 2.4.3 failure. Reverse the data instead, unless the row is genuinely
   * non-interactive.
   */
  reverse?: boolean
}

/**
 * One line, always.
 *
 * A Row is the primitive for arrangements where wrapping would be wrong: a label and its
 * value, an icon and its text, a segmented control. If wrapping would be acceptable, you
 * want {@link Cluster} instead — this distinction is the whole reason both exist, and
 * collapsing them into one component with a `wrap` prop would hide the decision that
 * matters.
 *
 * Because it will not wrap, a Row has to be able to shrink, and shrinking is where flex
 * surprises people. A flex item's `min-width` is `auto`, meaning it refuses to become
 * narrower than its own content — so one long word, one wide `<svg>`, or one nested
 * scroller pushes the Row past its parent and the page grows a horizontal scrollbar. Every
 * primitive in this package sets `min-inline-size: 0` on itself for that reason, so a Row
 * of Vishwakarma primitives shrinks correctly. A raw element you place in a Row needs the
 * same treatment; that is the one thing to remember about this component.
 */
export function Row({
  as: Component = 'div',
  gap = 'snug',
  align = 'center',
  justify = 'start',
  reverse = false,
  style,
  children,
  ref,
  ...rest
}: RowProps): ReactNode {
  return (
    <Component
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: reverse ? 'row-reverse' : 'row',
        flexWrap: 'nowrap',
        gap: resolveSpace(gap),
        alignItems: alignValue(align),
        justifyContent: justifyValue(justify),
        // See MIN_INLINE_SIZE_NOTE in primitive.ts.
        minInlineSize: 0,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  )
}
