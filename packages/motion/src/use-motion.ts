'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react'
import {
  resolveMotion,
  stagger,
  toPhysicalSpring,
  type MotionDistance,
  type MotionIntent,
  type ResolvedMotion,
  type SpringName,
  type SpringSpec,
} from '@vishwakarma/core'
import { useReducedMotion } from './use-reduced-motion.js'

export interface UseMotionOptions {
  intent: MotionIntent
  distance?: MotionDistance
  delay?: number
  /** Escape hatch for motion that is genuinely essential to comprehension. Rarely correct. */
  ignoreReducedMotion?: boolean
}

/**
 * Resolve a semantic motion intent into concrete values, with the user's reduced-motion
 * preference already applied.
 *
 * This is the hook the rest of the package is built on, and the reason the reduced-motion
 * handling is inside it rather than beside it. Accessibility features that must be
 * remembered do not get remembered. Making the preference impossible to bypass by accident
 * — you have to pass `ignoreReducedMotion` explicitly and justify it — is worth more than
 * any amount of documentation telling people to check.
 */
export function useMotion(options: UseMotionOptions): ResolvedMotion {
  const prefersReduced = useReducedMotion()
  const { intent, distance = 'medium', delay = 0, ignoreReducedMotion = false } = options

  return useMemo(
    () =>
      resolveMotion({
        intent,
        distance,
        delay,
        reducedMotion: prefersReduced,
        respectReducedMotion: !ignoreReducedMotion,
      }),
    [intent, distance, delay, prefersReduced, ignoreReducedMotion],
  )
}

export interface MotionStyle {
  transitionDuration: string
  transitionTimingFunction: string
  transitionDelay: string
  /** Combined shorthand, for when a single style property is more convenient. */
  transition: string
}

/**
 * A ready-to-spread style object for a CSS transition.
 *
 * Note that it deliberately does not set `transition-property`. Setting it to `all` is the
 * most common performance mistake in React styling: it makes the browser watch every
 * animatable property on the element, including ones that force layout, and it means an
 * unrelated class change can trigger an unintended transition. The caller names the
 * properties it actually intends to animate.
 */
export function useMotionStyle(options: UseMotionOptions & { properties?: string[] }): MotionStyle {
  const resolved = useMotion(options)
  const properties = options.properties ?? ['opacity', 'transform']

  return useMemo(() => {
    const duration = `${resolved.durationMs}ms`
    const easing = resolved.cssEasing
    const delay = `${resolved.delayMs}ms`

    return {
      transitionDuration: duration,
      transitionTimingFunction: easing,
      transitionDelay: delay,
      transition: properties.map((property) => `${property} ${duration} ${easing} ${delay}`).join(', '),
    }
  }, [resolved, properties])
}

export interface UseStaggerOptions {
  count: number
  step?: number
  from?: 'first' | 'last' | 'centre' | 'edges'
  maxTotal?: number
}

/**
 * Per-element delays for a group reveal.
 *
 * Collapses to all-zeros under reduced motion. A staggered sequence is still spatial
 * choreography even when each individual step is only a fade, and a user who asked for
 * calm should not have to watch a wave travel across a list.
 */
export function useStagger(options: UseStaggerOptions): number[] {
  const prefersReduced = useReducedMotion()
  const { count, step = 34, from = 'first', maxTotal = 420 } = options

  return useMemo(() => {
    if (prefersReduced) return Array.from({ length: Math.max(count, 0) }, () => 0)
    return stagger({ count, step, from, maxTotal })
  }, [count, step, from, maxTotal, prefersReduced])
}

/**
 * Spring parameters in the form animation libraries expect.
 *
 * Takes the damping-ratio form, because stiffness and damping are close to impossible to
 * reason about without simulating them, whereas "0.86 damped, settles in 0.42s" is a
 * description a human can hold in their head.
 */
export function useSpring(spec: SpringSpec | SpringName, mass = 1) {
  const prefersReduced = useReducedMotion()

  return useMemo(() => {
    if (prefersReduced) {
      // Critically damped and fast: the state change still happens, but nothing oscillates
      // and nothing overshoots.
      return toPhysicalSpring({ duration: 0.12, damping: 1 }, mass)
    }
    return toPhysicalSpring(spec, mass)
  }, [spec, mass, prefersReduced])
}
