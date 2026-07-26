// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Token transforms.
 *
 * One authored token set becomes CSS custom properties, a Tailwind v4 theme block, and a
 * typed TypeScript module. The reason to generate all three rather than maintain them is
 * not convenience — it is that hand-maintained parallel definitions always drift, and the
 * drift is invisible until a colour is subtly wrong in one place only.
 *
 * Every transform below is pure: tokens in, string out. No filesystem access, so the same
 * functions run in the CLI, in a build plugin, and in the MCP server that lets an agent
 * ask "what would this token set look like as CSS".
 */

import {
  isReference,
  referenceTarget,
  resolveTokens,
  type ShadowValue,
  type Token,
  type TokenSet,
  type TokenValue,
} from './schema.js'

/* -------------------------------------------------------------------------- */
/* Naming                                                                      */
/* -------------------------------------------------------------------------- */

export interface NamingOptions {
  /** Prefix for generated custom properties, without leading dashes. */
  prefix?: string
  /** Separator between path segments. */
  separator?: string
}

/**
 * Convert a token path to a CSS custom property name.
 *
 * Dots become the separator, and camelCase segments are split, so `font.lineHeight.base`
 * becomes `--vk-font-line-height-base`. Keeping the generated name mechanically derivable
 * from the path matters more than keeping it short: a developer reading a computed style
 * in devtools can work backwards to the token, and an agent can construct the name without
 * consulting a mapping table.
 */
export function toCssVariableName(path: string, options: NamingOptions = {}): string {
  const { prefix = 'vk', separator = '-' } = options
  const normalised = path
    .split('.')
    .map((segment) => segment.replace(/([a-z0-9])([A-Z])/g, `$1${separator}$2`).toLowerCase())
    .join(separator)
  return prefix ? `--${prefix}${separator}${normalised}` : `--${normalised}`
}

/** Convert a token path to a valid TypeScript identifier chain. */
export function toTsPath(path: string): string[] {
  return path.split('.')
}

/* -------------------------------------------------------------------------- */
/* Value serialisation                                                         */
/* -------------------------------------------------------------------------- */

function serialiseShadow(value: ShadowValue): string {
  const inset = value.inset ? 'inset ' : ''
  return `${inset}${value.offsetX} ${value.offsetY} ${value.blur} ${value.spread} ${value.color}`
}

/** Structural check, since a token value is a union and shadows are the only member with offsets. */
function isShadowValue(value: unknown): value is ShadowValue {
  return typeof value === 'object' && value !== null && 'offsetX' in value && 'blur' in value
}

/**
 * Render a token value as CSS.
 *
 * References are emitted as `var()` rather than being flattened to their literal value.
 * That is the entire mechanism behind runtime theming: if a semantic token compiled to a
 * literal, changing the primitive under a `[data-theme]` selector would have no effect on
 * anything referencing it, because the reference would already have been resolved away at
 * build time.
 */
export function serialiseCssValue(value: TokenValue | string, options: NamingOptions = {}): string {
  if (typeof value === 'string') {
    if (isReference(value)) return `var(${toCssVariableName(referenceTarget(value), options)})`
    // Handle references embedded inside a larger expression.
    return value.replace(
      /\{([a-zA-Z0-9._-]+)\}/g,
      (_match: string, path: string) => `var(${toCssVariableName(path, options)})`,
    )
  }
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        isShadowValue(entry) ? serialiseShadow(entry) : serialiseCssValue(entry as TokenValue, options),
      )
      .join(', ')
  }
  if (value && typeof value === 'object') {
    if (isShadowValue(value)) return serialiseShadow(value)
    if ('width' in value && 'style' in value) {
      const border = value as { width: string; style: string; color: string }
      return `${border.width} ${border.style} ${serialiseCssValue(border.color, options)}`
    }
  }
  return String(value)
}

/* -------------------------------------------------------------------------- */
/* CSS                                                                         */
/* -------------------------------------------------------------------------- */

