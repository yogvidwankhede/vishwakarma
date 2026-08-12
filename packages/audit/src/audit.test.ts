// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_CONTRACT } from '@vishwakarma/core'
import { describe, expect, it } from 'vitest'
import { auditSource, summariseProject } from './audit.js'
import { extractFromSource } from './extract.js'
import { formatReport } from './format.js'
import { parseTailwindClass, resolveTailwindSpacingPx } from './tailwind.js'

const SOURCE = `
import { useState } from 'react'

export function Card({ onClose }: { onClose: () => void }) {
  return (
    <div className="p-[13px] gap-6 rounded-[7px] text-[13px] duration-[430ms] transition-all">
      <h1 style={{ marginTop: 13, fontSize: '1.1rem', color: '#3a7bd5' }}>Title</h1>
      <h3>Skipped</h3>
      <button className={cn('mt-2', 'p-[5px]')} onClick={onClose} />
      <a href="/next"><svg /></a>
      <button aria-label="Fine">x</button>
      {/* vishwakarma-disable-next-line spacing/off-grid -- matches the legacy header */}
      <div className="pl-[7px]" />
      <div className="pr-[9px]" />
    </div>
  )
}

.thing { padding: 13px; border-radius: 7px; transition: width 900ms ease; }
@keyframes grow { from { height: 0; } to { height: 100px; } }
`

describe('extraction', () => {
  it('parses arbitrary tailwind values', () => {
    const utility = parseTailwindClass('md:hover:!-mt-[13px]')
    expect(utility.variants).toEqual(['md', 'hover'])
    expect(utility.negative).toBe(true)
    expect(utility.arbitrary).toBe('13px')
    expect(resolveTailwindSpacingPx(utility)).toBe(13)
  })

  it('does not split arbitrary variants', () => {
    const utility = parseTailwindClass('supports-[display:grid]:p-4')
    expect(utility.variants).toEqual(['supports-[display:grid]'])
    expect(utility.base).toBe('p-4')
  })

  it('finds the expected values', () => {
    const extraction = extractFromSource(SOURCE, 'Card.tsx')
    const kinds = (kind: string) =>
      extraction.evidence.filter((item) => item.kind === kind).map((item) => item.value)

    expect(kinds('spacing')).toContain(13)
    expect(kinds('radius')).toContain(7)
    expect(kinds('duration')).toContain(430)
    expect(kinds('duration')).toContain(900)
    expect(kinds('raw-colour')).toContain('#3a7bd5')
    expect(kinds('heading')).toEqual([1, 3])
    expect(kinds('animated-property')).toContain('height')
    expect(kinds('missing-name')).toContain('a')
    expect(extraction.suppressions[0]?.reason).toBe('matches the legacy header')
  })
})

describe('audit', () => {
  it('produces located, suppressed and formatted output', () => {
    const report = auditSource(SOURCE, 'Card.tsx', DEFAULT_CONTRACT)
    expect(report.summary.errors).toBeGreaterThan(0)
    expect(report.summary.suppressed).toBe(1)
    expect(report.violations.every((violation) => violation.location?.file === 'Card.tsx')).toBe(
      true,
    )
    const withLine = report.violations.filter((violation) => violation.location?.line !== undefined)
    expect(withLine.length).toBeGreaterThan(0)

    const project = summariseProject([report], [], DEFAULT_CONTRACT, '/tmp', 1)
    for (const format of ['text', 'json', 'markdown', 'github'] as const) {
      const output = formatReport(project, { format })
      expect(output.length).toBeGreaterThan(0)
    }
    expect(formatReport(project, { format: 'github' })).toMatch(/^::(error|warning|notice) file=/m)
    expect(JSON.parse(formatReport(project, { format: 'json' })).limits.length).toBeGreaterThan(0)
  })
})
