/**
 * The custom utilities.
 *
 * Everything here earns its place by being a decision that would otherwise be re-made,
 * slightly differently, at every call site. A focus ring assembled from `outline-2
 * outline-offset-2 outline-brand-600` is not one decision, it is three that happen to agree
 * today; the version six components later has an offset of 1 and nobody knows which is
 * right. Naming the whole thing once is the only way a design system holds a detail like
 * that still.
 *
 * Tailwind v4 registers these with `@utility`. Functional utilities — the `-*` ones — read
 * their argument with `--value()`, which resolves against theme namespaces, bare values and
 * arbitrary values depending on which form you ask for. A `--value()` call that matches
 * nothing causes its declaration to be dropped, which is genuinely useful: `optical-*` can
 * offer to set line-height and letter-spacing for steps that define them without breaking
 * for a token set that only defines sizes.
 */

import { commentBlock, divider, joinSections } from './format.js'
import type { NamingOptions } from './refs.js'
import { systemVariables } from './system.js'

/** The utility families this package defines. */
export type UtilityName =
  | 'measure'
  | 'tabular'
  | 'optical'
  | 'surface'
  | 'glass'
  | 'focus-ring'
  | 'grid-bleed'

/** Every utility family, in emission order. */
export const UTILITY_NAMES: readonly UtilityName[] = [
  'measure',
  'tabular',
  'optical',
  'surface',
  'glass',
  'focus-ring',
  'grid-bleed',
]

export interface UtilityOptions extends NamingOptions {
  /** Families to leave out, for consumers who define their own. */
  omit?: readonly UtilityName[]
}

function measure(): string {
  return joinSections([
    commentBlock(
      [
        'Constrain a text column to a number of characters. `measure-base` uses a named step, `measure-72` a bare count, `measure-[52]` an arbitrary one.',
        'The unit is `ch` — the advance width of the zero glyph — because the constraint is a count of characters, not a distance. A measure expressed in rem is correct for exactly one font and silently wrong after the next type change.',
        'It sets `max-width`, never `width`. A fixed width refuses to shrink below the measure, so on a narrow viewport the column overflows and the whole page scrolls sideways. That is the single most common way a reading-width constraint ships broken.',
      ],
      'measure-* — reading width',
    ),
    [
      '@utility measure-* {',
      '  /* A named step from the --measure-* namespace. */',
      '  max-width: --value(--measure-*);',
      '  /* A bare character count: measure-66. */',
      '  max-width: calc(--value(integer) * 1ch);',
      '  /* An arbitrary count: measure-[52]. */',
      '  max-width: calc(--value([integer]) * 1ch);',
      '}',
    ].join('\n'),
  ])
}

function tabular(): string {
  return joinSections([
    commentBlock(
      [
        'Figures that occupy identical widths, for anything whose digits change in place: timers, live prices, table columns, diffs.',
        'With proportional figures a 1 is narrower than an 8, so a number that updates reflows horizontally on every tick. The eye reads that shimmer as instability rather than as data changing, and it is the reason a perfectly correct dashboard can feel unreliable.',
        '`lining-nums` is included deliberately. A font with old-style figures as its default puts 3, 4, 7 and 9 below the baseline, which is handsome in prose and unreadable in a column that is meant to align.',
        'One caveat: this writes `font-variant-numeric` outright, so it does not compose with Tailwind’s own `ordinal` / `slashed-zero` utilities — whichever the cascade puts last wins entirely. Use one system or the other on a given element.',
        'If the font has no tabular figures the property is a no-op. The fix is a different font, not a different class.',
      ],
      'tabular — figures that do not jitter',
    ),
    ['@utility tabular {', '  font-variant-numeric: lining-nums tabular-nums;', '}'].join('\n'),
  ])
}

function optical(): string {
  return joinSections([
    commentBlock(
      [
        'A complete type step in one class: size, leading and tracking together.',
        'They belong together because they are one decision. Tracking has to tighten as type grows — a display size set at body tracking reads loose and gappy, a caption set at display tracking reads cramped — and leading has to loosen as type shrinks. Writing `text-4xl tracking-tight leading-none` records that as three independent facts, and the next person changes the size and leaves the other two, which is how a product ends up with headlines letterspaced for a size they no longer are.',
        'Steps that define no `--leading-*` or `--tracking-*` simply lose those declarations, so a token set with sizes only still gets a working `optical-*`.',
      ],
      'optical-* — size, leading and tracking as one step',
    ),
    [
      '@utility optical-* {',
      '  font-size: --value(--text-*);',
      '  line-height: --value(--leading-*);',
      '  letter-spacing: --value(--tracking-*);',
      '}',
    ].join('\n'),
  ])
}

