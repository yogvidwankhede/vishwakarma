/**
 * Compilation and safe file merging.
 *
 * The interesting problem here is not generating content — that is
 * {@link renderBody}'s job — but writing it into a repository that already contains a
 * human's own work without destroying it.
 *
 * Three write strategies cover every case. `replace` is for files we own outright, in
 * directories we created. `create-if-absent` is for configuration we seed but never
 * govern. `merge-section` is the interesting one: it rewrites only the region between our
 * markers, leaving everything else exactly as the author left it, including their edits
 * from five minutes ago.
 *
 * Getting the merge wrong is the failure that makes people uninstall a tool and never
 * come back, so it is implemented conservatively and tested directly.
 */

import type { AgentTarget, SkillManifest } from '@vishwakarma/skills'
import { type Adapter, type AdapterContext, type EmittedFile, getAdapter } from './targets.js'

export interface CompileOptions extends AdapterContext {
  /** Targets to compile for. Defaults to every target the skills allow. */
  targets?: AgentTarget[]
}

export interface CompileResult {
  target: AgentTarget
  adapter: Adapter
  files: EmittedFile[]
  /** Skills excluded because they opted out of this target. */
  skipped: string[]
}

/**
 * Compile a skill set for one or more targets.
 *
 * A skill can restrict itself to particular targets via its `targets` field, which is how
 * a skill that only makes sense with a supporting-file mechanism avoids being flattened
 * into a single-file agent where it would be useless.
 */
export function compile(skills: SkillManifest[], options: CompileOptions = {}): CompileResult[] {
  const { targets, ...context } = options

  const resolvedTargets =
    targets ??
    Array.from(
      new Set(skills.flatMap((skill) => skill.targets ?? [])),
    ).filter((target): target is AgentTarget => Boolean(target))

  const effectiveTargets = resolvedTargets.length > 0 ? resolvedTargets : (['claude-code'] as AgentTarget[])

  return effectiveTargets.map((target) => {
    const adapter = getAdapter(target)

    const applicable = skills.filter((skill) => !skill.targets || skill.targets.includes(target))
    const skipped = skills.filter((skill) => skill.targets && !skill.targets.includes(target)).map((s) => s.id)

    return {
      target,
      adapter,
      files: adapter.emit(applicable, context),
      skipped,
    }
  })
}

/* -------------------------------------------------------------------------- */
/* Merging                                                                     */
/* -------------------------------------------------------------------------- */

const DEFAULT_MARKER = 'vishwakarma'

function markers(marker: string): { begin: RegExp; beginLiteral: string; endLiteral: string } {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return {
    begin: new RegExp(
      `<!--\\s*${escaped}:begin[\\s\\S]*?-->[\\s\\S]*?<!--\\s*${escaped}:end\\s*-->`,
      'g',
    ),
    beginLiteral: `<!-- ${marker}:begin`,
    endLiteral: `<!-- ${marker}:end -->`,
  }
}

export interface MergeResult {
  contents: string
  /** What happened, for reporting to the user. */
  action: 'created' | 'replaced-section' | 'appended-section' | 'unchanged' | 'skipped-existing'
}

/**
 * Merge generated content into an existing file according to a strategy.
 *
 * `existing` is null when the file does not yet exist. Returning the action rather than
 * just the content lets the CLI tell the user precisely what it did to their repository,
 * which is the difference between a tool that feels safe and one that does not.
 */
export function mergeFile(file: EmittedFile, existing: string | null, marker = DEFAULT_MARKER): MergeResult {
  if (existing === null) {
    return { contents: file.contents, action: 'created' }
  }

  switch (file.strategy) {
    case 'create-if-absent':
      return { contents: existing, action: 'skipped-existing' }

    case 'replace':
      return existing === file.contents
        ? { contents: existing, action: 'unchanged' }
        : { contents: file.contents, action: 'replaced-section' }

    case 'merge-section': {
      const { begin } = markers(marker)
      const hasSection = begin.test(existing)
      // A /g regex carries state between calls, so reset before reusing it.
      begin.lastIndex = 0

      if (hasSection) {
        const replaced = existing.replace(begin, () => file.contents.trim())
        return replaced === existing
          ? { contents: existing, action: 'unchanged' }
          : { contents: replaced, action: 'replaced-section' }
      }

      // No section yet: append rather than prepend. The top of a hand-written instruction
      // file usually carries the author's most important context, and displacing it would
      // change the emphasis of a document we do not own.
      const separator = existing.endsWith('\n\n') ? '' : existing.endsWith('\n') ? '\n' : '\n\n'
      return {
        contents: `${existing}${separator}${file.contents.trim()}\n`,
        action: 'appended-section',
      }
    }

    default:
      return { contents: file.contents, action: 'replaced-section' }
  }
}

