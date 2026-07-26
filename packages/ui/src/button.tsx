'use client'

import type { ComponentPropsWithRef, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { Spinner } from './spinner.js'
import { disabledSurface, focusRing, tapTarget } from './styles.js'
import { cx, variants } from './variants.js'

/**
 * The button.
 *
 * Three decisions here are worth defending, because each of them is the opposite of what
 * most implementations do.
 *
 * **Loading does not change the button's size.** Swapping the label for a spinner collapses
 * the button to spinner width, which moves everything after it in the row, which means the
 * user's pointer is now over a different control than the one they were about to press.
 * Worse, it happens *because* they pressed something, so it reads as the interface fighting
 * back. The label therefore stays in the layout with `invisible` and the spinner is overlaid
 * on top: same box, same width, nothing moves.
 *
 * **Unavailable buttons keep `aria-disabled` rather than `disabled`.** A natively disabled
 * button is removed from the tab order and from the accessibility tree's focusable set, so a
 * keyboard or screen-reader user cannot land on it and therefore cannot find out that the
 * action exists, let alone why it is unavailable. They simply meet a hole in the form. With
 * `aria-disabled` the control stays reachable and is announced as dimmed, and this component
 * takes on the job the native attribute was doing: swallowing clicks, and swallowing the
 * Enter and Space keys so an unavailable submit button cannot submit.
 *
 * **Icon-only buttons cannot compile without a label.** See {@link ButtonProps}.
 */

const button = variants({
  base: cx(
    'inline-flex items-center justify-center gap-2 rounded-lg border font-medium',
    'transition-[background-color,border-color,color,box-shadow] duration-instant ease-default',
    'motion-reduce:transition-none select-none',
    focusRing,
    disabledSurface,
    tapTarget,
  ),
  variants: {
    variant: {
      /** The one action the view is asking for. There should be exactly one on screen. */
      primary: cx(
        'border-transparent bg-action-primary-bg text-action-primary-fg shadow-raised',
        'hover:not-aria-disabled:bg-action-primary-bg-hover active:not-aria-disabled:bg-action-primary-bg-active',
      ),
      /** Available, but not what the view expects you to do. */
      secondary: cx(
        'border-border-strong bg-surface-default text-text-primary',
        'hover:not-aria-disabled:bg-surface-subtle active:not-aria-disabled:bg-neutral-200',
      ),
      /** Tertiary. Carries no chrome until pointed at, so it must sit near something that explains it. */
      ghost: cx(
        'border-transparent bg-transparent text-text-secondary',
        'hover:not-aria-disabled:bg-surface-subtle hover:not-aria-disabled:text-text-primary',
        'active:not-aria-disabled:bg-neutral-200',
      ),
      /** Destructive. Never the default focus target of a dialog. */
      danger: cx(
        'border-transparent bg-danger-600 text-white shadow-raised',
        'hover:not-aria-disabled:bg-danger-700 active:not-aria-disabled:bg-danger-800',
      ),
    },
    size: {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
    },
    /** Square rather than pill-shaped padding, for a button whose whole content is one glyph. */
    iconOnly: {
      true: 'px-0 aspect-square',
      false: '',
    },
    fullWidth: {
      true: 'w-full',
      false: '',
    },
  },
  compound: [
    // A ghost button at the smallest size sits inside dense toolbars, where the default
    // horizontal padding makes a row of them wider than the content they act on.
    { when: { variant: 'ghost', size: 'sm' }, className: 'px-2' },
    // The large icon-only button is the one that appears as a floating action; it reads as a
    // mistake unless it is round.
    { when: { iconOnly: 'true', size: 'lg' }, className: 'rounded-full' },
  ],
  defaults: { variant: 'primary', size: 'md', iconOnly: 'false', fullWidth: 'false' },
})

/** Visual weight of a button. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
/** Button height. All sizes keep a 44px pointer target regardless of their visual height. */
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonCommonProps
  extends Omit<ComponentPropsWithRef<'button'>, 'aria-label' | 'children' | 'disabled'> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Stretch to the width of the container. */
  fullWidth?: boolean
  /**
   * Show a spinner and refuse activation, without changing the button's width.
   *
   * Implies unavailability, so `disabled` does not need to be set as well.
   */
  loading?: boolean
  /** What the spinner announces. Say what is happening: "Saving invoice", not "Loading". */
  loadingLabel?: string
  /** Unavailable. Stays focusable — see the note on this module. */
  disabled?: boolean
  /** Rendered before the label. Decorative; the label carries the meaning. */
  leadingIcon?: ReactNode
  /** Rendered after the label. Decorative. */
  trailingIcon?: ReactNode
}

