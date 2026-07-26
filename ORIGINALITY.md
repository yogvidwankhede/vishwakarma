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

## Licensing

Vishwakarma is licensed under the Apache License, Version 2.0. In plain terms: anyone may
use, modify, and distribute this software — including commercially — provided they keep the
copyright and license notices and state any changes they make. Apache-2.0 additionally
grants users an explicit patent license and, importantly, does *not* grant any right to the
Vishwakarma name or branding (see Trademarks below).

Copyright in this work belongs to Yogvid Wankhede and the project's contributors. Copyright
arises automatically on creation; the LICENSE file states the terms under which it is
shared, and the NOTICE file records the attribution that any redistribution must carry.

Every source file additionally carries a short copyright and `SPDX-License-Identifier`
header, so that an individual file remains self-identifying about its origin and terms even
if it is copied out of this repository in isolation.

Every runtime dependency and every optional peer dependency is under a permissive license
(MIT, Apache-2.0, BSD, or ISC) that is compatible with Apache-2.0 and imposes no copyleft
obligation on users of this library. We do not take a runtime dependency on any package
whose license restricts commercial use, requires a paid tier for any published feature, or
imposes an attribution burden beyond a standard notice. Dependency licenses are checked in
CI, and a pull request that introduces an unrecognised or non-permissive license fails the
build.

## Contributions

Contributions are accepted under the project's license: by submitting a contribution, you
agree that it is licensed to the project and its users under Apache-2.0, and you affirm that
it is your own original work and that you have the right to contribute it. This
inbound-equals-outbound arrangement keeps the whole codebase under one clear license, which
is what allows the project to be relied upon and, if the maintainers ever choose, formally
registered or offered under an additional commercial license.

## Trademarks

**"Vishwakarma" is a trademark of Yogvid Wankhede.** The name is used here as the identity
of a software project. The Apache License granted over the *code* deliberately grants no
rights to the *name*: anyone is free to fork, adapt, and build on the software, but they may
not present their fork under the Vishwakarma name or use its branding in a way that implies
endorsement or origin. This is the standard and intended separation — copyright protects the
code, the trademark protects the identity — and it is asserted here as a common-law mark;
formal registration is a further step the owner may take.

The word is drawn from the figure of the divine architect and craftsman in Indian tradition,
chosen for its meaning — design, making, craft — and used with respect. The project is
secular, is not affiliated with any religious institution, and makes no religious claim.

Any third-party names appearing in this repository (framework names, library names, company
names) are the trademarks of their respective owners and are used only for identification
and interoperability — for example, to state which agent a generated config file targets.
Their appearance does not imply endorsement.

## An incident, recorded

During construction, an automated research process cloned an external repository into the
working tree to read it, and a broad `git add` swept the entire checkout — source, README,
and licence — into the first commit. It was caught before publication, removed from every
commit in the history, and the objects were garbage-collected.

None of the content rules had caught it, because they scan for suspicious *text* inside
files with known extensions, and a foreign `LICENSE` file has neither. The audit now also
checks *shape*: a licence, notice, nested `.git`, or source archive appearing outside the
repository root and outside a workspace package fails the build, because that is the
unmistakable signature of a third-party checkout committed by accident.

This is recorded here rather than quietly fixed for two reasons. A policy that hides its own
near-misses is not a policy, and the failure mode is worth knowing about — anyone building
with automated agents will hit it, and the structural check is the fix.

## Reporting a concern

If you believe any part of this repository reproduces someone else's protected
expression, open an issue titled `originality:` with the file, the line range, and the
source you believe it came from. We treat these reports as high priority, and we will
rewrite or remove anything that cannot be defended as independent work — without
argument and without requiring a formal notice first.
