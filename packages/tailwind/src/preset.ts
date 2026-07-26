// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The preset: one token set in, one complete stylesheet out.
 *
 * ## Import order
 *
 * This is the part that costs people an afternoon, so it is stated here, in the generated
 * CSS, and in the package README. The order is:
 *
 * ```css
 * @import "@vishwakarma/tokens/tokens.css";  /​* 1. the token custom properties *​/
 * @import "tailwindcss";                     /​* 2. Tailwind *​/
 * @import "./vishwakarma.css";               /​* 3. the output of buildPreset *​/
 * ```
 *
 * Four things break if it is wrong, and none of them produce an error message.
 *
 * The preset cannot go first, because `@import` is only valid before any other rule and the
 * preset emits rules. A bundler that sees `@import "tailwindcss"` after an `@theme` block
 * drops the import, and you are left with Tailwind at-rules and nothing to interpret them:
 * the at-rules are unknown to the browser, so they are skipped in silence and every class
 * in the application resolves to nothing.
 *
 * Tailwind must come before the preset, because `@theme` blocks merge in source order and
 * the last declaration of a variable wins. A preset imported before Tailwind is overwritten
 * by Tailwind's own default theme. The utilities still generate — they just carry the
 * default palette — which is a nastier failure than generating nothing, because everything
 * looks like it ran.
 *
 * `@custom-variant dark` likewise only replaces the built-in `dark` variant if it is
 * registered after the import. Register it before, and dark mode responds to
 * `prefers-color-scheme` and ignores the theme attribute, which presents as a bug in the
 * theme script and is diagnosed there for some time.
 *
 * The tokens go first because everything the preset emits resolves through `var(--vk-*)`.
 * Missing custom properties are not an error: a `var()` that cannot resolve makes the
 * declaration invalid at computed-value time, so inherited properties inherit and everything
 * else falls back to its initial value. Text keeps a plausible colour, backgrounds go
 * transparent, borders become `currentColor`, and nothing in devtools points at a missing
 * import. Keeping the tokens visibly first in the entry file is the cheapest available
 * reminder that the rest of the file depends on them.
 */

import type { TokenSet } from '@vishwakarma/tokens'
import { type CoverageOptions, checkCoverage } from './coverage.js'
import { commentBlock, divider, joinSections, note } from './format.js'
import { buildSystemBlock, type SystemOptions } from './system.js'
import { buildThemeBlock, type ThemeOptions } from './theme.js'
import { buildUtilities, type UtilityName } from './utilities.js'
import { buildVariants, type VariantName, type VariantOptions } from './variants.js'

export interface PresetOptions extends ThemeOptions, SystemOptions, Omit<VariantOptions, 'omit'> {
  /** Utility families to leave out. */
  omitUtilities?: readonly UtilityName[]
  /** Variants to leave out. */
  omitVariants?: readonly VariantName[]
  /** Emit the import-order note at the top of the file. On by default. */
  includeImportNote?: boolean
  /**
   * Emit the coverage summary as a comment. On by default.
   *
   * The summary belongs in the artefact rather than only in a build log, because the
   * stylesheet is what gets opened when something is missing and the log is long gone.
   */
  includeCoverageSummary?: boolean
  /** Path used in the import-order example. Cosmetic; it only appears in a comment. */
  tokensImportPath?: string
  /** Skip the `@utility` section entirely. */
  includeUtilities?: boolean
  /** Skip the `@custom-variant` section entirely. */
  includeVariants?: boolean
  /** Skip the `:root` block of utility parameters. */
  includeSystemVariables?: boolean
}

/**
 * The import-order note, as it appears at the top of every generated file.
 *
 * Exported so a CLI can print it without generating a stylesheet, and so the documentation
 * cannot drift from what the file actually says.
 */
