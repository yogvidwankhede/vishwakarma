// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Length parsing and scale membership.
 *
 * The interesting decision here is which units are checkable at all. `px` and `rem` resolve
 * to a fixed pixel value given a root font size, so they can be compared against a scale.
 * `em`, `%`, `ch`, `vw` and `calc()` cannot: their value depends on the element's own font
 * size, its parent's width, or the viewport, none of which a linter can see. Reporting them
 * anyway — "is 2em on the scale?" — is unanswerable, and a rule that asks unanswerable
 * questions is one people silence with a blanket disable rather than a targeted one.
 *
 * So the contract is narrow and honest: absolute lengths are checked, relative lengths are
 * ignored, and the documentation says so plainly.
 */

/** Convert a CSS length to pixels, or `undefined` if it is not resolvable statically. */
export function toPixels(value: string, rootFontSize = 16): number | undefined {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return undefined

  const match = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem)?$/.exec(trimmed)
  if (!match) return undefined
  const magnitude = Number.parseFloat(match[1] ?? '')
  if (!Number.isFinite(magnitude)) return undefined

  const unit = match[2]
  // A bare number is only a length in two places: `0`, and a React style object, where the
  // renderer appends `px` for us. Callers that are not in a style object should reject it.
  if (unit === undefined) return magnitude === 0 ? 0 : magnitude
  return unit === 'rem' ? magnitude * rootFontSize : magnitude
}

/** Whether a raw value is a bare number rather than a united length. */
export function isUnitless(value: string): boolean {
  return /^-?(?:\d+\.?\d*|\.\d+)$/.test(value.trim())
}

/** Where a value sits relative to the scale. */
export interface ScaleVerdict {
  /** Whether the value is an allowed step. */
  onScale: boolean
  /** The nearest allowed step below, if one exists. */
  below?: number
  /** The nearest allowed step above, if one exists. */
  above?: number
  /** The single closest allowed step. */
  nearest?: number
}

/**
 * Compare a pixel value against the scale.
 *
 * Sign is discarded before comparison. A negative margin is a legitimate technique and its
 * magnitude should still be a scale step; requiring `-16px` to appear in the scale array as
 * well as `16px` would double the size of every configuration for no benefit.
 */
export function checkScale(
  px: number,
  scale: readonly number[],
  exceptions: readonly number[] = [],
): ScaleVerdict {
  const magnitude = Math.abs(px)
  if (scale.includes(magnitude) || exceptions.includes(magnitude)) return { onScale: true }

  const sorted = [...scale].sort((a, b) => a - b)
  let below: number | undefined
  let above: number | undefined
  for (const step of sorted) {
    if (step < magnitude) below = step
    else if (above === undefined) above = step
  }

  const verdict: ScaleVerdict = { onScale: false }
  if (below !== undefined) verdict.below = below
  if (above !== undefined) verdict.above = above

  const nearest =
    below === undefined
      ? above
      : above === undefined
        ? below
        : magnitude - below <= above - magnitude
          ? below
          : above
  if (nearest !== undefined) verdict.nearest = nearest

  return verdict
}

/** Human-readable list of the steps either side, for use in a message. */
export function describeAlternatives(verdict: ScaleVerdict): string {
  const { below, above } = verdict
  if (below !== undefined && above !== undefined) return `${below}px or ${above}px`
  if (below !== undefined) return `${below}px`
  if (above !== undefined) return `${above}px`
  return 'a value from the scale'
}

/**
 * Utility bases whose arbitrary values belong on the spacing scale.
 *
 * Sizing utilities (`w-`, `h-`, `max-w-`) are deliberately absent from the default set.
 * `w-[52ch]` for a measure, `h-[100dvh]` for a viewport panel and `max-w-[38rem]` for a prose
 * column are all correct, deliberate, and off-scale by design — flagging them is the fastest
 * way to have this rule switched off wholesale, taking the padding and margin checks with it.
 * Projects that do want them can add them through the `utilities` option.
 */
export const DEFAULT_SPACING_UTILITIES: readonly string[] = [
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
  'translate-x',
  'translate-y',
]
