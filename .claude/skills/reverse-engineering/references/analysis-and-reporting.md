# Structural survey, name recovery, call-flow anchoring, and tiered reporting

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
applications can reach. An `android:exported="true"` component with no permission guard is a structural fact
worth recording regardless of what you were asked to look for. Also read `minSdkVersion`, `targetSdkVersion`
and any `<queries>` block, which reveals which other packages the application looks for.

**Every generated build-configuration class.** Search for classes named `BuildConfig` in any package, and read
all of them — the application's own and each library's. The mechanism that makes these valuable is a build
ordering detail: they are generated during the build, after the obfuscation configuration has been read, and
they are typically covered by keep rules because application code references their fields by name. So while
everything around them is renamed, they retain their original field names and their literal values:

```java
public final class BuildConfig {
  public static final String BUILD_TYPE = "release";
  public static final String FLAVOR = "production";
  public static final String API_BASE_URL = "https://api.example.com/v3/";
  public static final boolean FEATURE_NEW_CHECKOUT = true;
  public static final int VERSION_CODE = 4821;
}
```

That single class frequently supplies the base URL, the build flavour, the version, and the feature flag set
— which is most of what the structural survey is trying to establish, obtained without reading a line of
business logic. Read library `BuildConfig` classes too: they identify library versions, which in turn tells
you which known behaviours and defaults apply.

**Class-name shapes.** Where names survive, architecture is inferable from suffixes and package layout
without reading bodies. `*ViewModel` and `*UiState` alongside a `ui/` package indicate an MVVM or MVI
presentation layer. `*Repository` between `*Api` and `*Dao` indicates a repository pattern with remote and
local sources. `*UseCase` or `*Interactor` indicates a clean-architecture domain layer. `*Manager` and
`*Helper` in large numbers indicate an older or less structured codebase. Packages organised by feature
(`checkout/`, `profile/`) versus by layer (`data/`, `domain/`, `ui/`) tells you how the team divides work.
Record the inference and the evidence for it, and mark it as an inference.

## 8. Phase 3.5 — name recovery on obfuscated Kotlin

On an obfuscated Kotlin application, a large fraction of original names is still present, in a place
obfuscators cannot clear.

The Kotlin compiler emits a `@kotlin.Metadata` annotation on every class it generates. It holds the class's
Kotlin-level signature: the fully-qualified original name, type parameters with variance, property names,
function signatures, nullability, default-argument masks, and the shape of `data class` components. The
Kotlin runtime and reflection library read it to resolve `KClass` operations, `copy()` and `componentN()` on
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
| Classes following naming conventions (`*ViewModel`, `*Repository`, `*UseCase`) | High | Suffix plus package position cross-checks the metadata name, so errors are detectable |
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
`@GET("v3/users/{id}/orders")` even when the interface is named `f` and the method is `a`, because the
annotation value is the request path and the library reads it at runtime. **URL and path literals**, which
must be present in the constant pool for the request to be constructible, unless string encryption is in use.
**Resource names** — layout IDs, string resource keys, view IDs — which live in the resource table and are
resolved by name, so `R.layout.activity_checkout` survives and ties an obfuscated class to a feature.

From those anchors, build the flow in one direction:

1. Locate the launcher activity or `Application` subclass named in the manifest.
2. Find where the HTTP client is constructed — the `OkHttpClient.Builder` chain, or the Retrofit builder, or
   the Ktor `HttpClient { }` block. Interceptors registered there reveal authentication scheme, headers,
   logging, and certificate pinning configuration.
3. From the client construction, find the interfaces it is used to create, which gives the endpoint set.
4. From each endpoint annotation, search the tree for references to the enclosing interface to find the call
   sites, and from the call sites walk up to the screen or service that triggers them.

The result is a trace from entry point to network call that does not depend on a single readable method name.
Record which links are evidence and which are inference: "class `f` declares `@GET("v3/orders")`" is
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
`git log --format=%an | sort | uniq -c | sort -rn` for who owns what; file churn over the last year for where
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
- Were all `BuildConfig` classes read, application and library, with base URL, flavour, version and feature flags extracted?
- Is every architectural claim from class-name shape labelled as an inference with its evidence?
- On obfuscated Kotlin, was `@kotlin.Metadata` mined for original names, with recovery confidence reported separately for convention-following classes and for data-transfer objects?
- Was any recovered name mapping applied as an overlay rather than by editing the decompiled tree in place?
- Are traces anchored on annotation values, URL literals or resource names rather than on obfuscated method names?
- Does each trace run from manifest entry point through client construction to call site, with evidence and inference distinguished at each link?
- Does the report contain a complete flat inventory of endpoints, components, permissions, libraries and build-configuration values?
- Is deep detail limited to roughly ten items, spent on anomalies and on the flows the requester named?
- Is coverage stated numerically, including what failed to decompile or could not be recovered?
