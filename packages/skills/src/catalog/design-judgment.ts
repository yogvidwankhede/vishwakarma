import type { SkillManifest } from '../manifest.js'

/**
 * The flagship skill.
 *
 * Most attempts to make an agent produce better-looking UI take the form of adjectives:
 * "modern", "clean", "premium", "beautiful". Adjectives do not survive contact with a
 * language model, because the model already believes it is producing modern, clean,
 * premium, beautiful work. It has no idea that what it produced is the same thing
 * everyone else produces.
 *
 * This skill takes the opposite approach. It names the specific, recurring, identifiable
 * failures of generated interfaces, explains the mechanism behind each, and gives a
 * checkable correction. "Do not centre everything" is actionable in a way that "be
 * tasteful" is not.
 */
export const designJudgment: SkillManifest = {
  vsm: '1.0',
  id: 'design-judgment',
  name: 'Design Judgment',
  description:
    'Use when building or reviewing any user interface, to apply real design judgment and avoid the recognisable tells of generated UI.',
  version: '1.0.0',
  license: 'MIT',
  category: 'ux',
  tags: ['design', 'taste', 'critique', 'hierarchy', 'quality'],

  activation: {
    intents: [
      'building a page, screen, component, or layout',
      'the user asks for something to look better, more polished, more premium, or more designed',
      'the user says the result looks generic, plain, or AI-generated',
      'reviewing an interface before shipping it',
      'choosing spacing, type sizes, colours, or visual hierarchy',
    ],
    globs: ['**/*.tsx', '**/*.jsx', '**/*.vue', '**/*.svelte', '**/*.css', '**/*.scss'],
    keywords: ['ui', 'design', 'layout', 'polish', 'looks', 'visual', 'aesthetic'],
  },

  content: {
    summary:
      'Diagnose and fix the specific failures that make an interface look generated rather than designed: flat hierarchy, uniform density, decorative gradients, and untyped type.',

    body: `# Design Judgment

Generated interfaces fail in a consistent, recognisable way. They are not ugly — ugly
would be interesting. They are *undifferentiated*: every element carries the same visual
weight, every gap is the same size, every corner has the same radius, and the eye has
nowhere to go. The result reads as competent and forgettable, which in a product context
is worse than reading as wrong, because nobody can tell you why they don't trust it.

Almost all of this traces to one root cause. **Design is the deliberate creation of
difference.** Hierarchy is difference in weight. Rhythm is difference in spacing. Emphasis
is difference in colour. A model generating UI defaults to uniformity because uniformity
is the safest local choice at every individual decision — and the sum of a thousand safe
local choices is a page with no structure at all.

So the governing question for every element is not "does this look good" but **"what is
this element's rank, and does its treatment match its rank?"**

---

## 1. Hierarchy before decoration

Before styling anything, rank the content. Every screen has exactly one thing that matters
most, a small number of things that matter next, and a long tail of things that matter
little. Write that ranking down, then make the visual treatment express it.

The tools for expressing rank, in descending order of power:

**Space** is the strongest and the most underused. A heading with 48px above it and 12px
below it is bound to the paragraph beneath — the eye groups them without being told. Equal
space above and below leaves the heading floating between two blocks, belonging to
neither. Proximity communicates relationship more forcefully than any border or background
ever will, and it costs nothing.

**Size** is the most obvious, and therefore the one people overuse. Two type sizes with a
real gap between them beat five sizes with small gaps, every time. If your h2 is 1.5rem and
your h3 is 1.375rem, you do not have two levels — you have one level and a rendering bug.

**Weight** does more than size at small scales. Going from 400 to 600 at the same size
creates clear emphasis without disturbing the layout, which is why it is the right tool
inside dense UI where size changes would break the grid.

**Colour** is the weakest and the most abused. Making something a different colour to make
it important works only if almost nothing else is coloured. On a page where six things are
blue, blue means nothing.

The corollary: **if everything on the page is emphasised, nothing is.** When you catch
yourself adding emphasis to an element, check what you can de-emphasise instead. Lowering
the contrast of the surrounding text is usually a better move than raising the contrast of
the target, because it preserves the overall calm of the page.

---

## 2. Vary density deliberately

A generated page usually has one padding value applied everywhere. Real interfaces breathe
unevenly: a hero has enormous room, a data table is tight, a settings form sits between the
two. Density is information — a dense region says "this is for working in", a sparse region
says "this is for reading".

Practical rules:

Sections that mark a change of subject need noticeably more separation than elements within
a section. If the gap between two cards is 24px, the gap between two sections should be
96px or more, not 32px. Weak section separation is the single most common cause of a page
that "feels flat" — the reader cannot tell where one idea ends.

Padding inside a container should relate to the container's size. A 320px card with 32px
padding is generous; a 1200px section with 32px padding is cramped. Scale the inner space
with the outer size, roughly but visibly.

Vertical rhythm beats horizontal symmetry. It is fine — often better — for the space above
an element to differ from the space below it. Symmetric padding on a section that follows a
hero pushes the section title too far from its own content.

---

## 3. Type must be typeset, not merely sized

Setting \`font-size\` is not typography. Four adjustments separate typeset text from
default text, and all four are cheap.

**Tracking scales inversely with size.** Typefaces are fitted for reading sizes. Blown up to
display sizes that fitting looks loose, so display type needs negative letter-spacing,
around -0.02em at 3rem and above. Shrunk to caption sizes it looks cramped, so small text
needs slightly positive tracking. Zero tracking everywhere is the most reliable single tell
of an untypeset page.

**Leading scales inversely with size too.** Body text wants around 1.5 to 1.6. A 3rem
headline wants around 1.05 to 1.15. Applying \`leading-relaxed\` to a headline makes the
lines drift apart until the headline stops reading as one object.

**Measure has a ceiling.** Lines longer than about 75 characters cause the eye to lose its
place on the return sweep. A full-width paragraph on a 1440px screen runs to 150 characters
and is genuinely tiring to read. Constrain prose containers with a max-width in \`ch\`.

**Numbers need tabular figures** anywhere they align vertically or update in place —
tables, prices, timers, counters. Without \`font-variant-numeric: tabular-nums\`, digits
have different widths and columns visibly jitter.

---

## 4. Colour: one accent, with a job

Restraint here does more for perceived quality than any other single decision.

Use one dominant hue, a neutral family, and at most one accent. Give the accent exactly one
job — usually "the primary action" — and never use it for anything else. The moment the
accent also appears in an illustration, a badge, and a chart, it stops directing attention
and becomes decoration.

Neutrals should not be pure grey. Tinting them very slightly toward the brand hue (a chroma
of roughly 0.01 in OKLCh) makes the whole interface feel considered, and nobody can
consciously identify why. Pure \`#808080\` grey next to a warm brand colour looks
accidental.

Semantic colours — success, warning, error — must never be the sole carrier of meaning.
Around one in twelve men cannot reliably distinguish red from green. Pair every semantic
colour with an icon, a label, or a shape.

**Do not use gradient text on headings.** A hue-shifted gradient across a headline is the
most recognisable marker of generated marketing pages that exists. It also reliably fails
contrast checks somewhere along its length, and it defeats text selection highlighting. If
you want a headline to feel special, set it larger, tighten its tracking, and give it more
space.

---

## 5. Depth is physical, not decorative

Shadows model a light source. A page with a coherent light source has consistent shadow
direction and shadows that grow softer and larger as elements rise. A page where every
element has the same shadow has no light source, and reads as stickers on a page.

An elevation system needs about four levels and no more: flat (no shadow, use a border),
raised (cards), floating (dropdowns, popovers), and overlay (modals). Each level should
combine a tight dark shadow for contact and a wider soft shadow for ambient occlusion —
single-shadow elevation always looks cheap.

Borders and shadows are alternatives, not partners. Pick one per element. A card with a
1px border *and* a drop shadow is describing two contradictory physical situations.

**Glassmorphism requires something worth seeing through.** A \`backdrop-filter\` over a
flat background produces a slightly grey rectangle and costs real GPU time. Use it only
over imagery, gradients, or content that scrolls beneath — and always provide a solid
fallback, because backdrop blur is a common source of jank on low-end devices.

---

## 6. Layout: escape the three-column grid

The default generated layout is a centred column of full-width sections, each containing a
heading, a subheading, and a row of three equal cards. It is not wrong. It is simply what
everyone produces, and it signals that no decisions were made.

Structural alternatives that cost nothing:

Break the symmetry of the content grid. Give one card in a set more prominence — a wider
span, a stronger surface, an image — because in real products one item genuinely does
matter more. An asymmetric grid where one tile spans two columns immediately reads as
designed rather than defaulted.

Let something break its container. An image that extends past the text column, a card that
overlaps a section boundary, a pull quote that hangs into the margin. One such moment per
page is enough, and it does more for perceived craft than any amount of polish elsewhere.

Vary section rhythm. Alternate full-bleed and contained sections. Not every section needs
the same max-width, and a page where they all do reads as a template.

Align optically, not mathematically. Icons, quotation marks, and round shapes need slight
manual correction to *look* aligned; centring them by their bounding box makes them look
off. Circular avatars next to square thumbnails need the circle to be slightly larger to
appear the same size.

---

## 7. Design every state

An interface is not the happy path. Before a screen is finished, it needs: an empty state
that explains what will appear here and how to make it appear, a loading state that
reserves the space the content will occupy so nothing shifts, an error state that says what
failed and what to do next, and an overflow state tested with unreasonably long strings.

The empty state matters most and is skipped most. It is the first thing every new user
sees, and "No items" is a wasted screen.

Test with realistic content, not placeholders. Design to the longest plausible name, not to
"John Smith". Most layout bugs that reach production are content-length bugs that were
invisible against lorem ipsum.

---

## 8. Motion serves meaning

Animate to explain, never to impress. Motion should tell the user where something came
from, that the system heard them, or that a relationship exists between two elements.

Exits must be faster than entrances. The user has already decided; making them watch the
departure is making them wait.

Never animate \`width\`, \`height\`, \`top\`, or \`left\`. These force layout on every frame.
Use \`transform\` and \`opacity\`.

One scroll-triggered effect per page section, at most, and never the same fade-up on every
element. Nothing announces a template faster than forty elements sharing one entrance.

Every non-essential animation must be gated behind \`prefers-reduced-motion\`. This is an
accessibility requirement, not a nicety — large-area motion causes real physical symptoms.

---

## 9. The critique pass

Before declaring an interface finished, look at it as a stranger would and answer these
honestly. Each has a correction attached, so a "no" is immediately actionable.

1. **Where does the eye land first?** If the answer is "nowhere in particular", the
   hierarchy has failed. Pick the single most important element and increase its
   difference from everything around it.

2. **Could I remove any element without loss?** Generated pages accumulate decorative
   elements — spacer icons, redundant badges, subtitle lines that restate the title.
   Remove them.

3. **How many type sizes are on screen?** More than about six means collapsing some.

4. **How many hue families are on screen?** More than three means the palette has stopped
   being a system.

5. **Is any pair of gaps almost-but-not-quite equal?** 20px next to 24px reads as a
   mistake. Make them equal or make them clearly different.

6. **Does the section separation exceed the element separation by at least three times?**
   If not, the page will read as one undifferentiated block.

7. **Does anything break the grid?** If nothing does, the page will read as a template.

8. **Would this survive real content?** Try the longest name, the empty list, the
   999-item count, the missing avatar.

9. **Does it work at 320px wide and at 200% zoom?** Both are required, and both are
   routinely broken.

10. **Is the accent colour doing exactly one job?** If it appears in more than one role,
    it has stopped meaning anything.

---

## What "premium" actually is

It is not gradients, glass, or glow. Interfaces read as expensive when they demonstrate
that decisions were made: consistent spacing from a real scale, restrained colour,
typography that has been fitted rather than defaulted, motion that is short and purposeful,
and one or two moments of deliberate asymmetry that prove a human was paying attention.

Every one of those is checkable. None of them require taste to verify — only to originate.`,

    references: [
      {
        id: 'anti-patterns',
        title: 'Catalogue of generated-UI tells',
        answers:
          'What are the specific visual signatures that make an interface look AI-generated, and what replaces each one?',
        content: `# Catalogue of generated-UI tells

Each entry names a pattern, explains why it reads as generated, and gives the replacement.
These are ordered roughly by how strongly they signal, most damaging first.

## Gradient text on headings
A multi-hue gradient clipped to heading text. Signals generated marketing copy instantly,
fails contrast somewhere along its run, and breaks selection highlighting.
**Replace with:** larger size, tighter tracking, more surrounding space. If the brand truly
needs colour in the headline, colour one word in a solid accent.

## The three-card feature row
Exactly three (or six) equal cards, each with a small icon, a short title, and two lines of
body copy, centred under a centred section heading.
**Replace with:** an asymmetric grid where one item is genuinely larger because it is
genuinely more important; or a vertical list with real screenshots; or two columns with the
text on one side.

## Emoji used as interface icons
Emoji render differently on every platform, cannot be recoloured, do not align on the text
baseline, and announce themselves to screen readers with unhelpful names.
**Replace with:** a single icon set, sized and coloured with the text.

## Uniform border radius
The same radius on buttons, cards, inputs, images, avatars, and modals.
**Replace with:** a radius scale where size relates to element size — small controls take a
small radius, large surfaces take a larger one. Nested elements need an inner radius smaller
than the outer one, or the curves visibly fight.

## One shadow everywhere
The same drop shadow on every raised element regardless of its role.
**Replace with:** a four-level elevation system, each level combining a tight contact shadow
with a wider ambient one.

## Centred everything
Every heading, every paragraph, every section centred.
**Replace with:** left-aligned body copy as the default. Centring works for short display
text and for genuinely symmetric compositions; centred paragraphs create a ragged left edge
that makes each line harder to find.

## Full-width prose
Paragraphs that span the whole viewport.
**Replace with:** a max-width around 65ch on any container holding sentences.

## Low-contrast secondary text
Light grey on white for anything a user needs to read.
**Replace with:** a secondary tone that still clears 4.5:1. If the design "needs" the text
to recede further than that, the text should probably be removed.

## The purple-to-blue palette
The specific violet-indigo-cyan range that dominates generated output.
**Replace with:** a hue chosen for the subject. Anything works if the ramp is even and the
accent has one job.

## Decorative blur blobs
Large soft coloured circles behind the hero.
**Replace with:** nothing, usually. If the background needs interest, use a very low-contrast
geometric texture or real product imagery.

## Identical scroll animation on every element
Forty elements sharing one fade-up-on-enter.
**Replace with:** animating groups rather than items, with a compressed stagger, and only in
sections where the motion carries meaning.

## Icon-and-label buttons with no primary
A row of buttons all sharing the same weight and size.
**Replace with:** exactly one filled primary per view, with everything else as outline or
ghost. If two actions are genuinely equal, the screen is asking the wrong question.

## Fake testimonials and placeholder avatars
Generic names, stock portraits, and vague praise.
**Replace with:** real quotes, or an honest absence. An empty testimonial section is better
than an invented one, and inventing attributed quotes is dishonest as well as obvious.

## Redundant subtitle lines
A heading followed immediately by a sentence restating the heading.
**Replace with:** either the heading alone, or a subtitle that adds genuinely new
information.

## Uppercase eyebrow labels on every section
A small letter-spaced all-caps label above every section heading.
**Replace with:** using it once, if at all. Repeated on every section it becomes wallpaper.

## Layout animation on width and height
Transitions on box dimensions, producing visible stutter under load.
**Replace with:** transforms, or the \`grid-template-rows: 0fr → 1fr\` technique for
height-auto transitions.

## Missing states
Only the happy path exists.
**Replace with:** designed empty, loading, error, and overflow states for every screen that
loads data.`,
      },
      {
        id: 'critique-protocol',
        title: 'Structured critique protocol',
        answers:
          'How do I systematically review an interface I just built and produce specific, prioritised fixes?',
        content: `# Structured critique protocol

Run this after building and before reporting completion. It takes a few minutes and
catches most of what a designer would catch in a first review.

## Pass 1 — Squint

Blur the interface, mentally or literally. What remains visible is the hierarchy the user
actually perceives.

- If several elements remain equally prominent, rank them and increase the differences.
- If nothing remains prominent, the page has no focal point. Choose one.
- If something unimportant remains prominent — a decorative image, a large empty card — it
  is stealing attention that belongs elsewhere.

## Pass 2 — Measure

Extract the actual numbers rather than trusting appearance.

- List every distinct spacing value. Values that are close but unequal are errors.
- List every distinct font size. More than six on one screen is too many.
- List every distinct border radius. More than three is usually too many.
- Compute the ratio of section separation to element separation. Below 3:1, the page reads
  flat.

## Pass 3 — Contrast

- Check every text-on-background pair against 4.5:1 for body and 3:1 for large text.
- Check interactive boundaries — borders, focus rings, icon buttons — against 3:1. These
  are the ones that are usually missed.
- Check the focus indicator against both the component and the page background.
- Verify that no state is communicated by colour alone.

## Pass 4 — Content stress

- Replace every string with one three times longer.
- Replace every list with an empty one.
- Replace every list with one containing fifty items.
- Remove every image.
- Set a number to 999,999.

Anything that breaks was going to break in production.

## Pass 5 — Viewport sweep

Check 320px, 768px, 1024px, and 1440px, plus 200% browser zoom at 1280px.

- No horizontal scrolling at any width.
- No text smaller than 14px at any width.
- No interactive target below 44px in either dimension on touch widths.
- Nothing clipped or overlapping at 200% zoom.

## Pass 6 — Keyboard

- Tab through the whole interface. Every interactive element must be reachable.
- The focus indicator must be visible at every stop, against every background it lands on.
- Focus order must match visual order.
- Escape must close anything that opened.
- Focus must be trapped inside modals and returned to the trigger on close.

## Pass 7 — Motion

- Enable reduced-motion and confirm that spatial animation stops while state changes stay
  legible.
- Confirm nothing animates a layout-triggering property.
- Confirm no animation exceeds 600ms.
- Confirm no infinite animation runs outside a genuine loading context.

## Output format

Report findings as a prioritised list, each with the location, the specific problem, and
the exact change. "Increase the gap between the section heading and the first card from
16px to 32px" is useful. "Improve spacing" is not.`,
      },
    ],
  },

  rules: [
    {
      id: 'design-judgment/rank-before-style',
      strength: 'must',
      statement:
        'Rank the content of a screen by importance before applying any styling, and make each element’s visual weight match its rank.',
      evidence: {
        rationale:
          'Visual hierarchy is the mechanism by which a viewer decides where to look. Without an explicit ranking, every styling decision is made locally, and locally safe choices sum to uniformity, which presents the viewer with no entry point.',
        confidence: 'established',
      },
    },
    {
      id: 'design-judgment/no-gradient-text',
      strength: 'must-not',
      statement:
        'Do not apply multi-hue gradients to heading text as a decorative effect.',
      evidence: {
        rationale:
          'Gradient headline text is the strongest single visual marker of generated marketing pages, and it additionally fails contrast auditing at some point along its run because the ratio varies with position.',
        confidence: 'strong',
      },
      exceptions: [
        'The brand’s own identity system specifies it and supplies the tested colour stops.',
      ],
      examples: {
        language: 'tsx',
        bad: '<h1 className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">Ship faster</h1>',
        good: '<h1 className="text-5xl font-semibold tracking-[-0.022em] text-fg">Ship faster</h1>',
      },
    },
    {
      id: 'design-judgment/section-separation',
      strength: 'should',
      statement:
        'Separate top-level sections by at least three times the gap used between elements inside a section.',
      evidence: {
        rationale:
          'Proximity is the dominant grouping cue in visual perception. When between-group spacing does not clearly exceed within-group spacing, the viewer cannot parse where one idea ends and the next begins, and the page reads as a single undifferentiated block.',
        confidence: 'established',
      },
      verifiedBy: 'spacing-rhythm',
    },
    {
      id: 'design-judgment/type-size-count',
      strength: 'should-not',
      statement: 'Do not use more than six distinct font sizes in a single view.',
      evidence: {
        rationale:
          'Hierarchy is expressed through perceptible differences between levels. Beyond roughly six levels the differences become too small to perceive, so additional sizes add visual noise without adding structure.',
        confidence: 'strong',
      },
      exceptions: ['Dense data applications where a documented scale intentionally covers more levels.'],
    },
    {
      id: 'design-judgment/tracking-by-size',
      strength: 'should',
      statement:
        'Apply negative letter-spacing to display sizes and slightly positive letter-spacing to small text, rather than leaving tracking at zero everywhere.',
      evidence: {
        rationale:
          'Typefaces are spaced by their designer for text sizes. That spacing appears loose when scaled up and tight when scaled down, so uniform zero tracking produces visibly mis-set type at both extremes.',
        confidence: 'established',
      },
    },
    {
      id: 'design-judgment/measure-limit',
      strength: 'must',
      statement: 'Constrain any container holding prose to a maximum measure of about 75 characters.',
      evidence: {
        rationale:
          'Beyond roughly 75 characters per line, the return sweep to the start of the next line becomes unreliable and readers lose their place, which measurably reduces reading speed and comprehension.',
        confidence: 'established',
      },
      verifiedBy: 'measure-check',
    },
    {
      id: 'design-judgment/accent-single-job',
      strength: 'should',
      statement: 'Assign the accent colour exactly one semantic job, and do not use it for decoration.',
      evidence: {
        rationale:
          'An accent directs attention by being rare. Each additional use dilutes it, and past a handful of uses it conveys no information at all while still consuming visual energy.',
        confidence: 'strong',
      },
    },
    {
      id: 'design-judgment/no-colour-only-meaning',
      strength: 'must',
      statement:
        'Never convey state or meaning through colour alone; always pair it with text, an icon, or a shape.',
      evidence: {
        rationale:
          'Around 8% of men and 0.5% of women have a colour vision deficiency, most commonly affecting red-green discrimination — exactly the pairing used for error and success states.',
        source: 'WCAG 2.2 Success Criterion 1.4.1 (Use of Color)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html',
        confidence: 'established',
      },
      verifiedBy: 'colour-only-check',
    },
    {
      id: 'design-judgment/elevation-system',
      strength: 'should',
      statement:
        'Use a small elevation system with a consistent light source, and combine a tight contact shadow with a wider ambient shadow at each level.',
      evidence: {
        rationale:
          'Real objects cast two distinguishable shadows: a sharp one where they meet the surface and a diffuse one from ambient light. A single-shadow approximation lacks the contact cue, so elements read as pasted onto the page rather than raised above it.',
        confidence: 'strong',
      },
    },
    {
      id: 'design-judgment/border-or-shadow',
      strength: 'should-not',
      statement: 'Do not combine a visible border and a drop shadow on the same element.',
      evidence: {
        rationale:
          'A border states that an element is flush with the surface and delineated by a line; a shadow states that it is raised above the surface. Applying both describes two contradictory physical situations, which reads as indecision.',
        confidence: 'opinion',
      },
      exceptions: [
        'A very low-contrast border used purely to hold an edge against a same-tone background, where the shadow alone would disappear.',
      ],
    },
    {
      id: 'design-judgment/glass-needs-background',
      strength: 'must-not',
      statement:
        'Do not apply backdrop blur over a flat background.',
      evidence: {
        rationale:
          'A backdrop filter samples and blurs what is behind the element. Over a flat fill there is nothing to sample, so the effect produces only a slight tint while still forcing the compositor to allocate and blur a backdrop texture every frame.',
        confidence: 'established',
      },
    },
    {
      id: 'design-judgment/break-the-grid',
      strength: 'should',
      statement:
        'Include at least one deliberate asymmetry or grid break per page, such as an unequal card span or an element that overflows its container.',
      evidence: {
        rationale:
          'Perfect regularity is the signature of a template. A single controlled deviation demonstrates that the layout was composed rather than filled, and it gives the eye a place to rest that is not the centre.',
        confidence: 'opinion',
      },
    },
    {
      id: 'design-judgment/design-all-states',
      strength: 'must',
      statement:
        'Design the empty, loading, error, and overflow states for every screen that displays fetched or variable-length content.',
      evidence: {
        rationale:
          'The empty state is the first thing every new user sees, and variable-length content is the most common source of layout defects that reach production. Both are invisible when developing against fixed sample data.',
        confidence: 'established',
      },
      verifiedBy: 'state-coverage',
    },
    {
      id: 'design-judgment/single-primary-action',
      strength: 'should',
      statement: 'Present exactly one filled primary button per view.',
      evidence: {
        rationale:
          'A primary button communicates the expected next action. Two equally weighted primaries force the user to make a decision the interface should have made for them, which measurably slows task completion.',
        confidence: 'strong',
      },
      exceptions: ['Genuinely symmetric binary choices, such as accept and decline in a consent dialog.'],
    },
    {
      id: 'design-judgment/no-emoji-icons',
      strength: 'must-not',
      statement: 'Do not use emoji as interface icons.',
      evidence: {
        rationale:
          'Emoji glyphs are supplied by the operating system, so they differ across platforms, cannot be recoloured to match the interface, do not align to the text baseline consistently, and are announced by screen readers with names that rarely match their intended meaning.',
        confidence: 'established',
      },
      exceptions: ['User-authored content, where emoji are the user’s own words.'],
    },
    {
      id: 'design-judgment/stress-test-content',
      strength: 'must',
      statement:
        'Verify every layout against the longest realistic string, an empty collection, and a large collection before considering it complete.',
      evidence: {
        rationale:
          'Layouts are authored against convenient sample data whose length happens to fit. The overwhelming majority of layout defects found in production are content-length defects that were structurally invisible during development.',
        confidence: 'established',
      },
      verifiedBy: 'content-stress',
    },
  ],

  verification: [
    {
      id: 'squint-test',
      kind: 'self-review',
      description: 'Confirm the interface has a perceptible hierarchy.',
      blocking: true,
      questions: [
        'If you blurred this screen, which single element would still stand out?',
        'Is that element actually the most important thing on the screen?',
        'Name the second and third most prominent elements. Do they match ranks two and three of the content?',
      ],
    },
    {
      id: 'spacing-rhythm',
      kind: 'self-review',
      description: 'Confirm spacing communicates grouping.',
      blocking: true,
      questions: [
        'List every distinct spacing value used. Are any two values close but unequal?',
        'What is the ratio between section separation and within-section element separation? Is it at least 3:1?',
        'Does any heading have equal space above and below it? If so, it is not visually bound to its content.',
      ],
    },
    {
      id: 'measure-check',
      kind: 'self-review',
      description: 'Confirm line lengths are readable.',
      questions: [
        'Does every prose container have a max-width?',
        'At the widest supported viewport, does any paragraph exceed roughly 75 characters per line?',
      ],
    },
    {
      id: 'colour-only-check',
      kind: 'self-review',
      description: 'Confirm no meaning depends on colour alone.',
      blocking: true,
      questions: [
        'List every place where colour signals state. Does each also carry an icon, label, or shape?',
        'Rendered in greyscale, would every state still be distinguishable?',
      ],
    },
    {
      id: 'state-coverage',
      kind: 'self-review',
      description: 'Confirm non-happy-path states exist.',
      blocking: true,
      questions: [
        'What does this screen show when the data set is empty?',
        'What does it show while loading, and does that placeholder reserve the same space as the loaded content?',
        'What does it show when the request fails, and does that message say what to do next?',
      ],
    },
    {
      id: 'content-stress',
      kind: 'self-review',
      description: 'Confirm the layout survives real content.',
      questions: [
        'Does the layout hold with every string tripled in length?',
        'Does it hold with fifty items instead of three?',
        'Does it hold with every optional image missing?',
      ],
    },
    {
      id: 'contract-audit',
      kind: 'contract',
      description: 'Evaluate the output against the project Design Contract.',
      contractSection: 'all',
      blocking: true,
    },
  ],

  relatedSkills: ['responsive-architecture', 'motion-design', 'accessible-components', 'design-tokens'],
}
