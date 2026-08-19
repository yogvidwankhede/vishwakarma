# Rendering Pipeline: Materials, Lighting, and Shadows

Once the frame budget and renderer architecture are settled, the next spend is on how surfaces and light are authored. This part covers physically based materials, the baked-to-realtime lighting decision, global illumination methods, and shadows — the four areas where a wrong choice is a content-pipeline commitment rather than a settings change. Frame budgets, renderer architecture and shader cost are in rendering-frame-budget-and-cost-model.md.

## 1. PBR: energy conservation and the plastic look

Physically based rendering is a microfacet model: a surface is described by its base colour, its microfacet distribution (roughness), and whether its electrons are free (metal) or bound (dielectric). Two authoring conventions encode the same physics differently.

| | Metallic / Roughness | Specular / Gloss |
|---|---|---|
| Inputs | Base colour, metallic mask, roughness | Diffuse colour, specular colour (RGB), glossiness |
| Dielectric F0 | Fixed at 4% unless overridden | Authored per texel |
| Memory | 1 RGB + 2 grayscale | 2 RGB + 1 grayscale |
| Failure mode | White edging on metal/dielectric boundaries at low resolution | Authors set physically impossible F0 values |
| Used by | Unreal, Unity (default), Godot, most engines | Older pipelines, some film pipelines |

Energy conservation is the constraint that makes PBR consistent under any lighting: a surface may not reflect more light than it receives, so diffuse and specular response are complements rather than independent sliders. The authoring consequences are numeric. Dielectric base colour belongs in roughly 0.02–0.85 linear reflectance — charcoal sits around 0.02–0.05, fresh snow around 0.81, and the darkest and brightest real materials are inside that range. Base colour authored below about sRGB 30 or above sRGB 240 is outside physical range and will look wrong under every lighting condition, which is why it is worth clamping in the material rather than trusting texture authoring. Metals have no diffuse response and an F0 equal to their base colour in the 0.5–1.0 range (gold roughly 1.0, 0.766, 0.336; aluminium roughly 0.91, 0.92, 0.92). Metallic is a mask, not a slider: values between 0 and 1 exist only for blend boundaries and layered surfaces such as painted metal, and a texture full of 0.5 metallic describes no real material.

The "plastic look" has three specific causes and each has a specific fix. First, uniform roughness: real surfaces have spatially varying microfacet roughness driven by wear, dirt, fingerprints and manufacturing, and it is that variation that tells the eye it is looking at a material rather than a shape. A flat 0.5 roughness map is the single strongest signal of amateur asset work. Second, the specular parameter left at its 0.5 default across everything, which pins every dielectric to 4% F0 and removes the distinction between, for instance, water-saturated and dry surfaces. Third, no ambient occlusion or cavity detail, so the microgeometry receives full ambient light and the surface reads as extruded rather than formed. Fix the roughness variation first; it is worth more than the other two combined.

Reference values worth keeping to hand, as linear base colour, because arguments about whether a texture is too dark end quickly when there is a number:

| Material | Linear base colour | sRGB approx | Note |
|---|---|---|---|
| Fresh charcoal | 0.02–0.05 | 40–65 | The darkest plausible dielectric |
| Asphalt, worn | 0.05–0.09 | 65–85 | |
| Bare soil | 0.08–0.12 | 80–100 | |
| Green vegetation | 0.10–0.20 | 90–125 | |
| Concrete, weathered | 0.20–0.35 | 125–160 | |
| Clean sand | 0.35–0.45 | 160–180 | |
| White paint | 0.70–0.85 | 220–240 | |
| Fresh snow | 0.78–0.85 | 230–240 | The brightest plausible dielectric |
| Gold (metal F0) | 1.00, 0.77, 0.34 | — | Metals carry colour in F0, not diffuse |
| Aluminium (metal F0) | 0.91, 0.92, 0.92 | — | |

Lighting is the fourth cause and lives outside the material. PBR materials are calibrated to physical light intensities, so lighting a PBR scene with arbitrary intensities produces materials that cannot look correct at any authoring value. Use real units — lux for directional light, lumens or candela for local lights, EV for exposure — and set exposure from a physical camera model. A scene lit at 100,000 lux for direct sun with a matching exposure produces materials that behave; the same scene lit at "intensity 3" does not, and every material author will then compensate in their textures, permanently.

## 2. Lighting: baked, realtime, mixed

The lighting model is a preproduction decision with schedule consequences, not a settings change. Supporting both baked and fully dynamic lighting across a scalability range roughly doubles the lighting authoring work, because the two require different asset preparation, different artist workflows and separate validation.

