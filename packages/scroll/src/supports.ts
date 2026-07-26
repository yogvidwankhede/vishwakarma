'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { useSyncExternalStore } from 'react'

/**
 * Feature detection for CSS scroll-driven animations.
 *
 * Scroll-driven animations are worth reaching for wherever they fit, because they are not
 * merely a tidier way to write the same thing. A scripted binding samples the scroll offset
 * on the main thread one frame after the compositor has already scrolled, so the effect is
 * permanently one frame behind the content it is attached to — visible as a shear between a
 * parallax layer and the page during a fast fling, and completely unrecoverable if the main
 * thread is busy. A `view()` or `scroll()` timeline is driven from the same scroll offset the
 * compositor is already using, so it cannot lag and it does not compete with React for the
 * main thread.
 *
 * What it cannot do is anything conditional, anything that needs the value in JavaScript,
 * and anything outside a range CSS can name. Those keep the scripted path, and the two paths
 * are written to produce identical numbers so that switching between them is invisible.
 */

/** Whether the browser can drive an animation from a scroll timeline at all. */
export function supportsScrollTimeline(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return CSS.supports('animation-timeline: scroll()')
}

/** Whether the browser supports element-relative (`view()`) timelines specifically. */
export function supportsViewTimeline(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false
  return CSS.supports('animation-timeline: view()')
}

/**
 * Whether `@property` registration is available.
 *
 * This is the part people forget. A scroll timeline can only interpolate a custom property
 * if that property has been registered with a `<number>` syntax; an unregistered custom
 * property is a string as far as CSS is concerned, so the animation snaps from 0 to 1 at the
 * halfway mark instead of easing through it. Support has shipped alongside scroll timelines
 * everywhere so far, but they are separate features and are checked separately.
 */
export function supportsRegisteredProperties(): boolean {
  if (typeof CSS === 'undefined') return false
  // The `@property` at-rule cannot be feature-detected with `CSS.supports`, which tests
  // declarations rather than at-rules. `CSS.registerProperty` is the same feature exposed to
  // script and has shipped in lockstep with it in every engine, so it stands in as the probe.
  return 'registerProperty' in CSS
}

function subscribe(): () => void {
  // Support is fixed for the lifetime of the document. The subscription exists only because
  // `useSyncExternalStore` requires one; there is nothing to listen to.
  return () => {}
}

const clientSnapshot = (): boolean => supportsViewTimeline() && supportsRegisteredProperties()

const serverSnapshot = (): boolean => false

/**
 * Whether the native path is available, in a form that is safe during hydration.
 *
 * `useSyncExternalStore` is used rather than a `useState` initialiser because React calls the
 * server snapshot during hydration and only then re-renders with the client value. Reading
 * `CSS.supports` directly in a `useState` initialiser would make the first client render
 * disagree with the server markup, and React's recovery from that is to discard and re-render
 * the subtree — a much larger cost than the one extra render this causes.
 */
export function useScrollTimelineSupport(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
}
