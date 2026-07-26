// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Referring to the runtime token variables from generated CSS.
 *
 * Everything this package emits points at the custom properties produced by
 * `@vishwakarma/tokens` rather than at literal values, and the reason is worth being
 * explicit about because it is the whole basis of runtime theming. A literal baked into a
 * utility cannot change when `[data-theme]` changes; a `var()` can, because `var()` is
 * resolved per element at computed-value time rather than once at build time.
 *
 * The corollary is that the token stylesheet is a hard runtime dependency of the generated
 * preset, and its absence fails in an unusually confusing way. `var(--vk-color-text-primary)`
 * with no such property is *invalid at computed-value time*: the declaration is not ignored,
 * it is replaced by the inherited value for inherited properties and the initial value for
 * everything else. Text therefore inherits from an ancestor and looks vaguely right, while
 * backgrounds fall back to transparent and borders to `currentColor`. The page looks broken
 * in a way that points nowhere near a missing import, which is why {@link fallbackRef}
 * exists for every variable a consumer might reasonably not have.
 */

import type { TokenSet } from '@vishwakarma/tokens'
import { toCssVariableName } from '@vishwakarma/tokens'

/** Options shared by every generator in the package. */
export interface NamingOptions {
  /**
   * Prefix on the runtime token variables, matching whatever the token build used.
   *
   * If this disagrees with the token stylesheet, every generated `var()` points at a
   * property that does not exist and the failure mode above applies to the entire theme at
   * once. It is the first thing to check when a preset produces a colourless page.
   */
  prefix?: string
}

/** The set of paths a token set defines, for cheap existence checks. */
export function tokenIndex(set: TokenSet): ReadonlySet<string> {
  return new Set(set.tokens.map((token) => token.path))
}

/** `--vk-color-surface-raised` for `color.surface.raised`. */
export function runtimeName(path: string, options: NamingOptions = {}): string {
  return toCssVariableName(path, options.prefix === undefined ? {} : { prefix: options.prefix })
}

/** `var(--vk-color-surface-raised)`. */
export function runtimeRef(path: string, options: NamingOptions = {}): string {
  return `var(${runtimeName(path, options)})`
}

/**
 * A reference that survives the token being absent.
 *
 * Custom token sets are allowed to omit anything, and a preset that assumes the default set
 * exists would emit dangling references for the rest. The `var(--x, fallback)` form costs
 * nothing and turns a silent breakage into a slightly-off colour, which is a much better
 * place to be debugging from.
 */
export function fallbackRef(path: string, fallback: string, options: NamingOptions = {}): string {
  return `var(${runtimeName(path, options)}, ${fallback})`
}

/**
 * Prefer the first token that exists, else the literal fallback.
 *
 * Used where several token sets spell the same idea differently — `color.surface.raised`
 * versus `color.background.raised` — and we would rather resolve it at generation time than
 * emit a chain of nested `var()` fallbacks nobody can read in devtools.
 */
export function firstAvailableRef(
  index: ReadonlySet<string>,
  paths: readonly string[],
  fallback: string,
  options: NamingOptions = {},
): string {
  for (const path of paths) {
    if (index.has(path)) return runtimeRef(path, options)
  }
  return fallback
}
