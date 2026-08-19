# Accessibility in Games: Input, Hardware and Motor Assistance

Game accessibility is not web accessibility with a controller. The web has a settled standard, a semantic document model, a mature assistive technology stack and an authoring layer that describes structure to a machine; a game has none of those. There is no accessibility tree, no screen reader that can read a rendered frame, no equivalent of a heading level, and the interaction is real-time, spatial, multi-modal and time-pressured. The discipline that has grown up around this is separate, its conventions are its own, and the floor is considerably higher than most teams assume — a game that has a colourblind mode and subtitles has done roughly a fifth of the work.

Scope boundary. Web and application accessibility — WCAG conformance, ARIA, semantic markup, platform screen readers, focus order in a document — belongs to the `vishwakarma` skill, and launcher windows, store pages, account flows and companion apps should be built to it. This file covers the game itself: input, real-time visual and audio presentation, motion, cognition and the settings architecture that makes all of it possible. Where the two meet, in a settings screen rendered by the game's own UI system, the option set comes from here and the form layout comes from there.

The mechanism that governs everything below: accessibility features are cheap when the seam already exists and expensive when it does not. A hold-to-toggle option is a configuration flag if input passes through an abstraction and a month of refactoring if hold detection is written inline in forty places. That asymmetry, not moral argument, is why this belongs in pre-production.

## 1. Input remapping is the foundation

Full remapping is the single feature with the widest reach, because it is what lets a player adapt the game to whatever hardware and range of motion they actually have. Full means every action, on every device, including modifiers and chords, with no reserved bindings and no actions that are silently unrebindable. The common failure is a remapping screen that covers the twelve combat actions and omits menu navigation, vehicle controls, the photo mode, the ping wheel and the accept/cancel pair — precisely the ones a player using a mouth stick or a single hand needs to move.

The requirements, each with its mechanism:

| Requirement | Mechanism |
|---|---|
| Every action rebindable, including UI accept/cancel/back | An unrebindable action is a wall for anyone who cannot reach that physical control |
| Modifiers and chords rebindable and decomposable | A player who cannot press two buttons at once needs the chord expressed as a sequence or a modifier toggle |
| Multiple bindings per action, and one binding driving several actions | Adaptive rigs expose a small number of large switches that must do more than one job |
| Simultaneous device input (pad plus keyboard plus adaptive device) | Adaptive setups routinely combine devices; a "current input device" model that locks to one breaks them |
| Bindings saved per profile and per input device | A player switching between a pad and an adaptive rig should not rebind twice |
| Presets including one-handed left and one-handed right | Presets are the on-ramp; most players will not build a layout from scratch |
| Detection and display of the connected device's real button names | A prompt that says a button the device does not have is unusable |

The Xbox Adaptive Controller and its equivalents present to the game as an ordinary controller, so no game-side driver work is required. What is required is that the game not demand inputs the adaptive rig cannot produce: no required simultaneous presses, no rapid repeated presses, no actions bound to stick clicks that a switch cannot emulate, and no assumption that both sticks are available at once. Treat "playable on a rig of four switches plus one stick" as a design constraint to check rather than an outcome to hope for.

Studio: build the input abstraction so that a binding is data — action, device, physical control, modifier, activation mode — resolved at runtime, and forbid direct polling of physical controls anywhere in gameplay code, enforced by a lint or a code review checklist item. Every accessibility input feature below is then a change to the resolution layer rather than to the game. Solo: the same abstraction, smaller; the cost of not having it is identical and lands in the same place.

Rebinding needs a usable conflict model. When a player assigns a control that is already in use, show the conflict, name the action it belongs to, and offer to swap, clear or accept the duplicate rather than silently refusing or silently overwriting — silent refusal in particular reads as a broken screen. Provide reset-to-default per binding and for the whole set, and make the remapping screen itself operable with a single control moving through a list, because it is the screen a player reaches precisely when their current bindings do not work.

## 2. Holds, mashing, timing and quick-time events

Four interaction patterns cause disproportionate exclusion, and all four have cheap alternatives that cost nothing to players who do not need them.

Hold actions require sustained force, which is exactly what is unavailable in many motor conditions and in fatigue-driven conditions such as multiple sclerosis or arthritis. Every hold in the game gets a per-action hold-or-toggle setting: hold to sprint or toggle sprint, hold to crouch or toggle crouch, hold to aim or toggle aim, hold to interact or press to interact. Per-action, not global, because a player may want toggled aim and held crouch. The implementation belongs in the input resolution layer as an activation mode on the binding, which is why section 1 comes first.

Repeated rapid input — button mashing — causes pain and is impossible for many players; it also has no design value that a single press or a hold cannot deliver. Provide a setting that converts every mash prompt into a hold, and make the hold duration the same as the mash duration so the pacing is unchanged.

Timing windows should be adjustable as a multiplier rather than removed. A parry window of 200 ms at 1x, 400 ms at 2x, and unlimited at the loosest setting preserves the shape of the interaction while changing its physical demand. Expose it as a named setting with a plain description of what it changes, and apply it consistently to parries, dodges, rhythm inputs, reaction prompts and any input with a deadline.

Quick-time events need an alternative path in every instance: an auto-complete option, a single-press substitute, or a slowed timer. The mechanism is that a QTE failure usually gates narrative progress, so a player who cannot execute it is not playing at a lower difficulty — they are locked out of the story. The same argument applies to any single mechanic that gates progression, which is the general form of the rule: no single input capability may be required to finish the game.

