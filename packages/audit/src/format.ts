/**
 * Turning a report into something a person or a machine will actually act on.
 *
 * Four formats, because the same data has four genuinely different audiences. A developer
 * at a terminal wants the file, the line and the fix, tightly packed. A dashboard wants
 * stable JSON. A pull-request description wants Markdown. And CI wants workflow commands,
 * which is the only one of the four that changes behaviour rather than merely reading
 * nicely: an annotation appears against the offending line in the diff, where the person
 * who wrote it is already looking. A violation that a reviewer has to go and find in a log
 * is a violation that gets merged.
 *
 * Every format carries the caveats from `limits.ts`. That is not politeness. A report that
 * says "no violations" without saying what it could not see invites exactly the wrong
 * conclusion, and the formats are the last place that message can be attached before the
 * data reaches a human.
 */

import type { Severity } from '@vishwakarma/core'
import type { LocatedViolation, ProjectAuditReport } from './audit.js'
import { LIMITS_SUMMARY } from './limits.js'

/** Supported output formats. */
export type ReportFormat = 'text' | 'json' | 'markdown' | 'github'

export interface FormatOptions {
  format?: ReportFormat
  /**
   * Emit ANSI colour. Off by default and never auto-detected, because this package has no
   * business inspecting the caller's stdout — a CLI knows whether it is attached to a
   * terminal and this function does not.
   */
  colour?: boolean
  /** Cap the violations listed per file. The remainder is counted, not hidden. */
  maxPerFile?: number
  /**
   * Prefix joined onto every file path. Needed when the audit ran in a subdirectory: a
   * GitHub annotation whose path is not relative to the repository root is silently
   * dropped, with no error anywhere to explain why nothing appeared on the pull request.
   */
  pathPrefix?: string
  /** Include the standing limits. Defaults to true; turn it off only in nested output. */
  includeLimits?: boolean
  /** Cap on emitted annotations in the `github` format. */
  maxAnnotations?: number
}

