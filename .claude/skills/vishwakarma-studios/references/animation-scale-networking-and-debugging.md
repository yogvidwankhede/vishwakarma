# Animation at Scale: Retargeting, LOD, Networking, and Debugging
This part covers what happens once the animation system meets production scale: sharing clips across skeletons, throttling evaluation and skinning as character counts rise, procedural layers such as springs, ragdoll blending and motion matching, what replicates in a networked game, and how to diagnose the resulting symptoms against a budget. It assumes the graph, blending and layering material in `animation-graphs-and-blending.md` and `animation-timing-ik-and-layers.md`.

## 1. Retargeting across skeletons


Humanoid retargeting normalises a skeleton to a canonical rig so any humanoid clip plays on any humanoid character. Unity does this through the Avatar and muscle space; Unreal through the IK Rig plus IK Retargeter; Godot through `SkeletonProfileHumanoid` and a `BoneMap`. Generic retargeting instead maps bone to bone, preserving rotations exactly but requiring matching hierarchies.

The trade. Humanoid buys a shared animation library across differently proportioned characters and marketplace or mocap content that works immediately. It costs roughly 15–30% more CPU per evaluation in Unity, because every evaluation converts into and out of muscle space, and it costs fidelity: muscle space cannot represent every rotation, so hand-authored subtlety — a specific wrist break, a shoulder roll — is flattened toward the canonical range. Generic costs nothing at runtime and preserves everything, and buys nothing in flexibility.

The failure modes, all of which are visible and all of which have specific causes:

| Symptom | Cause | Fix |
|---|---|---|
| Every joint offset by a constant rotation | Bind pose mismatch, typically an A-pose source against a T-pose target | Author an explicit retarget pose per skeleton; do not correct at runtime |
| Hands pass through the torso, feet cross | Proportion mismatch; rotations are preserved, reach is not | Retarget rotations, then IK hands and feet to proportionally scaled targets |
| Forearm candy-wraps | Target has twist bones the source lacks, or vice versa | Map twist bones explicitly, or drive them procedurally from the wrist |
| Fingers frozen or wrong | Finger bones absent from the humanoid mapping | Retarget fingers generically alongside a humanoid body retarget |
| Feet float above or sink below the ground | Different leg lengths with a shared root height | Retarget with a root height scale, then apply foot IK |

The rule: retarget offline and bake for shipping content, and inspect the bakes. Unreal's IK Retargeter can export new animation assets directly, which removes the per-evaluation cost and lets an animator fix the residual by hand. Reserve runtime retargeting for user-generated content, marketplace assets during prototyping, and previz.

## 2. Animation LOD, update rate throttling, and skinning cost


Separate four costs before optimising any of them: graph evaluation on the CPU, pose decompression and blending on the CPU, skinning, and the render passes the skinned mesh feeds.

Graph evaluation for a 100-bone rig with a moderate Animation Blueprint — two layers, three blend spaces, foot IK — costs 0.08–0.25 ms per character per frame on one core. Sixty visible characters is 4.8–15 ms, which does not fit in a 16.67 ms frame alongside everything else on a single thread. Unreal evaluates AnimBPs across worker threads (`bRunUpdateAndEvaluateOnWorkerThreads`, on by default, requiring thread-safe update functions); Unity's Animator jobs and Playables with Burst do the equivalent. Use them, and accept the consequence stated in `animation-graphs-and-blending.md`: the graph may not write gameplay state.

Skinning: linear blend skinning with four influences per vertex is four matrix-vector products and a normalisation per vertex. A 60,000-vertex character is 0.02–0.05 ms of GPU vertex work per pass. The cost that surprises teams is that it is re-evaluated per pass unless the deformed buffer is cached: a depth prepass, three shadow cascades and the base pass is five skinning evaluations of the same character in the same frame. Unreal's GPU Skin Cache (`r.SkinCache.Mode=1`) writes the skinned positions once into a buffer every subsequent pass reads, typically saving 20–40% of skeletal vertex cost in a shadow-heavy scene, and it is a hard prerequisite for ray tracing or Lumen tracing against skinned geometry.

| Tier | Screen size | Graph update | Bone LOD | Layers | IK | Skinning |
|---|---|---|---|---|---|---|
| 0 | > 25% | Every frame | Full, 100–200 bones | All | Feet, hands, aim | Full, skin cache on |
| 1 | 10–25% | Every frame | Full | Locomotion plus aim | Feet only | Full |
| 2 | 4–10% | Every 2 frames (30 Hz) | Reduced, ~40 bones | Locomotion only | None | Full |
| 3 | 1–4% | Every 4 frames (15 Hz) | Reduced, ~20 bones | Single clip or blend | None | Reduced mesh LOD |
| 4 | < 1% or off-screen | Not evaluated | — | — | — | Pose frozen |

