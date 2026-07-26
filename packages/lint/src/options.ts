// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Option reading, done defensively.
 *
 * ESLint validates options against `meta.schema` before `create` runs, so in a well-behaved
 * host these helpers are belt and braces. They exist anyway because this package is also
 * consumed by tooling that calls `create` directly — the Vishwakarma CLI auditor runs the
 * same rules over a file without an ESLint config in sight — and in that path nothing has
 * validated anything. A rule that trusts its options and gets a string where it expected an
 * array throws inside the traversal, which is the one failure a linter must not have.
 *
 * There is also a second source of configuration: `settings.vishwakarma`. Spacing scales and
 * colour tokens are properties of the design system, not of an individual rule, and making
 * each rule carry its own copy guarantees they drift apart. Per-rule options win where both
 * are present, because the narrower statement of intent is the more deliberate one.
 */

import type { JsonSchema, RuleModule } from './rule-types.js'

/**
 * The slice of the context these helpers need.
 *
 * Narrower than {@link RuleContext} on purpose: a context parameterised by its message ids is
 * invariant in `report`, so a helper typed against `RuleContext<string>` would reject every
 * rule that names its messages. Asking for exactly the two fields we read sidesteps that
 * entirely and keeps the helpers usable from the CLI auditor, which has no `report` at all.
 */
export interface ConfigurableContext {
  options: readonly unknown[]
  settings?: Readonly<Record<string, unknown>>
  filename?: string
  getFilename?: () => string
}

/** The key under which shared design-system configuration is read from `settings`. */
export const SETTINGS_KEY = 'vishwakarma'

/** Base URL for rule documentation. */
const DOCS_BASE = 'https://vishwakarma.dev/lint/rules'

/**
 * The documentation URL for a rule.
 *
 * Every rule carries one. A diagnostic without a link is a diagnostic the reader resolves by
 * deleting the offending line or disabling the rule, because those are the only two actions
 * available to someone who does not know why the rule exists.
 */
export function docsUrl(name: string): string {
  return `${DOCS_BASE}/${name}`
}

/**
 * Identity function that pins a rule's message ids and option tuple.
 *
 * Written as a helper rather than an `as const satisfies` so that a message id used in
 * `context.report` but missing from `meta.messages` is a compile error, which is the single
 * most common way a rule ships broken: the host renders the id verbatim and the user sees
 * `rawColour` instead of a sentence.
 */
export function createRule<
  MessageIds extends string,
  Options extends readonly unknown[] = readonly unknown[],
>(rule: RuleModule<MessageIds, Options>): RuleModule<MessageIds, Options> {
  return rule
}

/** Narrow an unknown value to a plain object. */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

/** Read a boolean option, falling back when absent or of the wrong type. */
export function readBoolean(
  source: Record<string, unknown> | undefined,
  key: string,
  fallback: boolean,
): boolean {
  const value = source?.[key]
  return typeof value === 'boolean' ? value : fallback
}

/** Read a finite number option. */
export function readNumber(
  source: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
): number {
  const value = source?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Read a string option. */
export function readString(
  source: Record<string, unknown> | undefined,
  key: string,
  fallback: string,
): string {
  const value = source?.[key]
  return typeof value === 'string' ? value : fallback
}

/** Read an array of strings, discarding non-string entries rather than failing. */
export function readStringArray(
  source: Record<string, unknown> | undefined,
  key: string,
  fallback: readonly string[],
): string[] {
  const value = source?.[key]
  if (!Array.isArray(value)) return [...fallback]
  return value.filter((entry): entry is string => typeof entry === 'string')
}

/** Read an array of finite numbers. */
export function readNumberArray(
  source: Record<string, unknown> | undefined,
  key: string,
  fallback: readonly number[],
): number[] {
  const value = source?.[key]
  if (!Array.isArray(value)) return [...fallback]
  const numbers = value.filter(
    (entry): entry is number => typeof entry === 'number' && Number.isFinite(entry),
  )
  return numbers.length > 0 ? numbers : [...fallback]
}

/** Read a `Record<string, string>` option, e.g. a token map. */
export function readStringRecord(
  source: Record<string, unknown> | undefined,
  key: string,
): Record<string, string> {
  const value = asRecord(source?.[key])
  if (!value) return {}
  const result: Record<string, string> = {}
  for (const [name, entry] of Object.entries(value)) {
    if (typeof entry === 'string') result[name] = entry
  }
  return result
}

/**
 * The first option object, merged over shared `settings.vishwakarma`.
 *
 * Shallow by design. A deep merge of a spacing scale would mean a project could not *shrink*
 * its scale in one rule without editing the shared settings, and "add only" configuration is
 * how scales end up with thirty steps.
 */
export function resolveOptions(context: ConfigurableContext): Record<string, unknown> {
  const shared = asRecord(context.settings?.[SETTINGS_KEY]) ?? {}
  const own = asRecord(context.options[0]) ?? {}
  return { ...shared, ...own }
}

/** The file being linted, tolerating hosts that expose it as a method rather than a field. */
export function currentFilename(context: ConfigurableContext): string {
  if (typeof context.filename === 'string') return context.filename
  if (typeof context.getFilename === 'function') return context.getFilename()
  return '<input>'
}

/**
 * A schema fragment for the `[{ ... }]` option shape every rule in this package uses.
 *
 * `additionalProperties: false` is deliberate. A silently-ignored misspelled option is worse
 * than a config error: the user believes the rule is configured and it is not, so they
 * conclude the rule does not work and turn it off.
 */
export function objectSchema(properties: Readonly<Record<string, JsonSchema>>): JsonSchema[] {
  return [{ type: 'object', properties, additionalProperties: false }]
}

/** Schema fragment for an array of strings. */
export const stringArraySchema: JsonSchema = {
  type: 'array',
  items: { type: 'string' },
}

/** Schema fragment for an array of numbers. */
export const numberArraySchema: JsonSchema = {
  type: 'array',
  items: { type: 'number' },
}

/** Schema fragment for a flat `Record<string, string>`. */
export const stringRecordSchema: JsonSchema = {
  type: 'object',
  additionalProperties: { type: 'string' },
}
