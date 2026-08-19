# Game UI: Navigation and In-Play Readouts

This part covers the elements the player operates and reads while the game is running: menu and inventory navigation on a controller, the order in which HUD information is retrieved under load, and the combat feedback layer of notifications, damage numbers, reticles and minimaps. It assumes the legibility, safe-area and world-space rules in `game-ui-legibility-and-display.md`.

Scope boundary. This file owns the HUD, in-world and spatial UI, combat feedback, minimaps, and pause and inventory overlays that sit on top of a running or suspended game. Launcher windows, settings screens, account and store pages, patch notes, and anything that would look at home in a desktop or mobile application are app UI and are governed by the `vishwakarma` skill; use its typography, colour, layout and accessibility guidance for those surfaces rather than this file. Where the two meet — a settings menu opened from a pause screen — the pause overlay's framing, navigation model and latency budget come from here and the form's internal layout comes from there.

## 1. Controller-first navigation

A mouse can reach any pixel in one movement; a stick or a d-pad can only move between neighbours. A layout designed for pointing has no defined neighbour relationships, so navigating it with a stick produces focus jumps that appear random — the focus travels to the geometrically nearest element, which in a grid with mixed sizes and gaps is frequently not the element the player expected.

**Build an explicit focus graph.** Every focusable element declares its neighbour for each of the four directions, either by authoring or by a deterministic generation pass over a defined layout structure. Automatic nearest-neighbour resolution is acceptable only for uniform grids and simple vertical lists, and even then it fails at the edges. The cost of explicit graphs is authoring time; the cost of automatic resolution is a class of bug that only reproduces on a controller, which is the platform most likely to be tested last.

Rules that make a focus graph feel right. Vertical lists wrap top to bottom; grids do not wrap horizontally, because horizontal wrap in a grid teleports the focus across the screen and the player loses it. Moving into a group of elements enters at the element nearest the direction of travel, not at the group's first child. Moving out of a scrollable region scrolls it before moving focus out, and scrolling keeps the focused element at least one row from the edge so the player can see what comes next. Focus persists when a submenu is closed, returning to the element that opened it. Disabled elements are skipped by navigation but remain visible, or the layout reflows as the player moves and nothing stays where they left it.

**Focus visibility** must be carried by at least two channels, because a single highlight colour fails for colour-vision-deficient players and fails against a moving background. Use a border or outline plus one of scale (1.03–1.08x), a background plate, or a persistent motion cue. Minimum 3:1 contrast between the focused and unfocused states. Animate the focus transition over 80–140 ms so the eye can track where it went; instant focus jumps are hard to follow across a large screen, and transitions above 200 ms feel sluggish because navigation is a repeated action.

**Navigation repeat** at an initial delay of 400–500 ms and a repeat interval of 60–120 ms, with acceleration to 30–50 ms after 1–2 s for long inventories. Add a page-jump on the shoulder buttons and a first-letter or category jump for lists over about 40 items; scrolling a 300-item inventory one row at a time is a design failure regardless of the repeat rate.

**Analogue navigation** requires a threshold and a reset: treat the stick as a d-pad with an activation threshold of 0.5–0.6 and a release threshold of 0.3–0.4, so a stick resting at 0.45 does not chatter.

Support pointing and focus simultaneously on PC. Track which input device last produced meaningful input and switch the presentation — cursor visible and hover states active for mouse, cursor hidden and focus highlight active for controller — without resetting the player's position in the menu.

## 2. Inventories, grids, and item UI

Inventory screens are where controller navigation, localisation, density and performance all fail at once, so they deserve explicit treatment.

Grid navigation follows the focus graph rules with two additions: entering a grid from outside enters the nearest cell in the direction of travel, and moving off the edge of a grid moves to the adjacent panel rather than wrapping, because wrapping in a grid loses the player. Provide a page jump and a category jump for anything over 40 items, plus a sort and a filter reachable in one input.

Comparison is the core task in most inventory screens, and it fails when the comparison requires memory. Show the equipped item's values beside the candidate's, with deltas rendered as signed values plus a direction glyph rather than as colour alone. Keep the delta column at a fixed position so the eye returns to the same place for every item.

