# Insets, touch targets, Material 3 tokens, and adaptive layout

## 1. Edge-to-edge and window insets

From **API 35 (Android 15)** an app targeting the current SDK is drawn edge-to-edge whether or
not it asked. The system stops reserving space for the status and navigation bars, so your
window now extends behind them. Nothing crashes — the failure is silent and visual: the first
line of your top app bar sits under the clock, the last row of your list under the gesture
pill.

Opt in explicitly rather than inheriting the target-SDK default, so behaviour is identical on
API 29 and API 36: `enableEdgeToEdge()` in `onCreate()` before `setContent` performs
`WindowCompat.setDecorFitsSystemWindows(window, false)` and installs transparent bar scrims.
Then consume insets **at the composable that renders against the edge**, not at the root — a
root-level `systemBarsPadding()` stops content scrolling under a translucent status bar, the
entire point of going edge-to-edge.

```kotlin
LazyColumn(
    contentPadding = WindowInsets.systemBars
        .add(WindowInsets(top = 8.dp, bottom = 8.dp))
        .asPaddingValues(),
)  // content scrolls under the bars, and stops clear of them
```

The modifier set: `Modifier.systemBarsPadding()` for status plus navigation,
`.navigationBarsPadding()` when only the bottom matters, `.displayCutoutPadding()` for
punch-holes and notches in landscape, `.safeDrawingPadding()` as the union of everything that
can occlude, and `Modifier.imePadding()` (or a direct `WindowInsets.ime` read) for the
keyboard, which animates in step rather than snapping to its final height.

The hard rule: **a hardcoded top or bottom padding constant is a bug**.
`padding(top = 24.dp)` to clear a status bar is correct on exactly one device in exactly one
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
`Modifier.minimumInteractiveComponentSize()` expands the touch area without changing drawn
bounds — Material 3 applies it already, which is why an `IconButton` measures 48dp around a
24dp icon.

Gesture navigation claims the edges before your composable sees the event. The back-gesture
strips consume roughly **20–24dp inward from the left and right edges**, and a horizontal drag
beginning there is intercepted by the system. A carousel, slider, or swipe-to-reveal row placed
against the edge feels broken and unfixable. Claim the region back with
`View.setSystemGestureExclusionRects`, remembering the platform caps exclusion at **200dp of
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
roles rather than to dp values you set yourself: `surfaceContainerLowest`,
`surfaceContainerLow`, `surfaceContainer`, `surfaceContainerHigh`,
`surfaceContainerHighest`, with level 5 adding a scrim over the highest container. Reach for
the role (`MaterialTheme.colorScheme.surfaceContainerHigh`) rather than
`Modifier.shadow(6.dp)`; a shadow you draw yourself does not respond to theme changes and will
not tint correctly under dynamic colour.

**Colour roles come in triplets**: an accent (`primary`), a guaranteed-legible foreground
(`onPrimary`), and a low-emphasis fill (`primaryContainer` with `onPrimaryContainer`).
Neutrals follow the same pattern — `surface` and its container ladder, `onSurface` with the
dimmer `onSurfaceVariant`, plus `outline` for borders that must be visible and
`outlineVariant` for dividers that must not compete.

Dynamic colour is why **hardcoded hex on a surface or accent role is forbidden**. From API 31
the system derives a full tonal palette from the wallpaper, so
`dynamicLightColorScheme(context)` and `dynamicDarkColorScheme(context)` return a scheme that
did not exist at build time. A literal `Color(0xFF1B1B1F)` background stays fixed while
`onSurface` shifts to suit a green-derived palette, and the contrast ratio you signed off in
design review is gone.

```kotlin
val scheme = when {
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
        if (dark) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
    dark -> BrandDarkScheme
    else -> BrandLightScheme
}
```

Brand-critical colour — a logo lockup, a category chip whose hue *is* the meaning — is the
legitimate exception. Keep those as named brand tokens outside the scheme, and verify their
contrast against both neutral sets independently.

## 4. Type scale

