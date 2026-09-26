# Camera flights

A flight is one continuous camera path through several environments, played on a clock rather
than on scroll. It is the strongest impression a site can make in ten seconds and the easiest
to ship as something that blocks the page, so the discipline is mostly about what it owes.

## The clock is the whole difference

Scroll is user-paced: it stops when they stop, reverses when they reverse, and never advances
without intent. A flight advances regardless. Four obligations follow, and none of them applies
to the scroll-driven work in this skill.

**It must be skippable, visibly.** A control that is present from the first frame, reachable by
keyboard, and lands the viewer at the resting state — not at a black screen. Any click, key or
scroll should also end it: someone who starts interacting has told you they are done watching.

**It must not be what the page is waiting on.** The flight is not the largest contentful paint
and not a gate on interactivity. The resting state — the composition the flight ends at — ships
as real markup and is what a visitor sees if nothing else ever loads.

**Under `prefers-reduced-motion: reduce` it does not play.** This is the one case in this
catalogue where the correct response is not to freeze but to *skip*: a full-viewport camera
flight is exactly the vestibular trigger the preference exists for, and the resting state is
already a complete design. Render that instead.

**It ends somewhere deliberate.** A flight that stops mid-move leaves the viewer in an
arbitrary frame. Either it resolves to the resting composition, or it loops — and if it loops,
the seam is visible whenever the last frame does not match the first.

## One environment at a time

`SCENE_BUDGETS` allows 96 MiB of texture memory and 500,000 triangles at medium tier. Four
distinct environments authored to that quality is four times over, so a flight does not hold its
world: exactly one environment is resident, the next is loaded during the approach, and the
previous is disposed after the crossing.

**Disposal is manual and the common bug is silent.** Removing an object from the scene graph
drops the JavaScript reference; the GPU memory stays allocated until each resource is disposed
explicitly. A material also holds references to its textures, and disposing the material does
not dispose them — so a flight that loops will climb until the tab is killed, and it will do it
slowly enough that nobody connects the crash to the intro.

```ts
// Dispose depth-first: textures, then materials, then geometries.
scene.traverse((obj) => {
  const mesh = obj as { geometry?: { dispose(): void }; material?: unknown }
  mesh.geometry?.dispose()
  for (const mat of [mesh.material].flat().filter(Boolean) as Array<Record<string, unknown>>) {
    for (const value of Object.values(mat)) {
      if (value && typeof (value as { isTexture?: boolean }).isTexture === 'boolean') {
        ;(value as { dispose(): void }).dispose()
      }
    }
    ;(mat as unknown as { dispose(): void }).dispose()
  }
})
```

**The measurable check** is `renderer.info.memory`, which reports live `geometries` and
`textures` counts. Record both at the resting state, run the flight through a full cycle, and
read them again: equal numbers mean the swap is clean, and a climb is the leak. This is a real
measurement rather than an inspection, which is what `visual-feedback-loop` asks for.

## The transition is a traversal, not a cut

Two environments can share one camera path if something occupies the frame while the swap
happens. Put an **occluder on the path** — a surface the camera passes through at the moment of
the change.

The elegant form, and the one worth copying, is an occluder that is *also content*: a
perforated or semi-transparent panel carrying the section's title and a line of copy, sitting
across the path. The camera flies through the panel; the panel hides most of the swap; and
because it is perforated, the next environment is already visible through it, so the crossing
reads as moving between connected spaces rather than as a scene change. A curtain that hides a
load is machinery. A title card you fly through is the site.

Three requirements make it work:

- **The occluder fills the frustum at the crossing frame.** Check the narrowest supported
  aspect ratio, not the widest — a panel that covers a 16:9 frame can leave gaps at the edges
  of a portrait viewport.
- **The next environment has rendered at least one frame before the crossing.** Loading *at* the
  crossing puts the hitch at the exact moment attention is highest. Begin the load on approach
  and hold the crossing until its first frame is done.
- **The old environment disposes after, not during.** Disposal during the crossing competes with
  the frame you most need.

**Motion blur is the second mask.** Blur peaks with camera speed, and camera speed peaks at a
crossing, so the two coincide for free — which is the argument for putting the fastest part of
the path exactly where the swap is.

## The chrome stays DOM

Navigation, filters and any input belong in the DOM above the canvas, not as geometry inside
it. They then keep working while the world moves: selectable, focusable, translatable,
findable, and unaffected when the environment swaps. The test is whether the nav survives with
the canvas deleted — if it does not, it was never chrome, it was scenery.

## Composing one

Write the path down before building it: a list of environments, the occluder between each pair,
and the seconds allotted. Then budget it per environment against the lowest tier shipped, and
walk the list asking what is resident at each moment. The list is where a flight gets shortened,
and shortening it is almost always right — the second-best thing a flight can do is end.
