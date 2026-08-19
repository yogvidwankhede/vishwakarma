# Bindings, devices, settings, and testing input

Input is a semantic layer, not a hardware layer: this part covers the architecture that keeps it that way — action maps and rebinding, device detection and prompt glyphs, specialist and assistive hardware, the settings screen, and the instrumentation that proves it all works. The latency and sampling model underneath it is in `input-latency-and-timing.md`; deadzones, curves and gesture semantics are in `input-signal-and-aiming.md`.

## 1. Rebinding architecture: action maps over raw keys

The architecture rule is that no gameplay code names a physical control. Code names actions; a binding layer maps devices and controls to actions; a context layer determines which map is active.

```
Gameplay map:   Move (Vector2), Look (Vector2), Jump, Fire, Aim, Interact, Dodge
Vehicle map:    Steer, Throttle, Brake, Exit, Horn
UI map:         Navigate (Vector2), Submit, Cancel, TabLeft, TabRight, Point, Click
```

Exactly one map is active per input context, with a defined stack so opening a menu pushes the UI map and closing it pops back. The common bug this prevents is input bleed: the character jumping when the player presses the button that confirms a menu choice.

Hardcoded key checks block four things at once, and the fourth is usually the one that ships broken. They block rebinding, which is a platform certification requirement on several storefronts and an accessibility baseline everywhere. They block alternate device support, since a check for a key cannot be satisfied by a gamepad. They block accessibility hardware — adaptive controllers, one-handed layouts, switch access — which present as standard devices only if you read them as devices. And they block keyboard layout localisation: a check for the physical key labelled W is correct on QWERTY, sits under Z on AZERTY, and produces a control scheme where the movement cluster is scattered across the keyboard.

The layout rule is to bind on physical scancodes so that the movement cluster keeps its shape on every layout, and to display the character that the user's current layout produces for that scancode. A player on AZERTY sees Z, Q, S, D in the prompts and the keys under their fingers are the same physical keys a QWERTY player uses. Query the layout at startup and on the system layout-change event, because players switch layouts mid-session.

Rebinding implementation requirements that are routinely missed: detect and report conflicts rather than silently double-binding; allow a control to be bound to more than one action only where that is meaningful and warn otherwise; support composite bindings so a two-axis movement action can be built from four keys; support modifier combinations; provide a per-action reset and a global reset to defaults; persist bindings per input device type so a player's keyboard layout survives them plugging in a gamepad; and exclude a small set of system bindings from rebinding while making the exclusion visible rather than mysterious.

Studio: store bindings as a versioned asset with a migration path, because adding an action in a patch must not reset every player's custom scheme, and the naive implementation does exactly that.

## 2. Device detection, hot-swap, and prompt glyphs

Players change devices mid-session constantly — controller battery dies, they pick up a mouse to type, they dock a handheld. Handle it as a normal state transition, not as an error.

Detect the active device from the most recent meaningful input rather than from connection order. Meaningful means a button press or an axis beyond a threshold of roughly 0.5, because a resting stick with drift will otherwise steal focus from the keyboard the player is actually using. Apply a hysteresis of 0.5–1.0 s before switching prompt glyphs, so a stray input does not flip the whole HUD.

On switch, change the prompt glyph set, the navigation model (pointer versus focus graph, see the UI reference), the rumble availability, and any sensitivity or assist profile that is device-specific. Do not change the pause state, and do not interrupt gameplay, unless a platform requirement obliges it — several console platforms require a pause and a reconnection prompt when the controller that owns the session disconnects, so implement that path explicitly and test it, as it is a common certification failure.

