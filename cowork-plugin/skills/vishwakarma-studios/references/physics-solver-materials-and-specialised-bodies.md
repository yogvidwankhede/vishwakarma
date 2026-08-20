# Solver constraints, materials, and specialised bodies

What the solver does with joints and contact materials once collisions have been found, and the three body types that need something other than the general solver: ragdolls, vehicles and 2D. Detection, filtering and query cost are covered in physics-step-broadphase-and-queries.md; world scale and mass conventions in physics-character-controllers-and-scale.md.

## 1. Joints, constraints, and solver iterations

A joint is a constraint the solver tries to satisfy each step by applying impulses. The solver is iterative — typically projected Gauss-Seidel, sometimes a Temporal Gauss-Seidel or a soft-constraint formulation — and it stops after a fixed iteration count regardless of whether the constraints are satisfied. Residual error is what you see as stretch, sag, jitter and drift.

Iteration counts and what they buy, using PhysX terminology (Unity exposes `Physics.defaultSolverIterations` and `defaultSolverVelocityIterations`, defaults 6 and 1):

| Setting | Default | Raise when | Cost |
|---|---|---|---|
| Position iterations | 6 | Joints visibly stretch; stacks sink into each other; ragdolls sag | Roughly linear in the count for constrained bodies |
| Velocity iterations | 1 | Bodies jitter or bounce when they should be at rest; restitution looks wrong | Linear, cheaper per iteration than position |
| Per-body override | — | A specific vehicle or ragdoll needs stability the rest of the scene does not | Pay only for that body |

Set iterations per body rather than globally. A scene of 3,000 debris pieces at 6 iterations plus one vehicle at 30 costs far less than everything at 30, and the debris does not need it.

The stability factors, in the order that actually causes problems.

