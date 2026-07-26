// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Agent target adapters.
 *
 * Each adapter answers three questions about one coding agent: where do its instruction
 * files live, what frontmatter dialect does it understand, and how much context can it
 * afford. Everything else is shared.
 *
 * A note on how these were built, because it affects how to maintain them. Agent config
 * formats change more often than library APIs do, and they change without deprecation
 * cycles. Each adapter therefore states its assumptions explicitly in a `notes` field
 * rather than encoding them silently, so that when a format shifts the fix is obvious and
 * local. Where an adapter is uncertain about a detail, it says so rather than guessing
 * confidently — a wrong path fails silently, which is the worst failure mode available.
 */

import type { AgentTarget, SkillManifest } from '@vishwakarma/skills'
import { generatedBanner, renderBody, renderRules, toFrontmatter } from './render.js'

export interface EmittedFile {
  /** Path relative to the project root. */
  path: string
  contents: string
  /**
   * How to handle an existing file at this path. `replace` is safe for files we own
   * outright; `merge-section` is for shared files like AGENTS.md where a human may have
   * written their own content that must survive.
   */
  strategy: 'replace' | 'merge-section' | 'create-if-absent'
}

export interface AdapterContext {
  /** Directory to install into, relative to the project root. Empty means the root. */
  root?: string
  /** Install into the user's home configuration rather than the project. */
  scope?: 'project' | 'user'
  /** Marker used to delimit our section inside a shared file. */
  sectionMarker?: string
}

export interface Adapter {
  target: AgentTarget
  /** Display name of the agent. */
  label: string
  /** Where this agent looks for instructions, for CLI output and documentation. */
  location: string
  /** Whether the agent supports per-skill files, or needs everything concatenated. */
  model: 'per-skill-directory' | 'per-skill-file' | 'single-file'
  /** Notes on format assumptions, surfaced by `vishwakarma doctor`. */
  notes: string
  emit(skills: SkillManifest[], context?: AdapterContext): EmittedFile[]
}

const DEFAULT_MARKER = 'vishwakarma'

/**
 * Wrap content in delimiters so a later sync can replace exactly our section and leave
 * everything a human wrote intact.
 *
 * Without this, installing into a shared file like AGENTS.md means either clobbering the
 * user's own instructions or refusing to write at all. Both are bad answers to a very
 * common situation.
 */
function delimitedSection(contents: string, marker = DEFAULT_MARKER): string {
  return [
    `<!-- ${marker}:begin — generated, do not edit between these markers -->`,
    contents.trim(),
    `<!-- ${marker}:end -->`,
  ].join('\n')
}

/* -------------------------------------------------------------------------- */
/* Claude Code                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Claude Code reads Agent Skills from a skills directory, one directory per skill, each
 * containing a `SKILL.md` whose frontmatter carries at minimum a name and a description.
 * Supporting files sit alongside and are read on demand, which maps cleanly onto our
 * reference tier — so this is the target that loses the least in translation.
 */
export const claudeCodeAdapter: Adapter = {
  target: 'claude-code',
  label: 'Claude Code',
  location: '.claude/skills/<skill-id>/SKILL.md',
  model: 'per-skill-directory',
  notes:
    'Uses the per-skill directory layout with on-demand supporting files, which matches our reference tier exactly. Frontmatter carries name, description, and an optional tool allowlist.',
  emit(skills, context = {}) {
    const base = context.scope === 'user' ? '~/.claude/skills' : '.claude/skills'
    const root = context.root ? `${context.root}/${base}` : base
    const files: EmittedFile[] = []

    for (const skill of skills) {
      const override = skill.overrides?.['claude-code']

      const frontmatter = toFrontmatter({
        name: skill.id,
        description: override?.description ?? skill.description,
        ...(skill.tools?.length ? { 'allowed-tools': skill.tools } : {}),
        ...(skill.license ? { license: skill.license } : {}),
        version: skill.version,
      })

      files.push({
        path: `${root}/${skill.id}/SKILL.md`,
        strategy: 'replace',
        contents: `${frontmatter}\n\n${generatedBanner()}\n\n${override?.body ?? renderBody(skill, { detail: 'full' })}`,
      })

      // References become sibling files the agent can choose to read, which is the whole
      // point of progressive disclosure: the cost is paid only when the question arises.
      for (const reference of skill.content.references ?? []) {
        if (!reference.content) continue
        files.push({
          path: `${root}/${skill.id}/references/${reference.id}.md`,
          strategy: 'replace',
          contents: `${reference.content.trim()}\n`,
        })
      }
    }

    return files
  },
}

