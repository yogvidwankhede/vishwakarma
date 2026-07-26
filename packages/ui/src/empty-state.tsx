'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cx, variants } from './variants.js'

/**
 * The screen shown when there is nothing to show.
 *
 * This is the most consequential screen in most products and the one most reliably left
 * until last. Two forces produce that. Designers work with realistic data, because a mock-up
 * of a table with twelve rows is what gets approved and a mock-up of an empty table looks
 * like an unfinished mock-up. Engineers build against seeded databases, where the empty case
 * exists for about an hour on day one and then never again. So the state that *every single
 * new user sees first* is the one nobody has looked at since the project began, and it ships
 * as the words "No results".
 *
 * What it costs: the empty state is the only moment where the product has the user's full
 * attention and no content competing for it. It is where the product explains what this
 * screen is for, what the user should do first, and what will appear here afterwards. A bare
 * "No results" spends that moment on nothing and leaves the user to guess whether the feature
 * is broken, whether they lack permission, or whether they simply have not started yet.
 *
 * Hence the shape of this component. `title` and `description` are separate props rather than
 * free children, because the two questions — what is this, and what do I do now — need
 * different answers, and a single blob of text always answers only the first.
 *
 * And there is exactly one `action` slot, deliberately. Three buttons on an empty state is
 * how a team avoids deciding what the user should do first; the user then has to make that
 * decision instead, with strictly less information than the team had. If a second path
 * genuinely matters, put it in the description as a link, where it reads as an aside rather
 * than as a competing recommendation.
 */

const emptyState = variants({
  base: 'flex flex-col items-center justify-center gap-3 text-center',
  variants: {
    size: {
      // For an empty region inside a populated page — one panel of a dashboard.
      sm: 'px-4 py-8',
      md: 'px-6 py-12',
      // For a whole route that has nothing in it yet.
      lg: 'px-6 py-20',
    },
    bordered: {
      true: 'rounded-xl border border-dashed border-border-default bg-surface-subtle',
      false: '',
    },
  },
  defaults: { size: 'md', bordered: 'false' },
})

export interface EmptyStateProps extends Omit<ComponentPropsWithRef<'div'>, 'title' | 'children'> {
  /**
   * What is missing, in the user's words.
   *
   * "No invoices yet", not "Empty". Rendered as a heading so it appears in the heading
   * outline a screen-reader user navigates by — which is how they find out the region is
   * empty without reading it.
   */
  title: ReactNode
  /** What to do about it, and what will appear here once they have. One or two sentences. */
  description?: ReactNode
  /** A decorative illustration or glyph. Hidden from assistive technology. */
  icon?: ReactNode
  /**
   * The single next step, usually a {@link Button}.
   *
   * One. See the module note.
   */
  action?: ReactNode
  /** Heading level for the title. Match the surrounding document outline. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  size?: 'sm' | 'md' | 'lg'
  /** Draw a dashed border, marking out the region that would otherwise hold content. */
  bordered?: boolean
}

/** The nothing-to-show screen. See the module note for why it deserves this much care. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  headingLevel = 2,
  size = 'md',
  bordered = false,
  className,
  ...rest
}: EmptyStateProps): ReactNode {
  // The heading level is a prop rather than derived, because nothing in React can see the
  // surrounding document outline, and a component that always renders `<h2>` produces a
  // skipped level as soon as it is dropped inside a section that already has one.
  const Heading = `h${headingLevel}` as const

  return (
    <div
      {...rest}
      className={emptyState({ size, bordered: bordered ? 'true' : 'false', className })}
    >
      {icon ? (
        <span aria-hidden="true" className="text-text-tertiary [&>svg]:size-10">
          {icon}
        </span>
      ) : null}

      <Heading className="text-lg font-semibold text-text-primary">{title}</Heading>

      {description ? (
        <p className={cx('max-w-prose text-base text-text-secondary', 'text-balance')}>
          {description}
        </p>
      ) : null}

      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
