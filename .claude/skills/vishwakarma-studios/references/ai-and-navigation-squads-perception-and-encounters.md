# AI and navigation: squads, perception, encounters, and performance

This part covers what a group of agents shares and coordinates, what each agent is allowed to know, how fights are composed around them, what the whole AI layer is allowed to cost, and how to diagnose it when it misbehaves. Individual decision structure and telegraphing are covered in ai-and-navigation-decision-architectures.

## 1. Group and squad coordination

Coordination is what turns competent individuals into a readable encounter, and the cheapest structure that works is a squad-level layer that issues roles and permissions to agents which otherwise run their own decision logic. Distributed negotiation between peers is more elegant and consistently harder to debug; a single squad coordinator holding shared state is the shipping choice.

The coordinator owns three things. Slot assignment: the space around the player is divided into approach slots — front, flanks, rear, ranged standoff — and agents are assigned to slots rather than choosing positions independently, which is what stops six agents converging on one spot and prevents the empty-flank look where everyone attacks from the same angle. Attack tokens: a fixed number of permissions to attack, typically 1–2 for melee and 2–4 for ranged, held for 2–5 s and then rotated, which controls incoming damage rate without touching per-agent damage numbers and is the single most effective readability mechanism in group combat. And shared knowledge: last known player position, contact confidence and a shared search assignment, propagated with the delay described in the perception section so the sharing remains observable.

Suppression and flank pairs are the two coordinated behaviours worth the complexity. One agent maintains fire on the player's position while a second moves along a route that is deliberately within the player's peripheral view; the pairing is legible because the player can hear the suppression and see the movement, and each half is meaningless alone. *F.E.A.R.* and *Halo* both derive most of their reputation from this pattern plus barks, not from their decision architecture.

Two failure modes to design against. Coordination that the player cannot perceive is wasted computation — if the flank is never seen and never announced, it is indistinguishable from an agent wandering. And a coordinator that reassigns roles faster than agents can execute them produces agents that start moving and immediately stop; hold role assignments for a minimum of 3–5 s regardless of how the tactical situation changes.

## 2. Perception

Perfect perception feels unfair because it is unobservable. If an agent reacts to something the player has no way to know it could sense, the player learns that stealth is arbitrary. The perception model must therefore be simple enough to be understood and communicated, not accurate.

Sight is a cone plus a distance plus a line-of-sight test, with the cone narrower than a real field of view precisely so the player can model it: 90–120° horizontal for an alert agent, 60° for one focused on a task, and a small full-circle awareness radius of 2–4 m so the player cannot stand directly behind an agent indefinitely. Detection is not binary. Accumulate an awareness value from 0 to 1 at a rate that falls with distance, rises with target movement speed and illumination, and falls with target crouch or cover: 0.3–1.0 s to full detection at close range, 2–5 s at maximum range. Expose that accumulation to the player as a meter, a reticle change or an audible rising tell, because the accumulation is what makes stealth a system with feedback rather than a coin flip.

Line of sight is a small number of ray casts against the target's key points — head, chest, pelvis, and two at the extremities — not one to the origin, because a single centre ray makes an agent that is 90% visible completely unseen. Cast at 5–10 Hz per agent, not per frame, and stagger the casts across agents.

Hearing is a radius per sound class with an urgency, and it should propagate as an event rather than be polled: a suppressed shot at 8 m, an unsuppressed shot at 40–60 m, a footstep at 3–8 m by movement mode, a body drop at 10 m, a thrown object at 15 m. Sounds carry a world position, so the response is to investigate a location rather than to acquire a target — which is the mechanism that makes distraction items work.

| Sense | Typical parameters | Notes |
|---|---|---|
| Sight, alert | 90–120° cone, 25–40 m, 5–10 Hz checks | Narrower than human vision so the player can model it |
| Sight, occupied | 60° cone, 15–20 m | Distraction and task states reduce the cone visibly |
| Proximity awareness | 2–4 m, full circle | Prevents standing behind an agent indefinitely |
| Hearing, footsteps | 3–8 m by movement mode | Sprinting must be audibly riskier than walking |
| Hearing, unsuppressed shot | 40–60 m | Propagates as an investigate-location event |
| Hearing, thrown object | 15 m | The distraction budget; must exceed footstep radius |
| Damage sense | Instant, full confidence | Being hit always produces contact, from the hit direction |