Tooltips on a controller need an explicit reveal, either automatic on focus after a 200–400 ms dwell or on a dedicated button. Automatic tooltips that appear instantly on focus flicker during fast navigation; a dwell timer removes it at no cost.

Item names are the worst localisation case in the game, since they are short, numerous, frequently procedurally composed from affixes, and shown in narrow containers. Reserve at least 60% additional width or allow two lines, and never compose an item name by concatenating an affix string with a base string, because adjective placement and agreement differ by language — use a per-language template with named slots.

Performance: virtualise any list over roughly 50 rows so only the visible rows plus a margin exist as widgets, and pool the rows. A 400-slot inventory instantiated in full costs 10–40 ms to open, which reads as a hitch every time the player presses the button.

## 3. HUD information hierarchy under stress

Under load the player's HUD attention is a sequence of glances of 100–250 ms each, and each glance retrieves one item. The design question is therefore not what to display but what order the player retrieves it in, and the answer must match the order in which decisions depend on it.

A defensible default ordering for an action game, from most to least urgent:

| Rank | Information | Placement | Read mode |
|---|---|---|---|
| 1 | Own health and imminent-death state | Peripheral, plus a screen-space meta effect | Peripheral, no glance required |
| 2 | Incoming threat direction | Spatial or screen-edge indicator | Peripheral motion |
| 3 | Ammo or resource sufficient to act | Near the reticle or bottom-right | One glance |
| 4 | Cooldown and ability availability | Bottom-centre or around the reticle | One glance |
| 5 | Objective and current goal | Top-centre or top-left, low persistence | Deliberate glance |
| 6 | Minimap and spatial context | A corner | Deliberate glance |
| 7 | Score, currency, progression | A corner, low contrast | Between encounters only |

Two elements should be readable without a glance at all, meaning in peripheral vision: health at the low end, and incoming damage direction. Peripheral vision has roughly one tenth the acuity of the fovea at 20 degrees eccentricity and very poor colour discrimination, but excellent sensitivity to motion and luminance change. So peripheral information must be encoded as motion, size change or luminance change — a pulsing vignette, an expanding edge glow, a growing screen effect — and not as a colour change on a small bar, which is invisible outside the fovea and is the most common way health warnings fail.

Corollaries worth applying as rules. Anything that changes only in colour requires a glance and must be ranked accordingly. Anything positioned more than about 15 degrees from the reticle costs an eye movement of 150–250 ms plus a refocus, which is why competitive shooters cluster critical state near the crosshair. Anything that must be counted — a number of charges, a stack count — should be rendered as discrete pips up to about 5 and as a numeral above that, because subitising is instant up to four or five and counting is not.

Redundancy across channels is not waste here. Critical state — low health, an ability coming off cooldown, a reload completing — should carry an audio cue as well as a visual one, because audio requires no glance at all and reaches the player regardless of where they are looking. Budget the audio channel the same way: three simultaneous state cues are three sounds nobody parses.

**Progressive disclosure.** Fade non-urgent elements out during combat and back in during exploration, or reduce them to a low-contrast state. A HUD that shows everything at all times has flattened its own hierarchy. Fade transitions of 150–250 ms, with a hard rule that an element must never fade out within 500 ms of changing value, or the player sees motion in the periphery, looks, and finds nothing.

Give the player a HUD options screen with per-element visibility for at least the minimap, damage numbers, objective markers and the reticle, plus a global HUD opacity. Streamers and photographers want it off, competitive players want it minimal, and new players want it all.

## 4. Notifications, toasts, and event feeds

An event feed is a queue with a display budget, and the design work is the queueing policy rather than the visual.

Set a maximum of 3–5 simultaneously visible notifications and a lifetime of 3–5 s for informational items, 5–8 s for items requiring acknowledgement. Newest at the bottom or the top consistently, with existing items animating to their new position over 150–250 ms rather than jumping. Coalesce repeats: five identical pickups become one entry with a count, updated in place, which is both more readable and cheaper.

