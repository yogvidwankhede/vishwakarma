# Friction capture and the checkpoint

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
| `stamp` | Date and checkpoint number | Orders entries and ties them to a denominator |
| `context` | The task, and the specific thing in hand: file, request, endpoint | Lets a later reader reconstruct whether your case resembles theirs |
| `guidance` | Rule or section id, or `none` for a silence | The join key; `none` is what makes gaps countable |
| `event` | One word from the list above | Makes the log sortable without rereading prose |
| `instead` | What you actually did | The counterfactual; a complaint without this is unadjudicable |
| `cost` | Observed, in units: minutes, a rebuild, a wrong output shipped, or `none` | Separates expensive from merely irritating |
| `held` | `yes`, `no`, or `unstated`: was the rule's stated mechanism operating here? | The field that decays fastest, so it is captured first |
| `class` | Left empty | Filled at triage, not now |

The `held` field is the load-bearing one. It is the difference between a rule that is wrong
and a rule that was correctly out of scope, and it is answerable in two seconds while you are
still looking at the case. Answering it a week later is guesswork, and guesswork here produces
the single most damaging edit available: rewriting a rule that was working.

`unstated` is a legitimate answer and an important one. It means the rule gave no mechanism,
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

> `stamp` 2026-03-04, checkpoint 118. `context` adding a nullable column to the settings
> table, migration only, no code path reads it yet. `guidance` engineering-discipline/reproduce-first.
> `event` override. `instead` applied the migration on a scratch database and diffed the
> schema. `cost` none; reproducing a failure that does not exist yet is undefined.
> `held` no — the mechanism is that an unreproduced fix cannot be verified, and there is no
> failure here to reproduce. `class` empty.

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

`checkpoint 119 — task: fix stale avatar cache — entries: 0 — consulted: code-quality/*, engineering-discipline/diff-traces-to-request`

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
moment to fix them is while you are looking at them. Fix, note the fix, continue.