/* -------------------------------------------------------------------------- */
/* Cursor                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Cursor reads `.mdc` rule files from `.cursor/rules`. The frontmatter drives *when* a
 * rule applies: `alwaysApply` for unconditional rules, `globs` for file-triggered ones,
 * and a `description` that the agent uses to decide whether to pull the rule in itself.
 *
 * We map our activation model onto those three, and deliberately never set `alwaysApply`
 * unless the skill asked for it — an always-applied rule is charged against context on
 * every request, and a handful of them will crowd out the user's actual code.
 */
export const cursorAdapter: Adapter = {
  target: 'cursor',
  label: 'Cursor',
  location: '.cursor/rules/<skill-id>.mdc',
  model: 'per-skill-file',
  notes:
    'Rules are single .mdc files with no supporting-file mechanism, so reference material is inlined at compact detail rather than being available on demand.',
  emit(skills, context = {}) {
    const base = '.cursor/rules'
    const root = context.root ? `${context.root}/${base}` : base

    return skills.map((skill) => {
      const override = skill.overrides?.cursor
      const alwaysApply = override?.alwaysApply ?? skill.activation.always ?? false

      const frontmatter = toFrontmatter({
        description: override?.description ?? skill.description,
        ...(skill.activation.globs?.length ? { globs: skill.activation.globs } : {}),
        alwaysApply,
      })

      // Without a supporting-file mechanism, an always-applied rule must stay small or it
      // taxes every single request.
      const detail = alwaysApply ? 'compact' : 'full'

      return {
        path: `${root}/${skill.id}.mdc`,
        strategy: 'replace' as const,
        contents: `${frontmatter}\n\n${generatedBanner()}\n\n${renderBody(skill, { detail, includeExamples: !alwaysApply })}`,
      }
    })
  },
}

/* -------------------------------------------------------------------------- */
/* Windsurf                                                                    */
/* -------------------------------------------------------------------------- */

export const windsurfAdapter: Adapter = {
  target: 'windsurf',
  label: 'Windsurf',
  location: '.windsurf/rules/<skill-id>.md',
  model: 'per-skill-file',
  notes:
    'Rule files are size-constrained in practice, so content is emitted at compact detail with examples dropped from always-on rules.',
  emit(skills, context = {}) {
    const base = '.windsurf/rules'
    const root = context.root ? `${context.root}/${base}` : base

    return skills.map((skill) => {
      const frontmatter = toFrontmatter({
        description: skill.description,
        ...(skill.activation.globs?.length ? { globs: skill.activation.globs } : {}),
        trigger: skill.activation.always
          ? 'always_on'
          : skill.activation.globs?.length
            ? 'glob'
            : 'model_decision',
      })

      return {
        path: `${root}/${skill.id}.md`,
        strategy: 'replace' as const,
        contents: `${frontmatter}\n\n${generatedBanner()}\n\n${renderBody(skill, { detail: 'compact' })}`,
      }
    })
  },
}

/* -------------------------------------------------------------------------- */
/* Cline and Roo Code                                                          */
/* -------------------------------------------------------------------------- */

