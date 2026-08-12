# Gates, static analysis, and the verification loop

Everything here answers the same question: what does this practice block, and who notices
when it fires. The loop that keeps the tree explainable, the five changes that must be compiled
before they are claimed done, the tool configuration per ecosystem, the gates that fail the
build, the actions that get handed back rather than performed, and what to do when three
hypotheses have already missed.

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

## 5. CI gating

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

## 6. Stop conditions and refusal boundaries

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

## 7. Three failed guesses

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
- Does CI fail the build on type errors, lint errors, formatting drift, failing tests, size budget regressions, benchmark regressions beyond a stated band, and verified-tier accessibility violations?
- Is the benchmark noise band derived from observed CI variance rather than a guessed percentage?
- Were store uploads, track promotions, version code changes, production migrations, shared-branch force-pushes, and credential rotations handed back rather than performed?
- After three failed hypotheses on a bug, was a trace gathered or an assumption verified rather than a fourth hypothesis attempted?
