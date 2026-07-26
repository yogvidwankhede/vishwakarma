// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The matchers.
 *
 * The whole value of a custom matcher is its failure message. `expect(button).toBeVisible()`
 * failing with "expected false to be true" has told the reader that something is wrong and
 * nothing else; they now have to open the component, guess at the cause, and re-run. A
 * matcher that costs a debugging session every time it fires is a net negative, however
 * elegant the assertion reads.
 *
 * So every message in this file answers three questions in the same order:
 *
 *   Found:    what is actually there, with the numbers
 *   Required: what the rule is, and where the rule comes from
 *   Fix:      a specific change, written so it can be applied without further thought
 *
 * Where the fix depends on a value — a colour that would pass, an amount of padding to
 * add — it is computed rather than described. "Increase the contrast" is advice; "set
 * color to #6b6b6b for 4.52:1" is a patch.
 *
 * The negated messages get the same treatment. `.not.toMeetContrast()` failing with a
 * message about insufficient contrast is actively misleading, so each matcher branches on
 * `this.isNot` and says the opposite thing properly.
 */

import type { DesignContract, Observation } from '@vishwakarma/core'
import { checkContract } from '@vishwakarma/core'
import { computeAccessibleName } from './accessible-name.js'
import { type ContrastOptions, measureContrast, suggestForeground } from './contrast.js'
import { formatColour } from './css-colour.js'
import { describeElement, type TestElement } from './dom.js'
import {
  compareFocusOrder,
  type FocusIndicatorOptions,
  type FocusOrderOptions,
  formatFocusOrder,
  inspectFocusIndicator,
} from './focus.js'
import type { MatcherContext, MatcherResult } from './matcher-types.js'
import { formatContractReport, type ObserveOptions, observeElement } from './observe.js'
import { checkTokenScale, checkTokenScaleDeep, type TokenScale } from './tokens.js'
import {
  describeTouchTargetFailure,
  measureTouchTarget,
  type TouchTargetOptions,
} from './touch-target.js'

/**
 * Coerce the received value to an element, or explain what was passed instead.
 *
 * The commonest mistake by a wide margin is passing a Testing Library query result that
 * returned null, or passing the query function itself rather than calling it. Both produce
 * a `TypeError` deep inside a style lookup unless they are caught here, and the stack
 * points at this package rather than at the test.
 */
function asElement(received: unknown, matcher: string): TestElement {
  const candidate = received as Partial<TestElement> | null | undefined

  if (
    candidate &&
    typeof candidate.getBoundingClientRect === 'function' &&
    typeof candidate.getAttribute === 'function'
  ) {
    return received as TestElement
  }

  const description =
    received === null
      ? 'null — a Testing Library query returned nothing; use getBy* rather than queryBy* when the element is required'
      : received === undefined
        ? 'undefined'
        : typeof received === 'function'
          ? 'a function — call the query rather than passing it'
          : `a ${typeof received}`

  throw new TypeError(`${matcher} expects a DOM element, but received ${description}.`)
}

/** Standard message frame: a headline, then an indented body. */
function frame(headline: string, body: string): string {
  return `${headline}\n\n${body}\n`
}

/* -------------------------------------------------------------------------- */

