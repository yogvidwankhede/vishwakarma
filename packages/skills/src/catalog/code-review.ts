// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Two people look at the same diff and disagree. Almost all of the damage that follows
 * comes from one unstated thing: neither said whether the disagreement was about *correct*
 * or about *preferred*.
 *
 * A reviewer who dresses a preferred design as a defect removes the author’s standing to
 * decline it, because declining a defect looks like negligence. An author who answers a
 * real defect with tenure removes the reviewer’s reason to keep filing them. Both moves
 * feel like rigour from the inside, and both end with the same artefact: a review thread
 * that consumed an afternoon and changed no behaviour.
 *
 * This skill treats a code review as a two-sided protocol rather than a report. The giving
 * half insists that a finding carry a failure path — a concrete input or sequence that
 * produces the wrong result — because producing one is what kills the confident guess
 * before it reaches the author. The receiving half insists that every finding get one of
 * exactly three responses, because silence is the only response that resolves nothing while
 * looking like agreement.
 *
 * `design-review` is the same posture pointed at interfaces, where the evidence is a
 * measurement and the harm is to a user at the screen. Here the evidence is an execution
 * path and the harm is a wrong result, a lost row, or an invariant that stops holding three
 * files away from the diff.
 */
export const codeReview: SkillManifest = {
  vsm: '1.0',
  id: 'code-review',
  name: 'Code Review',
  description:
    'Use when reviewing a diff or pull request, or when a review has landed on your own change and you owe every finding a response.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'workflow',
  tags: ['review', 'diff', 'pull-request', 'feedback', 'severity', 'defects', 'process'],

  activation: {
    intents: [
      'the user asks for a review of a diff, branch, pull request, or patch',
      'the user asks whether a change is safe to merge',
      'the user wants a second pair of eyes on code they just wrote',
      'checking your own change before reporting it as finished',
      'the user has received review comments and wants help working through them',
      'the user disagrees with a review comment and wants to know whether to push back',
      'the user says a review left thirty comments and they do not know where to start',
      'the user asks what an automated reviewer is likely to have missed on their change',
      'the user asks whether a review comment is a real bug or a style opinion',
      'a review comment claims an input is unhandled and the user is deciding how to answer it',
      'auditing a diff for missing test coverage of the cases it introduces',
      'the user wants to propose a different approach to a change someone else wrote',
    ],
    globs: [
      '**/*.diff',
      '**/*.patch',
      '**/PULL_REQUEST_TEMPLATE*',
      '**/CODEOWNERS',
      '**/.github/pull_request_template.md',
      '**/CONTRIBUTING.md',
    ],
    keywords: [
      'code review',
      'review this',
      'review my PR',
      'pull request',
      'merge request',
      'is this safe to merge',
      'review comments',
      'reviewer said',
      'address feedback',
      'nitpick',
      'LGTM',
      'request changes',
      'push back',
      'diff',
    ],
  },

  content: {
    summary:
      'Review a diff against the request it claims to satisfy: label each finding defect or preference, rank by consequence, and give it a failure path and a smallest fix. When receiving, answer every finding with fixed, disputed-with-mechanism, or deferred-with-reason.',

    body: `# Code Review

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

Strong: *"\`cache.ts:88\` — \`get\` checks \`has()\` then \`read()\` without holding the lock.
Two concurrent \`refresh()\` calls for the same key both see \`has() === false\` and both
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
- **Names that lie** — \`validateUser\` that also writes a session row. Reading the name
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
code.`,

    references: [
      {
        id: 'receiving-a-review',
        title:
          'Receiving a review: the three responses, disputing well, and converting comments into tests',
        answers:
          'A review has landed on my change and I need to work through it — what do I owe each comment, how do I disagree without arguing from authority, and when should a comment become a test instead of a debate?',
        content: `# Receiving a review

Receiving is the half that is never taught, and it fails differently from giving. A reviewer
fails by producing a report nobody can act on. An author fails by **converting a review into
a negotiation** — defending the code that exists rather than evaluating the claim about it —
or by the quieter failure of fixing everything without thought, which trains the reviewer to
stop distinguishing severities because the author never did.

Load this when comments have arrived on your change, from a person or from a tool.

---

## 1. Read the claim, not the tone

Separate two things before responding to anything: **what is being claimed about the code**,
and **how it was said**. Only the first is your problem right now. A rude comment about a
real race is a real race. A friendly comment about an imagined one is still wrong.

Read the whole review before answering any of it. Reviews are written in reading order, not
dependency order, so comment 14 frequently withdraws comment 3, and answering top-down means
arguing a point the reviewer already resolved.

Then sort the findings yourself, by consequence. The reviewer’s severity labels are an input,
not a verdict — they were assigned without knowing which paths are reachable in production.

---

## 2. Three responses, and only three

Every comment gets exactly one of these, explicitly, including the ones you think are
obviously wrong.

**Fixed.** Say what changed and where. "Fixed in \`a1b2c3d\` — moved the promise into the map
before the await." The reviewer then re-reads one hunk instead of re-reviewing the file. A
bare "done" costs them a diff hunt, which is the same work you just avoided doing.

**Disputed, with the mechanism.** State the thing that makes the failure impossible, and
state it in the same currency as the finding: a control-flow fact, a type, a constraint, a
test. If the mechanism turns out to be a comment you wrote yourself three months ago, that is
not a mechanism, that is a convention — and a convention is exactly what the reviewer is
pointing at.

**Accepted and deferred.** Agree it is real, say what doing it now costs, and give it a
location: an issue number, a TODO with that number, a line in the ticket. Deferral without a
location is a decline with better manners, and everyone involved knows it, which is why
deferrals that are not recorded get re-filed on the next change to the same file.

**Silence is not a fourth option.** An unanswered comment reads as agreement to the reviewer
and as dismissal to the author, so both sides leave the thread with opposite beliefs about
what was decided. The cost lands later, when the reviewer finds the unchanged line and
reasonably concludes their review is not read.

---

## 3. Disputing well

A good dispute is falsifiable. It gives the reviewer something they can check and be wrong
about, which is what lets them update rather than repeat.

| Weak dispute | Why it fails | Strong form |
| --- | --- | --- |
| "That cannot happen." | Asserts the conclusion the finding denies. | "\`parseRow\` is only reached from \`ingest\`, which filters empty lines at line 31, so the empty case is unreachable here." |
| "I have worked on this service for three years." | Tenure is evidence about the speaker, not the code. | "This path has never taken a null because the column is \`NOT NULL\` since migration 0042." |
| "That is the pattern we use everywhere." | Consistency is a reason to keep a choice, not evidence it is correct. | "Deliberate: every handler returns \`Result\` rather than throwing, so the caller in \`router.ts:77\` can retry. Changing it here alone would break that." |
| "It is just a style preference." | May be true, but asserting it does not establish it. | "This is a preference rather than a defect — no input produces a different result either way. I would rather keep the current shape because it matches the three sibling handlers." |

Two disputes that are always legitimate, and frequently correct:

- **The finding is about a different change.** "That is real, but it predates this diff — the
  line is unchanged here. Filed as #812." A review that grows to cover the file rather than
  the diff has no natural end, and the author is the only person positioned to say so.
- **The finding is a rewrite proposal.** "This is a proposal to restructure the module rather
  than a defect in the change. It may be right; it is two days and a migration. Can we decide
  it separately?" Naming the category is not a refusal — it moves the decision to where it
  can actually be made.

---

## 4. The comment that is really a missing test

A large share of review comments have this shape: *what happens when the input is empty /
null / enormous / duplicated / out of order?*

That is not an argument to win. It is a test that does not exist yet.

Write the test before writing the reply, always, in this order:

1. Write the case exactly as the reviewer described it.
2. Run it.
3. **If it fails**, you had the bug. Fix it, and keep the test — the reviewer just handed you
   a case your own imagination did not produce.
4. **If it passes**, reply with the test, not with a claim: "Added \`handles empty batch\` —
   passes on the current implementation; keeping it so the behaviour stays intentional."

This is cheaper than arguing in both branches, which is the whole point: you do not need to
know in advance which branch you are in. It also converts a transient thread into a permanent
guard, so the same comment cannot be filed again on the next change.

The same conversion applies to "is this N+1?" (measure it, report the query count), "does
this leak?" (run it in a loop, report RSS), and "is this slower?" (benchmark both, report
numbers). Any comment that names an observable becomes a measurement instead of an opinion.

---

## 5. Volume from an automated reviewer

Machine review inverts the usual economics: findings are nearly free to produce and just as
expensive to evaluate as before. Two consequences.

**Triage by failure path first.** Findings that name a concrete input and a mechanism get
read first, regardless of the severity label attached to them. A finding with no failure path
is a guess, and guesses are the bulk of the volume.

**Do not fix to silence the tool.** A change made only to remove a warning, with no mechanism
you understand, adds an unexplained line that the next person cannot safely remove. If you
cannot state why the fix is correct, dispute or defer instead — an unjustified fix is worse
than an open comment, because the comment is visible and the line is not.

Where a tool files the same class of finding repeatedly and it is genuinely not a defect in
this codebase, fix the source: a lint rule, a type, or a documented convention. Otherwise you
will answer it on every change forever.

---

## 6. The response artefact

Reply in one batch, not comment by comment. A batched response lets the reviewer re-read once
with the whole picture; a stream of individual replies makes them re-derive the state of the
review on every notification.

    Addressed in <commit range>.

    Fixed (4)
      cache.ts:88   in-flight promise stored before await — a1b2c3d
      parse.ts:12   empty-batch case + test "handles empty batch" — a1b2c3d
      ...

    Disputed (2)
      api.ts:40     unreachable: ingest filters empty lines at line 31
      util.ts:7     preference rather than defect; keeping the sibling-handler shape

    Deferred (1)
      db.ts:210     real; the index change needs a migration window — #812

    Not addressed (0)

The **Not addressed** line exists so that it cannot silently be non-zero. If it is not zero,
the review is not answered yet, and writing the number is what makes that visible to you
before it becomes visible to the reviewer.

---

## 7. When you are the reviewer of your own change

Self-review before you request one, and run it as a different activity rather than a second
reading. Two mechanisms make self-review weak, and both have specific counters:

- You know what the code *means*, so you read intent instead of behaviour. Counter: read only
  the diff, in the review tool, in the order a stranger would.
- You remember which cases you considered, so absent cases feel handled. Counter: list the
  inputs the change accepts, and point at the line or the test that handles each one.

The findings you produce this way are the cheapest in the whole process: no thread, no
context switch, no second person’s afternoon.`,
      },
      {
        id: 'review-report-format',
        title: 'The written review: structure, severity ladder, and worked findings',
        answers:
          'What exactly should a written code review look like on the page — header, ordering, severity labels — and how do I turn a vague observation into a finding someone can act on?',
        content: `# The written review

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

Strong: *"\`report.ts:64\` — \`buildSummary\` divides by \`rows.length\` with no guard. An
account with no transactions in the period yields an empty \`rows\`, so the call returns
\`NaN\`, which serialises to \`null\` and renders as a blank cell rather than a zero. Trigger:
any account created this month, on the monthly report. Smallest fix: return the zero-summary
object when \`rows.length === 0\`, and add that case to \`report.test.ts\`."*

### Concurrency

Weak: *"This looks racy."*

Strong: *"\`counter.ts:22\` — \`read\`, \`increment\`, \`write\` are three statements with an
await between the first and third, so two overlapping calls both read \`n\`, both write
\`n+1\`, and one increment is lost. Trigger: two clicks on the like button within the round
trip. Smallest fix: a single \`UPDATE ... SET n = n + 1\` rather than read-modify-write."*

### Error handling

Weak: *"Error handling could be better."*

Strong: *"\`sync.ts:117\` — the \`catch\` logs \`err.message\` and returns \`[]\`. A network
failure and an empty upstream result become indistinguishable to the caller at line 140,
which treats \`[]\` as authoritative and deletes the local rows that were not returned.
Trigger: any 502 from the upstream during a sync. Smallest fix: rethrow, or return a
discriminated \`{ ok: false }\` the caller already handles."*

### Cross-file invariant

Weak: *"Are you sure this is sorted?"*

Strong: *"\`search.ts:31\` — \`bisect\` assumes \`items\` is sorted by \`id\`, and the new
caller at \`import.ts:88\` passes the result of \`Promise.all\`, which preserves input order
rather than id order. Trigger: any import where the source file is not already id-ordered;
the lookup silently misses rather than throwing. Smallest fix: sort at the call site, or make
\`bisect\` take a \`SortedById\` branded type so the compiler catches the next caller."*

### Preference, correctly labelled

*"[Preference] \`handlers.ts:12-48\` — I would split the validation out of the handler. No
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
the top of the diff, which has no relationship to consequence.`,
      },
      {
        id: 'review-blind-spots',
        title: 'What diff-shaped review misses, and the procedures that recover each class',
        answers:
          'Which classes of defect does reviewing a diff systematically fail to catch — especially for an automated reviewer — and what specific procedure recovers each one?',
        content: `# Blind spots of diff-shaped review

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

**Procedure.** Before reading code, write one line: *this change claims to \\<X\\>*. Source it
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

- \`validateX\` that also writes, sends, or mutates. Callers reasonably assume validation is
  free of side effects and call it twice, or in a loop, or speculatively.
- \`getX\` that creates on miss. The caller inside a retry loop now creates N rows.
- \`isEnabled\` that returns a non-boolean, so \`=== true\` and truthiness disagree.
- A plural that returns one thing, or a singular that returns a list.
- \`safeParse\` / \`tryX\` that still throws on one branch.
- A unit missing or wrong in the name: \`timeout\` holding seconds where every caller passes
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
X holds at the new call site in \\<file\\>". That phrasing is accurate and still actionable.

---

## 5. Things that only exist at runtime

Performance, memory, query counts, lock contention, actual concurrency. Source review
produces plausible stories about all of them and can confirm none.

**Procedure.** Report these as **hypotheses with the measurement that would settle them**,
never as defects: "this loops over \`orders\` and calls \`fetchCustomer\` inside, which looks
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
is not arbitrary and the finding should be "this looks redundant; \`git blame\` points at
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
review rather than on the one that was wrong.`,
      },
    ],
  },

  rules: [
    {
      id: 'code-review/judge-against-the-request',
      strength: 'must',
      statement:
        'State in one line what the change claims to do, sourced from the request rather than the code, and judge the diff against that line rather than against the design you would have written.',
      evidence: {
        rationale:
          'Without a written claim, the reviewer’s baseline defaults to their own preferred implementation, which no diff can match — so every difference registers as a defect and the review has no natural end. Writing the claim down is also what catches the case where reviewer and author are evaluating different changes, which produces findings that are unanswerable because they are about work nobody agreed to do.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'This should use a state machine rather than three booleans.',
        good: 'Claim: "stop the upload retrying after a 413". The diff does that at upload.ts:44. Separately, and as a proposal rather than a finding: three booleans here are approaching a state machine.',
      },
      exceptions: [
        'Reviews explicitly commissioned as architecture or approach reviews, where the approach is the subject rather than the diff.',
      ],
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/label-rewrite-proposals',
      strength: 'must',
      statement:
        'Label any finding that requires restructuring beyond the request as a rewrite proposal, state what rebuilding costs, and keep it out of the ranked findings list.',
      evidence: {
        rationale:
          'A rewrite proposal filed as a defect leaves the author no legitimate way to decline, because declining a defect reads as negligence — so they either rebuild work that was not wrong or they start discounting every finding from you, correctness ones included. Naming the category moves the decision to the person who owns the schedule, which is where it can actually be made.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: '[Major] The retry logic should live in a middleware instead of the handler.',
        good: '[Proposal, not a finding] Retry logic in middleware would remove this duplication across six handlers. Roughly a day plus a change to the error contract — worth deciding separately; this diff is correct as it stands.',
      },
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/defect-or-preference',
      strength: 'must',
      statement:
        'Label every finding as a defect — falsifiable against an input, a contract, or an enforced convention — or as a preference resting on your judgment, and never soften a defect into a preference to be polite.',
      evidence: {
        rationale:
          'The two mistakes are asymmetric and both are expensive. A preference presented as a defect removes the author’s standing to disagree, so they comply against their judgment or discount the whole review. A defect presented as a preference — "you might want to check that unwrap" — is filed under optional and ships, because authors correctly read hedged language as permission to defer.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'You might want to think about whether that cast is safe, and I would probably split this function.',
        good: '[Defect] The cast at api.ts:19 is unchecked and the field is optional in the schema, so a response without it throws at line 22.\n[Preference] I would split this function; no behaviour differs either way.',
      },
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/finding-carries-a-failure-path',
      strength: 'must',
      statement:
        'Give every defect a location, the mechanism from code to wrong outcome, one concrete triggering input or sequence, and the smallest fix that closes it.',
      evidence: {
        rationale:
          'Each missing part transfers work back to the author: no location means searching, no mechanism means re-deriving your reasoning, no trigger means reproducing from scratch, no fix means designing the one you already have in mind. The trigger is the load-bearing part for the reviewer too — constructing a concrete instance forces you to execute the code mentally, which is where most confident false findings die before they cost anyone an afternoon.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'There might be a race condition in the cache.',
        good: 'cache.ts:88 — `has()` then `read()` without the lock. Two `refresh()` calls for one key both see `has() === false` and both write; the second drops the first’s subscriber list, so those callbacks never fire. Trigger: two requests for an uncached key inside the ~40ms fetch window. Fix: store the in-flight promise before awaiting it.',
      },
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/question-what-you-cannot-trigger',
      strength: 'must-not',
      statement:
        'Do not file as a defect anything for which you cannot construct a concrete triggering input, call ordering, or configuration; file it as a question naming what would confirm it.',
      evidence: {
        rationale:
          'A finding with no constructible trigger is a pattern match on the shape of the code rather than an observation about its behaviour, and pattern matches on shape have a high false-positive rate in exactly the places code looks unusual for good reasons. The cost of being wrong is paid across the whole review: one fabricated defect causes the author to re-open every other finding you filed.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: '[Major] Possible memory leak in the subscription handler.',
        good: '[Question] `subscribe` at feed.ts:30 adds a listener; I could not find the corresponding removal on unmount. Does the container unsubscribe elsewhere, or would a mount/unmount loop grow the listener list?',
      },
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/severity-by-consequence',
      strength: 'must',
      statement:
        'Assign severity from the consequence of not fixing multiplied by the reachability of the path, never from how confusing or unpleasant the code was to read.',
      evidence: {
        rationale:
          'Readability cost is felt continuously by the reviewer while a correctness cost is felt once, later, by someone else — so unexamined severity tracks the reviewer’s irritation, which is close to uncorrelated with consequence. The observable result is a four-deep ternary rated above an unawaited promise in a retry loop, and an author who learns that the labels track style stops using them to triage.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: '[Blocker] This nested ternary is unreadable. [Minor] `void sendEvent()` inside the retry loop.',
        good: '[Blocker] `void sendEvent()` at retry.ts:58 is not awaited, so a rejection escapes the retry and becomes an unhandled rejection. [Nit] The nested ternary at line 12 is hard to read.',
      },
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/blockers-stay-rare',
      strength: 'should-not',
      statement:
        'Do not label a finding a blocker unless it produces wrong behaviour, loses data, or opens a security hole on a reachable path, and keep blockers to a small fraction of the report.',
      evidence: {
        rationale:
          'A severity scale carries information only through the rarity of its top level. Once roughly a third of findings are blockers the author stops reading the labels and re-triages the whole list from scratch, which is strictly worse than having supplied no severities at all, because you have spent their attention twice.',
        confidence: 'strong',
      },
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/cap-and-rank',
      strength: 'should-not',
      statement:
        'Do not report more than about ten ranked findings in one review; collapse the rest into a counted tail and state that it is non-blocking.',
      evidence: {
        rationale:
          'Review attention is a fixed budget spent top-down, so findings eleven through thirty are not additional fixes — they are reading time subtracted from the findings above them. The cap is the forcing function for ranking, and ranking is the one part of the work the author cannot do for themselves, since they cannot see which of your findings you would trade away.',
        confidence: 'opinion',
      },
      exceptions: [
        'An explicitly commissioned exhaustive audit, where enumeration rather than triage is the deliverable.',
      ],
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/declare-blind-spots',
      strength: 'must',
      statement:
        'State once, near the top, what the review could not cover — files not opened, tests not run, runtime behaviour not measured, intent not recoverable — and report runtime claims as hypotheses with the measurement that would settle them.',
      evidence: {
        rationale:
          'A reader who does not know the review was diff-only reads the absence of architecture findings as approval of the architecture, which is the opposite of what the review established. The characteristic failure of automated review is uniform confidence across regions where evidence quality differs by an order of magnitude, and naming the boundary is what stops assertions from crossing it.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'The change looks performant and the architecture is sound.',
        good: 'Blind spots: diff only; callers of `applyDiscount` outside this package were not opened; tests not run. cart.ts:77 looks like an N+1 — hypothesis, settled by the query count on a 100-item cart.',
      },
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/lead-with-what-holds',
      strength: 'should',
      statement:
        'Open every review with two to four specific things the change gets right, naming the decision rather than offering a compliment.',
      evidence: {
        rationale:
          'A report containing only faults tells the author you were searching for faults, so they discount the whole set rather than weighing each finding on its merits. Naming correct decisions also protects them: a good choice nobody wrote down is routinely removed in the next revision by someone who cannot see why it was there.',
        confidence: 'opinion',
      },
      examples: {
        language: 'markdown',
        bad: 'Nice work overall! A few comments below.',
        good: 'The retry is bounded and jittered; the migration is reversible; every new branch has a test that fails without the change.',
      },
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/critique-the-change',
      strength: 'must-not',
      statement:
        'Do not address the author or attribute carelessness, capability, or intent in either direction — describe the code and the observed behaviour.',
      evidence: {
        rationale:
          'A statement about a person invites a defence of the person, which converts a fixable defect into a dispute in which nobody is discussing the code. It is also usually a false inference: the same output arises from a deadline, a missing primitive, or a requirement nobody wrote down.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'You clearly did not think about what happens when the upstream is down.',
        good: 'The catch at sync.ts:117 returns `[]` for a network failure, so the caller at 140 cannot distinguish it from an empty upstream result and deletes local rows.',
      },
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/answer-every-finding',
      strength: 'must',
      statement:
        'Answer every finding in a review of your change with exactly one of fixed and where, disputed with the mechanism, or accepted and deferred with a reason and a tracked location.',
      evidence: {
        rationale:
          'Silence is the only response that resolves nothing while looking like agreement: the reviewer reads an unanswered comment as accepted, the author reads it as dropped, and both leave with opposite beliefs about what was decided. The cost lands later, when the reviewer finds the unchanged line and reasonably concludes their reviews are not read, at which point the next one is shorter.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'Fixed the important ones, pushed.',
        good: 'Fixed (4): cache.ts:88 — a1b2c3d … Disputed (1): api.ts:40 unreachable, ingest filters empty lines at line 31. Deferred (1): db.ts:210 needs a migration window — #812. Not addressed: 0.',
      },
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/dispute-with-the-mechanism',
      strength: 'must-not',
      statement:
        'Do not dispute a finding by citing tenure, ownership, prevailing practice, or the reviewer being automated; cite the guard, type, constraint, or test that makes the described failure impossible.',
      evidence: {
        rationale:
          'An appeal to authority transfers no information about the code, so the reviewer cannot update and files the same finding on the next change to the same file. A mechanism is falsifiable, which is what lets the disagreement terminate: either the guard exists and the finding is withdrawn, or it does not and you have found the defect yourself.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'That cannot happen — I have owned this service for three years, and it is the pattern we use everywhere.',
        good: '`parseRow` is only reached from `ingest`, which filters empty lines at line 31, so the empty case is unreachable here. Added a test pinning that filter.',
      },
      exceptions: [
        'Findings that are genuinely about a different change than this diff, where the correct response is to say so and file it separately rather than to supply a mechanism.',
      ],
      verifiedBy: 'review-quality',
    },
    {
      id: 'code-review/convert-comments-into-tests',
      strength: 'should',
      statement:
        'When a finding claims an input or sequence is unhandled, write that case as a test and run it before writing any reply.',
      evidence: {
        rationale:
          'The conversion is cheaper than the argument in both branches, which is why it does not require knowing in advance which branch you are in: if it fails you had the bug and found it in four minutes, and if it passes your reply is evidence rather than a claim. It also converts a transient thread into a permanent guard, so the same comment cannot be filed again on the next change.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'The empty case is definitely handled — see the guard above.',
        good: 'Added `handles empty batch`; it passes on the current implementation, so this is already covered. Keeping the test so the behaviour stays intentional.',
      },
      verifiedBy: 'review-quality',
    },
  ],

  verification: [
    {
      id: 'review-quality',
      kind: 'self-review',
      description:
        'Confirm the review is answerable — grounded in the request, ranked by consequence, honest about its blind spots — and that any review received has been fully answered.',
      blocking: true,
      questions: [
        'Did you write down what the change claims to do, sourced from the request rather than the code, and is every finding a failure to meet that claim rather than a departure from how you would have built it?',
        'Is every approach-level disagreement labelled a rewrite proposal with its cost, and kept out of the ranked findings?',
        'Is every finding labelled defect or preference, with no defect hedged into a preference and no preference stated as binding?',
        'Does every defect carry a location, the mechanism, one concrete triggering input or sequence, and the smallest fix — and is anything you could not trigger filed as a question instead?',
        'Does each severity follow from consequence times reachability rather than from how hard the code was to read, and are blockers a small fraction of the total?',
        'Are findings ranked and capped at roughly ten, with repeated instances of one cause collapsed into a single counted finding?',
        'Did you state what the review could not cover — files not opened, tests not run, runtime not measured — and report every runtime claim as a hypothesis with its measurement?',
        'Did you enumerate the inputs the change accepts and point at the line or test handling each, and read the body of every new or renamed function against what its name promises?',
        'Does the review open with specific things the change gets right, and does every finding describe the code rather than the author?',
        'If you are receiving a review: does every finding have exactly one of fixed-and-where, disputed-with-a-mechanism, or deferred-with-a-reason-and-a-location, with the not-addressed count written down and equal to zero?',
      ],
    },
  ],

  relatedSkills: ['design-review', 'code-quality', 'engineering-discipline'],
}
