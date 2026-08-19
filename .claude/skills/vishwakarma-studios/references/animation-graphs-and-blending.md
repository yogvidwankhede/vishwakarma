# Animation Systems: Graphs, Blend Trees, and Root Motion
Animation is a state problem before it is an art problem. The overwhelming majority of bugs filed as "the animation looks janky" are not bad clips — they are a transition firing on the wrong frame, an interruption source nobody enumerated, a blend parameter smoothed until it lags the controller, or a clip authored at one speed played back at another. The art is usually fine. This file covers the runtime systems that assemble a pose and the arithmetic that governs whether that pose looks planted, and it assumes the animator has already done competent work.

Engine specifics are named where they differ materially: Unity Animator/Mecanim and Playables, Unreal Animation Blueprints, Control Rig and Motion Matching, Godot AnimationTree and AnimationNodeStateMachine.

This part covers the graph that selects a pose, the blend trees and synchronisation that combine locomotion clips, and the arithmetic of displacement — root motion against speed-matched in-place playback. Blend timing, events, IK and layering are in `animation-timing-ik-and-layers.md`; retargeting, LOD, networking, debugging and budgets are in `animation-scale-networking-and-debugging.md`.

## 1. The state machine is the animation system


A state machine is a set of states, each owning a pose source (a clip, a blend space, or a sub-graph), connected by transitions, each owning a condition, a duration, and an interruption policy. Four properties determine everything the player feels, and three of them are routinely left at their defaults.

| Transition property | Controls | Mechanism | Default that bites |
|---|---|---|---|
| Condition | When the transition becomes eligible | Evaluated once per graph update against the parameter set snapshotted at update time | Conditions on a parameter set later in the same frame evaluate against last frame's value |
| Duration (blend time) | How long the crossfade runs | Both states are evaluated and their poses blended by weight for the duration | 250 ms defaults on combat transitions read as input lag |
| Exit time | Which phase of the source clip permits the transition | Gates eligibility on the source clip's normalised time | `Has Exit Time` left on for a cancel transition delays the cancel by up to a full clip |
| Interruption source | Whether an in-flight transition can be pre-empted | Determines which state's outgoing transitions are polled mid-blend | Default `None` in Unity means a transition, once started, cannot be cancelled |

Exit time deserves the specific arithmetic because it produces the most-reported feel complaint in Unity projects. A transition with `Has Exit Time` and an exit time of 0.9 can only fire during the final 10% of the source clip. On a 1.2 s attack, a dodge input arriving at 40% through waits 600 ms before the transition is even eligible, then another 100–200 ms to blend. The player pressed a button and saw nothing for 0.7 s. Exit time is correct for chaining loops (walk cycle into run cycle on a foot-down frame) and wrong for anything the player triggers. Where a cancel must be gated by design — an attack that cannot be cancelled during its active frames — express that as an explicit gameplay-owned cancel window read from a curve, not as an exit time buried in a transition's inspector.

Interruption sources are the second under-set property. Unity offers None, Current State, Next State, Current Then Next, and Next Then Current; the choice determines which state's transitions are polled while a blend is running. A hit reaction that must interrupt an in-progress attack-to-attack blend requires at minimum `Current State` interruption, and preferably an AnyState transition with a priority ordering. Unreal's equivalents are transition priority ordering plus `Automatic Rule Based on Sequence Player in State`; Godot exposes `xfade_time` and `switch_mode` (Immediate, Sync, At End) on each transition, where `At End` is the Godot spelling of exit time.

Deep nesting is where these graphs die. A sub-state machine looks like encapsulation but is not: AnyState transitions still cross into it, parameters remain global, and reachability is not local — you cannot determine whether a state can be entered without reading the whole graph. A 60-state, 200-transition graph has no reader who understands it, adding a state requires auditing every AnyState edge, and because the graph is a binary asset, two people cannot edit it in the same week. The failure is organisational before it is technical.

