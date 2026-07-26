// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Finding colour literals in source text, and naming the token that should have been used.
 *
 * A rule that says only "do not write hex colours" is a rule that gets suppressed, because
 * the author is holding a colour and has no idea which token it corresponds to. Knowing the
 * palette lets us close that gap: parse the literal, convert it to OKLab, and find the token
 * within a perceptual distance small enough that they are plainly the same intent. When
 * nothing is close, we say so rather than inventing a suggestion — proposing a token that is
 * visibly a different colour is worse than proposing none, because the author applies it,
 * the design changes, and the rule takes the blame.
 *
 * OKLab rather than plain RGB distance, because RGB distance is not perceptual: `#0000ff` and
 * `#0000cc` are as far apart in RGB as two greens nobody could tell apart, so an RGB-nearest
 * suggestion picks the wrong token most often exactly in the blues and violets that brand
 * palettes are full of.
 */

import { parseHex, type Rgb, rgbToOklab } from '@vishwakarma/core'

/**
 * Build a fresh matcher for colour literals.
 *
 * Returned from a function rather than held as a module constant on purpose: a global regex
 * carries `lastIndex` between calls, and a shared one silently skips matches in every other
 * file it is used on. That bug is invisible in unit tests, which lint one string at a time.
 */
export function colourLiteralPattern(): RegExp {
  return /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![0-9a-f])|\b(?:rgba?|hsla?)\([^()]*\)/gi
}

