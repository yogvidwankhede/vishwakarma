# Methodology Feedback

Guidance decays in two directions at once. It fails to cover situations that arrived after it
was written, and it accumulates rules that no longer earn the context they cost. From inside
any single task both look the same — a rule being mildly awkward for a minute — so the decay
is never noticed, only eventually suffered, at the point where nobody can afford to load it.

The loop that prevents this is four steps: capture, checkpoint, triage, retire. Only the first
is hard, and it is hard for one specific reason.

---

## 1. The cause evaporates faster than the complaint

When guidance fails you, two facts are stored: that something was wrong, and **why**. They
decay at very different rates. Three tasks later you still remember that the review rule is
annoying, and you have lost the input that triggered it, the branch of the rule you actually
read, what you did instead, and what it cost. A note written from the surviving half is a
complaint with no cause attached, and **a complaint cannot be adjudicated**: it does not say
whether the rule was wrong, mis-scoped, correctly applied and merely expensive, or misread.

So capture is bounded by the task that produced it, not by the review that consumes it. The
moments worth catching are concrete: an override, a silence where you invented a policy, a
check that passed while the work was wrong. Write one line at that moment. It stays under half
a minute because it **records rather than decides**: which guidance by id, what you were
doing, what you did instead, what it cost, and whether the rule's stated mechanism was
actually operating.

That last field is the one nobody can reconstruct later, which is why it is captured first.

---

## 2. A fixed cadence, and an explicit nothing

Capture that happens when you remember to happens when you are annoyed. Salience does the
selecting, salience tracks irritation rather than importance, and the log fills with loud
small things while missing the systematic ones — the section that is never loaded, the
ordering that costs ten minutes every time and never feels wrong.

Bind the checkpoint to a boundary the work already has: each completed task, each merged
change, every N steps of a long run. Take it whether or not anything comes to mind.

**A checkpoint that finds nothing must still write that down.** An empty log is ambiguous
between "no friction occurred" and "nobody looked", and those support opposite conclusions.
Explicit empties also supply the denominator: 2 observations across 40 checkpoints is a stable
practice, 2 across 3 is a crisis, and the bare count 2 does not distinguish them. A lapsed
practice then shows up as missing checkpoints rather than as a healthy-looking quiet log.

---

## 3. Three signals, three different responses

Sort before proposing. Undifferentiated "feedback" defaults to addition, because adding is the
cheapest available response to any complaint — the mechanism by which a catalog fills with
rules nobody can afford to load.

**Gap.** The guidance was silent and you invented a policy on the spot. Response: a candidate
new rule, or a new skill if the invented policy took more than a sentence. This signal grows
the corpus, so it carries the highest evidence bar.

**Improvement.** The guidance existed and was nearly right: you violated it, an edge case fell
outside its stated scope, the steps were correct in the wrong order, the rationale was
missing. Response: edit in place and keep the id. The id is the join key between the log and
the guidance: renaming it orphans the evidence that justified the change.

**Simplification.** Something should be smaller: a rule nothing has invoked in 20 checkpoints,
two rules that give opposing instructions for one situation, a reference no task has ever
opened, three rules that are one rule said three ways. Response: narrow, merge, or delete.

Simplification is the signal that never arrives unprompted, because nothing hurts when it is
ignored. A loop that cannot remove is not a loop; it is an accumulator.

---

## 4. Wrong, or correctly overridden?

In a log these are the same sentence — *did not follow rule X* — and they demand opposite
edits.

The discriminator is the rule's stated mechanism. Every rule claims a reason it is true. Ask
whether that reason was operating **in this case**. If it was operating and following the rule
still produced the worse outcome, the rule is wrong and its statement has to change. If it was
not operating, the rule was correctly out of scope and the right edit is an **exception**, not
a repeal.

Take the rule that a failure must be reproduced before it is fixed, whose mechanism is that an
unreproduced fix cannot be verified. Override it on a compile error, where the compiler is the
reproduction and the verification — mechanism absent, rule correctly skipped, add the
exception. Override it on an intermittent timeout because reproducing it looked slow, and the
fix silently suppressed a symptom — mechanism fully present, the rule was right and you were
wrong, and editing it would remove a guard exactly where it works.

