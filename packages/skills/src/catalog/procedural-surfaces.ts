// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * The visual effects that read as expensive are per-pixel programs, and nothing here covered them.
 *
 * `surface-and-depth` owns depth that CSS can express: paired shadows, elevation by lightness,
 * concentric radii, dithered gradients, \`backdrop-filter\` glass. That boundary is exactly where
 * the interesting work starts. CSS glass *averages* what is behind it, which is why it reads as
 * frosted plastic; real glass *displaces* what is behind it as a function of surface curvature,
 * and no CSS property can do that. A CSS gradient interpolates between stops; a computed colour
 * field evaluates a function at every pixel, which is why one bands and the other does not.
 *
 * Searching the catalogue for "fragment shader", "ShaderMaterial", "gl_FragColor", "simplex",
 * "fbm", "displacement map", "ASCII" and "halftone" returned nothing on the web side — only
 * `vishwakarma-studios` mentions GLSL, for game materials. So an agent asked for the look of a
 * shader-driven reference site had no technique to reach for and no cost model to respect.
 *
 * The cost model is the part that makes this shippable rather than aspirational.
 * \`SCENE_BUDGETS.postProcessingPasses\` is 0 at tier none, **0 at low**, 1 at medium and 3 at
 * high. A fullscreen shader pass is therefore a high-tier enhancement over a designed static
 * surface, never the surface itself — which is the same finished-and-honest discipline the rest
 * of the catalogue applies, aimed at the thing people most want to skip it for.
 */
export const proceduralSurfaces: SkillManifest = {
  vsm: '1.0',
  id: 'procedural-surfaces',
  name: 'Procedural Surfaces',
  description:
    'Use when a surface must be computed per pixel — refractive glass, noise colour fields, flow displacement, ASCII or halftone, generative SVG.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'ui',
  tags: [
    'shader',
    'glsl',
    'refraction',
    'noise',
    'flow-field',
    'ascii',
    'halftone',
    'generative',
    'fill-rate',
  ],

  activation: {
    intents: [
      'building refractive or liquid glass, where the backdrop must distort rather than blur',
      'building a colour field or gradient that cannot band and can move without animating the DOM',
      'displacing a logo, photograph or type along a flow field',
      'rendering an image as ASCII, blocks, a halftone dot grid, or fitted geometric primitives',
      'a shader-driven surface is slow, banding, or broken on a phone',
      'reproducing the look of a shader-heavy reference site without copying its code',
    ],
    globs: [
      '**/*.glsl',
      '**/*.frag',
      '**/*.vert',
      '**/*.wgsl',
      '**/*shader*.{ts,tsx,js,jsx}',
      '**/*.tsx',
    ],
    keywords: [
      'shader',
      'fragment shader',
      'glsl',
      'liquid glass',
      'refraction',
      'shader gradient',
      'noise',
      'fbm',
      'flow field',
      'displacement',
      'ascii art',
      'halftone',
      'dither',
      'generative',
      'procedural',
    ],
    requires: ['webgl-experiences'],
  },

  content: {
    summary:
      'Compute a surface per pixel only where CSS cannot: refraction displaces rather than blurs, a noise field cannot band, a glyph ramp needs measured coverage. Budget by fill rate, layer every pass over a designed still, and write the shader yourself.',

    body: `# Procedural Surfaces

Some surfaces cannot be declared, only computed. The test for whether you are in this skill's
territory is precise: **does the effect need to know about a pixel's neighbours, or about a
function evaluated at that pixel?** If it does, no CSS property expresses it.

