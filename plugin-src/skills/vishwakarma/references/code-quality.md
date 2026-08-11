# Code Quality

A quality gate only works if it fails the build. Everything else — a warning in a log, a
lint rule set to `warn`, a coverage number printed at the end of a run — is a suggestion, and
suggestions lose to deadlines every time. The design question for any quality practice is
therefore not "is this a good idea" but "what does it block, and who notices when it fires".
This file covers static analysis, formatting, testing strategy, and the verification loop
across web, Android, and Apple platforms.

---

## 1. The verification loop

Make the change. Run the gate. **Read the actual error text**, not the exit code. Fix. Re-run.
Proceed only when it passes.

The failure mode this prevents is proceeding on an assumed pass, and its cost compounds
rather than adding. If change A is never verified and change B lands on top of it, a later
failure could originate in either, and the bisect surface has doubled. After four unverified
changes there are sixteen interaction possibilities and the cheapest recovery is often
discarding all four. Verification is not diligence theatre; it is what keeps the search space
linear.

"Read the actual error" is a separate discipline from "run the gate". A compiler error
reading `Unresolved reference: viewModel` and one reading `Cannot access class
'HiltViewModel'; it is defined in a module that is not on the compile classpath` describe
different problems, and guessing from the first line of a stack trace instead of reading the
message is how a five-minute fix becomes an hour. The build already computed the diagnosis —
declining to read it is choosing to re-derive it.

Report failures rather than iterating silently. Three undisclosed attempts at a fix leave a
working tree nobody can reason about, and the reader believes one clean change was made.

---

## 2. The post-change build gate

After a change to any of these five categories, a **compile is mandatory** before claiming
success:

| Category | Example | Where it fails |
|---|---|---|
| Module structure | New Gradle module, changed `api`/`implementation` visibility, new package boundary | Configuration and dependency resolution |
| Dependency injection wiring | New `@Inject` constructor, new Hilt module, new binding, new scope | Annotation processing / KSP codegen |
| Navigation graph | New route, changed argument type, new nav destination | Codegen or runtime graph validation |
| Database schema | New entity, changed column, new migration | Room/Core Data schema codegen and validation |
| Toolchain version | Gradle, AGP, Kotlin, Swift, Node, TypeScript version bump | Plugin compatibility resolution |

The mechanism is shared across all five: **they fail at configuration or codegen time, not at
edit time**. The editor's incremental analysis does not run the annotation processor, does not
resolve the dependency graph, and does not validate the schema. It shows green on code that
cannot build. A missing Hilt binding produces a perfectly valid-looking `@Inject` constructor
and a `MissingBinding` error 40 seconds into the KSP task.

A concrete counter-example: an entity gains a nullable `String` column and the migration is
written. The IDE is green, the unit tests — which use an in-memory database built from the
current schema — pass. The app crashes on launch for every existing user, because the
migration's `ALTER TABLE` was written against the old column ordering and the schema hash
does not match. Only a full build with schema validation enabled catches it.

---

## 3. Static analysis, per ecosystem

### Kotlin and Android

**`detekt`** with **type resolution enabled** and a Compose ruleset. Type resolution is the
part that matters: without it detekt sees syntax only and cannot distinguish a `String` from a
`SpannableString`, which disables most of the rules worth having. The Compose ruleset catches
what generic Kotlin analysis cannot — unstable parameters, composables that emit and return a
value, mutable state hoisted incorrectly, missing modifier parameters.

**`ktlint`**, typically driven through **`spotless`**, for formatting.

**Android Lint** for platform correctness — API level guards, manifest issues, resource
problems, and the accessibility checks it does carry. Its domain does not overlap detekt's;
running one is not a substitute for the other.

### Web and TypeScript

**ESLint with type-aware rules enabled** — meaning the `parserOptions.project` wiring that
lets rules consult the type checker. Without it, the rules that catch real defects
(floating promises, unsafe `any` propagation, unnecessary conditionals on
statically-known-truthy values) do not run at all, and the remaining set is largely stylistic.

**`tsc --noEmit` as a gate separate from the bundler.** The mechanism: most bundlers transpile
per-file and strip types without checking them, so a bundle can build cleanly from code that
does not typecheck. The bundler succeeding tells you the syntax parsed, nothing more.

**Prettier** for formatting.

### Swift and Apple platforms

**SwiftLint** for correctness and style rules, **SwiftFormat** for formatting. The same
separation applies: the linter's opinions are reviewable, the formatter's are not.

### One configuration source

Configuration lives in **one file that CI and local runs both read**. The mechanism is
concrete: two config sources guarantee a class of defect where a change passes locally and
fails in CI, and the developer's only debugging tool is pushing commits to find out what CI
thinks. Local invocation should be the same command CI runs, with the same config path, so a
local pass is genuine evidence about CI rather than a hopeful correlation.

---

## 4. Formatting is not review

Formatters run automatically — on save, on commit, or as a build step — and their output is
never discussed. A review comment about a blank line, an import order, or a trailing comma is
not a review comment; it is **a formatter that was not wired up**, surfacing as human labour.

The mechanism is attention economics. A reviewer has a finite number of comments before the
author starts skimming, and every one spent on whitespace is one not spent on the missing
null check. Worse, formatting comments are the easiest to write and the easiest to satisfy,
so they crowd out substantive review on both sides.

The corollary: formatting must be **fully automatic and non-negotiable**. A formatter that
developers can opt out of produces a codebase with two formats and reintroduces the argument
it was meant to end. Wire it to fail CI on drift, and let the fix be running the formatter.

