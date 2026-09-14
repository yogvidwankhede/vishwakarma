# Where the loop does not pay

The loop returns evidence in exchange for time. The exchange is excellent when the behaviour is
expressible as an assertion and the interface is known, and it is poor when either condition
fails. Applying it uniformly produces expensive tests that pin nothing, and — more damagingly —
teaches the team that the discipline is theatre.

The rule for every case below: **name the mechanism that replaces it.** "No tests here" without a
substitute is an exemption, not a boundary.

---

## 1. Exploratory spikes

**The situation.** You do not know whether the library does what you think, what the API returns,
or whether the approach is viable at all. Every test you write is written against a guessed
interface and gets deleted with the guess.

**Why the loop fails here.** Its value is in locking behaviour down. During a spike the goal is
the opposite — to change direction as cheaply as possible — so the tests are pure drag, and the
first thing under pressure is to keep whichever guess happened to be tested rather than the one
that turned out right.

**Instead.** Spike in a scratch file or a throwaway branch with no tests and no quality bar. Time
box it. When the question is answered, write down the answer — the call shape, the failure modes,
the surprising defaults — and **delete the spike**. Rebuild test-first with the interface now
known. The output of a spike is knowledge, not code; keeping the code is how exploratory quality
reaches production, and it is the single most common way this exemption is abused.

---

## 2. Perceptual work

**The situation.** Spacing, type scale, colour relationships, layout rhythm, motion easing and
duration. The acceptance criterion is "it looks right", held by a person.

**Why the loop fails here.** An assertion can pin a computed style, a token value or an element
count, none of which is the property in question. `expect(gap).toBe('16px')` passes while the
layout is broken, and fails on a legitimate redesign. The test measures a proxy that correlates
with the thing you care about only by accident.

**Instead.** Reviewed screenshot baselines for the visual layer, with a frozen clock and fixed
seeded data so the diff means something. Automated checks for the properties that *are* objective
— contrast ratios, focus order, hit-target size, reduced-motion handling. And the loop applied
underneath the perceptual layer, to the logic deciding *what* renders: which variant, which
state, which copy, which items in which order. That logic is ordinary code and deserves ordinary
red-green-refactor.

---

## 3. Interfaces still being discovered

**The situation.** You can describe the outcome but not the call shape. Attempts to write the test
stall on invented names and parameter lists.

**Why the loop fails here.** Writing a test requires committing to an interface. Committing before
you understand the problem produces a test that pins a bad interface, and because rewriting tests
feels like waste, the bad interface survives on sunk cost.

**Instead.** Find the narrowest boundary you *are* confident about — usually further out, at the
level of the whole operation rather than its internals — and test there. Let the internals move
freely until a shape stabilises, then push tests inward. A single test at a stable boundary is
worth more than six at boundaries that will not exist tomorrow.

Distinguish this from "I do not want to write the test." The tell is specific: you can state the
outcome but not the signature. If you cannot state the outcome either, you do not have an
interface problem, you have an unclear requirement, and that is a question for the person who
asked.

---

## 4. Thin wiring, configuration, and generated code

**The situation.** DI modules, route tables, adapters that forward a call and translate a field
name, build and environment configuration, and code emitted by a generator.

**Why the loop fails here.** A unit test over code with no branches asserts that the wiring is
what the wiring is. It restates the source in a second syntax, fails only when someone edits it
deliberately, and doubles the size of every change to it. For generated code, the test asserts the
generator's correctness through an expensive indirect channel.

**Instead.** One integration smoke test over the wired path — the container constructs, the route
resolves, the adapter round-trips a realistic payload. Type checking for the field mapping, which
is stronger than the test would have been and free. For generated code, test the generator's
inputs and any hand-written code around the output.

Watch for the branch that sneaks in. The moment an adapter grows a conditional, a default, or a
null-coalescing fallback, it has logic, and the exemption has expired.

---

## 5. Performance, concurrency, and anything statistical

**The situation.** "This should be faster." "This should not deadlock." "This should handle 500
concurrent writers."

**Why the loop fails here.** A pass/fail assertion over a distribution is either tight enough to
flake on CI noise or loose enough to detect nothing. `expect(duration).toBeLessThan(200)` is a
coin flip on a shared runner and will be deleted within a month of being added.

**Instead.** Benchmarks with a stated noise band derived from observed variance, reported as a
trend rather than gated as a boolean. For concurrency, deterministic scheduling where the runtime
supports it, plus stress runs that report a failure *rate* over many iterations. Property-based
tests with a fixed seed for invariants that must hold over generated input. Each of these is a
measurement discipline rather than an assertion discipline, and they need their own comparison
baseline — which is `engineering-discipline`'s subject.

---

## 6. Where the exemption does not apply

Named so they are not smuggled in under the cases above.

- **"It is only a one-line fix."** One-line fixes are exactly where a regression test is cheapest
  and the risk of fixing the wrong thing is highest, because nobody reproduced anything.
- **"It is a prototype."** Prototypes that reach users stop being prototypes without ceremony. If
  it will be demonstrated to anyone who can say yes to it, it is production.
- **"There is no time."** The loop's cost is bounded by the time to run the test twice. What
  actually takes time is diagnosing the untested behaviour later, without a reproduction.
- **"The code is too coupled to test."** That is a finding about the code, and it is the finding.
  Report it; do not convert it into an exemption.
- **"Coverage is already high."** Coverage measures execution, not assertion. Every test that
  cannot fail is fully covered.
