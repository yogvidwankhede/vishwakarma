# Named styles, unpacked

Each entry gives the **commitments** (what the name obliges you to do), the **signature** (the
one decision that identifies it), and the **counterfeit tell** (what a page does when it is
wearing the name without the commitments). The tell is the most useful column: a style is faked
far more often than it is executed, and the fake is always recognisable in the same way.

Colour values belong to `colour-systems`, type values to `typographic-systems`, depth to
`surface-and-depth`, computed fields to `procedural-surfaces`. This file decides *which*
constraints a style imposes; those skills decide the numbers.

---

## Structural styles

**Swiss / International.** Commitments: an asymmetric grid with a visible column structure;
flush-left, ragged-right text; one grotesque at two or three weights; no ornament whatsoever;
whitespace measured in grid modules rather than eyeballed. Signature: the grid is legible in the
composition — you can see where the columns are without being shown them. *Counterfeit tell:
centred text.* Swiss is asymmetric by definition, and a centred headline is the single thing the
style forbids; Helvetica on white with everything centred is the most common impostor.

**Minimalism.** Commitments: reduction to what carries meaning, at most one accent, hierarchy
expressed almost entirely by space and scale. Signature: every remaining element is clearly
ranked. *Counterfeit tell: emptiness without rank.* Removing elements is easy; the difficulty is
that minimal work needs *more* deliberate hierarchy than dense work, because it has fewer
signals to carry it. A page with three elements of equal weight is not minimal, it is unfinished.

**Maximalism.** Commitments: deliberate density, multiple type families, layered pattern,
saturated palette, ornament as structure. Signature: abundance that still has a clear entry
point. *Counterfeit tell: uniform density.* Maximalism requires a dominant element more urgently
than minimalism does — without one, density becomes noise and the eye bounces. Busy is not
maximal.

**Editorial.** Commitments: magazine apparatus — deck, byline, drop cap or raised initial, pull
quotes that hang into the margin, images cropped to the grid, a headline-to-body scale ratio in
the region of 6 to 10. Signature: the type does the work; images support it. *Counterfeit tell:
framework-default heading sizes with a serif face.* Editorial is a scale relationship, not a
typeface choice.

**Brutalist (web).** Commitments: exposed structure, system or default faces, unstyled or barely
styled controls, visible borders, no decorative depth. Signature: the page looks like the
document it is. *Counterfeit tell: a carefully art-directed page with one monospace label.*

---

## Period styles

**Y2K.** Commitments: cool blue-silver palette, chrome gradients with a hard specular band,
visible bevels and inner shadow, translucent plastic, soft-cornered rectangles, glow behind
small type. Signature: the light source is a fluorescent tube, not the sun. *Counterfeit tell:
a violet-to-cyan gradient.* That palette is 2020s; Y2K is aqua, silver and cold blue.

**Retro mid-century.** Commitments: three or four spot inks with deliberate misregistration,
geometric illustration built from primitives, condensed sans or a slab, visible paper texture.
Signature: the palette is *limited by process*, and looks it. *Counterfeit tell: a sepia or warm
filter over a modern layout.* The constraint was the number of inks, not the temperature.

**Pop art.** Commitments: flat spot colour, heavy uniform black outline, Ben-Day dot fields,
one subject repeated with colour variation, speech-bubble or panel framing. Signature: the
outline. *Counterfeit tell: bright colours with no outline and no dot pattern.*

**Victorian.** Commitments: ornamental rules and frames, several contrasting display faces on
one surface, centred axial composition, engraved or hatched illustration, high pattern density.
Signature: the ornament is structural, not decorative trim. *Counterfeit tell: one decorative
face on an otherwise modern grid.* Note that this is the one style in this file where centring
is correct.

**Cyberpunk.** Commitments: high-chroma accents on near-black, neon reflected in wet or
metallic surfaces, dense layered signage in more than one writing system, condensed or monospace
type, atmospheric haze giving real depth. Signature: *depth* — the density recedes. *Counterfeit
tell: magenta and cyan on flat black.* Without reflection, layering and haze it is a colour
scheme, not a world.

