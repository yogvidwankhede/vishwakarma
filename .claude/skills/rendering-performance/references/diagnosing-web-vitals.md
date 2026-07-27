# Diagnosing each Core Web Vital

Optimising a metric you have not diagnosed is guessing. Each metric has a decomposition
that turns "LCP is 4.1s" into a named subsystem to fix.

## Before anything: get field data

Lab tools simulate one device on one connection at one moment. They cannot tell you that
your p75 is dominated by users on three-year-old Android phones over 4G, which is usually
the truth. Report all three metrics, with their attribution payloads, from the
`web-vitals` library to your own endpoint, keyed by route and device class.

Attribution entries are the important part: for LCP they name the element and split the
time into phases; for CLS they identify the largest shifting element; for INP they give the
event type, target selector, and the three timing phases. Without attribution you are
collecting numbers you cannot act on.

## LCP

**Step 1 — identify the element.** In Chrome DevTools' Performance panel, record a load and
find the LCP marker in the Timings track; hovering reveals the node. In the field, use
`LCPAttribution.element`. A common surprise is that the LCP element is a large empty
container or a paragraph of body copy rather than the hero image everyone assumed.

**Step 2 — split into four phases** using attribution:

    TTFB                  server + network for the document
    resource load delay   TTFB → the LCP resource starting to download
    resource load time    the download itself
    render delay          resource complete → pixels on screen

Each phase points somewhere specific.

- **TTFB dominant (over ~40% of LCP)**: the problem is server or CDN, not the frontend.
  Look at cache hit rates, origin response time, and redirect chains — a single extra
  redirect on a mobile connection can cost 300ms.
- **Load delay dominant**: a discovery problem. The resource was not in the initial HTML,
  or it queued behind other requests. Check whether the image is rendered by client
  JavaScript, referenced from CSS, or selected after a media query — all three are
  invisible to the preload scanner. Check whether `fetchpriority="high"` is set; images
  default to low priority until layout proves they are in the viewport.
- **Load time dominant**: the resource is too big or the format is wrong. Compare
  transferred bytes against rendered display size. A 1.8MB JPEG in a 640px slot is the
  routine case; AVIF at an appropriate width usually cuts it by 80%.
- **Render delay dominant**: something blocked painting. Render-blocking CSS in the head, a
  webfont without `font-display`, or — most often in single-page frameworks — the element
  only exists after hydration. If your LCP element renders client-side, no image
  optimisation will help; the fix is to server-render it.

## CLS

**Step 1 — reproduce with the Layout Shift Regions overlay** (DevTools Rendering panel).
Shifted regions flash blue. Throttle the connection so late-arriving resources behave as
they do in the field.

**Step 2 — read the shift entries.** Each `layout-shift` entry has `sources`, giving the
nodes that moved and their before/after rectangles. The element that *moved* is rarely the
culprit; the culprit is whatever was inserted or resized above it.

**Step 3 — classify the cause.** In practice there are five:

1. **Media without dimensions.** An image or video, iframe, or embed with no reserved box.
   The fix is `width` and `height` attributes (which produce an implicit
   `aspect-ratio`), or an explicit `aspect-ratio` in CSS.
2. **Webfont swap.** Text reflows when the fallback and webfont have different metrics.
   Build a matched `@font-face` fallback with `size-adjust`, `ascent-override` and
   `descent-override`. Done correctly this reduces the font-related shift to zero.
3. **Late injection.** Consent banners, promotional bars, A/B variants, and ad slots
   inserted after first paint. Reserve the space server-side, or render them fixed.
4. **Data-dependent height.** A container that grows when a fetch resolves. Give the
   skeleton the height of the loaded state — a skeleton of the wrong height is worse than
   none, because it guarantees a shift.
5. **Animating layout properties.** Transitions on `height`, `top` or `margin` count as
   layout shifts. Transform-based animation does not.

Remember the interaction exclusion window: shifts beginning within 500ms of a user input
are not counted. If DevTools shows a shift you believe is user-initiated but it still
scores, the causal input was more than 500ms earlier.

## INP

**Step 1 — find the interaction, not the average.** INP reports roughly the worst
interaction of the visit, so aggregates hide it. Use `web-vitals` attribution to collect
the event type and target selector for the worst interaction per session, then group by
selector. One control is usually responsible for most of the tail.

**Step 2 — split into three phases.**

    input delay        input arrives → handler starts
    processing time    handler execution
    presentation delay handler ends → next frame painted

- **Input delay dominant**: the main thread was busy with something else. Look for long
  tasks and, in Chromium, `PerformanceLongAnimationFrameTiming` entries, which attribute a
  slow frame to the specific scripts that ran in it — far more actionable than the older
  Long Tasks API, which reported duration but not source. Third-party tags, hydration, and
  analytics init dominate here.
- **Processing dominant**: your handler does too much synchronously. Split it: do the
  minimum needed for visible feedback, yield, then do the rest.
- **Presentation dominant**: rendering the result is expensive. A large re-render, an
  expensive layout, or a very deep DOM. This is where framework-level work — transitions,
  virtualisation, narrower state subscriptions — actually pays.

**Step 3 — reproduce under throttling.** INP problems are frequently invisible on a
development machine and severe at 4x CPU throttling. If you cannot reproduce one, you are
not throttled enough.
