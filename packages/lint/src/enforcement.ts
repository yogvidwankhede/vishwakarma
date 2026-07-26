/**
 * Where a design rule should be enforced, and why it is usually not here.
 *
 * A lint rule is a very particular instrument. It sees one file, before it runs, with no
 * knowledge of what the component will be handed at runtime, what sits behind it on the page,
 * or what it looks like. Everything it can prove, it proves cheaply, instantly, and in the
 * editor — which is worth an enormous amount, because a diagnostic that arrives while the
 * author is still holding the problem in their head costs seconds, and the same diagnostic in
 * a code review costs a day and an argument.
 *
 * That is the case for putting *some* design rules here. The rules in this package share
 * three properties, and those three properties are the entire admission criterion:
 *
 *   1. The violation is decidable from the text of one file. `#3b82f6` is a hard-coded
 *      colour; `p-[13px]` is off the scale; `<button>` without `type` defaults to submit.
 *      No context outside the file changes any of those answers.
 *   2. There is a named, mechanical fix. Not "make it better" — "use `colour.accent.500`",
 *      "use 12px or 16px", "add `type="button"`". A rule that reports a problem without a
 *      remedy has only moved the work.
 *   3. The false-positive rate is near zero. This is the one people underestimate. A rule
 *      that is wrong one time in twenty does not cost five percent; it costs the whole rule,
 *      because the first time an author is told their correct code is wrong, they add an
 *      ignore comment, and the second time they turn the rule off for the directory.
 *
 * Now the other half, which matters more. There is a persistent fantasy that a sufficiently
 * clever rule set can enforce a design system end to end, and it produces rule sets that are
 * disabled wholesale within two quarters. The rules that do the damage are the ones that
 * require something a linter structurally cannot have:
 *
 *   - **Visual judgement.** Whether this heading is too heavy for the paragraph beneath it,
 *     whether the spacing rhythm reads as intentional, whether an illustration is doing any
 *     work. These are not thresholds with the constants set wrongly; they are questions about
 *     a rendered composition, and the answer changes with content. They belong to design
 *     review and to visual regression, which look at pixels.
 *   - **Composed, cross-file context.** Contrast is the standard example. A linter can see
 *     `color: var(--text-muted)` and cannot see what is painted behind it, because that was
 *     decided three components up in a different file, possibly by a prop. Heading order is
 *     the same: `<h3>` is correct or catastrophic depending on what rendered above it. These
 *     belong to the runtime auditor, which walks the composed tree and has the answers.
 *   - **Runtime state.** Focus order after a dialog opens, whether the focus trap actually
 *     traps, whether a live region announces once or three times. All of it requires the
 *     thing to be running. That is integration testing and axe-style auditing.
 *   - **Intent.** Whether this animation is delightful or gratuitous, whether this colour is
 *     the brand or a mistake that has been in the codebase long enough to look official. A
 *     human decides; the tooling's job is to make the decision visible, not to make it.
 *
 * A rule set that respects that boundary earns something specific: when it fires, people
 * believe it. That belief is the only asset lint has, it is spent by every false positive,
 * and it is not recoverable — nobody re-enables a rule they once turned off.
 *
 * The exported table below is not decorative. It is the checklist a new rule proposal is held
 * against, and the honest answer for most design concerns is a layer other than this one.
 */

/** Where a given concern can actually be checked. */
export type EnforcementLayer =
  | 'lint'
  | 'type-system'
  | 'token-pipeline'
  | 'runtime-audit'
  | 'visual-regression'
  | 'human-review'

/** One design concern, and the layer that can honestly enforce it. */
export interface EnforcementEntry {
  /** The concern, phrased as the thing you want to be true. */
  concern: string
  /** The layer that can decide it. */
  layer: EnforcementLayer
  /** Why that layer and not another — specifically, what the other layers cannot see. */
  rationale: string
}

/**
 * The admission criteria for a rule in this package.
 *
 * A proposed rule must satisfy all three. If it fails any one of them, the entry it belongs
 * in is {@link ENFORCEMENT_MAP}, under some layer other than `lint`.
 */
export const LINT_ADMISSION_CRITERIA: readonly string[] = [
  'The violation is decidable from the text of a single file.',
  'The message can name a specific, mechanical fix.',
  'A correct piece of code will essentially never trigger it.',
]

/**
 * The layer each common design concern belongs to.
 *
 * Kept as data rather than prose so the documentation site, the CLI auditor and any future
 * rule proposal template can all read the same list instead of three copies drifting apart.
 */
export const ENFORCEMENT_MAP: readonly EnforcementEntry[] = [
  {
    concern: 'Colours come from the palette rather than being hard-coded.',
    layer: 'lint',
    rationale:
      'The presence of a literal is a textual fact, and the palette is known at configuration time.',
  },
  {
    concern: 'Spacing values are steps on the scale.',
    layer: 'lint',
    rationale:
      'Absolute lengths resolve statically; the scale is a fixed list. Relative units are excluded because they do not resolve.',
  },
  {
    concern: 'Animations do not transition layout-triggering properties.',
    layer: 'lint',
    rationale:
      'Whether a property triggers layout is a property of CSS itself, identical in every codebase.',
  },
  {
    concern: 'Interactive elements have a type, an accessible name, and a sane tab index.',
    layer: 'lint',
    rationale:
      'Each is a missing or malformed attribute on a single element, visible in the source.',
  },
  {
    concern: 'Text meets its contrast requirement against its actual background.',
    layer: 'runtime-audit',
    rationale:
      'The background is composed from ancestors in other files and may depend on props or theme; only the rendered tree knows it.',
  },
  {
    concern: 'Heading levels descend without gaps.',
    layer: 'runtime-audit',
    rationale:
      'Correctness depends on what rendered before this component, which a single-file linter cannot see.',
  },
  {
    concern: 'Touch targets meet the minimum size.',
    layer: 'runtime-audit',
    rationale:
      'Final size comes from layout — padding, line height, flex behaviour and the content itself.',
  },
  {
    concern: 'Focus is trapped in a dialog and restored on close.',
    layer: 'runtime-audit',
    rationale:
      'This is behaviour over time, not structure. It needs the component mounted and driven.',
  },
  {
    concern: 'Token names resolve to real tokens.',
    layer: 'type-system',
    rationale:
      'A generated union type rejects a misspelled token at the call site, with autocomplete, before any linter runs.',
  },
  {
    concern: 'Ramps stay in gamut and keep even perceptual steps.',
    layer: 'token-pipeline',
    rationale:
      'Decided once where the tokens are generated. Checking it per-usage would be checking the same fact thousands of times.',
  },
  {
    concern: 'A change has not altered the appearance of anything unintended.',
    layer: 'visual-regression',
    rationale: 'Requires rendered pixels and a baseline. No static analysis substitutes for it.',
  },
  {
    concern: 'The hierarchy reads correctly and the composition feels deliberate.',
    layer: 'human-review',
    rationale:
      'A judgement about a rendered whole. Encoding it as a threshold produces a rule that is wrong often enough to be disabled, and its disabling takes the useful rules with it.',
  },
]

/** Concerns this package deliberately declines to check, for use in documentation. */
export function concernsFor(layer: EnforcementLayer): readonly EnforcementEntry[] {
  return ENFORCEMENT_MAP.filter((entry) => entry.layer === layer)
}
