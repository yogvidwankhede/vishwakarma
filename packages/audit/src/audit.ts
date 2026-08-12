// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Running the contract over a project.
 *
 * The contract checker in `@vishwakarma/core` is pure and positionless: it takes a bag of
 * numbers and returns violations. That is the right shape for it, because the same checker
 * has to serve a live DOM audit and an agent's self-review as well as this one. It does
 * mean that this module owns the part the checker deliberately does not do — tying each
 * violation back to the line of source that caused it.
 *
 * The tie-back is done by consuming evidence from a pool per category, matching on the
 * violated value and taking each piece of evidence at most once. That last detail is what
 * makes repeated values work: a file with `p-[13px]` on three lines produces three
 * violations, and without consumption all three would point at the first line, which is
 * both unhelpful and quietly wrong about how much work there is to do.
 *
 * Where a violation has no positional evidence — "too many distinct font sizes in one
 * view" is a property of the file, not of a line — it is reported against the file with no
 * line, rather than being pinned to an arbitrary one.
 */

import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import {
  checkContract,
  type DesignContract,
  type Observation,
  type Severity,
  type Violation,
} from '@vishwakarma/core'
import fg from 'fast-glob'
import {
  type Evidence,
  type EvidenceKind,
  type ExtractOptions,
  extractFromSource,
  type Unresolved,
} from './extract.js'
import { STATIC_ANALYSIS_LIMITS } from './limits.js'
import { type Suppression, suppressionCovers } from './suppressions.js'

/* -------------------------------------------------------------------------- */
/* Report shapes                                                               */
/* -------------------------------------------------------------------------- */

/** A contract violation that has been traced back to a place in the source. */
export interface LocatedViolation extends Violation {
  /**
   * The source line the violation was traced to, trimmed. Absent when the violation is a
   * property of the whole file rather than of one line.
   */
  excerpt?: string
}

/** Counts shared by the file and project reports. */
export interface AuditSummary {
  errors: number
  warnings: number
  suggestions: number
  /** How many individual values the contract actually tested. */
  checked: number
  /** Violations removed by a suppression comment. */
  suppressed: number
}

/** The result of auditing one file. */
export interface FileAuditReport {
  file: string
  passed: boolean
  /** 0..100, computed the same way the core checker computes it. */
  score: number
  violations: LocatedViolation[]
  /** Violations that were found and then suppressed, kept so they can be reviewed. */
  suppressedViolations: LocatedViolation[]
  suppressions: Suppression[]
  unresolved: Unresolved[]
  observation: Observation
  summary: AuditSummary
}

/** The result of auditing a set of files. */
export interface ProjectAuditReport {
  contract: { id: string; name: string; version: string }
  /** Directory the globs were resolved against. */
  root: string
  files: FileAuditReport[]
  /** Every surviving violation across every file, in file order. */
  violations: LocatedViolation[]
  /** Files matched but not read, with the reason. */
  skipped: Array<{ file: string; reason: string }>
  /** Every suppression encountered, so the total is visible rather than buried in diffs. */
  suppressions: Suppression[]
  /** Counts of what the extractor deliberately refused to resolve, by kind. */
  blindSpots: Record<string, number>
  summary: AuditSummary
  /** Violation counts per rule id, highest first when iterated after `sortRuleCounts`. */
  ruleCounts: Record<string, number>
  passed: boolean
  score: number
  durationMs: number
  /** The standing caveats, carried with the data so no format can omit them. */
  limits: readonly string[]
}

/** Options for {@link auditProject}. */
export interface AuditOptions extends ExtractOptions {
  /** Directory the globs are resolved against. Defaults to the process working directory. */
  cwd?: string
  /** Additional ignore patterns, merged with {@link DEFAULT_IGNORE}. */
  ignore?: string[]
  /** Replace the default ignore list entirely rather than adding to it. */
  replaceIgnore?: boolean
  /**
   * Skip files larger than this, in bytes. Generated bundles and vendored stylesheets match
   * innocent-looking globs surprisingly often, and scanning a 4MB minified file produces
   * thousands of findings about code nobody wrote.
   */
  maxFileBytes?: number
  /** How many files to read at once. */
  concurrency?: number
}

