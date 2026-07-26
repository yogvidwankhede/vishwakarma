'use client'

import { useEffect, useRef } from 'react'
import { useEventCallback } from './use-event-callback.js'

/**
 * Escape dismisses the topmost layer, and only the topmost layer.
 *
 * When a select sits inside a dialog and the user presses Escape, exactly one thing should
 * happen: the select closes. The dialog stays. Press Escape again and the dialog closes.
 * Anything else — both closing at once, or the dialog closing while the select stays open on
 * top of nothing — is a bug the user experiences as the interface losing more than they
 * asked it to.
 *
 * DOM propagation cannot express this on its own. Each layer listens at the document,
 * because focus may be anywhere by the time Escape is pressed, and document-level listeners
 * all fire regardless of who is on top. `stopPropagation` does not help: listeners on the
 * same node in the same phase all run, propagation has not begun. So the layers are tracked
 * explicitly, and only the last one registered gets the key.
 *
 * The stack is module-scoped, which is the one design decision here worth stating plainly:
 * it means two copies of this package on a page have two independent stacks, and layers from
 * one will not defer to layers from the other. Deduplicating the package is the fix; there
 * is no way to make the behaviour correct across duplicate copies without a global registry,
 * which brings worse problems.
 */
const stack: Array<{ id: symbol }> = []

export interface EscapeKeyOptions {
  /** Whether this layer is listening. */
  enabled?: boolean
  /**
   * Take the key even when a layer above is open. Off by default.
   *
   * Only correct for something that is visually on top but not conceptually a layer — an
   * inline error toast, say.
   */
  ignoreLayering?: boolean
}

/**
 * Run a callback when Escape is pressed and this is the topmost active layer.
 *
 * ## Key contract
 *
 * - **Escape** invokes the handler, if this layer is on top of the stack.
 * - **Escape** during IME composition is ignored entirely.
 *
 * The IME case is not an edge case in the languages where it applies. Composing Japanese,
 * Chinese or Korean text means an active preedit buffer, and Escape is how you abandon it.
 * If a dialog closes on that press, the user loses the form they were filling in every time
 * they mistype a word. The browser reports the state as `event.isComposing`; older engines
 * only signal it as `keyCode === 229`, so both are checked.
 *
 * The listener is on the document in the bubble phase, not capture, so a component that
 * genuinely handles Escape itself — a combobox clearing its input — can call
 * `preventDefault` and be respected.
 */
export function useEscapeKey(
  onEscape: (event: KeyboardEvent) => void,
  options: EscapeKeyOptions = {},
): void {
  const { enabled = true, ignoreLayering = false } = options
  const handler = useEventCallback(onEscape)
  const layer = useRef<{ id: symbol }>({ id: Symbol('vk-escape-layer') })

  useEffect(() => {
    if (!enabled) return
    if (typeof document === 'undefined') return

    const entry = layer.current
    stack.push(entry)

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (event.defaultPrevented) return
      if (event.isComposing || event.keyCode === 229) return
      if (!ignoreLayering && stack[stack.length - 1] !== entry) return

      handler(event)
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const index = stack.indexOf(entry)
      if (index !== -1) stack.splice(index, 1)
    }
  }, [enabled, ignoreLayering, handler])
}
