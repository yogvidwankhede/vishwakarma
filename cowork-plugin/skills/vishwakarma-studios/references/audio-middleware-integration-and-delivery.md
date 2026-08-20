# Audio systems: middleware, integration, memory and delivery

This part covers everything between the sound designer's intent and the shipped build: which toolchain to adopt, how gameplay code talks to it, what audio costs in memory and CPU, how latency reaches the player as game feel, what accessibility hooks the architecture must carry, and how the mix is debugged and kept honest. The mix structure, loudness targets and spatial model these decisions serve are in `audio-mix-loudness-and-space.md`; voice limits, music, impact design and latency are in `audio-voices-music-and-feel.md`.

## 1. Middleware: FMOD, Wwise, engine-native

| | Wwise | FMOD Studio | Engine-native (MetaSounds, Unity AudioMixer, Godot) |
|---|---|---|---|
| Authoring | Standalone tool, deep; steepest learning curve | Standalone tool, DAW-like; friendliest | In-engine; MetaSounds is genuinely strong, others are basic |
| Interactive music | Best in class: segments, markers, transitions, stingers | Very good | Requires building it yourself |
| Profiler | Excellent: live voice list, bus levels, CPU, memory, remote to console | Very good | Limited |
| Spatial audio | Rooms and portals, geometry-driven diffraction, HRTF plugins | Good; third-party plugins | Basic to good (Unreal's is improving) |
| Procedural synthesis | Source plugins | Programmer sounds | MetaSounds is the strongest here |
| Iteration without a programmer | Complete | Complete | Partial |
| Console support | Full, mature | Full, mature | Full |
| Licensing shape | Free under a project budget threshold with limited platforms; per-title per-platform fees above | Free under a revenue threshold; tiered indie and pro per-title pricing | Included |

The threshold at which middleware pays for itself is organisational rather than technical: it is the point at which a dedicated sound designer exists who is not a programmer. Below that point, the tool's authoring power is unused and its integration cost is pure overhead. Above it, the difference is that a designer can change the mix, add variants, re-balance a bus and retune an attenuation curve without a code change, a build, or anyone else's time — and audio requires hundreds of such iterations, so a workflow that routes each through an engineer will produce audio that is finished once and never refined.

Secondary thresholds that push toward middleware: more than roughly 200 distinct sounds; any adaptive music beyond a crossfade; multi-platform shipping where per-platform compression and memory budgets must differ; and the need for a live profiler connected to a running console build, which is genuinely hard to replicate and is the tool that resolves most "why did that sound not play" questions in seconds.

Solo: engine-native, or FMOD for its lower learning curve, and only if you are doing adaptive music. Unreal's MetaSounds is now good enough that a solo developer on Unreal has no strong reason to add middleware unless the music system demands it. Studio: Wwise or FMOD, chosen once, with an integration owner; the licensing cost is negligible against one audio programmer's salary and the profiler alone justifies it. Check the licence terms per title, per platform and against your funding structure before committing, because both vendors' thresholds are defined by budget or revenue in ways that interact with publishing deals.

## 2. Integration: events, parameters, banks, and CPU cost

The interface between gameplay code and audio determines how much of the audio work needs a programmer, which determines how good the audio gets. Three rules.

**Gameplay posts events, it does not play assets.** Code calls `PostEvent("Play_Weapon_Rifle_Fire")` and knows nothing about which samples, how many layers, what pitch randomisation, what attenuation curve or what bus. A sound designer can then replace a single-sample gunshot with a five-layer randomised construction, change its attenuation, add a distance-based tail and re-route it, without touching code or rebuilding. The moment gameplay code references an asset directly, every future audio change becomes an engineering ticket, and audio stops improving.

**Continuous state travels as parameters, not as events.** A real-time parameter (Wwise RTPC, FMOD parameter, MetaSounds input) carries a continuous value — vehicle RPM, combat intensity, player health, wind strength, distance to objective — and the sound designer maps it to whatever they need: pitch, filter cutoff, layer crossfade, music intensity. The programmer's contract is to publish accurate, well-scaled values at a stated update rate (10–30 Hz is enough for almost everything; per-frame updates are wasted bandwidth for a parameter smoothed over 200 ms anyway) and nothing more.

**Sound banks are a loading problem, not an audio problem.** A bank is a unit of audio content loaded and unloaded together. The failure at studio scale is one enormous bank: everything is resident, memory blows the budget, and load times climb. The working scheme is a small always-loaded bank (UI, player, common impacts, music system) plus per-level or per-region banks loaded with the streaming system, plus per-character and per-weapon banks loaded when that content is spawned. Bank loads are asynchronous and take 10–200 ms, so anything that can be triggered must have its bank resident before the trigger is possible — the classic bug is a boss's audio bank loading when the boss appears, so the first roar is silent.

Audio CPU is a real budget line and it is usually held on one or two cores:

| Consumer | Typical cost | Scales with |
|---|---|---|
| Mixing and bus processing | 0.3–1.0 ms per frame | Voice count, bus count, effect count |
| Decoding | 0.5–2.0% of a core per compressed voice | Voice count and format |
| HRTF spatialisation | 0.05–0.2 ms per source | Spatialised source count |
| Convolution reverb | 0.3–0.8 ms per instance | Instance count, impulse length |
| Algorithmic reverb | 0.05–0.15 ms per instance | Instance count |
| Occlusion raycasts | 0.05–0.3 ms per frame | Ray count, collision complexity |
| Parameter updates and event posting | 0.05–0.2 ms per frame | Update rate, active object count |
| **Total budget** | **2–5% of frame CPU on console; 5–8% on mobile** | |

Solo: post events, publish two or three parameters, use one bank. Studio: an event naming convention enforced at import, a parameter registry documenting every published value with its range and update rate, and a bank layout owned jointly by audio and streaming, validated by a test that fails when a triggerable event's bank is not resident.

## 3. Memory: streaming, compression, budgets

Every sound is either resident in memory or streamed from disk, and the decision is per asset.

| | In memory | Streamed |
|---|---|---|
| Latency to first sample | Immediate | 20–200 ms unless pre-buffered |
| Memory cost | Full decompressed or compressed size | A small ring buffer, 32–128 KB |
| I/O cost | One load | Continuous |
| Use for | Anything triggered by gameplay: weapons, impacts, footsteps, UI | Music, ambience beds, long VO, cinematics |

The threshold is roughly 2–5 seconds of audio or 500 KB. Anything shorter and gameplay-triggered must be resident, because streaming latency on a gameplay-critical sound is indistinguishable from input lag. Anything longer and non-critical streams. Streamed assets that must start instantly — a music stinger, a scripted line — need their first buffer pre-loaded, which every middleware supports and which is the fix for "the music transition arrives late".

Compression formats, and why the choice is per platform:

| Format | Ratio | Decode cost | Notes |
|---|---|---|---|
| PCM 16-bit 48 kHz | 1:1 (192 KB/s stereo) | Zero | Very short critical sounds only |
| ADPCM | 4:1 | Very low, under 0.5% of a core per voice | Many concurrent short SFX; the workhorse |
| Vorbis | 8–12:1 | 1–3% of a core per voice | Music, ambience; expensive at high voice counts |
| Opus | 10–14:1 | 1–2% of a core per voice | VO and music; best quality per bit at low rates |
| ATRAC9 (PlayStation) | 10–20:1 | Hardware decoded, near zero | Platform-preferred; use it on PlayStation |
| XMA2 (Xbox, legacy) | 8–15:1 | Hardware decoded | Platform-preferred on supported hardware |
| AAC | 10–15:1 | Low, often hardware | Mobile |

The rule that follows: use the platform's hardware-decoded format wherever one exists, because it removes decode CPU entirely and CPU is what caps voice count. Use ADPCM for high-count short SFX on platforms without hardware decode, and reserve Vorbis or Opus for the small number of long streams where the ratio matters.

Sample rate is a second lever that is usually left unpulled. 48 kHz is the platform native rate and anything else forces a resample. But content with no meaningful energy above 8 kHz — rumbles, distant ambience, muffled interiors, most low-frequency impacts — is identical at 24 kHz and costs half the memory. Audit the frequency content rather than assuming; a spectral analysis over the SFX library typically identifies 20–40% of assets that can drop to 24 kHz with no audible difference.

Budgets:

| Platform | Total audio memory | Streams concurrent | Notes |
|---|---|---|---|
| Current console | 150–400 MB | 8–16 | Of a roughly 10–13 GB usable pool |
| Last-generation console | 80–200 MB | 4–8 | |
| PC | 200–600 MB | 16–32 | Scale with detected RAM |
| High-end mobile | 40–80 MB | 4–6 | |
| Mid-range mobile | 20–40 MB | 2–4 | Aggressive streaming; ADPCM or AAC only |

Voice-over is the budget's dominant risk at studio scale. A fully voiced RPG with 30,000 lines averaging 4 seconds at 12 KB/s mono Opus is roughly 1.4 GB per language, and shipping eight languages is 11 GB. This must be streamed, chunked by region or quest so only relevant banks are resident, and delivered as separate downloadable language packs rather than shipped in full to every player. Plan the VO banking scheme before recording, because re-banking 30,000 files after the fact is a pipeline project.

## 4. Subtitles, captions and accessibility hooks

Audio accessibility is not a post-launch feature; it is a set of hooks that must exist in the audio architecture from the start, because retrofitting them means revisiting every sound. The full treatment lives in `accessibility-in-games.md`; the audio-side requirements are these.

**Subtitles** carry dialogue text. **Captions** carry dialogue plus non-speech audio information. A game must ship subtitles; a game whose gameplay depends on audio cues must ship captions, because a deaf player without them is playing a different and worse game.

The architectural requirements. Every dialogue line needs a localisation key and a speaker identifier bound to the audio asset at authoring time, not looked up at runtime by filename. Every gameplay-informative non-speech sound needs a caption string and a category, which means the sound's metadata schema must have those fields from the first asset. Sounds needing a directional indicator — footsteps, gunfire, a threat behind the player — need a flag and a world position available to the UI layer at trigger time.

The presentation requirements, all of which must be player-configurable: text size scaling from 100% to at least 200%; a background plate with adjustable opacity from 0 to 100%, because text over bright scenes is unreadable without one; speaker names shown on every line; a line length cap of roughly 42 characters with at most two or three lines visible; and captions positioned so they do not collide with the HUD.

The mix-side requirements: independent volume sliders for at least master, music, SFX and VO, with VO separately boostable — a hard-of-hearing player commonly needs dialogue 6–12 dB above the default relative level, and a single master slider cannot provide that. A mono downmix option, because players with single-sided hearing lose any information carried only in one channel and a stereo mix can make gameplay-critical cues inaudible to them. And the dynamic range presets in `audio-mix-loudness-and-space.md`, which are an accessibility feature as much as a comfort one.

Solo: subtitles on by default, with size and background opacity options, and separate volume sliders. That is a day of work and it is the largest accessibility return available for the cost. Studio: full captions with directional indicators, a caption string as a required field in the sound asset schema enforced by the import pipeline, and validation that fails a build when a flagged sound ships without one.

Ambience deserves one specific note because it is where the cheapest quality gain hides. A single stereo loop of "forest" reads as a recording; the same scene built from a quiet bed, two or three mid-distance spatialised loops placed in the world, and a randomised one-shot system firing individual bird calls, distant cracks and gusts at intervals of 4–20 seconds reads as a place. The cost is three or four extra voices and an hour of authoring per environment, and it changes the perceived production value of an entire level more than any other single audio decision.

## 5. Debugging and the mixing workflow

Mixing is not a phase at the end; it is a continuous activity, and the structure that makes it possible is the bus tree plus snapshots plus a profiler.

The diagnostic order when something is wrong. First, is the sound playing at all — check the live voice list in the middleware profiler connected to the running build, which answers this in seconds and is the reason the profiler justifies the middleware. If it is not playing, the causes in frequency order are: voice cap reached and the sound was stolen or never started; the sound is virtualised because it is below the audibility threshold; the source is outside its maximum attenuation distance; a bus is muted by a snapshot; the asset failed to load or its bank is not loaded.

If it is playing but wrong: check bus levels against the mix reference; check whether a snapshot is active that you did not expect; check occlusion state, which is the usual cause of "it sounds muffled"; check the attenuation curve at the actual listener distance rather than at the distance you assume.

If the mix is inconsistent between scenes, the cause is almost always that scenes were mixed in isolation against no reference. Fix it by mixing against a fixed reference chain: a calibrated monitoring level (85 dB SPL for a reference at −20 dBFS pink noise in a treated room; consistency matters more than the absolute number), a loudness meter always visible, and a small set of reference recordings from shipped games in the same genre played at matched loudness.

Mix on at least three systems, because the failure modes differ: reference headphones (reveals detail, spatialisation and noise), a small mono speaker (reveals whether anything survives on a phone or a TV's built-in speakers, and whether the mix collapses when summed to mono), and a normal consumer TV or soundbar in a normal room (reveals whether dialogue is intelligible over ambience for the majority of your players). A mix that works on all three works everywhere; a mix that works only on studio monitors works nowhere.

One habit that prevents most mix drift: mix at a fixed monitoring level and never adjust the monitor volume during a session. The ear's frequency response changes with level (quiet listening attenuates bass and treble relative to mids), so a mix balanced at one level is unbalanced at another, and a designer who turns the monitors up while working on a quiet scene will make it too quiet and the next loud scene too loud. Set the level once, mark it, and change the mix rather than the monitor.

Automated checks worth having in CI at studio scale: integrated LUFS and true peak on a scripted playthrough per level; a report of any sound asset without a caption string, without a category, or routed directly to master; peak voice count per category against its cap; and total audio memory against the platform budget. All four catch regressions that are otherwise found by a reviewer at the worst possible moment.

## Pass conditions

Answer yes to every applicable line before the audio system is considered correct.

1. Streaming versus resident is decided per asset against a stated threshold, and any streamed asset that must start instantly is pre-buffered.
2. The platform's hardware-decoded compression format is used wherever one exists, and sample rates are audited against actual frequency content.
3. Total audio memory is tracked per platform against a budget, and VO is banked by region or language with a scheme decided before recording.
4. Subtitles ship on by default with size scaling to at least 200%, adjustable background opacity and speaker labels.
5. Every gameplay-informative non-speech sound carries a caption string and category as a required, pipeline-enforced field.
6. Independent volume sliders exist for master, music, SFX and VO, VO is separately boostable, and a mono downmix option is available.
7. The mix has been checked on reference headphones, a small mono speaker and a consumer TV, at a calibrated and consistent monitoring level.
8. Automated checks report loudness, missing caption strings, voice count peaks per category and total audio memory on every build.
9. Gameplay code posts named events and publishes parameters; no gameplay code references an audio asset directly.
10. A bank layout exists with an always-loaded core bank plus per-region and per-entity banks, and no triggerable event depends on a bank that is not yet resident.
11. Audio CPU is measured against a stated percentage of frame budget on the target platform, with decoding, reverb and spatialisation attributed separately.
