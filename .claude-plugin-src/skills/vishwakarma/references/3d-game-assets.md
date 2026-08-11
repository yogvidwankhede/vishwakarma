<!--
  Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
  SPDX-License-Identifier: Apache-2.0
-->

# 3D Game Assets

Vishwakarma skill — Design intelligence for AI-generated GLB assets in browser games.
Produces assets that read as a coherent visual system. Applies the Design Contract to
3D quality: orientation verification, visual language, material palette, animation.

Free for non-commercial use. Commercial use requires prior written permission.

## Design Contract — Asset Layer

### Orientation Verification (error if absent)
Every direction-sensitive asset must have its forward axis independently verified.
Record in asset_manifest.json under asset.orientation:
  nativeForwardAxis, calibrationYawDegrees, auditMethod, contentHash, state

States (in order): UNVERIFIED -> AXIS_AUDITED -> MATH_VERIFIED -> VISUALLY_VERIFIED -> ACCEPTED
Never advance past AXIS_AUDITED from maths alone. Visual movement test is required.

### Visual Language Consistency (warning if violated)
All assets share one polygon tier, one material approach, one silhouette distance.
Tier table (declare in asset_manifest.json under visualLanguage.tier):
  Minimal:  500-1500 chars / 100-500 props / Flat colour
  Standard: 2000-5000 / 500-1500 / PBR 1 texture
  Detailed: 5000-12000 / 1500-4000 / PBR 2+ textures

### Material Palette (warning if violated)
OKLCh hierarchy:
  Player:       L 55  C 70  H [primary hue]
  Enemies:      L 45  C 50  H [complementary +/-150]
  Environment:  L 35  C 20  H [analogous +/-30]
  Collectibles: L 80  C 80  H [accent +/-90]
Describe by hue+role in prompts, not raw hex.

### Silhouette Readability (warning if violated)
Each character class must be distinguishable as a filled silhouette at 64x64 px.

### Animation Continuity (warning if violated)
One THREE.AnimationMixer per character root. Clips cross-fade (never cut).
Idle-to-walk <= 200 ms. Death animation plays to completion before removal.

## Generation Workflow

1. Declare asset_manifest.json with visualLanguage.tier, palette, and empty bindings.
2. Route selection:
   - Characters/enemies/NPCs -> Gemini+Tripo (reference image -> GLB, includes walk clip)
   - Props/collectibles/environment -> Tripo (text -> GLB, static)
3. Prompt structure: [Role] [silhouette] [tier detail] [OKLCh description] [poly budget] [no IP]
4. Orientation audit (characters only):
   a. Load in /regeneration.html?audit=<id> turntable
   b. Inspect geometry/bones for native forward axis
   c. Test movement +X/-X/+Z/-Z; record facing per direction
   d. Write to manifest.actions[slot].orientation
   e. Apply calibrationYawDegrees on visual child mesh only, never collision root

## Three.js Integration

  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(manifest.actions['player'].model.url)
  const character = gltf.scene
  const visual = character.getObjectByName('visual') ?? character
  visual.rotation.y = THREE.MathUtils.degToRad(
    manifest.actions['player'].orientation.calibrationYawDegrees
  )
  scene.add(character)
  const mixer = new THREE.AnimationMixer(character)  // one mixer on root
  const walkGltf = await loader.loadAsync(manifest.actions['player'].clips.walk)
  mixer.clipAction(walkGltf.animations[0]).play()
  // game loop: mixer.update(delta)

Using @vishwakarma/three:
  const { scene, mixer } = useGLTF(manifest, 'player')
  const { transition } = useMixedAnimation(mixer, { crossFadeDuration: 0.2 })
  transition('walk')

Always define a fallback primitive sharing the asset's OKLCh colour + approximate silhouette.

## asset_manifest.json Structure

  {
    "visualLanguage": { "tier": "standard", "palette": { ... } },
    "bindings": { "player": "asset-id-123" },
    "actions": {
      "player": {
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

Never hardcode asset URLs. Always read from manifest.actions[slot].model.url.

## Motion Grammar Integration

  Asset spawns   -> enter   200-300 ms decelerate
  Asset removed  -> exit    120-180 ms accelerate
  Takes damage   -> reject  350 ms 2-cycle shake
  Pickup         -> affirm  300-400 ms overshoot
  NPC attention  -> attract <=500 ms 3-cycle pulse
  Loading        -> occupy  looping linear

All transitions respect prefers-reduced-motion (opacity-only fallback).

## Self-Review Checklist

- [ ] asset_manifest.json created before any generation call
- [ ] All assets in same visual language tier
- [ ] Characters used Gemini+Tripo route
- [ ] Orientation state VISUALLY_VERIFIED or ACCEPTED for all direction-sensitive assets
- [ ] Calibration applied to visual child, not collision root
- [ ] Single AnimationMixer per character; cross-fade not cut
- [ ] Fallback primitive defined for every GLB
- [ ] Silhouette test at 64 px — all classes distinguishable
- [ ] Colours pass 3:1 contrast against game background
- [ ] contentHash re-verified after any regeneration
- [ ] No copyrighted characters, brands, or celebrity likenesses in any prompt

## Vishwakarma Integration

- @vishwakarma/three   useGLTF() with manifest + orientation; useMixedAnimation() cross-fades
- @vishwakarma/motion  resolveMotion('enter') spawns; resolveMotion('affirm') pickups
- @vishwakarma/core    oklchToHex() for fallback geometry and HUD colour sync
- @vishwakarma/audit   checkContrast() in CI against game background
- @vishwakarma/tokens  export game palette as tokens for HUD/3D colour vocabulary
