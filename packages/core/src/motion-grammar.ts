// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The Motion Grammar.
 *
 * "Make it feel premium" is the least actionable instruction in frontend work, and it is
 * the one AI agents receive most often. The Motion Grammar exists to make it actionable,
 * by replacing taste with vocabulary.
 *
 * The premise is that motion in an interface is not decoration but *communication*: an
 * animation tells the user what just happened, where a thing came from, and whether the
 * system heard them. Once you accept that, most animation decisions stop being aesthetic
 * and start being semantic. You are not choosing a duration; you are choosing what kind
 * of event this is. Grammar, not paint.
 *
 * So this module defines a small closed vocabulary — intents, roles, distances, and
 * choreography — and derives concrete timings from it. An agent picks the *meaning*, and
 * the numbers follow. That is both easier for a model to get right and easier for a
 * reviewer to check, because "this exit is using an entrance easing" is a factual claim
 * in a way that "this feels cheap" is not.
 */

/* -------------------------------------------------------------------------- */
/* Easing                                                                      */
/* -------------------------------------------------------------------------- */

/** A cubic Bézier control quadruple, as CSS orders them. */
export type BezierTuple = readonly [number, number, number, number]

/**
 * The easing vocabulary.
 *
 * Each entry encodes a physical story. `exit` curves start fast because a thing leaving
 * has already been "let go" and only needs to clear the frame; `entrance` curves end slow
 * because an arriving thing must settle into a position the user will now read. Using an
 * `entrance` curve on an exit is the single most common motion error in generated UI, and
 * it reads as sluggishness — the element hangs around after the user has moved on.
 */
export const EASINGS = {
  /** Constant velocity. Correct only for continuous loops such as spinners and marquees. */
  linear: [0, 0, 1, 1] as BezierTuple,

  /** Gentle symmetric ease. The safe default for a property that both appears and moves. */
  standard: [0.32, 0.08, 0.24, 1] as BezierTuple,

  /** Decelerating. For elements entering the frame or expanding into place. */
  entrance: [0.12, 0.72, 0.24, 1] as BezierTuple,

  /** Accelerating. For elements leaving the frame or collapsing away. */
  exit: [0.5, 0, 0.86, 0.32] as BezierTuple,

  /** Crisp and businesslike. For small state flips where personality would be noise. */
  swift: [0.4, 0, 0.2, 1] as BezierTuple,

  /** Slight overshoot. For confirmations and rewards. Use sparingly — it draws the eye. */
  emphasis: [0.34, 1.42, 0.44, 1] as BezierTuple,

  /** Anticipatory dip before moving. For playful brand moments only. */
  anticipate: [0.6, -0.28, 0.36, 1] as BezierTuple,
} as const

export type EasingName = keyof typeof EASINGS

/** Serialise an easing to a CSS `cubic-bezier()` value. */
export function toCssEasing(easing: EasingName | BezierTuple): string {
  const tuple = typeof easing === 'string' ? EASINGS[easing] : easing
  return `cubic-bezier(${tuple.join(', ')})`
}

/* -------------------------------------------------------------------------- */
/* Duration                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Duration steps, in milliseconds.
 *
 * The numbers matter less than the discipline of choosing from a fixed set. Two
 * boundaries are real, though, and worth stating: below roughly 100ms a transition is
 * perceived as instantaneous and the animation is wasted work, and above roughly 400ms a
 * UI transition starts to feel like something the user is *waiting for* rather than
 * something that simply happened. Almost all interface motion belongs between those.
 */
export const DURATIONS = {
  /** Colour and opacity flips on hover. Below the threshold of feeling animated. */
  instant: 90,
  /** Small state changes: focus rings, checkbox marks, icon swaps. */
  quick: 140,
  /** The workhorse. Dropdowns, tooltips, small reveals. */
  brisk: 200,
  /** Panels, popovers, cards moving a moderate distance. */
  measured: 280,
  /** Modals, drawers, sheets — anything that takes over a region of the screen. */
  deliberate: 380,
  /** Full-page and shared-element transitions. Rare. */
  cinematic: 560,
} as const

export type DurationName = keyof typeof DURATIONS

/**
 * How far the animated element travels, which is the other half of duration.
 *
 * A 400ms slide across 8px is a crawl; a 400ms slide across 800px is a whip. Distance and
 * duration have to move together, and the relationship is sublinear — perceived speed
 * tracks something closer to the square root of distance than to distance itself, which
 * is why simply doubling duration when distance doubles feels wrong.
 */
export type MotionDistance = 'micro' | 'short' | 'medium' | 'long' | 'full'