Memory and forgetting are what make the whole model feel alive. On losing sight, the agent retains a last known position and a decaying confidence: it investigates the last known position, then searches a widening area around it, then returns to an alert patrol, then to normal, over a total of 15–60 s. Two details matter more than the timings. Extrapolate the last known position by the target's velocity at the moment of loss for a short window, so agents search where the player went rather than where they vanished — this alone accounts for much of the perceived intelligence in stealth games. And forget in stages rather than at once, with each stage announced by a bark and a posture change, so the player can read the search winding down and time their next move against it.

Share perception at the squad level, not the individual level, and make the sharing legible: an agent that spots the player shouts, and the shout propagates the contact to allies within earshot after a short delay. Silent, instantaneous group omniscience is the single most common complaint about stealth AI, and the fix costs one bark and a 0.3–1.0 s propagation delay.

## 3. Encounter design

Individual agent quality is capped by encounter structure; a well-tuned enemy in a badly composed fight is illegible regardless. The composition arithmetic is the design surface.

Roles exist to force different player responses simultaneously. A workable vocabulary: a pressure unit that closes distance and denies camping; a ranged unit that punishes standing still; an armoured or shielded unit that demands a specific tool or angle; a support unit that must be prioritised or the fight stalls; and a swarm that provides resource drain and readable threat volume. An encounter built from three roles reads as tactical; one built from six of the same unit reads as attrition.

Pacing is a shape, not a difficulty number. Alternate high-intensity engagements of 60–120 s with recovery windows of 30–60 s, and escalate across an encounter rather than opening at maximum. Sustained maximum intensity desensitises within roughly three minutes; the same content with troughs between peaks reads as more intense, because intensity is perceived as a derivative.

Spawn logic must never be visible. Spawn outside the player's view frustum and beyond a minimum distance (15–25 m in a shooter), prefer entrances the fiction supports, and cap concurrent active agents by a budget that accounts for both frame cost and readability — typically 6–12 active combatants in a corridor shooter and 20–40 in an open-arena or horde game, with the rest held in a reserve pool. Reinforcement waves triggered on the previous wave falling below roughly 40% strength keep pressure continuous without stacking.

The arithmetic of difficulty is three numbers, and tuning them independently is what separates a designed difficulty curve from a multiplier. Time-to-kill: how long the player needs to eliminate one agent, typically 0.5–2 s for trash and 5–30 s for elites. Time-to-die: how long the player survives under full incoming fire, which should be 8–20 s at full health so mistakes are recoverable and cumulative. And incoming damage rate, which is the product of attacker count, attack frequency, accuracy and per-hit damage — four levers, of which raising per-hit damage is the worst because it compresses time-to-die and removes the reaction window, while lowering accuracy or applying attack tokens preserves the fight's shape. Difficulty levels should modify accuracy, reaction delay, attack token count and enemy count first, and health and damage last, because the first four change how the fight reads while the last two only change how long it takes.

| Lever | Effect on fight shape | Use as a difficulty axis |
|---|---|---|
| Accuracy and first-shot miss window | Changes how punishing exposure is; preserves reaction time | First choice; invisible and effective |
| Reaction delay, 250–800 ms | Changes how much the player can get away with | First choice; scales cleanly across four difficulty tiers |
| Attack token count | Changes incoming damage rate and readability together | Strong; the main lever for group fights |
| Agent count | Changes threat volume and target prioritisation load | Strong, but bounded by the performance budget |
| Enemy health | Only lengthens time-to-kill | Weak; extends fights without changing them |
| Enemy damage per hit | Compresses time-to-die, removes recovery | Last resort; the standard cause of difficulty feeling unfair |

Solo: fix time-to-kill and time-to-die first, then build encounters to fill the window between them. Studio: tune the four difficulty levers independently with telemetry on player deaths per encounter, time in combat and damage sources, and treat any encounter whose death rate falls outside the intended band as a content bug with an owner.

## 4. Performance

AI is a per-agent cost multiplied by an agent count that designers will raise, so the budget must be a fixed allocation with a scaling policy inside it, not a per-agent number that gets multiplied.