export interface CssOptions extends NamingOptions {
  /** Selector for the base theme. */
  selector?: string
  /**
   * How to scope theme overrides. `attribute` produces `[data-theme="dark"]`, `class`
   * produces `.dark`, and `media` produces a `prefers-color-scheme` block.
   *
   * `attribute` is the default because it is the only one of the three that supports a
   * three-state control — system, light, dark — which is what users actually want. A
   * media-query-only theme cannot express "I want dark even though my OS is light".
   */
  themeStrategy?: 'attribute' | 'class' | 'media'
  /** Emit `@media (prefers-color-scheme: dark)` in addition to the explicit selector. */
  includeSystemPreference?: boolean
  /** Include the token description as a CSS comment. */
  includeComments?: boolean
  /** Omit tokens marked private. */
  skipPrivate?: boolean
}

function themeSelector(theme: string, options: CssOptions): string {
  switch (options.themeStrategy ?? 'attribute') {
    case 'class':
      return `.${theme}`
    case 'media':
      return `@media (prefers-color-scheme: ${theme})`
    default:
      return `[data-theme="${theme}"]`
  }
}

/** Emit CSS custom properties for a token set, including every theme. */
export function toCss(set: TokenSet, options: CssOptions = {}): string {
  const {
    selector = ':root',
    includeComments = true,
    skipPrivate = true,
    includeSystemPreference = true,
  } = options

  const visible = set.tokens.filter((token) => !(skipPrivate && token.private))
  const lines: string[] = []

  lines.push(`/* Generated from the "${set.name}" token set, version ${set.version}. */`)
  lines.push('/* Do not edit by hand: regenerate with `vishwakarma tokens build`. */')
  lines.push('')

  /* --- base ------------------------------------------------------------- */
  lines.push(`${selector} {`)
  lines.push('  color-scheme: light;')

  let currentNamespace = ''
  for (const token of visible) {
    const namespace = token.path.split('.').slice(0, 2).join('.')
    if (namespace !== currentNamespace) {
      lines.push('')
      currentNamespace = namespace
    }
    if (includeComments && token.description) {
      lines.push(`  /* ${token.description} */`)
    }
    lines.push(`  ${toCssVariableName(token.path, options)}: ${serialiseCssValue(token.value, options)};`)
  }
  lines.push('}')

  /* --- themes ----------------------------------------------------------- */
  for (const theme of set.themes ?? []) {
    const overrides = visible.filter((token) => token.themes && theme in token.themes)
    if (overrides.length === 0) continue

    const body = overrides.map(
      (token) =>
        `  ${toCssVariableName(token.path, options)}: ${serialiseCssValue(
          token.themes?.[theme] as TokenValue,
          options,
        )};`,
    )

    lines.push('')
    const sel = themeSelector(theme, options)
    if (sel.startsWith('@media')) {
      lines.push(`${sel} {`)
      lines.push(`  ${selector} {`)
      lines.push(`    color-scheme: ${theme};`)
      lines.push(...body.map((line) => `  ${line}`))
      lines.push('  }')
      lines.push('}')
    } else {
      lines.push(`${sel} {`)
      lines.push(`  color-scheme: ${theme};`)
      lines.push(...body)
      lines.push('}')

      // Honour the system preference too, but only when the user has not chosen
      // explicitly. Without the `:not([data-theme])` guard, a user who picked light on a
      // dark-preferring OS would be overridden by their own operating system.
      if (includeSystemPreference && theme === 'dark' && (options.themeStrategy ?? 'attribute') === 'attribute') {
        lines.push('')
        lines.push('@media (prefers-color-scheme: dark) {')
        lines.push(`  ${selector}:not([data-theme]) {`)
        lines.push('    color-scheme: dark;')
        lines.push(...body.map((line) => `  ${line}`))
        lines.push('  }')
        lines.push('}')
      }
    }
  }

  return `${lines.join('\n')}\n`
}

