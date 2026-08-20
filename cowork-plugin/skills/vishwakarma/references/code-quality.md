# Code Quality

A quality gate only works if it fails the build. Everything else — a warning in a log, a lint
rule set to `warn`, a coverage number printed at the end of a run — is a suggestion, and
suggestions lose to deadlines every time. The design question for any quality practice is
therefore not "is this a good idea" but **what does it block, and who notices when it fires**.

---

## 1. The verification loop

Make the change. Run the gate. **Read the actual error text**, not the exit code. Fix. Re-run.
Proceed only when it passes.

The failure this prevents is proceeding on an assumed pass, and its cost compounds rather than
adds: if change A is never verified and change B lands on top of it, a later failure could
originate in either, and the bisect surface has doubled. After four unverified changes there are
sixteen interaction possibilities and the cheapest recovery is often discarding all four.

Reading the error is a separate discipline from running the gate. `Unresolved reference:
viewModel` and `Cannot access class 'HiltViewModel'; it is defined in a module that is not on
the compile classpath` describe different problems; the build already computed the diagnosis,
and guessing from the first line instead of reading it is choosing to re-derive it slowly.
Report failures rather than iterating silently — three undisclosed attempts leave a working tree
nobody can reason about.

---

## 2. The post-change build gate

A full compile is mandatory before claiming success after a change to **module structure**
(a new module, changed `api`/`implementation` visibility, a new package boundary),
**dependency-injection wiring** (a new `@Inject` constructor, module, binding or scope),
**a navigation graph** (new route, changed argument type), **database schema** (new entity,
changed column, new migration), or **toolchain versions** (Gradle, AGP, Kotlin, Swift, Node,
TypeScript).

The mechanism is shared across all five: **they fail at configuration or codegen time, not at
edit time**. The editor's incremental analysis does not run the annotation processor, resolve
the dependency graph, or validate the schema, so it shows green on code that cannot build. A
missing Hilt binding looks like a perfectly valid `@Inject` constructor until a `MissingBinding`
error arrives 40 seconds into the KSP task.

---

## 3. Static analysis and formatting

