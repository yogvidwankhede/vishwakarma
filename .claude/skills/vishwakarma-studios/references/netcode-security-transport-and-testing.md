# Netcode: cheat resistance, transport, testing and diagnosis

The simulation model, the replication model and the bandwidth budget describe a network layer that works when everyone is honest and the connection is good. This part covers the remaining conditions: an adversarial client, a real transport with NAT and packet loss, a test regime that reproduces player conditions, and a procedure for diagnosing what is actually wrong.

## 1. Cheat resistance

The governing rule is that the client is an untrusted rendering and input device operated by an adversary, and every design decision either respects that or does not. What follows is the practical consequence list.

Movement must be server-simulated from client inputs, not client-reported positions. Accepting a position from the client is a teleport hack with no additional work required from the attacker. Accepting inputs and simulating them means the attacker can only send inputs a legitimate client could send, so validate that the input itself is legitimate: clamp the movement vector to the unit disc before use, reject commands whose accumulated time exceeds real elapsed time by more than a small tolerance (a speed hack is a client sending more commands per second than the clock allows), rate-limit commands per connection, and reject sequences that skip or repeat.

Everything that grants an advantage must be validated server-side even when the client also checks it: fire rate against the weapon's cooldown in server ticks, ammunition count, line of sight from the shooter to the claimed hit point, range, damage values derived from server-owned tables, ability cooldowns, and inventory transactions. The client's copy of these rules exists purely to make the local experience responsive; it is never the decision.

Information cheating is the category that server authority does not address, and it is the more common one in practice. A wallhack does not modify state — it reads data the server voluntarily sent. The only real defence is not sending it: tight relevancy, PVS-based culling, and withholding fog-of-war-obscured units in strategy games. Aim assistance that reads only rendered pixels is undetectable by any server-side state check and requires statistical or client-side detection.

Statistical detection is the durable layer. Track per-player distributions of aim snap velocity, time-to-first-shot after an enemy becomes visible, headshot ratio conditioned on distance and weapon, tracking error while an enemy is behind cover, and reaction times below human floors (roughly 130 ms is exceptional, below 100 ms is not human). None of these is conclusive alone; combined, they rank players for review, and the correct action is delayed banning in waves rather than immediate kicking, because immediate feedback tells a cheat developer exactly which behaviour was detected.

Client-side anti-cheat — EAC, BattlEye, Vanguard — raises the cost of attack by inspecting process memory, hooking, and kernel-level integrity checks. Its limits are structural: it runs on hardware the attacker controls, it cannot see a DMA capture card reading memory from a second machine, it cannot see a camera pointed at the screen driving a mouse via a hardware emulator, and it imposes real costs on legitimate players in privacy, stability and Linux compatibility. Treat it as one layer that removes the low-effort majority of cheaters, never as the mechanism that makes a design safe.

In peer-to-peer there is a residue that is unfixable in principle. Any peer sees all state its simulation requires, so information cheating is total in a lockstep RTS — map hacks are undetectable server-side because there is no server. Any peer can delay or drop its own packets to manipulate timing (lag switching), and in rollback that manipulation buys frames of information. Any peer can quit to deny a loss. The mitigations are social and statistical: player reporting, reputation, results validation by replay on a backend, and confining ranked play to a server-authoritative mode. If the title is competitive and monetised, budget a dedicated-server path; the peer-to-peer economics do not survive contact with a competitive community.

## 2. Transport, NAT traversal and placement

Use UDP. TCP's in-order delivery guarantee means one lost packet blocks every packet behind it until it is retransmitted, which converts a 100 ms round trip and a 2% loss rate into periodic 200 ms freezes of all state — the opposite of what a game needs, where the newest snapshot supersedes the lost one anyway. Build reliability selectively on top: unreliable for state, reliable-ordered for a small set of transactional messages, each on a separate logical channel so a retransmit on one does not block another. ENet, GameNetworkingSockets, LiteNetLib, KCP and QUIC datagrams all provide this shape; WebRTC data channels in unreliable mode are the browser equivalent, and WebTransport over HTTP/3 is the emerging replacement.

NAT traversal is required for any peer-to-peer connection. The mechanism is UDP hole punching coordinated by a rendezvous server: both peers send to each other's public endpoint simultaneously so each NAT sees an outbound flow and accepts the corresponding inbound. Success depends on NAT behaviour — full-cone and address-restricted NATs traverse reliably, symmetric NATs (which assign a new external port per destination) generally do not. Expect 80–92% of peer pairs to connect directly and budget a relay for the remainder.

