'use client'

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  Ref,
} from 'react'
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useComposedRefs } from './compose-refs.js'
import { useControllableState } from './use-controllable-state.js'
import { useEventCallback } from './use-event-callback.js'
import type { Orientation } from './use-roving-tab-index.js'
import { useRovingTabIndex } from './use-roving-tab-index.js'

/**
 * Tabs.
 *
 * ## Automatic versus manual activation
 *
 * When the user moves between tabs with the arrow keys, does the panel change as they go, or
 * only when they press Enter or Space? The ARIA authoring practices allow both, and the
 * choice is a real one with a real failure mode on each side.
 *
 * **Automatic** — the panel follows focus. This is the better default and the one most users
 * expect, because it matches how a mouse user experiences tabs: one action, one result. The
 * cost is that arrowing from the first tab to the fourth renders three panels nobody wanted
 * to see. If those panels fetch data, that is three requests; if they are heavy, the keyboard
 * feels sticky. It also means a screen reader announces three panel changes on the way past.
 *
 * **Manual** — focus moves, selection does not, until the user presses Enter or Space. This
 * is correct when a panel is expensive: a tab that loads a report, a tab that mounts a chart.
 * The cost is a second keystroke that mouse users never have to make, and a state a mouse
 * user cannot get into at all — a focused-but-unselected tab — which has to be styled or it
 * looks broken.
 *
 * The rule that holds: automatic unless changing panels does real work, in which case manual.
 * Whichever is chosen, `aria-selected` must reflect selection and not focus, or a screen
 * reader will report the wrong tab as current.
 *
 * ## Why the tab stop moves
 *
 * A tab list is one tab stop, not one per tab. Tabbing into a list of eight tabs and having
 * to press Tab eight more times to reach the panel is exactly the problem roving tabindex
 * solves; see {@link useRovingTabIndex} for why this pattern rather than
 * `aria-activedescendant`.
 */

/** Whether arrow keys change the selection or only the focus. */
export type TabActivation = 'automatic' | 'manual'

interface TabsContextValue {
  value: string | null
  setValue: (value: string) => void
  focusedValue: string | null
  setFocusedValue: (value: string) => void
  orientation: Orientation
  activation: TabActivation
  baseId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext(component: string): TabsContextValue {
  const context = useContext(TabsContext)
  if (!context) throw new Error(`${component} must be rendered inside <Tabs>.`)
  return context
}

/**
 * Build a stable, valid id fragment from a tab value.
 *
 * Values come from application data and routinely contain spaces, slashes and full stops. An
 * `id` may contain those, but `aria-controls` and `aria-labelledby` are space-separated ID
 * *lists*, so an id with a space in it silently becomes two broken references and the
 * relationship between tab and panel disappears.
 */
function idFragment(value: string): string {
  return value.replace(/[^\w-]/g, '_')
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  children: ReactNode
  /** Controlled selected value. */
  value?: string
  /** Starting selection when uncontrolled. */
  defaultValue?: string
  /** Called when the selected tab changes. */
  onValueChange?: (value: string) => void
  /**
   * Which arrows move between tabs. Defaults to `horizontal`.
   *
   * Must match the visual arrangement. Vertical tabs navigated by Left and Right, or
   * horizontal tabs navigated by Up and Down, are worse than no arrow support at all,
   * because the user has no way to guess which one this instance chose.
   */
  orientation?: 'horizontal' | 'vertical'
  /** See the note above. Defaults to `automatic`. */
  activation?: TabActivation
  ref?: Ref<HTMLDivElement>
}

/** Owns the selection and the ids that link tabs to panels. */
export function Tabs({
  children,
  value,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  activation = 'automatic',
  ref,
  ...rest
}: TabsProps): ReactNode {
  const [selected, setSelected] = useControllableState<string | null>({
    value: value,
    defaultValue: defaultValue ?? null,
    onChange: (next) => {
      if (next !== null) onValueChange?.(next)
    },
    name: 'Tabs',
  })

  // Focus and selection are different things in manual mode, and the same thing in automatic
  // mode. Tracking focus separately in both keeps one code path, and means the tab stop is
  // always the tab the user last touched rather than jumping back to the selected one.
  const [focusedValue, setFocusedValue] = useState<string | null>(null)
  const baseId = useId()

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      value: selected,
      setValue: setSelected,
      focusedValue,
      setFocusedValue,
      orientation,
      activation,
      baseId,
    }),
    [selected, setSelected, focusedValue, orientation, activation, baseId],
  )

  return (
    <TabsContext.Provider value={contextValue}>
      <div {...rest} ref={ref} data-orientation={orientation}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export interface TabListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** An accessible name for the set of tabs, e.g. "Account settings". */
  'aria-label'?: string
  ref?: Ref<HTMLDivElement>
}

/**
 * The container for the tabs.
 *
 * ## Key contract
 *
 * - **ArrowRight** / **ArrowLeft** — next / previous tab, in a horizontal list, reversed in
 *   right-to-left text.
 * - **ArrowDown** / **ArrowUp** — next / previous tab, in a vertical list.
 * - **Home** / **End** — first / last tab.
 * - **Enter** / **Space** — select the focused tab. Only meaningful in manual activation;
 *   in automatic mode the tab is already selected.
 * - **Tab** — leaves the list entirely and lands on the selected panel.
 *
 * Navigation wraps. A list of tabs is a closed set with no beginning or end that the user can
 * see, so stopping at the last one reads as the key having failed.
 */
