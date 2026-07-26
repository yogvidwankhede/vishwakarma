'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { CSSProperties, ReactNode } from 'react'
import { SceneDescription } from './scene-description.js'

/**
 * The version of the page that most people will actually see.
 *
 * This is the component teams treat as an afterthought, and it is the wrong one to. Add up
 * the users who get the fallback: everyone on the first paint before the bundle arrives,
 * everyone whose device failed the capability check, everyone with data saving on, everyone
 * behind a proxy that mangled the module, everyone whose GPU process crashed, every crawler,
 * every link preview, every print. On a typical marketing page that is not an edge case;
 * it is a substantial share of the traffic, and on the metrics that measure the first
 * impression — the largest paint, the layout shift — it is *everyone*, because the fallback
 * is what occupies the space while the scene is still being decided upon.
 *
 * So it has to be a composition that stands on its own: a real image, at the right aspect
 * ratio, holding its own space. Not a spinner. Not a grey box. And never an explanation —
 * a message reading "3D unavailable on your device" tells the user something they cannot
 * act on, in the place where they expected to see the product.
 *
 * The other rule is that the fallback and the scene must occupy identical space. If they do
 * not, the swap moves the page under whoever is already reading it, and a cumulative layout
 * shift caused by a decorative flourish is the least defensible kind there is.
 */

/** Why the fallback is being shown. Affects nothing visible by default; see below. */
export type SceneFallbackReason =
  /** The 3D bundle is still arriving. */
  | 'loading'
  /** The device cannot or should not run the scene. */
  | 'unsupported'
  /** The user asked not to have it — data saving, or an application-level preference. */
  | 'declined'
  /** Something failed. The scene may have loaded and then crashed. */
  | 'error'
  /** The container has not been scrolled near yet. */
  | 'offscreen'

export interface SceneFallbackProps {
  /**
   * A poster image. The best fallback for a scene that has one canonical view: render the
   * scene once at build time and ship the result.
   */
  poster?: string
  /** `srcSet` for the poster, so the fallback is not itself a performance problem. */
  posterSrcSet?: string
  /** `sizes` for the poster. */
  posterSizes?: string
  /**
   * Alternative text for the poster.
   *
   * Required whenever a poster is given, and required to be *useful*. This is frequently
   * the only description of the scene's subject that any assistive technology will ever
   * encounter, since the canvas that replaces it conveys nothing at all.
   */
  alt?: string
  /**
   * Custom content, used instead of the poster.
   *
   * Where a genuinely designed alternative goes: a still composition, a diagram, a table of
   * the numbers the visualisation was showing.
   */
  children?: ReactNode
  /**
   * Aspect ratio of the reserved space, as a CSS `aspect-ratio` value.
   *
   * Set it to whatever the canvas will occupy. This is what stops the swap from shifting
   * the page, and it must match — approximately is not good enough, because the shift is
   * measured in fractions of the viewport and a five per cent error is still a shift.
   */
  aspectRatio?: string
  /** A CSS background for the reserved space. Shown beneath and around the poster. */
  background?: string
  /**
   * Why the fallback is showing.
   *
   * Accepted, recorded, and deliberately not rendered. It is here so that the components in
   * this package can pass it through uniformly and an application can branch on it for
   * analytics — knowing what share of visitors never see the scene is genuinely useful.
   * What it must not become is copy on the page: the reason is interesting to the team and
   * irrelevant to the person looking at the picture.
   */
  reason?: SceneFallbackReason
  /**
   * A textual equivalent, exposed to assistive technology.
   *
   * Rendered in addition to the poster's alt text, for anything the image cannot carry.
   */
  description?: ReactNode
  /** Show the description on screen too. */
  showDescription?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * The static alternative to a 3D scene.
 *
 * Note what is deliberately absent: any spinner, progress indicator or state message. A
 * progress bar in place of a hero implies the real content is imminent and worth waiting
 * for, so the user waits — and for the substantial fraction who will never get the scene at
 * all, they wait for nothing. Show the still composition immediately and let the scene
 * replace it if and when it can.
 */
export function SceneFallback({
  poster,
  posterSrcSet,
  posterSizes,
  alt = '',
  children,
  aspectRatio,
  background,
  description,
  showDescription = false,
  className,
  style,
}: SceneFallbackProps): ReactNode {
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    ...(aspectRatio ? { aspectRatio } : {}),
    ...(background ? { background } : {}),
    overflow: 'hidden',
    ...style,
  }

  return (
    <div className={className} style={containerStyle}>
      {poster ? (
        // Eager, not lazy. A fallback that lazy-loads is a blank box during exactly the
        // window it exists to cover, and if this is the hero it is also the largest paint —
        // deferring it makes the metric worse, which is the opposite of the intent.
        <img
          src={poster}
          {...(posterSrcSet ? { srcSet: posterSrcSet } : {})}
          {...(posterSizes ? { sizes: posterSizes } : {})}
          alt={alt}
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : null}
      {children}
      {description ? (
        <SceneDescription visible={showDescription}>{description}</SceneDescription>
      ) : null}
    </div>
  )
}
