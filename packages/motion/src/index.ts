// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/motion
 *
 * Motion primitives implementing the Vishwakarma Motion Grammar.
 *
 * Two decisions shape this package. First, the reduced-motion preference is handled inside
 * every hook rather than beside them, because an accessibility feature that must be
 * remembered does not get remembered. Second, nothing here requires an animation library:
 * the primitives run on CSS transitions and IntersectionObserver, so the baseline cost is
 * zero and a heavier library remains an optional upgrade rather than a prerequisite.
 */

// Re-exported so consumers can reason about motion without also depending on core.
export {
  DURATIONS,
  type DurationName,
  EASINGS,
  type EasingName,
  INTENT_PROFILES,
  judgeProperty,
  type MotionDistance,
  type MotionIntent,
  needsReducedMotionGuard,
  SPRINGS,
  type SpringName,
  toCssEasing,
} from '@vishwakarma/core'
export {
  Reveal,
  RevealGroup,
  type RevealGroupProps,
  type RevealProps,
  RevealStyles,
  Transition,
  type TransitionProps,
} from './reveal.js'
export {
  type MotionStyle,
  type UseMotionOptions,
  type UseStaggerOptions,
  useMotion,
  useMotionStyle,
  useSpring,
  useStagger,
} from './use-motion.js'
export {
  useCoarsePointer,
  useHoverCapable,
  useMediaQuery,
  useReducedMotion,
} from './use-reduced-motion.js'
