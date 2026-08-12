# Checkpoint groups, high-risk patterns, fix discipline, and report discipline

The grading discipline in `grading-and-conformance` decides what a claim may say. This half decides
which criteria are worth exercising, in which order, and what happens to the result — the seven
checkpoint groups with their default grades, the widgets that defeat heuristics reliably enough that
guessing about them is a known error, which fixes may be applied directly, and the shape of a report
a reader can act on.

## 8. Checkpoint groups

Each group lists its criteria and the grade the group defaults to before you have specific
evidence.

### Keyboard and focus — default ● Verified

**2.1.1** keyboard operability, **2.1.2** no keyboard trap, **2.4.3** focus order, **2.4.7**
focus visible, **2.4.11** focus not obscured (minimum). These are the highest-value group
because they are almost entirely mechanical: press Tab, record what receives focus, check
whether the ring is visible and unclipped, check whether Escape and Shift+Tab release every
container. A defect here is reproducible on demand and rarely disputed.

2.4.11 has a mechanism worth stating: sticky headers, floating action bars, and cookie
banners overlay a focused element that has scrolled beneath them — the element still has
focus and the ring still renders, under the header, where the user cannot see it. Verify by
scrolling a focused control to the edge of each sticky region.

### Structure and semantics — default ● Verified with ◐ Flagged residue

**1.3.1** info and relationships, **1.3.2** meaningful sequence, **2.4.1** bypass blocks,
**2.4.6** headings and labels. Structural facts are verifiable: heading levels, landmark
presence, table header association, list markup, DOM order versus visual order. Whether a
heading is *descriptive* is a judgement — "Section 2" is a heading, and whether it describes
its section is not a fact you can query. Verify the structure, flag the wording.

### Names, roles, states — default ● Verified, with one exception

**4.1.2** name role value, **2.5.3** label in name, **4.1.3** status messages. Accessible
names, roles, and exposed states are all directly readable from the accessibility tree, and
2.5.3 is a string comparison between the visible label and the accessible name.

The exception is 4.1.3. That an `aria-live` region is **present**, has a valid politeness
value, and exists in the DOM before content is inserted into it — verifiable. That it
**actually announces**, at a useful moment, without being interrupted or swallowed, and
without flooding the user during rapid updates — human-required. Report the presence as
Verified and the announcement as a handoff. A region marked `aria-live="polite"` that is
created and populated in the same frame typically announces nothing at all in several screen
readers, and only a human listening will catch that.

### Visual adaptation — mixed

**1.4.4** resize text to 200%, **1.4.10** reflow at **320 CSS px** width without
two-dimensional scrolling, **1.4.12** text spacing, **1.4.11** non-text contrast at **3:1**,
**1.4.1** use of colour, **2.3.3** animation from interactions. Reflow and text spacing are
Verified by applying the override and observing clipping, overlap, or a horizontal scrollbar.
Contrast ratios are computed values and Verified when both foreground and background are
resolvable. They become Flagged when the background is a gradient, an image, a
`backdrop-filter`, or a semi-transparent layer over unknown content, because there is no
single background colour to measure — say which pixel region you sampled.

1.4.1 is Flagged by default, for the reason worked through in section 7.

### Forms and errors — mixed

**3.3.1** error identification, **3.3.2** labels or instructions, **3.3.3** error suggestion,
**1.3.5** identify input purpose, **3.3.7** redundant entry, **3.3.8** accessible
authentication (minimum). The **association** is verifiable: does the error message have an
id referenced by `aria-describedby` on the invalid field, is `aria-invalid` set, is the field
labelled. Whether the message actually **supports recovery** — whether "Invalid input" tells
a user what to change — is a human judgement, and it is the part that determines whether the
form is usable.

1.3.5 is verified by checking `autocomplete` tokens against the field's actual purpose. For
3.3.8, the presence of a cognitive function test is verifiable; whether an exception applies
is a judgement.

### Pointer and target — default ● Verified

**2.5.7** dragging movements, **2.5.8** target size (minimum) at **24×24 CSS px**, **2.5.1**
pointer gestures. Target size is measured from the bounding box, with the spacing exception
applying when undersized targets are separated by enough clear space that a 24 px circle
centred on each intersects no other target. Measure it; do not eyeball it. 2.5.7 and 2.5.1
require identifying whether a single-pointer or non-path-based alternative exists for each
drag or gesture, which is verifiable by attempting the alternative.

### Media and timing — mixed

**2.2.1** timing adjustable, **2.2.2** pause stop hide. Session timeouts, auto-advancing
carousels, and auto-playing motion longer than 5 seconds all fall here. The presence of a
pause control is verifiable. Whether a timeout warning gives sufficient time and is
announced is human-required.

