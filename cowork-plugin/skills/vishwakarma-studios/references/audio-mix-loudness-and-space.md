# Audio systems: mixing architecture, loudness and spatialisation

Audio is the most-cut and the most-noticed system in game development. It is scheduled last, staffed thinnest and reviewed least, and it is the single strongest signal players use to judge whether a game is expensive or cheap — a beautifully rendered game with thin, repetitive, badly mixed audio reads as a student project, while a modestly rendered game with excellent audio reads as confident and deliberate. The mechanism is perceptual: hearing has no equivalent of the eye's saccadic suppression, it runs continuously and pre-attentively, and the auditory system is specialised for detecting repetition and inconsistency. Players cannot articulate what is wrong, but they reliably detect that something is.

Engine and middleware specifics are named where they differ: Wwise, FMOD Studio, Unreal MetaSounds and Submixes, Unity's AudioMixer, Godot's AudioServer buses.

This part covers the mix's structure and how sound is placed in the world. Voice limits, interactive music and impact design are in `audio-voices-music-and-feel.md`; middleware, integration, memory, latency, captions and the mixing workflow are in `audio-middleware-integration-and-delivery.md`.

## 1. Mixing architecture: buses, submixes, ducking

A bus is a summing point with processing. The bus graph is the mix's architecture, and getting it right at the start costs an hour; retrofitting it after 2,000 sounds exist costs weeks, because every asset's routing must be revisited.

A starting layout that survives production:

| Bus | Parent | Typical gain relative to master | Processing | Why it exists separately |
|---|---|---|---|---|
| Master | — | 0 dB | Limiter at −1 dBTP, platform loudness trim | Final safety and platform compliance |
| Music | Master | −6 to −10 dB | Gentle compression, ducking receiver | Must be separately attenuable; players turn music down |
| SFX | Master | 0 dB | — | Parent for all diegetic non-voice audio |
| — Weapons | SFX | 0 dB | Transient-preserving limiter | Loudest, most repeated category; needs its own voice cap |
| — Impacts | SFX | −2 dB | — | Distinct voice budget from weapons |
| — Foley | SFX | −8 to −12 dB | — | Quiet, dense, first to be masked |
| — World / physics | SFX | −6 dB | — | Emergent and unbounded; needs its own cap |
| Ambience | Master | −12 to −18 dB | High-pass, slow crossfades | Continuous bed; must never fight foreground |
| VO | Master | +2 dB relative to SFX | Compression 3:1, de-esser, ducking sender | Intelligibility outranks everything |
| — Dialogue | VO | 0 dB | — | Story-critical; highest priority |
| — Barks | VO | −3 dB | — | Gameplay-informative; own voice cap |
| — Radio / comms | VO | −2 dB | Band-pass 300 Hz–3.4 kHz, light distortion | Deliberate processing chain |
| UI | Master | −6 dB | Non-spatialised, no reverb send | Must be audible regardless of world state and unaffected by occlusion |
| Cinematic | Master | 0 dB | Ducking sender | Takes over the mix during non-interactive sequences |

**Ducking** attenuates one bus when another is active. **Sidechaining** does the same but drives the attenuation from the *signal* of the trigger bus through a compressor's sidechain input, so the duck follows the actual envelope rather than a boolean. Both matter, for different jobs. Use a boolean-triggered duck for state changes — the pause menu opens, ambience drops 12 dB — because it is predictable and testable. Use sidechain compression for VO over everything else, because dialogue has natural gaps and a sidechain lets the mix breathe back in between phrases where a boolean duck would leave a hole.

Standard ducking values worth starting from: VO ducks music by 6–9 dB and SFX by 3–5 dB, with a 30–60 ms attack and a 300–600 ms release. Attack faster than 20 ms produces an audible pump on the first syllable; release shorter than 200 ms produces a chattering mix during rapid dialogue. Cinematic ducks ambience by 10–15 dB. A pause menu ducks everything except UI by 12–20 dB or bypasses to a dedicated snapshot.

Sends are the other half of the routing model and are worth distinguishing explicitly: a bus routes a signal, a send copies a proportion of it elsewhere. Reverb, delay and any parallel processing use sends, so a source contributes to a reverb without leaving its own bus, and the reverb's level can then be controlled independently of the dry signal. A design that routes sources *through* a reverb bus instead of sending to it loses that independence permanently.

**Snapshots** (Wwise States, FMOD Snapshots, Unity AudioMixer Snapshots) capture a whole mix state and interpolate between them, which is the correct mechanism for anything global: underwater, low health, sniper scope, death, menu. They are strictly better than scripting individual bus gains, because a snapshot is a single reviewable artefact a sound designer can edit without a programmer.

One structural rule that saves a rebuild later: buses exist to be controlled together, not to mirror the folder structure of the asset library. If two categories will never be attenuated, ducked, muted or routed independently, they do not need separate buses, and every unnecessary bus costs a small amount of CPU and a large amount of decision surface. The test for whether a bus should exist is whether you can name the game state in which it moves independently of its parent.

