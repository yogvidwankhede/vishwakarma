import type { SkillManifest } from '../manifest.js'

/**
 * Surfaces are where generated UI most visibly stops being physical.
 *
 * A shadow is a claim about where the light is. A radius is a claim about how thick the
 * material is. A blur is a claim that there is something behind worth seeing. Each of
 * those claims is cheap to make and expensive to make *consistently*, which is why the
 * same failure appears in almost every generated interface: one shadow copied onto
 * everything, glass panels floating over flat grey, and a single radius token applied from
 * the avatar to the modal.
 *
 * This skill replaces per-element guessing with a lighting model, four elevation levels,
 * and the arithmetic that makes nested corners and smooth gradients come out right.
 */
export const surfaceAndDepth: SkillManifest = {
  vsm: '1.0',
  id: 'surface-and-depth',
  name: 'Surface & Depth',
  description:
    'Use when applying shadows, elevation, glass, gradients, or corner radii, or when an interface looks flat, cheap, or physically incoherent.',
  version: '1.0.0',
  license: 'MIT',
  category: 'ui',
  tags: ['elevation', 'shadow', 'glassmorphism', 'gradient', 'border-radius', 'depth', 'surface'],

  activation: {
    intents: [
      'adding shadows, elevation, or depth to cards, dropdowns, or modals',
      'building a glass or frosted panel with backdrop blur',
      'the interface looks flat, cheap, or like stickers on a page',
      'a gradient looks banded, muddy, or grey in the middle',
      'nested rounded corners look wrong, or radii need a scale',
      'designing surfaces for a dark theme where shadows have stopped reading',
    ],
    globs: ['**/*.css', '**/*.scss', '**/*.tsx', '**/*.jsx', '**/*.vue', '**/*.svelte', '**/tailwind.config.*'],
    keywords: [
      'shadow',
      'box-shadow',
      'elevation',
      'depth',
      'glassmorphism',
      'backdrop-filter',
      'blur',
      'gradient',
      'banding',
      'border-radius',
      'surface',
    ],
  },

  content: {
    summary:
      'Build depth from a single lighting model: four elevation levels with paired contact and ambient shadows, lightness-based elevation in dark themes, concentric radii, dithered gradients, and glass only where there is something to see through.',

    body: `# Surface & Depth

Depth is a claim about physics. A shadow asserts a light exists; an elevation asserts one
object floats above another; an inset asserts a surface is recessed. The claims only hold if
the whole page tells the same story. Where each shadow was chosen independently there is no
light source at all, and the result reads as stickers on paper rather than objects in space.

Commit to a lighting model, express it as tokens, and never let a component invent its own.

---

## 1. One light source, obeyed everywhere

Pick a light and hold it. The conventional choice is directly overhead and slightly in
front of the viewer, so every shadow has an x-offset of \`0\` and a positive y-offset. A
card offset \`-4px\` horizontally beside a dropdown offset \`+4px\` puts two suns in the
sky; nobody consciously notices, and everybody perceives it.

What varies with elevation is distance, not direction. As an object rises its shadow moves
down, spreads wider, and softens. Alpha grows only slightly, because ambient light does not
intensify as things rise.

Shadow colour should not be pure black — black at low alpha desaturates a tinted surface
and leaves a grey haze. Use the background hue driven to very low lightness, near
\`hsl(250 40% 8% / 0.10)\`, so it reads as occlusion rather than as dirt.

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

\`\`\`css
--elevation-2: 0 2px 4px -2px rgb(16 18 32 / 0.10), 0 8px 16px -4px rgb(16 18 32 / 0.10);
\`\`\`

Ratios that keep the ramp coherent: blur is twice the y-offset, spread is minus half the
blur so the shadow does not leak sideways past the silhouette, y-offset doubles per level.

---

## 3. Dark themes: shadows stop working

A shadow is visible because it is darker than its surroundings. On a near-black surface
there is almost no headroom below, so the token that reads clearly on white disappears at
\`#111\`, and raising the alpha only produces a smear with no perceptible edge.

Dark themes elevate with **surface lightness** instead. Each level lightens the surface by
roughly 3 points of L in OKLCh — base \`0.17\`, raised \`0.21\`, floating \`0.25\`, overlay
\`0.29\` — so a modal is *lighter* than the page rather than shadowed above it. Add a
hairline inset highlight, \`inset 0 1px 0 rgb(255 255 255 / 0.06)\`, which is light
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

\`backdrop-filter\` samples what is painted behind an element and blurs it. Over a flat fill
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
\`@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px)))\`.
Reversed, unsupporting browsers get translucent text over unknown content.

---

## 6. Gradients that are not decorative

Two defects make gradients look amateur.

**Grey mid-points.** Without a named interpolation space, stops mix component-wise in sRGB,
and the mean of opposing channels is neutral, so blue to yellow passes through literal
\`#7f7f7f\`. \`linear-gradient(in oklab, #2563eb, #f5d90a)\` keeps chroma along the run;
declare the plain gradient first as the fallback declaration. The same arithmetic is why
fading to the \`transparent\` keyword leaves a grey halo — \`transparent\` is transparent
*black*. Fade to the same colour at zero alpha instead.

**Banding.** An 8-bit channel has 256 steps, so a 1200px run between colours eight levels
apart paints 150px of flat colour per step, and lateral inhibition in the retina exaggerates
each step into a stripe. Dither it: noise at 2–4% opacity randomises which side of the
quantisation boundary each pixel lands on, and the eye averages it back to a ramp. A tiled
\`feTurbulence\` SVG at 128px or larger, \`pointer-events: none\`, is enough.

---

## 7. Radius nesting is arithmetic, not taste

Two rounded rectangles look concentric only when \`inner = outer − padding\`. A card with a
16px radius and 8px of padding needs an 8px radius on whatever sits inside it.

Reusing the outer radius inside is the common error, and its signature is measurable: with
equal radii the visible gap at the 45° diagonal widens to \`padding × √2\`, so 8px of
padding reads as 11.3px at the corners and 8px along the edges, and the corner appears to
bulge. A sharp inner corner inside a rounded outer produces the opposite pinch.

Radius should also scale with element size: 6px on a 32px button and 20px on a 600px modal
express the same material thickness, while 12px on both makes the button soft and the modal
sharp.

---

## 8. Inset light for tactile controls

Pressable controls take a top inset highlight, \`inset 0 1px 0 rgb(255 255 255 / 0.12)\` —
light catching the upper bevel — plus a contact shadow below. Pressing inverts the model:
drop the outer shadow, add \`inset 0 2px 4px rgb(0 0 0 / 0.16)\`, and translate the label
down 1px so the surface sinks. Recessed elements — inputs, wells, slider tracks — take the
inset alone, because a recess casts nothing.

---

## The failures, named

**One shadow everywhere**, on cards, dropdowns and modals alike: not an elevation system, a
decoration. **Glass over a flat background**: blur cost paid, a tint gained. **One radius
token** from avatar to modal, nested corners visibly fighting. **Banded hero gradients**:
large, low-delta, ungrained. **Border plus shadow**: two physical stories on one element.
**Dark-theme shadows** carried over from the light theme, invisible on \`#111\`, leaving
every panel at apparently the same depth.`,

    references: [
      {
        id: 'elevation-tokens',
        title: 'Complete elevation and surface token set',
        answers:
          'What are the actual token values for a four-level elevation system in light and dark themes, including surfaces, borders, glass, and the pressed and recessed states?',
        content: `# Complete elevation and surface token set

A working set for both themes. Values are starting points calibrated for a neutral-cool
palette; retune the shadow hue to your brand and keep the ratios.

## Shadow colour

Define the shadow as a hue plus channels, not as a finished colour, so both themes can
share the geometry and differ only in strength.

\`\`\`css
:root {
  --shadow-rgb: 16 18 32;      /* dark tint of the brand hue, never 0 0 0 */
  --shadow-contact: 0.10;
  --shadow-ambient: 0.08;
}
\`\`\`

## Light theme

Elevation is carried by shadow. Surfaces stay near-white and barely differ.

\`\`\`css
:root {
  --surface-0: oklch(0.99 0.003 250);   /* page */
  --surface-1: oklch(1 0 0);            /* card */
  --surface-2: oklch(1 0 0);            /* popover */
  --surface-3: oklch(1 0 0);            /* modal */
  --border-subtle: oklch(0.92 0.006 250);
  --border-strong: oklch(0.84 0.010 250);

  --elevation-0: none;
  --elevation-1:
    0 1px 2px -1px rgb(var(--shadow-rgb) / 0.10),
    0 2px 6px -2px rgb(var(--shadow-rgb) / 0.08);
  --elevation-2:
    0 2px 4px -2px rgb(var(--shadow-rgb) / 0.10),
    0 8px 16px -4px rgb(var(--shadow-rgb) / 0.10);
  --elevation-3:
    0 4px 8px -4px rgb(var(--shadow-rgb) / 0.12),
    0 24px 48px -12px rgb(var(--shadow-rgb) / 0.16);
}
\`\`\`

Level 0 uses \`--border-subtle\` and no shadow. Levels 1 to 3 use the shadow and no border.

## Dark theme

Elevation is carried by surface lightness. Shadows remain only as reinforcement at the top
two levels, and every raised surface gains a top inset highlight.

\`\`\`css
[data-theme='dark'] {
  --surface-0: oklch(0.17 0.012 250);
  --surface-1: oklch(0.21 0.012 250);
  --surface-2: oklch(0.25 0.013 250);
  --surface-3: oklch(0.29 0.014 250);
  --border-subtle: oklch(0.30 0.014 250);
  --border-strong: oklch(0.40 0.016 250);

  --highlight-top: inset 0 1px 0 rgb(255 255 255 / 0.06);

  --elevation-0: none;
  --elevation-1: var(--highlight-top);
  --elevation-2:
    var(--highlight-top),
    0 8px 16px -4px rgb(0 0 0 / 0.40);
  --elevation-3:
    var(--highlight-top),
    0 24px 48px -12px rgb(0 0 0 / 0.55);
}
\`\`\`

Two constraints on the dark ramp. The step between adjacent surfaces must stay in the 3 to 4
point range of L: below 2 points the levels are indistinguishable, above 5 the top surfaces
turn grey and the theme stops reading as dark. And chroma must stay low and roughly constant
— lightening a dark surface by adding chroma tints it visibly rather than raising it.

## Elevation semantics

| Level | Surface | Used for | Depth cue |
|---|---|---|---|
| 0 | \`--surface-0\` | page background, inline panels, table rows | border only |
| 1 | \`--surface-1\` | cards, resting buttons, list items | contact + ambient shadow (light) / lightness (dark) |
| 2 | \`--surface-2\` | dropdowns, popovers, tooltips, select menus | as above, doubled offsets |
| 3 | \`--surface-3\` | modals, drawers, command palettes | as above, plus a scrim behind |

Anything that seems to need a fifth level is a state. Hover raises an element by one level;
pressed drops it below its resting level; disabled removes the shadow entirely, because a
disabled control is not liftable.

## Interaction states

\`\`\`css
.button {
  border-radius: 8px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12), var(--elevation-1);
  transition: box-shadow 120ms ease, transform 120ms ease;
}
.button:hover  { box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12), var(--elevation-2); }
.button:active {
  box-shadow: inset 0 2px 4px rgb(0 0 0 / 0.16);
  transform: translateY(1px);
}
.input {
  box-shadow: inset 0 2px 4px -2px rgb(var(--shadow-rgb) / 0.12);
  border: 1px solid var(--border-strong);
}
\`\`\`

The input keeps both a border and an inset shadow, which is not a contradiction: the border
delineates a flush edge and the inset says the well is recessed. The prohibition is on
combining a border with an *outer* shadow.

## Glass

\`\`\`css
.glass {
  background: rgb(255 255 255 / 0.92);   /* opaque fallback, ships first */
  border-bottom: 1px solid var(--border-subtle);
}
@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px))) {
  .glass {
    background: rgb(255 255 255 / 0.68);
    -webkit-backdrop-filter: blur(12px) saturate(1.4);
    backdrop-filter: blur(12px) saturate(1.4);
  }
}
\`\`\`

The \`saturate\` companion matters: blurring alone averages the backdrop toward grey, and a
saturation boost of 1.3 to 1.8 restores the colour the blur removed. That is the difference
between glass and frosted plastic.

## Radius scale

\`\`\`css
:root {
  --radius-xs: 4px;    /* badges, chips, checkboxes */
  --radius-sm: 6px;    /* inputs, small buttons */
  --radius-md: 10px;   /* buttons, list items */
  --radius-lg: 16px;   /* cards, panels */
  --radius-xl: 24px;   /* modals, sheets, hero surfaces */
  --radius-full: 9999px;
}
\`\`\`

Nesting is arithmetic: subtract the padding. A \`--radius-lg\` card with 8px of padding takes
\`--radius-md\` minus 2 on its children, which in practice means reaching for the token one
step down and checking it against \`outer − padding\`. Where padding exceeds the outer
radius, the inner element may be square; the outer curve no longer influences it.

## Migration check

Before shipping, grep the codebase for literal \`box-shadow:\` declarations that are not
\`var(--elevation-*)\`. Every hit is either a missing token or a component that invented its
own light source.`,
      },
      {
        id: 'gradient-construction',
        title: 'Constructing gradients that do not band or go grey',
        answers:
          'How do I build a gradient with a correct interpolation space, an easing curve, and enough dithering that it does not band on a large surface?',
        content: `# Constructing gradients that do not band or go grey

## Why sRGB interpolation produces grey

CSS mixes gradient stops component-wise unless told otherwise. Blue \`#0000ff\` to yellow
\`#ffff00\` gives \`#7f7f7f\` at the midpoint, because averaging opposing channels lands on
neutral. The gradient visibly desaturates in the middle and then re-saturates, which reads
as dirt rather than as a transition.

The failure is proportional to the hue distance between stops. Two stops of the same hue
differing only in lightness interpolate acceptably in sRGB. Two stops a quarter of the wheel
apart do not.

\`\`\`css
/* muddy: passes through grey */
background: linear-gradient(90deg, #2563eb, #f5d90a);

/* clean: perceptual path, chroma preserved */
background: linear-gradient(in oklab 90deg, #2563eb, #f5d90a);
\`\`\`

Choosing the space:

- \`in oklab\` — the default choice. Straight-line path in a perceptually uniform space;
  never overshoots, never introduces a hue that is not at either end.
- \`in oklch\` — takes the shorter arc around the hue wheel, so it keeps chroma high and
  passes *through* intermediate hues. Use it deliberately when you want blue to reach red
  via violet; it is wrong when you want the shortest visual distance.
- \`in srgb\` — only when reproducing a legacy design exactly.

For older engines, declare the plain gradient first and the interpolated one second. A
browser that does not parse \`in oklab\` discards the second declaration and keeps the first,
which is the standard CSS fallback mechanism.

## Easing the gradient

A two-stop linear gradient distributes colour evenly in *space*, but perceived brightness
does not change evenly, so the transition looks abrupt at one end. Two corrections:

**Interpolation hints.** A bare percentage between two stops moves the midpoint:
\`linear-gradient(#000, 35%, #333)\` puts the halfway colour at 35% of the length, which
compresses the dark end and stretches the light one.

**Multi-stop easing.** For a fade to transparent — the single most common banding source —
never go straight from a colour to \`transparent\`. In sRGB, \`transparent\` is
\`rgb(0 0 0 / 0)\`, so the gradient fades through black and produces a grey-brown halo.
Fade to the same colour at zero alpha instead, and add intermediate stops on an ease curve:

\`\`\`css
/* halo: fades through transparent black */
background: linear-gradient(to top, #1a1a2e, transparent);

/* clean */
background: linear-gradient(
  to top,
  rgb(26 26 46 / 1) 0%,
  rgb(26 26 46 / 0.85) 20%,
  rgb(26 26 46 / 0.55) 45%,
  rgb(26 26 46 / 0.22) 70%,
  rgb(26 26 46 / 0) 100%
);
\`\`\`

## Predicting banding

Banding is quantisation. An 8-bit channel has 256 levels, so a gradient's band width is
roughly \`length_in_px ÷ levels_of_change\`. A 1200px hero moving from \`#111111\` to
\`#191919\` changes eight levels and therefore paints 150px stripes. Anything above about
4px per band is visible to a normal viewer on a decent panel; on an OLED phone in a dark
room it is obvious far sooner.

The rule of thumb: **large area plus small colour delta equals banding**. Either increase
the delta, shorten the run, or dither.

## Dithering with grain

A small amount of noise moves each pixel randomly across the quantisation boundary. The eye
integrates the noise spatially and the step edge dissolves. Amplitude needs to be about one
quantisation step, which is 2 to 4% opacity — far less than looks right in isolation.

\`\`\`css
.grain::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.035;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
\`\`\`

Practical constraints. Keep the tile at 128px or larger, or the repeat becomes a visible
plaid. Never animate the noise layer — regenerating or translating it forces repaint of the
whole surface. Set \`pointer-events: none\` so the overlay does not eat clicks. And keep the
opacity under about 6%: past that it stops being dither and starts being texture, which is a
different and much more committal design decision.

## Gradients that carry meaning

Most gradients in product UI should be almost invisible: a 4 to 8% lightness shift across a
surface to suggest a light source, a scrim behind text over an image, a fade at the edge of
a scrolling container to signal more content. These are functional and read as craft.

Large, saturated, multi-hue gradients read as decoration and date quickly. If a gradient's
job is to be noticed, the interface is asking colour to do work that hierarchy should be
doing. The exception is a genuine brand surface — a single hero, once per page — where the
gradient is the identity rather than an ornament.`,
      },
    ],
  },

  rules: [
    {
      id: 'surface-and-depth/single-light-source',
      strength: 'must',
      statement:
        'Give every shadow in the interface the same directional origin — conventionally x-offset 0 with a positive y-offset — and vary only distance, blur, and spread across elevations.',
      evidence: {
        rationale:
          'A shadow encodes the position of a light. Shadows that disagree on direction describe multiple simultaneous light sources, which cannot occur in a single scene, so the depth cue fails and elements read as flat cut-outs rather than raised objects.',
        confidence: 'established',
      },
      exceptions: [
        'A single hero illustration or product render that deliberately models its own scene lighting, contained within its own bounds.',
      ],
      examples: {
        language: 'css',
        bad: '.card { box-shadow: -4px 4px 12px rgb(0 0 0 / 0.15); }\n.menu { box-shadow: 4px 8px 20px rgb(0 0 0 / 0.15); }',
        good: '.card { box-shadow: var(--elevation-1); }\n.menu { box-shadow: var(--elevation-2); }',
      },
      verifiedBy: 'elevation-audit',
    },
    {
      id: 'surface-and-depth/paired-shadows',
      strength: 'must',
      statement:
        'Compose each elevation level from at least two shadows: a tight, darker contact shadow and a wider, softer ambient shadow.',
      evidence: {
        rationale:
          'A real object occludes direct light near its footprint, producing a sharp contact shadow, and blocks diffuse ambient light over a much larger area. A single shadow can only approximate one of the two, so it either reads as a hard decal or as fog with no visible cause.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '--elevation-2: 0 4px 12px rgb(0 0 0 / 0.15);',
        good: '--elevation-2: 0 2px 4px -2px rgb(16 18 32 / 0.10), 0 8px 16px -4px rgb(16 18 32 / 0.10);',
      },
      verifiedBy: 'elevation-audit',
    },
    {
      id: 'surface-and-depth/four-levels',
      strength: 'should-not',
      statement:
        'Do not define more than four elevation levels — flat, raised, floating, and overlay.',
      evidence: {
        rationale:
          'Elevation communicates a stacking relationship, and users can only distinguish a handful of depth planes without explicit comparison. Additional levels add tokens without adding perceptible information, and they invite components to pick a level by appearance rather than by role.',
        confidence: 'strong',
      },
      exceptions: [
        'Canvas or editor products where nested floating panels genuinely stack more than three deep.',
      ],
    },
    {
      id: 'surface-and-depth/tinted-shadow-colour',
      strength: 'should',
      statement:
        'Derive shadow colour from the background hue at very low lightness rather than using pure black.',
      evidence: {
        rationale:
          'Pure black at partial alpha reduces the saturation of everything beneath it, so a shadow over a tinted surface leaves a desaturated grey patch that reads as grime instead of as occlusion. Occlusion in reality removes light without removing hue.',
        confidence: 'strong',
      },
    },
    {
      id: 'surface-and-depth/dark-elevation-by-lightness',
      strength: 'must',
      statement:
        'In dark themes, express elevation by raising surface lightness roughly 3 points of L per level, and treat any shadow as reinforcement rather than the primary cue.',
      evidence: {
        rationale:
          'A shadow is perceived as a local reduction in luminance. On a surface already near the bottom of the range there is almost no headroom below it, so the shadow cannot produce a perceptible luminance difference no matter how its alpha is tuned.',
        confidence: 'established',
      },
      verifiedBy: 'dark-theme-depth',
      examples: {
        language: 'css',
        bad: "[data-theme='dark'] .modal { background: #111; box-shadow: 0 24px 48px rgb(0 0 0 / 0.5); }",
        good: "[data-theme='dark'] .modal { background: oklch(0.29 0.014 250); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06), 0 24px 48px -12px rgb(0 0 0 / 0.55); }",
      },
    },
    {
      id: 'surface-and-depth/border-xor-shadow',
      strength: 'should-not',
      statement:
        'Do not apply a visible border and an outer drop shadow to the same element.',
      evidence: {
        rationale:
          'A border states that the element is flush with its parent surface and bounded by a line; an outer shadow states that it is lifted above that surface. Asserting both describes two incompatible physical arrangements, and the eye resolves the conflict by trusting neither.',
        confidence: 'opinion',
      },
      exceptions: [
        'A hairline below 3:1 contrast used purely to hold an edge that would otherwise disappear against a same-tone background.',
        'Inset shadows, which describe a recess and legitimately coexist with a border on inputs and wells.',
      ],
    },
    {
      id: 'surface-and-depth/glass-needs-texture',
      strength: 'must-not',
      statement:
        'Do not apply backdrop-filter over a flat, static fill.',
      evidence: {
        rationale:
          'A backdrop filter blurs a snapshot of what is painted behind the element. Over a uniform fill every sample is identical, so the blur output equals its input and only the element tint remains visible — while the compositor still allocates a backdrop texture and runs the blur passes on every frame that invalidates it.',
        confidence: 'established',
      },
      verifiedBy: 'glass-audit',
    },
    {
      id: 'surface-and-depth/glass-supports-guard',
      strength: 'must',
      statement:
        'Ship an opaque background first and add backdrop blur only inside an @supports guard testing both the prefixed and unprefixed property.',
      evidence: {
        rationale:
          'A browser that ignores backdrop-filter still applies the lowered background alpha, leaving text over unfiltered page content at unpredictable contrast. Declaration order plus the feature query guarantees the translucent value only ever takes effect where the blur that justifies it exists.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.bar { background: rgb(255 255 255 / 0.6); backdrop-filter: blur(12px); }',
        good: '.bar { background: rgb(255 255 255 / 0.92); }\n@supports ((backdrop-filter: blur(12px)) or (-webkit-backdrop-filter: blur(12px))) {\n  .bar { background: rgb(255 255 255 / 0.68); backdrop-filter: blur(12px) saturate(1.4); }\n}',
      },
      verifiedBy: 'glass-audit',
    },
    {
      id: 'surface-and-depth/glass-contrast-floor',
      strength: 'must',
      statement:
        'Verify text on a glass surface against both a pure white and a pure black backdrop, keeping the surface fill opaque enough to clear 4.5:1 in both cases.',
      evidence: {
        rationale:
          'The backdrop behind a translucent panel is page content or user media and can be any luminance. Contrast measured against one sample backdrop says nothing about the worst case, and the worst case is what a user scrolling an image gallery will actually encounter.',
        source: 'WCAG 2.2 Success Criterion 1.4.3 (Contrast (Minimum))',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
        confidence: 'established',
      },
      verifiedBy: 'glass-audit',
    },
    {
      id: 'surface-and-depth/no-animated-blur',
      strength: 'must-not',
      statement:
        'Do not animate or transition the radius of a backdrop-filter or filter blur.',
      evidence: {
        rationale:
          'A blur radius change invalidates the cached filter result, forcing the compositor to re-sample the backdrop and re-run every blur pass on each frame. The cost scales with the filtered area in device pixels, which is why it drops frames on high-DPR mobile displays specifically.',
        confidence: 'strong',
      },
      exceptions: [
        'A one-off transition over a small region, measured on a low-end device and confirmed to hold frame budget.',
      ],
    },
    {
      id: 'surface-and-depth/gradient-interpolation-space',
      strength: 'should',
      statement:
        'Name an interpolation space such as `in oklab` on any gradient whose stops differ in hue.',
      evidence: {
        rationale:
          'Unqualified gradients mix stops component-wise in sRGB, and averaging opposing channels lands on neutral, so a blue-to-yellow gradient passes through literal grey at its midpoint. A perceptually uniform space keeps chroma along the whole path.',
        confidence: 'established',
        source: 'CSS Color Module Level 4, colour interpolation',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/color-interpolation-method',
      },
      exceptions: ['Gradients between two stops of the same hue that differ only in lightness or alpha.'],
      examples: {
        language: 'css',
        bad: 'background: linear-gradient(90deg, #2563eb, #f5d90a);',
        good: 'background: linear-gradient(90deg, #2563eb, #f5d90a);\nbackground: linear-gradient(in oklab 90deg, #2563eb, #f5d90a);',
      },
    },
    {
      id: 'surface-and-depth/fade-to-matching-alpha',
      strength: 'must-not',
      statement:
        'Do not fade a gradient to the `transparent` keyword; fade to the same colour at zero alpha instead.',
      evidence: {
        rationale:
          'The `transparent` keyword resolves to transparent black, so an sRGB gradient interpolating toward it drags the colour toward black as alpha falls, producing a visible grey or brown halo through the middle of the fade.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: 'background: linear-gradient(to top, #1a1a2e, transparent);',
        good: 'background: linear-gradient(to top, rgb(26 26 46 / 1), rgb(26 26 46 / 0));',
      },
    },
    {
      id: 'surface-and-depth/dither-large-gradients',
      strength: 'should',
      statement:
        'Add a noise overlay at 2–4% opacity to any gradient running more than about 400px across a colour delta under roughly 16 levels per channel.',
      evidence: {
        rationale:
          'An 8-bit channel quantises a gradient into bands whose width is the run length divided by the number of levels crossed, and lateral inhibition in the retina exaggerates each step edge. Noise of roughly one quantisation step in amplitude randomises which side of the boundary each pixel falls on, and the eye averages it back to a smooth ramp.',
        confidence: 'established',
      },
      verifiedBy: 'gradient-banding',
    },
    {
      id: 'surface-and-depth/concentric-radius',
      strength: 'must',
      statement:
        'Set the radius of a nested element to the parent radius minus the padding between them.',
      evidence: {
        rationale:
          'Two rounded rectangles are concentric only when their corner arc centres coincide, which requires inner radius equals outer radius minus offset. Reusing the outer radius inside widens the visible gap at the 45-degree diagonal to padding times the square root of two — 8px of padding reading as 11.3px at the corners — so the corner appears to bulge.',
        confidence: 'established',
      },
      exceptions: [
        'Padding greater than the outer radius, where the outer curve no longer constrains the inner element and a square inner corner is correct.',
      ],
      examples: {
        language: 'css',
        bad: '.card { border-radius: 16px; padding: 8px; }\n.card > .thumb { border-radius: 16px; }',
        good: '.card { border-radius: 16px; padding: 8px; }\n.card > .thumb { border-radius: 8px; }',
      },
      verifiedBy: 'radius-nesting',
    },
    {
      id: 'surface-and-depth/radius-scales-with-size',
      strength: 'should',
      statement:
        'Scale border radius with element size across a small radius scale rather than applying one radius value to every surface.',
      evidence: {
        rationale:
          'A radius reads as the thickness of the material rounding off at the edge, so the same absolute value looks pillowy on a 32px control and nearly sharp on a 600px panel. Scaling the radius keeps the implied material consistent across sizes.',
        confidence: 'opinion',
      },
    },
    {
      id: 'surface-and-depth/tactile-inset-states',
      strength: 'should',
      statement:
        'Give pressable controls a top inset highlight with an outer contact shadow, and invert to an inset shadow with a 1px downward shift on the active state.',
      evidence: {
        rationale:
          'With an overhead light, a raised object catches light on its upper face and casts a shadow below; a depressed one loses the highlight and receives shadow from its own rim. Inverting both cues on press matches the physical model the rest of the elevation system already asserts, which is why it reads as tactile rather than as a colour change.',
        confidence: 'strong',
      },
    },
    {
      id: 'surface-and-depth/elevation-as-tokens',
      strength: 'must',
      statement:
        'Reference elevation through named tokens and never write a literal box-shadow value inside a component.',
      evidence: {
        rationale:
          'Consistency of light direction and shadow ramp is a global property that cannot be maintained by local decisions. A literal shadow in a component is invisible to the theme layer, so it cannot be adjusted for dark mode and will silently diverge from the system as the ramp is retuned.',
        confidence: 'strong',
      },
      verifiedBy: 'elevation-audit',
    },
  ],

  verification: [
    {
      id: 'elevation-audit',
      kind: 'self-review',
      description: 'Confirm the elevation system models one coherent light source.',
      blocking: true,
      questions: [
        'List every distinct box-shadow value in the output. Do they all share the same x-offset sign and a positive y-offset?',
        'Does every elevation level contain at least two shadows, one tight and one wide?',
        'How many distinct elevation levels exist? If more than four, which two collapse?',
        'Is any box-shadow written as a literal value rather than a token reference?',
      ],
    },
    {
      id: 'dark-theme-depth',
      kind: 'self-review',
      description: 'Confirm dark-theme depth does not depend on shadows.',
      blocking: true,
      questions: [
        'With every shadow removed, can you still tell a modal from a card from the page background?',
        'What is the lightness step between adjacent dark surfaces? Is it between 2 and 5 points of L?',
        'Do raised dark surfaces carry a top inset highlight?',
      ],
    },
    {
      id: 'glass-audit',
      kind: 'self-review',
      description: 'Confirm every backdrop-filter is justified, guarded, and legible.',
      blocking: true,
      questions: [
        'For each backdrop-filter, what is actually behind it — imagery, a gradient, or scrolling content? If it is a flat fill, why is it not a solid colour?',
        'Is the opaque background declared before the @supports block, and does the block test both the prefixed and unprefixed property?',
        'Does the text on the glass surface clear 4.5:1 against a pure white backdrop and against a pure black one?',
        'Does any blur radius animate, and do two backdrop-filtered elements overlap?',
      ],
    },
    {
      id: 'gradient-banding',
      kind: 'self-review',
      description: 'Confirm gradients are smooth and correctly interpolated.',
      questions: [
        'For each gradient, do the stops differ in hue, and if so is an interpolation space named?',
        'Does any gradient fade to the transparent keyword rather than to a matching colour at zero alpha?',
        'For the largest gradient, divide its pixel length by the number of 8-bit levels it crosses. Is the result above 4px per band, and if so is it dithered?',
      ],
    },
    {
      id: 'radius-nesting',
      kind: 'self-review',
      description: 'Confirm nested corners are concentric.',
      questions: [
        'For every rounded element inside another rounded element, does inner radius equal outer radius minus padding?',
        'How many distinct radius values are in use, and does the value chosen for each element relate to that element size?',
      ],
    },
    {
      id: 'contract-audit',
      kind: 'contract',
      description: 'Evaluate surfaces and depth against the project Design Contract.',
      contractSection: 'surface',
      blocking: true,
    },
  ],

  relatedSkills: ['design-judgment', 'colour-systems', 'design-tokens', 'motion-design', 'accessible-components'],
}
