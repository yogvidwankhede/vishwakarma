// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Colour is where generated interfaces fail most visibly and most measurably.
 *
 * The failure is rarely "wrong hue". It is structural: ramps built by nudging HSL lightness,
 * which produces steps that are numerically even and perceptually chaotic; dark themes built
 * by inverting light ones, which produces glowing accents on pure black; and components that
 * hard-code palette primitives, which makes theming impossible without a rewrite.
 *
 * This skill is about the machinery — the space you compute in, the shape of the ramp, the
 * layers of indirection, and the contrast contract — rather than about which hue to pick.
 * Taste chooses the hue. Everything downstream of that is engineering, and engineering can
 * be checked.
 */
export const colourSystems: SkillManifest = {
  vsm: '1.0',
  id: 'colour-systems',
  name: 'Colour Systems',
  description:
    'Use when defining a palette, building colour ramps or theme tokens, adding a dark theme, or auditing contrast in an interface.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'ui',
  tags: ['colour', 'palette', 'oklch', 'tokens', 'dark-mode', 'contrast', 'theming'],

  activation: {
    intents: [
      'creating or revising a colour palette, colour ramp, or theme',
      'adding dark mode or a second theme to an existing interface',
      'defining design tokens for colour, surfaces, borders, or states',
      'the user reports that colours look muddy, garish, washed out, or inconsistent',
      'auditing an interface for contrast or colour accessibility',
      'deriving hover, active, disabled, or focus colours for a component',
    ],
    globs: [
      '**/tokens/**',
      '**/theme/**',
      '**/*.css',
      '**/*.scss',
      '**/tailwind.config.*',
      '**/*colors*.{ts,js,json}',
      '**/*colours*.{ts,js,json}',
    ],
    keywords: [
      'color',
      'colour',
      'palette',
      'theme',
      'dark mode',
      'oklch',
      'hsl',
      'contrast',
      'tokens',
    ],
  },

  content: {
    summary:
      'Build palettes in a perceptually uniform space, layer primitive into semantic into component tokens, construct dark themes rather than inverting light ones, and gate every pair on WCAG 2 contrast.',

    body: `# Colour Systems

A palette is not a list of colours. It is a function: given a role and a theme, return a value
that satisfies a contrast contract. Interfaces that look accidental have a list.

---

## 1. Compute in a perceptually uniform space

HSL's lightness channel is not lightness. It is the midpoint of the largest and smallest RGB
components, which correlates with nothing the eye does. \`hsl(60 100% 50%)\` and
\`hsl(240 100% 50%)\` claim identical lightness; the first is pure yellow at a relative
luminance of 0.93, the second pure blue at 0.07 — a thirteenfold difference. Against white
the yellow scores 1.07:1 and the blue 8.6:1. A ramp built by holding S and stepping L is
therefore smooth in some hues and lurching in others, and no hand-tuning fixes it: the space
itself is lying.

OKLCh's L is perceived lightness on a 0-1 scale, so two colours with the same L genuinely
look equally light. The same yellow is \`oklch(0.968 0.211 110)\`, the same blue
\`oklch(0.452 0.313 264)\`. C is chroma, roughly 0 to 0.37 within sRGB; H is hue in degrees
on a wheel that does not align with HSL's (red sits near 29, not 0).

So **write ramps as OKLCh expressions, not hex literals.** Hex is a fine output format and a
terrible authoring format: it discards the relationships that make a palette a system.

---

## 2. Shaping a ramp

An eleven-step ramp needs three curves.

**Lightness** is the spine. Equal L steps are perceptually equal, but a UI does not want equal
resolution everywhere: the light end holds surfaces, hovers and subtle borders that must
differ by small controlled amounts, while the middle is a transit zone. Compress the ends,
expand the middle: L = 0.97, 0.94, 0.89, 0.82, 0.74, 0.66, 0.58, 0.50, 0.41, 0.32, 0.22.

**Chroma** must fall off at both extremes. The sRGB and P3 gamuts are widest around L 0.6 and
pinch to a point at black and white, so a constant chroma is unrepresentable near the ends and
the browser clips it, collapsing two adjacent steps into one rendered colour. Scale peak
chroma by an envelope: roughly 0.15x at L 0.97, 0.45x at L 0.89, 0.85x at L 0.74, 1.0x at
L 0.58, 0.8x at L 0.41, 0.5x at L 0.22.

**Hue** should drift 10-20 degrees across the ramp. Perceived hue shifts with lightness and
purity (the Bezold-Brücke and Abney effects), so a colorimetrically constant hue reads as
*drifting*, while a small counter-shift reads as stable. Blues need it most: OKLCh has
residual non-linearity there, and a dark blue at its tint's nominal hue looks purple without a
five-to-ten-degree correction. Keep total travel under 30 degrees, or it stops being one
colour.

---

## 3. Three token layers, and why the indirection earns its keep

\`\`\`
--blue-600: oklch(0.58 0.16 255);        /* primitive: what the colour is   */
--color-accent: var(--blue-600);          /* semantic:  what the colour means */
--button-primary-bg: var(--color-accent); /* component: where it is used     */
\`\`\`

The rule that matters: **components reference semantic tokens and never primitives.** A button
that says \`background: var(--blue-600)\` cannot be re-themed, because dark mode is not "a
different blue-600" — it is a different mapping from meaning to value. Only the semantic layer
holds that mapping, and only there can you state a contract like "\`--color-fg-muted\` clears
4.5:1 against \`--color-surface\` in every theme". Contracts on primitives are vacuous;
contracts on component tokens multiply beyond auditing.

Name semantic tokens by role — \`surface\`, \`surface-raised\`, \`fg\`, \`fg-muted\`,
\`border\`, \`accent\`, \`accent-fg\` — never by appearance. \`--color-light-grey\` is a bug
waiting for dark mode.

---

## 4. A dark theme is built, not inverted

Mapping L to 1-L produces a theme that is technically dark and visually wrong.

**Elevation reverses.** Shadows are nearly invisible on a dark surface, so depth comes from
lightness: base 0.18, raised 0.21, floating 0.25, overlay 0.29. Higher means closer.

**Saturated colour glows.** Chromatic aberration spreads the edge of a high-chroma accent, and
a dilated pupil worsens it. Reduce accent chroma by 25-40% and raise its lightness:
\`oklch(0.58 0.16 255)\` becomes roughly \`oklch(0.70 0.11 255)\`.

**Both extremes are wrong.** \`#000\` surfaces smear during scroll on OLED and give 21:1
against white text, causing halation for astigmatic readers. Sit at L 0.18 and L 0.94.

---

## 5. Contrast: gate on WCAG 2, reason with APCA

WCAG 2's ratio is \`(L1 + 0.05) / (L2 + 0.05)\` over relative luminance: fixed flare term,
symmetric, blind to polarity and to font size beyond one crude threshold. It is demonstrably
wrong at the extremes — \`#767676\` scores 4.54:1 against white *and* 4.62:1 against black,
passing SC 1.4.3 in both directions. No single grey can be adequately readable against both
ends of the range; the additive term inflates ratios among dark pairs.

APCA models this properly — polarity-aware, spatial-frequency-aware, reporting Lc 0 to about
108 (Lc 75 body text, Lc 60 content text, Lc 45 headlines, Lc 30 floor, Lc 15 invisible). But
APCA was removed from the WCAG 3 drafts in 2023, WCAG 3 still has no determined algorithm, and
every legal regime references WCAG 2.x. So **gate CI on WCAG 2 and use APCA to break ties**:
prefer the higher Lc among passing candidates, and treat any dark-theme pair below Lc 60 as
suspect however good its ratio.

The requirement people forget is **SC 1.4.11: 3:1 for non-text** — input borders, switch
tracks, unchecked checkboxes, icon-only buttons, chart series edges, focus indicators. A
hairline border at 1.4:1 is the commonest accessibility defect in otherwise careful systems. A
focus ring must clear 3:1 against *both* the component and the page behind it.

---

## 6. Hue is never the message

Around 8% of men and 0.5% of women have a colour vision deficiency, most often affecting
red-green discrimination — precisely the pair used for error and success. Encode state with an
icon, a label, or a shape, and separate semantic colours by at least 0.15 in OKLCh L.

---

## 7. Wide gamut, gracefully

Browser gamut-mapping clips per-colour, so it can flatten adjacent ramp steps into one. Author
in sRGB, then opt specific accents into wider gamut explicitly:

\`\`\`css
--color-accent: oklch(0.58 0.16 255);
@media (color-gamut: p3) {
  :root { --color-accent: oklch(0.58 0.21 255); }
}
\`\`\`

---

## 8. States are derived, not picked

Hover, active, and disabled are transformations of a base token, not new palette entries.
Move lightness in whichever direction increases separation from the surface — darker on light
themes, lighter on dark — by about 0.04 for hover and 0.08 for active. Relative colour syntax
expresses this directly:

\`\`\`css
--button-hover-bg: oklch(from var(--color-accent) calc(l - 0.04) c h);
\`\`\`

Disabled should drop chroma toward 0 and move lightness toward the surface. Do not express it
as \`opacity\`, which composites against whatever happens to be behind the element, stacks
inside already-translucent containers, and fades the focus ring along with everything else.

---

## The specific failures

- **Purple-to-blue everything.** Any hue works if the ramp is even; the violet-indigo-cyan
  band announces itself as a default.
- **Pure grey neutrals.** \`oklch(L 0 0)\` beside a warm brand colour looks accidental. Carry
  0.005 to 0.02 of chroma at the brand hue through the whole neutral ramp.
- **Too many hues.** Beyond three families plus neutrals, the palette is a collection rather
  than a system.
- **Decorative accent.** An accent that also appears in an illustration, a badge, and a chart
  no longer marks the primary action.
- **Secondary text at 3:1.** If text must fall below 4.5:1 to look right, delete it rather
  than dim it.
- **\`filter: invert(1)\` dark mode.** It inverts photographs and logos, rotates every hue by
  180 degrees so the brand colour becomes its complement, and double-inverts anything that
  tries to compensate.`,

    references: [
      {
        id: 'palette-from-one-colour',
        title: 'Building a full palette from a single brand colour',
        answers:
          'I have one brand hex value. How do I derive a complete, even, accessible palette — ramps, neutrals, and semantic colours — from it?',
        content: `# Building a full palette from a single brand colour

The input is one value, usually a hex string from a logo. The output is a set of ramps that
share a construction so they look related, plus a neutral family that belongs to them, plus
semantic colours that read as part of the same system rather than as bootstrap defaults.

## Step 0 — Convert and inspect

Convert the brand hex to OKLCh and look at the three numbers before doing anything else.

- **L below 0.45**: the brand colour is dark. It will work as a foreground on light surfaces
  but cannot be a large surface fill without dragging the whole interface dark.
- **L above 0.80**: it is a tint. It will fail 4.5:1 against white and cannot carry white
  text. Plan for a darker sibling to act as the actual action colour, and reserve the brand
  value for large areas and illustration.
- **C above 0.25**: it is near the sRGB gamut edge for its hue. The ramp will have little
  room to grow more saturated in either direction, so treat this value as the ramp's chroma
  peak rather than as a mid-step.

Record the hue angle. It anchors everything that follows.

## Step 1 — Place the brand colour on the ladder

Do not assume the brand colour is step 500. Find the ladder rung whose L is closest to the
brand's L and pin it there. A brand colour at L 0.72 belongs at step 400; forcing it to 500
and building outward guarantees that either the light end has no room or the dark end has
too much.

Ladder (11 steps, 50 to 950):

    50   L 0.97      600  L 0.58
    100  L 0.94      700  L 0.50
    200  L 0.89      800  L 0.41
    300  L 0.82      900  L 0.32
    400  L 0.74      950  L 0.22
    500  L 0.66

## Step 2 — Apply the chroma envelope

Take the brand's chroma as the peak, \`Cmax\`, and multiply:

    50   0.15 x      600  1.00 x
    100  0.25 x      700  0.95 x
    200  0.45 x      800  0.80 x
    300  0.65 x      900  0.62 x
    400  0.85 x      950  0.45 x
    500  0.97 x

Then clamp every step into gamut. If any step needs its chroma reduced by more than about
15% to fit, lower \`Cmax\` for the whole ramp rather than clipping one step — a ramp where
one rung has been clipped has a visible flat spot where two steps look the same.

## Step 3 — Apply the hue drift

Move the hue monotonically across the ramp, 12-18 degrees end to end. Direction depends on
where you start:

- **Blues (H 230-280)**: shift the dark end *toward* 260 and the light end toward 240.
  Untreated dark blues read purple; untreated light blues read cyan.
- **Reds (H 15-40)**: warm the light end toward 45 (peachy) and cool the dark end toward 15
  (maroon). This mirrors how pigment behaves and reads as natural.
- **Greens (H 130-160)**: cool the light end toward 165 and warm the dark end toward 130.
  Light greens that stay at the base hue look acidic.

## Step 4 — Derive the neutrals from the brand hue

Neutrals are the same ladder at the brand's hue with a chroma of 0.005 at the extremes
rising to about 0.02 in the middle. This is below the threshold where anyone can name the
colour, and well above the threshold where the interface stops looking like a default
stylesheet. It also guarantees the neutrals harmonise with every other ramp, because they
literally share a hue.

Two neutral families are often worth having: one tinted toward the brand for surfaces and
borders, and one at chroma 0 for text, since chromatic text at small sizes fringes on
subpixel-rendered displays.

## Step 5 — Semantic hues

Success, warning, error, and info should be built with the *same* ladder and the same chroma
envelope as the brand ramp — only the hue changes. That shared construction is what makes
them look like they belong to the palette. Reasonable anchors: error near H 27, warning near
H 75, success near H 150, info near H 240.

Then adjust for two constraints:

1. **Separate them by lightness as well as hue.** Error and success must remain
   distinguishable to a viewer with deuteranopia, which means the step you use for each in
   any given role should differ in L by at least 0.15.
2. **Pull semantic hues away from the brand hue by at least 40 degrees.** A blue brand with
   an info colour at H 245 will produce notices nobody notices.

## Step 6 — Assign roles and verify the contract

Build the semantic layer as a mapping from role to step, not to value:

    --color-surface        neutral-50
    --color-surface-raised white
    --color-border         neutral-200
    --color-border-strong  neutral-300
    --color-fg             neutral-900
    --color-fg-muted       neutral-600
    --color-accent         brand-600
    --color-accent-hover   brand-700
    --color-accent-fg      white

Then check every pair the interface actually renders, not every pair in the matrix:

- \`fg\` on \`surface\` and on \`surface-raised\`: 4.5:1 minimum.
- \`fg-muted\` on both: 4.5:1 minimum. This is the pair that fails most often, because
  "muted" is chosen by eye and neutral-500 is almost always too light.
- \`accent-fg\` on \`accent\` and on \`accent-hover\`: 4.5:1. Hover states are routinely
  skipped and routinely fail.
- \`border\` against \`surface\`: 3:1 **only if the border is the sole indicator** of an
  input's boundary. Decorative dividers are exempt.
- Focus ring against \`surface\`, \`surface-raised\`, and \`accent\`: 3:1 against each.

## Step 7 — Emit

Emit primitives as hex or as sRGB-clamped OKLCh for the base case, and keep the generating
parameters (hue, Cmax, ladder) in source. The parameters are the palette; the hex values are
a build artefact. When the brand colour changes, you re-run the function rather than
re-picking 66 values by hand.`,
      },
      {
        id: 'dark-theme-construction',
        title: 'Constructing a dark theme',
        answers:
          'How do I build a dark theme that is genuinely designed rather than an inversion — surfaces, elevation, accent adjustment, borders, images, and the switching mechanism?',
        content: `# Constructing a dark theme

A dark theme is a second mapping from semantic role to value, sharing the primitives and the
component layer with the light theme. If you find yourself editing a component while adding
dark mode, the token layering is wrong and that is the bug to fix first.

## Why inversion fails

Mapping L to 1-L is arithmetically clean and produces four distinct problems.

**Depth cues invert but shadows do not.** In a light theme, a raised surface is *lighter*
than its background because it catches more light, and a shadow sells the separation. On a
dark background a shadow is nearly invisible — there is no darker value to cast into — so an
inverted theme loses its entire elevation vocabulary at once.

**Chroma behaves differently at low lightness.** Human chromatic sensitivity does not scale
linearly with luminance. An accent that reads as confident at L 0.58 on white reads as
neon at L 0.42 on near-black, and the effect worsens in a dark viewing environment where the
pupil is dilated and optical scatter across the edge increases.

**The extremes are unusable.** Light themes rarely use pure black text, so inversion rarely
produces pure white surfaces — but they very often use pure white surfaces, so inversion
very often produces pure black, which is the one value to avoid.

**Semantic colours break asymmetrically.** Inverting error red gives cyan. Inverting the
brand hue gives its complement. Any theme that inverts *values* rather than *roles* destroys
brand identity by construction, which is why \`filter: invert(1)\` is never acceptable as a
dark mode strategy.

## Surfaces and elevation

Build a surface scale where higher elevation means higher lightness. Four levels is enough.

    --color-surface          oklch(0.18 0.008 <brand-h>)   page background
    --color-surface-raised   oklch(0.21 0.010 <brand-h>)   cards, panels
    --color-surface-floating oklch(0.25 0.012 <brand-h>)   dropdowns, popovers
    --color-surface-overlay  oklch(0.29 0.014 <brand-h>)   modals, sheets

Three properties of this scale matter.

The **steps are about 0.035 in L**, which is just above the threshold where a large flat area
reads as a distinct plane. Smaller steps produce surfaces that look like rendering artefacts;
larger steps make a modal look like it belongs to a different application.

The **chroma rises with lightness**, following the same envelope logic as any other ramp, and
it is non-zero. A dark theme built on chroma-0 greys looks like a terminal. Carrying 0.008 to
0.015 of the brand hue through the surfaces is what makes a dark theme feel like the same
product as its light counterpart.

The **floor is L 0.18, not 0.** Pure black surfaces cause visible smearing during scroll on
OLED panels because pixel transition time is longest coming out of full-off, and the 21:1
ratio against white text produces halation that readers with astigmatism experience as
blurred or doubled glyphs.

Shadows still have a role, but a smaller one: a shadow in a dark theme should be nearly
opaque black at very low blur, expressing contact rather than height, while height itself is
carried by the surface value.

## Foreground

    --color-fg          oklch(0.94 0.005 <brand-h>)
    --color-fg-muted    oklch(0.72 0.010 <brand-h>)
    --color-fg-subtle   oklch(0.58 0.012 <brand-h>)

Pure white foreground on a dark surface is the second half of the halation problem. Backing
off to L 0.94 costs almost nothing in measured contrast and removes the glare.

Note that \`fg-muted\` is *closer* to \`fg\` proportionally than in a light theme. Perceived
contrast compresses at the dark end, so a muted foreground that sits comfortably at 60% of
the way down in a light theme will read as barely legible if mirrored.

## Accents

For each accent, adjust two channels:

1. **Raise L by 0.10 to 0.14.** The accent must now contrast against a dark surface rather
   than a light one, so it moves in the opposite direction from where inversion would take
   it.
2. **Reduce C by 25-40%.** This suppresses the glow.

    light:  --color-accent: oklch(0.58 0.16 255);
    dark:   --color-accent: oklch(0.70 0.11 255);

Then re-check \`accent-fg\`. A light theme usually puts white text on the accent; a dark
theme's lighter accent often needs *dark* text on it instead. This flip is routinely missed
and produces the classic 2.1:1 primary button.

## Borders and separators

Borders in a dark theme are lighter than their surface, and they need more relative
separation than in a light theme because dark-end contrast compresses. A border at
\`oklch(0.30 0.01 h)\` against a surface at \`oklch(0.18 0.01 h)\` is roughly the
perceptual equivalent of a light-theme border at neutral-200 against white.

Where a border is the only thing defining an interactive control's boundary — text inputs,
unchecked checkboxes, switch tracks — it must clear 3:1 against the adjacent surface, and
this is harder to achieve in dark themes. Verify it explicitly rather than assuming symmetry.

## Images and media

Photographs generally need no treatment. Three things do:

- **Logos and illustrations with light backgrounds** need a dark-theme variant, supplied via
  \`<picture>\` with a \`media="(prefers-color-scheme: dark)"\` source rather than a CSS
  filter.
- **Screenshots** are almost always the wrong theme in one mode. Either ship both, or frame
  them on a neutral surface so the mismatch reads as intentional.
- **Data visualisation** palettes must be re-derived, not reused. Categorical series tuned
  for a white background lose separation on a dark one, particularly in the yellow-to-green
  region where the light end of the ramp is closest to the background.

## Switching mechanism

Declare \`color-scheme: light dark\` on the root so form controls, scrollbars, and the
canvas follow the theme. Express token pairs with \`light-dark()\` where both values are
known statically, and fall back to a class or attribute on the root element when the user
can override the system preference:

    :root { color-scheme: light dark; }
    :root { --color-surface: light-dark(oklch(0.98 0.004 255), oklch(0.18 0.008 255)); }
    [data-theme="dark"] { color-scheme: dark; }

Two implementation details prevent visible defects:

**Do not transition colour on the theme switch.** Animating hundreds of properties at once
produces a slow, uneven wash. Switch instantly, or use a short view transition.

**Resolve the theme before first paint.** A theme read from local storage in a
\`useEffect\` guarantees a white flash for dark-mode users. Set the attribute in a
synchronous inline script in \`<head>\`.

## Verification

Re-run the full contrast audit against the dark tokens. Do not assume a pair that passes in
light mode passes in dark — the formula is not symmetric in practice, and the compression at
the dark end means marginal light-theme pairs usually fail their dark counterparts. Check
disabled states in particular: a disabled control in a dark theme that was derived by
lowering opacity will often drop below the 3:1 non-text floor and disappear entirely.`,
      },
    ],
  },

  rules: [
    {
      id: 'colour-systems/perceptual-space',
      strength: 'must',
      statement:
        'Define colour ramps in a perceptually uniform space such as OKLCh, not by stepping HSL lightness or hand-picking hex values.',
      evidence: {
        rationale:
          "HSL's L is the midpoint of the largest and smallest RGB channels, which does not track perceived brightness: hsl(60 100% 50%) and hsl(240 100% 50%) share a nominal lightness but differ in relative luminance by a factor of roughly thirteen. Equal steps in HSL therefore produce perceptually uneven ramps that cannot be corrected by adjustment.",
        source: 'CSS Color Module Level 4, oklch()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '--blue-400: hsl(220 90% 65%);\n--blue-600: hsl(220 90% 45%);\n--blue-800: hsl(220 90% 25%);',
        good: '--blue-400: oklch(0.74 0.14 252);\n--blue-600: oklch(0.58 0.16 255);\n--blue-800: oklch(0.41 0.13 259);',
      },
      verifiedBy: 'ramp-evenness',
    },
    {
      id: 'colour-systems/chroma-falloff',
      strength: 'should',
      statement:
        'Taper chroma toward both ends of a ramp rather than holding it constant across all steps.',
      evidence: {
        rationale:
          'The sRGB and P3 gamuts are widest near the middle of the lightness axis and converge to a point at black and white. A constant chroma is unrepresentable near the ends, so the browser gamut-maps it by clipping, which can render two adjacent steps as the same colour and leave a visible flat spot in the ramp.',
        confidence: 'established',
      },
    },
    {
      id: 'colour-systems/hue-drift',
      strength: 'should',
      statement:
        'Shift hue by 10 to 20 degrees across a ramp, and keep total hue travel under about 30 degrees.',
      evidence: {
        rationale:
          'Perceived hue changes with luminance and with colorimetric purity — the Bezold-Brücke and Abney effects — so a ramp held at a single hue angle appears to drift, most visibly in blues, where OKLCh also carries residual non-linearity that makes dark steps read purple. A small counter-shift cancels this and reads as deliberate.',
        confidence: 'strong',
      },
    },
    {
      id: 'colour-systems/token-layering',
      strength: 'must',
      statement:
        'Components must reference semantic tokens, never palette primitives or raw colour values.',
      evidence: {
        rationale:
          'A theme is a remapping from meaning to value. A component bound to a primitive has no meaning layer to remap, so every theme, rebrand, or contrast fix requires editing components. The semantic layer is also the only level at which a contrast contract can be stated and audited, because contracts on primitives are vacuous and contracts on component tokens do not scale.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '.button-primary { background: var(--blue-600); color: #fff; }',
        good: '.button-primary { background: var(--color-accent); color: var(--color-accent-fg); }',
      },
      verifiedBy: 'token-layering',
    },
    {
      id: 'colour-systems/semantic-token-naming',
      strength: 'should',
      statement:
        'Name semantic tokens by role and relationship (surface, fg-muted, border-strong), never by appearance.',
      evidence: {
        rationale:
          'An appearance-derived name becomes false the moment a second theme exists: --color-light-grey is not light in dark mode, so either the name lies or the token is duplicated. Role names stay true under every theme because the role is what is actually stable.',
        confidence: 'strong',
      },
    },
    {
      id: 'colour-systems/no-filter-invert',
      strength: 'must-not',
      statement: 'Do not implement a dark theme with filter: invert() or a global hue rotation.',
      evidence: {
        rationale:
          'Inversion operates on rendered values rather than on roles, so it rotates every hue by 180 degrees — turning the brand colour into its complement and error red into cyan — inverts photographs and logos, and double-inverts any descendant that compensates. It also cannot express the elevation reversal a dark theme requires.',
        confidence: 'established',
      },
    },
    {
      id: 'colour-systems/dark-elevation-by-lightness',
      strength: 'should',
      statement:
        'In dark themes, express elevation through increasing surface lightness rather than through shadow depth.',
      evidence: {
        rationale:
          'A shadow works by darkening the surface beneath an element. Against an already-dark surface there is little range left to darken into, so the cue is invisible. Raising the lightness of the raised surface substitutes a cue that is both visible and physically consistent, since a nearer surface catches more light.',
        confidence: 'strong',
      },
    },
    {
      id: 'colour-systems/dark-chroma-reduction',
      strength: 'should',
      statement:
        'Reduce accent chroma by roughly 25-40% and raise its lightness when mapping a colour into a dark theme.',
      evidence: {
        rationale:
          'Chromatic aberration in the eye spreads the edge of a saturated colour, and a dilated pupil in a dark viewing environment increases optical scatter. A high-chroma accent against a near-black surface therefore appears to glow and its edges appear soft, which reads as low quality and measurably reduces legibility of text placed on it.',
        confidence: 'strong',
      },
    },
    {
      id: 'colour-systems/no-pure-black-or-white',
      strength: 'should-not',
      statement:
        'Do not use pure black surfaces or pure white foregrounds in a dark theme; keep surfaces near L 0.18 and foregrounds near L 0.94.',
      evidence: {
        rationale:
          'OLED pixels have their longest transition time coming out of the fully-off state, producing visible smearing during scroll, and a 21:1 pair causes halation that readers with astigmatism perceive as blurred or doubled glyphs. Backing off both ends costs negligible measured contrast and removes both effects.',
        confidence: 'strong',
      },
      exceptions: [
        'Deliberate power-saving modes on OLED devices where the trade is explicit and opt-in.',
      ],
    },
    {
      id: 'colour-systems/tinted-neutrals',
      strength: 'should',
      statement:
        'Carry a small chroma of roughly 0.005 to 0.02 at the brand hue through the neutral ramp instead of using chroma-zero greys.',
      evidence: {
        rationale:
          'A neutral sharing the brand hue harmonises with every other ramp by construction, while a chroma-zero grey sits next to a warm or cool brand colour as an unrelated third temperature. The chroma is below the level at which anyone can name the colour, so the effect is felt as coherence rather than seen as tint.',
        confidence: 'opinion',
      },
      exceptions: [
        'Small text, where chromatic foreground colours can fringe under subpixel antialiasing — use chroma 0 for the text neutral and tint only surfaces and borders.',
      ],
    },
    {
      id: 'colour-systems/wcag2-gate',
      strength: 'must',
      statement:
        'Gate every text and background pair on WCAG 2 contrast: 4.5:1 for body text and 3:1 for large text at AA.',
      evidence: {
        rationale:
          "WCAG 2.x is the standard referenced by EN 301 549, Section 508 and ADA case law, and WCAG 3 still has no determined contrast algorithm. Whatever the formula's known perceptual defects, it is the criterion that will be audited, so it is the criterion that must pass.",
        source: 'WCAG 2.2 Success Criterion 1.4.3 (Contrast (Minimum))',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
        confidence: 'established',
      },
      verifiedBy: 'contrast-audit',
    },
    {
      id: 'colour-systems/non-text-contrast',
      strength: 'must',
      statement:
        'Ensure interface component boundaries and meaningful graphical objects clear 3:1 against their adjacent background.',
      evidence: {
        rationale:
          'A control whose only boundary is a hairline at 1.4:1 is not perceivable as a control by a reader with reduced contrast sensitivity, which makes it undiscoverable rather than merely ugly. This applies to input borders, switch tracks, unchecked checkbox outlines, icon-only buttons and chart series edges.',
        source: 'WCAG 2.2 Success Criterion 1.4.11 (Non-text Contrast)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html',
        confidence: 'established',
      },
      exceptions: [
        'Purely decorative dividers and inactive controls, which are explicitly exempt from 1.4.11.',
      ],
      verifiedBy: 'contrast-audit',
    },
    {
      id: 'colour-systems/focus-ring-both-sides',
      strength: 'must',
      statement:
        'Verify the focus indicator at 3:1 against both the component it surrounds and the page background behind it.',
      evidence: {
        rationale:
          'A focus ring sits on the boundary between two surfaces, so a single-sided check passes rings that vanish against the other side. A white ring on a dark button is invisible against a white page; a dark ring is invisible against the button.',
        confidence: 'established',
      },
      examples: {
        language: 'css',
        bad: '.button:focus-visible { outline: 2px solid var(--color-accent); }',
        good: '.button:focus-visible {\n  outline: 2px solid var(--color-focus);\n  outline-offset: 2px;\n  box-shadow: 0 0 0 4px var(--color-surface);\n}',
      },
      verifiedBy: 'contrast-audit',
    },
    {
      id: 'colour-systems/no-hue-only-meaning',
      strength: 'must',
      statement:
        'Never encode meaning in hue alone; pair every semantic colour with a label, icon, or shape and separate semantic pairs by at least 0.15 in OKLCh lightness.',
      evidence: {
        rationale:
          'Roughly 8% of men and 0.5% of women have a colour vision deficiency, overwhelmingly affecting red-green discrimination — exactly the pair conventionally used for error and success. A lightness separation preserves the distinction even when the hue difference collapses.',
        source: 'WCAG 2.2 Success Criterion 1.4.1 (Use of Color)',
        url: 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html',
        confidence: 'established',
      },
      verifiedBy: 'cvd-review',
    },
    {
      id: 'colour-systems/hue-family-count',
      strength: 'should-not',
      statement: 'Do not use more than three hue families plus neutrals in one interface.',
      evidence: {
        rationale:
          'Colour signals importance by being rare within its context. Each additional hue family reduces the information carried by every other one, and past three the palette no longer supports inference about what a colour means.',
        confidence: 'opinion',
      },
      exceptions: [
        'Categorical data visualisation, which needs a purpose-built qualitative scale.',
      ],
    },
    {
      id: 'colour-systems/derived-states',
      strength: 'should',
      statement:
        'Derive hover, active, and disabled colours from the base token by transformation rather than hand-picking separate values.',
      evidence: {
        rationale:
          'Hand-picked state colours drift out of relation with their base the first time the base changes, and they multiply the audit surface by the number of states. A derivation keeps the relationship invariant and means a single token edit re-derives every state correctly.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '--button-bg: #3b6fd4;\n--button-bg-hover: #2f5cb5;\n--button-bg-active: #274c96;',
        good: '--button-bg: var(--color-accent);\n--button-bg-hover: oklch(from var(--color-accent) calc(l - 0.04) c h);\n--button-bg-active: oklch(from var(--color-accent) calc(l - 0.08) c h);',
      },
    },
    {
      id: 'colour-systems/disabled-not-opacity',
      strength: 'should-not',
      statement:
        'Do not express a disabled state with opacity alone; reduce chroma and move lightness toward the surface instead.',
      evidence: {
        rationale:
          'Opacity composites against whatever happens to sit behind the element, so the resulting contrast is unknown at authoring time and changes with context. It also compounds inside already-translucent ancestors and dims the focus indicator, which can push a still-focusable control below the 3:1 non-text floor.',
        confidence: 'strong',
      },
    },
    {
      id: 'colour-systems/p3-progressive',
      strength: 'should',
      statement:
        'Author ramps inside the sRGB gamut and opt individual accents into wider gamut behind a color-gamut media query.',
      evidence: {
        rationale:
          'Browsers gamut-map out-of-range colours per value, and the mapping reduces chroma independently for each step. Two adjacent ramp steps that both exceed the gamut can therefore clip to the same rendered colour, silently destroying a step of the ramp on sRGB displays.',
        confidence: 'strong',
      },
      examples: {
        language: 'css',
        bad: '--color-accent: oklch(0.58 0.30 255); /* outside sRGB; clips unpredictably */',
        good: '--color-accent: oklch(0.58 0.16 255);\n@media (color-gamut: p3) {\n  :root { --color-accent: oklch(0.58 0.21 255); }\n}',
      },
    },
    {
      id: 'colour-systems/apca-tiebreak',
      strength: 'may',
      statement:
        'Use APCA Lc values to choose between candidate pairs that already satisfy WCAG 2, particularly in dark themes.',
      evidence: {
        rationale:
          "WCAG 2's formula is polarity-blind and its fixed 0.05 flare term inflates ratios among dark pairs — #767676 scores above 4.5:1 against both white and black, which cannot be perceptually true. APCA models polarity and spatial frequency, so it discriminates usefully where WCAG 2 does not, but it is advisory: it was removed from the WCAG 3 drafts and no regulation references it.",
        source: 'APCA in a Nutshell',
        url: 'https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html',
        confidence: 'contested',
      },
    },
    {
      id: 'colour-systems/theme-before-paint',
      strength: 'should',
      statement:
        'Resolve the active theme synchronously before first paint, and do not transition colour properties during a theme switch.',
      evidence: {
        rationale:
          'A theme read after hydration paints the default theme first, producing a full-viewport white flash for dark-mode users. Transitioning colour across hundreds of elements simultaneously composites unevenly and reads as a slow wash rather than a switch.',
        confidence: 'strong',
      },
    },
  ],

  verification: [
    {
      id: 'ramp-evenness',
      kind: 'self-review',
      description: 'Confirm each ramp is perceptually even and in gamut.',
      questions: [
        'List the OKLCh lightness of every step in each ramp. Are any two adjacent steps closer than 0.03 apart, or is any single gap more than twice its neighbours?',
        'Does chroma peak in the middle of the ramp and fall off at both ends, or is it constant?',
        'Does any step require clipping to fit the sRGB gamut? If so, which two steps now render as the same colour?',
        'Does hue drift monotonically across the ramp, by between 10 and 30 degrees in total?',
      ],
    },
    {
      id: 'token-layering',
      kind: 'self-review',
      description: 'Confirm the three token layers are intact.',
      blocking: true,
      questions: [
        'Does any component or utility class reference a palette primitive or a literal colour value directly?',
        'Is every semantic token defined once per theme, with the same set of names in each theme?',
        'Is any semantic token named after its appearance rather than its role?',
      ],
    },
    {
      id: 'contrast-audit',
      kind: 'self-review',
      description: 'Confirm every rendered colour pair meets WCAG 2 AA, in every theme.',
      blocking: true,
      questions: [
        'For each theme, does foreground and muted-foreground text clear 4.5:1 against every surface it appears on?',
        'Do hover, active, and selected background states still clear 4.5:1 with their foreground?',
        'Do input borders, switch tracks, unchecked controls, and icon-only buttons clear 3:1 against their adjacent surface?',
        'Does the focus indicator clear 3:1 against both the component and the surface behind it?',
        'Was the dark theme audited independently, rather than assumed to pass because the light theme did?',
      ],
    },
    {
      id: 'dark-theme-review',
      kind: 'self-review',
      description: 'Confirm the dark theme was constructed rather than inverted.',
      questions: [
        'Do raised surfaces get lighter with elevation, and is each step at least 0.03 in lightness above the last?',
        'Is the darkest surface above L 0.15 and the lightest foreground below L 0.97?',
        'Was accent chroma reduced relative to the light theme, and was the foreground on the accent re-checked after that change?',
        'Do logos, illustrations, and screenshots have dark-theme variants, or are they filtered?',
      ],
    },
    {
      id: 'cvd-review',
      kind: 'self-review',
      description: 'Confirm no meaning is carried by hue alone.',
      blocking: true,
      questions: [
        'List every place colour signals state. Does each also carry a label, an icon, or a distinct shape?',
        'Rendered in greyscale, do error and success remain distinguishable? What is their lightness difference?',
        'Under a deuteranopia simulation, does any pair of categorical series in a chart collapse into the same colour?',
      ],
    },
    {
      id: 'contract-audit',
      kind: 'contract',
      description: 'Evaluate the palette against the project Design Contract colour section.',
      contractSection: 'colour',
    },
  ],

  relatedSkills: [
    'design-judgment',
    'design-tokens',
    'accessible-components',
    'data-visualisation',
  ],
}
