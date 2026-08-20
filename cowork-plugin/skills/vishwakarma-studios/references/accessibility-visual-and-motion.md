# Accessibility in Games: Visual Presentation, Readability and Motion

Game accessibility is not web accessibility with a controller: there is no accessibility tree and no screen reader that can read a rendered frame, so everything a player must perceive has to be built into the game's own presentation. This part covers what reaches the eye — colour encoding, text scale and contrast, combat and world readability, photosensitivity safety, and motion sickness on flat screens and in VR. Input, remapping and motor assistance are in `accessibility-input-and-motor.md`.

## 1. Colour is never the only channel

Around 8% of men and 0.5% of women have a colour vision deficiency: deuteranomaly and deuteranopia are the most common by a wide margin, protan types next, and tritan types rare but real. The naive response is a set of colourblind modes; the correct response is a rule about information encoding, with modes as a secondary refinement.

The rule: no gameplay-relevant information may be conveyed by colour alone. Every colour-coded distinction carries a redundant channel — shape, icon, pattern, position, size, text, or an audio cue. Red and green health bars become a bar plus a numeric value and a distinct fill pattern. Team identity becomes colour plus an outline style plus a marker shape. A red interactable becomes a red interactable with an outline and an icon. The test is to render the frame in greyscale and ask whether the information survives; if it does not, the encoding is wrong and no colourblind mode will fix it, because a mode remaps colours and cannot invent a second channel.

Colourblind modes remain worth shipping, and the implementation quality matters. Simulate the deficiency properly using an LMS colour space transform (the Brettel or Viénot method) rather than by swapping or scaling channels, and offer correction as a daltonisation pass with an intensity slider rather than a single fixed remap, because deficiency severity varies continuously and an anomalous trichromat needs less correction than a dichromat. Offer separate handling for the three types, apply the pass to the whole frame including the HUD, and let the player preview it on a representative gameplay scene rather than on a colour-wheel image.

| Type | Approximate prevalence in men | Confusion axis | What breaks |
|---|---|---|---|
| Deuteranomaly / deuteranopia | 5–6% | Red–green | Health bars, team colours, damage states, map markers |
| Protanomaly / protanopia | 1–2% | Red–green, red appears dark | Red on dark backgrounds becomes invisible, not merely confusable |
| Tritanomaly / tritanopia | Under 0.1% | Blue–yellow | Status effects and rarity tiers that use blue and yellow |

Studio: put a greyscale toggle and the three simulation modes in the developer overlay so any artist or designer can check a screen in two seconds, and run a colour-deficiency pass over every new UI screen and every combat readability change as a scheduled milestone checklist item with a named owner. The failure this prevents is a late-project discovery that the whole status effect vocabulary is a hue ramp.

Two further colour rules that are commonly missed. Colour choices must survive the display pipeline the player actually uses: a distinction that holds on a calibrated monitor can vanish on a television in a bright room with a vivid picture mode, so check the palette at low contrast and under a simulated bright-room gamma. And colour used for state — cooldown, buff, debuff, rarity, faction — should be drawn from a small palette with large hue and luminance separation rather than a smooth ramp, because a ramp is precisely the encoding that a colour deficiency collapses.

## 2. Text, scale, contrast and the ten-foot problem

Console games are read from 2–3 metres on a television and handheld games from 30 centimetres on a small panel, and the same UI often ships to both. The angular size of the text, not its pixel size, is what determines legibility, which is why a layout that reads on a monitor at desk distance can be unreadable on a sofa.

Practical floors to design against. Body and subtitle text at no less than about 3% of screen height for console viewing — roughly 32 px at 1080p — with critical HUD text at or above that and nothing gameplay-relevant below about 2%. A text scaling setting from 100% to at least 200%, applied to subtitles, HUD text, menus and tooltips, with layouts that reflow rather than clip. Contrast of at least 4.5:1 for body text and 3:1 for large text and meaningful icons, measured against the worst background the text will actually sit on, which in a game is a moving scene rather than a flat colour — which is why text over gameplay needs a backing plate, an outline or a shadow rather than a hopeful colour choice.

A high-contrast mode is a separate, stronger feature: flat backgrounds behind all text, boosted outline weight on interactive elements, reduced decorative texture in UI, and optionally a gameplay high-contrast mode that renders characters and interactables in flat distinguishable colours against a desaturated world. The latter is expensive because it needs a rendering path, which is exactly why the decision belongs in pre-production rather than in the accessibility pass at beta.