/* -------------------------------------------------------------------------- */
/* Tailwind v4                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Tailwind v4 namespaces. A variable declared inside `@theme` under the right namespace
 * generates utilities automatically — `--color-*` produces `bg-*`, `text-*`, `border-*`
 * and so on. Getting a token into the wrong namespace means it silently produces no
 * utility at all, which is the most common cause of "my Tailwind theme isn't working".
 */
const TAILWIND_NAMESPACE: Partial<Record<string, string>> = {
  color: 'color',
  space: 'spacing',
  radius: 'radius',
  'font.family': 'font',
  'font.size': 'text',
  'font.weight': 'font-weight',
  'font.tracking': 'tracking',
  'font.lineHeight': 'leading',
  elevation: 'shadow',
  'motion.duration': 'duration',
  'motion.curve': 'ease',
  'motion.easing': 'ease',
  layer: 'z',
}

function tailwindVariable(path: string): string | null {
  const twoSegment = path.split('.').slice(0, 2).join('.')
  const oneSegment = path.split('.')[0] as string

  const namespace = TAILWIND_NAMESPACE[twoSegment] ?? TAILWIND_NAMESPACE[oneSegment]
  if (!namespace) return null

  const prefixLength = TAILWIND_NAMESPACE[twoSegment] ? 2 : 1
  const rest = path
    .split('.')
    .slice(prefixLength)
    .map((segment) => segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase())
    .join('-')

  return rest ? `--${namespace}-${rest}` : `--${namespace}`
}

export interface TailwindOptions extends NamingOptions {
  /**
   * Emit `--color-x: var(--vk-color-x)` indirection rather than literal values.
   *
   * This is on by default and it matters: with indirection, switching `[data-theme]` at
   * runtime changes what every Tailwind utility resolves to, because the utility points at
   * a variable that the theme block redefines. Without it, Tailwind bakes the light value
   * into every class and dark mode simply does not work.
   */
  referenceRuntimeVariables?: boolean
}

/** Emit a Tailwind v4 `@theme` block. */
export function toTailwindTheme(set: TokenSet, options: TailwindOptions = {}): string {
  const { referenceRuntimeVariables = true } = options
  const resolved = resolveTokens(set)

  const lines: string[] = []
  lines.push(`/* Tailwind v4 theme generated from "${set.name}" v${set.version}. */`)
  lines.push('/* Import after `@import "tailwindcss";` to register these as utilities. */')
  lines.push('')
  lines.push('@theme {')

  let currentNamespace = ''
  let emitted = 0

  for (const token of set.tokens) {
    if (token.private) continue
    const variable = tailwindVariable(token.path)
    if (!variable) continue

    const namespace = variable.split('-')[2] ?? ''
    if (namespace !== currentNamespace) {
      lines.push('')
      currentNamespace = namespace
    }

    const value = referenceRuntimeVariables
      ? `var(${toCssVariableName(token.path, options)})`
      : serialiseCssValue(resolved.get(token.path) as TokenValue, options)

    lines.push(`  ${variable}: ${value};`)
    emitted++
  }

  lines.push('}')
  lines.push('')
  lines.push(`/* ${emitted} tokens mapped into the Tailwind theme. */`)

  return `${lines.join('\n')}\n`
}

/* -------------------------------------------------------------------------- */
/* TypeScript                                                                  */
/* -------------------------------------------------------------------------- */

export interface TypeScriptOptions extends NamingOptions {
  /** Name of the exported constant. */
  exportName?: string
  /** Emit `var()` strings rather than resolved literals, so values stay theme-aware. */
  asCssVariables?: boolean
}

interface NestedRecord {
  [key: string]: string | number | NestedRecord
}

/**
 * Emit a typed TypeScript module.
 *
 * Values default to `var()` references rather than literals for the same reason the CSS
 * transform keeps references: a literal captured at build time cannot participate in
 * theming. Code doing `style={{ color: tokens.color.text.primary }}` should follow the
 * active theme, and it only does so if the emitted value is a variable reference.
 */
