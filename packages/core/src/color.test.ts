// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import {
  apcaContrast,
  buildRamp,
  clampChromaToSrgb,
  contrastRatio,
  findAccessibleLightness,
  isInSrgbGamut,
  labelRamp,
  oklchToRgb,
  parseHex,
  relativeLuminance,
  rgbToOklab,
  rgbToOklch,
  oklabToRgb,
  toCssOklch,
  toHex,
} from './color.js'

const WHITE = { r: 1, g: 1, b: 1 }
const BLACK = { r: 0, g: 0, b: 0 }

describe('sRGB and OKLab round-tripping', () => {
  it('returns the original colour after a full conversion cycle', () => {
    const samples = [
      { r: 0.2, g: 0.4, b: 0.8 },
      { r: 0.94, g: 0.11, b: 0.35 },
      { r: 0.5, g: 0.5, b: 0.5 },
      { r: 0, g: 0, b: 0 },
      { r: 1, g: 1, b: 1 },
    ]

    for (const sample of samples) {
      const restored = oklabToRgb(rgbToOklab(sample))
      expect(restored.r).toBeCloseTo(sample.r, 6)
      expect(restored.g).toBeCloseTo(sample.g, 6)
      expect(restored.b).toBeCloseTo(sample.b, 6)
    }
  })

  it('places pure white at L=1 with no chroma', () => {
    const { L, C } = rgbToOklch(WHITE)
    expect(L).toBeCloseTo(1, 3)
    expect(C).toBeCloseTo(0, 4)
  })

  it('places pure black at L=0', () => {
    expect(rgbToOklch(BLACK).L).toBeCloseTo(0, 5)
  })

  it('pins hue to zero for achromatic colours so ramps do not wander', () => {
    expect(rgbToOklch({ r: 0.5, g: 0.5, b: 0.5 }).h).toBe(0)
  })

  it('orders lightness the way a human would', () => {
    // The point of a perceptual space: mid-grey should read as roughly mid-lightness,
    // whereas its sRGB relative luminance is only about 0.21.
    const midGrey = rgbToOklch({ r: 0.5, g: 0.5, b: 0.5 })
    expect(midGrey.L).toBeGreaterThan(0.5)
    expect(midGrey.L).toBeLessThan(0.65)
    expect(relativeLuminance({ r: 0.5, g: 0.5, b: 0.5 })).toBeLessThan(0.25)
  })
})

describe('hex parsing', () => {
  it('parses every accepted hex length', () => {
    expect(parseHex('#fff')).toEqual({ r: 1, g: 1, b: 1 })
    expect(parseHex('ffffff')).toEqual({ r: 1, g: 1, b: 1 })
    expect(parseHex('#000000')).toEqual({ r: 0, g: 0, b: 0 })

    const withAlpha = parseHex('#00000080')
    expect(withAlpha?.a).toBeCloseTo(0.502, 2)

    const short = parseHex('#f00f')
    expect(short?.r).toBe(1)
    expect(short?.a).toBe(1)
  })

  it('rejects malformed input rather than guessing', () => {
    expect(parseHex('nonsense')).toBeNull()
    expect(parseHex('#gg0000')).toBeNull()
    expect(parseHex('#12345')).toBeNull()
  })

  it('round-trips through hex serialisation', () => {
    const original = '#3b82f6'
    const parsed = parseHex(original)
    expect(parsed).not.toBeNull()
    expect(toHex(parsed as { r: number; g: number; b: number })).toBe(original)
  })

  it('omits the alpha channel when the colour is opaque', () => {
    expect(toHex({ r: 1, g: 0, b: 0, a: 1 })).toBe('#ff0000')
    expect(toHex({ r: 1, g: 0, b: 0, a: 0.5 })).toBe('#ff000080')
  })
})

