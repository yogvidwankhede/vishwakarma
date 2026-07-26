/**
 * `require-alt-text` — an image with no `alt` is an image nobody can describe.
 *
 * A missing `alt` is not the same as an empty one, and the distinction is the whole rule. An
 * empty `alt=""` is a decision: this image is decorative, skip it. A missing attribute leaves
 * the assistive technology with nothing to go on, so most screen readers fall back to reading
 * the file name — which is how a user ends up hearing "hero underscore final underscore two
 * dot p n g" in the middle of a sentence.
 *
 * The rule also reports two forms of `alt` that are present but useless, both decidable
 * without judgement: a value that is plainly a file name, and a value that opens with "image
 * of". The second is worth stating because the element's role is already announced — "image,
 * image of a chart" is the actual output, and the redundancy is grating for anyone who hears
 * it a hundred times a day.
 *
 * What the rule cannot do is tell you whether the description is *good*. That needs to know
 * what the image shows and what it is doing in the page, which is the definition of a
 * judgement call and is why the rule stops where it does.
 */

import {
  attributeName,
  attributeStaticString,
  elementName,
  findAttribute,
  hasSpreadAttribute,
  isJsxAttribute,
  isJsxElement,
  isJsxOpeningElement,
} from '../ast.js'
import {
  createRule,
  docsUrl,
  objectSchema,
  readStringArray,
  resolveOptions,
  stringArraySchema,
} from '../options.js'
import type { AstNode, JsxOpeningElementNode } from '../rule-types.js'

/** Native elements that carry an `alt`. */
const NATIVE_IMAGE_ELEMENTS: readonly string[] = ['img', 'area']

const FILENAME = /\.(?:png|jpe?g|gif|webp|avif|svg|bmp|ico)$/i
const REDUNDANT_PREFIX =
  /^\s*(?:an?\s+)?(?:image|picture|photo(?:graph)?|graphic|icon|logo)\s+of\b/i

type MessageIds = 'missingAlt' | 'filenameAlt' | 'redundantAlt' | 'unnamedImageRole'

export default createRule<MessageIds>({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require images to carry alt text, and reject alt values that are file names or begin with "image of".',
      url: docsUrl('require-alt-text'),
      recommended: true,
      category: 'accessibility',
    },
    messages: {
      missingAlt:
        '<{{element}}> has no alt attribute. Add alt="…" describing what the image conveys, or alt="" if it is purely decorative — without either, screen readers fall back to reading the file name.',
      filenameAlt:
        'alt="{{value}}" is a file name, not a description. Describe what the image conveys, or use alt="" if it is decorative.',
      redundantAlt:
        'alt="{{value}}" restates the element\'s role, which is already announced. Drop the leading "{{prefix}}" and describe the content directly.',
      unnamedImageRole:
        '<svg role="img"> has no accessible name. Add a <title> child, aria-label, or aria-labelledby — otherwise the element is announced as an unlabelled image.',
    },
    schema: objectSchema({
      components: stringArraySchema,
    }),
  },

  create(context) {
    const options = resolveOptions(context)
    const extraComponents = new Set(readStringArray(options, 'components', []))

    function isImageElement(name: string, opening: JsxOpeningElementNode): boolean {
      if (extraComponents.has(name)) return true
      const lower = name.toLowerCase()
      if (NATIVE_IMAGE_ELEMENTS.includes(lower)) return true
      if (lower !== 'input') return false
      return attributeStaticString(findAttribute(opening, 'type'))?.toLowerCase() === 'image'
    }

    function checkAlt(opening: JsxOpeningElementNode, name: string): void {
      const alt = findAttribute(opening, 'alt')

      if (!alt) {
        // An element carrying a spread may well receive `alt` through it. Reporting anyway
        // produces an error the author cannot silence except by disabling the rule.
        if (hasSpreadAttribute(opening)) return
        context.report({ node: opening, messageId: 'missingAlt', data: { element: name } })
        return
      }

      // `alt` with no value is `alt={true}`, which serialises to `alt="true"`.
      if (!alt.value) {
        context.report({ node: alt, messageId: 'missingAlt', data: { element: name } })
        return
      }

      const value = attributeStaticString(alt)
      // A computed value is out of reach; the rule says nothing rather than guessing.
      if (value === undefined) return
      if (value.trim() === '') return

      if (FILENAME.test(value.trim())) {
        context.report({ node: alt, messageId: 'filenameAlt', data: { value } })
        return
      }

      const redundant = REDUNDANT_PREFIX.exec(value)
      if (redundant) {
        context.report({
          node: alt,
          messageId: 'redundantAlt',
          data: { value, prefix: redundant[0].trim() },
        })
      }
    }

    function checkSvg(node: AstNode, opening: JsxOpeningElementNode): void {
      if (attributeStaticString(findAttribute(opening, 'role')) !== 'img') return
      if (hasSpreadAttribute(opening)) return
      if (findAttribute(opening, 'aria-label') || findAttribute(opening, 'aria-labelledby')) return

      const element = isJsxElement(node) ? node : undefined
      const hasTitle = element?.children.some((child) => {
        if (child.type !== 'JSXElement') return false
        const childOpening = (child as unknown as { openingElement?: AstNode }).openingElement
        if (!isJsxOpeningElement(childOpening)) return false
        return elementName(childOpening)?.toLowerCase() === 'title'
      })
      if (hasTitle) return

      context.report({ node: opening, messageId: 'unnamedImageRole' })
    }

    return {
      JSXOpeningElement(node) {
        if (!isJsxOpeningElement(node)) return
        const name = elementName(node)
        if (!name) return

        // `aria-hidden` removes the element from the accessibility tree entirely, so there is
        // nothing left to name.
        const hidden = node.attributes.some(
          (attribute) =>
            isJsxAttribute(attribute) &&
            attributeName(attribute) === 'aria-hidden' &&
            attributeStaticString(attribute) !== 'false',
        )
        if (hidden) return

        if (isImageElement(name, node)) checkAlt(node, name)
      },

      JSXElement(node) {
        if (!isJsxElement(node)) return
        if (elementName(node.openingElement)?.toLowerCase() !== 'svg') return
        checkSvg(node, node.openingElement)
      },
    }
  },
})
