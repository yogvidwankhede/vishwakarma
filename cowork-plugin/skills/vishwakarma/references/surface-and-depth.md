# Surface & Depth

Depth is a claim about physics. A shadow asserts a light exists; an elevation asserts one
object floats above another; an inset asserts a surface is recessed. The claims only hold if
the whole page tells the same story. Where each shadow was chosen independently there is no
light source at all, and the result reads as stickers on paper rather than objects in space.

Commit to a lighting model, express it as tokens, and never let a component invent its own.

---

## 1. One light source, obeyed everywhere

Pick a light and hold it. The conventional choice is directly overhead and slightly in
front of the viewer, so every shadow has an x-offset of `0` and a positive y-offset. A
card offset `-4px` horizontally beside a dropdown offset `+4px` puts two suns in the
sky; nobody consciously notices, and everybody perceives it.

What varies with elevation is distance, not direction. As an object rises its shadow moves
down, spreads wider, and softens. Alpha grows only slightly, because ambient light does not
intensify as things rise.

Shadow colour should not be pure black — black at low alpha desaturates a tinted surface
and leaves a grey haze. Use the background hue driven to very low lightness, near
`hsl(250 40% 8% / 0.10)`, so it reads as occlusion rather than as dirt.

---

## 2. Four levels, two shadows each

Four levels are enough and five is a smell: **flat** (a border, no shadow), **raised**
(cards, resting buttons), **floating** (dropdowns, popovers, tooltips), and **overlay**
(modals, drawers, command palettes). Anything a fifth level would express is a
*state*: hover raises one level, pressed drops below resting.

Each level pairs two shadows, because real objects cast two. The **contact shadow** is
short, tight and comparatively dark: the occlusion where the object nearly meets the
surface, and the cue that tells the eye *how high* it is. The **ambient shadow** is large,
soft and faint: diffuse room light being blocked. Single-shadow elevation is always one or
the other, and both halves fail distinctively — tight-only reads as a hard-edged decal,
soft-only as fog with nothing casting it.

```css
--elevation-2: 0 2px 4px -2px rgb(16 18 32 / 0.10), 0 8px 16px -4px rgb(16 18 32 / 0.10);
```

Ratios that keep the ramp coherent: blur is twice the y-offset, spread is minus half the
blur so the shadow does not leak sideways past the silhouette, y-offset doubles per level.

---

## 3. Dark themes: shadows stop working

A shadow is visible because it is darker than its surroundings. On a near-black surface
there is almost no headroom below, so the token that reads clearly on white disappears at
`#111`, and raising the alpha only produces a smear with no perceptible edge.

Dark themes elevate with **surface lightness** instead. Each level lightens the surface by
roughly 3 points of L in OKLCh — base `0.17`, raised `0.21`, floating `0.25`, overlay
`0.29` — so a modal is *lighter* than the page rather than shadowed above it. Add a
hairline inset highlight, `inset 0 1px 0 rgb(255 255 255 / 0.06)`, which is light
catching the top face and separates stacked panels better than any shadow. Keep shadows at
the top levels as reinforcement, never as the sole cue.

---

## 4. Borders and shadows are two different sentences

A border says the element is flush with the surface and delineated by a line. An outer
shadow says it is lifted above it. Both at once describes two contradictory physical
situations and reads as indecision. Choose one per element; elevation-0 is where the
border does the work. The exception is a hairline holding an edge that would
otherwise vanish, such as a white card on a white page; keep it below 3:1 against the
surface so it reads as a rim light rather than a frame. Inset shadows are exempt: a recess
and a border describe the same object.

---

## 5. Glass, done properly

`backdrop-filter` samples what is painted behind an element and blurs it. Over a flat fill
every sample is identical, so the output equals the input: a tint that would have been
cheaper as a solid colour, while the compositor still allocates a backdrop texture and runs
multi-pass blur **every frame the backdrop or the element moves**. Cost scales with backdrop
area in device pixels, so a full-bleed sticky header on a 1440px screen at 3× DPR blurs
4320 device pixels wide per scroll frame — exactly where low-end GPUs fall below 60fps.

Glass is justified only where there is texture worth seeing: imagery, a gradient, or content
scrolling beneath. Keep the region small and the radius modest (8–20px), never animate the
radius, and never overlap two blurred elements — each triggers its own readback.

Legibility is the other half. The backdrop is user content and can be any luminance, so text
needs a semi-opaque fill behind it — roughly 0.6 to 0.75 alpha of the theme surface —
verified against pure white and pure black, not against the screenshot in front of you. Ship
the opaque version first and lower the alpha only inside
`@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px)))`.
Reversed, unsupporting browsers get translucent text over unknown content.