/** A button whose visible text names the action. */
export interface LabelledButtonProps extends ButtonCommonProps {
  iconOnly?: false
  children: ReactNode
  /** Optional here: the visible label already names the action. Use it only to say more. */
  'aria-label'?: string
}

/** A button whose only content is a glyph, and which therefore must be named explicitly. */
export interface IconOnlyButtonProps extends ButtonCommonProps {
  iconOnly: true
  /**
   * Required by the type system, not by a lint rule.
   *
   * An unlabelled icon button is announced as "button" and nothing else, which makes the
   * control unusable and the surrounding screen unnavigable. Lint rules catch this only if
   * the project has the rule, has it enabled, and has not suppressed it — so instead the
   * requirement is expressed where it cannot be skipped: `iconOnly` and `aria-label` are one
   * indivisible pair, and omitting the label fails the build.
   */
  'aria-label': string
  /** The glyph. */
  children: ReactNode
}

/**
 * Props accepted by {@link Button}.
 *
 * A discriminated union rather than one interface with two optional fields, because that is
 * the only formulation in which `iconOnly` can *make* `aria-label` mandatory.
 */
export type ButtonProps = LabelledButtonProps | IconOnlyButtonProps

/** A button. See the module note for the loading, disabled and labelling contracts. */
export function Button(props: ButtonProps): ReactNode {
  const {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    loadingLabel,
    disabled = false,
    leadingIcon,
    trailingIcon,
    iconOnly = false,
    className,
    children,
    onClick,
    onKeyDown,
    type = 'button',
    ...rest
  } = props

  const unavailable = disabled || loading

  // `type` defaults to `button`, not `submit`. The HTML default is `submit`, which means
  // every unannotated button inside a form submits it — the single most common source of
  // "the page reloads when I click the filter icon".
  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    if (unavailable) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    onClick?.(event)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    // Without the native `disabled` attribute the browser still activates the button on
    // Enter and Space, and Enter on any focused button inside a form still submits it.
    if (unavailable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      return
    }
    onKeyDown?.(event)
  }

  const spinnerSize = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'

  return (
    <button
      {...rest}
      type={type}
      className={button({
        variant,
        size,
        iconOnly: iconOnly ? 'true' : 'false',
        fullWidth: fullWidth ? 'true' : 'false',
        className,
      })}
      aria-disabled={unavailable || undefined}
      aria-busy={loading || undefined}
      data-loading={loading ? '' : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={spinnerSize} decorative />
        </span>
      ) : null}
      {/*
        `invisible` rather than conditional rendering. The label keeps its box, so the button
        keeps its width, so nothing after it on the row moves while the request is in flight.
      */}
      <span className={cx('inline-flex items-center gap-2', loading && 'invisible')}>
        {leadingIcon}
        {children}
        {trailingIcon}
      </span>
      {/*
        Announced once, when loading begins. `aria-busy` alone is inconsistently spoken across
        screen readers, and a live region here is cheaper than asking every caller to build one.
      */}
      {loading ? (
        <span role="status" className="sr-only">
          {loadingLabel ?? 'Working'}
        </span>
      ) : null}
    </button>
  )
}
