/**
 * Type-to-find, the way native menus and list boxes behave.
 *
 * Two behaviours look similar and are not. Typing `s`, `e`, `t` in quick succession should
 * find "Settings" — the characters accumulate into one query. Typing `s`, `s`, `s` should
 * cycle through every item beginning with "s" — a repeated character is a different gesture,
 * and treating it as the query "sss" makes the most common way of finding an item in a long
 * list do nothing at all.
 *
 * The rule that distinguishes them is that a query consisting entirely of one repeated
 * character is treated as a single-character search that starts from the item *after* the
 * current one. Everything else searches from the current item, so that continuing to type
 * refines the match rather than skipping past it.
 */

/** Where a typeahead search ended up. */
export interface TypeaheadMatch {
  /** Index into the labels array. */
  index: number
  /** The label that matched. */
  label: string
}

function normalise(value: string): string {
  // `toLowerCase` alone is not enough for accented input: someone typing "e" on a keyboard
  // without dead keys should still find "Éditer". NFD splits the base letter from its
  // combining mark and the range strips the marks. This deliberately does not attempt
  // transliteration — "ß" to "ss" and similar are locale decisions a primitive should not make.
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Find the item a typeahead query refers to.
 *
 * @param labels Item labels in DOM order. Items that cannot be matched should be omitted by
 *   the caller rather than passed as empty strings, so indices stay meaningful.
 * @param query The accumulated characters.
 * @param from The index focus is currently on, or -1.
 * @returns The match, or `null` if nothing starts with the query.
 */
export function findByTypeahead(
  labels: readonly string[],
  query: string,
  from: number,
): TypeaheadMatch | null {
  if (labels.length === 0) return null

  const search = normalise(query)
  if (!search) return null

  const repeated = search.length > 1 && search.split('').every((char) => char === search[0])
  const needle = repeated ? (search[0] ?? '') : search

  // A repeated character means "give me the next one", so the search starts past the current
  // item. Anything else starts at the current item, because the user is still refining and
  // the item they are on may well be the one they mean.
  const start = repeated || search.length === 1 ? from + 1 : Math.max(from, 0)

  // The wrap is what makes a long list usable: pressing `t` at the bottom must find the "T"
  // items at the top rather than reporting no match.
  for (let offset = 0; offset < labels.length; offset += 1) {
    const index = (start + offset + labels.length) % labels.length
    const label = labels[index]
    if (label === undefined) continue
    if (normalise(label).startsWith(needle)) return { index, label }
  }

  return null
}

/**
 * Whether a keydown should feed the typeahead buffer.
 *
 * Only single printable characters count. `event.key` is a multi-character name for every
 * non-printable key — `ArrowDown`, `Enter`, `Backspace`, `F5` — so a length check separates
 * them without an allow-list that would inevitably omit somebody's keyboard layout. Modifier
 * combinations are excluded because Ctrl+S must remain Save; Alt is excluded reluctantly,
 * since it composes characters on some layouts, but a menu that swallows Alt breaks the
 * platform's own menu access keys.
 *
 * The space character is excluded here even though it is printable: in a menu, Space
 * activates the focused item, and an item whose label begins with a space is not a thing.
 */
export function isTypeaheadKey(event: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  return event.key.length === 1 && event.key !== ' '
}
