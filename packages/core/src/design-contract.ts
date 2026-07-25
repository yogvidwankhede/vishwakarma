/**
 * The Design Contract.
 *
 * A design system is normally a collection of components plus a document asking people to
 * use them properly. That works when the people are humans who read documents. It fails
 * badly when the "person" is a language model generating a component at 3am, because a
 * model will cheerfully produce something that imports your `Button` and then sets
 * `padding: 13px` on it.
 *
 * A Design Contract is the same information expressed as machine-checkable constraints.
 * Instead of "use the spacing scale", it says: every spacing value in the output must be a
 * member of this set, and here is the checker that proves it. That turns design review
 * from a matter of opinion into a test that either passes or fails, which is the only
 * form of guidance an autonomous agent can reliably act on.
 *
 * The contract is deliberately about *constraints*, not *content*. It never says what a
 * page should contain. It says what the grammar of the output must be, in the same way a
 * type system says nothing about what your function should compute.
 */

import type { Oklch } from './color.js'

/* -------------------------------------------------------------------------- */
/* Severity                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * How much a violation matters.
 *
 * Splitting these is what keeps the contract usable. If every rule is an error, teams
 * turn the whole thing off the first time a legitimate exception appears. If nothing is
 * an error, nothing gets fixed. Accessibility and correctness violations are errors
 * because they harm users; aesthetic violations are warnings because reasonable people
 * differ and context wins.
 */
export type Severity = 'error' | 'warning' | 'suggestion'

export interface Violation {
  /** Stable identifier, e.g. `spacing/off-scale`. */
  rule: string
  severity: Severity
  message: string
  /** What was found. */
  actual?: string | number
  /** What the contract expects. */
  expected?: string | number
  /** Where it was found, when the caller can supply a location. */
  location?: { file?: string; line?: number; selector?: string; component?: string }
  /** A concrete fix, phrased so it can be applied without further thought. */
  fix?: string
}

export interface ContractReport {
  passed: boolean
  violations: Violation[]
  /** 0..100. Not a grade so much as a trend line — useful in CI, meaningless in isolation. */
  score: number
  summary: { errors: number; warnings: number; suggestions: number; checked: number }
}

/* -------------------------------------------------------------------------- */
/* Contract shape                                                              */
/* -------------------------------------------------------------------------- */

export interface SpacingContract {
  /** Allowed spacing values, in px. Anything else is off-scale. */
  scale: number[]
  /**
   * The smallest unit everything must be a multiple of. Most systems use 4. An 8-based
   * system is calmer but less flexible at small sizes; a 4-based system with discipline
   * about which steps are actually used gets both.
   */
  baseUnit: number
  /** Values permitted despite being off-scale — hairlines, optical corrections. */
  exceptions?: number[]
}

export interface TypographyContract {
  /** Allowed font sizes, in rem. */
  sizes: number[]
  /** Allowed font weights. Restricting this prevents the 500/600 drift that muddies hierarchy. */
  weights: number[]
  /**
   * Maximum number of distinct sizes that may appear in one view. Hierarchy is a
   * comparison, and a view with eleven type sizes has no hierarchy — it has noise.
   */
  maxSizesPerView?: number
  /** Maximum line length in characters, for prose containers. */
  maxMeasure?: number
  /** Minimum body size in rem. Below 0.875rem, sustained reading becomes work. */
  minBodySize?: number
}

export interface ColourContract {
  /** Named ramps that the design system exposes. */
  ramps: Record<string, Oklch[]>
  /**
   * Minimum WCAG contrast for normal-sized body text. 4.5 is the AA requirement; 7 is AAA
   * and is worth targeting for anything a user reads for more than a few seconds.
   */
  minContrastBody: number
  /** Minimum contrast for large text — 18.66px bold or 24px regular and above. */
  minContrastLarge: number
  /**
   * Minimum contrast for interactive component boundaries and meaningful graphics. This
   * one is routinely missed: a button whose *label* passes but whose *border* does not is
   * still a failure, and it is the reason so many "accessible" forms are unusable for
   * low-vision users.
   */
  minContrastNonText: number
  /** Cap on distinct hues in one view. More than a handful and the palette stops reading as a system. */
  maxHuesPerView?: number
  /** Forbid raw colour literals in component source, forcing everything through tokens. */
  forbidRawColours?: boolean
}

