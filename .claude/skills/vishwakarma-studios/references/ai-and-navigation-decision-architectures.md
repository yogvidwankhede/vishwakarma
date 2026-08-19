# AI and navigation: decision architectures and legibility

This part covers how a single agent decides what to do — behaviour trees, GOAP, utility scoring and hierarchical state machines, and how to choose between them — and the animation, audio and timing techniques that make those decisions readable. Navigation is covered in ai-and-navigation-pathfinding-and-navmesh and ai-and-navigation-movement-and-spatial-queries; squad coordination, perception and encounter composition are in ai-and-navigation-squads-perception-and-encounters.

## 1. Behaviour trees

A behaviour tree evaluates from the root each tick, descending through composite nodes until it reaches a leaf that acts. Every node returns success, failure or running, and that third value is what makes the structure work for actions that span many frames.

| Node type | Semantics | Use |
|---|---|---|
| Sequence | Runs children in order; fails on first failure; succeeds if all succeed | Plans: "move to cover, then crouch, then shoot" |
| Selector (fallback) | Runs children in order; succeeds on first success | Priority lists: "attack if able, else advance, else patrol" |
| Parallel | Runs children concurrently with a success/failure policy | "Move while shooting" |
| Decorator | Wraps one child: inverter, cooldown, retry, condition guard | Guards and modifiers without polluting leaf logic |
| Condition leaf | Reads the blackboard, returns success or failure immediately | "Is the player visible" |
| Action leaf | Performs work, returns running until done | "Move to position" |

The blackboard is the shared, typed key-value store the tree reads and writes: target actor, last known position, current cover point, threat level, ammunition. Keeping all state on the blackboard rather than inside nodes is what makes trees reusable across agent types and inspectable in a debugger, and it is the single most valuable convention in the pattern.

The reactivity problem is intrinsic to the structure. A tree that re-evaluates from the root each tick reacts immediately to a new threat but repeatedly restarts long-running actions and thrashes at decision boundaries; a tree that resumes its running node preserves long actions but does not notice that the world changed. The standard resolution is observer-based aborts — Unreal Behaviour Trees call these decorator abort modes (`Self`, `Lower Priority`, `Both`) — where a condition decorator registers for change notifications on its blackboard keys and aborts the running subtree only when its specific condition flips. This turns the tree event-driven, makes the tick cost proportional to what changed rather than to tree size, and confines reactivity to declared points. Without it, expect either sluggish reactions or an agent that stutters between two behaviours at a boundary.

Trees become unmaintainable at a predictable point: somewhere between 150 and 300 nodes for a single agent, or as soon as the same condition appears as a guard in more than about six places. The symptom is that adding a behaviour requires editing conditions in distant branches to prevent it firing at the wrong time, which is the tree expressing a cross-cutting concern it has no structure for. The remedies are to factor common subtrees into reusable subtree assets parameterised by blackboard keys, to move arbitration out of the tree into a scoring layer that selects which subtree runs (a utility selector at the root), and to split by scope — one small tree for combat, one for movement, one for idle behaviours, running in parallel with an arbiter.

Studio: behaviour trees with observer aborts, a visual debugger showing the active path and blackboard values live, and a rule that any subtree exceeding 40 nodes is factored. Solo: a behaviour tree if the engine ships one, a hierarchical state machine if it does not, and no planner.

## 2. GOAP

Goal-Oriented Action Planning treats behaviour as a search problem: actions declare preconditions and effects over a world-state representation, a goal declares a desired state, and a planner runs A* backwards through action space to find a sequence achieving it. *F.E.A.R.* is the canonical shipped implementation, and its enemies remain a reference point for perceived tactical intelligence.

The cost model is what determines whether it fits. Search is exponential in plan depth with branching factor equal to the number of applicable actions: with 20 actions and a depth limit of 5 the worst case is enormous, and only aggressive precondition pruning keeps it tractable. Real implementations keep the action set at 15–40 actions, cap plan depth at 4–6, and see replans of 0.1–2 ms, which is affordable at 10 agents replanning occasionally and not at 100 agents replanning per second. Bound the search by node count, cache plans, and replan only when the world state relevant to the current plan changes or the plan fails — replanning every tick eliminates the entire advantage of planning.

Planning beats scripting in exactly one situation: when the number of valid action combinations is large enough that enumerating them by hand is infeasible, and when emergent sequences are a design goal rather than a risk. An agent that can vault, kick over a table, throw a grenade, suppress, flank and heal, in any order the situation permits, has hundreds of viable sequences and few of them are worth authoring individually. That is the case GOAP is for.

Few shipped games use it, and the reasons are practical rather than theoretical. The output is unpredictable, so QA cannot enumerate expected behaviours and a bug report reads "the agent did something strange once". Debugging requires reconstructing why a plan was selected, which means tooling that visualises the search, and building that tooling costs more than the planner. Designers cannot easily force a specific behaviour for a scripted moment without adding artificial preconditions that corrupt the model. And the legibility principle stated in ai-and-navigation-pathfinding-and-navmesh works against it: a plan the player cannot anticipate is not read as intelligence, it is read as inconsistency. The pattern that survives contact with production is a small planner used for tactical action selection inside a behaviour tree branch, not as the top-level architecture.

