# Computed colour fields

## Why a computed field cannot band

A CSS gradient interpolates between stops in 8-bit output. A gentle transition across 1400 pixels
with only a few dozen distinguishable steps available lands many pixels on the same quantised
value, and the eye is extremely good at finding those edges — hence the bands, and hence
`surface-and-depth`'s dithering advice.

A computed field evaluates a continuous function at every pixel, so adjacent pixels differ by a
sub-quantum amount and the quantisation error scatters rather than aligning into contours. Add a
little ordered dither at the end and the banding is gone entirely rather than reduced.

## Fractional Brownian motion, and why three octaves

The standard construction for a natural-looking field is a sum of a smooth noise function at
doubling frequencies and halving amplitudes:

```glsl
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
```

The octave count is a fill-rate decision, not a quality one. Each octave doubles the spatial
frequency, so once an octave's features are smaller than a pixel it contributes noise the display
cannot resolve — it costs instructions and returns aliasing. For a full-viewport background field,
**three octaves is usually the visible limit and four is generous.** Six is a number copied from
terrain generation, where the camera gets close enough for it to matter.

Write `noise` yourself. Gradient noise is a published mathematical construction — a hash to
pseudo-random gradients at lattice points, a dot product with the offset, a smooth interpolation
— and implementing it from that description takes a few lines. Pasting one takes its licence with
it.

## Where these go wrong, and it is not the technique

Every violet-to-cyan hero on the internet uses this technique correctly. The tell is not the
noise; it is that the hues were chosen inside the shader, where no palette discipline reaches.

**Sample the ramp instead.** Pass the project's own colour ramp in as a small texture or a
uniform array, and use the field value to index it:

```glsl
float t = clamp(fbm(uv * scale + vec2(time * 0.02, 0.0)), 0.0, 1.0);
vec3 colour = texture(ramp, vec2(t, 0.5)).rgb;
```

Now the field's colours are the system's colours by construction. A monochromatic ramp — see
`colour-systems`' `colour-schemes.md` — produces a field that reads as material rather than as
a gradient, because there is no hue travel to give it away.

Two more disciplines that follow from the rest of the catalogue:

- **Build the ramp in a perceptual space, not in the shader.** Interpolating in linear RGB
  between two saturated hues passes through a desaturated middle; that grey band is a giveaway.
  Generate the ramp with `@vishwakarma/core`'s colour maths, upload the result.
- **Check contrast against the field, not against its average.** Text over a moving field has a
  *different* backdrop every frame. Either the text sits on a solid plate, or the field's
  lightness range is clamped tight enough that the worst case still passes — and the worst case
  is what you must measure.

## Motion without animating anything

Advance one `time` uniform and the whole field moves, with no DOM animation, no layout, and no
per-element work. This is the cheapest large-area motion available, which is precisely why it
needs the discipline: it is large-area motion, so `prefers-reduced-motion: reduce` must freeze
the uniform. Freeze it, do not remove the field — a still field is a perfectly good surface, and
substituting a flat colour is a larger change than the preference requested.

Derive the offset from the time uniform rather than accumulating it between frames. An
accumulator cannot be paused and resumed to the same state, cannot be scrubbed, and drifts
between tabs that were backgrounded.

## Precision, and the bug that only appears on phones

`highp` float precision is not guaranteed for fragment shaders on mobile GPUs. A noise function
fed coordinates in the thousands — a large `scale`, or a `time` that has been running for
minutes — loses mantissa bits and the field visibly quantises into blocks or freezes. Keep
coordinates small: scale UVs modestly, and wrap the time uniform with `mod(time, 1000.0)` before
it enters the shader. This never reproduces on the machine that built it.
