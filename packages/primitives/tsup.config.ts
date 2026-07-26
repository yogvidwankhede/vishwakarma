import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Tree-shaking here runs a rollup pass that strips top-level directives, which silently
  // removes the "use client" banner and breaks the package inside a React Server
  // Components tree. Consumers tree-shake it anyway via "sideEffects": false, so the pass
  // buys us nothing and costs correctness.
  treeshake: false,
  splitting: true,
  target: 'es2022',
  platform: 'browser',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  // React Server Components require the directive to survive bundling, and esbuild
  // strips top-level directives by default. Re-adding it at the banner keeps client
  // components usable inside a server-component tree.
  banner: { js: "'use client'" },
})
