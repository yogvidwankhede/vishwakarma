'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useReducedMotion } from '@vishwakarma/motion'
import { cx } from './variants.js'

/**
 * An indeterminate progress indicator.
 *
 * Two things about this component are less obvious than they look.
 *
 * It does not stop for reduced motion, it slows down. A spinner is one of the rare cases
 * where the motion carries the information: "still working" is exactly what the rotation
 * says, and freezing it turns a busy control into a broken one. WCAG's exception for motion
 * essential to the meaning applies. What we can do is remove the *urgency* — a slow, even
 * rotation is far less provocative for a vestibular disorder than a fast one — and that is
 * what the duration swap below does.
 *
 * It also announces itself only once. A spinner rendered inside a control that already
 * carries `aria-busy` and its own status text would otherwise be announced twice, which is
 * why {@link SpinnerProps.decorative} exists and why {@link Button} uses it.
 */

const SIZES = {
  sm: 'size-3.5 border-2',
  md: 'size-4 border-2',
  lg: 'size-6 border-[3px]',
} as const

/** How large the spinner is drawn. */
export type SpinnerSize = keyof typeof SIZES

export interface SpinnerProps {
  /** Diameter. Defaults to `md`. */
  size?: SpinnerSize
  /**
   * Text announced while the spinner is present. Rendered visually hidden.
   *
   * Say what is loading, not that something is: "Loading invoices" tells a screen-reader
   * user which part of the page to return to, and "Loading" does not.
   */
  label?: string
  /**
   * Hide from assistive technology entirely.
   *
   * Correct whenever an ancestor already announces the busy state — otherwise the user hears
   * the same fact twice, half a second apart.
   */
  decorative?: boolean
  className?: string
}

/** Indeterminate activity indicator. Inherits its colour from the surrounding text. */
export function Spinner({
  size = 'md',
  label = 'Loading',
  decorative = false,
  className,
}: SpinnerProps): ReactNode {
  const prefersReduced = useReducedMotion()

  // The server snapshot of the preference is deliberately "reduced" (see
  // `useReducedMotion`), so the first paint is the calm variant and the client corrects it
  // upwards. Erring in that direction costs an animation-frame of slowness; erring the other
  // way costs a user with a vestibular disorder an unrequested spin on every page load.
  const style: CSSProperties = { animationDuration: prefersReduced ? '1.8s' : '0.7s' }

  const circle = (
    <span
      aria-hidden="true"
      style={style}
      className={cx(
        'inline-block animate-spin rounded-full border-current border-r-transparent border-b-transparent',
        SIZES[size],
        className,
      )}
    />
  )

  if (decorative) return circle

  return (
    <span role="status" className="inline-flex items-center">
      {circle}
      <span className="sr-only">{label}</span>
    </span>
  )
}
