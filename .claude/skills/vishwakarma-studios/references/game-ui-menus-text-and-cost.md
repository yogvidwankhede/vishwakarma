# Game UI: Prompts, Menus, Text, and Frame Cost

This part covers the shell around the play surface: contextual prompts and tutorials, menu and pause latency, loading and streaming transitions, localisation, accessibility settings, UI frame cost, and a failure-signature table for the whole subject. It assumes the presentation rules in `game-ui-legibility-and-display.md` and the in-play elements in `game-ui-navigation-and-readouts.md`.

Scope boundary. This file owns the HUD, in-world and spatial UI, combat feedback, minimaps, and pause and inventory overlays that sit on top of a running or suspended game. Launcher windows, settings screens, account and store pages, patch notes, and anything that would look at home in a desktop or mobile application are app UI and are governed by the `vishwakarma` skill; use its typography, colour, layout and accessibility guidance for those surfaces rather than this file. Where the two meet — a settings menu opened from a pause screen — the pause overlay's framing, navigation model and latency budget come from here and the form's internal layout comes from there.

## 1. Prompts, tutorials, and contextual UI

Contextual prompts are the highest-traffic UI in most games and the most sensitive to glyph correctness.

Resolve every prompt at display time from the action name and the active device, as described in the input reference, so a rebind or a device change updates every prompt in the game with no per-screen work. Prompts baked into localised strings or into textures are the reason games ship tutorials naming the wrong button, and the bug is usually found by players rather than by the team, because the team plays on one device.

Placement and timing: an interaction prompt appears within 150 ms of the interaction becoming available and disappears within 150 ms of it becoming unavailable, with a fade rather than a pop. Anchor it near the target rather than in a fixed screen position where the target is a specific object, since a fixed prompt requires the player to associate it with whichever of three nearby objects is selected. Where several interactions are available, show the selected one prominently and the alternatives in a reduced form rather than showing all equally.

Hold prompts show a fill that begins at the hold threshold rather than at zero, so a tap does not flash the ring. Fill duration 0.6–1.5 s for confirmations, and the fill must reverse rather than reset on early release, so an accidental release does not cost the full duration.

Tutorial text obeys the same rules as the rest of the HUD plus one more: it must not require reading while the player is under pressure. Introduce a mechanic in a safe space, or pause the pressure while the instruction is displayed. A tutorial prompt shown during combat is not read, and its content is then assumed to have been taught.

Studio: keep a single prompt component used everywhere, driven by action name plus device, and forbid direct glyph references in screens. Solo: the same rule, implemented as one function.

## 2. Menu latency and motion budget

A 300 ms menu transition feels slow in a game and fine on a website, and the reason is calibration. The player has spent the last hour in a loop where every input produced a response within 16–50 ms, so their expectation of system responsiveness is set an order of magnitude tighter than a web user's. The same animation that reads as polished on a page reads as a stall in a game, and the effect compounds because game menus are navigated repeatedly rather than visited once.

Budgets:

| Interaction | Target | Ceiling |
|---|---|---|
| Input to first visible feedback | under 50 ms | 100 ms |
| Focus move within a screen | 80–140 ms | 200 ms |
| Panel or tab change | 120–200 ms | 250 ms |
| Screen-to-screen transition | 150–250 ms | 350 ms |
| Opening the pause menu | under 100 ms to interactive | 200 ms |
| Closing the pause menu to gameplay | under 100 ms | 150 ms |

Three rules keep menus feeling fast independent of the numbers. Every transition must be interruptible — a player who presses down twice quickly should land two elements down, not one, and a player who presses cancel during an opening animation should see it reverse immediately. Input must be accepted during transitions and queued or applied to the destination state, never dropped. And the first frame of feedback must not wait on the transition: the focus highlight moves immediately even if the panel behind it is still sliding.

Avoid transitions that block on asynchronous work. If a screen needs to load, show the screen's chrome immediately with placeholder content and populate as data arrives, rather than holding the previous screen until everything is ready — the perceived latency of the former is the frame time and of the latter is the load time.

Pause deserves specific treatment. Pausing must be immediate and must not require an animation to complete before input is accepted. It must suspend the simulation, audio that would be confusing when frozen, and any timer the player is racing, while continuing to render. On console it must be reachable from the platform's expected control and must handle a controller disconnect by pausing automatically. In multiplayer where the simulation cannot pause, the overlay must not obscure the play space and must not swallow gameplay input; a full-screen opaque pause menu in a live match is a design defect.

