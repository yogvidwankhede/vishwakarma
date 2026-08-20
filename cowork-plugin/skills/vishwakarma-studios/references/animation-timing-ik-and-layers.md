# Animation Timing, Events, IK, and Layering
This part assumes a working state machine and blend trees (see `animation-graphs-and-blending.md`) and covers what is layered on top of them: how long transitions should take, why animation events are fragile, the order inverse kinematics must run in, how additive and override layers compose, and what all those clips cost in memory once compressed.

## 1. Blend times, in milliseconds


Blend duration is a direct trade between smoothness and responsiveness, and both ends have a perceptual floor. A blend shorter than about two frames at 60 fps (33 ms) is indistinguishable from a hard cut, so anything below that is wasted parameter space. A blend longer than about 300 ms on a player-triggered action pushes the visible response past the roughly 100 ms window in which a player attributes the motion to their input, and reads as lag even when the game logic responded on frame one.

| Transition class | Blend in | Blend out | Reason |
|---|---|---|---|
| Idle to walk, walk to jog, jog to run | 150–250 ms | — | Gait changes are gradual in reality; a short blend reads as a snap |
| Directional pivot within locomotion | 100–150 ms | — | Fast enough to track input, slow enough to preserve the weight shift |
| Locomotion to stop | 120–200 ms | — | Pair with distance matching or the stop slides |
| Jump takeoff | 50–80 ms | — | Must be visible on the frame the player pressed |
| Landing impact | 60–100 ms | 180–250 ms | Sharp in, soft out; the recovery is the readable part |
| Attack start, first hit | 60–100 ms | — | Any longer and the wind-up appears to start late |
| Attack chain, hit to hit | 80–120 ms | — | Preserves flow without smearing the pose |
| Attack cancel into dodge or block | 30–60 ms | — | The cancel is the feature; blend length is felt directly as input lag |
| Hit reaction, additive | 40–70 ms | 200–300 ms | The transient must be immediate; the settle carries the weight |
| Hit reaction, full-body override | 80–120 ms | 250–350 ms | Longer in, because a full-body override that snaps reads as a teleport |
| Death | 100–200 ms | — | Then blend to ragdoll over 150–300 ms |
| Aim pose change (additive offset) | Continuous | — | Smooth the aim parameter at tau 60–100 ms rather than blending states |
| Into and out of a cinematic or scripted sequence | 250–400 ms | 250–400 ms | Control has been taken; smoothness now outranks responsiveness |
| Weapon swap, reload (upper-body layer) | 100–150 ms | 150–200 ms | Masked, so the base locomotion is undisturbed |

The relationship is worth stating as a mechanism rather than a preference. The player's sense of responsiveness is set by the time from input to the first *visibly different* frame, not by the time to the pose settling. A 60 ms blend into an attack whose first 200 ms is a wind-up feels responsive because the silhouette changed immediately; a 250 ms blend into the same attack feels sluggish because for the first four frames the character is still mostly in the previous pose. This is why shortening blends is the cheapest available responsiveness fix, and why it is almost always available: nobody notices a 60 ms blend that they would have noticed as a cut at 0 ms.

| Blend duration at 60 fps | Frames | Reads as | Use for |
|---|---|---|---|
| 0 ms | 0 | A cut; acceptable only on deliberate snaps | Hit-stop, teleport, cinematic cut |
| 30–50 ms | 2–3 | Instant but not jarring | Cancels, blocks, parries |
| 60–120 ms | 4–7 | Immediate with weight | Attacks, jumps, reactions |
| 150–250 ms | 9–15 | Smooth, slightly deliberate | Gait changes, stance changes |
| 300 ms+ | 18+ | Soft; reads as lag on anything player-triggered | Cinematic entries and exits only |

Two rules that follow. Player-triggered transitions get short blends and everything else can afford long ones. And the blend budget is part of the input-response budget, not additional to it: if the target is a visible response within 100 ms of the button, and input polling plus a frame of game logic already spends 33 ms, the blend has at most 60 ms before it starts eating perceived responsiveness.

## 2. Animation events and their timing fragility


