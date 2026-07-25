# Architecture

This document explains how Vishwakarma is put together and, more usefully, why it is put
together that way. Most of the decisions here were forced by one of three constraints:
context is the scarcest resource an agent has, agents cannot act on adjectives, and a tool
that surprises someone's repository gets uninstalled.

---

## The shape of the problem

A design system has always had two audiences: the humans who build with it, and the humans
who maintain it. Both read documentation, exercise judgment, and ask each other questions
when something is ambiguous.

An AI coding agent is a third audience with none of those properties. It does not read the
whole documentation site, it cannot ask a designer what "premium" means here, and it has a
hard budget on how much guidance it can hold in mind at once. It will, however, follow a
precise instruction with far more consistency than a human ever will, and it will happily
run a checker against its own output if you give it one.

So the architecture is organised around what that third audience can actually use:

**Computation over description.** Anything that can be calculated is calculated. Contrast
ratios, perceptual colour ramps, fluid scales, motion timing, stagger delays. An agent
estimating a contrast ratio in the mid-tones is wrong often enough to matter; an agent
calling a function is never wrong.

**Constraints over conventions.** Guidance that can be expressed as a checkable constraint
is expressed as one. "Use the spacing scale" is a convention and gets violated. "Every
spacing value must be a member of this set, and here is the checker" is a constraint and
gets enforced.

**Mechanisms over rules.** Every normative rule states why it is true. An agent that
understands the mechanism can correctly override the rule when the mechanism does not
apply; an agent given a bare rule can only obey or ignore it, and it will ignore it exactly
when overriding would have been wrong.

**Budgets over abundance.** Every piece of guidance declares its context cost, and the
tooling reports what an installation spends per request. More guidance is not better
guidance if it crowds out the user's actual code.

---

## Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│  Distribution                                                         │
│  cli · adapters · mcp · registry                                      │
│  Gets the intelligence into an agent, in that agent's native form     │
├──────────────────────────────────────────────────────────────────────┤
│  Knowledge                                                            │
│  skills · prompts                                                     │
│  What good looks like, why, and how to check                          │
├──────────────────────────────────────────────────────────────────────┤
│  Enforcement                                                          │
│  audit · lint · testing                                               │
│  Proves the guidance was actually followed                            │
├──────────────────────────────────────────────────────────────────────┤
│  Implementation                                                       │
│  primitives · ui · motion · scroll · layout · three · theme · tailwind│
│  Working code that already embodies the guidance                      │
├──────────────────────────────────────────────────────────────────────┤
│  Foundation                                                           │
│  core · tokens                                                        │
│  Pure computation. No React, no filesystem, no network                │
└──────────────────────────────────────────────────────────────────────┘
```

The strict purity of the foundation layer is not fastidiousness. `@vishwakarma/core` is
consumed from four genuinely different runtimes: React components in a browser, the token
build pipeline in Node, the CLI in a terminal, and the MCP server answering an agent's
question. A single `import React` or `import fs` in that layer would make it unusable in at
least two of them, and the alternative — reimplementing the colour maths per consumer — is
how three subtly different definitions of "contrast" end up in one repository.

---

## Package graph

```
core ──┬─→ tokens ──┬─→ theme
       │            ├─→ tailwind
       │            └─→ ui
       │
       ├─→ primitives ─→ ui
       ├─→ motion ──┬─→ ui
       │            └─→ scroll
       ├─→ layout
       ├─→ three
       ├─→ audit ──┐
       ├─→ lint    │
       ├─→ testing │
       │           │
       └─→ skills ─┼─→ adapters ─→ cli
                   └─────────────→ mcp

