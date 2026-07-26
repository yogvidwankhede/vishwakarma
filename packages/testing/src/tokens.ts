/**
 * Token conformance.
 *
 * The promise a design system makes is not "these components exist"; it is "every value in
 * the interface came from a decided set". The second promise is the one that decays,
 * because it decays one `margin-top: 13px` at a time and each individual instance is
 * defensible. Nothing catches it in review, because nothing in review is looking at
 * numbers.
 *
 * This module looks at the numbers. It reads *computed* values rather than authored ones,
 * which is the only way to catch the real offenders: a value that arrives through a
 * shorthand, through a cascade from a parent, through an inline style set by a third-party
 * widget, or through a `var()` that resolves to something not on the scale. An authored
 * source-text check — a lint rule over stylesheets — cannot see any of those.
 *
 * The cost of reading computed values is that everything arrives in px and seconds
 * regardless of how it was written, so the scale has to declare its unit and the
 * conversion happens here. `rem` scales in particular need a root font size; assuming 16
 * silently is wrong on any product that sets a different root, so it is a parameter with
 * a documented default.
 */

import type { DesignContract } from '@vishwakarma/core'
import {
  computedStyle,
  describeElement,
  parsePx,
  parseTimeMs,
  type TestElement,
  toArray,
} from './dom.js'

/** A set of permitted values for a family of CSS properties. */
export interface TokenScale {
  /** Human name, used in messages: `spacing`, `radius`, `duration`. */
  name: string
  /** The longhand CSS properties this scale governs. */
  properties: string[]
  /** Permitted values, expressed in `unit`. */
  values: number[]
  /** The unit `values` are given in. Computed styles are converted to match. */
  unit: 'px' | 'rem' | 'ms'
  /**
   * Values permitted despite being off-scale. Hairlines and optical corrections are the
   * legitimate cases; anything else here is a decision someone should have to defend, so
   * keep the list short and reviewed.
   */
  exceptions?: number[]
  /** Token name per value, so the fix can say `var(--vk-space-3)` rather than `12px`. */
  tokenNames?: Record<number, string>
  /** Root font size for `rem` conversion. Defaults to 16. */
  rootFontSizePx?: number
}

export interface TokenViolation {
  element: TestElement
  property: string
  /** The computed value verbatim. */
  computed: string
  /** The value converted into the scale's unit. */
  value: number
  /** Closest permitted value, or null when the scale is empty. */
  nearest: number | null
  /** Token name for `nearest`, when one was supplied. */
  nearestToken?: string
  /** Found, required, and the fix, ready to print. */
  message: string
}

/** The longhands that carry spacing. Shorthands never appear in computed styles. */
export const SPACING_PROPERTIES = [
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'row-gap',
  'column-gap',
]

/** Corner radii. Each can compute to two lengths when the corner is elliptical. */
export const RADIUS_PROPERTIES = [
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
]

/** Time-valued properties. Note that these compute to seconds, not milliseconds. */
export const DURATION_PROPERTIES = ['transition-duration', 'animation-duration']

const nearestIn = (values: number[], value: number): number | null =>
  values.length === 0
    ? null
    : values.reduce((best, candidate) =>
        Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best,
      )

/**
 * Convert a computed value into the scale's unit.
 *
 * Returns null for anything without a number — `auto`, `normal`, `none` — which is not a
 * violation. A scale constrains the values you choose, not the ones you decline to set.
 */
function toScaleUnit(computed: string, scale: TokenScale): number | null {
  if (scale.unit === 'ms') {
    // Multi-value transition lists compute to a comma-separated set; each entry is checked.
    const first = computed.split(',')[0]?.trim() ?? ''
    return parseTimeMs(first)
  }

  // An elliptical radius computes to two lengths. The first is the horizontal one and is
  // the value a designer would recognise; asserting on both would double every message.
  const first = computed.split(/\s+/)[0]?.trim() ?? ''
  const px = parsePx(first)
  if (px === null) return null
  return scale.unit === 'rem' ? px / (scale.rootFontSizePx ?? 16) : px
}

const format = (value: number, unit: TokenScale['unit']): string =>
  `${Number(value.toFixed(4))}${unit}`