An animation event fires when the clip's normalised time crosses the event's timestamp during a graph update. Every word in that sentence is a failure mode.

**Variable timestep.** A frame that takes 33 ms advances a 1.0 s clip by 0.033 of normalised time. Two events 0.02 apart are both crossed in one update; engines differ on whether both fire, and a hitch of 200 ms steps past six events at once or, in some implementations, past them entirely.

**Blending.** During a crossfade, both states are being evaluated, and in Unity both clips' events fire. A 300 ms attack-to-attack transition therefore fires both attacks' hit events, and the target takes double damage. This is a real shipped bug class, not a hypothetical.

**Time scaling.** At a global time scale of 0.2 for a hit-stop effect, events still fire, but the audio and VFX they spawn are not automatically scaled, so a slowed animation triggers full-speed effects. At time scale 0 the graph does not advance at all, so a state waiting on an "animation finished" event waits forever, and the game deadlocks in a pause menu.

**Network.** Client and server animation graphs are not phase-locked. An event that applies damage on the client is a prediction; an event that applies damage on the server is authoritative; putting the same event on both without reconciliation produces double application or none.

The rules. Authoritative gameplay never rides on a plain animation event. Put damage, spawning and state changes on a server-authoritative montage notify (Unreal's `AnimNotify` on a replicated montage, where the montage position is itself replicated) or on a gameplay timer started at the same moment the animation started. Use events for cosmetics only: footstep audio, particle spawns, camera shakes. Guard against double-fire with a per-activation token, so a second fire within the same activation is discarded.

Prefer curves over discrete events wherever the question is "is this window open". A float curve baked into the clip and *sampled* every frame is robust to any frame step, blends correctly (two blending clips produce a weighted curve value, not two separate firings), and scales with time scale for free. "Hit window open" as a 0-to-1 curve is strictly better than a pair of begin and end events. Where a discrete event is genuinely needed, prefer a notify state with begin and end over a point notify, for the same reason: a window can be tested for containment, a point can only be crossed.

## 3. Inverse kinematics and the order of operations


IK is a post-process on a finished pose. The order it runs in is not a preference; running foot IK before the pelvis adjustment means the pelvis then moves the feet the IK just placed, and the character's feet float exactly as far as the pelvis moved.

The correct order, top to bottom in the graph:

1. Base pose from the state machine and blend trees.
2. Additive layers (breathing, aim offsets, recoil, lean).
3. Pelvis and root vertical adjustment, computed from the foot traces but applied before the leg IK.
4. Leg two-bone IK: place each foot on the traced surface and align its rotation.
5. Spine and neck aim or look-at.
6. Arm and hand IK, after the spine, because hands attached to props must follow the spine's final orientation.
7. Physics and secondary motion: spring bones, cloth, partial or full ragdoll blend.
8. Final pose to skinning.

**Two-bone IK** is analytic, not iterative. Given the chain root, mid joint, end effector and a target, the interior angle comes from the law of cosines using the two bone lengths and the root-to-target distance; the bend plane is resolved from a pole vector or joint target. Clamp the target distance to 99% of `l1 + l2` before solving, because at full extension the bend plane is undefined and the joint flips. Cost is 1–3 µs per chain, which is free. For longer chains — spine, tail, tentacle — use FABRIK at 4–10 iterations; cost scales with chain length times iterations and reaches 10–30 µs, which is no longer free at 60 characters.

**Foot IK for slopes and stairs.** Trace downward from knee height to roughly 50 cm below the foot's animated position, one trace per foot. Two traces per character per frame is affordable; batch them, and use the async trace path if the engine offers one. Place the foot at the hit point plus the sole offset, and align the foot's rotation to the surface normal clamped to ±30–40° so the ankle does not break. Compute the pelvis offset as the minimum (most negative) required foot lift, so the character crouches into the slope rather than leaving the trailing foot in the air, and interpolate that offset with a time constant of 100–150 ms.

Stairs are the case that exposes an unfiltered implementation. A 20 cm step traversed in one frame produces a 20 cm pelvis pop without interpolation, which is far more objectionable than the sliding it was meant to fix. The trace must also accept a step-up threshold matched to the character controller's step height, or the foot targets a step the controller has not yet climbed.

**Look-at and aim.** Distribute yaw across the spine rather than rotating one bone: roughly spine1 20%, spine2 30%, spine3 25%, neck 15%, head 10%, with per-bone clamps. Total clamp around ±90° yaw and ±60° pitch; beyond that, trigger a turn-in-place state rather than continuing to twist. For weapon aiming specifically, an aim offset — a 2D additive blend space of poses authored at pitch and yaw extremes — is cheaper, more art-directable and better-looking than IK, because the animator can author the correct shoulder and torso compensation. Use IK only as the final small correction on top.

IK cost, so it can be budgeted rather than assumed free:

| Solver | Typical use | Cost per chain | Scaling |
|---|---|---|---|
| Two-bone analytic | Legs, arms | 1–3 µs | Constant |
| FABRIK, 4 iterations | Spine, tail, tentacle | 8–20 µs | Linear in chain length x iterations |
| CCD, 8 iterations | Legacy chains, long tails | 15–40 µs | Linear; converges slower than FABRIK |
| Full-body IK (Unreal FBIK, Control Rig) | Hero characters, cinematics | 60–200 µs | Superlinear; LOD 0 only |
| Downward trace per foot | Foot placement | 3–15 µs | Depends on collision complexity; batch and async |

At 20 characters with two foot chains, two hand chains and a spine solve each, that is roughly 0.6–1.5 ms of CPU before the traces. Full-body IK on more than a handful of characters is not affordable at 60 fps, which is why it belongs on the player and on cinematic characters only.

**Hand IK for props.** The two-handed weapon case: the dominant hand is driven by the animation and the weapon is attached to it, while the off hand is IK'd to a grip socket authored on the weapon. Getting this wrong produces a floating off-hand, which is among the most-noticed errors in any game with a first-person or over-shoulder camera. The chain needs a correct elbow pole vector, usually derived from the animated elbow position rather than a fixed world vector, or the elbow flips when the arm crosses the body.

## 4. Additive layers


An additive pose is the per-bone local-space difference between an authored clip and an explicitly authored reference pose, applied on top of whatever the base graph produced. The reference pose is the part that gets wrong: an additive authored against a T-pose reference, applied to a base that is mid-run, superimposes the entire difference between T-pose and the additive clip, and the character explodes. Every additive clip must name its reference pose, and that reference must be the pose the additive was authored as a delta from — usually a single frame of the corresponding base animation.

Uses and typical weights: breathing and idle sway (weight 0.3–1.0, always on, near-zero cost, disproportionate effect on whether a character reads as alive); aim offsets (a 2D additive blend space, weight 1.0, driven by aim pitch and yaw); damage reactions (masked to the upper body, weight to 1.0 over 40–70 ms and back to 0 over 200–300 ms); weapon recoil; lean into turns; fatigue and injury modifiers layered onto the whole locomotion set at low weight.

**Masking.** A bone mask restricts a layer to a subtree — Unity's Avatar Mask, Unreal's Layered Blend Per Bone, Godot's filter list on the blend node. A hard mask boundary shows as a visible kink at the spine, because bone N is fully overridden and bone N+1 is untouched. Use a depth-based falloff over 2–3 bones (Unreal's `BlendDepth` on a layered blend does this directly), so the influence ramps rather than steps.

