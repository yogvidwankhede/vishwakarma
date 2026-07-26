// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * @vishwakarma/primitives
 *
 * Headless React primitives: behaviour, keyboard contracts and ARIA, and nothing else. No
 * styles ship from this package, not even a reset — every component renders bare elements
 * with the attributes that make them mean something, and the design system on top decides how
 * they look.
 *
 * The split is deliberate. Accessibility is the part that is hard to get right, expensive to
 * retrofit and invisible until someone is hurt by its absence; visual design is the part that
 * every product needs to own. Bundling the two forces a choice between an interface that
 * looks like everyone else's and one that quietly excludes people.
 *
 * Two conventions run through everything here. Components are compound — a root that owns
 * state and named parts that consume it — because that is what lets a consumer put their own
 * markup between the pieces without the primitive losing track of the relationships. And
 * every stateful component accepts both a controlled and an uncontrolled form through
 * {@link useControllableState}, which also warns when a consumer accidentally switches
 * between them.
 */

// ---------------------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------------------

export { type ControllableStateOptions, useControllableState } from './use-controllable-state.js'
export { useEventCallback } from './use-event-callback.js'

// ---------------------------------------------------------------------------------------
// Refs and effects
// ---------------------------------------------------------------------------------------

export { composeRefs, useComposedRefs } from './compose-refs.js'
export { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.js'

// ---------------------------------------------------------------------------------------
// Focus
// ---------------------------------------------------------------------------------------

export {
  focusElement,
  getFocusable,
  getTabbable,
  isFocusable,
  isHidden,
  isInert,
  isTabbable,
} from './tabbable.js'
export { type FocusRestoreOptions, useFocusRestore } from './use-focus-restore.js'
export { type FocusTrapOptions, type InitialFocus, useFocusTrap } from './use-focus-trap.js'
export { useHideOutside } from './use-hide-outside.js'

export {
  type MoveDirection,
  type Orientation,
  type RovingTabIndex,
  type RovingTabIndexOptions,
  useRovingTabIndex,
} from './use-roving-tab-index.js'

// ---------------------------------------------------------------------------------------
// Dismissal and page state
// ---------------------------------------------------------------------------------------

export { type EscapeKeyOptions, useEscapeKey } from './use-escape-key.js'
export { type ClickOutsideOptions, useOnClickOutside } from './use-on-click-outside.js'
export { isScrollLocked, type ScrollLockOptions, useScrollLock } from './use-scroll-lock.js'

// ---------------------------------------------------------------------------------------
// Announcements and rendering
// ---------------------------------------------------------------------------------------

export { Portal, type PortalProps } from './portal.js'
export { type LiveRegionOptions, type Politeness, useLiveRegion } from './use-live-region.js'
export { VisuallyHidden, type VisuallyHiddenProps, visuallyHiddenStyle } from './visually-hidden.js'

// ---------------------------------------------------------------------------------------
// Typeahead
// ---------------------------------------------------------------------------------------

export { findByTypeahead, isTypeaheadKey, type TypeaheadMatch } from './typeahead.js'
export { type Typeahead, type TypeaheadOptions, useTypeahead } from './use-typeahead.js'

// ---------------------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------------------

export {
  Dialog,
  DialogBackdrop,
  type DialogBackdropProps,
  DialogClose,
  type DialogCloseProps,
  DialogContent,
  type DialogContentProps,
  DialogDescription,
  type DialogDescriptionProps,
  DialogPortal,
  type DialogPortalProps,
  type DialogProps,
  DialogTitle,
  type DialogTitleProps,
  DialogTrigger,
  type DialogTriggerProps,
} from './dialog.js'

export {
  Disclosure,
  DisclosurePanel,
  type DisclosurePanelProps,
  type DisclosureProps,
  DisclosureTrigger,
  type DisclosureTriggerProps,
} from './disclosure.js'
export {
  Menu,
  MenuContent,
  type MenuContentProps,
  MenuGroup,
  type MenuGroupProps,
  MenuItem,
  type MenuItemProps,
  type MenuProps,
  MenuSeparator,
  type MenuSeparatorProps,
  MenuTrigger,
  type MenuTriggerProps,
} from './menu.js'
export {
  Tab,
  type TabActivation,
  TabList,
  type TabListProps,
  TabPanel,
  type TabPanelProps,
  type TabProps,
  Tabs,
  type TabsProps,
} from './tabs.js'
