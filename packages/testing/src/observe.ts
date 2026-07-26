// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Turning a rendered tree into a Design Contract observation.
 *
 * `checkContract` in core takes numbers, not elements, and deliberately so — the same
 * checker has to run over a stylesheet in CI, over an agent's proposed diff, and over a
 * live DOM in a test. This module is the DOM adapter: it walks a rendered subtree and
 * produces the `Observation` the checker expects.
 *
 * Two limits are built in on purpose.
 *
 * The first is breadth. Walking every descendant of a page-level render and reading
 * computed styles from each is measured in seconds, not milliseconds, because every
 * `getComputedStyle` call forces the engine to resolve style for that element. Assertions
 * that take seconds get deleted. The cap is a parameter, and it defaults low enough that
 * a component test stays fast.
 *
 * The second is which elements count as text. A proper implementation would inspect child
 * *nodes* and measure only elements with direct text children, but node-level access is
 * the part of the DOM that lightweight implementations vary on most. The approximation
 * used here is a selector of elements that carry text in practice. It under-reports —
 * a `<div>` with bare text in it is skipped — and under-reporting is the right direction:
 * a missed check costs a review, a fabricated one costs trust in the whole report.
 */

import type { DesignContract, Observation } from '@vishwakarma/core'
import { computeAccessibleName } from './accessible-name.js'
import { measureContrast } from './contrast.js'
import {
  computedStyle,
  describeElement,
  parseFontWeight,
  parsePx,
  parseTimeMs,
  type TestElement,
  toArray,
} from './dom.js'
import { DURATION_PROPERTIES, RADIUS_PROPERTIES, SPACING_PROPERTIES } from './tokens.js'
import { measureTouchTarget } from './touch-target.js'

const TEXT_BEARING =
  'p,h1,h2,h3,h4,h5,h6,span,a,button,label,li,td,th,dt,dd,figcaption,legend,small,strong,em,code,summary,option'

const INTERACTIVE =
  'a[href],button,input:not([type="hidden"]),select,textarea,summary,[role="button"],[role="link"],[role="checkbox"],[role="switch"],[role="tab"],[role="menuitem"]'

export interface ObserveOptions {
  /** Cap on elements visited. Defaults to 250. */
  maxElements?: number
  /** Root font size for converting computed px font sizes back to rem. Defaults to 16. */
  rootFontSizePx?: number
  /**
   * Include hit-target measurements.
   *
   * Off by default, because it needs a layout engine and there is not one under jsdom.
   * Turning it on in an environment without layout raises an EnvironmentError rather than
   * reporting every control as 0×0.
   */
  measureTargets?: boolean
  /** Include contrast measurements. On by default; the most valuable and the most costly. */
  measureContrastPairs?: boolean
}

/**
 * Walk a rendered subtree and describe it in the terms a contract is written in.
 *
 * The result is passed straight to `checkContract`. Fields the walk could not populate are
 * left absent rather than empty, because `checkContract` treats an absent field as "not
 * observed" and an empty array as "observed, and there were none" — which score
 * differently and should.
 */
