# Input latency, timing, and the simulation loop

Input latency is a budget you spend, and the player perceives the total chain rather than your code. A gameplay loop that resolves a button press in 0.2 ms sits inside a pipeline that adds a polling interval, a simulation step, a render frame, a present queue and a display panel, and the sum of those is what determines whether the game feels connected to the player's hands. Every latency decision in this document is therefore a trade against something else — image quality, frame pacing stability, animation blending, network reconciliation — and the correct posture is to know what each stage costs, measure the total on the target device, and spend the budget deliberately instead of discovering it at certification.

The second theme is that input is a semantic layer, not a hardware layer. Code that asks "is the space bar down" has hardcoded a device, a keyboard layout, an accessibility barrier and a localisation bug into a single expression. Code that asks "is the Jump action active" has none of those problems, and the cost of the abstraction is one indirection.

## 1. The latency chain and the budget

Measure from the physical actuation of the switch to the photon changing on the panel. The intermediate stages, with the values you should assume unless you have measured otherwise:

| Stage | Typical cost | Worst realistic case | Controllable? |
|---|---|---|---|
| Switch actuation and debounce | 1–8 ms | 20 ms on cheap membrane keyboards | No |
| Transport: wired USB at 125 Hz | 8 ms average 4 ms | 8 ms | Yes, raise polling rate |
| Transport: wired USB at 1000 Hz | 1 ms | 1 ms | Yes |
| Transport: 2.4 GHz dongle | 1–4 ms | 8 ms | Partly, by recommending hardware |
| Transport: Bluetooth gamepad | 4–12 ms | 30 ms with interference | No |
| OS input stack and event delivery | 1–4 ms | 10 ms under load | Partly, via raw input APIs |
| Poll-to-use aliasing | 0 to one frame (0–16.7 ms) | 16.7 ms | Yes, sample late |
| Simulation step | 1 frame (16.7 ms) | 2 frames if fixed-step lags | Yes |
| Render and command submission | 1 frame | 2 frames | Yes |
| Present queue depth | 1–3 frames (16.7–50 ms) | 50 ms | Yes, cap queued frames |
| Display processing (monitor, game mode) | 4–16 ms | 40–120 ms on a TV outside game mode | No, but you can warn |
| Panel scanout and pixel response | 3–10 ms | 25 ms on slow VA panels | No |

Totals to target, end to end:

| Class | Target | Notes |
|---|---|---|
| Competitive shooter, fighting game | under 30 ms | Requires 120 Hz+, queue depth 1, wired input |
| Action game, general 60 fps target | 40–60 ms | The band most shipped games occupy |
| Perceptibility threshold | around 100 ms | Above this, most players report it unprompted |
| Cloud streaming, acceptable | 60–100 ms | Only with prediction and generous leniency |
| Rhythm game | consistency matters more than magnitude | Variance under 5 ms, plus a calibration screen |

A worked budget for a 60 fps console action game on a television in game mode, which is the configuration most of your players will actually use:

```
wireless controller transport      6 ms
OS input stack                     2 ms
poll-to-use aliasing (late sample) 3 ms   (average, not the 16.7 ms worst case)
simulation step                   16.7 ms
render and submission             16.7 ms
present queue at depth 1          16.7 ms
television processing              10 ms
panel scanout and response          8 ms
                                 -------
total                             79.1 ms
```

That is a competently built game and it is already over the 60 ms band. Raising the present queue to the default depth of 2 adds 16.7 ms and puts it at 96 ms, one bad television away from the perceptibility threshold. Doubling the simulation and render rate to 120 fps removes 25 ms without touching a single line of gameplay code, which is why frame rate is the largest single lever on perceived responsiveness and why a 120 fps performance mode is worth shipping even on displays that cannot present it.

Two facts about perception drive the targets. Players cannot identify absolute latency, but they detect changes of roughly 15–20 ms and they detect variance far more readily than they detect a constant offset — a stable 60 ms feels better than a 40 ms average that spikes to 90 ms. And latency interacts with everything else in this skill: an input chain of 120 ms makes every window in the game-feel reference feel wrong, so measure the chain before tuning a single grace period.

