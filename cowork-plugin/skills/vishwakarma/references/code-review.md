# Code Review

A review is measured in defects fixed, not findings produced. Two failure modes account for
most reviews that change nothing. The **rewrite in disguise**: the reviewer judges the diff
against the design they would have written instead of the request it claims to satisfy. The
**undifferentiated wall**: thirty findings of mixed severity arrive at once and the author
triages by fatigue, which discards them in the order they appear rather than by cost.

Giving a review and receiving one are separate skills that fail in opposite directions.

---

## 1. Review the change that was made

The subject of a review is the diff **plus the request it claims to satisfy**. Read the
request first, state in one line what you understood it to be, and judge the diff against
that. A change that solves the stated problem by means you would not have chosen is not
defective; it is different.

When you genuinely believe the approach is wrong, that is a **rewrite proposal** — a
different artefact from a finding. Label it as one, state what rebuilding costs, and let the
author decide. A rewrite proposal smuggled in as a finding leaves the author no legitimate
way to decline, because declining a defect reads as negligence; they either rebuild work
that was not wrong, or they begin discounting every finding you file, including the ones
about correctness.

"While you are here, also fix X" is the same error in miniature. X belongs in this diff only
if this diff broke it.

---

## 2. Defect or preference, said out loud

A **defect** is falsifiable outside your taste: it produces a wrong result for some input,
violates a stated contract, breaks a documented or enforced convention of this codebase, or
fails a check that exists. A **preference** rests on your judgment about structure, naming
fashion, or decomposition. Both are worth writing. They are not worth writing the same way.

The test: name the input, the run, or the rule that would prove you wrong. If nothing would,
it is a preference.

The two mistakes are asymmetric, and both are expensive. A preference dressed as a defect
removes the author’s ability to disagree. A defect softened into a preference — "you might
want to check that unwrap" — is filed under later and ships.

---

## 3. Severity is consequence, not irritation

Rank by what happens when it is not fixed, multiplied by how reachable it is.

- **Blocker** — wrong results, data loss, a security hole, an unhandled case on a path real
  traffic takes.
- **Major** — correct today but fragile: an invariant held only by convention, an error path
  that swallows the cause, a resource leak under retry.
- **Minor** — a real cost with a small blast radius; a confusing name on a private helper.
- **Nit** — genuinely optional. The author may close it unanswered.

How annoying the code was to read is not an input. A four-deep ternary is a nit. An unawaited
promise inside a retry loop is a blocker in code that reads beautifully. Reviewers
systematically invert this, because unreadable code is felt continuously while a race is felt
once, in production, by someone else.

---

## 4. A finding without a failure path is a guess

Four parts, every time:

1. **Location** — file and line, or function and branch.
2. **Mechanism** — the causal step from this code to the wrong outcome.
3. **A concrete trigger** — an input value, a call ordering, a configuration, a sequence of
   two requests. Not a category of input. An instance.
4. **The smallest fix** — the least change that closes it, not the refactor it suggests.

Weak: *"This could have a race condition."*

Strong: *"`cache.ts:88` — `get` checks `has()` then `read()` without holding the lock.
Two concurrent `refresh()` calls for the same key both see `has() === false` and both
write, so the second overwrites the first’s subscriber list and those callbacks never fire.
Trigger: two requests for an uncached key within the ~40ms fetch window. Smallest fix: store
the in-flight promise in the map before awaiting it."*

Part 3 is load-bearing. Constructing a concrete trigger forces you to execute the code in
your head, and that is where most confident false findings die — before the author spends an
hour disproving them. If you cannot build one, file it as a **question**, not a defect.

---

## 5. Say what the review could not see

Diff-shaped review is systematically blind in four directions, and an automated reviewer is
blind in all four while sounding equally confident everywhere:

- **Intent** — whether this is the right thing to build. The diff cannot contain it.
- **Names that lie** — `validateUser` that also writes a session row. Reading the name
  instead of the body is exactly how the defect survives.
- **Cases absent from the diff** — the missing branch leaves no lines to comment on, so it
  is invisible to anything that reads only changed lines.
- **Cross-file invariants** — "callers must hold the lock", "this list is sorted", "ids are
  lowercase here". The diff shows one end of a contract the other end enforces.

State the blind spots once, plainly, naming what you did not open. A reader who does not know
the review was diff-only reads the absence of architecture findings as approval of the
architecture. Confident noise in these four areas is worse than silence: one fabricated
finding causes the author to re-open every other finding you filed.

