# Keyboard interaction contracts by pattern

Each contract below is the minimum a component must satisfy to be considered complete.
They follow the ARIA Authoring Practices patterns; where the APG marks a behaviour
optional, it is marked optional here. Implement the required set fully before adding
anything optional — a half-implemented pattern is worse than a plain list, because it
promises a keyboard model that does not exist.

---

## Dialog (modal)

**Structure**: `role="dialog"` with `aria-modal="true"`, named by `aria-labelledby`
pointing at the visible title (or `aria-label` if there is no visible title). Prefer the
native `<dialog>` element with `showModal()`, which supplies top-layer stacking,
background inertness, and focus restoration.

| Key | Behaviour |
| --- | --- |
| Escape | Closes the dialog. Required, including for dialogs with a Cancel button. |
| Tab | Moves to the next tabbable element inside the dialog; wraps from last to first. |
| Shift+Tab | Moves to the previous; wraps from first to last. |

**On open**: focus the first interactive control, or the heading with `tabindex="-1"` when
the dialog contains substantial reading content.
**On close**: focus returns to the invoking element.
**Alert dialogs** use `role="alertdialog"` and must be named and described; focus goes to
the least destructive action.

---

## Disclosure

**Structure**: a `<button>` with `aria-expanded` (`true`/`false`) and `aria-controls`
pointing at the region id. The region does not need a role. `<details>`/`<summary>` gives
this for free and should be the default choice.

| Key | Behaviour |
| --- | --- |
| Enter, Space | Toggles the region. |

Never place `aria-expanded` on the region — it belongs on the control. Do not set
`aria-hidden` on a collapsed region that is already `display: none`; that is redundant and
tends to get out of sync.

---

## Accordion

An accordion is a set of disclosures with shared headings. Each header is a `<button>`
wrapped in an `<h2>` (or the level appropriate to the document) so the panels appear in
the heading list. Panels get `role="region"` and `aria-labelledby` pointing at their
header button — but only when the number of panels is small, since region landmarks are
noisy in bulk.

| Key | Behaviour |
| --- | --- |
| Enter, Space | Toggles the panel of the focused header. |
| Down Arrow / Up Arrow | Optional: move focus to the next/previous header. |
| Home / End | Optional: move focus to the first/last header. |

Tab must reach every header and every control inside an open panel in document order.

---

## Tabs

**Structure**: `role="tablist"` containing `role="tab"` elements, each with
`aria-selected` and `aria-controls`; each `role="tabpanel"` carries `aria-labelledby`
referencing its tab. Add `aria-orientation="vertical"` for vertical tab lists.

**Focus model**: roving tabindex. The selected tab has `tabindex="0"`, all other tabs
`tabindex="-1"`. This is what makes Tab enter the tab list at the selected tab and then
leave, rather than stepping through every tab.

| Key | Behaviour |
| --- | --- |
| Tab | Enters the tablist at the active tab; next press leaves the tablist. |
| Right / Left Arrow | Moves focus between tabs (horizontal orientation), wrapping. |
| Down / Up Arrow | Same as Right/Left in vertical orientation. |
| Home / End | Optional: first/last tab. |
| Enter, Space | Activates the focused tab when using manual activation. |
| Delete | Optional: closes the tab, in closable tab sets. |

**Automatic activation** (panel changes on focus) is correct when panels are already loaded.
**Manual activation** (Enter/Space required) is correct when switching costs a fetch —
otherwise arrowing through five tabs fires five requests and speaks five panels.

The tab panel should be focusable with `tabindex="0"` only if it contains no focusable
children, so keyboard users can reach its content.

---

## Menu button and menu

**Structure**: a `<button>` with `aria-haspopup="true"` and `aria-expanded`, controlling a
`role="menu"` containing `role="menuitem"` (or `menuitemcheckbox`/`menuitemradio`).

Use this pattern only for application-style command menus. A list of links to other pages
is a navigation list, not a menu — using `role="menu"` for site navigation makes the links
stop being announced as links.

| Key | Behaviour |
| --- | --- |
| Enter, Space, Down Arrow (on the button) | Opens the menu, focus on the first item. |
| Up Arrow (on the button) | Opens the menu, focus on the last item. |
| Down / Up Arrow (in the menu) | Moves focus between items, optionally wrapping. |
| Home / End | First / last item. |
| Escape | Closes the menu and returns focus to the button. |
| Enter | Activates the item and closes the menu. |
| Right Arrow | Opens a submenu, focus on its first item. |
| Left Arrow | Closes the submenu and returns focus to the parent item. |
| Printable character | Optional typeahead: moves to the next item starting with it. |
| Tab | Closes the menu and moves focus onward in the page. |

