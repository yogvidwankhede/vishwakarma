# Navigation, semantics, haptics, scroll physics, sheets, icons, and build shape

## 1. Navigation and the system Back

Back is a **platform guarantee**, not an app feature. A user who cannot leave a screen with the
system gesture uninstalls, because the escape hatch they rely on everywhere else has stopped
existing here.

Support predictive back so the gesture previews its destination:
`android:enableOnBackInvokedCallback="true"` in the manifest, plus `PredictiveBackHandler` in
Compose or `OnBackPressedCallback` in the View world. The progress value lets the outgoing
screen scale and fade in step with the finger, which is what makes the gesture reversible — a
handler firing only at commit gives the user no way to change their mind mid-swipe.

**Up is not Back.** Up moves one level toward the app's root in the content hierarchy; Back moves
one step backward through the user's history. Arriving at a product page from a notification
means Back exits to the launcher while Up goes to the product list. Wiring the toolbar arrow to
`onBackPressed` is the shortcut that produces a dead end on every deep link.

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

Every meaningful image needs a `contentDescription` describing its *function*, and every
decorative one an explicit `null` — an unlabelled image is announced as "image", worse than
silence because it interrupts. `Modifier.semantics(mergeDescendants = true) { }` collapses an
avatar, a name, and a timestamp into one focus stop with one announcement, instead of three
swipes to cross one row. Section titles take `semantics { heading() }`, which populates the
heading rotor screen-reader users navigate long screens with.

`traversalIndex` is a **silent no-op without an ancestor marked `isTraversalGroup = true`**.
Setting an index under a non-group parent changes nothing, warns about nothing, and looks like a
broken API. Set the group first, then order within it.

Sensitive fields — card numbers, one-time codes, balances — take
`semantics { sensitiveData = true }` (API 35+), which redacts the node from accessibility
services other than the active screen reader. This is not what `FLAG_SECURE` does:
`FLAG_SECURE` blanks the screenshot and the recents thumbnail while leaving accessibility node
text fully readable, so a `FLAG_SECURE` screen with unmarked nodes still leaks its balance to
any bound logging service. Mark the specific nodes; marking a whole screen sensitive makes it
unusable for exactly the users the API exists to protect.

## 3. Haptics

Haptics carry information through a channel that survives a glance away from the screen, which is
why they belong on state commits rather than on every tap. Prefer `HapticFeedbackConstants`
through `View.performHapticFeedback`, because each constant is mapped by the OEM to that
device's actuator: `CONFIRM` and `REJECT` for outcomes, `CLOCK_TICK` and `SEGMENT_TICK`
for stepping through discrete values, `LONG_PRESS` for a recognised hold, `GESTURE_START` and
`GESTURE_END` to bracket a drag. Below that,
`VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)` with its `EFFECT_TICK`,
`EFFECT_DOUBLE_CLICK` and `EFFECT_HEAVY_CLICK` siblings; below that,
`VibrationEffect.startComposition().addPrimitive(PRIMITIVE_TICK, 0.4f)` for amplitude-scaled
feel on devices reporting `areAllPrimitivesSupported`. In Compose,
`LocalHapticFeedback.current.performHapticFeedback(HapticFeedbackType.LongPress)`.

Three rules govern all of them. **Causality**: fire on the event that caused the change — on
threshold crossing during a drag, not on release, because a haptic arriving after the user
already saw the result reads as a glitch. **Harmony**: haptic, visual change, and any sound land
on the same frame; a 60ms offset between buzz and pixel is perceived as two separate events.
**Utility**: reserve haptics for commit, snap, success and error. An app that vibrates on every
list tap trains the user to stop noticing, at which point the error haptic — the one that
mattered — is filtered out with the rest.

## 4. Scroll and fling physics

Android's touch constants define what counts as a gesture, and re-implementing them with guessed
numbers produces scrolling that feels subtly foreign. `ViewConfiguration.get(context)` exposes
`scaledTouchSlop` (≈**8dp** — movement below this is a tap, not a drag),
`scaledMinimumFlingVelocity` (≈**50dp/s** — below this a release is a stop, not a fling), and
`scaledMaximumFlingVelocity` as the clamp; timings are **500ms** long-press, **300ms**
double-tap, and **100ms** before the pressed state appears.

Fling deceleration comes from `OverScroller`'s spline model, which integrates a friction curve
rather than applying constant deceleration, so a hard flick travels disproportionately further
than a soft one; a linear `velocity × time × friction` approximation overshoots short flings and
undershoots long ones.

Overscroll differs by platform and **must not be cross-ported**. Android 12+ deforms content
elastically at the boundary through `EdgeEffect` and snaps it back on release; iOS rubber-bands,
translating content past the boundary with progressive resistance and revealing background.
Implementing rubber-band translation on Android produces a gesture no other Android app has, and
users read unfamiliarity as breakage rather than polish.

## 5. Bottom sheets

`ModalBottomSheet` with a `SheetState` is the container for a focused subtask that should not
discard the context behind it. Set `skipPartiallyExpanded = true` when the content has no
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