registry ─→ cli          prompts (standalone)
```

Dependencies point in one direction only. Nothing in the foundation knows that React
exists; nothing in the implementation layer knows that agents exist; nothing in the
knowledge layer knows which agent will consume it.

That last one is the load-bearing separation. A skill is authored once with no knowledge of
its destination, and the adapters translate. If skills knew about targets, every new agent
format would mean editing every skill.

---

## The five original mechanisms

### 1. The Design Contract

A design system expressed as machine-checkable constraints rather than a document.

```ts
const report = checkContract(DEFAULT_CONTRACT, {
  spacingValues: [13, 16, 24],
  contrastPairs: [{ ratio: 3.2, kind: 'body', label: 'caption' }],
  animatedProperties: ['width'],
  hasReducedMotionGuard: false,
})
// → 3 errors, each with the found value, the expected value, and the exact fix
```

The contract deliberately says nothing about what a page should *contain*. It constrains
the grammar of the output, in the same way a type system says nothing about what your
function should compute. That restraint is what makes it applicable to any project.

The checker is pure and synchronous — numbers in, violations out, no filesystem or DOM.
That lets the same logic run inside a linter, a browser test, a CI job, and an agent's own
self-review loop without four implementations drifting apart.

Severity is split three ways because a contract where everything is an error is a contract
that gets switched off the first time a legitimate exception appears. Accessibility and
correctness failures are errors because they harm users. Aesthetic deviations are warnings
because context wins and reasonable people differ.

### 2. The Motion Grammar

Interface motion is communication, not decoration. Once you accept that, most animation
decisions stop being aesthetic and become semantic: you are not choosing a duration, you
are choosing what kind of event this is.

```ts
resolveMotion({ intent: 'exit', distance: 'short' })
// → { durationMs: 115, easing: accelerating, cssTransition: '...' }
```

Eight intents — `enter`, `exit`, `transform`, `respond`, `attract`, `occupy`, `affirm`,
`reject` — each carrying an easing, a duration band, and whether it survives a
reduced-motion preference. Distance scales duration sublinearly, because perceived speed
tracks something closer to the square root of distance than to distance itself.

The payoff is reviewability. "This exit is using an entrance easing" is a factual claim
that can be checked. "This feels cheap" is not.

### 3. The Skill Manifest (VSM)

Every agent invented its own instruction format, and none of them can read each other's.
Anyone publishing agent guidance therefore maintains N copies and lets N−1 rot.

VSM is a deliberate *superset* of the most constrained target rather than a lowest common
denominator, so each adapter's job is subtraction rather than invention.

Three properties distinguish it from a folder of Markdown:

**Tiering.** Content is declared in layers with token budgets — a description always
loaded, a body loaded on activation, references loaded only on request.

**Evidence.** Rules carry rationale, source, and confidence, so they can be reasoned about
rather than merely obeyed.

**Verifiability.** A skill ships the checks that prove its own advice. Models are far better
at recognising a violation than at avoiding one, which is why the self-review pass earns
its cost.

### 4. Progressive disclosure with declared budgets

```
vishwakarma add --all

  Claude Code    always   157 tok    on demand  13.0k tok
  Cursor         always   157 tok    on demand  13.0k tok
  Cline          always  13.0k tok   on demand      0 tok  ← heavy
```

Cline concatenates every rules file into the system prompt, so per-skill files do not buy
on-demand loading there. Rather than hide that, the CLI reports it and suggests a focused
subset or the MCP target.

Reporting the cost is the point. A toolkit that quietly spends a fifth of the context
window on guidance the agent did not need has made the agent worse while appearing helpful.

### 5. Non-destructive installation

Files we create in directories we own are replaced outright. Shared files — `AGENTS.md`,
`CLAUDE.md`, `.github/copilot-instructions.md` — are written into a delimited section:

```md
# My project
Always use tabs. Never touch the legacy folder.

