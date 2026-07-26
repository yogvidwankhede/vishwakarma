'use client'

import {
  type ComponentPropsWithRef,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
} from 'react'
import { CheckIcon, DashIcon } from './icons.js'
import { focusRing } from './styles.js'
import { cx } from './variants.js'

/**
 * Checkbox and switch.
 *
 * Both are real `<input type="checkbox">` elements with `appearance-none` and the visual
 * state drawn on top. The tempting alternative — a `<div role="checkbox">` with a click
 * handler — has to reimplement, correctly, every one of: Space activation, the label
 * association that makes clicking the text toggle the control, form participation and
 * submission, `:checked` for CSS, the browser's own autofill and restore-on-back-navigation,
 * and the platform announcement of "checked"/"not checked". Each of those is individually
 * easy to forget and collectively the reason custom checkboxes are the single most reported
 * accessibility defect in component libraries.
 *
 * Neither control consumes {@link useField}. A field labels its control with an external
 * `<label htmlFor>`, and these already carry their own inline label; wiring both would give
 * the control two accessible names, which screen readers resolve inconsistently. Put a
 * checkbox group inside a `<fieldset>` with a `<legend>` instead.
 */

/** Shared props for the two toggles. */
interface ToggleCommonProps
  extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'size' | 'children'> {
  /** The visible label. Clicking it toggles the control, because it is a real `<label>`. */
  label: ReactNode
  /** Secondary text beneath the label, wired with `aria-describedby`. */
  description?: ReactNode
  /** Classes for the outer label element rather than the input. */
  className?: string
}

export interface CheckboxProps extends ToggleCommonProps {
  /**
   * The third state: some but not all of the children are checked.
   *
   * Set as a DOM property in an effect rather than as an attribute, because HTML has no
   * `indeterminate` attribute — it exists only on the element object. Markup alone genuinely
   * cannot express this state, which is why a server-rendered "select all" checkbox always
   * appears unchecked for one frame.
   */
  indeterminate?: boolean
}

/** A checkbox with an inline label, optional description, and a real third state. */
export function Checkbox({
  label,
  description,
  indeterminate = false,
  className,
  id,
  disabled,
  ref,
  ...rest
}: CheckboxProps): ReactNode {
  const generated = useId()
  const inputId = id ?? `${generated}-checkbox`
  const descriptionId = `${generated}-description`

  const inputRef = useRef<HTMLInputElement | null>(null)

  const setRef = useCallback(
    (node: HTMLInputElement | null): void => {
      inputRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label
      htmlFor={inputId}
      className={cx(
        'group flex min-h-[2.75rem] items-start gap-3 py-2',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <span className="relative inline-grid shrink-0 place-items-center">
        <input
          {...rest}
          ref={setRef}
          id={inputId}
          type="checkbox"
          disabled={disabled}
          aria-describedby={description ? descriptionId : rest['aria-describedby']}
          className={cx(
            'peer size-5 appearance-none rounded-sm border-2 border-border-strong bg-surface-default',
            'transition-[background-color,border-color] duration-quick ease-default motion-reduce:transition-none',
            'checked:border-action-primary-bg checked:bg-action-primary-bg',
            'indeterminate:border-action-primary-bg indeterminate:bg-action-primary-bg',
            'disabled:cursor-not-allowed disabled:border-border-default disabled:bg-surface-subtle',
            focusRing,
          )}
        />
        {/*
          Two marks, one for each checked state, both driven by the input's own pseudo-classes
          so the drawing cannot drift out of step with the control's real value — which is what
          happens whenever the mark is rendered from React state instead.
        */}
        <CheckIcon className="pointer-events-none absolute size-3.5 text-action-primary-fg opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0" />
        <DashIcon className="pointer-events-none absolute size-3.5 text-action-primary-fg opacity-0 peer-indeterminate:opacity-100" />
      </span>

      <span className="flex flex-col gap-0.5">
        <span
          className={cx(
            'text-base leading-6',
            disabled ? 'text-text-secondary' : 'text-text-primary',
          )}
        >
          {label}
        </span>
        {description ? (
          <span id={descriptionId} className="text-sm text-text-secondary">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}

export interface SwitchProps extends ToggleCommonProps {
  /**
   * Words for the two states, announced in place of "checked"/"unchecked".
   *
   * Rarely needed. Supply it when the switch controls something whose on state has a name —
   * "Public"/"Private" — because "checked" tells the user nothing about what they just did.
   */
  stateLabels?: { on: string; off: string }
}

/**
 * A switch.
 *
 * `role="switch"` on a native checkbox, which is the one combination that keeps the platform
 * behaviour and changes only the announcement.
 *
 * A switch takes effect immediately; a checkbox states an intention that some later Save
 * button will act on. Using a switch for something that only applies on submit is the most
 * common misuse, and the user pays for it by believing the change has already happened.
 *
 * The on state is signalled by the thumb's position and by a tick inside it, not by the
 * track colour. Colour-only switches are indistinguishable for a colour-blind user at exactly
 * the moment they need to check whether they just turned something off.
 */
export function Switch({
  label,
  description,
  stateLabels,
  className,
  id,
  disabled,
  checked,
  defaultChecked,
  ...rest
}: SwitchProps): ReactNode {
  const generated = useId()
  const inputId = id ?? `${generated}-switch`
  const descriptionId = `${generated}-description`

  const stateText = stateLabels
    ? checked === undefined
      ? undefined
      : checked
        ? stateLabels.on
        : stateLabels.off
    : undefined

  return (
    <label
      htmlFor={inputId}
      className={cx(
        'group flex min-h-[2.75rem] items-start gap-3 py-2',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <span className="relative inline-flex shrink-0 items-center">
        <input
          {...rest}
          id={inputId}
          type="checkbox"
          // biome-ignore lint/a11y/useAriaPropsForRole: the checked state of a native checkbox is already mapped into the accessibility tree, and `role="switch"` only relabels it. An explicit aria-checked would have to be kept in step with the DOM by hand, and would go stale the moment the switch is used uncontrolled.
          role="switch"
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          aria-describedby={description ? descriptionId : rest['aria-describedby']}
          className={cx(
            'peer h-6 w-11 appearance-none rounded-full border-2 border-border-strong bg-neutral-300',
            'transition-[background-color,border-color] duration-quick ease-default motion-reduce:transition-none',
            'checked:border-action-primary-bg checked:bg-action-primary-bg',
            'disabled:cursor-not-allowed disabled:opacity-75',
            focusRing,
          )}
        />
        {/*
          Driven from the label with `:has(:checked)` rather than with `peer-checked`. The peer
          variant compiles to a sibling combinator, and the tick is a *descendant* of the thumb
          rather than a sibling of the input — so a peer-based rule would compile happily and
          then never match, which is the failure mode where the switch animates but the tick
          never appears.
        */}
        <span
          aria-hidden="true"
          className={cx(
            'pointer-events-none absolute left-0.5 grid size-4 place-items-center rounded-full bg-white shadow-raised',
            'transition-transform duration-quick ease-default motion-reduce:transition-none',
            'group-has-[:checked]:translate-x-5',
          )}
        >
          <CheckIcon className="size-2.5 text-action-primary-bg opacity-0 group-has-[:checked]:opacity-100" />
        </span>
      </span>

      <span className="flex flex-col gap-0.5">
        <span
          className={cx(
            'text-base leading-6',
            disabled ? 'text-text-secondary' : 'text-text-primary',
          )}
        >
          {label}
          {stateText ? <span className="sr-only">, {stateText}</span> : null}
        </span>
        {description ? (
          <span id={descriptionId} className="text-sm text-text-secondary">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}
