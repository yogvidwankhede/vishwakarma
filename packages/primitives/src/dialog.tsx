'use client'

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  Ref,
  RefObject,
} from 'react'
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useComposedRefs } from './compose-refs.js'
import type { PortalProps } from './portal.js'
import { Portal } from './portal.js'
import { useControllableState } from './use-controllable-state.js'
import { useEscapeKey } from './use-escape-key.js'
import { useEventCallback } from './use-event-callback.js'
import { useFocusRestore } from './use-focus-restore.js'
import type { InitialFocus } from './use-focus-trap.js'
import { useFocusTrap } from './use-focus-trap.js'
import { useHideOutside } from './use-hide-outside.js'
import { useOnClickOutside } from './use-on-click-outside.js'
import { useScrollLock } from './use-scroll-lock.js'

/**
 * A modal dialog.
 *
 * ## Why this is a `div` and not `<dialog>`
 *
 * The native `<dialog>` element with `showModal()` is genuinely better at the two hardest
 * parts: it puts the dialog in the top layer, so it cannot be trapped underneath an ancestor
 * `z-index` or clipped by an `overflow: hidden`, and it makes the rest of the document inert
 * for free, enforced by the browser. Nothing here matches that.
 *
 * It is not used because its API is imperative in a way that does not survive contact with
 * declarative rendering. Open state lives in a method call, not an attribute, so React has to
 * reach into the DOM on every change; calling `showModal()` on an already-open dialog throws;
 * the element must be connected before the call, which means an effect, which means a frame
 * of latency on open. Closing is worse, because the browser's own Escape handling fires
 * `cancel` and closes the element whether or not the application agreed — a dialog that
 * refuses to close while a form is dirty cannot be expressed. And `::backdrop` cannot be
 * targeted by the consumer's styling system, which for a headless package that must not ship
 * CSS is disqualifying on its own.
 *
 * So the guarantees are reconstructed: {@link useFocusTrap} for the keyboard,
 * {@link useHideOutside} for the accessibility tree, {@link useScrollLock} for the page
 * behind, {@link useFocusRestore} for afterwards. Each of them is a thing the native element
 * would have done, and each is a thing that is wrong in most hand-rolled dialogs.
 *
 * ## Structure
 *
 * ```tsx
 * <Dialog open={open} onOpenChange={setOpen}>
 *   <DialogTrigger>Edit profile</DialogTrigger>
 *   <DialogPortal>
 *     <DialogBackdrop />
 *     <DialogContent>
 *       <DialogTitle>Edit profile</DialogTitle>
 *       <DialogDescription>Changes are saved immediately.</DialogDescription>
 *       <DialogClose>Done</DialogClose>
 *     </DialogContent>
 *   </DialogPortal>
 * </Dialog>
 * ```
 */

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  modal: boolean
  titleId: string
  descriptionId: string
  hasTitle: boolean
  hasDescription: boolean
  registerTitle: (present: boolean) => void
  registerDescription: (present: boolean) => void
  triggerRef: RefObject<HTMLButtonElement | null>
  contentRef: RefObject<HTMLDivElement | null>
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialogContext(component: string): DialogContextValue {
  const context = useContext(DialogContext)
  if (!context) throw new Error(`${component} must be rendered inside <Dialog>.`)
  return context
}

export interface DialogProps {
  children: ReactNode
  /** Controlled open state. */
  open?: boolean
  /** Starting state when uncontrolled. */
  defaultOpen?: boolean
  /** Called when the user asks to open or close. Reject a close by simply not setting state. */
  onOpenChange?: (open: boolean) => void
  /**
   * Whether the rest of the page is unreachable while open. Defaults to `true`.
   *
   * Turning it off gives a non-modal dialog: no scroll lock, no inert background, no focus
   * trap. That is a legitimate pattern — a persistent side panel, a find bar — but it is a
   * different component with different rules, and calling it a dialog while leaving the
   * background reachable is how users end up with two things claiming focus.
   */
  modal?: boolean
}

/** Owns the open state and the relationships between the parts. Renders nothing of its own. */
export function Dialog({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  modal = true,
}: DialogProps): ReactNode {
  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    name: 'Dialog',
  })

  const id = useId()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Whether a title and description exist is discovered rather than declared, so that
  // `aria-labelledby` is only emitted when there is something for it to point at. A
  // dangling reference is worse than none: the dialog is then announced with no name at
  // all by some readers, and with the whole document title by others.
  const [hasTitle, setHasTitle] = useState(false)
  const [hasDescription, setHasDescription] = useState(false)

  const value = useMemo<DialogContextValue>(
    () => ({
      open: isOpen,
      setOpen,
      modal,
      titleId: `${id}-title`,
      descriptionId: `${id}-description`,
      hasTitle,
      hasDescription,
      registerTitle: setHasTitle,
      registerDescription: setHasDescription,
      triggerRef,
      contentRef,
    }),
    [isOpen, setOpen, modal, id, hasTitle, hasDescription],
  )

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
}

