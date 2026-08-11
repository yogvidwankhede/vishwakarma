# 3D Game Assets

**Vishwakarma skill — Design intelligence for AI-generated GLB assets in browser games.**

Produces game-ready `.glb` models that read as a coherent visual system rather than a collection of unrelated generated objects. Applies the Vishwakarma Design Contract to 3D asset quality: orientation verification, visual language consistency, material palette, and animation integration via `@vishwakarma/three`.

Connects to the remote asset generation service (no local GPU required). Free for non-commercial use; commercial use requires prior written permission from the service provider.

---

## Design Contract — Asset Layer

An asset set passes the contract when all five sections below are satisfied. Orientation failures are errors; visual-language violations are warnings.

### Orientation Verification (error if absent)

Every direction-sensitive asset (player, NPC, enemy, vehicle) must have its native forward axis independently verified before integration. Record the result in `asset_manifest.json` under `asset.orientation` with fields: `nativeForwardAxis`, `calibrationYawDegrees`, `auditMethod`, `contentHash`.

**Mechanism:** AI-generated models have no universal forward-axis convention. An unverified character that visually faces +Z but semantically expects −Z will move sideways or backwards when driven by standard game code. This failure is invisible in static preview but immediately apparent in motion. Calibration must be a separate, evidence-carrying step — not an assumption.

**Verification states (in order of confidence):**
- `UNVERIFIED` — not yet checked
- `AXIS_AUDITED` — geometry and bones inspected; forward axis recorded
- `MATH_VERIFIED` — movement equations verified against recorded axis
- `VISUALLY_VERIFIED` — rendered motion confirmed against velocity vector
- `ACCEPTED` — all three methods agree; safe to ship

Never advance an asset past `AXIS_AUDITED` using mathematical reasoning alone. A character can be mathematically consistent with the wrong axis. Visual verification against actual movement is required.

### Visual Language Consistency (warning if violated)

All assets in a game must share a coherent visual grammar: matching polygon density tier, consistent material complexity (e.g. all PBR or all flat-shaded — not mixed), and a unified silhouette readability distance.

**Mechanism:** Players compare assets against each other, not against an external standard. An enemy with 8k polygons and a PBR metallic shader placed next to a 500-polygon flat-shaded collectible breaks the fictional reality of the game world. Viewers accept low-fidelity worlds; they reject internally inconsistent ones.

**Asset tier declaration (choose one per game):**

| Tier | Poly budget (character) | Poly budget (prop) | Material |
|------|------------------------|-------------------|----------|
| Minimal | 500–1 500 | 100–500 | Flat/vertex colour |
| Standard | 2 000–5 000 | 500–1 500 | PBR, 1 texture |
| Detailed | 5 000–12 000 | 1 500–4 000 | PBR, 2+ textures |

Declare the tier in `asset_manifest.json` under `visualLanguage.tier`. Generation prompts should include the tier label.

### Material Palette (warning if violated)

Asset surface colours must be drawn from a shared OKLCh palette defined in `asset_manifest.json` under `visualLanguage.palette`. Chroma values should differ between asset categories (player: high, enemies: mid, environment: low) to create hierarchy. Raw hex literals in generation prompts are discouraged; describe by hue and role instead.

**Mechanism:** AI generation services interpret colour descriptions contextually. A character described as "deep teal with high chroma armour" produces more consistent results across multiple generation calls than `#0f766e`, because the model applies perceptual reasoning rather than colour-matching. OKLCh palette anchors ensure all assets remain within the same perceptual gamut without requiring identical colours.

**Hierarchy formula:**
```
Player:      L 55, C 70, H [primary brand hue]
Enemies:     L 45, C 50, H [complementary hue ±150°]
Environment: L 35, C 20, H [analogous hue ±30°]
Collectibles: L 80, C 80, H [accent hue ±90°]  // high lightness = immediate readability
```

### Silhouette Readability (warning if violated)

Each character asset's silhouette must be distinguishable from every other character class at the game's minimum legible display size (typically 64 × 64 px screen area). Test by rendering the asset as a filled silhouette and comparing to other character silhouettes side by side.

