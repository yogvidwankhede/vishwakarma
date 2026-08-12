// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The token schema.
 *
 * A design token is a named decision. That framing does more work than it looks like it
 * does, because it explains why the naming is the entire value and the value is almost
 * incidental. `#3b82f6` is a fact. `colour.action.primary.background` is a decision, and a
 * decision can be revisited in one place, audited for consistency, and reasoned about by
 * something that has never seen the design.
 *
 * The schema is three-tiered, and the middle tier is the one people skip and then regret.
 *
 *   primitive  — raw values with no opinion about use. `blue.500`, `space.4`.
 *   semantic   — a decision about meaning. `action.primary`, `surface.raised`.
 *   component  — a decision about a specific part. `button.primary.background`.
 *
 * Skipping the semantic tier gives you components referencing `blue.500` directly, and
 * then rebranding means finding every use of blue and deciding, one at a time, whether
 * this particular blue meant "primary action" or "informational" or "just happened to be
 * blue". That archaeology is the cost of the missing tier, and it is paid later and by
 * someone else.
 */

/** Every token category we model. */
export type TokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'duration'
  | 'cubicBezier'
  | 'shadow'
  | 'border'
  | 'zIndex'
  | 'opacity'
  | 'typography'
  | 'number'

/**
 * The tier a token belongs to.
 *
 * Enforced rather than documented: the validator rejects a component token that
 * references a primitive directly, because that is exactly the shortcut that hollows out
 * the semantic layer over time.
 */
export type TokenTier = 'primitive' | 'semantic' | 'component'

/** A reference to another token, written as `{path.to.token}`. */
export type TokenReference = string

export interface ShadowValue {
  offsetX: string
  offsetY: string
  blur: string
  spread: string
  color: string
  inset?: boolean
}

export interface TypographyValue {
  fontFamily: TokenReference | string
  fontSize: TokenReference | string
  fontWeight: TokenReference | number
  lineHeight: TokenReference | number
  letterSpacing?: TokenReference | string
}

export interface BorderValue {
  width: string
  style: 'solid' | 'dashed' | 'dotted' | 'none'
  color: string
}

export type TokenValue =
  | string
  | number
  | ShadowValue
  | ShadowValue[]
  | TypographyValue
  | BorderValue

export interface Token {
  /** Dot-delimited path, e.g. `color.action.primary.background`. */
  path: string
  type: TokenType
  tier: TokenTier
  /** A literal value, or a `{reference}` to another token. */
  value: TokenValue | TokenReference
  /**
   * What this token is for, and — more usefully — when *not* to use it. The negative half
   * is what stops a token from sprawling into every context that happens to want that
   * colour.
   */
  description?: string
  /** Per-theme overrides, keyed by theme name. */
  themes?: Record<string, TokenValue | TokenReference>
  /** Marks a token as retired, with a pointer to its replacement. */
  deprecated?: { since: string; use?: string; reason?: string }
  /** Excluded from generated CSS, for tokens that exist only as build-time intermediates. */
  private?: boolean
  extensions?: Record<string, unknown>
}

/** A complete token set. */
export interface TokenSet {
  name: string
  version: string
  description?: string
  tokens: Token[]
  /** Named themes. `default` is implicit and always present. */
  themes?: string[]
  meta?: Record<string, unknown>
}

/* -------------------------------------------------------------------------- */
/* References                                                                  */
/* -------------------------------------------------------------------------- */

const REFERENCE_PATTERN = /^\{([a-zA-Z0-9._-]+)\}$/
const EMBEDDED_REFERENCE_PATTERN = /\{([a-zA-Z0-9._-]+)\}/g

/**
 * True when a value is entirely a reference to another token.
 *
 * Deliberately returns a plain boolean rather than a `value is TokenReference` type
 * predicate. Because `TokenReference` is an alias for `string`, a predicate would narrow
 * the *negative* branch of every call site to `never` — so the code handling a literal
 * string value would become unreachable in the type checker's view while remaining
 * perfectly reachable at runtime. A predicate that makes correct code fail to compile is
 * worse than no predicate.
 */
