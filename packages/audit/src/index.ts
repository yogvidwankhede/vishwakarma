// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/audit
 *
 * Static auditors that evaluate source text against a Design Contract.
 *
 * The package is Node-only, because it reads files. Everything downstream of reading is
 * pure: {@link extractFromSource} turns text into an `Observation`, the contract checker in
 * `@vishwakarma/core` turns that into violations, and this package puts the line numbers
 * back on and formats the result. Keeping that boundary intact is what lets the same rules
 * run in CI, in an editor, and inside an agent's own review loop without three
 * implementations that slowly disagree.
 *
 * The one thing to keep in mind when reading anything this package produces: it is a lower
 * bound. It reads text, so it sees literal values and nothing else. `limits.ts` says so in
 * every format, and it means it.
 */

export {
  AUDIT_RULES,
  type AuditOptions,
  type AuditSummary,
  auditProject,
  auditSource,
  DEFAULT_IGNORE,
  type FileAuditReport,
  type LocatedViolation,
  type ProjectAuditReport,
  summariseProject,
} from './audit.js'
export {
  type Evidence,
  type EvidenceKind,
  type EvidenceOrigin,
  type ExtractOptions,
  extractFromSource,
  type SourceExtraction,
  type Unresolved,
  type UnresolvedKind,
} from './extract.js'
export {
  type FormatOptions,
  formatReport,
  type ReportFormat,
} from './format.js'
export { LIMITS_SUMMARY, STATIC_ANALYSIS_LIMITS } from './limits.js'
export {
  createLocator,
  type Locator,
  lineTextAt,
  type Position,
} from './locate.js'
export {
  collectStringLiterals,
  escapeRegExp,
  findClosingTag,
  findTagEnd,
  matchDelimiter,
  type StringLiteral,
  skipStringLiteral,
  toCamelCase,
} from './scan.js'
export {
  parseSuppressions,
  type Suppression,
  suppressionCovers,
} from './suppressions.js'
export {
  parseTailwindClass,
  RADIUS_PREFIXES,
  resolveTailwindAnimatedProperties,
  resolveTailwindDurationMs,
  resolveTailwindFontSizeRem,
  resolveTailwindRadiusPx,
  resolveTailwindSpacingPx,
  SPACING_PREFIXES,
  splitUtility,
  TAILWIND_FONT_SIZES_REM,
  TAILWIND_RADII_PX,
  type TailwindTheme,
  type TailwindUtility,
  tokenizeClassList,
} from './tailwind.js'
export {
  DEFAULT_ROOT_FONT_SIZE_PX,
  isRelativeLength,
  lengthToPx,
  lengthToRem,
  pxToRem,
  timeToMs,
  type UnitOptions,
} from './units.js'
