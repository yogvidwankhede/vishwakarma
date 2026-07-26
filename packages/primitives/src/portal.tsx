'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

export interface PortalProps {
  children: ReactNode
  /**
   * Where to render. Defaults to `document.body`.
   *
   * Pass an element to keep the portalled content inside a subtree that carries theme
   * attributes or CSS custom properties. Portalling to `document.body` escapes every
   * ancestor, and with them every `--custom-property` the design system set on a theme
   * wrapper, which is why portalled dialogs so often lose their colours in dark mode.
   */
  container?: Element | DocumentFragment | null
  /**
   * Render in place instead of portalling.
   *
   * Useful when the reason for the portal — an ancestor with `overflow: hidden` or a
   * `transform` that creates a containing block — does not apply, and keeping the content in
   * DOM order is worth more.
   */
  disabled?: boolean
}

/**
 * Render children somewhere else in the document.
 *
 * ## What a portal costs
 *
 * Portals exist to escape CSS: an ancestor with `overflow: hidden` clips a dropdown, an
 * ancestor with `transform` or `filter` becomes the containing block for `position: fixed`
 * and pins a modal inside a card. Those are real problems with no in-place solution.
 *
 * The price is paid in the accessibility tree, which follows DOM order, not visual order. A
 * menu portalled to `document.body` is announced at the end of the document, nowhere near
 * the button that opened it. A screen reader user who opens the menu and swipes forward
 * leaves it immediately; one who navigates by heading never encounters it at all. Keyboard
 * order is likewise broken — Tab out of the portalled content and focus lands wherever the
 * portal sits in the document, usually past everything.
 *
 * So: portal a modal dialog, where focus is trapped and DOM order is irrelevant because
 * nothing else is reachable. Think hard before portalling anything non-modal, and if you do,
 * manage focus explicitly on both the way in and the way out.
 *
 * ## Why nothing renders on the first pass
 *
 * `document` does not exist during server rendering, and `createPortal` has nothing to
 * target. Rendering `null` until after mount is not just a guard against a crash — it is
 * what keeps hydration honest. The server produced nothing here; if the first client render
 * produced content, React would report a mismatch and, in React 19, discard and re-render the
 * subtree. One frame with no dialog is invisible to the user, because the effect that
 * commits it runs before paint.
 */
export function Portal({ children, container, disabled = false }: PortalProps): ReactNode {
  const [target, setTarget] = useState<Element | DocumentFragment | null>(null)

  useIsomorphicLayoutEffect(() => {
    if (disabled) return
    setTarget(container ?? document.body)
  }, [container, disabled])

  if (disabled) return <>{children}</>
  if (!target) return null

  return createPortal(children, target)
}