export function isReference(value: unknown): boolean {
  return typeof value === 'string' && REFERENCE_PATTERN.test(value)
}

/** Extract the target path from `{a.b.c}`. */
export function referenceTarget(value: TokenReference): string {
  const match = REFERENCE_PATTERN.exec(value)
  if (!match) throw new Error(`Not a token reference: ${value}`)
  return match[1] as string
}

/** Every token path referenced anywhere inside a value, including nested object fields. */
export function collectReferences(value: unknown): string[] {
  if (typeof value === 'string') {
    return Array.from(value.matchAll(EMBEDDED_REFERENCE_PATTERN), (m) => m[1] as string)
  }
  if (Array.isArray(value)) return value.flatMap(collectReferences)
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectReferences)
  }
  return []
}

/* -------------------------------------------------------------------------- */
/* Resolution                                                                  */
/* -------------------------------------------------------------------------- */

export interface ResolutionOptions {
  /** Theme to resolve for. Falls back to the base value when a token has no override. */
  theme?: string
  /** Maximum reference depth before we declare a cycle. */
  maxDepth?: number
}

export class TokenResolutionError extends Error {
  constructor(
    message: string,
    readonly path: string,
    readonly chain: string[] = [],
  ) {
    super(message)
    this.name = 'TokenResolutionError'
  }
}

/**
 * Resolve every reference in a token set to a literal value.
 *
 * Cycle detection carries the full chain rather than just reporting "a cycle exists",
 * because in a set of several hundred tokens the chain is the only thing that makes the
 * error fixable.
 */
export function resolveTokens(
  set: TokenSet,
  options: ResolutionOptions = {},
): Map<string, TokenValue> {
  const { theme, maxDepth = 32 } = options
  const byPath = new Map(set.tokens.map((token) => [token.path, token]))
  const resolved = new Map<string, TokenValue>()

  const rawValue = (token: Token): TokenValue | TokenReference => {
    if (theme && token.themes && theme in token.themes) {
      return token.themes[theme] as TokenValue | TokenReference
    }
    return token.value
  }

  const resolveValue = (value: unknown, chain: string[]): unknown => {
    if (typeof value === 'string') {
      if (isReference(value)) return resolveOne(referenceTarget(value), chain)

      // Values can embed references inside a larger string, e.g. a shadow colour
      // expressed as `rgb(from {color.neutral.900} r g b / 0.12)`.
      return value.replace(EMBEDDED_REFERENCE_PATTERN, (match: string, path: string) => {
        const inner = resolveOne(path, chain)
        return typeof inner === 'string' || typeof inner === 'number' ? String(inner) : match
      })
    }
    if (Array.isArray(value)) return value.map((entry) => resolveValue(entry, chain))
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, resolveValue(entry, chain)]),
      )
    }
    return value
  }

  const resolveOne = (path: string, chain: string[]): TokenValue => {
    if (chain.includes(path)) {
      throw new TokenResolutionError(
        `Circular token reference: ${[...chain, path].join(' → ')}`,
        path,
        [...chain, path],
      )
    }
    if (chain.length > maxDepth) {
      throw new TokenResolutionError(
        `Token reference nested more than ${maxDepth} levels deep, which almost certainly indicates a cycle the detector missed.`,
        path,
        chain,
      )
    }

    // Only reuse the cache for the top-level resolution of a token, since a cached value
    // is always fully literal by construction.
    const cached = resolved.get(path)
    if (cached !== undefined) return cached

    const token = byPath.get(path)
    if (!token) {
      throw new TokenResolutionError(`Token "${path}" is referenced but not defined.`, path, chain)
    }

    const value = resolveValue(rawValue(token), [...chain, path]) as TokenValue
    resolved.set(path, value)
    return value
  }

  for (const token of set.tokens) resolveOne(token.path, [])
  return resolved
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export interface TokenIssue {
  path: string
  message: string
  severity: 'error' | 'warning'
}

