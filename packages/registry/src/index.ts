// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

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
  applicableFiles,
  type ConflictReason,
  type ConflictReport,
  type Disposition,
  detectConflicts,
  type ExistingFileReader,
  type FileDecision,
  formatConflicts,
} from './conflict.js'
export {
  CircularDependencyError,
  formatIssues,
  RegistryError,
  type RegistryIssue,
  type RegistryIssueCode,
  RegistryValidationError,
  UnknownItemError,
} from './errors.js'
export { contentEquals, hashContent, normaliseForHash, shortHash } from './hash.js'
export {
  baselineHash,
  emptyManifest,
  forgetItem,
  type InstalledFile,
  type InstalledItem,
  installedFileSchema,
  installedItemSchema,
  isInstalled,
  type Manifest,
  manifestSchema,
  type OutdatedItem,
  outdatedItems,
  recordInstall,
  recordPlan,
} from './manifest.js'
export {
  aliasSpecifier,
  DEFAULT_LAYOUT,
  type ImportAlias,
  isInside,
  joinPath,
  relativeSpecifier,
  resolveTargetPath,
  specifierExtension,
  stripExtension,
  type TargetLayout,
} from './paths.js'
export {
  findCycles,
  type InstallPlan,
  type ParsedSpecifier,
  type PlannedFile,
  type PlanWarning,
  type PlanWarningCode,
  parseSpecifier,
  type ResolvedItem,
  type ResolveOptions,
  resolveItem,
  resolvePlan,
  similarNames,
  topologicalOrder,
  unionSpecifiers,
} from './resolve.js'
export {
  type ImportRewrite,
  type PlanRewriteOptions,
  type PlanRewriteResult,
  type RewriteOptions,
  type RewriteResult,
  rewriteImports,
  rewritePlanFiles,
  type UnresolvedImport,
  type UnresolvedReason,
} from './rewrite-imports.js'
export {
  indexItems,
  isSafeRelativePath,
  REGISTRY_ITEM_TYPES,
  type RegistryFile,
  type RegistryIndex,
  type RegistryIndexInput,
  type RegistryItem,
  type RegistryItemInput,
  type RegistryItemType,
  registryFileSchema,
  registryIndexSchema,
  registryItemSchema,
  registryItemTypeSchema,
  SLUG_PATTERN,
} from './schema.js'

export {
  parseIndex,
  type ValidationFailure,
  type ValidationResult,
  type ValidationSuccess,
  validateIndex,
  validateItem,
} from './validate.js'
