# Netcode: replication models, bandwidth and relevancy

Once authority, prediction and interpolation are settled, the remaining question is what actually goes on the wire: which replication semantics carry which kind of state, how many bytes each entity costs, and which entities a given client needs at all. These three answers together set the player count a design can afford.

## 1. Snapshot models and replication semantics

There are two families and they answer different questions. Snapshot replication answers "what is the world like now" and converges to correctness automatically; event replication answers "what happened" and is precise but unrecoverable if a message is lost.

Full snapshots send every relevant entity's complete state each send tick. They are trivially correct, stateless on the server, and immune to packet loss — the next snapshot repairs everything. They are also the most expensive option and become unaffordable above roughly 50 relevant entities at any useful send rate.

Delta compression sends only the fields that changed relative to a baseline the client has acknowledged. The server keeps the last N snapshots per client (typically 32–64), the client acknowledges the newest it received, and the server encodes against that. Compression of 70–90% is typical for a world where most entities are stationary or moving predictably. The cost is per-client state on the server — 64 snapshots × relevant-entity count × state size, per connected player — and a failure mode: when a client's acknowledged baseline ages out of the server's history, usually after a burst of loss, the server must send a full uncompressed snapshot, and those full snapshots arrive precisely when the connection is already struggling. Rate-limit and fragment them.

Quake 3 established the shape and it remains correct: unreliable sequenced datagrams, each carrying a delta against an acknowledged baseline, with no retransmission of anything. Nothing is resent because a resent world state is stale on arrival; the next snapshot supersedes it.

Event-driven replication sends discrete messages — "player 3 fired", "door opened", "ability cast" — over a reliable ordered channel. Use it for state that has no natural continuous representation and where missing the event cannot be repaired by later state. The discipline is to make events idempotent and to carry enough state that a client joining late or recovering from loss can reconstruct the world without them. Unreal splits this explicitly: replicated properties are eventual-consistency state that converge, while RPCs are events; the guidance is to replicate the property and derive the cosmetic event from a `RepNotify` on the client, rather than firing a multicast RPC that a late-joining client never sees.

| Model | Bandwidth | Loss behaviour | Server memory | Best for |
|---|---|---|---|---|
| Full snapshot | Highest | Self-repairing | None per client | Small worlds, fighting games, ≤50 entities |
| Delta vs baseline | 10–30% of full | Self-repairing after a full resend | 32–64 snapshots per client | Shooters, battle royale, general 3D multiplayer |
| Property replication with dirty flags | Low | Self-repairing on next update | Per-connection dirty tracking | Unreal-style actor games, MMOs |
| Reliable events | Lowest for rare things | Blocks the ordered channel on loss until retransmit | Retransmit queue | Chat, scores, inventory transactions, matchmaking |

The rule that prevents the common failure: continuous state goes over unreliable channels and repairs itself; discrete transitions go over reliable channels and are made idempotent. Sending position reliably is the single most common netcode mistake, because a retransmitted position is both useless and head-of-line blocking for everything behind it.

## 2. Bandwidth budgeting

Bandwidth is arithmetic, so do the arithmetic before choosing a send rate. Downstream per client is `relevantEntities × bytesPerEntity × sendRate + overhead`, and every one of those four terms is a lever.

Start with what a naive implementation costs. A transform as three 32-bit floats plus a four-float quaternion is 28 bytes; add velocity, angular velocity and a state bitfield and an unquantised entity is 50–60 bytes. At 50 relevant entities and a 30 Hz send rate that is 75–90 kB/s, or 600–720 kbit/s per client downstream — unaffordable on mobile, expensive on a server paying for egress at scale.

Quantisation removes most of it, and the correct framing is that every field has a precision requirement derived from what the player can perceive.

| Field | Naive | Quantised | Encoding |
|---|---|---|---|
| Position, ±4,096 m world, 1/32 m resolution | 96 bits | 54 bits | 18 bits per axis, integer |
| Position, ±512 m arena, 1/128 m resolution | 96 bits | 51 bits | 17 bits per axis |
| Rotation, full quaternion | 128 bits | 29 bits | Smallest-three: 2-bit index + 3 × 9-bit components |
| Yaw only (upright characters) | 32 bits | 9–12 bits | Fixed point over 0–2π |
| Velocity, ±64 m/s, 1/16 m/s | 96 bits | 36 bits | 12 bits per axis |
| Health, 0–100 | 32 bits | 7 bits | Integer |
| Animation state | 32 bits | 5–6 bits | Enum index |
| Booleans (grounded, crouched, firing) | 8 bits each | 1 bit each | Bitfield |

A character encoded this way is 13–16 bytes rather than 56, so 50 entities at 30 Hz becomes 19–24 kB/s, or 155–190 kbit/s. Apply delta compression on top and idle entities cost a single bit each.

Bit-packing rather than byte-alignment is what makes those numbers real; a writer that appends arbitrary bit counts to a buffer and flushes at the end recovers the 3–7 bits per field that alignment wastes, which is 20–30% of a densely quantised packet. Every serious network library provides one — Unreal's `FBitWriter`, Netcode for GameObjects' `FastBufferWriter` with `BytePacker`, Mirror's compression helpers — and the reason to use it is arithmetic, not elegance.

