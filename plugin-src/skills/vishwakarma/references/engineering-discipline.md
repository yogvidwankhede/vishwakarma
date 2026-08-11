# Engineering Discipline

The characteristic failure of a capable agent is not incompetence — it is **confident motion in an
unverified direction**. It picks one reading of an ambiguous request and runs with it, builds
machinery for requirements nobody has yet, edits lines nobody asked about, and reports success
against a goal it never made checkable. What makes these failures hard to catch is that each one
looks like good practice from the inside: the over-abstracted version follows recognised design
patterns, the tidied diff follows the style guide, the confident plan reads like competence. They
are wrong on **timing**, not on taste — the right idea produced before the evidence that would
justify it. Every principle in this file exists to convert motion into verified progress, and this
file governs every other domain in this skill. Colour, motion, layout and accessibility all sit
downstream of it.

---

## 1. Resolve ambiguity out loud

When a request admits more than one reasonable reading, enumerate the readings, attach an effort
estimate and a consequence to each, state which you would choose and why, then wait. **The failure
is silent selection, not wrong selection.** Choosing the wrong branch after showing the fork is a
recoverable disagreement; choosing it invisibly means the person only discovers the fork existed
when the finished work does not match what they pictured, at which point the cost of the mistake is
the entire build rather than one sentence.

"Make the search faster" is the canonical example, because it is not one project but three, and they
share almost nothing.

| Reading | What you would actually do | Rough effort | What improves | What does not |
|---|---|---|---|---|
| Reduce p95 query latency | Index the hot columns, kill the N+1, cache the top queries | Half a day | Time-to-first-result on a cold query | Behaviour under load; the spinner still shows |
| Raise throughput under concurrency | Connection pooling, queue the expensive path, add read replicas | Several days | Stability at peak; p99 under load | Single-user latency, possibly worsened by queueing |
| Improve *perceived* speed | Optimistic rendering, skeletons, debounced incremental results, prefetch on intent | A day, mostly front-end | How fast it feels; abandonment rate | Every server-side number stays exactly where it was |

Different techniques, different costs, different success measures — and a fix for one can measurably
worsen another, since queueing to protect throughput adds latency and prefetching to improve
perceived speed adds load.

