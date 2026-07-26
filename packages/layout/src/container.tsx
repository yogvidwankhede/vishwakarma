'use client'

import { Children, createContext, isValidElement, useContext, type ReactNode } from 'react'
import { toLength, type LayoutPrimitiveProps, type Length } from './primitive.js'
import { FLUID_GUTTER, resolveSpace, type Space } from './space.js'

interface ContainerShape {
  max: string
  gutter: string
}

const DEFAULT_SHAPE: ContainerShape = { max: '72rem', gutter: FLUID_GUTTER }

/**
 * The enclosing Container's measurements, so a {@link FullBleed} can re-align its own
 * inner content with the column it just escaped from.
 */
const ContainerShapeContext = createContext<ContainerShape>(DEFAULT_SHAPE)

export interface ContainerProps extends LayoutPrimitiveProps {
  /** Maximum width of the content column. Defaults to `72rem`. */
  max?: Length
  /**
   * Minimum space either side of the content.
   *
   * Defaults to a fluid `clamp()` that grows from 1rem on a phone to 2rem on a laptop.
   * A fixed gutter is either too tight on small screens or wasteful on large ones; the
   * fluid one is a single declaration with no breakpoints attached to it.
   */
  gutter?: Space
}

/**
 * A centred content column with gutters, built as a grid so that things can escape it.
 *
 * The column structure is:
 *
 * ```css
 * grid-template-columns:
 *   [full-start] minmax(var(--gutter), 1fr)
 *   [content-start] min(100% - var(--gutter) * 2, var(--max)) [content-end]
 *   minmax(var(--gutter), 1fr) [full-end];
 * ```
 *
 * The gutter tracks are not padding — they are real tracks, which is the entire point. A
 * child placed on `full-start / full-end` occupies them as well, so it reaches the
 * container's edges without any of the arithmetic that the negative-margin approach
 * requires. {@link FullBleed} does exactly that.
 *
 * The `min(100% - gutter * 2, max)` on the middle track is what guarantees the gutters
 * survive at narrow widths. Without it the content track holds out for its maximum and the
 * grid overflows its own container rather than shrink.
 *
 * ## Why children are grouped into a wrapper
 *
 * Grid auto-placement puts every unplaced item in the first column, which here is a
 * gutter. Something has to say `grid-column: content`, and CSS cannot say it for arbitrary
 * children without a stylesheet this package does not ship. So Container gathers each run
 * of ordinary children into one element placed in the content column, and leaves the
 * full-bleed children as direct grid items.
 *
 * Runs rather than one wrapper per child, because grid items do not collapse margins with
 * one another: wrapping every child separately would break the margin collapsing between,
 * say, a heading and the paragraph after it, and quietly change the spacing of every piece
 * of prose on the site. The cost of grouping is that adding or removing a full-bleed child
 * re-partitions the runs, and React remounts the children that move between wrappers. That
 * is fine for the static bands this pattern is for, and worth knowing before you toggle a
 * `FullBleed` on a timer.
 *
 * Only *direct* children are inspected. A `FullBleed` nested inside another element will
 * bleed to whatever grid encloses it, which is usually nothing.
 */
export function Container({
  as: Component = 'div',
  max = '72rem',
  gutter,
  style,
  children,
  ref,
  ...rest
}: ContainerProps): ReactNode {
  const maxValue = toLength(max)
  const gutterValue = gutter === undefined ? FLUID_GUTTER : (resolveSpace(gutter) ?? FLUID_GUTTER)

  const items = Children.toArray(children)
  const rows: ReactNode[] = []
  let run: ReactNode[] = []
  let runStart = 0

  const flushRun = (): void => {
    if (run.length === 0) return
    rows.push(
      <div
        key={`vk-container-run-${runStart}`}
        style={{ gridColumn: 'content-start / content-end', minInlineSize: 0 }}
      >
        {run}
      </div>,
    )
    run = []
  }

  for (let index = 0; index < items.length; index++) {
    const child = items[index]
    if (isValidElement(child) && child.type === FullBleed) {
      flushRun()
      rows.push(child)
      runStart = index + 1
    } else {
      if (run.length === 0) runStart = index
      run.push(child)
    }
  }
  flushRun()

  return (
    <ContainerShapeContext.Provider value={{ max: maxValue, gutter: gutterValue }}>
      <Component
        ref={ref}
        style={{
          display: 'grid',
          gridTemplateColumns: [
            `[full-start] minmax(${gutterValue}, 1fr)`,
            `[content-start] min(100% - ${gutterValue} * 2, ${maxValue}) [content-end]`,
            `minmax(${gutterValue}, 1fr) [full-end]`,
          ].join(' '),
          ...style,
        }}
        {...rest}
      >
        {rows}
      </Component>
    </ContainerShapeContext.Provider>
  )
}

export interface FullBleedProps extends LayoutPrimitiveProps {
  /**
   * Re-constrain the inner content to the enclosing Container's column.
   *
   * The usual shape of a full-width band: background, border, or image spanning the
   * viewport, with the text inside still lining up with everything above and below it.
   */
  constrain?: boolean
}

/**
 * A child that escapes its {@link Container} and spans the full width.
 *
 * ## Why not `margin-inline: calc(50% - 50vw)`
 *
 * The negative-margin technique is shorter to write and wrong in four separate ways, all
 * of which show up in production rather than in development.
 *
 * It assumes the container is horizontally centred in the viewport. Put the same page
 * inside a sidebar layout, a split view, or a dialog and the bleeding element slides off
 * to one side, because the arithmetic was always about the viewport and never about the
 * container.
 *
 * It assumes `100vw` is the width of the visible area. On any platform with classic
 * overlay-free scrollbars — Windows, Linux, and macOS with "always show scroll bars" —
 * `100vw` includes the scrollbar gutter, so the element is a scrollbar wider than the page
 * and the document gains a horizontal scrollbar. The user then scrolls sideways by fifteen
 * pixels for no reason, and because the overflow is exactly the scrollbar width it is
 * invisible on the machine of whoever wrote it.
 *
 * It breaks anywhere the container's width is not `100%` of its parent — inside a grid
 * track, inside a flex item, inside a transformed element.
 *
 * And it fights every ancestor that has `overflow: hidden` or `contain: paint`, where the
 * escape is simply clipped, again silently.
 *
 * The grid approach has none of those failure modes because it does no arithmetic at all.
 * The element is placed on lines that already exist, so it is exactly as wide as its
 * container regardless of scrollbars, centring, writing mode, or ancestry.
 *
 * `1 / -1` rather than the named `full-start / full-end` lines: it means the same thing
 * inside a Container, and it still means "span every column" if this component ends up in
 * some other grid, which degrades to something sensible rather than to a name error and
 * silent auto-placement.
 */
export function FullBleed({
  as: Component = 'div',
  constrain = false,
  style,
  children,
  ref,
  ...rest
}: FullBleedProps): ReactNode {
  const shape = useContext(ContainerShapeContext)

  return (
    <Component
      ref={ref}
      style={{
        gridColumn: '1 / -1',
        minInlineSize: 0,
        ...style,
      }}
      {...rest}
    >
      {constrain ? (
        <div
          style={{
            maxInlineSize: shape.max,
            marginInline: 'auto',
            paddingInline: shape.gutter,
            // Padding is part of the box here, so the constrained content lines up with
            // the Container's content column rather than sitting a gutter-width narrower.
            boxSizing: 'content-box',
          }}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </Component>
  )
}
