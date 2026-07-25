import { describe, expect, it } from 'vitest'
import type { SkillManifest } from '@vishwakarma/skills'
import { compile, estimateContextCost, mergeFile, planFor, removeSection } from './compile.js'
import { getAdapter } from './targets.js'
import { shiftHeadings, toFrontmatter } from './render.js'

function makeSkill(overrides: Partial<SkillManifest> = {}): SkillManifest {
  return {
    vsm: '1.0',
    id: 'test-skill',
    name: 'Test Skill',
    description: 'Use when testing the compiler.',
    version: '1.0.0',
    category: 'ui',
    activation: { intents: ['testing'] },
    content: {
      summary: 'A skill for tests.',
      body: '# Test Skill\n\nBody content.\n\n## A section\n\nMore content.',
      references: [{ id: 'deep', title: 'Deep', answers: 'What about the details?', content: '# Deep\n\nDetail.' }],
    },
    rules: [
      {
        id: 'test-skill/first',
        strength: 'must',
        statement: 'Always do the thing.',
        evidence: { rationale: 'Because otherwise the other thing happens.' },
      },
      {
        id: 'test-skill/second',
        strength: 'should',
        statement: 'Usually do the other thing.',
      },
    ],
    verification: [
      { id: 'check', kind: 'self-review', description: 'Check it.', questions: ['Did you?'], blocking: true },
    ],
    ...overrides,
  }
}

describe('frontmatter serialisation', () => {
  it('quotes values containing a colon, which would otherwise parse as a mapping', () => {
    // This is the single most common way a generated agent config silently fails to load:
    // a description reading "Use when: building a page" becomes a nested map.
    const yaml = toFrontmatter({ description: 'Use when: building a page' })
    expect(yaml).toContain('description: "Use when: building a page"')
  })

  it('leaves simple scalars unquoted', () => {
    expect(toFrontmatter({ name: 'design-judgment' })).toContain('name: design-judgment')
  })

  it('quotes values that would parse as booleans or numbers', () => {
    expect(toFrontmatter({ a: 'true', b: '3.5' })).toContain('a: "true"')
    expect(toFrontmatter({ a: 'true', b: '3.5' })).toContain('b: "3.5"')
  })

  it('emits arrays in flow style, quoting entries that need it', () => {
    // Glob patterns contain `*`, which is a YAML alias indicator, so they must be quoted.
    // Emitting them bare produces a file that parses in some implementations and fails in
    // others, which is the worst of both worlds.
    expect(toFrontmatter({ globs: ['**/*.tsx', '**/*.css'] })).toContain(
      'globs: ["**/*.tsx", "**/*.css"]',
    )
    expect(toFrontmatter({ tags: ['ui', 'motion'] })).toContain('tags: [ui, motion]')
  })

  it('omits empty and absent values rather than emitting nulls', () => {
    const yaml = toFrontmatter({ a: 'x', b: undefined, c: [], d: null })
    expect(yaml).not.toContain('b:')
    expect(yaml).not.toContain('c:')
    expect(yaml).not.toContain('d:')
  })

  it('collapses newlines so a multi-line value cannot break the block', () => {
    expect(toFrontmatter({ description: 'line one\nline two' })).toContain('"line one line two"')
  })
})

describe('heading shifting', () => {
  it('shifts headings down so a skill nests under a parent heading', () => {
    expect(shiftHeadings('# Title\n\n## Section', 1)).toBe('## Title\n\n### Section')
  })

  it('does not shift a hash inside a fenced code block', () => {
    // A `#` in a shell example is a comment, and rewriting it would corrupt the example.
    const input = '# Title\n\n```bash\n# this is a comment\nls\n```\n\n## Section'
    const output = shiftHeadings(input, 1)
    expect(output).toContain('# this is a comment')
    expect(output).toContain('## Title')
    expect(output).toContain('### Section')
  })

  it('clamps at h6 rather than emitting invalid markup', () => {
    expect(shiftHeadings('###### Deep', 2)).toBe('###### Deep')
  })

  it('is a no-op at zero', () => {
    const input = '# A\n## B'
    expect(shiftHeadings(input, 0)).toBe(input)
  })
})

