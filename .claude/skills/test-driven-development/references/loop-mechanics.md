# Running the loop

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
6. **Next case.** The boundary (`exactly 100`), the negative case, the error case. Each one is a
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

> `rejects a signup when the email domain is on the blocklist` — failed with `expected 403 to
> equal 200` before the guard existed, passes after; full suite 214 passed, 0 failed.

Two facts, one line: the test was observed failing on its assertion, and the failure was the
expected one. Asserting "wrote tests first" without them is a claim, not evidence — and an agent's
claim about its own process is precisely the thing a reviewer cannot check.