Two replacements, in order of how much change they require. **Layered states**: a small base locomotion machine of 8–12 states, plus masked layers for upper body, additives and facial, each with its own small machine. Each layer stays readable because each layer answers one question. **A data-driven selector**: states become rows in a table (tag set, pose source, blend time, interruptible-by tag set, priority), and a 200-line evaluator picks the highest-priority row whose tags are satisfied. Adding an animation becomes adding a row, which is a text diff a designer can make and two people can merge. Unreal's route to the same place is Anim Layer Interfaces and Linked Anim Graphs for structure, with StateTree or the Gameplay Ability System owning the decision and the AnimBP reduced to a pose-assembly device; Godot's is one AnimationNodeStateMachine per functional group with a script driving the parameter set.

One structural point that makes the cap easier to hold. A state machine's job is to answer "which pose source is authoritative right now", and nothing else. Every additional responsibility loaded onto it — deciding whether an attack is valid, tracking combo counters, gating on stamina, remembering which weapon is equipped — multiplies the state count, because each of those is an orthogonal axis and the machine can only express the cross product. Move each axis out: gameplay owns validity, a tag set owns weapon identity, a counter owns the combo, and the machine reads the result. A graph that expresses one axis needs O(n) states; a graph that expresses four needs O(n^4), and that exponent is the whole reason animation graphs become unmaintainable.

The corollary is a naming and ownership convention worth imposing on day one: a state is named for the pose it produces, not for the situation that caused it. `Attack_Sword_Light_02` is a pose; `Attack_After_Dodge_With_Low_Stamina` is a situation, and its existence means a gameplay condition has leaked into the graph.

Cap a machine at roughly 15 states and 40 transitions per layer. Past that, add a layer or move to data.

Solo: a single machine of 15–20 states is fine for a whole game, and the selector is over-engineering until you have more than about 40 distinct actions. Studio: mandate the cap in review, and make the animation graph read-only with respect to gameplay state. Unreal evaluates AnimBPs on worker threads, so writing gameplay state from an anim node is a data race that manifests as a rare, unreproducible desync — the graph reads, the gameplay writes, never the reverse.

## 2. Blend trees and the parameter smoothing that stops foot-sliding


A 1D blend tree maps one parameter to a set of clips at thresholds and blends the two adjacent clips by linear weight. The thresholds must be the clips' authored root speeds, not round numbers chosen for tidiness. If the walk clip's root travels 1.6 m/s and the threshold is set at 1.5, the blend is wrong by 6% everywhere in that segment, and that 6% is foot slide.

| Parameter | Idle | Walk | Jog | Run | Sprint |
|---|---|---|---|---|---|
| Authored root speed (m/s) | 0.0 | 1.6 | 3.1 | 4.7 | 6.4 |
| Threshold to use | 0.0 | 1.6 | 3.1 | 4.7 | 6.4 |
| Playback rate at threshold | — | 1.0 | 1.0 | 1.0 | 1.0 |

2D blend spaces come in two mathematically distinct forms and choosing wrong produces a specific artefact. **Directional** blending (Unity's Simple/Freeform Directional, Unreal's BlendSpace with a directional axis) interpolates in polar space, so the wrap at ±180° is continuous and blending between forward-left and forward-right passes through forward. **Cartesian** blending (Freeform Cartesian) interpolates in the plane, so the same blend passes through the origin — which is the idle sample — and the character momentarily stands still mid-turn. Use directional for anything whose axes are angle and magnitude; use Cartesian only when both axes are genuinely independent scalars, such as lean-forward against lean-right.

Sample count is the other authoring decision. A directional locomotion set at 4 samples (forward, back, left, right) blends through poses that were never authored, and the diagonal is visibly an average rather than a run; 8 samples (adding the diagonals) is the minimum that reads correctly, and 8 samples at each of three speeds is 24 clips per locomotion set per character archetype. That number is worth stating out loud in preproduction, because it multiplies by weapon stance, by injury state, by crouch, and a "simple" locomotion system reaches 200 clips before anyone notices.

