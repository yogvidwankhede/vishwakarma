// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Reviewing is a different skill from building, and it fails differently.
 *
 * A builder's failure is a bad decision. A reviewer's failure is a *report nobody can act
 * on* — either because every finding carries the same weight, so the author triages by
 * fatigue, or because the findings are gestures ("the spacing feels off") that hand the
 * diagnostic work straight back to the person who already could not see the problem.
 *
 * This skill treats a review as an artefact with a shape: passes that are run separately
 * because each suppresses what the next one needs, findings with four mandatory parts, a
 * severity ladder that is only useful if it is defended, and an explicit split between what
 * is a defect and what is merely the reviewer's taste. The last one is doing most of the
 * work. A review that never distinguishes the two gets all of its findings discounted at
 * the same rate, which is to say the accessibility bug ships alongside the disagreement
 * about the hero.
 */
export const designReview: SkillManifest = {
  vsm: '1.0',
  id: 'design-review',
  name: 'Design Review',
  description:
    'Use when reviewing, critiquing, or auditing an interface — yours or someone else’s — to produce prioritised, actionable findings.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'workflow',
  tags: ['review', 'critique', 'audit', 'quality', 'feedback', 'severity', 'process'],

  activation: {
    intents: [
      'the user asks for a review, critique, audit, or second opinion on an interface',
      'the user asks what is wrong with a screen, page, or component',
      'the user asks whether an interface is ready to ship',
      'critiquing UI you have just generated, before reporting it as finished',
      'auditing a design system for internal consistency or token adherence',
      'assessing a screenshot, mockup, or pull request that changes visible interface',
      'the user says something looks off, generic, or unpolished and wants to know why',
    ],
    globs: [
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/components/**',
      '**/*.css',
      '**/*.scss',
    ],
    keywords: [
      'review',
      'critique',
      'audit',
      'feedback',
      'what is wrong',
      'looks off',
      'ready to ship',
      'design review',
      'second opinion',
    ],
  },

  content: {
    summary:
      'Critique an interface through seven separate passes, separate defects from preferences, rank findings by user harm before system violation before taste, and write each one with a location, a measurement, a consequence, and an exact change.',

    body: `# Design Review

A review is engineering output, not a reaction. Its worth is measured in defects actually
fixed, and a finding too vague to act on is fixed at a rate near zero. Two failure modes
account for most bad reviews: the undifferentiated wall, where forty complaints carry equal
weight so the author triages by fatigue, and the gesture — "the spacing feels off" — which
hands the diagnosis back to the person who could not see the problem.

---

## 1. Defect or preference — say which

Classify every finding before writing it. A **defect** violates something outside your
opinion: a specification, a stated system rule, or a measurable harm. "The focus ring
scores 1.6:1 against the button" is a defect — SC 2.4.7 exists and the number is checkable. A **preference** rests on your taste alone: "I would give the hero
more room." It may well be right. It is still a preference.

The test: if you cannot name the evidence that would prove you wrong, it is a preference.

Label each finding explicitly. An author who cannot tell which findings are binding either
treats all of them as binding and resents the review, or none of them and ships the
contrast bug. Marking preferences as preferences is what buys the defects their authority.

---

## 2. The seven passes

Run them in order and separately. Each pass suppresses what the next one needs, so a single
combined sweep catches nothing thoroughly.

**Squint — hierarchy.** Blur until type is unreadable and note the order shapes emerge in.
Compare that to the content's real ranking. Report: no focal point; the wrong element
dominating; two elements tied at rank one; decoration outweighing the primary action.

**Measure — system adherence.** Stop looking; read values. Extract every distinct spacing,
font size, radius, weight and colour. Report near-misses (20px beside 24px reads as a bug),
values absent from the scale, and section-to-element separation below 3:1.

**Contrast — accessibility.** Text pairs against 4.5:1, 3:1 for large text, including the
ones routinely skipped: hover and selected backgrounds, placeholder text, disabled
controls, text over imagery. Then non-text at 3:1 under SC 1.4.11 — input borders, switch
tracks, unchecked boxes, icon-only buttons, chart edges — and the focus ring against both
the component and the page behind it.

**Content stress.** Triple every string; empty every collection; fill one with 200 rows;
remove every image; set a count to 999,999; try a name with no spaces. Report what
overflows, clips, wraps and shifts the layout, or leaves a bare rectangle unexplained.

**Viewport sweep.** 320px, 768px, 1280px, and 400% zoom at 1280px, which SC 1.4.10 treats
as equivalent to the 320px case. Report horizontal scrolling, sticky headers eating the
viewport at zoom, and pointer targets under 24 by 24 CSS pixels (SC 2.5.8, AA).

**Keyboard.** Tab the whole surface. Report unreachable controls, focus order diverging
from visual order, invisible focus at any stop, focus obscured by a sticky element
(SC 2.4.11), modals that neither trap nor restore focus, and anything Escape fails to close.

**Motion.** Enable \`prefers-reduced-motion\` and confirm spatial movement stops while state
changes stay legible. Report animation on \`width\`, \`height\`, \`top\` or \`left\`;
durations over 600ms; infinite loops outside a pending state; one scroll-entrance on
everything.

---

## 3. Priority: harm, then system, then taste

Order findings by the cost of not fixing them.

**Tier 1 — user harm.** Someone is blocked, misled, or excluded: keyboard traps, invisible
focus, contrast failures, destructive actions without confirmation, data lost on error,
text overflowing into illegibility.

**Tier 2 — system violation.** It works, but diverges from the codebase's own rules:
hard-coded colours beside tokens, a one-off spacing value, a duplicated component, an API
shaped unlike its siblings. These cost nothing today and compound forever, which is exactly
why nobody raises them.

**Tier 3 — craft and taste.** Hierarchy, rhythm, typographic fit, composition. Real, and
last, because a beautiful screen nobody can operate by keyboard is worse than a plain one
they can.

Within a tier, order by breadth: the same defect in a shared component outranks it on one
page.

---

## 4. Severity, calibrated

Four labels, and hold the line on each. **Blocker** — ships broken or excludes users.
**Major** — works, but a real user meets friction or the codebase takes on lasting cost.
**Minor** — noticeable, cheap, nobody is harmed. **Nit** — genuinely optional; the author
may close it unfixed without replying.

A review where a third of the findings are blockers has no severity signal left. If the
list runs long, cap tier 3 at the five that matter most; the rest is noise.

---

## 5. Anatomy of a finding

Four parts, always: **location** (file and line, or component and state), **observed
behaviour** stated as fact, **why it is a problem** in terms of user or system cost, and
**the exact change**.

Weak: *"Buttons look inconsistent and the spacing is off in places."*

Strong: *"[Defect · Major] \`PricingCard.tsx:41\` — the secondary button renders \`#8b8b8b\`
text on \`#f5f5f5\`, a ratio of 2.9:1, below the 4.5:1 of SC 1.4.3. Readers with reduced
contrast sensitivity cannot read the fallback action. Replace with
\`var(--color-fg-muted)\`, which resolves to 5.2:1 on this surface."*

The difference is not length. The weak version gives no location, no measurement, no
consequence and no change, so acting on it means redoing the review.

---

## 6. Reviewing generated output

Generated interfaces fail structurally rather than randomly, so check the signature
directly: gradient-filled heading text; exactly three equal cards under a centred heading;
emoji standing in for icons; one radius and one shadow everywhere; every section at the same
max-width; the violet-to-cyan palette; blur blobs behind the hero; a subtitle restating the
heading; invented testimonials; the same fade-up on every element; only the happy path built.

State the meta-finding plainly: uniformity is the diagnosis. Where every value is identical,
no decision was made, and the correction is ranking, not polish.

---

## 7. Reviewing what you cannot run

Say so once, at the top. Then review what the source proves: contrast between literal
colour values, tokens versus hard-coded values, semantic markup and ARIA usage, focus
management inside modal code, which properties are animated, and whether empty, loading and
error branches exist at all. Mark anything needing rendered layout as *unverified —
requires a running build*, and never assert a defect you have not seen.

---

## 8. Reviewing a design system

Consistency here is countable. Report the **token adherence rate** — styled properties
resolving to a token over total styled properties — and list every one-off value beside its
nearest token. Report **API drift**: the same concept named \`variant\`, \`kind\` and
\`type\` across three components; \`isDisabled\` beside \`disabled\`; \`onChange\` handing
back a value in one place and an event in another. Report duplicates, and name which one is
canonical.

---

## 9. The review is read by a person

Open with what is working, specifically. "The empty states are designed, which is rare"
costs one line and changes how everything after it lands. A review that finds only faults
gets discounted wholesale, because the author correctly infers you were not looking for
anything else.

Then critique the artefact, never the author. "This component re-renders the entire list on
every keystroke" is about code. "You clearly didn't think about performance" is about a
person, and it converts a fixable defect into a dispute. Describe what you observed rather
than what you assume was intended, and where you are guessing, say you are guessing.`,

    references: [
      {
        id: 'report-template',
        title: 'Design review report template',
        answers:
          'What is the exact structure and section-by-section format of a written design review report?',
        content: `# Design review report template

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

> Reviewed the team settings screen at \`app/settings/team/page.tsx\` and its four child
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
> - The table uses \`font-variant-numeric: tabular-nums\`, so the seat-count column does not
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
                 \`triggerRef.current?.focus()\`. Constrain Tab to the menu while open, or
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

> Six of the eleven spacing defects are the same defect: \`gap-5\` (20px) used where the
> scale defines 16px and 24px. Fixing the scale usage once resolves all six.

This section is usually the most valuable in the report, because it converts a list of
symptoms into a single change.

---

## 7. Preferences

Kept separate, and explicitly non-binding.

> The hero heading is set at the same size as the section headings below it. I would raise
> it a step, but the current setting is internally consistent and this is taste, not a
> defect. Close without reply if you disagree.`,
      },
      {
        id: 'worked-review',
        title: 'A worked review, from blocker to nit',
        answers:
          'What does a complete, well-calibrated review actually look like — with real findings at every severity level and a preference kept separate?',
        content: `# A worked review, from blocker to nit

The subject: a "Team members" settings screen. A table of members with name, email, role and
last-active columns, a search field, an "Invite member" button, and a per-row role dropdown.
Reviewed rendered in a browser, so visual and keyboard claims are admissible.

The point is calibration. Read the findings as a set and notice the distance between a
blocker and a nit — that distance is the whole value of a severity scale, and it collapses
the moment a reviewer promotes an irritation to Major.

---

## Scope and limits

Reviewed \`app/settings/team/\` — the page and five components — rendered at 320 / 768 /
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

**Location** \`RowActions.tsx:52\` — the per-row overflow menu containing "Remove member".

**Observed** The menu opens on click and on Enter, but the trigger is a \`<div>\` with an
\`onClick\` handler and no \`tabindex\`, so it never receives focus from Tab. The Remove
action exists only inside this menu.

**Impact** A keyboard-only user cannot remove a team member at all. This is the single
destructive operation on the screen and it is unreachable — a failure of SC 2.1.1, and a
functional exclusion rather than an inconvenience.

**Change** Replace the \`<div>\` with a \`<button type="button">\` carrying
\`aria-haspopup="menu"\` and \`aria-expanded\`. The styling is already class-based, so this
is a tag change plus \`appearance: none\`.

**Evidence** Tab traversal at 1280px, Chromium 138.

---

## F-02 · Major · Defect · Contrast

**Location** \`MemberTable.tsx:96\` — the "last active" column.

**Observed** \`#9aa0a6\` on \`#ffffff\`: 2.6:1, at 13px, so the large-text allowance does
not apply.

**Impact** Below the 4.5:1 of SC 1.4.3. This column is how an administrator decides whom to
deprovision, so it is not decorative metadata.

**Change** Use \`var(--color-fg-muted)\` (5.1:1 here). If the column must recede further,
hide it behind a toggle rather than dim it below threshold.

---

## F-03 · Major · Defect · Content stress

**Location** \`MemberTable.tsx:71\` — the name cell.

**Observed** With a 46-character name (tested: a hyphenated double-barrelled name with a
title), the cell does not wrap or truncate; the table widens and the viewport scrolls
horizontally from 320px through 900px.

**Impact** Horizontal scrolling of the page at 320px fails SC 1.4.10. Real name data will
trigger this within the first hundred accounts.

**Change** Give the name cell \`min-width: 0\` and the text
\`overflow: hidden; text-overflow: ellipsis; white-space: nowrap\`. Better still, wrap to
two lines and let the row grow, since row height is not load-bearing here.

---

## F-04 · Major · Defect · System violation

**Location** \`InviteButton.tsx:14\`, \`SearchField.tsx:22\`, \`RowActions.tsx:31\`.

**Observed** Three button implementations. Two use the shared \`Button\`; \`RowActions\`
re-implements it locally, with a focus ring of \`outline: 1px dotted\` where the system uses
a 2px solid ring at 2px offset.

**Impact** The focus ring divergence is an accessibility regression, and the duplicate
guarantees the next system-wide change misses this component.

**Change** Use \`<Button variant="ghost" size="sm">\`. If the shared component lacks an
icon-only mode, add it there rather than forking here.

---

## F-05 · Minor · Defect · Spacing scale

**Location** \`TeamPage.tsx:38\`. \`gap-5\` (20px) sits between the header block and the
table. The scale defines 16px and 24px; 20px is on it nowhere and appears nowhere else in
the codebase. No user notices — the scale erodes one exception at a time. Use \`gap-6\`.

---

## F-06 · Minor · Defect · Target size

**Location** \`RowActions.tsx:52\`. The overflow trigger is 20 by 20 CSS pixels with no
spacing exception, below the 24 by 24 minimum of SC 2.5.8 (AA). Rows are 44px tall, so
there is room: set the hit area to 32 by 32 with padding, keeping the 20px glyph.

---

## F-07 · Minor · Defect · Motion

**Location** \`MemberRow.tsx:19\`.

**Observed** Row removal animates \`height\` from its measured value to 0 over 240ms.

**Impact** Animating \`height\` forces layout on every frame for every row below the removed
one. On a 200-row list this drops frames visibly.

**Change** Animate \`grid-template-rows\` from \`1fr\` to \`0fr\` on a wrapper, or
\`transform: scaleY()\` with \`transform-origin: top\`.

---

## F-08 · Nit · Defect · Typography

**Location** \`TeamPage.tsx:31\` — the page heading at 30px with letter-spacing at the
default 0. Slightly loose at display size; nobody will ever report it. Set
\`letter-spacing: -0.02em\`.

---

## F-09 · Nit · Defect · Copy

**Location** \`EmptyState.tsx:9\` — "No members found." The empty state for an active
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

F-04 and F-06 are the same underlying cause: \`RowActions\` was written outside the design
system. Migrating it to the shared \`Button\` resolves both and prevents the class of defect
recurring.`,
      },
    ],
  },

  rules: [
    {
      id: 'design-review/label-defect-or-preference',
      strength: 'must',
      statement:
        'Label every finding as either a defect (grounded in a spec, a stated system rule, or a measurable harm) or a preference (grounded in reviewer taste).',
      evidence: {
        rationale:
          'An author cannot act correctly on a mixed list, because the cost of ignoring a finding differs by an order of magnitude between the two kinds. Without the label they apply one policy to everything — usually discounting the whole review, which means the defects ship alongside the disagreements.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: '- The secondary button text is too light and the hero could use more room.',
        good: '- [Defect] Secondary button text is 2.9:1, below SC 1.4.3.\n- [Preference] I would give the hero more vertical room; current spacing is internally consistent.',
      },
      verifiedBy: 'finding-quality',
    },
    {
      id: 'design-review/finding-anatomy',
      strength: 'must',
      statement:
        'Give every finding a resolvable location, the observed behaviour stated as fact, the user or system cost, and the exact change to make.',
      evidence: {
        rationale:
          'Each missing part transfers work back to the author: no location means they must search, no observation means they must reproduce, no cost means they cannot prioritise, and no change means they must redesign the fix you already have in mind. A finding missing any of the four is reliably deferred.',
        confidence: 'strong',
      },
      verifiedBy: 'finding-quality',
    },
    {
      id: 'design-review/harm-before-taste',
      strength: 'must',
      statement:
        'Order findings by user harm first, then system violations, then craft and taste — never by the order in which you noticed them.',
      evidence: {
        rationale:
          'Reviews are read top-down and acted on until attention runs out, so ordering determines what actually gets fixed. Notice-order correlates with visual salience, which is the inverse of severity: contrast and keyboard defects are invisible to a sighted mouse user and surface late.',
        confidence: 'strong',
      },
      verifiedBy: 'priority-order',
    },
    {
      id: 'design-review/quote-measurements',
      strength: 'must',
      statement:
        'State the measured value — contrast ratio, pixel size, millisecond duration, character count — for any finding where a number exists, rather than describing the problem qualitatively.',
      evidence: {
        rationale:
          'A number converts a finding from a claim into a check the author can repeat, which removes the argument entirely. It also forces the reviewer to verify before reporting: "the text looks light" survives no measurement, while "2.9:1 against #f5f5f5" either holds or is withdrawn.',
        confidence: 'strong',
      },
      verifiedBy: 'finding-quality',
    },
    {
      id: 'design-review/no-unverified-visual-claims',
      strength: 'must-not',
      statement:
        'Do not assert a rendered-layout defect that you have not actually observed; record it in an unverified section with what would confirm it.',
      evidence: {
        rationale:
          'Layout is the product of the whole cascade, container size, font metrics and content, none of which are determinable from a single source file. One confidently stated finding that turns out to be false causes the author to re-open every other finding, so the credibility cost is paid across the entire review.',
        confidence: 'strong',
      },
      verifiedBy: 'evidence-grounding',
    },
    {
      id: 'design-review/declare-method',
      strength: 'must',
      statement:
        'State at the top of the review how the interface was inspected — rendered at which viewports, from source only, or from a screenshot — and what that excluded.',
      evidence: {
        rationale:
          'The method bounds what the findings can possibly cover. A reader who does not know the review was source-only will read the absence of layout findings as evidence that the layout is sound, which is the opposite of what the review established.',
        confidence: 'strong',
      },
      verifiedBy: 'evidence-grounding',
    },
    {
      id: 'design-review/passes-run-separately',
      strength: 'should',
      statement:
        'Run the seven passes — squint, measure, contrast, content stress, viewport sweep, keyboard, motion — as separate sweeps rather than assessing everything at once.',
      evidence: {
        rationale:
          'Each pass requires suppressing what another pass needs: reading pixel values requires attending to detail that the squint test exists to destroy, and keyboard traversal requires ignoring appearance entirely. Attempting them simultaneously means the most visually salient defect masks the rest.',
        confidence: 'opinion',
      },
      verifiedBy: 'pass-coverage',
    },
    {
      id: 'design-review/severity-discipline',
      strength: 'should-not',
      statement:
        'Do not label a finding a blocker unless it ships broken or excludes a class of user, and do not let blockers exceed a small fraction of the total.',
      evidence: {
        rationale:
          'A severity scale carries information only through the rarity of its top level. When a third of findings are blockers the author stops reading the labels and re-triages from scratch, which is strictly worse than having supplied no severities at all.',
        confidence: 'strong',
      },
      verifiedBy: 'severity-distribution',
    },
    {
      id: 'design-review/cap-taste-findings',
      strength: 'should-not',
      statement:
        'Do not report more than about five craft-and-taste findings in one review, however many you could list.',
      evidence: {
        rationale:
          'Review attention is a fixed budget spent top-down. Twenty aesthetic notes do not add twenty fixes; they add reading time that is subtracted from the tier-one findings above them, and they shift the author’s reading of the review from audit to opinion piece.',
        confidence: 'opinion',
      },
      exceptions: [
        'An explicitly requested exhaustive visual audit, where completeness is the deliverable.',
      ],
    },
    {
      id: 'design-review/collapse-recurring-findings',
      strength: 'should',
      statement:
        'Collapse repeated instances of one underlying cause into a single finding that names the pattern and the count.',
      evidence: {
        rationale:
          'Six instances of an off-scale spacing value are one decision, not six defects. Listing them separately inflates the apparent severity of the review, buries the tier-one findings, and hides the single change that resolves all of them.',
        confidence: 'strong',
      },
    },
    {
      id: 'design-review/shared-component-first',
      strength: 'should',
      statement:
        'Within a severity tier, rank a defect in a shared component above the identical defect in a single page.',
      evidence: {
        rationale:
          'The cost of a defect scales with the number of surfaces that inherit it, and a fix in a shared component is applied once rather than per occurrence. Breadth is the only variable that distinguishes two findings of equal local severity.',
        confidence: 'strong',
      },
    },
    {
      id: 'design-review/lead-with-what-works',
      strength: 'should',
      statement:
        'Open every review with three to five specific observations of what the interface does well, naming the thing rather than offering a compliment.',
      evidence: {
        rationale:
          'A report containing only faults signals that the reviewer was searching for faults, so the author discounts the entire set rather than each finding on its merits. Naming what is right also protects it: undocumented good decisions are routinely removed in the next revision.',
        confidence: 'opinion',
      },
      verifiedBy: 'tone-check',
    },
    {
      id: 'design-review/critique-the-artefact',
      strength: 'must-not',
      statement:
        'Do not address the author or attribute intent, capability, or care; describe the artefact and the observed behaviour.',
      evidence: {
        rationale:
          'A statement about a person invites a defence of the person, which converts a fixable defect into a dispute in which nobody is discussing the code. It is also nearly always a false inference: the same output arises from time pressure, a missing primitive, or an unstated requirement.',
        confidence: 'strong',
      },
      examples: {
        language: 'markdown',
        bad: 'You clearly did not think about keyboard users when you built this menu.',
        good: 'The menu trigger is a div with an onClick handler and no tabindex, so it is not reachable by Tab.',
      },
      verifiedBy: 'tone-check',
    },
    {
      id: 'design-review/generated-output-checklist',
      strength: 'should',
      statement:
        'When reviewing generated interface output, check the template signature explicitly — gradient headings, three equal cards, emoji icons, one radius, one shadow, uniform section widths, single scroll animation, happy path only.',
      evidence: {
        rationale:
          'Generated output fails from a shared distribution rather than idiosyncratically, so the defects are predictable and enumerable. Reviewing it as if the failures were random misses the systematic ones, which are also the ones that make the result recognisable as generated.',
        confidence: 'strong',
      },
    },
    {
      id: 'design-review/token-adherence-rate',
      strength: 'should',
      statement:
        'When reviewing a design system, report a token adherence rate and enumerate every one-off value alongside its nearest token, rather than describing consistency qualitatively.',
      evidence: {
        rationale:
          'Consistency in a token system is a countable property, so a qualitative verdict discards the only precise signal available. A rate also gives the team a threshold to defend over time, whereas "mostly consistent" cannot regress detectably.',
        confidence: 'opinion',
      },
      verifiedBy: 'system-consistency',
    },
    {
      id: 'design-review/report-api-drift',
      strength: 'should',
      statement:
        'Report component API drift — the same concept exposed under different prop names, inconsistent boolean naming, or handlers with differing signatures — as a distinct class of finding.',
      evidence: {
        rationale:
          'API drift is invisible in any rendered view, so no visual pass detects it, yet it is what makes a system expensive to use: every inconsistency is a fact the consumer must memorise rather than infer, and the error it causes surfaces at the call site rather than in the component.',
        confidence: 'strong',
      },
      verifiedBy: 'system-consistency',
    },
    {
      id: 'design-review/state-shippability',
      strength: 'should',
      statement:
        'State explicitly whether the subject is shippable as-is, and if not, which specific findings block it.',
      evidence: {
        rationale:
          'Without an explicit verdict the author infers your overall judgment from the tone and volume of findings, and that inference is unreliable in both directions — a long list of nits reads as rejection, while a terse list containing one blocker reads as approval.',
        confidence: 'strong',
      },
    },
  ],

  verification: [
    {
      id: 'finding-quality',
      kind: 'self-review',
      description: 'Confirm every finding is actionable on its own terms.',
      blocking: true,
      questions: [
        'Does every finding name a location precise enough to open without searching?',
        'Does every finding state the observed behaviour as fact, with a measured value wherever one exists?',
        'Does every finding state who is harmed or what the system pays?',
        'Does every finding end with a specific change, not a direction to improve?',
        'Is every finding tagged as either a defect or a preference?',
      ],
    },
    {
      id: 'priority-order',
      kind: 'self-review',
      description: 'Confirm the findings are ordered by cost rather than by discovery.',
      blocking: true,
      questions: [
        'Is every user-harm finding above every system-violation finding, and every system-violation finding above every taste finding?',
        'Within each tier, do findings in shared components precede identical findings in single pages?',
        'Would an author who stopped reading after the first three findings have fixed the three most costly problems?',
      ],
    },
    {
      id: 'severity-distribution',
      kind: 'self-review',
      description: 'Confirm the severity labels still carry information.',
      questions: [
        'What fraction of findings are labelled blocker? If it is more than roughly a fifth, which ones are actually majors?',
        'For each blocker, name the class of user who is excluded or the way the build ships broken.',
        'Are there more than five taste findings? If so, which five survive?',
      ],
    },
    {
      id: 'pass-coverage',
      kind: 'self-review',
      description: 'Confirm all seven passes were run, or that their absence is declared.',
      blocking: true,
      questions: [
        'Which of the seven passes — squint, measure, contrast, content stress, viewport sweep, keyboard, motion — produced no findings, and was each one actually performed?',
        'Was the keyboard pass run by traversing the interface, or inferred from the source?',
        'Was contrast checked on hover, selected, disabled, and placeholder states, not only on resting text?',
      ],
    },
    {
      id: 'evidence-grounding',
      kind: 'self-review',
      description: 'Confirm no claim exceeds what was actually observed.',
      blocking: true,
      questions: [
        'Does the report state how the interface was inspected and at which viewports?',
        'Is every claim about rendered layout backed by something actually rendered, rather than inferred from source?',
        'Is everything suspected but unconfirmed listed separately, with what would confirm it?',
      ],
    },
    {
      id: 'tone-check',
      kind: 'self-review',
      description: 'Confirm the review criticises the work rather than the author.',
      questions: [
        'Does the review open with specific observations of what is working?',
        'Does any sentence address the author directly or attribute intent, care, or capability?',
        'Would the report read the same way if the author were in the room?',
      ],
    },
    {
      id: 'system-consistency',
      kind: 'self-review',
      description: 'Confirm a design system review reports countable consistency, not impressions.',
      questions: [
        'Is a token adherence rate reported, with each one-off value listed beside its nearest token?',
        'Were prop names, boolean naming, and handler signatures compared across sibling components?',
        'Were duplicate implementations of the same concept identified, with one named canonical?',
      ],
    },
  ],

  relatedSkills: [
    'design-judgment',
    'ui-generation-workflow',
    'accessible-components',
    'design-tokens',
  ],
}