**Mechanism:** In fast gameplay, players read silhouette before colour and before detail. Two enemies with similar body proportions but different surface treatments are indistinguishable at speed. Shape differentiation (tall/wide/compact, spiky/smooth/boxy) carries more functional information than material variation.

### Animation Continuity (warning if violated)

Character animation states must share a single `THREE.AnimationMixer` on the root object. Clips must cross-fade, not cut. Idle-to-walk transitions must complete within 200 ms. Death/exit animations must allow completion before the asset is removed from the scene.

**Mechanism:** Separate mixers per clip produce simultaneous conflicting pose data on the same skeleton. Cross-fading preserves skeletal continuity; cuts produce a single-frame pose snap visible to players even at 60 fps.

---

## Asset Generation Workflow

### 1. Declare the manifest

Create `asset_manifest.json` before making any generation call. Declare the visual language tier and palette. Define each asset slot with a semantic name and description.

```json
{
  "visualLanguage": {
    "tier": "standard",
    "palette": {
      "player": { "L": 55, "C": 70, "H": 185 },
      "enemy":  { "L": 45, "C": 50, "H": 335 },
      "env":    { "L": 35, "C": 20, "H": 200 }
    }
  },
  "bindings": {
    "player-character": null,
    "enemy-drone": null,
    "health-pickup": null
  },
  "actions": {}
}
```

### 2. Choose a generation route

**Tripo route** — text prompt → GLB. Best for props, collectibles, and environmental objects where visual control is less critical. Delivers static GLB without animation infrastructure.

**Gemini + Tripo route** — text prompt → white-background reference image → GLB. Required for characters and creatures. Reference image controls shape, proportion, and silhouette before committing to 3D conversion. Characters from this route automatically include a walk animation clip.

**When to use each:**
- Enemies, players, NPCs, bosses → Gemini + Tripo
- Weapons, tools, chests, props, rocks, trees → Tripo
- Architectural elements → Either, depending on visual complexity

### 3. Write generation prompts

Prompts follow this structure:

```
[Role/category] [silhouette shape] [tier-consistent detail level]
[primary surface: OKLCh description, not hex]
[key distinguishing feature for silhouette readability]
[polygon budget from tier declaration]
[prohibited: copyrighted characters, brands, logos, celebrity likenesses]
```

Example:
```
Enemy scout drone. Compact disc shape, wide and flat.
Standard polygon budget, single PBR texture.
Dark teal metallic hull, high-chroma red sensor ring.
Distinctive flat profile readable at 64 px screen size.
Approximately 2000 polygons. No real-world brand references.
```

Generate 1–5 character/creature models per batch on the Gemini+Tripo route, 3–10 props on the Tripo route. Larger batches split across multiple calls.

### 4. Verify orientation (characters only)

For every direction-sensitive asset, run the orientation audit before any gameplay integration:

1. Load the GLB in an isolated turntable viewer (the service provides `/regeneration.html?audit=<id>`)
2. Inspect the geometry and bone hierarchy — record what the model's geometry faces in world space at zero rotation
3. Apply test movement along +X, −X, +Z, −Z and record which direction the model faces for each
4. Record in `asset_manifest.json`:
   ```json
   "orientation": {
     "nativeForwardAxis": "+Z",
     "calibrationYawDegrees": 0,
     "auditMethod": "turntable-visual + movement-test",
     "contentHash": "<sha256 of the GLB file>",
     "state": "VISUALLY_VERIFIED"
   }
   ```
5. Apply `calibrationYawDegrees` as a single Y-axis rotation on the visual child mesh — never on the physics/collision root.

### 5. Integrate into Three.js / React Three Fiber

**Character with animation clips:**

```js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'

const loader = new GLTFLoader()

// Load main character model
const gltf = await loader.loadAsync(manifest.actions['player-character'].model.url)
const character = gltf.scene

// Apply calibration rotation on visual child, not root
const visual = character.getObjectByName('visual') ?? character
visual.rotation.y = THREE.MathUtils.degToRad(manifest.actions['player-character'].orientation.calibrationYawDegrees)

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

**Using `@vishwakarma/three` helpers:**

```js
import { useGLTF, useMixedAnimation } from '@vishwakarma/three'

