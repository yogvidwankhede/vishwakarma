/**
 * @vishwakarma/lint
 *
 * Shareable rules that enforce the parts of a design system a compiler can see: colour
 * literals, off-scale spacing, layout-triggering animation, unguarded motion, emoji standing
 * in for icons, and the small set of accessibility defects that live in a single attribute.
 *
 * The package depends on nothing but `@vishwakarma/core`. Rules are plain objects with `meta`
 * and `create`, typed structurally, so they drop into an ESLint flat config without this
 * package having an opinion about which ESLint you run — see `rule-types.ts` for why that
 * trade is worth its one cost.
 *
 * Before adding a rule, read `enforcement.ts`. Most design concerns do not belong here, and
 * the ones that do not are what turn a useful rule set into one people disable.
 */

import { configs } from './configs.js'
import { rules } from './rules/index.js'

export {
  attributeName,
  attributeObject,
  attributeStaticString,
  closest,
  elementName,
  findAttribute,
  hasSpreadAttribute,
  isIdentifier,
  isJsxAttribute,
  isJsxElement,
  isJsxExpressionContainer,
  isJsxOpeningElement,
  isJsxText,
  isLiteral,
  isMemberExpression,
  isObjectExpression,
  isProperty,
  isTaggedTemplate,
  isTemplateLiteral,
  literalNumber,
  literalString,
  propertyKeyName,
  staticString,
  staticStringFragments,
  tagName,
} from './ast.js'
export {
  type ColourToken,
  colourLiteralPattern,
  containsGradient,
  findColourLiterals,
  isStructuralColour,
  nearestToken,
  parseColourLiteral,
  stripUrls,
  type TokenMatch,
  toTokenList,
} from './colour.js'
export {
  configs,
  type FlatConfigBlock,
  type LintPlugin,
  PLUGIN_NAMESPACE,
  plugin,
  type RuleEntry,
  type RuleSeverity,
  recommended,
  strict,
} from './configs.js'

export {
  CLASS_ATTRIBUTES,
  COLOUR_PROPERTIES,
  DEFAULT_CSS_TAGS,
  type Declaration,
  isCssTag,
  SPACING_PROPERTIES,
  scanClassList,
  scanDeclarations,
  toCssProperty,
  type UtilityClass,
} from './css.js'
export {
  concernsFor,
  ENFORCEMENT_MAP,
  type EnforcementEntry,
  type EnforcementLayer,
  LINT_ADMISSION_CRITERIA,
} from './enforcement.js'
export {
  asRecord,
  type ConfigurableContext,
  createRule,
  currentFilename,
  docsUrl,
  numberArraySchema,
  objectSchema,
  readBoolean,
  readNumber,
  readNumberArray,
  readString,
  readStringArray,
  readStringRecord,
  resolveOptions,
  SETTINGS_KEY,
  stringArraySchema,
  stringRecordSchema,
} from './options.js'
export type {
  AnyRuleModule,
  AstNode,
  CallExpressionNode,
  IdentifierNode,
  JsonSchema,
  JsxAttributeNode,
  JsxElementNode,
  JsxExpressionContainerNode,
  JsxIdentifierNode,
  JsxMemberExpressionNode,
  JsxOpeningElementNode,
  JsxSpreadAttributeNode,
  JsxTextNode,
  LiteralNode,
  MemberExpressionNode,
  ObjectExpressionNode,
  Position,
  PropertyNode,
  ReportDescriptor,
  RuleContext,
  RuleDocs,
  RuleFix,
  RuleFixer,
  RuleListener,
  RuleMeta,
  RuleModule,
  RuleType,
  SourceCodeLike,
  SourceLocation,
  TaggedTemplateExpressionNode,
  TemplateElementNode,
  TemplateLiteralNode,
} from './rule-types.js'

export {
  noEmojiIcon,
  noGradientText,
  noLayoutAnimation,
  noOffScaleSpacing,
  noPositiveTabindex,
  noRawColour,
  type RuleName,
  requireAltText,
  requireButtonType,
  requireReducedMotionGuard,
  rules,
} from './rules/index.js'
export {
  checkScale,
  DEFAULT_SPACING_UTILITIES,
  describeAlternatives,
  isUnitless,
  type ScaleVerdict,
  toPixels,
} from './spacing.js'

/**
 * Default export, for the `plugins: { vishwakarma: ... }` form flat config expects.
 *
 * The named exports remain the primary interface; this exists because a plugin that cannot be
 * default-imported forces every consumer to assemble a wrapper object in their config, and
 * that wrapper is where the namespace typos happen.
 */
export default { meta: { name: '@vishwakarma/lint', version: '0.1.0' }, rules, configs }
