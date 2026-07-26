/**
 * What this auditor cannot see, stated where users will read it.
 *
 * A static auditor that presents its output as a complete picture is actively harmful. A
 * team that sees "0 violations" concludes the design system is being followed, when what
 * the tool actually established is that it found nothing in the subset of expressions it
 * understands. The gap between those two statements is where the regressions live.
 *
 * So every report format in this package carries these caveats, and the project summary
 * carries a count of the specific things it gave up on in that run. The intended reading of
 * a passing report is "no violations were found", never "there are no violations".
 */

/** The standing caveats, included verbatim in every report. */
export const STATIC_ANALYSIS_LIMITS: readonly string[] = [
  'Results are a lower bound. Values that only exist at runtime are invisible to a text scan.',
  'Class names assembled from variables, props or template holes are not resolved; only literal text is read.',
  'calc(), var(), clamp() and theme lookups are skipped rather than guessed at.',
  'Relative units (em, %, ch, vw) depend on layout context and are not converted to pixels.',
  'Utility-class scales are assumed to be the stock defaults unless a theme override is supplied.',
  'Contrast, touch-target size and layout overflow need a rendered page; they are not checked here.',
  'An accessible name supplied by an expression or a spread prop is treated as present, not missing.',
]

/** One line suitable for a report footer where the full list would be too much. */
export const LIMITS_SUMMARY =
  'Static analysis only: this is a lower bound on violations, not a complete count.'
