# Game feel: input grace and movement

Game feel is a set of deliberate lies the simulation tells the player, and those lies are correct. A physically honest jump — symmetric gravity, zero grace after the ledge, no look-ahead on the button, an impact that transfers momentum and nothing else — reads as broken to every player who touches it, because nobody is comparing your jump against Newton. They are comparing it against their own intent, which was formed 60–120 ms before the input arrived and which they believe they executed correctly. Feel engineering is the discipline of making the simulation agree with that belief: widening windows the player thinks are instants, exaggerating masses the physics says are equal, and stopping time for four frames so a sword lands with a weight it does not have.

Every number below assumes a 60 fps target unless stated otherwise. Carry the millisecond value, not the frame count, because perception tracks time and a window tuned to 6 frames on a 60 Hz build silently halves to 50 ms on a 120 Hz build and the game stops feeling right for reasons nobody can name.

## 1. The lies, and why each one is correct

Six lies do most of the work, and each corrects a specific mismatch between what the player did and what the player believes they did.

| Lie | The mismatch it corrects | Typical magnitude |
|---|---|---|
| Coyote time | Player commits to jumping before the eye confirms the edge | 3–8 frames (50–133 ms) |
| Input buffering | Player presses a follow-up before the previous action has finished | 4–10 frames (67–167 ms) |
| Asymmetric gravity | A symmetric parabola spends too long floating at the top | 1.5–2.5x fall multiplier |
| Hitstop | Real collisions are instantaneous and therefore illegible | 2–8 frames (33–133 ms) |
| Screenshake | The camera is a rigid observer with no body | trauma-squared, 1–3 degrees peak |
| Aim and edge magnetism | Analogue precision is worse than intent precision | 2–6 degrees of correction |

The unifying mechanism is that human motor intent precedes human perception. Simple visual reaction time is 200–250 ms, audio reaction time 140–180 ms, and the motor command to press a button leaves the cortex roughly 80–120 ms before the finger moves. A player who decides to jump "at the edge" issued that decision while the character was still 4–7 frames from the edge. If your simulation demands frame-perfect agreement between decision and geometry, you are testing a faculty the player does not have, and they will report the game as unresponsive without ever identifying the ledge.

The corollary is the constraint on all of it: a lie is correct only while it is invisible. Coyote time at 8 frames is grace; at 20 frames the character visibly walks on air and the player learns to distrust the ground. Buffering at 10 frames is intent recognition; at 30 frames the character executes commands the player has already changed their mind about. Tune every window upward until a playtester notices, then take 30–40% back.

Solo: pick the defaults in this document, ship them, and only tune what a playtester complains about. Studio: expose every constant in this file as a designer-editable tuning asset with a hot-reload path, version the asset, and require a diff review on changes to it — feel constants are the most frequently retuned data in a project and the least frequently documented.

## 2. Coyote time

Coyote time is a grace window, measured from the frame the character's ground check first returns false, during which a jump input is still treated as a grounded jump. Set it to 3–8 frames (50–133 ms). A 2D precision platformer sits at 5–7 frames (83–117 ms). A 3D action game with a heavier character and a camera the player is also steering sits at 4–6 frames (67–100 ms), because the character occupies a smaller part of the screen and the perceptual error is larger. A momentum-heavy game where the player is frequently airborne by design sits at 3–4 frames, because a generous window there produces double jumps that read as bugs.

The mechanism is commitment latency. The player forms the intent to jump while the character is still on the ledge, but the button press lands 4–7 frames later, after the collision query has already reported airborne. Without grace, the input dispatches a mid-air jump — usually nothing at all — and the player receives no feedback distinguishing "you missed" from "the game ignored you". Those two failures feel identical in the moment and the second one is unforgivable, so the fix is to make the first one rarer than the player's own error rate.

Implementation rules that matter more than the number:

Start the timer on the transition to airborne, not on every airborne frame, and store it as a wall-clock value rather than a frame counter so it survives frame rate changes. Consume the window when the jump fires, so a coyote jump cannot be followed by a second grounded jump. Cancel the window immediately when the character leaves the ground upward — a jump, a launch pad, a knockback — because grace is only correct for falling off, and a player who jumps and then presses jump again 3 frames later has requested a double jump and should be told they do not have one. Cancel it on a deliberate drop-through of a one-way platform, otherwise the down-plus-jump input to fall through a floor produces a jump instead, which is the single most reported coyote bug.

Coyote time has siblings worth applying by the same logic. Ledge grab grace: continue offering the grab prompt for 4–6 frames after the hand has passed the lip. Wall jump grace: 4–8 frames after leaving wall contact, because wall jumps are executed at speed and the contact test is noisier than the ground test. Landing grace on a moving platform: hold the parent transform for 2–3 frames after separation so a jump from a lift inherits the lift's velocity.