---

## 5. Choosing the test shape

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

## 6. Fakes over mocks

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

## 7. Selector priority in UI tests

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

## 8. Flaky test policy

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

## 9. Coverage

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

## 10. CI gating

Name explicitly what fails the build. Anything not on this list is advisory, and should be
labelled as such so nobody mistakes a warning for a gate.

| Gate | Fails the build when |
|---|---|
| Type checking | Any type error. `tsc --noEmit` non-zero, or Kotlin/Swift compilation failure. |
| Lint | Any lint **error**. Warnings do not fail — but a rule nobody will act on should be removed, not left at warn. |
| Formatting | Any drift from the formatter's output. |
| Tests | Any failing test outside quarantine. |
| Size budget | Download or bundle size exceeding the stated budget for the target. |
| Performance benchmarks | A regression beyond a **stated noise band**, compared against a stored baseline at a stated percentile. |
| Accessibility | Any violation at the **verified tier** — deterministic, reproducible failures only. |

Two of these need care. Benchmark gates require a noise band derived from **observed
run-to-run variance on the CI hardware**, not a guessed percentage; a gate tighter than the
noise fires constantly, gets ignored, and is then disabled, which is worse than having no
gate because the team believes one exists. Accessibility gates must fire only on the verified
tier for the same reason — a gate that fails on heuristic guesses trains everyone to bypass
it, and takes the genuine failures with it.

The general principle: **a gate that fires on noise is worse than no gate**, because it
consumes trust that the real gates depend on.

---

## 11. Stop conditions and refusal boundaries

Hand these back rather than performing them:

- **App store console uploads** and any submission to a review queue.
- **Release track promotion** — internal to beta, beta to production, staged rollout percentage increases.
- **Version code and build number changes**, which are monotonic and consumed by distribution systems.
- **Production database migrations.**
- **Force-push to a shared branch.**
- **Credential rotation** — signing keys, API tokens, service account keys.

The mechanism is uniform: each is **irreversible or externally visible**, and the cost of a
wrong automated action exceeds any time saved by automating it. A promoted release cannot be
recalled from devices that already installed it. A force-push to a shared branch destroys work
that exists nowhere else. A rotated signing key can permanently orphan an app's update path. A
production migration applied against the wrong schema version can require restoring from
backup. In each case the reversal cost is measured in hours or days of multiple people's time,
against a saving measured in seconds.

Prepare the work fully and stop at the boundary: write the migration, verify it against a
staging copy, and hand over the command. The judgement being reserved is the decision to
execute, not the engineering.

---

## 12. Three failed guesses

After **three failed hypotheses** on a single bug, stop generating hypotheses. Question the
architecture, or gather a trace.

The mechanism: three misses in a row is strong evidence that the mental model producing them
is wrong, and a fourth guess drawn from the same wrong model is no likelier to land than the
third. Guessing feels productive because each hypothesis is cheap, but the expected value of
guess N is falling while its cost stays flat, and the sunk investment makes abandoning the
model harder with each attempt.

What to do instead, in rough order of cost:

**Gather a trace.** Add logging at the boundaries the data crosses, capture a systrace or a
profiler session, record network traffic, dump the state at the moment of failure. Replace
inference with observation.

**Question a load-bearing assumption.** Name the things you have been treating as given —
"the response is well-formed", "this runs on the main thread", "the config in CI matches
local", "this method is called once" — and verify one directly rather than reasoning from it.
Bugs that survive three good hypotheses usually live inside an assumption, not inside the
logic.

**Bisect.** If a known-good state exists, find the change that broke it. This is often faster
than any amount of reasoning, and it is the reason the verification loop in section 1 matters:
a history of verified changes bisects cleanly, and one of assumed passes does not.

**Reproduce smaller.** Strip the failing case until it is minimal. Each thing removed without
the failure disappearing is a variable eliminated.

---

## Pass conditions

- Was every change followed by running the relevant gate, with the actual error output read rather than the exit code alone?
- Did any change to module structure, dependency injection, navigation, database schema, or toolchain version get a full compile before being claimed as done?
- Is static analysis configured from a single file that both CI and local invocation read, with the same command in both?
- Is detekt running with type resolution enabled, and is `tsc --noEmit` a gate distinct from the bundler build?
- Is a formatter wired to run automatically, and is CI configured to fail on formatting drift?
- Does the review diff contain zero comments about formatting?
- For each new test, is it the cheapest shape that proves the claim, per the section 5 table?
- Do screenshot tests freeze the clock, fix their data, and fake the image loader?
- Are test doubles hand-written fakes in a shared module, with mocking libraries used only for framework types not owned by this codebase?
- Do UI tests select by accessible name, then role and state, then visible text — with test IDs used only for non-interactive structural containers?
- Are flaky tests quarantined with a named owner and a dated deadline, with no bare retry configured anywhere in CI?
- Is coverage reported without a global percentage gate, and is diff coverage gated instead?
- Does CI fail the build on type errors, lint errors, formatting drift, failing tests, size budget regressions, benchmark regressions beyond a stated band, and verified-tier accessibility violations?
- Is the benchmark noise band derived from observed CI variance rather than a guessed percentage?
- Were store uploads, track promotions, version code changes, production migrations, shared-branch force-pushes, and credential rotations handed back rather than performed?
- After three failed hypotheses on a bug, was a trace gathered or an assumption verified rather than a fourth hypothesis attempted?
