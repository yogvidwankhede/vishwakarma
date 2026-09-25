# Loading a scene, and what a frame costs

## Why a 3D hero must not own the largest contentful paint

The renderer, the scene graph, the models and the textures are megabytes of JavaScript and
binary that must be fetched, parsed, compiled, uploaded to the GPU and drawn before anything
appears — while contending for the same main thread that hydration, fonts and the page's own
text need. The measured result is consistent: seconds added to the largest paint, interaction
delayed, and a layout shift when the canvas finally takes its space.

No amount of visual quality compensates, because the user who left at two seconds never saw the
scene either.

The correct arrangement: **ship the still composition as the real content, let it be the
largest paint, and upgrade to the scene afterwards.** `LazyScene` with `eager` does exactly
this — it skips the viewport gate for above-the-fold content and keeps everything else,
including the fallback owning the layout until the scene can replace it.

## The progressive sequence

1. **HTML with a poster.** A real image at the canvas's aspect ratio, in the reserved box, with
   `srcSet`. Eager, never lazy — a fallback that lazy-loads is a blank box during exactly the
   window it exists to cover, and if it is the hero it is also the largest paint.
2. **Capability probe** in an idle callback (`requestIdleCallback` with a 500 ms timeout,
   falling back to `setTimeout`), one frame or more after first paint.
3. **Peer chunks** — `@react-three/fiber`, then `three`, then `drei` if used — fetched by
   dynamic import so they are a separate chunk. The specifier is a literal so the bundler can
   see and split it; passing a variable silences the missing-module warning at the cost of the
   code splitting that was the entire point.
4. **Model and textures**, streamed.
5. **First draw**, then cross-fade the canvas over the poster in the same box.

`SceneFallbackReason` (`'loading' | 'unsupported' | 'declined' | 'error' | 'offscreen'`) is
accepted, recorded and deliberately not rendered. Branch on it for analytics; never put it on
screen. "3D unavailable on your device" tells the user something they cannot act on, in the
place they expected the product.

And no spinner. A progress bar in place of a hero implies the real content is imminent and
worth waiting for, so the user waits — and a substantial fraction will never get the scene.

## Who sees the fallback

Everyone before the bundle arrives; every device that failed the probe; everyone with data
saving on; everyone behind a proxy that mangled the module; everyone whose GPU process
crashed; every crawler; every link preview; every print. On the metrics that measure the first
impression it is **everyone**, because the fallback occupies the space while the scene is still
being decided upon.

## Compression, and why transferBytes is its own budget

`transferBytes` and `triangles` measure different resources. Compression changes the wire
cost and leaves the GPU cost untouched; decimation changes the GPU cost and barely moves the
wire cost. A scene can be well inside the triangle budget and four times over the transfer
budget, or the reverse.

- **Geometry: Draco or meshopt.** Draco compresses harder; meshopt decodes faster and with a
  much smaller decoder, which matters on the device that needed the compression. Either turns
  a typical 4 MB `.glb` into roughly 0.5–1 MB. Both need their decoder available — host it
  yourself rather than trusting a CDN you do not control.
- **Textures: KTX2/Basis (UASTC or ETC1S).** The important property is that they stay
  compressed **in VRAM**, so they reduce `textureMemoryMiB` as well as `transferBytes`.
  A PNG or JPEG is decompressed on upload and a 400 KiB PNG becomes 16 MiB of VRAM. ETC1S for
  colour maps, UASTC where banding shows (normals).
- **One `.glb`, not a `.gltf` plus loose files.** Fewer requests, no waterfall.
- **Halve the texture, not the mesh, first.** `maxTextureSize` per tier is 1024 / 2048 /
  4096. Halving a dimension quarters the memory; the source doc's note is blunt — "beyond this,
  halve it; nobody will notice."
- **Ship one model, not one per tier**, unless measurement forces otherwise. Tiers shed
  lights, shadows, post-processing and pixel ratio first; those are free to vary and do not
  multiply the build.

On the `low` tier the entire 3D payload ceiling is 1.5 MB, which the source describes as
already several seconds of waiting on a 3G-class connection for something the user did not ask
for. That is the number to design the poster path around.

## Camera and framing

Field of view is a compositional choice, not a default. Around 35–50° vertical reads as a
photograph of an object; 75° reads as a video game and visibly distorts anything near the
camera — a product filmed at 75° has a swollen front face. A tight FOV with the camera pulled
back flattens perspective, which is what product photography does on purpose.

Frame by fitting the subject's bounding sphere to the vertical extent at the chosen FOV, then
add margin, rather than hard-coding a position that was eyeballed against one model.

