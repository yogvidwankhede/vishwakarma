'use client'
// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

/**
 * One scroll listener for the page, one layout read per frame, reads strictly before writes.
 *
 * Three rules are enforced here rather than left to each hook, because each of them is easy
 * to break and expensive to break.
 *
 * The first is that no work happens in the scroll handler. The handler schedules a frame and
 * returns. Scroll events fire faster than the compositor can present frames, so any work
 * done per event is work thrown away; worse, `getBoundingClientRect` inside a scroll handler
 * forces synchronous layout on an already-dirty tree, and the browser cannot batch its way
 * out of that. Every listener is passive, so the browser never has to wait to find out
 * whether we intend to call `preventDefault` before it scrolls.
 *
 * The second is that reads and writes are separated into two passes over the subscriber
 * list. If tasks measured and mutated one at a time, task two's read would invalidate the
 * layout task one just wrote, and the page would thrash once per task per frame. Split into
 * phases, the frame contains exactly one layout pass regardless of how many elements are
 * bound.
 *
 * The third is that the shared frame carries the scroll offset and viewport size, read once.
 * Twenty parallax elements asking `window.scrollY` twenty times is not expensive, but twenty
 * elements each reading `documentElement.scrollHeight` is, and the numbers must agree across
 * tasks anyway or elements that should move together will not.
 */

/** The state of the scrollport at the moment a frame was measured. */
export interface ScrollFrame {
  /** Vertical scroll offset of the document. */
  y: number
  /** Horizontal scroll offset of the document. */
  x: number
  /** Viewport height, excluding any classic scrollbar. */
  viewportHeight: number
  /** Viewport width, excluding any classic scrollbar. */
  viewportWidth: number
  /** Total scrollable height of the document. */
  scrollHeight: number
  /** Total scrollable width of the document. */
  scrollWidth: number
  /** `performance.now()` at the start of the frame. */
  time: number
}

/**
 * A subscriber, split into its read half and its write half.
 *
 * The contract is not advisory. `measure` may read layout and must not touch the DOM;
 * `commit` may touch the DOM and must not read layout. Carry the result between them in a
 * closure variable.
 */
export interface ScrollTask {
  /** Read phase. Runs for every task before any task commits. */
  measure: (frame: ScrollFrame) => void
  /** Write phase. Runs after every task has measured. */
  commit: () => void
}

const tasks = new Set<ScrollTask>()

let frameId = 0
let attached = false
let resizeObserver: ResizeObserver | null = null

function readFrame(): ScrollFrame {
  const root = document.documentElement
  return {
    y: window.scrollY,
    x: window.scrollX,
    // `clientHeight` on the documentElement rather than `innerHeight`: the latter includes
    // the classic scrollbar and, on mobile, changes as the URL bar collapses, so ranges
    // computed from it drift while the page is being scrolled.
    viewportHeight: root.clientHeight,
    viewportWidth: root.clientWidth,
    scrollHeight: root.scrollHeight,
    scrollWidth: root.scrollWidth,
    time: performance.now(),
  }
}

function flush(): void {
  frameId = 0
  if (tasks.size === 0) return

  // Snapshot: a task is allowed to unsubscribe itself from within its own commit, and
  // mutating the set mid-iteration would otherwise skip its neighbour.
  const snapshot = Array.from(tasks)
  const frame = readFrame()

  for (const task of snapshot) task.measure(frame)
  for (const task of snapshot) task.commit()
}

/**
 * Ask for a measure/commit pass on the next frame.
 *
 * Call this after anything that changes layout without scrolling — a section expanding, an
 * image finally decoding, a route transition. Repeat calls within one frame coalesce.
 */
export function requestScrollFrame(): void {
  if (typeof window === 'undefined') return
  if (frameId !== 0) return
  frameId = requestAnimationFrame(flush)
}

function attach(): void {
  if (attached) return
  attached = true

  // `capture: true` matters here. Scroll events from a nested scroll container do not
  // bubble, but they do run the capture phase from the window down, so this single listener
  // sees them too — which is what keeps an effect inside a scrollable panel alive without
  // every hook having to discover its own scroll parent.
  window.addEventListener('scroll', requestScrollFrame, { passive: true, capture: true })
  window.addEventListener('resize', requestScrollFrame, { passive: true })
  window.visualViewport?.addEventListener('resize', requestScrollFrame, { passive: true })

  if (typeof ResizeObserver !== 'undefined') {
    // Content that grows after load — late fonts, lazy images, an accordion — moves every
    // element below it. Without this the bound elements keep using the offsets they had at
    // subscribe time and drift silently, which is a bug that only appears on slow networks.
    resizeObserver = new ResizeObserver(requestScrollFrame)
    resizeObserver.observe(document.documentElement)
  }
}

function detach(): void {
  if (!attached) return
  attached = false

  window.removeEventListener('scroll', requestScrollFrame, { capture: true })
  window.removeEventListener('resize', requestScrollFrame)
  window.visualViewport?.removeEventListener('resize', requestScrollFrame)

  resizeObserver?.disconnect()
  resizeObserver = null

  if (frameId !== 0) {
    cancelAnimationFrame(frameId)
    frameId = 0
  }
}

/**
 * Subscribe a task to the shared scroll loop. Returns an unsubscribe function.
 *
 * A pass is scheduled immediately on subscribe. That is what makes a binding correct when
 * the page is loaded already scrolled — a restored scroll position fires no scroll event, so
 * a binding that waits for one starts life reporting zero and stays there until the user
 * moves.
 */
export function subscribeToScroll(task: ScrollTask): () => void {
  if (typeof window === 'undefined') return () => {}

  tasks.add(task)
  attach()
  requestScrollFrame()

  return () => {
    tasks.delete(task)
    if (tasks.size === 0) detach()
  }
}

/**
 * Read the scrollport synchronously, outside the loop.
 *
 * For one-off needs such as an initial value. Do not call this from a scroll handler: it
 * forces layout, which is the exact cost the loop above exists to avoid.
 */
export function readScrollFrame(): ScrollFrame | null {
  if (typeof window === 'undefined') return null
  return readFrame()
}
