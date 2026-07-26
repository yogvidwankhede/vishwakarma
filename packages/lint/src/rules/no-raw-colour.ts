// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * `no-raw-colour` — a hard-coded colour is a colour outside the system.
 *
 * The cost of a literal is not aesthetic. A hex value in a component does not respond to the
 * theme switch, is not audited by the contrast checker, does not appear in the palette
 * documentation, and cannot be found by anyone asked to change the brand. Every one of those
 * failures shows up months later as "the dark theme is broken on one screen", and the fix is
 * archaeology.
 *
 * This rule is a good candidate for static enforcement precisely because it needs no
 * judgement: the presence of `#3b82f6` in a source file is a fact, not an opinion. What it
 * cannot judge — whether the resulting colour has sufficient contrast against what sits
 * behind it — belongs to the runtime audit, because that answer depends on the rendered tree.
 */

import {
  attributeName,
  isJsxAttribute,
  isProperty,
  isTaggedTemplate,
  isTemplateLiteral,
  propertyKeyName,
  staticString,
  staticStringFragments,
  tagName,
} from '../ast.js'
import {
  containsGradient,
  findColourLiterals,
  isStructuralColour,
  nearestToken,
  parseColourLiteral,
  stripUrls,
  toTokenList,
} from '../colour.js'
import {
  CLASS_ATTRIBUTES,
  COLOUR_PROPERTIES,
  DEFAULT_CSS_TAGS,
  isCssTag,
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
  readStringArray,
  readStringRecord,
  resolveOptions,
  stringArraySchema,
  stringRecordSchema,
} from '../options.js'
import type { AstNode } from '../rule-types.js'

/**
 * Attributes whose values contain `#` for reasons unrelated to colour.
 *
 * `href="#faq"` is the obvious one; less obvious is that a fragment like `#fab` or `#dad` is
 * valid hex, so the naive rule reports real anchors on real sites.
 */
const DEFAULT_IGNORED_ATTRIBUTES: readonly string[] = [
  'href',
  'xlinkHref',
  'to',
  'src',
  'id',
  'htmlFor',
  'name',
  'action',
  'formAction',
  'key',
  'd',
  'pattern',
]

type MessageIds = 'rawColour' | 'rawColourWithToken'

export default createRule<MessageIds>({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hex, rgb() and hsl() colour literals in JSX and CSS-in-JS; use a design token instead.',
      url: docsUrl('no-raw-colour'),
      recommended: true,
      category: 'colour',
    },
    messages: {
      rawColour:
        'Hard-coded colour {{literal}}. Replace it with a palette token so the theme switch, the contrast audit and the palette documentation all reach this value.',
      rawColourWithToken:
        'Hard-coded colour {{literal}} is the token {{token}} (ΔOKLab {{delta}}). Use {{token}} so a change to the palette reaches this value.',
    },
    schema: objectSchema({
      tokens: stringRecordSchema,
      maxDelta: { type: 'number', minimum: 0 },
      cssTags: stringArraySchema,
      ignoreAttributes: stringArraySchema,
      allow: stringArraySchema,
      allowGradientStops: { type: 'boolean' },
      // Present so a project sharing one settings object across rules does not trip
      // `additionalProperties: false` on keys meant for a sibling rule.
      scale: numberArraySchema,
    }),
  },

  create(context) {
    const options = resolveOptions(context)
    const tokens = toTokenList(readStringRecord(options, 'tokens'))
    const maxDelta = readNumber(options, 'maxDelta', 0.05)
    const cssTags = readStringArray(options, 'cssTags', DEFAULT_CSS_TAGS)
    const ignored = new Set(
      readStringArray(options, 'ignoreAttributes', DEFAULT_IGNORED_ATTRIBUTES).map((name) =>
        name.toLowerCase(),
      ),
    )
    const allowed = new Set(
      readStringArray(options, 'allow', []).map((value) => value.trim().toLowerCase()),
    )

    function report(node: AstNode, text: string): void {
      const seen = new Set<string>()
      for (const literal of findColourLiterals(stripUrls(text))) {
        const key = literal.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        if (allowed.has(key) || isStructuralColour(literal)) continue

        const parsed = parseColourLiteral(literal)
        const match = parsed ? nearestToken(parsed, tokens, maxDelta) : undefined

        if (match) {
          context.report({
            node,
            messageId: 'rawColourWithToken',
            data: { literal, token: match.name, delta: match.delta.toFixed(3) },
          })
        } else {
          context.report({ node, messageId: 'rawColour', data: { literal } })
        }
      }
    }

    return {
      JSXAttribute(node) {
        if (!isJsxAttribute(node)) return
        const name = attributeName(node)
        if (!name || ignored.has(name.toLowerCase())) return

        const fragments = staticStringFragments(node.value)
        if (fragments.length === 0) return

        if (CLASS_ATTRIBUTES.has(name.toLowerCase())) {
          // Only arbitrary values can carry a colour in a utility class list. Scanning the
          // whole string would also read `text-slate-500`, which is a token reference and the
          // exact thing this rule is asking for.
          for (const fragment of fragments) {
            for (const utility of scanClassList(fragment)) {
              if (utility.arbitrary) report(node, utility.arbitrary)
            }
          }
          return
        }

        for (const fragment of fragments) report(node, fragment)
      },

      Property(node) {
        if (!isProperty(node)) return
        const key = propertyKeyName(node)
        if (!key) return
        const property = toCssProperty(key)
        if (!COLOUR_PROPERTIES.has(property) && !property.startsWith('--')) return
        const value = staticString(node.value)
        if (value === undefined) return
        if (containsGradient(value)) {
          // Still a raw colour if the stops are literals — the gradient wrapper changes
          // nothing about who owns the value.
          report(node, value)
          return
        }
        report(node, value)
      },

      TemplateElement(node) {
        const literal = node.parent
        if (!isTemplateLiteral(literal)) return
        const tagged = literal.parent
        if (!isTaggedTemplate(tagged) || !isCssTag(tagName(tagged), cssTags)) return

        const quasi = literal.quasis.find((element) => element === node)
        const text = quasi?.value.cooked ?? quasi?.value.raw
        if (text === undefined) return

        // Declaration-scoped rather than whole-text, so a hex inside a comment or a
        // selector fragment is left alone.
        const declarations = scanDeclarations(text)
        if (declarations.length === 0) {
          report(node, text)
          return
        }
        for (const declaration of declarations) {
          if (
            COLOUR_PROPERTIES.has(declaration.property) ||
            declaration.property.startsWith('--') ||
            containsGradient(declaration.value)
          ) {
            report(node, declaration.value)
          }
        }
      },
    }
  },
})
