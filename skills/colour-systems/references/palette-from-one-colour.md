# Building a full palette from a single brand colour

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

Take the brand's chroma as the peak, `Cmax`, and multiply:

    50   0.15 x      600  1.00 x
    100  0.25 x      700  0.95 x
    200  0.45 x      800  0.80 x
    300  0.65 x      900  0.62 x
    400  0.85 x      950  0.45 x
    500  0.97 x

Then clamp every step into gamut. If any step needs its chroma reduced by more than about
15% to fit, lower `Cmax` for the whole ramp rather than clipping one step — a ramp where
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

- `fg` on `surface` and on `surface-raised`: 4.5:1 minimum.
- `fg-muted` on both: 4.5:1 minimum. This is the pair that fails most often, because
  "muted" is chosen by eye and neutral-500 is almost always too light.
- `accent-fg` on `accent` and on `accent-hover`: 4.5:1. Hover states are routinely
  skipped and routinely fail.
- `border` against `surface`: 3:1 **only if the border is the sole indicator** of an
  input's boundary. Decorative dividers are exempt.
- Focus ring against `surface`, `surface-raised`, and `accent`: 3:1 against each.

## Step 7 — Emit

Emit primitives as hex or as sRGB-clamped OKLCh for the base case, and keep the generating
parameters (hue, Cmax, ladder) in source. The parameters are the palette; the hex values are
a build artefact. When the brand colour changes, you re-run the function rather than
re-picking 66 values by hand.
