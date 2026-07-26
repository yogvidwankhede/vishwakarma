// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The viewport matrix.
 *
 * "Is it responsive?" is not a question anyone can answer, which is why it so rarely gets
 * answered honestly. "Does it pass at these nine specific configurations?" is a question
 * with a yes or a no.
 *
 * The matrix below is deliberately not a list of popular device sizes. Device lists go
 * stale, they encourage designing for hardware instead of for content, and they miss the
 * configurations that actually break layouts — which are the extremes and the zoom levels,
 * not the middle. What is here instead: the narrowest width still in meaningful use, the
 * awkward widths where layouts transition, the widest width worth optimising for, and the
 * zoom levels that accessibility conformance actually requires.
 */

export type ViewportCategory = 'compact' | 'narrow' | 'medium' | 'wide' | 'ultrawide'

export interface ViewportProfile {
  id: string
  label: string
  width: number
  height: number
  category: ViewportCategory
  /** Browser zoom as a multiplier, where 1 is 100%. */
  zoom: number
  /** Primary input. Affects hit-target requirements and whether hover is available. */
  pointer: 'fine' | 'coarse'
  /** Whether hover is reliably available. */
  hover: boolean
  /** Why this configuration is in the matrix. */
  rationale: string
  /** Whether a failure here blocks release. */
  required: boolean
}

/**
 * The standard sweep.
 *
 * Nine configurations, of which six are required. Running the required six catches the
 * overwhelming majority of responsive defects; the optional three catch the rest.
 */
export const VIEWPORT_MATRIX: ViewportProfile[] = [
  {
    id: 'compact-320',
    label: '320 × 568',
    width: 320,
    height: 568,
    category: 'compact',
    zoom: 1,
    pointer: 'coarse',
    hover: false,
    rationale:
      'The narrowest width still in real use. Almost every horizontal-overflow bug that exists is visible here and nowhere else.',
    required: true,
  },
  {
    id: 'narrow-390',
    label: '390 × 844',
    width: 390,
    height: 844,
    category: 'narrow',
    zoom: 1,
    pointer: 'coarse',
    hover: false,
    rationale: 'The modern phone centre of mass. The single most common real viewport.',
    required: true,
  },
  {
    id: 'medium-768',
    label: '768 × 1024',
    width: 768,
    height: 1024,
    category: 'medium',
    zoom: 1,
    pointer: 'coarse',
    hover: false,
    rationale:
      'Tablet portrait: wide enough that desktop layouts are tempting, narrow enough that they fail. Layouts break here more often than at any other width because it falls between the two designs anyone actually drew.',
    required: true,
  },
  {
    id: 'medium-1024',
    label: '1024 × 768',
    width: 1024,
    height: 768,
    category: 'medium',
    zoom: 1,
    pointer: 'fine',
    hover: true,
    rationale:
      'Small laptop and tablet landscape. Short viewport height exposes anything that assumed vertical room, such as sticky headers plus tall modals.',
    required: true,
  },
  {
    id: 'wide-1440',
    label: '1440 × 900',
    width: 1440,
    height: 900,
    category: 'wide',
    zoom: 1,
    pointer: 'fine',
    hover: true,
    rationale: 'The common laptop working size, and where most design is done.',
    required: true,
  },
  {
    id: 'ultrawide-1920',
    label: '1920 × 1080',
    width: 1920,
    height: 1080,
    category: 'ultrawide',
    zoom: 1,
    pointer: 'fine',
    hover: true,
    rationale:
      'Exposes unconstrained containers. Text that was fine at 1440 becomes a 160-character measure here.',
    required: false,
  },
  {
    id: 'zoom-200',
    label: '1280 × 800 at 200%',
    width: 1280,
    height: 800,
    category: 'medium',
    zoom: 2,
    pointer: 'fine',
    hover: true,
    rationale:
      'Accessibility conformance requires content to reflow without loss of function at 200% zoom. Fixed-height containers and absolutely-positioned overlays fail here.',
    required: true,
  },
  {
    id: 'zoom-400',
    label: '1280 × 1024 at 400%',
    width: 1280,
    height: 1024,
    category: 'compact',
    zoom: 4,
    pointer: 'fine',
    hover: true,
    rationale:
      'The reflow criterion is specified at 400% zoom of a 1280px viewport, which is equivalent to a 320px CSS viewport. Content must reflow to a single column with no two-dimensional scrolling.',
    required: false,
  },
  {
    id: 'landscape-phone',
    label: '844 × 390',
    width: 844,
    height: 390,
    category: 'medium',
    zoom: 1,
    pointer: 'coarse',
    hover: false,
    rationale:
      'Phone landscape. Very short height combined with a coarse pointer; anything using viewport-height units or a tall fixed header becomes unusable.',
    required: false,
  },
]

