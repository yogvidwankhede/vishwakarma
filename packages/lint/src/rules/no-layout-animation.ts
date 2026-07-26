// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * `no-layout-animation` — animating geometry is a per-frame layout, not a style.
 *
 * `transform` and `opacity` are handled by the compositor: the main thread hands the layer to
 * the GPU once and is then free. `width`, `height`, `top`, `margin` and `padding` are not.
 * Changing any of them invalidates layout, so the browser re-runs layout, paint and composite
 * on every single frame, on the same thread that is trying to run React, the router and the
 * user's event handlers. On a fast laptop this is invisible. On a mid-range Android phone it
 * is the difference between a 200ms transition and a 200ms freeze — and the person who wrote
 * it will never see the problem, because they are not testing on that phone.
 *
 * This is checkable statically because it is a property of the property, not of the design.
 * What is *not* checkable is the alternative: whether a given size change should become a
 * `scale` on a wrapper, a FLIP transition, or simply an instant change. That is a design
 * decision, so the message names the technique and stops there.
 */

import { LAYOUT_TRIGGERING_PROPERTIES } from '@vishwakarma/core'
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
  CLASS_ATTRIBUTES,
  DEFAULT_CSS_TAGS,
  isCssTag,
  scanClassList,
  scanDeclarations,
  toCssProperty,
} from '../css.js'
import {
  createRule,
  docsUrl,
  objectSchema,
  readBoolean,
  readStringArray,
  resolveOptions,
  stringArraySchema,
} from '../options.js'
import type { AstNode } from '../rule-types.js'

type MessageIds = 'layoutProperty' | 'transitionAll' | 'keyframeLayout'

/**
 * Pull the property names out of a `transition` value.
 *
 * The shorthand puts the property first in each comma-separated segment, so the first token
 * of each segment is the only one that can be a property name. Durations and easings are
 * discarded by shape rather than by a keyword list, which keeps this working when a new
 * easing keyword lands.
 */
function transitionProperties(value: string): string[] {
  return value
    .split(',')
    .map((segment) => segment.trim().split(/\s+/)[0] ?? '')
    .filter((token) => /^[a-z-]+$/.test(token))
}

/** Extract the bodies of every `@keyframes` block in a stylesheet fragment. */
function keyframeBodies(css: string): string[] {
  const bodies: string[] = []
  const pattern = /@(?:-\w+-)?keyframes\b/gi
  let match = pattern.exec(css)
  while (match !== null) {
    const open = css.indexOf('{', match.index)
    if (open === -1) break
    let depth = 0
    let end = -1
    for (let index = open; index < css.length; index += 1) {
      const character = css[index]
      if (character === '{') depth += 1
      else if (character === '}') {
        depth -= 1
        if (depth === 0) {
          end = index
          break
        }
      }
    }
    if (end === -1) break
    bodies.push(css.slice(open + 1, end))
    pattern.lastIndex = end
    match = pattern.exec(css)
  }
  return bodies
}