function surface(): string {
  return joinSections([
    commentBlock(
      [
        'A named place in the elevation system: background, foreground, edge colour and the shadow that belongs with them.',
        'The shadow is part of the level rather than a separate `shadow-*` class because the two drift apart otherwise — a panel promoted from raised to floating keeps its old shadow, and the result reads as a rendering bug that nobody can name.',
        'In a dark theme the shadow does almost nothing: a shadow is light being blocked, and there is very little light to block. Dark elevation is carried by lightness instead. Both come out of the same class here, because the level’s background token is what changes under `[data-theme="dark"]` — the utility itself is theme-agnostic and needs no `dark:` counterpart.',
        'It sets `border-color` but not `border-width`. Adding a border changes an element’s size, and a colour utility that silently made everything it touched two pixels larger would be a trap. Pair it with `border` when you want one.',
        'It writes `box-shadow`, so it does not stack with Tailwind’s `shadow-*`; the later of the two in the utilities layer wins outright. Pick one per element.',
      ],
      'surface-* — the elevation system',
    ),
    [
      '@utility surface-* {',
      '  background-color: --value(--surface-*);',
      '  color: --value(--ink-*);',
      '  border-color: --value(--edge-*);',
      '  box-shadow: --value(--elevation-*);',
      '}',
    ].join('\n'),
  ])
}

function glass(options: NamingOptions): string {
  const v = systemVariables(options)
  return joinSections([
    commentBlock(
      [
        'A translucent, blurred surface — with the solid version first, so that the fallback is the thing that ships when anything goes wrong.',
        'The order matters. Declaring the translucent version unconditionally and then trying to patch it for browsers without `backdrop-filter` leaves those browsers with a 72%-opaque panel over arbitrary content and no blur, which is exactly the situation the blur was hiding: text over an unpredictable background at unpredictable contrast. Starting solid and adding translucency only inside the `@supports` guard means the worst case is opaque, which is legible.',
        'Two accessibility guards follow. `prefers-reduced-transparency` is a real user setting on macOS, iOS and Windows, and users who set it are frequently the ones for whom low-contrast text over a busy backdrop is not merely unpleasant. Forced-colours mode overrides the palette entirely, and a blur there produces a smeared panel with system-coloured text on top of it; we drop back to `Canvas`.',
        'Worth knowing before you reach for this: `backdrop-filter` establishes a containing block for absolutely and fixed-positioned descendants. A `position: fixed` child inside a glass panel — a dropdown, a tooltip, a modal portalled into it — will position itself against the panel rather than the viewport, and will be clipped by it. That is not a bug in the utility; it is what the property does, and it has cost more debugging hours than the effect is worth on most projects.',
      ],
      'glass — translucent surface with a solid fallback',
    ),
    [
      '@utility glass {',
      '  /* The fallback, and the only thing a browser without backdrop-filter ever sees. */',
      `  background-color: var(${v.glassColor});`,
      '',
      '  @supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {',
      `    background-color: color-mix(in oklab, var(${v.glassColor}) var(${v.glassTint}), transparent);`,
      `    -webkit-backdrop-filter: blur(var(${v.glassBlur})) saturate(var(${v.glassSaturation}));`,
      `    backdrop-filter: blur(var(${v.glassBlur})) saturate(var(${v.glassSaturation}));`,
      '  }',
      '',
      '  @media (prefers-reduced-transparency: reduce) {',
      `    background-color: var(${v.glassColor});`,
      '    -webkit-backdrop-filter: none;',
      '    backdrop-filter: none;',
      '  }',
      '',
      '  @media (forced-colors: active) {',
      '    background-color: Canvas;',
      '    color: CanvasText;',
      '    -webkit-backdrop-filter: none;',
      '    backdrop-filter: none;',
      '  }',
      '}',
    ].join('\n'),
  ])
}

