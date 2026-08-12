# Navigation, sheets, accessibility signals, haptics, and system-provided states

## 1. Navigation

The standard navigation bar is **44pt** tall. A large title expands the bar to roughly **96pt**
and collapses to the standard height as the user scrolls, with the title crossfading into the
compact position. The tab bar is **49pt** plus the **34pt** bottom inset, so **83pt** total on
modern devices — this is why a tab bar hard-coded at 49pt leaves the home indicator sitting on the
labels.

Tab bars carry **2 to 5 tabs**. Fewer than 2 is not a tab bar; more than 5 forces a "More" list,
which buries destinations behind an extra tap and destroys the flat, always-visible property that
made tabs worth using.

The back button is **labelled with the previous screen's title**, not with the word "Back". The
label is a memory aid for where you will land, which matters most in deep hierarchies where the
user has stopped tracking depth. Truncate to a chevron only when the title genuinely does not fit.

**The interactive pop gesture from the left screen edge must keep working.** It is the only
reliable back affordance on a device with no hardware back button, and users on large phones rely
on it because the top-left button is out of thumb reach. Breaking it — by installing a custom
`leftBarButtonItem` without reassigning `interactivePopGestureRecognizer.delegate`, or by
placing a horizontally-scrolling view against the left edge that swallows the pan — strands the
user on a screen with an unreachable exit. If a custom edge gesture is genuinely required, it must
begin outside the leading 20pt so the system recogniser gets first refusal.

## 2. Sheets

```swift
.sheet(isPresented: $showing) {
    DetailView()
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(24)
        .presentationBackgroundInteraction(.enabled(upThrough: .medium))
}
```

Detents let one presentation serve two jobs: a medium sheet that can be promoted to full height
without a separate screen. `.presentationDragIndicator(.visible)` earns its space when a sheet
is resizable, because a resize affordance the user cannot see is one they will not use — omit it
on a fixed-height sheet where it promises a gesture that does nothing.

`.presentationBackgroundInteraction(.enabled(upThrough: .medium))` keeps the content behind live
while the sheet is small, which is the correct behaviour for a map-and-list or player-and-library
pairing. Without it the background is inert and the sheet reads as a modal even when it only
covers half the screen.

The **stacked-sheet convention** scales the parent card down slightly (about 0.92) and dims it,
and pulls its top corners in from the screen edge. That transformation is doing depth signalling:
the parent visibly recedes along z, so the new sheet is understood as *in front of* rather than
*instead of*, and the user knows there is a layer to return to.

## 3. Accessibility signals

Read these at render time and observe their change notifications, since users toggle them from
Control Centre mid-session:

- `UIAccessibility.isReduceMotionEnabled` — plus `UIAccessibility.prefersCrossFadeTransitions`, which asks specifically for cross-fades in place of sliding navigation.
- `UIAccessibility.isReduceTransparencyEnabled` — replace materials with opaque fills. The mechanism is legibility: translucency puts arbitrary content behind text, and users with low vision cannot rely on the contrast surviving.
- `UIAccessibility.isDarkerSystemColorsEnabled` — the Increase Contrast setting; semantic colours handle it, literals do not.

Annotate with `.accessibilityLabel` (what it is), `.accessibilityHint` (what happens if you
activate it), `.accessibilityValue` (its current state) and `.accessibilityTraits`
(`.isButton`, `.isHeader`, `.isSelected`). Group compound cells with
`.accessibilityElement(children: .combine)` so VoiceOver reads one coherent item instead of five
fragments. Mark headings with the `.isHeader` trait — that is what populates the **VoiceOver
rotor**, and without it a rotor set to Headings finds nothing and the user must swipe through
every element linearly.

Focus order follows the layout tree, so a visually reordered stack reads out in the wrong order
unless corrected with `.accessibilitySortPriority`.

**Reduced motion means gentler and fewer, not zero.** Zero transitions remove the state-change cue
entirely, and a screen that swaps contents instantly is harder to follow, not easier. Replace
slides and springs with a **~200ms cross-fade**, drop parallax, overshoot and looping motion, and
keep opacity and colour changes that carry meaning — a row highlighting on selection is
information, not decoration.

## 4. Haptics

Three generators cover almost everything:

- `UIImpactFeedbackGenerator(style:)` — `.light`, `.medium`, `.heavy`, `.soft`, `.rigid`. Physical collisions: a card snapping into place, a toggle hitting its stop. `.soft` and `.rigid` vary perceived material hardness at similar amplitude.
- `UINotificationFeedbackGenerator` — `.success`, `.warning`, `.error`. Outcomes of operations the user waited for.
- `UISelectionFeedbackGenerator` — the fine tick as a value crosses a discrete step in a picker or slider.