// Loads, normalises, and applies calibration from manifest automatically
const { scene, mixer } = useGLTF(manifest, 'player-character')
const { transition } = useMixedAnimation(mixer, { crossFadeDuration: 0.2 })

// Trigger state change with cross-fade
transition('walk')   // → Motion Grammar 'respond' intent, 60–120 ms ease-out
transition('idle')
```

### 6. Keep primitives as fallback

Define simple Three.js geometry that renders when a GLB fails to load. The fallback must share the asset's OKLCh palette colour and approximate silhouette.

```js
const fallback = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.4, 1.2),
  new THREE.MeshStandardMaterial({ color: oklchToHex(manifest.visualLanguage.palette.player) })
)
```

**Mechanism:** Remote GLB fetches can fail in low-connectivity environments. A visible fallback lets the game remain playable while the asset retries, rather than rendering an invisible entity with full collision.

---

## Asset Manifest — Canonical Structure

`asset_manifest.json` is the single source of truth. Runtime code resolves assets by manifest fields, never by guessing file paths.

```json
{
  "visualLanguage": {
    "tier": "standard",
    "palette": { ... }
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

Never hardcode asset URLs in game logic. Always read from `manifest.actions[slotName].model.url`.

---

## Self-Review Checklist

- [ ] `asset_manifest.json` created before any generation call
- [ ] Visual language tier declared; all assets in same tier
- [ ] Character assets used Gemini+Tripo route (not Tripo-only)
- [ ] Orientation state is `VISUALLY_VERIFIED` or `ACCEPTED` for every direction-sensitive asset
- [ ] Calibration rotation applied to visual child, not collision root
- [ ] Single `AnimationMixer` per character; clips cross-fade, not cut
- [ ] Fallback primitive geometry defined for every GLB asset
- [ ] Silhouette test run at 64 × 64 px screen size — all character classes distinguishable
- [ ] Player, enemy, and collectible colours pass 3:1 contrast against game background
- [ ] `contentHash` in `asset.orientation` matches the actual GLB file (re-verify after any regeneration)
- [ ] No copyrighted characters, brand logos, or celebrity likenesses in any generation prompt
- [ ] Generation service URL confirmed as `https://studio.13-216-49-19.sslip.io` — no credentials stored in code

---

## Motion Grammar Integration

Apply Motion Grammar intents to asset state transitions. These govern how assets appear/disappear, not just character animations:

| Game event | Motion Grammar intent | Duration | Curve |
|---|---|---|---|
| Asset spawns in scene | `enter` | 200–300 ms | decelerate |
| Asset removed from scene | `exit` | 120–180 ms | accelerate |
| Character takes damage | `reject` | 350 ms, 2 cycles | shake |
| Collectible picked up | `affirm` | 300–400 ms | overshoot |
| NPC draws attention | `attract` | ≤500 ms, 3 cycles | pulse |
| Long asset load in progress | `occupy` | looping | linear |

All transitions respect `prefers-reduced-motion`: collapse to opacity-only, preserve semantic clarity.

---

## Vishwakarma Package Integration

- **`@vishwakarma/three`** — `useGLTF()` resolves assets from manifest and applies orientation calibration; `useMixedAnimation()` manages cross-fades; `useInstancedGLB()` for crowds or particle-like asset groups.
- **`@vishwakarma/motion`** — `resolveMotion('enter')` for spawn transitions; `resolveMotion('affirm')` for collectible pickups. Keeps asset animations in Motion Grammar timing without per-asset tuning.
- **`@vishwakarma/core`** — `oklchToHex()` converts manifest palette entries to CSS/Three.js compatible hex for fallback geometry and UI colour synchronisation.
- **`@vishwakarma/audit`** — `checkContrast()` verifies asset palette colours against game background; flag results in CI before build.
- **`@vishwakarma/tokens`** — Export game palette as design tokens so UI elements (HUD, score, health bars) share the same colour vocabulary as the 3D assets.

---

## Licensing

This skill is free for non-commercial use. If you use the remote asset generation service in a commercial project, contact the service provider for written permission before shipping.
