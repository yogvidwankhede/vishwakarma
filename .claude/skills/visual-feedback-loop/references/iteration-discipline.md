# Iteration discipline

The loop's value is attribution. Everything below protects it.

## One class of finding per pass

A *class* is a kind of defect, not a single instance. "Every near-miss spacing value" is one
class and may be eleven edits; "spacing, plus the type scale, plus the accent colour" is
three classes and must be three passes.

The reason is not tidiness. Fix three classes at once, re-render, and see the page improve
less than expected: you now cannot tell which of the three helped, which did nothing, and
which actively hurt. The information you were running the loop to get is exactly the
information batching destroys.

Order classes by what they affect. Structure before surface: ranking and spacing change what
every later judgement is about, so correcting colour before hierarchy means re-judging the
colour once the hierarchy moves.

## Every pass names its expected delta

Before re-rendering, write down what should change and what must not. "The section gaps go
from 32 to 96; nothing inside a card moves." Then check both halves. A correction that
produces its intended change *and* three unintended ones is a regression wearing a fix, and
without the prediction you will only notice the intended half.

This is also the cheapest possible regression guard: the previous pass's screenshots are
already on disk, named for the pass.

## The three ways the loop goes wrong

**Thrashing.** Two passes that undo each other — tighten the gaps, then loosen them. The
cause is always an unstated target: neither pass said what value it was aiming at, so each
was correcting toward a feeling. Fix by naming the number before editing.

**Cosmetic convergence.** The contract score rises every pass and the page does not get
better. This means the loop is optimising the measurable subset while the actual defect is in
what only pixels show — usually hierarchy. Measurements cannot detect their own
incompleteness, so a rising score with a static screenshot is a signal to stop measuring and
look.

**Fixing the screenshot.** Suppressing a symptom where it was observed rather than where it
is caused: a `max-width` on the one paragraph that overflowed at 320px, when the container
has no inline padding. The test is whether the fix generalises to the next instance. If it
does not, it is a patch on the observation, not the cause.

## Budget the loop

Give it a fixed number of passes — three to five is usually right — and treat exhausting the
budget as a result, not a failure. What you report then is: the classes closed, the classes
still open with their measurements, and the reason the remainder was not attempted. That is a
far more useful artefact than a sixth pass that runs out of ideas and declares victory.

An unbounded loop reliably ends the same way: with cosmetic changes to whatever is easiest to
change, because the alternative is admitting the remaining defect is structural.

## Stopping conditions

Stop when **every finding is closed or explicitly deferred with a reason** — the reason being
a real one: needs a decision only the user can make, needs an asset that does not exist, or
is outside the requested scope.

Do not stop because:

- the score reached a number. The score is a trend line, and the summary's `checked` count
  is the more honest figure.
- nothing new was found in a pass that ran only the queries. Add a viewport, or look at the
  picture.
- the page looks fine. That is an observation, and it belongs in the report as one, alongside
  the measurements — not in place of them.

## When the same finding keeps coming back

Across builds, not across passes. A defect this loop catches every single time is not a
defect in the output; it is a gap in the guidance that produced the output.
`methodology-feedback` owns that: turn it into a rule with a mechanism, or the loop pays for
it forever.
