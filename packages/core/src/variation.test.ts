// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import {
  VARIANT_AXES,
  hashSequence,
  hashString,
  resolveVariation,
  variationSpace,
} from './variation.js'

describe('hashing', () => {
  it('is deterministic across calls', () => {
    expect(hashString('a landing page for a dental clinic')).toBe(
      hashString('a landing page for a dental clinic'),
    )
  })

  it('separates briefs that differ by one word', () => {
    // The whole mechanism depends on small brief changes re-rolling the selection rather
    // than landing in an adjacent bucket.
    const a = hashString('landing page for a dental clinic')
    const b = hashString('landing page for a dental practice')
    expect(a).not.toBe(b)
    // Avalanche: a one-word change should move far more than a few low bits.
    expect(Math.abs(a - b)).toBeGreaterThan(1000)
  })

  it('produces an unsigned 32-bit value', () => {
    for (const input of ['', 'a', 'a much longer brief with punctuation, numbers 123, and symbols !@#']) {
      const hash = hashString(input)
      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThan(2 ** 32)
      expect(Number.isInteger(hash)).toBe(true)
    }
  })

  it('spreads short similar strings across the range', () => {
    const hashes = ['page1', 'page2', 'page3', 'page4', 'page5'].map(hashString)
    expect(new Set(hashes).size).toBe(5)
  })

  it('yields a decorrelated sequence from one seed', () => {
    const sequence = hashSequence('same seed')
    const values = Array.from({ length: 8 }, () => sequence.next().value)
    // Correlated draws would reproduce mode collapse one level up: four designs instead of
    // one, rather than the full combinatorial space.
    expect(new Set(values).size).toBe(8)
  })

  it('replays the same sequence for the same seed', () => {
    const first = Array.from({ length: 5 }, ((s) => () => s.next().value)(hashSequence('seed')))
    const second = Array.from({ length: 5 }, ((s) => () => s.next().value)(hashSequence('seed')))
    expect(first).toEqual(second)
  })
})

describe('variation resolution', () => {
  it('gives the same brief the same design, every time', () => {
    const brief = 'a pricing page for a developer tool'
    const a = resolveVariation({ brief })
    const b = resolveVariation({ brief })
    expect(a.variants).toEqual(b.variants)
  })

  it('ignores surrounding whitespace and casing, which are not design decisions', () => {
    const a = resolveVariation({ brief: 'Portfolio for a photographer' })
    const b = resolveVariation({ brief: '  portfolio for a photographer  ' })
    expect(a.variants).toEqual(b.variants)
  })

  it('gives different briefs different designs', () => {
    const briefs = [
      'a landing page for a dental clinic',
      'a dashboard for a logistics company',
      'a portfolio for an architect',
      'a checkout flow for a bookshop',
      'a documentation site for an API',
      'a pricing page for a developer tool',
    ]

    const signatures = briefs.map((brief) =>
      resolveVariation({ brief }).variants.map((v) => v.value).join('|'),
    )

    // The point of the engine. Six briefs collapsing onto two or three designs would mean
    // it is not working.
    expect(new Set(signatures).size).toBeGreaterThanOrEqual(5)
  })

  it('re-rolls when salted, so a user can ask for something else', () => {
    const brief = 'a landing page for a coffee roaster'
    const first = resolveVariation({ brief })
    const second = resolveVariation({ brief, salt: 'try-again' })
    expect(first.variants).not.toEqual(second.variants)
  })

  it('only selects options that exist in the axis', () => {
    const result = resolveVariation({ brief: 'anything at all' })
    for (const variant of result.variants) {
      const axis = Object.values(VARIANT_AXES).find((a) => a.id === variant.axis)
      expect(axis).toBeDefined()
      expect(axis?.options.map((o) => String(o.value))).toContain(variant.value)
    }
  })

  it('can resolve a subset of axes', () => {
    const result = resolveVariation({ brief: 'x', axes: ['heroComposition', 'accentDiscipline'] })
    expect(result.variants).toHaveLength(2)
  })

  it('ignores an unknown axis rather than throwing', () => {
    const result = resolveVariation({ brief: 'x', axes: ['heroComposition', 'nonexistent'] })
    expect(result.variants).toHaveLength(1)
  })

  it('emits a directive containing every selection and its guidance', () => {
    const result = resolveVariation({ brief: 'a landing page' })
    for (const variant of result.variants) {
      expect(result.directive).toContain(variant.value)
      expect(result.directive).toContain(variant.guidance.slice(0, 40))
    }
  })

  it('tells the agent it may override for brand, which keeps the engine subordinate to design', () => {
    expect(resolveVariation({ brief: 'x' }).directive).toMatch(/brand/i)
  })
})

