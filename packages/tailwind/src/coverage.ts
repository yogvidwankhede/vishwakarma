/**
 * Auditing which tokens actually became utilities.
 *
 * The failure this exists to catch has no symptom. A token that maps to no Tailwind
 * namespace is not an error, does not warn, and does not stop the build; the variable is
 * emitted, devtools shows it holding exactly the right value, and the class that was
 * supposed to use it simply does not exist. Tailwind's own diagnosis for an unknown class is
 * silence, because in a framework where any string might be a class name, refusing to
 * generate one is the normal case. So the report reads "my Tailwind theme isn't working",
 * and the actual cause is a token named `brand.primary` instead of `color.brand.primary`.
 *
 * Three outcomes are distinguished, and the middle one is the interesting one:
 *
 *   utility        the variable is in a namespace and classes were generated.
 *   variable-only  the variable is emitted but Tailwind has no namespace for the concept,
 *                  so it is reachable from `var()` and arbitrary values and nowhere else.
 *                  Durations and z-index live here permanently.
 *   unmapped       nothing was emitted at all.
 *
 * A type mismatch is reported separately because it is a different mistake with the same
 * silence: `color.border.width` maps cleanly into the colour namespace and produces
 * `bg-border-width`, a class that sets a background to `1px`. It generates, it is just
 * nonsense, and only the token's declared type reveals that.
 *
 * Collisions are the third silent failure. Two token paths can flatten onto one theme
 * variable — `motion.curve.exit` and `motion.easing.exit` both want `--ease-exit` — and
 * CSS resolves that by letting the last declaration win. One of the two tokens then has no
 * effect on anything, and because both classes exist and both produce a plausible value,
 * nothing looks wrong until someone changes the losing token and observes that editing it
 * does nothing.
 */

import type { TokenSet, TokenTier, TokenType } from '@vishwakarma/tokens'
import {
  mapTokenPath,
  NAMESPACE_UTILITIES,
  type NamespaceOverride,
  type TailwindNamespace,
} from './namespaces.js'

/** What became of one token. */
export type CoverageStatus = 'utility' | 'variable-only' | 'unmapped'

/** Why a warning was raised. */
export type CoverageWarningKind = 'unmapped' | 'variable-only' | 'type-mismatch' | 'collision'

/** The token types each namespace can sensibly hold. */
const NAMESPACE_TYPES: Partial<Record<TailwindNamespace, readonly TokenType[]>> = {
  color: ['color'],
  spacing: ['dimension', 'number'],
  radius: ['dimension', 'number'],
  text: ['fontSize', 'dimension'],
  font: ['fontFamily'],
  'font-weight': ['fontWeight', 'number'],
  tracking: ['letterSpacing', 'dimension'],
  leading: ['lineHeight', 'number', 'dimension'],
  shadow: ['shadow'],
  'inset-shadow': ['shadow'],
  'drop-shadow': ['shadow'],
  ease: ['cubicBezier'],
  breakpoint: ['dimension'],
  container: ['dimension'],
  blur: ['dimension'],
  aspect: ['number', 'dimension'],
}

/** One token's fate. */
export interface TokenCoverage {
  path: string
  type: TokenType
  tier: TokenTier
  status: CoverageStatus
  /** The generated theme variable, when there is one. */
  variable?: string
  /** The namespace it landed in, when it landed in one. */
  namespace?: TailwindNamespace
  /** Which classes that namespace produces. */
  utilities?: string
  /** Why it produced no utilities. */
  reason?: string
}

/** A problem worth someone's attention. */
export interface CoverageWarning {
  kind: CoverageWarningKind
  /** Token paths involved. Grouped, because one missing prefix usually affects dozens. */
  paths: string[]
  message: string
  /** What to do about it. */
  remedy: string
}

/** The result of {@link checkCoverage}. */
export interface CoverageReport {
  /** Tokens considered, after private tokens are filtered out. */
  total: number
  /** How many produced utilities. */
  utilityCount: number
  /** How many were emitted as plain variables. */
  variableOnlyCount: number
  /** How many produced nothing. */
  unmappedCount: number
  /** Every token, in set order. */
  entries: TokenCoverage[]
  warnings: CoverageWarning[]
  /** Count of utility-producing tokens per namespace, for a quick sanity check. */
  namespaceCounts: Array<{ namespace: TailwindNamespace; count: number }>
}

