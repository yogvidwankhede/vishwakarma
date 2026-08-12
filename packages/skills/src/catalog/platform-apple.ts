// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Apple's platforms re-render your interface at sizes, contrasts, and window dimensions you
 * did not choose, and they do it after you ship.
 *
 * The characteristic Apple defect is therefore not ugliness. It is a literal that was correct
 * on the device and settings screen it was written against: a 44pt status-bar constant that a
 * later generation moved to 47, then 54, then 59; a fixed 60pt card that loses its second line
 * when the user turns on Larger Text; a hex grey that matches secondaryLabel in light mode and
 * is illegible under Increase Contrast; a three-column layout keyed on userInterfaceIdiom that
 * renders into a 320pt Slide Over panel.
 *
 * The posture that avoids all of them is one sentence long: express intent, not measurement.
 * `.font(.body)` is intent and `17pt` is measurement. `UIColor.label` is intent and `#000000`
 * is measurement. Intent survives the settings the user has already changed; measurement is a
 * snapshot of one device with every accessibility switch off, which is the configuration the
 * work was built in and the one it will never be used in.
 *
 * The remaining rules follow from two more mechanisms. The display is a physical object with
 * obstructions in known places, so geometry comes from safe-area insets rather than arithmetic.
 * And the eye is extremely good at detecting discontinuity in curvature and velocity, which is
 * why corners are continuous and motion is spring-driven — both are the platform paying for
 * smoothness in a place where a shortcut is visible without being nameable.
 */
