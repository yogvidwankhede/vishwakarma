'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { useSyncExternalStore } from 'react'

/**
 * Track the user's reduced-motion preference.
 *
 * Implemented with `useSyncExternalStore` rather than `useState` plus `useEffect`, which
 * is the usual approach and is subtly wrong in two ways.
 *
 * The first is tearing: with `useEffect`, the first render always reports "no preference"
 * and then corrects itself after paint, so a user who asked not to be moved sees exactly
 * the animation they asked not to see, once, on every mount. `useSyncExternalStore` reads
 * the value during render on the client, so the very first frame is already correct.
 *
 * The second is server rendering. The server has no way to know the preference, so it must
 * pick one. We return `true` — assume the user *does* want reduced motion — because the
 * failure modes are not symmetric. Guessing wrong in the safe direction means a user who
 * would have enjoyed an animation misses one frame of it. Guessing wrong in the unsafe
 * direction means a user with a vestibular disorder gets hit with motion the moment the
 * page paints, which is the thing the preference exists to prevent.
 */

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}

  const list = window.matchMedia(QUERY)
  list.addEventListener('change', callback)
  return () => list.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot(): boolean {
  // Safe direction. See the note above.
  return true
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Generic media-query hook, used by the layout and theme packages too.
 *
 * Kept here rather than duplicated because the subscription bookkeeping is exactly the
 * part people get wrong, and having one correct implementation is worth the dependency.
 */
export function useMediaQuery(query: string, serverFallback = false): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', callback)
      return () => list.removeEventListener('change', callback)
    },
    () => {
      if (typeof window === 'undefined' || !window.matchMedia) return serverFallback
      return window.matchMedia(query).matches
    },
    () => serverFallback,
  )
}

/**
 * Whether the primary pointer is coarse — a finger rather than a mouse.
 *
 * Worth checking before attaching hover-dependent behaviour. On a touch device a `:hover`
 * state fires on tap and then persists until the user taps elsewhere, which is why
 * hover-revealed controls so often appear stuck on mobile.
 */
export function useCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)', false)
}

/** Whether hover is genuinely available, as opposed to emulated. */
export function useHoverCapable(): boolean {
  return useMediaQuery('(hover: hover)', true)
}
