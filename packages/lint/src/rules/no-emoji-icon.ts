// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * `no-emoji-icon` — an emoji standing in for an icon is a label you did not write.
 *
 * An emoji in interface chrome fails in four ways at once. Its rendering is the platform's
 * choice, so the "same" icon is a flat glyph on one device and a glossy cartoon on another,
 * and neither matches the icon set. Its size and baseline are the font's business, so it
 * never optically aligns with the text beside it. It cannot be recoloured, so it ignores the
 * theme entirely. And a screen reader announces its Unicode name — a button labelled "🔍"
 * is announced as "magnifying glass tilted left", which is a description of a picture, not a
 * description of what the button does.
 *
 * The rule is narrow on purpose. Emoji in *copy* — a celebratory 🎉 in a success message, an
 * emoji in user-generated content — is content, not chrome, and flagging it would make the
 * rule wrong most of the time it fires. So it reports two mechanically-decidable cases: an
 * element whose entire text content is emoji (that is an icon by definition), and an emoji
 * inside the label of an interactive control (where the announcement problem is real). Every
 * other use is left alone, deliberately.
 */

import { elementName, isJsxElement, isJsxText, staticString } from '../ast.js'
import {
  createRule,
  docsUrl,
  objectSchema,
  readStringArray,
  resolveOptions,
  stringArraySchema,
} from '../options.js'
import type { AstNode } from '../rule-types.js'

/**
 * Characters that are part of an emoji sequence but are not themselves pictographs.
 *
 * `\p{Emoji_Component}` would be the obvious property to use and is a trap: it matches the
 * ASCII digits and `#`, so a price or a heading number would strip down to nothing and be
 * reported as an icon. Enumerating the joiners, variation selectors, skin-tone modifiers,
 * regional indicators and the keycap combiner is longer and correct.
 */
const SEQUENCE_PARTS = '\\u200D\\uFE0E\\uFE0F\\u20E3\\u{1F3FB}-\\u{1F3FF}\\u{1F1E6}-\\u{1F1FF}'

function pictographPattern(): RegExp {
  return /\p{Extended_Pictographic}/gu
}

function emojiOnlyPattern(): RegExp {
  return new RegExp(`^[\\s\\p{Extended_Pictographic}${SEQUENCE_PARTS}]+$`, 'u')
}

/** Elements whose text is a control label rather than prose. */
const DEFAULT_CONTROL_ELEMENTS: readonly string[] = [
  'button',
  'a',
  'summary',
  'label',
  'option',
  'legend',
  'th',
]

/** Pictographs that are typographic marks in practice and never icons. */
const DEFAULT_ALLOWED: readonly string[] = ['©', '®', '™']

type MessageIds = 'emojiAsIcon' | 'emojiInControlLabel'

export default createRule<MessageIds>({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow emoji used as interface icons in JSX text, including inside interactive control labels.',
      url: docsUrl('no-emoji-icon'),
      recommended: true,
      category: 'accessibility',
    },
    messages: {
      emojiAsIcon:
        '{{emoji}} is being used as an icon. Use an icon component so it inherits colour, size and alignment, and give the element a text label — a screen reader announces this emoji by its Unicode name.',
      emojiInControlLabel:
        '{{emoji}} appears in a <{{element}}> label and will be announced by its Unicode name. Move it into a decorative <span aria-hidden="true"> or replace it with an icon component.',
    },
    schema: objectSchema({
      allow: stringArraySchema,
      controlElements: stringArraySchema,
    }),
  },

  create(context) {
    const options = resolveOptions(context)
    const allowed = new Set(readStringArray(options, 'allow', DEFAULT_ALLOWED))
    const controls = new Set(
      readStringArray(options, 'controlElements', DEFAULT_CONTROL_ELEMENTS).map((name) =>
        name.toLowerCase(),
      ),
    )

    function pictographsIn(text: string): string[] {
      const found = text.match(pictographPattern()) ?? []
      return found.filter((character) => !allowed.has(character))
    }

    /** Text carried by a JSX child, whether written bare or as `{'…'}`. */
    function childText(child: AstNode): string | undefined {
      if (isJsxText(child)) return child.value
      if (child.type === 'JSXExpressionContainer') {
        const expression = (child as unknown as { expression?: AstNode }).expression
        return staticString(expression)
      }
      return undefined
    }

    return {
      JSXElement(node) {
        if (!isJsxElement(node)) return
        const name = elementName(node.openingElement)?.toLowerCase()

        for (const child of node.children) {
          const text = childText(child)
          if (text === undefined) continue
          const emoji = pictographsIn(text)
          if (emoji.length === 0) continue
          const unique = [...new Set(emoji)].join(' ')

          if (emojiOnlyPattern().test(text)) {
            context.report({ node: child, messageId: 'emojiAsIcon', data: { emoji: unique } })
            continue
          }

          if (name && controls.has(name)) {
            context.report({
              node: child,
              messageId: 'emojiInControlLabel',
              data: { emoji: unique, element: name },
            })
          }
        }
      },
    }
  },
})
