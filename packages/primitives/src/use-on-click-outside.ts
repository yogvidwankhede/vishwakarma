'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'
import { useEventCallback } from './use-event-callback.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface ClickOutsideOptions {
  /** Whether to listen at all. */
  enabled?: boolean
  /**
   * Additional elements that count as "inside".
   *
   * The trigger almost always belongs here. Without it, pressing the trigger of an open
   * popover dismisses it from this handler and then toggles it back open from the trigger's
   * own click handler — or, worse, the other way round, so the popover flickers and stays
   * open. The two handlers are fighting over the same press.
   */
  ignoreRefs?: ReadonlyArray<RefObject<HTMLElement | null>>
}

/**
 * Call back when a pointer press lands outside a set of elements.
 *
 * ## Why `pointerdown`, not `click`
 *
 * This is the single most consequential choice in the hook, and getting it wrong produces
 * three separate bugs.
 *
 * **The self-dismissing popover.** `click` fires on release, and it fires after the whole
 * press-release sequence. Open a popover from a trigger's `onClick`, and the effect that
 * attaches this listener runs before the browser has finished dispatching that same click to
 * the document. The listener sees the click that opened the popover, decides it was outside,
 * and closes it. The popover appears not to open at all. Every workaround for this — a
 * `setTimeout(0)`, a "skip the first event" flag, checking `event.detail` — is a patch for
 * having chosen the wrong event.
 *
 * **The drag that ends outside.** A user selects text starting inside the popover and
 * releases outside it. The `click` event's target is then the nearest common ancestor,
 * usually `<body>`, so the popover closes and takes the selection with it. `pointerdown`
 * asks the only question that matters — where did the interaction *begin* — and a press that
 * began inside is never an outside press.
 *
 * **The moved target.** Between `mousedown` and `click`, the element under the pointer can be
 * removed or replaced by a re-render. The click then targets whatever moved into that
 * position, or gets suppressed entirely, and dismissal becomes intermittent in a way that
 * depends on render timing.
 *
 * Pointer events also unify mouse, touch and pen. The alternative is `mousedown` plus
 * `touchstart`, which fire in a defined order on touch devices only if you remember to
 * deduplicate them, and which have different coordinate semantics.
 *
 * The cost of pointerdown is that dismissal happens on press rather than release, so a user
 * who presses outside and drags back in still gets a dismissal. That is the correct
 * trade-off: it matches how native menus behave on every platform.
 *
 * ## Why `composedPath`
 *
 * `contains()` cannot see across a shadow boundary. A press inside a web component nested in
 * the popover reports the shadow host as its target, and if the host is outside the popover
 * the press is misread as outside. `composedPath()` returns the full path including shadow
 * ancestors, so containment can be tested by identity against the whole chain.
 */
export function useOnClickOutside(
  refs: ReadonlyArray<RefObject<HTMLElement | null>>,
  onOutside: (event: PointerEvent) => void,
  options: ClickOutsideOptions = {},
): void {
  const { enabled = true, ignoreRefs } = options
  const handler = useEventCallback(onOutside)

  // Both ref arrays are read inside the listener rather than captured in the dependency
  // list. An inline `[triggerRef]` literal is a new array on every render, and rebinding a
  // pointerdown listener mid-interaction is exactly how dismissal becomes flaky. The mirror
  // is written in a layout effect, which runs before the passive effect below attaches the
  // listener, so it is never read before it is current.
  const refsRef = useRef(refs)
  const ignoreRef = useRef(ignoreRefs)

  useIsomorphicLayoutEffect(() => {
    refsRef.current = refs
    ignoreRef.current = ignoreRefs
  })

  useEffect(() => {
    if (!enabled) return
    if (typeof document === 'undefined') return

    const handlePointerDown = (event: PointerEvent): void => {
      const path = event.composedPath()

      const inside = [...refsRef.current, ...(ignoreRef.current ?? [])].some((ref) => {
        const element = ref.current
        if (!element) return false
        return path.includes(element)
      })

      if (inside) return

      // A press with a non-primary button is usually a context menu. Dismissing on it is
      // defensible, but dismissing *and* leaving the browser's context menu open over a
      // component that no longer exists is not, so those presses are left alone.
      if (event.button !== 0 && event.pointerType === 'mouse') return

      handler(event)
    }

    // Capture phase, so a consumer calling `stopPropagation` on a press inside unrelated
    // content cannot accidentally make a genuinely outside press invisible to us.
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [enabled, handler])
}
