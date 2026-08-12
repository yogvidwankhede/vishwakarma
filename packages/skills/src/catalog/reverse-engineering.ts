// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * A wrong tool that returns nothing is more expensive than a wrong tool that crashes.
 *
 * That single asymmetry generates most of this skill. A Java decompiler pointed at a Flutter
 * application does not error — it emits a handful of thin wrapper classes and exits cleanly, and
 * the result is indistinguishable from a tool that has been defeated by obfuscation. So the natural
 * next move is decompiler settings, then a second engine, then a third, and an hour later the
 * conclusion is "heavily obfuscated". It is not obfuscated. The logic was never in the Dalvik
 * bytecode; it was compiled ahead of time into a native library, and no Java decompiler will ever
 * see it. A crash would have cost ten seconds. Silence cost an hour, and produced a false finding.
 *
 * The defence is a fingerprint: seconds spent establishing what kind of artefact this is, before
 * the expensive default move is made, because the categories have non-overlapping toolchains and
 * the failure mode being guarded against is not slowness but a plausible-looking empty result. The
 * same shape recurs after decompilation — a wrapper archive that yields nine source files, a string
 * scan that returns no URLs because they are encrypted — and each has a stated abort condition
 * rather than a licence to grind.
 *
 * The second mechanism is that obfuscators rename what they own and cannot touch what the runtime
 * resolves by string. Library package names, Retrofit annotation values, resource identifiers,
 * generated Dagger factory names, serialisation field names, and the `@kotlin.Metadata` annotation
 * are all load-bearing at runtime, so they survive renaming and become the anchors that a trace
 * through an unreadable tree is built on.
 *
 * **Scope.** This covers static structural analysis of software you are authorised to examine: your
 * own builds, publicly distributed binaries examined for competitive or research purposes, security
 * review under a written scope agreement, and interoperability work. It reads structure — what a
 * package contains, how it is assembled, what it talks to. The boundary is crossed the moment the
 * goal shifts from understanding structure to defeating a control, and that omission is deliberate
 * rather than a gap to be filled in later.
 */
