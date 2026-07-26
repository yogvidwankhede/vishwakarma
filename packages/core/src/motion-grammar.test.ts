// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import {
  DURATIONS,
  EASINGS,
  INTENT_PROFILES,
  judgeProperty,
  needsReducedMotionGuard,
  resolveMotion,
  stagger,
  toCssEasing,
  toPhysicalSpring,
} from './motion-grammar.js'

describe('easing vocabulary', () => {
  it('serialises to a valid CSS cubic-bezier', () => {
    expect(toCssEasing('standard')).toMatch(/^cubic-bezier\((-?[\d.]+, ){3}-?[\d.]+\)$/)
  })

  it('accepts a raw tuple as well as a name', () => {
    expect(toCssEasing([0, 0, 1, 1])).toBe('cubic-bezier(0, 0, 1, 1)')
  })

  it('keeps entrance decelerating and exit accelerating', () => {
    // A decelerating curve starts steep: its first control point sits above the diagonal.
    // An accelerating curve is the mirror image.
    const [, entranceY1] = EASINGS.entrance
    const [, exitY1] = EASINGS.exit
    expect(entranceY1).toBeGreaterThan(0.5)
    expect(exitY1).toBeLessThan(0.5)
  })

  it('keeps only the emphasis and anticipate curves outside the unit box', () => {
    for (const [name, curve] of Object.entries(EASINGS)) {
      const overshoots = curve[1] < 0 || curve[1] > 1 || curve[3] < 0 || curve[3] > 1
      if (name === 'emphasis' || name === 'anticipate') expect(overshoots).toBe(true)
      else expect(overshoots).toBe(false)
    }
  })
})

describe('intent resolution', () => {
  it('makes exits faster than the matching entrance', () => {
    const enter = resolveMotion({ intent: 'enter' })
    const exit = resolveMotion({ intent: 'exit' })
    expect(exit.durationMs).toBeLessThan(enter.durationMs)
  })

  it('scales duration with travel distance, sublinearly', () => {
    const micro = resolveMotion({ intent: 'enter', distance: 'micro' })
    const medium = resolveMotion({ intent: 'enter', distance: 'medium' })
    const full = resolveMotion({ intent: 'enter', distance: 'full' })

    expect(micro.durationMs).toBeLessThan(medium.durationMs)
    expect(medium.durationMs).toBeLessThan(full.durationMs)

    // Sublinear: a full-screen move is far more than 'medium' in distance but nowhere
    // near proportionally longer in time.
    expect(full.durationMs / medium.durationMs).toBeLessThan(2)
  })

  it('keeps every default intent duration inside the perceptual window', () => {
    for (const intent of Object.keys(INTENT_PROFILES) as Array<keyof typeof INTENT_PROFILES>) {
      const resolved = resolveMotion({ intent })
      // 'occupy' is a loop, so it is legitimately allowed to be long.
      if (intent === 'occupy') continue
      expect(resolved.durationMs).toBeLessThanOrEqual(600)
    }
  })

  it('tracks input with no easing for the respond intent', () => {
    const resolved = resolveMotion({ intent: 'respond' })
    expect(resolved.easing).toEqual(EASINGS.linear)
    expect(resolved.durationMs).toBeLessThanOrEqual(DURATIONS.instant)
  })

  it('produces a usable CSS transition tail', () => {
    const { cssTransition } = resolveMotion({ intent: 'enter', delay: 40 })
    expect(cssTransition).toMatch(/^\d+ms cubic-bezier\([^)]+\) 40ms$/)
  })

  it('lets an explicit override win over the intent default', () => {
    const resolved = resolveMotion({ intent: 'enter', duration: 'cinematic' })
    expect(resolved.durationMs).toBeGreaterThan(resolveMotion({ intent: 'enter' }).durationMs)
  })
})

describe('reduced motion', () => {
  it('collapses non-essential motion to effectively nothing', () => {
    const resolved = resolveMotion({ intent: 'enter', reducedMotion: true })
    expect(resolved.reduced).toBe(true)
    expect(resolved.durationMs).toBeLessThanOrEqual(1)
  })

  it('keeps essential motion perceptible rather than removing it entirely', () => {
    // Removing all transition from a loading indicator or an error shake makes state
    // changes discontinuous, which is harder to follow rather than easier.
    const resolved = resolveMotion({ intent: 'reject', reducedMotion: true })
    expect(resolved.reduced).toBe(true)
    expect(resolved.durationMs).toBeGreaterThan(1)
    expect(resolved.durationMs).toBeLessThanOrEqual(120)
  })

  it('drops any delay when reducing', () => {
    expect(resolveMotion({ intent: 'enter', delay: 200, reducedMotion: true }).delayMs).toBe(0)
  })

  it('can be opted out of explicitly, for genuinely essential motion', () => {
    const resolved = resolveMotion({
      intent: 'enter',
      reducedMotion: true,
      respectReducedMotion: false,
    })
    expect(resolved.reduced).toBe(false)
  })
})

