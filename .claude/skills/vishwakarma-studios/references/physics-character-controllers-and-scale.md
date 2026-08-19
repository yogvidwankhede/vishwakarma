# Character controllers, traversal and world scale

How a character moves through the world, and the unit and gravity conventions that everything else in the physics layer is tuned against. The rest of the physics reference — the step itself, broadphase and query cost, the solver, and debugging — lives in the sibling physics files.

## 1. Character controllers

Three approaches, and the reason most shipped games use the third.

**Dynamic rigidbody character.** A capsule with mass, driven by forces. It interacts correctly with other physics bodies for free and it feels wrong for four specific mechanical reasons. Momentum: applying force produces acceleration, so the character ramps up and slides to a stop, while players expect near-instant response — a platformer character should reach full speed in 2–5 frames and stop in 2–3, which is an acceleration profile no realistic mass and friction produce. Friction: the same coefficient that stops the character on flat ground makes it stick to walls when pressed against them, and Coulomb friction is direction-independent so there is no way to have grip forward and none sideways without a custom friction model. Slopes: a body on a slope slides under gravity unless friction is high enough to hold it, and friction high enough to hold it also prevents sliding when the design wants sliding. Rotation: a capsule tips over, so angular motion must be frozen, at which point the body is no longer behaving as a rigid body anyway.

**Kinematic body plus engine character controller.** Unity's `CharacterController`, Unreal's `UCharacterMovementComponent`, Godot's `CharacterBody3D` with `move_and_slide`. The body is not simulated; it is moved by sweeping its shape and sliding along contacts. This gives direct control over velocity, so response is instant and tunable, at the cost of not being pushed by other physics bodies unless you write that interaction yourself. Unity's `CharacterController` is capsule-only, has a fixed slide-and-step algorithm you cannot modify, and does not support rotation of the capsule — adequate for a prototype and commonly outgrown.

**Custom capsule sweep.** Write the movement loop directly: sweep the capsule along the desired displacement, find the first hit, move to just before it with a small skin offset, project the remaining displacement onto the contact plane, repeat up to a bounded iteration count (3–5), then resolve depenetration. This is what most shipped action games use, because it puts every behaviour — slope handling, step-up, ledge detection, wall sliding, moving platforms, coyote time, air control — under direct authorship rather than under engine policy.

The skeleton, with the numbers that matter:

```
remaining = velocity * dt
for (iteration = 0; iteration < 4 && remaining.length > EPSILON; ++iteration) {
    hit = capsuleSweep(position, remaining, SKIN_WIDTH)   // skin 0.01–0.02 m
    if (!hit) { position += remaining; break; }
    position  += remaining.normalised * max(0, hit.distance - SKIN_WIDTH)
    remaining  = projectOnPlane(remaining * (1 - hit.fraction), hit.normal)
}
resolvePenetration(position)   // overlap query, push out along the deepest normal
```

The skin width exists because sweeps that land exactly on a surface produce numerically ambiguous results — the next sweep may start inside the geometry and report no hit or a backfacing hit. A 0.01–0.02 m skin at metre scale keeps the shape strictly outside geometry at the cost of a visible gap of one centimetre, which is below the threshold anyone notices. The iteration bound exists because a character wedged in an acute corner can project displacement back and forth indefinitely; four iterations resolves every practical case and the fifth is a corner nobody should be in.

Depenetration is the step people omit and then debug for a week. A swept controller can still end up inside geometry — a platform moves into it, a collider is spawned around it, a sweep starts marginally inside a surface. Run an overlap query after movement, and for each overlap push the capsule out along the contact normal by the penetration depth plus a small epsilon, capped per frame (0.2–0.5 m) so that a deep penetration resolves over several frames rather than teleporting the character across the level. Without the cap, a character that ends up inside a large collider is ejected at an arbitrary point on its surface.

