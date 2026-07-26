# Vishwakarma

**Design intelligence for AI coding agents.**

Vishwakarma teaches coding agents to build interfaces that look designed rather than
generated — and gives them the tools to prove it, rather than asking them to take it on
faith.

It installs into Claude Code, Cursor, Windsurf, Cline, Roo Code, Codex, Gemini CLI,
GitHub Copilot, Continue, Zed, and Aider, from one source of truth. It also runs as an MCP
server, which is the version with no standing context cost at all.

```bash
npx vishwakarma init
```

MIT licensed. Original work. No dependency on any paid tier.

---

## The problem

Ask any capable model to build a landing page and you will get the same page. Centred
headings over a three-card feature row. A purple-to-blue gradient on the h1. Uniform
padding, one border radius, one drop shadow on everything. Grey-on-white body copy that
misses the contrast threshold. No empty state, no loading state, and a layout that breaks
the moment a real product name turns out to be longer than "Acme".

The page is not ugly. Ugly would be interesting. It is *undifferentiated* — every element
carries the same visual weight, so the eye has nowhere to go, and the result reads as
competent and forgettable.

This is not a capability gap. Models know what good design looks like. The gap is that
"make it look premium" is not an instruction anything can act on, because the model already
believes that is what it produced. Adjectives do not survive contact with a language model.

So Vishwakarma does not use adjectives.

---

## What it does instead

**It names the specific failures.** Not "improve the hierarchy" but *"a heading with equal
space above and below it is not visually bound to its own content; use 48px above and 12px
below"*. Not "be accessible" but *"an interactive element's border must reach 3:1 against
its background, and this is the requirement that component libraries miss most often"*.

**It explains mechanisms, not preferences.** Every normative rule carries the reasoning
behind it, because an agent that understands *why* exits should be faster than entrances
can correctly override the rule when the reasoning does not apply. A rule without a
rationale can only be obeyed or ignored.

**It replaces taste with vocabulary.** The Motion Grammar turns "make the animation feel
expensive" into a choice between eight semantic intents — `enter`, `exit`, `transform`,
`respond`, `attract`, `occupy`, `affirm`, `reject` — from which duration and easing are
*derived*. You pick the meaning; the numbers follow.

**It makes design checkable.** The Design Contract expresses a design system as
machine-verifiable constraints instead of a document asking people to behave. An agent can
extract the spacing values it actually used and get back a list of violations with exact
fixes. "This is wrong and here is the correct value" beats "this could be improved".

**It computes instead of guessing.** Colour contrast is arithmetic. Perceptually even
colour ramps are arithmetic. Fluid type scales are arithmetic. Vishwakarma does the
arithmetic and hands back the answer, because a model estimating a contrast ratio in the
mid-tones will be wrong often enough to matter.

---

## Install

```bash
# Detect your agents, install a starter skill set, generate design tokens
npx vishwakarma init

# Or be specific
npx vishwakarma add design-judgment motion-design --target claude-code cursor

# Or give agents live, on-demand access with no context cost
npx vishwakarma add --target mcp
```

`init` reads your repository to work out which agents and frameworks you use, so the first
interaction is a confirmation rather than a questionnaire.

Every command that writes has a `--dry-run`, and anything written into a file you may have
authored — `AGENTS.md`, `CLAUDE.md` — goes into a delimited section, so re-syncing never
destroys your own instructions.

---

## What you get

### The skill catalog

Skills are the guidance layer: working knowledge, normative rules with the reasoning behind
each, and self-checks the agent runs against its own output before reporting done.

