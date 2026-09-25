// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { catalog } from './catalog/index.js'

/**
 * Skills that name our own packages are shipping an API contract, and nothing checked it.
 *
 * `3d-game-assets` instructed agents to `import { useGLTF, useMixedAnimation } from
 * '@vishwakarma/three'` for months. None of those three hooks has ever existed. Every agent
 * that followed the skill wrote an import that throws, which is a plausible reason 3D work
 * stalled half-finished: the guidance was confident, specific, and wrong.
 *
 * A prose error is invisible to a type checker because the prose is inside a template literal.
 * So the barrel is parsed as text — no build, no runtime import, no dependency on the packages
 * being built first, which means this check works from a cold clone.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

/** Exported names of a workspace package, read statically from its barrel. */
function exportsOf(pkg: string): Set<string> {
  const source = readFileSync(join(ROOT, 'packages', pkg, 'src/index.ts'), 'utf8')
  const names = new Set<string>()

  // `export { a, type B, c as d }` — including the multi-line form the barrels use.
  for (const block of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of block[1].split(',')) {
      const name = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .pop()
        ?.trim()
      if (name) names.add(name)
    }
  }
  // `export const x`, `export function y`, `export class Z`, `export type T`
  for (const decl of source.matchAll(
    /export\s+(?:declare\s+)?(?:const|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(decl[1] as string)
  }

  return names
}

/** Every `import { … } from '@vishwakarma/<pkg>'` written inside a skill's prose. */
function citedImports(): Array<{ skill: string; pkg: string; names: string[] }> {
  const found: Array<{ skill: string; pkg: string; names: string[] }> = []

  for (const skill of catalog) {
    const prose = [
      skill.content.body,
      ...(skill.content.references ?? []).map((r) => r.content ?? ''),
    ].join('\n')

    for (const m of prose.matchAll(
      /import\s+\{([^}]*)\}\s+from\s+['"]@vishwakarma\/([a-z-]+)['"]/g,
    )) {
      const names = (m[1] as string)
        .split(',')
        .map((n) =>
          n
            .trim()
            .replace(/^type\s+/, '')
            .split(/\s+as\s+/)[0]
            ?.trim(),
        )
        .filter((n): n is string => Boolean(n))
      found.push({ skill: skill.id, pkg: m[2] as string, names })
    }
  }

  return found
}

describe('skills that cite our own packages', () => {
  it('only import names those packages actually export', () => {
    const broken: string[] = []

    for (const { skill, pkg, names } of citedImports()) {
      let available: Set<string>
      try {
        available = exportsOf(pkg)
      } catch {
        broken.push(`${skill}: imports from @vishwakarma/${pkg}, which is not a workspace package`)
        continue
      }
      for (const name of names) {
        if (!available.has(name)) {
          broken.push(`${skill}: @vishwakarma/${pkg} does not export "${name}"`)
        }
      }
    }

    expect(broken).toEqual([])
  })

  it('finds imports to check, so a regex that silently stops matching fails here', () => {
    // Without this, rewriting the extractor into something that matches nothing would make
    // the check above pass vacuously — the exact way a guard becomes decorative.
    expect(citedImports().length).toBeGreaterThan(0)
  })
})