export function observeElement(root: TestElement, options: ObserveOptions = {}): Observation {
  const limit = options.maxElements ?? 250
  const rootFontSizePx = options.rootFontSizePx ?? 16
  const elements = [root, ...toArray(root.querySelectorAll('*'))].slice(0, limit)

  const spacingValues: number[] = []
  const fontSizesRem: number[] = []
  const fontWeights: number[] = []
  const durationsMs: number[] = []
  const radiiPx: number[] = []
  const animatedProperties: string[] = []
  const headingLevels: number[] = []
  const interactiveWithoutName: string[] = []
  const contrastPairs: NonNullable<Observation['contrastPairs']> = []
  const touchTargetsPx: NonNullable<Observation['touchTargetsPx']> = []

  for (const element of elements) {
    const style = computedStyle(element)
    const tag = element.tagName.toLowerCase()

    for (const property of SPACING_PROPERTIES) {
      const px = parsePx(style.getPropertyValue(property))
      // Zero is not a spacing decision, it is the absence of one, and including it would
      // bury the real values under hundreds of identical entries.
      if (px !== null && px !== 0) spacingValues.push(px)
    }

    for (const property of RADIUS_PROPERTIES) {
      const px = parsePx(style.getPropertyValue(property).split(/\s+/)[0] ?? '')
      if (px !== null && px !== 0) radiiPx.push(px)
    }

    for (const property of DURATION_PROPERTIES) {
      for (const entry of style.getPropertyValue(property).split(',')) {
        const ms = parseTimeMs(entry.trim())
        if (ms !== null && ms !== 0) durationsMs.push(ms)
      }
    }

    const transitioned = style.getPropertyValue('transition-property').trim()
    if (transitioned && transitioned !== 'none' && transitioned !== 'all') {
      for (const property of transitioned.split(',')) {
        const name = property.trim()
        if (name && !animatedProperties.includes(name)) animatedProperties.push(name)
      }
    }

    const headingMatch = /^h([1-6])$/.exec(tag)
    if (headingMatch?.[1]) headingLevels.push(Number.parseInt(headingMatch[1], 10))

    if (element.matches(TEXT_BEARING)) {
      const sizePx = parsePx(style.getPropertyValue('font-size'))
      if (sizePx !== null) fontSizesRem.push(round(sizePx / rootFontSizePx))

      fontWeights.push(parseFontWeight(style.getPropertyValue('font-weight')))

      if (options.measureContrastPairs !== false && (element.textContent ?? '').trim() !== '') {
        const measurement = measureContrast(element)
        // Indeterminate measurements are dropped rather than reported. A fabricated pair
        // would be scored by checkContract as though it were real.
        if (!measurement.indeterminate) {
          contrastPairs.push({
            ratio: measurement.ratio,
            kind: measurement.kind,
            label: describeElement(element),
          })
        }
      }
    }

    if (element.matches(INTERACTIVE)) {
      const named = computeAccessibleName(element)
      if (named.name === '') interactiveWithoutName.push(describeElement(element))

      if (options.measureTargets) {
        const measured = measureTouchTarget(element)
        touchTargetsPx.push({
          width: round(measured.width),
          height: round(measured.height),
          label: describeElement(element),
        })
      }
    }
  }

  const observation: Observation = {
    spacingValues,
    fontSizesRem,
    fontWeights,
    radiiPx,
    headingLevels,
    interactiveWithoutName,
  }

  if (durationsMs.length > 0) observation.durationsMs = durationsMs
  if (animatedProperties.length > 0) observation.animatedProperties = animatedProperties
  if (options.measureContrastPairs !== false) observation.contrastPairs = contrastPairs
  if (options.measureTargets) observation.touchTargetsPx = touchTargetsPx

  return observation
}

const round = (value: number): number => Math.round(value * 10000) / 10000

/**
 * Format a contract report as something a developer can act on.
 *
 * Ordered by severity, because a report that leads with eleven radius suggestions and
 * buries a contrast error in the middle will have the contrast error skipped.
 */
export function formatContractReport(
  contract: DesignContract,
  report: {
    violations: Array<{
      rule: string
      severity: string
      message: string
      actual?: string | number
      expected?: string | number
      fix?: string
    }>
    score: number
    summary: { errors: number; warnings: number; suggestions: number; checked: number }
  },
): string {
  const order: Record<string, number> = { error: 0, warning: 1, suggestion: 2 }
  const sorted = [...report.violations].sort(
    (a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3),
  )

  const lines = [
    `  Contract: ${contract.name} (${contract.id}, v${contract.version})`,
    `  Score:    ${report.score}/100 from ${report.summary.checked} checks`,
    `  Found:    ${report.summary.errors} error(s), ${report.summary.warnings} warning(s), ${report.summary.suggestions} suggestion(s)`,
    '',
  ]

  for (const violation of sorted) {
    lines.push(`  [${violation.severity}] ${violation.rule}`)
    lines.push(`      ${violation.message}`)
    if (violation.actual !== undefined || violation.expected !== undefined) {
      lines.push(`      found ${String(violation.actual)}, expected ${String(violation.expected)}`)
    }
    if (violation.fix) lines.push(`      fix: ${violation.fix}`)
  }

  return lines.join('\n')
}
