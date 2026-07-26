// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * A parser for utility class names, with arbitrary values as the point of the exercise.
 *
 * A design contract that only reads CSS files sees almost nothing in a modern codebase,
 * because the spacing decisions are in `className` strings. And within those strings, the
 * named steps are rarely the problem: `p-4` is on the scale by construction, because the
 * scale is what generated it. The values that break a design system are the ones written
 * in arbitrary-value syntax — `p-[13px]`, `gap-[0.85rem]`, `duration-[430ms]` — precisely
 * because that syntax exists to escape the scale. A parser that skipped them would report
 * a clean project and be wrong.
 *
 * Parsing is done by hand rather than with a split on `-` and `:`, because both characters
 * appear inside arbitrary values and variants: `supports-[display:grid]:p-[13px]` contains
 * one variant and one utility, and any parser that splits naively finds four of each.
 *
 * The scales below are the stock defaults. A project with a customised theme needs to pass
 * its own, and this is the single largest source of false positives in the whole package —
 * see {@link TailwindTheme}.
 */

import { lengthToPx, lengthToRem, timeToMs, type UnitOptions } from './units.js'

/** A class name broken into its structural parts. */
export interface TailwindUtility {
  /** The token exactly as written, including variants. */
  raw: string
  /**
   * Variant segments in source order, e.g. `['md', 'hover']` for `md:hover:p-4`. Retained
   * because a value that only appears under `motion-reduce:` is a different finding from
   * one that always applies, even though this package does not yet use that distinction.
   */
  variants: string[]
  /** Whether the token carried the `!` importance marker. */
  important: boolean
  /** Whether the token carried a leading `-`, as in `-mt-4`. */
  negative: boolean
  /** The utility with variants, importance, negation and modifier removed, e.g. `p-4`. */
  base: string
  /** Contents of a trailing `[...]`, without the brackets, or `null` when there is none. */
  arbitrary: string | null
  /** A trailing `/…` modifier such as the `50` in `bg-black/50`, or `null`. */
  modifier: string | null
}

/**
 * Split a class attribute's contents into class-name tokens.
 *
 * Whitespace is the only separator, which is also true of the `class` attribute itself, so
 * this correctly handles multi-line template strings.
 */
export function tokenizeClassList(value: string): string[] {
  return value.split(/\s+/).filter((token) => token.length > 0)
}

/**
 * Parse a single class-name token.
 *
 * Always succeeds: a token that is not a recognisable utility still comes back with its
 * `base` set to the whole token, because a caller matching against known prefixes is
 * better placed than this function to decide that something is not interesting.
 */
export function parseTailwindClass(token: string): TailwindUtility {
  const raw = token
  let rest = token

  // Variants first. Scan for `:` at bracket and paren depth zero, so arbitrary variants
  // like `[&:hover]:` and `supports-[display:grid]:` survive intact.
  const variants: string[] = []
  let depth = 0
  let segmentStart = 0
  for (let i = 0; i < rest.length; i++) {
    const char = rest[i]
    if (char === '[' || char === '(') depth++
    else if (char === ']' || char === ')') depth--
    else if (char === ':' && depth === 0) {
      variants.push(rest.slice(segmentStart, i))
      segmentStart = i + 1
    }
  }
  rest = rest.slice(segmentStart)

  // `!` may lead or trail depending on the version in use; accept either.
  let important = false
  if (rest.startsWith('!')) {
    important = true
    rest = rest.slice(1)
  }
  if (rest.endsWith('!')) {
    important = true
    rest = rest.slice(0, -1)
  }

  let negative = false
  if (rest.startsWith('-')) {
    negative = true
    rest = rest.slice(1)
  }

  // Modifier: the last `/` outside brackets. Bracket-aware because arbitrary values
  // routinely contain slashes, as in `bg-[url(/hero.png)]`.
  let modifier: string | null = null
  depth = 0
  for (let i = rest.length - 1; i >= 0; i--) {
    const char = rest[i]
    if (char === ']' || char === ')') depth++
    else if (char === '[' || char === '(') depth--
    else if (char === '/' && depth === 0) {
      modifier = rest.slice(i + 1)
      rest = rest.slice(0, i)
      break
    }
  }

  let arbitrary: string | null = null
  if (rest.endsWith(']')) {
    const open = rest.indexOf('[')
    if (open !== -1) {
      // Underscores stand in for spaces in arbitrary values, since a class name cannot
      // contain a space. Restoring them matters for anything multi-part, such as
      // `shadow-[0_1px_3px_#0003]`.
      arbitrary = rest.slice(open + 1, -1).replace(/_/g, ' ')
    }
  }

  return { raw, variants, important, negative, base: rest, arbitrary, modifier }
}

