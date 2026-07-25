import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: true,
  target: 'es2022',
  platform: 'browser',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  // React Server Components require the directive to survive bundling, and esbuild
  // strips top-level directives by default. Re-adding it at the banner keeps client
  // components usable inside a server-component tree.
  banner: { js: "'use client'" },
})
