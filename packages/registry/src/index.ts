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
