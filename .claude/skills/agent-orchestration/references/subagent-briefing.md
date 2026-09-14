# Briefing a subagent

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
   function in src/net/ that can throw documents the thrown type, and `pnpm typecheck` exits 0."
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
> `pnpm vitest run test/clients/catalog.cache.test.ts`, which you will write, exiting 0 with at
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
- Does the brief say what to do on failure — stop and report — rather than leaving improvisation as the default?
