# Safe areas, touch targets, Dynamic Type, and size-class adaptation

The correct posture throughout is to **express intent, not measurement**. `.font(.body)` is
intent; `17pt` is measurement. `UIColor.label` is intent; `#000000` is measurement.
Measurements are correct until the user turns on Larger Text or Increase Contrast, and then they
are wrong in ways you will never see because you did not turn those on.

## 1. Safe areas and the physical screen

The safe area is the region of the window not occluded by hardware or by system chrome that
draws over your content: the sensor housing, the status bar, the home indicator, and on iPad the
Stage Manager window furniture. `UIView.safeAreaInsets` reports it in points; SwiftUI exposes
it through the layout system automatically and through `GeometryProxy.safeAreaInsets` when you
need the numbers.

The **home-indicator bottom inset is 34pt** on every device that has one, and 0pt on devices
with a physical home button. The **status-bar inset varies by generation**: 20pt on pre-notch
devices, 44pt on the notched X-class generation, 47pt on the 12/13/14 class, 54pt on the Dynamic
Island Pro devices, and 59pt on the 16 Pro class. That list is the reason you must never write it
down. Every value in it was introduced by a device that did not exist when the previous value was
considered complete, and the next one will do the same.

The mechanism that makes safe areas feel right is a split: **the scroll view extends under the
chrome, while the content's padding respects the inset**. A scroll view clipped at the safe-area
boundary produces a hard cut where content vanishes into a gap, and the translucent navigation
bar has nothing to blur — it renders as flat grey. Let the scroll view fill the window and push
the insets into content padding, and material chrome samples live content underneath, which is
what produces the correct frosted scroll behaviour.

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

`.safeAreaInset(edge:)` is the correct tool for persistent overlay chrome because it both draws
the bar and enlarges the inset that descendant scroll views respect, so the last row can still
scroll clear of it. An overlay placed with `.overlay(alignment: .bottom)` looks identical and
permanently hides the final row.

`.ignoresSafeArea(.container, edges:)` and `.ignoresSafeArea(.keyboard)` are different
requests and confusing them is a common bug. The container region is the hardware and chrome
inset; the keyboard region is the software keyboard's footprint. A background gradient wants
`.container` so it bleeds to the physical edge; a form wants to keep respecting `.keyboard`
so its fields lift clear of the input. Writing `.ignoresSafeArea()` with no arguments ignores
both, which is why the field you are typing into ends up underneath the keyboard.

On the web, the equivalents are `env(safe-area-inset-bottom)` and friends, which return 0
unless `viewport-fit=cover` is set in the viewport meta tag. **A web app that never sets
`viewport-fit=cover` cannot have a safe-area bug and also cannot draw edge to edge** — pick
deliberately. Prefer `max(16px, env(safe-area-inset-bottom))` over the bare `env()` value,
since the inset is 0 on devices without a home indicator and a bare `env()` leaves a bottom bar
flush against the glass there.

The horizontal insets are non-zero only in landscape on notched devices, where they are **44pt**
on the sensor-housing side. Content laid out with a fixed 16pt horizontal padding disappears
under the housing in landscape. Add the leading and trailing safe-area insets to your padding
rather than replacing it.

## 2. Touch targets

The HIG minimum is **44×44pt**, which is roughly the contact patch of an adult fingertip at a
comfortable grip. Below that the error rate climbs sharply, and the errors are not evenly
distributed — they cluster at screen edges and in the reach arc of the thumb, which is precisely
where navigation controls live.

The visual element may be smaller than 44pt. A 16pt close glyph is often the right *drawing*; it
is never the right *hit rect*. Expand the target, not the artwork.

```swift
Image(systemName: "xmark")
    .imageScale(.medium)
    .frame(width: 44, height: 44)   // hit area
    .contentShape(Rectangle())      // makes the whole frame tappable, not just the glyph
```

`.contentShape(Rectangle())` is load-bearing: without it, hit-testing follows the rendered
glyph's alpha and the padding is inert. On the web the equivalent is a transparent `::after`
pseudo-element with negative insets, which expands the target without disturbing layout the way
padding would.

Adjacent targets need **at least 8pt of clear space** between their hit rects. Two 44pt buttons
touching edge to edge satisfy the size rule and still produce mis-taps, because the finger's
centroid lands near a boundary and small tremors cross it.

The rule tightens near destructive actions. A Delete sitting 8pt from a Save satisfies the letter
of the spacing rule and still produces data loss, because the cost of the two errors is wildly
asymmetric while their probability is identical. Separate destructive actions by more distance
than the layout needs, or move them behind a different interaction entirely — a swipe action or a
context menu — so that no single mis-tap can reach them.

On macOS and other pointer-driven contexts the minimum relaxes, because a mouse reports an exact
pixel and a fingertip reports a blob. Detect the input mechanism rather than the platform: an
iPad with a trackpad attached is a pointer device, and a Mac with a touch bar or a touchscreen
web view is not.

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

