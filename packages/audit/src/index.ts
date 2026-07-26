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
  type Position,
  type Locator,
  createLocator,
  lineTextAt,
} from './locate.js'

export {
  type UnitOptions,
  DEFAULT_ROOT_FONT_SIZE_PX,
  lengthToPx,
  lengthToRem,
  isRelativeLength,
  timeToMs,
  pxToRem,
} from './units.js'

export {
  type StringLiteral,
  matchDelimiter,
  skipStringLiteral,
  collectStringLiterals,
  findTagEnd,
  findClosingTag,
  toCamelCase,
  escapeRegExp,
} from './scan.js'

export {
  type TailwindUtility,
  type TailwindTheme,
  TAILWIND_FONT_SIZES_REM,
  TAILWIND_RADII_PX,
  SPACING_PREFIXES,
  RADIUS_PREFIXES,
  tokenizeClassList,
  parseTailwindClass,
  splitUtility,
  resolveTailwindSpacingPx,
  resolveTailwindFontSizeRem,
  resolveTailwindRadiusPx,
  resolveTailwindDurationMs,
  resolveTailwindAnimatedProperties,
} from './tailwind.js'

export {
  type Suppression,
  parseSuppressions,
  suppressionCovers,
} from './suppressions.js'

export {
  type EvidenceKind,
  type EvidenceOrigin,
  type Evidence,
  type UnresolvedKind,
  type Unresolved,
  type SourceExtraction,
  type ExtractOptions,
  extractFromSource,
} from './extract.js'

export {
  type LocatedViolation,
  type AuditSummary,
  type FileAuditReport,
  type ProjectAuditReport,
  type AuditOptions,
  DEFAULT_IGNORE,
  AUDIT_RULES,
  auditSource,
  auditProject,
  summariseProject,
} from './audit.js'

export {
  type ReportFormat,
  type FormatOptions,
  formatReport,
} from './format.js'

export { STATIC_ANALYSIS_LIMITS, LIMITS_SUMMARY } from './limits.js'