export interface MotionContract {
  /** Allowed durations, in ms. */
  durations: number[]
  /** Hard ceiling. Past this, a transition becomes a wait. */
  maxDurationMs: number
  /** Whether every non-essential animation must be gated behind prefers-reduced-motion. */
  requireReducedMotionGuard: boolean
  /** Whether animating layout-triggering properties is an error rather than a warning. */
  forbidLayoutAnimation: boolean
  /** Cap on simultaneously animating elements, as a proxy for frame budget. */
  maxConcurrentAnimations?: number
}

export interface LayoutContract {
  /** Named breakpoints, in px. */
  breakpoints: Record<string, number>
  /** Minimum interactive target size in px. 44 is the widely-cited touch minimum. */
  minTouchTarget: number
  /** Maximum content width in px, beyond which line lengths become unreadable. */
  maxContentWidth?: number
  /** Allowed border radii, in px. Mixing radii arbitrarily is a strong tell of unsystematic work. */
  radii?: number[]
  /** Require that no horizontal overflow exists at the narrowest breakpoint. */
  forbidHorizontalOverflow?: boolean
}

export interface AccessibilityContract {
  /** Target conformance level. */
  level: 'A' | 'AA' | 'AAA'
  /** Require a visible focus indicator on every interactive element. */
  requireFocusVisible: boolean
  /** Require that colour is never the sole carrier of meaning. */
  forbidColourOnlyMeaning: boolean
  /** Require an accessible name on every interactive element. */
  requireAccessibleNames: boolean
  /** Require that heading levels descend without skipping. */
  requireHeadingOrder: boolean
  /** Minimum contrast of the focus indicator against its adjacent background. */
  minFocusIndicatorContrast?: number
}

export interface PerformanceContract {
  /** Budget for the largest contentful paint, in ms. */
  lcpBudgetMs?: number
  /** Budget for interaction to next paint, in ms. */
  inpBudgetMs?: number
  /** Budget for cumulative layout shift, unitless. */
  clsBudget?: number
  /** Budget for the client JavaScript a single route may ship, in KB after compression. */
  routeJsBudgetKb?: number
  /** Require explicit dimensions on media, which is the cheapest CLS fix there is. */
  requireMediaDimensions?: boolean
}

export interface DesignContract {
  /** Contract identifier, e.g. `acme-web@2`. */
  id: string
  /** Human-readable name. */
  name: string
  /** Contract format version, for forward compatibility. */
  version: string
  spacing: SpacingContract
  typography: TypographyContract
  colour: ColourContract
  motion: MotionContract
  layout: LayoutContract
  accessibility: AccessibilityContract
  performance?: PerformanceContract
  /** Per-rule severity overrides, keyed by rule id. */
  severityOverrides?: Record<string, Severity>
  /** Rules to switch off entirely, each with a stated reason so the exception is auditable. */
  disabled?: Array<{ rule: string; reason: string }>
}

/* -------------------------------------------------------------------------- */
/* Checking                                                                    */
/* -------------------------------------------------------------------------- */

/** What a checker is handed. Every field is optional so partial analysis still produces value. */
export interface Observation {
  spacingValues?: number[]
  fontSizesRem?: number[]
  fontWeights?: number[]
  durationsMs?: number[]
  radiiPx?: number[]
  hues?: number[]
  contrastPairs?: Array<{
    ratio: number
    kind: 'body' | 'large' | 'non-text'
    label?: string
  }>
  touchTargetsPx?: Array<{ width: number; height: number; label?: string }>
  animatedProperties?: string[]
  hasReducedMotionGuard?: boolean
  headingLevels?: number[]
  interactiveWithoutName?: string[]
  rawColourLiterals?: string[]
  location?: Violation['location']
}

const severityWeight: Record<Severity, number> = { error: 10, warning: 3, suggestion: 1 }

/**
 * Evaluate an observation against a contract.
 *
 * The checker is intentionally pure and synchronous. It takes numbers in and gives
 * violations out, with no filesystem, DOM, or network access, so the same logic can run
 * inside a linter, inside a browser test, inside CI, and inside an agent's own
 * self-review loop without three separate implementations drifting apart.
 */
