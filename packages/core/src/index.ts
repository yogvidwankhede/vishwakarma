// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/core
 *
 * The design-intelligence layer. Everything here is pure, dependency-free, and framework-
 * agnostic, because it is consumed from four very different places: React components at
 * runtime, the token build pipeline at compile time, the CLI auditor in a terminal, and an
 * AI agent reasoning about a design decision through the MCP server. Anything that
 * imported React or touched the filesystem would be unusable in at least two of those.
 */

export {
  apcaContrast,
  buildRamp,
  clampChromaToSrgb,
  contrastRatio,
  findAccessibleLightness,
  isInSrgbGamut,
  labelRamp,
  linearToSrgb,
  type Oklab,
  type Oklch,
  oklabToOklch,
  oklabToRgb,
  oklchToOklab,
  oklchToRgb,
  parseHex,
  RAMP_STOPS,
  type RampOptions,
  type Rgb,
  relativeLuminance,
  rgbToOklab,
  rgbToOklch,
  srgbToLinear,
  toCssOklch,
  toHex,
} from './color.js'
export {
  type AccessibilityContract,
  type ColourContract,
  type ContractReport,
  checkContract,
  DEFAULT_CONTRACT,
  type DesignContract,
  extendContract,
  type LayoutContract,
  type MotionContract,
  type Observation,
  type PerformanceContract,
  type Severity,
  type SpacingContract,
  type TypographyContract,
  type Violation,
} from './design-contract.js'

export {
  type BezierTuple,
  COMPOSITED_PROPERTIES,
  DURATIONS,
  type DurationName,
  EASINGS,
  type EasingName,
  INTENT_PROFILES,
  judgeProperty,
  LAYOUT_TRIGGERING_PROPERTIES,
  type MotionDistance,
  type MotionIntent,
  type MotionRequest,
  needsReducedMotionGuard,
  type PropertyVerdict,
  type ResolvedMotion,
  resolveMotion,
  SPRINGS,
  type SpringName,
  type SpringSpec,
  type StaggerOptions,
  stagger,
  toCssEasing,
  toPhysicalSpring,
  VESTIBULAR_RISK_PROPERTIES,
} from './motion-grammar.js'
export {
  type FluidOptions,
  type FluidScaleOptions,
  type FluidScaleStep,
  fluidClamp,
  fluidModularScale,
  MEASURE,
  type ModularScaleOptions,
  measureToCh,
  modularScale,
  resolveRatio,
  SCALE_RATIOS,
  type ScaleRatioName,
  type ScaleStep,
  suggestLetterSpacing,
  suggestLineHeight,
} from './scale.js'
export {
  hashSequence,
  hashString,
  type ResolvedVariant,
  resolveVariation,
  VARIANT_AXES,
  type VariantAxis,
  type VariantOption,
  type VariationRequest,
  type VariationResult,
  variationSpace,
} from './variation.js'
export {
  BREAKPOINT_GUIDANCE,
  BREAKPOINTS,
  type BreakpointName,
  checksFor,
  containerUp,
  effectiveWidth,
  mediaDown,
  mediaUp,
  REQUIRED_VIEWPORTS,
  VIEWPORT_MATRIX,
  type ViewportCategory,
  type ViewportProfile,
} from './viewport.js'
