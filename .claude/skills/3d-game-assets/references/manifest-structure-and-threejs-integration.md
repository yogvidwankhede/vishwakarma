# Manifest structure, Three.js integration, fallbacks, and Motion Grammar

## 1. The manifest is the single source of truth

`asset_manifest.json` is the only place runtime code learns where an asset lives, what clips it
has, and how it is calibrated. Resolve assets by manifest field, never by guessing a file path.

```json
{
  "visualLanguage": {
    "tier": "standard",
    "palette": { }
  },
  "bindings": {
    "player-character": "asset-id-abc123",
    "enemy-drone": "asset-id-def456"
  },
  "actions": {
    "player-character": {
      "model": { "url": "https://..." },
      "clips": { "walk": "https://..." },
      "orientation": {
        "nativeForwardAxis": "+Z",
        "calibrationYawDegrees": 0,
        "auditMethod": "turntable-visual + movement-test",
        "contentHash": "sha256:...",
        "state": "VISUALLY_VERIFIED"
      }
    }
  }
}
```

Never hardcode asset URLs in game logic. Always read from
`manifest.actions[slotName].model.url`. Three things depend on that indirection: regenerating an
asset changes its URL and must not require a code change; the calibration yaw and the verification
state travel with the URL, so code that hardcodes the URL silently loses them; and `bindings`
lets one slot be swapped for a different asset id without touching the scene graph.

`bindings` maps semantic slot to asset id; `actions` holds the resolved payload for each slot.
Game code addresses slots, and only the manifest knows which asset is currently in one.

## 2. Character with animation clips

```js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'

const loader = new GLTFLoader()

// Load main character model
const gltf = await loader.loadAsync(manifest.actions['player-character'].model.url)
const character = gltf.scene

// Apply calibration rotation on visual child, not root
const visual = character.getObjectByName('visual') ?? character
visual.rotation.y = THREE.MathUtils.degToRad(
  manifest.actions['player-character'].orientation.calibrationYawDegrees
)

scene.add(character)

// One mixer on root — never on visual child
const mixer = new THREE.AnimationMixer(character)

// Load walk clip separately (do not add its scene to game)
const walkGltf = await loader.loadAsync(manifest.actions['player-character'].clips.walk)
const walkClip = walkGltf.animations[0]
const walkAction = mixer.clipAction(walkClip)

// Cross-fade, never cut
walkAction.play()

// In game loop:
mixer.update(delta)
```

Three details in that listing are load-bearing.

**The mixer goes on the character root, not on the visual child.** The mixer resolves clip tracks
against the object it was constructed with, so a mixer rooted on the calibrated child resolves
against a subtree that has an extra rotation baked into it, and every bone track arrives rotated.
One mixer per character, on the root, also prevents the failure the contract names: two mixers
driving the same skeleton write conflicting pose data on the same frame, and the winner is
whichever ran last.

**The clip GLB's scene is never added to the game.** A clip file is a carrier for
`animations[0]`; adding its scene puts a second copy of the character in the world, usually at
the origin, usually T-posed.

**Transitions cross-fade.** `crossFadeTo` or paired `fadeIn`/`fadeOut` over roughly 200 ms
blends the two poses through the interval; a cut swaps skeletal poses between consecutive frames,
which is a discontinuity the eye catches at 60 fps because it violates the velocity continuity
every other frame of the animation established.

## 3. Using `@vishwakarma/three` helpers

```js
import { useGLTF, useMixedAnimation } from '@vishwakarma/three'

// Loads, normalises, and applies calibration from manifest automatically
const { scene, mixer } = useGLTF(manifest, 'player-character')
const { transition } = useMixedAnimation(mixer, { crossFadeDuration: 0.2 })

// Trigger state change with cross-fade
transition('walk')   // → Motion Grammar 'respond' intent, 60–120 ms ease-out
transition('idle')
```

`useGLTF()` resolves the asset from the manifest and applies the orientation calibration to the
visual child, so the calibration cannot be forgotten at one call site and applied at another.
`useMixedAnimation()` owns the single mixer and the cross-fade duration.
`useInstancedGLB()` handles crowds and particle-like groups of the same asset.

## 4. Keep primitives as fallback

Define simple Three.js geometry that renders when a GLB fails to load. The fallback shares the
asset's OKLCh palette colour and approximates its silhouette.

```js
const fallback = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.4, 1.2),
  new THREE.MeshStandardMaterial({ color: oklchToHex(manifest.visualLanguage.palette.player) })
)
```

**Mechanism:** Remote GLB fetches can fail in low-connectivity environments. A visible fallback
lets the game remain playable while the asset retries, rather than rendering an invisible entity
with full collision — which is worse than a missing model, because the player collides with
something that is not there and reads it as a physics bug.

Matching the palette colour and the approximate silhouette is what makes the fallback legible as
the entity it stands in for: a capsule in the player's teal is recognisably the player, while a
default white box is an unexplained obstacle.

## 5. Motion Grammar for asset state changes

These govern how assets appear and disappear, not only their character animation clips.

| Game event | Intent | Duration | Curve |
|---|---|---|---|
| Asset spawns in scene | `enter` | 200–300 ms | decelerate |
| Asset removed from scene | `exit` | 120–180 ms | accelerate |
| Character takes damage | `reject` | 350 ms, 2 cycles | shake |
| Collectible picked up | `affirm` | 300–400 ms | overshoot |
| NPC draws attention | `attract` | ≤500 ms, 3 cycles | pulse |
| Long asset load in progress | `occupy` | looping | linear |

All transitions respect `prefers-reduced-motion`: collapse to opacity-only and preserve semantic
clarity. Reduced motion means gentler and fewer, not zero — the spawn still has to be noticed.

## 6. Vishwakarma package integration

- **`@vishwakarma/three`** — `useGLTF()` resolves assets from the manifest and applies
  orientation calibration; `useMixedAnimation()` manages cross-fades; `useInstancedGLB()` for
  crowds or particle-like asset groups.
- **`@vishwakarma/motion`** — `resolveMotion('enter')` for spawn transitions,
  `resolveMotion('affirm')` for collectible pickups. Keeps asset animation in Motion Grammar
  timing without per-asset tuning.
- **`@vishwakarma/core`** — `oklchToHex()` converts manifest palette entries to hex for
  fallback geometry and UI colour synchronisation.
- **`@vishwakarma/audit`** — `checkContrast()` verifies asset palette colours against the game
  background; flag results in CI before build.
- **`@vishwakarma/tokens`** — export the game palette as design tokens so HUD, score, and health
  bars share the colour vocabulary of the 3D assets.

## Pass conditions

- Runtime code resolves every asset through `manifest.actions[slot].model.url`; no GLB URL is
  hardcoded in game logic.
- Exactly one `AnimationMixer` exists per character, constructed on the character root rather
  than on the calibrated visual child.
- Clip GLBs contribute `animations[0]` only; their scenes are never added to the game scene.
- Every animation state change cross-fades over roughly 200 ms; no clip swap is a cut.
- Idle-to-walk completes within 200 ms, and death or exit clips run to completion before the asset
  is removed.
- Every GLB asset has a fallback primitive that shares its palette colour and approximate
  silhouette.
- Silhouettes were compared at 64 × 64 px and every character class is distinguishable.
- Player, enemy, and collectible colours pass 3:1 contrast against the game background.
- Asset spawn, removal, damage, pickup, attention, and loading transitions use the Motion Grammar
  intents and durations above, each with a `prefers-reduced-motion` branch that collapses to
  opacity.