When a rule has no stated mechanism the question cannot be answered at all, and every future
override of it will be unadjudicable the same way. Fix that before anything else: recover the
mechanism or delete the rule.

---

## 5. Friction is not evidence of error

A correct rule costs you something precisely when it is doing its job, because the thing it is
preventing is the faster wrong action. Felt cost therefore **correlates with load-bearing**,
and triaging on felt cost preferentially deletes the rules that are working while leaving the
inert ones — which cost nothing to follow — untouched.

Classify on outcome, not on effort: was the result worse because you followed it? "This slows
me down" and "this produced the wrong answer" are different findings, and only the second is a
defect in the rule.

---

## 6. Evidence thresholds

One occurrence is an anecdote. A rule asserts that a situation recurs and that one response is
right across its instances; a single instance cannot separate a property of the practice from
a property of that task, that codebase, that afternoon. **Promoting anecdotes is how a catalog
fills with the residue of somebody's bad day**, and the bill is paid by every later load.

Defaults worth holding to:

- **Three independent occurrences across at least two distinct tasks** before an observation
  becomes a new rule, at least one of which you were not already looking for.
- **One occurrence is enough for a factual correction** — a command that does not exist, a
  dead link, a renamed API — because the claim is checkable against the world rather than
  generalised from experience.
- **One occurrence promotes immediately when the cost was irreversible or unbounded**: data
  loss, a leaked credential, a published artifact. Waiting for a third instance costs more in
  expectation than a premature rule does.
- **20 checkpoints without an invocation** makes a rule a deletion candidate, unless it guards
  a rare irreversible event, where a low firing rate is the design rather than a symptom.

---

## 7. An edit is a hypothesis

Record what each change is predicted to prevent, and the checkpoint count by which a
recurrence would falsify it. Without that, the corpus accumulates edits of unknown effect and
version two of a rule inherits version one's credibility untested. A
rule edited twice against the same recurring friction is not being refined — its situation is
misdiagnosed, and the third edit will not work either.

Load `friction-capture` for the entry format and the checkpoint protocol, `observation-triage`
for the procedure that turns entries into specific edits, and `guidance-retirement` for
removing guidance that has stopped earning its place.

## Rules

### MUST NOT — Do not treat the felt cost of following a rule as evidence that the rule is wrong; classify on whether the outcome was worse, not on whether the work was slower.

*Why:* A correct rule imposes cost precisely when it is doing its job, because what it prevents is the faster wrong action. Felt cost therefore correlates with load-bearing, so triaging on felt cost preferentially deletes the rules that are working while leaving the inert ones — which cost nothing to follow — entirely untouched.

*Exceptions:*
- Cost with no bad outcome attached is still evidence about the procedure: where the same cost recurs, propose a cheaper way to satisfy the rule or a proportionality clause, rather than a change to what the rule requires.

### MUST — Write the observation down before the task that produced it ends, not at the next review.

*Why:* The memory that something felt wrong and the memory of why it felt wrong decay at very different rates, so a note written three tasks later preserves the complaint and has lost the cause. A complaint with no cause attached cannot be adjudicated: it does not say whether the rule was wrong, mis-scoped, correctly applied and expensive, or misread.

*Exceptions:*
- A factual correction to guidance — a command that does not exist, a dead link, a renamed API — is cheaper to fix on the spot than to log, and needs no later adjudication.

Incorrect:

```text
Finish four tasks, then at the weekly review write "the testing rules are too strict".
```

Correct:

```text
At the moment of the override: "checkpoint 118, nullable-column migration, reproduce-first, overrode, diffed the schema on a scratch DB instead, cost none, mechanism not operating — no failure exists to reproduce."
```

### MUST — Record the concrete situation, the guidance id, what you did instead, and the observed cost in every entry.

*Why:* Triage is a comparison between what the guidance prescribed and what actually happened, so an entry missing the alternative or the cost gives a later reader nothing to compare. The three options left are guessing, discarding the entry, or reopening the argument with someone who no longer remembers either side.

