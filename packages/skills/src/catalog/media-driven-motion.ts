// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Why generated sites move in a way that reads as fake.
 *
 * Two different things are called animation. Interpolated motion computes the in-between
 * states from a start value, an end value and a curve. Sampled motion replays states that
 * already existed — frames a camera recorded, frames a renderer produced, a surface lit by a
 * light that was actually placed. The distinction is not stylistic. A CSS transition carries
 * no information that was not already in its two endpoints and its easing function, so a
 * photograph that fades up and drifts twenty pixels is still a photograph with a property on
 * it. Ninety frames of the same object on a turntable carry ninety independent measurements,
 * and the eye reads that difference immediately even when it cannot name it.
 *
 * The rest of this catalogue is strong on interpolated motion and silent on sampled motion.
 * `motion-design` owns duration and easing; `motion-physics` owns springs; `scroll-experiences`
 * owns which mechanism drives a transform and how to avoid thrashing. All three animate DOM
 * properties. Nothing before this skill told an agent how to drive a real frame source from
 * scroll position, what the decode and memory arithmetic costs, or how to notice that a page
 * has been assembled entirely out of interpolation.
 *
 * There is also a trap in our own package worth naming. `useProgressBinding` takes an
 * `onProgress` callback, but the subscription that calls it is created only when the driver is
 * `script`; on the native CSS-timeline path the effect returns early and the callback never
 * fires at all. A media scrub bound that way works in development, works in a browser without
 * scroll-timeline support, and silently does nothing in current Chrome and Safari — which
 * presents as "the animation is fake" rather than as an error.
 */