Call `prepare()` when the trigger becomes likely, not when it fires. The Taptic Engine takes a
few tens of milliseconds to spin into its ready state, and a cold trigger arrives late enough to
break the causal binding between action and sensation, which is the entire point of the haptic.
Prepared generators idle down after a short window, so prepare on gesture-begin, not on view-load.

In SwiftUI, `.sensoryFeedback(.impact(weight: .light), trigger: selection)` fires on value change
and handles the generator lifecycle. For custom patterns — a multi-transient sequence, or a
continuous vibration whose intensity tracks a drag — use Core Haptics with a `CHHapticEngine`,
either constructed programmatically or loaded from an AHAP file.

The failure to watch for is the haptic on a state the user did not cause. A background sync
completing, a push arriving, a poll returning — these fire a `.success` notification into the
user's hand for something they were not doing, and the sensation is indistinguishable from the one
that means "your action worked". Haptics are a response channel, so anything that is not a
response does not belong in it.

The three rules are the same as on Android; only the generators differ. **Causality**: the haptic
must coincide with a visible event, within about 50ms, or it reads as an unrelated buzz.
**Harmony**: intensity must match the visual weight of what happened — a `.heavy` impact for a
checkbox is a lie about significance. **Utility**: the haptic must tell the user something they
could not already tell, which is why a haptic on every button press is noise while a haptic on a
snap-to-grid is information.

## 5. States and system integration

`.redacted(reason: .placeholder)` renders your real view hierarchy with content replaced by
shaped blocks, so the skeleton has the exact geometry of the loaded state and nothing shifts on
arrival. A hand-built skeleton drifts from the real layout the moment either changes.

`ContentUnavailableView` is the standard empty and no-results state, including
`ContentUnavailableView.search`. `.refreshable { }` installs pull-to-refresh with the system's
rubber-banding and spinner. `.searchable(text:)` places the search field in the correct position
for the navigation style and handles the scoping bar. `.swipeActions(edge:)` gives row-level
destructive and secondary actions, and `.contextMenu(menuItems:preview:)` gives a long-press menu
with a custom preview — the preview matters because it lets the user confirm which item they are
acting on before committing.

**The launch screen must match the first real frame.** A launch storyboard showing a centred logo,
followed by a first frame showing a navigation bar and a list, reads as two separate loads and
makes the app feel slower than its actual start time. The launch screen exists to fill the window
with the app's own chrome before the code runs, so the correct content is the static shell — bar,
background, tab bar — with no text and no logo.

Destructive and irreversible actions belong in `.confirmationDialog` or an `.alert` with a
`.destructive` role, and the confirm button must name the action — "Delete Draft", not "OK". The
mechanism is that a dialog is often read in a glance in which only the buttons register, so a
button labelled with the verb lets the user verify their intent from the button alone, while "OK"
requires them to have read and retained the body text.

SF Symbols must be weight- and scale-matched to adjacent text. A symbol at default weight beside
`.headline` text reads visibly thinner, because the symbol's stroke weight and the font's stroke
weight are drawn from the same design space and mismatching them is as visible as mixing two font
weights in one word. Use `.imageScale(.medium)` and `.fontWeight(.semibold)` on the image to
align them, and `symbolRenderingMode(.hierarchical)` or `.palette` when a symbol needs internal
tonal structure rather than a flat fill.

## Pass conditions

- Tab bars contain 2–5 tabs and reserve 83pt of total height on inset devices.
- Back buttons carry the previous screen's title.
- `interactivePopGestureRecognizer` remains enabled on every pushed screen, and no custom gesture begins within the leading 20pt.
- `isReduceMotionEnabled`, `isReduceTransparencyEnabled` and `isDarkerSystemColorsEnabled` are each read and acted on.
- Under Reduce Motion, transitions become ~200ms cross-fades rather than being removed entirely.
- Every non-text interactive element has an `accessibilityLabel`; headings carry the `.isHeader` trait.
- Every haptic generator has `prepare()` called before its likely trigger.
- No haptic fires from an event the user did not initiate.
- The launch screen contains no logo or text and matches the first rendered frame's chrome.
- SF Symbols adjacent to text declare a matching weight and `imageScale`.
- Destructive confirmations label their confirm button with the verb, not "OK".
