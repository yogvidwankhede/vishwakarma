// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Effective contrast, measured the way the eye sees it.
 *
 * The naive implementation of this — and it is what almost every hand-rolled contrast
 * assertion does — is two lines:
 *
 * ```
 * const style = getComputedStyle(element)
 * return contrastRatio(parse(style.color), parse(style.backgroundColor))
 * ```
 *
 * It is wrong in four independent ways, and each one produces a *confident* wrong answer
 * rather than an error, which is why the bugs survive so long.
 *
 * 1. `background-color` does not inherit. Its initial value is `rgba(0, 0, 0, 0)`. Most
 *    text sets no background of its own, so the naive version reads transparent-black and
 *    then treats it as black. On a white page with dark text it reports something close to
 *    1:1 and fails a passing design; on a white page with white-on-brand text it reports a
 *    huge ratio and passes a design that is unreadable. It is not merely imprecise, it is
 *    frequently inverted.
 *
 * 2. Partial alpha composites. A surface at `rgb(0 0 0 / 0.06)` over white is a very light
 *    grey. Treated as opaque black it is the darkest possible backdrop.
 *
 * 3. `opacity` on an ancestor multiplies through the whole subtree. Text at full-strength
 *    colour inside a container at `opacity: 0.6` has substantially less contrast than its
 *    declared colour claims, and this is one of the most common real-world failures —
 *    "secondary" text implemented by fading the container rather than by choosing a colour.
 *
 * 4. When nothing in the ancestor chain paints an opaque background, the backdrop is the
 *    canvas, which is white by default — not black.
 *
 * So the resolution here walks the ancestor chain, collects each layer with its effective
 * alpha, and composites them back to front over an opaque canvas. Where that cannot give
 * an honest answer — a gradient, an image, a colour the parser will not guess at — the
 * result is marked indeterminate rather than fabricated, and the caller is told to supply
 * the backdrop explicitly.
 */

import {
  contrastRatio,
  findAccessibleLightness,
  type Oklch,
  oklchToRgb,
  type Rgb,
  rgbToOklch,
  toHex,
} from '@vishwakarma/core'
import { alphaOf, compositeOver, formatColour, parseCssColour } from './css-colour.js'
import { ancestorChain, computedStyle, parseFontWeight, parsePx, type TestElement } from './dom.js'

/** One painted layer discovered while walking outwards from the element. */
export interface BackgroundLayer {
  /** The element that paints it. */
  element: TestElement
  /** The computed `background-color`, verbatim, for the failure message. */
  declared: string
  /** Parsed colour, or null when the value could not be resolved without more context. */
  colour: Rgb | null
  /** Alpha after multiplying in the `opacity` of this element and every ancestor above it. */
  effectiveAlpha: number
  /** Whether this element also paints a `background-image`, which colours cannot describe. */
  hasImage: boolean
}

/** Which contrast threshold applies. */
export type ContrastKind = 'body' | 'large' | 'non-text'

export interface ContrastOptions {
  /**
   * Override the resolved backdrop.
   *
   * The escape hatch for the cases the walk legitimately cannot resolve: text over a
   * gradient, over an image, or over a canvas element. Give it the colour the text
   * actually sits on at its worst point — the *worst* point, not the average, because
   * contrast is a per-pixel property and passing on average is not passing.
   */
  background?: Rgb | string
  /** The colour behind everything. Defaults to white, matching the default canvas. */
  canvas?: Rgb | string
  /** Force a threshold instead of deriving it from the computed font size and weight. */
  kind?: ContrastKind
  /** Conformance level used to derive the required ratio. Defaults to AA. */
  level?: 'AA' | 'AAA'
  /** Required ratio, overriding both `kind` and `level`. */
  required?: number
}

