// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

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
  license: 'Apache-2.0',
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

## 3. What judgment asks of each craft domain

Six sibling skills own the values. This skill owns the judgment about them, and it is the
same judgment every time: **is there enough difference, and is each difference doing a job?**
Below, the one question to ask and the tell that answers it when the answer is no.
\`craft-values.md\` has the specific numbers and names the owner for each.

**Type — has it been *typeset*, or only sized?** Zero letter-spacing at every size is the
most reliable single tell of an untypeset page: display type needs it negative and its
leading tight, caption type needs the opposite of both. Owner: \`typographic-systems\`.

**Colour — does the accent have exactly one job?** The moment it also appears in an
illustration, a badge and a chart, it has stopped directing attention. And never gradient
text on a headline: it is the clearest single marker of a generated marketing page, it fails
contrast somewhere along its run, and it breaks selection highlighting. Owner:
\`colour-systems\`.

**Depth — is there one light source?** A page where every element carries the same shadow
has no light source and reads as stickers on paper. Border or shadow, never both on one
element; they describe contradictory physical situations. Glass needs something worth seeing
through. Owner: \`surface-and-depth\`.

**Layout — does anything break the grid?** The default output is a centred column of
full-width sections, each holding a heading, a subheading and a row of three equal cards.
It is not wrong; it is what everyone produces, and it signals that no decisions were made.
One asymmetric span, or one element crossing its container, is enough to reverse that read.
Owner: \`layout-composition\`.

**States — does the empty state earn its screen?** It is the first thing every new user
sees and the state most often skipped; "No items" wastes it. Then stress the layout with the
longest plausible string rather than "John Smith", because most layout bugs that reach
production are content-length bugs invisible against placeholder text. Owner:
\`interface-states\`.

**Motion — how often will the user see this?** Something seen a hundred times a day should
not be animated at all. Forty elements sharing one fade-up announces a template faster than
anything else on this list. Owner: \`motion-design\`.

---

## What "premium" actually is

It is not gradients, glass, or glow. Interfaces read as expensive when they demonstrate
that decisions were made: consistent spacing from a real scale, restrained colour,
typography that has been fitted rather than defaulted, motion that is short and purposeful,
and one or two moments of deliberate asymmetry that prove a human was paying attention.

Every one of those is checkable. None of them require taste to verify — only to originate.

The checking itself is not in this body. The verification section below is the short form,
run on every screen; \`critique-protocol.md\` is the seven-pass long form for a finished
interface; \`anti-patterns.md\` is the catalogue of tells with a replacement for each.`,

    references: [
      {
        id: 'craft-values',
        title: 'The specific values judgment checks against, and who owns each',
        answers:
          'What are the concrete numbers behind "is it typeset", "is there one light source", "does it survive real content" — and which skill owns each of them?',
        content: `# Craft values, and their owners

This skill asks whether a difference is doing a job. That question needs numbers to answer,
and the numbers belong to the skill that owns the domain. They are gathered here so a
judgment call can be settled without loading six skills, and each block names its owner so
the authoritative treatment is one hop away.

## Type — owner: \`typographic-systems\`

Setting \`font-size\` is not typography. Four adjustments separate typeset text from default
text, and all four are cheap.

**Tracking scales inversely with size.** Typefaces are fitted for reading sizes. Blown up to
display sizes that fitting looks loose, so display type needs negative letter-spacing,
around -0.02em at 3rem and above. Shrunk to caption sizes it looks cramped, so small text
needs slightly positive tracking.

**Leading scales inversely with size too.** Body text wants around 1.5 to 1.6. A 3rem
headline wants around 1.05 to 1.15. Applying \`leading-relaxed\` to a headline makes the lines
drift apart until the headline stops reading as one object.

**Measure has a ceiling.** Lines longer than about 75 characters cause the eye to lose its
place on the return sweep. A full-width paragraph on a 1440px screen runs to 150 characters
and is genuinely tiring to read. Constrain prose containers with a max-width in \`ch\`.

**Numbers need tabular figures** anywhere they align vertically or update in place — tables,
prices, timers, counters. Without \`font-variant-numeric: tabular-nums\`, digits have
different widths and columns visibly jitter.

## Colour — owner: \`colour-systems\`

Use one dominant hue, a neutral family, and at most one accent. Give the accent exactly one
job — usually "the primary action" — and never use it for anything else.

Neutrals should not be pure grey. Tinting them very slightly toward the brand hue, a chroma
of roughly 0.01 in OKLCh, makes the whole interface feel considered, and nobody can
consciously identify why. Pure \`#808080\` grey next to a warm brand colour looks accidental.

Semantic colours — success, warning, error — must never be the sole carrier of meaning.
Around one in twelve men cannot reliably distinguish red from green. Pair every semantic
colour with an icon, a label, or a shape.

## Depth — owner: \`surface-and-depth\`

Shadows model a light source. A page with a coherent light source has consistent shadow
direction, and shadows that grow softer and larger as elements rise.

An elevation system needs about four levels and no more: flat (no shadow, use a border),
raised (cards), floating (dropdowns, popovers), and overlay (modals). Each level should
combine a tight dark shadow for contact with a wider soft shadow for ambient occlusion —
single-shadow elevation always looks cheap.

Borders and shadows are alternatives, not partners. Pick one per element.

Glassmorphism requires something worth seeing through. A \`backdrop-filter\` over a flat
background produces a slightly grey rectangle and costs real GPU time. Use it only over
imagery, gradients, or content that scrolls beneath — and always provide a solid fallback,
because backdrop blur is a common source of jank on low-end devices.

## Layout — owner: \`layout-composition\`

Break the symmetry of the content grid. Give one card in a set more prominence — a wider
span, a stronger surface, an image — because in real products one item genuinely does matter
more. An asymmetric grid where one tile spans two columns immediately reads as designed
rather than defaulted.

Let something break its container. An image that extends past the text column, a card that
overlaps a section boundary, a pull quote that hangs into the margin. One such moment per
page is enough, and it does more for perceived craft than any amount of polish elsewhere.

Vary section rhythm. Alternate full-bleed and contained sections. Not every section needs
the same max-width, and a page where they all do reads as a template.

Align optically, not mathematically. Icons, quotation marks and round shapes need slight
manual correction to *look* aligned; centring them by their bounding box makes them look
off. Circular avatars next to square thumbnails need the circle to be slightly larger to
appear the same size.

## States — owner: \`interface-states\`

An interface is not the happy path. Before a screen is finished it needs an empty state that
explains what will appear here and how to make it appear, a loading state that reserves the
space the content will occupy so nothing shifts, an error state that says what failed and
what to do next, and an overflow state tested with unreasonably long strings.

Test with realistic content, not placeholders. Design to the longest plausible name.

## Motion — owner: \`motion-design\`

Animate to explain, never to impress. Motion should tell the user where something came from,
that the system heard them, or that a relationship exists between two elements.

Exits must be faster than entrances. The user has already decided; making them watch the
departure is making them wait.

Never animate \`width\`, \`height\`, \`top\` or \`left\` — these force layout on every frame.
Use \`transform\` and \`opacity\`.

One scroll-triggered effect per page section at most, and never the same fade-up on every
element.

Every non-essential animation must be gated behind \`prefers-reduced-motion\`. This is an
accessibility requirement, not a nicety — large-area motion causes real physical symptoms.

When the moving thing is a real subject rather than an interface element, \`media-driven-motion\`
owns it: a photograph that fades up and drifts is still a photograph with a property on it.`,
      },
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

## Hue-sweep gradient surfaces
Buttons, heroes, and cards filled with a gradient whose stops sit 90 degrees or more apart in
hue. The stops were chosen for spread rather than for a light source, so the surface describes
no physical situation and the midpoint mixes to a muddy tertiary.
**Replace with:** a gradient inside one hue family — roughly 15 degrees of hue and 10 points of
lightness between stops — which reads as a lit surface rather than as a swatch pair.

## The three-card feature row
Exactly three (or six) equal cards, each with a small icon, a short title, and two lines of
body copy, centred under a centred section heading.
**Replace with:** an asymmetric grid where one item is genuinely larger because it is
genuinely more important; or a vertical list with real screenshots; or two columns with the
text on one side.

## The undifferentiated bento grid
A grid of rounded tiles at two or three sizes, where the sizes were assigned to tile the
rectangle neatly rather than to rank the content. Area reads as importance before anything is
read, so the largest tile teaches the viewer something the content does not support.
**Replace with:** a bento whose largest cell holds the one thing you would keep if you could
keep one, or a plain equal grid, which at least claims nothing.

## The fake terminal window
A macOS-style frame with three traffic-light dots wrapped around a code sample or a screenshot
on a marketing page. It frames the content in an application chrome the product does not have,
and the dots are inert controls in an interface that otherwise claims its controls work.
**Replace with:** the code on a tinted surface with a language label and a working copy button,
or a real screenshot at real device dimensions.

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

## Glass panels over flat fills
Blurred translucent panels — the liquid-glass treatment — floating above a solid background.
There is nothing behind the panel to sample, so the effect resolves to a faint tint while still
forcing the compositor to allocate and blur a backdrop texture every frame.
**Replace with:** an opaque tinted surface. Keep the blur for panels that sit over imagery or
over content that scrolls beneath, and ship a solid fallback for low-end devices.

## Centred everything
Every heading, every paragraph, every section centred.
**Replace with:** left-aligned body copy as the default. Centring works for short display
text and for genuinely symmetric compositions; centred paragraphs create a ragged left edge
that makes each line harder to find.

## Full-width prose
Paragraphs that span the whole viewport.
**Replace with:** a max-width around 65ch on any container holding sentences.

## The framework default typeface
Inter, Geist, or Space Grotesk, used because it was already configured. None of the three is a
bad typeface; the tell is that no alternative was weighed, which then shows up downstream as a
display setting that is a text face scaled up with no tracking correction.
**Replace with:** a choice you can name against one rejected alternative and one reason. Inter
for dense data UI because its x-height holds at 13px is a decision. Inter because the starter
template shipped with it is not.

## Low-contrast secondary text
Light grey on white for anything a user needs to read.
**Replace with:** a secondary tone that still clears 4.5:1. If the design "needs" the text
to recede further than that, the text should probably be removed.

## The purple-to-blue palette
The specific violet-indigo-cyan range that dominates generated output.
**Replace with:** a hue chosen for the subject. Anything works if the ramp is even and the
accent has one job.

## Rainbow-mapped colour
A set of siblings — feature icons, tags, nav entries, plan cards — each given a different hue.
Hue is the strongest categorical signal available, so spending it on items that differ only in
position asserts a taxonomy the content does not contain, and leaves no hue free to mark the
one item that genuinely differs.
**Replace with:** one hue for the whole set, with rank carried by size or weight. Reserve
distinct hues for distinct categories, at most three per view.

## Neon at full chroma
Every colour at the saturation ceiling, usually cyan, magenta, and lime over near-black. Once
the ceiling is the baseline nothing can be made more vivid, so emphasis falls back on size
alone; text at maximum chroma also fails contrast against both light and dark grounds, because
chroma contributes almost nothing to luminance.
**Replace with:** one high-chroma accent against desaturated neutrals. The accent reads as
brighter precisely because its surroundings are not.

## Pastel with no dark value
A palette whose lightest and darkest values sit within about 25 lightness points of each other
— mint, lilac, peach, cream. Nothing can be emphasised, because emphasis is contrast and the
range is already spent; secondary text and borders run out of room above 4.5:1 at the same time.
**Replace with:** keeping the pastels as surfaces and adding one value below 30% lightness to
carry text, borders, and the primary action.

## Pure white and true black
\`#fff\` surfaces with \`#000\` text, or the inverse. These are the two values a palette holds
when nobody defined one, and with the page already at 100% lightness there is no step left above
it, so cards, inputs, and popovers have to be separated by borders alone.
**Replace with:** a near-white around 98% lightness and a near-black around 15%, both tinted
with a chroma of roughly 0.005 to 0.01, and three surface steps between the page and the top
layer.

## The blue icon in the margin
A small blue or indigo icon to the left of every list item, feature row, and heading. Repeated
on every row it stops being emphasis and becomes a bullet with extra colour, while still
consuming the accent hue that the primary action needs in order to be found.
**Replace with:** an icon in the text colour at 60 to 70% opacity, or no icon. A bullet costs
less and aligns better.

## The multi-colour stripe
A 3 to 6px bar of three or four colours across the top of a page, card, or banner. The pattern
is borrowed from status and progress components, where a coloured edge means something; used
decoratively it carries no state and makes the stripes that do carry state unreadable.
**Replace with:** one colour when the stripe has a job — status, category, progress — and
nothing when it does not.

## Decorative blur blobs and radial orbs
Large soft coloured circles behind the hero, and the radial-gradient glow set behind a heading
or beneath a card. Both invent a light source that nothing else on the page obeys — shadows fall
the wrong way from it — and both put the brightest region of the page where no content is.
**Replace with:** nothing, usually. If the background needs interest, use a very low-contrast
geometric texture or real product imagery. A glow is legitimate only when it emanates from
something that would emit light, such as an active control or a video surface.

## Background dot grids
A repeating dot or line grid behind a hero, at low opacity. It is the highest spatial frequency
on the page, so it competes directly with the small text sitting on top of it, and it does not
survive scaling — the dots either moire against the pixel grid or vanish.
**Replace with:** a flat surface one tint step from the page, or one very low-contrast gradient.
Texture that must be there belongs at a scale larger than the type, not smaller.

## Sparkle icons
The four-point sparkle, standing for AI, magic, new, or nothing. It names no operation, so a
button carrying it tells the user only that something unspecified will happen, and it is now
attached to so many different features that it has no residual meaning to borrow.
**Replace with:** a word. If an icon is required, use one that depicts the operation, and keep
the sparkle for the single case where the feature is genuinely generative.

## Identical scroll animation on every element
Forty elements sharing one fade-up-on-enter.
**Replace with:** animating groups rather than items, with a compressed stagger, and only in
sections where the motion carries meaning.

## Hover animation on everything
Lift, scale, or glow on cards, stat tiles, headings, and icons that do nothing when clicked. A
hover response is a claim of interactivity; firing it on static content teaches the user that
motion under the cursor carries no information, after which the hover states that do mark
affordances stop being read.
**Replace with:** hover only where a click does something, one treatment per interactive type,
and no hover state at all on static content.

## Looping arrows and pulses
A bouncing scroll-down arrow, a pulsing ring around a CTA, a chevron that slides forever.
Peripheral motion is processed pre-attentively, so the loop re-takes attention on every cycle to
repeat something the layout already says.
**Replace with:** a static arrow, or nothing — a scrollable page already looks scrollable.
Reserve loops for indeterminate progress, where the repetition is the message.

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
      id: 'design-judgment/direction-follows-stated-product',
      strength: 'must',
      statement:
        'Name the audience, the product job, and one thing the product is deliberately not, before choosing a visual direction — and state them as assumptions if nobody has supplied them.',
      evidence: {
        rationale:
          'A visual direction is only correct relative to a product. With no stated product, the generative default is the most common pattern in training data — the centred hero, the three feature cards, the gradient CTA — which is the specific failure this skill exists to prevent. Stating what the product is not is what breaks that pull, because the pull is toward a template rather than away from a requirement, and a negative constraint is the only kind that blocks it. Assumptions stated in the report cost one correcting sentence; assumptions left implicit are discovered after the interface is built.',
        confidence: 'strong',
      },
      exceptions: [
        'A critique of an existing interface inherits the product context from the artefact under review, and inventing a different one rewrites the brief instead of reviewing the work.',
      ],
    },
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
      statement: 'Do not apply multi-hue gradients to heading text as a decorative effect.',
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
      exceptions: [
        'Dense data applications where a documented scale intentionally covers more levels.',
      ],
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
      statement:
        'Constrain any container holding prose to a maximum measure of about 75 characters.',
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
      statement:
        'Assign the accent colour exactly one semantic job, and do not use it for decoration.',
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
      statement: 'Do not apply backdrop blur over a flat background.',
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
      exceptions: [
        'Genuinely symmetric binary choices, such as accept and decline in a consent dialog.',
      ],
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
    {
      id: 'design-judgment/ornament-carries-information',
      strength: 'should-not',
      statement:
        'Do not add a visual element that carries no information — background dot grids, radial glow orbs, sparkle icons, multi-colour accent stripes, or decorative window chrome.',
      evidence: {
        rationale:
          'Every mark on a screen is read as a signal before it is read as decoration, and each of these marks is borrowed from a component where it did carry one: a status stripe, a progress bar, an application chrome, a generative-feature affordance. Used decoratively it spends attention on a claim the page cannot honour, and it devalues the same mark everywhere it is load-bearing. The cost is not the pixels, it is that the vocabulary stops being trustworthy.',
        confidence: 'strong',
      },
      exceptions: [
        'A mark specified by a documented identity system, where it reads as the brand rather than as a borrowed interface signal.',
        'Illustration and editorial art, which the viewer parses as an image rather than as interface.',
      ],
    },
    {
      id: 'design-judgment/tinted-neutrals',
      strength: 'should-not',
      statement:
        'Do not use pure white or pure black for surfaces, text, or borders, and keep at least three tint steps between the page and the topmost layer.',
      evidence: {
        rationale:
          'Pure white and pure black are the two values a palette contains when nobody defined one, which is precisely why they read as unfinished. With the page already at the end of the lightness range, no step remains above it, so cards, inputs, and popovers must be separated by borders instead of by surface — which is where the flat, outlined look comes from. A neutral ramp carrying a chroma of roughly 0.005 to 0.01 also binds the greys to the accent hue, and that is perceived as coherence rather than as colour.',
        confidence: 'strong',
      },
      exceptions: [
        'Print and e-ink output, where the substrate itself is the white point.',
        'OLED interfaces where true black is chosen for power or contrast, provided the surface step above it still exists.',
      ],
    },
    {
      id: 'design-judgment/palette-reserves-headroom',
      strength: 'must',
      statement:
        'Build the palette with at least one value below 30% lightness, one above 95%, and most surfaces below half the available chroma, so emphasis has somewhere left to go.',
      evidence: {
        rationale:
          'Emphasis is contrast, and contrast is spent out of a fixed range. An all-pastel palette has no value dark enough to make the primary action primary once body text has taken its 4.5:1; a palette pinned at the chroma ceiling has nothing that can be more vivid than its neighbours, because saturation is judged relatively. Both are legible and flat, which is the failure users describe as looking fine but nothing standing out.',
        confidence: 'strong',
      },
      exceptions: [
        'A single decorative region such as a hero wash or an illustration may sit inside a narrow band, provided the interface elements over it draw from the full range.',
        'Categorical data visualisation, where several series need maximum separation in hue and chroma simultaneously.',
      ],
    },
    {
      id: 'design-judgment/hue-not-mapped-to-position',
      strength: 'should-not',
      statement:
        'Do not give different hues to items that differ only in position, and keep a single view to at most three hue families.',
      evidence: {
        rationale:
          'A hue change is read as a category change, because hue is the strongest categorical cue the medium has. Mapping hues across a set of siblings — six feature icons, eight tags, a nav — therefore asserts a taxonomy the content does not have, and once six hues are in play there is no hue left that can mark the one item which actually is different.',
        confidence: 'strong',
      },
      exceptions: [
        'Data encodings with a legend, where the hue is the data.',
        'Colour used as a user-assigned label, as in calendars and project tags.',
      ],
    },
    {
      id: 'design-judgment/name-the-typeface-choice',
      strength: 'should',
      statement:
        'State the typeface choice against one rejected alternative and one reason, rather than inheriting whichever face the framework or template already configured.',
      evidence: {
        rationale:
          'A default is not a decision, and the absence shows up downstream: a face nobody chose is used at every size without the optical corrections a chosen face gets, because whoever did not pick it also did not read its metrics. Requiring the comparison is what makes the choice checkable. Landing on Inter is legitimate; landing on it without knowing what it beat is the tell.',
        confidence: 'opinion',
      },
      exceptions: [
        'A project whose design system specifies the face, where the choice was made upstream and reopening it is the error.',
      ],
    },
    {
      id: 'design-judgment/hover-implies-interactive',
      strength: 'must-not',
      statement:
        'Do not apply hover transitions — lift, scale, glow, colour shift — to elements that do not respond to a click or a key press.',
      evidence: {
        rationale:
          'A hover response is an affordance claim: the element is reporting that it can be operated. Firing it on static cards and stat tiles trains the user that motion under the cursor means nothing, after which the hover states that do mark real targets stop being read, and pointer users lose their only pre-click cue for what is clickable.',
        confidence: 'strong',
      },
      exceptions: [
        'A card that is itself one link or button, where the whole surface is the target.',
        'Hover that reveals genuinely deferred content, such as a tooltip or a row action.',
      ],
    },
    {
      id: 'design-judgment/no-decorative-loops',
      strength: 'should-not',
      statement:
        'Do not run a looping animation — a bouncing arrow, a pulsing ring, a shimmering border — outside an indeterminate-progress context.',
      evidence: {
        rationale:
          'Peripheral motion is processed pre-attentively, so a loop re-captures attention on every cycle whether or not it has anything new to report. In a progress context the repetition is the message; everywhere else it charges the user indefinitely to restate something the layout already states, and large-area looping motion is a documented trigger for vestibular symptoms.',
        confidence: 'established',
      },
      exceptions: [
        'Indeterminate loading, streaming, and live-connection indicators.',
        'Ambient motion in an explicitly decorative surface, gated behind prefers-reduced-motion.',
      ],
    },
    {
      id: 'design-judgment/cell-size-tracks-rank',
      strength: 'should',
      statement:
        'In a mixed-size tile layout such as a bento grid, no two cells may differ in area unless the content in them differs in importance.',
      evidence: {
        rationale:
          'Unequal cells are themselves a hierarchy claim, since area is read as importance before any content is read. When the sizes were chosen to tile the rectangle neatly, the claim is false and the viewer spends attention on the largest tile because the layout instructed them to. An equal grid asserts nothing, which is weaker but not wrong.',
        confidence: 'strong',
      },
      exceptions: [
        'Media galleries where cell size follows the intrinsic aspect ratio of the image.',
        'Dashboards where a cell is sized by the smallest area its chart stays legible in, making the sizing functional rather than expressive.',
      ],
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

  relatedSkills: [
    'responsive-architecture',
    'motion-design',
    'accessible-components',
    'design-tokens',
  ],
}