Solo: 8 directional samples at two speeds (walk, run), one stance. Studio: 8 samples at three speeds per stance, with a strafe set and a crouch set, authored as a single mocap session with a shot list derived from the blend space's sample positions rather than from an animator's intuition.

Parameter smoothing is where the second class of sliding comes from. Raw input direction changes in a single frame; feeding it unfiltered to a blend space snaps the pose and looks robotic. The standard fix is exponential smoothing, and the standard mistake is writing it frame-rate dependently:

```
// frame-rate dependent: different feel at 30, 60 and 120 fps
x = lerp(x, target, 0.15);

// frame-rate independent: tau is a real time constant in seconds
x += (target - x) * (1.0 - exp(-dt / tau));
```

Use tau of 80–150 ms for locomotion speed and 60–100 ms for direction. The trap is that smoothing the blend parameter makes the *animation* lag the *controller*: the character is physically moving at 5 m/s while the blend space is still reporting 3.5 m/s and playing a jog. That is a 30% speed mismatch, which is a foot slide of about 0.4 m/s. The resolution is to separate the two consumers. Smooth the parameter that selects the pose; drive the playback rate from the unsmoothed, actual controller speed. The pose eases; the cadence tracks exactly.

Blending two locomotion clips is only correct if they are phase-aligned. A walk cycle and a run cycle authored independently have different durations and different foot-down frames; blending them at 50/50 without alignment produces a pose that is left-foot-down in one clip and right-foot-down in the other, which averages to both feet hovering. This is the artefact people describe as "the character moon-walks during acceleration", and no amount of speed matching fixes it because the problem is phase, not rate.

