// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * A body of working guidance decays in two directions at once, and neither one is visible
 * from inside the task where it happens.
 *
 * It fails forward: situations arrive that nobody had when the rules were written, and the
 * agent invents a policy on the spot, correctly, and then forgets it. It fails backward:
 * rules accumulate that no longer apply, contradict each other, or never fire, and each one
 * charges its tokens against every future load until the whole skill becomes too expensive
 * to open. From inside a single task both look identical — a rule being mildly awkward for
 * a minute — which is exactly why the correction has to be mechanical rather than felt.
 *
 * The mechanism this skill is built around is a decay asymmetry. When guidance fails you,
 * two things are stored: that something was wrong, and why. The second decays far faster
 * than the first, so a note written three tasks later reliably preserves the complaint and
 * has lost the cause. A complaint without a cause cannot be adjudicated — nobody can tell
 * afterwards whether the rule was wrong, mis-scoped, correctly applied and merely expensive,
 * or simply misread — and those demand different, sometimes opposite, repairs.
 *
 * So: capture bounded by the task rather than by the review, a checkpoint cadence that
 * writes down its own emptiness, triage into three signals with three different responses,
 * and deletion treated as an outcome rather than as a failure to have been right the first
 * time.
 */
export const methodologyFeedback: SkillManifest = {
  vsm: '1.0',
  id: 'methodology-feedback',
  name: 'Methodology Feedback',
  description:
    'Use when a rule felt wrong mid-task, at a review checkpoint, or when turning accumulated friction into rule edits, additions, and deletions.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'workflow',
  tags: ['feedback', 'retrospective', 'guidance', 'evidence', 'pruning', 'checkpoints', 'process'],

  activation: {
    intents: [
      'a rule was overridden during a task and the reason for overriding it is still fresh',
      'the user says one of the rules keeps getting in the way',
      'the guidance said nothing about a situation that just came up and a policy had to be invented',
      'a task has just finished and it is time to record what the guidance got wrong',
      'the user wants to turn a pile of notes and complaints into concrete rule changes',
      'the user says the instruction set has grown too large to load or too long to read',
      'two rules appear to give opposite instructions for the same situation',
      'the user asks whether a rule should be deleted because nothing ever seems to use it',
      'a new rule is being proposed on the strength of one bad experience',
      'the user asks for a review cadence for their agent instructions',
      'the same mistake has now been made more than once even though a rule covers it',
      'the user asks how to tell whether a change to the guidance actually worked',
    ],
    globs: [
      '**/AGENTS.md',
      '**/CLAUDE.md',
      '**/.cursor/rules/**',
      '**/.windsurfrules',
      '**/skills/**/SKILL.md',
      '**/catalog/*.ts',
      '**/*.mdc',
    ],
    keywords: [
      'retrospective',
      'friction log',
      'checkpoint',
      'override',
      'this rule is wrong',
      'prune rules',
      'too many rules',
      'deprecate',
      'evidence threshold',
      'feedback loop',
      'improve the instructions',
      'rule never fires',
    ],
  },

  content: {
    summary:
      'Keep working guidance alive under use: capture friction while its cause is still recoverable, checkpoint on a fixed cadence with an explicit nothing-to-report, sort observations into gap, refinement and reduction, and delete as readily as you add.',

    body: `# Methodology Feedback

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

Load \`friction-capture\` for the entry format and the checkpoint protocol, \`observation-triage\`
for the procedure that turns entries into specific edits, and \`guidance-retirement\` for
removing guidance that has stopped earning its place.`,

    references: [
      {
        id: 'friction-capture',
        title: 'Capture: what to write down, when, and at what cost',
        answers:
          'Something in the guidance just went wrong and I want to record it in a way that is still actionable a week from now — what exactly do I write, and on what cadence do I write it?',
        content: `# Friction capture and the checkpoint

Capture is the cheap half of the loop and the half that determines whether the expensive half
has anything to work with. Its whole design goal is to survive a week: an entry is usable when
a reader who was not there can tell what happened, which guidance was involved, and what it
cost, without asking you.

---

## 1. What counts as a moment of friction

Do not rely on a feeling. These are the concrete events, and each one is recognisable while it
is happening:

- **Override.** You knew a rule applied and did something else.
- **Reread.** You had to read a rule twice to work out which branch applied to you.
- **Silence.** You needed a policy, the guidance had none, and you invented one.
- **Inversion.** The prescribed sequence was wrong for this case and you reordered it.
- **False pass.** A check passed and the work was still wrong.
- **False block.** A check failed and the work was fine.
- **Collision.** Two pieces of guidance pointed in different directions.
- **Cost.** Following the rule cost materially more than the outcome it produced was worth.

An event on this list is worth an entry even when you believe the guidance was right. The
purpose of the log is not to collect grievances; it is to record where guidance made contact
with reality, including the times it held.

---

## 2. The entry

Eight fields. Six of them are copied from what is in front of you and take seconds.

| Field | What goes in it | Why it is here |
| --- | --- | --- |
| \`stamp\` | Date and checkpoint number | Orders entries and ties them to a denominator |
| \`context\` | The task, and the specific thing in hand: file, request, endpoint | Lets a later reader reconstruct whether your case resembles theirs |
| \`guidance\` | Rule or section id, or \`none\` for a silence | The join key; \`none\` is what makes gaps countable |
| \`event\` | One word from the list above | Makes the log sortable without rereading prose |
| \`instead\` | What you actually did | The counterfactual; a complaint without this is unadjudicable |
| \`cost\` | Observed, in units: minutes, a rebuild, a wrong output shipped, or \`none\` | Separates expensive from merely irritating |
| \`held\` | \`yes\`, \`no\`, or \`unstated\`: was the rule's stated mechanism operating here? | The field that decays fastest, so it is captured first |
| \`class\` | Left empty | Filled at triage, not now |

The \`held\` field is the load-bearing one. It is the difference between a rule that is wrong
and a rule that was correctly out of scope, and it is answerable in two seconds while you are
still looking at the case. Answering it a week later is guesswork, and guesswork here produces
the single most damaging edit available: rewriting a rule that was working.

\`unstated\` is a legitimate answer and an important one. It means the rule gave no mechanism,
so the question cannot be asked. That is itself a defect, and it is the first thing to fix
about that rule.

---

## 3. Two entries, one useless

**Useless, written three tasks later:**

> The testing rule is too strict and slows everything down.

Nothing here can be acted on. Which rule, on what kind of change, what did it force, what did
it cost, and did the reason behind it apply? A triage pass facing this entry has three
options, all bad: guess, discard it, or reopen the argument with someone who no longer
remembers either.

**Usable, written in the minute it happened:**

> \`stamp\` 2026-03-04, checkpoint 118. \`context\` adding a nullable column to the settings
> table, migration only, no code path reads it yet. \`guidance\` engineering-discipline/reproduce-first.
> \`event\` override. \`instead\` applied the migration on a scratch database and diffed the
> schema. \`cost\` none; reproducing a failure that does not exist yet is undefined.
> \`held\` no — the mechanism is that an unreproduced fix cannot be verified, and there is no
> failure here to reproduce. \`class\` empty.

That entry triages itself. It carries a candidate scope boundary (this rule addresses reported
failures, not schema changes made ahead of any consumer) and the evidence for it.

---

## 4. The checkpoint

Pick one boundary and hold it:

- **Per task.** The default. Ties the review to a context switch that already happens.
- **Every N steps** of a long unsupervised run, N around 10. Long runs are where the guidance
  is exercised hardest and where recall is worst by the end.
- **Per merged change.** Suits work where tasks are long and changes are the natural unit.

At a checkpoint, do three things, in under two minutes:

1. Append any entries the task produced and you have not yet written.
2. Record the **consulted list** — the guidance ids you actually opened during the task, with
   no friction attached. This is the denominator for retirement: without it you cannot
   distinguish a rule that never fires from a rule that fires silently every time and is
   therefore doing its job perfectly.
3. If the task produced nothing, write the empty marker.

## 5. The empty marker

\`checkpoint 119 — task: fix stale avatar cache — entries: 0 — consulted: code-quality/*, engineering-discipline/diff-traces-to-request\`

One line. It is not bookkeeping ceremony; it carries three pieces of information that are
unavailable without it.

- **Disambiguation.** An absent entry means either no friction or no attention, and those
  argue in opposite directions about whether the guidance is working.
- **Rate.** Observations per checkpoint is the only number that says whether friction is rising
  or falling. Raw counts rise with activity and tell you nothing.
- **Lapse detection.** When the practice quietly stops, the log looks calm and healthy. Missing
  checkpoint numbers are the only visible symptom.

---

## 6. Cost discipline

Capture competes with the task it interrupts, and a capture step that costs more than it is
worth gets dropped within a fortnight. Three constraints keep it cheap:

- **Append only.** Never revise an earlier entry during a task. Revision invites rereading,
  rereading invites arguing, and arguing is triage happening at the worst possible time.
- **Record, do not decide.** No proposal, no diagnosis, no rewrite of the offending rule in the
  same breath. Judgment formed at the moment of friction is formed while annoyed, and editing
  guidance mid-task is an unrequested scope change measured against exactly one case.
- **One file per project, not per skill.** Contradictions live *between* skills, and a log
  split by skill hides precisely the collisions worth finding. One append-only file also means
  the triage pass has one thing to read.

The exception to "record, do not decide" is the factual correction: a command that does not
exist, a dead link, an API renamed two versions ago. Those are checkable against the world
rather than generalised from experience, so the evidence threshold is one, and the cheapest
moment to fix them is while you are looking at them. Fix, note the fix, continue.`,
      },
      {
        id: 'observation-triage',
        title: 'Triage: turning entries into new rules, edits, and removals',
        answers:
          'I have a batch of captured observations — how do I decide which become new rules, which change an existing rule, which delete something, and which are anecdotes I should ignore?',
        content: `# Observation triage

Triage is a batched pass over the log, run on its own schedule — every 20 to 40 checkpoints,
or when a candidate crosses its evidence threshold. It is deliberately separated from capture,
because a decision taken at the moment of friction is taken by someone who is annoyed, and
because a single case is the worst possible sample for a change that will apply to all future
cases.

---

## 1. The procedure

For each entry, in order. Stop at the first step that resolves it.

1. **Is it a factual correction?** A wrong command, a dead link, a renamed API, a stale
   version number. Fix it now, no threshold, no ceremony. The claim is checkable against the
   world.
2. **Is the guidance field \`none\`?** Then it is a **gap**. Move to the candidate ledger and
   apply the new-rule threshold.
3. **Is \`held\` = \`unstated\`?** The rule gave no mechanism. The only correct first edit is to
   supply one — or to delete the rule if no mechanism can be recovered. Do not touch the
   statement until the mechanism exists, because without it you cannot tell whether any
   override was legitimate, including this one.
4. **Is \`held\` = \`no\`?** The rule's mechanism was not operating. It was correctly out of
   scope. The edit is an **exception clause naming the condition**, never a change to the
   statement. Changing the statement here weakens the rule everywhere it works in exchange for
   a case it never claimed.
5. **Is \`held\` = \`yes\` and the outcome was worse?** The rule is **wrong** in that situation.
   Its statement, its threshold or its mechanism has to change. This is the only path that
   licenses rewriting a statement.
6. **Is \`held\` = \`yes\` and the outcome was fine, only slower?** The rule worked. Cost is not
   a defect — a correct rule costs exactly when it prevents the faster wrong action. Log the
   cost against the rule and move on; if the same cost recurs with no bad outcome attached, the
   candidate is a cheaper *procedure* for satisfying the rule, not a change to the rule.
7. **Does it collide with another rule?** A **simplification**: resolve by narrowing one scope
   or deleting one rule, and never by leaving both.
8. **Anything else** — a rule invoked and found redundant, a reference nobody opened, three
   rules saying one thing — is a **simplification** as well.

---

## 2. The mechanism test, at length

Steps 3 to 6 all turn on one question: was the rule's stated reason operating in this case?
Two entries that read identically in the log:

**Entry A.** Rule: do not introduce an extension point until a second real caller exists.
Mechanism: with one instance in hand, nothing distinguishes the essential from the incidental,
so the abstraction encodes that example's accidents. Override: built a strategy interface for
one payment provider because a second was named in a signed contract with its API published.
\`held\` = no. The second caller's requirements were visible, which is what the mechanism was
asking for. Correct edit: an exception for a second caller whose requirements are documented
even though the code does not exist yet.

**Entry B.** Same rule. Override: built a strategy interface for one payment provider because
a second one seemed likely. The second arrived, varied along a different axis, and the seam
was moved at a cost of two days. \`held\` = yes, and the outcome was worse. The mechanism
operated exactly as stated. No edit at all — this entry is evidence *for* the rule, and it
belongs in the rule's examples rather than in its exceptions.

Identical shape in the log. Opposite responses. The field that separates them is the
\`held\` entry, recorded at the moment the difference was still obvious.

---

## 3. The candidate ledger and its thresholds

Gaps do not become rules one at a time. Each candidate accumulates occurrences, and the
threshold is on the candidate, not the entry.

| Candidate kind | Threshold | Why |
| --- | --- | --- |
| New rule from a gap | 3 occurrences across 2+ distinct tasks, at least one unsought | Two occurrences in one task can both be properties of that task; an unsought instance is the only guard against confirmation |
| Factual correction | 1 | Checkable against the world, not generalised from experience |
| Irreversible or unbounded cost | 1 | Data loss, leaked credential, published artifact: waiting for a third instance costs more in expectation than a wrong rule |
| Exception to an existing rule | 2 occurrences, or 1 with a stated mechanism for why the rule's reason cannot apply | An exception narrows rather than adds, so the cost of being wrong is bounded by the rule's own scope |
| Removal | 20 checkpoints with no invocation, or a demonstrated contradiction | See \`guidance-retirement\` |

"At least one unsought" is the cheapest defence against a manufactured pattern. Once a
candidate exists you start noticing instances of it, and noticing is not sampling.

Note who observed it, too. An observation sourced from a user complaint, a production
incident, or a failed review carries weight an agent's own sense of inconvenience does not —
not because self-reports are dishonest, but because the agent is the party that pays the cost
of the rule and receives none of the benefit it prevents.

---

## 4. Six entries, triaged

1. *Rule silent on how to handle a partially applied migration; invented a rollback policy.*
   Gap. Ledger: occurrence 1 of 1. **No rule yet.**
2. *Same, third occurrence, second distinct task, this one unsought.* Gap, threshold met.
   **Write the rule**, with the mechanism from the three cases, not from the first.
3. *Overrode reproduce-first on a compile error;* \`held\` = no. **Exception**: the rule
   addresses reported runtime failures; a deterministic compiler diagnostic is its own
   reproduction.
4. *Followed the baseline rule; measuring took 25 minutes on a copy change; outcome fine.*
   \`held\` = yes, outcome not worse. **No change to the rule.** Candidate for a cheaper
   procedure: a proportionality clause, if the same cost recurs.
5. *Two rules: one says match local conventions, one says never use a bare except clause; a
   file is full of bare except clauses.* Collision. **Narrow the conventions rule** with a
   scope boundary for idioms that are unsafe rather than merely different.
6. *Rule about animation easing not opened in 34 consecutive checkpoints; consulted list
   confirms it.* Simplification. **Propose removal**, unless it guards a rare irreversible
   event.

---

## 5. Writing the outcome

**A new rule** needs the mechanism written from the occurrences rather than from the first
one, a strength that reflects the real cost of ignoring it, and the exceptions you already
know — a rule shipped with no exceptions reads as either unconsidered or dishonest, and the
agent will find the exception anyway.

**A refinement** edits in place and keeps the id. The id joins the log to the guidance:
rename it and the three occurrences that justified the edit no longer point at anything,
so the next author sees an unsupported rule and the count starts again at zero. Create a new
id only when the situation the rule governs has actually changed, which is rare; almost every
refinement is the same rule, stated better.

**A simplification** names what is removed and what is left, and says which entries it was
predicted to stop producing.

**Every outcome carries a prediction**: what this change should prevent, and the checkpoint
count by which a recurrence would show it did not work. An edit without a prediction is a
change of unknown effect, and a corpus of those is indistinguishable from a corpus of
superstitions. When the same friction recurs after two edits, the diagnosis is wrong — stop
editing the rule and re-examine which situation it is actually about.`,
      },
      {
        id: 'guidance-retirement',
        title: 'Retirement: finding and removing guidance that no longer earns its place',
        answers:
          'The guidance has grown and I suspect parts of it are dead, duplicated, or contradictory — how do I find those parts, and how do I remove them without losing something that mattered?',
        content: `# Guidance retirement

Removal is the step that never happens on its own. Nothing hurts when guidance is left in
place: a stale rule produces no error, a duplicated one produces no conflict, an unloaded
reference produces no complaint. Every other step in the loop has a forcing function and this
one does not, so it needs a schedule and a budget rather than good intentions.

The cost it prevents is not aesthetic. Guidance is loaded as a unit, on a budget — roughly
2,200 tokens for a skill body and 6,000 for one reference in this catalog. Dead rules are paid
for on every load by every live rule, and past a threshold the response is not a careful
trimming, it is an agent quietly declining to load the skill at all. **Guidance that only ever
grows converges on having no effect.**

---

## 1. Three removal signals

**Never invoked.** The rule has neither fired nor been violated across 20 consecutive
checkpoints. Detecting this requires the consulted list from each checkpoint, not the
friction entries — a rule that is followed silently every single time produces no entries at
all, and it is the most valuable rule you have. Without the consulted list the two are
indistinguishable, and you will delete the wrong one.

**Contradictory.** Two rules give opposing instructions for one situation. This is worse than
either rule being wrong: an agent facing a contradiction resolves it by ordering or recency,
which is selection at random, and it learns that the corpus is advisory — a discount it then
applies to every other rule in the set. Contradictions therefore outrank every other removal
candidate.

**Redundant or unreachable.** Three rules that are one rule stated three ways; a reference no
task has opened since it was written; a section whose content is now covered by a rule
elsewhere. Each costs its full budget and returns nothing that survives the overlap.

---

## 2. Detecting them without a ceremony

- **A pairwise scan of rules sharing a scope.** Group by the situation they govern, not by
  the skill they live in — collisions are usually cross-skill, which is why the friction log
  is kept as one file.
- **Invocation counts from the consulted lists.** A rule at zero after 20 checkpoints is a
  candidate; a rule at zero after 60 is a decision.
- **Load counts for references.** A reference never opened is either answering a question
  nobody has or announcing itself badly in its \`answers\` field. Check the second before
  concluding the first, since a mis-announced reference looks exactly like a dead one.
- **Length against effect.** A rule whose statement takes four lines and whose violations have
  never been observed is paying a premium for coverage that has never been exercised.

---

## 3. Narrow, merge, or delete

Removal has three strengths and the weakest sufficient one is correct.

**Narrow** when the rule is right inside a smaller scope than it claims. This is the response
to most collisions: one rule takes a scope boundary, both survive, and the boundary is where
one rule's mechanism stops operating. Narrowing is reversible and loses nothing.

**Merge** when two rules share a mechanism and differ only in the surface they describe. The
merged rule keeps the id with the longer evidence history and inherits the exceptions of both;
dropping an exception during a merge is the common way a merge quietly becomes a behaviour
change.

**Delete** when the rule has no mechanism that can be recovered, when its situation no longer
exists — the framework was replaced, the API is gone, the constraint was lifted — or when it
has never been invoked and does not guard a rare irreversible event.

---

## 4. The exception that matters

A low firing rate is not always decay. Rules that guard **rare irreversible events** —
destructive migrations, credential handling, publishing, deletion of user data — are designed
to fire almost never, and their value is concentrated entirely in the instance they prevent.
Measuring those by frequency deletes exactly the guards whose absence is unrecoverable.

Judge them by a different question: does the event class still exist in this system? If the
system can still take the irreversible action, the rule stays, however quiet it is. If the
capability is gone, the rule goes with it.

The same logic covers seasonal guidance — rules that apply during a migration, a launch, or an
incident. Those are not dead between events; they are dormant, and the correct treatment is
on-demand activation rather than deletion.

---

## 5. Budget as the forcing function

Tie additions to removals at the point where the budget is actually binding. When a tier is at
or near its budget, a proposed addition names what it displaces, and the comparison is made
directly: is this new rule worth more than the weakest rule currently loaded? That comparison
is the one nobody makes otherwise, because additions are judged against zero — against nothing
at all — rather than against the marginal rule they push out.

When the tier is well under budget, no displacement is required and demanding one is pure
ceremony: the addition costs context that is not scarce, so the trade does not exist.

Two habits keep the budget honest. Move depth into references rather than deleting it, because
an over-long body is usually layered wrong rather than too big. And re-read the summary and
description after any change: those are charged on every single turn, and they drift toward
describing contents rather than triggers, at which point the skill stops being selected and
the rest of the budget question becomes moot.

---

## 6. Removing safely

- **Record the prediction.** State what removing this should change: no entries of this class
  for 20 checkpoints, no regression in the failure the rule guarded against. Removal is a
  hypothesis on the same terms as an edit.
- **Watch the specific signal.** A restored rule after a real recurrence is a good outcome and
  cheap. What is expensive is a removal nobody is watching, because the regression it causes
  is attributed to something else entirely.
- **Keep the reason, not the rule.** A deleted rule leaves one line in the change record
  saying what it said and why it went. Without that, the same observation arrives in eighteen
  months, passes the evidence threshold on its own merits, and the rule is written again — and
  the second author has no way to learn that it was already tried and did not hold.

A corpus that removes nothing is not conservative. It is one that has stopped distinguishing
between the rules that work and the rules that merely remain.`,
      },
    ],
  },

  rules: [
    {
      id: 'feedback/capture-at-friction',
      strength: 'must',
      statement:
        'Write the observation down before the task that produced it ends, not at the next review.',
      evidence: {
        rationale:
          'The memory that something felt wrong and the memory of why it felt wrong decay at very different rates, so a note written three tasks later preserves the complaint and has lost the cause. A complaint with no cause attached cannot be adjudicated: it does not say whether the rule was wrong, mis-scoped, correctly applied and expensive, or misread.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Finish four tasks, then at the weekly review write "the testing rules are too strict".',
        good: 'At the moment of the override: "checkpoint 118, nullable-column migration, reproduce-first, overrode, diffed the schema on a scratch DB instead, cost none, mechanism not operating — no failure exists to reproduce."',
      },
      exceptions: [
        'A factual correction to guidance — a command that does not exist, a dead link, a renamed API — is cheaper to fix on the spot than to log, and needs no later adjudication.',
      ],
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/entry-names-the-counterfactual',
      strength: 'must',
      statement:
        'Record the concrete situation, the guidance id, what you did instead, and the observed cost in every entry.',
      evidence: {
        rationale:
          'Triage is a comparison between what the guidance prescribed and what actually happened, so an entry missing the alternative or the cost gives a later reader nothing to compare. The three options left are guessing, discarding the entry, or reopening the argument with someone who no longer remembers either side.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'The review rule got in the way again.',
        good: 'design-review/contrast-check, on a disabled-state colour, blocked at 3.9:1; shipped it after confirming the token is the platform default; cost 20 minutes and no change.',
      },
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/checkpoint-on-a-fixed-cadence',
      strength: 'should',
      statement:
        'Run the review at a boundary the work already has — each completed task, each merged change, or every 10 steps of a long run — rather than when it occurs to you.',
      evidence: {
        rationale:
          'Recall-triggered review is triggered by salience, and salience tracks irritation rather than importance. The result is a log full of loud small things that misses the systematic ones: the section that is never loaded, the ordering that costs ten minutes every time and never feels wrong enough to remember.',
        confidence: 'strong',
      },
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/mark-empty-checkpoints',
      strength: 'must',
      statement: 'Write an explicit no-observations entry at every checkpoint that produced none.',
      evidence: {
        rationale:
          'An empty log is ambiguous between "no friction occurred" and "nobody looked", and those support opposite conclusions about whether the guidance is working. The marker also supplies the denominator — 2 observations in 40 checkpoints is a stable practice and 2 in 3 is a crisis — and makes a lapsed practice visible as missing checkpoint numbers rather than as a calm, healthy-looking log.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Nothing came up, so nothing is written.',
        good: 'checkpoint 119 — fix stale avatar cache — entries: 0 — consulted: engineering-discipline/diff-traces-to-request.',
      },
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/classify-before-proposing',
      strength: 'should',
      statement:
        'Classify each observation as a gap, an improvement, or a simplification before proposing any change to the guidance.',
      evidence: {
        rationale:
          'The three demand different actions and carry different evidence thresholds: a gap grows the corpus, an improvement edits an existing rule in place, a simplification removes. Undifferentiated feedback defaults to addition because adding is the cheapest response to any complaint, and that default is the mechanism by which a catalog fills with rules nobody can afford to load.',
        confidence: 'strong',
      },
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/defer-the-decision',
      strength: 'should',
      statement:
        'Do not decide or apply a change to the guidance during the task that produced the observation.',
      evidence: {
        rationale:
          'Judgment formed at the moment of friction is formed while annoyed, and it is formed against a sample of one — the worst possible basis for a change that will apply to every future case. Editing guidance mid-task is also an unrequested scope change inside a diff that was opened for something else.',
        confidence: 'strong',
      },
      exceptions: [
        'Factual corrections — a wrong command, a dead link, an API renamed two versions ago — are checkable against the world rather than generalised from experience, so the evidence threshold is one and the cheapest moment is now.',
      ],
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/threshold-before-new-rule',
      strength: 'should',
      statement:
        'Require three independent occurrences across at least two distinct tasks, one of them unsought, before an observation becomes a new rule.',
      evidence: {
        rationale:
          'A rule asserts that a situation recurs and that one response is right across its instances; a single instance cannot separate a property of the practice from a property of that task, that codebase, that afternoon. The unsought instance guards the other failure: once a candidate exists you start noticing cases of it, and noticing is not sampling.',
        confidence: 'strong',
      },
      exceptions: [
        'A single occurrence whose cost was irreversible or unbounded — data loss, a leaked credential, a published artifact — promotes immediately, because waiting for a third instance costs more in expectation than a premature rule.',
        'Factual corrections, which are verified against the world rather than generalised from experience.',
      ],
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/test-mechanism-before-editing',
      strength: 'must',
      statement:
        'Before changing a rule that was not followed, determine whether its stated mechanism was operating in that case.',
      evidence: {
        rationale:
          'A rule that is wrong and a rule that was correctly overridden produce the same sentence in a log and demand opposite edits. If the mechanism operated and the outcome was still worse, the statement has to change; if the mechanism was absent the rule was merely out of scope, and rewriting its statement removes a working guard everywhere in exchange for a case it never claimed to cover.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Reproduce-first was overridden twice, so soften it to a "should" and move on.',
        good: 'Override 1: compile error, no runtime failure exists to reproduce — mechanism absent, add an exception. Override 2: intermittent timeout skipped because reproducing looked slow, fix suppressed a symptom — mechanism present, the rule was right. One exception added, statement unchanged.',
      },
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/fix-missing-rationale-first',
      strength: 'should',
      statement:
        'When a rule that was overridden states no mechanism, supply the mechanism or delete the rule before considering any other change to it.',
      evidence: {
        rationale:
          'Without a stated mechanism there is no test for whether the rule applied, so this override and every future one is unadjudicable and the log cannot accumulate usable evidence about it. A rule that can only be obeyed or ignored carries no information in either direction.',
        confidence: 'strong',
      },
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/friction-is-not-a-defect',
      strength: 'must-not',
      statement:
        'Do not treat the felt cost of following a rule as evidence that the rule is wrong; classify on whether the outcome was worse, not on whether the work was slower.',
      evidence: {
        rationale:
          'A correct rule imposes cost precisely when it is doing its job, because what it prevents is the faster wrong action. Felt cost therefore correlates with load-bearing, so triaging on felt cost preferentially deletes the rules that are working while leaving the inert ones — which cost nothing to follow — entirely untouched.',
        confidence: 'strong',
      },
      exceptions: [
        'Cost with no bad outcome attached is still evidence about the procedure: where the same cost recurs, propose a cheaper way to satisfy the rule or a proportionality clause, rather than a change to what the rule requires.',
      ],
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/resolve-contradictions-by-scope',
      strength: 'must',
      statement:
        'When two rules give opposing instructions for the same situation, narrow one rule’s scope or delete one; do not leave both standing.',
      evidence: {
        rationale:
          'An agent facing contradictory guidance resolves it by ordering or recency, which is selection at random, and the resolution teaches it that the corpus is advisory — a discount it then applies to every other rule in the set. The damage is therefore not confined to the two rules involved.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Leave "match local conventions" and "never swallow an exception" both unqualified, and let each situation be decided by whichever was read last.',
        good: 'Narrow the conventions rule: it governs style and idiom, and stops where the local idiom is unsafe rather than merely different — which is where its mechanism, uniformity aiding the reader, stops paying.',
      },
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/name-the-displacement',
      strength: 'should',
      statement:
        'When proposing an addition to a tier that is at or near its token budget, name the rule or section it displaces.',
      evidence: {
        rationale:
          'Guidance is loaded as a unit on a fixed budget, so an addition to a full tier is a trade whether or not anyone states it. Left unstated, additions are judged against zero rather than against the weakest rule currently loaded, and the corpus grows until an agent declines to load it at all — at which point every rule in it has an effect of zero.',
        confidence: 'strong',
      },
      exceptions: [
        'A tier well under budget: the context the addition costs is not scarce, so no removal recovers anything and demanding one is ceremony.',
      ],
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/retire-rules-that-never-fire',
      strength: 'should',
      statement:
        'Propose removal of any rule neither invoked nor violated across 20 consecutive checkpoints, using the consulted list rather than the friction entries to decide.',
      evidence: {
        rationale:
          'A rule that never fires has no observable effect and full token cost, and it is paid for on every load by every rule that does work. The consulted list is what distinguishes it from a rule followed silently every time, which produces no entries either and is the most valuable kind there is.',
        confidence: 'strong',
      },
      exceptions: [
        'Rules guarding rare irreversible events — destructive migrations, credential handling, publishing, deletion of user data — are designed to fire almost never and are judged by whether the event class still exists in the system, not by frequency.',
        'Dormant seasonal guidance for migrations, launches or incidents, which should move to on-demand activation rather than being deleted.',
      ],
      verifiedBy: 'feedback-loop-integrity',
    },
    {
      id: 'feedback/record-the-prediction',
      strength: 'should',
      statement:
        'Record what each guidance change is predicted to prevent and the checkpoint count by which a recurrence would show it did not work.',
      evidence: {
        rationale:
          'An edit is a hypothesis, and without a prediction there is no observation that could falsify it, so the corpus accumulates changes of unknown effect while version two of a rule inherits the credibility of version one untested. The prediction also detects the specific failure worth catching: friction that recurs after two edits means the situation is misdiagnosed, not that the wording needs a third pass.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'Reworded the rule; it should be clearer now.',
        good: 'Added the schema-change exception; predicts zero further override entries against this rule for migrations, checked at checkpoint 140. A recurrence means the scope boundary is in the wrong place.',
      },
      verifiedBy: 'feedback-loop-integrity',
    },
  ],

  verification: [
    {
      id: 'feedback-loop-integrity',
      kind: 'self-review',
      description:
        'Confirm the observations were captured while their cause was recoverable, and that each proposed change matches the signal and the evidence behind it.',
      blocking: true,
      questions: [
        'Was every observation in this batch written during the task that produced it, naming the concrete situation, the guidance id, what you did instead, and the observed cost — rather than reconstructed later from memory?',
        'Does every checkpoint since the last review have an entry, including an explicit no-observations entry for the ones that found nothing, and a consulted list for the guidance that was opened without friction?',
        'Is each observation classified as a gap, an improvement, or a simplification, and does the proposed action match its class rather than defaulting to an addition?',
        'For every rule you propose to rewrite because it was not followed, did you determine whether its stated mechanism was operating in that case, and add an exception instead of changing the statement where it was not?',
        'Where a rule you are changing states no mechanism at all, did you supply one before touching anything else about it?',
        'Does every candidate new rule have three independent occurrences across at least two distinct tasks, or a named reason for bypassing the threshold — an irreversible cost, or a factual correction?',
        'For anything you are proposing to weaken or remove on grounds of friction, can you state how an outcome was worse rather than only how the work was slower?',
        'Did this pass produce at least one narrowing, merge, or deletion — or can you name why nothing in the corpus is contradictory, redundant, or never invoked?',
        'Does each proposed change record what it is predicted to prevent and the checkpoint count at which a recurrence would show it did not work?',
      ],
    },
  ],

  relatedSkills: ['engineering-discipline', 'code-quality', 'design-review'],
}
