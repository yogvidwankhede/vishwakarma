// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Small text scanners shared by the extractors.
 *
 * These exist because the extraction problem is genuinely "find the region between these
 * two delimiters" over and over, and every naive version of that is wrong in the same way:
 * it counts a delimiter that appears inside a string literal. `className={cn("a", ">")}`
 * and `onClick={() => setOpen(x > 1)}` both defeat a scan that looks for the next `>`, and
 * both appear in real components constantly.
 *
 * None of this is a parser. It is deliberately a set of bracket counters that know about
 * quotes, which is enough for the heuristics in this package and cheap enough to run over
 * a whole repository.
 */

/** A string literal found in source, with the offset of its first content character. */
export interface StringLiteral {
  value: string
  /** Offset of the character after the opening quote. */
  offset: number
  /** Whether the literal is a template containing `${…}` interpolation. */
  interpolated: boolean
}

const QUOTES = new Set(['"', "'", '`'])

/**
 * Find the offset just past the region opened at `openIndex`.
 *
 * `openIndex` must point at the opening delimiter. Returns the index of the matching
 * closing delimiter, or -1 when the region never closes — which happens on truncated or
 * syntactically broken files, and must not be allowed to hang the scan.
 */
export function matchDelimiter(source: string, openIndex: number, open: string, close: string): number {
  let depth = 0
  let index = openIndex

  while (index < source.length) {
    const char = source[index]
    if (char === undefined) break

    if (QUOTES.has(char)) {
      index = skipStringLiteral(source, index)
      continue
    }

    if (char === open) depth++
    else if (char === close) {
      depth--
      if (depth === 0) return index
    }

    index++
  }

  return -1
}

/**
 * Given the offset of an opening quote, return the offset just past the closing quote.
 *
 * Escapes are honoured, so `'it\'s'` terminates in the right place. An unterminated
 * literal returns the end of the source rather than looping.
 */
export function skipStringLiteral(source: string, quoteIndex: number): number {
  const quote = source[quoteIndex]
  if (quote === undefined) return quoteIndex + 1

  let index = quoteIndex + 1
  while (index < source.length) {
    const char = source[index]
    if (char === '\\') {
      index += 2
      continue
    }
    if (char === quote) return index + 1
    index++
  }
  return source.length
}

/**
 * Collect every string literal in a region of source.
 *
 * Used to pull class names out of a `cn(…)` or `clsx(…)` call. Everything that is not a
 * literal — a variable, a member expression, a conditional's test — is invisible here, and
 * that invisibility is the reason this package reports a lower bound rather than a count.
 */
export function collectStringLiterals(source: string, start: number, end: number): StringLiteral[] {
  const literals: StringLiteral[] = []
  let index = start

  while (index < end) {
    const char = source[index]
    if (char === undefined) break

    if (QUOTES.has(char)) {
      const after = skipStringLiteral(source, index)
      const value = source.slice(index + 1, Math.max(index + 1, after - 1))
      literals.push({
        value,
        offset: index + 1,
        interpolated: char === '`' && value.includes('${'),
      })
      index = after
      continue
    }

    index++
  }

  return literals
}

/**
 * Find the offset of the `>` that closes a JSX or HTML opening tag.
 *
 * Brace-aware, because JSX attribute values are expressions and expressions contain
 * comparison operators and arrow functions. A scan that stops at the first `>` truncates
 * the attribute list of roughly every element with an inline handler, which would make the
 * accessible-name check report false positives on exactly the components people write most.
 */
export function findTagEnd(source: string, tagStart: number): number {
  let index = tagStart
  let braceDepth = 0

  while (index < source.length) {
    const char = source[index]
    if (char === undefined) break

    if (QUOTES.has(char)) {
      index = skipStringLiteral(source, index)
      continue
    }

    if (char === '{') braceDepth++
    else if (char === '}') braceDepth--
    else if (char === '>' && braceDepth === 0) return index

    index++
  }

  return -1
}

/**
 * Find the offset of the closing tag matching an opening tag, accounting for nesting.
 *
 * Returns -1 when there is no matching close, which for `<a>` in hand-written HTML is
 * common enough that it must be a normal result rather than an error.
 */
export function findClosingTag(source: string, name: string, contentStart: number): number {
  const open = new RegExp(`<${name}(?=[\\s/>])`, 'g')
  const close = new RegExp(`</${name}\\s*>`, 'g')

  let depth = 1
  let cursor = contentStart

  while (cursor < source.length) {
    open.lastIndex = cursor
    close.lastIndex = cursor
    const nextOpen = open.exec(source)
    const nextClose = close.exec(source)

    if (!nextClose) return -1
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++
      cursor = nextOpen.index + 1
      continue
    }

    depth--
    if (depth === 0) return nextClose.index
    cursor = nextClose.index + 1
  }

  return -1
}

/** Convert a kebab-case CSS property to the camelCase form used in style objects. */
export function toCamelCase(property: string): string {
  return property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

/** Escape a literal string for safe inclusion in a regular expression. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
