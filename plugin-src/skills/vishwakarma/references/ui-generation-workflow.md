# UI Generation Workflow

The difference between an interface that works and one that merely renders is almost never
skill at CSS. It is order of operations. An agent that writes markup before deciding what
the screen is *for* produces a careful arrangement of the wrong things, and every later fix
is cosmetic, because the structure has already hardened.

Nine phases, each with a concrete output that must exist before the next begins. They can
be compressed for a single small component. They cannot be reordered — every reordering is
a named failure mode.

---

## 1. Understand — extract the job

Write down five things: the **job** the screen does (the user's goal, not the feature name),
the **audience** and their expertise, the **primary action** stated as one verb, the
**content** that must appear and its realistic shape, and the **constraints** — framework,
design system, browser and device floor, where the data comes from.

Ask at most one clarifying question, and only when the answer changes the *structure*
rather than the styling. "Is this for staff triaging a queue all day, or for the public
visiting once?" changes the layout, the density, and the keyboard story. "Which blue?"
changes a token. Otherwise **state assumptions and proceed**: an assumption printed in the
report is corrected in one sentence, whereas a stalled turn costs a round trip and produces
nothing the user can react to.

Output: a five-line brief with assumptions explicitly marked.

## 2. Rank — hierarchy on paper before pixels

List the content blocks in importance order and name the **single most important element**.
If two things tie for first, either the screen is doing two jobs and should be split, or one
of them is genuinely secondary and you have not admitted it yet.

This ranked list is the specification every later visual decision is checked against.
Without it, each styling choice is made locally, and locally safe choices sum to uniformity
— a screen where everything is equally prominent and the eye has nowhere to land.

Output: an ordered list, rank 1 to n, written before any code.

## 3. Structure — skeleton before surface

Choose the layout skeleton — stack, sidebar, split, grid, canvas — and the responsive
strategy before touching colour, shadow, or radius. Decide where the layout changes shape
and why. Components that respond to their own width via `container-type: inline-size` and
`@container` survive being moved into a narrower slot; the same component driven by
viewport media queries breaks the moment it is reused.

Build with **real content at realistic lengths**: the longest plausible product name, a
German translation, an unbroken email address, a count that reaches seven digits.
Convenient-length placeholder text hides exactly the bugs this phase exists to expose.

Output: semantic markup with real strings, barely styled, already reflowing at 320px and
1440px.

## 4. Systematise — resolve every value to a token

Every spacing, size, colour, radius, duration, and elevation resolves to a named value on a
scale. When you catch yourself typing `margin-top: 22px`, you have reached a decision
point: either 22px belongs on the scale, or the right value is 24px and you were guessing.
Off-scale values are not wrong because a rule forbids them — they are wrong because they are
unrepeatable, and a value that exists once cannot be adjusted globally.

If the project has a design system, adopt its scale exactly, including its naming. If it has
none, define the scale before using it and keep it small: around eight spacing steps, six
type sizes, three radii, four elevation levels.

Output: a token block, and no magic numbers beneath it.

## 5. Compose — native primitives, states from the start

Reach for the native element first. `<button>`, `<dialog>`, `<details>`, `<select>`
and typed inputs arrive with focus handling, keyboard behaviour, and accessibility semantics
that take hundreds of lines to reimplement badly. A `<div>` with a click handler is not a
button; it is a button-shaped hole in your keyboard support.

Design the states **as part of building the component, not afterwards**: default, hover,
active, focus-visible, disabled, loading, error, empty, and overflowing. This is where
generated UI most often fails silently, because a happy-path component genuinely looks
finished.

Output: components whose every state exists in the code, not in a follow-up task.

## 6. Choreograph — motion only where it carries meaning

Animate only to answer a question the user would otherwise have to ask: where did this come
from, did the system hear me, are these two things the same object. Everything else is
latency you added deliberately.

Animate `transform` and `opacity`. Entrances around 200-300ms; exits shorter, because
the user has already decided and making them watch the departure is making them wait. Gate
every non-essential animation behind `@media (prefers-reduced-motion: reduce)`.

Output: a handful of named transitions, each justifiable in one clause.

## 7. Stress — break it on purpose

Three sweeps, each targeting a defect class that construction cannot reveal, because you
built at one viewport, with one convenient data set, using a pointer.

**Content.** Triple every string. Empty every list. Fill one with fifty rows. Remove every
image. Set a count to 999,999.

**Viewport.** 320px, 768px, 1024px, 1440px, plus 200% browser zoom at 1280px. No horizontal
scrolling, nothing clipped or overlapping, no interactive target under 24x24 CSS pixels.

**Keyboard.** Tab through everything. Every control reachable, focus visible at every stop
against every background it lands on, focus order matching visual order, Escape closing what
opened, focus returning to the trigger.

## 8. Critique — review, then fix, then report

Run the structured critique protocol and **fix what it finds before claiming completion**.
Reporting done and then listing known defects inverts the contract: the user now has to
perform the review you were meant to perform.

Highest-yield questions: where does the eye land first, and is that the rank-1 element from
phase 2? Are any two spacing values close but unequal? Does section separation exceed
element separation by at least 3:1? Would this survive real content?

When the critique finds a hierarchy problem, **fix the hierarchy**. The reflex to add a
gradient, a glow, or another icon instead is the most reliable way for an interface to get
worse while getting more decorated.

## 9. Report — built, assumed, omitted, unresolved

Close with four short sections: **built** — what exists and where; **assumed** — every
assumption from phase 1, so a wrong one costs one sentence to correct; **omitted** — what
was deliberately left out and why, such as analytics, i18n, or real endpoints; and **needs
human judgment** — brand voice, legal copy, anything where intent was guessed.

---

## Agent-specific failure modes

**Code before ranking.** Writing markup first commits you to whatever hierarchy document
order happens to produce.

**The beautiful happy path.** One state, styled well, presented as a finished component.

**Completion without critique.** "Done" is a claim about a review; if no review ran, the
claim is false.

**Decoration instead of hierarchy.** Adding visual interest to a screen whose actual problem
is that nothing outranks anything.

**Placeholder content.** Lorem ipsum fits the space allotted to it, which is precisely why
it conceals the defect.

**Silent off-scale values.** One `padding: 13px` is not a defect; it is an unrecorded
decision, and unrecorded decisions are how a system stops being one.

**Invented substance.** Fabricated testimonials, statistics, and logos added to make a thin
page feel weightier. This is a correctness failure wearing a styling costume.

## Rules

### MUST — Write an explicit ranked list of the screen content, naming the single most important element, before writing any markup or styling.

*Why:* Markup imposes a hierarchy through document order whether or not one was chosen. Once written, that implicit hierarchy is what later styling reinforces, so a ranking produced after the code merely describes what was already built instead of directing it.

### MUST — Record every unasked question as a written assumption in the final report, paired with what it would cost to change.

*Why:* An assumption the user can see is corrected in one sentence; the same assumption left implicit is discovered later as a defect whose cause is no longer obvious. Pricing the correction lets the user decide whether it is worth raising at all.

### MUST — Build every layout with real content at realistic worst-case lengths rather than lorem ipsum or convenient sample strings.

*Why:* Placeholder text is generated to fit the space it is placed in, so it cannot reveal overflow, wrapping, or truncation defects. Those defects then appear first in production, where the content is real and the layout is fixed.

### MUST — Resolve every spacing, size, colour, radius, duration, and elevation value to a named token on a defined scale, or annotate it as a deliberate exception.

*Why:* A value that exists in one place cannot be adjusted globally, so an interface built from ad-hoc literals can only be retuned by editing every site individually. Naming the value is what converts a guess into a decision that can later be revisited.

*Exceptions:*
- Optical corrections, such as nudging an icon by 1px to align it visually, which are per-instance by nature and should carry a comment.

Incorrect:

```css
.card { padding: 22px; gap: 13px; border-radius: 9px; }
```

Correct:

```css
.card { padding: var(--space-6); gap: var(--space-3); border-radius: var(--radius-md); }
```

### MUST — Use the native HTML element for a control whenever one exists, before reaching for a div-based or third-party reimplementation.

*Why:* Native controls ship keyboard behaviour, focus management, form participation, and accessibility mapping implemented by the browser. A reimplementation must reproduce all of it, and the parts most commonly omitted are the ones no visual inspection reveals.

Incorrect:

```tsx
<div className="btn" onClick={submit}>Save</div>
```

Correct:

```tsx
<button type="submit" onClick={submit}>Save</button>
```

### MUST — Implement the empty, loading, error, disabled, focus-visible, and overflow states while building each component, not as a later pass.

*Why:* A component with only its default state renders convincingly, so nothing in the output signals that the other states are missing. Deferring them means the omission is invisible at exactly the moment completion is claimed.

### MUST — Gate every non-essential animation behind prefers-reduced-motion, keeping the state change legible while removing the spatial movement.

*Why:* Large-area or parallax motion triggers genuine vestibular symptoms in susceptible users. Removing the animation entirely without preserving the state change is the other failure: the user then cannot tell that anything happened.

*Source:* [CSS Media Queries Level 5, prefers-reduced-motion](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion)

### MUST — Run the structured critique protocol and fix its findings before reporting that an interface is complete.

*Why:* A completion claim is a statement that a review happened. Reporting first and listing known defects afterwards transfers the review to the user, who now has to evaluate work that was presented as already evaluated.

### MUST — Run the content stress test, the viewport sweep, and the keyboard pass before claiming an interface is finished.

*Why:* These three sweeps cover the defect classes that are structurally invisible during construction, because development happens at one viewport, with one data set, using a pointer. Each is cheap to run and expensive to discover later.

### MUST — End every build by reporting what was built, what was assumed, what was deliberately omitted, and what still needs human judgment.

*Why:* Generated output looks uniformly finished regardless of how complete it is, so the user has no signal distinguishing a considered decision from an untouched gap. The report supplies the signal the artefact cannot.

### SHOULD NOT — Do not ask more than one clarifying question before starting, and ask none unless the answer changes the structure rather than the styling.

*Why:* A user issuing a short brief is delegating the specification, so returning a list of questions returns the work they delegated. Structural answers are expensive to reverse and worth one round trip; stylistic answers are one edit and can be revised after seeing output.

*Exceptions:*
- Destructive operations, payments, permission boundaries, or regulated copy, where a confident wrong guess renders as a finished-looking mistake.

### SHOULD NOT — Do not respond to a screen that looks flat or unfinished by adding gradients, glows, icons, or borders; change the ranking, spacing, and weight instead.

*Why:* Flatness is a hierarchy defect: nothing outranks anything. Decoration adds visual energy uniformly, which raises the noise floor without creating difference, so the screen becomes busier and no easier to read.

### SHOULD NOT — Do not add sections, illustrations, testimonials, or statistics that were not in the content inventory in order to make a page feel more substantial.

*Why:* Invented content is unverifiable and frequently false, and it dilutes the ranking by inserting blocks with no assigned importance. A short honest page outperforms a padded one, and fabricated quotes or figures are a correctness problem rather than a stylistic one.

### SHOULD — Choose the layout skeleton and responsive strategy, and confirm the document reflows correctly, before applying colour, shadow, radius, or any visual treatment.

*Why:* Visual treatment is applied to a structure and inherits its defects. Fixing a structural problem after styling means re-styling everything downstream, so the ordering makes the expensive decision the reversible one.

### SHOULD — When asked to improve or redesign an existing interface, re-enter the workflow at the ranking phase rather than adjusting its current visual treatment.

*Why:* A request to make something look better usually reports a symptom of unclear hierarchy. Restyling preserves the ranking that caused the complaint, which is why successive rounds of polish on the same structure produce diminishing and eventually negative returns.

### SHOULD — Identify exactly one primary action per screen during the understand phase, and let it be the only filled primary control in the composition.

*Why:* The primary action is what the ranking is anchored to; without one, rank 1 is arbitrary. Two competing primaries push a decision onto the user that the interface was supposed to have already made.

*Exceptions:*
- Symmetric binary choices, such as accept and decline in a consent dialog.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the brief was extracted before building began. (blocking)

- State the job this screen does in one sentence, in the user’s terms rather than the feature name.
- What is the single primary action, expressed as one verb?
- Which facts did you not know, and did each become a written assumption rather than a silent decision?

### Confirm the content was ranked before it was styled. (blocking)

- What is the rank-1 element on this screen, and was it chosen before any markup was written?
- Does the visual weight of each element match its position in the ranked list?
- Is there any element on screen that has no rank? If so, why was it not deleted?

### Confirm the layout was built against real content.

- Does any placeholder string, lorem ipsum, or invented name remain in the output?
- What is the longest realistic value each text slot could receive, and does the layout hold at that length?
- Were any statistics, testimonials, or logos invented to fill space?

### Confirm every component state exists in the code. (blocking)

- For each component that loads data, do the empty, loading, and error states exist in the code right now?
- Does the loading placeholder reserve the same space the loaded content will occupy?
- Is focus-visible styled distinctly from hover on every interactive element?

### Confirm the content, viewport, and keyboard sweeps were run. (blocking)

- Does the layout hold with every string tripled, every list empty, and one list at fifty items?
- Does it hold at 320px, 1440px, and 200% zoom, with no horizontal scrolling and no target under 24x24 CSS pixels?
- Can every interactive element be reached and operated by keyboard, with visible focus and correct order?

### Confirm a critique pass happened and its findings were addressed. (blocking)

- What specific findings did the critique produce? If it produced none, it was not run.
- Was each finding fixed, or recorded in the report as a known limitation with a reason?
- Did any fix consist of adding decoration rather than changing hierarchy, spacing, or weight?

### Confirm the report distinguishes finished work from provisional work.

- Does the report list what was built, what was assumed, what was omitted, and what needs human judgment?
- Is each assumption phrased so the user can correct it in one sentence?
- Could a reader who did not watch you work tell which parts are provisional?

### Evaluate the finished interface against the project Design Contract. (blocking)

Evaluate the output against the project Design Contract.

Run `vishwakarma audit` if the project has the CLI available.

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/phase-checklist.md` — What exactly do I do at each phase, what output must exist before I move on, and what do I check before claiming the interface is finished?
- `references/clarifying-questions.md` — When should I ask the user a question about a UI request, what should I ask, and how do I proceed on assumptions when I should not ask?