| NAT type | Traversal | Share of consumer connections |
|---|---|---|
| Full cone / address-restricted | Reliable | 60–75% |
| Port-restricted | Usually reliable | 15–25% |
| Symmetric | Fails to another symmetric or port-restricted | 5–15% |
| Carrier-grade NAT (common on mobile) | Frequently fails | 5–20% on mobile networks |

Relays (TURN, or a game-specific relay such as Photon's or Steam Datagram Relay) are mandatory fallback, not optional. Budget them as bandwidth cost: a relayed 2-player session at 128 kbit/s each way is roughly 115 MB per hour, and if 10% of sessions relay, the cost model must carry it. Steam Datagram Relay additionally hides player IP addresses, which removes the direct-connection denial-of-service attack that has repeatedly disrupted peer-to-peer competitive play.

Regional placement is latency policy expressed as infrastructure. Target 90th-percentile RTT under 60 ms within a region, which for a continental region means servers in 2–4 metros. Rough intercity round trips over commodity routes: 10–25 ms within a metro area, 30–50 ms coast to coast within a continent, 70–90 ms transatlantic, 100–140 ms transpacific, 200–300 ms to poorly connected regions. Matchmaking must treat latency as a first-class matching term rather than an afterthought: match within a latency band first (a 50 ms spread is a reasonable band), then optimise skill within it, because a skill-perfect match at 180 ms is a worse experience than a skill-approximate one at 40 ms. Publish the region list, allow manual region selection, and measure ping to each region from the client at launch using a lightweight echo rather than trusting geolocation, which is wrong often enough to matter.

## 3. Testing under adverse conditions

The works-on-LAN trap is the defining failure of game networking. A LAN has a 0.2–0.5 ms round trip, zero loss, zero jitter and no reordering, which means prediction never corrects, interpolation never runs dry, lag compensation never rewinds meaningfully, and every timing bug in the system is invisible. A build that has only been tested on a LAN is untested.

The minimum discipline is three things, all cheap.

Every developer build defaults to injected latency. Not optional, not a menu item that must be found — the play-in-editor and local-build default is a simulated 80 ms round trip with 15 ms of jitter and 1% loss, and running without it requires an explicit flag. This one change surfaces the majority of netcode bugs during feature development rather than during a network playtest. Unreal provides `Net PktLag`, `Net PktLagVariance`, `Net PktLoss`, `Net PktOrder` and `Net PktDup` as console commands and network emulation profiles in `Config`; Unity's Netcode for GameObjects ships a Network Simulator with named presets; Mirror has `LatencySimulation`; and at the OS level `clumsy` on Windows and `tc netem` on Linux apply the same conditions to any build.

Two instances minimum, always, on every gameplay feature. A single-instance test exercises none of the replication path. The habit that pays is building every feature with two clients plus a server running locally under injected latency, because a feature written and validated in isolation will need reworking when it first meets prediction.

A test matrix that includes the conditions players actually have.

| Profile | RTT | Jitter | Loss | Represents |
|---|---|---|---|---|
| Ideal | 20 ms | 2 ms | 0% | Same-region fibre; the best case, not the test case |
| Typical | 80 ms | 15 ms | 0.5% | Median broadband to a regional server |
| Poor | 150 ms | 40 ms | 2% | Congested Wi-Fi, distant region |
| Mobile | 120 ms | 80 ms | 3%, bursty | LTE with handovers; jitter dominates |
| Adversarial | 250 ms | 100 ms | 5% + reordering + duplication | The tail that generates support tickets |
| Loss burst | 80 ms | 15 ms | 100% for 2 s, then recovery | Reconnection, baseline resend, snapshot buffer recovery |

Automate what can be automated: a headless server plus scripted clients running a recorded input sequence under each profile, asserting on correction counts, bandwidth ceilings and desync checksums. Studio: run this in CI nightly and gate on regressions in corrections-per-minute and p99 bandwidth. Solo: keep the emulation on by default and test the poor profile manually before every release, which costs 20 minutes and catches the bugs players would report.

Test the failure paths explicitly, because they are the ones never exercised in development: mid-match disconnect and reconnect, host migration if the model has one, a client whose clock is 30 seconds off, joining mid-match, a full server, and a client that stops sending inputs entirely while remaining connected.

## 4. Engine and library mapping

| Stack | Authority model | Prediction | Interpolation | Relevancy | Best fit |
|---|---|---|---|---|---|
| Unreal replication | Server-authoritative actor replication with RPCs | `CharacterMovementComponent` saved moves; Network Prediction plugin for custom | Built into movement components and `SmoothClientPosition` | `NetCullDistanceSquared`, `NetPriority`, dormancy, Replication Graph, Iris | AAA shooters, large player counts, anything already in Unreal |
| Unity Netcode for GameObjects | Server-authoritative `NetworkBehaviour`, `NetworkVariable`, RPCs | Client-side anticipation APIs; hand-rolled for anything complex | `NetworkTransform` interpolation, configurable | Distance-based visibility via `NetworkShow`/`NetworkHide` | Unity projects up to moderate scale |
| Photon Fusion | Server or host authoritative, tick-aligned | Built-in client prediction and reconciliation on a fixed tick | Built-in snapshot interpolation | Interest management with area-of-interest cells | Unity multiplayer without running your own transport |
| Mirror | Server-authoritative, lightweight | Manual, plus community prediction modules | `NetworkTransform` variants | Interest management plugins, distance and spatial hashing | Small teams shipping Unity multiplayer cheaply |
| GGPO / GekkoNet | Peer-to-peer rollback | Rollback with input prediction | Not applicable; state is authoritative each frame | Not applicable | Fighting games, 2-player deterministic action |
| Custom UDP (ENet, GameNetworkingSockets, LiteNetLib) | Whatever you build | Whatever you build | Whatever you build | Whatever you build | Custom engines, deterministic RTS, extreme scale |

The selection rule: use the engine's model unless a measured requirement rules it out. Custom netcode is 6–18 engineer-months to reach parity with what the engine already provides, and the reasons that genuinely justify it — deterministic lockstep for 20,000 units, rollback with a POD state block, an entity count the built-in replication cannot express — are identifiable in pre-production if they are asked about.

## 5. Diagnosing netcode bugs

A decision procedure that resolves most reports.

Local movement feels rubbery or snaps backwards. Prediction and server simulation disagree. Enable correction visualisation (`p.NetShowCorrections` in Unreal, an equivalent debug draw elsewhere), log the position error at correction time, and look for a client-only input to movement, a different collision configuration between builds, or a floating-point mismatch from differing compiler flags. A correction rate above roughly 2 per second on a clean connection is a shared-simulation bug, not a network condition.

Remote players stutter or teleport. Interpolation delay is below one send interval, or extrapolation is running. Log snapshot arrival times and buffer occupancy; a buffer that regularly empties means the delay is too small for the observed jitter. If the buffer is healthy and motion is still stepped, interpolation is being applied to the wrong pair of snapshots or the render time estimate is drifting.

Shots visibly hit but do not register. Compare the server's rewound hitbox position against the client's rendered position at the same time by logging both. The usual causes are the rewind time being derived from server receipt time rather than the client's render time, hitbox history sampled at send rate rather than tick rate, and the rewind clamp being shorter than the client's actual interpolation delay plus latency.

Everything is fine until player count rises, then all motion degrades. Bandwidth ceiling reached; the replication system is dropping updates by priority. Measure bytes per second per client against the configured ceiling and the relevant-actor count. The fix is relevancy, not compression.

Desync in a deterministic model. Enable per-tick state checksums, exchange them, and halt on the first mismatch with the tick index. The order of likely causes: an unordered container iterated during simulation, a transcendental function differing between platforms, a presentation-side RNG sharing the simulation stream, and a fast-math compiler flag on one target.

Reliable messages arrive in bursts after a stall. Head-of-line blocking on the reliable channel. Something continuous is being sent reliably; find it and move it to unreliable state replication.

Behaviour differs between two clients on the same connection quality. Check for host or listen-server advantage, then for anything that reads local time rather than estimated server time.

It works for the team and fails for players. The team is on a LAN. Reproduce under the poor and adversarial profiles from section 3 before investigating anything else.

## Pass conditions

Answer yes to every applicable line before the network layer is considered correct.

1. The server validates movement input magnitude, command timing against real elapsed time, fire rate, ammunition, range, line of sight and all damage values, independently of the client.
2. Statistical cheat detection collects aim velocity, time-to-first-shot and tracking-through-cover distributions, and bans are applied in delayed waves.
3. A relay fallback exists for peer-to-peer sessions, and its bandwidth cost at the expected relay rate is in the operating budget.
4. Matchmaking bands by measured latency before optimising skill, and clients measure region ping directly rather than relying on geolocation.
5. Developer builds default to injected latency, jitter and loss; running without emulation requires an explicit flag.
6. Every gameplay feature is developed and reviewed with at least two instances running under the typical profile, never a single instance.
7. The test matrix includes typical, poor, mobile, adversarial and loss-burst profiles, plus mid-match disconnect, reconnect and late join.
8. A per-tick state checksum runs in development builds for any deterministic model, and a desync halts with the tick index rather than continuing.
9. Network configuration values — tick rate, send rate, interpolation delay, rewind cap, bandwidth ceiling, cull distances — live in one documented configuration surface, not as constants scattered through gameplay code.
