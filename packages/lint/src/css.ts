/**
 * Reading CSS out of JavaScript.
 *
 * Three notations carry design decisions in a modern React codebase, and a rule set that
 * understands only one of them is a rule set people route around: style objects
 * (`style={{ padding: 13 }}`), tagged templates (`` styled.div`padding: 13px` ``), and utility
 * class strings (`className="p-[13px]"`). The parsing here is deliberately shallow —
 * declaration-level, no selector nesting, no at-rule semantics — because a linter's job is to
 * spot a value that should have been a token, and that decision never needs the cascade.
 *
 * Shallow parsing has a known blind spot: interpolations. `` `padding: ${space}px` `` is
 * invisible to us, and it should be. Guessing at the value of an interpolation is how a rule
 * starts reporting on code the author never wrote, and one such false positive costs more
 * trust than ten true positives buy.
 */

/** A single CSS declaration recovered from a template or object literal. */
export interface Declaration {
  /** Kebab-case property name, lower-cased. */
  property: string
  /** Raw value text, trimmed. */
  value: string
}

/** Convert a JavaScript style-object key to its CSS spelling. Custom properties pass through. */
export function toCssProperty(key: string): string {
  if (key.startsWith('--')) return key
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/^ms-/, '-ms-')
    .toLowerCase()
}

/**
 * Recover declarations from a CSS text fragment.
 *
 * Splits on `;` at brace depth zero and again inside blocks, so declarations nested in a
 * media query or a `&:hover` block are still seen. Anything that does not look like
 * `property: value` is skipped rather than guessed at.
 */
export function scanDeclarations(css: string): Declaration[] {
  const declarations: Declaration[] = []
  let buffer = ''

  const flush = (): void => {
    const text = buffer.trim()
    buffer = ''
    if (!text) return
    const colon = text.indexOf(':')
    if (colon <= 0) return
    const property = text.slice(0, colon).trim()
    // A selector fragment such as `&:hover` reaches here after a `{`; property names never
    // contain whitespace, brackets or ampersands, which is enough to reject them.
    if (!/^-{0,2}[a-z][a-z0-9-]*$/i.test(property)) return
    const value = text.slice(colon + 1).trim()
    if (!value) return
    declarations.push({ property: property.toLowerCase(), value })
  }

  for (const character of css) {
    if (character === ';' || character === '{' || character === '}') {
      flush()
      continue
    }
    buffer += character
  }
  flush()

  return declarations
}

/** Properties whose values are colours. */
export const COLOUR_PROPERTIES: ReadonlySet<string> = new Set([
  'color',
  'background',
  'background-color',
  'background-image',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-inline-color',
  'border-block-color',
  'outline-color',
  'text-decoration-color',
  'text-emphasis-color',
  'caret-color',
  'accent-color',
  'column-rule-color',
  'fill',
  'stroke',
  'box-shadow',
  'text-shadow',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'outline',
])

/** Properties whose values sit on the spacing scale. */
export const SPACING_PROPERTIES: ReadonlySet<string> = new Set([
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'padding-inline',
  'padding-inline-start',
  'padding-inline-end',
  'padding-block',
  'padding-block-start',
  'padding-block-end',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'margin-inline',
  'margin-inline-start',
  'margin-inline-end',
  'margin-block',
  'margin-block-start',
  'margin-block-end',
  'gap',
  'row-gap',
  'column-gap',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'inset-inline',
  'inset-block',
])

/** Tag names whose template contents are CSS. */
export const DEFAULT_CSS_TAGS: readonly string[] = [
  'css',
  'styled',
  'createGlobalStyle',
  'injectGlobal',
  'keyframes',
]

/**
 * Whether a tagged template's tag marks its contents as CSS.
 *
 * Matches the bare tag and any member or call form of it, so `styled.div`, `styled(Button)`
 * and `css` all qualify while an unrelated `gql` or `sql` template does not.
 */
export function isCssTag(tag: string | undefined, tags: readonly string[]): boolean {
  if (!tag) return false
  const root = tag.split('.')[0] ?? tag
  return tags.includes(tag) || tags.includes(root)
}

/** One utility class, decomposed. */
export interface UtilityClass {
  /** The class exactly as written, including variants. */
  raw: string
  /** Variant prefixes in source order, e.g. `['md', 'hover']`. */
  variants: string[]
  /** Whether the utility carries a leading `-`. */
  negative: boolean
  /** The utility with variants, negation and `!` stripped, e.g. `p-4` or `p-[13px]`. */
  utility: string
  /** The base of an arbitrary utility, e.g. `p` for `p-[13px]`. */
  base: string
  /** The contents of `[...]`, if the utility carries an arbitrary value. */
  arbitrary?: string
}

/**
 * Split a token on `:` at bracket depth zero.
 *
 * Depth tracking is not optional: arbitrary variants such as `[&>*]:mt-4` and
 * `supports-[display:grid]:grid` both contain a colon inside brackets, and a naive split
 * mangles them into utilities that do not exist — which then either never match or match the
 * wrong rule.
 */
function splitVariants(token: string): string[] {
  const parts: string[] = []
  let depth = 0
  let buffer = ''
  for (const character of token) {
    if (character === '[' || character === '(') depth += 1
    else if (character === ']' || character === ')') depth = Math.max(0, depth - 1)
    if (character === ':' && depth === 0) {
      parts.push(buffer)
      buffer = ''
      continue
    }
    buffer += character
  }
  parts.push(buffer)
  return parts
}

/** Decompose every class in a whitespace-separated class list. */
export function scanClassList(text: string): UtilityClass[] {
  const classes: UtilityClass[] = []

  for (const token of text.split(/\s+/)) {
    if (!token) continue
    const parts = splitVariants(token)
    const last = parts[parts.length - 1]
    if (last === undefined) continue
    const variants = parts.slice(0, -1)

    let utility = last.replace(/^!/, '')
    const negative = utility.startsWith('-')
    if (negative) utility = utility.slice(1)
    if (!utility) continue

    const arbitraryMatch = /^(.*?)-\[(.+)\]$/.exec(utility)
    const entry: UtilityClass = {
      raw: token,
      variants,
      negative,
      utility,
      base: arbitraryMatch?.[1] ?? utility,
    }
    const arbitrary = arbitraryMatch?.[2]
    if (arbitrary !== undefined) entry.arbitrary = arbitrary
    classes.push(entry)
  }

  return classes
}

/** Attribute names whose value is a class list. */
export const CLASS_ATTRIBUTES: ReadonlySet<string> = new Set(['classname', 'class'])