Studio: check every UI screen at 100% and 200% scale, at the minimum supported resolution, on a television at 2.5 metres, with a colour-deficiency simulation applied, and with pseudo-localised strings expanded 40%. Those five conditions together catch nearly all text accessibility defects, they take a morning to run over a whole game, and none of them is visible in the build the team plays on monitors at desk distance.

Icon and symbol legibility follows the same angular rule as text and is checked less often. A status icon that reads at 32 px on a monitor at 60 cm is roughly a quarter of that angular size on a television at 2.5 metres, which is why status effect vocabularies that look distinct in the editor become an undifferentiated smear in play. Test the icon set at target distance, keep the silhouettes distinct rather than relying on internal detail, and pair every icon with text in any screen where the player is not under time pressure.

Font choice is a legibility decision that art direction often makes on other grounds. Prefer a face with open apertures, unambiguous letterforms — distinguishable I, l and 1, distinguishable O and 0 — and generous x-height, and provide an alternative legibility-first font as a setting for players who need it, including a face designed for dyslexic readers. The cost is one additional font asset and a layout that does not assume specific glyph metrics; the second condition is the one that makes it hard to retrofit.

## 3. Combat and world readability

Readability is the general case of which several accessibility features are specific instances: the information a player must react to has to be perceivable, at the size it appears, in the time it is on screen, against the background it appears over. A game whose readability is marginal for everyone is impassable for anyone with a visual, attentional or processing difference, and the fixes are the same fixes that improve it for everyone.

| Signal the player must read | Usual channel | Redundant channel to add | Setting to expose |
|---|---|---|---|
| Enemy about to attack | Animation windup | Outline flash, audio sting, on-screen indicator | Telegraph emphasis on/off, extended telegraph timing |
| Enemy versus ally | Colour | Silhouette, outline style, marker shape, nameplate | Outline mode, nameplate size and always-on |
| Interactable object | Subtle highlight on proximity | Persistent outline, icon, audio cue | Outline colour, thickness, persistence |
| Player took damage | Screen edge vignette | Directional indicator, controller haptics, audio | Vignette intensity, indicator on/off |
| Low health | Red vignette and heartbeat audio | Numeric value, bar shape change, distinct audio | Vignette intensity, numbers always on |
| Objective location | Map marker | On-screen compass marker with distance, waypoint trail | Marker persistence, distance display |
| Area is dangerous | Environmental colour cue | Pattern, icon, audio, controller feedback | Hazard highlight |

Clutter is the other half of readability and is under-managed. Particle density, damage numbers, hit markers, screen-space effects, ambient UI animation and post-processing all compete for the same attention, and the player who is struggling to find the signal is the player who most needs the noise reduced. Ship intensity settings for particle and post-process effects, a toggle for floating combat text, and an option to reduce non-essential HUD animation; these also recover frame time on low-end hardware, so they pay twice.

A high-contrast gameplay mode is the strongest version of this and is a rendering feature rather than a UI one: characters, enemies and interactables rendered in flat, player-selected colours against a desaturated environment, so figure-ground separation no longer depends on lighting or material detail. It costs a render path and a set of authored overrides, which is why it is a pre-production decision, and it is the single most transformative visual accessibility feature for players with low vision.

Studio: allow HUD elements to be individually toggled, scaled and repositioned. A player using a screen magnifier sees a fraction of the frame, and information pinned to four corners is information they cannot reach; being able to bring the health bar and objective marker toward the centre converts an unplayable layout into a playable one.

## 4. Photosensitivity

Photosensitive epilepsy affects roughly 1 in 4,000 people, and a seizure induced by a game is a medical event, not a bad review. The thresholds are inherited from broadcast standards and they are specific enough to test against.

The general threshold is three flashes per second: content that flashes more than three times in any one-second window is a risk, where a flash is a substantial change in luminance over a substantial area of the screen. Area matters — the risk applies when the flashing region covers more than roughly a quarter of the screen at typical viewing distance. Saturated red is treated separately and more strictly, because transitions to and from saturated red provoke responses at lower flash rates and lower areas than luminance flashes do; muzzle flashes, red damage vignettes and red alarm strobes are the common offenders. Regular high-contrast spatial patterns — stripes, checkerboards, concentric rings — are a third risk category, particularly when they move or scroll.

Testing is a process, not an opinion. Capture 60 fps video of the highest-risk content — explosion-heavy combat, boss transitions, lightning weather, screen-flash death effects, teleport transitions, loading strobes and any cutscene with strobing — and run it through an analysis tool. PEAT, the Photosensitive Epilepsy Analysis Tool, is free and appropriate for internal testing; the Harding test is the commercial broadcast-grade equivalent and is what a publisher or a broadcaster will require. Neither is designed for HDR output, so test the SDR path and treat HDR content with additional conservatism, since HDR increases peak luminance and therefore the magnitude of any given flash.

