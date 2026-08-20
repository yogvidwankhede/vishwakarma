# AI and navigation: pathfinding and navmesh

Game AI is not about intelligence; it is about legibility — the player must be able to read intent and predict consequence. An enemy that plays optimally, reacts in 20 ms and never misses is trivial to write and unbearable to fight, because the player cannot form a model of it, cannot anticipate it, and therefore cannot improve against it. Every technique in this document serves one of two purposes: computing a decision cheaply enough to afford at scale, or communicating that decision clearly enough that the player can respond to it. When the two conflict, communication wins, because a player who cannot read the AI experiences randomness, and randomness in a combat system reads as unfairness rather than as difficulty.

## 1. Legibility as the design target

State the target before the algorithms, because it determines which algorithms are worth their cost. The player must be able to answer three questions at a glance: what is this agent doing now, what is it about to do, and what did my last action change about that. An AI that answers all three with a finite state machine and good animation is better than one that answers none of them with a planner.

The practical consequences are three. Behaviour must be discrete enough to be named — "searching", "flanking", "reloading", "retreating" — because a continuous blend of intentions is unreadable even when it is smarter. State transitions must be announced before they take effect, through a wind-up, a shout, or a posture change, because a transition the player observes only through its outcome is indistinguishable from a random event. And behaviour must be consistent: the same stimulus must produce the same class of response, so the player's learned model keeps predicting correctly. An AI that flanks 40% of the time and charges 60% teaches nothing.

This is why the sophistication of the decision system correlates weakly with perceived intelligence. *Halo*'s marines and *F.E.A.R.*'s replicas are the canonical examples, and both are remembered for what they said and how they moved while deciding, not for the decision structure underneath. Budget accordingly: animation, audio and telegraph timing deserve more of the AI budget than the planner does.

## 2. A*, heuristics, and the case for inadmissibility

A* expands nodes in order of `f = g + h`, where `g` is the cost from the start and `h` is the estimated cost to the goal. The heuristic is the entire performance story: with `h = 0` it degenerates into Dijkstra and expands everything within the path cost; with a perfect `h` it expands only the path itself.

Match the heuristic to the connectivity or it will be wrong in a way that costs performance rather than correctness.

| Graph | Admissible heuristic | Notes |
|---|---|---|
| 4-connected grid | Manhattan: `dx + dy` | Overestimates on 8-connected grids, causing suboptimal paths |
| 8-connected grid | Octile: `max(dx,dy) + (√2 − 1) × min(dx,dy)` | The correct default for tile games; Euclidean is admissible here but weaker |
| Navmesh polygons | Euclidean distance between polygon centres or edge midpoints | Any-angle movement makes Euclidean tight |
| Weighted terrain | Euclidean × minimum terrain cost multiplier | Forgetting the multiplier makes the heuristic inadmissible by accident |
| Hex grid | Axial distance | Cube-coordinate distance, not Euclidean |

Admissibility — `h` never overestimating the true remaining cost — guarantees the optimal path. It also guarantees expanding every node whose `f` is below the optimal cost, which in an open area is a large disc around the start. Weighted A*, using `f = g + ε·h` with `ε` between 1.2 and 2.0, is inadmissible and returns a path at most `ε` times optimal, while typically expanding 3–10× fewer nodes. In a game this is almost always the right shipping call, and the reason is concrete: a path 8% longer than optimal is invisible to the player, who has no reference for what optimal was, while a 5× reduction in expansions is the difference between 40 agents repathing per second and 8. Ship `ε` around 1.2–1.5 for general navigation, and reserve `ε = 1.0` for cases where path cost is a visible game mechanic — turn-based movement points, logistics routing where the player computes the same number.

Two smaller heuristic details that pay for themselves. Break `f` ties towards the larger `g`, which prefers nodes closer to the goal and dramatically reduces expansion in open areas where many paths have equal cost. And add a tiny tie-breaking term proportional to the cross product of the start-goal and node-goal vectors, roughly `h × 0.001`, which biases expansion along the straight line and removes the characteristic square-blob search pattern on uniform grids.

Cost per query is what you budget against, and it varies by two orders of magnitude with the graph.

