# Game feel: impact, camera and feedback

This part covers the moment of contact and the layer that carries it: hitstop, screenshake, camera behaviour, easing curves, the anticipation/contact/recovery split, and how the four feedback channels are ordered within a single frame. The input-grace and movement constants these numbers sit on top of are in `game-feel-input-grace-and-movement.md`. Every number below assumes a 60 fps target unless stated otherwise, and the millisecond value is the one to carry.

## 1. Hitstop and freeze frames

Hitstop is a brief suspension of the simulation on impact, 2–8 frames (33–133 ms) scaled by impact magnitude. It exists because a real collision resolves in under a millisecond, which is one twentieth of a frame, and is therefore perceptually invisible. Weight is communicated by duration, not by force, so the only way to say "that was heavy" is to hold the frame.

| Impact class | Hitstop | Milliseconds |
|---|---|---|
| Light jab, glancing hit | 2 frames | 33 |
| Standard attack connecting | 3–4 frames | 50–67 |
| Heavy attack, charged hit | 5–6 frames | 83–100 |
| Critical, finisher, parry | 8–12 frames | 133–200 |
| Blocked or absorbed hit | 2–3 frames | 33–50 |
| Whiff or hit on a shield break | 0 | 0 |

Scale it continuously rather than by tier where you can:

```
frames = clamp(round(k * sqrt(impulse / referenceImpulse) * baseFrames), 2, 12)
```

Square root rather than linear, because perceived magnitude of a physical stimulus is compressive — doubling the damage should not double the freeze, or a big hit locks the game for a third of a second.

**What must keep running during hitstop.** Setting a global time scale to zero is the wrong implementation and produces four distinct bugs. Audio must keep running, because a transient cut off at 40 ms sounds like a click and the impact loses its body; schedule audio on unscaled time and let it play through. Particles spawned by the impact must keep running or at minimum spawn before the freeze begins, or the hit spark appears only after the freeze ends and the causality reads backwards. The UI must keep running — a health bar that freezes mid-drain, a combo counter that stalls, damage numbers that hang in place all draw attention to the mechanism. Screenshake and camera motion must keep running, because shake during the freeze is precisely what sells the freeze as impact rather than as a hitch. Input polling and buffer ageing must keep running on unscaled time, or the freeze eats the player's combo window as described in `game-feel-input-grace-and-movement.md`.

The correct implementation freezes the animator and the physics integration of the involved actors, and optionally of the whole gameplay layer, while presentation and input continue on unscaled time. Asymmetric hitstop — freezing the attacker for 6 frames and the victim for 3 — is a valid and underused trick for making a hit read as a transfer of momentum rather than as a mutual pause.

Add a 1–2 frame delay before the freeze begins on very heavy hits, so the contact pose is reached before the hold. Freezing on the frame of first overlap catches the animation a frame early and the pose looks unresolved.

Above roughly 12 frames of hitstop the effect stops reading as impact and starts reading as a dropped frame or a hitch. If a moment needs more emphasis than that, reach for a slow-motion ramp instead: drop to 0.15–0.3 time scale for 200–400 ms and ease back over 150–250 ms, which is a different tool with a different meaning.

## 2. Screenshake

Use a trauma model, not a per-event shake instruction. Events add trauma; trauma decays; shake amplitude is a superlinear function of trauma.

```
trauma  = clamp01(trauma + impactMagnitude)      // events add
trauma  = max(0, trauma - decayRate * dt)        // decayRate 1.0-1.8 per second
shake   = trauma * trauma                        // or trauma^3 for a sharper falloff
offsetX = maxOffset * shake * (perlin(seed0, t * freq) * 2 - 1)
offsetY = maxOffset * shake * (perlin(seed1, t * freq) * 2 - 1)
roll    = maxAngle  * shake * (perlin(seed2, t * freq) * 2 - 1)
```

Squaring matters and the reason is perceptual. Linear decay of amplitude produces a long tail of small, even shaking that the visual system reads as a persistent vibration — a rattling camera mount rather than an impact. Squaring compresses that tail: at trauma 0.5 the shake is at 25% amplitude, at trauma 0.25 it is at 6%, so the shake is perceptually over well before the trauma value reaches zero, which is what an impulse response looks like. Cubing sharpens it further and suits games with frequent small hits that would otherwise smear together.