**Portrait is the case that breaks.** With a fixed vertical FOV, narrowing the viewport
narrows the horizontal extent, so a composition tuned at 16:9 loses the sides at 9:16 —
typically the subject's head or the part the copy refers to. Two workable answers: derive the
camera distance from aspect ratio so the subject stays fully framed, or author a separate
portrait composition and let landscape crop outward from it. Choosing neither produces the
commonest mobile 3D defect, a model half out of frame.

Orthographic projection is worth considering for diagrams, isometric scenes and
configurators: no perspective distortion, and size comparisons stay honest.

## Lighting that reads

- **The default three-point rig looks like a product render.** Key, fill and rim on a neutral
  background is exactly a studio photograph — right for a product page, wrong for anything
  meant to feel like a place, where it flattens depth and kills any sense of a light source in
  the world.
- **An environment map is usually the better first move.** One texture lights everything with
  no per-light shader cost, and it is what makes metal and rough surfaces legible at all: a
  metal with nothing to reflect reads as flat grey. Keep it small and pre-filtered; an
  unfiltered 4K HDR is both a transfer cost and a memory cost for a blurry result.
- **Real-time lights multiply.** Each one adds work in every lit material's shader, so the cost
  is lights × lit pixels, not lights alone. The tier ceilings are 2 / 3 / 4.
- **Shadow casters are the expensive ones.** Each re-renders the scene from the light's point
  of view, so a scene at its 90-draw-call medium budget with one caster is issuing ~180.
  Ceilings are 0 / 1 / 2. Bake instead: a baked shadow costs nothing per frame and looks better
  than the low-resolution shadow map a phone can afford. A contact-shadow plane or a blurred
  radial-gradient texture under the subject reads as grounded for approximately zero.
- **Post-processing is full-screen.** Each pass reads and writes every pixel at device
  resolution, so its cost scales with `dpr` squared. Budgets are 0 / 1 / 3. Bloom on a
  `low`-tier phone is not available, and that is the correct answer.

## Interaction inside an opaque element

**Raycasting.** A ray test walks candidate objects and, without bounds, every triangle.
Bound it: keep an explicit array of interactive objects and raycast against that, not the
scene; give them coarse bounding volumes or invisible proxy meshes; run at most one test per
frame regardless of how many pointer-move events arrived; skip entirely while the camera is
moving or the pointer is outside the canvas. For large static sets, a bounds hierarchy is the
answer, but the list-narrowing above usually removes the need.

**Hover and focus.** A canvas is one element, so there is no per-object `:hover` or focus
ring. Hover state lives in the scene and must be mirrored somewhere a keyboard user can
reach — a list of hotspots outside the canvas, each button focusing and selecting the
corresponding object, is the pattern that works for everyone and costs one component.

**Pointer, not mouse or touch.** `pointerdown`/`pointermove` unify mouse, touch and pen,
and expose `pointerType`. A coarse pointer has **no hover at all**, so any affordance
revealed only on hover does not exist on a phone; a tap must do it. Set
`touch-action: none` on the canvas only when the scene genuinely consumes the drag, because
it also removes the user's ability to scroll the page from that area — on a full-height canvas
that traps them.

## The frame loop

`frameloop="demand"` is `AdaptiveCanvas`'s default because most web scenes change nothing
for minutes at a time: a product model sitting still, a logo the user can rotate, a diagram.
Continuous rendering produces identical images, prevents CPU idle states, spins laptop fans and
flattens phone batteries.

Only changes that pass through the React reconciler request a frame automatically. These do
not, and are the silent staleness bugs: a value read from an external store, a ref mutated in
an event handler, a texture that finished decoding, a CSS-driven canvas resize. The scene is
correct in memory and stale on screen — maddening to chase, because everything you inspect
says the right thing.

```tsx
const { requestRender, renderFor } = useOnDemandRender({ on: [selectedId], frames: 2 })
// after a non-React change:
requestRender()
// for a scripted camera move or a physics settle:
const stop = renderFor(600)
```

Ask for more than one frame whenever motion has inertia: a single invalidation renders the
first step of a damped move and stops, because the thing that would have requested the second
frame was the second frame. `frames: 2` or a `renderFor` window fixes what looks like a
stuck animation.

Scenes with genuine continuous motion set `frameloop="always"` and mean it. The common
accident is switching to `always` to debug something and shipping it.

One more trap the source names: passing `autoRotateSpeed: 0` instead of
`autoRotate: false`. Many control implementations still run their update loop, which under
`demand` means the scene requests frames forever for a rotation that is not visibly
happening.