const TIER_RANK: Record<TokenTier, number> = { primitive: 0, semantic: 1, component: 2 }

/**
 * Validate a token set.
 *
 * The tier rule is the interesting one and deserves stating plainly: a token may only
 * reference a token in the tier immediately below it, or its own tier. A component token
 * pointing straight at a primitive is legal CSS and a design-system smell, because it
 * bypasses the layer where meaning lives — and once one component does it, the pattern
 * spreads, and the semantic layer quietly becomes decorative.
 */
export function validateTokenSet(set: TokenSet): TokenIssue[] {
  const issues: TokenIssue[] = []
  const byPath = new Map(set.tokens.map((token) => [token.path, token]))
  const seen = new Set<string>()

  for (const token of set.tokens) {
    if (seen.has(token.path)) {
      issues.push({ path: token.path, message: 'Duplicate token path.', severity: 'error' })
    }
    seen.add(token.path)

    if (!token.path.includes('.')) {
      issues.push({
        path: token.path,
        message: 'Token paths should be namespaced, e.g. "color.action.primary".',
        severity: 'warning',
      })
    }

    for (const target of collectReferences(token.value)) {
      const referenced = byPath.get(target)
      if (!referenced) {
        issues.push({
          path: token.path,
          message: `References undefined token "${target}".`,
          severity: 'error',
        })
        continue
      }

      const gap = TIER_RANK[token.tier] - TIER_RANK[referenced.tier]
      if (gap < 0) {
        issues.push({
          path: token.path,
          message: `A ${token.tier} token must not reference the higher tier "${target}" (${referenced.tier}). References flow downward only.`,
          severity: 'error',
        })
      } else if (gap > 1) {
        issues.push({
          path: token.path,
          message: `A ${token.tier} token reaches past the semantic layer to reach the primitive "${target}". Introduce a semantic token for this decision instead.`,
          severity: 'warning',
        })
      }

      if (referenced.deprecated) {
        issues.push({
          path: token.path,
          message: `References deprecated token "${target}"${referenced.deprecated.use ? `; use "${referenced.deprecated.use}"` : ''}.`,
          severity: 'warning',
        })
      }
    }

    if (token.tier === 'primitive' && collectReferences(token.value).length > 0) {
      issues.push({
        path: token.path,
        message: 'Primitive tokens should hold literal values, not references.',
        severity: 'warning',
      })
    }

    if (!token.description && token.tier !== 'primitive') {
      issues.push({
        path: token.path,
        message:
          'Semantic and component tokens need a description saying what they are for, and ideally when not to use them.',
        severity: 'warning',
      })
    }
  }

  // Resolution catches cycles that path-level checks cannot see.
  try {
    resolveTokens(set)
  } catch (error) {
    if (error instanceof TokenResolutionError) {
      issues.push({ path: error.path, message: error.message, severity: 'error' })
    } else {
      throw error
    }
  }

  return issues
}

/** Find tokens that nothing references and nothing appears to use. */
export function findOrphanTokens(set: TokenSet): string[] {
  const referenced = new Set(set.tokens.flatMap((token) => collectReferences(token.value)))
  return set.tokens
    .filter((token) => token.tier !== 'component' && !referenced.has(token.path))
    .map((token) => token.path)
}

/** Group tokens by their top-level namespace, for documentation and CLI output. */
export function groupTokens(set: TokenSet): Map<string, Token[]> {
  const groups = new Map<string, Token[]>()
  for (const token of set.tokens) {
    const namespace = token.path.split('.')[0] as string
    const existing = groups.get(namespace)
    if (existing) existing.push(token)
    else groups.set(namespace, [token])
  }
  return groups
}
