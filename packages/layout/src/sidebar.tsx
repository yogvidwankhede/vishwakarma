'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { Children, isValidElement, type ReactNode } from 'react'
import {
  type Align,
  alignValue,
  type LayoutPrimitiveProps,
  type Length,
  toLength,
} from './primitive.js'
import { resolveSpace, type Space } from './space.js'

export interface SidebarProps extends LayoutPrimitiveProps {
  /** The narrow, fixed-ish region. Rendered before or after the main content per `side`. */
  aside: ReactNode
  /** Which edge the sidebar sits on. Defaults to `start`. */
  side?: 'start' | 'end'
  /** The sidebar's preferred width when the two sit side by side. */
  sideWidth?: Length
  /**
   * How much of the container the main content must keep before the pair stacks.
   *
   * A percentage of the *container*, which is what makes this work without a media query.
   * Values much above 60% collapse aggressively; much below 40% and the main content is
   * squeezed into a column narrower than the sidebar before anything happens.
   */
  contentMin?: string
  /** Space between the two regions, and between them when stacked. */
  gap?: Space
  /** Cross-axis alignment. Defaults to `stretch`, so both regions are the same height. */
  align?: Align
}

/**
 * A sidebar and a main region that stack when there is no longer room for both.
 *
 * No media query, and no measurement either — the collapse is a property of the flex
 * algorithm:
 *
 * - the main region gets `flex-basis: 0` and `flex-grow: 999`, so it claims essentially
 *   all the free space on the line and the sidebar settles at its own basis. `flex-basis:
 *   0` rather than `auto` matters: with `auto` the split depends on the content, so a
 *   longer article makes the sidebar narrower, which is not what anyone means by "sidebar";
 * - the main region also gets `min-inline-size: 55%`. A flex line cannot hold two items
 *   whose minimum sizes exceed it, so at the width where the sidebar plus 55% no longer
 *   fit, `flex-wrap` moves the sidebar onto its own line;
 * - the sidebar has `flex-grow: 1`, so once it is alone on a line it spans the full width
 *   rather than sitting at its basis with dead space beside it.
 *
 * A media query cannot express this, because a media query knows the viewport and the
 * layout depends on the container. Drop this component into a 400px panel on a 1600px
 * screen and it stacks, correctly, with no configuration. That is the whole argument for
 * intrinsic layouts over breakpoints.
 *
 * `side="end"` moves the sidebar *in the DOM*, not with `order` or `row-reverse`. Visual
 * reordering leaves the tab sequence and the screen-reader order following the source
 * while the eye follows the paint, which is a WCAG 2.4.3 failure and is deeply confusing
 * to anyone using both at once — a sighted keyboard user, most obviously.
 *
 * The regions are wrapped, because the flex contract has to sit on the flex items
 * themselves and this component cannot style children it did not create.
 */
export function Sidebar({
  as: Component = 'div',
  aside,
  side = 'start',
  sideWidth = '18rem',
  contentMin = '55%',
  gap = 'normal',
  align,
  style,
  children,
  ref,
  ...rest
}: SidebarProps): ReactNode {
  const asideRegion = (
    <div key="aside" style={{ flexGrow: 1, flexBasis: toLength(sideWidth), minInlineSize: 0 }}>
      {aside}
    </div>
  )

  const mainRegion = (
    <div
      key="main"
      style={{
        flexGrow: 999,
        flexBasis: 0,
        minInlineSize: contentMin,
      }}
    >
      {children}
    </div>
  )

  return (
    <Component
      ref={ref}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: resolveSpace(gap),
        alignItems: alignValue(align),
        minInlineSize: 0,
        ...style,
      }}
      {...rest}
    >
      {side === 'start' ? [asideRegion, mainRegion] : [mainRegion, asideRegion]}
    </Component>
  )
}

export interface SwitcherProps extends LayoutPrimitiveProps {
  /**
   * Container width at which the layout flips between one row and one column.
   *
   * Given as a CSS length compared against the container, not the viewport.
   */
  threshold?: Length
  /** Space between items. */
  gap?: Space
  /**
   * Above this many children, stay vertical at every width.
   *
   * Five items sharing one row are five narrow columns, and narrow columns are unreadable
   * long before they are narrow enough to trigger the threshold. The CSS-only version of
   * this rule is a quantity query — `:nth-last-child(n + 5) ~ *` — which needs a stylesheet
   * and reads like a puzzle. The child count is already known here, so this is one
   * comparison instead.
   */
  limit?: number
  /** Cross-axis alignment. Defaults to `stretch`. */
  align?: Align
}

/**
 * Items side by side above a threshold, stacked below it.
 *
 * The switch is one declaration on each item:
 *
 * ```css
 * flex-basis: calc((30rem - 100%) * 999);
 * flex-grow: 1;
 * ```
 *
 * `100%` resolves against the container, so when the container is wider than the threshold
 * the expression is negative; a negative `flex-basis` is invalid and clamps to zero, and
 * `flex-grow: 1` then shares the line equally between the items. When the container is
 * narrower, the expression is a very large positive number — every item demands far more
 * than the line can give, so `flex-wrap` puts each on a line of its own, where `flex-grow`
 * stretches it to full width. The `999` is not significant; it only needs to be large
 * enough that the intermediate case never appears.
 *
 * The result behaves like a breakpoint but is scoped to the component, so the same
 * Switcher flips at the right moment in a full-width page, in a two-column article, and
 * inside a dialog. A media query would be right in one of those three.
 *
 * Items are wrapped for the same reason as in {@link Sidebar}: the flex contract belongs
 * on the flex items, and these are the caller's elements.
 */
export function Switcher({
  as: Component = 'div',
  threshold = '30rem',
  gap = 'normal',
  limit,
  align,
  style,
  children,
  ref,
  ...rest
}: SwitcherProps): ReactNode {
  const items = Children.toArray(children)
  const vertical = limit !== undefined && items.length > limit

  const basis = vertical ? '100%' : `calc((${toLength(threshold)} - 100%) * 999)`

  return (
    <Component
      ref={ref}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: resolveSpace(gap),
        alignItems: alignValue(align),
        minInlineSize: 0,
        ...style,
      }}
      {...rest}
    >
      {items.map((child, index) => (
        <div
          key={isValidElement(child) && child.key !== null ? child.key : `vk-switcher-${index}`}
          style={{ flexGrow: 1, flexBasis: basis, minInlineSize: 0 }}
        >
          {child}
        </div>
      ))}
    </Component>
  )
}
