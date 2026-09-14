# Observation triage

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
2. **Is the guidance field `none`?** Then it is a **gap**. Move to the candidate ledger and
   apply the new-rule threshold.
3. **Is `held` = `unstated`?** The rule gave no mechanism. The only correct first edit is to
   supply one — or to delete the rule if no mechanism can be recovered. Do not touch the
   statement until the mechanism exists, because without it you cannot tell whether any
   override was legitimate, including this one.
4. **Is `held` = `no`?** The rule's mechanism was not operating. It was correctly out of
   scope. The edit is an **exception clause naming the condition**, never a change to the
   statement. Changing the statement here weakens the rule everywhere it works in exchange for
   a case it never claimed.
5. **Is `held` = `yes` and the outcome was worse?** The rule is **wrong** in that situation.
   Its statement, its threshold or its mechanism has to change. This is the only path that
   licenses rewriting a statement.
6. **Is `held` = `yes` and the outcome was fine, only slower?** The rule worked. Cost is not
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
`held` = no. The second caller's requirements were visible, which is what the mechanism was
asking for. Correct edit: an exception for a second caller whose requirements are documented
even though the code does not exist yet.

**Entry B.** Same rule. Override: built a strategy interface for one payment provider because
a second one seemed likely. The second arrived, varied along a different axis, and the seam
was moved at a cost of two days. `held` = yes, and the outcome was worse. The mechanism
operated exactly as stated. No edit at all — this entry is evidence *for* the rule, and it
belongs in the rule's examples rather than in its exceptions.

Identical shape in the log. Opposite responses. The field that separates them is the
`held` entry, recorded at the moment the difference was still obvious.

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
| Removal | 20 checkpoints with no invocation, or a demonstrated contradiction | See `guidance-retirement` |

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
3. *Overrode reproduce-first on a compile error;* `held` = no. **Exception**: the rule
   addresses reported runtime failures; a deterministic compiler diagnostic is its own
   reproduction.
4. *Followed the baseline rule; measuring took 25 minutes on a copy change; outcome fine.*
   `held` = yes, outcome not worse. **No change to the rule.** Candidate for a cheaper
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
editing the rule and re-examine which situation it is actually about.