/**
 * Directories excluded unless the caller says otherwise.
 *
 * Build output is the important one. `dist` contains the same source compiled, so auditing
 * it double-counts every violation and attributes them to files nobody can fix.
 */
export const DEFAULT_IGNORE: readonly string[] = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/coverage/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.d.ts',
]

/* -------------------------------------------------------------------------- */
/* Rule metadata                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Which category of evidence explains each contract rule.
 *
 * Kept as an explicit table rather than derived from the rule-id prefix, because the
 * mapping is not one-to-one: `typography/off-weight` is explained by weight evidence and
 * `typography/off-scale` by size evidence, and both begin with `typography/`.
 */
const RULE_EVIDENCE: Record<string, EvidenceKind> = {
  'spacing/off-grid': 'spacing',
  'spacing/off-scale': 'spacing',
  'typography/off-scale': 'font-size',
  'typography/too-small': 'font-size',
  'typography/off-weight': 'font-weight',
  'layout/off-radius': 'radius',
  'motion/too-long': 'duration',
  'motion/off-scale': 'duration',
  'motion/layout-animation': 'animated-property',
  'motion/missing-reduced-motion': 'animated-property',
  'colour/raw-literal': 'raw-colour',
  'a11y/heading-skip': 'heading',
  'a11y/missing-name': 'missing-name',
}

/** Rules this package raises itself, about the audit rather than about the design. */
export const AUDIT_RULES = {
  suppressionWithoutReason: 'audit/suppression-without-reason',
  unusedSuppression: 'audit/unused-suppression',
} as const

/**
 * Severity weights, mirroring the core checker.
 *
 * Duplicated rather than imported because the core module keeps them private. If the two
 * ever diverge, per-file and project scores would stop being comparable, which is the one
 * thing a trend line must not do — so this constant is a deliberate coupling, not an
 * oversight.
 */
const SEVERITY_WEIGHT: Record<Severity, number> = { error: 10, warning: 3, suggestion: 1 }

/* -------------------------------------------------------------------------- */
/* Single file                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Audit one file's source text against a contract.
 *
 * Exposed separately from {@link auditProject} so an editor integration or a code-review
 * agent can check a buffer that has not been saved, which is where the finding is cheapest
 * to act on.
 */
export function auditSource(
  code: string,
  filename: string,
  contract: DesignContract,
  options: ExtractOptions = {},
): FileAuditReport {
  const extraction = extractFromSource(code, filename, options)
  const report = checkContract(contract, extraction.observation)

  const located = locateViolations(filename, report.violations, extraction.evidence, code)
  const auditViolations = checkSuppressionHygiene(contract, extraction.suppressions, filename)

  const kept: LocatedViolation[] = []
  const suppressed: LocatedViolation[] = []

  for (const violation of located) {
    const suppression = extraction.suppressions.find((candidate) =>
      suppressionCovers(candidate, violation.rule, violation.location?.line),
    )
    if (suppression) {
      suppression.used++
      suppressed.push(violation)
    } else {
      kept.push(violation)
    }
  }

  // Reported after the pass so that a suppression only counts as unused once we know
  // nothing matched it. An unused suppression is usually a rule that has since been fixed,
  // and leaving it in place means the next regression passes silently.
  for (const suppression of extraction.suppressions) {
    if (suppression.reason === null || suppression.used > 0) continue
    const severity = severityFor(contract, AUDIT_RULES.unusedSuppression, 'warning')
    if (severity === null) continue
    auditViolations.push({
      rule: AUDIT_RULES.unusedSuppression,
      severity,
      message: `Suppression for ${suppression.rules.join(', ')} matched nothing.`,
      location: { file: filename, line: suppression.line },
      fix: 'Remove the comment. The rule it silenced no longer fires here.',
    })
  }

  const violations = [...kept, ...auditViolations]

  return {
    file: filename,
    passed: violations.every((violation) => violation.severity !== 'error'),
    score: scoreOf(violations, report.summary.checked),
    violations,
    suppressedViolations: suppressed,
    suppressions: extraction.suppressions,
    unresolved: extraction.unresolved,
    observation: extraction.observation,
    summary: summarise(violations, report.summary.checked, suppressed.length),
  }
}

