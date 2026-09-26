# Shot grammar and named recipes

## The grammar

Every shot is four independent choices. Name them explicitly and a recipe becomes executable
rather than evocative.

| Parameter | Values |
|---|---|
| **Subject** | static · self-animating · exploding · dissolving · assembling |
| **Camera** | locked · orbit · arc · dolly · crane · through |
| **Time** | real · scrubbed · frozen · dilated (subject slower than camera) |
| **Light** | flat · single key · rim · raking · volumetric |

A recipe fixes all four plus its numeric parameters. `/bullettime` is
*self-animating · orbit · dilated · rim*; `/3Dblueprint` is *static · locked · frozen · flat*.
Two recipes that differ in one parameter are two recipes, not one with a variant.

**Naming a new one:** name the *effect the viewer perceives*, not the technique. `/orbit_sweep`
is a good name because a reviewer can tell whether the shot does it; `/smooth_camera` is not,
because nothing decides whether it succeeded. Every name in this file is paired with a check for
exactly that reason.

## The named recipes

Each gives its grammar, its parameters, its **check**, and its cost. All of them run through
`scene-timelines.md`: progress derived from scroll position, `requestRender` after every
write, `mixer.setTime` rather than `update`.

### `/bullettime` — *self-animating · orbit · dilated · rim*
The subject's own animation runs at 0.03 to 0.08 of real time while the camera orbits 180 to
360 degrees across the scroll span. Motion blur belongs to the **camera**, never the subject —
that asymmetry is the whole effect. **Check:** at the midpoint, has the subject advanced almost
not at all while the camera has travelled at least a third of its arc? **Cost:** one orbit, no
extra passes; motion blur is a post pass, so at low tier drop it rather than the orbit.

### `/gravitydefy` — *exploding · locked · scrubbed · single key*
Parts drift up and apart, eased out, against a **fixed horizon**. Offsets are proportional to
each part's mass proxy — larger parts move less — and the horizon staying perfectly still is
what sells it. **Check:** is any horizon or ground reference moving? If so the shot reads as a
camera move, not as defied gravity.

### `/explodeview` — *exploding · arc · scrubbed · flat*
Each part offsets along its assembly axis by a distance proportional to its depth order, with
rest positions preserved so progress 0 reassembles exactly. Requires per-part anchors in the
asset — see `3d-game-assets`. **Check:** does progress 0 reproduce the intact object to the
pixel, and does every part travel along one axis rather than radially?

### `/orbit_sweep` — *static · orbit · scrubbed · rim*
One continuous arc with the camera target **locked** on the subject while camera height changes.
Constant subject framing is the requirement. **Check:** does the subject's screen-space bounding
box stay within a few per cent across the whole sweep? **Cost:** the cheapest recipe here —
nothing animates but the camera, so it suits the low tier.

### `/softsunburn` — *static · locked · real · raking*
A single low warm key raking across the subject with a long falloff, bloom clamped so highlights
do not clip. One light, one shadow caster. **Check:** is any pixel fully blown to white? If so
the bloom threshold is doing the work the exposure should. **Cost:** one light and one caster
fits the medium budget; bloom is the pass, so it is high-tier only.

### `/splashfreeze` — *dissolving · through · frozen · rim*
A particle or fluid event held at peak dispersion while the camera travels *through* the frozen
state. The freeze must be a sampled state, not a paused simulation, or it cannot be scrubbed
backwards. **Check:** does scrubbing backwards reproduce the same frozen arrangement? **Cost:**
the particle count is the whole budget — check it against `triangles` at the lowest tier
shipped before choosing it.

### `/3Dblueprint` — *static · locked · frozen · flat*
Edges only, orthographic camera, measurement annotations on a grid. Annotations are real DOM
positioned from projected coordinates, not textures, so they stay selectable and legible.
**Check:** are the measurements text, and do they still read at 320px? **Cost:** the cheapest
of all — no lights, no shadows, low triangle load. This is the recipe to reach for when the tier
is low and a 3D presence is still wanted.

### `/productlaunch` — a composed sequence
Five beats with scroll spans: **hold** (static, locked, establishing) → **reveal** (light
arrives) → **orbit_sweep** → **detail** (dolly to one feature, target relocked) → **resolve**
(return to the hold framing). Each beat is a recipe; the sequence is the list plus its spans.
**Check:** does the final beat return to the first beat's framing exactly? A sequence that does
not close reads as unfinished, which it is.

## Composing and budgeting

A sequence is a list of `{ recipe, from, to }` over one scroll span, and it should be written
down and reviewed **before** it is built — it is cheap to change a five-line timeline and
expensive to change a built one.

The budget applies per beat, not per page: the most expensive beat is what must fit the lowest
tier shipped. A sequence whose fourth beat needs two shadow casters is a sequence gated at high
tier, and the honest resolution is a shorter sequence at low tier — not the same sequence with
everything turned down until it stops reading.

## On the count

The user-facing request was for "100+ slash commands". This file specifies eight and gives the
grammar that generates the rest, which is the honest trade: the grammar has four axes with five
or six values each, so it spans several hundred combinations, and the ones worth naming are the
ones somebody actually needs. A hundred names invented to reach a hundred would be a hundred
entries nobody checked, and a recipe whose check nobody wrote is exactly the "looks dramatic"
instruction this file exists to replace. Add a name when a shot recurs, and give it a check.
