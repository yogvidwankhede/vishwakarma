#!/usr/bin/env node
/**
 * Stamp every first-party source file with a copyright and SPDX licence header.
 *
 * A per-file header does something the LICENSE file alone cannot: it travels with the
 * file. If a single module is copied out of this repository and dropped into someone
 * else's — which is exactly how source gets lifted in practice — the header goes with it,
 * and the copied file is then self-documenting evidence of who wrote it and under what
 * terms. A LICENSE sitting at the repository root does not survive that journey.
 *
 * The header is the SPDX short form rather than the full eleven-line Apache boilerplate.
 * It is legally sufficient, it is the modern convention, and it keeps the top of every
 * file to two lines instead of a screenful.
 *
 * The script is idempotent: a file that already carries the SPDX identifier is skipped, so
 * it is safe to run on every commit.
 *
 * Run: node scripts/apply-license-headers.mjs [--check]
 */

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import process from 'node:process'

const COPYRIGHT = 'Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors'
const SPDX = 'SPDX-License-Identifier: Apache-2.0'

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
  '.changeset',
  '.vishwakarma',
])

/** Files we stamp. Config and generated artefacts are left alone. */
const EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.cjs', '.js', '.jsx'])

/** A directive that the language requires to be the first statement in the module. */
const DIRECTIVE = /^\s*(['"])use (client|server|strict)\1\s*;?\s*$/

const roots = ['packages', 'scripts', 'apps']

async function* walk(dir, repoRoot) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full, repoRoot)
    } else if (EXTENSIONS.has(extname(entry.name)) && !entry.name.endsWith('.d.ts')) {
      yield full
    }
  }
}

function headerBlock() {
  return `// ${COPYRIGHT}\n// ${SPDX}`
}

/**
 * Insert the header, respecting a leading directive.
 *
 * The `'use client'` and `'use server'` directives that the React Server Components model
 * relies on must be the first *statement* in the module. A comment is not a statement, so
 * a comment may legally precede a directive — but bundlers vary in how strictly they parse
 * this, and getting it wrong silently strips the directive and breaks the component in a
 * server tree. The safe, universally-accepted placement is therefore: if the file opens
 * with a directive, the header goes immediately after it; otherwise it goes at the very
 * top.
 */
function withHeader(source) {
  if (source.includes(SPDX)) return null // already stamped

  const header = headerBlock()
  const lines = source.split('\n')
  const firstNonEmpty = lines.findIndex((line) => line.trim() !== '')

  // A shebang (`#!/usr/bin/env node`) is only valid as the very first line of a file; a
  // JavaScript hashbang anywhere else is a syntax error. So it, like a directive, has to
  // stay first and the header goes after it.
  const mustStayFirst =
    firstNonEmpty !== -1 &&
    (DIRECTIVE.test(lines[firstNonEmpty]) || lines[firstNonEmpty].startsWith('#!'))

  if (mustStayFirst) {
    // Keep everything up to and including the directive, then the header, then the rest.
    const before = lines.slice(0, firstNonEmpty + 1)
    const after = lines.slice(firstNonEmpty + 1)
    // Drop one blank line immediately after the directive so spacing stays tidy.
    while (after.length > 0 && after[0].trim() === '') after.shift()
    return `${before.join('\n')}\n${header}\n\n${after.join('\n')}`
  }

  return `${header}\n\n${source.replace(/^\n+/, '')}`
}

async function main() {
  const repoRoot = process.cwd()
  const checkOnly = process.argv.includes('--check')

  let stamped = 0
  let skipped = 0
  const missing = []

  for (const root of roots) {
    for await (const file of walk(join(repoRoot, root), repoRoot)) {
      const source = await readFile(file, 'utf8')
      const updated = withHeader(source)

      if (updated === null) {
        skipped++
        continue
      }

      if (checkOnly) {
        missing.push(relative(repoRoot, file))
        continue
      }

      await writeFile(file, updated, 'utf8')
      stamped++
    }
  }

  if (checkOnly) {
    if (missing.length > 0) {
      process.stderr.write(`Missing licence header in ${missing.length} file(s):\n`)
      for (const file of missing) process.stderr.write(`  ${file}\n`)
      process.exit(1)
    }
    process.stdout.write('Every source file carries a licence header.\n')
    return
  }

  process.stdout.write(`Licence headers: ${stamped} stamped, ${skipped} already present.\n`)
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? error}\n`)
  process.exit(1)
})