Priority tiers, resolved by pre-emption rather than by ordering alone: critical items — death, mission failure, disconnection — interrupt and clear the queue; important items — objective changes, level up — go to the front; informational items — pickups, ambient chatter — fill the remainder and are dropped rather than queued when the budget is full. Dropping is correct; a feed that eventually shows a pickup from ninety seconds ago is worse than one that never shows it.

Position notifications away from the reticle and away from the peripheral channels reserved for health and damage direction, because a toast that appears in the same region as a threat indicator trains the player to ignore both.

Never place a notification over an interactive element, and never let one steal input focus during gameplay. A modal that appears mid-combat because a friend came online is the canonical example of platform UI defeating game UI; on platforms where you control it, suppress non-critical overlays during gameplay.

## 5. Damage numbers and floating combat text

Floating combat text is the highest-volume UI in most games and the most common source of both frame-time surprises and unreadability.

Sizing and motion: spawn at the impact point projected to screen space with a random offset of 10–25 px so simultaneous numbers do not overlap exactly, rise 40–90 px over the lifetime with an ease-out curve, and fade over the final 30–40%. Lifetime 0.6–1.0 s for ordinary hits, up to 1.4 s for critical hits. Scale the initial size by magnitude within a bounded range of roughly 0.8x to 1.6x of base, and use colour plus a shape or outline change for type — a critical hit that differs only in colour fails for a meaningful fraction of players.

Volume control is the hard part, and three mechanisms do the work:

**Merging.** Combine damage against the same target within a window of 100–200 ms into one number. This alone reduces peak count by 60–90% in games with fast multi-hit attacks and it improves readability, because the player wants the total for the swing rather than a stream of ticks.

**Culling.** Cap the number of simultaneously visible instances at 20–40 and drop the smallest or oldest when the cap is exceeded. Cull entirely when off-screen, behind the camera, or beyond a distance threshold — typically 30–50 m — since a number over a target the player cannot see is pure cost.

**Stacking and lanes.** Assign each target a small set of vertical lanes and place successive numbers in them, or offset each successive number by a fixed vertical increment, so a sequence reads as a column rather than as a pile. Reset the lane assignment after 400–600 ms of no damage.

Implementation: pool every instance, never allocate per hit. Use a single mesh or a batched text renderer for all numbers rather than one widget per number; a naive implementation with a widget per number and a per-number layout pass costs 0.05–0.2 ms each and reaches several milliseconds during a busy encounter, which is a frame-rate drop that occurs precisely when the game is at its most demanding. Update positions on a job or in a single batched pass, and drive the animation from a shader where the renderer allows it.

Provide a setting with off, self-only, and all, plus a size option. Damage numbers are a common accessibility and comfort complaint at high volume.

## 6. Reticles, hit markers, and damage direction

**Reticles** must be visible against every background, which means the same techniques as section 2 of `game-ui-legibility-and-display.md` — an outline or a contrasting core — and must not obscure the target. Sizes: a static reticle of 12–24 px at 1080p; a dynamic reticle whose gap encodes spread should have a resting gap of 4–10 px and expand proportionally to the actual spread value rather than to an arbitrary animation, since players calibrate against it. Offer a colour choice with at least six options plus opacity, because a red reticle over red enemies is unusable and this is one of the cheapest accessibility features in the game.

**Hit markers** confirm that a shot connected, which is information the player cannot otherwise get at range. Duration 60–120 ms, with a distinct visual and audio form for a normal hit, a critical or weak-point hit, a kill, and a hit on a shield or armour. Four states, four separable forms — differing in shape as well as colour — because the difference between "damaging" and "not damaging" is the decision the marker exists to inform. Kill confirmation should persist slightly longer, 150–250 ms, and carry a distinct audio cue, since it changes the player's target priority.

**Directional damage indicators** answer "where is it coming from", which is the highest-value piece of information a player under fire can receive. An arc segment centred on the direction to the damage source, 60–90 degrees wide, positioned at 25–35% of screen height from the centre, appearing within one frame and fading over 1.2–2.0 s. Merge indicators within about 30 degrees of each other rather than stacking them. Scale opacity or thickness with damage magnitude, not with distance.

