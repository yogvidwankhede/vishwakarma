'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useInsertionEffect, useRef } from 'react'

/**
 * Wrap a callback so that its identity never changes but its body is always the latest one.
 *
 * Almost every primitive in this package needs this. A primitive attaches a document-level
 * listener, or memoises a handler with `useCallback([])`, and then has to call back into
 * user code — `onOpenChange`, `onSelect`, `onValueChange`. If the user's callback is in the
 * dependency array, the listener is torn down and reattached on every render, because the
 * overwhelmingly common calling convention is an inline arrow function. Reattaching a
 * `pointerdown` listener between the press and the release is enough to make dismissal
 * randomly fail. If the callback is *not* in the dependency array, it is captured stale on
 * the first render and reads state from a render that happened minutes ago.
 *
 * The store is written in an insertion effect rather than during render or in a layout
 * effect. During render is wrong because a render may be thrown away — under Suspense or a
 * discarded concurrent attempt — and the ref would then hold a callback from a tree that
 * never committed. Insertion effects run before layout effects, so a layout effect that
 * fires on the same commit (a focus trap taking initial focus, for example) already sees
 * the current callback rather than the previous one.
 *
 * The one rule: never call the returned function during render. It is an event handler, and
 * between render and the insertion effect it still points at the previous callback.
 */
export function useEventCallback<Args extends unknown[], Result>(
  callback: ((...args: Args) => Result) | undefined,
): (...args: Args) => Result | undefined {
  const stored = useRef(callback)

  useInsertionEffect(() => {
    stored.current = callback
  }, [callback])

  return useCallback((...args: Args) => stored.current?.(...args), [])
}