/** Format a project report for the requested audience. */
export function formatReport(report: ProjectAuditReport, options: FormatOptions = {}): string {
  switch (options.format ?? 'text') {
    case 'json':
      return formatJson(report)
    case 'markdown':
      return formatMarkdown(report, options)
    case 'github':
      return formatGithub(report, options)
    default:
      return formatText(report, options)
  }
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

const ANSI: Record<string, string> = {
  reset: '\u001b[0m',
  dim: '\u001b[2m',
  bold: '\u001b[1m',
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  green: '\u001b[32m',
}

const SEVERITY_COLOUR: Record<Severity, string> = { error: 'red', warning: 'yellow', suggestion: 'blue' }

function paint(text: string, colour: string, enabled: boolean): string {
  if (!enabled) return text
  const code = ANSI[colour]
  return code === undefined ? text : `${code}${text}${ANSI['reset'] ?? ''}`
}

function withPrefix(file: string | undefined, prefix: string | undefined): string {
  const path = file ?? '(unknown file)'
  if (!prefix) return path
  return `${prefix.replace(/\/+$/, '')}/${path.replace(/^\.?\//, '')}`
}

function groupByFile(violations: LocatedViolation[]): Map<string, LocatedViolation[]> {
  const grouped = new Map<string, LocatedViolation[]>()
  for (const violation of violations) {
    const file = violation.location?.file ?? '(unknown file)'
    const bucket = grouped.get(file)
    if (bucket) bucket.push(violation)
    else grouped.set(file, [violation])
  }
  for (const bucket of grouped.values()) {
    bucket.sort((a, b) => (a.location?.line ?? 0) - (b.location?.line ?? 0))
  }
  return grouped
}

function countBlindSpots(report: ProjectAuditReport): number {
  return Object.values(report.blindSpots).reduce((sum, count) => sum + count, 0)
}

/** `1 file`, `2 files`. Cheap, and its absence is the first thing a reader notices. */
function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

/* -------------------------------------------------------------------------- */
/* Text                                                                        */
/* -------------------------------------------------------------------------- */

function formatText(report: ProjectAuditReport, options: FormatOptions): string {
  const colour = options.colour ?? false
  const lines: string[] = []
  const grouped = groupByFile(report.violations)

  for (const [file, violations] of grouped) {
    lines.push(paint(withPrefix(file, options.pathPrefix), 'bold', colour))

    const limit = options.maxPerFile ?? violations.length
    for (const violation of violations.slice(0, limit)) {
      const position = violation.location?.line === undefined ? '—' : String(violation.location.line)
      const severity = paint(
        // Padded past the longest severity name, so the rule column stays aligned and the
        // report can be scanned down rather than read across.
        violation.severity.padEnd(12),
        SEVERITY_COLOUR[violation.severity] ?? 'reset',
        colour,
      )
      lines.push(`  ${position.padStart(5)}  ${severity}${violation.rule}`)
      lines.push(`         ${violation.message}`)
      if (violation.excerpt) {
        lines.push(paint(`         ${violation.excerpt}`, 'dim', colour))
      }
      if (violation.fix) {
        lines.push(paint(`         fix: ${violation.fix}`, 'dim', colour))
      }
    }

    if (violations.length > limit) {
      lines.push(paint(`         … and ${violations.length - limit} more in this file`, 'dim', colour))
    }
    lines.push('')
  }

  if (report.violations.length === 0) {
    lines.push(paint('No violations found.', 'green', colour), '')
  }

  const { errors, warnings, suggestions, checked, suppressed } = report.summary
  lines.push(
    `${plural(report.files.length, 'file')}, ${plural(checked, 'value')} checked in ${report.durationMs}ms`,
    `${errors} errors, ${warnings} warnings, ${suggestions} suggestions — score ${report.score}/100`,
  )

  if (suppressed > 0) {
    lines.push(
      `${plural(suppressed, 'violation')} suppressed by ${plural(report.suppressions.length, 'directive')}`,
    )
    for (const suppression of report.suppressions.filter((item) => item.used > 0)) {
      lines.push(
        paint(
          `  ${withPrefix(suppression.file, options.pathPrefix)}:${suppression.line}  ${suppression.rules.join(', ')} — ${suppression.reason ?? ''}`,
          'dim',
          colour,
        ),
      )
    }
  }

  if (report.skipped.length > 0) {
    lines.push(`${plural(report.skipped.length, 'file')} skipped`)
  }

  if (options.includeLimits ?? true) {
    lines.push('', paint(LIMITS_SUMMARY, 'dim', colour))
    const blind = countBlindSpots(report)
    if (blind > 0) {
      lines.push(
        paint(
          `${plural(blind, 'expression')} could not be resolved statically and ${blind === 1 ? 'was' : 'were'} not judged.`,
          'dim',
          colour,
        ),
      )
    }
    for (const limit of report.limits) {
      lines.push(paint(`  - ${limit}`, 'dim', colour))
    }
  }

  return lines.join('\n')
}

/* -------------------------------------------------------------------------- */
/* JSON                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A stable machine-readable shape.
 *
 * Deliberately not `JSON.stringify(report)`. The report object carries the raw
 * `Observation` for each file, which is an implementation detail of the extractor; putting
 * it on the wire would make every internal change a breaking change for whatever dashboard
 * is consuming this.
 */
function formatJson(report: ProjectAuditReport): string {
  return JSON.stringify(
    {
      contract: report.contract,
      root: report.root,
      passed: report.passed,
      score: report.score,
      durationMs: report.durationMs,
      summary: report.summary,
      ruleCounts: report.ruleCounts,
      blindSpots: report.blindSpots,
      limits: report.limits,
      violations: report.violations.map((violation) => ({
        rule: violation.rule,
        severity: violation.severity,
        message: violation.message,
        file: violation.location?.file,
        line: violation.location?.line,
        actual: violation.actual,
        expected: violation.expected,
        fix: violation.fix,
        excerpt: violation.excerpt,
      })),
      suppressions: report.suppressions.map((suppression) => ({
        file: suppression.file,
        line: suppression.line,
        rules: suppression.rules,
        reason: suppression.reason,
        used: suppression.used,
      })),
      files: report.files.map((file) => ({
        file: file.file,
        passed: file.passed,
        score: file.score,
        summary: file.summary,
      })),
      skipped: report.skipped,
    },
    null,
    2,
  )
}

/* -------------------------------------------------------------------------- */
/* Markdown                                                                    */
/* -------------------------------------------------------------------------- */

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function formatMarkdown(report: ProjectAuditReport, options: FormatOptions): string {
  const lines: string[] = []
  const { errors, warnings, suggestions, checked, suppressed } = report.summary

  lines.push(
    `## Design contract: ${report.contract.name}`,
    '',
    `**${report.passed ? 'Passed' : 'Failed'}** — score ${report.score}/100 across ${plural(report.files.length, 'file')} and ${plural(checked, 'checked value')}.`,
    '',
    '| Severity | Count |',
    '| --- | ---: |',
    `| Errors | ${errors} |`,
    `| Warnings | ${warnings} |`,
    `| Suggestions | ${suggestions} |`,
    `| Suppressed | ${suppressed} |`,
    '',
  )

  const grouped = groupByFile(report.violations)
  for (const [file, violations] of grouped) {
    lines.push(`### \`${withPrefix(file, options.pathPrefix)}\``, '')
    lines.push('| Line | Severity | Rule | Detail |', '| ---: | --- | --- | --- |')

    const limit = options.maxPerFile ?? violations.length
    for (const violation of violations.slice(0, limit)) {
      const detail = violation.fix ? `${violation.message} ${violation.fix}` : violation.message
      lines.push(
        `| ${violation.location?.line ?? ''} | ${violation.severity} | \`${violation.rule}\` | ${escapeCell(detail)} |`,
      )
    }
    if (violations.length > limit) {
      lines.push(`| | | | …and ${violations.length - limit} more |`)
    }
    lines.push('')
  }

  if (report.violations.length === 0) lines.push('No violations found.', '')

  const active = report.suppressions.filter((suppression) => suppression.used > 0)
  if (active.length > 0) {
    // Listed in full rather than counted, because the whole point of demanding a reason is
    // that somebody reads the reasons occasionally.
    lines.push('### Suppressions in force', '', '| File | Line | Rules | Reason |', '| --- | ---: | --- | --- |')
    for (const suppression of active) {
      lines.push(
        `| \`${withPrefix(suppression.file, options.pathPrefix)}\` | ${suppression.line} | ${escapeCell(suppression.rules.join(', '))} | ${escapeCell(suppression.reason ?? '')} |`,
      )
    }
    lines.push('')
  }

  if (options.includeLimits ?? true) {
    lines.push('<details><summary>What this audit could not see</summary>', '')
    const blind = countBlindSpots(report)
    if (blind > 0) {
      lines.push(`${blind} expressions were left unjudged rather than guessed at.`, '')
    }
    for (const limit of report.limits) lines.push(`- ${limit}`)
    lines.push('', '</details>', '')
  }

  return lines.join('\n')
}

/* -------------------------------------------------------------------------- */
/* GitHub Actions                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Escape a workflow-command message.
 *
 * A literal newline inside a command terminates it, so an unescaped multi-line message
 * turns the rest of the text into shell output and the annotation never appears. This is
 * the single most common reason a working auditor produces no annotations at all.
 */
function escapeData(text: string): string {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
}

/** Property values need two more escapes than message bodies, since `,` and `:` delimit. */
function escapeProperty(text: string): string {
  return escapeData(text).replace(/,/g, '%2C').replace(/:/g, '%3A')
}

const ANNOTATION_LEVEL: Record<Severity, string> = {
  error: 'error',
  warning: 'warning',
  suggestion: 'notice',
}

/**
 * Emit GitHub Actions workflow commands, one per violation.
 *
 * Ordered errors first so that the annotations most worth seeing survive GitHub's own
 * per-step display cap, which is around ten of each level. Everything beyond
 * `maxAnnotations` is summarised in a trailing notice rather than dropped silently — a CI
 * step that quietly shows a tenth of the findings is worse than one that shows none,
 * because it looks complete.
 */
function formatGithub(report: ProjectAuditReport, options: FormatOptions): string {
  const order: Record<Severity, number> = { error: 0, warning: 1, suggestion: 2 }
  const sorted = [...report.violations].sort((a, b) => order[a.severity] - order[b.severity])
  const cap = options.maxAnnotations ?? 50
  const lines: string[] = []

  for (const violation of sorted.slice(0, cap)) {
    const properties = [
      `file=${escapeProperty(withPrefix(violation.location?.file, options.pathPrefix))}`,
      `title=${escapeProperty(`${report.contract.name}: ${violation.rule}`)}`,
    ]
    if (violation.location?.line !== undefined) {
      properties.splice(1, 0, `line=${violation.location.line}`)
    }

    const body = violation.fix ? `${violation.message}\n\nFix: ${violation.fix}` : violation.message
    lines.push(
      `::${ANNOTATION_LEVEL[violation.severity]} ${properties.join(',')}::${escapeData(body)}`,
    )
  }

  if (sorted.length > cap) {
    lines.push(`::notice::${escapeData(`${sorted.length - cap} further violations were not annotated. Run the audit locally for the full report.`)}`)
  }

  const { errors, warnings, suggestions, suppressed } = report.summary
  const headline = `${report.contract.name}: ${errors} errors, ${warnings} warnings, ${suggestions} suggestions, ${suppressed} suppressed — score ${report.score}/100`
  lines.push(`::notice::${escapeData(headline)}`)

  if (options.includeLimits ?? true) {
    const blind = countBlindSpots(report)
    const caveat = blind > 0 ? `${LIMITS_SUMMARY} ${blind} expressions were left unjudged.` : LIMITS_SUMMARY
    lines.push(`::notice::${escapeData(caveat)}`)
  }

  return lines.join('\n')
}
