# Netcode: authority, latency budget and client-side prediction

There is no netcode that hides latency; there are only models that choose who waits and who is occasionally wrong. Light takes 27 ms to cross the Atlantic and back in fibre, routers and access networks triple that, and no amount of engineering removes the interval between a player pressing a button and a distant machine agreeing that it happened. Every technique below — prediction, interpolation, rollback, lag compensation — is a decision about which participant absorbs that interval as delay and which one absorbs it as a correction, and the design question is never "how do we remove latency" but "whose experience do we degrade, in what way, and how visibly". Answer that first, because the authority model, the tick rate, the bandwidth budget and the cheat surface all follow from it and none of them can be changed cheaply after vertical slice.

## 1. Authority models

Authority is the answer to a single question: when two machines disagree about the world, whose copy becomes true? Everything else in networking is a consequence of that answer, so choose it before writing a line of transport code.

| Model | Authority holder | Server cost | Cheat resistance | Who absorbs latency | Genre fit |
|---|---|---|---|---|---|
| Trusted client | Each client over its own actor | None | None; a modified client rewrites the world | Nobody; everyone is wrong | Co-op with friends, modding-friendly sandboxes, LAN titles |
| Listen server | One player's machine, which is also playing | None beyond that player's CPU | Moderate; host has zero-latency authority and can be modified | Remote clients; host plays offline | Co-op shooters, survival, party games, 2–16 players |
| Dedicated server | An operator-controlled process | 1 core per 10–60 players plus 0.5–4 GB RAM per instance | High; the only model where the client is purely an input device and a renderer | All clients equally | Competitive shooters, MMOs, battle royale, anything ranked |
| Deterministic lockstep | All peers, by construction — they compute the same result | None; peers relay inputs only | Moderate against state hacks, none against information hacks | All peers wait for the slowest | RTS with 1,000+ units, simulation-heavy strategy |
| Rollback peer-to-peer | Each peer over its own input; state is derived | None; often a matchmaking relay only | Low-to-moderate; input timing manipulation is the attack | Nobody perceptibly; peers absorb visual corrections | Fighting games, 2-player action, precision platform racing |

The listen server is the default trap. It is cheap, it ships, and it makes the host structurally advantaged because the host's input takes 0 ms to reach authority while everyone else's takes half a round trip. That advantage is 30–80 ms of reaction time in a genre where 30 ms decides duels, and it is not fixable within the model — only mitigable by applying the same artificial input delay to the host that the median client experiences, which players correctly perceive as their game feeling worse than singleplayer.

Deterministic lockstep is the only model whose bandwidth is independent of world size. Eight players exchanging 8 bytes of input at 10 Hz is 640 B/s total regardless of whether the battle contains 200 units or 20,000, which is why every large-unit-count RTS from *Age of Empires* onward uses it. The price is absolute: any divergence anywhere desyncs the match irrecoverably, so every constraint in the determinism section of the game loop reference becomes a hard requirement rather than a discipline, and engine physics is generally off the table.

Solo: dedicated server if the game is competitive, listen server otherwise, and accept the host advantage as a documented compromise rather than discovering it in reviews. Studio: dedicated server, authoritative movement, and a listen-server path maintained only as a development convenience with a build-time flag that makes it unusable in a shipping configuration.

## 2. The latency budget and what each model spends

Fix the numbers before the architecture, because the model that is correct at 40 ms is often wrong at 150 ms.

| Path segment | Typical cost | Notes |
|---|---|---|
| Input device to application | 1–8 ms | 1,000 Hz mouse is 1 ms; a 125 Hz gamepad over Bluetooth is 8–25 ms |
| Client simulation and render | 16–50 ms | One to three frames depending on pipeline depth and vsync |
| Client to server, one way | 5–90 ms | 5–20 ms same metro, 30–45 ms cross-country, 70–90 ms transatlantic |
| Server tick quantisation | 0 to one tick | 15.6 ms at 64 Hz, 7.8 ms at 128 Hz; mean half of that |
| Server to client, one way | 5–90 ms | Symmetric in fibre, asymmetric on mobile and satellite |
| Snapshot send interval | 15–50 ms | 20 Hz send rate is a 50 ms quantisation on top of the tick |
| Interpolation delay | 50–200 ms | Deliberate; see `netcode-interpolation-and-rollback.md` |
| Display pipeline | 8–40 ms | Panel latency plus compositor plus vsync |