Amplitudes, tuned per target rather than copied:

| Context | Positional | Rotational (roll) | Frequency |
|---|---|---|---|
| 2D, 1080p reference | 4–10 px | 0.5–1.5 degrees | 15–25 Hz |
| 3D first person | 0.02–0.06 m | 0.4–1.2 degrees | 18–30 Hz |
| 3D third person | 0.10–0.40 m | 1.0–3.0 degrees | 12–22 Hz |
| Explosion, screen-filling | 2x the above, capped | up to 4 degrees | 10–16 Hz |

Perlin noise rather than random per-frame values, and the reason is that white noise is discontinuous: consecutive frames jump to unrelated positions, which produces a strobing, digital jitter and, on a 2D game with pixel snapping, visible tearing of the sprite grid. Perlin sampled along a time axis is C1-continuous, so the camera follows a smooth path at a controllable frequency, which reads as a physical object being shaken. Use three uncorrelated seeds so the axes do not move in lockstep.

Rotational shake is more effective per unit of disruption than positional shake in 3D, because roll does not break the player's spatial anchor while a translating camera does. Bias toward roll for sustained shake and toward translation for single impacts.

Directional shake: for a directional impact, apply 60–75% of the amplitude along the impact direction as a decaying oscillation and the remainder as isotropic noise. A hit from the left should push the camera right and settle, which conveys where the damage came from, and this is a cheaper and more legible damage indicator than a HUD arrow at close range.

Constraints that keep shake from becoming a liability. Cap total trauma at 1.0 so five simultaneous explosions do not multiply. Cap concurrent contributions or use the maximum rather than the sum for same-frame events. Apply shake as a post-transform offset on a dedicated camera node so it never contaminates the follow logic or the aim transform — shake that moves the aim ray is a bug, not a feature. Provide a screenshake intensity slider from 0 to 100% and honour 0 completely; a non-trivial fraction of players get motion sick, and shipping without the slider is a review-scoring accessibility failure.

## 3. Camera

The camera is the second character and it is tuned with the same rigour.

**Follow damping.** Use a critically damped spring or an equivalent smooth-damp with an explicit smooth time, not linear interpolation with a per-frame factor — `lerp(current, target, 0.1)` is frame-rate dependent and produces different behaviour at 30, 60 and 144 fps. Smooth times: 0.10–0.18 s horizontal and 0.20–0.35 s vertical for a 2D platformer, because vertical camera motion is far more nauseating and the character crosses the vertical axis constantly while jumping. For a 3D third-person action game, 0.12–0.20 s on position and 0.05–0.10 s on rotation, since rotation is usually player-driven and must feel direct. For a vehicle camera, 0.25–0.45 s with a separate, faster spring on the roll axis.

**Deadzone.** A rectangular region in screen space within which character motion produces no camera motion. 6–12% of screen width horizontally, 10–18% of screen height vertically. Its purpose is to suppress micro-motion: without it, every small step, every landing bob, and every animation-driven root offset translates into camera motion, and the resulting low-amplitude drift is a documented nausea source. Soften the deadzone edges over the outer 20% of the zone rather than switching hard from zero response to full response.

**Lookahead.** Offset the camera target in the direction of travel by `velocity * leadTime`, with `leadTime` 0.15–0.35 s, clamped to 10–20% of screen width. Ease the offset in over 0.25–0.4 s and out over 0.4–0.6 s, asymmetrically, so the camera commits quickly when the player commits and returns slowly when they stop, which avoids a whipping camera on direction changes. Lookahead exists because the player needs to see where they are going more than where they are; without it, a running character sits in the centre of the screen with equal information ahead and behind, which is exactly backwards.

**Landing lag.** On landing, drop the camera 0.05–0.15 m (or 6–20 px in 2D) proportionally to impact velocity over 2–3 frames, then recover over 200–300 ms on an ease-out curve. This is a lie about camera mass and it is one of the cheapest weight cues available. Scale it by the same impulse value that drives hitstop and shake so all three agree.