export function checkContract(contract: DesignContract, observation: Observation): ContractReport {
  const violations: Violation[] = []
  let checked = 0

  const disabled = new Set((contract.disabled ?? []).map((d) => d.rule))
  const severityOf = (rule: string, fallback: Severity): Severity =>
    contract.severityOverrides?.[rule] ?? fallback

  const report = (
    rule: string,
    fallbackSeverity: Severity,
    message: string,
    extra: Partial<Violation> = {},
  ): void => {
    if (disabled.has(rule)) return
    violations.push({ rule, severity: severityOf(rule, fallbackSeverity), message, ...extra })
  }

  /* --- spacing ---------------------------------------------------------- */
  if (observation.spacingValues) {
    const allowed = new Set([...contract.spacing.scale, ...(contract.spacing.exceptions ?? [])])
    for (const value of observation.spacingValues) {
      checked++
      if (allowed.has(value)) continue

      const offGrid = value % contract.spacing.baseUnit !== 0
      const nearest = contract.spacing.scale.reduce((best, candidate) =>
        Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best,
      )
      report(
        offGrid ? 'spacing/off-grid' : 'spacing/off-scale',
        offGrid ? 'error' : 'warning',
        offGrid
          ? `Spacing ${value}px is not a multiple of the ${contract.spacing.baseUnit}px base unit.`
          : `Spacing ${value}px is on the grid but not on the scale.`,
        {
          actual: value,
          expected: nearest,
          fix: `Replace ${value}px with ${nearest}px.`,
          ...(observation.location ? { location: observation.location } : {}),
        },
      )
    }
  }

  /* --- typography ------------------------------------------------------- */
  if (observation.fontSizesRem) {
    const allowed = new Set(contract.typography.sizes)
    const distinct = new Set(observation.fontSizesRem)

    for (const size of distinct) {
      checked++
      if (!allowed.has(size)) {
        const nearest = contract.typography.sizes.reduce((best, candidate) =>
          Math.abs(candidate - size) < Math.abs(best - size) ? candidate : best,
        )
        report('typography/off-scale', 'warning', `Font size ${size}rem is not on the type scale.`, {
          actual: `${size}rem`,
          expected: `${nearest}rem`,
          fix: `Replace ${size}rem with ${nearest}rem.`,
        })
      }
      if (contract.typography.minBodySize && size < contract.typography.minBodySize) {
        report(
          'typography/too-small',
          'error',
          `Font size ${size}rem is below the minimum readable body size.`,
          { actual: `${size}rem`, expected: `${contract.typography.minBodySize}rem` },
        )
      }
    }

    const max = contract.typography.maxSizesPerView
    if (max && distinct.size > max) {
      report(
        'typography/too-many-sizes',
        'warning',
        `${distinct.size} distinct font sizes in one view. Hierarchy needs contrast between few levels, not many similar ones.`,
        {
          actual: distinct.size,
          expected: max,
          fix: 'Collapse near-identical sizes into a single step, and use weight or colour for the remaining distinction.',
        },
      )
    }
  }

  if (observation.fontWeights) {
    const allowed = new Set(contract.typography.weights)
    for (const weight of new Set(observation.fontWeights)) {
      checked++
      if (!allowed.has(weight)) {
        report('typography/off-weight', 'warning', `Font weight ${weight} is not in the system.`, {
          actual: weight,
          expected: contract.typography.weights.join(', '),
        })
      }
    }
  }

  /* --- colour ----------------------------------------------------------- */
  if (observation.contrastPairs) {
    for (const pair of observation.contrastPairs) {
      checked++
      const required =
        pair.kind === 'body'
          ? contract.colour.minContrastBody
          : pair.kind === 'large'
            ? contract.colour.minContrastLarge
            : contract.colour.minContrastNonText

      if (pair.ratio < required) {
        report(
          `colour/contrast-${pair.kind}`,
          'error',
          `Contrast ${pair.ratio.toFixed(2)}:1${pair.label ? ` on ${pair.label}` : ''} is below the required ${required}:1.`,
          {
            actual: Number(pair.ratio.toFixed(2)),
            expected: required,
            fix: 'Darken the foreground or lighten the background. Adjust lightness rather than chroma so the hue stays recognisable.',
          },
        )
      }
    }
  }

  if (observation.hues && contract.colour.maxHuesPerView) {
    checked++
    // Bucket hues by 30 degrees; colours closer than that read as the same family.
    const families = new Set(observation.hues.map((h) => Math.round(h / 30)))
    if (families.size > contract.colour.maxHuesPerView) {
      report(
        'colour/too-many-hues',
        'warning',
        `${families.size} distinct hue families in one view.`,
        {
          actual: families.size,
          expected: contract.colour.maxHuesPerView,
          fix: 'Reduce to one dominant hue, one supporting neutral, and at most one accent reserved for a single job.',
        },
      )
    }
  }

  if (contract.colour.forbidRawColours && observation.rawColourLiterals?.length) {
    for (const literal of observation.rawColourLiterals) {
      checked++
      report('colour/raw-literal', 'error', `Raw colour literal ${literal} found in source.`, {
        actual: literal,
        fix: 'Reference a design token instead, so the value participates in theming.',
      })
    }
  }

  /* --- motion ----------------------------------------------------------- */
  if (observation.durationsMs) {
    const allowed = new Set(contract.motion.durations)
    for (const duration of observation.durationsMs) {
      checked++
      if (duration > contract.motion.maxDurationMs) {
        report('motion/too-long', 'warning', `Animation of ${duration}ms exceeds the maximum.`, {
          actual: duration,
          expected: contract.motion.maxDurationMs,
          fix: 'Shorten it. A transition the user notices waiting for is a transition that should not exist.',
        })
      } else if (!allowed.has(duration)) {
        report('motion/off-scale', 'suggestion', `Duration ${duration}ms is not a system step.`, {
          actual: duration,
          expected: contract.motion.durations.join(', '),
        })
      }
    }
  }

  if (observation.animatedProperties && contract.motion.forbidLayoutAnimation) {
    const layoutProps = new Set([
      'width',
      'height',
      'top',
      'left',
      'right',
      'bottom',
      'margin',
      'padding',
      'font-size',
    ])
    for (const property of observation.animatedProperties) {
      checked++
      if (layoutProps.has(property.toLowerCase())) {
        report('motion/layout-animation', 'error', `Animating "${property}" forces layout every frame.`, {
          actual: property,
          fix: 'Animate transform or opacity instead, or use a measured layout-animation technique.',
        })
      }
    }
  }

  if (
    contract.motion.requireReducedMotionGuard &&
    observation.animatedProperties?.length &&
    observation.hasReducedMotionGuard === false
  ) {
    checked++
    report(
      'motion/missing-reduced-motion',
      'error',
      'Animation present with no prefers-reduced-motion guard.',
      {
        fix: 'Wrap the animation in a reduced-motion check and fall back to an opacity-only transition.',
      },
    )
  }

  /* --- layout ----------------------------------------------------------- */
  if (observation.touchTargetsPx) {
    for (const target of observation.touchTargetsPx) {
      checked++
      const smallest = Math.min(target.width, target.height)
      if (smallest < contract.layout.minTouchTarget) {
        report(
          'layout/touch-target',
          'error',
          `Interactive target${target.label ? ` "${target.label}"` : ''} is ${target.width}×${target.height}px, below the ${contract.layout.minTouchTarget}px minimum.`,
          {
            actual: `${target.width}×${target.height}`,
            expected: `${contract.layout.minTouchTarget}×${contract.layout.minTouchTarget}`,
            fix: 'Increase padding, or extend the hit area with a pseudo-element so the visual size can stay small.',
          },
        )
      }
    }
  }

  if (observation.radiiPx && contract.layout.radii) {
    const allowed = new Set(contract.layout.radii)
    for (const radius of new Set(observation.radiiPx)) {
      checked++
      if (!allowed.has(radius)) {
        report('layout/off-radius', 'suggestion', `Border radius ${radius}px is not a system value.`, {
          actual: radius,
          expected: contract.layout.radii.join(', '),
        })
      }
    }
  }

  /* --- accessibility ---------------------------------------------------- */
  if (observation.headingLevels && contract.accessibility.requireHeadingOrder) {
    checked++
    let previous = 0
    for (const level of observation.headingLevels) {
      if (previous !== 0 && level > previous + 1) {
        report(
          'a11y/heading-skip',
          'error',
          `Heading level jumps from h${previous} to h${level}.`,
          {
            actual: `h${previous} → h${level}`,
            expected: `h${previous} → h${previous + 1}`,
            fix: 'Use the next level down and restyle it, rather than picking a level for its appearance.',
          },
        )
      }
      previous = level
    }
  }

  if (contract.accessibility.requireAccessibleNames && observation.interactiveWithoutName?.length) {
    for (const element of observation.interactiveWithoutName) {
      checked++
      report('a11y/missing-name', 'error', `Interactive element "${element}" has no accessible name.`, {
        actual: element,
        fix: 'Add visible text, or an aria-label when the control is icon-only.',
      })
    }
  }

  /* --- score ------------------------------------------------------------ */
  const penalty = violations.reduce((sum, v) => sum + severityWeight[v.severity], 0)
  // Normalised against the number of things we actually looked at, so a large clean
  // surface is not punished for having more opportunities to fail.
  const denominator = Math.max(checked, 1) * 2
  const score = Math.max(0, Math.round(100 - (penalty / denominator) * 100))

  const summary = {
    errors: violations.filter((v) => v.severity === 'error').length,
    warnings: violations.filter((v) => v.severity === 'warning').length,
    suggestions: violations.filter((v) => v.severity === 'suggestion').length,
    checked,
  }

  return { passed: summary.errors === 0, violations, score, summary }
}

