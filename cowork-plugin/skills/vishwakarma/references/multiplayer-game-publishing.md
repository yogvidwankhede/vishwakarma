# Multiplayer Game Publishing

The deliverable is one HTML file with everything inline — markup, styles, logic, vendored
libraries — that runs a real-time game for several players and publishes to sharky.gg through
the sharky-online platform. Multiplayer arrives as a `SharkyNet` runtime that the host page
injects, so game code opens with a guard and stays inert when that runtime is absent.

Two mechanisms generate almost every rule below. **The network sits between the hand and the
screen**, so a 400 ms round trip is tolerable only when local echo has already collapsed the gap
and the player is waiting for confirmation rather than for a response. And **a shared session has
no shared view** — each client holds its own slightly stale copy of the world, so any fact the
interface does not state out loud is one each player answers privately and wrongly.

**Scope.** This skill owns the *interface* layer of a networked session: local echo, presence,
connection-quality display, join and rejoin legibility, and publishing to the platform. The
*simulation* layer beneath it — server authority, client prediction and reconciliation, lag
compensation, rollback, tick rate, cheat resistance — belongs to `vishwakarma-studios`. The
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
the first `players()` update. Distinguish the catch-up phase from the live phase with a muted
palette against full colour, so the arriving player can see that what they are looking at is not
yet theirs to act on. A joiner who cannot tell those apart either sits out a phase they could
have played or acts into a phase that has already resolved.

## 3. Disconnection visibility (error if absent)

A `quality().tier` change away from `'good'` must surface in the UI within 2 seconds. Silent
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

State transitions take their timing from Motion Grammar intents. Room-join uses `enter` at 200–300 ms decelerating; a player leaving uses `exit` at 120–180 ms
accelerating. A scored event uses `affirm` at 300–400 ms with overshoot, or `reject` at 350 ms
as a two-cycle shake. All motion honours `prefers-reduced-motion` by collapsing to opacity-only
rather than to nothing, since the state change still has to be legible.

## 6. Responsive layout (warning if violated)

Playable at 390×844 px and at 1280×800 px, with touch targets of at least 44×44 px. Both are
real: the phone is where a link shared into a chat gets opened, and the desktop is where the
second tab is usually opened during testing.

---

## Architecture rules

1. Echo every input locally **before** `net.send()`, and re-apply it in bus order on receipt.
2. Use `net.sendReliable()` or `net.claim()` for phase, score, and game-over events. The
   throttled bus caps at 15 ops per second and drops under pressure, which is survivable for a
   cursor position and fatal for the event that ends the round.
3. Persistent room state goes in `net.setShared()`; ephemeral state stays on the bus only. A
   late joiner reads shared state and receives nothing that was already broadcast.
4. Guard every game script:
   `async function init(){ if(typeof SharkyNet==='undefined') return; } init()`
5. Vendor libraries as `/*__VENDOR:lib-version.global.min__*/` comments rather than CDN fetches,
   so the published file has no third-party runtime dependency and cannot fail on someone else's
   uptime.

---

## Build workflow

Write one `game.html` with everything inline, then run build, playtest-gate, dev-serve, publish
and room-test in that order. The exact invocations, the SharkyNet API surface, and the real-time
UI patterns behind rules 1–3 are in the reference.

## Rules

### MUST — Apply and draw the effect of an input locally in the same frame it arrives, before net.send(), then re-apply the authoritative operation in seq order on receipt.

*Why:* A 400 ms round trip is tolerable only when local echo collapses the gap, because what the player then waits for is confirmation of something already on screen rather than the response itself. Reconciling in seq order rather than trusting the prediction is what keeps the client convergent with the server; skipping the reconcile and stacking the authoritative op on top of the echo double-counts every action.

Incorrect:

```javascript
net.send({ t: 'move', x })
// board updates only when the op comes back
```

Correct:

```javascript
applyLocal({ t: 'move', x, pending: true })   // same frame
net.send({ t: 'move', x })
net.on('op', (op, meta) => { if (meta.self) reconcile(op, meta.seq) })
```

### MUST — Send phase changes, score changes, and game-over events with net.sendReliable() or net.claim(), never on the throttled net.send() bus.

