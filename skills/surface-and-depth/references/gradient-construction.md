# Constructing gradients that do not band or go grey

## Why sRGB interpolation produces grey

CSS mixes gradient stops component-wise unless told otherwise. Blue `#0000ff` to yellow
`#ffff00` gives `#7f7f7f` at the midpoint, because averaging opposing channels lands on
neutral. The gradient visibly desaturates in the middle and then re-saturates, which reads
as dirt rather than as a transition.

The failure is proportional to the hue distance between stops. Two stops of the same hue
differing only in lightness interpolate acceptably in sRGB. Two stops a quarter of the wheel
apart do not.

```css
/* muddy: passes through grey */
background: linear-gradient(90deg, #2563eb, #f5d90a);

/* clean: perceptual path, chroma preserved */
background: linear-gradient(in oklab 90deg, #2563eb, #f5d90a);
```

Choosing the space:

- `in oklab` — the default choice. Straight-line path in a perceptually uniform space;
  never overshoots, never introduces a hue that is not at either end.
- `in oklch` — takes the shorter arc around the hue wheel, so it keeps chroma high and
  passes *through* intermediate hues. Use it deliberately when you want blue to reach red
  via violet; it is wrong when you want the shortest visual distance.
- `in srgb` — only when reproducing a legacy design exactly.

For older engines, declare the plain gradient first and the interpolated one second. A
browser that does not parse `in oklab` discards the second declaration and keeps the first,
which is the standard CSS fallback mechanism.

## Easing the gradient

A two-stop linear gradient distributes colour evenly in *space*, but perceived brightness
does not change evenly, so the transition looks abrupt at one end. Two corrections:

**Interpolation hints.** A bare percentage between two stops moves the midpoint:
`linear-gradient(#000, 35%, #333)` puts the halfway colour at 35% of the length, which
compresses the dark end and stretches the light one.

**Multi-stop easing.** For a fade to transparent — the single most common banding source —
never go straight from a colour to `transparent`. In sRGB, `transparent` is
`rgb(0 0 0 / 0)`, so the gradient fades through black and produces a grey-brown halo.
Fade to the same colour at zero alpha instead, and add intermediate stops on an ease curve:

```css
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
```

## Predicting banding

Banding is quantisation. An 8-bit channel has 256 levels, so a gradient's band width is
roughly `length_in_px ÷ levels_of_change`. A 1200px hero moving from `#111111` to
`#191919` changes eight levels and therefore paints 150px stripes. Anything above about
4px per band is visible to a normal viewer on a decent panel; on an OLED phone in a dark
room it is obvious far sooner.

The rule of thumb: **large area plus small colour delta equals banding**. Either increase
the delta, shorten the run, or dither.

## Dithering with grain

A small amount of noise moves each pixel randomly across the quantisation boundary. The eye
integrates the noise spatially and the step edge dissolves. Amplitude needs to be about one
quantisation step, which is 2 to 4% opacity — far less than looks right in isolation.

```css
.grain::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.035;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

Practical constraints. Keep the tile at 128px or larger, or the repeat becomes a visible
plaid. Never animate the noise layer — regenerating or translating it forces repaint of the
whole surface. Set `pointer-events: none` so the overlay does not eat clicks. And keep the
opacity under about 6%: past that it stops being dither and starts being texture, which is a
different and much more committal design decision.

## Gradients that carry meaning

Most gradients in product UI should be almost invisible: a 4 to 8% lightness shift across a
surface to suggest a light source, a scrim behind text over an image, a fade at the edge of
a scrolling container to signal more content. These are functional and read as craft.

Large, saturated, multi-hue gradients read as decoration and date quickly. If a gradient's
job is to be noticed, the interface is asking colour to do work that hierarchy should be
doing. The exception is a genuine brand surface — a single hero, once per page — where the
gradient is the identity rather than an ornament.
