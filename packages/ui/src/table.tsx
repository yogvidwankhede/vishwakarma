'use client'

import { type ComponentPropsWithRef, type ReactNode, useEffect, useRef, useState } from 'react'
import { focusRing } from './styles.js'
import { cx } from './variants.js'

/**
 * Tabular data.
 *
 * Two problems are solved here that a plain `<table>` in a `<div class="overflow-x-auto">`
 * does not solve.
 *
 * **The scroll container is reachable from the keyboard, and only when it needs to be.** A
 * horizontally scrolling region with no focusable content inside it cannot be scrolled by a
 * keyboard user at all: there is nothing to focus, so there is nothing to press the arrow
 * keys against, and the columns past the right-hand edge are simply unreachable. Adding
 * `tabIndex={0}` fixes that — and a focusable element must have an accessible name, or it is
 * announced as an unlabelled group, which is why `label` is required rather than optional.
 * But an unconditional tab stop is its own cost: every table on the page becomes a stop the
 * user must tab through even when nothing is clipped. So the container measures itself and
 * takes the tab stop only while it actually overflows.
 *
 * **Numbers are set in tabular figures.** In a proportional font the digit 1 is narrower than
 * the digit 8, so a column of currency values does not line up and cannot be scanned by
 * length — which is how people compare magnitudes in a table. `Table.Cell numeric` switches
 * to tabular figures and right-aligns, and the matching header cell must be given `numeric`
 * too, or the header sits over the wrong edge of its column.
 */

export interface TableProps extends Omit<ComponentPropsWithRef<'table'>, 'children'> {
  /**
   * Accessible name for the scroll region.
   *
   * Required: the region becomes focusable when it overflows, and a focusable region with no
   * name is announced as "group" and nothing else.
   */
  label: string
  /**
   * A visible caption, rendered as `<caption>`.
   *
   * Prefer this to a heading above the table. A `<caption>` is part of the table's own
   * accessible description, so it is read when the user enters the table rather than only
   * when they pass over it in document order.
   */
  caption?: ReactNode
  /** Rows and sections. */
  children: ReactNode
  /** Classes for the scroll container rather than the table element. */
  containerClassName?: string
  /** Tighter row padding, for dense data. */
  density?: 'comfortable' | 'compact'
}

function TableRoot({
  label,
  caption,
  children,
  className,
  containerClassName,
  density = 'comfortable',
  ...rest
}: TableProps): ReactNode {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const measure = (): void => {
      // The one-pixel tolerance is not superstition: sub-pixel layout routinely leaves
      // `scrollWidth` a fraction above `clientWidth` on a table that is not actually clipped,
      // and without it the table gains and loses a tab stop as the window resizes.
      setOverflowing(element.scrollWidth - element.clientWidth > 1)
    }

    measure()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    // The table is observed as well as the container. The container's own size does not change
    // when a column's content grows, so observing only the container misses exactly the case
    // where the table starts overflowing.
    const table = element.firstElementChild
    if (table) observer.observe(table)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={cx(
        'w-full overflow-x-auto rounded-lg border border-border-subtle',
        focusRing,
        containerClassName,
      )}
      {...(overflowing ? { tabIndex: 0, role: 'region', 'aria-label': label } : {})}
    >
      <table
        {...rest}
        className={cx('w-full border-collapse text-left text-base', className)}
        data-density={density}
      >
        {caption ? (
          <caption className="px-4 py-3 text-left text-sm text-text-secondary">{caption}</caption>
        ) : (
          <caption className="sr-only">{label}</caption>
        )}
        {children}
      </table>
    </div>
  )
}

/** Header section. Keep it a real `<thead>`: sticky headers built from divs lose the row/column relationship. */
function TableHead({ className, children, ...rest }: ComponentPropsWithRef<'thead'>): ReactNode {
  return (
    <thead {...rest} className={cx('border-b border-border-default bg-surface-subtle', className)}>
      {children}
    </thead>
  )
}

/** Body section. */
function TableBody({ className, children, ...rest }: ComponentPropsWithRef<'tbody'>): ReactNode {
  return (
    <tbody {...rest} className={cx('divide-y divide-border-subtle', className)}>
      {children}
    </tbody>
  )
}

/** Footer section, for totals. Rendered after the body in the DOM, as `<tfoot>` requires. */
function TableFoot({ className, children, ...rest }: ComponentPropsWithRef<'tfoot'>): ReactNode {
  return (
    <tfoot
      {...rest}
      className={cx('border-t border-border-default bg-surface-subtle font-medium', className)}
    >
      {children}
    </tfoot>
  )
}

export interface TableRowProps extends ComponentPropsWithRef<'tr'> {
  /**
   * Mark the row as selected.
   *
   * Sets `aria-selected` as well as the tint, because a row distinguished only by a pale
   * background is distinguished by nothing at all for a screen-reader user, and by very
   * little for anybody on a poorly calibrated display.
   */
  selected?: boolean
}

/** A row. */
function TableRow({ selected, className, children, ...rest }: TableRowProps): ReactNode {
  return (
    <tr
      {...rest}
      aria-selected={selected}
      className={cx(
        'transition-colors duration-instant motion-reduce:transition-none',
        selected ? 'bg-brand-50' : 'hover:bg-surface-subtle',
        className,
      )}
    >
      {children}
    </tr>
  )
}

export interface TableCellProps extends ComponentPropsWithRef<'td'> {
  /** Right-align and set in tabular figures. Apply to the matching header cell too. */
  numeric?: boolean
}

/** A data cell. */
function TableCell({ numeric = false, className, children, ...rest }: TableCellProps): ReactNode {
  return (
    <td
      {...rest}
      className={cx(
        'px-4 py-3 align-middle text-text-primary',
        numeric && 'text-right tabular-nums',
        className,
      )}
    >
      {children}
    </td>
  )
}

export interface TableHeaderCellProps extends ComponentPropsWithRef<'th'> {
  /** Right-align, matching a numeric column. */
  numeric?: boolean
  /**
   * Which cells this header describes.
   *
   * Defaults to `col`. Setting `scope` is what turns a grid of text into a table a screen
   * reader can navigate cell by cell, announcing "Amount, £42.00" instead of "£42.00" — and
   * it is the single most common omission in hand-written table markup.
   */
  scope?: 'col' | 'row' | 'colgroup' | 'rowgroup'
}

/** A header cell. */
function TableHeaderCell({
  numeric = false,
  scope = 'col',
  className,
  children,
  ...rest
}: TableHeaderCellProps): ReactNode {
  return (
    <th
      {...rest}
      scope={scope}
      className={cx(
        'px-4 py-3 text-sm font-semibold text-text-secondary',
        numeric && 'text-right tabular-nums',
        className,
      )}
    >
      {children}
    </th>
  )
}

/**
 * A table, with `Table.Head`, `Table.Body`, `Table.Foot`, `Table.Row`, `Table.HeaderCell` and
 * `Table.Cell`.
 *
 * The parts are thin wrappers over the native elements rather than replacements for them,
 * because the native table elements carry the row and column relationships that assistive
 * technology reads, and no arrangement of divs and ARIA reproduces them completely.
 */
export const Table = Object.assign(TableRoot, {
  Head: TableHead,
  Body: TableBody,
  Foot: TableFoot,
  Row: TableRow,
  Cell: TableCell,
  HeaderCell: TableHeaderCell,
})
