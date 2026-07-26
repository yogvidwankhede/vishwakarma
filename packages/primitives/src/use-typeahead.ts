'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'

export interface TypeaheadOptions {
  /**
   * Milliseconds of silence before the buffer resets.
   *
   * 500ms is the interval Windows has used for list-box typeahead for three decades, and
   * matching it is the point: users have a trained expectation of how long they can pause
   * mid-word. Shorter and a careful typist's query is split in half; longer and an unrelated
   * keypress a second later joins a query that was finished.
   */
  timeout?: number
}

export interface Typeahead {
  /** Add a character to the buffer and return the whole accumulated query. */
  push: (character: string) => string
  /** Abandon the buffer — after a selection, or when the list closes. */
  clear: () => void
  /** The buffer as it stands, without modifying it. */
  peek: () => string
}

/**
 * Accumulate typed characters into a search query that expires.
 *
 * The buffer is a ref rather than state on purpose. Typeahead produces a keystroke's worth of
 * work per key and its result is applied imperatively — focus moves to the matching item —
 * so putting it in state would re-render the entire list on every character for no visible
 * benefit. If a component wants to display the query, it should hold its own state; this hook
 * is the part that must not cost a render.
 *
 * The timer is cleared on unmount, which matters more than it looks: a menu is very often
 * closed by the same keypress that selects an item, and a pending timeout that writes to a
 * ref belonging to an unmounted component keeps that component's closure alive for half a
 * second after every single use.
 */
export function useTypeahead(options: TypeaheadOptions = {}): Typeahead {
  const { timeout = 500 } = options

  const buffer = useRef('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback((): void => {
    buffer.current = ''
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => clear, [clear])

  const push = useCallback(
    (character: string): string => {
      buffer.current += character

      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        buffer.current = ''
        timer.current = null
      }, timeout)

      return buffer.current
    },
    [timeout],
  )

  const peek = useCallback((): string => buffer.current, [])

  return useMemo(() => ({ push, clear, peek }), [push, clear, peek])
}
