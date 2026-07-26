// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * CSS literals, converted into the units the Design Contract speaks.
 *
 * The contract states spacing in px, type sizes in rem and durations in ms. Source code
 * states them in whatever the author felt like at the time. This module is the narrow
 * place where that translation happens, so that every extractor agrees on what `0.8rem`
 * means and there is exactly one line to change when a project sets a non-default root
 * font size.
 *
 * The important decision here is what to do with units that cannot be resolved statically.
 * `2em` depends on the computed font size of the parent element and `50%` depends on the
 * containing block; neither is knowable from text. We return `null` rather than guessing,
 * because a guessed px value produces a violation with a number in it that does not exist
 * anywhere in the user's code, and a false positive that specific destroys trust in the
 * whole report faster than ten missed violations do.
 */

/** The px value of `1rem` assumed when a project does not say otherwise. */
export const DEFAULT_ROOT_FONT_SIZE_PX = 16

export interface UnitOptions {
  /**
   * The px value of `1rem`. Overriding this is necessary for projects that set a non-16px
   * root size, and getting it wrong silently rescales every rem value in the report.
   */
  rootFontSizePx?: number
  /**
   * How to read a bare number with no unit.
   *
   * `'px'` is right for React inline-style objects, where `padding: 13` is 13 pixels.
   * `'reject'` is right for contexts where a unitless number means something else
   * entirely, such as `line-height`.
   */
  unitless?: 'px' | 'reject'
}

/** Units we can convert to px without knowing anything about the element or the viewport. */
const ABSOLUTE_TO_PX: Record<string, number> = {
  px: 1,
  pt: 4 / 3,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
}

const LENGTH_PATTERN = /^([+-]?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i

/** Round to a sane number of decimals so 0.1 + 0.2 style drift never reaches a report. */
function round(value: number, places = 4): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/**
 * Convert a CSS length literal to pixels, or `null` when it cannot be resolved statically.
 *
 * Relative units (`em`, `%`, `ch`, `vw`, and friends) deliberately return `null` — see the
 * module note. Callers that care about the difference between "not a length" and "a length
 * we cannot resolve" should check {@link isRelativeLength} first.
 */
export function lengthToPx(literal: string, options: UnitOptions = {}): number | null {
  const match = LENGTH_PATTERN.exec(literal.trim())
  if (!match) return null

  const rawNumber = match[1]
  const unit = (match[2] ?? '').toLowerCase()
  if (rawNumber === undefined) return null

  const value = Number(rawNumber)
  if (!Number.isFinite(value)) return null

  if (unit === '') {
    if (value === 0) return 0
    return (options.unitless ?? 'px') === 'px' ? value : null
  }

  if (unit === 'rem') return round(value * (options.rootFontSizePx ?? DEFAULT_ROOT_FONT_SIZE_PX))

  const factor = ABSOLUTE_TO_PX[unit]
  return factor === undefined ? null : round(value * factor)
}

/** Whether a literal is a length whose px value depends on runtime context. */
export function isRelativeLength(literal: string): boolean {
  const match = LENGTH_PATTERN.exec(literal.trim())
  const unit = (match?.[2] ?? '').toLowerCase()
  if (unit === '' || unit === 'rem') return false
  return ABSOLUTE_TO_PX[unit] === undefined
}

/** Convert a CSS length literal to rem, or `null` when it cannot be resolved statically. */
export function lengthToRem(literal: string, options: UnitOptions = {}): number | null {
  const px = lengthToPx(literal, options)
  if (px === null) return null
  return round(px / (options.rootFontSizePx ?? DEFAULT_ROOT_FONT_SIZE_PX))
}

const TIME_PATTERN = /^([+-]?(?:\d+\.?\d*|\.\d+))(ms|s)?$/i

/**
 * Convert a CSS time literal to milliseconds.
 *
 * A bare number is rejected. In CSS it is simply invalid, and in JavaScript it is almost
 * always already milliseconds and will have been read as such by the caller — treating it
 * as a time here would mean every `duration: 4` in a spring config arrived in the motion
 * report as a 4ms animation.
 */
export function timeToMs(literal: string): number | null {
  const match = TIME_PATTERN.exec(literal.trim())
  if (!match) return null

  const rawNumber = match[1]
  if (rawNumber === undefined) return null
  const value = Number(rawNumber)
  if (!Number.isFinite(value)) return null

  const unit = (match[2] ?? '').toLowerCase()
  if (unit === 'ms') return round(value)
  if (unit === 's') return round(value * 1000)
  return null
}

/** Convert px to rem at the configured root size. */
export function pxToRem(px: number, options: UnitOptions = {}): number {
  return round(px / (options.rootFontSizePx ?? DEFAULT_ROOT_FONT_SIZE_PX))
}
