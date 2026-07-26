/**
 * Focus order, and whether focus is visible when it arrives.
 *
 * Two assertions live here because they answer the two halves of the same question: can a
 * keyboard user get to everything in a sensible sequence, and can they tell where they
 * are once they do. A component that fails either is unusable by keyboard, and both
 * failures are invisible to a mouse-driven review — which is why they survive to
 * production so reliably.
 *
 * The focus-order half is worth stating precisely, because the rule surprises people. The
 * sequential navigation order is *not* document order. Elements with a positive `tabindex`
 * are visited first, in ascending numeric order, before every element with `tabindex="0"`
 * or native focusability. So a single `tabindex="1"` anywhere on a page moves that element
 * to the front of the entire document's tab sequence, ahead of the skip link and the
 * navigation. That is almost never what the author meant, and it is exactly the defect
 * {@link getFocusOrder} makes visible.
 */

import { contrastRatio } from '@vishwakarma/core'
import { resolveBackdrop } from './contrast.js'
import { parseCssColour } from './css-colour.js'
import {
  ancestorChain,
  computedStyle,
  type DomRectLike,
  describeElement,
  EnvironmentError,
  type FocusableTestElement,
  isDisplayed,
  parsePx,
  styleValue,
  type TestElement,
  toArray,
} from './dom.js'

/**
 * Every element type that can receive sequential focus without help.
 *
 * `[tabindex]` is included unqualified and filtered afterwards, because the interesting
 * cases — negative values, and values the author did not realise were positive — have to
 * be seen before they can be reported.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]',
  '[tabindex]',
].join(',')

/** One stop in the keyboard tab sequence. */
export interface FocusStop {
  element: TestElement
  /** The resolved tabindex. Native focusables without the attribute resolve to 0. */
  tabIndex: number
  /** Position in DOM order among the collected candidates. */
  domIndex: number
  /** Layout box, used for the visual-order comparison. */
  rect: DomRectLike
  /** `button#save.primary (“Save”)`, for failure messages. */
  description: string
}

export interface FocusOrderOptions {
  /**
   * Rows closer together than this are treated as the same visual row.
   *
   * Necessary because baseline alignment, differing font sizes and border widths mean that
   * two controls a user perceives as side by side almost never share an exact `top`. A
   * strict sort on `top` would report a mismatch for every toolbar ever built.
   */
  rowTolerancePx?: number
  /** Reading direction. Defaults to the container's computed `direction`. */
  direction?: 'ltr' | 'rtl'
}

function resolveTabIndex(element: TestElement): number | null {
  const attribute = element.getAttribute('tabindex')
  if (attribute !== null) {
    const parsed = Number.parseInt(attribute, 10)
    return Number.isFinite(parsed) ? parsed : null
  }

  const tag = element.tagName.toLowerCase()
  if (tag === 'a' || tag === 'area') return element.hasAttribute('href') ? 0 : null
  if (tag === 'input') return element.getAttribute('type')?.toLowerCase() === 'hidden' ? null : 0
  if (['button', 'select', 'textarea', 'summary', 'iframe', 'object', 'embed'].includes(tag)) {
    return 0
  }
  if (element.hasAttribute('contenteditable')) {
    return element.getAttribute('contenteditable') === 'false' ? null : 0
  }
  if ((tag === 'audio' || tag === 'video') && element.hasAttribute('controls')) return 0
  return null
}

/**
 * Whether a candidate is actually reachable by pressing Tab.
 *
 * `disabled` is checked via the attribute rather than a property, because the property
 * only exists on the handful of elements that support it and reading it off the others
 * yields `undefined` — which is falsy, and therefore silently correct until someone puts
 * `disabled` on a `<div>` and wonders why the test still lists it.
 */
function isTabbable(element: TestElement, tabIndex: number): boolean {
  if (tabIndex < 0) return false
  if (element.getAttribute('disabled') !== null) return false
  if (element.getAttribute('aria-disabled') === 'true') return false
  if (!isDisplayed(element)) return false
  for (const ancestor of ancestorChain(element)) {
    if (ancestor.tagName.toLowerCase() === 'fieldset' && ancestor.hasAttribute('disabled')) {
      return false
    }
  }
  return true
}

/**
 * The order in which Tab will visit the focusable elements inside a container.
 *
 * Includes elements with a negative `tabindex` only when `includeProgrammatic` is set;
 * they are reachable by script but not by keyboard, and mixing them into the sequence
 * would misrepresent the user's experience.
 */