function toMeetContrast(
  this: MatcherContext,
  received: unknown,
  ratio?: number | ContrastOptions,
): MatcherResult {
  const element = asElement(received, 'toMeetContrast')
  const options: ContrastOptions = typeof ratio === 'number' ? { required: ratio } : (ratio ?? {})
  const measurement = measureContrast(element, options)

  if (measurement.indeterminate) {
    // Never a silent pass. An unresolvable backdrop is the one case where a contrast
    // assertion has genuinely learned nothing, and reporting it as a pass would leave a
    // green test guarding nothing at all.
    return {
      pass: false,
      message: () =>
        frame(
          'toMeetContrast: the backdrop could not be determined, so contrast cannot be measured.',
          [
            `  Element:  ${describeElement(element)}`,
            `  Reason:   ${measurement.reason ?? 'unknown'}`,
            '',
            `  Fix:      pass the backdrop explicitly —`,
            `            expect(element).toMeetContrast({ background: '#ffffff' })`,
          ].join('\n'),
        ),
    }
  }

  const pass = measurement.ratio >= measurement.requiredRatio

  const layerLines = measurement.layers
    .slice(0, 6)
    .map(
      (layer) =>
        `    ${describeElement(layer.element).padEnd(28)} background-color: ${layer.declared || '(none)'}${
          layer.effectiveAlpha >= 1 && layer.colour ? '   ← opaque, walk stops here' : ''
        }`,
    )

  const sizeNote =
    measurement.fontSizePx === null
      ? ''
      : ` (${measurement.kind === 'large' ? 'large text' : 'normal text'}: ${measurement.fontSizePx}px, weight ${measurement.fontWeight})`

  const suggestion = suggestForeground(measurement)

  const message = (): string => {
    if (this.isNot) {
      return frame(
        'toMeetContrast: expected the contrast to be below the requirement, but it passes.',
        [
          `  Element:  ${describeElement(element)}`,
          `  Found:    ${measurement.ratio.toFixed(2)}:1`,
          `  Required: below ${measurement.requiredRatio}:1${sizeNote}`,
        ].join('\n'),
      )
    }

    return frame(
      'toMeetContrast: text does not meet the required contrast.',
      [
        `  Element:  ${describeElement(element)}`,
        `  Found:    ${measurement.ratio.toFixed(2)}:1 — ${formatColour(measurement.foreground)} on ${formatColour(measurement.background)}`,
        `  Required: ${measurement.requiredRatio}:1${sizeNote}`,
        `  Short by: ${(measurement.requiredRatio - measurement.ratio).toFixed(2)}`,
        ...(layerLines.length > 0
          ? ['', '  Backdrop resolved by walking ancestors:', ...layerLines]
          : []),
        '',
        suggestion
          ? `  Fix:      set color: ${suggestion}. That is the same hue and chroma at the lightness which reaches ${measurement.requiredRatio}:1, so it stays inside the palette.`
          : `  Fix:      no lightness of this hue reaches ${measurement.requiredRatio}:1 against ${formatColour(measurement.background)}. Change the background instead, or pick a different family for this text.`,
        measurement.kind === 'body' &&
        measurement.fontSizePx !== null &&
        measurement.fontSizePx >= 18
          ? `            Alternatively, at ${measurement.fontSizePx}px the text qualifies as large at weight 700, which lowers the requirement to 3:1 — but only if the weight is genuinely part of the design.`
          : '',
      ]
        .filter((line) => line !== '')
        .join('\n'),
    )
  }

  return { pass, message, actual: measurement.ratio, expected: measurement.requiredRatio }
}

/* -------------------------------------------------------------------------- */

function toHaveAccessibleName(
  this: MatcherContext,
  received: unknown,
  expected?: string | RegExp,
): MatcherResult {
  const element = asElement(received, 'toHaveAccessibleName')
  const result = computeAccessibleName(element)

  const matches =
    expected === undefined
      ? result.name !== ''
      : typeof expected === 'string'
        ? result.name === expected
        : expected.test(result.name)

  const message = (): string => {
    if (this.isNot) {
      return frame(
        'toHaveAccessibleName: expected no accessible name, but one was computed.',
        [
          `  Element:  ${describeElement(element)}`,
          `  Found:    “${result.name}” (from ${result.source})`,
        ].join('\n'),
      )
    }

    if (expected !== undefined && result.name !== '') {
      return frame(
        'toHaveAccessibleName: the accessible name is not the expected one.',
        [
          `  Element:  ${describeElement(element)}`,
          `  Found:    “${result.name}” (from ${result.source})`,
          `  Required: ${typeof expected === 'string' ? `“${expected}”` : String(expected)}`,
          '',
          '  Note:     the accessible name is what a screen reader announces, which is not always',
          '            the visible text. aria-label overrides content entirely, and aria-labelledby',
          '            overrides both.',
        ].join('\n'),
      )
    }

    return frame(
      'toHaveAccessibleName: the element has no accessible name.',
      [
        `  Element:  ${describeElement(element)}`,
        '  Found:    nothing. Every naming source was checked:',
        ...result.tried.map((entry) => `              ${entry.source.padEnd(18)} ${entry.reason}`),
        '',
        '  Required: a non-empty accessible name. Without one the element is announced as its',
        '            role alone — “button”, “link” — which tells the user it exists and nothing',
        '            about what it does.',
        '',
        result.placeholderOnly
          ? [
              '  Fix:      this field has a placeholder and no label. A placeholder is not an accessible',
              '            name: it vanishes as soon as the field has a value, so a user returning to a',
              '            half-completed form cannot discover what the field was for. Add a real label —',
              '',
              '              <label for="…">Email address</label>',
              '',
              '            and keep the placeholder only if it shows a format example.',
            ].join('\n')
          : [
              '  Fix:      add visible text inside the element, or if it is icon-only, add an aria-label',
              '            describing the action rather than the icon —',
              '',
              '              <button aria-label="Delete draft"><TrashIcon aria-hidden="true" /></button>',
              '',
              '            “Delete draft”, not “Trash icon”: the name should say what happens.',
            ].join('\n'),
      ].join('\n'),
    )
  }

  return { pass: matches, message, actual: result.name, expected }
}