End to end, a competitive shooter on a good connection is 60–90 ms from press to photon; a casual title on Wi-Fi with a 60 Hz TV is 130–220 ms. Design targets worth holding: local player action must feel instant, which means predicted locally with no network wait at all; remote player positions may be 100–150 ms stale without being noticed, because players cannot distinguish that from the animation blend; and any wait imposed on the local player above 100 ms is perceived as the game being broken rather than the network being slow.

Two thresholds are load-bearing. Below roughly 50 ms of added input delay, most players report the game as responsive; between 50 and 100 ms they report it as "floaty" without identifying why; above 130 ms they report input lag explicitly. And for hit registration, the mismatch between what a shooter saw and what the server believed becomes visible at roughly 80–100 ms of one-way latency, which is why lag compensation exists at all.

## 3. Client-side prediction

Prediction is the decision that the local player never waits. The client simulates its own input immediately, keeps a record of what it did, and repairs the difference when authority arrives. Three data structures make this work and all three must exist.

The input command carries a monotonically increasing sequence number, the tick it was generated for, and everything the simulation needs. Nothing else may influence local movement, or the server cannot reproduce it.

```cpp
struct InputCmd {
    uint32_t sequence;      // monotonic, never reused
    uint32_t tick;          // client's simulation tick
    float    moveX, moveY;  // clamped to unit disc before send
    float    viewYaw, viewPitch;
    uint16_t buttons;       // bitfield: jump, fire, crouch, sprint
    uint8_t  dtMillis;      // sub-tick duration if the server accepts variable steps
};
```

The predicted state buffer is a ring of the simulation results keyed by sequence number. Size it to cover the worst round trip you intend to support plus a margin: 256 entries at 60 Hz is 4.27 s, which is generous; 128 entries at 2.1 s is the practical minimum, because a client that overruns its history has no basis for comparison and must hard-snap.

The pending input queue holds every command sent but not yet acknowledged. It is the replay list.

```cpp
RingBuffer<PlayerState, 256> history;   // history[seq % 256]
Deque<InputCmd>              pending;   // unacknowledged, oldest first
```

Each tick, the client latches input, assigns a sequence, simulates locally, stores the result, and sends the command. Send the last 2–3 unacknowledged commands in every packet rather than one; the redundancy costs 20–40 bytes and eliminates the movement hitch that a single dropped input packet otherwise produces, which is the cheapest reliability mechanism in networking.

```cpp
InputCmd cmd = latchInput(++sequenceCounter, tickIndex);
simulateTick(localState, cmd, FIXED_DT);      // identical function to the server's
history[cmd.sequence % 256] = localState;
pending.push_back(cmd);
sendUnreliable(packet_with_last_n(pending, 3));
```

The single rule that makes the whole scheme work: `simulateTick` is one function, compiled into both client and server, taking only the state and the command as inputs. The moment client movement reads something the server does not have — a local input axis outside the command, a render-clock delta, a client-only collision layer — prediction diverges every tick and reconciliation fires continuously.

## 4. Server reconciliation, rollback and replay cost

The server processes commands in sequence order, advances the authoritative state, and returns that state stamped with the last sequence it consumed. Reconciliation is what the client does with that stamp, and it is worth writing out completely because every implementation error lives in one of these five steps.

