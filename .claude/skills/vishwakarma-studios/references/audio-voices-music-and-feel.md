# Audio systems: voice management, interactive music, game feel and latency

This part covers what is allowed to play and how it lands: how many voices exist and which survive contention, how music follows game state without losing musicality, what makes a hit feel like a hit, and why audio arriving late is read by the player as input lag. The bus tree, loudness targets and spatialisation these systems play into are in `audio-mix-loudness-and-space.md`.

## 1. Voice management: limits, priority, virtualisation, stealing

A voice is one playing instance consuming a mixer slot and CPU. Voice count is bounded by hardware and by the mix, and the bound must be explicit.

| Platform | Physical (audible) voices | Virtual voices |
|---|---|---|
| Current console | 48–128 | 256–1,024 |
| PC | 64–128 | 512–2,048 |
| Last-generation console | 32–64 | 128–512 |
| High-end mobile | 24–32 | 128–256 |
| Mid-range mobile | 12–24 | 64–128 |

**Virtualisation** is the mechanism that makes limits safe. A virtual voice continues to advance its playback position and update its parameters but is not mixed, so when it becomes audible again it resumes at the correct point rather than restarting. Without virtualisation, a looping engine sound that drops out and returns restarts from its beginning, which is audible and wrong. Wwise's virtual voice behaviour offers resume, restart, and play-from-elapsed-time per sound, and choosing correctly per category is a real design decision: loops resume, one-shots are killed, music plays from elapsed time.

**Priority and stealing.** Every sound carries a priority; when the voice pool is full, the lowest-priority instance is stolen. Effective priority must combine the category's authored priority with distance and recency, because a static priority makes the nearest enemy's footstep lose to a distant scripted ambient one-shot. A workable formula: effective = authored_priority − distance_penalty + recency_bonus, where distance penalty scales with normalised distance and recency bonus decays over 200–500 ms so a just-started sound is not immediately stolen by the next one.

Audibility culling is the other half of the mechanism and is frequently missing. A voice whose computed output level is below the mix's noise floor — in practice, more than roughly 60 dB below the loudest concurrent source, or below an absolute threshold of around −60 dBFS — contributes nothing audible while consuming a physical voice. Culling those to virtual before priority-based stealing runs typically frees 20–40% of the pool in a busy scene, at no perceptual cost, and it does it without any authoring decisions.

**Per-category voice caps** matter more than the global cap, because the global cap alone lets one category consume everything:

| Category | Cap | Steal behaviour |
|---|---|---|
| Player weapon | 4 | Oldest |
| NPC weapons | 8 | Furthest |
| Shell casings, debris | 4 | Oldest |
| Impacts | 10 | Furthest |
| Footsteps | 6 | Furthest |
| Physics / collisions | 8 | Quietest |
| Ambience beds | 4 | Never steal |
| VO dialogue | 2 (1 for the player) | Queue rather than steal |
| Barks | 3 | Lowest priority |
| UI | 4 | Oldest |
| Music | Unlimited within the music system | Never steal |

What happens without limits is specific and worth stating, because it is not merely "too loud". First, the voice pool exhausts and new sounds silently fail to start — including the one gameplay-critical sound the player needed. Second, masking: 40 simultaneous shell casings occupy the same 2–6 kHz band as footsteps, and the enemy flanking you becomes inaudible even though the sound is playing. Third, summing. Sixty incoherent copies of the same impact sum to roughly 10·log10(60) = 17.8 dB above one copy; sixty *coherent* copies — the same sample started on the same frame, which is exactly what a shotgun's pellet impacts do — sum to 20·log10(60) = 35.6 dB above one copy. That overload is what makes the master limiter pump and the whole mix duck, so a badly capped debris system audibly destroys the music.

The fix for the coherent-summing case specifically is not just capping but combining: detect that N instances of one sound would start within a small window and play one instance with a designed multi-impact sample instead, or apply a −20·log10(N) gain compensation.

## 2. Adaptive and interactive music

Two architectures, usually combined.

**Vertical layering** plays several stems in sync and mixes them by a game parameter — a combat intensity from 0 to 1 fading in percussion, then bass, then lead. Transitions are instantaneous and always in time, because the stems never stopped. Costs: all layers stream and decode simultaneously (four stems is four decoder instances and four times the streaming bandwidth), and the music must be composed as separable layers, which constrains the writing. Best for continuously varying intensity: combat, tension, exploration density.

**Horizontal re-sequencing** plays discrete segments and switches between them at authored transition points, optionally through dedicated transition segments. It supports genuine structural change — a different key, a different tempo, a real cadence — which layering cannot. Costs: latency, and authoring every transition pair.

**The musical-time versus game-time problem** is the core tension and it has real numbers. A transition quantised to the bar waits, on average, half a bar and at worst a full bar:

