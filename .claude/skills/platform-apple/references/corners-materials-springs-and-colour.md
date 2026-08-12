# Continuous corners, materials, springs, semantic colour, and scroll physics

## 1. Continuous corners

Use `RoundedRectangle(cornerRadius: 16, style: .continuous)` in SwiftUI and
`layer.cornerCurve = .continuous` in UIKit. The default `.circular` style is wrong for
surfaces in an Apple interface.

The mechanism is curvature continuity. A circular-arc corner has constant curvature along the arc
and zero curvature along the straight edge, so at the tangent point curvature jumps
discontinuously from 1/r to 0. The tangent direction is continuous, so the outline is smooth in
the naive sense, but the *rate of turning* is not, and the visual system is sensitive to
second-order discontinuity in a contour. The result reads as a faint kink at the four points
where each corner meets its edges — most visible at large radii and on light-on-dark surfaces. A
continuous corner ramps curvature in and out, so there is no point at which the turn rate steps,
and the shape reads as one object rather than a rectangle with arcs glued on.

**Nested radii must be concentric**: `childRadius = parentRadius − padding`. A 20pt card with
12pt padding wants a 8pt inner radius. Give the child the parent's 20pt and the gap between the
two curves is widest at the corner diagonal and narrowest at the edge midpoints, so the padding
visibly thins toward the corners; give the child 0pt and the square inner corner sits inside a
round outer one, which reads as two unrelated objects. If your inner radius would go negative,
your padding is larger than your radius and the child should simply be square.

CSS approximates this with `border-radius` plus a corner-smoothing implementation; where none is
available, prefer slightly larger radii on the parent than you would use for a squircle, since a
circular arc reads tighter than a continuous corner of nominally the same radius.

## 2. Materials and depth

`.regularMaterial`, `.thinMaterial`, `.ultraThinMaterial`, `.thickMaterial` and
`.ultraThickMaterial` are not translucency percentages — they are compositing recipes combining
a backdrop blur, a saturation boost, a vibrancy pass on foreground content, and a tint that flips
with the colour scheme. Foreground text placed on a material should use
`.foregroundStyle(.secondary)` and friends so it picks up the vibrancy blend rather than sitting
on top as flat ink.

The web translation of `.regularMaterial`:

```css
.material-regular {
  backdrop-filter: blur(20px) saturate(180%);
  background: rgba(255, 255, 255, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.4);
}
```

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

SwiftUI's modern spring API is `.spring(duration:bounce:)`, plus the named presets:

| Preset | Duration | Bounce | Use |
|---|---|---|---|
| `.smooth` | 0.5s | 0 | default; no overshoot |
| `.snappy` | 0.5s | 0.15 | responsive UI with a touch of life |
| `.bouncy` | 0.5s | 0.3 | playful, momentum-carrying moves |
| `.interactiveSpring` | — | low | values tracking a live gesture |

A navigation push runs at roughly **0.35s**. Sheets and drawers sit near 0.3–0.4s with a small
bounce.

Parameterise springs as **damping ratio plus response**, not as mass, stiffness and damping
coefficient. The mechanism is that the physical triple is coupled: raising stiffness shortens the
response *and* reduces the effective damping ratio, so a "make it faster" edit silently adds
overshoot and you chase the two values against each other. Damping ratio and response are
independent and each maps to something you can perceive — how much it overshoots, and how long it
takes. `bounce` in the modern API is `1 − dampingRatio`, so `bounce: 0` is a **damping ratio
of 1.0, critically damped, no overshoot**, and that is the correct default for the overwhelming
majority of interface motion.

Use `.interactiveSpring` (or an explicit low-response spring) for values the user is currently
dragging, because a slow spring between the finger position and the object position reads as lag.

## 4. Semantic colour

Use `UIColor.label`, `.secondaryLabel`, `.tertiaryLabel`, `.quaternaryLabel`,
`.systemBackground`, `.secondarySystemBackground`, `.tertiarySystemBackground`,
`.systemGroupedBackground`, `.separator`, `.opaqueSeparator` and `.tintColor` — or their
SwiftUI equivalents `.primary`, `.secondary`, `Color(.systemBackground)` and so on.

