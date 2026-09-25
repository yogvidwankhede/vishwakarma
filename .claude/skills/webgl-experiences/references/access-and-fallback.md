# Accessibility and failure paths

## A canvas conveys nothing

Screen readers see one node with no children, no text and no structure, whatever is painted
inside it. There is no alt text a renderer can infer, no DOM to traverse, and no amount of care
over the geometry changes that.

So the rule is unconditional: **every piece of information the scene conveys must also exist as
text.** If the model is the product, the specification has to be readable. If the visualisation
shows a trend, the trend has to be stated. If the scene is decorative, say so — and then it
needs no description, only `aria-hidden`.

**The test:** load the page with the canvas element deleted. Everything a user would have
learned from it should still be obtainable. If it is not, the scene carries content some of
your users cannot reach, and the fix is content, not ARIA.

## AccessibleScene

```tsx
<AccessibleScene
  label="Office chair, front three-quarter view"
  description={
    <>
      <p>Mesh back, aluminium five-star base, 12 cm seat-height travel.</p>
      <ul><li>Seat 47 cm wide</li><li>Weight 18 kg</li></ul>
    </>
  }
  interactive
  onOrbit={({ azimuth, polar, zoom }) => controls.apply(azimuth, polar, zoom)}
  keyboardStep={0.15}
>
  <AdaptiveCanvas fallback={poster}>{scene}</AdaptiveCanvas>
</AccessibleScene>
```

- `label` is the accessible name. Describe what it **is**, not that it is 3D — "office chair,
  front three-quarter view", never "3D model".
- `description` goes into the accessibility tree, and onto the screen with
  `showDescription`. Worth showing: a caption stating what the viewer shows helps everyone on
  a slow connection watching the fallback, everyone who scrolled past before it loaded, and
  everyone trying to work out what they are meant to be looking at.
- `decorative` applies `aria-hidden` and removes it from the tree. Honest for a background
  effect; badly wrong for anything a user is expected to look at, and it is the shortcut people
  reach for when writing the description feels like work.
- `interactive` makes the wrapper a focus stop (`tabIndex: 0`) with a visible ring drawn
  only for `:focus-visible`.
- The role is `img` with `aria-roledescription="interactive 3D scene"`, not
  `application` — `application` suppresses the screen reader's own navigation keys, trading
  shortcuts the user knows for shortcuts they do not.
- ARIA goes on a **wrapper element**, never on the canvas: attributes set on a canvas a
  renderer owns are liable to be overwritten on resize or recreation, and the failure is
  silent — the scene looks identical and has stopped being announced.

## The keyboard path

A scene the user can rotate with a mouse and not with a keyboard is a control that exists for
some people and not others. `orbitDeltaForKey(key, step)` is the binding table, exported so
the same contract can drive on-screen buttons:

| key | `OrbitDelta` |
|---|---|
| `ArrowLeft` / `ArrowRight` | azimuth −step / +step |
| `ArrowUp` / `ArrowDown` | polar +step / −step |
| `PageUp` / `PageDown` | zoom +1 / −1 |
| `+` `=` / `-` `_` | zoom +1 / −1 |
| `Home` | all zeroes — a reset, distinguished by the key, so scenes that do not implement it safely do nothing |
| anything else | `null` |

`preventDefault` is called only once a key is known to be handled; swallowing arrow keys
unconditionally steals page scrolling from anyone tabbing past the scene.

Add the on-screen buttons too. A keyboard-only contract still excludes anyone using a touch
screen with switch access or voice control, and named views ("front", "side", "reset") are
faster for everyone than arrow-stepping to an angle.

## Reduced motion

`prefers-reduced-motion` is normally handled in CSS, and a canvas has no CSS layer. Nothing
inside a WebGL context is affected unless JavaScript reads the preference, so scenes routinely
keep spinning for users who disabled animation everywhere else — and a slowly rotating product
model filling the viewport is a considerably stronger vestibular trigger than the fades and
slides the preference was invented to suppress.

`useReducedMotionScene` translates it:

```tsx
const motion = useReducedMotionScene({ autoRotateSpeed: 0.5, dampingFactor: 0.05 })
// { prefersReducedMotion, autoRotate, autoRotateSpeed, enableDamping,
//   dampingFactor, animate, motionScale, frameloop }
```

Frozen values: `autoRotate: false`, `autoRotateSpeed: 0`, `enableDamping: false`, plus
`dampingFactor: 0`, `animate: false`, `motionScale: 0`, `frameloop: 'demand'`. Multiply
any self-computed rate by `motionScale` to freeze an existing animation without restructuring
it.

**It does not stop rendering.** Reduced motion means *still*, not *absent*: a frozen scene the
user inspects and rotates deliberately with their own input honours the preference completely,
while replacing it with a flat image treats an accessibility setting as a punishment. This is
also why `reducedMotionBlocks` defaults to `false` in the capability options — turn it on
only when the scene's content **is** motion (a particle field, a continuous fly-through) and
cannot be made still without becoming pointless.