describe('stagger', () => {
  it('handles degenerate counts', () => {
    expect(stagger({ count: 0 })).toEqual([])
    expect(stagger({ count: 1 })).toEqual([0])
  })

  it('increases monotonically from the first element', () => {
    const delays = stagger({ count: 5, step: 40, from: 'first' })
    expect(delays[0]).toBe(0)
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i] as number).toBeGreaterThan(delays[i - 1] as number)
    }
  })

  it('reverses cleanly from the last element', () => {
    const delays = stagger({ count: 5, step: 40, from: 'last' })
    expect(delays[4]).toBe(0)
    expect(delays[0]).toBeGreaterThan(0)
  })

  it('radiates outward from the centre', () => {
    const delays = stagger({ count: 5, step: 40, from: 'centre' })
    expect(delays[2]).toBe(0)
    expect(delays[0]).toBe(delays[4])
    expect(delays[1]).toBe(delays[3])
  })

  it('converges inward from the edges', () => {
    const delays = stagger({ count: 5, step: 40, from: 'edges' })
    expect(delays[0]).toBe(0)
    expect(delays[4]).toBe(0)
    expect(delays[2]).toBeGreaterThan(0)
  })

  it('compresses long sequences so the last item is not left behind', () => {
    const delays = stagger({ count: 40, step: 40, maxTotal: 420 })
    expect(Math.max(...delays)).toBeLessThanOrEqual(420)
  })

  it('leaves short sequences uncompressed', () => {
    const delays = stagger({ count: 4, step: 40, maxTotal: 420 })
    expect(delays).toEqual([0, 40, 80, 120])
  })
})

describe('spring conversion', () => {
  it('produces positive physical parameters', () => {
    const spring = toPhysicalSpring('natural')
    expect(spring.stiffness).toBeGreaterThan(0)
    expect(spring.damping).toBeGreaterThan(0)
    expect(spring.mass).toBe(1)
  })

  it('makes a shorter duration stiffer', () => {
    expect(toPhysicalSpring({ duration: 0.2, damping: 1 }).stiffness).toBeGreaterThan(
      toPhysicalSpring({ duration: 0.6, damping: 1 }).stiffness,
    )
  })

  it('maps a damping ratio of 1 to critical damping', () => {
    const mass = 1
    const spring = toPhysicalSpring({ duration: 0.4, damping: 1 }, mass)
    // Critical damping is where damping equals 2 * sqrt(stiffness * mass).
    expect(spring.damping).toBeCloseTo(2 * Math.sqrt(spring.stiffness * mass), 1)
  })

  it('produces underdamping below a ratio of 1, which is what allows overshoot', () => {
    const spring = toPhysicalSpring({ duration: 0.4, damping: 0.7 })
    expect(spring.damping).toBeLessThan(2 * Math.sqrt(spring.stiffness * spring.mass))
  })

  it('carries handoff velocity through for gesture release', () => {
    expect(toPhysicalSpring({ duration: 0.4, damping: 0.8, velocity: 3.2 }).velocity).toBe(3.2)
  })
})

describe('property judgement', () => {
  it('approves composited properties', () => {
    for (const property of ['transform', 'opacity', 'filter', 'clip-path']) {
      expect(judgeProperty(property).safe).toBe(true)
    }
  })

  it('rejects layout-triggering properties with a concrete alternative', () => {
    const verdict = judgeProperty('width')
    expect(verdict.safe).toBe(false)
    expect(verdict.suggestion).toBeTruthy()
  })

  it('suggests the grid-rows technique for height specifically', () => {
    expect(judgeProperty('height').suggestion).toMatch(/grid-template-rows/)
  })

  it('is case- and whitespace-insensitive', () => {
    expect(judgeProperty('  TRANSFORM ').safe).toBe(true)
  })

  it('treats unknown properties as unsafe rather than assuming the best', () => {
    const verdict = judgeProperty('some-experimental-property')
    expect(verdict.safe).toBe(false)
    expect(verdict.suggestion).toBeTruthy()
  })
})

describe('reduced-motion guard detection', () => {
  it('ignores opacity-only animation, which is not a vestibular trigger', () => {
    expect(needsReducedMotionGuard({ properties: ['opacity'], travelPx: 500 })).toBe(false)
  })

  it('flags large translations', () => {
    expect(needsReducedMotionGuard({ properties: ['transform'], travelPx: 300 })).toBe(true)
  })

  it('permits small nudges without a guard', () => {
    expect(needsReducedMotionGuard({ properties: ['transform'], travelPx: 4 })).toBe(false)
  })

  it('flags anything that loops, regardless of size', () => {
    expect(needsReducedMotionGuard({ properties: ['rotate'], rotationDeg: 2, loops: true })).toBe(true)
  })

  it('flags significant scale and rotation', () => {
    expect(needsReducedMotionGuard({ properties: ['scale'], scaleDelta: 0.4 })).toBe(true)
    expect(needsReducedMotionGuard({ properties: ['rotate'], rotationDeg: 45 })).toBe(true)
  })
})
