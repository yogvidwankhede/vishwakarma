# Getting started

Vishwakarma installs design intelligence into whichever AI coding agent you already use.
This guide takes you from nothing to an agent that builds interfaces properly and can prove
it did.

## Install

**Claude Code users have a shortcut.** The repository is a ready-made plugin — inside
Claude Code, run:

```text
/plugin marketplace add yogvidwankhede/vishwakarma
/plugin install vishwakarma@vishwakarma
```

That installs the full skill catalog with no build step, and you can stop reading here
unless you also want the CLI, the tokens, or the MCP server.

**Everything else goes through the CLI.** The packages are not yet published to npm (it is
on the roadmap — once they are, every command below becomes `npx vishwakarma …`), so run
it from a checkout:

```bash
git clone https://github.com/yogvidwankhede/vishwakarma.git
cd vishwakarma
pnpm install && pnpm build

# Make the rest of this guide's commands work verbatim:
alias vishwakarma="node $PWD/packages/cli/dist/index.js"
```

Then, from your own project:

```bash
vishwakarma init
```

`init` reads your repository, works out which agents and frameworks you use, installs a
starter skill set into each, and generates a design token system. It reports everything it
writes.

If you want to see what it would do first:

```bash
vishwakarma init --dry-run
```

Nothing is written, and the output is identical to what a real run would produce — the dry
run shares its code path with the real one, so it cannot drift into lying to you.

## What just happened

```
Setting up Vishwakarma
  Project: .
  Stack:   next, React 19, Tailwind 4
  Agents:  Claude Code, Cursor

Installing 4 starter skill(s)
  → Design Judgment
  → UI Generation Workflow
  → Responsive Architecture
  → Accessible Components

  ✓ 12 file(s) created

Generating design tokens
  ✓ src/styles/tokens.css
  ✓ src/styles/theme.css
```

Four skills rather than the whole catalog, because installing eighteen skills into a
project that has not asked for them is how a tool loses someone's trust on first run. Add
more when you want them.

## Wire up the tokens

The generated CSS needs importing, and the order matters:

```css
/* app/globals.css */
@import './styles/tokens.css';   /* the custom properties */
@import 'tailwindcss';           /* Tailwind itself */
@import './styles/theme.css';    /* the @theme block mapping tokens to utilities */
```

Tokens must come first because the theme block references them. Tailwind must come before
the theme block because `@theme` is a Tailwind at-rule and is meaningless until Tailwind is
loaded. Getting this wrong produces a page with no styling and no error message, which is
why it is worth stating explicitly.

Derive the whole system from your own brand colour:

```bash
vishwakarma tokens build --brand '#0f766e'
```

Everything follows from that one value: an eleven-step perceptual ramp, neutrals tinted
very slightly toward your hue, semantic tokens for surfaces and text and actions, a dark
theme that is a separate design rather than an inversion, and status colours chosen for
distinguishability under colour vision deficiency.

## Use it

There is no new syntax to learn. Ask your agent for what you want, and it now has the
guidance and the tools:

> Build a pricing page with three tiers.

The agent loads the relevant skills, ranks the content before styling anything, resolves
values to tokens, checks its colour choices arithmetically rather than by eye, designs the
empty and loading states, and runs a critique pass before telling you it is done.

## Add the MCP server

The file-based installation is good. The MCP server is better, because nothing occupies
context until the agent actually asks:

```bash
vishwakarma add --target mcp
```

That writes an `.mcp.json` registering the server. Your agent gains thirteen tools:

| Tool | What it does |
|---|---|
| `search_skills` | Find guidance relevant to the task at hand |
| `get_skill` | Load one skill's working knowledge and rules |
| `check_contrast` | Compute contrast, and return the exact passing colour on failure |
| `build_palette` | Generate a perceptually even, gamut-mapped ramp |
| `resolve_motion` | Derive duration and easing from a semantic intent |
| `check_animation_property` | Say whether a property is composited or forces layout |
| `compute_stagger` | Per-element delays with automatic compression |
| `fluid_size` | Build a `clamp()` that respects user font-size settings |
| `viewport_checklist` | The responsive test matrix and what to check at each |
| `audit_design` | Evaluate real measurements against the Design Contract |
| `get_tokens` | Generate a token set in any supported format |

The computational ones matter most. Given a failing colour pair, `check_contrast` does not
just report failure — it returns the nearest colour that passes, at the same hue and chroma:

