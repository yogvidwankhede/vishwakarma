/**
 * The custom variants.
 *
 * A variant is a question about context, and the ones worth defining centrally are the ones
 * people otherwise get subtly wrong: the difference between the primary pointer and any
 * pointer, between "the OS is dark" and "the user chose dark", between hover existing and
 * hover being emulated.
 *
 * All of them are declared with `@custom-variant`, which must come after
 * `@import "tailwindcss"`. Registering `dark` before the import does not override Tailwind's
 * built-in `dark` variant, it is overridden *by* it, and the symptom is a dark mode that
 * responds only to `prefers-color-scheme` and ignores the attribute entirely — which looks
 * exactly like a bug in the theme script.
 */

import { commentBlock, divider, joinSections } from './format.js'

/** The variants this package defines. */
export type VariantName =
  | 'dark'
  | 'light'
  | 'reduced-motion'
  | 'reduced-transparency'
  | 'coarse'
  | 'fine'
  | 'hover-capable'
  | 'forced-colors'
  | 'high-contrast'

/** Every variant, in emission order. */
export const VARIANT_NAMES: readonly VariantName[] = [
  'dark',
  'light',
  'reduced-motion',
  'reduced-transparency',
  'coarse',
  'fine',
  'hover-capable',
  'forced-colors',
  'high-contrast',
]

export interface VariantOptions {
  /** Attribute the theme is written to. Must match `@vishwakarma/theme`'s configuration. */
  themeAttribute?: string
  /** Attribute value meaning dark. */
  darkValue?: string
  /** Attribute value meaning light. */
  lightValue?: string
  /**
   * Also match `prefers-color-scheme` when no attribute is set.
   *
   * On by default, and see the note on the dark variant for why. Turn it off only if your
   * theme script is guaranteed to write an explicit attribute before first paint, in which
   * case the extra half of the variant is dead weight on every `dark:` utility in the build.
   */
  followSystem?: boolean
  /** Variants to leave out. */
  omit?: readonly VariantName[]
}

/**
 * Match the themed element itself and everything inside it, at zero specificity.
 *
 * Both halves are load-bearing. Descendants are the obvious case — the attribute lives on
 * `<html>`. The element itself is the one people forget, and it fails in a very specific
 * way: a scoped dark region carries `data-theme="dark"` on its own wrapper, so `dark:` on
 * that wrapper matches nothing while `dark:` on its children works perfectly, which reads
 * as randomness.
 *
 * `:where()` is what keeps the specificity at zero. Without it every themed utility gains
 * an attribute selector's worth of weight, so `dark:bg-surface-raised` outranks a plain
 * `bg-brand-500` written after it, and no amount of reordering classes fixes it. Specificity
 * accidents are especially expensive inside a utility framework, because the entire mental
 * model is that the utilities are flat and order decides.
 */
function themedSelector(attribute: string, value: string): string {
  const match = `[${attribute}="${value}"]`
  return `&:where(${match}, ${match} *)`
}

function darkVariant(options: VariantOptions): string {
  const attribute = options.themeAttribute ?? 'data-theme'
  const value = options.darkValue ?? 'dark'
  const followSystem = options.followSystem ?? true

  const lines: string[] = [
    '@custom-variant dark {',
    `  ${themedSelector(attribute, value)} {`,
    '    @slot;',
    '  }',
  ]

  if (followSystem) {
    lines.push(
      '',
      '  @media (prefers-color-scheme: dark) {',
      `    &:where(:root:not([${attribute}]), :root:not([${attribute}]) *) {`,
      '      @slot;',
      '    }',
      '  }',
    )
  }
  lines.push('}')

  return joinSections([
    commentBlock(
      [
        'Bound to the attribute strategy, because that is the only one of the three that can express a three-state control. A media-query dark mode cannot represent "I want dark even though my system is light", and a class strategy needs a second class to represent light explicitly, which nobody remembers to add.',
        followSystem
          ? 'The second half matters more than it looks. The generated token stylesheet also honours `prefers-color-scheme` when no attribute has been set, so on a dark-preferring system with no stored preference the token colours are dark. A variant that only matched the attribute would leave every `dark:` utility switched off in exactly that state — half a dark theme, which presents as a rendering glitch and gets diagnosed as one.'
          : 'System matching is disabled, so this only ever responds to the attribute. Your theme script must write one before first paint or dark mode never engages.',
      ],
      'dark — the attribute strategy',
    ),
    lines.join('\n'),
  ])
}

