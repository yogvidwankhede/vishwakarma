/**
 * The space scale, and how a prop value becomes a CSS length.
 *
 * Every gap, gutter, and inset in this package goes through {@link resolveSpace}. That is
 * the whole point of the layer: a layout primitive should not accept `gap="17px"` without
 * comment, because the moment arbitrary lengths enter a layout the spacing stops reading
 * as a system and starts reading as a series of individual decisions. Restricting the
 * common path to scale steps is what makes a page feel composed.
 *
 * The steps mirror the `space.*` primitive tokens emitted by @vishwakarma/tokens, so a
 * project that has installed the token stylesheet gets its own values, and a project that
 * has not still gets sensible ones from the fallback baked into each `var()`.
 */

import { fluidClamp } from '@vishwakarma/core'

/**
 * Steps on the space scale, in multiples of the 4px base unit.
 *
 * Fractional and small steps exist because optical adjustments below 8px are real —
 * hairline offsets, icon-to-label gaps — while the upper end thins out deliberately.
 * Nobody needs the difference between 116px and 120px of section spacing, and offering it
 * only invites someone to use both on the same page.
 */
export const SPACE_STEPS = [
  0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48,
] as const

export type SpaceStep = (typeof SPACE_STEPS)[number]

/**
 * Semantic names for the steps a layout reaches for most often.
 *
 * These exist so that a component can say what a gap *means* rather than how large it is.
 * `gap="section"` survives a redesign that changes the section rhythm; `gap={24}` does not.
 */
export const SPACE_ALIASES = {
  none: 0,
  /** Elements that belong to one another — an icon and its label. */
  tight: 1,
  /** Related elements inside a group — a label and its field. */
  snug: 2,
  /** The default rhythm between elements in a group. */
  normal: 4,
  /** Between groups inside a section. */
  loose: 8,
  /** Between sections of a page. */
  section: 24,
} as const satisfies Record<string, SpaceStep>

export type SpaceAlias = keyof typeof SPACE_ALIASES

/**
 * A spacing value.
 *
 * The `(string & {})` arm keeps the named steps in editor autocomplete while still
 * permitting a raw CSS length for the cases the scale genuinely cannot express — a value
 * derived from a `calc()`, or one handed down from a custom property. Widening to plain
 * `string` would collapse the union and lose the suggestions, which is the difference
 * between a scale people follow and a scale people forget exists.
 */
export type Space = SpaceStep | SpaceAlias | (string & {})

/** The CSS custom property name for a step, matching the token pipeline's output. */
export function spaceVar(step: number): string {
  // `space.0-5` in token-path form, because a dot is not legal in a custom property name.
  return `--vk-space-${String(step).replace('.', '-')}`
}

/** The rem value a step represents when no token stylesheet is present. */
function stepToRem(step: number): string {
  // 4px base unit against a 16px root. Expressed in rem, never px, so that a reader who
  // has raised their browser's default font size gets proportionally larger spacing
  // instead of the same tight layout with bigger text crammed into it.
  return `${step * 0.25}rem`
}

/**
 * Turn a {@link Space} into a CSS length.
 *
 * Every scale step resolves to `var(--vk-space-N, <rem fallback>)` rather than a bare
 * `var()`. The fallback is not decoration. An undefined custom property makes the whole
 * declaration invalid at computed-value time, so `gap: var(--vk-space-4)` on a project
 * that has not loaded the tokens does not fall back to something reasonable — the gap
 * becomes `normal`, which for flex and grid means zero. Every gap on the page silently
 * collapses, and the cause is invisible in devtools because the declaration looks fine.
 */
export function resolveSpace(value: Space): string
export function resolveSpace(value: Space | undefined): string | undefined
export function resolveSpace(value: Space | undefined): string | undefined {
  if (value === undefined) return undefined

  if (typeof value === 'number') {
    return `var(${spaceVar(value)}, ${stepToRem(value)})`
  }

  const alias = SPACE_ALIASES[value as SpaceAlias]
  if (alias !== undefined) {
    return `var(${spaceVar(alias)}, ${stepToRem(alias)})`
  }

  // A raw CSS length, a calc(), or a var() the caller owns. Passed through untouched.
  return value
}

/**
 * A responsive gutter: 1rem at a phone width easing to 2rem on a laptop.
 *
 * Expressed as a single `clamp()` rather than as breakpoint overrides, because a gutter
 * that changes in three steps is visibly steppy on a resizing window and, more
 * practically, because three declarations are three things to keep in sync forever.
 *
 * The `rem` term in the middle of the clamp is what keeps this accessible: a gutter
 * defined purely in `vw` ignores the user's font-size preference, so a reader at 200% text
 * size gets the same cramped margins as everyone else. Computed once at module load — the
 * inputs never change, and re-deriving a constant string on every render is pure waste.
 */
export const FLUID_GUTTER: string = fluidClamp({
  minValue: 1,
  maxValue: 2,
  minViewport: 360,
  maxViewport: 1440,
})
