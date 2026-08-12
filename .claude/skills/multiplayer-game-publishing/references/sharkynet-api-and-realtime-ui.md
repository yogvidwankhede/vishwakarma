# SharkyNet API surface, the build and publish pipeline, and real-time UI design

## 1. The API surface

```js
const net = await SharkyNet.ready()
net.me()              // { id, isHost, room }
net.players()         // active roster
net.quality()         // { tier, rttMs, updateAgeMs }
net.send(op)          // throttled bus, <=15 ops/s
net.sendReliable(op)  // guaranteed delivery
net.claim(op, cb)     // sendReliable + log-receipt callback
net.on('op', (op, meta) => {})   // meta: { seq, uid, self, replayed, staleMs }
net.setShared(k, v)   // shared KV, <=128 keys, <=4 KB each
```

`SharkyNet.ready()` resolves once the runtime has a room and an identity, which is the earliest
moment any of the other calls mean anything. Everything before it — layout, asset load, the title
card — should already be on screen, because `ready()` is a network wait and a blank page during
a network wait is indistinguishable from a broken page.

`me()` returns the local identity and, critically, `isHost`. Host is a role, not a privilege
tier you should build a second interface around; use it to decide who runs any tie-breaking logic
that must run exactly once, and design so that the host leaving is a re-election rather than an
end of session.

`players()` is the roster, and it is the only honest source for "who is here". Deriving presence
from "who has sent an op recently" produces a roster that quietly loses anyone who is thinking.

`quality()` returns `tier`, `rttMs` and `updateAgeMs`. `updateAgeMs` is the one to watch:
`rttMs` describes the last successful exchange, while `updateAgeMs` describes how long it has
been since anything arrived at all, which is the number that rises during an actual dropout.

### Choosing a channel

| Channel | Guarantee | Use for |
|---|---|---|
| `net.send` | throttled, ≤15 ops/s, lossy under pressure | position, aim, cursor, typing indicators, anything the next message supersedes |
| `net.sendReliable` | guaranteed delivery | phase changes, score, game-over, joins and leaves, anything the outcome depends on |
| `net.claim` | reliable plus a log-receipt callback | contested actions where the caller needs to know the claim landed and in what order |
| `net.setShared` | shared KV, ≤128 keys, ≤4 KB each | state a late joiner must be able to read: room config, current phase, cumulative scores |

The distinction that matters is **supersession**. If the next message makes this one irrelevant,
the bus is correct and dropping it costs nothing. If losing this message leaves two clients
believing different things about the outcome, it belongs on the reliable path. A dropped cursor
frame is invisible; a dropped "round over" leaves half the room playing a game that has ended.

The bus is throttled at 15 ops per second, which is roughly one op every four frames at 60 fps.
Sample continuous input at that rate rather than per frame, and interpolate between the samples
you receive rather than snapping to each one.

### The receive callback

```js
net.on('op', (op, meta) => {
  // meta: { seq, uid, self, replayed, staleMs }
})
```

`seq` is the authoritative ordering, and it is the only ordering. `uid` identifies the sender.
`self` is true for your own operation coming back, which is what closes the reconciliation loop.
`replayed` marks an operation delivered out of its original real-time position — do not fire
sound, haptics, or celebratory motion on a replayed op, because the player has already moved on
and a delayed cheer reads as a bug. `staleMs` is the age of the operation on arrival; use it to
decide whether to animate the change or to apply it instantly, since animating a 900 ms-old event
over 300 ms puts the interface further behind reality than it already is.

## 2. Build, playtest, publish

```bash
# 1. Write: a single game.html, everything inline.

# 2. Build
bun <skill>/scripts/build.ts --game game.html --title "T" \
  --min-players 2 --max-players 8 --out dist/index.html

# 3. Test
bun <skill>/scripts/playtest-gate.ts --html dist/index.html --two-client

# 4. Dev
bun <skill>/scripts/dev-serve.ts --html dist/index.html

# 5. Publish
bun <skill>/scripts/publish.ts --html dist/index.html --title "T" \
  --min-players 2 --max-players 8 --cover-description "..."

# 6. Verify
bun <skill>/scripts/room-test.ts --game-id <id>
```

