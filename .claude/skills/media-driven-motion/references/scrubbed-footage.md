# Scrubbing recorded video

Assigning `video.currentTime` looks like setting a property and is actually requesting a seek.
Everything difficult about scroll-scrubbed video follows from that.

## Why the naive version lurches

```tsx
// Wrong. This is the code almost every generated page ships.
onProgress: (p) => { video.currentTime = p * video.duration }
```

Three separate failures:

**One seek at a time.** A seek is asynchronous and engines do not queue an unbounded number of
them. Issuing one per scroll frame means most are discarded, replaced, or serviced late, and the
picture arrives after the scroll has moved on. The symptom is a video that trails the scroll and
then catches up in a jump.

**Seeks are not uniformly priced.** Inter-coded frames are reconstructed from a preceding
keyframe, so seeking to a frame 90 frames after its keyframe costs 90 decodes. A file encoded
for playback has keyframes every 2–10 seconds; a scrub through it is a decode storm.

**Nothing told you the frame arrived.** `currentTime` reflects the requested position, not the
presented picture, so any logic reading it back is reasoning about an intention.

## The correct loop

Keep the latest target, keep at most one seek in flight, and start the next one only when the
previous has been serviced.

```tsx
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
```

For verification rather than driving, `requestVideoFrameCallback` is the only honest signal
that the pixels match the request. It fires when a new frame has been presented for composition
and reports `mediaTime` and `presentedFrames`:

```ts
const tick = (_now: number, meta: VideoFrameCallbackMetadata) => {
  // meta.mediaTime is the timestamp of the frame now on screen.
  video.requestVideoFrameCallback(tick)
}
video.requestVideoFrameCallback(tick)
```

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
- **`preload="auto"`, `muted`, `playsinline`.** Without `playsinline` iOS takes the video
  fullscreen; without `muted` it will not play inline at all. A video that has never loaded
  metadata is not seekable, so gate the scrub on `loadedmetadata` and check `video.seekable`.
- **Range requests matter.** Seeking far ahead of what has been buffered is a network round
  trip. Either the whole file is small enough to fetch up front, or the scrub is short enough
  that it never outruns the buffer.

## When to stop and use a sequence instead

Switch to a frame sequence when any of these hold: the scrub must land on an exact frame; the
sequence runs backwards as often as forwards; the total is under about 120 frames; or measured
seek latency on a real mid-tier phone exceeds 100 ms after encoding work. Sequences trade bytes
for determinism, and determinism is what a hero needs.

## What every scrub still owes

A `poster` that is a deliberately chosen frame and is the largest contentful paint element. A
reserved aspect ratio so the swap shifts nothing. Under `prefers-reduced-motion: reduce`, the
still alone with no listener attached. With JavaScript unavailable, the still and the surrounding
copy carrying the whole message — verified by deleting the `<video>` from the DOM and reading
the page.