/**
 * Split a utility base against a set of known prefixes, longest match first.
 *
 * `space-x-4` must resolve to the prefix `space-x` and not to `space`, and `p-[13px]` must
 * resolve to `p` with the value in brackets. Sorting by length is what makes both work
 * without a hand-ordered table.
 */
export function splitUtility(
  base: string,
  prefixes: readonly string[],
): { prefix: string; value: string } | null {
  let best: { prefix: string; value: string } | null = null

  for (const prefix of prefixes) {
    if (base === prefix) {
      if (!best || prefix.length > best.prefix.length) best = { prefix, value: '' }
      continue
    }
    if (!base.startsWith(`${prefix}-`)) continue
    if (best && prefix.length <= best.prefix.length) continue
    best = { prefix, value: base.slice(prefix.length + 1) }
  }

  return best
}

/* -------------------------------------------------------------------------- */
/* Scales                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The theme values the resolvers need.
 *
 * These default to the stock scales, which is right for the large majority of projects and
 * wrong in a way worth stating plainly for the rest: a project that redefines `text-lg` or
 * changes the spacing step gets confidently incorrect px values out of this package. The
 * override exists so that such a project can be audited honestly rather than noisily.
 */
export interface TailwindTheme {
  /** px per numeric spacing step. Stock is 4, so `p-4` is 16px. */
  spacingStepPx?: number
  /** Named font sizes, in rem. */
  fontSizesRem?: Record<string, number>
  /** Named border radii, in px. */
  radiiPx?: Record<string, number>
}

/** Stock named font sizes, in rem. */
export const TAILWIND_FONT_SIZES_REM: Record<string, number> = {
  xs: 0.75,
  sm: 0.875,
  base: 1,
  lg: 1.125,
  xl: 1.25,
  '2xl': 1.5,
  '3xl': 1.875,
  '4xl': 2.25,
  '5xl': 3,
  '6xl': 3.75,
  '7xl': 4.5,
  '8xl': 6,
  '9xl': 8,
}

/** Stock named border radii, in px. The empty key is the bare `rounded` utility. */
export const TAILWIND_RADII_PX: Record<string, number> = {
  '': 4,
  none: 0,
  sm: 2,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
}

/** Utility prefixes that set a spacing value. */
export const SPACING_PREFIXES = [
  'p',
  'px',
  'py',
  'pt',
  'pr',
  'pb',
  'pl',
  'ps',
  'pe',
  'm',
  'mx',
  'my',
  'mt',
  'mr',
  'mb',
  'ml',
  'ms',
  'me',
  'gap',
  'gap-x',
  'gap-y',
  'space-x',
  'space-y',
  'inset',
  'inset-x',
  'inset-y',
  'top',
  'right',
  'bottom',
  'left',
  'start',
  'end',
  'scroll-m',
  'scroll-mt',
  'scroll-mr',
  'scroll-mb',
  'scroll-ml',
  'scroll-p',
  'scroll-pt',
  'scroll-pr',
  'scroll-pb',
  'scroll-pl',
  'translate-x',
  'translate-y',
] as const

/** Utility prefixes that set a border radius. */
export const RADIUS_PREFIXES = [
  'rounded',
  'rounded-t',
  'rounded-r',
  'rounded-b',
  'rounded-l',
  'rounded-s',
  'rounded-e',
  'rounded-tl',
  'rounded-tr',
  'rounded-br',
  'rounded-bl',
  'rounded-ss',
  'rounded-se',
  'rounded-ee',
  'rounded-es',
] as const

/** Keyword spacing values that have no px equivalent and must not be reported. */
const SPACING_KEYWORDS = new Set(['auto', 'full', 'screen', 'min', 'max', 'fit', 'px', 'reverse'])

/**
 * Resolve a spacing utility to px, or `null` if the token is not a spacing utility or its
 * value cannot be resolved.
 *
 * Negative utilities report their magnitude. `-mt-4` and `mt-4` are the same decision about
 * the scale made in two directions, and reporting -16px would mean the contract's scale
 * membership test failed on a value that is perfectly on-scale.
 */
