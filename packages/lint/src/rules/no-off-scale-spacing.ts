// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * `no-off-scale-spacing` — the scale is the argument, and one-off values end it.
 *
 * Spacing scales work because they are small. Six or eight steps mean that any two gaps in an
 * interface are either equal or obviously different, and that is what produces the sense of
 * rhythm people describe as "tidy" without being able to point at why. A `p-[13px]` does not
 * look wrong on its own — that is exactly the problem. It looks fine, it ships, and the next
 * person matches it with a `14px`, and after a year the interface has forty spacing values
 * and no rhythm left to defend.
 *
 * The rule checks only what resolves to a fixed length: `px` and `rem`. `em`, `%`, `ch` and
 * `calc()` depend on inherited font size, container width or the viewport, none of which is
 * visible to a linter, and asking whether `2em` is on the scale is not a question with an
 * answer. See `spacing.ts` for why we refuse to guess.
 */

import {
  attributeName,
  isJsxAttribute,
  isProperty,
  isTaggedTemplate,
  isTemplateLiteral,
  literalNumber,
  propertyKeyName,
  staticString,
  staticStringFragments,
  tagName,
} from '../ast.js'
import {
  CLASS_ATTRIBUTES,
  DEFAULT_CSS_TAGS,
  isCssTag,
  SPACING_PROPERTIES,
  scanClassList,
  scanDeclarations,
  toCssProperty,
} from '../css.js'
import {
  createRule,
  docsUrl,
  numberArraySchema,
  objectSchema,
  readNumber,
  readNumberArray,
  readStringArray,
  resolveOptions,
  stringArraySchema,
  stringRecordSchema,
} from '../options.js'
import type { AstNode } from '../rule-types.js'
import {
  checkScale,
  DEFAULT_SPACING_UTILITIES,
  describeAlternatives,
  isUnitless,
  toPixels,
} from '../spacing.js'

/** The default scale, mirroring the core design contract so the two cannot drift. */
const DEFAULT_SCALE: readonly number[] = [
  0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192,
]

/**
 * Values that are allowed off-scale.
 *
 * Hairlines and single-pixel optical corrections are not spacing decisions; they are
 * compensations for borders and sub-pixel rendering, and forcing them onto a 4px scale makes
 * the interface visibly worse.
 */
const DEFAULT_EXCEPTIONS: readonly number[] = [1, 3]

type MessageIds = 'offScaleValue' | 'offScaleUtility'

export default createRule<MessageIds>({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow spacing values that are not steps on the design system scale, including arbitrary utility values and inline pixel lengths.',
      url: docsUrl('no-off-scale-spacing'),
      recommended: true,
      category: 'spacing',
    },
    messages: {
      offScaleValue:
        '{{property}}: {{value}} is not on the spacing scale. Use {{alternatives}}, or add the value to the scale if the interface genuinely needs a new step.',
      offScaleUtility:
        '{{utility}} sets an arbitrary {{value}}. Use the scale step nearest to it ({{alternatives}}), or add the value to the scale if the interface genuinely needs a new step.',
    },
    schema: objectSchema({
      scale: numberArraySchema,
      exceptions: numberArraySchema,
      rootFontSize: { type: 'number', minimum: 1 },
      utilities: stringArraySchema,
      cssTags: stringArraySchema,
      // Accepted and ignored: shared settings are read by several rules at once.
      tokens: stringRecordSchema,
      maxDelta: { type: 'number' },
    }),
  },

  create(context) {
    const options = resolveOptions(context)
    const scale = readNumberArray(options, 'scale', DEFAULT_SCALE)
    const exceptions = readNumberArray(options, 'exceptions', DEFAULT_EXCEPTIONS)
    const rootFontSize = readNumber(options, 'rootFontSize', 16)
    const utilities = new Set(readStringArray(options, 'utilities', DEFAULT_SPACING_UTILITIES))
    const cssTags = readStringArray(options, 'cssTags', DEFAULT_CSS_TAGS)

    function checkDeclaration(node: AstNode, property: string, value: string): void {
      if (!SPACING_PROPERTIES.has(property)) return

      // Shorthands carry several lengths: `padding: 16px 13px` is one declaration and two
      // decisions, and reporting only the first would leave the second to ship.
      for (const part of value.split(/\s+/)) {
        if (!part) continue
        if (isUnitless(part) && part !== '0') continue
        const px = toPixels(part, rootFontSize)
        if (px === undefined) continue
        const verdict = checkScale(px, scale, exceptions)
        if (verdict.onScale) continue
        context.report({
          node,
          messageId: 'offScaleValue',
          data: { property, value: part, alternatives: describeAlternatives(verdict) },
        })
      }
    }

    function checkClassList(node: AstNode, text: string): void {
      for (const utility of scanClassList(text)) {
        const arbitrary = utility.arbitrary
        if (arbitrary === undefined || !utilities.has(utility.base)) continue
        const px = toPixels(arbitrary, rootFontSize)
        if (px === undefined) continue
        const verdict = checkScale(px, scale, exceptions)
        if (verdict.onScale) continue
        context.report({
          node,
          messageId: 'offScaleUtility',
          data: {
            utility: utility.raw,
            value: arbitrary,
            alternatives: describeAlternatives(verdict),
          },
        })
      }
    }

    return {
      JSXAttribute(node) {
        if (!isJsxAttribute(node)) return
        const name = attributeName(node)?.toLowerCase()
        if (!name || !CLASS_ATTRIBUTES.has(name)) return
        for (const fragment of staticStringFragments(node.value)) checkClassList(node, fragment)
      },

      Property(node) {
        if (!isProperty(node)) return
        const key = propertyKeyName(node)
        if (!key) return
        const property = toCssProperty(key)
        if (!SPACING_PROPERTIES.has(property)) return

        // A number in a React style object means pixels: `padding: 13` renders as `13px`.
        // Treating it as unitless and skipping it would leave the most common off-scale
        // value in the codebase unreported.
        const numeric = literalNumber(node.value)
        if (numeric !== undefined) {
          const verdict = checkScale(numeric, scale, exceptions)
          if (!verdict.onScale) {
            context.report({
              node,
              messageId: 'offScaleValue',
              data: {
                property,
                value: `${numeric}px`,
                alternatives: describeAlternatives(verdict),
              },
            })
          }
          return
        }

        const value = staticString(node.value)
        if (value !== undefined) checkDeclaration(node, property, value)
      },

      TemplateElement(node) {
        const literal = node.parent
        if (!isTemplateLiteral(literal)) return
        const tagged = literal.parent
        if (!isTaggedTemplate(tagged) || !isCssTag(tagName(tagged), cssTags)) return

        const quasi = literal.quasis.find((element) => element === node)
        const text = quasi?.value.cooked ?? quasi?.value.raw
        if (text === undefined) return
        for (const declaration of scanDeclarations(text)) {
          checkDeclaration(node, declaration.property, declaration.value)
        }
      },
    }
  },
})
