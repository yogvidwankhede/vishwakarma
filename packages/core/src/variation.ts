// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The variation engine.
 *
 * Every other mechanism in this project makes generated interfaces *correct*. This one
 * makes them *different from each other*, which turns out to be a separate problem with a
 * separate cause.
 *
 * A language model asked to design a page collapses onto its modal answer. Not because the
 * modal answer is bad — it is usually defensible — but because it is the highest-probability
 * continuation, and nothing in the request pushes away from it. Ask ten times and you get
 * ten centred hero sections above three equal feature cards. The tenth is not worse than the
 * first; it is identical to it, and that sameness is what makes generated work legible as
 * generated.
 *
 * Telling a model to "be creative" does not fix this. It is an adjective, and adjectives do
 * not survive contact with a language model — the model already believes it is being
 * creative. Raising temperature does not fix it either: that trades mode collapse for
 * incoherence, which is a worse failure, and it degrades correctness at the same time.
 *
 * The fix is to move the choice out of the sampler and into the input. Pre-vet a set of
 * options that are *all* acceptable, then select among them deterministically using a hash
 * of something that already varies between requests — the brief itself. The model is then
 * told which option it is working with, as a constraint rather than a suggestion.
 *
 * Three properties follow, and all three matter.
 *
 * **Every outcome is safe.** The variety comes from a curated set, so an unusual choice is
 * unusual rather than wrong. This is the opposite of temperature, which buys variety by
 * admitting bad outputs.
 *
 * **The same brief gives the same answer.** Two runs of the same request produce the same
 * layout, which means results are reproducible, reviewable, and diffable. A designer who
 * asks for the same page twice does not get a different one and wonder which is canonical.
 *
 * **Different briefs give different answers.** A one-word change to the brief re-rolls the
 * selection, because the hash is over the whole string. That is the behaviour you want: it
 * is the *project* that should differ, not the run.
 */

/* -------------------------------------------------------------------------- */
/* Hashing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A stable 32-bit hash of a string.
 *
 * Deliberately not a cryptographic hash and deliberately not `Math.random`. It must be
 * fast, dependency-free, and — most importantly — *stable across processes and across
 * releases*, because the whole value proposition is that the same brief resolves to the
 * same design tomorrow and on someone else's machine. A seeded PRNG from a library would
 * work until the library changed its algorithm in a minor version and every project's
 * generated layout silently shifted.
 *
 * This is the FNV-1a construction: multiply by a prime, exclusive-or the byte, repeat. It
 * has good avalanche behaviour for short strings, which is what matters here — "landing
 * page for a dental clinic" and "landing page for a dental practice" must land in
 * different buckets, not adjacent ones.
 */
export function hashString(input: string): number {
  // FNV-1a 32-bit offset basis.
  let hash = 0x811c9dc5

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    // Multiply by the FNV prime (16777619) using shifts, because a direct multiply
    // overflows the 53-bit float mantissa and loses the low bits that carry the entropy.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0
  }

  return hash >>> 0
}

/**
 * A deterministic sequence of hashes from one seed.
 *
 * Needed because a single design involves several independent choices — layout, rhythm,
 * emphasis, accent placement — and using the same hash for all of them correlates them.
 * Correlated choices reproduce the very problem this module exists to solve, one level up:
 * you get four distinct designs instead of one, rather than the combinatorial space the
 * option sets actually describe.
 */
export function* hashSequence(seed: string): Generator<number, never, void> {
  let state = hashString(seed)
  for (;;) {
    // xorshift32 — cheap, well-distributed, and stable by construction.
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    yield state
  }
}

/* -------------------------------------------------------------------------- */
/* Option sets                                                                 */
/* -------------------------------------------------------------------------- */

export interface VariantOption<T = string> {
  /** The value handed to the agent. */
  value: T
  /** What choosing this actually means, in terms the agent can act on. */
  guidance: string
  /**
   * Relative selection weight. Defaults to 1.
   *
   * Weighting exists so that a set can contain a conventional default *and* several
   * genuine alternatives without the conventional one disappearing. A set where every
   * option is equally likely produces a different monoculture rather than none — it just
   * shifts which layout everyone gets.
   */
  weight?: number
  /** Conditions under which this option should be excluded from selection. */
  unsuitableFor?: string[]
}

export interface VariantAxis<T = string> {
  /** Identifier, e.g. `hero-composition`. */
  id: string
  /** What this axis varies. */
  describes: string
  options: Array<VariantOption<T>>
}

/**
 * The built-in axes.
 *
 * Each option here is one a competent designer might reasonably choose, which is the entry
 * requirement: the set is a set of *defensible* answers, not a set of possible ones. An
 * option that is merely different but worse would make the engine a randomiser, and a
 * randomiser is worse than mode collapse — at least the modal answer is defensible.
 *
 * The guidance strings are written as instructions to an agent rather than as labels,
 * because that is how they are consumed. "Split hero" tells the model nothing it can act
 * on; the sentence describing what a split hero requires does.
 */