Incorrect:

```text
The review rule got in the way again.
```

Correct:

```text
design-review/contrast-check, on a disabled-state colour, blocked at 3.9:1; shipped it after confirming the token is the platform default; cost 20 minutes and no change.
```

### MUST — Write an explicit no-observations entry at every checkpoint that produced none.

*Why:* An empty log is ambiguous between "no friction occurred" and "nobody looked", and those support opposite conclusions about whether the guidance is working. The marker also supplies the denominator — 2 observations in 40 checkpoints is a stable practice and 2 in 3 is a crisis — and makes a lapsed practice visible as missing checkpoint numbers rather than as a calm, healthy-looking log.

Incorrect:

```text
Nothing came up, so nothing is written.
```

Correct:

```text
checkpoint 119 — fix stale avatar cache — entries: 0 — consulted: engineering-discipline/diff-traces-to-request.
```

### MUST — Before changing a rule that was not followed, determine whether its stated mechanism was operating in that case.

*Why:* A rule that is wrong and a rule that was correctly overridden produce the same sentence in a log and demand opposite edits. If the mechanism operated and the outcome was still worse, the statement has to change; if the mechanism was absent the rule was merely out of scope, and rewriting its statement removes a working guard everywhere in exchange for a case it never claimed to cover.

Incorrect:

```text
Reproduce-first was overridden twice, so soften it to a "should" and move on.
```

Correct:

```text
Override 1: compile error, no runtime failure exists to reproduce — mechanism absent, add an exception. Override 2: intermittent timeout skipped because reproducing looked slow, fix suppressed a symptom — mechanism present, the rule was right. One exception added, statement unchanged.
```

### MUST — When two rules give opposing instructions for the same situation, narrow one rule’s scope or delete one; do not leave both standing.

*Why:* An agent facing contradictory guidance resolves it by ordering or recency, which is selection at random, and the resolution teaches it that the corpus is advisory — a discount it then applies to every other rule in the set. The damage is therefore not confined to the two rules involved.

Incorrect:

```text
Leave "match local conventions" and "never swallow an exception" both unqualified, and let each situation be decided by whichever was read last.
```

Correct:

```text
Narrow the conventions rule: it governs style and idiom, and stops where the local idiom is unsafe rather than merely different — which is where its mechanism, uniformity aiding the reader, stops paying.
```

### SHOULD — Run the review at a boundary the work already has — each completed task, each merged change, or every 10 steps of a long run — rather than when it occurs to you.

*Why:* Recall-triggered review is triggered by salience, and salience tracks irritation rather than importance. The result is a log full of loud small things that misses the systematic ones: the section that is never loaded, the ordering that costs ten minutes every time and never feels wrong enough to remember.

### SHOULD — Classify each observation as a gap, an improvement, or a simplification before proposing any change to the guidance.

*Why:* The three demand different actions and carry different evidence thresholds: a gap grows the corpus, an improvement edits an existing rule in place, a simplification removes. Undifferentiated feedback defaults to addition because adding is the cheapest response to any complaint, and that default is the mechanism by which a catalog fills with rules nobody can afford to load.

### SHOULD — Do not decide or apply a change to the guidance during the task that produced the observation.

*Why:* Judgment formed at the moment of friction is formed while annoyed, and it is formed against a sample of one — the worst possible basis for a change that will apply to every future case. Editing guidance mid-task is also an unrequested scope change inside a diff that was opened for something else.

*Exceptions:*
- Factual corrections — a wrong command, a dead link, an API renamed two versions ago — are checkable against the world rather than generalised from experience, so the evidence threshold is one and the cheapest moment is now.

### SHOULD — Require three independent occurrences across at least two distinct tasks, one of them unsought, before an observation becomes a new rule.

*Why:* A rule asserts that a situation recurs and that one response is right across its instances; a single instance cannot separate a property of the practice from a property of that task, that codebase, that afternoon. The unsought instance guards the other failure: once a candidate exists you start noticing cases of it, and noticing is not sampling.

