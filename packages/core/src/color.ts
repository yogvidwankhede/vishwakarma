// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Perceptual colour maths.
 *
 * Every colour decision in Vishwakarma is made in a perceptually uniform space rather
 * than in sRGB, because sRGB lies about lightness. Two sRGB colours with the same
 * numeric lightness can look wildly different, which is why hand-built palettes so often
 * have one shade that "sticks out" for no reason anyone can articulate. Working in OKLCh
 * makes lightness mean what a human thinks it means, so a generated ramp is even by
 * construction instead of by eye.
 *
 * The conversions here implement published colour-science transforms (the OKLab
 * transform, the sRGB transfer function, the WCAG 2 relative-luminance definition, and
 * the APCA lightness-contrast algorithm). Mathematical procedures are not authorship;
 * the code expressing them below is written from scratch for this project.
 */

/** Red, green, blue in 0..1, gamma-encoded sRGB. */
export interface Rgb {
  r: number
  g: number
  b: number
  /** Alpha in 0..1. Defaults to 1 when absent. */
  a?: number
}

/** OKLab: perceptual lightness plus two opponent-colour axes. */
export interface Oklab {
  L: number
  a: number
  b: number
  alpha?: number
}

/**
 * OKLCh: the cylindrical form of OKLab, and the one humans should actually author in.
 * `L` is 0..1 perceptual lightness, `C` is chroma (0 is grey, ~0.37 is the most saturated
 * sRGB can express), and `h` is hue in degrees 0..360.
 */
export interface Oklch {
  L: number
  C: number
  h: number
  alpha?: number
}

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value

/**
 * Cube root that preserves sign. `Math.cbrt` already does this, but the LMS step is hot
 * enough in ramp generation that keeping it explicit documents the intent.
 */
const cbrt = (value: number): number => Math.cbrt(value)

/* -------------------------------------------------------------------------- */
/* sRGB transfer function                                                     */
/* -------------------------------------------------------------------------- */

/** Gamma-encoded sRGB channel to linear-light. */
export function srgbToLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

/** Linear-light channel back to gamma-encoded sRGB. */
export function linearToSrgb(channel: number): number {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055
}

/* -------------------------------------------------------------------------- */
/* OKLab / OKLCh                                                              */
/* -------------------------------------------------------------------------- */

export function rgbToOklab({ r, g, b, a }: Rgb): Oklab {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)

  // Linear sRGB into an LMS-like cone response space.
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.629978701 * lb

  // The cube root is what makes the space perceptually uniform.
  const l_ = cbrt(l)
  const m_ = cbrt(m)
  const s_ = cbrt(s)

  const result: Oklab = {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  }
  if (a !== undefined) result.alpha = a
  return result
}

export function oklabToRgb({ L, a, b, alpha }: Oklab): Rgb {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  const out: Rgb = {
    r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  }
  if (alpha !== undefined) out.a = alpha
  return out
}

export function oklabToOklch({ L, a, b, alpha }: Oklab): Oklch {
  const C = Math.sqrt(a * a + b * b)
  // Near-grey colours have numerically meaningless hue; pin them to 0 so ramps built
  // from them do not wander.
  const h = C < 1e-7 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
  const out: Oklch = { L, C, h }
  if (alpha !== undefined) out.alpha = alpha
  return out
}

export function oklchToOklab({ L, C, h, alpha }: Oklch): Oklab {
  const rad = (h * Math.PI) / 180
  const out: Oklab = { L, a: C * Math.cos(rad), b: C * Math.sin(rad) }
  if (alpha !== undefined) out.alpha = alpha
  return out
}

export const rgbToOklch = (rgb: Rgb): Oklch => oklabToOklch(rgbToOklab(rgb))
export const oklchToRgb = (oklch: Oklch): Rgb => oklabToRgb(oklchToOklab(oklch))

/* -------------------------------------------------------------------------- */
/* Gamut                                                                       */
/* -------------------------------------------------------------------------- */