Two examples make the boundary concrete. \`backdrop-filter: blur()\` *averages* what is behind a
panel, which is why CSS glass reads as frosted plastic rather than as glass — real glass
*displaces* the backdrop as a function of surface curvature, and displacement needs a
neighbourhood lookup. A CSS gradient *interpolates* between stops, so it bands on any gentle
transition; a computed field *evaluates* a function per pixel, so it cannot.

Everything else in this skill is a variation on those two moves: sample the backdrop somewhere
else, or evaluate something per pixel.

---

## 1. The cost is fill rate, and the budget is already written down

A fullscreen fragment shader costs *pixels × instructions per pixel*, and nothing else about
your scene matters. At device pixel ratio 2 on a 1440×900 viewport that is 10.4 million
fragments per frame, every frame.

\`SCENE_BUDGETS.postProcessingPasses\` from \`@vishwakarma/three\` is **0 at tier none, 0 at low,
1 at medium, 3 at high**. Read that honestly: on the device class that carries most traffic, the
budget for a fullscreen pass is zero. So the designed static surface is not the fallback — it is
the primary artefact, and the shader is an enhancement layered over it at high tier.

Two levers actually work, in this order. **Resolution**: render the effect to a half-resolution
target and upscale; fill cost falls with the square, and for a soft field nobody can tell. The
tier's own \`dpr\` range already encodes this — low tier is [0.75, 1]. **Instruction count**:
three octaves of noise instead of six. Beyond about four octaves the detail is below a pixel and
you are paying for nothing.

---

## 2. Write the shader yourself

Shader code is copyrighted like any other code, and a snippet pasted from a repository, a blog
or a shader playground arrives with its licence and its author's name attached. Name the
*technique* — refraction by gradient displacement, fractional Brownian motion, luminance
quantisation — and implement it from the mechanism. The mechanisms are mathematics and are not
ownable; the implementations are.

This repository's \`audit-originality.mjs\` is a tripwire for the mechanical signs of a paste: a
foreign copyright line, an embedded licence block, an \`adapted from\` comment. It fails the
build so a human looks. It is not a plagiarism detector and cannot be one, so it does not
replace the discipline — it only catches the careless version.

---

## 3. The four technique classes

**Refraction** — displace a sampled backdrop by the gradient of a height field, and sample the
three channels at slightly different offsets for dispersion. That chromatic separation at the
edges is what sells glass; blur alone never will. \`refractive-glass.md\`.

**Computed colour fields** — evaluate smooth noise per pixel to get a gradient with no stops and
no banding, which can also move without animating a single DOM node. The technique is neutral;
the *palette* is where these go wrong, so sample a ramp from \`colour-systems\` rather than
inventing hues in the shader. That is the whole difference between this and the violet-to-cyan
tell. \`computed-fields.md\`.

**Flow displacement** — advect texture coordinates along a vector field so a logo or photograph
appears to flow. Derive the offset from a time uniform; never accumulate it, or the surface
drifts and cannot be paused or reversed. \`flow-displacement.md\`.

**Quantisation and decomposition** — reduce an image to one sample per cell and map each sample
to a glyph, a dot, or a primitive. This one needs no WebGL at all, which makes it the cheapest
technique here and the only one whose output can *be* real text. \`quantised-images.md\`.

---

## 4. What every one of them owes

A **designed still** that is the real content, at the same reserved aspect ratio, shipping before
any shader initialises. Under \`prefers-reduced-motion: reduce\`, **freeze the time uniform and
keep rendering** — a frozen field is still a surface, and removing it is a bigger change than
the preference asked for. Keep coordinates small: \`highp\` precision is not guaranteed in
fragment shaders on mobile GPUs, and noise fed large-magnitude inputs bands or breaks in ways
that never appear on a desktop. And verify the result by rendering it — \`visual-feedback-loop\`
owns that, and a shader is the clearest case of something you cannot evaluate from source.

---

**Boundaries.** \`surface-and-depth\` owns every depth effect CSS can express, including
\`backdrop-filter\` glass and dithered gradients — go there first, and come here only when the
effect needs a neighbourhood. \`webgl-experiences\` owns mounting, tiering and fallback for the
canvas that hosts these. \`colour-systems\` owns every colour a field samples.
\`media-driven-motion\` owns motion sampled from recorded frames rather than computed.
\`rendering-performance\` owns the page's other costs. \`vishwakarma-studios\` owns shaders inside
a game's render loop.`,

    references: [
      {
        id: 'refractive-glass',
        title: 'Refraction: displacing a backdrop rather than blurring it',
        answers:
          'How do I make glass that distorts what is behind it, where does the backdrop texture come from, and what does it cost?',
        content: `# Refraction

## Why CSS glass reads as plastic

\`backdrop-filter: blur(12px)\` convolves the backdrop with a symmetric kernel. Every output
pixel is an average of its neighbours, so the result is *softer* in the same place. Glass does
something different: it bends light, so the backdrop appears *somewhere else*, and how far it
moves depends on the angle of the surface. Averaging and displacing are different operations and
the eye distinguishes them immediately, which is why CSS glass is recognisable as an effect
rather than as a material.

\`surface-and-depth\` covers when CSS glass is the right answer — over imagery, with a solid
fallback, never over a flat fill. This file covers the case where it is not enough.

## The mechanism

Model the panel as a **height field**: a function giving surface elevation across the panel. A
rounded-rectangle bevel is height 1 in the interior falling smoothly to 0 across a border band.

The surface normal points along the gradient of that height. Where the field is flat the
gradient is zero and light passes straight through; where it falls steeply the gradient is large
and light bends hardest. So the whole effect is one line of intent: **offset the backdrop sample
by the gradient of the height field.**

\`\`\`glsl
// Central differences give the gradient; 'texel' is one pixel in UV units.
float hL = height(uv - vec2(texel.x, 0.0));
float hR = height(uv + vec2(texel.x, 0.0));
float hD = height(uv - vec2(0.0, texel.y));
float hU = height(uv + vec2(0.0, texel.y));
vec2  grad = vec2(hR - hL, hU - hD);

vec2 offset = grad * strength;
vec3 colour = texture(backdrop, uv + offset).rgb;
\`\`\`

That already reads as glass. Two additions make it convincing.

**Dispersion.** Real glass refracts short wavelengths more than long ones. Sample the three
channels at slightly different offsets:

\`\`\`glsl
float r = texture(backdrop, uv + offset * 0.94).r;
float g = texture(backdrop, uv + offset * 1.00).g;
float b = texture(backdrop, uv + offset * 1.06).b;
\`\`\`

A few per cent of separation is enough. This is the single detail that separates convincing glass
from a wobble, and it is invisible in the middle of the panel and obvious at its edges — which
is correct, because that is where the gradient is large.

**Edge light.** The gradient magnitude is already a rim mask: \`length(grad)\` is near zero in the
interior and peaks on the bevel. Add a small amount of it as a highlight, tinted toward the
scene's light direction, and the panel gains a physical edge instead of a border.

Keep a little blur as well. Real glass is not perfectly clear, and blur plus displacement reads
better than either alone.

## Where the backdrop texture comes from

This is the constraint that decides feasibility, and it has three answers.

**A render target.** Draw the scene behind the panel into a framebuffer, then draw the panel
sampling it. Correct, live, and it costs one extra pass — which means at low tier, where the
budget is zero passes, it does not happen.

**An SVG filter.** \`feDisplacementMap\` driven by an \`feTurbulence\` or a supplied image does
displacement with no WebGL at all, and it composites with ordinary DOM content. The limitation is
real: the displacement map is authored, not derived from a live height field, and browser support
for filtering live backdrop content is inconsistent. Good for a decorative panel over a known
image; not for glass over arbitrary scrolling content.

**A snapshot.** Capture the backdrop once, refract that. Cheap and correct until anything behind
the panel moves, at which point the glass is showing a stale world — acceptable for a modal over
a frozen page, wrong for a floating panel over a scrolling one.

## Cost and honesty

One pass, plus a texture the size of the panel's backdrop. The panel is small relative to the
viewport, so fill cost is modest — but the render target is not free, and on a phone the extra
framebuffer allocation is often the larger cost.

Under \`prefers-reduced-motion\`, a static refraction is fine: it is not motion. If the height
field animates, freeze it.

The fallback is \`surface-and-depth\`'s CSS glass, then a solid surface. Both are designed
surfaces rather than degradations, which is what makes it safe to gate the shader at high tier.`,
      },
      {
        id: 'computed-fields',
        title: 'Colour fields: smooth noise, banding, and where the palette tell comes from',
        answers:
          'How do I build a gradient that cannot band and can move without animating the DOM, and how do I keep it from looking like every other AI-generated hero?',
        content: `# Computed colour fields

## Why a computed field cannot band

A CSS gradient interpolates between stops in 8-bit output. A gentle transition across 1400 pixels
with only a few dozen distinguishable steps available lands many pixels on the same quantised
value, and the eye is extremely good at finding those edges — hence the bands, and hence
\`surface-and-depth\`'s dithering advice.

A computed field evaluates a continuous function at every pixel, so adjacent pixels differ by a
sub-quantum amount and the quantisation error scatters rather than aligning into contours. Add a
little ordered dither at the end and the banding is gone entirely rather than reduced.

## Fractional Brownian motion, and why three octaves

The standard construction for a natural-looking field is a sum of a smooth noise function at
doubling frequencies and halving amplitudes:

\`\`\`glsl
float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    sum += amp * noise(p);
    p   *= 2.0;
    amp *= 0.5;
  }
  return sum;
}
\`\`\`

The octave count is a fill-rate decision, not a quality one. Each octave doubles the spatial
frequency, so once an octave's features are smaller than a pixel it contributes noise the display
cannot resolve — it costs instructions and returns aliasing. For a full-viewport background field,
**three octaves is usually the visible limit and four is generous.** Six is a number copied from
terrain generation, where the camera gets close enough for it to matter.

Write \`noise\` yourself. Gradient noise is a published mathematical construction — a hash to
pseudo-random gradients at lattice points, a dot product with the offset, a smooth interpolation
— and implementing it from that description takes a few lines. Pasting one takes its licence with
it.

## Where these go wrong, and it is not the technique

Every violet-to-cyan hero on the internet uses this technique correctly. The tell is not the
noise; it is that the hues were chosen inside the shader, where no palette discipline reaches.

**Sample the ramp instead.** Pass the project's own colour ramp in as a small texture or a
uniform array, and use the field value to index it:

\`\`\`glsl
float t = clamp(fbm(uv * scale + vec2(time * 0.02, 0.0)), 0.0, 1.0);
vec3 colour = texture(ramp, vec2(t, 0.5)).rgb;
\`\`\`

Now the field's colours are the system's colours by construction. A monochromatic ramp — see
\`colour-systems\`' \`colour-schemes.md\` — produces a field that reads as material rather than as
a gradient, because there is no hue travel to give it away.

Two more disciplines that follow from the rest of the catalogue:

- **Build the ramp in a perceptual space, not in the shader.** Interpolating in linear RGB
  between two saturated hues passes through a desaturated middle; that grey band is a giveaway.
  Generate the ramp with \`@vishwakarma/core\`'s colour maths, upload the result.
- **Check contrast against the field, not against its average.** Text over a moving field has a
  *different* backdrop every frame. Either the text sits on a solid plate, or the field's
  lightness range is clamped tight enough that the worst case still passes — and the worst case
  is what you must measure.

## Motion without animating anything

Advance one \`time\` uniform and the whole field moves, with no DOM animation, no layout, and no
per-element work. This is the cheapest large-area motion available, which is precisely why it
needs the discipline: it is large-area motion, so \`prefers-reduced-motion: reduce\` must freeze
the uniform. Freeze it, do not remove the field — a still field is a perfectly good surface, and
substituting a flat colour is a larger change than the preference requested.

Derive the offset from the time uniform rather than accumulating it between frames. An
accumulator cannot be paused and resumed to the same state, cannot be scrubbed, and drifts
between tabs that were backgrounded.

## Precision, and the bug that only appears on phones

\`highp\` float precision is not guaranteed for fragment shaders on mobile GPUs. A noise function
fed coordinates in the thousands — a large \`scale\`, or a \`time\` that has been running for
minutes — loses mantissa bits and the field visibly quantises into blocks or freezes. Keep
coordinates small: scale UVs modestly, and wrap the time uniform with \`mod(time, 1000.0)\` before
it enters the shader. This never reproduces on the machine that built it.`,
      },
      {
        id: 'flow-displacement',
        title: 'Flow fields: advecting an image or a logo along a vector field',
        answers:
          'How do I make a logo or photograph appear to flow, and how do I keep it pausable and reversible?',
        content: `# Flow displacement

## The mechanism

Displacement is one idea applied to a different input. Instead of offsetting a backdrop by a
height gradient, offset a *texture's own* coordinates by a vector field, so the image appears to
be carried along by a current.

\`\`\`glsl
vec2 flow(vec2 p, float t) {
  // A divergence-free-ish field: perpendicular to the gradient of a scalar noise.
  float n  = fbm(p * 1.7 + vec2(0.0, t * 0.05));
  float nx = fbm(p * 1.7 + vec2(0.01, t * 0.05)) - n;
  float ny = fbm(p * 1.7 + vec2(0.0, 0.01 + t * 0.05)) - n;
  return vec2(-ny, nx);            // rotate 90 degrees: flows around, not outward
}

vec2 uvFlowed = uv + flow(uv, time) * amount;
vec3 colour   = texture(source, uvFlowed).rgb;
\`\`\`

The 90-degree rotation is the detail that matters. The raw gradient of a noise field points
*uphill*, so displacing along it makes the image bulge and pinch — it looks like heat haze. The
perpendicular is tangent to the contours, so the image slides *along* them, which reads as flow.

## Keep it derived, never accumulated

The tempting implementation feeds each frame's output back in as the next frame's input, which
gives beautiful long smears. It also makes the surface a function of its own history, and that
costs four things: it cannot be paused and resumed to the same state, it cannot be scrubbed or
reversed, it diverges between a tab that stayed open and one that was backgrounded, and it cannot
be reproduced for a screenshot comparison — so \`visual-feedback-loop\` cannot check it.

\`media-driven-motion\` states the same rule for scroll-driven media, and it holds for the same
reason: **derive from a parameter, never integrate.** If long smears are genuinely the effect,
get them by sampling the flow field at several offsets along the streamline within a single
frame, which is deterministic:

\`\`\`glsl
vec3 sum = vec3(0.0);
for (int i = 0; i < STEPS; i++) {
  float s = float(i) / float(STEPS);
  sum += texture(source, uv + flow(uv, time) * amount * s).rgb;
}
vec3 colour = sum / float(STEPS);
\`\`\`

\`STEPS\` multiplies the texture fetches, so it is a fill-rate decision: four to six is usually
enough, and the cost is linear in it.

## Applying it to a logo

A logo is the hardest case because it is the one image whose shape is not yours to distort.

- **Displace inside the mark, not its silhouette.** Keep the alpha channel unflowed and flow only
  the colour inside it, so the outline stays exact and the interior moves. Sample the source's
  alpha at the *undisplaced* coordinate and its colour at the displaced one.
- **Bound the amount by the smallest feature.** If the thinnest stroke is 6 pixels and the
  displacement reaches 8, the stroke tears. Measure the thinnest stroke; cap \`amount\` below it.
- **Ship the undistorted mark as the real asset.** The flowing version is decoration over an SVG
  that is still the logo when no shader runs. A brand mark that only exists as a shader output
  cannot be printed, favicon'd, or read by anything that does not run WebGL.

## Applying it to type

Do not. Displaced letterforms stop being readable before they start being interesting, and the
text is no longer text to a screen reader, a crawler, or find-in-page. If the effect is wanted
behind type, put the flow on the surface and leave the type as type on a plate above it.

## Cost

One pass, \`STEPS\` texture fetches per pixel, one noise evaluation per fetch if the field is
sampled per step — that last one is the trap, since a naive loop recomputes \`fbm\` several times
per pixel. Hoist the field evaluation out of the loop and reuse the direction; the streamline is
straight enough over a few pixels.

Half-resolution rendering is very effective here, because the output is already a smeared version
of a photograph and the missing detail was being destroyed anyway.`,
      },
      {
        id: 'quantised-images',
        title: 'ASCII, blocks, halftone, and fitted primitives',
        answers:
          'How do I render an image as characters, blocks or dots properly, why does a copied glyph ramp look wrong, and how do I fit geometric primitives to an image?',
        content: `# Quantisation and decomposition

These techniques need no WebGL. A 2D canvas, \`getImageData\`, and arithmetic do all of it — which
makes them the cheapest effects in this skill and the only ones whose output can be real text,
real DOM, or a real SVG file. That matters more than it sounds: an ASCII rendering that is
actually characters is selectable, searchable, scalable and readable by a screen reader, while
the same picture drawn on a canvas is an opaque rectangle.

## The shared shape

1. Divide the image into a grid of cells.
2. Reduce each cell to one number — its mean luminance, computed in a perceptual space, not as
   \`(r+g+b)/3\`.
3. Map that number onto an ordered set of marks.

Step 3 is where the craft is.

## ASCII and block rendering

**The glyph ramp must be ordered by measured ink coverage.** The ubiquitous
\`"@%#*+=-:. "\` ordering is an *estimate*, and it is wrong for your font: coverage depends on the
typeface's weight, its x-height, and its advance width. A ramp that is out of order produces
reversals — mid-tones that read lighter than the tones either side — and the image looks noisy
for no visible reason.

Measure it instead, once, at build time:

\`\`\`ts
function coverage(glyph: string, font: string, size = 32): number {
  const c = new OffscreenCanvas(size, size)
  const ctx = c.getContext('2d')!
  ctx.font = \`\${size}px \${font}\`
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#000'
  ctx.fillText(glyph, 0, 0)
  const { data } = ctx.getImageData(0, 0, size, size)
  let ink = 0
  for (let i = 3; i < data.length; i += 4) ink += data[i] as number
  return ink / (size * size * 255)
}

const ramp = candidates
  .map((g) => ({ g, k: coverage(g, '14px ui-monospace') }))
  .sort((a, b) => a.k - b.k)
  .map((x) => x.g)
\`\`\`

**The cell aspect ratio must match the font's.** Monospace cells are taller than they are wide —
typically an advance of 0.5 to 0.6 of the line height. Sampling square cells and printing them
into tall cells stretches the picture vertically by nearly two to one. Compute the cell size from
the measured advance width and line height, not from a guess.

**Unicode block elements beat characters for photographs.** \`▁▂▃▄▅▆▇█\` are ordered by coverage
*by construction* and have no letter shapes to add texture, so they give a cleaner tonal ramp.
Half-blocks (\`▀▄\`) with separate foreground and background colours double vertical resolution
for free, since one cell then carries two independently coloured pixels.

**Contrast, still.** An ASCII rendering is text on a background and WCAG applies to it exactly as
to any other text. A ramp that runs to near-white glyphs on white fails, and the fact that it is
"art" does not exempt it — mark it \`aria-hidden\` with a real text alternative if it is decorative,
or keep it contrast-compliant if it is content.

## Halftone

Same pipeline, with a dot per cell whose *radius* encodes the tone, and two differences that
matter.

**The grid is rotated.** Print halftones sit at 15, 45 or 75 degrees because an axis-aligned dot
grid interferes with the pixel grid and produces moiré. Rotate the sampling lattice rather than
the dots.

**Dot area, not dot radius, is linear in tone.** Radius proportional to luminance makes midtones
far too dark, because area goes as the square. Use \`r = maxR * sqrt(tone)\`.

Halftone output is SVG-shaped: a few thousand circles, which scales to any size and compresses
well. Above roughly 20,000 dots, draw to a canvas instead.

## Fitted primitives

The "image as geometry" look comes from greedy fitting: repeatedly add the single primitive —
triangle, circle, rectangle — that most reduces total error against the target, keep it, and
continue.

\`\`\`
error(candidate) = sum over affected pixels of (target - current)^2
\`\`\`

Cost is *iterations × candidates per iteration × pixels touched*, which is minutes for a good
result. **This is a build-time job.** Run it offline, ship the SVG. A page that fits primitives
in the browser has moved a render farm into the user's main thread.

Two practical notes. Sample candidates near high-error regions rather than uniformly — error is
concentrated and uniform sampling wastes most of its attempts. And stop on *diminishing returns*
rather than a fixed count: when the best available primitive reduces error by less than a
threshold, more shapes only add bytes.

## What all of these owe

The source image, as the real content. Every one of these is a transformation of something, and
the something is what a crawler, a print stylesheet and a reader with images disabled should get.
Ship the original with correct \`alt\` text, and treat the rendering as a presentation layer over
it — which is exactly what it is.`,
      },
    ],
  },

  rules: [
    {
      id: 'procedural-surfaces/css-first',
      strength: 'must',
      statement:
        'Reach for a shader only when the effect needs a neighbourhood lookup or a per-pixel function; otherwise use the CSS treatment surface-and-depth specifies.',
      evidence: {
        rationale:
          'A fullscreen pass costs pixels times instructions on every frame and is budgeted at zero passes below medium tier, so it must buy something CSS cannot express. Blur, elevation, dithered gradients and concentric radii all already have correct CSS answers, and replacing them with a shader spends the page’s entire effect budget on parity.',
        confidence: 'established',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/write-the-shader-yourself',
      strength: 'must',
      statement:
        'Implement shader techniques from their mechanism rather than pasting code from a repository, blog or shader playground.',
      evidence: {
        rationale:
          'Shader source is copyrighted like any other code and arrives with its licence and author attached, while the underlying mathematics — gradient displacement, fractional Brownian motion, luminance quantisation — is not ownable and takes a few lines to write from its description. The originality audit only catches the mechanical signs of a paste, so it cannot substitute for this.',
        confidence: 'established',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/pass-budget-by-tier',
      strength: 'must',
      statement:
        'Gate every fullscreen pass on the tier budget: zero passes at none and low, one at medium, three at high.',
      evidence: {
        rationale:
          'SCENE_BUDGETS.postProcessingPasses is 0, 0, 1 and 3 across the four tiers, so on the device class carrying most traffic the budget for a fullscreen pass is zero. A shader that ships unconditionally is therefore shipped over budget on most devices, where it competes with the frame budget the rest of the page needs.',
        confidence: 'established',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/still-is-primary',
      strength: 'must',
      statement:
        'Ship the designed static surface as the primary artefact and layer the shader over it, rather than treating the still as a degradation.',
      evidence: {
        rationale:
          'Because the pass budget is zero below medium tier, the still is what most visitors see — along with every no-JS, Save-Data, print and crawler request. Designing the shader first and deriving a fallback from it produces a fallback nobody composed, which is the common reason these pages look unfinished exactly where they are seen most.',
        confidence: 'established',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/halve-resolution-before-cutting-quality',
      strength: 'should',
      statement:
        'Reduce fill cost by rendering the effect to a half-resolution target before reducing its octave count or removing features.',
      evidence: {
        rationale:
          'Fill cost falls with the square of resolution, so half resolution is a four-times saving, and for a soft field the loss is imperceptible because the missing detail was sub-pixel. Cutting features changes the design; cutting resolution usually does not, which makes it the cheaper lever to try first.',
        confidence: 'strong',
      },
      exceptions: [
        'Effects whose subject is high-frequency detail — a sharp refraction edge, a halftone grid — where upscaling visibly softens the thing the effect is for.',
      ],
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/cap-noise-octaves',
      strength: 'should',
      statement: 'Use three or four octaves of noise for a screen-scale field, not six.',
      evidence: {
        rationale:
          'Each octave doubles spatial frequency, so once an octave’s features fall below a pixel it contributes aliasing rather than detail while still costing its full instruction count. Six is a figure carried over from terrain generation, where a camera gets close enough for the high octaves to resolve.',
        confidence: 'strong',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/sample-the-ramp',
      strength: 'must',
      statement:
        'Drive a colour field by indexing the project’s own ramp, never by choosing hues inside the shader.',
      evidence: {
        rationale:
          'Hues chosen in shader source sit outside every palette discipline the project has, which is precisely how the violet-to-cyan field became the recognisable tell — the technique is neutral and the palette is the giveaway. Indexing an uploaded ramp makes the field the system’s colours by construction, and interpolating in a perceptual space beforehand avoids the desaturated middle that linear RGB produces between two saturated hues.',
        confidence: 'strong',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/derive-never-integrate',
      strength: 'must',
      statement:
        'Compute every animated shader value from a time or progress uniform; never feed a frame’s output back in as the next frame’s input.',
      evidence: {
        rationale:
          'A feedback loop makes the surface a function of its own history, so it cannot be paused and resumed to the same state, scrubbed, reversed, or reproduced for a screenshot comparison — which also puts it beyond what the visual feedback loop can check. Multi-tap sampling along a streamline within one frame gives the same smearing deterministically.',
        confidence: 'established',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/reduced-motion-freezes-the-uniform',
      strength: 'must',
      statement:
        'Under prefers-reduced-motion: reduce, freeze the time uniform and keep rendering the surface rather than replacing it.',
      evidence: {
        rationale:
          'A moving full-viewport field is large-area motion and a documented vestibular trigger, so the preference genuinely applies. But a frozen field is still a designed surface, and swapping it for a flat colour changes the page more than the preference asked for — the preference is about motion, not about the surface.',
        confidence: 'established',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/keep-shader-coordinates-small',
      strength: 'must',
      statement:
        'Keep shader input coordinates small and wrap the time uniform before it enters the shader.',
      evidence: {
        rationale:
          'highp float precision is not guaranteed for fragment shaders on mobile GPUs, so noise fed coordinates in the thousands — a large scale factor, or a clock that has run for minutes — loses mantissa bits and visibly quantises into blocks or freezes. It never reproduces on the desktop that built it, which is why it reaches production.',
        confidence: 'established',
      },
      examples: {
        language: 'ts',
        bad: 'material.uniforms.time.value = performance.now() / 1000',
        good: 'material.uniforms.time.value = (performance.now() / 1000) % 1000',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/contrast-against-the-worst-frame',
      strength: 'must',
      statement:
        'Measure text contrast over a moving field against the field’s worst-case lightness, or put the text on a solid plate.',
      evidence: {
        rationale:
          'A field gives text a different backdrop every frame, so a ratio measured against its average passes while individual frames fail. The worst case is the only measurement that means anything, and clamping the field’s lightness range is usually cheaper than plating every text element over it.',
        confidence: 'established',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/measure-the-glyph-ramp',
      strength: 'must',
      statement:
        'Order an ASCII or block ramp by ink coverage measured in the actual font, and derive cell aspect ratio from its advance width and line height.',
      evidence: {
        rationale:
          'Coverage depends on weight, x-height and advance width, so a ramp copied from another project is mis-ordered for yours and produces tonal reversals that read as noise. Sampling square cells into cells that are roughly 0.55 as wide as they are tall also stretches the image by nearly two to one, which is usually blamed on the source image.',
        confidence: 'established',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/halftone-area-not-radius',
      strength: 'must',
      statement:
        'Scale halftone dots by the square root of tone, and rotate the sampling lattice off the pixel axes.',
      evidence: {
        rationale:
          'Dot area rather than radius is what the eye integrates as tone, so radius proportional to luminance renders midtones far too dark. An axis-aligned lattice also interferes with the pixel grid and produces moiré, which is why print halftones sit at 15, 45 or 75 degrees.',
        confidence: 'established',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/fit-primitives-offline',
      strength: 'must',
      statement:
        'Run greedy primitive fitting at build time and ship the resulting SVG; do not fit in the browser.',
      evidence: {
        rationale:
          'Cost is iterations times candidates times pixels touched, which is minutes of compute for a usable result. Doing that in a page moves a render farm onto the user’s main thread for an output that never changes, and the output is a static file by nature.',
        confidence: 'established',
      },
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/source-image-is-the-content',
      strength: 'must',
      statement:
        'Ship the source image or mark as the real asset with correct alternative text, and treat the quantised or displaced rendering as a presentation layer over it.',
      evidence: {
        rationale:
          'Every technique here transforms something, and that something is what a crawler, a print stylesheet, a Save-Data request and a reader with images disabled must receive. A brand mark that exists only as shader output also cannot be printed, used as a favicon, or read by anything without WebGL.',
        confidence: 'established',
      },
      exceptions: [
        'An ASCII rendering emitted as real selectable text, which is itself an accessible representation once it carries a text alternative or is marked decorative.',
      ],
      verifiedBy: 'procedural-surface-review',
    },
    {
      id: 'procedural-surfaces/no-displaced-type',
      strength: 'must-not',
      statement:
        'Do not apply flow displacement to live text; put the effect on the surface and keep the type on a plate above it.',
      evidence: {
        rationale:
          'Letterforms stop being legible well before the displacement becomes visually interesting, and text rendered through a shader is no longer text to a screen reader, a crawler, find-in-page, or translation. The effect is available at full strength on the surface behind, where it costs none of that.',
        confidence: 'established',
      },
      verifiedBy: 'procedural-surface-review',
    },
  ],

  verification: [
    {
      id: 'procedural-surface-review',
      kind: 'self-review',
      description:
        'Confirm the computed surface earns its cost, degrades to something designed, and was written rather than pasted — measured on a real mid-tier phone.',
      blocking: true,
      questions: [
        'What does this effect do that no CSS property can express — a neighbourhood lookup, or a per-pixel function? If neither, why is it not the surface-and-depth treatment?',
        'Was every shader written from its mechanism? Name the technique for each one and where the implementation came from.',
        'Does the effect render at all below medium tier, and if so, against what budget — postProcessingPasses is 0 at low.',
        'With every shader disabled, is the remaining surface a composed design or a leftover? Which of the two was built first?',
        'What is the measured frame time on a real mid-tier phone after two continuous minutes, and did halving the render resolution get tried before any feature was cut?',
        'How many noise octaves are evaluated per pixel, and at the rendered resolution are the highest ones larger than a pixel?',
        'Where did the field’s colours come from — an uploaded ramp built in a perceptual space, or values chosen in shader source?',
        'Is every animated value a function of a time or progress uniform, with no frame-to-frame feedback? Can the surface be frozen and resumed to the same pixels?',
        'Under prefers-reduced-motion: reduce, is the time uniform frozen while the surface still renders?',
        'Are shader coordinates kept small and the time uniform wrapped, and has the effect been seen running for several minutes on a phone rather than seconds on a desktop?',
        'For text over a field: was contrast measured against the field’s worst-case lightness, or is the text on a solid plate?',
        'For a glyph ramp: was coverage measured in the shipping font, and does the cell aspect ratio come from its advance width and line height?',
        'For halftone: do dots scale with the square root of tone, and is the lattice rotated off the pixel axes?',
        'For fitted primitives: did the fitting run at build time, and is the shipped artefact a static file?',
        'Is the source image or mark shipped as a real asset with alternative text, and does the page still convey its content with the rendering removed?',
      ],
    },
  ],

  relatedSkills: [
    'surface-and-depth',
    'webgl-experiences',
    'colour-systems',
    'media-driven-motion',
    'rendering-performance',
    'mobile-performance',
    'visual-feedback-loop',
    'design-judgment',
  ],
}
