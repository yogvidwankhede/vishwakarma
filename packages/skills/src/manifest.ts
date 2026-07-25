/**
 * The Vishwakarma Skill Manifest (VSM).
 *
 * Every AI coding agent has invented its own way to be given standing instructions.
 * One reads Markdown files with YAML frontmatter from a `skills` directory. Another reads
 * `.mdc` files with a different frontmatter dialect from a `rules` directory. A third
 * reads one big Markdown file at the repository root. A fourth reads a JSON config. They
 * all express roughly the same thing, and none of them can read each other's.
 *
 * The result is that anyone publishing agent instructions maintains N copies of the same
 * knowledge and lets N-1 of them rot.
 *
 * VSM is the fix: one authored source of truth, compiled to every target's native format.
 * The format is a deliberate *superset* of the most constrained target rather than a
 * lowest common denominator, so nothing is lost in translation and each adapter's job is
 * subtraction rather than invention.
 *
 * Three design decisions are worth stating up front, because they are what make this
 * different from "a folder of Markdown files".
 *
 * First, **tiering**. A skill declares its content in layers with explicit token budgets.
 * An agent loads the summary always, the body when the skill is relevant, and the deep
 * references only on demand. Context is the scarcest resource an agent has, and a skill
 * that spends 8,000 tokens explaining animation to an agent writing a database migration
 * has made the agent worse, not better.
 *
 * Second, **evidence**. Every normative rule can carry a citation and a rationale. Agents
 * follow rules more reliably when they understand the mechanism behind them, and — more
 * importantly — a rule with a stated rationale can be correctly *overridden* when the
 * rationale does not apply. A rule without one can only be obeyed or ignored.
 *
 * Third, **verifiability**. A skill can ship checks that machine-verify its own advice.
 * A skill that says "use the spacing scale" and also ships the checker that proves you
 * did is categorically more useful than one that only asks nicely.
 */

/* -------------------------------------------------------------------------- */
/* Targets                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Agents we compile to.
 *
 * `universal` emits the AGENTS.md convention, which an increasing number of tools read
 * and which is the correct fallback for anything not named here.
 */
export type AgentTarget =
  | 'claude-code'
  | 'cursor'
  | 'windsurf'
  | 'cline'
  | 'roo-code'
  | 'codex'
  | 'gemini-cli'
  | 'copilot'
  | 'continue'
  | 'zed'
  | 'aider'
  | 'universal'
  | 'mcp'

export const ALL_TARGETS: AgentTarget[] = [
  'claude-code',
  'cursor',
  'windsurf',
  'cline',
  'roo-code',
  'codex',
  'gemini-cli',
  'copilot',
  'continue',
  'zed',
  'aider',
  'universal',
  'mcp',
]

/* -------------------------------------------------------------------------- */
/* Activation                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * When a skill should come into play.
 *
 * `always` is expensive and should be rare — it spends context on every single turn.
 * `glob` and `intent` are how a well-behaved skill stays cheap: it costs nothing until
 * the agent touches a matching file or forms a matching intention.
 */
export interface Activation {
  /**
   * Load unconditionally. Reserve this for skills that define project-wide invariants,
   * and keep them under a few hundred tokens.
   */
  always?: boolean
  /** Load when the agent reads or writes a file matching any of these globs. */
  globs?: string[]
  /**
   * Natural-language descriptions of situations where this skill applies. Agents that
   * select skills semantically match against these, so write them as the *user's* phrasing
   * of the problem, not as your internal taxonomy.
   */
  intents?: string[]
  /** Literal trigger phrases, for agents that match on keywords rather than meaning. */
  keywords?: string[]
  /** Load only when another skill explicitly requests it. */
  onDemandOnly?: boolean
  /** Skills whose activation implies this one should load too. */
  requires?: string[]
  /** Skills that should never load alongside this one, e.g. two conflicting style guides. */
  conflictsWith?: string[]
}

/* -------------------------------------------------------------------------- */
/* Rules                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Normative strength, borrowed from the vocabulary standards bodies use because it is
 * unambiguous and models are well-calibrated to it.
 */
export type RuleStrength = 'must' | 'must-not' | 'should' | 'should-not' | 'may'