/** True when every channel lands inside the displayable sRGB cube. */
export function isInSrgbGamut({ r, g, b }: Rgb, epsilon = 1e-5): boolean {
  return (
    r >= -epsilon &&
    r <= 1 + epsilon &&
    g >= -epsilon &&
    g <= 1 + epsilon &&
    b >= -epsilon &&
    b <= 1 + epsilon
  )
}

/**
 * Pull an out-of-gamut OKLCh colour back into sRGB by reducing chroma only.
 *
 * This is the important part: the naive fix is to clip RGB channels, which shifts both
 * hue and lightness and is exactly why "the same blue" looks purple in one shade and
 * navy in another. Holding L and h fixed while binary-searching chroma keeps a generated
 * ramp visually coherent, at the cost of some saturation in the corners where sRGB
 * simply cannot go.
 */
export function clampChromaToSrgb(colour: Oklch, iterations = 24): Oklch {
  if (isInSrgbGamut(oklchToRgb(colour))) return colour

  let low = 0
  let high = colour.C
  let best: Oklch = { ...colour, C: 0 }

  for (let i = 0; i < iterations; i++) {
    const mid = (low + high) / 2
    const candidate: Oklch = { ...colour, C: mid }
    if (isInSrgbGamut(oklchToRgb(candidate))) {
      best = candidate
      low = mid
    } else {
      high = mid
    }
  }
  return best
}

/* -------------------------------------------------------------------------- */
/* Parsing and serialisation                                                  */
/* -------------------------------------------------------------------------- */

const HEX_PATTERN = /^#?([0-9a-f]{3,8})$/i

/** Parse `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa`. Returns null on anything else. */
export function parseHex(input: string): Rgb | null {
  const match = HEX_PATTERN.exec(input.trim())
  if (!match) return null
  const hex = match[1] as string

  const expand = (pair: string): number => Number.parseInt(pair, 16) / 255

  if (hex.length === 3 || hex.length === 4) {
    const parts = hex.split('').map((c) => `${c}${c}`)
    const rgb: Rgb = {
      r: expand(parts[0] as string),
      g: expand(parts[1] as string),
      b: expand(parts[2] as string),
    }
    if (parts.length === 4) rgb.a = expand(parts[3] as string)
    return rgb
  }
  if (hex.length === 6 || hex.length === 8) {
    const rgb: Rgb = {
      r: expand(hex.slice(0, 2)),
      g: expand(hex.slice(2, 4)),
      b: expand(hex.slice(4, 6)),
    }
    if (hex.length === 8) rgb.a = expand(hex.slice(6, 8))
    return rgb
  }
  return null
}

export function toHex({ r, g, b, a }: Rgb): string {
  const channel = (value: number): string =>
    Math.round(clamp(value, 0, 1) * 255)
      .toString(16)
      .padStart(2, '0')
  const base = `#${channel(r)}${channel(g)}${channel(b)}`
  return a === undefined || a >= 1 ? base : `${base}${channel(a)}`
}

/**
 * Serialise to a CSS `oklch()` value.
 *
 * We emit OKLCh rather than hex wherever the target supports it, because it keeps the
 * authored intent legible in devtools — a designer reading `oklch(0.72 0.19 258)` can see
 * at a glance that it is a mid-lightness, strongly-saturated blue, which `#4a7fe0` does
 * not tell them.
 */
export function toCssOklch({ L, C, h, alpha }: Oklch, precision = 4): string {
  const round = (value: number): number => Number(value.toFixed(precision))
  const base = `oklch(${round(L)} ${round(C)} ${round(h)}`
  return alpha === undefined || alpha >= 1 ? `${base})` : `${base} / ${round(alpha)})`
}

/* -------------------------------------------------------------------------- */
/* Contrast                                                                    */
/* -------------------------------------------------------------------------- */