The cheapest wins, in order of return per unit of effort. Cap the present queue: Unity's `QualitySettings.maxQueuedFrames` defaults to 2 and setting it to 1 removes roughly one frame at the cost of a small throughput risk if the GPU is the bottleneck; Unreal's `rhi.SyncInterval` and `r.OneFrameThreadLag` govern the same trade. Sample input as late in the frame as possible, immediately before the simulation step consumes it, rather than at the top of the frame — this alone recovers up to a full frame that is otherwise spent holding a stale sample. Use the platform's low-latency mode where one exists (Reflex, Anti-Lag) and expose it as a setting. Raise the polling rate on PC where the API allows it. Offer an uncapped or higher frame rate mode even on a display that cannot show it, because simulation rate reduces aliasing and queue residency independently of what the panel does.

Studio: publish a latency budget per platform in the technical design document, assign a number to each stage, and measure against it every milestone. Latency regresses silently through added render passes, post-processing, and animation-driven gameplay, and nobody notices until a public build.

## 2. Polling versus events, and the sampling rate trap

Two models. Polling asks the current state of a control at a moment of your choosing; events deliver state transitions as they occur, with timestamps. Most engines expose both over a device buffer that is filled by events and read by polls.

Continuous controls — stick axes, trigger analogue values, mouse deltas — should be polled, because their value is a quantity and the only question is what it was at the moment the simulation needed it. Discrete controls — button presses, releases — should be captured as events, because their value is an occurrence with a time, and the poll model can lose them.

The trap is sampling discrete inputs at a fixed simulation tick. A 50 Hz fixed step samples every 20 ms. A deliberate quick tap can be as short as 30–50 ms, and an accidental one shorter; a fighting game player executing a plink or a piano input produces presses of 16–33 ms. Poll the button state at tick boundaries and any press-and-release that falls entirely between two ticks is invisible: the state was up at tick N and up again at tick N+1, so nothing happened. Worse, a press that spans a tick boundary is seen but its exact frame is quantised, which destroys the timing precision a fighting or rhythm game depends on.

The fix has two halves. First, latch edges on the input thread or in the OS callback rather than at tick time: maintain sticky flags `pressedSinceLastConsume` and `releasedSinceLastConsume` per control, set them from the event stream, and clear them when the simulation consumes them. A press-release pair that occurs entirely between ticks then still sets both flags and the simulation sees a press. Second, keep the event timestamps and use them, so the simulation knows the input arrived 4 ms into the step rather than treating it as arriving at the boundary; that sub-tick information is what allows a fighting game to resolve simultaneity correctly and a rhythm game to score against audio time rather than frame time.

A related hazard: reading edge state from more than one place per frame. Unity's `WasPressedThisFrame` and equivalents are computed against an internal frame counter, so a `FixedUpdate` running twice in one rendered frame sees the same press twice, and a `FixedUpdate` skipped entirely on a fast frame sees it zero times. Read once per frame into a snapshot structure, and have the simulation consume the snapshot.

Rhythm games and anything scoring timing precisely should timestamp inputs against the audio clock rather than the frame clock, because the audio device clock is the thing the player is synchronising to and it drifts against the frame clock. Provide a calibration screen that measures both audio offset and visual offset separately, with a range of at least plus or minus 200 ms.

## 3. Fixed timestep, variable frame rate, and where input lives

A game with a fixed simulation step and a variable render rate has two clocks, and input sits awkwardly between them. Get the arrangement wrong and you produce input that is dropped on some frames and doubled on others, with a failure rate that varies with the player's hardware.

The standard loop accumulates real time, runs the simulation zero or more times per rendered frame at a fixed `dt`, and renders once with an interpolation factor. At a 60 Hz simulation on a machine rendering at 144 fps, most frames run zero simulation steps; on a machine rendering at 40 fps, most frames run two. Input read inside the simulation step is therefore read a variable number of times per frame, and input read once per rendered frame is consumed by a variable number of steps.

