# AI and navigation: movement, avoidance, and spatial queries

This part continues from ai-and-navigation-pathfinding-and-navmesh, which covers the legibility target, A* and navmesh generation. It deals with everything around and after the route: making queries affordable on a large world, converting a graph path into a walk, keeping agents from colliding while they follow it, navigating agents that do not walk on a floor, and choosing where an agent should stand when it arrives.

## 1. Flow fields

Per-agent A* costs `agents × queryCost`. When many agents share a destination, the cost of computing the field once is `cells` regardless of agent count, and each agent then reads a direction vector in O(1). The crossover is arithmetic: a flow field over a 256×256 grid costs roughly 1–3 ms to integrate; an A* query on the same grid costs 0.5–3 ms; therefore the field pays for itself somewhere around 5–20 agents sharing a goal, and dominates overwhelmingly above 50.

Construction is three passes. A cost field assigns per-cell traversal cost from terrain and static obstacles, with impassable cells marked. An integration field runs a Dijkstra or eikonal sweep outward from the goal, accumulating least cost to reach it. A flow field then stores, per cell, the direction towards the lowest-cost neighbour, quantised to 8 or 16 directions in a single byte.

| Grid | Integration cost | Memory (byte direction + uint16 cost) |
|---|---|---|
| 128×128 | 0.3–1 ms | 48 KB |
| 256×256 | 1–3 ms | 192 KB |
| 512×512 | 5–15 ms | 768 KB |
| 1024×1024 | 20–60 ms | 3 MB |

The cost model that matters for shipping: one field per distinct goal, cached and reused until the goal or the obstacle set changes, and amortised across frames by integrating a band of cells per frame for large grids. An RTS with 12 selected groups moving to 12 destinations needs 12 fields, which is the practical ceiling — above roughly 20 simultaneous fields, memory and integration cost overtake the saving and hierarchical per-agent pathing becomes competitive again. Fields also compose: a shared long-range field for the destination plus per-agent local avoidance handles both scales without either doing the other's job.

Flow fields are the right answer for large same-goal crowds — RTS unit orders, tower-defence creep waves, zombie hordes converging on the player, evacuation and city-crowd simulation — and the wrong answer when every agent has a different destination, which is exactly the common case in a shooter or an RPG. Do not adopt them because unit counts are high; adopt them because goal counts are low.

## 2. Hierarchical pathfinding

A* cost grows with the area searched, so on a large world the fix is to search a smaller graph. Hierarchical pathfinding partitions the world into clusters, precomputes the cost between the entrances of each cluster, and solves the path on the abstract graph first, refining only the cluster the agent is currently traversing.

The standard structure — HPA* — uses clusters of 10×10 to 16×16 cells, identifies entrances as maximal contiguous openings on cluster boundaries, and links them intra-cluster with precomputed costs. A cross-map query then expands tens of abstract nodes rather than thousands of concrete ones, giving typical speedups of 5–20× with paths within 1–3% of optimal, which is comfortably inside the invisible range described in ai-and-navigation-pathfinding-and-navmesh.

Two refinements matter in practice. Refine lazily: compute the concrete path only for the current and next cluster, and refine the rest as the agent arrives, so an agent that is redirected after 20 m has not paid for a 400 m concrete path. And rebuild only affected clusters when the world changes, which is the same tile-locality argument as navmesh carving and the reason both systems use a grid of independently rebuildable chunks.

On navmesh-based worlds the equivalent structure is a navmesh tile graph with precomputed inter-tile connectivity, plus an island id per connected component so unreachable queries fail in O(1). Streaming open worlds require this regardless of unit counts, because the full navmesh is not resident: the abstract graph for the whole world is small enough to keep in memory (tens of thousands of nodes, a few megabytes) while the concrete tiles page in and out.

Adopt hierarchy when the world exceeds roughly 300×300 m of contiguous navigable space, or when cross-map queries appear in the profile. Below that, a flat navmesh with an expansion cap is simpler and fast enough, and the complexity of maintaining an abstraction layer through level edits is not free.

## 3. Path smoothing and string pulling

Raw A* output is a sequence of graph nodes, and following it directly produces the characteristic robot walk: on a grid, movement locked to 45° increments with a visible zigzag; on a navmesh, movement through polygon centres, which sends agents to the middle of a corridor before turning. The path is optimal on the graph and wrong in the world, because the graph is a discretisation the player cannot see.

The correct fix on a navmesh is the funnel algorithm, which is exact and cheap. Given the corridor of polygons A* returned, the sequence of shared edges (portals) defines a funnel with a left and right boundary; walking the portals and narrowing the funnel yields the shortest path through the corridor as a sequence of corner points, in O(n) over the portals — microseconds for a typical path. This is string pulling, and the result is the path a taut string would take, which is exactly what a human would walk. Every navmesh library ships it; Detour's `dtFindStraightPath` is the reference implementation.