/** WCAG 2 relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

/**
 * WCAG 2 contrast ratio, from 1 (identical) to 21 (black on white).
 *
 * This is the number that legal accessibility requirements are written against, so it is
 * the one we gate on — even though it is known to be a poor model of perceived contrast
 * for light text on dark backgrounds and for mid-tones. See {@link apcaContrast} for the
 * better perceptual model, which we report alongside it.
 */
export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(background)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * APCA lightness contrast (Lc), roughly -108..106.
 *
 * Unlike the WCAG ratio, APCA is polarity-aware: it gives different answers for dark-on-
 * light and light-on-dark, which matches how vision actually works. Positive values mean
 * dark text on a light background. As a rough guide: |Lc| 90 for body text at small
 * sizes, 75 for body text at comfortable sizes, 60 for larger content text, 45 for large
 * headings, and 30 for disabled or purely decorative elements.
 *
 * Implements the APCA-W3 procedure. We treat this as advisory and WCAG 2 as normative,
 * because APCA is not yet the criterion anyone is audited against.
 */
export function apcaContrast(text: Rgb, background: Rgb): number {
  const TRC = 2.4
  const luminance = ({ r, g, b }: Rgb): number =>
    0.2126729 * clamp(r, 0, 1) ** TRC +
    0.7151522 * clamp(g, 0, 1) ** TRC +
    0.072175 * clamp(b, 0, 1) ** TRC

  // Very dark colours are perceptually flatter than their luminance suggests; the soft
  // clamp compensates so near-blacks do not read as infinitely contrasty.
  const softClamp = (y: number): number => (y < 0.022 ? y + (0.022 - y) ** 1.414 : y)

  const yText = softClamp(luminance(text))
  const yBg = softClamp(luminance(background))

  if (Math.abs(yBg - yText) < 0.0005) return 0

  let contrast: number
  if (yBg > yText) {
    // Dark text on a light background.
    contrast = (yBg ** 0.56 - yText ** 0.57) * 1.14
    contrast = contrast < 0.1 ? 0 : contrast - 0.027
  } else {
    // Light text on a dark background.
    contrast = (yBg ** 0.65 - yText ** 0.62) * 1.14
    contrast = contrast > -0.1 ? 0 : contrast + 0.027
  }
  return contrast * 100
}

/**
 * Find the OKLCh lightness that hits a target WCAG contrast against a given background,
 * holding hue and chroma fixed.
 *
 * This is how the token pipeline generates a readable foreground for an arbitrary brand
 * colour without a human picking one. It searches lightness in the direction that has
 * headroom, and returns null when the requested ratio is unreachable at this hue and
 * chroma — which is a genuine answer, not a failure, and the caller should reduce chroma
 * or lower the target rather than pretend.
 */
export function findAccessibleLightness(
  base: Oklch,
  background: Rgb,
  targetRatio: number,
  options: { prefer?: 'lighter' | 'darker' | 'auto'; iterations?: number } = {},
): Oklch | null {
  const { prefer = 'auto', iterations = 30 } = options
  const bgLuminance = relativeLuminance(background)

  const direction = prefer === 'auto' ? (bgLuminance > 0.35 ? 'darker' : 'lighter') : prefer

  const ratioAt = (L: number): number =>
    contrastRatio(oklchToRgb(clampChromaToSrgb({ ...base, L })), background)

  let low = direction === 'darker' ? 0 : base.L
  let high = direction === 'darker' ? base.L : 1

  // If the extreme end of the search range cannot reach the target, nothing in the range can.
  const extreme = direction === 'darker' ? 0 : 1
  if (ratioAt(extreme) < targetRatio) return null

  for (let i = 0; i < iterations; i++) {
    const mid = (low + high) / 2
    const meets = ratioAt(mid) >= targetRatio
    if (direction === 'darker') {
      // Lower L means more contrast against a light background, so a passing midpoint
      // lets us move the "too dark" bound up and keep searching for the lightest pass.
      if (meets) low = mid
      else high = mid
    } else {
      if (meets) high = mid
      else low = mid
    }
  }

  const chosen = direction === 'darker' ? low : high
  const result = clampChromaToSrgb({ ...base, L: chosen })
  return ratioAt(chosen) >= targetRatio ? result : null
}

