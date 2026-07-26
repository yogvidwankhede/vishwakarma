// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

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
  treeshake: true,
  splitting: false,
  target: 'node20',
  platform: 'node',
  banner: { js: '#!/usr/bin/env node' },
})
