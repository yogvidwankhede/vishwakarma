'use client'

import type { ReactNode } from 'react'
import { cx, toLength, type LayoutPrimitiveProps } from './primitive.js'
import { resolveSpace, type Space } from './space.js'

/**
 * Primitives that constrain size rather than arrange children.
 *
 * The three here — {@link Center}, {@link Cover}, {@link Frame} — plus {@link Spacer} are
 * the ones people most often inline as one-off `<div style={{...}}>` and then reimplement
 * slightly differently on the next page. Each encodes a decision that is easy to get
 * subtly wrong, and the value of having them as components is less about saving keystrokes
 * than about the decision being made once.
 */

export interface CenterProps extends LayoutPrimitiveProps {
  /**
   * Maximum line length, in characters.
   *
   * Expressed as a measure rather than a pixel width on purpose. A pixel max-width is
   * wrong the moment the font size changes — a 720px column is comfortable at 16px and
   * punishing at 24px, and a user who has increased their browser font size gets *longer*
   * lines rather than the same ones larger. A `ch` value tracks the font, so the reading
   * experience is preserved rather than the geometry.
   *
   * Around 66 characters is the sweet spot for continuous prose. Below roughly 45 the eye
   * makes too many return sweeps; above roughly 75 it starts losing its place finding the
   * start of the next line.
   */
  measure?: number | string
  /** Horizontal padding, so the text never touches the viewport edge on a phone. */
  gutter?: Space
  /**
   * Also centre the text itself, not just the column.
   *
   * Off by default, and it should usually stay off. Centred paragraphs produce a ragged
   * left edge, and the left edge is where the eye returns on every single line.
   */
  centreText?: boolean
  /** Centre children along the inline axis too, for a column of mixed-width elements. */
  intrinsic?: boolean
  children?: ReactNode
}

/**
 * A readable column, centred in its parent.
 *
 * The `gutter` is the part people forget. A bare `max-width` plus `margin-inline: auto`
 * looks correct on a laptop and puts text flush against both screen edges on a phone,
 * because the max-width never engages at that size and nothing else supplies padding.
 */
