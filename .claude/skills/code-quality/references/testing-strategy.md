# Testing strategy: shapes, doubles, selectors, flakes, and coverage

A test is worth what it tells you when it goes red. That single criterion decides the shape
of the test, whether the double is a fake or a mock, how elements are selected, what happens to
a flaky result, and why a coverage percentage is a detector rather than a target.

---

## 1. Choosing the test shape

Pick the **cheapest shape that actually proves the claim**. The table maps what you are trying
to prove to the shape that proves it.

| What you are proving | Cheapest shape that proves it |
|---|---|
| Pure logic — a calculation, a parser, a reducer, a formatting rule | Unit test on the function, no framework, no test doubles |
| State-holder behaviour — a ViewModel, a hook, a store, a presenter | Unit test on the state holder with a hand-written fake repository, asserting emitted state |
| Rendering and semantics — does the right thing appear, with the right role and label | Component or UI test using semantics-first selectors |
| Visual regression — does it still look right | Screenshot test with a frozen clock, fixed seeded data, and a fake image loader |
| Wiring and navigation — do the real pieces connect | One integration smoke test per critical flow |
| Contract with a backend | Contract test against a schema or recorded pact, not a live service |

The mechanism for preferring the cheapest shape is diagnostic resolution: **an integration
test that fails tells you something broke; a unit test that fails tells you what**. An
end-to-end checkout test going red implicates the cart logic, the pricing service, the auth
token, the navigation graph, the network layer, and the test's own fixtures. A unit test on
`calculateDiscount` going red implicates `calculateDiscount`. The integration test is still
worth having — it catches the wiring that unit tests structurally cannot — but one per flow,
not one per behaviour.

The three determinism controls on screenshot tests are load-bearing and commonly skipped.
A **frozen clock** stops relative timestamps ("2 minutes ago") from changing the rendered
pixels between runs. **Fixed data** stops random or date-seeded content from doing the same.
A **fake image loader** returning a solid placeholder synchronously stops the test from
racing a network fetch — the single most common source of screenshot flake, because it fails
roughly one run in twenty and is therefore blamed on the infrastructure rather than fixed.

---

## 2. Fakes over mocks

Write **hand-written fakes** and put them in a shared test module so every test of a given
collaborator uses the same one. Confine **mocking libraries to framework types you do not
own** and cannot reasonably reimplement.

The mechanism: **a mock encodes the call sequence you expected**, and asserting on that
sequence means the test fails when the implementation is refactored even though behaviour is
unchanged. Such a test measures coupling to a particular implementation, not correctness. It
also fails to catch the defects that matter, because a mock returns whatever you told it to —
including values the real collaborator would never produce.

A counter-example that shows the failure. A repository test mocks the DAO and asserts
`verify(dao).insert(user)` then `verify(dao).refreshCache()`. A refactor moves the cache
refresh into the DAO's own `insert`, which is strictly better — fewer round trips, correct
under concurrency. The behaviour is identical from every caller's perspective. The test fails.
The engineer, reasonably, edits the test to match, and in doing so learns that these tests
carry no information. A `FakeUserDao` backed by a `MutableMap` would have passed both before
and after, and would still have failed if the user were not actually stored.

Fakes have a second advantage that is easy to undervalue: a fake is a real implementation, so
writing one forces you to confront the interface's actual contract — what happens on a
duplicate insert, what an empty query returns — at the point where the contract is cheap to
change.

---

## 3. Selector priority in UI tests

Select elements in this order, and drop to the next only when the one above is genuinely
unavailable:

1. **Accessible name** — `onNodeWithContentDescription`, `getByRole(name)`, accessibility identifier derived from the label.
2. **Role and state** — role plus `selected`, `expanded`, `checked`, `disabled`.
3. **Visible text** — the string the user reads.
4. **Test ID** — last resort.

The mechanism is that this ordering makes the test **double as an accessibility assertion**.
A test that finds the submit button by its accessible name fails the moment that name
disappears, which is exactly when the button becomes unusable with a screen reader. A test
that finds it by `data-testid="submit"` passes whether or not the button has a name, whether
or not it has a role, and whether or not it is visible to assistive technology at all — so
the test silently stops testing accessibility while continuing to report green.

Test IDs remain legitimate for genuinely nameless structural containers — a list wrapper, a
layout region with no semantic role — where inventing an accessible name purely for the test
would add noise to the accessibility tree. That exception is narrow. If reaching for a test ID
on an interactive control, the finding is usually that the control has no accessible name, and
the fix belongs in the component rather than the test.

---

## 4. Flaky test policy

A test that fails intermittently gets **quarantined with a named owner and a dated deadline**.
It does not get a retry.

The mechanism: **a retry converts a real intermittent bug into invisible latency**. The
underlying race — an unawaited coroutine, a shared mutable fixture, a real clock, an
unmocked network call — is still present in production code, where it will surface as a
one-in-two-hundred user-facing crash that nobody can reproduce. The retry deleted the only
signal that would have led to it, and charged the team an extra CI run per occurrence
forever.

Quarantine means the test still runs, its result is reported, and it does not block the
build. The owner and deadline are what stop quarantine from becoming a graveyard: a
quarantine list with no dates grows monotonically and within a year contains the entire suite
of tests for the least stable subsystem, which is the subsystem most in need of tests.

When diagnosing, look first at the four common causes in order: shared state between tests
(the suite passes in isolation and fails in parallel), a real clock or real delay, an
unawaited asynchronous operation, and ordering dependence between tests. A test that fails
only when run after a specific other test is not flaky; it is a shared-state bug reporting
itself accurately.

---

## 5. Coverage

**Report coverage. Do not gate on a global percentage.**

The mechanism: a global threshold is satisfiable by testing the easy surface. Faced with
"80% or the build fails", the cheapest path is exhaustive tests of data classes, mappers, and
getters — code with no branches and no risk — which moves effort *away* from the payment
reconciliation logic where a defect is expensive. The threshold is met, the number goes up,
and the risk profile is unchanged or worse, because the suite is now slower and the team has
learned that coverage work is busywork.

**Gate on diff coverage instead**: of the lines this change introduced or modified, what
fraction is executed by tests. This is answerable, actionable, and scoped to the author's
actual work. It also degrades gracefully — a change that is purely a rename or a
configuration edit carries few coverable lines and does not trigger a fight.

Treat coverage as a **detector of untested regions, not a target**. A module at 12% is worth a
conversation about what it does; a module at 94% has proven only that its lines executed, not
that anything was asserted about them.

---

## Pass conditions

- For each new test, is it the cheapest shape that proves the claim, per the section 1 table?
- Do screenshot tests freeze the clock, fix their data, and fake the image loader?
- Are test doubles hand-written fakes in a shared module, with mocking libraries used only for framework types not owned by this codebase?
- Do UI tests select by accessible name, then role and state, then visible text — with test IDs used only for non-interactive structural containers?
- Are flaky tests quarantined with a named owner and a dated deadline, with no bare retry configured anywhere in CI?
- Is coverage reported without a global percentage gate, and is diff coverage gated instead?
