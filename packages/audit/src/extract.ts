// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Heuristic extraction of design decisions from source text.
 *
 * This is the part of the package that must be honest about itself. It reads text with
 * regular expressions and bracket counting. It does not build an AST, it does not resolve
 * imports, it does not evaluate anything. That is a deliberate trade: an AST-based
 * extractor would be more precise on the files it understands and would understand only
 * TypeScript, whereas most of the design decisions in a real project are spread across
 * `.tsx`, `.css`, `.mdx`, template literals and configuration files. Breadth wins here,
 * because a value that never gets looked at is never going to be flagged.
 *
 * The consequence is that everything this module produces is a **lower bound**. A class
 * name assembled at runtime, a spacing value read from a theme object, a size passed as a
 * prop — none of these are visible, and none of them are guessed at. Anything the
 * extractor cannot resolve is recorded in {@link SourceExtraction.unresolved} rather than
 * discarded, so the report can say how much it could not see instead of implying it saw
 * everything.
 *
 * The other half of the trade is false positives, which are worse than false negatives for
 * a tool that runs in CI. A developer who is shown a violation citing a value that does not
 * appear in their file stops reading the report, and the tool is then worth nothing. So
 * every heuristic here fails towards silence: ambiguous `text-[…]`, `calc()` arithmetic,
 * relative units and interpolated class names all resolve to nothing rather than to a
 * plausible number.
 */

import type { Observation } from '@vishwakarma/core'
import { createLocator, lineTextAt } from './locate.js'
import { parseSuppressions, type Suppression } from './suppressions.js'
import {
  collectStringLiterals,
  escapeRegExp,
  findClosingTag,
  findTagEnd,
  matchDelimiter,
  toCamelCase,
} from './scan.js'
import {
  parseTailwindClass,
  resolveTailwindAnimatedProperties,
  resolveTailwindDurationMs,
  resolveTailwindFontSizeRem,
  resolveTailwindRadiusPx,
  resolveTailwindSpacingPx,
  tokenizeClassList,
  type TailwindTheme,
} from './tailwind.js'
import { isRelativeLength, lengthToPx, lengthToRem, timeToMs, type UnitOptions } from './units.js'

/* -------------------------------------------------------------------------- */
/* Result shapes                                                               */
/* -------------------------------------------------------------------------- */

/** The category of design decision a piece of evidence records. */
export type EvidenceKind =
  | 'spacing'
  | 'font-size'
  | 'font-weight'
  | 'radius'
  | 'duration'
  | 'animated-property'
  | 'raw-colour'
  | 'heading'
  | 'missing-name'

/** Where a piece of evidence was found, which changes how much to trust it. */
export type EvidenceOrigin = 'class' | 'css' | 'style-object' | 'keyframes' | 'jsx'

/**
 * One located observation of a single value.
 *
 * The {@link Observation} the contract checker consumes is a bag of numbers with no
 * positions in it, by design — it has to work identically for a static file and a live
 * DOM. Evidence is the position information kept alongside, so that a violation about
 * "13px" can be pointed back at the line that wrote it.
 */
export interface Evidence {
  kind: EvidenceKind
  /** The resolved value, in the unit the contract uses. */
  value: string | number
  origin: EvidenceOrigin
  /** Character offset in the source. */
  offset: number
  /** One-based line. */
  line: number
  /** One-based column. */
  column: number
  /** The trimmed source line, for report excerpts. */
  text: string
}

/** Why a value the extractor noticed could not be turned into a number. */
export type UnresolvedKind =
  | 'computed-class-name'
  | 'relative-unit'
  | 'computed-length'
  | 'dynamic-accessible-name'

/** A thing the extractor saw, could not resolve, and refuses to guess about. */
export interface Unresolved {
  kind: UnresolvedKind
  /** The source text that could not be resolved, truncated for reporting. */
  detail: string
  line: number
  column: number
}

/** Everything one file yielded. */
export interface SourceExtraction {
  file: string
  /** The bag of values, ready for `checkContract`. */
  observation: Observation
  /** The same values, with positions, in source order per kind. */
  evidence: Evidence[]
  suppressions: Suppression[]
  /** Values seen but deliberately not resolved. The size of this list is the blind spot. */
  unresolved: Unresolved[]
}