Glyph sets required for a broad PC release: Xbox, PlayStation (with the correct generation's symbols), Nintendo Switch, generic gamepad, and keyboard-and-mouse with layout-aware key names. Build the glyph lookup as a table keyed by action and device family, resolved at display time, so a rebind updates every prompt in the game without any screen knowing about it. Prompts that are baked into localised strings are the reason games ship with the wrong buttons in tutorials.

Confirm and cancel button positions differ by platform convention and region, and the platform holder's requirement takes precedence over your preference. Read this from a platform layer rather than hardcoding it, because the mapping has changed within living memory in at least one region.

Parity between controller and mouse-and-keyboard is a design constraint, not just a binding exercise. Mouse-and-keyboard has more simultaneous inputs available and far higher aim precision; controller has analogue movement and better ergonomics for held actions. Systems designed around one break on the other: radial menus are excellent on a stick and clumsy on a mouse, drag-select is excellent on a mouse and painful on a stick, and any interface requiring more than about six simultaneously-available actions has a controller problem. Decide per system whether you are designing for parity of capability or parity of outcome, and write it down.

## 3. Specialist and assistive devices

Beyond gamepad and mouse-and-keyboard, a handful of device classes have requirements that a generic binding layer does not cover.

**Racing wheels** report a steering axis with a physical range of 270 to 1080 degrees, separate analogue pedals with independent calibration, and a force-feedback channel that must be driven at 100–1000 Hz from physics rather than from canned effects. A wheel bound as a generic axis produces steering that is either unusably twitchy or unusably slow, because the game's stick-oriented response curve is applied to a device with ten times the angular range. Detect wheels explicitly, bypass stick curves, read the reported rotation range, and expose a soft-lock setting.

**Flight sticks and HOTAS** present many axes and 20 or more buttons plus hat switches, and players expect to bind every one. This is a stress test of the rebinding architecture rather than a special case, and it fails first on games that assume a fixed number of axes.

**Arcade sticks and leverless controllers** present as gamepads with digital directions, which makes SOCD handling from `input-signal-and-aiming.md` mandatory rather than optional, and they have no analogue values at all, so any system that requires partial stick deflection excludes them.

**Adaptive hardware** — the Xbox Adaptive Controller, the PlayStation Access controller, switch interfaces, mouth-operated devices — presents as a standard gamepad with an unusual mapping and, frequently, with one input available at a time. It works automatically given full rebinding, no required chords, and toggle alternatives to every hold, which is the same list as section 4.

Studio: keep a physical device library and run the matrix at each milestone. Solo: the generic gamepad path plus full rebinding covers the majority, and stating the supported device list honestly on the store page costs nothing and prevents refunds.

## 4. Accessibility as an input requirement

Most input accessibility is a consequence of doing section 1 properly, plus a small number of explicit features.

Full rebinding for every action on every device, including the ability to bind an action to more than one control, is the foundation and it covers a large share of motor accessibility needs on its own. Beyond it: a toggle alternative for every held input — aim, sprint, crouch, block, and any hold-to-interact — implemented as a per-action setting rather than one global switch, because players need holds for some actions and toggles for others. Removal or substitution of every rapid-repeated input, since button mashing is a hard barrier; offer a hold alternative that completes in 1.5–3 s. Removal or extension of every quick-time event window, with an option that sets them to unlimited. Elimination of required chords, or an alternative single-control path to the same action. Independent sensitivity and deadzone settings per stick, and per axis where the game supports it.

Platform-level assistive hardware — the Xbox Adaptive Controller, the PlayStation Access controller, switch interfaces — presents as a standard gamepad, so it works automatically if and only if you have not hardcoded controls and have not required simultaneous inputs beyond two. Test with a single-stick, single-button configuration at least once per project; it surfaces every unavoidable chord in the game in about ten minutes.

## 5. Input settings: what to expose and what to default

An input settings screen is a compatibility surface, not a preference list. Each control below exists because some population of players cannot play the game without it.

| Setting | Range | Default | Why it must exist |
|---|---|---|---|
| Full rebinding, per device | Every action | Platform convention | Certification, accessibility, layout differences |
| Look sensitivity, horizontal | 20–100% of a stated max degrees per second | Genre-typical midpoint | Enormous individual variance in preference |
| Look sensitivity, vertical | Independent | 70–80% of horizontal | Vertical range is smaller; most players want less |
| Invert vertical look | Toggle | Off | Roughly 15–25% of players invert, and they cannot play without it |
| Invert horizontal look | Toggle | Off | Rare but non-zero, and cheap |
| Stick deadzone, per stick | 0–0.40 | 0.15–0.20 | Hardware drift is the most common controller failure |
| Aim acceleration | Off, or ramp 0–100% | On, mid | Polarising; competitive players disable it |
| Aim assist strength | Off to full | Genre-dependent | Disclosure and accessibility |
| Aim-down-sights sensitivity multiplier | 0.3–1.5 | 0.6–0.8 | Zoom changes effective sensitivity |
| Hold-to-toggle, per action | Toggle per action | Hold | Motor accessibility; not a single global switch |
| Vibration intensity | 0–100% | 100% | Comfort, accessibility, battery |
| Gyro enable and sensitivity | Off, always on, hold-to-aim | Off | Large precision gain for the audience that wants it |
| Mouse sensitivity with cm/360 readout | Wide | Genre-typical | Players port settings between games |
| Controller glyph override | Auto, Xbox, PlayStation, Switch, keyboard | Auto | Detection is imperfect and players use adapters |
| Quick-time event window | Normal, extended, off | Normal | Motor accessibility |
| Repeated-press substitution | Off, hold instead | Off | Mashing is a hard barrier |

Apply every setting live rather than on confirmation, so the player can tune sensitivity while looking at the game rather than at a number. Provide a per-setting reset and a global reset. Persist per profile and per device type, and migrate rather than reset when the action list changes in a patch.

## 6. Failure signatures

Input problems are reported in the same vocabulary as feel problems, and the mapping is different. Use this before touching any tuning value.

| Symptom | Likely cause | Fix |
|---|---|---|
| Occasional inputs simply do not happen | Discrete input polled at tick boundaries | Latch edges from the event stream; verify with a sub-tick press test |
| An input sometimes fires twice | Edge state read in a fixed step that runs twice per frame | Read once into a per-frame snapshot |
| Feels fine on PC, laggy on console | Present queue depth, TV outside game mode, wireless transport | Cap queued frames to 1; detect and warn about display latency |
| Feels laggy only when the scene is busy | Frame rate drop translating into input latency | Fix the frame rate; input latency is downstream of it |
| Aim drifts with no input | Deadzone too small or absent for worn hardware | Raise inner deadzone; expose the slider |
| Diagonals feel dead, cardinals feel magnetic | Axial deadzone | Replace with scaled radial |
| Diagonal movement is faster | Magnitude not clamped after deadzone | Clamp vector magnitude to 1.0 |
| Fine aim is impossible but fast turns are fine | Linear response curve | Apply an exponent of 1.5–2.5 |
| Fast turns are impossible but fine aim is good | No aim acceleration, sensitivity too low | Add a 1.5–3.0x ramp over 150–400 ms |
| Menu presses leak into gameplay | No action map stack | Push and pop maps per context |
| Prompts show the wrong buttons | Glyphs baked into strings | Resolve glyphs at display time from a table keyed by action |
| Combos drop during heavy hits | Buffers ageing on scaled time during hitstop | Age buffers on unscaled time |
| Holding two directions produces nothing, or something random | Unspecified SOCD policy | Implement a stated policy at the input layer |
| Character responds a beat after the animation starts | Gameplay driven by animation events | Drive gameplay from state; drive animation from gameplay |
| Works for the team, fails for players | Untested device matrix or non-QWERTY layout | Run the matrix; bind on scancodes |

## 7. Testing input

Input bugs are timing bugs and they do not survive contact with a debugger, so build the instrumentation.

**Frame stepping** with an input overlay is the primary tool, as described in the game feel reference: pause, advance one simulation step, and display raw device state, processed action values, buffered actions with their remaining windows, and the active action map. A large fraction of input bugs are visible in one pass and invisible at full speed.

**Input recording and replay** stores `(frame, deviceId, control, value)` tuples and replays them into the input layer below the device abstraction. This gives deterministic reproduction of a timing bug, regression tests for combo systems and movement tech, and an automated smoke test that plays a fixed sequence and asserts on the resulting game state. It requires the simulation to be deterministic given identical input, which is a discipline worth having anyway. Record the wall-clock timestamps alongside frame indices so a replay can be evaluated at a different frame rate.

**End-to-end latency measurement** requires hardware, because software cannot see its own display pipeline. Two rigs. The cheap one: film the controller and the screen together with a phone at 240 fps, count frames between visible button travel and the first pixel change, and multiply by 4.17 ms; this has roughly 8 ms of uncertainty from the button travel itself, which is enough to validate a target but not to tune. The accurate one: wire an LED in parallel with the button contacts so the light changes at electrical actuation, film both at 1000 fps for 1 ms resolution, and take the median of 20 or more trials. Vendor tools — a latency-and-display-analysis device, or the platform's own instrumentation — do the same thing with less setup. Measure on the target hardware with the shipping display settings, because a measurement on a development monitor at 144 Hz tells you nothing about a console on a television.

**Automated latency regression** is possible without hardware for the software portion of the chain. Timestamp the input event on ingestion, timestamp the frame in which the resulting state change is submitted for rendering, and log the difference; this measures poll-to-submit and catches the regressions that come from added simulation stages or reordered systems, which is most of them. The hardware portion changes only when the platform or the display does.

**Device matrix testing** should cover at minimum: the first-party controller for each console target, one Xbox-family and one PlayStation-family controller on PC, one third-party or generic gamepad, a wireless controller with a low battery, keyboard and mouse at both 125 Hz and 1000 Hz polling, and a non-QWERTY keyboard layout. Add hot-swap between each pair, and disconnect-during-gameplay for each console target, which is a certification item.

Solo: the highest-value single test is to hand the build to someone with a different controller and a different television and watch them play for ten minutes without saying anything. Every input assumption you did not know you had makes itself visible in that session.

Studio: gate merges on the replay-based input regression suite, run the latency measurement at each milestone, and keep a documented per-platform latency budget with measured values beside the targets. Solo: the frame-step overlay and one phone-camera latency measurement per platform cover most of the value for a day of work.

## Pass conditions

Answer yes to every applicable line before the input layer is considered done.

1. No gameplay code references a physical key, button or axis; every input flows through named actions.
2. Exactly one action map is active per context, with an explicit stack, and no input bleeds between gameplay and UI.
3. Every action is rebindable on every supported device, conflicts are detected and reported, and rebinds persist per device type.
4. Keyboard bindings use physical scancodes and display layout-aware labels, verified on a non-QWERTY layout.
5. Active device detection uses a meaningful-input threshold plus hysteresis, and prompt glyphs update everywhere from a single lookup table.
6. Controller disconnect during gameplay is handled per platform requirement and has been tested on each console target.
7. Confirm and cancel button assignment is read from a platform layer rather than hardcoded.
8. No action requires rapid repeated pressing without an alternative, and every quick-time event window can be extended or disabled.
9. A frame-step mode displays raw device state, processed actions, buffer contents and the active action map.
10. An input record-and-replay harness exists and is used for at least one automated regression test.
11. The device matrix has been tested, including hot-swap between device families and a low-battery wireless controller.
12. The settings screen exposes every row in the input settings table that applies to the game, applied live, with per-setting and global reset.
13. Vertical look inversion is available and defaults off; horizontal inversion is available.
14. Binding data is versioned with a migration path so a patch that adds an action does not reset custom schemes.
