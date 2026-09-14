# Compaction and retrieval

Two failures end the useful life of a memory store, and they pull in opposite directions. It
grows until loading it costs more context than it saves, or it is organised so that the note
that would have helped is never surfaced. Compaction fixes the first and can cause the
second. Load this when the store is large, or when a session missed something it had.

---

## 1. The budget is the design constraint

Decide the load budget before deciding the format. A practical split for a project store:

- **Always loaded**: under ~1,500 tokens. Conventions that contradict defaults, hard
  environmental constraints, and pointers to where everything else lives.
- **Loaded on match**: a few thousand tokens per topic, pulled in when the session touches
  the area.
- **Loaded on demand**: everything else, reachable by search, never paid for by default.

A store without tiers is an always-loaded store, because a reader with no guidance reads it
all. Ten kilobytes of notes loaded on every turn of every session is a real and recurring
cost paid against an occasional benefit, and it is the reason well-intentioned memory files
get deleted wholesale after a few months.

---

## 2. The compaction ladder

Compress in stages, and at each stage know what is allowed to disappear.

**Turn to session.** Drop tool calls, file contents, intermediate output, and the order
things happened in. Keep decisions made, constraints discovered, approaches abandoned with
their evidence, and any state needed to resume. This is the level at which a 50,000-token
session becomes 300 tokens without losing anything that was not re-derivable.

**Session to topic.** Merge sessions that touched the same area. Supersede rather than
append: when two sessions disagree, the later one wins and the earlier claim becomes a
tombstone line, not a second entry. A store that appends is a store where contradictions
accumulate silently and the reader cannot tell which claim is current.

**Topic to durable.** Strip everything perishable. What survives is rationale, external
constraints and dead ends — the categories that do not decay. This tier should grow very
slowly; if it is growing fast, perishable material is being promoted into it.

---

## 3. What compaction is allowed to lose

The rule is that **summarisation must lose the narrative and keep the decision**. Concretely,
at any level of compression:

Safe to lose: chronology, who did what in which order, the sequence of failed attempts within
a single investigation, quoted file content, the phrasing of the original request, anything
the code still says.

Never lose: the decision, the reason, the alternatives rejected, the date, the scope, the
numbers, and the disconfirming evidence attached to a dead end.

The failure signature is easy to spot. Compressed notes that read like a changelog — "added
caching", "fixed the importer", "switched to a queue" — have kept the outcome, which is
visible in the commit history anyway, and thrown away the reason, which is not recorded
anywhere else. If a compaction pass produces a changelog, it compressed the wrong axis.

**The reconstruction test.** Take the compacted note alone and ask whether a reader who was
not present can answer why the decision went that way and what would have changed it. If not,
the compaction is a loss, and the fix is usually to restore one sentence, not a paragraph.

---

## 4. Retrieval fails silently

A note that is never surfaced is indistinguishable from a note that was never written, with
the difference that it cost something to write and maintain. Worse, the failure is invisible:
the session proceeds, re-derives, and reports success, so nothing ever signals that retrieval
was the thing that broke.

That makes retrieval a design problem to solve at write time, since nobody will be there at
read time to fix it.

---

## 5. Write under the question, not the topic

The organising question is **what will a future session be asking when this note is the
answer?**

Topic-first filing puts a note where a librarian would file it. Question-first filing puts it
where a person in trouble will look. These are rarely the same place. A finding that the
connection pool exhausts when retries stack belongs under "requests hang a few minutes after
deploy" — the symptom — because that is the phrasing available to someone who does not yet
know the cause. Filed under "connection pooling" it is found only by a reader who has already
guessed the answer.

Three practices follow.

**Lead with the symptom or question.** The first line of a note is what a search result shows
and what a skimming reader matches against. Spend it on the trigger, not on a category name.

**Include literal anchors.** Paste the exact error text, the exception class, the function
name, the config key, the file path. Semantic search matches paraphrase, and lexical search
matches only what is written; literal anchors are the only tokens that work for both.
Terminology drifts across a team and across a year — a copied error string does not.

**Write one note per question.** A single note answering four questions surfaces for one of
them and buries the other three. Splitting costs a few duplicated lines of scope and
multiplies the chance of a hit.

---

## 6. Entry points

Every store needs one document whose only job is to say what exists and where it is: the
topics covered, the questions each area answers, and how stale each area is likely to be.
This is the one file worth loading unconditionally, because it converts an unknown store into
a searchable one at a fixed, small cost.

Keep it to pointers and questions. The moment it starts containing answers it becomes a
second copy of the store, and the two will disagree.

---

## 7. Signals worth acting on

- The same question is re-derived in two consecutive sessions: a retrieval failure, not a
  gap. The note probably exists and is filed under a topic rather than a question.
- The store is loaded whole on every session: no tiering. Split by load budget before
  anything else.
- Compacted notes read like a changelog: the reason axis was compressed. Restore it.
- Two notes make contradictory claims: the store appends instead of superseding. Merge and
  tombstone.
- Nobody has deleted anything in months: nothing is expiring, so perishable claims are
  accumulating in a tier that is trusted.

---

## Pass conditions

- Is the always-loaded tier small enough to justify paying for it on every session, with everything else reachable on demand?
- After compaction, can a reader who was not present still answer why each decision was made and what would have changed it?
- Did compaction drop chronology and tool traffic rather than reasons, numbers and rejected alternatives?
- Is each note filed under the question a future session would ask, with the symptom or question on its first line?
- Does each note contain the literal error strings, identifiers and paths that a search would match?
- When a newer session contradicted an older note, was the older claim superseded and tombstoned rather than left alongside the new one?
