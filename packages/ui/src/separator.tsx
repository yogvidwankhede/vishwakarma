'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cx } from './variants.js'

/**
 * A dividing line.
 *
 * Most separators are decoration and should say so. A page that divides every list row with
 * `role="separator"` adds one announcement per row for a screen-reader user, describing
 * something that carries no information they did not already have from the list structure.
 * `decorative` is therefore the default, and it maps to `role="none"` rather than merely
 * omitting the role — an `<hr>` has an implicit separator role that has to be removed
 * explicitly.
 *
 * Use a non-decorative separator when the line is genuinely the only thing marking a change
 * of topic, which is most often in menus, between groups of unrelated commands.
 *
 * Thickness is `border`, not `height`. A one-pixel `height` disappears entirely at certain
 * zoom levels and on certain device pixel ratios, because a sub-pixel box can round to zero;
 * a border is snapped by the browser and always renders.
 */

export interface SeparatorProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Direction of the line. Vertical separators need a parent with a definite height. */
  orientation?: 'horizontal' | 'vertical'
  /** Whether the line carries meaning. Defaults to decoration. */
  decorative?: boolean
  /**
   * Text set into the line — "or", "Today", "Archived".
   *
   * A labelled separator is never decorative: the text is content, so the element keeps its
   * separator role and the label becomes its accessible name.
   */
  label?: ReactNode
}

/** A horizontal or vertical dividing line. */
export function Separator({
  orientation = 'horizontal',
  decorative = true,
  label,
  className,
  ...rest
}: SeparatorProps): ReactNode {
  const vertical = orientation === 'vertical'

  if (label) {
    return (
      // biome-ignore lint/a11y/useSemanticElements: an <hr> is a void element and cannot contain the label.
      // biome-ignore lint/a11y/useFocusableInteractive: only a *focusable* separator — a draggable splitter — is interactive. A static divider that took a tab stop would add one stop per section for no gain.
      <div
        {...rest}
        // biome-ignore lint/a11y/useAriaPropsForRole: aria-valuenow is required of focusable separators only, per ARIA 1.2. Supplying a position on a divider that has none would be a lie the screen reader repeats.
        role="separator"
        aria-orientation={orientation}
        className={cx('flex items-center gap-3 text-xs text-text-tertiary', className)}
      >
        <span aria-hidden="true" className="h-0 flex-1 border-t border-border-subtle" />
        <span className="shrink-0">{label}</span>
        <span aria-hidden="true" className="h-0 flex-1 border-t border-border-subtle" />
      </div>
    )
  }

  return (
    <div
      {...rest}
      {...(decorative ? { role: 'none' } : { role: 'separator', 'aria-orientation': orientation })}
      className={cx(
        'shrink-0 border-border-subtle',
        vertical ? 'h-auto w-0 self-stretch border-l' : 'h-0 w-full border-t',
        className,
      )}
    />
  )
}