| Approach | Runtime cost | Memory | Authoring cost | Fails when |
|---|---|---|---|---|
| Fully baked (lightmaps + light probes) | Near zero; a texture fetch | 50–400 MB of lightmaps | UV authoring, resolution budgets, hours-to-days of bake time | Anything moves, or time of day changes |
| Mixed (baked indirect, realtime direct) | Direct lighting plus shadow cost | Same lightmaps | Same, plus reconciling the two | Dynamic objects receive stale indirect |
| Realtime with probe GI (DDGI, irradiance volumes) | 1–2.5 ms | 5–40 MB of probe data | Probe placement | Thin geometry leaks light |
| Realtime with screen-space GI | 0.8–1.5 ms | Minimal | None | Off-screen contributors vanish |
| Realtime software tracing (Lumen SW, SDFGI) | 2–4 ms at 1080p | Distance field volumes, 100–400 MB | Mesh distance field generation | Small or thin geometry is absent from the distance field |
| Realtime hardware ray tracing (Lumen HW, RTXGI) | 4–8 ms at 1080p | BVH, 200–800 MB | BVH-friendly geometry | Below the hardware floor; skinned geometry needs BVH rebuilds |

**Lightmaps.** Texel density is the budget: 1 texel per 10–20 cm for hero interiors, 1 per 30–50 cm for general environments, 1 per 1–2 m for terrain and distant geometry. Storage in BC6H is roughly 1 byte per texel, so a 4096x4096 atlas is 16.7 MB and a level with eight atlases is 134 MB. Bake time scales with texel count and bounce count and reaches hours per level on a workstation, which is why a bake farm is standard studio infrastructure. Lightmap UVs must be non-overlapping with adequate padding — 2–4 texels between charts — or adjacent charts bleed into each other, which appears as light seams on wall corners.

**Light probes** capture incident irradiance at points in space to light dynamic objects, stored as spherical harmonics. L2 SH is 9 coefficients per colour channel, 27 floats, typically packed to 24–36 bytes per probe. Spacing of 1–4 m is normal, denser where lighting changes sharply. The characteristic failure is a character walking through a doorway and changing lighting abruptly because the probe grid is sparse across the threshold; the fix is manual probe density at transitions, not a global increase.

**Reflection probes** capture a cubemap of the surroundings for specular response. Costs: 128x128 or 256x256 per face, 6 faces, mip chain, BC6H, roughly 0.15–0.6 MB each; blending between them costs a few extra texture fetches. Parallax correction against a box or sphere proxy is the difference between reflections that track the room and reflections that slide — it is cheap and should be on by default. The failure mode is probe count: a hundred unparallaxed probes still produce wrong reflections, and the fix is fewer, better-placed, parallax-corrected probes plus screen-space reflections for the contact detail.

## 3. Global illumination: cost and failure mode per method

Every real-time GI method is an approximation with a characteristic artefact, and knowing the artefact is how you attribute a bug report.

**Screen-space GI** gathers indirect light from the current frame's colour and depth buffers. It is cheap (0.8–1.5 ms at 1080p) and it fails at the screen edges and behind objects: light bounced from a surface that is not on screen simply does not exist, so turning the camera changes the lighting of a static scene. Acceptable as a detail layer on top of another method; unacceptable as the only method.

**Dynamic diffuse GI with probes (DDGI, RTXGI, Unreal's older ILC, Godot's VoxelGI-adjacent paths)** places a grid of probes updated by rays each frame. Cost 1–2.5 ms for roughly 10,000 probes; memory 5–40 MB. The failure mode is leaking through thin geometry: a probe on the wrong side of a 10 cm wall lights the interior from the exterior, and the fix is per-probe visibility weighting (which DDGI includes and older irradiance volumes do not) plus not building 10 cm walls.

**Software distance-field tracing (Lumen's software path, Godot's SDFGI)** traces against per-mesh signed distance fields and a merged global field. Budget 2–4 ms at 1080p on a mid-range GPU before reflections. The failure mode follows directly from the representation: the distance field is a coarse volumetric approximation, so thin geometry (railings, foliage cards, wires) is either absent or bloated, and small objects do not occlude or bounce correctly. Symptoms are light bleeding through thin walls and missing contact darkening.

**Hardware ray-traced GI** traces against a BVH and gets the geometry right. Cost is 4–8 ms at 1080p and it requires a hardware floor that excludes last-generation consoles, integrated GPUs and most mobile. Skinned geometry requires BVH refits every frame, which is a per-character cost of 0.05–0.2 ms and a reason character counts matter more with ray tracing enabled.

