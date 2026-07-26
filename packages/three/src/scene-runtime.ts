'use client'

import { createContext, useContext } from 'react'
import { budgetFor, type SceneBudget } from './budgets.js'
import { degradeQuality, type QualityTier } from './capability.js'

/**
 * The small amount of state that has to be shared between the canvas, the guard and
 * whatever the application renders inside the scene.
 *
 * There are two pieces of it, and they are kept in separate contexts on purpose. Quality
 * changes rarely and every mesh in the scene wants to re-render when it does. The render
 * handle changes never — it is a mutable box — and nothing should re-render when its
 * contents are replaced. Putting both in one context would mean that publishing the
 * renderer's `invalidate` function after canvas creation re-rendered the entire scene graph
 * for no reason, which on a large scene is a visible hitch at exactly the moment the user
 * is forming their first impression.
 */

/** Quality state, as provided by {@link PerformanceGuard} and consumed by scene contents. */
export interface SceneQualityValue {
  /** The tier the scene should currently render at. */
  quality: QualityTier
  /** The budget that goes with the tier. Convenience; equals `budgetFor(quality)`. */
  budget: SceneBudget
  /** Set the tier explicitly. Used by an application's own quality control. */
  setQuality: (tier: QualityTier) => void
  /** Step the tier down by one. What the guard calls when frames get expensive. */
  degrade: () => void
  /** Whether the tier has been reduced below the one the device was assessed at. */
  degraded: boolean
}

/**
 * The fallback used when scene contents are rendered without a guard above them.
 *
 * `useSceneQuality` deliberately does not throw in that case, unlike the theme package's
 * `useTheme`. The difference is what a mistake costs: a theme toggle outside its provider
 * is broken and should say so loudly, whereas a mesh outside a quality provider has a
 * perfectly reasonable thing to do — render at the middle tier — and crashing the whole
 * tree because a decorative detail could not read its detail level is out of proportion.
 */
const DEFAULT_QUALITY: SceneQualityValue = Object.freeze({
  quality: 'medium',
  budget: budgetFor('medium'),
  setQuality: () => {},
  degrade: () => {},
  degraded: false,
})

export const SceneQualityContext = createContext<SceneQualityValue | null>(null)

/** Read the current quality tier and its budget. Safe outside a provider; see above. */
export function useSceneQuality(): SceneQualityValue {
  return useContext(SceneQualityContext) ?? DEFAULT_QUALITY
}

/**
 * A mutable box holding the renderer's frame-request function.
 *
 * A box rather than the function itself because the function does not exist until the
 * canvas has been created, which happens after the provider has rendered. Storing it in a
 * stable object and mutating the field means consumers can hold a reference from their
 * first render and have it work later, without the provider re-rendering to hand it over.
 */
export interface RenderHandle {
  /** Request `frames` more frames, or one if unspecified. `null` until the canvas exists. */
  invalidate: ((frames?: number) => void) | null
}

/** Create an empty render handle. One per canvas. */
export function createRenderHandle(): RenderHandle {
  return { invalidate: null }
}

export const RenderHandleContext = createContext<RenderHandle | null>(null)

/**
 * Read the render handle.
 *
 * Returns `null` when there is no canvas above the caller — including, potentially, when
 * the caller is *inside* the canvas and the fiber reconciler has not forwarded the context
 * across the renderer boundary. Callers must treat a missing handle as "rendering is
 * somebody else's problem" and carry on, never as an error: the worst case is a scene that
 * renders continuously instead of on demand, which is a performance regression rather than
 * a broken page.
 */
export function useRenderHandle(): RenderHandle | null {
  return useContext(RenderHandleContext)
}

/** Compute the next tier down. Re-exported here so scene code has one import for runtime. */
export { degradeQuality }
