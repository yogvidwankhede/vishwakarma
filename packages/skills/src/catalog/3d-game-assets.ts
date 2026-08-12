// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * Generated 3D assets fail in a way that hand-modelled ones do not: they are individually
 * plausible and collectively incoherent, and they lie about which way they are facing.
 *
 * The orientation defect is the expensive one because it is invisible in the medium where assets
 * are reviewed. There is no universal forward-axis convention for a generated mesh, so a character
 * that visually faces +Z while the game code assumes −Z looks perfect in every still preview and
 * moves sideways the moment it is driven by a velocity vector. Nothing about the model is wrong;
 * the assumption about it is. That is why the axis has to be recorded as evidence — audited,
 * checked against the movement equations, and then confirmed against rendered motion — rather than
 * inferred, and why mathematical agreement alone is never sufficient. A model can be perfectly
 * consistent with the wrong axis.
 *
 * The coherence defect is the one players feel without naming. They do not compare an asset to an
 * external standard; they compare it to the asset standing next to it. An 8,000-polygon PBR enemy
 * beside a 500-polygon flat-shaded pickup does not read as one detailed thing and one simple thing
 * — it reads as two different games. Low fidelity is accepted readily and consistently; internal
 * inconsistency is not. This is why a declared tier, a shared OKLCh palette, and a silhouette test
 * at the smallest legible size do more for perceived quality than any amount of per-asset polish.
 *
 * The remaining rules follow from how a skeleton and a scene graph actually work: one mixer per
 * character because two mixers write conflicting pose data to the same bones, a cross-fade rather
 * than a cut because a pose snap is visible at 60 fps, calibration on the visual child because
 * rotating the collision root rotates the physics with it, and a primitive fallback because a
 * remote fetch that fails otherwise leaves an invisible entity with full collision.
 */