---

## 6. Gradients that are not decorative

Two defects make gradients look amateur.

**Grey mid-points.** Without a named interpolation space, stops mix component-wise in sRGB,
and the mean of opposing channels is neutral, so blue to yellow passes through literal
`#7f7f7f`. `linear-gradient(in oklab, #2563eb, #f5d90a)` keeps chroma along the run;
declare the plain gradient first as the fallback declaration. The same arithmetic is why
fading to the `transparent` keyword leaves a grey halo — `transparent` is transparent
*black*. Fade to the same colour at zero alpha instead.

**Banding.** An 8-bit channel has 256 steps, so a 1200px run between colours eight levels
apart paints 150px of flat colour per step, and lateral inhibition in the retina exaggerates
each step into a stripe. Dither it: noise at 2–4% opacity randomises which side of the
quantisation boundary each pixel lands on, and the eye averages it back to a ramp. A tiled
`feTurbulence` SVG at 128px or larger, `pointer-events: none`, is enough.

---

## 7. Radius nesting is arithmetic, not taste

Two rounded rectangles look concentric only when `inner = outer − padding`. A card with a
16px radius and 8px of padding needs an 8px radius on whatever sits inside it.

Reusing the outer radius inside is the common error, and its signature is measurable: with
equal radii the visible gap at the 45° diagonal widens to `padding × √2`, so 8px of
padding reads as 11.3px at the corners and 8px along the edges, and the corner appears to
bulge. A sharp inner corner inside a rounded outer produces the opposite pinch.

Radius should also scale with element size: 6px on a 32px button and 20px on a 600px modal
express the same material thickness, while 12px on both makes the button soft and the modal
sharp.

---

## 8. Inset light for tactile controls

Pressable controls take a top inset highlight, `inset 0 1px 0 rgb(255 255 255 / 0.12)` —
light catching the upper bevel — plus a contact shadow below. Pressing inverts the model:
drop the outer shadow, add `inset 0 2px 4px rgb(0 0 0 / 0.16)`, and translate the label
down 1px so the surface sinks. Recessed elements — inputs, wells, slider tracks — take the
inset alone, because a recess casts nothing.

---

## The failures, named

**One shadow everywhere**, on cards, dropdowns and modals alike: not an elevation system, a
decoration. **Glass over a flat background**: blur cost paid, a tint gained. **One radius
token** from avatar to modal, nested corners visibly fighting. **Banded hero gradients**:
large, low-delta, ungrained. **Border plus shadow**: two physical stories on one element.
**Dark-theme shadows** carried over from the light theme, invisible on `#111`, leaving
every panel at apparently the same depth.

## Rules

### MUST NOT — Do not apply backdrop-filter over a flat, static fill.

*Why:* A backdrop filter blurs a snapshot of what is painted behind the element. Over a uniform fill every sample is identical, so the blur output equals its input and only the element tint remains visible — while the compositor still allocates a backdrop texture and runs the blur passes on every frame that invalidates it.

### MUST NOT — Do not animate or transition the radius of a backdrop-filter or filter blur.

*Why:* A blur radius change invalidates the cached filter result, forcing the compositor to re-sample the backdrop and re-run every blur pass on each frame. The cost scales with the filtered area in device pixels, which is why it drops frames on high-DPR mobile displays specifically.

*Exceptions:*
- A one-off transition over a small region, measured on a low-end device and confirmed to hold frame budget.

### MUST NOT — Do not fade a gradient to the `transparent` keyword; fade to the same colour at zero alpha instead.

*Why:* The `transparent` keyword resolves to transparent black, so an sRGB gradient interpolating toward it drags the colour toward black as alpha falls, producing a visible grey or brown halo through the middle of the fade.

Incorrect:

```css
background: linear-gradient(to top, #1a1a2e, transparent);
```

Correct:

```css
background: linear-gradient(to top, rgb(26 26 46 / 1), rgb(26 26 46 / 0));
```

### MUST — Give every shadow in the interface the same directional origin — conventionally x-offset 0 with a positive y-offset — and vary only distance, blur, and spread across elevations.

*Why:* A shadow encodes the position of a light. Shadows that disagree on direction describe multiple simultaneous light sources, which cannot occur in a single scene, so the depth cue fails and elements read as flat cut-outs rather than raised objects.

*Exceptions:*
- A single hero illustration or product render that deliberately models its own scene lighting, contained within its own bounds.

Incorrect:

```css
.card { box-shadow: -4px 4px 12px rgb(0 0 0 / 0.15); }
.menu { box-shadow: 4px 8px 20px rgb(0 0 0 / 0.15); }
```

Correct:

```css
.card { box-shadow: var(--elevation-1); }
.menu { box-shadow: var(--elevation-2); }
```

### MUST — Compose each elevation level from at least two shadows: a tight, darker contact shadow and a wider, softer ambient shadow.

*Why:* A real object occludes direct light near its footprint, producing a sharp contact shadow, and blocks diffuse ambient light over a much larger area. A single shadow can only approximate one of the two, so it either reads as a hard decal or as fog with no visible cause.

Incorrect:

```css
--elevation-2: 0 4px 12px rgb(0 0 0 / 0.15);
```

Correct:

```css
--elevation-2: 0 2px 4px -2px rgb(16 18 32 / 0.10), 0 8px 16px -4px rgb(16 18 32 / 0.10);
```

### MUST — In dark themes, express elevation by raising surface lightness roughly 3 points of L per level, and treat any shadow as reinforcement rather than the primary cue.

*Why:* A shadow is perceived as a local reduction in luminance. On a surface already near the bottom of the range there is almost no headroom below it, so the shadow cannot produce a perceptible luminance difference no matter how its alpha is tuned.

Incorrect:

```css
[data-theme='dark'] .modal { background: #111; box-shadow: 0 24px 48px rgb(0 0 0 / 0.5); }
```

Correct:

```css
[data-theme='dark'] .modal { background: oklch(0.29 0.014 250); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06), 0 24px 48px -12px rgb(0 0 0 / 0.55); }
```

### MUST — Ship an opaque background first and add backdrop blur only inside an @supports guard testing both the prefixed and unprefixed property.

*Why:* A browser that ignores backdrop-filter still applies the lowered background alpha, leaving text over unfiltered page content at unpredictable contrast. Declaration order plus the feature query guarantees the translucent value only ever takes effect where the blur that justifies it exists.

Incorrect:

```css
.bar { background: rgb(255 255 255 / 0.6); backdrop-filter: blur(12px); }
```

Correct:

```css
.bar { background: rgb(255 255 255 / 0.92); }
@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px))) {
  .bar { background: rgb(255 255 255 / 0.68); backdrop-filter: blur(12px) saturate(1.4); }
}
```

### MUST — Verify text on a glass surface against both a pure white and a pure black backdrop, keeping the surface fill opaque enough to clear 4.5:1 in both cases.

*Why:* The backdrop behind a translucent panel is page content or user media and can be any luminance. Contrast measured against one sample backdrop says nothing about the worst case, and the worst case is what a user scrolling an image gallery will actually encounter.

