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

export {
  useReducedMotion,
  useMediaQuery,
  useCoarsePointer,
  useHoverCapable,
} from './use-reduced-motion.js'

export {
  type UseMotionOptions,
  type MotionStyle,
  type UseStaggerOptions,
  useMotion,
  useMotionStyle,
  useStagger,
  useSpring,
} from './use-motion.js'

export {
  type RevealProps,
  type RevealGroupProps,
  type TransitionProps,
  RevealStyles,
  Reveal,
  RevealGroup,
  Transition,
} from './reveal.js'

// Re-exported so consumers can reason about motion without also depending on core.
export {
  type MotionIntent,
  type MotionDistance,
  type EasingName,
  type DurationName,
  type SpringName,
  EASINGS,
  DURATIONS,
  SPRINGS,
  INTENT_PROFILES,
  judgeProperty,
  needsReducedMotionGuard,
  toCssEasing,
} from '@vishwakarma/core'
