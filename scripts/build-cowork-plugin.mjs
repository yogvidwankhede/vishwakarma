#!/usr/bin/env node
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Builds the Cowork plugin from the skill catalog.
 *
 * Cowork presents a plugin's skills as a flat list, so the whole design catalogue is
 * folded into ONE skill named `vishwakarma` whose references are the individual skills,
 * and `vishwakarma-studios` ships alongside it as the one deliberately separate thing.
 *
 * This exists because the artifact used to be assembled by hand, which meant it could
 * disagree with the typed catalog and nothing would say so. It did: `public-api-integration`
 * was added to the catalog and never reached the plugin, so a skill that every other
 * install target shipped was simply absent here for anyone installing through Cowork.
 * `.claude/skills` had a `--check` guarding exactly this failure and the Cowork artifact
 * did not, so this closes that asymmetry.
 *
 * The split between generated and authored matters. Reference bodies, the studios skill and
 * the manifest are DERIVED — regenerating them is always safe. The merged `vishwakarma`
 * SKILL.md is AUTHORED prose that no generator can write, so it is read from `cowork/` and
 * passed through. What the generator does instead is *validate* it: every catalog skill must
 * be routed by the authored body, and every routed name must exist. That is the check that
 * would have caught the missing skill without pretending to write the editorial layer.
 *
 * Run: node scripts/build-cowork-plugin.mjs [--check]
 */

import { chmod, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'cowork')
const OUT = join(ROOT, 'cowork-plugin')

/** The one skill that ships separately rather than being folded into the merged body. */
const STANDALONE = 'vishwakarma-studios'

async function loadBuilt() {
  const skills = await import(join(ROOT, 'packages/skills/dist/index.js'))
  const adapters = await import(join(ROOT, 'packages/adapters/dist/index.js'))
  return {
    catalog: skills.catalog,
    renderBody: adapters.renderBody,
    toFrontmatter: adapters.toFrontmatter,
  }
}

/** Every file the plugin should contain: repo-relative path -> contents. */
async function desiredFiles() {
  const { catalog, renderBody, toFrontmatter } = await loadBuilt()
  const files = new Map()
  const executables = new Set()

  const merged = catalog.filter((s) => s.id !== STANDALONE)
  const standalone = catalog.find((s) => s.id === STANDALONE)
  if (!standalone) throw new Error(`${STANDALONE} is not in the catalog`)

  // --- the merged skill: authored body, derived references ---
  const authored = await readFile(join(SRC, 'vishwakarma/SKILL.md'), 'utf8')
  files.set('skills/vishwakarma/SKILL.md', authored)

  for (const skill of merged) {
    files.set(
      `skills/vishwakarma/references/${skill.id}.md`,
      `${renderBody(skill, { detail: 'full' }).trim()}\n`,
    )
  }

  const scriptDir = join(SRC, 'vishwakarma/scripts')
  for (const name of await readdir(scriptDir)) {
    const path = `skills/vishwakarma/scripts/${name}`
    files.set(path, await readFile(join(scriptDir, name), 'utf8'))
    executables.add(path)
  }

  // --- the standalone skill, emitted exactly as any other target would ---
  const fm = toFrontmatter({
    name: standalone.id,
    description: standalone.overrides?.['claude-code']?.description ?? standalone.description,
  })
  files.set(
    `skills/${standalone.id}/SKILL.md`,
    `${fm}\n\n${renderBody(standalone, { detail: 'full' })}`,
  )
  for (const reference of standalone.content.references ?? []) {
    if (!reference.content) continue
    files.set(
      `skills/${standalone.id}/references/${reference.id}.md`,
      `${reference.content.trim()}\n`,
    )
  }

  files.set('.claude-plugin/plugin.json', await readFile(join(SRC, 'plugin.json'), 'utf8'))
  files.set('README.md', await readFile(join(SRC, 'README.md'), 'utf8'))

  return { files, executables, merged, standalone, authored }
}

/**
 * Check the authored body against the catalog.
 *
 * A reference file the body never routes is dead weight the agent will not find, and a
 * routed name with no file is a link into nothing. Both are silent, so both are errors.
 */
function routingProblems(authored, merged) {
  const routed = new Set([...authored.matchAll(/`([a-z0-9-]+)\.md`/g)].map((m) => m[1]))
  const ids = merged.map((s) => s.id)
  return [
    ...ids
      .filter((id) => !routed.has(id))
      .map((id) => `catalog skill "${id}" is not routed by cowork/vishwakarma/SKILL.md`),
    ...[...routed]
      .filter((r) => !ids.includes(r) && r !== STANDALONE)
      .map((r) => `SKILL.md routes "${r}.md", which no catalog skill produces`),
  ]
}

async function actualFiles() {
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
      else found.set(relative(OUT, full), await readFile(full, 'utf8'))
    }
  }
  await walk(OUT)
  return found
}

async function main() {
  const check = process.argv.includes('--check')
  const { files, executables, merged, authored } = await desiredFiles()

  const problems = routingProblems(authored, merged)
  if (problems.length > 0) {
    process.stderr.write('Cowork plugin routing is out of step with the catalog:\n')
    for (const p of problems) process.stderr.write(`  - ${p}\n`)
    process.stderr.write(
      '\nAdd the missing row to the routing table in cowork/vishwakarma/SKILL.md.\n',
    )
    return 1
  }

  if (check) {
    const actual = await actualFiles()
    const drifted = []
    for (const [path, contents] of files) {
      if (!actual.has(path)) drifted.push(`missing: ${path}`)
      else if (actual.get(path) !== contents) drifted.push(`stale:   ${path}`)
    }
    for (const path of actual.keys()) if (!files.has(path)) drifted.push(`extra:   ${path}`)

    if (drifted.length > 0) {
      process.stderr.write(
        `Cowork plugin has drifted from the catalog (${drifted.length} file(s)):\n`,
      )
      for (const d of drifted.slice(0, 20)) process.stderr.write(`  ${d}\n`)
      if (drifted.length > 20) process.stderr.write(`  … and ${drifted.length - 20} more\n`)
      process.stderr.write('\nRun `pnpm cowork:build` and commit the result.\n')
      return 1
    }
    process.stdout.write(`Cowork plugin is in sync (${files.size} files).\n`)
    return 0
  }

  await rm(OUT, { recursive: true, force: true })
  for (const [path, contents] of files) {
    const full = join(OUT, path)
    await mkdir(dirname(full), { recursive: true })
    await writeFile(full, contents)
    if (executables.has(path)) await chmod(full, 0o755)
  }

  process.stdout.write(`Cowork plugin built: ${files.size} files.\n`)
  process.stdout.write(`  skills/vishwakarma            ${merged.length} references\n`)
  process.stdout.write(`  skills/${STANDALONE}   emitted as its own skill\n`)
  process.stdout.write('\nZip it with: pnpm cowork:pack\n')
  return 0
}

process.exit(await main())