export interface CoverageOptions {
  /** Mapping overrides, which must match the ones passed to the preset builder. */
  namespaces?: Readonly<Record<string, NamespaceOverride>>
  /** Ignore tokens marked private, as the theme builder does. On by default. */
  skipPrivate?: boolean
}

/** The token path prefix a group of unmapped tokens shares, for a readable warning. */
function groupKey(path: string): string {
  const segments = path.split('.')
  return segments.length > 1 ? `${segments[0] ?? path}.*` : path
}

/**
 * Check which tokens reach Tailwind, and complain about the ones that do not.
 *
 * Pure and cheap: call it from the token build, from a test, or from the CLI. It takes the
 * same `namespaces` overrides as the preset builder, and passing different ones to each is
 * the one way to make this report actively misleading — so pass the same options object to
 * both rather than two objects that happen to agree today.
 */
export function checkCoverage(set: TokenSet, options: CoverageOptions = {}): CoverageReport {
  const { namespaces = {}, skipPrivate = true } = options

  const entries: TokenCoverage[] = []
  const unmapped = new Map<string, string[]>()
  const variableOnly = new Map<string, { paths: string[]; reason: string }>()
  const mismatched: Array<{ path: string; type: TokenType; namespace: TailwindNamespace }> = []
  const counts = new Map<TailwindNamespace, number>()
  const byVariable = new Map<string, string[]>()

  const claim = (variable: string, path: string): void => {
    const existing = byVariable.get(variable)
    if (existing) existing.push(path)
    else byVariable.set(variable, [path])
  }

  for (const token of set.tokens) {
    if (skipPrivate && token.private) continue

    const mapping = mapTokenPath(token.path, namespaces)

    if (!mapping) {
      entries.push({ path: token.path, type: token.type, tier: token.tier, status: 'unmapped' })
      const key = groupKey(token.path)
      const existing = unmapped.get(key)
      if (existing) existing.push(token.path)
      else unmapped.set(key, [token.path])
      continue
    }

    claim(mapping.variable, token.path)

    if (mapping.namespace === null) {
      const reason = mapping.note ?? 'Tailwind has no namespace for this concept.'
      entries.push({
        path: token.path,
        type: token.type,
        tier: token.tier,
        status: 'variable-only',
        variable: mapping.variable,
        reason,
      })
      const key = groupKey(token.path)
      const existing = variableOnly.get(key)
      if (existing) existing.paths.push(token.path)
      else variableOnly.set(key, { paths: [token.path], reason })
      continue
    }

    entries.push({
      path: token.path,
      type: token.type,
      tier: token.tier,
      status: 'utility',
      variable: mapping.variable,
      namespace: mapping.namespace,
      utilities: NAMESPACE_UTILITIES[mapping.namespace],
    })
    counts.set(mapping.namespace, (counts.get(mapping.namespace) ?? 0) + 1)

    const allowed = NAMESPACE_TYPES[mapping.namespace]
    if (allowed && !allowed.includes(token.type)) {
      mismatched.push({ path: token.path, type: token.type, namespace: mapping.namespace })
    }
  }

  const warnings: CoverageWarning[] = []

  for (const [key, paths] of unmapped) {
    warnings.push({
      kind: 'unmapped',
      paths,
      message: `${paths.length} token${paths.length === 1 ? '' : 's'} under "${key}" map to no Tailwind namespace, so nothing is emitted for them and no utility exists. This is silent at build time: the classes simply do not resolve.`,
      remedy: `Rename the prefix to one the default rules recognise, or map it explicitly with namespaces: { "${key.replace(/\.\*$/, '')}": "<namespace>" } — passing the same object to buildPreset and checkCoverage.`,
    })
  }

  for (const [variable, paths] of byVariable) {
    if (paths.length < 2) continue
    warnings.push({
      kind: 'collision',
      paths,
      message: `${paths.length} tokens flatten onto "${variable}". CSS keeps the last declaration, so the others have no effect and editing them changes nothing.`,
      remedy:
        'Rename one of the token paths, or override the mapping so they land on different variables. Whichever you choose, do it now: the collision is invisible until someone spends an afternoon on the token that does not work.',
    })
  }

  for (const [key, group] of variableOnly) {
    warnings.push({
      kind: 'variable-only',
      paths: group.paths,
      message: `${group.paths.length} token${group.paths.length === 1 ? '' : 's'} under "${key}" are emitted as theme variables but generate no utilities. ${group.reason}`,
      remedy:
        'Either reach them through an arbitrary value, or accept that they are for hand-written CSS and stop looking for the class.',
    })
  }

  for (const entry of mismatched) {
    warnings.push({
      kind: 'type-mismatch',
      paths: [entry.path],
      message: `"${entry.path}" is a ${entry.type} token but lands in the --${entry.namespace}-* namespace. The utility will generate and will be meaningless.`,
      remedy: `Move it out of the ${entry.namespace} prefix, or override the mapping for this path.`,
    })
  }

  const namespaceCounts = Array.from(counts, ([namespace, count]) => ({ namespace, count })).sort(
    (a, b) => b.count - a.count,
  )

  return {
    total: entries.length,
    utilityCount: entries.filter((entry) => entry.status === 'utility').length,
    variableOnlyCount: entries.filter((entry) => entry.status === 'variable-only').length,
    unmappedCount: entries.filter((entry) => entry.status === 'unmapped').length,
    entries,
    warnings,
    namespaceCounts,
  }
}