Two mechanisms solve it. **Normalised-time sync groups** (Unity's sync groups on a blend tree, Unreal's Sync Groups on sequence players, Godot's `AnimationNodeBlendSpace` with matched lengths) force all members of a group to share a normalised time, with one clip designated the leader whose length sets the group's effective duration. This is cheap and correct when the clips have the same structural layout — two strides per cycle, contacts at the same fractions.

**Marker-based synchronisation** is the version that works when they do not. Each clip carries named sync markers (`LeftFootDown`, `RightFootDown`, typically two to four per cycle), and the runtime aligns playback so markers of the same name coincide, interpolating the effective play rate between markers. This tolerates a walk with a long double-support phase blending against a run with a flight phase, which normalised time cannot. Unreal supports markers natively on sequence assets; Unity requires either equal-length clips or a hand-rolled solution over Playables.

| Blend case | Sync mechanism | Failure without it |
|---|---|---|
| Walk to jog, same structural cycle | Normalised-time sync group | Mild foot mismatch during the blend |
| Walk to run, different support phases | Sync markers | Both feet hover mid-blend |
| Directional 2D locomotion (8 clips) | Sync markers, one shared marker set | Feet swap on every direction change |
| Locomotion to a one-shot action | None; use a plain crossfade | N/A |
| Two additive layers | None; additives are deltas, not cycles | N/A |

The rule: any blend between two cyclic clips needs synchronisation, and any blend between clips with structurally different cycles needs markers rather than normalised time. Authoring markers is an animator task with a per-clip cost of a minute or two; budget it into the locomotion set from the start rather than retrofitting it, because retrofitting means touching every clip.

## 3. Root motion versus in-place, and the sliding arithmetic


State the maths first, because the decision follows from it. Let `v_world` be the controller's world speed, `v_clip` the clip's authored root speed, and `r` the playback rate. During a planted foot contact of duration `t_c`, the foot's drift across the ground is:

```
slip_velocity = |v_world - r * v_clip|
drift         = slip_velocity * t_c
```

A run cycle at natural cadence holds each foot planted for roughly 0.22–0.28 s. Contact-point drift becomes perceptible at about 2–3 cm, which at `t_c = 0.25 s` means a slip velocity of 0.08–0.12 m/s. On a 5 m/s run that is a tolerance of roughly 2%. Speed matching is not a polish pass; it is a hard numeric requirement.

The worked failure case: a run clip authored at 4.2 m/s, a controller moving at 5.6 m/s, playback rate left at 1.0. Slip velocity is 1.4 m/s, drift per contact is 35 cm. That is not subtle sliding, that is skating, and no amount of clip re-authoring fixes it. The fix is `r = v_world / v_clip`, clamped to roughly 0.75–1.25 — outside that range the gait's cadence reads visibly wrong (a run played at 1.4x reads as comedic) and the correct answer is another clip in the blend tree.

| | Root motion | In-place with speed-matched playback |
|---|---|---|
| Source of truth for displacement | The clip | The character controller |
| Fidelity of arcs, weight shifts, turns | Authored exactly | Approximated by the blend |
| Foot sliding | Structurally impossible | Requires the rate match above |
| Controller can clamp, steer, or be pushed mid-action | Fights the clip; desyncs | Free |
| Collision mid-action | Must stop, slide or warp the clip | Handled by the controller |
| Network prediction | Hard; only viable through a replicated montage system | Standard; predicts like any movement |
| Variable terrain and slopes | Needs warping | Free |
| Hitting an exact target position | Free | Needs motion warping or distance matching |

The decision rule. Use root motion for discrete authored actions where the exact displacement is the point: attacks with a lunge, dodges, vaults and traversal, mounts and dismounts, finishers, cinematics. Use in-place with speed-matched playback for continuous locomotion, always. The hybrid is what every AAA third-person game ships. In a competitive multiplayer game, root motion for continuous movement is a correctness problem, not a taste one — the client and server graphs are not phase-locked, so the displacement they compute diverges, and the reconciliation snaps.

Two techniques close the remaining gap. **Motion warping** (Unreal's Motion Warping component, equivalents hand-written elsewhere) scales and rotates the root delta of a root-motion clip so the character lands on a specified target transform — a vault reaches the ledge regardless of where the player started it. **Distance matching** selects the clip's phase from distance-to-target rather than from elapsed time, which removes start and stop slide entirely: the start clip's phase is driven by distance travelled since the input, so the feet are always where that distance says they should be. Distance matching costs one curve per clip (root distance travelled versus time) and a binary search per frame, roughly 1–2 µs, and it is the single highest-value technique for making starts and stops look planted.

## Pass conditions

Answer yes to every applicable line before the animation system is considered correct.

1. No state machine layer exceeds roughly 15 states and 40 transitions; anything larger has been split into layers or moved to a data-driven selector.
2. The animation graph reads gameplay state and never writes it, and multithreaded graph evaluation is enabled with thread-safe update functions.
3. Every player-triggered transition has `Has Exit Time` off, and cancel windows are expressed as gameplay-owned curves rather than transition exit times.
4. Interruption sources are set explicitly on every transition that must be pre-emptible, and hit reactions demonstrably interrupt an in-flight attack blend.
5. Blend tree thresholds equal the clips' authored root speeds, verified by measuring root displacement rather than by reading the clip's name.
6. Blend parameters are smoothed with a frame-rate-independent exponential filter at a stated time constant, and playback rate is driven from unsmoothed controller speed.
7. Every blend between cyclic clips is synchronised, with markers rather than normalised time wherever the cycles differ structurally.
8. Locomotion playback rate is speed-matched with `r = v_world / v_clip` clamped to 0.75–1.25, and measured slip velocity stays under 0.12 m/s at every locomotion speed.
9. Root motion is used only for discrete authored actions; no continuous locomotion in a networked game is root-motion driven.
10. Starts and stops use distance matching or motion warping, and are checked on a slope as well as on flat ground.
