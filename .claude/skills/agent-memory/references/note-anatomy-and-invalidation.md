# Note anatomy, selection, and invalidation

This file covers the unit of storage: what a single persisted note contains, how to decide
whether an observation deserves one, and what removes it when the world moves. Load it when
writing into a memory file or cleaning one up.

---

## 1. The fields

A note that can be trusted later carries seven parts. Five are mandatory.

- **Question.** The phrasing a future session will use when it needs this. Written as a
  symptom or a question, not as a topic label.
- **Claim.** One sentence that can be true or false. "Migrations must run through the runner"
  is a claim. "Notes on migrations" is not.
- **Reason.** The mechanism or the observation behind the claim. This is the part that is not
  re-derivable, and it is why the note exists.
- **Scope.** The paths, package, service or commit the claim was true of. Scope is what makes
  a check possible: "true of packages/api as of a1b3f92" can be verified in one command.
- **Date.** When the claim was established. Not when the file was last touched.
- *Confidence* (optional). Distinguish measured from inferred from assumed. An agent weighing
  two conflicting notes has nothing else to weigh with.
- *Invalidation trigger* (optional but high value). The concrete event that would end the
  claim: "void if the queue driver changes", "void once the v2 endpoint is retired".

A compact shape that survives being pasted into any format:

    ## Why do bulk imports silently drop rows?
    Claim: the importer commits per batch and swallows constraint violations.
    Reason: traced a 4,000-row import that landed 3,911 rows; the batch handler
      catches IntegrityError and continues. Confirmed by re-running with logging.
    Scope: services/importer/batch.py, as of 2026-04-11 (commit a1b3f92).
    Void if: batch.py stops catching IntegrityError.

---

## 2. Selection: what earns a note

Run the **re-derivation test** first. Time the note against the alternative: if an agent with
the repository open could answer the question faster by reading the code than by finding and
reading the note, the note is a liability — it costs context on load, it can go stale, and it
adds nothing at the moment of need.

That test disqualifies most of what a capture mechanism wants to save: module descriptions,
function inventories, directory trees, dependency lists, restated type signatures, and
narrative summaries of what happened in a session.

It admits four categories.

**Decisions and their reasons.** Record the option chosen, the options rejected, and the
observation or constraint that decided between them. The rejected options matter as much as
the chosen one — without them the next session cannot tell a considered decision from an
accident, and treats both as arbitrary.

**Externally imposed constraints.** Anything true of the environment rather than the code:
rate limits, credential scopes, sandbox restrictions, build-machine quirks, review policies,
release windows. These are invisible to code reading by construction, so they are the highest
value per byte in the whole store.

**Dead ends with evidence.** The approach, the specific observation that killed it, and the
conditions under which it might be worth revisiting. Without the evidence the note reads as
opinion and will be overridden by the next session's optimism.

**Surprising conventions.** A convention worth a note is one a competent stranger would get
wrong. If the codebase does the obvious thing, the obvious thing needs no note.

---

## 3. Writing the reason so it survives

The reason is the field authors compress first and should compress last. Three habits keep it
useful.

**Name the observation, not the feeling.** "Seemed slow" is not a reason. "p95 went from
40ms to 900ms when the payload exceeded 2MB" is a reason, and it stays checkable.

**Name what it rules out.** A reason that explains only the chosen option invites a rerun of
the same investigation. A reason that says "and this is why the obvious alternative fails"
ends it.

**Keep the numbers.** A threshold, a count, a duration or a version is denser and more
falsifiable than any adjective, and it dates itself honestly — a number attached to a version
that no longer exists announces its own staleness in a way "it was slow" never does.

---

## 4. Invalidation

Staleness is not a slow drift, it is a discrete event: something changed and a claim became
false at that moment. Four mechanisms catch it, in descending order of reliability.

**Write-time contradiction sweep.** Whenever a change contradicts a persisted claim, fix the
claim in the same change. This is the only mechanism with no latency, and it is the one that
actually keeps a store honest. It requires knowing what is in the store, which is an argument
for a store small enough to hold in view.

**Scope anchors.** Because every claim names the files it was true of, a claim can be checked
by looking at whether those files changed since its date. A note scoped to a file untouched
for a year needs no review. A note scoped to a file rewritten last week is suspect regardless
of how confidently it is phrased.

**Expiry on state-notes.** Anything describing work in progress gets a date after which it is
deleted unread. Evaluating an expired state-note is worse than deleting it, because
evaluation takes a claim about a moment and asks whether it is true now, which it was never
meant to answer.

**Periodic reconciliation.** A scheduled pass that reads each claim and checks it against the
current tree. Expensive and therefore rare, so treat it as a backstop rather than the plan.

---

## 5. Reversals leave a tombstone, not a hole

When a decision is reversed, deleting the old note is the wrong move. The reasoning that
produced the original decision is still live — it will be rediscovered, and without a record
of the reversal the next session may reinstate it.

Replace the claim, keep the history in one line: "Was: batching disabled because of the
duplicate-key bug. Reversed 2026-08-02 after the upstream fix in 4.2; batching is on."
A tombstone is two sentences and prevents an entire round trip.

The same applies to a dead end that later becomes viable: annotate it rather than removing
it, since the conditions that made it fail are exactly what a future reader needs to check.

---

## 6. Decay classes

| Class | Example | Half-life | Handling |
| --- | --- | --- | --- |
| Rationale | why the queue beat cron | years | keep; revisit only on reversal |
| External constraint | CI has no network | months | re-check when tooling changes |
| Dead end | streaming parser did not help | years | annotate, never delete |
| Convention | errors are returned | months | scope-anchor to the module |
| Architecture shape | services and their boundaries | weeks | verify before relying |
| Work state | branch, failing test, next step | hours | explicit expiry, delete unread |

The two rows at the bottom are where nearly all poisoning comes from, because they are the
rows an automatic capture mechanism produces most of.

---

## Pass conditions

- Does every persisted claim carry a date and a scope naming the paths, module or commit it was true of?
- Does every note state the reason or observation behind the claim, rather than only the outcome?
- Was each note tested against re-derivation — is it genuinely faster to read than to recover from the code?
- Does every note describing work in progress carry an explicit expiry?
- When this session contradicted a persisted claim, was that claim amended or removed in the same change?
- Were reversed decisions and revisited dead ends left as tombstones rather than deleted outright?
