# The phase checklist, in runnable form

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
and what is theirs to decide.
