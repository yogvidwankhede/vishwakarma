# Flow displacement

## The mechanism

Displacement is one idea applied to a different input. Instead of offsetting a backdrop by a
height gradient, offset a *texture's own* coordinates by a vector field, so the image appears to
be carried along by a current.

```glsl
vec2 flow(vec2 p, float t) {
  // A divergence-free-ish field: perpendicular to the gradient of a scalar noise.
  float n  = fbm(p * 1.7 + vec2(0.0, t * 0.05));
  float nx = fbm(p * 1.7 + vec2(0.01, t * 0.05)) - n;
  float ny = fbm(p * 1.7 + vec2(0.0, 0.01 + t * 0.05)) - n;
  return vec2(-ny, nx);            // rotate 90 degrees: flows around, not outward
}

vec2 uvFlowed = uv + flow(uv, time) * amount;
vec3 colour   = texture(source, uvFlowed).rgb;
```

The 90-degree rotation is the detail that matters. The raw gradient of a noise field points
*uphill*, so displacing along it makes the image bulge and pinch — it looks like heat haze. The
perpendicular is tangent to the contours, so the image slides *along* them, which reads as flow.

## Keep it derived, never accumulated

The tempting implementation feeds each frame's output back in as the next frame's input, which
gives beautiful long smears. It also makes the surface a function of its own history, and that
costs four things: it cannot be paused and resumed to the same state, it cannot be scrubbed or
reversed, it diverges between a tab that stayed open and one that was backgrounded, and it cannot
be reproduced for a screenshot comparison — so `visual-feedback-loop` cannot check it.

`media-driven-motion` states the same rule for scroll-driven media, and it holds for the same
reason: **derive from a parameter, never integrate.** If long smears are genuinely the effect,
get them by sampling the flow field at several offsets along the streamline within a single
frame, which is deterministic:

```glsl
vec3 sum = vec3(0.0);
for (int i = 0; i < STEPS; i++) {
  float s = float(i) / float(STEPS);
  sum += texture(source, uv + flow(uv, time) * amount * s).rgb;
}
vec3 colour = sum / float(STEPS);
```

`STEPS` multiplies the texture fetches, so it is a fill-rate decision: four to six is usually
enough, and the cost is linear in it.

## Applying it to a logo

A logo is the hardest case because it is the one image whose shape is not yours to distort.

- **Displace inside the mark, not its silhouette.** Keep the alpha channel unflowed and flow only
  the colour inside it, so the outline stays exact and the interior moves. Sample the source's
  alpha at the *undisplaced* coordinate and its colour at the displaced one.
- **Bound the amount by the smallest feature.** If the thinnest stroke is 6 pixels and the
  displacement reaches 8, the stroke tears. Measure the thinnest stroke; cap `amount` below it.
- **Ship the undistorted mark as the real asset.** The flowing version is decoration over an SVG
  that is still the logo when no shader runs. A brand mark that only exists as a shader output
  cannot be printed, favicon'd, or read by anything that does not run WebGL.

## Applying it to type

Do not. Displaced letterforms stop being readable before they start being interesting, and the
text is no longer text to a screen reader, a crawler, or find-in-page. If the effect is wanted
behind type, put the flow on the surface and leave the type as type on a plate above it.

## Cost

One pass, `STEPS` texture fetches per pixel, one noise evaluation per fetch if the field is
sampled per step — that last one is the trap, since a naive loop recomputes `fbm` several times
per pixel. Hoist the field evaluation out of the loop and reuse the direction; the streamline is
straight enough over a few pixels.

Half-resolution rendering is very effective here, because the output is already a smeared version
of a photograph and the missing detail was being destroyed anyway.
