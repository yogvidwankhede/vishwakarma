# Receiving a review

Receiving is the half that is never taught, and it fails differently from giving. A reviewer
fails by producing a report nobody can act on. An author fails by **converting a review into
a negotiation** — defending the code that exists rather than evaluating the claim about it —
or by the quieter failure of fixing everything without thought, which trains the reviewer to
stop distinguishing severities because the author never did.

Load this when comments have arrived on your change, from a person or from a tool.

---

## 1. Read the claim, not the tone

Separate two things before responding to anything: **what is being claimed about the code**,
and **how it was said**. Only the first is your problem right now. A rude comment about a
real race is a real race. A friendly comment about an imagined one is still wrong.

Read the whole review before answering any of it. Reviews are written in reading order, not
dependency order, so comment 14 frequently withdraws comment 3, and answering top-down means
arguing a point the reviewer already resolved.

Then sort the findings yourself, by consequence. The reviewer’s severity labels are an input,
not a verdict — they were assigned without knowing which paths are reachable in production.

---

## 2. Three responses, and only three

Every comment gets exactly one of these, explicitly, including the ones you think are
obviously wrong.

**Fixed.** Say what changed and where. "Fixed in `a1b2c3d` — moved the promise into the map
before the await." The reviewer then re-reads one hunk instead of re-reviewing the file. A
bare "done" costs them a diff hunt, which is the same work you just avoided doing.

**Disputed, with the mechanism.** State the thing that makes the failure impossible, and
state it in the same currency as the finding: a control-flow fact, a type, a constraint, a
test. If the mechanism turns out to be a comment you wrote yourself three months ago, that is
not a mechanism, that is a convention — and a convention is exactly what the reviewer is
pointing at.

**Accepted and deferred.** Agree it is real, say what doing it now costs, and give it a
location: an issue number, a TODO with that number, a line in the ticket. Deferral without a
location is a decline with better manners, and everyone involved knows it, which is why
deferrals that are not recorded get re-filed on the next change to the same file.

**Silence is not a fourth option.** An unanswered comment reads as agreement to the reviewer
and as dismissal to the author, so both sides leave the thread with opposite beliefs about
what was decided. The cost lands later, when the reviewer finds the unchanged line and
reasonably concludes their review is not read.

---

## 3. Disputing well

A good dispute is falsifiable. It gives the reviewer something they can check and be wrong
about, which is what lets them update rather than repeat.

| Weak dispute | Why it fails | Strong form |
| --- | --- | --- |
| "That cannot happen." | Asserts the conclusion the finding denies. | "`parseRow` is only reached from `ingest`, which filters empty lines at line 31, so the empty case is unreachable here." |
| "I have worked on this service for three years." | Tenure is evidence about the speaker, not the code. | "This path has never taken a null because the column is `NOT NULL` since migration 0042." |
| "That is the pattern we use everywhere." | Consistency is a reason to keep a choice, not evidence it is correct. | "Deliberate: every handler returns `Result` rather than throwing, so the caller in `router.ts:77` can retry. Changing it here alone would break that." |
| "It is just a style preference." | May be true, but asserting it does not establish it. | "This is a preference rather than a defect — no input produces a different result either way. I would rather keep the current shape because it matches the three sibling handlers." |

Two disputes that are always legitimate, and frequently correct:

- **The finding is about a different change.** "That is real, but it predates this diff — the
  line is unchanged here. Filed as #812." A review that grows to cover the file rather than
  the diff has no natural end, and the author is the only person positioned to say so.
- **The finding is a rewrite proposal.** "This is a proposal to restructure the module rather
  than a defect in the change. It may be right; it is two days and a migration. Can we decide
  it separately?" Naming the category is not a refusal — it moves the decision to where it
  can actually be made.

---

## 4. The comment that is really a missing test

A large share of review comments have this shape: *what happens when the input is empty /
null / enormous / duplicated / out of order?*

That is not an argument to win. It is a test that does not exist yet.

Write the test before writing the reply, always, in this order:

1. Write the case exactly as the reviewer described it.
2. Run it.
3. **If it fails**, you had the bug. Fix it, and keep the test — the reviewer just handed you
   a case your own imagination did not produce.
4. **If it passes**, reply with the test, not with a claim: "Added `handles empty batch` —
   passes on the current implementation; keeping it so the behaviour stays intentional."

This is cheaper than arguing in both branches, which is the whole point: you do not need to
know in advance which branch you are in. It also converts a transient thread into a permanent
guard, so the same comment cannot be filed again on the next change.

The same conversion applies to "is this N+1?" (measure it, report the query count), "does
this leak?" (run it in a loop, report RSS), and "is this slower?" (benchmark both, report
numbers). Any comment that names an observable becomes a measurement instead of an opinion.

---

## 5. Volume from an automated reviewer

Machine review inverts the usual economics: findings are nearly free to produce and just as
expensive to evaluate as before. Two consequences.

**Triage by failure path first.** Findings that name a concrete input and a mechanism get
read first, regardless of the severity label attached to them. A finding with no failure path
is a guess, and guesses are the bulk of the volume.

**Do not fix to silence the tool.** A change made only to remove a warning, with no mechanism
you understand, adds an unexplained line that the next person cannot safely remove. If you
cannot state why the fix is correct, dispute or defer instead — an unjustified fix is worse
than an open comment, because the comment is visible and the line is not.

Where a tool files the same class of finding repeatedly and it is genuinely not a defect in
this codebase, fix the source: a lint rule, a type, or a documented convention. Otherwise you
will answer it on every change forever.

---

## 6. The response artefact

Reply in one batch, not comment by comment. A batched response lets the reviewer re-read once
with the whole picture; a stream of individual replies makes them re-derive the state of the
review on every notification.

    Addressed in <commit range>.

    Fixed (4)
      cache.ts:88   in-flight promise stored before await — a1b2c3d
      parse.ts:12   empty-batch case + test "handles empty batch" — a1b2c3d
      ...

    Disputed (2)
      api.ts:40     unreachable: ingest filters empty lines at line 31
      util.ts:7     preference rather than defect; keeping the sibling-handler shape

    Deferred (1)
      db.ts:210     real; the index change needs a migration window — #812

    Not addressed (0)

The **Not addressed** line exists so that it cannot silently be non-zero. If it is not zero,
the review is not answered yet, and writing the number is what makes that visible to you
before it becomes visible to the reviewer.

---

## 7. When you are the reviewer of your own change

Self-review before you request one, and run it as a different activity rather than a second
reading. Two mechanisms make self-review weak, and both have specific counters:

- You know what the code *means*, so you read intent instead of behaviour. Counter: read only
  the diff, in the review tool, in the order a stranger would.
- You remember which cases you considered, so absent cases feel handled. Counter: list the
  inputs the change accepts, and point at the line or the test that handles each one.

The findings you produce this way are the cheapest in the whole process: no thread, no
context switch, no second person’s afternoon.