**FOV kick.** Base FOV 60–70 degrees for third person, 85–100 for first person on PC. Sprint adds 6–10 degrees eased in over 250–350 ms and out over 350–500 ms — in faster than out, so acceleration reads as urgent and deceleration as settling. Damage punches FOV inward by 2–4 degrees over 50–80 ms and recovers over 200–300 ms. Boost or dash adds 10–15 degrees over 120–200 ms. FOV kick is the primary speed cue in first person, because the character provides no visual reference for velocity; without it, doubling the movement speed is nearly invisible.

Provide FOV kick and camera bob as separate sliders with a working zero. Head bob in particular is a common cause of simulator sickness.

## 4. Tweening and easing

The curve carries meaning. Choosing by intent rather than by aesthetics is what makes a UI feel authored rather than decorated.

| Intent | Curve | Duration |
|---|---|---|
| Element arriving, settling into place | easeOutCubic or easeOutQuint | 200–320 ms |
| Element leaving the screen | easeInCubic | 120–200 ms |
| Repositioning something already visible | easeInOutSine or easeInOutCubic | 200–350 ms |
| Confirmation, reward, acquisition | easeOutBack, overshoot 1.10–1.25 | 260–420 ms |
| Celebratory, rare, high-impact only | easeOutElastic, period 0.35–0.45 | 400–600 ms |
| Continuous value change (health, ammo) | easeOutQuad or a spring | 150–300 ms |
| Micro-feedback on button press | easeOutQuad, scale 0.94–0.97 | 60–90 ms |
| Damage flash on a sprite or material | Step on, easeOut off | 1 frame on, 3–5 frames off |
| Screen transition, full cover | easeInOutQuad both halves | 250–400 ms total |

Arrivals use ease-out because the eye tracks the end of a motion, not the start; an ease-in arrival appears to accelerate into a wall. Departures use ease-in because nobody needs to track something leaving, and the faster it clears the sooner the next thing can start. Repositioning uses ease-in-out because both endpoints matter and the motion is a statement about relationship, not about arrival.

Overshoot is a claim about elasticity, so spend it where elasticity is the message: a picked-up item, a level-complete stamp, a successful upgrade. An overshoot on a health bar draining implies the health came back, which is a lie in the wrong direction. Elastic is a single-use-per-screen effect; two elastic animations in view at once look broken, not lively.

Durations under 80 ms are perceived as instantaneous state changes rather than as motion, which is correct for input acknowledgement and wrong for anything the player is meant to follow. Durations over 400 ms in gameplay-adjacent UI are perceptible as waiting. In-game feedback that gates further input should stay under 200 ms.

Prefer springs over fixed-duration tweens for anything that can be interrupted. A spring retargeted mid-flight carries its current velocity into the new motion; a tween restarted mid-flight snaps or produces a discontinuity in velocity that reads as a glitch. Spring parameters for UI: damping ratio 1.0 for settle-without-bounce, 0.6–0.8 for a light bounce, response time 0.15–0.3 s.

Everything above must run on unscaled time if it can occur during hitstop, slow motion, or a pause.

## 5. Anticipation, contact, recovery

Every interactive action decomposes into three phases, and the split between them is where responsiveness and weight trade off against each other.

| Action | Anticipation | Contact / active | Recovery | Total |
|---|---|---|---|---|
| Light attack | 3–6 frames | 2–3 frames | 8–14 frames | 13–23 frames |
| Heavy attack | 10–16 frames | 3–5 frames | 18–30 frames | 31–51 frames |
| Dodge or roll | 1–3 frames | 8–14 i-frames | 6–12 frames | 15–29 frames |
| Jump | 0–3 frames | launch | landing recovery 0–4 frames | — |
| Ranged shot | 2–4 frames | 1 frame | 4–10 frames | 7–15 frames |
| Parry | 1–2 frames | 4–8 frames | 14–24 frames on failure | — |

Anticipation is the readability budget and the responsiveness cost, and these are in direct conflict. Long anticipation makes an action legible to an opponent and communicates weight; it also delays the player's own feedback. The resolution is that anticipation frames should carry visible, committed motion from frame 1 — the character must be doing something within 1–2 frames of the press even if the attack does not land for 14. A 12-frame windup that begins with 4 frames of nothing feels like input loss; a 12-frame windup that begins with a 3-frame pose change feels heavy. This is why the first frame of every action should also carry an audio transient and a small camera or animation impulse: the player's question is "did it register", and that is answered in the first 2 frames or not at all.

