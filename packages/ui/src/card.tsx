'use client'

import type { ComponentPropsWithRef, ReactNode } from 'react'
import { focusWithinRing } from './styles.js'
import { cx, variants } from './variants.js'

/**
 * A surface that groups related content.
 *
 * The one thing this component refuses to do is accept an `onClick` on the card itself.
 * "The whole card is clickable" is an extremely common requirement and the usual
 * implementation — a `<div onClick>` — is not a link and not a button: it cannot be tabbed
 * to, cannot be activated with Enter, cannot be opened in a new tab, cannot be middle-clicked,
 * cannot be copied as a URL, and is announced as a group with no indication that it does
 * anything. Adding `tabIndex={0}` and a key handler patches four of those and leaves the
 * rest.
 *
 * The correct construction is a real `<a>` or `<button>` around the card's *title*, with a
 * stretched pseudo-element expanding its hit area over the card:
 *
 * ```tsx
 * <Card interactive>
 *   <Card.Header>
 *     <h3><a href="/invoices/8" className="after:absolute after:inset-0">Invoice #8</a></h3>
 *   </Card.Header>
 *   <Card.Body>Due 3 March</Card.Body>
 * </Card>
 * ```
 *
 * That keeps one real, named, keyboard-operable control; `interactive` supplies the hover
 * affordance and the focus ring on the card's behalf, keyed on `:has(:focus-visible)` so it
 * only appears for keyboard focus. The trade-off is that text selection inside the card is
 * lost where the pseudo-element covers it, which is why `interactive` is opt-in rather than
 * the default.
 */

const card = variants({
  base: 'relative flex flex-col rounded-xl border border-border-subtle bg-surface-default text-text-primary',
  variants: {
    elevation: {
      flat: 'shadow-none',
      raised: 'shadow-raised',
      floating: 'shadow-floating',
    },
    interactive: {
      true: cx(
        'transition-[box-shadow,border-color] duration-quick ease-default motion-reduce:transition-none',
        'hover:border-border-strong hover:shadow-floating',
        focusWithinRing,
      ),
      false: '',
    },
  },
  defaults: { elevation: 'raised', interactive: 'false' },
})

/** How far the card sits off the page. */
export type CardElevation = 'flat' | 'raised' | 'floating'

export interface CardProps extends ComponentPropsWithRef<'div'> {
  /** Shadow depth. In dark themes shadows are nearly invisible, so elevation reads mostly from the border. */
  elevation?: CardElevation
  /**
   * Style the card as containing a primary link.
   *
   * Supplies hover and keyboard-focus affordances only. It does not make the card clickable —
   * see the module note for why, and for the construction that does.
   */
  interactive?: boolean
}

function CardRoot({
  elevation = 'raised',
  interactive = false,
  className,
  children,
  ...rest
}: CardProps): ReactNode {
  return (
    <div
      {...rest}
      className={card({
        elevation,
        interactive: interactive ? 'true' : 'false',
        className,
      })}
    >
      {children}
    </div>
  )
}

export interface CardSectionProps extends ComponentPropsWithRef<'div'> {
  /** Remove the section's padding, for a full-bleed image or table. */
  bleed?: boolean
}

/**
 * The card's heading area.
 *
 * Renders a plain container rather than a `<header>`. A `<header>` inside a card that is not
 * itself a sectioning element contributes a `banner` landmark in some screen readers, and a
 * page of twelve cards then advertises twelve banners.
 */
function CardHeader({ bleed = false, className, children, ...rest }: CardSectionProps): ReactNode {
  return (
    <div
      {...rest}
      className={cx('flex flex-col gap-1', bleed ? 'p-0' : 'px-6 pt-5 pb-3', className)}
    >
      {children}
    </div>
  )
}

/** The card's main content. Takes the remaining height so footers in a grid of cards line up. */
function CardBody({ bleed = false, className, children, ...rest }: CardSectionProps): ReactNode {
  return (
    <div
      {...rest}
      className={cx('flex flex-1 flex-col gap-3', bleed ? 'p-0' : 'px-6 py-3', className)}
    >
      {children}
    </div>
  )
}

/**
 * The card's actions area.
 *
 * Separated by a border rather than by whitespace alone, because a footer distinguished only
 * by spacing disappears the moment the card body ends in a short line.
 */
function CardFooter({ bleed = false, className, children, ...rest }: CardSectionProps): ReactNode {
  return (
    <div
      {...rest}
      className={cx(
        'mt-auto flex flex-wrap items-center gap-2 border-t border-border-subtle',
        bleed ? 'p-0' : 'px-6 py-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * A card, with `Card.Header`, `Card.Body` and `Card.Footer`.
 *
 * Exposed as a compound component because the parts are meaningless apart from the whole:
 * importing `CardFooter` on its own and rendering it somewhere else produces a stray bordered
 * strip, and the dotted access makes the relationship visible at the call site.
 */
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
})
