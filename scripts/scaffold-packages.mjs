#!/usr/bin/env node
/**
 * Generates the per-package manifest, tsconfig, and build config for every workspace
 * package from one declarative table.
 *
 * Nineteen packages hand-maintained means nineteen chances for the build config to drift,
 * and drift in build config surfaces as mysterious consumer-side bugs — a package that
 * ships CommonJS when it claims ESM, or types that resolve under one bundler and not
 * another. Generating them keeps the whole workspace honest, and makes a policy change
 * (say, adding an export condition) a one-line edit rather than a nineteen-file sweep.
 *
 * Run: node scripts/scaffold-packages.mjs
 */

import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Versions pinned in one place so every package agrees. */
const V = {
  react: '^19.1.0',
  reactDom: '^19.1.0',
  reactTypes: '^19.1.0',
  next: '^15.5.0',
  motion: '^12.23.0',
  gsap: '^3.13.0',
  three: '^0.180.0',
  threeTypes: '^0.180.0',
  fiber: '^9.3.0',
  drei: '^10.7.0',
  tailwind: '^4.1.0',
  zod: '^4.0.0',
  mcpSdk: '^1.18.0',
  commander: '^14.0.0',
  prompts: '^2.4.2',
  picocolors: '^1.1.1',
  yaml: '^2.8.0',
  fastGlob: '^3.3.3',
  testingLibrary: '^16.3.0',
  jsdom: '^26.1.0',
  axeCore: '^4.10.0',
}

/**
 * The package graph.
 *
 * `kind` drives which build preset is emitted:
 *   - `lib`  : plain TypeScript, no React
 *   - `react`: React component package, gets the "use client" banner handling
 *   - `cli`  : executable with a bin entry
 *   - `node` : Node-only runtime, no browser build
 */
