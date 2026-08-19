# Game UI: Element Categories, Legibility, and Display Targets

Game UI is read in motion, under stress, at distance — it is not app UI with a fantasy font. The player is steering a camera, tracking three moving threats, and holding a plan in working memory, and the interface gets whatever attention is left over, which is a fraction of a second of peripheral glance rather than a considered read. Every convention that makes an app screen good — generous whitespace, subtle hierarchy, restrained contrast, motion that explains structure — is either irrelevant or actively harmful under those conditions, because the constraint is not comprehension but recognition, and recognition happens in 100–200 ms or not at all.

Scope boundary. This file owns the HUD, in-world and spatial UI, combat feedback, minimaps, and pause and inventory overlays that sit on top of a running or suspended game. Launcher windows, settings screens, account and store pages, patch notes, and anything that would look at home in a desktop or mobile application are app UI and are governed by the `vishwakarma` skill; use its typography, colour, layout and accessibility guidance for those surfaces rather than this file. Where the two meet — a settings menu opened from a pause screen — the pause overlay's framing, navigation model and latency budget come from here and the form's internal layout comes from there.

## 1. Diegetic, non-diegetic, spatial, meta

Four categories, defined by two axes: whether the element exists in the game's fiction, and whether it exists in the game's 3D space.

| Category | In the fiction | In the world space | Examples |
|---|---|---|---|
| Non-diegetic | No | No | Conventional health bar, ammo counter, score |
| Diegetic | Yes | Yes | A gauge on the weapon model, a watch on the character's wrist |
| Spatial | No | Yes | Waypoint markers, enemy outlines, footstep indicators drawn in the scene |
| Meta | Yes | No | Blood on the camera lens, screen frost, distortion when poisoned |

Choose by what the element must do rather than by immersion as an abstract value. Non-diegetic is correct whenever precision and speed of read dominate: exact ammo counts, cooldown timers, resource totals, anything the player checks under pressure. It is the fastest to read because it can be placed where the eye can find it without a search and rendered with whatever contrast legibility requires.

Diegetic is correct when the information is low-precision, checked infrequently, and the fiction gains more than the read costs. A gauge on the weapon requires the player to look at the weapon, which is a 300–500 ms operation including the eye movement and refocus, so it works for "roughly how much is left" and fails for "do I have exactly enough for one more burst". Games that went fully diegetic and succeeded did so by also making the underlying quantities coarse.

Spatial is correct for anything positional: where the objective is, which enemy is targeted, where the damage came from. Putting positional information into a corner of the screen forces the player to translate from a 2D readout to a 3D belief, which is slow and error-prone; drawing it in the world removes the translation entirely.

Meta is correct for state that is diffuse rather than numeric — health at the low end, status effects, environmental conditions. Its weakness is precision and its risk is obscuring the play space, so a meta health indication almost always needs a non-diegetic partner for the exact value, and any full-screen meta effect needs an intensity setting.

Most shipped games are a deliberate blend. Record the category for each HUD element in the UI specification along with the justification, because the failure mode is drift: a system added in month fourteen uses whichever category the person building it prefers, and the HUD becomes four design languages sharing a screen.

Studio: maintain a UI style guide with tokens for colour, type scale, spacing, outline weight and motion durations, and require new HUD elements to be built from it. The HUD is assembled by more people over more months than any other single screen in the game, and without shared tokens it becomes visibly inconsistent by the second milestone.

## 2. Readability under motion

The background of a HUD is a moving image over which you have no control, and its local luminance can be anything from 0 to 100% within a single frame. Fixed foreground colours therefore cannot guarantee contrast, and the standard practice of picking a text colour that passes against the design mock is a guarantee about one frame of the game.

Four tools, in order of robustness:

**Scrims and plates.** A semi-opaque backing behind the element at 50–75% opacity, or a gradient scrim for elements anchored to a screen edge. This is the only technique that guarantees a contrast ratio, because it establishes the background. Cost is occlusion of the play space, so reserve it for text-heavy regions — subtitles, objective text, tooltips — rather than for the whole HUD.

**Outlines.** A 1.5–3 px stroke at 1080p in the opposing luminance, applied to text and icons. Outlines survive any background because at least one of the fill and the stroke contrasts with whatever is behind. For text, use a signed-distance-field renderer so the outline scales cleanly; a bitmap outline at 4K is a blurred smudge. Outlines cost roughly 10–15% of the glyph's optical weight, so compensate with slightly heavier type.

