'use client'

import type { RefObject } from 'react'
import { useRef } from 'react'
import { isFocusable } from './tabbable.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface FocusRestoreOptions {
  /**
   * Where focus goes when the element that had it is no longer available.
   *
   * Worth setting whenever the trigger can disappear as a result of the interaction — a
   * "delete" item in a row menu, a dialog that navigates away. Without a fallback, focus
   * falls to `<body>`, and from `<body>` the next Tab starts at the top of the document.
   * A keyboard user who deleted the fortieth row is returned to the skip link.
   */
  fallbackRef?: RefObject<HTMLElement | null>
  /**
   * Scroll the restored element into view. On by default.
   *
   * The opposite of the rule for taking focus: restoration is the moment the user is being
   * handed control back, and handing it to something off-screen means the focus ring is
   * invisible. Turn it off only when the caller is doing its own scrolling.
   */
  scrollIntoView?: boolean
}

/**
 * Give focus back to wherever it came from.
 *
 * Pass the same `active` flag that drives the overlay. While it is true the hook remembers
 * the element that had focus at the moment of activation; when it goes false — or the
 * component unmounts, which is the common case for a dialog — focus goes back there.
 *
 * ## Why this is separate from the trap
 *
 * They have opposite lifetimes. The trap does its work while the overlay is open; the
 * restore does its work as it closes, and specifically *after* the overlay has stopped being
 * focusable. Fusing them into one hook means the restore runs in the same cleanup that tears
 * down the trap, in an order that depends on effect declaration order, and the symptom is a
 * dialog that occasionally leaves focus on `<body>` for reasons nobody can reproduce.
 *
 * ## Why the capture happens in a layout effect
 *
 * By the time a passive effect runs, focus may already have moved into the newly rendered
 * overlay — an `autofocus` attribute, or a trap that ran first — and the hook would then
 * "restore" focus to an element inside the thing it is closing. Reading
 * `document.activeElement` before the browser paints the new content is the only reliably
 * correct moment.
 *
 * ## Why restoration is also a layout effect
 *
 * A passive cleanup runs after paint, so there is a frame in which the dialog is gone and
 * nothing has focus. Screen readers notice that frame and announce the document title.
 */
export function useFocusRestore(active: boolean, options: FocusRestoreOptions = {}): void {
  const { fallbackRef, scrollIntoView = true } = options

  const previous = useRef<HTMLElement | null>(null)
  const optionsRef = useRef({ fallbackRef, scrollIntoView })
  optionsRef.current = { fallbackRef, scrollIntoView }

  useIsomorphicLayoutEffect(() => {
    if (!active) return
    if (typeof document === 'undefined') return

    const source = document.activeElement
    previous.current = source instanceof HTMLElement && source !== document.body ? source : null

    return () => {
      const { fallbackRef: fallback, scrollIntoView: scroll } = optionsRef.current
      const target = previous.current
      previous.current = null

      // `isConnected` is the whole test. An element detached from the document still exists,
      // still answers to `focus()`, and still does nothing — so the naive version appears to
      // work in every case except the one that matters.
      const candidate =
        target?.isConnected && isFocusable(target) ? target : (fallback?.current ?? null)

      if (!candidate?.isConnected) return

      candidate.focus({ preventScroll: !scroll })
    }
  }, [active])
}
