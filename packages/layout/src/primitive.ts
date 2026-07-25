/**
 * The shared contract every layout primitive in this package honours.
 *
 * Three decisions are encoded here, and all three are worth stating once rather than
 * re-litigating in eleven components.
 *
 * **Polymorphism is untyped by element.** `as` is `ElementType`, not a generic parameter
 * threaded through the props. Fully generic polymorphic components produce prop types that
 * are correct and unreadable: a single mistyped attribute yields a two-hundred-line error
 * mentioning every HTML element in existence, and deeply nested generic components hit the
 * "expression produces a union type that is too complex to represent" wall. The trade is
 * real — you do not get `href` checked when you write `as="a"` — but layout primitives are
 * containers, and the props people actually pass them are the ones on `HTMLAttributes`.
 *
 * **Hyphenated attributes still work.** TypeScript deliberately does not type-check JSX
 * attributes whose name is not a valid identifier, so `data-testid` and `data-state` pass
 * through these components without an index signature and without `any`.
 *
 * **Everything sets `min-inline-size: 0`.** See {@link MIN_INLINE_SIZE_NOTE}.
 */

import type { CSSProperties, ElementType, HTMLAttributes, Ref } from 'react'

/**
 * The single most common layout bug in modern CSS, and the one-line fix.
 *
 * A flex item's `min-width` is `auto`, not `0` — and `min-width: auto` on a flex or grid
 * item resolves to its *content's* minimum size. So an item containing a long unbroken
 * string, a `<pre>` block, an SVG with a wide `viewBox`, or a nested scroll container
 * cannot shrink below that content, no matter what `flex-shrink` or `overflow: hidden` or
 * `text-overflow: ellipsis` you put on it. The item pushes the row wider than its parent,
 * the page grows a horizontal scrollbar, and every ancestor looks innocent in devtools
 * because none of them is the culprit.
 *
 * The symptom is nearly always reported as "text-overflow: ellipsis doesn't work". It
 * works; the element simply never gets narrow enough for anything to overflow it.
 *
 * Every primitive here sets `min-inline-size: 0` on itself, so nesting Vishwakarma
 * primitives never produces the bug. A raw `<div>` or `<p>` you drop into a `Row` still
 * needs the fix applied by you — which is precisely why the primitives are worth using.
 *
 * On a block-level element outside a flex or grid context the declaration is a no-op, so
 * applying it unconditionally costs nothing.
 */
export const MIN_INLINE_SIZE_NOTE =
  'min-inline-size: 0 — a flex/grid item defaults to min-width: auto, which refuses to ' +
  'shrink below its content and is the usual cause of unexplained horizontal overflow.'

/**
 * Props common to every layout primitive.
 *
 * `ref` is a plain prop: React 19 forwards it to function components directly, so
 * `forwardRef` is dead weight and an extra component layer in the tree for nothing.
 */
export interface LayoutPrimitiveProps extends HTMLAttributes<HTMLElement> {
  /** Element or component to render. Defaults differ per primitive; each says which. */
  as?: ElementType
  /** Forwarded to the rendered element. */
  ref?: Ref<HTMLElement>
}

/**
 * Cross-axis alignment, named for what it does rather than for the CSS keyword.
 *
 * `start` and `end` rather than `flex-start` and `flex-end` because these map onto grid as
 * well as flex, and because the flex-prefixed keywords are a historical accident.
 */
export type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline'

/** Main-axis distribution. */
export type Justify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'

const ALIGN_VALUES: Record<Align, string> = {
  start: 'start',
  center: 'center',
  end: 'end',
  stretch: 'stretch',
  baseline: 'baseline',
}

const JUSTIFY_VALUES: Record<Justify, string> = {
  start: 'start',
  center: 'center',
  end: 'end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
}

/** Map an {@link Align} onto a CSS alignment keyword. */
export function alignValue(align: Align | undefined): string | undefined {
  return align === undefined ? undefined : ALIGN_VALUES[align]
}

/** Map a {@link Justify} onto a CSS distribution keyword. */
export function justifyValue(justify: Justify | undefined): string | undefined {
  return justify === undefined ? undefined : JUSTIFY_VALUES[justify]
}

/**
 * Attach CSS custom properties to a style object.
 *
 * React's `CSSProperties` has no index signature, so custom properties cannot be expressed
 * without a cast. The cast is confined to this one function rather than sprayed across
 * every component, and it is a widening cast over a `string`-keyed record — not `any`, so
 * the values are still checked.
 */
export function withVars(
  style: CSSProperties | undefined,
  vars: Record<string, string | number | undefined>,
): CSSProperties {
  const defined: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(vars)) {
    // An undefined custom property is worse than an absent one: it makes every declaration
    // referencing it invalid at computed-value time.
    if (value !== undefined) defined[key] = value
  }
  return { ...style, ...defined } as CSSProperties
}

/**
 * Join class names, skipping falsy entries.
 *
 * Deliberately not a dependency. The whole behaviour is four lines, and a layout package
 * that pulls in a package to concatenate strings has made a poor trade on the consumer's
 * behalf.
 */
export function cx(...parts: Array<string | false | null | undefined>): string | undefined {
  const joined = parts.filter(Boolean).join(' ')
  return joined.length > 0 ? joined : undefined
}

/**
 * A CSS length, given either as a scale-free string or as a number of pixels.
 *
 * Numbers are interpreted as `px` and should be rare. They exist for values that are
 * genuinely pixel-quantised — a hairline, a measured element width from a
 * {@link ResizeObserver} — not as a shortcut around the space scale.
 */
export type Length = string | number

/** Normalise a {@link Length} into a CSS length string. */
export function toLength(value: Length): string
export function toLength(value: Length | undefined): string | undefined
export function toLength(value: Length | undefined): string | undefined {
  if (value === undefined) return undefined
  return typeof value === 'number' ? `${value}px` : value
}
