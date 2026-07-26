// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * `matchMedia` for environments that do not have it.
 *
 * jsdom does not implement `matchMedia` at all — the property is simply absent. Anything
 * that reads a user preference therefore throws `window.matchMedia is not a function` the
 * first time it renders under test, and the usual response is a three-line stub that
 * returns `{ matches: false }`. That stub is worse than no stub, for reasons that are
 * worth writing down because each one costs somebody an afternoon:
 *
 * - It returns a fresh object per call, so `removeEventListener` in a cleanup function
 *   removes a listener from an object nobody else holds. The subscription leaks, and the
 *   test that fails is a later one.
 * - It omits `addListener`/`removeListener`. Those are deprecated, not gone, and enough
 *   shipped code still calls them that omitting them turns a working component into a
 *   `TypeError` that only appears under test.
 * - It never dispatches `change`, so anything built on `useSyncExternalStore` or a
 *   subscription can be *set* but never *changed*, and the "user switches to dark mode
 *   mid-session" test cannot be written at all.
 * - It answers `false` to everything, which is not a neutral default. `false` for
 *   `prefers-reduced-motion` means every test runs as though the user asked for animation,
 *   so the reduced-motion path — the one with the accessibility requirement attached —
 *   is the one that never gets exercised.
 *
 * The mock here holds a small model of the environment instead, evaluates real query
 * syntax against it, caches one list per query string, and dispatches change events when
 * the model moves. That makes preference changes testable rather than merely stubbable.
 */

/** The state that media queries are evaluated against. */
export interface MediaEnvironment {
  widthPx: number
  heightPx: number
  /** The primary pointing device. */
  pointer: 'fine' | 'coarse' | 'none'
  /** Whether the primary pointer can hover. */
  hover: boolean
  prefersReducedMotion: boolean
  prefersColourScheme: 'light' | 'dark'
  prefersContrast: 'no-preference' | 'more' | 'less'
  forcedColours: boolean
  /** Device pixel ratio, for resolution queries. */
  devicePixelRatio: number
}

/** The default environment: a desktop browser with no preferences expressed. */
export const DEFAULT_MEDIA_ENVIRONMENT: MediaEnvironment = {
  widthPx: 1024,
  heightPx: 768,
  pointer: 'fine',
  hover: true,
  prefersReducedMotion: false,
  prefersColourScheme: 'light',
  prefersContrast: 'no-preference',
  forcedColours: false,
  devicePixelRatio: 1,
}

/** The `change` event the mock dispatches. */
export interface MediaQueryChangeEvent {
  readonly type: 'change'
  readonly matches: boolean
  readonly media: string
}

type ChangeListener = (event: MediaQueryChangeEvent) => void

/** The `MediaQueryList` surface, including the legacy methods that are still called. */
export interface MediaQueryListLike {
  readonly media: string
  readonly matches: boolean
  onchange: ChangeListener | null
  addEventListener(type: 'change', listener: ChangeListener): void
  removeEventListener(type: 'change', listener: ChangeListener): void
  /** Deprecated, and still in shipped code. Omitting it breaks real components. */
  addListener(listener: ChangeListener): void
  /** Deprecated counterpart of {@link addListener}. */
  removeListener(listener: ChangeListener): void
}

/** The window-shaped object the mock installs onto. */
export interface MatchMediaHost {
  matchMedia?: (query: string) => MediaQueryListLike
  innerWidth?: number
  innerHeight?: number
  devicePixelRatio?: number
}

/* -------------------------------------------------------------------------- */
/* Query evaluation                                                            */
/* -------------------------------------------------------------------------- */

const lengthToPx = (value: string): number | null => {
  const match = /^(-?\d*\.?\d+)(px|em|rem)?$/.exec(value.trim())
  if (!match?.[1]) return null
  const number = Number.parseFloat(match[1])
  if (!Number.isFinite(number)) return null
  // em and rem in a media query are always relative to the *initial* font size, not the
  // document's — a distinction that catches people out when they set html { font-size }
  // and their breakpoints do not move.
  return match[2] === 'em' || match[2] === 'rem' ? number * 16 : number
}

/**
 * Evaluate a single feature term such as `min-width: 768px` or `pointer: coarse`.
 *
 * Returns null when the feature is not modelled, which the caller reports rather than
 * guesses at. A mock that answered `false` for an unrecognised feature would make a
 * component's fallback path look like its main path.
 */
