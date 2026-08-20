# Accessibility in Games: Audio, Cognition, Multiplayer and Narration

Once the game can be controlled and seen, the remaining exclusions are in what it says, what it demands the player hold in mind, and how it behaves with other people in it. This part covers subtitles and closed captions, the audio mix, cognitive load and difficulty axes, multiplayer communication and competitive integrity, and self-voiced menus for blind and low-vision play. Visual presentation is in `accessibility-visual-and-motion.md`; input is in `accessibility-input-and-motor.md`.

## 1. Subtitles and captions

Subtitles are the most-used accessibility feature in games by a large margin — enabled by around half of all players in many territories, and by a clear majority of younger players — which means subtitle quality is a mainstream quality issue that happens to also be an accessibility requirement.

The requirements. Speaker identification on every line, by name and preferably by a per-speaker colour that is not the only cue. A background plate with an opacity slider from 0 to 100%, defaulting to around 75%, because text over an arbitrary moving scene has no reliable contrast without one. Size options from 100% to at least 200%, with the layout reflowing. Line length capped at roughly 40 characters and no more than two to three lines at once. Timing that respects a reading rate of about 160–180 words per minute, which means a line that is spoken faster than it can be read stays on screen slightly longer or is split. Subtitles for every spoken line in the game including incidental barks, radio chatter and background conversation, with a separate toggle for ambient dialogue so a player can suppress the clutter without losing plot lines.

Closed captions are the distinct and more often missed feature: descriptions of non-speech audio that carries information. A door opening behind the player, a reload click, a footstep on gravel, a distant explosion, a boss telegraph, a music sting that signals a phase change — every one of those is gameplay information delivered through audio, and a deaf player without captions is playing a different and harder game. Caption the events that matter mechanically rather than every sound, mark direction where direction matters, and combine with the visual indicators in section 2.

Studio: enforce that no subtitle string is composed by concatenation, because concatenated fragments break translation and break speaker attribution simultaneously. Provide a subtitle debug overlay showing the string key and the audio event, because LQA and accessibility testing both need to name what is wrong.

## 2. Audio mix accessibility

An audio mix carries information, and the mix is where a substantial amount of accessibility work either happens or fails to.

Separate volume sliders per bus, at minimum master, music, sound effects, dialogue, ambience and user interface, each independently adjustable to zero. The mechanism is that a player with hearing loss in a particular frequency range, or with an auditory processing difference, needs to change the balance rather than the level; a single master slider makes speech and explosions louder together, which is precisely the wrong result. Add a dialogue boost or a dynamic range compression option, which raises quiet speech relative to loud effects and is the single most requested audio accessibility setting after subtitles.

Provide a mono mix toggle. A player with single-sided deafness receives only one channel of a stereo mix, which means any content panned to the other side is simply absent — not quieter, absent. A mono downmix is a small amount of signal path work and it restores the whole content of the mix to that player. Do not implement it by disabling one channel.

Provide visual indicators for directional audio: a damage direction indicator, a footstep or proximity indicator, and telegraph indicators for attacks whose only current warning is a sound. In competitive games this is contentious because directional audio is a skill channel, and the resolution is to make the indicator a setting rather than to withhold it, since a player who cannot hear the cue is not gaining an advantage by receiving it visually.

Finally, do not require a specific output configuration. A game mixed on the assumption of headphones with head-related transfer function processing should still be legible on television speakers and on a mono speaker; check the mix on all three, and provide an output configuration setting so the player can tell the game what they are actually listening on.

Haptics are an underused redundant channel and a place where accessibility and game feel align: a controller rumble pattern distinct enough to identify carries damage direction, low health, cooldown completion or a telegraph to a player who cannot use the audio or visual channel. Expose haptic intensity as a slider including zero, since the same feedback is painful or overwhelming for some players, and never make haptics the only channel for anything.

## 3. Cognitive accessibility and difficulty by axis

Difficulty as a single slider is a design convenience, not a model of players. A player may have excellent tactical judgement and poor reaction time, or precise motor control and difficulty holding multi-step objectives in working memory. A single axis forces them to lower everything to reach the one thing they need, which strips out the parts of the game they were enjoying.

Separate the axes and let the player set each. The set that covers most games:

| Axis | What it controls | Typical range |
|---|---|---|
| Combat | Damage taken and dealt, enemy count, aggression | 25–200% damage taken, with an invulnerability option at the extreme |
| Timing | Parry, dodge and reaction windows, QTE timers | 1x to unlimited |
| Puzzle | Hint availability, hint delay, solution reveal, skip | Off, hints after a delay, hints on demand, skip |
| Resource | Ammunition, healing and currency scarcity | Scarce to abundant |
| Stealth | Detection speed, enemy vision cones, forgiveness after detection | Strict to forgiving |
| Platforming | Jump forgiveness, fall damage, ledge assist, checkpoint density | Standard to assisted |
| Pace | Global game speed | 50–100% where the design permits |

Global game speed deserves a note because it is the most powerful and the most under-shipped of these. Reducing simulation speed to 70% while keeping input responsive makes a large class of reaction-dependent games playable for players with slower reaction times or with motor conditions that add latency to their inputs, and it costs a time-scale multiplier plus a lot of testing for physics and animation systems that assumed a fixed rate. It is cheap in a project that used a scalable time step from the start and awkward in one that did not — see `game-loop-and-time.md`.

Beyond difficulty, the cognitive load features are navigational and mnemonic. Objective markers with distance, and an option to make the current objective persistent on screen. A recap of the story so far, available at any time. Replayable tutorials, and a tutorial index rather than a one-shot popup at first encounter — the mechanic taught in hour three is needed in hour twenty. A glossary for invented terminology. Pause in every context the design allows, including cutscenes, inventory and dialogue, and a genuine pause rather than a menu that leaves the simulation running; in online games where pausing is impossible, provide a safe disengagement path instead. Reduce the reliance on memorised sequences by keeping the information visible.

