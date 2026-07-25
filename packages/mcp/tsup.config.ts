import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/server.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'node20',
  platform: 'node',
})