function directoryRulesAdapter(
  target: AgentTarget,
  label: string,
  directory: string,
  notes: string,
): Adapter {
  return {
    target,
    label,
    location: `${directory}/<skill-id>.md`,
    model: 'per-skill-file',
    notes,
    emit(skills, context = {}) {
      const root = context.root ? `${context.root}/${directory}` : directory
      return skills.map((skill) => ({
        path: `${root}/${skill.id}.md`,
        strategy: 'replace' as const,
        contents: `${generatedBanner()}\n\n${renderBody(skill, { detail: 'full' })}`,
      }))
    },
  }
}

export const clineAdapter = directoryRulesAdapter(
  'cline',
  'Cline',
  '.clinerules',
  'Every file in the rules directory is concatenated into the system prompt, so all installed skills are always in context. Install a focused subset rather than the full catalog.',
)

export const rooCodeAdapter = directoryRulesAdapter(
  'roo-code',
  'Roo Code',
  '.roo/rules',
  'Rules apply across modes unless placed in a mode-specific directory. Files are loaded together, so keep the installed set small.',
)

export const continueAdapter = directoryRulesAdapter(
  'continue',
  'Continue',
  '.continue/rules',
  'Rules are Markdown files with optional frontmatter, loaded from the project rules directory.',
)

/* -------------------------------------------------------------------------- */
/* Single-file targets                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Render many skills into one instruction file.
 *
 * This is the constrained case, and the constraint drives the design. A single file is
 * loaded in its entirety on every request, so including full bodies for fifteen skills
 * would produce a fifty-thousand-token preamble that degrades the agent rather than
 * improving it. We therefore emit an index of what is available plus the rules only, and
 * point at the source for depth.
 */
function renderSingleFile(skills: SkillManifest[], title: string): string {
  const parts: string[] = []

  parts.push(`# ${title}`, '')
  parts.push(
    'This project uses Vishwakarma, a design-intelligence toolkit. The guidance below is',
    'compiled from the installed skill set. Follow it when writing or reviewing any user',
    'interface code in this repository.',
    '',
  )

  parts.push('## Applicable skills', '')
  for (const skill of skills) {
    parts.push(`- **${skill.name}** — ${skill.description}`)
  }
  parts.push('')

  // Always-on skills get their body; the rest contribute rules only. Spending the whole
  // budget on the skills the author marked as unconditional is the correct allocation.
  const always = skills.filter((skill) => skill.activation.always)
  const conditional = skills.filter((skill) => !skill.activation.always)

  for (const skill of always) {
    parts.push(renderBody(skill, { detail: 'full', headingLevel: 2 }), '')
  }

  if (conditional.length > 0) {
    parts.push('## Rules', '')
    parts.push(
      'These are the normative rules from every installed skill, grouped by skill. Where a',
      'rule and a project convention conflict, the project convention wins — but say so',
      'explicitly rather than silently ignoring the rule.',
      '',
    )
    for (const skill of conditional) {
      if (!skill.rules?.length) continue
      parts.push(`### ${skill.name}`, '')
      parts.push(renderRules(skill.rules, { detail: 'compact', headingLevel: 4 }))
    }
  }

  parts.push('## Before reporting completion', '')
  parts.push(
    'Run the self-review checks for any skill that applied to your work. If the project has',
    'the Vishwakarma CLI installed, run `vishwakarma audit` and resolve every error-level',
    'finding before declaring the task done.',
    '',
  )

  return parts.join('\n')
}

function singleFileAdapter(
  target: AgentTarget,
  label: string,
  filePath: string,
  title: string,
  notes: string,
): Adapter {
  return {
    target,
    label,
    location: filePath,
    model: 'single-file',
    notes,
    emit(skills, context = {}) {
      const path = context.root ? `${context.root}/${filePath}` : filePath
      return [
        {
          path,
          // Shared with the user's own instructions, so we own only our delimited section.
          strategy: 'merge-section',
          contents: delimitedSection(
            renderSingleFile(skills, title),
            context.sectionMarker ?? DEFAULT_MARKER,
          ),
        },
      ]
    },
  }
}