describe('compilation', () => {
  const skill = makeSkill()

  it('emits a directory layout with references for supporting-file targets', () => {
    const [result] = compile([skill], { targets: ['claude-code'] })
    const paths = result?.files.map((file) => file.path) ?? []
    expect(paths).toContain('.claude/skills/test-skill/SKILL.md')
    expect(paths).toContain('.claude/skills/test-skill/references/deep.md')
  })

  it('emits one file per skill for rule-file targets, with no references', () => {
    const [result] = compile([skill], { targets: ['cursor'] })
    expect(result?.files).toHaveLength(1)
    expect(result?.files[0]?.path).toBe('.cursor/rules/test-skill.mdc')
  })

  it('emits a single merged file for concatenating targets', () => {
    const [result] = compile([skill, makeSkill({ id: 'other', name: 'Other' })], {
      targets: ['universal'],
    })
    expect(result?.files).toHaveLength(1)
    expect(result?.files[0]?.strategy).toBe('merge-section')
  })

  it('honours a skill opting out of a target', () => {
    const restricted = makeSkill({ id: 'claude-only', targets: ['claude-code'] })
    const [result] = compile([restricted], { targets: ['cursor'] })
    expect(result?.files).toHaveLength(0)
    expect(result?.skipped).toContain('claude-only')
  })

  it('never sets alwaysApply on Cursor unless the skill asked for it', () => {
    // An always-applied rule is charged against every request; opting a user into that
    // silently is the behaviour that makes people distrust a tool.
    const [conditional] = compile([skill], { targets: ['cursor'] })
    expect(conditional?.files[0]?.contents).toContain('alwaysApply: false')

    const [always] = compile([makeSkill({ activation: { always: true } })], { targets: ['cursor'] })
    expect(always?.files[0]?.contents).toContain('alwaysApply: true')
  })

  it('drops examples from always-applied rules to keep the standing cost down', () => {
    const withExample = makeSkill({
      activation: { always: true },
      rules: [
        {
          id: 'test-skill/x',
          strength: 'must',
          statement: 'Do it.',
          evidence: { rationale: 'Reason.' },
          examples: { good: 'GOOD_MARKER', bad: 'BAD_MARKER', language: 'tsx' },
        },
      ],
    })
    const [result] = compile([withExample], { targets: ['cursor'] })
    expect(result?.files[0]?.contents).not.toContain('GOOD_MARKER')
  })

  it('orders rules with prohibitions first', () => {
    // Attention degrades over a long context, so the highest-consequence guidance belongs
    // where it is most likely to be applied.
    const mixed = makeSkill({
      rules: [
        { id: 'a', strength: 'may', statement: 'MAY_RULE' },
        { id: 'b', strength: 'must-not', statement: 'MUST_NOT_RULE' },
        { id: 'c', strength: 'should', statement: 'SHOULD_RULE' },
      ],
    })
    const [result] = compile([mixed], { targets: ['claude-code'] })
    const contents = result?.files[0]?.contents ?? ''
    expect(contents.indexOf('MUST_NOT_RULE')).toBeLessThan(contents.indexOf('SHOULD_RULE'))
    expect(contents.indexOf('SHOULD_RULE')).toBeLessThan(contents.indexOf('MAY_RULE'))
  })

  it('registers a server rather than writing instructions for the MCP target', () => {
    const [result] = compile([skill], { targets: ['mcp'] })
    expect(result?.files[0]?.path).toBe('.mcp.json')
    expect(result?.files[0]?.strategy).toBe('create-if-absent')
    expect(JSON.parse(result?.files[0]?.contents ?? '{}')).toHaveProperty('mcpServers.vishwakarma')
  })

  it('produces a plan describing every target', () => {
    const plan = planFor(compile([skill], { targets: ['claude-code', 'cursor'] }))
    expect(plan).toHaveLength(2)
    expect(plan[0]?.fileCount).toBeGreaterThan(0)
    expect(plan[0]?.notes).toBeTruthy()
  })
})

