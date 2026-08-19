# Game feel: haptics, forgiveness, weight and diagnosis

This part covers the channels and systems that sit around the core loop — haptics, VFX as readability, the wider family of forgiveness systems, authored weight — and then how to diagnose a feel complaint and instrument the tuning process. Impact, camera and feedback layering are in `game-feel-impact-camera-and-feedback.md`; movement and input grace are in `game-feel-input-grace-and-movement.md`. Every number below assumes a 60 fps target unless stated otherwise.

## 1. Rumble and haptics

Two motors on a conventional gamepad, and they mean different things. The low-frequency motor (roughly 50–90 Hz on an eccentric rotating mass, or the low band on a voice-coil actuator) carries body-level events: explosions, landings, engine load, being hit. The high-frequency motor (130–250 Hz) carries surface and precision events: clicks, small impacts, reload mechanisms, texture under wheels. Sending a big event to the high motor makes it feel thin; sending a UI click to the low motor makes the whole controller lurch.

| Event | Motor | Peak intensity | Duration | Envelope |
|---|---|---|---|---|
| Menu confirm | High | 0.15–0.25 | 30–50 ms | Instant on, linear off |
| Light hit landed | High | 0.3–0.45 | 60–90 ms | Instant on, exponential off |
| Heavy hit landed | Both | 0.6–0.8 low, 0.4 high | 120–180 ms | 10 ms attack, decay tau 80 ms |
| Taking damage | Low | 0.5–0.7 | 150–250 ms | Instant on, decay tau 120 ms |
| Landing from a fall | Low | scale by impact, 0.2–0.9 | 80–200 ms | Instant on, decay tau 60 ms |
| Explosion nearby | Both | 0.9 low, 0.5 high | 300–450 ms | 20 ms attack, decay tau 180 ms |
| Weapon fire, automatic | High, pulsed | 0.25–0.4 per shot | 25–40 ms per shot | Per-shot retrigger |
| Engine or ambience | Low | 0.05–0.15 | continuous | Modulated by RPM |

Attack times of 0 to 16 ms for impacts — the motor must be at full amplitude within one frame or the hit feels soft. Decay exponentially with a time constant of 60–180 ms depending on mass. Eccentric-rotating-mass motors have physical spin-up and spin-down of 20–60 ms which you cannot remove, so the effective floor on a conventional controller is around 60 ms of total event duration; voice-coil actuators (DualSense, Switch HD Rumble) respond in under 10 ms and can carry short, sharp, pitched events that ERM cannot.

Continuous rumble above 0.2 intensity for more than 2 seconds causes fatigue and desensitisation, which then costs you the impact events that follow. Budget haptics like audio: keep a headroom target, duck ambient rumble when an impact event fires, and cap simultaneous effects to avoid summing to a constant buzz.

Adaptive triggers (DualSense) are a separate channel with resistance values 0–255 and modes for constant force, section resistance, and vibration. Use them for mechanism simulation — trigger pull weight, a bow at draw, a gun jam, a bolt catching — and set them back to neutral on every state exit, because a trigger left in a resistance mode after the weapon is holstered is the most common adaptive trigger bug. Provide an intensity slider and a full off, and never gate information the player needs behind haptics alone.

Mobile: iOS Core Haptics gives transient and continuous events with intensity and sharpness 0–1 and roughly 10 ms responsiveness; Android's `VibrationEffect` with amplitude control is available from API 26 but device quality varies enormously, and older devices support only on/off timings. Design a two-tier haptic scheme so the degraded tier is still correct rather than absent.

## 2. Particles and VFX as readability

Effects are information first and decoration second. Every effect should answer a question the player is currently asking.

**Hit sparks** answer "did I connect, and where". 6–14 particles, lifetime 0.08–0.20 s, spawned at the contact point rather than at the target's origin, oriented along the surface normal or the attack direction. They must appear on the contact frame and be visible during hitstop, which means their simulation runs on unscaled time. Distinguish hit types by shape and colour rather than by size alone: a blocked hit and a landed hit must be separable in peripheral vision. Add a 1–2 frame full-white material flash on the victim; it is the single cheapest and most legible hit confirmation available and it survives any amount of visual noise.

