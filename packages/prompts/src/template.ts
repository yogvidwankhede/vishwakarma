/**
 * The template language, kept as small as it can be while still being honest.
 *
 * Two forms, and no more:
 *
 * - `{{name}}` — substitute the value.
 * - `{{#name}} ... {{/name}}` — include the block only if `name` resolved to something
 *   non-empty.
 *
 * The conditional block exists because the alternative is worse. Without it, an optional
 * variable that was not supplied leaves either an empty line where an instruction used to
 * be, or — far more damaging — a dangling label like "Design tokens:" with nothing after
 * it, which a model reads as "there are no design tokens" rather than "this was not
 * specified". Sections let the whole instruction disappear when its input does.
 *
 * There is no nesting, no inversion, no loops, no expressions. A template language that
 * grows those becomes a thing to debug, and the failure mode of a mis-parsed prompt is not
 * a stack trace — it is a plausible answer to a question nobody asked. If a prompt needs
 * branching logic, build the text in TypeScript with {@link compose} where the branch is
 * visible and type-checked.
 */

import type { PromptVariable, VariableValue } from './types.js'

/**
 * Placeholder names: letters, digits, underscores, hyphens.
 *
 * Dots are excluded on purpose. Allowing `{{theme.colour}}` would imply path resolution
 * into objects, which is the first step towards the expression language this file exists to
 * avoid.
 */
const NAME = '[A-Za-z0-9_-]+'

const SECTION_PATTERN = new RegExp(`\\{\\{#(${NAME})\\}\\}([\\s\\S]*?)\\{\\{/\\1\\}\\}`, 'g')
const PLACEHOLDER_PATTERN = new RegExp(`\\{\\{\\s*(${NAME})\\s*\\}\\}`, 'g')

/** Every distinct name referenced by a template, in first-appearance order. */
export function collectPlaceholders(template: string): readonly string[] {
  const seen = new Set<string>()

  // Section openers are matched by the placeholder pattern's own scan? No — `{{#name}}`
  // contains a `#`, which `NAME` excludes, so sections have to be collected separately.
  for (const match of template.matchAll(SECTION_PATTERN)) {
    const name = match[1]
    if (name) seen.add(name)
  }
  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    const name = match[1]
    if (name) seen.add(name)
  }

  return [...seen]
}

/**
 * Turn a resolved value into the text that goes into the prompt.
 *
 * Lists become bullets rather than a comma-joined string because a model treats a bulleted
 * list as a set of separately addressable requirements and a comma-joined sentence as one
 * vague requirement. Booleans become `yes`/`no` for the same reason: `constraints: false`
 * reads like a configuration flag that has nothing to do with the instruction around it.
 */
export function formatValue(value: VariableValue, variable: PromptVariable): string {
  if (Array.isArray(value)) {
    return (value as readonly string[]).map((item) => `- ${item}`).join('\n')
  }
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'number') return String(value)
  // A `text` value is used as-is; trailing whitespace on a multi-line block is noise that
  // shows up as trailing spaces in the rendered prompt and in every diff of it.
  return variable.kind === 'text' ? value.trimEnd() : value.trim()
}

/**
 * Whether a formatted value should count as present for section purposes.
 *
 * Whitespace-only counts as absent. A caller passing `'  '` for an optional field has
 * supplied nothing, and rendering the surrounding instruction anyway produces exactly the
 * dangling-label failure sections exist to prevent.
 */
export function isPresent(text: string): boolean {
  return text.trim().length > 0
}

/**
 * Substitute resolved values into a template.
 *
 * Two properties matter here and both are easy to lose.
 *
 * The first is that substitution is single-pass: a value is never re-scanned for
 * placeholders. Prompt variables carry user- and model-supplied text, and a value
 * containing `{{something}}` — a code sample about templating, say — must appear
 * literally rather than being expanded against the same value map. The replacement callback
 * gives this for free, and it is also why the callback form is used instead of a string
 * replacement: a value containing `$&` or `$1` would otherwise be mangled by the
 * replacement-pattern syntax.
 *
 * The second is that unresolved placeholders are the caller's problem, not this function's.
 * It leaves them in place; {@link render} inspects the *template* — never the output — to
 * decide what was missing. Checking the output would misread a `{{...}}` that arrived
 * inside a value as a rendering failure.
 */
export function substitute(template: string, values: ReadonlyMap<string, string>): string {
  const withSections = template.replace(SECTION_PATTERN, (_match, rawName: string, body: string) => {
    const value = values.get(rawName)
    if (value === undefined || !isPresent(value)) return ''
    return body
  })

  const substituted = withSections.replace(PLACEHOLDER_PATTERN, (match, rawName: string) => {
    const value = values.get(rawName)
    return value === undefined ? match : value
  })

  return tidy(substituted)
}

/**
 * Collapse the whitespace that dropped sections leave behind.
 *
 * Removing a section leaves the blank lines that surrounded it, and three consecutive blank
 * lines in a prompt are not merely untidy — they read as a structural break, so the model
 * treats what follows as a separate, unrelated instruction block.
 */
function tidy(text: string): string {
  return text
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