```
check_contrast(foreground: "#8a8a8a", background: "#ffffff")

→ wcagRatio: 3.45
  passesAA: false
  suggestedForeground: "#777777"
  suggestionNote: "Same hue and chroma, lightness adjusted to the nearest
                   value that passes, so the colour still reads as the same colour."
```

An agent told only "this fails" will guess a replacement, and will usually either still
fail or overshoot into a visibly different colour.

## Everyday commands

```bash
vishwakarma list                    # browse the catalog with context costs
vishwakarma show motion-design      # read one skill in full
vishwakarma add scroll-experiences  # install another
vishwakarma detect                  # what agents and stack are here
vishwakarma doctor                  # check the installation, get suggestions
vishwakarma sync                    # regenerate after editing skills
vishwakarma targets                 # every supported agent and where it installs
vishwakarma remove --all            # clean uninstall
```

## Choosing skills

More is not better. Each skill costs context, and the cost is charged differently per agent
— some load every installed rule on every request, others load only what activates.

```bash
vishwakarma add --all

  Claude Code    always   157 tok   on demand  13.0k tok
  Cursor         always   157 tok   on demand  13.0k tok
  Cline          always  13.0k tok  on demand      0 tok  ← heavy
```

A sensible default is the four from `init`, plus whatever matches your work: `motion-design`
and `micro-interactions` for a marketing site, `information-architecture` and
`rendering-performance` for a dashboard, `design-tokens` and `theming-systems` if you are
building a system rather than consuming one.

## Using the packages directly

The skills teach; the packages implement. You can use either or both.

```tsx
import { Reveal, RevealStyles, useMotion } from '@vishwakarma/motion'
import { Stack, Container } from '@vishwakarma/layout'
import { Button, Card } from '@vishwakarma/ui'

// RevealStyles goes in the document head, once.
export function Layout({ children }) {
  return (
    <html>
      <head><RevealStyles /></head>
      <body>{children}</body>
    </html>
  )
}

export function Features({ items }) {
  return (
    <Container>
      <Stack gap="loose">
        {items.map((item) => (
          <Reveal key={item.id} from="below" distance="short">
            <Card>{item.title}</Card>
          </Reveal>
        ))}
      </Stack>
    </Container>
  )
}
```

`RevealStyles` emits a small blocking script that arms the reveal CSS. Without it, nothing
breaks — elements simply appear without animating, which is the correct failure mode and
the reason the mechanism is built this way round.

## Enforcing it in CI

Guidance that nothing checks decays. Add the auditor — `@vishwakarma/audit` speaks
GitHub's annotation format natively:

```js
// scripts/design-audit.mjs
import { auditProject, formatReport } from '@vishwakarma/audit'
import { DEFAULT_CONTRACT } from '@vishwakarma/core'

const report = await auditProject(['src/**/*.{tsx,jsx,css}'], DEFAULT_CONTRACT)
console.log(formatReport(report, { format: 'github' }))
if (report.summary.errors > 0) process.exit(1)
```

```yaml
- run: node scripts/design-audit.mjs
```

Violations appear as inline annotations on the pull request. Errors fail the build;
warnings do not.

Be aware of what static analysis can and cannot see. It reads source, so it cannot resolve
a class name computed at runtime. It produces a lower bound on violations, and the report
says so rather than implying it found everything.

## Where to go next

- [Architecture](architecture.md) — how it fits together and why
- [The Design Contract](design-contract.md) — making design checkable
- [The Motion Grammar](motion-grammar.md) — timing derived from meaning
- [Agent integration](agents.md) — per-agent detail and file locations
- [Authoring skills](authoring-skills.md) — write your own
- [Prompt engineering](prompt-engineering.md) — what actually works for frontend generation

## Troubleshooting

**The agent ignores the skills.** Check `vishwakarma doctor`. The usual cause is that the
skill's `description` does not read as a trigger condition — several agents decide whether
to load a skill from that one string, so it must say *when to use this*, not *what this is*.

**Tailwind utilities are missing.** Check the import order above. Also check that the token
landed in a Tailwind namespace: a token that maps to no namespace generates no utility at
all, and `vishwakarma tokens check` reports those.

**Theme flashes on load.** The theme script must be inline and render-blocking, in the
document head. Any approach that resolves the theme after hydration will flash, because the
browser has already painted by then.

**Reveals never fire.** Confirm `RevealStyles` is rendered. Also check that the element is
not inside a container with `overflow: hidden` that prevents it from ever intersecting.