export const threeDGameAssets: SkillManifest = {
  vsm: '1.0',
  id: '3d-game-assets',
  name: '3D Game Assets',
  description:
    'Use when generating or integrating GLB assets for a browser game — orientation audits, manifests, Three.js mixers, visual consistency.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'integration',
  tags: ['3d', 'glb', 'threejs', 'gltf', 'games', 'asset-generation'],

  activation: {
    intents: [
      'generating 3D models or GLB assets for a browser game from text prompts or reference images',
      'a generated character moves sideways or backwards when driven by standard movement code',
      'loading a GLB into Three.js or React Three Fiber and wiring its animation clips',
      'the assets in a game look like they came from different games',
      'choosing polygon budgets, material complexity, or a colour palette for a set of game assets',
      'writing or auditing an asset manifest that game code resolves models and clips from',
      'cross-fading between idle, walk, and death animation states on a character',
      'deciding what to render when a remote GLB fails to load',
      'checking whether a generated asset set can be shipped in a commercial project',
    ],
    globs: [
      '**/asset_manifest.json',
      '**/*.glb',
      '**/*.gltf',
      '**/assets/**/*.{js,ts,jsx,tsx}',
      '**/*{Model,Character,Asset,GLTF,GLB}*.{js,ts,jsx,tsx}',
    ],
    keywords: [
      'glb',
      'gltf',
      'three.js',
      'react three fiber',
      'animationmixer',
      'crossfade',
      'asset manifest',
      'orientation',
      'forward axis',
      'tripo',
      'silhouette',
      'poly budget',
      'turntable',
      'generate 3d model',
    ],
  },

  content: {
    summary:
      'Use when generating or integrating GLB assets for a browser game: verify each direction-sensitive asset’s forward axis before accepting it, resolve everything through an asset manifest, and hold one visual tier and OKLCh palette across the whole set.',

    body: `# 3D Game Assets

Design intelligence for AI-generated GLB assets in browser games. The goal is a set of
game-ready \`.glb\` models that read as a coherent visual system rather than a collection of
unrelated generated objects: orientation verified, visual language consistent, material palette
shared, and animation integrated through \`@vishwakarma/three\`.

Generation runs against a remote asset generation service, so no local GPU is required. **This
skill is free for non-commercial use. If you use the remote asset generation service in a
commercial project, contact the service provider for written permission before shipping.** That
is a third-party service term and is separate from the Apache-2.0 licence on this skill; check it
before a commercial release, not after.

An asset set passes the contract when all five sections below are satisfied. Orientation failures
are errors; visual-language violations are warnings.

---

## 1. Orientation verification (error if absent)

Every direction-sensitive asset — player, NPC, enemy, vehicle — must have its native forward axis
independently verified before integration, recorded in \`asset_manifest.json\` under
\`asset.orientation\` with \`nativeForwardAxis\`, \`calibrationYawDegrees\`, \`auditMethod\` and
\`contentHash\`.

**Mechanism.** Generated models have no universal forward-axis convention. A character that
visually faces +Z while the game code expects −Z will move sideways or backwards under standard
movement code. The defect is invisible in a static preview and immediate in motion, so
calibration has to be a separate, evidence-carrying step rather than an assumption.

The states, in ascending order of confidence: \`UNVERIFIED\`, not yet checked; \`AXIS_AUDITED\`,
geometry and bones inspected and the forward axis recorded; \`MATH_VERIFIED\`, movement equations
checked against that axis; \`VISUALLY_VERIFIED\`, rendered motion confirmed against the velocity
vector; \`ACCEPTED\`, all three methods agree and the asset is safe to ship.

Do not advance an asset past \`AXIS_AUDITED\` on mathematical reasoning alone. A character can be
entirely self-consistent with the wrong axis — the equations agree with each other and disagree
with the mesh. Visual verification against actual movement is the step that catches it.

## 2. Visual language consistency (warning if violated)

All assets in a game share one visual grammar: the same polygon-density tier, the same material
complexity — all PBR or all flat-shaded, not mixed — and one silhouette readability distance.

**Mechanism.** Players compare assets against each other, not against an external standard. An
8,000-polygon PBR enemy next to a 500-polygon flat-shaded collectible breaks the fictional reality
of the world. Viewers accept low-fidelity worlds readily; they reject internally inconsistent ones.

| Tier | Poly budget (character) | Poly budget (prop) | Material |
|---|---|---|---|
| Minimal | 500–1 500 | 100–500 | Flat/vertex colour |
| Standard | 2 000–5 000 | 500–1 500 | PBR, 1 texture |
| Detailed | 5 000–12 000 | 1 500–4 000 | PBR, 2+ textures |

Declare the tier once in \`asset_manifest.json\` under \`visualLanguage.tier\`, and include the
tier label in every generation prompt.

## 3. Material palette (warning if violated)

Surface colours come from a shared OKLCh palette in \`asset_manifest.json\` under
\`visualLanguage.palette\`. Vary chroma by category — player high, enemies mid, environment low —
so colour carries hierarchy. Raw hex literals in generation prompts are discouraged; describe by
hue and role instead.

**Mechanism.** Generation services interpret colour descriptions contextually. "Deep teal with
high chroma armour" produces more consistent results across calls than \`#0f766e\`, because the
model reasons perceptually rather than colour-matching a value. OKLCh anchors keep every asset in
one perceptual gamut without forcing identical colours.

    Player:       L 55, C 70, H [primary brand hue]
    Enemies:      L 45, C 50, H [complementary hue ±150°]
    Environment:  L 35, C 20, H [analogous hue ±30°]
    Collectibles: L 80, C 80, H [accent hue ±90°]   // high L = immediate readability

## 4. Silhouette readability (warning if violated)

Each character's silhouette must be distinguishable from every other character class at the
minimum legible display size, typically 64 × 64 px of screen area. Test it by rendering each asset
as a filled silhouette and comparing them side by side.

**Mechanism.** In fast gameplay players read silhouette before colour and before detail. Two
enemies with similar proportions and different surface treatments are indistinguishable at speed,
so shape differentiation — tall, wide, compact; spiky, smooth, boxy — carries more functional
information than material variation.

## 5. Animation continuity (warning if violated)

Character animation states share a single \`THREE.AnimationMixer\` on the root object. Clips
cross-fade rather than cut. Idle-to-walk completes within 200 ms. Death and exit animations run to
completion before the asset leaves the scene.

**Mechanism.** Separate mixers per clip write simultaneous conflicting pose data to the same
skeleton. Cross-fading preserves skeletal continuity; a cut produces a single-frame pose snap that
players see even at 60 fps.

---

Generation route selection, prompt structure, and the orientation audit procedure are in the
generation-workflow reference. The canonical manifest shape, the Three.js and React Three Fiber
integration, fallback primitives, and Motion Grammar timings are in the integration reference.`,

    references: [
      {
        id: 'asset-generation-workflow',
        title:
          'Declaring the manifest, choosing a generation route, writing prompts, and auditing orientation',
        answers:
          'How do I set up an asset manifest before generating, which generation route should a character versus a prop take, what does a good generation prompt contain, and exactly how do I audit and record an asset’s forward axis?',
        content: `# Asset generation workflow: manifest, routes, prompts, orientation audit

The service is remote, so no local GPU is required. **This skill is free for non-commercial use.
If you use the remote asset generation service in a commercial project, contact the service
provider for written permission before shipping.** Confirm the generation service URL as
\`https://studio.13-216-49-19.sslip.io\`, and store no credentials in code.

## 1. Declare the manifest

Create \`asset_manifest.json\` **before making any generation call**. Declare the visual language
tier and palette, then define each asset slot with a semantic name and description.

\`\`\`json
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
\`\`\`

Declaring first is not bookkeeping. The tier and palette are inputs to every prompt that follows,
so a manifest written afterwards documents whatever was generated rather than constraining it,
and the set drifts one asset at a time until nothing matches.

## 2. Choose a generation route

**Tripo route** — text prompt → GLB. Best for props, collectibles, and environmental objects where
visual control is less critical. Delivers a static GLB with no animation infrastructure.

**Gemini + Tripo route** — text prompt → white-background reference image → GLB. Required for
characters and creatures. The reference image controls shape, proportion, and silhouette before
committing to 3D conversion, which is the only point at which those are cheap to change.
Characters from this route automatically include a walk animation clip.

| Asset | Route |
|---|---|
| Enemies, players, NPCs, bosses | Gemini + Tripo |
| Weapons, tools, chests, props, rocks, trees | Tripo |
| Architectural elements | Either, depending on visual complexity |

## 3. Write generation prompts

\`\`\`
[Role/category] [silhouette shape] [tier-consistent detail level]
[primary surface: OKLCh description, not hex]
[key distinguishing feature for silhouette readability]
[polygon budget from tier declaration]
[prohibited: copyrighted characters, brands, logos, celebrity likenesses]
\`\`\`

\`\`\`
Enemy scout drone. Compact disc shape, wide and flat.
Standard polygon budget, single PBR texture.
Dark teal metallic hull, high-chroma red sensor ring.
Distinctive flat profile readable at 64 px screen size.
Approximately 2000 polygons. No real-world brand references.
\`\`\`

Every line is doing work. The silhouette shape is stated first because it is what players read
first. The colour is described rather than specified because the service reasons perceptually and
a described hue survives across calls in a way a hex literal does not. The polygon budget repeats
the declared tier so that the asset lands in the same density band as its neighbours. The
prohibition is explicit because generated likenesses of copyrighted characters, brand logos, and
celebrities are a shipping blocker regardless of how the asset looks.

Batch sizes: 1–5 character or creature models per batch on the Gemini + Tripo route, 3–10 props on
the Tripo route. Split larger sets across multiple calls.

## 4. Verify orientation (characters only)

Run this audit for every direction-sensitive asset, before any gameplay integration.

1. Load the GLB in an isolated turntable viewer — the service provides
   \`/regeneration.html?audit=<id>\`.
2. Inspect the geometry and bone hierarchy, and record what the model's geometry faces in world
   space at zero rotation.
3. Apply test movement along +X, −X, +Z and −Z, and record which direction the model faces for
   each.
4. Record the result in \`asset_manifest.json\`:

\`\`\`json
"orientation": {
  "nativeForwardAxis": "+Z",
  "calibrationYawDegrees": 0,
  "auditMethod": "turntable-visual + movement-test",
  "contentHash": "<sha256 of the GLB file>",
  "state": "VISUALLY_VERIFIED"
}
\`\`\`

5. Apply \`calibrationYawDegrees\` as a single Y-axis rotation **on the visual child mesh** — never
   on the physics or collision root.

Step 3 is the one that cannot be skipped or reasoned around. Steps 1 and 2 establish what the mesh
looks like it is doing; step 3 establishes what it does when a velocity vector drives it, and those
are different claims. An asset may sit at \`MATH_VERIFIED\` with every equation internally
consistent and still be built on the wrong axis, because consistency is a property of the equations
and not a property of the mesh.

\`contentHash\` exists so that verification is attached to a specific file rather than to a slot
name. Any regeneration produces a new GLB, which may differ in orientation from the one that was
audited, so a hash mismatch invalidates the recorded state and the audit runs again.

Step 5 matters because rotating the collision root rotates the physics with it. The capsule or box
turns, the contact normals turn, and the character now collides with the world at an angle that no
longer matches what is drawn. Rotating only the visual child leaves the simulation in the axis the
engine expects and corrects the appearance alone.

## Pass conditions

- \`asset_manifest.json\` was created before any generation call.
- A visual language tier is declared, and every asset in the set sits in that tier's poly and
  material band.
- Character and creature assets used the Gemini + Tripo route rather than Tripo alone.
- Every generation prompt names the tier, describes colour by hue and role rather than by hex, and
  states the prohibition on copyrighted characters, brand logos, and celebrity likenesses.
- Batch sizes stayed within 1–5 characters or 3–10 props per call.
- Every direction-sensitive asset carries an \`orientation\` block whose \`state\` is
  \`VISUALLY_VERIFIED\` or \`ACCEPTED\`, with \`auditMethod\` naming a visual method rather than a
  mathematical one alone.
- \`contentHash\` matches the actual GLB file, and has been re-verified after every regeneration.
- \`calibrationYawDegrees\` is applied to the visual child, not to the collision root.
- The generation service URL is confirmed as \`https://studio.13-216-49-19.sslip.io\` and no
  credentials appear in code.
- Commercial use of the generation service has written permission from the service provider before
  shipping.`,
      },
      {
        id: 'manifest-structure-and-threejs-integration',
        title:
          'Canonical manifest structure, Three.js and R3F integration, fallback primitives, and Motion Grammar timings',
        answers:
          'What is the canonical shape of asset_manifest.json, how do I load a character and its clips into Three.js or React Three Fiber with one mixer and correct calibration, what should render when a GLB fails to load, and which Motion Grammar timings apply to asset state changes?',
        content: `# Manifest structure, Three.js integration, fallbacks, and Motion Grammar

## 1. The manifest is the single source of truth

\`asset_manifest.json\` is the only place runtime code learns where an asset lives, what clips it
has, and how it is calibrated. Resolve assets by manifest field, never by guessing a file path.

\`\`\`json
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
\`\`\`

Never hardcode asset URLs in game logic. Always read from
\`manifest.actions[slotName].model.url\`. Three things depend on that indirection: regenerating an
asset changes its URL and must not require a code change; the calibration yaw and the verification
state travel with the URL, so code that hardcodes the URL silently loses them; and \`bindings\`
lets one slot be swapped for a different asset id without touching the scene graph.

\`bindings\` maps semantic slot to asset id; \`actions\` holds the resolved payload for each slot.
Game code addresses slots, and only the manifest knows which asset is currently in one.

## 2. Character with animation clips

\`\`\`js
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
\`\`\`

Three details in that listing are load-bearing.

**The mixer goes on the character root, not on the visual child.** The mixer resolves clip tracks
against the object it was constructed with, so a mixer rooted on the calibrated child resolves
against a subtree that has an extra rotation baked into it, and every bone track arrives rotated.
One mixer per character, on the root, also prevents the failure the contract names: two mixers
driving the same skeleton write conflicting pose data on the same frame, and the winner is
whichever ran last.

**The clip GLB's scene is never added to the game.** A clip file is a carrier for
\`animations[0]\`; adding its scene puts a second copy of the character in the world, usually at
the origin, usually T-posed.

**Transitions cross-fade.** \`crossFadeTo\` or paired \`fadeIn\`/\`fadeOut\` over roughly 200 ms
blends the two poses through the interval; a cut swaps skeletal poses between consecutive frames,
which is a discontinuity the eye catches at 60 fps because it violates the velocity continuity
every other frame of the animation established.

## 3. Using \`@vishwakarma/three\` helpers

\`\`\`js
import { useGLTF, useMixedAnimation } from '@vishwakarma/three'

// Loads, normalises, and applies calibration from manifest automatically
const { scene, mixer } = useGLTF(manifest, 'player-character')
const { transition } = useMixedAnimation(mixer, { crossFadeDuration: 0.2 })

// Trigger state change with cross-fade
transition('walk')   // → Motion Grammar 'respond' intent, 60–120 ms ease-out
transition('idle')
\`\`\`

\`useGLTF()\` resolves the asset from the manifest and applies the orientation calibration to the
visual child, so the calibration cannot be forgotten at one call site and applied at another.
\`useMixedAnimation()\` owns the single mixer and the cross-fade duration.
\`useInstancedGLB()\` handles crowds and particle-like groups of the same asset.

## 4. Keep primitives as fallback

Define simple Three.js geometry that renders when a GLB fails to load. The fallback shares the
asset's OKLCh palette colour and approximates its silhouette.

\`\`\`js
const fallback = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.4, 1.2),
  new THREE.MeshStandardMaterial({ color: oklchToHex(manifest.visualLanguage.palette.player) })
)
\`\`\`

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
| Asset spawns in scene | \`enter\` | 200–300 ms | decelerate |
| Asset removed from scene | \`exit\` | 120–180 ms | accelerate |
| Character takes damage | \`reject\` | 350 ms, 2 cycles | shake |
| Collectible picked up | \`affirm\` | 300–400 ms | overshoot |
| NPC draws attention | \`attract\` | ≤500 ms, 3 cycles | pulse |
| Long asset load in progress | \`occupy\` | looping | linear |

All transitions respect \`prefers-reduced-motion\`: collapse to opacity-only and preserve semantic
clarity. Reduced motion means gentler and fewer, not zero — the spawn still has to be noticed.

## 6. Vishwakarma package integration

- **\`@vishwakarma/three\`** — \`useGLTF()\` resolves assets from the manifest and applies
  orientation calibration; \`useMixedAnimation()\` manages cross-fades; \`useInstancedGLB()\` for
  crowds or particle-like asset groups.
- **\`@vishwakarma/motion\`** — \`resolveMotion('enter')\` for spawn transitions,
  \`resolveMotion('affirm')\` for collectible pickups. Keeps asset animation in Motion Grammar
  timing without per-asset tuning.
- **\`@vishwakarma/core\`** — \`oklchToHex()\` converts manifest palette entries to hex for
  fallback geometry and UI colour synchronisation.
- **\`@vishwakarma/audit\`** — \`checkContrast()\` verifies asset palette colours against the game
  background; flag results in CI before build.
- **\`@vishwakarma/tokens\`** — export the game palette as design tokens so HUD, score, and health
  bars share the colour vocabulary of the 3D assets.

## Pass conditions

- Runtime code resolves every asset through \`manifest.actions[slot].model.url\`; no GLB URL is
  hardcoded in game logic.
- Exactly one \`AnimationMixer\` exists per character, constructed on the character root rather
  than on the calibrated visual child.
- Clip GLBs contribute \`animations[0]\` only; their scenes are never added to the game scene.
- Every animation state change cross-fades over roughly 200 ms; no clip swap is a cut.
- Idle-to-walk completes within 200 ms, and death or exit clips run to completion before the asset
  is removed.
- Every GLB asset has a fallback primitive that shares its palette colour and approximate
  silhouette.
- Silhouettes were compared at 64 × 64 px and every character class is distinguishable.
- Player, enemy, and collectible colours pass 3:1 contrast against the game background.
- Asset spawn, removal, damage, pickup, attention, and loading transitions use the Motion Grammar
  intents and durations above, each with a \`prefers-reduced-motion\` branch that collapses to
  opacity.`,
      },
    ],
  },

  rules: [
    {
      id: '3d-assets/orientation-verified-before-acceptance',
      strength: 'must',
      statement:
        'Verify every direction-sensitive asset’s forward axis by rendered motion before accepting it, recording nativeForwardAxis, calibrationYawDegrees, auditMethod, contentHash and a state of VISUALLY_VERIFIED or ACCEPTED in the manifest.',
      evidence: {
        rationale:
          'Generated meshes follow no universal forward-axis convention, so a model that visually faces +Z while the code assumes −Z moves sideways or backwards under standard movement. The defect is invisible in a static preview and immediate in motion, which is why the audit has to be a separate evidence-carrying step rather than an inference from the file.',
        confidence: 'established',
      },
      examples: {
        language: 'json',
        bad: '"orientation": { "nativeForwardAxis": "+Z", "state": "MATH_VERIFIED" }',
        good: '"orientation": {\n  "nativeForwardAxis": "+Z",\n  "calibrationYawDegrees": 0,\n  "auditMethod": "turntable-visual + movement-test",\n  "contentHash": "sha256:...",\n  "state": "VISUALLY_VERIFIED"\n}',
      },
      verifiedBy: 'orientation-audit',
    },
    {
      id: '3d-assets/no-math-only-verification',
      strength: 'must-not',
      statement:
        'Do not advance an asset past AXIS_AUDITED on mathematical reasoning alone, and re-run the audit whenever contentHash no longer matches the GLB.',
      evidence: {
        rationale:
          'Self-consistency is a property of the movement equations, not of the mesh: a character can satisfy every equation while built on the wrong axis, because the equations agree with each other rather than with the geometry. The hash exists so that verification attaches to a specific file — a regeneration produces a new GLB that may differ in orientation from the audited one.',
        confidence: 'established',
      },
      examples: {
        language: 'javascript',
        bad: "// forward is -Z everywhere in the code, so the asset must be -Z\nasset.orientation.state = 'ACCEPTED'",
        good: "// drove the asset along +X, -X, +Z, -Z in the turntable viewer and watched it\nasset.orientation.state = 'VISUALLY_VERIFIED'\nasset.orientation.contentHash = sha256(glbBytes)",
      },
      verifiedBy: 'orientation-audit',
    },
    {
      id: '3d-assets/calibration-on-visual-child',
      strength: 'must',
      statement:
        'Apply calibrationYawDegrees as a single Y-axis rotation on the visual child mesh, never on the physics or collision root.',
      evidence: {
        rationale:
          'Rotating the collision root rotates the simulation with it: the capsule or box turns, the contact normals turn, and the character now collides with the world at an angle that no longer matches what is drawn. Rotating only the visual child leaves the physics in the axis the engine expects and corrects appearance alone.',
        confidence: 'established',
      },
      examples: {
        language: 'javascript',
        bad: 'character.rotation.y = THREE.MathUtils.degToRad(yaw)',
        good: "const visual = character.getObjectByName('visual') ?? character\nvisual.rotation.y = THREE.MathUtils.degToRad(yaw)",
      },
      verifiedBy: 'orientation-audit',
    },
    {
      id: '3d-assets/manifest-is-source-of-truth',
      strength: 'must',
      statement:
        'Resolve every model URL, clip URL, and orientation value from asset_manifest.json at runtime; do not hardcode asset paths in game logic.',
      evidence: {
        rationale:
          'The manifest is where the calibration yaw and the verification state live alongside the URL, so code that hardcodes a path silently drops both and integrates an unverified asset. It is also what makes regeneration a data change rather than a code change, since a regenerated asset gets a new URL and a new hash.',
        confidence: 'established',
      },
      examples: {
        language: 'javascript',
        bad: "const gltf = await loader.loadAsync('/assets/player_v3_final.glb')",
        good: "const gltf = await loader.loadAsync(manifest.actions['player-character'].model.url)",
      },
      verifiedBy: 'integration-review',
    },
    {
      id: '3d-assets/single-mixer-on-character-root',
      strength: 'must',
      statement:
        'Construct exactly one THREE.AnimationMixer per character, on the character root rather than on the calibrated visual child.',
      evidence: {
        rationale:
          'Two mixers driving one skeleton write conflicting pose data on the same frame and the winner is whichever ran last, which presents as jitter rather than as an obvious error. Rooting the mixer on the calibrated child is the subtler failure: clip tracks resolve against a subtree carrying an extra rotation, so every bone track arrives rotated.',
        confidence: 'established',
      },
      examples: {
        language: 'javascript',
        bad: 'const idleMixer = new THREE.AnimationMixer(character)\nconst walkMixer = new THREE.AnimationMixer(character)',
        good: 'const mixer = new THREE.AnimationMixer(character)   // root, one per character\nconst idle = mixer.clipAction(idleClip)\nconst walk = mixer.clipAction(walkClip)',
      },
      verifiedBy: 'integration-review',
    },
    {
      id: '3d-assets/cross-fade-not-cut',
      strength: 'must',
      statement:
        'Blend between animation clips with a cross-fade of roughly 200 ms, and let idle-to-walk and death or exit clips complete rather than cutting them.',
      evidence: {
        rationale:
          'A cut swaps skeletal poses between consecutive frames, which is a discontinuity visible even at 60 fps because it violates the velocity continuity every other frame of the animation has established. Cross-fading interpolates the two poses through the interval, so the skeleton never teleports and the transition reads as movement rather than as a glitch.',
        confidence: 'established',
      },
      examples: {
        language: 'javascript',
        bad: 'idle.stop()\nwalk.play()',
        good: 'walk.reset().play()\nidle.crossFadeTo(walk, 0.2, false)',
      },
      verifiedBy: 'integration-review',
    },
    {
      id: '3d-assets/primitive-fallback',
      strength: 'should',
      statement:
        'Define a fallback primitive for every GLB that shares the asset’s OKLCh palette colour and approximate silhouette, and render it while the model is missing or retrying.',
      evidence: {
        rationale:
          'Remote GLB fetches fail in low-connectivity environments, and an entity with no mesh still has full collision — so the player collides with something invisible and reads it as a physics bug rather than as a missing asset. Matching the palette colour and rough silhouette makes the stand-in legible as the entity it replaces instead of an unexplained white box.',
        confidence: 'strong',
      },
      examples: {
        language: 'javascript',
        bad: 'const model = await load(url)   // entity spawns with collision and no mesh on failure',
        good: 'const fallback = new THREE.Mesh(\n  new THREE.CapsuleGeometry(0.4, 1.2),\n  new THREE.MeshStandardMaterial({ color: oklchToHex(palette.player) })\n)',
      },
      verifiedBy: 'visual-language-review',
    },
    {
      id: '3d-assets/one-tier-one-palette',
      strength: 'should',
      statement:
        'Declare one visual language tier and one OKLCh palette in the manifest, generate every asset within that tier’s poly and material band, and describe colour by hue and role rather than by hex in prompts.',
      evidence: {
        rationale:
          'Players compare assets against each other rather than against an external standard, so an 8,000-polygon PBR enemy beside a 500-polygon flat-shaded pickup reads as two different games — low fidelity is accepted, internal inconsistency is not. Described colour also survives across generation calls better than a hex literal, because the service reasons perceptually instead of colour-matching a value.',
        confidence: 'strong',
      },
      examples: {
        language: 'text',
        bad: 'Enemy drone, highly detailed, PBR metal, #0f766e hull',
        good: 'Enemy scout drone. Compact disc shape, wide and flat.\nStandard polygon budget, single PBR texture.\nDark teal metallic hull, high-chroma red sensor ring.\nApproximately 2000 polygons. No real-world brand references.',
      },
      exceptions: [
        'A deliberate diegetic contrast — for example a single artefact meant to read as alien to the world — where the break is the point and is applied once rather than accumulating.',
      ],
      verifiedBy: 'visual-language-review',
    },
    {
      id: '3d-assets/commercial-use-requires-permission',
      strength: 'must',
      statement:
        'Confirm the remote asset generation service’s terms before shipping commercially: it is free for non-commercial use, and commercial use requires prior written permission from the service provider.',
      evidence: {
        rationale:
          'This is a third-party service term and is separate from the Apache-2.0 licence on the skill itself, so a permissive skill licence gives no permission over the generated assets. The obligation attaches to the assets already embedded in the build, which makes it far cheaper to resolve before release than after — and generated likenesses of copyrighted characters, brands, or celebrities are a shipping blocker on the same axis.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'The skill is Apache-2.0, so the generated assets can ship in the paid version.',
        good: 'Non-commercial prototype: proceed. Paid release: obtain written permission from the service provider before shipping, and confirm no prompt produced a copyrighted or celebrity likeness.',
      },
      verifiedBy: 'integration-review',
    },
  ],

  verification: [
    {
      id: 'orientation-audit',
      kind: 'self-review',
      description:
        'Confirm every direction-sensitive asset has an evidence-carrying forward-axis verification and a correctly placed calibration.',
      blocking: true,
      questions: [
        'For each direction-sensitive asset, was it driven along +X, −X, +Z and −Z in the turntable viewer and watched, or is the recorded state resting on mathematical reasoning alone?',
        'Is every such asset’s orientation.state VISUALLY_VERIFIED or ACCEPTED, with nativeForwardAxis, calibrationYawDegrees, auditMethod and contentHash all present?',
        'Does contentHash match the current GLB bytes, and was the audit re-run after every regeneration?',
        'Is calibrationYawDegrees applied as a single Y-axis rotation on the visual child rather than on the physics or collision root?',
        'Does each character move in the direction it faces when driven by the game’s own velocity vector, not just in the audit harness?',
      ],
    },
    {
      id: 'visual-language-review',
      kind: 'self-review',
      description:
        'Confirm the asset set reads as one system: consistent tier, shared palette, distinguishable silhouettes, defined fallbacks.',
      blocking: true,
      questions: [
        'Was asset_manifest.json created before the first generation call with visualLanguage.tier and palette declared, and did every character or creature use the Gemini + Tripo route rather than Tripo alone?',
        'Does every asset sit inside the declared tier’s polygon budget and material complexity, with no mix of PBR and flat-shaded within one set?',
        'Rendered as filled silhouettes at 64 × 64 px, is every character class distinguishable from every other?',
        'Are player, enemy, environment and collectible colours drawn from the manifest OKLCh palette, and do they pass 3:1 contrast against the game background?',
        'Does every GLB have a fallback primitive sharing its palette colour and approximate silhouette, so a failed fetch never leaves an invisible entity with collision?',
      ],
    },
    {
      id: 'integration-review',
      kind: 'self-review',
      description:
        'Confirm runtime resolution, animation wiring, motion timings, and licensing obligations before shipping.',
      questions: [
        'Does any game logic hardcode a GLB URL, or is every model, clip, and orientation value resolved from manifest.actions[slot]?',
        'Is there exactly one AnimationMixer per character, constructed on the root, and is each clip GLB contributing animations[0] only rather than having its scene added to the game?',
        'Do all clip transitions cross-fade over roughly 200 ms, with idle-to-walk completing within 200 ms and death or exit clips running to completion before removal?',
        'Do spawn, removal, damage, pickup, attention, and loading transitions use the Motion Grammar intents and durations, each with a prefers-reduced-motion branch that collapses to opacity?',
        'Did any generation prompt risk a copyrighted character, brand logo, or celebrity likeness, and is the generation service URL confirmed with no credentials stored in code?',
        'If this is heading to a commercial release, has written permission for the remote asset generation service been obtained from the service provider before shipping?',
      ],
    },
  ],

  relatedSkills: [
    'multiplayer-game-publishing',
    'colour-systems',
    'motion-design',
    'surface-and-depth',
  ],
}
