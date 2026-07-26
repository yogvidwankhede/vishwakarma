// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Narrowing helpers over the structural node types.
 *
 * Every function here is total: it takes a possibly-undefined node of unknown shape and
 * returns either the thing asked for or `undefined`. That discipline exists because rules
 * run inside the host's traversal, and an exception thrown from a visitor aborts linting for
 * the entire file — the user sees "parsing error" on a file that parses perfectly well and
 * concludes the plugin is broken. Returning `undefined` and reporting nothing is always the
 * better failure.
 */

import type {
  AstNode,
  IdentifierNode,
  JsxAttributeNode,
  JsxElementNode,
  JsxExpressionContainerNode,
  JsxOpeningElementNode,
  JsxTextNode,
  LiteralNode,
  MemberExpressionNode,
  ObjectExpressionNode,
  PropertyNode,
  TaggedTemplateExpressionNode,
  TemplateLiteralNode,
} from './rule-types.js'

/** Whether the node is a literal of any kind. */
export function isLiteral(node: AstNode | null | undefined): node is LiteralNode {
  return node?.type === 'Literal'
}

/** Whether the node is a template literal. */
export function isTemplateLiteral(node: AstNode | null | undefined): node is TemplateLiteralNode {
  return node?.type === 'TemplateLiteral'
}

/** Whether the node is a tagged template expression. */
export function isTaggedTemplate(
  node: AstNode | null | undefined,
): node is TaggedTemplateExpressionNode {
  return node?.type === 'TaggedTemplateExpression'
}

/** Whether the node is a plain identifier. */
export function isIdentifier(node: AstNode | null | undefined): node is IdentifierNode {
  return node?.type === 'Identifier'
}

/** Whether the node is a member expression. */
export function isMemberExpression(node: AstNode | null | undefined): node is MemberExpressionNode {
  return node?.type === 'MemberExpression'
}

/** Whether the node is an object literal. */
export function isObjectExpression(node: AstNode | null | undefined): node is ObjectExpressionNode {
  return node?.type === 'ObjectExpression'
}

/** Whether the node is an object property. */
export function isProperty(node: AstNode | null | undefined): node is PropertyNode {
  return node?.type === 'Property'
}

/** Whether the node is a JSX attribute (as opposed to a spread). */
export function isJsxAttribute(node: AstNode | null | undefined): node is JsxAttributeNode {
  return node?.type === 'JSXAttribute'
}

/** Whether the node is a JSX opening tag. */
export function isJsxOpeningElement(
  node: AstNode | null | undefined,
): node is JsxOpeningElementNode {
  return node?.type === 'JSXOpeningElement'
}

/** Whether the node is a complete JSX element. */
export function isJsxElement(node: AstNode | null | undefined): node is JsxElementNode {
  return node?.type === 'JSXElement'
}

/** Whether the node is a `{...}` container in attribute or child position. */
export function isJsxExpressionContainer(
  node: AstNode | null | undefined,
): node is JsxExpressionContainerNode {
  return node?.type === 'JSXExpressionContainer'
}

/** Whether the node is literal text between JSX tags. */
export function isJsxText(node: AstNode | null | undefined): node is JsxTextNode {
  return node?.type === 'JSXText'
}

/** The value of a string literal, or `undefined` for any other literal. */
export function literalString(node: AstNode | null | undefined): string | undefined {
  if (!isLiteral(node)) return undefined
  return typeof node.value === 'string' ? node.value : undefined
}

/** The value of a numeric literal, or `undefined`. */
export function literalNumber(node: AstNode | null | undefined): number | undefined {
  if (!isLiteral(node)) return undefined
  return typeof node.value === 'number' ? node.value : undefined
}

/**
 * The static text of a node, where it has any.
 *
 * A template literal with interpolations has no single static value, so this returns
 * `undefined` for those rather than concatenating the quasis. Concatenation would produce
 * strings that never exist at runtime — `bg-[${colour}]` would become `bg-[]` — and rules
 * would then report on text the author never wrote.
 */
export function staticString(node: AstNode | null | undefined): string | undefined {
  const direct = literalString(node)
  if (direct !== undefined) return direct
  if (!isTemplateLiteral(node)) return undefined
  if (node.expressions.length > 0) return undefined
  const only = node.quasis[0]
  if (!only) return undefined
  return only.value.cooked ?? only.value.raw
}

/**
 * Every static string fragment reachable from a node.
 *
 * Class names are routinely assembled — `clsx('p-4', active && 'p-[13px]')`, or a template
 * with an interpolated variant. Looking only at whole strings would miss most real class
 * lists in a codebase that uses a class-merging helper, so we collect the static fragments
 * from literals, template chunks, arrays, conditionals and call arguments. Interpolated
 * expressions are simply not visible to a linter, and this rule set does not pretend
 * otherwise: it checks what it can read and stays quiet about the rest.
 */