Interaction with dynamic bodies has to be written, because a kinematic controller does not push anything. The standard approach is to detect contacts during the sweep and apply an impulse to the hit body proportional to the character's velocity and a designer-tuned push strength, with a mass threshold above which nothing is pushed. Keep this one-directional: the character pushes bodies, bodies do not push the character, unless being pushed is a designed mechanic — bidirectional interaction between a kinematic controller and a dynamic body is a feedback loop with no damping and it will oscillate.

Studio: build the custom controller, treat it as a owned system with its own test scene containing every slope angle, step height and gap width in the game, and run an automated traversal test on every merge. Solo: start with the engine controller, and switch to custom when the first movement feel requirement it cannot express appears — which is usually ledge grabbing, wall running or variable-height jumping.

## 2. Slopes, steps, ledges and ground detection

The practical rules, with the angle and distance thresholds that make them work.

**Ground detection.** Do not use a single downward raycast from the capsule centre; it reports no ground when the character stands on the edge of a step or straddles a gap. Sweep the capsule downward by a small probe distance (0.05–0.15 m) and accept the hit as ground when the contact normal's angle from world up is below the slope limit. Cache a coyote-time window of 0.08–0.15 s after leaving ground during which jump is still permitted; this is a feel requirement, not a bug workaround, and it is present in essentially every well-regarded platformer.

**Slope limit.** Walkable when the contact normal is within 45–50° of vertical for a human character; 30–35° for vehicles; up to 60° for climbing-oriented designs. Above the limit, the character slides, and the slide should be an explicit state with its own acceleration and control response rather than an emergent consequence of friction. Unity's `CharacterController.slopeLimit` defaults to 45°, Unreal's `WalkableFloorAngle` to 44.765°, and Godot's `floor_max_angle` to 45°. Match them across systems: a mismatch between the movement slope limit and the navigation mesh's slope limit produces AI agents that path onto surfaces they cannot stand on.

**Step-up.** A character should walk up steps under a threshold without jumping. Implement by attempting the horizontal move; if it is blocked by a near-vertical surface, retry from a position raised by the step height, and if that sweep succeeds, drop back down onto the surface. Thresholds: 0.3–0.45 m for a human character at metre scale (Unity's `stepOffset` defaults to 0.3 m, Unreal's `MaxStepHeight` to 45 cm). The retry must confirm ground exists after the step-up, or the character climbs walls one step-height at a time.

**Ledges and edges.** Two separate problems. Falling off requires the ground check to fail, which the capsule sweep handles. Not falling off — a stopping rule for AI or a ledge-hang trigger — requires a forward probe: raycast down from a point 0.3–0.5 m ahead of the character at chest height; no hit means a ledge. Do this on the fixed clock, not per frame, or the result varies with frame rate.

**Slope-aware ground movement.** Moving horizontally on a slope and then snapping down to the surface produces a stair-stepping motion at every frame boundary. Project the desired displacement onto the ground plane before sweeping, so a character running up a 30° slope moves along the surface rather than into it and then down. Pair it with a ground-snap sweep of 0.1–0.3 m after movement, applied only while grounded and not while jumping, so that walking over a convex ridge does not launch the character into a brief unintended hop.

**Ceilings and head bumps.** Cancel upward velocity on a ceiling contact, or the character continues rising against geometry and either jitters or accumulates velocity that manifests as a delayed launch when the ceiling ends. Test the contact normal rather than assuming any blocked upward sweep is a ceiling.

**Moving platforms.** The character must inherit platform motion, and the correct order is to move the platform first, then apply the delta to any character standing on it, then run the character's own movement. Doing it in the reverse order produces a character that sinks into the platform on ascent and floats on descent. Store the platform reference and its previous transform, apply the delta as a position change rather than a velocity, and clear it on the frame the character leaves.

## 3. Scale and units

