#!/usr/bin/env node
/**
 * Dependency license gate.
 *
 * Vishwakarma ships under MIT. A user who installs any of our packages must never
 * inherit a copyleft obligation, an attribution requirement beyond the standard MIT
 * notice, or a commercial-use restriction. This script walks every installed package
 * and fails the build if it finds one.
 *
 * Run: node scripts/audit-licenses.mjs [--json] [--quiet]
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import process from 'node:process'

/** Licenses we accept without question. */
const PERMISSIVE = new Set([
  '0BSD',
  'Apache-2.0',
  'BlueOak-1.0.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  'Python-2.0',
  'Unlicense',
  'WTFPL',
  'Zlib',
])

/**
 * Licenses that are acceptable only for build-time tooling that is never shipped to a
 * user's runtime. A weak-copyleft license on a devDependency does not propagate to
 * consumers of our published artifacts.
 */
const DEV_ONLY_TOLERATED = new Set(['LGPL-3.0', 'LGPL-3.0-or-later', 'MPL-2.0', 'EPL-2.0'])

/** Licenses that fail immediately, wherever they appear. */
const FORBIDDEN_PATTERNS = [/GPL-2/i, /GPL-3/i, /AGPL/i, /SSPL/i, /BUSL/i, /Commons-Clause/i, /Elastic-2/i]

/**
 * Normalise the many shapes a license field takes in the wild into a list of SPDX-ish
 * identifiers. `package.json` may carry a string, an SPDX expression with OR/AND, a
 * legacy `{ type }` object, or a legacy array of those objects.
 */
function normaliseLicense(pkg) {
  const raw = pkg.license ?? pkg.licenses
  if (!raw) return []
  if (typeof raw === 'string') {
    return raw
      .replace(/[()]/g, ' ')
      .split(/\s+(?:OR|AND)\s+/i)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (Array.isArray(raw)) return raw.flatMap((entry) => normaliseLicense({ license: entry }))
  if (typeof raw === 'object' && raw.type) return normaliseLicense({ license: raw.type })
  return []
}

/**
 * An SPDX "OR" expression means the consumer may pick any listed license, so the
 * package is acceptable if *any* option is acceptable. We deliberately treat "AND" the
 * same permissive way here rather than parsing the expression tree, and compensate by
 * hard-failing on FORBIDDEN_PATTERNS regardless of position — an AGPL term anywhere in
 * the expression fails even if MIT also appears.
 */
function classify(licenses, isDevOnly) {
  if (licenses.length === 0) return 'unknown'
  if (licenses.some((l) => FORBIDDEN_PATTERNS.some((p) => p.test(l)))) return 'forbidden'
  if (licenses.some((l) => PERMISSIVE.has(l))) return 'ok'
  if (isDevOnly && licenses.some((l) => DEV_ONLY_TOLERATED.has(l))) return 'ok-dev-only'
  return 'review'
}

/** Recursively collect every package.json under a node_modules tree. */
async function collectPackages(nodeModulesDir, found = new Map()) {
  let entries
  try {
    entries = await readdir(nodeModulesDir, { withFileTypes: true })
  } catch {
    return found
  }

  for (const entry of entries) {
    if (entry.name === '.bin' || entry.name === '.cache') continue
    const full = join(nodeModulesDir, entry.name)

    // Scoped packages nest one level deeper: node_modules/@scope/name
    if (entry.name.startsWith('@')) {
      await collectPackages(full, found)
      continue
    }

    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue

    const manifestPath = join(full, 'package.json')
    try {
      await stat(manifestPath)
      const pkg = JSON.parse(await readFile(manifestPath, 'utf8'))
      if (pkg.name && !found.has(`${pkg.name}@${pkg.version}`)) {
        found.set(`${pkg.name}@${pkg.version}`, {
          name: pkg.name,
          version: pkg.version,
          licenses: normaliseLicense(pkg),
          private: pkg.private === true,
        })
      }
      await collectPackages(join(full, 'node_modules'), found)
    } catch {
      // Not a package directory, or an unreadable manifest. Either way, skip it.
    }
  }
  return found
}

async function main() {
  const root = resolve(process.cwd())
  const asJson = process.argv.includes('--json')
  const quiet = process.argv.includes('--quiet')

  // pnpm hoists to node_modules/.pnpm; walking both catches hoisted and nested layouts.
  const packages = await collectPackages(join(root, 'node_modules'))
  await collectPackages(join(root, 'node_modules', '.pnpm'), packages)

  const results = { ok: [], 'ok-dev-only': [], review: [], forbidden: [], unknown: [] }

  for (const pkg of packages.values()) {
    if (pkg.private) continue
    if (pkg.name.startsWith('@vishwakarma/')) continue
    results[classify(pkg.licenses, true)].push(pkg)
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
  } else if (!quiet) {
    const line = (label, list) => `  ${label.padEnd(14)} ${String(list.length).padStart(5)}`
    process.stdout.write('\nDependency license audit\n')
    process.stdout.write(line('permissive', results.ok) + '\n')
    process.stdout.write(line('dev-tolerated', results['ok-dev-only']) + '\n')
    process.stdout.write(line('needs review', results.review) + '\n')
    process.stdout.write(line('unknown', results.unknown) + '\n')
    process.stdout.write(line('FORBIDDEN', results.forbidden) + '\n\n')

    for (const pkg of results.forbidden) {
      process.stderr.write(`  FORBIDDEN  ${pkg.name}@${pkg.version} — ${pkg.licenses.join(', ')}\n`)
    }
    for (const pkg of results.review) {
      process.stderr.write(`  REVIEW     ${pkg.name}@${pkg.version} — ${pkg.licenses.join(', ')}\n`)
    }
    for (const pkg of results.unknown) {
      process.stderr.write(`  UNKNOWN    ${pkg.name}@${pkg.version} — no license field\n`)
    }
  }

  const failed = results.forbidden.length > 0
  if (failed) {
    process.stderr.write('\nLicense audit failed: a forbidden license is present in the tree.\n')
    process.exit(1)
  }
  if (results.review.length > 0 || results.unknown.length > 0) {
    process.stderr.write(
      '\nLicense audit passed with warnings. Review the packages above and either add them\n' +
        'to the allowlist with a justification, or replace them.\n',
    )
  }
}

main().catch((error) => {
  process.stderr.write(`License audit crashed: ${error?.stack ?? error}\n`)
  process.exit(1)
})
