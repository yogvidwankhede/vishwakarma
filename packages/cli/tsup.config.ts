import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'node20',
  platform: 'node',
  banner: { js: '#!/usr/bin/env node' },
})