<!-- vishwakarma:begin — generated, do not edit between these markers -->
...generated guidance...
<!-- vishwakarma:end -->
```

Re-syncing replaces only the region between the markers. Uninstalling removes it and leaves
the rest, deleting the file only if nothing else remains. New content is *appended* rather
than prepended, because the top of a hand-written instruction file usually carries the
author's most important context and displacing it changes the emphasis of a document we do
not own.

---

## How a skill reaches an agent

```
skill source (TypeScript, typed against SkillManifest)
        │
        │  validate: budgets, tier rules, rule ids, evidence on every MUST
        ▼
   renderBody()  ← shared once, so targets cannot drift
        │
        ├─→ claude-code   .claude/skills/<id>/SKILL.md + references/
        ├─→ cursor        .cursor/rules/<id>.mdc
        ├─→ windsurf      .windsurf/rules/<id>.md
        ├─→ cline         .clinerules/<id>.md
        ├─→ codex         AGENTS.md            (delimited section)
        ├─→ gemini-cli    GEMINI.md            (delimited section)
        ├─→ copilot       .github/copilot-instructions.md
        └─→ mcp           .mcp.json — served on demand, nothing preloaded
```

Body rendering happens exactly once, in one function. If each adapter rendered its own,
they would diverge, and the compile-once-run-anywhere promise would quietly become false
while still appearing to work.

Skills are authored as TypeScript rather than Markdown with frontmatter. The trade is real:
prose is slightly less pleasant to write inside a template literal, and in exchange rules
become first-class data that can be sorted, filtered, counted, budgeted, and validated at
compile time. Since the entire premise is that rules should be checkable, storing them as
prose would have undercut the argument.

---

## Token flow

```
brand colour + scale inputs
        │
        ▼
   buildTokenSet()          derives ~213 tokens
        │                   ramps, scales, elevation, motion, layers
        ▼
   primitive tier           color.brand.600 = oklch(...)
        │
        ▼
   semantic tier            color.action.primary.bg = {color.brand.600}
        │                   + per-theme overrides
        ▼
   transforms
        ├─→ CSS custom properties  (references preserved as var())
        ├─→ Tailwind v4 @theme     (mapped into utility namespaces)
        ├─→ TypeScript             (typed, var()-valued)
        ├─→ JSON                   (raw or resolved)
        └─→ Markdown               (documentation)
```

References are preserved as `var()` rather than flattened. That is the entire mechanism
behind runtime theming: a semantic token compiled to a literal would not respond to a
`[data-theme]` override, because the indirection it needed would already have been resolved
away at build time.

The tier rule is enforced, not documented. A component token may not reference a primitive
directly — it must go through a semantic token. Skipping the middle tier is the shortcut
that leaves you, at rebrand time, deciding one call site at a time whether this particular
blue meant "primary action" or "informational" or just happened to be blue.

---

## Testing strategy

Foundation packages are unit tested hard, because they are pure functions with correct
answers and everything else depends on them being right. The colour tests check known
reference values — black on white is exactly 21:1, mid-grey lands above 0.5 perceptual
lightness — rather than snapshotting whatever the implementation happened to produce.

That discipline has already paid. A test asserting that adjacent ramp steps stay
distinguishable failed on the first run, and it was correct to: the lightness curve used a
smoothstep whose slope falls to zero at both ends, collapsing the two lightest steps into
the same colour. The comment above that code claimed it prevented exactly the problem it
was causing.

Implementation packages are tested for behaviour and accessibility contracts — keyboard
operability, focus management, ARIA state — rather than for rendered markup, which changes
for reasons that are not defects.

---

## Deliberate omissions

**No runtime CSS-in-JS.** Style computation at runtime costs on every render and interferes
with server components. Tokens compile to CSS custom properties; variants compile to class
strings.

**No component-level breakpoint props.** A component does not know the viewport, it knows
its container. Container queries are the correct primitive, and a `md={6}` prop encodes an
assumption that is wrong the moment the component is reused in a sidebar.

**No barrel-file-only entry.** Barrels are convenient and they silently defeat tree-shaking
in some bundler configurations. Every package ships `sideEffects: false` and per-module
paths.

**No opinionated visual style in `primitives`.** Behaviour and appearance have different
lifecycles. A team that likes the accessibility work but not the aesthetics should be able
to take the first without the second.

**No telemetry.** A tool that reads your source code should not phone home about it.