**Drop shadows.** A shadow at 60–80% opacity, offset 1–2 px, blurred 3–5 px, is cheaper than an outline and adequate over backgrounds that are mostly lighter than the element. It fails over high-frequency backgrounds — foliage, rubble, particle effects — where the shadow and the background interleave.

**Motion and shape.** An element that pulses or slides is found in peripheral vision far faster than one that changes colour, because peripheral vision has poor colour and acuity resolution but excellent motion detection. Reserve motion for things the player must notice without looking; a HUD where several elements animate continuously has spent the channel and nothing stands out.

Minimum contrast targets: 4.5:1 for body-size text and 3:1 for large text or icons, measured against the worst-case background, not the average. Where the worst case cannot be bounded, add a plate. Test every HUD element against four backgrounds — pure white snow or sky, pure black interior, a high-frequency foliage or debris scene, and a scene with a full-screen effect active — and treat failure on any of them as a defect.

Two further constraints specific to motion. Elements anchored to world positions must have a screen-space minimum size and a smoothing on their screen position, or they jitter as the camera moves and become unreadable while the player is running. And elements that appear during camera shake need to be exempt from the shake transform, or the HUD shakes with the world and the text becomes unreadable at exactly the moment it matters.

## 3. In-world and spatial UI

Anything drawn at a world position inherits problems that screen-space UI does not have: it moves, it scales, it can be occluded, and it can be behind the camera.

**Scaling.** Naive world-space UI shrinks with distance and becomes illegible at range, exactly when a nameplate or objective marker is most useful. Clamp apparent size: compute the screen-space size and clamp it to a band of roughly 60–130% of a reference size, or scale by the square root of distance rather than linearly. Below the minimum, collapse to a simplified form — a dot instead of a labelled plate — rather than continuing to shrink.

**Occlusion.** Decide per element whether it draws through geometry. Objective markers and teammate indicators generally must, or the player loses them behind a wall; enemy nameplates generally must not, or the game gives away positions. Where an element draws through, render an occluded variant at 40–60% opacity or in a dashed form so the player can tell the difference between visible and inferred, since that distinction changes their decision.

**Clamping to the edge.** An off-screen marker clamps to the screen border with an arrow indicating direction and, usually, a distance readout. Clamp inside the action-safe box, not to the raw screen edge. Give clamped markers a visually distinct form from unclamped ones, or the player misreads a clamped marker as an object just off to the side rather than 200 m behind them. Handle the behind-camera case explicitly: a naive projection of a point behind the camera produces a mirrored position on the opposite side of the screen, which is the single most common spatial UI bug.

**Stability.** Smooth the screen position with a short filter of 60–120 ms so the element does not jitter with camera shake and micro-motion, and exempt world-space UI from screen shake entirely. Depth-sort overlapping markers and merge markers within about 40 px into a cluster with a count.

**Density.** Cap simultaneously visible world markers at 8–15 for objectives and points of interest. Outlines on enemies scale with enemy count and should be gated on either targeting state or a distance and count budget, since an outline pass on 60 enemies is both unreadable and a genuine rendering cost.

## 4. Television, distance, and safe areas

Console UI is designed for a viewing distance of 2 to 3.5 metres and a display whose edges may not be visible.

**Overscan** was a physical property of cathode-ray televisions, which magnified the image and cut off 3–8% of the picture behind the bezel. It persists for two reasons that still bind: some televisions still apply overscan by default in non-game modes, and a large share of players sit with the image cropped by a bezel, a wall mount, or a display setting they will never find. Console technical requirements continue to specify safe areas for this reason.

Two boxes:

| Box | Inset per edge | Fraction of screen | Contents |
|---|---|---|---|
| Action-safe | 5% | 90% x 90% | All HUD elements, all interactive targets, all icons |
| Title-safe | 10% | 80% x 80% | Critical text, legal text, anything whose loss is unacceptable |

Broadcast standards are less conservative than console requirements — SMPTE-derived safe action is 93% and safe title 90% — so if you are targeting only modern displays with a documented direct mode you can relax toward those. Do not relax below action-safe on any console target without checking the current technical requirements for each platform, since this is a routine certification failure and it is entirely avoidable.

Additionally: honour the platform's reported safe area rather than assuming a rectangle. Handhelds, phones and some televisions report insets that differ per edge, and a phone with a notch in landscape has an asymmetric safe area that changes when the device is rotated. Query it at startup and on every resolution or orientation change, and lay out against the reported values rather than against constants.

**Font size at distance.** The governing quantity is angular size, not pixels. Text is comfortably readable when its cap height subtends at least 16–20 arc-minutes at the viewing distance; below about 12 arc-minutes, reading becomes effortful and error rates on numerals climb sharply.

