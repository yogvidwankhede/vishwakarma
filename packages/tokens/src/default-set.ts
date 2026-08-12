// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The default token set.
 *
 * This file is deliberately a *generator* rather than a list of literal values. Writing
 * out four hundred hex codes by hand produces a set where nobody can tell which values
 * were reasoned about and which were typed in a hurry, and where changing the brand hue
 * means editing four hundred things. Deriving the set from a handful of inputs — a seed
 * colour, a base size, a ratio — means the relationships are guaranteed rather than
 * asserted, and a rebrand is a one-line change.
 *
 * It also means the token set doubles as documentation of the reasoning, which is exactly
 * what an AI agent needs in order to extend the system correctly rather than bolting a
 * one-off value onto the side of it.
 */

import {
  buildRamp,
  DURATIONS,
  EASINGS,
  labelRamp,
  type Oklch,
  parseHex,
  rgbToOklch,
  suggestLetterSpacing,
  suggestLineHeight,
  toCssOklch,
} from '@vishwakarma/core'
import type { Token, TokenSet } from './schema.js'

export interface BrandInput {
  /** The primary brand colour, as hex. */
  primary: string
  /** Optional secondary hue for accents. Defaults to a hue rotated from the primary. */
  accent?: string
  /** Neutral tint strength, 0..0.02. Pure grey is 0, and looks accidental beside a brand hue. */
  neutralChroma?: number
  /** Base body font size in rem. */
  baseFontSize?: number
  /** Type scale ratio at the small viewport. */
  typeRatio?: number
  /** Base spacing unit in px. */
  spacingUnit?: number
  fontFamily?: { sans?: string; serif?: string; mono?: string }
}

