'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { Children, createContext, isValidElement, type ReactNode, useContext } from 'react'
import { useContainerSize } from './container-query.js'
import { type LayoutPrimitiveProps, type Length, toLength } from './primitive.js'
import { useMergedRef } from './refs.js'
import { resolveSpace, type Space } from './space.js'

/**
 * Importance, expressed as area.
 *
 * A bento layout works because size is the most immediate visual signal there is: a tile
 * twice as wide is read first, and no amount of typographic hierarchy inside the tiles
 * overrides that. Ranking the tiles therefore *is* the editorial decision, and it is worth
 * making explicitly rather than arriving at by choosing spans one at a time.
 *
 * Three ranks, not five. The point of the layout is contrast between a small number of
 * levels; a grid with five distinct tile sizes has no hierarchy, only variety.
 */
export type BentoRank = 1 | 2 | 3

const RANK_SHAPE: Record<BentoRank, { span: number; rowSpan: number }> = {
  1: { span: 2, rowSpan: 2 },
  2: { span: 2, rowSpan: 1 },
  3: { span: 1, rowSpan: 1 },
}

interface BentoSlot {
  span: number
  rowSpan: number
}

/**
 * The span a Bento has decided a tile should occupy.
 *
 * A tile cannot compute this itself, because the answer depends on how many columns the
 * grid ended up with and on what the other tiles asked for. The Bento resolves everything
 * and hands each tile its slot through context — which renders no DOM, so the tiles remain
 * direct grid items. Passing the value by cloning each child would work too, and would
 * break the moment a tile is wrapped in a memo, a link, or anything else.
 */
const BentoSlotContext = createContext<BentoSlot | null>(null)

export interface BentoTileProps extends LayoutPrimitiveProps {
  /** Editorial importance. See {@link BentoRank}. */
  rank?: BentoRank
  /** Explicit column span, overriding the shape implied by `rank`. */
  span?: number
  /** Explicit row span, overriding the shape implied by `rank`. */
  rowSpan?: number
}

function shapeOf(props: BentoTileProps): BentoSlot {
  const base = RANK_SHAPE[props.rank ?? 3]
  return {
    span: Math.max(1, Math.trunc(props.span ?? base.span)),
    rowSpan: Math.max(1, Math.trunc(props.rowSpan ?? base.rowSpan)),
  }
}

/**
 * One cell of a {@link Bento}.
 *
 * Outside a Bento it falls back to its own `rank`/`span` props, so it degrades to a plain
 * grid item rather than to nothing. Inside one, the Bento's resolved slot wins — it has
 * accounted for the column count and for the holes, and a tile that insisted on its own
 * span would be the thing that punched a hole in the grid.
 *
 * The resolved rank is also exposed as `--vk-bento-span`, so tile *content* can respond to
 * tile size — larger type in the hero, a hidden description in the small ones — without
 * every tile needing a size prop threaded into it.
 */