| | |
|---|---|
| **Design Judgment** | Diagnose and fix the tells of generated UI: flat hierarchy, uniform density, decorative gradients, untypeset type |
| **Typographic Systems** | Scales, the inverse relationships of size to leading and tracking, measure, font loading without layout shift |
| **Colour Systems** | Perceptual ramps, semantic token layering, dark themes that are a design rather than an inversion |
| **Layout & Composition** | Grid, subgrid, container queries, bento layouts that express rank, deliberate asymmetry |
| **Surface & Depth** | Coherent light sources, paired contact and ambient shadows, glassmorphism that is worth its GPU cost |
| **Responsive Architecture** | Intrinsic design, fluid scales that respect user font size, the viewport test matrix |
| **Interaction Design** | The full state matrix, feedback latency thresholds, why disabled buttons are an anti-pattern |
| **Accessible Components** | ARIA keyboard contracts, focus management, live regions, the criteria libraries fail most |
| **Interface Copy** | Microcopy as a design surface, error messages that say what to do next, empty states as onboarding |

Nine skills carrying **175 normative rules** — every one with its mechanism stated — plus
**57 self-review checks** and **18 deep references** loaded only on demand. More skills are
planned; see [ROADMAP.md](ROADMAP.md).

```bash
vishwakarma list          # browse
vishwakarma show motion-design   # read one in full
```

### The packages

| Package | What it is |
|---|---|
| `@vishwakarma/core` | Perceptual colour, modular and fluid scales, the Motion Grammar, the Design Contract checker, the viewport matrix. Pure and dependency-free |
| `@vishwakarma/tokens` | Three-tier token schema, generated default set, transforms to CSS, Tailwind v4, TypeScript, JSON, Markdown |
| `@vishwakarma/theme` | Runtime theme engine: flash-free switching, three-state preference, density and forced-colors modes |
| `@vishwakarma/layout` | Intrinsic layout primitives: stack, cluster, grid, bento, container queries |
| `@vishwakarma/motion` | Motion primitives with reduced-motion handling built in, and reveals that cannot hide your content |
| `@vishwakarma/skills` | The skill manifest format, validator, and catalog |
| `@vishwakarma/adapters` | Compiles one skill into thirteen agent formats |
| `@vishwakarma/mcp` | The MCP server: thirteen tools, two prompts, two resources |
| `@vishwakarma/cli` | The installer |

Nine packages, all building and typechecking, with 130 tests over the foundation.
[ROADMAP.md](ROADMAP.md) lists what is planned next and why it is not here yet.

---

## Nine ideas that are new here

**1. The Design Contract.** A design system expressed as machine-checkable constraints
rather than a document. It says nothing about what a page should contain — only what the
grammar of the output must be, in the same way a type system says nothing about what your
function should compute. That turns design review from a matter of opinion into a test.

**2. The Motion Grammar.** A closed vocabulary of motion *intents*, from which timing is
derived. Most animation decisions stop being aesthetic and start being semantic: you are
not choosing a duration, you are choosing what kind of event this is. "This exit is using an
entrance easing" then becomes a factual claim, in a way that "this feels cheap" is not.

**3. Compile-once-run-anywhere skills.** The Vishwakarma Skill Manifest is a deliberate
superset of the most constrained agent format, so every adapter's job is subtraction rather
than invention. One authored source, thirteen native outputs, no drift.

**4. Evidence-carrying rules.** Every rule can state its mechanism, its source, and its
confidence. This is what lets an agent reason about a rule rather than obey it — and, more
importantly, override it correctly when the mechanism does not apply.

**5. Declared context budgets.** Skills declare their disclosure tiers and token costs, and
the CLI reports what an installation will cost on every request. A toolkit that spends 8,000
tokens explaining animation to an agent writing a database migration has made the agent
worse, and most tools in this space will not tell you that they do it.

**6. Shippable self-verification.** A skill can carry the checks that prove its own advice.
A skill that says "use the spacing scale" *and* ships the checker is categorically more
useful than one that only asks nicely. Models are much better at recognising a violation
than at avoiding it, so the self-review pass catches a surprising share of errors for almost
no cost.