**Additive versus override.** Override replaces the masked subtree's pose entirely; additive superimposes a delta. Choosing override for a hit reaction on a sprinting character removes the run's arm swing for the duration, so the character appears to freeze from the waist up while their legs keep running. Choosing additive for a reload removes nothing, so the character reloads while their arms also swing, which reads as drunk. The rule: override for actions that own the limb (reload, weapon swap, throw); additive for reactions and modifiers that must not destroy the base (hit reactions, breathing, aim, recoil, lean).

Layer order is evaluated bottom to top and is not commutative. An aim additive applied above a full-body hit-reaction override still aims correctly; applied below it, the override discards it. The standard order, base upward: locomotion base, full-body overrides (dodge, death), upper-body overrides (reload, throw), aim additive, reaction additives, breathing, facial. Write the order down once and treat reordering as a change requiring review, because the symptoms of a wrong order are subtle — a slightly wrong aim during reloads — and get attributed to the wrong system.

Cost is not negligible at scale. Each layer is a full pose evaluation plus a per-bone blend, roughly 0.01–0.03 ms per layer per character on a 100-bone rig. Six layers across 40 visible characters is 2.4–7.2 ms of a 16.67 ms frame, which is why layer count is one of the first things animation LOD strips.

## 5. Compression, curve reduction, and memory at AAA scale


