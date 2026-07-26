// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The one place that knows how to reach three, react-three-fiber and drei.
 *
 * All three are optional peer dependencies, which imposes two rules that the rest of the
 * package then does not have to think about.
 *
 * The first is that every reference must be dynamic. A static `import` would be hoisted
 * into the module graph, so a consumer who installed this package for its capability
 * detection and its fallback — and never intended to render a scene — would find their
 * bundler resolving three anyway, or failing the build because it is not installed. Either
 * outcome makes an "optional" dependency mandatory in practice.
 *
 * The second is that the types must be structural rather than imported. If our published
 * declarations referenced `THREE.WebGLRenderer`, then `tsc` in a consumer's project without
 * three installed would fail on our `.d.ts` files — the package would typecheck only for
 * people who already have the dependency it claims not to need. So we describe the small
 * surface we actually touch, right here, and cast at the boundary. The cost is that a
 * breaking change upstream shows up as a runtime failure rather than a compile error, which
 * is why the surface is kept as small as it possibly can be.
 */

import type { ComponentType, ReactNode } from 'react'

/** The subset of a fiber root state we rely on. */
export interface RootStateLike {
  /**
   * Request one or more frames. The only reason on-demand rendering works.
   *
   * The frame count argument matters more than it looks: a single invalidation renders one
   * frame, which is wrong for anything with damping or inertia because the next frame of
   * the easing is never scheduled.
   */
  invalidate: (frames?: number) => void
  /** The renderer. Opaque here; consumers who need it should cast it themselves. */
  gl: unknown
  /** Change the pixel ratio after creation. Used by the performance guard. */
  setDpr?: (dpr: number) => void
}

/**
 * Props accepted by fiber's `Canvas`, described loosely.
 *
 * The index signature is the deliberate escape hatch: fiber's canvas takes a large and
 * evolving prop surface, and re-declaring all of it here would be both wrong within a month
 * and a form of copying. Named fields cover what this package sets itself.
 */
export interface CanvasLikeProps {
  children?: ReactNode
  /** `[min, max]` pixel-ratio range, or a fixed number. */
  dpr?: number | [number, number]
  /** `demand` renders only when something asks. See {@link RootStateLike.invalidate}. */
  frameloop?: 'always' | 'demand' | 'never'
  shadows?: boolean | string
  className?: string
  style?: Record<string, string | number | undefined>
  onCreated?: (state: RootStateLike) => void
  gl?: Record<string, unknown>
  camera?: Record<string, unknown>
  [key: string]: unknown
}

/** A component with fiber's `Canvas` shape. */
export type CanvasComponent = ComponentType<CanvasLikeProps>

interface FiberModuleLike {
  Canvas: CanvasComponent
}

/** Whether an optional peer has been located. */
export type PeerStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

const status: Record<string, PeerStatus> = {}
const pending: Record<string, Promise<unknown> | undefined> = {}
const resolved: Record<string, unknown> = {}

/**
 * Load a peer once, remember the answer, and never reject.
 *
 * Caching the *failure* as well as the success is the important half. Without it, a page
 * with four scenes on a machine where three is genuinely absent attempts four module loads,
 * each of which the bundler may retry, and the console fills with identical errors that
 * bury whatever the real problem was.
 */
async function loadOnce<T>(key: string, loader: () => Promise<unknown>): Promise<T | null> {
  const known = resolved[key]
  if (known !== undefined) return known as T
  if (status[key] === 'unavailable') return null

  const inFlight = pending[key]
  if (inFlight) return (await inFlight) as T | null

  status[key] = 'loading'
  const attempt = loader().then(
    (module) => {
      resolved[key] = module
      status[key] = 'ready'
      return module
    },
    () => {
      status[key] = 'unavailable'
      return null
    },
  )

  pending[key] = attempt
  return (await attempt) as T | null
}

/**
 * Load react-three-fiber.
 *
 * The specifier is a literal so that bundlers can see it and split the chunk. Passing a
 * variable here would silence the "module not found" warning at the cost of the code
 * splitting that is the entire reason for loading dynamically, which is a bad trade made
 * surprisingly often.
 */
export function loadFiber(): Promise<FiberModuleLike | null> {
  return loadOnce<FiberModuleLike>('fiber', () => import('@react-three/fiber'))
}

/**
 * Load drei. Its helpers are convenient but it is by far the largest of the three packages.
 *
 * There is deliberately no `loadThree` alongside this. Application code that needs to build
 * geometry or textures already depends on three directly and should import it directly;
 * routing that through here would put a type-free `Record<string, unknown>` between the
 * caller and a library with excellent types, which helps nobody.
 */
export function loadDrei(): Promise<Record<string, unknown> | null> {
  return loadOnce<Record<string, unknown>>('drei', () => import('@react-three/drei'))
}

/** Current load status of a peer, without triggering a load. */
export function peerStatus(peer: 'fiber' | 'drei'): PeerStatus {
  return status[peer] ?? 'idle'
}

/**
 * Resolve to fiber's `Canvas`, or reject.
 *
 * `React.lazy` needs a promise that rejects on failure so that the nearest error boundary
 * can take over — which is why this exists alongside {@link loadFiber}, whose contract is
 * the opposite. Two functions rather than one flag, because a loader that sometimes throws
 * and sometimes returns null is a loader whose callers all get the handling wrong.
 */
export async function loadCanvasComponent(): Promise<{ default: CanvasComponent }> {
  const module = await loadFiber()
  if (!module?.Canvas) {
    throw new Error(
      '@vishwakarma/three: @react-three/fiber could not be loaded. Install three and ' +
        '@react-three/fiber, or render a SceneFallback instead.',
    )
  }
  return { default: module.Canvas }
}

/**
 * Forget every cached peer. Tests only.
 *
 * Application code calling this would re-download the 3D bundle, which is the exact cost
 * this module is arranged to pay once.
 */
export function resetPeerCache(): void {
  for (const key of Object.keys(status)) delete status[key]
  for (const key of Object.keys(pending)) delete pending[key]
  for (const key of Object.keys(resolved)) delete resolved[key]
}
