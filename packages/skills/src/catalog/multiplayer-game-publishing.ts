// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * A multiplayer game is a single-player game with a network between the player's hand and the
 * screen, and the entire craft of it is deciding what to draw during that gap.
 *
 * A 400 ms round trip is not a latency problem. It becomes one the moment the interface waits
 * for the server before drawing anything, because then the round trip is not transport time —
 * it is response time, and response time above roughly 100 ms stops reading as a reaction and
 * starts reading as a fault. The fix is not a faster network. It is to draw the consequence of
 * the input locally on the same frame it arrived, and to re-apply the authoritative operation in
 * bus order when it returns, so the player waits for *confirmation* of something they can already
 * see rather than for the thing itself.
 *
 * The second mechanism is that a shared session has no shared view. Every client holds its own
 * slightly stale copy of the world, so every fact the interface declines to state out loud — who
 * is present, which phase this is, whether this player is still connected, whose colour is whose —
 * becomes a question each player answers privately, and mostly wrongly. Silence is not neutral in
 * a multiplayer interface; it is an invitation to invent an explanation, and the invented one is
 * usually "it's broken".
 *
 * Everything below follows from those two: echo locally and reconcile on receipt; send anything
 * the game's outcome depends on over the reliable path rather than the throttled bus; surface
 * connection quality on a stated deadline; make a mid-session arrival legible within seconds; and
 * compute player colours so that two adjacent slots cannot be confused by anyone.
 */
