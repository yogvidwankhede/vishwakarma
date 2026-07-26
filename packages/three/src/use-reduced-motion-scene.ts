'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { useMemo, useSyncExternalStore } from 'react'

/**
 * Reduced motion, translated into the vocabulary a 3D scene actually speaks.
 *
 * The prefers-reduced-motion media query is usually handled at the CSS layer, and a canvas
 * has no CSS layer. Nothing inside a WebGL context is affected by the preference unless
 * somebody reads it in JavaScript and does something about it, so scenes routinely keep
 * spinning for users who have disabled animation everywhere else on their machine — and a
 * slowly rotating product model that fills the viewport is a considerably stronger
 * vestibular trigger than the fades and slides the preference was invented to suppress.
 *
 * What this hook does not do is stop rendering. Reduced motion means *still*, not *absent*.
 * A frozen 3D scene the user can inspect, rotate deliberately with their own input, and
 * read at their own pace is a better outcome than replacing it with a flat image, and it
 * respects the preference completely: motion only ever happens because the user asked for
 * it just then.
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
  // Assume the user wants calm. Read the note in the motion package for the full argument:
  // the two failure modes are not symmetric, and only one of them can make somebody unwell.
  return true
}

/** What a scene should do about the user's motion preference. */
export interface SceneMotionSettings {
  /** The raw preference, for anything not covered below. */
  prefersReducedMotion: boolean
  /**
   * Whether autorotation should run. False under reduced motion, always.
   *
   * Pass straight to an orbit control's `autoRotate`. The common bug is passing a *speed*
   * of zero instead: many control implementations still run their update loop, which under
   * `frameloop="demand"` means the scene keeps requesting frames forever for a rotation
   * that is not visibly happening.
   */
  autoRotate: boolean
  /** Autorotation speed. Zero when frozen, so both signals agree. */
  autoRotateSpeed: number
  /**
   * Whether camera inertia should be enabled.
   *
   * Damping is switched off under reduced motion because it produces movement that
   * continues after the user has stopped providing input, which is precisely the category
   * of unrequested motion the preference is about — even though it feels like polish.
   */
  enableDamping: boolean
  /** Damping factor, zero when damping is off. */
  dampingFactor: number
  /**
   * Whether ambient scene animation — drifting particles, idle float, looping shaders —
   * should run at all.
   */
  animate: boolean
  /**
   * A multiplier to apply to any animation rate the scene computes itself. Zero when
   * frozen, so `delta * motionScale` freezes an existing animation without restructuring it.
   */
  motionScale: number
  /**
   * The frame loop mode implied by the settings.
   *
   * `demand` under reduced motion: with nothing animating, rendering continuously would
   * draw an identical image sixty times a second, which is pure battery cost.
   */
  frameloop: 'always' | 'demand'
}

export interface UseReducedMotionSceneOptions {
  /** Autorotation speed to use when motion is permitted. */
  autoRotateSpeed?: number
  /** Damping factor to use when damping is permitted. */
  dampingFactor?: number
  /**
   * Force the frozen settings regardless of the media query.
   *
   * Exists so an application can wire its own in-page "reduce motion" or "pause animation"
   * control to the same code path. Offering that control is worth doing: the OS-level
   * preference is buried in accessibility settings, and plenty of people who would use a
   * pause button have never found it.
   */
  freeze?: boolean
  /** Whether autorotation is wanted at all when motion is permitted. Defaults to true. */
  autoRotate?: boolean
}

/**
 * Resolve motion settings for a scene.
 *
 * Uses `useSyncExternalStore` so the first client render is already correct. With the usual
 * state-plus-effect approach the scene mounts with autorotation on and switches it off a
 * frame later, which means a user who disabled animation still sees the model lurch — once,
 * on every page load.
 */
export function useReducedMotionScene(
  options: UseReducedMotionSceneOptions = {},
): SceneMotionSettings {
  const { autoRotateSpeed = 0.5, dampingFactor = 0.05, freeze = false, autoRotate = true } = options
  const prefersReducedMotion = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const frozen = prefersReducedMotion || freeze

  return useMemo<SceneMotionSettings>(
    () => ({
      prefersReducedMotion,
      autoRotate: frozen ? false : autoRotate,
      autoRotateSpeed: frozen || !autoRotate ? 0 : autoRotateSpeed,
      enableDamping: !frozen,
      dampingFactor: frozen ? 0 : dampingFactor,
      animate: !frozen,
      motionScale: frozen ? 0 : 1,
      frameloop: frozen || !autoRotate ? 'demand' : 'always',
    }),
    [prefersReducedMotion, frozen, autoRotate, autoRotateSpeed, dampingFactor],
  )
}
