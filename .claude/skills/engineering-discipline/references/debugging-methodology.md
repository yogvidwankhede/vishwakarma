# Debugging methodology

A bug is a discrepancy between the model in your head and the behaviour of the system. The
system is doing exactly what it was told; only the model is wrong. Everything here follows from
that: the work is not repair, it is making hidden state visible until the discrepancy is
obvious, at which point the fix is usually one line. Load this when something is broken and the
cause is not yet observed.

---

## 1. Reproduce before you repair

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

## 2. Debugging: hypothesis discipline

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

## Pass conditions

- Did every bug fix begin with an on-demand reproduction that failed for the reported reason, confirmed by reading the failure message and not just the red status?
- For intermittent failures, was the failure rate characterised over multiple runs both before and after, with the run counts reported?
- Was the regression fence decided on explicitly — reproduction kept, or a cleaner test written — before the task was closed?
- Was the full error output, including the complete `Caused by` chain, read before any hypothesis was formed?
- Was each hypothesis paired with a named disconfirming observation, and was exactly one thing changed per observation?
- After three disconfirmed hypotheses, was the model escalated — dependency source read, trace gathered, architecture questioned, or the assumption that this component is the broken one re-examined — rather than a fourth guess produced?
- Is all temporary instrumentation tagged with a unique searchable marker, and was it removed before completion?
- Can the causal chain from root cause to observed symptom be stated in one sentence, or was a symptom suppressed without a mechanism?
