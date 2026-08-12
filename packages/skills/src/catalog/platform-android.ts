// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Android is the platform that moves underneath you after you ship.
 *
 * Almost every other platform lets you treat the screen as a rectangle you own. Android does
 * not. The window extends behind the status and navigation bars whether or not the app asked.
 * The gesture navigator claims twenty-odd density-independent pixels inward from both vertical
 * edges before a composable ever sees a touch. The colour scheme may be regenerated from the
 * user's wallpaper on a device that did not exist when the app was signed. The type scale is
 * multiplied by a font-size preference set in Settings.
 *
 * None of these produce a crash. They produce a header drawn under the clock, a carousel that
 * cannot be swiped, a contrast ratio that was verified in design review and is now wrong, and
 * a layout that clips at the largest accessibility size — all of them invisible on the one
 * device the work was built against.
 *
 * The consequence is that on Android a literal is nearly always a defect. Every value that the
 * runtime is entitled to change must be read from the runtime: insets from a WindowInsets
 * source, colour from the colour scheme, size from a WindowSizeClass, touch constants from
 * ViewConfiguration. This skill exists to make that substitution automatic, and to name the
 * mechanism behind each one so it can be overridden when the mechanism genuinely does not
 * apply.
 */
export const platformAndroid: SkillManifest = {
  vsm: '1.0',
  id: 'platform-android',
  name: 'Android Platform',
  description:
    'Use when building or reviewing Android UI in Compose or Views — insets, Material 3 tokens, state, touch targets, TalkBack, Gradle.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'foundation',
  tags: ['android', 'compose', 'material3', 'kotlin', 'mobile'],

  activation: {
    intents: [
      'building or reviewing a screen, component, or theme with Jetpack Compose or Android Views',
      'content is drawn under the status bar, navigation bar, display cutout, or keyboard',
      'choosing Material 3 colour, shape, elevation, typography, or motion tokens',
      'structuring ViewModel state, one-shot effects, or a lazy list for a Compose screen',
      'diagnosing recomposition, scroll jank, or dropped frames in a Compose UI',
      'wiring system Back, predictive back, deep links, or a bottom navigation bar',
      'adapting a layout for tablets, foldables, split-screen, or multi-window',
      'labelling a UI for TalkBack, or marking sensitive fields in the semantics tree',
      'setting up Gradle convention plugins, build configuration, or the release artefact',
    ],
    globs: [
      '**/*.kt',
      '**/*.kts',
      '**/build.gradle.kts',
      '**/settings.gradle.kts',
      '**/gradle/libs.versions.toml',
      '**/AndroidManifest.xml',
      '**/res/values/**/*.xml',
      '**/gradle.properties',
    ],
    keywords: [
      'android',
      'jetpack compose',
      'material 3',
      'kotlin',
      'window insets',
      'edge-to-edge',
      'dynamic colour',
      'talkback',
      'predictive back',
      'windowsizeclass',
      'stateflow',
      'lazycolumn',
      'gradle',
      'dp',
    ],
  },

  content: {
    summary:
      'Use when writing or auditing Android UI: read insets, colour, size class, and touch constants from the runtime rather than writing literals, and apply Material 3 token scales, Compose state discipline, and TalkBack semantics.',

    body: `# Platform: Android

Android is a compositor with opinions, a gesture system that claims the screen edges before
your code runs, and a colour palette that may be generated from the user's wallpaper after your
app is signed. Every rule here exists because some part of the runtime moves underneath you:
design for the surfaces the platform owns and it renders your work faithfully; assume fixed
geometry and it will draw your header under the clock.

---

## 1. Insets, not constants

From API 35 an app targeting the current SDK is drawn edge-to-edge whether it asked or not. The
failure is silent and visual: the top app bar under the clock, the last row under the gesture
pill. Opt in explicitly with \`enableEdgeToEdge()\` in \`onCreate()\` before \`setContent\`, so
behaviour matches on API 29 and API 36, then consume insets at the composable that renders
against the edge, never at the root — a root-level \`systemBarsPadding()\` stops content
scrolling under a translucent bar, which was the point. A list takes
\`contentPadding = WindowInsets.systemBars.asPaddingValues()\`, not a padding modifier.

The rest are \`navigationBarsPadding()\`, \`displayCutoutPadding()\`, \`safeDrawingPadding()\` as
the union, and \`imePadding()\` for the keyboard, which animates in step rather than snapping. A
hardcoded top or bottom constant is a bug: status bar height runs from 24dp to 48dp with a large
cutout, and the navigation bar is 48dp with three buttons against 24dp with gestures.

## 2. Targets and the gesture edges

48×48dp minimum with 8dp between adjacent targets. The number is anthropometric: a finger pad
contacts roughly 10mm of glass and 48dp is about 9mm at any density, so below it the resolved
touch point becomes a coin flip. \`minimumInteractiveComponentSize()\` expands the touch area
without changing drawn bounds, which is why an \`IconButton\` measures 48dp around a 24dp icon;
enlarging the glyph trades an ergonomics defect for a hierarchy defect. Gesture navigation claims
20–24dp inward from both vertical edges before your composable sees the event, so an
edge-anchored carousel is inoperable. Claim it back with \`setSystemGestureExclusionRects\`,
under the 200dp-per-edge cap — exceeding it silently drops the earliest rects.

## 3. Material 3 tokens

Shape is a scale — 0, 4, 8, 12, 16, 28dp and full — and radius encodes size class, because
perceived roundness is radius relative to the shorter side. Elevation is tonal, not shadowed:
reach for \`surfaceContainerLow\` through \`surfaceContainerHighest\` rather than
\`Modifier.shadow(6.dp)\`, since a black shadow on a near-black surface carries no information
in dark theme and a hand-drawn one will not tint under dynamic colour.

Hardcoded hex on a surface or accent role is forbidden. From API 31 the system derives the tonal
palette from the wallpaper, so a literal background stays fixed while \`onSurface\` shifts and
the contrast ratio signed off in design review is gone. Brand-critical colour stays as a named
token outside the scheme, checked against both neutral sets.

Text sizes are in **sp**; \`dp\` text ignores the user's font-size preference and is the most
common typographic defect in Android UI. Take styles from \`MaterialTheme.typography\` rather
than constructing \`TextStyle\` inline, which discards the token's line height and its tracking.

## 4. Motion tokens

Short 50/100/150/200ms, medium 250–400ms, long 450–600ms, extra-long 700–1000ms, chosen by
distance travelled and area changed. Emphasized decelerate \`cubic-bezier(0.05, 0.7, 0.1, 1.0)\`
enters, emphasized accelerate \`cubic-bezier(0.3, 0.0, 0.8, 0.15)\` exits, standard
\`cubic-bezier(0.2, 0.0, 0.0, 1.0)\` moves within the screen. Exits run shorter than enters: an
entering element must be read, a departing one is finished business and holding it delays the
next thing.

Compose ships no \`LocalReducedMotion\`; derive one from
\`Settings.Global.ANIMATOR_DURATION_SCALE == 0f\`, and reduce by removing translation and scale
while keeping a 100–150ms cross-fade — zeroing durations turns state changes into teleports.

## 5. Compose state

One immutable \`UiState\` per screen as a single \`StateFlow\`, because two flows cannot emit
atomically and some frame will render a spinner over stale content. Create it with
\`stateIn(viewModelScope, WhileSubscribed(5_000), Loading)\`: without the grace window a rotation
re-issues the network call, and with \`Eagerly\` the flow runs while the screen is invisible.
Model variants as a sealed interface, and put derived values in \`get()\` properties so
\`copy()\` cannot produce a subtotal contradicting its line items.

One-shot effects — navigation, a snackbar — are not state; route them through a buffered
\`Channel\` collected under \`repeatOnLifecycle(STARTED)\`, since a \`replay = 0\`
\`SharedFlow\` drops emissions while backgrounded. The decision rule is one question: does it
need to survive rotation? Split each screen into a stateless \`Screen(uiState, onAction)\` and a
\`Route\` owning the ViewModel, so tests can reach every state.

## 6. Compose rendering

Composition, layout, draw. Reading a \`State\` binds the reading phase to that state, so
\`Modifier.offset(x = scroll.dp)\` recomposes on every scroll frame while
\`Modifier.offset { IntOffset(…) }\` re-lays out only; the same holds for \`graphicsLayer { }\`
and \`drawBehind { }\`. Wrap a rarely-changing derivation in \`derivedStateOf\`. With strong
skipping on by default, the remaining culprit is what a lambda closes over.

Lazy items need a stable \`key\` and a \`contentType\`: without the key, removing item 3 marks
4..n as changed and destroys their state, and without \`contentType\` slots cannot be reused.
\`indexOf()\` in a key lambda makes layout O(n²), and a \`SubcomposeLayout\` — including
\`BoxWithConstraints\` — inside a lazy item stops prefetching working.

## 7. Navigation, adaptivity, semantics

Back is a platform guarantee. Set \`android:enableOnBackInvokedCallback="true"\` and consume
predictive back *progress*, not only its commit, or the gesture cannot be reversed mid-swipe. Up
is not Back: Up moves toward the app root, Back through history, and wiring the toolbar arrow to
\`onBackPressed\` produces a dead end on every deep link. Prefer \`Snackbar\` to \`Toast\` for
anything actionable — a Toast has no action slot and no place in the TalkBack focus order.
Branch layout on \`WindowSizeClass\` — compact under 600dp, medium 600–840dp, expanded above —
computed from the window, never a device name.

TalkBack reads the semantics tree, not the composition tree. Meaningful images take a functional
\`contentDescription\` and decorative ones an explicit \`null\`;
\`semantics(mergeDescendants = true)\` collapses a row into one focus stop; section titles take
\`heading()\`. \`traversalIndex\` is a silent no-op without an ancestor marked
\`isTraversalGroup = true\`. Card numbers and balances take \`sensitiveData = true\` at node
level — \`FLAG_SECURE\` blanks the screenshot and leaves accessibility text readable.

## 8. Feel and build shape

Haptics belong on state commits: fire on the event that caused the change, land on the same
frame as the visual, and reserve them for commit, snap, success and error. Read touch and fling
constants from \`ViewConfiguration\`, and do not port iOS rubber-banding — Android 12+
stretches at the boundary through \`EdgeEffect\`, and unfamiliarity reads as breakage. A sheet
tracks the finger 1:1 and commits on projected velocity, not displacement.

On the build, shared Gradle logic goes in convention plugins inside a \`build-logic\` composite
build whose settings file re-declares the version catalog, because a composite does not inherit
it. Pin versions exactly, enable the configuration and build caches and
\`nonTransitiveRClass\`, keep I/O out of configuration time, prefer KSP to kapt, and ship an
AAB with \`resConfigs\` and \`abiFilters\` constrained.`,

    references: [
      {
        id: 'insets-targets-and-material-tokens',
        title: 'Insets, touch targets, Material 3 tokens, and adaptive layout',
        answers:
          'How do I lay a screen out against the system bars, size touch targets, and pick shape, elevation, colour, type and motion values that survive dynamic colour, font scaling, and a foldable changing size mid-session?',
        content: `# Insets, touch targets, Material 3 tokens, and adaptive layout

## 1. Edge-to-edge and window insets

From **API 35 (Android 15)** an app targeting the current SDK is drawn edge-to-edge whether or
not it asked. The system stops reserving space for the status and navigation bars, so your
window now extends behind them. Nothing crashes — the failure is silent and visual: the first
line of your top app bar sits under the clock, the last row of your list under the gesture
pill.

Opt in explicitly rather than inheriting the target-SDK default, so behaviour is identical on
API 29 and API 36: \`enableEdgeToEdge()\` in \`onCreate()\` before \`setContent\` performs
\`WindowCompat.setDecorFitsSystemWindows(window, false)\` and installs transparent bar scrims.
Then consume insets **at the composable that renders against the edge**, not at the root — a
root-level \`systemBarsPadding()\` stops content scrolling under a translucent status bar, the
entire point of going edge-to-edge.

\`\`\`kotlin
LazyColumn(
    contentPadding = WindowInsets.systemBars
        .add(WindowInsets(top = 8.dp, bottom = 8.dp))
        .asPaddingValues(),
)  // content scrolls under the bars, and stops clear of them
\`\`\`

The modifier set: \`Modifier.systemBarsPadding()\` for status plus navigation,
\`.navigationBarsPadding()\` when only the bottom matters, \`.displayCutoutPadding()\` for
punch-holes and notches in landscape, \`.safeDrawingPadding()\` as the union of everything that
can occlude, and \`Modifier.imePadding()\` (or a direct \`WindowInsets.ime\` read) for the
keyboard, which animates in step rather than snapping to its final height.

The hard rule: **a hardcoded top or bottom padding constant is a bug**.
\`padding(top = 24.dp)\` to clear a status bar is correct on exactly one device in exactly one
orientation — status bar height ranges from 24dp on an older handset to 48dp with a large
cutout, and the navigation bar is 48dp with three-button navigation against 24dp with gestures.
No constant satisfies both.

## 2. Touch targets and gesture exclusion

The minimum interactive target is **48×48dp** with at least **8dp** separating adjacent
targets. The number is anthropometric, not aesthetic: an adult finger pad contacts roughly 10mm
of glass, and 48dp is about 9mm at any density, so a smaller target means the contact patch
overlaps its neighbours and the resolved touch point becomes a coin flip.

Visual size and hit size are independent. A 24dp icon inside a 48dp hit rect is correct; a 48dp
glyph is not, because that solves an ergonomics problem by damaging the visual hierarchy.
\`Modifier.minimumInteractiveComponentSize()\` expands the touch area without changing drawn
bounds — Material 3 applies it already, which is why an \`IconButton\` measures 48dp around a
24dp icon.

Gesture navigation claims the edges before your composable sees the event. The back-gesture
strips consume roughly **20–24dp inward from the left and right edges**, and a horizontal drag
beginning there is intercepted by the system. A carousel, slider, or swipe-to-reveal row placed
against the edge feels broken and unfixable. Claim the region back with
\`View.setSystemGestureExclusionRects\`, remembering the platform caps exclusion at **200dp of
vertical extent per edge** and honours the most recently added rects. Exceeding the cap does not
throw — earlier exclusions are silently dropped, so a screen with four exclusion zones discovers
that the first one stopped working.

## 3. Material 3 tokens: shape, elevation, colour

**Shape** is a scale, not a free parameter: 0dp (none), 4dp (extra small), 8dp (small), 12dp
(medium), 16dp (large), 28dp (extra large), and full (a stadium). Radius encodes size class —
chips take small, cards medium, sheets and dialogs extra large. A 16dp radius on a 32dp chip
reads as a different family from 16dp on a 200dp card, because perceived roundness is radius
relative to the shorter side.

**Elevation in M3 is tonal, not shadowed.** Where Material 2 raised a surface by casting a
shadow, M3 raises it by mixing an increasing proportion of the primary hue into the surface. The
mechanism is contrast: a black shadow on a near-black surface carries no information in dark
theme, while a tonal shift is legible in both. The six levels — 0/1/3/6/8/12dp — map to named
roles rather than to dp values you set yourself: \`surfaceContainerLowest\`,
\`surfaceContainerLow\`, \`surfaceContainer\`, \`surfaceContainerHigh\`,
\`surfaceContainerHighest\`, with level 5 adding a scrim over the highest container. Reach for
the role (\`MaterialTheme.colorScheme.surfaceContainerHigh\`) rather than
\`Modifier.shadow(6.dp)\`; a shadow you draw yourself does not respond to theme changes and will
not tint correctly under dynamic colour.

**Colour roles come in triplets**: an accent (\`primary\`), a guaranteed-legible foreground
(\`onPrimary\`), and a low-emphasis fill (\`primaryContainer\` with \`onPrimaryContainer\`).
Neutrals follow the same pattern — \`surface\` and its container ladder, \`onSurface\` with the
dimmer \`onSurfaceVariant\`, plus \`outline\` for borders that must be visible and
\`outlineVariant\` for dividers that must not compete.

Dynamic colour is why **hardcoded hex on a surface or accent role is forbidden**. From API 31
the system derives a full tonal palette from the wallpaper, so
\`dynamicLightColorScheme(context)\` and \`dynamicDarkColorScheme(context)\` return a scheme that
did not exist at build time. A literal \`Color(0xFF1B1B1F)\` background stays fixed while
\`onSurface\` shifts to suit a green-derived palette, and the contrast ratio you signed off in
design review is gone.

\`\`\`kotlin
val scheme = when {
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
        if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
    dark -> BrandDarkScheme
    else -> BrandLightScheme
}
\`\`\`

Brand-critical colour — a logo lockup, a category chip whose hue *is* the meaning — is the
legitimate exception. Keep those as named brand tokens outside the scheme, and verify their
contrast against both neutral sets independently.

## 4. Type scale

Fifteen roles across five sizes. Sizes are in **sp**, which scales with the user's font-size
preference; \`dp\` text ignores accessibility settings entirely and is the most common
typographic defect in Android UI.

| Role | Size / line height | Tracking |
| --- | --- | --- |
| Display Large / Medium / Small | 57/64, 45/52, 36/44 | −0.25, 0, 0 |
| Headline Large / Medium / Small | 32/40, 28/36, 24/32 | 0 |
| Title Large / Medium / Small | 22/28, 16/24, 14/20 | 0, +0.15, +0.1 |
| Body Large / Medium / Small | 16/24, 14/20, 12/16 | +0.5, +0.25, +0.4 |
| Label Large / Medium / Small | 14/20, 12/16, 11/16 | +0.1, +0.5, +0.5 |

Note the **tracking inversion**: display sizes take zero or negative tracking, small sizes take
positive. The mechanism is optical — at 57sp the counters and sidebearings are already generous
and default spacing reads as loose, while at 11sp the same relative spacing collapses and
adjacent letters fuse. Uniform tracking across the scale gives you airy headings and smudged
labels simultaneously. Line height is part of the token too: Body Medium at 14/28 rather than
14/20 breaks the 4dp baseline rhythm the scale is built on and misaligns every multi-line row in
every list.

## 5. Motion tokens

Durations come from four families. Short 1–4 = **50 / 100 / 150 / 200ms**, medium 1–4 = **250 /
300 / 350 / 400ms**, long 1–4 = **450 / 500 / 550 / 600ms**, extra-long 1–4 = **700 / 800 / 900
/ 1000ms**. Choose by distance travelled and area changed: a selection flip is short, a card
expanding into a detail pane is medium, a full-screen transition is long, and extra-long belongs
only to ambient or looping motion.

| Token | Cubic bézier | Use |
| --- | --- | --- |
| Emphasized decelerate | \`cubic-bezier(0.05, 0.7, 0.1, 1.0)\` | Entering the screen |
| Emphasized accelerate | \`cubic-bezier(0.3, 0.0, 0.8, 0.15)\` | Leaving the screen |
| Standard | \`cubic-bezier(0.2, 0.0, 0.0, 1.0)\` | Movement within the screen |

The rule — **enters decelerate, exits accelerate, and exits run shorter than enters** — is a
claim about attention. An entering element is something the user must read, so it arrives fast
and settles slowly, giving the eye time to land. A departing element is finished business, and
holding it on screen while it eases out delays the next thing. A symmetric 300ms/300ms pair with
one curve in both directions makes dismissal feel sticky, and users read stickiness as slowness.

Compose ships **no \`LocalReducedMotion\`**. Derive one, because animation removal is an
accessibility setting on Android as much as anywhere:

\`\`\`kotlin
val reduceMotion = Settings.Global.getFloat(
    context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f,
) == 0f
\`\`\`

Reducing motion means removing spatial translation and scale, not zeroing every duration — strip
the movement and keep a 100–150ms cross-fade, or state changes become teleports with no cue that
anything happened.

## 6. Adaptive layout

Key layout off \`WindowSizeClass\`, computed from the current window rather than the display:
**compact < 600dp**, **medium 600–840dp**, **expanded ≥ 840dp** in width. The window is the
correct unit because a tablet in split-screen hands your app a compact window, and a foldable
changes class mid-session without a process restart.

\`\`\`kotlin
when (calculateWindowSizeClass(activity).widthSizeClass) {
    WindowWidthSizeClass.Compact -> ListOnly()          // bottom navigation bar
    WindowWidthSizeClass.Medium -> ListDetailWithRail() // navigation rail
    else -> ListDetailWithDrawer()                      // permanent drawer
}
\`\`\`

Fold posture comes from \`WindowInfoTracker.windowLayoutInfo(activity)\` and its
\`FoldingFeature\`, whose \`bounds\` give the hinge rectangle and whose \`state\` distinguishes
flat from half-opened — a table-top posture wants content above the fold and controls below it.
Branching on device model, or on an \`isTablet\` boolean derived from a smallest-width qualifier,
fails the moment a phone unfolds, a tablet splits, or a desktop window is dragged narrower. The
size class is recomputed on every configuration change; a device name is not.

## Pass conditions

### Insets, targets, tokens

- Does the Activity call \`enableEdgeToEdge()\` before \`setContent\`, and is every top and bottom clearance derived from a \`WindowInsets\` source rather than a \`.dp\` literal?
- Do text fields clear the keyboard through \`imePadding()\` or an \`ime\` inset read rather than a fixed offset?
- Does any horizontally-draggable component sit within 24dp of a vertical screen edge without a system gesture exclusion rect?
- Is every interactive element at least 48×48dp in hit area with 8dp separation, achieved through \`minimumInteractiveComponentSize()\` rather than by enlarging glyphs?
- Are all colours read from \`MaterialTheme.colorScheme\` with no hex literals outside a named brand token set, and does the theme use \`dynamicLightColorScheme\`/\`dynamicDarkColorScheme\` on API 31+ with a static fallback?
- Is depth expressed through \`surfaceContainer*\` roles rather than \`Modifier.shadow\`, and are all radii from the 0/4/8/12/16/28/full scale?
- Is every text size in \`sp\`, with all styles from \`MaterialTheme.typography\` rather than inline \`TextStyle\` construction?

### Motion

- Does every duration correspond to a Material duration token value, with entering elements on emphasized-decelerate and exiting elements on emphasized-accelerate?
- Is every exit duration shorter than its matching enter duration?
- Is there a reduced-motion source derived from \`Settings.Global.ANIMATOR_DURATION_SCALE\` that removes translation and scale while retaining a cross-fade?

### Adaptivity

- Is every layout branch keyed on \`WindowSizeClass\` rather than a device name or hardcoded threshold?`,
      },
      {
        id: 'compose-state-and-rendering',
        title: 'Compose state discipline and render performance',
        answers:
          'How should I structure a Compose screen’s state, effects, and previews, and what actually causes recomposition, scroll jank, and quadratic layout cost in a lazy list?',
        content: `# Compose state discipline and render performance

## 1. Compose state discipline

**One immutable \`UiState\` per screen, exposed as a single \`StateFlow\`.** Several flows for
one screen guarantee that some frame renders an impossible combination — a spinner over stale
content, an empty message beside a populated list — because two flows cannot emit atomically.

\`\`\`kotlin
val uiState: StateFlow<CheckoutUiState> = repository.cart
    .map(::toUiState)
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), CheckoutUiState.Loading)
\`\`\`

\`WhileSubscribed(5_000)\` is load-bearing. Without the five-second grace the upstream is
cancelled and restarted on every configuration change, so a rotation re-issues the network call
the user already paid for. With \`Eagerly\` the flow runs while the screen is invisible, burning
battery and quota.

Model variants with a **sealed interface**, not a sealed class: an interface permits a state to
participate in more than one hierarchy and imposes no constructor, which matters when
\`Loading\` and \`Empty\` are shared objects.

Derived values belong in \`get()\` properties, never constructor parameters:

\`\`\`kotlin
data class CheckoutUiState(val lines: List<Line>, val promo: Promo?) {
    val subtotal: Money get() = lines.sumOf { it.total }
    val canSubmit: Boolean get() = lines.isNotEmpty() && promo?.isExpired != true
}
\`\`\`

If \`subtotal\` were a parameter, \`copy(lines = newLines)\` would produce a state whose total
contradicts its line items — the compiler accepts it and the UI shows it. A \`get()\` property
has no independent storage and therefore cannot desynchronise.

One-shot effects — navigation, a snackbar, a share sheet — are not state. Route them through a
\`Channel(Channel.BUFFERED).receiveAsFlow()\` collected under
\`repeatOnLifecycle(Lifecycle.State.STARTED)\`. The mechanism is buffering: a \`SharedFlow\` with
\`replay = 0\` drops an emission that occurs while the screen is backgrounded, so an effect fired
during a background refresh is lost, whereas a channel holds it until collection resumes. The
decision rule is one question — **does it need to survive rotation?** A selected tab does, so it
is state. A "copied to clipboard" message does not, so it is an effect.

Split each screen into a stateless \`Screen(uiState, onAction)\` and a \`Route\` wrapper owning
the ViewModel and effect collection: the stateless half is what \`@Preview\` and screenshot tests
can instantiate, whereas a composable calling \`hiltViewModel()\` internally cannot be previewed
in an error state without a running graph.

Past roughly **four or five lambda parameters**, promote them to a single
\`@Stable interface CheckoutActions\` carrying \`onQuantityChange\`, \`onRemove\`, \`onSubmit\`
and the rest. This is a readability change with a stability side-effect: one stable parameter
skips cleanly, where six separately-remembered lambdas give six chances for one to be recreated
and defeat skipping.

## 2. Compose render performance

Compose runs three phases per frame: **composition** (what to show), **layout** (where and how
big), **draw** (pixels). Reading a \`State\` binds the *reading phase* to that state, so a read
during composition invalidates the whole subtree, while the same read deferred into a lambda
that runs at layout or draw time re-runs only that phase.

\`\`\`kotlin
Modifier.offset(x = scrollOffset.dp)                        // recomposes every scroll frame
Modifier.offset { IntOffset(scrollOffset.roundToInt(), 0) } // re-lays out only
\`\`\`

The same holds for \`Modifier.graphicsLayer { alpha = fade }\` against a composition-time alpha
read, and \`drawBehind { }\` against a recomposing \`Box\` background. When a value changes far
less often than its inputs, wrap it in \`derivedStateOf\` so readers wake only when the result
changes — \`remember { derivedStateOf { listState.firstVisibleItemIndex > 0 } }\` driving a
scroll-to-top button flips twice per session rather than on every scroll pixel.

**Strong skipping has been on by default since Kotlin 2.0**, so unstable parameters no longer
break skipping by themselves and lambdas are memoised automatically. The remaining culprit is the
**captured reference**: a lambda closing over an unstable object still forces recomposition, and
a composable reading a mutable field on a plain class sees no invalidation at all. Check what a
lambda closes over before reaching for \`@Immutable\`.

Lazy lists need both a stable \`key\` and a \`contentType\`:

\`\`\`kotlin
items(items = orders, key = { it.id }, contentType = { it.kind }) { OrderRow(it) }
\`\`\`

Without a key, removing item 3 marks items 4..n as changed and destroys their state; without
\`contentType\`, a header's composition slot cannot be reused for another header, so a
heterogeneous list allocates fresh subtrees while scrolling. Never compute a key with
\`indexOf()\` — the lambda runs per visible item and \`indexOf\` is a linear scan, making layout
**O(n²)** in list length, so a 500-row list performs 250,000 comparisons per frame. Equally,
never place a \`SubcomposeLayout\` (including \`BoxWithConstraints\`) inside a lazy item:
subcomposition defers measurement to layout time, so the list cannot size items ahead of scroll
and prefetching stops working.

## Pass conditions

### State and rendering

- Does each screen expose exactly one \`StateFlow<UiState>\` created with \`stateIn(..., WhileSubscribed(5_000), ...)\`?
- Are state variants a sealed interface, with all derived values as \`get()\` properties rather than constructor parameters?
- Are one-shot effects delivered over a buffered \`Channel\` collected under \`repeatOnLifecycle(STARTED)\`, and is every screen split into a stateless composable and a ViewModel-owning \`Route\`?
- Does every lazy list item supply both a stable \`key\` and a \`contentType\`, with no \`indexOf()\` in any key lambda?
- Does any lazy item contain a \`SubcomposeLayout\` or \`BoxWithConstraints\`?
- Are scroll- and drag-driven values read inside \`offset { }\`, \`graphicsLayer { }\`, or \`drawBehind { }\` rather than at composition?
- Is any screen carrying more than four or five separate lambda parameters instead of one \`@Stable\` actions interface?`,
      },
      {
        id: 'platform-conventions-and-build',
        title: 'Navigation, semantics, haptics, scroll physics, sheets, icons, and build shape',
        answers:
          'What are the Android-specific conventions I must not port from another platform — Back, TalkBack semantics, haptic constants, fling physics, bottom sheets, adaptive icons, ripples — and how should the Gradle build be structured?',
        content: `# Navigation, semantics, haptics, scroll physics, sheets, icons, and build shape

## 1. Navigation and the system Back

Back is a **platform guarantee**, not an app feature. A user who cannot leave a screen with the
system gesture uninstalls, because the escape hatch they rely on everywhere else has stopped
existing here.

Support predictive back so the gesture previews its destination:
\`android:enableOnBackInvokedCallback="true"\` in the manifest, plus \`PredictiveBackHandler\` in
Compose or \`OnBackPressedCallback\` in the View world. The progress value lets the outgoing
screen scale and fade in step with the finger, which is what makes the gesture reversible — a
handler firing only at commit gives the user no way to change their mind mid-swipe.

**Up is not Back.** Up moves one level toward the app's root in the content hierarchy; Back moves
one step backward through the user's history. Arriving at a product page from a notification
means Back exits to the launcher while Up goes to the product list. Wiring the toolbar arrow to
\`onBackPressed\` is the shortcut that produces a dead end on every deep link.

Structural sizes: the M3 small top app bar is **64dp**, the navigation bar **80dp** with **three
to five destinations** (two is a tab pair that wants a segmented control, six needs a drawer or
rail), and a screen carries at most **one FAB** at 56dp — small 40dp, large 96dp. Two FABs is two
primary actions, which means neither is primary. Use a **Snackbar rather than a Toast** for
anything actionable: a Toast has no action slot, cannot be dismissed by the user, is absent from
the TalkBack focus order, and on API 30+ is rate-limited and suppressed from the background,
whereas a snackbar is a real composable in your window and participates in focus, insets, and
accessibility.

## 2. Accessibility semantics

TalkBack reads the semantics tree, not the composition tree, so accessibility is something you
declare rather than something you inherit.

Every meaningful image needs a \`contentDescription\` describing its *function*, and every
decorative one an explicit \`null\` — an unlabelled image is announced as "image", worse than
silence because it interrupts. \`Modifier.semantics(mergeDescendants = true) { }\` collapses an
avatar, a name, and a timestamp into one focus stop with one announcement, instead of three
swipes to cross one row. Section titles take \`semantics { heading() }\`, which populates the
heading rotor screen-reader users navigate long screens with.

\`traversalIndex\` is a **silent no-op without an ancestor marked \`isTraversalGroup = true\`**.
Setting an index under a non-group parent changes nothing, warns about nothing, and looks like a
broken API. Set the group first, then order within it.

Sensitive fields — card numbers, one-time codes, balances — take
\`semantics { sensitiveData = true }\` (API 35+), which redacts the node from accessibility
services other than the active screen reader. This is not what \`FLAG_SECURE\` does:
\`FLAG_SECURE\` blanks the screenshot and the recents thumbnail while leaving accessibility node
text fully readable, so a \`FLAG_SECURE\` screen with unmarked nodes still leaks its balance to
any bound logging service. Mark the specific nodes; marking a whole screen sensitive makes it
unusable for exactly the users the API exists to protect.

## 3. Haptics

Haptics carry information through a channel that survives a glance away from the screen, which is
why they belong on state commits rather than on every tap. Prefer \`HapticFeedbackConstants\`
through \`View.performHapticFeedback\`, because each constant is mapped by the OEM to that
device's actuator: \`CONFIRM\` and \`REJECT\` for outcomes, \`CLOCK_TICK\` and \`SEGMENT_TICK\`
for stepping through discrete values, \`LONG_PRESS\` for a recognised hold, \`GESTURE_START\` and
\`GESTURE_END\` to bracket a drag. Below that,
\`VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)\` with its \`EFFECT_TICK\`,
\`EFFECT_DOUBLE_CLICK\` and \`EFFECT_HEAVY_CLICK\` siblings; below that,
\`VibrationEffect.startComposition().addPrimitive(PRIMITIVE_TICK, 0.4f)\` for amplitude-scaled
feel on devices reporting \`areAllPrimitivesSupported\`. In Compose,
\`LocalHapticFeedback.current.performHapticFeedback(HapticFeedbackType.LongPress)\`.

Three rules govern all of them. **Causality**: fire on the event that caused the change — on
threshold crossing during a drag, not on release, because a haptic arriving after the user
already saw the result reads as a glitch. **Harmony**: haptic, visual change, and any sound land
on the same frame; a 60ms offset between buzz and pixel is perceived as two separate events.
**Utility**: reserve haptics for commit, snap, success and error. An app that vibrates on every
list tap trains the user to stop noticing, at which point the error haptic — the one that
mattered — is filtered out with the rest.

## 4. Scroll and fling physics

Android's touch constants define what counts as a gesture, and re-implementing them with guessed
numbers produces scrolling that feels subtly foreign. \`ViewConfiguration.get(context)\` exposes
\`scaledTouchSlop\` (≈**8dp** — movement below this is a tap, not a drag),
\`scaledMinimumFlingVelocity\` (≈**50dp/s** — below this a release is a stop, not a fling), and
\`scaledMaximumFlingVelocity\` as the clamp; timings are **500ms** long-press, **300ms**
double-tap, and **100ms** before the pressed state appears.

Fling deceleration comes from \`OverScroller\`'s spline model, which integrates a friction curve
rather than applying constant deceleration, so a hard flick travels disproportionately further
than a soft one; a linear \`velocity × time × friction\` approximation overshoots short flings and
undershoots long ones.

Overscroll differs by platform and **must not be cross-ported**. Android 12+ deforms content
elastically at the boundary through \`EdgeEffect\` and snaps it back on release; iOS rubber-bands,
translating content past the boundary with progressive resistance and revealing background.
Implementing rubber-band translation on Android produces a gesture no other Android app has, and
users read unfamiliarity as breakage rather than polish.

## 5. Bottom sheets

\`ModalBottomSheet\` with a \`SheetState\` is the container for a focused subtask that should not
discard the context behind it. Set \`skipPartiallyExpanded = true\` when the content has no
meaningful half-height reading, because a two-line sheet that stops at 50% and demands a second
drag is friction with no payoff. Keep the **drag handle**, the only affordance signalling that the
sheet responds to vertical drag, and the **scrim**, which dims the background and provides the
tap-outside dismissal users try first.

Swipe-to-dismiss tracks the finger **1:1** while it is down, with no easing, because any
interpolation reads as the sheet detaching from the touch. On release, decide by **projected
velocity, not displacement**: a fast flick covering 15% of the sheet height is a completed
dismissal, and requiring 50% travel means a confident gesture bounces back in the user's face.
Feed release velocity into the settling animation as its initial velocity so the sheet continues
rather than restarting from zero.

## 6. Splash, icons, and press affordance

Use the **\`SplashScreen\` API**: \`installSplashScreen()\` before \`setContent\`, held if
necessary with \`setKeepOnScreenCondition { viewModel.isLoading.value }\`. A custom splash Activity
adds a whole extra activity launch to cold start and produces a visible double flash, because the
system already drew its splash before your Activity existed.

Adaptive icons occupy a **108dp canvas** of which only the centre **72dp** is guaranteed visible;
the outer 18dp per side is cropped by the launcher's mask and parallaxed during icon animation, so
artwork extending into it is clipped to a circle on one launcher and a squircle on another. Ship a
monochrome layer too, or your icon is the single full-colour square on an otherwise themed home
screen.

Material Symbols is a variable font with **optical size, weight, grade and fill** axes. Match
\`opsz\` to the rendered size — a 20dp icon drawn at \`opsz 24\` has strokes too heavy for its
counters — and match \`wght\` to the surrounding text weight. Fill is a state axis: animating
\`FILL\` from 0 to 1 is the idiomatic selected-state transition for navigation items.

The Android press affordance is the **ripple**, supplied through \`indication\` in
\`Modifier.clickable\` and themed by \`LocalRippleConfiguration\`. iOS uses a depress-scale with an
opacity dip. These are not interchangeable: a scale-down press on Android discards the touch-point
origin that tells the user *where* the system registered their finger, which is the ripple's actual
informational job on a large touch surface.

## 7. Build and release shape

Put shared Gradle logic in **convention plugins** inside a \`build-logic\` composite build, one
plugin per concern (\`app\`, \`library\`, \`compose\`, \`hilt\`, \`test\`). A composite build has its
own settings file and **does not inherit the root version catalog**, so
\`build-logic/settings.gradle.kts\` must re-declare it:

\`\`\`kotlin
dependencyResolutionManagement {
    versionCatalogs { create("libs") { from(files("../gradle/libs.versions.toml")) } }
}
\`\`\`

Pin every catalog version exactly: a dynamic version (\`1.2.+\`, \`latest.release\`) makes the build
non-reproducible and defeats the configuration cache, because Gradle must hit the network to
resolve it and can never conclude the graph is unchanged.

The \`gradle.properties\` baseline is \`org.gradle.configuration-cache=true\`,
\`org.gradle.caching=true\`, \`org.gradle.parallel=true\`, and \`android.nonTransitiveRClass=true\` —
non-transitive R classes stop each module's \`R\` re-exporting its dependencies' resources,
shrinking the generated class and stopping a leaf-module resource change from invalidating every
consumer.

**No I/O at configuration time.** Reading a file, shelling out to \`git rev-parse\`, or querying an
environment variable in a script body executes on every invocation and poisons the configuration
cache; wrap it in a \`ValueSource\` or \`Provider\` so it runs at execution time. For the same
reason use \`tasks.register\` over \`tasks.create\`: registration is lazy and configures the task
only if it enters the graph, while \`create\` configures it on every build regardless of whether it
runs.

Prefer **KSP over kapt**: kapt generates Java stubs for every Kotlin source file before annotation
processors run, paying a full extra compilation pass, while KSP reads the Kotlin symbol model
directly and typically halves annotation-processing time.

Ship an **AAB, not an APK** — Play generates per-device splits, so a user downloads one density
bucket and one ABI rather than all of them. Reinforce it with \`resConfigs\` limited to the
languages you actually translate (an unused locale set can carry several hundred KB of strings),
\`abiFilters\` narrowed to supported ABIs, and every opaque PNG converted to WebP, typically 25–35%
smaller at identical quality.

## Pass conditions

### Navigation and accessibility

- Is \`android:enableOnBackInvokedCallback="true"\` set, and is predictive back progress consumed rather than only its commit?
- Is the toolbar Up action distinct from system Back on every deep-linkable screen, and is actionable feedback delivered by \`Snackbar\` rather than \`Toast\`?
- Does every image carry either a functional \`contentDescription\` or an explicit \`null\`, and do composite rows use \`semantics(mergeDescendants = true)\` with \`heading()\` on section titles?
- Does every \`traversalIndex\` have an ancestor with \`isTraversalGroup = true\`?
- Are card numbers, OTP fields, and balances marked \`sensitiveData = true\` at node level rather than screen level?

### Feel

- Does every haptic fire on the event that caused the change, land on the same frame as its visual, and mark a commit rather than a tap?
- Are touch slop and fling velocity thresholds read from \`ViewConfiguration\` rather than written as constants?
- Does any overscroll implementation rubber-band rather than stretch?
- Does a dismissible sheet track the finger 1:1 and commit on projected velocity rather than displacement?

### Build

- Is shared build logic in a \`build-logic\` composite build whose settings file re-declares the version catalog, with all catalog versions exact rather than dynamic?
- Are configuration cache, build cache, parallel execution, and \`nonTransitiveRClass\` all enabled?
- Does any build script perform file, process, or network I/O outside a \`Provider\` or \`ValueSource\`?
- Are all task declarations \`tasks.register\` rather than \`tasks.create\`, and is annotation processing on KSP rather than kapt?
- Does the release output an AAB with \`resConfigs\` and \`abiFilters\` constrained and opaque PNGs converted to WebP?`,
      },
    ],
  },

  rules: [
    {
      id: 'platform-android/edge-to-edge-opt-in',
      strength: 'must',
      statement:
        'Call enableEdgeToEdge() in onCreate() before setContent, and consume insets at the composable that renders against the edge rather than at the root.',
      evidence: {
        rationale:
          'From API 35 the system draws the window edge-to-edge for apps targeting the current SDK regardless of whether they opted in, so inheriting the target-SDK default means behaviour changes silently when the target is bumped. Consuming insets at the root then reintroduces the original problem in reverse: content stops scrolling under the translucent bars, which is the entire reason for drawing edge-to-edge.',
        source: 'Android 15 behaviour changes, edge-to-edge enforcement',
        url: 'https://developer.android.com/develop/ui/compose/layouts/insets',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: 'Scaffold(modifier = Modifier.systemBarsPadding()) { LazyColumn { … } }',
        good: 'LazyColumn(contentPadding = WindowInsets.systemBars.asPaddingValues()) { … }',
      },
      verifiedBy: 'insets-and-target-audit',
    },
    {
      id: 'platform-android/no-inset-constants',
      strength: 'must-not',
      statement:
        'Do not clear a system bar, cutout, or keyboard with a dp literal; derive every top and bottom clearance from a WindowInsets source.',
      evidence: {
        rationale:
          'Status bar height ranges from 24dp on an older handset to 48dp with a large cutout, and the navigation bar is 48dp with three-button navigation against 24dp with gestures, so no single constant is correct on more than one device in one orientation. The keyboard is worse: it animates to its final height, so a fixed offset is wrong for the whole duration of the transition even when the end value happens to match.',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: 'Modifier.padding(top = 24.dp, bottom = 48.dp)',
        good: 'Modifier.safeDrawingPadding().imePadding()',
      },
      verifiedBy: 'insets-and-target-audit',
    },
    {
      id: 'platform-android/touch-targets',
      strength: 'must',
      statement:
        'Give every interactive element a hit area of at least 48×48dp with 8dp of separation, expanding the touch area rather than the drawn glyph.',
      evidence: {
        rationale:
          'An adult finger pad contacts roughly 10mm of glass and 48dp is about 9mm at any density, so below that the contact patch overlaps adjacent targets and which one receives the touch becomes a coin flip. Solving it by enlarging the glyph instead trades an ergonomics defect for a hierarchy defect, since icon size is a signal of importance.',
        source: 'Material Design 3 accessibility guidance',
        url: 'https://m3.material.io/foundations/accessible-design',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: 'IconButton(onClick = ::close, modifier = Modifier.size(32.dp)) { Icon(…) }',
        good: 'IconButton(onClick = ::close, modifier = Modifier.minimumInteractiveComponentSize()) { Icon(…) }',
      },
      verifiedBy: 'insets-and-target-audit',
    },
    {
      id: 'platform-android/gesture-exclusion-at-edges',
      strength: 'must',
      statement:
        'Register a system gesture exclusion rect for any horizontally-draggable component within roughly 24dp of a vertical screen edge, staying under the 200dp-per-edge cap.',
      evidence: {
        rationale:
          'The back-gesture strips consume 20-24dp inward from each vertical edge and intercept horizontal drags before the composable sees the event, so an edge-anchored carousel or swipe row is simply inoperable and looks like a bug in your code. The 200dp cap matters because exceeding it does not throw — the platform silently drops the earliest rects, so the first exclusion zone on a screen stops working with no diagnostic.',
        confidence: 'established',
      },
      verifiedBy: 'insets-and-target-audit',
    },
    {
      id: 'platform-android/colour-from-scheme',
      strength: 'must-not',
      statement:
        'Do not write hex colour literals for surface, accent, or text roles; read them from MaterialTheme.colorScheme with dynamic schemes on API 31 and above.',
      evidence: {
        rationale:
          'From API 31 the system generates the tonal palette from the user’s wallpaper, so half the scheme is decided after the app is signed. A literal background stays fixed while onSurface moves to suit that palette, which means the contrast ratio verified in design review is not the ratio the user sees, and no static check on the source can detect it.',
        source: 'Material 3 dynamic colour',
        url: 'https://m3.material.io/styles/color/dynamic',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: 'Surface(color = Color(0xFF1B1B1F)) { Text("Total", color = Color.White) }',
        good: 'Surface(color = MaterialTheme.colorScheme.surfaceContainerHigh) { Text("Total") }',
      },
      exceptions: [
        'Brand-critical colour whose hue carries the meaning — a logo lockup or a category chip — kept as a named token outside the scheme and contrast-checked against both neutral sets.',
      ],
      verifiedBy: 'design-audit',
    },
    {
      id: 'platform-android/text-in-sp',
      strength: 'must',
      statement:
        'Express every text size in sp and take styles from MaterialTheme.typography rather than constructing TextStyle inline.',
      evidence: {
        rationale:
          'dp text is immune to the user’s font-size preference, so an accessibility setting the user relies on has no effect on your app and the failure is invisible to anyone testing at default scale. Inline TextStyle construction additionally drops the token’s line height and tracking, and the tracking is not uniform across the scale — it is negative at display sizes and positive at label sizes for optical reasons.',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: 'Text("Total", style = TextStyle(fontSize = 14.dp.value.sp, letterSpacing = 0.5.sp))',
        good: 'Text("Total", style = MaterialTheme.typography.bodyMedium)',
      },
      verifiedBy: 'design-audit',
    },
    {
      id: 'platform-android/exit-shorter-than-enter',
      strength: 'must',
      statement:
        'Animate entering elements with emphasized decelerate and exiting elements with emphasized accelerate, giving the exit a shorter duration than its matching enter.',
      evidence: {
        rationale:
          'An entering element carries content the user has to read, so it arrives quickly and settles slowly to give the eye time to land. A departing element is finished business, and every millisecond it eases out is a millisecond before the next thing can be attended to. A symmetric pair with one curve in both directions makes dismissal feel sticky, and users report stickiness as slowness.',
        source: 'Material 3 motion easing and duration tokens',
        url: 'https://m3.material.io/styles/motion/easing-and-duration',
        confidence: 'strong',
      },
      examples: {
        language: 'kotlin',
        bad: 'enter = fadeIn(tween(300)), exit = fadeOut(tween(300))',
        good: 'enter = fadeIn(tween(300, easing = EmphasizedDecelerateEasing)),\nexit = fadeOut(tween(150, easing = EmphasizedAccelerateEasing))',
      },
      verifiedBy: 'motion-and-state-review',
    },
    {
      id: 'platform-android/single-uistate-flow',
      strength: 'must',
      statement:
        'Expose exactly one immutable UiState per screen as a StateFlow created with stateIn(scope, WhileSubscribed(5_000), initial).',
      evidence: {
        rationale:
          'Two flows cannot emit atomically, so any screen driven by several flows will eventually render a frame showing an impossible combination such as a spinner over stale content. The five-second grace window is separately load-bearing: without it the upstream is cancelled and restarted on every configuration change, so a rotation re-issues a network call, and with Eagerly the flow keeps running while the screen is invisible.',
        confidence: 'strong',
      },
      examples: {
        language: 'kotlin',
        bad: 'val items = repo.items.stateIn(…)\nval isLoading = MutableStateFlow(true)\nval error = MutableStateFlow<String?>(null)',
        good: 'val uiState: StateFlow<CheckoutUiState> = repo.cart.map(::toUiState)\n    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), Loading)',
      },
      verifiedBy: 'motion-and-state-review',
    },
    {
      id: 'platform-android/lazy-key-and-content-type',
      strength: 'must',
      statement:
        'Give every lazy list item a stable key and a contentType, and never compute a key with indexOf().',
      evidence: {
        rationale:
          'Without a key, removing item 3 marks items 4..n as changed, so their remembered state and scroll positions are destroyed. Without contentType, a header’s composition slot cannot be reused for another header, so a heterogeneous list allocates fresh subtrees while scrolling. indexOf() is a linear scan run per visible item, which makes layout O(n²) — a 500-row list performs about 250,000 comparisons per frame.',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: 'items(orders, key = { orders.indexOf(it) }) { OrderRow(it) }',
        good: 'items(orders, key = { it.id }, contentType = { it.kind }) { OrderRow(it) }',
      },
      verifiedBy: 'motion-and-state-review',
    },
    {
      id: 'platform-android/defer-frequent-state-reads',
      strength: 'should',
      statement:
        'Read scroll-, drag-, and animation-driven values inside offset { }, graphicsLayer { }, or drawBehind { } lambdas rather than at composition time.',
      evidence: {
        rationale:
          'Compose binds a State read to the phase in which it happens, so a read during composition invalidates the whole subtree every frame the value changes, while the same read deferred into a layout or draw lambda re-runs only that phase. On a scroll-driven value that is the difference between recomposing a list on every frame and merely re-placing it.',
        confidence: 'established',
      },
      examples: {
        language: 'kotlin',
        bad: 'Modifier.offset(x = scrollOffset.dp)',
        good: 'Modifier.offset { IntOffset(scrollOffset.roundToInt(), 0) }',
      },
      verifiedBy: 'motion-and-state-review',
    },
  ],

  verification: [
    {
      id: 'insets-and-target-audit',
      kind: 'self-review',
      description: 'Confirm the screen is laid out against runtime insets with reachable targets.',
      blocking: true,
      questions: [
        'Does the Activity call enableEdgeToEdge() before setContent, and is every top and bottom clearance derived from a WindowInsets source rather than a dp literal?',
        'Do text fields clear the keyboard through imePadding() or an ime inset read rather than a fixed offset?',
        'Does any horizontally-draggable component sit within 24dp of a vertical edge without a gesture exclusion rect, and does the screen stay under 200dp of exclusion per edge?',
        'Is every interactive element at least 48×48dp in hit area with 8dp separation, achieved by expanding the touch area rather than the glyph?',
      ],
    },
    {
      id: 'motion-and-state-review',
      kind: 'self-review',
      description: 'Confirm motion tokens, screen state, and Compose phase discipline.',
      blocking: true,
      questions: [
        'Is every exit duration shorter than its matching enter, with enters on emphasized decelerate and exits on emphasized accelerate?',
        'Is there a reduced-motion source derived from ANIMATOR_DURATION_SCALE that removes translation and scale while keeping a 100-150ms cross-fade?',
        'Does the screen expose exactly one StateFlow<UiState> with WhileSubscribed(5_000), with derived values as get() properties rather than constructor parameters?',
        'Are one-shot effects delivered over a buffered Channel collected under repeatOnLifecycle(STARTED) rather than held as state?',
        'Does every lazy item supply a stable key and a contentType, with no indexOf() in a key lambda and no SubcomposeLayout or BoxWithConstraints inside an item?',
      ],
    },
    {
      id: 'semantics-and-navigation-review',
      kind: 'self-review',
      description:
        'Confirm TalkBack, Back, and adaptive behaviour before reporting the screen done.',
      questions: [
        'Is enableOnBackInvokedCallback set, and does the handler consume predictive back progress rather than only its commit?',
        'Is the toolbar Up action distinct from system Back on every deep-linkable screen?',
        'Does every image carry a functional contentDescription or an explicit null, do composite rows merge descendants, and do section titles declare heading()?',
        'Does every traversalIndex have an ancestor marked isTraversalGroup = true?',
        'Is every layout branch keyed on WindowSizeClass rather than a device name, and does the screen still work when the window is resized to compact mid-session?',
      ],
    },
    {
      id: 'design-audit',
      kind: 'command',
      description: 'Scan for hardcoded values and banned patterns.',
      command: 'bash scripts/audit_design.sh . --platform android',
      blocking: true,
    },
  ],

  relatedSkills: ['colour-systems', 'motion-design', 'mobile-performance', 'accessible-components'],
}
