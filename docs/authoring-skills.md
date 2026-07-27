# Authoring skills

A skill is a unit of design knowledge an agent can load: working knowledge, normative rules
with the reasoning behind each, and checks the agent runs against its own output before
reporting done.

This guide covers writing one that actually changes agent behaviour, which is a narrower
target than writing one that reads well.

Commands below assume the CLI is on your path — see [Getting started](getting-started.md#install)
for the one-line alias (the packages are not yet on npm).

## The shape

Skills live in `packages/skills/src/catalog/` as typed TypeScript modules.

```ts
import type { SkillManifest } from '../manifest.js'

export const cardDesign: SkillManifest = {
  vsm: '1.0',
  id: 'card-design',
  name: 'Card Design',
  description: 'Use when building cards, tiles, or any repeated content container.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'ui',

  activation: {
    intents: ['building a card, tile, or repeated content container'],
    globs: ['**/*Card*.tsx'],
  },

  content: {
    summary: 'How to make repeated containers read as a set without becoming monotonous.',
    body: `# Card Design\n\n...`,
  },

  rules: [/* ... */],
  verification: [/* ... */],
}
```

Then regenerate the barrel:

```bash
node scripts/generate-catalog.mjs
pnpm --filter @vishwakarma/skills exec tsc --noEmit
vishwakarma validate
```

The barrel is generated rather than hand-maintained, because a forgotten export produces a
skill that exists, compiles, is tested, and is never loaded by anything.

### Why TypeScript rather than Markdown with frontmatter

The trade is real: prose is slightly less pleasant to write inside a template literal.

What it buys is that rules become first-class data rather than paragraphs. They can be
sorted by strength, counted, budgeted, validated at compile time, rendered differently per
target, and cross-referenced against the checks that verify them. Since the whole premise of
this project is that design guidance should be checkable, storing the rules as prose would
have undercut the argument on page one.

## The description is the most important field

Several agents decide whether to load a skill from the `description` alone. It is one
sentence, it is always in context, and it determines whether any of the rest ever gets read.

Write it as a **trigger condition**, not a summary:

```
Bad:  "Comprehensive guidance on typography, type scales, and font loading."
Good: "Use when choosing typefaces, building a type scale, or loading webfonts."
```

The first describes contents. The second describes a situation the agent can recognise it is
in. The validator warns when a description contains no trigger word, because this is the
single most common reason a well-written skill is never used.

Keep it under about forty tokens. Some agents truncate.

## Write the body for an agent, not a reader

An agent reading your skill is about to make a decision. Everything you write should help
with that decision.

**Lead with the governing principle.** One paragraph explaining the mechanism that most of
the rest follows from. If a reader stops after that paragraph, they should still be
meaningfully better at the task.

**Name specific failure modes.** This is the highest-value content you can write. "Ensure
good hierarchy" is unusable. "A heading with equal space above and below it is not visually
bound to its own content — the eye reads it as floating between two blocks" is immediately
actionable, and it transfers to situations you did not anticipate.

**Give real numbers.** Not "use appropriate durations" but "below roughly 100ms a transition
is perceived as instantaneous and the animation is wasted work; above roughly 400ms it
starts to feel like something the user is waiting for".

**Explain the mechanism, always.** An agent that knows *why* exits should be faster than
entrances can extend the principle to a case you never wrote about. An agent given the bare
rule cannot, and will apply it in exactly the situation where it does not hold.

**Prose, not bullet soup.** Paragraphs that make arguments. Bullets for genuine
enumerations — a list of properties, a set of options — not as a substitute for connecting
ideas.

### Respect the budget

The body is charged against context every time the skill activates. Target 1,600–2,200
tokens; `vishwakarma validate` warns beyond that.

The failure mode of skill authoring is always the same: the author knows a great deal,
writes all of it, and produces something no agent can afford to load. If the body is running
long, the material is not too big — it is layered wrong. Move the depth into references.

## Rules

A rule is one checkable sentence with its reasoning attached.

```ts
{
  id: 'card-design/consistent-height',
  strength: 'should',
  statement: 'Give cards in a set equal height, and align their actions to the bottom.',
  evidence: {
    rationale:
      'Ragged card bottoms make a grid read as unfinished, and misaligned actions force the eye to search for the button in each card rather than scanning one predictable position.',
    confidence: 'strong',
  },
  exceptions: ['Masonry layouts, where uneven heights are the intended effect.'],
  examples: {
    language: 'tsx',
    bad: '<div className="grid grid-cols-3">',
    good: '<div className="grid grid-cols-3 items-stretch [&>*]:flex [&>*]:flex-col">',
  },
  verifiedBy: 'card-consistency',
}
```

**Strength.** `must` and `must-not` for things that harm users or break the system.
`should` and `should-not` for strong defaults with legitimate exceptions. `may` for
permissions. Overusing `must` devalues it — if everything is mandatory, the agent has no
signal about what to sacrifice when constraints conflict.

**One rule per rule.** If the statement needs "and", it is probably two rules. A rule that
cannot be checked in one glance will not be checked at all.

**Evidence is required on `must`.** Enforced by the validator. The reason is not pedantry: a
rule whose mechanism is stated can be correctly *overridden* when the mechanism does not
apply, and a rule without one can only be obeyed blindly or ignored entirely. Both of those
are worse than an informed judgment call.

Be honest with `confidence`. `established` for things with a real evidence base — the
readable-measure range, colour vision deficiency prevalence. `strong` for widely-held
professional consensus. `contested` where practitioners genuinely disagree. `opinion` for
house style. Marking a preference as established is how a rule set loses credibility.

**Contrastive examples.** A `bad` and a `good` that differ in exactly one dimension. The
delta is what teaches; two unrelated examples teach much less than one pair.

**State the exceptions.** A rule with no stated exceptions reads as either dishonest or
unconsidered, and the agent will find the exception anyway — better it recognises the case
than that it decides the rule is unreliable.

## Verification

Checks are what separate a skill from an essay.

```ts
{
  id: 'card-consistency',
  kind: 'self-review',
  description: 'Confirm the card set reads as a set.',
  blocking: true,
  questions: [
    'Do all cards in this set have equal height at every breakpoint?',
    'Are the primary actions aligned to the same vertical position?',
    'With the longest realistic title in one card, does the layout still hold?',
  ],
}
```

Self-review is the most valuable kind, and the reason is a property of how models work: they
are considerably better at *recognising* a violation than at *avoiding* one. Asking the
agent to look again, with specific questions, catches a surprising share of errors for
almost no cost.

Write questions that can be answered by inspection and that have a wrong answer. "Is the
design good?" is unanswerable. "With the longest realistic title in one card, does the
layout still hold?" has a checkable answer and forces the agent to actually try it.

Mark a check `blocking` when failing it means the work is not done. Use it sparingly enough
that it means something.

`command` checks run a shell command; `contract` checks evaluate against the Design
Contract.

## References

Deep material, loaded only when its question is the agent's question.

```ts
references: [
  {
    id: 'card-patterns',
    title: 'Card patterns by content type',
    answers: 'Which card layout suits this kind of content?',
    content: `# Card patterns\n\n...`,
  },
]
```

The `answers` field is what the agent sees when deciding whether to spend context on the
reference, so write it as the question a reader would have, not as a description of
contents. "Which card layout suits this kind of content?" invites the right fetch;
"Additional information about cards" does not.

Good reference material: exhaustive catalogues, worked examples, decision tables, edge cases,
background theory. Anything that is occasionally essential and usually irrelevant.

## Activation

```ts
activation: {
  intents: ['building a card, tile, or repeated content container'],
  globs: ['**/*Card*.tsx', '**/cards/**'],
  keywords: ['card', 'tile'],
  always: false,
}
```

**Intents** are matched semantically by agents that select skills by meaning. Write them as
the *user's* phrasing of the problem, not your internal taxonomy — "the user says it looks
generic" beats "aesthetic quality deficiency remediation".

**Globs** trigger on file access. Cheap and precise.

**Keywords** are for agents that match literally.

**`always: true` is expensive.** It costs the full body on every request. Reserve it for
project-wide invariants, keep those under a few hundred tokens, and expect the validator to
complain if you do not.

`requires` pulls in dependencies automatically, so a skill that builds on another is never
installed alone with dangling references.

## Testing it

Validation catches structural problems:

```bash
vishwakarma validate
```

Compilation catches translation problems:

```bash
vishwakarma add card-design --target claude-code cursor codex --dry-run
```

Read the generated files. A skill that reads well in source and badly compiled — because its
rules lose their examples on a compact target, say — needs restructuring, not just editing.

Then the real test: give an agent a task the skill should apply to, and see whether behaviour
changes. If it does not, the usual causes are a description that does not read as a trigger,
a body that buries the actionable content beneath preamble, or rules stated as preferences
rather than as checkable claims.

## Publishing your own

Skills do not have to live in this repository. The manifest type is exported, so you can
build a private catalog for your own design system:

```ts
import type { SkillManifest } from '@vishwakarma/skills'
import { compile } from '@vishwakarma/adapters'

const mySkills: SkillManifest[] = [/* ... */]
const files = compile(mySkills, { targets: ['claude-code', 'cursor'] })
```

This is the intended use for teams with a real design system: encode *your* constraints,
your token names, your component APIs, and your accepted exceptions. Generic guidance can
only take an agent so far — the last mile is knowing that in your codebase the primary
button is `<Button intent="primary">` and that the marketing site is allowed to break the
spacing scale but the product is not.