*Why:* The bus caps at 15 ops per second and sheds messages under pressure, which is free for state the next message supersedes and fatal for state it does not. A dropped cursor frame is invisible; a dropped round-over leaves half the room playing a game that has already ended, and the two clients can no longer be reconciled without discarding play.

Incorrect:

```javascript
net.send({ t: 'gameOver', winner })
```

Correct:

```javascript
net.claim({ t: 'gameOver', winner }, (receipt) => showResult(receipt))
```

### MUST — Keep persistent room state in net.setShared() within its 128-key, 4 KB-per-key limits, and keep ephemeral state on the bus only.

*Why:* Bus operations are delivered only to clients connected when they were sent, so a player who joins later receives nothing that already happened. Shared key-value state is the only complete picture available to an arriving or reconnecting client, which makes it the difference between a joiner who can render the world and one who must wait for the next event to infer it.

Incorrect:

```javascript
net.send({ t: 'phase', phase: 'bidding' })   // joiners never learn the phase
```

Correct:

```javascript
net.setShared('phase', 'bidding')
net.sendReliable({ t: 'phase', phase: 'bidding' })
```

### MUST — Surface a quality().tier change away from 'good' in the UI within 2 seconds, using a non-modal indicator rather than a dialogue over the game.

*Why:* A player who cannot see that the connection has degraded attributes the stall to their own input and retries, which adds traffic to a link that is already failing. Explicit state converts an unexplained hang into a fact the player can act on. It stays non-modal because the degradation arrives mid-action, and a dialogue destroys the action the slow connection had only delayed.

Incorrect:

```javascript
setInterval(() => { if (net.quality().tier !== 'good') console.warn('lag') }, 1000)
```

Correct:

```javascript
setInterval(() => {
  const q = net.quality()
  statusEl.dataset.tier = q.tier          // inline, near the affected surface
  statusEl.textContent = q.tier === 'good' ? '' : `Connection ${q.tier} · ${q.rttMs} ms`
}, 500)
```

### MUST — Within 3 seconds of the first players() update, a mid-session joiner must be shown the current state, their own role, and their next action, with catch-up rendered in a muted palette against the live phase in full colour.

*Why:* A joiner has no history and cannot infer a phase from a static board. Without an explicit distinction between catch-up and live they make one of two errors: acting into a phase that has already resolved, or sitting out one they could have played. Rendering catch-up in a muted palette marks the board as not yet theirs, and lifting to full colour on the phase boundary marks the frame at which their input starts to count.

Incorrect:

```javascript
net.on('op', render)   // joiner sees a board with no phase, role, or prompt
```

Correct:

```javascript
renderFromShared(net, { mode: 'catchup' })
announce(`You are ${me.colourName}. Joining at round ${shared.round}.`)
onPhaseBoundary(() => liftToLive(250))
```

### MUST — Compute player colours as hue = (30 + N * 137.5) mod 360 at chroma 55 and L 65 on dark or 40 on light, holding deltaE of at least 15 between adjacent slots and 3:1 contrast against the surface.

*Why:* The 137.5-degree golden-angle step is the rotation least well approximated by a small rational fraction of the circle, so no slot lands near an earlier one and the eighth player stays as separable as the second. Fixing chroma and lightness prevents brightness variation from reading as importance. The deltaE floor is perceptual rather than angular, which matters because high-chroma OKLCh values near the gamut edge can be close in appearance while far apart in hue.

*Exceptions:*
- A game with fixed, fictionally meaningful team colours, where the palette carries narrative rather than identity — the deltaE and contrast floors still apply.

Incorrect:

```javascript
const colours = ['red', 'blue', 'green', 'lime', 'teal']
```

Correct:

```javascript
const hue = (30 + slot * 137.5) % 360
const colour = oklchToHex({ L: dark ? 65 : 40, C: 55, H: hue })
```

### MUST — Open every game script with a guard that returns when SharkyNet is undefined: async function init(){ if(typeof SharkyNet==='undefined') return; } init().

*Why:* The runtime is injected by the host page, so it is absent whenever the file is opened directly, served from a local static server, or loaded before injection completes. Without the guard the script throws on its first call and takes the rest of the page with it, so the failure presents as a blank game rather than as a missing runtime.