describe('gamut mapping', () => {
  it('detects colours outside sRGB', () => {
    // Very high chroma at mid lightness is not displayable in sRGB.
    const impossible = oklchToRgb({ L: 0.6, C: 0.4, h: 150 })
    expect(isInSrgbGamut(impossible)).toBe(false)
  })

  it('brings out-of-gamut colours back by reducing chroma alone', () => {
    const requested = { L: 0.6, C: 0.4, h: 150 }
    const mapped = clampChromaToSrgb(requested)

    expect(isInSrgbGamut(oklchToRgb(mapped))).toBe(true)
    expect(mapped.C).toBeLessThan(requested.C)
    // Hue and lightness must survive untouched — that is the entire reason for doing this
    // rather than clipping RGB channels.
    expect(mapped.L).toBe(requested.L)
    expect(mapped.h).toBe(requested.h)
  })

  it('leaves in-gamut colours alone', () => {
    const safe = { L: 0.6, C: 0.05, h: 150 }
    expect(clampChromaToSrgb(safe)).toEqual(safe)
  })
})

describe('WCAG contrast', () => {
  it('produces the known 21:1 extreme', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 5)
  })

  it('produces 1:1 for identical colours', () => {
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5)
  })

  it('is symmetric, since the ratio is order-independent', () => {
    const a = { r: 0.2, g: 0.3, b: 0.9 }
    const b = { r: 0.95, g: 0.95, b: 0.9 }
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10)
  })

  it('agrees with a known reference pair', () => {
    // #767676 on white is the canonical value that sits just above the 4.5:1 threshold.
    const grey = parseHex('#767676')
    expect(grey).not.toBeNull()
    const ratio = contrastRatio(grey as { r: number; g: number; b: number }, WHITE)
    expect(ratio).toBeGreaterThan(4.5)
    expect(ratio).toBeLessThan(4.6)
  })
})

describe('APCA contrast', () => {
  it('is polarity-aware, unlike the WCAG ratio', () => {
    const darkOnLight = apcaContrast(BLACK, WHITE)
    const lightOnDark = apcaContrast(WHITE, BLACK)

    expect(darkOnLight).toBeGreaterThan(0)
    expect(lightOnDark).toBeLessThan(0)
    // The two polarities are genuinely different magnitudes; WCAG reports both as 21.
    expect(Math.abs(darkOnLight)).not.toBeCloseTo(Math.abs(lightOnDark), 1)
  })

  it('reports black on white near the top of the scale', () => {
    expect(apcaContrast(BLACK, WHITE)).toBeGreaterThan(100)
  })

  it('reports zero for identical colours', () => {
    expect(apcaContrast(WHITE, WHITE)).toBe(0)
  })

  it('clips negligible contrast to zero rather than reporting noise', () => {
    const almost = { r: 0.5, g: 0.5, b: 0.5 }
    const barely = { r: 0.505, g: 0.505, b: 0.505 }
    expect(Math.abs(apcaContrast(almost, barely))).toBeLessThan(1)
  })
})

