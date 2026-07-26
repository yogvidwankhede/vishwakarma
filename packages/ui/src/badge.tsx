'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cx, variants } from './variants.js'

/**
 * A short status label.
 *
 * Badges are where colour-only signalling creeps into a design system, because they are
 * small, they are repeated, and "just make the failed ones red" is such a natural sentence.
 * The rule enforced here is that a badge always renders its text: the colour is a second,
 * redundant channel and never the only one. That is also why there is no dot-only variant.
 *
 * Sizing is `min-h`, not `h`. A badge that clips its own text at 120% browser zoom or in a
 * language whose words are longer than English is worse than a badge that grows a little.
 */

const badge = variants({
  base: 'inline-flex max-w-full items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
  variants: {
    variant: {
      neutral: 'border-border-default bg-surface-subtle text-text-secondary',
      brand: 'border-brand-200 bg-brand-50 text-brand-800',
      success: 'border-success-200 bg-status-success-bg text-status-success-fg',
      warning: 'border-warning-200 bg-status-warning-bg text-status-warning-fg',
      danger: 'border-danger-200 bg-status-danger-bg text-status-danger-fg',
      info: 'border-info-200 bg-status-info-bg text-status-info-fg',
      /** Maximum emphasis, for the one badge on a page that must be seen. */
      solid: 'border-transparent bg-surface-inverse text-text-inverse',
    },
    size: {
      sm: 'min-h-5 px-2 py-0.5 text-xs',
      md: 'min-h-6 px-2.5 py-0.5 text-sm',
    },
  },
  defaults: { variant: 'neutral', size: 'md' },
})

/** Badge colour treatment. Always redundant with the badge's text. */
export type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'solid'

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  /** A decorative glyph before the text. The text still has to stand on its own. */
  icon?: ReactNode
  /** The status. Required: a badge with no text is a coloured dot, which says nothing. */
  children: ReactNode
}

/** A short, non-interactive status label. */
export function Badge({
  variant = 'neutral',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: BadgeProps): ReactNode {
  return (
    <span {...rest} className={badge({ variant, size, className })}>
      {icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  )
}

/**
 * A count, for unread items and similar.
 *
 * Caps the displayed value and announces the true one. "99+" beside an icon is a number a
 * screen reader would otherwise read as "ninety-nine plus", which is not what the badge
 * means; the visually hidden text carries the exact count and the context word, so the user
 * hears "142 unread notifications" rather than a bare number floating next to a button.
 */
export interface CountBadgeProps extends Omit<BadgeProps, 'children' | 'icon'> {
  /** The value. Negative values are treated as zero. */
  count: number
  /** Display `max+` above this value. */
  max?: number
  /** What is being counted, used in the announcement. */
  label: string
  /** Render nothing at zero. On by default: an empty inbox does not need a badge saying so. */
  hideAtZero?: boolean
}

/** A numeric badge with a capped display value and an uncapped announcement. */
export function CountBadge({
  count,
  max = 99,
  label,
  hideAtZero = true,
  variant = 'danger',
  size = 'sm',
  className,
  ...rest
}: CountBadgeProps): ReactNode {
  const safe = Math.max(0, Math.floor(count))
  if (safe === 0 && hideAtZero) return null

  return (
    <Badge {...rest} variant={variant} size={size} className={cx('tabular-nums', className)}>
      <span aria-hidden="true">{safe > max ? `${max}+` : safe}</span>
      <span className="sr-only">{`${safe} ${label}`}</span>
    </Badge>
  )
}
