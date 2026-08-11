# Platform: Apple

Apple's platforms are unusually opinionated about physical metaphor: surfaces have thickness, corners have curvature that varies continuously, and motion is spring-driven rather than curve-driven. Nearly every rule below follows from one of three mechanisms — the display is a fixed-density physical object with obstructions in known places, the eye is extremely good at detecting discontinuities in curvature and velocity, and the system will re-render your interface at sizes and contrasts you did not choose. Design against the system's semantics and it adapts for free. Design against literal values and you are shipping a snapshot of one device on one settings screen.

The correct posture is to **express intent, not measurement**. `.font(.body)` is intent; `17pt` is measurement. `UIColor.label` is intent; `#000000` is measurement. Measurements are correct until the user turns on Larger Text or Increase Contrast, and then they are wrong in ways you will never see because you did not turn those on.

## 1. Safe areas and the physical screen

The safe area is the region of the window not occluded by hardware or by system chrome that draws over your content: the sensor housing, the status bar, the home indicator, and on iPad the Stage Manager window furniture. `UIView.safeAreaInsets` reports it in points; SwiftUI exposes it through the layout system automatically and through `GeometryProxy.safeAreaInsets` when you need the numbers.

The **home-indicator bottom inset is 34pt** on every device that has one, and 0pt on devices with a physical home button. The **status-bar inset varies by generation**: 20pt on pre-notch devices, 44pt on the notched X-class generation, 47pt on the 12/13/14 class, 54pt on the Dynamic Island Pro devices, and 59pt on the 16 Pro class. That list is the reason you must never write it down. Every value in it was introduced by a device that did not exist when the previous value was considered complete, and the next one will do the same.

The mechanism that makes safe areas feel right is a split: **the scroll view extends under the chrome, while the content's padding respects the inset**. A scroll view clipped at the safe-area boundary produces a hard cut where content vanishes into a gap, and the translucent navigation bar has nothing to blur — it renders as flat grey. Let the scroll view fill the window and push the insets into content padding, and material chrome samples live content underneath, which is what produces the correct frosted scroll behaviour.

```swift
ScrollView {
    LazyVStack(spacing: 12) { /* rows */ }
        .padding(.horizontal, 16)
}
.ignoresSafeArea(.container, edges: .bottom)
.safeAreaInset(edge: .bottom) {
    PlayerBar()          // adds to the safe area rather than covering content
}
```

`.safeAreaInset(edge:)` is the correct tool for persistent overlay chrome because it both draws the bar and enlarges the inset that descendant scroll views respect, so the last row can still scroll clear of it. An overlay placed with `.overlay(alignment: .bottom)` looks identical and permanently hides the final row.

`.ignoresSafeArea(.container, edges:)` and `.ignoresSafeArea(.keyboard)` are different requests and confusing them is a common bug. The container region is the hardware and chrome inset; the keyboard region is the software keyboard's footprint. A background gradient wants `.container` so it bleeds to the physical edge; a form wants to keep respecting `.keyboard` so its fields lift clear of the input. Writing `.ignoresSafeArea()` with no arguments ignores both, which is why the field you are typing into ends up underneath the keyboard.

On the web, the equivalents are `env(safe-area-inset-bottom)` and friends, which return 0 unless `viewport-fit=cover` is set in the viewport meta tag. **A web app that never sets `viewport-fit=cover` cannot have a safe-area bug and also cannot draw edge to edge** — pick deliberately. Prefer `max(16px, env(safe-area-inset-bottom))` over the bare `env()` value, since the inset is 0 on devices without a home indicator and a bare `env()` leaves a bottom bar flush against the glass there.

The horizontal insets are non-zero only in landscape on notched devices, where they are **44pt** on the sensor-housing side. Content laid out with a fixed 16pt horizontal padding disappears under the housing in landscape. Add the leading and trailing safe-area insets to your padding rather than replacing it.

## 2. Touch targets

The HIG minimum is **44×44pt**, which is roughly the contact patch of an adult fingertip at a comfortable grip. Below that the error rate climbs sharply, and the errors are not evenly distributed — they cluster at screen edges and in the reach arc of the thumb, which is precisely where navigation controls live.

