// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The project profile.
 *
 * Generic design guidance is worth much less than guidance that knows your codebase. "Use
 * the spacing scale" is advice; "use `--space-4`, which is what the other 47 usages in this
 * repository use" is an instruction. The difference is a profile.
 *
 * So this walks the project once, works out what is actually there — framework, CSS
 * strategy, the custom properties already defined, the components already built, whether
 * dark mode exists — and writes it somewhere both a human and an agent can read.
 *
 * Two output formats, deliberately. JSON for tools, Markdown for agents that read files
 * rather than call tools, which is most of them. Both are written into a dot-directory and
 * are safe to commit: they contain no secrets, they are deterministic, and having them in
 * version control means a teammate's agent starts from the same understanding as yours.
 *
 * Determinism is the constraint that shapes the implementation. Nothing here records a
 * timestamp, a machine name, or a path outside the project, because a profile that churns
 * on every run is a profile nobody commits — and an uncommitted profile helps exactly one
 * developer.
 */

import { readdir, readFile } from 'node:fs/promises'
import { basename, extname, join, relative } from 'node:path'
import { type Detection, detectAgents, detectStack, type StackDetection } from './detect.js'

export interface TokenObservation {
  /** The custom property name, without the leading dashes. */
  name: string
  /** How many distinct files reference or define it. */
  uses: number
  /** Our guess at what it controls, from the name. */
  kind: 'colour' | 'spacing' | 'typography' | 'radius' | 'shadow' | 'motion' | 'layer' | 'other'
}

export interface ComponentObservation {
  name: string
  path: string
  /** Whether the file carries a "use client" directive. */
  clientOnly: boolean
}

export interface ProjectProfile {
  /** Profile schema version. */
  version: number
  stack: StackDetection
  agents: Array<Pick<Detection, 'target' | 'label' | 'alreadyInstalled'>>
  styling: {
    strategy: 'tailwind' | 'css-modules' | 'plain-css' | 'css-in-js' | 'unknown'
    hasDarkMode: boolean
    darkModeStrategy: 'attribute' | 'class' | 'media' | 'none'
    customProperties: TokenObservation[]
  }
  components: ComponentObservation[]
  /** Directories that appear to hold UI code, for an agent deciding where to put things. */
  conventions: {
    componentDirectories: string[]
    styleFiles: string[]
    usesAppRouter: boolean
    usesSrcDirectory: boolean
  }
  /** Things worth telling an agent that are not obvious from the data above. */
  notes: string[]
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
  '.vishwakarma',
  'public',
  'static',
])

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.jsx',
  '.js',
  '.css',
  '.scss',
  '.vue',
  '.svelte',
])

async function* walk(dir: string, root: string, depth = 0): AsyncGenerator<string> {
  // A depth cap keeps this fast on large repositories. Component code essentially never
  // lives eight levels deep, and scanning a monorepo's every package would make the
  // command slow enough that people stop running it.
  if (depth > 6) return

  const entries = await readdir(dir, { withFileTypes: true }).catch(() => null)
  if (entries === null) return

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.storybook') continue
    if (SKIP_DIRS.has(entry.name)) continue

    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full, root, depth + 1)
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
      yield full
    }
  }
}

/**
 * Classify a custom property from its name.
 *
 * Name-based rather than value-based on purpose. A value tells you what a token *is*
 * (`#3d5afe` is a colour); the name tells you what it is *for*, and "for" is what an agent
 * needs in order to pick the right one. It also works on tokens defined by reference,
 * where the value is another `var()` and carries no information at all.
 */
function classifyToken(name: string): TokenObservation['kind'] {
  const lower = name.toLowerCase()
  if (
    /colou?r|bg|background|fg|foreground|text|border|surface|accent|brand|primary|danger|success|warning/.test(
      lower,
    )
  )
    return 'colour'
  if (/space|spacing|gap|inset|margin|padding|size(?!.*font)/.test(lower)) return 'spacing'
  if (/font|type|leading|tracking|measure|text-size/.test(lower)) return 'typography'
  if (/radius|rounded|corner/.test(lower)) return 'radius'
  if (/shadow|elevation/.test(lower)) return 'shadow'
  if (/duration|ease|easing|transition|motion|delay/.test(lower)) return 'motion'
  if (/z-|layer|index/.test(lower)) return 'layer'
  return 'other'
}

const CUSTOM_PROPERTY = /--([a-zA-Z][\w-]*)\s*:/g
const COMPONENT_EXPORT = /export\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9]*)/g
const COMPONENT_CONST = /export\s+const\s+([A-Z][A-Za-z0-9]*)\s*[:=]/g

/**
 * Build a profile of the project.
 *
 * Deliberately heuristic and deliberately honest about it. This reads source text; it does
 * not resolve imports, evaluate configuration, or run a compiler. So it produces a
 * *description* rather than a proof, and the notes it emits say so — an agent that treats
 * a heuristic profile as authoritative will confidently use a token that does not exist.
 */
