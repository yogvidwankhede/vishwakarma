/**
 * @vishwakarma/registry
 *
 * Copy-in component distribution: source is copied into the consumer's project so they own
 * and can modify it, rather than installed as a dependency they can only configure.
 *
 * The trade is real and worth stating. Ownership means no version lock and no fighting an
 * abstraction that does not fit — and it forfeits automatic updates, because there is no
 * package boundary to update across. That is why every installed file carries a version and
 * a content hash: without them a later update cannot tell "two versions behind" from "the
 * user rewrote this", and the only safe behaviour would be to never update anything.
 *
 * Nothing here touches the filesystem or the network. Reading existing files is a callback,
 * writing is the caller's job, and a plan is a plain value. That is what lets the same code
 * resolve an install in the CLI, in a documentation site rendering a preview, and in a test
 * with no disk at all.
 */

export {
  RegistryError,
  RegistryValidationError,
  UnknownItemError,
  CircularDependencyError,
  type RegistryIssueCode,
  type RegistryIssue,
  formatIssues,
} from './errors.js'

export { normaliseForHash, hashContent, shortHash, contentEquals } from './hash.js'

export {
  type ImportAlias,
  type TargetLayout,
  DEFAULT_LAYOUT,
  joinPath,
  resolveTargetPath,
  relativeSpecifier,
  isInside,
  aliasSpecifier,
  stripExtension,
  specifierExtension,
} from './paths.js'

export {
  REGISTRY_ITEM_TYPES,
  registryItemTypeSchema,
  registryFileSchema,
  registryItemSchema,
  registryIndexSchema,
  SLUG_PATTERN,
  type RegistryItemType,
  type RegistryFile,
  type RegistryItem,
  type RegistryItemInput,
  type RegistryIndex,
  type RegistryIndexInput,
  isSafeRelativePath,
  indexItems,
} from './schema.js'

export {
  type PlannedFile,
  type PlanWarningCode,
  type PlanWarning,
  type InstallPlan,
  type ResolvedItem,
  type ResolveOptions,
  type ParsedSpecifier,
  topologicalOrder,
  findCycles,
  resolvePlan,
  resolveItem,
  parseSpecifier,
  unionSpecifiers,
  similarNames,
} from './resolve.js'

export {
  type ImportRewrite,
  type UnresolvedReason,
  type UnresolvedImport,
  type RewriteResult,
  type RewriteOptions,
  type PlanRewriteOptions,
  type PlanRewriteResult,
  rewriteImports,
  rewritePlanFiles,
} from './rewrite-imports.js'

export {
  type InstalledFile,
  type InstalledItem,
  type Manifest,
  type OutdatedItem,
  installedFileSchema,
  installedItemSchema,
  manifestSchema,
  emptyManifest,
  recordInstall,
  recordPlan,
  forgetItem,
  baselineHash,
  outdatedItems,
  isInstalled,
} from './manifest.js'

export {
  type Disposition,
  type ConflictReason,
  type FileDecision,
  type ExistingFileReader,
  type ConflictReport,
  detectConflicts,
  formatConflicts,
  applicableFiles,
} from './conflict.js'

export {
  type ValidationSuccess,
  type ValidationFailure,
  type ValidationResult,
  validateIndex,
  validateItem,
  parseIndex,
} from './validate.js'