/* -------------------------------------------------------------------------- */
/* Default contract                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A sensible starting contract.
 *
 * These values are opinionated on purpose. A contract full of permissive defaults teaches
 * an agent nothing, because everything passes. Teams should fork this and argue with it —
 * the argument is the point, and a contract that has been argued over is one the team
 * will actually keep.
 */
export const DEFAULT_CONTRACT: DesignContract = {
  id: 'vishwakarma/default',
  name: 'Vishwakarma Default Contract',
  version: '1.0.0',
  spacing: {
    baseUnit: 4,
    scale: [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192],
    exceptions: [1, 3],
  },
  typography: {
    sizes: [0.75, 0.8125, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 3.75, 4.5],
    weights: [400, 500, 600, 700],
    maxSizesPerView: 6,
    maxMeasure: 75,
    minBodySize: 0.875,
  },
  colour: {
    ramps: {},
    minContrastBody: 4.5,
    minContrastLarge: 3,
    minContrastNonText: 3,
    maxHuesPerView: 3,
    forbidRawColours: true,
  },
  motion: {
    durations: [90, 140, 200, 280, 380, 560],
    maxDurationMs: 600,
    requireReducedMotionGuard: true,
    forbidLayoutAnimation: true,
    maxConcurrentAnimations: 12,
  },
  layout: {
    breakpoints: { xs: 380, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 },
    minTouchTarget: 44,
    maxContentWidth: 1280,
    radii: [0, 2, 4, 6, 8, 12, 16, 24, 9999],
    forbidHorizontalOverflow: true,
  },
  accessibility: {
    level: 'AA',
    requireFocusVisible: true,
    forbidColourOnlyMeaning: true,
    requireAccessibleNames: true,
    requireHeadingOrder: true,
    minFocusIndicatorContrast: 3,
  },
  performance: {
    lcpBudgetMs: 2500,
    inpBudgetMs: 200,
    clsBudget: 0.1,
    routeJsBudgetKb: 180,
    requireMediaDimensions: true,
  },
}

/** Merge a partial override onto a base contract, section by section. */
export function extendContract(
  base: DesignContract,
  overrides: DeepPartial<DesignContract>,
): DesignContract {
  return {
    ...base,
    ...overrides,
    spacing: { ...base.spacing, ...overrides.spacing },
    typography: { ...base.typography, ...overrides.typography },
    colour: { ...base.colour, ...overrides.colour },
    motion: { ...base.motion, ...overrides.motion },
    layout: { ...base.layout, ...overrides.layout },
    accessibility: { ...base.accessibility, ...overrides.accessibility },
    performance: { ...base.performance, ...overrides.performance },
  } as DesignContract
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}