export const universalAdapter = singleFileAdapter(
  'universal',
  'AGENTS.md (universal)',
  'AGENTS.md',
  'Frontend engineering guidance',
  'The AGENTS.md convention is read by a growing number of tools, and is the correct fallback for any agent without a dedicated adapter. Content is merged into a delimited section so hand-written instructions survive a resync.',
)

export const codexAdapter = singleFileAdapter(
  'codex',
  'OpenAI Codex',
  'AGENTS.md',
  'Frontend engineering guidance',
  'Codex reads AGENTS.md. This adapter writes the same file as the universal target, so installing both is harmless rather than duplicative.',
)

export const geminiAdapter = singleFileAdapter(
  'gemini-cli',
  'Gemini CLI',
  'GEMINI.md',
  'Frontend engineering guidance',
  'Gemini CLI reads a project context file at the repository root and merges it with any user-level file.',
)

export const copilotAdapter = singleFileAdapter(
  'copilot',
  'GitHub Copilot',
  '.github/copilot-instructions.md',
  'Frontend engineering guidance',
  'Copilot injects this file into every chat request in the repository, so it must stay small. Emitted at rules-only detail.',
)

export const zedAdapter = singleFileAdapter(
  'zed',
  'Zed',
  '.rules',
  'Frontend engineering guidance',
  'Zed reads a plain rules file from the worktree root.',
)

export const aiderAdapter = singleFileAdapter(
  'aider',
  'Aider',
  'CONVENTIONS.md',
  'Frontend engineering conventions',
  'Aider loads a conventions file when it is added to the chat, typically via configuration. Add it to your aider config to have it loaded automatically.',
)

/* -------------------------------------------------------------------------- */
/* MCP                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The MCP target does not write instruction files at all. It writes the client
 * configuration that points at our server, and the server then serves skills as MCP
 * resources on demand.
 *
 * This is the most efficient integration of the lot, because nothing is loaded into
 * context until the agent asks for it — the progressive disclosure is enforced by the
 * protocol rather than requested politely in prose.
 */
export const mcpAdapter: Adapter = {
  target: 'mcp',
  label: 'Model Context Protocol',
  location: '.mcp.json',
  model: 'single-file',
  notes:
    'Registers the Vishwakarma MCP server rather than emitting instruction files. Skills, tokens, and audits are then fetched on demand, so nothing occupies context until it is needed.',
  emit(_skills, context = {}) {
    const path = context.root ? `${context.root}/.mcp.json` : '.mcp.json'
    const config = {
      mcpServers: {
        vishwakarma: {
          command: 'npx',
          args: ['-y', '@vishwakarma/mcp'],
          env: {},
        },
      },
    }
    return [
      {
        path,
        strategy: 'create-if-absent',
        contents: `${JSON.stringify(config, null, 2)}\n`,
      },
    ]
  },
}

/* -------------------------------------------------------------------------- */
/* Registry                                                                    */
/* -------------------------------------------------------------------------- */

export const ADAPTERS: Record<AgentTarget, Adapter> = {
  'claude-code': claudeCodeAdapter,
  cursor: cursorAdapter,
  windsurf: windsurfAdapter,
  cline: clineAdapter,
  'roo-code': rooCodeAdapter,
  continue: continueAdapter,
  codex: codexAdapter,
  'gemini-cli': geminiAdapter,
  copilot: copilotAdapter,
  zed: zedAdapter,
  aider: aiderAdapter,
  universal: universalAdapter,
  mcp: mcpAdapter,
}

export function getAdapter(target: AgentTarget): Adapter {
  const adapter = ADAPTERS[target]
  if (!adapter) throw new Error(`No adapter registered for target "${target}".`)
  return adapter
}

export const ADAPTER_LIST: Adapter[] = Object.values(ADAPTERS)
