// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/tokens
 *
 * The token schema, the default set, and the transforms that turn one authored source of
 * truth into CSS, a Tailwind v4 theme, typed TypeScript, JSON, and documentation.
 */

export { type BrandInput, buildTokenSet, defaultTokenSet } from './default-set.js'
export {
  type BorderValue,
  collectReferences,
  findOrphanTokens,
  groupTokens,
  isReference,
  type ResolutionOptions,
  referenceTarget,
  resolveTokens,
  type ShadowValue,
  type Token,
  type TokenIssue,
  type TokenReference,
  TokenResolutionError,
  type TokenSet,
  type TokenTier,
  type TokenType,
  type TokenValue,
  type TypographyValue,
  validateTokenSet,
} from './schema.js'

export {
  type CssOptions,
  type JsonOptions,
  type NamingOptions,
  serialiseCssValue,
  type TailwindOptions,
  type TypeScriptOptions,
  toCss,
  toCssVariableName,
  toJson,
  toMarkdown,
  toTailwindTheme,
  toTsPath,
  toTypeScript,
} from './transform.js'
