'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useLayoutEffect } from 'react'

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * Every one of these primitives has work that must happen before the browser paints — taking
 * initial focus, locking the scrollbar, restoring focus as a dialog closes. Doing that in
 * `useEffect` means one painted frame in the wrong state, which for a scroll lock is a
 * visible jump and for focus is a frame where the keyboard is pointed at the wrong thing.
 *
 * But `useLayoutEffect` does not run during server rendering, and React says so out loud
 * with a warning on every render of every affected component. The warning is correct and
 * unhelpful: the effect is deliberately client-only, and there is nothing to fix. Swapping
 * the implementation silences it without changing client behaviour at all.
 */
export const useIsomorphicLayoutEffect =
  typeof document === 'undefined' ? useEffect : useLayoutEffect
