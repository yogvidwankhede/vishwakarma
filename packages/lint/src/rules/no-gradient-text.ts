// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * `no-gradient-text` — clipped-gradient headings vanish under forced colours.
 *
 * The technique is `background-image: linear-gradient(...)` plus `background-clip: text` plus
 * `color: transparent`. It works by painting the text as a window onto a background, which
 * means the text has no colour of its own. Anything that suppresses background images
 * therefore removes the text entirely rather than falling back to something readable: Windows
 * High Contrast and other forced-colours modes discard background images by design, printing
 * discards them by default in most browsers, and any user stylesheet that overrides colours
 * hits the same wall. The heading does not lose its styling — it becomes invisible.
 *
 * Headings are the worst place to do it. They are what a low-vision user scans first, what a
 * print reader relies on to navigate, and what carries the page's structure. Text selection is
 * also affected: the selection highlight sits behind text that has no foreground colour, so
 * selected text can disappear as it is being read.
 *
 * The rule flags the combination, not the gradient. A gradient background is fine; a gradient
 * background clipped to heading text is what earns the report. If a project has a genuine
 * fallback — the effect scoped inside `@supports` and `@media (forced-colors: none)` with a
 * plain `color` underneath — that is a design decision the rule cannot see, and the intended
 * escape is a scoped disable comment with that reason written next to it.
 */

import {
  attributeName,
  attributeObject,
  attributeStaticString,
  elementName,
  findAttribute,
  isJsxAttribute,
  isJsxOpeningElement,
  isProperty,
  isTaggedTemplate,
  propertyKeyName,
  staticString,
  staticStringFragments,
  tagName,
} from '../ast.js'
import { containsGradient } from '../colour.js'
import { CLASS_ATTRIBUTES, scanClassList, scanDeclarations, toCssProperty } from '../css.js'
import {
  createRule,
  docsUrl,
  objectSchema,
  readStringArray,
  resolveOptions,
  stringArraySchema,
} from '../options.js'
import type { JsxOpeningElementNode, ObjectExpressionNode } from '../rule-types.js'

const DEFAULT_ELEMENTS: readonly string[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

/** Utilities that set a gradient background image. */
function isGradientUtility(utility: string, arbitrary: string | undefined): boolean {
  if (arbitrary !== undefined && containsGradient(arbitrary.replace(/_/g, ' '))) return true
  return /^bg-(?:gradient|linear|radial|conic)(?:-|$)/.test(utility)
}

type MessageIds = 'gradientText'

export default createRule<MessageIds>({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow gradient-clipped text on headings, which renders invisible under forced colours and in print.',
      url: docsUrl('no-gradient-text'),
      recommended: true,
      category: 'typography',
    },
    messages: {
      gradientText:
        '<{{element}}> paints its text with a clipped gradient, so the text has no colour of its own and disappears wherever background images are suppressed — forced-colours mode and print, at minimum. Set a real colour on the heading, or scope the effect behind @media (forced-colors: none) with a readable fallback underneath.',
    },
    schema: objectSchema({
      elements: stringArraySchema,
      cssTags: stringArraySchema,
    }),
  },

  create(context) {
    const options = resolveOptions(context)
    const elements = new Set(
      readStringArray(options, 'elements', DEFAULT_ELEMENTS).map((name) => name.toLowerCase()),
    )

    function isHeading(opening: JsxOpeningElementNode): boolean {
      const name = elementName(opening)?.toLowerCase()
      if (name && elements.has(name)) return true
      // An element given `role="heading"` is a heading to every assistive technology, and the
      // failure mode is identical.
      return attributeStaticString(findAttribute(opening, 'role')) === 'heading'
    }

    function classesClipGradient(opening: JsxOpeningElementNode): boolean {
      let clipped = false
      let gradient = false

      for (const attribute of opening.attributes) {
        if (!isJsxAttribute(attribute)) continue
        const name = attributeName(attribute)?.toLowerCase()
        if (!name || !CLASS_ATTRIBUTES.has(name)) continue

        for (const fragment of staticStringFragments(attribute.value)) {
          for (const utility of scanClassList(fragment)) {
            if (utility.utility === 'bg-clip-text') clipped = true
            if (isGradientUtility(utility.utility, utility.arbitrary)) gradient = true
          }
        }
      }

      return clipped && gradient
    }

    function styleClipsGradient(object: ObjectExpressionNode | undefined): boolean {
      if (!object) return false
      let clipped = false
      let gradient = false

      for (const property of object.properties) {
        if (!isProperty(property)) continue
        const key = propertyKeyName(property)
        if (!key) continue
        const cssProperty = toCssProperty(key)
        const value = staticString(property.value)
        if (value === undefined) continue

        if (
          (cssProperty === 'background-clip' || cssProperty === '-webkit-background-clip') &&
          value.trim() === 'text'
        ) {
          clipped = true
        }
        if (
          (cssProperty === 'background' || cssProperty === 'background-image') &&
          containsGradient(value)
        ) {
          gradient = true
        }
      }

      return clipped && gradient
    }

    function cssClipsGradient(text: string): boolean {
      let clipped = false
      let gradient = false
      for (const declaration of scanDeclarations(text)) {
        if (
          (declaration.property === 'background-clip' ||
            declaration.property === '-webkit-background-clip') &&
          declaration.value.trim() === 'text'
        ) {
          clipped = true
        }
        if (
          (declaration.property === 'background' || declaration.property === 'background-image') &&
          containsGradient(declaration.value)
        ) {
          gradient = true
        }
      }
      return clipped && gradient
    }

    return {
      JSXOpeningElement(node) {
        if (!isJsxOpeningElement(node)) return
        if (!isHeading(node)) return

        const name = elementName(node) ?? 'heading'
        if (
          classesClipGradient(node) ||
          styleClipsGradient(attributeObject(findAttribute(node, 'style')))
        ) {
          context.report({ node, messageId: 'gradientText', data: { element: name } })
        }
      },

      TaggedTemplateExpression(node) {
        if (!isTaggedTemplate(node)) return
        const tag = tagName(node)
        if (!tag) return
        // `styled.h1` is the only form where the rendered element is knowable from this file.
        // `styled(Title)` could be anything, and guessing would report on components that are
        // not headings at all.
        const target = tag.startsWith('styled.')
          ? tag.slice('styled.'.length).toLowerCase()
          : undefined
        if (!target || !elements.has(target)) return

        // Chunks are joined with a separator rather than concatenated, so a declaration cut
        // in half by an interpolation stays cut in half: it then fails to parse and is
        // ignored, which is the right direction to fail in.
        const text = node.quasi.quasis
          .map((quasi) => quasi.value.cooked ?? quasi.value.raw)
          .join(' ; ')
        if (cssClipsGradient(text)) {
          context.report({ node, messageId: 'gradientText', data: { element: target } })
        }
      },
    }
  },
})
