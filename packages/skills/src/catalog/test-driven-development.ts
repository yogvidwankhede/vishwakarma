// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * A test that has never been observed to fail is not evidence. It is a claim about evidence.
 *
 * The tests produced by a disciplined loop and the tests produced by writing everything in one
 * sitting look almost identical on disk. What differs is what you know about them. A test run
 * before the implementation existed has demonstrated that it can detect the absence of the
 * behaviour; a test written afterwards has demonstrated only that it agrees with whatever the
 * implementation already does — including agreeing with its bugs, and including the degenerate
 * case where the assertion could not fail against anything.
 *
 * That is why this skill is about *ordering* rather than about tests. Red, green, refactor is
 * not a style preference and not a productivity ritual: each step exists to produce one piece
 * of evidence that the next step consumes, and performing them out of order produces the
 * artefacts without the evidence.
 *
 * Two things this skill deliberately does not cover. It does not cover the *shape* of a test —
 * which level to test at, fakes against mocks, selector strategy, flake handling, coverage
 * gates — all of which live in `code-quality`. And it does not pretend the loop is universal:
 * a section and a reference are spent on the cases where it costs more than it returns, because
 * a discipline with no stated boundary gets applied where it does not fit and then abandoned
 * everywhere.
 */
export const testDrivenDevelopment: SkillManifest = {
  vsm: '1.0',
  id: 'test-driven-development',
  name: 'Test-Driven Development',
  description:
    'Use when writing tests alongside code, fixing a reported bug, or deciding whether the red-green-refactor loop pays here.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'workflow',
  tags: ['tdd', 'red-green-refactor', 'testing', 'workflow', 'regression', 'refactoring'],

  activation: {
    intents: [
      'the user asks for a feature to be built test-first, or mentions TDD by name',
      'the user reports a bug and wants it fixed so that it stays fixed',
      'tests and implementation are about to be written for the same behaviour in one sitting',
      'a test suite was generated for existing code and nobody knows whether any of it can fail',
      'a test is passing and the user is not sure it is actually testing anything',
      'a newly written test fails and it is unclear whether the failure is the expected one',
      'the user wants to restructure working code without changing what it does',
      'the user asks whether writing tests first is worth it for the work in front of them',
      'the user is exploring an unfamiliar API and does not yet know what the interface should be',
      'the work is visual or layout-based and the user asks how to test it',
      'a test had to be edited to make a build pass and the user wants to know if that was legitimate',
      'the user asks why their coverage is high but regressions keep shipping',
    ],
    globs: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/*_test.py',
      '**/test_*.py',
      '**/*_test.go',
      '**/*Test.kt',
      '**/*Tests.swift',
      '**/tests/**',
      '**/__tests__/**',
    ],
    keywords: [
      'tdd',
      'test first',
      'red green refactor',
      'write a failing test',
      'watch it fail',
      'regression test',
      'reproduce the bug',
      'refactor',
      'characterization test',
      'spike',
      'test name',
      'is this test testing anything',
    ],
  },

  content: {
    summary:
      'Run the loop in order and keep the evidence it produces: observe the test fail, confirm it failed on its assertion rather than on a typo, write only enough to pass, restructure while green, and name the boundary where the loop stops paying.',

    body: `# Test-Driven Development

Red, green, refactor is an ordering, and the ordering is the product. The tests you finish with
look nearly the same either way; what differs is what you know about them. A test never observed
failing has shown only that it agrees with the code in front of it. A test that failed first has
shown it can detect the behaviour's absence — the property that makes a later green mean anything.

This skill governs the **loop**. \`code-quality\` governs the **shape** of what the loop produces:
which level to test at, fakes against mocks, selector order, flake quarantine, coverage gating.
Consult that one for *what kind of test*; consult this one for *in what order you may write it*.

---

## 1. Red is an observation, not a prediction

"This will fail" is not red. Red is a run: the test executes, the assertion is evaluated, the
failure is printed, and you read it. Before the implementation exists that costs one command.
Afterwards the property cannot be established cheaply at all, because every green is then equally
consistent with working code and with an assertion that would pass against anything.

This is the step that gets skipped, and it is the step doing the work. Assertions that can never
fail are the most common silent defect in generated suites, and they share a signature: nobody ran
them while the answer was supposed to be wrong. A value compared to itself; a fixture already
holding the expected result; an \`expect\` inside a callback the runner never invokes; an unawaited
async assertion; a \`toBeDefined\` on something defined regardless. Each passes forever, each is
exposed by one red run, and coverage sees none of them — the lines execute.

---

## 2. Red and broken are different colours

A test failing with \`Cannot find module './pricing'\`, a \`SyntaxError\`, a missing fixture, or a
wrong-arity \`TypeError\` is **not red — it is broken**. Turning it green proves the module resolves
or the typo is gone; it proves nothing about the assertion, which has still never been evaluated.

Red means the test **ran to its assertion and the assertion disagreed**: an expected-versus-actual
report naming the values. Before running, state which assertion will fire and roughly what it will
say, then compare. A prediction turns the run into a test of your model; an unpredicted run
disconfirms nothing, since any output confirms "it failed".

The first test in a new module legitimately fails on import. Add the smallest surface — an exported
function returning the wrong answer — so the failure lands on the assertion before real logic does.

---

## 3. The agent failure: one pass, two artefacts

The characteristic way an AI agent breaks this loop is not refusing it. It is writing the test and
the implementation in one pass and running them together. Everything looks correct afterwards: a
test exists, it passes, it references the right function.

What was lost is the direction of causation. **A test written with the implementation in view is
shaped by the implementation rather than the requirement.** It asserts the shape the code already
returns, expects the error it already throws, and reproduces the off-by-one just written. It
cannot disagree with the code, because it came from it. Such tests hold refactoring hostage while
catching nothing.

Make the ordering externally visible rather than internal:

- The test edit and the implementation edit are **separate passes**, with a run between them. If
  one edit touches both, the loop did not happen.
- Before writing the assertion, state **the requirement sentence it encodes**. An expected value
  obtained by running the code under test is a snapshot, pinning bugs as firmly as intentions.
- When a test is written after the fact — legacy code, a generated suite — recover the evidence by
  **mutation**: break the implementation deliberately, confirm the test fails, restore. A test that
  stays green through that is testing nothing, found for the price of one edit.

---

## 4. Write the minimum that turns it green

Enough to pass this test, nothing more. A hardcoded constant is a legitimate green; the next test
forces generality, and if none forces it, the generality was speculative.

The mechanism is evidential, not ascetic. Every line written ahead of a test that demanded it is
**untested by construction** — no red run showed it was needed, no green run shows it works — and
it destroys what the loop was producing: once unrequested branches exist you can no longer tell
which behaviour the suite pins. Anticipated error handling and unused options arrive this way.

Hold **one failing test at a time**. With two reds open, a green tells you neither which change
fixed which, nor whether one regressed the other.

---

## 5. Refactor is a step, not a mood

The third step is the one dropped under deadline, and dropping it is how a codebase accumulates
code that is simultaneously well tested and unmaintainable — the tests make the bad structure
survivable, so it survives.

Green is the only state holding both a working implementation and a suite already shown to detect
breakage, which is what makes restructuring safe. Under red, an introduced defect is
indistinguishable from the one already there.

Three constraints make it a refactor rather than a rewrite: **behaviour does not change**, the
suite is **run after each move** rather than after several, and **no test is edited**. A
restructure that requires touching a test changed the observable contract — a redesign, which
goes back through step one.

---

## 6. Name the condition and the behaviour

\`test_user\`, \`it('works')\` and \`testCalculateTotal\` make a CI failure report useless: the reader
has a name and a stack trace, no source, and must open the file to learn what broke. Name the test
so the report diagnoses alone — **condition, then expected behaviour**: \`rejects a signup when the
email domain is on the blocklist\`.

The name is also a cheap check on the test: it predicts what the assertion should say, so a name
that does not match its assertion is a visible defect — usually a test that drifted during a
refactor and now pins something nobody intended.

---

## 7. Where the loop does not pay

TDD attracts dogma. It is a technique with a domain: it pays when the behaviour is expressible as
an assertion and the interface is known.

- **Exploratory spikes.** Tests written against a guessed API get rewritten with every guess. Spike
  untested in a scratch file, then **throw the spike away** and rebuild test-first with the
  interface known. Keeping it is how discovery code becomes production code.
- **Perceptual work.** Layout, type and motion are accepted by eye. An assertion pins a computed
  style, which passes while the layout is broken and fails on a legitimate redesign. Use reviewed
  screenshot baselines, and apply the loop underneath — to the logic deciding *what* renders.
- **Interfaces still being discovered.** If the call shape is unknown, the missing thing is the
  design. Test at the widest boundary you trust; leave the internals unpinned until a shape
  stabilises.
- **Thin wiring and configuration.** Branchless adapters, DI modules and config produce tests that
  restate the source in a second syntax. One integration smoke test over the wired path is cheaper
  evidence — until the adapter grows a conditional.
- **Performance and concurrency.** The property is statistical, so a pass/fail assertion either
  flakes on CI noise or is too loose to detect anything. Benchmark against a stated noise band.

Where the loop does not fit, name the mechanism that replaces it. "No tests here" without a
substitute is not a boundary, it is an exemption.

Load \`reading-a-failing-test\` when a red run is ambiguous, \`loop-mechanics\` for the steps across
features, bugs and legacy code, and \`when-to-skip-the-loop\` before claiming an exemption.`,

    references: [
      {
        id: 'reading-a-failing-test',
        title: 'Reading a failing test: red, broken, and tests that cannot fail',
        answers:
          'My test failed — how do I tell a genuine red from a broken test, what should the failure message look like, and how do I prove an already-passing test is capable of failing at all?',
        content: `# Reading a failing test

A red run is a measurement, and like any measurement it can be misread. This file is for the
moment a test has failed and you need to decide what the failure licenses you to do next, and for
the moment a test is already green and you need to establish whether it was ever capable of
anything else.

---

## 1. The failure taxonomy

Sort every failure into one of three kinds before responding to it.

**Broken — the test never reached its assertion.**

- \`Cannot find module\`, \`ImportError\`, \`Unresolved reference\`
- \`SyntaxError\`, \`ReferenceError: x is not defined\`
- \`TypeError: fn is not a function\`, wrong-arity errors
- fixture, factory, container or database-setup exceptions
- timeouts before any assertion ran

These tell you about your harness. Fixing them and watching the test go green is not the loop
completing; it is the loop finally starting. Fix, re-run, and keep going until the failure is of
the next kind.

**Red — the assertion ran and disagreed.**

\`\`\`
AssertionError: expected 0 to equal 12.5
  at pricing.test.ts:31
\`\`\`

The report names the expected value, the actual value and the line. This is the only failure that
licenses writing implementation.

**Wrong red — the assertion ran, disagreed, and disagreed about the wrong thing.**

The most common shape is a test that fails because of a shared-fixture leak, a frozen clock that
was not frozen, or an assertion accidentally checking a neighbouring field. It looks like a valid
red. Its tell is that the *actual* value is not the one the unimplemented code should have
produced — you expected \`12.5\` and \`undefined\`, and you got \`12.5\` and \`NaN\`. If the actual value
surprises you, find out why before implementing; the surprise is the information.

---

## 2. Predict, then run

Before the run, write down two things: which assertion will fire, and roughly what it will say.
It costs a sentence.

The value is that it converts the run from a confirmation into a test of your model. When the
prediction and the output agree you have evidence the test exercises the path you think it does.
When they disagree you have caught, for free, one of: a test hitting a different code path, a
mis-scoped fixture, an assertion on a stale variable, or a runner that silently skipped the case.
An unpredicted run cannot produce that signal, because any output confirms it.

A prediction of "it will fail" is not a prediction. \`expected [] to have length 3\` is.

---

## 3. Tests that cannot fail

These pass forever. All are invisible to coverage tooling — the lines execute, so they count as
covered — and all are caught by a red run or by mutation.

**The tautology.** \`expect(result).toEqual(result)\`, or an expected value computed by calling the
same function under test. Frequently arrives from building the expectation out of the fixture
using the production mapper.

**The prebaked fixture.** The fixture file already contains the expected output because it was
generated by running the code. The test asserts that the code still does what it did, which is a
snapshot, not a specification — and if it was wrong, it now pins the bug.

**The unreached assertion.** An \`expect\` inside a callback, an event handler, a \`catch\` block or
a loop body that never executes. The test passes because nothing ran. Guard by asserting the
callback ran — a call count, or an explicit counter.

**The unawaited assertion.** An async assertion whose promise is not returned or awaited. The
runner finishes the test before the rejection surfaces. In some runners this produces an
unhandled-rejection warning nobody reads.

**The vacuous matcher.** \`toBeDefined\` on a value that is always defined, \`toBeTruthy\` on a
non-empty object, \`not.toThrow\` around a function that cannot throw, or a regex so permissive it
matches the error you did not want.

**The over-mocked path.** The collaborator is stubbed to return the expected answer and the
assertion checks the expected answer. The test exercises the stub. (Which double to use at all is
\`code-quality\`'s subject; what matters here is that the assertion can no longer fail.)

---

## 4. Mutation as retrospective red

When you did not write the test first — inherited code, a generated suite, a test someone else
added — the red run is no longer available, but the property it established can be recovered.

Break the implementation on purpose, run the test, expect failure, restore:

- invert a boundary condition (\`>\` to \`>=\`)
- return a constant from the function under test
- delete the validation guard the test claims to exercise
- skip the side effect (the write, the emit, the notification)

Each mutation should produce exactly one clearly-related failure. Three outcomes are informative:

1. **The test fails.** It is load-bearing for that behaviour. Restore and move on.
2. **The test still passes.** It does not test what its name claims. Fix the test — now, while you
   know which behaviour is unguarded.
3. **Twenty tests fail.** They are coupled to an implementation detail rather than to behaviour,
   and the suite will fight every refactor.

Run mutations one at a time and restore each before the next, for the same reason you change one
thing per observation while debugging: two simultaneous mutations make the resulting failures
unattributable.

---

## 5. Getting from broken to red in a new module

The first test of code that does not exist yet fails on import, which is broken rather than red.
The move is to build the thinnest surface that lets the assertion run:

\`\`\`ts
// pricing.ts — enough to make the failure land on the assertion
export function priceWithTax(): number {
  throw new Error('not implemented')
}
\`\`\`

Run again. A thrown \`not implemented\` is still not an assertion failure in most runners, so give
it a wrong return value instead when you want the expected-versus-actual report:

\`\`\`ts
export function priceWithTax(): number {
  return 0
}
\`\`\`

Now the failure reads \`expected 0 to equal 12.5\` — the assertion has been evaluated, the test is
genuinely red, and implementation may begin. The stub cost two lines and bought the evidence the
whole loop rests on.

---

## 6. When a test must be changed to pass

A test edited to make a build green is the exact motion that converts a suite into decoration, so
it needs a stated reason each time.

Legitimate: **the requirement changed**, and the test encodes the old requirement. Say so
explicitly, state the old and new expected behaviour, and change the assertion to the new
requirement — not to whatever the code currently emits.

Legitimate: **the test was wrong**, provably — it asserted something the specification does not
say. Show the discrepancy against the requirement, not against the implementation.

Not legitimate: loosening a matcher until it passes, deleting the assertion, adding the actual
output as a second accepted value, marking it skipped to unblock, or regenerating a snapshot
without reading the diff. Each of these is a green produced by lowering the bar, and the failure
it was reporting is still in the code.

When you cannot tell which case you are in, the test is the older artefact and the requirement is
the tiebreak. If nobody can state the requirement, that is the finding.`,
      },
      {
        id: 'loop-mechanics',
        title: 'Running the loop: new features, bug fixes, refactors, and legacy code',
        answers:
          'What does the loop actually look like step by step for a feature, for a reported bug, for restructuring working code, and for code that has no tests at all?',
        content: `# Running the loop

Four situations, four variations on the same three steps. In every one the invariant is the same:
no implementation line is written until a run has shown a test failing on its assertion, and no
structural change is made except from green.

---

## 1. A new behaviour

1. **State the requirement in one sentence.** "Orders over 100 get free shipping." If you cannot
   write the sentence, you are not ready to write the test, and the test you write instead will
   be derived from the implementation you are imagining.
2. **Write one test for one case**, named for the condition and the behaviour.
3. **Predict the failure, then run it.** Expect an expected-versus-actual report. If you get an
   import or setup error, that is a broken test — fix it, add the minimal stub, and run again.
4. **Write the minimum to pass.** A constant is allowed. Run: green.
5. **Refactor from green.** Rename, extract, deduplicate; run after each move; change no test.
6. **Next case.** The boundary (\`exactly 100\`), the negative case, the error case. Each one is a
   new red before it is a green.

The sequence of tests is itself a design tool: cases that are painful to set up are telling you
about coupling in the interface, and that message arrives while the interface is still cheap to
change. Ignoring it and building an elaborate fixture is how you pay for the design flaw twice.

**One failing test at a time.** Writing six tests up front puts you in a state where a green run
tells you nothing attributable, and where the sixth test was written from the implementation the
first five produced.

---

## 2. A reported bug

A bug means a behaviour exists that nobody specified; the specification is what was missing.

1. **Reproduce the reported failure as a test** at the smallest level that shows it. Start from
   the reporter's exact input; narrow afterwards.
2. **Run it and read the failure.** It must fail *for the reported reason*. A test that fails
   because the fixture is missing a field has reproduced your setup, not their bug — and a fix
   that turns it green will have fixed nothing.
3. **Only now diagnose and fix.**
4. **Green, plus the whole suite.** The regression test passes and nothing else broke.
5. **Keep the test.** It is the artefact that stops the bug from returning, and it is the only
   part of the work with permanent value.

The red run here does double duty. Besides proving the test can fail, it proves you have
understood the report: a reproduction that fails in a way the reporter did not describe is
usually a different bug, and finding that out before the fix is much cheaper than after.

For an intermittent bug, a single red run is not evidence. Characterise the rate — "fails 7 times
in 200" — before the fix and after, over comparable numbers of runs. A fix that takes 7/200 to
0/200 has evidence behind it; a fix followed by one green run has none, and a retry masking the
race has negative value.

---

## 3. A refactor

A refactor changes structure and not behaviour. That definition is operational, not
philosophical: **if a test has to change, it is not a refactor.**

1. **Establish green first.** A refactor started from red or from an unrun suite has no baseline,
   and any failure afterwards is unattributable.
2. **Confirm the suite covers what you are about to move.** If it does not, the covering tests come
   first — written against current behaviour, red-verified by mutation since the code already
   exists.
3. **Move in steps small enough to run between.** Extract a function, run. Rename, run. Invert a
   dependency, run. The interval between green states is the size of the bisect when something
   breaks; keeping it to minutes is the entire technique.
4. **If a test fails, revert the last step** rather than fixing forward. Under a failing suite you
   cannot distinguish the defect you just introduced from the one you are chasing.

When behaviour genuinely must change, that is a separate piece of work with its own red: change
the test first, watch it fail, then change the code. Doing both at once produces a diff where
nobody — including you — can tell which lines were restructuring and which changed the contract.

---

## 4. Code with no tests

Untested legacy code inverts the loop, because the behaviour already exists and the specification
does not.

**Characterise, do not specify.** Write a test that asserts what the code *does now*, including
the parts that look wrong. Run it. If it fails, your understanding was wrong and the code is your
source of truth for the moment — correct the test, not the code.

**Verify by mutation,** since no red run was available: break the path deliberately, confirm the
test fails, restore. Without that step you have added a test of unknown value and a false sense of
protection, which is worse than no test because it licenses a refactor.

**Then fix bugs test-first.** Once the surrounding behaviour is pinned, a bug becomes the normal
case: write the failing test for the correct behaviour, fix, green. The characterisation test that
asserted the old wrong behaviour is updated in that step, and the update is visible in the diff —
which is exactly where a reviewer should see it.

Characterisation tests are scaffolding. They pin accidents as tightly as intentions, so they
become obstacles once the area has real specifications; delete them as they are superseded rather
than curating them forever.

---

## 5. Reporting the loop

Because the evidence lives in the ordering rather than in the artefact, a diff alone cannot show
whether the loop ran. State it:

> \`rejects a signup when the email domain is on the blocklist\` — failed with \`expected 403 to
> equal 200\` before the guard existed, passes after; full suite 214 passed, 0 failed.

Two facts, one line: the test was observed failing on its assertion, and the failure was the
expected one. Asserting "wrote tests first" without them is a claim, not evidence — and an agent's
claim about its own process is precisely the thing a reviewer cannot check.`,
      },
      {
        id: 'when-to-skip-the-loop',
        title: 'Where TDD does not pay, and what to do instead',
        answers:
          'Is the loop worth it for this particular work — a spike, a UI layout, a config change, a performance fix — and if not, which discipline replaces it?',
        content: `# Where the loop does not pay

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
count, none of which is the property in question. \`expect(gap).toBe('16px')\` passes while the
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
flake on CI noise or loose enough to detect nothing. \`expect(duration).toBeLessThan(200)\` is a
coin flip on a shared runner and will be deleted within a month of being added.

**Instead.** Benchmarks with a stated noise band derived from observed variance, reported as a
trend rather than gated as a boolean. For concurrency, deterministic scheduling where the runtime
supports it, plus stress runs that report a failure *rate* over many iterations. Property-based
tests with a fixed seed for invariants that must hold over generated input. Each of these is a
measurement discipline rather than an assertion discipline, and they need their own comparison
baseline — which is \`engineering-discipline\`'s subject.

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
  cannot fail is fully covered.`,
      },
    ],
  },

  rules: [
    {
      id: 'tdd/observe-red-before-green',
      strength: 'must',
      statement:
        'Run the new test and observe it fail before writing the implementation it describes.',
      evidence: {
        rationale:
          'The red run is the only cheap proof that the test can detect the behaviour’s absence. Once the implementation exists, every green is equally consistent with working code and with an assertion that would pass against anything, so the property can no longer be established without deliberately breaking something.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Write priceWithTax and its test together, run once, see green, report the behaviour as tested.',
        good: 'Write the test, run it: "expected 0 to equal 12.5". Then implement, run again: green. Report both runs.',
      },
      exceptions: [
        'Code that already exists — legacy, inherited, or generated — where no red run is available; recover the evidence by mutation instead (break the implementation, confirm the test fails, restore).',
      ],
      verifiedBy: 'loop-evidence',
    },
    {
      id: 'tdd/predict-the-failure-message',
      strength: 'should',
      statement:
        'State which assertion will fire and roughly what it will report before running a new test, then compare the prediction against the actual output.',
      evidence: {
        rationale:
          'An unpredicted run cannot disconfirm anything, because any output confirms "it failed". A prediction turns the run into a test of your model of the code, and a mismatch catches a mis-scoped fixture, a skipped case, or a test exercising a different path than you believe — for the cost of one sentence.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'Expectation: "this will fail." Run: it failed. Proceed.',
        good: 'Expectation: the length assertion fires, "expected [] to have length 3". Run: "expected undefined to have length 3" — the factory returned nothing, so fix the fixture before implementing.',
      },
      verifiedBy: 'loop-evidence',
    },
    {
      id: 'tdd/red-for-the-asserted-reason',
      strength: 'must',
      statement:
        'Treat a test as red only when it reached its assertion and reported expected-versus-actual; import errors, syntax errors, arity errors and fixture failures are broken, not red.',
      evidence: {
        rationale:
          'Turning a broken test green proves the module resolves or the typo is gone — the assertion still has never been evaluated, so the loop has produced no evidence at all. The two failure classes license different next actions: broken means fix the harness and re-run, red means write implementation.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: '"Cannot find module \'./pricing\'" — good, it is red. Now write pricing.ts and the test passes.',
        good: '"Cannot find module \'./pricing\'" — broken. Add a two-line stub returning 0, re-run, get "expected 0 to equal 12.5", and only then implement.',
      },
      verifiedBy: 'loop-evidence',
    },
    {
      id: 'tdd/separate-test-and-implementation-passes',
      strength: 'must',
      statement:
        'Put the test edit and the implementation edit in separate passes with a test run between them; never author both in a single edit.',
      evidence: {
        rationale:
          'A test written with the implementation in view is derived from the code rather than from the requirement: it asserts the shape the code already returns, expects the error the code already throws, and reproduces the off-by-one the author just wrote. Such a test cannot disagree with the code, so it blocks refactoring while catching nothing. Separating the passes is what makes the direction of causation externally checkable.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'One edit adds calculateRefund and calculateRefund.test.ts; one command runs them; the suite is green.',
        good: 'Edit 1 adds the test plus a stub. Run: red on the assertion. Edit 2 implements. Run: green.',
      },
      exceptions: [
        'Characterisation tests over existing code, where the implementation necessarily precedes the test and mutation replaces the red run.',
      ],
      verifiedBy: 'loop-evidence',
    },
    {
      id: 'tdd/derive-the-assertion-from-the-requirement',
      strength: 'must',
      statement:
        'State the requirement sentence the assertion encodes before writing it, and reject any expected value that was obtained by running the code under test.',
      evidence: {
        rationale:
          'An expected value produced by the implementation makes the test a snapshot of current behaviour, which pins bugs exactly as firmly as intentions. The requirement is the only source that can disagree with the code, and disagreement is the entire function of a test.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'const expected = formatInvoice(fixture); expect(formatInvoice(fixture)).toEqual(expected)',
        good: 'Requirement: an invoice over 100 shows "Free" in the shipping line. expect(formatInvoice(fixture).shipping).toBe("Free")',
      },
      exceptions: [
        'Characterisation tests written deliberately to pin current behaviour before a refactor, which must be labelled as such and deleted once real specifications cover the area.',
      ],
      verifiedBy: 'loop-evidence',
    },
    {
      id: 'tdd/minimum-to-green',
      strength: 'should',
      statement:
        'Write only enough implementation to turn the current failing test green, including returning a constant, and let the next test force generality.',
      evidence: {
        rationale:
          'Any line written ahead of a test that demanded it is untested by construction — no red run showed it was needed and no green run shows it works. It also destroys what the loop was producing: once unrequested branches exist you can no longer tell which behaviour the suite actually pins, so the suite stops being a map of verified behaviour.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'The first test wants free shipping over 100; the implementation arrives with tiered rates, a currency option, and a null-safe wrapper nothing calls.',
        good: 'Return the free-shipping branch and a flat rate. The tier test comes next and forces the table.',
      },
      exceptions: [
        'Structure the surrounding code already requires — matching an existing interface, an error type the call site must handle — where deviating would be an inconsistency rather than a simplification.',
      ],
      verifiedBy: 'loop-evidence',
    },
    {
      id: 'tdd/one-failing-test-at-a-time',
      strength: 'should',
      statement:
        'Keep at most one failing test in the tree; write the next case only after the current one is green.',
      evidence: {
        rationale:
          'With two reds outstanding, a green run is unattributable — you cannot tell which change fixed which test, nor whether one change regressed the other. The later tests are also written with the implementation produced by the earlier ones in view, which is the same derivation problem the loop exists to prevent.',
        confidence: 'strong',
      },
      exceptions: [
        'A deliberately skipped or quarantined list of pending cases that do not run, which costs nothing because no failing run is being interpreted.',
      ],
      verifiedBy: 'loop-evidence',
    },
    {
      id: 'tdd/no-weakening-assertions-for-green',
      strength: 'must-not',
      statement:
        'Do not loosen a matcher, delete an assertion, accept the actual output as a second valid value, skip a test, or regenerate a snapshot unread in order to reach green.',
      evidence: {
        rationale:
          'Each of these produces a pass by lowering the bar while the defect the test reported stays in the code, and the suite silently loses the behaviour it was guarding. A test may legitimately change only when the requirement changed or the test provably contradicted the specification — in both cases the new assertion comes from the requirement, never from the observed output.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'expect(total).toBe(12.5) fails with 12.499999, so change it to expect(total).toBeDefined().',
        good: 'expect(total).toBe(12.5) fails with 12.499999 — that is a rounding defect in the implementation. Fix the rounding, or if fractional cents are the stated requirement, assert toBeCloseTo(12.5, 2) and say why.',
      },
      verifiedBy: 'loop-evidence',
    },
    {
      id: 'tdd/refactor-under-green',
      strength: 'should',
      statement:
        'Make structural changes only from a green suite, run the suite after each move, and change no test while doing so.',
      evidence: {
        rationale:
          'Green is the only state holding both a working implementation and a suite already shown to detect breakage, which is what makes restructuring safe; under red an introduced defect is indistinguishable from the one already there. Running between moves keeps the bisect interval to a single step. If a test must change, the observable contract changed — that is a redesign and needs its own red.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Extract the service, rename four methods, invert the dependency, then run: eleven failures and no idea which move caused them.',
        good: 'Extract the service, run. Rename, run. Invert the dependency, run — it fails, so revert that step and try a smaller one.',
      },
      verifiedBy: 'loop-evidence',
    },
    {
      id: 'tdd/name-condition-and-behaviour',
      strength: 'should',
      statement:
        'Name each test with the condition and the expected behaviour, so that the name plus the failure line diagnoses the break without opening the source.',
      evidence: {
        rationale:
          'A CI failure report carries a name and a stack trace to someone who has not read the file; a name like "works" forces that person back into the source to learn what broke. The name also predicts the assertion, so a mismatch between the two is a visible defect — usually a test that drifted during a refactor and now pins something nobody intended.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: "it('works'), test_user, testCalculateTotal",
        good: "it('rejects a signup when the email domain is on the blocklist'), it('retains the cart when the session token expires mid-checkout')",
      },
      verifiedBy: 'loop-evidence',
    },
    {
      id: 'tdd/regression-test-before-fix',
      strength: 'must',
      statement:
        'Fix a reported bug only after a test reproduces it and fails for the reported reason, and keep that test in the suite afterwards.',
      evidence: {
        rationale:
          'A red run here proves two things at once: that the test can fail, and that you understood the report — a reproduction failing for a different reason is a different bug, and a fix aimed at it repairs nothing the reporter saw. The retained test is the only part of the work with permanent value, since the fix alone does not prevent the behaviour from returning.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Report says the export drops the last row. Change the loop bound, ship.',
        good: 'Test exports a three-row fixture, fails with "expected 2 rows to equal 3", fix the bound, green, full suite green, test stays.',
      },
      exceptions: [
        'Intermittent failures, where one red run is not evidence: characterise the rate over comparable run counts before and after (for example 7/200 to 0/200) rather than treating a single pass as proof.',
      ],
      verifiedBy: 'loop-evidence',
    },
    {
      id: 'tdd/mutate-to-validate-retrofitted-tests',
      strength: 'must',
      statement:
        'For any test written after the code it covers, break the implementation deliberately, confirm that test fails, and restore — one mutation at a time.',
      evidence: {
        rationale:
          'A retrofitted test has never been observed failing, so it is indistinguishable from one that cannot fail, and coverage tooling cannot tell them apart because the lines still execute. A deliberate mutation restores the missing observation for the cost of one edit. Mutating two things at once makes the resulting failures unattributable, exactly as changing two variables does while debugging.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'Generate twenty tests for the pricing module, watch them all pass, report the module as covered.',
        good: 'Invert the discount boundary: four tests fail, one that claims to test the boundary does not — that one asserts nothing, so fix it now.',
      },
      verifiedBy: 'loop-evidence',
    },
    {
      id: 'tdd/skip-the-loop-where-the-assertion-is-a-proxy',
      strength: 'should-not',
      statement:
        'Do not drive exploratory spikes, perceptual layout and motion work, undiscovered interfaces, branchless wiring, or performance work with the loop; name the substitute mechanism instead.',
      evidence: {
        rationale:
          'The loop pays when the behaviour is expressible as an assertion and the interface is known. Where neither holds, the assertion pins a proxy — a computed style, a guessed signature, a timing threshold — which passes while the real property is broken and fails on legitimate change. Forcing it there produces expensive tests that guard nothing and teaches the team that the discipline is theatre.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: "expect(getComputedStyle(card).gap).toBe('16px') as the test for whether the card layout is correct.",
        good: 'Reviewed screenshot baseline for the layout, automated contrast and focus-order checks for the objective properties, and the loop applied to the logic choosing which variant renders.',
      },
      exceptions: [
        'A spike whose code is kept rather than discarded stops being a spike, and the exemption expires with it — the same applies to an adapter the moment it grows its first conditional or default.',
      ],
      verifiedBy: 'loop-evidence',
    },
  ],

  verification: [
    {
      id: 'loop-evidence',
      kind: 'self-review',
      description:
        'Confirm the ordering actually happened and produced evidence, rather than producing tests that merely agree with the code.',
      blocking: true,
      questions: [
        'For each test you added, did you run it and watch it fail before the implementation existed — and can you quote the failure message?',
        'Did each of those failures report an expected-versus-actual comparison, rather than an import error, a syntax error, an arity error, or a fixture exception?',
        'Were the test edit and the implementation edit separate passes with a run between them, or did a single edit produce both?',
        'Can you name the requirement sentence each assertion encodes, and confirm no expected value was obtained by running the code under test?',
        'Does the implementation contain any branch, option, or error path that no test demanded — and if so, why is it there?',
        'For every test written after the code it covers, did you break the implementation, confirm the test failed, and restore?',
        'Was any test loosened, skipped, deleted, or re-snapshotted to reach green, and if so which requirement change justifies it?',
        'Was the restructuring done from a green suite with a run after each move and no test edited?',
        'Does each test name state the condition and the expected behaviour well enough to diagnose a CI failure without opening the file?',
        'If you skipped the loop anywhere, did you name the case (spike, perceptual, undiscovered interface, branchless wiring, statistical) and the mechanism replacing it?',
      ],
    },
  ],

  relatedSkills: ['code-quality', 'engineering-discipline', 'design-review'],
}
