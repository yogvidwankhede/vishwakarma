'use client'

import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { useCallback, useMemo } from 'react'
import { focusElement } from './tabbable.js'
import { useEventCallback } from './use-event-callback.js'

/**
 * The arrow-key navigation contract shared by tabs, menus, toolbars and listboxes.
 *
 * ## Roving tabindex versus aria-activedescendant
 *
 * Both patterns exist to make a group of widgets a single tab stop. They differ in where DOM
 * focus actually is, and the choice is not a matter of taste.
 *
 * **Roving tabindex** moves real focus. Exactly one item carries `tabindex="0"` and the rest
 * carry `tabindex="-1"`; arrow keys call `focus()` on the next item and move the zero. Because
 * focus is real, `:focus-visible` works, the browser scrolls the item into view by itself,
 * `document.activeElement` is the truth, and assistive technology gets a focus event it did
 * not have to be told about. This is the right default, and it is what this hook implements.
 *
 * **aria-activedescendant** leaves focus on the container and names the active item by id. It
 * is the right choice in exactly two situations: when focus must stay in a text input while
 * the user navigates a list of options — a combobox, where moving focus to an option would
 * stop them typing — and when the list is virtualised, because moving focus into a row that
 * is about to be unmounted destroys it. The costs are real: `:focus-visible` never matches so
 * the active item has to be styled from an attribute, nothing scrolls automatically, and
 * support for changes to the attribute is meaningfully weaker than support for focus events.
 *
 * A rule that holds up: if the user is typing, use `aria-activedescendant`; otherwise move
 * focus.
 *
 * ## What this hook does and does not own
 *
 * It owns navigation — which element should receive focus for a given key — and it queries
 * the DOM for items at the moment a key is pressed, so a list that changed since the last
 * render is navigated correctly rather than through a stale registry.
 *
 * It deliberately does *not* write `tabindex` onto the items. The consuming component
 * already knows which item is active — it is rendering the selection — so it can render the
 * attribute declaratively. A hook that also wrote it would be fighting React over the same
 * DOM property, and the loser of that fight is whichever one ran last, which is not
 * something a maintainer should have to reason about.
 */

/** Which arrow keys navigate. `both` accepts all four, for a grid-like wrap. */
export type Orientation = 'horizontal' | 'vertical' | 'both'

/** Where to move focus to. */
export type MoveDirection = 'next' | 'previous' | 'first' | 'last'

export interface RovingTabIndexOptions {
  /** The element containing the items. */
  containerRef: RefObject<HTMLElement | null>
  /**
   * CSS selector identifying the items, evaluated within the container.
   *
   * Scoped with `:scope >` where nesting is possible: a submenu inside a menu would
   * otherwise contribute its items to the parent's arrow navigation.
   */
  itemSelector: string
  /** Which arrows navigate. Defaults to `vertical`. */
  orientation?: Orientation
  /** Wrap from the last item to the first and back. Defaults to `true`. */
  loop?: boolean
  /**
   * Reverse the horizontal arrows for right-to-left text.
   *
   * In an RTL document, Left means "forwards". Getting this wrong makes the keyboard feel
   * mirrored to half the world's users, and it is invisible in testing done in English.
   * Defaults to reading the container's resolved direction.
   */
  rtl?: boolean
  /** Skip items that are disabled. Defaults to `true`. */
  skipDisabled?: boolean
  /** Called after focus moves, with the element that now has it. */
  onMove?: (element: HTMLElement, index: number) => void
}

export interface RovingTabIndex {
  /** The navigable items, in DOM order, as of right now. */
  getItems: () => HTMLElement[]
  /** Index of the item that currently has focus, or -1. */
  getActiveIndex: () => number
  /** Focus a specific item by index. Returns the element focused, if any. */
  focusIndex: (index: number) => HTMLElement | null
  /** Move focus in a direction, honouring `loop`. Returns the element focused, if any. */
  move: (direction: MoveDirection) => HTMLElement | null
  /**
   * The key handler.
   *
   * ## Key contract
   *
   * - **ArrowDown** / **ArrowUp** — next / previous, when orientation allows.
   * - **ArrowRight** / **ArrowLeft** — next / previous, when orientation allows, swapped in
   *   right-to-left text.
   * - **Home** / **End** — first / last item.
   *
   * Keys with a modifier held are ignored, so Ctrl+Home still scrolls the document and
   * Shift+Arrow still extends a selection where one exists.
   */
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
}

