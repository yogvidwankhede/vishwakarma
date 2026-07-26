// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Modular scales and fluid interpolation.
 *
 * Two ideas do most of the work in making a layout feel composed rather than assembled.
 *
 * The first is that sizes should come from a scale, not from a person picking numbers.
 * When every heading, gap, and radius is a step on one geometric progression, the
 * relationships between them are consistent everywhere, and the eye reads that
 * consistency as intent — even though nobody consciously notices it. When sizes are
 * picked ad hoc you get 22px next to 24px next to 23px, and the eye reads *that* as
 * carelessness, also without noticing why.
 *
 * The second is that a size which is right on a laptop is rarely right on a phone. Fluid
 * interpolation solves this with a single CSS `clamp()` that scales with the viewport,
 * replacing a stack of breakpoint overrides that each need maintaining.
 */

/**
 * Named ratios for modular scales, smallest to largest.
 *
 * Below about 1.2 the steps are too close to establish hierarchy; above about 1.6 the
 * jump from body text to the next step is so violent that you lose the intermediate
 * sizes a real interface needs. Most product UI wants 1.2–1.333; editorial and marketing
 * pages can carry 1.414 and up because they have fewer levels and more whitespace.
 */
export const SCALE_RATIOS = {
  minorSecond: 1.067,
  majorSecond: 1.125,
  minorThird: 1.2,
  majorThird: 1.25,
  perfectFourth: 1.333,
  augmentedFourth: 1.414,
  perfectFifth: 1.5,
  goldenRatio: 1.618,
} as const

export type ScaleRatioName = keyof typeof SCALE_RATIOS

export interface ModularScaleOptions {
  /** The size at step 0, in whatever unit you intend to emit. */
  base: number
  /** Ratio between adjacent steps, or the name of a standard one. */
  ratio: number | ScaleRatioName
  /** How many steps below the base to generate. */
  stepsDown?: number
  /** How many steps above the base to generate. */
  stepsUp?: number
  /** Round each result to this many decimal places. */
  precision?: number
}

export interface ScaleStep {
  /** Position relative to the base. Negative is smaller. */
  step: number
  value: number
}

/** Resolve a ratio that may have been given by name. */
export function resolveRatio(ratio: number | ScaleRatioName): number {
  return typeof ratio === 'number' ? ratio : SCALE_RATIOS[ratio]
}

/**
 * Generate a geometric scale around a base value.
 *
 * Returned in ascending order so it can be rendered as a token table directly.
 */
export function modularScale(options: ModularScaleOptions): ScaleStep[] {
  const { base, ratio, stepsDown = 2, stepsUp = 6, precision = 4 } = options
  const r = resolveRatio(ratio)

  if (r <= 1) throw new RangeError(`A modular scale ratio must exceed 1, received ${r}`)
  if (base <= 0) throw new RangeError(`A modular scale base must be positive, received ${base}`)

  const steps: ScaleStep[] = []
  for (let step = -stepsDown; step <= stepsUp; step++) {
    steps.push({ step, value: Number((base * r ** step).toFixed(precision)) })
  }
  return steps
}

export interface FluidOptions {
  /** Value at the smallest supported viewport. */
  minValue: number
  /** Value at the largest supported viewport. */
  maxValue: number
  /** Viewport width, in px, where scaling begins. */
  minViewport?: number
  /** Viewport width, in px, where scaling stops. */
  maxViewport?: number
  /** Root font size assumed when converting px to rem. */
  rootFontSize?: number
  /** Unit the min/max values are expressed in. */
  unit?: 'rem' | 'px'
  precision?: number
}

/**
 * Build a CSS `clamp()` that interpolates linearly with viewport width.
 *
 * The output is expressed in `rem` plus a `vw` term rather than pure `vw`. That detail
 * matters for accessibility: a value defined only in viewport units ignores the user's
 * browser font-size setting entirely, so a reader who has increased their default text
 * size gets no benefit. Keeping a `rem` component preserves their preference while still
 * scaling with the screen.
 */
export function fluidClamp(options: FluidOptions): string {
  const {
    minValue,
    maxValue,
    minViewport = 360,
    maxViewport = 1440,
    rootFontSize = 16,
    unit = 'rem',
    precision = 4,
  } = options

  if (maxViewport <= minViewport) {
    throw new RangeError('maxViewport must be greater than minViewport')
  }

  // Normalise both ends to rem so the algebra below is unit-consistent.
  const minRem = unit === 'px' ? minValue / rootFontSize : minValue
  const maxRem = unit === 'px' ? maxValue / rootFontSize : maxValue

  const minVwRem = minViewport / rootFontSize
  const maxVwRem = maxViewport / rootFontSize

  // Solve value = slope * viewport + intercept across the two anchor points.
  const slope = (maxRem - minRem) / (maxVwRem - minVwRem)
  const intercept = minRem - slope * minVwRem

  const round = (value: number): number => Number(value.toFixed(precision))
  const vw = round(slope * 100)
  const base = round(intercept)

  // clamp() needs its bounds in ascending order; a shrinking value inverts them.
  const lower = Math.min(minRem, maxRem)
  const upper = Math.max(minRem, maxRem)

  const preferred = base === 0 ? `${vw}vw` : `${base}rem + ${vw}vw`
  return `clamp(${round(lower)}rem, ${preferred}, ${round(upper)}rem)`
}

