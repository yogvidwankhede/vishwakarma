'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { type ReactNode, useEffect } from 'react'

/**
 * The stylesheet the native path depends on.
 *
 * Two declarations do the work. The `@property` registration gives
 * `--vk-scroll-progress` a `<number>` syntax, without which CSS treats it as an opaque
 * string and refuses to interpolate it — the animation would jump from 0 to 1 halfway
 * through the range rather than sweeping across it. The keyframes then animate that one
 * property from 0 to 1, and each bound element attaches its own timeline and range inline.
 *
 * Registering the property also gives it an initial value of 0, which is what makes every
 * `var(--vk-scroll-progress)` in consumer CSS valid before any binding has run. Without the
 * registration, an unset custom property inside a `calc()` makes the whole declaration
 * invalid at computed-value time, so a transform that depends on it is dropped and the
 * element jumps to its untransformed position for one frame.
 */

/** The custom property every binding writes to unless told otherwise. */
export const PROGRESS_PROPERTY = '--vk-scroll-progress'

/** The `id` of the injected style element, so injection is idempotent across bundles. */
export const SCROLL_STYLE_ID = 'vk-scroll-styles'

/** Marks an element whose progress property is driven by a CSS scroll timeline. */
export const NATIVE_ATTRIBUTE = 'data-vk-scroll-native'

/** The stylesheet text, exported so it can be inlined into a static build. */
export const SCROLL_CSS = `
@property ${PROGRESS_PROPERTY} {
  syntax: "<number>";
  inherits: true;
  initial-value: 0;
}
@keyframes vk-scroll-progress {
  from { ${PROGRESS_PROPERTY}: 0; }
  to { ${PROGRESS_PROPERTY}: 1; }
}
[${NATIVE_ATTRIBUTE}] {
  animation-name: vk-scroll-progress;
  animation-fill-mode: both;
  animation-timing-function: linear;
  animation-iteration-count: 1;
  animation-duration: 1ms;
}
`.trim()

/**
 * Render once, as high in the document as possible.
 *
 * Rendering it in the head means the registration exists before first paint, so an element
 * whose transform reads the progress property is laid out correctly on the very first frame
 * rather than snapping into place after hydration.
 */
export function ScrollStyles({ nonce }: { nonce?: string } = {}): ReactNode {
  return (
    <style
      id={SCROLL_STYLE_ID}
      {...(nonce ? { nonce } : {})}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static stylesheet text, no interpolation of external input.
      dangerouslySetInnerHTML={{ __html: SCROLL_CSS }}
    />
  )
}

let injected = false

/**
 * Inject the stylesheet at runtime if it is not already present.
 *
 * The native path is silently wrong without these rules — the keyframes would not exist and
 * the element would sit at its initial value forever — so the components that use it inject
 * the sheet themselves rather than trusting that {@link ScrollStyles} was rendered. Doing it
 * from an effect means it lands after first paint, which is why {@link ScrollStyles} is still
 * the better option when the document head is under your control.
 *
 * Safe to call repeatedly; guarded by both a module flag and the element id, so two copies of
 * this package in one page still produce one stylesheet.
 */
export function ensureScrollStyles(nonce?: string): void {
  if (injected || typeof document === 'undefined') return
  injected = true

  if (document.getElementById(SCROLL_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = SCROLL_STYLE_ID
  if (nonce) style.setAttribute('nonce', nonce)
  style.textContent = SCROLL_CSS
  document.head.append(style)
}

/**
 * Effect-shaped wrapper around {@link ensureScrollStyles}, for components on the native path.
 */
export function useScrollStyles(enabled: boolean, nonce?: string): void {
  useEffect(() => {
    if (enabled) ensureScrollStyles(nonce)
  }, [enabled, nonce])
}
