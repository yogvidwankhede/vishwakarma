/**
 * Shared rendering.
 *
 * Every target ultimately wants Markdown with some frontmatter dialect wrapped around it.
 * The differences between them are real but shallow: which frontmatter keys are
 * recognised, whether globs live in frontmatter or in a separate config, whether the file
 * goes in a directory or is concatenated into one big instruction file, and how much
 * context the tool is willing to spend.
 *
 * So the body rendering lives here once, and each adapter is reduced to a description of
 * its container. That is the whole reason the compile-once-run-anywhere claim holds: if
 * every adapter re-rendered the content, they would drift, and the promise would quietly
 * become false.
 */

import type { SkillManifest, SkillRule, SkillCheck } from '@vishwakarma/skills'

export interface RenderOptions {
  /**
   * How much of the skill to include.
   *
   * `full` emits body, rules, and verification. `compact` drops rule rationales and
   * examples, which roughly halves the token cost. `summary` emits only the description
   * and summary, for targets that concatenate every rule into one always-loaded file and
   * therefore cannot afford depth.
   */
  detail?: 'full' | 'compact' | 'summary'
  /** Include the rules table. */
  includeRules?: boolean
  /** Include the verification checklist. */
  includeVerification?: boolean
  /** Include contrastive good/bad examples. */
  includeExamples?: boolean
  /** Heading level the rendered content starts at. */
  headingLevel?: number
  /** Note appended to the top of the file explaining that it is generated. */
  generatedBanner?: boolean
}

const STRENGTH_LABEL: Record<SkillRule['strength'], string> = {
  must: 'MUST',
  'must-not': 'MUST NOT',
  should: 'SHOULD',
  'should-not': 'SHOULD NOT',
  may: 'MAY',
}

/**
 * Order rules so the strongest come first.
 *
 * This is not cosmetic. Attention degrades over a long context, so a rule that appears
 * after two thousand tokens of guidance is followed less reliably than one near the top.
 * Putting the prohibitions first puts the highest-consequence guidance where it is most
 * likely to be applied.
 */
const STRENGTH_ORDER: Record<SkillRule['strength'], number> = {
  'must-not': 0,
  must: 1,
  'should-not': 2,
  should: 3,
  may: 4,
}

function heading(level: number, text: string): string {
  return `${'#'.repeat(Math.min(Math.max(level, 1), 6))} ${text}`
}

/** Shift the heading levels inside an authored Markdown body so it nests correctly. */
export function shiftHeadings(markdown: string, delta: number): string {
  if (delta === 0) return markdown

  // Only shift headings outside fenced code blocks, since a `#` inside a shell example is
  // a comment, not a heading, and rewriting it would corrupt the example.
  const lines = markdown.split('\n')
  let inFence = false
  return lines
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence
        return line
      }
      if (inFence) return line

      const match = /^(#{1,6})(\s+)/.exec(line)
      if (!match) return line
      const level = Math.min(Math.max((match[1] as string).length + delta, 1), 6)
      return line.replace(/^#{1,6}/, '#'.repeat(level))
    })
    .join('\n')
}

export function renderRules(rules: SkillRule[], options: RenderOptions = {}): string {
  if (rules.length === 0) return ''

  const { detail = 'full', includeExamples = true, headingLevel = 2 } = options
  const sorted = [...rules].sort(
    (a, b) => STRENGTH_ORDER[a.strength] - STRENGTH_ORDER[b.strength],
  )

  const parts: string[] = [heading(headingLevel, 'Rules'), '']

  if (detail === 'compact') {
    // A flat list, strongest first. Cheap enough to include in an always-on file.
    for (const rule of sorted) {
      parts.push(`- **${STRENGTH_LABEL[rule.strength]}** ${rule.statement}`)
    }
    parts.push('')
    return parts.join('\n')
  }

  for (const rule of sorted) {
    parts.push(`${heading(headingLevel + 1, `${STRENGTH_LABEL[rule.strength]} — ${rule.statement}`)}`)
    parts.push('')

    if (rule.evidence?.rationale) {
      parts.push(`*Why:* ${rule.evidence.rationale}`)
      parts.push('')
    }

    if (rule.evidence?.source || rule.evidence?.url) {
      const source = rule.evidence.url
        ? `[${rule.evidence.source ?? rule.evidence.url}](${rule.evidence.url})`
        : rule.evidence.source
      parts.push(`*Source:* ${source}`)
      parts.push('')
    }

    if (rule.exceptions?.length) {
      parts.push('*Exceptions:*')
      for (const exception of rule.exceptions) parts.push(`- ${exception}`)
      parts.push('')
    }

    if (includeExamples && rule.examples) {
      const language = rule.examples.language ?? ''
      if (rule.examples.bad) {
        parts.push('Incorrect:', '', `\`\`\`${language}`, rule.examples.bad, '```', '')
      }
      if (rule.examples.good) {
        parts.push('Correct:', '', `\`\`\`${language}`, rule.examples.good, '```', '')
      }
    }
  }

  return parts.join('\n')
}