A workable AAA allocation at 60 Hz is 1.5–3 ms per frame total for AI: 0.5–1.5 ms pathfinding queue, 0.5–1.0 ms decision and behaviour ticks, 0.3–0.5 ms perception, and 0.2–0.5 ms steering and avoidance. Against that, per-agent budgets fall out: a named or hero agent may take 50–150 µs per frame; a standard combatant 10–30 µs; a crowd or ambient agent 1–5 µs. Those numbers only hold if the work is distributed, which is what the following three mechanisms do.

AI level of detail is the primary lever, and the tiers are defined by distance and visibility rather than by importance alone.

| Tier | Condition | Decision rate | Perception | Movement |
|---|---|---|---|---|
| Full | In combat with the player, or on screen within 30 m | 10–30 Hz | Full ray casts at 10 Hz | Full navmesh path plus avoidance |
| Reduced | Off screen or 30–80 m, aware of the player | 2–5 Hz | Distance and cone checks only, 2 Hz | Path following, coarse avoidance |
| Background | Beyond 80 m, or off screen and unaware | 0.2–1 Hz | Event-driven only | Move along the path at speed with no local avoidance |
| Simulated | Outside the streamed region | On state change only | None | Teleport along a route by elapsed time |

Staggering distributes the remaining cost. Assign each agent a bucket, `agentId % N`, and update bucket `frameIndex % N` each frame; with N of 4 the perception cost drops to a quarter per frame while every agent still updates at 15 Hz. This converts a spike into a flat cost, which matters more than the total — 3 ms every fourth frame is a dropped frame, while 0.75 ms every frame is invisible. Add a small deterministic per-agent phase offset so agents in the same bucket do not synchronise their barks and animations, which is visible as a chorus effect.

Time-slice anything unbounded. Pathfinding runs as a request queue with a per-frame node-expansion budget: the search stores its open and closed sets and resumes next frame, so a 3 ms cross-map query becomes six frames of 0.5 ms and never breaches the budget. Planners are sliced the same way. The interface consequence is that a path request is asynchronous and the agent must behave sensibly for the 1–5 frames before it resolves, which is a design requirement, not a technical detail — the agent continues on its old path, or plays a short deliberation animation, both of which read better than a stall.

Move what can be moved off the main thread. Navmesh queries, flow field integration, ORCA solves, utility scoring and perception ray casts against static geometry all parallelise cleanly because they read a stable world and write per-agent results. Decision execution and anything touching engine object lifetimes stays on the main thread. The determinism caveat from the game-loop reference applies unchanged: results must not depend on completion order, so partition per agent rather than accumulating into shared state.

Studio: budget per tier, instrument each with a named profiler marker, and gate CI on the AI budget at the designed maximum agent count on the reference device. Solo: cap concurrent active agents, stagger updates into four buckets, make pathfinding asynchronous, and measure at twice the agent count you expect.

## 5. Engine and library mapping

| Stack | Navigation | Decision | Notes |
|---|---|---|---|
| Unreal | Recast-based navmesh, `NavMeshBoundsVolume`, navigation invokers for streamed worlds, `NavLinkProxy` for off-mesh links, per-agent-radius supported agents | Behaviour Trees with blackboard and observer aborts, Environment Query System for spatial scoring, `AIPerceptionComponent` for sight, hearing and damage senses, StateTree for HFSM-style logic, Mass for crowd scale | The most complete out-of-box stack; `AIPerception` sight config exposes cone and radius directly, and EQS is the reference implementation of scored spatial queries |
| Unity | AI Navigation package (Recast under the hood), `NavMeshAgent` with built-in avoidance, `NavMeshObstacle` carving, NavMesh Surfaces per agent type, `NavMeshLink` | No first-party decision system; Behaviour Designer, NodeCanvas or hand-rolled HFSM are the usual choices; DOTS/ECS path for crowd scale | Agent avoidance quality is adequate but not ORCA-grade; large crowds generally need a custom steering layer |
| Godot | `NavigationServer2D`/`3D`, navigation regions and links, RVO-based avoidance built in | No first-party decision system; state machines or a plugin | Navigation is server-based and thread-friendly; avoidance is an integrated RVO implementation |
| Recast / Detour | The reference navmesh generation and query library, plus `DetourCrowd` for local avoidance and `DetourTileCache` for dynamic obstacles | Not applicable | The right choice for a custom engine; almost every commercial navmesh derives from it |
| RVO2 / ORCA | Not applicable | Not applicable | Drop-in local avoidance for custom stacks, with a kd-tree neighbour search |
| Havok AI, Kynapse-lineage middleware | Navmesh generation, dynamic obstacles, large-crowd steering | Not applicable | Chosen when navmesh generation at open-world scale and streaming quality is a shipping risk |