Two additions that materially improve survival: pair the indicator with directional audio and, where available, with directional screenshake as described in the game feel reference, so the channel redundancy carries the information even when the player's eyes are elsewhere. And provide a persistent low-intensity indicator for sustained damage sources, since a single 1.5 s fade does not communicate "you are standing in fire".

## 7. Minimaps and compasses

The first decision is the rotation model, and it is a trade rather than a preference.

| Model | Advantage | Cost | Suits |
|---|---|---|---|
| Rotating, player-up | Directions map directly to the stick; no mental rotation | Players cannot build a stable mental map of the level | Fast action, corridors, shooters |
| Fixed, north-up | Supports a persistent mental model of the world | Requires mental rotation at every glance, which is 200–500 ms and error-prone | Open worlds, strategy, games with a real map |
| Compass strip | Cheap, no spatial layout required, reads in peripheral vision | Carries direction only, not layout | Survival, exploration, games where layout is the discovery |

A common and defensible arrangement is a rotating minimap for immediate tactical awareness plus a north-up full map on a button, which gives both models where each is strong.

Density limits: a minimap is unreadable above roughly 20–30 simultaneous icons, and past that the player stops using it entirely rather than parsing it. Enforce a budget with a priority list — objectives and threats first, then teammates, then points of interest, then collectibles — and cull the lowest priorities when the count is exceeded. Cluster co-located icons into a single badge with a count above a proximity threshold of about 20 px. Cull by distance with a radius that reflects the map's scale rather than the world's, and clamp off-radius critical icons to the edge with a distinct clamped form so the player does not misread a clamped icon as a nearby one.

Vertical information is the perennial weakness. Encode height difference as an arrow, a size change, or an opacity change on the icon, and state the convention in the tutorial, since no convention here is universally understood.

Performance: minimaps rendered by a second camera each frame are a common and avoidable cost of 0.5–3 ms. Prefer a pre-baked map texture with icons drawn on top, update the icon set at 10–20 Hz rather than every frame, and render a live camera view only where the game genuinely requires dynamic world content on the map.

## Pass conditions

Answer yes to every applicable line before the UI layer is considered done.

1. Every menu has an explicit focus graph; no screen relies on automatic nearest-neighbour resolution.
2. Focus state is carried by at least two visual channels with a minimum 3:1 contrast against the unfocused state, and focus transitions animate in 80–140 ms.
3. Vertical lists wrap, grids do not wrap horizontally, focus persists across submenu open and close, and scrolling keeps the focused item away from the edge.
4. Mouse and controller navigation coexist on PC, switching presentation on device change without losing the player's position.
5. Low health and incoming damage direction are encoded as peripheral motion or luminance change, not as a colour change on a small element.
6. The HUD fades non-urgent elements during combat, and no element fades out within 500 ms of changing value.
7. Damage numbers merge within 100–200 ms, are capped at 20–40 simultaneous instances, are culled off-screen and beyond a distance threshold, and are pooled with no per-instance allocation.
8. Hit markers distinguish normal, critical, blocked and kill states by shape as well as colour, each with distinct audio.
9. Directional damage indicators appear within one frame, merge when within 30 degrees, and are paired with directional audio.
10. Reticle colour and opacity are player-configurable with at least six colour options.
11. The minimap enforces an icon budget with a documented priority list, clusters co-located icons, and does not render a live second camera every frame without a measured justification.
12. Lists over 50 rows are virtualised and pooled, and opening the largest inventory in the game does not produce a visible hitch.
13. Item names are composed from per-language templates with named slots, never by concatenating affix and base strings.
14. The notification feed has a stated maximum concurrent count, a coalescing rule for repeats, and a priority policy that drops rather than queues low-priority items when full.
15. No notification appears over an interactive element or steals input focus during gameplay.
16. Critical state changes carry an audio cue in addition to a visual one, and the number of simultaneous state cues is bounded.
