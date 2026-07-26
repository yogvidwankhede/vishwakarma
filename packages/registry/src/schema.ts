/**
 * The wire format of the registry.
 *
 * A registry is a JSON document that someone else's tooling will read, so the schema is the
 * public API of this package far more than any function here is. It is defined with zod
 * rather than as a bare TypeScript interface for a reason that only shows up in production:
 * registries are fetched over the network from URLs the user supplies. Anything trusting
 * that response to have the shape it claims is one typo in someone's CI pipeline away from
 * writing `undefined` into a path built by string concatenation.
 *
 * Types are derived from the schemas, never declared alongside them. Two sources of truth
 * for the same shape drift within a release.
 */

import { z } from 'zod'

/**
 * What a registry item is.
 *
 * The distinction is not cosmetic — it decides the default directory an item is installed
 * into and how the CLI groups it. `block` is a composition of components that is meant to be
 * edited immediately; `template` is a whole route or page; `style` is CSS or token output
 * with no TypeScript at all.
 */
export const REGISTRY_ITEM_TYPES = [
  'component',
  'hook',
  'util',
  'block',
  'template',
  'style',
] as const

/** Zod schema for {@link RegistryItemType}. */
export const registryItemTypeSchema = z.enum(REGISTRY_ITEM_TYPES)

/** The kind of thing an item distributes. */
export type RegistryItemType = (typeof REGISTRY_ITEM_TYPES)[number]

/**
 * Whether a path is a safe relative POSIX path.
 *
 * Registry files are written to disk by the consumer's CLI, with the registry's paths as
 * input. An absolute path, a Windows drive letter or a `..` segment in a hostile registry is
 * an arbitrary file write on the developer's machine — including into `~/.ssh` or a
 * `postinstall` script. This check is the only thing standing between a fetched JSON
 * document and that, so it rejects rather than sanitises: silently rewriting a path that
 * tried to escape hides the fact that someone tried.
 */
export function isSafeRelativePath(value: string): boolean {
  if (value.length === 0) return false
  if (value.includes('\\')) return false
  if (value.includes('\0')) return false
  if (value.startsWith('/')) return false
  if (/^[a-zA-Z]:/.test(value)) return false
  return value.split('/').every((segment) => segment !== '..' && segment !== '')
}

const safePath = z
  .string()
  .min(1)
  .refine(isSafeRelativePath, {
    message:
      'must be a relative POSIX path with no "..", no leading "/", no backslashes and no empty segments',
  })

/**
 * A slug: lowercase, hyphen-separated, no surprises.
 *
 * Item names end up in file paths, in URLs and on command lines. Constraining them here
 * means no downstream consumer has to escape them.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/

/** Zod schema for one file shipped by an item. */
export const registryFileSchema = z.object({
  /**
   * Path as authored in the registry repository, relative to the registry root.
   *
   * This is the identity of the file for import rewriting: relative specifiers inside
   * `content` are resolved against this path, not against `target`.
   */
  path: safePath,
  /** The complete source text. Registries are self-contained; nothing is fetched lazily. */
  content: z.string(),
  /**
   * Where the file should land in the consumer's project, relative to the project root.
   *
   * Optional, and usually omitted — the default is derived from the item type and the
   * consumer's own layout, which is what lets one registry serve `src/`, `app/` and
   * monorepo projects. Set it only when a file's location is genuinely fixed, such as a
   * Tailwind preset or a route that must sit at a particular URL.
   */
  target: safePath.optional(),
})

/** One file shipped by a registry item. */
export type RegistryFile = z.infer<typeof registryFileSchema>

/**
 * Zod schema for a registry item.
 *
 * Array fields default to empty rather than being optional, so consumers never write
 * `item.dependencies ?? []`. The input type still allows them to be omitted; see
 * {@link RegistryItemInput}.
 */
export const registryItemSchema = z.object({
  /** Unique within an index. Used on the command line and in `registryDependencies`. */
  name: z.string().regex(SLUG_PATTERN, {
    message: 'must be a lowercase slug, e.g. "date-picker" or "use-media-query"',
  }),
  /** Decides the default install directory and how the item is presented. */
  type: registryItemTypeSchema,
  /**
   * The item's own version, independent of the package version.
   *
   * Recorded in the consumer's manifest at install time. Copy-in distribution has no
   * lockfile entry to compare against, so this string plus the per-file content hash is the
   * entire basis on which a later update can say "this is two versions behind and you have
   * edited it".
   */
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, { message: 'must be a semver version' })
    .default('0.1.0'),
  /** Human-facing title. Defaults to the name when absent. */
  title: z.string().optional(),
  /** One sentence, present tense, describing what the item is for. Shown by the CLI. */
  description: z.string().min(1),
  /** npm packages this item's source imports, as install specifiers (`zod`, `react@^19`). */
  dependencies: z.array(z.string().min(1)).default([]),
  /** npm packages needed only to build or test the copied source. */
  devDependencies: z.array(z.string().min(1)).default([]),
  /** Names of other items in the same index that must be installed alongside this one. */
  registryDependencies: z.array(z.string().min(1)).default([]),
  /** At least one file. An item that ships nothing is always an authoring mistake. */
  files: z.array(registryFileSchema).min(1),
  /**
   * Design tokens the source reads, as token names (`colour.surface.raised`).
   *
   * Declared rather than inferred so the CLI can tell the user, before copying anything,
   * that this item needs tokens their theme does not define — which otherwise surfaces as a
   * component that renders with transparent backgrounds and no error anywhere.
   */
  tokens: z.array(z.string().min(1)).default([]),
  /** Free-form metadata for consumers of the registry. Never interpreted here. */
  meta: z.record(z.string(), z.unknown()).default({}),
  /** Set when an item should no longer be installed; the string explains what to use. */
  deprecated: z.string().optional(),
  /** Documentation URL for the item. */
  docs: z.string().optional(),
  /** Categories for grouping in a browsing UI. */
  categories: z.array(z.string().min(1)).default([]),
})

/** A fully resolved registry item, with all defaults applied. */
export type RegistryItem = z.infer<typeof registryItemSchema>

/** The authoring shape of an item: defaulted fields may be omitted. */
export type RegistryItemInput = z.input<typeof registryItemSchema>

/** Zod schema for a whole registry index. */
export const registryIndexSchema = z.object({
  /** Identifies the registry in the consumer's manifest, so two registries cannot collide. */
  name: z.string().min(1),
  /** Where this index came from, if it was fetched. Recorded for later updates. */
  homepage: z.string().optional(),
  /** Version of the index as a whole. Individual items carry their own versions. */
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, { message: 'must be a semver version' })
    .default('0.1.0'),
  /** Every item the registry offers. Uniqueness of `name` is checked by `validateIndex`. */
  items: z.array(registryItemSchema),
})

/** A registry index with defaults applied. */
export type RegistryIndex = z.infer<typeof registryIndexSchema>

/** The authoring shape of an index. */
export type RegistryIndexInput = z.input<typeof registryIndexSchema>

/**
 * Build a name-to-item lookup.
 *
 * Resolution touches the index once per edge; doing that with `items.find` is quadratic and
 * becomes measurable on a registry of a few hundred items resolved on every keystroke in a
 * docs search box. Later duplicates win here — `validateIndex` is what rejects duplicates,
 * and this function must not throw, because it is also used to *produce* those diagnostics.
 */
export function indexItems(index: RegistryIndex): Map<string, RegistryItem> {
  const map = new Map<string, RegistryItem>()
  for (const item of index.items) map.set(item.name, item)
  return map
}
