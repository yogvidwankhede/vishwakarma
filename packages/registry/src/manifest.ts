// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The record of what was installed, so that a later update has something to compare against.
 *
 * Copy-in distribution trades automatic updates for ownership. The consumer gets source they
 * can edit without asking anyone, with no version of ours pinned in their lockfile that can
 * break their build — and in exchange, nothing upstream can push a fix to them. That trade is
 * usually worth it, but the version people actually regret is the one where the trade is
 * total: where the installer copies files and forgets, so six months later nobody, including
 * the user, can say which files came from the registry, which version they came from, or
 * whether they have been edited since.
 *
 * The manifest is what makes the trade partial instead. It records, per installed file, the
 * item version it came from and a hash of exactly the bytes that were written. That is
 * enough for an update to be a three-way comparison — new version, recorded baseline, file on
 * disk — which is the difference between "you are two versions behind, and you have edited
 * two of these five files, here they are" and "something differs, good luck".
 *
 * It is a value, not a file. Reading and writing it is the CLI's job; this package only
 * defines its shape and how it changes.
 */

import { z } from 'zod'
import { hashContent } from './hash.js'
import type { PlannedFile } from './resolve.js'
import type { RegistryIndex, RegistryItem } from './schema.js'

/** Zod schema for one installed file's record. */
export const installedFileSchema = z.object({
  /** Where it was written, relative to the project root. */
  target: z.string().min(1),
  /** Its path in the registry, kept so an update can match files across a rename upstream. */
  authored: z.string().min(1),
  /**
   * SHA-256 of the content as written, after import rewriting.
   *
   * After, not before: the bytes on disk are the rewritten ones, so hashing the registry's
   * original would report every file as user-modified the instant it was installed.
   */
  hash: z.string().regex(/^[0-9a-f]{64}$/, { message: 'must be a lowercase hex SHA-256' }),
})

/** One installed file's record. */
export type InstalledFile = z.infer<typeof installedFileSchema>

/** Zod schema for one installed item's record. */
export const installedItemSchema = z.object({
  name: z.string().min(1),
  /** The item version that was installed. Compared against the registry to find updates. */
  version: z.string().min(1),
  /** ISO-8601 timestamp, for ordering and for "installed before the incident" questions. */
  installedAt: z.string().min(1),
  files: z.array(installedFileSchema),
  /** Recorded so uninstalling can tell what else may now be orphaned. */
  registryDependencies: z.array(z.string()).default([]),
})

/** One installed item's record. */
export type InstalledItem = z.infer<typeof installedItemSchema>

/** Zod schema for the whole manifest. */
export const manifestSchema = z.object({
  /**
   * Format version of this document.
   *
   * Fixed at 1 and validated, so a future format can be recognised and refused rather than
   * silently half-read by an older CLI that then rewrites it lossily.
   */
  schemaVersion: z.literal(1).default(1),
  /** Which registry these items came from, so two registries cannot claim the same names. */
  registry: z.string().min(1),
  /** Installed items by name. */
  items: z.record(z.string(), installedItemSchema).default({}),
})

/** The manifest of everything installed from one registry. */
export type Manifest = z.infer<typeof manifestSchema>

/** An empty manifest for a registry, for the first install. */
export function emptyManifest(registry: string): Manifest {
  return { schemaVersion: 1, registry, items: {} }
}

/**
 * Record an install, returning a new manifest.
 *
 * Immutable because the caller may well be showing a dry run: computing what the manifest
 * would become, printing it, and only then deciding to write. Mutating in place makes that
 * pattern quietly incorrect.
 *
 * `files` must be the files as written — rewritten content, resolved targets — not the
 * item's raw files.
 */
export function recordInstall(
  manifest: Manifest,
  item: RegistryItem,
  files: readonly PlannedFile[],
  installedAt: Date = new Date(),
): Manifest {
  const record: InstalledItem = {
    name: item.name,
    version: item.version,
    installedAt: installedAt.toISOString(),
    files: files
      .filter((file) => file.item === item.name)
      .map((file) => ({
        target: file.target,
        authored: file.authored,
        hash: hashContent(file.content),
      })),
    registryDependencies: [...item.registryDependencies],
  }

  return { ...manifest, items: { ...manifest.items, [item.name]: record } }
}

/** Record every item in a plan at once. */
export function recordPlan(
  manifest: Manifest,
  items: readonly RegistryItem[],
  files: readonly PlannedFile[],
  installedAt: Date = new Date(),
): Manifest {
  return items.reduce(
    (accumulated, item) => recordInstall(accumulated, item, files, installedAt),
    manifest,
  )
}

/** Remove an item's record. Does not touch files; the caller decides what to delete. */
export function forgetItem(manifest: Manifest, name: string): Manifest {
  const { [name]: _removed, ...rest } = manifest.items
  return { ...manifest, items: rest }
}

/** The recorded hash for a target path, or `undefined` if we never wrote it. */
export function baselineHash(manifest: Manifest, target: string): string | undefined {
  for (const item of Object.values(manifest.items)) {
    for (const file of item.files) {
      if (file.target === target) return file.hash
    }
  }
  return undefined
}

/** An installed item whose registry version has moved on. */
export interface OutdatedItem {
  name: string
  /** The version recorded at install time. */
  installed: string
  /** The version the registry now offers. */
  available: string
}

/**
 * Compare the manifest against a registry index.
 *
 * Version strings are compared for inequality, not ordering. Semver ordering would let an
 * item that was *downgraded* upstream — a botched release pulled back — look up to date, and
 * the honest answer to "the registry has different bytes from what you installed" is that
 * they differ, in whichever direction.
 */
export function outdatedItems(manifest: Manifest, index: RegistryIndex): OutdatedItem[] {
  const outdated: OutdatedItem[] = []
  for (const item of index.items) {
    const installed = manifest.items[item.name]
    if (!installed) continue
    if (installed.version !== item.version) {
      outdated.push({ name: item.name, installed: installed.version, available: item.version })
    }
  }
  return outdated.sort((a, b) => a.name.localeCompare(b.name))
}

/** Whether an item is recorded as installed. */
export function isInstalled(manifest: Manifest, name: string): boolean {
  return Object.hasOwn(manifest.items, name)
}