/** Knobs for extraction. */
export interface ExtractOptions extends UnitOptions {
  /** Utility-class theme overrides. Essential for projects with a customised scale. */
  theme?: TailwindTheme
}

/* -------------------------------------------------------------------------- */
/* Property tables                                                             */
/* -------------------------------------------------------------------------- */

const SPACING_PROPERTIES = [
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'padding-inline',
  'padding-block',
  'padding-inline-start',
  'padding-inline-end',
  'padding-block-start',
  'padding-block-end',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'margin-inline',
  'margin-block',
  'margin-inline-start',
  'margin-inline-end',
  'margin-block-start',
  'margin-block-end',
  'gap',
  'row-gap',
  'column-gap',
  'inset',
  'inset-inline',
  'inset-block',
  'top',
  'right',
  'bottom',
  'left',
]

const RADIUS_PROPERTIES = [
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'border-start-start-radius',
  'border-start-end-radius',
  'border-end-start-radius',
  'border-end-end-radius',
]

const DURATION_PROPERTIES = ['transition-duration', 'animation-duration']

/**
 * Build a declaration matcher covering both the CSS and the JavaScript spelling of a set
 * of properties.
 *
 * Style objects are where a surprising share of off-scale values live, because the
 * stylesheet is reviewed and the inline `style={{ marginTop: 13 }}` is not. Matching
 * `marginTop` alongside `margin-top` costs one line and roughly doubles the coverage on a
 * typical React codebase.
 */
function declarationMatcher(properties: string[]): RegExp {
  const spellings = new Set<string>()
  for (const property of properties) {
    spellings.add(property)
    spellings.add(toCamelCase(property))
  }

  // Longest first, so `padding-top` is preferred over `padding` and the shorter
  // alternative never wins on a prefix.
  const alternation = [...spellings]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')

  return new RegExp(`(?<![\\w-])(${alternation})\\s*:\\s*([^;{}\\n]*)`, 'g')
}

/**
 * Numbers that are plausibly a CSS length.
 *
 * The lookarounds are the whole point. Without them `theme.space[4]`, `grid-cols-4` and
 * `z-10` all contribute phantom spacing values, and a report full of numbers the developer
 * cannot find in their own file is a report nobody runs twice.
 */
const LENGTH_TOKEN = /(?<![\w.$[\]-])([+-]?(?:\d*\.)?\d+)(px|rem|em|pt|pc|in|cm|mm|q|%|ch|ex|vw|vh|vmin|vmax)?(?![\w.%])/gi

const TIME_TOKEN = /(?<![\w.$-])((?:\d*\.)?\d+)(ms|s)(?![\w-])/gi