describe('weighting', () => {
  it('favours weighted options without eliminating the alternatives', () => {
    // Conventional defaults carry higher weight so the set contains a safe centre of mass
    // as well as genuine alternatives. Equal weights would just relocate the monoculture.
    const counts = new Map<string, number>()
    for (let i = 0; i < 600; i++) {
      const { variants } = resolveVariation({ brief: `brief number ${i}` })
      const hero = variants.find((v) => v.axis === 'hero-composition')
      if (hero) counts.set(hero.value, (counts.get(hero.value) ?? 0) + 1)
    }

    // Every option must be reachable, or the set is smaller than it claims.
    expect(counts.size).toBe(VARIANT_AXES.heroComposition?.options.length)

    const weighted = counts.get('centred-stack') ?? 0
    const unweighted = counts.get('quiet-utility') ?? 0
    expect(weighted).toBeGreaterThan(unweighted)
  })

  it('reaches every option on every axis across many briefs', () => {
    const seen = new Map<string, Set<string>>()
    for (let i = 0; i < 800; i++) {
      for (const variant of resolveVariation({ brief: `case ${i}` }).variants) {
        const set = seen.get(variant.axis) ?? new Set<string>()
        set.add(variant.value)
        seen.set(variant.axis, set)
      }
    }

    for (const axis of Object.values(VARIANT_AXES)) {
      expect(seen.get(axis.id)?.size).toBe(axis.options.length)
    }
  })
})

describe('constraints', () => {
  it('excludes options a brand rules out', () => {
    const axes = {
      test: {
        id: 'test',
        describes: 'test axis',
        options: [
          { value: 'allowed', guidance: 'fine' },
          { value: 'banned', guidance: 'not fine', unsuitableFor: ['fixed-brand'] },
        ],
      },
    }
    // Exercised through the public path by temporarily registering the axis.
    const original = { ...VARIANT_AXES }
    Object.assign(VARIANT_AXES, axes)
    try {
      for (let i = 0; i < 50; i++) {
        const result = resolveVariation({
          brief: `case ${i}`,
          axes: ['test'],
          constraints: ['fixed-brand'],
        })
        expect(result.variants[0]?.value).toBe('allowed')
      }
    } finally {
      for (const key of Object.keys(VARIANT_AXES)) {
        if (!(key in original)) delete VARIANT_AXES[key]
      }
    }
  })

  it('falls back to the full set rather than failing when constraints exclude everything', () => {
    const result = resolveVariation({
      brief: 'x',
      axes: ['heroComposition'],
      constraints: ['a condition nothing declares'],
    })
    expect(result.variants).toHaveLength(1)
  })
})

describe('variation space', () => {
  it('reports a combinatorial space large enough to be worth having', () => {
    const space = variationSpace()
    // Below a couple of hundred combinations, two projects sharing a direction stops being
    // a coincidence and becomes the default.
    expect(space.combinations).toBeGreaterThan(200)
    expect(space.axes.length).toBe(Object.keys(VARIANT_AXES).length)
  })

  it('narrows when given fewer axes', () => {
    expect(variationSpace(['heroComposition']).combinations).toBeLessThan(
      variationSpace().combinations,
    )
  })
})