export const multiplayerGamePublishing: SkillManifest = {
  vsm: '1.0',
  id: 'multiplayer-game-publishing',
  name: 'Multiplayer Game Publishing',
  description:
    'Use when building or publishing a browser multiplayer game on SharkyNet — local echo, join flows, disconnection state, player colours.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'integration',
  tags: ['multiplayer', 'sharkynet', 'realtime', 'games', 'html'],

  activation: {
    intents: [
      'building a browser-based multiplayer game that several people play at once',
      'wiring real-time state sync between players and deciding what to draw before the server replies',
      'designing the flow for a player who joins a room that is already in progress',
      'showing connection quality, lag, dropout, or reconnection state in a game UI',
      'assigning per-player identity colours that stay distinguishable as the roster grows',
      'choosing between the throttled operation bus, reliable delivery, and shared key-value state',
      'building, playtesting, or publishing a single-file HTML game to sharky.gg',
      'a multiplayer game feels laggy, desynchronised, or silently drops players',
    ],
    globs: [
      '**/game.html',
      '**/dist/index.html',
      '**/*.game.html',
      '**/sharky*.{js,ts,html}',
      '**/scripts/{build,publish,dev-serve,room-test,playtest-gate}.ts',
    ],
    keywords: [
      'multiplayer',
      'sharkynet',
      'sharky.gg',
      'sharky-online',
      'local echo',
      'reconciliation',
      'setshared',
      'sendreliable',
      'room',
      'lobby',
      'join in progress',
      'netcode',
      'rtt',
      'player colour',
    ],
  },

  content: {
    summary:
      'Use when building a browser multiplayer game on SharkyNet: echo every input locally before the send and reconcile on server order, send outcome-bearing events reliably, surface disconnection within 2 s, and make a mid-session join legible in 3 s.',

    body: `# Multiplayer Game Publishing

The deliverable is one HTML file with everything inline — markup, styles, logic, vendored
libraries — that runs a real-time game for several players and publishes to sharky.gg through
the sharky-online platform. Multiplayer arrives as a \`SharkyNet\` runtime that the host page
injects, so game code opens with a guard and stays inert when that runtime is absent.

Two mechanisms generate almost every rule below. **The network sits between the hand and the
screen**, so a 400 ms round trip is tolerable only when local echo has already collapsed the gap
and the player is waiting for confirmation rather than for a response. And **a shared session has
no shared view** — each client holds its own slightly stale copy of the world, so any fact the
interface does not state out loud is one each player answers privately and wrongly.

**Scope.** This skill owns the *interface* layer of a networked session: local echo, presence,
connection-quality display, join and rejoin legibility, and publishing to the platform. The
*simulation* layer beneath it — server authority, client prediction and reconciliation, lag
compensation, rollback, tick rate, cheat resistance — belongs to \`vishwakarma-studios\`. The
dividing question is what the answer is about: what the player is shown while the network is
slow is this skill; what the server believes and when is that one.

---

## 1. Synchronisation feedback (error if absent)

Every network event must produce local-echo feedback within one frame, and a distinct visual
confirmation when server ordering arrives. Echo optimistically, then re-apply the operation in
bus order on receipt and correct the prediction where the two disagree.

The two signals must not look the same. The echo says *received*; the confirmation says *agreed*.
An interface that draws only the echo cannot express a move that was rejected or reordered, and
one that draws only the confirmation spends the entire round trip looking broken.

## 2. Join flow clarity (error if absent)

A player arriving mid-session must understand state, role, and next action within 3 seconds of
the first \`players()\` update. Distinguish the catch-up phase from the live phase with a muted
palette against full colour, so the arriving player can see that what they are looking at is not
yet theirs to act on. A joiner who cannot tell those apart either sits out a phase they could
have played or acts into a phase that has already resolved.

## 3. Disconnection visibility (error if absent)

A \`quality().tier\` change away from \`'good'\` must surface in the UI within 2 seconds. Silent
degradation produces confusion, because the player attributes the stall to their own input and
retries — which adds load to the connection that is already failing. Explicit state lets them
wait, retry deliberately, or leave.

## 4. Colour system (warning if violated)

Player identity colours are computed in OKLCh, with deltaE of at least 15 between adjacent slots
and 3:1 contrast against the surface they sit on:

    hue    = (30 + N * 137.5) mod 360
    chroma = 55
    L      = 65 on dark surfaces, 40 on light

The golden-angle step is what keeps slot 9 as separable as slot 2 — successive multiples of
137.5° never fall back near an earlier slot the way a rational fraction of the circle does. Hue
alone is still not identity: pair it with position, shape, or an initial, because a hue pair that
clears deltaE 15 in normal vision can collapse under deuteranopia.

## 5. Motion contract (warning if violated)

State transitions take their timing from Motion Grammar intents. Room-join uses \`enter\` at 200–300 ms decelerating; a player leaving uses \`exit\` at 120–180 ms
accelerating. A scored event uses \`affirm\` at 300–400 ms with overshoot, or \`reject\` at 350 ms
as a two-cycle shake. All motion honours \`prefers-reduced-motion\` by collapsing to opacity-only
rather than to nothing, since the state change still has to be legible.

## 6. Responsive layout (warning if violated)

Playable at 390×844 px and at 1280×800 px, with touch targets of at least 44×44 px. Both are
real: the phone is where a link shared into a chat gets opened, and the desktop is where the
second tab is usually opened during testing.

---

## Architecture rules

1. Echo every input locally **before** \`net.send()\`, and re-apply it in bus order on receipt.
2. Use \`net.sendReliable()\` or \`net.claim()\` for phase, score, and game-over events. The
   throttled bus caps at 15 ops per second and drops under pressure, which is survivable for a
   cursor position and fatal for the event that ends the round.
3. Persistent room state goes in \`net.setShared()\`; ephemeral state stays on the bus only. A
   late joiner reads shared state and receives nothing that was already broadcast.
4. Guard every game script:
   \`async function init(){ if(typeof SharkyNet==='undefined') return; } init()\`
5. Vendor libraries as \`/*__VENDOR:lib-version.global.min__*/\` comments rather than CDN fetches,
   so the published file has no third-party runtime dependency and cannot fail on someone else's
   uptime.

---

## Build workflow

Write one \`game.html\` with everything inline, then run build, playtest-gate, dev-serve, publish
and room-test in that order. The exact invocations, the SharkyNet API surface, and the real-time
UI patterns behind rules 1–3 are in the reference.`,

    references: [
      {
        id: 'sharkynet-api-and-realtime-ui',
        title: 'SharkyNet API surface, the build and publish pipeline, and real-time UI design',
        answers:
          'What does each SharkyNet method do and when should I use it, what are the exact build/playtest/publish commands, and how do I design local echo, reconciliation, latency masking, join-in-progress, reconnection, and player colour assignment?',
        content: `# SharkyNet API surface, the build and publish pipeline, and real-time UI design

## 1. The API surface

\`\`\`js
const net = await SharkyNet.ready()
net.me()              // { id, isHost, room }
net.players()         // active roster
net.quality()         // { tier, rttMs, updateAgeMs }
net.send(op)          // throttled bus, <=15 ops/s
net.sendReliable(op)  // guaranteed delivery
net.claim(op, cb)     // sendReliable + log-receipt callback
net.on('op', (op, meta) => {})   // meta: { seq, uid, self, replayed, staleMs }
net.setShared(k, v)   // shared KV, <=128 keys, <=4 KB each
\`\`\`

\`SharkyNet.ready()\` resolves once the runtime has a room and an identity, which is the earliest
moment any of the other calls mean anything. Everything before it — layout, asset load, the title
card — should already be on screen, because \`ready()\` is a network wait and a blank page during
a network wait is indistinguishable from a broken page.

\`me()\` returns the local identity and, critically, \`isHost\`. Host is a role, not a privilege
tier you should build a second interface around; use it to decide who runs any tie-breaking logic
that must run exactly once, and design so that the host leaving is a re-election rather than an
end of session.

\`players()\` is the roster, and it is the only honest source for "who is here". Deriving presence
from "who has sent an op recently" produces a roster that quietly loses anyone who is thinking.

\`quality()\` returns \`tier\`, \`rttMs\` and \`updateAgeMs\`. \`updateAgeMs\` is the one to watch:
\`rttMs\` describes the last successful exchange, while \`updateAgeMs\` describes how long it has
been since anything arrived at all, which is the number that rises during an actual dropout.

### Choosing a channel

| Channel | Guarantee | Use for |
|---|---|---|
| \`net.send\` | throttled, ≤15 ops/s, lossy under pressure | position, aim, cursor, typing indicators, anything the next message supersedes |
| \`net.sendReliable\` | guaranteed delivery | phase changes, score, game-over, joins and leaves, anything the outcome depends on |
| \`net.claim\` | reliable plus a log-receipt callback | contested actions where the caller needs to know the claim landed and in what order |
| \`net.setShared\` | shared KV, ≤128 keys, ≤4 KB each | state a late joiner must be able to read: room config, current phase, cumulative scores |

The distinction that matters is **supersession**. If the next message makes this one irrelevant,
the bus is correct and dropping it costs nothing. If losing this message leaves two clients
believing different things about the outcome, it belongs on the reliable path. A dropped cursor
frame is invisible; a dropped "round over" leaves half the room playing a game that has ended.

The bus is throttled at 15 ops per second, which is roughly one op every four frames at 60 fps.
Sample continuous input at that rate rather than per frame, and interpolate between the samples
you receive rather than snapping to each one.

### The receive callback

\`\`\`js
net.on('op', (op, meta) => {
  // meta: { seq, uid, self, replayed, staleMs }
})
\`\`\`

\`seq\` is the authoritative ordering, and it is the only ordering. \`uid\` identifies the sender.
\`self\` is true for your own operation coming back, which is what closes the reconciliation loop.
\`replayed\` marks an operation delivered out of its original real-time position — do not fire
sound, haptics, or celebratory motion on a replayed op, because the player has already moved on
and a delayed cheer reads as a bug. \`staleMs\` is the age of the operation on arrival; use it to
decide whether to animate the change or to apply it instantly, since animating a 900 ms-old event
over 300 ms puts the interface further behind reality than it already is.

## 2. Build, playtest, publish

\`\`\`bash
# 1. Write: a single game.html, everything inline.

# 2. Build
bun <skill>/scripts/build.ts --game game.html --title "T" \\
  --min-players 2 --max-players 8 --out dist/index.html

# 3. Test
bun <skill>/scripts/playtest-gate.ts --html dist/index.html --two-client

# 4. Dev
bun <skill>/scripts/dev-serve.ts --html dist/index.html

# 5. Publish
bun <skill>/scripts/publish.ts --html dist/index.html --title "T" \\
  --min-players 2 --max-players 8 --cover-description "..."

# 6. Verify
bun <skill>/scripts/room-test.ts --game-id <id>
\`\`\`

The build step inlines the vendored libraries marked by
\`/*__VENDOR:lib-version.global.min__*/\` comments and stamps the player-count metadata that the
lobby uses to decide when a room can start. That metadata is why \`--min-players\` and
\`--max-players\` must match what the game logic actually tolerates: a game that needs three
players to be playable but declares a minimum of two will start into an unplayable state and the
players will read that as a bug in the game rather than in its manifest.

\`playtest-gate.ts --two-client\` drives two clients against one room and fails the seam cases —
the ones that only exist because there are two of them. Passing it is necessary and not
sufficient; a real second browser tab, ideally an incognito one so it carries a different
identity, is still the check that finds the join-in-progress defects, because a mock room starts
empty and the interesting case starts full.

\`room-test.ts\` runs after publish against the live game id. Publishing is externally visible, so
treat the room test as the confirmation that what shipped is what was built rather than as an
optional extra.

## 3. Local echo and reconciliation

The loop has three parts and all three are required.

**Predict.** On input, apply the effect to local state immediately and draw it on the same frame.
Tag it with a client-side sequence number so you can find it later.

**Send.** Emit the operation on the appropriate channel with that tag attached.

**Reconcile.** When \`net.on('op')\` delivers the operation with \`self === true\`, discard the
prediction and re-apply the authoritative version in \`seq\` order along with everything else that
arrived. Where the two agree, nothing visible happens — which is the common case and the point.
Where they disagree, correct the local state, and correct it *visibly*: a silent correction reads
as the game randomly undoing the player's action, whereas a 120–180 ms move from the predicted
position to the authoritative one reads as the world settling.

The failure to avoid is applying the echo and then applying the authoritative copy on top of it,
which double-counts every action — the classic symptom is a value that increments twice per click
on a good connection and once per click on a bad one.

Predict only what is locally determinable. A player's own movement, their own card selection,
their own draw stroke: these are safe, because the server will almost always agree. Do not predict
anything contested — who reached the pickup first, whether an attack landed — because those
predictions are wrong often enough that the correction becomes the dominant experience.

## 4. Masking latency

Once echo is in place, the remaining gap is the confirmation, and the job is to fill it with
something honest.

Give the pending state its own visual register: slightly reduced opacity, a dashed or lighter
outline, a subtle pulse. It must read as *provisional*, not as *disabled* — a greyed-out control
tells the player they cannot act, which is the opposite of what has happened.

Never spend the wait on a blocking spinner over the whole board. A spinner claims the interface
has nothing to show, and after an echo that is not true.

Cover the gap with motion that would have happened anyway. A card that takes 250 ms to travel to
the discard pile has spent most of a typical round trip doing something the player reads as
gameplay rather than as waiting. This is the cheapest latency budget available and it costs
nothing but sequencing.

Show the number when it stops being ordinary. Below roughly 150 ms, a latency readout is noise
that makes players anxious about a connection that is fine. Above it, an explicit \`rttMs\`
readout converts a vague feeling of sluggishness into a fact about the network, which players
accept far more readily than a game that seems arbitrarily unresponsive.

Degrade in one direction only. When \`tier\` drops, increase interpolation and reduce prediction —
do not do the reverse, because a worse connection is exactly when predictions are most likely to
be wrong and corrections most likely to be violent.

## 5. Join-in-progress

Within 3 seconds of the first \`players()\` update, a joiner must be able to answer three
questions: *what is happening*, *what am I*, and *what do I do next*.

Read the world from \`setShared()\` first and render it in the catch-up register — the muted
palette — before any bus traffic is applied. Shared state is the only complete picture available
to someone who was not there; the bus carries only what has happened since they arrived.

State the role explicitly in words, not only by colour. "You are green, playing from round 4" is
legible; a green border is a puzzle. If the joiner is a spectator until the next phase boundary,
say that, and say when it ends: "Joining next round" with a visible phase indicator beats an
inert board with no explanation.

Give the transition from catch-up to live a deliberate moment — the palette lifting to full
colour over 200–300 ms on the phase boundary. That is the frame at which the player's input
starts to matter, and marking it is what prevents the two classic joiner errors: acting into a
phase that has already resolved, and sitting out one they could have played.

Announce the arrival to the existing players too. A roster that silently grows is the multiplayer
equivalent of someone walking into a room behind you.

## 6. Disconnection and reconnection

Treat the connection as a small state machine and give each state its own presentation.

**Good.** No connection UI at all. A permanent status light trains players to ignore it, which
means it is not there when it matters.

**Degraded** — \`tier\` off \`'good'\`, or \`updateAgeMs\` climbing. Surface within 2 seconds: an
inline, non-modal indicator near the affected surface rather than a dialogue over the game. The
player is mid-action; a modal at this moment destroys the action that the degraded connection had
merely delayed.

**Disconnected.** Freeze the world rather than continuing to simulate it. A game that keeps
running locally while the network is gone produces a divergent state that must later be discarded,
so the player watches their last thirty seconds of play get deleted. Freezing costs those thirty
seconds up front and honestly.

**Reconnecting.** Show that the attempt is happening and that it is bounded — an attempt counter
or a next-retry countdown. Unbounded "reconnecting…" with no progress is the state players
abandon, because they cannot tell it apart from a hang.

**Recovered.** Re-read shared state and reconcile before removing the notice, then confirm what
was missed: "Reconnected — you missed 2 rounds" is worth far more than a silent resume, which
leaves the player to discover the gap by being confused about the score.

Other players' dropouts need the same treatment from the outside. Fade an absent player's avatar
rather than removing it, hold their slot and colour for a stated grace period, and only then
convert them to "left". Removing a player instantly makes a two-second blip look like a
departure, and the colour slot gets recycled to a new arrival, so the same colour now means two
different people within a minute.

## 7. Player identity colours

\`\`\`
hue    = (30 + N * 137.5) mod 360      // N = player slot index, 0-based
chroma = 55
L      = 65 on dark surfaces, 40 on light
\`\`\`

The 137.5° step is the golden angle, and it is chosen because it is the rotation least well
approximated by any small rational fraction of the circle. Stepping by 90° gives four good colours
and then repeats; stepping by 137.5° means no slot ever lands near an earlier one, so the eighth
player is as separable from their neighbours as the second. Starting at 30° puts the first player
in a warm orange rather than a pure red, which leaves red available to mean danger.

Holding chroma at 55 and lightness at a single value per surface is what makes the slots read as
one system: varying all three axes produces a set where some players are obviously "brighter" than
others, and brightness reads as importance.

The constraints on the result are **deltaE ≥ 15 between adjacent slots** and **3:1 contrast**
against the surface the colour sits on. The first is a perceptual-difference floor, not a hue
floor — two colours can differ by a large hue angle and still be perceptually close near the
gamut edges, which is exactly where high-chroma OKLCh values live. The second is the standard
threshold for non-text graphical objects, and player tokens are graphical objects carrying
meaning.

Colour cannot be the only carrier. Roughly one in twelve men has a colour-vision deficiency, and
deuteranopia in particular compresses the red-green axis so that two hues 60° apart can become
indistinguishable while remaining 60° apart on paper. Attach a second channel to every player
identity — a position in a fixed roster order, an initial, or a distinct token shape — and check
the palette through a CVD simulation before shipping.

Assign slots by join order and hold them for the session. Re-sorting the roster by score
re-colours everyone, and the player who was blue for four rounds now has to re-learn which token
is theirs at exactly the moment the game got interesting.

## 8. Vishwakarma integration

- \`@vishwakarma/motion\` — \`resolveMotion('enter')\` for room-join, \`resolveMotion('respond')\`
  for echo feedback.
- \`@vishwakarma/core\` — \`oklchToHex()\` with the golden-angle formula for player colours, and
  \`checkContrast()\` for the 3:1 floor.
- \`@vishwakarma/audit\` — \`extractMeasurements()\` on filmstrip screenshots for CI.
- \`@vishwakarma/three\` — combine with the 3D game assets skill for GLB plus multiplayer.

## Pass conditions

- Local echo fires before \`net.send()\`, and the authoritative op is re-applied in \`seq\` order
  without double-counting the prediction.
- The echo and the server confirmation are visually distinct states.
- \`sendReliable\` or \`claim\` carries every phase, score, and game-over event; the bus carries
  only supersedable state.
- Persistent room state lives in \`setShared()\`, and a late joiner renders a complete world from
  it before any bus traffic is applied.
- A \`quality().tier\` change off \`'good'\` is visible within 2 seconds, non-modally.
- Disconnection freezes the world; reconnection is bounded and visibly counted; recovery states
  what was missed.
- The join flow has been tested in a real second tab, incognito, against a session already in
  progress — not only against a mock room.
- Player colours follow the golden-angle formula, clear deltaE 15 between adjacent slots and 3:1
  contrast, survive a colour-blindness simulation, and are paired with a non-colour channel.
- Colour slots are held for the session and for a grace period after a dropout.
- Every game script is guarded against an undefined \`SharkyNet\`.
- Libraries are vendored by build comment; no CDN fetch appears in the published file.
- Every animation has a \`prefers-reduced-motion\` branch that collapses to opacity rather than to
  nothing, verified in DevTools.
- The filmstrip has been checked at 390×844 and 1280×800, with 44×44 px minimum targets.
- \`playtest-gate.ts --two-client\` passes, and \`room-test.ts\` passes against the published id.`,
      },
    ],
  },

  rules: [
    {
      id: 'multiplayer/local-echo-before-send',
      strength: 'must',
      statement:
        'Apply and draw the effect of an input locally in the same frame it arrives, before net.send(), then re-apply the authoritative operation in seq order on receipt.',
      evidence: {
        rationale:
          'A 400 ms round trip is tolerable only when local echo collapses the gap, because what the player then waits for is confirmation of something already on screen rather than the response itself. Reconciling in seq order rather than trusting the prediction is what keeps the client convergent with the server; skipping the reconcile and stacking the authoritative op on top of the echo double-counts every action.',
        confidence: 'established',
      },
      examples: {
        language: 'javascript',
        bad: "net.send({ t: 'move', x })\n// board updates only when the op comes back",
        good: "applyLocal({ t: 'move', x, pending: true })   // same frame\nnet.send({ t: 'move', x })\nnet.on('op', (op, meta) => { if (meta.self) reconcile(op, meta.seq) })",
      },
      verifiedBy: 'sync-and-authority-review',
    },
    {
      id: 'multiplayer/reliable-for-outcome-events',
      strength: 'must',
      statement:
        'Send phase changes, score changes, and game-over events with net.sendReliable() or net.claim(), never on the throttled net.send() bus.',
      evidence: {
        rationale:
          'The bus caps at 15 ops per second and sheds messages under pressure, which is free for state the next message supersedes and fatal for state it does not. A dropped cursor frame is invisible; a dropped round-over leaves half the room playing a game that has already ended, and the two clients can no longer be reconciled without discarding play.',
        confidence: 'established',
      },
      examples: {
        language: 'javascript',
        bad: "net.send({ t: 'gameOver', winner })",
        good: "net.claim({ t: 'gameOver', winner }, (receipt) => showResult(receipt))",
      },
      verifiedBy: 'sync-and-authority-review',
    },
    {
      id: 'multiplayer/shared-state-for-persistence',
      strength: 'must',
      statement:
        'Keep persistent room state in net.setShared() within its 128-key, 4 KB-per-key limits, and keep ephemeral state on the bus only.',
      evidence: {
        rationale:
          'Bus operations are delivered only to clients connected when they were sent, so a player who joins later receives nothing that already happened. Shared key-value state is the only complete picture available to an arriving or reconnecting client, which makes it the difference between a joiner who can render the world and one who must wait for the next event to infer it.',
        confidence: 'established',
      },
      examples: {
        language: 'javascript',
        bad: "net.send({ t: 'phase', phase: 'bidding' })   // joiners never learn the phase",
        good: "net.setShared('phase', 'bidding')\nnet.sendReliable({ t: 'phase', phase: 'bidding' })",
      },
      verifiedBy: 'sync-and-authority-review',
    },
    {
      id: 'multiplayer/disconnection-visible-within-2s',
      strength: 'must',
      statement:
        "Surface a quality().tier change away from 'good' in the UI within 2 seconds, using a non-modal indicator rather than a dialogue over the game.",
      evidence: {
        rationale:
          'A player who cannot see that the connection has degraded attributes the stall to their own input and retries, which adds traffic to a link that is already failing. Explicit state converts an unexplained hang into a fact the player can act on. It stays non-modal because the degradation arrives mid-action, and a dialogue destroys the action the slow connection had only delayed.',
        confidence: 'strong',
      },
      examples: {
        language: 'javascript',
        bad: "setInterval(() => { if (net.quality().tier !== 'good') console.warn('lag') }, 1000)",
        good: "setInterval(() => {\n  const q = net.quality()\n  statusEl.dataset.tier = q.tier          // inline, near the affected surface\n  statusEl.textContent = q.tier === 'good' ? '' : `Connection ${q.tier} · ${q.rttMs} ms`\n}, 500)",
      },
      verifiedBy: 'join-and-presence-review',
    },
    {
      id: 'multiplayer/join-in-progress-legibility',
      strength: 'must',
      statement:
        'Within 3 seconds of the first players() update, a mid-session joiner must be shown the current state, their own role, and their next action, with catch-up rendered in a muted palette against the live phase in full colour.',
      evidence: {
        rationale:
          'A joiner has no history and cannot infer a phase from a static board. Without an explicit distinction between catch-up and live they make one of two errors: acting into a phase that has already resolved, or sitting out one they could have played. Rendering catch-up in a muted palette marks the board as not yet theirs, and lifting to full colour on the phase boundary marks the frame at which their input starts to count.',
        confidence: 'strong',
      },
      examples: {
        language: 'javascript',
        bad: "net.on('op', render)   // joiner sees a board with no phase, role, or prompt",
        good: "renderFromShared(net, { mode: 'catchup' })\nannounce(`You are ${me.colourName}. Joining at round ${shared.round}.`)\nonPhaseBoundary(() => liftToLive(250))",
      },
      verifiedBy: 'join-and-presence-review',
    },
    {
      id: 'multiplayer/player-colour-separation',
      strength: 'must',
      statement:
        'Compute player colours as hue = (30 + N * 137.5) mod 360 at chroma 55 and L 65 on dark or 40 on light, holding deltaE of at least 15 between adjacent slots and 3:1 contrast against the surface.',
      evidence: {
        rationale:
          'The 137.5-degree golden-angle step is the rotation least well approximated by a small rational fraction of the circle, so no slot lands near an earlier one and the eighth player stays as separable as the second. Fixing chroma and lightness prevents brightness variation from reading as importance. The deltaE floor is perceptual rather than angular, which matters because high-chroma OKLCh values near the gamut edge can be close in appearance while far apart in hue.',
        confidence: 'strong',
      },
      examples: {
        language: 'javascript',
        bad: "const colours = ['red', 'blue', 'green', 'lime', 'teal']",
        good: 'const hue = (30 + slot * 137.5) % 360\nconst colour = oklchToHex({ L: dark ? 65 : 40, C: 55, H: hue })',
      },
      exceptions: [
        'A game with fixed, fictionally meaningful team colours, where the palette carries narrative rather than identity — the deltaE and contrast floors still apply.',
      ],
      verifiedBy: 'join-and-presence-review',
    },
    {
      id: 'multiplayer/colour-is-not-the-only-identity-channel',
      strength: 'should',
      statement:
        'Pair every player colour with a second identity channel — a fixed roster position, an initial, or a distinct token shape — and hold the colour slot for the session and for a grace period after a dropout.',
      evidence: {
        rationale:
          'Deuteranopia compresses the red-green axis, so two hues that are 60 degrees apart on paper can be indistinguishable in use, and a palette that clears deltaE 15 in normal vision may not clear it under simulation. Recycling a slot immediately after a dropout is worse still: the same colour comes to mean two different people inside a minute, which breaks the association the player spent the session building.',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<span class="token" style="background: var(--p3)"></span>',
        good: '<span class="token" style="background: var(--p3)" aria-label="Priya">PR</span>',
      },
      verifiedBy: 'join-and-presence-review',
    },
    {
      id: 'multiplayer/guard-on-missing-runtime',
      strength: 'must',
      statement:
        "Open every game script with a guard that returns when SharkyNet is undefined: async function init(){ if(typeof SharkyNet==='undefined') return; } init().",
      evidence: {
        rationale:
          'The runtime is injected by the host page, so it is absent whenever the file is opened directly, served from a local static server, or loaded before injection completes. Without the guard the script throws on its first call and takes the rest of the page with it, so the failure presents as a blank game rather than as a missing runtime.',
        confidence: 'established',
      },
      examples: {
        language: 'javascript',
        bad: 'const net = await SharkyNet.ready()',
        good: "async function init() {\n  if (typeof SharkyNet === 'undefined') return\n  const net = await SharkyNet.ready()\n}\ninit()",
      },
      verifiedBy: 'build-and-publish-review',
    },
    {
      id: 'multiplayer/vendor-libraries-inline',
      strength: 'must',
      statement:
        'Declare third-party libraries as /*__VENDOR:lib-version.global.min__*/ build comments so they are inlined, rather than fetching them from a CDN at runtime.',
      evidence: {
        rationale:
          'The published artefact is a single self-contained HTML file, and a CDN fetch reintroduces a runtime dependency on someone else’s availability, TLS chain, and cache headers. When it fails the game does not degrade — it does not start, and it does so for reasons no one on the room can diagnose. Inlining at build time makes the shipped file the whole game.',
        confidence: 'established',
      },
      examples: {
        language: 'html',
        bad: '<script src="https://cdn.example.com/three@0.160.0/three.min.js"></script>',
        good: '<script>/*__VENDOR:three-0.160.0.global.min__*/</script>',
      },
      verifiedBy: 'build-and-publish-review',
    },
  ],

  verification: [
    {
      id: 'sync-and-authority-review',
      kind: 'self-review',
      description:
        'Confirm that every input is echoed locally, reconciled in server order, and routed to a channel matching its durability.',
      blocking: true,
      questions: [
        'Does every input draw its effect locally before net.send(), and is the authoritative operation re-applied in seq order rather than stacked on top of the prediction?',
        'Are the local echo and the server confirmation two visually distinct states, so a rejected or reordered move can be shown?',
        'List every op the game sends. For each, does losing it leave two clients disagreeing about the outcome — and if so, is it on sendReliable or claim rather than the 15 ops/s bus?',
        'Can a client that joins after the first op render a complete world from setShared() alone, within the 128-key and 4 KB-per-key limits?',
        'Is anything contested being predicted locally, where a wrong prediction would make the correction the dominant experience?',
      ],
    },
    {
      id: 'join-and-presence-review',
      kind: 'self-review',
      description:
        'Confirm that arrival, absence, and identity are legible to both the joiner and the players already in the room.',
      blocking: true,
      questions: [
        'Open a real second tab in incognito against a session already in progress: within 3 seconds of the first players() update, can that client state what is happening, what role it has, and what to do next?',
        'Is the catch-up phase rendered in a muted palette and the live phase in full colour, with a visible 200–300 ms transition at the phase boundary?',
        'Does a quality().tier change away from good appear in the UI within 2 seconds, inline rather than as a modal, and does disconnection freeze the world rather than continuing to simulate it?',
        'Are player colours computed from the golden-angle formula, and do adjacent slots clear deltaE 15 and 3:1 contrast under a colour-blindness simulation?',
        'Does every player token carry a non-colour identity channel, and is a departed player’s slot held for a stated grace period before it can be reused?',
      ],
    },
    {
      id: 'build-and-publish-review',
      kind: 'self-review',
      description:
        'Confirm the single-file artefact is self-contained, guarded, responsive, and verified against a live room.',
      questions: [
        'Is every game script guarded against an undefined SharkyNet, and does the page still render its title and layout when the runtime never arrives?',
        'Does the published file contain any CDN fetch, or are all libraries inlined through __VENDOR build comments?',
        'Does every animation have a prefers-reduced-motion branch that collapses to opacity rather than to nothing, and has it been exercised in DevTools?',
        'Has the filmstrip been checked at 390×844 and 1280×800 with touch targets of at least 44×44 px?',
        'Do playtest-gate.ts --two-client and, after publishing, room-test.ts --game-id both pass — and do --min-players and --max-players match what the game logic actually tolerates?',
      ],
    },
  ],

  relatedSkills: [
    'vishwakarma-studios',
    '3d-game-assets',
    'colour-systems',
    'motion-design',
    'interface-states',
  ],
}
