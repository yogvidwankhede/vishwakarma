'use client'

import { type CSSProperties, type ReactNode, Suspense, lazy, useCallback, useRef } from 'react'
import type { QualityTier } from './capability.js'
import { budgetFor } from './budgets.js'
import {
  type CanvasLikeProps,
  type RootStateLike,
  loadCanvasComponent,
} from './optional-peers.js'
import { RenderHandleContext, createRenderHandle, useSceneQuality } from './scene-runtime.js'
import { SceneBoundary } from './scene-boundary.js'

/**
 * A canvas with defaults chosen for a web page rather than for a demo.
 *
 * Two of those defaults are worth arguing for explicitly, because both differ from what
 * every getting-started example does.
 *
 * **The frame loop runs on demand.** A continuous loop redraws sixty times a second whether
 * or not anything has changed, and for the large majority of scenes on the web — a product
 * model sitting still, a logo the user can rotate, a diagram — nothing changes for minutes
 * at a time. The cost is not theoretical: a full-screen WebGL scene redrawing continuously
 * is one of the most reliable ways to flatten a phone battery, it prevents the CPU from
 * reaching its idle states, it spins up fans on laptops, and it does all of that to produce
 * a sequence of identical images. On demand means the renderer draws when React commits a
 * change, when the user interacts, or when {@link useOnDemandRender} asks. Scenes with
 * genuine continuous motion should set `frameloop="always"` and mean it.
 *
 * **The pixel ratio is a range, not a number.** Passing a fixed value forces a choice
 * between a scene that is soft on high-density displays and one that renders four times the
 * pixels it needs on a phone that cannot afford them. A range lets the renderer settle
 * within it, and lets the performance guard lower the ceiling later without recreating the
 * context. The range comes from the quality tier's budget, so a device assessed as low
 * renders below 1x — which sounds alarming and is, in practice, the single most effective
 * lever available on a fill-rate-bound mobile GPU.
 */

// Created once at module scope. `lazy` inside a component creates a new lazy type on every
// render, which React treats as a different component: it unmounts the canvas, disposes the
// WebGL context and rebuilds the entire scene, every render.
const LazyCanvas = lazy(loadCanvasComponent)

export interface AdaptiveCanvasProps {
  children: ReactNode
  /**
   * Tier to render at. Defaults to whatever a surrounding {@link PerformanceGuard}
   * provides, and to `medium` if there is none.
   */
  quality?: QualityTier
  /**
   * Frame loop mode. `demand` by default; see the note above before changing it.
   *
   * `never` is occasionally the right answer for a scene rendered once to a still image.
   */
  frameloop?: 'always' | 'demand' | 'never'
  /** Override the tier's pixel-ratio range. */
  dpr?: [number, number]
  /** Shown while the 3D bundle loads and after any failure inside it. */
  fallback: ReactNode
  /** Called when the renderer exists. The render handle is wired up before this runs. */
  onCreated?: (state: RootStateLike) => void
  /** Reported when the scene throws or the 3D bundle cannot be loaded. */
  onError?: (error: unknown) => void
  /** Extra props forwarded to the underlying canvas, unmodified. */
  canvasProps?: CanvasLikeProps
  className?: string
  style?: CSSProperties
}

export function AdaptiveCanvas({
  children,
  quality,
  frameloop = 'demand',
  dpr,
  fallback,
  onCreated,
  onError,
  canvasProps,
  className,
  style,
}: AdaptiveCanvasProps): ReactNode {
  const context = useSceneQuality()
  const tier = quality ?? context.quality
  const budget = budgetFor(tier)

  // One handle per canvas instance, created eagerly and never replaced. Consumers below
  // capture it on their first render and it is still the same object once the renderer
  // finally fills it in.
  const handleRef = useRef(createRenderHandle())

  const handleCreated = useCallback(
    (state: RootStateLike): void => {
      handleRef.current.invalidate = (frames?: number) => state.invalidate(frames)
      onCreated?.(state)
    },
    [onCreated],
  )

  // Nothing to render at all. Returning the fallback rather than an empty canvas matters:
  // an empty canvas still allocates a WebGL context, which on a device weak enough to be
  // assessed at `none` is precisely the resource we are trying not to spend.
  if (tier === 'none') return <>{fallback}</>

  const range: [number, number] = dpr ?? [budget.dpr[0], budget.dpr[1]]

  return (
    <RenderHandleContext.Provider value={handleRef.current}>
      <SceneBoundary fallback={fallback} onError={onError}>
        {/*
          The Suspense fallback and the boundary fallback are the same node on purpose. The
          user should not be able to tell whether the scene is still arriving or never will:
          both states show the designed still composition, and only one of them is ever
          replaced.
        */}
        <Suspense fallback={fallback}>
          <LazyCanvas
            frameloop={frameloop}
            dpr={range}
            onCreated={handleCreated}
            className={className}
            {...(style ? { style: style as Record<string, string | number | undefined> } : {})}
            {...canvasProps}
          >
            {children}
          </LazyCanvas>
        </Suspense>
      </SceneBoundary>
    </RenderHandleContext.Provider>
  )
}