Solo: five buses (master, music, SFX, VO, UI), one duck rule, and snapshots for pause and death. Studio: the full tree above, owned by a mixer whose job includes maintaining it, with bus routing validated automatically so a new asset cannot ship routed directly to master.

## 2. Loudness: LUFS targets and dynamic range

Peak metering is not loudness metering. A peak meter reports the highest sample value; loudness meters report perceived level integrated over time with a frequency weighting that approximates the ear. Mixing to peak is why quiet-sounding games clip and loud-sounding games measure quietly.

| Measure | What it reports | Use for |
|---|---|---|
| LUFS integrated | Perceived loudness over a whole session | Overall mix target |
| LUFS short-term (3 s) | Loudness of the current moment | Balancing scenes against each other |
| LUFS momentary (400 ms) | Instantaneous loudness | Catching individual sounds that jump |
| LRA (loudness range) | Spread between quiet and loud passages | Whether the mix has dynamics |
| True peak (dBTP) | Inter-sample peak after reconstruction | Clipping safety, codec headroom |
| PLR (peak to loudness ratio) | Headroom above average level | Whether the mix is over-compressed |

Targets. The interactive audio industry recommendation (ASWG-R001) is −23 LUFS integrated with true peak at or below −1 dBTP, measured over a representative 30-minute gameplay session including its quiet and loud passages. In practice, console mixes land between −20 and −24 LUFS integrated; PC titles sit slightly hotter at −18 to −22 because playback environments are less controlled; mobile targets −16 to −18 because it is played through small speakers in noisy environments and the extra 5 dB is the difference between audible and not. Platform certification requirements exist for some publishers and platforms and must be checked per title — they are compliance items, not preferences.