**Landing dust** answers "how hard did I land". Gate on impact velocity above a threshold of 4–6 m/s, then scale count from 6 to 24 particles and radius from 0.3 to 1.2 m linearly with impact speed up to a cap. Lifetime 0.3–0.6 s with a fast expansion and a slow fade. Below the threshold, spawn nothing — dust on every step is noise that destroys the signal on the landings that matter.

**Trails** answer "how fast am I moving" and "where did that go". Enable at 60–70% of maximum speed and fade in over 0.15 s so the threshold is not a pop. Ribbon length 4–8 segments at 0.10–0.20 s of history. On weapons, a trail along the blade arc during active frames only, which doubles as a hitbox tell for opponents. On projectiles, a trail is often more legible than the projectile itself and should be tuned against the background the projectile crosses, not against a grey box.

**Anticipation VFX** answer "what is about to happen to me". A charge glow, a ground telegraph decal, a colour shift on the attacker. These are the most valuable effects in the game because they convert a reaction test into a decision, and they should lead the attack's active frames by at least 250 ms — comfortably above visual reaction time — for anything the player is expected to dodge.

Readability constraints that override style: cap simultaneous full-screen effects, keep effect colours distinct from gameplay-critical colours (if pickups are yellow, explosions are not yellow), and check every effect against the busiest possible scene rather than against an empty test level. Studio: maintain a VFX colour and shape language document that assigns semantics — friendly, hostile, environmental, pickup, telegraph — and gate new effects on conformance to it.

## 3. Forgiveness systems beyond the ledge

Coyote time and buffering are the two famous members of a larger family. Each member takes a place where the simulation is stricter than the player's perception and relaxes it by a measured amount.

**Corner correction.** When a jumping character's head clips the corner of a platform by a small margin, translate it horizontally to clear the obstruction instead of stopping it. Nudge budget 4–12 px in 2D, or 0.1–0.25 m in 3D, applied over 1 frame. The mechanism is that the player aimed at the gap and the collision volume is a rectangle approximating a body that is not a rectangle; snagging a corner reads as the game clipping you, never as your own error. Apply the same correction to the feet on the way up onto a ledge — a step-up allowance of 0.2–0.4 m removes the requirement to jump over kerbs.

**Asymmetric hitboxes.** The volume that hurts the player should be smaller than the volume that looks dangerous, and the volume the player uses to hit things should be larger than the weapon. Typical spreads: the player's hurtbox at 70–85% of the visual silhouette, the player's hitbox at 105–125% of the weapon's visible extent, and enemy hurtboxes at 100–115%. This asymmetry is invisible in play and it moves the perceived fairness of every exchange in the player's favour. Enemy hitboxes should match their telegraph exactly, because an enemy attack that hits outside its animation is the one asymmetry players do detect.

**Hit and death forgiveness.** Mercy invincibility of 0.6–1.5 s after taking damage, with a flicker at 8–12 Hz so the state is readable. Last-hit protection: a hit that would reduce health from above a threshold (commonly 25–30%) straight to zero leaves 1 point instead, once per encounter or with a cooldown of 20–60 s. Both are lies the player will never notice and both convert a class of instant, uninstructive death into a survivable mistake.

**Aim and target assist.** Covered in detail in the input reference; the feel-side rule is that assist must be bounded by an angular budget you can state — commonly 2–6 degrees of magnetism and 20–40% reticle slowdown — and must scale down as skill options scale up.

**Landing assist and air steering.** Give 1.1–1.3x air control during the apex hang window, and in 3D consider a small horizontal correction of up to 0.3 m applied over the last 5 frames of a fall toward the nearest valid landing surface. This is invisible below about 0.4 m of total correction and eliminates the class of near-miss landing that feels like a betrayal.

