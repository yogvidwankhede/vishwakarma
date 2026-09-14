# Blind spots of diff-shaped review

A diff is a poor sample of a program. It shows changed lines, in file order, with a few lines
of context, stripped of runtime, call graph, and history. Several important defect classes
leave no trace in that sample at all, and an automated reviewer is uniformly confident across
regions where its evidence quality varies by an order of magnitude.

Each section below names a class, states why the diff cannot reveal it, and gives the
procedure that partially recovers it. Partially is the honest word: none of these are
complete, and the report should say which ones were run.

---

## 1. Intent: whether this is the right change

The diff cannot contain the question it answers. A change can be flawless and still solve a
problem nobody has, fix a symptom while the cause stays, or implement the second-best of
three readings of an ambiguous request.

**Procedure.** Before reading code, write one line: *this change claims to \<X\>*. Source it
from the PR description, the linked issue, or the commit message — not from the code, which
would make the test circular. Then ask two questions the diff cannot answer on its own:

- Does the diff do things that line does not mention? Those are either scope creep or a
  requirement that was never written down; both are worth surfacing.
- Does the line mention things the diff does not do? That is an incomplete change, and it is
  invisible to every line-level check.

If the request cannot be recovered at all, that absence is the first finding. A change whose
purpose is unrecorded cannot be reviewed, only proofread.

---

## 2. Names that lie

Review reads names and infers bodies, because that is what makes reading a large diff
possible at all. Any defect where the name is a correct-sounding summary of the wrong thing
therefore passes straight through — and worse, the name then propagates the wrong belief to
every call site the reviewer reads afterwards.

Common shapes:

- `validateX` that also writes, sends, or mutates. Callers reasonably assume validation is
  free of side effects and call it twice, or in a loop, or speculatively.
- `getX` that creates on miss. The caller inside a retry loop now creates N rows.
- `isEnabled` that returns a non-boolean, so `=== true` and truthiness disagree.
- A plural that returns one thing, or a singular that returns a list.
- `safeParse` / `tryX` that still throws on one branch.
- A unit missing or wrong in the name: `timeout` holding seconds where every caller passes
  milliseconds.

**Procedure.** For every function the diff introduces or renames, read the **body**, then
state what the name promises, and check three things: side effects the name does not imply,
the type actually returned versus the type the name implies, and the units of every numeric
parameter. Where a name and a body disagree, the finding is the disagreement — and the
cheapest fix is usually the rename, not the body.

---

## 3. Cases that are absent

A missing branch produces no lines. There is nothing to comment on, no red in the diff, no
symbol to search for. This is the single largest blind spot in diff-shaped review, and it is
where the defects that reach production disproportionately live.

**Procedure.** Enumerate from the *type* of each input the change accepts, not from the code:

- Collections: empty, one element, duplicates, very large, unordered when order is assumed.
- Numbers: zero, negative, the boundary itself and either side of it, overflow, NaN from a
  prior division.
- Strings: empty, whitespace only, Unicode beyond the BMP, a very long one, one containing
  the delimiter the code splits on.
- Optionals: absent versus present-and-empty, which are different and are routinely conflated
  into one branch.
- Time: the same instant twice, clock going backwards, a duration of zero, a timezone change
  mid-operation.
- Concurrency: the same operation twice at once, out of order, retried after a timeout that
  actually succeeded.
- Failure: the dependency times out, returns a partial result, or returns a success with an
  empty body.

For each case, point at the line or test that handles it. Cases with no such line are
findings. This procedure is mechanical, which is exactly why it recovers what reading cannot:
it is driven by the input space rather than by the text that happens to be on screen.

---

## 4. Cross-file invariants

An invariant is a fact two or more places agree on: callers hold the lock, this list is
sorted, ids are lowercase on this side of the boundary, this cache is invalidated whenever
that table is written. The diff shows one end. The enforcement is at the other end, in a file
that is not open, and often the agreement is recorded nowhere but in the head of whoever
wrote both.

**Procedure.** For every function the change calls or modifies, look for preconditions it
does not check but relies on — a lock, an ordering, a non-null established elsewhere, an
initialisation that must have run. Then ask whether this diff introduces a **new caller** or
a **new order**, because those are the two ways a stable invariant breaks without any
existing code changing.

Grep is the cheap version and it is worth running: search the repository for other call sites
of every function the diff touches, and for other writers of every field it writes. The
finding to file is not "this is wrong" but "this depends on X holding; I could not confirm
X holds at the new call site in \<file\>". That phrasing is accurate and still actionable.

---

## 5. Things that only exist at runtime

Performance, memory, query counts, lock contention, actual concurrency. Source review
produces plausible stories about all of them and can confirm none.

**Procedure.** Report these as **hypotheses with the measurement that would settle them**,
never as defects: "this loops over `orders` and calls `fetchCustomer` inside, which looks
like N+1 — the check is the query count on a 100-order account." Where you can run it, run it
and report the number instead. Where you cannot, the hypothesis with its check is still
useful and does not spend credibility.

---

## 6. History the diff has forgotten

A line that looks arbitrary is sometimes load-bearing: the odd sleep, the redundant check,
the seemingly pointless copy. These accumulate from incidents and they are rarely commented.
A review that suggests removing one is suggesting the reintroduction of a bug.

**Procedure.** Before proposing the deletion of anything that looks unnecessary, check the
blame and the commit message for it. If the message names an incident or a ticket, the code
is not arbitrary and the finding should be "this looks redundant; `git blame` points at
#441 — is that still live?" rather than "remove this".

---

## 7. Stating the blind spots

Put them in the report, once, near the top, naming what was not opened:

    Blind spots
      Reviewed the diff only; did not open the callers of applyDiscount
      outside this package. Did not run the test suite. No measurement of
      the suspected N+1 at cart.ts:77 — reported as a hypothesis.

Two reasons this is load-bearing rather than modest. A reader who does not know the review
was diff-only reads the absence of architecture findings as approval of the architecture. And
naming the boundary is what keeps you from asserting across it: the specific failure of an
automated reviewer is uniform confidence, and one fabricated finding causes the author to
re-open every other finding in the report, so the credibility cost is paid across the whole
review rather than on the one that was wrong.