describe('merge safety', () => {
  const skill = makeSkill()
  const sharedFile = compile([skill], { targets: ['universal'] })[0]?.files[0]

  it('creates the file when absent', () => {
    const result = mergeFile(sharedFile as never, null)
    expect(result.action).toBe('created')
  })

  it('appends rather than prepends, leaving the author’s opening context in place', () => {
    const existing = '# My project\n\nAlways use tabs.\n'
    const result = mergeFile(sharedFile as never, existing)

    expect(result.action).toBe('appended-section')
    expect(result.contents.indexOf('My project')).toBeLessThan(result.contents.indexOf('vishwakarma:begin'))
    expect(result.contents).toContain('Always use tabs.')
  })

  it('is idempotent: merging twice changes nothing the second time', () => {
    const first = mergeFile(sharedFile as never, '# Mine\n')
    const second = mergeFile(sharedFile as never, first.contents)

    expect(second.action).toBe('unchanged')
    expect(second.contents).toBe(first.contents)
  })

  it('replaces only our section when content changes', () => {
    const existing = '# Mine\n\nMy rules.\n'
    const first = mergeFile(sharedFile as never, existing)

    const changed = { ...(sharedFile as never), contents: '<!-- vishwakarma:begin -->\nNEW\n<!-- vishwakarma:end -->' }
    const second = mergeFile(changed as never, first.contents)

    expect(second.action).toBe('replaced-section')
    expect(second.contents).toContain('My rules.')
    expect(second.contents).toContain('NEW')
    expect(second.contents).not.toContain('Frontend engineering guidance')
  })

  it('preserves content written after our section as well as before it', () => {
    const first = mergeFile(sharedFile as never, '# Top\n')
    const withTrailing = `${first.contents}\n## My own notes\n\nKeep me.\n`

    const second = mergeFile(sharedFile as never, withTrailing)
    expect(second.contents).toContain('# Top')
    expect(second.contents).toContain('Keep me.')
  })

  it('never touches a create-if-absent file that already exists', () => {
    const mcpFile = compile([skill], { targets: ['mcp'] })[0]?.files[0]
    const existing = '{"mcpServers":{"somethingElse":{}}}'
    const result = mergeFile(mcpFile as never, existing)

    expect(result.action).toBe('skipped-existing')
    expect(result.contents).toBe(existing)
  })

  it('reports unchanged for an identical replace, so the CLI can stay quiet', () => {
    const owned = compile([skill], { targets: ['claude-code'] })[0]?.files[0]
    const result = mergeFile(owned as never, owned?.contents ?? '')
    expect(result.action).toBe('unchanged')
  })
})

describe('section removal', () => {
  const sharedFile = compile([makeSkill()], { targets: ['universal'] })[0]?.files[0]

  it('removes our section and leaves the rest intact', () => {
    const merged = mergeFile(sharedFile as never, '# Mine\n\nMy rules.\n')
    const stripped = removeSection(merged.contents)

    expect(stripped).toContain('My rules.')
    expect(stripped).not.toContain('vishwakarma:begin')
  })

  it('returns null when nothing but our section remains, so the file can be deleted', () => {
    const created = mergeFile(sharedFile as never, null)
    expect(removeSection(created.contents)).toBeNull()
  })

  it('is a no-op on a file that was never touched', () => {
    expect(removeSection('# Untouched\n')).toBe('# Untouched\n')
  })
})

describe('context cost estimation', () => {
  const skills = [makeSkill(), makeSkill({ id: 'b' }), makeSkill({ id: 'c' })]

  it('reports zero standing cost for MCP, since nothing preloads', () => {
    const cost = estimateContextCost(skills, 'mcp')
    expect(cost.alwaysLoadedTokens).toBe(0)
    expect(cost.onDemandTokens).toBeGreaterThan(0)
  })

  it('charges the full body to Cline, which concatenates every rules file', () => {
    // Per-skill files do not imply on-demand loading here, and hiding that would mislead.
    const cost = estimateContextCost(skills, 'cline')
    expect(cost.alwaysLoadedTokens).toBeGreaterThan(0)
    expect(cost.onDemandTokens).toBe(0)
  })

  it('charges only descriptions to targets that load bodies on activation', () => {
    const cost = estimateContextCost(skills, 'claude-code')
    expect(cost.alwaysLoadedTokens).toBeLessThan(cost.onDemandTokens)
  })

  it('charges an always-on skill its full body even on an on-demand target', () => {
    const lazy = estimateContextCost([makeSkill()], 'claude-code')
    const eager = estimateContextCost([makeSkill({ activation: { always: true } })], 'claude-code')
    expect(eager.alwaysLoadedTokens).toBeGreaterThan(lazy.alwaysLoadedTokens)
  })
})

describe('adapter registry', () => {
  it('exposes a location and notes for every target', () => {
    for (const target of ['claude-code', 'cursor', 'windsurf', 'cline', 'mcp'] as const) {
      const adapter = getAdapter(target)
      expect(adapter.location).toBeTruthy()
      expect(adapter.notes.length).toBeGreaterThan(20)
    }
  })

  it('throws a useful error for an unknown target', () => {
    expect(() => getAdapter('nonsense' as never)).toThrow(/No adapter/)
  })
})