The visual element may be smaller than 44pt. A 16pt close glyph is often the right *drawing*; it is never the right *hit rect*. Expand the target, not the artwork.

```swift
Image(systemName: "xmark")
    .imageScale(.medium)
    .frame(width: 44, height: 44)   // hit area
    .contentShape(Rectangle())      // makes the whole frame tappable, not just the glyph
```

`.contentShape(Rectangle())` is load-bearing: without it, hit-testing follows the rendered glyph's alpha and the padding is inert. On the web the equivalent is a transparent `::after` pseudo-element with negative insets, which expands the target without disturbing layout the way padding would.

Adjacent targets need **at least 8pt of clear space** between their hit rects. Two 44pt buttons touching edge to edge satisfy the size rule and still produce mis-taps, because the finger's centroid lands near a boundary and small tremors cross it.

The rule tightens near destructive actions. A Delete sitting 8pt from a Save satisfies the letter of the spacing rule and still produces data loss, because the cost of the two errors is wildly asymmetric while their probability is identical. Separate destructive actions by more distance than the layout needs, or move them behind a different interaction entirely — a swipe action or a context menu — so that no single mis-tap can reach them.

On macOS and other pointer-driven contexts the minimum relaxes, because a mouse reports an exact pixel and a fingertip reports a blob. Detect the input mechanism rather than the platform: an iPad with a trackpad attached is a pointer device, and a Mac with a touch bar or a touchscreen web view is not.

## 3. Dynamic Type

The system text styles at the default size:

| Style | Size | Weight |
|---|---|---|
| Large Title | 34pt | regular |
| Title 1 | 28pt | regular |
| Title 2 | 22pt | regular |
| Title 3 | 20pt | regular |
| Headline | 17pt | semibold |
| Body | 17pt | regular |
| Callout | 16pt | regular |
| Subheadline | 15pt | regular |
| Footnote | 13pt | regular |
| Caption 1 | 12pt | regular |
| Caption 2 | 11pt | regular |

Note that **Headline and Body are the same 17pt and differ only in weight**. That is the platform telling you something: hierarchy at small sizes is carried by weight and colour, not by size. If you invent an 18pt "subheading" to sit between them you have added a step the system will not scale coherently and that no user perceives as a level.

Use `.font(.body)` in SwiftUI, `UIFont.preferredFont(forTextStyle:)` in UIKit, and `UIFontMetrics(forTextStyle:).scaledFont(for:)` when you must scale a custom face. `@ScaledMetric` scales arbitrary numbers along the same curve:

```swift
@ScaledMetric(relativeTo: .body) private var rowSpacing: CGFloat = 12
@ScaledMetric(relativeTo: .body) private var iconSize: CGFloat = 20
```

The content must **survive to AX5**, the largest accessibility size, where Body renders around 53pt — roughly 3.1× default. The failure mode is not the text; the text scales. The failure is **spacing expressed in fixed points while text scales**: a 44pt-tall row with `.font(.body)` inside is fine at 17pt and clips its own descenders at 53pt, and a two-line label in a fixed 60pt card loses its second line entirely. Express vertical rhythm through `@ScaledMetric` or through padding on intrinsically-sized containers, and let the row height be whatever the text needs.

At accessibility sizes, **horizontal pairs must become vertical stacks**. A label-and-value row that fits side by side at 17pt has no room at 53pt. Gate on the size category rather than on width:

```swift
@Environment(\.dynamicTypeSize) private var typeSize
// ...
if typeSize.isAccessibilitySize { VStack(alignment: .leading) { … } }
else { HStack { … } }
```

Two escape hatches exist and both are usually wrong. `.minimumScaleFactor(0.8)` shrinks text to fit, which reverses the user's explicit request for larger type — they turned the setting on because they could not read 17pt, and you have handed them 14pt. `.lineLimit(1)` truncates, which loses content. Reserve both for genuinely fixed-width contexts such as a numeric badge, and prefer `.dynamicTypeSize(...DynamicTypeSize.accessibility1)` to cap the scale on a specific dense subview when the alternative is an unusable layout.

