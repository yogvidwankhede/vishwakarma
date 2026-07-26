// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Almost everything written about design tokens is written about the wrong thing.
 *
 * The tooling is not the hard part. Transforming JSON into CSS custom properties is an
 * afternoon's work, and a dozen generators already do it. The hard part is that a token is
 * a *name*, names are the only interface the rest of the organisation ever touches, and a
 * badly named token is worse than no token at all — it looks like abstraction while
 * hard-coding the exact decision it was supposed to make changeable.
 *
 * So this skill spends most of its budget on naming, tiering, and the mechanics that make
 * drift impossible: single-source generation, compile-time typing, cycle detection, and
 * theme key parity. Those are the parts that decide whether a rebrand is one line or three
 * weeks.
 */
export const designTokens: SkillManifest = {
  vsm: '1.0',
  id: 'design-tokens',
  name: 'Design Tokens',
  description:
    'Use when creating, naming, restructuring, or generating design tokens, or when wiring a token source into CSS, Tailwind, or TypeScript.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'foundation',
  tags: ['tokens', 'design-system', 'dtcg', 'naming', 'build-pipeline', 'theming', 'style-dictionary'],

  activation: {
    intents: [
      'creating or restructuring a design token set for a product or design system',
      'naming tokens, or deciding whether something deserves to be a token at all',
      'generating CSS custom properties, a Tailwind theme, or TypeScript constants from one source',
      'adopting or evaluating the W3C Design Tokens format',
      'the user reports that a value had to be changed in several places, or that two token files disagree',
      'adding a second theme, brand, or density mode on top of an existing token set',
      'deprecating, renaming, or versioning tokens without breaking consumers',
    ],
    globs: [
      '**/tokens/**',
      '**/tokens.{json,ts,js,yaml}',
      '**/*.tokens.json',
      '**/design-tokens/**',
      '**/style-dictionary.config.*',
      '**/tailwind.config.*',
      '**/theme/**',
      '**/*.css',
    ],
    keywords: [
      'design tokens',
      'token',
      'dtcg',
      'style dictionary',
      'css variables',
      'custom properties',
      'theme config',
      'token pipeline',
    ],
  },

  content: {
    summary:
      'Treat a token as a named decision rather than a variable: three tiers, a naming grammar that never encodes value, one generated source of truth, typed consumption, and cycle-checked aliases.',

    body: `# Design Tokens

A token is not a variable that happens to hold a colour. It is a **named decision**, and the
name is the whole product. \`#4f46e5\` is a fact; \`--color-action\` is a decision someone
made and can revisit. Renaming two hundred hex literals to \`--indigo-600\`, \`--indigo-650\`
buys nothing — you still cannot tell which of them the primary button may use.

Judge any token system by one question: **when a decision changes, how many files change?**
More than one means the naming failed, not the tooling.

---

## 1. Three tiers, and the change that proves them

    primitive   --indigo-600: oklch(0.51 0.19 277)        what the value IS
    semantic    --color-action: var(--indigo-600)         what it MEANS
    component   --button-primary-bg: var(--color-action)  where it is USED

Now rebrand from indigo to teal. **Primitives:** add a teal ramp. You do not rename indigo,
because a primitive names a colour and that colour has not changed. **Semantic:** one line,
\`--color-action: var(--teal-600)\`. **Component tier and every consumer:** untouched. One
edit, whole product.

The same change against a codebase writing \`bg-indigo-600\` in JSX gives a teal product with
indigo buttons, found by a designer three weeks later — because nothing about \`indigo-600\`
is *wrong*. It is exactly the colour it claims to be. That is why the failure is silent.

Tier sizes are diagnostic: a few hundred primitives, 30 to 80 semantic names — the
vocabulary the whole team must hold — and a component tier that is nearly empty.

---

## 2. Naming is a grammar, not a habit

Fix an order and never deviate: general to specific.

    category . concept . property . variant . state

    color.bg.surface.raised        space.inset.md
    color.fg.muted                 radius.control.sm
    color.border.input.focus       duration.exit.fast

Names then sort into families, and a missing member becomes an obvious gap.

**Never name a semantic token after its value.** \`--color-text-grey\` is false in dark mode,
so you either lie or duplicate. The subtler trap is the *half*-semantic name: \`blue-primary\`,
\`primary-blue\`, \`brand-purple\`. These look like roles but hard-code appearance, and fail
exactly when they finally matter, at the second brand or the first high-contrast theme. Value
names belong on primitives and nowhere else.

---

## 3. Everything else is a token too

Colour is the easy tier. Systems drift most in what nobody bothers to tokenise: spacing,
sizing, radius, border width, shadow, duration, easing, z-index, opacity, typography.

**A scale token must state its own relationship.** \`spacing-medium\` with no defined relation
to \`spacing-small\` is a synonym for a number: nobody can predict what comes next, so someone
invents \`spacing-medium-large\`. Use ordinal names over a stated generator — base 4, ladder
4/8/12/16/24/32/48/64, so \`space.2\` is 8px. The generator is the token; the numbers are
output.

**z-index especially.** Unnamed stacking values reach 9999 within a year. Five names —
\`base\`, \`dropdown\`, \`sticky\`, \`overlay\`, \`toast\` — spaced 100 apart ends it.

---

## 4. Composite tokens cost more than they look

The W3C format defines composite types — \`typography\`, \`shadow\`, \`border\`,
\`transition\`, \`gradient\`, \`strokeStyle\` — whose \`$value\` is an object. They model intent
well and consume badly: CSS cannot read one property out of an object, so a \`typography\`
token must be exploded into \`font-size\`, \`line-height\` and \`letter-spacing\` by the
generator anyway, many tools cannot alias a single sub-property, and overriding one field per
theme means restating the whole object. Author composites where values move together, but emit
the decomposed primitives too.

---

## 5. The DTCG format, honestly

The Design Tokens Format Module reached its first stable version, **2025.10**, in October
2025, alongside Color and Resolver modules. It is a W3C **Community Group** report, not a
Recommendation: no formal standards-track status sits behind it.

The shape: any object with \`$value\` is a token. \`$type\` names the type and is inherited
from the nearest ancestor group that declares one; \`$description\`, \`$extensions\` and
\`$deprecated\` are the other reserved keys, and groups may use \`$extends\`. Aliases are
written \`"{color.brand.600}"\`, or as a JSON Pointer via \`$ref\`. Colours are objects —
\`colorSpace\`, \`components\`, optional \`alpha\` and \`hex\` — not strings, which is what
lets the format carry Display P3 and OKLCh.

Interoperability is real but partial: Style Dictionary shipped first-class DTCG support in v4
against an earlier editors' draft, and full 2025.10 support was still landing in v5. Author in
DTCG, but **pin the draft your toolchain actually implements**.

---

## 6. Generate; never hand-maintain a second copy

One source transforms into every consumer:

    tokens.json --> tokens.css   :root { --space-2: 0.5rem }
                --> theme.css    @theme { --spacing-2: 0.5rem }
                --> tokens.ts    export const space = { 2: '0.5rem' } as const

Hand-maintenance fails silently and specifically: someone adds \`--space-9\` to the CSS, does
not add it to the TypeScript, and the two disagree for months because nothing compares them.
**Add a CI step that regenerates and runs \`git diff --exit-code\`.** That one check turns
drift from a slow leak into a failed build.

---

## 7. Make misuse a compile error

Emit \`as const\` objects and derive key unions:

\`\`\`ts
export const space = { 1: '0.25rem', 2: '0.5rem', 3: '0.75rem' } as const
export type SpaceToken = keyof typeof space
\`\`\`

A function taking \`SpaceToken\` rejects \`7\` at compile time instead of rendering a
slightly-off gap nobody notices. Pair it with a lint rule banning raw hex and \`px\` literals
in component source, and Tailwind arbitrary values (\`p-[13px]\`).

---

## 8. Aliases: resolve at build, detect cycles

Resolve references at build time and make both failure classes hard errors. An **unresolved**
alias is worse than a crash: CSS treats \`var(--typo)\` as invalid at computed-value time and
falls back to the inherited value, so a misspelling renders a transparent border rather than
throwing.

A **cycle** hangs a naive resolver. Walk the graph depth-first with three-colour marking —
unvisited, in-progress, resolved — and on re-entering an in-progress node throw with the whole
path (\`color.action -> color.brand -> color.action\`). Keep chains to three hops; deeper
means a missing tier, not a clever one.

---

## 9. Themes substitute a set; they never add names

A theme is a different *set of values for the same set of names*. The DTCG Resolver module
formalises this with \`sets\`, \`modifiers\` whose \`contexts\` map a name such as \`light\`
to sources, and a \`resolutionOrder\` merging them with later sources winning.

The invariant that matters: **every theme defines exactly the same semantic keys.** A name
present in light and absent in dark is not a smaller theme but a broken one, and it surfaces
as an invisible element rather than an error. Diff the key sets in CI.

---

## 10. Deprecate; do not delete

Tokens are a public API even inside one repository. Rename by *adding* the new name, pointing
the old one at it, and marking the old \`$deprecated: "Use color.fg.muted"\`. Remove only on a
major version.

---

## The failures worth naming

- **Hex constants with new names.** A flat tier of \`--brand-blue-1\` to \`--brand-blue-9\`:
  nothing can be re-themed, no contrast contract can be stated.
- **Tokens in three places.** CSS variables, a Tailwind config, and a TS file, each hand-edited.
  They agree on the day they are written and never again.
- **Component one-offs.** \`--card-header-padding-top\`, used once — a value with a long name.
- **Undefined scales.** \`size-medium\`, \`size-large\`, \`size-larger\`, \`size-xl-alt\`.
- **Aliases as the whole system.** Five hops to a hex with no tier boundaries, so nobody knows
  which level to edit.`,

    references: [
      {
        id: 'worked-architecture',
        title: 'A complete worked token architecture',
        answers:
          'What does a full token set actually look like, end to end — every category, every tier, with real names and real values?',
        content: `# A complete worked token architecture

This is a whole set for a typical product application: enough to build with, small enough to
hold in your head. Values are illustrative; the *structure* is the point.

## Tier 1 — primitives

Primitives are a raw material library. They carry no opinion about usage, so they are named
after what they are. They are the only tier where a value-derived name is correct.

    color.brand.50 … .950     eleven OKLCh steps, one hue family
    color.neutral.50 … .950   same ladder, chroma 0.005–0.02 at the brand hue
    color.red / .amber / .green / .blue   semantic hue families, same ladder

    space.0  0        space.4  16px      space.10  40px
    space.1  4px      space.5  20px      space.12  48px
    space.2  8px      space.6  24px      space.16  64px
    space.3  12px     space.8  32px      space.24  96px

    size.font.100  12px      size.font.500  20px
    size.font.200  14px      size.font.600  24px
    size.font.300  16px      size.font.700  30px
    size.font.400  18px      size.font.800  36px

    radius.0 0 / .1 2px / .2 4px / .3 6px / .4 8px / .5 12px / .6 16px / .full 9999px
    border.0 0 / .1 1px / .2 2px / .3 4px
    duration.0 0ms / .1 80ms / .2 120ms / .3 160ms / .4 200ms / .5 280ms / .6 400ms
    ease.standard cubic-bezier(0.2, 0, 0, 1)
    ease.decelerate cubic-bezier(0, 0, 0, 1)
    ease.accelerate cubic-bezier(0.3, 0, 1, 1)
    weight.400 / .500 / .600 / .700

The spacing ladder is base-4 and deliberately non-linear at the top: the gaps between 4 and
24 are 4px because small adjustments must be available, and the gaps above 32 grow because
nobody can perceive the difference between 64 and 68. A purely geometric ladder (4, 8, 16, 32,
64) is too coarse in the middle; a purely linear one produces forty values nobody uses.

## Tier 2 — semantic

This tier is the vocabulary. Everything a component touches lives here, and every entry is
named for what it is *for*.

    color.bg.canvas          neutral.50      page
    color.bg.surface         white           cards, panels
    color.bg.surface.raised  white + shadow  popovers
    color.bg.subtle          neutral.100     zebra rows, wells
    color.bg.hover           neutral.100
    color.bg.action          brand.600
    color.bg.action.hover    brand.700
    color.bg.danger          red.600

    color.fg.default         neutral.900
    color.fg.muted           neutral.600     4.5:1 against bg.canvas — checked
    color.fg.subtle          neutral.500     non-essential text only
    color.fg.on-action       white
    color.fg.link            brand.700

    color.border.default     neutral.200     decorative separators
    color.border.strong      neutral.300     input outlines — 3:1, checked
    color.border.focus       brand.600

    space.inset.sm/md/lg     space.2 / .4 / .6      padding inside containers
    space.stack.sm/md/lg     space.2 / .4 / .8      vertical gaps between siblings
    space.section            space.24               between top-level sections

    font.body.size / .height / .weight        size.font.300 / 1.55 / weight.400
    font.heading.size / .height / .tracking   size.font.700 / 1.1 / -0.02em
    font.caption.size / .height / .tracking   size.font.200 / 1.4 / 0.01em

    radius.control           radius.2        buttons, inputs
    radius.surface           radius.4        cards
    radius.overlay           radius.5        modals, sheets

    elevation.raised / .floating / .overlay
    duration.enter / .exit / .emphasis        duration.4 / .2 / .5
    z.base 0 / z.dropdown 100 / z.sticky 200 / z.overlay 300 / z.toast 400

Four things about this tier are worth stating explicitly.

**Spacing splits by axis of use, not by size alone.** \`space.inset.md\` and
\`space.stack.md\` may resolve to the same primitive today, but they are different decisions
and will diverge the first time a density mode arrives. Naming them apart now costs nothing.

**Radius scales with element size.** A shared \`radius.md\` applied to a 32px button and a
600px modal is the uniform-radius failure with a token name on it.

**Exit duration is shorter than enter duration** and that asymmetry is encoded in the tier,
not left to each component. The user has already decided when something exits; making them
watch the departure is making them wait.

**Every contrast contract is stated against a semantic pair.** "\`color.fg.muted\` clears
4.5:1 against \`color.bg.canvas\` and \`color.bg.surface\` in every theme" is auditable.
The equivalent claim about \`neutral.600\` is meaningless, because \`neutral.600\` has no
background.

## Tier 3 — component

Keep this tier close to empty. A component token is justified when a component needs a value
the semantic tier should not be forced to carry:

    button.height.sm/md/lg          32px / 40px / 48px
    input.height                    40px
    sidebar.width                   280px
    sidebar.width.collapsed         64px

These are legitimate: they are structural dimensions specific to one component that no other
component should inherit, and they are the ones a consumer genuinely might want to override.
\`--card-header-padding-top\` is not legitimate — it is \`space.inset.md\` with a longer name.

## Theme sets

Each theme replaces tier 2 and nothing else. The key list is identical; only the right-hand
side moves.

    light:  bg.canvas neutral.50   fg.default neutral.900  bg.action brand.600
    dark:   bg.canvas neutral.900  fg.default neutral.100  bg.action brand.500

Note that the dark theme points \`bg.action\` at a *lighter* primitive, and that its accent
primitive carries less chroma. Both are re-derivations, not inversions, and both are invisible
to every component.

## What a component may reference

Semantic tokens, and its own component tokens. Nothing else. If a component needs a value
that exists nowhere in tier 2, the correct move is to add a semantic token and justify it in
review — not to reach past the tier into \`neutral.400\`.`,
      },
      {
        id: 'transformation-pipeline',
        title: 'The token transformation pipeline',
        answers:
          'How do I turn one token source into CSS, Tailwind, and TypeScript outputs, and how do I stop the outputs from drifting?',
        content: `# The token transformation pipeline

The pipeline exists to make one fact true: **there is exactly one file a human edits.**
Everything else in the repository that expresses a token value is a build artefact, and build
artefacts do not drift because nobody writes them.

## Stages

    parse -> resolve -> validate -> transform -> format -> write

**Parse.** Read the source (DTCG JSON, or TypeScript if you prefer authoring in a typed
language) into a flat map keyed by dotted path, retaining \`$type\`, \`$description\` and
\`$deprecated\`. Flatten early: nested traversal in later stages is where subtle bugs live.

**Resolve.** Replace every \`{alias}\` with its target's resolved value. Depth-first, with
three-colour marking:

    visit(node):
      if colour[node] === GREY:  throw Cycle(path.concat(node))
      if colour[node] === BLACK: return value[node]
      colour[node] = GREY
      for ref in refs(node): visit(ref)
      colour[node] = BLACK

A cycle must name the whole path, not just the offending node — \`color.action ->
color.brand -> color.action\` is diagnosable, "circular reference detected" is not. An
unresolved reference must be equally fatal, because CSS will not tell you: \`var(--typo)\`
is invalid at computed-value time and silently resolves to the inherited or initial value,
producing a transparent border rather than an error.

**Validate.** Cheap checks that catch expensive mistakes:

- Every alias target exists, and no chain exceeds three hops.
- Every theme defines the identical set of semantic keys. Diff them and fail on asymmetry.
- No semantic token resolves directly to a literal — it must resolve through a primitive.
- No component or application source references a primitive. This is a grep over the app,
  not over the tokens, and it is the check that actually holds the architecture together.
- Every contrast pair declared in the contract still passes, in every theme.
- Every token has a \`$description\`.

**Transform.** Per-platform value conversion. Web wants \`rem\` for typography and spacing so
that user font-size preferences scale the layout, and \`px\` for hairlines and radii that must
not scale. iOS wants points as floats; Android wants \`dp\` and \`sp\`. Names transform too:
dotted paths become \`--kebab-case\` for CSS, \`camelCase\` for TypeScript, and
\`snake_case\` for Android resources. Keep the transforms declarative and named, so a
platform's output can be explained by listing which transforms ran.

**Format and write.** Serialise per target.

## The outputs

    :root {
      --color-bg-canvas: oklch(0.98 0.004 265);
      --space-inset-md: 1rem;
    }

    @theme {
      --color-bg-canvas: oklch(0.98 0.004 265);
      --spacing-inset-md: 1rem;
    }

    export const color = { bgCanvas: 'var(--color-bg-canvas)' } as const
    export type ColorToken = keyof typeof color

Two decisions inside those three files matter more than the rest of the pipeline.

**The TypeScript output should emit \`var()\` references, not resolved values.** If it emits
\`oklch(...)\`, then any component that reads a token from JavaScript is frozen into whichever
theme was active at build time, and theme switching stops working for exactly those
components — a bug that appears only in dark mode and only in a few places. Emitting
\`var(--color-bg-canvas)\` keeps runtime substitution intact. The exception is a canvas or
WebGL context, which cannot consume custom properties; give those a separately-named resolved
export so the trade-off is visible at the import site.

**Tailwind v4 configures its theme in CSS via \`@theme\`,** which means the token pipeline
writes a stylesheet rather than a JavaScript config object, and the utilities Tailwind
generates are derived from the same custom properties the rest of the CSS reads. Generate the
\`@theme\` block; never hand-edit it. Emitting only the semantic scale into \`@theme\` — and
leaving primitives out — is what removes \`bg-indigo-600\` from the set of things a developer
can write at all.

## Stopping drift

Generation alone does not prevent drift; it only makes drift *detectable*. Three
enforcements make it impossible.

**Regenerate in CI and fail on any diff.** Run the build and then \`git diff --exit-code\`.
A pull request that edits \`tokens.css\` by hand now fails, with the diff as the error
message.

**Mark generated files.** A header comment plus a CODEOWNERS entry plus a \`.gitattributes\`
\`linguist-generated=true\` line collapses them in review, which stops well-meaning reviewers
from suggesting edits to a file that will be overwritten.

**Ban primitives at the usage boundary.** A lint rule that rejects hex literals, raw \`px\`
values, and primitive token names inside component source. Without this, the pipeline is
correct and unused: developers keep writing values inline because it is faster, and the token
set slowly becomes documentation of a system nobody follows.

## Versioning

Publish tokens as a versioned package, even for internal consumers, and apply semver to
*names* rather than to values:

- **Patch:** a value changes, no name changes. A brand tweak is a patch.
- **Minor:** names are added, or a name is deprecated with a working alias in place.
- **Major:** a name is removed or its meaning changes.

Changing what \`color.fg.muted\` *means* — from "secondary text" to "disabled text" — is a
major change even though the string is identical, because every existing usage is now wrong.
This is the change most often shipped as a patch and it is the one that causes the most
damage.

Ship a machine-readable deprecation list alongside the tokens: DTCG's \`$deprecated\` accepts
a string, so \`"$deprecated": "Use color.fg.muted"\` is enough for a codemod to migrate
consumers automatically, and enough for an agent to avoid the deprecated name without being
told.`,
      },
    ],
  },

  rules: [
    {
      id: 'design-tokens/semantic-tier-required',
      strength: 'must',
      statement:
        'Provide a semantic tier between primitive values and component usage, and let application and component code reference only semantic or component tokens.',
      evidence: {
        rationale:
          'A theme, a rebrand, or a contrast fix is a change to the mapping from meaning to value. Code bound directly to a primitive has no mapping to change, so every such change becomes an edit to every consumer, and the edit cannot be verified because a primitive is never wrong about itself.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '.card { background: var(--neutral-50); border: 1px solid var(--neutral-200); }',
        good: '.card { background: var(--color-bg-surface); border: 1px solid var(--color-border-default); }',
      },
      verifiedBy: 'tier-integrity',
    },
    {
      id: 'design-tokens/no-value-in-semantic-name',
      strength: 'must-not',
      statement:
        'Do not name a semantic token after its value, hue, or appearance — including part-semantic names such as blue-primary, brand-purple, or color-text-grey.',
      evidence: {
        rationale:
          'An appearance-derived name states a fact that only holds in one theme. The moment a second theme, brand, or contrast mode exists, the name is either false or must be duplicated, and a name that lies is worse than a literal because readers trust it.',
        confidence: 'strong',
      },
      examples: {
        language: 'json',
        bad: '{ "color": { "blue-primary": { "$value": "{color.blue.600}" } } }',
        good: '{ "color": { "bg": { "action": { "$value": "{color.brand.600}" } } } }',
      },
      verifiedBy: 'naming-audit',
    },
    {
      id: 'design-tokens/naming-grammar',
      strength: 'should',
      statement:
        'Name every token with a fixed general-to-specific grammar of category, concept, property, variant, and state, and apply the same order throughout the set.',
      evidence: {
        rationale:
          'A consistent left-to-right ordering makes names sort into families, makes autocomplete useful after the first segment, and makes a missing member of a family visible as a gap. Ad-hoc ordering produces synonyms that nobody can search for, so tokens get re-invented rather than reused.',
        confidence: 'strong',
      },
    },
    {
      id: 'design-tokens/scales-state-their-relationship',
      strength: 'must',
      statement:
        'Give every numeric scale a documented generator — a base unit, ratio, or explicit ladder — rather than opaque size names with no stated relationship between steps.',
      evidence: {
        rationale:
          'A name like spacing-medium carries no information about its relationship to spacing-small, so nobody can predict the next step or choose between two adjacent ones. The predictable outcome is invented intermediates such as medium-large, which destroys the scale precisely because the scale was never defined.',
        confidence: 'strong',
      },
      examples: {
        language: 'json',
        bad: '{ "space": { "small": {}, "medium": {}, "medium-large": {}, "large": {} } }',
        good: '{ "space": { "$description": "Base 4. Ladder 4/8/12/16/24/32/48/64.", "1": {}, "2": {}, "3": {}, "4": {} } }',
      },
    },
    {
      id: 'design-tokens/single-source-generation',
      strength: 'must',
      statement:
        'Derive every token artefact — CSS custom properties, Tailwind theme, TypeScript constants, platform payloads — from one source file by a build step.',
      evidence: {
        rationale:
          'Parallel hand-maintained copies diverge the first time someone adds a token under time pressure, and the divergence is invisible because nothing in the repository compares the files. Generation makes the copies functions of one input, so they cannot disagree.',
        confidence: 'established',
      },
      verifiedBy: 'pipeline-integrity',
    },
    {
      id: 'design-tokens/ci-regeneration-check',
      strength: 'should',
      statement:
        'Run the token build in CI and fail the job if regeneration produces any diff, so hand-edits to generated files are rejected.',
      evidence: {
        rationale:
          'Generation prevents drift only while everyone runs the generator. A regenerate-and-diff step converts a silent inconsistency that surfaces months later into a failed build with the offending diff as its error message.',
        confidence: 'strong',
      },
      examples: {
        language: 'bash',
        good: 'pnpm tokens:build && git diff --exit-code -- packages/tokens/dist',
      },
      verifiedBy: 'pipeline-integrity',
    },
    {
      id: 'design-tokens/typed-token-consumption',
      strength: 'should',
      statement:
        'Emit token constants with `as const` and derive key-union types so that referencing a token that does not exist is a compile error.',
      evidence: {
        rationale:
          'An unknown token name is otherwise a runtime non-event: CSS resolves an undefined custom property to the inherited or initial value, so a typo renders something plausible instead of failing. Moving the check to the type system converts an invisible visual defect into a build failure at the point of the mistake.',
        confidence: 'strong',
      },
      examples: {
        language: 'ts',
        bad: "export const space: Record<string, string> = { 1: '0.25rem', 2: '0.5rem' }",
        good: "export const space = { 1: '0.25rem', 2: '0.5rem' } as const\nexport type SpaceToken = keyof typeof space",
      },
    },
    {
      id: 'design-tokens/no-raw-literals-in-components',
      strength: 'should-not',
      statement:
        'Do not write raw colour, spacing, radius, or duration literals in component source, including Tailwind arbitrary-value syntax such as p-[13px].',
      evidence: {
        rationale:
          'Every literal is a decision made outside the system and therefore invisible to every future change of that decision. Arbitrary-value syntax is the most damaging form because it looks like idiomatic framework usage while bypassing the scale entirely.',
        confidence: 'strong',
      },
      exceptions: [
        'Values with no design meaning, such as a 1px optical nudge or a translate distance derived from a measured element.',
      ],
      verifiedBy: 'tier-integrity',
    },
    {
      id: 'design-tokens/alias-cycle-detection',
      strength: 'must',
      statement:
        'Fail the token build on any unresolved alias or reference cycle, and report the full path of a cycle rather than a single node.',
      evidence: {
        rationale:
          'An unresolved reference is silent at runtime because CSS treats an undefined custom property as invalid at computed-value time and falls back to the inherited or initial value, so the defect appears as a transparent or mis-coloured element far from its cause. A cycle non-terminates a naive resolver, and the path is the only diagnosable part of it.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Error: circular reference detected',
        good: 'Error: alias cycle: color.bg.action -> color.brand.default -> color.bg.action',
      },
      verifiedBy: 'alias-graph',
    },
    {
      id: 'design-tokens/shallow-alias-chains',
      strength: 'should-not',
      statement: 'Do not let an alias chain exceed three hops from component token to primitive value.',
      evidence: {
        rationale:
          'Each hop is a level at which a value could legitimately be overridden, so a chain longer than the tier count means there are levels with no defined meaning. Nobody can then decide which link to edit, and edits land at whichever level the author happened to find first.',
        confidence: 'opinion',
      },
      verifiedBy: 'alias-graph',
    },
    {
      id: 'design-tokens/theme-key-parity',
      strength: 'must',
      statement:
        'Define exactly the same set of semantic token names in every theme; a theme may change values but must never add or omit names.',
      evidence: {
        rationale:
          'A name missing from one theme resolves to nothing rather than raising an error, so the component renders with a transparent background or an inherited colour only in that theme. Key-set parity is a set difference that CI can compute exactly, which makes it one of the few token invariants that is cheap and total.',
        confidence: 'strong',
      },
      verifiedBy: 'theme-parity',
    },
    {
      id: 'design-tokens/deprecate-before-removal',
      strength: 'must',
      statement:
        'Rename or retire a token by adding the replacement, aliasing the old name to it, and marking the old name deprecated with the replacement named; remove it only in a major version.',
      evidence: {
        rationale:
          'Token names are a public interface even inside one repository, and consumers have no way to discover a removal except by observing broken output. A machine-readable deprecation carrying the replacement name lets a codemod migrate consumers and lets an agent avoid the stale name without being told.',
        confidence: 'strong',
      },
      examples: {
        language: 'json',
        good: '{ "color": { "fg": { "secondary": { "$value": "{color.fg.muted}", "$deprecated": "Use color.fg.muted" } } } }',
      },
      verifiedBy: 'deprecation-review',
    },
    {
      id: 'design-tokens/semver-on-meaning',
      strength: 'should',
      statement:
        'Version the token package on names and meanings, not values: changing what an existing token means is a major release even when the name is unchanged.',
      evidence: {
        rationale:
          'A meaning change silently invalidates every existing usage while leaving all code compiling and all builds green, so it is the one token change that cannot be detected by any automated check. Encoding it as a major version is the only signal consumers receive.',
        confidence: 'opinion',
      },
    },
    {
      id: 'design-tokens/describe-every-token',
      strength: 'should',
      statement:
        'Give every semantic token a description stating when to use it and when not to, not a restatement of its name.',
      evidence: {
        rationale:
          'Token selection is the decision consumers actually make, and it is made from the name alone unless something else is available. Both humans and agents choose the first plausible name, so the difference between fg-muted and fg-subtle has to be written down or it will not be honoured.',
        confidence: 'strong',
      },
      examples: {
        language: 'json',
        bad: '{ "$description": "The muted foreground colour." }',
        good: '{ "$description": "Secondary text that must remain readable; clears 4.5:1 on bg.canvas and bg.surface. For non-essential text use fg.subtle." }',
      },
    },
    {
      id: 'design-tokens/no-single-use-component-tokens',
      strength: 'should-not',
      statement:
        'Do not create a component token that wraps a semantic token for one consumer without adding a new decision.',
      evidence: {
        rationale:
          'Indirection is paid for by the reader on every lookup and is repaid only when more than one consumer shares the value or when the value is genuinely overridable. A single-use wrapper is a long name for a value, and it inflates the tier that should stay smallest.',
        confidence: 'opinion',
      },
      exceptions: [
        'Structural dimensions specific to one component that consumers are expected to override, such as a sidebar width or a control height.',
      ],
    },
    {
      id: 'design-tokens/decompose-composites-for-css',
      strength: 'should',
      statement:
        'Emit composite tokens such as typography and shadow in decomposed form for CSS consumers as well as in composite form for design tools.',
      evidence: {
        rationale:
          'CSS has no syntax for reading one property out of a custom property holding an object, so a composite cannot be partially consumed or partially overridden by a theme without restating the whole value. Emitting both shapes keeps the authoring intent while leaving each property independently addressable.',
        confidence: 'strong',
      },
    },
    {
      id: 'design-tokens/pin-format-version',
      strength: 'should',
      statement:
        'Record which Design Tokens Format Module version the token source targets, and verify that the generator implements that version before relying on its features.',
      evidence: {
        rationale:
          'The format reached its first stable version, 2025.10, as a W3C Community Group report rather than a Recommendation, and generator support lags it — Style Dictionary shipped DTCG support against an earlier editors draft. Features such as JSON Pointer aliases and the Resolver module may parse and be ignored, which fails silently.',
        source: 'Design Tokens Format Module 2025.10, Design Tokens Community Group',
        url: 'https://www.designtokens.org/tr/drafts/format/',
        confidence: 'established',
      },
    },
    {
      id: 'design-tokens/z-index-scale',
      strength: 'should',
      statement:
        'Allocate stacking order from a named z-index scale of a handful of layers rather than writing numeric values at usage sites.',
      evidence: {
        rationale:
          'Ad-hoc z-index values are chosen relative to whatever was on screen at the time, so they only ever increase, and the resulting numbers encode the order in which features were built rather than the intended layering. A named ladder makes the intended order the thing that is written down.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '.toast { z-index: 9999; }\n.modal { z-index: 10000; }',
        good: '.toast { z-index: var(--z-toast); }\n.modal { z-index: var(--z-overlay); }',
      },
    },
  ],

  verification: [
    {
      id: 'tier-integrity',
      kind: 'self-review',
      description: 'Confirm the token tiers are intact and that consumers stay above the primitive layer.',
      blocking: true,
      questions: [
        'Does any component, page, or utility class reference a primitive token or a raw literal value?',
        'Does every semantic token resolve through a primitive rather than holding a literal directly?',
        'How many tokens are in the semantic tier? If it exceeds roughly eighty, which of them are actually component tokens in the wrong place?',
        'How many component tokens have exactly one consumer and add no new decision?',
      ],
    },
    {
      id: 'naming-audit',
      kind: 'self-review',
      description: 'Confirm names describe roles and scales describe relationships.',
      blocking: true,
      questions: [
        'Does any semantic token name contain a hue, a value, or an appearance word — blue, purple, grey, light, dark?',
        'Do all names follow the same general-to-specific segment order?',
        'For each numeric scale, what is the stated generator, and where is it written down?',
        'Could a new contributor predict the name of a token that does not yet exist from the names that do?',
      ],
    },
    {
      id: 'pipeline-integrity',
      kind: 'self-review',
      description: 'Confirm there is exactly one hand-edited source and that outputs cannot drift.',
      blocking: true,
      questions: [
        'Which single file does a human edit to change a token, and is every other artefact generated from it?',
        'Does CI regenerate the outputs and fail on a non-empty diff?',
        'Are generated files marked as generated so reviewers do not edit them?',
        'Does the TypeScript output emit var() references rather than resolved values, so runtime theme switching still applies?',
      ],
    },
    {
      id: 'alias-graph',
      kind: 'self-review',
      description: 'Confirm every reference resolves and no chain is pathological.',
      blocking: true,
      questions: [
        'Does the build fail on an unresolved reference, or does it emit the raw alias string?',
        'Is there cycle detection, and does its error message contain the full path?',
        'What is the longest alias chain in the set, and what does each hop mean?',
      ],
    },
    {
      id: 'theme-parity',
      kind: 'self-review',
      description: 'Confirm every theme defines the same names.',
      blocking: true,
      questions: [
        'Is the set of semantic token names identical across every theme, mode, and brand? What is the set difference?',
        'Does any theme introduce a name that exists nowhere else?',
        'Were the contrast contracts re-checked against each theme independently rather than assumed from the default?',
      ],
    },
    {
      id: 'deprecation-review',
      kind: 'self-review',
      description: 'Confirm changes to the token set do not break consumers silently.',
      questions: [
        'Was any token name removed or renamed without leaving a deprecated alias pointing at its replacement?',
        'Does every deprecation name the token that replaces it, in machine-readable form?',
        'Did the meaning of any existing token change while its name stayed the same, and was that released as a major version?',
      ],
    },
    {
      id: 'contract-audit',
      kind: 'contract',
      description: 'Evaluate the token set against the project Design Contract.',
      contractSection: 'tokens',
    },
  ],

  relatedSkills: ['colour-systems', 'theming-systems', 'typographic-systems', 'design-judgment'],
}