---

## 6. Volume discipline

Thirty findings of mixed severity get nothing fixed. Cap the report at roughly ten ranked
findings plus a counted tail ("7 further nits, listed below, none blocking"). The cap is not
politeness — it is what forces you to rank, and ranking is the part of the work the author
cannot do for themselves.

Collapse instances into causes. Six off-by-one guards from one misread boundary are one
finding with a count, not six; listed separately they inflate the review and hide the single
change that resolves all of them.

---

## 7. Receiving: three responses, and silence is not one

Every finding gets exactly one of:

- **Fixed** — with the commit or the line, so the reviewer re-reads one place.
- **Disputed** — with the mechanism that shows it does not happen: the guard upstream, the
  type that excludes the case, the test that already covers it. Not seniority, not "that is
  how we have always done it", not "the reviewer is a model". A dispute that cites authority
  transfers no information, so the reviewer cannot update and files it again next week.
- **Accepted and deferred** — with a reason and a location: what it costs to do now, and the
  issue number where it lives.

An unanswered comment is the only response that resolves nothing while looking like
agreement. Both sides then infer the opposite of what the other believes.

When a comment claims an input is unhandled, **write the test before writing the argument**.
If it passes, you have a one-line reply with evidence and a permanent guard against the case;
if it fails, you had a bug and spent four minutes instead of an afternoon defending it. The
test is cheaper than the thread in both branches, which is why converting beats arguing even
when you are confident.

Finally: critique the change, never the author, in both directions. "This function re-reads
the config on every call" is about code. "You did not think about performance" is about a
person, and it converts a fixable defect into a dispute in which nobody is discussing the
code.

## Rules

### MUST NOT — Do not file as a defect anything for which you cannot construct a concrete triggering input, call ordering, or configuration; file it as a question naming what would confirm it.

*Why:* A finding with no constructible trigger is a pattern match on the shape of the code rather than an observation about its behaviour, and pattern matches on shape have a high false-positive rate in exactly the places code looks unusual for good reasons. The cost of being wrong is paid across the whole review: one fabricated defect causes the author to re-open every other finding you filed.

Incorrect:

```markdown
[Major] Possible memory leak in the subscription handler.
```

Correct:

```markdown
[Question] `subscribe` at feed.ts:30 adds a listener; I could not find the corresponding removal on unmount. Does the container unsubscribe elsewhere, or would a mount/unmount loop grow the listener list?
```

### MUST NOT — Do not address the author or attribute carelessness, capability, or intent in either direction — describe the code and the observed behaviour.

*Why:* A statement about a person invites a defence of the person, which converts a fixable defect into a dispute in which nobody is discussing the code. It is also usually a false inference: the same output arises from a deadline, a missing primitive, or a requirement nobody wrote down.

Incorrect:

```markdown
You clearly did not think about what happens when the upstream is down.
```

Correct:

```markdown
The catch at sync.ts:117 returns `[]` for a network failure, so the caller at 140 cannot distinguish it from an empty upstream result and deletes local rows.
```

### MUST NOT — Do not dispute a finding by citing tenure, ownership, prevailing practice, or the reviewer being automated; cite the guard, type, constraint, or test that makes the described failure impossible.

*Why:* An appeal to authority transfers no information about the code, so the reviewer cannot update and files the same finding on the next change to the same file. A mechanism is falsifiable, which is what lets the disagreement terminate: either the guard exists and the finding is withdrawn, or it does not and you have found the defect yourself.

*Exceptions:*
- Findings that are genuinely about a different change than this diff, where the correct response is to say so and file it separately rather than to supply a mechanism.

Incorrect:

```markdown
That cannot happen — I have owned this service for three years, and it is the pattern we use everywhere.
```

Correct:

```markdown
`parseRow` is only reached from `ingest`, which filters empty lines at line 31, so the empty case is unreachable here. Added a test pinning that filter.
```

### MUST — State in one line what the change claims to do, sourced from the request rather than the code, and judge the diff against that line rather than against the design you would have written.

*Why:* Without a written claim, the reviewer’s baseline defaults to their own preferred implementation, which no diff can match — so every difference registers as a defect and the review has no natural end. Writing the claim down is also what catches the case where reviewer and author are evaluating different changes, which produces findings that are unanswerable because they are about work nobody agreed to do.

*Exceptions:*
- Reviews explicitly commissioned as architecture or approach reviews, where the approach is the subject rather than the diff.

