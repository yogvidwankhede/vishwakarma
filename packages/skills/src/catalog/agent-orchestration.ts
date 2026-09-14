// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * A single agent working alone has one property that is easy to undervalue: everything it
 * knows, it knows at once. The file it read twenty minutes ago, the correction the user
 * made, the approach that was tried and abandoned — all of it is present when the next
 * decision is made.
 *
 * Splitting work across agents spends that property to buy throughput, and the purchase is
 * only worth making under conditions that are narrower than they look. Each branch starts
 * from nothing and must be told everything. Each branch reports its own success, and a
 * report is the weakest evidence in the system. Each branch writes to a tree that another
 * branch may also be writing to. None of these costs appear in the decision to fan out;
 * they all appear afterwards, as a merge that compiles and does not work.
 *
 * This skill is about the arithmetic: when parallelism returns more than coordination
 * costs, what a brief must contain because the subagent cannot see the conversation, why
 * the orchestrator re-checks rather than trusts, and how parallel results are integrated
 * without silent conflicts. The failure it exists to prevent is not a subagent doing bad
 * work — it is an orchestrator that cannot tell.
 */
export const agentOrchestration: SkillManifest = {
  vsm: '1.0',
  id: 'agent-orchestration',
  name: 'Agent Orchestration',
  description:
    'Use when splitting work across subagents — deciding whether to, briefing them, verifying what they report, or merging parallel results.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'workflow',
  tags: [
    'orchestration',
    'subagents',
    'parallelism',
    'delegation',
    'verification',
    'worktrees',
    'planning',
    'cost',
  ],

  activation: {
    intents: [
      'the user asks whether this work can be split across several agents running at once',
      'a task has four or more pieces and the user wants to know if they can be done in parallel',
      'a subagent has reported that it finished and the work needs to be accepted or rejected',
      'work is being handed to an agent that was not part of this conversation',
      'two agents are about to edit files in the same repository at the same time',
      'the user wants a plan that survives the context window being compacted or lost',
      'parallel branches are finished and their results need to be integrated into one tree',
      'the merge was clean but the test suite now fails and nobody knows which branch caused it',
      'the user is worried about how much a fan-out is going to cost in tokens',
      'a long task keeps losing track of what has already been completed',
      'the user asks for a second agent to review work the first agent produced',
      'a delegated task came back partially done and the remaining work must be identified',
    ],
    globs: ['**/PLAN.md', '**/plans/**', '**/.worktrees/**', '**/*.plan.md'],
    keywords: [
      'subagent',
      'parallel agents',
      'fan out',
      'dispatch',
      'delegate',
      'worktree',
      'orchestrator',
      'handoff',
      'merge conflict',
      'plan file',
      'spawn agents',
      'agent reported done',
      'token cost',
    ],
  },

  content: {
    summary:
      'Fan out only for branches with disjoint files and a checkable result each; brief every subagent as if it can see nothing; re-verify every reported success yourself; isolate concurrent writers; keep the plan on disk; integrate one branch at a time.',

    body: `# Agent Orchestration

One agent knows everything it knows at once. Splitting work across agents spends that to buy
throughput, and the trade is good only when the branches are genuinely independent and each
branch's result can be checked without reading how it was produced.

---

## 1. The fan-out condition

Three properties must all hold before work is split:

1. **Disjoint writes.** No two branches modify the same file. Adjacent is not disjoint — two
   branches appending to one router, one config, one barrel export will conflict on every run.
2. **No cross-branch inputs.** No branch needs a value another branch produces. One dependency
   edge collapses the fan-out into a sequence with extra hand-offs.
3. **A checkable result each.** The branch ends in something you can evaluate in under a minute
   without reading its reasoning: a command that exits zero, a diff you read, a file you diff
   against an expectation.

Fail any one and coordination cost exceeds the parallelism gain. Shared mutable state is the
usual disqualifier: the time saved by running four branches at once is smaller than the time
spent reconciling four edits to the same schema.

Then the arithmetic. A subagent starts with **zero** of your context, so every branch pays the
orientation cost again — the same files read, the same conventions re-derived. That cost is
roughly fixed per branch regardless of how small the branch is. Below about ten minutes of
single-agent work per branch, orientation dominates and one agent finishes sooner. The shape
that pays is few branches, each substantial, each self-contained: four independent modules with
tests, not twelve one-line edits.

---

## 2. Write the brief for someone who was never here

The subagent cannot see the conversation, the files you read, the approach the user rejected,
your working directory, or the two attempts that already failed. Anything load-bearing that
lives only in your context must be restated or it does not exist.

A brief that executes carries: **absolute paths** (never "the file we discussed"); the goal
stated as an **acceptance condition**, not an activity; the **exact command** that proves it;
constraints already settled, so they are not re-litigated; an explicit **do-not-touch list**;
the **return format** you expect; and any **approach already ruled out and why**, otherwise the
subagent will rediscover it at full price.

Give the branch a single outcome. A brief with three deliverables produces one done well and two
mentioned in passing, because the completion report is written once and covers whatever the
agent considers finished.

> Bad: "Add tests for the auth module like we discussed."
> Good: "In /srv/api/src/auth/session.ts, add tests to /srv/api/test/session.test.ts covering
> expiry, clock skew and replay. Pass condition: \`pnpm vitest run test/session.test.ts\` exits 0
> with 3 new tests. Do not modify session.ts. Do not add dependencies. Report the command output
> verbatim and the list of test names."

---

## 3. Self-reported success is the weakest evidence you have

Evidence ranks, strongest first: **a command you ran yourself** after the branch finished; **an
artifact you read** — the diff, the file, the captured output; **the branch's transcript**; and
last, **the branch's summary sentence**.

The mechanism is structural, not moral. A subagent is rewarded for producing a completion report
and has no view of what the report is worth to you. When a check resists, the reachable moves are
to weaken the assertion, stub the failing path, write the file somewhere that is not being
watched, or report the step as done and move on. Each of these produces a truthful-sounding
summary. And the summary is the orchestrator's **only** channel into that branch, so an
unverified claim is not merely unproven — it propagates into the merge with nothing downstream
able to contradict it.

So re-run the acceptance command yourself, from a clean state, and read the diff rather than the
description of the diff. Check that the number of tests went **up** and that they fail when the
change is reverted. The cost is seconds; the thing it catches is a branch that was wrong for an
hour without anyone noticing.

---

## 4. Isolate anything that writes

Two agents in one working tree produce failures that look like bugs: a build reading a
half-written file, a test failing for a reason that belongs to a different branch, a debug
session chasing a phantom that another agent has since deleted. The lost time is not the conflict
itself, it is the investigation of a symptom with no cause in the code you are reading.

Give each **concurrent writer** its own git worktree, and each agent its own scratch directory
for intermediate output. Setup costs a checkout plus a dependency install per branch, and the
install usually dominates — so isolate when there are two or more concurrent writers, or when a
branch runs anything destructive (migrations, resets, code generation, dependency upgrades).
Read-only branches — research, review, audit — share a tree safely and should not pay for
isolation.

---

## 5. The plan is a file, not a conversation

Write the plan to disk before execution starts. A conversational plan dies with the context that
holds it: compaction, a crash, a session boundary, or a hand-off to an agent that was never in
the room all destroy it identically, and the work resumes from whatever the summary happened to
preserve. A file survives all four, and can be read by the subagents themselves — which is also
what makes the brief cheap to write.

Each step names what changes, the check that proves it, and a status marker. Update the marker
**at the moment the step completes**, not at the end: status reconstructed from memory is
reconstructed optimistically, and the step everyone believes is done is the one nobody did.

---

## 6. Integrate one branch at a time

A clean textual merge is not a compatible merge. Git conflicts only on overlapping lines; it has
no opinion about meaning, so the changes that survive integration silently are exactly the ones
no tool inspects. The recurring classes: the same concept renamed two ways, the same helper added
twice under different names, one config key set by two branches, an interface change compiled
only against its author's callers, and fixtures that drifted apart.

Land the branch that touches shared foundations first so the others rebase onto it. Then merge
the rest **individually**, running the full check after each — with four branches merged at once,
a red suite tells you only that one of four is wrong, and you are now debugging a combination
none of the agents ever ran. Serialize genuinely dependent work instead of fanning it out and
repairing it afterwards.

---

## 7. Spend proportionally

Every agent spawned multiplies token spend by roughly the number of branches, because each one
re-reads its way to the same understanding. The expensive failure is not a fan-out that fails —
it is a fan-out that succeeds at three times the cost of the single agent that would have
finished sooner. Parallelism buys wall-clock time, and it is worth buying when wall-clock time is
what is scarce.

**An orchestrator that cannot check a branch's work has not delegated it. It has only stopped
watching.**`,

    references: [
      {
        id: 'subagent-briefing',
        title: 'Briefing: writing a task a context-free agent can execute',
        answers:
          'How do I write a brief for a subagent that cannot see this conversation — what must be restated, how do I scope one outcome, and what return format do I demand?',
        content: `# Briefing a subagent

A subagent begins with the system prompt, its tools, and your brief. It has none of the
conversation, none of the files you have read, none of the decisions you made and discarded, and
no memory of the two approaches that already failed. Every load-bearing fact that currently lives
only in your context either appears in the brief or ceases to exist.

This file is about closing that gap without writing an essay per task.

---

## 1. What disappears at the boundary

Enumerate what you know that the subagent does not. In practice it is always some of these:

- **Location.** Your working directory, the repository root, which of three similarly named
  files is the one in question. "The session module" resolves for you and not for it.
- **The rejected branch.** The user said no to the approach you were about to take. Absent that,
  the subagent will propose it, possibly implement it, and you will pay to undo it.
- **Prior failures.** An earlier attempt hit a locked migration, a flaky integration test, an
  import cycle. A fresh agent walks into the same wall with a full budget.
- **Settled constraints.** No new dependencies, this ORM not that one, tests colocated, British
  spellings in user-facing copy. If these were agreed in conversation, they are invisible.
- **The real acceptance bar.** You know "done" means the suite passes on CI hardware. The
  subagent will infer "done" means the code it wrote looks right.
- **Blast radius.** Which files are yours to change and which belong to a branch running beside
  you right now.

---

## 2. The seven fields

A brief that executes without a follow-up question contains:

1. **Objective as an acceptance condition.** Not "improve error handling" but "every exported
   function in src/net/ that can throw documents the thrown type, and \`pnpm typecheck\` exits 0."
   An activity has no end state; a condition does.
2. **Absolute paths.** Every file, every directory, spelled in full. Relative paths assume a
   working directory the subagent may not share.
3. **The proof command.** The literal command line, with its expected exit status and any
   expected output shape. If a command cannot express the proof, name the artifact you will read
   instead and what you will look for in it.
4. **Constraints and conventions.** The decisions already made, stated flatly, so they are not
   re-derived or re-argued. Include the ones that feel obvious to you.
5. **The do-not-touch list.** Files, directories, and operations that are out of bounds. This is
   the field that makes parallel branches safe, and the one most often omitted.
6. **Known dead ends.** What was tried, what happened, and the inference drawn. Three lines here
   routinely saves a subagent a third of its budget.
7. **Return format.** What you want back and in what shape — the command output verbatim, the
   list of files changed, the specific numbers. An unspecified return format produces prose, and
   prose is the evidence class you can least verify.

---

## 3. One outcome per brief

Scope each brief to a single deliverable. A brief carrying three deliverables reliably produces
one done thoroughly, one done partially, and one mentioned in the final paragraph — because the
agent writes its completion report once, at whatever point it judges itself finished, and a
partially satisfied objective still reads as progress.

If the work has three deliverables and they are independent, that is three briefs. If they are
not independent, it is one sequential task, and fanning it out will cost more than it returns.

---

## 4. Brief shapes by task kind

**Research.** The question, the places to look, the form of the answer, and an explicit
prohibition on modifying anything. Demand file paths and line numbers in the return, because a
research result without citations cannot be checked and must be re-derived.

**Implementation.** The seven fields in full. Add the current state of the tree — branch name,
whether it is clean, what was just merged — since the subagent will otherwise infer it from
whatever it finds.

**Review.** The diff or commit range, the specific properties to evaluate, and the instruction to
report findings without fixing them. A reviewer that fixes what it finds destroys the separation
that made the review worth commissioning: you now have unreviewed changes from the reviewer.

**Debugging.** The reproduction, the observed symptom, the hypotheses already disconfirmed and
the observation that disconfirmed each. Without the disconfirmation history, a fresh agent
re-runs your first three guesses.

---

## 5. Failure protocol

State in the brief what to do when the task cannot be completed: stop, report the exact error
output, report what was already changed, and do not attempt a workaround that was not authorised.
The default behaviour in the absence of this instruction is to improvise — to weaken the test, to
skip the failing case, to install the missing package — and to report success, because the agent
has satisfied the instruction as it understood it.

A brief that says "if the migration will not run, stop and report the error rather than editing
the schema" converts a silent corruption into a two-line message.

---

## 6. A worked pair

**Bad:**

> Please add caching to the API client we talked about, following the pattern from the other
> service. Make sure it is fast.

Five defects: no path, no pattern reference the agent can resolve, no threshold for "fast", no
proof command, no bounds on what may change.

**Good:**

> Add a response cache to /srv/gateway/src/clients/catalog.ts.
>
> Acceptance: repeated GETs to the same URL within the TTL issue one upstream request. Proven by
> \`pnpm vitest run test/clients/catalog.cache.test.ts\`, which you will write, exiting 0 with at
> least 3 tests including a TTL-expiry case.
>
> Constraints: in-memory Map keyed on the full URL, TTL 60s, no new dependencies, no change to
> the exported function signatures. Follow the existing error handling in the same file.
>
> Do not touch: src/clients/index.ts, any file outside src/clients/, package.json.
>
> Dead end: an earlier attempt cached at the fetch wrapper in src/net/ and broke auth-token
> rotation, because the wrapper is shared with the identity client. Cache inside catalog.ts only.
>
> Return: the vitest output verbatim, the list of files you changed, and the cache key format you
> chose.

---

## Pass conditions

- Does the brief state an acceptance condition rather than an activity, with a command or named artifact that proves it?
- Is every file and directory given as an absolute path?
- Are the constraints settled in conversation restated in the brief, including the ones that feel too obvious to write?
- Does the brief name what must not be changed, including files owned by branches running concurrently?
- Are prior failed approaches and their inferences included, so the subagent does not re-derive them?
- Does the brief carry exactly one deliverable?
- Is the return format specified as artifacts and numbers rather than left to produce prose?
- Does the brief say what to do on failure — stop and report — rather than leaving improvisation as the default?`,
      },
      {
        id: 'verifying-delegated-work',
        title: 'Verification: what an orchestrator re-checks and why reports do not count',
        answers:
          'A subagent says it finished — what do I check myself, in what order, and how do I tell a real completion from a plausible report?',
        content: `# Verifying delegated work

The orchestrator's hardest problem is not producing good work in a branch. It is telling, from
outside, whether a branch produced good work. Everything the branch says about itself is
generated by the same process that did the work, so it cannot function as an independent check on
it.

---

## 1. The evidence ladder

Ranked from strongest to weakest:

1. **A command you ran yourself**, after the branch finished, in a state you control. Independent
   of the branch's account of anything.
2. **An artifact you read**: the diff, the changed file, the captured test output. Independent of
   the branch's summary, though not of what the branch chose to write.
3. **The branch's transcript**: what it actually did, in order. Useful for diagnosis, and it can
   reveal a step that failed and was worked around.
4. **The branch's summary**: a sentence asserting completion. This is the class of evidence
   everyone acts on and the only one with no independent grounding at all.

Move up the ladder in proportion to what is at stake. A research summary you will read and judge
yourself needs no more. A branch that touched a migration, a shared interface, or an auth path
gets a command you ran.

---

## 2. Why the summary is structurally unreliable

This is not about dishonesty. A subagent is optimising for a completion report, under a budget,
with no visibility into how the report will be used. When the acceptance check resists, the moves
available are all locally reasonable:

- **Weaken the assertion** until it passes — compare lengths rather than contents, assert
  "no exception" rather than a value.
- **Skip or stub** the failing path, with a comment explaining why it is acceptable.
- **Redirect the output** — write to a new file when the target is locked, leaving the real target
  untouched and the new file unreferenced.
- **Redefine the goal** to the part that was achieved, and report that part as the whole.
- **Report a step as done** after a tool call failed silently or returned a partial result.

Each produces a summary that is, in its own terms, true. And the summary is the orchestrator's
only channel into that branch: there is no second opinion downstream, so an unverified claim is
not just unproven, it is uncontradictable. It reaches the merge with the same standing as a
verified one.

---

## 3. The four checks worth their cost

**Re-run the proof.** Execute the acceptance command yourself. Not the command the subagent says
it ran — the one in the brief, from a clean state. A branch that passed in a dirty tree with a
stale build frequently fails here, and that failure is the entire value of the check.

**Read the diff, not the description.** \`git diff\` against the base. Scan for: files outside the
brief's scope, deleted or commented-out assertions, new \`skip\` and \`only\` markers, swallowed
exceptions, hard-coded values where a computation was asked for, and changes to configuration
that were not requested. This is a sixty-second read that catches most of section 2.

**Count what should have gone up.** Tests before versus after. Exports before versus after. If a
branch reports adding three tests, the count moved by three, and the new ones are named after the
behaviours in the brief rather than after the implementation.

**Revert and confirm red.** For anything load-bearing: undo the change and confirm the new test
fails. A test that passes both with and without the implementation is testing nothing, and this
is the single most common way a green suite means less than it appears to.

---

## 4. Reviewing with a second agent

An agent reviewing its own output is checking work against the model that produced it, so the
errors it cannot see are precisely the ones its model does not represent. A separate agent, given
the diff and the original brief but not the authoring transcript, has no stake in the approach and
no memory of why each decision seemed necessary.

Give the reviewer the acceptance condition and instruct it to report rather than repair. A
reviewer that fixes what it finds leaves you with unreviewed changes authored by the reviewer,
which is the state you commissioned the review to escape.

This is worth its cost on shared interfaces, security-relevant paths, anything irreversible, and
any branch whose author already had to be corrected once — a retry earns more scrutiny than a
first attempt, because the evidence now says that branch's model of the area is unreliable.

---

## 5. Partial and failed returns

**Partial.** Determine what was actually completed from artifacts, not from the report's
description of completion. Re-derive the remaining work as a new brief; do not hand the same brief
back with "continue", since the second agent cannot see what the first did either.

**Failed.** Read the verbatim error before deciding anything. A branch that failed cleanly and
reported the error is worth more than one that improvised, and should be treated as a successful
diagnostic result rather than a wasted spawn: the brief now has a dead end to record.

**Contradictory.** When two branches report incompatible facts about the same code — one says the
function is async, the other says it is not — go and read the code. Do not adjudicate between two
reports; both are downstream of the same unreliable channel.

---

## 6. What not to verify

Verification has a cost and it is not free of judgment. Re-running a ten-minute suite after a
typo fix in a comment, or reading a fifty-file diff line by line when the branch was scoped to
formatting, spends the orchestrator's budget without changing any decision.

Scale the check to the blast radius: irreversibility, shared state, cost of being wrong,
and whether this branch has already been wrong once. For a read-only research branch, reading the
answer *is* the verification.

---

## Pass conditions

- Did you run the acceptance command yourself, from a clean state, rather than accepting the branch's account of running it?
- Did you read the actual diff, checking for out-of-scope files, weakened assertions, skip markers, and unrequested configuration changes?
- Did the counts that should have increased actually increase, and are the new tests named after behaviours rather than implementation details?
- For load-bearing changes, did you confirm the new test fails when the implementation is reverted?
- Was anything touching shared interfaces, security paths, or irreversible operations reviewed by an agent that did not author it?
- For a partial return, did you establish what was completed from artifacts rather than from the report?
- When two branches reported incompatible facts, did you read the code rather than adjudicate between reports?
- Is the depth of verification matched to blast radius rather than applied uniformly?`,
      },
      {
        id: 'isolation-and-integration',
        title: 'Isolation and integration: worktrees, scratch space, merge order, silent conflicts',
        answers:
          'How do I stop parallel branches from corrupting each other, and how do I integrate their results without a clean merge that quietly breaks?',
        content: `# Isolation and integration

Two problems sit at either end of a fan-out. At the start, concurrent branches sharing one
working tree corrupt each other in ways that present as bugs. At the end, branches that never saw
each other's work are combined, and the merge tool has an opinion about text but none about
meaning.

---

## 1. What shared-tree collisions actually look like

The cost is rarely the conflict. It is the investigation of a symptom whose cause is not in the
code you are reading:

- A build reads a file another agent is halfway through writing, and fails with a parse error at a
  line that is syntactically fine by the time you look.
- A test fails because a fixture was changed by a branch you are not working on.
- An agent deletes a temporary file that another agent is still using.
- Two agents run the same dev server and the second binds to a port held by the first.
- One agent runs a migration or a \`reset\`, and every other branch's database is now a different
  shape than its code expects.
- \`git status\` shows changes from three branches, so no agent can tell which edits are its own —
  which also means no agent can produce a clean diff for verification.

The last one compounds: it destroys the orchestrator's cheapest verification channel at exactly
the moment several unverified branches are in flight.

---

## 2. Worktrees for concurrent writers

A git worktree is a second checkout of the same repository on its own branch, with its own
directory and its own index, sharing one object store. Each writing branch gets one. The
properties that matter: file writes cannot interleave, each branch produces a diff that contains
only its own work, and a destructive command is contained.

The setup cost is a checkout plus whatever the project needs to build — and the build setup
usually dominates. Installing dependencies per worktree can exceed the work the branch was spawned
to do. Where the toolchain supports a shared store or a linked cache, use it; where it does not,
count the install in the fan-out arithmetic and let it push small tasks back onto a single agent.

Isolate when: two or more branches write; any branch runs migrations, resets, code generation, or
dependency upgrades; or a branch needs a different dependency version than the main tree. Do not
isolate read-only branches — research, review, audit — since they cannot corrupt anything and the
setup buys nothing.

Ancillary discipline: one scratch directory per agent for intermediate output, named so ownership
is obvious, and never inside the repository unless it is ignored. Scratch files committed by
accident are a recurring source of merge conflicts between branches that otherwise never
overlapped.

---

## 3. Ordering

Not all branches are equal at integration time.

**Foundations first.** The branch that changes a shared type, a schema, a config shape or a core
utility lands before the branches that consume it, and the others rebase onto it. The alternative
is every consumer written against a foundation that changed underneath them, which is N conflicts
instead of N rebases.

**Serialize real dependencies.** If branch B needs B's input from A, it is not a fan-out. Run A,
verify A, then brief B with A's result stated explicitly — B cannot see A's transcript.

**Batch by risk, not by convenience.** Land the branch you are least confident about while the
tree is otherwise clean, so a failure is attributable. A risky branch merged last, into a tree
already carrying three other merges, is the hardest thing in the set to debug.

---

## 4. Silent conflicts

Git conflicts on overlapping lines. Everything else merges clean regardless of whether it makes
sense. The recurring classes:

- **Divergent naming.** Two branches introduce the same concept as \`userId\` and \`accountId\`.
  Both compile. The system now has two names for one thing, permanently.
- **Duplicate helpers.** Each branch writes its own \`formatDuration\`, in different files, with
  different rounding. Neither conflicts; behaviour differs by call site.
- **Contested configuration.** Two branches set the same key in different places. Last writer
  wins, silently, and which one is last depends on merge order.
- **Interface drift.** One branch changes a signature and updates the callers it can see. A
  parallel branch added a new caller against the old signature. In a typed language this is a
  build error, which is the good case; in an untyped one it is a runtime failure in a path nobody
  ran.
- **Fixture divergence.** Both branches edit test fixtures for their own needs. The suite passes
  in each branch and fails combined.
- **Lockfile churn.** Two branches regenerate a lockfile. The textual merge is plausible and the
  resulting dependency graph is one neither branch tested.

Detection is mechanical: after each merge, run the full check — typecheck, lint, the whole suite,
and a build — not just the tests belonging to the branch that just landed. Grep the combined tree
for duplicated helper names and for the same config key set twice.

---

## 5. Merge one at a time

Integrate branches individually and run the full check between each. Merging four at once and
finding the suite red tells you only that one of four is wrong, in a combination no agent ever
executed, and bisecting it costs more than the serialisation would have.

After each merge: full check green, diff of the merge commit read, and the branch's own acceptance
command re-run in the integrated tree. That last step is the one most often skipped and the one
that catches a branch which was correct alone and is not correct alongside.

---

## 6. Handoff between sequential agents

When one agent's output is another's input, the second agent cannot see the first's context. The
handoff must be an **artifact**: a written result, a diff, a file path, a plan file with statuses
updated. "Continue where the previous agent left off" is not a handoff — it presumes a shared
memory that does not exist.

The plan file is the natural carrier. Steps, their checks, and their status, updated at the moment
each completes rather than reconstructed at the end. That file lets a fresh agent determine the
true state from disk instead of inferring it from a summary, which is the same reason it survives
compaction and a crashed session.

---

## Pass conditions

- Does every concurrently writing branch have its own worktree, and every agent its own scratch directory outside the repository or ignored?
- Were read-only branches left unisolated rather than paying setup cost for no benefit?
- Did the branch touching shared foundations land first, with the others rebased onto it?
- Was genuinely dependent work serialized, with the earlier result restated explicitly in the later brief?
- Were branches merged one at a time, with the full check — typecheck, lint, suite, build — run after each?
- After integration, did you re-run each branch's own acceptance command in the combined tree?
- Did you check for the silent classes: divergent names for one concept, duplicate helpers, a config key set twice, callers written against a changed signature, diverging fixtures, a merged lockfile?
- Is every handoff between sequential agents carried by an artifact on disk rather than by a reference to what came before?`,
      },
    ],
  },

  rules: [
    {
      id: 'orchestration/disjoint-before-parallel',
      strength: 'must-not',
      statement:
        'Do not run branches in parallel unless they write disjoint files and no branch consumes another branch output.',
      evidence: {
        rationale:
          'Parallelism returns wall-clock time and costs reconciliation. When branches share mutable state, the reconciliation is paid at merge time on work that was produced without knowledge of the conflict, so it is more expensive than doing the same edits in sequence would have been. A dependency edge is worse still: it converts the fan-out into a sequence plus the overhead of two extra hand-offs.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Four agents, each adding an endpoint, each editing src/routes/index.ts to register it.',
        good: 'Four agents, each writing src/routes/<name>.ts with a default export and its own test file. The orchestrator registers all four in index.ts afterwards, in one edit.',
      },
      exceptions: [
        'Read-only branches — research, review, audit — may run in any number against one tree, since they produce no writes to reconcile.',
      ],
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/checkable-result-per-branch',
      strength: 'must',
      statement:
        'Give every delegated branch a result the orchestrator can evaluate without reading the branch reasoning — a command that exits zero, a diff, or a named artifact.',
      evidence: {
        rationale:
          'The orchestrator has no other channel into a branch than what the branch emits, so a result that can only be assessed by reading the branch account of it is not verifiable at all. A checkable result also bounds the orchestrator cost per branch: evaluation stays constant as the fan-out grows, while reading transcripts scales with total work done.',
        confidence: 'established',
      },
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/serial-below-threshold',
      strength: 'should-not',
      statement:
        'Do not fan out when each branch is under roughly ten minutes of single-agent work, or when fewer than three branches exist.',
      evidence: {
        rationale:
          'Each subagent starts with zero context and pays a fixed orientation cost — the same files read, the same conventions re-derived — that does not shrink with the size of the branch. Below that threshold orientation dominates the branch itself, so the fan-out finishes later and costs several times more tokens than one agent that already has the context loaded.',
        confidence: 'strong',
      },
      exceptions: [
        'Branches that need a clean context for correctness rather than for speed, such as an independent review of work the current agent authored.',
      ],
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/self-contained-brief',
      strength: 'must',
      statement:
        'State absolute paths, the acceptance condition, the proof command, settled constraints, and the do-not-touch list in the brief itself, with no reference to the conversation.',
      evidence: {
        rationale:
          'The subagent receives the brief and nothing else — not the conversation, not the files you read, not your working directory. A reference to shared context resolves to nothing at the other end, and the subagent fills the gap by inference rather than by asking, so the omission surfaces as confidently wrong work rather than as a question.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Add tests for the auth module we discussed, following the pattern from the other service.',
        good: 'Add tests to /srv/api/test/session.test.ts covering expiry, clock skew and replay. Pass condition: pnpm vitest run test/session.test.ts exits 0 with 3 new tests. Do not modify src/auth/session.ts. No new dependencies.',
      },
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/record-dead-ends-in-brief',
      strength: 'should',
      statement:
        'Include approaches already tried and why they failed in the brief for any task where an earlier attempt was made.',
      evidence: {
        rationale:
          'A fresh agent has a full budget and no memory of the wall the last one hit, so the most plausible approach — the one that already failed — is the one it will choose first. Three lines of dead-end history redirect the branch before it spends, and the inference drawn from the failure is usually the fact that makes the correct approach obvious.',
        confidence: 'strong',
      },
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/one-outcome-per-brief',
      strength: 'should',
      statement:
        'Scope each brief to exactly one deliverable rather than bundling several into one delegated task.',
      evidence: {
        rationale:
          'A subagent writes its completion report once, at the point it judges itself finished, and a partially satisfied objective still reads as progress. With three deliverables in one brief the reliable outcome is one done thoroughly, one done partially, and one mentioned in the closing paragraph — and the report gives the orchestrator no way to distinguish them.',
        confidence: 'strong',
      },
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/rerun-the-proof',
      strength: 'must',
      statement:
        'Run the acceptance command yourself from a clean state before accepting a branch as complete, rather than accepting the branch report that it ran.',
      evidence: {
        rationale:
          'A completion report is generated by the same process that did the work, so it cannot function as an independent check on it. When a check resists, the moves available to a subagent — weaken the assertion, stub the failing path, write to a different file, redefine the goal to the part achieved — all produce a truthful-sounding summary. Re-running is the only evidence that is not downstream of the branch own account.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Subagent reports: all tests pass, feature complete. Merge it.',
        good: 'Subagent reports complete. Run the brief pass command in the merged tree: 47 tests, 3 new, exit 0. Revert the implementation: the 3 new tests fail. Accept.',
      },
      exceptions: [
        'Read-only research branches, where reading the answer and its cited paths is itself the verification.',
      ],
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/read-the-diff',
      strength: 'must',
      statement:
        'Read the actual diff of a delegated change, checking for out-of-scope files, weakened assertions, skip markers, and unrequested configuration edits.',
      evidence: {
        rationale:
          'A summary describes the change the branch intended; the diff is the change that exists. The gap between them is where the cheap workarounds live, and all of them are invisible in prose: a deleted assertion, a test marked skip, a silenced exception, a hard-coded value standing in for a computation. The read costs under a minute and is the only check that sees what the branch chose not to mention.',
        confidence: 'established',
      },
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/isolate-concurrent-writers',
      strength: 'should',
      statement:
        'Give each concurrently writing branch its own git worktree and each agent its own scratch directory outside the repository.',
      evidence: {
        rationale:
          'Agents sharing one tree produce failures that present as bugs with no cause in the code being read — a build parsing a half-written file, a test failing on another branch fixture, a phantom deleted mid-investigation. A shared tree also merges every branch changes into one git status, which destroys the per-branch diff that verification depends on.',
        confidence: 'strong',
      },
      exceptions: [
        'Read-only branches, which cannot corrupt anything and should not pay setup cost.',
        'Projects where per-worktree dependency installation costs more than the branch itself, in which case serialize the writers instead of isolating them.',
      ],
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/plan-as-file',
      strength: 'must',
      statement:
        'Write the plan to a file with one checkable verification per step before execution begins, and update each step status at the moment it completes.',
      evidence: {
        rationale:
          'A plan held in conversation dies with the context holding it — compaction, a crash, a session boundary and a hand-off destroy it identically, and work resumes from whatever a summary happened to preserve. A file survives all four and can be read by the subagents themselves. Status written at completion is observed; status reconstructed at the end is remembered, and memory of completion is optimistic.',
        confidence: 'established',
      },
      exceptions: [
        'Single-step work that will finish inside the current context and has no delegated branches.',
      ],
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/foundations-land-first',
      strength: 'should',
      statement:
        'Merge the branch that changes shared types, schemas, or configuration before the branches that consume it, and rebase the consumers onto it.',
      evidence: {
        rationale:
          'Consumers written against a foundation that changes underneath them each produce a conflict, so landing the foundation last costs N reconciliations where landing it first costs N rebases against a known-good target. The rebases also fail loudly at build time, whereas late foundation changes can merge clean and break callers the foundation author never saw.',
        confidence: 'strong',
      },
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/merge-one-at-a-time',
      strength: 'must',
      statement:
        'Integrate parallel branches one at a time, running the full check — typecheck, lint, suite, build — after each rather than after the batch.',
      evidence: {
        rationale:
          'A clean textual merge is not a compatible merge: git conflicts only on overlapping lines and has no opinion about meaning, so divergent names for one concept, duplicate helpers, a config key set twice and a caller written against an old signature all combine silently. Merging four branches then finding the suite red identifies only that one of four is wrong, in a combination no agent ever ran.',
        confidence: 'established',
      },
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/handoff-by-artifact',
      strength: 'must-not',
      statement:
        'Do not hand work to a following agent by telling it to continue from where the previous one stopped; hand it a written result, a diff, or an updated plan file.',
      evidence: {
        rationale:
          'The following agent cannot read the previous agent transcript or context, so an instruction to continue presumes a shared memory that does not exist and is resolved by inference from whatever the tree happens to look like. An artifact on disk states the true position independently of any context, which is what makes the state recoverable after the session that produced it is gone.',
        confidence: 'established',
      },
      verifiedBy: 'orchestration-review',
    },
    {
      id: 'orchestration/independent-reviewer',
      strength: 'should',
      statement:
        'Have a separate agent, given the diff and the original brief but not the authoring transcript, review changes to shared interfaces, security-relevant paths, or anything irreversible — reporting findings rather than fixing them.',
      evidence: {
        rationale:
          'An agent reviewing its own output checks the work against the model that produced it, so the errors it cannot see are exactly the ones that model does not represent. A reviewer without the authoring transcript has no stake in the approach and no memory of why each decision seemed necessary. It must report rather than repair, because a reviewer that fixes leaves you with unreviewed changes by the reviewer.',
        confidence: 'strong',
      },
      exceptions: [
        'Low-stakes, reversible changes, where the review costs more than reverting would.',
      ],
      verifiedBy: 'orchestration-review',
    },
  ],

  verification: [
    {
      id: 'orchestration-review',
      kind: 'self-review',
      description:
        'Confirm the fan-out was justified, the briefs were self-contained, and every reported completion was checked independently.',
      blocking: true,
      questions: [
        'Do the parallel branches write disjoint files, with no branch consuming another branch output, and is each branch substantial enough that orientation cost does not dominate it?',
        'Does every brief carry absolute paths, an acceptance condition, the proof command, settled constraints, a do-not-touch list, prior dead ends, and a required return format — with no reference to a conversation the subagent cannot see?',
        'Does each brief carry exactly one deliverable, and does it say to stop and report verbatim on failure rather than improvise?',
        'For every branch reported complete, did you run the acceptance command yourself from a clean state and read the actual diff, rather than accepting the summary?',
        'Did the counts that should have risen actually rise, and do the new tests fail when the implementation is reverted?',
        'Does every concurrently writing branch have its own worktree and scratch directory, with read-only branches left unisolated?',
        'Is the plan a file with a check per step, updated at the moment each step completed rather than reconstructed afterwards?',
        'Did foundations land first, were branches merged individually with the full check run between each, and did you look for divergent names, duplicate helpers, a config key set twice, and callers written against a changed signature?',
        'Is every hand-off to a following agent carried by an artifact on disk rather than by an instruction to continue?',
        'Would a single agent have finished this work sooner and cheaper than the fan-out you chose?',
      ],
    },
  ],

  relatedSkills: ['engineering-discipline', 'code-quality', 'ui-generation-workflow'],
}
