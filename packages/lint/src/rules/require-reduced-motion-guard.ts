/**
 * `require-reduced-motion-guard` — a file that animates must know about the preference.
 *
 * `prefers-reduced-motion` is not a preference about taste. For a person with a vestibular
 * disorder, a looping or large-travel animation can produce genuine nausea and disorientation
 * that outlasts the visit, and they have already told the operating system so. Shipping an
 * animation that ignores that is not a rough edge; it is overriding a stated medical need.
 *
 * The check is file-scoped, which is the largest scope a linter honestly has. If a file
 * declares keyframes, applies an `animate-*` utility or calls the Web Animations API, and
 * nothing anywhere in that file mentions the preference — no `useReducedMotion`, no
 * `motion-safe:` variant, no `@media (prefers-reduced-motion: reduce)` block — then nobody
 * considered it, and that is a defensible conclusion from one file.
 *
 * What the rule deliberately does not do is claim the guard is *correct*. A file can import
 * `useReducedMotion`, never call it, and satisfy this rule. That is the honest boundary: lint
 * can prove the question was never asked, not that it was answered well. Verifying the answer
 * needs the rendered tree, which is the runtime auditor's job — see `enforcement.ts`.
 */

import {
  attributeName,
  isIdentifier,
  isJsxAttribute,
  isProperty,
  isTaggedTemplate,
  isTemplateLiteral,
  literalString,
  propertyKeyName,
  staticString,
  staticStringFragments,
  tagName,
} from '../ast.js'
import {
  CLASS_ATTRIBUTES,
  DEFAULT_CSS_TAGS,
  isCssTag,
  scanClassList,
  toCssProperty,
} from '../css.js'
import {
  createRule,
  docsUrl,
  objectSchema,
  readStringArray,
  resolveOptions,
  stringArraySchema,
} from '../options.js'
import type { AstNode } from '../rule-types.js'

/** Hook and helper names that count as consulting the preference. */
const DEFAULT_GUARD_IDENTIFIERS: readonly string[] = [
  'useReducedMotion',
  'usePrefersReducedMotion',
  'prefersReducedMotion',
  'useMotion',
]

/**
 * Modules whose exports guard themselves.
 *
 * Importing from the Vishwakarma motion package is sufficient: every component there already
 * resolves the preference internally, so demanding a second guard at the call site would be
 * asking authors to write dead code to satisfy a linter — which is how a rule earns a
 * reputation for being wrong.
 */
const DEFAULT_GUARD_MODULES: readonly string[] = ['@vishwakarma/motion']

type MessageIds = 'unguardedAnimation'

export default createRule<MessageIds>({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require a file that defines or applies an animation to consult prefers-reduced-motion.',
      url: docsUrl('require-reduced-motion-guard'),
      recommended: true,
      category: 'motion',
    },
    messages: {
      unguardedAnimation:
        'This file animates ({{evidence}}) but never consults prefers-reduced-motion. Wrap the animation in a `@media (prefers-reduced-motion: reduce)` block, use the `motion-safe:` variant, or gate it on `useReducedMotion()`.',
    },
    schema: objectSchema({
      guardIdentifiers: stringArraySchema,
      guardModules: stringArraySchema,
      cssTags: stringArraySchema,
    }),
  },

  create(context) {
    const options = resolveOptions(context)
    const guardIdentifiers = new Set(
      readStringArray(options, 'guardIdentifiers', DEFAULT_GUARD_IDENTIFIERS),
    )
    const guardModules = new Set(readStringArray(options, 'guardModules', DEFAULT_GUARD_MODULES))
    const cssTags = readStringArray(options, 'cssTags', DEFAULT_CSS_TAGS)

    let guarded = false
    let evidenceNode: AstNode | undefined
    let evidenceText = ''

    function noteAnimation(node: AstNode, description: string): void {
      // Only the first site is remembered. One guard fixes the whole file, so reporting every
      // animation in it would produce a wall of diagnostics with a single edit behind them —
      // and a wall of diagnostics is what people silence with a file-level disable comment.
      if (evidenceNode) return
      evidenceNode = node
      evidenceText = description
    }

    function noteGuardText(text: string): void {
      if (text.includes('prefers-reduced-motion')) guarded = true
    }

    return {
      ImportDeclaration(node) {
        const source = literalString((node as unknown as { source?: AstNode }).source)
        if (source !== undefined && guardModules.has(source)) guarded = true
      },

      Identifier(node) {
        if (!isIdentifier(node)) return
        if (guardIdentifiers.has(node.name)) guarded = true
      },

      Literal(node) {
        const value = literalString(node)
        if (value !== undefined) noteGuardText(value)
      },

      JSXAttribute(node) {
        if (!isJsxAttribute(node)) return
        const name = attributeName(node)?.toLowerCase()
        if (!name || !CLASS_ATTRIBUTES.has(name)) return

        for (const fragment of staticStringFragments(node.value)) {
          for (const utility of scanClassList(fragment)) {
            const isMotionVariant = utility.variants.some(
              (variant) => variant === 'motion-safe' || variant === 'motion-reduce',
            )
            if (isMotionVariant) {
              guarded = true
              continue
            }
            if (utility.base === 'animate' && utility.utility !== 'animate-none') {
              noteAnimation(node, utility.raw)
            }
          }
        }
      },

      Property(node) {
        if (!isProperty(node)) return
        const key = propertyKeyName(node)
        if (!key) return
        const property = toCssProperty(key)
        if (property !== 'animation' && property !== 'animation-name') return
        const value = staticString(node.value)
        if (value === 'none') return
        noteAnimation(node, `${property}: ${value ?? '…'}`)
      },

      CallExpression(node) {
        // `element.animate(...)` — the Web Animations API, which no CSS media query reaches.
        const callee = (node as unknown as { callee?: AstNode }).callee
        if (callee?.type !== 'MemberExpression') return
        const property = (callee as unknown as { property?: AstNode }).property
        if (isIdentifier(property) && property.name === 'animate') {
          noteAnimation(node, 'element.animate()')
        }
      },

      TemplateElement(node) {
        const literal = node.parent
        if (!isTemplateLiteral(literal)) return
        const quasi = literal.quasis.find((element) => element === node)
        const text = quasi?.value.cooked ?? quasi?.value.raw
        if (text === undefined) return
        noteGuardText(text)

        const tagged = literal.parent
        if (!isTaggedTemplate(tagged)) return
        const tag = tagName(tagged)
        if (!isCssTag(tag, cssTags)) return

        if (tag === 'keyframes' || /@(?:-\w+-)?keyframes\b/.test(text)) {
          noteAnimation(node, '@keyframes')
          return
        }
        if (/\banimation(?:-name)?\s*:/.test(text) && !/\banimation\s*:\s*none\b/.test(text)) {
          noteAnimation(node, 'animation declaration')
        }
      },

      'Program:exit'() {
        if (guarded || !evidenceNode) return
        context.report({
          node: evidenceNode,
          messageId: 'unguardedAnimation',
          data: { evidence: evidenceText },
        })
      },
    }
  },
})
