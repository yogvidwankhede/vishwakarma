'use client'

import { useReducedMotion } from '@vishwakarma/motion'
import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react'
import { cx, variants } from './variants.js'

/**
 * A placeholder for content that has not arrived.
 *
 * Skeletons are usually announced wrongly, in one of two directions. Left alone they are
 * empty boxes, so a screen reader reports a page with no content and no explanation. Wrapped
 * in a live region per placeholder, they produce a burst of announcements as each one is
 * replaced. Neither is what a sighted user experiences, which is a single impression of
 * "something is coming".
 *
 * So the individual placeholders are `aria-hidden`, and {@link SkeletonGroup} provides the
 * one busy region for the whole block. Use the group; a lone `Skeleton` is a shape, not a
 * status.
 *
 * The pulse is a preference, not a decoration: `useReducedMotion` returns "reduced" during
 * server rendering, so the first paint is static and the animation begins only once the
 * client has confirmed the user is happy with it. A page of forty pulsing rectangles is one
 * of the more provocative things an interface can do to a vestibular disorder, and it arrives
 * unrequested at the moment of navigation.
 */

const skeleton = variants({
  base: 'block bg-neutral-200 dark:bg-neutral-800',
  variants: {
    shape: {
      text: 'rounded-sm',
      block: 'rounded-lg',
      circle: 'rounded-full',
    },
  },
  defaults: { shape: 'text' },
})

/** Outline of the thing being waited for. */
export type SkeletonShape = 'text' | 'block' | 'circle'

export interface SkeletonProps extends ComponentPropsWithRef<'span'> {
  shape?: SkeletonShape
  /** CSS width. Vary it between lines: a paragraph of identical bars does not read as text. */
  width?: string | number
  /** CSS height. Defaults to one line for `text`. */
  height?: string | number
  /** Suppress the pulse for this placeholder. */
  still?: boolean
}

/** One placeholder shape. Always hidden from assistive technology — see the module note. */
export function Skeleton({
  shape = 'text',
  width,
  height,
  still = false,
  className,
  style,
  ...rest
}: SkeletonProps): ReactNode {
  const prefersReduced = useReducedMotion()
  const animate = !still && !prefersReduced

  const dimensions: CSSProperties = {
    ...style,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : { minHeight: shape === 'text' ? '1em' : undefined }),
  }

  return (
    <span
      {...rest}
      aria-hidden="true"
      style={dimensions}
      className={skeleton({ shape, className: cx(animate && 'animate-pulse', className) })}
    />
  )
}

export interface SkeletonGroupProps extends ComponentPropsWithRef<'div'> {
  /** The placeholders. */
  children: ReactNode
  /**
   * What is loading. Announced once, politely.
   *
   * Name the content, not the act: "Loading transactions" lets the user decide whether to
   * wait, and "Loading" does not.
   */
  label?: string
}

/**
 * A busy region wrapping a set of placeholders.
 *
 * `aria-busy` on a region tells assistive technology to hold off describing a subtree that is
 * mid-update, which is exactly the state a skeleton represents. The visually hidden label is
 * what actually gets spoken, because `aria-busy` on its own is announced inconsistently.
 */
export function SkeletonGroup({
  children,
  label = 'Loading',
  className,
  ...rest
}: SkeletonGroupProps): ReactNode {
  return (
    <div {...rest} role="status" aria-busy="true" className={cx('flex flex-col gap-2', className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