The −1 dBTP ceiling is not conservatism. Lossy codecs (the platform's own streaming compression, and any capture or broadcast path the player uses) can overshoot the original sample peaks by 0.5–1.5 dB during reconstruction, so a mix limited to 0 dBFS clips after transcoding on a stream even though it measured clean locally.

**Dynamic range is the part that gets destroyed.** Loudness normalisation means a heavily compressed mix and a dynamic mix play back at the same perceived level, so compression buys nothing and costs everything. Target a PLR of 12–18 dB for a cinematic console mix. Below about 8 dB the mix is in loudness-war territory: every sound is at the ceiling, nothing can be louder than anything else, so a gunshot cannot be more impactful than a footstep, transients are flattened, and after twenty minutes the player is fatigued in a way they will attribute to the game being tiring rather than to the mix. The fatigue mechanism is concrete — constant high-level stimulation with no dynamic variation prevents the auditory system's normal adaptation, and it is measurable as a drop in session length.

Ship dynamic range presets and default to the middle one:

| Preset | LRA target | PLR | Use |
|---|---|---|---|
| Full / cinematic | 14–20 LU | 16–18 dB | Home theatre, headphones, quiet room |
| Standard (default) | 9–14 LU | 12–14 dB | TV speakers, most players |
| Night / compressed | 5–8 LU | 8–10 dB | Late-night play, shared spaces, small speakers |

Solo: measure integrated LUFS on a 30-minute capture once per milestone with any free loudness meter, and put a limiter at −1 dBTP on the master. Studio: continuous loudness measurement in automated playthroughs per level and per mix state, with a report that flags any scene more than 3 LU from the target.

## 3. Spatialisation: panning, attenuation, HRTF

Spatialisation is three separable problems — direction, distance, and environment — and they are usually solved by different systems with different costs.

**Direction** at its simplest is amplitude panning across the output channels. Vector-base amplitude panning generalises this to arbitrary speaker layouts. It costs essentially nothing and it localises adequately in the horizontal plane and not at all in elevation. **HRTF** convolves the signal with a head-related transfer function that encodes how the listener's head, torso and pinnae filter sound by direction, which produces genuine 3D localisation including elevation and front-back discrimination, over headphones only. Cost is 0.05–0.2 ms of CPU per spatialised source for a convolution-based implementation (Steam Audio, Oculus Audio, Sony Tempest, Microsoft Spatial Sound), which caps practical HRTF source counts at roughly 16–32 simultaneously. Budget accordingly: spatialise the sources whose direction is gameplay-relevant — enemies, gunfire, footsteps — and use cheap panning for everything else.

Solo: use the engine's built-in panner, HRTF only if the game is headphone-first, and spend the saved effort on distance filtering instead — it buys more perceived quality per hour than any spatialiser. Studio: HRTF with a stated source budget, geometry-driven propagation in interiors, and a listener model decided explicitly (camera position, player position, or an interpolation between them — a third-person game placing the listener at the camera makes footsteps sound distant, and placing it at the character makes the world sound off-axis; most ship an interpolation weighted 70% toward the character).

**Distance attenuation** is where physical correctness and gameplay legibility diverge, and it is worth being explicit about the divergence. A point source in a free field loses 6 dB per doubling of distance, which is the inverse-square law. Applied literally, a sound audible at 1 m is 40 dB down at 100 m and effectively gone, which is correct physics and terrible gameplay — a player needs to hear gunfire at 150 m in a shooter. Games therefore use authored curves:

| Curve region | Behaviour | Typical range for gunfire | Reason |
|---|---|---|---|
| Inner / minimum distance | No attenuation | 0–3 m | Prevents the level exploding as the listener approaches |
| Near falloff | Approximately inverse square | 3–25 m | Physically plausible where the ear expects it |
| Mid falloff | Shallower than physical, roughly 3–4 dB per doubling | 25–120 m | Keeps distant events legible |
| Outer / maximum distance | Silence, source virtualised | Beyond 150–400 m | Bounds the voice count |

Distance also changes timbre, and ignoring this is why distant sounds in weak mixes sound like quiet near sounds. Air absorbs high frequencies at roughly 1–4 dB per 100 m at 4 kHz and considerably more at 10 kHz, so a low-pass filter whose cutoff falls with distance — from bypass at 10 m to roughly 2–4 kHz at 200 m — is what actually makes distance read. Pair it with a distance-driven reverb send that increases with distance (a far sound is mostly reflected energy) and with distinct near/mid/far sample layers for important sounds such as weapons, where a distant gunshot is a genuinely different recording, not a filtered near one.

## 4. Occlusion, obstruction, reverb zones, and their cost

**Occlusion** is the direct path and the reflected path both blocked: the listener is in a different room. Apply attenuation of 6–15 dB plus a low-pass at 500 Hz–2 kHz, and reduce the reverb send toward the *listener's* space. **Obstruction** is the direct path blocked while the reflected path is open: a pillar between listener and source in the same room. Apply a low-pass and attenuation to the direct signal only and leave the reverb send intact, which is what makes the source still feel present in the room. Getting these two the same way round is the difference between "muffled" and "behind something".

The cost is raycasting, and the mistake is doing it per source per frame. A scene with 40 active sources casting one ray each per frame at 60 fps is 2,400 rays per second on the physics thread, and doing three rays per source for a spread test triples that. Instead: update occlusion at 5–10 Hz, stagger sources across frames so a fixed number update per frame, use a cheap distance and portal test to skip sources that cannot be occluded, and interpolate the resulting filter and gain over 100–300 ms so the transitions are not audible as steps. Interpolation is not optional — an instantly applied occlusion filter clicks.

**Reverb.** Algorithmic reverb (feedback delay networks) costs roughly 0.05–0.15 ms per instance; convolution reverb with a real impulse response costs 0.3–0.8 ms per instance and sounds materially better for distinctive spaces. Budget 3–6 concurrent reverb instances on console and 1–2 on mobile. Sources feed reverbs through sends, so instance count is independent of source count — 60 sources can share 4 reverbs.

Zone-based reverb assigns a reverb preset to a volume, and the failure is at boundaries: a hard switch as the listener crosses a doorway is instantly noticeable. Blend between the two zones over the transition region, or use multiple simultaneous sends weighted by proximity. Wwise's Rooms and Portals and Steam Audio's geometry-based propagation do this properly, including sending a source's sound through the portal geometry so a sound in the next room arrives from the doorway rather than through the wall — which is the single most convincing spatial cue available and is worth its cost in any game with interiors.

## Pass conditions

Answer yes to every applicable line before the audio system is considered correct.

1. A bus tree exists with at least music, SFX, VO, ambience and UI as separate buses, and no asset routes directly to master.
2. Ducking rules are defined with explicit dB values, attack and release times, and VO ducking uses sidechain rather than a boolean where dialogue has natural gaps.
3. Global mix states are implemented as snapshots rather than as scripted per-bus gain changes.
4. Integrated LUFS is measured over a representative 30-minute session per milestone against a stated target, with true peak at or below −1 dBTP.
5. PLR is at or above 12 dB for the default preset, and at least two dynamic range presets ship with the standard one as default.
6. Distance attenuation uses authored curves with an inner radius, and distance-driven low-pass filtering and reverb send are applied, not gain alone.
7. Important repeated sounds (weapons, explosions) have distinct near, mid and far sample layers rather than one filtered recording.
8. HRTF spatialisation is limited to a stated source count, with cheap panning for everything else, and the count is measured against a CPU budget.
9. Occlusion and obstruction are distinguished, with obstruction leaving the reverb send intact, and both are interpolated over 100–300 ms rather than applied instantly.
10. Occlusion raycasts run at 5–10 Hz staggered across frames, with a stated maximum ray count per frame.
11. Reverb instance count is capped per platform, and zone transitions blend rather than switch.
12. The listener model is decided explicitly and documented, not left at the engine default.
