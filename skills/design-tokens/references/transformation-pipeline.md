# The token transformation pipeline

The pipeline exists to make one fact true: **there is exactly one file a human edits.**
Everything else in the repository that expresses a token value is a build artefact, and build
artefacts do not drift because nobody writes them.

## Stages

    parse -> resolve -> validate -> transform -> format -> write

**Parse.** Read the source (DTCG JSON, or TypeScript if you prefer authoring in a typed
language) into a flat map keyed by dotted path, retaining `$type`, `$description` and
`$deprecated`. Flatten early: nested traversal in later stages is where subtle bugs live.

**Resolve.** Replace every `{alias}` with its target's resolved value. Depth-first, with
three-colour marking:

    visit(node):
      if colour[node] === GREY:  throw Cycle(path.concat(node))
      if colour[node] === BLACK: return value[node]
      colour[node] = GREY
      for ref in refs(node): visit(ref)
      colour[node] = BLACK

A cycle must name the whole path, not just the offending node — `color.action ->
color.brand -> color.action` is diagnosable, "circular reference detected" is not. An
unresolved reference must be equally fatal, because CSS will not tell you: `var(--typo)`
is invalid at computed-value time and silently resolves to the inherited or initial value,
producing a transparent border rather than an error.

**Validate.** Cheap checks that catch expensive mistakes:

- Every alias target exists, and no chain exceeds three hops.
- Every theme defines the identical set of semantic keys. Diff them and fail on asymmetry.
- No semantic token resolves directly to a literal — it must resolve through a primitive.
- No component or application source references a primitive. This is a grep over the app,
  not over the tokens, and it is the check that actually holds the architecture together.
- Every contrast pair declared in the contract still passes, in every theme.
- Every token has a `$description`.

**Transform.** Per-platform value conversion. Web wants `rem` for typography and spacing so
that user font-size preferences scale the layout, and `px` for hairlines and radii that must
not scale. iOS wants points as floats; Android wants `dp` and `sp`. Names transform too:
dotted paths become `--kebab-case` for CSS, `camelCase` for TypeScript, and
`snake_case` for Android resources. Keep the transforms declarative and named, so a
platform's output can be explained by listing which transforms ran.

**Format and write.** Serialise per target.

## The outputs

    :root {
      --color-bg-canvas: oklch(0.98 0.004 265);
      --space-inset-md: 1rem;
    }

    @theme {
      --color-bg-canvas: oklch(0.98 0.004 265);
      --spacing-inset-md: 1rem;
    }

    export const color = { bgCanvas: 'var(--color-bg-canvas)' } as const
    export type ColorToken = keyof typeof color

Two decisions inside those three files matter more than the rest of the pipeline.

**The TypeScript output should emit `var()` references, not resolved values.** If it emits
`oklch(...)`, then any component that reads a token from JavaScript is frozen into whichever
theme was active at build time, and theme switching stops working for exactly those
components — a bug that appears only in dark mode and only in a few places. Emitting
`var(--color-bg-canvas)` keeps runtime substitution intact. The exception is a canvas or
WebGL context, which cannot consume custom properties; give those a separately-named resolved
export so the trade-off is visible at the import site.

**Tailwind v4 configures its theme in CSS via `@theme`,** which means the token pipeline
writes a stylesheet rather than a JavaScript config object, and the utilities Tailwind
generates are derived from the same custom properties the rest of the CSS reads. Generate the
`@theme` block; never hand-edit it. Emitting only the semantic scale into `@theme` — and
leaving primitives out — is what removes `bg-indigo-600` from the set of things a developer
can write at all.

## Stopping drift

Generation alone does not prevent drift; it only makes drift *detectable*. Three
enforcements make it impossible.

**Regenerate in CI and fail on any diff.** Run the build and then `git diff --exit-code`.
A pull request that edits `tokens.css` by hand now fails, with the diff as the error
message.

**Mark generated files.** A header comment plus a CODEOWNERS entry plus a `.gitattributes`
`linguist-generated=true` line collapses them in review, which stops well-meaning reviewers
from suggesting edits to a file that will be overwritten.

**Ban primitives at the usage boundary.** A lint rule that rejects hex literals, raw `px`
values, and primitive token names inside component source. Without this, the pipeline is
correct and unused: developers keep writing values inline because it is faster, and the token
set slowly becomes documentation of a system nobody follows.

## Versioning

Publish tokens as a versioned package, even for internal consumers, and apply semver to
*names* rather than to values:

- **Patch:** a value changes, no name changes. A brand tweak is a patch.
- **Minor:** names are added, or a name is deprecated with a working alias in place.
- **Major:** a name is removed or its meaning changes.

Changing what `color.fg.muted` *means* — from "secondary text" to "disabled text" — is a
major change even though the string is identical, because every existing usage is now wrong.
This is the change most often shipped as a patch and it is the one that causes the most
damage.

Ship a machine-readable deprecation list alongside the tokens: DTCG's `$deprecated` accepts
a string, so `"$deprecated": "Use color.fg.muted"` is enough for a codemod to migrate
consumers automatically, and enough for an agent to avoid the deprecated name without being
told.
