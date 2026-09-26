# Craft values, and their owners

This skill asks whether a difference is doing a job. That question needs numbers to answer,
and the numbers belong to the skill that owns the domain. They are gathered here so a
judgment call can be settled without loading six skills, and each block names its owner so
the authoritative treatment is one hop away.

## Type — owner: `typographic-systems`

Setting `font-size` is not typography. Four adjustments separate typeset text from default
text, and all four are cheap.

**Tracking scales inversely with size.** Typefaces are fitted for reading sizes. Blown up to
display sizes that fitting looks loose, so display type needs negative letter-spacing,
around -0.02em at 3rem and above. Shrunk to caption sizes it looks cramped, so small text
needs slightly positive tracking.

**Leading scales inversely with size too.** Body text wants around 1.5 to 1.6. A 3rem
headline wants around 1.05 to 1.15. Applying `leading-relaxed` to a headline makes the lines
drift apart until the headline stops reading as one object.

**Measure has a ceiling.** Lines longer than about 75 characters cause the eye to lose its
place on the return sweep. A full-width paragraph on a 1440px screen runs to 150 characters
and is genuinely tiring to read. Constrain prose containers with a max-width in `ch`.

**Numbers need tabular figures** anywhere they align vertically or update in place — tables,
prices, timers, counters. Without `font-variant-numeric: tabular-nums`, digits have
different widths and columns visibly jitter.

## Colour — owner: `colour-systems`

Use one dominant hue, a neutral family, and at most one accent. Give the accent exactly one
job — usually "the primary action" — and never use it for anything else.

Neutrals should not be pure grey. Tinting them very slightly toward the brand hue, a chroma
of roughly 0.01 in OKLCh, makes the whole interface feel considered, and nobody can
consciously identify why. Pure `#808080` grey next to a warm brand colour looks accidental.

Semantic colours — success, warning, error — must never be the sole carrier of meaning.
Around one in twelve men cannot reliably distinguish red from green. Pair every semantic
colour with an icon, a label, or a shape.

## Depth — owner: `surface-and-depth`

Shadows model a light source. A page with a coherent light source has consistent shadow
direction, and shadows that grow softer and larger as elements rise.

An elevation system needs about four levels and no more: flat (no shadow, use a border),
raised (cards), floating (dropdowns, popovers), and overlay (modals). Each level should
combine a tight dark shadow for contact with a wider soft shadow for ambient occlusion —
single-shadow elevation always looks cheap.

Borders and shadows are alternatives, not partners. Pick one per element.

Glassmorphism requires something worth seeing through. A `backdrop-filter` over a flat
background produces a slightly grey rectangle and costs real GPU time. Use it only over
imagery, gradients, or content that scrolls beneath — and always provide a solid fallback,
because backdrop blur is a common source of jank on low-end devices.

## Layout — owner: `layout-composition`

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

## States — owner: `interface-states`

An interface is not the happy path. Before a screen is finished it needs an empty state that
explains what will appear here and how to make it appear, a loading state that reserves the
space the content will occupy so nothing shifts, an error state that says what failed and
what to do next, and an overflow state tested with unreasonably long strings.

Test with realistic content, not placeholders. Design to the longest plausible name.

## Motion — owner: `motion-design`

Animate to explain, never to impress. Motion should tell the user where something came from,
that the system heard them, or that a relationship exists between two elements.

Exits must be faster than entrances. The user has already decided; making them watch the
departure is making them wait.

Never animate `width`, `height`, `top` or `left` — these force layout on every frame.
Use `transform` and `opacity`.

One scroll-triggered effect per page section at most, and never the same fade-up on every
element.

Every non-essential animation must be gated behind `prefers-reduced-motion`. This is an
accessibility requirement, not a nicety — large-area motion causes real physical symptoms.

When the moving thing is a real subject rather than an interface element, `media-driven-motion`
owns it: a photograph that fades up and drifts is still a photograph with a property on it.
