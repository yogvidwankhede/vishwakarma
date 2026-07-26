// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/tokens
 *
 * The token schema, the default set, and the transforms that turn one authored source of
 * truth into CSS, a Tailwind v4 theme, typed TypeScript, JSON, and documentation.
 */

export {
  type Token,
  type TokenSet,
  type TokenType,
  type TokenTier,
  type TokenValue,
  type TokenReference,
  type ShadowValue,
  type TypographyValue,
  type BorderValue,
  type TokenIssue,
  type ResolutionOptions,
  TokenResolutionError,
  isReference,
  referenceTarget,
  collectReferences,
  resolveTokens,
  validateTokenSet,
  findOrphanTokens,
  groupTokens,
} from './schema.js'

export { type BrandInput, buildTokenSet, defaultTokenSet } from './default-set.js'

export {
  type NamingOptions,
  type CssOptions,
  type TailwindOptions,
  type TypeScriptOptions,
  type JsonOptions,
  toCssVariableName,
  toTsPath,
  serialiseCssValue,
  toCss,
  toTailwindTheme,
  toTypeScript,
  toJson,
  toMarkdown,
} from './transform.js'
