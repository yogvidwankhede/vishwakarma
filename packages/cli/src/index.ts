/**
 * The Vishwakarma CLI.
 *
 * One design principle runs through every command here: never surprise the user's
 * repository. Every command that writes reports exactly what it wrote, every destructive
 * operation has a dry run, and anything touching a file a human may have authored goes
 * through the delimited-section merge rather than overwriting.
 *
 * The second principle is that the tool should tell the user what things cost. Installing
 * eighteen skills into an agent that concatenates all of them into every request is a
 * decision with a real price, and a tool that reports "installed 18 skills" without
 * mentioning the twenty thousand tokens is not being straight with anyone.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import process from 'node:process'
import { Command } from 'commander'
import pc from 'picocolors'
import {
  ADAPTER_LIST,
  compile,
  estimateContextCost,
  getAdapter,
  mergeFile,
  removeSection,
} from '@vishwakarma/adapters'
import {
  catalog,
  catalogById,
  categories,
  resolveSelection,
  skillCost,
  validateManifest,
  type AgentTarget,
  type SkillManifest,
} from '@vishwakarma/skills'
import {
  buildTokenSet,
  defaultTokenSet,
  toCss,
  toJson,
  toMarkdown,
  toTailwindTheme,
  toTypeScript,
  validateTokenSet,
} from '@vishwakarma/tokens'
import { detectAgents, detectStack } from './detect.js'

const VERSION = '0.1.0'

/* -------------------------------------------------------------------------- */
/* Output helpers                                                              */
/* -------------------------------------------------------------------------- */

const out = (line = ''): void => {
  process.stdout.write(`${line}\n`)
}
const err = (line: string): void => {
  process.stderr.write(`${line}\n`)
}

const symbols = {
  ok: pc.green('✓'),
  warn: pc.yellow('!'),
  fail: pc.red('✗'),
  info: pc.dim('·'),
  arrow: pc.dim('→'),
}

function header(text: string): void {
  out()
  out(pc.bold(text))
  out(pc.dim('─'.repeat(Math.min(text.length, 60))))
}