/** Every hex, `rgb()` or `hsl()` literal in a fragment of text, in source order. */
export function findColourLiterals(text: string): string[] {
  const pattern = colourLiteralPattern()
  const found: string[] = []
  let match = pattern.exec(text)
  while (match !== null) {
    const value = match[0]
    if (value) found.push(value)
    match = pattern.exec(text)
  }
  return found
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

function parseChannel(token: string): number | undefined {
  const trimmed = token.trim()
  if (!trimmed) return undefined
  if (trimmed.endsWith('%')) {
    const percent = Number.parseFloat(trimmed.slice(0, -1))
    return Number.isFinite(percent) ? clamp01(percent / 100) : undefined
  }
  const number = Number.parseFloat(trimmed)
  return Number.isFinite(number) ? clamp01(number / 255) : undefined
}

function parseAngle(token: string): number | undefined {
  const trimmed = token.trim().toLowerCase()
  const number = Number.parseFloat(trimmed)
  if (!Number.isFinite(number)) return undefined
  if (trimmed.endsWith('turn')) return number * 360
  if (trimmed.endsWith('rad')) return (number * 180) / Math.PI
  if (trimmed.endsWith('grad')) return number * 0.9
  return number
}

function hslToRgb(hue: number, saturation: number, lightness: number): Rgb {
  const h = ((hue % 360) + 360) % 360
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const secondary = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const offset = lightness - chroma / 2

  const sector = Math.floor(h / 60) % 6
  const table: [number, number, number][] = [
    [chroma, secondary, 0],
    [secondary, chroma, 0],
    [0, chroma, secondary],
    [0, secondary, chroma],
    [secondary, 0, chroma],
    [chroma, 0, secondary],
  ]
  const triple = table[sector] ?? table[0]
  const [r, g, b] = triple as [number, number, number]
  return { r: r + offset, g: g + offset, b: b + offset }
}

/**
 * Parse a colour literal to linear-free sRGB in 0..1, or `null` if we cannot.
 *
 * Modern colour functions — `oklch()`, `lab()`, `color(display-p3 ...)` — deliberately return
 * `null`. They are not the problem this rule exists to solve: someone writing `oklch()` by
 * hand has already thought about colour, whereas `#3b82f6` is almost always a value pasted
 * from a design tool that the token layer already has a name for.
 */
export function parseColourLiteral(text: string): Rgb | null {
  const trimmed = text.trim()
  if (trimmed.startsWith('#')) return parseHex(trimmed)

  const functional = /^(rgba?|hsla?)\(([^()]*)\)$/i.exec(trimmed)
  if (!functional) return null
  const name = (functional[1] ?? '').toLowerCase()
  const args = (functional[2] ?? '').split(/[\s,/]+/).filter(Boolean)

  const first = args[0]
  const second = args[1]
  const third = args[2]
  if (first === undefined || second === undefined || third === undefined) return null

  if (name === 'rgb' || name === 'rgba') {
    const r = parseChannel(first)
    const g = parseChannel(second)
    const b = parseChannel(third)
    if (r === undefined || g === undefined || b === undefined) return null
    return { r, g, b }
  }

  const hue = parseAngle(first)
  const saturation = parseChannel(second.endsWith('%') ? second : `${second}%`)
  const lightness = parseChannel(third.endsWith('%') ? third : `${third}%`)
  if (hue === undefined || saturation === undefined || lightness === undefined) return null
  return hslToRgb(hue, saturation, lightness)
}

/** A palette entry the rule may suggest. */
export interface ColourToken {
  /** How the token is written in source, e.g. `--vk-colour-accent-500`. */
  name: string
  /** Its value, in any notation {@link parseColourLiteral} understands. */
  value: string
}

/** A token match, with the perceptual distance that justified it. */
export interface TokenMatch {
  name: string
  /** Euclidean distance in OKLab. Roughly 0.02 is a just-noticeable difference. */
  delta: number
}

function distance(a: Rgb, b: Rgb): number {
  const first = rgbToOklab(a)
  const second = rgbToOklab(b)
  const dL = first.L - second.L
  const da = first.a - second.a
  const db = first.b - second.b
  return Math.sqrt(dL * dL + da * da + db * db)
}

/**
 * The closest token to a colour, if any is close enough to be the same decision.
 *
 * `maxDelta` defaults to 0.05 in OKLab, which is a few just-noticeable differences: near
 * enough that a designer would call it the same colour and the literal is almost certainly a
 * rounding of the token, far enough that we never suggest replacing a brand red with a brand
 * orange.
 */
export function nearestToken(
  colour: Rgb,
  tokens: readonly ColourToken[],
  maxDelta = 0.05,
): TokenMatch | undefined {
  let best: TokenMatch | undefined
  for (const token of tokens) {
    const parsed = parseColourLiteral(token.value)
    if (!parsed) continue
    const delta = distance(colour, parsed)
    if (delta <= maxDelta && (best === undefined || delta < best.delta)) {
      best = { name: token.name, delta }
    }
  }
  return best
}

/** Turn a `Record<name, value>` option into the token list the matcher wants. */
export function toTokenList(record: Readonly<Record<string, string>>): ColourToken[] {
  return Object.entries(record).map(([name, value]) => ({ name, value }))
}

/** Whether a CSS value contains a gradient function. */
export function containsGradient(value: string): boolean {
  return /\b(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i.test(value)
}

/**
 * Remove `url(...)` before scanning for colours.
 *
 * `fill: url(#brandGradient)` is an SVG paint-server reference, and `#brandGradient` matches
 * nothing, but `url(#abc)` — a perfectly ordinary fragment identifier — is indistinguishable
 * from a three-digit hex. One false positive on an SVG-heavy file is enough for a team to
 * decide the colour rule is unreliable, so the whole construct is excised first.
 */
export function stripUrls(text: string): string {
  return text.replace(/url\([^)]*\)/gi, '')
}

/**
 * Colour literals that carry no design decision and must never be reported.
 *
 * `transparent`, `#0000` and `currentColor` are structural: they mean "no paint" or "inherit
 * the decision made above", which is precisely the behaviour a token system wants. Flagging
 * them teaches authors that the rule does not understand CSS.
 */
export function isStructuralColour(literal: string): boolean {
  const normalised = literal.trim().toLowerCase().replace(/\s+/g, '')
  return (
    normalised === '#0000' ||
    normalised === '#00000000' ||
    normalised === 'rgba(0,0,0,0)' ||
    normalised === 'rgb(0,0,0,0)'
  )
}
