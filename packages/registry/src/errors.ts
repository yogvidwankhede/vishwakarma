// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Errors the registry throws.
 *
 * They are classes rather than plain `Error` with a string code because a CLI, a build
 * plugin and an MCP tool all need to react differently to "you asked for an item that does
 * not exist" and "your registry contains a dependency cycle". Matching on message text is
 * how that goes wrong six months later when someone improves the wording.
 *
 * Every error carries the structured data needed to render a good message *and* the
 * pre-rendered message, so a caller that just prints `error.message` still gets something
 * useful.
 */

/** Base class for everything this package throws. Catch this to catch all of it. */
export class RegistryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RegistryError'
  }
}

/**
 * A registry document failed schema or semantic validation.
 *
 * Carries the full issue list rather than only the first problem. Reporting one error at a
 * time turns fixing a hand-written registry file into a guessing loop; authors want every
 * complaint at once.
 */
export class RegistryValidationError extends RegistryError {
  readonly issues: readonly RegistryIssue[]

  constructor(issues: readonly RegistryIssue[]) {
    super(formatIssues(issues))
    this.name = 'RegistryValidationError'
    this.issues = issues
  }
}

/** A requested item is not in the index. Carries near-miss names for a "did you mean". */
export class UnknownItemError extends RegistryError {
  override readonly name = 'UnknownItemError'
  readonly item: string
  readonly suggestions: readonly string[]

  constructor(item: string, suggestions: readonly string[] = []) {
    super(
      suggestions.length > 0
        ? `Unknown registry item "${item}". Did you mean ${suggestions.map((s) => `"${s}"`).join(', ')}?`
        : `Unknown registry item "${item}".`,
    )
    this.item = item
    this.suggestions = suggestions
  }
}

/**
 * The dependency graph contains a cycle, so no install order exists.
 *
 * The cycle is reported as the actual path that closed it, `a -> b -> c -> a`, because the
 * offending edge is almost never the one the author was thinking about, and a bare "cycle
 * detected" leaves them bisecting the file by hand.
 */
export class CircularDependencyError extends RegistryError {
  override readonly name = 'CircularDependencyError'
  readonly cycle: readonly string[]

  constructor(cycle: readonly string[]) {
    super(`Circular registry dependency: ${cycle.join(' -> ')}`)
    this.cycle = cycle
  }
}

/** A machine-readable code for each class of validation problem. */
export type RegistryIssueCode =
  | 'schema'
  | 'duplicate-item'
  | 'unknown-dependency'
  | 'self-dependency'
  | 'cycle'
  | 'duplicate-target'
  | 'unsafe-path'
  | 'empty-index'

/**
 * One problem found in a registry document.
 *
 * `path` is a dotted location into the document (`items.3.files.0.target`) so an editor can
 * jump to it. `hint` is the sentence that tells the author what to actually do, and it is
 * deliberately separate from `message` so a terse CLI can print one and a verbose one both.
 */
export interface RegistryIssue {
  code: RegistryIssueCode
  path: string
  message: string
  hint?: string
}

/** Render issues as a multi-line report suitable for a terminal. */
export function formatIssues(issues: readonly RegistryIssue[]): string {
  if (issues.length === 0) return 'Registry is valid.'
  const lines = issues.map((issue) => {
    const head = `  ${issue.path || '<root>'}: ${issue.message}`
    return issue.hint ? `${head}\n      ${issue.hint}` : head
  })
  const count = issues.length === 1 ? '1 problem' : `${issues.length} problems`
  return `Registry validation failed (${count}):\n${lines.join('\n')}`
}
