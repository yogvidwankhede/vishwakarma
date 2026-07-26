// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Scroll geometry as pure functions of measured position.
 *
 * Everything in this file takes a measurement and returns an answer. Nothing accumulates,
 * nothing remembers the previous frame, and nothing depends on how the user arrived at the
 * current scroll offset. That is a deliberate constraint rather than a stylistic one.
 *
 * The alternative — the approach almost every hand-rolled scroll effect takes — is to sum
 * scroll deltas: `progress += event.deltaY / span`. It looks equivalent and is not. It
 * breaks in four ways that only show up in production. Reloading the page halfway down
 * restores the scroll position but starts the accumulator at zero, so the effect is a full
 * span out of step. Fast scrolling, a fling on a trackpad, or a jump from find-in-page
 * moves hundreds of pixels between two frames, and any clamping applied per frame quietly
 * loses the remainder. Anchor navigation and `scrollIntoView` produce no deltas worth the
 * name at all. And floating-point error compounds over a long page, so the effect never
 * quite reaches 1.
 *
 * Deriving progress from position instead makes the function idempotent: the same scroll
 * offset always yields the same progress, no matter how many frames were dropped or how the
 * offset was reached. That is the whole trick, and it costs nothing.
 */

/** Which axis a scroll measurement is taken along. */
export type Axis = 'y' | 'x'

/**
 * A point at which an element's edge meets a viewport edge.
 *
 * `element` and `viewport` are fractions: 0 is the leading edge (top, or left in horizontal
 * mode), 0.5 the centre, 1 the trailing edge. `px` is an extra offset subtracted from the
 * resulting scroll position, which exists so a sticky element with `top: 64px` can describe
 * a range that accounts for its own offset — the only case a fraction cannot express.
 */
export interface ScrollAnchor {
  /** Fraction along the element, 0..1. */
  element: number
  /** Fraction along the viewport, 0..1. */
  viewport: number
  /** Additional pixel offset. Positive values move the anchor earlier. */
  px?: number
}

/** The scroll span over which progress runs from 0 to 1. */
export interface ScrollRange {
  /** Where progress is 0. */
  from: ScrollAnchor
  /** Where progress is 1. */
  to: ScrollAnchor
}

/**
 * Named spans, chosen to line up with the ranges CSS scroll-driven animations already
 * understand so that the native and scripted paths agree to the pixel.
 */
export type ScrollRangePreset = 'cover' | 'contain' | 'enter' | 'exit' | 'pin'

/** Accepts either a named span or an explicit one. */
export type ScrollRangeInput = ScrollRangePreset | ScrollRange

/**
 * The named spans.
 *
 * `cover` runs from the moment the element's top touches the bottom of the viewport to the
 * moment its bottom leaves the top: the element is on screen for the whole of it. `contain`
 * runs over the period the element is entirely visible, which for an element taller than
 * the viewport is instead the period the element entirely covers the viewport — the same
 * inversion CSS makes, and the reason `pin` and `contain` describe the same span for a
 * pinned section.
 */
export const SCROLL_RANGES: Record<ScrollRangePreset, ScrollRange> = {
  cover: { from: { element: 0, viewport: 1 }, to: { element: 1, viewport: 0 } },
  contain: { from: { element: 1, viewport: 1 }, to: { element: 0, viewport: 0 } },
  enter: { from: { element: 0, viewport: 1 }, to: { element: 1, viewport: 1 } },
  exit: { from: { element: 0, viewport: 0 }, to: { element: 1, viewport: 0 } },
  pin: { from: { element: 0, viewport: 0 }, to: { element: 1, viewport: 1 } },
}

/** Normalise the two accepted forms of range into one. */
export function resolveScrollRange(input: ScrollRangeInput = 'cover'): ScrollRange {
  return typeof input === 'string' ? SCROLL_RANGES[input] : input
}

/** A single layout measurement, in document coordinates along one axis. */
export interface ElementMetrics {
  /** The element's leading edge, measured from the top (or left) of the document. */
  offset: number
  /** The element's extent along the axis. */
  size: number
  /** The scrollport's extent along the axis. */
  viewport: number
}

/** The scroll offsets at which a range begins and ends. */
export interface ScrollSpan {
  /** Scroll offset at which progress is 0. */
  start: number
  /** Scroll offset at which progress is 1. */
  end: number
}

/**
 * Convert a range into the two scroll offsets that bound it.
 *
 * Working in document coordinates rather than viewport coordinates is what makes the result
 * independent of the current scroll position, and therefore safe to recompute at any time.
 */
export function scrollSpanFor(metrics: ElementMetrics, range: ScrollRange): ScrollSpan {
  const anchor = (a: ScrollAnchor): number =>
    metrics.offset + a.element * metrics.size - a.viewport * metrics.viewport - (a.px ?? 0)

  return { start: anchor(range.from), end: anchor(range.to) }
}

/** Clamp to the unit interval. */
export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

/**
 * Progress of `scroll` through a span, clamped to 0..1.
 *
 * A zero-length span is not an error — it happens whenever an element is measured before
 * layout, or when a custom range collapses at a particular viewport size. Returning a hard
 * 0 or 1 rather than `NaN` keeps a transiently degenerate measurement from poisoning a CSS
 * custom property, which would otherwise make the declaration invalid and drop the styling
 * entirely.
 */
export function progressWithin(scroll: number, span: ScrollSpan): number {
  const length = span.end - span.start
  if (length === 0) return scroll >= span.start ? 1 : 0
  return clamp01((scroll - span.start) / length)
}

/**
 * Quantise progress so that state-backed consumers do not re-render on every frame.
 *
 * A value the browser interpolates in CSS wants full precision; a value that drives a React
 * render wants as little as the design can tolerate. The rounding is applied to the ratio
 * before scaling back so the result lands exactly on step boundaries, which in turn makes
 * the equality check that suppresses the update reliable.
 */
export function quantise(progress: number, step: number): number {
  if (step <= 0) return progress
  return clamp01(Math.round(progress / step) * step)
}

/**
 * The equivalent CSS `animation-range` keyword, or `null` if there is none.
 *
 * Only the named spans have an exact CSS counterpart. An arbitrary anchor pair could be
 * approximated with percentage ranges, but approximation is precisely what would cause the
 * native and scripted paths to disagree — so a custom range simply declines the native path
 * instead. `pin` maps to `contain`, because for a subject taller than the scrollport CSS
 * defines `contain` as the period the subject covers it, which is the pinned span.
 */
export function nativeRangeFor(input: ScrollRangeInput): string | null {
  if (typeof input !== 'string') return null
  switch (input) {
    case 'cover':
      return 'cover'
    case 'contain':
      return 'contain'
    case 'pin':
      return 'contain'
    case 'enter':
      return 'entry'
    case 'exit':
      return 'exit'
    default:
      return null
  }
}