Incorrect:

```markdown
This should use a state machine rather than three booleans.
```

Correct:

```markdown
Claim: "stop the upload retrying after a 413". The diff does that at upload.ts:44. Separately, and as a proposal rather than a finding: three booleans here are approaching a state machine.
```

### MUST — Label any finding that requires restructuring beyond the request as a rewrite proposal, state what rebuilding costs, and keep it out of the ranked findings list.

*Why:* A rewrite proposal filed as a defect leaves the author no legitimate way to decline, because declining a defect reads as negligence — so they either rebuild work that was not wrong or they start discounting every finding from you, correctness ones included. Naming the category moves the decision to the person who owns the schedule, which is where it can actually be made.

Incorrect:

```markdown
[Major] The retry logic should live in a middleware instead of the handler.
```

Correct:

```markdown
[Proposal, not a finding] Retry logic in middleware would remove this duplication across six handlers. Roughly a day plus a change to the error contract — worth deciding separately; this diff is correct as it stands.
```

### MUST — Label every finding as a defect — falsifiable against an input, a contract, or an enforced convention — or as a preference resting on your judgment, and never soften a defect into a preference to be polite.

*Why:* The two mistakes are asymmetric and both are expensive. A preference presented as a defect removes the author’s standing to disagree, so they comply against their judgment or discount the whole review. A defect presented as a preference — "you might want to check that unwrap" — is filed under optional and ships, because authors correctly read hedged language as permission to defer.

Incorrect:

```markdown
You might want to think about whether that cast is safe, and I would probably split this function.
```

Correct:

```markdown
[Defect] The cast at api.ts:19 is unchecked and the field is optional in the schema, so a response without it throws at line 22.
[Preference] I would split this function; no behaviour differs either way.
```

### MUST — Give every defect a location, the mechanism from code to wrong outcome, one concrete triggering input or sequence, and the smallest fix that closes it.

*Why:* Each missing part transfers work back to the author: no location means searching, no mechanism means re-deriving your reasoning, no trigger means reproducing from scratch, no fix means designing the one you already have in mind. The trigger is the load-bearing part for the reviewer too — constructing a concrete instance forces you to execute the code mentally, which is where most confident false findings die before they cost anyone an afternoon.

Incorrect:

```markdown
There might be a race condition in the cache.
```

Correct:

```markdown
cache.ts:88 — `has()` then `read()` without the lock. Two `refresh()` calls for one key both see `has() === false` and both write; the second drops the first’s subscriber list, so those callbacks never fire. Trigger: two requests for an uncached key inside the ~40ms fetch window. Fix: store the in-flight promise before awaiting it.
```

### MUST — Assign severity from the consequence of not fixing multiplied by the reachability of the path, never from how confusing or unpleasant the code was to read.

*Why:* Readability cost is felt continuously by the reviewer while a correctness cost is felt once, later, by someone else — so unexamined severity tracks the reviewer’s irritation, which is close to uncorrelated with consequence. The observable result is a four-deep ternary rated above an unawaited promise in a retry loop, and an author who learns that the labels track style stops using them to triage.

Incorrect:

```markdown
[Blocker] This nested ternary is unreadable. [Minor] `void sendEvent()` inside the retry loop.
```

Correct:

```markdown
[Blocker] `void sendEvent()` at retry.ts:58 is not awaited, so a rejection escapes the retry and becomes an unhandled rejection. [Nit] The nested ternary at line 12 is hard to read.
```

### MUST — State once, near the top, what the review could not cover — files not opened, tests not run, runtime behaviour not measured, intent not recoverable — and report runtime claims as hypotheses with the measurement that would settle them.

*Why:* A reader who does not know the review was diff-only reads the absence of architecture findings as approval of the architecture, which is the opposite of what the review established. The characteristic failure of automated review is uniform confidence across regions where evidence quality differs by an order of magnitude, and naming the boundary is what stops assertions from crossing it.

Incorrect:

```markdown
The change looks performant and the architecture is sound.
```

Correct:

```markdown
Blind spots: diff only; callers of `applyDiscount` outside this package were not opened; tests not run. cart.ts:77 looks like an N+1 — hypothesis, settled by the query count on a 100-item cart.
```

### MUST — Answer every finding in a review of your change with exactly one of fixed and where, disputed with the mechanism, or accepted and deferred with a reason and a tracked location.