/** Resolve a rule's severity, or `null` when the contract switches the rule off entirely. */
function severityFor(contract: DesignContract, rule: string, fallback: Severity): Severity | null {
  if ((contract.disabled ?? []).some((entry) => entry.rule === rule)) return null
  return contract.severityOverrides?.[rule] ?? fallback
}

/**
 * A suppression with no stated reason is itself a violation.
 *
 * This is the mechanism that keeps suppressions honest. Because an unreasoned suppression
 * also suppresses nothing, adding one makes the report strictly worse than not adding one,
 * and the only way out is to write the sentence explaining the exception.
 */
function checkSuppressionHygiene(
  contract: DesignContract,
  suppressions: Suppression[],
  file: string,
): LocatedViolation[] {
  const severity = severityFor(contract, AUDIT_RULES.suppressionWithoutReason, 'error')
  if (severity === null) return []

  return suppressions
    .filter((suppression) => suppression.reason === null)
    .map((suppression) => ({
      rule: AUDIT_RULES.suppressionWithoutReason,
      severity,
      message: 'Suppression comment has no reason, so it has been ignored.',
      location: { file, line: suppression.line },
      fix: `Write "vishwakarma-disable-next-line ${suppression.rules.join(' ')} -- why this case is different".`,
    }))
}

/**
 * Attach source positions to the checker's positionless violations.
 *
 * See the module note for why evidence is consumed rather than merely searched.
 */
function locateViolations(
  file: string,
  violations: Violation[],
  evidence: Evidence[],
  code: string,
): LocatedViolation[] {
  const pools = new Map<EvidenceKind, Evidence[]>()
  for (const item of evidence) {
    const pool = pools.get(item.kind)
    if (pool) pool.push(item)
    else pools.set(item.kind, [item])
  }

  return violations.map((violation) => {
    const kind = RULE_EVIDENCE[violation.rule]
    const pool = kind === undefined ? undefined : pools.get(kind)

    if (!pool || pool.length === 0) {
      return { ...violation, location: { ...violation.location, file } }
    }

    const wanted = wantedValue(violation)
    const index = pool.findIndex((item) => wanted === null || valuesMatch(item.value, wanted))
    if (index === -1) {
      return { ...violation, location: { ...violation.location, file } }
    }

    const [match] = pool.splice(index, 1)
    if (!match) return { ...violation, location: { ...violation.location, file } }

    return {
      ...violation,
      location: { ...violation.location, file, line: match.line },
      excerpt: match.text.length > 0 ? match.text : lineFallback(code, match.offset),
    }
  })
}

function lineFallback(code: string, offset: number): string {
  return code.slice(offset, offset + 60).split('\n')[0] ?? ''
}

/**
 * The value a violation is about, as a comparable string.
 *
 * Heading-order violations are special: their `actual` reads `h2 → h4`, and the heading
 * that needs pointing at is the second one, because that is the element whose level is
 * wrong.
 */
function wantedValue(violation: Violation): string | null {
  if (violation.rule === 'a11y/heading-skip') {
    const target = /h(\d)\s*$/.exec(String(violation.actual ?? ''))
    return target?.[1] ?? null
  }
  if (violation.actual === undefined) return null
  return String(violation.actual)
}

/** Compare an evidence value with a violation's reported value, numerically when possible. */
function valuesMatch(value: string | number, wanted: string): boolean {
  const cleaned = wanted.replace(/(px|rem|ms|s)$/i, '').trim()
  const left = Number(value)
  const right = Number(cleaned)
  if (Number.isFinite(left) && Number.isFinite(right)) return left === right
  return String(value) === wanted
}

function summarise(violations: Violation[], checked: number, suppressed: number): AuditSummary {
  return {
    errors: violations.filter((violation) => violation.severity === 'error').length,
    warnings: violations.filter((violation) => violation.severity === 'warning').length,
    suggestions: violations.filter((violation) => violation.severity === 'suggestion').length,
    checked,
    suppressed,
  }
}