export interface FluidScaleOptions extends Omit<ModularScaleOptions, 'base'> {
  /** Base size at the small viewport. */
  minBase: number
  /** Base size at the large viewport. */
  maxBase: number
  /** Ratio at the small viewport. */
  minRatio: number | ScaleRatioName
  /** Ratio at the large viewport. Usually larger — see note below. */
  maxRatio: number | ScaleRatioName
  minViewport?: number
  maxViewport?: number
  rootFontSize?: number
}

export interface FluidScaleStep {
  step: number
  min: number
  max: number
  clamp: string
}

/**
 * Generate a type scale that changes *ratio* as well as size across viewports.
 *
 * This is the part most scales get wrong. A ratio that gives a pleasing hierarchy on a
 * wide screen produces a headline that swamps a phone, because the small viewport has
 * less room for the extremes to breathe. Compressing the ratio at the small end and
 * expanding it at the large end keeps hierarchy legible at both, and it is why a good
 * responsive scale cannot be a single multiplier.
 */
export function fluidModularScale(options: FluidScaleOptions): FluidScaleStep[] {
  const {
    minBase,
    maxBase,
    minRatio,
    maxRatio,
    stepsDown = 2,
    stepsUp = 6,
    minViewport = 360,
    maxViewport = 1440,
    rootFontSize = 16,
    precision = 4,
  } = options

  const rMin = resolveRatio(minRatio)
  const rMax = resolveRatio(maxRatio)
  const round = (value: number): number => Number(value.toFixed(precision))

  const steps: FluidScaleStep[] = []
  for (let step = -stepsDown; step <= stepsUp; step++) {
    const min = round(minBase * rMin ** step)
    const max = round(maxBase * rMax ** step)
    steps.push({
      step,
      min,
      max,
      clamp: fluidClamp({ minValue: min, maxValue: max, minViewport, maxViewport, rootFontSize }),
    })
  }
  return steps
}

/**
 * Suggest a line height for a given font size.
 *
 * Line height and font size are inversely related: large text needs proportionally less
 * leading because the line itself already occupies enough vertical space for the eye to
 * track, while small text needs more to stop lines from visually merging. A single
 * `line-height: 1.5` across a whole type scale is the most common typographic mistake in
 * web UI, and it is why headings so often look untethered from their own paragraphs.
 */
export function suggestLineHeight(fontSizeRem: number): number {
  // Anchored at roughly 1.6 for 0.875rem body copy easing to 1.05 for display sizes.
  const raw = 1.72 - 0.28 * Math.log2(Math.max(fontSizeRem, 0.5) / 0.875 + 1)
  return Number(Math.min(Math.max(raw, 1.0), 1.75).toFixed(3))
}

/**
 * Suggest letter spacing, in em, for a given font size.
 *
 * Type designers fit spacing for text sizes. Scaled up to display sizes that same fitting
 * looks loose, and scaled down to caption sizes it looks cramped — so large text wants
 * negative tracking and small text wants positive. Applying zero tracking everywhere is
 * the tell of an interface that was never typeset.
 */
export function suggestLetterSpacing(fontSizeRem: number): number {
  if (fontSizeRem >= 3) return -0.022
  if (fontSizeRem >= 2) return -0.018
  if (fontSizeRem >= 1.5) return -0.014
  if (fontSizeRem >= 1.125) return -0.008
  if (fontSizeRem >= 0.9375) return 0
  if (fontSizeRem >= 0.8125) return 0.005
  return 0.012
}

/**
 * Optical measure: the character count a line should hold for comfortable reading.
 *
 * The 45–75 character range is the long-standing typographic recommendation, and it holds
 * up: below it the eye makes too many return sweeps, above it the eye loses its place
 * finding the next line. 66 is the usual sweet spot for continuous prose. UI text that is
 * scanned rather than read can run narrower.
 */
export const MEASURE = {
  tight: 45,
  comfortable: 66,
  loose: 75,
} as const

/** Convert a target character measure into a CSS `max-width` in `ch` units. */
export function measureToCh(characters: number = MEASURE.comfortable): string {
  return `${characters}ch`
}
