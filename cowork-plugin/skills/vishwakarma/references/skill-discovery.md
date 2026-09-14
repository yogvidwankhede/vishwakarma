# Skill Discovery

Installing a skill edits the standing instructions of an agent that already works, and the
edit is paid for out of the same context window the task runs in. The question is never
"is this skill good". It is: what does it cost per turn, what does it collide with, what
does it contradict, what does it run, and can it be removed.

A listing is a **claim**. The description field is written by the publisher to win a
semantic match; the rule text is what actually enters the prompt. Same author, different
incentives, and only one of them is binding.

---

## 1. Name the gap before searching

Write the failure down first: *components ship without focus states*, *the agent invents
API fields instead of reading the schema*, *commit messages do not say why*. A named
failure is an acceptance test — the skill either fixes it in output you can inspect, or it
does not.

Without one, every candidate looks like an improvement, because a skill that changes
nothing measurable still reads well.

## 2. Read the rules, not the listing

Open the artefact, in this order:

| Read | What it tells you |
| --- | --- |
| Trigger line (`description` / frontmatter / intents) | When it fires — this is the collision surface |
| Instruction body and rules | What it will actually tell the agent to do |
| `scripts/`, `hooks/`, commands | Whether installing means running code |
| Licence file and last commit date | Whether you may ship it, and whether anyone maintains it |

The common defect is a confident description over a body of generic advice. It costs
tokens on every activation and changes nothing, and the description is exactly the part
that made it look worth installing.

## 3. Price it

Three costs, ascending in severity.

- **Catalogue tax.** Every installed skill keeps its trigger line in context on every turn
  so the agent can decide whether to load it. At roughly 40 tokens each, 30 installed
  skills cost about 1,200 tokens per turn before any of them does anything.
- **Activation cost.** Body plus rules, paid on each turn the skill is active. A body at
  the 2,200-token budget with a dozen rules lands near 4,000.
- **Always-on cost.** The same number on every turn, relevant or not. Fifty turns at 4,000
  tokens is 200,000 tokens, most of it spent on turns that had nothing to do with it.

Measure rather than eyeball: character count divided by ~3.6 for technical prose, summed
per tier. **State the number in the adoption decision.** "It is small" is not a number.

Always-on has to be earned: the content must be wrong to violate on *any* turn, and it
must be short. Anything past a few hundred tokens belongs behind glob or intent
activation, where it costs one trigger line until it is relevant.

## 4. Trigger collision

Skill selection is a semantic match over short trigger strings. Two skills that both say
"use when building a UI" are not two options, they are one ambiguous instruction: either
both load and you pay twice, or the wrong one loads, and which one varies between turns
for the same task.

Collision is invisible at install time and surfaces as inconsistent output much later. The
check is cheap — put the new trigger line beside every installed one and look for a shared
noun — but the evidence is behavioural, so also **probe**: run three to five real phrasings
of the task and record which skills actually fired. The manifest states intent; only the
run states behaviour.

Overlap is often fixable by narrowing rather than rejecting. Edit the trigger to name the
narrow case ("use when building a data table", not "use when building a UI") and record
the edit against the upstream version, so the next update does not quietly undo it.

## 5. Rule contradiction

The dangerous install is not a bad skill. It is two good skills that disagree.

One says touch targets are at least 44pt. The other says 48dp. Both are correct — they are
the Apple and the Android figure — and an agent holding both **does not error. It satisfies
one and says nothing**, and which one depends on ordering, phrasing, and what sat nearest
the end of the prompt.

That is worse than a wrong rule. A wrong rule produces consistently wrong output, which
somebody eventually notices. Contradictory rules produce output that is right most of the
time, which nobody notices until an audit.

Before the first task on a new install, list the subjects both skills speak to — spacing,
contrast, error copy, commit format, test structure, naming — and set the statements side
by side. Where they disagree, resolve it explicitly: drop one, narrow one until the
subjects stop overlapping, or write a precedence note naming the winner and the reason.
"The agent will work it out" is the failure mode, not the resolution.

## 6. Executables and provenance