export const VARIANT_AXES: Record<string, VariantAxis> = {
  heroComposition: {
    id: 'hero-composition',
    describes: 'How the primary above-the-fold region is arranged',
    options: [
      {
        value: 'centred-stack',
        weight: 2,
        guidance:
          'Centred headline, subhead, and action, stacked on a plain ground. The conventional choice, and correct when the message is short and the product needs no demonstration. Earn it by giving the stack far more surrounding space than feels necessary and by keeping the subhead to one line.',
      },
      {
        value: 'split-asymmetric',
        weight: 2,
        guidance:
          'Text on one side, product imagery on the other, at an uneven ratio such as 7:5 rather than 6:6. The uneven split is the point: an exact half reads as a template, and the wider side should be whichever carries the argument.',
      },
      {
        value: 'offset-editorial',
        guidance:
          'Oversized headline set left, with supporting text indented into the second column of the grid and imagery bleeding past the container on one side. Reads as considered rather than assembled. Needs a real type scale to work; do not attempt it with only two sizes.',
      },
      {
        value: 'stacked-with-proof',
        guidance:
          'Headline and action, then immediately a real artefact — a screenshot, a terminal session, a chart with real numbers. No decorative illustration. Strongest when the product is visual and the claim is specific.',
      },
      {
        value: 'quiet-utility',
        guidance:
          'Small headline, immediate entry into the interface itself. Correct for tools whose audience already knows what the product is and resents being marketed to. The restraint is the message.',
      },
    ],
  },

  sectionRhythm: {
    id: 'section-rhythm',
    describes: 'How successive page sections vary from one another',
    options: [
      {
        value: 'alternating-bleed',
        weight: 2,
        guidance:
          'Alternate contained sections with full-bleed ones. The width change alone signals a change of subject, without needing a background colour on every other section.',
      },
      {
        value: 'progressive-density',
        guidance:
          'Start sparse and grow denser down the page, as the reader moves from being persuaded to being informed. Detail belongs where intent is already established.',
      },
      {
        value: 'anchored-aside',
        guidance:
          'A sticky element — navigation, a summary, a persistent action — beside content that scrolls past it. Do not pin anything taller than about two thirds of the viewport, or short screens lose the content entirely.',
      },
      {
        value: 'uniform-with-one-break',
        weight: 2,
        guidance:
          'Consistent section treatment throughout, with exactly one section that breaks the pattern — wider, darker, or overlapping its neighbours. Put the break where the argument turns.',
      },
    ],
  },

  emphasisStrategy: {
    id: 'emphasis-strategy',
    describes: 'Which tool carries visual hierarchy',
    options: [
      {
        value: 'scale-led',
        weight: 2,
        guidance:
          'Hierarchy through size, with a wide gap between adjacent steps. Requires restraint elsewhere: if size is doing the work, colour and weight must stay nearly uniform or they compete with it.',
      },
      {
        value: 'weight-led',
        guidance:
          'Hierarchy through font weight at nearly constant size. Produces a dense, editorial feel and works well where the layout is tight and size changes would break the grid.',
      },
      {
        value: 'space-led',
        weight: 2,
        guidance:
          'Hierarchy through isolation: important things get disproportionate surrounding space rather than larger type. The most sophisticated of the three and the hardest to overdo.',
      },
      {
        value: 'surface-led',
        guidance:
          'Hierarchy through elevation and surface tone, with type nearly uniform. Suits dense application UI where a type-driven hierarchy would fight the data.',
      },
    ],
  },

  accentDiscipline: {
    id: 'accent-discipline',
    describes: 'How the accent colour is deployed',
    options: [
      {
        value: 'single-action',
        weight: 3,
        guidance:
          'The accent appears only on the primary action. Everywhere else is neutral. The most reliable choice, and the one that makes the action genuinely findable.',
      },
      {
        value: 'action-and-thread',
        guidance:
          'The accent on the primary action, plus one thin recurring thread — a rule, an underline, a marker — that ties sections together. At most two roles total.',
      },
      {
        value: 'neutral-with-imagery',
        guidance:
          'No accent in the interface at all; colour comes entirely from photography or product imagery. Demands strong imagery, and looks accidental without it.',
      },
    ],
  },

  motionCharacter: {
    id: 'motion-character',
    describes: 'The overall motion personality',
    options: [
      {
        value: 'restrained',
        weight: 3,
        guidance:
          'Motion only on state change and only where it explains something. No scroll-triggered entrances. The right default, and almost never the wrong answer.',
      },
      {
        value: 'sectional-reveal',
        weight: 2,
        guidance:
          'One reveal per section, on the section as a group rather than on each element. Never the same entrance on forty individual items.',
      },
      {
        value: 'responsive-tactile',
        guidance:
          'No entrance animation at all; the entire motion budget goes into press, hover, drag, and transition feel. Interactions feel expensive while the page itself stays still.',
      },
    ],
  },
}