| Pattern | Default demand | Required alternative |
|---|---|---|
| Hold to act | Sustained press, 0.5–3 s | Per-action toggle |
| Mash to act | 5–10 presses per second | Hold of equal duration |
| Timed input | 100–300 ms window | Window multiplier, up to unlimited |
| Quick-time event | Correct input under time pressure | Auto-complete or single press |
| Simultaneous inputs | Two or more controls at once | Sequential or modifier-toggle form |
| Precise stick aim | Fine analogue control | Aim assistance, see section 4 |

## 3. Assistive hardware and how it reaches the game

Assistive setups almost never require game-side driver work, and this is the most useful thing to know about them: the hardware's job is to present as something the platform already understands. What the game owes them is the absence of assumptions.

| Device | Presents to the game as | Design implication |
|---|---|---|
| Xbox Adaptive Controller, PlayStation Access Controller | A standard gamepad | No required simultaneous presses; no rapid repeated presses; every control rebindable including stick clicks |
| Switch arrays and buttons via 3.5 mm jacks | Individual gamepad buttons | A small number of controls must be able to reach every action; support modifiers |
| Quadstick and mouth-operated controllers | A gamepad or a joystick plus buttons | Sip-and-puff input is slow and discrete; avoid deadlines and analogue precision requirements |
| Eye trackers | A mouse or a dedicated API | Dwell-based selection needs generous targets and no accidental double activation |
| Voice control (Voice Access, third-party bridges) | Keyboard and mouse events | Latency of 0.5–2 s per command; avoid anything with a reaction deadline |
| One-handed and vertical mice, trackballs | A mouse | Do not require simultaneous mouse movement and multiple button holds |
| Screen magnifiers | A platform-level overlay | The game must remain legible when only a fraction of the frame is visible; keep critical information near the focus of attention |

Two game-side behaviours break these setups more than any others. The first is a single-active-device input model, which switches the game's prompt glyphs and sometimes its accepted input when a different device sends an event; an adaptive rig that combines a pad with a keyboard-emulating switch box then flickers between modes and drops input. Support concurrent devices and let the player pin the prompt style. The second is polling physical controls directly in gameplay code, which silently bypasses every remap and every activation mode the settings claim to offer.

Prompts must match the device the player is holding, including third-party and adaptive devices where the platform reports them, and must update immediately on rebinding — a tutorial that says "press A" after the player has moved that action to a switch has taught them nothing. Studio: drive prompts from the binding data through a single component used everywhere, and forbid literal glyph references in screens; this is the same rule that makes multi-platform prompts work, so it usually already exists and merely needs to be enforced.

## 4. Motor assistance in gameplay

Aim assist is an accessibility feature that most teams already ship without labelling it. The useful move is to expose its parameters rather than to hide them behind difficulty, so a player can dial in what they need: magnetism strength, friction near targets, snap-to-target on aim-down-sights, lock-on with a toggle, and target switching by discrete input rather than by fine analogue movement. Sticky targeting — where the reticle resists leaving a target once acquired — helps tremor and precision conditions more than raw magnetism does.

The rest of the set. Auto-run and auto-follow, so sustained stick pressure is not required for traversal. Auto-interact with an option for a proximity-based rather than aim-based interaction target. Navigation assistance in the form of a path indicator, since a player who cannot precisely steer is otherwise blocked by geometry rather than by challenge. Reduced-precision modes for any minigame that demands fine motor control — lockpicking, fishing, rhythm sections — with either an assisted variant or a skip. Adjustable dead zones and sensitivity curves per axis, which matters enormously for players with tremor, where a larger dead zone and a flatter curve near centre converts an unusable stick into a usable one.

Studio: treat every minigame and every one-off input mechanic as a potential progression wall and require an accessibility alternative in its design document before it is scheduled. The pattern that produces exclusion is not the combat system, which gets attention; it is the single hacking minigame in chapter nine that nobody thought about.

## Pass conditions

Answer yes to every applicable line before the game is considered to have met the floor.

1. Every action, including UI accept, cancel and back, is rebindable, and no action is silently unrebindable.
2. Chords and modifiers can be rebound and expressed in a form that does not require simultaneous presses.
3. Multiple input devices can be used simultaneously by one player, and bindings persist per device and per profile.
4. One-handed presets for left and right hands ship, and the game has been played through a rig of four switches and one stick.
5. Every hold action has a per-action hold-or-toggle setting, implemented in the input resolution layer.
6. Every button-mash prompt has a hold alternative of equal duration.
7. Every timing window has a multiplier setting extending to unlimited, applied consistently across parries, dodges and prompts.
8. Every quick-time event has an auto-complete or single-press alternative, and no single input capability is required to finish the game.
9. Aim assistance parameters, dead zones and sensitivity curves are exposed as settings rather than tied to difficulty.
10. Every minigame and one-off input mechanic has an accessibility alternative specified in its design document.
11. Prompts are driven from binding data through a single shared component, update immediately on rebinding, and match the connected device.
12. Rebinding conflicts are shown with the conflicting action named and a swap, clear or duplicate option offered.
13. The game accepts input from multiple devices concurrently and never locks to a single active device.
14. Stick dead zones and response curves are adjustable with a live visualisation in the settings screen.