The arrangement that works: sample input once per rendered frame into an immutable snapshot, including latched edge flags and event timestamps, then hand that snapshot to the simulation. If more than one simulation step runs against the same snapshot, the continuous values repeat, which is correct, and the edge flags are consumed by the first step only, which is also correct. If zero steps run, the edges are carried forward to the next step rather than discarded. This is a dozen lines of bookkeeping and it eliminates an entire class of frame-rate-dependent input bug.

Where the simulation rate is high enough to matter — 60 Hz or above for a fighting game, 120 Hz for a rhythm game — sample input inside the step instead, and accept the extra polling cost. Below 30 Hz, per-frame sampling with sub-step timestamps is the only approach that preserves timing.

Two related hazards. Interpolated rendering shows the world one simulation step in the past, which adds 16.7 ms of visual latency at a 60 Hz step; extrapolation removes it and adds visible correction on every direction change, so most games interpolate and pay it. And any gameplay logic driven by animation events rather than by simulation state inherits the animation system's own update ordering and blend timing, adding 1–3 frames of variable delay to actions the player believes are instant. Drive gameplay from state, and drive animation from gameplay.

Solo: implement the snapshot pattern once at the start of the project. Studio: assert on it — a unit test that runs the loop at 30, 60 and 144 fps against a recorded input log and asserts identical resulting game state catches every regression in this area.

## 4. Buffering, queueing, and leniency are three different things

They are conflated constantly and they fail differently.

**Buffering** stores at most one pending input of a class and replays it when the action becomes legal, discarding it after a window. It fixes early presses. Its failure mode when the window is too long is executing an action the player has abandoned.

**Queueing** stores an ordered list of inputs and executes them all in sequence. It is correct for turn-based games, menu navigation and command-driven strategy, and it is wrong for real-time action, because a player mashing during a long animation generates five queued attacks that fire in a row with no input, which reads as loss of control. If you find yourself capping a queue at one element, you wanted a buffer.

**Leniency** widens the window in which an input is judged correct without storing anything: a parry that accepts inputs 5 frames early and 3 frames late, a rhythm hit accepted within plus or minus 60 ms, a quick-time event with a 400 ms window. It fixes timing precision rather than ordering.

Design each explicitly. A dodge that must interrupt a committed animation needs buffering; a combo chain needs buffering plus a chain acceptance window; a parry needs leniency; an inventory action performed during a cutscene needs queueing or explicit rejection with feedback. The one thing that is always wrong is silently dropping the input with no response — if an input cannot be serviced and will not be buffered, play a rejection cue, because "the game ignored me" and "I did the wrong thing" must be distinguishable.

Window values as a starting point: 67–167 ms for action buffering, 200–333 ms for motion inputs in fighting games, plus or minus 45–80 ms for rhythm leniency at the "good" tier and plus or minus 20–35 ms at "perfect", 300–500 ms for quick-time events on a first press. Age all of them on unscaled time so hitstop, slow motion and loading hitches do not consume them.

## 5. Networked input: delay, rollback, and prediction

In a networked game the input chain from section 1 gains a network segment, and the design choice is where to hide it.

**Input delay** buffers local input for a fixed number of frames so that remote input for the same frame has arrived before the frame is simulated. Simple, deterministic, and it converts network latency directly into input latency: a 3-frame delay at 60 fps adds 50 ms to everything the local player does. Fighting games historically shipped 4–8 frames of delay, which is 67–133 ms on top of the local chain and is why netplay felt worse than local play regardless of connection quality.

**Rollback** simulates immediately using a prediction of remote input — usually the assumption that remote inputs repeat — then, when the real input arrives, rewinds to the last confirmed frame, re-simulates with the correct input, and resumes. Local input latency is unchanged from offline, which is the entire point. The costs are real: the simulation must be deterministic and fully serialisable, save and restore of the game state must run in well under a millisecond so 6–8 re-simulated frames fit in a frame budget, and every system that is not rolled back — audio, particles, UI — must tolerate being re-entered. Budget rollback support as an architectural constraint from day one; it cannot be retrofitted onto a simulation that touches global state.