export const mediaDrivenMotion: SkillManifest = {
  vsm: '1.0',
  id: 'media-driven-motion',
  name: 'Media-Driven Motion',
  description:
    'Use when motion should come from footage, a frame sequence or a rendered scene rather than from interpolating CSS properties.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'motion',
  tags: [
    'scroll-scrubbing',
    'video',
    'frame-sequence',
    'canvas',
    'three',
    'decode-budget',
    'cinematic',
  ],

  activation: {
    intents: [
      'scrubbing a video, frame sequence or 3D camera from scroll position',
      'building a cinematic hero, product reveal or scrollytelling sequence from real footage',
      'the motion on a page looks synthetic, weightless, or like a stock photo with a transition on it',
      'a scroll-driven video or canvas sequence lags behind the scroll, stutters, or stops updating',
      'deciding whether a section should be recorded, rendered, or animated in CSS',
      'auditing a generated page for whether any of its motion carries real information',
    ],
    globs: [
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/*hero*.{ts,tsx,js,jsx}',
      '**/*sequence*.{ts,tsx,js,jsx}',
      '**/*scrub*.{ts,tsx,js,jsx}',
    ],
    keywords: [
      'scrub',
      'currentTime',
      'requestVideoFrameCallback',
      'image sequence',
      'frame sequence',
      'createImageBitmap',
      'sprite sheet',
      'canvas sequence',
      'scrollytelling',
      'cinematic',
      'apple-style scroll',
    ],
    requires: ['scroll-experiences'],
  },

  content: {
    summary:
      'Motion that reads as real is sampled from a frame source rather than interpolated between two states; drive that source from scroll position through one clamped progress value, and budget decode and memory before authoring frame count.',

    body: `# Media-Driven Motion

A page can move in two fundamentally different ways, and only one of them survives contact
with a viewer who has seen the alternative.

**Interpolated motion** computes the in-between states. A start, an end, a curve. Its total
information content is those three things, which is why it looks the same on every site that
uses it and why no amount of easing refinement fixes the feeling that nothing is happening.

**Sampled motion** replays states that already existed: frames a camera recorded, frames a
renderer produced, a surface lit by a light somebody placed. Ninety frames of a turntable are
ninety measurements of an object. The viewer cannot articulate the difference and does not need
to — weight, contact shadows, motion blur, the way a highlight crawls across a curve are all
present in one and absent from the other.

Both are correct in their place. Interface state changes — a panel opening, a value updating, a
row reordering — *should* be interpolated, because there is no real event to sample. The failure
is using interpolation for a subject that exists.

---

## 1. Classify the subject first

Ask one question: **does the thing being shown exist independently of the page?**

- **It exists, and can be photographed** — a product, a person, a place, a material, a process.
  Sample it. Recorded frames or a frame sequence. A still image with a fade is a downgrade of
  something you could have had.
- **It would exist, but cannot be photographed** — an unbuilt object, a cutaway, an impossible
  camera move, a material under light you cannot rent. Render it. A real scene, real lights,
  and the camera on a scroll-driven path.
- **It is the interface itself** — disclosure, navigation, state. Interpolate it, and follow
  \`motion-design\` and \`micro-interactions\`. Sampled motion here is decoration with a payload.

Write the answer down before writing code. Almost every generated page that reads as fake got
this wrong once, at the hero, and then repeated the mistake down the page.

---

## 2. Scroll is a clock, not a trigger

A scrubbed sequence needs a **time**, not an event. That time is a number in 0..1 derived from
position — never accumulated from scroll deltas, because an accumulator disagrees with the page
after a fling, a fragment jump, a find-in-page hit, or a reload at that offset.

\`@vishwakarma/scroll\` already computes it. Two ways in, and the choice is not cosmetic:

\`\`\`tsx
import { useProgressBinding, useScrollProgress } from '@vishwakarma/scroll'

// Per-frame, no React render. Correct for media. Note native: false.
const binding = useProgressBinding(ref, {
  native: false,
  onProgress: (p) => { targetRef.current = p },
})

// React state, quantised to 200 steps by default. Correct for a caption or a step index.
const { ref: sectionRef, progress } = useScrollProgress({ step: 0 })
\`\`\`

**\`native: false\` is mandatory for a media scrub.** The \`onProgress\` subscription is created
only on the scripted path; when the binding resolves to the native CSS-timeline driver the effect
returns early and the callback never fires. The page then works in Firefox and does nothing in
Chrome — a failure that looks like bad animation rather than a bug.

**\`useScrollProgress\` quantises by default** (\`step: 0.005\`, 200 distinct values). A 240-frame
sequence driven by it renders 200 of its frames and duplicates the rest, and it re-renders a
React subtree per step. It is the wrong hook for frames and the right one for a chapter label.

---

## 3. The three frame sources, and what each actually costs

| | Recorded video | Frame sequence | Rendered scene |
|---|---|---|---|
| Bytes for ~5 s | 0.5–4 MB | 2–15 MB | 0.3–3 MB of assets |
| Per-frame cost | seek + decode | decode or blit | full draw |
| Frame-accurate scrub | hard | exact | exact |
| Jump to arbitrary point | slow | instant if resident | instant |
| Reacts to input, theme, data | no | no | yes |
| Scales to any viewport | no | no | yes |

Video is the cheapest bytes-per-frame by a wide margin and the worst at being scrubbed.
Sequences are the opposite. A rendered scene is the only one that can respond to anything.
Choose on the scrub requirement, not on file size: a hero that must land exactly on a frame is
a sequence, a background that merely needs to move is a video.

---

## 4. Budget the frame count before authoring it

Frames are not free at any of the three stages, and the constraint that bites is decode and
resident memory, not transfer.

A decoded frame occupies \`width × height × 4\` bytes regardless of its compressed size. At
1600×900 that is 5.76 MB per frame, so a 90-frame sequence held decoded is 518 MB — impossible.
Sequences therefore hold a **sliding window** around the current index and release the rest.
Compute the window from the budget, not from taste, and do the arithmetic before commissioning
the frames. \`frame-sequences.md\` has the method.

---

## 5. The still is the real content

Every sampled source is unavailable to a meaningful share of traffic: no-JS, Save-Data, a metered
connection, a decode failure, a print, a crawler, reduced motion. Under
\`prefers-reduced-motion: reduce\` a scrub must resolve to a **chosen frame** — the one that best
carries the message, not frame zero — in normal document flow, at the same reserved aspect ratio.
Ship that still first, reserve its space, and upgrade to the sequence after first paint.
\`webgl-experiences\` owns the same rule for canvases and the arithmetic behind it.

---

**Boundaries.** \`scroll-experiences\` owns the scroll mechanism, thrash, pinning and the progress
geometry — its rules apply in full here and are not repeated. \`motion-design\` and
\`motion-physics\` own interpolated motion. \`webgl-experiences\` owns mounting, tiering and
fallback for a canvas; this skill owns only what drives its timeline. \`mobile-performance\` owns
the field gates the byte budgets answer to. \`design-judgment\` owns whether the effect should
exist; \`ship-readiness\` owns whether a demo is real.`,

    references: [
      {
        id: 'scrubbed-footage',
        title: 'Scrubbing recorded video from scroll position',
        answers:
          'How do I drive a video element from scroll without it lagging, how must the file be encoded to be scrubbable, and how do I know the pixels match my target?',
        content: `# Scrubbing recorded video

Assigning \`video.currentTime\` looks like setting a property and is actually requesting a seek.
Everything difficult about scroll-scrubbed video follows from that.

## Why the naive version lurches

\`\`\`tsx
// Wrong. This is the code almost every generated page ships.
onProgress: (p) => { video.currentTime = p * video.duration }
\`\`\`

Three separate failures:

**One seek at a time.** A seek is asynchronous and engines do not queue an unbounded number of
them. Issuing one per scroll frame means most are discarded, replaced, or serviced late, and the
picture arrives after the scroll has moved on. The symptom is a video that trails the scroll and
then catches up in a jump.

**Seeks are not uniformly priced.** Inter-coded frames are reconstructed from a preceding
keyframe, so seeking to a frame 90 frames after its keyframe costs 90 decodes. A file encoded
for playback has keyframes every 2–10 seconds; a scrub through it is a decode storm.

**Nothing told you the frame arrived.** \`currentTime\` reflects the requested position, not the
presented picture, so any logic reading it back is reasoning about an intention.

## The correct loop

Keep the latest target, keep at most one seek in flight, and start the next one only when the
previous has been serviced.

\`\`\`tsx
import { useEffect, useRef } from 'react'
import { useProgressBinding } from '@vishwakarma/scroll'

function useVideoScrub(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  sectionRef: React.RefObject<HTMLElement | null>,
) {
  const target = useRef(0)

  useProgressBinding(sectionRef, {
    native: false, // onProgress only fires on the scripted path
    onProgress: (p) => { target.current = p },
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let seeking = false
    let last = -1
    let stopped = false

    const pump = () => {
      if (stopped || seeking || !video.duration) return
      const t = target.current * video.duration
      // A tolerance below one frame avoids seeking for sub-pixel scroll noise.
      if (Math.abs(t - last) < 1 / 30) return
      last = t
      seeking = true
      video.currentTime = t
    }

    const onSeeked = () => { seeking = false; pump() }
    video.addEventListener('seeked', onSeeked)

    // Drive the pump from the same frame budget everything else uses.
    const id = setInterval(pump, 16)

    return () => {
      stopped = true
      clearInterval(id)
      video.removeEventListener('seeked', onSeeked)
    }
  }, [videoRef])
}
\`\`\`

For verification rather than driving, \`requestVideoFrameCallback\` is the only honest signal
that the pixels match the request. It fires when a new frame has been presented for composition
and reports \`mediaTime\` and \`presentedFrames\`:

\`\`\`ts
const tick = (_now: number, meta: VideoFrameCallbackMetadata) => {
  // meta.mediaTime is the timestamp of the frame now on screen.
  video.requestVideoFrameCallback(tick)
}
video.requestVideoFrameCallback(tick)
\`\`\`

Use it to measure the gap between intended and presented time during development. If that gap
exceeds roughly 100 ms on a mid-tier phone, the file is not encoded for scrubbing and no amount
of code will fix it.

## Encoding for scrub

A scrubbable file is a differently encoded file, not the same file used differently.

- **Short keyframe interval.** A keyframe every 5–10 frames bounds worst-case seek cost to that
  many decodes. Keyframes are intra-coded and several times the size of a predicted frame, so
  this multiplies the file: expect 3–6× a playback encode at equal quality.
- **Pay for it by cutting elsewhere.** Halve the resolution, cut the duration, drop to 24 fps,
  or crop. A hero scrub at 1280×720 and 24 fps for 4 seconds is a different proposition from
  1920×1080 at 60 fps for 12.
- **\`preload="auto"\`, \`muted\`, \`playsinline\`.** Without \`playsinline\` iOS takes the video
  fullscreen; without \`muted\` it will not play inline at all. A video that has never loaded
  metadata is not seekable, so gate the scrub on \`loadedmetadata\` and check \`video.seekable\`.
- **Range requests matter.** Seeking far ahead of what has been buffered is a network round
  trip. Either the whole file is small enough to fetch up front, or the scrub is short enough
  that it never outruns the buffer.

## When to stop and use a sequence instead

Switch to a frame sequence when any of these hold: the scrub must land on an exact frame; the
sequence runs backwards as often as forwards; the total is under about 120 frames; or measured
seek latency on a real mid-tier phone exceeds 100 ms after encoding work. Sequences trade bytes
for determinism, and determinism is what a hero needs.

## What every scrub still owes

A \`poster\` that is a deliberately chosen frame and is the largest contentful paint element. A
reserved aspect ratio so the swap shifts nothing. Under \`prefers-reduced-motion: reduce\`, the
still alone with no listener attached. With JavaScript unavailable, the still and the surrounding
copy carrying the whole message — verified by deleting the \`<video>\` from the DOM and reading
the page.`,
      },
      {
        id: 'frame-sequences',
        title: 'Frame sequences: decode budget, memory arithmetic, sliding windows',
        answers:
          'How many frames can I afford, how do I decode them without blocking the main thread, how big a window do I hold in memory, and when is a sprite atlas better?',
        content: `# Frame sequences

A frame sequence is the only frame source that can be scrubbed exactly, in both directions, with
no seek latency. It pays for that with bytes and with decoded memory, and both have to be
computed before the frames are commissioned.

## The arithmetic that decides the design

**Decoded size is independent of compressed size.** A decoded frame is
\`width × height × 4\` bytes. Compression affects transfer and decode time, never residency.

| Frame size | Decoded bytes | Frames in 64 MB |
|---|---|---|
| 640 × 360 | 0.92 MB | 69 |
| 1280 × 720 | 3.69 MB | 17 |
| 1600 × 900 | 5.76 MB | 11 |
| 1920 × 1080 | 8.29 MB | 7 |

So a 120-frame sequence at 1600×900 cannot be held decoded — it is 691 MB. It must be held as a
**window**: the frame on screen, plus a lead in the scroll direction, plus a small trail.

**Pick the numbers in this order.** Choose a memory ceiling (48–64 MB for a hero on mobile is
defensible). Divide by decoded frame size to get the window. If the window is under about 8
frames, the resolution is too high for the device class and must come down — a lead of fewer than
8 frames cannot absorb a fast scroll, and the user sees the sequence stall.

**Then choose the frame count from the scroll distance**, not from smoothness ambition. A section
480 px tall scrubbed over one viewport height gives roughly 8–10 px of scroll per frame at 60
frames; below about 4 px per frame the extra frames are invisible and you are paying for nothing.

## Decode off the main thread

\`new Image()\` decodes on the main thread at paint time, which is a jank source exactly when the
page is scrolling. \`createImageBitmap\` decodes on a worker thread inside the browser and hands
back a bitmap that \`drawImage\` can blit in well under a millisecond.

\`\`\`ts
async function decodeFrame(url: string, signal: AbortSignal): Promise<ImageBitmap> {
  const response = await fetch(url, { signal })
  return createImageBitmap(await response.blob())
}
\`\`\`

Two rules that are easy to miss:

- **\`close()\` every bitmap you evict.** An \`ImageBitmap\` holds memory outside the JavaScript
  heap and garbage collection will not reclaim it promptly. A window that drops references
  without closing them grows until the tab is killed, and it will be killed on a phone first.
- **Abort in-flight decodes when the direction reverses.** Otherwise a fast scroll up leaves a
  queue of downward decodes ahead of the frames actually needed.

\`useScrollDirection\` from \`@vishwakarma/scroll\` gives the direction to bias the window with.

## Driving the blit

Read progress in the measure phase, blit in the commit phase, and never do both in one pass —
\`subscribeToScroll\` enforces the split for the whole page:

\`\`\`ts
import { subscribeToScroll } from '@vishwakarma/scroll'

let index = 0
const unsubscribe = subscribeToScroll({
  measure(frame) {
    const rect = container.getBoundingClientRect()
    const span = rect.height - frame.viewportHeight
    const p = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0
    index = Math.round(p * (FRAME_COUNT - 1))
  },
  commit() {
    const bitmap = window.get(index)
    if (bitmap) context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  },
})
\`\`\`

When the requested frame is not resident, **hold the last drawn frame**. Do not clear the canvas
and do not draw a placeholder: a held frame reads as a pause in the motion, a cleared canvas
reads as a broken page.

## Sprite atlases, for small sequences

Below roughly 64 frames at 512 px or less, pack every frame into one image. A 8×8 atlas of
512×288 frames is 4096×2304 — one fetch, one decode, 37.7 MB resident, and afterwards zero
per-frame work beyond a sub-rectangle blit or a \`background-position\` step. Above that size the
atlas exceeds common \`maxTextureSize\` limits and must be split, at which point individual frames
are simpler.

## Format choice is a decode-time question

For a sequence the binding constraint is decode milliseconds per frame, not kilobytes. AVIF
typically produces the smallest files and decodes more slowly per frame than WebP or JPEG; for a
window that must refill during a fast scroll, the fastest-decoding format at acceptable size
wins. Measure it on the target device class with \`performance.now()\` around
\`createImageBitmap\`; do not infer it from a size comparison.

## Responsive sequences

One sequence cannot serve a phone and a desktop. Ship two or three renditions and select by
\`matchMedia\` before the first fetch, treating it as an art-direction decision: the phone
rendition is usually a tighter crop, not just a smaller image, because the subject has to stay
readable at a third of the width.

## What the sequence owes

The first frame ships as an ordinary \`<img>\` with \`fetchpriority="high"\`, sized by the same
reserved aspect ratio as the canvas, and it is the largest contentful paint element. Under
\`prefers-reduced-motion: reduce\` no window is allocated and no listener is attached — the chosen
still is the section. With JavaScript unavailable, the \`<img>\` is the section and the copy
around it carries the message.`,
      },
      {
        id: 'scene-timelines',
        title: 'Driving a 3D scene from scroll',
        answers:
          'How do I turn scroll progress into a camera path or animation time in a scene, and why does my scroll-driven scene stop updating?',
        content: `# Scroll-driven scene timelines

A rendered scene is the only frame source that can respond to viewport, theme, data or input, and
the only one where a camera move costs no extra bytes. It is also the one where scroll driving
goes wrong most quietly, because the two most common bugs both produce a scene that is correct in
memory and wrong on screen.

\`webgl-experiences\` owns mounting, tiering, budgets and fallback. This file owns the timeline
only, and assumes the scene is already inside an \`AdaptiveCanvas\` under a \`PerformanceGuard\`.

## Bug one: the scene stops updating

\`AdaptiveCanvas\` renders on demand. React state changes ask for a frame automatically; **nothing
else does**. Scroll progress written to a ref — which is the correct place for it, since it
changes 60 times a second — bypasses the reconciler entirely, so the camera moves and the canvas
never redraws.

\`\`\`tsx
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
\`\`\`

\`requestRender()\` asks for one frame, which is exactly right for a scrub: each scroll frame
produces one rendered frame and a stationary scroll produces none. Use \`renderFor(ms)\` instead
only when the motion continues after input stops — a scripted fly-through triggered at a
threshold, or a damped settle. A single frame for damped motion renders the first step and
freezes, because the thing that would have asked for the second frame was the second frame.

If \`useRenderHandle()\` returns \`null\` the scene simply renders continuously; treat that as a
performance regression to fix, never as an error to throw on.

## Bug two: the camera accumulates

\`\`\`ts
// Wrong: state depends on scroll history, so it disagrees with the page after any jump.
camera.position.z -= delta
\`\`\`

Every scroll-driven value must be a **pure function of progress**. Then a reload at 60 % of the
section, a fragment link into it, and a slow scroll to it all produce identical pixels.

\`\`\`ts
function sampleCamera(p: number, out: Vector3): void {
  // A fixed path evaluated at p. Deterministic, reversible, jump-safe.
  out.set(Math.sin(p * Math.PI) * 4, 1.2 + p * 2.4, 8 - p * 6)
}
\`\`\`

The same applies to a baked animation: set \`mixer.setTime(p * clipDuration)\` rather than calling
\`mixer.update(delta)\`. \`setTime\` is idempotent and seekable; \`update\` integrates and drifts.

## Smoothing without lying

A camera that tracks scroll exactly can feel mechanical, and the usual fix — a spring or a lerp
toward the target — reintroduces history. Keep it bounded and keep it in the render, not in the
state:

\`\`\`ts
// In the frame callback. Converges on the derived target, so a jump still resolves within a
// few frames rather than animating across the whole path.
smoothed.current += (progress.current - smoothed.current) * 0.15
\`\`\`

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

Verify against \`SCENE_BUDGETS\` at the lowest tier the page ships before adding any of this.
A second shadow caster that pushes the low tier over its draw-call ceiling makes the page worse
on the devices that carry most of the traffic.

## Reduced motion

\`useReducedMotionScene\` gives the scene's own vocabulary for the preference. For a scroll-driven
camera the correct response is to stop driving it and render the chosen composition — still, but
present and inspectable. Do not replace the scene with an image, and do not leave the scroll
binding attached with its output ignored.`,
      },
      {
        id: 'sampled-or-interpolated',
        title: 'Reviewing a page for real versus synthetic motion',
        answers:
          'How do I tell whether a page’s motion carries real information, and what are the specific tells that it does not?',
        content: `# Is this motion real?

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
\`ship-readiness\` owns this one; it is the most expensive tell on the list.

**A 3D scene with one light and no shadow.** Mechanism: a single directional light plus ambient
produces no contact and no material response, so the object reads as a rendering of a shape
rather than as an object in a place.

**Motion that continues while nothing is happening.** Ambient float, drifting particles, a
looping gradient. Mechanism: the motion is uncorrelated with anything the user did or any state
of the system, so it carries no information and the eye learns to discard it — while it keeps
costing frames and, under reduced motion, keeps costing comfort.

**A scrub that lags.** Mechanism: seeks issued faster than they can be serviced, or frames
decoded on the main thread during scroll. Both are measurable; see \`scrubbed-footage.md\` and
\`frame-sequences.md\`.

**A scrub that works on your machine.** Mechanism most often: \`onProgress\` bound through the
native scroll-timeline driver, where the callback never fires. Check it in the browser that
supports scroll timelines, not only in the one that does not.

## The two questions that settle it

**Delete the motion.** Remove every transition, transform and scrub from the page and read what
is left. If the page is *worse only because it is less decorated*, the motion was decoration. If
something can no longer be understood — how the object is shaped, how the process runs, what the
product does — that motion was carrying information and belongs there.

**Name the source.** For each moving thing, say where its frames came from. "A camera", "a
renderer", "a designer chose these two states" are all acceptable answers. "The animation
library" is not an answer, and hearing it is the finding.`,
      },
    ],
  },

  rules: [
    {
      id: 'media-driven-motion/sample-what-exists',
      strength: 'should',
      statement:
        'When the subject of a section exists and can be photographed or rendered, drive its motion from frames rather than from a CSS transition on a still.',
      evidence: {
        rationale:
          'An interpolated transition contains only its two endpoints and its easing curve, so it can describe the element but never the subject. A frame source contains an independent measurement per frame, which is where weight, contact shadow, motion blur and material response come from — none of which can be approximated by a transform.',
        confidence: 'strong',
      },
      exceptions: [
        'Interface state changes — disclosure, navigation, a value updating — where no real event exists to sample and interpolation is the correct mechanism.',
        'A section whose byte or decode budget cannot accommodate any frame source, where a deliberately composed still with no motion beats a fake one.',
      ],
      examples: {
        bad: '<img src="/croissant.jpg" className="fade-up" /> // a photograph with a property on it',
        good: '<FrameSequence frames={72} src="/croissant/{i}.webp" /> // 72 measurements of the object',
      },
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/progress-from-position',
      strength: 'must',
      statement:
        'Derive scrub time from a clamped 0..1 progress value computed from scroll position, never from accumulated scroll deltas or an elapsed-time clock.',
      evidence: {
        rationale:
          'An accumulator or a clock makes the frame shown a function of scroll history, so a fling, a fragment link, find-in-page, and a reload at the same offset all produce different frames at the same position. Position-derived progress gives the same pixels in all four cases by construction.',
        confidence: 'established',
      },
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/opt-out-of-native-for-onprogress',
      strength: 'must',
      statement:
        'Pass native: false when using useProgressBinding onProgress to drive media, and verify the scrub in a browser that supports scroll timelines.',
      evidence: {
        rationale:
          'useProgressBinding creates its scroll subscription only when the resolved driver is script; on the native CSS-timeline path the effect returns before subscribing, so onProgress is never called. The scrub therefore works in Firefox and does nothing in current Chrome and Safari, and the failure presents as lifeless motion rather than as an error.',
        confidence: 'established',
      },
      exceptions: [
        'Effects expressed entirely in CSS from the --vk-scroll-progress custom property, which is what the native path exists to serve and needs no callback.',
      ],
      examples: {
        bad: 'useProgressBinding(ref, { onProgress: (p) => { video.currentTime = p * d } })',
        good: 'useProgressBinding(ref, { native: false, onProgress: (p) => { target.current = p } })',
      },
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/no-react-state-per-frame',
      strength: 'must-not',
      statement:
        'Do not route per-frame scrub values through React state, and do not drive a frame index from the default quantisation of useScrollProgress.',
      evidence: {
        rationale:
          'A setState per scroll frame re-renders a subtree 60 times a second to change one number React does not need. useScrollProgress also quantises to 0.005 by default, which is 200 distinct values — a 240-frame sequence driven by it renders 200 frames and duplicates the rest.',
        confidence: 'established',
      },
      exceptions: [
        'Values a human reads rather than frames — a chapter label, a percentage, a step index — which is exactly what useScrollProgress is for.',
      ],
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/one-seek-in-flight',
      strength: 'must',
      statement:
        'Keep at most one video seek in flight: store the latest target and issue the next seek only after the seeked event.',
      evidence: {
        rationale:
          'Assigning currentTime requests an asynchronous seek. Issuing one per scroll frame produces more requests than the decoder can service, so most are discarded or serviced late and the picture arrives after the scroll has moved on — the trailing-then-jumping symptom that reads as broken animation.',
        confidence: 'established',
      },
      examples: {
        bad: 'onProgress: (p) => { video.currentTime = p * video.duration }',
        good: 'if (!seeking) { seeking = true; video.currentTime = target.current * video.duration }',
      },
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/encode-for-scrub',
      strength: 'must',
      statement:
        'Re-encode video intended for scrubbing with a keyframe interval of 5 to 10 frames, and pay for the size increase by cutting resolution, duration or frame rate.',
      evidence: {
        rationale:
          'Inter-coded frames are reconstructed from the preceding keyframe, so a seek costs one decode per frame since that keyframe. A playback encode with keyframes every few seconds turns a scrub into a decode storm no amount of client code can fix. Keyframes are intra-coded, so a scrub encode is typically 3 to 6 times the size at equal quality.',
        confidence: 'established',
      },
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/sequence-over-video-for-exactness',
      strength: 'should',
      statement:
        'Use a frame sequence rather than video when the scrub must land on an exact frame, runs backwards as often as forwards, or measures over 100 ms of seek latency on a mid-tier phone.',
      evidence: {
        rationale:
          'A resident decoded frame is addressable in constant time in either direction, while a seek is asynchronous, direction-sensitive and priced by distance from the nearest keyframe. Sequences trade bytes for determinism, which is the property a hero needs and the one video cannot provide.',
        confidence: 'strong',
      },
      exceptions: [
        'Long or full-bleed background motion where exactness does not matter and the byte difference does.',
      ],
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/size-the-window-from-memory',
      strength: 'must',
      statement:
        'Size a frame-sequence window by dividing a stated memory ceiling by width x height x 4, and lower the resolution if the result is under about eight frames.',
      evidence: {
        rationale:
          'A decoded frame occupies width x height x 4 bytes regardless of its compressed size, so 120 frames at 1600x900 is 691 MB and cannot be held. A lead of fewer than eight frames cannot absorb a fast scroll, so the sequence visibly stalls — which means the resolution, not the window, is what has to change.',
        confidence: 'established',
      },
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/decode-off-main-thread',
      strength: 'must',
      statement:
        'Decode sequence frames with createImageBitmap and blit with drawImage; do not rely on new Image() decoding during scroll.',
      evidence: {
        rationale:
          'An img element decodes on the main thread at paint time, which places a multi-millisecond decode inside the frame budget exactly while the page is scrolling. createImageBitmap decodes on a browser-owned thread and returns a bitmap that blits in well under a millisecond.',
        confidence: 'established',
      },
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/close-evicted-bitmaps',
      strength: 'must',
      statement:
        'Call close() on every ImageBitmap evicted from the window, and abort in-flight decodes when the scroll direction reverses.',
      evidence: {
        rationale:
          'An ImageBitmap holds memory outside the JavaScript heap that garbage collection does not reclaim promptly, so a window that drops references without closing them grows until the tab is killed — on a phone first. Un-aborted decodes for the old direction also occupy the decode queue ahead of the frames now needed.',
        confidence: 'established',
      },
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/hold-the-last-frame',
      strength: 'must-not',
      statement:
        'Do not clear the canvas or draw a placeholder when the requested frame is not resident; hold the last drawn frame.',
      evidence: {
        rationale:
          'A held frame reads as a pause in the motion, which is a normal thing for motion to do. A cleared canvas or a spinner reads as a broken page, and it appears precisely during the fast scrolls where the window cannot keep up — so the worst impression lands on the most common interaction.',
        confidence: 'strong',
      },
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/request-render-after-scroll',
      strength: 'must',
      statement:
        'Call requestRender from useOnDemandRender after writing scroll progress to a ref that a scene reads, and use renderFor only for motion that continues after input stops.',
      evidence: {
        rationale:
          'With frameloop on demand the renderer draws only when asked, and only React state changes ask automatically. Progress written to a ref bypasses the reconciler, so the camera moves and the canvas never redraws — a scene that is correct in memory and frozen on screen. A single frame is also not enough for damped motion, because the request for the second frame would have come from the second frame.',
        confidence: 'established',
      },
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/sample-not-integrate',
      strength: 'must',
      statement:
        'Express every scroll-driven scene value as a pure function of progress, and seek baked animation with mixer.setTime rather than mixer.update.',
      evidence: {
        rationale:
          'An integrated value depends on the sequence of frames that produced it, so a reload, a fragment jump or a fling gives a different scene at the same scroll position. setTime is idempotent and seekable; update accumulates delta and drifts, and the drift is invisible until someone scrubs backwards.',
        confidence: 'established',
      },
      exceptions: [
        'A bounded convergence toward the derived target inside the frame callback, where the gap is capped so a jump snaps rather than animating across the path.',
      ],
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/still-is-the-content',
      strength: 'must',
      statement:
        'Ship a deliberately chosen frame as the section’s real content, at the same reserved aspect ratio, and make it the largest contentful paint element.',
      evidence: {
        rationale:
          'Every frame source is unavailable to a substantial share of traffic: no-JS, Save-Data, decode failure, print, crawlers, reduced motion. A poster that is frame zero rather than the frame that carries the message wastes the one image most of those visitors will see, and an unreserved ratio shifts the page twice.',
        confidence: 'established',
      },
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/reduced-motion-resolves-to-a-frame',
      strength: 'must',
      statement:
        'Under prefers-reduced-motion: reduce, attach no scroll binding and allocate no window: render the chosen still, or for a scene the chosen composition, in normal document flow.',
      evidence: {
        rationale:
          'A full-bleed scrubbed sequence is a stronger vestibular trigger than the fades the preference was invented to suppress, and a binding left attached with its output ignored still costs a layout read and a callback every frame. Reduced motion means still, not absent, so a scene stays rendered and inspectable rather than being replaced by an image.',
        confidence: 'established',
      },
      verifiedBy: 'real-motion-review',
    },
    {
      id: 'media-driven-motion/no-uncorrelated-ambient-motion',
      strength: 'should-not',
      statement:
        'Do not add motion that is uncorrelated with user action or system state — ambient float, drifting particles, looping gradients — to carry the impression of liveness.',
      evidence: {
        rationale:
          'Motion that correlates with nothing carries no information, so attention habituates to it within seconds and then discards it, while it continues to cost frames on every device and comfort for motion-sensitive users. The impression of liveness it is reaching for comes from sampled detail, which this actively competes with for budget.',
        confidence: 'strong',
      },
      exceptions: [
        'Motion that is itself the subject — a visualisation of a live system, an art piece — where the movement is the content rather than a signal that content exists.',
      ],
      verifiedBy: 'real-motion-review',
    },
  ],

  verification: [
    {
      id: 'real-motion-review',
      kind: 'self-review',
      description:
        'Confirm the page’s motion carries real information and that its frame sources are affordable, scrubbable and degradable — measured on a real mid-tier phone.',
      blocking: true,
      questions: [
        'List every moving thing on the page and classify each as sampled or interpolated. For each interpolated one, does its subject exist independently of the page?',
        'With every transition, transform and scrub removed, what can no longer be understood? If the answer is nothing, the motion was decoration.',
        'For each moving thing, where did its frames come from — a camera, a renderer, or two states a designer chose? Is any answer "the animation library"?',
        'Is every scrub time a clamped function of scroll position, giving identical pixels after a reload, a fragment jump, a find-in-page hit and a slow scroll to the same offset?',
        'Does the scrub work in a browser that supports scroll timelines, and not only in one that does not — that is, was native: false actually passed?',
        'On a real mid-tier phone, what is the measured gap between requested and presented media time during a fast scroll, and is it under 100 ms?',
        'For a sequence: what memory ceiling was stated, what is width x height x 4, how many frames does that allow, and is the lead at least eight frames?',
        'Is every evicted ImageBitmap closed, and do in-flight decodes abort when the scroll direction reverses?',
        'During the fastest scroll you can perform, does the canvas ever clear or show a placeholder rather than holding the last drawn frame?',
        'For a scene: is every scroll-driven value a pure function of progress, and does the canvas actually redraw — requestRender called — after progress is written to a ref?',
        'Is the poster or first frame a deliberately chosen frame rather than frame zero, and is it the largest contentful paint element at the same reserved aspect ratio?',
        'Under prefers-reduced-motion: reduce, is the binding detached and no window allocated, with the chosen still or composition rendered in normal flow?',
        'With JavaScript unavailable and the media element deleted from the DOM, does the section still carry its whole message?',
      ],
    },
  ],

  relatedSkills: [
    'scroll-experiences',
    'webgl-experiences',
    'motion-design',
    'motion-physics',
    'rendering-performance',
    'mobile-performance',
    'ship-readiness',
    'design-judgment',
  ],
}