/* -------------------------------------------------------------------------- */
/* Selection                                                                   */
/* -------------------------------------------------------------------------- */

export interface VariationRequest {
  /**
   * The brief, verbatim.
   *
   * Used as the seed, so it must be the *user's* text rather than a summary. Summarising
   * first would collapse distinct briefs onto the same seed, reintroducing the problem at
   * the point where it is hardest to notice.
   */
  brief: string
  /** Axes to resolve. Defaults to all of them. */
  axes?: string[]
  /** Additional seed material, for deliberately re-rolling a selection. */
  salt?: string
  /**
   * Conditions that exclude options, matched against `unsuitableFor`.
   *
   * This is how a brand or an existing design system overrides the engine. A team with a
   * fixed hero treatment excludes the alternatives rather than fighting the selection, and
   * the engine varies only what is genuinely free to vary.
   */
  constraints?: string[]
}

export interface ResolvedVariant {
  axis: string
  describes: string
  value: string
  guidance: string
  /** How many options were available after constraints were applied. */
  fromOptions: number
}

export interface VariationResult {
  seed: string
  variants: ResolvedVariant[]
  /** A block of text suitable for handing straight to an agent. */
  directive: string
}

/**
 * Weighted selection from one axis.
 *
 * Weights are expanded into a cumulative range rather than by repeating entries, so a
 * weight of 3 costs nothing extra and non-integer weights work.
 */
function selectWeighted(options: VariantOption[], roll: number): VariantOption {
  const total = options.reduce((sum, option) => sum + (option.weight ?? 1), 0)
  // Map the 32-bit roll into [0, total). Using the modulo of the raw integer would bias
  // toward low indices when total does not divide 2^32; scaling by the fraction does not.
  let target = (roll / 0x100000000) * total

  for (const option of options) {
    target -= option.weight ?? 1
    if (target <= 0) return option
  }
  // Floating-point drift can leave a tiny positive remainder on the last option.
  return options[options.length - 1] as VariantOption
}

/**
 * Resolve a set of design decisions deterministically from a brief.
 *
 * Returns both the structured selections and a ready-to-use directive block, because the
 * consumer is usually an agent that wants prose and occasionally a tool that wants data.
 */
export function resolveVariation(request: VariationRequest): VariationResult {
  const { brief, axes, salt = '', constraints = [] } = request

  const seed = `${brief.trim().toLowerCase()}::${salt}`
  const rolls = hashSequence(seed)

  const selected = (axes ?? Object.keys(VARIANT_AXES))
    .map((key) => VARIANT_AXES[key])
    .filter((axis): axis is VariantAxis => axis !== undefined)

  const variants: ResolvedVariant[] = selected.map((axis) => {
    const available = axis.options.filter(
      (option) => !(option.unsuitableFor ?? []).some((condition) => constraints.includes(condition)),
    )

    // A constraint set that excludes everything is a configuration error, but throwing
    // here would break generation for a recoverable problem. Falling back to the full set
    // and reporting the count lets the caller notice without losing the run.
    const pool = available.length > 0 ? available : axis.options
    const chosen = selectWeighted(pool, rolls.next().value)

    return {
      axis: axis.id,
      describes: axis.describes,
      value: String(chosen.value),
      guidance: chosen.guidance,
      fromOptions: pool.length,
    }
  })

  const directive = [
    'Design direction for this brief, selected deterministically. Treat these as',
    'constraints you have been given, not suggestions to consider — the point of fixing them',
    'in advance is to stop the design collapsing onto the most predictable option. Each was',
    'chosen from a set in which every entry is a defensible choice, so an unfamiliar',
    'selection is unfamiliar rather than wrong.',
    '',
    ...variants.flatMap((variant) => [
      `**${variant.describes}: ${variant.value}**`,
      variant.guidance,
      '',
    ]),
    'If a selection genuinely conflicts with an existing brand or design system, follow the',
    'brand and say which selection you overrode and why. Do not override one because it is',
    'unfamiliar.',
  ].join('\n')

  return { seed, variants, directive }
}

/**
 * Report how many distinct designs the current axis set can express.
 *
 * Worth surfacing, because it is the honest measure of whether the engine is doing
 * anything. Five axes with four options each is 320 combinations before weighting — enough
 * that two projects sharing a design direction is a coincidence rather than the default.
 */
export function variationSpace(axes: string[] = Object.keys(VARIANT_AXES)): {
  combinations: number
  axes: Array<{ id: string; options: number }>
} {
  const resolved = axes
    .map((key) => VARIANT_AXES[key])
    .filter((axis): axis is VariantAxis => axis !== undefined)

  return {
    combinations: resolved.reduce((product, axis) => product * axis.options.length, 1),
    axes: resolved.map((axis) => ({ id: axis.id, options: axis.options.length })),
  }
}
