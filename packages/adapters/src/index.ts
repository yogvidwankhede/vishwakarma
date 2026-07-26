/**
 * @vishwakarma/adapters
 *
 * Compiles one authored skill set into every coding agent's native instruction format.
 */

export {
  type RenderOptions,
  shiftHeadings,
  renderRules,
  renderVerification,
  renderBody,
  toFrontmatter,
  generatedBanner,
} from './render.js'

export {
  type Adapter,
  type AdapterContext,
  type EmittedFile,
  ADAPTERS,
  ADAPTER_LIST,
  getAdapter,
  claudeCodeAdapter,
  cursorAdapter,
  windsurfAdapter,
  clineAdapter,
  rooCodeAdapter,
  continueAdapter,
  codexAdapter,
  geminiAdapter,
  copilotAdapter,
  zedAdapter,
  aiderAdapter,
  universalAdapter,
  mcpAdapter,
} from './targets.js'

export {
  type CompileOptions,
  type CompileResult,
  type CompilePlan,
  type MergeResult,
  compile,
  mergeFile,
  removeSection,
  planFor,
  estimateContextCost,
} from './compile.js'

export {
  type Lockfile,
  type LockEntry,
  type FileStatus,
  type StatusReport,
  LOCKFILE_PATH,
  LOCKFILE_VERSION,
  hashContent,
  classify,
  buildLockfile,
  serialiseLockfile,
  parseLockfile,
  summariseStatuses,
} from './lockfile.js'