/* -------------------------------------------------------------------------- */

function toHaveMinimumTouchTarget(
  this: MatcherContext,
  received: unknown,
  px?: number,
  options: TouchTargetOptions = {},
): MatcherResult {
  const element = asElement(received, 'toHaveMinimumTouchTarget')
  const measurement = measureTouchTarget(element, {
    ...options,
    ...(px === undefined ? {} : { minimumPx: px }),
  })

  const message = (): string => {
    if (this.isNot) {
      return frame(
        'toHaveMinimumTouchTarget: expected the target to be too small, but it is not.',
        [
          `  Element:  ${describeElement(element)}`,
          `  Found:    ${measurement.width}×${measurement.height}px`,
          `  Required: below ${measurement.requiredPx}×${measurement.requiredPx}px`,
        ].join('\n'),
      )
    }

    return frame(
      'toHaveMinimumTouchTarget: the hit area is smaller than the minimum.',
      [
        describeTouchTargetFailure(element, measurement),
        '',
        '  Check you are measuring the right element: a 16px icon inside a padded button is a',
        '  full-size target. Assert on the button, not on the icon.',
      ].join('\n'),
    )
  }

  return {
    pass: measurement.passes,
    message,
    actual: `${measurement.width}×${measurement.height}`,
    expected: `${measurement.requiredPx}×${measurement.requiredPx}`,
  }
}

/* -------------------------------------------------------------------------- */

function toHaveVisibleFocusIndicator(
  this: MatcherContext,
  received: unknown,
  options: FocusIndicatorOptions = {},
): MatcherResult {
  const element = asElement(received, 'toHaveVisibleFocusIndicator')
  const report = inspectFocusIndicator(element, options)

  const message = (): string => {
    if (this.isNot) {
      return frame(
        'toHaveVisibleFocusIndicator: expected no visible focus indicator, but one was found.',
        [
          `  Element:  ${describeElement(element)}`,
          `  Found:    ${report.changes.map((change) => `${change.property}: ${change.before} → ${change.after}`).join('; ')}`,
          '',
          '  Note:     asserting the *absence* of a focus indicator is almost never what you want.',
          '            If you are testing that a mouse click does not draw a ring, assert on',
          '            :focus-visible behaviour instead of on the presence of any indicator.',
        ].join('\n'),
      )
    }

    return frame(
      'toHaveVisibleFocusIndicator: focus is not visible on this element.',
      [
        `  Element:  ${describeElement(element)}`,
        report.changes.length === 0
          ? '  Found:    no computed style changed between the unfocused and focused states.'
          : `  Found:    ${report.changes.map((change) => `${change.property}: ${change.before} → ${change.after}`).join('; ')}`,
        `  Required: a visible change on focus, at least ${options.minThicknessPx ?? 2}px thick and`,
        `            at least ${options.minContrast ?? 3}:1 against its backdrop.`,
        '',
        ...report.diagnosis.split('\n').map((line) => (line ? `  ${line}` : '')),
      ].join('\n'),
    )
  }

  return { pass: report.passes, message }
}

/* -------------------------------------------------------------------------- */

function isObservation(value: unknown): value is Observation {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<TestElement>
  return typeof candidate.getBoundingClientRect !== 'function'
}

function toSatisfyContract(
  this: MatcherContext,
  received: unknown,
  contract: DesignContract,
  options: ObserveOptions = {},
): MatcherResult {
  // Accepting both an element and a prepared Observation matters more than it looks: a
  // build-time audit has numbers but no DOM, and forcing it to fabricate one to reuse the
  // same assertion is how two divergent contract checkers come into existence.
  const observation = isObservation(received)
    ? received
    : observeElement(asElement(received, 'toSatisfyContract'), options)

  const report = checkContract(contract, observation)

  const message = (): string => {
    if (this.isNot) {
      return frame(
        'toSatisfyContract: expected the contract to be violated, but it passed.',
        [
          `  Contract: ${contract.name} (${contract.id})`,
          `  Score:    ${report.score}/100 from ${report.summary.checked} checks`,
        ].join('\n'),
      )
    }

    return frame(
      `toSatisfyContract: ${report.summary.errors} contract error(s).`,
      [
        formatContractReport(contract, report),
        '',
        '  Only errors fail this matcher. Warnings and suggestions are reported so they can be',
        '  addressed deliberately rather than silently accumulating; if one of them is wrong for',
        '  your context, disable that rule in the contract with a stated reason rather than',
        '  loosening the whole check.',
      ].join('\n'),
    )
  }

  return { pass: report.passed, message, actual: report.summary, expected: { errors: 0 } }
}

