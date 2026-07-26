'use client'

import { useEffect, useState } from 'react'

/**
 * Optional interoperability with GSAP, without ever depending on it.
 *
 * GSAP is listed as an optional peer, and "optional" has to be true at every level or it is
 * not true at all. A static `import 'gsap'` at the top of any module in this package would
 * make it a hard dependency in practice: the bundler resolves it whether or not the branch
 * that uses it is reachable, so an application that has never heard of GSAP would either
 * ship 60kB it does not use or fail to build because the specifier cannot be resolved. Tree
 * shaking does not rescue this — the import has side effects as far as the bundler can prove.
 *
 * So the specifier is only ever passed to a dynamic `import()`, behind a variable, and the
 * result is validated structurally before use. Nothing else in this package touches it: every
 * component and hook here works identically whether GSAP is installed or not, and this module
 * exists purely so that a project already using GSAP for something else can drive it from the
 * same scroll loop rather than running a second one.
 */

/**
 * The part of GSAP's surface this package cares about.
 *
 * Declared structurally rather than imported, because importing the real types would put a
 * reference to GSAP in this package's own declaration files, and a consumer without GSAP
 * installed would then fail to typecheck — the type-level version of the same problem.
 */
export interface GsapLike {
  /** Register a plugin, such as a scroll trigger. */
  registerPlugin: (...plugins: unknown[]) => void
  /** Create a timeline. Typed loosely; narrow it at the call site if you need more. */
  timeline: (options?: Record<string, unknown>) => unknown
  /** Tween to a target state. */
  to: (targets: unknown, vars: Record<string, unknown>) => unknown
}

/** Outcome of an attempt to load GSAP. */
export type GsapStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

function looksLikeGsap(value: unknown): value is GsapLike {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<GsapLike>
  return (
    typeof candidate.registerPlugin === 'function' &&
    typeof candidate.timeline === 'function' &&
    typeof candidate.to === 'function'
  )
}

let cached: Promise<GsapLike | null> | null = null

/**
 * Load GSAP if the host application has it installed. Resolves to `null` if it does not.
 *
 * The result is cached, including the negative result: a project without GSAP should pay for
 * exactly one failed resolution, not one per component that asks.
 */
export function loadOptionalGsap(): Promise<GsapLike | null> {
  if (cached) return cached

  cached = (async () => {
    // Held in a variable so that bundlers treat this as an external, runtime-resolved
    // specifier rather than a module to include in the graph. A literal here would undo the
    // entire point of this file.
    const specifier = 'gsap'
    try {
      const loaded: unknown = await import(/* @vite-ignore */ /* webpackIgnore: true */ specifier)
      if (looksLikeGsap(loaded)) return loaded

      // GSAP is published with both a namespace export and a default; which one arrives
      // depends on the interop the host bundler applies, so both are checked rather than
      // assumed.
      if (typeof loaded === 'object' && loaded !== null) {
        const record = loaded as Record<string, unknown>
        for (const key of ['gsap', 'default']) {
          const inner = record[key]
          if (looksLikeGsap(inner)) return inner
        }
      }
      return null
    } catch {
      return null
    }
  })()

  return cached
}

/** What {@link useOptionalGsap} returns. */
export interface OptionalGsap {
  /** The GSAP instance, or `null` while loading and when it is not installed. */
  gsap: GsapLike | null
  /** Where the load attempt got to. */
  status: GsapStatus
}

/**
 * Resolve GSAP from a component, if it is there.
 *
 * Anything built on the result must have a defined appearance for the frames before it
 * arrives, and for the case where it never does. Treat it as a progressive enhancement on
 * top of a design that is already complete without it — not as an asynchronous dependency to
 * wait for, because on a machine without GSAP installed the wait never ends.
 */
export function useOptionalGsap(enabled = true): OptionalGsap {
  const [state, setState] = useState<OptionalGsap>({ gsap: null, status: 'idle' })

  useEffect(() => {
    if (!enabled) return

    let live = true
    setState((previous) =>
      previous.status === 'idle' ? { gsap: null, status: 'loading' } : previous,
    )

    void loadOptionalGsap().then((gsap) => {
      if (!live) return
      setState({ gsap, status: gsap ? 'ready' : 'unavailable' })
    })

    return () => {
      live = false
    }
  }, [enabled])

  return state
}
