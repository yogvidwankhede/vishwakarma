// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { checkContract, DEFAULT_CONTRACT, extendContract } from './design-contract.js'

describe('spacing checks', () => {
  it('accepts values on the scale', () => {
    const report = checkContract(DEFAULT_CONTRACT, { spacingValues: [4, 8, 16, 24, 48] })
    expect(report.violations).toHaveLength(0)
    expect(report.passed).toBe(true)
  })

  it('treats an off-grid value as an error and names the nearest scale step', () => {
    const report = checkContract(DEFAULT_CONTRACT, { spacingValues: [13] })
    const violation = report.violations[0]
    expect(violation?.rule).toBe('spacing/off-grid')
    expect(violation?.severity).toBe('error')
    expect(violation?.expected).toBe(12)
    expect(violation?.fix).toContain('12px')
  })

  it('treats an on-grid but off-scale value as a warning, not an error', () => {
    // 28 is a multiple of 4 but is deliberately absent from the scale. That is a weaker
    // problem than being off the grid entirely, and conflating the two makes teams
    // disable the rule.
    const report = checkContract(DEFAULT_CONTRACT, { spacingValues: [28] })
    expect(report.violations[0]?.rule).toBe('spacing/off-scale')
    expect(report.violations[0]?.severity).toBe('warning')
    expect(report.passed).toBe(true)
  })

  it('permits documented exceptions such as hairlines', () => {
    expect(checkContract(DEFAULT_CONTRACT, { spacingValues: [1, 3] }).violations).toHaveLength(0)
  })
})

describe('typography checks', () => {
  it('flags sizes below the readable minimum as errors', () => {
    const report = checkContract(DEFAULT_CONTRACT, { fontSizesRem: [0.625] })
    expect(
      report.violations.some((v) => v.rule === 'typography/too-small' && v.severity === 'error'),
    ).toBe(true)
  })

  it('flags too many distinct sizes in one view', () => {
    const report = checkContract(DEFAULT_CONTRACT, {
      fontSizesRem: [0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25],
    })
    const violation = report.violations.find((v) => v.rule === 'typography/too-many-sizes')
    expect(violation).toBeDefined()
    expect(violation?.actual).toBe(8)
  })

  it('counts distinct sizes rather than occurrences', () => {
    const report = checkContract(DEFAULT_CONTRACT, {
      fontSizesRem: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    })
    expect(report.violations.some((v) => v.rule === 'typography/too-many-sizes')).toBe(false)
  })
})

describe('contrast checks', () => {
  it('applies the correct threshold per text size', () => {
    const report = checkContract(DEFAULT_CONTRACT, {
      contrastPairs: [
        { ratio: 3.2, kind: 'body', label: 'caption' },
        { ratio: 3.2, kind: 'large', label: 'heading' },
      ],
    })
    // The same ratio fails as body text and passes as large text.
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.rule).toBe('colour/contrast-body')
  })

  it('checks non-text contrast, which is the requirement most often missed', () => {
    const report = checkContract(DEFAULT_CONTRACT, {
      contrastPairs: [{ ratio: 1.4, kind: 'non-text', label: 'input border' }],
    })
    expect(report.violations[0]?.rule).toBe('colour/contrast-non-text')
    expect(report.violations[0]?.message).toContain('input border')
  })
})

describe('motion checks', () => {
  it('rejects animating a layout-triggering property', () => {
    const report = checkContract(DEFAULT_CONTRACT, { animatedProperties: ['width'] })
    const violation = report.violations.find((v) => v.rule === 'motion/layout-animation')
    expect(violation?.severity).toBe('error')
    expect(violation?.fix).toContain('transform')
  })

  it('accepts composited properties', () => {
    const report = checkContract(DEFAULT_CONTRACT, {
      animatedProperties: ['transform', 'opacity'],
      hasReducedMotionGuard: true,
    })
    expect(report.violations).toHaveLength(0)
  })

  it('requires a reduced-motion guard when animation is present', () => {
    const report = checkContract(DEFAULT_CONTRACT, {
      animatedProperties: ['transform'],
      hasReducedMotionGuard: false,
    })
    expect(report.violations.some((v) => v.rule === 'motion/missing-reduced-motion')).toBe(true)
  })

  it('does not demand a guard when no animation was reported', () => {
    const report = checkContract(DEFAULT_CONTRACT, { hasReducedMotionGuard: false })
    expect(report.violations).toHaveLength(0)
  })

  it('flags durations past the ceiling', () => {
    const report = checkContract(DEFAULT_CONTRACT, { durationsMs: [1200] })
    expect(report.violations[0]?.rule).toBe('motion/too-long')
  })
})