const DISTANCE_FACTORS: Record<MotionDistance, number> = {
  /** A few pixels: a nudge, a press, a checkbox tick. */
  micro: 0.62,
  /** Tens of pixels: a dropdown opening, a tooltip appearing. */
  short: 0.82,
  /** A card or panel moving within its container. */
  medium: 1,
  /** A drawer or sheet crossing most of a viewport edge. */
  long: 1.3,
  /** A full-screen transition. */
  full: 1.62,
}

/* -------------------------------------------------------------------------- */
/* Intent                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * What the motion is *for*. This is the field an agent should reason about first;
 * everything else can be derived from it.
 */
export type MotionIntent =
  /** Something is arriving that was not there before. */
  | 'enter'
  /** Something is leaving and will not be back in this interaction. */
  | 'exit'
  /** A thing is changing between two states it will hold. */
  | 'transform'
  /** Direct response to the user's finger or pointer, tracking it in real time. */
  | 'respond'
  /** Drawing the eye to something the user did not ask about. */
  | 'attract'
  /** Reporting that a background process is ongoing. */
  | 'occupy'
  /** Confirming an action succeeded. */
  | 'affirm'
  /** Reporting that something went wrong. */
  | 'reject'

interface IntentProfile {
  easing: EasingName
  duration: DurationName
  /** Whether this intent should be suppressed entirely under reduced-motion. */
  essential: boolean
  notes: string
}

/**
 * The core mapping. This table is the actual "grammar" — the rest of the module is
 * arithmetic on top of it.
 */
export const INTENT_PROFILES: Record<MotionIntent, IntentProfile> = {
  enter: {
    easing: 'entrance',
    duration: 'brisk',
    essential: false,
    notes:
      'Decelerate into place. Pair with a small upward translate and an opacity fade; never scale from 0, which reads as a cartoon pop rather than an arrival.',
  },
  exit: {
    easing: 'exit',
    duration: 'quick',
    essential: false,
    notes:
      'Always faster than the matching enter. The user has already decided; making them watch the departure is making them wait.',
  },
  transform: {
    easing: 'standard',
    duration: 'measured',
    essential: false,
    notes:
      'Both endpoints are real states the user may read, so the curve should be symmetric. Animate layout with transforms, not width and height.',
  },
  respond: {
    easing: 'linear',
    duration: 'instant',
    essential: true,
    notes:
      'Must track input 1:1 with no easing and no delay, because any lag is felt as the device being broken. Easing belongs in the release, not the drag.',
  },
  attract: {
    easing: 'emphasis',
    duration: 'measured',
    essential: false,
    notes:
      'Interrupting the user is a cost. Earn it: at most one attractor visible at a time, and never loop it indefinitely.',
  },
  occupy: {
    easing: 'linear',
    duration: 'cinematic',
    essential: true,
    notes:
      'Loops must be seamless and calm. A frantic spinner makes a slow system feel broken rather than busy.',
  },
  affirm: {
    easing: 'emphasis',
    duration: 'brisk',
    essential: false,
    notes:
      'A small overshoot reads as satisfaction. Keep it under 6% scale — beyond that it reads as a bug.',
  },
  reject: {
    easing: 'swift',
    duration: 'quick',
    essential: true,
    notes:
      'Short, damped, horizontal. Never bounce an error: playfulness on a failure state reads as mockery.',
  },
}

/* -------------------------------------------------------------------------- */
/* Resolution                                                                  */
/* -------------------------------------------------------------------------- */

export interface MotionRequest {
  intent: MotionIntent
  distance?: MotionDistance
  /** Overrides the intent's default easing. Prefer changing intent instead. */
  easing?: EasingName
  /** Overrides the intent's default duration step. */
  duration?: DurationName
  /** Extra delay in ms, before any stagger is applied. */
  delay?: number
  /** Honour the user's reduced-motion preference. Defaults to true, and should stay true. */
  respectReducedMotion?: boolean
  /** Whether the user currently prefers reduced motion. */
  reducedMotion?: boolean
}

export interface ResolvedMotion {
  durationMs: number
  delayMs: number
  easing: BezierTuple
  cssEasing: string
  /** True when the resolved motion was reduced or removed for accessibility. */
  reduced: boolean
  /** A ready-to-use CSS `transition` shorthand tail, e.g. `200ms cubic-bezier(...) 0ms`. */
  cssTransition: string
  notes: string
}

/**
 * Turn a semantic request into concrete numbers.
 *
 * The reduced-motion branch is deliberately not "set duration to zero for everything".
 * Users who set that preference are asking not to be moved through space — vestibular
 * triggers are large translations, parallax, scale, and rotation — but a cross-fade is
 * usually still welcome, and removing all transition can actually make an interface
 * harder to follow because state changes become discontinuous. So essential motion
 * collapses to a short fade rather than vanishing.
 */
