# Catalogue of generated-UI tells

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
**Replace with:** transforms, or the `grid-template-rows: 0fr → 1fr` technique for
height-auto transitions.

## Missing states
Only the happy path exists.
**Replace with:** designed empty, loading, error, and overflow states for every screen that
loads data.
