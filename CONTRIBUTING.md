# Contributing

Contributions are welcome, and disagreement is especially welcome. Every rule in this
project states its reasoning precisely so that it can be argued with. If you think one is
wrong, the most valuable thing you can open is an issue explaining which mechanism we got
backwards.

## Setup

```bash
git clone <your fork>
cd vishwakarma
pnpm install
pnpm build
pnpm test
```

Node 20.11 or later, and pnpm 10 or later. The workspace uses Turborepo, so `pnpm build`
builds packages in dependency order and caches unchanged ones.

## The bar

This project is unusual in that a large share of its value is *prose* — skill bodies, rule
rationales, and code comments that explain failure modes. That prose is held to the same
standard as the code, and reviewed as carefully.

### Code

**Explain why, and what goes wrong otherwise.** A comment that restates the code is noise.
A comment that captures the decision, the trade-off, or the failure mode a future
maintainer would otherwise rediscover painfully is the most valuable thing in the file.

Compare:

```ts
// Set the flag to true
element.setAttribute('data-vk-reveal-ready', '')
```

against:

```ts
// The markup renders visible and this flag arms the hiding CSS. Inverting the
// responsibility this way means that if the script never runs, nothing is ever hidden —
// the page degrades to un-animated rather than to empty.
element.setAttribute('data-vk-reveal-ready', '')
```

**Pure where possible.** Anything in `core` or `tokens` must stay free of React, the
filesystem, and the network. Those packages are consumed from four different runtimes and a
single environment-specific import makes them unusable in most of them.

**Strict TypeScript.** `noUncheckedIndexedAccess` and `verbatimModuleSyntax` are on. Index
access yields `T | undefined`; type-only imports need `import type`. Relative imports end in
`.js` even though the source is `.ts`.

**Accessibility is not a follow-up.** Anything interactive needs keyboard operability, a
visible focus indicator, correct ARIA, and proper focus management. A component that looks
right and cannot be operated from a keyboard is not partially finished, it is wrong.

### Tests

Test against known correct answers, not against whatever the implementation currently
produces. Black on white is exactly 21:1; assert that, not a snapshot.

Test the property you actually care about. The ramp tests assert that adjacent steps stay
visually distinguishable, which is the thing that matters, rather than asserting specific
lightness values, which would break on any legitimate tuning.

Write the test that would have caught the bug. When fixing something, add the assertion
that fails before the fix and passes after.

### Skills

Skills live in `packages/skills/src/catalog/` as typed TypeScript modules. Run
`node scripts/generate-catalog.mjs` after adding one; the barrel is generated so nobody can
forget to register a skill.

The `description` field is the highest-leverage string in the manifest, because several
agents decide whether to load a skill from that alone. Write it as a trigger condition —
"Use when building or reviewing any user interface" — not as a summary of contents.

Every `must` or `must-not` rule needs an `evidence.rationale` explaining the mechanism. This
is enforced by the validator, and the reason is not pedantry: a rule whose reasoning is
stated can be correctly overridden when the reasoning does not apply, and a rule without one
can only be obeyed or ignored.

Respect the token budgets. `vishwakarma validate` warns when a tier overruns. A skill body
that costs eight thousand tokens has stopped being guidance and started being a tax.

Prefer contrastive examples. A `bad` and a `good` that differ in exactly one dimension
teaches more than either alone, because the delta isolates the lesson.

### Documentation

Write in prose. Bullet lists are for genuine enumerations — a list of file paths, a set of
options — not for avoiding the work of connecting ideas into an argument.

State the failure mode. "Import order matters" is forgettable; "getting this wrong produces
a page with no styling and no error message" is not.

No marketing voice. No "seamlessly", no "powerful", no "revolutionise".

## Originality

This is the one rule with no exceptions. Every contribution must be your own work, written
for this project.

Do not paste code, documentation, or rule text from another project, however permissively
licensed. Do not paraphrase someone else's documentation. Standard API shapes — a
`className` prop, the signature of a React ref — are conventions rather than expression and
are fine; a distinctive implementation or a distinctive turn of phrase is not.

Read [ORIGINALITY.md](ORIGINALITY.md) before your first contribution. CI enforces the
mechanical parts: a foreign copyright header fails the build, and so does a dependency
under a non-permissive licence.

If a contribution was drafted with AI assistance, that is fine — this project is about
AI-assisted engineering and gatekeeping on it would be incoherent. You are still
responsible for it being original and correct, exactly as you would be for code you typed
by hand.

## Licensing of contributions

Vishwakarma is licensed under Apache-2.0, and contributions come in under the same terms:
**by opening a pull request, you agree that your contribution is licensed to the project and
its users under Apache-2.0, and you confirm it is your own original work that you have the
right to submit.** No separate paperwork is required — this inbound-equals-outbound rule is
the norm for Apache projects and keeps the whole codebase under one clean licence.

New source files should carry the standard header (run `node scripts/apply-license-headers.mjs`
and it is added for you):

```ts
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0
```

## Pull requests

Keep them focused. One concern per pull request; a change that touches nine packages is
usually several changes wearing a coat.

Add a changeset for anything user-visible:

```bash
pnpm changeset
```

Fill in the pull request description with what changed, why, and what you considered and
rejected. That last part is worth more than it sounds — it stops reviewers re-proposing an
approach you already found wanting.

Before pushing:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/audit-originality.mjs
```

## Reporting problems

**Bugs:** include the version, the agent or framework involved, what you expected, and what
happened. A minimal reproduction is worth ten paragraphs of description.

**Wrong guidance:** this is the most valuable report we get. If a rule is incorrect,
outdated, or harmful in a context we did not consider, say so and explain the mechanism.
Rules are meant to be argued with; that is why each one states its reasoning.

**Originality concerns:** open an issue titled `originality:` with the file, the line range,
and the source you believe it came from. These are treated as high priority, and anything
that cannot be defended as independent work gets rewritten or removed without argument.

**Security:** see [SECURITY.md](SECURITY.md). Do not open a public issue.

## Adding an agent target

New agents appear regularly. Adding one means writing an adapter in
`packages/adapters/src/targets.ts` that answers three questions: where the agent looks for
instructions, what frontmatter dialect it understands, and how much context it can afford.

Everything else — body rendering, rule ordering, the merge strategy — is shared, and should
stay shared. An adapter that renders its own body is an adapter that will drift.

State your format assumptions in the adapter's `notes` field. Agent config formats change
without deprecation cycles, and a wrong path fails silently, which is the worst failure mode
available. When you are unsure of a detail, say so in the notes rather than guessing
confidently.

## Releases

Maintainers release with changesets. Packages version together under a fixed group, so a
change to `core` bumps everything — which is the honest representation of how tightly the
foundation is coupled to what sits on it.
