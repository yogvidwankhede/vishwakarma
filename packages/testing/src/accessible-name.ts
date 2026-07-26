// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Accessible names.
 *
 * The accessible name computation in the specification is long, mutually recursive, and
 * full of cases that only arise in generated markup. Implementing all of it here would be
 * a second-rate copy of what a browser already does; implementing none of it and calling
 * `textContent` a name — which is what most in-house helpers do — produces the two failure
 * modes that matter most in practice:
 *
 * - It passes an icon-only button whose only content is an inline `<svg>`, because
 *   `textContent` on the svg returns some whitespace and the check is truthy. That button
 *   is announced as "button" and nothing else.
 * - It fails a perfectly well-named control that uses `aria-labelledby`, because the name
 *   lives somewhere else in the document entirely.
 *
 * What is implemented here is the subset those cases need: the ARIA properties, the native
 * host-language labels, and content — in the specified precedence order, with a record of
 * what was tried. The record is the part that makes the failure message worth reading; a
 * matcher that says "no accessible name" without saying which four places it looked leaves
 * the reader to guess.
 *
 * Two deliberate deviations are documented at their call sites: `title` is treated as a
 * name of last resort (it is, but it is also invisible to touch and keyboard users, so it
 * is reported as a weak pass), and `placeholder` is treated as *not* a name at all, which
 * is the single most common misconception this file exists to correct.
 */

import { ancestorChain, type TestElement, toArray } from './dom.js'

/** Where a name came from, in the order the algorithm considers them. */
export type AccessibleNameSource =
  | 'aria-labelledby'
  | 'aria-label'
  | 'native-label'
  | 'alt'
  | 'value'
  | 'legend'
  | 'caption'
  | 'svg-title'
  | 'content'
  | 'title'
  | 'none'

export interface AccessibleNameResult {
  /** The computed name, trimmed and whitespace-collapsed. Empty when there is none. */
  name: string
  /** Which rule produced it. */
  source: AccessibleNameSource
  /** Every source examined, with the reason it did not apply. Drives the failure message. */
  tried: Array<{ source: AccessibleNameSource; reason: string }>
  /**
   * True when the element carries only a `placeholder`.
   *
   * A placeholder is not an accessible name. It disappears the moment the field has a
   * value, so a user returning to a half-filled form has no way to discover what the field
   * was for — and several screen reader and browser combinations never announce it at all.
   * Called out separately because the fix is specific: add a persistent `<label>`.
   */
  placeholderOnly: boolean
}

const collapse = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim()

const tagOf = (element: TestElement): string => element.tagName.toLowerCase()

/** Whether the element is a form control that a `<label>` can be associated with. */
function isLabelable(element: TestElement): boolean {
  const tag = tagOf(element)
  if (tag === 'input') return element.getAttribute('type')?.toLowerCase() !== 'hidden'
  return ['button', 'select', 'textarea', 'meter', 'output', 'progress'].includes(tag)
}

/**
 * Find the `<label>` elements pointing at this element.
 *
 * Deliberately not `document.querySelectorAll('label[for="' + id + '"]')`. An id is free
 * text — React's `useId` emits colons, and application ids routinely contain dots and
 * brackets — and interpolating one into a selector produces either a `SyntaxError` or, if
 * the id contains a quote, a selector that matches something else entirely. `CSS.escape`
 * would fix it but is not available in every DOM implementation this package supports.
 * Filtering in JavaScript is both correct and cheap enough at test scale.
 */
function labelsFor(element: TestElement): TestElement[] {
  const document = element.ownerDocument
  const id = element.id
  const found: TestElement[] = []

  if (document && id) {
    for (const label of toArray(document.querySelectorAll('label[for]'))) {
      if (label.getAttribute('for') === id) found.push(label)
    }
  }

  // A wrapping label labels its control without needing an id at all.
  for (const ancestor of ancestorChain(element).slice(1)) {
    if (tagOf(ancestor) === 'label') found.push(ancestor)
  }

  return found
}

/** First descendant matching a selector, or null. */
function firstChild(element: TestElement, selector: string): TestElement | null {
  const matches = toArray(element.querySelectorAll(selector))
  return matches[0] ?? null
}

/**
 * Compute an element's accessible name.
 *
 * Returns the name plus the audit trail. Callers that only want the string can read
 * `.name`; matchers should use `.tried` to explain themselves.
 */
