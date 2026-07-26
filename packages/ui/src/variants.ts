/**
 * A small, typed variant system.
 *
 * The alternative — and the thing this exists to replace — is the conditional class string:
 *
 * ```ts
 * const cls = `btn ${variant === 'primary' ? 'bg-brand-600 text-white' : ''} ${
 *   size === 'sm' ? 'px-2 text-sm' : 'px-4'
 * } ${disabled ? 'opacity-50' : ''}`
 * ```
 *
 * That pattern fails in four ways, all of which are silent. A typo in a variant name
 * (`'primry'`) produces an element with no styling rather than a compile error, and nobody
 * notices until it reaches a screenshot. Removing a variant from the design system leaves
 * dead branches behind, because nothing connects the string `'ghost'` to anything the
 * compiler can see. A consumer cannot discover what values are legal without reading the
 * implementation. And the combinations — "danger *and* small" needing tighter tracking —
 * end up as nested ternaries that are unreadable within a week.
 *
 * Making the variant map the single source of truth fixes all four at once. The keys of the
 * map *are* the type, so a typo is a compile error, an unused variant is a visible deletion,
 * editor autocomplete lists the legal values, and combinations get their own first-class
 * declaration instead of being smuggled into a ternary.
 *
 * What this deliberately does not do is resolve Tailwind conflicts. A merger that knows
 * `px-4` loses to `p-2` has to model every utility family, every arbitrary value, and every
 * plugin, and it re-breaks quietly each time Tailwind adds syntax. The variant map is the
 * answer instead: conflicting utilities should never be generated in the first place,
 * because you select a variant rather than overriding a class. Where an override is genuinely
 * needed, the `className` passed by the caller is appended last, and it is the caller's job
 * to make it specific enough to win.
 */

/** Anything accepted by {@link cx}. Nested arrays are flattened; falsy entries are dropped. */
export type ClassValue = string | number | false | null | undefined | ClassValue[]

/**
 * Join class values into a single class string.
 *
 * Exact duplicates are removed, keeping the *first* occurrence. First rather than last,
 * because the position of a class in the `class` attribute has no effect on which
 * declaration wins — that is decided by the order of the rules in the stylesheet — so the
 * only thing later position can do is scramble the order a human reads.
 */
export function cx(...inputs: ClassValue[]): string {
  const seen = new Set<string>()

  const walk = (value: ClassValue): void => {
    if (!value && value !== 0) return
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry)
      return
    }
    for (const token of String(value).split(/\s+/)) {
      if (token) seen.add(token)
    }
  }

  for (const input of inputs) walk(input)
  return Array.from(seen).join(' ')
}

/**
 * A map of variant groups to their options.
 *
 * The outer key is the prop name (`size`), the inner key is the value (`sm`), and the leaf
 * is the class string applied when that value is selected.
 */
export type VariantGroups = Record<string, Record<string, string>>

/** A choice of one option per group. Every group is optional; omitted groups fall back to defaults. */
export type VariantSelection<G extends VariantGroups> = {
  [K in keyof G]?: keyof G[K] & string
}

/**
 * Extra classes applied only when several variants coincide.
 *
 * This is the case the ternary approach handles worst. Declaring it separately keeps the
 * base maps readable and makes the interaction searchable.
 */
export interface CompoundVariant<G extends VariantGroups> {
  /** Every entry must match the resolved selection for `className` to apply. */
  when: VariantSelection<G>
  /** Classes appended when the condition holds. */
  className: string
}

/** The declaration passed to {@link variants}. */
export interface VariantConfig<G extends VariantGroups> {
  /** Classes always applied, before any variant. */
  base?: string
  /** The variant groups. Their keys become the accepted props and their values the accepted values. */
  variants?: G
  /** Rules applied when a combination of variants is selected. Evaluated in declaration order. */
  compound?: ReadonlyArray<CompoundVariant<G>>
  /** The option used for a group when the caller does not choose one. */
  defaults?: VariantSelection<G>
}

/** The function returned by {@link variants}. */
export interface VariantFunction<G extends VariantGroups> {
  /** Resolve a selection to a class string. `className` is appended last, unmodified. */
  (selection?: VariantSelection<G> & { className?: ClassValue }): string
  /** The declared groups, exposed so tooling and tests can enumerate the legal values. */
  readonly groups: G
  /** The declared defaults. */
  readonly defaults: VariantSelection<G>
}

/**
 * Extract the props accepted by a variant function.
 *
 * Lets a component's prop interface be derived from its style declaration rather than
 * restated beside it, which is the only way to guarantee the two cannot drift apart.
 */
export type VariantProps<F> = F extends VariantFunction<infer G> ? VariantSelection<G> : never

/**
 * Build a typed variant function from a declaration.
 *
 * Resolution order is base, then each group in declaration order, then compound rules in
 * declaration order, then the caller's `className`. That order is part of the contract:
 * anything appended later appears later in the class attribute, which matters for the
 * handful of tools that read class order even though CSS does not.
 */
export function variants<G extends VariantGroups>(config: VariantConfig<G>): VariantFunction<G> {
  const base = config.base ?? ''
  const groups = config.variants ?? ({} as G)
  const compound = config.compound ?? []
  const defaults = config.defaults ?? ({} as VariantSelection<G>)

  // Captured once. Reading `Object.keys` on every call turns a hot render path into a
  // per-render allocation for a value that cannot change after declaration.
  const groupNames = Object.keys(groups) as Array<keyof G & string>

  const resolve = (selection: VariantSelection<G> & { className?: ClassValue } = {}): string => {
    const parts: ClassValue[] = [base]
    const chosen: Record<string, string | undefined> = {}

    for (const name of groupNames) {
      const value = selection[name] ?? defaults[name]
      if (value === undefined) continue
      chosen[name] = value
      // Index access is checked: a group can legitimately omit an option (a `none` variant
      // that contributes nothing is usually written as an empty string, but may be absent).
      parts.push(groups[name]?.[value])
    }

    for (const rule of compound) {
      const conditions = Object.keys(rule.when) as Array<keyof G & string>
      const matches = conditions.every((name) => chosen[name] === rule.when[name])
      if (matches) parts.push(rule.className)
    }

    parts.push(selection.className)
    return cx(parts)
  }

  return Object.assign(resolve, { groups, defaults })
}
