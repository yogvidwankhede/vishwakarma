/**
 * Suppression comments, with a reason made compulsory.
 *
 * Every rule in a design contract will eventually be wrong about some specific line, so a
 * suppression mechanism is not optional — without one, teams disable the whole auditor the
 * first time it blocks a legitimate exception. But the usual mechanism has a failure mode
 * that is worse than the problem it solves: bare disable comments accumulate. They are
 * cheap to add, invisible afterwards, and nobody can tell six months later whether a given
 * one records a deliberate decision or a Friday afternoon.
 *
 * Two rules make that unlikely. A suppression must state a reason, and a suppression with
 * no reason suppresses nothing — it is reported as an error in its own right, so the
 * shortest path for the author is to write the reason rather than to delete the code that
 * would have failed. And every suppression that *is* honoured appears in the report
 * summary, so the total is a number the team watches rather than a debt hidden in diffs.
 *
 * The syntax is deliberately one line and one form:
 *
 * ```
 * // vishwakarma-disable-next-line spacing/off-grid -- optical alignment with the icon glyph
 * ```
 */

import { createLocator } from './locate.js'

/** A parsed suppression comment. */
export interface Suppression {
  /** File the comment appeared in. */
  file: string
  /** One-based line of the comment itself. */
  line: number
  /** One-based line the comment applies to, which is always the following one. */
  targetLine: number
  /** Rule ids named by the comment. A single `*` means every rule on that line. */
  rules: string[]
  /** The stated justification, or `null` when the author gave none. */
  reason: string | null
  /** How many violations this suppression actually removed. Filled in during the audit. */
  used: number
}

const DIRECTIVE = /vishwakarma-disable-next-line\b([^\n]*)/g

/**
 * Find every suppression comment in a source file.
 *
 * The scan is textual and does not check that the directive is inside a comment. A string
 * literal containing the directive would therefore be honoured, which is a real if
 * unlikely false negative; the alternative is tokenising four languages to prove a point
 * about a case that has never occurred in practice.
 */
export function parseSuppressions(code: string, file: string): Suppression[] {
  const locator = createLocator(code)
  const found: Suppression[] = []

  DIRECTIVE.lastIndex = 0
  let match: RegExpExecArray | null = DIRECTIVE.exec(code)
  while (match !== null) {
    const tail = match[1] ?? ''
    const { line } = locator(match.index)

    // Trim the comment's own closing punctuation before looking for the reason, so that
    // `{/* … -- because */}` does not end up with a reason of "because */}".
    const cleaned = tail.replace(/\*\/\s*\}?\s*$/, '').trimEnd()
    const separator = cleaned.indexOf('--')

    const ruleText = (separator === -1 ? cleaned : cleaned.slice(0, separator)).trim()
    const reasonText = separator === -1 ? '' : cleaned.slice(separator + 2).trim()

    const rules = ruleText
      .split(/[\s,]+/)
      .map((rule) => rule.trim())
      .filter((rule) => rule.length > 0)

    found.push({
      file,
      line,
      targetLine: line + 1,
      rules: rules.length > 0 ? rules : ['*'],
      reason: reasonText.length > 0 ? reasonText : null,
      used: 0,
    })

    match = DIRECTIVE.exec(code)
  }

  return found
}

/** Whether a suppression covers a particular rule on a particular line. */
export function suppressionCovers(
  suppression: Suppression,
  rule: string,
  line: number | undefined,
): boolean {
  // An unreasoned suppression is inert by design. See the module note.
  if (suppression.reason === null) return false
  if (line === undefined || line !== suppression.targetLine) return false
  return suppression.rules.some((named) => named === '*' || named === rule)
}