*Why:* Silence is the only response that resolves nothing while looking like agreement: the reviewer reads an unanswered comment as accepted, the author reads it as dropped, and both leave with opposite beliefs about what was decided. The cost lands later, when the reviewer finds the unchanged line and reasonably concludes their reviews are not read, at which point the next one is shorter.

Incorrect:

```markdown
Fixed the important ones, pushed.
```

Correct:

```markdown
Fixed (4): cache.ts:88 — a1b2c3d … Disputed (1): api.ts:40 unreachable, ingest filters empty lines at line 31. Deferred (1): db.ts:210 needs a migration window — #812. Not addressed: 0.
```

### SHOULD NOT — Do not label a finding a blocker unless it produces wrong behaviour, loses data, or opens a security hole on a reachable path, and keep blockers to a small fraction of the report.

*Why:* A severity scale carries information only through the rarity of its top level. Once roughly a third of findings are blockers the author stops reading the labels and re-triages the whole list from scratch, which is strictly worse than having supplied no severities at all, because you have spent their attention twice.

### SHOULD NOT — Do not report more than about ten ranked findings in one review; collapse the rest into a counted tail and state that it is non-blocking.

*Why:* Review attention is a fixed budget spent top-down, so findings eleven through thirty are not additional fixes — they are reading time subtracted from the findings above them. The cap is the forcing function for ranking, and ranking is the one part of the work the author cannot do for themselves, since they cannot see which of your findings you would trade away.

*Exceptions:*
- An explicitly commissioned exhaustive audit, where enumeration rather than triage is the deliverable.

### SHOULD — Open every review with two to four specific things the change gets right, naming the decision rather than offering a compliment.

*Why:* A report containing only faults tells the author you were searching for faults, so they discount the whole set rather than weighing each finding on its merits. Naming correct decisions also protects them: a good choice nobody wrote down is routinely removed in the next revision by someone who cannot see why it was there.

Incorrect:

```markdown
Nice work overall! A few comments below.
```

Correct:

```markdown
The retry is bounded and jittered; the migration is reversible; every new branch has a test that fails without the change.
```

### SHOULD — When a finding claims an input or sequence is unhandled, write that case as a test and run it before writing any reply.

*Why:* The conversion is cheaper than the argument in both branches, which is why it does not require knowing in advance which branch you are in: if it fails you had the bug and found it in four minutes, and if it passes your reply is evidence rather than a claim. It also converts a transient thread into a permanent guard, so the same comment cannot be filed again on the next change.

Incorrect:

```markdown
The empty case is definitely handled — see the guard above.
```

Correct:

```markdown
Added `handles empty batch`; it passes on the current implementation, so this is already covered. Keeping the test so the behaviour stays intentional.
```

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the review is answerable — grounded in the request, ranked by consequence, honest about its blind spots — and that any review received has been fully answered. (blocking)

- Did you write down what the change claims to do, sourced from the request rather than the code, and is every finding a failure to meet that claim rather than a departure from how you would have built it?
- Is every approach-level disagreement labelled a rewrite proposal with its cost, and kept out of the ranked findings?
- Is every finding labelled defect or preference, with no defect hedged into a preference and no preference stated as binding?
- Does every defect carry a location, the mechanism, one concrete triggering input or sequence, and the smallest fix — and is anything you could not trigger filed as a question instead?
- Does each severity follow from consequence times reachability rather than from how hard the code was to read, and are blockers a small fraction of the total?
- Are findings ranked and capped at roughly ten, with repeated instances of one cause collapsed into a single counted finding?
- Did you state what the review could not cover — files not opened, tests not run, runtime not measured — and report every runtime claim as a hypothesis with its measurement?
- Did you enumerate the inputs the change accepts and point at the line or test handling each, and read the body of every new or renamed function against what its name promises?
- Does the review open with specific things the change gets right, and does every finding describe the code rather than the author?
- If you are receiving a review: does every finding have exactly one of fixed-and-where, disputed-with-a-mechanism, or deferred-with-a-reason-and-a-location, with the not-addressed count written down and equal to zero?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/receiving-a-review.md` — A review has landed on my change and I need to work through it — what do I owe each comment, how do I disagree without arguing from authority, and when should a comment become a test instead of a debate?
- `references/review-report-format.md` — What exactly should a written code review look like on the page — header, ordering, severity labels — and how do I turn a vague observation into a finding someone can act on?
- `references/review-blind-spots.md` — Which classes of defect does reviewing a diff systematically fail to catch — especially for an automated reviewer — and what specific procedure recovers each one?