export function getFocusOrder(
  container: TestElement,
  options: { includeProgrammatic?: boolean } = {},
): FocusStop[] {
  const candidates = toArray(container.querySelectorAll(FOCUSABLE_SELECTOR))
  const stops: FocusStop[] = []

  candidates.forEach((element, index) => {
    const tabIndex = resolveTabIndex(element)
    if (tabIndex === null) return
    if (!options.includeProgrammatic && !isTabbable(element, tabIndex)) return

    stops.push({
      element,
      tabIndex,
      domIndex: index,
      rect: element.getBoundingClientRect(),
      description: describeElement(element),
    })
  })

  // Positive tabindex jumps the queue. See the module note.
  return stops.sort((a, b) => {
    const aPositive = a.tabIndex > 0
    const bPositive = b.tabIndex > 0
    if (aPositive !== bPositive) return aPositive ? -1 : 1
    if (aPositive && bPositive && a.tabIndex !== b.tabIndex) return a.tabIndex - b.tabIndex
    return a.domIndex - b.domIndex
  })
}

/** Sort focus stops into the order a sighted user would read them. */
export function getVisualOrder(stops: FocusStop[], options: FocusOrderOptions = {}): FocusStop[] {
  const tolerance = options.rowTolerancePx ?? 8
  const rtl = options.direction === 'rtl'

  return [...stops].sort((a, b) => {
    const verticalGap = a.rect.top - b.rect.top
    if (Math.abs(verticalGap) > tolerance) return verticalGap
    const horizontalGap = a.rect.left - b.rect.left
    return rtl ? -horizontalGap : horizontalGap
  })
}

export interface FocusOrderMismatch {
  /** 1-based position in the tab sequence where the two orders first disagree. */
  position: number
  /** What Tab actually reaches at this position. */
  actual: FocusStop
  /** What a sighted user would expect to reach next. */
  expected: FocusStop
  /** Why they differ, phrased so the reader knows what to change. */
  reason: string
}

export interface FocusOrderComparison {
  matches: boolean
  focusOrder: FocusStop[]
  visualOrder: FocusStop[]
  mismatches: FocusOrderMismatch[]
  /** Every positive `tabindex` found, which is a defect independently of the comparison. */
  positiveTabIndexes: FocusStop[]
}

/**
 * Compare the tab sequence with the visual reading order.
 *
 * Throws {@link EnvironmentError} rather than reporting a mismatch when every element
 * measures 0×0. jsdom has no layout engine, so every rect it returns is the origin, and a
 * comparison against that would either pass vacuously — all elements "at the same
 * position", so any order is consistent — or fail every suite depending on the tie-break.
 * Both outcomes are worse than saying plainly that the environment cannot answer.
 */
export function compareFocusOrder(
  container: TestElement,
  options: FocusOrderOptions = {},
): FocusOrderComparison {
  const focusOrder = getFocusOrder(container)

  const positiveTabIndexes = focusOrder.filter((stop) => stop.tabIndex > 0)

  if (
    focusOrder.length > 1 &&
    focusOrder.every((stop) => stop.rect.width === 0 && stop.rect.height === 0)
  ) {
    throw new EnvironmentError(
      'Every focusable element reports a 0×0 layout box, so visual order cannot be determined.',
      'This is what jsdom returns for getBoundingClientRect, because it implements the DOM but not layout. Run focus-order assertions in a browser-backed runner (Playwright, WebdriverIO, or Vitest browser mode). getFocusOrder itself still works under jsdom — it is only the comparison with visual order that needs geometry.',
    )
  }

  const direction =
    options.direction ?? (styleValue(container, 'direction') === 'rtl' ? 'rtl' : 'ltr')
  const visualOrder = getVisualOrder(focusOrder, { ...options, direction })

  const mismatches: FocusOrderMismatch[] = []
  for (let i = 0; i < focusOrder.length; i++) {
    const actual = focusOrder[i]
    const expected = visualOrder[i]
    if (!actual || !expected || actual.element === expected.element) continue

    const reason =
      actual.tabIndex > 0
        ? `${actual.description} has tabindex="${actual.tabIndex}", which pulls it to the front of the tab sequence regardless of where it sits on screen.`
        : `Tab reaches ${actual.description} here, but ${expected.description} is the next element in reading order. The DOM order and the visual order have been separated, usually by CSS order, flex-direction: row-reverse, grid placement, or absolute positioning.`

    mismatches.push({ position: i + 1, actual, expected, reason })
  }

  return {
    matches: mismatches.length === 0 && positiveTabIndexes.length === 0,
    focusOrder,
    visualOrder,
    mismatches,
    positiveTabIndexes,
  }
}

