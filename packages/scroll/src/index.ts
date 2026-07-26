// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/scroll
 *
 * Scroll-linked interface behaviour, built on three commitments.
 *
 * Progress is always derived from position, never accumulated from deltas, so every value in
 * this package is a pure function of where the page currently is. Reloading mid-document,
 * jumping from a fragment link, flinging a trackpad and dropping frames under load all
 * produce the same answer as scrolling there slowly, because there is no state to get out of
 * step.
 *
 * The work is arranged so the browser can take it away from us. Boolean questions go to
 * `IntersectionObserver`; continuous ones are reduced to a single CSS custom property, which
 * a scroll-driven animation drives natively wherever `animation-timeline` is supported, and
 * a shared rAF loop drives everywhere else. The scripted path measures every subscriber
 * before it writes to any of them, keeps every listener passive, and never touches layout
 * inside a scroll handler.
 *
 * The user stays in control of the scroll. Nothing here cancels a wheel or touch event, so
 * find-in-page, keyboard scrolling, screen-reader virtual cursors, momentum and scroll
 * restoration all keep working; pinning is sticky positioning, not interception. Parallax is
 * gated on the reduced-motion preference and capped at a documented displacement.
 */

export {
  type Axis,
  clamp01,
  type ElementMetrics,
  nativeRangeFor,
  progressWithin,
  quantise,
  resolveScrollRange,
  SCROLL_RANGES,
  type ScrollAnchor,
  type ScrollRange,
  type ScrollRangeInput,
  type ScrollRangePreset,
  type ScrollSpan,
  scrollSpanFor,
} from './geometry.js'
export {
  type GsapLike,
  type GsapStatus,
  loadOptionalGsap,
  type OptionalGsap,
  useOptionalGsap,
} from './optional-gsap.js'
export { MAX_PARALLAX_DISTANCE, Parallax, type ParallaxProps } from './parallax.js'
export { PINNED_PROGRESS_PROPERTY, Pinned, type PinnedProps } from './pinned.js'
export { ScrollLinked, type ScrollLinkedProps } from './scroll-linked.js'
export { ScrollProgressBar, type ScrollProgressBarProps } from './scroll-progress-bar.js'
export {
  ensureScrollStyles,
  NATIVE_ATTRIBUTE,
  PROGRESS_PROPERTY,
  SCROLL_CSS,
  SCROLL_STYLE_ID,
  ScrollStyles,
  useScrollStyles,
} from './styles.js'
export {
  supportsRegisteredProperties,
  supportsScrollTimeline,
  supportsViewTimeline,
  useScrollTimelineSupport,
} from './supports.js'
export {
  readScrollFrame,
  requestScrollFrame,
  type ScrollFrame,
  type ScrollTask,
  subscribeToScroll,
} from './ticker.js'

export { useComposedRef } from './use-composed-ref.js'
export { type IsScrollingOptions, useIsScrolling } from './use-is-scrolling.js'
export {
  type ProgressBinding,
  type ProgressBindingOptions,
  type ProgressDriver,
  useProgressBinding,
} from './use-progress-binding.js'
export {
  type ScrollDirection,
  type ScrollDirectionOptions,
  useScrollDirection,
} from './use-scroll-direction.js'
export {
  type PageScrollProgressOptions,
  type ScrollProgressOptions,
  type ScrollProgressResult,
  usePageScrollProgress,
  useScrollProgress,
} from './use-scroll-progress.js'
export { type SectionSpyOptions, type SectionSpyResult, useSectionSpy } from './use-section-spy.js'