| Tempo | Beat | Bar (4/4) | Worst-case wait, beat quantised | Worst-case wait, bar quantised | Worst case, 2-bar phrase |
|---|---|---|---|---|---|
| 80 bpm | 750 ms | 3.00 s | 750 ms | 3.00 s | 6.00 s |
| 100 bpm | 600 ms | 2.40 s | 600 ms | 2.40 s | 4.80 s |
| 120 bpm | 500 ms | 2.00 s | 500 ms | 2.00 s | 4.00 s |
| 140 bpm | 429 ms | 1.71 s | 429 ms | 1.71 s | 3.43 s |
| 170 bpm | 353 ms | 1.41 s | 353 ms | 1.41 s | 2.82 s |

The player expects acknowledgement of a state change within roughly 200 ms. Nothing quantised to a bar can deliver that. The resolution is to split the response into two parts: an unquantised **stinger** fires immediately, keyed to the current harmonic context so it is consonant with whatever is playing, and the underlying bed changes at the next musically valid point. The player hears an instant response and a smooth structural change, and the fact that they happened at different times is imperceptible. Stingers are the highest-value feature in an interactive music system and are frequently omitted.

Additional mechanisms worth knowing. Solo: vertical layering with three stems and one stinger set. It is the cheapest architecture that sounds intentional, and it requires no transition authoring at all. Studio: both architectures combined, with a music designer owning the segment and marker graph, and a rule that every gameplay state the music responds to is enumerated in a single document — because the combinatorial growth of transition pairs is what makes interactive music systems become unshippable, and it is only visible when the state list is written down.

**Transition segments** are short purpose-composed bridges played between A and B, which solves the cases where a direct cut is harmonically impossible. **Exit and entry markers** let a segment specify where it can be left and where the next can be entered, so the system chooses the nearest valid pair. **Tempo-synced gameplay** — quantising gameplay events to the music rather than the reverse — is a genre choice that resolves the whole problem, at the cost of constraining design. **Sample-accurate scheduling** matters: music transitions scheduled on the game thread land at frame boundaries, which at 60 fps is up to 16.7 ms of error, audible as a flam on a downbeat. Schedule music events on the audio timeline (Wwise and FMOD both do this natively; Unity requires `AudioSettings.dspTime` rather than `Time.time`), not on the game clock.

## 3. Audio-driven game feel

The subjective quality of a hit, a jump or a pickup is mostly audio, and it decomposes into a small number of mechanisms.

**The attack transient is the event.** The first 5–30 ms of a sound is what the auditory system uses to detect onset and identify the source; it is what the player perceives as "the hit landed". A sound with a soft attack reads as weak regardless of how loud its body is, and a sound whose transient is flattened by over-compression reads as weak no matter how it was recorded. Preserve transients: use limiting rather than compression on impact buses, keep attack times above 5 ms on any compressor in the impact chain, and check that the sample itself begins at the transient with no leading silence — even 20 ms of leading silence is a perceptible delay on a responsive action.

**The three-layer rule for impacts.** Any impactful sound is built from three layers with distinct frequency content and duration:

| Layer | Duration | Frequency emphasis | Communicates | Example, sword on shield |
|---|---|---|---|---|
| Transient / attack | 5–30 ms | 2–8 kHz, broadband click | That it happened, and precisely when | Metallic clang onset |
| Body | 30–250 ms | 150 Hz–2 kHz | Material and mass | Shield's resonant ring |
| Tail | 250 ms–2 s | Low-mid, plus reverb | Size of the space and of the event | Room decay, distant reflection |

Getting the balance wrong has predictable symptoms: no transient reads as mushy and unresponsive; no body reads as thin and toy-like; no tail reads as small and dry, as though the event happened in a closet. When a designer says a weapon "lacks punch", the missing layer is almost always the body; when they say it "feels laggy", it is the transient.

**Pitch and variation to defeat repetition fatigue.** Identical repetition of a sample becomes consciously noticeable at around three to five repeats within ten seconds, and it is the clearest signal of cheapness available. Defeat it with, in order of effect: multiple sample variants (3–5 per common sound, 8–12 for footsteps and weapon fire), random pitch variation of ±2 to ±3 semitones (playback rate 0.89–1.12), random volume of ±1.5 to ±2.5 dB, and randomised layer combination so the transient from variant 2 combines with the body from variant 4. Pitch beyond about ±4 semitones changes the perceived size of the source, so a footstep pitched up sounds like a smaller creature — that is a bug, not variation.

Use round-robin *without replacement* rather than pure random selection. Pure random over 4 variants produces an immediate repeat 25% of the time, and immediate repeats are exactly what the ear detects. Shuffled round-robin guarantees all variants play before any repeats, which with 4 variants makes an immediate repeat impossible except across shuffle boundaries.

