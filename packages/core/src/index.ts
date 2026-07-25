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
  type Rgb,
  type Oklab,
  type Oklch,
  type RampOptions,
  srgbToLinear,
  linearToSrgb,
  rgbToOklab,
  oklabToRgb,
  oklabToOklch,
  oklchToOklab,
  rgbToOklch,
  oklchToRgb,
  isInSrgbGamut,
  clampChromaToSrgb,
  parseHex,
  toHex,
  toCssOklch,
  relativeLuminance,
  contrastRatio,
  apcaContrast,
  findAccessibleLightness,
  buildRamp,
  labelRamp,
  RAMP_STOPS,
} from './color.js'

export {
  type ScaleRatioName,
  type ModularScaleOptions,
  type ScaleStep,
  type FluidOptions,
  type FluidScaleOptions,
  type FluidScaleStep,
  SCALE_RATIOS,
  MEASURE,
  resolveRatio,
  modularScale,
  fluidClamp,
  fluidModularScale,
  suggestLineHeight,
  suggestLetterSpacing,
  measureToCh,
} from './scale.js'

export {
  type BezierTuple,
  type EasingName,
  type DurationName,
  type MotionDistance,
  type MotionIntent,
  type MotionRequest,
  type ResolvedMotion,
  type StaggerOptions,
  type SpringSpec,
  type SpringName,
  type PropertyVerdict,
  EASINGS,
  DURATIONS,
  SPRINGS,
  INTENT_PROFILES,
  COMPOSITED_PROPERTIES,
  LAYOUT_TRIGGERING_PROPERTIES,
  VESTIBULAR_RISK_PROPERTIES,
  toCssEasing,
  resolveMotion,
  stagger,
  toPhysicalSpring,
  judgeProperty,
  needsReducedMotionGuard,
} from './motion-grammar.js'

export {
  type Severity,
  type Violation,
  type ContractReport,
  type SpacingContract,
  type TypographyContract,
  type ColourContract,
  type MotionContract,
  type LayoutContract,
  type AccessibilityContract,
  type PerformanceContract,
  type DesignContract,
  type Observation,
  DEFAULT_CONTRACT,
  checkContract,
  extendContract,
} from './design-contract.js'

export {
  type ViewportCategory,
  type ViewportProfile,
  type BreakpointName,
  VIEWPORT_MATRIX,
  REQUIRED_VIEWPORTS,
  BREAKPOINTS,
  BREAKPOINT_GUIDANCE,
  effectiveWidth,
  checksFor,
  mediaUp,
  mediaDown,
  containerUp,
} from './viewport.js'