Studio: instrument the window. Log the distribution of `time_since_grounded` at the moment each jump input arrives across a playtest build. If more than 5% of jumps fall outside the window you are too tight; if fewer than 0.5% land inside it, the window is doing nothing and you have a different problem.

## 3. Input buffering and look-ahead

A buffer stores an input that cannot be serviced now and replays it the moment it becomes legal. Set the jump buffer to 4–10 frames (67–167 ms), default 6 (100 ms). The mechanism mirrors coyote time in the opposite direction: falling toward the ground, the player presses jump when they believe contact is imminent, and belief precedes contact by the same 4–7 frames. Without a buffer the press is discarded, the character lands and stands still, and the player has to press again — which is a lost jump in a platformer and a lost combo in a fighting game.

Buffer sizing by action class:

| Action | Buffer | Reason |
|---|---|---|
| Jump on landing | 4–10 frames (67–167 ms) | Landing frame is predictable; short window is enough |
| Attack into attack (chain) | 8–14 frames (133–233 ms) | Chains are rhythmic; players press early by design |
| Dodge or block during recovery | 6–12 frames (100–200 ms) | Defensive intent must not be dropped |
| Special or super with a motion input | 12–20 frames (200–333 ms) | Motion completion itself takes time |
| Interact and context actions | 8–12 frames (133–200 ms) | Approach speed varies |
| Menu confirm during a transition | 10–20 frames (167–333 ms) | Or make transitions interruptible instead |

A buffer must expire and must be single-slot for a given action, or it becomes an input queue and the character executes a stale command the player abandoned. The failure signature is distinctive: the player mashes during a long animation, the animation ends, and the character performs three actions in sequence with no further input. Store one pending action with a timestamp, overwrite on new input of the same class, and drop it when the age exceeds the window.

Attack chains want a narrower and better-placed window than raw buffering. Open the chain acceptance window during the second half of the current attack's recovery rather than for the whole move, so a press during the active frames feeds the next link and a press during startup does not. A common shape for a three-hit chain at 60 fps: hit one is 5 startup / 3 active / 14 recovery, chain window open from recovery frame 6 through 8 frames past the end of recovery, giving a 16-frame (267 ms) acceptance band that a player perceives as "press roughly when it lands".

Dodge cancels need the opposite bias. A dodge buffered during a committed heavy attack should fire on the first cancellable frame, but the cancellable region should begin no earlier than 60% through recovery on heavy moves or the commitment that gives heavy attacks their weight disappears. Buffer the intent, gate the execution.

Buffered input must survive hitstop. If you freeze the simulation for 6 frames on impact and your buffer ages in simulation time, the window silently shrinks by exactly the hitstop duration and combos become harder in precisely the moments they should be easier. Age buffers on unscaled time.

## 4. Jump arcs: deriving gravity from intent

Author jumps in the units a designer thinks in — peak height and time to apex — and derive the physics constants. Never tune gravity and impulse independently; they are not independent and hand-tuning them produces arcs nobody can reproduce.

For a desired apex height `h` (metres) reached in time `t_a` (seconds):

```
g_rise = 2h / t_a^2          // gravity while ascending, m/s^2, positive downward
v0     = 2h / t_a            // initial upward velocity, m/s
g_fall = g_rise * F          // F is the fall multiplier, 1.5-2.5
t_fall = t_a / sqrt(F)       // time from apex back to launch height
```

Worked example for a standard action-platformer jump, `h = 3.0 m`, `t_a = 0.35 s`, `F = 2.0`:

```
g_rise = 2*3.0 / 0.1225   = 48.98 m/s^2   (5.0 g, and correct)
v0     = 2*3.0 / 0.35     = 17.14 m/s
g_fall = 97.96 m/s^2
t_fall = 0.35 / 1.4142    = 0.247 s
airtime = 0.597 s          = 36 frames at 60 fps
```

Note the honest gravity value that falls out of this: roughly 5 g on the rise and 10 g on the fall. Earth gravity in a jump of that height gives a 0.78 s ascent, an airtime of over 1.5 s, and a character that feels like it is underwater. Real gravity is the wrong gravity. The asymmetry between rise and fall is the second lie: a symmetric parabola spends half its airtime descending at the same leisurely rate it ascended, and descent is the phase during which the player is trying to land somewhere specific, so it must be the fast phase.

Fall multipliers by genre: 1.5–1.8 for floaty, exploratory platformers; 1.8–2.2 for standard action; 2.2–2.6 for precision platformers and anything with tight landing targets. Above 3.0 the transition at the apex becomes a visible snap.