function evaluateFeature(term: string, environment: MediaEnvironment): boolean | null {
  const text = term
    .trim()
    .replace(/^\(|\)$/g, '')
    .trim()
  if (text === '') return null

  // Range syntax: `width >= 768px`, `400px <= width`.
  const range = /^([\w-]+)\s*(<=|>=|<|>|=)\s*(.+)$/.exec(text)
  const colon = /^([\w-]+)\s*:\s*(.+)$/.exec(text)

  let feature: string
  let comparator: string
  let value: string

  if (colon) {
    feature = colon[1] ?? ''
    value = colon[2] ?? ''
    comparator = feature.startsWith('min-') ? '>=' : feature.startsWith('max-') ? '<=' : '='
    feature = feature.replace(/^(min|max)-/, '')
  } else if (range) {
    feature = range[1] ?? ''
    comparator = range[2] ?? '='
    value = range[3] ?? ''
  } else {
    // A bare feature is true when the feature has any non-zero value: `(hover)`, `(color)`.
    switch (text) {
      case 'hover':
        return environment.hover
      case 'pointer':
        return environment.pointer !== 'none'
      case 'forced-colors':
        return environment.forcedColours
      default:
        return null
    }
  }

  const compare = (actual: number, expected: number): boolean => {
    switch (comparator) {
      case '>=':
        return actual >= expected
      case '<=':
        return actual <= expected
      case '>':
        return actual > expected
      case '<':
        return actual < expected
      default:
        return actual === expected
    }
  }

  switch (feature) {
    case 'width': {
      const px = lengthToPx(value)
      return px === null ? null : compare(environment.widthPx, px)
    }
    case 'height': {
      const px = lengthToPx(value)
      return px === null ? null : compare(environment.heightPx, px)
    }
    case 'aspect-ratio': {
      const [numerator, denominator] = value.split('/').map((part) => Number.parseFloat(part))
      if (!numerator || !denominator) return null
      return compare(environment.widthPx / environment.heightPx, numerator / denominator)
    }
    case 'resolution': {
      const dppx = Number.parseFloat(value)
      return Number.isFinite(dppx) ? compare(environment.devicePixelRatio, dppx) : null
    }
    case 'orientation':
      return value === 'portrait'
        ? environment.heightPx >= environment.widthPx
        : environment.widthPx > environment.heightPx
    case 'prefers-reduced-motion':
      return value === 'reduce'
        ? environment.prefersReducedMotion
        : !environment.prefersReducedMotion
    case 'prefers-color-scheme':
      return value === environment.prefersColourScheme
    case 'prefers-contrast':
      return value === environment.prefersContrast
    case 'forced-colors':
      return value === 'active' ? environment.forcedColours : !environment.forcedColours
    case 'pointer':
    case 'any-pointer':
      return value === environment.pointer
    case 'hover':
    case 'any-hover':
      return value === 'hover' ? environment.hover : !environment.hover
    default:
      return null
  }
}

/**
 * Evaluate a full media query.
 *
 * Handles the subset that appears in application code: comma-separated alternatives,
 * `and`-joined feature terms, a leading `not`, and a bare media type. Returns null when
 * any term is unrecognised, so the mock can record it rather than answer wrongly.
 */
export function evaluateMediaQuery(query: string, environment: MediaEnvironment): boolean | null {
  const alternatives = query.split(',')
  let recognised = false
  let result = false

  for (const alternative of alternatives) {
    let text = alternative.trim().toLowerCase()
    if (text === '') continue

    let negate = false
    if (text.startsWith('not ')) {
      negate = true
      text = text.slice(4).trim()
    }

    // `screen and (min-width: …)` — the media type is dropped, since a test environment
    // is always `screen` and never `print`.
    text = text.replace(/^(all|screen)\s*(and\s+)?/, '').trim()
    if (text === '') {
      recognised = true
      result = result || !negate
      continue
    }

    const terms = text.split(/\s+and\s+/)
    let conjunction = true
    let complete = true

    for (const term of terms) {
      const value = evaluateFeature(term, environment)
      if (value === null) {
        complete = false
        break
      }
      conjunction = conjunction && value
    }

    if (!complete) continue
    recognised = true
    result = result || (negate ? !conjunction : conjunction)
  }

  return recognised ? result : null
}

/* -------------------------------------------------------------------------- */
/* The mock                                                                    */
/* -------------------------------------------------------------------------- */

class MockMediaQueryList implements MediaQueryListLike {
  readonly media: string
  matches: boolean
  onchange: ChangeListener | null = null
  private readonly listeners = new Set<ChangeListener>()

  constructor(media: string, matches: boolean) {
    this.media = media
    this.matches = matches
  }

  addEventListener(_type: 'change', listener: ChangeListener): void {
    this.listeners.add(listener)
  }

  removeEventListener(_type: 'change', listener: ChangeListener): void {
    this.listeners.delete(listener)
  }

  addListener(listener: ChangeListener): void {
    this.listeners.add(listener)
  }

  removeListener(listener: ChangeListener): void {
    this.listeners.delete(listener)
  }

