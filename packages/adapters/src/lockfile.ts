// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The install lockfile.
 *
 * `mergeFile` already protects shared files like `AGENTS.md`, because our content there is
 * delimited and a human's content is not. Files we generate wholesale — a `SKILL.md`, a
 * `.mdc` rule — have no such boundary, so the write strategy for them is `replace`, and
 * replace means exactly what it says.
 *
 * That is fine until someone edits one. And people do edit them: they tighten a rule for
 * their codebase, add a project-specific example, delete a paragraph that does not apply.
 * Then they run `sync` to pick up a new skill, and their edit is gone with no warning and
 * no way to recover it short of digging through git.
 *
 * The lockfile fixes this by recording, at install time, a hash of exactly what we wrote.
 * On the next sync we can compare three things — what we wrote last time, what is on disk
 * now, and what we would write this time — and that triple distinguishes four genuinely
 * different situations that a naive implementation collapses into one:
 *
 *   **unchanged**  — disk matches our record, and our output has not changed. Skip it.
 *   **updated**    — disk matches our record, but our output has changed. Safe to replace.
 *   **drifted**    — disk differs from our record, and our output has not changed. The user
 *                    edited it and we have nothing new to offer. Leave it alone.
 *   **conflicting** — disk differs from our record *and* our output has changed. Both
 *                    sides moved. This is the only case that genuinely needs a human, and
 *                    separating it out is the entire point — a tool that asks about every
 *                    file trains people to say yes without reading.
 *
 * The lockfile is designed to be committed. It is small, deterministic, and diffable, and
 * having it in version control means a teammate's sync behaves the same as yours.
 */

import type { AgentTarget } from '@vishwakarma/skills'
import type { EmittedFile } from './targets.js'

export const LOCKFILE_PATH = '.vishwakarma/install.lock.json'
export const LOCKFILE_VERSION = 1

export interface LockEntry {
  /** Hash of the content we wrote. */
  hash: string
  /** Which target owns this file. */
  target: AgentTarget
  /** Which skill produced it, when the file belongs to exactly one. */
  skill?: string
  /** The write strategy used, so a strategy change is visible in the diff. */
  strategy: EmittedFile['strategy']
}

export interface Lockfile {
  version: number
  /** Version of the toolkit that last wrote this file. */
  generator: string
  /** Keyed by project-relative path. */
  files: Record<string, LockEntry>
}

/**
 * Content hash.
 *
 * A 64-bit FNV-1a, rendered as hex. It needs to be stable across processes and releases,
 * cheap, and dependency-free; it does not need to resist an adversary, because the threat
 * model here is "did this file change", not "did someone forge a file". Reaching for a
 * cryptographic hash would mean either a dependency or Node's `crypto`, and the latter
 * would stop this module working in a browser or an edge runtime for no benefit.
 *
 * Line endings are normalised before hashing. Otherwise every file on a Windows checkout
 * reports as drifted the moment git rewrites CRLF, which would make the whole mechanism
 * cry wolf on an entire platform.
 */
export function hashContent(content: string): string {
  const normalised = content.replace(/\r\n/g, '\n')

  // 64-bit FNV-1a, carried in two 32-bit halves because JavaScript numbers cannot hold a
  // 64-bit integer exactly and BigInt would be markedly slower for no gain here.
  let high = 0xcbf29ce4
  let low = 0x84222325

  for (let i = 0; i < normalised.length; i++) {
    low ^= normalised.charCodeAt(i)

    // Multiply by the 64-bit FNV prime, 0x100000001b3, decomposed so each partial product
    // stays inside 32 bits.
    const lowShift8 = (low << 8) >>> 0
    const lowShift40 = (low << 8) >>> 0
    const highShift8 = (high << 8) >>> 0

    const nextLow = (low * 0x1b3) >>> 0
    const carry = Math.floor((low * 0x1b3) / 0x100000000)
    const nextHigh = (((high * 0x1b3) >>> 0) + carry + lowShift8 + highShift8 + lowShift40) >>> 0

    low = nextLow
    high = nextHigh
  }

  return `${high.toString(16).padStart(8, '0')}${low.toString(16).padStart(8, '0')}`
}

export type FileStatus = 'new' | 'unchanged' | 'updated' | 'drifted' | 'conflicting' | 'orphaned'

export interface StatusReport {
  path: string
  status: FileStatus
  /** What the user should understand, phrased so it can go straight into CLI output. */
  explanation: string
  /** Whether writing is safe without asking. */
  safeToWrite: boolean
}

/**
 * Classify one file against the lockfile and what is on disk.
 *
 * `onDisk` is null when the file does not exist. `incoming` is null when we would no longer
 * generate this file at all, which is how removed skills are detected.
 */