The mechanism behind update-rate throttling is that the graph is evaluated every N frames and the resulting pose is interpolated between evaluations. Unreal's Update Rate Optimisations do this with `bInterpolateSkippedFrames`; without interpolation, a 15 Hz update on a 60 Hz display is a visible four-frame stutter, and with it the same throttle is essentially invisible past 10% screen size. This distinction is worth checking explicitly, because the throttle is often enabled and the interpolation is not.

Off-screen characters must not simply stop being updated, or they pop when they re-enter the frustum. Freeze the pose, keep the root motion and trajectory updating so position remains correct, and blend the pose back over 100–150 ms on re-entry. Crowds that need to be plausible but not accurate can drop to a shared animation instance — one evaluation feeding N instances with a per-instance time offset, which Unreal's Animation Budget Allocator and Mass Entity crowd systems both provide.

## 3. Procedural techniques: springs, ragdoll blending, motion matching


**Spring bones** for hair, cloth strips, pouches, antennae and jiggle are a mass-spring-damper per bone:

```
omega = 2 * pi * frequency
accel = omega*omega * (target - x) - 2 * zeta * omega * v
```

Use frequency 3–8 Hz and damping ratio zeta 0.5–0.8. Critically damped (zeta = 1) settles without overshoot and reads as dead; the overshoot is the secondary motion. Stability is the part that ships broken. Explicit Euler integration diverges once `omega * dt` exceeds roughly 0.5, so at 8 Hz (omega ≈ 50 rad/s) the timestep must stay under 10 ms — a 30 fps frame at 33 ms explodes, and so does a single hitched frame at 60 fps. Three fixes together: use semi-implicit (symplectic) Euler rather than explicit, substep at a fixed 120 Hz regardless of frame rate, and clamp `dt` to 1/30 s so a load hitch does not launch the character's hair into orbit. Also clamp the maximum displacement per bone, because a teleporting character otherwise drags a 40 m hair chain behind them.