describe('accessible lightness search', () => {
  it('finds a lightness that meets the requested ratio against white', () => {
    const brand = rgbToOklch({ r: 0.23, g: 0.51, b: 0.96 })
    const result = findAccessibleLightness(brand, WHITE, 4.5)

    expect(result).not.toBeNull()
    const ratio = contrastRatio(oklchToRgb(result as NonNullable<typeof result>), WHITE)
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('finds a lightness against a dark background too', () => {
    const brand = rgbToOklch({ r: 0.23, g: 0.51, b: 0.96 })
    const result = findAccessibleLightness(brand, BLACK, 4.5)

    expect(result).not.toBeNull()
    expect(contrastRatio(oklchToRgb(result as NonNullable<typeof result>), BLACK)).toBeGreaterThanOrEqual(4.5)
  })

  it('preserves hue while adjusting lightness', () => {
    const brand = rgbToOklch({ r: 0.23, g: 0.51, b: 0.96 })
    const result = findAccessibleLightness(brand, WHITE, 7)
    expect(result?.h).toBeCloseTo(brand.h, 6)
  })

  it('returns null rather than pretending when the target is unreachable', () => {
    // Nothing can reach 21:1 against mid-grey; both directions run out of room.
    const midGrey = { r: 0.5, g: 0.5, b: 0.5 }
    expect(findAccessibleLightness(rgbToOklch({ r: 0.4, g: 0.4, b: 0.4 }), midGrey, 21)).toBeNull()
  })
})

describe('ramp construction', () => {
  const seed = rgbToOklch({ r: 0.23, g: 0.51, b: 0.96 })

  it('emits the requested number of steps', () => {
    expect(buildRamp(seed, { steps: 11 })).toHaveLength(11)
    expect(buildRamp(seed, { steps: 5 })).toHaveLength(5)
  })

  it('descends monotonically in lightness', () => {
    const ramp = buildRamp(seed)
    for (let i = 1; i < ramp.length; i++) {
      expect((ramp[i] as { L: number }).L).toBeLessThan((ramp[i - 1] as { L: number }).L)
    }
  })

  it('keeps every step inside the sRGB gamut', () => {
    for (const step of buildRamp(seed)) {
      expect(isInSrgbGamut(oklchToRgb(step))).toBe(true)
    }
  })

  it('sheds chroma toward both ends, the way real pigments do', () => {
    const ramp = buildRamp(seed, { steps: 11, chromaFalloff: 0.55 })
    const first = ramp[0] as { C: number }
    const middle = ramp[5] as { C: number }
    const last = ramp[10] as { C: number }

    expect(middle.C).toBeGreaterThan(first.C)
    expect(middle.C).toBeGreaterThan(last.C)
  })

  it('produces ends with enough separation to be usable as surfaces', () => {
    const ramp = buildRamp(seed)
    const lightest = ramp[0] as { L: number }
    const darkest = ramp[ramp.length - 1] as { L: number }
    expect(lightest.L - darkest.L).toBeGreaterThan(0.7)
  })

  it('applies hue drift symmetrically about the centre', () => {
    const ramp = buildRamp({ L: 0.6, C: 0.15, h: 200 }, { steps: 3, hueShift: 20 })
    expect((ramp[1] as { h: number }).h).toBeCloseTo(200, 4)
    expect((ramp[0] as { h: number }).h).toBeCloseTo(180, 4)
    expect((ramp[2] as { h: number }).h).toBeCloseTo(220, 4)
  })

  it('labels an eleven-step ramp with the conventional stops', () => {
    const labelled = labelRamp(buildRamp(seed, { steps: 11 }))
    expect(Object.keys(labelled)).toEqual([
      '50',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
      '950',
    ])
  })

  it('gives adjacent steps enough separation to be distinguishable', () => {
    const ramp = buildRamp(seed, { steps: 11 })
    for (let i = 1; i < ramp.length; i++) {
      const delta = (ramp[i - 1] as { L: number }).L - (ramp[i] as { L: number }).L
      // Below roughly 0.03 in OKLab lightness, two adjacent surfaces are hard to tell
      // apart, which defeats the purpose of having separate steps.
      expect(delta).toBeGreaterThan(0.03)
    }
  })
})

describe('CSS serialisation', () => {
  it('emits an oklch() value', () => {
    expect(toCssOklch({ L: 0.7231, C: 0.1876, h: 258.234 }, 3)).toBe('oklch(0.723 0.188 258.234)')
  })

  it('includes alpha only when the colour is translucent', () => {
    expect(toCssOklch({ L: 0.5, C: 0.1, h: 200, alpha: 1 })).toBe('oklch(0.5 0.1 200)')
    expect(toCssOklch({ L: 0.5, C: 0.1, h: 200, alpha: 0.5 })).toBe('oklch(0.5 0.1 200 / 0.5)')
  })
})