Use the **`SplashScreen` API**: `installSplashScreen()` before `setContent`, held if
necessary with `setKeepOnScreenCondition { viewModel.isLoading.value }`. A custom splash Activity
adds a whole extra activity launch to cold start and produces a visible double flash, because the
system already drew its splash before your Activity existed.

Adaptive icons occupy a **108dp canvas** of which only the centre **72dp** is guaranteed visible;
the outer 18dp per side is cropped by the launcher's mask and parallaxed during icon animation, so
artwork extending into it is clipped to a circle on one launcher and a squircle on another. Ship a
monochrome layer too, or your icon is the single full-colour square on an otherwise themed home
screen.

Material Symbols is a variable font with **optical size, weight, grade and fill** axes. Match
`opsz` to the rendered size — a 20dp icon drawn at `opsz 24` has strokes too heavy for its
counters — and match `wght` to the surrounding text weight. Fill is a state axis: animating
`FILL` from 0 to 1 is the idiomatic selected-state transition for navigation items.

The Android press affordance is the **ripple**, supplied through `indication` in
`Modifier.clickable` and themed by `LocalRippleConfiguration`. iOS uses a depress-scale with an
opacity dip. These are not interchangeable: a scale-down press on Android discards the touch-point
origin that tells the user *where* the system registered their finger, which is the ripple's actual
informational job on a large touch surface.

## 7. Build and release shape

Put shared Gradle logic in **convention plugins** inside a `build-logic` composite build, one
plugin per concern (`app`, `library`, `compose`, `hilt`, `test`). A composite build has its
own settings file and **does not inherit the root version catalog**, so
`build-logic/settings.gradle.kts` must re-declare it:

```kotlin
dependencyResolutionManagement {
    versionCatalogs { create("libs") { from(files("../gradle/libs.versions.toml")) } }
}
```

Pin every catalog version exactly: a dynamic version (`1.2.+`, `latest.release`) makes the build
non-reproducible and defeats the configuration cache, because Gradle must hit the network to
resolve it and can never conclude the graph is unchanged.

The `gradle.properties` baseline is `org.gradle.configuration-cache=true`,
`org.gradle.caching=true`, `org.gradle.parallel=true`, and `android.nonTransitiveRClass=true` —
non-transitive R classes stop each module's `R` re-exporting its dependencies' resources,
shrinking the generated class and stopping a leaf-module resource change from invalidating every
consumer.

**No I/O at configuration time.** Reading a file, shelling out to `git rev-parse`, or querying an
environment variable in a script body executes on every invocation and poisons the configuration
cache; wrap it in a `ValueSource` or `Provider` so it runs at execution time. For the same
reason use `tasks.register` over `tasks.create`: registration is lazy and configures the task
only if it enters the graph, while `create` configures it on every build regardless of whether it
runs.

Prefer **KSP over kapt**: kapt generates Java stubs for every Kotlin source file before annotation
processors run, paying a full extra compilation pass, while KSP reads the Kotlin symbol model
directly and typically halves annotation-processing time.

Ship an **AAB, not an APK** — Play generates per-device splits, so a user downloads one density
bucket and one ABI rather than all of them. Reinforce it with `resConfigs` limited to the
languages you actually translate (an unused locale set can carry several hundred KB of strings),
`abiFilters` narrowed to supported ABIs, and every opaque PNG converted to WebP, typically 25–35%
smaller at identical quality.

## Pass conditions

### Navigation and accessibility

- Is `android:enableOnBackInvokedCallback="true"` set, and is predictive back progress consumed rather than only its commit?
- Is the toolbar Up action distinct from system Back on every deep-linkable screen, and is actionable feedback delivered by `Snackbar` rather than `Toast`?
- Does every image carry either a functional `contentDescription` or an explicit `null`, and do composite rows use `semantics(mergeDescendants = true)` with `heading()` on section titles?
- Does every `traversalIndex` have an ancestor with `isTraversalGroup = true`?
- Are card numbers, OTP fields, and balances marked `sensitiveData = true` at node level rather than screen level?

### Feel

- Does every haptic fire on the event that caused the change, land on the same frame as its visual, and mark a commit rather than a tap?
- Are touch slop and fling velocity thresholds read from `ViewConfiguration` rather than written as constants?
- Does any overscroll implementation rubber-band rather than stretch?
- Does a dismissible sheet track the finger 1:1 and commit on projected velocity rather than displacement?

### Build

- Is shared build logic in a `build-logic` composite build whose settings file re-declares the version catalog, with all catalog versions exact rather than dynamic?
- Are configuration cache, build cache, parallel execution, and `nonTransitiveRClass` all enabled?
- Does any build script perform file, process, or network I/O outside a `Provider` or `ValueSource`?
- Are all task declarations `tasks.register` rather than `tasks.create`, and is annotation processing on KSP rather than kapt?
- Does the release output an AAB with `resConfigs` and `abiFilters` constrained and opaque PNGs converted to WebP?
