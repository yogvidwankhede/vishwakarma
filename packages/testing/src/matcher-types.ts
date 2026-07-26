// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Matcher types, described structurally so that no test framework is a dependency.
 *
 * This package deliberately does not depend on Vitest, Jest, or anything else that owns an
 * `expect`. A test-utility package that hard-depends on one runner is unusable from the
 * other, and worse, it drags a second copy of that runner into the dependency graph of
 * every consumer who already has one — which is how two incompatible versions of the same
 * matcher registry end up installed and only one of them receives your `extend` call.
 *
 * The shapes below are the intersection of what Vitest and Jest both accept. Because the
 * matchers are declared with method syntax, the `this` and parameter positions are checked
 * bivariantly, so a runner whose own `MatcherState` is richer than {@link MatcherContext}
 * still accepts these functions. Consumers wire the type side up themselves with a module
 * augmentation; {@link VishwakarmaAssertions} is the interface to merge in, and the
 * package README shows the four lines it takes.
 */

import type { DesignContract, Observation } from '@vishwakarma/core'
import type { ContrastOptions } from './contrast.js'
import type { FocusIndicatorOptions, FocusOrderOptions } from './focus.js'
import type { ObserveOptions } from './observe.js'
import type { TokenScale } from './tokens.js'
import type { TouchTargetOptions } from './touch-target.js'

/** What a matcher returns. `message` is a thunk because building it is only worth it on failure. */
export interface MatcherResult {
  pass: boolean
  message: () => string
  /** Optional, and shown by some runners in a diff. */
  actual?: unknown
  expected?: unknown
}

/**
 * The slice of the runner's matcher state these matchers read.
 *
 * Only `isNot` — every field added here is a field the consumer's runner must also have,
 * and `utils`, `equals` and `promise` differ between runners in ways that would make this
 * interface a compatibility liability for no benefit.
 */
export interface MatcherContext {
  readonly isNot?: boolean
}

/** A matcher function as a runner will call it. */
export type MatcherFunction<Args extends unknown[] = unknown[]> = (
  this: MatcherContext,
  received: unknown,
  ...args: Args
) => MatcherResult

/**
 * The assertions this package adds, for module augmentation.
 *
 * ```ts
 * // vitest.setup.ts
 * import { expect } from 'vitest'
 * import { vishwakarmaMatchers, type VishwakarmaAssertions } from '@vishwakarma/testing'
 *
 * expect.extend(vishwakarmaMatchers)
 *
 * declare module 'vitest' {
 *   interface Matchers<T = unknown> extends VishwakarmaAssertions<T> {}
 * }
 * ```
 */
export interface VishwakarmaAssertions<R = unknown> {
  /**
   * Assert that an element's text meets a contrast ratio.
   *
   * With no argument the required ratio is derived from the element's own computed font
   * size and weight, which is the right default: hard-coding 4.5 across a suite quietly
   * over-tests large headings and under-tests nothing, but it stops being true the moment
   * a heading is restyled.
   */
  toMeetContrast(ratio?: number | ContrastOptions): R
  /** Assert that an element has a non-empty accessible name, optionally matching a value. */
  toHaveAccessibleName(expected?: string | RegExp): R
  /** Assert that an interactive element's hit area reaches a minimum size. */
  toHaveMinimumTouchTarget(px?: number, options?: TouchTargetOptions): R
  /** Assert that focusing the element visibly changes its appearance. */
  toHaveVisibleFocusIndicator(options?: FocusIndicatorOptions): R
  /** Assert that a rendered subtree, or a prepared Observation, satisfies a Design Contract. */
  toSatisfyContract(contract: DesignContract, options?: ObserveOptions): R
  /** Assert that every computed value in a subtree comes from a declared token scale. */
  toUseOnlyTokenValues(scale: TokenScale | TokenScale[], options?: { deep?: boolean }): R
  /** Assert that the tab sequence inside a container follows its reading order. */
  toHaveFocusOrderMatchingVisualOrder(options?: FocusOrderOptions): R
}

/** The value `toSatisfyContract` accepts: a rendered element, or an observation of one. */
export type ContractSubject = Observation | { getBoundingClientRect: unknown }
