'use client'

import type { ComponentPropsWithRef, ReactNode } from 'react'
import { Button } from './button.js'
import { CloseIcon, DangerIcon, InfoIcon, SuccessIcon, WarningIcon } from './icons.js'
import { variants } from './variants.js'

/**
 * A message about the state of the page.
 *
 * Three things here are decided rather than copied.
 *
 * **The severity is written down, not only coloured.** Each variant renders a visually hidden
 * prefix — "Error:", "Warning:" — before the content. Without it, the difference between a
 * confirmation and a failure is a hue and an icon: the hue is unavailable to a colour-blind
 * user and the icon is `aria-hidden`, so a screen-reader user hears the same sentence for
 * both. The prefix is hidden rather than shown because sighted users already have the icon
 * and the colour, and a visible "Error:" in front of an error message reads as shouting.
 *
 * **`role` depends on severity.** `role="alert"` interrupts whatever the screen reader is
 * currently saying. That is right for a failure the user must know about now, and rude for a
 * "settings saved" message, so only `danger` gets it; the rest use `role="status"`, which
 * queues politely.
 *
 * **The role is only useful if the element appears after the page does.** A live region that
 * is already in the DOM at first paint announces nothing when its content later changes
 * unless the region itself was present and empty beforehand. If you render an alert
 * conditionally in response to a user action, that is exactly the case this handles; if you
 * server-render one, expect it to be read in document order like ordinary text, which is
 * correct.
 */

const alert = variants({
  base: 'flex gap-3 rounded-lg border p-4 text-base',
  variants: {
    variant: {
      info: 'border-info-200 bg-status-info-bg text-status-info-fg',
      success: 'border-success-200 bg-status-success-bg text-status-success-fg',
      warning: 'border-warning-200 bg-status-warning-bg text-status-warning-fg',
      danger: 'border-danger-300 bg-status-danger-bg text-status-danger-fg',
    },
    emphasis: {
      // A left bar rather than a fill, for alerts that live permanently in a layout and would
      // otherwise compete with the content they are annotating.
      subtle: 'border-l-4',
      full: '',
    },
  },
  defaults: { variant: 'info', emphasis: 'full' },
})

/** Severity of an {@link Alert}. */
export type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

const ICONS: Record<AlertVariant, (props: { className?: string }) => ReactNode> = {
  info: InfoIcon,
  success: SuccessIcon,
  warning: WarningIcon,
  danger: DangerIcon,
}

/** Spoken severity prefixes. Overridable for localisation. */
const PREFIXES: Record<AlertVariant, string> = {
  info: 'Information:',
  success: 'Success:',
  warning: 'Warning:',
  danger: 'Error:',
}

export interface AlertProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  variant?: AlertVariant
  /** A short heading. Optional, but an alert longer than two lines needs one. */
  title?: ReactNode
  /** The message. */
  children: ReactNode
  /** One action, rendered after the message. More than one turns an alert into a dialog. */
  action?: ReactNode
  /** Called when the dismiss button is pressed. Omit it and no dismiss button is rendered. */
  onDismiss?: () => void
  /** Accessible name for the dismiss button. Localise it. */
  dismissLabel?: string
  /** Override the spoken severity prefix. Localise it. */
  severityPrefix?: string
  /** Use a left bar instead of a full tint. */
  subtle?: boolean
}

/** A message about the state of the page. See the module note for the role and severity rules. */
export function Alert({
  variant = 'info',
  title,
  children,
  action,
  onDismiss,
  dismissLabel = 'Dismiss',
  severityPrefix,
  subtle = false,
  className,
  ...rest
}: AlertProps): ReactNode {
  const Icon = ICONS[variant]

  return (
    <div
      {...rest}
      // `assertive` is implied by role="alert", but Safari plus VoiceOver has historically
      // needed the explicit pairing to announce reliably.
      role={variant === 'danger' ? 'alert' : 'status'}
      aria-live={variant === 'danger' ? 'assertive' : 'polite'}
      className={alert({ variant, emphasis: subtle ? 'subtle' : 'full', className })}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="sr-only">{severityPrefix ?? PREFIXES[variant]}</span>
          {title ? <p className="font-semibold">{title}</p> : null}
          <div className="text-text-primary">{children}</div>
        </div>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>

      {onDismiss ? (
        <Button
          iconOnly
          aria-label={dismissLabel}
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="-mt-1 -mr-1 shrink-0 text-current"
        >
          <CloseIcon className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}