On grids, where a portal corridor does not exist, use iterative ray-casting: from the current waypoint, cast towards the furthest subsequent waypoint that is reachable in a straight line, discard the intermediates, and repeat. This is O(n²) in the worst case but n is small after A*, and it converts the zigzag into a small number of long straight segments. Theta* and Lazy Theta* integrate the same line-of-sight test into the search itself and produce any-angle paths directly, at roughly 1.5–2.5× the search cost, which is worth it when smoothing quality matters more than query throughput.

After string pulling, corners are still geometrically sharp, and an agent that rotates instantly at each one looks mechanical. Add curvature at the movement layer rather than in the path: clamp angular velocity (180–360°/s for a human-scale character, 45–90°/s for a vehicle), begin the turn before reaching the corner by an amount proportional to speed and turn radius, and reduce speed into tight turns so the deceleration is visible. The path stays a piecewise-linear guide and the agent's motion is a physically plausible traversal of it — which is also why smoothing the path itself with splines is usually the wrong approach: a spline can leave the navmesh, and the agent then walks through a wall.

Keep the agent tethered to the path with a corridor rather than a target point. Store the polygon corridor from the search, and each frame confirm the agent is still inside it; when local avoidance pushes the agent out, re-solve from the current polygon rather than continuing towards a waypoint that is now behind a wall. This is what makes avoidance and pathfinding coexist rather than fight.

## 4. Steering and local avoidance

Pathfinding solves the global route against static geometry; steering solves the next 0.5–2 seconds against everything that moves. They must be separate systems, because repathing at the rate other agents move is unaffordable and unnecessary.

Reciprocal velocity obstacle methods (RVO, and its linear-programming refinement ORCA) are the standard for crowds. Each agent computes the set of velocities that would lead to a collision with each neighbour within a time horizon, then selects the admissible velocity closest to its preferred one. The reciprocal part is what makes it work in a crowd: each agent assumes the other will take half the avoidance effort, which removes the oscillation that arises when both agents dodge the same way and then both dodge back.

Tuning values that determine both cost and behaviour: neighbour count capped at 8–10 (found via a kd-tree or spatial hash, rebuilt each update), time horizon 1.5–2.5 s for agents and 0.5–1.0 s for static obstacles, and an update rate of 10–20 Hz rather than per-frame, with interpolation between solutions. Cost lands around 5–20 µs per agent per update with a good spatial structure, so 200 agents at 15 Hz is roughly 0.03–0.06 ms per frame — cheap enough that the neighbour search, not the solve, usually dominates.

Deadlock is the failure mode that always appears and must be designed for rather than tuned away. In a corridor narrower than two agent diameters, two agents moving in opposite directions find no admissible velocity and stop facing each other permanently; in a doorway, a cluster of agents forms a stable jam because every agent's avoidance constraint is satisfied by standing still. ORCA is correct in both cases and useless in both.

The resolutions, in order of preference. Assign every agent a priority — by role, by distance to goal, by an arbitrary stable id as a last resort — and have the lower-priority agent yield: step aside, reverse to the last junction, or briefly ignore avoidance against higher-priority agents so the higher-priority one passes through. Detect the deadlock explicitly by tracking progress towards the goal over a window (less than 0.3 m of progress in 1.5 s while a path exists) and trigger a recovery behaviour rather than waiting for the local solver to resolve something it cannot. Make agents intangible against each other where the fiction permits, which is what many shipped RTS and action titles do for allied units and is invisible if the animation sells it. And model queues explicitly for doorways and choke points: an agent that reserves a slot in a queue and waits with a legible idle is better than five agents grinding against each other.

Unit collision at scale — hundreds of agents — is best handled by combining a coarse separation force with soft, non-blocking body collision, because rigid bodies in a crowd produce a compaction wave that visibly propagates and looks wrong. Steering forces push agents apart; physics resolves the residual overlap gently.

## 5. Navigation for non-humanoid agents

A navmesh describes a walkable surface, so anything that does not walk on a surface needs a different representation, and choosing the wrong one produces agents that are expensive, wrong, or both.

Flying agents in an open sky need no graph at all: steer directly towards the target with obstacle avoidance by sphere cast, and fall back to a coarse structure only near geometry. Flying agents in enclosed or dense space need a volumetric graph — a sparse voxel octree over the navigable air, queried with the same A* and the same heuristics, with node sizes from 0.5 m near geometry to 8 m in open volumes. Unreal's Navigation Invokers with a 3D volume implementation and the community-standard sparse voxel octree approach both take this shape. Budget it honestly: a 3D graph over a 200 × 200 × 60 m volume at 2 m resolution is 180,000 nodes, so hierarchy and octree sparsity are mandatory rather than optional, and queries cost 3–10× their 2D equivalents.

