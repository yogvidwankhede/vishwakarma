# Catalogue of generated-UI tells

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
`#fff` surfaces with `#000` text, or the inverse. These are the two values a palette holds
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
**Replace with:** transforms, or the `grid-template-rows: 0fr → 1fr` technique for
height-auto transitions.

## Missing states
Only the happy path exists.
**Replace with:** designed empty, loading, error, and overflow states for every screen that
loads data.
