'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode, useEffect, useState } from 'react'
import type { LayoutPrimitiveProps } from './primitive.js'
import { useMergedRef } from './refs.js'

/**
 * Container queries, and why a component should never ask about the viewport.
 *
 * A media query asks how wide the window is. A component almost never wants to know that.
 * A card does not care whether the browser is 1600px wide; it cares whether *it* has 600px
 * to work with — and the same card is 1100px wide in the main column, 280px wide in the
 * sidebar, and 340px wide inside a dialog, all at that one viewport width. A component
 * styled by media query is therefore correct in exactly the context it was designed in and
 * wrong everywhere else, which is why "this component looks broken in the sidebar" is such
 * a familiar bug report and why it is usually fixed by adding a variant prop rather than
 * by fixing the query.
 *
 * Container queries remove the class of bug entirely: the component reads its own
 * available inline size, so it is correct wherever it is placed and needs no variants.
 *
 * CSS container queries handle *styling*. They cannot change what is rendered — you cannot
 * express "below 480px render a definition list instead of a table" in CSS, and faking it
 * by rendering both and hiding one ships the cost of both and puts duplicate content in
 * the accessibility tree. That is the job {@link useContainerSize} does, and the only
 * reason to reach for measurement in JavaScript rather than CSS.
 */

export interface ContainerSize {
  /** Size along the inline axis — width in a horizontal writing mode. */
  inlineSize: number
  /** Size along the block axis — height in a horizontal writing mode. */
  blockSize: number
}

export interface UseContainerSizeOptions {
  /**
   * Which box to measure. Defaults to `content-box`.
   *
   * `border-box` is usually what you want when deciding a layout, because padding and
   * border are part of what the element occupies. `content-box` is the default only
   * because it is the ResizeObserver default and quietly changing that would surprise
   * anyone reading the spec alongside this code.
   */
  box?: 'content-box' | 'border-box'
}

export interface UseContainerSizeResult<T extends Element> {
  /** Attach to the element to measure. */
  ref: (node: T | null) => void
  /** `null` until the first observation lands — including during server rendering. */
  size: ContainerSize | null
  /** The observed element, for callers that need it. */
  element: T | null
}

/**
 * Measure an element's own size, and keep measuring it.
 *
 * ## Why the ref is a state setter
 *
 * The obvious implementation stores the node in a `useRef` and starts the observer in an
 * effect. It is wrong in a way that is hard to see: an effect cannot depend on
 * `ref.current`, because mutating a ref does not schedule a render. So when the observed
 * node is swapped — conditional rendering, a keyed list re-order, a portal moving — the
 * effect does not re-run and the observer stays attached to a node that is no longer in
 * the document. The measurements simply stop updating, and nothing anywhere reports an
 * error.
 *
 * A callback ref backed by state is the fix. React calls it with the node when it mounts
 * and with `null` when it unmounts, the state change schedules a render, and the effect
 * re-runs against the correct element every time. The setter from `useState` is referen-
 * tially stable, so passing it as the ref does not cause a detach/attach cycle on every
 * render — which the naive inline arrow function does.
 *
 * ## Why the state update is guarded
 *
 * "ResizeObserver loop completed with undelivered notifications" is the console error you
 * get when an observer callback changes layout in a way that resizes an observed element,
 * which schedules another callback, forever. Anything that renders based on its own
 * measured size is a candidate. Bailing out when the numbers have not changed breaks the
 * cycle after one iteration: the second pass computes the same size, no state update
 * happens, no render happens, and the loop terminates.
 */
export function useContainerSize<T extends Element = HTMLElement>(
  options: UseContainerSizeOptions = {},
): UseContainerSizeResult<T> {
  // Destructured to a primitive so the effect's dependency is stable even when the caller
  // passes a fresh options object literal on every render — which they will.
  const { box = 'content-box' } = options

  const [element, setElement] = useState<T | null>(null)
  const [size, setSize] = useState<ContainerSize | null>(null)

  useEffect(() => {
    if (!element) {
      setSize(null)
      return
    }

    // No ResizeObserver means an ancient browser or a JSDOM test environment. One
    // measurement is better than none: components that switch on size get a plausible
    // answer instead of being stuck in their pre-measurement fallback forever.
    if (typeof ResizeObserver === 'undefined') {
      const rect = element.getBoundingClientRect()
      setSize({ inlineSize: rect.width, blockSize: rect.height })
      return
    }

    const observer = new ResizeObserver((entries) => {
      // Entries are batched; only the most recent one describes the current state.
      const entry = entries[entries.length - 1]
      if (!entry) return

      // The box-size properties are arrays because a fragmented box — an inline element
      // broken across lines, a multi-column flow — has more than one. For the block-level
      // containers this hook is used on there is exactly one, but the index still has to
      // be guarded, and the older `contentRect` is the fallback for browsers that shipped
      // ResizeObserver before the box-size properties existed.
      const boxes = box === 'border-box' ? entry.borderBoxSize : entry.contentBoxSize
      const first = boxes[0]
      const next: ContainerSize = first
        ? { inlineSize: first.inlineSize, blockSize: first.blockSize }
        : { inlineSize: entry.contentRect.width, blockSize: entry.contentRect.height }

      setSize((previous) =>
        previous && previous.inlineSize === next.inlineSize && previous.blockSize === next.blockSize
          ? previous
          : next,
      )
    })

    observer.observe(element, { box })

    // disconnect() rather than unobserve(): it also discards any observations already
    // queued for this observer, so a callback cannot fire against an unmounted component
    // between the effect cleanup and the next frame.
    return () => observer.disconnect()
  }, [element, box])

  return { ref: setElement, size, element }
}

