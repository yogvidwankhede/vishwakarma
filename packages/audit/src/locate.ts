/**
 * Turning byte offsets into line and column numbers.
 *
 * Every extractor in this package works on raw text with regular expressions, so what it
 * naturally knows about a finding is a character offset. What a developer needs — and what
 * a GitHub annotation requires — is a line number. Converting one to the other by counting
 * newlines from the start of the file each time is quadratic, and on a large stylesheet
 * with several hundred findings that is genuinely slow enough to notice.
 *
 * So we index the line starts once per file and binary-search them. The cost is one pass
 * over the source regardless of how many findings come out of it.
 */

/** A one-based position in a source file, in the shape editors and CI annotations expect. */
export interface Position {
  /** One-based line number. */
  line: number
  /** One-based column number, counted in UTF-16 code units. */
  column: number
}

/** Resolves a character offset in a particular source string to a {@link Position}. */
export type Locator = (offset: number) => Position

/**
 * Build a {@link Locator} for a source string.
 *
 * Columns are counted in UTF-16 code units rather than grapheme clusters. That is what
 * every editor and every CI annotation format actually means by "column", so matching it
 * is more useful than being technically correct about user-perceived characters.
 */
export function createLocator(source: string): Locator {
  // Offset of the first character of each line. Line 1 starts at 0 by definition.
  const lineStarts: number[] = [0]
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === 10 /* \n */) lineStarts.push(i + 1)
  }

  return (offset: number): Position => {
    const target = Math.max(0, Math.min(offset, source.length))

    let low = 0
    let high = lineStarts.length - 1
    while (low < high) {
      // Bias the midpoint upward, otherwise the loop can stall when high === low + 1.
      const mid = Math.ceil((low + high) / 2)
      const start = lineStarts[mid]
      if (start !== undefined && start <= target) low = mid
      else high = mid - 1
    }

    const start = lineStarts[low] ?? 0
    return { line: low + 1, column: target - start + 1 }
  }
}

/**
 * Extract the trimmed text of the line containing an offset.
 *
 * Used for the excerpt shown next to a violation in the text report. A finding reported as
 * "13px on line 42" makes the reader open the file; the same finding with the offending
 * line beside it usually does not.
 */
export function lineTextAt(source: string, offset: number): string {
  const clamped = Math.max(0, Math.min(offset, source.length))
  const start = source.lastIndexOf('\n', Math.max(0, clamped - 1)) + 1
  const end = source.indexOf('\n', clamped)
  return source.slice(start, end === -1 ? source.length : end).trim()
}
