/**
 * Composition: how fragments become a prompt.
 *
 * The unit of reuse in this package is the fragment, not the prompt. Prompts are what a
 * caller asks for, but the parts that determine whether the answer is any good — the
 * ranking step, the self-check, the accessibility floor — are identical across all of them
 * and must stay identical. Copying that text into eleven templates guarantees that within a
 * few months there are eleven slightly different accessibility sections, three of which are
 * out of date, and no way to tell which.
 */

import type { Composition, Fragment } from './types.js'

/** Anything {@link compose} accepts as a part. */
export type ComposablePart = Fragment | Composition | string | null | undefined | false

/**
 * The rule between sections.
 *
 * A blank line alone is not enough separation: models blur adjacent paragraphs, and an
 * instruction that ends up read as a continuation of the previous one loses its force. A
 * visible rule with a heading keeps each fragment addressable, which also means the model
 * can be told to "revisit the Self-check section" and actually find it.
 */
function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}`
}

function isFragment(part: ComposablePart): part is Fragment {
  return typeof part === 'object' && part !== null && 'id' in part && 'body' in part
}

function isComposition(part: ComposablePart): part is Composition {
  return typeof part === 'object' && part !== null && 'text' in part && 'fragments' in part
}

/**
 * Combine fragments, raw text, and earlier compositions into one prompt body.
 *
 * Falsy parts are dropped, so a caller can write `condition && FRAGMENT` inline rather than
 * building an array first. This is the only concession to conditional logic in the whole
 * template pipeline, and it is deliberate: the branch is ordinary TypeScript, visible in the
 * source and checked by the compiler, rather than a construct inside the template that
 * would have to be parsed and debugged.
 *
 * Fragments are de-duplicated by id, first occurrence winning. Duplication is not
 * hypothetical — bundles overlap, and two copies of the accessibility section separated by
 * three hundred words is materially worse than one: the model treats the repetition as
 * emphasis on whichever wording it read last, and a maintainer editing "the" section edits
 * only one of them.
 *
 * Order is preserved exactly as given, and it matters. Role framing has to precede the
 * task or the model has already started answering as itself; the self-check has to come
 * last or it is performed against an earlier draft.
 */
export function compose(...parts: readonly ComposablePart[]): Composition {
  const seen = new Set<string>()
  const chunks: string[] = []
  const ids: string[] = []

  for (const part of parts) {
    if (!part) continue

    if (typeof part === 'string') {
      const text = part.trim()
      if (text.length > 0) chunks.push(text)
      continue
    }

    if (isComposition(part)) {
      for (const id of part.fragments) {
        if (!seen.has(id)) {
          seen.add(id)
          ids.push(id)
        }
      }
      const text = part.text.trim()
      if (text.length > 0) chunks.push(text)
      continue
    }

    if (isFragment(part)) {
      if (seen.has(part.id)) continue
      seen.add(part.id)
      ids.push(part.id)
      chunks.push(section(part.title, part.body))
    }
  }

  return { text: chunks.join('\n\n---\n\n'), fragments: ids }
}

/**
 * Build a fragment.
 *
 * A function rather than an object literal so that the body is trimmed once, at definition
 * time, and so that fragments defined across several files cannot quietly diverge in shape.
 * Bodies are written as indented template literals in the source; the trim is what keeps
 * that from leaking leading blank lines into every composed prompt.
 */
export function fragment(spec: Fragment): Fragment {
  return { ...spec, body: spec.body.trim() }
}
