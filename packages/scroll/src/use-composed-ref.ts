'use client'

import { type Ref, type RefObject, useCallback, useRef } from 'react'

/**
 * Keep a private ref to an element while still honouring the caller's own ref.
 *
 * Every component here needs the DOM node for measurement, and every component here should
 * still let its caller reach that node. In React 19 `ref` is an ordinary prop, so the only
 * remaining work is fanning one node out to two consumers.
 *
 * The callback is memoised against the external ref. An unmemoised ref callback is a new
 * function on every render, and React responds to a changed ref callback by calling the old
 * one with `null` and the new one with the node — so an inline callback detaches and
 * reattaches the element on every render, which is how measurement code ends up seeing a
 * `null` element at unpredictable moments.
 */
export function useComposedRef<T>(
  external?: Ref<T>,
): [RefObject<T | null>, (node: T | null) => void] {
  const internal = useRef<T | null>(null)

  const set = useCallback(
    (node: T | null) => {
      internal.current = node
      if (typeof external === 'function') external(node)
      else if (external) external.current = node
    },
    [external],
  )

  return [internal, set]
}
