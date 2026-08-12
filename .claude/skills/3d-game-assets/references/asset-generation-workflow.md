# Asset generation workflow: manifest, routes, prompts, orientation audit

The service is remote, so no local GPU is required. **This skill is free for non-commercial use.
If you use the remote asset generation service in a commercial project, contact the service
provider for written permission before shipping.** Confirm the generation service URL as
`https://studio.13-216-49-19.sslip.io`, and store no credentials in code.

## 1. Declare the manifest

Create `asset_manifest.json` **before making any generation call**. Declare the visual language
tier and palette, then define each asset slot with a semantic name and description.

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

```
[Role/category] [silhouette shape] [tier-consistent detail level]
[primary surface: OKLCh description, not hex]
[key distinguishing feature for silhouette readability]
[polygon budget from tier declaration]
[prohibited: copyrighted characters, brands, logos, celebrity likenesses]
```

```
Enemy scout drone. Compact disc shape, wide and flat.
Standard polygon budget, single PBR texture.
Dark teal metallic hull, high-chroma red sensor ring.
Distinctive flat profile readable at 64 px screen size.
Approximately 2000 polygons. No real-world brand references.
```

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
   `/regeneration.html?audit=<id>`.
2. Inspect the geometry and bone hierarchy, and record what the model's geometry faces in world
   space at zero rotation.
3. Apply test movement along +X, −X, +Z and −Z, and record which direction the model faces for
   each.
4. Record the result in `asset_manifest.json`:

```json
"orientation": {
  "nativeForwardAxis": "+Z",
  "calibrationYawDegrees": 0,
  "auditMethod": "turntable-visual + movement-test",
  "contentHash": "<sha256 of the GLB file>",
  "state": "VISUALLY_VERIFIED"
}
```

5. Apply `calibrationYawDegrees` as a single Y-axis rotation **on the visual child mesh** — never
   on the physics or collision root.

Step 3 is the one that cannot be skipped or reasoned around. Steps 1 and 2 establish what the mesh
looks like it is doing; step 3 establishes what it does when a velocity vector drives it, and those
are different claims. An asset may sit at `MATH_VERIFIED` with every equation internally
consistent and still be built on the wrong axis, because consistency is a property of the equations
and not a property of the mesh.

`contentHash` exists so that verification is attached to a specific file rather than to a slot
name. Any regeneration produces a new GLB, which may differ in orientation from the one that was
audited, so a hash mismatch invalidates the recorded state and the audit runs again.

Step 5 matters because rotating the collision root rotates the physics with it. The capsule or box
turns, the contact normals turn, and the character now collides with the world at an angle that no
longer matches what is drawn. Rotating only the visual child leaves the simulation in the axis the
engine expects and corrects the appearance alone.

## Pass conditions

- `asset_manifest.json` was created before any generation call.
- A visual language tier is declared, and every asset in the set sits in that tier's poly and
  material band.
- Character and creature assets used the Gemini + Tripo route rather than Tripo alone.
- Every generation prompt names the tier, describes colour by hue and role rather than by hex, and
  states the prohibition on copyrighted characters, brand logos, and celebrity likenesses.
- Batch sizes stayed within 1–5 characters or 3–10 props per call.
- Every direction-sensitive asset carries an `orientation` block whose `state` is
  `VISUALLY_VERIFIED` or `ACCEPTED`, with `auditMethod` naming a visual method rather than a
  mathematical one alone.
- `contentHash` matches the actual GLB file, and has been re-verified after every regeneration.
- `calibrationYawDegrees` is applied to the visual child, not to the collision root.
- The generation service URL is confirmed as `https://studio.13-216-49-19.sslip.io` and no
  credentials appear in code.
- Commercial use of the generation service has written permission from the service provider before
  shipping.