## 3. Loading, streaming, and transitions

Loading screens are UI with a specific job: keep the player oriented and give them a reason to believe the game is working.

Show progress if you can measure it, and show it monotonically — a bar that jumps backward or sits at 99% destroys trust in every future bar. Where progress cannot be measured, show an indeterminate indicator that continues to animate, and make sure it is driven by a thread that cannot stall, because a frozen spinner is indistinguishable from a crash and generates support contacts.

Keep something interactive where the platform permits it: a controllable character, a tip panel the player can page through, a lore reader. Interactivity converts waiting into activity and measurably reduces perceived duration.

Transitions between gameplay and menus should be short — 150–300 ms — and should not hide a load behind an artificially long animation, which is a trade of real time for perceived polish that players resent when the animation is repeated hundreds of times.

Streaming games have the opposite problem: there is no loading screen, so the seams appear as pop-in, and the UI's job is to avoid drawing attention to them. Do not show a loading indicator for streaming operations that usually complete within a frame or two; show it only after a threshold of about 500 ms, so the indicator appears when the player is already suspicious rather than flashing on every traversal.

Every loading screen needs a timeout path with a clear failure message and a route back, and every platform's technical requirements specify a maximum time without visible progress. Check the number for each target rather than assuming.

## 4. Localisation

Text length is not a property of your design; it is a property of the language, and the design must absorb the variance.

| Target from English | Typical expansion | Worst case for short strings |
|---|---|---|
| German | +25 to +35% | +100% or more |
| French | +15 to +25% | +80% |
| Spanish, Portuguese, Italian | +20 to +30% | +90% |
| Russian, Polish | +20 to +30% | +100% |
| Finnish, Hungarian | +30 to +40% | +120% |
| Japanese, Chinese | −30 to −50% in character count | Requires larger glyph size |
| Korean | −10 to −20% | Requires larger glyph size |
| Arabic, Hebrew | −5 to +25% | Right-to-left layout |

Short strings expand worst in relative terms, and UI is made of short strings — a three-character English label becoming a fifteen-character German one is routine. Design every text container to grow, and audit with a pseudo-localisation pass that expands every string by 40% and wraps it in markers so truncation and clipping are visible without a single translation existing. Run that pass in CI on every build.

Fixed-width boxes break at localisation time because they encode an assumption about one language. The fixes, in order of preference: allow the container to grow, allow the text to wrap to a second line with a container that grows vertically, reduce the font size within a bounded range of about 85–100%, and only then truncate with an ellipsis and a full value available on focus. Never let text overflow silently outside its container.

CJK specifics: line breaking occurs between characters rather than at spaces, and requires kinsoku rules that forbid certain characters at the start or end of a line — closing brackets, small kana, and most punctuation may not begin a line. Use a text renderer that implements them; a naive break-anywhere implementation produces text that reads as broken to native speakers. Minimum glyph sizes are larger than for Latin because the characters carry more strokes: add roughly 15–25% over the Latin minimum and avoid faux-bold, which fills in the interior strokes of dense characters and destroys legibility. Verify that your font atlas covers the required ranges and budget the memory — a full CJK atlas is tens of megabytes and is a common late-project surprise; use dynamic atlas generation with an eviction policy rather than a static atlas.

Right-to-left languages mirror the layout: reading order, progress direction, list alignment, back-button position and focus navigation all reverse. Icons that carry directional meaning within the interface mirror; icons depicting real objects do not — a clock, a road sign, a musical instrument keeps its handedness. Numerals and embedded Latin remain left-to-right within the RTL run, which requires proper bidirectional text handling rather than string reversal.

Two operational rules. No string may be assembled by concatenating fragments, because word order differs between languages and a sentence built from three parts is untranslatable; use full sentences with named placeholders. And every string needs context for the translator — a screenshot, a description of where it appears, and a character budget — because a translator working from a spreadsheet of isolated words produces exactly the results that appearance implies.

## 5. Accessibility

Game UI accessibility is largely a set of settings, and most of them are inexpensive if the UI is built against relative units and a token system from the start.

