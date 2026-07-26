// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The rule shape, described structurally rather than imported.
 *
 * This package deliberately does not depend on `eslint`. A lint plugin that takes its host
 * as a runtime dependency forces every consumer onto the version range the plugin was
 * published against, and the resulting peer-dependency arguments are the single most common
 * reason a shareable rule set stops being installable six months after release. A rule is,
 * at bottom, a plain object with `meta` and `create` — so we describe that object with our
 * own types and let structural typing do the rest. The host passes its own AST nodes in;
 * we describe only the fields we actually read.
 *
 * The consequence to be aware of: nothing here is validated against the host's real types
 * at build time. If ESLint changes the node shape, our narrowing helpers silently stop
 * matching rather than failing to compile, which is why every helper in `ast.ts` is written
 * to return `undefined` on an unexpected shape instead of assuming. A rule that reports
 * nothing is recoverable; a rule that throws inside the host's traversal takes the whole
 * lint run down with it.
 */

/** One-based line, zero-based column, as every JavaScript parser reports it. */
export interface Position {
  line: number
  column: number
}

/** A half-open source span. */
export interface SourceLocation {
  start: Position
  end: Position
}

/**
 * The minimum every AST node satisfies.
 *
 * `parent` is populated by ESLint during traversal but not by every parser in isolation, so
 * it is optional and every walk up the tree must tolerate its absence.
 */
export interface AstNode {
  type: string
  loc?: SourceLocation | null
  range?: [number, number]
  parent?: AstNode | null
}

/** A string, number, boolean, null, or regular-expression literal. */
export interface LiteralNode extends AstNode {
  type: 'Literal'
  /** Typed as `unknown` because a regex literal's value is a `RegExp`, not a primitive. */
  value: unknown
  raw?: string
}

/** One static chunk of a template literal. */
export interface TemplateElementNode extends AstNode {
  type: 'TemplateElement'
  value: { raw: string; cooked?: string | null }
  tail?: boolean
}

/** A template literal, static chunks interleaved with expressions. */
export interface TemplateLiteralNode extends AstNode {
  type: 'TemplateLiteral'
  quasis: TemplateElementNode[]
  expressions: AstNode[]
}

/** A tagged template — how nearly all CSS-in-JS is authored. */
export interface TaggedTemplateExpressionNode extends AstNode {
  type: 'TaggedTemplateExpression'
  tag: AstNode
  quasi: TemplateLiteralNode
}

/** A plain identifier. */
export interface IdentifierNode extends AstNode {
  type: 'Identifier'
  name: string
}

/** A member access, computed or otherwise. */
export interface MemberExpressionNode extends AstNode {
  type: 'MemberExpression'
  object: AstNode
  property: AstNode
  computed: boolean
}

/** A call expression. */
export interface CallExpressionNode extends AstNode {
  type: 'CallExpression'
  callee: AstNode
  arguments: AstNode[]
}

/** A single `key: value` pair in an object literal. */
export interface PropertyNode extends AstNode {
  type: 'Property'
  key: AstNode
  value: AstNode
  computed: boolean
  shorthand: boolean
}

/** An object literal — the style object in `style={{ ... }}` and most CSS-in-JS objects. */
export interface ObjectExpressionNode extends AstNode {
  type: 'ObjectExpression'
  properties: AstNode[]
}

/** The `div` in `<div />`. */
export interface JsxIdentifierNode extends AstNode {
  type: 'JSXIdentifier'
  name: string
}

/** The `Foo.Bar` in `<Foo.Bar />`. */
export interface JsxMemberExpressionNode extends AstNode {
  type: 'JSXMemberExpression'
  object: AstNode
  property: AstNode
}

/** A single JSX attribute. `value` is absent for a bare boolean attribute. */
export interface JsxAttributeNode extends AstNode {
  type: 'JSXAttribute'
  name: AstNode
  value?: AstNode | null
}

/** `{...props}` in an opening tag. Its presence defeats most "attribute is missing" checks. */
export interface JsxSpreadAttributeNode extends AstNode {
  type: 'JSXSpreadAttribute'
  argument: AstNode
}

/** The opening tag, which carries the element name and every attribute. */
export interface JsxOpeningElementNode extends AstNode {
  type: 'JSXOpeningElement'
  name: AstNode
  attributes: AstNode[]
  selfClosing: boolean
}

/** A complete JSX element. */
export interface JsxElementNode extends AstNode {
  type: 'JSXElement'
  openingElement: JsxOpeningElementNode
  children: AstNode[]
}

/** `{expression}` in attribute position or in children. */
export interface JsxExpressionContainerNode extends AstNode {
  type: 'JSXExpressionContainer'
  expression: AstNode
}