| Graph | Nodes expanded, typical | Cost per query |
|---|---|---|
| Navmesh, 200–800 polygons, medium path | 40–150 | 20–80 µs |
| Navmesh, 5,000+ polygons, cross-level path | 300–1,500 | 200 µs – 1.5 ms |
| Grid 128×128, open, no hierarchy | 2,000–8,000 | 0.5–3 ms |
| Grid 512×512, open, weighted A* ε=1.5 | 4,000–15,000 | 2–10 ms |
| Failed query (unreachable goal) | Entire connected component | Worst case; always the profiling outlier |

The failed query is the one that ruins frames. An unreachable goal forces A* to exhaust the reachable component before returning failure, so a single agent asked to path to a sealed room can cost more than every successful query that frame combined. Defend with a connectivity check before searching — assign each connected component an integer island id at bake time and compare ids in O(1) — and with a hard node-expansion cap that returns the best partial path found rather than searching to exhaustion.

Repath policy is the other half of the budget, because query cost multiplied by query frequency is what actually appears in the profile. Repath on an event, never on a timer: the goal moved more than a threshold (2–5 m for a chasing agent), the corridor was invalidated by a carve or a destroyed wall, the agent left its corridor, or the path was consumed. A chasing agent tracking a moving player should follow its existing path and only re-solve when the target has moved far enough that the path's tail is wrong, which for a 30 m pursuit is roughly every 2–4 s rather than every frame. Add a minimum repath interval per agent of 0.3–0.5 s as a hard floor so no combination of events can produce continuous re-solving.

Budget pathfinding as a fixed millisecond allocation per frame, not per agent. A workable AAA figure is 0.5–1.5 ms per frame at 60 Hz, spent by a queue that services requests in priority order and defers the rest. Agents ask for a path and receive it one to five frames later, continuing on their previous path or standing still with a legible "thinking" animation in the interim. Synchronous pathfinding inside an agent update is the single most common cause of AI frame spikes, because the cost is unbounded and correlated across agents — when a door closes, every agent repaths on the same frame.

Solo: one asynchronous path queue with a per-frame budget and an expansion cap, which is perhaps sixty lines of code and removes the entire class of pathfinding frame spikes. Studio: a query service with priority classes, per-class budgets, an island check, telemetry on queue depth and failed-query rate, and a CI assertion that no single query exceeds its expansion cap on any shipping map.

## 3. Navmesh

A navmesh is a set of convex polygons covering the walkable surface, and convexity is the property that matters: within a convex polygon, straight-line movement between any two points is guaranteed valid, so pathfinding only has to solve the polygon-to-polygon problem and local movement handles the rest. This reduces node counts by one to two orders of magnitude against a grid of comparable fidelity — a level that needs 40,000 grid cells needs perhaps 600 navmesh polygons.

Generation is voxelisation followed by region extraction, and the Recast library's parameters are the de facto vocabulary even outside Recast.

| Parameter | Typical value | Effect of getting it wrong |
|---|---|---|
| Cell size (xz voxel) | 0.15–0.3 m for a human agent | Too large loses doorways and thin ledges; too small explodes bake time and memory |
| Cell height (y voxel) | 0.1–0.2 m | Too large merges floors of a staircase; too small multiplies voxel count |
| Agent radius | 0.3–0.5 m human, 1.5–3 m vehicle | The navmesh is eroded by this; agents can then be treated as points |
| Agent height | 1.8–2.0 m | Controls where the agent fits under geometry |
| Max climb / step height | 0.3–0.45 m | Determines whether stairs are walkable surfaces or obstacles |
| Max slope | 45–50° | Above this, surfaces become non-walkable |
| Tile size | 32–128 voxels square | The unit of incremental rebuild; see dynamic obstacles |

Erosion by agent radius is the key idea and the source of the most common confusion: the mesh is shrunk by the radius so that an agent may be treated as a point, and any point inside the mesh is a position where an agent of that radius fits. Consequently one navmesh serves exactly one agent radius.

The multi-radius problem is the direct consequence. A game with 0.35 m infantry, 1.2 m mechs and 3 m tanks needs three navmeshes, each baked and stored separately — roughly linear in memory and bake time. Unity models this as Agent Types and Unreal as supported agents in the Navigation System, each producing its own mesh. The alternatives are worse in identifiable ways: baking for the largest agent makes small agents avoid gaps they fit through, baking for the smallest makes large agents attempt gaps they cannot enter and jam, and runtime clearance annotation per polygon (storing the maximum inscribed radius) works but requires the pathfinder to reject polygons per-query, which costs on every query rather than once at bake. Ship separate meshes for two or three discrete size classes and quantise every agent into one of them; that is what the shipped titles do.

