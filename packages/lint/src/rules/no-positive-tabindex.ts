// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * `no-positive-tabindex` — a positive tabindex reorders the whole page, not just this element.
 *
 * `tabIndex={1}` does not mean "focus this early among its neighbours". It moves the element
 * into a separate, higher-priority tab sequence that is traversed *before* every element with
 * `tabIndex={0}` anywhere in the document. One positive value in a dialog therefore reorders
 * the header, the navigation and the footer around it, and the effect only shows up when a
 * keyboard user tabs through the page — which is exactly the audience least able to absorb
 * the surprise.
 *
 * The honest fix is almost never another tabindex value: it is to put the element where it
 * belongs in the DOM, because the tab order is the DOM order and fighting that will lose
 * eventually. `tabIndex={0}` makes a custom control focusable in place, and `tabIndex={-1}`
 * makes it programmatically focusable without entering the sequence, which is what a focus
 * trap or a skip target needs.
 *
 * Not auto-fixable, deliberately. Rewriting `3` to `0` silences the diagnostic and leaves the
 * author believing the ordering problem was solved, when the reason they wrote `3` — the
 * element being in the wrong place — is untouched.
 */

import {
  attributeName,
  attributeStaticString,
  isJsxAttribute,
  isJsxExpressionContainer,
  literalNumber,
} from '../ast.js'
import { createRule, docsUrl, objectSchema } from '../options.js'
import type { AstNode } from '../rule-types.js'

type MessageIds = 'positiveTabIndex'

/** Read the tabindex value whether written as `{1}`, `"1"`, or `{'1'}`. */
function tabIndexValue(attributeValue: AstNode | null | undefined): number | undefined {
  if (!attributeValue) return undefined

  const direct = literalNumber(attributeValue)
  if (direct !== undefined) return direct

  if (isJsxExpressionContainer(attributeValue)) {
    const expression = attributeValue.expression
    const numeric = literalNumber(expression)
    if (numeric !== undefined) return numeric
    // `tabIndex={-1}` parses as a unary expression, not a negative literal.
    if (expression.type === 'UnaryExpression') {
      const unary = expression as unknown as { operator?: string; argument?: AstNode }
      const argument = literalNumber(unary.argument)
      if (argument === undefined) return undefined
      return unary.operator === '-' ? -argument : argument
    }
    return undefined
  }

  return undefined
}

export default createRule<MessageIds>({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow tabindex values greater than zero, which reorder the tab sequence of the entire document.',
      url: docsUrl('no-positive-tabindex'),
      recommended: true,
      category: 'accessibility',
    },
    messages: {
      positiveTabIndex:
        'tabIndex={{value}} moves this element ahead of every other focusable element in the document. Use tabIndex={0} and place the element where it belongs in the DOM, or tabIndex={-1} if it should be focusable only in code.',
    },
    schema: objectSchema({}),
  },

  create(context) {
    return {
      JSXAttribute(node) {
        if (!isJsxAttribute(node)) return
        const name = attributeName(node)?.toLowerCase()
        if (name !== 'tabindex') return

        let value = tabIndexValue(node.value)
        if (value === undefined) {
          // `tabIndex="2"` — a plain string attribute, still valid HTML and still wrong.
          const text = attributeStaticString(node)
          if (text === undefined) return
          const parsed = Number.parseInt(text.trim(), 10)
          if (Number.isNaN(parsed)) return
          value = parsed
        }

        if (!Number.isFinite(value) || value <= 0) return
        context.report({ node, messageId: 'positiveTabIndex', data: { value } })
      },
    }
  },
})