export function Center({
  as: Component = 'div',
  measure = 66,
  gutter = 'gutter',
  centreText = false,
  intrinsic = false,
  className,
  style,
  ref,
  children,
  ...rest
}: CenterProps) {
  return (
    <Component
      ref={ref}
      className={cx('vk-center', className)}
      style={{
        boxSizing: 'border-box',
        marginInline: 'auto',
        minInlineSize: 0,
        maxInlineSize: typeof measure === 'number' ? `${measure}ch` : measure,
        paddingInline: resolveSpace(gutter),
        ...(centreText ? { textAlign: 'center' } : {}),
        ...(intrinsic ? { display: 'flex', flexDirection: 'column', alignItems: 'center' } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  )
}

export interface CoverProps extends LayoutPrimitiveProps {
  /**
   * Minimum block size.
   *
   * Defaults to `100svh` rather than `100vh`. On mobile browsers `vh` is resolved against
   * the *largest* viewport — the one with the URL bar retracted — so a `100vh` hero is
   * taller than the screen on first paint, pushing its own call to action below the fold
   * and forcing a scroll to see the thing the section exists for. `svh` uses the smallest
   * viewport, which is the one actually visible when the page loads.
   *
   * A `vh` fallback is emitted first for browsers without the newer units, so the
   * declaration degrades rather than being dropped.
   */
  minHeight?: string
  /** Padding between the edge of the Cover and its content. */
  padding?: Space
  /** Space between the centred content and any content pinned above or below it. */
  gap?: Space
  /** Content pinned to the top, above the centred region. */
  top?: ReactNode
  /** Content pinned to the bottom, below the centred region. */
  bottom?: ReactNode
  children?: ReactNode
}

/**
 * Vertically centred content with optional pinned top and bottom regions.
 *
 * The classic hero layout: a logo at the top, the message in the middle, a scroll hint at
 * the bottom, and the middle genuinely centred in whatever space is left rather than
 * centred in the whole box and overlapping the other two.
 *
 * Uses a three-row grid with `1fr` on the centred row instead of flexbox with
 * `justify-content: center`. The difference shows when the content is taller than the
 * container: a centred flex child overflows in *both* directions and the top of it becomes
 * unreachable, because you cannot scroll above the start of a scroll container. The grid
 * row simply grows.
 */
export function Cover({
  as: Component = 'div',
  minHeight = '100svh',
  padding = 'loose',
  gap = 'loose',
  top,
  bottom,
  className,
  style,
  ref,
  children,
  ...rest
}: CoverProps) {
  const usesViewportUnit = /\d(?:svh|lvh|dvh)$/.test(minHeight)

  return (
    <Component
      ref={ref}
      className={cx('vk-cover', className)}
      style={{
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        minInlineSize: 0,
        // The plain `vh` value is emitted first so a browser that does not understand the
        // small-viewport unit keeps a usable height rather than discarding the declaration.
        ...(usesViewportUnit ? { minBlockSize: minHeight.replace(/(svh|lvh|dvh)$/, 'vh') } : {}),
        minBlockSize: minHeight,
        gap: resolveSpace(gap),
        padding: resolveSpace(padding),
        ...style,
      }}
      {...rest}
    >
      {/* The empty divs keep the three-row structure stable, so the centred row stays
          centred whether or not the pinned regions are present. */}
      <div style={{ minInlineSize: 0 }}>{top}</div>
      <div style={{ minInlineSize: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {children}
      </div>
      <div style={{ minInlineSize: 0 }}>{bottom}</div>
    </Component>
  )
}

export interface FrameProps extends LayoutPrimitiveProps {
  /** Aspect ratio as `width / height`, or a CSS ratio string such as `16 / 9`. */
  ratio?: number | string
  /** How the content fills the frame. */
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  /** Focal point, for when `cover` has to crop. */
  position?: string
  /** Clip content to the frame's border radius. */
  radius?: string | number
  children?: ReactNode
}

/**
 * A fixed-ratio box that reserves its space before its content loads.
 *
 * This is a layout-shift fix more than a layout primitive. An image without declared
 * dimensions occupies zero height until it decodes, then suddenly occupies its natural
 * height and shoves everything below it down the page. If the user was reading — or worse,
 * about to tap something — that shift is the defect measured by Cumulative Layout Shift,
 * and it is the cheapest of the three Core Web Vitals to eliminate completely.
 *
 * `aspect-ratio` reserves the box from the first layout pass, so nothing moves when the
 * image arrives.
 */
export function Frame({
  as: Component = 'div',
  ratio = '16 / 9',
  fit = 'cover',
  position = 'center',
  radius,
  className,
  style,
  ref,
  children,
  ...rest
}: FrameProps) {
  return (
    <Component
      ref={ref}
      className={cx('vk-frame', className)}
      style={{
        position: 'relative',
        display: 'block',
        minInlineSize: 0,
        aspectRatio: typeof ratio === 'number' ? String(ratio) : ratio,
        ...(radius !== undefined ? { borderRadius: toLength(radius), overflow: 'hidden' } : {}),
        // Applied to the descendant rather than to a wrapper so that an <img>, a <video>,
        // or a next/image all behave identically without the caller changing anything.
        ['--vk-frame-fit' as string]: fit,
        ['--vk-frame-position' as string]: position,
        ...style,
      }}
      {...rest}
    >
      {children}
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed literal with no interpolation; a scoped rule is the only way to reach the media child without requiring the caller to add a class. */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            '.vk-frame > img, .vk-frame > video, .vk-frame > canvas, .vk-frame > svg { inline-size: 100%; block-size: 100%; object-fit: var(--vk-frame-fit); object-position: var(--vk-frame-position); display: block; }',
        }}
      />
    </Component>
  )
}

export interface SpacerProps extends LayoutPrimitiveProps {
  /** Fixed size along the parent's main axis. */
  size?: Space
  /**
   * Grow to consume whatever space is left.
   *
   * The honest use for this is pushing a trailing item to the far end of a flex row when
   * `justify-content: space-between` cannot express the arrangement — three items where
   * only the last should be pushed away, for instance.
   */
  grow?: boolean
  /** Force the axis rather than inheriting it from the parent's direction. */
  axis?: 'block' | 'inline' | 'both'
}

/**
 * Explicit empty space.
 *
 * Included with reservations, and worth stating them. A Spacer is almost always the wrong
 * tool: spacing between elements is a property of the *arrangement*, so it belongs on the
 * container as a `gap`, where it survives reordering and conditional rendering. A Spacer
 * bakes the relationship into the sequence of children, which is exactly the fragility
 * that container-owned spacing exists to avoid.
 *
 * It earns its place in two cases. The first is `grow`, where it is a flexible strut
 * rather than a fixed gap and there is no `gap` equivalent. The second is a genuine
 * one-off deviation from the rhythm that would otherwise require a wrapper component
 * created solely to carry a margin.
 *
 * It is deliberately `aria-hidden` and `role="presentation"`: it carries no content, and
 * an empty element announced by a screen reader is noise.
 */
export function Spacer({
  as: Component = 'div',
  size = 'normal',
  grow = false,
  axis = 'both',
  className,
  style,
  ref,
  ...rest
}: SpacerProps) {
  const length = resolveSpace(size)

  return (
    <Component
      ref={ref}
      aria-hidden="true"
      role="presentation"
      className={cx('vk-spacer', className)}
      style={{
        flexShrink: 0,
        ...(grow ? { flexGrow: 1 } : {}),
        ...(axis === 'block' || axis === 'both' ? { blockSize: grow ? undefined : length } : {}),
        ...(axis === 'inline' || axis === 'both' ? { inlineSize: grow ? undefined : length } : {}),
        ...style,
      }}
      {...rest}
    />
  )
}