export interface DialogTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'> {
  children: ReactNode
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void
  ref?: Ref<HTMLButtonElement>
}

/**
 * The control that opens the dialog.
 *
 * A real `<button type="button">`, for the reasons set out on {@link DisclosureTrigger}. It
 * also has to be a real element because focus comes back here when the dialog closes, and
 * something that is not focusable cannot receive it — which is how dialogs opened from a
 * `<div>` leave focus on `<body>` on close, sending the next Tab to the top of the page.
 */
export function DialogTrigger({ children, onClick, ref, ...rest }: DialogTriggerProps): ReactNode {
  const { open, setOpen, triggerRef } = useDialogContext('DialogTrigger')
  const composed = useComposedRefs(triggerRef, ref)
  const handleClick = useEventCallback(onClick)

  return (
    <button
      {...rest}
      ref={composed}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      data-state={open ? 'open' : 'closed'}
      onClick={(event) => {
        handleClick(event)
        if (event.defaultPrevented) return
        setOpen(true)
      }}
    >
      {children}
    </button>
  )
}

export interface DialogPortalProps extends Omit<PortalProps, 'children'> {
  children: ReactNode
}

/**
 * Move the dialog out of its place in the document.
 *
 * Almost always wanted for a modal: an ancestor with `transform`, `filter`, `perspective` or
 * `contain` becomes the containing block for `position: fixed`, so a dialog rendered inside
 * a card with a hover transform is positioned relative to that card rather than the viewport,
 * and no amount of CSS on the dialog itself fixes it.
 *
 * Nothing is rendered at all while the dialog is closed. See {@link PortalProps.container}
 * for the theming caveat.
 */
export function DialogPortal({ children, ...rest }: DialogPortalProps): ReactNode {
  const { open } = useDialogContext('DialogPortal')
  if (!open) return null
  return <Portal {...rest}>{children}</Portal>
}

export interface DialogBackdropProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>
}

/**
 * The layer behind the dialog.
 *
 * Purely presentational, and marked as such: `aria-hidden` keeps it out of the accessibility
 * tree, and it carries no role. Dismissal is *not* wired to a click handler here, because
 * that would only dismiss presses that land on the backdrop element itself — a press on a
 * gap that the backdrop does not cover would do nothing, and the behaviour would depend on
 * the consumer's CSS. {@link DialogContent} handles outside presses positionally instead.
 */
export function DialogBackdrop({ ref, ...rest }: DialogBackdropProps): ReactNode {
  const { open } = useDialogContext('DialogBackdrop')

  return (
    <div
      {...rest}
      ref={ref}
      aria-hidden="true"
      data-vk-dialog-backdrop=""
      data-state={open ? 'open' : 'closed'}
    />
  )
}

export interface DialogContentProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  children: ReactNode
  /** Where focus goes on open. Defaults to the first tab stop. See {@link InitialFocus}. */
  initialFocus?: InitialFocus
  /** Close when Escape is pressed. Defaults to `true`. */
  closeOnEscape?: boolean
  /** Close when a pointer press lands outside. Defaults to `true` for modal dialogs. */
  closeOnOutsidePress?: boolean
  /**
   * Selectors for viewport-fixed elements that must not shift when the scrollbar is removed.
   * Passed through to {@link useScrollLock}.
   */
  scrollLockPadSelectors?: readonly string[]
  /** An accessible name, when there is no visible {@link DialogTitle} to point at. */
  'aria-label'?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * The dialog surface, and the component that enforces modality.
 *
 * ## Key contract
 *
 * - **Tab** cycles forwards through the dialog's tab stops and wraps at the end.
 * - **Shift+Tab** cycles backwards and wraps at the beginning.
 * - **Escape** closes, unless a layer above this one is open — see {@link useEscapeKey}.
 *
 * ## Naming
 *
 * A dialog with no accessible name is announced as "dialog" and nothing else, which tells a
 * screen reader user that something has taken over the page and not what. Render a
 * {@link DialogTitle}, or pass `aria-label`. If neither is present this component says so in
 * the console, because it is invisible in every other kind of testing.
 */