/** Format a token count so large numbers stay scannable. */
function tokens(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k tok`
  return `${count} tok`
}

async function readIfPresent(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* Shared install logic                                                        */
/* -------------------------------------------------------------------------- */

interface WriteReport {
  path: string
  action: string
}

/**
 * Write a compiled skill set to disk.
 *
 * The dry-run path shares the same code as the real one so that what a dry run reports is
 * what a real run does. A dry run implemented separately is a dry run that lies eventually.
 */
async function writeCompiled(
  skills: SkillManifest[],
  targets: AgentTarget[],
  root: string,
  options: { dryRun?: boolean },
): Promise<WriteReport[]> {
  const results = compile(skills, { targets })
  const reports: WriteReport[] = []

  for (const result of results) {
    for (const file of result.files) {
      const absolute = resolve(root, file.path)
      const existing = await readIfPresent(absolute)
      const merged = mergeFile(file, existing)

      if (!options.dryRun && merged.action !== 'unchanged' && merged.action !== 'skipped-existing') {
        await mkdir(dirname(absolute), { recursive: true })
        await writeFile(absolute, merged.contents, 'utf8')
      }

      reports.push({ path: file.path, action: merged.action })
    }
  }

  return reports
}

function summariseWrites(reports: WriteReport[], dryRun: boolean): void {
  const counts = new Map<string, number>()
  for (const report of reports) {
    counts.set(report.action, (counts.get(report.action) ?? 0) + 1)
  }

  const verb = dryRun ? 'would be' : ''
  for (const [action, count] of counts) {
    const label =
      action === 'created'
        ? `${count} file(s) ${verb} created`
        : action === 'replaced-section'
          ? `${count} file(s) ${verb} updated`
          : action === 'appended-section'
            ? `${count} file(s) ${verb} extended with a new section`
            : action === 'skipped-existing'
              ? `${count} file(s) left alone (already present)`
              : `${count} file(s) unchanged`
    out(`  ${symbols.ok} ${label}`)
  }
}

/* -------------------------------------------------------------------------- */
/* Commands                                                                    */
/* -------------------------------------------------------------------------- */

const program = new Command()

program
  .name('vishwakarma')
  .description('Design intelligence for AI coding agents. Install skills, tokens, and components into any agent.')
  .version(VERSION, '-v, --version')
  .option('-C, --cwd <path>', 'run as if in this directory', process.cwd())

/* --- list --------------------------------------------------------------- */

program
  .command('list')
  .alias('ls')
  .description('list every skill in the catalog')
  .option('-c, --category <category>', 'filter by category')
  .option('--json', 'output as JSON')
  .action((options: { category?: string; json?: boolean }) => {
    const skills = options.category
      ? catalog.filter((skill) => skill.category === options.category)
      : catalog

    if (options.json) {
      out(
        JSON.stringify(
          skills.map((s) => ({ id: s.id, name: s.name, category: s.category, description: s.description })),
          null,
          2,
        ),
      )
      return
    }

    if (skills.length === 0) {
      err(`No skills in category "${options.category}". Available: ${categories.join(', ')}`)
      process.exitCode = 1
      return
    }

    header(`Skill catalog (${skills.length})`)

    // Group by category rather than trusting catalog order, which follows the filesystem.
    const ordered = [...skills].sort(
      (a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id),
    )

    let currentCategory = ''
    for (const skill of ordered) {
      if (skill.category !== currentCategory) {
        currentCategory = skill.category
        out()
        out(pc.dim(currentCategory))
      }
      const cost = skillCost(skill)
      out(`  ${pc.cyan(skill.id.padEnd(24))} ${pc.dim(tokens(cost.activated).padStart(9))}  ${skill.name}`)
      out(`  ${' '.repeat(24)} ${pc.dim(skill.description)}`)
    }

    out()
    out(pc.dim(`Categories: ${categories.join(', ')}`))
    out(pc.dim('Install with: vishwakarma add <id> [<id>...]  or  vishwakarma add --all'))
  })

/* --- show --------------------------------------------------------------- */

program
  .command('show <skill>')
  .description('show the full detail of one skill')
  .action((id: string) => {
    const skill = catalogById.get(id)
    if (!skill) {
      err(`Unknown skill "${id}". Run \`vishwakarma list\` to see the catalog.`)
      process.exitCode = 1
      return
    }

    const cost = skillCost(skill)
    header(skill.name)
    out(skill.description)
    out()
    out(`${pc.dim('id')}         ${skill.id}`)
    out(`${pc.dim('category')}   ${skill.category}`)
    out(`${pc.dim('version')}    ${skill.version}`)
    out(`${pc.dim('cost')}       ${tokens(cost.activated)} when active, ${tokens(cost.full)} with all references`)
    out(`${pc.dim('rules')}      ${skill.rules?.length ?? 0}`)
    out(`${pc.dim('checks')}     ${skill.verification?.length ?? 0}`)

    if (skill.activation.intents?.length) {
      out()
      out(pc.dim('activates when'))
      for (const intent of skill.activation.intents) out(`  ${symbols.arrow} ${intent}`)
    }

    if (skill.content.references?.length) {
      out()
      out(pc.dim('references'))
      for (const reference of skill.content.references) {
        out(`  ${symbols.arrow} ${pc.cyan(reference.id)} — ${reference.answers}`)
      }
    }

    if (skill.rules?.length) {
      out()
      out(pc.dim('rules'))
      for (const rule of skill.rules) {
        const strength = rule.strength.toUpperCase().replace('-', ' ')
        out(`  ${pc.yellow(strength.padEnd(9))} ${rule.statement}`)
      }
    }
  })

/* --- detect ------------------------------------------------------------- */

program
  .command('detect')
  .description('report which coding agents and frameworks this project uses')
  .action(async () => {
    const root = program.opts().cwd as string
    const [agents, stack] = await Promise.all([detectAgents(root), detectStack(root)])

    header('Detected agents')
    if (agents.length === 0) {
      out(`  ${symbols.info} None found. Vishwakarma can still install to any target explicitly.`)
    } else {
      for (const agent of agents) {
        const installed = agent.alreadyInstalled ? pc.green(' [installed]') : ''
        out(`  ${symbols.ok} ${agent.label.padEnd(24)} ${pc.dim(agent.confidence)}${installed}`)
        out(`    ${pc.dim(`found: ${agent.evidence.join(', ')}`)}`)
      }
    }

    header('Detected stack')
    out(`  framework       ${stack.framework ?? 'unknown'}${stack.nextMajor ? ` ${stack.nextMajor}` : ''}`)
    out(`  react           ${stack.reactMajor ?? 'not found'}`)
    out(`  tailwind        ${stack.tailwindMajor ?? 'not found'}`)
    out(`  typescript      ${stack.hasTypeScript ? 'yes' : 'no'}`)
    out(`  package manager ${stack.packageManager}`)
    if (stack.motionLibraries.length) out(`  motion          ${stack.motionLibraries.join(', ')}`)

    for (const note of stack.notes) {
      out()
      out(`  ${symbols.warn} ${note}`)
    }
  })