Hierarchical task networks are the planner variant that survives production more often, because they plan over designer-authored decompositions rather than over raw action preconditions. A compound task decomposes into methods, each with a condition and an ordered list of subtasks, so the search space is the authored hierarchy rather than every permutation of the action set. Planning cost falls by an order of magnitude, the output is enumerable enough for QA, and designers retain control of what sequences are possible. *Killzone 2* and *Horizon Zero Dawn* shipped HTN-based AI on exactly this reasoning. If planning is genuinely required, evaluate HTN before GOAP.

## 3. Utility AI

Utility systems score every available action each evaluation and pick the highest, where each score is a combination of normalised considerations passed through response curves. There is no explicit control flow; behaviour emerges from the scoring landscape.

A consideration maps a world value to `[0, 1]`, and the curve shape carries the design intent. Linear expresses proportional relevance; quadratic and cubic express "only matters when extreme"; logistic expresses a soft threshold with a tunable knee; inverse curves express aversion. Scoring an action as the product of its considerations means any consideration near zero vetoes the action, which is usually what is wanted, but it also means scores collapse as consideration count rises — four considerations averaging 0.6 multiply to 0.13. The standard fix is a compensation factor, `score = product × (1 + (1 − product) × (1 − 1/n))`, applied so that actions with many considerations are not systematically penalised against actions with few.

| Curve | Shape | Reads as |
|---|---|---|
| Linear | `x` | Proportional relevance; the default when nothing else is known |
| Quadratic / cubic | `x^2`, `x^3` | Only matters when the input is high; suppresses weak signals |
| Inverse quadratic | `1 - (1-x)^2` | Matters immediately, saturates early; urgency |
| Logistic | `1 / (1 + e^(-k(x-m)))` | A soft threshold at `m` with steepness `k`; the workhorse for needs |
| Step with smoothing | `smoothstep(a, b, x)` | A bounded band of relevance; distance windows for weapons |
| Inverted | `1 - f(x)` | Aversion; distance from allies, exposure to fire |

The tuning burden is the honest cost and it is superlinear. Every action needs a score curve per consideration, each curve has 2–4 parameters, and the parameters interact through the maximum-selection: raising one action's score suppresses others in ways that are not local. Twelve actions with four considerations each is roughly 100–200 tunable numbers with global coupling, which is why utility systems need iteration tooling — a live inspector showing every action's current score and each consideration's contribution — before they need more actions. Without that inspector, tuning is guesswork and the system becomes a liability.

Utility's strength is simulation-heavy games where agents have many weakly-ordered needs and no natural priority: *The Sims* selects among hundreds of interactions scored by advertised need satisfaction, colony and management simulations select among dozens of jobs, and open-world ambient NPCs choose among daily activities. In these cases there is no correct ordering to encode in a tree, and the scoring landscape is a more honest representation of the design than any control flow would be. Utility also composes well as a selector at the root of behaviour trees — score which subtree to run, then run structured behaviour inside it — which captures most of the benefit with a fraction of the tuning surface.

Two guards against the classic failures. Add hysteresis: give the currently running action a score bonus of 10–25% so an agent does not oscillate between two near-equal options every evaluation, which is the most-reported utility bug. And evaluate at 2–10 Hz rather than per-frame, since utility decisions are strategic and the cost is proportional to actions times considerations.

## 4. HFSM and choosing between the four

A hierarchical finite state machine is a state machine whose states may contain nested machines, with transitions declared at each level. It is the simplest structure that scales past a flat FSM, because a flat machine's transition count grows as the square of its state count while a hierarchy factors shared transitions to the parent — "when health drops below 20%, go to Flee" is written once on the Combat superstate rather than on each of its eight substates. History states allow returning to the previous substate when a superstate is re-entered, which is what makes interruptions like "take cover, then resume what you were doing" expressible.

HFSMs are undervalued. They are exhaustively enumerable, so QA can test every state; they are trivially debuggable, because the current state is a name; and they map directly to animation state machines, which agents need anyway. Their limit is combinatorial: behaviour that is genuinely the product of several independent axes (stance × alertness × role × mobility) explodes into states, and that is the point to move to a tree or a utility selector.

| Axis | HFSM | Behaviour tree | Utility | GOAP |
|---|---|---|---|---|
| Minimum viable team | 1 engineer | 1 engineer plus designer tooling | 1 engineer plus strong tuning support | 1–2 engineers plus dedicated debug tooling |
| Iteration speed | Fast to change, slow to restructure | Fast; visual editing by designers | Fast numerically, slow structurally | Slow; effects ripple through the whole action set |
| Designer accessibility | High, if visual | High; the strongest of the four | Medium; requires numeric intuition | Low |
| Debuggability | Highest; state is a name | High with a live tree view | Medium; needs a score inspector | Lowest; needs plan-search visualisation |
| Behaviour predictability | Highest | High | Medium | Lowest |
| Scales to many behaviours | Poor beyond ~25 states | Good to ~200 nodes per tree | Good; adding an action is local | Best in principle, worst in practice |
| Runtime cost | Negligible | 2–20 µs per tick per agent | 10–100 µs per evaluation | 0.1–2 ms per replan |
| Best fit | Ambient NPCs, simple enemies, animation-coupled agents | Combat AI, the general default | Simulation, needs-driven agents, action selection layer | Tactical action selection in a narrow domain |

