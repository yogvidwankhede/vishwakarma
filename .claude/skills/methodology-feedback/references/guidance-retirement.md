# Guidance retirement

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
  nobody has or announcing itself badly in its `answers` field. Check the second before
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
between the rules that work and the rules that merely remain.
