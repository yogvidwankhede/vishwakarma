# Agent Orchestration

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
> expiry, clock skew and replay. Pass condition: `pnpm vitest run test/session.test.ts` exits 0
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
watching.**

## Rules

### MUST NOT — Do not run branches in parallel unless they write disjoint files and no branch consumes another branch output.

*Why:* Parallelism returns wall-clock time and costs reconciliation. When branches share mutable state, the reconciliation is paid at merge time on work that was produced without knowledge of the conflict, so it is more expensive than doing the same edits in sequence would have been. A dependency edge is worse still: it converts the fan-out into a sequence plus the overhead of two extra hand-offs.

*Exceptions:*
- Read-only branches — research, review, audit — may run in any number against one tree, since they produce no writes to reconcile.

Incorrect:

```text
Four agents, each adding an endpoint, each editing src/routes/index.ts to register it.
```

Correct:

```text
Four agents, each writing src/routes/<name>.ts with a default export and its own test file. The orchestrator registers all four in index.ts afterwards, in one edit.
```

### MUST NOT — Do not hand work to a following agent by telling it to continue from where the previous one stopped; hand it a written result, a diff, or an updated plan file.

*Why:* The following agent cannot read the previous agent transcript or context, so an instruction to continue presumes a shared memory that does not exist and is resolved by inference from whatever the tree happens to look like. An artifact on disk states the true position independently of any context, which is what makes the state recoverable after the session that produced it is gone.

### MUST — Give every delegated branch a result the orchestrator can evaluate without reading the branch reasoning — a command that exits zero, a diff, or a named artifact.

*Why:* The orchestrator has no other channel into a branch than what the branch emits, so a result that can only be assessed by reading the branch account of it is not verifiable at all. A checkable result also bounds the orchestrator cost per branch: evaluation stays constant as the fan-out grows, while reading transcripts scales with total work done.

### MUST — State absolute paths, the acceptance condition, the proof command, settled constraints, and the do-not-touch list in the brief itself, with no reference to the conversation.

*Why:* The subagent receives the brief and nothing else — not the conversation, not the files you read, not your working directory. A reference to shared context resolves to nothing at the other end, and the subagent fills the gap by inference rather than by asking, so the omission surfaces as confidently wrong work rather than as a question.

Incorrect:

```text
Add tests for the auth module we discussed, following the pattern from the other service.
```

Correct:

```text
Add tests to /srv/api/test/session.test.ts covering expiry, clock skew and replay. Pass condition: pnpm vitest run test/session.test.ts exits 0 with 3 new tests. Do not modify src/auth/session.ts. No new dependencies.
```

### MUST — Run the acceptance command yourself from a clean state before accepting a branch as complete, rather than accepting the branch report that it ran.

*Why:* A completion report is generated by the same process that did the work, so it cannot function as an independent check on it. When a check resists, the moves available to a subagent — weaken the assertion, stub the failing path, write to a different file, redefine the goal to the part achieved — all produce a truthful-sounding summary. Re-running is the only evidence that is not downstream of the branch own account.

*Exceptions:*
- Read-only research branches, where reading the answer and its cited paths is itself the verification.

Incorrect:

```text
Subagent reports: all tests pass, feature complete. Merge it.
```

Correct:

```text
Subagent reports complete. Run the brief pass command in the merged tree: 47 tests, 3 new, exit 0. Revert the implementation: the 3 new tests fail. Accept.
```

### MUST — Read the actual diff of a delegated change, checking for out-of-scope files, weakened assertions, skip markers, and unrequested configuration edits.

*Why:* A summary describes the change the branch intended; the diff is the change that exists. The gap between them is where the cheap workarounds live, and all of them are invisible in prose: a deleted assertion, a test marked skip, a silenced exception, a hard-coded value standing in for a computation. The read costs under a minute and is the only check that sees what the branch chose not to mention.

### MUST — Write the plan to a file with one checkable verification per step before execution begins, and update each step status at the moment it completes.

*Why:* A plan held in conversation dies with the context holding it — compaction, a crash, a session boundary and a hand-off destroy it identically, and work resumes from whatever a summary happened to preserve. A file survives all four and can be read by the subagents themselves. Status written at completion is observed; status reconstructed at the end is remembered, and memory of completion is optimistic.

*Exceptions:*
- Single-step work that will finish inside the current context and has no delegated branches.

### MUST — Integrate parallel branches one at a time, running the full check — typecheck, lint, suite, build — after each rather than after the batch.

*Why:* A clean textual merge is not a compatible merge: git conflicts only on overlapping lines and has no opinion about meaning, so divergent names for one concept, duplicate helpers, a config key set twice and a caller written against an old signature all combine silently. Merging four branches then finding the suite red identifies only that one of four is wrong, in a combination no agent ever ran.