const HEX_COLOUR = /(?<![\w&#])#([0-9a-fA-F]{3,8})(?![\w])/g
const FUNCTIONAL_COLOUR = /\b(rgba?|hsla?)\(\s*[^);{}]{1,120}\)/gi

const KEYFRAMES = /@keyframes\s+[\w-]+\s*\{/g
const KEYFRAME_PROPERTY = /(?:^|[{;])\s*([a-z][a-z-]*)\s*:/gi

const CLASS_ATTRIBUTE = /\b(?:className|class)\s*=\s*/g
const CLASS_HELPER = /\b(?:cn|clsx|classNames|classnames|twMerge|twJoin|cva)\s*\(/g

const HEADING = /<(h[1-6])(?=[\s/>])/g
const INTERACTIVE = /<(button|a)(?=[\s/>])/g

const TIMING_KEYWORDS = new Set([
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'linear',
  'step-start',
  'step-end',
  'infinite',
  'alternate',
  'alternate-reverse',
  'forwards',
  'backwards',
  'both',
  'normal',
  'reverse',
  'running',
  'paused',
  'none',
  'initial',
  'inherit',
  'unset',
  'revert',
  'all',
])

const TAILWIND_FONT_WEIGHTS: Record<string, number> = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
}

const REDUCED_MOTION_GUARD = /prefers-reduced-motion|useReducedMotion|motion-safe:|motion-reduce:/

/* -------------------------------------------------------------------------- */
/* Extraction                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Extract every design decision this package knows how to see from one source file.
 *
 * Works on `.tsx`, `.ts`, `.jsx`, `.js`, `.css`, `.html`, `.svelte`, `.vue` and anything
 * else that is broadly text with CSS or JSX in it. The extractor never asks what kind of
 * file it has been given, because a Tailwind class in an MDX file is exactly as much of a
 * spacing decision as one in a component, and a language check would only serve to miss it.
 *
 * `filename` is used for reporting only; nothing is read from disk.
 */
export function extractFromSource(
  code: string,
  filename: string,
  options: ExtractOptions = {},
): SourceExtraction {
  const locator = createLocator(code)
  const evidence: Evidence[] = []
  const unresolved: Unresolved[] = []
  const theme = options.theme ?? {}

  const record = (
    kind: EvidenceKind,
    value: string | number,
    origin: EvidenceOrigin,
    offset: number,
  ): void => {
    const { line, column } = locator(offset)
    evidence.push({ kind, value, origin, offset, line, column, text: lineTextAt(code, offset) })
  }

  const cannotResolve = (kind: UnresolvedKind, detail: string, offset: number): void => {
    const { line, column } = locator(offset)
    unresolved.push({ kind, detail: detail.slice(0, 120).trim(), line, column })
  }

  extractClasses(code, theme, options, record, cannotResolve)
  extractDeclarations(code, options, record, cannotResolve)
  extractKeyframes(code, record)
  extractColours(code, record)
  extractHeadings(code, record)
  extractUnnamedInteractives(code, record, cannotResolve)

  const observation = toObservation(evidence, REDUCED_MOTION_GUARD.test(code))

  return {
    file: filename,
    observation,
    evidence,
    suppressions: parseSuppressions(code, filename),
    unresolved,
  }
}

type Recorder = (
  kind: EvidenceKind,
  value: string | number,
  origin: EvidenceOrigin,
  offset: number,
) => void

type Rejecter = (kind: UnresolvedKind, detail: string, offset: number) => void

/* --- utility classes ------------------------------------------------------ */

function extractClasses(
  code: string,
  theme: TailwindTheme,
  units: UnitOptions,
  record: Recorder,
  cannotResolve: Rejecter,
): void {
  for (const site of findClassStrings(code, cannotResolve)) {
    let cursor = 0
    for (const token of tokenizeClassList(site.value)) {
      // Track the token's own offset rather than the string's, so a long multi-line class
      // list reports the line the offending utility is actually on.
      const relative = site.value.indexOf(token, cursor)
      cursor = relative === -1 ? cursor : relative + token.length
      const offset = site.offset + (relative === -1 ? 0 : relative)

      const utility = parseTailwindClass(token)

      const spacing = resolveTailwindSpacingPx(utility, theme, units)
      if (spacing !== null) record('spacing', spacing, 'class', offset)

      const fontSize = resolveTailwindFontSizeRem(utility, theme, units)
      if (fontSize !== null) record('font-size', fontSize, 'class', offset)

      const radius = resolveTailwindRadiusPx(utility, theme, units)
      if (radius !== null) record('radius', radius, 'class', offset)

      const duration = resolveTailwindDurationMs(utility)
      if (duration !== null) record('duration', duration, 'class', offset)

      for (const property of resolveTailwindAnimatedProperties(utility)) {
        record('animated-property', property, 'class', offset)
      }

      if (utility.base.startsWith('font-') && utility.arbitrary === null) {
        const weight = TAILWIND_FONT_WEIGHTS[utility.base.slice('font-'.length)]
        if (weight !== undefined) record('font-weight', weight, 'class', offset)
      }

      if (utility.arbitrary !== null && isRelativeLength(utility.arbitrary)) {
        cannotResolve('relative-unit', token, offset)
      }
    }
  }
}

interface ClassSite {
  value: string
  offset: number
}

/**
 * Find every string that plausibly contains class names.
 *
 * Three shapes are covered: a quoted `className` attribute, an expression container after
 * `className=`, and the arguments of a class-merging helper. The third matters more than
 * it looks — variants defined in a `cva(…)` table are where a component's real spacing
 * decisions live, and an extractor that only read JSX attributes would miss all of them.
 */
function findClassStrings(code: string, cannotResolve: Rejecter): ClassSite[] {
  const sites: ClassSite[] = []

  const takeRegion = (start: number, end: number): void => {
    for (const literal of collectStringLiterals(code, start, end)) {
      if (literal.interpolated) {
        // A template with a hole in it may still contain resolvable utilities around the
        // hole, so we keep the literal text and record the hole as a blind spot.
        cannotResolve('computed-class-name', literal.value, literal.offset)
      }
      sites.push({ value: literal.value, offset: literal.offset })
    }
  }

  CLASS_ATTRIBUTE.lastIndex = 0
  let attribute: RegExpExecArray | null = CLASS_ATTRIBUTE.exec(code)
  while (attribute !== null) {
    const start = attribute.index + attribute[0].length
    const opener = code[start]

    if (opener === '"' || opener === "'" || opener === '`') {
      takeRegion(start, findLiteralEnd(code, start))
    } else if (opener === '{') {
      const end = matchDelimiter(code, start, '{', '}')
      if (end !== -1) takeRegion(start + 1, end)
    }

    attribute = CLASS_ATTRIBUTE.exec(code)
  }

  CLASS_HELPER.lastIndex = 0
  let helper: RegExpExecArray | null = CLASS_HELPER.exec(code)
  while (helper !== null) {
    const open = helper.index + helper[0].length - 1
    const end = matchDelimiter(code, open, '(', ')')
    if (end !== -1) takeRegion(open + 1, end)
    helper = CLASS_HELPER.exec(code)
  }

  return sites
}

/** Offset just past the string literal that begins at `quoteIndex`. */
function findLiteralEnd(code: string, quoteIndex: number): number {
  const quote = code[quoteIndex]
  if (quote === undefined) return quoteIndex
  let index = quoteIndex + 1
  while (index < code.length) {
    const char = code[index]
    if (char === '\\') {
      index += 2
      continue
    }
    if (char === quote) return index + 1
    index++
  }
  return code.length
}

/* --- CSS and style-object declarations ------------------------------------ */

const SPACING_MATCHER = declarationMatcher(SPACING_PROPERTIES)
const RADIUS_MATCHER = declarationMatcher(RADIUS_PROPERTIES)
const DURATION_MATCHER = declarationMatcher(DURATION_PROPERTIES)
const FONT_SIZE_MATCHER = declarationMatcher(['font-size'])
const FONT_WEIGHT_MATCHER = declarationMatcher(['font-weight'])
const TRANSITION_PROPERTY_MATCHER = declarationMatcher(['transition-property'])
const TRANSITION_MATCHER = declarationMatcher(['transition'])
const ANIMATION_MATCHER = declarationMatcher(['animation'])

function extractDeclarations(
  code: string,
  units: UnitOptions,
  record: Recorder,
  cannotResolve: Rejecter,
): void {
  forEachDeclaration(code, SPACING_MATCHER, (value, valueOffset) => {
    if (hasComputedValue(value)) {
      cannotResolve('computed-length', value, valueOffset)
      return
    }
    for (const found of lengths(value, valueOffset, units)) {
      // Magnitude only. `-13px` and `13px` are the same decision about the scale, and a
      // negative number would fail the scale test on a value that is perfectly on it.
      record('spacing', Math.abs(found.px), originOf(value), found.offset)
    }
    reportRelativeUnits(value, valueOffset, cannotResolve)
  })

  forEachDeclaration(code, RADIUS_MATCHER, (value, valueOffset) => {
    if (hasComputedValue(value)) return
    for (const found of lengths(value, valueOffset, units)) {
      record('radius', Math.abs(found.px), originOf(value), found.offset)
    }
  })

  forEachDeclaration(code, FONT_SIZE_MATCHER, (value, valueOffset) => {
    if (hasComputedValue(value)) {
      cannotResolve('computed-length', value, valueOffset)
      return
    }
    for (const found of lengths(value, valueOffset, units)) {
      const rem = lengthToRem(`${found.px}px`, units)
      if (rem !== null) record('font-size', rem, originOf(value), found.offset)
    }
  })

  forEachDeclaration(code, FONT_WEIGHT_MATCHER, (value, valueOffset) => {
    const weight = Number(value.replace(/['",;]/g, '').trim())
    if (Number.isFinite(weight) && weight > 0) record('font-weight', weight, originOf(value), valueOffset)
  })

  for (const matcher of [DURATION_MATCHER, TRANSITION_MATCHER, ANIMATION_MATCHER]) {
    forEachDeclaration(code, matcher, (value, valueOffset) => {
      for (const found of times(value, valueOffset)) {
        record('duration', found.ms, originOf(value), found.offset)
      }
    })
  }

  forEachDeclaration(code, TRANSITION_PROPERTY_MATCHER, (value, valueOffset) => {
    for (const property of splitList(value)) {
      record('animated-property', property, originOf(value), valueOffset)
    }
  })

  forEachDeclaration(code, TRANSITION_MATCHER, (value, valueOffset) => {
    // The shorthand's first identifier is the property. `animation` is deliberately not
    // treated this way: its first identifier is a keyframes name, and reporting `spin` as
    // an animated property would be nonsense.
    for (const part of value.split(',')) {
      const property = part
        .trim()
        .split(/\s+/)
        .find((token) => /^[a-z][a-z-]*$/i.test(token) && !TIMING_KEYWORDS.has(token.toLowerCase()))
      if (property !== undefined) record('animated-property', property, originOf(value), valueOffset)
      if (/(^|\s)all(\s|$)/.test(part)) record('animated-property', 'all', originOf(value), valueOffset)
    }
  })
}

/** Whether a declaration value depends on something we cannot see. */
function hasComputedValue(value: string): boolean {
  return /\b(?:calc|var|clamp|min|max|env|theme)\s*\(/.test(value) || /[A-Za-z_$][\w$]*\s*[.[]/.test(value)
}

/** Style objects and stylesheets are worth distinguishing in a report; the cue is quoting. */
function originOf(value: string): EvidenceOrigin {
  return /['"]/.test(value) || /,\s*$/.test(value) ? 'style-object' : 'css'
}

function forEachDeclaration(
  code: string,
  matcher: RegExp,
  visit: (value: string, valueOffset: number) => void,
): void {
  matcher.lastIndex = 0
  let match: RegExpExecArray | null = matcher.exec(code)
  while (match !== null) {
    const value = match[2] ?? ''
    const valueOffset = match.index + match[0].length - value.length
    if (value.trim().length > 0) visit(value, valueOffset)
    match = matcher.exec(code)
  }
}

function lengths(
  value: string,
  valueOffset: number,
  units: UnitOptions,
): Array<{ px: number; offset: number }> {
  const found: Array<{ px: number; offset: number }> = []
  LENGTH_TOKEN.lastIndex = 0
  let match: RegExpExecArray | null = LENGTH_TOKEN.exec(value)
  while (match !== null) {
    const px = lengthToPx(match[0], units)
    if (px !== null) found.push({ px, offset: valueOffset + match.index })
    match = LENGTH_TOKEN.exec(value)
  }
  return found
}

function reportRelativeUnits(value: string, valueOffset: number, cannotResolve: Rejecter): void {
  LENGTH_TOKEN.lastIndex = 0
  let match: RegExpExecArray | null = LENGTH_TOKEN.exec(value)
  while (match !== null) {
    if (isRelativeLength(match[0])) {
      cannotResolve('relative-unit', match[0], valueOffset + match.index)
    }
    match = LENGTH_TOKEN.exec(value)
  }
}

function times(value: string, valueOffset: number): Array<{ ms: number; offset: number }> {
  const found: Array<{ ms: number; offset: number }> = []
  TIME_TOKEN.lastIndex = 0
  let match: RegExpExecArray | null = TIME_TOKEN.exec(value)
  while (match !== null) {
    const ms = timeToMs(match[0])
    if (ms !== null) found.push({ ms, offset: valueOffset + match.index })
    match = TIME_TOKEN.exec(value)
  }
  return found
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.replace(/['";]/g, '').trim())
    .filter((part) => part.length > 0 && /^[a-z][a-z-]*$/i.test(part))
}

/* --- keyframes ------------------------------------------------------------ */

/**
 * Properties named inside a `@keyframes` block are, by definition, animated.
 *
 * This is the only way to catch the most expensive pattern there is: a keyframes rule that
 * animates `height` or `top`, referenced by an `animation` shorthand somewhere else
 * entirely. Neither half looks alarming on its own.
 */
function extractKeyframes(code: string, record: Recorder): void {
  KEYFRAMES.lastIndex = 0
  let match: RegExpExecArray | null = KEYFRAMES.exec(code)
  while (match !== null) {
    const braceIndex = match.index + match[0].length - 1
    const end = matchDelimiter(code, braceIndex, '{', '}')
    if (end !== -1) {
      const body = code.slice(braceIndex, end)
      KEYFRAME_PROPERTY.lastIndex = 0
      let property: RegExpExecArray | null = KEYFRAME_PROPERTY.exec(body)
      while (property !== null) {
        const name = property[1]
        if (name !== undefined) record('animated-property', name, 'keyframes', braceIndex + property.index)
        property = KEYFRAME_PROPERTY.exec(body)
      }
      KEYFRAMES.lastIndex = end
    }
    match = KEYFRAMES.exec(code)
  }
}

/* --- colours -------------------------------------------------------------- */

/**
 * Raw colour literals in component source.
 *
 * Only the three notations that unambiguously mean "a colour written by hand" are matched.
 * A four-digit hex is a valid colour with alpha and a five-digit one is not, so lengths are
 * checked rather than assumed — otherwise every git SHA in a comment becomes a violation.
 */
function extractColours(code: string, record: Recorder): void {
  HEX_COLOUR.lastIndex = 0
  let hex: RegExpExecArray | null = HEX_COLOUR.exec(code)
  while (hex !== null) {
    const digits = hex[1] ?? ''
    if (digits.length === 3 || digits.length === 4 || digits.length === 6 || digits.length === 8) {
      record('raw-colour', hex[0], 'css', hex.index)
    }
    hex = HEX_COLOUR.exec(code)
  }

  FUNCTIONAL_COLOUR.lastIndex = 0
  let functional: RegExpExecArray | null = FUNCTIONAL_COLOUR.exec(code)
  while (functional !== null) {
    record('raw-colour', functional[0].replace(/\s+/g, ' '), 'css', functional.index)
    functional = FUNCTIONAL_COLOUR.exec(code)
  }
}

/* --- headings ------------------------------------------------------------- */

function extractHeadings(code: string, record: Recorder): void {
  HEADING.lastIndex = 0
  let match: RegExpExecArray | null = HEADING.exec(code)
  while (match !== null) {
    const tag = match[1]
    if (tag !== undefined) record('heading', Number(tag.slice(1)), 'jsx', match.index)
    match = HEADING.exec(code)
  }
}

/* --- accessible names ----------------------------------------------------- */

const NAMING_ATTRIBUTES = /\b(?:aria-label|aria-labelledby|title|alt)\s*=/
const SPREAD_ATTRIBUTES = /\{\s*\.\.\./

/**
 * Interactive elements that appear to have no accessible name.
 *
 * The rule for flagging is conservative on purpose. An element is only reported when its
 * name is provably absent: no naming attribute, no spread that might carry one, no child
 * expression that might render text. An icon button whose label comes from `{t('close')}`
 * is invisible to this check and is recorded as a blind spot instead, because flagging it
 * would be wrong about half the time and being wrong about accessibility findings is how a
 * team learns to ignore accessibility findings.
 *
 * Anchors without `href` are skipped: they are not focusable and not interactive, whatever
 * they look like.
 */
function extractUnnamedInteractives(code: string, record: Recorder, cannotResolve: Rejecter): void {
  INTERACTIVE.lastIndex = 0
  let match: RegExpExecArray | null = INTERACTIVE.exec(code)

  while (match !== null) {
    const name = match[1]
    if (name === undefined) {
      match = INTERACTIVE.exec(code)
      continue
    }

    const tagEnd = findTagEnd(code, match.index)
    if (tagEnd === -1) break

    const attributes = code.slice(match.index + name.length + 1, tagEnd)
    const selfClosing = code[tagEnd - 1] === '/'

    const named = NAMING_ATTRIBUTES.test(attributes)
    const opaque = SPREAD_ATTRIBUTES.test(attributes)
    const anchorWithoutHref = name === 'a' && !/\bhref\s*=/.test(attributes)

    if (anchorWithoutHref || named) {
      match = INTERACTIVE.exec(code)
      continue
    }

    const identifier = /\bid\s*=\s*["']([\w-]+)["']/.exec(attributes)?.[1]
    const descriptor = identifier ? `${name}#${identifier}` : name

    if (opaque) {
      cannotResolve('dynamic-accessible-name', `<${name}> with spread attributes`, match.index)
      match = INTERACTIVE.exec(code)
      continue
    }

    if (selfClosing) {
      record('missing-name', descriptor, 'jsx', match.index)
      match = INTERACTIVE.exec(code)
      continue
    }

    const closing = findClosingTag(code, name, tagEnd + 1)
    if (closing === -1) {
      match = INTERACTIVE.exec(code)
      continue
    }

    const children = code.slice(tagEnd + 1, closing)
    if (children.includes('{')) {
      cannotResolve('dynamic-accessible-name', `<${name}> with an expression child`, match.index)
      match = INTERACTIVE.exec(code)
      continue
    }

    // Strip elements, then see whether any text survives. A nested `<img alt="…">` or a
    // visually-hidden span both leave text behind and both give the control a name.
    const withAlt = /\balt\s*=\s*["'][^"']+["']/.test(children)
    const text = children.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').trim()

    if (!withAlt && text.length === 0) {
      record('missing-name', descriptor, 'jsx', match.index)
    }

    match = INTERACTIVE.exec(code)
  }
}

/* --- assembly ------------------------------------------------------------- */

/**
 * Fold evidence into the {@link Observation} shape the contract checker consumes.
 *
 * Duplicates are kept for spacing and durations because repetition is meaningful there —
 * the same off-scale value used eleven times is eleven things to fix, and eleven places the
 * report needs to point at. Font sizes, weights and radii are deduplicated by the checker
 * itself, so passing duplicates through costs nothing.
 *
 * A field is only set when the extractor actually looked for it and found something, since
 * the checker treats an absent field as "not observed" and an empty array as "observed
 * nothing", and conflating those would let an empty file claim a perfect score on rules it
 * was never tested against.
 */
function toObservation(evidence: Evidence[], hasReducedMotionGuard: boolean): Observation {
  const numbers = (kind: EvidenceKind): number[] =>
    evidence.filter((item) => item.kind === kind && typeof item.value === 'number').map((item) => item.value as number)

  const strings = (kind: EvidenceKind): string[] =>
    evidence.filter((item) => item.kind === kind).map((item) => String(item.value))

  const observation: Observation = {}

  const spacing = numbers('spacing')
  if (spacing.length > 0) observation.spacingValues = spacing

  const fontSizes = numbers('font-size')
  if (fontSizes.length > 0) observation.fontSizesRem = fontSizes

  const weights = numbers('font-weight')
  if (weights.length > 0) observation.fontWeights = weights

  const radii = numbers('radius')
  if (radii.length > 0) observation.radiiPx = radii

  const durations = numbers('duration')
  if (durations.length > 0) observation.durationsMs = durations

  const animated = strings('animated-property').filter((property) => property !== 'unknown')
  if (animated.length > 0) {
    observation.animatedProperties = animated
    observation.hasReducedMotionGuard = hasReducedMotionGuard
  }

  const colours = strings('raw-colour')
  if (colours.length > 0) observation.rawColourLiterals = colours

  const headings = numbers('heading')
  if (headings.length > 0) observation.headingLevels = headings

  const unnamed = strings('missing-name')
  if (unnamed.length > 0) observation.interactiveWithoutName = unnamed

  return observation
}
