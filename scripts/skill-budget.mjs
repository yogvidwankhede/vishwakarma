#!/usr/bin/env node
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Reports every skill's tier costs against TIER_BUDGETS, and every validation issue.
 *
 * The budgets were enforced in `validateManifest` but nothing in the repository ever printed
 * the result, so four skills sat over budget with no surface saying so — including one whose
 * body was 59 per cent over, which is a cost paid on every design turn. A warning nobody can
 * see is not a warning.
 *
 * Errors always fail. Warnings are printed and, with `--strict`, fail too; that flag is the
 * lever for tightening the gate once the existing overages are paid down, rather than either
 * blocking work now or leaving the numbers invisible.
 *
 * Run: node scripts/skill-budget.mjs [--strict]
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const strict = process.argv.includes('--strict')

const { catalog, estimateTokens, TIER_BUDGETS, validateManifest } = await import(
  join(ROOT, 'packages/skills/dist/index.js')
)

/** Tokens for each tier of one skill, in the order an agent pays for them. */
function tiers(skill) {
  return {
    description: estimateTokens(skill.description),
    summary: estimateTokens(skill.content.summary),
    body: estimateTokens(skill.content.body),
    references: (skill.content.references ?? []).map((r) => ({
      id: r.id,
      tokens: estimateTokens(r.content ?? ''),
    })),
  }
}

let errors = 0
let warnings = 0
let overBudget = 0

const rows = []

for (const skill of [...catalog].sort((a, b) => a.id.localeCompare(b.id))) {
  const cost = tiers(skill)
  const worstReference = cost.references.reduce((max, r) => Math.max(max, r.tokens), 0)
  const over = cost.body > TIER_BUDGETS.body || worstReference > TIER_BUDGETS.reference
  if (over) overBudget += 1

  rows.push({
    id: skill.id,
    body: cost.body,
    refs: cost.references.length,
    worst: worstReference,
    always: skill.activation?.always === true,
    over,
  })

  for (const issue of validateManifest(skill)) {
    if (issue.severity === 'error') errors += 1
    else warnings += 1
    console.log(`${issue.severity === 'error' ? 'ERROR' : 'warn '}  ${skill.id}  ${issue.path}`)
    console.log(`        ${issue.message}`)
  }
}

const width = Math.max(...rows.map((r) => r.id.length))
console.log()
console.log(
  `${'skill'.padEnd(width)}  ${'body'.padStart(5)}  ${'refs'.padStart(4)}  ${'worst ref'.padStart(9)}`,
)
for (const row of rows) {
  const flags = [row.over ? 'OVER' : '', row.always ? 'always-on' : ''].filter(Boolean).join(' ')
  console.log(
    `${row.id.padEnd(width)}  ${String(row.body).padStart(5)}  ${String(row.refs).padStart(4)}  ${String(row.worst).padStart(9)}  ${flags}`,
  )
}

const totalBody = rows.reduce((sum, r) => sum + r.body, 0)
console.log()
console.log(
  `${catalog.length} skills · bodies total ${totalBody} tokens · budgets body ${TIER_BUDGETS.body}, reference ${TIER_BUDGETS.reference}`,
)
console.log(`${errors} error(s), ${warnings} warning(s), ${overBudget} skill(s) over a tier budget`)

if (errors > 0 || (strict && warnings > 0)) process.exit(1)
