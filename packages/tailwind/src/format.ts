/**
 * Emitting readable CSS from TypeScript.
 *
 * A generated stylesheet is read far more often than anyone plans for: in devtools when a
 * colour is wrong, in a diff when a token moves, in a bug report pasted by someone who has
 * never seen this repository. Output that is merely valid — one long line, no grouping, no
 * explanation — turns every one of those moments into an investigation. The helpers here
 * exist so the generator has no excuse for producing something unreadable.
 *
 * The sanitisation in {@link safeCommentText} is not cosmetic. Token descriptions are
 * authored by whoever owns the token set, and a description containing `*​/` would close the
 * comment early and spill the rest of the sentence into the stylesheet as declarations. The
 * result is a parse error several hundred lines from the actual mistake, which is about the
 * least helpful failure a build can produce.
 */

/** Column at which generated comment prose wraps. */
export const COMMENT_WIDTH = 88

/**
 * Neutralise anything in `text` that would terminate a CSS comment.
 *
 * CSS comments do not nest, so the sequence is replaced rather than escaped — there is no
 * escape available.
 */
export function safeCommentText(text: string): string {
  return text.replace(/\*\//g, '* /')
}

/** Greedy wrap. Deliberately simple: this is prose in a comment, not typesetting. */
export function wrapText(text: string, width: number = COMMENT_WIDTH): string[] {
  const words = safeCommentText(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (current.length === 0) current = word
    else if (current.length + 1 + word.length <= width) current = `${current} ${word}`
    else {
      lines.push(current)
      current = word
    }
  }
  if (current.length > 0) lines.push(current)
  return lines
}

/** A one-line `/* … *​/` comment. */
export function note(text: string): string {
  return `/* ${safeCommentText(text)} */`
}

/**
 * A multi-line comment block, optionally titled.
 *
 * Paragraphs are separated by a bare ` *` line rather than a blank line so that the comment
 * survives minifiers that strip empty lines but preserve comment interiors.
 */
export function commentBlock(paragraphs: readonly string[], title?: string): string {
  const lines: string[] = ['/*']
  if (title !== undefined) {
    lines.push(` * ${safeCommentText(title)}`, ' *')
  }
  paragraphs.forEach((paragraph, index) => {
    if (index > 0) lines.push(' *')
    for (const line of wrapText(paragraph)) lines.push(` * ${line}`)
  })
  lines.push(' */')
  return lines.join('\n')
}

/** A rule-width divider, used to make the sections of a long generated file scannable. */
export function divider(title: string): string {
  const label = ` ${safeCommentText(title)} `
  const fill = Math.max(0, COMMENT_WIDTH - label.length - 4)
  return `/* ${label}${'-'.repeat(fill)} */`
}

/** Indent every non-empty line of a block by `depth` levels of two spaces. */
export function indent(text: string, depth = 1): string {
  const pad = '  '.repeat(depth)
  return text
    .split('\n')
    .map((line) => (line.length === 0 ? line : `${pad}${line}`))
    .join('\n')
}

/** Join sections with exactly one blank line between them, and no trailing whitespace. */
export function joinSections(sections: ReadonlyArray<string | null | undefined>): string {
  return sections
    .filter((section): section is string => typeof section === 'string' && section.trim().length > 0)
    .map((section) => section.replace(/\s+$/, ''))
    .join('\n\n')
}