export function BentoTile({
  as: Component = 'div',
  rank,
  span,
  rowSpan,
  style,
  children,
  ref,
  ...rest
}: BentoTileProps): ReactNode {
  const slot = useContext(BentoSlotContext) ?? shapeOf({ rank, span, rowSpan })

  return (
    <Component
      ref={ref}
      data-vk-bento-rank={rank ?? 3}
      style={{
        gridColumn: `span ${slot.span}`,
        gridRow: `span ${slot.rowSpan}`,
        // Exposed for content-level styling; see the note above.
        ['--vk-bento-span' as string]: String(slot.span),
        // See MIN_INLINE_SIZE_NOTE in primitive.ts. Grid items have the same auto-minimum
        // problem as flex items, and a tile containing a long heading is the usual trigger.
        minInlineSize: 0,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  )
}

/**
 * Resolve the ragged-bottom problem by growing tiles, never by reordering them.
 *
 * Spans that do not divide evenly into the column count leave holes: a row that cannot fit
 * the next tile ends early, and the final row usually ends early too. Both read as
 * unfinished, and on a marketing page they read as broken.
 *
 * The obvious fix is `grid-auto-flow: dense`, which back-fills holes by pulling later
 * items into them. It is available here as an opt-in and it should stay opt-in, because it
 * decouples painted order from DOM order: a keyboard user tabs through the tiles in an
 * order that does not match what they see, and a screen reader announces them in a third
 * order again. That is a WCAG 1.3.2 failure, and it is invisible to anyone testing with a
 * mouse.
 *
 * Growing the tile that precedes a hole has no such cost. Nothing moves; one tile gets
 * wider. The trade is that the grown tile now reads as slightly more important than its
 * rank claimed — which is a design compromise, not an accessibility defect, and it is
 * confined to at most one tile per hole.
 *
 * Only applied when every tile is a single row tall. With multi-row tiles the placement is
 * genuinely two-dimensional, and widening a tile can drive it into a cell a later tile has
 * already claimed — turning a cosmetic gap into overlapping content.
 */
export function planBentoSpans(spans: number[], columns: number): number[] {
  const cols = Math.max(1, Math.trunc(columns))
  const out = spans.map((span) => Math.min(Math.max(1, Math.trunc(span)), cols))

  let remaining = cols
  let lastPlaced = -1

  for (let index = 0; index < out.length; index++) {
    const span = out[index] ?? 1

    if (span > remaining) {
      // This tile does not fit in what is left of the row, so the grid will drop it to the
      // next one and leave `remaining` empty cells behind. Give them to the tile that ends
      // the row.
      if (lastPlaced >= 0) out[lastPlaced] = (out[lastPlaced] ?? 1) + remaining
      remaining = cols
    }

    remaining -= span
    lastPlaced = index
    if (remaining === 0) remaining = cols
  }

  // The last row, which is the case people notice.
  if (remaining > 0 && remaining < cols && lastPlaced >= 0) {
    out[lastPlaced] = (out[lastPlaced] ?? 1) + remaining
  }

  return out
}

export type BentoFill = 'grow' | 'dense' | 'none'

export interface BentoProps extends LayoutPrimitiveProps {
  /** Column count at full width. Defaults to 4. */
  columns?: number
  /**
   * Narrowest a single column may become, in px, before the grid drops a column.
   *
   * In px because it is compared against a measured pixel width. Everything else in this
   * package takes a CSS length; this genuinely cannot.
   */
  minColumn?: number
  /** Space between tiles. */
  gap?: Space
  /** Minimum height of a single-row tile. Rows still grow to fit their content. */
  rowHeight?: Length
  /** How to deal with holes. See {@link planBentoSpans}. Defaults to `grow`. */
  fill?: BentoFill
}

/**
 * A grid of tiles whose sizes carry meaning.
 *
 * ## Why the column count is measured rather than queried
 *
 * A tile that says `grid-column: span 2` in a grid that has one column does not politely
 * become one column wide — it creates an implicit second column and pushes the grid past
 * its container. So the spans and the column count have to agree, and CSS offers no way to
 * write "span 2, or fewer if fewer exist" (`span min(2, …)` is not a thing). The column
 * count therefore has to be known where the spans are decided, which means measuring it.
 *
 * The cost is honest: the first paint uses the `columns` prop, and a narrow container
 * corrects itself once the observer reports. The correction is not a break — the tracks
 * are `minmax(0, 1fr)`, so four columns in a phone-width container are merely thin, never
 * overflowing — but it is a reflow, and if that matters more than the tile shapes do, use
 * a plain {@link Grid} instead. This is the one component in the package that trades a
 * frame of layout for an effect CSS cannot produce.
 */
export function Bento({
  as: Component = 'div',
  columns = 4,
  minColumn = 220,
  gap = 'normal',
  rowHeight = '9rem',
  fill = 'grow',
  style,
  children,
  ref: _ref,
  ...rest
}: BentoProps): ReactNode {
  const { ref, size } = useContainerSize<HTMLElement>({ box: 'content-box' })
  const mergedRef = useMergedRef<HTMLElement>(ref, _ref)

  const maxColumns = Math.max(1, Math.trunc(columns))
  const effectiveColumns =
    size === null
      ? maxColumns
      : Math.min(maxColumns, Math.max(1, Math.floor(size.inlineSize / Math.max(1, minColumn))))

  const items = Children.toArray(children)

  // Children that are not tiles still occupy a cell, so they take part in the plan with a
  // span of one. Ignoring them would make every hole calculation after them wrong.
  const shapes: BentoSlot[] = items.map((child) =>
    isValidElement<BentoTileProps>(child) && child.type === BentoTile
      ? shapeOf(child.props)
      : { span: 1, rowSpan: 1 },
  )

  const flat = shapes.every((shape) => shape.rowSpan === 1)
  const planned =
    fill === 'grow' && flat
      ? planBentoSpans(
          shapes.map((shape) => shape.span),
          effectiveColumns,
        )
      : shapes.map((shape) => Math.min(shape.span, effectiveColumns))

  return (
    <Component
      ref={mergedRef}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${effectiveColumns}, minmax(0, 1fr))`,
        // A minimum rather than a fixed height: a tile that has more content than its
        // neighbours should get taller, not clip. Fixed row heights are the reason bento
        // grids so often lose the last line of a paragraph.
        gridAutoRows: `minmax(${toLength(rowHeight)}, auto)`,
        gridAutoFlow: fill === 'dense' ? 'row dense' : 'row',
        gap: resolveSpace(gap),
        minInlineSize: 0,
        ...style,
      }}
      {...rest}
    >
      {items.map((child, index) => {
        const shape = shapes[index]
        const slot: BentoSlot = {
          span: planned[index] ?? shape?.span ?? 1,
          rowSpan: Math.max(1, shape?.rowSpan ?? 1),
        }
        const key = isValidElement(child) && child.key !== null ? child.key : `vk-bento-${index}`

        return (
          <BentoSlotContext.Provider key={key} value={slot}>
            {child}
          </BentoSlotContext.Provider>
        )
      })}
    </Component>
  )
}