/** Every value from `scale`, split into a comma list for the message. */
const listValues = (scale: TokenScale): string =>
  scale.values.map((value) => format(value, scale.unit)).join(', ')

/**
 * Check one element's computed values against a scale.
 *
 * Multi-value properties are split, so `transition-duration: 200ms, 3s` reports the 3s
 * entry and not the compliant one.
 */
export function checkTokenScale(element: TestElement, scale: TokenScale): TokenViolation[] {
  const style = computedStyle(element)
  const allowed = new Set([...scale.values, ...(scale.exceptions ?? [])])
  const violations: TokenViolation[] = []

  for (const property of scale.properties) {
    const raw = style.getPropertyValue(property).trim()
    if (raw === '') continue

    const entries = scale.unit === 'ms' ? raw.split(',') : [raw]
    for (const entry of entries) {
      const value = toScaleUnit(entry.trim(), scale)
      if (value === null) continue
      // Zero is always permissible. It is the absence of the thing the scale governs, and
      // a scale that has to list 0 explicitly forces every consumer to remember to.
      if (value === 0 || allowed.has(value)) continue

      const nearest = nearestIn(scale.values, value)
      const token = nearest === null ? undefined : scale.tokenNames?.[nearest]
      const replacement =
        token !== undefined
          ? `var(${token})`
          : nearest === null
            ? 'a value from the scale'
            : format(nearest, scale.unit)

      violations.push({
        element,
        property,
        computed: entry.trim(),
        value,
        nearest,
        ...(token === undefined ? {} : { nearestToken: token }),
        message: [
          `  Element:  ${describeElement(element)}`,
          `  Found:    ${property}: ${entry.trim()}${scale.unit === 'rem' ? ` (${format(value, 'rem')} at a ${scale.rootFontSizePx ?? 16}px root)` : ''}`,
          `  Required: a value from the ${scale.name} scale — ${listValues(scale)}`,
          `  Fix:      ${property}: ${replacement};`,
        ].join('\n'),
      })
    }
  }

  return violations
}

/**
 * Check an element and every descendant.
 *
 * Whole-subtree checking is the useful mode, because the value that drifted is rarely on
 * the component you rendered — it is on the third `<div>` inside it that someone nudged.
 */
export function checkTokenScaleDeep(
  root: TestElement,
  scale: TokenScale,
  options: { maxElements?: number } = {},
): TokenViolation[] {
  const limit = options.maxElements ?? 500
  const elements = [root, ...toArray(root.querySelectorAll('*'))].slice(0, limit)
  return elements.flatMap((element) => checkTokenScale(element, scale))
}

/**
 * Derive the standard scales from a Design Contract.
 *
 * Keeps the two in step. A team that has already written a contract should not then have
 * to restate the same numbers in their test setup, because the restatement is what goes
 * stale — and a stale test scale passes values the contract forbids.
 */
export function tokenScalesFromContract(
  contract: DesignContract,
  options: { rootFontSizePx?: number; tokenNames?: Record<string, Record<number, string>> } = {},
): TokenScale[] {
  const rootFontSizePx = options.rootFontSizePx ?? 16

  // Token names are optional per scale, and an absent map must stay absent rather than
  // become `tokenNames: undefined` — the fix text branches on the property existing.
  const names = (scale: string): Pick<TokenScale, 'tokenNames'> => {
    const map = options.tokenNames?.[scale]
    return map ? { tokenNames: map } : {}
  }

  const scales: TokenScale[] = [
    {
      name: 'spacing',
      properties: SPACING_PROPERTIES,
      values: contract.spacing.scale,
      unit: 'px',
      ...(contract.spacing.exceptions ? { exceptions: contract.spacing.exceptions } : {}),
      ...names('spacing'),
    },
    {
      name: 'type size',
      properties: ['font-size'],
      values: contract.typography.sizes,
      unit: 'rem',
      rootFontSizePx,
      ...names('type size'),
    },
    {
      name: 'duration',
      properties: DURATION_PROPERTIES,
      values: contract.motion.durations,
      unit: 'ms',
      ...names('duration'),
    },
  ]

  if (contract.layout.radii) {
    scales.push({
      name: 'radius',
      properties: RADIUS_PROPERTIES,
      values: contract.layout.radii,
      unit: 'px',
      ...names('radius'),
    })
  }

  return scales
}