**Futuristic (clean).** Commitments: reduced palette, thin strokes, wide tracking on uppercase,
precise geometry, large negative space, restrained glow. Signature: cleanliness — it is
cyberpunk's opposite, not its sibling. *Counterfeit tell: cyberpunk's palette on a sparse page.*

---

## Material and rendering styles

**Glass morphism.** Commitments: translucent layered panels, a light border catching the edge,
blur, and *something worth seeing through*. Signature: the backdrop is legible through the
panel. *Counterfeit tell: a blurred panel over a flat fill*, which is a tint that cost a
compositor pass. `surface-and-depth` has the correct implementation and
`procedural-surfaces` the refractive version.

**Clay / soft 3D.** Commitments: matte rounded volumes with no specular highlight, a single soft
key with a large source, pastel palette that still has a dark value, visible ambient occlusion
where forms meet. Signature: it looks moulded. *Counterfeit tell: flat shapes with a drop
shadow.* The absence of specular is what makes it clay, and occlusion is what makes it solid.

**Aurora.** Commitments: large soft luminous fields on a dark ground, low-frequency colour
movement, no hard edges anywhere, lightness range tight enough that overlaid text still passes
contrast. Signature: the light appears to come from within the surface. *Counterfeit tell: hard
radial blobs at high chroma* — the shape is the giveaway. This is a computed field; see
`procedural-surfaces`.

**Pixel art.** Commitments: a fixed pixel grid, integer scaling only,
`image-rendering: pixelated`, a declared limited palette, every pixel placed deliberately.
Signature: the grid survives at every size. *Counterfeit tell: non-integer scaling* — a 1.5x
factor resamples and produces half-lit edge pixels, which destroys the entire premise. This is
the least forgiving style in this file, because the failure is arithmetic rather than aesthetic.

**Vector art.** Commitments: flat fills or a single linear gradient, closed shapes, one stroke
weight across the set, correctness at any scale. Signature: it holds up at 16px and at 2000px.
*Counterfeit tell: inconsistent stroke weights across an icon set*, which is the most common
defect in generated icon sets.

**Surreal.** Commitments: impossible scale, juxtaposition or physics, rendered with *complete*
realism — consistent light, correct shadows, plausible materials. Signature: the realism is what
makes it unsettling. *Counterfeit tell: obviously illustrated strangeness*, which is just
illustration; surrealism depends on the viewer believing the surface.

---

## Hand and mixed-media styles

**Collage.** Commitments: visible edges — torn, cut, taped — deliberately mismatched resolutions
and print textures, off-axis rotation, overlapping planes with hard shadows to establish order.
Signature: the sources stay distinguishable. *Counterfeit tell: cleanly masked cut-outs in a
neat grid*, which removes the only thing collage is about.

**Graffiti / street.** Commitments: spray texture with overspray, hard outline plus offset
shadow on letterforms, high chroma against a dark or neutral substrate, layered overlap, a
visible real surface. Signature: the surface it is on is part of the image. *Counterfeit tell: a
graffiti-style font over a flat colour.*

**Bohemian.** Commitments: earthy desaturated palette, organic hand-drawn shape, layered textile
or paper texture, a serif or script paired with something plainer, asymmetric placement with
generous overlap. Signature: nothing is on a grid, but everything is balanced. *Counterfeit
tell: terracotta and sage applied to a rigid three-column layout.*

**Handwritten.** Commitments: genuine variation between instances of the same letter — baseline,
slant, weight, ligature. Signature: the irregularity is *per instance*. *Counterfeit tell: one
handwriting font used uniformly*, where every "a" is identical, which reads as fake within a
line of reading. Achieve variation with several glyph alternates and small per-element rotation,
or accept that it is a typeface and treat it as one.

---

## Using any of them

**Name the style before choosing values, and write down its three or four commitments.** That
list is now a contract, and `design-review` can check the page against it — a finding of the
form "the style claims Swiss and this section is centred" is far more actionable than "this
looks generic".

**One style per surface.** Two styles on one page is not eclecticism, it is an unmade decision.
Maximalism and collage can *contain* references to other styles, which is different: the
containing style still governs.

**The counterfeit tells are also a review pass.** For each style claimed, check its tell first —
it is the highest-yield question available, because it is the specific failure the style attracts.