**Constraint chain length.** Error propagates along a chain and an iterative solver converges slowly along it, so a 20-link rope sags and stretches where a 5-link one does not. The mitigations are fewer, longer links; a dedicated cable or rope solver rather than a chain of joints; or an articulation (PhysX `PxArticulationReducedCoordinate`, Unity's `ArticulationBody`) which solves the chain as a single reduced-coordinate system and is dramatically more stable than an equivalent joint chain — this is why `ArticulationBody` exists and why robotics-adjacent setups should use it.

**Mass ratio.** A heavy body constrained to a light one converges poorly, because the impulse that satisfies the constraint for the light body barely moves the heavy one. Keep mass ratios within 10:1 between directly connected bodies, and treat 100:1 as broken regardless of solver settings. A 2,000 kg vehicle with 5 kg wheels is a 400:1 ratio and will produce wheel jitter that no iteration count fixes; the standard remedy is to inflate the wheel mass to 40–80 kg, which is physically wrong and behaviourally correct.

**Inertia tensor.** A long thin box has a near-degenerate inertia tensor along its long axis, which makes rotational constraint solving ill-conditioned. Override the inertia tensor toward something more isotropic for gameplay bodies where realistic rotation is not the point.

**Substepping over iteration count.** For stiff systems — vehicle suspension, high-tension cables, fast machinery — running two 120 Hz substeps is usually more stable than doubling iterations at 60 Hz, because the error per step is smaller to begin with. Unreal exposes this directly as physics substepping; Unity requires lowering `fixedDeltaTime` globally or using `Physics.Simulate` with manual stepping.

## 2. Friction, restitution and physics materials

Material properties are the tuning surface most often adjusted by trial and error, and knowing the model behind them converts that into a directed search.

Friction is Coulomb: the tangential impulse is capped at `mu × normalImpulse`, with separate static and dynamic coefficients in most engines. Two consequences follow. Friction is proportional to the normal force, so a light object on a slope has proportionally less grip in absolute terms but the same slipping threshold — the critical slope angle is `atan(mu)` regardless of mass, which is why a friction coefficient of 1.0 means slipping begins at 45°. And friction is isotropic in the contact plane unless the engine offers anisotropic friction, so a tyre that should grip forward and slide sideways cannot be expressed with a single coefficient; vehicles need a dedicated tyre model for exactly this reason.

Restitution is the bounce coefficient: 0 is fully inelastic, 1 is a perfectly elastic bounce that returns all energy. Values above 0.9 accumulate energy through solver error and produce objects that bounce higher each time; keep gameplay restitution under 0.8. Engines also apply a bounce threshold velocity (PhysX default around 0.2 m/s, Unity's `Physics.bounceThreshold` default 2.0) below which restitution is ignored, because applying bounce to near-resting contacts is the direct cause of resting jitter. Raise that threshold to suppress jitter before touching solver iterations.

Combine modes determine what happens when two materials with different coefficients meet: average, minimum, maximum or multiply, chosen per material with a priority ordering. The default is usually average, which means an ice material with `mu = 0.05` touching a default surface with `mu = 0.6` yields 0.325 — not ice. Set ice, oil and other low-friction surfaces to `Minimum` combine, and grip surfaces to `Maximum`, or the material has no authority over the interaction it exists to define.

The practical starting values at metre scale: default world surface `mu` 0.6 static / 0.6 dynamic, restitution 0; ice 0.05 with `Minimum` combine; rubber and grip surfaces 1.0–1.2 with `Maximum` combine; metal on metal 0.4; a bouncing ball 0.6–0.75 restitution with `Maximum` combine. Author them as a small fixed set of shared material assets rather than per-collider values, because per-collider tuning produces a scene where no two similar objects behave the same and nobody can find where a value came from.

## 3. Ragdolls and physics-driven animation

A ragdoll is a jointed chain of 10–20 rigid bodies, which makes it the most solver-intensive object most games contain, and self-collision makes it the most narrowphase-intensive as well.

Cost first, because it drives every other decision. A single well-configured ragdoll costs 0.2–0.8 ms with self-collision disabled and 1–4 ms with it enabled, on a desktop core. Ten simultaneous ragdolls with self-collision is therefore a frame-budget event, not a detail. Disable ragdoll self-collision by default and enable it only between the specific pairs that visibly interpenetrate (usually thigh-to-thigh and upper-arm-to-torso), disable ragdoll-to-ragdoll collision entirely unless the game is about ragdolls, and cap the number of active ragdolls at 4–8 with the oldest fading out and being removed.

Configuration rules that avoid the common failures. Keep bone masses proportionate to real body segment ratios (torso around 45% of total, each thigh 10%, each upper arm 3%) — the mass-ratio rule in physics-character-controllers-and-scale.md applies within the ragdoll, and a 0.5 kg hand jointed to a 40 kg torso is an 80:1 ratio that jitters. Set joint limits from the character's actual range of motion, because unlimited joints produce the dislocated-limb look and over-tight limits fight the solver into vibration. Ensure collider volumes do not overlap in the rest pose; overlapping capsules start every simulation with a penetration the solver immediately resolves as an explosive push, which is the origin of the ragdoll that launches into the sky on activation.

The transition into ragdoll is where quality lives. Copy the current animated pose to the bodies, and copy per-bone velocity derived from the last two animated frames rather than starting from zero — a ragdoll that begins at rest drops straight down and reads as the character being switched off. Blending back out (get-up animations, partial ragdoll) requires driving joints toward animated targets with joint drives or a PD controller, which is the basis of active ragdoll and physics-based animation systems; budget it as a system, since tuning drive stiffness and damping per joint is a multi-week task with an artist in the loop.

## 4. Vehicles

Vehicles are the clearest case where a general rigid body solver is the wrong tool, and every engine ships a specialised one for that reason: PhysX Vehicles, Chaos Vehicles in Unreal, Jolt's `VehicleConstraint`, Godot's `VehicleBody3D` (adequate for arcade handling, commonly replaced for anything serious).

The mechanism is that a tyre is not a rigid contact. Real tyre behaviour is a slip-ratio and slip-angle curve — force rises with slip up to a peak around 10–20% longitudinal slip and then falls — and no combination of friction coefficients on a rolling collider reproduces it. A vehicle built from a chassis body and four wheel colliders will either understeer permanently or spin uncontrollably, and the tuning space has no correct point.

The standard structure instead: one rigid body for the chassis, four raycast or shapecast suspension probes rather than wheel colliders, a spring-damper computed per wheel from the probe's compression, and tyre forces computed from the slip model and applied at the contact point. Wheels are visual only. This is cheaper than four constrained bodies, it is far more stable, and it makes the handling model something you author rather than something you discover.

The numbers that matter. Suspension travel of 0.1–0.3 m for a road car, spring stiffness set so that static compression is 25–35% of travel, and damping at 0.3–0.6 of critical — under-damped suspension oscillates, over-damped transmits every bump into the chassis. Substep the vehicle at 120–240 Hz even when the rest of the scene runs at 60, because the suspension spring is stiff and section 1's substepping argument applies directly; Unreal's physics substepping exists largely for this. Keep the centre of mass low and slightly rearward of geometric centre, because a centre of mass at the visual centre of a car model produces a vehicle that rolls over on every turn.

## 5. Two-dimensional physics

2D is not 3D with a locked axis, and using a 3D engine constrained to a plane costs performance and stability for nothing. Box2D (v3, rewritten around a SIMD-friendly SoA layout) is the reference implementation and the backend for Unity 2D, Godot 2D and many custom engines.

The differences that change decisions. Rotation is a scalar rather than a quaternion, so there is no gimbal or normalisation concern and angular constraints are far cheaper. Contact manifolds in 2D have at most two points, which makes stacking more stable and cheaper than in 3D. Box2D v3 uses speculative contacts by default, which means most 2D tunnelling is handled without an explicit CCD setting — a genuine practical difference from 3D where CCD is opt-in per body.

The traps specific to 2D. Ghost vertices: a character sliding along a row of adjacent box colliders catches on the seams between them, because each box reports a contact normal at its corner. The fix is edge or chain shapes (`b2ChainShape`, Unity's `EdgeCollider2D` and composite colliders) which know their neighbours and suppress internal-edge contacts — this is the single most common 2D platformer bug and it has a specific, complete solution. Pixel-per-unit confusion: authoring at 1 unit = 1 pixel puts a character at 32 units tall and gravity at −9.81 units/s², which is imperceptible motion; set the sprite import pixels-per-unit so that 1 unit is roughly 1 metre of game space. And per-pixel collision, which does not exist in any production 2D physics engine and should not be built — approximate sprites with 2–6 primitive shapes.

## Pass conditions

Answer yes to every applicable line before the physics layer is considered correct.

1. Solver iteration counts are set per body where elevated, not raised globally.
2. Joint chains longer than about 8 links use an articulation or a dedicated solver rather than a chain of individual joints.
3. Physics materials are a small shared set with explicit combine modes; low-friction and high-grip surfaces use `Minimum` and `Maximum` rather than the default average.
4. Restitution values are at or below 0.8, and the bounce threshold velocity has been tuned before solver iterations were raised to address resting jitter.
5. Ragdoll self-collision is disabled by default with an enumerated allowlist of pairs, ragdoll-to-ragdoll collision is disabled, and the number of simultaneously active ragdolls is capped.
6. Ragdoll colliders do not overlap in the rest pose, verified by an overlap check in the authoring tool.
7. Ragdoll activation copies the current animated pose and per-bone velocity, not a rest pose at zero velocity.
8. Vehicles use suspension raycasts with a slip-based tyre model and a substepped rate, not four constrained wheel colliders.
9. In 2D, tiled ground uses edge or composite colliders so that no internal seam generates a contact normal, verified by a slide test across a long tiled floor.
10. In 2D, pixels-per-unit is set so that 1 world unit is approximately 1 metre of game space.