/** Literal text between JSX tags. */
export interface JsxTextNode extends AstNode {
  type: 'JSXText'
  value: string
  raw?: string
}

/**
 * A JSON Schema fragment, kept deliberately loose.
 *
 * Modelling JSON Schema precisely in TypeScript costs several hundred lines and buys
 * nothing here: the host validates options against the schema at runtime, and a schema this
 * package ships is written once and read by a human, not composed programmatically.
 */
export type JsonSchema = Readonly<Record<string, unknown>>

/** How the host categorises the rule in its own documentation and output. */
export type RuleType = 'problem' | 'suggestion' | 'layout'

/** Documentation metadata. Every rule must carry a resolvable URL; see `docsUrl`. */
export interface RuleDocs {
  /** One sentence, in the imperative, describing what the rule forbids or requires. */
  description: string
  /** Absolute URL to the rule's documentation page. */
  url: string
  /** Whether the rule is part of the `recommended` preset. */
  recommended: boolean
  /** Grouping used by the generated documentation index. */
  category: 'colour' | 'spacing' | 'motion' | 'accessibility' | 'typography'
}

/** The `meta` block of a rule. */
export interface RuleMeta<MessageIds extends string = string> {
  type: RuleType
  docs: RuleDocs
  /**
   * Messages, keyed by id. Every message must name the fix, not just the offence: a
   * diagnostic that says "raw colour" and stops has moved the problem rather than solved it.
   */
  messages: Record<MessageIds, string>
  schema: readonly JsonSchema[]
  fixable?: 'code' | 'whitespace'
  hasSuggestions?: boolean
}

/** A text edit produced by a fixer. */
export interface RuleFix {
  range: [number, number]
  text: string
}

/** The subset of the host's fixer API our rules use. */
export interface RuleFixer {
  replaceText: (node: AstNode, text: string) => RuleFix
  insertTextAfter: (node: AstNode, text: string) => RuleFix
  insertTextBefore: (node: AstNode, text: string) => RuleFix
  remove: (node: AstNode) => RuleFix
}

/** What a rule passes to `context.report`. */
export interface ReportDescriptor<MessageIds extends string = string> {
  messageId: MessageIds
  node?: AstNode
  loc?: SourceLocation
  data?: Record<string, string | number>
  fix?: (fixer: RuleFixer) => RuleFix | readonly RuleFix[] | null
}

/** The slice of the host's `SourceCode` object our rules read. */
export interface SourceCodeLike {
  getText: (node?: AstNode) => string
}

/** The context object handed to `create`. */
export interface RuleContext<
  MessageIds extends string = string,
  Options extends readonly unknown[] = readonly unknown[],
> {
  id?: string
  /** Raw, unvalidated options. Read them through the helpers in `options.ts`. */
  options: Options
  /** Shared configuration, read from the `vishwakarma` key. */
  settings?: Readonly<Record<string, unknown>>
  filename?: string
  getFilename?: () => string
  sourceCode?: SourceCodeLike
  report: (descriptor: ReportDescriptor<MessageIds>) => void
}

/**
 * The visitor a rule returns.
 *
 * Keys are node types or ESLint selectors (`'Program:exit'`, `'JSXOpeningElement'`). Typing
 * every node as {@link AstNode} rather than per-selector is a deliberate trade: it costs one
 * narrowing call at the top of each handler and removes any chance of the visitor map going
 * stale against a parser that reports a slightly different node shape.
 */
export interface RuleListener {
  [selector: string]: ((node: AstNode) => void) | undefined
}

/** A complete rule: `meta` plus `create`. */
export interface RuleModule<
  MessageIds extends string = string,
  Options extends readonly unknown[] = readonly unknown[],
> {
  meta: RuleMeta<MessageIds>
  create: (context: RuleContext<MessageIds, Options>) => RuleListener
}

/**
 * A rule with its message ids and options erased, for storing in the plugin's rule map.
 *
 * `any` is load-bearing here and `unknown` cannot replace it. `create` takes a context
 * parameterised by the rule's own message ids, and a function parameter is contravariant, so
 * `RuleModule<'rawColour'>` is not assignable to `RuleModule<string>` — the erased form would
 * reject every rule that bothers to name its messages, which is all of them. The looseness is
 * confined to this one alias: it is used only where heterogeneous rules are collected into a
 * record, and never inside a rule, where the parameters stay exact.
 */
// biome-ignore lint/suspicious/noExplicitAny: erasing the rule parameters requires it; see above.
export type AnyRuleModule = RuleModule<any, any>
