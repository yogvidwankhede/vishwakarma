#!/usr/bin/env node
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Builds the Claude Code plugin from the skill catalog.
 *
 * The repository doubles as a Claude Code plugin marketplace: `.claude-plugin/` carries
 * the manifest and marketplace definition, and `.claude/skills/` carries the compiled
 * catalog in Claude Code's native SKILL.md layout. That single directory serves two
 * install paths without any duplication:
 *
 * 1. Plugin install — two commands, no build step:
 *
 *        /plugin marketplace add yogvidwankhede/vishwakarma
 *        /plugin install vishwakarma@vishwakarma
 *
 * 2. GitHub-link install — paste the URL and Claude installs directly:
 *
 *        "Install https://github.com/yogvidwankhede/vishwakarma"
 *
 *    Claude looks for `.claude/skills/` in the repository root, finds the compiled
 *    catalog there, and copies it into the target project.
 *
 * The `.claude/skills/` tree is generated — from the same source of truth the CLI
 * compiles — and committed, because an installable artifact that requires the installer
 * to run our build first is not installable. This script is the only thing that may
 * write it.
 *
 * Run: node scripts/build-plugin.mjs [--check]
 *
 * `--check` regenerates in memory and fails if the committed tree differs, which is how
 * CI guarantees the plugin can never drift from the catalog.
 */

import { chmod, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKILLS_DIR = join(ROOT, '.claude', 'skills')

async function loadBuilt(name) {
  const path = join(ROOT, 'packages', name, 'dist', 'index.js')
  try {
    return await import(pathToFileURL(path).href)
  } catch (error) {
    process.stderr.write(
      `Cannot load packages/${name}/dist — run \`pnpm build\` first.\n${error?.message ?? error}\n`,
    )
    process.exit(1)
  }
}

/** Compute the desired plugin file set: path (relative to repo root) → contents. */
function planFiles(catalog, claudeCodeAdapter) {
  const desired = new Map()
  for (const file of claudeCodeAdapter.emit(catalog)) {
    // The adapter emits .claude/skills/… paths — exactly where Claude Code looks for
    // skills both when installing via /plugin and when installing from a GitHub URL.
    desired.set(file.path, file.contents)
    if (file.executable) executables.add(file.path)
  }
  return desired
}

/** Paths the adapter marked executable, so the write step can chmod them. */
const executables = new Set()

async function currentFiles() {
  const found = new Map()
  async function walk(dir) {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile()) found.set(relative(ROOT, full), await readFile(full, 'utf8'))
    }
  }
  await walk(SKILLS_DIR)
  return found
}

async function main() {
  const check = process.argv.includes('--check')

  const { catalog } = await loadBuilt('skills')
  const { claudeCodeAdapter } = await loadBuilt('adapters')

  const desired = planFiles(catalog, claudeCodeAdapter)
  const current = await currentFiles()

  const stale = [...current.keys()].filter((path) => !desired.has(path))
  const changed = [...desired].filter(([path, contents]) => current.get(path) !== contents)

  if (check) {
    if (stale.length === 0 && changed.length === 0) {
      process.stdout.write(`Plugin skills are in sync (${desired.size} files).\n`)
      return
    }
    for (const path of stale) process.stderr.write(`  stale:   ${path}\n`)
    for (const [path] of changed) process.stderr.write(`  changed: ${path}\n`)
    process.stderr.write(
      '\nThe committed .claude/skills/ tree does not match the catalog. Run `node scripts/build-plugin.mjs` and commit the result.\n',
    )
    process.exit(1)
  }

  for (const path of stale) await rm(join(ROOT, path), { force: true })
  for (const [path, contents] of desired) {
    const full = join(ROOT, path)
    await mkdir(dirname(full), { recursive: true })
    await writeFile(full, contents, 'utf8')
    // 0o755, not 0o777: the agent must run it, nobody else needs to write it.
    if (executables.has(path)) await chmod(full, 0o755)
  }

  process.stdout.write(
    `.claude/skills/ regenerated: ${desired.size} files (${changed.length} changed, ${stale.length} removed).\n`,
  )
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? error}\n`)
  process.exit(1)
})