**Variable jump height.** Releasing the button early must shorten the jump, or the player has one jump instead of a continuum. Two implementations, both correct:

Velocity clamp on release — when the button is released while `v_y > 0`, set `v_y = min(v_y, v0 * k)` with `k` in the range 0.35–0.5. This gives a crisp, immediately legible short hop and a hard floor on minimum height.

Cut multiplier — while the button is released and `v_y > 0`, apply gravity at `g_rise * C` with `C` in the range 2.0–3.0. Smoother, and it preserves a proportional relationship between hold duration and height, which matters when the player is threading a gap under a ceiling.

Either way, define a minimum hop of 35–50% of full height and a minimum guaranteed rise of 4–6 frames, so a 1-frame tap still produces a visible, committed jump rather than a twitch. Cap the hold window at time-to-apex; holding past the apex must do nothing.

**Apex hang.** When `abs(v_y)` drops below a threshold — 2.0–2.5 m/s, or roughly 0.12–0.15 of `v0` — scale gravity by 0.5–0.65 for the duration. This buys 3–6 frames (50–100 ms) of near-weightlessness at the top of the arc. It is a lie with a specific job: the apex is where the player retargets, and a parabola gives them the least time to do it at exactly the moment they need the most. Pair it with an air-control boost of 1.1–1.3x during the same window. Hang longer than about 8 frames and the character reads as hovering.

**Fall speed cap.** Terminal velocity at 1.5–2.0x `v0` (25–35 m/s for the example above). Uncapped falls become unreadable and unsurvivable, and the cap is also what makes long drops feel controlled rather than punishing.

**Fast fall.** Down-input during descent multiplies gravity by 1.5–2.5x or snaps `v_y` to the cap. This is an expressiveness feature, not a feel fix, but its absence is felt in any game with vertical combat.

Studio: implement all of the above as a `JumpProfile` data asset with fields `apexHeight`, `timeToApex`, `fallMultiplier`, `releaseCutMultiplier`, `apexHangThreshold`, `apexGravityScale`, `terminalVelocity`, and compute the derived constants at load. Designers tune height and timing; nobody tunes gravity.

## 5. Ground handling: acceleration, friction, and turnaround

Most complaints described as "floaty" or "slippery" are ground-handling constants, not jump constants, so tune these before touching gravity.

Express acceleration as time-to-max-speed rather than as an acceleration value, because that is the quantity the player perceives.

| Character class | Time to max speed | Time to stop | Turnaround |
|---|---|---|---|
| Precision platformer, responsive | 0.05–0.10 s (3–6 frames) | 0.04–0.08 s | Instant to 0.06 s |
| Standard action character | 0.10–0.18 s (6–11 frames) | 0.08–0.14 s | 0.10–0.16 s |
| Heavy or armoured character | 0.20–0.35 s (12–21 frames) | 0.18–0.30 s | 0.25–0.40 s |
| Vehicle or momentum-based | 0.6–2.0 s | 0.8–3.0 s | Handbrake-dependent |

Three rules follow from perception rather than from physics. Deceleration should be 1.2–2.0x acceleration, because a character that takes as long to stop as to start reads as skating. Turnaround — reversing direction at speed — should apply 2–3x the standing acceleration, otherwise the character wallows through the reversal and the player over-corrects. Air acceleration should be 0.4–0.7x ground acceleration with air deceleration near zero, which preserves the sense that the jump was a commitment while still permitting course correction; full air control makes jumps feel weightless, zero air control makes them feel like a trap.

Ground friction and air drag should be exposed separately from acceleration. The common bug is implementing movement as `velocity += input * accel` followed by a uniform drag, which couples top speed to acceleration and makes every tuning change a two-variable problem.

## Pass conditions

Answer yes to every applicable line before the feel layer is considered done.

1. Coyote time exists, is between 50 and 133 ms, is measured in wall-clock time, and is cancelled on upward launches and on deliberate drop-through.
2. A jump input buffer exists, is between 67 and 167 ms, holds a single pending action, and ages on unscaled time so hitstop does not consume it.
3. Jump gravity and launch velocity are derived from designer-authored apex height and time-to-apex, not hand-tuned independently.
4. Fall gravity exceeds rise gravity by a factor between 1.5 and 2.5, and the value is recorded in the tuning asset.
5. Releasing the jump button early shortens the jump, with a minimum hop between 35% and 50% of full height and a guaranteed rise of at least 4 frames.
6. Terminal velocity is capped, and total airtime for a standard jump is under 0.8 s.
7. Time-to-max-speed, time-to-stop and turnaround acceleration are separately tunable, and deceleration is at least 1.2x acceleration.
