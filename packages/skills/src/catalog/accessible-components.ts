import type { SkillManifest } from '../manifest.js'

/**
 * Accessibility is the domain where generated code fails most confidently.
 *
 * A model asked for a dropdown produces a div with a click handler and a chevron. It looks
 * right in a screenshot, it passes review by anyone using a mouse, and it is completely
 * unusable by a substantial fraction of the people who will encounter it. The failure is
 * invisible in exactly the medium — rendered pixels — that everyone uses to evaluate it.
 *
 * This skill is therefore built around contracts rather than principles. "Be accessible"
 * is unactionable. "Escape closes the listbox and returns focus to the combobox input"
 * is a testable assertion, and an agent that knows twenty such assertions ships components
 * that work.
 */
export const accessibleComponents: SkillManifest = {
  vsm: '1.0',
  id: 'accessible-components',
  name: 'Accessible Components',
  description:
    'Use when building or fixing an interactive component — dialog, menu, tabs, combobox, tooltip — or handling focus, ARIA, or keyboard support.',
  version: '1.0.0',
  license: 'MIT',
  category: 'accessibility',
  tags: ['accessibility', 'a11y', 'aria', 'keyboard', 'focus', 'wcag', 'screen-reader'],

  activation: {
    intents: [
      'building a dialog, modal, dropdown, menu, tabs, combobox, tooltip, accordion, slider, or tree component',
      'making an existing component keyboard accessible',
      'adding ARIA attributes or roles to markup',
      'managing focus, focus traps, or focus restoration',
      'the user reports a screen reader, keyboard, or accessibility problem',
      'fixing failures reported by axe, Lighthouse, or an accessibility audit',
      'announcing dynamic changes such as validation errors, toasts, or search results',
    ],
    globs: [
      '**/components/**/*.tsx',
      '**/components/**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/*Dialog*.tsx',
      '**/*Modal*.tsx',
      '**/*Menu*.tsx',
      '**/*Combobox*.tsx',
      '**/*Select*.tsx',
    ],
    keywords: [
      'accessibility',
      'a11y',
      'aria',
      'screen reader',
      'keyboard',
      'focus trap',
      'wcag',
      'tabindex',
      'role',
      'live region',
    ],
  },

  content: {
    summary:
      'Build interactive components that satisfy the keyboard, focus, naming, and announcement contracts real assistive technology depends on — starting from native elements and only reaching for ARIA when nothing native exists.',

    body: `# Accessible Components

Accessibility failures in component code are not distributed randomly. Almost all come from
four places: rebuilding something the browser already provides, mishandling focus, naming
things wrongly, and failing to announce change. Everything below is organised around those.

The mental model that prevents most of it: **ARIA changes what a component is announced as,
and changes nothing about what it does.** Adding \`role="button"\` to a div does not make it
focusable, does not make Enter or Space activate it, and does not give it a disabled state.
You have promised the assistive technology a button and delivered a rectangle.

---

## 1. Use the native element

\`<button>\` gives you, free: tab-order membership, Enter and Space activation, the \`button\`
role, a name from its own text content, a user-agent \`:focus-visible\` indicator, \`disabled\`
semantics that both remove it from the tab order and announce it as unavailable, form
submission via \`type="submit"\`, forced-colors rendering, and touch-and-explore activation
on mobile screen readers, which does not fire a click on arbitrary divs.

Rebuilding that on a div takes \`role="button"\`, \`tabindex="0"\`, a keydown handler for both
Enter and Space with \`preventDefault\` on Space to stop page scroll, \`aria-disabled\` plus
your own logic to actually block activation, and a hand-written focus ring. Six things to
get right and keep right, in exchange for nothing. The same holds for \`<a href>\`,
\`<input type="checkbox">\`, \`<details>\`, and \`<dialog>\` with \`showModal()\`, which supplies
top-layer stacking, background inertness, Escape via the \`cancel\` event, and focus
restoration to the previously focused element, all specified in HTML.

Reach for ARIA only when the platform has no equivalent — menu buttons, tabs, custom
comboboxes, tree views. Then implement the full pattern, not a fragment of it.

## 2. Focus management is the hard part

Every composite widget needs a decision about where focus lives. There are two correct
mechanisms.

**Roving tabindex**: exactly one item in the group carries \`tabindex="0"\`, every sibling
carries \`tabindex="-1"\`, and arrow keys move both DOM focus and the \`0\`. Use it whenever
the focused item is a real element you can focus — tabs, toolbars, menus, trees, radio
groups. It is the more robust option because the browser handles the focus event, the
scrolling, and the ring itself.

**\`aria-activedescendant\`**: DOM focus stays on a container or text input, whose
\`aria-activedescendant\` points at the id of the virtually focused option. Use it when focus
must stay in a text field while a list is navigated — comboboxes, and little else. Because
nothing actually moved, the browser will neither scroll the active option into view nor
draw a ring on it. A listbox that does not call \`scrollIntoView({ block: 'nearest' })\` is
one whose selection silently walks off the bottom of the visible area.

Modal dialogs additionally require a **trap**: Tab from the last tabbable element wraps to
the first, Shift+Tab from the first wraps to the last, and outside content is neither
focusable nor reachable by the screen-reader virtual cursor. Use \`<dialog>.showModal()\`, or
\`inert\` on the sibling content (Baseline since 2023). Do not use \`aria-hidden\` on the
background while leaving it focusable — that is the worst state available, where a keyboard
user tabs into elements the screen reader refuses to describe.

On close, **return focus to the element that opened the dialog**. If it no longer exists —
deleted row, dismissed card — focus its nearest surviving container with \`tabindex="-1"\`.
Focus falling to \`<body>\` sends a screen-reader user back to the top of the document with
no explanation.

Initial focus goes to the first meaningful control, or — for dialogs with substantial
reading content — to the heading with \`tabindex="-1"\`, so the title is announced first.
Never autofocus a destructive action.

## 3. Names, and the aria-label trap

Accessible names are computed in a fixed precedence: \`aria-labelledby\` wins, then
\`aria-label\`, then the host-language mechanism (\`<label>\`, \`alt\`, \`<legend>\`), then the
element's own text content for roles permitting name-from-content, then \`title\` as a last
resort. Each level silently suppresses everything below it, which is what makes
\`aria-label\` dangerous: it overrides visible text.

A button reading "Save" with \`aria-label="Save changes to your profile"\` is named something
no user can see. Speech-input users say what they see, so "click Save" now matches nothing.
WCAG 2.2 SC 2.5.3 (Label in Name, Level A) requires the accessible name to contain the
visible label text; if you must extend a name, start it with the visible string.

Two more naming failures: \`aria-label\` is ignored on elements with the \`generic\` role (a
plain \`<div>\` or \`<span>\`), so labelling a wrapper does nothing; and \`aria-labelledby\`
pointing at a missing id fails silently, leaving the component unnamed — invisible in code
review, immediate in a screen reader.

## 4. Live regions announce nothing if you create them late

A live region must exist in the accessibility tree **before** its contents change. Screen
readers register the region on insertion and then report mutations to it, so inserting the
container and its text in the same tick usually announces nothing. Render an empty
\`<div role="status">\` on mount, then write text into it.

\`aria-live="polite"\` (equivalently \`role="status"\`) queues behind current speech and is
correct for almost everything: save confirmations, result counts, loading completion.
\`aria-live="assertive"\` (\`role="alert"\`) interrupts mid-word and is only for information
the user must act on immediately.

Other reasons regions go silent: the region is \`display: none\` (use a clip-based
visually-hidden class); the same string is written twice, which most screen readers suppress
as unchanged; or the whole subtree is replaced rather than its text mutated.

For validation errors, wire \`aria-describedby\` from the field to its message and move focus
to the first invalid field — more reliable than a summary the user cannot navigate to.

## 5. The WCAG 2.2 criteria component libraries actually fail

- **2.4.7 Focus Visible** (AA) — \`outline: none\` with no replacement. Removing the default
  ring obliges you to supply one on \`:focus-visible\`.
- **1.4.11 Non-text Contrast** (AA) — the focus ring, and boundaries such as input borders
  and unchecked checkboxes, need 3:1 against adjacent colours. A subtle grey border on
  white is a failure.
- **2.4.11 Focus Not Obscured (Minimum)** (AA, new in 2.2) — sticky headers and cookie bars
  covering the focused element. Add \`scroll-padding-top\` equal to the sticky header height.
- **2.5.8 Target Size (Minimum)** (AA, new in 2.2) — pointer targets must be at least
  24 by 24 CSS pixels, or spaced so 24px circles centred on them do not intersect.
  Icon-only buttons and table row actions are the usual offenders.
- **1.4.13 Content on Hover or Focus** (AA) — tooltips and hover cards must be
  **dismissible** with Escape without moving the pointer, **hoverable** (the pointer can
  travel into the bubble without it vanishing), and **persistent** until dismissed. A
  tooltip that disappears on mouseout of the trigger fails.
- **3.2.6 Consistent Help** (A, new in 2.2) — help affordances appear in the same relative
  order on every page that has them.

## 6. Test with a real screen reader

Automated engines check what is statically expressible in the DOM: missing alt text,
contrast of solid colours, invalid ARIA values, duplicate ids. They structurally cannot
evaluate whether focus went somewhere sensible, whether an announcement was comprehensible,
or whether the keyboard model matches the role advertised — which is where most real
defects live.

The minimum manual pass: unplug the mouse and operate the component end to end, then run it
with VoiceOver and Safari, or NVDA and Firefox. Nearly every serious defect surfaces in the
first two minutes.`,

    references: [
      {
        id: 'keyboard-contracts',
        title: 'Keyboard interaction contracts by pattern',
        answers:
          'Exactly which keys must do what, and which ARIA attributes are required, for each composite widget a component library ships?',
        content: `# Keyboard interaction contracts by pattern

Each contract below is the minimum a component must satisfy to be considered complete.
They follow the ARIA Authoring Practices patterns; where the APG marks a behaviour
optional, it is marked optional here. Implement the required set fully before adding
anything optional — a half-implemented pattern is worse than a plain list, because it
promises a keyboard model that does not exist.

---

## Dialog (modal)

**Structure**: \`role="dialog"\` with \`aria-modal="true"\`, named by \`aria-labelledby\`
pointing at the visible title (or \`aria-label\` if there is no visible title). Prefer the
native \`<dialog>\` element with \`showModal()\`, which supplies top-layer stacking,
background inertness, and focus restoration.

| Key | Behaviour |
| --- | --- |
| Escape | Closes the dialog. Required, including for dialogs with a Cancel button. |
| Tab | Moves to the next tabbable element inside the dialog; wraps from last to first. |
| Shift+Tab | Moves to the previous; wraps from first to last. |

**On open**: focus the first interactive control, or the heading with \`tabindex="-1"\` when
the dialog contains substantial reading content.
**On close**: focus returns to the invoking element.
**Alert dialogs** use \`role="alertdialog"\` and must be named and described; focus goes to
the least destructive action.

---

## Disclosure

**Structure**: a \`<button>\` with \`aria-expanded\` (\`true\`/\`false\`) and \`aria-controls\`
pointing at the region id. The region does not need a role. \`<details>\`/\`<summary>\` gives
this for free and should be the default choice.

| Key | Behaviour |
| --- | --- |
| Enter, Space | Toggles the region. |

Never place \`aria-expanded\` on the region — it belongs on the control. Do not set
\`aria-hidden\` on a collapsed region that is already \`display: none\`; that is redundant and
tends to get out of sync.

---

## Accordion

An accordion is a set of disclosures with shared headings. Each header is a \`<button>\`
wrapped in an \`<h2>\` (or the level appropriate to the document) so the panels appear in
the heading list. Panels get \`role="region"\` and \`aria-labelledby\` pointing at their
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

**Structure**: \`role="tablist"\` containing \`role="tab"\` elements, each with
\`aria-selected\` and \`aria-controls\`; each \`role="tabpanel"\` carries \`aria-labelledby\`
referencing its tab. Add \`aria-orientation="vertical"\` for vertical tab lists.

**Focus model**: roving tabindex. The selected tab has \`tabindex="0"\`, all other tabs
\`tabindex="-1"\`. This is what makes Tab enter the tab list at the selected tab and then
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

The tab panel should be focusable with \`tabindex="0"\` only if it contains no focusable
children, so keyboard users can reach its content.

---

## Menu button and menu

**Structure**: a \`<button>\` with \`aria-haspopup="true"\` and \`aria-expanded\`, controlling a
\`role="menu"\` containing \`role="menuitem"\` (or \`menuitemcheckbox\`/\`menuitemradio\`).

Use this pattern only for application-style command menus. A list of links to other pages
is a navigation list, not a menu — using \`role="menu"\` for site navigation makes the links
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

**Structure**: \`role="listbox"\` containing \`role="option"\` elements, each with
\`aria-selected\`. Multi-select listboxes carry \`aria-multiselectable="true"\`.

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

**Structure**: \`role="combobox"\` on the \`<input>\` itself, with \`aria-expanded\`,
\`aria-controls\` pointing at the popup, and \`aria-autocomplete\` set to \`none\`, \`list\`, or
\`both\`. The popup is usually a \`role="listbox"\`; if it is a grid, tree, or dialog instead,
add \`aria-haspopup\` naming it. Focus stays on the input; the active option is tracked with
\`aria-activedescendant\`.

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
\`aria-activedescendant\` does not move real focus, you must scroll the active option into
view and style it yourself — the browser will do neither.

---

## Tooltip

**Structure**: \`role="tooltip"\` on the bubble, referenced from the trigger by
\`aria-describedby\`. A tooltip supplements a name; it must never be the only source of one.

Triggers must be genuinely focusable elements. A tooltip on a \`<span>\` or on a
\`disabled\` button is unreachable by keyboard — wrap the disabled control, or use
\`aria-disabled\` with click suppression so the control stays focusable.

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

**Structure**: \`role="slider"\` on the thumb, with \`aria-valuenow\`, \`aria-valuemin\`,
\`aria-valuemax\`, \`tabindex="0"\`, and an accessible name. Add \`aria-valuetext\` whenever the
raw number is not what the user should hear ("Medium", "3 stars", "£4,500"), because a
screen reader will otherwise read "3" with no unit. Add \`aria-orientation="vertical"\` for
vertical sliders. \`<input type="range">\` gives all of this natively and should be preferred.

| Key | Behaviour |
| --- | --- |
| Right / Up Arrow | Increase by one step. |
| Left / Down Arrow | Decrease by one step. |
| Page Up / Page Down | Optional: increase/decrease by a larger step. |
| Home / End | Minimum / maximum. |

Multi-thumb sliders give each thumb its own \`role="slider"\`, its own name ("Minimum
price"), and constrain \`aria-valuemin\`/\`aria-valuemax\` to the other thumb's position.

---

## Tree view

**Structure**: \`role="tree"\` containing \`role="treeitem"\` elements; parent items carry
\`aria-expanded\` and their children live in a \`role="group"\`. Use \`aria-level\`,
\`aria-setsize\`, and \`aria-posinset\` when the DOM structure does not make the hierarchy
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
| \\* | Optional: expands all siblings at the current level. |

Roving tabindex is the right focus model here: the tree is one tab stop, and the currently
focused node holds \`tabindex="0"\`.`,
      },
      {
        id: 'focus-recipes',
        title: 'Focus management recipes',
        answers:
          'How do I actually implement a focus trap, restore focus safely, choose between roving tabindex and aria-activedescendant, and handle focus on route changes and deletions?',
        content: `# Focus management recipes

Focus is state. Treat it like any other state: know who owns it, know what changes it, and
know where it goes when the owner disappears.

---

## Recipe 1 — Modal focus trap

Prefer the platform. \`<dialog>\` with \`showModal()\` places the dialog in the top layer,
makes the rest of the document inert, routes Escape through a cancel event, and restores
focus to the previously focused element on close. That is the entire recipe, specified in
HTML, with no library.

When a custom implementation is unavoidable — because the design requires a non-native
stacking context, or animation on the backdrop that \`<dialog>\` complicates — the trap has
three parts:

**Make the outside inert.** Apply the \`inert\` attribute to every sibling of the dialog's
container (Baseline across browsers since 2023). \`inert\` removes the subtree from the tab
order, from hit testing, and from the accessibility tree in one attribute. It is strictly
better than the older approach of \`aria-hidden\` plus tabindex manipulation, which had to
be undone element by element and always leaked.

**Wrap Tab.** Query tabbable descendants on each Tab keydown rather than caching them at
open time — dialog contents change, and a cached list traps the user against a button that
no longer exists. The selector needs to cover \`a[href]\`, \`button\`, \`input\`, \`select\`,
\`textarea\`, \`[tabindex]\` not equal to -1, and \`[contenteditable]\`, then filter out
elements that are \`disabled\`, \`inert\`, \`hidden\`, or have zero client rects.

**Handle the empty case.** If the dialog contains no tabbable element, give the dialog
container \`tabindex="-1"\` and focus it, so Tab has somewhere to be.

---

## Recipe 2 — Initial focus placement

Pick by content, not by habit.

- **Short action dialogs** (confirm, rename): focus the first input, or the safe action.
  Never the destructive one.
- **Content-heavy dialogs** (terms, detail panes): focus the \`<h2>\` title with
  \`tabindex="-1"\`. The title is announced first, which orients the user before the
  controls arrive.
- **Forms with a single obvious field**: focus that field.
- **Menus and listboxes**: focus the currently selected item if there is one, otherwise the
  first item. Opening a country picker on "Afghanistan" when the value is "Norway" forces
  the user to navigate a distance the mouse user does not.

Never call \`.focus()\` on a hidden element or before the element is in the DOM. In React,
that means an effect after the open state commits, not inside the click handler.

---

## Recipe 3 — Restoring focus

Capture \`document.activeElement\` immediately before opening the overlay and restore it on
close, guarded three ways.

**Is it still connected?** \`node.isConnected\` — a row action button vanishes when the row
is deleted by the very dialog you are closing.
**Is it still focusable?** It may have become disabled while the dialog was open.
**Is it still visible?** A collapsed accordion panel may contain it.

When the original target is gone, walk outward: the container that held it, then the list,
then the page's main heading, each with \`tabindex="-1"\`. Do not let focus fall to
\`<body>\`; that returns a screen-reader user to the top of the document with no explanation
and is the single most common cause of "the modal closed and I got lost".

Use \`preventScroll: true\` when the restore target is off-screen and a jump would be
disorienting — but only after confirming the user can still find it.

---

## Recipe 4 — Roving tabindex

Use for tabs, toolbars, menus, radio groups, grids, and trees — anywhere the focused item
is a real, focusable element.

The invariant: **exactly one element in the group has \`tabindex="0"\`; all others have
\`tabindex="-1"\`.** On arrow key, update both the tabindex values and call \`.focus()\` on
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

The container (or input) has \`tabindex="0"\` and \`aria-activedescendant\` set to the id of
the active option. Options have ids and \`tabindex\` is not set on them at all.

Three obligations the browser will not fulfil for you:

1. **Scrolling.** Nothing moved, so nothing scrolls. Call
   \`option.scrollIntoView({ block: 'nearest' })\` on every change, or the active option
   walks out of the viewport and the component appears frozen.
2. **Styling.** \`:focus\` never matches the option. Style the active option from an explicit
   class or attribute selector, and give it a 3:1 contrast boundary — a background tint
   alone often fails SC 1.4.11.
3. **Validity.** \`aria-activedescendant\` must reference an id that exists in the DOM at
   that instant. Filtering a combobox list while the active id points at a removed option
   leaves the widget in an undefined state; reset it to the first remaining option or
   remove the attribute.

---

## Recipe 6 — Focus on route change

In a single-page app, navigation does not move focus, so a screen-reader user hears nothing
and a keyboard user's next Tab continues from the old page's link.

On each route commit, move focus to the new page's \`<h1>\` with \`tabindex="-1"\`, or to the
\`<main>\` element. That announces the page identity and resets the tab sequence to the top.
A polite live region announcing the new title is a weaker substitute — it says what
happened but does not fix the tab position.

Skip links are the same mechanism: the target of a skip link needs \`tabindex="-1"\`, or in
some browsers the fragment scrolls without focus following, and the next Tab returns to the
navigation the user just skipped.

---

## Recipe 7 — Focus after destructive actions

Deleting the item that holds focus is the most common way focus is lost silently.

Decide the successor **before** the removal: the next sibling, or the previous if the
deleted item was last, or the list container with \`tabindex="-1"\` if it is now empty.
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
4. In DevTools, run \`document.activeElement\` after each interaction. If it ever reports
   \`<body>\`, focus has been dropped.`,
      },
    ],
  },

  rules: [
    {
      id: 'accessible-components/native-element-first',
      strength: 'must',
      statement:
        'Use the native HTML element for any behaviour the platform already provides, and reach for ARIA only when no native equivalent exists.',
      evidence: {
        rationale:
          'Native interactive elements ship focusability, key handling, role, name computation, disabled semantics, forced-colors rendering, and mobile touch-exploration activation as one package that stays correct without maintenance. ARIA supplies only the announced role, so every other behaviour must be reimplemented and kept correct forever.',
        source: 'WAI-ARIA Authoring Practices, first rule of ARIA use',
        url: 'https://www.w3.org/TR/using-aria/',
        confidence: 'established',
      },
      examples: {
        language: 'tsx',
        bad: '<div className="btn" onClick={save}>Save</div>',
        good: '<button type="button" className="btn" onClick={save}>Save</button>',
      },
    },
    {
      id: 'accessible-components/no-handlers-on-generic-elements',
      strength: 'must-not',
      statement:
        'Do not attach click or key handlers to a div, span, or other non-interactive element in order to build a control.',
      evidence: {
        rationale:
          'A generic element is not in the tab sequence, has no role, does not respond to Enter or Space, and is not activated by the double-tap gesture mobile screen readers use, so the control is unreachable by keyboard and by touch exploration regardless of how it looks.',
        confidence: 'established',
      },
      exceptions: [
        'Container-level handlers that delegate to genuinely interactive descendants, where the descendant is the control.',
      ],
      verifiedBy: 'keyboard-sweep',
    },
    {
      id: 'accessible-components/full-pattern-contract',
      strength: 'must',
      statement:
        'When implementing an ARIA pattern, implement its complete keyboard contract, not a subset.',
      evidence: {
        rationale:
          'The announced role sets the user expectation. A user told they are in a menu will press Down Arrow, Escape, and Home; if only Enter is wired, the component is less usable than an unstyled list, because it has promised a model it does not honour.',
        confidence: 'established',
      },
      verifiedBy: 'keyboard-sweep',
    },
    {
      id: 'accessible-components/escape-closes',
      strength: 'must',
      statement:
        'Escape must dismiss any transient overlay — dialog, menu, popover, tooltip, combobox popup — and return focus to the element that opened it.',
      evidence: {
        rationale:
          'Escape is the only universally learned exit gesture, and for keyboard-only users an overlay with no keyboard dismissal is a trap. Returning focus to the trigger preserves the user position in the document, which is otherwise unrecoverable without spatial cues.',
        source: 'WCAG 2.2 SC 2.1.2 No Keyboard Trap',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html',
        confidence: 'established',
      },
    },
    {
      id: 'accessible-components/modal-focus-trap',
      strength: 'must',
      statement:
        'Trap Tab and Shift+Tab inside a modal dialog and make the background inert while it is open.',
      evidence: {
        rationale:
          'A modal asserts that nothing behind it is available. If focus escapes, the user operates controls they cannot see, with no indication of where they are, and the visible overlay makes the focused element impossible to locate.',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<div aria-hidden="true" id="app">…</div>\n<div role="dialog">…</div>',
        good: '<div inert id="app">…</div>\n<dialog aria-modal="true" aria-labelledby="t">…</dialog>',
      },
      verifiedBy: 'focus-review',
    },
    {
      id: 'accessible-components/restore-focus',
      strength: 'must',
      statement:
        'Restore focus to the invoking element when an overlay closes, falling back to a surviving ancestor if that element no longer exists.',
      evidence: {
        rationale:
          'When focus is not restored it defaults to document.body, which resets a screen reader virtual cursor to the top of the page and resets a keyboard user tab position to the first link. Neither user is told this happened, so the loss of place is silent.',
        confidence: 'established',
      },
      verifiedBy: 'focus-review',
    },
    {
      id: 'accessible-components/roving-tabindex-single-stop',
      strength: 'must',
      statement:
        'A composite widget must be a single tab stop, with exactly one descendant at tabindex="0" and all others at tabindex="-1".',
      evidence: {
        rationale:
          'Tab moves between widgets and arrow keys move within them. If every item is tabbable, a fifty-item tree costs fifty Tab presses to pass, and the arrow-key model the role advertises becomes redundant.',
        confidence: 'established',
      },
      exceptions: [
        'Lists of links or ordinary form fields, which are not composite widgets and correctly place each element in the tab sequence.',
      ],
      examples: {
        language: 'tsx',
        bad: 'tabs.map((t) => <button role="tab" key={t.id}>{t.label}</button>)',
        good: 'tabs.map((t) => <button role="tab" key={t.id} tabIndex={t.id === activeId ? 0 : -1}>{t.label}</button>)',
      },
      verifiedBy: 'keyboard-sweep',
    },
    {
      id: 'accessible-components/activedescendant-scroll-and-style',
      strength: 'must',
      statement:
        'When using aria-activedescendant, scroll the active option into view and style it explicitly, and keep the referenced id valid on every list change.',
      evidence: {
        rationale:
          'aria-activedescendant moves virtual focus only. No focus event fires, so the browser neither scrolls the option into view nor matches :focus against it, and a stale reference to a filtered-out option leaves the widget with no discoverable active item.',
        confidence: 'established',
      },
      examples: {
        language: 'ts',
        bad: "input.setAttribute('aria-activedescendant', option.id)",
        good: "input.setAttribute('aria-activedescendant', option.id)\noption.scrollIntoView({ block: 'nearest' })",
      },
    },
    {
      id: 'accessible-components/no-aria-hidden-on-focusable',
      strength: 'must-not',
      statement:
        'Never apply aria-hidden="true" to an element that is focusable or that contains focusable content.',
      evidence: {
        rationale:
          'aria-hidden removes an element from the accessibility tree but not from the tab sequence, producing an element a keyboard user can focus and a screen reader refuses to describe — silence with no way to recover context. Use inert, or remove the element, instead.',
        source: 'WAI-ARIA 1.2, aria-hidden',
        url: 'https://www.w3.org/TR/wai-aria-1.2/#aria-hidden',
        confidence: 'established',
      },
    },
    {
      id: 'accessible-components/visible-focus-indicator',
      strength: 'must',
      statement:
        'Every focusable element must show a focus indicator with at least 3:1 contrast against both the component and the adjacent background.',
      evidence: {
        rationale:
          'The focus indicator is the only signal a sighted keyboard user has for their position in the document. Removing the user-agent outline without replacing it makes the interface unusable without a mouse; an indicator below 3:1 is present in the DOM but not perceivable.',
        source: 'WCAG 2.2 SC 2.4.7 Focus Visible (AA) and SC 1.4.11 Non-text Contrast (AA)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.btn:focus { outline: none; }',
        good: '.btn:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }',
      },
      verifiedBy: 'wcag-component-sweep',
    },
    {
      id: 'accessible-components/focus-not-obscured',
      strength: 'must',
      statement:
        'Ensure a focused element is never entirely hidden behind sticky headers, footers, or floating panels.',
      evidence: {
        rationale:
          'Scrolling by focus does not account for author-created overlays, so a sticky header can cover the element the browser just scrolled to. Setting scroll-padding on the scroll container equal to the overlay height makes the browser reserve that space.',
        source: 'WCAG 2.2 SC 2.4.11 Focus Not Obscured (Minimum), Level AA',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: 'header { position: sticky; top: 0; height: 64px; }',
        good: 'header { position: sticky; top: 0; height: 64px; }\nhtml { scroll-padding-top: 64px; }',
      },
    },
    {
      id: 'accessible-components/target-size',
      strength: 'should',
      statement:
        'Give every pointer target a hit area of at least 24 by 24 CSS pixels, or space undersized targets so that 24px circles centred on them do not intersect.',
      evidence: {
        rationale:
          'Pointer accuracy varies with motor control, tremor, and input device. Below roughly 24 CSS pixels, mis-taps rise sharply and adjacent-target activation becomes likely, which is why the criterion permits spacing as an alternative to size.',
        source: 'WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
        confidence: 'established',
      },
      exceptions: [
        'Targets inline within a sentence, whose size is constrained by the line-height of surrounding text.',
        'Targets whose size is determined by the user agent and not modified by the author.',
        'An equivalent control meeting the size requirement exists elsewhere on the same page.',
      ],
    },
    {
      id: 'accessible-components/tooltip-hoverable-dismissible',
      strength: 'must',
      statement:
        'Content revealed on hover or focus must be dismissible with Escape, hoverable without disappearing, and persistent until dismissed or invalidated.',
      evidence: {
        rationale:
          'Screen magnifier users must move the pointer into the revealed content to read text that extends beyond their viewport; content that hides on mouseout of the trigger is unreadable to them, and content that cannot be dismissed can permanently obscure what is beneath it.',
        source: 'WCAG 2.2 SC 1.4.13 Content on Hover or Focus, Level AA',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html',
        confidence: 'established',
      },
      examples: {
        language: 'tsx',
        bad: '<span onMouseEnter={show} onMouseLeave={hide}>?</span>',
        good: '<button aria-describedby="tip" onMouseEnter={show} onMouseLeave={scheduleHide} onFocus={show} onBlur={hide}>?</button>',
      },
    },
    {
      id: 'accessible-components/label-in-name',
      strength: 'must',
      statement:
        'The accessible name of a control must contain its visible label text, in the same order.',
      evidence: {
        rationale:
          'Speech-input users issue commands by speaking the label they can see. When aria-label replaces rather than extends the visible text, the spoken command matches nothing, and the control becomes operable only by pointer.',
        source: 'WCAG 2.2 SC 2.5.3 Label in Name, Level A',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html',
        confidence: 'established',
      },
      examples: {
        language: 'tsx',
        bad: '<button aria-label="Submit your application">Send</button>',
        good: '<button aria-label="Send application">Send</button>',
      },
      verifiedBy: 'name-audit',
    },
    {
      id: 'accessible-components/no-aria-label-on-generic',
      strength: 'must-not',
      statement:
        'Do not rely on aria-label or aria-labelledby applied to a plain div or span with no role.',
      evidence: {
        rationale:
          'Naming is prohibited on elements mapped to the generic role, so browsers discard the attribute entirely. The markup looks labelled in review and is unnamed at runtime, which is why this failure survives code review reliably.',
        source: 'ARIA in HTML, naming prohibited roles',
        url: 'https://www.w3.org/TR/html-aria/',
        confidence: 'established',
      },
    },
    {
      id: 'accessible-components/live-region-pre-rendered',
      strength: 'must',
      statement:
        'Render a live region container into the DOM before the content it will announce changes, rather than inserting the region and its message together.',
      evidence: {
        rationale:
          'Assistive technology registers live regions when they enter the accessibility tree and then reports subsequent mutations. A region inserted in the same update as its text has no prior state to be compared against, so in most screen readers nothing is announced at all.',
        source: 'WAI-ARIA 1.2, live region attributes',
        url: 'https://www.w3.org/TR/wai-aria-1.2/#aria-live',
        confidence: 'established',
      },
      examples: {
        language: 'tsx',
        bad: '{message && <div role="status">{message}</div>}',
        good: '<div role="status" className="sr-only">{message}</div>',
      },
      verifiedBy: 'live-region-audit',
    },
    {
      id: 'accessible-components/assertive-sparingly',
      strength: 'should-not',
      statement:
        'Do not use aria-live="assertive" or role="alert" for routine confirmations, toasts, or progress updates.',
      evidence: {
        rationale:
          'Assertive regions interrupt speech in progress, discarding whatever the user was in the middle of hearing. Used for non-urgent updates, they make the interface unusable by repeatedly cutting off the content the user is trying to read.',
        confidence: 'established',
      },
      exceptions: [
        'Information requiring immediate action, such as a session about to expire or a failed submission that discards user input.',
      ],
    },
    {
      id: 'accessible-components/native-select-default',
      strength: 'should',
      statement:
        'Use a native select element for simple option lists, and build a custom listbox or combobox only when filtering, multi-column options, or rich option content is genuinely required.',
      evidence: {
        rationale:
          'A native select delegates rendering to the operating system, which supplies platform-correct touch, keyboard, typeahead, and screen-reader behaviour on every device, including mobile pickers that no custom implementation reproduces.',
        confidence: 'strong',
      },
      exceptions: ['Options requiring search, grouping with descriptions, images, or multi-select with tokens.'],
    },
    {
      id: 'accessible-components/error-association',
      strength: 'must',
      statement:
        'Associate validation messages with their field using aria-describedby, and set aria-invalid on the field when it is in error.',
      evidence: {
        rationale:
          'A screen reader reads a field name, role, value, and description on focus. An error rendered as a nearby paragraph is not part of that computation, so a user tabbing to the field hears no indication that anything is wrong.',
        source: 'WCAG 2.2 SC 3.3.1 Error Identification, Level A',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html',
        confidence: 'established',
      },
      examples: {
        language: 'tsx',
        bad: '<input id="email" />\n<p className="error">Enter a valid email</p>',
        good: '<input id="email" aria-invalid="true" aria-describedby="email-err" />\n<p id="email-err" className="error">Enter a valid email</p>',
      },
    },
    {
      id: 'accessible-components/manual-screen-reader-test',
      strength: 'must',
      statement:
        'Operate every new interactive component with the keyboard alone and with at least one screen reader before declaring it complete.',
      evidence: {
        rationale:
          'Automated rule engines evaluate statically expressible properties of the DOM. They cannot judge whether focus landed somewhere sensible, whether an announcement was comprehensible, or whether a keyboard model matches the role advertised — which is where the majority of component defects live.',
        confidence: 'strong',
      },
      verifiedBy: 'screen-reader-pass',
    },
  ],

  verification: [
    {
      id: 'keyboard-sweep',
      kind: 'self-review',
      description: 'Confirm the component satisfies its keyboard contract.',
      blocking: true,
      questions: [
        'Which ARIA pattern does this component claim to be, and have you implemented every required key in that pattern?',
        'Can every action performed with the mouse also be performed with the keyboard alone?',
        'Is the widget a single tab stop with arrow-key navigation inside it, or does Tab step through every item?',
        'Does Escape dismiss every transient layer this component can open?',
      ],
    },
    {
      id: 'focus-review',
      kind: 'self-review',
      description: 'Confirm focus is owned, trapped, and restored correctly.',
      blocking: true,
      questions: [
        'Where does focus go when this component opens, and why is that the right place?',
        'Can Tab or Shift+Tab escape an open modal to content behind it?',
        'Where does focus go when it closes, and what happens if that element was removed while it was open?',
        'After every interaction, would document.activeElement ever be body?',
        'If aria-activedescendant is used, is the active option scrolled into view and visibly styled?',
      ],
    },
    {
      id: 'name-audit',
      kind: 'self-review',
      description: 'Confirm every control is correctly named.',
      blocking: true,
      questions: [
        'Does every interactive element have a non-empty accessible name?',
        'For each aria-label, does the name begin with the visible label text?',
        'Does every aria-labelledby and aria-describedby reference an id that exists in the rendered DOM?',
        'Is any aria-label applied to a div or span that has no role?',
        'Do icon-only buttons have names describing the action rather than the icon?',
      ],
    },
    {
      id: 'live-region-audit',
      kind: 'self-review',
      description: 'Confirm dynamic changes are announced.',
      questions: [
        'Is the live region container present in the DOM before the first message is written into it?',
        'Is the region hidden with a clipping technique rather than display:none or visibility:hidden?',
        'Is anything assertive that is not genuinely urgent?',
        'If the same message can occur twice in a row, will the second occurrence be announced?',
      ],
    },
    {
      id: 'wcag-component-sweep',
      kind: 'self-review',
      description: 'Check the WCAG 2.2 criteria component libraries most often fail.',
      blocking: true,
      questions: [
        '2.4.7 and 1.4.11: does every focus indicator reach 3:1 against both the component and the surrounding background?',
        '2.4.11: can a sticky header or footer completely cover a focused element at any scroll position?',
        '2.5.8: is any pointer target smaller than 24 by 24 CSS pixels without qualifying spacing?',
        '1.4.13: is hover or focus content dismissible with Escape, hoverable, and free of timeouts?',
        '1.4.11: do input borders, unchecked control outlines, and meaningful icons reach 3:1?',
      ],
    },
    {
      id: 'screen-reader-pass',
      kind: 'self-review',
      description: 'Confirm a manual assistive-technology pass was performed.',
      questions: [
        'Was the component operated end to end with the keyboard only?',
        'Was it operated with a screen reader, and did the announced role match what it actually does?',
        'Was every state change — expansion, selection, error, completion — announced?',
        'Did the automated checker pass, and which categories of defect could it not have detected here?',
      ],
    },
    {
      id: 'axe-scan',
      kind: 'command',
      description:
        'Run the project accessibility linter or axe test suite. Passing is necessary but far from sufficient.',
      command: 'npm run test:a11y',
    },
  ],

  relatedSkills: ['design-judgment', 'form-design', 'motion-design', 'semantic-html'],
}