  /** Update and notify, but only when the answer actually moved. */
  update(matches: boolean): void {
    if (this.matches === matches) return
    this.matches = matches

    const event: MediaQueryChangeEvent = { type: 'change', matches, media: this.media }
    this.onchange?.(event)
    // Copied before iteration: a listener that unsubscribes itself while being notified is
    // ordinary React cleanup, and mutating the set mid-iteration would skip the next one.
    for (const listener of [...this.listeners]) listener(event)
  }
}

export interface MatchMediaMock {
  /** The current model. Read-only; use {@link MatchMediaMock.set} to change it. */
  readonly environment: Readonly<MediaEnvironment>
  /**
   * Update the environment and dispatch `change` to every affected query.
   *
   * This is the method that makes preference changes testable: set
   * `{ prefersReducedMotion: true }` after render and every subscriber is notified exactly
   * as a real browser would notify them.
   */
  set(patch: Partial<MediaEnvironment>): void
  /** Force one query's answer, bypassing evaluation. For queries the model cannot express. */
  override(query: string, matches: boolean): void
  /**
   * Queries asked about that the evaluator did not recognise.
   *
   * Assert on this in a setup test. An unrecognised query silently answers `false`, and
   * an empty list is the cheapest possible proof that no component is quietly taking a
   * fallback path in every test you run.
   */
  readonly unrecognised: readonly string[]
  /** Put the host back exactly as it was. */
  restore(): void
}

const defaultHost = (): MatchMediaHost => globalThis as unknown as MatchMediaHost

/**
 * Install a controllable `matchMedia`.
 *
 * Call `restore()` in an `afterEach`. Leaving it installed is usually harmless and
 * occasionally not: a suite that installs a coarse-pointer environment in one file and
 * forgets to remove it changes the behaviour of every file that runs after it in the same
 * worker, and the resulting failure depends on file ordering.
 */
export function mockMatchMedia(
  initial: Partial<MediaEnvironment> = {},
  host: MatchMediaHost = defaultHost(),
): MatchMediaMock {
  const environment: MediaEnvironment = { ...DEFAULT_MEDIA_ENVIRONMENT, ...initial }
  const lists = new Map<string, MockMediaQueryList>()
  const overrides = new Map<string, boolean>()
  const unrecognised: string[] = []

  const answer = (query: string): boolean => {
    const forced = overrides.get(query)
    if (forced !== undefined) return forced

    const evaluated = evaluateMediaQuery(query, environment)
    if (evaluated === null) {
      if (!unrecognised.includes(query)) unrecognised.push(query)
      return false
    }
    return evaluated
  }

  const matchMedia = (query: string): MediaQueryListLike => {
    // One list per query string, cached. A fresh object per call is the defect described
    // in the module note: cleanup functions would unsubscribe from an object nobody holds.
    const existing = lists.get(query)
    if (existing) return existing

    const created = new MockMediaQueryList(query, answer(query))
    lists.set(query, created)
    return created
  }

  // Capture the previous state precisely, and restore the descriptor rather than deleting.
  //
  // The two states are genuinely different and both occur. Under Vitest's jsdom
  // environment `matchMedia` is already an own property of the global with the value
  // `undefined`, because the setup copies the window's keys across; under a bare jsdom it
  // is absent entirely. Deleting in the first case, or assigning `undefined` in the
  // second, leaves the environment subtly unlike the one the next test file expects, and
  // any feature detection written as `'matchMedia' in window` then takes the wrong branch.
  const had = Object.hasOwn(host, 'matchMedia')
  const previous = Object.getOwnPropertyDescriptor(host, 'matchMedia')

  Object.defineProperty(host, 'matchMedia', {
    value: matchMedia,
    configurable: true,
    writable: true,
  })

  const applyDimensions = (): void => {
    if ('innerWidth' in host) host.innerWidth = environment.widthPx
    if ('innerHeight' in host) host.innerHeight = environment.heightPx
    host.devicePixelRatio = environment.devicePixelRatio
  }
  applyDimensions()

  return {
    environment,
    set(patch: Partial<MediaEnvironment>): void {
      Object.assign(environment, patch)
      applyDimensions()
      for (const [query, list] of lists) list.update(answer(query))
    },
    override(query: string, matches: boolean): void {
      overrides.set(query, matches)
      lists.get(query)?.update(matches)
    },
    unrecognised,
    restore(): void {
      if (had && previous) Object.defineProperty(host, 'matchMedia', previous)
      else delete host.matchMedia
    },
  }
}

/**
 * Install `matchMedia` with a fixed reduced-motion preference.
 *
 * The narrow, common case, given its own name because it is the one preference that
 * carries a hard accessibility requirement and therefore the one that most deserves a test
 * of its own. Both branches need covering: `mockReducedMotion(true)` proves the calm path
 * exists, and `mockReducedMotion(false)` proves the animated path did not regress.
 */
export function mockReducedMotion(
  value: boolean,
  host: MatchMediaHost = defaultHost(),
): MatchMediaMock {
  return mockMatchMedia({ prefersReducedMotion: value }, host)
}