Present this as a **costed menu, not a question**. A question ("did you mean latency or
throughput?") invites a one-word answer that resolves nothing, because the person answering has
usually not costed the options either — they pick the word that sounds right and you both discover
the mismatch later. A menu with effort and consequence attached lets them choose with the tradeoff
visible, and it does the analytical work for them. Add your recommendation: "I would start with
perceived speed — it is a day, it does not touch the data layer, and the abandonment metric suggests
that is where the pain is" beats neutrality.

The same discipline applies to design requests, which are ambiguous more often than technical ones.
"Make it feel more premium" could mean tighter type, calmer colour, slower motion, more generous
spacing, better photography, or fewer elements — and those pull against each other.

---

## 2. Measure before you change

Report the present number before proposing a change to it. Current p95, current coverage percentage,
current bundle size in kilobytes over the wire, current error rate per thousand requests, current
contrast ratio, current frame time on the target device. State the number, state how you obtained
it, then propose.

The mechanism is that **without a baseline, "better" is unfalsifiable**. Work with no measured
starting point has no defined end — there is always another optimisation available, and no signal
that says stop. Worse, it has no way to detect a regression. A change that improves the number you
did not measure while worsening the one you did is indistinguishable from success, and you will
report it as success in perfect good faith.

The failure is concrete and common. Asked for a smaller bundle, you lazy-load three routes, the main
chunk drops by 180KB, and you report a win. What you did not measure is that the deferred chunks are
now fetched on navigation over a previously idle connection, so time-to-interactive on the second
page went from 400ms to 1.9s. The number you optimised got better and the experience got worse. Had
both been recorded first, the tradeoff would have been visible in the same breath as the change.

A baseline needs three properties. It must be **taken under conditions you can reproduce** — a
latency figure from your laptop on a warm cache is not a baseline, it is a mood. It must be **the
number that matters to the person asking**, usually a percentile rather than a mean, because a mean
hides exactly the tail people complain about. And it must be **recorded, not remembered**, because a
number held in working memory drifts toward whatever makes the result look good.

When a number genuinely cannot be obtained, say so and name the substitute. "I cannot measure
production latency from here; I am using local timings on a throttled connection as a proxy, which
will understate network cost" is honest and still useful. Silently proceeding without either is not.

---

## 3. Restate every task as a checkable condition

Convert imperatives into observable outcomes before writing anything. The restatement is not
ceremony — it is where you find out whether you understand the request.

"Add validation" becomes: *these specific invalid inputs are rejected with these specific errors,
proven by these tests.* Naming the inputs forces the questions that would otherwise surface in
review — is an empty string invalid, is whitespace trimmed first, is the rejection client-side,
server-side or both.

"Refactor this" becomes: *the existing tests pass before and after, and the public surface is
unchanged.* That is not a paraphrase, it is a genuinely good operational definition of refactoring,
and it has teeth. If the tests do not pass afterwards, it was not a refactor. If the public surface
changed, it was not a refactor either — it was a redesign wearing a refactor's clothes, and it needs
to be discussed rather than merged.

"Make it accessible" becomes named criteria with thresholds: *every interactive element reachable by
keyboard in a sensible order, visible focus at 3:1 against its adjacent colour, text at 4.5:1, form
fields with programmatically associated labels, no keyboard trap in the modal.* Six checkable
statements instead of one aspiration.

The mechanism is that **crisp success criteria are what make unsupervised iteration possible**. An
agent with a checkable condition can loop — attempt, check, adjust, check again — until the
condition holds, without asking anyone anything. An agent with a vague goal must return to a human
after every step to ask whether this counts as done yet, which is expensive and, in practice, where
most abandoned tasks die. The restatement is what buys you autonomy.

And if you cannot state what would prove the task complete, **that inability is the finding**. "I
cannot write a success condition for 'clean up the API layer' — success might mean fewer endpoints,
consistent error shapes, or better types, and those are three different weeks" is a useful message.
Guessing which one and building it is not.

---

## 4. Every plan step carries its verification

Write the plan as `step → verification` pairs before execution begins, not as a list of intentions.
A step whose check is "it should work" is not a step; it is a wish with a bullet point.

A real plan looks like this:

| Step | Verification |
|---|---|
| Add a `rate_limit` middleware at 10 req/min per key | `curl` the endpoint eleven times in a minute; the eleventh returns 429 with a `Retry-After` header |
| Persist the counter in Redis rather than memory | Restart the process mid-window; the count survives, the eleventh request still fails |
| Exempt the health check path | 200 health checks in a minute all return 200 |
| Emit a metric on every rejection | The counter appears in `/metrics` and increments by exactly one per 429 |

Note that none of these are automated tests and all of them are checks. **Manual verification is
legitimate when it is specific enough to fail** — the eleventh-request check names the input, names
the expected output, and would visibly not happen if the middleware were misconfigured. "Verify rate
limiting works" is not specific enough to fail, because whoever performs it will find some sense in
which it worked.

The mechanism is that **verification written after the fact is written to pass**. Once the code
exists, the check you invent is shaped by what the code does — you unconsciously pick the input that
works, the assertion that holds, the path you happened to exercise while developing. Writing the
check first shapes it by the requirement instead, and requires the code to come to it. This is the
same reason test-first has value, generalised to steps that have no tests. A plan with verifications
attached is also honest about its own size: a step taking one line to describe and eight to verify
was probably three steps.

---

## 5. Reproduce before you repair

Do not modify code in response to a bug report until the reported failure happens on demand, under
your hand. Until then you do not have a bug, you have a story about a bug, and code changed against a
story fixes whatever you imagined rather than whatever is broken.

Write the failing test first, and confirm it fails **for the reported reason**. This second half does
most of the work. A test failing with `AssertionError: expected 3, got 2` is evidence about the
reported bug. One failing with `TypeError: cannot read property 'id' of undefined` is evidence your
test setup is wrong, and it goes green the moment you fix the setup — which you then read as having
fixed the bug. This failure mode is quiet, common, and produces a confident report of a fix that
changed nothing relevant. Read the message on the red run as carefully as you would on a real crash.

For intermittent failures, **characterise the frequency before and after**. Run the reproduction
enough times to get a rate: fails 3 times in 50, say. A bug that reproduces one time in twenty is
not fixed by one clean run — a single pass afterwards is a roughly 95% likely outcome even if you
changed nothing. The post-change evidence needs a comparable number of runs, reported as "0 in 200
runs, previously 3 in 50" rather than "fixed". Where the flake is timing-dependent, run it under
load or with a delay injected at the suspected race point; a race that appears at 6% naturally often
appears at 80% under contention, which turns an unusable reproduction into a usable one.

**Regression fencing is a separate step, not an afterthought.** The failing test proves the bug
exists. A regression test proves it stays gone, and the two are frequently not the same test — the
reproduction is often ugly, slow and specific to the debugging session, while the fence should be
fast, readable and pointed at the invariant that was violated. Decide explicitly whether the
reproduction is fit to keep or whether a cleaner test should replace it, and do that before closing
the task, because nobody ever comes back to write it later.

---

## 6. Debugging: hypothesis discipline

A bug is a **discrepancy between the model in your head and the behaviour of the system**. The system
is not confused; it is doing exactly what it was told. Only the model is wrong. That framing points
at the actual work: debugging is not repair, it is **making the hidden state visible** until the
discrepancy is obvious, at which point the fix is usually trivial and frequently a single line. Most
debugging time is lost on the wrong activity — defending the model, explaining why the system could
be behaving this way while the model stays correct, rather than instrumenting until it has to change.

**Read the actual error before theorising.** The stack trace names the frame. The message names the
condition. The full `Caused by` chain names the origin, often several layers below the frame that
surfaced it and in a different subsystem. Truncated output hides exactly the part that matters, so
widen it before reading. A theory formed first is a guess with extra steps, and worse than no theory
because it directs the next twenty minutes of searching — the system already did the diagnostic work
and printed the answer, and declining to read it is choosing to re-derive it slowly and probably
wrongly.

**Form one hypothesis at a time, state what observation would disconfirm it, then make that
observation.** The disconfirmation clause is the load-bearing part. "The cache is stale" is not a
hypothesis you can act on; "if the cache is stale, then logging the key's write timestamp will show
it older than the last mutation — and if it shows newer, the cache is not the problem" is. Without
the disconfirming observation named in advance, you will find confirming evidence, because
confirming evidence is available for almost any theory in a large enough system.

Changing two things at once destroys the information the run would have produced. Adjust the timeout
and add a retry, and when the failure stops you have learned nothing about the failure and shipped
one change you do not need — which then sits in the codebase as an unexplained constant nobody dares
remove. One change, one observation, then decide.

**Bisect.** Three axes, and the skill is picking the right one:

- *On the input.* Minimise the reproduction until every remaining element is load-bearing — remove
  a field, re-run; remove a step, re-run. The endpoint is a case small enough that the bug has
  nowhere to hide, frequently reached before you understand the cause, which is fine. Each element
  removed without the failure disappearing is one variable eliminated.
- *On the history.* Find the commit where behaviour changed. Often faster than any amount of
  reasoning, and immune to being wrong about the architecture. It requires a verified-good state to
  bisect toward, which is one practical reason every change should have been verified when it landed.
- *On the pipeline.* Binary-search the stages between the known-correct input and the observed-wrong
  output. Assert the invariant at the midpoint; whichever half the corruption is in, halve again.
  For a pipeline of eight stages this is three observations, not eight.

**Instrument rather than infer.** A logged value is evidence; a value you believe is present is a
belief, and beliefs are what got you here. Prefer a temporary assertion or a dump at the boundary
over reasoning about what should be there — reasoning is the faculty that produced the wrong model.
Print the whole object, not the field you expect to be wrong, because the surprise is usually
somewhere you were not looking. Tag temporary instrumentation with something unique and searchable
(`XXDBG`, a ticket number) so removal is one search, and remove it before finishing.

**The three-failed-guesses rule.** After three disconfirmed hypotheses, stop generating a fourth from
the same model. Three wrong predictions is strong evidence that the model producing them is wrong at
a level below the hypotheses, and a fourth guess comes from the same broken distribution. Escalate
instead, in specific forms: read the source of the dependency whose behaviour you assumed rather than
trusting its documentation; get a real trace rather than a log line; question the architecture — is
the request even reaching this service; or check the most under-questioned assumption of all,
**whether the thing you are debugging is the thing that is broken.** A meaningful fraction of long
sessions end with the discovery that the failing component was fine and its input was wrong, that the
deployed binary was not the code being read, or that the test asserted something nobody intended.

**Symptom versus cause.** A fix that makes the symptom disappear without an explanation of the
mechanism is a coincidence you have not disproved. A delay that fixes a race, a null check that
stops a crash, a retry that stops an intermittent failure — each may be correct, but none is *known*
to be correct until you can say why the value was null, what the race was between, or what made the
first attempt fail. The test: can you state, in one sentence, the causal chain from root cause to
observed symptom? If not, you have suppressed a signal and the fault is still live, now with its
warning light disconnected.

---

## 7. Look at the data before you design against it

Inspect actual values before writing the code that consumes them. Real field names with real
capitalisation. Real nulls, in the fields the schema said were required. Real encodings, including
the ones that are not UTF-8 because a spreadsheet touched the file in 2019. Real cardinality — is
this enum five values or five thousand. Real distribution, because the mean says nothing about the
row that breaks the layout. Real edge rows, first and last and the odd ones between.

The mechanism is that **a schema you imagined is a schema you will debug at runtime.** The common
shape of this failure is code written to handle the example in the ticket, which breaks on the shape
in production — the ticket showed one clean record, and production has the record where
`user.profile` is `null` rather than an empty object, the one where the timestamp is a string in one
API version and an integer in another, the one where a name field contains a newline. None of these
are exotic. All are invisible until you look.

The practice is short: print a sample of ten, not one. Count the nulls per column. Check the
extremes — longest string, largest number, earliest and latest date, most and fewest child records.
Look for values that should not exist and usually do: empty strings distinct from nulls, sentinel
dates like 1970-01-01, negative quantities, duplicate keys in the column you assumed was unique.

**This applies as much to design work as to data work.** A card designed around a seven-character
title breaks on the ninety-character one, and product catalogues are full of ninety-character
titles. Before designing the container, look at the real content at real lengths: the longest
product name, the user with no avatar, the notification list with one item and the one with four
hundred, the currency needing four digits before the decimal, the language that runs 40% longer than
English. Designing against the friendly sample and meeting the real distribution in QA is the same
failure as trusting the schema, with the same result — a rebuild after the work looked finished.

---

## 8. Abstraction arrives on the second case

Extension points, strategy objects, configuration layers, injected collaborators, plugin registries
and optional flags need a **real second caller** to exist. Not a plausible one, not a likely one — a
present one, in the codebase, with its own requirements visible. The right response to "we might
need X later" is to write it later, when the shape of X is known rather than guessed.

The mechanism is that **an abstraction guessed from one example encodes the accidents of that
example as if they were the general case.** With one instance in hand, nothing distinguishes the
essential from the incidental — every property of the single case looks structural, because there is
nothing to contrast it against. The second real case then does not fit, and you pay twice: once to
build the seam in the wrong place, once to move it, with the move complicated by whatever came to
depend on it meanwhile. The version with no abstraction pays once, later, with full information.

The worked counter-example, which is not exaggerated:

> A checkout needs percentage discounts. What arrives is a `DiscountStrategy` interface, an
> `AbstractDiscount` base holding shared validation, three concrete implementations, a
> `DiscountRegistry` mapping codes to strategies, a factory reading the registry, and a config file
> for registering future strategies without code changes — two hundred lines across seven files.
>
> The requirement was three named codes, each taking a fixed percentage off the subtotal. A six-line
> function with a three-entry lookup table covers it completely, and — the part that gets missed —
> is *easier* to grow into the strategy version later, because by then the second and third real
> discount types will have shown where the variation lives. It turns out to live in eligibility
> rules, not arithmetic. The hierarchy abstracted the arithmetic: it put the seam in the one place
> the variation was not.

The tell is that the abstraction is beautiful and the requirement is small. When the design is more
interesting than the problem, the design is probably premature. And "we might need it later" is
often true and still not a reason — the question is not whether the need will arrive but whether you
have enough information now to build the right thing for it, and with one example you do not.

---

## 9. Volume is a design signal

If the solution is several times longer than the problem appears to warrant, stop and re-solve rather
than polish. Two hundred lines where fifty would do is not a formatting problem, and better naming
or a cleaner file layout only makes an oversized solution pleasant to read — which is worse, because
it delays the moment someone notices it is oversized.

The mechanism is that excess volume is almost always a symptom of a wrong decomposition upstream.
Code handling cases the requirement does not have, code converting between two shapes that should
have been one, code defending against conditions the caller already excluded, parallel branches
differing in one value — each is a structural mistake presenting as a length problem. Re-solving
treats the cause, and the re-solved version is usually written faster than the original because the
problem is now understood.

The self-check that works: **ask what a demanding reviewer would call unnecessary, and remove it
before showing the work.** This is more reliable than asking whether the code is good, because it
forces an adversarial reading rather than a satisfied one. The candidates are consistent — the
config option with one value, the interface with one implementation, the wrapper forwarding every
call unchanged, the error path for a condition the type system already prevents, the comment
restating the line beneath it, the helper used once directly above. A related tell: if explaining
the design takes longer than explaining the problem, the design is too big.

---

## 10. Every changed line traces to the request

Before finishing, read your own diff — the whole of it, as a reviewer would — and delete anything
you cannot justify by pointing at what was asked. Reformatting, added type hints, added docstrings,
rewritten comments, reflowed whitespace, renamed local variables and "improved" adjacent logic are
**defects when they ride along with an unrelated change**, however much better they make the file.

The mechanism has three costs, each sufficient on its own.

*Review cost.* The reviewer cannot separate the risky change from the cosmetic one. A twelve-line
diff gets read line by line; a two-hundred-line diff of which twelve matter gets skimmed. Burying a
real change in cosmetic noise is functionally a way of avoiding review, and the one time it matters
is the time the buried line was wrong.

*History cost.* Blame stops pointing at the reason a line exists. Someone investigating an incident
six months from now runs blame on the failing line, lands on your commit, reads a message about an
unrelated bug fix, and finds no connection — because that line was only touched by the formatter
that ran on save. The trail back to the original reasoning is severed, and the line then gets changed
by someone who does not know why it was there.

*Semantic cost.* A "cosmetic" restructure occasionally changes behaviour, in the part of the diff
nobody is examining, because it was filed under formatting. Reordering imports can change
initialisation order. Converting a loop to a comprehension can change when an exception is raised.
"Simplifying" a conditional can alter short-circuit evaluation and therefore which side effects run.
Each is rare; collectively they are why mixed diffs are a defect rather than a style preference.

A genuine improvement noticed along the way should be offered as its own change. "While in this file
I noticed `parseConfig` swallows the original exception — happy to fix that separately" costs one
sentence, preserves the clean diff, and is more likely to get fixed, because it is visible rather
than hidden inside someone else's review.

---

## 11. Clean up your own mess only

Remove what your change orphaned — the import no longer used because you deleted its only call site,
the variable your edit made dead, the private helper that now has no callers, the fixture for the
case you removed. That cleanup is part of the change, and leaving it is how a codebase accumulates
confusing residue.

Leave pre-existing dead code alone, and **report it**. The mechanism is that **ownership of the mess
determines the permission to touch it.** Code your change orphaned you understand completely — you
know it is dead because you are the reason it is dead. Code that was already unreferenced you do not
understand at all, and "unreferenced" is a weaker claim than it looks: it may be called reflectively,
by name from configuration, from a template, from a serialised job in a queue, from a migration that
runs annually, or from another repository. Static analysis finds the callers it can see.

Deleting code you do not understand as a side effect of an unrelated task is the **highest-variance
action available for the lowest possible reward**. The upside is a slightly smaller file nobody asked
for. The downside is an outage in a system you were not working on, discovered at a time unrelated to
your change, by someone with no reason to connect the two.

The report costs nothing: "`legacyExportHandler` in `reports.ts` has no references I can find and
appears unused since the v3 migration — worth deleting separately if someone can confirm the batch
jobs do not call it." That is a real contribution. The deletion is not yours to make.

---

## 12. Match the surrounding conventions

Conform to local quote style, import ordering, naming patterns, typing conventions, error idioms,
test structure and file organisation, **even where you disagree with them**. If the file uses
`snake_case` for internal helpers, so does your addition. If errors are returned rather than thrown,
yours are returned. If the tests use a hand-rolled fixture builder rather than the framework's
factory, use the builder.

The mechanism is that **consistency with the codebase is worth more than consistency with your
preferences, because the codebase is what the next reader has to hold in their head.** Reading code
is pattern matching; one function written to different conventions costs the reader an interruption
at the moment they are concentrating, and the interruption carries no information — they stop to work
out whether the difference is meaningful, and it is not. Multiply by every file an inconsistent
contributor touches and the codebase becomes a set of dialects, each learned separately. The
stronger form of the argument: a convention's value is almost entirely in its uniformity, not its
content. Tabs versus spaces has no defensible technical winner, but a file with both is worse than a
file with either — so a locally inconsistent improvement is a net loss even when it is real.

Propose a style change as its own task if it matters enough. "This codebase mixes `Result` returns
and thrown exceptions for the same class of failure, which makes call sites hard to audit — worth a
dedicated pass to pick one" is a useful observation. Unilaterally adopting your preferred one in the
file you happened to be editing is how the mix got there.

The exception is narrow: where the local convention is actively unsafe rather than merely different
— an idiom that swallows errors, a pattern that leaks credentials into logs — matching it propagates
a defect. Name the problem explicitly, do not silently deviate, and get a decision.

---

## 13. Ship in independently verifiable slices

Build in this order: **naive and correct first, generalise second, swap in the production backend
third, add configurability last.** Each slice should be deployable on its own and checkable on its
own, which means each one ends with something that runs and something that proves it ran correctly.

Concretely, for a feature importing records from a third-party API into a queue-backed pipeline:
first, a synchronous function that fetches one record and writes it to the database, verified by
reading that record back. Then the same function over a list, verified on ten. Then the queue,
verified by enqueuing ten and confirming ten rows appear. Then retry and backoff, verified by forcing
a failure. Then configuration for batch size and concurrency, verified at two settings. Five slices,
five checks, a working system at every point.

The mechanism is that **a large change that fails gives you no information about which part failed.**
Debugging cost scales with the size of the slice, not the size of the bug — a one-character mistake
inside a two-thousand-line change costs a search over two thousand lines; the same mistake in a
fifty-line slice costs a glance. Naive-first compounds the benefit, because the naive version doubles
as an oracle: when the optimised version disagrees with it, you have a differential test with a
known-good side, the cheapest debugging position available.

The ordering also protects against building the wrong thing well. The naive slice is the earliest
point at which someone can look at real behaviour and say "that is not what I meant", at a fraction
of the full cost. Generalisation and configurability assume the requirement is settled, which is why
they come last. Resist the pull toward the interesting part first: starting with the production
backend means the boring, load-bearing correctness question gets answered last, under time pressure,
if at all.

---

## 14. Push back, and stop when confused

If a simpler approach than the one requested exists, **name it before implementing the requested
one**. Not instead of — before. "You asked for a caching layer here; a compound index on
`(tenant_id, created_at)` may make this query fast enough with no invalidation surface to maintain.
Want me to measure that first, or proceed with the cache?" That is thirty seconds of attention
against a week of infrastructure they may not need. Requests are usually written by someone who
already picked a solution, often the first one they thought of rather than the best — they may not
have known about the index, and they are not offended to hear about it.

If something does not make sense, state **precisely what does not make sense** and ask. Precision is
what separates a useful stop from an unhelpful one. "The spec says the archive endpoint is
idempotent, but it also says each call appends an audit row — those cannot both be true unless the
audit row is exempt from the idempotency guarantee. Which is it?" identifies the exact contradiction
and can be answered in one line. "I'm confused about the archive endpoint" cannot.

**Continuing while confused is the expensive failure.** Work built on a misunderstanding does not
need correcting, it needs discarding — the misunderstanding sits upstream of every decision made
after it, so the structure that grew from it is shaped wrong throughout rather than wrong in one
place. Two hours of confused work is rarely two hours from being right; it is usually two hours to
be thrown away, plus the sunk-cost pressure that makes throwing it away harder.

**Surface inconsistencies rather than silently reconciling them.** When two stated requirements
conflict, the conflict is the finding. The temptation is to pick the reading that makes both
approximately true and proceed, which feels accommodating and is the worst option available: the
person never learns their requirements conflict, the reconciliation is invisible, and the resulting
behaviour matches neither thing they asked for. The same applies when a requirement conflicts with
the code — "the ticket says users can have multiple active sessions, but there is a unique constraint
on `(user_id, active)` added six months ago" is exactly the observation that saves a rewrite.

---

## 15. Calibrate to the stakes

This discipline biases toward caution, and caution has a cost. Every clarification is an interrupted
person, every baseline a delay before work starts, every costed menu a paragraph someone has to read.
Applied uniformly, these practices would turn a two-minute task into a twenty-minute negotiation —
a different failure from confident motion in the wrong direction, but a failure all the same.

A typo fix does not need a costed menu of interpretations. A copy change to a single string does not
need a baseline. A one-line null check with an obvious cause does not need a plan with verification
pairs. Fix it, say what you did, move on.

Apply the full ceremony when at least one of these holds:

| Condition | Why it raises the bar |
|---|---|
| The change is **irreversible** | Migrations, deletions, sent emails, published packages, anything writing to production data — the recovery path is expensive or nonexistent, so verification has to come before rather than after |
| It touches **shared state** | Schemas, shared config, common utilities, public API surface — the blast radius extends past the thing you were asked about, to callers you have not read |
| The **cost of being wrong is high** | Payments, authentication, permissions, anything user-visible at scale, anything with a legal or safety dimension |
| The request is **genuinely ambiguous** | More than one reasonable reading with materially different cost or outcome — not merely underspecified in ways any reading would resolve identically |
| You have **already been wrong here** | A retry after a failed attempt earns more rigour than the first attempt did, because the evidence now says your model of this area is unreliable |

Otherwise, use judgment, and let the judgment be visible in the output rather than the process. A
short task can carry a one-line version: state the assumption you made instead of asking about it,
name the number instead of building a harness for it, mention the thing you noticed instead of filing
it formally. This is a set of mechanisms for avoiding specific failures, not a checklist to be
executed at full weight regardless of context.

**A skill that turns a one-line fix into a clarification interview has failed differently, but it
has still failed.**

---

## Pass conditions

- For every request admitting more than one reasonable reading, were the readings enumerated with an effort estimate and a consequence each, a recommendation stated, and execution paused — rather than one reading silently selected?
- Was the current value of every metric proposed for change reported first, with measurement conditions named — and where a baseline could not be obtained, was the substitute proxy and its bias stated explicitly?
- Was every task restated as an observable condition — specific inputs, specific outputs, named thresholds — before any code was written, and where no such condition could be written, was that inability reported as the finding rather than resolved by guessing?
- Does every plan step have a paired verification naming an input and an expected result, written before execution rather than after the code existed, with no step checked by "it should work"?
- Did every bug fix begin with an on-demand reproduction that failed for the reported reason, confirmed by reading the failure message and not just the red status?
- For intermittent failures, was the failure rate characterised over multiple runs both before and after, with the run counts reported?
- Was the regression fence decided on explicitly — reproduction kept, or a cleaner test written — before the task was closed?
- Was the full error output, including the complete `Caused by` chain, read before any hypothesis was formed?
- Was each hypothesis paired with a named disconfirming observation, and was exactly one thing changed per observation?
- After three disconfirmed hypotheses, was the model escalated — dependency source read, trace gathered, architecture questioned, or the assumption that this component is the broken one re-examined — rather than a fourth guess produced?
- Is all temporary instrumentation tagged with a unique searchable marker, and was it removed before completion?
- Can the causal chain from root cause to observed symptom be stated in one sentence, or was a symptom suppressed without a mechanism?
- Were real values inspected before code was written against them — sample printed, nulls counted, extremes and cardinality checked — and for design work, was the component checked against real content at real lengths, including the longest and the empty case?
- Does every abstraction, extension point, configuration option and injected collaborator have a second real caller present in the codebase today?
- Is the solution proportionate to the problem, and was an adversarial "what would a demanding reviewer call unnecessary" pass run with the results removed?
- Does every changed line in the diff trace to something that was asked for, with no reformatting, added annotations, rewritten comments or improved adjacent logic riding along, and were improvements noticed in passing offered as separate changes instead?
- Was orphaned code from this change removed, and pre-existing dead code left in place and reported by name and location?
- Does the new code match local quote style, naming, typing and error idioms, with any disagreement raised as its own proposal rather than applied unilaterally?
- Was the work delivered as slices that are each independently deployable and independently checkable, in the order naive, generalised, production backend, configurable?
- Where a simpler approach than the one requested exists, was it named before the requested one was implemented?
- Was every conflict between stated requirements, or between a requirement and the existing code, surfaced rather than silently reconciled?
- Was the level of ceremony matched to reversibility, blast radius, cost of error and genuine ambiguity — with low-stakes changes handled directly rather than escalated into clarification?
