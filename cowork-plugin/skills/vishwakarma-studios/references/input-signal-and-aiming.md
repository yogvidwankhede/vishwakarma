# Signal shaping: deadzones, aiming, touch, and input semantics

This part covers everything between a physical control's raw value and the intent the game acts on: deadzones and response curves, gyro and aim assist, touch controls, and the timing conventions that decide what a press, a hold, a chord or a pair of opposing directions means. The latency budget and sampling model those decisions sit inside are in `input-latency-and-timing.md`; the binding layer that names the resulting actions is in `input-bindings-devices-and-testing.md`.

## 1. Deadzones

A deadzone suppresses input near the stick's rest position, because analogue sticks do not return to exactly zero. A worn potentiometer stick can rest at 8–15% of full deflection, and a stick with hall-effect sensors can rest under 2%. Without a deadzone the character drifts, and drift in a shooter's aim is a returns-generating defect.

Three implementations, and only one of them is right.

**Axial deadzone.** Each axis is independently zeroed below a threshold. It is one line of code and it is wrong, because the suppressed region is a cross, not a circle. At a threshold of 0.25 per axis, a stick pushed to a true diagonal at magnitude 0.30 has per-axis components of 0.21 and is entirely suppressed, so the player must push 40% harder to move diagonally than to move cardinally. Worse, near-cardinal input has its small perpendicular component zeroed, so the stick snaps to the axes and the player loses fine angular control exactly where most aiming happens. If a game's diagonals feel dead and its cardinals feel magnetic, this is why.

**Radial deadzone.** Compute the magnitude and zero the whole vector below the threshold. Correct in shape, but it introduces a discontinuity: at magnitude just above the threshold the output jumps from zero to 0.25, so the stick has a hair trigger at the edge of the deadzone.

**Scaled radial deadzone.** The correct default. Zero below the inner threshold, then rescale the remaining range to the full 0..1 output:

```
mag = length(raw)
if mag < inner:  out = 0
else:
    t   = clamp01((mag - inner) / (outer - inner))
    out = normalize(raw) * t
```

Inner threshold 0.12–0.20 for a modern controller in good condition, 0.20–0.26 to accommodate worn hardware — the XInput reference values are 0.239 for the left stick and 0.265 for the right, which are conservative because they must cover the whole installed base. Outer threshold 0.90–0.95, because sticks rarely reach a true 1.0 in the corners and a player pushing fully must reliably get full output.

Expose the inner deadzone as a player setting with a live visualiser showing the raw and processed values, a range of 0 to 0.4, and a per-stick value. Stick drift is the most common controller hardware failure and a deadzone slider is the difference between a playable game and a returned one.

Square-to-circle correction is a separate concern: raw stick hardware reports a square-ish range, so a diagonal can exceed magnitude 1.0. Clamp the magnitude to 1.0 after deadzone processing rather than clamping the axes, or diagonal movement is faster than cardinal movement, which is the analogue equivalent of strafe-running.

Test deadzone behaviour on deliberately bad hardware. Keep one controller in the studio with a known drifting stick and make it part of the device matrix; a deadzone implementation that is correct on new hardware and unusable on a two-year-old controller passes every internal test and generates support tickets from a large fraction of the installed base.

Triggers need their own treatment: a small inner deadzone of 0.03–0.08 to suppress rest noise, and an actuation point that is either fixed at 0.25–0.5 or exposed as a setting, since hair-trigger settings are now a standard hardware feature and players expect the software equivalent.

## 2. Response curves, sensitivity, and acceleration

After the deadzone, the mapping from stick magnitude to game response is a design decision with a large effect on aiming.

A linear map gives uniform resolution across the range, which means small corrections at the centre are as coarse as large sweeps at the edge. A power curve `out = pow(t, e)` with an exponent `e` of 1.5–3.0 expands the low end, giving fine control near centre and preserving full speed at the edge. Exponent 2.0 is a reasonable default for third-person aiming; 1.3–1.7 for movement, since movement rarely needs sub-degree precision; 2.5–3.0 for sniper or precision modes.