function scoreOf(violations: Violation[], checked: number): number {
  const penalty = violations.reduce(
    (sum, violation) => sum + SEVERITY_WEIGHT[violation.severity],
    0,
  )
  const surface = Math.max(checked, 1) * 2
  return Math.round((surface / (surface + penalty)) * 100)
}

/* -------------------------------------------------------------------------- */
/* Project                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Walk a set of globs and audit every file against the contract.
 *
 * File paths in the report are relative to `cwd`, which is what CI annotation formats
 * expect and what a developer can paste into an editor. Reading is bounded by
 * `concurrency` rather than issued all at once: a repository-wide glob can match tens of
 * thousands of files, and an unbounded `Promise.all` over that exhausts the file descriptor
 * table long before it exhausts memory.
 */
export async function auditProject(
  globs: string[],
  contract: DesignContract,
  options: AuditOptions = {},
): Promise<ProjectAuditReport> {
  const startedAt = Date.now()
  const cwd = options.cwd ?? process.cwd()
  const maxFileBytes = options.maxFileBytes ?? 1_000_000
  const concurrency = Math.max(1, options.concurrency ?? 16)

  const ignore = options.replaceIgnore
    ? (options.ignore ?? [])
    : [...DEFAULT_IGNORE, ...(options.ignore ?? [])]

  const matched = await fg(globs, {
    cwd,
    ignore,
    onlyFiles: true,
    absolute: false,
    dot: false,
    followSymbolicLinks: false,
    // Sorted so that a report diffed between two runs shows real changes rather than
    // filesystem ordering noise.
    unique: true,
  })
  matched.sort()

  const files: FileAuditReport[] = []
  const skipped: Array<{ file: string; reason: string }> = []

  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, matched.length) }, async () => {
    while (cursor < matched.length) {
      const index = cursor++
      const relative = matched[index]
      if (relative === undefined) continue

      // fast-glob reports posix-separated relative paths on every platform; `join` is what
      // turns those back into something the filesystem will accept on Windows.
      const absolute = join(cwd, relative)
      try {
        const info = await stat(absolute)
        if (info.size > maxFileBytes) {
          skipped.push({ file: relative, reason: `larger than ${maxFileBytes} bytes` })
          continue
        }
        const code = await readFile(absolute, 'utf8')
        files.push(auditSource(code, relative, contract, options))
      } catch (error) {
        skipped.push({
          file: relative,
          reason: error instanceof Error ? error.message : 'unreadable',
        })
      }
    }
  })

  await Promise.all(workers)

  // The workers finish out of order; sorting restores the deterministic report.
  files.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))
  skipped.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))

  return summariseProject(files, skipped, contract, cwd, Date.now() - startedAt)
}

/**
 * Fold per-file reports into a project report.
 *
 * Separated from the walk so that callers with their own file source — a git diff, an
 * in-memory virtual filesystem, a language server — can reuse the aggregation without
 * pretending to have a directory.
 */
export function summariseProject(
  files: FileAuditReport[],
  skipped: Array<{ file: string; reason: string }>,
  contract: DesignContract,
  root: string,
  durationMs = 0,
): ProjectAuditReport {
  const violations = files.flatMap((file) => file.violations)
  const suppressions = files.flatMap((file) => file.suppressions)

  const blindSpots: Record<string, number> = {}
  for (const file of files) {
    for (const item of file.unresolved) {
      blindSpots[item.kind] = (blindSpots[item.kind] ?? 0) + 1
    }
  }

  const ruleCounts: Record<string, number> = {}
  for (const violation of violations) {
    ruleCounts[violation.rule] = (ruleCounts[violation.rule] ?? 0) + 1
  }

  const checked = files.reduce((sum, file) => sum + file.summary.checked, 0)
  const suppressed = files.reduce((sum, file) => sum + file.summary.suppressed, 0)
  const summary = summarise(violations, checked, suppressed)

  return {
    contract: { id: contract.id, name: contract.name, version: contract.version },
    root,
    files,
    violations,
    skipped,
    suppressions,
    blindSpots,
    summary,
    ruleCounts,
    passed: summary.errors === 0,
    score: scoreOf(violations, checked),
    durationMs,
    limits: STATIC_ANALYSIS_LIMITS,
  }
}
