'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { focusElement, getTabbable, isFocusable } from './tabbable.js'
import { useEventCallback } from './use-event-callback.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

/**
 * Where focus should go when the trap becomes active.
 *
 * `first` is the default and is right for most dialogs. `container` is right when the first
 * tab stop is destructive, or when the dialog is mostly prose and moving focus to a control
 * would skip past text the user needs to read — focus on the container means a screen reader
 * announces the dialog's accessible name and then reads from the top.
 *
 * Passing a ref or a getter is for the cases where neither is right: a form dialog whose
 * first field is the point of the dialog, or a confirmation whose safe option should be
 * preselected.
 */
export type InitialFocus =
  | 'first'
  | 'container'
  | RefObject<HTMLElement | null>
  | (() => HTMLElement | null)

export interface FocusTrapOptions {
  /** Whether the trap is currently enforcing anything. */
  active: boolean
  /** The element focus must stay inside. */
  containerRef: RefObject<HTMLElement | null>
  /** Where focus goes on activation. Defaults to `'first'`. */
  initialFocus?: InitialFocus
  /**
   * Called when focus escapes and is about to be pulled back.
   *
   * Escapes are usually a symptom rather than a cause — a portal rendered outside the
   * container, an iframe stealing focus — so this is mostly a diagnostic hook.
   */
  onEscapeAttempt?: (target: Element | null) => void
}

/**
 * Keep keyboard focus inside a container for as long as it is active.
 *
 * ## Key contract
 *
 * - **Tab** from the last tab stop wraps to the first.
 * - **Shift+Tab** from the first tab stop wraps to the last.
 * - **Tab** and **Shift+Tab** when there is nothing tabbable inside keep focus on the
 *   container, which is given `tabindex="-1"` so it can hold focus at all.
 *
 * ## What this hook does not do
 *
 * A focus trap constrains the *keyboard*. It does nothing about a screen reader's virtual
 * cursor, which walks the accessibility tree directly and will happily read the page behind
 * an open dialog — a user hears the dialog, swipes on, and is silently reading the page they
 * think they left. Fixing that needs the rest of the document marked `inert`, which is what
 * {@link useHideOutside} is for. A modal dialog needs both, and neither substitutes for the
 * other.
 *
 * ## Why the list is recomputed on every key press
 *
 * The obvious implementation collects tab stops when the trap activates and keeps them. That
 * list is wrong the moment anything in the dialog changes: a field appears, a button becomes
 * enabled, a step of a wizard replaces the content. Tabbing then lands on a detached node,
 * focus falls to `<body>`, and the trap silently stops working. Querying costs a fraction of
 * a millisecond and only happens on Tab, so there is nothing to optimise here.
 *
 * ## Why the listener is on the document, in the capture phase
 *
 * If it were on the container, an escape that has already happened could never be corrected:
 * a keydown while focus is outside would not reach the handler at all. Capturing at the
 * document means the trap sees Tab first and can decide, whatever holds focus. It also means
 * the trap runs before a consumer's own keydown handlers, which is the correct precedence —
 * wrapping is not negotiable.
 */
export function useFocusTrap({
  active,
  containerRef,
  initialFocus = 'first',
  onEscapeAttempt,
}: FocusTrapOptions): void {
  const notifyEscape = useEventCallback(onEscapeAttempt)
  const initialFocusRef = useRef(initialFocus)
  initialFocusRef.current = initialFocus

  // Place initial focus in a layout effect: if it waited for a passive effect, the browser
  // would paint one frame with focus still on the trigger behind the dialog, and a screen
  // reader would begin announcing that element before being interrupted.
  useIsomorphicLayoutEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    // The container has to be able to hold focus itself, both as the fallback when it has no
    // tabbable content and as the landing point when content is removed while open.
    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1')

    const target = initialFocusRef.current
    const explicit =
      typeof target === 'function'
        ? target()
        : target === 'first' || target === 'container'
          ? null
          : target.current

    if (explicit && isFocusable(explicit) && focusElement(explicit)) return
    if (target === 'container') {
      focusElement(container)
      return
    }

    const [first] = getTabbable(container)
    if (!focusElement(first)) focusElement(container)
  }, [active, containerRef])

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return
    const doc = container.ownerDocument

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return
      // Another handler has already claimed this press — a combobox that uses Tab to accept
      // a completion, say. Overriding it would break that interaction to enforce a rule that
      // is not being violated.
      if (event.defaultPrevented) return

      const stops = getTabbable(container)

      if (stops.length === 0) {
        event.preventDefault()
        focusElement(container)
        return
      }

      const first = stops[0]
      const last = stops[stops.length - 1]
      const activeElement = doc.activeElement as HTMLElement | null

      // Focus is somewhere outside, or on the container itself. Either way the browser's own
      // Tab has no anchor inside the trap, so we place it at the appropriate end.
      if (!activeElement || !container.contains(activeElement) || activeElement === container) {
        event.preventDefault()
        focusElement(event.shiftKey ? last : first)
        return
      }

      if (event.shiftKey && activeElement === first) {
        event.preventDefault()
        focusElement(last)
        return
      }

      if (!event.shiftKey && activeElement === last) {
        event.preventDefault()
        focusElement(first)
      }
    }

    // The safety net. Tab is handled above, but focus also moves for reasons no keydown
    // handler ever sees: a script calling `focus()`, an autofocusing element appearing, the
    // user clicking the page behind a non-modal container, returning from browser chrome.
    const handleFocusIn = (event: FocusEvent): void => {
      const target = event.target as Element | null
      if (target && container.contains(target)) return

      // Focus landing on the document body usually means the previously focused node was
      // just removed. Pulling it back into the container is right; announcing it as an
      // escape attempt is not.
      if (target && target !== doc.body) notifyEscape(target)

      const [first] = getTabbable(container)
      if (!focusElement(first)) focusElement(container)
    }

    doc.addEventListener('keydown', handleKeyDown, true)
    doc.addEventListener('focusin', handleFocusIn)

    return () => {
      doc.removeEventListener('keydown', handleKeyDown, true)
      doc.removeEventListener('focusin', handleFocusIn)
    }
  }, [active, containerRef, notifyEscape])
}
