// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { catalog } from './catalog/index.js'
import { estimateTokens, type SkillManifest, TIER_BUDGETS, validateManifest } from './manifest.js'

/**
 * These cover the tier budgets specifically.
 *
 * The reference budget shipped as a documented constant that nothing read, so an
 * over-budget reference validated clean and reached users. A budget nobody enforces is
 * worse than no budget, because it reads as a guarantee. The boundary cases below exist
 * so the check cannot quietly become decorative again.
 */

function manifestWith(references: SkillManifest['content']['references']): SkillManifest {
  return {
    vsm: '1.0',
    id: 'budget-fixture',
    name: 'Budget Fixture',
    description: 'Use when exercising the validator against a known-size reference.',
    version: '1.0.0',
    category: 'foundation',
    activation: { intents: ['exercising the validator'] },
    content: {
      summary: 'A fixture used to check that tier budgets are enforced.',
      body: '# Fixture\n\nA body short enough to stay well inside its own budget.',
      references,
    },
  }
}

/** A string whose estimated token count is exactly `tokens`. */
function contentOfTokens(tokens: number): string {
  return 'x'.repeat(tokens * 3.6)
}

const referenceIssues = (m: SkillManifest) =>
  validateManifest(m).filter((issue) => issue.path.startsWith('content.references'))

describe('reference tier budget', () => {
  it('warns when a reference exceeds the budget', () => {
    const m = manifestWith([
      {
        id: 'oversized',
        title: 'Oversized',
        answers: 'when the reference is too large to load as a unit',
        content: contentOfTokens(TIER_BUDGETS.reference + 1),
      },
    ])

    const issues = referenceIssues(m)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.severity).toBe('warning')
    expect(issues[0]?.message).toContain('oversized')
    expect(issues[0]?.message).toContain(String(TIER_BUDGETS.reference))
  })

  it('stays silent at exactly the budget', () => {
    const m = manifestWith([
      {
        id: 'exact',
        title: 'Exact',
        answers: 'when the reference sits precisely on the limit',
        content: contentOfTokens(TIER_BUDGETS.reference),
      },
    ])

    expect(referenceIssues(m)).toHaveLength(0)
  })

  it('does not warn on a path-only reference, which has no inline cost to measure', () => {
    const m = manifestWith([
      {
        id: 'external',
        title: 'External',
        answers: 'when the content lives on disk rather than in the manifest',
        path: './references/external.md',
      },
    ])

    expect(referenceIssues(m)).toHaveLength(0)
  })

  it('reports every oversized reference, not just the first', () => {
    const big = contentOfTokens(TIER_BUDGETS.reference + 100)
    const m = manifestWith([
      { id: 'a', title: 'A', answers: 'first', content: big },
      { id: 'b', title: 'B', answers: 'second', content: big },
    ])

    expect(referenceIssues(m)).toHaveLength(2)
  })
})

describe('the shipped catalog', () => {
  it('has no validation errors', () => {
    const errors = catalog.flatMap((skill) =>
      validateManifest(skill)
        .filter((issue) => issue.severity === 'error')
        .map((issue) => `${skill.id}: ${issue.path} — ${issue.message}`),
    )

    expect(errors).toEqual([])
  })

  it('keeps every inline reference inside the reference budget', () => {
    const over = catalog.flatMap((skill) =>
      (skill.content.references ?? [])
        .filter((r) => r.content && estimateTokens(r.content) > TIER_BUDGETS.reference)
        .map((r) => `${skill.id}/${r.id}: ${estimateTokens(r.content ?? '')} tokens`),
    )

    expect(over).toEqual([])
  })

  it('gives every reference a unique id within its skill, since ids become filenames', () => {
    const collisions = catalog.flatMap((skill) => {
      const ids = (skill.content.references ?? []).map((r) => r.id)
      return ids.filter((id, index) => ids.indexOf(id) !== index).map((id) => `${skill.id}/${id}`)
    })

    expect(collisions).toEqual([])
  })
})