A skill that ships scripts, hooks, or commands is a dependency that runs code, not a
document. Hooks are the sharp edge: they fire on lifecycle events rather than on an
explicit invocation, so nobody chooses to run them on the turn they run. Read every
executable before it gets the chance — what it reads, what it writes outside the project,
what it sends over the network.

Pin to a commit or a version. A skill tracked from a moving branch rewrites the agent's
standing instructions between runs, with no diff and no review.

Licence before redistribution: copying rules into your own catalogue is redistribution of
someone else's text. Permissive licences generally require the notice to travel with the
copy, and a repository with no licence file grants nothing at all, whatever the README
invites you to do.

## 7. Trial, then removal

Adopt one at a time. Install two together and a degradation has two candidate causes and
no cheap way to separate them. Verify against a task whose correct output you can already
judge, compared against what you got before.

Keep removal to one step, and record what the install touched — its directory plus any
shared file it edited: settings, hook config, a root instructions file. A skill that edits
shared config leaves residue behind when its directory is deleted, and that residue keeps
steering the agent with nothing left in the catalogue to explain why. **A skill that cannot
be removed cleanly was installed wrong.**

## 8. When not to install

- The capability is already covered — resolve the overlap first and decide which survives.
- The skill wraps something the model already does natively; it buys a trigger collision
  and a token cost in exchange for behaviour you had.
- It is a description with no rules behind it.
- No gap was named. See 1.

---

Run this audit on the catalogue you are reading it in. `engineering-discipline` is
`always: true` with a 2,163-token body and 1,796 tokens of rules — 4,066 tokens on every
turn, ten times the 400-token always-on ceiling this project's own validator warns at — and its triggers overlap any other workflow-discipline skill you have
installed. Price these skills, diff them against what you already run, and install the
subset that closes a gap you can name.

## Rules

### MUST NOT — Accept always-on activation for a skill whose body exceeds a few hundred tokens without first demoting it to glob or intent activation.

*Why:* An always-on skill is charged on every turn regardless of relevance, so its cost is the body multiplied by session length rather than by the number of turns it helps; a 2,000-token body across fifty turns spends 100,000 tokens, most of it on turns it had nothing to do with. Glob and intent activation cost one trigger line until the skill is relevant, which is the same content at a fraction of the rate.

*Exceptions:*
- Short project-wide invariants that would be wrong to violate on any turn — a few hundred tokens of standing constraint is cheaper than the rework one violation causes.

Incorrect:

```text
alwaysApply: true on a 3,000-token style guide, because it should apply to all the code.
```

Correct:

```text
Trigger it on `**/*.{tsx,css}` instead: same content, paid on the turns that touch those files.
```

### MUST — Name the specific failure in current output that a skill is supposed to fix, before searching for or evaluating candidates.

*Why:* A named failure is the acceptance test: it makes the trial falsifiable, because the skill either stops that failure appearing in output you can inspect or it does not. Without one there is no criterion, so every plausible candidate passes — a skill that changes nothing measurable still reads well, and the reading is all that is left to judge on.

Incorrect:

```text
Browse the marketplace for anything that looks useful for front-end work.
```

Correct:

```text
Gap: generated components ship without visible focus states, in 6 of the last 8 reviews. A candidate skill has to close that, checked on the next three components.
```

### MUST — Read the skill’s actual instruction body and rules before installing it, and treat the marketplace description as a claim rather than as evidence.

*Why:* The description is authored to win a semantic match against a task, while the body is what enters the prompt and changes behaviour; they are written by the same person for different purposes, so accuracy is only incidental in the first. The most common defect — a confident description over generic advice — is visible only in the body, and the description is precisely the part that made the skill look worth installing.

Incorrect:

```text
The listing says "expert-level accessibility guidance", so install it.
```

Correct:

```text
Opened SKILL.md: 14 rules, 9 of them restating WCAG success criteria already covered by accessibility-evidence, 5 new. Cost 2,600 tokens for 5 rules — take the 5, decline the skill.
```

### MUST — State the measured per-activation token cost of a skill, and whether it is always-on, as a number in the adoption decision.

*Why:* Context is the scarcest resource an agent has, and skill cost is paid per turn rather than once at install, so the relevant quantity is a rate that compounds: a 4,000-token skill active across a fifty-turn session has spent 200,000 tokens. Character count divided by about 3.6 gives that number in seconds, and a number can be compared against the failure it prevents, while "it is small" cannot be compared against anything.

Incorrect:

```text
It is only a few pages of Markdown, so the overhead is negligible.
```

Correct:

```text
Body 9,400 chars plus rules 4,100 chars is about 3,750 tokens per active turn; it fires on roughly a third of turns in this project. Adopt.
```

### MUST — Compare a candidate skill’s trigger line against every installed skill’s trigger before installing, and identify any pair a task phrasing could rank together.

*Why:* Selection is a semantic ranking over short trigger strings, not a lookup, and rankings between near-identical candidates are unstable across phrasings and session state — so two skills claiming the same territory load together or alternate unpredictably. The defect produces intermittent output rather than an error, which means it is found weeks later by someone debugging the model instead of the manifest, unless the overlap was caught while it was still one line of text.

*Exceptions:*
- The first skill installed, and candidates whose domain shares no noun with anything installed.

Incorrect:

```text
Installed: "Use when building a UI." Candidate: "Use when building user interfaces." Install both.
```

Correct:

```text
Both claim UI work. Narrow the candidate to "Use when building data-dense tables and grids" and probe the phrasings before keeping it.
```

### MUST — Put the new skill’s normative statements beside the installed ones on every shared subject and resolve each disagreement explicitly before running the first real task.

*Why:* An agent given two incompatible constraints has no mechanism for reporting a conflict: it satisfies one and leaves no trace of the other, and which one wins shifts with ordering and phrasing. That makes contradiction more damaging than a plainly wrong rule, because a wrong rule produces consistently wrong output that somebody notices, while contradictory rules produce output that is right most of the time and fails an audit rather than a review.

*Exceptions:*
- Skills whose subjects genuinely do not intersect — there is nothing to compare between a commit-message skill and a shader skill.

Incorrect:

```text
Install a platform-apple skill and a platform-android skill and let the agent pick a touch target size.
```

Correct:

```text
Both legislate touch targets: 44pt and 48dp. Scope each rule to its platform, and where one number is required for a cross-platform surface, take 48dp and say why.
```

### MUST — Read every script, hook, and command a skill ships — checking network calls, credential reads, writes outside the project, and shell construction — before it is installed.

*Why:* A skill that ships executables is a dependency with a supply chain, and hooks in particular run on lifecycle events rather than on an explicit invocation, so no human decides to run them on the turn they run. The review is only possible before installation, because afterwards the first execution may already have happened; and a script that fetches its own logic at run time means the code reviewed is not the code that runs.

Incorrect:

```text
Install the plugin, then read its hooks if something looks odd.
```

Correct:

```text
Read hooks/pre-tool-use.sh first: it greps the environment for TOKEN and posts to a remote collector. Decline, and report it.
```

### MUST — Check the licence and attribution terms before copying a third-party skill’s text into a catalogue, repository, or bundle you distribute.

*Why:* Skill content is creative text, so copying it into something you publish is redistribution and the default position of a repository with no licence file is that no rights are granted, public visibility notwithstanding. Permissive licences cost only a preserved notice, which is far cheaper than the removal and re-release that discovering the omission later requires.

*Exceptions:*
- Reading a skill and writing the underlying mechanism in your own words — the ideas are not the expression, though the resemblance has to be to the mechanism rather than to the prose.

### MUST — Record every file outside the skill’s own directory that its installation modified — hook registrations, settings keys, tool permissions, appended instruction files.

*Why:* Deleting a skill directory removes the part that was catalogued and leaves the shared-file edits behind, and that residue keeps steering the agent with nothing left to explain why — a worse state than the skill itself, which at least had a description. The record is the only artefact that makes removal a short reversible list rather than an investigation.

Incorrect:

```text
rm -rf .claude/skills/<name> and consider it uninstalled.
```

Correct:

```text
Record at install: directory, one hook entry in settings.json, one appended paragraph in CLAUDE.md. Removal reverts all three, then re-runs the known-answer task to confirm the baseline returns.
```

### SHOULD NOT — Install a skill that restates behaviour the agent already produces reliably without it, such as standard library usage or the obvious calling convention of a common tool.

*Why:* Such a skill pays full activation cost to describe output the model would have produced anyway, so its value per token is close to zero while its trigger still competes with skills that do change behaviour. The test is empirical rather than theoretical: run the task without it, and if the output is already correct the skill is buying a collision.

*Exceptions:*
- Cases where the baseline run actually fails — a library the model knows only at an outdated version, or a house convention that differs from the common one.

### SHOULD — Run three to five real phrasings of the target task after installing and record which skills actually fired, rather than inferring activation from the manifest.

*Why:* A manifest states the author’s intent about activation; the run states the matcher’s behaviour, and only the second one is what the agent does. Broad triggers and shared vocabulary produce firings nobody predicted, and since a wrong firing costs tokens on every future turn of that shape, the cheapest place to find it is a five-minute probe rather than a month of drift.

*Exceptions:*
- Skills activated only by an explicit glob on files that nothing else claims, where the trigger surface is mechanical rather than semantic.

### SHOULD — Install a third-party skill at a pinned commit or released version rather than tracking a moving branch.

*Why:* A skill’s text is the agent’s standing instructions, so an unpinned install rewrites those instructions between runs with no diff shown and no review performed. The resulting behaviour change is then attributed to the model or the prompt rather than to the update, because the update is the only variable nobody saw move.

*Exceptions:*
- A skill you author or vendor yourself, where the moving source is under the same review as the rest of the repository.

### SHOULD — Install one skill at a time and verify it against a task whose correct output you can already judge, comparing to output captured before the install.

*Why:* Two simultaneous installs give any observed change two candidate causes and no cheap way to separate them, so the attribution work costs more than the sequential install would have. A saved pre-install output is also the only defence against grading from memory, which reliably favours the decision already made.

*Exceptions:*
- Restoring a previously validated set wholesale onto a new machine, where the combination has already been tested together.

### MAY — Fork an otherwise useful skill to narrow its trigger or move bulk into references, provided the edit and the upstream version it was taken from are both recorded.

*Why:* Most adoption failures are activation breadth or body bloat rather than wrong content, and both are editable in minutes, so rejecting the skill discards good rules over a fixable defect. The record is what keeps the fork maintainable: without the upstream version the next update cannot be diffed, and the fork silently ages into an unmaintained copy.

*Exceptions:*
- Licences that forbid modification or redistribution of modified copies, and skills whose content is wrong rather than merely broad.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the skill was adopted from measured cost and observed behaviour rather than from its listing. (blocking)

- What specific failure in current output is this skill meant to fix, and how will you tell whether it stopped happening?
- Did you read the instruction body and rules themselves, or only the description and the README?
- What is the per-activation token cost as a number, is the skill always-on, and how often does it actually fire?
- Which installed skills share a noun with this one’s trigger, and did a probe of three to five task phrasings confirm the intended skill fires on all of them?
- On every subject two installed skills both legislate, do their statements agree — and where they disagree, is the resolution written down rather than left to ordering?
- Does the skill ship scripts or hooks, and if so did you read each one for network calls, credential reads, writes outside the project, and shell construction before installing?
- Is the install pinned to a commit or version, and do the licence terms permit whatever redistribution you intend?
- Which files outside the skill’s own directory did installation modify, and can removal revert all of them in one recorded step?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/context-cost-audit.md` — How many tokens does this skill actually cost per turn, how do I measure that instead of guessing, and when a skill is over budget which part of it should move or go?
- `references/collision-and-contradiction-audit.md` — Several skills are installed and output has become inconsistent or wrong — how do I find which triggers overlap, which rules contradict, and how do I resolve it without deleting everything?
- `references/provenance-trial-removal.md` — The skill ships scripts or hooks, or I want to redistribute its rules — what must I read before it runs, how do I trial it against evidence, and how do I take it out without residue?