/**
 * Render a coverage report as plain text.
 *
 * Deliberately not colourised and not clever: this goes into CI logs, GitHub comments and
 * agent context as often as it goes into a terminal, and escape codes are noise in two of
 * those three.
 */
export function formatCoverage(report: CoverageReport): string {
  const lines: string[] = []

  lines.push(
    `${report.total} tokens: ${report.utilityCount} generate utilities, ${report.variableOnlyCount} variable-only, ${report.unmappedCount} unmapped.`,
  )

  if (report.namespaceCounts.length > 0) {
    lines.push('')
    for (const { namespace, count } of report.namespaceCounts) {
      lines.push(`  --${namespace}-*  ${count}`)
    }
  }

  if (report.warnings.length === 0) {
    lines.push('', 'No coverage warnings.')
    return `${lines.join('\n')}\n`
  }

  for (const warning of report.warnings) {
    lines.push('', `[${warning.kind}] ${warning.message}`, `  → ${warning.remedy}`)

    // Listing every path in a set of several hundred tokens buries the message it belongs
    // to, so show enough to recognise the group and count the rest.
    const shown = warning.paths.slice(0, 6)
    for (const path of shown) lines.push(`     ${path}`)
    if (warning.paths.length > shown.length) {
      lines.push(`     …and ${warning.paths.length - shown.length} more`)
    }
  }

  return `${lines.join('\n')}\n`
}

/**
 * Which warnings a build should refuse to ship.
 *
 * `variable-only` is excluded because durations and z-index live there permanently and a
 * build that failed on them would fail forever. `collision` is excluded because the common
 * case is benign — a semantic token aliasing the primitive it points at, so both
 * declarations carry the same value — and failing on a legitimate pattern trains people to
 * pass the flag that turns the whole check off.
 */
const DEFAULT_FATAL: readonly CoverageWarningKind[] = ['unmapped', 'type-mismatch']

/**
 * Coverage as a hard failure, for build scripts that would rather not ship a theme with
 * holes in it.
 */
export function assertCoverage(
  set: TokenSet,
  options: CoverageOptions & { fatal?: readonly CoverageWarningKind[] } = {},
): CoverageReport {
  const fatalKinds = new Set(options.fatal ?? DEFAULT_FATAL)
  const report = checkCoverage(set, options)
  if (report.warnings.some((warning) => fatalKinds.has(warning.kind))) {
    throw new Error(`Token coverage check failed.\n\n${formatCoverage(report)}`)
  }
  return report
}