The selection rule: default to a behaviour tree for combat agents, HFSM for anything with fewer than about 20 named behaviours or tight animation coupling, utility as a selector layer when the ordering of behaviours is genuinely situational, and GOAP only when emergent action sequences are an explicit design pillar with tooling budget attached. Mixing is normal and correct — a utility selector choosing among behaviour-tree subtrees whose leaves drive an animation HFSM is a common and healthy AAA shape.

## 5. Legibility techniques

These are where perceived intelligence is actually produced, and they cost animation and audio time rather than CPU.

Telegraph every consequential action with a wind-up long enough to react to. Human reaction time to a visual stimulus is 200–250 ms, and reacting with a considered choice rather than a reflex takes 400–600 ms. A melee attack with a 150 ms wind-up is unreactable and reads as unfair; 400–600 ms is readable and still feels aggressive; above 1 s it feels sluggish unless the payoff is proportionally large. Boss attacks that demand a specific counter sit at 700 ms–1.2 s. The wind-up must also be distinct per attack: two attacks with similar wind-ups and different counters teach the player that reading is futile.

| Action class | Wind-up | Rationale |
|---|---|---|
| Light melee, chip damage | 250–350 ms | Reactable by a prepared player; punishes inattention only |
| Heavy melee, high damage | 500–800 ms | Must be dodgeable on reaction from neutral |
| Ranged aimed shot | 400–700 ms from acquisition | Gives time to break line of sight |
| Grenade or area denial | 700 ms warning plus 1.5–3 s fuse | Two-stage: the bark warns, the fuse gives movement time |
| Boss signature attack | 800 ms - 1.2 s | Demands a specific counter; must be identifiable before commitment |
| Unblockable or grab | 600 ms plus a distinct colour or audio cue | The tell must differ in kind, not merely in duration |

Lead with audio, because it works when the agent is off-screen and it reaches the player earlier. A shout, a weapon charge or a footfall 200–400 ms before the visual commitment gives the player time to orient, and it is the reason *Halo*'s grunts announce grenades and *Left 4 Dead*'s special infected each have a unique audible tell that carries through walls. Barks also externalise state directly — "reloading", "flanking left", "he's behind the crates" — which converts an invisible decision into information, and this single technique does more for perceived intelligence than any decision structure.

Move so that intent is visible. An agent flanking should take a visibly wide arc rather than the shortest occluded route, hold a moment at cover before breaking, and orient towards its destination early. The optimal path is frequently the least legible one, and biasing path cost towards routes within the player's view cone is a legitimate and common cheat.

Deliberate incompetence is a design tool with specific parameters. First-shot misses: the first burst after acquiring a target is deliberately inaccurate, tightening over 0.5–2 s, which gives the player a window to react to being spotted. Reaction delay: 250–800 ms between perceiving and acting, scaled by difficulty, so the player is not punished for a moment of exposure. Accuracy scaled to the player's current state — reduced when the player is already at low health — is the standard shipped implementation of comeback assistance and is almost never noticed. Attack token systems: only 1–2 agents in a group are permitted to attack at any moment while the rest reposition, which is why fights against six enemies remain readable rather than resolving into instant death; *Batman: Arkham* and *Middle-earth: Shadow of Mordor* made this explicit and it is now standard for melee combat.

The rule that governs all of it: an AI must lose believably. Defeat should look like the player outplaying the agent, not the agent malfunctioning. A dying enemy that panics, retreats, calls for help or attempts a desperate attack is read as a defeated opponent; one that keeps walking forward into fire is read as broken, and it retroactively cheapens everything the player did to reach that point. Budget explicit low-health, losing-fight and last-agent-standing behaviours; they are the ones the player remembers.

## Pass conditions

Answer yes to every applicable line before the AI and navigation layer is considered correct.

1. Every consequential enemy action has a wind-up of at least 300 ms, distinct per action, and the timings are recorded as design values rather than animation accidents.
2. Agents announce state changes through audio barks that are audible off-screen and through walls where the fiction permits.
3. The decision architecture is chosen against the comparison table with team size and iteration speed named, not adopted by default.
4. Behaviour tree conditions that must interrupt running actions use observer aborts, and no subtree exceeds roughly 40 nodes without being factored.
5. All agent state lives on a typed blackboard that a live debugger can display alongside the active tree path or current state name.
6. Utility scoring includes a compensation factor, hysteresis on the running action, and a score inspector showing per-consideration contributions.
7. Any planner is bounded in node count and plan depth, replans only on relevant world-state change, and has search visualisation tooling before it has more actions.
8. Losing and low-health behaviours exist and are distinct, so defeat reads as the agent being beaten rather than malfunctioning.
