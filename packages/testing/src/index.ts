// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/testing
 *
 * Conformance testing for a design system: contrast, accessible names, hit targets, focus
 * visibility and order, token discipline, and Design Contract compliance — plus the jsdom
 * shims those checks need in order to mean anything.
 *
 * Two decisions shape the whole package.
 *
 * It depends on no test runner. Every matcher is a plain function returning
 * `{ pass, message }`, typed structurally, so `expect.extend(vishwakarmaMatchers)` works in
 * Vitest and Jest alike and neither is a dependency. Each check is also exported as an
 * ordinary function, so the same logic runs in a CI audit script or a Playwright test with
 * no `expect` in scope.
 *
 * It compiles without the DOM library. The types in `dom.ts` describe the handful of
 * members these checks actually use, which keeps the package honest about what it touches
 * and lets it run against jsdom, happy-dom, or a real browser without caring which.
 *
 * The recurring theme in the failure messages is that an assertion which cannot be
 * answered must say so rather than pass. jsdom has no layout engine and does not evaluate
 * `:focus-visible`; measurements that depend on either raise an `EnvironmentError` naming
 * the runner change that would fix it. A green test that guards nothing is worse than a
 * red one, because nobody ever looks at it again.
 */

export {
  type AccessibleNameResult,
  type AccessibleNameSource,
  accessibleName,
  computeAccessibleName,
} from './accessible-name.js'
export {
  type BackgroundLayer,
  type ContrastKind,
  type ContrastMeasurement,
  type ContrastOptions,
  describeMeasurement,
  isLargeText,
  measureContrast,
  resolveBackdrop,
  suggestForeground,
} from './contrast.js'
export { alphaOf, compositeOver, formatColour, parseCssColour } from './css-colour.js'
export {
  ancestorChain,
  type ComputedStyleLike,
  computedStyle,
  type DomRectLike,
  describeElement,
  EnvironmentError,
  type FocusableTestElement,
  isDisplayed,
  parseFontWeight,
  parsePx,
  parseTimeMs,
  type StyleWindowLike,
  styleValue,
  type TestDocument,
  type TestElement,
  toArray,
  viewFor,
} from './dom.js'

export {
  assertFocusOrderMatchesVisualOrder,
  compareFocusOrder,
  type FocusIndicatorOptions,
  type FocusIndicatorReport,
  type FocusOrderComparison,
  type FocusOrderMismatch,
  type FocusOrderOptions,
  type FocusStop,
  formatFocusOrder,
  getFocusOrder,
  getVisualOrder,
  type IndicatorChange,
  inspectFocusIndicator,
} from './focus.js'
export type {
  ContractSubject,
  MatcherContext,
  MatcherFunction,
  MatcherResult,
  VishwakarmaAssertions,
} from './matcher-types.js'
export {
  toHaveAccessibleName,
  toHaveFocusOrderMatchingVisualOrder,
  toHaveMinimumTouchTarget,
  toHaveVisibleFocusIndicator,
  toMeetContrast,
  toSatisfyContract,
  toUseOnlyTokenValues,
  vishwakarmaMatchers,
} from './matchers.js'
export {
  DEFAULT_MEDIA_ENVIRONMENT,
  evaluateMediaQuery,
  type MatchMediaHost,
  type MatchMediaMock,
  type MediaEnvironment,
  type MediaQueryChangeEvent,
  type MediaQueryListLike,
  mockMatchMedia,
  mockReducedMotion,
} from './media.js'
export { formatContractReport, type ObserveOptions, observeElement } from './observe.js'
export {
  checkTokenScale,
  checkTokenScaleDeep,
  DURATION_PROPERTIES,
  RADIUS_PROPERTIES,
  SPACING_PROPERTIES,
  type TokenScale,
  type TokenViolation,
  tokenScalesFromContract,
} from './tokens.js'
export {
  describeTouchTargetFailure,
  measureTouchTarget,
  type TouchTargetMeasurement,
  type TouchTargetOptions,
} from './touch-target.js'
export {
  applyViewport,
  describeViewport,
  viewportEnvironment,
  viewportProfiles,
} from './viewport-profiles.js'
