# Isolation and integration

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
- One agent runs a migration or a `reset`, and every other branch's database is now a different
  shape than its code expects.
- `git status` shows changes from three branches, so no agent can tell which edits are its own —
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

- **Divergent naming.** Two branches introduce the same concept as `userId` and `accountId`.
  Both compile. The system now has two names for one thing, permanently.
- **Duplicate helpers.** Each branch writes its own `formatDuration`, in different files, with
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
- Is every handoff between sequential agents carried by an artifact on disk rather than by a reference to what came before?