The selection rule mirrors the rest of engineering: use what the engine ships until a measured requirement rules it out. The requirements that genuinely justify custom work are identifiable early — agent counts above roughly 500, deterministic simulation for lockstep or replay, volumetric navigation, or destructible geometry requiring continuous navmesh regeneration — and each should be raised in pre-production rather than discovered when the crowd system misses its budget.

## 6. Diagnosing AI bugs

Agents freeze in doorways or against each other. Local avoidance deadlock. Confirm by logging progress towards the goal; below 0.3 m in 1.5 s with a valid path is a deadlock. Add priority-based yielding and an explicit recovery behaviour rather than tuning the avoidance parameters, which will not fix it.

Agents take absurd routes. Check off-mesh link costs first — an underpriced jump or drop link attracts paths that should not use it — then terrain cost multipliers, then whether the heuristic is inadmissible in a way that interacts badly with weighted areas.

Agents walk into walls or stop short of the goal. The agent has left its polygon corridor, or the goal is off-mesh. Draw the navmesh, the corridor and the target polygon; a goal projected onto the navmesh with too small a search extent silently returns the nearest polygon, which may be on the other side of a wall.

Frame spikes correlated with combat starting. Synchronous pathfinding, or every agent replanning on the same frame. Move to an asynchronous queue with a per-frame budget and stagger requests.

An agent reacts before it should be able to see the player. Perception is using a single centre ray, a cone wider than the design intends, or squad knowledge is propagating instantly. Draw the cone and the rays in the debug view and log the propagation path of the contact.

Behaviour oscillates between two options. Missing hysteresis in a utility selector, or a behaviour tree condition flipping at a boundary. Add a 10–25% bonus to the running action, or a cooldown decorator on the transition.

The behaviour tree does not react to a change. The condition is inside a running subtree without an observer abort configured. Check the abort mode on the guarding decorator.

Behaviour is correct but reads as random. This is a legibility failure, not a logic failure. Add barks, lengthen wind-ups, and confirm the decision rate is not so high that the agent changes intent faster than the player can perceive it — an agent re-deciding at 30 Hz will look erratic no matter how sound each decision is.

## Pass conditions

Answer yes to every applicable line before the AI and navigation layer is considered correct.

1. Squad perception propagates through an observable event with a delay of 0.3–1.0 s, not instantly and silently.
2. Detection is a graduated accumulation with player-visible feedback, not a binary visibility test.
3. Line-of-sight tests sample multiple points on the target, run at 5–10 Hz, and are staggered across agents.
4. Agents retain a last known position, extrapolate it briefly by the target's last velocity, and de-escalate through announced stages over 15–60 s.
5. Difficulty is expressed through accuracy, reaction delay, attack tokens and agent count before health and damage, and each is a separate tunable.
6. An attack token system or equivalent limits simultaneous attackers so group fights stay readable.
7. Group behaviour is coordinated by a squad layer that assigns slots and attack tokens, and role assignments are held for at least 3–5 s.
8. Every coordinated tactic is perceivable by the player through movement within view or an audible bark; coordination the player cannot observe is removed rather than optimised.
9. Spawns occur outside the view frustum beyond a minimum distance, with a concurrent-agent cap and a reserve pool.
10. AI level-of-detail tiers are defined by distance and visibility with documented decision, perception and movement rates for each.
11. Agent updates are staggered into buckets with a deterministic per-agent phase offset, so per-frame cost is flat rather than spiky.
12. The total AI frame budget is written down, split across pathfinding, decision, perception and steering, each with a profiler marker.
13. The budget is verified at the maximum designed agent count on the weakest supported device, not at the count used during development.
14. Parallelised AI work is deterministic by partitioning per agent, with no order-dependent accumulation into shared state.
