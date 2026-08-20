# Netcode: remote actors, lag compensation and rollback

Prediction covers the local player; this part covers everyone else. Remote actors arrive as snapshots and must be smoothed, hitscan shots must be adjudicated against a past the shooter was shown, and in two-player fighting games the same prediction machinery is applied symmetrically as rollback. Each of these is a decision about who absorbs the latency interval and how visibly. Local prediction and reconciliation are covered in `netcode-authority-and-prediction.md`.

## 1. Entity interpolation for remote actors

Remote actors arrive as a sequence of snapshots at the send rate, not the tick rate. Rendering the newest one directly produces motion that steps at the send interval — 50 ms at 20 Hz — and stops dead whenever a packet is late. The fix is to render remote actors deliberately in the past, at a time for which two snapshots have already arrived, and interpolate between them.

```cpp
const double renderTime = serverTimeEstimate() - interpolationDelay;
const Snapshot* a = buffer.newestAtOrBefore(renderTime);
const Snapshot* b = buffer.oldestAfter(renderTime);
if (a && b) {
    const float t = (renderTime - a->time) / (b->time - a->time);
    render.position = lerp(a->position, b->position, t);
    render.rotation = slerp(a->rotation, b->rotation, t);
}
```

Set `interpolationDelay` to two send intervals plus a jitter margin. At a 20 Hz send rate that is 100 ms plus 20–50 ms, and at 64 Hz it is 31 ms plus margin. Two intervals rather than one is the point: with one interval, a single late packet leaves nothing to interpolate towards and the actor freezes then snaps. Source-engine defaults encode this directly as `cl_interp_ratio 2` divided by the update rate, and the historical `cl_interp 0.1` is the 20 Hz case.

The tradeoff is stated precisely, not vaguely: every millisecond of interpolation delay is a millisecond of additional staleness in what the shooter sees, which the server must later rewind through to adjudicate a shot. Lowering the delay makes remote motion more current and more jittery; raising it makes motion smooth and the lag-compensation rewind longer. Below one send interval you are extrapolating, and extrapolation of a player character is a guess that is wrong at every direction change — an enemy who strafes produces overshoot and snap-back proportional to the extrapolation window, which reads as teleporting and is worse than the delay it removed.

Adaptive delay is worth building: measure packet arrival jitter over a 2-second window, set the delay to two intervals plus the 95th-percentile jitter, and clamp to a range of 50–250 ms. A client on stable fibre gets 60 ms and a client on congested Wi-Fi gets 180 ms, each getting the smallest delay their connection actually supports.

Extrapolate only for brief gaps — up to roughly 250 ms of missing data — using last known velocity with damping, then freeze the actor rather than continuing to project. An extrapolated actor that walks through a wall because the packet flow stopped is a worse artefact than an actor that pauses.

## 2. Lag compensation and the fairness inversion

Hitscan weapons force a decision that has no correct answer. The shooter aimed at where the target appeared on their screen, which is `interpolationDelay + oneWayLatency` behind the server's current truth — 130–200 ms in typical conditions, during which a sprinting target moves 0.9–1.4 m. If the server tests the shot against present positions, well-aimed shots miss constantly and the game feels broken. If it rewinds, shots land against a past that other players have already left.

Server-side rewind, concretely: the server keeps a ring of hitbox transforms per player for the last 200–1,000 ms at tick granularity — 60 entries at 60 Hz for one second, roughly 20–40 hitboxes per player, so 60 × 30 × 32 bytes ≈ 56 KB per player, which is affordable. On receiving a fire command stamped with the client's render time, it reconstructs every other player's hitboxes at that time by interpolating the two bracketing history entries, tests the ray, then restores present positions.

```cpp
const double rewindTo = clamp(cmd.clientRenderTime,
                              now - MAX_REWIND,   // 200 ms cap
                              now);
for (Player& p : others) p.applyHistoricalHitboxes(rewindTo);
HitResult hit = traceRay(cmd.origin, cmd.direction, MAX_RANGE);
for (Player& p : others) p.restoreCurrentHitboxes();
```

Validate `clientRenderTime` against the server's own estimate of that client's latency rather than trusting it; an unbounded client-supplied rewind time is a cheat that lets an attacker shoot at any past moment they choose. Clamp the rewind to a documented maximum — 200 ms is the common choice, 250 ms the generous one — and accept that players beyond that latency simply have to lead their targets. The cap exists because rewind cost and unfairness both scale with it, and because beyond a fifth of a second the past being shot at bears little relation to the present.

The fairness inversion is intrinsic and cannot be engineered away: the victim was shot behind cover. They rounded a corner, saw safety, and died to a shot fired at a position they had already left. This is the correct behaviour of the model — the shooter's aim was accurate against the world they were shown — and it converts the shooter's latency into the victim's death. The alternative, no compensation, converts the shooter's latency into missed shots against a target they were visually on. Every shipped competitive shooter chooses the former, because a player who misses a shot they aimed correctly blames the game, while a player who dies behind cover blames the opponent's connection.