The build step inlines the vendored libraries marked by
`/*__VENDOR:lib-version.global.min__*/` comments and stamps the player-count metadata that the
lobby uses to decide when a room can start. That metadata is why `--min-players` and
`--max-players` must match what the game logic actually tolerates: a game that needs three
players to be playable but declares a minimum of two will start into an unplayable state and the
players will read that as a bug in the game rather than in its manifest.

`playtest-gate.ts --two-client` drives two clients against one room and fails the seam cases —
the ones that only exist because there are two of them. Passing it is necessary and not
sufficient; a real second browser tab, ideally an incognito one so it carries a different
identity, is still the check that finds the join-in-progress defects, because a mock room starts
empty and the interesting case starts full.

`room-test.ts` runs after publish against the live game id. Publishing is externally visible, so
treat the room test as the confirmation that what shipped is what was built rather than as an
optional extra.

## 3. Local echo and reconciliation

The loop has three parts and all three are required.

**Predict.** On input, apply the effect to local state immediately and draw it on the same frame.
Tag it with a client-side sequence number so you can find it later.

**Send.** Emit the operation on the appropriate channel with that tag attached.

**Reconcile.** When `net.on('op')` delivers the operation with `self === true`, discard the
prediction and re-apply the authoritative version in `seq` order along with everything else that
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
that makes players anxious about a connection that is fine. Above it, an explicit `rttMs`
readout converts a vague feeling of sluggishness into a fact about the network, which players
accept far more readily than a game that seems arbitrarily unresponsive.

Degrade in one direction only. When `tier` drops, increase interpolation and reduce prediction —
do not do the reverse, because a worse connection is exactly when predictions are most likely to
be wrong and corrections most likely to be violent.

## 5. Join-in-progress

Within 3 seconds of the first `players()` update, a joiner must be able to answer three
questions: *what is happening*, *what am I*, and *what do I do next*.

Read the world from `setShared()` first and render it in the catch-up register — the muted
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

**Degraded** — `tier` off `'good'`, or `updateAgeMs` climbing. Surface within 2 seconds: an
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

```
hue    = (30 + N * 137.5) mod 360      // N = player slot index, 0-based
chroma = 55
L      = 65 on dark surfaces, 40 on light
```

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

- `@vishwakarma/motion` — `resolveMotion('enter')` for room-join, `resolveMotion('respond')`
  for echo feedback.
- `@vishwakarma/core` — `oklchToHex()` with the golden-angle formula for player colours, and
  `checkContrast()` for the 3:1 floor.
- `@vishwakarma/audit` — `extractMeasurements()` on filmstrip screenshots for CI.
- `@vishwakarma/three` — combine with the 3D game assets skill for GLB plus multiplayer.

## Pass conditions

- Local echo fires before `net.send()`, and the authoritative op is re-applied in `seq` order
  without double-counting the prediction.
- The echo and the server confirmation are visually distinct states.
- `sendReliable` or `claim` carries every phase, score, and game-over event; the bus carries
  only supersedable state.
- Persistent room state lives in `setShared()`, and a late joiner renders a complete world from
  it before any bus traffic is applied.
- A `quality().tier` change off `'good'` is visible within 2 seconds, non-modally.
- Disconnection freezes the world; reconnection is bounded and visibly counted; recovery states
  what was missed.
- The join flow has been tested in a real second tab, incognito, against a session already in
  progress — not only against a mock room.
- Player colours follow the golden-angle formula, clear deltaE 15 between adjacent slots and 3:1
  contrast, survive a colour-blindness simulation, and are paired with a non-colour channel.
- Colour slots are held for the session and for a grace period after a dropout.
- Every game script is guarded against an undefined `SharkyNet`.
- Libraries are vendored by build comment; no CDN fetch appears in the published file.
- Every animation has a `prefers-reduced-motion` branch that collapses to opacity rather than to
  nothing, verified in DevTools.
- The filmstrip has been checked at 390×844 and 1280×800, with 44×44 px minimum targets.
- `playtest-gate.ts --two-client` passes, and `room-test.ts` passes against the published id.
