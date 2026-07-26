// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { findColourLiterals, nearestToken, parseColourLiteral, stripUrls } from './colour.js'
import { configs, plugin } from './configs.js'
import { scanClassList, scanDeclarations, toCssProperty } from './css.js'
import { rules } from './rules/index.js'
import { checkScale, toPixels } from './spacing.js'

describe('colour scanning', () => {
  it('finds hex, rgb and hsl literals', () => {
    expect(findColourLiterals('color: #3b82f6; border: 1px solid rgb(0 0 0 / 40%)')).toEqual([
      '#3b82f6',
      'rgb(0 0 0 / 40%)',
    ])
  })

  it('does not mistake an SVG fragment reference for a colour', () => {
    expect(findColourLiterals(stripUrls('fill: url(#fab)'))).toEqual([])
  })

  it('parses hsl to the same colour as its hex equivalent', () => {
    const fromHsl = parseColourLiteral('hsl(0 100% 50%)')
    expect(fromHsl?.r).toBeCloseTo(1, 5)
    expect(fromHsl?.g).toBeCloseTo(0, 5)
  })

  it('suggests a token only when it is perceptually the same colour', () => {
    const colour = parseColourLiteral('#3b82f7')
    expect(colour).not.toBeNull()
    const tokens = [
      { name: 'colour.accent.500', value: '#3b82f6' },
      { name: 'colour.danger.500', value: '#ef4444' },
    ]
    expect(nearestToken(colour ?? { r: 0, g: 0, b: 0 }, tokens)?.name).toBe('colour.accent.500')
    const red = parseColourLiteral('#00ff00')
    expect(nearestToken(red ?? { r: 0, g: 0, b: 0 }, tokens)).toBeUndefined()
  })
})

describe('css reading', () => {
  it('recovers declarations from nested blocks', () => {
    expect(scanDeclarations('&:hover { padding: 13px; } color: red;')).toEqual([
      { property: 'padding', value: '13px' },
      { property: 'color', value: 'red' },
    ])
  })

  it('splits variants without breaking arbitrary ones', () => {
    const [utility] = scanClassList('supports-[display:grid]:md:p-[13px]')
    expect(utility?.variants).toEqual(['supports-[display:grid]', 'md'])
    expect(utility?.base).toBe('p')
    expect(utility?.arbitrary).toBe('13px')
  })

  it('converts style keys to CSS spelling', () => {
    expect(toCssProperty('backgroundClip')).toBe('background-clip')
    expect(toCssProperty('--brand')).toBe('--brand')
  })
})

describe('spacing', () => {
  it('resolves px and rem but not context-dependent units', () => {
    expect(toPixels('1.5rem')).toBe(24)
    expect(toPixels('12px')).toBe(12)
    expect(toPixels('2em')).toBeUndefined()
    expect(toPixels('calc(100% - 4px)')).toBeUndefined()
  })

  it('names the steps either side of an off-scale value', () => {
    const verdict = checkScale(13, [0, 4, 8, 12, 16])
    expect(verdict.onScale).toBe(false)
    expect(verdict.below).toBe(12)
    expect(verdict.above).toBe(16)
    expect(verdict.nearest).toBe(12)
  })

  it('ignores the sign of a negative margin', () => {
    expect(checkScale(-16, [0, 8, 16]).onScale).toBe(true)
  })
})

describe('package integrity', () => {
  it('gives every rule a documented, message-complete meta block', () => {
    for (const [name, rule] of Object.entries(rules)) {
      expect(rule.meta.docs.url).toContain(name)
      expect(rule.meta.docs.description.length).toBeGreaterThan(20)
      expect(Object.keys(rule.meta.messages).length).toBeGreaterThan(0)
      for (const message of Object.values(rule.meta.messages)) {
        expect(typeof message).toBe('string')
      }
    }
  })

  it('configures exactly the rules it ships, under the plugin namespace', () => {
    for (const preset of Object.values(configs)) {
      const configured = Object.keys(preset.rules).map((name) => name.split('/')[1])
      expect(new Set(configured)).toEqual(new Set(Object.keys(plugin.rules)))
    }
  })
})