export function TabList({ children, ref, ...rest }: TabListProps): ReactNode {
  const context = useTabsContext('TabList')
  const { orientation, activation, setValue, setFocusedValue } = context
  const { value: selectedValue, focusedValue } = context
  const listRef = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(listRef, ref)

  const roving = useRovingTabIndex({
    containerRef: listRef,
    // The role, not a data attribute, so a consumer who wraps each tab in a layout element
    // still gets navigation. The query is rooted at this list, so a second `Tabs` rendered
    // inside a panel has its own list and never joins this one's navigation.
    itemSelector: '[role="tab"]',
    orientation,
    loop: true,
    onMove: (element) => {
      const next = element.getAttribute('data-value')
      if (next === null) return
      setFocusedValue(next)
      if (activation === 'automatic') setValue(next)
    },
  })

  // A tab list with nothing selected has no tab stop at all: every tab renders
  // `tabindex="-1"` and the whole control becomes unreachable by keyboard, silently. Rather
  // than leave that as a configuration error for the consumer to discover in an audit, the
  // first tab is adopted as the tab stop — focusable, but still unselected, so nothing is
  // chosen on the user's behalf.
  useEffect(() => {
    if (focusedValue !== null || selectedValue !== null) return
    const first = roving.getItems()[0]
    const value = first?.getAttribute('data-value')
    if (value) setFocusedValue(value)
  }, [focusedValue, selectedValue, roving, setFocusedValue])

  return (
    <div
      {...rest}
      ref={composed}
      role="tablist"
      // Announced by screen readers so the user knows which arrows to try. Only emitted for
      // vertical lists, since `horizontal` is the implicit default and repeating it adds
      // nothing.
      aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
      onKeyDown={roving.onKeyDown}
    >
      {children}
    </div>
  )
}

export interface TabProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'value' | 'onClick'> {
  children: ReactNode
  /** Identifies the tab and the panel it controls. */
  value: string
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void
  ref?: Ref<HTMLButtonElement>
}

/**
 * One tab.
 *
 * A `<button>` again, and here the argument is sharper than usual: `role="tab"` overrides the
 * implicit button role but not the behaviour, so activation on Enter and Space, the tab stop,
 * the disabled semantics and the focus ring all still come from the element for free. Built
 * on a `div`, every one of those has to be written by hand, and the Space handler in
 * particular is invariably missed — which means a keyboard user in manual activation mode can
 * focus a tab and never select it.
 *
 * `aria-disabled` rather than `disabled`: a disabled `<button>` is removed from the tab order
 * and from most screen readers' virtual cursor, so a user arrowing through the list would
 * never learn the tab exists. Keeping it reachable and announcing it as unavailable is the
 * behaviour ARIA asks for.
 */
export function Tab({ children, value, onClick, disabled, ref, ...rest }: TabProps): ReactNode {
  const context = useTabsContext('Tab')
  const { value: selectedValue, setValue, focusedValue, setFocusedValue, baseId } = context

  const handleClick = useEventCallback(onClick)
  const selected = selectedValue === value
  const fragment = idFragment(value)

  // Exactly one tab in the list must be reachable by Tab. The selected one is the right
  // choice, because a user who tabs into the list should land on the panel they are looking
  // at — but once they have moved focus with the arrows in manual mode, the tab stop follows
  // them, or leaving and re-entering the list would silently undo their navigation.
  const isTabStop = focusedValue !== null ? focusedValue === value : selected

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      role="tab"
      data-value={value}
      id={`${baseId}-tab-${fragment}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${fragment}`}
      aria-disabled={disabled ? true : undefined}
      data-state={selected ? 'active' : 'inactive'}
      tabIndex={isTabStop ? 0 : -1}
      onClick={(event) => {
        handleClick(event)
        if (event.defaultPrevented) return
        if (disabled) return
        setFocusedValue(value)
        setValue(value)
      }}
      onFocus={() => {
        // Covers the paths the roving hook never sees: a click, a screen reader's own focus
        // command, or focus arriving from outside the list. Without it the tab stop can
        // disagree with where focus actually is.
        if (!disabled) setFocusedValue(value)
      }}
    >
      {children}
    </button>
  )
}

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** The value of the tab this panel belongs to. */
  value: string
  /**
   * Remove the panel from the DOM when it is not selected. Defaults to `true`.
   *
   * Unmounting is the right default here, unlike in a disclosure: only one panel is ever
   * visible, the panels are usually substantial, and keeping them all mounted means every
   * form field in every tab participates in the page's tab order invisibly. Turn it off when
   * panels hold state that must survive switching — a half-completed form in each tab.
   */
  unmountWhenInactive?: boolean
  ref?: Ref<HTMLDivElement>
}

/**
 * The content belonging to one tab.
 *
 * `tabIndex={0}` on the panel is deliberate. Tabbing out of the tab list must land on the
 * panel's content; when a panel's content happens to contain no focusable elements — plain
 * text, an image — there is nothing for focus to land on, and the user is thrown past the
 * panel entirely to whatever follows it. Making the panel itself a tab stop also gives screen
 * reader users a stable place from which to start reading, and is what the authoring
 * practices call for.
 */
export function TabPanel({
  children,
  value,
  unmountWhenInactive = true,
  ref,
  ...rest
}: TabPanelProps): ReactNode {
  const { value: selectedValue, baseId } = useTabsContext('TabPanel')
  const selected = selectedValue === value
  const fragment = idFragment(value)

  if (!selected && unmountWhenInactive) return null

  return (
    <div
      {...rest}
      ref={ref}
      role="tabpanel"
      id={`${baseId}-panel-${fragment}`}
      aria-labelledby={`${baseId}-tab-${fragment}`}
      data-state={selected ? 'active' : 'inactive'}
      hidden={!selected}
      tabIndex={selected ? 0 : -1}
    >
      {children}
    </div>
  )
}
