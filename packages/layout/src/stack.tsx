'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { Children, type ReactNode } from 'react'
import { alignValue, type Align, type LayoutPrimitiveProps } from './primitive.js'
import { resolveSpace, type Space } from './space.js'

export interface StackProps extends LayoutPrimitiveProps {
  /** Space between children. Defaults to the `normal` step. */
  gap?: Space
  /**
   * Push everything after the nth child to the bottom of the Stack.
   *
   * Counted in rendered children, one-based: `splitAfter={1}` keeps the first child at the
   * top and drives the rest to the bottom. Out-of-range values are ignored rather than
   * throwing, because the count is often data-driven and a card with one fewer row is not
   * an error worth crashing a page over.
   */
  splitAfter?: number
  /** Cross-axis alignment of children. Defaults to `stretch`, matching the CSS default. */
  align?: Align
  /**
   * Fill the parent's block size.
   *
   * Required for {@link StackProps.splitAfter} to do anything — see the note on the
   * component. Also what makes a column of cards in a grid line their footers up.
   */
  stretch?: boolean
}

/**
 * Vertical rhythm, owned by the container.
 *
 * The alternative is margins on the children — `& > * + *`, or a `:not(:last-child)` rule,
 * or a `margin-bottom` applied by each component to itself. All three fail in the same
 * way: the spacing between two elements becomes a property of the elements rather than of
 * the arrangement, so it is wrong the moment the arrangement changes. Reorder the children
 * and the rhythm breaks. Render one conditionally and you get a double gap or none.
 * Reuse a component in a tighter context and you are overriding its margin from outside,
 * which is how specificity wars start.
 *
 * `gap` cannot have any of those failures, because there is exactly one declaration and it
 * lives on the thing that owns the arrangement. It also does not collapse with the
 * children's own margins, which is what makes a Stack's spacing predictable when it
 * contains headings and paragraphs that carry UA margins of their own.
 *
 * ## The split
 *
 * `splitAfter` implements the "footer pinned to the bottom of the card" pattern with an
 * auto margin. Auto margins in a flex container absorb *free space*, so the technique has
 * one precondition that catches everyone: if the Stack is only as tall as its contents,
 * there is no free space, and nothing appears to happen. Pass `stretch` (or give the Stack
 * a `min-block-size`) and it works. This is the entire content of every "why doesn't
 * margin-top: auto work" question ever asked.
 *
 * The trailing children are wrapped in one element rather than cloning the nth child to
 * add a margin. Cloning breaks on text nodes and fragments, silently loses when the child
 * already sets its own `style`, and forces the child to be an element at all — none of
 * which the caller signed up for. The wrapper keeps the same gap internally, so the rhythm
 * is unchanged either side of the split.
 */
export function Stack({
  as: Component = 'div',
  gap = 'normal',
  splitAfter,
  align,
  stretch = false,
  style,
  children,
  ref,
  ...rest
}: StackProps): ReactNode {
  const gapValue = resolveSpace(gap)

  // Only pay for the array walk when a split was actually requested. Children.toArray
  // flattens fragments and drops nullish children, which is what makes the index match
  // what a reader counts on screen rather than what is written in the JSX.
  let content = children
  if (splitAfter !== undefined) {
    const items = Children.toArray(children)
    if (splitAfter > 0 && splitAfter < items.length) {
      content = (
        <>
          {items.slice(0, splitAfter)}
          <div
            style={{
              marginBlockStart: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: gapValue,
              alignItems: alignValue(align),
              minInlineSize: 0,
            }}
          >
            {items.slice(splitAfter)}
          </div>
        </>
      )
    }
  }

  return (
    <Component
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: gapValue,
        alignItems: alignValue(align),
        blockSize: stretch ? '100%' : undefined,
        // See MIN_INLINE_SIZE_NOTE in primitive.ts.
        minInlineSize: 0,
        ...style,
      }}
      {...rest}
    >
      {content}
    </Component>
  )
}