/* --- add ---------------------------------------------------------------- */

program
  .command('add [skills...]')
  .description('install skills into your coding agents')
  .option('-a, --all', 'install every skill in the catalog')
  .option('-t, --target <targets...>', 'targets to install for (default: detected)')
  .option('-c, --category <category>', 'install every skill in a category')
  .option('-n, --dry-run', 'report what would change without writing')
  .action(
    async (
      ids: string[],
      options: { all?: boolean; target?: string[]; category?: string; dryRun?: boolean },
    ) => {
      const root = program.opts().cwd as string

      let selected: SkillManifest[]
      try {
        selected = options.all
          ? catalog
          : options.category
            ? catalog.filter((skill) => skill.category === options.category)
            : resolveSelection(ids)
      } catch (error) {
        err((error as Error).message)
        process.exitCode = 1
        return
      }

      if (selected.length === 0) {
        err('No skills selected. Pass skill ids, --all, or --category <name>.')
        process.exitCode = 1
        return
      }

      let targets: AgentTarget[]
      if (options.target?.length) {
        const known = new Set(ADAPTER_LIST.map((adapter) => adapter.target))
        const unknown = options.target.filter((target) => !known.has(target as AgentTarget))
        if (unknown.length) {
          err(`Unknown target(s): ${unknown.join(', ')}`)
          err(`Available: ${ADAPTER_LIST.map((a) => a.target).join(', ')}`)
          process.exitCode = 1
          return
        }
        targets = options.target as AgentTarget[]
      } else {
        const detected = await detectAgents(root)
        targets = detected.map((agent) => agent.target)
        if (targets.length === 0) {
          out(`${symbols.warn} No agents detected, defaulting to the universal AGENTS.md target.`)
          targets = ['universal']
        }
      }

      header(`Installing ${selected.length} skill(s) into ${targets.length} target(s)`)
      if (options.dryRun) out(pc.yellow('  Dry run — nothing will be written.\n'))

      const reports = await writeCompiled(selected, targets, root, { dryRun: options.dryRun ?? false })
      summariseWrites(reports, options.dryRun ?? false)

      header('Context cost')
      out(pc.dim('  What each agent will carry on every request, and what it loads on demand.'))
      out()
      for (const target of targets) {
        const cost = estimateContextCost(selected, target)
        const adapter = getAdapter(target)
        const warn = cost.alwaysLoadedTokens > 8000 ? ` ${pc.yellow('← heavy')}` : ''
        out(
          `  ${adapter.label.padEnd(24)} always ${tokens(cost.alwaysLoadedTokens).padStart(9)}   on demand ${tokens(cost.onDemandTokens).padStart(9)}${warn}`,
        )
      }

      const heavy = targets.filter((target) => estimateContextCost(selected, target).alwaysLoadedTokens > 8000)
      if (heavy.length > 0) {
        out()
        out(`  ${symbols.warn} ${heavy.map((t) => getAdapter(t).label).join(', ')} load everything on every request.`)
        out('    Consider installing a focused subset there, or using the MCP target instead,')
        out('    which loads nothing until the agent asks for it.')
      }

      out()
      out(`${symbols.ok} Done. Run ${pc.cyan('vishwakarma sync')} after editing skills to regenerate.`)
    },
  )

/* --- remove ------------------------------------------------------------- */

