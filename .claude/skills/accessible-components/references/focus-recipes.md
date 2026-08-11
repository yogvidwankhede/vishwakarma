# Focus management recipes

Focus is state. Treat it like any other state: know who owns it, know what changes it, and
know where it goes when the owner disappears.

---

## Recipe 1 — Modal focus trap

Prefer the platform. `<dialog>` with `showModal()` places the dialog in the top layer,
makes the rest of the document inert, routes Escape through a cancel event, and restores
focus to the previously focused element on close. That is the entire recipe, specified in
HTML, with no library.

When a custom implementation is unavoidable — because the design requires a non-native
stacking context, or animation on the backdrop that `<dialog>` complicates — the trap has
three parts:

**Make the outside inert.** Apply the `inert` attribute to every sibling of the dialog's
container (Baseline across browsers since 2023). `inert` removes the subtree from the tab
order, from hit testing, and from the accessibility tree in one attribute. It is strictly
better than the older approach of `aria-hidden` plus tabindex manipulation, which had to
be undone element by element and always leaked.

**Wrap Tab.** Query tabbable descendants on each Tab keydown rather than caching them at
open time — dialog contents change, and a cached list traps the user against a button that
no longer exists. The selector needs to cover `a[href]`, `button`, `input`, `select`,
`textarea`, `[tabindex]` not equal to -1, and `[contenteditable]`, then filter out
elements that are `disabled`, `inert`, `hidden`, or have zero client rects.

**Handle the empty case.** If the dialog contains no tabbable element, give the dialog
container `tabindex="-1"` and focus it, so Tab has somewhere to be.

---

## Recipe 2 — Initial focus placement

Pick by content, not by habit.

- **Short action dialogs** (confirm, rename): focus the first input, or the safe action.
  Never the destructive one.
- **Content-heavy dialogs** (terms, detail panes): focus the `<h2>` title with
  `tabindex="-1"`. The title is announced first, which orients the user before the
  controls arrive.
- **Forms with a single obvious field**: focus that field.
- **Menus and listboxes**: focus the currently selected item if there is one, otherwise the
  first item. Opening a country picker on "Afghanistan" when the value is "Norway" forces
  the user to navigate a distance the mouse user does not.

Never call `.focus()` on a hidden element or before the element is in the DOM. In React,
that means an effect after the open state commits, not inside the click handler.

---

## Recipe 3 — Restoring focus

Capture `document.activeElement` immediately before opening the overlay and restore it on
close, guarded three ways.

**Is it still connected?** `node.isConnected` — a row action button vanishes when the row
is deleted by the very dialog you are closing.
**Is it still focusable?** It may have become disabled while the dialog was open.
**Is it still visible?** A collapsed accordion panel may contain it.

When the original target is gone, walk outward: the container that held it, then the list,
then the page's main heading, each with `tabindex="-1"`. Do not let focus fall to
`<body>`; that returns a screen-reader user to the top of the document with no explanation
and is the single most common cause of "the modal closed and I got lost".

Use `preventScroll: true` when the restore target is off-screen and a jump would be
disorienting — but only after confirming the user can still find it.

---

## Recipe 4 — Roving tabindex

Use for tabs, toolbars, menus, radio groups, grids, and trees — anywhere the focused item
is a real, focusable element.

The invariant: **exactly one element in the group has `tabindex="0"`; all others have
`tabindex="-1"`.** On arrow key, update both the tabindex values and call `.focus()` on
the new item. Focus and tabindex must move together; updating tabindex alone leaves focus
behind, and calling focus alone means Shift+Tab out and back lands on the wrong item.

Two details that are usually wrong:

**The active index must survive re-renders.** If items are keyed by index and the list
reorders, the roving index now points at different content. Key by item id.

**Home/End and typeahead move the roving index too.** A typeahead implementation that
scrolls without focusing breaks the invariant.

---

## Recipe 5 — aria-activedescendant

Use only when DOM focus must remain elsewhere — practically, when a text input must keep
receiving keystrokes while a list is navigated.

The container (or input) has `tabindex="0"` and `aria-activedescendant` set to the id of
the active option. Options have ids and `tabindex` is not set on them at all.

Three obligations the browser will not fulfil for you:

1. **Scrolling.** Nothing moved, so nothing scrolls. Call
   `option.scrollIntoView({ block: 'nearest' })` on every change, or the active option
   walks out of the viewport and the component appears frozen.
2. **Styling.** `:focus` never matches the option. Style the active option from an explicit
   class or attribute selector, and give it a 3:1 contrast boundary — a background tint
   alone often fails SC 1.4.11.
3. **Validity.** `aria-activedescendant` must reference an id that exists in the DOM at
   that instant. Filtering a combobox list while the active id points at a removed option
   leaves the widget in an undefined state; reset it to the first remaining option or
   remove the attribute.

---

## Recipe 6 — Focus on route change

In a single-page app, navigation does not move focus, so a screen-reader user hears nothing
and a keyboard user's next Tab continues from the old page's link.

On each route commit, move focus to the new page's `<h1>` with `tabindex="-1"`, or to the
`<main>` element. That announces the page identity and resets the tab sequence to the top.
A polite live region announcing the new title is a weaker substitute — it says what
happened but does not fix the tab position.

Skip links are the same mechanism: the target of a skip link needs `tabindex="-1"`, or in
some browsers the fragment scrolls without focus following, and the next Tab returns to the
navigation the user just skipped.

---

## Recipe 7 — Focus after destructive actions

Deleting the item that holds focus is the most common way focus is lost silently.

Decide the successor **before** the removal: the next sibling, or the previous if the
deleted item was last, or the list container with `tabindex="-1"` if it is now empty.
Apply focus after the removal commits. Pair it with a polite live region announcing what
was deleted, since focus movement alone does not explain the change.

The same applies to filtering, pagination, and infinite scroll: any operation that can
unmount the focused element owes a successor.

---

## Recipe 8 — Verifying focus by hand

Four checks, all fast:

1. Tab through the component. Every stop must show a visible indicator with at least 3:1
   contrast against what surrounds it, and the order must match the visual order.
2. Open every overlay and press Escape. It must close and return focus to its trigger.
3. In an open overlay, hold Tab past the last control. Focus must not escape.
4. In DevTools, run `document.activeElement` after each interaction. If it ever reports
   `<body>`, focus has been dropped.