*Source:* [WCAG 2.2 Success Criterion 1.4.3 (Contrast (Minimum))](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

### MUST — Set the radius of a nested element to the parent radius minus the padding between them.

*Why:* Two rounded rectangles are concentric only when their corner arc centres coincide, which requires inner radius equals outer radius minus offset. Reusing the outer radius inside widens the visible gap at the 45-degree diagonal to padding times the square root of two — 8px of padding reading as 11.3px at the corners — so the corner appears to bulge.

*Exceptions:*
- Padding greater than the outer radius, where the outer curve no longer constrains the inner element and a square inner corner is correct.

Incorrect:

```css
.card { border-radius: 16px; padding: 8px; }
.card > .thumb { border-radius: 16px; }
```

Correct:

```css
.card { border-radius: 16px; padding: 8px; }
.card > .thumb { border-radius: 8px; }
```

### MUST — Reference elevation through named tokens and never write a literal box-shadow value inside a component.

*Why:* Consistency of light direction and shadow ramp is a global property that cannot be maintained by local decisions. A literal shadow in a component is invisible to the theme layer, so it cannot be adjusted for dark mode and will silently diverge from the system as the ramp is retuned.

### SHOULD NOT — Do not define more than four elevation levels — flat, raised, floating, and overlay.

*Why:* Elevation communicates a stacking relationship, and users can only distinguish a handful of depth planes without explicit comparison. Additional levels add tokens without adding perceptible information, and they invite components to pick a level by appearance rather than by role.

*Exceptions:*
- Canvas or editor products where nested floating panels genuinely stack more than three deep.

### SHOULD NOT — Do not apply a visible border and an outer drop shadow to the same element.

*Why:* A border states that the element is flush with its parent surface and bounded by a line; an outer shadow states that it is lifted above that surface. Asserting both describes two incompatible physical arrangements, and the eye resolves the conflict by trusting neither.

*Exceptions:*
- A hairline below 3:1 contrast used purely to hold an edge that would otherwise disappear against a same-tone background.
- Inset shadows, which describe a recess and legitimately coexist with a border on inputs and wells.

### SHOULD — Derive shadow colour from the background hue at very low lightness rather than using pure black.

*Why:* Pure black at partial alpha reduces the saturation of everything beneath it, so a shadow over a tinted surface leaves a desaturated grey patch that reads as grime instead of as occlusion. Occlusion in reality removes light without removing hue.

### SHOULD — Name an interpolation space such as `in oklab` on any gradient whose stops differ in hue.

*Why:* Unqualified gradients mix stops component-wise in sRGB, and averaging opposing channels lands on neutral, so a blue-to-yellow gradient passes through literal grey at its midpoint. A perceptually uniform space keeps chroma along the whole path.

*Source:* [CSS Color Module Level 4, colour interpolation](https://developer.mozilla.org/en-US/docs/Web/CSS/color-interpolation-method)

*Exceptions:*
- Gradients between two stops of the same hue that differ only in lightness or alpha.

Incorrect:

```css
background: linear-gradient(90deg, #2563eb, #f5d90a);
```

Correct:

```css
background: linear-gradient(90deg, #2563eb, #f5d90a);
background: linear-gradient(in oklab 90deg, #2563eb, #f5d90a);
```

### SHOULD — Add a noise overlay at 2–4% opacity to any gradient running more than about 400px across a colour delta under roughly 16 levels per channel.

*Why:* An 8-bit channel quantises a gradient into bands whose width is the run length divided by the number of levels crossed, and lateral inhibition in the retina exaggerates each step edge. Noise of roughly one quantisation step in amplitude randomises which side of the boundary each pixel falls on, and the eye averages it back to a smooth ramp.

### SHOULD — Scale border radius with element size across a small radius scale rather than applying one radius value to every surface.

*Why:* A radius reads as the thickness of the material rounding off at the edge, so the same absolute value looks pillowy on a 32px control and nearly sharp on a 600px panel. Scaling the radius keeps the implied material consistent across sizes.

### SHOULD — Give pressable controls a top inset highlight with an outer contact shadow, and invert to an inset shadow with a 1px downward shift on the active state.

*Why:* With an overhead light, a raised object catches light on its upper face and casts a shadow below; a depressed one loses the highlight and receives shadow from its own rim. Inverting both cues on press matches the physical model the rest of the elevation system already asserts, which is why it reads as tactile rather than as a colour change.

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm the elevation system models one coherent light source. (blocking)

- List every distinct box-shadow value in the output. Do they all share the same x-offset sign and a positive y-offset?
- Does every elevation level contain at least two shadows, one tight and one wide?
- How many distinct elevation levels exist? If more than four, which two collapse?
- Is any box-shadow written as a literal value rather than a token reference?

### Confirm dark-theme depth does not depend on shadows. (blocking)

- With every shadow removed, can you still tell a modal from a card from the page background?
- What is the lightness step between adjacent dark surfaces? Is it between 2 and 5 points of L?
- Do raised dark surfaces carry a top inset highlight?

### Confirm every backdrop-filter is justified, guarded, and legible. (blocking)

- For each backdrop-filter, what is actually behind it — imagery, a gradient, or scrolling content? If it is a flat fill, why is it not a solid colour?
- Is the opaque background declared before the @supports block, and does the block test both the prefixed and unprefixed property?
- Does the text on the glass surface clear 4.5:1 against a pure white backdrop and against a pure black one?
- Does any blur radius animate, and do two backdrop-filtered elements overlap?

### Confirm gradients are smooth and correctly interpolated.

- For each gradient, do the stops differ in hue, and if so is an interpolation space named?
- Does any gradient fade to the transparent keyword rather than to a matching colour at zero alpha?
- For the largest gradient, divide its pixel length by the number of 8-bit levels it crosses. Is the result above 4px per band, and if so is it dithered?

### Confirm nested corners are concentric.

- For every rounded element inside another rounded element, does inner radius equal outer radius minus padding?
- How many distinct radius values are in use, and does the value chosen for each element relate to that element size?

### Evaluate surfaces and depth against the project Design Contract. (blocking)

Evaluate the output against the project Design Contract (surface section).

Run `vishwakarma audit` if the project has the CLI available.

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/elevation-tokens.md` — What are the actual token values for a four-level elevation system in light and dark themes, including surfaces, borders, glass, and the pressed and recessed states?
- `references/gradient-construction.md` — How do I build a gradient with a correct interpolation space, an easing curve, and enough dithering that it does not band on a large surface?
