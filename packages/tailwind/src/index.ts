// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/tailwind
 *
 * The Tailwind CSS v4 preset. Tailwind v4 is configured in CSS rather than in JavaScript, so
 * a "preset" here is not an object to be merged — it is a stylesheet: an `@theme` block that
 * maps tokens into Tailwind's namespaces, a set of `@utility` definitions for the patterns
 * this project refuses to re-decide per component, and a set of `@custom-variant`
 * definitions for the contexts people most often get wrong.
 *
 * Everything is pure: a token set in, a string out. No filesystem access and no Tailwind
 * import at runtime, so the same functions run in a build script, in a test that asserts on
 * the generated CSS, and in an agent asked what a token set would look like as a theme.
 *
 * Two things to read before using it. {@link importOrderNote} explains the import sequence
 * and exactly what breaks in each wrong order, none of which produces an error message.
 * {@link checkCoverage} reports tokens that reach no Tailwind namespace, which is the single
 * most common cause of a theme that appears not to work — the variable is right there in
 * devtools and the class simply does not exist.
 */

export {
  assertCoverage,
  type CoverageOptions,
  type CoverageReport,
  type CoverageStatus,
  type CoverageWarning,
  type CoverageWarningKind,
  checkCoverage,
  formatCoverage,
  type TokenCoverage,
} from './coverage.js'
export {
  COMMENT_WIDTH,
  commentBlock,
  divider,
  indent,
  joinSections,
  note,
  safeCommentText,
  wrapText,
} from './format.js'
export {
  mapTokenPath,
  NAMESPACE_RULES,
  NAMESPACE_UTILITIES,
  type NamespaceOverride,
  type NamespaceRule,
  type TailwindNamespace,
  type TokenMapping,
  toVariableSegment,
} from './namespaces.js'
export { buildPreset, importOrderNote, type PresetOptions } from './preset.js'
export {
  fallbackRef,
  firstAvailableRef,
  type NamingOptions,
  runtimeName,
  runtimeRef,
  tokenIndex,
} from './refs.js'
export {
  buildSystemBlock,
  type SystemOptions,
  type SystemVariables,
  systemVariables,
} from './system.js'
export { buildThemeBlock, type ThemeOptions } from './theme.js'
export {
  buildUtilities,
  UTILITY_NAMES,
  type UtilityName,
  type UtilityOptions,
} from './utilities.js'
export { buildVariants, VARIANT_NAMES, type VariantName, type VariantOptions } from './variants.js'
