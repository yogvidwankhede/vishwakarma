# Scope, fingerprinting, library detection, obfuscation level, and archive selection

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
| `lib/<abi>/libflutter.so` plus `lib/<abi>/libapp.so` | Flutter | AOT-compiled Dart in `libapp.so`; needs native tooling |
| `lib/<abi>/libhermes.so`, or `assets/index.android.bundle`, or `libreactnativejni.so` | React Native | JavaScript — Hermes bytecode or a JS bundle |
| `assets/www/cordova.js`, `assets/www/index.html` | Cordova / Ionic | HTML, CSS and JavaScript in a WebView |
| .NET assemblies (`*.dll` with CLI headers), `assemblies/` | Xamarin / MAUI | CIL, needs a .NET decompiler |
| `classes*.dex` with substantial `smali`/Java content and none of the above | Native Android | JVM bytecode; the Java decompiler path is correct |

Run the listing and grep for these markers first:

```bash
unzip -l app.apk | grep -Ei 'libflutter|libapp\.so|libhermes|index\.android\.bundle|cordova\.js|\.dll'
```

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
application. A package whose every class is named `a`, `b` or `c` will still contain the literal `retrofit2`
somewhere, because Retrofit's own package name is not the application's to rename.

| String signal | Indicates |
|---|---|
| `retrofit2`, `Lretrofit2/http/` | Retrofit — annotation-driven HTTP client; endpoints are recoverable from annotations |
| `okhttp3`, `OkHttpClient` | OkHttp — interceptors, connection pooling, often certificate pinning config |
| `io/ktor/`, `HttpClient` | Ktor client — Kotlin-native, endpoints usually built as strings rather than annotations |
| `com/apollographql/`, `.graphqls`, `operationId` | Apollo — GraphQL; look for operation documents in assets |
| `com/android/volley` | Volley — older stack, request classes rather than interfaces |
| `com/google/gson`, `@SerializedName` | Gson serialisation; field names recoverable from annotations |
| `kotlinx/serialization`, `$serializer` | kotlinx.serialization; generated serialisers carry field names |
| `com/squareup/moshi`, `JsonAdapter` | Moshi; adapters may be generated or reflective |
| `dagger/`, `hilt`, `_Factory`, `_MembersInjector` | Dagger/Hilt DI — generated names reveal the object graph |
| `koin`, `module {` residue in strings | Koin DI — modules registered by string keys |
| `androidx/room`, `_Impl` | Room database; schema recoverable from generated implementations |
| `firebase`, `google-services` residue | Firebase services; check which modules are actually linked |

The dependency-injection signals are worth more than they look. Dagger and Hilt generate classes named after
what they inject — `LoginRepository_Factory`, `ApiModule_ProvideOkHttpClientFactory` — and generated code is
frequently excluded from obfuscation rules, which hands you a partial map of the object graph including
component names the obfuscator otherwise erased. Serialisation signals matter for the same reason:
`@SerializedName("user_id")` must retain its literal because the wire format depends on it, so data-transfer
object field names survive even when the class is called `c.d.a`.

## 4. Estimating obfuscation level from the package tree

Before reading any code, look at the **shape** of the package hierarchy. This is a two-second check that sets
expectations for everything downstream.

An unobfuscated application has a package root that reads like an organisation: `com/example/app/`,
`com/example/data/`, `com/example/ui/`. An obfuscated one has a root littered with one- and two-character
package names — `a/`, `b/`, `c/`, `a/a/`, `a/b/` — because the renamer allocates identifiers from the
shortest available alphabet to minimise size. A tree where more than roughly a third of top-level packages
have names of one or two characters is obfuscated, and the ratio is a reasonable proxy for how aggressive
the configuration was.

Three levels, and what each implies for effort:

**None.** Class and method names are meaningful. Read the code directly; architecture is legible from names
alone. Time to a structural map: minutes.

**Partial.** Application code is renamed but library packages, generated code, and anything in a `-keep` rule
survives. This is the common case for a release build with default rules. Names recovered from Kotlin
metadata (section 8) will fill much of the gap. Time to a structural map: an hour or two.

**Aggressive.** Renaming plus string encryption, control-flow flattening, or reflection-heavy indirection.
String scanning still works for library detection because library strings are load-bearing, but literal URLs
and annotation values may be decrypted at runtime rather than stored in the constant pool. Recognise this
early: if a string scan for `http` returns almost nothing on an application that plainly makes network calls,
the strings are encrypted, and static extraction of endpoints is not going to work. Say so and stop, rather
than grinding.

## 5. Phase 1 — dependencies and engine selection

The toolchain is a JDK at version 17 or later, one primary decompiler, and one secondary held in reserve.
Confirm the JDK before anything else: modern decompilers target recent bytecode and fail with unhelpful class
version errors on older runtimes, and that error is easy to misread as a corrupt input.

Run the **primary decompiler first, alone**. Escalate to the secondary only for the specific classes where
the primary emitted warnings, produced obviously wrong control flow, or bailed out. The cases where engines
diverge are narrow and recognisable: heavily nested lambdas and method references, generic signatures with
complex bounds, long stream pipelines, `switch` on strings, and Kotlin `suspend` functions whose state
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
or loader logic, plus a set of `.apk` files sitting inside — and nothing errors, so the natural reading of a
tiny result is that the application is small or heavily obfuscated.

The heuristic is numeric and reliable. **Fewer than roughly ten source files, alongside one or more inner
`.apk` entries, means you decompiled the wrapper.** Re-target the base archive — usually named `base.apk` —
and start again. Configuration splits named for an ABI (`split_config.arm64_v8a.apk`), a density
(`split_config.xxhdpi.apk`) or a language (`split_config.en.apk`) contain resources and native libraries, not
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
- If the decompiled output contained fewer than about ten source files alongside inner `.apk` entries, was the base archive re-targeted?