Fifteen roles across five sizes. Sizes are in **sp**, which scales with the user's font-size
preference; `dp` text ignores accessibility settings entirely and is the most common
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
| Emphasized decelerate | `cubic-bezier(0.05, 0.7, 0.1, 1.0)` | Entering the screen |
| Emphasized accelerate | `cubic-bezier(0.3, 0.0, 0.8, 0.15)` | Leaving the screen |
| Standard | `cubic-bezier(0.2, 0.0, 0.0, 1.0)` | Movement within the screen |

The rule — **enters decelerate, exits accelerate, and exits run shorter than enters** — is a
claim about attention. An entering element is something the user must read, so it arrives fast
and settles slowly, giving the eye time to land. A departing element is finished business, and
holding it on screen while it eases out delays the next thing. A symmetric 300ms/300ms pair with
one curve in both directions makes dismissal feel sticky, and users read stickiness as slowness.

Compose ships **no `LocalReducedMotion`**. Derive one, because animation removal is an
accessibility setting on Android as much as anywhere:

```kotlin
val reduceMotion = Settings.Global.getFloat(
    context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f,
) == 0f
```

Reducing motion means removing spatial translation and scale, not zeroing every duration — strip
the movement and keep a 100–150ms cross-fade, or state changes become teleports with no cue that
anything happened.

## 6. Adaptive layout

Key layout off `WindowSizeClass`, computed from the current window rather than the display:
**compact < 600dp**, **medium 600–840dp**, **expanded ≥ 840dp** in width. The window is the
correct unit because a tablet in split-screen hands your app a compact window, and a foldable
changes class mid-session without a process restart.

```kotlin
when (calculateWindowSizeClass(activity).widthSizeClass) {
    WindowWidthSizeClass.Compact -> ListOnly()          // bottom navigation bar
    WindowWidthSizeClass.Medium -> ListDetailWithRail() // navigation rail
    else -> ListDetailWithDrawer()                      // permanent drawer
}
```

Fold posture comes from `WindowInfoTracker.windowLayoutInfo(activity)` and its
`FoldingFeature`, whose `bounds` give the hinge rectangle and whose `state` distinguishes
flat from half-opened — a table-top posture wants content above the fold and controls below it.
Branching on device model, or on an `isTablet` boolean derived from a smallest-width qualifier,
fails the moment a phone unfolds, a tablet splits, or a desktop window is dragged narrower. The
size class is recomputed on every configuration change; a device name is not.

## Pass conditions

### Insets, targets, tokens

- Does the Activity call `enableEdgeToEdge()` before `setContent`, and is every top and bottom clearance derived from a `WindowInsets` source rather than a `.dp` literal?
- Do text fields clear the keyboard through `imePadding()` or an `ime` inset read rather than a fixed offset?
- Does any horizontally-draggable component sit within 24dp of a vertical screen edge without a system gesture exclusion rect?
- Is every interactive element at least 48×48dp in hit area with 8dp separation, achieved through `minimumInteractiveComponentSize()` rather than by enlarging glyphs?
- Are all colours read from `MaterialTheme.colorScheme` with no hex literals outside a named brand token set, and does the theme use `dynamicLightColorScheme`/`dynamicDarkColorScheme` on API 31+ with a static fallback?
- Is depth expressed through `surfaceContainer*` roles rather than `Modifier.shadow`, and are all radii from the 0/4/8/12/16/28/full scale?
- Is every text size in `sp`, with all styles from `MaterialTheme.typography` rather than inline `TextStyle` construction?

### Motion

- Does every duration correspond to a Material duration token value, with entering elements on emphasized-decelerate and exiting elements on emphasized-accelerate?
- Is every exit duration shorter than its matching enter duration?
- Is there a reduced-motion source derived from `Settings.Global.ANIMATOR_DURATION_SCALE` that removes translation and scale while retaining a cross-fade?

### Adaptivity

- Is every layout branch keyed on `WindowSizeClass` rather than a device name or hardcoded threshold?