export async function buildProfile(root: string): Promise<ProjectProfile> {
  const [agents, stack] = await Promise.all([detectAgents(root), detectStack(root)])

  const tokenCounts = new Map<string, number>()
  const components: ComponentObservation[] = []
  const componentDirectories = new Set<string>()
  const styleFiles: string[] = []

  let darkModeStrategy: ProjectProfile['styling']['darkModeStrategy'] = 'none'
  let sawTailwindImport = false
  let sawCssModules = false
  let sawCssInJs = false
  let scanned = 0

  for await (const file of walk(root, root)) {
    scanned++
    // A large repository can have tens of thousands of source files, and the profile stops
    // improving long before that. Capping keeps the command fast enough to run often,
    // which matters more than exhaustiveness for something advisory.
    if (scanned > 4000) break

    let content: string
    try {
      content = await readFile(file, 'utf8')
    } catch {
      continue
    }

    const rel = relative(root, file)
    const extension = extname(file)

    if (extension === '.css' || extension === '.scss') {
      styleFiles.push(rel)

      for (const match of content.matchAll(CUSTOM_PROPERTY)) {
        const name = match[1] as string
        tokenCounts.set(name, (tokenCounts.get(name) ?? 0) + 1)
      }

      if (/@import\s+["']tailwindcss["']|@tailwind\s/.test(content)) sawTailwindImport = true

      if (darkModeStrategy === 'none') {
        if (/\[data-theme[~^|$*]?=\s*["']?dark/.test(content)) darkModeStrategy = 'attribute'
        else if (/\.dark\b/.test(content)) darkModeStrategy = 'class'
        else if (/prefers-color-scheme:\s*dark/.test(content)) darkModeStrategy = 'media'
      }
      continue
    }

    if (extension === '.tsx' || extension === '.jsx') {
      const names = new Set<string>()
      for (const match of content.matchAll(COMPONENT_EXPORT)) names.add(match[1] as string)
      for (const match of content.matchAll(COMPONENT_CONST)) names.add(match[1] as string)

      if (names.size > 0) {
        const directory = rel.split('/').slice(0, -1).join('/')
        if (directory) componentDirectories.add(directory)

        const clientOnly = /^\s*['"]use client['"]/.test(content)
        for (const name of names) {
          components.push({ name, path: rel, clientOnly })
        }
      }
    }

    if (/\.module\.(css|scss)['"]/.test(content)) sawCssModules = true
    if (/from\s+['"](styled-components|@emotion\/|@stitches\/)/.test(content)) sawCssInJs = true
    if (/@import\s+["']tailwindcss["']/.test(content)) sawTailwindImport = true
  }

  const customProperties: TokenObservation[] = Array.from(tokenCounts.entries())
    .map(([name, uses]) => ({ name, uses, kind: classifyToken(name) }))
    .sort((a, b) => b.uses - a.uses || a.name.localeCompare(b.name))
    // A cap keeps the Markdown readable. The tail of a token list is almost all one-off
    // component-local properties, which are the least useful thing an agent could read.
    .slice(0, 120)

  const strategy: ProjectProfile['styling']['strategy'] =
    stack.tailwindMajor !== undefined || sawTailwindImport
      ? 'tailwind'
      : sawCssModules
        ? 'css-modules'
        : sawCssInJs
          ? 'css-in-js'
          : styleFiles.length > 0
            ? 'plain-css'
            : 'unknown'

  const notes: string[] = [...stack.notes]

  if (customProperties.length === 0 && strategy !== 'tailwind') {
    notes.push(
      'No CSS custom properties found. There is no token layer to conform to, so generated code will be inventing values — consider running `vishwakarma tokens build` first.',
    )
  }

  if (darkModeStrategy === 'media') {
    notes.push(
      'Dark mode is driven only by prefers-color-scheme, so a user cannot choose light on a dark-preferring system. An attribute strategy supports the three-state choice people actually want.',
    )
  }

  if (components.length > 40 && strategy === 'tailwind') {
    notes.push(
      `${components.length} components found. Prefer composing existing ones over adding new ones, and check for a near-match before creating anything.`,
    )
  }

  notes.push(
    'This profile is heuristic. It reads source text without resolving imports or evaluating configuration, so treat it as a description rather than a guarantee — verify a token exists before using it.',
  )

  return {
    version: 1,
    stack,
    agents: agents.map(({ target, label, alreadyInstalled }) => ({
      target,
      label,
      alreadyInstalled,
    })),
    styling: {
      strategy,
      hasDarkMode: darkModeStrategy !== 'none',
      darkModeStrategy,
      customProperties,
    },
    // Sorted so the file is stable between runs; an unstable profile is one nobody commits.
    components: components.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 200),
    conventions: {
      componentDirectories: Array.from(componentDirectories).sort().slice(0, 30),
      styleFiles: styleFiles.sort().slice(0, 20),
      usesAppRouter: componentDirectories.has('app') || componentDirectories.has('src/app'),
      usesSrcDirectory: Array.from(componentDirectories).some((dir) => dir.startsWith('src/')),
    },
    notes,
  }
}

/** Serialise the profile as JSON, with stable key order. */
export function profileToJson(profile: ProjectProfile): string {
  return `${JSON.stringify(profile, null, 2)}\n`
}

/**
 * Render the profile as Markdown for an agent.
 *
 * Written as instructions rather than as a data dump. An agent reading "use these tokens"
 * behaves differently from one reading a table titled "Custom Properties", even when the
 * table contains the same information, because only one of them says what to do about it.
 */
export function profileToMarkdown(profile: ProjectProfile): string {
  const lines: string[] = []

  lines.push('# Project profile', '')
  lines.push(
    'Generated by Vishwakarma from this repository. Read this before writing any interface',
    'code here, and conform to what it describes rather than to your defaults.',
    '',
  )

  lines.push('## Stack', '')
  lines.push(
    `- Framework: ${profile.stack.framework ?? 'unknown'}${profile.stack.nextMajor ? ` ${profile.stack.nextMajor}` : ''}`,
  )
  lines.push(`- React: ${profile.stack.reactMajor ?? 'not detected'}`)
  lines.push(
    `- Styling: ${profile.styling.strategy}${profile.stack.tailwindMajor ? ` (Tailwind ${profile.stack.tailwindMajor})` : ''}`,
  )
  lines.push(`- TypeScript: ${profile.stack.hasTypeScript ? 'yes' : 'no'}`)
  lines.push(`- Package manager: ${profile.stack.packageManager}`)
  if (profile.stack.motionLibraries.length) {
    lines.push(`- Motion: ${profile.stack.motionLibraries.join(', ')}`)
  }
  lines.push('')

  lines.push('## Theming', '')
  if (profile.styling.hasDarkMode) {
    lines.push(
      `This project has a dark theme, scoped by the \`${profile.styling.darkModeStrategy}\` strategy.`,
      'Any colour you add must have a dark counterpart, or it will be wrong in one theme.',
      '',
    )
  } else {
    lines.push('No dark theme was detected. Do not add one unless asked.', '')
  }

  if (profile.styling.customProperties.length > 0) {
    lines.push('## Tokens in use', '')
    lines.push(
      'These custom properties already exist. Use them rather than introducing new values —',
      'a hard-coded value that duplicates one of these is a defect, not a shortcut.',
      '',
    )

    const byKind = new Map<string, TokenObservation[]>()
    for (const token of profile.styling.customProperties) {
      const list = byKind.get(token.kind) ?? []
      list.push(token)
      byKind.set(token.kind, list)
    }

    for (const [kind, tokens] of Array.from(byKind.entries()).sort()) {
      lines.push(`**${kind}** — ${tokens.map((t) => `\`--${t.name}\``).join(', ')}`, '')
    }
  }

  if (profile.components.length > 0) {
    lines.push('## Existing components', '')
    lines.push(
      'Check this list before building anything. Composing an existing component is almost',
      'always better than adding a near-duplicate, and a near-duplicate is how a component',
      'library stops being one.',
      '',
    )
    const names = profile.components.map((c) => c.name)
    const unique = Array.from(new Set(names)).sort()
    lines.push(unique.map((name) => `\`${name}\``).join(', '), '')
  }

  if (profile.conventions.componentDirectories.length > 0) {
    lines.push('## Where things live', '')
    for (const directory of profile.conventions.componentDirectories.slice(0, 12)) {
      lines.push(`- \`${directory}/\``)
    }
    lines.push('')
    lines.push(
      `Put new components where similar ones already live${profile.conventions.usesSrcDirectory ? ', under `src/`' : ''}.`,
      '',
    )
  }

  if (profile.notes.length > 0) {
    lines.push('## Notes', '')
    for (const note of profile.notes) lines.push(`- ${note}`)
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

/** Where the profile is written. */
export const PROFILE_JSON_PATH = '.vishwakarma/profile.json'
export const PROFILE_MARKDOWN_PATH = '.vishwakarma/profile.md'

/** A one-line summary for CLI output. */
export function summariseProfile(profile: ProjectProfile): string {
  const parts = [
    profile.stack.framework ?? 'unknown framework',
    profile.styling.strategy,
    `${profile.styling.customProperties.length} tokens`,
    `${new Set(profile.components.map((c) => c.name)).size} components`,
    profile.styling.hasDarkMode ? 'dark theme' : 'no dark theme',
  ]
  return parts.join(' · ')
}

/** Convenience for callers that want the file paths as well as the content. */
export function profileArtifacts(profile: ProjectProfile): Array<[string, string]> {
  return [
    [PROFILE_JSON_PATH, profileToJson(profile)],
    [PROFILE_MARKDOWN_PATH, profileToMarkdown(profile)],
  ]
}

/** Re-exported so the command module does not need a second import path. */
export { basename }
