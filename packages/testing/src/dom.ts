/**
 * The DOM surface this package needs, described structurally rather than imported.
 *
 * This package compiles with `lib: ["ES2023"]` and no `DOM` library, which is deliberate.
 * It runs in Node, under whatever DOM implementation the consumer's test runner supplies —
 * jsdom, happy-dom, linkedom, or a real browser over CDP — and those implementations do
 * not share a nominal type. Importing `lib.dom` would also quietly hand every consumer's
 * Node code a global `document` that does not exist at runtime, which is the single most
 * effective way to turn a test-time mistake into a production one.
 *
 * So the types below describe only the members actually used, using method shorthand so
 * that parameter positions are checked bivariantly. A real `HTMLElement` satisfies
 * {@link TestElement} structurally; so does a hand-built stub in a unit test, which makes
 * the pure logic in this package testable without a DOM at all.
 *
 * The members are kept deliberately few. Every member added here is one more thing a
 * lightweight DOM implementation has to provide before this package will typecheck against
 * it, and `closest`, `computedStyleMap` and friends are precisely the ones the smaller
 * implementations skip. Where a member is missing it is reconstructed from `parentElement`
 * and `matches` instead.
 */

/** The geometry subset of `DOMRect` that matters for target sizing and focus order. */
export interface DomRectLike {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}

/**
 * The read side of `CSSStyleDeclaration`.
 *
 * Only `getPropertyValue` is required. Named accessors such as `.backgroundColor` are
 * present on every implementation, but their casing and coverage vary; going through
 * `getPropertyValue('background-color')` is the one path that is specified and that also
 * works for custom properties, which the token matchers depend on.
 */
export interface ComputedStyleLike {
  getPropertyValue(property: string): string
}

/** A window-like object, as far as style resolution is concerned. */
export interface StyleWindowLike {
  getComputedStyle(element: TestElement, pseudoElement?: string | null): ComputedStyleLike
}

/** A document-like object. `getElementById` is required by `aria-labelledby` resolution. */
export interface TestDocument {
  readonly defaultView: StyleWindowLike | null
  getElementById(id: string): TestElement | null
  querySelectorAll(selectors: string): ArrayLike<TestElement>
  /** Optional so that minimal DOM stubs remain usable; required for focus restoration. */
  readonly activeElement?: TestElement | null
}

/** An element-like object. See the module note for why this is structural. */
export interface TestElement {
  readonly tagName: string
  readonly id: string
  readonly parentElement: TestElement | null
  readonly ownerDocument: TestDocument | null
  readonly textContent: string | null
  getAttribute(name: string): string | null
  hasAttribute(name: string): boolean
  getBoundingClientRect(): DomRectLike
  matches(selectors: string): boolean
  querySelectorAll(selectors: string): ArrayLike<TestElement>
}

/** An element that can take focus programmatically. */
export interface FocusableTestElement extends TestElement {
  focus(options?: { preventScroll?: boolean }): void
  blur(): void
}

/**
 * Thrown when the environment cannot answer the question being asked.
 *
 * Distinct from a matcher failure on purpose. jsdom reports every
 * `getBoundingClientRect()` as 0×0 because it has no layout engine, and a touch-target
 * matcher that treated that as "0×0, too small" would fail every test in a jsdom suite
 * with a message accusing the component of a defect it does not have. The correct answer
 * is not "fail"; it is "this environment cannot measure layout — run this assertion in a
 * browser-backed runner", which is what this error says.
 */
export class EnvironmentError extends Error {
  override readonly name = 'EnvironmentError'
  /** What the caller should do about it. */
  readonly remedy: string

  constructor(message: string, remedy: string) {
    super(`${message}\n\n${remedy}`)
    this.remedy = remedy
  }
}

/** Convert an `ArrayLike` result from `querySelectorAll` into a real array. */
export function toArray(nodes: ArrayLike<TestElement>): TestElement[] {
  const out: TestElement[] = []
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    // `noUncheckedIndexedAccess` is right to insist: a NodeList's index signature can be
    // sparse in some implementations when the list is live and mutating underneath us.
    if (node) out.push(node)
  }
  return out
}

/**
 * Resolve the window that owns an element, for style lookups.
 *
 * Not `globalThis.window`. Tests routinely build a second document — an iframe, a portal
 * container, a detached fixture — and resolving styles through the global window returns
 * the wrong cascade, or throws, depending on the implementation. The element knows which
 * document it belongs to; ask it.
 */