Menu items are not in the tab sequence; use roving tabindex.

---

## Listbox

**Structure**: `role="listbox"` containing `role="option"` elements, each with
`aria-selected`. Multi-select listboxes carry `aria-multiselectable="true"`.

| Key | Behaviour |
| --- | --- |
| Down / Up Arrow | Moves focus to the next/previous option. |
| Home / End | First / last option. |
| Printable character | Typeahead to the next matching option. |
| Space | Toggles selection in a multi-select listbox. |
| Shift+Arrow | Extends selection in a multi-select listbox. |
| Ctrl/Cmd+A | Optional: select all. |

Single-select listboxes conventionally follow focus, so arrowing changes the selected
value. Multi-select listboxes must not, or the user cannot navigate past an item without
selecting it.

---

## Combobox

**Structure**: `role="combobox"` on the `<input>` itself, with `aria-expanded`,
`aria-controls` pointing at the popup, and `aria-autocomplete` set to `none`, `list`, or
`both`. The popup is usually a `role="listbox"`; if it is a grid, tree, or dialog instead,
add `aria-haspopup` naming it. Focus stays on the input; the active option is tracked with
`aria-activedescendant`.

| Key | Behaviour |
| --- | --- |
| Down Arrow | Opens the popup if closed and moves the active option into it. |
| Up Arrow | Opens the popup and optionally moves to the last option. |
| Alt+Down Arrow | Optional: opens the popup without moving the active option. |
| Alt+Up Arrow | Optional: closes the popup, keeping focus in the input. |
| Enter | Accepts the active option, closes the popup, writes the value into the input. |
| Escape | Closes the popup; a second press may clear the input in editable comboboxes. |
| Home / End | Moves the text cursor within the input (editable combobox). |
| Tab | Leaves the combobox; the popup closes. |

The combobox is a single tab stop. Options are never tabbable. Because
`aria-activedescendant` does not move real focus, you must scroll the active option into
view and style it yourself — the browser will do neither.

---

## Tooltip

**Structure**: `role="tooltip"` on the bubble, referenced from the trigger by
`aria-describedby`. A tooltip supplements a name; it must never be the only source of one.

Triggers must be genuinely focusable elements. A tooltip on a `<span>` or on a
`disabled` button is unreachable by keyboard — wrap the disabled control, or use
`aria-disabled` with click suppression so the control stays focusable.

Required by WCAG 2.2 SC 1.4.13:
- **Dismissible**: Escape hides the tooltip without moving pointer or focus.
- **Hoverable**: moving the pointer from the trigger into the tooltip does not hide it,
  so magnifier users can read overflowed text.
- **Persistent**: it stays until dismissed, focus moves away, or its content is invalid —
  never on a timeout.

Tooltips must not contain interactive content. If it needs a link or a button, it is a
popover, not a tooltip.

---

## Slider

**Structure**: `role="slider"` on the thumb, with `aria-valuenow`, `aria-valuemin`,
`aria-valuemax`, `tabindex="0"`, and an accessible name. Add `aria-valuetext` whenever the
raw number is not what the user should hear ("Medium", "3 stars", "£4,500"), because a
screen reader will otherwise read "3" with no unit. Add `aria-orientation="vertical"` for
vertical sliders. `<input type="range">` gives all of this natively and should be preferred.

| Key | Behaviour |
| --- | --- |
| Right / Up Arrow | Increase by one step. |
| Left / Down Arrow | Decrease by one step. |
| Page Up / Page Down | Optional: increase/decrease by a larger step. |
| Home / End | Minimum / maximum. |

Multi-thumb sliders give each thumb its own `role="slider"`, its own name ("Minimum
price"), and constrain `aria-valuemin`/`aria-valuemax` to the other thumb's position.

---

## Tree view

**Structure**: `role="tree"` containing `role="treeitem"` elements; parent items carry
`aria-expanded` and their children live in a `role="group"`. Use `aria-level`,
`aria-setsize`, and `aria-posinset` when the DOM structure does not make the hierarchy
derivable.

| Key | Behaviour |
| --- | --- |
| Down Arrow | Next visible node, without opening or closing anything. |
| Up Arrow | Previous visible node. |
| Right Arrow | On a closed node, opens it; on an open node, moves to its first child. |
| Left Arrow | On an open node, closes it; on a leaf, moves to its parent. |
| Home / End | First / last visible node. |
| Enter | Performs the node's default action. |
| Printable character | Typeahead to the next node whose name starts with it. |
| \* | Optional: expands all siblings at the current level. |

Roving tabindex is the right focus model here: the tree is one tab stop, and the currently
focused node holds `tabindex="0"`.