The exception to scaling everything is fixed physical geometry. A 44pt touch target is 44pt because that is the size of a finger, and fingers do not scale with the type setting, so **hit rects stay fixed while the label inside them grows** — the row gets taller, not the minimum. Similarly, hairline separators stay at 1px regardless of type size; a separator that scaled to 3px would read as a border.

## 4. Continuous corners

Use `RoundedRectangle(cornerRadius: 16, style: .continuous)` in SwiftUI and `layer.cornerCurve = .continuous` in UIKit. The default `.circular` style is wrong for surfaces in an Apple interface.

The mechanism is curvature continuity. A circular-arc corner has constant curvature along the arc and zero curvature along the straight edge, so at the tangent point curvature jumps discontinuously from 1/r to 0. The tangent direction is continuous, so the outline is smooth in the naive sense, but the *rate of turning* is not, and the visual system is sensitive to second-order discontinuity in a contour. The result reads as a faint kink at the four points where each corner meets its edges — most visible at large radii and on light-on-dark surfaces. A continuous corner ramps curvature in and out, so there is no point at which the turn rate steps, and the shape reads as one object rather than a rectangle with arcs glued on.

**Nested radii must be concentric**: `childRadius = parentRadius − padding`. A 20pt card with 12pt padding wants a 8pt inner radius. Give the child the parent's 20pt and the gap between the two curves is widest at the corner diagonal and narrowest at the edge midpoints, so the padding visibly thins toward the corners; give the child 0pt and the square inner corner sits inside a round outer one, which reads as two unrelated objects. If your inner radius would go negative, your padding is larger than your radius and the child should simply be square.

CSS approximates this with `border-radius` plus a corner-smoothing implementation; where none is available, prefer slightly larger radii on the parent than you would use for a squircle, since a circular arc reads tighter than a continuous corner of nominally the same radius.

## 5. Materials and depth

`.regularMaterial`, `.thinMaterial`, `.ultraThinMaterial`, `.thickMaterial` and `.ultraThickMaterial` are not translucency percentages — they are compositing recipes combining a backdrop blur, a saturation boost, a vibrancy pass on foreground content, and a tint that flips with the colour scheme. Foreground text placed on a material should use `.foregroundStyle(.secondary)` and friends so it picks up the vibrancy blend rather than sitting on top as flat ink.

The web translation of `.regularMaterial`:

```css
.material-regular {
  backdrop-filter: blur(20px) saturate(180%);
  background: rgba(255, 255, 255, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.4);
}
```

The saturation boost is not decoration. Blurring desaturates, because averaging neighbouring pixels pulls them toward the local mean, so a plain blur produces a grey wash that reads as dirty glass. Boosting saturation to roughly 180% restores the chroma the blur removed. The 1px light top edge is a **light catch** — it simulates the bright refraction at the top bevel of a physical pane and is what makes the surface read as having thickness rather than being a foggy hole.

**Do not stack two translucent surfaces.** The upper surface's blur samples a backdrop that has already been blurred and desaturated, so contrast collapses toward the local mean twice over and the result is muddy grey with no legible content behind it. A sheet over a translucent navigation bar should give the region behind it an opaque backing.

Scale blur with surface area: a small popover reads correctly at 8–12px blur, a full-width bar at ~20px, a full-screen overlay at 30–40px. The mechanism is that blur radius is only meaningful relative to the size of the features being blurred, so a fixed radius on a large surface leaves recognisable shapes showing through and reads as a bug. Shadow depth follows the same scaling: bigger surfaces are further forward, so they cast softer, larger, more offset shadows.

**Materialise, don't fade.** A material entering by opacity alone looks like a decal being turned up. Animate blur radius and scale together — blur 0→20px with scale 0.96→1.0 over ~300ms — so the surface reads as condensing into existence at a depth, which is what the material is claiming to be.

## 6. Springs

SwiftUI's modern spring API is `.spring(duration:bounce:)`, plus the named presets:

| Preset | Duration | Bounce | Use |
|---|---|---|---|
| `.smooth` | 0.5s | 0 | default; no overshoot |
| `.snappy` | 0.5s | 0.15 | responsive UI with a touch of life |
| `.bouncy` | 0.5s | 0.3 | playful, momentum-carrying moves |
| `.interactiveSpring` | — | low | values tracking a live gesture |