Note that **Headline and Body are the same 17pt and differ only in weight**. That is the platform
telling you something: hierarchy at small sizes is carried by weight and colour, not by size. If
you invent an 18pt "subheading" to sit between them you have added a step the system will not
scale coherently and that no user perceives as a level.

Use `.font(.body)` in SwiftUI, `UIFont.preferredFont(forTextStyle:)` in UIKit, and
`UIFontMetrics(forTextStyle:).scaledFont(for:)` when you must scale a custom face.
`@ScaledMetric` scales arbitrary numbers along the same curve:

```swift
@ScaledMetric(relativeTo: .body) private var rowSpacing: CGFloat = 12
@ScaledMetric(relativeTo: .body) private var iconSize: CGFloat = 20
```

The content must **survive to AX5**, the largest accessibility size, where Body renders around
53pt — roughly 3.1× default. The failure mode is not the text; the text scales. The failure is
**spacing expressed in fixed points while text scales**: a 44pt-tall row with `.font(.body)`
inside is fine at 17pt and clips its own descenders at 53pt, and a two-line label in a fixed 60pt
card loses its second line entirely. Express vertical rhythm through `@ScaledMetric` or through
padding on intrinsically-sized containers, and let the row height be whatever the text needs.

At accessibility sizes, **horizontal pairs must become vertical stacks**. A label-and-value row
that fits side by side at 17pt has no room at 53pt. Gate on the size category rather than on
width:

```swift
@Environment(\.dynamicTypeSize) private var typeSize
// ...
if typeSize.isAccessibilitySize { VStack(alignment: .leading) { … } }
else { HStack { … } }
```

Two escape hatches exist and both are usually wrong. `.minimumScaleFactor(0.8)` shrinks text to
fit, which reverses the user's explicit request for larger type — they turned the setting on
because they could not read 17pt, and you have handed them 14pt. `.lineLimit(1)` truncates,
which loses content. Reserve both for genuinely fixed-width contexts such as a numeric badge, and
prefer `.dynamicTypeSize(...DynamicTypeSize.accessibility1)` to cap the scale on a specific
dense subview when the alternative is an unusable layout.

The exception to scaling everything is fixed physical geometry. A 44pt touch target is 44pt
because that is the size of a finger, and fingers do not scale with the type setting, so **hit
rects stay fixed while the label inside them grows** — the row gets taller, not the minimum.
Similarly, hairline separators stay at 1px regardless of type size; a separator that scaled to
3px would read as a border.

## 4. Adaptive layout

Size classes are the adaptation axis: **compact** or **regular**, independently for horizontal
and vertical. Read them with `@Environment(\.horizontalSizeClass)` or
`traitCollection.horizontalSizeClass`.

Key off the size class, never the device name or the raw screen width. The mechanism is that the
size class describes **the space your view actually has**, which on iPad is decided by the user,
not by you: Slide Over gives you a compact-width window on a regular-width device, a 50/50 Split
View gives two compact halves on a large iPad, and Stage Manager lets the user resize your window
to arbitrary dimensions at runtime. Code that branches on
`UIDevice.current.userInterfaceIdiom == .pad` renders a three-column layout into a 320pt Slide
Over panel and will do so on a device that has not shipped yet.

Compact width means one column and a navigation stack; regular width means `NavigationSplitView`
and side-by-side content. Compact *height* — a phone in landscape — is a separate signal, and it
is the one that should collapse a large title and shrink vertical padding, since the constraint
there is height, not width.

## Pass conditions

- No device-generation-specific status bar height (20, 44, 47, 54, 59) appears as a literal in layout code.
- No literal 34 appears as a bottom inset; the value comes from `safeAreaInsets` or `env(safe-area-inset-bottom)`.
- Every scroll view containing full-bleed content extends under chrome, with insets applied as content padding rather than as a frame inset.
- Horizontal padding on full-bleed content adds the leading/trailing safe-area insets rather than using a fixed value.
- `.ignoresSafeArea` calls name their region; no bare `.ignoresSafeArea()` appears on a view containing text input.
- Web bottom bars use `max(<fallback>, env(safe-area-inset-bottom))` rather than a bare `env()`.
- Every interactive control has a hit rect of at least 44×44pt, and SwiftUI controls whose padding must be tappable declare `.contentShape`.
- Adjacent hit rects are separated by at least 8pt.
- All text uses a system text style, `UIFontMetrics`, or `@ScaledMetric`; no fixed `.system(size:)` without a metrics wrapper.
- The primary screens render without clipping or truncation at accessibility size AX5.
- Horizontal label/value pairs switch to vertical stacks when `dynamicTypeSize.isAccessibilitySize` is true.
- `.minimumScaleFactor` and single-line truncation do not appear on body or heading text.
- Touch targets and hairline separators remain at fixed point sizes while their contents scale.
- No layout branches on `userInterfaceIdiom` or on a hard-coded screen width; all adaptation keys off size class.
