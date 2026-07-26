'use client'

import type { RefObject } from 'react'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

/**
 * Make everything except one element unreachable while a modal is open.
 *
 * A focus trap constrains Tab. It does nothing at all about the way most screen reader users
 * actually move: a virtual cursor that walks the accessibility tree node by node, or jumps by
 * heading, landmark or form control. That cursor is not focus and does not obey focus rules.
 * With only a focus trap in place, a user opens a dialog, swipes past its last element, and
 * carries on reading the page underneath — with no announcement that they have left the
 * dialog, no way to tell that what they are now reading is behind a scrim, and no way back
 * other than guessing. They can also activate controls back there.
 *
 * `aria-modal="true"` on the dialog is supposed to solve this and is not sufficient on its
 * own: support is uneven, and it does nothing for the many assistive technologies that read
 * the DOM rather than the platform accessibility API. The reliable mechanism is to mark the
 * dialog's siblings `inert`, which removes them from the accessibility tree, from hit
 * testing, and from the tab order in one attribute, enforced by the browser rather than by
 * our own JavaScript.
 *
 * ## Siblings, not "everything else"
 *
 * Only the ancestors' siblings are marked, walking up from the dialog to the body. Marking
 * arbitrary subtrees would either miss the containers that hold the background content or
 * mark an ancestor of the dialog itself, which would make the dialog inert too — the bug
 * where a modal opens and nothing inside it can be clicked.
 *
 * ## Restoring
 *
 * Elements that already carried `inert` for their own reasons must keep it. The cleanup
 * therefore restores the previous value rather than removing the attribute, which otherwise
 * un-inerts a disabled region of the application every time a dialog closes over it.
 */
export function useHideOutside(active: boolean, elementRef: RefObject<HTMLElement | null>): void {
  useIsomorphicLayoutEffect(() => {
    if (!active) return
    const element = elementRef.current
    if (!element) return

    const doc = element.ownerDocument
    const touched: Array<{ node: HTMLElement; inert: string | null; hidden: string | null }> = []

    let node: HTMLElement | null = element
    while (node && node !== doc.body) {
      const parent: HTMLElement | null = node.parentElement
      if (!parent) break

      for (const sibling of Array.from(parent.children)) {
        if (sibling === node) continue
        if (!(sibling instanceof HTMLElement)) continue
        // Live regions live on `document.body` and must stay announceable, or a dialog that
        // reports a validation error reports it into silence.
        if (sibling.getAttribute('aria-live')) continue

        touched.push({
          node: sibling,
          inert: sibling.getAttribute('inert'),
          hidden: sibling.getAttribute('aria-hidden'),
        })
        sibling.setAttribute('inert', '')
        sibling.setAttribute('aria-hidden', 'true')
      }

      node = parent
    }

    return () => {
      for (const { node: target, inert, hidden } of touched) {
        if (inert === null) target.removeAttribute('inert')
        else target.setAttribute('inert', inert)

        if (hidden === null) target.removeAttribute('aria-hidden')
        else target.setAttribute('aria-hidden', hidden)
      }
    }
  }, [active, elementRef])
}
