'use client'

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  Ref,
} from 'react'
import { createContext, useCallback, useContext, useId, useMemo, useRef, useState } from 'react'
import { useComposedRefs } from './compose-refs.js'
import { focusElement } from './tabbable.js'
import { findByTypeahead, isTypeaheadKey } from './typeahead.js'
import { useControllableState } from './use-controllable-state.js'
import { useEscapeKey } from './use-escape-key.js'
import { useEventCallback } from './use-event-callback.js'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'
import { useOnClickOutside } from './use-on-click-outside.js'
import { useRovingTabIndex } from './use-roving-tab-index.js'
import { useTypeahead } from './use-typeahead.js'

/**
 * A menu of commands, opened from a button.
 *
 * This is the *actions* menu — the one whose items do something when chosen. It is not a
 * select: a select has a value, its items are options, and its trigger displays the current
 * choice. Using a menu where a select belongs is the most common ARIA mix-up in application
 * interfaces, and it is announced wrongly in both directions — a screen reader tells the user
 * "menu" when they are choosing a value, or "combobox" when they are running a command.
 *
 * ## Not portalled
 *
 * The menu renders where it is written, immediately after its trigger. That keeps it next to
 * the trigger in the accessibility tree and in the tab order, which is what a non-modal
 * popup needs — see {@link Portal} for why portalling costs that. If an ancestor clips the
 * menu, wrap the content in a {@link Portal} yourself and accept the trade knowingly.
 */

interface MenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  /** Where focus should land when the menu opens. */
  intent: 'first' | 'last' | 'none'
  setIntent: (intent: 'first' | 'last' | 'none') => void
  triggerRef: { current: HTMLButtonElement | null }
  contentRef: { current: HTMLDivElement | null }
  triggerId: string
  contentId: string
  closeAndRestore: () => void
}

const MenuContext = createContext<MenuContextValue | null>(null)

function useMenuContext(component: string): MenuContextValue {
  const context = useContext(MenuContext)
  if (!context) throw new Error(`${component} must be rendered inside <Menu>.`)
  return context
}

export interface MenuProps {
  children: ReactNode
  /** Controlled open state. */
  open?: boolean
  /** Starting state when uncontrolled. */
  defaultOpen?: boolean
  /** Called when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void
}

/** Owns the open state and the trigger/content relationship. Renders nothing of its own. */
export function Menu({ children, open, defaultOpen = false, onOpenChange }: MenuProps): ReactNode {
  const [isOpen, setOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    name: 'Menu',
  })

  const [intent, setIntent] = useState<'first' | 'last' | 'none'>('none')
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const id = useId()

  /**
   * Close and put focus back on the trigger.
   *
   * Focus restoration is the difference between a menu a keyboard user can use twice and one
   * they can use once. When a menu closes, the item that had focus is removed from the
   * document; focus falls to `<body>`, and the next Tab starts from the top of the page. The
   * user has to travel back through the entire document to reach the control they were just
   * using. Restoring it explicitly is not a nicety — it is the only thing that makes the
   * interaction repeatable.
   *
   * Not used for every close: dismissing by pressing somewhere else should leave focus where
   * the user put it, not drag it back to the trigger.
   */
  const closeAndRestore = useCallback(() => {
    setOpen(false)
    focusElement(triggerRef.current)
  }, [setOpen])

  const value = useMemo<MenuContextValue>(
    () => ({
      open: isOpen,
      setOpen,
      intent,
      setIntent,
      triggerRef,
      contentRef,
      triggerId: `${id}-trigger`,
      contentId: `${id}-menu`,
      closeAndRestore,
    }),
    [isOpen, setOpen, intent, id, closeAndRestore],
  )

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

export interface MenuTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick' | 'onKeyDown'> {
  children: ReactNode
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void
  onKeyDown?: (event: ReactKeyboardEvent<HTMLButtonElement>) => void
  ref?: Ref<HTMLButtonElement>
}

/**
 * The button that opens the menu.
 *
 * ## Key contract
 *
 * - **Enter** / **Space** — open the menu and focus the first item.
 * - **ArrowDown** — open the menu and focus the first item.
 * - **ArrowUp** — open the menu and focus the *last* item. This is the one people leave out,
 *   and it is the fastest way to reach a destructive action deliberately placed at the bottom.
 *
 * `aria-haspopup="menu"` rather than `"true"`: the two are equivalent to most software, but
 * the explicit value is what tells a reader to announce "menu button" rather than the vaguer
 * "has popup", and it distinguishes this from a button that opens a dialog or a listbox.
 */
