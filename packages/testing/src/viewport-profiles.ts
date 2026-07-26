// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Running a test across the viewport matrix.
 *
 * The matrix itself lives in `@vishwakarma/core`, because deciding *which* configurations
 * matter is a design decision and not a testing one. What lives here is the machinery for
 * actually driving a test at each of them.
 *
 * The one thing worth insisting on: a zoomed profile is not a smaller window. At 400% zoom
 * of a 1280px viewport, layout sees 320 CSS pixels, and it is the 320 that media queries
 * and container queries respond to. Setting `innerWidth` to 1280 and calling that the
 * 400% case tests nothing — every breakpoint still resolves to the desktop layout, and the
 * reflow failure the profile exists to catch stays invisible. {@link viewportEnvironment}
 * divides by the zoom factor for exactly this reason.
 */

import {
  checksFor,
  effectiveWidth,
  REQUIRED_VIEWPORTS,
  VIEWPORT_MATRIX,
  type ViewportCategory,
  type ViewportProfile,
} from '@vishwakarma/core'
import {
  type MatchMediaHost,
  type MatchMediaMock,
  type MediaEnvironment,
  mockMatchMedia,
} from './media.js'

/** Translate a viewport profile into the media environment it implies. */
export function viewportEnvironment(profile: ViewportProfile): Partial<MediaEnvironment> {
  return {
    // The zoom division is the whole point. See the module note.
    widthPx: effectiveWidth(profile),
    heightPx: Math.round(profile.height / profile.zoom),
    pointer: profile.pointer,
    hover: profile.hover,
    devicePixelRatio: profile.zoom,
  }
}

/**
 * Selections over the matrix, for parameterising a test.
 *
 * Every method returns a fresh array, so a caller that sorts or splices the result cannot
 * reorder the shared matrix for everything that runs afterwards.
 */
export const viewportProfiles = {
  /** All nine configurations. */
  all(): ViewportProfile[] {
    return [...VIEWPORT_MATRIX]
  },

  /** The six whose failure blocks release. The sensible default for a CI sweep. */
  required(): ViewportProfile[] {
    return [...REQUIRED_VIEWPORTS]
  },

  /** A single profile by id, throwing on a typo rather than silently testing nothing. */
  byId(id: string): ViewportProfile {
    const found = VIEWPORT_MATRIX.find((profile) => profile.id === id)
    if (!found) {
      throw new Error(
        `Unknown viewport profile "${id}". Available: ${VIEWPORT_MATRIX.map((profile) => profile.id).join(', ')}.`,
      )
    }
    return found
  },

  /** Every profile in a category. */
  byCategory(category: ViewportCategory): ViewportProfile[] {
    return VIEWPORT_MATRIX.filter((profile) => profile.category === category)
  },

  /** Profiles driven by a finger, where hit-target and hover rules bite. */
  touch(): ViewportProfile[] {
    return VIEWPORT_MATRIX.filter((profile) => profile.pointer === 'coarse')
  },

  /** Profiles above 100% zoom, where reflow conformance is decided. */
  zoomed(): ViewportProfile[] {
    return VIEWPORT_MATRIX.filter((profile) => profile.zoom > 1)
  },

  /** Profiles whose layout width is at or below a threshold, after zoom. */
  atMost(widthPx: number): ViewportProfile[] {
    return VIEWPORT_MATRIX.filter((profile) => effectiveWidth(profile) <= widthPx)
  },

  /**
   * `[label, profile]` tuples, shaped for a table-driven test.
   *
   * The label is first because that is what a runner prints when the case fails, and
   * "1440 × 900" identifies the failure instantly where "case 5" does not.
   */
  cases(profiles: ViewportProfile[] = REQUIRED_VIEWPORTS): Array<[string, ViewportProfile]> {
    return profiles.map((profile) => [profile.label, profile])
  },
} as const

/**
 * Install a media environment matching a viewport profile.
 *
 * Returns the mock so the caller can restore it, and so a single test can move between
 * profiles and observe the `change` events that a real resize would produce.
 */
export function applyViewport(
  profile: ViewportProfile,
  host?: MatchMediaHost,
  extra: Partial<MediaEnvironment> = {},
): MatchMediaMock {
  const environment = { ...viewportEnvironment(profile), ...extra }
  return host === undefined ? mockMatchMedia(environment) : mockMatchMedia(environment, host)
}

/**
 * What to look for at a given profile, as printable text.
 *
 * Wraps `checksFor` from core with the profile's own rationale. Reviewers who are handed a
 * list of checks without the reason behind them work through it once and never again;
 * reviewers who are told why 768px breaks more layouts than any other width tend to
 * remember.
 */
export function describeViewport(profile: ViewportProfile): string {
  const lines = [
    `${profile.label} — ${profile.id}${profile.required ? ' (required)' : ''}`,
    `  Layout sees ${effectiveWidth(profile)}×${Math.round(profile.height / profile.zoom)} CSS px at ${profile.zoom * 100}% zoom.`,
    `  Pointer: ${profile.pointer}; hover ${profile.hover ? 'available' : 'unavailable'}.`,
    `  Why: ${profile.rationale}`,
    '  Checks:',
    ...checksFor(profile).map((check) => `    - ${check}`),
  ]
  return lines.join('\n')
}
