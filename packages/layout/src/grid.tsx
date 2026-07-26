'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import {
  alignValue,
  justifyValue,
  toLength,
  type Align,
  type Justify,
  type LayoutPrimitiveProps,
  type Length,
} from './primitive.js'
import { resolveSpace, type Space } from './space.js'

/**
 * How empty tracks behave when the grid is wider than its content needs.
 *
 * The difference between these two keywords is one word in the spec and a completely
 * different layout on screen, and picking the wrong one is the most common reason a card
 * grid "looks broken with only two results".
 */
export type GridFlow = 'auto-fit' | 'auto-fill'

export interface GridProps extends LayoutPrimitiveProps {
  /**
   * Minimum width of a column before the grid drops to fewer of them.
   *
   * This is the responsive behaviour: the column count follows from the space available
   * and the width one item needs, with no breakpoints to maintain. Choose it from the
   * content — the narrowest width at which a card is still readable — not from a device.
   */
  min?: Length
  /** Space between tracks, in both axes. */
  gap?: Space
  /** Column gap, when it should differ from the row gap. */
  columnGap?: Space
  /** Row gap, when it should differ from the column gap. */
  rowGap?: Space
  /** See {@link GridFlow}. Defaults to `auto-fill`. */
  flow?: GridFlow
  /**
   * Fixed column count, overriding the intrinsic behaviour.
   *
   * Reach for this only when the count is genuinely part of the design — a 12-column page
   * scaffold, say. A fixed count on a card grid is a promise to add media queries later.
   */
  columns?: number
  /** Block-axis alignment of items within their cell. */
  align?: Align
  /** Inline-axis distribution of the tracks themselves. */
  justify?: Justify
}

/**
 * A responsive grid with no breakpoints in it.
 *
 * The entire behaviour comes from one declaration:
 *
 * ```css
 * grid-template-columns: repeat(auto-fill, minmax(min(16rem, 100%), 1fr));
 * ```
 *
 * Three details in that line each prevent a specific, common bug.
 *
 * ## `auto-fill` versus `auto-fit`
 *
 * Both fill the row with as many `16rem` tracks as fit. They differ only in what happens
 * to the tracks that have no item in them.
 *
 * `auto-fill` keeps the empty tracks. In a 1000px container with a 16rem minimum you get
 * three tracks; if there are only two items, they occupy the first two tracks at roughly a
 * third of the width each, and the third of the row sits empty. Item width is therefore
 * stable — a search returning two results renders cards the same size as a search
 * returning twenty, and the last row of a long list lines up with the rows above it.
 *
 * `auto-fit` collapses the empty tracks to zero width, and the `1fr` then distributes all
 * the space across the tracks that remain. Those same two items stretch to half the
 * container each. With one item, it stretches to the entire container — which is why a
 * single result in an `auto-fit` grid so often reads as a bug: one enormous card where a
 * card-sized card was expected.
 *
 * So: `auto-fill` when the item is a fixed-shape thing in a list of like items, which is
 * most card grids and is why it is the default here. `auto-fit` when the items should
 * always consume the full row — a two-up feature layout, a set of stat tiles that must not
 * leave a gap.
 *
 * ## `min(16rem, 100%)` rather than `16rem`
 *
 * `minmax(16rem, 1fr)` overflows any container narrower than 16rem, because the minimum is
 * a hard floor and grid will happily push past the container to honour it. A 320px phone
 * viewport is 20rem, so a 22rem minimum produces horizontal page scroll on every small
 * screen while looking perfect on the developer's laptop. Wrapping the floor in
 * `min(…, 100%)` caps it at the container width, and the overflow becomes impossible.
 *
 * ## `minmax(0, 1fr)` rather than `1fr` for fixed column counts
 *
 * `1fr` is shorthand for `minmax(auto, 1fr)`, and that `auto` minimum is the grid version
 * of the flex `min-width: auto` problem: a track containing a long unbroken string or a
 * wide element cannot shrink below it, so a "12 equal columns" grid quietly stops being
 * equal and starts overflowing. `minmax(0, 1fr)` means what people think `1fr` means.
 */
export function Grid({
  as: Component = 'div',
  min = '16rem',
  gap = 'normal',
  columnGap,
  rowGap,
  flow = 'auto-fill',
  columns,
  align,
  justify,
  style,
  children,
  ref,
  ...rest
}: GridProps): ReactNode {
  const template =
    columns !== undefined
      ? `repeat(${Math.max(1, Math.trunc(columns))}, minmax(0, 1fr))`
      : `repeat(${flow}, minmax(min(${toLength(min)}, 100%), 1fr))`

  return (
    <Component
      ref={ref}
      style={{
        display: 'grid',
        gridTemplateColumns: template,
        gap: resolveSpace(gap),
        columnGap: resolveSpace(columnGap),
        rowGap: resolveSpace(rowGap),
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
