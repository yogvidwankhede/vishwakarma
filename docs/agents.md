# Agent integration

Vishwakarma compiles one authored skill set into thirteen agent formats. This document
covers what each target receives, where it lands, and what is unavoidably lost in
translation.

## The short version

Commands below assume the CLI is on your path — see [Getting started](getting-started.md#install)
for the one-line alias (the packages are not yet on npm).

```bash
vishwakarma add --all              # every detected agent
vishwakarma add --target cursor    # one specific agent
vishwakarma targets                # what's supported and where it installs
```

## Why translation is necessary at all

Every agent invented its own way of being given standing instructions. One reads Markdown
with YAML frontmatter from a skills directory. Another reads `.mdc` files with a different
frontmatter dialect from a rules directory. A third reads one large Markdown file at the
repository root. They express roughly the same thing, and none of them can read each
other's.

The consequence is that anyone publishing agent guidance maintains N copies of the same
knowledge and lets N−1 of them rot. Vishwakarma authors once and compiles, so the copies
cannot diverge.

The format is a deliberate *superset* of the most constrained target, which means every
adapter's job is subtraction rather than invention. That asymmetry matters: subtraction is
mechanical and testable, invention is where drift comes from.

## What differs between targets

Three properties determine how much a target can carry.

**Supporting files.** Some agents load a skill's main file and can fetch adjacent reference
files on demand. That maps exactly onto our reference tier, so those targets lose nothing.
Targets without the mechanism must inline or drop the deep material.

**Activation.** Some agents decide which guidance to load from a description or a glob
pattern. Others load everything they find, every time. That difference is the single largest
factor in what an installation costs.

**Budget.** An agent that injects its instruction file into every request needs that file to
stay small. An agent that loads on demand can afford depth.

## Per-target detail

### Claude Code

```
.claude/skills/<skill-id>/SKILL.md
.claude/skills/<skill-id>/references/<reference-id>.md
```

The closest match to the source format. Skills live in their own directories with
frontmatter carrying the name, description, and an optional tool allowlist, and supporting
files sit alongside to be read when needed. Progressive disclosure works as designed:
descriptions are always available, bodies load on activation, references load on request.

Nothing is lost in this translation.

### Cursor

```
.cursor/rules/<skill-id>.mdc
```

Rule files carry frontmatter that drives activation: `alwaysApply` for unconditional rules,
`globs` for file-triggered ones, and a `description` the agent matches against when
deciding to pull a rule in itself.

Our activation model maps onto those three. `alwaysApply` is never set unless a skill
explicitly asked for it, because an always-applied rule is charged against context on every
single request and a handful of them will crowd out the code the user actually wants
attention on.

There is no supporting-file mechanism, so reference material is not installed. Skills
compile at full detail when conditionally activated, and at compact detail when always
applied.

### Windsurf

```
.windsurf/rules/<skill-id>.md
```

Similar to Cursor, with tighter practical size limits. Content compiles at compact detail:
rule statements and rationales survive, extended examples do not.

### Cline

```
.clinerules/<skill-id>.md
```

Every file in the rules directory is concatenated into the system prompt. Per-skill files
therefore do *not* buy on-demand loading here — everything installed is loaded on every
request.

The CLI reports this rather than hiding it:

```
Cline    always  13.0k tok   on demand  0 tok  ← heavy
```

Install a focused subset here, or use the MCP target instead.

### Roo Code

```
.roo/rules/<skill-id>.md
```

Rules apply across modes unless placed in a mode-specific directory. Files load together,
so the same advice applies: keep the installed set small.

### Continue

```
.continue/rules/<skill-id>.md
```

Markdown rule files with optional frontmatter, loaded from the project rules directory.

### OpenAI Codex, Gemini CLI, GitHub Copilot, Zed, Aider

```
AGENTS.md                              (Codex, and the universal fallback)
GEMINI.md                              (Gemini CLI)
.github/copilot-instructions.md        (Copilot)
.rules                                 (Zed)
CONVENTIONS.md                         (Aider)
```

These are single-file targets: the whole file is loaded on every request. That constraint
drives what we emit.

Including full bodies for thirty-four skills would produce a preamble of several hundred
thousand tokens, which makes the agent worse rather than better. So the file contains an
index of what is available, the full body of any skill marked always-on, and the *rules
only* from everything else — strongest first, since attention degrades over a long context
and prohibitions carry the highest consequence.

All of these are written into a delimited section so your own instructions survive.

### AGENTS.md as the universal fallback

The `AGENTS.md` convention is read by a growing number of tools and is the right target for
any agent without a dedicated adapter. Codex and the universal target write the same file,
so installing both is harmless rather than duplicative.

### Model Context Protocol

```
.mcp.json
```

The most efficient integration, and the one that behaves differently in kind.

No instruction files are written. Instead the config registers a server, and skills, tokens,
palettes, contrast checks, and audits are fetched when the agent asks. Progressive
disclosure is enforced by the protocol rather than requested politely in prose, so the
standing context cost is a list of tool names.

It also exposes things a Markdown file cannot: real computation. An agent can ask whether a
colour pair passes contrast and get an arithmetic answer with a corrected colour attached,
rather than estimating.

Works with any MCP-capable client. See [getting started](getting-started.md#add-the-mcp-server)
for the tool list.

## Protecting your own instructions

Files we create in directories we own are replaced outright. Shared files are written into a
delimited section:

```md
# My project

Always use tabs. Never touch the legacy folder.

<!-- vishwakarma:begin — generated, do not edit between these markers -->
...generated guidance...
<!-- vishwakarma:end -->
```

Re-syncing rewrites only the region between the markers. Uninstalling removes it and leaves
everything else, deleting the file only when nothing but whitespace remains.

New content is appended rather than prepended. The top of a hand-written instruction file
usually carries the author's most important context, and displacing it would change the
emphasis of a document we do not own.

This is tested directly, because getting it wrong is the failure that makes someone
uninstall a tool and never return.

## Reading the cost report

```
vishwakarma add --all

  Claude Code    always   157 tok   on demand  13.0k tok
  Cursor         always   157 tok   on demand  13.0k tok
  Cline          always  13.0k tok  on demand      0 tok  ← heavy
  MCP            always     0 tok   on demand  13.0k tok
```

**Always** is what the agent carries on every request, whether or not it is relevant.
**On demand** is what it can reach for when it is.

The numbers are estimates from character counts, not exact tokeniser output. They are
accurate enough to make the decision they exist to inform, which is whether an installation
is about to eat a meaningful share of the context window.

Above roughly eight thousand always-loaded tokens, the CLI suggests a narrower selection or
the MCP target.

## Choosing what to install

**By project type.** A marketing site wants `design-judgment`, `motion-design`,
`micro-interactions`, `typographic-systems`. A dashboard wants `information-architecture`,
`layout-composition`, `rendering-performance`, `accessible-components`. A design system
wants `design-tokens`, `theming-systems`, `colour-systems`, `component-architecture`.

**By agent budget.** Generous targets can take the full catalog. Constrained ones should get
`design-judgment` and `ui-generation-workflow` and little else — those two carry the most
value per token, because one covers judgment and the other covers process.

**By what is going wrong.** If output looks generic, install `design-judgment`. If it breaks
on mobile, `responsive-architecture`. If animations feel cheap, `motion-design`. If it fails
audits, `accessible-components`.

**If the artefact is a game.** None of the above applies to a simulation. Install
[`vishwakarma-studios`](studios.md) instead, and add the interface skills only for the parts
that are interface — the launcher, the settings screen, the store page. Studios ships 68
references, so it is worth noting that on the single-file targets only its rules survive;
Claude Code and MCP are the two targets that carry the reference tier intact.

## Adding a new agent

Agents appear regularly. An adapter answers three questions — where instructions live, what
frontmatter is understood, and how much context is affordable — and everything else is
shared.

See the [Contributing guide](https://github.com/yogvidwankhede/vishwakarma/blob/main/CONTRIBUTING.md#adding-an-agent-target). The important discipline
is that an adapter must not render its own body: shared rendering is what keeps the targets
from drifting apart while still appearing to work.

## When guidance is ignored

The most common cause is a `description` that reads as a summary rather than a trigger.
Several agents decide whether to load a skill from that one string, so it must say *when to
use this*.

```
Bad:  "Comprehensive guidance on typography, scales, and font loading."
Good: "Use when choosing typefaces, building a type scale, or loading webfonts."
```

The validator warns about descriptions that do not contain a trigger word, which catches
most instances of this before install.

The second most common cause is budget: on a single-file target, guidance buried after
forty thousand tokens of other guidance is guidance the agent will not reliably apply.
Install less.