function isDisabledItem(element: HTMLElement): boolean {
  if ('disabled' in element && element.disabled === true) return true
  return element.getAttribute('aria-disabled') === 'true'
}

/** Implement arrow-key navigation over a set of items inside a container. */
export function useRovingTabIndex(options: RovingTabIndexOptions): RovingTabIndex {
  const {
    containerRef,
    itemSelector,
    orientation = 'vertical',
    loop = true,
    rtl,
    skipDisabled = true,
    onMove,
  } = options

  const notifyMove = useEventCallback(onMove)

  const getItems = useCallback((): HTMLElement[] => {
    const container = containerRef.current
    if (!container) return []
    const found = Array.from(container.querySelectorAll<HTMLElement>(itemSelector))
    return skipDisabled ? found.filter((item) => !isDisabledItem(item)) : found
  }, [containerRef, itemSelector, skipDisabled])

  const getActiveIndex = useCallback((): number => {
    const container = containerRef.current
    if (!container) return -1
    const active = container.ownerDocument.activeElement
    if (!(active instanceof HTMLElement)) return -1
    return getItems().indexOf(active)
  }, [containerRef, getItems])

  const focusIndex = useCallback(
    (index: number): HTMLElement | null => {
      const items = getItems()
      const target = items[index]
      if (!target) return null
      if (!focusElement(target)) return null
      notifyMove(target, index)
      return target
    },
    [getItems, notifyMove],
  )

  const move = useCallback(
    (direction: MoveDirection): HTMLElement | null => {
      const items = getItems()
      if (items.length === 0) return null

      const current = getActiveIndex()
      let next: number

      switch (direction) {
        case 'first':
          next = 0
          break
        case 'last':
          next = items.length - 1
          break
        case 'next':
          // From nowhere, "next" means the beginning rather than the second item. This is
          // what makes ArrowDown on a freshly opened menu land on the first item.
          next = current === -1 ? 0 : current + 1
          if (next >= items.length) next = loop ? 0 : items.length - 1
          break
        case 'previous':
          next = current === -1 ? items.length - 1 : current - 1
          if (next < 0) next = loop ? items.length - 1 : 0
          break
      }

      return focusIndex(next)
    },
    [getItems, getActiveIndex, focusIndex, loop],
  )

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.defaultPrevented) return

      const container = containerRef.current
      const isRtl =
        rtl ??
        (container
          ? container.ownerDocument.defaultView?.getComputedStyle(container).direction === 'rtl'
          : false)

      const vertical = orientation === 'vertical' || orientation === 'both'
      const horizontal = orientation === 'horizontal' || orientation === 'both'

      let direction: MoveDirection | null = null

      switch (event.key) {
        case 'ArrowDown':
          if (vertical) direction = 'next'
          break
        case 'ArrowUp':
          if (vertical) direction = 'previous'
          break
        case 'ArrowRight':
          if (horizontal) direction = isRtl ? 'previous' : 'next'
          break
        case 'ArrowLeft':
          if (horizontal) direction = isRtl ? 'next' : 'previous'
          break
        case 'Home':
          direction = 'first'
          break
        case 'End':
          direction = 'last'
          break
        default:
          direction = null
      }

      if (!direction) return

      // Both are needed. `preventDefault` stops ArrowDown scrolling the page and Home
      // jumping to the top of the document — a list that navigates *and* scrolls is
      // disorienting. `stopPropagation` keeps a nested list from also being navigated by the
      // same press, which is how a submenu ends up moving its parent's selection too.
      event.preventDefault()
      event.stopPropagation()
      move(direction)
    },
    [containerRef, orientation, rtl, move],
  )

  return useMemo(
    () => ({ getItems, getActiveIndex, focusIndex, move, onKeyDown }),
    [getItems, getActiveIndex, focusIndex, move, onKeyDown],
  )
}
