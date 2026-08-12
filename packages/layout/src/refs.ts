'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { type Ref, type RefCallback, useCallback } from 'react'

/**
 * Write a value into a ref of either form.
 *
 * Object refs and callback refs are both `Ref<T>`, and forgetting the callback case is the
 * usual bug: the component appears to work, the caller's `useRef` fills in, and then a
 * caller who passes a callback ref — which is what every ref-merging utility and most
 * animation libraries do — silently receives nothing.
 */
export function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') {
    ref(value)
  } else if (ref) {
    // React's RefObject type is readonly in the current typings, but assignment is exactly
    // what React itself does here; the readonly marker is about consumers, not owners.
    ;(ref as { current: T | null }).current = value
  }
}

/**
 * Combine an internal ref with one the caller passed in.
 *
 * Memoised on the two inputs, and that memoisation is load-bearing rather than an
 * optimisation. React detaches and re-attaches a callback ref whenever its identity
 * changes — calling it with `null`, then with the node — so a merged ref rebuilt on every
 * render makes any observer or measurement attached to it tear down and restart on every
 * render, which is both a performance problem and a source of measurement flicker.
 */
export function useMergedRef<T>(
  internal: Ref<T> | undefined,
  external: Ref<T> | undefined,
): RefCallback<T> {
  return useCallback(
    (node: T | null) => {
      assignRef(internal, node)
      assignRef(external, node)
    },
    [internal, external],
  )
}