/** The subset that must pass before release. */
export const REQUIRED_VIEWPORTS = VIEWPORT_MATRIX.filter((v) => v.required)

/** Effective CSS pixel width once zoom is applied, which is what layout actually sees. */
export function effectiveWidth(profile: ViewportProfile): number {
  return Math.round(profile.width / profile.zoom)
}

/**
 * What to check at a given viewport.
 *
 * Checks are viewport-dependent because the failure modes are. Asking about touch targets
 * at 1920px wastes attention; not asking at 390px misses the defect.
 */
export function checksFor(profile: ViewportProfile): string[] {
  const checks: string[] = [
    'No horizontal scrolling: the document width must not exceed the viewport width.',
    'No content clipped, overlapping, or hidden behind a fixed element.',
    'All text remains legible; nothing falls below the minimum body size.',
  ]

  if (profile.pointer === 'coarse') {
    checks.push(
      'Every interactive target is at least 44×44px, or has 24px of clear space around it.',
      'No functionality is available only on hover, since hover does not exist here.',
      'Interactive elements are not placed where a thumb cannot reach comfortably.',
    )
  }

  if (profile.hover) {
    checks.push('Hover states are present, and none of them shift layout.')
  }

  if (profile.zoom > 1) {
    checks.push(
      'Content reflows to a single column rather than requiring scrolling in two directions.',
      'No container has a fixed height that now clips its own content.',
      'Sticky and fixed elements do not consume so much of the viewport that content becomes unreachable.',
      'All functionality remains available; nothing is hidden purely because the space shrank.',
    )
  }

  if (effectiveWidth(profile) <= 400) {
    checks.push(
      'Tables have a workable strategy: horizontal scroll within a labelled region, or a stacked layout.',
      'Long unbroken strings such as URLs and identifiers wrap or truncate rather than forcing overflow.',
      'Modals and sheets fit, and their action buttons are reachable without scrolling past them.',
    )
  }

  if (effectiveWidth(profile) >= 1600) {
    checks.push(
      'Prose containers stay within a readable measure rather than stretching to the full width.',
      'Layouts fill the space meaningfully rather than leaving a narrow column marooned in the middle.',
    )
  }

  if (profile.height <= 500) {
    checks.push(
      'Nothing relies on viewport-height units in a way that makes content unreachable.',
      'Fixed headers and footers together consume a small enough share of the height to leave content usable.',
    )
  }

  return checks
}

/**
 * Breakpoint advice.
 *
 * The values are a starting point rather than a prescription, and the accompanying note
 * says why: breakpoints belong where a specific layout stops working, which is a property
 * of the content, not of the hardware. A named-device breakpoint set will always be
 * slightly wrong for your particular design, because it was derived from someone else's.
 */
export const BREAKPOINTS = {
  xs: 380,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type BreakpointName = keyof typeof BREAKPOINTS

export const BREAKPOINT_GUIDANCE =
  'Treat these as defaults, not requirements. Add a breakpoint where your layout visibly ' +
  'fails and remove any you never use. A design with two well-chosen breakpoints is better ' +
  'than one with six inherited ones, because every breakpoint is a layout you have promised ' +
  'to maintain.'

/** Emit a min-width media query for a named breakpoint. */
export function mediaUp(name: BreakpointName): string {
  return `@media (min-width: ${BREAKPOINTS[name]}px)`
}

/**
 * Emit a max-width media query, offset below the breakpoint.
 *
 * The 0.02px offset avoids the overlap that occurs with fractional viewport widths, where
 * both a `max-width: 768px` and a `min-width: 768px` query can match simultaneously on
 * displays with non-integer device pixel ratios.
 */
export function mediaDown(name: BreakpointName): string {
  return `@media (max-width: ${BREAKPOINTS[name] - 0.02}px)`
}

/** Container-query equivalent, which is the right default for a component. */
export function containerUp(widthPx: number, containerName?: string): string {
  return containerName
    ? `@container ${containerName} (min-width: ${widthPx}px)`
    : `@container (min-width: ${widthPx}px)`
}