Mitigations that measurably help: cap the rewind window and publish the number; exclude very-high-latency players from ranked matchmaking rather than compensating for them; do not rewind for slow projectiles, which players read as travelling in the present; and render the killcam from the shooter's compensated view rather than the victim's, so the interaction is at least explicable. Do not compensate melee, area damage or vehicle collisions — the interactions are already forgiving in space, and rewinding them produces damage from attackers who are visibly elsewhere.

## 3. Rollback versus delay-based, for fighting games

Fighting games are the case where prediction is applied symmetrically between two peers, and the two available models divide cleanly.

Delay-based netcode holds each player's input for a fixed number of frames so both machines can execute the same frame with both inputs present. The delay equals the transport latency rounded up to a frame, so at 60 Hz a 50 ms round trip becomes 3 frames of added input lag applied to both players, permanently, whether or not the network is currently misbehaving. It is simple, it is deterministic without any additional machinery, and it makes every online match feel worse than every offline match by an amount the player can feel — 3 frames is 50 ms and the difference between a link connecting and dropping.

Rollback, in the GGPO lineage, applies input delay of only 0–3 frames and predicts the remote input as a repeat of the last received input, which is correct the large majority of the time because fighting-game inputs are held across multiple frames. When the real input arrives and differs, the local machine restores the saved state from that frame and re-simulates every frame since at once, within the current frame.

```
frame N:   save state, predict remote input, simulate, present
frame N+3: real input for frame N arrives and differs
           -> load saved state for N
           -> simulate N, N+1, N+2, N+3 with the corrected input   (4 re-simulations)
           -> present frame N+3
```

The mechanics that must be tuned are three numbers. Input delay, 0–3 frames, trades local responsiveness against how often rollbacks occur; 2 frames is a common default and many competitive players prefer 1 or 0 with more visual correction. Rollback window, the maximum frames the implementation can rewind, is 7–8 in GGPO and covers 116–133 ms of round trip at 60 Hz; beyond it the game must stall both peers rather than desync. And the per-frame cost is the killer: a worst-case frame executes one state load plus 8 simulation steps plus 8 state saves, all inside a 16.7 ms budget. If a simulation step costs 1 ms, the worst frame costs over 8 ms before rendering, and the budget is gone.

That arithmetic dictates the architecture. The complete game state must be saveable and restorable as a flat block of memory in well under a millisecond, which means it is plain old data with no pointers, no heap allocation during a match, no references into engine objects, and no dependence on anything the engine does not include in the snapshot. Practical targets: state size under 100 KB so a memcpy costs roughly 10–20 µs, and under 1 MB absolutely; save and load under 100 µs each; simulation step under 500 µs. *Skullgirls*, *Guilty Gear Strive*, *Street Fighter 6* and *Mortal Kombat 1* all ship variants of this, and every one of them structures the fight simulation as an isolated, deterministic, POD-only module separate from rendering, audio and UI, which run on the presentation clock and are explicitly not rolled back.

Determinism must hold across every platform in the crossplay set. Float behaviour differs between compilers, architectures and libm implementations, so either compile the simulation with strict floating point and identical transcendental implementations on all targets, or use fixed point. Rollback also demands that presentation side effects are suppressed during re-simulation — audio must not re-trigger 8 times, particles must not re-spawn, haptics must not re-fire — which is implemented as a `isResimulating` flag that gates every side-effecting call, and forgetting it is the classic first bug of a rollback implementation.

Solo: use GGPO, GekkoNet or an engine integration rather than writing rollback yourself, and design the simulation as a POD state block from day one because retrofitting it is a rewrite. Studio: budget rollback as a foundational architectural constraint owned by engineering before content production starts, with an automated test that saves, loads and re-simulates every frame of a recorded match and asserts bitwise equality.

## Pass conditions

Answer yes to every applicable line before the network layer is considered correct.

1. Remote actors are interpolated with a delay of at least two send intervals plus a jitter margin, and the delay is adaptive with a documented clamp range.
2. Extrapolation of remote actors is bounded to roughly 250 ms and freezes rather than projecting indefinitely.
3. Lag compensation rewinds using the client's reported render time, validated against the server's own latency estimate and clamped to a published maximum.
4. Hitbox history is stored at tick granularity for at least the rewind window, and its memory cost is measured.
5. Melee, area damage and slow projectiles are excluded from rewind, with the reason recorded.
6. In a rollback title, complete simulation state is POD, saves and loads in under 100 µs, and a recorded match replays bitwise-identically in an automated test.
7. In a rollback title, all presentation side effects are gated on a re-simulation flag so audio, particles and haptics fire once per frame regardless of rollback depth.