```cpp
void onAuthoritativeState(const ServerState& auth) {
    // 1. Retire acknowledged inputs. Anything at or below the server's
    //    last processed sequence is now history the server owns.
    while (!pending.empty() && pending.front().sequence <= auth.lastProcessedSequence)
        pending.pop_front();

    // 2. Compare our prediction for that same sequence against authority.
    const uint32_t seq = auth.lastProcessedSequence;
    if (seq + history.capacity() < sequenceCounter) { hardSnap(auth); return; }  // history overrun
    const PlayerState& predicted = history[seq % 256];

    const float posErr = length(predicted.position - auth.state.position);
    const float velErr = length(predicted.velocity - auth.state.velocity);
    if (posErr < 0.01f && velErr < 0.05f && predicted.flags == auth.state.flags)
        return;                                    // agreement: do nothing at all

    // 3. Rewind: authority replaces the predicted state at that tick.
    const Vector3 visualBefore = localState.position;
    localState = auth.state;

    // 4. Replay every unacknowledged command, in order, with the same step.
    for (const InputCmd& cmd : pending) {
        simulateTick(localState, cmd, FIXED_DT);
        history[cmd.sequence % 256] = localState;
    }

    // 5. Absorb the correction visually rather than teleporting the mesh.
    renderOffset += (visualBefore - localState.position);   // decays to zero over 100–200 ms
    ++correctionCount;                                       // telemetry
}
```

Step 2's tolerance is the most consequential tuning value in the system. Too tight and floating-point divergence between a client and server built with different optimisation flags triggers a replay every tick, which costs CPU continuously and produces micro-jitter; too loose and genuine desync accumulates until it snaps visibly. Start at 1 cm of position and 5 cm/s of velocity for a human-scale character, and require exact equality on discrete state — grounded flag, crouch state, ability phase — because a one-tick disagreement about whether the player is airborne compounds into metres within a second.

Step 4 is the cost. The number of ticks replayed is the round trip expressed in ticks, because that is precisely how many commands are in flight: `replayTicks ≈ ceil(RTT × tickRate) + sendIntervalTicks`. The arithmetic is unforgiving at the tail.

| RTT | Tick rate | Ticks replayed | At 60 µs/tick | At 400 µs/tick |
|---|---|---|---|---|
| 30 ms | 60 Hz | 2–3 | 0.18 ms | 1.2 ms |
| 100 ms | 60 Hz | 6–8 | 0.48 ms | 3.2 ms |
| 200 ms | 60 Hz | 12–14 | 0.84 ms | 5.6 ms |
| 100 ms | 128 Hz | 13–15 | 0.90 ms | 6.0 ms |
| 250 ms | 128 Hz | 32–35 | 2.1 ms | 14.0 ms |

Two conclusions follow directly. Replay cost scales with tick rate and round trip multiplicatively, so a 128 Hz tick doubles the correction spike a high-ping player experiences — the players least able to afford it. And the per-tick simulation cost is the whole budget, which is why predicted movement is a compact character controller with capsule sweeps against static geometry rather than a full rigid-body scene: 60 µs per tick is achievable for the former and unattainable for the latter. Predict the player's own movement and nothing else unless you have measured the replay budget for it.

Only replay what is predicted. Replaying the entire world for 14 ticks is a rewrite of the frame budget; replaying one capsule against a static collision scene is affordable. Unreal's `CharacterMovementComponent` implements exactly this shape with `ClientUpdatePosition` and its saved-move list, and `p.NetShowCorrections 1` draws the divergence in the viewport — the first diagnostic to reach for when movement feels rubbery.

Studio: instrument corrections per minute, mean and p99 position error at correction time, and replay tick count as first-class telemetry, segmented by region. A rise in corrections on one platform is a build-configuration float mismatch until proven otherwise. Solo: log corrections to the console and treat a rate above roughly two per second on a good connection as a bug in the shared simulation function, not as a network condition.

## Pass conditions

Answer yes to every applicable line before the network layer is considered correct.

1. The authority model is a written decision with the genre and cheat requirements that produced it, not the default the engine template provided.
2. Server and client run the same compiled simulation function for any predicted state, taking only state and input command as arguments.
3. Every input command carries a monotonic sequence number, and the server echoes the last sequence it processed in every state update.
4. The client keeps a predicted state history sized to cover the maximum supported round trip, and hard-snaps explicitly with telemetry when that history is overrun.
5. Reconciliation compares predicted against authoritative state with a documented tolerance, and performs no work at all when they agree.
6. Replay tick count and per-tick replay cost are measured, and the worst-case correction spike fits inside the frame budget at the maximum supported latency.
7. Corrections per minute, position error at correction, and replay depth are reported as telemetry segmented by platform and region.
8. Visual corrections are absorbed by a decaying render offset over 100–200 ms rather than teleporting the mesh.
