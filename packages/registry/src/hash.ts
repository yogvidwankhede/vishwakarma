// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Content hashing for installed files.
 *
 * This is the mechanism that pays for the central trade-off of copy-in distribution. Copying
 * source into the consumer's repository gives them ownership: they can edit any line, they
 * are never blocked by an upstream release, and there is no version of this library pinned
 * in their lockfile that can break their build. What they give up is automatic updates —
 * once the file is theirs, nobody can safely overwrite it.
 *
 * Recording a hash of exactly what we wrote, alongside the item version it came from, turns
 * that from a dead end into a three-way merge. On the next update we can distinguish "the
 * file on disk is byte-for-byte what we installed, so replacing it is safe" from "the user
 * has edited this, so the only honest move is to show them a diff and stop". Without the
 * recorded hash both cases look identical — the file simply differs from the new version —
 * and the installer has to choose between clobbering people's work and never updating
 * anything.
 *
 * SHA-256 rather than a cheap non-cryptographic hash: the cost is irrelevant at these sizes,
 * and a hash that can collide would make "has the user edited this?" answerable incorrectly,
 * which is the one question the whole scheme exists to answer.
 */

import { createHash } from 'node:crypto'

/**
 * Normalise text before hashing.
 *
 * Line endings are normalised to LF and a single trailing newline is enforced. Without this,
 * a Windows checkout with `core.autocrlf` on reports every installed file as user-modified,
 * every time, and the conflict report becomes noise that people learn to ignore. Whitespace
 * *within* lines is deliberately significant: an indentation change is a real edit.
 */
export function normaliseForHash(content: string): string {
  const lf = content.replace(/\r\n?/g, '\n')
  return lf.endsWith('\n') ? lf : `${lf}\n`
}

/** Hash file content, returning a lowercase hex SHA-256 of the normalised text. */
export function hashContent(content: string): string {
  return createHash('sha256').update(normaliseForHash(content), 'utf8').digest('hex')
}

/**
 * A short, human-quotable form of a hash.
 *
 * Twelve hex characters, which is enough to be unambiguous in a report of at most a few
 * hundred files and short enough that people will actually paste it into an issue.
 */
export function shortHash(hash: string): string {
  return hash.slice(0, 12)
}

/** Whether two pieces of content are equal once normalised. Cheaper than comparing hashes. */
export function contentEquals(a: string, b: string): boolean {
  return normaliseForHash(a) === normaliseForHash(b)
}
