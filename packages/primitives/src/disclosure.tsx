'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  Ref,
} from 'react'
import { createContext, useCallback, useContext, useId, useMemo, useRef } from 'react'
import { useComposedRefs } from './compose-refs.js'
import { useControllableState } from './use-controllable-state.js'
import { useEventCallback } from './use-event-callback.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

/**
 * A button that shows and hides a region of content.
 *
 * The simplest primitive in the package, and the one most often built wrong — usually as a
 * `<div onClick>` with a rotating chevron and no `aria-expanded`, which is indistinguishable
 * from decoration to anyone not looking at it.
 *
 * ## Why the trigger is a real `<button>`
 *
 * Rebuilding a button from a `div` means reimplementing, correctly, every one of: activation
 * on Enter, activation on Space (on keyup, not keydown, and with the page-scroll suppressed
 * on keydown), participation in the tab order, the `button` role, the disabled state and its
 * effect on focusability, the platform focus ring, `:active` styling on the correct events,
 * form association, and the accessible name computed from content. That list is what people
 * discover one bug report at a time. The `button` element does all of it, has done for
 * twenty-five years, and the only thing it costs is a two-line CSS reset.
 */

interface DisclosureContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerId: string
  panelId: string
  disabled: boolean
}

const DisclosureContext = createContext<DisclosureContextValue | null>(null)

function useDisclosureContext(component: string): DisclosureContextValue {
  const context = useContext(DisclosureContext)
  if (!context) {
    throw new Error(`${component} must be rendered inside <Disclosure>.`)
  }
  return context
}

export interface DisclosureProps {
  children: ReactNode
  /** Controlled open state. See {@link useControllableState} for the controlled/uncontrolled rules. */
  open?: boolean
  /** Starting state when uncontrolled. */
  defaultOpen?: boolean
  /** Called when the user asks to open or close. */
  onOpenChange?: (open: boolean) => void
  /** Prevent the trigger from doing anything. */
  disabled?: boolean
}

/** Provide disclosure state to a trigger and a panel. Renders nothing of its own. */
export function Disclosure({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
}: DisclosureProps): ReactNode {
  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    name: 'Disclosure',
  })

  const id = useId()

  const value = useMemo<DisclosureContextValue>(
    () => ({
      open: isOpen,
      setOpen,
      triggerId: `${id}-trigger`,
      panelId: `${id}-panel`,
      disabled,
    }),
    [isOpen, setOpen, id, disabled],
  )

  return <DisclosureContext.Provider value={value}>{children}</DisclosureContext.Provider>
}

export interface DisclosureTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'> {
  children: ReactNode
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void
}

/**
 * The control that toggles the panel.
 *
 * ## Key contract
 *
 * - **Enter** and **Space** toggle, handled by the browser because this is a real button.
 *
 * `type="button"` is not optional and is not a stylistic choice. A `<button>` with no `type`
 * inside a `<form>` defaults to `type="submit"`, so an accordion inside a form submits it
 * every time a section is expanded.
 */
export function DisclosureTrigger({
  children,
  onClick,
  ...rest
}: DisclosureTriggerProps): ReactNode {
  const { open, setOpen, triggerId, panelId, disabled } = useDisclosureContext('DisclosureTrigger')
  const handleClick = useEventCallback(onClick)

  return (
    <button
      {...rest}
      type="button"
      id={triggerId}
      aria-expanded={open}
      // Points at the panel so a screen reader can jump straight to what this controls.
      // Only meaningful when the panel is actually in the DOM; a dangling `aria-controls`
      // is announced by some readers as a broken relationship.
      aria-controls={panelId}
      disabled={disabled}
      onClick={(event) => {
        handleClick(event)
        if (event.defaultPrevented) return
        setOpen(!open)
      }}
    >
      {children}
    </button>
  )
}

export interface DisclosurePanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /**
   * Remove the panel from the DOM when closed, rather than hiding it.
   *
   * Off by default. Unmounting loses form state and scroll position inside the panel, and
   * makes `aria-controls` on the trigger point at nothing. It is worth turning on only when
   * the panel is expensive to render and there are many of them.
   */
  unmountOnClose?: boolean
  /**
   * Let the browser reveal the panel when the user searches for text inside it. On by default.
   *
   * A collapsed panel hidden with `hidden` is invisible to find-in-page, so a user pressing
   * Ctrl+F for a phrase they know is on the page is told it is not there. `hidden="until-found"`
   * keeps the content searchable and lets the browser expand the panel and scroll to the
   * match — but the browser only reveals the DOM, so the component has to hear about it and
   * update its own state, which is what the `beforematch` listener below does. Without that,
   * the panel opens and the trigger still says `aria-expanded="false"`.
   */
  revealOnFind?: boolean
  ref?: Ref<HTMLDivElement>
}

/**
 * The region the trigger shows and hides.
 *
 * `role="region"` is applied only when the panel is open and has an accessible name, because
 * an unnamed region is announced as "region" and adds noise to the landmark list without
 * telling anyone what it contains.
 */
export function DisclosurePanel({
  children,
  unmountOnClose = false,
  revealOnFind = true,
  ref,
  ...rest
}: DisclosurePanelProps): ReactNode {
  const { open, setOpen, triggerId, panelId } = useDisclosureContext('DisclosurePanel')
  const localRef = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(localRef, ref)

  const notifyOpen = useEventCallback(setOpen)

  // `hidden="until-found"` is a string value on an attribute React types as a boolean, and
  // `beforematch` is not in React's synthetic event system. Both have to go through the DOM
  // directly. Applied in a layout effect so the attribute is right before first paint.
  useIsomorphicLayoutEffect(() => {
    const element = localRef.current
    if (!element) return

    if (open) {
      element.removeAttribute('hidden')
    } else {
      element.setAttribute('hidden', revealOnFind ? 'until-found' : '')
    }
  }, [open, revealOnFind])

  const handleBeforeMatch = useCallback(() => {
    notifyOpen(true)
  }, [notifyOpen])

  useIsomorphicLayoutEffect(() => {
    const element = localRef.current
    if (!element || !revealOnFind) return

    element.addEventListener('beforematch', handleBeforeMatch)
    return () => element.removeEventListener('beforematch', handleBeforeMatch)
  }, [revealOnFind, handleBeforeMatch])

  if (!open && unmountOnClose) return null

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: the rule cannot evaluate the ternary above it — `aria-labelledby` is only emitted on the same condition that gives the element `role="region"`.
    <div
      {...rest}
      ref={composed}
      id={panelId}
      role={open ? 'region' : undefined}
      // Paired with the role. `aria-labelledby` on an element with no role names nothing —
      // a plain `div` is not exposed — so emitting it while closed is noise that some
      // validators flag and no assistive technology uses.
      aria-labelledby={open ? triggerId : undefined}
      // Rendered as well as set imperatively, so server-rendered markup is already correct
      // and there is no flash of expanded content before hydration.
      hidden={!open}
    >
      {children}
    </div>
  )
}
