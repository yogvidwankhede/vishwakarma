# Is this motion real?

A review reference. Each item is a symptom with the mechanism that produces it, because a tell
without a mechanism gets argued about and a tell with one gets fixed.

## The audit

Walk the page and classify every moving thing as **sampled** or **interpolated**. Then ask, for
each interpolated one, whether the subject exists. Every yes is a downgrade you chose.

A page with zero sampled motion is the common output of a generated build, and it is the whole
of the complaint that such pages look fake. One genuinely sampled sequence — a real product on a
real turntable, footage of the actual process, a scene with light in it — changes the read of the
entire page more than any number of refinements to the others.

## Tells, with mechanisms

**A photograph that fades in and drifts.** The transform carries no information about the
subject. Mechanism: opacity and translate are properties of the element, not of the thing
depicted. Fix: sample the subject, or hold the image still and let the composition work.

**Everything enters the same way.** One reveal applied by a wrapper to every section means the
motion encodes document order and nothing else. Mechanism: the animation is a property of the
container, so it cannot describe its contents.

**Motion that cannot be scrubbed backwards.** Time-based animation triggered at a threshold
plays forward once regardless of what the user does. Mechanism: the driver is a clock, not the
scroll position, so the page and the user disagree about where they are.

**No motion blur, no contact, no weight.** A CSS transform moves pixels without the optical
consequences of movement. Mechanism: the renderer is compositing a texture, not integrating
light over a shutter interval. Real footage and a real scene both get this for free; nothing
else can fake it convincingly at speed.

**A "demo" that is a screenshot with a transition.** Mechanism: no state was ever entered, so
nothing in it can be wrong — which is why it is easy to build and why it does not convince.
`ship-readiness` owns this one; it is the most expensive tell on the list.

**A 3D scene with one light and no shadow.** Mechanism: a single directional light plus ambient
produces no contact and no material response, so the object reads as a rendering of a shape
rather than as an object in a place.

**Motion that continues while nothing is happening.** Ambient float, drifting particles, a
looping gradient. Mechanism: the motion is uncorrelated with anything the user did or any state
of the system, so it carries no information and the eye learns to discard it — while it keeps
costing frames and, under reduced motion, keeps costing comfort.

**A scrub that lags.** Mechanism: seeks issued faster than they can be serviced, or frames
decoded on the main thread during scroll. Both are measurable; see `scrubbed-footage.md` and
`frame-sequences.md`.

**A scrub that works on your machine.** Mechanism most often: `onProgress` bound through the
native scroll-timeline driver, where the callback never fires. Check it in the browser that
supports scroll timelines, not only in the one that does not.

## The two questions that settle it

**Delete the motion.** Remove every transition, transform and scrub from the page and read what
is left. If the page is *worse only because it is less decorated*, the motion was decoration. If
something can no longer be understood — how the object is shaped, how the process runs, what the
product does — that motion was carrying information and belongs there.

**Name the source.** For each moving thing, say where its frames came from. "A camera", "a
renderer", "a designer chose these two states" are all acceptable answers. "The animation
library" is not an answer, and hearing it is the finding.
