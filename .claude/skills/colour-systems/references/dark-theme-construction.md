# Constructing a dark theme

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
brand identity by construction, which is why `filter: invert(1)` is never acceptable as a
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

Note that `fg-muted` is *closer* to `fg` proportionally than in a light theme. Perceived
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

Then re-check `accent-fg`. A light theme usually puts white text on the accent; a dark
theme's lighter accent often needs *dark* text on it instead. This flip is routinely missed
and produces the classic 2.1:1 primary button.

## Borders and separators

Borders in a dark theme are lighter than their surface, and they need more relative
separation than in a light theme because dark-end contrast compresses. A border at
`oklch(0.30 0.01 h)` against a surface at `oklch(0.18 0.01 h)` is roughly the
perceptual equivalent of a light-theme border at neutral-200 against white.

Where a border is the only thing defining an interactive control's boundary — text inputs,
unchecked checkboxes, switch tracks — it must clear 3:1 against the adjacent surface, and
this is harder to achieve in dark themes. Verify it explicitly rather than assuming symmetry.

## Images and media

Photographs generally need no treatment. Three things do:

- **Logos and illustrations with light backgrounds** need a dark-theme variant, supplied via
  `<picture>` with a `media="(prefers-color-scheme: dark)"` source rather than a CSS
  filter.
- **Screenshots** are almost always the wrong theme in one mode. Either ship both, or frame
  them on a neutral surface so the mismatch reads as intentional.
- **Data visualisation** palettes must be re-derived, not reused. Categorical series tuned
  for a white background lose separation on a dark one, particularly in the yellow-to-green
  region where the light end of the ramp is closest to the background.

## Switching mechanism

Declare `color-scheme: light dark` on the root so form controls, scrollbars, and the
canvas follow the theme. Express token pairs with `light-dark()` where both values are
known statically, and fall back to a class or attribute on the root element when the user
can override the system preference:

    :root { color-scheme: light dark; }
    :root { --color-surface: light-dark(oklch(0.98 0.004 255), oklch(0.18 0.008 255)); }
    [data-theme="dark"] { color-scheme: dark; }

Two implementation details prevent visible defects:

**Do not transition colour on the theme switch.** Animating hundreds of properties at once
produces a slow, uneven wash. Switch instantly, or use a short view transition.

**Resolve the theme before first paint.** A theme read from local storage in a
`useEffect` guarantees a white flash for dark-mode users. Set the attribute in a
synchronous inline script in `<head>`.

## Verification

Re-run the full contrast audit against the dark tokens. Do not assume a pair that passes in
light mode passes in dark — the formula is not symmetric in practice, and the compression at
the dark end means marginal light-theme pairs usually fail their dark counterparts. Check
disabled states in particular: a disabled control in a dark theme that was derived by
lowering opacity will often drop below the 3:1 non-text floor and disappear entirely.