/* -------------------------------------------------------------------------- */
/* Ramps                                                                       */
/* -------------------------------------------------------------------------- */

export interface RampOptions {
  /** How many steps to emit. 11 gives the familiar 50..950 shape. */
  steps?: number
  /** Perceptual lightness of the lightest step. */
  lightnessMax?: number
  /** Perceptual lightness of the darkest step. */
  lightnessMin?: number
  /**
   * How much chroma to shed at the ends of the ramp, 0..1. Real pigments desaturate as
   * they approach white and black; a ramp that holds chroma flat looks synthetic.
   */
  chromaFalloff?: number
  /**
   * Degrees of hue drift across the ramp. A small negative value on warm hues and a
   * small positive value on cool ones mimics how light sources tint highlights, and is
   * the difference between a ramp that looks designed and one that looks computed.
   */
  hueShift?: number
  /**
   * How much to ease the lightness distribution, 0..1.
   *
   * At 0 the steps are evenly spaced in perceptual lightness. Raising it clusters steps
   * toward the ends of the ramp, which gives finer control over near-white surface tints
   * and near-black text tones — the two regions where UI actually needs subtle
   * distinctions.
   *
   * It is capped below 1 on purpose. A fully eased curve has zero slope at both ends, so
   * the outermost pair of steps collapses into visually identical colours and the ramp
   * silently loses two of its stops. Around a third is enough to feel considered while
   * keeping every adjacent pair distinguishable.
   */
  lightnessEase?: number
}

/**
 * Build a perceptually even colour ramp from a single seed colour.
 *
 * The lightness curve blends a linear distribution with an eased one rather than using
 * either alone. Pure linear wastes steps in the mid-tones, where the eye is least
 * sensitive to small lightness differences. Pure smoothstep has the opposite and worse
 * problem: its slope falls to zero at both ends, so the two lightest steps converge on the
 * same colour and the ramp effectively loses them — which is precisely the "50 and 100
 * look identical" complaint that motivates building ramps programmatically in the first
 * place. The blend keeps finer resolution at the ends without letting any adjacent pair
 * collapse.
 */
export function buildRamp(seed: Oklch, options: RampOptions = {}): Oklch[] {
  const {
    steps = 11,
    lightnessMax = 0.985,
    lightnessMin = 0.18,
    chromaFalloff = 0.55,
    hueShift = 0,
    lightnessEase = 0.3,
  } = options

  const ease = Math.min(Math.max(lightnessEase, 0), 0.85)

  const ramp: Oklch[] = []
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1)

    const smoothstep = t * t * (3 - 2 * t)
    const eased = t * (1 - ease) + smoothstep * ease
    const L = lightnessMax - eased * (lightnessMax - lightnessMin)

    // Chroma peaks in the middle of the ramp and falls away toward both ends.
    const distanceFromCentre = Math.abs(t - 0.5) * 2
    const chromaScale = 1 - chromaFalloff * distanceFromCentre ** 1.6
    const C = seed.C * Math.max(chromaScale, 0)

    const h = (seed.h + hueShift * (t - 0.5) * 2 + 360) % 360

    ramp.push(clampChromaToSrgb({ L, C, h }))
  }
  return ramp
}

/** Conventional numeric names for an 11-step ramp. */
export const RAMP_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

/** Zip a generated ramp into `{ 50: ..., 100: ... }` shape. */
export function labelRamp(ramp: Oklch[]): Record<string, Oklch> {
  const out: Record<string, Oklch> = {}
  ramp.forEach((colour, index) => {
    const stop = RAMP_STOPS[index] ?? (index + 1) * 100
    out[String(stop)] = colour
  })
  return out
}
