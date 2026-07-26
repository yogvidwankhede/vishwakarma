// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Validating a registry, and saying something useful when it is wrong.
 *
 * Schema validation is the easy half and zod does it. The half that decides whether anyone
 * enjoys authoring a registry is everything the schema cannot express: a dependency naming
 * an item that does not exist, two items claiming the same name, a cycle. Those are the
 * mistakes people actually make, they are invisible until resolution fails at install time
 * in someone else's project, and a schema validator that reports none of them gives a
 * misleading all-clear.
 *
 * Two rules shape the output. Every problem is reported, not just the first — fixing a
 * hand-written registry one error per run is a miserable loop. And every issue carries a
 * path into the document, so an editor or a CI annotation can point at the line rather than
 * making the author search for the offending item by eye.
 */

import type { z } from 'zod'
import { RegistryValidationError, type RegistryIssue } from './errors.js'
import { findCycles, similarNames } from './resolve.js'
import {
  registryIndexSchema,
  registryItemSchema,
  type RegistryIndex,
  type RegistryItem,
} from './schema.js'

/** A registry that parsed and passed every semantic check. */
export interface ValidationSuccess {
  ok: true
  index: RegistryIndex
  /** Always empty on success; present so callers can read `result.issues` unconditionally. */
  issues: readonly RegistryIssue[]
}

/** A registry that failed. `issues` is never empty. */
export interface ValidationFailure {
  ok: false
  issues: readonly RegistryIssue[]
}

/** The outcome of {@link validateIndex}. */
export type ValidationResult = ValidationSuccess | ValidationFailure

/**
 * Validate an unknown value as a registry index.
 *
 * Returns a result rather than throwing, because the common callers — a CLI printing a
 * report, a CI check annotating a pull request — want the whole list and an exit code, not a
 * stack trace. {@link parseIndex} is the throwing variant for the cases where a registry
 * failing to parse genuinely is exceptional.
 */
export function validateIndex(input: unknown): ValidationResult {
  const parsed = registryIndexSchema.safeParse(input)
  if (!parsed.success) return { ok: false, issues: fromZod(parsed.error) }

  const index = parsed.data
  const issues = checkSemantics(index)
  return issues.length > 0 ? { ok: false, issues } : { ok: true, index, issues: [] }
}

/**
 * Validate an unknown value as a single item.
 *
 * Cross-item checks are impossible here by definition, so this catches shape errors only.
 * It exists for registry build pipelines that assemble an index from one file per item and
 * want to fail on the file that is wrong rather than on the aggregate.
 */
export function validateItem(
  input: unknown,
): { ok: true; item: RegistryItem } | { ok: false; issues: readonly RegistryIssue[] } {
  const parsed = registryItemSchema.safeParse(input)
  return parsed.success
    ? { ok: true, item: parsed.data }
    : { ok: false, issues: fromZod(parsed.error) }
}

/**
 * Parse a registry index or throw.
 *
 * @throws {RegistryValidationError} carrying every issue found.
 */
export function parseIndex(input: unknown): RegistryIndex {
  const result = validateIndex(input)
  if (!result.ok) throw new RegistryValidationError(result.issues)
  return result.index
}

/** Everything the schema cannot check, which is everything that spans two items. */
function checkSemantics(index: RegistryIndex): RegistryIssue[] {
  const issues: RegistryIssue[] = []
  const names = new Set<string>()
  const seenAt = new Map<string, number>()

  if (index.items.length === 0) {
    // Almost always a build that globbed the wrong directory rather than a deliberate empty
    // registry, and it fails silently at every consumer as "no items found".
    issues.push({
      code: 'empty-index',
      path: 'items',
      message: 'registry contains no items',
      hint: 'If this was built from source files, check that the glob matched anything.',
    })
  }

  index.items.forEach((item, position) => {
    if (names.has(item.name)) {
      const first = seenAt.get(item.name)
      issues.push({
        code: 'duplicate-item',
        path: `items.${position}.name`,
        message: `duplicate item name "${item.name}"`,
        hint: `First declared at items.${first ?? 0}. Names are the identity of an item across registries; two items cannot share one.`,
      })
    } else {
      names.add(item.name)
      seenAt.set(item.name, position)
    }

    const targets = new Map<string, number>()
    item.files.forEach((file, fileIndex) => {
      if (file.target === undefined) return
      const previous = targets.get(file.target)
      if (previous !== undefined) {
        issues.push({
          code: 'duplicate-target',
          path: `items.${position}.files.${fileIndex}.target`,
          message: `"${item.name}" writes ${file.target} twice`,
          hint: `Also declared at files.${previous}. The second write would silently replace the first.`,
        })
      }
      targets.set(file.target, fileIndex)
    })
  })

  index.items.forEach((item, position) => {
    item.registryDependencies.forEach((dependency, dependencyIndex) => {
      const path = `items.${position}.registryDependencies.${dependencyIndex}`
      if (dependency === item.name) {
        issues.push({
          code: 'self-dependency',
          path,
          message: `"${item.name}" depends on itself`,
          hint: 'Remove the entry; an item is always installed alongside its own files.',
        })
        return
      }
      if (!names.has(dependency)) {
        const suggestions = similarNames(dependency, [...names])
        issues.push({
          code: 'unknown-dependency',
          path,
          message: `"${item.name}" depends on "${dependency}", which is not in this registry`,
          hint:
            suggestions.length > 0
              ? `Did you mean ${suggestions.map((name) => `"${name}"`).join(', ')}?`
              : 'registryDependencies name other items in the same index. npm packages belong in dependencies.',
        })
      }
    })
  })

  for (const cycle of findCycles(index)) {
    const head = cycle[0] ?? ''
    const position = index.items.findIndex((item) => item.name === head)
    issues.push({
      code: 'cycle',
      path: position >= 0 ? `items.${position}.registryDependencies` : 'items',
      message: `circular dependency: ${cycle.join(' -> ')}`,
      hint: 'No install order exists for a cycle. Extract the shared part into a third item that both depend on.',
    })
  }

  return issues
}

/**
 * Convert zod's issues into ours.
 *
 * Kept behind a function so zod stays an implementation detail: consumers reading
 * `issue.path` should not have to care that it was once an array of property keys, nor be
 * broken by a zod major version changing that shape.
 */
function fromZod(error: z.ZodError): RegistryIssue[] {
  return error.issues.map((issue) => {
    const path = issue.path.map((segment) => String(segment)).join('.')
    const hint = hintFor(path)
    return {
      code: 'schema' as const,
      path,
      message: issue.message,
      ...(hint === undefined ? {} : { hint }),
    }
  })
}

/** Extra guidance for the fields people get wrong most often. */
function hintFor(path: string): string | undefined {
  if (path.endsWith('.name') || path === 'name') {
    return 'Item names are lowercase slugs: letters, digits, hyphens and dots.'
  }
  if (path.endsWith('.type')) {
    return 'One of: component, hook, util, block, template, style.'
  }
  if (path.endsWith('.path') || path.endsWith('.target')) {
    return 'Paths are relative POSIX paths inside the project. A path that escapes upwards would let a registry write anywhere on the machine, so it is refused rather than sanitised.'
  }
  if (path.endsWith('.version')) {
    return 'Versions are semver. They are what a later update compares against, so an item without a meaningful version can never be reported as out of date.'
  }
  return undefined
}