export function DialogContent({
  children,
  initialFocus = 'first',
  closeOnEscape = true,
  closeOnOutsidePress,
  scrollLockPadSelectors,
  ref,
  ...rest
}: DialogContentProps): ReactNode {
  const context = useDialogContext('DialogContent')
  const { open, setOpen, modal, titleId, descriptionId, hasTitle, hasDescription } = context
  const { contentRef, triggerRef } = context

  const composed = useComposedRefs(contentRef, ref)
  const dismissOutside = closeOnOutsidePress ?? modal

  useFocusTrap({ active: open && modal, containerRef: contentRef, initialFocus })
  useHideOutside(open && modal, contentRef)
  useScrollLock(
    open && modal,
    scrollLockPadSelectors ? { padSelectors: scrollLockPadSelectors } : {},
  )
  // Deliberately keyed on `open` alone. Focus must be restored even for a non-modal dialog,
  // and even for one that was never trapped, because something inside it may still have been
  // focused when it closed.
  useFocusRestore(open, { fallbackRef: triggerRef })

  useEscapeKey(() => setOpen(false), { enabled: open && closeOnEscape })

  useOnClickOutside([contentRef], () => setOpen(false), {
    enabled: open && dismissOutside,
    // Without this, pressing the trigger of an open dialog dismisses it here and reopens it
    // in the trigger's own click handler, so the dialog appears never to close.
    ignoreRefs: [triggerRef],
  })

  const label = rest['aria-label']

  useEffect(() => {
    if (!open) return
    if (hasTitle || label) return
    console.error(
      'DialogContent: the dialog has no accessible name. Render a <DialogTitle> inside it, ' +
        'or pass an `aria-label`. Without one it is announced only as "dialog".',
    )
  }, [open, hasTitle, label])

  if (!open) return null

  return (
    <div
      {...rest}
      ref={composed}
      role="dialog"
      // Only claimed for genuinely modal dialogs. `aria-modal="true"` tells assistive
      // technology that everything outside is unavailable; saying that while the background
      // is still reachable makes the reader hide content the user can in fact interact with.
      aria-modal={modal ? true : undefined}
      aria-labelledby={hasTitle ? titleId : undefined}
      aria-describedby={hasDescription ? descriptionId : undefined}
      data-state="open"
      // The trap sets this too, but rendering it avoids a frame in which the container
      // cannot hold focus — which is the frame the trap needs it in.
      tabIndex={-1}
    >
      {children}
    </div>
  )
}

export interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
  /**
   * Heading level. Defaults to `h2`.
   *
   * A dialog title is a heading and should be one in the markup: users who navigate by
   * heading use it to orient themselves inside the dialog, and a styled `div` gives them
   * nothing to land on. The level should fit the document's outline, not the dialog's
   * visual prominence.
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6
  ref?: Ref<HTMLHeadingElement>
}

/** The dialog's accessible name, rendered as a heading. */
export function DialogTitle({ children, level = 2, ref, ...rest }: DialogTitleProps): ReactNode {
  const { titleId, registerTitle } = useDialogContext('DialogTitle')

  useEffect(() => {
    registerTitle(true)
    return () => registerTitle(false)
  }, [registerTitle])

  const Heading = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

  return (
    <Heading {...rest} ref={ref} id={titleId}>
      {children}
    </Heading>
  )
}

export interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
  ref?: Ref<HTMLParagraphElement>
}

/**
 * Supporting text announced after the title.
 *
 * Keep it to one short sentence. `aria-describedby` is read out in full immediately after the
 * name, before the user reaches any control, so a paragraph here is a paragraph they must sit
 * through every time the dialog opens.
 */
export function DialogDescription({ children, ref, ...rest }: DialogDescriptionProps): ReactNode {
  const { descriptionId, registerDescription } = useDialogContext('DialogDescription')

  useEffect(() => {
    registerDescription(true)
    return () => registerDescription(false)
  }, [registerDescription])

  return (
    <p {...rest} ref={ref} id={descriptionId}>
      {children}
    </p>
  )
}

export interface DialogCloseProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'> {
  children: ReactNode
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void
  ref?: Ref<HTMLButtonElement>
}

/**
 * A button that closes the dialog.
 *
 * Every modal dialog needs at least one, and it needs to be a visible one. Escape alone is
 * not sufficient: it is undiscoverable, and on touch devices there is no Escape key at all,
 * so a dialog dismissible only by Escape or by pressing the backdrop is a dead end for a
 * screen reader user on a phone.
 */
export function DialogClose({ children, onClick, ref, ...rest }: DialogCloseProps): ReactNode {
  const { setOpen } = useDialogContext('DialogClose')
  const handleClick = useEventCallback(onClick)

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      onClick={(event) => {
        handleClick(event)
        if (event.defaultPrevented) return
        setOpen(false)
      }}
    >
      {children}
    </button>
  )
}