export function MenuTrigger({
  children,
  onClick,
  onKeyDown,
  ref,
  ...rest
}: MenuTriggerProps): ReactNode {
  const { open, setOpen, setIntent, triggerRef, triggerId, contentId } =
    useMenuContext('MenuTrigger')
  const composed = useComposedRefs(triggerRef, ref)
  const handleClick = useEventCallback(onClick)
  const handleKeyDown = useEventCallback(onKeyDown)

  return (
    <button
      {...rest}
      ref={composed}
      type="button"
      id={triggerId}
      aria-haspopup="menu"
      aria-expanded={open}
      // Only while open. A reference to an element that is not in the document is a broken
      // relationship, and some readers announce it as such rather than ignoring it.
      aria-controls={open ? contentId : undefined}
      data-state={open ? 'open' : 'closed'}
      onClick={(event) => {
        handleClick(event)
        if (event.defaultPrevented) return
        // A pointer user gets no initial focus inside the menu: moving focus to the first
        // item on a mouse click makes the item look pre-selected, and a stray Enter then
        // runs a command the user never chose. Keyboard activation goes through the keydown
        // handler below, which sets an intent first.
        setIntent(event.detail === 0 ? 'first' : 'none')
        setOpen(!open)
      }}
      onKeyDown={(event) => {
        handleKeyDown(event)
        if (event.defaultPrevented) return
        if (open) return

        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setIntent('first')
          setOpen(true)
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          setIntent('last')
          setOpen(true)
        }
      }}
    >
      {children}
    </button>
  )
}

export interface MenuContentProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  children: ReactNode
  /** Close when a pointer press lands outside the menu and its trigger. Defaults to `true`. */
  closeOnOutsidePress?: boolean
  ref?: Ref<HTMLDivElement>
}

/**
 * The menu surface.
 *
 * ## Key contract
 *
 * - **ArrowDown** / **ArrowUp** — next / previous item, wrapping at both ends.
 * - **Home** / **End** — first / last item.
 * - **A printable character** — jump to the next item whose label starts with it; keep typing
 *   within half a second to refine; press the same character repeatedly to cycle through
 *   items starting with it. See {@link findByTypeahead}.
 * - **Enter** / **Space** — activate the focused item, handled natively because items are
 *   buttons.
 * - **Escape** — close and return focus to the trigger.
 * - **Tab** — close and let the browser move focus onwards, which is what a non-modal popup
 *   should do. Trapping Tab inside a menu strands anyone who opened it by mistake.
 */
export function MenuContent({
  children,
  closeOnOutsidePress = true,
  ref,
  ...rest
}: MenuContentProps): ReactNode {
  const context = useMenuContext('MenuContent')
  const { open, setOpen, intent, setIntent, triggerRef, contentRef, triggerId, contentId } = context
  const { closeAndRestore } = context

  const composed = useComposedRefs(contentRef, ref)
  const typeahead = useTypeahead()

  const roving = useRovingTabIndex({
    containerRef: contentRef,
    itemSelector: '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]',
    orientation: 'vertical',
    loop: true,
  })

  // Initial focus, placed before paint so no frame is drawn with the menu open and focus
  // still on the trigger — that frame is enough for a screen reader to start reading the
  // trigger again instead of the menu.
  useIsomorphicLayoutEffect(() => {
    if (!open) return
    if (intent === 'none') return
    roving.move(intent === 'last' ? 'last' : 'first')
    setIntent('none')
  }, [open, intent, roving, setIntent])

  useEscapeKey(() => closeAndRestore(), { enabled: open })

  useOnClickOutside([contentRef], () => setOpen(false), {
    enabled: open && closeOnOutsidePress,
    // The trigger toggles on click; without this the press would close the menu here and
    // the trigger's own handler would immediately reopen it.
    ignoreRefs: [triggerRef],
  })

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Tab') {
      // Deliberately not prevented. The menu closes and the browser's own Tab handling then
      // moves focus to whatever follows the trigger, which is where the user expects to be.
      setOpen(false)
      return
    }

    roving.onKeyDown(event)
    if (event.defaultPrevented) return

    if (!isTypeaheadKey(event)) return

    const items = roving.getItems()
    // The accessible name, not the text content: an item whose label is an icon plus visually
    // hidden text still has a name, and `textContent` would return the icon's alt-less
    // nothing. `aria-label` wins where it is set, as it does for the name computation itself.
    const labels = items.map((item) => item.getAttribute('aria-label') ?? item.textContent ?? '')
    const query = typeahead.push(event.key)
    const match = findByTypeahead(labels, query, roving.getActiveIndex())

    if (!match) return
    event.preventDefault()
    roving.focusIndex(match.index)
  }

  if (!open) return null

  return (
    <div
      {...rest}
      ref={composed}
      role="menu"
      id={contentId}
      // The menu's accessible name comes from the button that opened it, which is almost
      // always the right name and is never out of date.
      aria-labelledby={triggerId}
      data-state="open"
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )
}

