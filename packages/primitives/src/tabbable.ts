/**
 * Finding the things a user can actually Tab to.
 *
 * This is the load-bearing piece under every focus trap, menu and roving-tabindex list, and
 * it is where most implementations quietly go wrong. The usual version is a `querySelectorAll`
 * with a selector string and nothing else, which produces a list that includes:
 *
 * - controls inside a `display: none` subtree, so Tab appears to do nothing for a few presses
 *   before focus reappears somewhere unexpected;
 * - controls inside a collapsed `<details>` or a `hidden` panel, same symptom;
 * - every radio in a group, when only one of them is a tab stop;
 * - controls with `tabindex="-1"`, which are focusable but not tabbable — the distinction
 *   that makes a focus trap fall through to the browser chrome;
 * - controls inside an `inert` subtree, which the browser skips but the selector does not.
 *
 * Each of those turns into a focus trap with a hole in it, and a hole in a focus trap is not
 * a cosmetic defect: a screen reader user who tabs out of a modal into the page behind it has
 * no way of knowing they have left, and no reliable way back.
 *
 * These helpers are deliberately synchronous and DOM-only. They are called at the moment a
 * key is pressed rather than cached, because the contents of a dialog change while it is
 * open and a cached list is a list of stale nodes.
 */

/**
 * Elements that can be tab stops before any of the disqualifying checks are applied.
 *
 * `[tabindex]` without a value filter is intentional — the numeric check happens later,
 * because an element can carry `tabindex="-1"` and still need to be found by the focusable
 * (rather than tabbable) query.
 */
const CANDIDATE_SELECTOR = [
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

function isDisabled(element: HTMLElement): boolean {
  // `disabled` is only meaningful on form controls; `aria-disabled` is meaningful anywhere
  // but, crucially, does *not* remove the element from the tab order. That asymmetry is
  // intentional in ARIA: a disabled menu item should still be reachable so a screen reader
  // user can discover that the option exists and is unavailable. So `aria-disabled` is not
  // checked here — callers that want to skip such items filter for it themselves.
  if ('disabled' in element && element.disabled === true) return true
  return element.closest('fieldset[disabled]') !== null
}

/**
 * Whether the element is hidden from both rendering and assistive technology.
 *
 * Uses `getClientRects()` rather than `offsetParent`, which is the more common test and is
 * wrong for `position: fixed` elements — they have no offset parent even when perfectly
 * visible, so a fixed toolbar inside a trap would be skipped. It also checks computed
 * `visibility`, which `getClientRects()` does not reflect: a `visibility: hidden` element
 * still has boxes, and is still not focusable.
 */
export function isHidden(element: HTMLElement): boolean {
  if (element.hidden) return true
  if (element.getClientRects().length === 0) return true

  const view = element.ownerDocument.defaultView
  if (!view) return true
  if (view.getComputedStyle(element).visibility === 'hidden') return true

  // A collapsed `<details>` hides everything except its `<summary>`, but the hidden content
  // still has layout boxes in some engines, so the rect test above does not catch it.
  let node: HTMLElement | null = element.parentElement
  while (node) {
    if (node instanceof HTMLDetailsElement && !node.open) {
      const summary = node.querySelector(':scope > summary')
      if (!summary || !summary.contains(element)) return true
    }
    node = node.parentElement
  }

  return false
}

/** Whether the element is inside a subtree the browser has been told to ignore. */
export function isInert(element: HTMLElement): boolean {
  return element.closest('[inert]') !== null
}

/**
 * Whether the element can receive focus programmatically, ignoring tab order.
 *
 * This is the right question for "should I move focus here", and the wrong question for
 * "what does Tab do next".
 */
export function isFocusable(element: HTMLElement): boolean {
  if (!element.matches(CANDIDATE_SELECTOR)) return false
  if (isDisabled(element)) return false
  if (isInert(element)) return false
  if (element.getAttribute('contenteditable') === 'false') return false
  return !isHidden(element)
}

/**
 * Whether the element is a stop in the sequential tab order.
 *
 * Two rules on top of focusability. A negative `tabindex` is focusable but skipped by Tab —
 * that is the whole point of `tabindex="-1"`. And within a radio group, only one radio is a
 * tab stop: the checked one, or the first if none is checked. Treating every radio as a stop
 * makes Tab appear to get stuck cycling through options that the arrow keys are meant to
 * handle.
 */
export function isTabbable(element: HTMLElement): boolean {
  if (!isFocusable(element)) return false
  if (element.tabIndex < 0) return false

  if (element instanceof HTMLInputElement && element.type === 'radio') {
    if (element.checked) return true
    if (!element.name) return true

    const root = element.form ?? element.ownerDocument
    const group = root.querySelectorAll<HTMLInputElement>(
      `input[type="radio"][name="${CSS.escape(element.name)}"]`,
    )
    const checked = Array.from(group).some((radio) => radio.checked)
    if (checked) return false

    const firstVisible = Array.from(group).find((radio) => !isHidden(radio) && !isDisabled(radio))
    return firstVisible === element
  }

  return true
}

/**
 * Order a list of tab stops the way the browser will visit them.
 *
 * Positive `tabindex` values jump the queue: every element with `tabindex="1"` or higher is
 * visited, in ascending numeric order, before any element with `tabindex="0"` or an implicit
 * stop. This is almost always a mistake in the consuming application — it makes tab order
 * depend on numbers scattered across unrelated components, and it breaks the moment a
 * component is reused — but a focus trap that ignores it moves focus somewhere the browser
 * would not have, which is a worse bug than reproducing someone else's.
 *
 * Ties keep document order, which `Array.prototype.sort` guarantees since it is stable.
 */
function byTabOrder(a: HTMLElement, b: HTMLElement): number {
  const left = a.tabIndex > 0 ? a.tabIndex : Number.MAX_SAFE_INTEGER
  const right = b.tabIndex > 0 ? b.tabIndex : Number.MAX_SAFE_INTEGER
  return left - right
}

/**
 * Every tab stop inside `container`, in the order Tab will visit them.
 *
 * The container itself is included when it is a tab stop in its own right, because a dialog
 * with no focusable content still needs somewhere to put focus.
 */
export function getTabbable(container: HTMLElement): HTMLElement[] {
  const found = Array.from(container.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR))
  if (container.matches(CANDIDATE_SELECTOR)) found.unshift(container)
  return found.filter(isTabbable).sort(byTabOrder)
}

/** Every element inside `container` that can be focused programmatically, in document order. */
export function getFocusable(container: HTMLElement): HTMLElement[] {
  const found = Array.from(container.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR))
  if (container.matches(CANDIDATE_SELECTOR)) found.unshift(container)
  return found.filter(isFocusable)
}

/**
 * Move focus to an element, without scrolling the page to it.
 *
 * `preventScroll` matters when focus is being placed as a consequence of something the user
 * did somewhere else — opening a menu, entering a trap. Scrolling in that moment moves
 * content out from under the pointer and, on a page with sticky headers, can leave the newly
 * focused control underneath one. Where the user genuinely needs to see the target — focus
 * restoration after a dialog closes — the caller should scroll deliberately instead.
 *
 * Returns whether focus actually landed, which is not the same as whether `focus()` was
 * called: a node can be removed between the decision and the call.
 */
export function focusElement(element: HTMLElement | null | undefined): boolean {
  if (!element || !element.isConnected) return false
  element.focus({ preventScroll: true })
  return element.ownerDocument.activeElement === element
}
