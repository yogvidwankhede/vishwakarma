/**
 * The map from token paths to Tailwind v4 theme namespaces.
 *
 * Tailwind v4 has no JavaScript configuration object. A theme is a set of CSS custom
 * properties declared inside `@theme`, and the *name* of each property is what decides
 * which utilities exist. `--color-brand-500` generates `bg-brand-500`, `text-brand-500`,
 * `border-brand-500` and the rest of the colour family. `--brand-500` generates nothing at
 * all. It is not an error, it produces no warning, and the variable is still emitted into
 * `:root`, so a quick look in devtools shows the value sitting there exactly as expected
 * while every class using it is missing. That single asymmetry — valid variable, absent
 * utility — is the most common reason a token pipeline appears not to work, which is why
 * this table is the load-bearing part of the package and why {@link checkCoverage} exists
 * to audit it.
 *
 * The namespaces below are Tailwind's, not ours; we cannot invent new ones. A variable
 * named outside them is still useful — it is reachable from arbitrary values, from
 * `var()` in hand-written CSS, and from our own `@utility` definitions via `--value()` —
 * but it is not a utility, and a token author who assumed otherwise deserves to be told.
 *
 * One naming consequence worth stating in advance: token path segments are lowercased and
 * camelCase is split on the case boundary, so `font.lineHeight.base` becomes
 * `--leading-base` and a segment already containing a hyphen keeps it. A token authored as
 * `space.0-5` therefore yields `p-0-5`, not `p-0.5`. Mechanically derivable is worth more
 * here than familiar, because the alternative is a lookup table nobody maintains.
 */

/**
 * The namespaces Tailwind v4 recognises inside `@theme`.
 *
 * Kept as a closed union rather than `string`, so that a typo in a mapping is a compile
 * error here instead of a silently missing utility in someone's application.
 */
export type TailwindNamespace =
  | 'color'
  | 'font'
  | 'text'
  | 'font-weight'
  | 'tracking'
  | 'leading'
  | 'breakpoint'
  | 'container'
  | 'spacing'
  | 'radius'
  | 'shadow'
  | 'inset-shadow'
  | 'drop-shadow'
  | 'blur'
  | 'perspective'
  | 'aspect'
  | 'ease'
  | 'animate'

/**
 * What each namespace actually buys you.
 *
 * Used in coverage output. A report that says "mapped to `--text-*`" is far less useful to
 * someone debugging than one that says which classes that produces.
 */
export const NAMESPACE_UTILITIES: Record<TailwindNamespace, string> = {
  color: 'bg-*, text-*, border-*, fill-*, stroke-*, ring-*, and the rest of the colour family',
  font: 'font-* (family)',
  text: 'text-* (size)',
  'font-weight': 'font-* (weight)',
  tracking: 'tracking-*',
  leading: 'leading-*',
  breakpoint: 'responsive variants such as md:*',
  container: 'max-w-* and @container queries',
  spacing: 'p-*, m-*, gap-*, w-*, h-*, inset-*, and every other spacing utility',
  radius: 'rounded-*',
  shadow: 'shadow-*',
  'inset-shadow': 'inset-shadow-*',
  'drop-shadow': 'drop-shadow-*',
  blur: 'blur-*',
  perspective: 'perspective-*',
  aspect: 'aspect-*',
  ease: 'ease-*',
  animate: 'animate-*',
}

/**
 * How a token path is turned into a theme variable.
 *
 * `namespace` is `null` for prefixes we deliberately emit as plain variables because
 * Tailwind has no namespace for the concept. Durations and z-index are the two that catch
 * everybody: `duration-*` and `z-*` are real utilities, but in v4 they take bare and
 * arbitrary values rather than reading a theme namespace, so `--duration-brisk` never
 * becomes `duration-brisk`.
 */
export interface NamespaceRule {
  /** Dot-delimited token path prefix. The longest matching prefix wins. */
  readonly prefix: string
  /** Tailwind namespace, or `null` when the variable generates no utilities. */
  readonly namespace: TailwindNamespace | null
  /** Variable prefix to use when `namespace` is `null`. */
  readonly variable?: string
  /** Shown in coverage output when `namespace` is `null`. */
  readonly note?: string
}

/**
 * The default mapping, ordered by specificity of the prefix.
 *
 * `font` is split across four namespaces because Tailwind splits it: family, size, weight
 * and tracking are separate concepts with separate utility families, and a token set that
 * nests them all under `font.*` would otherwise collapse into one.
 */
