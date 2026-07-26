// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Parsing colours back out of computed styles.
 *
 * Everything downstream of this file — contrast, focus-indicator quality, token
 * conformance — depends on turning a serialised CSS colour into numbers. That sounds
 * trivial and is not, for one reason: what a browser hands back from `getComputedStyle`
 * is not what the author wrote. It is a *serialisation*, and which serialisation you get
 * depends on the engine and on the colour space involved. The same declaration can come
 * back as `rgb(0, 0, 0)`, `rgb(0 0 0 / 0.5)`, `rgba(0, 0, 0, 0.5)`, `oklch(0.5 0.1 240)`
 * or `color(srgb 0 0 0)` depending on where and how it was written.
 *
 * A parser that handles only `rgb(r, g, b)` — which is what most in-house test helpers
 * handle — silently returns null on the others, and the assertion built on top of it
 * either throws somewhere unhelpful or, far worse, falls back to black and reports a
 * confident wrong number.
 *
 * Alpha is kept rather than discarded. Discarding it is the second common defect: a
 * background of `rgba(0, 0, 0, 0.04)` is not black, and treating it as black inverts the
 * result of every contrast check that touches a subtle surface.
 */

import { oklchToRgb, parseHex, type Rgb } from '@vishwakarma/core'

/** Alpha of a colour, defaulting to fully opaque as CSS does. */
export function alphaOf(colour: Rgb): number {
  return colour.a ?? 1
}

/**
 * A small set of CSS named colours.
 *
 * Not the full 148. Computed styles are serialised to `rgb()` by every engine, so names
 * only reach this parser when a caller passes an authored value directly — and in that
 * case it is nearly always one of these. Anything else returns null, which callers surface
 * as "indeterminate" rather than guessing; an unrecognised name that quietly became black
 * would produce a contrast figure that looks authoritative and is fiction.
 */
const NAMED: Record<string, string> = {
  transparent: '#00000000',
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  orange: '#ffa500',
  purple: '#800080',
  grey: '#808080',
  gray: '#808080',
  silver: '#c0c0c0',
  navy: '#000080',
  teal: '#008080',
  olive: '#808000',
  maroon: '#800000',
  lime: '#00ff00',
  aqua: '#00ffff',
  cyan: '#00ffff',
  fuchsia: '#ff00ff',
  magenta: '#ff00ff',
  rebeccapurple: '#663399',
}

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value)

/** Read a channel that may be a percentage, a 0..255 number, or the keyword `none`. */
function channel(token: string, scale: number): number | null {
  const text = token.trim()
  if (text === 'none') return 0
  if (text.endsWith('%')) {
    const percent = Number.parseFloat(text.slice(0, -1))
    return Number.isFinite(percent) ? clamp01(percent / 100) : null
  }
  const number = Number.parseFloat(text)
  return Number.isFinite(number) ? clamp01(number / scale) : null
}

/** Read an alpha component, which may be `0.5`, `50%`, or absent. */
function alphaToken(token: string | undefined): number {
  if (token === undefined) return 1
  const parsed = channel(token, 1)
  return parsed === null ? 1 : parsed
}

/**
 * Split a functional colour's arguments.
 *
 * Handles both the legacy comma syntax and the modern space syntax with a slash before
 * alpha, because a single stylesheet routinely produces both after serialisation.
 */