Worked example for a couch setup: a 55-inch 16:9 display is 1.22 m wide, viewed at 2.5 m. One degree of visual angle at 2.5 m is 43.6 mm, so 20 arc-minutes is 14.5 mm. At 1920 px across 1.22 m, one pixel is 0.635 mm, so 14.5 mm is roughly 23 px of cap height, which for a typical typeface with a cap height around 0.7 em is a font size of about 33 px at 1080p.

Express the result as a fraction of screen height so it survives resolution changes:

| Element class | Minimum, fraction of screen height | At 1080p | At 2160p |
|---|---|---|---|
| Body and menu text on console | 2.8–3.2% | 30–35 px | 60–70 px |
| Subtitles | 4.0–5.0% | 43–54 px | 86–108 px |
| HUD numerals under stress | 3.5–4.5% | 38–49 px | 76–98 px |
| Secondary and tertiary labels | 2.2–2.5% | 24–27 px | 48–54 px |
| Absolute floor, anything | 2.0% | 22 px | 44 px |

Handheld and mobile invert the relationship: viewing distance of 0.3–0.5 m makes small text legible, but touch target minimums of 9 mm and thumb occlusion dominate instead, so the layout constraint moves from type size to reachable area.

Provide a HUD scale setting from roughly 75% to 150%, and a separate subtitle size setting. Both are now expected features and both are cheap if the layout is authored against relative units from the start and impossible to retrofit if it is not.

## 5. Resolution, aspect ratio, and ultrawide

The HUD must survive every aspect ratio the game ships on, and the naive approach — design at 16:9 and scale — fails in both directions.

Anchor elements to the edges they belong to rather than scaling a fixed layout. A health bar anchored to the bottom-left corner stays in the corner at every aspect ratio; the same bar positioned by absolute coordinates in a scaled 16:9 canvas drifts toward the centre at 21:9 and off the screen at 4:3. Use a scale mode that scales with screen height and anchors horizontally, which keeps type size constant in angular terms as the aspect widens.

Ultrawide, at 21:9 and 32:9, adds two problems. Elements anchored to the left and right edges can be 60 degrees apart in the player's field of view and are effectively invisible, so critical HUD elements should be constrained to a central band of roughly 16:9 within the wider frame even when decorative elements extend outward. And a wider field of view is a competitive advantage in multiplayer, which is a design decision to make deliberately rather than to inherit.

Handhelds and small-screen modes are the same problem inverted: a HUD authored for a television at 1080p and shown on a 7-inch handheld has text at roughly one third of the angular size it needs. Ship a separate HUD scale default per platform class rather than one value, and verify the smallest supported screen with the longest supported language.

Support 4:3 and 16:10 if any target requires them, and test at the extremes of the supported range rather than at 16:9 plus one other, since layout failures cluster at the boundaries.

## Pass conditions

Answer yes to every applicable line before the UI layer is considered done.

1. Every HUD element has a recorded category — diegetic, non-diegetic, spatial or meta — with the justification for that choice.
2. Every text and icon element carries an outline, plate or shadow sufficient to guarantee its contrast target, verified against white, black, high-frequency and full-screen-effect backgrounds.
3. Contrast measures at least 4.5:1 for body text and 3:1 for large text and icons against the worst-case background.
4. All HUD elements and interactive targets sit within the action-safe box; critical text sits within title-safe on console targets.
5. The platform-reported safe area is queried at startup and on every resolution or orientation change, and the layout responds to asymmetric insets.
6. Minimum text size is at least 2.8% of screen height for console body text and 4% for subtitles, and the layout is authored in relative units.
7. A HUD scale setting spanning at least 75% to 150% and a separate subtitle size setting both exist and work.
8. The HUD is not parented under any transform affected by screen shake.
9. World-space UI clamps its apparent screen size to a band rather than scaling linearly with distance, and collapses to a simplified form below the minimum.
10. Markers for points behind the camera are handled explicitly and never project to a mirrored on-screen position.
11. Off-screen markers clamp inside the action-safe box and are visually distinct from unclamped markers.
12. Occluded world-space elements render in a distinct state so the player can tell visible from inferred.
13. The HUD is verified at the widest and narrowest supported aspect ratios, and critical elements stay within a central 16:9 band on ultrawide.
14. HUD scale defaults are set per platform class rather than shared between television and handheld targets.
15. A UI style guide with shared tokens for colour, type scale, spacing, outline weight and motion duration exists, and new HUD elements are built from it.
