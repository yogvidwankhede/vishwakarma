/**
 * Agent detection.
 *
 * Asking a user which of thirteen coding agents they use is a bad first interaction, and
 * the answer is usually "some of them, and I'd have to look". Detecting what is already
 * present in the repository turns a questionnaire into a confirmation, which is the
 * difference between a tool that gets installed and one that gets abandoned at the
 * prompt.
 *
 * Detection is evidence-based and honest about its confidence. A `.cursor` directory is
 * strong evidence; an `AGENTS.md` file is weak evidence, because several tools read it and
 * a human may have written it by hand.
 */

import { access, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { AgentTarget } from '@vishwakarma/skills'

export interface Detection {
  target: AgentTarget
  label: string
  confidence: 'certain' | 'likely' | 'possible'
  /** What we found that led to this conclusion. */
  evidence: string[]
  /** Whether Vishwakarma is already installed for this target. */
  alreadyInstalled: boolean
}

interface Probe {
  target: AgentTarget
  label: string
  /** Paths whose existence proves the agent is configured here. */
  strong: string[]
  /** Paths that suggest it but are shared with other tools. */
  weak?: string[]
  /** Where we would install, used to check for an existing installation. */
  installMarker: string
}

const PROBES: Probe[] = [
  {
    target: 'claude-code',
    label: 'Claude Code',
    strong: ['.claude', '.claude/settings.json', '.claude/skills', 'CLAUDE.md', '.claude/commands'],
    installMarker: '.claude/skills',
  },
  {
    target: 'cursor',
    label: 'Cursor',
    strong: ['.cursor', '.cursor/rules', '.cursorrules', '.cursorignore'],
    installMarker: '.cursor/rules',
  },
  {
    target: 'windsurf',
    label: 'Windsurf',
    strong: ['.windsurf', '.windsurf/rules', '.windsurfrules'],
    installMarker: '.windsurf/rules',
  },
  {
    target: 'cline',
    label: 'Cline',
    strong: ['.clinerules'],
    installMarker: '.clinerules',
  },
  {
    target: 'roo-code',
    label: 'Roo Code',
    strong: ['.roo', '.roo/rules', '.roomodes'],
    installMarker: '.roo/rules',
  },
  {
    target: 'continue',
    label: 'Continue',
    strong: ['.continue', '.continue/rules'],
    installMarker: '.continue/rules',
  },
  {
    target: 'copilot',
    label: 'GitHub Copilot',
    strong: ['.github/copilot-instructions.md', '.github/instructions'],
    installMarker: '.github/copilot-instructions.md',
  },
  {
    target: 'gemini-cli',
    label: 'Gemini CLI',
    strong: ['GEMINI.md', '.gemini'],
    installMarker: 'GEMINI.md',
  },
  {
    target: 'zed',
    label: 'Zed',
    strong: ['.rules', '.zed'],
    installMarker: '.rules',
  },
  {
    target: 'aider',
    label: 'Aider',
    strong: ['.aider.conf.yml', 'CONVENTIONS.md'],
    installMarker: 'CONVENTIONS.md',
  },
  {
    target: 'codex',
    label: 'OpenAI Codex',
    strong: ['.codex'],
    weak: ['AGENTS.md'],
    installMarker: 'AGENTS.md',
  },
  {
    target: 'mcp',
    label: 'Model Context Protocol',
    strong: ['.mcp.json'],
    installMarker: '.mcp.json',
  },
]

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Whether our generated content is already present at a path. */
async function hasInstallation(root: string, marker: string): Promise<boolean> {
  const full = join(root, marker)
  if (!(await exists(full))) return false

  try {
    // A directory marker: look for any subdirectory that matches a skill we would write.
    const entries = await readdir(full)
    return entries.length > 0
  } catch {
    // A file marker: look for our section delimiter.
    try {
      const contents = await readFile(full, 'utf8')
      return contents.includes('vishwakarma:begin') || contents.includes('@vishwakarma/mcp')
    } catch {
      return false
    }
  }
}

/**
 * Detect which agents are configured in a project.
 *
 * Returns everything found, sorted with the most confident first, so a caller can present
 * a sensible default selection without hiding the rest.
 */
export async function detectAgents(root = process.cwd()): Promise<Detection[]> {
  const detections: Detection[] = []

  for (const probe of PROBES) {
    const evidence: string[] = []

    for (const path of probe.strong) {
      if (await exists(join(root, path))) evidence.push(path)
    }

    let confidence: Detection['confidence'] | null = evidence.length > 0 ? 'certain' : null

    if (!confidence && probe.weak) {
      for (const path of probe.weak) {
        if (await exists(join(root, path))) evidence.push(path)
      }
      if (evidence.length > 0) confidence = 'possible'
    }

    if (!confidence) continue

    detections.push({
      target: probe.target,
      label: probe.label,
      confidence,
      evidence,
      alreadyInstalled: await hasInstallation(root, probe.installMarker),
    })
  }

  const order: Record<Detection['confidence'], number> = { certain: 0, likely: 1, possible: 2 }
  return detections.sort((a, b) => order[a.confidence] - order[b.confidence])
}

/**
 * Detect the project's frontend stack, so generated guidance can be specific.
 *
 * Generic advice is worth much less than advice that knows you are on Next.js with
 * Tailwind v4. This reads the manifest rather than guessing from file extensions, because
 * the manifest is the only place the answer is actually recorded.
 */
export interface StackDetection {
  framework?: 'next' | 'react' | 'remix' | 'vite' | 'astro' | 'unknown'
  reactMajor?: number
  nextMajor?: number
  tailwindMajor?: number
  hasTypeScript: boolean
  motionLibraries: string[]
  packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun' | 'unknown'
  notes: string[]
}

function majorOf(range: string | undefined): number | undefined {
  if (!range) return undefined
  const match = /(\d+)/.exec(range.replace(/^[^\d]*/, ''))
  return match ? Number(match[1]) : undefined
}

export async function detectStack(root = process.cwd()): Promise<StackDetection> {
  const notes: string[] = []
  let manifest: Record<string, unknown> = {}

  try {
    manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as Record<string, unknown>
  } catch {
    notes.push('No package.json found, so stack detection is unavailable.')
  }

  const deps: Record<string, string> = {
    ...((manifest.dependencies as Record<string, string>) ?? {}),
    ...((manifest.devDependencies as Record<string, string>) ?? {}),
  }

  const framework: StackDetection['framework'] = deps.next
    ? 'next'
    : deps['@remix-run/react']
      ? 'remix'
      : deps.astro
        ? 'astro'
        : deps.vite
          ? 'vite'
          : deps.react
            ? 'react'
            : 'unknown'

  const motionLibraries = ['motion', 'framer-motion', 'gsap', '@react-spring/web', 'three', '@react-three/fiber']
    .filter((name) => name in deps)

  let packageManager: StackDetection['packageManager'] = 'unknown'
  if (await exists(join(root, 'pnpm-lock.yaml'))) packageManager = 'pnpm'
  else if (await exists(join(root, 'bun.lockb'))) packageManager = 'bun'
  else if (await exists(join(root, 'yarn.lock'))) packageManager = 'yarn'
  else if (await exists(join(root, 'package-lock.json'))) packageManager = 'npm'

  const tailwindMajor = majorOf(deps.tailwindcss)
  if (tailwindMajor !== undefined && tailwindMajor < 4) {
    notes.push(
      'Tailwind v3 detected. The generated theme uses the v4 CSS-first configuration model, so it will not apply until you upgrade.',
    )
  }

  const reactMajor = majorOf(deps.react)
  if (reactMajor !== undefined && reactMajor < 19) {
    notes.push('React 18 or earlier detected. Components requiring React 19 features will need adjustment.')
  }

  const result: StackDetection = {
    framework,
    hasTypeScript: 'typescript' in deps || (await exists(join(root, 'tsconfig.json'))),
    motionLibraries,
    packageManager,
    notes,
  }
  if (reactMajor !== undefined) result.reactMajor = reactMajor
  const nextMajor = majorOf(deps.next)
  if (nextMajor !== undefined) result.nextMajor = nextMajor
  if (tailwindMajor !== undefined) result.tailwindMajor = tailwindMajor

  return result
}
