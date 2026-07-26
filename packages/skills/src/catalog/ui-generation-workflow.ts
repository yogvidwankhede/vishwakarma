// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * The meta-skill: the procedure, not the subject matter.
 *
 * Every other skill in this catalogue answers "what is the right value here?". This one
 * answers "what should I be deciding right now, and what must already be decided before I
 * can decide it?" — which turns out to matter more, because the characteristic failure of
 * a generated interface is not a bad choice at any single step. It is that the steps were
 * taken in the wrong order, so the structural choices were made implicitly, as a
 * side-effect of typing markup, and every later decision inherited them.
 *
 * The phases are therefore ordered by *irreversibility*. What the screen is for cannot be
 * changed by CSS. What ranks first cannot be changed by a shadow. An agent that resolves
 * the irreversible things first spends the rest of the task making cheap, revisable
 * decisions — which is the only state in which iteration is actually cheap.
 */
export const uiGenerationWorkflow: SkillManifest = {
  vsm: '1.0',
  id: 'ui-generation-workflow',
  name: 'UI Generation Workflow',
  description:
    'Use when asked to build any page, screen, component, dashboard, or app UI, to follow the ordered procedure from brief to critique to report.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'workflow',
  tags: ['workflow', 'process', 'procedure', 'planning', 'critique', 'meta'],

  activation: {
    intents: [
      'the user asks for a page, screen, view, component, dashboard, form, or app to be built',
      'the user asks to redesign, rebuild, restyle, or improve an existing interface',
      'the user gives a short or vague UI brief and expects working output',
      'starting any frontend task that will produce visible interface',
      'the user asks for a landing page, marketing site, admin panel, settings screen, or onboarding flow',
      'deciding what to do first when a UI request arrives',
      'about to report that an interface is finished',
    ],
    globs: [
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/*.astro',
      '**/app/**/page.*',
      '**/pages/**',
      '**/components/**',
    ],
    keywords: [
      'build',
      'create',
      'make me',
      'page',
      'screen',
      'dashboard',
      'landing page',
      'app',
      'ui',
      'interface',
      'redesign',
    ],
    requires: ['design-judgment'],
  },

  content: {
    summary:
      'The ordered procedure for building any interface: understand, rank, structure, systematise, compose, choreograph, stress, critique, report — each phase with a concrete output the next phase depends on.',

    body: `# UI Generation Workflow

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
and why. Components that respond to their own width via \`container-type: inline-size\` and
\`@container\` survive being moved into a narrower slot; the same component driven by
viewport media queries breaks the moment it is reused.

Build with **real content at realistic lengths**: the longest plausible product name, a
German translation, an unbroken email address, a count that reaches seven digits.
Convenient-length placeholder text hides exactly the bugs this phase exists to expose.

Output: semantic markup with real strings, barely styled, already reflowing at 320px and
1440px.

## 4. Systematise — resolve every value to a token

Every spacing, size, colour, radius, duration, and elevation resolves to a named value on a
scale. When you catch yourself typing \`margin-top: 22px\`, you have reached a decision
point: either 22px belongs on the scale, or the right value is 24px and you were guessing.
Off-scale values are not wrong because a rule forbids them — they are wrong because they are
unrepeatable, and a value that exists once cannot be adjusted globally.

If the project has a design system, adopt its scale exactly, including its naming. If it has
none, define the scale before using it and keep it small: around eight spacing steps, six
type sizes, three radii, four elevation levels.

Output: a token block, and no magic numbers beneath it.

## 5. Compose — native primitives, states from the start

Reach for the native element first. \`<button>\`, \`<dialog>\`, \`<details>\`, \`<select>\`
and typed inputs arrive with focus handling, keyboard behaviour, and accessibility semantics
that take hundreds of lines to reimplement badly. A \`<div>\` with a click handler is not a
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

Animate \`transform\` and \`opacity\`. Entrances around 200-300ms; exits shorter, because
the user has already decided and making them watch the departure is making them wait. Gate
every non-essential animation behind \`@media (prefers-reduced-motion: reduce)\`.

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

**Silent off-scale values.** One \`padding: 13px\` is not a defect; it is an unrecorded
decision, and unrecorded decisions are how a system stops being one.

**Invented substance.** Fabricated testimonials, statistics, and logos added to make a thin
page feel weightier. This is a correctness failure wearing a styling costume.`,

    references: [
      {
        id: 'phase-checklist',
        title: 'The phase checklist, in runnable form',
        answers:
          'What exactly do I do at each phase, what output must exist before I move on, and what do I check before claiming the interface is finished?',
        content: `# The phase checklist, in runnable form

Work top to bottom. A phase is complete when its output exists as an artefact you could
paste into the conversation — not when it feels done. If a gate fails, return to the phase
that owns it rather than patching downstream.

## Phase 1 — Understand

- [ ] Job: one sentence naming what the user is trying to accomplish, in their words.
- [ ] Audience: who they are and how often they see this screen.
- [ ] Primary action: one verb. If you cannot pick one, the scope is still wrong.
- [ ] Content inventory: every field, string, image, and collection that must appear, with
      its realistic length or count.
- [ ] Constraints: framework and version, existing design system, minimum viewport,
      browser floor, data source, authentication state.
- [ ] At most one clarifying question asked, and only if the answer changes structure.
- [ ] Every unanswered question converted into a written assumption.

**Gate:** you can state the primary action and the rank-1 content without re-reading the
brief.

## Phase 2 — Rank

- [ ] Content blocks listed in importance order.
- [ ] Rank 1 named explicitly, and it is a single element.
- [ ] Anything that ties for a rank has been split, merged, or demoted.
- [ ] Anything with no rank has been deleted rather than styled.

**Gate:** the list exists in writing before the first line of markup.

## Phase 3 — Structure

- [ ] Skeleton chosen: stack, sidebar, split, grid, or canvas.
- [ ] Responsive strategy chosen: container queries for reusable components, viewport
      queries only for page-level chrome.
- [ ] Breakpoints justified by where the content actually breaks, not by device names.
- [ ] Semantic landmarks in place: header, nav, main, aside, footer.
- [ ] Heading levels form a correct outline with no skipped levels.
- [ ] Real content substituted for every placeholder, at plausible worst-case lengths.

**Gate:** the unstyled document is already comprehensible and already reflows at 320px.

## Phase 4 — Systematise

- [ ] Spacing scale defined or adopted; every margin, padding, and gap references it.
- [ ] Type scale defined; every size, weight, line-height, and tracking references it.
- [ ] Colour resolved through semantic tokens, never raw palette values in components.
- [ ] Radius scale defined; nested radii are smaller inside than outside.
- [ ] Elevation levels defined; each combines a contact shadow with an ambient one.
- [ ] Duration and easing tokens defined.
- [ ] Every remaining literal value in the file is either on a scale or annotated with a
      comment explaining the deliberate exception.

**Gate:** searching the file for raw pixel values returns only intentional exceptions.

## Phase 5 — Compose

- [ ] Native element used wherever one exists for the job.
- [ ] Every interactive element reachable and operable by keyboard.
- [ ] Accessible name present on every control, including icon-only buttons.
- [ ] focus-visible styling present and distinct from hover.
- [ ] States implemented: default, hover, active, focus-visible, disabled, loading, error,
      empty, overflow.
- [ ] Loading placeholders reserve the same space the loaded content will occupy.
- [ ] Error states say what failed and what to do next.
- [ ] Empty states explain what will appear here and how to make it appear.
- [ ] No state signalled by colour alone.

**Gate:** every state can be demonstrated without editing the component.

## Phase 6 — Choreograph

- [ ] Each animation traced to a question it answers for the user.
- [ ] Only transform and opacity animated.
- [ ] Exits shorter than entrances.
- [ ] Nothing exceeds 600ms.
- [ ] No infinite animation outside a genuine pending state.
- [ ] Reduced-motion branch present, and it preserves the state change while removing the
      spatial movement.

**Gate:** with reduced motion enabled, the interface remains fully legible and usable.

## Phase 7 — Stress

- [ ] Strings tripled.
- [ ] Collections emptied.
- [ ] Collections filled to fifty items.
- [ ] Images removed.
- [ ] Numbers set to 999,999.
- [ ] Widths checked at 320, 768, 1024, 1440.
- [ ] 200% zoom checked at 1280.
- [ ] Full keyboard pass: reachability, visible focus, order, Escape, focus return.

**Gate:** nothing overflows, clips, jitters, or becomes unreachable.

## Phase 8 — Critique

- [ ] Squint pass: rank-1 element is the one that survives blurring.
- [ ] Measure pass: no two spacing values close but unequal; six or fewer type sizes.
- [ ] Rhythm pass: section separation at least three times element separation.
- [ ] Contrast pass: 4.5:1 body text, 3:1 large text and interactive boundaries.
- [ ] Template pass: at least one deliberate asymmetry exists.
- [ ] Every finding fixed, or recorded in the report as a known limitation with a reason.

**Gate:** the critique produced findings and the findings were addressed. A critique that
produces nothing was not run.

## Phase 9 — Report

- [ ] Built: files, components, routes.
- [ ] Assumed: every assumption from phase 1, phrased so the user can correct it in one
      sentence.
- [ ] Omitted: what was deliberately not done, and why.
- [ ] Needs human judgment: brand voice, legal or regulated copy, real data shapes,
      anything where intent was inferred.

**Gate:** a reader who did not watch you work can tell what is finished, what is provisional,
and what is theirs to decide.`,
      },
      {
        id: 'clarifying-questions',
        title: 'Asking about a UI brief without stalling',
        answers:
          'When should I ask the user a question about a UI request, what should I ask, and how do I proceed on assumptions when I should not ask?',
        content: `# Asking about a UI brief without stalling

Most UI briefs are underspecified, and that is normal — the user is describing a
destination, not a route. The skill is telling apart the gaps that must be closed before
building from the gaps that are cheaper to close after.

## The test: does the answer change the structure?

Ask only when the answer changes something expensive to reverse. Structure is expensive.
Styling is not.

**Worth asking**

- "Is this for one-off visitors or for people who use it every day?" Frequency determines
  density, shortcuts, and how much explanation the screen carries. Getting it wrong means
  rebuilding the layout, not restyling it.
- "Does the data come from an API you already have, or should I mock it?" Determines
  loading and error architecture, and whether pagination is real.
- "Is there an existing design system or component library I should build inside?" Building
  outside one and discovering it later means discarding the work.
- "Roughly how many items will this list hold — ten, a thousand, a million?" Ten is a list,
  a thousand needs search and pagination, a million needs virtualisation and server-side
  filtering. These are three different screens.
- "Must this work offline, or on a slow connection?" Changes the data strategy.

**Not worth asking**

- Colour, font, radius, shadow, spacing preferences. All revisable in one edit.
- "Should I add dark mode?" Build tokens so that it is possible, mention it in the report.
- "What should the button say?" Write your best guess and flag the copy as provisional.
- "Where should this go in the navigation?" Propose a location and say so.
- Anything you can infer from the repository. Read the code first; asking about facts that
  are in the codebase reads as not having looked.

## The one-question rule

Ask **at most one question per turn**, and lead with it rather than burying it under a
preamble. A list of six questions returns the work to the user, who asked precisely because
they did not want to specify six things. If two questions both pass the structure test,
ask the one whose wrong answer is more expensive and assume the other.

The question should be answerable in a few words and should offer the two or three real
options rather than being open-ended. "Staff tool or public page?" gets an answer.
"What are your requirements?" gets a sigh.

## Assumption discipline

When you do not ask, do not silently decide. Write the assumption where the user will see
it, in the form: **assumption, consequence, cost to change.**

> Assumed this is an internal tool for daily use, so the table is dense and keyboard-first
> rather than spacious and marketing-styled. If it is public-facing, the change is layout
> density and copy tone — roughly a rebuild of the table, not of the page.

That paragraph does three things a question cannot: it delivers working output immediately,
it makes the decision visible, and it prices the correction so the user can judge whether
to bother. An assumption is only a failure when it is invisible.

## Reading the brief you were given

Short briefs carry more information than they appear to. Mine them before assuming.

- **The nouns** name the content model. "A dashboard for tracking invoice status" gives you
  the entity, the primary attribute, and the fact that status is the thing to rank first.
- **The verb** names the primary action. "Let people book a room" is a booking flow;
  "let people browse rooms" is a catalogue. They share nouns and share almost nothing else.
- **The audience word** sets density and tone. "Admin", "customer", "team", "public" each
  imply a different default.
- **The absence of a word** is information too. If the user did not mention search, ask
  yourself whether the item count makes search mandatory; if it does, build it and say so.

## Handling contradictory or impossible briefs

If two requirements genuinely conflict — "put everything above the fold" and "show all
forty fields" — do not average them into something that satisfies neither. Build the
version you think is right, name the conflict explicitly, and describe what the other
version would look like. Naming a conflict is more useful than resolving it badly, and
far more useful than asking the user to resolve it without having seen either option.

## When to break the one-question rule

Ask more than once when the request touches something you cannot safely guess: destructive
operations, payments, regulated or legal copy, authentication and permission boundaries,
or anything where the wrong guess produces a plausible-looking screen that is actually
wrong. A confidently rendered incorrect permissions matrix is worse than an unanswered
question, because it looks finished.`,
      },
    ],
  },

  rules: [
    {
      id: 'ui-generation-workflow/rank-before-markup',
      strength: 'must',
      statement:
        'Write an explicit ranked list of the screen content, naming the single most important element, before writing any markup or styling.',
      evidence: {
        rationale:
          'Markup imposes a hierarchy through document order whether or not one was chosen. Once written, that implicit hierarchy is what later styling reinforces, so a ranking produced after the code merely describes what was already built instead of directing it.',
        confidence: 'strong',
      },
      verifiedBy: 'hierarchy-written',
    },
    {
      id: 'ui-generation-workflow/one-question-maximum',
      strength: 'should-not',
      statement:
        'Do not ask more than one clarifying question before starting, and ask none unless the answer changes the structure rather than the styling.',
      evidence: {
        rationale:
          'A user issuing a short brief is delegating the specification, so returning a list of questions returns the work they delegated. Structural answers are expensive to reverse and worth one round trip; stylistic answers are one edit and can be revised after seeing output.',
        confidence: 'opinion',
      },
      exceptions: [
        'Destructive operations, payments, permission boundaries, or regulated copy, where a confident wrong guess renders as a finished-looking mistake.',
      ],
    },
    {
      id: 'ui-generation-workflow/state-assumptions',
      strength: 'must',
      statement:
        'Record every unasked question as a written assumption in the final report, paired with what it would cost to change.',
      evidence: {
        rationale:
          'An assumption the user can see is corrected in one sentence; the same assumption left implicit is discovered later as a defect whose cause is no longer obvious. Pricing the correction lets the user decide whether it is worth raising at all.',
        confidence: 'strong',
      },
      verifiedBy: 'report-complete',
    },
    {
      id: 'ui-generation-workflow/structure-before-treatment',
      strength: 'should',
      statement:
        'Choose the layout skeleton and responsive strategy, and confirm the document reflows correctly, before applying colour, shadow, radius, or any visual treatment.',
      evidence: {
        rationale:
          'Visual treatment is applied to a structure and inherits its defects. Fixing a structural problem after styling means re-styling everything downstream, so the ordering makes the expensive decision the reversible one.',
        confidence: 'strong',
      },
    },
    {
      id: 'ui-generation-workflow/real-content-not-placeholders',
      strength: 'must',
      statement:
        'Build every layout with real content at realistic worst-case lengths rather than lorem ipsum or convenient sample strings.',
      evidence: {
        rationale:
          'Placeholder text is generated to fit the space it is placed in, so it cannot reveal overflow, wrapping, or truncation defects. Those defects then appear first in production, where the content is real and the layout is fixed.',
        confidence: 'established',
      },
      verifiedBy: 'content-realism',
    },
    {
      id: 'ui-generation-workflow/every-value-on-a-scale',
      strength: 'must',
      statement:
        'Resolve every spacing, size, colour, radius, duration, and elevation value to a named token on a defined scale, or annotate it as a deliberate exception.',
      evidence: {
        rationale:
          'A value that exists in one place cannot be adjusted globally, so an interface built from ad-hoc literals can only be retuned by editing every site individually. Naming the value is what converts a guess into a decision that can later be revisited.',
        confidence: 'strong',
      },
      exceptions: [
        'Optical corrections, such as nudging an icon by 1px to align it visually, which are per-instance by nature and should carry a comment.',
      ],
      examples: {
        language: 'css',
        bad: '.card { padding: 22px; gap: 13px; border-radius: 9px; }',
        good: '.card { padding: var(--space-6); gap: var(--space-3); border-radius: var(--radius-md); }',
      },
    },
    {
      id: 'ui-generation-workflow/native-elements-first',
      strength: 'must',
      statement:
        'Use the native HTML element for a control whenever one exists, before reaching for a div-based or third-party reimplementation.',
      evidence: {
        rationale:
          'Native controls ship keyboard behaviour, focus management, form participation, and accessibility mapping implemented by the browser. A reimplementation must reproduce all of it, and the parts most commonly omitted are the ones no visual inspection reveals.',
        confidence: 'established',
      },
      examples: {
        language: 'tsx',
        bad: '<div className="btn" onClick={submit}>Save</div>',
        good: '<button type="submit" onClick={submit}>Save</button>',
      },
    },
    {
      id: 'ui-generation-workflow/states-during-composition',
      strength: 'must',
      statement:
        'Implement the empty, loading, error, disabled, focus-visible, and overflow states while building each component, not as a later pass.',
      evidence: {
        rationale:
          'A component with only its default state renders convincingly, so nothing in the output signals that the other states are missing. Deferring them means the omission is invisible at exactly the moment completion is claimed.',
        confidence: 'established',
      },
      verifiedBy: 'state-coverage-pass',
    },
    {
      id: 'ui-generation-workflow/motion-gated-on-reduced-motion',
      strength: 'must',
      statement:
        'Gate every non-essential animation behind prefers-reduced-motion, keeping the state change legible while removing the spatial movement.',
      evidence: {
        rationale:
          'Large-area or parallax motion triggers genuine vestibular symptoms in susceptible users. Removing the animation entirely without preserving the state change is the other failure: the user then cannot tell that anything happened.',
        source: 'CSS Media Queries Level 5, prefers-reduced-motion',
        url: 'https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion',
        confidence: 'established',
      },
    },
    {
      id: 'ui-generation-workflow/critique-before-completion',
      strength: 'must',
      statement:
        'Run the structured critique protocol and fix its findings before reporting that an interface is complete.',
      evidence: {
        rationale:
          'A completion claim is a statement that a review happened. Reporting first and listing known defects afterwards transfers the review to the user, who now has to evaluate work that was presented as already evaluated.',
        confidence: 'strong',
      },
      verifiedBy: 'critique-run',
    },
    {
      id: 'ui-generation-workflow/fix-hierarchy-not-decorate',
      strength: 'should-not',
      statement:
        'Do not respond to a screen that looks flat or unfinished by adding gradients, glows, icons, or borders; change the ranking, spacing, and weight instead.',
      evidence: {
        rationale:
          'Flatness is a hierarchy defect: nothing outranks anything. Decoration adds visual energy uniformly, which raises the noise floor without creating difference, so the screen becomes busier and no easier to read.',
        confidence: 'strong',
      },
    },
    {
      id: 'ui-generation-workflow/stress-before-report',
      strength: 'must',
      statement:
        'Run the content stress test, the viewport sweep, and the keyboard pass before claiming an interface is finished.',
      evidence: {
        rationale:
          'These three sweeps cover the defect classes that are structurally invisible during construction, because development happens at one viewport, with one data set, using a pointer. Each is cheap to run and expensive to discover later.',
        confidence: 'established',
      },
      verifiedBy: 'stress-sweep',
    },
    {
      id: 'ui-generation-workflow/report-omissions',
      strength: 'must',
      statement:
        'End every build by reporting what was built, what was assumed, what was deliberately omitted, and what still needs human judgment.',
      evidence: {
        rationale:
          'Generated output looks uniformly finished regardless of how complete it is, so the user has no signal distinguishing a considered decision from an untouched gap. The report supplies the signal the artefact cannot.',
        confidence: 'strong',
      },
      verifiedBy: 'report-complete',
    },
    {
      id: 'ui-generation-workflow/redesign-reenters-at-rank',
      strength: 'should',
      statement:
        'When asked to improve or redesign an existing interface, re-enter the workflow at the ranking phase rather than adjusting its current visual treatment.',
      evidence: {
        rationale:
          'A request to make something look better usually reports a symptom of unclear hierarchy. Restyling preserves the ranking that caused the complaint, which is why successive rounds of polish on the same structure produce diminishing and eventually negative returns.',
        confidence: 'opinion',
      },
    },
    {
      id: 'ui-generation-workflow/single-primary-action-per-screen',
      strength: 'should',
      statement:
        'Identify exactly one primary action per screen during the understand phase, and let it be the only filled primary control in the composition.',
      evidence: {
        rationale:
          'The primary action is what the ranking is anchored to; without one, rank 1 is arbitrary. Two competing primaries push a decision onto the user that the interface was supposed to have already made.',
        confidence: 'strong',
      },
      exceptions: ['Symmetric binary choices, such as accept and decline in a consent dialog.'],
    },
    {
      id: 'ui-generation-workflow/no-decorative-scope-creep',
      strength: 'should-not',
      statement:
        'Do not add sections, illustrations, testimonials, or statistics that were not in the content inventory in order to make a page feel more substantial.',
      evidence: {
        rationale:
          'Invented content is unverifiable and frequently false, and it dilutes the ranking by inserting blocks with no assigned importance. A short honest page outperforms a padded one, and fabricated quotes or figures are a correctness problem rather than a stylistic one.',
        confidence: 'strong',
      },
    },
  ],

  verification: [
    {
      id: 'brief-complete',
      kind: 'self-review',
      description: 'Confirm the brief was extracted before building began.',
      blocking: true,
      questions: [
        'State the job this screen does in one sentence, in the user’s terms rather than the feature name.',
        'What is the single primary action, expressed as one verb?',
        'Which facts did you not know, and did each become a written assumption rather than a silent decision?',
      ],
    },
    {
      id: 'hierarchy-written',
      kind: 'self-review',
      description: 'Confirm the content was ranked before it was styled.',
      blocking: true,
      questions: [
        'What is the rank-1 element on this screen, and was it chosen before any markup was written?',
        'Does the visual weight of each element match its position in the ranked list?',
        'Is there any element on screen that has no rank? If so, why was it not deleted?',
      ],
    },
    {
      id: 'content-realism',
      kind: 'self-review',
      description: 'Confirm the layout was built against real content.',
      questions: [
        'Does any placeholder string, lorem ipsum, or invented name remain in the output?',
        'What is the longest realistic value each text slot could receive, and does the layout hold at that length?',
        'Were any statistics, testimonials, or logos invented to fill space?',
      ],
    },
    {
      id: 'state-coverage-pass',
      kind: 'self-review',
      description: 'Confirm every component state exists in the code.',
      blocking: true,
      questions: [
        'For each component that loads data, do the empty, loading, and error states exist in the code right now?',
        'Does the loading placeholder reserve the same space the loaded content will occupy?',
        'Is focus-visible styled distinctly from hover on every interactive element?',
      ],
    },
    {
      id: 'stress-sweep',
      kind: 'self-review',
      description: 'Confirm the content, viewport, and keyboard sweeps were run.',
      blocking: true,
      questions: [
        'Does the layout hold with every string tripled, every list empty, and one list at fifty items?',
        'Does it hold at 320px, 1440px, and 200% zoom, with no horizontal scrolling and no target under 24x24 CSS pixels?',
        'Can every interactive element be reached and operated by keyboard, with visible focus and correct order?',
      ],
    },
    {
      id: 'critique-run',
      kind: 'self-review',
      description: 'Confirm a critique pass happened and its findings were addressed.',
      blocking: true,
      questions: [
        'What specific findings did the critique produce? If it produced none, it was not run.',
        'Was each finding fixed, or recorded in the report as a known limitation with a reason?',
        'Did any fix consist of adding decoration rather than changing hierarchy, spacing, or weight?',
      ],
    },
    {
      id: 'report-complete',
      kind: 'self-review',
      description: 'Confirm the report distinguishes finished work from provisional work.',
      questions: [
        'Does the report list what was built, what was assumed, what was omitted, and what needs human judgment?',
        'Is each assumption phrased so the user can correct it in one sentence?',
        'Could a reader who did not watch you work tell which parts are provisional?',
      ],
    },
    {
      id: 'workflow-contract',
      kind: 'contract',
      description: 'Evaluate the finished interface against the project Design Contract.',
      contractSection: 'all',
      blocking: true,
    },
  ],

  relatedSkills: [
    'design-judgment',
    'information-architecture',
    'layout-composition',
    'accessible-components',
    'interface-copy',
    'motion-design',
  ],
}