function focusRing(options: NamingOptions): string {
  const v = systemVariables(options)
  return joinSections([
    commentBlock(
      [
        'The focus indicator, defined once so it cannot drift.',
        '`outline`, not `box-shadow`. A box-shadow ring is clipped by any ancestor with `overflow: hidden` — which is most scroll containers and most cards — so the indicator on the first row of a list is simply not drawn, and only for keyboard users, who are the least likely to be in the room when the design is reviewed. Outlines are not clipped by overflow, and every current browser follows `border-radius` with them, which was the original reason people reached for box-shadow in the first place.',
        'Outlines also survive forced-colours mode: the UA substitutes the system highlight colour and the ring stays visible. A box-shadow is dropped entirely there, leaving keyboard users on a high-contrast Windows theme with no indicator at all.',
        'Scoped to `:focus-visible`, not `:focus`. A ring on every mouse click looks like a bug, and looking like a bug is how focus styles get deleted — which is the actual root cause of most missing focus indicators.',
        'The offset is not decoration. Without it the ring sits directly on the component’s own border and, when the two are similar colours, vanishes. The gap guarantees a light/dark boundary on at least one side whatever the component is made of.',
        'Never write `outline: none` alongside this. If a component needs a different indicator, change the variables rather than removing the outline.',
      ],
      'focus-ring — the project’s focus indicator',
    ),
    [
      '@utility focus-ring {',
      '  &:focus-visible {',
      `    outline: var(${v.focusRingWidth}) solid var(${v.focusRingColor});`,
      `    outline-offset: var(${v.focusRingOffset});`,
      '  }',
      '}',
      '',
      '/* For controls flush against a clipping edge, where an outset ring would be cut off. */',
      '@utility focus-ring-inset {',
      '  &:focus-visible {',
      `    outline: var(${v.focusRingWidth}) solid var(${v.focusRingColor});`,
      `    outline-offset: calc(var(${v.focusRingOffset}) * -1);`,
      '  }',
      '}',
      '',
      '/* When focus must be shown for a reason other than keyboard navigation — a roving',
      '   tabindex parking focus on a container, a validation error moving focus to a field.',
      '   Use it deliberately; it is not a substitute for :focus-visible. */',
      '@utility focus-ring-always {',
      `  outline: var(${v.focusRingWidth}) solid var(${v.focusRingColor});`,
      `  outline-offset: var(${v.focusRingOffset});`,
      '}',
    ].join('\n'),
  ])
}

function gridBleed(options: NamingOptions): string {
  const v = systemVariables(options)
  return joinSections([
    commentBlock(
      [
        'A content column with named gutters, so a child can break out to the full width by naming a grid line instead of doing arithmetic about the viewport.',
        'The technique it replaces is `width: 100vw; margin-inline-start: calc(50% - 50vw)`, and that is wrong in three separate ways. `100vw` includes the classic scrollbar, so every full-bleed element overflows by the scrollbar width and produces a horizontal scrollbar — on a page that did not previously have a vertical one, adding the horizontal bar can change the layout enough to need the vertical one, and the two oscillate. `50%` assumes the element’s parent is exactly the content column, which stops being true the moment anything is nested. And it needs every property in logical form to survive `direction: rtl`.',
        'Naming the gutters as grid tracks makes the bleed a statement about the layout rather than a guess about the viewport, and it is correct in both writing directions without further thought.',
        'Note that this makes every child a grid item: adjacent margins no longer collapse, and a child with `float` or `position: absolute` leaves the flow as usual. Vertical rhythm inside a `grid-bleed` container should come from `gap`.',
      ],
      'grid-bleed — full-bleed children inside a measured column',
    ),
    [
      '@utility grid-bleed {',
      '  display: grid;',
      '  grid-template-columns:',
      `    [full-start] minmax(var(${v.bleedGutter}), 1fr)`,
      `    [content-start] min(var(${v.bleedContent}), 100% - (var(${v.bleedGutter}) * 2)) [content-end]`,
      `    minmax(var(${v.bleedGutter}), 1fr) [full-end];`,
      '',
      '  /* Children sit in the content column unless they ask not to. Defaulting the other',
      '     way round means every paragraph needs a class, and one of them will not get it. */',
      '  & > * {',
      '    grid-column: content;',
      '  }',
      '}',
      '',
      '/* Break out to the full width of the container, gutters included. */',
      '@utility bleed-full {',
      '  grid-column: full;',
      '}',
      '',
      '/* Return to the content column, for a child of a child that has bled out. */',
      '@utility bleed-content {',
      '  grid-column: content;',
      '}',
      '',
      '/* Full width on one side only — an image that runs to the left edge and stays aligned',
      '   with the text on the right. */',
      '@utility bleed-start {',
      '  grid-column: full-start / content-end;',
      '}',
      '',
      '@utility bleed-end {',
      '  grid-column: content-start / full-end;',
      '}',
    ].join('\n'),
  ])
}

/**
 * Emit every custom utility.
 *
 * These must appear after `@import "tailwindcss"`. `@utility` is a Tailwind at-rule; placed
 * before the import it is either dropped or, worse, left in the output as an unrecognised
 * at-rule that browsers ignore silently, so the classes resolve to nothing and the elements
 * render unstyled with no error anywhere.
 */
export function buildUtilities(options: UtilityOptions = {}): string {
  const omit = new Set<UtilityName>(options.omit ?? [])

  const builders: Record<UtilityName, () => string> = {
    measure,
    tabular,
    optical,
    surface,
    glass: () => glass(options),
    'focus-ring': () => focusRing(options),
    'grid-bleed': () => gridBleed(options),
  }

  const sections = UTILITY_NAMES.filter((name) => !omit.has(name)).map((name) => builders[name]())
  if (sections.length === 0) return ''

  return joinSections([divider('Utilities'), ...sections])
}