describe('layout and accessibility checks', () => {
  it('flags undersized touch targets with both dimensions reported', () => {
    const report = checkContract(DEFAULT_CONTRACT, {
      touchTargetsPx: [{ width: 30, height: 30, label: 'close' }],
    })
    const violation = report.violations[0]
    expect(violation?.rule).toBe('layout/touch-target')
    expect(violation?.message).toContain('close')
    expect(violation?.message).toContain('30×30')
  })

  it('measures the smaller dimension, since a wide but short target still fails', () => {
    const report = checkContract(DEFAULT_CONTRACT, { touchTargetsPx: [{ width: 200, height: 20 }] })
    expect(report.violations).toHaveLength(1)
  })

  it('flags skipped heading levels', () => {
    const report = checkContract(DEFAULT_CONTRACT, { headingLevels: [1, 3] })
    const violation = report.violations.find((v) => v.rule === 'a11y/heading-skip')
    expect(violation?.actual).toBe('h1 → h3')
    expect(violation?.expected).toBe('h1 → h2')
  })

  it('permits heading levels going back up, which is normal between sections', () => {
    const report = checkContract(DEFAULT_CONTRACT, { headingLevels: [1, 2, 3, 2, 3] })
    expect(report.violations.some((v) => v.rule === 'a11y/heading-skip')).toBe(false)
  })

  it('flags interactive elements with no accessible name', () => {
    const report = checkContract(DEFAULT_CONTRACT, { interactiveWithoutName: ['button.icon-only'] })
    expect(report.violations[0]?.rule).toBe('a11y/missing-name')
  })
})

describe('scoring', () => {
  it('gives a clean surface full marks', () => {
    expect(checkContract(DEFAULT_CONTRACT, { spacingValues: [4, 8, 16] }).score).toBe(100)
  })

  it('degrades without saturating, so the number stays informative', () => {
    const few = checkContract(DEFAULT_CONTRACT, {
      spacingValues: [13, 16, 20, 24],
      animatedProperties: ['width', 'transform'],
      hasReducedMotionGuard: false,
      headingLevels: [1, 3],
      touchTargetsPx: [{ width: 30, height: 30 }],
    })

    const many = checkContract(DEFAULT_CONTRACT, {
      spacingValues: [13, 17, 21, 25, 29, 33, 37, 41],
      animatedProperties: ['width', 'height', 'top', 'left', 'margin'],
      hasReducedMotionGuard: false,
      headingLevels: [1, 4],
      touchTargetsPx: [
        { width: 20, height: 20 },
        { width: 22, height: 22 },
      ],
    })

    // Both are bad, but "bad" and "much worse" must be distinguishable — a score that
    // pins to zero cannot show a team whether they are improving.
    expect(few.score).toBeGreaterThan(0)
    expect(many.score).toBeGreaterThan(0)
    expect(many.score).toBeLessThan(few.score)
  })

  it('does not punish a large clean surface for having more opportunities to fail', () => {
    const small = checkContract(DEFAULT_CONTRACT, { spacingValues: [4, 13] })
    const large = checkContract(DEFAULT_CONTRACT, {
      spacingValues: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 13],
    })
    expect(large.score).toBeGreaterThan(small.score)
  })
})

describe('contract customisation', () => {
  it('honours severity overrides', () => {
    const relaxed = {
      ...DEFAULT_CONTRACT,
      severityOverrides: { 'spacing/off-grid': 'warning' as const },
    }
    const report = checkContract(relaxed, { spacingValues: [13] })
    expect(report.violations[0]?.severity).toBe('warning')
    expect(report.passed).toBe(true)
  })

  it('honours disabled rules', () => {
    const relaxed = {
      ...DEFAULT_CONTRACT,
      disabled: [{ rule: 'spacing/off-grid', reason: 'legacy grid in this area' }],
    }
    expect(checkContract(relaxed, { spacingValues: [13] }).violations).toHaveLength(0)
  })

  it('merges a partial override without losing untouched sections', () => {
    const extended = extendContract(DEFAULT_CONTRACT, {
      spacing: { baseUnit: 8 },
      colour: { minContrastBody: 7 },
    })
    expect(extended.spacing.baseUnit).toBe(8)
    // The scale survived even though only baseUnit was specified.
    expect(extended.spacing.scale).toEqual(DEFAULT_CONTRACT.spacing.scale)
    expect(extended.colour.minContrastBody).toBe(7)
    expect(extended.motion).toEqual(DEFAULT_CONTRACT.motion)
  })
})
