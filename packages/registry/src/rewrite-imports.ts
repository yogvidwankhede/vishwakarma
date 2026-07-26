// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Rewriting relative imports as files move.
 *
 * This is the fixture that makes copy-in distribution actually work, and it is worth being
 * explicit about why, because it looks like a detail and it is the load-bearing part.
 *
 * A registry authors its source in one tree: `ui/date-picker.tsx` imports `../lib/cn` and
 * `./use-calendar`. The consumer's project has a different tree, and the whole promise of
 * copying source in is that they get to keep it — `src/components/ui/`, or `app/_components/`,
 * or a monorepo package three directories deep. The moment the file lands somewhere other
 * than where it was authored, every relative specifier inside it is measured from the wrong
 * origin. `../lib/cn` resolves to nothing, or worse, to something else.
 *
 * There are only three ways out. The registry can dictate the consumer's directory layout,
 * which trades away the ownership that was the entire point. It can ship every file with
 * absolute alias imports and require a matching `tsconfig` alias, which fails for anyone with
 * a different alias or none. Or the installer can rewrite the specifiers as it copies, which
 * is this module. Rewriting is the only option under which the same registry serves a `src/`
 * project, an `app/` project and a monorepo package without any of them having to
 * reorganise, and under which the maintainer can reorganise the registry's own tree without
 * breaking anyone.
 *
 * The rewrite is lexical rather than parsed. A full TypeScript parser would be more precise
 * and would cost a heavyweight dependency in a package whose other job is to run anywhere,
 * including in a documentation site rendering a preview. The scan is confined to specifier
 * positions — the string literal immediately after `from`, `import`, `import(` or
 * `require(` — which is regular enough in real source to be safe, and anything that cannot
 * be resolved is *reported* rather than guessed at. Silence is the failure mode this module
 * exists to prevent, so it never has an opinion it cannot justify.
 */

import {
  aliasSpecifier,
  relativeSpecifier,
  specifierExtension,
  type ImportAlias,
} from './paths.js'
import { posix } from 'node:path'
import type { PlannedFile } from './resolve.js'
import { DEFAULT_LAYOUT, type TargetLayout } from './paths.js'

/**
 * Matches the module specifier of an import, re-export, dynamic import or require.
 *
 * The leading keyword is captured so it can be put back verbatim, which preserves whatever
 * spacing and formatting the source had. Rewriting must never reformat: a diff where one
 * line changed is reviewable, a diff where the whole file was normalised is not.
 */