A navigation push runs at roughly **0.35s**. Sheets and drawers sit near 0.3–0.4s with a small bounce.

Parameterise springs as **damping ratio plus response**, not as mass, stiffness and damping coefficient. The mechanism is that the physical triple is coupled: raising stiffness shortens the response *and* reduces the effective damping ratio, so a "make it faster" edit silently adds overshoot and you chase the two values against each other. Damping ratio and response are independent and each maps to something you can perceive — how much it overshoots, and how long it takes. `bounce` in the modern API is `1 − dampingRatio`, so `bounce: 0` is a **damping ratio of 1.0, critically damped, no overshoot**, and that is the correct default for the overwhelming majority of interface motion.

Use `.interactiveSpring` (or an explicit low-response spring) for values the user is currently dragging, because a slow spring between the finger position and the object position reads as lag.

## 7. Navigation

The standard navigation bar is **44pt** tall. A large title expands the bar to roughly **96pt** and collapses to the standard height as the user scrolls, with the title crossfading into the compact position. The tab bar is **49pt** plus the **34pt** bottom inset, so **83pt** total on modern devices — this is why a tab bar hard-coded at 49pt leaves the home indicator sitting on the labels.

Tab bars carry **2 to 5 tabs**. Fewer than 2 is not a tab bar; more than 5 forces a "More" list, which buries destinations behind an extra tap and destroys the flat, always-visible property that made tabs worth using.

The back button is **labelled with the previous screen's title**, not with the word "Back". The label is a memory aid for where you will land, which matters most in deep hierarchies where the user has stopped tracking depth. Truncate to a chevron only when the title genuinely does not fit.

**The interactive pop gesture from the left screen edge must keep working.** It is the only reliable back affordance on a device with no hardware back button, and users on large phones rely on it because the top-left button is out of thumb reach. Breaking it — by installing a custom `leftBarButtonItem` without reassigning `interactivePopGestureRecognizer.delegate`, or by placing a horizontally-scrolling view against the left edge that swallows the pan — strands the user on a screen with an unreachable exit. If a custom edge gesture is genuinely required, it must begin outside the leading 20pt so the system recogniser gets first refusal.

## 8. Sheets

```swift
.sheet(isPresented: $showing) {
    DetailView()
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(24)
        .presentationBackgroundInteraction(.enabled(upThrough: .medium))
}
```

Detents let one presentation serve two jobs: a medium sheet that can be promoted to full height without a separate screen. `.presentationDragIndicator(.visible)` earns its space when a sheet is resizable, because a resize affordance the user cannot see is one they will not use — omit it on a fixed-height sheet where it promises a gesture that does nothing.

`.presentationBackgroundInteraction(.enabled(upThrough: .medium))` keeps the content behind live while the sheet is small, which is the correct behaviour for a map-and-list or player-and-library pairing. Without it the background is inert and the sheet reads as a modal even when it only covers half the screen.

The **stacked-sheet convention** scales the parent card down slightly (about 0.92) and dims it, and pulls its top corners in from the screen edge. That transformation is doing depth signalling: the parent visibly recedes along z, so the new sheet is understood as *in front of* rather than *instead of*, and the user knows there is a layer to return to.

## 9. Semantic colour

Use `UIColor.label`, `.secondaryLabel`, `.tertiaryLabel`, `.quaternaryLabel`, `.systemBackground`, `.secondarySystemBackground`, `.tertiarySystemBackground`, `.systemGroupedBackground`, `.separator`, `.opaqueSeparator` and `.tintColor` — or their SwiftUI equivalents `.primary`, `.secondary`, `Color(.systemBackground)` and so on.

The mechanism for preferring semantic over literal is that the system already knows the answers to questions you would otherwise have to enumerate. Each semantic colour resolves differently for light and dark appearance, for Increase Contrast, and for elevated versus base contexts, and it does so consistently with every other application on the device. A literal `#8E8E93` matches `secondaryLabel` in light mode, is illegible under Increase Contrast, and is simply wrong in dark mode — three bugs from one convenient hex value.

