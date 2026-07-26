/**
 * The `@theme` block.
 *
 * This is where tokens become utilities. Two decisions in here account for almost every
 * "my theme isn't working" report, and both are invisible from the outside.
 *
 * The first is `inline`. A plain `@theme` declares `--color-surface-default:
 * var(--vk-color-surface-default)` and makes `bg-surface-default` reference
 * `--color-surface-default`. The substitution therefore happens once, in the scope where the
 * theme variable is declared: the root. With `[data-theme="dark"]` on `<html>` that is the
 * same element, so it works, which is why the mistake survives review. It breaks the first
 * time someone scopes a theme to a region — a dark footer on a light page, a light popover
 * inside a dark shell. Inside that region the token variable has changed, but the theme
 * variable was resolved at the root and is inherited as an already-computed value, so the
 * utility keeps painting the outer theme's colour. Nothing in the region's own CSS explains
 * it. `@theme inline` substitutes the value into the utility instead, so the class compiles
 * to `background-color: var(--vk-color-surface-default)` and resolves against the element it
 * actually lands on.
 *
 * The second is that we emit references rather than literals at all. Resolving a token to
 * `oklch(0.62 0.18 258)` at build time produces a stylesheet in which dark mode is not
 * merely broken but impossible: there is no longer anything for a theme to override. Pass
 * `referenceRuntimeVariables: false` only when generating a static artefact — a design
 * export, a screenshot fixture — that will never be themed.
 */

import { resolveTokens, serialiseCssValue } from '@vishwakarma/tokens'
import type { TokenSet, TokenValue } from '@vishwakarma/tokens'
import { commentBlock, divider, note } from './format.js'
import { mapTokenPath, NAMESPACE_UTILITIES, type NamespaceOverride } from './namespaces.js'
import { fallbackRef, runtimeRef, tokenIndex, type NamingOptions } from './refs.js'

export interface ThemeOptions extends NamingOptions {
  /**
   * Point theme variables at the runtime token variables rather than at literal values.
   *
   * On by default. See the note at the top of this module for what turning it off costs.
   */
  referenceRuntimeVariables?: boolean
  /**
   * Emit `@theme inline`. Defaults to whatever `referenceRuntimeVariables` is, because the
   * two are the same decision seen from either end: inline only matters when the values are
   * references, and references only survive scoped theming when inline is on.
   */
  inline?: boolean
  /**
   * Emit `@theme static`, forcing every variable into the output whether or not a utility
   * uses it.
   *
   * Off by default. Turn it on if application code reads theme variables directly —
   * `getComputedStyle(el).getPropertyValue('--color-brand-500')` returns an empty string for
   * a variable Tailwind decided nothing was using, and that is a miserable thing to debug.
   * Reading the `--vk-*` token variables instead avoids the question entirely, since the
   * token stylesheet is not subject to Tailwind's pruning.
   */
  staticTheme?: boolean
  /** Per-prefix mapping overrides. See {@link NamespaceOverride}. */
  namespaces?: Readonly<Record<string, NamespaceOverride>>
  /** Skip tokens marked private. On by default. */
  skipPrivate?: boolean
  /** Bind Tailwind's `--default-*` variables to the matching tokens. On by default. */
  includeDefaults?: boolean
  /** Emit the lookup namespaces the custom utilities read. On by default. */
  includeSupportNamespaces?: boolean
}

/**
 * Surface levels, in the order a designer would name them.
 *
 * The elevation column is what makes this a system rather than a palette: a level is a
 * background *and* the shadow that belongs with it, and separating the two is how you end
 * up with a floating panel wearing a raised shadow. Levels whose background token is absent
 * from the set are skipped rather than faked, so a custom token set gets fewer levels rather
 * than broken ones.
 */
const SURFACE_LEVELS: ReadonlyArray<{
  readonly name: string
  readonly background: string
  readonly ink: string
  readonly edge: string
  readonly elevation: string
}> = [
  {
    name: 'canvas',
    background: 'color.surface.canvas',
    ink: 'color.text.primary',
    edge: 'color.border.subtle',
    elevation: 'elevation.flat',
  },
  {
    name: 'default',
    background: 'color.surface.default',
    ink: 'color.text.primary',
    edge: 'color.border.default',
    elevation: 'elevation.flat',
  },
  {
    name: 'subtle',
    background: 'color.surface.subtle',
    ink: 'color.text.secondary',
    edge: 'color.border.subtle',
    elevation: 'elevation.flat',
  },
  {
    name: 'raised',
    background: 'color.surface.raised',
    ink: 'color.text.primary',
    edge: 'color.border.subtle',
    elevation: 'elevation.raised',
  },
  {
    name: 'floating',
    background: 'color.surface.raised',
    ink: 'color.text.primary',
    edge: 'color.border.subtle',
    elevation: 'elevation.floating',
  },
  {
    name: 'overlay',
    background: 'color.surface.raised',
    ink: 'color.text.primary',
    edge: 'color.border.default',
    elevation: 'elevation.overlay',
  },
  {
    name: 'inverse',
    background: 'color.surface.inverse',
    ink: 'color.text.inverse',
    edge: 'color.border.strong',
    elevation: 'elevation.flat',
  },
]

/**
 * Measure steps, in characters.
 *
 * 45 to 75 characters is the range within which the eye can return to the start of the next
 * line without losing its place; 66 is the usual target. These are `ch` rather than `rem`
 * because the constraint is a count of characters, and a fixed rem width silently becomes
 * the wrong measure the moment the font changes.
 */