The governing constraint on all of them is consistency. A forgiveness system that fires sometimes is worse than none, because the player builds a model of the rules and the intermittent exception reads as a bug. Make each system deterministic, and gate it on state the player can perceive rather than on random rolls.

## 4. Weight, scale and the illusion of mass

Two characters with identical physics feel identical, so mass is authored in presentation rather than in the rigid body. The cues, ordered by strength:

Timing dominates. A heavy character's actions have longer anticipation (12–20 frames versus 3–6), longer recovery (20–35 versus 8–14), and longer acceleration ramps (0.2–0.35 s to max speed versus 0.05–0.10 s). Nothing else on this list comes close in effect size, which is why "make it heavier" almost always means "add frames" rather than "add kilograms".

Footfall cadence and impact follow. A large character's step interval sits at 0.5–0.75 s against 0.28–0.4 s for a light one, and every footfall carries a low-frequency audio component below 120 Hz, a small camera drop of 0.01–0.03 m, and dust at a lower velocity threshold. Small characters get higher-pitched, shorter transients and no camera response at all.

Secondary motion sells the rest. Overlap and follow-through of 3–6 frames on trailing elements — cloth, hair, weapon tips, armour plates — is the difference between a moving model and a moving body. Squash and stretch, even on realistic characters, at 3–8% on landing over 2–3 frames with a 4–6 frame recovery. In stylised 2D, 15–30% is normal.

Camera and world response complete the illusion. A heavy landing adds 0.2–0.4 trauma and a 0.10–0.15 m camera drop; a light landing adds none. Heavy characters displace the world: decals, a screen-space distortion of 2–4 px, and objects that react to proximity.

The trap is authoring mass through the physics constants alone. Increasing a rigid body's mass changes how it resolves collisions with other dynamic bodies and changes nothing the player watches, because the character controller's velocity is authored by code. Studio: define two or three weight classes as complete presentation packages — timing multipliers, audio banks, camera response values, VFX thresholds, haptic profiles — and assign characters to a class rather than tuning each one from zero.

## 5. Diagnosing "it feels bad"

The complaint is never actionable as stated. Map the symptom to a mechanism.

| Symptom | What the player means | Likely cause | Fix |
|---|---|---|---|
| Floaty | Too long in the air, no weight | Fall gravity too low, airtime too long | Raise fall multiplier to 2.0–2.5; cut airtime to under 0.7 s; add landing camera drop of 0.08–0.15 m |
| Sluggish | Actions take too long to complete | Anticipation frames too long, recovery uncancellable | Cut anticipation to 4–6 frames on light actions; open recovery cancel at 50% |
| Unresponsive | Input seems ignored | No buffering, no coyote time, or latency above 100 ms | Add 6-frame buffer and 6-frame coyote; audit the latency chain; guarantee visible motion within 2 frames of every press |
| Weightless | Impacts do not register as impacts | No hitstop, no shake, thin audio | Add 3–6 frames of hitstop, trauma 0.3–0.5, a 1-frame white flash, and a low-motor rumble at 0.5 for 120 ms |
| Slippery | Character keeps moving after input stops | Deceleration too low, ground friction too low | Set time-to-stop to 0.6–0.8x time-to-max-speed; raise turnaround acceleration to 2–3x |
| Stiff | Motion is abrupt and mechanical | Instant velocity changes, no easing, no follow-through | Add 3–6 frames of acceleration ramp; add 60–120 ms animation blends; add a small camera lag |
| Mushy | Inputs blur together, no crispness | Buffer too long, over-blended animations, hitstop on everything | Cut buffers to 5–6 frames; cut blend times to 60–80 ms; remove hitstop from light or whiffed hits |
| Twitchy | Camera or aim overreacts | Deadzone too small, damping too low, sensitivity curve too linear | Deadzone to 8–12% of screen; smooth time to 0.12–0.18 s; apply an exponent of 1.5–2.0 to stick response |
| Nauseating | Physical discomfort after minutes | Vertical camera motion, head bob, uncapped shake | Raise vertical smooth time to 0.3 s; expose bob, shake and FOV kick sliders with a working zero |
| Spongy hits | Damage happens but reads as nothing | Feedback channels disagree or arrive apart | Drive all four channels from one impulse value; verify audio fires on the contact frame |
| Delayed | A visible gap between press and result | Frame queue depth, animation-driven gameplay, vsync stacking | Reduce queued frames to 1; drive gameplay from state rather than from animation events; measure end to end |
| Repetitive | Correct but boring after ten minutes | No variation in the feedback layer | Randomise pitch by plus or minus 4–8%, hitstop by plus or minus 1 frame, and spark rotation per hit |