export function resolveMotion(request: MotionRequest): ResolvedMotion {
  const {
    intent,
    distance = 'medium',
    respectReducedMotion = true,
    reducedMotion = false,
    delay = 0,
  } = request

  const profile = INTENT_PROFILES[intent]
  const easingName = request.easing ?? profile.easing
  const durationName = request.duration ?? profile.duration

  const base = DURATIONS[durationName]
  const scaled = Math.round(base * DISTANCE_FACTORS[distance])

  const shouldReduce = respectReducedMotion && reducedMotion

  if (shouldReduce) {
    // Keep a perceptible but non-spatial transition so state changes stay legible.
    const easing = EASINGS.swift
    const durationMs = profile.essential ? Math.min(scaled, 120) : 1
    return {
      durationMs,
      delayMs: 0,
      easing,
      cssEasing: toCssEasing(easing),
      reduced: true,
      cssTransition: `${durationMs}ms ${toCssEasing(easing)} 0ms`,
      notes: 'Reduced for prefers-reduced-motion: spatial movement removed, opacity retained.',
    }
  }

  const easing = EASINGS[easingName]
  return {
    durationMs: scaled,
    delayMs: delay,
    easing,
    cssEasing: toCssEasing(easing),
    reduced: false,
    cssTransition: `${scaled}ms ${toCssEasing(easing)} ${delay}ms`,
    notes: profile.notes,
  }
}

/* -------------------------------------------------------------------------- */
/* Choreography                                                                */
/* -------------------------------------------------------------------------- */

export interface StaggerOptions {
  /** How many elements are in the group. */
  count: number
  /** Delay between consecutive elements, in ms. */
  step?: number
  /** Where the wave begins. */
  from?: 'first' | 'last' | 'centre' | 'edges'
  /**
   * Cap on total stagger span, in ms. Without this, a 40-item list at 40ms each takes
   * 1.6 seconds to finish appearing, and the last item arrives long after the user has
   * started reading the first.
   */
  maxTotal?: number
}

/**
 * Compute per-element delays for a group reveal.
 *
 * Stagger is the highest-leverage tool in interface motion and the easiest to overdo. Its
 * job is to imply that a group has structure — that these things are related and ordered
 * — not to make a list into a performance. The compression behaviour below matters more
 * than the base step: past roughly a dozen elements, delays should shrink rather than
 * accumulate, so a long list still reads as one gesture instead of a queue.
 */
export function stagger(options: StaggerOptions): number[] {
  const { count, step = 34, from = 'first', maxTotal = 420 } = options
  if (count <= 0) return []
  if (count === 1) return [0]

  const rank = (index: number): number => {
    switch (from) {
      case 'last':
        return count - 1 - index
      case 'centre':
        return Math.abs(index - (count - 1) / 2)
      case 'edges':
        return (count - 1) / 2 - Math.abs(index - (count - 1) / 2)
      default:
        return index
    }
  }

  const ranks = Array.from({ length: count }, (_, i) => rank(i))
  const maxRank = Math.max(...ranks)
  const uncompressed = maxRank * step

  // Squeeze the whole sequence proportionally if it would outstay its welcome.
  const factor = uncompressed > maxTotal ? maxTotal / uncompressed : 1

  return ranks.map((r) => Math.round(r * step * factor))
}

/**
 * Spring parameters, in the damping-ratio form rather than the raw stiffness/damping
 * form, because the raw form is nearly impossible to reason about without simulating it.
 *
 * A damping ratio below 1 oscillates, exactly 1 settles as fast as possible without
 * overshoot, and above 1 crawls in. Almost all good UI springs live between 0.7 and 1.0:
 * enough life to feel physical, not enough to wobble like jelly.
 */
export interface SpringSpec {
  /** Time to settle, in seconds. */
  duration: number
  /** 0..1+, where 1 is critically damped. */
  damping: number
  /** Initial velocity, for handing off from a gesture. */
  velocity?: number
}

export const SPRINGS = {
  /** No overshoot. For anything where the final position carries meaning. */
  precise: { duration: 0.34, damping: 1 } as SpringSpec,
  /** A hint of life. The general-purpose choice. */
  natural: { duration: 0.42, damping: 0.86 } as SpringSpec,
  /** Noticeable settle. For drag release and playful surfaces. */
  lively: { duration: 0.5, damping: 0.7 } as SpringSpec,
  /** Heavy and slow. For large surfaces like sheets, where mass should be felt. */
  weighty: { duration: 0.62, damping: 0.94 } as SpringSpec,
} as const

export type SpringName = keyof typeof SPRINGS

/**
 * Convert a damping-ratio spring into the stiffness/damping/mass form that physics
 * engines want.
 *
 * The conversion follows the standard relations for a second-order system: the undamped
 * angular frequency is set so the spring settles in approximately the requested duration,
 * then stiffness is omega squared times mass, and damping is twice the ratio times mass
 * times omega.
 */