program
  .command('remove [skills...]')
  .alias('rm')
  .description('remove installed skills')
  .option('-a, --all', 'remove every installed skill')
  .option('-t, --target <targets...>', 'targets to remove from (default: detected)')
  .option('-n, --dry-run', 'report what would change without writing')
  .action(async (ids: string[], options: { all?: boolean; target?: string[]; dryRun?: boolean }) => {
    const root = program.opts().cwd as string
    const selected = options.all ? catalog : resolveSelection(ids)

    const targets =
      (options.target as AgentTarget[] | undefined) ?? (await detectAgents(root)).map((agent) => agent.target)

    header(`Removing ${selected.length} skill(s) from ${targets.length} target(s)`)
    if (options.dryRun) out(pc.yellow('  Dry run — nothing will be written.\n'))

    let removed = 0
    const results = compile(selected, { targets })

    for (const result of results) {
      for (const file of result.files) {
        const absolute = resolve(root, file.path)
        const existing = await readIfPresent(absolute)
        if (existing === null) continue

        if (file.strategy === 'merge-section') {
          const stripped = removeSection(existing)
          if (!options.dryRun) {
            if (stripped === null) await rm(absolute, { force: true })
            else await writeFile(absolute, stripped, 'utf8')
          }
          out(`  ${symbols.ok} ${stripped === null ? 'removed' : 'cleaned'} ${file.path}`)
        } else {
          if (!options.dryRun) await rm(absolute, { force: true })
          out(`  ${symbols.ok} removed ${file.path}`)
        }
        removed++
      }
    }

    if (removed === 0) out(`  ${symbols.info} Nothing installed here.`)
  })

/* --- sync --------------------------------------------------------------- */

program
  .command('sync')
  .description('regenerate agent files from the current skill set')
  .option('-a, --all', 'sync every skill rather than only those already installed')
  .option('-t, --target <targets...>', 'targets to sync (default: detected)')
  .option('-n, --dry-run', 'report what would change without writing')
  .action(async (options: { all?: boolean; target?: string[]; dryRun?: boolean }) => {
    const root = program.opts().cwd as string
    const targets =
      (options.target as AgentTarget[] | undefined) ?? (await detectAgents(root)).map((agent) => agent.target)

    if (targets.length === 0) {
      err('No agents detected and no target given. Pass --target or run `vishwakarma add` first.')
      process.exitCode = 1
      return
    }

    header(`Syncing ${targets.length} target(s)`)
    const reports = await writeCompiled(catalog, targets, root, { dryRun: options.dryRun ?? false })
    summariseWrites(reports, options.dryRun ?? false)
  })

/* --- tokens ------------------------------------------------------------- */

const tokensCommand = program.command('tokens').description('generate design token artefacts')

tokensCommand
  .command('build')
  .description('generate CSS, Tailwind theme, TypeScript, and documentation from a token set')
  .option('-o, --out <dir>', 'output directory', 'src/styles')
  .option('-b, --brand <hex>', 'brand colour to derive the palette from')
  .option('--accent <hex>', 'accent colour')
  .option('--ratio <number>', 'type scale ratio', Number.parseFloat)
  .option('--formats <formats...>', 'formats to emit', ['css', 'tailwind', 'ts', 'md'])
  .option('-n, --dry-run', 'report what would be written without writing')
  .action(
    async (options: {
      out: string
      brand?: string
      accent?: string
      ratio?: number
      formats: string[]
      dryRun?: boolean
    }) => {
      const root = program.opts().cwd as string

      const set = options.brand
        ? buildTokenSet({
            primary: options.brand,
            ...(options.accent ? { accent: options.accent } : {}),
            ...(options.ratio ? { typeRatio: options.ratio } : {}),
          })
        : defaultTokenSet

      const issues = validateTokenSet(set)
      const errors = issues.filter((issue) => issue.severity === 'error')
      if (errors.length > 0) {
        err(`${symbols.fail} Token set is invalid:`)
        for (const issue of errors) err(`  ${issue.path}: ${issue.message}`)
        process.exitCode = 1
        return
      }

      const artefacts: Array<[string, string]> = []
      if (options.formats.includes('css')) artefacts.push(['tokens.css', toCss(set)])
      if (options.formats.includes('tailwind')) artefacts.push(['theme.css', toTailwindTheme(set)])
      if (options.formats.includes('ts')) artefacts.push(['tokens.ts', toTypeScript(set)])
      if (options.formats.includes('json')) artefacts.push(['tokens.json', toJson(set)])
      if (options.formats.includes('md')) artefacts.push(['tokens.md', toMarkdown(set)])

      header(`Generating ${artefacts.length} artefact(s) from ${set.tokens.length} tokens`)
      if (options.dryRun) out(pc.yellow('  Dry run — nothing will be written.\n'))

      for (const [name, contents] of artefacts) {
        const path = join(options.out, name)
        if (!options.dryRun) {
          const absolute = resolve(root, path)
          await mkdir(dirname(absolute), { recursive: true })
          await writeFile(absolute, contents, 'utf8')
        }
        out(`  ${symbols.ok} ${path} ${pc.dim(`(${(contents.length / 1024).toFixed(1)} KB)`)}`)
      }

      const warnings = issues.filter((issue) => issue.severity === 'warning')
      if (warnings.length > 0) {
        out()
        out(`  ${symbols.warn} ${warnings.length} warning(s). Run \`vishwakarma tokens check\` for detail.`)
      }

      out()
      out(pc.dim('  Import order matters — tokens first, Tailwind second, theme last:'))
      out(pc.dim('    @import "./tokens.css";'))
      out(pc.dim('    @import "tailwindcss";'))
      out(pc.dim('    @import "./theme.css";'))
    },
  )