export interface Evidence {
  /** Why this rule is true. The mechanism, not a restatement of the rule. */
  rationale: string
  /** Where the claim comes from — a spec section, a study, a measurement. */
  source?: string
  url?: string
  /** How confident we are, so an agent can weigh conflicting guidance. */
  confidence?: 'established' | 'strong' | 'contested' | 'opinion'
}

export interface SkillRule {
  /** Stable id, namespaced by skill, e.g. `motion/exit-faster-than-enter`. */
  id: string
  strength: RuleStrength
  /** The rule itself, stated in one sentence that can be checked against output. */
  statement: string
  evidence?: Evidence
  /** Conditions under which the rule legitimately does not apply. */
  exceptions?: string[]
  /**
   * A correct example and an incorrect one. Contrastive pairs teach models far more
   * efficiently than either alone, because the delta isolates the actual lesson.
   */
  examples?: { good?: string; bad?: string; language?: string }
  /** Identifier of a check in `verification` that proves compliance. */
  verifiedBy?: string
}

/* -------------------------------------------------------------------------- */
/* Content tiers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Progressive disclosure.
 *
 * The token budgets are advisory but enforced by the compiler, which warns when a tier
 * overruns. This exists because the failure mode of skill authoring is always the same:
 * the author knows a lot, writes all of it, and produces something no agent can afford to
 * load.
 */
export interface SkillContent {
  /**
   * One or two sentences. Always loaded. This is what an agent reads to decide whether
   * the rest is worth loading, so it must describe *when to use this*, not *what this is*.
   * Budget: ~60 tokens.
   */
  summary: string

  /**
   * The working knowledge. Loaded when the skill activates. This should be everything
   * needed to do the job correctly in the common case.
   * Budget: ~2,000 tokens.
   */
  body: string

  /**
   * Deep material loaded only on explicit request: edge cases, long examples, API tables,
   * background theory. Each entry becomes a separate file the agent can choose to read.
   */
  references?: Array<{
    id: string
    title: string
    /** Relative path to a Markdown file, or inline content. */
    path?: string
    content?: string
    /** What question this reference answers, so the agent knows when to reach for it. */
    answers: string
  }>

  /** Runnable assets the skill ships: scripts, templates, schemas. */
  assets?: Array<{
    path: string
    description: string
    executable?: boolean
  }>
}

/* -------------------------------------------------------------------------- */
/* Verification                                                                */
/* -------------------------------------------------------------------------- */

/**
 * A self-check the skill ships.
 *
 * The `self-review` kind is the one that matters most in practice. It gives the agent a
 * short checklist to run against its own output before declaring done, which catches a
 * surprising share of errors for almost no cost — models are much better at recognising a
 * violation than at avoiding it in the first place.
 */
export interface SkillCheck {
  id: string
  kind: 'command' | 'self-review' | 'contract'
  description: string
  /** For `command`: a shell command whose non-zero exit means failure. */
  command?: string
  /** For `self-review`: questions the agent must answer about its own output. */
  questions?: string[]
  /** For `contract`: the id of a Design Contract section to evaluate. */
  contractSection?: string
  /** Whether failing this check should block the agent from reporting success. */
  blocking?: boolean
}

/* -------------------------------------------------------------------------- */
/* The manifest                                                                */
/* -------------------------------------------------------------------------- */

export interface SkillManifest {
  /** Manifest schema version. */
  vsm: '1.0'

  /** Unique, kebab-case, stable. Becomes the directory name in every compiled target. */
  id: string

  /** Human-readable name. */
  name: string

  /**
   * One sentence describing when to use this skill. Several agents surface exactly this
   * string when deciding whether to activate, which makes it the single highest-leverage
   * field in the manifest. Write it as a trigger condition, not a description.
   */
  description: string

  version: string
  license?: string
  authors?: string[]
  homepage?: string

  /** Grouping for docs and CLI listings. */
  category:
    | 'foundation'
    | 'ui'
    | 'ux'
    | 'motion'
    | 'layout'
    | 'accessibility'
    | 'performance'
    | 'architecture'
    | 'content'
    | 'workflow'
    | 'integration'

  tags?: string[]

  activation: Activation
  content: SkillContent

  /** Normative rules, which adapters render as a checklist section. */
  rules?: SkillRule[]

  /** Checks the agent should run before claiming the task is done. */
  verification?: SkillCheck[]

  /** Restrict which targets this skill compiles to. Defaults to all. */
  targets?: AgentTarget[]