Dual-zone curves — a slow zone up to a breakpoint at 0.6–0.7 of stick travel, then a fast zone above it — suit games where players want a distinct "turn now" gesture. Expose the breakpoint if you ship the model.

Sensitivity should be authored in degrees per second at full deflection, not as an abstract multiplier, so the number is comparable across games and across FOV changes. Useful bands: 90–180 degrees per second for a slow, deliberate shooter; 200–360 for a standard console shooter; 400–800 for an arena shooter or an action game where the camera is also the aim. Provide separate horizontal and vertical values, since vertical range is smaller and most players want it lower, commonly 60–80% of horizontal.

**Aim acceleration** ramps angular velocity upward while the stick is held at full deflection: begin at the base rate, ramp to 1.5–3.0x over 150–400 ms, and reset within 50–100 ms of the stick dropping below a threshold. It exists because a stick has no analogue to a large mouse sweep, so without acceleration a fast 180-degree turn requires an unacceptably high base sensitivity that destroys fine aim. Ship it with an on/off toggle and a ramp-duration slider, because it is polarising and competitive players frequently disable it.

Mouse input is a different discipline. Use raw input and bypass OS pointer acceleration and DPI scaling entirely — a mouse-driven camera must be a pure function of counts. Express sensitivity so that it is FOV-independent, or a zoom changes effective sensitivity and muscle memory breaks; the common convention is to scale sensitivity by the tangent of the half-FOV so that a given physical movement traverses the same fraction of the visible scene. Publish a cm/360 value in the settings screen; players port their settings between games with it. Do not smooth or interpolate mouse deltas — mouse smoothing adds latency and is detectable within seconds by anyone who plays shooters.

## 3. Gyro and motion aiming

Gyroscopic aiming is available on DualShock 4, DualSense, Switch controllers, Steam Deck and Steam Controller, and on every phone. It offers roughly mouse-adjacent precision for fine correction while retaining a stick for large movements, and it is the single largest available improvement to controller aiming precision that does not involve assist.

Implement it as an additive correction on top of stick aim rather than as a replacement. The standard model reads angular velocity in degrees per second from the gyroscope, applies a sensitivity multiplier, and adds it to the camera's angular velocity. Sensitivity between 1.0 and 4.0 with a default around 2.0 — a value of 1.0 means rotating the controller by one degree rotates the view by one degree, which is the naturally calibrated setting and the right default for a starting point.

Details that determine whether it feels good or unusable. Use the yaw axis of the world frame rather than the controller's local yaw, or the aim drifts as the player tilts the controller — reconstruct the gravity vector from the accelerometer and project onto it. Apply a small deadzone of 1–3 degrees per second to suppress hand tremor, and provide a drift-calibration routine that samples the resting bias over 1–2 s, since every gyroscope has a nonzero rest reading that accumulates. Offer a "gyro off unless a button is held" mode, commonly bound to aim-down-sights, because permanent gyro is fatiguing and interferes with casual holding. Sample gyro at the device's native rate, typically 200–1000 Hz, and integrate rather than sampling once per frame, or fast flicks alias badly.

Ship gyro as an option with sensitivity, axis inversion, enable-mode and a calibration button, and default it off in a game whose audience does not expect it. Its presence costs nothing to players who never enable it and it is a decisive quality signal to the audience that wants it.

## 4. Aim assist and the ethics of disclosure

Analogue precision is worse than intent precision, so console shooters correct for it. Three mechanisms, which are independent and are often shipped together without the player being told.

| Category | Mechanism | Typical magnitude |
|---|---|---|
| Reticle friction or slowdown | Reduce turn rate while the reticle overlaps a target | 20–50% reduction inside a 3–6 degree zone |
| Magnetism or rotational assist | Add camera rotation toward a target while the player is already turning | 2–6 degrees per second of added rotation |
| Bullet bending or projectile adhesion | Deflect the shot toward the target after firing | 0.5–3 degrees of correction |
| Hitbox inflation | Enlarge the target's hit volume for the assisted player | 5–20% radius increase |
| Auto-aim on trigger | Snap to target on aim-down-sights | Binary; accessibility feature, disclose loudly |

