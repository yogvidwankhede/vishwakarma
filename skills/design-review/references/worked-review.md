# A worked review, from blocker to nit

The subject: a "Team members" settings screen. A table of members with name, email, role and
last-active columns, a search field, an "Invite member" button, and a per-row role dropdown.
Reviewed rendered in a browser, so visual and keyboard claims are admissible.

The point is calibration. Read the findings as a set and notice the distance between a
blocker and a nit — that distance is the whole value of a severity scale, and it collapses
the moment a reviewer promotes an irritation to Major.

---

## Scope and limits

Reviewed `app/settings/team/` — the page and five components — rendered at 320 / 768 /
1280px and at 400% zoom, Chromium, keyboard and pointer. Invite email and server actions
out of scope. No screen reader available, so announcement behaviour is unverified.

## What is working

- The loading skeleton row matches the exact height of a real row, so the table does not
  shift when data arrives. That is only ever done deliberately.
- Role changes are optimistic with a visible rollback, and the error names the failing row.
- Every colour in the five components resolves through a semantic token: adherence is
  effectively 100% for colour.

## Summary

Blocker 1, Major 3, Minor 3, Nit 2, Preference 1. Not shippable: the blocker excludes
keyboard users from the screen's only destructive action.

---

## F-01 · Blocker · Defect · Keyboard

**Location** `RowActions.tsx:52` — the per-row overflow menu containing "Remove member".

**Observed** The menu opens on click and on Enter, but the trigger is a `<div>` with an
`onClick` handler and no `tabindex`, so it never receives focus from Tab. The Remove
action exists only inside this menu.

**Impact** A keyboard-only user cannot remove a team member at all. This is the single
destructive operation on the screen and it is unreachable — a failure of SC 2.1.1, and a
functional exclusion rather than an inconvenience.

**Change** Replace the `<div>` with a `<button type="button">` carrying
`aria-haspopup="menu"` and `aria-expanded`. The styling is already class-based, so this
is a tag change plus `appearance: none`.

**Evidence** Tab traversal at 1280px, Chromium 138.

---

## F-02 · Major · Defect · Contrast

**Location** `MemberTable.tsx:96` — the "last active" column.

**Observed** `#9aa0a6` on `#ffffff`: 2.6:1, at 13px, so the large-text allowance does
not apply.

**Impact** Below the 4.5:1 of SC 1.4.3. This column is how an administrator decides whom to
deprovision, so it is not decorative metadata.

**Change** Use `var(--color-fg-muted)` (5.1:1 here). If the column must recede further,
hide it behind a toggle rather than dim it below threshold.

---

## F-03 · Major · Defect · Content stress

**Location** `MemberTable.tsx:71` — the name cell.

**Observed** With a 46-character name (tested: a hyphenated double-barrelled name with a
title), the cell does not wrap or truncate; the table widens and the viewport scrolls
horizontally from 320px through 900px.

**Impact** Horizontal scrolling of the page at 320px fails SC 1.4.10. Real name data will
trigger this within the first hundred accounts.

**Change** Give the name cell `min-width: 0` and the text
`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`. Better still, wrap to
two lines and let the row grow, since row height is not load-bearing here.

---

## F-04 · Major · Defect · System violation

**Location** `InviteButton.tsx:14`, `SearchField.tsx:22`, `RowActions.tsx:31`.

**Observed** Three button implementations. Two use the shared `Button`; `RowActions`
re-implements it locally, with a focus ring of `outline: 1px dotted` where the system uses
a 2px solid ring at 2px offset.

**Impact** The focus ring divergence is an accessibility regression, and the duplicate
guarantees the next system-wide change misses this component.

**Change** Use `<Button variant="ghost" size="sm">`. If the shared component lacks an
icon-only mode, add it there rather than forking here.

---

## F-05 · Minor · Defect · Spacing scale

**Location** `TeamPage.tsx:38`. `gap-5` (20px) sits between the header block and the
table. The scale defines 16px and 24px; 20px is on it nowhere and appears nowhere else in
the codebase. No user notices — the scale erodes one exception at a time. Use `gap-6`.

---

## F-06 · Minor · Defect · Target size

**Location** `RowActions.tsx:52`. The overflow trigger is 20 by 20 CSS pixels with no
spacing exception, below the 24 by 24 minimum of SC 2.5.8 (AA). Rows are 44px tall, so
there is room: set the hit area to 32 by 32 with padding, keeping the 20px glyph.

---

## F-07 · Minor · Defect · Motion

**Location** `MemberRow.tsx:19`.

**Observed** Row removal animates `height` from its measured value to 0 over 240ms.

**Impact** Animating `height` forces layout on every frame for every row below the removed
one. On a 200-row list this drops frames visibly.

**Change** Animate `grid-template-rows` from `1fr` to `0fr` on a wrapper, or
`transform: scaleY()` with `transform-origin: top`.

---

## F-08 · Nit · Defect · Typography

**Location** `TeamPage.tsx:31` — the page heading at 30px with letter-spacing at the
default 0. Slightly loose at display size; nobody will ever report it. Set
`letter-spacing: -0.02em`.

---

## F-09 · Nit · Defect · Copy

**Location** `EmptyState.tsx:9` — "No members found." The empty state for an active
search is identical to the one for an empty team. Distinguish them: "No members match
'acme'" with a clear-search action, versus the existing invite prompt.

---

## P-01 · Preference

The search field sits above the table, left-aligned under the heading. I would put it
inline with the "Invite member" button to recover a row of vertical space and pair the two
controls that act on the table. The current arrangement is internally consistent and
follows the pattern used on the billing screen, so this is taste. Close it without reply if
you prefer the existing layout.

---

## Unverified

- Whether the optimistic role change announces its rollback to assistive technology. Needs
  a screen reader.
- Whether the table announces filtered result counts on search. Needs a screen reader.
- Print styles were not assessed.

## Patterns

F-04 and F-06 are the same underlying cause: `RowActions` was written outside the design
system. Migrating it to the shared `Button` resolves both and prevents the class of defect
recurring.
