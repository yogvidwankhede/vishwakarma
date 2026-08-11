# Multiplayer Game Publishing

Vishwakarma skill — Design intelligence for browser-based multiplayer games.
Produces single-file HTML games with real-time multiplayer that feel designed:
coherent join flows, legible sync feedback, Motion Grammar state transitions.
Publishes to sharky.gg via the sharky-online platform.

## Design Contract — Game Layer

### Synchronisation Feedback (error if absent)
Every network event must produce local-echo feedback within one frame, and a
distinct visual confirmation when server ordering arrives.
Mechanism: 400 ms RTT is tolerable only when local echo collapses the gap.

### Join Flow Clarity (error if absent)
Player arriving mid-session must understand state, role, and next action within
3 seconds of first players() update.
Mechanism: Distinguish catch-up phase (muted palette) from live phase (full colour).

### Disconnection Visibility (error if absent)
quality().tier change from 'good' must surface in UI within 2 seconds.
Mechanism: Silent failure produces confusion. Explicit state lets players act.

### Colour System (warning if violated)
Player identity colours: OKLCh, deltaE >= 15 between adjacent slots, 3:1 contrast.
Formula: hue = (30 + N * 137.5) mod 360, Chroma=55, L=65 dark / L=40 light.

### Motion Contract (warning if violated)
Room-join: enter (200-300 ms decelerate). Leave: exit (120-180 ms accelerate).
Score: affirm (300-400 ms overshoot) or reject (350 ms 2-cycle shake).
All motion must respect prefers-reduced-motion — collapse to opacity-only.

### Responsive Layout (warning if violated)
Playable at 390x844 px and 1280x800 px. Touch targets >= 44x44 px.

## Architecture Rules

Rule 1 — Echo every input locally before net.send(). Re-apply in bus order on receipt.
Rule 2 — Use net.sendReliable() or net.claim() for phase/score/game-over events.
Rule 3 — Persistent room state in net.setShared(); ephemeral state on the bus only.
Rule 4 — Guard all game scripts: async function init(){ if(typeof SharkyNet==='undefined') return; } init()
Rule 5 — Vendor libraries as /*__VENDOR:lib-version.global.min__*/ comments, not CDN fetches.

## Build Workflow

1. Write: single game.html, everything inline.
2. Build:  bun <skill>/scripts/build.ts --game game.html --title "T" --min-players 2 --max-players 8 --out dist/index.html
3. Test:   bun <skill>/scripts/playtest-gate.ts --html dist/index.html --two-client
4. Dev:    bun <skill>/scripts/dev-serve.ts --html dist/index.html
5. Publish: bun <skill>/scripts/publish.ts --html dist/index.html --title "T" --min-players 2 --max-players 8 --cover-description "..."
6. Verify: bun <skill>/scripts/room-test.ts --game-id <id>

## SharkyNet API

  const net = await SharkyNet.ready()
  net.me()              // { id, isHost, room }
  net.players()         // active roster
  net.quality()         // { tier, rttMs, updateAgeMs }
  net.send(op)          // throttled bus, <=15 ops/s
  net.sendReliable(op)  // guaranteed delivery
  net.claim(op, cb)     // sendReliable + log-receipt callback
  net.on('op', (op, meta) => {}) // meta: { seq, uid, self, replayed, staleMs }
  net.setShared(k, v)   // shared KV, <=128 keys, <=4 KB each

## Self-Review Checklist

- [ ] Local echo fires before net.send()
- [ ] sendReliable used for phase/score/game-over
- [ ] Disconnection state visible within 2 s
- [ ] Join flow tested incognito mid-session
- [ ] Player colours pass colour-blindness check
- [ ] prefers-reduced-motion tested in DevTools
- [ ] Two-client seam test passes
- [ ] Filmstrip checked at mobile viewport
- [ ] Real second tab tested (not only mock room)

## Vishwakarma Integration

- @vishwakarma/motion  resolveMotion('enter') for room-join; resolveMotion('respond') for echo
- @vishwakarma/core    oklchToHex() + golden-angle formula for player colours; checkContrast()
- @vishwakarma/audit   extractMeasurements() on filmstrip screenshots for CI
- @vishwakarma/three   combine with skill-3d-game-assets for GLB + multiplayer