Slowdown and magnetism are the honest tools, because they operate on the player's own input and the player retains authorship of the shot; bullet bending and hitbox inflation operate after the input and produce hits the player did not aim, which is where the ethical line sits for most audiences.

Rules that keep this defensible. State in the settings that aim assist exists, give it at least an on/off toggle and preferably a strength slider, and document what it does in plain language rather than as an unlabelled percentage. In any game with cross-play between controller and mouse, publish the assist model, because the mouse population will reverse-engineer it and the resulting discourse is more damaging than the disclosure. Disable or heavily reduce bullet bending in competitive modes. Never apply assist toward a target the player cannot see, and never let assist hold onto a target through an occluder, because that leaks information about enemy positions.

Distinguish aim assist from accessibility auto-aim. Auto-aim as an accessibility option — full snap, held target, reduced precision requirement — is a legitimate and increasingly expected feature; ship it as an explicit, labelled accessibility setting rather than as an invisible tuning of the default.

## 5. Touch controls

Touch removes tactile feedback, occludes the screen with the hand operating it, and has no rest position, so every assumption from gamepad design fails.

**Virtual sticks** must be floating rather than fixed: the stick origin is set where the thumb lands, within a defined activation region, and the stick follows if the thumb travels beyond its radius. A fixed virtual stick requires the player to look at their thumb, which they cannot do while playing. Radius 60–90 px at a 400 dpi reference density, activation region covering the lower-left third of the screen, and a visual representation that fades to 30–50% opacity once engaged so it occludes less.

**Touch targets** need a minimum of 9 mm of physical size — 44 points on iOS, 48 dp on Android — with 8–12 dp of spacing, and controls in the lower corners want to be larger still because thumb reach at the extremes is less accurate. Reserve the bottom 15–20% and the areas within 40 px of each edge for controls that tolerate imprecision, and keep information out of the region under the thumbs entirely, which for a two-thumb grip is roughly the bottom-left and bottom-right quadrants out to 35% of screen width.

**Leniency must be larger than on any other device**, typically 1.5–2x the equivalent gamepad windows: a 6-frame gamepad buffer becomes 10–12 frames on touch. The mechanism is that a touch input has no proprioceptive confirmation — the player cannot feel the button — so their timing distribution is wider and their confidence is lower. Extend hit areas 20–40% beyond the visual bounds of a control, invisibly.

**Gesture ambiguity** is the hardest problem. A tap, a long press, a swipe and a drag all begin identically, so the system must either wait to disambiguate, which adds latency, or commit early and sometimes be wrong. Standard thresholds: a tap is a touch lasting under 200 ms that moves under 10 dp; a long press is 400–500 ms without exceeding the movement threshold; a swipe exceeds 30–50 dp within 300 ms; a drag is anything that exceeds the movement threshold without meeting the swipe velocity. Where a gesture competes with an immediate action, resolve in favour of the immediate action and make the gesture require a distinct start — a two-finger touch, an edge start, or a dedicated region — rather than paying the disambiguation latency on every input.

Additional realities: assume 10 simultaneous touch points are reported but that palm rejection is imperfect; handle the notch and cutout safe areas so controls are not under system gestures; disable the system's own edge gestures where the platform permits it and design around them where it does not; and treat a phone call, a notification and a backgrounding as expected events that must pause cleanly. Haptics on mobile substitute for the missing tactile confirmation and are worth more here than on any other platform — a 10–20 ms transient on every virtual button press measurably improves accuracy.

## 6. Repeat rates, hold versus tap, and multi-input timing

**Key repeat** in menus: initial delay 400–500 ms, repeat interval 60–120 ms, with an optional acceleration to 30–50 ms after 1–2 s of continuous hold for long lists. Copying the OS repeat rate is wrong, because OS defaults are tuned for text entry and feel sluggish in a menu. In gameplay — a held direction cycling weapons, a held button repeating an action — the interval should be tied to the action's own cadence rather than to a generic repeat.