Colour is never the sole carrier of information. Roughly 8% of men have some form of colour vision deficiency, and the common types make red and green confusable, which is precisely the encoding most games use for friend, foe, damage and healing. Add shape, iconography, pattern or position to every colour-encoded distinction, and provide alternative palettes for protanopia, deuteranopia and tritanopia rather than a single "colourblind mode" toggle.

Subtitles need: a size setting reaching at least 5% of screen height, a background plate with an opacity setting reaching full opacity, speaker names where more than one character speaks, a maximum of two to three lines at a time, and a separate track for non-speech audio cues that carry gameplay information. Subtitles default to on in an increasing share of the market; treat the default as a decision to make rather than one to inherit.

Beyond those: a HUD scale setting from 75% to 150%; per-element HUD visibility; a global UI opacity; a reduced-motion setting that removes parallax, screen shake, camera bob and non-essential transitions while preserving the transitions that communicate state change; a high-contrast mode that increases outline weight and plate opacity; and a text-to-speech or screen-reader path for menus on platforms that support it.

Every setting must be reachable before the player is required to play — put the critical accessibility settings in the first-run flow, not behind a pause menu that requires clearing the tutorial to reach.

## 6. Performance: why the HUD is a frame-time surprise

UI is the system most likely to cost more than anyone estimated, because its cost scales with element count and change frequency rather than with visual complexity, and neither of those is visible in a screenshot.

**Unity UGUI.** A Canvas batches its children into meshes. Changing any property that affects geometry on any element — position, size, text content, colour on some setups — marks the canvas dirty and rebuilds the entire canvas, not the changed element. A canvas with 500 elements rebuilding costs 2–8 ms, and a single ammo counter changing every frame therefore rebuilds the whole HUD every frame. The fix is to split canvases by update frequency: a static canvas for chrome that never changes, a canvas for elements that change occasionally, and a canvas for per-frame elements. Additional rules: disable Raycast Target on every non-interactive graphic, since the raycast list is walked per pointer event; avoid nested canvases with mixed update rates; prefer setting alpha via a CanvasGroup rather than per-element colour, which avoids a geometry rebuild; and use `TMP_Text.SetText` with formatting arguments rather than string concatenation to avoid both the rebuild and the allocation.

**Unity UI Toolkit** uses a retained-mode hierarchy with dirty-region invalidation, which avoids the whole-canvas rebuild but introduces its own costs in style resolution; keep the visual tree shallow and avoid per-frame style changes, which force a re-resolve.

**Unreal UMG and Slate.** Widgets tick and repaint by default. Invalidation Boxes cache the geometry of children that do not change, converting repaint cost into a one-off, and Retainer Boxes render a subtree to a texture and re-render only at a specified interval, which is the tool for expensive but slow-changing panels. Set widgets that do not need it to not tick, prefer bindings that push on change over polling bindings evaluated every frame, and be aware that a single per-frame binding on a widget inside an Invalidation Box defeats the invalidation for that whole box.

**Cross-engine costs** worth budgeting: each distinct UI material or texture atlas is a draw call boundary, so a HUD assembled from twenty separate textures cannot batch; overdraw from stacked full-screen semi-transparent panels is a real fill-rate cost on mobile and can exceed the cost of the 3D scene; and world-space UI billboards each carry a transform update and a draw, so an outline or nameplate on every visible enemy scales linearly with enemy count.

Mobile deserves a specific warning: overdraw is the dominant UI cost on tile-based mobile GPUs, and a HUD built from several stacked full-screen translucent layers can consume more fill rate than the 3D scene beneath it. Flatten layers, avoid full-screen translucent backdrops for partial overlays, and measure with the platform's overdraw visualiser rather than assuming.

Budget: 1–2 ms of a 16.7 ms frame for the HUD on console and desktop, 1 ms of a 33.3 ms frame on mobile, and profile it as its own category rather than letting it hide inside general CPU time. Studio: add a UI-specific profiler marker set and a CI gate on it. Solo: check the HUD cost once per milestone with the profiler, because it grows monotonically and nobody notices until it is 6 ms.

Solo: pick one HUD scale, one language beyond English, and one television, and check the whole HUD against them once per milestone. Studio: run the safe-area, pseudo-localisation, colour-deficiency and controller-navigation passes as a scheduled checklist per milestone with a named owner, because each of them fails silently and none of them is visible in the build the team plays every day.