**Frequency separation is what makes a dense mix legible.** Two sounds occupying the same band at the same level mask each other, and the auditory system resolves the conflict by discarding one — usually the quieter, which is usually the gameplay-critical one. Assign each category a primary band and carve the others out of it with narrow EQ cuts rather than raising the important sound's level, because raising level costs headroom and carving costs none.

| Category | Primary band | Carve from |
|---|---|---|
| Dialogue and barks | 300 Hz – 3.4 kHz | Music, ambience, foley |
| Weapon fire | 80–250 Hz body, 2–6 kHz crack | Impacts, physics |
| Footsteps (informative) | 1–4 kHz | Foley, debris, casings |
| Music | Full range, ducked | — |
| Ambience | Below 200 Hz and above 6 kHz emphasis | Everything mid |
| UI | 2–8 kHz, short | Nothing; it wins by design |

**Hit-stop and silence.** A 40–90 ms gap immediately after an impact transient makes the impact read as harder, because the contrast is what the ear measures. Silence is an audio design tool with no CPU cost and it is under-used.

## 4. Latency and the audio-visual sync window

Output latency is buffer size divided by sample rate, times the number of buffers.

| Buffer size at 48 kHz | Per-buffer time | Typical total output latency | Platform |
|---|---|---|---|
| 128 samples | 2.67 ms | 5–8 ms | PC with a good driver, pro audio |
| 256 samples | 5.33 ms | 11–16 ms | PC default, console |
| 512 samples | 10.67 ms | 21–32 ms | Console conservative, mobile good case |
| 1024 samples | 21.33 ms | 43–64 ms | Mobile default |
| Android AAudio low-latency | — | 10–30 ms | Device-dependent; varies enormously |
| Android legacy path | — | 40–150 ms | Older devices |
| Bluetooth SBC | — | +100–300 ms | Outside your control |
| Bluetooth aptX Low Latency | — | +40 ms | Outside your control |

The **audio-visual sync window** is asymmetric, because in the physical world light arrives before sound and never the reverse, so the auditory system tolerates audio lagging video far more readily than leading it. Detection thresholds are roughly 45 ms for audio leading video and roughly 125 ms for audio lagging. Broadcast tolerances codify similar asymmetry. For pre-rendered content those numbers are the whole story.

For interactive content the tolerance is much tighter, and the mechanism is worth stating precisely: **audio lag reads as input lag**. When a player presses a button, they form a judgement about whether the input registered from the *earliest* sensory confirmation available, and audio is frequently earlier and always sharper than the visual, because an animation's visible change takes several frames to become unambiguous while a transient is instantaneous. A game whose audio confirmation arrives 80 ms after the press feels unresponsive even if the game logic responded on frame one and the animation started immediately. This is why audio latency is a game feel problem owned by the whole team, not an audio department problem.

The budget arithmetic, for a 60 fps game targeting a 100 ms input-to-confirmation window:

| Stage | Cost |
|---|---|
| Input polling latency (up to one frame) | 0–16.7 ms |
| Game logic to the trigger call | 16.7 ms |
| Audio engine command latency (next audio callback) | 5–21 ms |
| Output buffer latency | 11–32 ms |
| Display latency (panel, not yours) | 10–40 ms |
| **Total controllable by you** | **33–70 ms** |

That leaves very little slack, and it means: use the smallest buffer the platform sustains without underruns; do not add a frame of scheduling delay by queueing audio triggers to be processed next frame; and never gate a gameplay-confirming sound behind an animation event that fires several frames in. Fire the confirmation sound at the moment the input is accepted, and let the animation catch up.

Measure it rather than reasoning about it: record the screen and the audio output together at 120 or 240 fps, and count frames between the button press and the transient. This takes twenty minutes and settles arguments that otherwise run for weeks.

## Pass conditions

Answer yes to every applicable line before the audio system is considered correct.

1. Global voice limits are set per platform and per-category caps exist for every category, with virtualisation behaviour chosen per sound type.
2. Voice stealing uses an effective priority combining authored priority, distance and recency, and coherent simultaneous instances of one sound are combined or gain-compensated.
3. Music transitions are scheduled on the audio timeline, not the game clock, and any state change the player triggers is acknowledged by an unquantised stinger within 200 ms.
4. Every impactful sound is built from a transient, a body and a tail, and no compressor in the impact chain has an attack time under 5 ms.
5. Common sounds have at least 3–5 variants with shuffled round-robin selection, pitch variation within ±3 semitones and volume variation within ±2.5 dB.
6. No sample has leading silence before its transient.
7. Output buffer size is the smallest the platform sustains without underruns, and no audio trigger is queued for processing on a later frame.
8. Input-to-audio latency has been measured with a high-frame-rate recording of screen and audio together, and is inside a stated budget.
9. Gameplay-confirming sounds fire when the input is accepted, not from an animation event several frames later.