const MEASURE_STEPS: ReadonlyArray<readonly [string, string]> = [
  ['narrow', '45ch'],
  ['base', '66ch'],
  ['wide', '75ch'],
  ['none', 'none'],
]

interface Group {
  readonly heading: string
  readonly detail: string | undefined
  readonly lines: string[]
}

/**
 * Build the `@theme` block for a token set.
 *
 * Tokens that map to no namespace are omitted here and reported by {@link checkCoverage};
 * emitting them under an invented namespace would be worse than dropping them, because a
 * variable that looks like a utility and is not is harder to notice than one that is simply
 * absent.
 */
export function buildThemeBlock(set: TokenSet, options: ThemeOptions = {}): string {
  const {
    referenceRuntimeVariables = true,
    inline = referenceRuntimeVariables,
    staticTheme = false,
    namespaces = {},
    skipPrivate = true,
    includeDefaults = true,
    includeSupportNamespaces = true,
  } = options

  const resolved = referenceRuntimeVariables ? null : resolveTokens(set)
  const index = tokenIndex(set)
  const groups = new Map<string, Group>()

  const push = (key: string, heading: string, detail: string | undefined, line: string): void => {
    const existing = groups.get(key)
    if (existing) existing.lines.push(line)
    else groups.set(key, { heading, detail, lines: [line] })
  }

  for (const token of set.tokens) {
    if (skipPrivate && token.private) continue

    const mapping = mapTokenPath(token.path, namespaces)
    if (!mapping) continue

    const value = referenceRuntimeVariables
      ? runtimeRef(token.path, options)
      : serialiseCssValue(resolved?.get(token.path) as TokenValue, options)

    const key = mapping.namespace ?? mapping.variable.split('-')[2] ?? mapping.variable
    const heading = mapping.namespace
      ? `--${mapping.namespace}-* — ${NAMESPACE_UTILITIES[mapping.namespace]}`
      : `${mapping.variable.replace(/-[^-]*$/, '')}-* — no utilities`

    push(key, heading, mapping.note, `  ${mapping.variable}: ${value};`)
  }

  if (includeSupportNamespaces) {
    for (const [name, width] of MEASURE_STEPS) {
      push(
        'measure',
        '--measure-* — read by the measure-* utility',
        undefined,
        `  --measure-${name}: ${width};`,
      )
    }

    for (const level of SURFACE_LEVELS) {
      if (!index.has(level.background)) continue
      push(
        'surface',
        '--surface-*, --ink-*, --edge-*, --elevation-* — read by the surface-* utility',
        undefined,
        `  --surface-${level.name}: ${runtimeRef(level.background, options)};`,
      )
      push('surface', '', undefined, `  --ink-${level.name}: ${fallbackRef(level.ink, 'inherit', options)};`)
      push(
        'surface',
        '',
        undefined,
        `  --edge-${level.name}: ${fallbackRef(level.edge, 'currentColor', options)};`,
      )
      push(
        'surface',
        '',
        undefined,
        `  --elevation-${level.name}: ${fallbackRef(level.elevation, 'none', options)};`,
      )
    }
  }

  if (includeDefaults) {
    const defaults: ReadonlyArray<readonly [string, string, string]> = [
      ['--default-font-family', 'font.family.sans', 'inherit'],
      ['--default-mono-font-family', 'font.family.mono', 'inherit'],
      ['--default-transition-duration', 'motion.duration.quick', '150ms'],
      ['--default-transition-timing-function', 'motion.curve.standard', 'ease'],
    ]
    for (const [variable, path, fallback] of defaults) {
      if (!index.has(path)) continue
      push(
        'defaults',
        "--default-* — Tailwind's own fallbacks, bound to tokens",
        'Without these, `transition` and `duration` classes keep Tailwind’s defaults and drift away from every motion token in the set.',
        `  ${variable}: ${fallbackRef(path, fallback, options)};`,
      )
    }
  }

  const keywords = [inline ? 'inline' : null, staticTheme ? 'static' : null].filter(Boolean).join(' ')
  const header = keywords ? `@theme ${keywords} {` : '@theme {'

  const body: string[] = []
  let first = true
  for (const group of groups.values()) {
    if (!first) body.push('')
    first = false
    if (group.heading) body.push(`  ${note(group.heading)}`)
    if (group.detail) body.push(`  ${note(group.detail)}`)
    body.push(...group.lines)
  }

  return [
    divider('Theme'),
    commentBlock(
      [
        inline
          ? 'Declared inline, so utilities carry `var(--vk-*)` rather than a value resolved at the root. This is what makes a theme scoped to a region — a dark footer, a light popover inside a dark shell — actually repaint, instead of inheriting the outer theme’s already-computed colour.'
          : 'Declared without `inline`. Utilities will reference the theme variable, which is resolved once at the root; a theme scoped to a subtree will not repaint them.',
        referenceRuntimeVariables
          ? 'Values point at the token custom properties, so this block is inert without the token stylesheet loaded first. See the import order note at the top of the file.'
          : 'Values are literals resolved at build time. Nothing here responds to a theme change; this output is for static artefacts only.',
      ],
      'Generated from the token set — do not edit.',
    ),
    header,
    body.join('\n'),
    '}',
  ].join('\n')
}
