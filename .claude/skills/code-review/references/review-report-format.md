# The written review

A review is an artefact with a shape. The shape is not decoration: each part exists to remove
a specific piece of work from the author, and a review missing a part hands that work back.

---

## Structure

    Subject:   <branch, PR number, or file set>
    Base:      <commit the diff is against>
    Method:    <diff only / diff + full files / built and ran tests / ran the service>
    Request:   <one line: what this change claims to do>

    What holds
      <2-4 specific things the change gets right>

    Blind spots
      <what this review could not cover, and why>

    Findings
      <ranked, capped, each with a failure path>

    Rewrite proposals
      <approach-level disagreements, if any, priced>

    Verdict
      <mergeable as-is / mergeable after N blockers / needs a decision first>

**Method** bounds every claim in the report. "Diff only" means no finding about a function
you did not open is possible, and a reader who knows that weights the absence of such
findings correctly. **Request** is the thing the diff is judged against; writing it down is
what catches the case where the reviewer and the author are evaluating different changes.

**Verdict** is not optional. Without it the author infers your judgment from the volume and
tone of findings, and that inference is unreliable in both directions: a long tail of nits
reads as rejection, a terse note containing one blocker reads as approval.

---

## The severity ladder

| Label | Test | Examples |
| --- | --- | --- |
| **Blocker** | Wrong behaviour on a reachable path, data loss, a security hole, or an unrecoverable state. | Unvalidated input reaching a query; a write that is not idempotent behind a retry; a migration with no rollback; a secret in a log line. |
| **Major** | Correct now, fragile under change or load. | An invariant held only by a comment; an error path that discards the cause; unbounded growth in a cache; a resource released only on the happy path. |
| **Minor** | Real cost, small blast radius, obvious fix. | A misleading name on a private helper; a duplicated constant; a test asserting an implementation detail. |
| **Nit** | Optional. The author may close it unanswered. | Ordering of independent statements; a comment that restates the line; a shorter idiom. |

Two calibration rules.

**Rarity carries the signal.** If a third of your findings are blockers, the label has no
information left and the author re-triages from scratch, which is strictly worse than filing
no severities at all.

**Reachability multiplies consequence.** The same defect in a function called from one
internal admin script and in a function on the request path are not the same finding. State
the caller count or the path when it is what makes the severity what it is.

---

## Worked findings

Each pair below is the same underlying observation, written first in the form that gets
deferred and then in the form that gets fixed.

### Missing case

Weak: *"Should probably handle the empty list here."*

Strong: *"`report.ts:64` — `buildSummary` divides by `rows.length` with no guard. An
account with no transactions in the period yields an empty `rows`, so the call returns
`NaN`, which serialises to `null` and renders as a blank cell rather than a zero. Trigger:
any account created this month, on the monthly report. Smallest fix: return the zero-summary
object when `rows.length === 0`, and add that case to `report.test.ts`."*

### Concurrency

Weak: *"This looks racy."*

Strong: *"`counter.ts:22` — `read`, `increment`, `write` are three statements with an
await between the first and third, so two overlapping calls both read `n`, both write
`n+1`, and one increment is lost. Trigger: two clicks on the like button within the round
trip. Smallest fix: a single `UPDATE ... SET n = n + 1` rather than read-modify-write."*

### Error handling

Weak: *"Error handling could be better."*

Strong: *"`sync.ts:117` — the `catch` logs `err.message` and returns `[]`. A network
failure and an empty upstream result become indistinguishable to the caller at line 140,
which treats `[]` as authoritative and deletes the local rows that were not returned.
Trigger: any 502 from the upstream during a sync. Smallest fix: rethrow, or return a
discriminated `{ ok: false }` the caller already handles."*

### Cross-file invariant

Weak: *"Are you sure this is sorted?"*

Strong: *"`search.ts:31` — `bisect` assumes `items` is sorted by `id`, and the new
caller at `import.ts:88` passes the result of `Promise.all`, which preserves input order
rather than id order. Trigger: any import where the source file is not already id-ordered;
the lookup silently misses rather than throwing. Smallest fix: sort at the call site, or make
`bisect` take a `SortedById` branded type so the compiler catches the next caller."*

### Preference, correctly labelled

*"[Preference] `handlers.ts:12-48` — I would split the validation out of the handler. No
input behaves differently either way, so this is taste, not a defect; the argument for it is
that the other four handlers in this directory are already split. Fine to keep as-is."*

Note what the preference still does: it names the observation, admits the category, and gives
the reason someone might act on it. It just does not pretend to be binding.

---

## What "what holds" is for

Open with two to four specific things the change gets right — "the retry is bounded and the
backoff is jittered", "every new branch has a test", "the migration is reversible". Name the
thing rather than paying a compliment.

Two mechanisms, both real. A report containing only faults tells the author you were
searching for faults, so they discount the whole set rather than each finding on its merits.
And a good decision nobody wrote down is routinely removed in the next revision by someone
who cannot see why it was there.

---

## Ordering within the report

1. Blockers, ranked by reachability.
2. Majors, ranked by blast radius — a defect in a shared helper above the same defect in one
   call site.
3. Minors, collapsed by cause.
4. Nits, counted rather than enumerated if there are more than about five.

Never report in the order you noticed things. Notice-order tracks reading order, which tracks
the top of the diff, which has no relationship to consequence.
