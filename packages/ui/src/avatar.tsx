'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { type ComponentPropsWithRef, type ReactNode, useState } from 'react'
import { cx, variants } from './variants.js'

/**
 * A person or organisation, as a small round image.
 *
 * The fallback is the part that matters, because the image is the part that fails: a signed
 * URL expires, a CDN blocks the referrer, the user is offline, the upload was never made. An
 * avatar that renders a broken-image glyph in those cases is worse than no avatar at all, so
 * initials are the *default* state here and the image is layered over them once it has
 * actually loaded.
 *
 * The initials are derived, not random. A colour picked at render time would differ between
 * the server and the client — a hydration mismatch — and would change every time the list
 * re-sorted, destroying the one thing a colour-coded avatar is for: recognising the same
 * person twice. So the tone is a pure function of the name.
 *
 * The name is split with `Array.from`, not `name[0]`. Indexing a string yields a UTF-16 code
 * unit, so a name beginning with an emoji, or with a character outside the basic plane,
 * produces half a surrogate pair — rendered as a replacement character, and quietly
 * unprintable in whatever the initials are later pasted into.
 */

/** Deterministic tone pairs, each with its foreground checked against its background. */
const TONES = [
  'bg-brand-100 text-brand-900',
  'bg-accent-100 text-accent-900',
  'bg-success-100 text-success-900',
  'bg-warning-100 text-warning-900',
  'bg-info-100 text-info-900',
  'bg-neutral-200 text-neutral-900',
] as const

const avatar = variants({
  base: 'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium select-none',
  variants: {
    size: {
      xs: 'size-6 text-xs',
      sm: 'size-8 text-sm',
      md: 'size-10 text-base',
      lg: 'size-12 text-lg',
      xl: 'size-16 text-2xl',
    },
    ring: {
      // A ring in the surface colour, so overlapping avatars in a stack stay separable.
      true: 'ring-2 ring-surface-default',
      false: '',
    },
  },
  defaults: { size: 'md', ring: 'false' },
})

/** Avatar diameter. */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * Up to two initials for a name.
 *
 * Takes the first character of the first and last whitespace-separated parts, which is the
 * least-wrong rule for the widest range of naming conventions — it degrades to a single
 * initial for mononyms rather than inventing a second one.
 */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''

  const first = parts[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : ''

  const head = Array.from(first)[0] ?? ''
  const tail = last ? (Array.from(last)[0] ?? '') : ''

  return `${head}${tail}`.toLocaleUpperCase()
}

/**
 * A stable index into the tone list for a name.
 *
 * Exported so a caller can colour something else — a chip, a calendar entry — to match the
 * same person's avatar.
 */
export function toneIndexFor(name: string, buckets: number = TONES.length): number {
  // A small FNV-style mix. Not a hash for security; a hash for stability, which is why it has
  // to be written out rather than taken from `Math.random` or an object identity.
  let hash = 2166136261
  for (const char of name) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash) % buckets
}

export interface AvatarProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** The person or organisation. Used for the initials and for the accessible name. */
  name: string
  /** Image URL. If it fails to load, the initials remain. */
  src?: string
  size?: AvatarSize
  /** Add a surface-coloured ring, for overlapping stacks. */
  ring?: boolean
  /**
   * Hide from assistive technology.
   *
   * Correct — and usually correct — when the name is already written next to the avatar.
   * Otherwise the name is announced twice in a row for every row of a list.
   */
  decorative?: boolean
}

/** An avatar with an initials fallback. */
export function Avatar({
  name,
  src,
  size = 'md',
  ring = false,
  decorative = false,
  className,
  ...rest
}: AvatarProps): ReactNode {
  // The failure flag is keyed on the URL and reset *during* render rather than in an effect.
  //
  // Without a reset at all, one broken image poisons the component for every subsequent
  // person rendered into the same position by a virtualised list. With an effect, the reset
  // lands one commit late, so the new person's avatar shows the previous person's fallback
  // for a frame. Adjusting state during render is the documented React pattern for exactly
  // this — React re-runs the component immediately, before anything is painted.
  const [failure, setFailure] = useState<{ src: string | undefined; failed: boolean }>({
    src,
    failed: false,
  })
  if (failure.src !== src) setFailure({ src, failed: false })

  const failed = failure.failed && failure.src === src

  const tone = TONES[toneIndexFor(name)] ?? TONES[TONES.length - 1]
  const initials = initialsFor(name)

  return (
    <span
      {...rest}
      className={avatar({
        size,
        ring: ring ? 'true' : 'false',
        className: cx(tone, className),
      })}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}
    >
      <span aria-hidden="true">{initials}</span>
      {src && !failed ? (
        // `alt=""` because the wrapper already carries the accessible name; an alt here would
        // be announced in addition to it.
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailure({ src, failed: true })}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </span>
  )
}

export interface AvatarGroupProps extends ComponentPropsWithRef<'div'> {
  /** The avatars. Anything past `max` is replaced by a count. */
  children: ReactNode
  /** How many to show before collapsing. */
  max?: number
  /** Total represented, when it is larger than the number of children rendered. */
  total?: number
}

/**
 * Overlapping avatars.
 *
 * The overlap is decorative, so the group is a single labelled unit rather than a list of
 * individually announced images — a stack of eight avatars otherwise costs a screen-reader
 * user eight announcements to learn a fact the sighted user got from a glance.
 */
export function AvatarGroup({
  children,
  max,
  total,
  className,
  ...rest
}: AvatarGroupProps): ReactNode {
  return (
    <div {...rest} className={cx('flex items-center -space-x-2', className)}>
      {children}
      {max !== undefined && total !== undefined && total > max ? (
        <span className="relative inline-flex size-10 items-center justify-center rounded-full bg-surface-subtle text-sm font-medium text-text-secondary ring-2 ring-surface-default">
          {`+${total - max}`}
        </span>
      ) : null}
    </div>
  )
}