**Client-side prediction with server reconciliation** is the shooter equivalent: the client simulates the local player immediately, the server is authoritative, and corrections are applied by replaying unacknowledged inputs from the corrected state. The player's own input feels local; other players are shown interpolated in the past by roughly one and a half times the update interval plus jitter buffer, commonly 100–150 ms. Corrections must be smoothed over 100–250 ms rather than snapped, or the character visibly teleports on every packet loss.

Numbers to design against: a jitter buffer of one to two update intervals, an update rate of 20–64 Hz for most games with a client-side interpolation delay matched to it, and a correction threshold below which the client's position is accepted without adjustment — typically 0.05–0.2 m, tuned so ordinary float divergence does not trigger a correction every frame.

The input-layer obligation in all three models is the same: inputs must be capturable as compact, serialisable, frame-indexed values. A button bitmask plus quantised stick axes at 8 bits per axis is enough for most games and fits an entire player's input for a frame in 4–6 bytes. Any gameplay input that cannot be expressed that way — a raw mouse delta with unbounded magnitude, a floating-point value read directly from a device — becomes the thing that blocks netcode later.

## 6. Hiding latency in the presentation layer

Where the latency chain cannot be shortened further, it can be masked, and the masking is legitimate rather than a cheat because what the player is measuring is the time to feedback, not the time to simulation.

The first frame after an input must change something visible. A 3-frame animation anticipation, a weapon flash, a reticle pulse, a UI highlight, a haptic transient — any of them resets the player's perceived clock. A game with 70 ms of pipeline latency that responds visibly on the first frame reads as more responsive than a game with 45 ms that waits for the animation to reach a recognisable pose.

Play audio before the visual where the pipeline allows it, since audio is the fastest channel to register perceptually and the transient arriving first anchors the event. This is the same ordering rule as the feedback-layering section of the game feel reference and it is worth an estimated 20–40 ms of perceived latency.

Predict locally and correct quietly. A door that begins opening on the client's press and is confirmed by the server 80 ms later is correct in the overwhelming majority of cases, and the rare correction is cheaper than 80 ms of dead air on every door. Choose the actions eligible for optimistic execution deliberately — anything trivially reversible or cosmetically dominant qualifies; anything that spends a resource or resolves a conflict does not.

Do not mask by lying about failure. Optimistic feedback for an action that then fails must be visibly reconciled, or the player learns that the feedback is meaningless and stops trusting all of it.

## Pass conditions

Answer yes to every applicable line before the input layer is considered done.

1. End-to-end latency has been measured on each target platform with a high-speed capture, and the measured value is recorded beside a documented target.
2. The present queue depth is capped at the lowest value the frame rate tolerates, and the setting is recorded per platform.
3. Input is sampled as late in the frame as the engine allows, immediately before the simulation consumes it.
4. Discrete inputs are captured as latched edges from the event stream, not polled at tick boundaries, and a press-release pair shorter than one tick is provably detected.
5. Edge state is read into a per-frame snapshot exactly once, and a frame with two fixed steps does not process the same press twice.
6. Buffering, queueing and leniency are used deliberately per action, and no real-time action uses an unbounded queue.
7. Every input that cannot be serviced produces a rejection cue rather than silence.
8. All buffer and leniency windows age on unscaled time.
9. Input is sampled once per rendered frame into an immutable snapshot, and identical recorded input produces identical game state at 30, 60 and 144 fps.
10. Gameplay logic is driven by simulation state rather than by animation events.
11. Where the game is networked, per-frame input is serialisable into a compact frame-indexed record, and the chosen latency-hiding model is documented.
12. Every action taken by the player produces visible or audible feedback on the first frame after the input, independent of when the action resolves.
