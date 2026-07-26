/**
 * Hit-target sizing.
 *
 * The rule people remember is "44 by 44". The rule that is actually normative in WCAG 2.2
 * at level AA is 24 by 24, *with* an exception: a smaller target passes if a 24px circle
 * centred on it does not overlap the circle of any neighbouring target. That exception is
 * why a row of tightly packed 20px icon buttons fails while a single 20px close button
 * with generous space around it does not, and a checker that ignores it produces failures
 * teams learn to ignore.
 *
 * Both figures are supported. The default here is the contract's `minTouchTarget`, which
 * defaults to 44 — the size at which a target is comfortable rather than merely
 * conformant. Conformance is the floor, not the goal.
 *
 * The important subtlety is that the *hit* area and the *visual* area are different
 * things. A 16px icon inside a button with 14px of padding is a 44px target and looks
 * like a 16px icon. Measuring the icon reports a failure that does not exist; measuring
 * the button reports the truth. This module measures the element it is given and says so
 * in the message, so a misdirected assertion is obvious rather than mysterious.
 */

import {
  computedStyle,
  type DomRectLike,
  describeElement,
  EnvironmentError,
  parsePx,
  type TestElement,
  toArray,
} from './dom.js'

export interface TouchTargetOptions {
  /** Required size in px on both axes. Defaults to 44. */
  minimumPx?: number
  /**
   * Apply the WCAG 2.2 spacing exception, which lets an undersized target pass when it is
   * far enough from its neighbours. Off by default: it is a conformance escape hatch, not
   * a design goal, and turning it on by default would let a whole toolbar of 20px buttons
   * through on a technicality.
   */
  allowSpacingException?: boolean
  /**
   * Where to look for neighbouring targets when applying the spacing exception. Defaults
   * to the element's parent.
   */
  neighbourRoot?: TestElement
}

export interface TouchTargetMeasurement {
  width: number
  height: number
  /** Whether the numbers came from layout or from fallback parsing of computed styles. */
  source: 'layout' | 'computed-style'
  requiredPx: number
  /** Distance to the nearest other interactive element, when it could be computed. */
  nearestNeighbourPx: number | null
  passes: boolean
  /** True when the target is undersized but passes because it is well isolated. */
  viaSpacingException: boolean
}

const INTERACTIVE_SELECTOR =
  'a[href],button,input,select,textarea,summary,[role="button"],[role="link"],[role="checkbox"],[role="tab"],[role="menuitem"],[tabindex]:not([tabindex="-1"])'

/** Shortest edge-to-edge distance between two boxes; 0 when they touch or overlap. */
function gapBetween(a: DomRectLike, b: DomRectLike): number {
  const horizontal = Math.max(0, Math.max(a.left - b.right, b.left - a.right))
  const vertical = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom))
  return Math.hypot(horizontal, vertical)
}

/**
 * Measure an interactive element's hit area.
 *
 * Throws {@link EnvironmentError} when neither layout nor computed styles can supply a
 * size. That is the honest outcome under jsdom, which returns 0×0 from every
 * `getBoundingClientRect` because it implements no layout. Reporting "0×0, below the 44px
 * minimum" would technically be a failure message and would in practice be a lie about
 * the component.
 */
export function measureTouchTarget(
  element: TestElement,
  options: TouchTargetOptions = {},
): TouchTargetMeasurement {
  const requiredPx = options.minimumPx ?? 44
  const rect = element.getBoundingClientRect()

  let width = rect.width
  let height = rect.height
  let source: TouchTargetMeasurement['source'] = 'layout'

  if (width === 0 && height === 0) {
    // Fall back to declared dimensions. This rescues the common jsdom fixture where a
    // component sets an explicit size, and only that case: `auto` yields null and the
    // error below fires, which is correct.
    const style = computedStyle(element)
    const declaredWidth = parsePx(style.getPropertyValue('width'))
    const declaredHeight = parsePx(style.getPropertyValue('height'))

    if (declaredWidth === null || declaredHeight === null) {
      throw new EnvironmentError(
        `${describeElement(element)} reports a 0×0 box and has no explicit width/height to fall back on, so its hit area cannot be measured.`,
        'jsdom returns 0×0 for every element because it has no layout engine. Run target-size assertions in a browser-backed runner (Playwright, WebdriverIO, or Vitest browser mode), or assert on the contract instead with toSatisfyContract, supplying measured sizes yourself.',
      )
    }

    width = declaredWidth
    height = declaredHeight
    source = 'computed-style'
  }

  const meetsSize = width >= requiredPx && height >= requiredPx

  let nearestNeighbourPx: number | null = null
  if (!meetsSize && options.allowSpacingException) {
    const root = options.neighbourRoot ?? element.parentElement
    if (root) {
      for (const other of toArray(root.querySelectorAll(INTERACTIVE_SELECTOR))) {
        if (other === element) continue
        const gap = gapBetween(rect, other.getBoundingClientRect())
        nearestNeighbourPx = nearestNeighbourPx === null ? gap : Math.min(nearestNeighbourPx, gap)
      }
    }
  }

  // The exception is expressed as non-overlapping 24px circles, which for two targets of
  // this size reduces to: the gap plus each target's own half-extent must reach 24.
  const isolationBudget = 24
  const smallestSide = Math.min(width, height)
  const viaSpacingException =
    !meetsSize &&
    options.allowSpacingException === true &&
    smallestSide >= isolationBudget / 2 &&
    (nearestNeighbourPx === null || nearestNeighbourPx + smallestSide >= isolationBudget)

  return {
    width,
    height,
    source,
    requiredPx,
    nearestNeighbourPx,
    passes: meetsSize || viaSpacingException,
    viaSpacingException,
  }
}

/** The failure message for an undersized target: found, required, and the exact fix. */
export function describeTouchTargetFailure(
  element: TestElement,
  measurement: TouchTargetMeasurement,
): string {
  const shortfallWidth = Math.max(0, measurement.requiredPx - measurement.width)
  const shortfallHeight = Math.max(0, measurement.requiredPx - measurement.height)
  const pad = Math.ceil(Math.max(shortfallWidth, shortfallHeight) / 2)

  return [
    `  Element:  ${describeElement(element)}`,
    `  Found:    ${round(measurement.width)}×${round(measurement.height)}px${measurement.source === 'computed-style' ? ' (from declared width/height; no layout engine available)' : ''}`,
    `  Required: ${measurement.requiredPx}×${measurement.requiredPx}px`,
    `  Short by: ${round(shortfallWidth)}px wide, ${round(shortfallHeight)}px tall`,
    '',
    '  Fix, in order of preference:',
    `    1. Add padding so the control grows: padding-inline: ${pad}px; padding-block: ${pad}px.`,
    '    2. If the visual size must stay small, extend the hit area without moving anything:',
    '',
    '         position: relative;',
    '         &::after {',
    '           content: "";',
    '           position: absolute;',
    '           inset: 50%;',
    `           inline-size: ${measurement.requiredPx}px;`,
    `           block-size: ${measurement.requiredPx}px;`,
    '           translate: -50% -50%;',
    '         }',
    '',
    '       The pseudo-element enlarges the pointer target while the icon stays its drawn size.',
    '    3. Only if neither is possible, space it away from its neighbours and re-run with',
    '       { allowSpacingException: true }.',
  ].join('\n')
}

const round = (value: number): number => Math.round(value * 100) / 100
