// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import {
  buildLockfile,
  classify,
  hashContent,
  type LockEntry,
  parseLockfile,
  serialiseLockfile,
  summariseStatuses,
} from './lockfile.js'
import type { EmittedFile } from './targets.js'

const file = (contents: string): EmittedFile => ({
  path: '.claude/skills/x/SKILL.md',
  contents,
  strategy: 'replace',
})

const entry = (contents: string): LockEntry => ({
  hash: hashContent(contents),
  target: 'claude-code',
  strategy: 'replace',
})

describe('content hashing', () => {
  it('is deterministic', () => {
    expect(hashContent('hello')).toBe(hashContent('hello'))
  })

  it('separates different content', () => {
    expect(hashContent('hello')).not.toBe(hashContent('hellp'))
  })

  it('ignores line-ending style', () => {
    // Without this, git's CRLF rewriting would report every file on a Windows checkout as
    // drifted, and the mechanism would cry wolf on an entire platform.
    expect(hashContent('a\r\nb\r\nc')).toBe(hashContent('a\nb\nc'))
  })

  it('produces a fixed-width hex string', () => {
    for (const input of [
      '',
      'a',
      'a much longer string with symbols !@#$%^&*() and numbers 12345',
    ]) {
      expect(hashContent(input)).toMatch(/^[0-9a-f]{16}$/)
    }
  })

  it('separates content that differs only in length', () => {
    expect(hashContent('aaa')).not.toBe(hashContent('aaaa'))
  })
})

describe('classification', () => {
  it('reports a missing file as new', () => {
    expect(classify('p', undefined, null, file('x')).status).toBe('new')
  })

  it('reports an untouched file with unchanged output as unchanged', () => {
    const result = classify('p', entry('same'), 'same', file('same'))
    expect(result.status).toBe('unchanged')
    expect(result.safeToWrite).toBe(true)
  })

  it('reports an untouched file with new output as updated, and safe', () => {
    const result = classify('p', entry('old'), 'old', file('new'))
    expect(result.status).toBe('updated')
    expect(result.safeToWrite).toBe(true)
  })

  it('reports a user-edited file with unchanged output as drifted, and refuses to write', () => {
    // The case the whole mechanism exists for: someone tightened a rule for their codebase
    // and we have nothing new to offer, so their edit must survive.
    const result = classify('p', entry('generated'), 'generated + my edit', file('generated'))
    expect(result.status).toBe('drifted')
    expect(result.safeToWrite).toBe(false)
  })

  it('reports both sides moving as conflicting', () => {
    const result = classify('p', entry('v1'), 'v1 + my edit', file('v2'))
    expect(result.status).toBe('conflicting')
    expect(result.safeToWrite).toBe(false)
  })

  it('treats an untracked existing file as the user’s, not ours', () => {
    // Assuming otherwise is how a tool destroys work it did not create.
    const result = classify('p', undefined, 'someone else wrote this', file('ours'))
    expect(result.status).toBe('conflicting')
    expect(result.safeToWrite).toBe(false)
  })

  it('does not flag an untracked file that already matches what we would write', () => {
    const result = classify('p', undefined, 'identical', file('identical'))
    expect(result.status).toBe('unchanged')
    expect(result.safeToWrite).toBe(true)
  })

  it('reports a no-longer-generated file as orphaned, and safe when untouched', () => {
    const result = classify('p', entry('old'), 'old', null)
    expect(result.status).toBe('orphaned')
    expect(result.safeToWrite).toBe(true)
  })

  it('refuses to delete an orphan the user has edited', () => {
    const result = classify('p', entry('old'), 'old + my notes', null)
    expect(result.status).toBe('orphaned')
    expect(result.safeToWrite).toBe(false)
  })

  it('gives every status an explanation a person could act on', () => {
    const cases = [
      classify('p', undefined, null, file('x')),
      classify('p', entry('a'), 'a', file('a')),
      classify('p', entry('a'), 'a', file('b')),
      classify('p', entry('a'), 'a-edited', file('a')),
      classify('p', entry('a'), 'a-edited', file('b')),
      classify('p', entry('a'), 'a', null),
    ]
    for (const result of cases) {
      expect(result.explanation.length).toBeGreaterThan(8)
    }
  })
})

describe('lockfile round-tripping', () => {
  it('serialises and parses back to the same thing', () => {
    const lock = buildLockfile(
      [{ file: file('content'), target: 'claude-code', skill: 'design-judgment' }],
      '0.1.0',
    )
    expect(parseLockfile(serialiseLockfile(lock))).toEqual(lock)
  })

  it('sorts keys so the file diffs cleanly instead of reordering', () => {
    const lock = buildLockfile(
      [
        { file: { path: 'z/file', contents: 'z', strategy: 'replace' }, target: 'cursor' },
        { file: { path: 'a/file', contents: 'a', strategy: 'replace' }, target: 'cursor' },
      ],
      '0.1.0',
    )
    const keys = Object.keys(JSON.parse(serialiseLockfile(lock)).files)
    expect(keys).toEqual(['a/file', 'z/file'])
  })

  it('preserves entries from a previous lockfile that were not rewritten', () => {
    // A file we skipped because it had drifted must keep its recorded hash, or the next
    // sync would treat a known-drifted file as untracked — a worse classification.
    const first = buildLockfile([{ file: file('a'), target: 'claude-code' }], '0.1.0')
    const second = buildLockfile(
      [{ file: { path: 'other', contents: 'b', strategy: 'replace' }, target: 'cursor' }],
      '0.1.0',
      first,
    )
    expect(Object.keys(second.files).sort()).toEqual(['.claude/skills/x/SKILL.md', 'other'])
  })

  it('returns undefined for an absent lockfile', () => {
    expect(parseLockfile(null)).toBeUndefined()
  })

  it('treats a corrupt lockfile as absent rather than crashing', () => {
    expect(parseLockfile('{ not json')).toBeUndefined()
    expect(parseLockfile('null')).toBeUndefined()
    expect(parseLockfile('[]')).toBeUndefined()
  })

  it('refuses a lockfile from a future version rather than guessing', () => {
    // Conservative: every file then reads as untracked, so nothing gets overwritten.
    expect(
      parseLockfile(JSON.stringify({ version: 999, generator: 'x', files: {} })),
    ).toBeUndefined()
  })
})

describe('summary', () => {
  it('separates what needs a human from what does not', () => {
    const reports = [
      classify('a', undefined, null, file('x')),
      classify('b', entry('v1'), 'v1', file('v2')),
      classify('c', entry('v1'), 'v1-edited', file('v2')),
      classify('d', entry('v1'), 'v1-edited', file('v1')),
    ]
    const summary = summariseStatuses(reports)

    expect(summary.counts.new).toBe(1)
    expect(summary.counts.updated).toBe(1)
    expect(summary.counts.conflicting).toBe(1)
    expect(summary.counts.drifted).toBe(1)
    // Only the genuine conflicts and drifts should interrupt anyone. A tool that asks
    // about every file trains people to say yes without reading.
    expect(summary.needsAttention).toHaveLength(2)
    expect(summary.safe).toHaveLength(2)
  })
})
