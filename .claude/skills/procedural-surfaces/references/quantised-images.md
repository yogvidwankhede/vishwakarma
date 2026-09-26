# Quantisation and decomposition

These techniques need no WebGL. A 2D canvas, `getImageData`, and arithmetic do all of it — which
makes them the cheapest effects in this skill and the only ones whose output can be real text,
real DOM, or a real SVG file. That matters more than it sounds: an ASCII rendering that is
actually characters is selectable, searchable, scalable and readable by a screen reader, while
the same picture drawn on a canvas is an opaque rectangle.

## The shared shape

1. Divide the image into a grid of cells.
2. Reduce each cell to one number — its mean luminance, computed in a perceptual space, not as
   `(r+g+b)/3`.
3. Map that number onto an ordered set of marks.

Step 3 is where the craft is.

## ASCII and block rendering

**The glyph ramp must be ordered by measured ink coverage.** The ubiquitous
`"@%#*+=-:. "` ordering is an *estimate*, and it is wrong for your font: coverage depends on the
typeface's weight, its x-height, and its advance width. A ramp that is out of order produces
reversals — mid-tones that read lighter than the tones either side — and the image looks noisy
for no visible reason.

Measure it instead, once, at build time:

```ts
function coverage(glyph: string, font: string, size = 32): number {
  const c = new OffscreenCanvas(size, size)
  const ctx = c.getContext('2d')!
  ctx.font = `${size}px ${font}`
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
```

**The cell aspect ratio must match the font's.** Monospace cells are taller than they are wide —
typically an advance of 0.5 to 0.6 of the line height. Sampling square cells and printing them
into tall cells stretches the picture vertically by nearly two to one. Compute the cell size from
the measured advance width and line height, not from a guess.

**Unicode block elements beat characters for photographs.** `▁▂▃▄▅▆▇█` are ordered by coverage
*by construction* and have no letter shapes to add texture, so they give a cleaner tonal ramp.
Half-blocks (`▀▄`) with separate foreground and background colours double vertical resolution
for free, since one cell then carries two independently coloured pixels.

**Contrast, still.** An ASCII rendering is text on a background and WCAG applies to it exactly as
to any other text. A ramp that runs to near-white glyphs on white fails, and the fact that it is
"art" does not exempt it — mark it `aria-hidden` with a real text alternative if it is decorative,
or keep it contrast-compliant if it is content.

## Halftone

Same pipeline, with a dot per cell whose *radius* encodes the tone, and two differences that
matter.

**The grid is rotated.** Print halftones sit at 15, 45 or 75 degrees because an axis-aligned dot
grid interferes with the pixel grid and produces moiré. Rotate the sampling lattice rather than
the dots.

**Dot area, not dot radius, is linear in tone.** Radius proportional to luminance makes midtones
far too dark, because area goes as the square. Use `r = maxR * sqrt(tone)`.

Halftone output is SVG-shaped: a few thousand circles, which scales to any size and compresses
well. Above roughly 20,000 dots, draw to a canvas instead.

## Fitted primitives

The "image as geometry" look comes from greedy fitting: repeatedly add the single primitive —
triangle, circle, rectangle — that most reduces total error against the target, keep it, and
continue.

```
error(candidate) = sum over affected pixels of (target - current)^2
```

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
Ship the original with correct `alt` text, and treat the rendering as a presentation layer over
it — which is exactly what it is.