**Ragdoll blending.** An instant switch from animation to simulation on death is the classic limp-drop, and it happens because the physics bodies start at the animated pose with zero velocity while the animation had momentum. Blend instead: drive the physics bodies toward the animated pose with a strength that decays to zero over 150–300 ms (Unreal's Physical Animation Component, or powered constraints elsewhere), and seed the bodies with the character's velocity plus the impact impulse. For hit reactions, do not go to a full ragdoll at all — blend a partial physical response on the upper body at strength 0.3–0.6 for 200–400 ms and blend back, which composites correctly with the additive hit reaction and never loses control of the character.

Beyond springs, two other procedural layers earn their cost cheaply. **Foot-plant locking** freezes the foot's world position during the contact phase detected from a baked curve, then releases it — this removes residual slide that speed matching cannot, at roughly 5 µs per foot, and it is the highest value-per-microsecond technique in the whole file. **Procedural lean** rotates the pelvis and spine into the acceleration vector by 3–8 degrees per g of lateral acceleration, smoothed at 150–250 ms; it costs nothing, requires no clips, and is most of what makes turns read as having momentum.

**Motion matching** replaces the state machine's locomotion section with a per-frame search: given the current pose and the desired future trajectory, find the database pose whose features best match, and play from there. The feature vector is typically 24–40 floats — future trajectory positions and facings at +0.33, +0.66 and +1.0 s, foot positions and velocities in character space, hip velocity — with per-feature weights that are the main tuning surface.

The costs, stated plainly. A database of 20–60 minutes of mocap at 30 Hz is 36,000–108,000 poses. A brute-force weighted L2 search over 100,000 poses with a 32-float feature vector is 3.2 million multiply-adds, roughly 0.3–0.8 ms per query with SIMD. Search every 0.1–0.2 s rather than every frame, restrict searching to LOD 0 and 1 characters, and move to a KD-tree or clustered search above about ten searching characters, which buys 10–50x. Memory is 30–150 MB for the feature database plus the compressed clips themselves, and the clips cannot be aggressively compressed because the search matches against decompressed poses.

Motion matching pays when third-person locomotion is what the player looks at continuously — action games, sports, open-world traversal — and when there is a mocap budget of 30 or more minutes with *systematic* coverage: every speed, every turn radius, every start and stop from every facing. It does not pay for stylised or exaggerated motion, because matching averages the style toward whatever is most common in the database; nor for first-person or top-down cameras, where the locomotion is barely visible; nor for teams without an engineer who owns it. The hidden cost is data curation, not code: database quality dominates the output, and gaps in coverage produce stuttery reselection that is materially harder to debug than a state machine, because there is no graph to look at.

Solo: do not. A well-tuned blend tree with distance matching and foot IK gets 80% of the perceived quality for 5% of the cost. Studio: it is now the default for AAA third-person locomotion (Unreal ships Motion Matching from 5.4), and the correct staffing is one animation programmer plus a mocap plan written before the shoot.

## 4. Networked animation: what replicates and what does not


The animation graph is a presentation system, and the default position is that it replicates nothing — it reads replicated gameplay state and derives a pose locally on every machine. That default is correct for locomotion and wrong for exactly two things: authored displacement, and anything whose timing must be identical everywhere.

| What | Replicate | Mechanism | Failure if you get it wrong |
|---|---|---|---|
| Locomotion pose | No | Derived locally from replicated velocity and rotation | None; this is correct |
| Aim direction | Yes, as a compressed rotation | Replicate the aim vector at 10–20 Hz, interpolate locally | Remote players appear to aim where they are not shooting |
| Montage / one-shot action | Yes, the montage identity and start time | Unreal replicates the montage and its position on `ACharacter`; elsewhere replicate an action ID plus a server timestamp | Actions missing entirely on remote clients, or playing at the wrong phase |
| Root-motion displacement | Yes, through the movement component | Unreal's `UCharacterMovementComponent` replays saved moves including root motion sources | Position desync that resolves as a visible snap |
| Animation events | No | Derive gameplay effects server-side from the replicated montage position | Double damage, or damage on clients that the server never applied |
| Ragdoll | Usually not | Trigger from a replicated death state; let each client simulate | Bandwidth cost of replicating dozens of bodies for a cosmetic outcome |

The timing model that avoids most of these problems: replicate the *cause* with a server timestamp, and let each machine compute the phase from `now - start_time`. A remote client joining mid-action then plays the action from the correct phase rather than from the beginning, and no per-frame animation state crosses the wire. The bandwidth cost is one identifier plus one timestamp per action, on the order of 6–10 bytes, against several hundred bytes per second for streaming pose state.

Interpolation of remote characters is the other half. Remote pawns are rendered 100–200 ms behind the server's authoritative state so their motion can be interpolated rather than extrapolated; the animation graph should be fed the *interpolated* velocity, not the raw replicated one, or the blend parameter jitters at the replication frequency and the character stutters between walk and run. Compute the interpolated velocity as the derivative of the interpolated position, and smooth it with the same time constant used locally.

## 5. Debugging: symptom to cause


Most animation debugging is pattern matching against a small set of mechanisms. This table is ordered by how often each cause is the answer.

| Symptom | Most likely cause | Check |
|---|---|---|
| Feet slide during steady locomotion | Playback rate not matched to controller speed | Log `v_world`, `v_clip` and `r`; slip should be under 0.12 m/s |
| Feet slide only during acceleration | Blend parameter smoothed too heavily, or no sync group | Compare smoothed parameter against raw velocity on a graph |
| Both feet hover mid-blend | Clips not phase-synced | Confirm sync group membership and marker names match |
| Controls feel unresponsive | Exit time on a player-triggered transition, or a blend over 200 ms | Read the transition's exit time and duration; both are usually the answer |
| Action starts late but ends on time | Transition duration counted inside the action's timeline | Blend time is additional to, not part of, the action window |
| Character freezes from the waist up | Override layer used where additive was needed | Check the layer's blend mode |
| Additive layer explodes the pose | Wrong reference pose on the additive clip | Compare the additive's reference against the base it is applied to |
| Visible kink at the spine | Hard mask boundary, no depth falloff | Set blend depth to 2–3 bones |
| Pelvis pops on stairs | Foot IK offset not interpolated | Apply a 100–150 ms time constant to the pelvis offset |
| Elbow or knee flips | Pole vector degenerate, or target at full chain extension | Clamp target distance to 0.99 of total bone length; derive the pole from the animated joint |
| Off-hand floats off the weapon | Hand IK running before the spine, or a missing grip socket | Verify IK order; verify the socket exists on that weapon variant |
| Double damage on one hit | Animation event firing on both clips during a crossfade | Move the effect off the event; add a per-activation token |
| Effects at full speed during hit-stop | Event-spawned systems not inheriting time scale | Scale the spawned system, or drive from a curve |
| Character pops on entering view | Off-screen pose frozen without a blend back | Blend back over 100–150 ms |
| Distant characters stutter | Update-rate throttling without interpolation | Enable interpolation of skipped frames |
| Hair or cloth explodes after a hitch | Spring integration diverging on a large delta time | Clamp `dt`, substep, use semi-implicit integration |
| Remote players stutter between gaits | Raw replicated velocity fed to the blend parameter | Feed interpolated velocity |
| Motion matching stutters | Feature weights or database coverage | Log the selected clip and frame; repeated reselection within one clip means weights, gaps mean coverage |

The tools, named. Unreal: the Rewind Debugger with Animation Insights records the whole graph's per-frame state and lets you scrub backwards, which is the only practical way to catch a one-frame transition mistake; `ShowDebug ANIMATION` prints the active state, the blend weights and the montage position on screen; `a.AnimNode.*` and the Anim Graph's debug view show per-node weights live. Unity: the Animator window shows live state and transition progress in play mode, the Profiler's Animation module attributes per-Animator cost, and the Playable Graph Visualizer exposes the graph for Playables-based systems. Godot: the AnimationTree inspector shows live blend parameters, and `SkeletonModifier3D` nodes can be toggled individually to isolate procedural contributions.

## 6. Budgets


Set these at the start of production against the lowest target platform, and track them per milestone rather than discovering them in optimisation.

| Metric | Solo / small team | AAA console, 60 fps | Mechanism it protects |
|---|---|---|---|
| Graph evaluation, per character at LOD 0 | Under 0.3 ms | 0.08–0.15 ms | Game-thread and worker-thread CPU |
| Total animation CPU, all characters | Under 2 ms | 3–5 ms across workers | Frame budget |
| Visible characters at LOD 0–1 | 5–10 | 15–25 | Evaluation plus skinning plus draws |
| Total visible skeletal meshes | 20–40 | 60–120 | Vertex throughput and draw calls |
| Bones per hero rig | 60–90 | 120–250 including facial | Evaluation cost scales linearly |
| Bones per crowd rig | 20–35 | 25–45 | Same |
| Layers per character at LOD 0 | 2–3 | 4–8 | 0.01–0.03 ms each |
| IK chains per character at LOD 0 | 2 (feet) | 4–6 (feet, hands, aim) | 1–3 µs each plus trace cost |
| Traces per character per frame | 2 | 2, batched and async | Physics query thread |
| Compressed animation, resident | 30–80 MB | 300–800 MB | Memory budget |
| Facial data per character | Skip or blendshape-lite | Under 6 MB per character per hour of dialogue | Streaming and memory |
| Clip count | Hundreds | 20,000–60,000 | Build time, memory, cook time |

Solo: the numbers that matter are total animation CPU and clip count, because both grow silently and both are cheap to measure. Studio: instrument all of them in an automated performance capture that runs nightly on target hardware, and treat a regression in per-character evaluation cost the same way as a frame-time regression, because it is one — it simply appears later, when character density rises during content production.

## Pass conditions

Answer yes to every applicable line before the animation system is considered correct.

1. Retargeting is baked offline for shipping content, with an explicit retarget pose per skeleton and proportion correction applied through IK rather than by scaling rotations.
2. An animation LOD scheme exists with stated screen-size thresholds, update-rate interpolation enabled, and off-screen characters blending back over 100–150 ms rather than popping.
3. GPU skin caching is enabled where the platform supports it, and skeletal vertex cost is measured with shadow passes included.
4. Spring bones use semi-implicit integration with a fixed substep and a clamped delta time, verified by hitching the frame rate deliberately.
5. Ragdoll transitions blend physical strength to zero over 150–300 ms and seed body velocities from the character's motion and the impact impulse.
6. If motion matching is used, the mocap coverage plan predates the shoot, search frequency and LOD gating are documented, and the pose database size is inside a stated memory budget.
7. Networked actions replicate a cause plus a server timestamp, not per-frame pose state, and remote characters' blend parameters are fed interpolated rather than raw replicated velocity.
8. Per-character graph evaluation cost, visible skeletal mesh count and compressed animation footprint are captured automatically on target hardware each milestone against the budget table.
