/**
 * `require-button-type` — a button without a type submits the form it happens to be inside.
 *
 * The HTML default for `<button>` is `type="submit"`. A button written for some entirely
 * unrelated purpose — toggling a disclosure, removing a row, opening a picker — will submit
 * the enclosing form and navigate the page the first time someone presses Enter in a nearby
 * text field. The bug is invisible in isolation and appears only once the component is used
 * inside a form, often months later and in someone else's feature, which makes it one of the
 * more expensive one-word omissions in the language.
 *
 * There is no auto-fix, and that is not an oversight. Inserting `type="button"` would be
 * right most of the time and catastrophic the rest of the time: on the one button in the form
 * that was *meant* to submit, the fix silently breaks submission and the test suite, if it
 * exists at all, is unlikely to notice. A person has to answer this one.
 */

import {
  attributeStaticString,
  elementName,
  findAttribute,
  hasSpreadAttribute,
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

const VALID_TYPES: readonly string[] = ['button', 'submit', 'reset']

type MessageIds = 'missingType' | 'invalidType'

export default createRule<MessageIds>({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require an explicit type on button elements, which default to submit and will post the enclosing form.',
      url: docsUrl('require-button-type'),
      recommended: true,
      category: 'accessibility',
    },
    messages: {
      missingType:
        '<{{element}}> has no type, so it defaults to type="submit" and will submit any form it is placed inside. Add type="button" unless this button really is the form\'s submit control.',
      invalidType:
        'type="{{value}}" is not a valid button type. Use "button", "submit" or "reset" — anything else falls back to "submit".',
    },
    schema: objectSchema({
      components: stringArraySchema,
    }),
  },

  create(context) {
    const options = resolveOptions(context)
    const components = readStringArray(options, 'components', [])

    return {
      JSXOpeningElement(node) {
        if (!isJsxOpeningElement(node)) return
        const name = elementName(node)
        if (!name) return
        if (name.toLowerCase() !== 'button' && !components.includes(name)) return

        const type = findAttribute(node, 'type')
        if (!type) {
          // The type may arrive through a spread; see `hasSpreadAttribute` for why this rule
          // has to concede that case rather than report it.
          if (hasSpreadAttribute(node)) return
          context.report({ node, messageId: 'missingType', data: { element: name } })
          return
        }

        const value = attributeStaticString(type)
        // A computed type is a deliberate decision and readable by a human; leave it.
        if (value === undefined) return
        if (!VALID_TYPES.includes(value)) {
          context.report({ node: type, messageId: 'invalidType', data: { value } })
        }
      },
    }
  },
})