  /** Per-target overrides, for the rare case where one agent needs different phrasing. */
  overrides?: Partial<Record<AgentTarget, { description?: string; body?: string; alwaysApply?: boolean }>>

  /**
   * Tools this skill expects the agent to have. Adapters that support tool restriction
   * narrow the skill's permissions to this list, which is both safer and a useful hint.
   */
  tools?: string[]

  /** Other skills this composes with, for docs and for suggesting bundles. */
  relatedSkills?: string[]

  /** Free-form metadata that adapters may pass through. */
  meta?: Record<string, unknown>
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export interface ValidationIssue {
  path: string
  message: string
  severity: 'error' | 'warning'
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?$/i

/**
 * Rough token estimate.
 *
 * Character-count division is crude, but it is dependency-free, deterministic, and
 * accurate enough for a budget warning. We use 3.6 characters per token rather than the
 * commonly-cited 4 because technical prose with code, punctuation, and identifiers
 * tokenises more densely than ordinary English, and under-estimating a budget is the
 * failure that actually hurts.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.6)
}

export const TIER_BUDGETS = {
  description: 40,
  summary: 80,
  body: 2200,
  reference: 6000,
} as const

/**
 * Validate a manifest.
 *
 * Returns issues rather than throwing, because the CLI wants to report every problem in
 * one pass rather than making the author fix them one at a time.
 */
export function validateManifest(manifest: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const add = (path: string, message: string, severity: ValidationIssue['severity'] = 'error'): void => {
    issues.push({ path, message, severity })
  }

  if (typeof manifest !== 'object' || manifest === null) {
    return [{ path: '', message: 'Manifest must be an object.', severity: 'error' }]
  }

  const m = manifest as Partial<SkillManifest>

  if (m.vsm !== '1.0') {
    add('vsm', `Unsupported manifest version ${String(m.vsm)}. Expected "1.0".`)
  }

  if (!m.id) add('id', 'A skill id is required.')
  else if (!ID_PATTERN.test(m.id)) {
    add('id', `Skill id "${m.id}" must be lowercase kebab-case.`)
  }

  if (!m.name) add('name', 'A human-readable name is required.')

  if (!m.description) {
    add('description', 'A description is required — it is what agents match against.')
  } else {
    const tokens = estimateTokens(m.description)
    if (tokens > TIER_BUDGETS.description) {
      add(
        'description',
        `Description is roughly ${tokens} tokens, over the ${TIER_BUDGETS.description}-token budget. Some agents truncate it, so front-load the trigger condition.`,
        'warning',
      )
    }
    // The description is a selection signal, so it must describe a situation.
    if (!/\b(use|when|for|if|after|before|while)\b/i.test(m.description)) {
      add(
        'description',
        'Description does not state when to use the skill. Agents select on this field, so phrase it as a trigger ("Use when …") rather than a summary of contents.',
        'warning',
      )
    }
  }

  if (!m.version) add('version', 'A version is required.')
  else if (!SEMVER_PATTERN.test(m.version)) {
    add('version', `Version "${m.version}" is not valid semver.`, 'warning')
  }

  if (!m.category) add('category', 'A category is required.')

  /* --- activation ------------------------------------------------------- */
  if (!m.activation) {
    add('activation', 'An activation block is required.')
  } else {
    const a = m.activation
    const hasTrigger = a.always || a.globs?.length || a.intents?.length || a.keywords?.length || a.onDemandOnly
    if (!hasTrigger) {
      add('activation', 'The skill has no activation trigger, so it will never load.')
    }
    if (a.always && a.globs?.length) {
      add(
        'activation',
        'Both `always` and `globs` are set. `always` wins, and the globs are ignored — remove one.',
        'warning',
      )
    }
    if (a.always) {
      const bodyTokens = estimateTokens(m.content?.body ?? '')
      if (bodyTokens > 400) {
        add(
          'activation.always',
          `An always-on skill costs its full body on every turn. This one is roughly ${bodyTokens} tokens. Move detail into references, or switch to glob or intent activation.`,
          'warning',
        )
      }
    }
  }

  /* --- content ---------------------------------------------------------- */
  if (!m.content) {
    add('content', 'A content block is required.')
  } else {
    if (!m.content.summary) add('content.summary', 'A summary is required.')
    else if (estimateTokens(m.content.summary) > TIER_BUDGETS.summary) {
      add(
        'content.summary',
        `Summary is over the ${TIER_BUDGETS.summary}-token budget.`,
        'warning',
      )
    }

    if (!m.content.body) add('content.body', 'A body is required.')
    else {
      const tokens = estimateTokens(m.content.body)
      if (tokens > TIER_BUDGETS.body) {
        add(
          'content.body',
          `Body is roughly ${tokens} tokens, over the ${TIER_BUDGETS.body}-token budget. Split the deep material into references so agents load it only when needed.`,
          'warning',
        )
      }
    }

    for (const [index, reference] of (m.content.references ?? []).entries()) {
      if (!reference.id) add(`content.references[${index}].id`, 'Reference id is required.')
      if (!reference.answers) {
        add(
          `content.references[${index}].answers`,
          'Every reference must state which question it answers, or the agent cannot decide whether to load it.',
          'warning',
        )
      }
      if (!reference.path && !reference.content) {
        add(`content.references[${index}]`, 'Reference needs either a path or inline content.')
      }
    }
  }

  /* --- rules ------------------------------------------------------------ */
  const seenRuleIds = new Set<string>()
  for (const [index, rule] of (m.rules ?? []).entries()) {
    const path = `rules[${index}]`
    if (!rule.id) add(`${path}.id`, 'Rule id is required.')
    else if (seenRuleIds.has(rule.id)) add(`${path}.id`, `Duplicate rule id "${rule.id}".`)
    else seenRuleIds.add(rule.id)

    if (!rule.statement) add(`${path}.statement`, 'Rule statement is required.')
    else if (rule.statement.length > 240) {
      add(
        `${path}.statement`,
        'Rule statement is long enough that it probably contains two rules. Split it — a rule that cannot be checked in one glance will not be checked at all.',
        'warning',
      )
    }

    if ((rule.strength === 'must' || rule.strength === 'must-not') && !rule.evidence?.rationale) {
      add(
        `${path}.evidence`,
        'A "must" rule without a rationale cannot be correctly overridden when it does not apply. State the mechanism.',
        'warning',
      )
    }

    if (rule.verifiedBy && !(m.verification ?? []).some((c) => c.id === rule.verifiedBy)) {
      add(`${path}.verifiedBy`, `References unknown check "${rule.verifiedBy}".`)
    }
  }

  /* --- verification ----------------------------------------------------- */
  for (const [index, check] of (m.verification ?? []).entries()) {
    const path = `verification[${index}]`
    if (!check.id) add(`${path}.id`, 'Check id is required.')
    if (check.kind === 'command' && !check.command) {
      add(`${path}.command`, 'A command check needs a command.')
    }
    if (check.kind === 'self-review' && !check.questions?.length) {
      add(`${path}.questions`, 'A self-review check needs at least one question.')
    }
  }

  /* --- targets ---------------------------------------------------------- */
  for (const [index, target] of (m.targets ?? []).entries()) {
    if (!ALL_TARGETS.includes(target)) {
      add(`targets[${index}]`, `Unknown target "${target}".`)
    }
  }

  return issues
}

/** Convenience wrapper for callers that want a boolean and a throw. */
export function assertValidManifest(manifest: unknown): asserts manifest is SkillManifest {
  const issues = validateManifest(manifest).filter((i) => i.severity === 'error')
  if (issues.length > 0) {
    const detail = issues.map((i) => `  ${i.path || '<root>'}: ${i.message}`).join('\n')
    throw new Error(`Invalid skill manifest:\n${detail}`)
  }
}

/** Total estimated cost of a skill at each disclosure tier, for budgeting a bundle. */
export function skillCost(manifest: SkillManifest): {
  always: number
  activated: number
  full: number
} {
  const description = estimateTokens(manifest.description)
  const summary = estimateTokens(manifest.content.summary)
  const body = estimateTokens(manifest.content.body)
  const rules = (manifest.rules ?? []).reduce(
    (sum, rule) => sum + estimateTokens(rule.statement + (rule.evidence?.rationale ?? '')),
    0,
  )
  const references = (manifest.content.references ?? []).reduce(
    (sum, reference) => sum + estimateTokens(reference.content ?? ''),
    0,
  )

  const always = manifest.activation.always ? description + summary + body + rules : description
  return {
    always,
    activated: description + summary + body + rules,
    full: description + summary + body + rules + references,
  }
}