export const platformApple: SkillManifest = {
  vsm: '1.0',
  id: 'platform-apple',
  name: 'Apple Platform',
  description:
    'Use when building or reviewing iOS, iPadOS, or macOS UI in SwiftUI or UIKit — safe areas, Dynamic Type, materials, springs, VoiceOver.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'foundation',
  tags: ['ios', 'swiftui', 'uikit', 'hig', 'macos'],

  activation: {
    intents: [
      'building or reviewing a screen or component in SwiftUI or UIKit',
      'content is colliding with the notch, Dynamic Island, home indicator, or keyboard',
      'text or spacing breaks at larger accessibility type sizes',
      'choosing corner radii, materials, blur, or shadow for an Apple-style surface',
      'tuning a spring, a sheet detent, a scroll deceleration, or a carousel snap',
      'wiring navigation stacks, tab bars, back buttons, or the interactive pop gesture',
      'picking colours for light, dark, elevated, and Increase Contrast appearances',
      'annotating a view for VoiceOver, or adding haptics to a confirmed action',
      'adapting a layout for iPad Split View, Slide Over, Stage Manager, or macOS',
    ],
    globs: [
      '**/*.swift',
      '**/*.m',
      '**/*.mm',
      '**/*.h',
      '**/Info.plist',
      '**/*.xcassets/**',
      '**/*.storyboard',
      '**/*.xib',
    ],
    keywords: [
      'swiftui',
      'uikit',
      'ios',
      'hig',
      'safe area',
      'dynamic type',
      'voiceover',
      'sf symbols',
      'materials',
      'continuous corner',
      'presentationdetents',
      'size class',
      'taptic',
      'pt',
    ],
  },

  content: {
    summary:
      'Use when writing or auditing Apple-platform UI: express intent rather than measurement — system text styles, semantic colours, safe-area insets, size classes and springs — so the interface survives Larger Text, Increase Contrast, and the next device generation.',

    body: `# Platform: Apple

Nearly every rule here follows from three mechanisms: the display is a fixed-density physical
object with obstructions in known places, the eye detects discontinuities in curvature and
velocity, and the system re-renders your interface at sizes and contrasts you did not choose.

The posture is to **express intent, not measurement**. \`.font(.body)\` is intent, \`17pt\` is
measurement; \`UIColor.label\` is intent, \`#000000\` is measurement. Measurements are correct
until the user turns on Larger Text or Increase Contrast, and then they are wrong in ways you
will never see because you did not turn those on.

---

## 1. Safe areas

The home-indicator bottom inset is 34pt; the status-bar inset is 20, 44, 47, 54 or 59pt by
generation. That list is the reason never to write any of it down — each value arrived with a
device that did not exist when the previous list looked complete.

The split that makes safe areas feel right: **the scroll view extends under the chrome while the
content's padding respects the inset**. A scroll view clipped at the boundary leaves a hard cut,
and the translucent bar above it has nothing to blur, so it renders flat grey. Use
\`.safeAreaInset(edge:)\` for persistent overlay chrome — it draws the bar *and* enlarges the
inset descendants respect, where \`.overlay(alignment: .bottom)\` looks identical and permanently
hides the final row. Name the region on every \`.ignoresSafeArea\`: \`.container\` is hardware and
chrome, \`.keyboard\` is the software keyboard, and the bare call ignores both, which is how the
field you are typing into ends up under the keyboard. Landscape horizontal insets are 44pt on
notched devices; add them to your padding rather than replacing it.

## 2. Touch targets

44×44pt minimum, roughly a fingertip's contact patch; below it the error rate climbs and the
errors cluster at screen edges and in the thumb's reach arc, which is where navigation lives.
Expand the target, not the artwork — but in SwiftUI a frame without
\`.contentShape(Rectangle())\` hit-tests against the glyph's alpha, so the padding is inert.
Adjacent hit rects need 8pt of clear space, and destructive actions need more than the layout
requires, since a mis-tap between Delete and Save is as likely as any other and far more costly.
On pointer-driven contexts the minimum relaxes; detect the input mechanism, not the platform.

## 3. Dynamic Type

Headline and Body are both 17pt and differ only in weight: hierarchy at small sizes is carried by
weight and colour, not size, so an invented 18pt step scales incoherently and reads as no level
at all. Use \`.font(.body)\`, \`UIFontMetrics\` for custom faces, and \`@ScaledMetric\` for
arbitrary numbers.

Content must survive to **AX5**, where Body renders around 53pt. The failure is never the text —
text scales. It is spacing frozen in points while text scales: a 44pt row clips its descenders, a
two-line label in a fixed 60pt card loses its second line. Let row height be whatever the text
needs, and at accessibility sizes turn horizontal label-and-value pairs into vertical stacks,
gated on \`dynamicTypeSize.isAccessibilitySize\` rather than on width. \`.minimumScaleFactor\`
reverses the user's explicit request for larger type and \`.lineLimit(1)\` loses content; reserve
both for numeric badges. The exception is fixed physical geometry: hit rects stay 44pt and
hairlines stay 1px, because fingers do not scale with a type setting.

## 4. Corners, materials, springs

Use \`style: .continuous\`. A circular arc holds constant curvature along the arc and zero along
the edge, so curvature jumps at the tangent point; the direction is continuous but the *rate of
turning* is not, and the eye reads a faint kink at all four corners. Nested radii must be
concentric — \`childRadius = parentRadius − padding\` — or the gap visibly thins toward them.

Materials are compositing recipes, not opacity values: a backdrop blur, a saturation boost to
about 180% (blurring averages neighbouring pixels toward the mean and desaturates), a vibrancy
pass, and a 1px light top edge that gives the surface thickness. Never stack two translucent
surfaces — the upper one samples an already-blurred backdrop and contrast collapses twice.

Parameterise springs as **duration and bounce**, never mass, stiffness and damping: the physical
triple is coupled, so raising stiffness to make it faster silently reduces the damping ratio and
adds overshoot. \`bounce: 0\` is critically damped and is the right default; a navigation push is
about 0.35s, and a value tracking a live gesture takes \`.interactiveSpring\`.

## 5. Semantic colour

Use \`.label\`, \`.secondaryLabel\`, \`.systemBackground\`, \`.systemGroupedBackground\`,
\`.separator\` and \`.tintColor\`. Each already resolves for light and dark, for Increase
Contrast, and for elevated versus base contexts. A literal \`#8E8E93\` matches \`secondaryLabel\`
in light mode, is illegible under Increase Contrast, and is wrong in dark mode — three bugs from
one hex value.

Dark mode on OLED uses a true black base, so elevation cannot be signalled by going darker than
nothing; layered surfaces use the *elevated* variants. Grouped backgrounds invert their
relationship with cells between appearances, so "grey page, white card" becomes a black card on a
black page. The semi-transparent \`systemFill\` family is separate from the background family and
is what filled controls use. Tint marks what is interactive; spend it decoratively and users
start tapping headers.

## 6. Navigation and sheets

Navigation bar 44pt, large title ~96pt collapsing on scroll, tab bar 49pt plus the 34pt inset —
83pt total, which is why a bar hard-coded at 49pt puts the home indicator on the labels. Tab bars
carry 2 to 5 tabs; more forces a "More" list and destroys the always-visible property that made
tabs worth using. The back button carries the previous screen's title, as a memory aid for where
it lands.

**The interactive pop gesture must keep working.** It is the only reliable back affordance on a
device with no hardware back button. A custom \`leftBarButtonItem\` without reassigning
\`interactivePopGestureRecognizer.delegate\`, or a horizontal scroll view against the left edge,
strands the user on a screen with no reachable exit; a custom edge gesture must begin outside the
leading 20pt. Sheets take \`.presentationDetents\`, a drag indicator only when resizable, and
\`.presentationBackgroundInteraction\` so a half-height sheet does not read as a modal.

## 7. Accessibility, haptics, and system states

Read \`isReduceMotionEnabled\`, \`isReduceTransparencyEnabled\` and
\`isDarkerSystemColorsEnabled\` at render time and observe their notifications, since users toggle
them mid-session. Reduced motion means gentler and fewer, not zero: replace slides and springs
with a ~200ms cross-fade and keep the colour changes that carry meaning. Annotate with
\`.accessibilityLabel\`, \`.accessibilityHint\`, \`.accessibilityValue\` and traits; \`.isHeader\`
populates the VoiceOver rotor, without which a rotor set to Headings finds nothing.

Call \`prepare()\` on a haptic generator when its trigger becomes likely, not when it fires: the
Taptic Engine takes tens of milliseconds to reach ready, and a cold trigger breaks the causal
binding that is the point. Never fire a haptic for something the user did not cause.

Key adaptation off size class, never \`userInterfaceIdiom\` or raw width: Slide Over gives a
compact-width window on a regular-width device, and Stage Manager lets the user resize at runtime.
Use \`.redacted(reason: .placeholder)\` for skeletons so geometry matches exactly,
\`ContentUnavailableView\` for empty states, and \`.scrollTargetBehavior(.viewAligned)\` for
carousels. The launch screen is the static shell, no logo and no text, and a destructive
confirmation labels its button with the verb, not "OK".`,

    references: [
      {
        id: 'safe-areas-targets-and-dynamic-type',
        title: 'Safe areas, touch targets, Dynamic Type, and size-class adaptation',
        answers:
          'How do I lay out against the notch, Dynamic Island, home indicator and keyboard, size hit rects, and build a layout that still works at the largest accessibility text size and in a Slide Over window?',
        content: `# Safe areas, touch targets, Dynamic Type, and size-class adaptation

The correct posture throughout is to **express intent, not measurement**. \`.font(.body)\` is
intent; \`17pt\` is measurement. \`UIColor.label\` is intent; \`#000000\` is measurement.
Measurements are correct until the user turns on Larger Text or Increase Contrast, and then they
are wrong in ways you will never see because you did not turn those on.

## 1. Safe areas and the physical screen

The safe area is the region of the window not occluded by hardware or by system chrome that
draws over your content: the sensor housing, the status bar, the home indicator, and on iPad the
Stage Manager window furniture. \`UIView.safeAreaInsets\` reports it in points; SwiftUI exposes
it through the layout system automatically and through \`GeometryProxy.safeAreaInsets\` when you
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

\`\`\`swift
ScrollView {
    LazyVStack(spacing: 12) { /* rows */ }
        .padding(.horizontal, 16)
}
.ignoresSafeArea(.container, edges: .bottom)
.safeAreaInset(edge: .bottom) {
    PlayerBar()          // adds to the safe area rather than covering content
}
\`\`\`

\`.safeAreaInset(edge:)\` is the correct tool for persistent overlay chrome because it both draws
the bar and enlarges the inset that descendant scroll views respect, so the last row can still
scroll clear of it. An overlay placed with \`.overlay(alignment: .bottom)\` looks identical and
permanently hides the final row.

\`.ignoresSafeArea(.container, edges:)\` and \`.ignoresSafeArea(.keyboard)\` are different
requests and confusing them is a common bug. The container region is the hardware and chrome
inset; the keyboard region is the software keyboard's footprint. A background gradient wants
\`.container\` so it bleeds to the physical edge; a form wants to keep respecting \`.keyboard\`
so its fields lift clear of the input. Writing \`.ignoresSafeArea()\` with no arguments ignores
both, which is why the field you are typing into ends up underneath the keyboard.

On the web, the equivalents are \`env(safe-area-inset-bottom)\` and friends, which return 0
unless \`viewport-fit=cover\` is set in the viewport meta tag. **A web app that never sets
\`viewport-fit=cover\` cannot have a safe-area bug and also cannot draw edge to edge** — pick
deliberately. Prefer \`max(16px, env(safe-area-inset-bottom))\` over the bare \`env()\` value,
since the inset is 0 on devices without a home indicator and a bare \`env()\` leaves a bottom bar
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

\`\`\`swift
Image(systemName: "xmark")
    .imageScale(.medium)
    .frame(width: 44, height: 44)   // hit area
    .contentShape(Rectangle())      // makes the whole frame tappable, not just the glyph
\`\`\`

\`.contentShape(Rectangle())\` is load-bearing: without it, hit-testing follows the rendered
glyph's alpha and the padding is inert. On the web the equivalent is a transparent \`::after\`
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

Use \`.font(.body)\` in SwiftUI, \`UIFont.preferredFont(forTextStyle:)\` in UIKit, and
\`UIFontMetrics(forTextStyle:).scaledFont(for:)\` when you must scale a custom face.
\`@ScaledMetric\` scales arbitrary numbers along the same curve:

\`\`\`swift
@ScaledMetric(relativeTo: .body) private var rowSpacing: CGFloat = 12
@ScaledMetric(relativeTo: .body) private var iconSize: CGFloat = 20
\`\`\`

The content must **survive to AX5**, the largest accessibility size, where Body renders around
53pt — roughly 3.1× default. The failure mode is not the text; the text scales. The failure is
**spacing expressed in fixed points while text scales**: a 44pt-tall row with \`.font(.body)\`
inside is fine at 17pt and clips its own descenders at 53pt, and a two-line label in a fixed 60pt
card loses its second line entirely. Express vertical rhythm through \`@ScaledMetric\` or through
padding on intrinsically-sized containers, and let the row height be whatever the text needs.

At accessibility sizes, **horizontal pairs must become vertical stacks**. A label-and-value row
that fits side by side at 17pt has no room at 53pt. Gate on the size category rather than on
width:

\`\`\`swift
@Environment(\\.dynamicTypeSize) private var typeSize
// ...
if typeSize.isAccessibilitySize { VStack(alignment: .leading) { … } }
else { HStack { … } }
\`\`\`

Two escape hatches exist and both are usually wrong. \`.minimumScaleFactor(0.8)\` shrinks text to
fit, which reverses the user's explicit request for larger type — they turned the setting on
because they could not read 17pt, and you have handed them 14pt. \`.lineLimit(1)\` truncates,
which loses content. Reserve both for genuinely fixed-width contexts such as a numeric badge, and
prefer \`.dynamicTypeSize(...DynamicTypeSize.accessibility1)\` to cap the scale on a specific
dense subview when the alternative is an unusable layout.

The exception to scaling everything is fixed physical geometry. A 44pt touch target is 44pt
because that is the size of a finger, and fingers do not scale with the type setting, so **hit
rects stay fixed while the label inside them grows** — the row gets taller, not the minimum.
Similarly, hairline separators stay at 1px regardless of type size; a separator that scaled to
3px would read as a border.

## 4. Adaptive layout

Size classes are the adaptation axis: **compact** or **regular**, independently for horizontal
and vertical. Read them with \`@Environment(\\.horizontalSizeClass)\` or
\`traitCollection.horizontalSizeClass\`.

Key off the size class, never the device name or the raw screen width. The mechanism is that the
size class describes **the space your view actually has**, which on iPad is decided by the user,
not by you: Slide Over gives you a compact-width window on a regular-width device, a 50/50 Split
View gives two compact halves on a large iPad, and Stage Manager lets the user resize your window
to arbitrary dimensions at runtime. Code that branches on
\`UIDevice.current.userInterfaceIdiom == .pad\` renders a three-column layout into a 320pt Slide
Over panel and will do so on a device that has not shipped yet.

Compact width means one column and a navigation stack; regular width means \`NavigationSplitView\`
and side-by-side content. Compact *height* — a phone in landscape — is a separate signal, and it
is the one that should collapse a large title and shrink vertical padding, since the constraint
there is height, not width.

## Pass conditions

- No device-generation-specific status bar height (20, 44, 47, 54, 59) appears as a literal in layout code.
- No literal 34 appears as a bottom inset; the value comes from \`safeAreaInsets\` or \`env(safe-area-inset-bottom)\`.
- Every scroll view containing full-bleed content extends under chrome, with insets applied as content padding rather than as a frame inset.
- Horizontal padding on full-bleed content adds the leading/trailing safe-area insets rather than using a fixed value.
- \`.ignoresSafeArea\` calls name their region; no bare \`.ignoresSafeArea()\` appears on a view containing text input.
- Web bottom bars use \`max(<fallback>, env(safe-area-inset-bottom))\` rather than a bare \`env()\`.
- Every interactive control has a hit rect of at least 44×44pt, and SwiftUI controls whose padding must be tappable declare \`.contentShape\`.
- Adjacent hit rects are separated by at least 8pt.
- All text uses a system text style, \`UIFontMetrics\`, or \`@ScaledMetric\`; no fixed \`.system(size:)\` without a metrics wrapper.
- The primary screens render without clipping or truncation at accessibility size AX5.
- Horizontal label/value pairs switch to vertical stacks when \`dynamicTypeSize.isAccessibilitySize\` is true.
- \`.minimumScaleFactor\` and single-line truncation do not appear on body or heading text.
- Touch targets and hairline separators remain at fixed point sizes while their contents scale.
- No layout branches on \`userInterfaceIdiom\` or on a hard-coded screen width; all adaptation keys off size class.`,
      },
      {
        id: 'corners-materials-springs-and-colour',
        title: 'Continuous corners, materials, springs, semantic colour, and scroll physics',
        answers:
          'Why do Apple surfaces use continuous corners and layered materials, how should I parameterise a spring, which semantic colour family applies, and what makes scrolling and snapping feel like one physical system?',
        content: `# Continuous corners, materials, springs, semantic colour, and scroll physics

## 1. Continuous corners

Use \`RoundedRectangle(cornerRadius: 16, style: .continuous)\` in SwiftUI and
\`layer.cornerCurve = .continuous\` in UIKit. The default \`.circular\` style is wrong for
surfaces in an Apple interface.

The mechanism is curvature continuity. A circular-arc corner has constant curvature along the arc
and zero curvature along the straight edge, so at the tangent point curvature jumps
discontinuously from 1/r to 0. The tangent direction is continuous, so the outline is smooth in
the naive sense, but the *rate of turning* is not, and the visual system is sensitive to
second-order discontinuity in a contour. The result reads as a faint kink at the four points
where each corner meets its edges — most visible at large radii and on light-on-dark surfaces. A
continuous corner ramps curvature in and out, so there is no point at which the turn rate steps,
and the shape reads as one object rather than a rectangle with arcs glued on.

**Nested radii must be concentric**: \`childRadius = parentRadius − padding\`. A 20pt card with
12pt padding wants a 8pt inner radius. Give the child the parent's 20pt and the gap between the
two curves is widest at the corner diagonal and narrowest at the edge midpoints, so the padding
visibly thins toward the corners; give the child 0pt and the square inner corner sits inside a
round outer one, which reads as two unrelated objects. If your inner radius would go negative,
your padding is larger than your radius and the child should simply be square.

CSS approximates this with \`border-radius\` plus a corner-smoothing implementation; where none is
available, prefer slightly larger radii on the parent than you would use for a squircle, since a
circular arc reads tighter than a continuous corner of nominally the same radius.

## 2. Materials and depth

\`.regularMaterial\`, \`.thinMaterial\`, \`.ultraThinMaterial\`, \`.thickMaterial\` and
\`.ultraThickMaterial\` are not translucency percentages — they are compositing recipes combining
a backdrop blur, a saturation boost, a vibrancy pass on foreground content, and a tint that flips
with the colour scheme. Foreground text placed on a material should use
\`.foregroundStyle(.secondary)\` and friends so it picks up the vibrancy blend rather than sitting
on top as flat ink.

The web translation of \`.regularMaterial\`:

\`\`\`css
.material-regular {
  backdrop-filter: blur(20px) saturate(180%);
  background: rgba(255, 255, 255, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.4);
}
\`\`\`

The saturation boost is not decoration. Blurring desaturates, because averaging neighbouring
pixels pulls them toward the local mean, so a plain blur produces a grey wash that reads as dirty
glass. Boosting saturation to roughly 180% restores the chroma the blur removed. The 1px light top
edge is a **light catch** — it simulates the bright refraction at the top bevel of a physical pane
and is what makes the surface read as having thickness rather than being a foggy hole.

**Do not stack two translucent surfaces.** The upper surface's blur samples a backdrop that has
already been blurred and desaturated, so contrast collapses toward the local mean twice over and
the result is muddy grey with no legible content behind it. A sheet over a translucent navigation
bar should give the region behind it an opaque backing.

Scale blur with surface area: a small popover reads correctly at 8–12px blur, a full-width bar at
~20px, a full-screen overlay at 30–40px. The mechanism is that blur radius is only meaningful
relative to the size of the features being blurred, so a fixed radius on a large surface leaves
recognisable shapes showing through and reads as a bug. Shadow depth follows the same scaling:
bigger surfaces are further forward, so they cast softer, larger, more offset shadows.

**Materialise, don't fade.** A material entering by opacity alone looks like a decal being turned
up. Animate blur radius and scale together — blur 0→20px with scale 0.96→1.0 over ~300ms — so the
surface reads as condensing into existence at a depth, which is what the material is claiming to
be.

## 3. Springs

SwiftUI's modern spring API is \`.spring(duration:bounce:)\`, plus the named presets:

| Preset | Duration | Bounce | Use |
|---|---|---|---|
| \`.smooth\` | 0.5s | 0 | default; no overshoot |
| \`.snappy\` | 0.5s | 0.15 | responsive UI with a touch of life |
| \`.bouncy\` | 0.5s | 0.3 | playful, momentum-carrying moves |
| \`.interactiveSpring\` | — | low | values tracking a live gesture |

A navigation push runs at roughly **0.35s**. Sheets and drawers sit near 0.3–0.4s with a small
bounce.

Parameterise springs as **damping ratio plus response**, not as mass, stiffness and damping
coefficient. The mechanism is that the physical triple is coupled: raising stiffness shortens the
response *and* reduces the effective damping ratio, so a "make it faster" edit silently adds
overshoot and you chase the two values against each other. Damping ratio and response are
independent and each maps to something you can perceive — how much it overshoots, and how long it
takes. \`bounce\` in the modern API is \`1 − dampingRatio\`, so \`bounce: 0\` is a **damping ratio
of 1.0, critically damped, no overshoot**, and that is the correct default for the overwhelming
majority of interface motion.

Use \`.interactiveSpring\` (or an explicit low-response spring) for values the user is currently
dragging, because a slow spring between the finger position and the object position reads as lag.

## 4. Semantic colour

Use \`UIColor.label\`, \`.secondaryLabel\`, \`.tertiaryLabel\`, \`.quaternaryLabel\`,
\`.systemBackground\`, \`.secondarySystemBackground\`, \`.tertiarySystemBackground\`,
\`.systemGroupedBackground\`, \`.separator\`, \`.opaqueSeparator\` and \`.tintColor\` — or their
SwiftUI equivalents \`.primary\`, \`.secondary\`, \`Color(.systemBackground)\` and so on.

The mechanism for preferring semantic over literal is that the system already knows the answers to
questions you would otherwise have to enumerate. Each semantic colour resolves differently for
light and dark appearance, for Increase Contrast, and for elevated versus base contexts, and it
does so consistently with every other application on the device. A literal \`#8E8E93\` matches
\`secondaryLabel\` in light mode, is illegible under Increase Contrast, and is simply wrong in
dark mode — three bugs from one convenient hex value.

Dark mode on OLED uses a **true black base** (\`.systemBackground\` resolves to #000000), because
unlit OLED pixels draw no power and produce genuinely black rather than dark grey. Layered
surfaces use the **elevated** variants, which lighten as they rise, since the light-from-above
shading model that darkens surfaces in light mode inverts when the base is black — you cannot
signal elevation by going darker than nothing.

The two-tier background system matters: **grouped backgrounds invert their relationship with the
surface**. In light mode \`systemGroupedBackground\` is a light grey with white cells sitting on
it; in dark mode the grouping is darker and the cells are lighter. Hard-coding "grey page, white
card" produces a black card on a black page in dark mode.

There is a separate family for filled controls — \`.systemFill\`, \`.secondarySystemFill\`,
\`.tertiarySystemFill\`, \`.quaternarySystemFill\` — and it is not interchangeable with the
background family. Fills are semi-transparent by design so that a segmented control or a search
field picks up whatever surface it lands on, which is why the same control looks correct on a
white card and on a grouped background without being told which it is sitting on. Substituting
\`secondarySystemBackground\` for \`secondarySystemFill\` produces a control that is opaque and
therefore visibly wrong on exactly one of the two surfaces.

Tint is the one colour that should be yours. \`.tintColor\` (SwiftUI \`.tint()\`) propagates
through the hierarchy and marks what is interactive, which means it must not also be used
decoratively — if your brand colour fills a header background *and* marks tappable text, the
interactive signal has been spent and users start tapping headers.

## 5. Scroll physics

\`UIScrollView.DecelerationRate.normal\` is **0.998** and \`.fast\` is **0.99**. These are
per-millisecond decay factors: velocity is multiplied by \`rate\` each millisecond, so the normal
rate retains 99.8% of velocity per millisecond and coasts a long way, while the fast rate sheds
energy roughly five times as quickly and stops promptly. Paging and short carousels use
\`.fast\`; long content lists use \`.normal\`, because a list you scroll through wants to reward a
hard flick with distance.

This is the same constant that drives the momentum projection function in \`motion-physics.md\`.
That shared origin is what makes scroll deceleration, sheet detent snapping, and carousel paging
feel like one physical system rather than three separately-tuned effects — they are all answering
"where would this have stopped?" with the same decay model.

\`.scrollTargetBehavior(.viewAligned)\` with \`.scrollTargetLayout()\` implements carousel snapping
against the system's own projection, so a flick lands where the platform's physics say it should.
A hand-rolled carousel that snaps to the nearest item from the release position will disagree with
every scroll view around it, and users feel the inconsistency long before they can name it.

\`.scrollPosition\`, \`.scrollBounceBehavior(.basedOnSize)\` and
\`.scrollDismissesKeyboard(.interactively)\` are the remaining pieces worth knowing. The last one
matters most: interactive keyboard dismissal ties the keyboard's position to the drag so the user
can see what is behind it while deciding, rather than committing to a dismissal before knowing
whether they need it.

## Pass conditions

- Every rounded surface uses \`style: .continuous\` or \`cornerCurve = .continuous\`.
- Every nested rounded rectangle satisfies \`childRadius == parentRadius − padding\`.
- No translucent material is layered directly over another translucent material.
- Web material translations include both \`saturate(180%)\` and a light top border.
- All spring animations are specified with duration and bounce (or damping ratio and response), not mass/stiffness/damping.
- Colour references resolve through semantic system colours; no literal hex is used for text, background, or separator colours.
- Elevated surfaces in dark mode use elevated system background variants rather than a fixed lightened hex.
- Filled controls use the \`systemFill\` family, not the \`systemBackground\` family.
- The tint colour is used only for interactive elements and never as a decorative background.
- Carousels and paged content use \`.scrollTargetBehavior\` rather than a hand-rolled nearest-item snap.`,
      },
      {
        id: 'navigation-accessibility-and-system-integration',
        title: 'Navigation, sheets, accessibility signals, haptics, and system-provided states',
        answers:
          'What are the structural rules for navigation bars, tab bars, the pop gesture and sheets, and how do I wire VoiceOver, the accessibility toggles, haptics, launch screens, and the system state views correctly?',
        content: `# Navigation, sheets, accessibility signals, haptics, and system-provided states

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
\`leftBarButtonItem\` without reassigning \`interactivePopGestureRecognizer.delegate\`, or by
placing a horizontally-scrolling view against the left edge that swallows the pan — strands the
user on a screen with an unreachable exit. If a custom edge gesture is genuinely required, it must
begin outside the leading 20pt so the system recogniser gets first refusal.

## 2. Sheets

\`\`\`swift
.sheet(isPresented: $showing) {
    DetailView()
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(24)
        .presentationBackgroundInteraction(.enabled(upThrough: .medium))
}
\`\`\`

Detents let one presentation serve two jobs: a medium sheet that can be promoted to full height
without a separate screen. \`.presentationDragIndicator(.visible)\` earns its space when a sheet
is resizable, because a resize affordance the user cannot see is one they will not use — omit it
on a fixed-height sheet where it promises a gesture that does nothing.

\`.presentationBackgroundInteraction(.enabled(upThrough: .medium))\` keeps the content behind live
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

- \`UIAccessibility.isReduceMotionEnabled\` — plus \`UIAccessibility.prefersCrossFadeTransitions\`, which asks specifically for cross-fades in place of sliding navigation.
- \`UIAccessibility.isReduceTransparencyEnabled\` — replace materials with opaque fills. The mechanism is legibility: translucency puts arbitrary content behind text, and users with low vision cannot rely on the contrast surviving.
- \`UIAccessibility.isDarkerSystemColorsEnabled\` — the Increase Contrast setting; semantic colours handle it, literals do not.

Annotate with \`.accessibilityLabel\` (what it is), \`.accessibilityHint\` (what happens if you
activate it), \`.accessibilityValue\` (its current state) and \`.accessibilityTraits\`
(\`.isButton\`, \`.isHeader\`, \`.isSelected\`). Group compound cells with
\`.accessibilityElement(children: .combine)\` so VoiceOver reads one coherent item instead of five
fragments. Mark headings with the \`.isHeader\` trait — that is what populates the **VoiceOver
rotor**, and without it a rotor set to Headings finds nothing and the user must swipe through
every element linearly.

Focus order follows the layout tree, so a visually reordered stack reads out in the wrong order
unless corrected with \`.accessibilitySortPriority\`.

**Reduced motion means gentler and fewer, not zero.** Zero transitions remove the state-change cue
entirely, and a screen that swaps contents instantly is harder to follow, not easier. Replace
slides and springs with a **~200ms cross-fade**, drop parallax, overshoot and looping motion, and
keep opacity and colour changes that carry meaning — a row highlighting on selection is
information, not decoration.

## 4. Haptics

Three generators cover almost everything:

- \`UIImpactFeedbackGenerator(style:)\` — \`.light\`, \`.medium\`, \`.heavy\`, \`.soft\`, \`.rigid\`. Physical collisions: a card snapping into place, a toggle hitting its stop. \`.soft\` and \`.rigid\` vary perceived material hardness at similar amplitude.
- \`UINotificationFeedbackGenerator\` — \`.success\`, \`.warning\`, \`.error\`. Outcomes of operations the user waited for.
- \`UISelectionFeedbackGenerator\` — the fine tick as a value crosses a discrete step in a picker or slider.

Call \`prepare()\` when the trigger becomes likely, not when it fires. The Taptic Engine takes a
few tens of milliseconds to spin into its ready state, and a cold trigger arrives late enough to
break the causal binding between action and sensation, which is the entire point of the haptic.
Prepared generators idle down after a short window, so prepare on gesture-begin, not on view-load.

In SwiftUI, \`.sensoryFeedback(.impact(weight: .light), trigger: selection)\` fires on value change
and handles the generator lifecycle. For custom patterns — a multi-transient sequence, or a
continuous vibration whose intensity tracks a drag — use Core Haptics with a \`CHHapticEngine\`,
either constructed programmatically or loaded from an AHAP file.

The failure to watch for is the haptic on a state the user did not cause. A background sync
completing, a push arriving, a poll returning — these fire a \`.success\` notification into the
user's hand for something they were not doing, and the sensation is indistinguishable from the one
that means "your action worked". Haptics are a response channel, so anything that is not a
response does not belong in it.

The three rules are the same as on Android; only the generators differ. **Causality**: the haptic
must coincide with a visible event, within about 50ms, or it reads as an unrelated buzz.
**Harmony**: intensity must match the visual weight of what happened — a \`.heavy\` impact for a
checkbox is a lie about significance. **Utility**: the haptic must tell the user something they
could not already tell, which is why a haptic on every button press is noise while a haptic on a
snap-to-grid is information.

## 5. States and system integration

\`.redacted(reason: .placeholder)\` renders your real view hierarchy with content replaced by
shaped blocks, so the skeleton has the exact geometry of the loaded state and nothing shifts on
arrival. A hand-built skeleton drifts from the real layout the moment either changes.

\`ContentUnavailableView\` is the standard empty and no-results state, including
\`ContentUnavailableView.search\`. \`.refreshable { }\` installs pull-to-refresh with the system's
rubber-banding and spinner. \`.searchable(text:)\` places the search field in the correct position
for the navigation style and handles the scoping bar. \`.swipeActions(edge:)\` gives row-level
destructive and secondary actions, and \`.contextMenu(menuItems:preview:)\` gives a long-press menu
with a custom preview — the preview matters because it lets the user confirm which item they are
acting on before committing.

**The launch screen must match the first real frame.** A launch storyboard showing a centred logo,
followed by a first frame showing a navigation bar and a list, reads as two separate loads and
makes the app feel slower than its actual start time. The launch screen exists to fill the window
with the app's own chrome before the code runs, so the correct content is the static shell — bar,
background, tab bar — with no text and no logo.

Destructive and irreversible actions belong in \`.confirmationDialog\` or an \`.alert\` with a
\`.destructive\` role, and the confirm button must name the action — "Delete Draft", not "OK". The
mechanism is that a dialog is often read in a glance in which only the buttons register, so a
button labelled with the verb lets the user verify their intent from the button alone, while "OK"
requires them to have read and retained the body text.

SF Symbols must be weight- and scale-matched to adjacent text. A symbol at default weight beside
\`.headline\` text reads visibly thinner, because the symbol's stroke weight and the font's stroke
weight are drawn from the same design space and mismatching them is as visible as mixing two font
weights in one word. Use \`.imageScale(.medium)\` and \`.fontWeight(.semibold)\` on the image to
align them, and \`symbolRenderingMode(.hierarchical)\` or \`.palette\` when a symbol needs internal
tonal structure rather than a flat fill.

## Pass conditions

- Tab bars contain 2–5 tabs and reserve 83pt of total height on inset devices.
- Back buttons carry the previous screen's title.
- \`interactivePopGestureRecognizer\` remains enabled on every pushed screen, and no custom gesture begins within the leading 20pt.
- \`isReduceMotionEnabled\`, \`isReduceTransparencyEnabled\` and \`isDarkerSystemColorsEnabled\` are each read and acted on.
- Under Reduce Motion, transitions become ~200ms cross-fades rather than being removed entirely.
- Every non-text interactive element has an \`accessibilityLabel\`; headings carry the \`.isHeader\` trait.
- Every haptic generator has \`prepare()\` called before its likely trigger.
- No haptic fires from an event the user did not initiate.
- The launch screen contains no logo or text and matches the first rendered frame's chrome.
- SF Symbols adjacent to text declare a matching weight and \`imageScale\`.
- Destructive confirmations label their confirm button with the verb, not "OK".`,
      },
    ],
  },

  rules: [
    {
      id: 'platform-apple/no-device-metric-literals',
      strength: 'must-not',
      statement:
        'Do not write status-bar or home-indicator heights as literals; take every inset from safeAreaInsets, the SwiftUI layout system, or env(safe-area-inset-*).',
      evidence: {
        rationale:
          'The status-bar inset has been 20, 44, 47, 54 and 59pt across generations, and each of those values was introduced by a device that did not exist when the previous list looked complete. A literal is therefore correct only on the hardware it was measured on, and the failure appears on devices you cannot test because they have not shipped.',
        source: 'Apple Human Interface Guidelines, layout',
        url: 'https://developer.apple.com/design/human-interface-guidelines/layout',
        confidence: 'established',
      },
      examples: {
        language: 'swift',
        bad: 'VStack { … }.padding(.top, 47).padding(.bottom, 34)',
        good: 'VStack { … }  // safe area respected by the layout system',
      },
      verifiedBy: 'layout-and-type-audit',
    },
    {
      id: 'platform-apple/safe-area-inset-for-persistent-chrome',
      strength: 'must',
      statement:
        'Attach persistent overlay chrome with .safeAreaInset(edge:) rather than .overlay(alignment:), and name the region on every .ignoresSafeArea call.',
      evidence: {
        rationale:
          'safeAreaInset both draws the bar and enlarges the inset descendant scroll views respect, so the last row can still scroll clear of it; an overlay looks identical and permanently hides that row. Naming the region matters because .container is the hardware and chrome inset while .keyboard is the software keyboard, and a bare .ignoresSafeArea() ignores both, putting the field being typed into underneath the keyboard.',
        confidence: 'established',
      },
      examples: {
        language: 'swift',
        bad: 'ScrollView { … }.overlay(alignment: .bottom) { PlayerBar() }',
        good: 'ScrollView { … }.safeAreaInset(edge: .bottom) { PlayerBar() }',
      },
      verifiedBy: 'layout-and-type-audit',
    },
    {
      id: 'platform-apple/touch-targets',
      strength: 'must',
      statement:
        'Give every interactive control a 44×44pt hit rect with 8pt of clear space to its neighbours, declaring .contentShape when the tappable area is larger than the drawn glyph.',
      evidence: {
        rationale:
          'A fingertip contacts roughly 44pt of glass, and below that the error rate climbs sharply with the errors clustering at screen edges and in the thumb’s reach arc — exactly where navigation controls sit. Without .contentShape, SwiftUI hit-tests against the rendered glyph’s alpha, so a 44pt frame around a 16pt icon is 16pt of live target and 44pt of inert padding.',
        source: 'Apple Human Interface Guidelines, accessibility',
        url: 'https://developer.apple.com/design/human-interface-guidelines/accessibility',
        confidence: 'established',
      },
      examples: {
        language: 'swift',
        bad: 'Image(systemName: "xmark").onTapGesture { close() }',
        good: 'Image(systemName: "xmark")\n    .frame(width: 44, height: 44)\n    .contentShape(Rectangle())\n    .onTapGesture { close() }',
      },
      exceptions: [
        'Pointer-driven contexts such as macOS, or an iPad with a trackpad attached, where the input mechanism reports an exact pixel rather than a contact blob.',
      ],
      verifiedBy: 'layout-and-type-audit',
    },
    {
      id: 'platform-apple/scaled-spacing-with-type',
      strength: 'must',
      statement:
        'Express text with system text styles or UIFontMetrics and vertical spacing with @ScaledMetric, so the layout survives accessibility size AX5 without fixed row heights.',
      evidence: {
        rationale:
          'At AX5 Body renders around 53pt, roughly 3.1 times default. Text itself scales fine; the failure is spacing frozen in points while text grows, so a 44pt row clips its descenders and a two-line label inside a fixed 60pt card loses its second line. Neither defect is visible at default size, which is the size the work is built at.',
        source: 'Apple Human Interface Guidelines, typography',
        url: 'https://developer.apple.com/design/human-interface-guidelines/typography',
        confidence: 'established',
      },
      examples: {
        language: 'swift',
        bad: 'HStack(spacing: 12) { … }.frame(height: 44).font(.system(size: 17))',
        good: '@ScaledMetric(relativeTo: .body) private var rowSpacing: CGFloat = 12\nHStack(spacing: rowSpacing) { … }.font(.body)',
      },
      verifiedBy: 'layout-and-type-audit',
    },
    {
      id: 'platform-apple/continuous-corners',
      strength: 'should',
      statement:
        'Draw rounded surfaces with style: .continuous or cornerCurve = .continuous rather than the default circular arc.',
      evidence: {
        rationale:
          'A circular-arc corner holds constant curvature 1/r along the arc and zero along the straight edge, so curvature steps discontinuously at the tangent point even though the tangent direction is continuous. The visual system is sensitive to that second-order discontinuity, and it reads as a faint kink at all four corners — most visible at large radii and on light-on-dark surfaces.',
        confidence: 'strong',
      },
      examples: {
        language: 'swift',
        bad: 'RoundedRectangle(cornerRadius: 20)',
        good: 'RoundedRectangle(cornerRadius: 20, style: .continuous)',
      },
      verifiedBy: 'surface-and-motion-review',
    },
    {
      id: 'platform-apple/concentric-nested-radii',
      strength: 'should',
      statement:
        'Set a nested surface’s corner radius to the parent radius minus the padding between them, and square it off when that value would be negative.',
      evidence: {
        rationale:
          'Two rounded rectangles are concentric only when their radii differ by exactly the gap. Give the child the parent’s radius and the gap is widest on the corner diagonal and narrowest at the edge midpoints, so the padding visibly thins toward the corners; give the child zero and a square inner corner sits inside a round outer one, reading as two unrelated objects.',
        confidence: 'strong',
      },
      examples: {
        language: 'swift',
        bad: 'Card(cornerRadius: 20) { Inner(cornerRadius: 20).padding(12) }',
        good: 'Card(cornerRadius: 20) { Inner(cornerRadius: 8).padding(12) }',
      },
      verifiedBy: 'surface-and-motion-review',
    },
    {
      id: 'platform-apple/no-stacked-materials',
      strength: 'must-not',
      statement:
        'Do not layer one translucent material directly over another; give the region behind the upper surface an opaque backing.',
      evidence: {
        rationale:
          'A material blurs and desaturates whatever it samples. Stacking two means the upper one samples an already-averaged backdrop, so contrast collapses toward the local mean twice over and the result is a muddy grey with nothing legible behind it. Under Reduce Transparency the same region must fall back to an opaque fill anyway, which is the behaviour you should have shipped.',
        confidence: 'strong',
      },
      examples: {
        language: 'swift',
        bad: 'sheetBackground(.regularMaterial)  // over a .thinMaterial navigation bar',
        good: 'sheetBackground(Color(.systemBackground))  // opaque over translucent chrome',
      },
      verifiedBy: 'surface-and-motion-review',
    },
    {
      id: 'platform-apple/springs-as-duration-and-bounce',
      strength: 'should',
      statement:
        'Specify springs as duration and bounce, or as damping ratio and response, rather than as mass, stiffness, and damping coefficient.',
      evidence: {
        rationale:
          'The physical triple is coupled: raising stiffness to shorten the response also lowers the effective damping ratio, so an edit intended to make the motion faster silently adds overshoot and the two values get chased against each other. Damping ratio and response are independent and each maps to something perceivable — how much it overshoots, and how long it takes.',
        source: 'SwiftUI Animation, spring(duration:bounce:)',
        url: 'https://developer.apple.com/documentation/swiftui/animation',
        confidence: 'strong',
      },
      examples: {
        language: 'swift',
        bad: '.animation(.interpolatingSpring(mass: 1, stiffness: 320, damping: 22), value: open)',
        good: '.animation(.spring(duration: 0.35, bounce: 0), value: open)',
      },
      verifiedBy: 'surface-and-motion-review',
    },
    {
      id: 'platform-apple/semantic-colour',
      strength: 'must',
      statement:
        'Resolve text, background, separator, and fill colours through semantic system colours rather than literal hex values, using the systemFill family for filled controls.',
      evidence: {
        rationale:
          'Each semantic colour already resolves for light and dark appearance, for Increase Contrast, and for elevated versus base contexts. A literal #8E8E93 matches secondaryLabel in light mode, is illegible under Increase Contrast, and is wrong in dark mode — three defects from one value. The fill family is separately non-interchangeable because fills are semi-transparent by design, so a control keeps working on both a white card and a grouped background.',
        source: 'Apple Human Interface Guidelines, color',
        url: 'https://developer.apple.com/design/human-interface-guidelines/color',
        confidence: 'established',
      },
      examples: {
        language: 'swift',
        bad: 'Text("Subtitle").foregroundStyle(Color(hex: "#8E8E93"))',
        good: 'Text("Subtitle").foregroundStyle(.secondary)',
      },
      verifiedBy: 'surface-and-motion-review',
    },
    {
      id: 'platform-apple/preserve-pop-gesture',
      strength: 'must',
      statement:
        'Keep the interactive pop gesture working on every pushed screen, and start any custom edge gesture outside the leading 20pt.',
      evidence: {
        rationale:
          'On a device with no hardware back button the edge swipe is the only reliable way back, and it is the one users on large phones depend on because the top-left button is outside thumb reach. Installing a custom leftBarButtonItem without reassigning the recogniser’s delegate, or putting a horizontal scroll view against the leading edge, silently disables it and strands the user on a screen with no reachable exit.',
        confidence: 'established',
      },
      examples: {
        language: 'swift',
        bad: 'navigationItem.leftBarButtonItem = customBack',
        good: 'navigationItem.leftBarButtonItem = customBack\nnavigationController?.interactivePopGestureRecognizer?.delegate = self',
      },
      verifiedBy: 'system-integration-review',
    },
  ],

  verification: [
    {
      id: 'layout-and-type-audit',
      kind: 'self-review',
      description:
        'Confirm geometry comes from the system and the layout survives the largest type size.',
      blocking: true,
      questions: [
        'Does any device-generation status bar height (20, 44, 47, 54, 59) or the literal 34 appear as an inset in layout code?',
        'Does every scroll view with full-bleed content extend under the chrome, with insets applied as content padding rather than a frame inset, and does every .ignoresSafeArea name its region?',
        'Is every hit rect at least 44×44pt with 8pt of separation, and does every enlarged tappable area declare .contentShape?',
        'Render the primary screens at accessibility size AX5: does anything clip, truncate, or lose a line, and do horizontal label/value pairs become vertical stacks?',
        'Does any layout branch on userInterfaceIdiom or a raw width rather than on size class, and does it still work in a 320pt Slide Over window?',
      ],
    },
    {
      id: 'surface-and-motion-review',
      kind: 'self-review',
      description:
        'Confirm corners, materials, colour, and spring parameters follow the platform mechanisms.',
      blocking: true,
      questions: [
        'Does every rounded surface declare a continuous corner curve, and does each nested radius equal its parent’s radius minus the padding?',
        'Is any translucent material layered directly over another, and does every material have an opaque fallback under Reduce Transparency?',
        'Is every spring given as duration and bounce (or damping ratio and response) rather than mass, stiffness, and damping?',
        'List every colour literal in the diff. For each, which semantic colour or systemFill role should it be, and how does it resolve under Increase Contrast and in dark mode?',
        'Do carousels and paged content use .scrollTargetBehavior rather than a hand-rolled nearest-item snap?',
      ],
    },
    {
      id: 'system-integration-review',
      kind: 'self-review',
      description:
        'Confirm navigation, VoiceOver, haptics, and system-provided states behave correctly.',
      questions: [
        'Is the interactive pop gesture still enabled on every pushed screen, and does no custom gesture begin within the leading 20pt?',
        'Does the tab bar carry 2 to 5 tabs and reserve 83pt of height, and does each back button carry the previous screen’s title?',
        'Are isReduceMotionEnabled, isReduceTransparencyEnabled and isDarkerSystemColorsEnabled each read and acted on, with reduced motion becoming a ~200ms cross-fade rather than nothing?',
        'Does every non-text interactive element carry an accessibilityLabel, and does every heading carry the .isHeader trait so the rotor finds it?',
        'Does every haptic have prepare() called before its likely trigger, and can any haptic fire from an event the user did not initiate?',
        'Does the launch screen match the first real frame with no logo or text, and does every destructive confirmation label its button with the verb?',
      ],
    },
  ],

  relatedSkills: ['colour-systems', 'motion-physics', 'accessible-components', 'surface-and-depth'],
}