### SHOULD NOT — Do not fan out when each branch is under roughly ten minutes of single-agent work, or when fewer than three branches exist.

*Why:* Each subagent starts with zero context and pays a fixed orientation cost — the same files read, the same conventions re-derived — that does not shrink with the size of the branch. Below that threshold orientation dominates the branch itself, so the fan-out finishes later and costs several times more tokens than one agent that already has the context loaded.

*Exceptions:*
- Branches that need a clean context for correctness rather than for speed, such as an independent review of work the current agent authored.

### SHOULD — Include approaches already tried and why they failed in the brief for any task where an earlier attempt was made.

*Why:* A fresh agent has a full budget and no memory of the wall the last one hit, so the most plausible approach — the one that already failed — is the one it will choose first. Three lines of dead-end history redirect the branch before it spends, and the inference drawn from the failure is usually the fact that makes the correct approach obvious.

### SHOULD — Scope each brief to exactly one deliverable rather than bundling several into one delegated task.

*Why:* A subagent writes its completion report once, at the point it judges itself finished, and a partially satisfied objective still reads as progress. With three deliverables in one brief the reliable outcome is one done thoroughly, one done partially, and one mentioned in the closing paragraph — and the report gives the orchestrator no way to distinguish them.

### SHOULD — Give each concurrently writing branch its own git worktree and each agent its own scratch directory outside the repository.

*Why:* Agents sharing one tree produce failures that present as bugs with no cause in the code being read — a build parsing a half-written file, a test failing on another branch fixture, a phantom deleted mid-investigation. A shared tree also merges every branch changes into one git status, which destroys the per-branch diff that verification depends on.

*Exceptions:*
- Read-only branches, which cannot corrupt anything and should not pay setup cost.
- Projects where per-worktree dependency installation costs more than the branch itself, in which case serialize the writers instead of isolating them.

### SHOULD — Merge the branch that changes shared types, schemas, or configuration before the branches that consume it, and rebase the consumers onto it.

*Why:* Consumers written against a foundation that changes underneath them each produce a conflict, so landing the foundation last costs N reconciliations where landing it first costs N rebases against a known-good target. The rebases also fail loudly at build time, whereas late foundation changes can merge clean and break callers the foundation author never saw.

### SHOULD — Have a separate agent, given the diff and the original brief but not the authoring transcript, review changes to shared interfaces, security-relevant paths, or anything irreversible — reporting findings rather than fixing them.

*Why:* An agent reviewing its own output checks the work against the model that produced it, so the errors it cannot see are exactly the ones that model does not represent. A reviewer without the authoring transcript has no stake in the approach and no memory of why each decision seemed necessary. It must report rather than repair, because a reviewer that fixes leaves you with unreviewed changes by the reviewer.

*Exceptions:*
- Low-stakes, reversible changes, where the review costs more than reverting would.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the fan-out was justified, the briefs were self-contained, and every reported completion was checked independently. (blocking)

- Do the parallel branches write disjoint files, with no branch consuming another branch output, and is each branch substantial enough that orientation cost does not dominate it?
- Does every brief carry absolute paths, an acceptance condition, the proof command, settled constraints, a do-not-touch list, prior dead ends, and a required return format — with no reference to a conversation the subagent cannot see?
- Does each brief carry exactly one deliverable, and does it say to stop and report verbatim on failure rather than improvise?
- For every branch reported complete, did you run the acceptance command yourself from a clean state and read the actual diff, rather than accepting the summary?
- Did the counts that should have risen actually rise, and do the new tests fail when the implementation is reverted?
- Does every concurrently writing branch have its own worktree and scratch directory, with read-only branches left unisolated?
- Is the plan a file with a check per step, updated at the moment each step completed rather than reconstructed afterwards?
- Did foundations land first, were branches merged individually with the full check run between each, and did you look for divergent names, duplicate helpers, a config key set twice, and callers written against a changed signature?
- Is every hand-off to a following agent carried by an artifact on disk rather than by an instruction to continue?
- Would a single agent have finished this work sooner and cheaper than the fan-out you chose?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/subagent-briefing.md` — How do I write a brief for a subagent that cannot see this conversation — what must be restated, how do I scope one outcome, and what return format do I demand?
- `references/verifying-delegated-work.md` — A subagent says it finished — what do I check myself, in what order, and how do I tell a real completion from a plausible report?
- `references/isolation-and-integration.md` — How do I stop parallel branches from corrupting each other, and how do I integrate their results without a clean merge that quietly breaks?
