# The durable product brief

Phase 1 produces a five-line brief per screen. That brief is correct and it is thrown away,
which is why the third screen of a product is often designed for a different audience than
the first. The brief describes *this* screen; a product brief describes the thing all the
screens belong to, and it is worth writing down separately because it outlives every one of
them.

The distinction is not length, it is decay rate. The job of a screen changes whenever the
screen changes. Who the product is for, and what it refuses to be, changes perhaps twice in
a product's life. Mixing the two into one artefact means the durable half gets rewritten
every time the perishable half does, and rewriting is where it drifts.

## What belongs in it

**Audience, with the expertise level stated.** "Operations staff who live in this tool eight
hours a day" and "members of the public who will see this once" produce different densities,
different affordance sizes, and a different amount of explanatory text. An unstated audience
defaults to neither, which is how an interface ends up with tooltips a daily user does not
need and density a first-time user cannot parse.

**The job, at product scale.** One sentence naming what the product does for that audience.
This is the sentence every screen has to be consistent with.

**Voice.** The one field the per-screen brief has no room for, and the one that leaks fastest.
Voice is not a personality adjective — "friendly" produces nothing an agent can check. State
it as a contrast with something concrete: does an error apologise or state the fact? Does a
confirmation congratulate or confirm? Is the second person used? Are contractions allowed?
Three such pairs constrain copy far more tightly than a paragraph of adjectives, and they are
checkable against output.

**What the product deliberately is not.** The most useful field and the one nobody writes. A
product that has decided it is not a dashboard, not a social feed, not gamified, is a product
whose generated interfaces stop drifting toward the template. Without this line the default
pull is always toward the most common pattern in training data, which is precisely the
generic output this skill exists to prevent.

**Hard constraints that outlive a screen.** The framework, the design system, the device and
browser floor, regulatory or legal requirements on copy, and any accessibility target above
the baseline. These belong here rather than in a screen brief because they are not
negotiable per screen and restating them invites divergence.

## What does not belong in it

Anything a Design Contract already enforces. The contract governs the *grammar* of output —
spacing scale, type sizes, contrast ratios, token adherence — and it is machine-checkable.
The product brief governs *intent*, which is not. Duplicating a contract value here creates
two sources of truth for one number, and the one that gets updated is never the one being
read.

Screen-specific content, realistic data shapes, and the primary action also stay out: those
are per-screen and belong in the Phase 1 brief.

## Using it

Read it before Phase 1, not after. Its function is to constrain the direction that Phase 2
ranks and Phase 3 structures, and a direction chosen first and reconciled afterwards is a
direction that survives.

When a screen's requirement contradicts the product brief, that is a signal worth raising
rather than resolving silently: either the brief is stale or the screen is drifting, and both
are decisions for the person, not the agent. State which one you think it is.

## Keeping it true

Date it. A product brief that quietly describes a pivot from eighteen months ago is worse
than no brief, because it will be applied with confidence — the same failure mode that makes
a stale persisted note more dangerous than an absent one. When a field is contradicted by a
decision the person makes, correct the field in the same turn; a contradiction left
unrecorded will be re-litigated on every subsequent screen.

## Pass conditions

1. The audience is named with an expertise level, not just a role.
2. The product's job is stated in one sentence that every screen must be consistent with.
3. Voice is expressed as at least three concrete contrasts, not personality adjectives.
4. At least one line states what the product deliberately is not.
5. No value duplicated from the Design Contract appears in the brief.
6. No screen-specific content appears in the brief.
7. The brief carries a date, and any field contradicted during the session was corrected.