export const reverseEngineering: SkillManifest = {
  vsm: '1.0',
  id: 'reverse-engineering',
  name: 'Reverse Engineering and Structural Analysis',
  description:
    'Use when statically analysing an artefact you are authorised to examine — fingerprinting, decompilation, call-flow tracing.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'architecture',
  tags: ['static-analysis', 'android', 'decompilation', 'obfuscation', 'triage'],

  activation: {
    intents: [
      'statically analysing an application package you are authorised to examine',
      'verifying that your own release build obfuscated, stripped, or excluded what you expected',
      'competitive or research analysis of a publicly distributed binary',
      'interoperability work against an undocumented format or wire protocol',
      'a decompiler returned almost nothing and the artefact looks heavily obfuscated',
      'recovering endpoints, components, or dependencies from a renamed codebase',
      'deciding which decompiler or toolchain an artefact actually needs',
      'writing up a structural analysis so a reader can act on it',
      'triaging any investigation whose default first step is expensive',
    ],
    globs: [
      '**/*.apk',
      '**/*.aab',
      '**/*.dex',
      '**/*.smali',
      '**/*.jar',
      '**/*.aar',
      '**/AndroidManifest.xml',
      '**/proguard-rules.pro',
    ],
    keywords: [
      'reverse engineering',
      'decompile',
      'apk',
      'aab',
      'dex',
      'smali',
      'obfuscation',
      'proguard',
      'r8',
      'kotlin metadata',
      'split apk',
      'buildconfig',
      'static analysis',
      'fingerprint',
    ],
  },

  content: {
    summary:
      'Use before and during static analysis of an artefact you are authorised to examine: confirm scope, fingerprint the framework from the archive listing before installing tooling, anchor traces on strings obfuscators cannot rename, and tier the report.',

    body: `# Reverse Engineering and Structural Analysis

Fingerprint before you commit effort. A ten-second check that tells you whether the expensive path
is the right path is worth more than any optimisation applied to the wrong path, because the cost of
the wrong path is not its runtime — it is the time spent misreading its empty output as a hard
problem.

## 1. Scope and authorisation

Establish the boundary before the first command, because the technique is identical on both sides of
it and only the authorisation differs. Write down three things: what artefact you are examining, who
authorised the examination, and what you are permitted to do with the findings. If any of the three
is unclear, the analysis has not started.

Four situations are normally in scope: **your own software**, including builds you shipped and want
to verify; **publicly distributed binaries** examined for competitive or research purposes, where
you observe behaviour without redistributing code; **security review under a written scope
agreement** naming the artefact and the permitted activity; and **interoperability work** where an
undocumented format or protocol must be understood to implement against.

**The boundary is crossed the moment the goal shifts from understanding structure to defeating a
control.** Extracting credentials belonging to other people's users, circumventing content
protection, patching a binary to bypass licensing or integrity checks, and instrumenting a running
application to disable safety mechanisms are all outside this skill — and are a different activity
in practice, operating on runtime state rather than static structure. Nothing below produces them as
a by-product. One further discipline point: findings are **claims about the artefact**, not claims
about the vendor's servers. A base URL in a build-configuration class tells you the client is
compiled to talk to that host; it does not authorise you to send traffic to it.

## 2. Phase 0 — fingerprint before installing anything

The first action on any package is a file listing, not a decompilation, and what you are looking for
is the **framework marker**, because the framework determines the whole toolchain and the toolchains
do not overlap.

| Marker in the archive | Framework | Where the logic is |
|---|---|---|
| \`lib/<abi>/libflutter.so\` plus \`libapp.so\` | Flutter | AOT-compiled Dart; needs native tooling |
| \`libhermes.so\`, \`assets/index.android.bundle\`, \`libreactnativejni.so\` | React Native | Hermes bytecode or a JS bundle |
| \`assets/www/cordova.js\`, \`assets/www/index.html\` | Cordova / Ionic | HTML, CSS and JS in a WebView |
| \`*.dll\` with CLI headers, \`assemblies/\` | Xamarin / MAUI | CIL; needs a .NET decompiler |
| \`classes*.dex\` with substantial content and none of the above | Native Android | JVM bytecode; the Java path is correct |

\`\`\`bash
unzip -l app.apk | grep -Ei 'libflutter|libapp\\.so|libhermes|index\\.android\\.bundle|cordova\\.js|\\.dll'
\`\`\`

If the fingerprint returns Flutter, React Native, Cordova or Xamarin, **stop and switch toolchains**.
Do not run the decompiler anyway "to see what comes out": what comes out is a plausible near-empty
result that costs an hour to disbelieve. React Native and Cordova are cheapest to analyse, their
logic being JavaScript and often only minified; Flutter is the most expensive.

## 3. What the fingerprint does not settle

Three cheap readings finish the triage, and **fingerprint-and-decompile** carries the grep lists and
the thresholds. Scan strings rather than reading code, because obfuscators rename only the symbols
they control while library machinery resolves by string at runtime — reflection lookups, service
loader entries, annotation retention, resource paths — so those literals are load-bearing and
removing them breaks the application. A package whose every class is named \`a\` still contains the
literal \`retrofit2\`, and \`@SerializedName("user_id")\` survives on a class called \`c.d.a\` because
the wire format depends on it.

Estimate obfuscation from the *shape* of the package tree before reading any code: an unobfuscated
root reads like an organisation, an obfuscated one is littered with one- and two-character names,
because the renamer allocates from the shortest alphabet to minimise size. More than roughly a
third of top-level packages at one or two characters means obfuscated. Where a scan for \`http\`
returns almost nothing on an application that plainly makes network calls, the strings are
encrypted and static endpoint extraction will not work — say so and stop rather than grinding.

Then confirm a JDK at version 17 or later before anything else, since modern decompilers fail on
older runtimes with class-version errors that read like a corrupt input, and run the **primary
decompiler alone**, escalating to a secondary only for classes where the primary warned or produced
obviously wrong control flow. One further trap is numeric rather than judgemental: modern
distribution splits an application into a base module plus configuration splits, and decompiling
the downloaded wrapper succeeds while yielding a small tree that reads as "heavily obfuscated".
**Fewer than roughly ten source files alongside one or more inner \`.apk\` entries means you
decompiled the wrapper** — re-target \`base.apk\`.

## 4. Tier the output, because inventory and analysis have different costs

The survey, name-recovery and call-tracing phases are in **analysis-and-reporting**; what belongs
here is the policy that governs how much of their result you write down.

**Tier one is a mandatory flat inventory**: every endpoint, every component with its exported
status, every permission, every library, and every build-configuration value, one row each and no
prose. It is complete by construction, scannable, and diffable against a later build. **Tier two is
deep detail capped at roughly ten items**, spent on the anomalies and on the flows the requester
actually named.

The split exists because inventory is near-free per item and analysis is not, so mixing them takes
the cost of analysis at the volume of inventory — a report that narrates all 184 endpoints costs
days and is read by nobody, while the same 184 as rows plus ten analysed flows costs hours and
answers the question. State coverage numerically rather than adjectivally: "184 of an estimated 190
endpoints; 6 classes failed to decompile" is a coverage claim, "comprehensive" is not. Throughout,
distinguish evidence from inference at every link, and label an inference as one.

## 5. The general shape

Fingerprint before committing, abort into different tooling when the fingerprint says so, tier the
output. This applies to any investigation with an expensive default step — a large unfamiliar
codebase, a failing test suite — because triage is not a preliminary to the work; it is the step
that decides which work is worth doing.`,

    references: [
      {
        id: 'fingerprint-and-decompile',
        title:
          'Scope and authorisation, framework fingerprinting, library detection, obfuscation level, engine selection, and the split-APK trap',
        answers:
          'What must be established before the first command, how do I tell in ten seconds which toolchain an artefact needs, which libraries can I detect without reading code, how obfuscated is this, and why did decompiling produce nine source files?',
        content: `# Scope, fingerprinting, library detection, obfuscation level, and archive selection

Fingerprint before you commit effort. A ten-second check that tells you whether the expensive path is the
right path is worth more than any amount of optimisation applied to the wrong path, because the cost of the
wrong path is not just its own runtime — it is the time spent misreading its empty output as a hard problem.
Binary analysis demonstrates this more sharply than most disciplines, since the tools are mutually exclusive
and each one fails quietly on inputs meant for another, but the discipline generalises to any investigation
with an expensive default move.

This reference covers **static structural analysis of software you are authorised to examine**: your own
applications and their build output, competitive analysis of publicly distributed binaries, security review
conducted under a written scope agreement, and interoperability work where a format or protocol must be
understood to be implemented against. It deals with reading structure — what a package contains, how it is
assembled, what it talks to. It does not cover defeating protections, and that omission is deliberate rather
than an oversight to be filled in later.

## 1. Scope and authorisation

Establish the boundary before the first command, because the technique is identical on both sides of it and
only the authorisation differs. Write down three things: what artefact you are examining, who authorised the
examination, and what you are permitted to do with the findings. If any of the three is unclear, the analysis
has not started yet.

Four situations are normally in scope. **Your own software**, including builds you shipped and want to verify
— confirming that an obfuscation config actually applied, that a debug endpoint did not survive into release,
that a dependency you thought you removed is gone. **Publicly distributed binaries examined for competitive
or research purposes**, where you observe what a product does without redistributing its code. **Security
review under a scope agreement** that names the artefact and the permitted activity in writing. And
**interoperability work**, where an undocumented format or wire protocol must be understood well enough to
interoperate with it.

The boundary is crossed the moment the goal shifts from understanding structure to defeating a control.
Extracting credentials belonging to other people's users, circumventing content protection, patching a binary
to bypass licensing or integrity checks, and instrumenting a running application to disable safety mechanisms
are all outside this reference. They are also a different activity in practice: they operate on runtime state
rather than static structure, and nothing in the workflow below produces them as a by-product.

One more discipline point. Findings from static analysis are **claims about the artefact**, not claims about
the vendor's servers. A base URL in a build-configuration class tells you the client is compiled to talk to
that host; it does not authorise you to send traffic to it. Keep analysis and any live testing on separate
authorisation footings.

## 2. Phase 0 — fingerprint before installing anything

The first action on any package is a file listing, not a decompilation. What you are looking for is the
**framework marker**, because the framework determines the entire toolchain and the toolchains do not
overlap. A Java decompiler pointed at a Flutter application does not error. It emits a handful of thin
wrapper classes and finishes quickly, and the output looks exactly like a tool that has failed — so the
natural next step is to try decompiler settings, then a second decompiler, then a third, and an hour later
the conclusion is that the application is heavily obfuscated. It is not obfuscated. Its logic was never in
the Dalvik bytecode; it was compiled ahead-of-time into a native library, and no Java decompiler will ever
see it.

| Marker in the archive | Framework | What the logic actually is |
|---|---|---|
| \`lib/<abi>/libflutter.so\` plus \`lib/<abi>/libapp.so\` | Flutter | AOT-compiled Dart in \`libapp.so\`; needs native tooling |
| \`lib/<abi>/libhermes.so\`, or \`assets/index.android.bundle\`, or \`libreactnativejni.so\` | React Native | JavaScript — Hermes bytecode or a JS bundle |
| \`assets/www/cordova.js\`, \`assets/www/index.html\` | Cordova / Ionic | HTML, CSS and JavaScript in a WebView |
| .NET assemblies (\`*.dll\` with CLI headers), \`assemblies/\` | Xamarin / MAUI | CIL, needs a .NET decompiler |
| \`classes*.dex\` with substantial \`smali\`/Java content and none of the above | Native Android | JVM bytecode; the Java decompiler path is correct |

Run the listing and grep for these markers first:

\`\`\`bash
unzip -l app.apk | grep -Ei 'libflutter|libapp\\.so|libhermes|index\\.android\\.bundle|cordova\\.js|\\.dll'
\`\`\`

If the fingerprint returns Flutter, React Native, Cordova or Xamarin, **stop and switch toolchains**. Do not
"try the decompiler anyway to see what comes out" — what comes out is a plausible-looking near-empty result
that costs an hour to disbelieve. React Native and Cordova are the cheapest of these to analyse, because
their logic is JavaScript and often only minified; Flutter is the most expensive, because AOT-compiled Dart
requires native reverse engineering and a snapshot parser rather than a decompiler.

The mechanism worth internalising: **a wrong tool that returns nothing is more expensive than a wrong tool
that crashes**, because a crash is unambiguous and an empty result invites investigation. Phase 0 exists to
make the ambiguous failure impossible.

## 3. Detecting the network and infrastructure stack by string scan

Once the framework is confirmed as native Android, the next cheap question is which libraries the application
is built on. Do this by scanning strings rather than by reading code, because the strings survive symbol
obfuscation.

The mechanism is that obfuscators rename symbols they control, but a great deal of library machinery resolves
by string at runtime: reflection lookups, service loader entries, annotation retention, resource paths and
class names embedded in generated code. Those strings are load-bearing, so removing them breaks the
application. A package whose every class is named \`a\`, \`b\` or \`c\` will still contain the literal \`retrofit2\`
somewhere, because Retrofit's own package name is not the application's to rename.

| String signal | Indicates |
|---|---|
| \`retrofit2\`, \`Lretrofit2/http/\` | Retrofit — annotation-driven HTTP client; endpoints are recoverable from annotations |
| \`okhttp3\`, \`OkHttpClient\` | OkHttp — interceptors, connection pooling, often certificate pinning config |
| \`io/ktor/\`, \`HttpClient\` | Ktor client — Kotlin-native, endpoints usually built as strings rather than annotations |
| \`com/apollographql/\`, \`.graphqls\`, \`operationId\` | Apollo — GraphQL; look for operation documents in assets |
| \`com/android/volley\` | Volley — older stack, request classes rather than interfaces |
| \`com/google/gson\`, \`@SerializedName\` | Gson serialisation; field names recoverable from annotations |
| \`kotlinx/serialization\`, \`$serializer\` | kotlinx.serialization; generated serialisers carry field names |
| \`com/squareup/moshi\`, \`JsonAdapter\` | Moshi; adapters may be generated or reflective |
| \`dagger/\`, \`hilt\`, \`_Factory\`, \`_MembersInjector\` | Dagger/Hilt DI — generated names reveal the object graph |
| \`koin\`, \`module {\` residue in strings | Koin DI — modules registered by string keys |
| \`androidx/room\`, \`_Impl\` | Room database; schema recoverable from generated implementations |
| \`firebase\`, \`google-services\` residue | Firebase services; check which modules are actually linked |

The dependency-injection signals are worth more than they look. Dagger and Hilt generate classes named after
what they inject — \`LoginRepository_Factory\`, \`ApiModule_ProvideOkHttpClientFactory\` — and generated code is
frequently excluded from obfuscation rules, which hands you a partial map of the object graph including
component names the obfuscator otherwise erased. Serialisation signals matter for the same reason:
\`@SerializedName("user_id")\` must retain its literal because the wire format depends on it, so data-transfer
object field names survive even when the class is called \`c.d.a\`.

## 4. Estimating obfuscation level from the package tree

Before reading any code, look at the **shape** of the package hierarchy. This is a two-second check that sets
expectations for everything downstream.

An unobfuscated application has a package root that reads like an organisation: \`com/example/app/\`,
\`com/example/data/\`, \`com/example/ui/\`. An obfuscated one has a root littered with one- and two-character
package names — \`a/\`, \`b/\`, \`c/\`, \`a/a/\`, \`a/b/\` — because the renamer allocates identifiers from the
shortest available alphabet to minimise size. A tree where more than roughly a third of top-level packages
have names of one or two characters is obfuscated, and the ratio is a reasonable proxy for how aggressive
the configuration was.

Three levels, and what each implies for effort:

**None.** Class and method names are meaningful. Read the code directly; architecture is legible from names
alone. Time to a structural map: minutes.

**Partial.** Application code is renamed but library packages, generated code, and anything in a \`-keep\` rule
survives. This is the common case for a release build with default rules. Names recovered from Kotlin
metadata (section 8) will fill much of the gap. Time to a structural map: an hour or two.

**Aggressive.** Renaming plus string encryption, control-flow flattening, or reflection-heavy indirection.
String scanning still works for library detection because library strings are load-bearing, but literal URLs
and annotation values may be decrypted at runtime rather than stored in the constant pool. Recognise this
early: if a string scan for \`http\` returns almost nothing on an application that plainly makes network calls,
the strings are encrypted, and static extraction of endpoints is not going to work. Say so and stop, rather
than grinding.

## 5. Phase 1 — dependencies and engine selection

The toolchain is a JDK at version 17 or later, one primary decompiler, and one secondary held in reserve.
Confirm the JDK before anything else: modern decompilers target recent bytecode and fail with unhelpful class
version errors on older runtimes, and that error is easy to misread as a corrupt input.

Run the **primary decompiler first, alone**. Escalate to the secondary only for the specific classes where
the primary emitted warnings, produced obviously wrong control flow, or bailed out. The cases where engines
diverge are narrow and recognisable: heavily nested lambdas and method references, generic signatures with
complex bounds, long stream pipelines, \`switch\` on strings, and Kotlin \`suspend\` functions whose state
machine confuses the loop reconstructor. Everything else decompiles identically.

The mechanism for not running both by default is cost arithmetic. Decompilation is the most expensive step in
the workflow, often minutes on a large application. Running two engines doubles that cost to produce output
that is byte-identical for the overwhelming majority of classes, then leaves you diffing two large trees to
find the few that differ. Run one, read the warning list, escalate the handful of files that need it — and
keep the raw output, because every later phase greps across it and regenerating it is pure waste.

## 6. Phase 2 — the split-APK trap

Modern Android distribution splits an application into a base module plus configuration splits — one per ABI,
per screen density, per language — and the file a user downloads is often a bundle wrapper containing those
splits as inner archives rather than the application itself.

Decompiling the wrapper succeeds. It produces a small tree — a handful of source files implementing installer
or loader logic, plus a set of \`.apk\` files sitting inside — and nothing errors, so the natural reading of a
tiny result is that the application is small or heavily obfuscated.

The heuristic is numeric and reliable. **Fewer than roughly ten source files, alongside one or more inner
\`.apk\` entries, means you decompiled the wrapper.** Re-target the base archive — usually named \`base.apk\` —
and start again. Configuration splits named for an ABI (\`split_config.arm64_v8a.apk\`), a density
(\`split_config.xxhdpi.apk\`) or a language (\`split_config.en.apk\`) contain resources and native libraries, not
application logic, and are worth listing but not decompiling.

Check the split set for a second reason: it tells you which ABIs and locales the application ships, a fact
about the product that no amount of code reading reveals.

---

## Pass conditions

- Is the artefact under analysis, the source of authorisation, and the permitted use of findings all recorded before the first command?
- Does the analysis stay within static structural examination, with no protection bypass, credential extraction, or runtime tampering?
- Are static findings stated as claims about the artefact rather than as authorisation to send traffic to any host named in it?
- Was a file listing run and checked for framework markers before any decompiler was installed or invoked?
- If markers indicated Flutter, React Native, Cordova or Xamarin, did the workflow stop and switch toolchains rather than proceeding with a Java decompiler?
- Was a string scan run for network, dependency-injection and serialisation signals, with results recorded even where symbols are obfuscated?
- Was the obfuscation level estimated from the proportion of one- and two-character package names, and stated in the report?
- If a scan for URL literals returned almost nothing on a networked application, was string encryption identified and static endpoint extraction declared infeasible rather than continued?
- Is the JDK at version 17 or later, verified before decompilation?
- Was the primary decompiler run alone, with the secondary invoked only on classes that produced warnings or visibly broken output?
- Was the decompiled tree retained for later phases rather than regenerated?
- If the decompiled output contained fewer than about ten source files alongside inner \`.apk\` entries, was the base archive re-targeted?`,
      },
      {
        id: 'analysis-and-reporting',
        title:
          'Structural survey, Kotlin name recovery, call-flow anchoring, tiered output, and the general fingerprint-abort-tier discipline',
        answers:
          'What do I read first once the right archive is decompiled, how much of an obfuscated Kotlin application can be renamed back, how do I trace a flow with no readable method names, and how should the report be shaped so it is read?',
        content: `# Structural survey, name recovery, call-flow anchoring, and tiered reporting

The fingerprinting half decides which archive to decompile with which toolchain. This half is what happens
once the correct tree exists: what to read first, how much of an obfuscated Kotlin application can be renamed
back, how to trace a flow anchored on strings that could not be renamed, and how to shape the output so that
the analysis is read rather than filed. It closes on the generalisation, because none of the three moves —
fingerprint, abort, tier — is specific to binaries.

## 7. Phase 3 — structural survey

With the correct archive decompiled, the survey has three steps, in order.

**The manifest.** Read it before any source file. It names the launcher activity, which is the entry point
for every call-flow trace; the declared components — activities, services, broadcast receivers, content
providers — which is the application's surface area to the rest of the system; the permissions requested,
which bound what the application can possibly do; and the exported components, which are what other
applications can reach. An \`android:exported="true"\` component with no permission guard is a structural fact
worth recording regardless of what you were asked to look for. Also read \`minSdkVersion\`, \`targetSdkVersion\`
and any \`<queries>\` block, which reveals which other packages the application looks for.

**Every generated build-configuration class.** Search for classes named \`BuildConfig\` in any package, and read
all of them — the application's own and each library's. The mechanism that makes these valuable is a build
ordering detail: they are generated during the build, after the obfuscation configuration has been read, and
they are typically covered by keep rules because application code references their fields by name. So while
everything around them is renamed, they retain their original field names and their literal values:

\`\`\`java
public final class BuildConfig {
  public static final String BUILD_TYPE = "release";
  public static final String FLAVOR = "production";
  public static final String API_BASE_URL = "https://api.example.com/v3/";
  public static final boolean FEATURE_NEW_CHECKOUT = true;
  public static final int VERSION_CODE = 4821;
}
\`\`\`

That single class frequently supplies the base URL, the build flavour, the version, and the feature flag set
— which is most of what the structural survey is trying to establish, obtained without reading a line of
business logic. Read library \`BuildConfig\` classes too: they identify library versions, which in turn tells
you which known behaviours and defaults apply.

**Class-name shapes.** Where names survive, architecture is inferable from suffixes and package layout
without reading bodies. \`*ViewModel\` and \`*UiState\` alongside a \`ui/\` package indicate an MVVM or MVI
presentation layer. \`*Repository\` between \`*Api\` and \`*Dao\` indicates a repository pattern with remote and
local sources. \`*UseCase\` or \`*Interactor\` indicates a clean-architecture domain layer. \`*Manager\` and
\`*Helper\` in large numbers indicate an older or less structured codebase. Packages organised by feature
(\`checkout/\`, \`profile/\`) versus by layer (\`data/\`, \`domain/\`, \`ui/\`) tells you how the team divides work.
Record the inference and the evidence for it, and mark it as an inference.

## 8. Phase 3.5 — name recovery on obfuscated Kotlin

On an obfuscated Kotlin application, a large fraction of original names is still present, in a place
obfuscators cannot clear.

The Kotlin compiler emits a \`@kotlin.Metadata\` annotation on every class it generates. It holds the class's
Kotlin-level signature: the fully-qualified original name, type parameters with variance, property names,
function signatures, nullability, default-argument masks, and the shape of \`data class\` components. The
Kotlin runtime and reflection library read it to resolve \`KClass\` operations, \`copy()\` and \`componentN()\` on
data classes, default arguments in named-argument calls, and cross-module inline functions.

That dependency is what makes it non-removable. **The metadata must survive for the language runtime to
work.** An obfuscator can rename the JVM symbols — the actual class and method names in the constant pool —
but if it strips or corrupts the metadata strings, Kotlin reflection breaks and features the application
depends on start failing at runtime. So the standard configuration leaves it intact, and each obfuscated
class carries a pointer back to its own original name.

Mining it is a matter of parsing the annotation's string arrays and building a mapping from obfuscated JVM
name to original Kotlin name. Accuracy is not uniform, and the difference is worth understanding:

| Class kind | Recovery quality | Why |
|---|---|---|
| Classes following naming conventions (\`*ViewModel\`, \`*Repository\`, \`*UseCase\`) | High | Suffix plus package position cross-checks the metadata name, so errors are detectable |
| Objects, sealed hierarchies, companions | High | Structural relationships in the metadata corroborate the names |
| Data-transfer objects | Lower | Names are arbitrary and interchangeable, with no conventional shape to cross-check; serialisation annotations are a better source for their field names |
| Synthetic and lambda classes | Not applicable | No meaningful original name exists |

Two limits. This applies to Kotlin classes only — a mixed codebase recovers nothing for its Java classes.
And an obfuscator explicitly configured to rewrite metadata alongside symbols defeats it; if the recovered
names are gibberish rather than meaningful, that is the situation, and you should stop and note it rather
than trying to salvage the mapping.

Where a mapping is recovered, apply it as a rename layer over the decompiled tree rather than editing files in
place, so every claim can still be traced back to the original artefact.

## 9. Phase 4 — call-flow anchoring

Tracing a flow through an obfuscated tree by following method calls fails, because the names carry no meaning
and the graph is wide. Anchor on the things that could not be renamed instead, and work outward from them.

Three anchor classes, in order of reliability. **Annotation values** — a Retrofit interface method is
\`@GET("v3/users/{id}/orders")\` even when the interface is named \`f\` and the method is \`a\`, because the
annotation value is the request path and the library reads it at runtime. **URL and path literals**, which
must be present in the constant pool for the request to be constructible, unless string encryption is in use.
**Resource names** — layout IDs, string resource keys, view IDs — which live in the resource table and are
resolved by name, so \`R.layout.activity_checkout\` survives and ties an obfuscated class to a feature.

From those anchors, build the flow in one direction:

1. Locate the launcher activity or \`Application\` subclass named in the manifest.
2. Find where the HTTP client is constructed — the \`OkHttpClient.Builder\` chain, or the Retrofit builder, or
   the Ktor \`HttpClient { }\` block. Interceptors registered there reveal authentication scheme, headers,
   logging, and certificate pinning configuration.
3. From the client construction, find the interfaces it is used to create, which gives the endpoint set.
4. From each endpoint annotation, search the tree for references to the enclosing interface to find the call
   sites, and from the call sites walk up to the screen or service that triggers them.

The result is a trace from entry point to network call that does not depend on a single readable method name.
Record which links are evidence and which are inference: "class \`f\` declares \`@GET("v3/orders")\`" is
evidence; "the checkout screen calls it" is inference until a reference chain is shown.

## 10. Phase 5 — tiered output as cost control

The output of a structural analysis is a report, and its constraint is the reader's attention rather than
your completeness. A 200-endpoint application described with a section per endpoint produces a document
nobody reads, which has the same practical value as no analysis at all — worse, because it cost days.

Two tiers, and the split is not negotiable.

**Tier one: a mandatory flat inventory.** Every item found, one row each, no prose. Endpoints with method,
path and the class declaring them. Declared components with their exported status. Permissions. Detected
libraries with versions where recoverable. Build-configuration values. This is complete by construction, it
is scannable, it is diffable against a later build, and it is the artefact people actually return to.

**Tier two: deep detail, capped at roughly ten items.** Reserve the cap for two things: **anomalies** — the
exported component with no permission check, the debug endpoint in a release build, the flag that gates a
feature not yet announced, the library version with known issues — and **the flows the user actually asked
about**. Nothing else gets a section, however interesting it was to work out.

The mechanism is that inventory and analysis have different cost curves. Inventory is close to free per item
once the extraction is written, so it should be exhaustive. Analysis costs real time per item and real
attention per item on the reading side, so it must be rationed. Mixing them — writing a paragraph per
endpoint — takes the worst of both: the cost of analysis applied at the volume of inventory.

State coverage explicitly. "Recovered 184 of an estimated 190 endpoints; 6 classes failed to decompile,
listed in the appendix" is a usable result. Silence about what was missed makes the whole report unusable,
because the reader cannot tell absence of a finding from absence of a search.

## 11. Generalising: fingerprint, abort, tier

Nothing in the workflow above is specific to binaries. Strip the domain out and three moves remain, and they
apply to any investigation whose default first step is expensive.

**Fingerprint before committing.** Spend seconds establishing what kind of thing you are looking at, because
the categories have different correct approaches and the wrong approach often fails quietly rather than
loudly. **Abort into a different tool when the fingerprint says so** — the failure mode being guarded against
is not "the expensive path is slow" but "the expensive path returns something that looks like a hard problem
and is actually a wrong turn". **Tier the output** — exhaustive inventory, rationed depth — because the
reader's attention runs out long before the material does.

*A large unfamiliar codebase.* The expensive default is reading source files until the architecture becomes
apparent. The fingerprint is cheaper and better: manifest and lockfiles to identify the framework and major
dependencies; the directory shape at depth two to distinguish layer-organised from feature-organised;
\`git log --format=%an | sort | uniq -c | sort -rn\` for who owns what; file churn over the last year for where
the work happens; the CI configuration for what the team considers a gate. Ten minutes, and it changes which
files you open — the same way the framework marker changes which decompiler you run. The abort condition is
concrete: if the fingerprint shows the logic lives in generated code, in a DSL, or in configuration rather
than in the source tree, then reading source files is the wrong path entirely, and continuing to read them
produces the same misleading near-empty result as the Java decompiler on Flutter. Then tier: one inventory
of modules with their entry points and owners, and deep detail only on the subsystem the task concerns.

*A failing test suite.* The expensive default is investigating failures in the order the runner printed them.
The fingerprint is to look at the shape of the failure set first: 200 failures with one distinct error
message is one root cause, and fixing it clears the lot; 200 failures with 200 distinct messages is a broken
environment or a bad merge rather than 200 bugs. Sort messages by frequency, check whether the failures share
a module or a fixture, and check whether they fail on a clean checkout of the previous commit — that last one
is the abort condition, because if they fail there too, the change under test is not the cause and every
minute spent reading its diff is wasted. Then tier: a table of every failure grouped by distinct error, and
detailed investigation only of the largest group and any genuine singletons.

The unifying claim is that triage is not a preliminary to the work. It is the step that decides which work is
worth doing, and it is almost always cheaper than the first step of the alternative.

---

## Pass conditions

- Was the manifest read for launcher activity, declared and exported components, permissions and SDK levels before any source file?
- Were all \`BuildConfig\` classes read, application and library, with base URL, flavour, version and feature flags extracted?
- Is every architectural claim from class-name shape labelled as an inference with its evidence?
- On obfuscated Kotlin, was \`@kotlin.Metadata\` mined for original names, with recovery confidence reported separately for convention-following classes and for data-transfer objects?
- Was any recovered name mapping applied as an overlay rather than by editing the decompiled tree in place?
- Are traces anchored on annotation values, URL literals or resource names rather than on obfuscated method names?
- Does each trace run from manifest entry point through client construction to call site, with evidence and inference distinguished at each link?
- Does the report contain a complete flat inventory of endpoints, components, permissions, libraries and build-configuration values?
- Is deep detail limited to roughly ten items, spent on anomalies and on the flows the requester named?
- Is coverage stated numerically, including what failed to decompile or could not be recovered?`,
      },
    ],
  },

  rules: [
    {
      id: 'reverse-engineering/record-authorisation-first',
      strength: 'must',
      statement:
        'Record the artefact under analysis, the source of authorisation, and the permitted use of findings before running the first command.',
      evidence: {
        rationale:
          'The technique is identical on both sides of the authorisation boundary and only the authorisation differs, so nothing later in the workflow will surface the question for you — there is no error, no failed step, no tooling signal. Writing the three facts down before the first command is the only point at which the omission is still cheap to notice.',
        confidence: 'established',
      },
      examples: {
        language: 'markdown',
        bad: 'Analysing competitor.apk — pulled from the store.',
        good: 'Artefact: competitor.apk 8.2.1, publicly distributed. Authorisation: competitive research on a public binary; no redistribution of code. Permitted use: internal structural summary only.',
      },
      verifiedBy: 'authorisation-and-boundary-check',
    },
    {
      id: 'reverse-engineering/stay-static-and-structural',
      strength: 'must-not',
      statement: 'Stop at understanding structure; do not cross into defeating a control.',
      evidence: {
        rationale:
          'That transition is the boundary of legitimate analysis, and it is also a different activity in practice: those techniques operate on runtime state rather than static structure, so nothing in a static workflow produces them as a by-product and reaching them requires a deliberate change of method. Findings here are claims about the artefact, not authorisation to act against a live service or its users.',
        confidence: 'established',
      },
      examples: {
        language: 'markdown',
        bad: 'Patched the integrity check in `SecurityManager.a()` and hooked the licence callback at runtime to confirm the bypass works.',
        good: 'Recorded that an integrity check exists in a class reached from the launcher activity; noted the mechanism statically and stopped. Bypassing it is outside scope.',
      },
      verifiedBy: 'authorisation-and-boundary-check',
    },
    {
      id: 'reverse-engineering/fingerprint-before-tooling',
      strength: 'must',
      statement:
        'List the archive and grep for framework markers before installing or invoking any decompiler.',
      evidence: {
        rationale:
          'The framework determines the entire toolchain and the toolchains do not overlap, so the listing decides which expensive step is even correct. It costs seconds, runs with no dependencies, and is the only cheap moment at which the wrong path is still avoidable — after decompilation you are reading output rather than choosing a tool.',
        confidence: 'established',
      },
      examples: {
        language: 'bash',
        bad: 'decompile app.apk -d out/   # first command run against an unknown package',
        good: "unzip -l app.apk | grep -Ei 'libflutter|libapp\\.so|libhermes|index\\.android\\.bundle|cordova\\.js|\\.dll'",
      },
      verifiedBy: 'triage-and-toolchain-review',
    },
    {
      id: 'reverse-engineering/abort-into-the-right-toolchain',
      strength: 'must',
      statement:
        'When the framework marker indicates Flutter, React Native, Cordova, or Xamarin, stop and switch toolchains rather than running a Java decompiler to see what comes out.',
      evidence: {
        rationale:
          'A Java decompiler pointed at a Flutter package does not error. It emits a few thin wrapper classes and exits, and that output is indistinguishable from a tool defeated by obfuscation — so the natural next moves are more settings and more engines, and the hour ends in a false conclusion. A wrong tool that returns nothing is more expensive than one that crashes, because a crash is unambiguous.',
        confidence: 'established',
      },
      examples: {
        language: 'bash',
        bad: '# libflutter.so present; running the Java decompiler anyway\ndecompile app.apk -d out/',
        good: '# libflutter.so + libapp.so: logic is AOT-compiled Dart, not Dalvik.\n# Switching to native tooling and a snapshot parser; Java path abandoned.',
      },
      verifiedBy: 'triage-and-toolchain-review',
    },
    {
      id: 'reverse-engineering/retarget-the-base-archive',
      strength: 'must',
      statement:
        'Treat a decompiled tree of fewer than roughly ten source files alongside inner .apk entries as the wrapper, and re-target the base archive before drawing any conclusion.',
      evidence: {
        rationale:
          'Modern distribution ships a base module plus configuration splits inside a bundle wrapper, and decompiling the wrapper succeeds without error — it simply yields the installer or loader logic. A tiny clean result therefore reads as "small or heavily obfuscated" when it means the application was never opened, and the file-count heuristic is what separates the two.',
        confidence: 'established',
      },
      examples: {
        language: 'bash',
        bad: '# 9 source files recovered; reporting the app as heavily obfuscated',
        good: 'unzip -l download.apk | grep -c "\\.apk$"   # inner splits present\nunzip -p download.apk base.apk > base.apk   # re-target and decompile this',
      },
      verifiedBy: 'triage-and-toolchain-review',
    },
    {
      id: 'reverse-engineering/single-engine-then-escalate',
      strength: 'should',
      statement:
        'Run one decompiler alone and escalate to a second only for the specific classes that warned, bailed out, or produced visibly wrong control flow; retain the output rather than regenerating it.',
      evidence: {
        rationale:
          'Decompilation is the most expensive step in the workflow, and engines diverge only on a narrow recognisable set — nested lambdas, complex generic bounds, long stream pipelines, switch on strings, Kotlin suspend state machines. Running both by default doubles that cost to produce byte-identical output for nearly every class, then leaves you diffing two large trees to find the few that differ.',
        confidence: 'strong',
      },
      examples: {
        language: 'bash',
        bad: 'primary app.apk -d out-a/ && secondary app.apk -d out-b/ && diff -r out-a out-b',
        good: 'primary app.apk -d out/ 2> warnings.txt\n# then run the secondary only on the classes named in warnings.txt',
      },
      verifiedBy: 'triage-and-toolchain-review',
    },
    {
      id: 'reverse-engineering/anchor-on-unrenamable-strings',
      strength: 'must',
      statement:
        'Anchor call-flow traces on annotation values, URL and path literals, and resource names rather than on method or class names in an obfuscated tree.',
      evidence: {
        rationale:
          'Obfuscators rename the symbols they own but cannot touch what the runtime resolves by string: a Retrofit method is @GET("v3/users/{id}/orders") even when its interface is named f, because the library reads that value at request time, and R.layout.activity_checkout survives because the resource table resolves by name. Following renamed method names instead means navigating a wide graph in which no node carries meaning.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'f.a() calls g.b() calls h.c() — traced by call graph, meaning unknown',
        good: 'Anchor: interface `f` declares @GET("v3/orders") [evidence]. References to `f` appear in `p.q` alongside R.layout.activity_checkout [evidence]; checkout screen triggers it [inference].',
      },
      verifiedBy: 'recovery-and-trace-review',
    },
    {
      id: 'reverse-engineering/declare-string-encryption-infeasible',
      strength: 'must',
      statement:
        'When a scan for URL literals returns almost nothing on an application that plainly makes network calls, declare string encryption and static endpoint extraction infeasible rather than continuing.',
      evidence: {
        rationale:
          'Aggressive configurations decrypt literals at runtime, so the constant pool holds nothing to find and no amount of further static searching changes that — the information is not in the artefact you are reading. The scan result is a reliable detector of the condition, and reporting it is a usable finding, whereas grinding produces hours of work and an empty section.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'No endpoints found yet — continuing to search the decompiled tree.',
        good: 'Strings are encrypted: a scan for "http" across the tree returns 2 hits on an application with an OkHttp interceptor chain. Static endpoint extraction is infeasible; endpoint inventory not delivered.',
      },
      verifiedBy: 'recovery-and-trace-review',
    },
    {
      id: 'reverse-engineering/tier-the-output',
      strength: 'must',
      statement:
        'Deliver an exhaustive flat inventory as tier one and cap deep detail at roughly ten items, spent on anomalies and on the flows the requester named, with coverage stated numerically.',
      evidence: {
        rationale:
          'Inventory and analysis have different cost curves: inventory is near-free per item once extraction is written, while analysis costs real time to produce and real attention to read. Writing a paragraph per endpoint takes the worst of both — the cost of analysis at the volume of inventory — and yields a document nobody reads, which is worth no more than no analysis at all.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: '## Endpoint 1 of 184 … ## Endpoint 2 of 184 … (one section each)',
        good: '## Inventory\n| Method | Path | Declaring class |\n…184 rows…\n\n## Detail (7 items)\nExported `SyncReceiver` with no permission guard; debug endpoint in a release build; …\n\nCoverage: 184 of an estimated 190 endpoints; 6 classes failed to decompile (appendix).',
      },
      verifiedBy: 'report-shape-review',
    },
    {
      id: 'reverse-engineering/label-inference-and-overlay-names',
      strength: 'should',
      statement:
        'Label every architectural claim derived from class-name shape or recovered metadata as an inference with its evidence, and apply a recovered name mapping as an overlay rather than editing the decompiled tree.',
      evidence: {
        rationale:
          'Name recovery is uneven — high for convention-following classes whose suffix and package position cross-check the metadata, low for data-transfer objects whose arbitrary names have no shape to check against — so an unlabelled claim built on it cannot be weighed by the reader. Keeping the mapping as an overlay preserves the property that every claim can still be traced back to the original artefact.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'The app uses MVVM with a repository layer.',
        good: 'Inference: MVVM with a repository layer. Evidence: 23 classes recovered from @kotlin.Metadata with the `*ViewModel` suffix under `ui/`, and 9 `*Repository` names sitting between `*Api` and `*Dao`.',
      },
      verifiedBy: 'recovery-and-trace-review',
    },
  ],

  verification: [
    {
      id: 'authorisation-and-boundary-check',
      kind: 'self-review',
      description: 'Confirm the analysis is authorised and has stayed static and structural.',
      blocking: true,
      questions: [
        'Are the artefact, the source of authorisation, and the permitted use of findings written down, and was that done before the first command?',
        'Did anything in this run move from reading structure to defeating a control — credential extraction, protection circumvention, patching a check, or runtime instrumentation?',
        'Is every finding phrased as a claim about the artefact rather than as licence to send traffic to a host named in it?',
        'If any part of the request required crossing that boundary, was it declined and named rather than quietly attempted?',
      ],
    },
    {
      id: 'triage-and-toolchain-review',
      kind: 'self-review',
      description:
        'Confirm the fingerprint ran first and the right archive reached the right engine.',
      blocking: true,
      questions: [
        'Was an archive listing checked for framework markers before any decompiler was installed or invoked?',
        'If a Flutter, React Native, Cordova or Xamarin marker was present, did the workflow abort into the correct toolchain rather than decompiling anyway?',
        'Did the decompiled tree contain fewer than about ten source files alongside inner .apk entries, and if so was the base archive re-targeted?',
        'Was the JDK confirmed at 17 or later, and was the primary decompiler run alone with the secondary reserved for classes that warned or broke?',
        'Was the raw decompiled output retained for later phases rather than regenerated?',
      ],
    },
    {
      id: 'recovery-and-trace-review',
      kind: 'self-review',
      description:
        'Confirm detection, name recovery, and traces rest on things that could not be renamed.',
      questions: [
        'Was a string scan run for network, dependency-injection and serialisation signals, and was the obfuscation level estimated from the share of one- and two-character package names?',
        'Did a scan for URL literals come back near-empty on a networked application, and if so was string encryption declared and extraction stopped?',
        'Is every trace anchored on an annotation value, URL literal, or resource name, and does each link say whether it is evidence or inference?',
        'Was @kotlin.Metadata mined where the application is Kotlin, with recovery confidence reported separately for convention-following classes and data-transfer objects?',
        'Was any recovered mapping applied as an overlay rather than by editing the decompiled tree in place?',
      ],
    },
    {
      id: 'report-shape-review',
      kind: 'self-review',
      description:
        'Confirm the report is an exhaustive inventory plus rationed depth, with coverage stated.',
      questions: [
        'Does the report contain a complete flat inventory of endpoints, components with exported status, permissions, libraries, and build-configuration values, one row each?',
        'Is deep detail capped at roughly ten items, and is each of them either an anomaly or a flow the requester named?',
        'Was the manifest read before any source file, and were all BuildConfig classes read, the application’s and each library’s?',
        'Is coverage stated numerically, including what failed to decompile or could not be recovered?',
      ],
    },
  ],

  relatedSkills: [
    'engineering-discipline',
    'code-quality',
    'platform-android',
    'mobile-performance',
  ],
}