The diagnostic order that avoids wasted work: measure end-to-end latency before changing any constant, because a 120 ms input chain makes every feel constant in the game feel wrong and no amount of buffering fixes it. Then check that something visible happens within 2 frames of every input. Then check the four feedback channels for agreement. Only then tune the movement constants, because movement tuning against a broken latency or feedback layer converges on values that are wrong once those are fixed.

## 6. Instrumenting and tuning feel

Feel is measurable, and teams that measure it converge faster than teams that argue about it.

Record gameplay at 240 fps on a phone camera pointed at the screen with the controller in frame, then count frames between the button moving and the first pixel changing. At 240 fps each frame is 4.2 ms, which is enough resolution to distinguish a 4-frame chain from a 6-frame chain. For sub-frame accuracy, wire an LED across the button contacts and film both at 1000 fps, giving 1 ms resolution; this is the only way to separate engine latency from display latency without vendor tooling.

Build a frame-step mode into every development build: pause, advance one simulation frame, and display the current input state, buffered actions, ground state, coyote timer, velocity and current animation frame as an overlay. Nearly every feel bug is obvious in one frame-step pass and invisible at speed.

Record and replay input as a deterministic log of `(frame, device, control, value)` so a tuning change can be evaluated against an identical performance rather than against a fresh attempt by a tester who is also improving at the game.

Instrument the windows in playtest builds: log the distribution of time-since-grounded at jump input, time-to-landing at buffered jump input, and time-into-recovery at chain input. These three histograms tell you whether your windows match how people actually play, and they usually do not on the first pass.

Compare against reference. Capture 240 fps footage of a shipped game in the same genre, count its startup frames, its hitstop, its airtime, its coyote window. This is legitimate craft research and it is faster than deriving the numbers from scratch.

Solo: frame-step overlay plus phone-camera capture covers 90% of it, and both cost an afternoon. Studio: add the input record/replay harness, a telemetry channel for the window histograms, and an automated check that asserts key feel constants have not drifted — feel regressions arrive through unrelated refactors far more often than through deliberate tuning, and without an assertion nobody notices for weeks.

## Pass conditions

Answer yes to every applicable line before the feel layer is considered done.

1. Haptics distinguish low-frequency and high-frequency motors by event class, have attack times under 16 ms on impacts, and have an intensity slider with a working zero.
2. Landing dust is gated on an impact velocity threshold and scales with impact speed; effects do not fire on every step.
3. Enemy attacks the player is expected to dodge have a telegraph leading the active frames by at least 250 ms.
4. Corner correction is implemented with a stated nudge budget, and a jump aimed at a gap does not snag on its edges in a scripted test.
5. The player's hurtbox is smaller than the player's visual silhouette, enemy hitboxes match their telegraphs, and the ratios are documented.
6. Mercy invincibility after damage is between 0.6 and 1.5 s and is visually readable while active.
7. Weight differences between characters are expressed through timing, audio, camera response and secondary motion, not through rigid body mass alone.
8. End-to-end input latency has been measured on the target device with a high-speed capture and is documented against the target for the genre.
9. A frame-step mode exists in development builds and displays input state, buffer contents, ground state and current animation frame.
10. Feel constants live in a versioned, hot-reloadable tuning asset rather than in code, and changes to it are reviewed.
11. Playtest telemetry records the distribution of input timing against each grace window, and the windows have been adjusted at least once against real data.