Cancellability is what converts commitment into expression. Sensible defaults: anticipation is not cancellable except by a dedicated defensive option in the first 2–3 frames; active frames are never cancellable except by hit confirmation (cancel into a chain on contact, which is the fighting game special-cancel rule and the reason combos feel earned); recovery becomes cancellable into the next chain link at 40–60% and into a dodge at 55–75%. Heavy attacks should have a later cancel point than light ones, which is where their risk lives.

Recovery is also where the animation lies most usefully. The visible recovery animation may run 6–10 frames past the point at which input is accepted, so the character finishes their follow-through while already responding to the next command by blending out of it. Blend times of 60–120 ms into the next action absorb the discontinuity. The player perceives the response as immediate and the animation as complete, which is both lies at once and is the correct answer.

## 6. Feedback layering: four channels in one frame

An impact must land on four channels simultaneously, and each channel carries a distinct part of the message. Missing one is the most common cause of a hit that "does not connect" despite correct damage numbers.

| Channel | Carries | Latency to perceive |
|---|---|---|
| Audio | Material, magnitude, event identity | 140–180 ms reaction; earliest to register |
| Visual | Location, direction, target confirmation | 200–250 ms reaction |
| Haptic | Weight, body-level confirmation | ~150 ms; strongest for confirming, weakest for locating |
| Time-domain (hitstop, slow motion) | Significance, weight | Perceived as a property of the other three |

Ordering within the frame of contact, and the reason for each position:

1. Trigger audio first, on the contact frame, before anything else. Audio has the longest hardware pipeline — a mixer buffer of 256 samples at 48 kHz is 5.3 ms, and 1024 samples is 21 ms, plus device latency of 10–40 ms on mobile and Bluetooth. Everything else in this list gets to the player faster, so audio must leave first to arrive together.
2. Spawn particles and apply the material flash on the same frame, before the freeze begins, so the spark exists in the first frozen frame rather than appearing after it.
3. Add trauma to the camera and apply the FOV or position punch on the same frame.
4. Trigger haptics; controller haptic latency over wireless is 15–40 ms and it does not need to be sample-accurate.
5. Begin hitstop last, after every spawn has happened, optionally delayed by 1–2 frames on heavy hits so the contact pose resolves.
6. Damage numbers and HUD reaction spawn on the contact frame but animate on unscaled time so they move during the freeze.

The rule that generalises: anything with a long pipeline goes first, anything that suspends the simulation goes last, and everything visible is spawned before the suspension so the frozen frame is a complete picture of the impact rather than a snapshot of the moment before it.

Layer intensity across all four channels from one impulse value, so a light hit is light in every channel and a critical is heavy in every channel. Channels that disagree — a huge screenshake with a thin audio transient — read as a bug in the game rather than as a stylistic choice.

## Pass conditions

Answer yes to every applicable line before the feel layer is considered done.

1. Hitstop is applied on impact, scaled by impulse, bounded between 2 and 12 frames, and implemented without a global time scale of zero.
2. Audio, particles, UI, camera shake, input polling and buffer ageing all continue during hitstop, verified by frame-stepping through an impact.
3. Screenshake uses a decaying trauma value with a squared or cubed amplitude mapping and Perlin noise rather than per-frame random values.
4. Screenshake is applied as a post-transform offset and provably does not affect the aim ray or the follow target.
5. Screenshake, camera bob and FOV kick each have a player-facing intensity slider whose zero position fully disables the effect.
6. Camera follow uses a frame-rate-independent damping model with an explicit smooth time; vertical smooth time exceeds horizontal.
7. Camera lookahead is present, clamped to at most 20% of screen width, and eases in faster than it eases out.
8. Landing produces a camera drop scaled by impact velocity that recovers within 300 ms.
9. Every tween in gameplay-adjacent UI has a stated intent, a curve chosen to match it, and a duration inside the documented band for its class.
10. Anything that can play during hitstop, slow motion or a pause runs on unscaled time.
11. Every player action produces visible motion within 2 frames of the input, independent of when the action resolves.
12. Recovery cancel windows are defined per action class, are later for heavy actions than light ones, and are documented.
13. Every impact drives all four feedback channels — audio, visual, haptic, time-domain — from a single impulse value, and audio is dispatched on the contact frame before the freeze begins.
