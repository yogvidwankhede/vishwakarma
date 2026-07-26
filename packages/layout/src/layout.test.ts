import { describe, expect, it } from 'vitest'
import { planBentoSpans } from './bento.js'
import { SPACE_ALIASES, SPACE_STEPS, resolveSpace, spaceVar } from './space.js'
import { alignValue, cx, justifyValue, toLength } from './primitive.js'

describe('bento span planning', () => {
  it('leaves a row that already fills the grid alone', () => {
    expect(planBentoSpans([2, 2], 4)).toEqual([2, 2])
    expect(planBentoSpans([1, 1, 1, 1], 4)).toEqual([1, 1, 1, 1])
  })

  it('widens the last tile to close a ragged final row', () => {
    // The ragged bottom is the thing people actually notice about a bento grid, and it is
    // what makes an otherwise deliberate layout look like it ran out of content.
    expect(planBentoSpans([1, 1, 1], 4)).toEqual([1, 1, 2])
    expect(planBentoSpans([2, 1], 4)).toEqual([2, 2])
  })

  it('closes a gap left when a wide tile is pushed to the next row', () => {
    // A 3-wide tile cannot follow a 2-wide one in a 4-column grid, so the grid drops it to
    // the next row and leaves two dead cells behind. The tile ending the first row absorbs
    // them, and the pushed tile then ends up alone on its own row and absorbs the
    // remainder there — leaving two full-width rows rather than one ragged pair.
    expect(planBentoSpans([2, 3], 4)).toEqual([4, 4])
  })

  it('never lets a tile exceed the column count', () => {
    expect(planBentoSpans([9], 4)).toEqual([4])
    expect(planBentoSpans([1, 99], 3)).toEqual([3, 3])
  })

  it('clamps nonsense spans to at least one column', () => {
    expect(planBentoSpans([0, -3], 2)).toEqual([1, 1])
  })

  it('handles a single-column grid, where nothing can be ragged', () => {
    expect(planBentoSpans([1, 1, 1], 1)).toEqual([1, 1, 1])
  })

  it('handles an empty grid without throwing', () => {
    expect(planBentoSpans([], 4)).toEqual([])
  })

  it('always produces spans that tile into complete rows', () => {
    // The invariant that matters: after planning, the spans must sum to a multiple of the
    // column count, or a gap survived the pass.
    const cases: Array<[number[], number]> = [
      [[1, 1, 1], 4],
      [[2, 1, 1, 1], 4],
      [[1, 2, 2, 1, 1], 4],
      [[3, 1, 1], 4],
      [[1, 1, 1, 1, 1], 3],
      [[2, 2, 1], 3],
    ]

    for (const [spans, columns] of cases) {
      const planned = planBentoSpans(spans, columns)
      const total = planned.reduce((sum, span) => sum + span, 0)
      expect(total % columns, `spans ${spans} in ${columns} columns → ${planned}`).toBe(0)
    }
  })

  it('never reduces a tile below its requested span', () => {
    const requested = [2, 1, 1]
    const planned = planBentoSpans(requested, 4)
    planned.forEach((span, index) => {
      expect(span).toBeGreaterThanOrEqual(Math.min(requested[index] as number, 4))
    })
  })
})