## 7. Failure signatures

| Symptom | Likely cause | Fix |
|---|---|---|
| Text unreadable in some scenes only | Fixed foreground colour with no guaranteed background | Add outline or scrim; test against four extreme backgrounds |
| HUD looks fine on a monitor, cut off on a television | Ignoring safe areas or the reported safe-area insets | Lay out within action-safe; query platform insets at runtime |
| Players miss low-health warnings | Warning encoded as colour on a small bar | Move to a peripheral motion or luminance cue |
| Menu navigation jumps unpredictably on a controller | Automatic nearest-neighbour focus resolution | Author an explicit focus graph |
| Menus feel sluggish despite short animations | Non-interruptible transitions, input dropped during them | Make transitions interruptible and accept input throughout |
| Frame rate drops during heavy combat only | Damage numbers or nameplates allocating per instance | Pool, merge within 150 ms, cap and cull |
| Frame rate drops with a static HUD | Whole-canvas rebuild from a per-frame element | Split canvases by update frequency |
| Text clipped or overlapping in some languages | Fixed-width containers | Growable containers; pseudo-localisation in CI |
| Icons ambiguous to some players | Colour as the sole encoding | Add shape or pattern; ship palette alternatives |
| Minimap ignored by players | Icon density above the readable limit | Enforce a priority budget of 20–30 icons; cluster |
| Players cannot tell whether shots are landing | Hit marker states not separable | Four distinct shapes plus distinct audio |
| Prompts show the wrong button after a rebind | Glyphs baked into strings or textures | Resolve prompts from action name plus device at display time |
| Markers appear on the wrong side of the screen | Points behind the camera projected naively | Handle the behind-camera case explicitly before projection |
| Opening the inventory hitches every time | Full instantiation of all slots | Virtualise and pool rows |
| Notifications are ignored | Feed placed in a channel reserved for threat information | Move the feed away from the reticle and the peripheral warning channels |
| The loading bar is distrusted | Non-monotonic progress or a stall at 99% | Make progress monotonic; drive indeterminate indicators from a stall-proof thread |
| HUD shakes and becomes unreadable | HUD parented under the shaken camera transform | Apply shake to a dedicated node below the UI |

## Pass conditions

Answer yes to every applicable line before the UI layer is considered done.

1. Input-to-first-feedback in menus is under 50 ms, screen transitions complete within 250 ms, and every transition is interruptible.
2. Pause is interactive within 100 ms, suspends simulation and relevant audio, and handles controller disconnect per platform requirement.
3. A pseudo-localisation pass expanding strings by 40% runs in CI, and no build ships with clipped or overflowing text under it.
4. No user-visible string is assembled by concatenating fragments; all use full sentences with named placeholders.
5. CJK text uses a renderer implementing kinsoku line-breaking rules, glyph sizes are raised by at least 15% over the Latin minimum, and faux-bold is disabled.
6. Right-to-left layouts mirror reading order, alignment, progress direction and focus navigation, and object-depicting icons are exempt from mirroring.
7. No information is carried by colour alone; alternative palettes for the three common colour vision deficiencies are available.
8. Subtitles support size, background opacity, speaker names, and a separate channel for gameplay-relevant non-speech audio.
9. A reduced-motion setting removes parallax, shake, bob and decorative transitions while preserving state-change communication.
10. Critical accessibility settings are reachable before the player is required to play.
11. UI canvases or widget trees are partitioned by update frequency, and no per-frame element forces a rebuild of static chrome.
12. Non-interactive graphics have hit-testing disabled.
13. UI frame cost is profiled as its own category against a documented budget of 1–2 ms on console and desktop and 1 ms on mobile.
14. Every button prompt is resolved at display time from action name plus active device, and no glyph is baked into a localised string or a texture.
15. Hold prompts begin their fill at the hold threshold and reverse rather than reset on early release.
16. Loading progress is monotonic where it is measurable, indeterminate indicators are driven by a thread that cannot stall, and every loading path has a timeout with a route back.
17. Streaming operations show an indicator only after a threshold of roughly 500 ms.
18. Mobile builds have been checked with the platform overdraw visualiser, and the HUD does not stack full-screen translucent layers.