export function staticStringFragments(node: AstNode | null | undefined, depth = 0): string[] {
  if (!node || depth > 6) return []

  const direct = literalString(node)
  if (direct !== undefined) return [direct]

  if (isTemplateLiteral(node)) {
    return node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw)
  }

  if (isJsxExpressionContainer(node)) return staticStringFragments(node.expression, depth + 1)

  const kind = node.type
  if (kind === 'ArrayExpression') {
    const elements = (node as unknown as { elements?: (AstNode | null)[] }).elements ?? []
    return elements.flatMap((element) => staticStringFragments(element, depth + 1))
  }
  if (kind === 'ConditionalExpression') {
    const branch = node as unknown as { consequent?: AstNode; alternate?: AstNode }
    return [
      ...staticStringFragments(branch.consequent, depth + 1),
      ...staticStringFragments(branch.alternate, depth + 1),
    ]
  }
  if (kind === 'LogicalExpression' || kind === 'BinaryExpression') {
    const sides = node as unknown as { left?: AstNode; right?: AstNode }
    return [
      ...staticStringFragments(sides.left, depth + 1),
      ...staticStringFragments(sides.right, depth + 1),
    ]
  }
  if (kind === 'CallExpression') {
    const call = node as unknown as { arguments?: AstNode[] }
    return (call.arguments ?? []).flatMap((argument) => staticStringFragments(argument, depth + 1))
  }
  if (kind === 'ObjectExpression') {
    // `clsx({ 'p-[13px]': active })` puts the class in key position.
    const object = node as unknown as { properties?: AstNode[] }
    return (object.properties ?? []).flatMap((property) => {
      if (!isProperty(property) || property.computed) return []
      const key = propertyKeyName(property)
      return key === undefined ? [] : [key]
    })
  }

  return []
}

/** The name of a non-computed property key, whether written bare or quoted. */
export function propertyKeyName(property: PropertyNode): string | undefined {
  if (property.computed) return undefined
  if (isIdentifier(property.key)) return property.key.name
  return literalString(property.key)
}

/** The tag name of an opening element: `div`, `Foo`, or `Foo.Bar`. */
export function elementName(opening: JsxOpeningElementNode): string | undefined {
  return jsxName(opening.name)
}

function jsxName(node: AstNode | null | undefined): string | undefined {
  if (!node) return undefined
  if (node.type === 'JSXIdentifier') return (node as unknown as { name: string }).name
  if (node.type === 'JSXMemberExpression') {
    const member = node as unknown as { object: AstNode; property: AstNode }
    const object = jsxName(member.object)
    const property = jsxName(member.property)
    return object && property ? `${object}.${property}` : undefined
  }
  if (node.type === 'JSXNamespacedName') {
    const namespaced = node as unknown as { namespace: AstNode; name: AstNode }
    const namespace = jsxName(namespaced.namespace)
    const name = jsxName(namespaced.name)
    return namespace && name ? `${namespace}:${name}` : undefined
  }
  return undefined
}

/** The attribute's name, e.g. `className` or `aria-label`. */
export function attributeName(attribute: JsxAttributeNode): string | undefined {
  return jsxName(attribute.name)
}

/**
 * Find an attribute by name, case-insensitively.
 *
 * Case folding matters because `tabIndex` and `tabindex` both reach the DOM, and a rule that
 * only knows the React spelling misses every element written by someone porting HTML.
 */
export function findAttribute(
  opening: JsxOpeningElementNode,
  name: string,
): JsxAttributeNode | undefined {
  const wanted = name.toLowerCase()
  for (const attribute of opening.attributes) {
    if (!isJsxAttribute(attribute)) continue
    if (attributeName(attribute)?.toLowerCase() === wanted) return attribute
  }
  return undefined
}

/**
 * Whether the tag carries a `{...spread}`.
 *
 * Any rule of the form "this element must have attribute X" has to bail out here. The
 * attribute may well be in the spread, and reporting anyway produces exactly the kind of
 * false positive that gets a whole plugin removed from a config.
 */
export function hasSpreadAttribute(opening: JsxOpeningElementNode): boolean {
  return opening.attributes.some((attribute) => attribute.type === 'JSXSpreadAttribute')
}

/** The static string an attribute is set to, unwrapping `{'...'}` containers. */
export function attributeStaticString(attribute: JsxAttributeNode | undefined): string | undefined {
  if (!attribute?.value) return undefined
  const direct = literalString(attribute.value)
  if (direct !== undefined) return direct
  if (isJsxExpressionContainer(attribute.value)) return staticString(attribute.value.expression)
  return undefined
}

/** The object literal an attribute is set to, as in `style={{ ... }}`. */
export function attributeObject(
  attribute: JsxAttributeNode | undefined,
): ObjectExpressionNode | undefined {
  if (!attribute?.value) return undefined
  if (!isJsxExpressionContainer(attribute.value)) return undefined
  return isObjectExpression(attribute.value.expression) ? attribute.value.expression : undefined
}

/** Walk up to the nearest ancestor of the given type. Returns `undefined` without `parent`. */
export function closest(node: AstNode, type: string, limit = 24): AstNode | undefined {
  let current: AstNode | null | undefined = node.parent
  let steps = 0
  while (current && steps < limit) {
    if (current.type === type) return current
    current = current.parent
    steps += 1
  }
  return undefined
}

/**
 * The dotted source text of a tagged template's tag: `styled.h1`, `css`, `keyframes`.
 *
 * Used to decide whether a template's contents are CSS at all. Scanning every template
 * literal in a file for colour and spacing values would flag SQL, URLs and prose.
 */
export function tagName(node: TaggedTemplateExpressionNode): string | undefined {
  const tag = node.tag
  if (isIdentifier(tag)) return tag.name
  if (isMemberExpression(tag)) {
    const object = isIdentifier(tag.object) ? tag.object.name : undefined
    const property = isIdentifier(tag.property) ? tag.property.name : undefined
    return object && property ? `${object}.${property}` : object
  }
  if (tag.type === 'CallExpression') {
    const call = tag as unknown as { callee?: AstNode }
    if (isIdentifier(call.callee)) return call.callee.name
    if (isMemberExpression(call.callee) && isIdentifier(call.callee.object)) {
      return call.callee.object.name
    }
  }
  return undefined
}