/**
 * Remove our section from a file, for uninstalling.
 *
 * Returns null when the resulting file would contain nothing but whitespace, signalling
 * to the caller that the file itself should be deleted rather than left as an empty
 * artefact.
 */
export function removeSection(existing: string, marker = DEFAULT_MARKER): string | null {
  const { begin } = markers(marker)
  const stripped = existing.replace(begin, '').replace(/\n{3,}/g, '\n\n').trim()
  return stripped.length === 0 ? null : `${stripped}\n`
}

/* -------------------------------------------------------------------------- */
/* Reporting                                                                   */
/* -------------------------------------------------------------------------- */

export interface CompilePlan {
  target: AgentTarget
  label: string
  location: string
  fileCount: number
  paths: string[]
  notes: string
  skipped: string[]
}

/** Summarise what a compile would do, for a dry run. */
export function planFor(results: CompileResult[]): CompilePlan[] {
  return results.map((result) => ({
    target: result.target,
    label: result.adapter.label,
    location: result.adapter.location,
    fileCount: result.files.length,
    paths: result.files.map((file) => file.path),
    notes: result.adapter.notes,
    skipped: result.skipped,
  }))
}

/**
 * Estimate the standing context cost of an installation, per target.
 *
 * Worth surfacing to users, because the honest answer is sometimes "installing all
 * eighteen skills into this agent will consume a meaningful share of every request, and
 * you should pick six". A tool that only reports what it installed, and never what that
 * costs, is not giving the user enough to make that decision.
 */
export function estimateContextCost(
  skills: SkillManifest[],
  target: AgentTarget,
): { alwaysLoadedTokens: number; onDemandTokens: number; note: string } {
  const adapter = getAdapter(target)
  const estimate = (text: string): number => Math.ceil(text.length / 3.6)

  const bodyOf = (skill: SkillManifest): number =>
    estimate(skill.content.body) +
    (skill.rules ?? []).reduce((sum, rule) => sum + estimate(rule.statement), 0)

  if (adapter.model === 'single-file' && target !== 'mcp') {
    // Everything in a single file is loaded on every request.
    const always = skills.reduce(
      (sum, skill) =>
        sum +
        estimate(skill.description) +
        (skill.activation.always ? bodyOf(skill) : (skill.rules ?? []).reduce((s, r) => s + estimate(r.statement), 0)),
      0,
    )
    return {
      alwaysLoadedTokens: always,
      onDemandTokens: 0,
      note: 'This agent loads the whole instruction file on every request, so the entire cost is paid every time.',
    }
  }

  if (target === 'mcp') {
    return {
      alwaysLoadedTokens: 0,
      onDemandTokens: skills.reduce((sum, skill) => sum + bodyOf(skill), 0),
      note: 'Nothing is loaded until the agent requests it, so the standing cost is effectively zero.',
    }
  }

  if (adapter.model === 'per-skill-file' && target === 'cline') {
    // Cline concatenates every rules file, so per-skill does not mean on-demand here.
    const always = skills.reduce((sum, skill) => sum + bodyOf(skill), 0)
    return {
      alwaysLoadedTokens: always,
      onDemandTokens: 0,
      note: 'Every file in the rules directory is concatenated into the system prompt, so per-skill files do not reduce the standing cost.',
    }
  }

  const always = skills.reduce(
    (sum, skill) => sum + estimate(skill.description) + (skill.activation.always ? bodyOf(skill) : 0),
    0,
  )
  const onDemand = skills.reduce((sum, skill) => sum + (skill.activation.always ? 0 : bodyOf(skill)), 0)

  return {
    alwaysLoadedTokens: always,
    onDemandTokens: onDemand,
    note: 'Only descriptions are always loaded; bodies are pulled in when a skill activates.',
  }
}