/** Render a comparison as a message a reader can act on without opening devtools. */
export function formatFocusOrder(comparison: FocusOrderComparison): string {
  const lines: string[] = []

  lines.push('  Tab order            Visual (reading) order')
  const rows = Math.max(comparison.focusOrder.length, comparison.visualOrder.length)
  for (let i = 0; i < rows; i++) {
    const tab = comparison.focusOrder[i]?.description ?? '—'
    const visual = comparison.visualOrder[i]?.description ?? '—'
    const marker = tab === visual ? '  ' : '✗ '
    lines.push(`  ${marker}${String(i + 1).padStart(2)}. ${tab.padEnd(34)} ${visual}`)
  }

  if (comparison.positiveTabIndexes.length > 0) {
    lines.push('')
    for (const stop of comparison.positiveTabIndexes) {
      lines.push(
        `  Positive tabindex: ${stop.description} has tabindex="${stop.tabIndex}". Replace it with tabindex="0" and move the element in the DOM instead.`,
      )
    }
  }

  for (const mismatch of comparison.mismatches) {
    lines.push('')
    lines.push(`  At position ${mismatch.position}: ${mismatch.reason}`)
  }

  return lines.join('\n')
}

/**
 * Assert that the tab sequence matches the reading order, throwing when it does not.
 *
 * Provided as a plain function as well as a matcher so the check is usable from a script,
 * a Playwright test, or a CI audit that has no `expect` in scope.
 */
export function assertFocusOrderMatchesVisualOrder(
  container: TestElement,
  options: FocusOrderOptions = {},
): void {
  const comparison = compareFocusOrder(container, options)
  if (comparison.matches) return
  throw new Error(
    `Focus order does not match visual order in ${describeElement(container)}.\n\n${formatFocusOrder(comparison)}`,
  )
}

/* -------------------------------------------------------------------------- */
/* Focus indicator                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The properties an indicator can plausibly be built from.
 *
 * `outline` first because it is the only one that does not affect layout and follows the
 * element's shape for free. The rest are included because real designs use them, not
 * because they are good ideas: a border-width indicator shifts every sibling by two pixels
 * the moment focus lands, and a background-only indicator is invisible in forced-colours
 * mode.
 */
const INDICATOR_PROPERTIES = [
  'outline-style',
  'outline-width',
  'outline-color',
  'outline-offset',
  'box-shadow',
  'border-color',
  'border-width',
  'background-color',
  'color',
  'text-decoration-line',
  'text-decoration-thickness',
] as const

export interface IndicatorChange {
  property: string
  before: string
  after: string
}

export interface FocusIndicatorReport {
  /** Whether any indicator-bearing property changed when the element took focus. */
  changed: boolean
  changes: IndicatorChange[]
  /** Outline thickness while focused, in px. WCAG 2.2 asks for at least 2. */
  outlineWidthPx: number | null
  /** True when the focused state explicitly suppresses the outline. */
  outlineSuppressed: boolean
  /** Contrast of the indicator colour against the backdrop, when both resolve. */
  contrast: number | null
  /** Whether the indicator is present, thick enough, and contrasty enough. */
  passes: boolean
  /** What was found, what was required, and what to do — assembled for the matcher. */
  diagnosis: string
}

function asFocusable(element: TestElement): FocusableTestElement | null {
  const candidate = element as Partial<FocusableTestElement>
  return typeof candidate.focus === 'function' ? (element as FocusableTestElement) : null
}

function snapshot(element: TestElement): Record<string, string> {
  const style = computedStyle(element)
  const result: Record<string, string> = {}
  for (const property of INDICATOR_PROPERTIES) {
    result[property] = style.getPropertyValue(property).trim()
  }
  return result
}