The mechanism for preferring semantic over literal is that the system already knows the answers to
questions you would otherwise have to enumerate. Each semantic colour resolves differently for
light and dark appearance, for Increase Contrast, and for elevated versus base contexts, and it
does so consistently with every other application on the device. A literal `#8E8E93` matches
`secondaryLabel` in light mode, is illegible under Increase Contrast, and is simply wrong in
dark mode — three bugs from one convenient hex value.

Dark mode on OLED uses a **true black base** (`.systemBackground` resolves to #000000), because
unlit OLED pixels draw no power and produce genuinely black rather than dark grey. Layered
surfaces use the **elevated** variants, which lighten as they rise, since the light-from-above
shading model that darkens surfaces in light mode inverts when the base is black — you cannot
signal elevation by going darker than nothing.

The two-tier background system matters: **grouped backgrounds invert their relationship with the
surface**. In light mode `systemGroupedBackground` is a light grey with white cells sitting on
it; in dark mode the grouping is darker and the cells are lighter. Hard-coding "grey page, white
card" produces a black card on a black page in dark mode.

There is a separate family for filled controls — `.systemFill`, `.secondarySystemFill`,
`.tertiarySystemFill`, `.quaternarySystemFill` — and it is not interchangeable with the
background family. Fills are semi-transparent by design so that a segmented control or a search
field picks up whatever surface it lands on, which is why the same control looks correct on a
white card and on a grouped background without being told which it is sitting on. Substituting
`secondarySystemBackground` for `secondarySystemFill` produces a control that is opaque and
therefore visibly wrong on exactly one of the two surfaces.

Tint is the one colour that should be yours. `.tintColor` (SwiftUI `.tint()`) propagates
through the hierarchy and marks what is interactive, which means it must not also be used
decoratively — if your brand colour fills a header background *and* marks tappable text, the
interactive signal has been spent and users start tapping headers.

## 5. Scroll physics

`UIScrollView.DecelerationRate.normal` is **0.998** and `.fast` is **0.99**. These are
per-millisecond decay factors: velocity is multiplied by `rate` each millisecond, so the normal
rate retains 99.8% of velocity per millisecond and coasts a long way, while the fast rate sheds
energy roughly five times as quickly and stops promptly. Paging and short carousels use
`.fast`; long content lists use `.normal`, because a list you scroll through wants to reward a
hard flick with distance.

This is the same constant that drives the momentum projection function in `motion-physics.md`.
That shared origin is what makes scroll deceleration, sheet detent snapping, and carousel paging
feel like one physical system rather than three separately-tuned effects — they are all answering
"where would this have stopped?" with the same decay model.

`.scrollTargetBehavior(.viewAligned)` with `.scrollTargetLayout()` implements carousel snapping
against the system's own projection, so a flick lands where the platform's physics say it should.
A hand-rolled carousel that snaps to the nearest item from the release position will disagree with
every scroll view around it, and users feel the inconsistency long before they can name it.

`.scrollPosition`, `.scrollBounceBehavior(.basedOnSize)` and
`.scrollDismissesKeyboard(.interactively)` are the remaining pieces worth knowing. The last one
matters most: interactive keyboard dismissal ties the keyboard's position to the drag so the user
can see what is behind it while deciding, rather than committing to a dismissal before knowing
whether they need it.

## Pass conditions

- Every rounded surface uses `style: .continuous` or `cornerCurve = .continuous`.
- Every nested rounded rectangle satisfies `childRadius == parentRadius − padding`.
- No translucent material is layered directly over another translucent material.
- Web material translations include both `saturate(180%)` and a light top border.
- All spring animations are specified with duration and bounce (or damping ratio and response), not mass/stiffness/damping.
- Colour references resolve through semantic system colours; no literal hex is used for text, background, or separator colours.
- Elevated surfaces in dark mode use elevated system background variants rather than a fixed lightened hex.
- Filled controls use the `systemFill` family, not the `systemBackground` family.
- The tint colour is used only for interactive elements and never as a decorative background.
- Carousels and paged content use `.scrollTargetBehavior` rather than a hand-rolled nearest-item snap.