Damping is switched off under the preference even though it feels like polish: it produces
movement that continues after the user stopped providing input, which is exactly the category
of unrequested motion the preference is about.

The hook uses `useSyncExternalStore`, so the first client render is already correct. With
state-plus-effect the scene mounts with autorotation on and switches it off a frame later,
which means a user who disabled animation still sees the model lurch once per page load. The
server snapshot is `true` — guessing towards calm costs one missed animation; guessing the
other way hits somebody with a vestibular disorder.

Offer an in-page pause control as well, wired to the `freeze` option. The OS preference is
buried in accessibility settings and plenty of people who would use a pause button have never
found it.

**Scroll-driven cameras** are the sharpest case: large-area motion coupled to scroll at a rate
the user did not choose. Under reduced motion, render the end state and let the page scroll
normally. WCAG 2.2 SC 2.3.3 covers this.

## No WebGL, and a context that dies mid-session

Context loss is a **runtime event**, not a hypothetical. The GPU process crashes; a driver
resets; the OS reclaims resources under memory pressure; a laptop switches GPUs; a tab is
backgrounded on Android and its context is discarded; or the document exceeds its live-context
cap (~16 in Chromium) and the browser evicts the oldest — which is usually somebody's leaked
probe context rather than a driver fault.

`SceneBoundary` is the answer, and `AdaptiveCanvas` already wraps its canvas in one.

```tsx
<SceneBoundary fallback={poster} onError={(e, info) => report(e, info)}>
  {scene}
</SceneBoundary>
```

It catches what React cannot recover from on its own: a rejected dynamic import when `three`
is absent, a renderer throwing when the GPU process dies, a loader throwing on a malformed
model. Without it, a decorative background effect takes the entire route down — a spectacularly
poor trade for ornament.

Two properties to understand:

- **It is one-way.** No automatic retry, because a scene that failed because WebGL is
  unavailable fails again immediately and a retrying boundary turns one error into an infinite
  loop. Recovery is the application's decision, made by remounting with a new `key` — a
  "reload the viewer" button, not an automatic loop.
- **`onError` must be wired to real error reporting.** A scene that quietly falls back looks
  fine to everyone including the team. "Our 3D hero has been broken in Safari for six weeks" is
  not a discovery to make from a support ticket.

`peerStatus('fiber' | 'drei')` reports `'idle' | 'loading' | 'ready' | 'unavailable'`
without triggering a load. Failures are cached as well as successes: without that, a page with
four scenes on a machine lacking `three` attempts four module loads and fills the console
with identical errors that bury the real problem.

## The fallback is the page for a large share of visitors

```tsx
<SceneFallback
  poster="/chair-1600.avif"
  posterSrcSet="/chair-800.avif 800w, /chair-1600.avif 1600w, /chair-2400.avif 2400w"
  posterSizes="(max-width: 48rem) 100vw, 50vw"
  alt="Office chair, front three-quarter view, mesh back and aluminium base"
  aspectRatio="4 / 3"
  background="#141416"
  description={<p>Seat height adjusts over 12 cm; seat 47 cm wide; 18 kg.</p>}
  reason={reason}
/>
```

- **A real image, not a grey box or a spinner.** Render the scene once at build time from the
  canonical camera and ship the result. `children` replaces the poster when a genuinely
  designed alternative is better — a diagram, or the table of numbers a visualisation was
  showing.
- **`alt` is required whenever a poster is given, and required to be useful.** It is
  frequently the only description of the subject any assistive technology will ever encounter,
  since the canvas that replaces it conveys nothing.
- **`aspectRatio` must match the canvas.** Approximately is not good enough: the shift is
  measured in fractions of the viewport and a five per cent error is still a shift. Set it on
  `LazyScene` too, or the container has no height until the scene mounts and the page reflows
  twice.
- **The poster is eager.** Lazy-loading it leaves a blank box during exactly the window it
  exists to cover.
- **No status copy.** `reason` exists for analytics; knowing what share of visitors never see
  the scene is genuinely useful. On screen it is noise at best.

## What to verify on real hardware

Emulated throttling in devtools does not reproduce thermal behaviour, and thermal behaviour is
the defect. On a real mid-tier Android phone, on a throttled connection, cold cache:

1. Poster visible immediately; the canvas is not the largest contentful paint.
2. No layout shift when the canvas replaces the poster.
3. Frame time after **two minutes** of continuous use, not two seconds — that is when the
   device is the one your users have.
4. `checkSceneBudget` clean at the lowest tier shipped, with `textureMemoryMiB` computed
   from uploaded sizes.
5. Whether `PerformanceGuard` ever fired. If it degrades on the target device within the
   first thirty seconds, the initial tier was wrong and the fix is a smaller scene, not a
   higher `slowFrameMs`.
6. Battery and heat: an idle scene that still requests frames shows up as measurable drain.

Then, on any machine: WebGL disabled (`chrome://flags`, or a blocking extension), the canvas
element deleted from the DOM, keyboard only, a screen reader, `prefers-reduced-motion:
reduce`, and Save-Data on — six complete pages, or the scene is not finished.