Incorrect:

```javascript
const net = await SharkyNet.ready()
```

Correct:

```javascript
async function init() {
  if (typeof SharkyNet === 'undefined') return
  const net = await SharkyNet.ready()
}
init()
```

### MUST — Declare third-party libraries as /*__VENDOR:lib-version.global.min__*/ build comments so they are inlined, rather than fetching them from a CDN at runtime.

*Why:* The published artefact is a single self-contained HTML file, and a CDN fetch reintroduces a runtime dependency on someone else’s availability, TLS chain, and cache headers. When it fails the game does not degrade — it does not start, and it does so for reasons no one on the room can diagnose. Inlining at build time makes the shipped file the whole game.

Incorrect:

```html
<script src="https://cdn.example.com/three@0.160.0/three.min.js"></script>
```

Correct:

```html
<script>/*__VENDOR:three-0.160.0.global.min__*/</script>
```

### SHOULD — Pair every player colour with a second identity channel — a fixed roster position, an initial, or a distinct token shape — and hold the colour slot for the session and for a grace period after a dropout.

*Why:* Deuteranopia compresses the red-green axis, so two hues that are 60 degrees apart on paper can be indistinguishable in use, and a palette that clears deltaE 15 in normal vision may not clear it under simulation. Recycling a slot immediately after a dropout is worse still: the same colour comes to mean two different people inside a minute, which breaks the association the player spent the session building.

Incorrect:

```html
<span class="token" style="background: var(--p3)"></span>
```

Correct:

```html
<span class="token" style="background: var(--p3)" aria-label="Priya">PR</span>
```

## Before reporting completion

Run these checks against your own output. Answer each question explicitly rather than
assuming the answer, because the point of the exercise is to notice what you did not
notice while building.

### Confirm that every input is echoed locally, reconciled in server order, and routed to a channel matching its durability. (blocking)

- Does every input draw its effect locally before net.send(), and is the authoritative operation re-applied in seq order rather than stacked on top of the prediction?
- Are the local echo and the server confirmation two visually distinct states, so a rejected or reordered move can be shown?
- List every op the game sends. For each, does losing it leave two clients disagreeing about the outcome — and if so, is it on sendReliable or claim rather than the 15 ops/s bus?
- Can a client that joins after the first op render a complete world from setShared() alone, within the 128-key and 4 KB-per-key limits?
- Is anything contested being predicted locally, where a wrong prediction would make the correction the dominant experience?

### Confirm that arrival, absence, and identity are legible to both the joiner and the players already in the room. (blocking)

- Open a real second tab in incognito against a session already in progress: within 3 seconds of the first players() update, can that client state what is happening, what role it has, and what to do next?
- Is the catch-up phase rendered in a muted palette and the live phase in full colour, with a visible 200–300 ms transition at the phase boundary?
- Does a quality().tier change away from good appear in the UI within 2 seconds, inline rather than as a modal, and does disconnection freeze the world rather than continuing to simulate it?
- Are player colours computed from the golden-angle formula, and do adjacent slots clear deltaE 15 and 3:1 contrast under a colour-blindness simulation?
- Does every player token carry a non-colour identity channel, and is a departed player’s slot held for a stated grace period before it can be reused?

### Confirm the single-file artefact is self-contained, guarded, responsive, and verified against a live room.

- Is every game script guarded against an undefined SharkyNet, and does the page still render its title and layout when the runtime never arrives?
- Does the published file contain any CDN fetch, or are all libraries inlined through __VENDOR build comments?
- Does every animation have a prefers-reduced-motion branch that collapses to opacity rather than to nothing, and has it been exercised in DevTools?
- Has the filmstrip been checked at 390×844 and 1280×800 with touch targets of at least 44×44 px?
- Do playtest-gate.ts --two-client and, after publishing, room-test.ts --game-id both pass — and do --min-players and --max-players match what the game logic actually tolerates?

## Further reference

These are not loaded by default. Read one only when its question is the question you
currently have.

- `references/sharkynet-api-and-realtime-ui.md` — What does each SharkyNet method do and when should I use it, what are the exact build/playtest/publish commands, and how do I design local echo, reconciliation, latency masking, join-in-progress, reconnection, and player colour assignment?
