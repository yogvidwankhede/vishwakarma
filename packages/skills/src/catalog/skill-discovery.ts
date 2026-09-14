// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Installing a skill is not installing an app. It is an edit to the standing instructions of
 * an agent that already works, paid for out of the same context window the task runs in, and
 * the edit is made by someone whose incentive is that you install it.
 *
 * So the interesting question is never "is this skill good". It is: what does it cost on every
 * turn, what does it collide with, what does it contradict, what does it run, and can it be
 * taken back out. Four of those five are invisible in a marketplace listing, and the fifth —
 * the description — is the field authored specifically to be matched against, which makes it
 * the least reliable sentence in the package.
 *
 * The arithmetic is the part that surprises people. A skill body budgeted at 2,200 tokens plus
 * a dozen rules lands near 4,000 tokens on every turn it is active; flip the same skill to
 * always-on and a fifty-turn session has spent 200,000 tokens on it, most of them on turns
 * where it was irrelevant. Nothing about that shows up as an error. Neither does the failure
 * one layer down: two well-written skills that disagree — 44pt against 48dp — do not produce a
 * conflict report. The agent satisfies one of them, silently, and which one varies by turn.
 *
 * This file ships inside a catalogue that is itself installable, so it applies its own audit to
 * Vishwakarma at the end of the body rather than exempting it.
 */