export function importOrderNote(tokensImportPath = '@vishwakarma/tokens/tokens.css'): string {
  const statements: ReadonlyArray<readonly [string, string]> = [
    [`@import "${tokensImportPath}";`, '1. token custom properties'],
    ['@import "tailwindcss";', '2. Tailwind'],
    ['@import "./this-file.css";', '3. this preset'],
  ]
  const column = Math.max(...statements.map(([statement]) => statement.length)) + 3

  return joinSections([
    commentBlock(
      ['Import order is load-bearing. Use exactly this sequence in your entry stylesheet:'],
      'Import order',
    ),
    [
      '/*',
      ...statements.map(([statement, label]) => ` *   ${statement.padEnd(column)}${label}`),
      ' */',
    ].join('\n'),
    commentBlock([
      'This file cannot come first: `@import` is only valid before any other rule, and this file emits rules. Move it above the imports and the bundler drops them — leaving Tailwind at-rules with no Tailwind to interpret them, which browsers skip in silence while every class in the application resolves to nothing.',
      'Tailwind must come before this file, because `@theme` blocks merge in source order and the last declaration wins. Imported before Tailwind, this theme is overwritten by Tailwind’s defaults; the utilities still generate, carrying the wrong values, which is harder to spot than generating none.',
      '`@custom-variant dark` only replaces the built-in `dark` variant when it is registered after the import. Register it earlier and dark mode follows `prefers-color-scheme` only, ignoring the theme attribute — which looks like a bug in the theme script, and is looked for there.',
      'The tokens come first because everything below resolves through `var(--vk-*)`. An unresolvable `var()` is invalid at computed-value time rather than an error: inherited properties inherit, the rest reset to their initial values. Text keeps a plausible colour while backgrounds go transparent and borders become currentColor, and nothing anywhere names the missing import.',
    ]),
  ])
}

/**
 * Build the complete Tailwind v4 preset for a token set.
 *
 * The output is a single stylesheet containing, in order: the import-order note, the `:root`
 * block of utility parameters, the `@theme` block, the `@utility` definitions, the
 * `@custom-variant` definitions, and a coverage summary. Nothing here touches the filesystem
 * — write it wherever you like, or serve it, or diff it in a test.
 *
 * Every section can be turned off, but the theme cannot: a preset without a theme is a file
 * of utilities referencing variables nobody defined, which is the failure this package
 * exists to prevent.
 */
export function buildPreset(set: TokenSet, options: PresetOptions = {}): string {
  const {
    includeImportNote = true,
    includeCoverageSummary = true,
    includeUtilities = true,
    includeVariants = true,
    includeSystemVariables = true,
    tokensImportPath,
    omitUtilities,
    omitVariants,
  } = options

  const banner = commentBlock(
    [
      `Generated from the "${set.name}" token set, version ${set.version}.`,
      'Do not edit by hand. Regenerate with the token build; hand edits are lost on the next run and, worse, are invisible in review because the file is expected to change wholesale.',
    ],
    '@vishwakarma/tailwind — Tailwind CSS v4 preset',
  )

  const coverageOptions: CoverageOptions = {
    namespaces: options.namespaces,
    skipPrivate: options.skipPrivate,
  }

  const sections: Array<string | null> = [
    banner,
    includeImportNote ? importOrderNote(tokensImportPath) : null,
    includeSystemVariables ? buildSystemBlock(set, options) : null,
    buildThemeBlock(set, options),
    includeUtilities ? buildUtilities({ prefix: options.prefix, omit: omitUtilities }) : null,
    includeVariants
      ? buildVariants({
          themeAttribute: options.themeAttribute,
          darkValue: options.darkValue,
          lightValue: options.lightValue,
          followSystem: options.followSystem,
          omit: omitVariants,
        })
      : null,
    includeCoverageSummary ? coverageSummary(set, coverageOptions) : null,
  ]

  return `${joinSections(sections)}\n`
}

/**
 * The coverage report, rendered as a comment.
 *
 * Only the warnings are included, not the full token list. A comment nobody reads is the
 * normal case; a comment listing four hundred tokens guarantees it.
 */
function coverageSummary(set: TokenSet, options: CoverageOptions): string {
  const report = checkCoverage(set, options)

  const lines: string[] = [
    divider('Coverage'),
    note(
      `${report.total} tokens: ${report.utilityCount} generate utilities, ${report.variableOnlyCount} are variable-only, ${report.unmappedCount} map to nothing.`,
    ),
  ]

  if (report.warnings.length === 0) {
    lines.push(note('No coverage warnings.'))
    return lines.join('\n')
  }

  for (const warning of report.warnings) {
    lines.push(
      '',
      commentBlock([warning.message, `Remedy: ${warning.remedy}`], `[${warning.kind}]`),
    )
  }

  return lines.join('\n')
}