**7. Deterministic variation.** Asked for a landing page, a model returns its modal answer
every time. It is defensible, and it is identical across ten runs — which is precisely what
makes generated work legible as generated. Telling it to "be creative" fails because that is
an adjective; raising temperature trades sameness for incoherence. So the choice moves out of
the sampler and into the input: a pre-vetted set of options, selected by hashing the brief.
Every outcome is defensible, the same brief always resolves the same way — so results stay
reproducible and reviewable — and different briefs diverge. 720 combinations across five axes.

**8. An install lockfile that knows what you edited.** Generated files are replaced on sync,
so someone who tightens a rule for their codebase loses it the next time they add an
unrelated skill. Recording a hash of what we wrote separates four situations a naive
implementation collapses into one: unchanged, updated, *drifted* (you edited it, we have
nothing new), and *conflicting* (both moved). Only the last two interrupt you — a tool that
asks about every file trains people to click yes without reading.

**9. A project profile.** Generic advice is worth much less than advice that knows your
codebase. `vishwakarma profile` records the tokens you already define, the components you
already have, and how your dark theme is scoped, then writes it as Markdown an agent reads
before writing a line. Deterministic and safe to commit, so a teammate's agent starts from
the same understanding as yours.

---

## The workflow it teaches

Agents jump to code. That is the root cause of most of what is wrong with generated
interfaces, because every styling decision made before the content is ranked is a local
guess, and locally safe guesses sum to uniformity.

Vishwakarma's meta-skill imposes an order:

**Understand** the real job and the primary action. **Rank** the content before styling
anything. **Structure** the layout with real content at realistic lengths. **Systematise**
every value to a token. **Compose** with accessible primitives and all states designed.
**Choreograph** motion only where it carries meaning. **Stress** with the content and
viewport sweeps. **Critique** with the seven-pass protocol. **Report** what was assumed and
what needs a human.

---

## Example

Asking an agent with Vishwakarma installed to check a colour:

```
check_contrast(foreground: "#8a8a8a", background: "#ffffff")

→ wcagRatio: 3.45
  passesAA: false
  verdict: "Fails. Needs 4.5:1 for body, has 3.45:1."
  suggestedForeground: "#777777"
  suggestionNote: "Same hue and chroma, lightness adjusted to the nearest
                   value that passes, so the colour still reads as the same colour."
```

The suggestion matters as much as the verdict. An agent told only that something fails will
guess a replacement, and will usually guess a colour that either still fails or overshoots
into a different-looking colour.

---

## Documentation

- [Getting started](docs/getting-started.md) — install, wire up tokens, everyday commands
- [Architecture](docs/architecture.md) — how it fits together and why
- [Agent integration](docs/agents.md) — per-agent file locations and what each target loses
- [Authoring skills](docs/authoring-skills.md) — write your own
- [Roadmap](ROADMAP.md) — what is planned and what is deliberately not
- [Originality policy](ORIGINALITY.md)
- [Contributing](CONTRIBUTING.md)

---

## Originality

Vishwakarma is an original work. Every line of code, every skill, every token, and every
piece of documentation was written from scratch for this project.

It was informed by studying prior art — reading about what other projects do well and *why*
their approaches work, then designing our own solutions. A principle is not copyrightable;
an expression of it is. We took the former and wrote the latter ourselves.

[ORIGINALITY.md](ORIGINALITY.md) states the full policy, names the influences openly, and
explains what we deliberately did not do. CI enforces it: a dependency with a non-permissive
licence fails the build, and a source file carrying a foreign copyright header fails the
build.

---

## The name

Vishwakarma is the divine architect and craftsman in Indian tradition — the maker of forms,
the patron of builders. The name was chosen for its meaning: design, making, craft. The
project is secular and makes no religious claim.

---

## Contributing

Contributions are welcome, including — especially — disagreement with the rules. Every rule
in this project states its reasoning precisely so that it can be argued with. If you think
one is wrong, open an issue with the mechanism you think we got backwards.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

MIT.
