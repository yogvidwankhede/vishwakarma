/**
 * The knobs the custom utilities read.
 *
 * These are deliberately *not* theme variables. They are not design decisions anyone should
 * be picking from an autocomplete list — nobody wants a `blur-glass` utility — they are
 * parameters of the utilities defined in this package, and putting them in `@theme` would
 * both pollute the namespaces and drag them into Tailwind's used-variable pruning, which we
 * would then have to reason about every time a utility went unused on a page.
 *
 * Declaring them on `:root` has a second, more useful consequence: they inherit, so any
 * subtree can retune a utility without a new class. A dark panel that needs a lighter focus
 * ring sets `--vk-focus-ring-color` on the panel and every focusable descendant follows,
 * which is precisely the sort of local override that would otherwise become a second class
 * name and, three months later, a third.
 */

import { commentBlock, divider, note } from './format.js'
import { fallbackRef, tokenIndex, type NamingOptions } from './refs.js'
import type { TokenSet } from '@vishwakarma/tokens'

/** The custom property names the generated utilities depend on. */
export interface SystemVariables {
  /** Thickness of the focus indicator. */
  focusRingWidth: string
  /** Gap between the component edge and the ring. */
  focusRingOffset: string
  /** Colour of the ring. */
  focusRingColor: string
  /** Blur radius behind a `glass` surface. */
  glassBlur: string
  /** Saturation boost behind a `glass` surface. */
  glassSaturation: string
  /** How opaque the glass tint is, as a percentage for `color-mix`. */
  glassTint: string
  /** Base colour a `glass` surface tints towards. */
  glassColor: string
  /** Minimum gutter on either side of a `grid-bleed` content column. */
  bleedGutter: string
  /** Maximum width of the `grid-bleed` content column. */
  bleedContent: string
}

/** Compute the variable names for a given prefix. */
export function systemVariables(options: NamingOptions = {}): SystemVariables {
  const p = options.prefix ?? 'vk'
  const name = (rest: string): string => (p ? `--${p}-${rest}` : `--${rest}`)

  return {
    focusRingWidth: name('focus-ring-width'),
    focusRingOffset: name('focus-ring-offset'),
    focusRingColor: name('focus-ring-color'),
    glassBlur: name('glass-blur'),
    glassSaturation: name('glass-saturation'),
    glassTint: name('glass-tint'),
    glassColor: name('glass-color'),
    bleedGutter: name('bleed-gutter'),
    bleedContent: name('bleed-content'),
  }
}

export interface SystemOptions extends NamingOptions {
  /** Override any of the defaults, keyed by the field names of {@link SystemVariables}. */
  values?: Partial<Record<keyof SystemVariables, string>>
}

/**
 * Emit the `:root` block that configures the custom utilities.
 *
 * The values are chosen rather than inherited from tokens wherever a token would be the
 * wrong shape for the job — the focus ring width is not a spacing step, and pretending it is
 * would mean a designer nudging `space.0-5` silently changes every focus indicator in the
 * product.
 */
export function buildSystemBlock(set: TokenSet, options: SystemOptions = {}): string {
  const vars = systemVariables(options)
  const index = tokenIndex(set)
  const overrides = options.values ?? {}

  const surface = index.has('color.surface.raised')
    ? fallbackRef('color.surface.raised', 'canvas', options)
    : 'canvas'
  const ring = index.has('color.focus.ring')
    ? fallbackRef('color.focus.ring', 'currentColor', options)
    : 'currentColor'
  const gutter = index.has('space.gutter') ? fallbackRef('space.gutter', '1.5rem', options) : '1.5rem'

  const defaults: Record<keyof SystemVariables, string> = {
    focusRingWidth: '2px',
    focusRingOffset: '2px',
    focusRingColor: ring,
    glassBlur: '12px',
    glassSaturation: '180%',
    glassTint: '72%',
    glassColor: surface,
    bleedGutter: gutter,
    bleedContent: '68rem',
  }

  const value = (key: keyof SystemVariables): string => overrides[key] ?? defaults[key]

  return [
    divider('Utility parameters'),
    commentBlock([
      'Read by the @utility definitions below. Override them on any ancestor to retune a subtree; override them on :root in your own stylesheet to retune the product.',
    ]),
    ':root {',
    `  ${note('2px, not 1px. A one-pixel outline at a fractional device pixel ratio is resampled into a grey smear that fails the 3:1 contrast requirement it was drawn to satisfy.')}`,
    `  ${vars.focusRingWidth}: ${value('focusRingWidth')};`,
    `  ${note('The offset is what makes the ring legible on a component whose border happens to be the same colour: the gap shows the page behind, so there is always a light/dark boundary on one side of the ring.')}`,
    `  ${vars.focusRingOffset}: ${value('focusRingOffset')};`,
    `  ${vars.focusRingColor}: ${value('focusRingColor')};`,
    '',
    `  ${vars.glassBlur}: ${value('glassBlur')};`,
    `  ${note('Saturation is raised because blurring averages colour towards grey; without it a glass panel looks like fog rather than glass.')}`,
    `  ${vars.glassSaturation}: ${value('glassSaturation')};`,
    `  ${note('Tint opacity. Below about 60% the text contrast over a glass panel depends entirely on what is behind it, which is not something a design system can guarantee.')}`,
    `  ${vars.glassTint}: ${value('glassTint')};`,
    `  ${vars.glassColor}: ${value('glassColor')};`,
    '',
    `  ${vars.bleedGutter}: ${value('bleedGutter')};`,
    `  ${vars.bleedContent}: ${value('bleedContent')};`,
    '}',
  ].join('\n')
}