export function renderVerification(checks: SkillCheck[], options: RenderOptions = {}): string {
  if (checks.length === 0) return ''
  const { headingLevel = 2 } = options

  const parts: string[] = [
    heading(headingLevel, 'Before reporting completion'),
    '',
    'Run these checks against your own output. Answer each question explicitly rather than',
    'assuming the answer, because the point of the exercise is to notice what you did not',
    'notice while building.',
    '',
  ]

  for (const check of checks) {
    const blocking = check.blocking ? ' (blocking)' : ''
    parts.push(`${heading(headingLevel + 1, `${check.description}${blocking}`)}`)
    parts.push('')

    if (check.kind === 'self-review' && check.questions?.length) {
      for (const question of check.questions) parts.push(`- ${question}`)
      parts.push('')
    } else if (check.kind === 'command' && check.command) {
      parts.push('```bash', check.command, '```', '')
    } else if (check.kind === 'contract') {
      parts.push(
        `Evaluate the output against the project Design Contract${check.contractSection && check.contractSection !== 'all' ? ` (${check.contractSection} section)` : ''}.`,
        '',
        'Run `vishwakarma audit` if the project has the CLI available.',
        '',
      )
    }
  }

  return parts.join('\n')
}

/**
 * Render a skill's Markdown body, without any frontmatter.
 *
 * The `headingLevel` handling matters more than it looks like it should. Some targets
 * concatenate many skills into one document, where every skill's `#` heading would produce
 * a document with fifteen top-level sections and no structure. Shifting them keeps the
 * combined file navigable.
 */
export function renderBody(manifest: SkillManifest, options: RenderOptions = {}): string {
  const {
    detail = 'full',
    includeRules = true,
    includeVerification = true,
    headingLevel = 1,
  } = options

  if (detail === 'summary') {
    return `${heading(headingLevel, manifest.name)}\n\n${manifest.content.summary}\n`
  }

  const parts: string[] = []

  // The authored body starts at h1 by convention; shift it to sit under the requested level.
  const body = shiftHeadings(manifest.content.body.trim(), headingLevel - 1)
  parts.push(body, '')

  if (includeRules && manifest.rules?.length) {
    parts.push(renderRules(manifest.rules, { ...options, headingLevel: headingLevel + 1 }))
  }

  if (includeVerification && manifest.verification?.length && detail === 'full') {
    parts.push(renderVerification(manifest.verification, { ...options, headingLevel: headingLevel + 1 }))
  }

  if (manifest.content.references?.length && detail === 'full') {
    parts.push(heading(headingLevel + 1, 'Further reference'), '')
    parts.push(
      'These are not loaded by default. Read one only when its question is the question you',
      'currently have.',
      '',
    )
    for (const reference of manifest.content.references) {
      parts.push(`- \`references/${reference.id}.md\` — ${reference.answers}`)
    }
    parts.push('')
  }

  return parts.join('\n')
}

/** Serialise a frontmatter object to YAML, handling the small subset of shapes we emit. */
export function toFrontmatter(fields: Record<string, unknown>): string {
  const lines: string[] = ['---']

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue

    if (Array.isArray(value)) {
      if (value.length === 0) continue
      // Inline flow style stays readable for the short lists we emit, and several tools
      // parse it more reliably than block style.
      lines.push(`${key}: [${value.map((entry) => quoteYaml(String(entry))).join(', ')}]`)
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`${key}: ${value}`)
    } else {
      lines.push(`${key}: ${quoteYaml(String(value))}`)
    }
  }

  lines.push('---')
  return lines.join('\n')
}

/**
 * Quote a YAML scalar when it would otherwise be misparsed.
 *
 * Descriptions routinely contain colons ("Use when: building a page"), which turn an
 * unquoted scalar into a mapping and break the parse. This is the single most common way
 * a generated agent config file silently fails to load.
 */
function quoteYaml(value: string): string {
  const needsQuoting =
    /[:#\[\]{}&*!|>'"%@`,]/.test(value) ||
    /^\s|\s$/.test(value) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(value) ||
    /^[\d.+-]/.test(value)

  if (!needsQuoting) return value
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`
}

/** The banner explaining that a file is generated and must not be hand-edited. */
export function generatedBanner(comment: 'html' | 'hash' | 'none' = 'html'): string {
  const text = [
    'Generated by Vishwakarma. Do not edit this file directly.',
    'Edit the source skill and run `vishwakarma sync` to regenerate.',
  ]
  if (comment === 'none') return text.join(' ')
  if (comment === 'hash') return text.map((line) => `# ${line}`).join('\n')
  return `<!--\n  ${text.join('\n  ')}\n-->`
}
