# Design review report template

Copy this structure. Every section earns its place; a section with nothing in it should be
written as "None" rather than deleted, because an absent section reads as an unfinished
review rather than a clean result.

---

## Header

    Subject:   <page, screen, component, or PR under review>
    Revision:  <commit, branch, or file set reviewed>
    Method:    <rendered in browser at 1280px / source only / screenshot only>
    Reviewer:  <who or what performed the review>
    Date:      <ISO date>

**Method** is not bookkeeping. It bounds every claim in the report. A source-only review
cannot report a layout defect, and a reader who knows that will weight the findings
correctly.

---

## 1. Scope and limits

Two or three sentences. What was reviewed, what was deliberately excluded, and what could
not be verified with the access available.

> Reviewed the team settings screen at `app/settings/team/page.tsx` and its four child
> components, rendered at 320 / 768 / 1280px in Chromium. Server actions and the invite
> email template were out of scope. Motion could not be assessed because the animation
> library is loaded dynamically and did not initialise in the review build.

---

## 2. What is working

Three to five specific observations, each naming the thing and why it is good. Not
compliments — observations. This section exists because a report that finds only faults is
read as an attack and discounted whole, and because naming what is right prevents someone
from "fixing" it in the next revision.

> - Empty states are designed rather than defaulted; the zero-member state explains how to
>   invite someone and links to the action.
> - The table uses `font-variant-numeric: tabular-nums`, so the seat-count column does not
>   jitter as it updates.
> - Every surface colour resolves to a semantic token; there are no hard-coded backgrounds
>   anywhere in the four components.

---

## 3. Summary

A count by severity, then one line stating whether the subject is shippable.

    Blocker  2
    Major    4
    Minor    6
    Nit      3
    Preference  2

> Not shippable as-is. Both blockers are keyboard-accessibility defects in the role menu
> and are contained to one component.

The shippability line is the single most useful sentence in the report. Without it the
author must infer your overall judgment from the tone of the findings, and they will infer
it wrong.

---

## 4. Findings

Ordered: blockers first, then majors, then minors, then nits, then preferences. Within a
severity, shared components before single pages.

Each finding takes this shape:

    ### F-01 · Blocker · Defect · Keyboard
    **Location** RoleMenu.tsx:88 — role dropdown, open state
    **Observed** Focus is moved into the menu on open but never returned to the trigger on
                 close, and Escape does not close the menu. Tab from the last item moves
                 focus behind the still-open overlay.
    **Impact**   A keyboard user who opens the menu cannot leave it without reloading the
                 page. This is a trap under SC 2.1.2 and blocks the primary task of the
                 screen.
    **Change**   Close on Escape and on outside click; on close, call
                 `triggerRef.current?.focus()`. Constrain Tab to the menu while open, or
                 replace the custom menu with the primitive already used in AccountMenu.
    **Evidence** Reproduced at 1280px in Chromium, keyboard only.

Field discipline:

- **Location** must be resolvable without searching. File and line, or component plus the
  state it is in. "In the settings area" is not a location.
- **Observed** is fact, not interpretation. Include the measurement — the ratio, the pixel
  value, the millisecond count. If you did not measure it, say "appears to".
- **Impact** names who is harmed or what the system pays. A finding with no impact line is a
  finding whose severity you cannot defend.
- **Change** is the specific edit. If several fixes are legitimate, give the one you would
  make and note the alternative in a sentence.
- **Evidence** records how you know: viewport and browser, tool output, or "source
  inspection only".

The two classification tags are mandatory. **Defect** or **Preference**, and one of
**Blocker / Major / Minor / Nit**. A finding without both is not ready to be sent.

---

## 5. Unverified

Everything you suspect but could not confirm, each with what would settle it.

> - The virtualised member list may not announce row count changes to screen readers.
>   Needs testing with NVDA or VoiceOver.
> - Section spacing is set from a prop that resolves at runtime; the rendered value could
>   not be read from source.

Keeping suspicions here rather than in the findings list is what protects the credibility
of the findings list. One confidently-stated finding that turns out to be wrong causes the
author to re-open every other finding.

---

## 6. Patterns

Findings that recur are one finding, not many. Collapse them and say so.

> Six of the eleven spacing defects are the same defect: `gap-5` (20px) used where the
> scale defines 16px and 24px. Fixing the scale usage once resolves all six.

This section is usually the most valuable in the report, because it converts a list of
symptoms into a single change.

---

## 7. Preferences

Kept separate, and explicitly non-binding.

> The hero heading is set at the same size as the section headings below it. I would raise
> it a step, but the current setting is internally consistent and this is taste, not a
> defect. Close without reply if you disagree.