export function computeAccessibleName(element: TestElement): AccessibleNameResult {
  const tried: AccessibleNameResult['tried'] = []
  const tag = tagOf(element)
  const document = element.ownerDocument

  const settle = (
    name: string,
    source: AccessibleNameSource,
    placeholderOnly = false,
  ): AccessibleNameResult => ({ name, source, tried, placeholderOnly })

  /* aria-labelledby wins over everything, including visible content. */
  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/).filter(Boolean)
    const missing: string[] = []
    const parts: string[] = []

    for (const id of ids) {
      const target = document?.getElementById(id)
      if (!target) {
        missing.push(id)
        continue
      }
      const text = collapse(target.textContent)
      if (text) parts.push(text)
    }

    if (parts.length > 0) return settle(parts.join(' '), 'aria-labelledby')

    tried.push({
      source: 'aria-labelledby',
      reason:
        missing.length > 0
          ? `aria-labelledby="${labelledBy}" points at ${missing.map((id) => `#${id}`).join(', ')}, which ${missing.length === 1 ? 'does' : 'do'} not exist in the document. A dangling reference produces no name at all — it does not fall back.`
          : `aria-labelledby="${labelledBy}" resolves, but the referenced element has no text.`,
    })
  } else {
    tried.push({ source: 'aria-labelledby', reason: 'no aria-labelledby attribute' })
  }

  /* aria-label. */
  const ariaLabel = collapse(element.getAttribute('aria-label'))
  if (ariaLabel) return settle(ariaLabel, 'aria-label')
  tried.push({
    source: 'aria-label',
    reason: element.hasAttribute('aria-label')
      ? 'aria-label is present but empty, which is the same as absent'
      : 'no aria-label attribute',
  })

  /* Native host-language labelling. */
  if (isLabelable(element)) {
    const labels = labelsFor(element)
    const text = labels.map((label) => collapse(label.textContent)).find((value) => value !== '')
    if (text) return settle(text, 'native-label')
    tried.push({
      source: 'native-label',
      reason:
        labels.length > 0
          ? 'an associated <label> exists but contains no text'
          : element.id
            ? `no <label for="${element.id}"> and no wrapping <label>`
            : 'no wrapping <label>, and the element has no id for a <label for> to reference',
    })
  }

  if (
    tag === 'img' ||
    tag === 'area' ||
    (tag === 'input' && element.getAttribute('type') === 'image')
  ) {
    const alt = element.getAttribute('alt')
    if (alt !== null) {
      const text = collapse(alt)
      // An explicitly empty alt is a valid, meaningful choice: it marks the image as
      // decorative. It is not a missing name, and reporting it as one trains people to
      // "fix" it by inventing alt text for spacer images.
      if (text) return settle(text, 'alt')
      tried.push({ source: 'alt', reason: 'alt="" marks the image as decorative' })
    } else {
      tried.push({ source: 'alt', reason: 'no alt attribute' })
    }
  }

  if (tag === 'input') {
    const type = (element.getAttribute('type') ?? 'text').toLowerCase()
    if (['button', 'submit', 'reset'].includes(type)) {
      const value = collapse(element.getAttribute('value'))
      if (value) return settle(value, 'value')
      // A bare <input type="submit"> with no value is named by the browser's own default
      // ("Submit"), which is locale-dependent and almost never what the design intends.
      tried.push({
        source: 'value',
        reason: `<input type="${type}"> has no value attribute, so its name is the browser's localised default`,
      })
    }
  }

  if (tag === 'fieldset') {
    const legend = firstChild(element, 'legend')
    const text = collapse(legend?.textContent)
    if (text) return settle(text, 'legend')
    tried.push({ source: 'legend', reason: 'no <legend> with text' })
  }

  if (tag === 'table') {
    const caption = firstChild(element, 'caption')
    const text = collapse(caption?.textContent)
    if (text) return settle(text, 'caption')
    tried.push({ source: 'caption', reason: 'no <caption> with text' })
  }

  if (tag === 'svg') {
    const title = firstChild(element, 'title')
    const text = collapse(title?.textContent)
    if (text) return settle(text, 'svg-title')
    tried.push({ source: 'svg-title', reason: 'no <title> child' })
  }

  /* Content. Note that an <svg> child contributes nothing here, which is exactly why an
     icon-only button fails: the glyph carries meaning to sighted users and none to the
     accessibility tree. */
  const content = collapse(element.textContent)
  if (content) return settle(content, 'content')
  tried.push({
    source: 'content',
    reason: 'the element has no text content — an icon or an <svg> alone is not a name',
  })

  /* title, as a weak last resort. */
  const title = collapse(element.getAttribute('title'))
  if (title) return settle(title, 'title')
  tried.push({ source: 'title', reason: 'no title attribute' })

  const placeholder = collapse(element.getAttribute('placeholder'))
  if (placeholder) return settle('', 'none', true)

  return settle('', 'none')
}

/** Convenience wrapper for callers that only want the string. */
export function accessibleName(element: TestElement): string {
  return computeAccessibleName(element).name
}
