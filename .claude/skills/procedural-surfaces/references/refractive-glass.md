# Refraction

## Why CSS glass reads as plastic

`backdrop-filter: blur(12px)` convolves the backdrop with a symmetric kernel. Every output
pixel is an average of its neighbours, so the result is *softer* in the same place. Glass does
something different: it bends light, so the backdrop appears *somewhere else*, and how far it
moves depends on the angle of the surface. Averaging and displacing are different operations and
the eye distinguishes them immediately, which is why CSS glass is recognisable as an effect
rather than as a material.

`surface-and-depth` covers when CSS glass is the right answer — over imagery, with a solid
fallback, never over a flat fill. This file covers the case where it is not enough.

## The mechanism

Model the panel as a **height field**: a function giving surface elevation across the panel. A
rounded-rectangle bevel is height 1 in the interior falling smoothly to 0 across a border band.

The surface normal points along the gradient of that height. Where the field is flat the
gradient is zero and light passes straight through; where it falls steeply the gradient is large
and light bends hardest. So the whole effect is one line of intent: **offset the backdrop sample
by the gradient of the height field.**

```glsl
// Central differences give the gradient; 'texel' is one pixel in UV units.
float hL = height(uv - vec2(texel.x, 0.0));
float hR = height(uv + vec2(texel.x, 0.0));
float hD = height(uv - vec2(0.0, texel.y));
float hU = height(uv + vec2(0.0, texel.y));
vec2  grad = vec2(hR - hL, hU - hD);

vec2 offset = grad * strength;
vec3 colour = texture(backdrop, uv + offset).rgb;
```

That already reads as glass. Two additions make it convincing.

**Dispersion.** Real glass refracts short wavelengths more than long ones. Sample the three
channels at slightly different offsets:

```glsl
float r = texture(backdrop, uv + offset * 0.94).r;
float g = texture(backdrop, uv + offset * 1.00).g;
float b = texture(backdrop, uv + offset * 1.06).b;
```

A few per cent of separation is enough. This is the single detail that separates convincing glass
from a wobble, and it is invisible in the middle of the panel and obvious at its edges — which
is correct, because that is where the gradient is large.

**Edge light.** The gradient magnitude is already a rim mask: `length(grad)` is near zero in the
interior and peaks on the bevel. Add a small amount of it as a highlight, tinted toward the
scene's light direction, and the panel gains a physical edge instead of a border.

Keep a little blur as well. Real glass is not perfectly clear, and blur plus displacement reads
better than either alone.

## Where the backdrop texture comes from

This is the constraint that decides feasibility, and it has three answers.

**A render target.** Draw the scene behind the panel into a framebuffer, then draw the panel
sampling it. Correct, live, and it costs one extra pass — which means at low tier, where the
budget is zero passes, it does not happen.

**An SVG filter.** `feDisplacementMap` driven by an `feTurbulence` or a supplied image does
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

Under `prefers-reduced-motion`, a static refraction is fine: it is not motion. If the height
field animates, freeze it.

The fallback is `surface-and-depth`'s CSS glass, then a solid surface. Both are designed
surfaces rather than degradations, which is what makes it safe to gate the shader at high tier.