export interface MenuItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick' | 'onSelect'> {
  children: ReactNode
  /** Called when the item is chosen. Call `preventDefault` on the event to keep the menu open. */
  onSelect?: (event: ReactMouseEvent<HTMLButtonElement>) => void
  /**
   * Keep the menu open after selection. Defaults to `false`.
   *
   * Right for an item that toggles something the user may want to toggle several times.
   */
  keepOpen?: boolean
  ref?: Ref<HTMLButtonElement>
}

/**
 * One command in the menu.
 *
 * A `<button type="button">` carrying `role="menuitem"`. The role replaces what assistive
 * technology announces; it does not replace what the element does, so Enter and Space
 * activation, the disabled semantics and the focus ring all still come from the element. A
 * `div` with `role="menuitem"` has to reimplement each of those, and the one invariably
 * missed is Space — which in a menu is the difference between an item that can be chosen and
 * one that cannot.
 *
 * `tabIndex={-1}` on every item, always: the menu is entered by focusing an item
 * programmatically, not by tabbing into it, and Tab is how the user leaves. An item with
 * `tabIndex={0}` would make an eight-item menu eight extra tab stops between the trigger and
 * the rest of the page.
 */
export function MenuItem({
  children,
  onSelect,
  keepOpen = false,
  disabled,
  ref,
  ...rest
}: MenuItemProps): ReactNode {
  const { closeAndRestore } = useMenuContext('MenuItem')
  const handleSelect = useEventCallback(onSelect)

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="menuitem"
      tabIndex={-1}
      // `aria-disabled`, not `disabled`, so the item stays in the arrow-key sequence. A
      // disabled command the user cannot even move to is a command they cannot discover, and
      // they are left wondering whether the feature exists at all.
      aria-disabled={disabled ? true : undefined}
      data-disabled={disabled ? '' : undefined}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault()
          return
        }
        handleSelect(event)
        if (event.defaultPrevented) return
        if (!keepOpen) closeAndRestore()
      }}
      onPointerMove={(event) => {
        // Focus follows the pointer, which is what makes a menu feel like a menu: the item
        // under the cursor is the item Enter will run, so pointer and keyboard never
        // disagree about what is selected. `pointermove` rather than `pointerenter` because
        // a menu that opens under a stationary cursor should not steal focus until the user
        // actually moves.
        if (disabled) return
        const target = event.currentTarget
        if (target.ownerDocument.activeElement !== target) focusElement(target)
      }}
    >
      {children}
    </button>
  )
}

export interface MenuGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** A visible heading for the group. Rendered as a labelled element and referenced by the group. */
  label?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * A labelled set of related items.
 *
 * Worth using whenever a menu has more than one kind of command in it. A screen reader
 * announces the group name on entering it, which is the only way a non-visual user learns
 * about the separations that a sighted user reads from a horizontal rule.
 */
export function MenuGroup({ children, label, ref, ...rest }: MenuGroupProps): ReactNode {
  const id = useId()

  return (
    // biome-ignore lint/a11y/useSemanticElements: a `fieldset` is not permitted content inside `role="menu"`, which only allows menu items, groups and separators. The generic element with an explicit role is the only valid form here.
    <div {...rest} ref={ref} role="group" aria-labelledby={label ? id : undefined}>
      {label ? (
        // Not a `menuitem`: a heading inside a menu that is focusable would be an item the
        // user can move to and activate, which does nothing and reads as a broken command.
        <div id={id} data-vk-menu-group-label="">
          {label}
        </div>
      ) : null}
      {children}
    </div>
  )
}

export interface MenuSeparatorProps extends HTMLAttributes<HTMLHRElement> {
  ref?: Ref<HTMLHRElement>
}

/**
 * A divider between groups of items.
 *
 * An `<hr>`, not a `div` with `role="separator"`. The element already has that role, already
 * has horizontal orientation, and needs no ARIA at all — and unlike the div it survives a
 * stylesheet failing to load, which is when a menu most needs its structure to still read.
 * The only thing to remember is a CSS reset, because the default rule has margins.
 *
 * A separator is announced. If the divider is purely decorative and a {@link MenuGroup}
 * already carries the meaning, pass `role="presentation"` to keep the menu quiet.
 */
export function MenuSeparator({ ref, ...rest }: MenuSeparatorProps): ReactNode {
  return <hr {...rest} ref={ref} />
}