Physics engines are tuned for a specific numerical range, and the tuning is not scale-invariant because the tolerances are absolute. PhysX assumes 1 unit = 1 metre and exposes `PxTolerancesScale` for other choices; its default contact offset (0.02), rest offset, sleep thresholds, linear slop and bounce thresholds are absolute distances in that unit. Build a world at 1 unit = 1 centimetre and a 0.02 unit contact offset becomes 0.2 mm, contacts become numerically marginal, and objects jitter for reasons nothing in your code explains.

Unreal is the notable exception: 1 unit = 1 centimetre, engine-wide, with `WorldToMeters` handling the conversion for physics and VR. This is consistent and fine as long as nothing in the project assumes metres — imported assets, third-party libraries and any hand-written physics maths all need the conversion applied.

The float-precision consequence of scale is the other half of this. A 32-bit float holds about 7 significant decimal digits, so at 10,000 units from the origin the resolution is roughly 1 mm and at 100,000 units it is roughly 1 cm — which is larger than the contact offsets the solver relies on, and is why large open worlds exhibit jitter far from the origin. The remedies are origin rebasing (periodically shifting the world so the player is near zero, which Unreal automates as World Partition's origin rebasing and Unity leaves to you) or 64-bit world coordinates with 32-bit local physics, which Unreal 5 provides as Large World Coordinates. Decide which before the world exceeds about 5,000 units in any direction.

Fix the convention in week one and enforce it: 1 unit = 1 metre in Unity, Godot, Bevy and custom engines; 1 unit = 1 centimetre in Unreal. Then the derived constants follow. A human character is 1.8 m tall with a 0.3–0.4 m capsule radius. Walking is 1.5 m/s, running 5–7 m/s, sprinting 8–10 m/s. Gravity is −9.81 m/s².

Gravity is where realism and feel diverge, and the divergence is deliberate. A jump under real gravity that reaches 1 m apex takes 0.9 s round trip, which reads as floaty in a game where the player expects a response within a few frames. The standard solution is stronger-than-real gravity — often −20 to −35 m/s² — combined with a jump impulse derived from the desired apex height and time rather than authored directly:

```
gravity        = -2 * apexHeight / (timeToApex * timeToApex)
jumpVelocity   =  2 * apexHeight /  timeToApex
```

With a 1.2 m apex in 0.35 s, that gives gravity of −19.6 m/s² and a jump velocity of 6.86 m/s. Authoring in terms of apex height and time is the right interface for designers, because those are the two quantities they actually have opinions about. A further refinement present in most action platformers is asymmetric gravity — a multiplier of 1.5–2.5x applied while falling — which makes the jump feel responsive on the way up and weighty on the way down, and which no real physics produces.

The mass rule that prevents the largest class of solver instability: keep masses within roughly two orders of magnitude across bodies that can contact each other, and within one order for bodies that are jointed. A 0.01 kg pebble resting on a 10,000 kg platform is a 10⁶ ratio, and the contact will jitter no matter what settings are applied.

## Pass conditions

Answer yes to every applicable line before the physics layer is considered correct.

1. World scale follows the engine convention (1 unit = 1 metre, or 1 centimetre in Unreal), stated in a document, and imported assets are validated against it.
2. Gravity and jump parameters are derived from designer-facing apex height and time-to-apex rather than authored as raw acceleration.
3. Mass ratios between contacting bodies are within roughly 100:1, and between jointed bodies within roughly 10:1, verified by a scene audit.
4. The character controller has a dedicated test scene covering every slope angle, step height, gap width and ceiling clearance present in the game, exercised by an automated traversal test.
5. Ground detection uses a shape sweep rather than a single centre raycast, and the movement slope limit matches the navigation mesh slope limit.
6. Moving platforms apply their delta to riders after the platform moves and before the rider's own movement, verified by a test that shows no sinking or floating.
7. Character depenetration runs after movement with a per-frame push cap, and controller-to-dynamic-body interaction is one-directional unless bidirectional push is a designed mechanic.
