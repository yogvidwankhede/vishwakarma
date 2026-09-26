# Frame sequences

A frame sequence is the only frame source that can be scrubbed exactly, in both directions, with
no seek latency. It pays for that with bytes and with decoded memory, and both have to be
computed before the frames are commissioned.

## The arithmetic that decides the design

**Decoded size is independent of compressed size.** A decoded frame is
`width × height × 4` bytes. Compression affects transfer and decode time, never residency.

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

`new Image()` decodes on the main thread at paint time, which is a jank source exactly when the
page is scrolling. `createImageBitmap` decodes on a worker thread inside the browser and hands
back a bitmap that `drawImage` can blit in well under a millisecond.

```ts
async function decodeFrame(url: string, signal: AbortSignal): Promise<ImageBitmap> {
  const response = await fetch(url, { signal })
  return createImageBitmap(await response.blob())
}
```

Two rules that are easy to miss:

- **`close()` every bitmap you evict.** An `ImageBitmap` holds memory outside the JavaScript
  heap and garbage collection will not reclaim it promptly. A window that drops references
  without closing them grows until the tab is killed, and it will be killed on a phone first.
- **Abort in-flight decodes when the direction reverses.** Otherwise a fast scroll up leaves a
  queue of downward decodes ahead of the frames actually needed.

`useScrollDirection` from `@vishwakarma/scroll` gives the direction to bias the window with.

## Driving the blit

Read progress in the measure phase, blit in the commit phase, and never do both in one pass —
`subscribeToScroll` enforces the split for the whole page:

```ts
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
```

When the requested frame is not resident, **hold the last drawn frame**. Do not clear the canvas
and do not draw a placeholder: a held frame reads as a pause in the motion, a cleared canvas
reads as a broken page.

## Sprite atlases, for small sequences

Below roughly 64 frames at 512 px or less, pack every frame into one image. A 8×8 atlas of
512×288 frames is 4096×2304 — one fetch, one decode, 37.7 MB resident, and afterwards zero
per-frame work beyond a sub-rectangle blit or a `background-position` step. Above that size the
atlas exceeds common `maxTextureSize` limits and must be split, at which point individual frames
are simpler.

## Format choice is a decode-time question

For a sequence the binding constraint is decode milliseconds per frame, not kilobytes. AVIF
typically produces the smallest files and decodes more slowly per frame than WebP or JPEG; for a
window that must refill during a fast scroll, the fastest-decoding format at acceptable size
wins. Measure it on the target device class with `performance.now()` around
`createImageBitmap`; do not infer it from a size comparison.

## Responsive sequences

One sequence cannot serve a phone and a desktop. Ship two or three renditions and select by
`matchMedia` before the first fetch, treating it as an art-direction decision: the phone
rendition is usually a tighter crop, not just a smaller image, because the subject has to stay
readable at a third of the width.

## What the sequence owes

The first frame ships as an ordinary `<img>` with `fetchpriority="high"`, sized by the same
reserved aspect ratio as the canvas, and it is the largest contentful paint element. Under
`prefers-reduced-motion: reduce` no window is allocated and no listener is attached — the chosen
still is the section. With JavaScript unavailable, the `<img>` is the section and the copy
around it carries the message.