export function toTypeScript(set: TokenSet, options: TypeScriptOptions = {}): string {
  const { exportName = 'tokens', asCssVariables = true } = options
  const resolved = resolveTokens(set)

  const tree: NestedRecord = {}

  for (const token of set.tokens) {
    if (token.private) continue

    const segments = token.path.split('.')
    let node = tree
    for (const segment of segments.slice(0, -1)) {
      const existing = node[segment]
      if (typeof existing !== 'object' || existing === null) {
        const created: NestedRecord = {}
        node[segment] = created
        node = created
      } else {
        node = existing
      }
    }

    const leaf = segments[segments.length - 1] as string
    node[leaf] = asCssVariables
      ? `var(${toCssVariableName(token.path, options)})`
      : (serialiseCssValue(resolved.get(token.path) as TokenValue, options) as string)
  }

  const render = (node: NestedRecord | string | number, depth: number): string => {
    if (typeof node !== 'object') return JSON.stringify(node)

    const indent = '  '.repeat(depth + 1)
    const closing = '  '.repeat(depth)
    const entries = Object.entries(node).map(([key, child]) => {
      // Keys such as `0-5` and `2xl` are not valid identifiers and must be quoted.
      const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)
      return `${indent}${safeKey}: ${render(child, depth + 1)},`
    })

    return `{\n${entries.join('\n')}\n${closing}}`
  }

  return `/**
 * Generated from the "${set.name}" token set, version ${set.version}.
 * Do not edit by hand: regenerate with \`vishwakarma tokens build\`.
 */

export const ${exportName} = ${render(tree, 0)} as const

export type Tokens = typeof ${exportName}
`
}

/* -------------------------------------------------------------------------- */
/* JSON                                                                        */
/* -------------------------------------------------------------------------- */

export interface JsonOptions {
  /** Resolve references to literal values. */
  resolve?: boolean
  /** Theme to resolve for. */
  theme?: string
}

/** Emit the token set as JSON, either raw or fully resolved. */
export function toJson(set: TokenSet, options: JsonOptions = {}): string {
  if (!options.resolve) return `${JSON.stringify(set, null, 2)}\n`

  const resolveOptions = options.theme ? { theme: options.theme } : {}
  const resolved = resolveTokens(set, resolveOptions)
  const flat: Record<string, unknown> = {}
  for (const [path, value] of resolved) flat[path] = value

  return `${JSON.stringify({ name: set.name, version: set.version, theme: options.theme ?? 'default', tokens: flat }, null, 2)}\n`
}

/* -------------------------------------------------------------------------- */
/* Documentation                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Emit a Markdown reference for the token set.
 *
 * This is written for two audiences at once, which is unusual but correct here: a human
 * scanning for the right token, and an agent that has been handed the file as context. The
 * description column carries the most weight for both, because a token list without
 * descriptions is just a lookup table and neither audience needs another one of those.
 */
export function toMarkdown(set: TokenSet, options: NamingOptions = {}): string {
  const groups = new Map<string, Token[]>()
  for (const token of set.tokens) {
    if (token.private) continue
    const namespace = token.path.split('.')[0] as string
    const existing = groups.get(namespace)
    if (existing) existing.push(token)
    else groups.set(namespace, [token])
  }

  const lines: string[] = [`# ${set.name}`, '']
  if (set.description) lines.push(set.description, '')
  lines.push(`Version ${set.version}. ${set.tokens.length} tokens.`, '')

  for (const [namespace, tokens] of groups) {
    lines.push(`## ${namespace}`, '')
    lines.push('| Token | CSS variable | Value | Tier | Notes |')
    lines.push('| --- | --- | --- | --- | --- |')
    for (const token of tokens) {
      const value = serialiseCssValue(token.value, options).replace(/\|/g, '\\|')
      lines.push(
        `| \`${token.path}\` | \`${toCssVariableName(token.path, options)}\` | \`${value}\` | ${token.tier} | ${token.description ?? ''} |`,
      )
    }
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}