export interface ContainerQueryState<Name extends string> {
  /** Measured inline size, or `null` before the first observation. */
  inlineSize: number | null
  /** Measured block size, or `null` before the first observation. */
  blockSize: number | null
  /** One boolean per named breakpoint: true when the container is at least that wide. */
  matches: Record<Name, boolean>
  /** Whether a real measurement has landed, as opposed to the assumed starting width. */
  measured: boolean
}

export interface ContainerQueryProps<B extends Record<string, number>>
  extends Omit<LayoutPrimitiveProps, 'children'> {
  /** Named minimum inline sizes, in px. */
  breakpoints?: B
  /**
   * Container name, so descendants can target this specific container in CSS with
   * `@container <name> (min-width: …)`.
   *
   * Worth setting whenever containers nest. An unnamed `@container` rule resolves against
   * the nearest ancestor container, which is rarely the one the author had in mind once
   * a card containing a card exists.
   */
  name?: string
  /**
   * Inline size to assume before measurement, in px.
   *
   * There is no honest answer during server rendering, so this is a choice about which way
   * to be wrong. Assuming narrow means a wide container briefly renders its compact layout
   * and then reflows; assuming wide means the reverse. Prefer the value that matches the
   * majority of real placements, and prefer CSS container queries over this component
   * whenever styling alone would do, because CSS has the right answer at first paint and
   * this cannot.
   */
  defaultInlineSize?: number
  /** Either plain children, or a function of the measured state. */
  children: ReactNode | ((state: ContainerQueryState<keyof B & string>) => ReactNode)
}

/**
 * Establish a query container, and optionally render from its measured size.
 *
 * With plain children this is simply an element carrying `container-type: inline-size`,
 * which is all that CSS container queries in descendant stylesheets require. With a
 * function child it additionally measures, so the *markup* can differ by available width.
 *
 * One trap is worth knowing before using this anywhere: `container-type: inline-size`
 * makes the element's inline size independent of its contents. That is what makes the
 * query non-circular, and it is also why applying it to a shrink-to-fit element — an
 * inline-block, a float, a grid or flex item sized by its content — collapses that element
 * to the width its parent gives it, which is often zero. If a container disappears the
 * moment it becomes a container, this is why: give it an explicit width, or move
 * `container-type` to an ancestor that is already block-level.
 */
export function ContainerQuery<B extends Record<string, number> = Record<string, number>>({
  as: Component = 'div',
  breakpoints,
  name,
  defaultInlineSize,
  style,
  children,
  ref: _ref,
  ...rest
}: ContainerQueryProps<B>): ReactNode {
  const { ref, size } = useContainerSize<HTMLElement>({ box: 'border-box' })
  const mergedRef = useMergedRef<HTMLElement>(ref, _ref)

  const isRenderProp = typeof children === 'function'
  const inlineSize = size?.inlineSize ?? defaultInlineSize ?? null

  let content: ReactNode
  if (isRenderProp) {
    const matches: Record<string, boolean> = {}
    for (const [key, minimum] of Object.entries(breakpoints ?? {})) {
      matches[key] = inlineSize !== null && inlineSize >= minimum
    }

    content = children({
      inlineSize,
      blockSize: size?.blockSize ?? null,
      // The cast re-attaches the key names that Object.entries erases to `string`. The
      // record was built from exactly those keys one line above.
      matches: matches as Record<keyof B & string, boolean>,
      measured: size !== null,
    })
  } else {
    content = children
  }

  return (
    <Component
      // Only measure when someone is going to read the measurement. A ContainerQuery used
      // purely to enable CSS container queries should not pay for a ResizeObserver and a
      // render per resize.
      ref={isRenderProp ? mergedRef : _ref}
      style={{
        containerType: 'inline-size',
        containerName: name,
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
