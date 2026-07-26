'use client'

import type { Ref, RefCallback } from 'react'
import { useCallback } from 'react'

/**
 * Merge several refs into one.
 *
 * A primitive almost always needs its own handle on a node — to measure it, to trap focus
 * inside it, to query its items — and the consumer almost always wants one too. React gives
 * an element exactly one `ref` slot, so one of the two has to lose unless they are merged.
 *
 * React 19 changed the contract in a way that matters here: a callback ref may return a
 * cleanup function, and if it does, React calls that cleanup on detach *instead of* calling
 * the ref again with `null`. A naive merge that ignores the return value therefore leaks —
 * the inner ref is never told the node went away — and a merge that both returns a cleanup
 * and calls `ref(null)` tells it twice. This implementation records whatever each ref hands
 * back and synthesises the null call only for refs that returned nothing.
 *
 * Cleanups run in reverse attach order, matching the nesting they were created in.
 */
export function composeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return (node: T | null) => {
    const cleanups: Array<() => void> = []

    for (const ref of refs) {
      if (ref === null || ref === undefined) continue

      if (typeof ref === 'function') {
        const result = ref(node)
        cleanups.push(typeof result === 'function' ? result : () => ref(null))
      } else {
        ref.current = node
        cleanups.push(() => {
          ref.current = null
        })
      }
    }

    return () => {
      for (let index = cleanups.length - 1; index >= 0; index -= 1) {
        cleanups[index]?.()
      }
    }
  }
}

/**
 * {@link composeRefs}, memoised on the refs it was given.
 *
 * Without the memo the merged ref is a new function on every render, and React detaches and
 * reattaches it every time — which means every consumer ref sees `null` and then the same
 * node again on each render. Anything that reacts to attachment (a resize observer, an
 * initial-focus effect) then re-runs continuously, and the bug looks like an infinite loop
 * with no obvious source.
 *
 * The dependency list is the spread ref array, which is variadic by nature. That is safe
 * here because the number of refs a given call site passes is fixed by the shape of the
 * code, not by data.
 */
export function useComposedRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  // biome-ignore lint/correctness/useExhaustiveDependencies: the ref list is the dependency list; its length is fixed per call site.
  return useCallback(composeRefs(...refs), refs)
}