tokensCommand
  .command('check')
  .description('validate a token set and report issues')
  .action(() => {
    const issues = validateTokenSet(defaultTokenSet)
    header(`Token set: ${defaultTokenSet.name}`)
    out(`  ${defaultTokenSet.tokens.length} tokens`)

    if (issues.length === 0) {
      out(`  ${symbols.ok} No issues.`)
      return
    }

    for (const issue of issues) {
      const mark = issue.severity === 'error' ? symbols.fail : symbols.warn
      out(`  ${mark} ${pc.dim(issue.path)} ${issue.message}`)
    }

    if (issues.some((issue) => issue.severity === 'error')) process.exitCode = 1
  })

/* --- validate ----------------------------------------------------------- */

program
  .command('validate')
  .description('validate every skill manifest in the catalog')
  .action(() => {
    header(`Validating ${catalog.length} skill(s)`)

    let errors = 0
    let warnings = 0

    for (const skill of catalog) {
      const issues = validateManifest(skill)
      const skillErrors = issues.filter((issue) => issue.severity === 'error')
      const skillWarnings = issues.filter((issue) => issue.severity === 'warning')

      errors += skillErrors.length
      warnings += skillWarnings.length

      const mark = skillErrors.length > 0 ? symbols.fail : skillWarnings.length > 0 ? symbols.warn : symbols.ok
      out(`  ${mark} ${skill.id}`)

      for (const issue of [...skillErrors, ...skillWarnings]) {
        const prefix = issue.severity === 'error' ? pc.red('error') : pc.yellow('warn ')
        out(`      ${prefix} ${pc.dim(issue.path)} ${issue.message}`)
      }
    }

    out()
    out(`  ${errors} error(s), ${warnings} warning(s)`)
    if (errors > 0) process.exitCode = 1
  })

/* --- doctor ------------------------------------------------------------- */

program
  .command('doctor')
  .description('check the installation and report anything that looks wrong')
  .action(async () => {
    const root = program.opts().cwd as string
    const [agents, stack] = await Promise.all([detectAgents(root), detectStack(root)])

    header('Vishwakarma doctor')

    const problems: string[] = []
    const advice: string[] = []

    out(`  ${symbols.ok} CLI version ${VERSION}`)
    out(`  ${symbols.ok} Catalog contains ${catalog.length} skill(s)`)

    const invalid = catalog.filter((skill) => validateManifest(skill).some((i) => i.severity === 'error'))
    if (invalid.length > 0) {
      problems.push(`${invalid.length} skill(s) fail validation: ${invalid.map((s) => s.id).join(', ')}`)
    } else {
      out(`  ${symbols.ok} Every skill manifest is valid`)
    }

    if (agents.length === 0) {
      advice.push('No coding agents detected. Vishwakarma works best when it can install into one.')
    } else {
      const installed = agents.filter((agent) => agent.alreadyInstalled)
      out(`  ${symbols.ok} ${agents.length} agent(s) detected, ${installed.length} with Vishwakarma installed`)

      for (const agent of agents.filter((a) => !a.alreadyInstalled)) {
        advice.push(`${agent.label} is configured here but has no Vishwakarma skills installed.`)
      }
    }

    for (const target of agents.map((agent) => agent.target)) {
      const cost = estimateContextCost(catalog, target)
      if (cost.alwaysLoadedTokens > 12000) {
        advice.push(
          `${getAdapter(target).label} would carry ${tokens(cost.alwaysLoadedTokens)} on every request with the full catalog installed. Install a focused subset there.`,
        )
      }
    }

    for (const note of stack.notes) advice.push(note)

    if ((await readIfPresent(resolve(root, '.mcp.json'))) !== null) {
      out(`  ${symbols.ok} MCP configuration present`)
    } else {
      advice.push(
        'No MCP configuration found. `vishwakarma add --target mcp` gives agents on-demand access with no standing context cost.',
      )
    }

    if (problems.length > 0) {
      header('Problems')
      for (const problem of problems) out(`  ${symbols.fail} ${problem}`)
    }

    if (advice.length > 0) {
      header('Suggestions')
      for (const item of advice) out(`  ${symbols.warn} ${item}`)
    }

    if (problems.length === 0 && advice.length === 0) {
      out()
      out(`  ${symbols.ok} Everything looks right.`)
    }

    if (problems.length > 0) process.exitCode = 1
  })