export function resolveTailwindSpacingPx(
  utility: TailwindUtility,
  theme: TailwindTheme = {},
  units: UnitOptions = {},
): number | null {
  const split = splitUtility(utility.base, SPACING_PREFIXES)
  if (!split) return null

  if (utility.arbitrary !== null) {
    // A single length only. `p-[13px_4px]` is legal but multi-valued, and the CSS scanner
    // is the better tool for those; reporting only the first part would be misleading.
    return lengthToPx(utility.arbitrary, { ...units, unitless: 'reject' })
  }

  const { value } = split
  if (value === '' || SPACING_KEYWORDS.has(value)) {
    // `p-px` is the one keyword with a real px value, and it is the hairline exception
    // most contracts explicitly allow, so it is worth resolving rather than skipping.
    return value === 'px' ? 1 : null
  }

  const step = Number(value)
  if (!Number.isFinite(step)) return null
  return Math.abs(step * (theme.spacingStepPx ?? 4))
}

/** Resolve a `text-*` utility to a font size in rem, or `null` when it is not one. */
export function resolveTailwindFontSizeRem(
  utility: TailwindUtility,
  theme: TailwindTheme = {},
  units: UnitOptions = {},
): number | null {
  if (!utility.base.startsWith('text-')) return null
  const value = utility.base.slice('text-'.length)

  if (utility.arbitrary !== null) {
    // `text-[…]` is overloaded: it sets a colour just as often as a size. Only a value
    // that parses as a length is a size, which also correctly ignores `text-[#0af]`.
    return lengthToRem(utility.arbitrary, { ...units, unitless: 'reject' })
  }

  const sizes = theme.fontSizesRem ?? TAILWIND_FONT_SIZES_REM
  return sizes[value] ?? null
}

/** Resolve a `rounded*` utility to a radius in px, or `null` when it is not one. */
export function resolveTailwindRadiusPx(
  utility: TailwindUtility,
  theme: TailwindTheme = {},
  units: UnitOptions = {},
): number | null {
  const split = splitUtility(utility.base, RADIUS_PREFIXES)
  if (!split) return null

  if (utility.arbitrary !== null) {
    return lengthToPx(utility.arbitrary, { ...units, unitless: 'reject' })
  }

  const radii = theme.radiiPx ?? TAILWIND_RADII_PX
  return radii[split.value] ?? null
}

/**
 * Resolve a `duration-*` utility to milliseconds, or `null` when it is not one.
 *
 * The named steps are already millisecond counts, so `duration-300` is 300ms with no table
 * involved. The arbitrary form needs a real time literal, which is why `duration-[0.4s]`
 * resolves and `duration-[400]` does not.
 */
export function resolveTailwindDurationMs(utility: TailwindUtility): number | null {
  const split = splitUtility(utility.base, ['duration', 'delay'])
  if (!split || split.prefix !== 'duration') return null

  if (utility.arbitrary !== null) return timeToMs(utility.arbitrary)

  const ms = Number(split.value)
  return Number.isFinite(ms) ? ms : null
}

/**
 * The CSS properties a transition or animation utility puts in motion.
 *
 * Resolved to real property names rather than utility names so the results can be checked
 * against the same layout-triggering property list the rest of the toolkit uses. This is
 * how `transition-all` gets caught: it animates `all`, which includes `width` and `height`,
 * and it is one of the most reliable causes of a janky interface there is.
 */
const TRANSITION_PROPERTIES: Record<string, string[]> = {
  transition: [
    'color',
    'background-color',
    'border-color',
    'opacity',
    'box-shadow',
    'transform',
    'filter',
  ],
  'transition-all': ['all'],
  'transition-colors': ['color', 'background-color', 'border-color'],
  'transition-opacity': ['opacity'],
  'transition-shadow': ['box-shadow'],
  'transition-transform': ['transform'],
  'transition-none': [],
}

const ANIMATION_PROPERTIES: Record<string, string[]> = {
  'animate-none': [],
  'animate-spin': ['transform'],
  'animate-ping': ['transform', 'opacity'],
  'animate-pulse': ['opacity'],
  'animate-bounce': ['transform'],
}

/** Resolve a transition or animation utility to the CSS properties it animates. */
export function resolveTailwindAnimatedProperties(utility: TailwindUtility): string[] {
  const direct = TRANSITION_PROPERTIES[utility.base] ?? ANIMATION_PROPERTIES[utility.base]
  if (direct) return direct

  if (utility.base.startsWith('transition-[') && utility.arbitrary !== null) {
    return utility.arbitrary
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
  }

  // A custom `animate-*` keyframes name. We know something is animating but not what; the
  // keyframes scanner picks up the properties if the definition is in the audited source.
  if (utility.base.startsWith('animate-')) return ['unknown']

  return []
}