export const NAMESPACE_RULES: readonly NamespaceRule[] = [
  { prefix: 'font.family', namespace: 'font' },
  { prefix: 'font.size', namespace: 'text' },
  { prefix: 'font.weight', namespace: 'font-weight' },
  { prefix: 'font.tracking', namespace: 'tracking' },
  { prefix: 'font.letterSpacing', namespace: 'tracking' },
  { prefix: 'font.lineHeight', namespace: 'leading' },
  { prefix: 'font.leading', namespace: 'leading' },
  { prefix: 'motion.curve', namespace: 'ease' },
  { prefix: 'motion.easing', namespace: 'ease' },
  {
    prefix: 'motion.duration',
    namespace: null,
    variable: 'duration',
    note: 'Tailwind v4 has no --duration-* namespace; duration utilities take bare values. Reach this one with duration-[var(--duration-name)] or bind it to --default-transition-duration.',
  },
  { prefix: 'color', namespace: 'color' },
  { prefix: 'space', namespace: 'spacing' },
  { prefix: 'spacing', namespace: 'spacing' },
  { prefix: 'radius', namespace: 'radius' },
  { prefix: 'elevation', namespace: 'shadow' },
  { prefix: 'shadow', namespace: 'shadow' },
  { prefix: 'breakpoint', namespace: 'breakpoint' },
  { prefix: 'container', namespace: 'container' },
  { prefix: 'blur', namespace: 'blur' },
  { prefix: 'aspect', namespace: 'aspect' },
  { prefix: 'animation', namespace: 'animate' },
  {
    prefix: 'layer',
    namespace: null,
    variable: 'z',
    note: 'Tailwind v4 has no --z-* namespace; z-index utilities take bare values. Reach this one with z-[var(--z-name)], which also keeps the documented stacking order visible in the markup.',
  },
  {
    // Deliberately last-resort and deliberately a duration: everything left under `motion`
    // once curves and easings have been claimed is a length of time. A semantic token such
    // as `motion.enter` would otherwise map to nothing at all, which is the one outcome
    // worse than mapping to a namespace with no utilities.
    prefix: 'motion',
    namespace: null,
    variable: 'duration',
    note: 'Tailwind v4 has no --duration-* namespace; duration utilities take bare values. Reach this one with duration-[var(--duration-name)] or bind it to --default-transition-duration.',
  },
  {
    prefix: 'opacity',
    namespace: null,
    variable: 'opacity',
    note: 'Opacity utilities take bare percentages in v4. Reach this one with opacity-[var(--opacity-name)].',
  },
]

/**
 * A per-token override, keyed by token path prefix.
 *
 * A bare namespace name remaps the prefix. A string starting with `--` emits the token as a
 * plain variable under that prefix, generating no utilities. `null` drops the token from
 * the theme entirely, which is the right answer for build-time intermediates that would
 * otherwise pollute autocomplete.
 */
export type NamespaceOverride = TailwindNamespace | `--${string}` | null

/** Lowercase a path segment and split camelCase, so `lineHeight` becomes `line-height`. */
export function toVariableSegment(segment: string): string {
  return segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/** Where a token ended up, and whether that position generates anything. */
export interface TokenMapping {
  /** The token path this came from. */
  path: string
  /** The generated theme variable, including leading dashes. */
  variable: string
  /** The Tailwind namespace, or `null` when the variable generates no utilities. */
  namespace: TailwindNamespace | null
  /** Whether Tailwind will generate utility classes from this variable. */
  generatesUtilities: boolean
  /** Why not, when it does not. */
  note?: string
}

function matches(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}.`)
}

/**
 * Map one token path onto a theme variable.
 *
 * Returns `null` when the path matches nothing, which is a genuinely different outcome from
 * matching a `namespace: null` rule: the first means we have no opinion and the token is
 * dropped, the second means we deliberately emit it knowing no utility follows.
 *
 * Prefix matching is longest-first rather than first-match, so `font.size` wins over `font`
 * regardless of how the rules happen to be ordered in the array. Relying on array order for
 * that is a bug waiting for the first person who appends a rule to the end of the list.
 */
export function mapTokenPath(
  path: string,
  overrides: Readonly<Record<string, NamespaceOverride>> = {},
): TokenMapping | null {
  let bestPrefix: string | null = null
  let bestOverride: NamespaceOverride | undefined
  let bestRule: NamespaceRule | undefined

  for (const [prefix, override] of Object.entries(overrides)) {
    if (!matches(path, prefix)) continue
    if (bestPrefix === null || prefix.length > bestPrefix.length) {
      bestPrefix = prefix
      bestOverride = override
      bestRule = undefined
    }
  }

  for (const rule of NAMESPACE_RULES) {
    if (!matches(path, rule.prefix)) continue
    // An override at an equal or longer prefix beats the built-in rule; a longer built-in
    // prefix beats a shorter override.
    if (bestPrefix !== null && bestPrefix.length >= rule.prefix.length) continue
    bestPrefix = rule.prefix
    bestRule = rule
    bestOverride = undefined
  }

  if (bestPrefix === null) return null
  if (bestOverride === null) return null

  const remainder = path === bestPrefix ? [] : path.slice(bestPrefix.length + 1).split('.')
  const suffix = remainder.map(toVariableSegment).join('-')

  if (bestOverride !== undefined) {
    const isPlain = bestOverride.startsWith('--')
    const prefixName = isPlain ? bestOverride.slice(2) : bestOverride
    return {
      path,
      variable: suffix ? `--${prefixName}-${suffix}` : `--${prefixName}`,
      namespace: isPlain ? null : (bestOverride as TailwindNamespace),
      generatesUtilities: !isPlain,
      ...(isPlain
        ? { note: 'Mapped by configuration to a namespace Tailwind does not know.' }
        : {}),
    }
  }

  if (!bestRule) return null

  const prefixName = bestRule.namespace ?? bestRule.variable ?? toVariableSegment(bestPrefix)
  return {
    path,
    variable: suffix ? `--${prefixName}-${suffix}` : `--${prefixName}`,
    namespace: bestRule.namespace,
    generatesUtilities: bestRule.namespace !== null,
    ...(bestRule.note !== undefined ? { note: bestRule.note } : {}),
  }
}