function lightVariant(options: VariantOptions): string {
  const attribute = options.themeAttribute ?? 'data-theme'
  const value = options.lightValue ?? 'light'
  const followSystem = options.followSystem ?? true

  const lines: string[] = [
    '@custom-variant light {',
    `  ${themedSelector(attribute, value)} {`,
    '    @slot;',
    '  }',
  ]
  if (followSystem) {
    lines.push(
      '',
      '  @media (prefers-color-scheme: light) {',
      `    &:where(:root:not([${attribute}]), :root:not([${attribute}]) *) {`,
      '      @slot;',
      '    }',
      '  }',
    )
  }
  lines.push('}')

  return joinSections([
    commentBlock([
      'The explicit inverse of `dark`. Needed for the light island inside a dark shell — a document preview, an embedded editor — where "not dark" is not the same statement as "light".',
    ]),
    lines.join('\n'),
  ])
}

interface MediaVariant {
  readonly name: VariantName
  readonly query: string
  readonly rationale: readonly string[]
}

const MEDIA_VARIANTS: readonly MediaVariant[] = [
  {
    name: 'reduced-motion',
    query: '(prefers-reduced-motion: reduce)',
    rationale: [
      'Named to match the rest of Vishwakarma rather than Tailwind’s `motion-reduce`, so that a component, a hook and a class all say the same word.',
      'Prefer designing so this variant is rarely needed: adding motion under a "motion is fine" condition fails safe when someone forgets the class, whereas removing motion under this one fails open — the animation ships to the person who asked not to see it.',
    ],
  },
  {
    name: 'reduced-transparency',
    query: '(prefers-reduced-transparency: reduce)',
    rationale: [
      'A real setting on macOS, iOS and Windows, and one that is almost always set for a reason: translucency over unpredictable content means unpredictable text contrast. Use it to make a surface solid, not to make it a different colour.',
    ],
  },
  {
    name: 'coarse',
    query: '(pointer: coarse)',
    rationale: [
      'The *primary* pointer is coarse — a finger or a remote. This is the right question for hit-target sizing and the wrong one for hover behaviour: a laptop with a touchscreen reports a fine primary pointer while still being tapped at.',
    ],
  },
  {
    name: 'fine',
    query: '(pointer: fine)',
    rationale: [
      'A mouse, trackpad or stylus. Reserve density increases for this rather than assuming a wide viewport implies a mouse — tablets and touch-screen kiosks are both wide and coarse.',
    ],
  },
  {
    name: 'hover-capable',
    query: '(hover: hover)',
    rationale: [
      'Hover genuinely exists, rather than being emulated. This is the guard for anything that is only reachable by hovering, because on a touch device `:hover` triggers on tap and then persists until the user taps elsewhere — which is why hover-revealed toolbars so often appear stuck open on a phone.',
      'A control that is only reachable on hover is still unreachable by keyboard. Pair this with a `:focus-within` rule rather than treating it as an accessibility answer.',
    ],
  },
  {
    name: 'forced-colors',
    query: '(forced-colors: active)',
    rationale: [
      'The platform has replaced the palette. Use this variant to *remove* things the forced palette cannot express — decorative gradients, shadows standing in for borders, colour-only status indicators — and to add the structural borders that were previously implied by colour.',
      'Do not use it to put your colours back. The user asked the operating system for a specific palette, and overriding it with `forced-color-adjust: none` is the accessibility equivalent of ignoring the preference outright.',
    ],
  },
  {
    name: 'high-contrast',
    query: '(prefers-contrast: more)',
    rationale: [
      'A request for more contrast without a wholesale palette replacement. The useful response is to darken borders and promote secondary text, not to invert anything.',
    ],
  },
]

/** Emit the custom variants. */
export function buildVariants(options: VariantOptions = {}): string {
  const omit = new Set<VariantName>(options.omit ?? [])
  const sections: string[] = []

  for (const name of VARIANT_NAMES) {
    if (omit.has(name)) continue

    if (name === 'dark') {
      sections.push(darkVariant(options))
      continue
    }
    if (name === 'light') {
      sections.push(lightVariant(options))
      continue
    }

    const media = MEDIA_VARIANTS.find((entry) => entry.name === name)
    if (!media) continue

    sections.push(
      joinSections([
        commentBlock(media.rationale, `${media.name} — ${media.query}`),
        `@custom-variant ${media.name} (@media ${media.query});`,
      ]),
    )
  }

  if (sections.length === 0) return ''
  return joinSections([divider('Variants'), ...sections])
}
