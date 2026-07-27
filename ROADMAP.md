# Roadmap

This document is deliberately honest about what exists, what does not, and why. A roadmap
that reads as a feature list is marketing; a roadmap that says "this is not built yet and
here is the hard part" is useful.

## What exists today

Eighteen packages, all building and typechecking, with 215 tests. Twenty-one skills
carrying 406 rules, 143 self-review checks, and 42 references.

Everything listed in the README is implemented. The originality audit, licence audit, skill
validation, typecheck, test and build all pass from a clean checkout.

The repository is also a **Claude Code plugin marketplace**: `.claude-plugin/` carries the
manifest, `.claude/skills/` carries the compiled catalog, and CI fails if that tree ever
drifts from the source skills. That single directory also serves direct GitHub-link
installation — paste the URL and Claude installs without any build step.

## Still to build

**npm publication.** The packages are release-ready — scoped names, `publishConfig`,
changesets, permissive-only dependency tree — but not yet on the registry, which is why
the CLI runs from a checkout and the emitted MCP config points at a local build. Once
published, `npx vishwakarma` works everywhere and the MCP config can fall back to
`npx -y @vishwakarma/mcp` on machines without a checkout. `vishwakarma doctor` already
detects and explains the difference.

**`@vishwakarma/prompts`** — a composable prompt library. Specified but not written: a
`Prompt` type with typed variables, a fragment composition system, and a library covering
generation, review, refactoring and migration. The design is in this repository's history;
the code is not.

**Templates and starter kits** — landing, SaaS, dashboard, portfolio, commerce. Deliberately
last, because a template built on packages that are still moving is a liability, and a
template is only worth shipping if it is exemplary rather than merely present.

**A documentation site.** The Markdown in `docs/` is the source of truth today.

**Deeper test coverage on the React layer.** The foundation packages are tested hard because
they are pure functions with correct answers. The component packages currently rest on
typecheck plus review, and want a jsdom harness exercising the keyboard contracts —
particularly focus trapping and restoration, where a regression is invisible until someone
who relies on it hits it.

## Longer term

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

## How this was built

One session with a fixed compute budget, using parallel agents for breadth and
hand-authoring for the parts where a wrong decision propagates — the colour maths, the
Motion Grammar, the contract checker, the manifest format, the variation engine, and the
merge and lockfile logic.

Two rules held throughout, and they are the reason the numbers above can be trusted.
Nothing ships that does not compile, and nothing is claimed that is not implemented: a
package specified but never written was removed rather than left as an empty directory
carrying a promise.

The remaining work is additive rather than foundational. A new package is a row in
`scripts/scaffold-packages.mjs` plus a source directory; a new skill is one typed file plus
a regenerated barrel.