*Exceptions:*
- A single occurrence whose cost was irreversible or unbounded — data loss, a leaked credential, a published artifact — promotes immediately, because waiting for a third instance costs more in expectation than a premature rule.
- Factual corrections, which are verified against the world rather than generalised from experience.

### SHOULD — When a rule that was overridden states no mechanism, supply the mechanism or delete the rule before considering any other change to it.

*Why:* Without a stated mechanism there is no test for whether the rule applied, so this override and every future one is unadjudicable and the log cannot accumulate usable evidence about it. A rule that can only be obeyed or ignored carries no information in either direction.

### SHOULD — When proposing an addition to a tier that is at or near its token budget, name the rule or section it displaces.

*Why:* Guidance is loaded as a unit on a fixed budget, so an addition to a full tier is a trade whether or not anyone states it. Left unstated, additions are judged against zero rather than against the weakest rule currently loaded, and the corpus grows until an agent declines to load it at all — at which point every rule in it has an effect of zero.

*Exceptions:*
- A tier well under budget: the context the addition costs is not scarce, so no removal recovers anything and demanding one is ceremony.

### SHOULD — Propose removal of any rule neither invoked nor violated across 20 consecutive checkpoints, using the consulted list rather than the friction entries to decide.

*Why:* A rule that never fires has no observable effect and full token cost, and it is paid for on every load by every rule that does work. The consulted list is what distinguishes it from a rule followed silently every time, which produces no entries either and is the most valuable kind there is.

*Exceptions:*
- Rules guarding rare irreversible events — destructive migrations, credential handling, publishing, deletion of user data — are designed to fire almost never and are judged by whether the event class still exists in the system, not by frequency.
- Dormant seasonal guidance for migrations, launches or incidents, which should move to on-demand activation rather than being deleted.

### SHOULD — Record what each guidance change is predicted to prevent and the checkpoint count by which a recurrence would show it did not work.

*Why:* An edit is a hypothesis, and without a prediction there is no observation that could falsify it, so the corpus accumulates changes of unknown effect while version two of a rule inherits the credibility of version one untested. The prediction also detects the specific failure worth catching: friction that recurs after two edits means the situation is misdiagnosed, not that the wording needs a third pass.

Incorrect:

```text
Reworded the rule; it should be clearer now.
```

Correct:

```text
Added the schema-change exception; predicts zero further override entries against this rule for migrations, checked at checkpoint 140. A recurrence means the scope boundary is in the wrong place.
```

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the observations were captured while their cause was recoverable, and that each proposed change matches the signal and the evidence behind it. (blocking)

- Was every observation in this batch written during the task that produced it, naming the concrete situation, the guidance id, what you did instead, and the observed cost — rather than reconstructed later from memory?
- Does every checkpoint since the last review have an entry, including an explicit no-observations entry for the ones that found nothing, and a consulted list for the guidance that was opened without friction?
- Is each observation classified as a gap, an improvement, or a simplification, and does the proposed action match its class rather than defaulting to an addition?
- For every rule you propose to rewrite because it was not followed, did you determine whether its stated mechanism was operating in that case, and add an exception instead of changing the statement where it was not?
- Where a rule you are changing states no mechanism at all, did you supply one before touching anything else about it?
- Does every candidate new rule have three independent occurrences across at least two distinct tasks, or a named reason for bypassing the threshold — an irreversible cost, or a factual correction?
- For anything you are proposing to weaken or remove on grounds of friction, can you state how an outcome was worse rather than only how the work was slower?
- Did this pass produce at least one narrowing, merge, or deletion — or can you name why nothing in the corpus is contradictory, redundant, or never invoked?
- Does each proposed change record what it is predicted to prevent and the checkpoint count at which a recurrence would show it did not work?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/friction-capture.md` — Something in the guidance just went wrong and I want to record it in a way that is still actionable a week from now — what exactly do I write, and on what cadence do I write it?
- `references/observation-triage.md` — I have a batch of captured observations — how do I decide which become new rules, which change an existing rule, which delete something, and which are anecdotes I should ignore?
- `references/guidance-retirement.md` — The guidance has grown and I suspect parts of it are dead, duplicated, or contradictory — how do I find those parts, and how do I remove them without losing something that mattered?
