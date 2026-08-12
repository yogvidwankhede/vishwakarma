# Scope and diff discipline

Every principle here answers one question: what belongs in this change, and what does not.
The failures are all of the same kind — an edit that is defensible in isolation and wrong as
part of this diff, because it was not asked for, because it was not yours to make, because it
imposes your conventions on someone else's file, or because it builds a seam for a case that
does not exist yet.

---

## 1. Abstraction arrives on the second case

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

## 2. Volume is a design signal

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

## 3. Every changed line traces to the request

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

## 4. Clean up your own mess only

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

## 5. Match the surrounding conventions

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

## Pass conditions

- Does every abstraction, extension point, configuration option and injected collaborator have a second real caller present in the codebase today?
- Is the solution proportionate to the problem, and was an adversarial "what would a demanding reviewer call unnecessary" pass run with the results removed?
- Does every changed line in the diff trace to something that was asked for, with no reformatting, added annotations, rewritten comments or improved adjacent logic riding along, and were improvements noticed in passing offered as separate changes instead?
- Was orphaned code from this change removed, and pre-existing dead code left in place and reported by name and location?
- Does the new code match local quote style, naming, typing and error idioms, with any disagreement raised as its own proposal rather than applied unilaterally?