/* -------------------------------------------------------------------------- */

function toUseOnlyTokenValues(
  this: MatcherContext,
  received: unknown,
  scale: TokenScale | TokenScale[],
  options: { deep?: boolean } = {},
): MatcherResult {
  const element = asElement(received, 'toUseOnlyTokenValues')
  const scales = Array.isArray(scale) ? scale : [scale]
  const deep = options.deep !== false

  const violations = scales.flatMap((entry) =>
    deep ? checkTokenScaleDeep(element, entry) : checkTokenScale(element, entry),
  )

  const message = (): string => {
    if (this.isNot) {
      return frame(
        'toUseOnlyTokenValues: expected at least one off-scale value, but every value is on the scale.',
        [
          `  Element:  ${describeElement(element)}`,
          `  Scales:   ${scales.map((entry) => entry.name).join(', ')}`,
        ].join('\n'),
      )
    }

    return frame(
      `toUseOnlyTokenValues: ${violations.length} value(s) are not on the ${scales.map((entry) => entry.name).join('/')} scale.`,
      [
        violations
          .slice(0, 12)
          .map((violation) => violation.message)
          .join('\n\n'),
        violations.length > 12 ? `\n  …and ${violations.length - 12} more.` : '',
        '',
        '  These are *computed* values, so a violation can arrive through a shorthand, an inline',
        '  style, a cascade from a parent, or a var() that resolves off-scale. Searching the',
        '  component source for the literal will not always find it; inspect the element instead.',
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }

  return { pass: violations.length === 0, message, actual: violations.length, expected: 0 }
}

/* -------------------------------------------------------------------------- */

function toHaveFocusOrderMatchingVisualOrder(
  this: MatcherContext,
  received: unknown,
  options: FocusOrderOptions = {},
): MatcherResult {
  const container = asElement(received, 'toHaveFocusOrderMatchingVisualOrder')
  const comparison = compareFocusOrder(container, options)

  const message = (): string => {
    if (this.isNot) {
      return frame(
        'toHaveFocusOrderMatchingVisualOrder: expected the orders to differ, but they match.',
        `  Container: ${describeElement(container)}`,
      )
    }

    return frame(
      'toHaveFocusOrderMatchingVisualOrder: Tab does not follow the reading order.',
      [
        `  Container: ${describeElement(container)}`,
        '',
        formatFocusOrder(comparison),
        '',
        '  Required:  the sequential focus order must match the order the content is presented in.',
        '             A keyboard user builds a mental model from the visual layout; when Tab jumps',
        '             against it they lose their place, and on a form they can submit fields they',
        '             never saw.',
        '',
        '  Fix:       reorder the DOM so it already reads correctly, then use CSS for the visual',
        '             arrangement. Do not reach for tabindex to patch the order — positive values',
        '             move the element ahead of the entire document, not just its siblings.',
      ].join('\n'),
    )
  }

  return { pass: comparison.matches, message }
}

/* -------------------------------------------------------------------------- */

/**
 * Every matcher, ready for `expect.extend`.
 *
 * ```ts
 * import { expect } from 'vitest'
 * import { vishwakarmaMatchers } from '@vishwakarma/testing'
 *
 * expect.extend(vishwakarmaMatchers)
 * ```
 *
 * Matchers that cannot answer in the current environment throw an `EnvironmentError`
 * rather than failing. That is deliberate: a failure accuses the component, and an
 * environment that has no layout engine is not the component's fault. The error names the
 * runner change that would make the assertion meaningful.
 */
export const vishwakarmaMatchers = {
  toMeetContrast,
  toHaveAccessibleName,
  toHaveMinimumTouchTarget,
  toHaveVisibleFocusIndicator,
  toSatisfyContract,
  toUseOnlyTokenValues,
  toHaveFocusOrderMatchingVisualOrder,
}

export {
  toHaveAccessibleName,
  toHaveFocusOrderMatchingVisualOrder,
  toHaveMinimumTouchTarget,
  toHaveVisibleFocusIndicator,
  toMeetContrast,
  toSatisfyContract,
  toUseOnlyTokenValues,
}