export const skillDiscovery: SkillManifest = {
  vsm: '1.0',
  id: 'skill-discovery',
  name: 'Skill Discovery',
  description:
    'Use when finding, evaluating, or installing a third-party agent skill, plugin, or ruleset into an agent that already works.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'integration',
  tags: [
    'skills',
    'marketplace',
    'context-budget',
    'activation',
    'conflicts',
    'provenance',
    'supply-chain',
    'uninstall',
  ],

  activation: {
    intents: [
      'the user found a repository or marketplace of agent skills and wants to add one',
      'deciding between several skills that all claim to do the same job',
      'the agent got worse after some skills were installed and nobody knows which one did it',
      'two installed skills appear to give conflicting guidance about the same thing',
      'context fills up early in every session and the installed skill set is the suspect',
      'a skill ships scripts, hooks, or commands and the user wants to know if it is safe',
      'the user wants to copy rules out of someone else’s skill into their own repository',
      'the user asks whether a skill that is already installed is worth keeping',
      'removing a skill and being unsure what its installation actually changed',
      'a skill is being written or forked and its trigger must not collide with existing ones',
      'judging whether an always-on skill or a global instructions file is earning its cost',
      'an installed skill never seems to fire, or fires on the wrong kind of task',
    ],
    globs: [
      '**/SKILL.md',
      '**/.claude/skills/**',
      '**/.claude/plugins/**',
      '**/.claude-plugin/**',
      '**/plugin.json',
      '**/marketplace.json',
      '**/.cursor/rules/**',
      '**/AGENTS.md',
      '**/CLAUDE.md',
      '**/.claude/settings*.json',
    ],
    keywords: [
      'install a skill',
      'skill marketplace',
      'find skills',
      'agent skills',
      'plugin manifest',
      'SKILL.md',
      'skill conflict',
      'context bloat',
      'always-on skill',
      'uninstall skill',
      'skill trigger',
      'third-party skill',
      'skill licence',
      'hooks',
    ],
  },

  content: {
    summary:
      'A listing is a claim, not evidence. Read the rules rather than the description, price the per-turn token cost in numbers, check new triggers for collision and new rules for contradiction with what is installed, review anything executable, and keep removal to one step.',

    body: `# Skill Discovery

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
| Trigger line (\`description\` / frontmatter / intents) | When it fires — this is the collision surface |
| Instruction body and rules | What it will actually tell the agent to do |
| \`scripts/\`, \`hooks/\`, commands | Whether installing means running code |
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

Run this audit on the catalogue you are reading it in. \`engineering-discipline\` is
\`always: true\` with a 2,163-token body and 1,796 tokens of rules — 4,066 tokens on every
turn, ten times the 400-token always-on ceiling this project's own validator warns at — and its triggers overlap any other workflow-discipline skill you have
installed. Price these skills, diff them against what you already run, and install the
subset that closes a gap you can name.`,

    references: [
      {
        id: 'context-cost-audit',
        title: 'Costing an install: per-turn arithmetic, measurement, and what to cut',
        answers:
          'How many tokens does this skill actually cost per turn, how do I measure that instead of guessing, and when a skill is over budget which part of it should move or go?',
        content: `# Context cost audit

Every installed skill is a standing charge against the context window. The charge is
predictable, small per skill, and catastrophic in aggregate, which is why it is almost
never noticed until sessions start truncating. Load this when deciding whether a skill is
worth its cost, or when an existing install set has become expensive.

---

## 1. The three tiers, and who pays them

A well-formed skill discloses progressively, and each tier has a different payer.

| Tier | Loaded | Typical size | Paid |
| --- | --- | --- | --- |
| Trigger line | Always | 30-60 tokens | Every turn, per installed skill |
| Body + rules | On activation | 1,500-4,000 tokens | Every turn the skill is active |
| References | On explicit request | 2,000-6,000 tokens each | Only when the agent asks |

The failure mode is a skill that collapses these tiers — one long document with no
reference split, activated by a broad trigger. It behaves like an always-on skill without
declaring itself one.

## 2. The arithmetic

Three numbers decide an adoption.

**Catalogue tax.** \`n_skills x trigger_tokens\`, per turn, unconditionally. Thirty skills
at 45 tokens is 1,350 tokens gone before the first instruction. This is the cost people
forget, because no individual skill looks responsible for it.

**Activation cost.** \`body + rules\`, per active turn. A body written to a 2,200-token
budget with twelve rules averaging 150 tokens of statement-plus-rationale is about 4,000
tokens. Two such skills active together is 8,000 — a meaningful fraction of the working
context on a long task, before any file has been read.

**Session cost.** \`activation_cost x turns_active\`. This is the number that matters for
an always-on skill, and it is the one nobody computes. Fifty turns at 4,000 tokens is
200,000 tokens. If the skill was relevant on six of those turns, roughly 176,000 tokens
went to restating something the task did not need.

## 3. Measuring instead of estimating

Character count is a crude proxy for tokens, but it is deterministic, dependency-free, and
accurate enough to make a budget decision. Technical prose — code fences, identifiers,
punctuation — tokenises more densely than ordinary English, so divide by about 3.6
characters per token rather than the commonly cited 4. Under-estimating is the error that
actually hurts, so bias the divisor down.

\`\`\`bash
# Per-file rough cost of an installed skill directory.
find .claude/skills -name '*.md' -print0 \\
  | xargs -0 wc -c \\
  | awk '{ printf "%-60s %8d chars  ~%6d tok\\n", $2, $1, $1/3.6 }' \\
  | sort -k3 -n -r
\`\`\`

Do this before adopting, not after, and write the number into whatever record says why the
skill is installed. A cost nobody wrote down is a cost nobody will revisit.

Two refinements worth making once the totals matter:

- Count the **frontmatter description separately** from the body. They are paid on
  different schedules and a skill can be cheap on one and expensive on the other.
- Count **assets that get read into context** (templates, schemas, example files the
  instructions tell the agent to open) as part of activation cost. An instruction that says
  "read \`reference/tokens.json\` first" has a 3,000-token body no matter what the
  Markdown weighs.

## 4. Deciding: is it worth it

Set the comparison up as a ratio, not a feeling: *cost per turn* against *frequency it is
right*. A 4,000-token skill that changes the output on one turn in twenty is spending
80,000 tokens per useful intervention. A 600-token skill that fires on a third of turns
and prevents a rework cycle is cheap at several times the price.

Three adoption verdicts, and what each implies:

- **Adopt as-is.** Cost is stated, activation is narrow, no collision, no contradiction.
- **Adopt narrowed.** The content is right but the trigger is broad or the body is bloated.
  Fork it, tighten the trigger, move the long material into references, and record the
  delta against upstream so the next update can be re-applied deliberately.
- **Decline.** The gap it closes was not named, or it duplicates something installed, or
  the cost per useful turn is worse than the failure it prevents.

## 5. Cutting an over-budget skill

When the content is worth keeping and the cost is not, the fix is almost always one of
four moves, in order of preference:

1. **Split at a question boundary.** Anything that answers a different question than the
   body answers becomes a reference. The test is whether a reader would ever want that
   section *without* the rest — if so, it is a separate file. Splitting in the middle of
   one question produces two files that must both be loaded, which is worse than one.
2. **Narrow the activation.** Most bloat is not length, it is firing too often. A skill
   that costs 3,000 tokens on 10% of turns is cheaper than one costing 900 on every turn.
3. **Delete the restatement.** Compiled skill formats usually render the rules list and the
   verification checklist from structured fields. A body that also contains them pays
   twice for the same text.
4. **Drop the background.** Explanations of why the field works this way are what a
   reference is for. The body should carry the mechanism only where the mechanism changes
   what the agent does.

## 6. Symptoms of an over-installed agent

These show up before anyone suspects the skill set:

- Sessions truncate or summarise earlier than they used to on comparable tasks.
- The agent recites guidance that has nothing to do with the current file.
- Instructions given in the conversation are followed less reliably than they were, because
  they are now competing with several thousand tokens of standing text.
- Output quality varies between runs of the same prompt — usually a collision, and the
  install set grew past the point where anyone can predict which skills fire.

The remedy is subtraction, measured the same way as adoption: remove the most expensive
skill that fires least often, re-run the known-answer task, and see whether anything got
worse. Usually nothing does, which is the finding.`,
      },
      {
        id: 'collision-and-contradiction-audit',
        title: 'Auditing an install set for overlapping triggers and disagreeing rules',
        answers:
          'Several skills are installed and output has become inconsistent or wrong — how do I find which triggers overlap, which rules contradict, and how do I resolve it without deleting everything?',
        content: `# Collision and contradiction audit

Two defects account for most of the damage a multi-skill install does, and neither produces
an error message. **Collision** is two skills competing for the same activation.
**Contradiction** is two skills issuing incompatible instructions once activated. Load this
when adding a skill to a non-empty set, or when output has become inconsistent and the
skill set is suspected.

---

## 1. Why neither one announces itself

Skill selection is a semantic match between the task and a set of short trigger strings. It
is a ranking, not a lookup, and rankings between near-identical candidates are unstable —
a rephrased task, a different file open, a longer conversation, and the order changes.

So a collision produces *intermittent* behaviour: the right skill on Monday, the other one
on Tuesday, for a task that did not change. Anyone debugging this without knowing the set
overlaps will look at the prompt, the model, and the weather before looking at the two
trigger lines that both mention "component".

Contradiction is quieter still. An agent given "targets are at least 44pt" and "targets are
at least 48dp" has no mechanism for raising a conflict. Both are in the prompt, both look
authoritative, it produces one number, and the other rule leaves no trace of having been
ignored.

## 2. The overlap matrix

Do this before installing, and once after any bulk install.

1. Extract the trigger line of every installed skill plus the candidate.
2. For each pair, ask one question: **is there a task phrasing that a reasonable matcher
   would rank both above the rest?** If yes, the pair overlaps.
3. Classify each overlapping pair:

| Class | Shape | Action |
| --- | --- | --- |
| Nested | One trigger is a strict subset of the other ("data tables" inside "UI") | Keep both; make the general one exclude the specific case explicitly |
| Sibling | Same domain, different aspect (colour vs. typography) | Keep both; make each trigger name its aspect, not the domain |
| Duplicate | Same domain, same aspect | Keep one. Two skills for one job is the defect |
| Cross-domain accident | Shared word, unrelated subjects ("migration" in databases and in design systems) | Rewrite the trigger to disambiguate the word |

The matrix is O(n squared) in principle and trivial in practice, because triggers cluster by
domain and most pairs are obviously disjoint. Scanning for shared nouns finds nearly all of
them in one pass.

## 3. The activation probe

The matrix predicts. The probe observes, and only the probe is evidence.

Write three to five phrasings of a task in the disputed area — the way a user would say it,
including the lazy phrasing and the over-specified one. Run each. Record which skills
actually loaded.

\`\`\`text
Task phrasing                                   Expected      Actually fired
"build me a settings table"                     data-table    data-table, ui-general
"make a table for the settings page"            data-table    ui-general
"settings screen with rows of toggles"          ui-general    data-table
\`\`\`

Rows two and three are the finding. The trigger is matching on "table" rather than on the
work, and the fix is in the trigger text, not in either skill's content.

Re-run the probe after any trigger edit. A narrowing that was not verified is a guess.

## 4. The contradiction table

Once the set is settled, compare content rather than triggers. This is bounded work because
only *shared subjects* can contradict.

1. List the subjects each activated skill legislates: spacing, contrast, motion duration,
   error copy tone, commit format, test structure, naming, file layout.
2. Keep only subjects appearing in two or more skills.
3. For each, put the normative statements side by side, verbatim.
4. Mark each pair: **agree**, **disagree**, or **different scope**.

Four kinds of disagreement, with different resolutions:

- **Numeric threshold.** 44pt against 48dp; 4.5:1 against 3:1; 200ms against 150ms. Almost
  always both are correct under different platforms or contexts. Resolve by **scoping**:
  each rule names the platform or case it governs. The larger value is usually the safe
  merge if a single number is required, but say so explicitly rather than letting the
  ordering decide.
- **Mutually exclusive process.** One says write the test first, the other says prototype
  then cover. These cannot both hold on the same task. Resolve by **precedence**: one named
  winner, one sentence of reason, recorded where both skills can be seen.
- **Vocabulary collision.** Two skills define "token", "component", or "primitive"
  differently. This corrupts everything downstream because the agent cannot tell which
  definition a rule refers to. Resolve by **renaming** in the fork you control.
- **Incompatible defaults.** Both permit the same range but default differently. Lowest
  damage; resolve by stating the default once in project-level instructions and deleting it
  from the skill-level ones.

## 5. Resolution ladder

Take the cheapest rung that works.

1. **Scope one rule** so the subjects no longer overlap. Preserves both skills, costs one
   clause, and usually reflects the truth — the conflict was context-dependence all along.
2. **Write a precedence note** in project instructions naming which skill wins on which
   subject, with the reason. Cheap, visible, and survives updates to either skill.
3. **Fork and edit** the weaker skill. Effective and permanent, but it takes the skill off
   its upstream update path, so record the delta and the upstream version.
4. **Remove one.** The right answer for duplicates. Two skills for one job means the
   selection is a coin flip, and a coin flip is worse than either skill alone.

Do not resolve by ordering. Placing the preferred skill "later" or "higher" relies on
behaviour no format guarantees and no reader can see.

## 6. Regression check

After any resolution, re-run the known-answer task from the trial protocol and diff the
output against the pre-install baseline. The specific things to look for:

- The number that was in dispute: is it now the intended one, every time, over three runs?
- Did any rule from the surviving skill stop being applied, which happens when a narrowing
  cut more than intended?
- Does the probe table still show the intended skill firing on all phrasings?

Record the resolution next to the install record. The next person to add a skill in the
same domain needs to know the conflict was already found and what was decided, otherwise
they will re-discover it as a mystery.`,
      },
      {
        id: 'provenance-trial-removal',
        title: 'Provenance, executable assets, trial protocol, and clean removal',
        answers:
          'The skill ships scripts or hooks, or I want to redistribute its rules — what must I read before it runs, how do I trial it against evidence, and how do I take it out without residue?',
        content: `# Provenance, executables, trial, and removal

A skill is text until it ships something that runs, at which point it is a dependency with
a supply chain. And a skill that cannot be removed cleanly is not an experiment, it is a
commitment. Load this before installing anything with a \`scripts/\` or \`hooks/\` directory,
before copying rules into a repository you publish, or when planning a trial.

---

## 1. What is actually being installed

Skill packages carry more than instructions. Inventory before install:

| Component | Risk | What to check |
| --- | --- | --- |
| Instruction text | Steers the agent on every activation | Read it; it is the whole product |
| Reference files | Context cost when loaded | Size, and whether the body forces a load |
| Templates / schemas | Low | Whether they hardcode anything project-specific |
| Scripts / commands | Runs on invocation | Every line, before the first run |
| Hooks | **Runs without invocation** | Every line, plus which events fire it |
| Config edits | Persist after uninstall | What file, what key, what value |
| Declared tool permissions | Widens what the agent may do | Whether the list exceeds the stated job |

The last three are the ones that make removal messy, and they are the ones a listing never
mentions.

## 2. Executable review

Read scripts as you would read a new dependency's postinstall step, because that is
structurally what they are.

- **Network.** Does it fetch anything at run time? A script that downloads its own logic
  means the code you reviewed is not the code that runs.
- **Credentials and environment.** Does it read \`.env\`, keychains, \`~/.ssh\`, cloud
  credential files, or the full environment? A formatting helper has no reason to.
- **Writes outside the project.** Home directory, global config, other repositories.
- **Shell construction.** Command strings assembled from arguments the agent supplies are
  an injection surface reachable from ordinary task text.
- **Opacity.** Minified, obfuscated, or base64 payloads in a skill are disqualifying. There
  is no legitimate reason for a skill's helper to be unreadable.

**Hooks deserve a separate pass.** They execute on lifecycle events rather than on an
explicit call, so there is no moment where someone decides to run them. Establish which
events fire each hook, whether it can block or mutate agent actions, and what it does on
failure. A hook that runs before every tool call is on the hot path for everything the
agent does.

## 3. Pinning and update posture

Install at a commit or a released version, never a moving branch.

The mechanism: a skill's content *is* the agent's standing instructions. Tracking a branch
means those instructions change between runs, with no diff presented and no review
performed, and the output shift that follows will be attributed to the model or the prompt
rather than to the update. Pinning turns updates into reviewed events.

When updating, diff the rules and the trigger line specifically. A body reword is usually
cosmetic; a changed threshold or a broadened trigger is a new adoption decision and needs
the overlap and contradiction passes run again.

## 4. Licence and attribution

Skills are creative text, and the default is restrictive.

- **No licence file** means no grant. Public visibility is not permission to redistribute,
  whatever the README encourages. Use it locally if the terms of the host allow; do not
  ship it inside your own catalogue.
- **Permissive (MIT, Apache-2.0, BSD)** allows redistribution and modification with the
  notice preserved. Apache-2.0 additionally asks that modified files be marked as changed —
  relevant precisely when you fork a skill to narrow its trigger.
- **Copyleft (GPL family)** on a text asset is unusual and its reach over a bundle is
  contested; get a real answer before shipping rather than assuming.
- **CC-BY and similar** allow redistribution with attribution; the attribution has to be
  visible where the content is, not buried in a repository nobody opens.

When in doubt, do the cheap thing: cite the source, keep the notice, and link back.
Rewriting the mechanism in your own words is legitimate; copying the prose is redistribution
regardless of how much you rearranged it.

## 5. Trial protocol

The purpose of a trial is to produce evidence you could show someone. That requires a task
whose correct output you can already judge.

1. **Pick the known-answer task.** Something in the gap you named, where you can recognise a
   good result without consulting the skill you are testing. A task you cannot grade proves
   nothing, and a task the skill chose for you proves less.
2. **Baseline it.** Run the task with the skill absent, save the output verbatim. Without
   this, "better" is a memory, and memory grades in favour of the decision already made.
3. **Install one skill.** One. Two at once and any change has two candidate causes, and
   separating them costs more than the sequential install would have.
4. **Re-run and diff.** Compare against the baseline on the specific failure you named, not
   on general impression. Note anything that got *worse* — added verbosity, ceremony on
   small tasks, guidance that fired where it did not belong.
5. **Run a holdout task outside the skill's domain.** This catches over-broad activation:
   if the new skill fires on unrelated work, it will tax every session.
6. **Decide in writing.** Keep, keep-narrowed, or remove, with the cost figure and the
   observed delta beside it.

A trial that produces "seems better" produced nothing. Either the named failure stopped
appearing or it did not.

## 6. Install record

One entry per installed skill, wherever the project keeps operational notes:

\`\`\`text
skill:        <id>
source:       <url> @ <commit or version>
installed:    <date>   by: <who>
gap:          <the failure it is meant to fix>
cost:         <tokens per activation> / <always-on? yes-no>
touches:      <paths outside its own directory>
conflicts:    <resolved overlaps and precedence decisions>
removal:      <the exact steps>
\`\`\`

The \`touches\` line is the one that earns its keep. Everything else can be reconstructed;
a forgotten edit to a shared settings file cannot.

## 7. Clean removal

Removal is only cheap if the install was recorded. The order matters:

1. Delete the skill directory.
2. Revert every shared-file edit it made — hook registrations, settings keys, tool
   permission entries, lines appended to a root instructions file.
3. Re-run the known-answer task and confirm the output returns to the baseline. If it does
   not, something was left behind.
4. Re-run the activation probe for any skill whose trigger was narrowed to accommodate this
   one, and widen it back.

The failure to avoid is **residue**: a hook still registered, a permission still granted, a
paragraph still appended to the root instructions, all continuing to steer the agent with
nothing in the catalogue left to explain why. Residue is worse than the skill was, because
the skill at least had a description.

If removal cannot be reduced to a short list of reversible steps, that is a reason not to
install, not a detail to work out later.`,
      },
    ],
  },

  rules: [
    {
      id: 'skill-discovery/name-the-gap-first',
      strength: 'must',
      statement:
        'Name the specific failure in current output that a skill is supposed to fix, before searching for or evaluating candidates.',
      evidence: {
        rationale:
          'A named failure is the acceptance test: it makes the trial falsifiable, because the skill either stops that failure appearing in output you can inspect or it does not. Without one there is no criterion, so every plausible candidate passes — a skill that changes nothing measurable still reads well, and the reading is all that is left to judge on.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'Browse the marketplace for anything that looks useful for front-end work.',
        good: 'Gap: generated components ship without visible focus states, in 6 of the last 8 reviews. A candidate skill has to close that, checked on the next three components.',
      },
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/read-the-rules-not-the-listing',
      strength: 'must',
      statement:
        'Read the skill’s actual instruction body and rules before installing it, and treat the marketplace description as a claim rather than as evidence.',
      evidence: {
        rationale:
          'The description is authored to win a semantic match against a task, while the body is what enters the prompt and changes behaviour; they are written by the same person for different purposes, so accuracy is only incidental in the first. The most common defect — a confident description over generic advice — is visible only in the body, and the description is precisely the part that made the skill look worth installing.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'The listing says "expert-level accessibility guidance", so install it.',
        good: 'Opened SKILL.md: 14 rules, 9 of them restating WCAG success criteria already covered by accessibility-evidence, 5 new. Cost 2,600 tokens for 5 rules — take the 5, decline the skill.',
      },
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/state-the-token-cost',
      strength: 'must',
      statement:
        'State the measured per-activation token cost of a skill, and whether it is always-on, as a number in the adoption decision.',
      evidence: {
        rationale:
          'Context is the scarcest resource an agent has, and skill cost is paid per turn rather than once at install, so the relevant quantity is a rate that compounds: a 4,000-token skill active across a fifty-turn session has spent 200,000 tokens. Character count divided by about 3.6 gives that number in seconds, and a number can be compared against the failure it prevents, while "it is small" cannot be compared against anything.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'It is only a few pages of Markdown, so the overhead is negligible.',
        good: 'Body 9,400 chars plus rules 4,100 chars is about 3,750 tokens per active turn; it fires on roughly a third of turns in this project. Adopt.',
      },
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/always-on-must-be-short',
      strength: 'must-not',
      statement:
        'Accept always-on activation for a skill whose body exceeds a few hundred tokens without first demoting it to glob or intent activation.',
      evidence: {
        rationale:
          'An always-on skill is charged on every turn regardless of relevance, so its cost is the body multiplied by session length rather than by the number of turns it helps; a 2,000-token body across fifty turns spends 100,000 tokens, most of it on turns it had nothing to do with. Glob and intent activation cost one trigger line until the skill is relevant, which is the same content at a fraction of the rate.',
        confidence: 'established',
      },
      exceptions: [
        'Short project-wide invariants that would be wrong to violate on any turn — a few hundred tokens of standing constraint is cheaper than the rework one violation causes.',
      ],
      examples: {
        language: 'text',
        bad: 'alwaysApply: true on a 3,000-token style guide, because it should apply to all the code.',
        good: 'Trigger it on `**/*.{tsx,css}` instead: same content, paid on the turns that touch those files.',
      },
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/check-trigger-overlap',
      strength: 'must',
      statement:
        'Compare a candidate skill’s trigger line against every installed skill’s trigger before installing, and identify any pair a task phrasing could rank together.',
      evidence: {
        rationale:
          'Selection is a semantic ranking over short trigger strings, not a lookup, and rankings between near-identical candidates are unstable across phrasings and session state — so two skills claiming the same territory load together or alternate unpredictably. The defect produces intermittent output rather than an error, which means it is found weeks later by someone debugging the model instead of the manifest, unless the overlap was caught while it was still one line of text.',
        confidence: 'strong',
      },
      exceptions: [
        'The first skill installed, and candidates whose domain shares no noun with anything installed.',
      ],
      examples: {
        language: 'text',
        bad: 'Installed: "Use when building a UI." Candidate: "Use when building user interfaces." Install both.',
        good: 'Both claim UI work. Narrow the candidate to "Use when building data-dense tables and grids" and probe the phrasings before keeping it.',
      },
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/probe-activation',
      strength: 'should',
      statement:
        'Run three to five real phrasings of the target task after installing and record which skills actually fired, rather than inferring activation from the manifest.',
      evidence: {
        rationale:
          'A manifest states the author’s intent about activation; the run states the matcher’s behaviour, and only the second one is what the agent does. Broad triggers and shared vocabulary produce firings nobody predicted, and since a wrong firing costs tokens on every future turn of that shape, the cheapest place to find it is a five-minute probe rather than a month of drift.',
        confidence: 'strong',
      },
      exceptions: [
        'Skills activated only by an explicit glob on files that nothing else claims, where the trigger surface is mechanical rather than semantic.',
      ],
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/diff-rules-for-contradiction',
      strength: 'must',
      statement:
        'Put the new skill’s normative statements beside the installed ones on every shared subject and resolve each disagreement explicitly before running the first real task.',
      evidence: {
        rationale:
          'An agent given two incompatible constraints has no mechanism for reporting a conflict: it satisfies one and leaves no trace of the other, and which one wins shifts with ordering and phrasing. That makes contradiction more damaging than a plainly wrong rule, because a wrong rule produces consistently wrong output that somebody notices, while contradictory rules produce output that is right most of the time and fails an audit rather than a review.',
        confidence: 'strong',
      },
      exceptions: [
        'Skills whose subjects genuinely do not intersect — there is nothing to compare between a commit-message skill and a shader skill.',
      ],
      examples: {
        language: 'text',
        bad: 'Install a platform-apple skill and a platform-android skill and let the agent pick a touch target size.',
        good: 'Both legislate touch targets: 44pt and 48dp. Scope each rule to its platform, and where one number is required for a cross-platform surface, take 48dp and say why.',
      },
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/read-executables-before-install',
      strength: 'must',
      statement:
        'Read every script, hook, and command a skill ships — checking network calls, credential reads, writes outside the project, and shell construction — before it is installed.',
      evidence: {
        rationale:
          'A skill that ships executables is a dependency with a supply chain, and hooks in particular run on lifecycle events rather than on an explicit invocation, so no human decides to run them on the turn they run. The review is only possible before installation, because afterwards the first execution may already have happened; and a script that fetches its own logic at run time means the code reviewed is not the code that runs.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Install the plugin, then read its hooks if something looks odd.',
        good: 'Read hooks/pre-tool-use.sh first: it greps the environment for TOKEN and posts to a remote collector. Decline, and report it.',
      },
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/pin-the-version',
      strength: 'should',
      statement:
        'Install a third-party skill at a pinned commit or released version rather than tracking a moving branch.',
      evidence: {
        rationale:
          'A skill’s text is the agent’s standing instructions, so an unpinned install rewrites those instructions between runs with no diff shown and no review performed. The resulting behaviour change is then attributed to the model or the prompt rather than to the update, because the update is the only variable nobody saw move.',
        confidence: 'strong',
      },
      exceptions: [
        'A skill you author or vendor yourself, where the moving source is under the same review as the rest of the repository.',
      ],
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/licence-before-redistribution',
      strength: 'must',
      statement:
        'Check the licence and attribution terms before copying a third-party skill’s text into a catalogue, repository, or bundle you distribute.',
      evidence: {
        rationale:
          'Skill content is creative text, so copying it into something you publish is redistribution and the default position of a repository with no licence file is that no rights are granted, public visibility notwithstanding. Permissive licences cost only a preserved notice, which is far cheaper than the removal and re-release that discovering the omission later requires.',
        confidence: 'established',
      },
      exceptions: [
        'Reading a skill and writing the underlying mechanism in your own words — the ideas are not the expression, though the resemblance has to be to the mechanism rather than to the prose.',
      ],
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/one-at-a-time-against-a-baseline',
      strength: 'should',
      statement:
        'Install one skill at a time and verify it against a task whose correct output you can already judge, comparing to output captured before the install.',
      evidence: {
        rationale:
          'Two simultaneous installs give any observed change two candidate causes and no cheap way to separate them, so the attribution work costs more than the sequential install would have. A saved pre-install output is also the only defence against grading from memory, which reliably favours the decision already made.',
        confidence: 'strong',
      },
      exceptions: [
        'Restoring a previously validated set wholesale onto a new machine, where the combination has already been tested together.',
      ],
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/record-what-the-install-touched',
      strength: 'must',
      statement:
        'Record every file outside the skill’s own directory that its installation modified — hook registrations, settings keys, tool permissions, appended instruction files.',
      evidence: {
        rationale:
          'Deleting a skill directory removes the part that was catalogued and leaves the shared-file edits behind, and that residue keeps steering the agent with nothing left to explain why — a worse state than the skill itself, which at least had a description. The record is the only artefact that makes removal a short reversible list rather than an investigation.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'rm -rf .claude/skills/<name> and consider it uninstalled.',
        good: 'Record at install: directory, one hook entry in settings.json, one appended paragraph in CLAUDE.md. Removal reverts all three, then re-runs the known-answer task to confirm the baseline returns.',
      },
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/skip-native-wrappers',
      strength: 'should-not',
      statement:
        'Install a skill that restates behaviour the agent already produces reliably without it, such as standard library usage or the obvious calling convention of a common tool.',
      evidence: {
        rationale:
          'Such a skill pays full activation cost to describe output the model would have produced anyway, so its value per token is close to zero while its trigger still competes with skills that do change behaviour. The test is empirical rather than theoretical: run the task without it, and if the output is already correct the skill is buying a collision.',
        confidence: 'strong',
      },
      exceptions: [
        'Cases where the baseline run actually fails — a library the model knows only at an outdated version, or a house convention that differs from the common one.',
      ],
      verifiedBy: 'adoption-review',
    },
    {
      id: 'skill-discovery/narrow-rather-than-reject',
      strength: 'may',
      statement:
        'Fork an otherwise useful skill to narrow its trigger or move bulk into references, provided the edit and the upstream version it was taken from are both recorded.',
      evidence: {
        rationale:
          'Most adoption failures are activation breadth or body bloat rather than wrong content, and both are editable in minutes, so rejecting the skill discards good rules over a fixable defect. The record is what keeps the fork maintainable: without the upstream version the next update cannot be diffed, and the fork silently ages into an unmaintained copy.',
        confidence: 'opinion',
      },
      exceptions: [
        'Licences that forbid modification or redistribution of modified copies, and skills whose content is wrong rather than merely broad.',
      ],
      verifiedBy: 'adoption-review',
    },
  ],

  verification: [
    {
      id: 'adoption-review',
      kind: 'self-review',
      description:
        'Confirm the skill was adopted from measured cost and observed behaviour rather than from its listing.',
      blocking: true,
      questions: [
        'What specific failure in current output is this skill meant to fix, and how will you tell whether it stopped happening?',
        'Did you read the instruction body and rules themselves, or only the description and the README?',
        'What is the per-activation token cost as a number, is the skill always-on, and how often does it actually fire?',
        'Which installed skills share a noun with this one’s trigger, and did a probe of three to five task phrasings confirm the intended skill fires on all of them?',
        'On every subject two installed skills both legislate, do their statements agree — and where they disagree, is the resolution written down rather than left to ordering?',
        'Does the skill ship scripts or hooks, and if so did you read each one for network calls, credential reads, writes outside the project, and shell construction before installing?',
        'Is the install pinned to a commit or version, and do the licence terms permit whatever redistribution you intend?',
        'Which files outside the skill’s own directory did installation modify, and can removal revert all of them in one recorded step?',
      ],
    },
  ],

  relatedSkills: [
    'engineering-discipline',
    'public-api-integration',
    'code-quality',
    'reverse-engineering',
  ],
}