describe('space scale', () => {
  it('ascends without duplicates', () => {
    for (let i = 1; i < SPACE_STEPS.length; i++) {
      expect(SPACE_STEPS[i] as number).toBeGreaterThan(SPACE_STEPS[i - 1] as number)
    }
  })

  it('maps every alias onto a real step', () => {
    // An alias pointing at a value that is not on the scale would silently produce
    // off-scale spacing, which is the exact failure the scale exists to prevent.
    for (const value of Object.values(SPACE_ALIASES)) {
      expect(SPACE_STEPS).toContain(value)
    }
  })

  it('orders the semantic aliases the way their names imply', () => {
    expect(SPACE_ALIASES.none).toBeLessThan(SPACE_ALIASES.tight)
    expect(SPACE_ALIASES.tight).toBeLessThan(SPACE_ALIASES.snug)
    expect(SPACE_ALIASES.snug).toBeLessThan(SPACE_ALIASES.normal)
    expect(SPACE_ALIASES.normal).toBeLessThan(SPACE_ALIASES.loose)
    expect(SPACE_ALIASES.loose).toBeLessThan(SPACE_ALIASES.section)
  })

  it('separates sections from within-section spacing by at least three times', () => {
    // Below roughly 3:1 the reader cannot tell where one idea ends and the next begins,
    // and the page reads as one undifferentiated block.
    expect(SPACE_ALIASES.section / SPACE_ALIASES.loose).toBeGreaterThanOrEqual(3)
  })

  it('resolves numbers, aliases, and raw lengths', () => {
    expect(resolveSpace(4)).toBeTruthy()
    expect(resolveSpace('normal')).toBe(resolveSpace(SPACE_ALIASES.normal))
    expect(resolveSpace('1.5rem')).toBe('1.5rem')
    expect(resolveSpace(undefined)).toBeUndefined()
  })

  it('names the custom property for a scale step', () => {
    // Returns the property name rather than a wrapped `var()`, so a caller can use it as a
    // declaration target as well as a reference. Wrapping is the caller's choice.
    expect(spaceVar(4)).toMatch(/^--/)
    expect(spaceVar(4)).toContain('space')
  })

  it('passes an arbitrary CSS value straight through', () => {
    // The escape hatch has to work, or people stop using the scale for the 95% of cases
    // where it fits rather than fighting it for the 5% where it does not.
    expect(resolveSpace('clamp(1rem, 4vw, 2rem)')).toBe('clamp(1rem, 4vw, 2rem)')
  })
})

describe('length coercion', () => {
  it('treats a bare number as pixels', () => {
    expect(toLength(16)).toBe('16px')
  })

  it('passes strings through untouched', () => {
    expect(toLength('2rem')).toBe('2rem')
    expect(toLength('50%')).toBe('50%')
  })

  it('preserves zero rather than dropping it', () => {
    // `0` is falsy, and a naive implementation returns undefined for it — which silently
    // removes the declaration instead of setting it to zero.
    expect(toLength(0)).toBe('0px')
  })

  it('returns undefined only for undefined', () => {
    expect(toLength(undefined)).toBeUndefined()
  })
})

describe('alignment mapping', () => {
  it('emits Box Alignment keywords rather than the flex-prefixed legacy ones', () => {
    // `start` and `end` are the CSS Box Alignment values, and they mean the same thing in
    // flex and grid contexts. The `flex-start`/`flex-end` spellings are flex-only legacy,
    // so emitting them would make a primitive behave differently depending on which
    // display mode its parent happened to use — exactly the surprise these primitives are
    // meant to remove.
    expect(alignValue('start')).toBe('start')
    expect(alignValue('end')).toBe('end')
    expect(alignValue('center')).toBe('center')
    expect(alignValue('stretch')).toBe('stretch')
    expect(alignValue('baseline')).toBe('baseline')
  })

  it('maps the distribution keywords', () => {
    expect(justifyValue('between')).toBe('space-between')
    expect(justifyValue('around')).toBe('space-around')
    expect(justifyValue('evenly')).toBe('space-evenly')
  })

  it('returns undefined when nothing was asked for', () => {
    expect(alignValue(undefined)).toBeUndefined()
    expect(justifyValue(undefined)).toBeUndefined()
  })
})

describe('class joining', () => {
  it('joins truthy parts', () => {
    expect(cx('a', 'b')).toBe('a b')
  })

  it('drops falsy parts, which is the whole point of taking them', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b')
  })

  it('returns undefined rather than an empty string when nothing survives', () => {
    // An empty `className=""` attribute is noise in the DOM and in snapshots.
    expect(cx(false, undefined)).toBeUndefined()
  })
})
