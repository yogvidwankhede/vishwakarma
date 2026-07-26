/**
 * Where copied files land, and how to talk about paths once they are there.
 *
 * The registry authors its source in one directory layout and the consumer keeps theirs in
 * another. Every function here exists to keep those two layouts from having to agree, which
 * is the whole reason copy-in distribution is tolerable to live with.
 *
 * All paths in and out are POSIX and relative to the consumer's project root. Absolute paths
 * and platform separators are the installer's problem, not the resolver's: keeping this
 * module free of `process.cwd()` is what lets a plan be computed in a browser docs preview
 * and in a test with no filesystem at all.
 */

import { posix } from 'node:path'
import type { RegistryFile, RegistryItem, RegistryItemType } from './schema.js'

/**
 * A TypeScript path alias, as configured in the consumer's `tsconfig.json`.
 *
 * `prefix` is what appears in source (`@/`), `base` is the directory it resolves to (`src`).
 */
export interface ImportAlias {
  prefix: string
  base: string
}

/** How a particular project wants copied files arranged. */
export interface TargetLayout {
  /** Directory every default target is nested under, e.g. `src`. Empty string for none. */
  root: string
  /** Default directory per item type, relative to {@link TargetLayout.root}. */
  directories: Record<RegistryItemType, string>
  /** The alias to prefer when rewriting imports. Omit to emit relative specifiers only. */
  alias?: ImportAlias
}

/**
 * The layout a conventional React project already has.
 *
 * These are defaults, not conventions this package enforces: every one of them is
 * overridable, and the CLI is expected to detect the real layout and pass it in. A registry
 * that only works if you arrange your project the way its authors did has recreated the
 * coupling that copying source was supposed to remove.
 */
export const DEFAULT_LAYOUT: TargetLayout = {
  root: 'src',
  directories: {
    component: 'components/ui',
    hook: 'hooks',
    util: 'lib',
    block: 'components/blocks',
    template: 'app',
    style: 'styles',
  },
  alias: { prefix: '@/', base: 'src' },
}

/** Join POSIX segments, dropping empty ones so an empty `root` does not produce `/x`. */
export function joinPath(...segments: readonly string[]): string {
  const kept = segments.filter((segment) => segment.length > 0)
  return kept.length === 0 ? '' : posix.normalize(kept.join('/'))
}

/**
 * Decide where one file of one item is written.
 *
 * An explicit `target` on the file always wins and is used verbatim, relative to the project
 * root — note that it deliberately ignores {@link TargetLayout.root}, because a file that
 * declares its own target is doing so precisely because its location is fixed by something
 * outside our control (a framework's routing convention, a config file the bundler looks for
 * by name).
 *
 * Otherwise the target is the type's directory plus the file's *base name*. Reproducing the
 * registry's internal directory structure is tempting and wrong: it makes the consumer's
 * tree mirror the maintainer's repository, so any reorganisation upstream shows up as a pile
 * of moved files downstream. Items with genuine internal structure declare their targets.
 */
export function resolveTargetPath(
  item: RegistryItem,
  file: RegistryFile,
  layout: TargetLayout = DEFAULT_LAYOUT,
): string {
  if (file.target) return posix.normalize(file.target)
  return joinPath(layout.root, layout.directories[item.type], posix.basename(file.path))
}

/**
 * Express `to` as a module specifier relative to the file at `from`.
 *
 * Node and every bundler treat a specifier without a leading `.` as a bare package name, so
 * a sibling import must come back as `./thing` and never `thing`. Getting this wrong
 * produces the memorable failure where a copied component resolves its own sibling to a
 * package on npm that happens to share the name.
 */
export function relativeSpecifier(from: string, to: string): string {
  const rel = posix.relative(posix.dirname(from), to)
  if (rel.length === 0) return './'
  return rel.startsWith('.') ? rel : `./${rel}`
}

/** Whether `path` sits inside `base` (or equals it). Both must be normalised POSIX paths. */
export function isInside(base: string, path: string): boolean {
  if (base.length === 0) return true
  const rel = posix.relative(base, path)
  return rel.length > 0 && !rel.startsWith('..')
}

/**
 * Express a target path as an aliased specifier, or `undefined` if the alias does not cover
 * it.
 */
export function aliasSpecifier(alias: ImportAlias, target: string): string | undefined {
  if (!isInside(alias.base, target)) return undefined
  return `${alias.prefix}${posix.relative(alias.base, target)}`
}

/** Strip a known source extension, leaving directory and base name intact. */
export function stripExtension(path: string): string {
  return path.replace(/\.(tsx?|jsx?|mts|cts|mjs|cjs)$/, '')
}

/** The extension of a specifier, including the dot, or an empty string when there is none. */
export function specifierExtension(specifier: string): string {
  const base = posix.basename(specifier)
  const dot = base.lastIndexOf('.')
  // A leading dot is `.gitignore`-style, not an extension, and `../foo` must not be read as
  // having extension `./foo`.
  if (dot <= 0) return ''
  return base.slice(dot)
}
