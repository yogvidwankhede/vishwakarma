# Scroll-driven scene timelines

A rendered scene is the only frame source that can respond to viewport, theme, data or input, and
the only one where a camera move costs no extra bytes. It is also the one where scroll driving
goes wrong most quietly, because the two most common bugs both produce a scene that is correct in
memory and wrong on screen.

`webgl-experiences` owns mounting, tiering, budgets and fallback. This file owns the timeline
only, and assumes the scene is already inside an `AdaptiveCanvas` under a `PerformanceGuard`.

## Bug one: the scene stops updating

`AdaptiveCanvas` renders on demand. React state changes ask for a frame automatically; **nothing
else does**. Scroll progress written to a ref — which is the correct place for it, since it
changes 60 times a second — bypasses the reconciler entirely, so the camera moves and the canvas
never redraws.

```tsx
import { useOnDemandRender } from '@vishwakarma/three'
import { useProgressBinding } from '@vishwakarma/scroll'

const progress = useRef(0)
const { requestRender } = useOnDemandRender()

useProgressBinding(sectionRef, {
  native: false,
  onProgress: (p) => {
    progress.current = p
    requestRender()
  },
})
```

`requestRender()` asks for one frame, which is exactly right for a scrub: each scroll frame
produces one rendered frame and a stationary scroll produces none. Use `renderFor(ms)` instead
only when the motion continues after input stops — a scripted fly-through triggered at a
threshold, or a damped settle. A single frame for damped motion renders the first step and
freezes, because the thing that would have asked for the second frame was the second frame.

If `useRenderHandle()` returns `null` the scene simply renders continuously; treat that as a
performance regression to fix, never as an error to throw on.

## Bug two: the camera accumulates

```ts
// Wrong: state depends on scroll history, so it disagrees with the page after any jump.
camera.position.z -= delta
```

Every scroll-driven value must be a **pure function of progress**. Then a reload at 60 % of the
section, a fragment link into it, and a slow scroll to it all produce identical pixels.

```ts
function sampleCamera(p: number, out: Vector3): void {
  // A fixed path evaluated at p. Deterministic, reversible, jump-safe.
  out.set(Math.sin(p * Math.PI) * 4, 1.2 + p * 2.4, 8 - p * 6)
}
```

The same applies to a baked animation: set `mixer.setTime(p * clipDuration)` rather than calling
`mixer.update(delta)`. `setTime` is idempotent and seekable; `update` integrates and drifts.

## Smoothing without lying

A camera that tracks scroll exactly can feel mechanical, and the usual fix — a spring or a lerp
toward the target — reintroduces history. Keep it bounded and keep it in the render, not in the
state:

```ts
// In the frame callback. Converges on the derived target, so a jump still resolves within a
// few frames rather than animating across the whole path.
smoothed.current += (progress.current - smoothed.current) * 0.15
```

Cap the catch-up so a fragment jump cannot produce a long unrequested camera move: if the gap
exceeds roughly 0.2, snap instead of easing.

## What makes a rendered scene read as real

The failure mode here is not technical. It is a scene lit by one directional light and an
ambient term, with no contact shadow, no visible material response, and a camera on a straight
line. That reads as a 3D viewer, not as footage.

- **Contact.** An object with no shadow where it meets a surface floats. One shadow caster
  inside budget buys more realism than any post-processing pass.
- **Light with a direction and a colour.** Two or three lights with different temperatures, one
  clearly dominant. An environment map does more for a metal or a glaze than roughness tuning.
- **A camera that is somewhere.** Real cameras have a focal length, sit at a height, and move on
  arcs. A field of view chosen for the shot beats a library default; at portrait aspect ratio,
  re-check that the subject is still framed.
- **Motion that is not linear in the wrong place.** Scrub position should map linearly to path
  distance, but the path itself can ease — a camera that slows as it arrives reads as
  intentional, and that shaping belongs in the path function, not in a timing function on the
  scrub.

Verify against `SCENE_BUDGETS` at the lowest tier the page ships before adding any of this.
A second shadow caster that pushes the low tier over its draw-call ceiling makes the page worse
on the devices that carry most of the traffic.

## Reduced motion

`useReducedMotionScene` gives the scene's own vocabulary for the preference. For a scroll-driven
camera the correct response is to stop driving it and render the chosen composition — still, but
present and inspectable. Do not replace the scene with an image, and do not leave the scroll
binding attached with its output ignored.