export function viewFor(element: TestElement): StyleWindowLike {
  const view = element.ownerDocument?.defaultView
  if (!view) {
    throw new EnvironmentError(
      'The element is not attached to a document with a window, so its computed styles cannot be resolved.',
      'Render the element into the document under test (for example with Testing Library’s render) before asserting on it. A detached element created with document.createElement has no cascade and no layout.',
    )
  }
  return view
}

/** Computed styles for an element, resolved through its own document's window. */
export function computedStyle(element: TestElement): ComputedStyleLike {
  return viewFor(element).getComputedStyle(element)
}

/** A single computed property, trimmed. Returns an empty string when unset. */
export function styleValue(element: TestElement, property: string): string {
  return computedStyle(element).getPropertyValue(property).trim()
}

/**
 * The element and each of its ancestors, nearest first.
 *
 * Used by background resolution and by inherited-property lookups. Guarded against cycles
 * because a stubbed element with a self-referential `parentElement` is a very easy mistake
 * to make in a hand-written fixture, and the resulting hang is indistinguishable from a
 * slow test.
 */
export function ancestorChain(element: TestElement): TestElement[] {
  const chain: TestElement[] = []
  const seen = new Set<TestElement>()
  let node: TestElement | null = element

  while (node && !seen.has(node)) {
    seen.add(node)
    chain.push(node)
    node = node.parentElement
  }
  return chain
}

/** Parse a CSS length that is already computed, and therefore already in px. */
export function parsePx(value: string): number | null {
  const match = /^(-?\d*\.?\d+)px$/.exec(value.trim())
  if (!match?.[1]) return null
  const parsed = Number.parseFloat(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Parse a computed time value into milliseconds.
 *
 * Computed `transition-duration` serialises as seconds (`0.2s`), not milliseconds, which
 * is a reliable source of off-by-1000 errors in duration assertions written against
 * computed styles.
 */
export function parseTimeMs(value: string): number | null {
  const match = /^(-?\d*\.?\d+)(ms|s)$/.exec(value.trim())
  if (!match?.[1] || !match[2]) return null
  const parsed = Number.parseFloat(match[1])
  if (!Number.isFinite(parsed)) return null
  return match[2] === 's' ? parsed * 1000 : parsed
}

/**
 * Numeric font weight from a computed value.
 *
 * Computed styles usually serialise weight to a number, but not always: jsdom returns the
 * UA stylesheet's `bold` verbatim for headings, and a plain `parseInt` on that yields NaN.
 * The consequence is quiet — the weight simply never appears in the observation, so a
 * contract rule about permitted weights silently checks nothing.
 */
export function parseFontWeight(value: string): number {
  const text = value.trim().toLowerCase()
  if (text === 'bold' || text === 'bolder') return 700
  if (text === 'normal' || text === 'lighter' || text === '') return 400
  const parsed = Number.parseInt(text, 10)
  return Number.isFinite(parsed) ? parsed : 400
}

/**
 * A short, human-recognisable description of an element for failure messages.
 *
 * Failure messages that say "expected element" cost the reader a debugging session. This
 * produces `button#save.btn.btn-primary`, which they can paste into the devtools console.
 */
export function describeElement(element: TestElement): string {
  const tag = element.tagName.toLowerCase()
  const id = element.id ? `#${element.id}` : ''

  const classAttribute = element.getAttribute('class') ?? ''
  const classes = classAttribute
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((name) => `.${name}`)
    .join('')

  const testId = element.getAttribute('data-testid')
  const suffix = testId ? `[data-testid="${testId}"]` : ''

  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim()
  const label = text.length > 0 && text.length <= 32 ? ` (“${text}”)` : ''

  return `${tag}${id}${classes}${suffix}${label}`
}

/** Whether an element is hidden from layout and therefore from the focus order. */
export function isDisplayed(element: TestElement): boolean {
  for (const node of ancestorChain(element)) {
    const style = computedStyle(node)
    if (style.getPropertyValue('display').trim() === 'none') return false
    if (style.getPropertyValue('visibility').trim() === 'hidden') return false
    if (node.getAttribute('hidden') !== null) return false
    if (node.getAttribute('aria-hidden') === 'true') return false
    // `inert` removes a subtree from focus and from the accessibility tree at once, which
    // is exactly the pair of consequences the checks in this package care about.
    if (node.hasAttribute('inert')) return false
  }
  return true
}