/** The first colour mentioned in a `box-shadow`, which is where the indicator colour lives. */
function shadowColour(value: string): string | null {
  const match = /(#[0-9a-f]{3,8}|(?:rgba?|hsla?|oklch|color)\([^)]*\))/i.exec(value)
  return match?.[1] ?? null
}

export interface FocusIndicatorOptions {
  /** Minimum indicator thickness in px. Defaults to 2, per WCAG 2.2 Focus Appearance. */
  minThicknessPx?: number
  /** Minimum contrast of the indicator against adjacent colours. Defaults to 3. */
  minContrast?: number
}

/**
 * Focus the element, record what changed, and judge whether it is enough.
 *
 * Focus is restored afterwards. Leaving focus where the assertion put it changes the state
 * the next assertion in the same test observes, and the resulting failure appears in a
 * completely unrelated expectation — one of the more expensive kinds of flaky test to
 * track down.
 */
export function inspectFocusIndicator(
  element: TestElement,
  options: FocusIndicatorOptions = {},
): FocusIndicatorReport {
  const minThickness = options.minThicknessPx ?? 2
  const minContrast = options.minContrast ?? 3

  const focusable = asFocusable(element)
  if (!focusable) {
    throw new EnvironmentError(
      `${describeElement(element)} has no focus() method, so its focused appearance cannot be inspected.`,
      'Pass the element that actually receives focus. A styled wrapper around a control is not focusable; the control inside it is.',
    )
  }

  const previous = element.ownerDocument?.activeElement ?? null
  const before = snapshot(element)

  focusable.focus({ preventScroll: true })
  const after = snapshot(element)

  // Restore, so this assertion cannot influence the next one.
  const restore = previous ? asFocusable(previous) : null
  if (restore) restore.focus({ preventScroll: true })
  else if (typeof focusable.blur === 'function') focusable.blur()

  const changes: IndicatorChange[] = []
  for (const property of INDICATOR_PROPERTIES) {
    const from = before[property] ?? ''
    const to = after[property] ?? ''
    if (from !== to) changes.push({ property, before: from, after: to })
  }

  const outlineStyle = after['outline-style'] ?? ''
  const outlineWidthPx = parsePx(after['outline-width'] ?? '')
  const outlineActive = outlineStyle !== '' && outlineStyle !== 'none' && (outlineWidthPx ?? 0) > 0
  const outlineSuppressed = outlineStyle === 'none' || outlineWidthPx === 0

  const boxShadowChanged = changes.some((change) => change.property === 'box-shadow')
  const indicatorColourValue = outlineActive
    ? (after['outline-color'] ?? '')
    : boxShadowChanged
      ? (shadowColour(after['box-shadow'] ?? '') ?? '')
      : (changes.find((change) => change.property === 'border-color')?.after ?? '')

  let contrast: number | null = null
  const indicatorColour = parseCssColour(indicatorColourValue)
  if (indicatorColour) {
    const backdrop = resolveBackdrop(element)
    if (!backdrop.indeterminate) contrast = contrastRatio(indicatorColour, backdrop.colour)
  }

  const thickness = outlineActive
    ? outlineWidthPx
    : boxShadowChanged
      ? // A shadow-based ring's thickness is its spread, which is the last length in the
        // value. Parsing it exactly needs a full box-shadow parser; the width check is
        // therefore skipped for shadows rather than guessed at.
        null
      : null

  const problems: string[] = []
  if (changes.length === 0) {
    problems.push(
      'Nothing changed when the element took focus: no outline, no ring, no border or background change. ' +
        'A keyboard user has no way to tell where they are.',
    )
  } else if (outlineSuppressed && !boxShadowChanged) {
    problems.push(
      `The focused state sets outline-style: ${outlineStyle || 'none'}, and nothing replaces it.`,
    )
  }

  if (thickness !== null && thickness < minThickness) {
    problems.push(`The outline is ${thickness}px thick; ${minThickness}px is the minimum.`)
  }

  if (contrast !== null && contrast < minContrast) {
    problems.push(
      `The indicator colour reaches only ${contrast.toFixed(2)}:1 against its backdrop; ${minContrast}:1 is the minimum.`,
    )
  }

  const passes = problems.length === 0

  const diagnosis = passes
    ? `Focus indicator present: ${changes.map((change) => change.property).join(', ')} change on focus.`
    : [
        ...problems,
        '',
        'Fix: give the focused state an outline rather than removing one —',
        '',
        '  :focus-visible {',
        `    outline: ${minThickness}px solid var(--vk-focus-ring);`,
        '    outline-offset: 2px;',
        '  }',
        '',
        'outline-offset keeps the ring clear of the component’s own border, and outline (unlike border or box-shadow) is honoured in forced-colours mode and costs no layout.',
        changes.length === 0
          ? '\nIf the component does style :focus-visible and this still reports no change, the environment is the problem: jsdom does not evaluate :focus-visible when resolving computed styles. Run this assertion in a browser-backed runner.'
          : '',
      ]
        .filter(Boolean)
        .join('\n')

  return {
    changed: changes.length > 0,
    changes,
    outlineWidthPx,
    outlineSuppressed,
    contrast,
    passes,
    diagnosis,
  }
}