export function classify(
  path: string,
  entry: LockEntry | undefined,
  onDisk: string | null,
  incoming: EmittedFile | null,
): StatusReport {
  // We no longer generate it, but we did once.
  if (incoming === null) {
    if (entry === undefined || onDisk === null) {
      return { path, status: 'orphaned', explanation: 'No longer generated.', safeToWrite: true }
    }
    const untouched = hashContent(onDisk) === entry.hash
    return {
      path,
      status: 'orphaned',
      explanation: untouched
        ? 'No longer generated by any installed skill, and unmodified since we wrote it. Safe to delete.'
        : 'No longer generated, but has been edited since we wrote it. Left in place — delete it yourself if you no longer want it.',
      safeToWrite: untouched,
    }
  }

  if (onDisk === null) {
    return { path, status: 'new', explanation: 'Will be created.', safeToWrite: true }
  }

  // Never recorded: either the lockfile is missing, or the file predates it. Treat an
  // untracked file as the user's, because assuming otherwise is how a tool destroys work
  // it did not create.
  if (entry === undefined) {
    return hashContent(onDisk) === hashContent(incoming.contents)
      ? { path, status: 'unchanged', explanation: 'Already identical.', safeToWrite: true }
      : {
          path,
          status: 'conflicting',
          explanation:
            'A file exists here that we have no record of writing. It will not be overwritten — pass --force if it is genuinely ours.',
          safeToWrite: false,
        }
  }

  const diskMatchesRecord = hashContent(onDisk) === entry.hash
  const outputChanged = hashContent(incoming.contents) !== entry.hash

  if (diskMatchesRecord && !outputChanged) {
    return { path, status: 'unchanged', explanation: 'Unchanged.', safeToWrite: true }
  }

  if (diskMatchesRecord && outputChanged) {
    return {
      path,
      status: 'updated',
      explanation: 'Updated from the skill source. Your copy was unmodified, so this is safe.',
      safeToWrite: true,
    }
  }

  if (!diskMatchesRecord && !outputChanged) {
    return {
      path,
      status: 'drifted',
      explanation:
        'You have edited this file and the generated version has not changed. Leaving your edit in place.',
      safeToWrite: false,
    }
  }

  return {
    path,
    status: 'conflicting',
    explanation:
      'You have edited this file and the generated version has also changed. Review the difference and re-apply your edit, or pass --force to take the generated version.',
    safeToWrite: false,
  }
}

/** Build a fresh lockfile from what was actually written. */
export function buildLockfile(
  written: Array<{ file: EmittedFile; target: AgentTarget; skill?: string }>,
  generator: string,
  previous?: Lockfile,
): Lockfile {
  // Start from the previous entries so files we skipped this run — because they had
  // drifted — keep their recorded hash. Dropping them would make the next sync treat a
  // known-drifted file as untracked, which is a worse classification.
  const files: Record<string, LockEntry> = { ...(previous?.files ?? {}) }

  for (const { file, target, skill } of written) {
    files[file.path] = {
      hash: hashContent(file.contents),
      target,
      strategy: file.strategy,
      ...(skill ? { skill } : {}),
    }
  }

  return { version: LOCKFILE_VERSION, generator, files }
}

/** Serialise with sorted keys, so the file diffs cleanly rather than reordering. */
export function serialiseLockfile(lock: Lockfile): string {
  const sorted: Record<string, LockEntry> = {}
  for (const key of Object.keys(lock.files).sort()) {
    sorted[key] = lock.files[key] as LockEntry
  }
  return `${JSON.stringify({ ...lock, files: sorted }, null, 2)}\n`
}

/** Parse a lockfile, tolerating absence and corruption. */
export function parseLockfile(raw: string | null): Lockfile | undefined {
  if (raw === null) return undefined
  try {
    const parsed = JSON.parse(raw) as Lockfile
    if (typeof parsed !== 'object' || parsed === null) return undefined

    // A lockfile from a future version cannot be interpreted safely. Returning undefined
    // makes every file read as untracked, which is conservative — nothing gets
    // overwritten — rather than guessing at a format we do not know.
    if (parsed.version !== LOCKFILE_VERSION) return undefined
    if (typeof parsed.files !== 'object' || parsed.files === null) return undefined

    return parsed
  } catch {
    // A corrupt lockfile should not stop the user working. Treating it as absent means the
    // worst case is that we ask about files we would otherwise have known were safe.
    return undefined
  }
}

/** Summarise a set of status reports for CLI output. */
export function summariseStatuses(reports: StatusReport[]): {
  counts: Record<FileStatus, number>
  needsAttention: StatusReport[]
  safe: StatusReport[]
} {
  const counts: Record<FileStatus, number> = {
    new: 0,
    unchanged: 0,
    updated: 0,
    drifted: 0,
    conflicting: 0,
    orphaned: 0,
  }

  for (const report of reports) counts[report.status]++

  return {
    counts,
    needsAttention: reports.filter((report) => !report.safeToWrite),
    safe: reports.filter((report) => report.safeToWrite),
  }
}