Failure feedback is a cognitive accessibility issue that is usually treated as a tuning issue. A player needs to know why they failed, and a death that produces only a reload teaches nothing to a player who cannot infer the cause from a fast-moving scene. Name the cause where the design permits — the attack that killed you, the requirement you missed, the resource you lacked — and make checkpoint density and retry latency settings rather than fixed constants, since a twenty-second retry loop excludes players with limited session time and limited stamina as surely as a hard boss does.

## 4. Multiplayer, communication and competitive integrity

Multiplayer adds three problems that single-player accessibility work does not encounter, and each has an established answer.

Communication is a legal obligation as well as a design one. Text chat must be available wherever voice chat is, with adjustable text size and a background plate; voice chat should offer speech-to-text transcription and text-to-speech output so a player can participate through the modality available to them; and both must be usable without an input the player cannot produce. Non-verbal communication systems — contextual pings, wheel-based callouts, drawn map markers — carry a large fraction of the tactical content of voice chat at a fraction of the input cost, and they benefit every player in a public lobby, which is why they have spread across the genre.

Pausing cannot work the way it does in single-player, so provide the nearest available equivalents: a way to disengage safely, generous reconnection windows with the character remaining in play or safely removed, no penalty for a disconnect that the game can identify as involuntary, and clear indication of how long a mode will run before the player commits to it. A player who needs to stop for a medical reason and is punished for it has been excluded from the mode.

Competitive integrity is where teams hesitate, and the resolution is to reason about what the assist actually provides. Settings that restore access to information the game already gave everyone — visual indicators for audio cues, colour redundancy, subtitles, text size, remapping — are not advantages and belong in ranked play without restriction. Settings that change the game's difficulty — damage scaling, aim magnetism beyond the shipped baseline, timing windows — are legitimately restricted in ranked contexts, and the correct handling is to keep them available in every other mode rather than to remove them from the game. Matchmaking should never segregate players by their accessibility settings, because a segregated queue is a smaller queue with longer waits and it identifies the player's disability to the system.

Sensitivity and dead zones deserve one further note because the default values exclude people silently. A default dead zone tuned for a new controller is too small for a worn stick and far too small for a player with tremor, whose resting hand produces continuous small deflections that the game reads as intent. Expose inner and outer dead zones per stick, an adjustable response curve, and an axis-independent sensitivity, and provide a live visualisation in the settings screen so the player can tune it by observation rather than by trial in combat.

## 5. Menu narration and playing without sight

Blind and low-vision play is where the difference from web accessibility is starkest. There is no accessibility tree to expose, platform screen readers do not read into the game's rendered output, and so the game must speak for itself. Self-voicing is the mechanism: the game reads its own interface aloud through a text-to-speech path.

The implementation. Route every focusable UI element through a narration layer that speaks its label, its type, its state and its position in the list when it receives focus, using the platform's text-to-speech service where one exists and a bundled engine where it does not. Provide speech rate, volume and voice selection. Speak transient information — notifications, damage, pickups — through a separate channel with an interruption policy, so a critical prompt is not queued behind a long menu description. Ensure every element has a label that is written for speech rather than derived from a truncated visual string.

Beyond menus, full blind play requires gameplay information to be audible: audio navigation cues with distance and direction, an audio scan or ping that describes nearby objects and exits, audio cues for aim alignment, and a menu-driven alternative to any spatial task. This is a substantial design commitment and a small number of titles have done it well; it is legitimate to scope it deliberately rather than to attempt it partially. What is not legitimate is shipping menus that cannot be navigated, because that excludes players from the settings that would have made the rest of the game playable.

Low vision is the larger population and is served by different features from blindness: text and UI scaling as covered in `accessibility-visual-and-motion.md`, a high-contrast mode, HUD repositioning, camera zoom or a larger default framing, and compatibility with the platform magnifier — which mainly means not fighting it, since a game that captures the pointer, forces resolution changes or renders critical information at the screen edges is hostile to magnification without ever failing a checklist item.

## Pass conditions

Answer yes to every applicable line before the game is considered to have met the floor.

1. Subtitles are on by default, identify the speaker, have a background opacity slider and a size setting, cap line length, and cover every spoken line including barks.
2. Closed captions describe mechanically relevant non-speech audio with direction where direction matters.
3. Volume sliders exist per bus with a dialogue boost or dynamic range option, and a mono downmix toggle is implemented as a downmix rather than a channel disable.
4. Visual indicators exist for directional damage, proximity and any attack telegraph whose only cue is audio.
5. Difficulty is separated into combat, timing, puzzle, resource, stealth and platforming axes, each independently settable, with a game speed option where the architecture permits.
6. Pause works in every context the design allows, tutorials are replayable and indexed, and objectives and story recaps are available at any time.
7. Menus are fully navigable and narrated through a text-to-speech path with rate and voice control, and every focusable element has a label written for speech.
8. Text chat is available wherever voice chat is, with transcription and text-to-speech options, and non-verbal communication covers the tactical content of voice.
9. Involuntary disconnection carries no penalty where it can be identified, and reconnection windows are generous.
10. Accessibility settings that restore access to shared information are permitted in ranked play, and matchmaking never segregates players by their settings.
11. Checkpoint density and retry latency are settings, and failure feedback names the cause where the design permits.
12. Haptic intensity is adjustable including zero, and no information is carried by haptics alone.
13. The game does not fight the platform magnifier: no forced resolution changes, no pointer capture, no critical information pinned to screen edges without an alternative.
