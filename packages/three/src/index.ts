/**
 * @vishwakarma/three
 *
 * Helpers for putting 3D on a web page without the page paying for it.
 *
 * three, @react-three/fiber and @react-three/drei are optional peer dependencies, and that
 * shapes the whole package. Everything reachable from this barrel works with none of them
 * installed: the capability probe, the budgets, the fallback, the accessibility wrapper and
 * the reduced-motion translation are plain React and plain arithmetic. The two components
 * that genuinely need a renderer reach it through a dynamic import behind an error
 * boundary, so their absence produces the static alternative rather than a failed build.
 *
 * The order of operations the package encodes is: decide whether to render 3D at all, then
 * decide how much, then load, then watch and give up detail if the device turns out to
 * disagree — and at every stage have a designed still composition ready, because for a
 * large share of visitors that composition is the page.
 */

export { AdaptiveCanvas, type AdaptiveCanvasProps } from './adaptive-canvas.js'

export {
  type BudgetReport,
  type BudgetViolation,
  budgetFor,
  checkSceneBudget,
  frameBudgetForRefreshRate,
  SCENE_BUDGETS,
  type SceneBudget,
  type SceneStats,
  textureMemoryMiB,
} from './budgets.js'
export {
  assessDeviceCapability,
  type CapabilityOptions,
  classifyGpu,
  compareQuality,
  type DeviceCapability,
  degradeQuality,
  type GpuTier,
  minQuality,
  probeWebgl,
  type QualityTier,
  recommendQuality,
  resetCapabilityCache,
  UNPROBED_CAPABILITY,
  type WebglProbe,
  type WebglSupport,
} from './capability.js'
export {
  LazyScene,
  type LazySceneProps,
  type SceneFallbackRenderer,
  useNearViewport,
} from './lazy-scene.js'
export {
  type CanvasComponent,
  type CanvasLikeProps,
  loadCanvasComponent,
  loadDrei,
  loadFiber,
  type PeerStatus,
  peerStatus,
  type RootStateLike,
  resetPeerCache,
} from './optional-peers.js'
export { PerformanceGuard, type PerformanceGuardProps } from './performance-guard.js'
export { SceneBoundary, type SceneBoundaryProps } from './scene-boundary.js'
export {
  AccessibleScene,
  type AccessibleSceneProps,
  type OrbitDelta,
  orbitDeltaForKey,
  SceneDescription,
  type SceneDescriptionProps,
  VISUALLY_HIDDEN,
} from './scene-description.js'
export {
  SceneFallback,
  type SceneFallbackProps,
  type SceneFallbackReason,
} from './scene-fallback.js'
export {
  createRenderHandle,
  type RenderHandle,
  RenderHandleContext,
  SceneQualityContext,
  type SceneQualityValue,
  useRenderHandle,
  useSceneQuality,
} from './scene-runtime.js'
export {
  type UseDeviceCapabilityOptions,
  useDeviceCapability,
  useRecommendedQuality,
  useSceneViability,
} from './use-device-capability.js'
export {
  type OnDemandRenderControls,
  type UseOnDemandRenderOptions,
  useOnDemandRender,
} from './use-on-demand-render.js'
export {
  type SceneMotionSettings,
  type UseReducedMotionSceneOptions,
  useReducedMotionScene,
} from './use-reduced-motion-scene.js'
