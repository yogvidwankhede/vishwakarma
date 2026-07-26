/**
 * Deciding what may be written and what must be shown to the user first.
 *
 * The failure this module exists to prevent is the one that destroys trust in a copy-in tool
 * permanently: the user customises a copied component — that being the entire reason they
 * chose a registry over a package — runs the update command months later, and the tool
 * overwrites their work without a word. There is no recovery from that except their git
 * history, and no reason for them to use the tool again.
 *
 * So nothing here writes anything. It classifies, using three inputs: the incoming content,
 * the file currently on disk, and the hash recorded when we last wrote that path. With the
 * recorded baseline the classification is exact — a file identical to the baseline is
 * untouched and may be replaced; a file differing from both baseline and incoming has been
 * edited and must not be. Without it, everything that differs is a conflict, which is the
 * correct conservative answer and also the reason the manifest is worth keeping.
 *
 * Reading files is injected as a callback rather than done here, so the same classifier runs
 * against a real filesystem, against an in-memory fixture in a test, and against a virtual
 * project in a docs preview.
 */

import { contentEquals, hashContent } from './hash.js'
import { baselineHash, type Manifest } from './manifest.js'
import type { PlannedFile } from './resolve.js'

/**
 * What should happen to one file.
 *
 * `adopt` is the interesting one: the file on disk already matches what we would write,
 * but we have no record of writing it. Nothing needs to happen to the bytes; the manifest
 * should simply start tracking it. Treating that as a conflict would make re-running an
 * install after deleting the manifest an unresolvable wall of false positives.
 */
export type Disposition = 'create' | 'unchanged' | 'update' | 'adopt' | 'conflict'

/** Why a file was classified as a conflict. */
export type ConflictReason =
  | 'user-modified'
  | 'untracked-file-exists'

/** The verdict for one planned file. */
export interface FileDecision {
  /** Destination path, relative to the project root. */
  target: string
  /** The item that wants to write it. */
  item: string
  disposition: Disposition
  /** Hash of the content we would write. */
  incomingHash: string
  /** Hash of what is on disk, absent when there is no file there. */
  existingHash?: string
  /** Hash recorded when we last wrote this path, absent when we never did. */
  baselineHash?: string
  /** Set only when `disposition` is `conflict`. */
  reason?: ConflictReason
}

/**
 * Reads the current content of a target path, or returns `undefined` if nothing is there.
 *
 * Synchronous on purpose. A conflict report is computed in one pass over a bounded set of
 * small files, and making it async would push `await` into every caller — including a docs
 * renderer that has the contents in memory already.
 */
export type ExistingFileReader = (target: string) => string | undefined

/** The classification of an entire plan. */
export interface ConflictReport {
  /** One decision per planned file, in plan order. */
  decisions: readonly FileDecision[]
  /** Files that may be written without asking: `create`, `update` and `adopt`. */
  writable: readonly FileDecision[]
  /** Files that are already correct. Writing them would only churn mtimes. */
  unchanged: readonly FileDecision[]
  /** Files that must not be written without the user deciding. */
  conflicts: readonly FileDecision[]
  /** Convenience: whether anything requires the user's attention before proceeding. */
  blocked: boolean
}

/**
 * Classify every file in a plan against the project as it currently stands.
 *
 * Pass the manifest whenever one exists. Without it every pre-existing file that differs is
 * reported as a conflict, which is safe but noisy; with it, files we wrote and the user never
 * touched are recognised as ours and updated silently.
 */
export function detectConflicts(
  files: readonly PlannedFile[],
  read: ExistingFileReader,
  manifest?: Manifest,
): ConflictReport {
  const decisions: FileDecision[] = []

  for (const file of files) {
    const incomingHash = hashContent(file.content)
    const existing = read(file.target)
    const baseline = manifest ? baselineHash(manifest, file.target) : undefined

    if (existing === undefined) {
      decisions.push({
        target: file.target,
        item: file.item,
        disposition: 'create',
        incomingHash,
        ...(baseline === undefined ? {} : { baselineHash: baseline }),
      })
      continue
    }

    const existingHash = hashContent(existing)
    const common = {
      target: file.target,
      item: file.item,
      incomingHash,
      existingHash,
      ...(baseline === undefined ? {} : { baselineHash: baseline }),
    }

    if (contentEquals(existing, file.content)) {
      // Identical bytes. Whether we have a record of writing them only changes bookkeeping.
      decisions.push({ ...common, disposition: baseline === undefined ? 'adopt' : 'unchanged' })
      continue
    }

    if (baseline !== undefined && baseline === existingHash) {
      // Ours, untouched since we wrote it, and the registry has moved on. Safe to replace.
      decisions.push({ ...common, disposition: 'update' })
      continue
    }

    decisions.push({
      ...common,
      disposition: 'conflict',
      reason: baseline === undefined ? 'untracked-file-exists' : 'user-modified',
    })
  }

  const writable = decisions.filter(
    (decision) =>
      decision.disposition === 'create' ||
      decision.disposition === 'update' ||
      decision.disposition === 'adopt',
  )
  const unchanged = decisions.filter((decision) => decision.disposition === 'unchanged')
  const conflicts = decisions.filter((decision) => decision.disposition === 'conflict')

  return { decisions, writable, unchanged, conflicts, blocked: conflicts.length > 0 }
}

/**
 * Render a conflict report for a terminal.
 *
 * Deliberately says what the user should do about each case. "Conflict" on its own tells
 * someone that something is wrong without telling them what choice they have, and the
 * choices here are genuinely different: an untracked file is usually a previous install
 * whose manifest was lost, whereas a modified file is work they will lose.
 */
export function formatConflicts(report: ConflictReport): string {
  if (report.conflicts.length === 0) {
    return `No conflicts. ${report.writable.length} file(s) to write, ${report.unchanged.length} already current.`
  }

  const lines = report.conflicts.map((conflict) => {
    const explanation =
      conflict.reason === 'user-modified'
        ? 'you have edited this file since it was installed; review the diff before replacing it'
        : 'this file already exists and was not installed by this registry; it will not be touched'
    return `  ${conflict.target} (${conflict.item}): ${explanation}`
  })

  const count =
    report.conflicts.length === 1 ? '1 conflict' : `${report.conflicts.length} conflicts`
  return `${count}; nothing has been written:\n${lines.join('\n')}`
}

/**
 * The subset of a plan that can be applied right now.
 *
 * Use this to write everything safe and report the rest, rather than refusing the whole
 * install because one file out of thirty was customised. Partial application is sound here
 * because the plan is ordered dependencies-first and the skipped files are, by definition,
 * ones the user already has a version of.
 */
export function applicableFiles(
  files: readonly PlannedFile[],
  report: ConflictReport,
): PlannedFile[] {
  const allowed = new Set(report.writable.map((decision) => decision.target))
  return files.filter((file) => allowed.has(file.target))
}
