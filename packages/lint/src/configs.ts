/**
 * Presets.
 *
 * Two, not five. Every additional preset is a decision a team has to make before they have
 * any evidence to make it with, and the usual result is that they pick the strictest one,
 * drown in warnings on the first run over an existing codebase, and delete the whole config.
 *
 * `recommended` is calibrated for adoption on a codebase that has not seen these rules
 * before. The accessibility rules are errors, because a missing `alt` or a submitting button
 * is a defect by any standard and nobody argues about it. The design-system rules are
 * warnings, because on day one a real codebase has hundreds of them, and a red build on day
 * one is how a rule set gets removed on day two. Warnings let a team ratchet: fix the new
 * ones, drain the old ones, then promote.
 *
 * `strict` is where a team arrives, not where it starts. Everything is an error, the motion
 * guard is enforced, and the spacing rule covers sizing utilities too. Adopt it per-directory
 * as areas are brought into line — that is what flat config's file-scoped blocks are for.
 */

import type { AnyRuleModule } from './rule-types.js'
import { rules } from './rules/index.js'

/** How a rule is switched on in a config. */
export type RuleSeverity = 'off' | 'warn' | 'error'

/** A rule entry: a severity, optionally with options. */
export type RuleEntry = RuleSeverity | readonly [RuleSeverity, Readonly<Record<string, unknown>>]

/** The plugin object, as a flat config expects to receive it. */
export interface LintPlugin {
  meta: { name: string; version: string }
  rules: Readonly<Record<string, AnyRuleModule>>
}

/** A flat-config block. Typed structurally so nothing here depends on ESLint's types. */
export interface FlatConfigBlock {
  name: string
  plugins: Readonly<Record<string, LintPlugin>>
  rules: Readonly<Record<string, RuleEntry>>
}

/** The namespace rules are addressed under: `vishwakarma/no-raw-colour`. */
export const PLUGIN_NAMESPACE = 'vishwakarma'

/** The plugin object itself. */
export const plugin: LintPlugin = {
  meta: { name: '@vishwakarma/lint', version: '0.1.0' },
  rules,
}

function prefixed(name: string): string {
  return `${PLUGIN_NAMESPACE}/${name}`
}

/**
 * Sensible defaults for a codebase adopting the system.
 *
 * Note that `require-reduced-motion-guard` is off here. It is the one rule in the set whose
 * evidence is circumstantial — it concludes from a file's silence — and switching it on
 * against an existing animated codebase produces a burst of reports that all need the same
 * considered fix. It belongs in `strict`, adopted once the team has decided to do the work.
 */
export const recommended: FlatConfigBlock = {
  name: 'vishwakarma/recommended',
  plugins: { [PLUGIN_NAMESPACE]: plugin },
  rules: {
    [prefixed('no-raw-colour')]: 'warn',
    [prefixed('no-off-scale-spacing')]: 'warn',
    [prefixed('no-layout-animation')]: 'warn',
    [prefixed('require-reduced-motion-guard')]: 'off',
    [prefixed('no-emoji-icon')]: 'warn',
    [prefixed('require-alt-text')]: 'error',
    [prefixed('no-positive-tabindex')]: 'error',
    [prefixed('require-button-type')]: 'error',
    [prefixed('no-gradient-text')]: 'warn',
  },
}

/** Everything on, everything an error, sizing utilities included in the spacing check. */
export const strict: FlatConfigBlock = {
  name: 'vishwakarma/strict',
  plugins: { [PLUGIN_NAMESPACE]: plugin },
  rules: {
    [prefixed('no-raw-colour')]: 'error',
    [prefixed('no-off-scale-spacing')]: [
      'error',
      {
        utilities: [
          'p',
          'px',
          'py',
          'pt',
          'pr',
          'pb',
          'pl',
          'm',
          'mx',
          'my',
          'mt',
          'mr',
          'mb',
          'ml',
          'gap',
          'gap-x',
          'gap-y',
          'space-x',
          'space-y',
          'inset',
          'inset-x',
          'inset-y',
          'top',
          'right',
          'bottom',
          'left',
          'translate-x',
          'translate-y',
          'w',
          'h',
          'size',
          'min-w',
          'min-h',
          'max-w',
          'max-h',
        ],
      },
    ],
    [prefixed('no-layout-animation')]: 'error',
    [prefixed('require-reduced-motion-guard')]: 'error',
    [prefixed('no-emoji-icon')]: 'error',
    [prefixed('require-alt-text')]: 'error',
    [prefixed('no-positive-tabindex')]: 'error',
    [prefixed('require-button-type')]: 'error',
    [prefixed('no-gradient-text')]: 'error',
  },
}

/** Both presets, for hosts that expect a `configs` map on the plugin. */
export const configs: Readonly<Record<'recommended' | 'strict', FlatConfigBlock>> = {
  recommended,
  strict,
}
