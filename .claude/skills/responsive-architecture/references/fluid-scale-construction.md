# Constructing a fluid type and space scale

A fluid scale is not a list of `clamp()` calls invented one at a time. It is two ratio-based
scales — one anchored at the narrow viewport, one at the wide — with each step linearly
interpolated between its two anchors. Building it in that order is what keeps the
relationships between steps intact at every width in between.

## Step 1: choose the two anchors

Pick the viewport range over which the scale should move. 320px to 1280px is a sound default:
below 320 nothing should still be shrinking, and above 1280 further growth makes measure
worse rather than better. Outside the range the `clamp()` bounds hold the value flat, which
is the desired behaviour — a 2560px monitor should not get 40px body text.

## Step 2: choose two ratios

At the narrow anchor, use a compact ratio: 1.2 (minor third) is typical, because on a small
screen a large ratio wastes vertical space and forces headings to wrap.

At the wide anchor, use a more expressive ratio: 1.25 to 1.333. There is room for contrast,
and hierarchy should be more emphatic.

With a 16px base at 320px and an 18px base at 1280px:

| Step | Narrow (320px) | Wide (1280px) |
| --- | --- | --- |
| -1 | 13.33px | 13.5px |
| 0 | 16px | 18px |
| 1 | 19.2px | 22.5px |
| 2 | 23.04px | 28.13px |
| 3 | 27.65px | 35.16px |
| 4 | 33.18px | 43.95px |
| 5 | 39.81px | 54.93px |

Note that the ratios diverge, so the top of the scale grows far more than the bottom. That is
the point: body text barely moves, display text moves a lot.

## Step 3: solve each step

For each step, with sizes in px and viewports in px:

    slope     = (maxSize - minSize) / (maxVw - minVw)
    intercept = minSize - slope * minVw
    preferred = (intercept / 16)rem + (slope * 100)vw
    value     = clamp((minSize/16)rem, preferred, (maxSize/16)rem)

Worked for step 3 (27.65px to 35.16px over 320px to 1280px):

    slope     = 7.51 / 960      = 0.007823
    intercept = 27.65 - 2.503   = 25.147px = 1.5717rem
    result    = clamp(1.7281rem, 1.5717rem + 0.7823vw, 2.1975rem)

Verify by substituting both endpoints. At 320px: 25.147 + 0.007823*320 = 27.65. At 1280px:
25.147 + 10.01 = 35.16. If an endpoint does not reproduce the intended size, the arithmetic
is wrong, and the error will be invisible except at intermediate widths.

## Step 4: the accessibility constraint

The preferred term must retain a `rem` component, and both bounds must be expressed in
`rem`. Viewport units are computed from the viewport alone and ignore the root font size, so
a preferred term of pure `vw` produces text that does not respond to a user's font-size
preference anywhere in the fluid range.

A rule of thumb that keeps this safe: the `rem` intercept should contribute at least half
the value at the narrow anchor. If the intercept is small or negative, the line is too steep
— the min and max are too far apart for the viewport range — and the result behaves like pure
`vw`. Narrow the size range or widen the viewport range.

Negative intercepts also mean the value would be negative at very small viewports. The
`clamp()` minimum masks this, but it is a signal that the scale is badly conditioned.

## Step 5: space

Apply the same construction to spacing, with two differences. Space should scale more
aggressively than type — the ratio between the narrow and wide anchor for a section gap can
reasonably be 2x, where type is rarely more than 1.4x — because whitespace is what makes a
wide layout feel composed rather than stretched.

Second, keep small spacing steps fixed. Gaps below about 12px (icon-to-label, input padding)
should not be fluid at all: they are governed by the size of the things they separate, not by
the window, and fluidising them produces sub-pixel values that round inconsistently.

For internal component spacing, use container query units instead of viewport units:
`padding: clamp(0.75rem, 0.5rem + 2cqi, 1.5rem)` scales a card's padding with the card,
which is what the card actually cares about.

## Failure modes

**Convergence.** Because different steps use different slopes, two adjacent steps can meet at
some width and even cross. Always tabulate every step at 320, 768, and 1280 and confirm the
ordering holds throughout.

**Fluid everything.** Borders, radii, icon sizes, and line heights should generally not be
fluid. A fluid border width renders at 1.3px and looks broken.

**Fluid line-height.** Set `line-height` as a unitless ratio and let it follow the fluid
font size. A fluid `line-height` in `rem` decouples leading from size and breaks vertical
rhythm at intermediate widths.

**No flat top.** Omitting the maximum, or setting it far too high, produces 60px body text on
a large monitor. The maximum is the most important of the three arguments.

**Ignoring zoom interaction.** Page zoom shrinks the CSS viewport, so a fluid value moves
*down* the curve as the user zooms in, partially cancelling the zoom. The `rem` intercept is
what keeps the net effect positive; verify at 200% zoom that text genuinely got larger.