/* --- targets ------------------------------------------------------------ */

program
  .command('targets')
  .description('list every supported agent target and where it installs')
  .action(() => {
    header(`Supported targets (${ADAPTER_LIST.length})`)
    for (const adapter of ADAPTER_LIST) {
      out()
      out(`  ${pc.cyan(adapter.target.padEnd(14))} ${adapter.label}`)
      out(`  ${' '.repeat(14)} ${pc.dim(adapter.location)}`)
      out(`  ${' '.repeat(14)} ${pc.dim(adapter.notes)}`)
    }
  })

/* --- init --------------------------------------------------------------- */

program
  .command('init')
  .description('set up Vishwakarma in this project')
  .option('-b, --brand <hex>', 'brand colour to derive tokens from')
  .option('--no-tokens', 'skip token generation')
  .option('-n, --dry-run', 'report what would change without writing')
  .action(async (options: { brand?: string; tokens?: boolean; dryRun?: boolean }) => {
    const root = program.opts().cwd as string
    const [agents, stack] = await Promise.all([detectAgents(root), detectStack(root)])

    header('Setting up Vishwakarma')
    out(`  Project: ${pc.cyan(relative(process.cwd(), root) || '.')}`)
    out(
      `  Stack:   ${stack.framework ?? 'unknown'}${stack.reactMajor ? `, React ${stack.reactMajor}` : ''}${stack.tailwindMajor ? `, Tailwind ${stack.tailwindMajor}` : ''}`,
    )
    out(`  Agents:  ${agents.length > 0 ? agents.map((a) => a.label).join(', ') : 'none detected'}`)

    const targets: AgentTarget[] = agents.length > 0 ? agents.map((a) => a.target) : ['universal']

    // A curated default rather than the whole catalog. Installing eighteen skills into a
    // project that has not asked for them is the behaviour that makes people distrust a
    // tool on first run.
    const starterIds = [
      'design-judgment',
      'ui-generation-workflow',
      'responsive-architecture',
      'accessible-components',
    ].filter((id) => catalogById.has(id))

    const starter = resolveSelection(starterIds)

    header(`Installing ${starter.length} starter skill(s)`)
    for (const skill of starter) out(`  ${symbols.arrow} ${skill.name}`)
    out()

    const reports = await writeCompiled(starter, targets, root, { dryRun: options.dryRun ?? false })
    summariseWrites(reports, options.dryRun ?? false)

    if (options.tokens !== false) {
      header('Generating design tokens')
      const set = options.brand ? buildTokenSet({ primary: options.brand }) : defaultTokenSet
      const files: Array<[string, string]> = [
        ['src/styles/tokens.css', toCss(set)],
        ['src/styles/theme.css', toTailwindTheme(set)],
      ]
      for (const [path, contents] of files) {
        if (!options.dryRun) {
          const absolute = resolve(root, path)
          await mkdir(dirname(absolute), { recursive: true })
          await writeFile(absolute, contents, 'utf8')
        }
        out(`  ${symbols.ok} ${path}`)
      }
    }

    header('Next steps')
    out(`  1. Browse the catalog:      ${pc.cyan('vishwakarma list')}`)
    out(`  2. Add more skills:         ${pc.cyan('vishwakarma add motion-design scroll-experiences')}`)
    out(`  3. Give agents live access: ${pc.cyan('vishwakarma add --target mcp')}`)
    out(`  4. Check everything:        ${pc.cyan('vishwakarma doctor')}`)
  })

/* -------------------------------------------------------------------------- */

program.parseAsync(process.argv).catch((error: unknown) => {
  err(`${symbols.fail} ${(error as Error).message}`)
  process.exitCode = 1
})