Uncompressed, a keyframe stores translation (3 floats), rotation (4 floats as a quaternion) and scale (3 floats) per bone: 40 bytes. A 100-bone rig at 30 Hz is 120 KB per second of animation. A 4-second clip is 480 KB. A library of 8,000 clips averaging 3 seconds is 2.8 GB before anyone has authored a facial set. That number is why compression is a shipping requirement rather than an optimisation.

The reductions, in the order they should be applied:

| Stage | Mechanism | Typical saving | Risk |
|---|---|---|---|
| Constant track removal | Most bones never translate or scale; store one value instead of a keyed track | 55–70% | None; verify scale is genuinely constant on stretchy rigs |
| Key reduction | Drop keys whose value is within an error threshold of the linear interpolation of their neighbours | A further 30–50% | Threshold set per-bone rather than at the end effector |
| Quantisation | Store 3 quaternion components at 16 bits with the fourth reconstructed; range-quantise translations per track | 40–60% of what remains | Drift on long chains if the range is global rather than per-track |
| ACL or equivalent | Per-clip parameter search across all of the above with an error metric evaluated at the skeleton's leaves | 15–40x versus raw overall | Build time; the search is not free |

Concretely, a 70–100 bone rig at 30 Hz compresses to roughly 3–8 KB per second with sub-millimetre error under ACL (integrated in Unreal 5.x, available as a Unity package), against 84–120 KB per second raw.

The error budget must be specified at the end effector, not per bone, because rotational error compounds down the chain. A 0.5° error at the shoulder is roughly 6 mm at the wrist and 8 mm at the fingertip on a 70 cm arm. Set roughly 1 mm at the pelvis, 0.1 mm at hands and feet, and 0.01–0.05 mm on fingers and facial bones. Loose finger thresholds detach props from grips; loose facial thresholds flatten expressions into a dead face, which is the most expensive kind of cheap-looking.

At AAA scale, 20,000–60,000 clips is normal for an open-world action game with a full facial and dialogue set. Budget 300–800 MB of compressed animation resident plus a streamed remainder. Facial animation is usually the single largest consumer if it is curve-based: a 200-blendshape face at 30 Hz is 200 floats per frame, 24 KB per second per character, before compression. Compress facial curves aggressively, and consider reducing to a 30–50 component PCA basis, which cuts both memory and the per-frame blendshape evaluation cost.

Solo: enable the engine's default compression, set the error threshold once, and move on — the saving from tuning is real but small against your total. Studio: track compressed animation footprint per milestone alongside texture and audio memory, and put a per-clip size ceiling in the import pipeline that fails the asset rather than warns, because warnings are not read.

## Pass conditions

Answer yes to every applicable line before the animation system is considered correct.

1. Blend times are set per transition class against a documented table, and no player-triggered transition exceeds 150 ms.
2. No authoritative gameplay effect is triggered by a plain animation event; damage, spawning and state changes ride on a replicated montage notify or a gameplay timer.
3. Window-style logic uses sampled curves or notify states rather than paired point events, and double-fire is guarded by a per-activation token.
4. Behaviour is verified at time scale 0.2 and time scale 0, including that nothing waits forever on an animation-finished event.
5. IK runs in the stated order, with the pelvis adjustment before the leg IK, and the pelvis offset interpolated at 100–150 ms so stairs do not pop.
6. Foot IK traces are batched, capped at two per character, and disabled at LOD 2 and beyond.
7. Every additive clip names an explicit reference pose, and mask boundaries use a 2–3 bone depth falloff.
8. Animation compression error thresholds are specified at end effectors, tighter on fingers and facial bones, and compressed animation footprint is tracked per milestone.