const SPECIFIER_PATTERN = /((?:\bfrom|\bimport|\brequire)\s*\(?\s*)(['"])([^'"\n]*)\2/g

/** Extensions that identify a module we may rewrite the extension of. */
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs']

/** Extensions tried when a specifier omits one, in resolution order. */
const RESOLUTION_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json']

/** One specifier that changed. */
export interface ImportRewrite {
  /** The specifier as authored. */
  from: string
  /** The specifier as written to the consumer's project. */
  to: string
}

/** Why a relative specifier could not be rewritten. */
export type UnresolvedReason = 'not-in-plan'

/**
 * A relative import that points outside the set of files being copied.
 *
 * Nearly always a missing entry in the item's `registryDependencies`: the file compiles
 * upstream because the sibling is right there in the registry repository, and breaks the
 * moment it is copied alone. Catching it here, before anything is written, is far cheaper
 * than catching it in the consumer's build.
 */
export interface UnresolvedImport {
  /** The file that contains the import, by authored path. */
  file: string
  /** The specifier that could not be resolved. */
  specifier: string
  reason: UnresolvedReason
}

/** Result of rewriting one file. */
export interface RewriteResult {
  /** The file's source with specifiers rewritten. */
  content: string
  /** Every specifier that changed. Empty when the file needed no rewriting. */
  rewrites: readonly ImportRewrite[]
  /** Relative specifiers that could not be resolved to a file in the move set. */
  unresolved: readonly UnresolvedImport[]
}

/** Options for {@link rewriteImports}. */
export interface RewriteOptions {
  /** Authored path of the file being rewritten. Specifiers resolve against its directory. */
  authored: string
  /** Where this file is being written to. New specifiers are measured from its directory. */
  target: string
  /** Authored path to target path, for every file in the install plan. */
  moves: ReadonlyMap<string, string>
  /** The consumer's path alias, if they have one. */
  alias?: ImportAlias | undefined
  /**
   * Emit the alias form whenever it is available, rather than only when the relative form
   * would climb out of the file's own directory.
   *
   * The default — alias only for upward paths — keeps sibling imports relative, which is
   * what makes a copied directory still work if the user moves the whole thing. Upward
   * paths are the ones that break on a move, and they are exactly the ones an alias fixes.
   */
  preferAlias?: boolean
  /**
   * Rewrites for bare package specifiers, applied by longest matching prefix.
   *
   * Used when a registry's source imports from a package that the consumer is not expected
   * to install — the utility is copied in instead, so `@vishwakarma/core/cn` has to become
   * `@/lib/cn`. Without this the copied file compiles only for people who happen to have the
   * upstream package, which is precisely the dependency copy-in was meant to remove.
   */
  packages?: Readonly<Record<string, string>> | undefined
}

/** Whether a specifier addresses a file rather than a package. */
function isRelative(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../') || specifier === '.'
}

/**
 * Candidate authored paths a specifier might name.
 *
 * The `.js` cases are not hypothetical padding. Source written for native ESM — including
 * every file in this repository — imports `./thing.js` while the file on disk is
 * `./thing.ts`. A resolver that only tried the literal path would fail to rewrite a single
 * import in any modern TypeScript codebase, which would make this module useless for exactly
 * the source it is meant to distribute.
 */
function candidatePaths(base: string): string[] {
  const candidates = [base]
  const extension = specifierExtension(base)

  if (extension === '.js' || extension === '.jsx' || extension === '.mjs') {
    const stem = base.slice(0, base.length - extension.length)
    candidates.push(`${stem}.ts`, `${stem}.tsx`, `${stem}.mts`)
  }

  if (extension === '' || !SOURCE_EXTENSIONS.includes(extension)) {
    for (const candidate of RESOLUTION_EXTENSIONS) candidates.push(`${base}${candidate}`)
  }

  for (const candidate of ['.ts', '.tsx', '.js', '.jsx']) {
    candidates.push(`${base}/index${candidate}`)
  }

  return candidates
}

/** Resolve a relative specifier to a key in the move set, or `undefined`. */
function resolveAuthored(
  fromAuthored: string,
  specifier: string,
  moves: ReadonlyMap<string, string>,
): string | undefined {
  const base = posix.normalize(posix.join(posix.dirname(fromAuthored), specifier))
  for (const candidate of candidatePaths(base)) {
    if (moves.has(candidate)) return candidate
  }
  return undefined
}

/**
 * Give a target path the extension the original specifier used.
 *
 * The rule is to preserve the author's convention rather than impose one: extensionless in,
 * extensionless out; `.js` in, `.js` out even though the file is `.tsx`. The consumer's
 * bundler config is what decides which of those resolves, and the registry has no business
 * changing that decision on the way past. Non-source extensions — `.css`, `.json` — always
 * keep their real extension, because nothing resolves those implicitly.
 */
function applyExtensionPolicy(targetPath: string, originalExtension: string): string {
  const actual = specifierExtension(targetPath)
  if (!SOURCE_EXTENSIONS.includes(actual)) return targetPath

  const stem = targetPath.slice(0, targetPath.length - actual.length)
  if (originalExtension === '') return stem
  if (!SOURCE_EXTENSIONS.includes(originalExtension)) return stem
  return `${stem}${originalExtension}`
}

/** Apply the longest matching bare-package rewrite, or return `undefined`. */
function rewriteBare(
  specifier: string,
  packages: Readonly<Record<string, string>> | undefined,
): string | undefined {
  if (!packages) return undefined
  let best: string | undefined
  for (const prefix of Object.keys(packages)) {
    if (specifier !== prefix && !specifier.startsWith(`${prefix}/`)) continue
    if (best === undefined || prefix.length > best.length) best = prefix
  }
  if (best === undefined) return undefined
  const replacement = packages[best]
  if (replacement === undefined) return undefined
  return `${replacement}${specifier.slice(best.length)}`
}

/**
 * Rewrite every module specifier in one file for its new location.
 *
 * Pure: it neither reads nor writes anything, and it returns a report alongside the new
 * content so the caller can show the user what changed. An installer that rewrote imports
 * without saying so would leave people unable to tell their own edits from ours on the next
 * diff, which is the state this package works hardest to avoid.
 */
export function rewriteImports(source: string, options: RewriteOptions): RewriteResult {
  const rewrites: ImportRewrite[] = []
  const unresolved: UnresolvedImport[] = []

  const content = source.replace(
    SPECIFIER_PATTERN,
    (match: string, lead: string, quote: string, specifier: string): string => {
      if (!isRelative(specifier)) {
        const bare = rewriteBare(specifier, options.packages)
        if (bare === undefined || bare === specifier) return match
        rewrites.push({ from: specifier, to: bare })
        return `${lead}${quote}${bare}${quote}`
      }

      const authoredDependency = resolveAuthored(options.authored, specifier, options.moves)
      if (authoredDependency === undefined) {
        unresolved.push({ file: options.authored, specifier, reason: 'not-in-plan' })
        return match
      }

      const dependencyTarget = options.moves.get(authoredDependency)
      if (dependencyTarget === undefined) return match

      const adjusted = applyExtensionPolicy(dependencyTarget, specifierExtension(specifier))
      const relative = relativeSpecifier(options.target, adjusted)
      const wantsAlias = options.preferAlias === true || relative.startsWith('../')
      const aliased = options.alias ? aliasSpecifier(options.alias, adjusted) : undefined
      const next = wantsAlias && aliased !== undefined ? aliased : relative

      if (next === specifier) return match
      rewrites.push({ from: specifier, to: next })
      return `${lead}${quote}${next}${quote}`
    },
  )

  return { content, rewrites, unresolved }
}

/** Options for {@link rewritePlanFiles}. */
export interface PlanRewriteOptions {
  /** The consumer's layout, used only for its alias. Defaults to {@link DEFAULT_LAYOUT}. */
  layout?: TargetLayout
  /** See {@link RewriteOptions.preferAlias}. */
  preferAlias?: boolean
  /** See {@link RewriteOptions.packages}. */
  packages?: Readonly<Record<string, string>>
}

/** Result of rewriting a whole plan. */
export interface PlanRewriteResult {
  /** The plan's files, with `content` rewritten. Order and identity are preserved. */
  files: PlannedFile[]
  /** Every rewrite, keyed by the authored path of the file it happened in. */
  rewrites: Map<string, ImportRewrite[]>
  /** Every unresolvable relative import across the plan. */
  unresolved: UnresolvedImport[]
}

/**
 * Rewrite the imports of every file in a plan against the plan's own move set.
 *
 * The move set is built from the plan and only from the plan, which is what makes
 * `unresolved` meaningful: a relative import that resolves to nothing here is an import of a
 * file that is not being copied, and the install would produce a project that does not
 * compile. Callers should treat a non-empty `unresolved` as fatal unless they know better.
 */
export function rewritePlanFiles(
  files: readonly PlannedFile[],
  options: PlanRewriteOptions = {},
): PlanRewriteResult {
  const layout = options.layout ?? DEFAULT_LAYOUT
  const moves = new Map<string, string>()
  for (const file of files) moves.set(file.authored, file.target)

  const rewritten: PlannedFile[] = []
  const rewrites = new Map<string, ImportRewrite[]>()
  const unresolved: UnresolvedImport[] = []

  for (const file of files) {
    const result = rewriteImports(file.content, {
      authored: file.authored,
      target: file.target,
      moves,
      alias: layout.alias,
      ...(options.preferAlias === undefined ? {} : { preferAlias: options.preferAlias }),
      ...(options.packages === undefined ? {} : { packages: options.packages }),
    })
    rewritten.push({ ...file, content: result.content })
    if (result.rewrites.length > 0) rewrites.set(file.authored, [...result.rewrites])
    unresolved.push(...result.unresolved)
  }

  return { files: rewritten, rewrites, unresolved }
}