Dark mode on OLED uses a **true black base** (`.systemBackground` resolves to #000000), because unlit OLED pixels draw no power and produce genuinely black rather than dark grey. Layered surfaces use the **elevated** variants, which lighten as they rise, since the light-from-above shading model that darkens surfaces in light mode inverts when the base is black — you cannot signal elevation by going darker than nothing.

The two-tier background system matters: **grouped backgrounds invert their relationship with the surface**. In light mode `systemGroupedBackground` is a light grey with white cells sitting on it; in dark mode the grouping is darker and the cells are lighter. Hard-coding "grey page, white card" produces a black card on a black page in dark mode.

There is a separate family for filled controls — `.systemFill`, `.secondarySystemFill`, `.tertiarySystemFill`, `.quaternarySystemFill` — and it is not interchangeable with the background family. Fills are semi-transparent by design so that a segmented control or a search field picks up whatever surface it lands on, which is why the same control looks correct on a white card and on a grouped background without being told which it is sitting on. Substituting `secondarySystemBackground` for `secondarySystemFill` produces a control that is opaque and therefore visibly wrong on exactly one of the two surfaces.

Tint is the one colour that should be yours. `.tintColor` (SwiftUI `.tint()`) propagates through the hierarchy and marks what is interactive, which means it must not also be used decoratively — if your brand colour fills a header background *and* marks tappable text, the interactive signal has been spent and users start tapping headers.

## 10. Accessibility signals

Read these at render time and observe their change notifications, since users toggle them from Control Centre mid-session:

- `UIAccessibility.isReduceMotionEnabled` — plus `UIAccessibility.prefersCrossFadeTransitions`, which asks specifically for cross-fades in place of sliding navigation.
- `UIAccessibility.isReduceTransparencyEnabled` — replace materials with opaque fills. The mechanism is legibility: translucency puts arbitrary content behind text, and users with low vision cannot rely on the contrast surviving.
- `UIAccessibility.isDarkerSystemColorsEnabled` — the Increase Contrast setting; semantic colours handle it, literals do not.

Annotate with `.accessibilityLabel` (what it is), `.accessibilityHint` (what happens if you activate it), `.accessibilityValue` (its current state) and `.accessibilityTraits` (`.isButton`, `.isHeader`, `.isSelected`). Group compound cells with `.accessibilityElement(children: .combine)` so VoiceOver reads one coherent item instead of five fragments. Mark headings with the `.isHeader` trait — that is what populates the **VoiceOver rotor**, and without it a rotor set to Headings finds nothing and the user must swipe through every element linearly.

Focus order follows the layout tree, so a visually reordered stack reads out in the wrong order unless corrected with `.accessibilitySortPriority`.

**Reduced motion means gentler and fewer, not zero.** Zero transitions remove the state-change cue entirely, and a screen that swaps contents instantly is harder to follow, not easier. Replace slides and springs with a **~200ms cross-fade**, drop parallax, overshoot and looping motion, and keep opacity and colour changes that carry meaning — a row highlighting on selection is information, not decoration.

## 11. Haptics

Three generators cover almost everything:

- `UIImpactFeedbackGenerator(style:)` — `.light`, `.medium`, `.heavy`, `.soft`, `.rigid`. Physical collisions: a card snapping into place, a toggle hitting its stop. `.soft` and `.rigid` vary perceived material hardness at similar amplitude.
- `UINotificationFeedbackGenerator` — `.success`, `.warning`, `.error`. Outcomes of operations the user waited for.
- `UISelectionFeedbackGenerator` — the fine tick as a value crosses a discrete step in a picker or slider.

Call `prepare()` when the trigger becomes likely, not when it fires. The Taptic Engine takes a few tens of milliseconds to spin into its ready state, and a cold trigger arrives late enough to break the causal binding between action and sensation, which is the entire point of the haptic. Prepared generators idle down after a short window, so prepare on gesture-begin, not on view-load.

In SwiftUI, `.sensoryFeedback(.impact(weight: .light), trigger: selection)` fires on value change and handles the generator lifecycle. For custom patterns — a multi-transient sequence, or a continuous vibration whose intensity tracks a drag — use Core Haptics with a `CHHapticEngine`, either constructed programmatically or loaded from an AHAP file.

The failure to watch for is the haptic on a state the user did not cause. A background sync completing, a push arriving, a poll returning — these fire a `.success` notification into the user's hand for something they were not doing, and the sensation is indistinguishable from the one that means "your action worked". Haptics are a response channel, so anything that is not a response does not belong in it.

The three rules are the same as on Android; only the generators differ. **Causality**: the haptic must coincide with a visible event, within about 50ms, or it reads as an unrelated buzz. **Harmony**: intensity must match the visual weight of what happened — a `.heavy` impact for a checkbox is a lie about significance. **Utility**: the haptic must tell the user something they could not already tell, which is why a haptic on every button press is noise while a haptic on a snap-to-grid is information.

## 12. Adaptive layout

Size classes are the adaptation axis: **compact** or **regular**, independently for horizontal and vertical. Read them with `@Environment(\.horizontalSizeClass)` or `traitCollection.horizontalSizeClass`.

Key off the size class, never the device name or the raw screen width. The mechanism is that the size class describes **the space your view actually has**, which on iPad is decided by the user, not by you: Slide Over gives you a compact-width window on a regular-width device, a 50/50 Split View gives two compact halves on a large iPad, and Stage Manager lets the user resize your window to arbitrary dimensions at runtime. Code that branches on `UIDevice.current.userInterfaceIdiom == .pad` renders a three-column layout into a 320pt Slide Over panel and will do so on a device that has not shipped yet.

Compact width means one column and a navigation stack; regular width means `NavigationSplitView` and side-by-side content. Compact *height* — a phone in landscape — is a separate signal, and it is the one that should collapse a large title and shrink vertical padding, since the constraint there is height, not width.

## 13. Scroll physics

`UIScrollView.DecelerationRate.normal` is **0.998** and `.fast` is **0.99**. These are per-millisecond decay factors: velocity is multiplied by `rate` each millisecond, so the normal rate retains 99.8% of velocity per millisecond and coasts a long way, while the fast rate sheds energy roughly five times as quickly and stops promptly. Paging and short carousels use `.fast`; long content lists use `.normal`, because a list you scroll through wants to reward a hard flick with distance.

This is the same constant that drives the momentum projection function in `motion-physics.md`. That shared origin is what makes scroll deceleration, sheet detent snapping, and carousel paging feel like one physical system rather than three separately-tuned effects — they are all answering "where would this have stopped?" with the same decay model.

`.scrollTargetBehavior(.viewAligned)` with `.scrollTargetLayout()` implements carousel snapping against the system's own projection, so a flick lands where the platform's physics say it should. A hand-rolled carousel that snaps to the nearest item from the release position will disagree with every scroll view around it, and users feel the inconsistency long before they can name it.

`.scrollPosition`, `.scrollBounceBehavior(.basedOnSize)` and `.scrollDismissesKeyboard(.interactively)` are the remaining pieces worth knowing. The last one matters most: interactive keyboard dismissal ties the keyboard's position to the drag so the user can see what is behind it while deciding, rather than committing to a dismissal before knowing whether they need it.

## 14. States and system integration

`.redacted(reason: .placeholder)` renders your real view hierarchy with content replaced by shaped blocks, so the skeleton has the exact geometry of the loaded state and nothing shifts on arrival. A hand-built skeleton drifts from the real layout the moment either changes.

`ContentUnavailableView` is the standard empty and no-results state, including `ContentUnavailableView.search`. `.refreshable { }` installs pull-to-refresh with the system's rubber-banding and spinner. `.searchable(text:)` places the search field in the correct position for the navigation style and handles the scoping bar. `.swipeActions(edge:)` gives row-level destructive and secondary actions, and `.contextMenu(menuItems:preview:)` gives a long-press menu with a custom preview — the preview matters because it lets the user confirm which item they are acting on before committing.

**The launch screen must match the first real frame.** A launch storyboard showing a centred logo, followed by a first frame showing a navigation bar and a list, reads as two separate loads and makes the app feel slower than its actual start time. The launch screen exists to fill the window with the app's own chrome before the code runs, so the correct content is the static shell — bar, background, tab bar — with no text and no logo.

Destructive and irreversible actions belong in `.confirmationDialog` or an `.alert` with a `.destructive` role, and the confirm button must name the action — "Delete Draft", not "OK". The mechanism is that a dialog is often read in a glance in which only the buttons register, so a button labelled with the verb lets the user verify their intent from the button alone, while "OK" requires them to have read and retained the body text.

SF Symbols must be weight- and scale-matched to adjacent text. A symbol at default weight beside `.headline` text reads visibly thinner, because the symbol's stroke weight and the font's stroke weight are drawn from the same design space and mismatching them is as visible as mixing two font weights in one word. Use `.imageScale(.medium)` and `.fontWeight(.semibold)` on the image to align them, and `symbolRenderingMode(.hierarchical)` or `.palette` when a symbol needs internal tonal structure rather than a flat fill.

## Pass conditions

- No device-generation-specific status bar height (20, 44, 47, 54, 59) appears as a literal in layout code.
- No literal 34 appears as a bottom inset; the value comes from `safeAreaInsets` or `env(safe-area-inset-bottom)`.
- Every scroll view containing full-bleed content extends under chrome, with insets applied as content padding rather than as a frame inset.
- Every interactive control has a hit rect of at least 44×44pt, and SwiftUI controls whose padding must be tappable declare `.contentShape`.
- Adjacent hit rects are separated by at least 8pt.
- All text uses a system text style, `UIFontMetrics`, or `@ScaledMetric`; no fixed `.system(size:)` without a metrics wrapper.
- The primary screens render without clipping or truncation at accessibility size AX5.
- Horizontal label/value pairs switch to vertical stacks when `dynamicTypeSize.isAccessibilitySize` is true.
- Every rounded surface uses `style: .continuous` or `cornerCurve = .continuous`.
- Every nested rounded rectangle satisfies `childRadius == parentRadius − padding`.
- No translucent material is layered directly over another translucent material.
- Web material translations include both `saturate(180%)` and a light top border.
- All spring animations are specified with duration and bounce (or damping ratio and response), not mass/stiffness/damping.
- Tab bars contain 2–5 tabs and reserve 83pt of total height on inset devices.
- Back buttons carry the previous screen's title.
- `interactivePopGestureRecognizer` remains enabled on every pushed screen, and no custom gesture begins within the leading 20pt.
- Colour references resolve through semantic system colours; no literal hex is used for text, background, or separator colours.
- Elevated surfaces in dark mode use elevated system background variants rather than a fixed lightened hex.
- `isReduceMotionEnabled`, `isReduceTransparencyEnabled` and `isDarkerSystemColorsEnabled` are each read and acted on.
- Under Reduce Motion, transitions become ~200ms cross-fades rather than being removed entirely.
- Every non-text interactive element has an `accessibilityLabel`; headings carry the `.isHeader` trait.
- Every haptic generator has `prepare()` called before its likely trigger.
- No layout branches on `userInterfaceIdiom` or on a hard-coded screen width; all adaptation keys off size class.
- The launch screen contains no logo or text and matches the first rendered frame's chrome.
- SF Symbols adjacent to text declare a matching weight and `imageScale`.
- Horizontal padding on full-bleed content adds the leading/trailing safe-area insets rather than using a fixed value.
- `.ignoresSafeArea` calls name their region; no bare `.ignoresSafeArea()` appears on a view containing text input.
- Web bottom bars use `max(<fallback>, env(safe-area-inset-bottom))` rather than a bare `env()`.
- `.minimumScaleFactor` and single-line truncation do not appear on body or heading text.
- Touch targets and hairline separators remain at fixed point sizes while their contents scale.
- Filled controls use the `systemFill` family, not the `systemBackground` family.
- The tint colour is used only for interactive elements and never as a decorative background.
- Carousels and paged content use `.scrollTargetBehavior` rather than a hand-rolled nearest-item snap.
- No haptic fires from an event the user did not initiate.
- Destructive confirmations label their confirm button with the verb, not "OK".