export function toPhysicalSpring(
  spec: SpringSpec | SpringName,
  mass = 1,
): { stiffness: number; damping: number; mass: number; velocity: number } {
  const resolved = typeof spec === 'string' ? SPRINGS[spec] : spec
  // The factor of ~6 approximates the settle time of a near-critically-damped system to
  // within a small percentage of its final value.
  const omega = 6 / Math.max(resolved.duration, 0.01)
  return {
    stiffness: Number((omega * omega * mass).toFixed(2)),
    damping: Number((2 * resolved.damping * mass * omega).toFixed(2)),
    mass,
    velocity: resolved.velocity ?? 0,
  }
}

/* -------------------------------------------------------------------------- */
/* Properties                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Properties that can be animated without triggering layout or paint on the main thread.
 *
 * A browser can hand these to the compositor, so they keep animating smoothly even while
 * JavaScript is busy. Everything else has to be recalculated every frame, which is why an
 * animation of `width` stutters under load while an animation of `transform` does not.
 */
export const COMPOSITED_PROPERTIES = new Set([
  'transform',
  'translate',
  'rotate',
  'scale',
  'opacity',
  'filter',
  'backdrop-filter',
  'clip-path',
])

/**
 * Properties that force layout when animated. Animating any of these in a loop or during
 * scroll is the most common cause of jank in otherwise well-built pages.
 */
export const LAYOUT_TRIGGERING_PROPERTIES = new Set([
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'top',
  'right',
  'bottom',
  'left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-width',
  'font-size',
  'line-height',
  'gap',
  'flex-basis',
  'grid-template-columns',
  'grid-template-rows',
])

export interface PropertyVerdict {
  property: string
  safe: boolean
  reason: string
  suggestion?: string
}

/** Judge whether a property is safe to animate, with a concrete alternative when it is not. */
export function judgeProperty(property: string): PropertyVerdict {
  const normalised = property.trim().toLowerCase()

  if (COMPOSITED_PROPERTIES.has(normalised)) {
    return {
      property: normalised,
      safe: true,
      reason: 'Composited: the browser can animate this off the main thread.',
    }
  }

  if (LAYOUT_TRIGGERING_PROPERTIES.has(normalised)) {
    const suggestions: Record<string, string> = {
      width: 'Animate scaleX on a wrapper, or use a layout-animation technique that reads both positions and applies a transform between them.',
      height:
        'Animate scaleY, or use grid-template-rows 0fr to 1fr, which is animatable in modern browsers without a measured pixel height.',
      top: 'Animate translateY instead.',
      left: 'Animate translateX instead.',
      right: 'Animate translateX instead.',
      bottom: 'Animate translateY instead.',
      'font-size': 'Animate scale on a wrapper, and correct the resulting blur by scaling from a larger rendered size downward.',
      gap: 'Animate the children with transforms rather than the container gap.',
    }
    const verdict: PropertyVerdict = {
      property: normalised,
      safe: false,
      reason: 'Triggers layout on every frame, so it competes with everything else on the main thread.',
    }
    const suggestion = suggestions[normalised]
    if (suggestion) verdict.suggestion = suggestion
    return verdict
  }

  return {
    property: normalised,
    safe: false,
    reason: 'Not a known composited property, so assume it triggers paint at minimum.',
    suggestion: 'Prefer transform, opacity, filter, or clip-path.',
  }
}

/**
 * Properties whose animation is known to trigger vestibular symptoms in susceptible
 * users. Any animation touching these must be gated behind a reduced-motion check.
 */
export const VESTIBULAR_RISK_PROPERTIES = new Set([
  'transform',
  'translate',
  'rotate',
  'scale',
  'perspective',
])

/**
 * Whether an animation is large enough to need a reduced-motion guard.
 *
 * Small movements are not the problem — a 4px nudge on a button press has never made
 * anyone ill. Large-area movement, parallax at differing rates, spinning, and zooming
 * are. This threshold is a heuristic, and the honest guidance is that if you are unsure,
 * guard it: the cost of an unnecessary guard is nothing.
 */
export function needsReducedMotionGuard(input: {
  properties: string[]
  travelPx?: number
  scaleDelta?: number
  rotationDeg?: number
  loops?: boolean
}): boolean {
  const { properties, travelPx = 0, scaleDelta = 0, rotationDeg = 0, loops = false } = input
  const touchesRisky = properties.some((p) => VESTIBULAR_RISK_PROPERTIES.has(p.trim().toLowerCase()))
  if (!touchesRisky) return false
  if (loops) return true
  return travelPx > 48 || Math.abs(scaleDelta) > 0.12 || Math.abs(rotationDeg) > 8
}
