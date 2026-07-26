'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import { createContext, type ReactNode, useContext, useId } from 'react'
import { DangerIcon } from './icons.js'
import { cx } from './variants.js'

/**
 * Label, description and error, wired to the control.
 *
 * The wiring is the entire point. A label sitting visually above an input is, to a screen
 * reader, an unrelated fragment of text: the control is announced as "edit, blank", and the
 * help text explaining the password rules is never read at all, because nothing connects
 * them. Getting this right by hand means generating three stable ids, threading them into
 * `htmlFor` and `aria-describedby`, joining the describedby list in the right order, and
 * remembering to drop the error id when there is no error — and it means doing that
 * identically at every one of the two hundred call sites in an application. It is not that
 * teams do not know how; it is that doing it by hand two hundred times has a failure rate.
 *
 * So the field owns the ids and hands them to the control through context. The control does
 * not need to know whether it is inside a field, which keeps {@link Input} and friends usable
 * on their own.
 *
 * Two smaller decisions:
 *
 * The error is *not* a live region. A form with ten invalid fields would fire ten
 * interruptions on submit, in whatever order React committed them, over the top of whatever
 * the user was reading. The error is instead attached with `aria-describedby`, so it is read
 * when focus reaches the field — which is where the user can act on it — and callers who
 * want an immediate announcement should render one summary live region for the whole form.
 *
 * The required marker is the word "required", not an asterisk. An asterisk is announced as
 * "star" or skipped entirely depending on punctuation settings, and means nothing to a user
 * who has not been told what it means.
 */

interface FieldContextValue {
  controlId: string
  describedBy: string | undefined
  invalid: boolean
  required: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

/** Props a control should spread onto its underlying element to join a {@link Field}. */
export interface FieldControlProps {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  required?: boolean
}

/**
 * Read the wiring for the enclosing {@link Field}.
 *
 * Returns an empty object outside a field rather than throwing, because a control used on
 * its own — in a toolbar, in a table cell filter — is a legitimate case, and a component
 * library that crashes there forces callers into a wrapper they do not want.
 *
 * Use this to build controls this package does not provide; they will then participate in
 * exactly the same labelling contract as the built-in ones.
 */
export function useField(): FieldControlProps {
  const context = useContext(FieldContext)
  if (!context) return {}

  return {
    id: context.controlId,
    ...(context.describedBy ? { 'aria-describedby': context.describedBy } : {}),
    ...(context.invalid ? { 'aria-invalid': true as const } : {}),
    ...(context.required ? { required: true } : {}),
  }
}

/**
 * Merge a caller's `aria-describedby` with the field's.
 *
 * Exported because the merge is easy to get wrong in the direction that loses information:
 * a control that overwrites `aria-describedby` with its own value silently detaches the
 * field's description and error from the control, and nothing about the rendered page shows
 * that it happened.
 */
export function mergeDescribedBy(...ids: Array<string | undefined>): string | undefined {
  const parts = ids.filter((id): id is string => Boolean(id))
  return parts.length > 0 ? parts.join(' ') : undefined
}

export interface FieldProps {
  /** The label. Always visible unless {@link FieldProps.labelHidden} says otherwise. */
  label: ReactNode
  /** The control. Usually one {@link Input}, {@link Textarea} or custom control using {@link useField}. */
  children: ReactNode
  /**
   * Help text, read out after the label when focus enters the control.
   *
   * Put format requirements here rather than in placeholder text. Placeholder text vanishes
   * the moment the user types, which is exactly when the format matters.
   */
  description?: ReactNode
  /** Validation message. Its presence is what marks the control invalid. */
  error?: ReactNode
  /** Marks the control required, both visually and through the accessibility tree. */
  required?: boolean
  /**
   * Hide the label visually while keeping it for assistive technology.
   *
   * Legitimate in a dense toolbar and almost nowhere else: a sighted user with a cognitive
   * disability, or anybody returning to a half-completed form, loses the same information a
   * screen-reader user would have lost without a label at all.
   */
  labelHidden?: boolean
  /** Override the generated control id. Only needed when an external system owns the id. */
  id?: string
  className?: string
}

/** A labelled form control with description and error wiring. */
export function Field({
  label,
  children,
  description,
  error,
  required = false,
  labelHidden = false,
  id,
  className,
}: FieldProps): ReactNode {
  // `useId` rather than a module-level counter. A counter produces different values on the
  // server and the client for the same element, so every id in the form mismatches during
  // hydration and React discards the server markup for that subtree.
  const generated = useId()
  const controlId = id ?? `${generated}-control`
  const descriptionId = `${generated}-description`
  const errorId = `${generated}-error`

  const invalid = Boolean(error)
  const describedBy = mergeDescribedBy(
    description ? descriptionId : undefined,
    invalid ? errorId : undefined,
  )

  const value: FieldContextValue = { controlId, describedBy, invalid, required }

  return (
    <FieldContext.Provider value={value}>
      <div className={cx('flex flex-col gap-1.5', className)}>
        <label
          htmlFor={controlId}
          className={cx('text-sm font-medium text-text-primary', labelHidden && 'sr-only')}
        >
          {label}
          {required ? (
            <span className="ml-1 font-normal text-text-tertiary">(required)</span>
          ) : null}
        </label>

        {description ? (
          <p id={descriptionId} className="text-sm text-text-secondary">
            {description}
          </p>
        ) : null}

        {children}

        {/*
          The icon is not decoration. Colour alone cannot carry "this is the error and that is
          the hint" for the roughly one man in twelve with a colour vision deficiency, so the
          error is distinguished by an icon and by its position directly beneath the control.
        */}
        {invalid ? (
          <p id={errorId} className="flex items-start gap-1.5 text-sm text-status-danger-fg">
            <DangerIcon className="mt-0.5 size-4" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}