export interface ContrastMeasurement {
  /** WCAG 2 contrast ratio, 1..21. */
  ratio: number
  /** The text colour after ancestor opacity and compositing. */
  foreground: Rgb
  /** The opaque backdrop the text is painted on. */
  background: Rgb
  /** Every layer considered, nearest first. Useful when the answer is surprising. */
  layers: BackgroundLayer[]
  fontSizePx: number | null
  fontWeight: number
  kind: ContrastKind
  requiredRatio: number
  passes: boolean
  /**
   * True when the backdrop could not be determined from colours alone. `ratio` is still
   * populated as a best effort, but it must not be trusted, and matchers treat it as a
   * failure with an explanation rather than as a pass.
   */
  indeterminate: boolean
  /** Why the measurement is indeterminate, in a form that names the fix. */
  reason?: string
}

const WHITE: Rgb = { r: 1, g: 1, b: 1, a: 1 }

function toRgb(value: Rgb | string | undefined, fallback: Rgb): Rgb {
  if (value === undefined) return fallback
  if (typeof value !== 'string') return value
  return parseCssColour(value) ?? fallback
}

/**
 * Whether text counts as large under WCAG 2.
 *
 * 18pt regular or 14pt bold, which are 24px and 18.66px at the default 96dpi mapping. The
 * boundary is exact and worth respecting: 18px bold text is *not* large text, and rounding
 * it up is how a design ends up shipping 3:1 body copy.
 */
export function isLargeText(fontSizePx: number, fontWeight: number): boolean {
  if (fontSizePx >= 24) return true
  return fontWeight >= 700 && fontSizePx >= 18.66
}

function requiredFor(kind: ContrastKind, level: 'AA' | 'AAA'): number {
  if (kind === 'non-text') return 3
  if (level === 'AAA') return kind === 'large' ? 4.5 : 7
  return kind === 'large' ? 3 : 4.5
}

/**
 * Resolve the opaque colour actually painted behind an element.
 *
 * Exposed separately because it is useful on its own — for focus-indicator contrast, for
 * border contrast, and for explaining a surprising contrast result.
 */
export function resolveBackdrop(
  element: TestElement,
  options: { canvas?: Rgb | string } = {},
): { colour: Rgb; layers: BackgroundLayer[]; indeterminate: boolean; reason?: string } {
  const canvas = toRgb(options.canvas, WHITE)
  const chain = ancestorChain(element)

  // Effective alpha of a layer is its own alpha times the opacity of every element from it
  // outwards, because `opacity` on a parent fades the entire subtree as one group. Walking
  // outwards accumulates that product naturally.
  let opacityProduct = 1
  const layers: BackgroundLayer[] = []

  for (const node of chain) {
    const style = computedStyle(node)
    const declared = style.getPropertyValue('background-color').trim()
    const colour = parseCssColour(declared)
    const image = style.getPropertyValue('background-image').trim()

    const own = Number.parseFloat(style.getPropertyValue('opacity'))
    opacityProduct *= Number.isFinite(own) ? Math.min(Math.max(own, 0), 1) : 1

    layers.push({
      element: node,
      declared,
      colour,
      effectiveAlpha: colour ? alphaOf(colour) * opacityProduct : opacityProduct,
      hasImage: image.length > 0 && image !== 'none',
    })
  }

  // Anything painted behind the first fully opaque layer is invisible, so it can neither
  // change the answer nor make it indeterminate. Finding that layer is what stops a
  // gradient on <body> from poisoning every measurement on a page with an opaque card.
  let opaqueAt = layers.length - 1
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]
    if (layer?.colour && !layer.hasImage && layer.effectiveAlpha >= 1) {
      opaqueAt = i
      break
    }
  }

  const relevant = layers.slice(0, opaqueAt + 1)
  const imaged = relevant.find((layer) => layer.hasImage)
  const unparsed = relevant.find((layer) => layer.colour === null && layer.declared !== '')

  let colour = canvas
  for (let i = relevant.length - 1; i >= 0; i--) {
    const layer = relevant[i]
    if (!layer?.colour) continue
    colour = compositeOver({ ...layer.colour, a: layer.effectiveAlpha }, colour)
  }

  if (imaged) {
    return {
      colour,
      layers,
      indeterminate: true,
      reason:
        `A background-image is painted behind this element, so no single colour describes ` +
        `its backdrop. The ratio below assumes the background-colour underneath the image, ` +
        `which is almost never what the user sees. Pass { background: '…' } with the colour ` +
        `at the least-contrasting point of the image.`,
    }
  }

  if (unparsed) {
    return {
      colour,
      layers,
      indeterminate: true,
      reason:
        `The background-colour "${unparsed.declared}" could not be resolved to sRGB without ` +
        `more context — currentColor, color-mix(), an unresolved var(), or a wide-gamut ` +
        `colour space. Pass { background: '…' } explicitly.`,
    }
  }

  return { colour, layers, indeterminate: false }
}