const PACKAGES = [
  {
    name: 'core',
    kind: 'lib',
    description:
      'Design intelligence primitives: perceptual colour, modular scales, the Motion Grammar, and the Design Contract checker.',
    keywords: ['design-system', 'color', 'oklch', 'design-tokens', 'accessibility'],
    deps: {},
  },
  {
    name: 'tokens',
    kind: 'lib',
    description: 'Design token schema, the default token set, and transforms to CSS, Tailwind, and TypeScript.',
    keywords: ['design-tokens', 'css-variables', 'theming'],
    deps: { '@vishwakarma/core': 'workspace:*' },
  },
  {
    name: 'theme',
    kind: 'react',
    description: 'Runtime theme engine: flash-free theme switching, density and contrast modes, multi-brand support.',
    keywords: ['theming', 'dark-mode', 'css-variables'],
    deps: { '@vishwakarma/tokens': 'workspace:*' },
    peers: { react: V.react, 'react-dom': V.reactDom },
  },
  {
    name: 'motion',
    kind: 'react',
    description: 'Motion primitives implementing the Vishwakarma Motion Grammar, with reduced-motion built in.',
    keywords: ['animation', 'motion', 'framer-motion', 'react', 'reduced-motion'],
    deps: { '@vishwakarma/core': 'workspace:*' },
    peers: { react: V.react, 'react-dom': V.reactDom, motion: V.motion },
    optionalPeers: ['motion'],
  },
  {
    name: 'layout',
    kind: 'react',
    description: 'Composition primitives: intrinsic layouts, bento grids, container-query components, and full-bleed sections.',
    keywords: ['layout', 'css-grid', 'container-queries', 'responsive', 'bento'],
    deps: { '@vishwakarma/core': 'workspace:*' },
    peers: { react: V.react, 'react-dom': V.reactDom },
  },
  {
    name: 'skills',
    kind: 'node',
    description: 'The Vishwakarma skill catalog and the VSM manifest format, schema, and validator.',
    keywords: ['ai', 'agent-skills', 'claude-code', 'cursor', 'prompt-engineering'],
    deps: { '@vishwakarma/core': 'workspace:*', yaml: V.yaml },
  },
  {
    name: 'adapters',
    kind: 'node',
    description: 'Compiles Vishwakarma skills to every agent’s native format: Claude Code, Cursor, Windsurf, Codex, Gemini CLI and more.',
    keywords: ['ai', 'agents', 'claude-code', 'cursor', 'windsurf', 'agents-md'],
    deps: { '@vishwakarma/skills': 'workspace:*', yaml: V.yaml },
  },
  {
    name: 'mcp',
    kind: 'node',
    description: 'Model Context Protocol server exposing Vishwakarma skills, tokens, components, and audits to any MCP client.',
    keywords: ['mcp', 'model-context-protocol', 'ai', 'agents'],
    deps: {
      '@vishwakarma/skills': 'workspace:*',
      '@vishwakarma/core': 'workspace:*',
      '@vishwakarma/tokens': 'workspace:*',
      '@modelcontextprotocol/sdk': V.mcpSdk,
      zod: V.zod,
    },
    bin: { 'vishwakarma-mcp': './dist/server.js' },
  },
  {
    name: 'primitives',
    kind: 'react',
    description: 'Headless, accessibility-first React primitives implementing the ARIA authoring patterns.',
    keywords: ['headless-ui', 'accessibility', 'aria', 'react', 'primitives'],
    deps: { '@vishwakarma/core': 'workspace:*' },
    peers: { react: V.react, 'react-dom': V.reactDom },
  },
  {
    name: 'ui',
    kind: 'react',
    description: 'Styled React 19 component library built on Vishwakarma primitives and tokens.',
    keywords: ['react', 'components', 'ui', 'design-system', 'tailwindcss'],
    deps: {
      '@vishwakarma/primitives': 'workspace:*',
      '@vishwakarma/tokens': 'workspace:*',
      '@vishwakarma/motion': 'workspace:*',
    },
    peers: { react: V.react, 'react-dom': V.reactDom },
  },
  {
    name: 'scroll',
    kind: 'react',
    description: 'Scroll experiences: reveals, scroll-linked animation, pinned sequences, and parallax that degrades safely.',
    keywords: ['scroll', 'animation', 'intersection-observer', 'gsap', 'scrolltrigger'],
    deps: { '@vishwakarma/core': 'workspace:*', '@vishwakarma/motion': 'workspace:*' },
    peers: { react: V.react, 'react-dom': V.reactDom, gsap: V.gsap },
    optionalPeers: ['gsap'],
  },
  {
    name: 'three',
    kind: 'react',
    description: 'React Three Fiber helpers with performance budgets, lazy loading, and reduced-motion handling.',
    keywords: ['threejs', 'react-three-fiber', 'webgl', '3d'],
    deps: { '@vishwakarma/core': 'workspace:*' },
    peers: {
      react: V.react,
      'react-dom': V.reactDom,
      three: V.three,
      '@react-three/fiber': V.fiber,
      '@react-three/drei': V.drei,
    },
    optionalPeers: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  {
    name: 'tailwind',
    kind: 'lib',
    description: 'Tailwind CSS v4 preset generated from Vishwakarma design tokens.',
    keywords: ['tailwindcss', 'tailwind-v4', 'preset', 'design-tokens'],
    deps: { '@vishwakarma/tokens': 'workspace:*' },
    peers: { tailwindcss: V.tailwind },
  },
  {
    name: 'audit',
    kind: 'node',
    description: 'Static and runtime auditors that evaluate generated UI against a Design Contract.',
    keywords: ['audit', 'design-system', 'accessibility', 'linting'],
    deps: { '@vishwakarma/core': 'workspace:*', 'fast-glob': V.fastGlob },
  },
  {
    name: 'lint',
    kind: 'node',
    description: 'Shareable lint rules that enforce design-system adherence in source code.',
    keywords: ['eslint', 'biome', 'lint', 'design-system'],
    deps: { '@vishwakarma/core': 'workspace:*' },
  },
  {
    name: 'testing',
    kind: 'node',
    description: 'Test utilities for accessibility, motion, contract conformance, and viewport sweeps.',
    keywords: ['testing', 'accessibility', 'axe', 'vitest'],
    deps: { '@vishwakarma/core': 'workspace:*' },
    devDeps: { '@testing-library/react': V.testingLibrary, 'axe-core': V.axeCore, jsdom: V.jsdom },
  },
  {
    name: 'registry',
    kind: 'node',
    description: 'Component registry: schema, resolution, and dependency graph for copy-in source distribution.',
    keywords: ['registry', 'components', 'cli', 'scaffolding'],
    deps: { zod: V.zod },
  },
  {
    name: 'prompts',
    kind: 'node',
    description: 'Composable prompt library for frontend generation, review, and refactoring.',
    keywords: ['prompts', 'prompt-engineering', 'ai', 'llm'],
    deps: {},
  },
  {
    name: 'cli',
    kind: 'cli',
    description: 'The Vishwakarma CLI: install skills into any agent, add components, generate themes, and audit output.',
    keywords: ['cli', 'ai', 'agent-skills', 'scaffolding'],
    deps: {
      '@vishwakarma/skills': 'workspace:*',
      '@vishwakarma/adapters': 'workspace:*',
      '@vishwakarma/tokens': 'workspace:*',
      commander: V.commander,
      prompts: V.prompts,
      picocolors: V.picocolors,
      'fast-glob': V.fastGlob,
      yaml: V.yaml,
    },
    bin: { vishwakarma: './dist/index.js', vk: './dist/index.js' },
  },
]

const REPO_URL = 'https://github.com/vishwakarma-dev/vishwakarma'

function packageJson(pkg) {
  const isReact = pkg.kind === 'react'
  const isCli = pkg.kind === 'cli' || Boolean(pkg.bin)

  const manifest = {
    name: `@vishwakarma/${pkg.name}`,
    version: '0.1.0',
    description: pkg.description,
    license: 'MIT',
    type: 'module',
    sideEffects: false,
    keywords: ['vishwakarma', ...(pkg.keywords ?? [])],
    repository: { type: 'git', url: `git+${REPO_URL}.git`, directory: `packages/${pkg.name}` },
    homepage: `${REPO_URL}/tree/main/packages/${pkg.name}#readme`,
    bugs: `${REPO_URL}/issues`,
    exports: {
      '.': { types: './dist/index.d.ts', import: './dist/index.js', default: './dist/index.js' },
      './package.json': './package.json',
    },
    main: './dist/index.js',
    types: './dist/index.d.ts',
    files: pkg.files ?? ['dist', 'README.md'],
    publishConfig: { access: 'public' },
    scripts: {
      build: 'tsup',
      dev: 'tsup --watch',
      typecheck: 'tsc --noEmit',
      test: 'vitest run --passWithNoTests',
      'test:watch': 'vitest',
      clean: 'rimraf dist .turbo',
    },
    dependencies: pkg.deps && Object.keys(pkg.deps).length ? pkg.deps : undefined,
    devDependencies: {
      ...(pkg.devDeps ?? {}),
      ...(isReact ? { '@types/react': V.reactTypes, react: V.react, 'react-dom': V.reactDom } : {}),
      tsup: '^8.5.0',
      typescript: '^5.9.0',
      vitest: '^3.2.0',
    },
    peerDependencies: pkg.peers,
    peerDependenciesMeta: pkg.optionalPeers
      ? Object.fromEntries(pkg.optionalPeers.map((name) => [name, { optional: true }]))
      : undefined,
    bin: isCli ? pkg.bin : undefined,
    engines: { node: '>=20.11.0' },
  }

  // Strip undefined so the emitted JSON stays clean.
  return JSON.stringify(
    Object.fromEntries(Object.entries(manifest).filter(([, value]) => value !== undefined)),
    null,
    2,
  )
}

function tsconfig(pkg) {
  const isReact = pkg.kind === 'react'
  return JSON.stringify(
    {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        outDir: './dist',
        rootDir: './src',
        ...(isReact ? {} : { lib: ['ES2023'], types: ['node'] }),
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.test.tsx'],
    },
    null,
    2,
  )
}

function tsupConfig(pkg) {
  const isReact = pkg.kind === 'react'
  const isNodeOnly = pkg.kind === 'node' || pkg.kind === 'cli'
  const entry =
    pkg.name === 'mcp' ? "['src/index.ts', 'src/server.ts']" : "['src/index.ts']"

  return `import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ${entry},
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Tree-shaking here runs a rollup pass that strips top-level directives, which silently
  // removes the "use client" banner and breaks the package inside a React Server
  // Components tree. Consumers tree-shake it anyway via "sideEffects": false, so the pass
  // buys us nothing and costs correctness.
  treeshake: ${isReact ? 'false' : 'true'},
  splitting: ${isReact ? 'true' : 'false'},
  target: '${isNodeOnly ? 'node20' : 'es2022'}',
  platform: '${isNodeOnly ? 'node' : 'browser'}',${
    isReact
      ? `
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  // React Server Components require the directive to survive bundling, and esbuild
  // strips top-level directives by default. Re-adding it at the banner keeps client
  // components usable inside a server-component tree.
  banner: { js: "'use client'" },`
      : ''
  }${
    pkg.kind === 'cli'
      ? `
  banner: { js: '#!/usr/bin/env node' },`
      : ''
  }
})
`
}

function readme(pkg) {
  return `# @vishwakarma/${pkg.name}

${pkg.description}

## Install

\`\`\`bash
pnpm add @vishwakarma/${pkg.name}
\`\`\`

## Documentation

Full documentation lives at [the Vishwakarma docs](${REPO_URL}#readme). This package's
reference is under \`docs/packages/${pkg.name}\`.

## Licence

MIT — see [LICENSE](${REPO_URL}/blob/main/LICENSE).
`
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function main() {
  let created = 0
  let skipped = 0

  for (const pkg of PACKAGES) {
    const dir = join(ROOT, 'packages', pkg.name)
    await mkdir(join(dir, 'src'), { recursive: true })

    const writes = [
      ['package.json', packageJson(pkg)],
      ['tsconfig.json', tsconfig(pkg)],
      ['tsup.config.ts', tsupConfig(pkg)],
      ['README.md', readme(pkg)],
    ]

    for (const [file, content] of writes) {
      await writeFile(join(dir, file), `${content.trimEnd()}\n`, 'utf8')
      created++
    }

    // Never clobber an index that already has real content in it.
    const indexPath = join(dir, 'src', 'index.ts')
    if (await exists(indexPath)) {
      const current = await readFile(indexPath, 'utf8')
      if (current.trim().length > 0) {
        skipped++
        continue
      }
    }
    await writeFile(
      indexPath,
      `export {}\n`,
      'utf8',
    )
  }

  process.stdout.write(
    `Scaffolded ${PACKAGES.length} packages (${created} config files written, ${skipped} existing entrypoints preserved).\n`,
  )
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? error}\n`)
  process.exit(1)
})
