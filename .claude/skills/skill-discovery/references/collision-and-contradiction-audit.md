# Collision and contradiction audit

Two defects account for most of the damage a multi-skill install does, and neither produces
an error message. **Collision** is two skills competing for the same activation.
**Contradiction** is two skills issuing incompatible instructions once activated. Load this
when adding a skill to a non-empty set, or when output has become inconsistent and the
skill set is suspected.

---

## 1. Why neither one announces itself

Skill selection is a semantic match between the task and a set of short trigger strings. It
is a ranking, not a lookup, and rankings between near-identical candidates are unstable —
a rephrased task, a different file open, a longer conversation, and the order changes.

So a collision produces *intermittent* behaviour: the right skill on Monday, the other one
on Tuesday, for a task that did not change. Anyone debugging this without knowing the set
overlaps will look at the prompt, the model, and the weather before looking at the two
trigger lines that both mention "component".

Contradiction is quieter still. An agent given "targets are at least 44pt" and "targets are
at least 48dp" has no mechanism for raising a conflict. Both are in the prompt, both look
authoritative, it produces one number, and the other rule leaves no trace of having been
ignored.

## 2. The overlap matrix

Do this before installing, and once after any bulk install.

1. Extract the trigger line of every installed skill plus the candidate.
2. For each pair, ask one question: **is there a task phrasing that a reasonable matcher
   would rank both above the rest?** If yes, the pair overlaps.
3. Classify each overlapping pair:

| Class | Shape | Action |
| --- | --- | --- |
| Nested | One trigger is a strict subset of the other ("data tables" inside "UI") | Keep both; make the general one exclude the specific case explicitly |
| Sibling | Same domain, different aspect (colour vs. typography) | Keep both; make each trigger name its aspect, not the domain |
| Duplicate | Same domain, same aspect | Keep one. Two skills for one job is the defect |
| Cross-domain accident | Shared word, unrelated subjects ("migration" in databases and in design systems) | Rewrite the trigger to disambiguate the word |

The matrix is O(n squared) in principle and trivial in practice, because triggers cluster by
domain and most pairs are obviously disjoint. Scanning for shared nouns finds nearly all of
them in one pass.

## 3. The activation probe

The matrix predicts. The probe observes, and only the probe is evidence.

Write three to five phrasings of a task in the disputed area — the way a user would say it,
including the lazy phrasing and the over-specified one. Run each. Record which skills
actually loaded.

```text
Task phrasing                                   Expected      Actually fired
"build me a settings table"                     data-table    data-table, ui-general
"make a table for the settings page"            data-table    ui-general
"settings screen with rows of toggles"          ui-general    data-table
```

Rows two and three are the finding. The trigger is matching on "table" rather than on the
work, and the fix is in the trigger text, not in either skill's content.

Re-run the probe after any trigger edit. A narrowing that was not verified is a guess.

## 4. The contradiction table

Once the set is settled, compare content rather than triggers. This is bounded work because
only *shared subjects* can contradict.

1. List the subjects each activated skill legislates: spacing, contrast, motion duration,
   error copy tone, commit format, test structure, naming, file layout.
2. Keep only subjects appearing in two or more skills.
3. For each, put the normative statements side by side, verbatim.
4. Mark each pair: **agree**, **disagree**, or **different scope**.

Four kinds of disagreement, with different resolutions:

- **Numeric threshold.** 44pt against 48dp; 4.5:1 against 3:1; 200ms against 150ms. Almost
  always both are correct under different platforms or contexts. Resolve by **scoping**:
  each rule names the platform or case it governs. The larger value is usually the safe
  merge if a single number is required, but say so explicitly rather than letting the
  ordering decide.
- **Mutually exclusive process.** One says write the test first, the other says prototype
  then cover. These cannot both hold on the same task. Resolve by **precedence**: one named
  winner, one sentence of reason, recorded where both skills can be seen.
- **Vocabulary collision.** Two skills define "token", "component", or "primitive"
  differently. This corrupts everything downstream because the agent cannot tell which
  definition a rule refers to. Resolve by **renaming** in the fork you control.
- **Incompatible defaults.** Both permit the same range but default differently. Lowest
  damage; resolve by stating the default once in project-level instructions and deleting it
  from the skill-level ones.

## 5. Resolution ladder

Take the cheapest rung that works.

1. **Scope one rule** so the subjects no longer overlap. Preserves both skills, costs one
   clause, and usually reflects the truth — the conflict was context-dependence all along.
2. **Write a precedence note** in project instructions naming which skill wins on which
   subject, with the reason. Cheap, visible, and survives updates to either skill.
3. **Fork and edit** the weaker skill. Effective and permanent, but it takes the skill off
   its upstream update path, so record the delta and the upstream version.
4. **Remove one.** The right answer for duplicates. Two skills for one job means the
   selection is a coin flip, and a coin flip is worse than either skill alone.

Do not resolve by ordering. Placing the preferred skill "later" or "higher" relies on
behaviour no format guarantees and no reader can see.

## 6. Regression check

After any resolution, re-run the known-answer task from the trial protocol and diff the
output against the pre-install baseline. The specific things to look for:

- The number that was in dispute: is it now the intended one, every time, over three runs?
- Did any rule from the surviving skill stop being applied, which happens when a narrowing
  cut more than intended?
- Does the probe table still show the intended skill firing on all phrasings?

Record the resolution next to the install record. The next person to add a skill in the
same domain needs to know the conflict was already found and what was decided, otherwise
they will re-discover it as a mystery.