function splitArguments(body: string): { components: string[]; alpha: string | undefined } {
  const [main, alphaPart] = body.split('/')
  const source = main ?? ''
  const components = source
    .split(source.includes(',') ? ',' : /\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  // Legacy `rgba(r, g, b, a)` puts alpha in the component list rather than after a slash.
  if (alphaPart === undefined && components.length === 4) {
    const last = components.pop()
    return { components, alpha: last }
  }
  return { components, alpha: alphaPart?.trim() }
}

/** Convert HSL, whose components are an angle and two percentages, to sRGB. */
function hslToRgb(hDegrees: number, s: number, l: number): Rgb {
  const hue = ((hDegrees % 360) + 360) % 360
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const match = l - chroma / 2

  const sector = Math.floor(hue / 60) % 6
  const table: Array<[number, number, number]> = [
    [chroma, secondary, 0],
    [secondary, chroma, 0],
    [0, chroma, secondary],
    [0, secondary, chroma],
    [secondary, 0, chroma],
    [chroma, 0, secondary],
  ]
  const picked = table[sector] ?? [0, 0, 0]

  return { r: picked[0] + match, g: picked[1] + match, b: picked[2] + match }
}

/** Parse an angle in any CSS angle unit into degrees. */
function angle(token: string): number | null {
  const match = /^(-?\d*\.?\d+)(deg|rad|grad|turn)?$/.exec(token.trim())
  if (!match?.[1]) return null
  const value = Number.parseFloat(match[1])
  if (!Number.isFinite(value)) return null
  switch (match[2]) {
    case 'rad':
      return (value * 180) / Math.PI
    case 'grad':
      return value * 0.9
    case 'turn':
      return value * 360
    default:
      return value
  }
}

/**
 * Parse a CSS colour into sRGB channels in 0..1, with alpha preserved.
 *
 * Returns null for anything it cannot resolve without more context — `currentColor`,
 * `color-mix()`, `var()`, a gradient, a system colour keyword. Null means "ask someone
 * else", not "black". Callers must treat it as indeterminate.
 */
export function parseCssColour(input: string): Rgb | null {
  const value = input.trim().toLowerCase()
  if (value.length === 0) return null

  const named = NAMED[value]
  if (named) return parseHex(named)
  if (value.startsWith('#')) return parseHex(value)

  const functional = /^([a-z-]+)\((.*)\)$/s.exec(value)
  if (!functional?.[1] || functional[2] === undefined) return null

  const name = functional[1]
  const body = functional[2]

  if (name === 'rgb' || name === 'rgba') {
    const { components, alpha } = splitArguments(body)
    const [r, g, b] = components
    if (r === undefined || g === undefined || b === undefined) return null
    const red = channel(r, 255)
    const green = channel(g, 255)
    const blue = channel(b, 255)
    if (red === null || green === null || blue === null) return null
    return { r: red, g: green, b: blue, a: alphaToken(alpha) }
  }

  if (name === 'hsl' || name === 'hsla') {
    const { components, alpha } = splitArguments(body)
    const [h, s, l] = components
    if (h === undefined || s === undefined || l === undefined) return null
    const hue = angle(h)
    const saturation = channel(s, 100)
    const lightness = channel(l, 100)
    if (hue === null || saturation === null || lightness === null) return null
    return { ...hslToRgb(hue, saturation, lightness), a: alphaToken(alpha) }
  }

  if (name === 'oklch') {
    const { components, alpha } = splitArguments(body)
    const [l, c, h] = components
    if (l === undefined || c === undefined || h === undefined) return null
    const lightness = l.endsWith('%') ? Number.parseFloat(l) / 100 : Number.parseFloat(l)
    const chroma = c.endsWith('%') ? (Number.parseFloat(c) / 100) * 0.4 : Number.parseFloat(c)
    const hue = angle(h)
    if (!Number.isFinite(lightness) || !Number.isFinite(chroma) || hue === null) return null
    const rgb = oklchToRgb({ L: lightness, C: chroma, h: hue })
    return { r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b), a: alphaToken(alpha) }
  }

  // `color(srgb r g b / a)`. Wide-gamut spaces are deliberately not handled: converting
  // display-p3 to sRGB without gamut mapping produces numbers that look plausible and are
  // wrong at the edges, and a wrong contrast figure is worse than an honest null.
  if (name === 'color') {
    const { components, alpha } = splitArguments(body)
    const [space, r, g, b] = components
    if (space !== 'srgb' || r === undefined || g === undefined || b === undefined) return null
    const red = channel(r, 1)
    const green = channel(g, 1)
    const blue = channel(b, 1)
    if (red === null || green === null || blue === null) return null
    return { r: red, g: green, b: blue, a: alphaToken(alpha) }
  }

  return null
}

/**
 * Composite a colour over an opaque backdrop, in the source-over sense.
 *
 * Done in gamma-encoded sRGB rather than linear light, on purpose. That is technically the
 * "wrong" way to blend, but it is what browsers do when compositing normal content, and
 * the job of this function is to predict what the user will actually see — not what a
 * physically correct compositor would produce.
 */
export function compositeOver(top: Rgb, bottom: Rgb): Rgb {
  const alpha = alphaOf(top)
  if (alpha >= 1) return { r: top.r, g: top.g, b: top.b, a: 1 }
  if (alpha <= 0) return { r: bottom.r, g: bottom.g, b: bottom.b, a: 1 }

  const mix = (a: number, b: number): number => a * alpha + b * (1 - alpha)
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 }
}

/** Format a colour for a failure message: readable, and pasteable into a stylesheet. */
export function formatColour(colour: Rgb): string {
  const byte = (value: number): number => Math.round(clamp01(value) * 255)
  const alpha = alphaOf(colour)
  const channels = `${byte(colour.r)} ${byte(colour.g)} ${byte(colour.b)}`
  return alpha >= 1 ? `rgb(${channels})` : `rgb(${channels} / ${Number(alpha.toFixed(3))})`
}
