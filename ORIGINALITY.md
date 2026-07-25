# Originality and Attribution Policy

Vishwakarma is an original work. This document states, precisely and verifiably, what
that means and how the project keeps that promise.

## The commitment

Every line of source code, every documentation page, every skill instruction, every
component name, every design token, and every piece of branding in this repository was
written from scratch for this project.

Nothing in this repository is copied, transcribed, machine-translated, minimally
reworded, or mechanically derived from another project's source code, documentation,
marketing copy, or design assets.

## What we did instead

The project was informed by studying prior art in the field. Studying prior art means
reading about a project, understanding *what problem it solves* and *why its approach
works*, and then designing our own solution to that problem. It does not mean opening a
file and editing it.

Concretely, the research that preceded this codebase produced descriptions of
**techniques and principles** — statements like "interruptible animations should
re-target from current velocity rather than restarting from zero" — and those
descriptions were then implemented independently. A principle is not copyrightable; an
expression of it is. We took the former and wrote the latter ourselves.

## Prior art we learned from

We name our influences openly, because hiding them would be worse than crediting them.
Listing a project here is an acknowledgement of intellectual debt, not a claim of any
relationship with it, and none of these projects endorse Vishwakarma.

Influences include work in AI agent skill packaging, agent-consumable component
registries, interaction and animation craft, responsive design methodology, and design
token systems. Where a specific project's *idea* shaped a specific part of our
architecture, the relevant architecture document says so by name.

## What we deliberately did not do

- We did not copy source files, in whole or in part.
- We did not copy README text, documentation prose, or marketing copy.
- We did not copy component APIs verbatim where the API itself is the creative work.
  Where our API resembles an established convention, it is because the convention is
  genuinely standard across the ecosystem (for example, the shape of a React ref, or the
  `className` prop), not because we transcribed one project's choices.
- We did not copy names. Our packages, components, skills, tokens, and CLI commands are
  named independently. Where a name is unavoidably generic — `Button`, `Dialog`,
  `spacing` — it is generic precisely because no one owns it.
- We did not copy design assets, icons, illustrations, fonts, or brand marks.
- We did not vendor code from proprietary or source-available projects.

## Dependency licensing

Vishwakarma is MIT licensed. Every runtime dependency and every optional peer dependency
is under a permissive license (MIT, Apache-2.0, BSD, or ISC) that is compatible with MIT
and imposes no copyleft obligation on users of this library.

We do not take a runtime dependency on any package whose license restricts commercial
use, requires a paid tier for any published feature, or requires attribution beyond the
standard MIT notice.

Dependency licenses are checked in CI. A pull request that introduces a dependency with
an unrecognised or non-permissive license fails the build.

## Trademarks

"Vishwakarma" is used here as the name of a software project. The word is drawn from the
figure of the divine architect and craftsman in Indian tradition, chosen for its meaning
— design, making, craft — and used with respect. The project is secular, is not
affiliated with any religious institution, and makes no religious claim.

Any third-party names appearing in this repository (framework names, library names,
company names) are the trademarks of their respective owners and are used only for
identification and interoperability — for example, to state which agent a generated
config file targets. Their appearance does not imply endorsement.

## Reporting a concern

If you believe any part of this repository reproduces someone else's protected
expression, open an issue titled `originality:` with the file, the line range, and the
source you believe it came from. We treat these reports as high priority, and we will
rewrite or remove anything that cannot be defended as independent work — without
argument and without requiring a formal notice first.