const DEFAULT_BRAND: Required<Omit<BrandInput, 'accent' | 'fontFamily'>> & {
  accent?: string
  fontFamily: Required<NonNullable<BrandInput['fontFamily']>>
} = {
  primary: '#3d5afe',
  neutralChroma: 0.006,
  baseFontSize: 1,
  typeRatio: 1.25,
  spacingUnit: 4,
  fontFamily: {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
}

const RAMP_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

/** Semantic hues, chosen for distinguishability rather than convention. */
const STATUS_HUES = {
  // Slightly orange-shifted from pure red so it stays distinguishable under the most
  // common colour vision deficiency, where pure red and green converge.
  danger: 27,
  warning: 75,
  success: 152,
  info: 245,
} as const

function rampTokens(name: string, seed: Oklch, hueShift: number): Token[] {
  const ramp = labelRamp(buildRamp(seed, { steps: 11, hueShift }))
  return RAMP_STOPS.map((stop) => ({
    path: `color.${name}.${stop}`,
    type: 'color' as const,
    tier: 'primitive' as const,
    value: toCssOklch(ramp[String(stop)] as Oklch),
  }))
}

/**
 * Build a complete token set from a brand input.
 *
 * The dark theme is not an inversion. Inverting a light theme produces glowing saturated
 * colours on black, because chroma that reads as pleasant at high lightness reads as
 * radioactive at low lightness, and pure black backgrounds cause haloing around light
 * text on OLED displays. So the dark theme walks the same ramps in the opposite direction
 * and stops short of the extremes, which is a different decision rather than a
 * transformation of the first one.
 */
export function buildTokenSet(input: BrandInput = { primary: DEFAULT_BRAND.primary }): TokenSet {
  const brand = {
    ...DEFAULT_BRAND,
    ...input,
    fontFamily: { ...DEFAULT_BRAND.fontFamily, ...input.fontFamily },
  }

  const primaryRgb = parseHex(brand.primary)
  if (!primaryRgb) throw new Error(`Invalid brand colour: ${brand.primary}`)
  const primarySeed = rgbToOklch(primaryRgb)

  const accentSeed = brand.accent
    ? rgbToOklch(parseHex(brand.accent) ?? primaryRgb)
    : { ...primarySeed, h: (primarySeed.h + 190) % 360 }

  const tokens: Token[] = []

  /* --- primitive: colour ------------------------------------------------ */

  // Neutrals carry a trace of the brand hue. The effect is below the threshold of
  // conscious notice and above the threshold of felt coherence.
  tokens.push(
    ...rampTokens('neutral', { L: 0.6, C: brand.neutralChroma, h: primarySeed.h }, 0),
    ...rampTokens('brand', primarySeed, -8),
    ...rampTokens('accent', accentSeed, 6),
  )

  for (const [name, hue] of Object.entries(STATUS_HUES)) {
    tokens.push(...rampTokens(name, { L: 0.6, C: 0.16, h: hue }, 0))
  }

  tokens.push(
    { path: 'color.black', type: 'color', tier: 'primitive', value: 'oklch(0 0 0)' },
    { path: 'color.white', type: 'color', tier: 'primitive', value: 'oklch(1 0 0)' },
    { path: 'color.transparent', type: 'color', tier: 'primitive', value: 'transparent' },
  )

  /* --- primitive: dimension --------------------------------------------- */

  const spacingSteps = [0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48]
  for (const step of spacingSteps) {
    tokens.push({
      path: `space.${String(step).replace('.', '-')}`,
      type: 'dimension',
      tier: 'primitive',
      value: `${(step * brand.spacingUnit) / 16}rem`,
    })
  }

  const radii = { none: 0, xs: 2, sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, '3xl': 24, full: 9999 }
  for (const [name, px] of Object.entries(radii)) {
    tokens.push({
      path: `radius.${name}`,
      type: 'dimension',
      tier: 'primitive',
      value: name === 'full' ? '9999px' : `${px / 16}rem`,
    })
  }

  /* --- primitive: typography -------------------------------------------- */

  for (const [name, stack] of Object.entries(brand.fontFamily)) {
    tokens.push({
      path: `font.family.${name}`,
      type: 'fontFamily',
      tier: 'primitive',
      value: stack,
    })
  }

  for (const weight of [400, 500, 600, 700]) {
    const names: Record<number, string> = {
      400: 'regular',
      500: 'medium',
      600: 'semibold',
      700: 'bold',
    }
    tokens.push({
      path: `font.weight.${names[weight]}`,
      type: 'fontWeight',
      tier: 'primitive',
      value: weight,
    })
  }

  const typeSteps = [
    { name: 'xs', step: -2 },
    { name: 'sm', step: -1 },
    { name: 'base', step: 0 },
    { name: 'lg', step: 1 },
    { name: 'xl', step: 2 },
    { name: '2xl', step: 3 },
    { name: '3xl', step: 4 },
    { name: '4xl', step: 5 },
    { name: '5xl', step: 6 },
    { name: '6xl', step: 7 },
  ]

  for (const { name, step } of typeSteps) {
    const size = Number((brand.baseFontSize * brand.typeRatio ** step).toFixed(4))
    tokens.push(
      { path: `font.size.${name}`, type: 'fontSize', tier: 'primitive', value: `${size}rem` },
      {
        path: `font.lineHeight.${name}`,
        type: 'lineHeight',
        tier: 'primitive',
        value: suggestLineHeight(size),
      },
      {
        path: `font.tracking.${name}`,
        type: 'letterSpacing',
        tier: 'primitive',
        value: `${suggestLetterSpacing(size)}em`,
      },
    )
  }

  /* --- primitive: motion ------------------------------------------------ */

  for (const [name, ms] of Object.entries(DURATIONS)) {
    tokens.push({
      path: `motion.duration.${name}`,
      type: 'duration',
      tier: 'primitive',
      value: `${ms}ms`,
    })
  }
  for (const [name, curve] of Object.entries(EASINGS)) {
    tokens.push({
      path: `motion.curve.${name}`,
      type: 'cubicBezier',
      tier: 'primitive',
      value: `cubic-bezier(${curve.join(', ')})`,
    })
  }

  /* --- primitive: elevation --------------------------------------------- */

  // Two shadows per level: a tight one for contact and a wide one for ambient light.
  // A single shadow lacks the contact cue, which is why one-shadow elevation systems
  // always look like stickers rather than raised surfaces.
  const elevations = [
    { name: 'flat', value: 'none' },
    {
      name: 'raised',
      value:
        '0 1px 2px -1px rgb(from {color.neutral.900} r g b / 0.10), 0 2px 6px -1px rgb(from {color.neutral.900} r g b / 0.06)',
    },
    {
      name: 'floating',
      value:
        '0 2px 4px -2px rgb(from {color.neutral.900} r g b / 0.12), 0 8px 20px -4px rgb(from {color.neutral.900} r g b / 0.10)',
    },
    {
      name: 'overlay',
      value:
        '0 4px 8px -4px rgb(from {color.neutral.900} r g b / 0.16), 0 20px 48px -8px rgb(from {color.neutral.900} r g b / 0.16)',
    },
  ]
  for (const { name, value } of elevations) {
    tokens.push({ path: `elevation.${name}`, type: 'shadow', tier: 'primitive', value })
  }

  /* --- primitive: z-index ----------------------------------------------- */

  // A documented stacking scale. Arbitrary z-index values are the reason every mature
  // codebase eventually contains a `z-index: 999999`.
  const layers = {
    base: 0,
    raised: 10,
    sticky: 100,
    header: 200,
    dropdown: 300,
    overlay: 400,
    modal: 500,
    popover: 600,
    toast: 700,
    tooltip: 800,
  }
  for (const [name, value] of Object.entries(layers)) {
    tokens.push({ path: `layer.${name}`, type: 'zIndex', tier: 'primitive', value })
  }

  /* --- semantic --------------------------------------------------------- */

  const semantic: Array<[string, string, string, string]> = [
    // [path, light value, dark value, description]
    [
      'surface.canvas',
      '{color.white}',
      '{color.neutral.950}',
      'The page background. Never pure black in dark mode, because pure black causes haloing around light text on OLED displays.',
    ],
    [
      'surface.default',
      '{color.white}',
      '{color.neutral.900}',
      'Default surface for cards and panels sitting on the canvas.',
    ],
    [
      'surface.subtle',
      '{color.neutral.50}',
      '{color.neutral.800}',
      'A quieter surface for nested regions. Not for text backgrounds where contrast matters.',
    ],
    [
      'surface.raised',
      '{color.white}',
      '{color.neutral.800}',
      'Elevated surface. In dark themes elevation is expressed by lightness rather than shadow, since shadows are invisible against a dark background.',
    ],
    [
      'surface.inverse',
      '{color.neutral.900}',
      '{color.neutral.50}',
      'Inverted surface for tooltips and high-emphasis callouts. Do not use for large regions.',
    ],
    [
      'text.primary',
      '{color.neutral.900}',
      '{color.neutral.50}',
      'Body and heading text. Must clear 4.5:1 against every surface it is used on.',
    ],
    [
      'text.secondary',
      '{color.neutral.700}',
      '{color.neutral.300}',
      'Supporting text. Still meets 4.5:1 — if text needs to recede further than this, consider removing it instead.',
    ],
    [
      'text.tertiary',
      '{color.neutral.600}',
      '{color.neutral.400}',
      'Metadata and captions. Meets 4.5:1 at body size; do not use below the minimum body size.',
    ],
    [
      'text.disabled',
      '{color.neutral.400}',
      '{color.neutral.600}',
      'Disabled text only. Deliberately below the contrast threshold, so it must never carry information the user needs.',
    ],
    [
      'text.inverse',
      '{color.white}',
      '{color.neutral.950}',
      'Text on inverse surfaces and filled brand backgrounds.',
    ],
    [
      'border.subtle',
      '{color.neutral.200}',
      '{color.neutral.800}',
      'Decorative separators. Not for interactive boundaries, which need 3:1.',
    ],
    [
      'border.default',
      '{color.neutral.300}',
      '{color.neutral.700}',
      'Default borders on inputs and cards.',
    ],
    [
      'border.strong',
      '{color.neutral.400}',
      '{color.neutral.600}',
      'Interactive component boundaries. Meets the 3:1 non-text contrast requirement.',
    ],
    [
      'action.primary.bg',
      '{color.brand.600}',
      '{color.brand.500}',
      'The primary action background. Exactly one primary action per view.',
    ],
    [
      'action.primary.bgHover',
      '{color.brand.700}',
      '{color.brand.400}',
      'Primary action hover. Darker in light themes and lighter in dark themes, so the direction of change stays consistent with "more energy".',
    ],
    [
      'action.primary.bgActive',
      '{color.brand.800}',
      '{color.brand.300}',
      'Primary action pressed state.',
    ],
    [
      'action.primary.fg',
      '{color.white}',
      '{color.neutral.950}',
      'Label colour on the primary action.',
    ],
    [
      'action.secondary.bg',
      '{color.neutral.100}',
      '{color.neutral.800}',
      'Secondary action background, for actions that are available but not expected.',
    ],
    [
      'action.secondary.fg',
      '{color.neutral.900}',
      '{color.neutral.100}',
      'Secondary action label.',
    ],
    [
      'focus.ring',
      '{color.brand.600}',
      '{color.brand.400}',
      'Focus indicator. Must reach 3:1 against both the component and the page background, which is why it is not simply the brand colour at every tint.',
    ],
    [
      'status.danger.fg',
      '{color.danger.700}',
      '{color.danger.300}',
      'Error text. Always pair with an icon or label, since colour alone is not an accessible signal.',
    ],
    ['status.danger.bg', '{color.danger.50}', '{color.danger.950}', 'Error surface.'],
    ['status.success.fg', '{color.success.700}', '{color.success.300}', 'Success text.'],
    ['status.success.bg', '{color.success.50}', '{color.success.950}', 'Success surface.'],
    ['status.warning.fg', '{color.warning.800}', '{color.warning.300}', 'Warning text.'],
    ['status.warning.bg', '{color.warning.50}', '{color.warning.950}', 'Warning surface.'],
    ['status.info.fg', '{color.info.700}', '{color.info.300}', 'Informational text.'],
    ['status.info.bg', '{color.info.50}', '{color.info.950}', 'Informational surface.'],
  ]

  for (const [path, light, dark, description] of semantic) {
    tokens.push({
      path: `color.${path}`,
      type: 'color',
      tier: 'semantic',
      value: light,
      themes: { dark },
      description,
    })
  }

  const semanticSpace: Array<[string, string, string]> = [
    ['space.gutter', '{space.4}', 'Horizontal padding inside containers at the smallest viewport.'],
    ['space.stack.tight', '{space.2}', 'Vertical gap between closely related elements.'],
    ['space.stack.default', '{space.4}', 'Vertical gap between elements within a group.'],
    ['space.stack.loose', '{space.8}', 'Vertical gap between groups within a section.'],
    [
      'space.section',
      '{space.24}',
      'Vertical gap between top-level sections. Must exceed the largest within-section gap by at least 3x, or the page reads as one undifferentiated block.',
    ],
    [
      'space.inset.sm',
      '{space.3}',
      'Padding inside small components such as badges and compact buttons.',
    ],
    ['space.inset.md', '{space.4}', 'Padding inside standard components.'],
    ['space.inset.lg', '{space.6}', 'Padding inside cards and panels.'],
    ['space.inset.xl', '{space.10}', 'Padding inside large surfaces and modals.'],
  ]
  for (const [path, value, description] of semanticSpace) {
    tokens.push({ path, type: 'dimension', tier: 'semantic', value, description })
  }

  const semanticMotion: Array<[string, string, string]> = [
    ['motion.enter', '{motion.duration.brisk}', 'Duration for elements entering the view.'],
    [
      'motion.exit',
      '{motion.duration.quick}',
      'Duration for elements leaving. Always shorter than enter — the user has already decided.',
    ],
    [
      'motion.transform',
      '{motion.duration.measured}',
      'Duration for an element changing between two held states.',
    ],
    ['motion.easing.enter', '{motion.curve.entrance}', 'Decelerating curve for arrivals.'],
    ['motion.easing.exit', '{motion.curve.exit}', 'Accelerating curve for departures.'],
    [
      'motion.easing.default',
      '{motion.curve.standard}',
      'Symmetric curve for two-way state changes.',
    ],
  ]
  for (const [path, value, description] of semanticMotion) {
    tokens.push({
      path,
      type: path.includes('easing') ? 'cubicBezier' : 'duration',
      tier: 'semantic',
      value,
      description,
    })
  }

  return {
    name: 'vishwakarma-default',
    version: '1.0.0',
    description:
      'The default Vishwakarma token set, derived from a single brand colour and a small number of scale inputs.',
    themes: ['dark'],
    tokens,
    meta: {
      generatedFrom: brand.primary,
      spacingUnit: brand.spacingUnit,
      typeRatio: brand.typeRatio,
    },
  }
}

/** The set produced by the default brand input. */
export const defaultTokenSet: TokenSet = buildTokenSet()