Swimming agents are the flying case with a buoyancy constraint and usually a preferred depth band, which is best expressed as a cost gradient rather than a hard constraint so agents surface and dive smoothly.

Wall and ceiling traversal — spiders, climbing enemies, wall-running — is handled by baking additional navmesh surfaces with a different up vector rather than by extending the walking mesh. Each surface is its own mesh; the transitions between them are off-mesh links carrying a specific traversal animation. This keeps the pathfinder unchanged and puts the complexity in link authoring, which is where designers can see it.

Wheeled and tracked vehicles violate the assumption that any point in a polygon is reachable from any other, because they cannot turn in place. Path with a navmesh baked for the vehicle radius, then post-process the path against a minimum turning radius, or use a kinodynamic planner (hybrid A* over position and heading, with Dubins or Reeds-Shepp curves connecting states) when reversing and tight manoeuvring matter. The state space grows by the heading dimension, typically quantised to 16–36 bins, so queries cost 5–20× a positional search — which is affordable for a handful of vehicles and not for a hundred.

Large agents and multi-cell units in grid games are the fourth case. Erode the grid by the unit footprint at bake time to produce a per-size passability layer, exactly as navmesh erosion does, rather than testing footprint occupancy during the search, which multiplies per-node cost by the footprint area.

## 6. Cover and tactical position selection

Most of what reads as tactical intelligence is position choice, not decision structure, and position choice is a spatial query problem rather than a planning problem. The pattern that ships is to generate candidate positions, score each against weighted tests, and take the best — which is a utility system applied to space.

Candidate generation has two sources. Precomputed cover points, annotated at bake time or placed by designers, carry a position, a facing, a stance (crouched or standing) and a height class; they are cheap to query and consistent, at the cost of authoring effort and staleness when geometry is destructible. Runtime generation samples a grid or ring around the agent — typically 20–60 points over a 5–15 m radius — and evaluates each, which handles destructible and procedural worlds at a higher per-query cost.

Scoring is where the behaviour lives. A workable set of tests for a combat agent: is the point on the navmesh and reachable within a path length limit (a hard filter, applied first because it is the cheapest rejection); does it break line of sight from the current threat; does it provide line of sight to the threat when the agent leans or stands, since cover the agent cannot shoot from is a hiding place rather than a firing position; distance to the threat within a weapon-appropriate band; distance from allies, to prevent the whole squad occupying one wall; and exposure along the path to the point, so the agent does not cross open ground to reach good cover.

Cost control is the reason this section exists. A naive query of 50 candidates with a path test and three ray casts each is 200 spatial operations, and at 12 agents re-evaluating per second it is the largest single AI cost in the game. Three mitigations, applied in order: filter with cheap tests before expensive ones — distance, then navmesh membership, then ray casts, then path length last — so the expensive test runs on a handful of survivors; cap candidate count and sample with a deterministic low-discrepancy pattern rather than uniformly, which gives better coverage per sample; and re-query on an event or a 1–3 s cadence rather than continuously, holding the previous choice with a hysteresis bonus. Unreal's Environment Query System implements exactly this generator-and-test structure with per-test scoring curves, and its per-query time budget and item cap exist for precisely these reasons.

The legibility constraint applies to cover as much as to behaviour: an agent that repositions every 1.5 s is unreadable and unhittable. Commit to a position for 3–8 s unless it is invalidated, and telegraph the move out of cover with a peek or a lean so the player can anticipate it.

Solo: a fixed set of hand-placed cover points with two tests — reachable, and breaks line of sight — which produces most of the perceived competence for a fraction of the cost. Studio: a scored query system with per-archetype test weights, a query time budget enforced per frame, and a debug view that draws every candidate with its score so a designer can see why the agent chose the position it did.

## Pass conditions

Answer yes to every applicable line before the AI and navigation layer is considered correct.

1. Paths are string-pulled through the polygon corridor before being followed, and agents are tethered to that corridor rather than to a waypoint.
2. Turn rate and acceleration are clamped at the movement layer so smoothing does not push agents off the navmesh.
3. Flow fields are used only where goal count is low and agent count is high, with the crossover measured rather than assumed.
4. Local avoidance caps neighbour count, runs at 10–20 Hz rather than per frame, and has an explicit deadlock detector with a recovery behaviour.
5. Agent priority is defined and lower-priority agents yield, rather than relying on the avoidance solver to break symmetry.
6. Non-walking agents use a representation suited to their motion — volumetric graph, additional surfaces with off-mesh transitions, or a heading-aware planner — rather than a walking navmesh bent to fit.
7. Vehicle paths are validated against a minimum turning radius, and agents never receive a path they physically cannot follow.
8. Tactical position queries filter with cheap tests before expensive ones, cap candidate count, and run on an event or 1–3 s cadence rather than continuously.
9. Cover positions are validated as firing positions, not merely as occlusion, and are held for 3–8 s with a telegraphed exit.