Ship a photosensitivity setting that reduces or removes screen flashes, damage vignettes, strobing effects and full-screen colour flashes, and place it where a player finds it before playing rather than after being harmed. Studio: add the capture-and-analyse pass to the milestone checklist with a named owner, and gate any new full-screen effect through it, because the effect that causes the problem is usually added late by someone who was not in the conversation.

Warnings should be specific rather than ritual. A generic epilepsy notice at boot conveys nothing actionable; a short statement naming the content that carries risk — "this game contains flashing lights during boss transitions and weather effects; these can be reduced in Settings, Accessibility" — lets a player act before encountering it, and takes the same amount of screen time.

## 5. Motion sickness, first-person cameras and VR

Simulator sickness comes from a mismatch between visually implied motion and vestibular input, and it excludes a substantial minority of players from first-person games entirely unless the mitigations exist. It is not a niche: motion sensitivity is one of the most frequently used accessibility settings categories in shipped games.

On flat screens the levers are field of view, camera motion and post-processing. Provide an FOV slider covering roughly 60–120 degrees horizontal on PC and at least 70–100 on console, because a narrow FOV on a large screen at close distance is a primary trigger. Provide independent toggles and intensity sliders for camera shake, weapon sway, head bob, landing and impact camera dips, motion blur (separate the per-object and full-screen forms — full-screen is the problem), depth of field, chromatic aberration and film grain. Provide a comfort vignette during fast movement, off by default on flat screens and available. Avoid forced camera movement — automatic camera recentring, cinematic camera pulls during gameplay, and rotation the player did not initiate — or make it optional.

In VR the same problems are more severe and the mitigations are more structural. Frame rate is an accessibility feature: sustained 90 Hz with no dropped frames is the floor, and a game that stutters induces sickness regardless of its comfort options. Offer snap turning in 15, 30 and 45 degree increments alongside smooth turning with an adjustable rate. Offer teleport locomotion alongside smooth locomotion, and dash or blink variants between them. Apply a dynamic comfort vignette that tightens with movement speed and angular velocity, with player-adjustable strength. Keep a stable horizon reference and avoid moving the horizon under the player. Never take control of the camera; never move the player without input; never apply acceleration where a step function would do, because acceleration is the strongest sickness trigger in the set. Support seated play with a height offset and a recentre binding, and support both hand orientations.

| Setting | Flat screen | VR |
|---|---|---|
| Field of view | Slider 60–120 degrees | Fixed by headset; do not alter |
| Camera shake, head bob, weapon sway | Independent toggles plus intensity | Off by default |
| Motion blur | Separate full-screen and per-object toggles | Not used |
| Comfort vignette | Optional | On by default, adjustable strength |
| Turning | N/A | Snap at 15/30/45 degrees plus adjustable smooth |
| Locomotion | N/A | Teleport, dash and smooth, all supported |
| Forced camera movement | Avoid or make optional | Never |

## Pass conditions

Answer yes to every applicable line before the game is considered to have met the floor.

1. Rendering the game in greyscale leaves every gameplay-relevant distinction legible; colour is never the only channel.
2. Colourblind modes cover deuteran, protan and tritan types, use an LMS-space transform with an intensity slider, and apply to the HUD and the world alike.
3. All gameplay text is at least 3% of screen height at the minimum supported resolution, with a scaling setting to at least 200% and reflowing layouts.
4. Text contrast meets 4.5:1 for body and 3:1 for large text against the worst background it actually appears over, with backing plates where the background moves.
5. A photosensitivity setting reduces flashes, strobes and full-screen colour effects, and is reachable before the first cutscene.
6. High-risk content has been captured at 60 fps and analysed against the three-flashes-per-second and saturated-red thresholds, with the analysis rerun when new full-screen effects are added.
7. Field of view is adjustable, and camera shake, head bob, weapon sway, motion blur and depth of field each have independent toggles.
8. VR builds hold 90 Hz, offer snap turn at 15/30/45 degrees and teleport locomotion, apply an adjustable comfort vignette, and never move the camera without input.
9. Icon sets have been checked at target viewing distance with distinct silhouettes rather than distinguishing internal detail.
10. Every signal the player must react to carries a redundant channel, and the mapping is documented rather than assumed.
11. Particle intensity, post-process intensity, floating combat text and non-essential HUD animation each have settings.
12. HUD elements can be individually toggled, scaled and repositioned toward the centre of the screen.
13. A legibility-first font alternative is available and the layout does not assume specific glyph metrics.
14. Content warnings name the specific risky content and the setting that reduces it, rather than being a generic notice.
