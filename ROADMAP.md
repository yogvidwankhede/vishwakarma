# Roadmap

This document is deliberately honest about what exists, what does not, and why. A roadmap
that reads as a feature list is marketing; a roadmap that says "this is not built yet and
here is the hard part" is useful.

## What exists today

Nine packages, all building, typechecking, and covered by 130 tests over the foundation.

| Package | State |
|---|---|
| `@vishwakarma/core` | Complete. Colour, scales, Motion Grammar, Design Contract, viewport matrix, 95 tests |
| `@vishwakarma/tokens` | Complete. Schema, generator, five transforms, tier validation |
| `@vishwakarma/skills` | Complete. Manifest format, validator, catalog of nine skills |
| `@vishwakarma/adapters` | Complete. Thirteen targets, merge safety, 35 tests |
| `@vishwakarma/cli` | Complete. init, add, remove, sync, list, show, detect, doctor, validate, targets, tokens |
| `@vishwakarma/mcp` | Complete. Thirteen tools, two prompts, two resources |
| `@vishwakarma/motion` | Core primitives. Reveal, RevealGroup, Transition, hooks |
| `@vishwakarma/theme` | Complete. Flash-free switching, three-state preference, density, forced-colors |
| `@vishwakarma/layout` | Partial. Stack, Cluster, Grid, Bento, Container, Sidebar, container queries |

Nine skills, 175 rules, 57 checks, 18 references.

## Near term

**Finish `@vishwakarma/layout`.** Missing: `FullBleed` (the grid-gutter escape technique),
`Switcher`, `Cover`, `Frame`, `Center`, `Spacer`. The hard part is `FullBleed` — doing it
with named grid columns rather than negative margins, so it composes with container queries
instead of fighting them.

**`@vishwakarma/primitives`.** Headless, accessibility-first React primitives: dialog with
focus trap and restoration, disclosure, tabs with the full arrow-key contract, menu with
typeahead, plus the utilities underneath — `useControllableState`, `useFocusTrap`,
`useRovingTabIndex`, `useScrollLock` that compensates for scrollbar width, `useLiveRegion`.

This is the package where cutting corners does the most damage, because a component that
looks right and cannot be operated from a keyboard is not partially finished — it is wrong,
and it is wrong in a way that only affects people who are already poorly served.

**`@vishwakarma/ui`.** Styled components on top of the primitives, with a typed variant
system. The interesting constraint is making the type system enforce accessibility: an
icon-only button without an `aria-label` should be a compile error, not a lint warning.

**`@vishwakarma/tailwind`.** The Tailwind v4 preset as a distributable package. The token
transform already emits a `@theme` block; this packages it with custom utilities
(`measure-*`, `surface-*`, `focus-ring`, `grid-bleed`, a guarded `glass`) and variants
(`reduced-motion`, `coarse`, `forced-colors`).

**Remaining skills.** Motion Design, Scroll Experiences, Micro-interactions, Component
Architecture, Rendering Performance, Theming Systems, Information Architecture, Design
Tokens, Design Review, and the UI Generation Workflow meta-skill.

The last one matters most and is listed last on purpose: it orchestrates the others, so it
is worth writing once the set it orchestrates is stable.

## Medium term

**`@vishwakarma/audit`.** Static auditors that extract measurements from source and feed
them to the Design Contract checker. The honest difficulty here is that static analysis
cannot resolve computed class names or runtime values, so it produces a *lower bound* on
violations. The report has to say so rather than implying completeness, and resisting the
temptation to overclaim is most of the design work.

**`@vishwakarma/lint`.** Lint rules for the subset of design rules that are genuinely
mechanical: raw colour literals, off-scale spacing, layout-triggering animation, missing
reduced-motion guards, gradient text on headings. Rules requiring visual judgment or
cross-file context do not belong in a linter and will not be added there.

**`@vishwakarma/testing`.** Custom matchers whose failure messages state what was found,
what was required, and the exact fix. A matcher that reports "expected true to be false"
has wasted everyone's time.

**`@vishwakarma/registry`.** Copy-in component distribution. The fixture that makes this
actually work is import rewriting when files land at a different path than authored, plus
recording a hash per installed file so later diffing is possible.

**`@vishwakarma/scroll`** and **`@vishwakarma/three`.** Scroll experiences that prefer CSS
scroll-driven animations and degrade safely, and 3D helpers that never let a WebGL bundle
block LCP.

**`@vishwakarma/prompts`.** A composition system rather than a list of strings.

## Longer term

**Templates and starter kits.** Landing, SaaS, dashboard, portfolio, and commerce. These are
deliberately last: a template built on packages that are still moving would be a liability,
and a template is only worth shipping if it is genuinely exemplary rather than merely
present.

**A documentation site.** The Markdown in `docs/` is the source of truth today.

**Visual regression in CI.** Rendering the viewport matrix and diffing is the natural
extension of the contract idea from values to appearance.

**Skill evaluation harness.** The honest gap in this whole category: nobody measures whether
a skill actually improves output. A harness that runs the same brief with and without a
skill and scores both against the contract would let skills be tuned on evidence rather than
intuition. This is the most interesting unsolved problem here.

## Deliberately not planned

**A visual builder.** Different product.

**Runtime CSS-in-JS.** Style computation on every render, and it interferes with server
components.

**Component-level breakpoint props.** A component knows its container, not the viewport.
`md={6}` encodes an assumption that is wrong the moment the component is reused in a
sidebar.

**Telemetry.** A tool that reads your source code should not phone home about it.

**Framework-agnostic components.** The maths in `core` and the whole knowledge layer are
framework-agnostic already. The component layer targets React deliberately, because a
lowest-common-denominator abstraction across frameworks produces components that are
idiomatic in none of them.

## Why the gaps exist

This repository was built in one session with a fixed compute budget, using parallel agents
for breadth and hand-authoring for the parts where a wrong decision propagates — the colour
maths, the Motion Grammar, the contract checker, the manifest format, and the merge logic.

When the budget ran out, roughly two thirds of the planned skills and packages were
unwritten. The choice was between shipping stubs that claim capability they do not have, or
removing them and saying so.

Empty packages were removed. What remains builds, is tested, and does what it says. The
architecture, the scaffolding generator, and the reference implementations are all in place,
so the remaining work is genuinely additive rather than foundational — a new package is a
row in `scripts/scaffold-packages.mjs` and a source directory, and a new skill is one typed
file plus a regenerated barrel.