---

## 9. High-risk patterns

Certain widgets defeat heuristics reliably enough that guessing about them is a known error
rather than a risk. Drag-and-drop interfaces, rich-text editors, tree views, data grids,
custom comboboxes and menus, carousels, and any interface built around toasts or frequent
live-region updates all belong here. What they share is that correctness depends on a
*keyboard interaction contract over time* — which key does what in which state, and what
gets announced when — and none of that is visible in a static snapshot of the DOM.

The procedure for each:

1. **Name the pattern** from the WAI-ARIA Authoring Practices Guide. "This is a combobox with
   a listbox popup" fixes the contract before any judgement is made.
2. **State the contract it owes** — the required roles and relationships, the required
   `aria-expanded` / `aria-activedescendant` / `aria-selected` state management, and the
   expected key bindings.
3. **Verify what is verifiable** — role names, relationship attributes, focus movement on
   each key press, state attribute values after each interaction. This is often most of the
   contract.
4. **Hand off the rest** as Human-required, with the specific steps. For a combobox: whether
   the filtered option count is announced as the user types, and whether the selected option
   is announced on arrow navigation without the user losing their typed text.

A counter-example: a review reports "the data grid is accessible — it has `role="grid"`,
`aria-rowcount`, and every cell has `role="gridcell"`". All true, all verifiable, and the grid
is unusable: arrow keys scroll the page instead of moving the cell cursor, and no cell is ever
reachable by keyboard. The roles were verified; the contract was not.

---

## 10. Fix discipline

**Apply mechanical fixes directly.** A missing `type="button"`, a `<div onclick>` that should
be a `<button>`, a missing `lang` attribute on `<html>`, a form control whose `<label>` has no
`for`, a heading level skipped from `h2` to `h4` — these have one correct answer that does not
depend on knowing what the interface means.

**Leave a TODO with the criterion number for contextual or visual fixes.** Alt text, link
text, error message wording, colour value changes, and focus order restructuring all require
knowing intent. Format: `TODO(a11y 1.1.1): image has no alt text; author must supply
description or mark decorative`.

**Do not invent alt text, labels, or link text.** Invented content passes the automated check
while still failing the user, and it *removes the signal that a problem exists*. An image
given `alt="image"`, or `alt=""` applied to a non-decorative image, is worse than one with no
alt attribute at all, because the linter now reports zero violations and nobody will look
again. An open TODO is a smaller problem than a closed one that was never solved.

**Confirm scope before editing** beyond the obvious target, or before applying more than
about ten mechanical fixes in one pass. A review that quietly rewrites forty files is no
longer a review, and the reader cannot separate your accessibility changes from their own
pending work.

**If verification fails, report it and stop.** When a fix does not produce the expected tree
state, say so and hand it back. Do not iterate silently through variations — an undisclosed
sequence of four attempts leaves the codebase in a state nobody can reason about, and the
reader believes the fix worked.

---

## 11. Report discipline

The ledger is **counts and bare criterion numbers**. Prose in the ledger is the single
largest source of unreadable accessibility reports, because a reader scanning for the
Critical items has to read past four paragraphs of context to find them.

**Group undetermined criteria by shared reason**, one clause per group: "Not exercised — no
screen reader available in this environment: 1.3.2, 2.4.3, 4.1.3." One line per undetermined
criterion produces thirty lines saying the same thing thirty times, and the reader stops
reading at line six.

**Passes get at most one sentence in total**, for the whole report: "17 criteria verified
conforming across the sampled pages." A per-criterion celebration of things that are fine
buries the things that are not. If the reader needs the detail, it belongs in an appendix or
a machine-readable artefact, not in the body.

**The words go to failures, flags, and handoffs** — the entries a reader can act on. Every
failure gets its selector, its interaction, its observed fact, and its severity. Every flag
gets its one-sentence opinion and its one-sentence confirmation request. Every handoff gets
its runnable steps. Everything else is compressed.

State the **method line** first: scan or audit, scope, conformance target, assistive-
technology baseline, coverage ceiling. Four lines that prevent every subsequent misreading.

---

---

## Pass conditions

- For each high-risk widget encountered, is the WAI-ARIA Authoring Practices pattern named and its keyboard and ARIA contract stated?
- Were only mechanical fixes applied directly, with contextual and visual ones left as `TODO(a11y <criterion>)`, and no invented alt text, label text, or link text in the diff?
- Was scope confirmed before editing beyond the named target or before more than ten mechanical fixes, and was any failed verification reported rather than silently retried?
- Are undetermined criteria grouped by shared reason, one clause per group rather than one line per criterion?
- Do passing criteria occupy no more than one sentence in the whole report?
