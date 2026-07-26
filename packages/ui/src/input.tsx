'use client'

import type { ComponentPropsWithRef, ReactNode } from 'react'
import { mergeDescribedBy, useField } from './field.js'
import { focusRing } from './styles.js'
import { cx, variants } from './variants.js'

/**
 * Text entry.
 *
 * The interesting parts are all about not losing information that the caller supplied.
 *
 * `aria-describedby` is merged, never replaced. A control that overwrites it detaches the
 * enclosing field's description and error, and the page looks identical afterwards, so the
 * regression is invisible until somebody tests with a screen reader.
 *
 * The invalid state is drawn with a border weight change as well as a colour change. A red
 * border on a grey border is a colour-only signal, and the contrast between "this input is
 * fine" and "this input is wrong" is precisely the distinction a colour-blind user cannot
 * make from hue.
 *
 * And the native `size` attribute is deliberately dropped. It sets width in character units,
 * which nobody wants and which collides with the size prop every design system needs; a
 * caller who genuinely wants character-width sizing should say so in CSS.
 */

const control = variants({
  base: cx(
    'block w-full rounded-md border bg-surface-default text-text-primary',
    'placeholder:text-text-tertiary',
    'transition-[border-color,box-shadow] duration-instant ease-default motion-reduce:transition-none',
    'aria-disabled:cursor-not-allowed aria-disabled:bg-surface-subtle aria-disabled:opacity-75',
    'disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-75',
    focusRing,
  ),
  variants: {
    size: {
      // Below 16px, iOS Safari zooms the viewport on focus and does not zoom back out. The
      // small size therefore stops at 15px rather than the 14px the scale would suggest.
      sm: 'min-h-[2.25rem] px-2.5 py-1.5 text-[0.9375rem]',
      md: 'min-h-[2.75rem] px-3 py-2 text-base',
      lg: 'min-h-[3.25rem] px-4 py-2.5 text-lg',
    },
    invalid: {
      true: 'border-2 border-status-danger-fg',
      false: 'border border-border-default hover:border-border-strong',
    },
  },
  defaults: { size: 'md', invalid: 'false' },
})

/** Control height. `md` and above already clear the 44px minimum target on their own. */
export type ControlSize = 'sm' | 'md' | 'lg'

export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  /** Control height. Not the native `size` attribute — see the module note. */
  size?: ControlSize
  /**
   * Mark the control invalid independently of an enclosing {@link Field}.
   *
   * A field with an `error` already sets this; use it only for controls outside a field.
   */
  invalid?: boolean
}

/** A single-line text input. Joins an enclosing {@link Field} automatically. */
export function Input({
  size = 'md',
  invalid,
  className,
  id,
  required,
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
  ...rest
}: InputProps): ReactNode {
  const field = useField()
  const isInvalid = invalid ?? Boolean(field['aria-invalid'])

  return (
    <input
      {...rest}
      id={id ?? field.id}
      required={required ?? field.required}
      aria-describedby={mergeDescribedBy(field['aria-describedby'], describedBy)}
      aria-invalid={ariaInvalid ?? (isInvalid || undefined)}
      className={control({
        size,
        invalid: isInvalid ? 'true' : 'false',
        className,
      })}
    />
  )
}

export interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
  /** Control padding and text size. */
  size?: ControlSize
  /** Mark the control invalid independently of an enclosing {@link Field}. */
  invalid?: boolean
}

/**
 * A multi-line text input.
 *
 * Resizing is left vertical rather than disabled. `resize: none` is a common house style and
 * it costs the user the only tool they have for reading back a long answer they have already
 * written — and it costs it most from the people writing the longest answers.
 */
export function Textarea({
  size = 'md',
  invalid,
  className,
  id,
  rows = 4,
  required,
  'aria-describedby': describedBy,
  'aria-invalid': ariaInvalid,
  ...rest
}: TextareaProps): ReactNode {
  const field = useField()
  const isInvalid = invalid ?? Boolean(field['aria-invalid'])

  return (
    <textarea
      {...rest}
      rows={rows}
      id={id ?? field.id}
      required={required ?? field.required}
      aria-describedby={mergeDescribedBy(field['aria-describedby'], describedBy)}
      aria-invalid={ariaInvalid ?? (isInvalid || undefined)}
      className={control({
        size,
        invalid: isInvalid ? 'true' : 'false',
        className: cx('resize-y', className),
      })}
    />
  )
}