Kotlin and Android: **`detekt` with type resolution enabled** — without it detekt sees syntax
only and most rules worth having are disabled — plus a Compose ruleset, **`ktlint`** through
**`spotless`**, and **Android Lint** for platform correctness, whose domain does not overlap
detekt's. Web: **ESLint with type-aware rules** (the `parserOptions.project` wiring), **`tsc
--noEmit` as a gate separate from the bundler** — bundlers transpile per file and strip types
without checking them, so a bundle can build from code that does not typecheck — and
**Prettier**. Apple: **SwiftLint** for correctness, **SwiftFormat** for formatting.

Configuration lives in **one file that CI and local runs both read**, invoked by the same
command. Two config sources guarantee a class of defect where a change passes locally and fails
in CI, leaving the developer to debug by pushing commits.

Formatters run automatically and their output is never discussed. A review comment about a blank
line or an import order is **a formatter that was not wired up**, surfacing as human labour: a
reviewer has a finite number of comments before the author starts skimming, and formatting
comments are the easiest to write, so they crowd out the missing null check.

---

## 4. Choosing the test shape

Pick the **cheapest shape that actually proves the claim**. Pure logic — a calculation, a
parser, a reducer — takes a unit test with no framework and no doubles. A state holder — a
ViewModel, a hook, a store — takes a unit test with a hand-written fake repository asserting
emitted state. Rendering and semantics take a component test using semantics-first selectors.
Visual regression takes a screenshot test with a frozen clock, fixed seeded data and a fake
image loader. Wiring takes one integration smoke test per critical flow, not one per behaviour.
A backend contract takes a contract test against a schema or recorded pact, not a live service.

The mechanism is diagnostic resolution: **an integration test that fails tells you something
broke; a unit test that fails tells you what**. An end-to-end checkout failure implicates cart
logic, pricing, auth, navigation, the network layer and the fixtures; a failing test on
`calculateDiscount` implicates `calculateDiscount`.

Prefer **hand-written fakes in a shared test module**, and confine mocking libraries to
framework types you do not own. A mock encodes the call sequence you expected, so the test fails
when the implementation is refactored even though behaviour is unchanged — it measures coupling,
not correctness — and it returns whatever you told it to, including values the real collaborator
would never produce.

Select elements in UI tests by **accessible name**, then **role and state**, then **visible
text**, and only then a **test ID**. That ordering makes the test double as an accessibility
assertion: a test that finds the submit button by its accessible name fails the moment that name
disappears, which is exactly when the button becomes unusable with a screen reader.

---

## 5. Flakes, coverage, and what fails the build

A test that fails intermittently gets **quarantined with a named owner and a dated deadline**.
It does not get a retry: **a retry converts a real intermittent bug into invisible latency**,
leaving the race in production where it surfaces as a one-in-two-hundred crash nobody can
reproduce. Quarantine means the test still runs and reports, and does not block the build.

**Report coverage; do not gate on a global percentage.** A global threshold is satisfiable by
testing the easy surface — data classes, mappers, getters — which moves effort away from the
payment reconciliation logic where a defect is expensive. Gate on **diff coverage** instead, and
treat coverage as a detector of untested regions rather than a target.

The build fails on: any type error; any lint **error**; any formatting drift; any failing test
outside quarantine; a size budget breach; a benchmark regression beyond a **stated noise band**
derived from observed CI variance; and any accessibility violation at the **verified tier**.
Anything else is advisory and should be labelled as such. **A gate that fires on noise is worse
than no gate**, because it consumes the trust the real gates depend on.

---

## 6. Stop at the irreversible boundary

Hand these back rather than performing them: app store uploads and review-queue submissions,
release track promotions and rollout percentage increases, version code and build number
changes, production database migrations, force-pushes to a shared branch, and credential
rotation. Each is **irreversible or externally visible**, and the reversal cost is measured in
hours or days of several people's time against a saving measured in seconds. Prepare the work
fully — write the migration, verify it against a staging copy — and hand over the command. The
judgement being reserved is the decision to execute, not the engineering.

After **three failed hypotheses** on a single bug, stop guessing and gather a trace, verify a
load-bearing assumption directly, bisect against a known-good state, or reproduce smaller. This
is where the verification loop pays: a history of verified changes bisects cleanly, and one of
assumed passes does not.

## Rules

### MUST NOT — Do not configure a retry for an intermittently failing test; quarantine it with a named owner and a dated deadline so it still runs and reports without blocking the build.

*Why:* A retry converts a real intermittent bug into invisible latency. The underlying race — an unawaited coroutine, a shared fixture, a real clock, an unmocked call — is still present in production code, where it surfaces as a one-in-two-hundred crash nobody can reproduce, and the retry has deleted the only signal that pointed at it while charging an extra CI run per occurrence forever.

### MUST NOT — Do not perform store uploads, release track promotions, version code changes, production migrations, force-pushes to shared branches, or credential rotations; prepare the work and hand over the command.

*Why:* Each is irreversible or externally visible, and the reversal cost is measured in hours or days of several people’s time against a saving measured in seconds. A promoted release cannot be recalled from devices that installed it, a force-push destroys work that exists nowhere else, and a rotated signing key can permanently orphan an app’s update path.

Incorrect:

```text
Run the migration against production because it passed against a staging copy.
```

Correct:

```text
Write the migration, verify it against a staging copy, report what was verified, and hand over the exact command to run.
```

### MUST — After running a gate, read the full error text before making the next change, rather than acting on the exit code or the first line of a stack trace.

*Why:* The build has already computed the diagnosis and printed it, so declining to read it means re-deriving it by guesswork. The distinction is load-bearing: "unresolved reference" and "defined in a module that is not on the compile classpath" name entirely different problems, and only the second tells you the fix is in the build file.

Incorrect:

```text
Build failed -> the symbol is probably misspelled -> rename it -> build again.
```

Correct:

```text
Build failed -> read the message and the Caused by chain -> the class is on a module not on the compile classpath -> add the dependency -> build again.
```

### MUST — Run a full compile before claiming success after any change to module structure, dependency-injection wiring, a navigation graph, a database schema, or a toolchain version.

*Why:* All five fail at configuration or codegen time rather than at edit time, and the editor’s incremental analysis runs neither the annotation processor nor the dependency resolver nor the schema validator. It therefore shows green on code that cannot build — a missing binding looks like a valid @Inject constructor until the KSP task reaches it.

Incorrect:

```text
Add a nullable column and a migration; the IDE is green and the in-memory-database unit tests pass, so report it done.
```

Correct:

```text
Add the column and the migration, then run the full build with schema validation on — which catches the migration written against the old column ordering before every existing user crashes on launch.
```

### MUST — Gate on the type checker itself — `tsc --noEmit`, or the platform compiler — as a step distinct from the bundler build, and enable type resolution in linters that support it.

*Why:* Most bundlers transpile per file and strip types without checking them, so a bundle can build cleanly from code that does not typecheck; the bundler succeeding tells you the syntax parsed and nothing more. The same holds for linters: without type information the rules that catch real defects — floating promises, unsafe any propagation — do not run at all.

### MUST — Select elements in UI tests by accessible name first, then role and state, then visible text, dropping to a test ID only when none of those exist.

*Why:* This ordering makes the test double as an accessibility assertion. A test that finds the submit button by its accessible name fails the moment that name disappears, which is exactly when the button becomes unusable with a screen reader; a test that finds it by data-testid passes whether or not the control is exposed to assistive technology at all.

*Exceptions:*
- Genuinely nameless structural containers — a list wrapper, a layout region with no semantic role — where inventing a name purely for the test would add noise to the accessibility tree. Reaching for a test ID on an interactive control is instead a finding about the component.

### SHOULD NOT — Do not fail the build on a global coverage percentage; report coverage and gate on diff coverage instead.

*Why:* A global threshold is satisfiable by testing the easy surface — data classes, mappers, getters, code with no branches and no risk — which moves effort away from the logic where a defect is expensive. The number rises, the risk profile does not, and the team learns that coverage work is busywork. Diff coverage is scoped to the author’s actual change and degrades gracefully on renames and config edits.

### SHOULD — Write the cheapest test shape that actually proves the claim, and keep integration tests to one per critical flow rather than one per behaviour.

*Why:* Diagnostic resolution is what you are buying: an integration test that fails tells you something broke, while a unit test that fails tells you what. A failing end-to-end checkout implicates cart logic, pricing, auth, navigation, the network layer and its own fixtures; a failing test on calculateDiscount implicates calculateDiscount.

Incorrect:

```text
Prove the discount arithmetic through an end-to-end checkout run in a browser.
```

Correct:

```text
Unit-test the discount arithmetic directly; keep one end-to-end checkout test to prove the pieces are wired together.
```

### SHOULD — Write hand-written fakes in a shared test module for collaborators you own, and reserve mocking libraries for framework types you cannot reasonably reimplement.

*Why:* A mock encodes the call sequence you expected, so asserting on it makes the test fail when the implementation is refactored even though behaviour is unchanged — it measures coupling rather than correctness. A mock also returns whatever you told it to, including values the real collaborator would never produce, so it misses the defects that matter.

Incorrect:

```text
verify(dao).insert(user) then verify(dao).refreshCache() — which goes red when the refresh is correctly moved inside the DAO’s own insert.
```

Correct:

```text
A FakeUserDao backed by a mutable map, asserting the user is retrievable afterwards — green across that refactor, red if the user is not actually stored.
```

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Run the project’s own gate chain — substitute the real commands for this stack. This placeholder covers a TypeScript project; on Android it would be ./gradlew detekt lintDebug testDebugUnitTest, and on Apple swiftlint --strict && xcodebuild test. (blocking)

```bash
npm run typecheck && npm run lint && npm test
```

### Confirm no change in the tree was left unverified or silently retried. (blocking)

- Did you run the relevant gate after every change, and read the full error output rather than the exit code alone?
- Did any change to module structure, dependency injection, navigation, database schema, or a toolchain version get a full compile before you reported it done?
- If you attempted a fix more than once, did you report the failed attempts rather than leaving a tree nobody can reason about?
- Are you claiming any result that you have not actually observed a green run produce?

### Confirm each new test is the cheapest shape that proves its claim. (blocking)

- For each test you added, what claim does it prove, and is there a cheaper shape that would prove the same claim?
- Are your test doubles hand-written fakes for collaborators you own, with mocking libraries reserved for framework types?
- Do your UI tests select by accessible name, role and state, or visible text — and where you used a test ID, is the element genuinely a nameless structural container?
- Do any screenshot tests freeze the clock, fix their data, and fake the image loader?

### Confirm the gates you configured still carry information and stop at the right boundary.

- Is every gate you added able to fail the build, and is everything advisory labelled as advisory?
- Is any benchmark or accessibility gate tight enough to fire on noise, and is its band derived from observed CI variance rather than a guess?
- Did you quarantine flaky tests with an owner and a date rather than configuring a retry, and did you avoid gating on a global coverage percentage?
- Did you stop short of store uploads, track promotions, production migrations, shared-branch force-pushes, and credential rotations, handing over the command instead?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/gates-and-static-analysis.md` — Which tools do I configure per ecosystem, what must fail the build, when is a full compile mandatory, which actions do I refuse to perform, and what do I do after three failed hypotheses?
- `references/testing-strategy.md` — What kind of test proves this particular claim most cheaply, should this double be a fake or a mock, how should UI tests select elements, and what do I do with a flaky test or a coverage number?