export default createRule<MessageIds>({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow transitions and animations of layout-triggering properties such as width, height, top and margin.',
      url: docsUrl('no-layout-animation'),
      recommended: true,
      category: 'motion',
    },
    messages: {
      layoutProperty:
        'Animating {{property}} forces layout on every frame and cannot be composited. Animate transform or opacity instead — for a size change, scale a wrapper or measure and FLIP.',
      transitionAll:
        '{{utility}} transitions every property that changes, including layout ones, so an unrelated width change becomes an animation. Name the properties you mean, e.g. transition-[opacity,transform].',
      keyframeLayout:
        'These keyframes animate {{property}}, which forces layout on every frame. Express the movement as transform or opacity so the animation can run off the main thread.',
    },
    schema: objectSchema({
      cssTags: stringArraySchema,
      allowProperties: stringArraySchema,
      allowTransitionAll: { type: 'boolean' },
    }),
  },

  create(context) {
    const options = resolveOptions(context)
    const cssTags = readStringArray(options, 'cssTags', DEFAULT_CSS_TAGS)
    const allowTransitionAll = readBoolean(options, 'allowTransitionAll', false)
    const allowed = new Set(
      readStringArray(options, 'allowProperties', []).map((name) => name.toLowerCase()),
    )

    function reportProperties(
      node: AstNode,
      value: string,
      messageId: 'layoutProperty' | 'keyframeLayout',
    ): void {
      const seen = new Set<string>()
      for (const property of transitionProperties(value)) {
        const name = property.toLowerCase()
        if (seen.has(name) || allowed.has(name)) continue
        seen.add(name)
        if (!LAYOUT_TRIGGERING_PROPERTIES.has(name)) continue
        context.report({ node, messageId, data: { property: name } })
      }
    }

    function reportKeyframeBody(node: AstNode, body: string): void {
      const seen = new Set<string>()
      for (const declaration of scanDeclarations(body)) {
        if (!LAYOUT_TRIGGERING_PROPERTIES.has(declaration.property)) continue
        if (allowed.has(declaration.property) || seen.has(declaration.property)) continue
        seen.add(declaration.property)
        context.report({
          node,
          messageId: 'keyframeLayout',
          data: { property: declaration.property },
        })
      }
    }

    function checkCss(node: AstNode, text: string, wholeTextIsKeyframes: boolean): void {
      if (wholeTextIsKeyframes) {
        reportKeyframeBody(node, text)
        return
      }

      for (const declaration of scanDeclarations(text)) {
        if (
          declaration.property === 'transition' ||
          declaration.property === 'transition-property'
        ) {
          if (!allowTransitionAll && /\ball\b/.test(declaration.value)) {
            context.report({
              node,
              messageId: 'transitionAll',
              data: { utility: `${declaration.property}: ${declaration.value}` },
            })
          }
          reportProperties(node, declaration.value, 'layoutProperty')
        }
      }

      for (const body of keyframeBodies(text)) reportKeyframeBody(node, body)
    }

    return {
      JSXAttribute(node) {
        if (!isJsxAttribute(node)) return
        const name = attributeName(node)?.toLowerCase()
        if (!name || !CLASS_ATTRIBUTES.has(name)) return

        for (const fragment of staticStringFragments(node.value)) {
          for (const utility of scanClassList(fragment)) {
            if (!allowTransitionAll && utility.utility === 'transition-all') {
              context.report({
                node,
                messageId: 'transitionAll',
                data: { utility: utility.raw },
              })
              continue
            }
            if (utility.base === 'transition' && utility.arbitrary) {
              // `transition-[width,opacity]` uses commas; `transition-[margin_top]` uses the
              // underscore Tailwind substitutes for a space.
              reportProperties(node, utility.arbitrary.replace(/_/g, ' '), 'layoutProperty')
            }
          }
        }
      },

      Property(node) {
        if (!isProperty(node)) return
        const key = propertyKeyName(node)
        if (!key) return
        const property = toCssProperty(key)
        if (property !== 'transition' && property !== 'transition-property') return
        const value = staticString(node.value)
        if (value === undefined) return
        if (!allowTransitionAll && /\ball\b/.test(value)) {
          context.report({
            node,
            messageId: 'transitionAll',
            data: { utility: `${key}: ${value}` },
          })
        }
        reportProperties(node, value, 'layoutProperty')
      },

      TemplateElement(node) {
        const literal = node.parent
        if (!isTemplateLiteral(literal)) return
        const tagged = literal.parent
        if (!isTaggedTemplate(tagged)) return
        const tag = tagName(tagged)
        if (!isCssTag(tag, cssTags)) return
        const quasi = literal.quasis.find((element) => element === node)
        const text = quasi?.value.cooked ?? quasi?.value.raw
        if (text === undefined) return
        // A `keyframes` tagged template has no `@keyframes` at-rule of its own — the library
        // adds it — so every declaration inside it is already a keyframe declaration.
        checkCss(node, text, tag === 'keyframes')
      },
    }
  },
})