Off-mesh links connect surfaces that geometry does not: jumps, ladders, drops, teleporters, vaults, zip lines. Each link carries a traversal cost, a required capability flag, and an animation to play, and the agent's movement is handed to a bespoke traversal routine for its duration rather than to the steering system. Two rules prevent the common failures: cost links realistically, or agents will path through a 6 m drop to save 3 m of walking and take fall damage doing it; and gate them by capability flag so a wheeled unit does not path over a ladder.

Dynamic obstacles have two mechanisms with very different costs. Carving cuts a hole in the navmesh at runtime, which makes the obstacle invisible to pathfinding — agents route around it correctly — at the cost of rebuilding the affected tiles, roughly 0.5–3 ms per tile depending on tile size and geometry density. Avoidance leaves the mesh intact and lets local steering handle the obstacle, which costs nothing to update but produces agents that path into a blocked doorway and mill about. The rule that follows from the costs: carve for things that block a route (a closed door, a deployed barricade, a wrecked vehicle in a corridor) and avoid for things that merely obstruct locally (other agents, a crate in an open room, a moving vehicle). Unity's `NavMeshObstacle` exposes this directly and additionally rate-limits carving by a move threshold (roughly 0.1 m) and a time threshold (roughly 0.5 s) so an object being dragged does not rebuild tiles every frame — those thresholds exist because unthrottled carving of moving objects is a reliable way to spend 10 ms per frame.

Area types and query filters are the mechanism for making the same mesh serve different agents and different intents. Each polygon carries an area type — default, water, mud, road, hazard, jump-landing — and each agent supplies a filter mapping area types to cost multipliers and to an include/exclude mask. A patrolling guard prefers roads at 0.5× cost; a fleeing civilian treats a fire hazard area as impassable; an amphibious unit includes water at 1.5× while an infantry unit excludes it. This is far cheaper than baking one mesh per behaviour, and the cost is one multiply per node expansion. The failure to guard against is a filter that excludes so much that a goal becomes unreachable, which reverts to the exhaustive-search worst case from section 2 unless the island check accounts for the filter.

Streaming worlds add one more requirement: the navmesh must be tiled, and tiles must load and unload with the geometry they describe. Unreal's navigation invokers generate tiles only within a radius of designated actors, which keeps a 64 km² world's resident navmesh at a few hundred tiles rather than tens of thousands. Two consequences follow. A path request whose destination lies in an unloaded tile must be answered by the hierarchical abstract graph rather than by the concrete mesh, so an open world needs the hierarchical pathfinding described in ai-and-navigation-movement-and-spatial-queries regardless of agent count. And an agent standing on a tile that unloads must be handled explicitly — freeze, despawn or hand to a simulated tier — because a query from a position with no navmesh returns failure and the agent stops in place.

Solo: bake with engine defaults, walk every route by hand, and fix geometry rather than parameters when a gap fails to generate. Studio: navmesh generation is a validated build step — bake times, polygon counts and per-tile memory are reported per map, an automated reachability test paths between every pair of spawn and objective markers, and a designer-visible warning fires when a level edit disconnects a region.

## Pass conditions

Answer yes to every applicable line before the AI and navigation layer is considered correct.

1. The A* heuristic matches the graph connectivity, and any inadmissible weighting is a deliberate documented value with its path-quality bound stated.
2. Every path query is bounded by a node-expansion cap and returns a best partial path rather than searching to exhaustion.
3. Unreachable goals are rejected in O(1) by a connected-component identifier before any search runs.
4. Pathfinding is asynchronous, serviced by a priority queue with a per-frame millisecond budget, and agents behave legibly during the 1–5 frames before a path resolves.
5. Navmesh bake parameters — cell size, agent radius, height, step, slope — are recorded per agent type, and each distinct agent size class has its own baked mesh.
6. Off-mesh links carry realistic traversal costs and capability flags, verified by confirming that agents do not prefer damaging drops over walking.
7. Dynamic obstacles carve only when they block a route; local obstruction is handled by avoidance, and carving is rate-limited by move and time thresholds.
8. Repaths are event-driven, with a documented per-agent minimum interval, and no agent re-solves its path on a timer or every frame.
9. Navmesh area types and per-agent query filters express terrain preference and passability, and the reachability check accounts for the active filter.
