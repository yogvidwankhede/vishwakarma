'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef } from 'react'
import { useRenderHandle } from './scene-runtime.js'

/**
 * Drive an on-demand frame loop.
 *
 * With `frameloop="demand"` the renderer draws only when something asks it to. React state
 * changes that pass through the reconciler ask automatically; nothing else does. So the
 * cases that silently stop updating are exactly the ones that bypass React — a value read
 * from an external store, a ref mutated in an event handler, a texture that finished
 * decoding, a CSS-driven layout change that altered the canvas size. The scene is correct
 * in memory and stale on screen, which is a maddening bug to chase because everything you
 * inspect says the right thing.
 *
 * This hook is the deliberate ask. Call `requestRender` after any change the reconciler did
 * not see.
 */

const NO_DEPS: readonly unknown[] = []

export interface UseOnDemandRenderOptions {
  /**
   * Values that should trigger a frame when they change.
   *
   * Compared by identity, like a dependency array. The array's *length* must be stable
   * across renders, for the same reason React's own dependency arrays must be.
   */
  on?: readonly unknown[]
  /**
   * How many frames a bare `requestRender()` should ask for. One by default.
   *
   * Raise it for anything with inertia. A single frame renders the first step of a damped
   * camera movement and then stops, because the thing that would have requested the second
   * frame was the second frame itself — the scene ends up frozen part-way through the
   * motion, which looks like a stuck animation rather than a missing render.
   */
  frames?: number
}

/** The controls returned by {@link useOnDemandRender}. */
export interface OnDemandRenderControls {
  /** Ask for `frames` more frames. Silently does nothing when there is no canvas above. */
  requestRender: (frames?: number) => void
  /**
   * Keep the scene rendering for a duration, in milliseconds.
   *
   * For open-ended motion whose length is known but whose per-frame changes are invisible
   * to React: a scripted camera move, a physics settle, a shader transition. Cheaper and
   * far more predictable than switching the whole canvas to a continuous frame loop and
   * forgetting to switch it back — which is the usual way a scene ends up rendering
   * continuously in production while rendering on demand in development.
   */
  renderFor: (durationMs: number) => () => void
  /**
   * Whether a canvas was found. Read at render time, so it can lag the truth by a frame
   * after mount. Informational only; the functions above are always safe to call.
   */
  connected: boolean
}

export function useOnDemandRender(options: UseOnDemandRenderOptions = {}): OnDemandRenderControls {
  const { on = NO_DEPS, frames = 1 } = options
  const handle = useRenderHandle()
  const running = useRef<Set<() => void>>(new Set())

  const requestRender = useCallback(
    (count?: number) => {
      handle?.invalidate?.(count ?? frames)
    },
    [handle, frames],
  )

  const renderFor = useCallback(
    (durationMs: number): (() => void) => {
      if (typeof requestAnimationFrame !== 'function') {
        requestRender(1)
        return () => {}
      }

      let raf = 0
      let stopped = false
      const started = performance.now()
      const loops = running.current

      const cancel = (): void => {
        stopped = true
        cancelAnimationFrame(raf)
        loops.delete(cancel)
      }

      const step = (): void => {
        if (stopped) return
        requestRender(1)
        if (performance.now() - started >= durationMs) {
          loops.delete(cancel)
          return
        }
        raf = requestAnimationFrame(step)
      }

      loops.add(cancel)
      raf = requestAnimationFrame(step)
      return cancel
    },
    [requestRender],
  )

  // Stop anything still looping when the component goes away. A render loop that outlives
  // its component keeps the renderer alive through its closure and keeps asking a disposed
  // canvas to draw, which surfaces much later as a leak nobody can attribute.
  useEffect(() => {
    const loops = running.current
    return () => {
      for (const cancel of [...loops]) cancel()
    }
  }, [])

  // Spreading the caller's list into the dependency array is intentional, and is the reason
  // its length must stay constant: React compares dependency arrays positionally, and an
  // array that changes length between renders makes the comparison meaningless — the effect
  // then either never fires or fires every render, and which one you get depends on the
  // order the lengths happened to change in.
  useEffect(() => {
    requestRender()
  }, [requestRender, ...on])

  return { requestRender, renderFor, connected: handle?.invalidate != null }
}