**Hold versus tap disambiguation** on the same control requires a decision about which one pays the latency. If tap is the common case, fire the tap action on release and the hold action at the hold threshold, which means the tap costs the player's own press duration and the hold fires without a release. If hold is the common case or the tap is a defensive action, fire the tap on press and cancel it if the hold threshold is reached, which requires the tap action to be revocable. Hold thresholds of 300–500 ms are standard; below 250 ms players trigger holds accidentally, above 700 ms they think the input failed. Show a radial or bar fill for any hold over 400 ms, starting the visual at the threshold rather than at zero so a tap does not flash it.

**Double tap** windows of 250–350 ms, measured between the first release and the second press. Anything above 400 ms produces false positives during rapid repeated inputs. A double tap that competes with a single tap forces the single tap to wait out the window, which adds the whole window as latency to the common case — so avoid double tap for anything time-critical, and prefer a dedicated control or a modifier. Double tap for dodge is popular and is one of the few defensible uses, because the dodge is the action being requested by both taps.

**Chords** — two or more controls pressed together — need a simultaneity tolerance of 2–4 frames (33–67 ms), because human fingers do not land simultaneously. Implement by delaying the resolution of the component actions by the tolerance when a chord exists that includes them, or by making the chord's components individually harmless. Do not build chords into a game that must also work on a gamepad with fewer available buttons without checking that the chord is reachable with one hand.

## 7. Simultaneous opposing input, SOCD, and negative edge

**SOCD** — simultaneous opposing cardinal directions — occurs when a player holds left and right, or up and down, at once. It is impossible on a stick and trivial on a keyboard or a leverless controller, so it is both a design question and a competitive integrity question.

| Resolution | Behaviour | Where it is correct |
|---|---|---|
| Neutral | Left plus right yields neutral | Tournament standard for horizontal; the safest default |
| Last input priority | The most recent direction wins | Feels most responsive for movement in action games |
| First input priority | The earlier direction holds until released | Rare; predictable but unresponsive |
| Absolute priority | One direction always wins | Standard for up over down on many pads |

The fighting game community standard, and the configuration most tournaments require, is neutral for left plus right and up priority for up plus down. Implement the policy at the input layer so it is uniform, expose it where the genre expects it, and make sure the policy is applied before buffering rather than after, or a buffered input can carry a state the policy would have rejected.

**Negative edge** is the acceptance of a button release as an input, most familiar from fighting games where releasing a held button completes a special move. It exists because it makes certain option-select and buffering techniques possible, and because holding a button to charge and releasing it to fire is a natural mapping. If you support it, the release must be buffered on the same window as the press, and the interaction with hold-versus-tap disambiguation must be resolved explicitly — a control cannot be a hold, a tap and a negative edge trigger at once without ambiguity the player will experience as random behaviour.

Related timing conventions worth implementing deliberately in fighting or action games: input priority when two actions become legal on the same frame, which should be a documented ordered list rather than whatever order the code happens to check; and the treatment of inputs during hitstop and freeze, which should be recorded and applied on the first non-frozen frame.

## Pass conditions

Answer yes to every applicable line before the input layer is considered done.

1. Sticks use a scaled radial deadzone; no axial deadzone remains in the codebase.
2. Inner deadzone is player-adjustable per stick with a live visualiser, and the range reaches at least 0.4.
3. Stick magnitude is clamped to 1.0 after deadzone processing so diagonals are not faster than cardinals.
4. Sensitivity is authored in degrees per second, is separately adjustable per axis, and is FOV-compensated where the game has variable FOV.
5. Mouse input uses raw input with no OS acceleration and no smoothing, and a cm/360 value is displayed in settings.
6. Aim assist, where present, is disclosed in the settings, has an off switch, and its magnitudes are documented per category.
7. Touch builds use floating virtual sticks, minimum 9 mm targets, invisible hit-area expansion, and leniency windows at least 1.5x the gamepad values.
8. Gesture thresholds for tap, long press, swipe and drag are defined numerically, and no time-critical action waits on gesture disambiguation.
9. Hold thresholds are between 300 and 500 ms, show a progress affordance above 400 ms, and every held input has a toggle alternative.
10. Chord inputs have a simultaneity tolerance of at least 2 frames, and a single-stick single-button configuration can complete the game's core loop.
11. SOCD resolution is implemented at the input layer with a stated policy, applied before buffering.