/**
 * Measure the contrast an element's text actually achieves.
 *
 * See the module note for why this is not a two-line function.
 */
export function measureContrast(
  element: TestElement,
  options: ContrastOptions = {},
): ContrastMeasurement {
  const style = computedStyle(element)
  const fontSizePx = parsePx(style.getPropertyValue('font-size'))
  const fontWeight = parseFontWeight(style.getPropertyValue('font-weight'))

  const kind =
    options.kind ?? (fontSizePx !== null && isLargeText(fontSizePx, fontWeight) ? 'large' : 'body')
  const requiredRatio = options.required ?? requiredFor(kind, options.level ?? 'AA')

  const backdrop =
    options.background !== undefined
      ? {
          colour: toRgb(options.background, WHITE),
          layers: [] as BackgroundLayer[],
          indeterminate: false,
          reason: undefined as string | undefined,
        }
      : resolveBackdrop(element, options.canvas === undefined ? {} : { canvas: options.canvas })

  // The text's own alpha is subject to the same accumulated opacity as the backgrounds,
  // including the element's own opacity — which the background walk has already folded in
  // for this element, so it is read again here from the full chain.
  let opacityProduct = 1
  for (const node of ancestorChain(element)) {
    const own = Number.parseFloat(computedStyle(node).getPropertyValue('opacity'))
    opacityProduct *= Number.isFinite(own) ? Math.min(Math.max(own, 0), 1) : 1
  }

  const declaredForeground = style.getPropertyValue('color').trim()
  const parsedForeground = parseCssColour(declaredForeground)

  let indeterminate = backdrop.indeterminate
  let reason = backdrop.reason

  if (!parsedForeground) {
    indeterminate = true
    reason =
      reason ??
      `The text colour "${declaredForeground}" could not be resolved to sRGB. Pass an explicit ` +
        `colour, or assert on an element whose colour resolves to a plain rgb()/oklch() value.`
  }

  const foreground = compositeOver(
    {
      ...(parsedForeground ?? { r: 0, g: 0, b: 0 }),
      a: alphaOf(parsedForeground ?? { r: 0, g: 0, b: 0 }) * opacityProduct,
    },
    backdrop.colour,
  )

  const ratio = contrastRatio(foreground, backdrop.colour)

  return {
    ratio,
    foreground,
    background: backdrop.colour,
    layers: backdrop.layers,
    fontSizePx,
    fontWeight,
    kind,
    requiredRatio,
    passes: !indeterminate && ratio >= requiredRatio,
    indeterminate,
    ...(reason ? { reason } : {}),
  }
}

/**
 * Propose a foreground colour that would reach the required ratio.
 *
 * Adjusts lightness in Oklch and leaves hue and chroma alone, so the suggestion still
 * belongs to the same palette. Suggesting "use black" is technically a fix and practically
 * an instruction to abandon the brand, which is why nobody applies it.
 */
export function suggestForeground(measurement: ContrastMeasurement): string | null {
  const base: Oklch = rgbToOklch(measurement.foreground)
  const fixed = findAccessibleLightness(base, measurement.background, measurement.requiredRatio)
  if (!fixed) return null
  return toHex(oklchToRgb(fixed))
}

/** A one-line human summary of a measurement, used in several failure messages. */
export function describeMeasurement(measurement: ContrastMeasurement): string {
  return `${measurement.ratio.toFixed(2)}:1 — ${formatColour(measurement.foreground)} on ${formatColour(measurement.background)}`
}