Separate the send rate from the tick rate deliberately. A server simulating at 60 Hz may send at 20–30 Hz because the simulation cost is per-tick while the bandwidth cost is per-send. Halving the send rate halves bandwidth and adds one send interval to interpolation delay; that is usually the right trade below 60 Hz of send rate and the wrong one for a competitive shooter, where 64 Hz send is the floor.

Budget targets to hold: mobile and cross-platform casual, 32–64 kbit/s per client down and 16 kbit/s up; console and PC shooter, 128–512 kbit/s down and 32–64 kbit/s up; large-scale MMO, 64–256 kbit/s down with aggressive relevancy doing the work. Keep every packet under 1,200 bytes of payload — the 1,500-byte Ethernet MTU minus IP and UDP headers minus a margin for PPPoE, VPN and tunnel encapsulation — because a fragmented UDP datagram is lost entirely if any fragment is lost, converting a 2% loss rate into a 4% one.

Header overhead is not negligible at high send rates. IP plus UDP is 28 bytes per packet; at 64 Hz that is 1.8 kB/s per direction of pure overhead, and if the payload is 60 bytes then 32% of the bandwidth is headers. Send one packet per tick containing everything, never one packet per subsystem.

Studio: set a per-client bandwidth ceiling in configuration, measure the p99 against it per map and per player count, and treat exceeding it as a bug with an owner. Unreal exposes the ceiling directly as `MaxDynamicBandwidth`/`NetSpeed` and will silently drop the least-prioritised actors when it is hit, which is correct behaviour and also means the symptom of an over-budget map is entities failing to update rather than an error. Solo: measure actual bytes per second with the engine's network profiler at target player count before optimising anything, because the distribution is almost never where intuition says.

## 3. Relevancy and interest management

This is what makes 100-player games possible, and it is the highest-leverage optimisation in networking because it reduces the entity term of the bandwidth equation rather than the bytes term. A 100-player battle royale on a 64 km² map has perhaps 8–15 players relevant to any given client at any moment; sending all 99 is 7–12× more bandwidth for information the player cannot see.

Three mechanisms, applied in sequence.

Distance culling is the cheap first pass. Anything beyond a per-class radius is not replicated at all: 150 m for players in a shooter, 40 m for props, 500 m for vehicles and aircraft, unbounded for objectives and score state. Unreal implements this as `NetCullDistanceSquared`, defaulting to 225,000,000 uu² — 15,000 uu, or 150 m — and tuning it per class is the first thing to do on any Unreal multiplayer project.

Visibility culling removes what is occluded. A precomputed visibility set over a cell decomposition, or a coarse portal graph, answers "can a player in cell A possibly see cell B" in a table lookup. Indoor and urban maps get 60–90% additional reduction from this on top of distance culling. It is also an anti-cheat mechanism of the strongest kind: an entity that was never sent cannot be revealed by a wallhack, which is why competitive shooters invest in tight PVS rather than relying on client-side occlusion.

Priority accumulators handle what remains when relevant entities still exceed the packet budget. Each entity per connection accumulates priority proportional to importance and time since last update; the server sorts by accumulated priority, fills the packet until the budget is exhausted, and resets the priority of what it sent. The result is that a distant idle prop updates once a second while the player being shot at updates every tick, without any hard rule saying so.

```
priority = basePriority
         * distanceFactor(dist)          // 1.0 near, ~0.1 at cull edge
         * (isVisibleToClient ? 4.0 : 1.0)
         * (secondsSinceLastUpdate)      // starvation guard: rises without bound
```

The starvation term is what stops low-priority entities from never updating; without it a busy scene freezes every prop permanently. Unreal's `NetPriority` and `GetNetPriority` implement precisely this, and the Replication Graph (built for *Fortnite*'s 100-player mode) replaces the per-connection O(actors) relevancy scan with spatial grid nodes and always-relevant nodes, turning a per-frame cost of tens of thousands of distance checks into a grid lookup — which is the difference between 100 players being feasible and not.

Dormancy is the fourth lever and the most underused. An actor that will not change until touched is marked dormant and consumes zero replication cost until explicitly woken. In a world with 20,000 destructible props, dormancy is the entire reason the replication system is affordable.

Solo: distance culling per class and dormancy on static actors, which together capture most of the win. Studio: PVS or a spatial partition feeding a priority accumulator, per-class budgets, and telemetry that reports the relevant-actor count distribution per map so an artist placing 400 replicated actors in one room is caught at submission rather than at playtest.

## Pass conditions

Answer yes to every applicable line before the network layer is considered correct.

1. Continuous state travels over unreliable channels; only discrete, idempotent transitions use reliable channels, and no position or velocity is ever sent reliably.
2. Delta compression has a defined baseline history depth, and full-snapshot resends after baseline expiry are rate-limited and fragment-safe.
3. Positions, rotations and velocities are quantised to documented precisions and bit-packed rather than sent as raw floats.
4. Packet payloads stay under 1,200 bytes so no game datagram is IP-fragmented.
5. Send rate and tick rate are separate configured values, each justified by bandwidth and precision requirements respectively.
6. A per-client bandwidth ceiling is configured, and p99 bandwidth is measured per map at target player count against it.
7. Relevancy is applied in layers — per-class distance culling, visibility culling, priority accumulation with a starvation term, and dormancy on static actors.
8. No entity the player cannot legitimately perceive is replicated to that client, so information cheating is limited by what was sent rather than by client-side rendering.