The decision rule: pick the GI method from the *lowest* target platform, not the highest, and if the lowest cannot pay for any real-time method, the answer is baked lighting and the whole content pipeline must be built for it from the start. Discovering in month twelve that the lowest target needs lightmaps is a schedule event measured in months, because it means UV authoring and bake setup for every asset already built.

## 4. Shadows

Cascaded shadow maps partition the view frustum by depth and render a shadow map per partition, so near geometry gets high texel density and far geometry gets coverage. The parameters and their consequences:

| Cascades | Resolution each | Ranges (m) | Texel size at cascade 0 | Cost | Suits |
|---|---|---|---|---|---|
| 2 | 1024 | 0–15, 15–60 | 1.5 cm | 0.5–0.9 ms | Mobile, low spec |
| 3 | 2048 | 0–10, 10–35, 35–120 | 0.5 cm | 1.2–1.8 ms | Console 60 fps |
| 4 | 2048 | 0–8, 8–25, 25–70, 70–200 | 0.4 cm | 1.8–2.6 ms | Console 30 fps, PC high |
| 4 | 4096 | 0–8, 8–25, 25–70, 70–200 | 0.2 cm | 3.5–5.5 ms | PC ultra only |

Split ratios come from a practical split scheme blending logarithmic and uniform distributions with lambda 0.5–0.9; higher lambda favours the logarithmic distribution and gives more density near the camera at the cost of visible cascade transitions further out. Blend a 5–10% overlap band between cascades or the transition appears as a hard line across the ground that moves with the camera.

**Acne** is self-shadowing caused by the shadow map's depth resolution being coarser than the receiving surface's depth variation across one texel; it appears as moiré stripes on lit surfaces. **Peter-panning** is the standard fix applied too hard: a constant depth bias large enough to remove acne detaches contact shadows from their objects, so everything appears to float. Normal-offset bias resolves both: offset the *sample position* along the geometric normal by roughly 1.5 shadow texels scaled by the slope, rather than offsetting depth. It costs nothing and it is strictly better than tuning constant and slope-scaled bias against each other.

**Virtual shadow maps** (Unreal 5) replace the cascade scheme with a sparse, page-based 16k-equivalent shadow map allocated only where visible, which removes cascade transitions and gives uniform high density. Cost is 1–3 ms plus an invalidation cost proportional to how much of the scene moves: every moving shadow caster invalidates the pages it touches, and a scene with thousands of moving casters — dense foliage in wind, a crowd — climbs sharply. Budget VSM against your worst-case motion, not your establishing shot.

Solo: three cascades at 2048 with normal-offset bias and contact shadows enabled is a good configuration and needs no further tuning. Studio: cascade configuration is per platform, shadow-casting light budgets are enforced by a validation tool that fails a level check-in, and the shadow pass has a named owner with a millisecond line.

**Contact shadows** (screen-space ray-marched shadows) cover the 0–30 cm range that shadow maps miss regardless of resolution, at 0.2–0.5 ms. They are the highest value-per-millisecond shadow feature and they largely remove the need to push cascade resolution up a tier.

Local light shadows are the hidden cost. Every shadow-casting point light renders six faces; every spot light renders one. A room with eight shadow-casting point lights is 48 additional scene renders. Restrict shadow casting to the two or three lights that define the scene's shape, use static shadows or baked shadow masks for the rest, and cap the number of shadow-casting local lights per view explicitly rather than hoping level artists restrain themselves.

## Pass conditions

Answer yes to every applicable line before the rendering configuration is considered correct.

1. Material base colour is clamped to physical reflectance range, roughness maps carry spatial variation, and metallic is authored as a mask rather than as intermediate values.
2. Lighting is authored in physical units with a physical camera exposure model.
3. The lighting model (baked, mixed, realtime) is decided from the lowest target platform, recorded in preproduction, and a fallback path exists and is tested if the lowest target cannot pay for the primary method.
4. Lightmap texel density and total lightmap memory are budgeted per level, with non-overlapping UVs and adequate chart padding verified automatically.
5. Cascade count, resolution and split ranges are set explicitly per platform, with a blend band between cascades and normal-offset bias rather than tuned constant bias.
6. Shadow-casting local light count is capped per view, and the cap is enforced by tooling rather than by convention.
7. Contact shadows are enabled before shadow map resolution is increased a tier.
