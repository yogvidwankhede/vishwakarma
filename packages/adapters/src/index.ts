// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/adapters
 *
 * Compiles one authored skill set into every coding agent's native instruction format.
 */

export {
  type CompileOptions,
  type CompilePlan,
  type CompileResult,
  compile,
  estimateContextCost,
  type MergeResult,
  mergeFile,
  planFor,
  removeSection,
} from './compile.js'
export {
  buildLockfile,
  classify,
  type FileStatus,
  hashContent,
  LOCKFILE_PATH,
  LOCKFILE_VERSION,
  type LockEntry,
  type Lockfile,
  parseLockfile,
  type StatusReport,
  serialiseLockfile,
  summariseStatuses,
} from './lockfile.js'
export {
  generatedBanner,
  type RenderOptions,
  renderBody,
  renderRules,
  renderVerification,
  shiftHeadings,
  toFrontmatter,
} from './render.js'
export {
  ADAPTER_LIST,
  ADAPTERS,
  type Adapter,
  type AdapterContext,
  aiderAdapter,
  claudeCodeAdapter,
  clineAdapter,
  codexAdapter,
  continueAdapter,
  copilotAdapter,
  cursorAdapter,
  type EmittedFile,
  geminiAdapter,
  getAdapter,
  mcpAdapter,
  rooCodeAdapter,
  universalAdapter,
  windsurfAdapter,
  zedAdapter,
} from './targets.js'
